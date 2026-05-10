'use client';

import { useEffect, useState } from 'react';

export interface ImagePreviewProps {
  src: Blob | string;
  alt: string;
}

export function ImagePreview({ src, alt }: ImagePreviewProps) {
  const [url, setUrl] = useState<string>('');

  useEffect(() => {
    if (typeof src === 'string') {
      setUrl(src);
      return;
    }
    const u = URL.createObjectURL(src);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [src]);

  if (!url) return null;
  return (
    <img
      src={url}
      alt={alt}
      className="aspect-[86/54] w-full rounded-lg object-cover"
    />
  );
}
