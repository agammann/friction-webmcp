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
      'https://frictionglass-parity-lab.alx21.chatgpt.site',
  ),
  title: 'FrictionGlass — Human / Agent Parity Lab',
  description: 'Test the same web task through human eyes and WebMCP agent tools.',
  openGraph: {
    title: 'FrictionGlass — Human / Agent Parity Lab',
    description:
      'Test the same web task through human eyes and WebMCP agent tools.',
    type: 'website',
    images: [{ url: '/og.jpg', width: 1200, height: 630, alt: 'FrictionGlass Human / Agent Parity Lab' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FrictionGlass — Human / Agent Parity Lab',
    description:
      'Test the same web task through human eyes and WebMCP agent tools.',
    images: ['/og.jpg'],
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
