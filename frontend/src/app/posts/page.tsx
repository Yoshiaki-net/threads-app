'use client'
import { useEffect, useState } from 'react'
import { postApi, knowledgeApi, schedulerApi } from '@/lib/api'
import { Plus, Wand2, Copy, Trash2, Calendar, Loader2, Eye, X } from 'lucide-react'
import { toast } from '@/components/Toast'
import ThreadsPreview from '@/components/posts/ThreadsPreview'

const TABS = [
  { key: 'all', label: 'すべて' },
  { key: 'draft', label: '下書き' },
  { key: 'scheduled', label: 'スケジュール済' },
  { key: 'published', label: '公開済み' },
] as const

export default function PostsPage() {
  const [posts, setPosts] = useState<any[]>([])
  const [knowledge, setKnowledge] = useState<any[]>([])
  const [selectedKb, setSelectedKb] = useState<number | null>(null)
  const [customPrompt, setCustomPrompt] = useState('')
  const [newContent, setNewContent] = useState('')
  const [scheduleModal, setScheduleModal] = useState<{ post: any } | null>(null)
  const [scheduleTime, setScheduleTime] = useState('')
  const [generating, setGenerating] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  const [tab, setTab] = useState<'all' | 'draft' | 'scheduled' | 'published'>('all')
  const [previewPost, setPreviewPost] = useState<any | null>(null)
  const [showCreatePreview, setShowCreatePreview] = useState(false)

  const load = () => postApi.list(tab === 'all' ? undefined : tab).then(setPosts)
  useEffect(() => { load() }, [tab])
  useEffect(() => { knowledgeApi.list().then(setKnowledge) }, [])

  const createManual = async () => {
    if (!newContent.trim()) return
    await postApi.create(newContent)
    setNewContent('')
    load()
  }

  const generate = async () => {
    if (!selectedKb) return toast.error('ナレッジを選択してください')
    setGenerating(true)
    try {
      await postApi.generate(selectedKb, customPrompt)
      toast.success('投稿を生成しました')
      load()
    } catch {
      toast.error('投稿の生成に失敗しました')
    } finally { setGenerating(false) }
  }

  const similar = async (post: any) => {
    if (!selectedKb) return toast.error('ナレッジを選択してください')
    try {
      await postApi.similar(post.id, selectedKb)
      toast.success('類似投稿を生成しました')
      load()
    } catch {
      toast.error('類似投稿の生成に失敗しました')
    }
  }

  const remove = async (id: number) => {
    try {
      await postApi.delete(id)
      toast.success('削除しました')
      load()
    } catch {
      toast.error('削除に失敗しました')
    }
  }

  const schedule = async () => {
    if (!scheduleModal || !scheduleTime) return
    setScheduling(true)
    try {
      await schedulerApi.schedule(scheduleModal.post.id, new Date(scheduleTime).toISOString())
      toast.success('スケジュールを設定しました')
      setScheduleModal(null)
      load()
    } catch {
      toast.error('スケジュールの設定に失敗しました')
    } finally { setScheduling(false) }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">投稿ライブラリ</h2>
        <p className="text-sm text-gray-500 mt-1">投稿を作成・管理してスケジュール設定しましょう</p>
      </div>

      {/* Create panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        {/* Manual create */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="font-semibold text-sm text-gray-800 mb-3">手動作成</h3>
          <textarea
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-[#C9A84C] focus:border-[#C9A84C] bg-gray-50"
            placeholder="投稿内容を入力..."
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
          />
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={createManual}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-xl text-sm font-medium hover:bg-gray-900 transition-colors"
            >
              <Plus size={14} /> 保存
            </button>
            {newContent.trim() && (
              <button
                onClick={() => setShowCreatePreview(v => !v)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <Eye size={14} /> {showCreatePreview ? 'プレビューを閉じる' : 'プレビュー'}
              </button>
            )}
          </div>
          {showCreatePreview && newContent.trim() && (
            <div className="mt-4">
              <ThreadsPreview content={newContent} />
            </div>
          )}
        </div>

        {/* AI generate */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="font-semibold text-sm text-gray-800 mb-3">AI生成</h3>
          <select
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-[#C9A84C] focus:border-[#C9A84C] bg-gray-50"
            value={selectedKb ?? ''}
            onChange={e => setSelectedKb(Number(e.target.value) || null)}
          >
            <option value="">ナレッジを選択...</option>
            {knowledge.map(k => <option key={k.id} value={k.id}>{k.title}</option>)}
          </select>
          <input
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-[#C9A84C] focus:border-[#C9A84C] bg-gray-50"
            placeholder="追加プロンプト (任意)"
            value={customPrompt}
            onChange={e => setCustomPrompt(e.target.value)}
          />
          <button
            onClick={generate}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-colors"
            style={{ background: generating ? '#ccc' : '#C9A84C' }}
          >
            {generating ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
            {generating ? '生成中...' : 'AI生成'}
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-0 mb-5 border-b border-gray-200 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? 'border-b-2 border-[#1E3464] text-[#1E3464]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Post list */}
      <div className="space-y-3">
        {posts.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <p className="text-gray-400 text-sm">投稿がありません</p>
          </div>
        )}
        {posts.map(post => (
          <div key={post.id} className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
            <div className="flex justify-between items-start">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                post.status === 'published' ? 'bg-green-100 text-green-700' :
                post.status === 'scheduled' ? 'bg-[#EEF1F8] text-[#1E3464]' :
                post.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {post.status === 'published' ? '公開済み' : post.status === 'scheduled' ? 'スケジュール済' : post.status === 'failed' ? '失敗' : '下書き'}
              </span>
              <div className="flex gap-2">
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
                <button onClick={() => setPreviewPost(post)} className="text-gray-300 hover:text-[#1E3464] transition-colors" title="プレビュー">
                  <Eye size={14} />
                </button>
                <button onClick={() => remove(post.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-700 mt-2.5 whitespace-pre-wrap">{post.content}</p>
            {post.scheduled_at && (
              <p className="text-xs text-[#1E3464] mt-2 flex items-center gap-1">
                <Calendar size={11} /> {new Date(post.scheduled_at).toLocaleString('ja-JP')}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Preview Modal */}
      {previewPost && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-[#F5F6FA] rounded-2xl p-6 w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800 text-sm">投稿プレビュー</h3>
              <button onClick={() => setPreviewPost(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <ThreadsPreview content={previewPost.content} />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { setScheduleModal({ post: previewPost }); setPreviewPost(null); setScheduleTime('') }}
                className="flex-1 py-2 bg-[#1E3464] text-white rounded-xl text-sm font-medium hover:bg-[#162A52] transition-colors flex items-center justify-center gap-2"
              >
                <Calendar size={14} /> スケジュール設定
              </button>
              <button onClick={() => setPreviewPost(null)} className="px-4 py-2 bg-gray-100 rounded-xl text-sm hover:bg-gray-200 transition-colors">
                閉じる
              </button>
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
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-[#C9A84C] focus:border-[#C9A84C] bg-gray-50"
              value={scheduleTime}
              onChange={e => setScheduleTime(e.target.value)}
            />
            <div className="flex gap-2">
              <button onClick={schedule} disabled={scheduling} className="flex-1 py-2.5 bg-[#1E3464] text-white rounded-xl text-sm font-medium hover:bg-[#162A52] disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                {scheduling && <Loader2 size={14} className="animate-spin" />}
                設定
              </button>
              <button onClick={() => setScheduleModal(null)} disabled={scheduling} className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors">キャンセル</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
