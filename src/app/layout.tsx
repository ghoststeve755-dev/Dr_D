// src/app/layout.tsx

import type { Metadata } from 'next';
import './globals.css';
import ClientLayoutWrapper from '@/components/layout/ClientLayoutWrapper';

export const metadata: Metadata = {
  title: 'Doctor D — Doctor of Discipline',
  description: 'Your Personal Life Operating System to track habits, journal, and grow.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#4f46e5" />
      </head>
      <body>
        <ClientLayoutWrapper>{children}</ClientLayoutWrapper>
      </body>
    </html>
  );
}
