import { createSupabaseServerClient } from '@/lib/supabase/server';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Brand } from '@/components/brand/Brand';

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      {user && (
        <header className="mb-8 flex items-center justify-between border-b border-border/60 pb-4">
          <Brand size="md" />
          <div className="flex items-center gap-4">
            <span
              className="hidden text-xs text-muted-foreground sm:inline tabular"
              title={user.email ?? undefined}
            >
              {user.email}
            </span>
            <ThemeToggle />
            <SignOutButton />
          </div>
        </header>
      )}
      {children}
    </>
  );
}
