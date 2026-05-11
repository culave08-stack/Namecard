'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Brand } from '@/components/brand/Brand';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="h-8 animate-pulse rounded bg-muted" />}>
      <LoginForm />
    </Suspense>
  );
}

type Mode = 'login' | 'signup';

function LoginForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    const supabase = createSupabaseBrowserClient();
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success(t('signupSuccess'));
        router.replace(next);
        router.refresh();
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace(next);
        router.refresh();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-3rem)] flex-col">
      <header className="pb-12 pt-4">
        <Brand size="md" asLink={false} />
      </header>

      <div className="flex-1">
        <div className="space-y-2 pb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {mode === 'login' ? t('loginTitle') : t('signupTitle')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === 'login'
              ? '저장한 명함을 다시 만나러 가요.'
              : '오늘 받은 명함부터 차곡차곡 모아두세요.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label
              className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
              htmlFor="email"
            >
              {t('email')}
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              className="h-11"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label
              className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
              htmlFor="password"
            >
              {t('password')}
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              className="h-11"
            />
            {mode === 'signup' && (
              <p className="text-xs text-muted-foreground">{t('passwordHint')}</p>
            )}
          </div>

          <Button type="submit" disabled={submitting} size="lg" className="mt-2 h-11">
            {submitting ? '...' : mode === 'login' ? t('login') : t('signup')}
          </Button>
        </form>
      </div>

      <footer className="border-t border-border/60 pt-6 text-center">
        <button
          type="button"
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {mode === 'login' ? t('toSignup') : t('toLogin')}
        </button>
      </footer>
    </div>
  );
}
