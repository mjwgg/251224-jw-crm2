
import * as XLSX from 'xlsx';
import type { AIExtractedProspect, AIExtractedAppointment, Contract, SearchFilters, AIExtractedPerformanceRecord, PerformanceRecord, AIExtractedPerformancePrediction, Customer, MeetingType, CustomerTypeDefinition, CoverageDetail, AIExtractedProspectWithDetails } from '../types';

const formatPhoneNumberKR = (phone: string): string => {
    if (!phone || phone === '미확인') return phone;
    const cleaned = ('' + phone).replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3,4})(\d{4})$/);
    if (match) {
      return [match[1], match[2], match[3]].join('-');
    }
    return phone;
};

// 로컬 연-월-일 문자열 생성 함수
const toLocalISO = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${date}`;
};

export const extractProspectInfoFromText = async (text: string, customerTypes: CustomerTypeDefinition[]): Promise<AIExtractedProspect[]> => {
  return new Promise(resolve => {
    const lines = text.trim().split('\n').filter(line => line.trim());
    const prospects: AIExtractedProspect[] = [];
    const todayStr = toLocalISO(new Date());

    const normalizeDob = (dobStr: string): string => {
        const cleaned = dobStr.replace(/\D/g, '');
        if (cleaned.length === 8) { // YYYYMMDD
            return cleaned;
        }
        if (cleaned.length === 6) { // YYMMDD
            let year = parseInt(cleaned.substring(0, 2), 10);
            const currentYearLastTwoDigits = new Date().getFullYear() % 100;
            year += (year > currentYearLastTwoDigits + 5) ? 1900 : 2000;
            return `${year}${cleaned.substring(2)}`;
        }
        return ''; // Invalid format
    };

    for (const line of lines) {
      let originalLine = line.trim();

      const prospect: AIExtractedProspect = {
        customerName: '',
        contact: '',
        dob: '',
        registrationDate: todayStr,
        gender: '미확인',
        homeAddress: '',
        workAddress: '미확인',
        familyRelations: '미확인',
        occupation: '미확인',
        monthlyPremium: '미확인',
        preferredContact: '미확인',
        type: 'potential',
        acquisitionSource: '기타',
        acquisitionSourceDetail: '미확인',
        notes: '',
      };

      // Resident Registration Number Logic
      const rrnRegex = /(\d{6})-([1-4])\d{6}/;
      const rrnMatch = originalLine.match(rrnRegex);
      if (rrnMatch) {
          const fullRrn = rrnMatch[0]; // e.g., 921020-1234567
          const birthPart = rrnMatch[1]; // 921020
          const genderDigit = rrnMatch[2]; // 1

          // 1. Notes
          const noteContent = `주민등록번호: ${fullRrn}`;
          prospect.notes = prospect.notes ? `${prospect.notes}\n${noteContent}` : noteContent;

          // 2. Gender
          if (prospect.gender === '미확인') {
              prospect.gender = (genderDigit === '1' || genderDigit === '3') ? '남자' : '여자';
          }

          // 3. DOB
          if (!prospect.dob) {
              const yy = parseInt(birthPart.substring(0, 2), 10);
              const prefix = (genderDigit === '1' || genderDigit === '2') ? '19' : '20';
              prospect.dob = `${prefix}${yy}${birthPart.substring(2)}`; // YYYYMMDD
          }

          // Remove from text to prevent double processing
           originalLine = originalLine.replace(fullRrn, '');
      }
      
      let processedLine = ` ${originalLine.replace(/[/\-,]/g, ' ')} `;

      // 1. 생년월일 (DOB) 추출 및 제거 (주민번호에서 추출 안 된 경우)
      if (!prospect.dob) {
        const dobRegex = /(?<!\d)(\d{8}|\d{6})(?!\d)|\b\d{2,4}[-.\s]\d{1,2}[-.\s]\d{1,2}\b/;
        const dobMatch = processedLine.match(dobRegex);
        if (dobMatch) {
            const normalized = normalizeDob(dobMatch[0]);
            if (normalized) {
                prospect.dob = normalized;
                processedLine = processedLine.replace(dobMatch[0], '');
            }
        }
      }

      // 2. 연락처 (Contact) 추출 및 제거
      const contactRegex = /01[016789]-?\s?\d{3,4}-?\s?\d{4}|01[016789]\d{7,8}/;
      const contactMatch = processedLine.match(contactRegex);
      if (contactMatch) {
        prospect.contact = formatPhoneNumberKR(contactMatch[0]);
        processedLine = processedLine.replace(contactMatch[0], '');
      }

      // 3. 월 보험료 (Monthly Premium) 추출 및 제거
      const premiumRegex = /(\d+)\s*만원(이상|대)?/;
      const premiumMatch = processedLine.match(premiumRegex);
      if (premiumMatch) {
        prospect.monthlyPremium = premiumMatch[0].trim();
        processedLine = processedLine.replace(premiumMatch[0], ' ');
      }
      
      // 4. 성별 (Gender) 추출 및 제거 (주민번호에서 추출 안 된 경우)
      if (prospect.gender === '미확인') {
        const genderWithLabelRegex = /성별\s*(남자|여자|남|여)/;
        const genderWithoutLabelRegex = /(?<![가-힣])(남자|여자|남|여)(?![가-힣])/;
        let genderMatch = processedLine.match(genderWithLabelRegex);
        if (genderMatch) {
          prospect.gender = (genderMatch[1] === '남' || genderMatch[1] === '남자') ? '남자' : '여자';
          processedLine = processedLine.replace(genderMatch[0], ' ');
        } else {
          genderMatch = processedLine.match(genderWithoutLabelRegex);
          if (genderMatch) {
            prospect.gender = (genderMatch[1] === '남' || genderMatch[1] === '남자') ? '남자' : '여자';
            processedLine = processedLine.replace(genderMatch[0], ' ');
          }
        }
      }

      // 5. 고객 유형 (Type) 추출 및 제거
      const customerTypeNames = customerTypes.map(ct => ct.label);
      const typeRegex = new RegExp(`(${customerTypeNames.join('|')})`);
      const typeMatch = processedLine.match(typeRegex);
      if (typeMatch) {
          const matchedLabel = typeMatch[1];
          const typeDef = customerTypes.find(ct => ct.label === matchedLabel);
          if (typeDef) {
              prospect.type = typeDef.id;
              processedLine = processedLine.replace(matchedLabel, '');
          }
      }
      
      // 6. 이름 (Name) 및 주소 (Address) 추출
      const remainingWords = processedLine.trim().split(/\s+/).filter(Boolean);
      
      if (remainingWords.length > 0) {
        // Assume first word is name if not already found.
        if (!prospect.customerName) {
            const nameRegex = /^[가-힣]{2,5}$/;
            if (nameRegex.test(remainingWords[0])) {
                prospect.customerName = remainingWords.shift()!;
            }
        }

        // The rest is assumed to be part of an address
        prospect.homeAddress = remainingWords.join(' ');
      }
      
      prospects.push(prospect);
    }
    
    resolve(prospects);
  });
};

export const extractProspectInfoFromImage = async (base64Image: string, mimeType: string): Promise<AIExtractedProspect[]> => {
    return [];
};

export const extractProspectInfoFromAudio = async (base64Audio: string, mimeType: string): Promise<AIExtractedProspect[]> => {
    return [];
};

export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<string> => {
    return "음성 변환 기능이 비활성화되었습니다.";
};

export const transcribeConversationAudio = async (base64Audio: string, mimeType: string): Promise<string> => {
    return "음성 변환 기능이 비활성화되었습니다.";
};

export const analyzePolicyWithQuestion = async (file: { base64Data: string, mimeType: string }, question: string): Promise<string> => {
    return "약관 분석 기능이 비활성화되었습니다.";
};

export const analyzeInsurancePolicy = async (base64Image: string, mimeType: string): Promise<Partial<Contract>> => {
    return {};
};

export const extractAppointmentInfoFromText = async (
    text: string, 
    customers: Customer[], 
    customerMeetingTypes: string[], 
    personalMeetingTypes: string[], 
    customerNameHint?: string,
    referenceDateStr?: string
): Promise<AIExtractedAppointment> => {
    return new Promise(resolve => {
        let now;
        if (referenceDateStr) {
            const [y, m, d] = referenceDateStr.split('-').map(Number);
            now = new Date(y, m - 1, d);
        } else {
            now = new Date();
        }
        
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const toLocalYyyyMmDd = (date: Date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const result: AIExtractedAppointment = {
            title: '',
            date: toLocalYyyyMmDd(today),
            time: '09:00',
            notes: text,
            meetingType: 'AP', // Default
            location: '',
            recurrenceType: 'none'
        };

        // 3. Date Parsing
        let targetDate = new Date(today);
        let dateFound = false;

        if (text.includes('오늘')) { 
            dateFound = true; 
        }
        else if (text.includes('내일')) { 
            targetDate.setDate(targetDate.getDate() + 1); 
            dateFound = true;
        }
        else if (text.includes('모레')) { 
            targetDate.setDate(targetDate.getDate() + 2); 
            dateFound = true;
        }
        else if (text.includes('글피')) { 
            targetDate.setDate(targetDate.getDate() + 3); 
            dateFound = true;
        }
        
        if (!dateFound) {
            const dateMatch = text.match(/(\d{1,2})월\s*(\d{1,2})일/);
            if (dateMatch) {
                targetDate.setMonth(parseInt(dateMatch[1]) - 1);
                targetDate.setDate(parseInt(dateMatch[2]));
                const currentMonth = today.getMonth();
                const targetMonth = targetDate.getMonth();
                
                if (targetDate < new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30)) {
                     targetDate.setFullYear(targetDate.getFullYear() + 1);
                } else if (currentMonth > 10 && targetMonth < 2) {
                     if (targetDate < today) {
                         targetDate.setFullYear(targetDate.getFullYear() + 1);
                     }
                }
                dateFound = true;
            }
        }

        if (!dateFound) {
             const dayOnlyMatch = text.match(/(?<!\d)(\d{1,2})일/);
             if (dayOnlyMatch) {
                 const day = parseInt(dayOnlyMatch[1]);
                 if (day >= 1 && day <= 31) {
                     targetDate.setDate(day);
                     if (day < today.getDate()) {
                         targetDate.setMonth(targetDate.getMonth() + 1);
                     }
                     dateFound = true;
                 }
             }
        }

        const nextWeekMatch = text.match(/다음\s*주\s*([월화수목금토일])요일/);
        if (nextWeekMatch) {
            const dayMap: { [key: string]: number } = { '일': 0, '월': 1, '화': 2, '수': 3, '목': 4, '금': 5, '토': 6 };
            const targetDay = dayMap[nextWeekMatch[1]];
            const currentDay = today.getDay();
            const daysUntilNextWeek = 7 - currentDay + targetDay;
            targetDate = new Date(today);
            targetDate.setDate(today.getDate() + daysUntilNextWeek);
        } else if (!dateFound) {
             const dayMatch = text.match(/([월화수목금토일])요일/);
             if (dayMatch) {
                 const dayMap: { [key: string]: number } = { '일': 0, '월': 1, '화': 2, '수': 3, '목': 4, '금': 5, '토': 6 };
                 const targetDay = dayMap[dayMatch[1]];
                 const currentDay = today.getDay();
                 let diff = targetDay - currentDay;
                 if (diff <= 0) diff += 7;
                 targetDate = new Date(today);
                 targetDate.setDate(today.getDate() + diff);
             }
        }
        
        result.date = toLocalYyyyMmDd(targetDate);

        // 4. Time Parsing
        let hour = 9;
        let minute = 0;
        if (text.includes('점심')) { hour = 12; }
        else if (text.includes('저녁')) { hour = 19; }
        else {
            const timeMatch = text.match(/(오전|오후)?\s*(\d{1,2})시\s*(반|(\d{1,2})분)?|(\d{1,2}):(\d{2})/);
            if (timeMatch) {
                if (timeMatch[5]) { 
                    hour = parseInt(timeMatch[5]);
                    minute = parseInt(timeMatch[6]);
                } else {
                    let h = parseInt(timeMatch[2]);
                    const ampm = timeMatch[1];
                    const minStr = timeMatch[3];
                    if (ampm === '오후' && h < 12) h += 12;
                    if (ampm === '오전' && h === 12) h = 0;
                    if (!ampm && h <= 8) h += 12;
                    if (minStr === '반') minute = 30;
                    else if (minStr && timeMatch[4]) minute = parseInt(timeMatch[4]);
                    hour = h;
                }
            }
        }
        result.time = `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;

        const matchedCustomer = customers.find(c => text.includes(c.name));
        if (matchedCustomer) {
            result.customerName = matchedCustomer.name;
        } else {
            const nameMatch = text.match(/([가-힣]{2,4})(?:님|고객|씨|형님)/);
            if (nameMatch) result.customerName = nameMatch[1];
            else if (customerNameHint) result.customerName = customerNameHint;
        }

        let typeFound = false;
        for (const type of customerMeetingTypes) {
            if (text.includes(type)) { result.meetingType = type; typeFound = true; break; }
        }
        if (!typeFound) {
            for (const type of personalMeetingTypes) {
                if (text.includes(type)) { result.meetingType = type; typeFound = true; break; }
            }
        }
        if (!typeFound) {
            if (/pc/i.test(text) || text.includes('제안') || text.includes('설계') || text.includes('청약') || text.includes('클로징')) result.meetingType = 'PC';
            else if (/ap/i.test(text) || text.includes('초회') || text.includes('상담') || text.includes('미팅')) result.meetingType = 'AP';
            else if (text.includes('증권') && text.includes('전달')) result.meetingType = '증권전달';
        }
        
        if (!result.customerName) {
             if (!typeFound) {
                 const exerciseKeywords = ['운동', '골프', '축구', '농구', '헬스', '수영', '크로스핏', '런닝'];
                 if (exerciseKeywords.some(keyword => text.includes(keyword))) result.meetingType = '운동';
                 else if (text.includes('회의')) result.meetingType = '회의';
                 else if (text.includes('가족')) result.meetingType = '가족일정';
                 else if (!result.meetingType || result.meetingType === 'AP') result.meetingType = '개인용무';
             }
             result.title = text.length > 20 ? text.substring(0, 20) + '...' : text;
        }

        const locMatch = text.match(/(\S+)(?:에서|으로| 근처| 앞)/);
        if (locMatch && locMatch[1] !== '집' && locMatch[1] !== '회사') {
             result.location = locMatch[1];
        }

        if (text.includes('매주')) { 
            result.recurrenceType = 'weekly'; 
            result.recurrenceInterval = 1; 
            result.recurrenceDays = [targetDate.getDay()];
        }
        else if (text.includes('매일')) { result.recurrenceType = 'daily'; result.recurrenceInterval = 1; }
        else if (text.includes('매월')) { result.recurrenceType = 'monthly'; result.recurrenceInterval = 1; }

        resolve(result);
    });
};

export const generateAdvancedGreeting = async (options: { style: string, length: number, includeDate: boolean, includeQuote: boolean, keywords: string, customerName: string, freeformRequest: string, examples: string[], profileName: string, file?: { base64Data: string, mimeType: string } }): Promise<string> => {
  return "AI 기능이 비활성화되었습니다. 직접 내용을 입력해주세요.";
};

export const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    return null;
};

export const generateDailyGreeting = async (): Promise<string> => {
    return "좋은 아침입니다! 오늘도 활기찬 하루 되세요.";
};

export const generateWeeklyEconomicNews = async (): Promise<string> => {
    return "경제 뉴스 요약 기능이 비활성화되었습니다.";
};

export const generateAnniversaryGreeting = async (customerName: string, anniversaryType: string): Promise<string> => {
    return `${customerName}님, ${anniversaryType}을 진심으로 축하드립니다!`;
};

export const generateHealthTip = async (topic: string): Promise<string> => {
    return "건강 유의하시고 행복한 하루 보내세요.";
};

export const extractPerformanceRecordFromText = async (text: string, customers: Customer[]): Promise<AIExtractedPerformanceRecord> => {
    const todayStr = toLocalISO(new Date());
    return {
        contractorName: '',
        dob: '',
        applicationDate: todayStr,
        premium: 0,
        insuranceCompany: '',
        productName: '',
        recognizedPerformance: 0,
    };
};

export const extractPerformancePredictionFromText = async (text: string): Promise<AIExtractedPerformancePrediction> => {
    const todayStr = toLocalISO(new Date());
    return {
        customerName: '',
        pcDate: todayStr,
        productName: '',
        premium: 0,
        recognizedPerformance: 0,
    };
};

export const generatePersonalizedGreeting = async (customerName: string): Promise<string> => {
    return `${customerName}님, 안녕하세요! 잘 지내시죠?`;
};
