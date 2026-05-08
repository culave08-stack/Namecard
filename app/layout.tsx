// app/layout.tsx
import './globals.css';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { Toaster } from '@/components/ui/sonner';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className="bg-background text-foreground">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <main className="mx-auto min-h-dvh w-full max-w-[640px] px-4 py-6">
            {children}
          </main>
          <Toaster richColors position="top-center" />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

export const metadata = {
  title: '명함 스캐너',
  description: '명함을 카메라로 찍어 디지털화하세요',
};
