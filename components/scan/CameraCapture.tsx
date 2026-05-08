'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export interface CameraCaptureProps {
  label: string;
  onCapture: (blob: Blob) => void;
}

export function CameraCapture({ label, onCapture }: CameraCaptureProps) {
  const t = useTranslations('scan');
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [mode, setMode] = useState<'init' | 'live' | 'fallback'>('init');

  useEffect(() => {
    let cancelled = false;
    async function start() {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setMode('fallback');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setMode('live');
      } catch {
        toast.warning(t('permissionDenied'));
        setMode('fallback');
      }
    }
    start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [t]);

  function captureFromVideo() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(blob);
      },
      'image/jpeg',
      0.95
    );
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onCapture(file);
    e.target.value = '';
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium">{label}</p>

      {mode === 'live' && (
        <div className="relative aspect-[86/54] w-full overflow-hidden rounded-lg bg-black">
          <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
          <div className="pointer-events-none absolute inset-4 rounded-md border-2 border-dashed border-white/80" />
          <p className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
            {t('guideHint')}
          </p>
        </div>
      )}

      {mode === 'live' && (
        <Button onClick={captureFromVideo} type="button">
          📸
        </Button>
      )}

      {mode === 'fallback' && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button onClick={() => fileInputRef.current?.click()} type="button">
            파일 선택 / 촬영
          </Button>
        </>
      )}

      {mode === 'init' && <p className="text-sm text-muted-foreground">카메라 준비 중...</p>}
    </div>
  );
}
