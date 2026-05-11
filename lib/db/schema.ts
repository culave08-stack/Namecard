// lib/db/schema.ts
import Dexie, { type Table } from 'dexie';
import type { BusinessCard } from '@/types/business-card';

// Stored representation: Blob fields are replaced with serialized form
// so that fake-indexeddb (and real IndexedDB) can round-trip them correctly.
export type SerializedBlob = { data: ArrayBuffer; type: string };

export type StoredBusinessCard = Omit<BusinessCard, 'frontImage' | 'backImage'> & {
  frontImage: SerializedBlob;
  backImage?: SerializedBlob;
};

export class CardDatabase extends Dexie {
  cards!: Table<StoredBusinessCard, string>;

  constructor(name: string = 'namecard-db') {
    super(name);
    this.version(1).stores({
      cards: 'id, createdAt, companyName, personName, interestedService',
    });
  }
}
