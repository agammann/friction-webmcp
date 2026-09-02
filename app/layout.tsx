import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://friction.alx21.chatgpt.site';

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Friction',
  url: siteUrl,
  description: 'Test the same web task through human eyes and WebMCP agent tools.',
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Any modern web browser',
  isAccessibleForFree: true,
  codeRepository: 'https://github.com/agammann/friction-webmcp',
  license: 'https://opensource.org/license/mit',
  featureList: [
    'Paired human and WebMCP agent traces',
    'Outcome, information, consent, state, and effort parity checks',
    'Human-only interface patch approval',
    'Ten page-owned WebMCP tools over shared visible state',
  ],
};

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Friction — Human / Agent Parity Lab',
  description: 'Test the same web task through human eyes and WebMCP agent tools.',
  alternates: { canonical: '/' },
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {children}
      </body>
    </html>
  );
}
