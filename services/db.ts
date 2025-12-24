

import Dexie, { type Table } from 'dexie';
import type { Customer, Appointment, Script, Todo, DailyReview, Goal, Product, CallRecord, CustomerTypeDefinition, PerformanceRecord, PerformancePrediction, ProfileInfo, QuickMemo, FavoriteGreeting, MessageTemplate, Habit, HabitLog, GoalBoard } from '../types';
import { customerTypeLabels } from '../types';

const getDate = (offsetDays = 0, baseDate = new Date()) => {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + offsetDays);
    return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
};

const initialCustomers: Customer[] = [
    { id: '1', name: '김민준', registrationDate: getDate(-365), contact: '010-1234-5678', birthday: '1985-05-20', homeAddress: '서울시 서초구', workAddress: '서울시 강남구', occupation: '소프트웨어 엔지니어', tags: ['암보험 관심', '자녀 교육', '기존고객'], consultations: [{ id: 'consultation-1', date: getDate(-20), meetingType: 'AP', notes: '암보험에 대한 니즈가 강하며, 자녀 교육비 마련을 위한 저축성 보험도 문의함.' }], productsOfInterest: ['암보험', '어린이보험'], medicalHistory: '없음', interests: '등산, 재테크', gender: '남성', familyRelations: '배우자, 자녀 1', monthlyPremium: '30만원', preferredContactTime: '평일 저녁', type: 'existing', 
      contracts: [
        { id: 'contract-1', insuranceCompany: '삼성생명', productName: '종합건강보험 Prime', contractDate: getDate(-365), monthlyPremium: 120000, paymentPeriod: '20년납 90세만기', policyNumber: 'S-112233', status: 'active', coverageCategory: '종합건강' }
      ], 
      callHistory: [{ id: 'call-1', date: getDate(-20), result: 'meeting_scheduled', notes: 'AP 약속 잡음' }] },
    
    { id: '2', name: '이서연', registrationDate: getDate(-30), contact: '010-8765-4321', birthday: '1992-11-08', namedAnniversaries: [{ id: '1', name: '결혼기념일', date: getDate(30) }], homeAddress: '경기도 성남시', workAddress: '서울시 종로구', occupation: '디자이너', tags: ['실손보험', '노후대비'], consultations: [{ id: 'consultation-2', date: getDate(-15), meetingType: 'TA', notes: '기존 실손보험 보장내용 분석 및 노후 연금 상품에 대한 문의.' }], productsOfInterest: ['실손보험', '연금보험'], medicalHistory: '디스크', interests: '요가', gender: '여성', familyRelations: '미혼', monthlyPremium: '15만원', preferredContactTime: '주말', type: 'potential', contracts: [], callHistory: [], nextFollowUpDate: getDate(2) },
    
    { id: '3', name: '박준호', registrationDate: getDate(-45), contact: '010-5511-2233', birthday: '1988-02-14', homeAddress: '인천시 연수구', workAddress: '삼성바이오로직스', occupation: '연구원', tags: ['변액보험', '투자'], consultations: [], productsOfInterest: ['변액연금'], medicalHistory: '없음', interests: '주식 투자', gender: '남성', familyRelations: '기혼', monthlyPremium: '50만원', preferredContactTime: '수요일 오후', type: 'potential', contracts: [], callHistory: [], acquisitionSource: '소개', acquisitionSourceDetail: '김민준' },

    { id: '4', name: '최지아', registrationDate: getDate(-10), contact: '010-9988-7766', birthday: '1995-09-30', homeAddress: '서울시 마포구', workAddress: '프리랜서', occupation: '일러스트레이터', tags: ['건강보험', '프리랜서'], consultations: [], productsOfInterest: ['건강보험'], medicalHistory: '없음', interests: '여행, 그림', gender: '여성', familyRelations: '미혼', monthlyPremium: '10만원', preferredContactTime: '오후 시간', type: 'potential', nextFollowUpDate: getDate(1), acquisitionSource: '소개', acquisitionSourceDetail: '김민준' },

    { id: '5', name: '정현우', registrationDate: getDate(-365*2), contact: '010-1212-3434', birthday: '1979-12-25', homeAddress: '경기도 수원시', workAddress: '자영업', occupation: '카페 사장', tags: ['종신보험', '상속'], consultations: [], productsOfInterest: ['종신보험'], medicalHistory: '고혈압', interests: '커피', gender: '남성', familyRelations: '배우자, 자녀 2', monthlyPremium: '40만원', preferredContactTime: '오전 10시 이전', type: 'existing', 
      contracts: [
        { id: 'contract-2', insuranceCompany: '현대해상', productName: '굿앤굿어린이보험', contractDate: getDate(-365*5), monthlyPremium: 80000, paymentPeriod: '20년납 30세만기', policyNumber: 'H-445566', status: 'active', coverageCategory: '태아어린이', expiryDate: getDate(60) }
      ], 
      callHistory: [] },

    { id: '6', name: '윤채원', registrationDate: getDate(-60), contact: '010-3456-7890', birthday: '1982-07-07', homeAddress: '부산시 해운대구', workAddress: '부산대학교병원', occupation: '의사', tags: ['세금', '개원의 준비'], consultations: [], productsOfInterest: ['연금저축보험'], medicalHistory: '없음', interests: '골프', gender: '여성', familyRelations: '기혼', monthlyPremium: '100만원', preferredContactTime: '점심시간', type: 'doctor_potential', contracts: [], callHistory: [] },
    { id: '7', name: '강동현', registrationDate: getDate(-5), contact: '010-7777-8888', birthday: '1998-04-11', homeAddress: '서울시 강동구', workAddress: '대학생', occupation: '학생', tags: ['사회초년생', '실비'], consultations: [], productsOfInterest: ['실손의료보험'], medicalHistory: '없음', interests: '게임', gender: '남성', familyRelations: '미혼', monthlyPremium: '5만원', preferredContactTime: '아무때나', type: 'potential', contracts: [], callHistory: [], acquisitionSource: '소개', acquisitionSourceDetail: '홍길동' },
    { id: '8', name: '한지민', registrationDate: getDate(-25), contact: '010-6543-2109', birthday: '1993-01-20', homeAddress: '서울시 강남구', workAddress: '서울아산병원', occupation: '간호사', tags: ['3교대', '목돈마련'], consultations: [], productsOfInterest: ['저축보험'], medicalHistory: '없음', interests: '맛집탐방', gender: '여성', familyRelations: '미혼', monthlyPremium: '20만원', preferredContactTime: '오전', type: 'nurse_potential', contracts: [], callHistory: [], acquisitionSource: '소개', acquisitionSourceDetail: '이서연' },
    
    { id: '9', name: '서예준', registrationDate: getDate(-365*3), contact: '010-4321-9876', birthday: '1980-08-15', homeAddress: '경기도 용인시', workAddress: 'IT 기업', occupation: '프로젝트 매니저', tags: ['자녀보험', '은퇴설계'], consultations: [], productsOfInterest: ['어린이보험', '연금보험'], medicalHistory: '없음', interests: '캠핑', gender: '남성', familyRelations: '배우자, 자녀 2', monthlyPremium: '60만원', preferredContactTime: '주말', type: 'existing', 
      contracts: [
        { id: 'contract-3', insuranceCompany: 'DB손해보험', productName: '참좋은운전자보험', contractDate: getDate(-730), monthlyPremium: 20000, paymentPeriod: '20년납 80세만기', policyNumber: 'D-778899', status: 'active', coverageCategory: '운전자상해' }
      ], 
      callHistory: [] },
      
    { id: '10', name: '임나영', registrationDate: getDate(-30), contact: '010-8822-1133', birthday: '1990-06-05', homeAddress: '서울시 송파구', workAddress: '초등학교', occupation: '교사', tags: ['연금저축', '안정성'], consultations: [], productsOfInterest: ['연금저축보험'], medicalHistory: '없음', interests: '독서', gender: '여성', familyRelations: '기혼', monthlyPremium: '25만원', preferredContactTime: '평일 오후 4시 이후', type: 'potential', nextFollowUpDate: getDate(5), contracts: [], callHistory: [], acquisitionSource: '소개', acquisitionSourceDetail: '이서연' },

    { id: '11', name: '백하은', registrationDate: getDate(-500), contact: '010-1111-2222', birthday: '1991-03-15', homeAddress: '서울시 강서구', workAddress: '공무원', occupation: '9급 공무원', tags: ['연금', '안정추구'], consultations: [], productsOfInterest: ['연금보험'], medicalHistory: '없음', interests: '영화감상', gender: '여성', familyRelations: '미혼', monthlyPremium: '20만원', preferredContactTime: '평일 저녁', type: 'existing',
      contracts: [
        { id: 'contract-4', insuranceCompany: '교보생명', productName: '연금보험 스페셜', contractDate: getDate(-500), monthlyPremium: 200000, paymentPeriod: '10년납', policyNumber: 'K-123456', status: 'active', coverageCategory: '연금' }
      ], callHistory: [] },

    { id: '12', name: '조민서', registrationDate: getDate(-100), contact: '010-3333-4444', birthday: '1983-10-01', homeAddress: '인천시 남동구', workAddress: '자영업', occupation: '식당 운영', tags: ['화재보험', '자영업'], consultations: [], productsOfInterest: ['화재보험'], medicalHistory: '없음', interests: '요리', gender: '남성', familyRelations: '기혼', monthlyPremium: '5만원', preferredContactTime: '오후 3-5시', type: 'existing', 
      contracts: [
        { id: 'contract-5', insuranceCompany: '메리츠화재', productName: '사업장화재보험', contractDate: getDate(-100), monthlyPremium: 50000, paymentPeriod: '10년갱신', policyNumber: 'M-654321', status: 'active', coverageCategory: '기타' }
      ], callHistory: [] }
];

const initialAppointments: Appointment[] = [
    { id: 'appt-1', customerId: '1', customerName: '김민준', date: getDate(1), time: '14:00', location: '강남역 카페', meetingType: 'PC', notes: '자녀 교육 보험 추가 상담', status: 'scheduled' },
    { id: 'appt-2', title: '지점 주간 회의', date: getDate(2), time: '09:00', location: '사무실', meetingType: '회의', notes: '주간 실적 및 활동 계획 공유', status: 'scheduled' },
    { id: 'appt-3', customerId: '4', customerName: '최지아', date: getDate(-1), time: '11:00', location: '홍대입구역', meetingType: 'AP', notes: '첫 상담, 건강보험 필요성 설명', status: 'completed' },
    { id: 'appt-4', customerId: '6', customerName: '윤채원', date: getDate(3), time: '12:30', location: '부산대병원 근처', meetingType: 'AP', notes: '개원의 관련 절세 컨설팅', status: 'scheduled' },
    { id: 'appt-5', customerId: '8', customerName: '한지민', date: getDate(0), time: '10:00', location: '서울아산병원', meetingType: 'AP', notes: '신규 간호사 대상 재무설계 니즈 환기', status: 'scheduled' },
    { id: 'appt-6', customerId: '11', customerName: '백하은', date: getDate(4), time: '19:00', location: '화상미팅', meetingType: 'PC', notes: '추가 노후 대비 플랜 제안', status: 'scheduled' },
    { id: 'appt-7', customerId: '5', customerName: '정현우', date: getDate(-30), time: '11:00', location: '수원 카페', meetingType: '증권전달', notes: '자녀 보험 증권 전달 완료', status: 'completed' }
];

const initialScripts: Script[] = [
    { id: 'script-1', title: '첫 TA 스크립트', content: '안녕하세요, {customerName}님. 저는 인카금융서비스의 목진원 FC입니다. 연락드린 이유는...' },
    { id: 'script-2', title: '기존 고객 안부 스크립트', content: '안녕하세요, {customerName}님. 담당 FC 목진원입니다. 잘 지내시죠? 다름이 아니라...' }
];

const initialTodos: Todo[] = [
    { id: 'todo-1', text: '김민준 고객 PC 준비', completed: false, date: getDate(0), priority: 'high' },
    { id: 'todo-2', text: '주간 활동 보고서 작성', completed: true, date: getDate(-1), priority: 'medium' },
    { id: 'todo-3', text: '윤채원 고객 컨설팅 자료 리서치', completed: false, date: getDate(2), priority: 'high' }
];

const initialDailyReviews: DailyReview[] = [
    { date: getDate(-1), content: '최지아 고객 상담이 성공적이었다. 다음 주 중 PC 약속을 잡기로 함.' },
];

const initialGoals: Goal[] = [
    { id: 'goal-1', category: 'monthly', label: '월간 인정 실적', target: 1500000, unit: '원' },
    { id: 'goal-premium', category: 'monthly', label: '월간 보험료', target: 1000000, unit: '원' },
    { id: 'goal-2', category: 'monthly', label: '신규 계약 건수', target: 8, unit: '건' },
    { id: 'goal-3', category: 'weekly', label: '주간 AP 횟수', target: 8, unit: '건' },
    { id: 'goal-4', category: 'daily', label: '일간 TA 시도', target: 10, unit: '콜' },
];

const initialProducts: Product[] = [
    { id: 'prod-1', name: '실속든든 암보험', category: '보장성', description: '주요 암 진단비 및 치료비 보장' },
    { id: 'prod-2', name: '내일든든 연금보험', category: '연금', description: '안정적인 노후를 위한 연금 상품' },
];

const initialCustomerTypes: CustomerTypeDefinition[] = Object.entries(customerTypeLabels).map(([id, label], index) => ({
    id,
    label,
    isDefault: index < 2, // 'potential' and 'existing' as default
}));

const initialPerformanceRecords: PerformanceRecord[] = [
    { id: 'perf-1', contractorName: '김민준', dob: '1985-05-20', applicationDate: getDate(-365), premium: 120000, insuranceCompany: '삼성생명', productName: '종합건강보험 Prime', recognizedPerformance: 150000 },
    { id: 'perf-2', contractorName: '정현우', dob: '1979-12-25', applicationDate: getDate(-365*5), premium: 80000, insuranceCompany: '현대해상', productName: '굿앤굿어린이보험', recognizedPerformance: 95000 },
    { id: 'perf-3', contractorName: '서예준', dob: '1980-08-15', applicationDate: getDate(-730), premium: 20000, insuranceCompany: 'DB손해보험', productName: '참좋은운전자보험', recognizedPerformance: 25000 },
    { id: 'perf-4', contractorName: '백하은', dob: '1991-03-15', applicationDate: getDate(-500), premium: 200000, insuranceCompany: '교보생명', productName: '연금보험 스페셜', recognizedPerformance: 220000 },
    { id: 'perf-5', contractorName: '조민서', dob: '1983-10-01', applicationDate: getDate(-100), premium: 50000, insuranceCompany: '메리츠화재', productName: '사업장화재보험', recognizedPerformance: 60000 }
];

const initialPerformancePredictions: PerformancePrediction[] = [
    { id: 'pred-1', customerName: '김민준', pcDate: getDate(1), productName: '암보험', premium: 300000, recognizedPerformance: 360000 },
];

const initialProfileInfo: ProfileInfo = {
    id: 'user_profile',
    name: '홍길동',
    organization: '인카금융제이어스'
};

const initialQuickMemos: QuickMemo[] = [
    { id: 'memo-1', text: '박준호 고객 변액보험 관련 추가 자료 요청함. 이번주 내로 전달 필요.', createdAt: new Date().toISOString(), color: 'yellow', tags: ['확인필요'], isPinned: false },
];

const initialFavoriteGreetings: FavoriteGreeting[] = [
    { id: 'greet-1', content: "싱그러운 햇살이 가득한 아침입니다. 새로운 한 주도 활기차게 시작하셨나요? 항상 건강과 행복이 가득하시길 바랍니다.", createdAt: new Date().toISOString() },
];

const initialMessageTemplates: MessageTemplate[] = [
    { id: 'template-1', title: '첫 안부 인사', category: '안부', content: '안녕하세요, {customerName} 고객님. 인카금융서비스 목진원입니다. 만나 뵙게 되어 반갑습니다. 앞으로 좋은 인연으로 함께하겠습니다.', createdAt: new Date().toISOString() },
    { id: 'template-2', title: '미팅 후 감사 메시지', category: '후속 관리', content: '안녕하세요, {customerName} 고객님. 오늘 귀한 시간 내어주셔서 진심으로 감사드립니다. 말씀해주신 내용을 바탕으로 최적의 솔루션을 준비하여 다시 연락드리겠습니다.', createdAt: new Date().toISOString() },
    { id: 'template-3', title: '생일 축하', category: '기념일', content: '생신을 진심으로 축하드립니다, {customerName} 고객님! 오늘 하루 세상에서 가장 행복한 날이 되시기를 바랍니다. 🎉', createdAt: new Date().toISOString() },
];

const initialHabits: Habit[] = [
    {
        id: 'habit-1',
        name: '하루 10명 전화',
        frequency: 'daily',
        createdAt: new Date().toISOString(),
    },
    {
        id: 'habit-2',
        name: '운동하기',
        frequency: 'daily',
        createdAt: new Date().toISOString(),
    },
    {
        id: 'habit-3',
        name: '공부하기',
        frequency: 'daily',
        createdAt: new Date().toISOString(),
    },
];


export const db = new Dexie('jw-ai-crm-db') as Dexie & {
  customers: Table<Customer>;
  appointments: Table<Appointment>;
  scripts: Table<Script>;
  todos: Table<Todo>;
  dailyReviews: Table<DailyReview>;
  goals: Table<Goal>;
  products: Table<Product>;
  customerTypes: Table<CustomerTypeDefinition>;
  performanceRecords: Table<PerformanceRecord>;
  performancePredictions: Table<PerformancePrediction>;
  profileInfo: Table<ProfileInfo>;
  quickMemos: Table<QuickMemo>;
  favoriteGreetings: Table<FavoriteGreeting>;
  messageTemplates: Table<MessageTemplate>;
  habits: Table<Habit>;
  habitLogs: Table<HabitLog>;
  goalBoards: Table<GoalBoard>;
};

db.version(8).stores({
  customers: '++id, name, type, nextFollowUpDate',
  appointments: '++id, customerId, date, status',
  scripts: '++id, title',
  todos: '++id, date, completed',
  dailyReviews: 'date',
  goals: '++id, category',
  products: '++id, name, category',
  customerTypes: 'id, label',
  performanceRecords: '++id, applicationDate, contractorName',
  performancePredictions: '++id, pcDate, customerName',
  profileInfo: 'id',
  quickMemos: '++id, createdAt',
  favoriteGreetings: '++id, createdAt',
  messageTemplates: '++id, category, createdAt',
  habits: '++id, name, createdAt',
  habitLogs: '++id, &[habitId+date]',
  goalBoards: '++id, title, createdAt',
}).upgrade(async tx => {
    // Ensure 'Monthly Premium' goal exists
    const goalsTable = tx.table('goals');
    const existingGoals = await goalsTable.toArray();
    const hasPremium = existingGoals.some((g: any) => g.category === 'monthly' && g.label === '월간 보험료');
    
    if (!hasPremium) {
        await goalsTable.add({
            id: `goal-premium-auto`,
            category: 'monthly',
            label: '월간 보험료',
            target: 1000000,
            unit: '원'
        });
    }
});

db.version(7).stores({
  customers: '++id, name, type, nextFollowUpDate',
  appointments: '++id, customerId, date, status',
  scripts: '++id, title',
  todos: '++id, date, completed',
  dailyReviews: 'date',
  goals: '++id, category',
  products: '++id, name, category',
  customerTypes: 'id, label',
  performanceRecords: '++id, applicationDate, contractorName',
  performancePredictions: '++id, pcDate, customerName',
  profileInfo: 'id',
  quickMemos: '++id, createdAt',
  favoriteGreetings: '++id, createdAt',
  messageTemplates: '++id, category, createdAt',
  habits: '++id, name, createdAt',
  habitLogs: '++id, &[habitId+date]',
  goalBoards: '++id, title, createdAt',
});

db.version(6).stores({
  customers: '++id, name, type, nextFollowUpDate',
  appointments: '++id, customerId, date, status',
  scripts: '++id, title',
  todos: '++id, date, completed',
  dailyReviews: 'date',
  goals: '++id, category',
  products: '++id, name, category',
  customerTypes: 'id, label',
  performanceRecords: '++id, applicationDate, contractorName',
  performancePredictions: '++id, pcDate, customerName',
  profileInfo: 'id',
  quickMemos: '++id, createdAt',
  favoriteGreetings: '++id, createdAt',
  messageTemplates: '++id, category, createdAt',
  habits: '++id, name, createdAt',
  habitLogs: '++id, &[habitId+date]',
});

db.version(5).stores({
  customers: '++id, name, type, nextFollowUpDate',
  appointments: '++id, customerId, date, status',
  scripts: '++id, title',
  todos: '++id, date, completed',
  dailyReviews: 'date',
  goals: '++id, category',
  products: '++id, name, category',
  customerTypes: 'id, label',
  performanceRecords: '++id, applicationDate, contractorName',
  performancePredictions: '++id, pcDate, customerName',
  profileInfo: 'id',
  quickMemos: '++id, createdAt',
  favoriteGreetings: '++id, createdAt',
  messageTemplates: '++id, category, createdAt',
});


db.on('populate', async () => {
  const customerCount = await db.customers.count();
  if (customerCount === 0) { // Only populate if the DB is empty
      await db.customers.bulkAdd(initialCustomers);
      await db.appointments.bulkAdd(initialAppointments);
      await db.scripts.bulkAdd(initialScripts);
      await db.todos.bulkAdd(initialTodos);
      await db.dailyReviews.bulkAdd(initialDailyReviews);
      await db.goals.bulkAdd(initialGoals);
      await db.products.bulkAdd(initialProducts);
      await db.customerTypes.bulkAdd(initialCustomerTypes);
      await db.performanceRecords.bulkAdd(initialPerformanceRecords);
      await db.performancePredictions.bulkAdd(initialPerformancePredictions);
      await db.profileInfo.add(initialProfileInfo);
      await db.quickMemos.bulkAdd(initialQuickMemos);
      await db.favoriteGreetings.bulkAdd(initialFavoriteGreetings);
      await db.messageTemplates.bulkAdd(initialMessageTemplates);
      await db.habits.bulkAdd(initialHabits);
  }
});

export const exportData = async () => {
    const allTables = db.tables.map(table => table.name);
    const data: { [key: string]: any[] } = {};
    for (const tableName of allTables) {
        data[tableName] = await db.table(tableName).toArray();
    }
    return {
        ...data,
        backupDate: new Date().toISOString(),
        version: 8
    };
};

export const importData = async (data: any) => {
    await db.transaction('rw', db.tables, async () => {
        for (const tableName of Object.keys(data)) {
            if (tableName === 'backupDate' || tableName === 'version') continue;
            const table = db.table(tableName);
            await table.clear();
            await table.bulkAdd(data[tableName]);
        }
    });
    
    // After importing, fetch all data to return for state updates
    const importedData: { [key: string]: any[] } = {};
    const allTables = db.tables.map(table => table.name);
     for (const tableName of allTables) {
        importedData[tableName] = await db.table(tableName).toArray();
    }
    return importedData;
};