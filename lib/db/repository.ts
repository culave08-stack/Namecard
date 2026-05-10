// lib/db/repository.ts
import type { BusinessCard } from '@/types/business-card';

export type NewBusinessCard = Omit<BusinessCard, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateBusinessCard = Partial<Omit<BusinessCard, 'id' | 'createdAt' | 'updatedAt'>>;

export interface CardRepository {
  save(card: NewBusinessCard): Promise<BusinessCard>;
  list(): Promise<BusinessCard[]>;
  getLatest(): Promise<BusinessCard | undefined>;
  getById(id: string): Promise<BusinessCard | undefined>;
  update(id: string, patch: UpdateBusinessCard): Promise<BusinessCard>;
  delete(id: string): Promise<void>;
}
