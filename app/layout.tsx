import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
      'https://friction.alx21.chatgpt.site',
  ),
  title: 'Friction — Human / Agent Parity Lab',
  description: 'Test the same web task through human eyes and WebMCP agent tools.',
  openGraph: {
    title: 'Friction — Human / Agent Parity Lab',
    description:
      'Test the same web task through human eyes and WebMCP agent tools.',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Friction Human / Agent Parity Lab' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Friction — Human / Agent Parity Lab',
    description:
      'Test the same web task through human eyes and WebMCP agent tools.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
