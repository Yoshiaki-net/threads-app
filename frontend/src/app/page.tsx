'use client'
import { useEffect, useState } from 'react'
import { competitorApi, postApi, schedulerApi } from '@/lib/api'
import { Flame, Calendar, Users, FileText, TrendingUp } from 'lucide-react'

export default function Dashboard() {
  const [buzzCount, setBuzzCount] = useState(0)
  const [scheduledCount, setScheduledCount] = useState(0)
  const [competitorCount, setCompetitorCount] = useState(0)
  const [postCount, setPostCount] = useState(0)
  const [recentBuzz, setRecentBuzz] = useState<any[]>([])

  useEffect(() => {
    competitorApi.list().then(c => setCompetitorCount(c.length))
    competitorApi.getAllBuzz().then(b => { setBuzzCount(b.length); setRecentBuzz(b.slice(0, 5)) })
    schedulerApi.listScheduled().then(s => setScheduledCount(s.length))
    postApi.list().then(p => setPostCount(p.length))
  }, [])

  const stats = [
    { label: 'バズ投稿', value: buzzCount, icon: Flame, iconBg: 'bg-[#EEF1F8]', iconColor: 'text-[#1E3464]' },
    { label: 'スケジュール中', value: scheduledCount, icon: Calendar, iconBg: 'bg-purple-100', iconColor: 'text-purple-500' },
    { label: '競合アカウント', value: competitorCount, icon: Users, iconBg: 'bg-blue-100', iconColor: 'text-blue-500' },
    { label: '保存投稿', value: postCount, icon: FileText, iconBg: 'bg-green-100', iconColor: 'text-green-500' },
  ]

  return (
    <div>
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">ダッシュボード</h2>
        <p className="text-sm text-gray-500 mt-1">今日もバズを狙っていきましょう！</p>
      </div>

      {/* Top row: Weekly record + Mission */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-6">
        {/* 今週の投稿記録 */}
        <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800">今週の投稿記録</h3>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">今週</span>
          </div>
          <div className="flex items-center justify-center py-4">
            {/* Circular progress */}
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#EEF1F8" strokeWidth="12" />
                <circle
                  cx="60" cy="60" r="50" fill="none"
                  stroke="#C9A84C" strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${Math.min(scheduledCount / 7 * 314, 314)} 314`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-gray-900">{scheduledCount}</span>
                <span className="text-xs text-gray-400">/ 7件</span>
              </div>
            </div>
          </div>
          <p className="text-center text-sm text-gray-500">今週の予約投稿数</p>
        </div>

        {/* 今週のミッション */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-bold text-gray-800 mb-4">今週のミッション</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-[#EEF1F8] rounded-xl">
              <div className="w-8 h-8 rounded-full bg-[#1E3464] flex items-center justify-center text-white text-xs font-bold">1</div>
              <div>
                <p className="text-xs font-medium text-gray-700">競合を3件追加する</p>
                <p className="text-xs text-gray-400">競合リサーチ強化</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs font-bold">2</div>
              <div>
                <p className="text-xs font-medium text-gray-700">AI投稿を5件生成する</p>
                <p className="text-xs text-gray-400">投稿ライブラリ活用</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs font-bold">3</div>
              <div>
                <p className="text-xs font-medium text-gray-700">投稿をスケジュール設定</p>
                <p className="text-xs text-gray-400">スケジューラを使う</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-full ${s.iconBg} flex items-center justify-center`}>
                <s.icon size={18} className={s.iconColor} />
              </div>
              <TrendingUp size={14} className="text-gray-300" />
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{s.value}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recent buzz */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-[#EEF1F8] flex items-center justify-center">
              <Flame size={14} className="text-[#C9A84C]" />
            </span>
            最近のバズ投稿
          </h3>
        </div>
        {recentBuzz.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-14 h-14 bg-[#EEF1F8] rounded-full flex items-center justify-center mx-auto mb-3">
              <Flame size={24} className="text-[#C9A84C]" />
            </div>
            <p className="text-gray-400 text-sm">バズ投稿がまだありません</p>
            <p className="text-gray-400 text-xs mt-1">競合リサーチでアカウントを追加してください</p>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {recentBuzz.map((p: any) => (
              <div key={p.id} className="min-w-[260px] border border-[#C9A84C]/20 rounded-xl p-4 bg-[#FDF8EE] flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-[#1E3464]">@{p.username}</span>
                  <span className="text-xs bg-[#FDF8EE] text-[#C9A84C] px-2 py-0.5 rounded-full font-medium">
                    ❤️ {p.likes_count?.toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-700 line-clamp-3">{p.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
