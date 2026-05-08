// tests/image/resize.test.ts
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { resizeImage } from '@/lib/image/resize';

beforeAll(() => {
  // jsdom HTMLCanvasElement.toBlob mock
  HTMLCanvasElement.prototype.toBlob = function (cb, type, quality) {
    const blob = new Blob(['fake'], { type: type || 'image/jpeg' });
    cb(blob);
  };
});

describe('resizeImage', () => {
  it('returns a Blob with image/jpeg type', async () => {
    const sourceBlob = new Blob(['x'], { type: 'image/png' });
    // mock Image loader
    Object.defineProperty(global, 'Image', {
      writable: true,
      value: class {
        onload: () => void = () => {};
        set src(_v: string) {
          setTimeout(() => {
            (this as any).naturalWidth = 3200;
            (this as any).naturalHeight = 2000;
            this.onload();
          }, 0);
        }
      },
    });

    const result = await resizeImage(sourceBlob, { maxEdge: 1600, quality: 0.8 });
    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe('image/jpeg');
  });

  it('preserves aspect ratio when scaling down', async () => {
    const calls: Array<{ w: number; h: number }> = [];
    const origGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type: string) {
      if (type === '2d') {
        return {
          drawImage: (_img: any, _x: number, _y: number, w: number, h: number) => {
            calls.push({ w, h });
          },
        } as any;
      }
      return origGetContext.call(this, type);
    };

    const sourceBlob = new Blob(['x'], { type: 'image/png' });
    Object.defineProperty(global, 'Image', {
      writable: true,
      value: class {
        onload: () => void = () => {};
        set src(_v: string) {
          setTimeout(() => {
            (this as any).naturalWidth = 3200;
            (this as any).naturalHeight = 2000;
            this.onload();
          }, 0);
        }
      },
    });

    await resizeImage(sourceBlob, { maxEdge: 1600, quality: 0.8 });
    // 3200x2000 → maxEdge 1600 → 1600x1000 (ratio 1.6)
    expect(calls[0]).toEqual({ w: 1600, h: 1000 });
  });
});
