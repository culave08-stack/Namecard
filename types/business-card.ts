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
