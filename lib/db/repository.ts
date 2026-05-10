// lib/db/repository.ts
import type { BusinessCard, BusinessCardFields } from '@/types/business-card';

export interface NewBusinessCard extends BusinessCardFields {
  frontImage: Blob;
  backImage?: Blob;
}

// Image replacement is not part of the edit flow in Phase 2.5.
// Extend with `frontImage?: Blob` later if we want re-shoot from the detail page.
export type UpdateBusinessCard = Partial<BusinessCardFields>;

export interface CardRepository {
  save(card: NewBusinessCard): Promise<BusinessCard>;
  list(): Promise<BusinessCard[]>;
  getLatest(): Promise<BusinessCard | undefined>;
  getById(id: string): Promise<BusinessCard | undefined>;
  update(id: string, patch: UpdateBusinessCard): Promise<BusinessCard>;
  delete(id: string): Promise<void>;
}
