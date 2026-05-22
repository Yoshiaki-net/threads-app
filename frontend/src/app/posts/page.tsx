'use client'
import { useEffect, useState, useCallback } from 'react'
import { postApi, knowledgeApi, schedulerApi } from '@/lib/api'
import { Plus, Wand2, Copy, Trash2, Calendar, Loader2, Eye, X, Flame, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { toast } from '@/components/Toast'
import ThreadsPreview from '@/components/posts/ThreadsPreview'

const TABS = [
  { key: 'all', label: 'すべて' },
  { key: 'draft', label: '下書き' },
  { key: 'scheduled', label: 'スケジュール済' },
  { key: 'published', label: '公開済み' },
  { key: 'calendar', label: '📅 カレンダー' },
] as const

const STYLES = [
  { value: '', label: 'スタイル指定なし' },
  { value: 'story', label: '📖 ストーリー型' },
  { value: 'list', label: '📋 リスト型' },
  { value: 'question', label: '❓ 問いかけ型' },
  { value: 'tips', label: '💡 ノウハウ型' },
  { value: 'opinion', label: '💬 意見型' },
]

const TONES = [
  { value: '', label: 'ナレッジのトーンを使用' },
  { value: 'professional', label: 'プロフェッショナル' },
  { value: 'casual', label: 'カジュアル・親しみやすい' },
  { value: 'inspiring', label: 'インスピレーション' },
  { value: 'educational', label: '教育的・解説型' },
  { value: 'humorous', label: 'ユーモア・軽快' },
]

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    published: 'bg-emerald-100 text-emerald-700',
    scheduled: 'bg-[#EEF1F8] text-[#1E3464]',
    failed: 'bg-red-100 text-red-700',
    draft: 'bg-gray-100 text-gray-500',
  }
  const label: Record<string, string> = {
    published: '公開済み', scheduled: 'スケジュール済', failed: '失敗', draft: '下書き'
  }
  return <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${map[status] || map.draft}`}>{label[status] || status}</span>
}

// ─── Calendar View ────────────────────────────────────────────────────────────
function CalendarView({ posts }: { posts: any[] }) {
  const [current, setCurrent] = useState(new Date())

  const year = current.getFullYear()
  const month = current.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const scheduledByDate: Record<string, any[]> = {}
  posts.filter(p => p.scheduled_at).forEach(p => {
    const d = new Date(p.scheduled_at)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const key = d.getDate().toString()
      if (!scheduledByDate[key]) scheduledByDate[key] = []
      scheduledByDate[key].push(p)
    }
  })

  const [selected, setSelected] = useState<string | null>(null)
  const today = new Date()

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCurrent(new Date(year, month - 1, 1))} className="p-1.5 rounded-lg hover:bg-gray-100">
          <ChevronLeft size={18} className="text-gray-600" />
        </button>
        <h3 className="font-bold text-gray-900">{year}年{month + 1}月</h3>
        <button onClick={() => setCurrent(new Date(year, month + 1, 1))} className="p-1.5 rounded-lg hover:bg-gray-100">
          <ChevronRight size={18} className="text-gray-600" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['日', '月', '火', '水', '木', '金', '土'].map(d => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const key = day.toString()
          const dayPosts = scheduledByDate[key] || []
          const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day
          const isSelected = selected === key

          return (
            <button
              key={day}
              onClick={() => setSelected(isSelected ? null : key)}
              className={`relative min-h-[40px] rounded-xl p-1 text-sm transition-all ${
                isToday ? 'bg-[#1E3464] text-white font-bold' :
                isSelected ? 'bg-[#EEF1F8] text-[#1E3464]' :
                dayPosts.length > 0 ? 'bg-[#FDF8EE] hover:bg-[#f5edd8]' :
                'hover:bg-gray-50'
              }`}
            >
              <span className="block text-center">{day}</span>
              {dayPosts.length > 0 && (
                <div className="flex justify-center gap-0.5 mt-0.5">
                  {dayPosts.slice(0, 3).map((_, idx) => (
                    <div key={idx} className={`w-1.5 h-1.5 rounded-full ${isToday ? 'bg-[#C9A84C]' : 'bg-[#C9A84C]'}`} />
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {selected && scheduledByDate[selected] && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
          <p className="text-xs font-semibold text-gray-500">{month + 1}月{selected}日のスケジュール</p>
          {scheduledByDate[selected].map((p: any) => (
            <div key={p.id} className="p-3 bg-[#FDF8EE] rounded-xl border border-[#C9A84C]/20">
              <p className="text-xs text-gray-700 line-clamp-2">{p.content}</p>
              <p className="text-[10px] text-[#C9A84C] mt-1">
                {new Date(p.scheduled_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PostsPage() {
  const [posts, setPosts] = useState<any[]>([])
  const [knowledge, setKnowledge] = useState<any[]>([])
  const [selectedKb, setSelectedKb] = useState<number | null>(null)
  const [customPrompt, setCustomPrompt] = useState('')
  const [style, setStyle] = useState('')
  const [toneOverride, setToneOverride] = useState('')
  const [useBuzz, setUseBuzz] = useState(false)
  const [generateCount, setGenerateCount] = useState<1 | 3>(1)
  const [generatedVariants, setGeneratedVariants] = useState<any[]>([])
  const [newContent, setNewContent] = useState('')
  const [scheduleModal, setScheduleModal] = useState<{ post: any } | null>(null)
  const [scheduleTime, setScheduleTime] = useState('')
  const [generating, setGenerating] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  const [tab, setTab] = useState<'all' | 'draft' | 'scheduled' | 'published' | 'calendar'>('all')
  const [previewPost, setPreviewPost] = useState<any | null>(null)
  const [showCreatePreview, setShowCreatePreview] = useState(false)
  const [adoptedIds, setAdoptedIds] = useState<Set<number>>(new Set())

  const load = useCallback(() => {
    const status = tab === 'all' || tab === 'calendar' ? undefined : tab
    postApi.list(status).then(setPosts)
  }, [tab])

  useEffect(() => { load() }, [load])
  useEffect(() => { knowledgeApi.list().then(setKnowledge) }, [])

  const createManual = async () => {
    if (!newContent.trim()) return
    await postApi.create(newContent)
    setNewContent('')
    load()
    toast.success('投稿を保存しました')
  }

  const generate = async () => {
    if (!selectedKb) return toast.error('ナレッジを選択してください')
    setGenerating(true)
    setGeneratedVariants([])
    try {
      const result = await postApi.generate({
        knowledge_id: selectedKb,
        custom_prompt: customPrompt,
        style,
        tone_override: toneOverride,
        use_buzz_posts: useBuzz,
        count: generateCount,
      })
      if (generateCount > 1) {
        setGeneratedVariants(Array.isArray(result) ? result : [result])
        toast.success(`${generateCount}パターン生成しました！`)
      } else {
        toast.success('投稿を生成しました')
        load()
      }
    } catch {
      toast.error('投稿の生成に失敗しました')
    } finally { setGenerating(false) }
  }

  const adoptVariant = (post: any) => {
    setAdoptedIds(prev => new Set([...Array.from(prev), post.id]))
    toast.success('採用しました！投稿ライブラリに追加されました')
    load()
  }

  const similar = async (post: any) => {
    if (!selectedKb) return toast.error('ナレッジを選択してください')
    try {
      await postApi.similar(post.id, selectedKb)
      toast.success('類似投稿を生成しました')
      load()
    } catch { toast.error('類似投稿の生成に失敗しました') }
  }

  const remove = async (id: number) => {
    try {
      await postApi.delete(id)
      toast.success('削除しました')
      load()
    } catch { toast.error('削除に失敗しました') }
  }

  const schedule = async () => {
    if (!scheduleModal || !scheduleTime) return
    setScheduling(true)
    try {
      await schedulerApi.schedule(scheduleModal.post.id, new Date(scheduleTime).toISOString())
      toast.success('スケジュールを設定しました')
      setScheduleModal(null)
      load()
    } catch { toast.error('スケジュールの設定に失敗しました') }
    finally { setScheduling(false) }
  }

  const displayedPosts = tab === 'calendar' ? posts : posts

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">投稿ライブラリ</h2>
        <p className="text-sm text-gray-500 mt-0.5">投稿を作成・管理してスケジュール設定しましょう</p>
      </div>

      {/* Create panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        {/* Manual create */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="font-semibold text-sm text-gray-800 mb-3">✏️ 手動作成</h3>
          <textarea
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-[#C9A84C] bg-gray-50"
            placeholder="投稿内容を入力..."
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
          />
          <div className="mt-3 flex items-center gap-2">
            <button onClick={createManual} className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-xl text-sm font-medium hover:bg-gray-900 transition-colors">
              <Plus size={14} /> 保存
            </button>
            {newContent.trim() && (
              <button onClick={() => setShowCreatePreview(v => !v)} className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                <Eye size={14} /> プレビュー
              </button>
            )}
          </div>
          {showCreatePreview && newContent.trim() && <div className="mt-4"><ThreadsPreview content={newContent} /></div>}
        </div>

        {/* AI generate */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="font-semibold text-sm text-gray-800 mb-3">🤖 AI生成</h3>
          <div className="space-y-2">
            <select
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C] bg-gray-50"
              value={selectedKb ?? ''}
              onChange={e => setSelectedKb(Number(e.target.value) || null)}
            >
              <option value="">ナレッジを選択...</option>
              {knowledge.map(k => <option key={k.id} value={k.id}>{k.title}</option>)}
            </select>

            <div className="grid grid-cols-2 gap-2">
              <select
                className="border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#C9A84C] bg-gray-50"
                value={style}
                onChange={e => setStyle(e.target.value)}
              >
                {STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <select
                className="border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#C9A84C] bg-gray-50"
                value={toneOverride}
                onChange={e => setToneOverride(e.target.value)}
              >
                {TONES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C] bg-gray-50"
              placeholder="追加プロンプト（任意）"
              value={customPrompt}
              onChange={e => setCustomPrompt(e.target.value)}
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                <input type="checkbox" checked={useBuzz} onChange={e => setUseBuzz(e.target.checked)} className="accent-[#C9A84C]" />
                <Flame size={12} className="text-[#C9A84C]" />
                バズ投稿を参考にする
              </label>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-gray-500">生成数:</span>
                {([1, 3] as const).map(n => (
                  <button
                    key={n}
                    onClick={() => setGenerateCount(n)}
                    className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${generateCount === n ? 'bg-[#1E3464] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={generate}
              disabled={generating}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-colors"
              style={{ background: generating ? '#ccc' : '#C9A84C' }}
            >
              {generating ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
              {generating ? '生成中...' : `AI生成${generateCount === 3 ? '（3パターン）' : ''}`}
            </button>
          </div>
        </div>
      </div>

      {/* Generated variants comparison */}
      {generatedVariants.length > 1 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">🎯 生成結果 - 比較して採用してください</h3>
            <button onClick={() => setGeneratedVariants([])} className="text-xs text-gray-400 hover:text-gray-600">クリア</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {generatedVariants.map((post, i) => (
              <div key={post.id} className={`bg-white rounded-2xl border p-4 flex flex-col gap-3 ${adoptedIds.has(post.id) ? 'border-emerald-300 bg-emerald-50' : 'border-[#C9A84C]/30'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#C9A84C] bg-[#FDF8EE] px-2 py-0.5 rounded-full">パターン {i + 1}</span>
                  {adoptedIds.has(post.id) && <span className="text-xs text-emerald-600 flex items-center gap-1"><Check size={11} />採用済み</span>}
                </div>
                <p className="text-sm text-gray-800 leading-relaxed flex-1 whitespace-pre-wrap">{post.content}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => adoptVariant(post)}
                    disabled={adoptedIds.has(post.id)}
                    className="flex-1 py-2 bg-[#1E3464] text-white rounded-xl text-xs font-medium hover:bg-[#162A52] disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
                  >
                    <Check size={12} /> 採用する
                  </button>
                  <button onClick={() => setPreviewPost(post)} className="px-3 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs hover:bg-gray-50 transition-colors">
                    <Eye size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-0 mb-5 border-b border-gray-200 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
              tab === t.key ? 'border-[#1E3464] text-[#1E3464]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Calendar view */}
      {tab === 'calendar' ? (
        <CalendarView posts={posts} />
      ) : (
        <div className="space-y-3">
          {posts.length === 0 && (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
              <p className="text-gray-400 text-sm">投稿がありません</p>
            </div>
          )}
          {posts.map(post => (
            <div key={post.id} className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
              <div className="flex justify-between items-start gap-2">
                <StatusBadge status={post.status} />
                <div className="flex gap-2 flex-shrink-0">
                  {post.status === 'draft' && (
                    <>
                      <button onClick={() => similar(post)} className="text-purple-400 hover:text-purple-600 transition-colors" title="類似生成">
                        <Copy size={14} />
                      </button>
                      <button onClick={() => { setScheduleModal({ post }); setScheduleTime('') }} className="text-[#1E3464] hover:text-[#162A52] transition-colors" title="スケジュール">
                        <Calendar size={14} />
                      </button>
                    </>
                  )}
                  <button onClick={() => setPreviewPost(post)} className="text-gray-300 hover:text-[#1E3464] transition-colors"><Eye size={14} /></button>
                  <button onClick={() => remove(post.id)} className="text-gray-300 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
              <p className="text-sm text-gray-700 mt-2.5 whitespace-pre-wrap line-clamp-4">{post.content}</p>
              <div className="flex items-center gap-4 mt-2">
                {post.scheduled_at && (
                  <p className="text-xs text-[#1E3464] flex items-center gap-1">
                    <Calendar size={11} /> {new Date(post.scheduled_at).toLocaleString('ja-JP')}
                  </p>
                )}
                {post.status === 'published' && post.likes_count > 0 && (
                  <p className="text-xs text-rose-500">❤️ {post.likes_count.toLocaleString()}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewPost && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-[#F5F6FA] rounded-2xl p-6 w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800 text-sm">投稿プレビュー</h3>
              <button onClick={() => setPreviewPost(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <ThreadsPreview content={previewPost.content} />
            <div className="flex gap-2 mt-4">
              {previewPost.status === 'draft' && (
                <button
                  onClick={() => { setScheduleModal({ post: previewPost }); setPreviewPost(null); setScheduleTime('') }}
                  className="flex-1 py-2 bg-[#1E3464] text-white rounded-xl text-sm font-medium hover:bg-[#162A52] transition-colors flex items-center justify-center gap-2"
                >
                  <Calendar size={14} /> スケジュール設定
                </button>
              )}
              <button onClick={() => setPreviewPost(null)} className="flex-1 py-2 bg-gray-100 rounded-xl text-sm hover:bg-gray-200 transition-colors">閉じる</button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule modal */}
      {scheduleModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
            <h3 className="font-bold text-gray-900 mb-3">投稿をスケジュール</h3>
            <p className="text-sm text-gray-600 mb-4 line-clamp-3 bg-gray-50 rounded-xl p-3">{scheduleModal.post.content}</p>
            <input
              type="datetime-local"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-[#C9A84C] bg-gray-50"
              value={scheduleTime}
              onChange={e => setScheduleTime(e.target.value)}
            />
            <div className="flex gap-2">
              <button onClick={schedule} disabled={scheduling} className="flex-1 py-2.5 bg-[#1E3464] text-white rounded-xl text-sm font-medium hover:bg-[#162A52] disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                {scheduling && <Loader2 size={14} className="animate-spin" />} 設定
              </button>
              <button onClick={() => setScheduleModal(null)} disabled={scheduling} className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors">キャンセル</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
