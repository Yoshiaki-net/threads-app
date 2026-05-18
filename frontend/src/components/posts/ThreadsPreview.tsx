import { Heart, MessageCircle, Repeat2, Send, MoreHorizontal } from 'lucide-react'
import { getUser } from '@/lib/auth'

interface ThreadsPreviewProps {
  content: string
  username?: string
}

export default function ThreadsPreview({ content, username }: ThreadsPreviewProps) {
  const user = getUser()
  const displayName = username || user?.name || 'あなた'
  const handle = displayName.toLowerCase().replace(/\s+/g, '_')
  const now = new Date()
  const timeStr = `${now.getMonth() + 1}月${now.getDate()}日`

  const lines = content.split('\n')

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 max-w-md font-sans">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1E3464] to-[#C9A84C] flex items-center justify-center text-white text-sm font-bold shrink-0">
            {displayName[0]?.toUpperCase() || 'A'}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{displayName}</p>
            <p className="text-xs text-gray-400">@{handle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{timeStr}</span>
          <button className="text-gray-400">
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="text-sm text-gray-900 mb-4 leading-relaxed whitespace-pre-wrap break-words">
        {lines.map((line, i) => {
          // Highlight hashtags
          const parts = line.split(/(#\S+)/g)
          return (
            <p key={i} className={i > 0 && line === '' ? 'mt-2' : ''}>
              {parts.map((part, j) =>
                part.startsWith('#') ? (
                  <span key={j} className="text-blue-500">{part}</span>
                ) : (
                  <span key={j}>{part}</span>
                )
              )}
            </p>
          )
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-5 text-gray-400">
        <button className="flex items-center gap-1.5 hover:text-red-400 transition-colors">
          <Heart size={18} />
          <span className="text-xs">0</span>
        </button>
        <button className="flex items-center gap-1.5 hover:text-blue-400 transition-colors">
          <MessageCircle size={18} />
          <span className="text-xs">0</span>
        </button>
        <button className="flex items-center gap-1.5 hover:text-green-400 transition-colors">
          <Repeat2 size={18} />
          <span className="text-xs">0</span>
        </button>
        <button className="flex items-center gap-1.5 hover:text-[#C9A84C] transition-colors">
          <Send size={18} />
        </button>
      </div>

      {/* Thread line */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-400">プレビュー — 実際の投稿とは異なる場合があります</p>
      </div>
    </div>
  )
}
