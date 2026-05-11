// Auto-orient an image Blob by honoring its EXIF Orientation tag.
//
// Phone-camera JPEGs almost always include EXIF orientation metadata; Canvas
// 2D drawImage() ignores it, which is why a landscape namecard photo can end
// up sideways once we route it through resize/preview canvases.
//
// We let the browser do the heavy lifting via createImageBitmap with
// `imageOrientation: 'from-image'` (Chrome 79+, Safari 14.5+, Firefox 95+).
// The decoded bitmap is already in display orientation; we redraw it onto a
// fresh canvas (which now has no EXIF rotation to apply) and return a new
// Blob with the rotation "baked in".
//
// If the browser lacks support or anything throws, we silently fall back to
// the original Blob so the rest of the flow keeps working.

export async function normalizeImageOrientation(source: Blob): Promise<Blob> {
  if (typeof createImageBitmap === 'undefined') return source;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(source, { imageOrientation: 'from-image' });
  } catch {
    return source;
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return source;
    ctx.drawImage(bitmap, 0, 0);

    const type = source.type && source.type.startsWith('image/')
      ? source.type
      : 'image/jpeg';

    return await new Promise<Blob>((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob ?? source),
        type,
        0.95
      );
    });
  } finally {
    bitmap.close?.();
  }
}
