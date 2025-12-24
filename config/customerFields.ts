
import type { Customer, CustomerType } from '../types';

export interface FieldConfig {
  key: keyof Customer;
  label: string;
  type?: 'text' | 'date' | 'email' | 'select' | 'textarea' | 'checkbox';
  options?: string[];
  customerTypes: (CustomerType | 'all')[];
  group: 'basic' | 'specific' | 'additional';
}

export const customerFieldConfig: FieldConfig[] = [
  // Basic Info (All types)
  { key: 'name', label: '이름', type: 'text', customerTypes: ['all'], group: 'basic' },
  { key: 'registrationDate', label: '등록일', type: 'date', customerTypes: ['all'], group: 'basic' },
  { key: 'type', label: '고객 유형', type: 'select', customerTypes: ['all'], group: 'basic' },
  { key: 'contact', label: '연락처', type: 'text', customerTypes: ['all'], group: 'basic' },
  { key: 'birthday', label: '생년월일', type: 'date', customerTypes: ['all'], group: 'basic' },
  { key: 'homeAddress', label: '집 주소', type: 'text', customerTypes: ['all'], group: 'basic' },
  { key: 'workAddress', label: '근무처', type: 'text', customerTypes: ['all'], group: 'basic' },
  { key: 'occupation', label: '직업', type: 'text', customerTypes: ['all'], group: 'basic' },
  { key: 'gender', label: '성별', type: 'text', customerTypes: ['all'], group: 'basic' },
  { key: 'familyRelations', label: '가족관계', type: 'text', customerTypes: ['all'], group: 'basic' },
  { key: 'monthlyPremium', label: '월 보험료', type: 'text', customerTypes: ['all'], group: 'basic' },
  
  // Doctor Specific Fields
  { key: 'doctorType', label: '형태', type: 'select', options: ['봉직의', '개원의'], customerTypes: ['doctor_potential'], group: 'specific' },
  { key: 'expectedOpeningDate', label: '개원예정과', type: 'date', customerTypes: ['doctor_potential'], group: 'specific' },
  { key: 'email', label: '이메일', type: 'email', customerTypes: ['doctor_potential'], group: 'specific' },
  { key: 'callResult', label: '통화결과', type: 'text', customerTypes: ['doctor_potential', 'nurse_potential'], group: 'specific' },
  { key: 'breakTime', label: '휴게시간', type: 'text', customerTypes: ['doctor_potential'], group: 'specific' },
  
  // Nurse Specific Fields
  { key: 'schoolAndAge', label: '출신학교/나이', type: 'text', customerTypes: ['nurse_potential'], group: 'specific' },
  { key: 'desiredStartDate', label: '입사예정', type: 'text', customerTypes: ['nurse_potential'], group: 'specific' },
  { key: 'desiredConsultationTime', label: '희망상담시기', type: 'text', customerTypes: ['nurse_potential'], group: 'specific' },
  { key: 'prospectingLocation', label: '개척장소', type: 'text', customerTypes: ['nurse_potential'], group: 'specific' },
  
  // Additional Info (All types)
  { 
    key: 'acquisitionSource', 
    label: '취득 경로', 
    type: 'select', 
    options: ['DB', '소개', '지인', '온라인', '세미나/행사', '콜드콜링', '내방', '기타'],
    customerTypes: ['all'], 
    group: 'additional' 
  },
  { 
    key: 'acquisitionSourceDetail', 
    label: '상세 내용 (소개자 등)', 
    type: 'text', 
    customerTypes: ['all'], 
    group: 'additional' 
  },
  { key: 'medicalHistory', label: '병력사항', type: 'textarea', customerTypes: ['all'], group: 'additional' },
  { key: 'interests', label: '관심사/공감포인트', type: 'textarea', customerTypes: ['all'], group: 'additional' },
  { key: 'notes', label: '비고', type: 'textarea', customerTypes: ['all'], group: 'additional' },
];

export const getFieldsForCustomerType = (
    type: CustomerType, 
    group: 'basic' | 'specific' | 'additional' | 'all'
) => {
    return customerFieldConfig.filter(field => 
        (field.customerTypes.includes(type) || field.customerTypes.includes('all')) &&
        (group === 'all' || field.group === group)
    );
};
