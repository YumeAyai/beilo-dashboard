// Shared policy controls used by the dedicated runtime protection page.
const zhTW = {
  namespace: '命名空間', createPolicy: '新增策略', editPolicy: '編輯執行階段策略', policyName: '策略名稱', policyKind: '策略類型', execKind: '程式執行', fileKind: '開啟檔案',
  podLabels: '目標 Pod 標籤', labelsHint: '每行一個 key=value，至少一項；所有條件須同時符合。', executables: '可執行檔絕對路徑', files: '檔案絕對路徑', pathsHint: '每行一個完整絕對路徑，最多 {{limit}} 項。',
  enforceSwitch: '拒絕符合條件的操作', enforceHint: '儲存後將請求拒絕所選 Pod 的符合操作，請確認標籤與路徑。', observeHint: '僅觀察，不拒絕操作。', acceptanceHint: '設定提交成功不代表節點已載入或已阻擋。目前介面尚未確認節點執行狀態。',
  validation: { namespace: '請輸入有效命名空間。', name: '名稱僅支援小寫字母、數字、連字號及點。', labels: '請至少填寫一個明確且不重複的標籤，每行 key=value。', paths: '請填寫有效絕對路徑，避免相對路徑及超出數量限制。' },
  policies: '命名空間策略', policySaved: '策略操作已完成，請確認節點狀態與實際行為。', noPolicies: '命名空間 {{namespace}} 尚無策略。', policyTruncated: '僅回傳此命名空間的前 200 條策略。', scope: 'Pod 作用範圍', paths: '路徑', mode: '設定模式', execution: '節點執行', actions: '操作', managed: 'Beilo 管理', external: '外部管理 · 唯讀',
  kinds: { exec: '執行', file: '檔案', custom: '自訂' }, enforce: '請求阻擋', observe: '僅觀察', deletePolicy: '刪除執行階段策略', deleteHint: '刪除將移除此策略的偵測與拒絕設定。', fetchError: '資料取得失敗',
};
const jaJP: Record<keyof typeof zhTW, string | Record<string, string>> = {
  namespace: '名前空間', createPolicy: 'ポリシーを作成', editPolicy: 'ランタイムポリシーを編集', policyName: 'ポリシー名', policyKind: 'ポリシー種別', execKind: 'プログラム実行', fileKind: 'ファイルを開く',
  podLabels: '対象 Pod ラベル', labelsHint: '1 行に key=value を 1 つ以上入力してください。すべての条件が一致する必要があります。', executables: '実行ファイルの絶対パス', files: 'ファイルの絶対パス', pathsHint: '1 行に完全な絶対パスを入力してください。最大 {{limit}} 件。',
  enforceSwitch: '一致する操作を拒否', enforceHint: '保存すると、選択した Pod の一致する操作の拒否を要求します。ラベルとパスを確認してください。', observeHint: '観測のみで、操作を拒否しません。', acceptanceHint: '送信成功はノードでの読み込みや遮断の確認を意味しません。この API はノードでの実行状態を確認していません。',
  validation: { namespace: '有効な名前空間を入力してください。', name: '小文字、数字、ハイフン、ドットを使用してください。', labels: '明示的なラベルを 1 つ以上、キーが重複しないよう 1 行に key=value で入力してください。', paths: '件数制限内の有効な絶対パスを入力してください。相対パスは使用できません。' },
  policies: '名前空間のポリシー', policySaved: 'ポリシー操作が完了しました。ノード状態と実際の動作を確認してください。', noPolicies: '名前空間 {{namespace}} にポリシーはありません。', policyTruncated: 'この名前空間の最初の 200 件のみ返されます。', scope: '対象 Pod', paths: 'パス', mode: '設定モード', execution: 'ノードでの実行', actions: '操作', managed: 'Beilo 管理', external: '外部管理 · 読み取り専用',
  kinds: { exec: '実行', file: 'ファイル', custom: 'カスタム' }, enforce: '拒否を要求', observe: '観測のみ', deletePolicy: 'ランタイムポリシーを削除', deleteHint: '削除すると、このポリシーの検出と拒否の設定が解除されます。', fetchError: 'データを取得できません',
};

export const runtimePolicyLocales = { 'zh-TW': zhTW, 'ja-JP': jaJP };
