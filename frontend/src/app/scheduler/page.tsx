'use client'
import { useEffect, useState } from 'react'
import { schedulerApi } from '@/lib/api'
import { Trash2, Clock } from 'lucide-react'
import { toast } from '@/components/Toast'

export default function SchedulerPage() {
  const [scheduled, setScheduled] = useState<any[]>([])

  const load = () => schedulerApi.listScheduled().then(setScheduled)
  useEffect(() => { load() }, [])

  const cancel = async (id: number) => {
    try {
      await schedulerApi.cancel(id)
      toast.success('スケジュールをキャンセルしました')
      load()
    } catch {
      toast.error('キャンセルに失敗しました')
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">スケジューラ</h2>
        <p className="text-sm text-gray-500 mt-1">投稿ライブラリからスケジュール設定できます。30分ごとに競合監視も自動実行されます。</p>
      </div>

      {scheduled.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-14 text-center">
          <div className="w-16 h-16 bg-[#EEF1F8] rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock size={28} className="text-[#C9A84C]" />
          </div>
          <p className="text-gray-600 text-sm font-medium">スケジュール済みの投稿はありません</p>
          <p className="text-gray-400 text-xs mt-1.5">「投稿ライブラリ」からスケジュールを設定してください</p>
        </div>
      ) : (
        <div className="space-y-3">
          {scheduled.map(post => (
            <div key={post.id} className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="inline-flex items-center gap-1.5 bg-[#FDF8EE] text-[#C9A84C] text-xs font-semibold px-3 py-1 rounded-full mb-3 flex-wrap">
                    <Clock size={11} />
                    <span>{new Date(post.scheduled_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{post.content}</p>
                </div>
                <button
                  onClick={() => cancel(post.id)}
                  className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 mt-1"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
