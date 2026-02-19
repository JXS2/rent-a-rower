import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Rent-a-Rower - Michigan Men\'s Rowing',
  description: 'Reserve team members for labor',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
