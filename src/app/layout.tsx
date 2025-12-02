import React from 'react';
import './globals.css';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import ClientNavigation from './client-navigation';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
      <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body className={`${inter.className} bg-background text-foreground antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <main className="min-h-screen w-full">
              {children}
            </main>
            <Toaster />
            <Analytics />
          </ThemeProvider>
        </body>
      </html>
  );
}
