// tests/sanity.test.ts
import { describe, it, expect } from 'vitest';

describe('sanity', () => {
  it('vitest works', () => {
    expect(1 + 1).toBe(2);
  });

  it('jsdom is available', () => {
    expect(typeof document).toBe('object');
  });

  it('fake-indexeddb is available', () => {
    expect(typeof indexedDB).toBe('object');
  });
});
