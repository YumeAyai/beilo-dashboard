const enUS = {
 title: 'Network observation', hint: 'Network metadata across namespaces. HTTP, TLS, WebSocket and QUIC use the TCP/UDP transport shown here. These are flow events, not a complete packet capture.',
 refresh: 'Refresh network', allProtocols: 'All protocols', namespace: 'Namespace', allNamespaces: 'All namespaces', protocol: 'Protocol', state: 'Observation status', samples: 'Retained events', nodes: 'Connected nodes', gaps: 'Stream interruptions', time: 'Time', source: 'Source', destination: 'Destination', verdict: 'Verdict', cookie: 'Socket cookie', empty: 'No matching network events in the retained window.',
 coverage: 'Runtime context coverage', coverageHint: 'Configured policies observe TCP/UDP socket metadata for every Pod in that namespace, including new Pods. Native sensor loading still requires verification. Excluded namespaces retain Cilium flow observation only.',
 behaviorHint: 'To inspect behavior-to-source links, open a policy event under Event aggregation. A flow or matching Pod alone does not identify the operation that caused it.',
 available: 'Receiving events', connecting: 'Connecting', reconnecting: 'Reconnecting', degraded: 'Incomplete observation', stale: 'No recent events', unconfigured: 'Not configured', configured: 'Policies configured', excluded: 'Flow observation only', conflict: 'Policy ownership conflict', error: 'Configuration failed',
 partial: 'Some nodes unavailable', unavailable: 'Unavailable', incomplete: 'The stream has gaps or disconnected nodes. The retained sample is incomplete.', truncated: 'Only a bounded recent sample is retained; event totals are not packet or attack counts.', loadError: 'Network observations could not be loaded.',
};
type Messages = typeof enUS;
const zhCN: Messages = {
 title: '网络观测', hint: '跨命名空间的网络元数据。HTTP、TLS、WebSocket、QUIC 等会显示为其承载的 TCP/UDP；这里是网络事件，并非完整逐包抓包。',
 refresh: '刷新网络观测', allProtocols: '全部协议', namespace: '命名空间', allNamespaces: '全部命名空间', protocol: '协议', state: '观测状态', samples: '保留事件', nodes: '已连接节点', gaps: '流中断次数', time: '时间', source: '来源', destination: '目标', verdict: '网络判定', cookie: 'Socket cookie', empty: '保留时间范围内没有匹配的网络事件。',
 coverage: '运行时上下文覆盖', coverageHint: '已配置的策略观察该命名空间内所有 Pod 的 TCP/UDP socket 元数据，自动覆盖新 Pod；探针实际加载状态仍需验证。排除的命名空间仅保留 Cilium 流量观测。',
 behaviorHint: '行为与来源的关联请在“事件聚合”的策略事件中查看；仅有一条流量或相同 Pod 不能证明触发了某次行为。',
 available: '正在接收事件', connecting: '正在连接', reconnecting: '正在重连', degraded: '观测不完整', stale: '暂无近期事件', unconfigured: '未配置', configured: '策略已配置', excluded: '仅流量观测', conflict: '策略归属冲突', error: '配置失败',
 partial: '部分节点不可用', unavailable: '不可用', incomplete: '观测流存在中断或节点未连接，保留的样本不完整。', truncated: '仅保留有容量限制的近期样本，事件数不是报文数或攻击次数。', loadError: '无法加载网络观测。',
};
const zhTW: Messages = {
 title: '網路觀測', hint: '跨命名空間的網路中繼資料。HTTP、TLS、WebSocket、QUIC 等顯示為承載的 TCP/UDP；這裡是網路事件，並非完整逐包擷取。',
 refresh: '重新整理網路觀測', allProtocols: '全部協定', namespace: '命名空間', allNamespaces: '全部命名空間', protocol: '協定', state: '觀測狀態', samples: '保留事件', nodes: '已連線節點', gaps: '串流中斷次數', time: '時間', source: '來源', destination: '目標', verdict: '網路判定', cookie: 'Socket cookie', empty: '保留時間範圍內沒有符合的網路事件。',
 coverage: '執行階段上下文涵蓋範圍', coverageHint: '已設定的策略觀察該命名空間內所有 Pod 的 TCP/UDP socket 中繼資料，自動涵蓋新 Pod；探針實際載入狀態仍須驗證。排除的命名空間僅保留 Cilium 流量觀測。',
 behaviorHint: '行為與來源的關聯請在「事件彙整」的策略事件查看；單一流量或相同 Pod 無法證明觸發了某次行為。',
 available: '正在接收事件', connecting: '正在連線', reconnecting: '正在重新連線', degraded: '觀測不完整', stale: '暫無近期事件', unconfigured: '未設定', configured: '策略已設定', excluded: '僅流量觀測', conflict: '策略歸屬衝突', error: '設定失敗',
 partial: '部分節點無法使用', unavailable: '無法使用', incomplete: '觀測串流有中斷或節點未連線，保留的樣本不完整。', truncated: '僅保留有容量限制的近期樣本，事件數不是封包數或攻擊次數。', loadError: '無法載入網路觀測。',
};
const jaJP: Messages = {
 title: 'ネットワーク観測', hint: '名前空間を横断するネットワークメタデータ。HTTP、TLS、WebSocket、QUIC は使用する TCP/UDP として表示します。完全なパケットキャプチャではありません。',
 refresh: 'ネットワークを更新', allProtocols: 'すべてのプロトコル', namespace: '名前空間', allNamespaces: 'すべての名前空間', protocol: 'プロトコル', state: '観測状態', samples: '保持イベント', nodes: '接続ノード', gaps: 'ストリーム中断回数', time: '時刻', source: '送信元', destination: '宛先', verdict: 'ネットワーク判定', cookie: 'Socket cookie', empty: '保持期間内に一致するネットワークイベントはありません。',
 coverage: 'ランタイムコンテキストの対象', coverageHint: '設定済みのポリシーは名前空間内の新規 Pod を含む全 Pod の TCP/UDP socket メタデータを観測します。実際のセンサー読み込みは確認が必要です。除外した名前空間は Cilium フロー観測のみです。',
 behaviorHint: '動作と送信元の関連はイベント集約のポリシーイベントで確認できます。同じ Pod やフローだけでは原因を特定できません。',
 available: 'イベント受信中', connecting: '接続中', reconnecting: '再接続中', degraded: '観測が不完全', stale: '最近のイベントなし', unconfigured: '未設定', configured: 'ポリシー設定済み', excluded: 'フロー観測のみ', conflict: 'ポリシー所有者の競合', error: '設定失敗',
 partial: '一部ノードが利用不可', unavailable: '利用不可', incomplete: '中断または未接続ノードがあり、保持サンプルは不完全です。', truncated: '保持する最新サンプルには上限があります。イベント数はパケット数や攻撃数ではありません。', loadError: 'ネットワーク観測を読み込めません。',
};
export const runtimeNetworkLocales = { 'en-US': enUS, 'zh-CN': zhCN, 'zh-TW': zhTW, 'ja-JP': jaJP };
