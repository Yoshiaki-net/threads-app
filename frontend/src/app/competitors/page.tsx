'use client'
import { useEffect, useState } from 'react'
import { competitorApi, postApi } from '@/lib/api'
import { Plus, Trash2, Flame, RefreshCw, Users } from 'lucide-react'
import { toast } from '@/components/Toast'

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<any[]>([])
  const [username, setUsername] = useState('')
  const [selected, setSelected] = useState<any | null>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [buzzOnly, setBuzzOnly] = useState(false)
  const [analysis, setAnalysis] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(false)
  const [removing, setRemoving] = useState<number | null>(null)

  const load = () => competitorApi.list().then(setCompetitors)
  useEffect(() => { load() }, [])

  const add = async () => {
    if (!username.trim()) return
    setLoading(true)
    try {
      await competitorApi.add(username.trim())
      toast.success(`@${username.trim()} を追加しました`)
      setUsername('')
      load()
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'アカウントの追加に失敗しました')
    } finally { setLoading(false) }
  }

  const remove = async (id: number) => {
    setRemoving(id)
    try {
      await competitorApi.remove(id)
      toast.success('アカウントを削除しました')
      load()
      if (selected?.id === id) { setSelected(null); setPosts([]) }
    } catch {
      toast.error('削除に失敗しました')
    } finally {
      setRemoving(null)
    }
  }

  const selectCompetitor = async (c: any) => {
    setSelected(c)
    const data = await competitorApi.getPosts(c.id, buzzOnly)
    setPosts(data)
  }

  const analyze = async (post: any) => {
    const { analysis: a } = await postApi.analyzeCompetitor(post.text)
    setAnalysis(prev => ({ ...prev, [post.id]: a }))
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">競合リサーチ</h2>
        <p className="text-sm text-gray-500 mt-1">競合アカウントのバズ投稿を分析しましょう</p>
      </div>

      {/* Add competitor */}
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">競合アカウントを追加</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            className="border border-gray-200 rounded-xl px-4 py-2 text-sm flex-1 sm:max-w-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C] focus:border-[#C9A84C] bg-gray-50"
            placeholder="@username を入力 (最大10件)"
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
          />
          <button
            onClick={add}
            disabled={loading || competitors.length >= 10}
            className="flex items-center justify-center gap-2 px-5 py-2 bg-[#1E3464] text-white rounded-full text-sm font-medium hover:bg-[#162A52] disabled:opacity-50 transition-colors"
          >
            <Plus size={15} /> 追加
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Competitor list */}
        <div className="space-y-2">
          {competitors.map(c => (
            <div
              key={c.id}
              onClick={() => selectCompetitor(c)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                selected?.id === c.id
                  ? 'border-[#C9A84C] bg-[#FDF8EE] shadow-sm'
                  : 'border-gray-100 bg-white hover:border-[#C9A84C] hover:shadow-sm'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1E3464] to-[#C9A84C] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {c.username?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-800">@{c.username}</p>
                    <p className="text-xs text-gray-400">{c.display_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">平均いいね: {c.avg_likes_7d.toFixed(0)}</p>
                  </div>
                </div>
                <button onClick={e => { e.stopPropagation(); remove(c.id) }} disabled={removing === c.id} className="text-gray-300 hover:text-red-400 transition-colors disabled:opacity-50">
                  <Trash2 size={14} className={removing === c.id ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
          ))}
          {competitors.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
              <div className="w-12 h-12 bg-[#EEF1F8] rounded-full flex items-center justify-center mx-auto mb-2">
                <Plus size={20} className="text-[#1E3464]" />
              </div>
              <p className="text-sm text-gray-400">競合アカウントを追加してください</p>
            </div>
          )}
        </div>

        {/* Posts panel */}
        <div className="col-span-2">
          {selected ? (
            <>
              <div className="bg-white rounded-2xl shadow-sm p-4 mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">@{selected.username} の投稿</h3>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={buzzOnly}
                    onChange={e => { setBuzzOnly(e.target.checked); selectCompetitor(selected) }}
                    className="accent-[#C9A84C]"
                  />
                  <Flame size={14} className="text-[#C9A84C]" />
                  <span className="text-gray-600">バズのみ</span>
                </label>
              </div>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {posts.map(p => (
                  <div key={p.id} className={`p-4 rounded-2xl border ${p.is_buzz ? 'border-[#C9A84C]/30 bg-[#FDF8EE]' : 'border-gray-100 bg-white'}`}>
                    {p.is_buzz && (
                      <span className="inline-flex items-center gap-1 text-xs text-[#C9A84C] font-semibold bg-[#FDF8EE] px-2 py-0.5 rounded-full mb-2">
                        <Flame size={11} /> バズ
                      </span>
                    )}
                    <p className="text-sm text-gray-700 mt-1">{p.text}</p>
                    <div className="flex gap-4 mt-2 text-xs text-gray-400">
                      <span>❤️ {p.likes_count}</span>
                      <span>💬 {p.replies_count}</span>
                      <span>🔁 {p.reposts_count}</span>
                    </div>
                    <button onClick={() => analyze(p)} className="mt-2 text-xs text-[#1E3464] hover:text-[#162A52] flex items-center gap-1 font-medium transition-colors">
                      <RefreshCw size={12} /> AI分析
                    </button>
                    {analysis[p.id] && (
                      <div className="mt-2 p-3 bg-[#EEF1F8] border border-[#1E3464]/10 rounded-xl text-xs text-gray-700 whitespace-pre-wrap">{analysis[p.id]}</div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 flex items-center justify-center h-64">
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

