'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Camera, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export interface CameraCaptureProps {
  label: string;
  onCapture: (blob: Blob) => void;
}

export function CameraCapture({ label, onCapture }: CameraCaptureProps) {
  const t = useTranslations('scan');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [mode, setMode] = useState<'init' | 'live' | 'fallback'>('init');

  const attachStreamToVideo = useCallback(() => {
    const v = videoRef.current;
    const s = streamRef.current;
    if (v && s && v.srcObject !== s) {
      v.srcObject = s;
      v.play().catch(() => {
        // iOS Safari may reject play() without a user gesture; the stream is
        // still attached and a tap on the video will resume it.
      });
    }
  }, []);

  const handleVideoRef = useCallback(
    (el: HTMLVideoElement | null) => {
      videoRef.current = el;
      if (el) attachStreamToVideo();
    },
    [attachStreamToVideo]
  );

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
        setMode('live');
        attachStreamToVideo();
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
  }, [t, attachStreamToVideo]);

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

  function handleVideoTap() {
    const v = videoRef.current;
    if (v && v.paused) v.play().catch(() => {});
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>

      {mode === 'live' && (
        <div className="relative aspect-card w-full overflow-hidden rounded-xl bg-zinc-950 shadow-card">
          <video
            ref={handleVideoRef}
            onClick={handleVideoTap}
            className="h-full w-full object-cover"
            playsInline
            muted
            autoPlay
          />
          {/* 명함 가이드 — 모서리 크로스헤어 */}
          <CornerGuides />
          <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-[11px] text-white backdrop-blur-sm">
            {t('guideHint')}
          </p>
        </div>
      )}

      {mode === 'live' && (
        <button
          onClick={captureFromVideo}
          type="button"
          aria-label="촬영"
          className="group mx-auto inline-flex size-14 items-center justify-center rounded-full bg-foreground p-1 shadow-card transition-transform active:scale-95"
        >
          <span className="block size-full rounded-full border-[3px] border-background bg-foreground transition-colors group-hover:bg-primary" />
        </button>
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
          <Button
            onClick={() => fileInputRef.current?.click()}
            type="button"
            size="lg"
            className="h-12 gap-2"
          >
            <Upload className="size-4" strokeWidth={1.75} />
            파일에서 선택 / 촬영
          </Button>
        </>
      )}

      {mode === 'init' && (
        <div className="flex aspect-card w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30">
          <Camera className="size-6 text-muted-foreground" strokeWidth={1.5} />
          <p className="text-xs text-muted-foreground">카메라 준비 중…</p>
        </div>
      )}
    </div>
  );
}

function CornerGuides() {
  // 각 모서리에 위치한 작은 L자 가이드라인
  const base =
    'pointer-events-none absolute size-7 border-white/85';
  return (
    <>
      <span className={`${base} left-3 top-3 border-l-2 border-t-2 rounded-tl`} />
      <span className={`${base} right-3 top-3 border-r-2 border-t-2 rounded-tr`} />
      <span className={`${base} left-3 bottom-3 border-l-2 border-b-2 rounded-bl`} />
      <span className={`${base} right-3 bottom-3 border-r-2 border-b-2 rounded-br`} />
    </>
  );
}
