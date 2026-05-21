'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { getToken } from '@/lib/auth'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (pathname === '/login' || pathname === '/terms' || pathname === '/privacy') {
      setReady(true)
      return
    }
    const token = getToken()
    if (!token) {
      window.location.href = '/login'
    } else {
      setReady(true)
    }
  }, [pathname])

  if (!ready) return (
    <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return <>{children}</>
}
