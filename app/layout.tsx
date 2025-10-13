import type { Metadata } from 'next'
import './globals.css'
import React from 'react'
import { ClientLayout } from './client-layout'

export const metadata: Metadata = {
  title: 'OSLearn - Gamified Operating Systems Learning',
  description: 'Master Operating Systems through an engaging, game-based learning experience',
  generator: 'v0.dev',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}
