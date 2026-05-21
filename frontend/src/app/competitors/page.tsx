'use client'
import { useEffect, useState, useCallback } from 'react'
import { competitorApi, postApi } from '@/lib/api'
import {
  Plus, Trash2, Flame, RefreshCw, Users, Search,
  TrendingUp, TrendingDown, Minus, Edit2, Check, X,
  Heart, MessageCircle, Repeat2, ChevronRight
} from 'lucide-react'
import { toast } from '@/components/Toast'

type Competitor = {
  id: number
  threads_user_id: string
  username: string
  display_name: string | null
  followers_count: number
  avg_likes_7d: number
  is_active: boolean
  profile_picture_url: string | null
  bio: string | null
  last_fetched_at: string | null
  followers_count_updated_at: string | null
}

type Post = {
  id: number
  text: string
  likes_count: number
  replies_count: number
  reposts_count: number
  is_buzz: boolean
  posted_at: string | null
}

type HistoryEntry = {
  avg_likes: number
  posts_count: number
  followers_count: number
  recorded_at: string
}

type Preview = {
  threads_user_id: string
  username: string
  display_name: string
  profile_picture_url: string | null
  bio: string | null
}

function Avatar({ src, name, size = 40 }: { src?: string | null; name: string; size?: number }) {
  const [err, setErr] = useState(false)
  if (src && !err) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setErr(true)}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className="rounded-full bg-gradient-to-br from-[#1E3464] to-[#C9A84C] flex items-center justify-center text-white font-bold flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {name?.charAt(0).toUpperCase() || '?'}
    </div>
  )
}

function TrendBadge({ current, previous }: { current: number; previous: number | null }) {
  if (previous === null || previous === 0) return null
  const diff = current - previous
  const pct = Math.abs(Math.round((diff / previous) * 100))
  if (pct < 1) return <span className="text-xs text-gray-400 flex items-center gap-0.5"><Minus size={10} />±0%</span>
  if (diff > 0) return (
    <span className="text-xs text-emerald-500 flex items-center gap-0.5 font-medium">
      <TrendingUp size={10} />+{pct}%
    </span>
  )
  return (
    <span className="text-xs text-red-400 flex items-center gap-0.5 font-medium">
      <TrendingDown size={10} />-{pct}%
    </span>
  )
}

function MiniChart({ history }: { history: HistoryEntry[] }) {
  if (history.length < 2) return (
    <div className="text-xs text-gray-400 text-center py-2">データ蓄積中...</div>
  )
  const sorted = [...history].sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()).slice(-7)
  const max = Math.max(...sorted.map(h => h.avg_likes), 1)
  return (
    <div className="flex items-end gap-1 h-12">
      {sorted.map((h, i) => {
        const heightPct = Math.max((h.avg_likes / max) * 100, 4)
        const isLast = i === sorted.length - 1
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
            <div
              className={`w-full rounded-t transition-all ${isLast ? 'bg-[#C9A84C]' : 'bg-[#1E3464]/20'}`}
              style={{ height: `${heightPct}%` }}
            />
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
              {Math.round(h.avg_likes)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [selected, setSelected] = useState<Competitor | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [buzzOnly, setBuzzOnly] = useState(false)
  const [analysis, setAnalysis] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(false)
  const [removing, setRemoving] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState<number | null>(null)

  // Add form
  const [username, setUsername] = useState('')
  const [threadsUserId, setThreadsUserId] = useState('')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)

  // Followers inline edit
  const [editingFollowers, setEditingFollowers] = useState<number | null>(null)
  const [followerInput, setFollowerInput] = useState('')

  const load = useCallback(() => competitorApi.list().then(setCompetitors), [])
  useEffect(() => { load() }, [load])

  const lookupPreview = async () => {
    if (!threadsUserId.trim()) { toast.error('Threads User IDを入力してください'); return }
    setPreviewing(true)
    setPreview(null)
    try {
      const data = await competitorApi.lookup(threadsUserId.trim())
      if (data.error) {
        toast.error('Threadsを連携してください（設定ページ）')
      } else {
        setPreview(data)
        if (!username) setUsername(data.username)
      }
    } catch {
      toast.error('プロフィール取得失敗。User IDを確認してください')
    } finally {
      setPreviewing(false)
    }
  }

  const add = async () => {
    if (!username.trim()) { toast.error('ユーザー名を入力してください'); return }
    setLoading(true)
    try {
      await competitorApi.add(
        username.trim().replace(/^@/, ''),
        preview?.threads_user_id || threadsUserId.trim()
      )
      toast.success(`@${username.trim()} を追加しました`)
      setUsername(''); setThreadsUserId(''); setPreview(null); setShowAddForm(false)
      load()
    } catch (e: any) {
      toast.error(e.response?.data?.detail || '追加に失敗しました')
    } finally { setLoading(false) }
  }

  const remove = async (id: number) => {
    setRemoving(id)
    try {
      await competitorApi.remove(id)
      toast.success('削除しました')
      load()
      if (selected?.id === id) { setSelected(null); setPosts([]); setHistory([]) }
    } catch { toast.error('削除に失敗しました') }
    finally { setRemoving(null) }
  }

  const refresh = async (c: Competitor) => {
    setRefreshing(c.id)
    try {
      const updated = await competitorApi.refresh(c.id)
      setCompetitors(prev => prev.map(x => x.id === c.id ? updated : x))
      if (selected?.id === c.id) setSelected(updated)
      toast.success('更新しました')
    } catch (e: any) {
      toast.error(e.response?.data?.detail || '更新に失敗しました')
    } finally { setRefreshing(null) }
  }

  const selectCompetitor = async (c: Competitor) => {
    setSelected(c)
    const [postsData, historyData] = await Promise.all([
      competitorApi.getPosts(c.id, buzzOnly),
      competitorApi.getHistory(c.id),
    ])
    setPosts(postsData)
    setHistory(historyData)
  }

  const saveFollowers = async (id: number) => {
    const count = parseInt(followerInput.replace(/,/g, ''))
    if (isNaN(count) || count < 0) { toast.error('正しい数値を入力してください'); return }
    try {
      const updated = await competitorApi.updateFollowers(id, count)
      setCompetitors(prev => prev.map(x => x.id === id ? updated : x))
      if (selected?.id === id) setSelected(updated)
      setEditingFollowers(null)
      toast.success('フォロワー数を更新しました')
    } catch { toast.error('更新に失敗しました') }
  }

  const analyze = async (post: Post) => {
    try {
      const { analysis: a } = await postApi.analyzeCompetitor(post.text)
      setAnalysis(prev => ({ ...prev, [post.id]: a }))
    } catch { toast.error('AI分析に失敗しました') }
  }

  const maxLikes = Math.max(...posts.map(p => p.likes_count), 1)
  const prevAvgLikes = history.length >= 2 ? history[1]?.avg_likes : null

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">競合リサーチ</h2>
          <p className="text-sm text-gray-500 mt-0.5">競合アカウントの投稿・エンゲージメントを追跡します</p>
        </div>
        <button
          onClick={() => setShowAddForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-[#1E3464] text-white rounded-full text-sm font-medium hover:bg-[#162A52] transition-colors"
        >
          <Plus size={15} />追加
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">競合アカウントを追加</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Threads User ID <span className="text-gray-400">（プロフィールURLの数字）</span></label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C] bg-gray-50"
                  placeholder="例: 1234567890"
                  value={threadsUserId}
                  onChange={e => { setThreadsUserId(e.target.value); setPreview(null) }}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">ユーザー名 <span className="text-gray-400">（@なし）</span></label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C] bg-gray-50"
                  placeholder="例: yoshi_writing_sns"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={lookupPreview}
                disabled={previewing}
                className="flex items-center gap-2 px-4 py-2 border border-[#1E3464] text-[#1E3464] rounded-full text-sm font-medium hover:bg-[#EEF1F8] disabled:opacity-50 transition-colors"
              >
                {previewing ? <RefreshCw size={13} className="animate-spin" /> : <Search size={13} />}
                プレビュー
              </button>
              <button
                onClick={add}
                disabled={loading || !username.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-[#C9A84C] text-white rounded-full text-sm font-medium hover:bg-[#b8963e] disabled:opacity-50 transition-colors"
              >
                {loading ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={13} />}
                追加する
              </button>
            </div>

            {/* Preview card */}
            {preview && (
              <div className="flex items-center gap-3 p-3 bg-[#FDF8EE] border border-[#C9A84C]/30 rounded-xl">
                <Avatar src={preview.profile_picture_url} name={preview.username} size={44} />
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-gray-900">@{preview.username}</p>
                  {preview.display_name && preview.display_name !== preview.username && (
                    <p className="text-xs text-gray-500">{preview.display_name}</p>
                  )}
                  {preview.bio && <p className="text-xs text-gray-400 mt-0.5 truncate">{preview.bio}</p>}
                </div>
                <span className="ml-auto text-xs text-[#C9A84C] font-medium bg-white px-2 py-0.5 rounded-full border border-[#C9A84C]/30 flex-shrink-0">取得済み</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Left: Competitor list */}
        <div className="space-y-2">
          {competitors.length === 0 && (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
              <div className="w-12 h-12 bg-[#EEF1F8] rounded-full flex items-center justify-center mx-auto mb-3">
                <Users size={20} className="text-[#1E3464]" />
              </div>
              <p className="text-sm text-gray-400">競合アカウントを追加してください</p>
              <button onClick={() => setShowAddForm(true)} className="mt-3 text-xs text-[#1E3464] font-medium hover:underline">
                + 追加する
              </button>
            </div>
          )}

          {competitors.map(c => {
            const isSelected = selected?.id === c.id
            const isRefreshing = refreshing === c.id
            return (
              <div
                key={c.id}
                onClick={() => selectCompetitor(c)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-[#C9A84C] bg-[#FDF8EE] shadow-sm'
                    : 'border-gray-100 bg-white hover:border-[#C9A84C]/50 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Avatar src={c.profile_picture_url} name={c.username} size={40} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="font-semibold text-sm text-gray-900 truncate">@{c.username}</p>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={e => { e.stopPropagation(); refresh(c) }}
                          disabled={isRefreshing}
                          className="p-1 text-gray-300 hover:text-[#1E3464] transition-colors disabled:opacity-50"
                          title="更新"
                        >
                          <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); remove(c.id) }}
                          disabled={removing === c.id}
                          className="p-1 text-gray-300 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Followers */}
                    <div className="mt-1 flex items-center gap-1.5">
                      <Users size={10} className="text-gray-400" />
                      {editingFollowers === c.id ? (
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <input
                            autoFocus
                            className="w-20 text-xs border border-[#C9A84C] rounded px-1 py-0.5 focus:outline-none"
                            value={followerInput}
                            onChange={e => setFollowerInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveFollowers(c.id); if (e.key === 'Escape') setEditingFollowers(null) }}
                          />
                          <button onClick={() => saveFollowers(c.id)} className="text-emerald-500 hover:text-emerald-600"><Check size={11} /></button>
                          <button onClick={() => setEditingFollowers(null)} className="text-gray-400 hover:text-gray-600"><X size={11} /></button>
                        </div>
                      ) : (
                        <button
                          onClick={e => { e.stopPropagation(); setEditingFollowers(c.id); setFollowerInput(String(c.followers_count)) }}
                          className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 group"
                        >
                          {c.followers_count > 0 ? c.followers_count.toLocaleString() : '未設定'}
                          <Edit2 size={9} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      )}
                    </div>

                    {/* Avg likes + trend */}
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Heart size={10} className="text-rose-400" />
                        平均 {Math.round(c.avg_likes_7d).toLocaleString()}
                      </span>
                      {isSelected && <TrendBadge current={c.avg_likes_7d} previous={prevAvgLikes} />}
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <div className="mt-2">
                    <ChevronRight size={12} className="text-[#C9A84C] ml-auto" />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Right: Posts panel */}
        <div className="col-span-2">
          {selected ? (
            <div className="space-y-4">
              {/* Account header */}
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <div className="flex items-start gap-4">
                  <Avatar src={selected.profile_picture_url} name={selected.username} size={56} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-gray-900">@{selected.username}</h3>
                        {selected.display_name && selected.display_name !== selected.username && (
                          <p className="text-sm text-gray-500">{selected.display_name}</p>
                        )}
                      </div>
                      <button
                        onClick={() => refresh(selected)}
                        disabled={refreshing === selected.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 rounded-full text-xs hover:border-[#1E3464] hover:text-[#1E3464] transition-colors disabled:opacity-50"
                      >
                        <RefreshCw size={11} className={refreshing === selected.id ? 'animate-spin' : ''} />
                        更新
                      </button>
                    </div>
                    {selected.bio && (
                      <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{selected.bio}</p>
                    )}
                    <div className="flex gap-4 mt-2">
                      <div className="text-center">
                        <p className="text-sm font-bold text-gray-900">
                          {selected.followers_count > 0 ? selected.followers_count.toLocaleString() : '—'}
                        </p>
                        <p className="text-[10px] text-gray-400">フォロワー</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-gray-900">{Math.round(selected.avg_likes_7d).toLocaleString()}</p>
                        <p className="text-[10px] text-gray-400">平均いいね</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-gray-900">{posts.length}</p>
                        <p className="text-[10px] text-gray-400">取得投稿数</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Engagement trend chart */}
                {history.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-gray-600">平均いいね推移</p>
                      <TrendBadge current={selected.avg_likes_7d} previous={prevAvgLikes} />
                    </div>
                    <MiniChart history={history} />
                  </div>
                )}
              </div>

              {/* Posts filter */}
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">投稿一覧 <span className="text-gray-400 font-normal">({posts.length}件)</span></p>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={buzzOnly}
                    onChange={e => { setBuzzOnly(e.target.checked); selectCompetitor(selected) }}
                    className="accent-[#C9A84C]"
                  />
                  <Flame size={13} className="text-[#C9A84C]" />
                  <span className="text-gray-600 text-xs">バズのみ</span>
                </label>
              </div>

              {/* Posts */}
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {posts.length === 0 && (
                  <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
                    <p className="text-sm text-gray-400">投稿がありません。「更新」ボタンで取得してください。</p>
                  </div>
                )}
                {posts.map(p => (
                  <div key={p.id} className={`bg-white rounded-2xl border p-4 transition-all ${p.is_buzz ? 'border-[#C9A84C]/40' : 'border-gray-100'}`}>
                    {p.is_buzz && (
                      <span className="inline-flex items-center gap-1 text-xs text-[#C9A84C] font-semibold bg-[#FDF8EE] px-2 py-0.5 rounded-full mb-2 border border-[#C9A84C]/20">
                        <Flame size={10} /> バズ投稿
                      </span>
                    )}
                    <p className="text-sm text-gray-800 leading-relaxed">{p.text || '（テキストなし）'}</p>

                    {/* Like bar */}
                    <div className="mt-3">
                      <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${p.is_buzz ? 'bg-[#C9A84C]' : 'bg-[#1E3464]/30'}`}
                          style={{ width: `${(p.likes_count / maxLikes) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Heart size={11} className="text-rose-400" />
                          {p.likes_count.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle size={11} className="text-blue-400" />
                          {p.replies_count.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Repeat2 size={11} className="text-emerald-400" />
                          {p.reposts_count.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {p.posted_at && (
                          <span className="text-[10px] text-gray-400">
                            {new Date(p.posted_at).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                        <button
                          onClick={() => analyze(p)}
                          className="text-xs text-[#1E3464] hover:text-[#162A52] flex items-center gap-1 font-medium transition-colors"
                        >
                          <RefreshCw size={10} /> AI分析
                        </button>
                      </div>
                    </div>

                    {analysis[p.id] && (
                      <div className="mt-3 p-3 bg-[#EEF1F8] border border-[#1E3464]/10 rounded-xl text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {analysis[p.id]}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-14 h-14 bg-[#EEF1F8] rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users size={22} className="text-[#1E3464]" />
                </div>
                <p className="text-gray-400 text-sm">競合アカウントを選択してください</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
