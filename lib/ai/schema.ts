// lib/ai/schema.ts
import { z } from 'zod';

export const ScanResultSchema = z.object({
  companyName: z.string().nullable(),
  website: z.string().nullable(),
  websiteGuessed: z.boolean().default(false),
  country: z
    .object({ name: z.string(), code: z.string().length(2) })
    .nullable(),
  personName: z.string().nullable(),
  personNameEn: z.string().nullable().optional(),
  position: z.string().nullable(),
  industry: z.string().nullable(),
  companyType: z.string().nullable().optional(),
  phoneCompany: z.string().nullable().optional(),
  phoneMobile: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  fax: z.string().nullable().optional(),
  detectedLanguage: z.enum(['ko', 'en', 'vi', 'ja']).nullable(),
  confidence: z.record(z.string(), z.enum(['low', 'mid', 'high'])).optional(),
});

export type ScanResultParsed = z.infer<typeof ScanResultSchema>;
