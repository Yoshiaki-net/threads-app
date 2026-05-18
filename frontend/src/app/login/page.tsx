'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api'
import { setToken, setUser } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')

  const submit = async () => {
    setError('')
    setLoading(true)
    try {
      const res = mode === 'login'
        ? await authApi.login(email, password)
        : await authApi.register(email, password, name)
      setToken(res.access_token)
      setUser(res.user)
      window.location.href = '/'
    } catch (e: any) {
      setError(e.response?.data?.detail || 'エラーが発生しました')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center p-4 w-full">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-md p-8">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="AIマスターラボ" className="h-16 w-auto object-contain mx-auto mb-4" />
          <h1 className="text-xl font-bold text-[#1E3464]">Threads 自動化ツール</h1>
          <p className="text-sm text-gray-400 mt-1">{mode === 'login' ? 'アカウントにログイン' : '新規アカウント作成'}</p>
        </div>

        <div className="space-y-3">
          {mode === 'register' && (
            <input
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C] bg-gray-50"
              placeholder="お名前"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          )}
          <input
            type="email"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C] bg-gray-50"
            placeholder="メールアドレス"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <input
            type="password"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C] bg-gray-50"
            placeholder="パスワード"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
          />
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button
            onClick={submit}
            disabled={loading}
            className="w-full py-3 bg-[#1E3464] text-white rounded-xl text-sm font-medium hover:bg-[#162A52] disabled:opacity-50 transition-colors"
          >
            {loading ? '処理中...' : mode === 'login' ? 'ログイン' : 'アカウント作成'}
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          {mode === 'login' ? 'アカウントをお持ちでない方は' : 'すでにアカウントをお持ちの方は'}
          <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-[#C9A84C] font-medium ml-1 hover:underline">
            {mode === 'login' ? '新規登録' : 'ログイン'}
          </button>
        </p>
      </div>
    </div>
  )
}
