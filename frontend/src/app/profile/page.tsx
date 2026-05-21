'use client'
import { useEffect, useState } from 'react'
import { authApi, userSettingsApi } from '@/lib/api'
import { getUser, saveUser } from '@/lib/auth'
import { User, Lock, Bell, Mail, BarChart2, Check, Loader2 } from 'lucide-react'
import { toast } from '@/components/Toast'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [name, setName] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [savingPw, setSavingPw] = useState(false)

  const [settings, setSettings] = useState<any>(null)
  const [notifEmail, setNotifEmail] = useState('')
  const [emailEnabled, setEmailEnabled] = useState(false)
  const [weeklyEnabled, setWeeklyEnabled] = useState(false)
  const [savingNotif, setSavingNotif] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)

  useEffect(() => {
    const u = getUser()
    if (u) { setUser(u); setName(u.name || '') }
    userSettingsApi.get().then(s => {
      setSettings(s)
      setNotifEmail(s.notification_email || '')
      setEmailEnabled(s.email_notifications_enabled || false)
      setWeeklyEnabled(s.weekly_report_enabled || false)
    })
  }, [])

  const saveProfile = async () => {
    if (!name.trim()) return toast.error('名前を入力してください')
    setSavingProfile(true)
    try {
      const updated = await authApi.updateProfile(name.trim())
      saveUser({ ...user, name: updated.name })
      setUser({ ...user, name: updated.name })
      toast.success('プロフィールを更新しました')
    } catch (e: any) {
      toast.error(e.response?.data?.detail || '更新に失敗しました')
    } finally { setSavingProfile(false) }
  }

  const changePassword = async () => {
    if (!currentPw || !newPw) return toast.error('パスワードを入力してください')
    if (newPw !== confirmPw) return toast.error('新しいパスワードが一致しません')
    if (newPw.length < 8) return toast.error('パスワードは8文字以上にしてください')
    setSavingPw(true)
    try {
      await authApi.changePassword(currentPw, newPw)
      toast.success('パスワードを変更しました')
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'パスワード変更に失敗しました')
    } finally { setSavingPw(false) }
  }

  const saveNotifications = async () => {
    setSavingNotif(true)
    try {
      await userSettingsApi.update({
        email_notifications_enabled: emailEnabled,
        notification_email: notifEmail,
        weekly_report_enabled: weeklyEnabled,
      })
      toast.success('通知設定を保存しました')
    } catch {
      toast.error('保存に失敗しました')
    } finally { setSavingNotif(false) }
  }

  const testEmail = async () => {
    setTestingEmail(true)
    try {
      await userSettingsApi.testEmail()
      toast.success('テストメールを送信しました')
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'メール送信に失敗しました。SMTP設定を確認してください')
    } finally { setTestingEmail(false) }
  }

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0 ${checked ? 'bg-[#1E3464]' : 'bg-gray-200'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">プロフィール設定</h2>
        <p className="text-sm text-gray-500 mt-0.5">アカウント情報・パスワード・通知の設定</p>
      </div>

      {/* Profile */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <User size={16} className="text-[#1E3464]" />
          <h3 className="font-semibold text-gray-800">プロフィール</h3>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">メールアドレス</label>
            <input
              disabled
              value={user?.email || ''}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-400"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">表示名</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C] bg-gray-50"
              placeholder="あなたの名前"
            />
          </div>
          <button
            onClick={saveProfile}
            disabled={savingProfile}
            className="flex items-center gap-2 px-5 py-2 bg-[#1E3464] text-white rounded-full text-sm font-medium hover:bg-[#162A52] disabled:opacity-50 transition-colors"
          >
            {savingProfile ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            保存する
          </button>
        </div>
      </div>

      {/* Password */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock size={16} className="text-[#1E3464]" />
          <h3 className="font-semibold text-gray-800">パスワード変更</h3>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">現在のパスワード</label>
            <input
              type="password"
              value={currentPw}
              onChange={e => setCurrentPw(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C] bg-gray-50"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">新しいパスワード（8文字以上）</label>
            <input
              type="password"
              value={newPw}
              onChange={e => setNewPw(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C] bg-gray-50"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">新しいパスワード（確認）</label>
            <input
              type="password"
              value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C] bg-gray-50"
              placeholder="••••••••"
              onKeyDown={e => e.key === 'Enter' && changePassword()}
            />
          </div>
          <button
            onClick={changePassword}
            disabled={savingPw}
            className="flex items-center gap-2 px-5 py-2 bg-[#C9A84C] text-white rounded-full text-sm font-medium hover:bg-[#b8963e] disabled:opacity-50 transition-colors"
          >
            {savingPw ? <Loader2 size={13} className="animate-spin" /> : <Lock size={13} />}
            パスワードを変更
          </button>
        </div>
      </div>

      {/* Email notifications */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell size={16} className="text-[#1E3464]" />
          <h3 className="font-semibold text-gray-800">メール通知設定</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">通知先メールアドレス</label>
            <input
              type="email"
              value={notifEmail}
              onChange={e => setNotifEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C] bg-gray-50"
              placeholder="notification@example.com"
            />
            <p className="text-xs text-gray-400 mt-1">空白の場合はアカウントのメールアドレスを使用</p>
          </div>

          <div className="flex items-center justify-between py-2 border-t border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <Bell size={13} className="text-[#C9A84C]" /> バズ検出通知
              </p>
              <p className="text-xs text-gray-400 mt-0.5">バズ投稿を検出した時にメールで通知</p>
            </div>
            <Toggle checked={emailEnabled} onChange={setEmailEnabled} />
          </div>

          <div className="flex items-center justify-between py-2 border-t border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <BarChart2 size={13} className="text-[#C9A84C]" /> 週次レポート
              </p>
              <p className="text-xs text-gray-400 mt-0.5">毎週月曜朝9時に競合レポートをメール送信</p>
            </div>
            <Toggle checked={weeklyEnabled} onChange={setWeeklyEnabled} />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={saveNotifications}
              disabled={savingNotif}
              className="flex items-center gap-2 px-5 py-2 bg-[#1E3464] text-white rounded-full text-sm font-medium hover:bg-[#162A52] disabled:opacity-50 transition-colors"
            >
              {savingNotif ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              保存する
            </button>
            <button
              onClick={testEmail}
              disabled={testingEmail}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 rounded-full text-sm font-medium hover:border-[#1E3464] hover:text-[#1E3464] disabled:opacity-50 transition-colors"
            >
              {testingEmail ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
              テスト送信
            </button>
          </div>
          <p className="text-xs text-gray-400">※ メール送信にはSMTP設定が必要です（管理者に確認してください）</p>
        </div>
      </div>
    </div>
  )
}
