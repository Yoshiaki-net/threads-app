'use client'
import { useEffect, useState } from 'react'
import { analyticsApi } from '@/lib/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts'
import { TrendingUp, FileText, Heart, Users } from 'lucide-react'

const NAVY = '#1E3464'
const GOLD = '#C9A84C'
const COLORS = [NAVY, GOLD, '#6B7280', '#10B981', '#EF4444']

const STATUS_LABELS: Record<string, string> = {
  draft: '下書き',
  scheduled: 'スケジュール済',
  published: '公開済み',
  failed: '失敗',
}

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    analyticsApi.get()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const summary = data?.summary || {}
  const statusData = (data?.status_counts || []).map((s: any) => ({
    ...s,
    name: STATUS_LABELS[s.status] || s.status,
  }))

  const stats = [
    { label: '総投稿数', value: summary.total_posts || 0, icon: FileText, color: 'text-[#1E3464]', bg: 'bg-[#EEF1F8]' },
    { label: '公開済み', value: summary.total_published || 0, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { label: '総いいね数', value: summary.total_likes || 0, icon: Heart, color: 'text-red-500', bg: 'bg-red-50' },
    { label: '競合アカウント', value: summary.total_competitors || 0, icon: Users, color: 'text-[#C9A84C]', bg: 'bg-[#FDF8EE]' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">分析</h2>
        <p className="text-sm text-gray-500 mt-1">投稿パフォーマンスを確認しましょう</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500">{s.label}</span>
              <div className={`w-8 h-8 rounded-full ${s.bg} flex items-center justify-center`}>
                <s.icon size={14} className={s.color} />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{s.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Weekly posts line chart */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">週別投稿数の推移</h3>
          {(data?.weekly_posts || []).every((w: any) => w.count === 0) ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">データがありません</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data?.weekly_posts || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                  formatter={(v: any) => [v, '投稿数']}
                />
                <Line type="monotone" dataKey="count" stroke={NAVY} strokeWidth={2} dot={{ fill: GOLD, r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Status donut chart */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">投稿ステータス内訳</h3>
          {statusData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">データがありません</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="count"
                >
                  {statusData.map((_: any, index: number) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                  formatter={(v: any, _: any, p: any) => [v, p.payload.name]}
                />
                <Legend formatter={(v) => STATUS_LABELS[v] || v} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top posts bar chart */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">いいね数ランキング（公開済み投稿）</h3>
        {(data?.top_posts || []).length === 0 ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
            公開済みの投稿データがありません
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data?.top_posts || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="content" width={180} tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                formatter={(v: any) => [v, 'いいね']}
              />
              <Bar dataKey="likes" fill={GOLD} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
