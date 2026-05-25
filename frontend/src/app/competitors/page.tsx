'use client'
import { useEffect, useState, useCallback } from 'react'
import { competitorApi, postApi } from '@/lib/api'
import {
  Plus, Trash2, Flame, RefreshCw, Users, Search,
  TrendingUp, TrendingDown, Minus, Edit2, Check, X,
  Heart, MessageCircle, Repeat2, Tag, Zap, ChevronDown,
  BarChart2, Award
} from 'lucide-react'
import { toast } from '@/components/Toast'

const GENRES = ['ビジネス', 'マーケティング', '副業・起業', 'ライフスタイル', 'テック', '教育', '健康・美容', 'その他']
const GENRE_COLORS: Record<string, string> = {
  'ビジネス':     'bg-blue-100 text-blue-700',
  'マーケティング': 'bg-purple-100 text-purple-700',
  '副業・起業':   'bg-amber-100 text-amber-700',
  'ライフスタイル': 'bg-green-100 text-green-700',
  'テック':       'bg-cyan-100 text-cyan-700',
  '教育':         'bg-indigo-100 text-indigo-700',
  '健康・美容':   'bg-rose-100 text-rose-700',
  'その他':       'bg-gray-100 text-gray-600',
}

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
  genre: string | null
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

type TrendingAccount = {
  id: number
  username: string
  display_name: string | null
  profile_picture_url: string | null
  followers_count: number
  avg_likes_7d: number
  current_avg: number
  prev_avg: number | null
  lift_pct: number
  genre: string
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
  const colors = [
    'from-blue-500 to-purple-500',
    'from-emerald-500 to-teal-500',
    'from-orange-500 to-red-500',
    'from-[#1E3464] to-[#C9A84C]',
  ]
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length]
  return (
    <div
      className={`rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold flex-shrink-0`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {name?.charAt(0).toUpperCase() || '?'}
    </div>
  )
}

function GenreBadge({ genre }: { genre: string | null }) {
  const g = genre || 'その他'
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${GENRE_COLORS[g] || 'bg-gray-100 text-gray-600'}`}>
      {g}
    </span>
  )
}

function LiftBadge({ pct }: { pct: number }) {
  if (Math.abs(pct) < 1) return <span className="inline-flex items-center gap-0.5 text-xs text-gray-400"><Minus size={10} />±0%</span>
  if (pct > 0) return (
    <span className="inline-flex items-center gap-0.5 text-xs text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded-full">
      <TrendingUp size={10} />+{pct}%
    </span>
  )
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-red-500 font-semibold bg-red-50 px-1.5 py-0.5 rounded-full">
      <TrendingDown size={10} />{pct}%
    </span>
  )
}

function MiniChart({ history }: { history: HistoryEntry[] }) {
  if (history.length < 2) return (
    <div className="flex items-end gap-1 h-10">
      {[0.3, 0.5, 0.4, 0.6, 0.45, 0.7, 0.55].map((h, i) => (
        <div key={i} className="flex-1 bg-gray-100 rounded-t" style={{ height: `${h * 100}%` }} />
      ))}
    </div>
  )
  const sorted = [...history]
    .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
    .slice(-7)
  const max = Math.max(...sorted.map(h => h.avg_likes), 1)
  return (
    <div className="flex items-end gap-1 h-10">
      {sorted.map((h, i) => {
        const isLast = i === sorted.length - 1
        return (
          <div
            key={i}
            className={`flex-1 rounded-t transition-all ${isLast ? 'bg-[#C9A84C]' : 'bg-[#1E3464]/20'}`}
            style={{ height: `${Math.max((h.avg_likes / max) * 100, 6)}%` }}
            title={`${Math.round(h.avg_likes)}`}
          />
        )
      })}
    </div>
  )
}

// ── Trending Section ──────────────────────────────────────────────
function TrendingSection({ onSelectId }: { onSelectId: (id: number) => void }) {
  const [data, setData] = useState<{ trending: TrendingAccount[]; by_genre: Record<string, TrendingAccount[]> } | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeGenre, setActiveGenre] = useState<string | null>(null)

  useEffect(() => {
    competitorApi.getTrending()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-5 animate-pulse">
      <div className="h-4 w-48 bg-gray-100 rounded mb-3" />
      <div className="flex gap-3">
        {[1,2,3].map(i => <div key={i} className="flex-1 h-20 bg-gray-100 rounded-xl" />)}
      </div>
    </div>
  )

  if (!data || data.trending.length === 0) return null

  const genres = Object.keys(data.by_genre)
  const displayGenre = activeGenre || genres[0]
  const displayList = displayGenre ? (data.by_genre[displayGenre] || []) : data.trending.slice(0, 5)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center">
          <Zap size={13} className="text-amber-600" />
        </div>
        <h3 className="font-bold text-gray-900 text-sm">昨日のジャンル別急上昇アカウント</h3>
        <span className="ml-auto text-[10px] text-gray-400 flex items-center gap-1">
          <BarChart2 size={10} />前日比エンゲージメント
        </span>
      </div>

      {/* Genre tabs */}
      {genres.length > 1 && (
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-hide">
          {genres.map(g => (
            <button
              key={g}
              onClick={() => setActiveGenre(g === displayGenre && activeGenre ? null : g)}
              className={`flex-shrink-0 text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                g === displayGenre
                  ? 'bg-[#1E3464] text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {/* Account cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {displayList.map((acc, idx) => (
          <button
            key={acc.id}
            onClick={() => onSelectId(acc.id)}
            className="text-left p-3 rounded-xl border border-gray-100 hover:border-[#C9A84C]/50 hover:bg-[#FDF8EE] transition-all group"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="relative">
                <Avatar src={acc.profile_picture_url} name={acc.username} size={36} />
                {idx === 0 && displayGenre === (activeGenre || genres[0]) && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center">
                    <Award size={9} className="text-white" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate">@{acc.username}</p>
                <GenreBadge genre={acc.genre} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Heart size={10} className="text-rose-400" />
                {Math.round(acc.current_avg).toLocaleString()}
              </div>
              <LiftBadge pct={acc.lift_pct} />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────
export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [selected, setSelected] = useState<Competitor | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [buzzOnly, setBuzzOnly] = useState(false)
  const [analysis, setAnalysis] = useState<Record<number, string>>({})
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [removing, setRemoving] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState<number | null>(null)

  // Add form
  const [searchQuery, setSearchQuery] = useState('')
  const [genre, setGenre] = useState('')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [searchHint, setSearchHint] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [adding, setAdding] = useState(false)
  const [showManualId, setShowManualId] = useState(false)
  const [manualId, setManualId] = useState('')

  // Followers inline edit
  const [editingFollowers, setEditingFollowers] = useState<number | null>(null)
  const [followerInput, setFollowerInput] = useState('')

  // Genre inline edit
  const [editingGenre, setEditingGenre] = useState<number | null>(null)

  const load = useCallback(() => competitorApi.list().then(setCompetitors), [])
  useEffect(() => { load() }, [load])

  /** URLやURLエンコードされた入力からユーザー名 or IDを抽出する */
  const normalizeInput = (raw: string): string => {
    const s = raw.trim()
    // Full URL: https://www.threads.net/@username or https://threads.net/@username
    try {
      const url = new URL(s)
      if (url.hostname.includes('threads')) {
        // pathname: /@username or /@username/post/...
        const match = url.pathname.match(/\/@([^/?#]+)/)
        if (match) return match[1]
      }
    } catch {}
    // @username → strip @
    return s.replace(/^@/, '')
  }

  const searchUser = async (overrideQuery?: string) => {
    const raw = (overrideQuery ?? searchQuery).trim()
    if (!raw) return
    const q = normalizeInput(raw)
    setPreviewing(true)
    setPreview(null)
    setSearchError('')
    setSearchHint('')
    setShowManualId(false)
    try {
      const data = await competitorApi.search(q)
      if (data.error) {
        setSearchError('Threadsを連携してください（設定ページ）')
        return
      }
      if (data.results && data.results.length > 0) {
        setPreview(data.results[0])
        return
      }
      // Not found
      setSearchError(data.message || 'アカウントが見つかりませんでした')
      setSearchHint(data.hint || '')
      setShowManualId(true)
    } catch (e: any) {
      setSearchError(e.response?.data?.detail || '検索に失敗しました。もう一度お試しください。')
      setShowManualId(true)
    } finally {
      setPreviewing(false)
    }
  }

  const searchByManualId = () => {
    if (!manualId.trim()) return
    setSearchQuery(manualId.trim())
    searchUser(manualId.trim())
  }

  const add = async () => {
    if (!preview) { toast.error('先にアカウントを検索してください'); return }
    setAdding(true)
    try {
      await competitorApi.add(
        preview.username,
        preview.threads_user_id,
        genre
      )
      toast.success(`@${preview.username} を追加しました`)
      setSearchQuery(''); setPreview(null); setGenre(''); setSearchError(''); setShowAddForm(false)
      load()
    } catch (e: any) {
      toast.error(e.response?.data?.detail || '追加に失敗しました')
    } finally { setAdding(false) }
  }

  const remove = async (id: number) => {
    if (!confirm('このアカウントを削除しますか？')) return
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
    setBuzzOnly(false)
    setLoadingPosts(true)
    try {
      const [postsData, historyData] = await Promise.all([
        competitorApi.getPosts(c.id, false),
        competitorApi.getHistory(c.id),
      ])
      setPosts(postsData)
      setHistory(historyData)
    } finally {
      setLoadingPosts(false)
    }
  }

  const selectById = (id: number) => {
    const c = competitors.find(x => x.id === id)
    if (c) selectCompetitor(c)
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

  const saveGenre = async (id: number, newGenre: string) => {
    try {
      const updated = await competitorApi.updateGenre(id, newGenre)
      setCompetitors(prev => prev.map(x => x.id === id ? updated : x))
      if (selected?.id === id) setSelected(updated)
      setEditingGenre(null)
      toast.success('ジャンルを更新しました')
    } catch { toast.error('更新に失敗しました') }
  }

  const analyze = async (post: Post) => {
    try {
      const { analysis: a } = await postApi.analyzeCompetitor(post.text)
      setAnalysis(prev => ({ ...prev, [post.id]: a }))
    } catch { toast.error('AI分析に失敗しました') }
  }

  const maxLikes = Math.max(...posts.map(p => p.likes_count), 1)
  const sortedHistory = [...history].sort(
    (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
  )
  const prevAvgLikes = sortedHistory.length >= 2 ? sortedHistory[sortedHistory.length - 2]?.avg_likes : null

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">競合リサーチ</h2>
          <p className="text-sm text-gray-500 mt-0.5">競合アカウントの投稿・エンゲージメントを追跡します</p>
        </div>
        <button
          onClick={() => setShowAddForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-[#1E3464] text-white rounded-full text-sm font-medium hover:bg-[#162A52] transition-colors shadow-sm"
        >
          <Plus size={15} /> アカウントを追加
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Search size={14} className="text-[#C9A84C]" /> 競合アカウントを検索して追加
          </h3>
          <div className="space-y-4">
            {/* Search box */}
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">アカウント名 / ユーザー名</label>
              <div className="flex gap-2">
                <input
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C] bg-gray-50"
                  placeholder="@ユーザー名 / URL / 数字ID どれでもOK"
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setPreview(null); setSearchError(''); setShowManualId(false) }}
                  onKeyDown={e => e.key === 'Enter' && searchUser()}
                />
                <button
                  onClick={() => searchUser()}
                  disabled={previewing || !searchQuery.trim()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#1E3464] text-white rounded-xl text-sm font-medium hover:bg-[#162A52] disabled:opacity-50 transition-colors flex-shrink-0"
                >
                  {previewing ? <RefreshCw size={13} className="animate-spin" /> : <Search size={13} />}
                  検索
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">URLをそのまま貼り付けてもOK。@ユーザー名・数字ID・ThreadsのURLに対応。</p>
            </div>

            {/* Error + fallback */}
            {searchError && (
              <div className="space-y-2">
                <div className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
                  {searchError}
                </div>
                {searchHint && (
                  <p className="text-xs text-gray-400 px-1">{searchHint}</p>
                )}
                {showManualId && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
                    <p className="text-xs font-medium text-gray-600">📋 Threads ユーザーIDで直接入力</p>
                    <p className="text-xs text-gray-400">
                      Threadsのプロフィールページ URL:
                      <code className="bg-white border border-gray-200 rounded px-1 ml-1">www.threads.net/@ユーザー名</code>
                      を開き、ページ内の数字IDをコピーしてください。
                    </p>
                    <div className="flex gap-2">
                      <input
                        className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C] bg-white"
                        placeholder="数字のユーザーID（例: 1234567890）"
                        value={manualId}
                        onChange={e => setManualId(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && searchByManualId()}
                      />
                      <button
                        onClick={searchByManualId}
                        disabled={previewing || !manualId.trim()}
                        className="px-4 py-2 bg-[#1E3464] text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-[#162A52] transition-colors flex-shrink-0"
                      >
                        検索
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Preview card + genre + add button */}
            {preview && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-4 bg-[#FDF8EE] border border-[#C9A84C]/40 rounded-xl">
                  <Avatar src={preview.profile_picture_url} name={preview.username} size={48} />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm text-gray-900">@{preview.username}</p>
                    {preview.display_name && preview.display_name !== preview.username && (
                      <p className="text-xs text-gray-500">{preview.display_name}</p>
                    )}
                    {preview.bio && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{preview.bio}</p>}
                  </div>
                  <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex-shrink-0">
                    ✓ 確認済み
                  </span>
                </div>

                {/* Genre selection */}
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block flex items-center gap-1">
                    <Tag size={10} /> ジャンルを選択（任意）
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {GENRES.map(g => (
                      <button
                        key={g}
                        onClick={() => setGenre(genre === g ? '' : g)}
                        className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                          genre === g
                            ? 'bg-[#1E3464] text-white border-[#1E3464]'
                            : 'border-gray-200 text-gray-500 hover:border-[#1E3464] hover:text-[#1E3464]'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={add}
                  disabled={adding}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#C9A84C] text-white rounded-full text-sm font-semibold hover:bg-[#b8963e] disabled:opacity-50 transition-colors"
                >
                  {adding ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={13} />}
                  @{preview.username} を追加する
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Trending section */}
      <TrendingSection onSelectId={selectById} />

      {/* Main grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Left: Competitor list */}
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              追跡中 ({competitors.length}/10)
            </p>
          </div>

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
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-[#C9A84C] bg-[#FDF8EE] shadow-sm'
                    : 'border-gray-100 bg-white hover:border-[#C9A84C]/40 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Avatar src={c.profile_picture_url} name={c.username} size={42} />
                  <div className="flex-1 min-w-0">
                    {/* Username + actions */}
                    <div className="flex items-center justify-between gap-1">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-gray-900 truncate">@{c.username}</p>
                        {c.display_name && c.display_name !== c.username && (
                          <p className="text-[11px] text-gray-400 truncate">{c.display_name}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button
                          onClick={e => { e.stopPropagation(); refresh(c) }}
                          disabled={isRefreshing}
                          className="p-1 text-gray-300 hover:text-[#1E3464] transition-colors disabled:opacity-50 rounded-lg hover:bg-gray-100"
                          title="更新"
                        >
                          <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); remove(c.id) }}
                          disabled={removing === c.id}
                          className="p-1 text-gray-300 hover:text-red-400 transition-colors rounded-lg hover:bg-red-50"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Genre badge */}
                    <div className="mt-1.5 flex items-center gap-1.5 flex-wrap" onClick={e => e.stopPropagation()}>
                      {editingGenre === c.id ? (
                        <div className="flex flex-wrap gap-1">
                          {GENRES.map(g => (
                            <button
                              key={g}
                              onClick={() => saveGenre(c.id, g)}
                              className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                                c.genre === g
                                  ? 'bg-[#1E3464] text-white border-[#1E3464]'
                                  : 'border-gray-200 text-gray-500 hover:border-[#1E3464]'
                              }`}
                            >
                              {g}
                            </button>
                          ))}
                          <button onClick={() => setEditingGenre(null)} className="text-gray-400 hover:text-gray-600">
                            <X size={11} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingGenre(c.id)}
                          className="group flex items-center gap-1"
                        >
                          <GenreBadge genre={c.genre} />
                          <Edit2 size={9} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      )}
                    </div>

                    {/* Followers */}
                    <div className="mt-1 flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      <Users size={10} className="text-gray-300" />
                      {editingFollowers === c.id ? (
                        <div className="flex items-center gap-1">
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
                          onClick={() => { setEditingFollowers(c.id); setFollowerInput(String(c.followers_count)) }}
                          className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1 group"
                        >
                          {c.followers_count > 0 ? c.followers_count.toLocaleString() + ' フォロワー' : 'フォロワー未設定'}
                          <Edit2 size={9} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      )}
                    </div>

                    {/* Avg likes */}
                    <div className="mt-1 flex items-center gap-1">
                      <Heart size={10} className="text-rose-400" />
                      <span className="text-xs text-gray-500">
                        平均 <strong className="text-gray-800">{Math.round(c.avg_likes_7d).toLocaleString()}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Right: Detail panel */}
        <div className="col-span-2">
          {selected ? (
            <div className="space-y-4">
              {/* Account header card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start gap-4">
                  <Avatar src={selected.profile_picture_url} name={selected.username} size={60} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-gray-900">@{selected.username}</h3>
                          <GenreBadge genre={selected.genre} />
                        </div>
                        {selected.display_name && selected.display_name !== selected.username && (
                          <p className="text-sm text-gray-500 mt-0.5">{selected.display_name}</p>
                        )}
                      </div>
                      <button
                        onClick={() => refresh(selected)}
                        disabled={refreshing === selected.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 rounded-full text-xs hover:border-[#1E3464] hover:text-[#1E3464] transition-colors disabled:opacity-50 flex-shrink-0"
                      >
                        <RefreshCw size={11} className={refreshing === selected.id ? 'animate-spin' : ''} />
                        最新データ取得
                      </button>
                    </div>
                    {selected.bio && (
                      <p className="text-xs text-gray-500 mt-2 leading-relaxed line-clamp-2">{selected.bio}</p>
                    )}

                    {/* Stats row */}
                    <div className="flex gap-5 mt-3 pt-3 border-t border-gray-50">
                      <div>
                        <p className="text-sm font-bold text-gray-900">
                          {selected.followers_count > 0 ? selected.followers_count.toLocaleString() : '—'}
                        </p>
                        <p className="text-[10px] text-gray-400">フォロワー</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{Math.round(selected.avg_likes_7d).toLocaleString()}</p>
                        <p className="text-[10px] text-gray-400">平均いいね</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{posts.length}</p>
                        <p className="text-[10px] text-gray-400">取得投稿数</p>
                      </div>
                      {prevAvgLikes !== null && (
                        <div>
                          <LiftBadge pct={Math.round(((selected.avg_likes_7d - prevAvgLikes) / Math.max(prevAvgLikes, 1)) * 100)} />
                          <p className="text-[10px] text-gray-400 mt-0.5">前回比</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mini chart */}
                {history.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-gray-600">平均いいね推移（直近7回）</p>
                    </div>
                    <MiniChart history={history} />
                  </div>
                )}
              </div>

              {/* Posts filter bar */}
              <div className="flex items-center justify-between px-1">
                <p className="text-sm font-semibold text-gray-700">
                  投稿一覧 <span className="text-gray-400 font-normal text-xs">({posts.length}件)</span>
                </p>
                <label className="flex items-center gap-2 cursor-pointer bg-white border border-gray-200 rounded-full px-3 py-1.5 text-xs hover:border-[#C9A84C] transition-colors">
                  <input
                    type="checkbox"
                    checked={buzzOnly}
                    onChange={async e => {
                      setBuzzOnly(e.target.checked)
                      if (selected) {
                        setLoadingPosts(true)
                        const postsData = await competitorApi.getPosts(selected.id, e.target.checked)
                        setPosts(postsData)
                        setLoadingPosts(false)
                      }
                    }}
                    className="accent-[#C9A84C]"
                  />
                  <Flame size={12} className="text-[#C9A84C]" />
                  <span className="text-gray-600">バズのみ表示</span>
                </label>
              </div>

              {/* Posts list */}
              {loadingPosts ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
                      <div className="h-3 bg-gray-100 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {posts.length === 0 && (
                    <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
                      <p className="text-sm text-gray-400">投稿がありません。「最新データ取得」ボタンで取得してください。</p>
                    </div>
                  )}
                  {posts.map(p => (
                    <div key={p.id} className={`bg-white rounded-2xl border p-4 transition-all hover:shadow-sm ${p.is_buzz ? 'border-[#C9A84C]/40 bg-[#FDFBF6]' : 'border-gray-100'}`}>
                      {p.is_buzz && (
                        <span className="inline-flex items-center gap-1 text-xs text-[#C9A84C] font-semibold bg-[#FDF8EE] px-2 py-0.5 rounded-full mb-2 border border-[#C9A84C]/20">
                          <Flame size={10} /> バズ投稿
                        </span>
                      )}
                      <p className="text-sm text-gray-800 leading-relaxed">{p.text || '（テキストなし）'}</p>

                      {/* Engagement bar */}
                      <div className="mt-3">
                        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${p.is_buzz ? 'bg-[#C9A84C]' : 'bg-[#1E3464]/25'}`}
                            style={{ width: `${Math.max((p.likes_count / maxLikes) * 100, 2)}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1 font-medium">
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
                            className="text-xs text-[#1E3464] hover:text-[#162A52] flex items-center gap-1 font-medium transition-colors px-2 py-1 rounded-full hover:bg-[#EEF1F8]"
                          >
                            <Zap size={10} /> AI分析
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
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center h-80 gap-4">
              <div className="w-16 h-16 bg-[#EEF1F8] rounded-full flex items-center justify-center">
                <Users size={26} className="text-[#1E3464]" />
              </div>
              <div className="text-center">
                <p className="text-gray-600 text-sm font-medium">競合アカウントを選択</p>
                <p className="text-gray-400 text-xs mt-1">左のリストからアカウントを選択すると<br />投稿・エンゲージメントデータを表示します</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
