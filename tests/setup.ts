// tests/setup.ts
import '@testing-library/jest-dom/vitest';

// jsdom does not implement HTMLCanvasElement.getContext('2d').
// Provide a minimal stub so canvas-based utilities work in tests.
// Individual tests may override this stub on the prototype directly.
HTMLCanvasElement.prototype.getContext = function (type: string) {
  if (type === '2d') {
    return {
      drawImage: () => {},
    } as unknown as CanvasRenderingContext2D;
  }
  return null;
} as typeof HTMLCanvasElement.prototype.getContext;
