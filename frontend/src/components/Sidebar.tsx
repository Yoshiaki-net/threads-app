'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, BookOpen, FileText, Calendar, LayoutDashboard, Settings, X, BarChart2, ShieldCheck } from 'lucide-react'
import { logout, getUser } from '@/lib/auth'

const nav = [
  { href: '/', label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/competitors', label: '競合リサーチ', icon: Users },
  { href: '/knowledge', label: 'ナレッジ設定', icon: BookOpen },
  { href: '/posts', label: '投稿ライブラリ', icon: FileText },
  { href: '/scheduler', label: 'スケジューラ', icon: Calendar },
  { href: '/analytics', label: '分析', icon: BarChart2 },
  { href: '/settings', label: '設定', icon: Settings },
]

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const path = usePathname()
  const user = getUser()
  return (
    <aside className="w-56 min-h-screen bg-white flex flex-col shadow-sm border-r border-gray-100">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex-1">
          <div className="bg-white rounded-lg p-1">
            <img src="/logo.png" alt="AIマスターラボ" className="w-full h-auto max-h-20 object-contain" />
          </div>
          <p className="text-xs text-gray-400 mt-1">Threads 自動化ツール</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="md:hidden p-1 text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        )}
      </div>
      <nav className="flex-1 py-4 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
              path === href
                ? 'border-l-4 border-[#C9A84C] bg-[#EEF1F8] text-[#1E3464] pl-3'
                : 'border-l-4 border-transparent text-gray-500 hover:bg-gray-50 hover:text-[#1E3464] pl-3'
            }`}
          >
            <Icon size={16} className={path === href ? 'text-[#C9A84C]' : ''} />
            {label}
          </Link>
        ))}
        {/* Admin menu - only shown for admin users */}
        {user?.is_admin && (
          <Link
            href="/admin"
            onClick={onClose}
            className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors mt-2 ${
              path === '/admin'
                ? 'border-l-4 border-[#C9A84C] bg-[#EEF1F8] text-[#1E3464] pl-3'
                : 'border-l-4 border-transparent text-gray-500 hover:bg-gray-50 hover:text-[#1E3464] pl-3'
            }`}
          >
            <ShieldCheck size={16} className={path === '/admin' ? 'text-[#C9A84C]' : ''} />
            管理者ページ
          </Link>
        )}
      </nav>
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-full bg-[#EEF1F8] flex items-center justify-center text-[#1E3464] text-xs font-bold shrink-0">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <span className="text-xs text-gray-600 truncate block">{user?.email || ''}</span>
            {user?.is_admin && <span className="text-xs text-[#C9A84C] font-medium">管理者</span>}
          </div>
        </div>
        <button onClick={logout} className="w-full text-left text-xs text-gray-400 hover:text-red-500 transition-colors">
          ログアウト
        </button>
      </div>
    </aside>
  )
}
