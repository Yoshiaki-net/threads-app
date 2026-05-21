export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#F5F6FA] py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="AIマスターラボ" className="h-12 w-auto object-contain mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-[#1E3464]">利用規約</h1>
          <p className="text-xs text-gray-400 mt-1">最終更新日：2026年5月21日</p>
        </div>
        <div className="prose prose-sm text-gray-700 space-y-6">
          <section>
            <h2 className="text-base font-bold text-[#1E3464] mb-2">第1条（適用）</h2>
            <p>本規約は、AIマスターラボ（以下「当社」）が提供するThreads自動化ツール（以下「本サービス」）の利用条件を定めるものです。利用者は本規約に同意の上、本サービスをご利用ください。</p>
          </section>
          <section>
            <h2 className="text-base font-bold text-[#1E3464] mb-2">第2条（利用登録）</h2>
            <p>本サービスの利用を希望する方は、当社の定める方法によって利用登録を申請し、当社がこれを承認することで利用登録が完了します。</p>
          </section>
          <section>
            <h2 className="text-base font-bold text-[#1E3464] mb-2">第3条（禁止事項）</h2>
            <p>利用者は以下の行為を行ってはなりません。</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>法令または公序良俗に違反する行為</li>
              <li>他の利用者または第三者の権利・利益を侵害する行為</li>
              <li>本サービスの運営を妨げる行為</li>
              <li>スパムや誹謗中傷などの不適切なコンテンツの投稿</li>
              <li>Threadsの利用規約に違反する行為</li>
              <li>その他、当社が不適切と判断する行為</li>
            </ul>
          </section>
          <section>
            <h2 className="text-base font-bold text-[#1E3464] mb-2">第4条（本サービスの提供の停止等）</h2>
            <p>当社は、以下の場合、利用者への事前通知なく本サービスの全部または一部の提供を停止・中断することができます。システムメンテナンス、不可抗力による障害、その他当社が必要と判断した場合。</p>
          </section>
          <section>
            <h2 className="text-base font-bold text-[#1E3464] mb-2">第5条（免責事項）</h2>
            <p>当社は本サービスの利用により生じた損害について、一切の責任を負いません。本サービスはAIを活用した自動化ツールであり、生成コンテンツの正確性・適切性を保証するものではありません。</p>
          </section>
          <section>
            <h2 className="text-base font-bold text-[#1E3464] mb-2">第6条（サービス内容の変更等）</h2>
            <p>当社は利用者への通知なく本サービスの内容を変更・廃止できます。これにより生じた損害について責任を負いません。</p>
          </section>
          <section>
            <h2 className="text-base font-bold text-[#1E3464] mb-2">第7条（準拠法・裁判管轄）</h2>
            <p>本規約の解釈には日本法を適用し、紛争については東京地方裁判所を専属的合意管轄とします。</p>
          </section>
        </div>
        <div className="mt-8 text-center">
          <a href="/login" className="text-sm text-[#C9A84C] hover:underline">← ログインページに戻る</a>
        </div>
      </div>
    </div>
  )
}
