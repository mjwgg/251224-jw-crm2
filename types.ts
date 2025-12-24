
export type MeetingType = 
  // From summary table
  'TA' | 'AP' | 'PC' | 'N' | '기타' | 'JOINT' | 'RP' | 'Follow Up' | 'S.P' |
  // Other existing types
  '증권전달' | '카톡개별연락';


export type CustomerType = string;

export interface CustomerTypeDefinition {
  id: CustomerType;
  label: string;
  isDefault?: boolean;
}

export const customerTypeLabels: Record<CustomerType, string> = {
  potential: '가망고객',
  existing: '기존고객',
  doctor_potential: '의사가망',
  nurse_potential: '간호사가망',
  db_potential: 'DB가망',
};

export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
}

export interface CoverageDetail {
  type: string; // 구분 (e.g., '주계약', '특약')
  name: string; // 보장명
  amount: string; // 가입금액
}

export interface Contract {
  id: string;
  insuranceCompany: string;
  productName: string;
  contractDate: string; // YYYY-MM-DD
  monthlyPremium: number;
  paymentPeriod: string; // e.g., "20년납 100세만기"
  policyNumber: string;
  status: 'active' | 'expired' | 'terminated';
  coverageCategory?: '종합건강' | '치매재가간병' | '태아어린이' | '운전자상해' | '종신정기' | '단기납' | '연금' | '경영인정기' | '달러' | '기타';
  expiryDate?: string; // YYYY-MM-DD
  notes?: string;
  coverageDetails?: string | CoverageDetail[];
  attachmentName?: string; // Name of the uploaded file
  attachmentData?: string; // base64 encoded file data
}

export type CallResult = 'meeting_scheduled' | 'rejected' | 'no_answer' | 'recall' | 'other';

export const callResultLabels: Record<CallResult, string> = {
  meeting_scheduled: '미팅 약속',
  rejected: '거절',
  no_answer: '부재중',
  recall: '재통화',
  other: '기타',
};

export interface CallRecord {
  id: string;
  date: string; // ISO string
  result: CallResult;
  notes?: string;
}

export type RejectionReason = '가격' | '상품' | '시기' | '다른설계사' | '가족' | '기타';
export type RecontactProbability = '상' | '중' | '하';

export interface NamedAnniversary {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  isLunar?: boolean;
  isLeap?: boolean;
}

export interface Customer {
  id: string;
  name: string;
  registrationDate: string; // YYYY-MM-DD
  contact: string;
  birthday: string; // YYYY-MM-DD
  isBirthdayLunar?: boolean;
  isBirthdayLeap?: boolean;
  namedAnniversaries?: NamedAnniversary[];
  homeAddress: string;
  homeLat?: number | null;
  homeLng?: number | null;
  workAddress: string;
  workLat?: number | null;
  workLng?: number | null;
  occupation: string;
  tags: string[];
  consultations: Consultation[];
  productsOfInterest: string[];
  medicalHistory: string;
  interests: string;
  gender: string;
  familyRelations: string;
  monthlyPremium: string;
  preferredContactTime: string;
  type: CustomerType;
  contracts?: Contract[];
  callHistory?: CallRecord[];
  nextFollowUpDate?: string; // YYYY-MM-DD
  acquisitionSource?: string;
  acquisitionSourceDetail?: string;
  introducerId?: string;
  
  // Doctor specific fields
  doctorType?: '봉직의' | '개원의';
  expectedOpeningDate?: string; // YYYY-MM-DD
  email?: string;
  attendedSeminar?: boolean;
  parkingAvailable?: boolean;
  callResult?: string;
  breakTime?: string;
  notes?: string;

  // Nurse specific fields
  schoolAndAge?: string;
  desiredStartDate?: string; // YYYY-MM
  desiredConsultationTime?: string;
  prospectingLocation?: string;
  
  // Rejection info
  rejectionReason?: RejectionReason;
  recontactProbability?: RecontactProbability;
  rejectionDate?: string; // YYYY-MM-DD
  rejectionNotes?: string;
  status?: 'active' | 'archived';
}

export interface Consultation {
  id: string;
  date: string; // ISO string
  meetingType: MeetingType;
  notes: string;
}

export interface AIExtractedProspect {
  customerName: string;
  contact: string;
  dob: string;
  gender: string;
  homeAddress: string;
  workAddress: string;
  familyRelations: string;
  occupation: string;
  monthlyPremium: string;
  preferredContact: string;
  type: CustomerType;
  registrationDate?: string; // YYYY-MM-DD
  acquisitionSource?: string;
  acquisitionSourceDetail?: string;
  notes?: string;
}

// Combine all possible fields for the modal form
export interface AIExtractedProspectWithDetails extends Omit<Partial<Customer>, 'id' | 'consultations' | 'tags' | 'productsOfInterest' | 'contact' | 'gender' | 'homeAddress' | 'workAddress' | 'familyRelations' | 'occupation' | 'monthlyPremium' | 'preferredContactTime' | 'type' >, AIExtractedProspect {
    type: CustomerType;
    introducerId?: string;
    isInterested?: boolean;
}

export interface RecurrenceSettings {
  type: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  days: number[]; // For weekly recurrence
  endDate?: string;
  interval: number;
}

export interface Appointment {
  id: string;
  customerId?: string;
  customerName?: string;
  title?: string;
  date: string; // For recurring events, this is the START date. YYYY-MM-DD
  time: string; // HH:mm
  endTime?: string; // HH:mm
  location?: string;
  meetingType: string;
  notes: string;
  status: 'scheduled' | 'completed' | 'postponed' | 'cancelled';

  // Fields for rule-based recurrence
  recurrenceType?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurrenceInterval?: number;
  recurrenceDays?: number[]; // For 'weekly' type: 0=Sun, 1=Mon, ..., 6=Sat
  recurrenceEndDate?: string; // Optional: The end date of the series. YYYY-MM-DD
  exceptions?: string[]; // YYYY-MM-DD dates to exclude
  isLunar?: boolean; // For lunar calendar based yearly recurrence
  
  // Fields from personal memo analysis
  summary?: string;
  keywords?: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  actionItems?: string[];
}

export interface AIExtractedAppointment {
  customerName?: string;
  title?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  endTime?: string; // HH:mm
  location?: string;
  notes: string;
  meetingType?: string;
  recurrenceType?: 'none' | 'daily' | 'weekly' | 'monthly';
  recurrenceInterval?: number;
  recurrenceDays?: number[]; // For 'weekly' type: 0=Sun, 1=Mon, ..., 6=Sat
}

export type AppView = 'dashboard' | 'customers' | 'telephone' | 'schedule' | 'touch' | 'performance' | 'consultations';

export interface Script {
  id: string;
  title: string;
  content: string;
}

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  date: string; // YYYY-MM-DD
  priority: 'high' | 'medium' | 'low';
}

export interface DailyReview {
  date: string; // YYYY-MM-DD, acts as ID
  content: string;
}

export interface Goal {
  id: string;
  category: 'monthly' | 'weekly' | 'daily';
  label: string;
  target: number | string;
  unit: string;
}

export interface PerformanceRecord {
  id: string;
  contractorName: string;
  dob: string; // YYYY-MM-DD
  applicationDate: string; // YYYY-MM-DD
  premium: number;
  insuranceCompany: string;
  productName: string;
  recognizedPerformance: number;
  coverageCategory?: '종합건강' | '치매재가간병' | '태아어린이' | '운전자상해' | '종신정기' | '단기납' | '연금' | '경영인정기' | '달러' | '기타';
}

export interface AIExtractedPerformanceRecord {
  contractorName: string;
  dob: string; // YYYY-MM-DD
  applicationDate: string; // YYYY-MM-DD
  premium: number;
  insuranceCompany: string;
  productName: string;
  recognizedPerformance: number;
  coverageCategory?: '종합건강' | '치매재가간병' | '태아어린이' | '운전자상해' | '종신정기' | '단기납' | '연금' | '경영인정기' | '달러' | '기타';
}

export interface PerformancePrediction {
  id: string;
  customerName: string;
  pcDate: string; // YYYY-MM-DD
  productName: string;
  premium: number;
  recognizedPerformance: number;
}

export interface AIExtractedPerformancePrediction {
  customerName: string;
  pcDate: string; // YYYY-MM-DD
  productName: string;
  premium: number;
  recognizedPerformance: number;
}

export interface QuickMemo {
  id: string;
  text: string;
  createdAt: string; // ISO string
  color: string;
  tags: string[];
  isPinned?: boolean;
}

export interface FavoriteGreeting {
  id: string;
  content: string;
  createdAt: string; // ISO string
}

export interface MessageTemplate {
  id: string;
  title: string;
  category: string;
  content: string;
  createdAt: string; // ISO string
}

export interface ProfileInfo {
  id: 'user_profile';
  name: string;
  organization: string;
}

export interface SearchFilters {
    customers?: {
        name?: string;
        ageRange?: { min?: number; max?: number };
        gender?: '남성' | '여성';
        address?: string;
        occupation?: string;
        tags?: string[];
        type?: CustomerType;
    };
    appointments?: {
        dateRange?: { start?: string; end?: string };
        title?: string;
        customerName?: string;
        location?: string;
        meetingType?: string;
    };
    consultations?: {
        keywords?: string[];
        sentiment?: 'positive' | 'negative' | 'neutral';
        dateRange?: { start?: string; end?: string };
    };
}

export interface NearbyCustomer {
    customer: Customer;
    addressType: '집' | '직장';
    distance: number;
}

export interface Habit {
  id: string;
  name: string;
  description?: string;
  frequency: 'daily' | 'weekly';
  createdAt: string; // ISO string
  notificationTime?: string; // HH:mm format
}

export interface HabitLog {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
}

export interface GoalBoard {
  id: string;
  title: string;
  type: 'mandalart' | 'mindmap' | 'gantt' | 'fishbone';
  content: string; // JSON string
  createdAt: string; // ISO string
}

export interface GanttTask {
  id: string;
  name: string;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  progress: number; // 0-100
}

// New Interface for Advanced Customer Filters
export interface FilterCriteria {
    // Basic Info
    gender?: '남성' | '여성' | '';
    ageMin?: string;
    ageMax?: string;
    region?: string;
    
    // Customer Info
    types?: string[]; // List of selected customer types
    tags?: string[]; // List of required tags
    minPremium?: string;
    maxPremium?: string;
    missingCoverage?: string; // New field for coverage gap analysis

    // Activity
    minNonContactPeriod?: string; // Months
    registrationDateStart?: string;
    registrationDateEnd?: string;
    
    // Status
    rejectionReason?: RejectionReason | '';
    recontactProbability?: RecontactProbability | '';
}