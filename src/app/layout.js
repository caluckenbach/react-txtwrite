// src/app/layout.js

import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from '@/components/ThemeProvider';

// Initialize Inter font
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata = {
  title: 'TXTWrite | Markdown Editor',
  description: 'A browser extension that lets you highlight, annotate, and chat with any text on the internet.',
  metadataBase: new URL('https://txtwrite.com'),
  openGraph: {
    title: 'TXTWrite | Highlight, Note, & Chat with any text on the web.',
    description: 'A browser extension that lets you highlight, annotate, and chat with any text on the internet.',
    images: [
      {
        url: '/header-testing.png',
        width: 1200,
        height: 675,
        alt: 'TXTWrite Platform',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TXTWrite | Highlight, Note, & Chat with any text on the web.',
    description: 'A browser extension that lets you highlight, annotate, and chat with any text on the internet.',
    images: ['/header-testing.png'],
    creator: '@realtxtwrite',
  },
};

export default function RootLayout({ children }) {
  // Combine font variables
  const fontClasses = `${inter.variable} dark`;

  return (
    <html lang="en" className={fontClasses} suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/x-icon" href="/logo/logo-dark.png"></link>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css"
          integrity="sha512-Evv84Mr4kqVGRNSgIGL/F/aIDqQb7xQ2vcrdIwxfjThSH8CSR7PBEakCr51Ck+w+/U6swU2Im1vVX0SVk9ABhg=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />

        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />

        <meta name="application-name" content="TXTWrite" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="TXTWrite" />
        <meta name="theme-color" content="#d4d4d4" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/logo/logo-dark.png" />
      </head>
      <body className="bg-neutral-300 dark:bg-neutral-800 relative overflow-hidden h-screen">
        <ThemeProvider>
          <main className="fixed inset-0 m-2 z-10 md:m-4 lg:m-2 border-4 rounded-xl border-neutral-200 dark:border-neutral-800">
            <div className="bg-brand-light dark:bg-brand-dark h-full w-full rounded-lg flex flex-col overflow-hidden">
              {children}
            </div>
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
