// app/layout.tsx
import './globals.css';
import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/theme/ThemeProvider';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider locale={locale} messages={messages}>
            <main className="mx-auto min-h-dvh w-full max-w-[640px] px-4 py-6">
              {children}
            </main>
            <Toaster richColors position="top-center" />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

export const metadata: Metadata = {
  title: '명함 스캐너',
  description: '명함을 카메라로 찍어 디지털화하세요',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '명함 스캐너',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};
