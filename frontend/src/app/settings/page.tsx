'use client'
import { useEffect, useState } from 'react'
import { userSettingsApi } from '@/lib/api'
import { toast } from '@/components/Toast'
import axios from 'axios'
import { getToken } from '@/lib/auth'
import { Bell, Link, CheckCircle, Unlink, ExternalLink, Send, Save } from 'lucide-react'

export default function SettingsPage() {
  const [threadsStatus, setThreadsStatus] = useState<{ connected: boolean; username: string } | null>(null)
  const [settings, setSettings] = useState<any>(null)
  const [form, setForm] = useState({
    discord_webhook_url: '',
    buzz_likes_threshold: 500,
    buzz_multiplier: 3.0,
    monitor_interval_minutes: 30,
    notifications_enabled: true,
  })
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('connected') === 'true') toast.success('Threadsアカウントを連携しました！')
    if (params.get('error')) toast.error('連携に失敗しました。もう一度お試しください。')

    loadThreadsStatus()
    loadSettings()
  }, [])

  const loadThreadsStatus = async () => {
    try {
      const a = axios.create({ baseURL: '/api' })
      const token = getToken()
      const res = await a.get('/auth/me/threads-status', { headers: { Authorization: `Bearer ${token}` } })
      setThreadsStatus(res.data)
    } catch {}
  }

  const loadSettings = async () => {
    try {
      const data = await userSettingsApi.get()
      setSettings(data)
      setForm({
        discord_webhook_url: data.discord_webhook_url || '',
        buzz_likes_threshold: data.buzz_likes_threshold,
        buzz_multiplier: data.buzz_multiplier,
        monitor_interval_minutes: data.monitor_interval_minutes,
        notifications_enabled: data.notifications_enabled,
      })
    } catch {}
  }

  const save = async () => {
    setSaving(true)
    try {
      await userSettingsApi.update(form)
      toast.success('設定を保存しました')
    } catch {
      toast.error('保存に失敗しました')
    } finally { setSaving(false) }
  }

  const testDiscord = async () => {
    setTesting(true)
    try {
      await userSettingsApi.testDiscord()
      toast.success('テスト通知を送信しました！Discordを確認してください')
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'テスト送信に失敗しました')
    } finally { setTesting(false) }
  }

  const connectThreads = async () => {
    setConnecting(true)
    try {
      const a = axios.create({ baseURL: '/api' })
      const token = getToken()
      const res = await a.get('/auth/threads/authorize', { headers: { Authorization: `Bearer ${token}` } })
      window.location.href = res.data.url
    } catch {
      toast.error('連携URLの取得に失敗しました')
      setConnecting(false)
    }
  }

  const disconnectThreads = async () => {
    try {
      const a = axios.create({ baseURL: '/api' })
      const token = getToken()
      await a.delete('/auth/threads/disconnect', { headers: { Authorization: `Bearer ${token}` } })
      setThreadsStatus({ connected: false, username: '' })
      toast.success('Threadsアカウントの連携を解除しました')
    } catch {
      toast.error('解除に失敗しました')
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">設定</h2>
        <p className="text-sm text-gray-500 mt-1">アカウント連携と通知設定を管理します</p>
      </div>

      <div className="space-y-5 max-w-full md:max-w-2xl">

        {/* Threads OAuth */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Link size={15} className="text-[#C9A84C]" /> Threads アカウント連携
          </h3>
          {threadsStatus?.connected ? (
            <div>
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl mb-4">
                <CheckCircle size={18} className="text-green-500" />
                <div>
                  <p className="text-sm font-medium text-green-700">連携済み</p>
                  <p className="text-xs text-green-600">@{threadsStatus.username}</p>
                </div>
              </div>
              <button onClick={disconnectThreads} className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-500 rounded-xl text-sm hover:bg-red-50 transition-colors">
                <Unlink size={13} /> 連携を解除する
              </button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500 mb-4">Threadsアカウントを連携すると、自動投稿や分析が利用できます。</p>
              <button onClick={connectThreads} disabled={connecting} className="flex items-center gap-2 px-5 py-2.5 bg-[#1E3464] text-white rounded-xl text-sm font-medium hover:bg-[#162A52] disabled:opacity-50 transition-colors">
                <ExternalLink size={13} /> {connecting ? '連携中...' : 'Threadsで連携する'}
              </button>
              <p className="text-xs text-gray-400 mt-3">※ Meta Developer Appの審査が完了している必要があります</p>
            </div>
          )}
        </div>

        {/* Notification settings */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Bell size={15} className="text-[#C9A84C]" /> Discord 通知設定
          </h3>

          <div className="space-y-4">
            {/* Enable toggle */}
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-gray-700">通知を有効にする</p>
                <p className="text-xs text-gray-400 mt-0.5">バズ投稿検出時にDiscordへ通知します</p>
              </div>
              <button
                onClick={() => setForm(f => ({ ...f, notifications_enabled: !f.notifications_enabled }))}
                className={`relative inline-flex w-12 h-6 items-center rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0 ${form.notifications_enabled ? 'bg-[#1E3464]' : 'bg-gray-200'}`}
              >
                <span className={`inline-block w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ${form.notifications_enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {/* Webhook URL */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Discord Webhook URL</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C] bg-gray-50"
                  placeholder="https://discord.com/api/webhooks/..."
                  value={form.discord_webhook_url}
                  onChange={e => setForm(f => ({ ...f, discord_webhook_url: e.target.value }))}
                />
                <button
                  onClick={testDiscord}
                  disabled={testing || !form.discord_webhook_url}
                  className="px-3 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  <Send size={13} /> {testing ? '送信中' : 'テスト'}
                </button>
              </div>
            </div>

            {/* Buzz threshold */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">バズ閾値（いいね数）</label>
                <input
                  type="number"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C] bg-gray-50"
                  value={form.buzz_likes_threshold}
                  onChange={e => setForm(f => ({ ...f, buzz_likes_threshold: Number(e.target.value) }))}
                  min={1}
                />
                <p className="text-xs text-gray-400 mt-1">この件数以上でバズと判定</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">バズ倍率</label>
                <input
                  type="number"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C] bg-gray-50"
                  value={form.buzz_multiplier}
                  onChange={e => setForm(f => ({ ...f, buzz_multiplier: Number(e.target.value) }))}
                  min={1}
                  step={0.5}
                />
                <p className="text-xs text-gray-400 mt-1">平均の何倍でバズと判定</p>
              </div>
            </div>

            {/* Monitor interval */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">監視間隔（分）</label>
              <select
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C] bg-gray-50"
                value={form.monitor_interval_minutes}
                onChange={e => setForm(f => ({ ...f, monitor_interval_minutes: Number(e.target.value) }))}
              >
                <option value={15}>15分ごと</option>
                <option value={30}>30分ごと</option>
                <option value={60}>1時間ごと</option>
                <option value={180}>3時間ごと</option>
              </select>
            </div>

            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#1E3464] text-white rounded-xl text-sm font-medium hover:bg-[#162A52] disabled:opacity-50 transition-colors"
            >
              <Save size={14} /> {saving ? '保存中...' : '設定を保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
