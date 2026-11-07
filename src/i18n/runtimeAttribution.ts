const enUS = {
  connectionId: 'Connection ID', protocol: 'Protocol', socketInode: 'Socket inode', datagramId: 'Datagram ID', session: 'WebSocket session correlated', datagram: 'UDP datagram correlated · observed peer',
  source: 'Source / request', requestId: 'Request ID', socketCookie: 'Socket cookie', networkNamespace: 'Network namespace', executionId: 'Execution ID', threadId: 'Thread ID',
  request: 'Request correlated', connection: 'Connection only', ambiguous: 'Multiple candidates', unavailable: 'Not attributed',
  autoMode: 'Runtime IP protection', autoHint: 'Configured request models can trigger an IP block after two independently attributed high-risk operations. Ambiguous or unverified sources are excluded.',
};
type Messages = typeof enUS;
const zhCN: Messages = {
  connectionId: '连接 ID', protocol: '协议', socketInode: 'Socket inode', datagramId: '数据报 ID', session: '已关联 WebSocket 会话', datagram: '已关联 UDP 数据报 · 实际观测来源',
  source: '来源 / 请求', requestId: '请求 ID', socketCookie: 'Socket cookie', networkNamespace: '网络命名空间', executionId: '进程执行 ID', threadId: '线程 ID',
  request: '已关联请求', connection: '仅关联连接', ambiguous: '存在多个候选', unavailable: '未能归因',
  autoMode: '运行时 IP 防护', autoHint: '已配置的请求执行模型中，同一来源的两次独立高危行为可触发 IP 封禁；存在歧义或来源未经验证时不封禁。',
};
const zhTW: Messages = {
  connectionId: '連線 ID', protocol: '協定', socketInode: 'Socket inode', datagramId: '資料報 ID', session: '已關聯 WebSocket 工作階段', datagram: '已關聯 UDP 資料報 · 實際觀測來源',
  source: '來源 / 請求', requestId: '請求 ID', socketCookie: 'Socket cookie', networkNamespace: '網路命名空間', executionId: '程序執行 ID', threadId: '執行緒 ID',
  request: '已關聯請求', connection: '僅關聯連線', ambiguous: '存在多個候選', unavailable: '無法歸因',
  autoMode: '執行階段 IP 防護', autoHint: '已設定的請求執行模型中，同一來源的兩次獨立高風險行為可觸發 IP 封鎖；存在歧義或來源未經驗證時不封鎖。',
};
const jaJP: Messages = {
  connectionId: '接続 ID', protocol: 'プロトコル', socketInode: 'Socket inode', datagramId: 'データグラム ID', session: 'WebSocket セッション関連付け済み', datagram: 'UDP データグラム関連付け済み · 観測した送信元',
  source: '送信元 / リクエスト', requestId: 'リクエスト ID', socketCookie: 'Socket cookie', networkNamespace: 'ネットワーク名前空間', executionId: 'プロセス実行 ID', threadId: 'スレッド ID',
  request: 'リクエスト関連付け済み', connection: '接続のみ', ambiguous: '複数の候補', unavailable: '関連付け不可',
  autoMode: 'ランタイム IP 防御', autoHint: '設定済みのリクエスト実行モデルでは、同じ送信元に関連付いた独立した高リスク動作が2回発生すると IP を遮断できます。候補が曖昧、または送信元が未検証の場合は遮断しません。',
};
export const runtimeAttributionLocales = { 'en-US': enUS, 'zh-CN': zhCN, 'zh-TW': zhTW, 'ja-JP': jaJP };
