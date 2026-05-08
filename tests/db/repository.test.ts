// tests/db/repository.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { DexieCardRepository } from '@/lib/db/dexie-repository';
import type { NewBusinessCard } from '@/lib/db/repository';

function makeCard(overrides: Partial<NewBusinessCard> = {}): NewBusinessCard {
  return {
    frontImage: new Blob(['front'], { type: 'image/jpeg' }),
    companyName: 'Acme',
    personName: 'Kim',
    interestedService: 'kinderboard',
    aiFilledFields: [],
    ...overrides,
  };
}

describe('DexieCardRepository', () => {
  let repo: DexieCardRepository;

  beforeEach(async () => {
    repo = new DexieCardRepository(`test-db-${Math.random()}`);
    await repo.clearAll();
  });

  it('saves a card and returns it with id, createdAt, updatedAt', async () => {
    const saved = await repo.save(makeCard());
    expect(saved.id).toBeTruthy();
    expect(saved.createdAt).toBeTruthy();
    expect(saved.updatedAt).toBe(saved.createdAt);
    expect(saved.companyName).toBe('Acme');
  });

  it('persists Blob as Blob (not coerced to string)', async () => {
    const saved = await repo.save(makeCard());
    const fetched = await repo.getById(saved.id);
    expect(fetched).toBeDefined();
    expect(fetched!.frontImage).toBeInstanceOf(Blob);
  });

  it('list returns most recent first', async () => {
    await repo.save(makeCard({ companyName: 'A' }));
    await new Promise((r) => setTimeout(r, 5));
    await repo.save(makeCard({ companyName: 'B' }));
    await new Promise((r) => setTimeout(r, 5));
    await repo.save(makeCard({ companyName: 'C' }));

    const list = await repo.list();
    expect(list.map((c) => c.companyName)).toEqual(['C', 'B', 'A']);
  });

  it('getLatest returns the most recent card or undefined', async () => {
    expect(await repo.getLatest()).toBeUndefined();
    await repo.save(makeCard({ companyName: 'Only' }));
    const latest = await repo.getLatest();
    expect(latest?.companyName).toBe('Only');
  });
});
