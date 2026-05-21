export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#F5F6FA] py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="AIマスターラボ" className="h-12 w-auto object-contain mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-[#1E3464]">プライバシーポリシー</h1>
          <p className="text-xs text-gray-400 mt-1">最終更新日：2026年5月21日</p>
        </div>
        <div className="prose prose-sm text-gray-700 space-y-6">
          <section>
            <h2 className="text-base font-bold text-[#1E3464] mb-2">1. 収集する情報</h2>
            <p>本サービスでは以下の情報を収集します。</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>メールアドレス・お名前（登録時）</li>
              <li>Threadsアカウント情報（OAuth連携時）</li>
              <li>投稿コンテンツ・ナレッジ情報（サービス利用時）</li>
              <li>ログイン日時・利用ログ</li>
            </ul>
          </section>
          <section>
            <h2 className="text-base font-bold text-[#1E3464] mb-2">2. 情報の利用目的</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>本サービスの提供・運営</li>
              <li>ユーザーサポート・お問い合わせ対応</li>
              <li>サービスの改善・新機能の開発</li>
              <li>利用規約違反への対応</li>
            </ul>
          </section>
          <section>
            <h2 className="text-base font-bold text-[#1E3464] mb-2">3. 第三者への提供</h2>
            <p>当社は、以下の場合を除き利用者の個人情報を第三者に提供しません。</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>利用者本人の同意がある場合</li>
              <li>法令に基づく場合</li>
            </ul>
          </section>
          <section>
            <h2 className="text-base font-bold text-[#1E3464] mb-2">4. 外部サービスの利用</h2>
            <p>本サービスは以下の外部サービスを利用しています。</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Anthropic Claude API（AI文章生成）</li>
              <li>Meta Threads API（投稿・分析）</li>
              <li>Discord Webhook（通知）</li>
            </ul>
          </section>
          <section>
            <h2 className="text-base font-bold text-[#1E3464] mb-2">5. セキュリティ</h2>
            <p>当社はパスワードのハッシュ化、通信の暗号化（HTTPS）など適切な安全管理措置を講じます。</p>
          </section>
          <section>
            <h2 className="text-base font-bold text-[#1E3464] mb-2">6. 個人情報の削除</h2>
            <p>アカウントの削除を希望する場合は、管理者にお問い合わせください。</p>
          </section>
          <section>
            <h2 className="text-base font-bold text-[#1E3464] mb-2">7. プライバシーポリシーの変更</h2>
            <p>本ポリシーは予告なく変更することがあります。変更後の内容はサービス上に掲載した時点から適用されます。</p>
          </section>
        </div>
        <div className="mt-8 text-center">
          <a href="/login" className="text-sm text-[#C9A84C] hover:underline">← ログインページに戻る</a>
        </div>
      </div>
    </div>
  )
}
