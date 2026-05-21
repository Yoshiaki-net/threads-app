'use client'
import { useEffect, useState } from 'react'
import { adminApi, authApi } from '@/lib/api'
import { toast } from '@/components/Toast'
import { Users, FileText, BookOpen, TrendingUp, Shield, ShieldOff, UserX, RefreshCw, Link2, Trash2, KeyRound, Copy } from 'lucide-react'

export default function AdminPage() {
  const [users, setUsers] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [invites, setInvites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [resetModal, setResetModal] = useState<any>(null)
  const [newPassword, setNewPassword] = useState('')
  const [frontendUrl, setFrontendUrl] = useState('')

  useEffect(() => {
    setFrontendUrl(window.location.origin)
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const [u, s, inv] = await Promise.all([adminApi.listUsers(), adminApi.getStats(), adminApi.listInvites()])
      setUsers(u); setStats(s); setInvites(inv)
    } catch { toast.error('管理者権限が必要です') }
    finally { setLoading(false) }
  }

  const toggleAdmin = async (id: number) => {
    try { await adminApi.toggleAdmin(id); toast.success('権限を更新しました'); load() }
    catch { toast.error('更新に失敗しました') }
  }

  const toggleActive = async (id: number) => {
    try { await adminApi.toggleActive(id); toast.success('ステータスを更新しました'); load() }
    catch { toast.error('更新に失敗しました') }
  }

  const deleteUser = async (id: number, email: string) => {
    if (!confirm(`${email} を削除しますか？`)) return
    try { await adminApi.deleteUser(id); toast.success('削除しました'); load() }
    catch { toast.error('削除に失敗しました') }
  }

  const resetPassword = async () => {
    if (!resetModal || newPassword.length < 6) return toast.error('6文字以上入力してください')
    try {
      await adminApi.resetPassword(resetModal.id, newPassword)
      toast.success(`${resetModal.email} のパスワードをリセットしました`)
      setResetModal(null); setNewPassword('')
    } catch { toast.error('リセットに失敗しました') }
  }

  const createInvite = async () => {
    try {
      const inv = await adminApi.createInvite()
      toast.success('招待リンクを作成しました')
      load()
    } catch { toast.error('作成に失敗しました') }
  }

  const copyInviteLink = (code: string) => {
    const url = `${frontendUrl}/login?invite=${code}`
    navigator.clipboard.writeText(url)
    toast.success('招待リンクをコピーしました')
  }

  const deleteInvite = async (id: number) => {
    try { await adminApi.deleteInvite(id); load() }
    catch { toast.error('削除に失敗しました') }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-8 h-8 border-4 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">管理者ダッシュボード</h2>
          <p className="text-sm text-gray-500 mt-1">ユーザー管理・招待リンク発行</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-xl text-sm hover:bg-gray-200 transition-colors">
          <RefreshCw size={14} /> 更新
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: '登録ユーザー', value: stats.total_users, icon: Users, color: '#1E3464' },
            { label: '総投稿数', value: stats.total_posts, icon: FileText, color: '#C9A84C' },
            { label: '公開済み', value: stats.published_posts, icon: TrendingUp, color: '#10b981' },
            { label: 'ナレッジ', value: stats.total_knowledge, icon: BookOpen, color: '#8b5cf6' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: s.color + '20' }}>
                  <s.icon size={20} style={{ color: s.color }} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invite codes */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 text-sm">招待リンク管理</h3>
          <button onClick={createInvite} className="flex items-center gap-2 px-3 py-2 bg-[#1E3464] text-white rounded-xl text-xs font-medium hover:bg-[#162A52] transition-colors">
            <Link2 size={12} /> 招待リンクを発行
          </button>
        </div>
        {invites.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">招待リンクがありません</p>
        ) : (
          <div className="space-y-2">
            {invites.map(inv => (
              <div key={inv.id} className={`flex items-center justify-between p-3 rounded-xl border ${inv.used ? 'bg-gray-50 border-gray-100' : 'bg-[#EEF1F8] border-[#1E3464]/10'}`}>
                <div>
                  <code className="text-xs font-mono text-gray-700">{inv.code}</code>
                  {inv.used && <span className="ml-2 text-xs text-gray-400">使用済み: {inv.used_by_email}</span>}
                  {!inv.used && <span className="ml-2 text-xs text-green-600 font-medium">未使用</span>}
                </div>
                <div className="flex gap-2">
                  {!inv.used && (
                    <button onClick={() => copyInviteLink(inv.code)} className="p-1.5 rounded-lg hover:bg-white transition-colors" title="リンクをコピー">
                      <Copy size={13} className="text-[#1E3464]" />
                    </button>
                  )}
                  <button onClick={() => deleteInvite(inv.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                    <Trash2 size={13} className="text-gray-300 hover:text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User list */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800 text-sm">ユーザー一覧 ({users.length}名)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs">
                <th className="text-left px-4 py-3 font-medium">ユーザー</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">登録日</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">最終ログイン</th>
                <th className="text-center px-4 py-3 font-medium">投稿</th>
                <th className="text-center px-4 py-3 font-medium hidden md:table-cell">公開</th>
                <th className="text-center px-4 py-3 font-medium">Threads</th>
                <th className="text-center px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(u => (
                <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${!u.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ background: 'linear-gradient(135deg, #1E3464, #C9A84C)' }}>
                        {(u.name || u.email)[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 flex items-center gap-1 flex-wrap">
                          {u.name || u.email.split('@')[0]}
                          {u.is_admin && <span className="text-xs bg-[#1E3464] text-white px-1.5 py-0.5 rounded-full">管理者</span>}
                          {!u.is_active && <span className="text-xs bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full">無効</span>}
                        </div>
                        <div className="text-xs text-gray-400">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('ja-JP') : '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">
                    {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString('ja-JP') : '-'}
                  </td>
                  <td className="px-4 py-3 text-center font-medium text-gray-700">{u.post_count}</td>
                  <td className="px-4 py-3 text-center text-green-600 hidden md:table-cell">{u.published_count}</td>
                  <td className="px-4 py-3 text-center">
                    {u.threads_connected
                      ? <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">連携済</span>
                      : <span className="text-xs bg-gray-100 text-gray-400 px-2 py-1 rounded-full">未連携</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => { setResetModal(u); setNewPassword('') }} title="パスワードリセット"
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                        <KeyRound size={13} className="text-gray-400 hover:text-[#1E3464]" />
                      </button>
                      <button onClick={() => toggleAdmin(u.id)} title={u.is_admin ? '管理者解除' : '管理者にする'}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                        {u.is_admin ? <ShieldOff size={13} className="text-[#1E3464]" /> : <Shield size={13} className="text-gray-300 hover:text-[#1E3464]" />}
                      </button>
                      <button onClick={() => toggleActive(u.id)}
                        className={`text-xs px-2 py-1 rounded-lg transition-colors ${u.is_active ? 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500' : 'bg-green-100 text-green-600'}`}>
                        {u.is_active ? '無効' : '有効'}
                      </button>
                      <button onClick={() => deleteUser(u.id, u.email)}
                        className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                        <UserX size={13} className="text-gray-300 hover:text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Password reset modal */}
      {resetModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-gray-900 mb-1">パスワードリセット</h3>
            <p className="text-xs text-gray-500 mb-4">{resetModal.email}</p>
            <input
              type="password"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-[#C9A84C] bg-gray-50"
              placeholder="新しいパスワード（6文字以上）"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
            <div className="flex gap-2">
              <button onClick={resetPassword} className="flex-1 py-2.5 bg-[#1E3464] text-white rounded-xl text-sm font-medium hover:bg-[#162A52] transition-colors">
                リセット
              </button>
              <button onClick={() => setResetModal(null)} className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
