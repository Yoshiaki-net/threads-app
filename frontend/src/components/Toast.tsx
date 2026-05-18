'use client'
import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastMessage {
  id: string
  type: ToastType
  message: string
}

let addToastFn: ((msg: Omit<ToastMessage, 'id'>) => void) | null = null

export const toast = {
  success: (message: string) => addToastFn?.({ type: 'success', message }),
  error: (message: string) => addToastFn?.({ type: 'error', message }),
  info: (message: string) => addToastFn?.({ type: 'info', message }),
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    addToastFn = ({ type, message }) => {
      const id = Math.random().toString(36).slice(2)
      setToasts(prev => [...prev, { id, type, message }])
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
    }
    return () => { addToastFn = null }
  }, [])

  const remove = (id: string) => setToasts(prev => prev.filter(t => t.id !== id))

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 space-y-2">
      {toasts.map(t => (
        <div key={t.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium min-w-[280px] max-w-sm animate-fade-in ${
          t.type === 'success' ? 'bg-white border border-green-200 text-green-700' :
          t.type === 'error' ? 'bg-white border border-red-200 text-red-600' :
          'bg-white border border-[#C9A84C]/30 text-[#1E3464]'
        }`}>
          {t.type === 'success' && <CheckCircle size={16} className="text-green-500 shrink-0" />}
          {t.type === 'error' && <XCircle size={16} className="text-red-500 shrink-0" />}
          {t.type === 'info' && <AlertCircle size={16} className="text-[#C9A84C] shrink-0" />}
          <span className="flex-1">{t.message}</span>
          <button onClick={() => remove(t.id)} className="text-gray-400 hover:text-gray-600 shrink-0">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
