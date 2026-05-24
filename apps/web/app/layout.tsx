import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FrontendDevHelper — 39 Visual Debugging Tools in One Browser Extension',
  description:
    'Stop juggling 12 legacy extensions. FrontendDevHelper unifies 39 professional visual debugging tools into one Manifest V3 browser extension. 100% free & open source.',
  keywords: [
    'browser extension',
    'frontend developer tools',
    'chrome extension',
    'web debugging',
    'dom inspector',
    'css inspector',
    'accessibility audit',
  ],
  metadataBase: new URL('https://frontenddevhelper.com'),
  openGraph: {
    title: 'FrontendDevHelper — 39 Visual Debugging Tools in One Browser Extension',
    description:
      '39 professional visual debugging tools in one Manifest V3 browser extension. Free & open source.',
    url: 'https://frontenddevhelper.com',
    siteName: 'FrontendDevHelper',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FrontendDevHelper — 39 Visual Debugging Tools in One Extension',
    description:
      'Replace 12 legacy extensions with one. 39 professional tools. Free & open source.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          defer
          data-domain="frontenddevhelper.com"
          src="https://plausible.io/js/script.js"
        />
      </head>
      <body className="bg-black text-neutral-200 antialiased">{children}</body>
    </html>
  );
}
