// Canvas-based 90° rotation. Swaps width/height and redraws the source
// with a transform so the resulting Blob has the rotated pixel grid baked in
// (EXIF orientation is not enough — Canvas does not respect it).

export type RotateDirection = 'cw' | 'ccw';

export async function rotateImage90(
  source: Blob,
  direction: RotateDirection = 'cw'
): Promise<Blob> {
  const url = URL.createObjectURL(source);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalHeight;
    canvas.height = img.naturalWidth;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');

    if (direction === 'cw') {
      ctx.translate(canvas.width, 0);
      ctx.rotate(Math.PI / 2);
    } else {
      ctx.translate(0, canvas.height);
      ctx.rotate(-Math.PI / 2);
    }
    ctx.drawImage(img, 0, 0);

    const type = source.type && source.type.startsWith('image/')
      ? source.type
      : 'image/jpeg';

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('toBlob returned null'))),
        type,
        0.95
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = src;
  });
}
