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
  detectedLanguage: DetectedLanguage | null;
  confidence?: Partial<Record<string, Confidence>>;
};
