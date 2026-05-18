'use client'
import { useEffect, useState } from 'react'
import { knowledgeApi } from '@/lib/api'
import { Plus, Save, Trash2, FolderDown, BookOpen } from 'lucide-react'
import { toast } from '@/components/Toast'

const TONES = ['professional', 'casual', 'friendly', 'educational', 'inspirational', 'humorous']

export default function KnowledgePage() {
  const [items, setItems] = useState<any[]>([])
  const [selected, setSelected] = useState<any | null>(null)
  const [form, setForm] = useState({ title: '', content: '', tone: 'professional', topics: '' })
  const [isNew, setIsNew] = useState(false)
  const [importing, setImporting] = useState(false)

  const load = () => knowledgeApi.list().then(setItems)
  useEffect(() => { load() }, [])

  const startNew = () => {
    setSelected(null)
    setIsNew(true)
    setForm({ title: '', content: '', tone: 'professional', topics: '' })
  }

  const select = (item: any) => {
    setSelected(item)
    setIsNew(false)
    setForm({ title: item.title, content: item.content, tone: item.tone, topics: item.topics })
  }

  const save = async () => {
    try {
      if (isNew) {
        const created = await knowledgeApi.create(form)
        setItems(prev => [...prev, created])
        select(created)
        setIsNew(false)
      } else if (selected) {
        const updated = await knowledgeApi.update(selected.id, form)
        setItems(prev => prev.map(i => i.id === updated.id ? updated : i))
        setSelected(updated)
      }
      toast.success('保存しました')
    } catch (e: any) {
      toast.error(e.response?.data?.detail || '保存に失敗しました')
    }
  }

  const importObsidian = async () => {
    setImporting(true)
    try {
      const result = await knowledgeApi.importObsidian()
      toast.success(`${result.imported}件のナレッジをインポートしました`)
      load()
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'インポートに失敗しました')
    } finally { setImporting(false) }
  }

  const remove = async (id: number) => {
    try {
      await knowledgeApi.delete(id)
      toast.success('削除しました')
      load()
      if (selected?.id === id) { setSelected(null); setIsNew(false) }
    } catch (e: any) {
      toast.error(e.response?.data?.detail || '削除に失敗しました')
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">ナレッジ設定</h2>
        <p className="text-sm text-gray-500 mt-1">AI投稿生成に使うナレッジを管理します</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Left panel */}
        <div>
          <button
            onClick={startNew}
            className="w-full flex items-center justify-center gap-2 mb-2 px-4 py-2.5 bg-[#1E3464] text-white rounded-xl text-sm font-medium hover:bg-[#162A52] transition-colors"
          >
            <Plus size={16} /> 新規作成
          </button>
          <button
            onClick={importObsidian}
            disabled={importing}
            className="w-full flex items-center justify-center gap-2 mb-4 px-4 py-2.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50 transition-colors"
          >
            <FolderDown size={16} /> {importing ? 'インポート中...' : 'Obsidianから一括インポート'}
          </button>

          <div className="space-y-2">
            {items.map(item => (
              <div
                key={item.id}
                onClick={() => select(item)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  selected?.id === item.id
                    ? 'border-[#C9A84C] bg-[#FDF8EE]'
                    : 'border-gray-100 bg-white hover:border-[#C9A84C] hover:shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium truncate text-gray-800">{item.title}</span>
                  <button onClick={e => { e.stopPropagation(); remove(item.id) }} className="text-gray-300 hover:text-red-400 ml-2 transition-colors">
                    <Trash2 size={12} />
                  </button>
                </div>
                <span className="text-xs text-gray-400 mt-0.5 block">{item.tone}</span>
              </div>
            ))}
            {items.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">ナレッジがまだありません</p>
            )}
          </div>
        </div>

        {/* Right editor panel */}
        <div className="col-span-2">
          {(selected || isNew) ? (
            <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
              <input
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C] focus:border-[#C9A84C] bg-gray-50"
                placeholder="タイトル"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">投稿トーン</label>
                <select
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C] focus:border-[#C9A84C] bg-gray-50"
                  value={form.tone}
                  onChange={e => setForm(f => ({ ...f, tone: e.target.value }))}
                >
                  {TONES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">トピック (カンマ区切り)</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C] focus:border-[#C9A84C] bg-gray-50"
                  placeholder="例: マーケティング, AI, スタートアップ"
                  value={form.topics}
                  onChange={e => setForm(f => ({ ...f, topics: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">ナレッジコンテンツ</label>
                <textarea
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C] focus:border-[#C9A84C] bg-gray-50 min-h-[200px]"
                  placeholder="投稿生成に使用するナレッジ・背景情報・スタイルガイドなどを入力してください..."
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                />
              </div>
              <button
                onClick={save}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#1E3464] text-white rounded-xl text-sm font-medium hover:bg-[#162A52] transition-colors"
              >
                <Save size={16} /> 保存
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-14 h-14 bg-[#EEF1F8] rounded-full flex items-center justify-center mx-auto mb-3">
                  <BookOpen size={22} className="text-[#C9A84C]" />
                </div>
                <p className="text-gray-400 text-sm">ナレッジを選択または新規作成してください</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

