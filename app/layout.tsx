import type { Metadata } from 'next';
import './globals.css';

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://friction.alx21.chatgpt.site';

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Friction',
  url: siteUrl,
  description: 'Compare recorded visual and WebMCP journeys for a simulated registration, review evidence, and retest a built-in repair.',
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Any modern web browser',
  isAccessibleForFree: true,
  codeRepository: 'https://github.com/agammann/friction-webmcp',
  license: 'https://opensource.org/license/mit',
  featureList: [
    'Paired human and WebMCP agent traces',
    'Outcome, information, consent, state, and effort parity checks',
    'Visible interface patch review',
    'Ten page-owned WebMCP tools over shared visible state',
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Friction — Human / Agent Parity Lab',
  description: 'Compare recorded visual and WebMCP journeys for a simulated registration, review evidence, and retest a built-in repair.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Friction — Human / Agent Parity Lab',
    description:
      'Compare recorded visual and WebMCP journeys for a simulated registration, review evidence, and retest a built-in repair.',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Friction Human / Agent Parity Lab' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Friction — Human / Agent Parity Lab',
    description:
      'Compare recorded visual and WebMCP journeys for a simulated registration, review evidence, and retest a built-in repair.',
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
        className="antialiased"
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
