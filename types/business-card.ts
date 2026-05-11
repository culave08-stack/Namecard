// types/business-card.ts

export type InterestedService =
  | 'kinderboard'
  | 'lumitiq'
  | 'artbongbong'
  | 'turuturu'
  | 'aidt'
  | 'other';

export const INTERESTED_SERVICES: InterestedService[] = [
  'kinderboard',
  'lumitiq',
  'artbongbong',
  'turuturu',
  'aidt',
  'other',
];

export type DetectedLanguage = 'ko' | 'en' | 'vi' | 'ja';
export type Confidence = 'low' | 'mid' | 'high';

// Fixed industry taxonomy (단일 소스 — AI 프롬프트, 폼 dropdown, 정규화 모두 여기 참조)
export const INDUSTRIES = [
  '교육',
  'IT·소프트웨어',
  '제조',
  '유통·리테일',
  '서비스',
  '의료·헬스케어',
  '금융',
  '건설·부동산',
  '식음료',
  '엔터테인먼트·미디어',
  '디자인·광고',
  '컨설팅',
  '물류·운송',
  '공공·정부',
  '농업·식품',
  '에너지·환경',
  '법률·회계',
  '연구·R&D',
  '기타',
] as const;

export type Industry = (typeof INDUSTRIES)[number];

// 회사 유형 — 조직 카테고리 (업종과는 별개 축)
// 영업·BD 컨텍스트에서 명함 받은 상대 조직이 어떤 유형인지 분류
export const COMPANY_TYPES = [
  '학교',
  '유치원·어린이집',
  '학원',
  '에듀테크',
  '출판사',
  '유통사',
  '정부기관',
  '교육청',
  '연구기관',
  '대기업',
  '스타트업',
  '협회·단체',
  '기타',
] as const;

export type CompanyType = (typeof COMPANY_TYPES)[number];

export interface Country {
  name: string;
  code: string;
}

// Fields common to both stored cards and "new card" inputs.
export interface BusinessCardFields {
  companyName: string;
  website?: string;
  websiteGuessed?: boolean;
  country?: Country;
  personName: string;
  personNameEn?: string;
  position?: string;
  industry?: string;
  companyType?: string;
  interestedService: InterestedService;
  interestedServiceOther?: string;
  note?: string;
  detectedLanguage?: DetectedLanguage;
  aiFilledFields: string[];
  aiConfidence?: Partial<Record<string, Confidence>>;
}

// What we read back from the repository: image fields are URLs.
export interface BusinessCard extends BusinessCardFields {
  id: string;
  createdAt: string;
  updatedAt: string;
  frontImageUrl: string;
  backImageUrl?: string;
}

export type ScanResult = {
  companyName: string | null;
  website: string | null;
  websiteGuessed: boolean;
  country: Country | null;
  personName: string | null;
  personNameEn: string | null;
  position: string | null;
  industry: string | null;
  companyType: string | null;
  detectedLanguage: DetectedLanguage | null;
  confidence?: Partial<Record<string, Confidence>>;
};
