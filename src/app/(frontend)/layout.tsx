import React from 'react'
import type { Metadata } from 'next'
import './styles.css'

const title = 'List Your Wishes'
const description =
  'A personal place to collect wishes, save for lovely things, and browse friends’ lists.'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'),
  title,
  description,
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: { title, description },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <div id="root">{children}</div>
      </body>
    </html>
  )
}
