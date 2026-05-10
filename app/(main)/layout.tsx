import { createSupabaseServerClient } from '@/lib/supabase/server';
import { SignOutButton } from '@/components/auth/SignOutButton';

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      {user && (
        <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
          <span className="truncate">{user.email}</span>
          <SignOutButton />
        </div>
      )}
      {children}
    </>
  );
}
