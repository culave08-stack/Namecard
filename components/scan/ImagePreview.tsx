'use client';

import { useEffect, useState } from 'react';

export interface ImagePreviewProps {
  blob: Blob;
  alt: string;
}

export function ImagePreview({ blob, alt }: ImagePreviewProps) {
  const [url, setUrl] = useState<string>('');

  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);

  if (!url) return null;
  return (
    <img
      src={url}
      alt={alt}
      className="aspect-[86/54] w-full rounded-lg object-cover"
    />
  );
}
