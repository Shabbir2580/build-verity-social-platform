import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

const siteDescription =
  'A community platform for thoughtful discussions, shared knowledge and clearer context around the content we see online.'

export const metadata: Metadata = {
  title: {
    default: 'Verity — Share freely. Think critically. Know more.',
    template: '%s | Verity',
  },
  description: siteDescription,
  applicationName: 'Verity',
  category: 'social networking',
  keywords: [
    'Verity',
    'social community',
    'thoughtful discussions',
    'digital literacy',
    'content context',
    'media literacy',
    'fact checking',
  ],
  openGraph: {
    type: 'website',
    siteName: 'Verity',
    title: 'Verity — Share freely. Think critically. Know more.',
    description: siteDescription,
  },
  twitter: {
    card: 'summary',
    title: 'Verity — Share freely. Think critically. Know more.',
    description: siteDescription,
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#4f46e5',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
