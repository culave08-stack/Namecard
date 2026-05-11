'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Camera, ImagePlus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export interface CameraCaptureProps {
  label: string;
  onCapture: (blob: Blob) => void;
}

type Mode = 'init' | 'live' | 'upload';

// 터치 디바이스 (모바일/태블릿) → 카메라 우선
// 데스크탑 (마우스만) → 업로드 우선
function prefersCamera(): boolean {
  if (typeof window === 'undefined') return false;
  if (!('mediaDevices' in navigator) || !navigator.mediaDevices.getUserMedia) return false;
  return window.matchMedia('(any-pointer: coarse)').matches;
}

export function CameraCapture({ label, onCapture }: CameraCaptureProps) {
  const t = useTranslations('scan');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [mode, setMode] = useState<Mode>('init');

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

  // 초기 모드 선택: 터치 디바이스 → 카메라 시도, 데스크탑 → 업로드 모드
  useEffect(() => {
    if (mode !== 'init') return;
    setMode(prefersCamera() ? 'live' : 'upload');
  }, [mode]);

  // 카메라 활성화 (mode === 'live' 진입 시)
  useEffect(() => {
    if (mode !== 'live') return;
    let cancelled = false;
    async function start() {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        toast.warning(t('permissionDenied'));
        setMode('upload');
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
        attachStreamToVideo();
      } catch {
        toast.warning(t('permissionDenied'));
        setMode('upload');
      }
    }
    start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [mode, t, attachStreamToVideo]);

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

  const canUseCamera =
    typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {mode === 'live' && (
        <>
          <div className="relative aspect-card w-full overflow-hidden rounded-xl bg-zinc-950 shadow-card">
            <video
              ref={handleVideoRef}
              onClick={handleVideoTap}
              className="h-full w-full object-cover"
              playsInline
              muted
              autoPlay
            />
            <CornerGuides />
            <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-[11px] text-white backdrop-blur-sm">
              {t('guideHint')}
            </p>
          </div>

          <button
            onClick={captureFromVideo}
            type="button"
            aria-label="촬영"
            className="group mx-auto inline-flex size-14 items-center justify-center rounded-full bg-foreground p-1 shadow-card transition-transform active:scale-95"
          >
            <span className="block size-full rounded-full border-[3px] border-background bg-foreground transition-colors group-hover:bg-primary" />
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-1.5 self-center text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <Upload className="size-3.5" strokeWidth={1.75} />
            파일에서 선택
          </button>
        </>
      )}

      {mode === 'upload' && (
        <>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="lift group flex aspect-card w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/40 text-muted-foreground shadow-card hover:border-primary/40 hover:bg-muted/60 hover:text-foreground"
          >
            <span className="inline-flex size-12 items-center justify-center rounded-full bg-card text-primary shadow-card transition-transform group-hover:scale-105">
              <ImagePlus className="size-5" strokeWidth={1.75} />
            </span>
            <span className="text-sm font-medium text-foreground">
              명함 이미지 선택
            </span>
            <span className="text-[11px]">탭하거나 클릭해서 파일 업로드</span>
          </button>

          <Button
            onClick={() => fileInputRef.current?.click()}
            type="button"
            size="lg"
            className="h-12 gap-2"
          >
            <Upload className="size-4" strokeWidth={1.75} />
            파일에서 선택
          </Button>

          {canUseCamera && (
            <button
              type="button"
              onClick={() => setMode('live')}
              className="inline-flex items-center justify-center gap-1.5 self-center text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <Camera className="size-3.5" strokeWidth={1.75} />
              카메라로 촬영
            </button>
          )}
        </>
      )}

      {mode === 'init' && (
        <div className="flex aspect-card w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30">
          <Camera className="size-6 text-muted-foreground" strokeWidth={1.5} />
          <p className="text-xs text-muted-foreground">준비 중…</p>
        </div>
      )}
    </div>
  );
}

function CornerGuides() {
  const base = 'pointer-events-none absolute size-7 border-white/85';
  return (
    <>
      <span className={`${base} left-3 top-3 border-l-2 border-t-2 rounded-tl`} />
      <span className={`${base} right-3 top-3 border-r-2 border-t-2 rounded-tr`} />
      <span className={`${base} bottom-3 left-3 border-b-2 border-l-2 rounded-bl`} />
      <span className={`${base} bottom-3 right-3 border-b-2 border-r-2 rounded-br`} />
    </>
  );
}
