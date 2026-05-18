import type { Metadata } from 'next'
import './globals.css'
import AppShell from '@/components/AppShell'
import ToastContainer from '@/components/Toast'

export const metadata: Metadata = { title: 'Threads Auto', description: 'Threads automation dashboard' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen" style={{ backgroundColor: '#F8F8FB' }}>
        <AppShell>{children}</AppShell>
        <ToastContainer />
      </body>
    </html>
  )
}
