'use client'
import { useState, useEffect } from 'react'
import { authApi } from '@/lib/api'
import { setToken, setUser } from '@/lib/auth'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [inviteOnly, setInviteOnly] = useState(false)
  const [agreed, setAgreed] = useState(false)

  useEffect(() => {
    authApi.inviteOnlyStatus().then(r => setInviteOnly(r.invite_only)).catch(() => {})
    // Check for invite code in URL
    const params = new URLSearchParams(window.location.search)
    const code = params.get('invite')
    if (code) { setInviteCode(code); setMode('register') }
  }, [])

  const submit = async () => {
    setError('')
    if (mode === 'register' && !agreed) {
      setError('利用規約とプライバシーポリシーへの同意が必要です')
      return
    }
    setLoading(true)
    try {
      const res = mode === 'login'
        ? await authApi.login(email, password)
        : await authApi.register(email, password, name, inviteCode)
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
            placeholder="パスワード（6文字以上）"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
          />
          {mode === 'register' && (inviteOnly || inviteCode) && (
            <input
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C] bg-gray-50"
              placeholder="招待コード"
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value)}
            />
          )}
          {mode === 'register' && (
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                className="mt-0.5 accent-[#1E3464]"
              />
              <span className="text-xs text-gray-500">
                <Link href="/terms" target="_blank" className="text-[#C9A84C] hover:underline">利用規約</Link>
                {' '}および{' '}
                <Link href="/privacy" target="_blank" className="text-[#C9A84C] hover:underline">プライバシーポリシー</Link>
                に同意します
              </span>
            </label>
          )}
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
          <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }} className="text-[#C9A84C] font-medium ml-1 hover:underline">
            {mode === 'login' ? '新規登録' : 'ログイン'}
          </button>
        </p>
      </div>
    </div>
  )
}
