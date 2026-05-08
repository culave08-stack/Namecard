// lib/db/dexie-repository.ts
import { CardDatabase, type SerializedBlob, type StoredBusinessCard } from './schema';
import type { CardRepository, NewBusinessCard } from './repository';
import type { BusinessCard } from '@/types/business-card';

// Serialize a Blob to { data: ArrayBuffer, type: string }
async function serializeBlob(blob: Blob): Promise<SerializedBlob> {
  return { data: await blob.arrayBuffer(), type: blob.type };
}

// Deserialize back to a Blob
function deserializeBlob(s: SerializedBlob): Blob {
  return new Blob([s.data], { type: s.type });
}

async function toStored(
  card: BusinessCard,
): Promise<StoredBusinessCard> {
  const { frontImage, backImage, ...rest } = card;
  return {
    ...rest,
    frontImage: await serializeBlob(frontImage),
    ...(backImage ? { backImage: await serializeBlob(backImage) } : {}),
  };
}

function fromStored(stored: StoredBusinessCard): BusinessCard {
  const { frontImage, backImage, ...rest } = stored;
  return {
    ...rest,
    frontImage: deserializeBlob(frontImage),
    ...(backImage ? { backImage: deserializeBlob(backImage) } : {}),
  };
}

export class DexieCardRepository implements CardRepository {
  private db: CardDatabase;

  constructor(dbName: string = 'namecard-db') {
    this.db = new CardDatabase(dbName);
  }

  async save(card: NewBusinessCard): Promise<BusinessCard> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const full: BusinessCard = { ...card, id, createdAt: now, updatedAt: now };
    await this.db.cards.add(await toStored(full));
    return full;
  }

  async list(): Promise<BusinessCard[]> {
    const stored = await this.db.cards.orderBy('createdAt').reverse().toArray();
    return stored.map(fromStored);
  }

  async getLatest(): Promise<BusinessCard | undefined> {
    const stored = await this.db.cards.orderBy('createdAt').reverse().first();
    return stored ? fromStored(stored) : undefined;
  }

  async getById(id: string): Promise<BusinessCard | undefined> {
    const stored = await this.db.cards.get(id);
    return stored ? fromStored(stored) : undefined;
  }

  async clearAll(): Promise<void> {
    await this.db.cards.clear();
  }
}

let singleton: DexieCardRepository | null = null;
export function getCardRepository(): DexieCardRepository {
  if (typeof window === 'undefined') {
    throw new Error('CardRepository is only available in the browser');
  }
  if (!singleton) singleton = new DexieCardRepository();
  return singleton;
}
