export const crsBuildLocales = {
  'zh-CN': {
    notSet: '未配置', unavailable: '暂不可用',
    inventory: { unmanaged: '模块清单尚未由 Beilo 管理，当前仅可查看。', missing: '找不到已配置的模块清单。', invalid: '模块清单格式无效，请检查配置。', unavailable: '暂时无法读取模块清单，请刷新重试。', not_configured: '尚未配置模块分发清单。' },
    title: '构建与发布', selected: '默认模块', unknown: '未知', build: '构建此版本', retry: '重试构建', stage: '分发到节点', apply: '应用此版本', retained: '保留模块', switchVersion: '切换 / 回滚版本', notConfigured: '尚未配置集群构建服务。',
    explanation: '先检查更新，再通过独立 Job 构建和测试。分发保留旧版本；应用前校验所有 Envoy 节点就绪。默认模块表示配置选择，实际防护效果需通过流量验证。',
    applyHint: '将切换未固定版本入口的默认 Coraza 模块。后端会确认所有节点已下载目标产物，并检查默认版本未被其他操作修改。固定了版本的入口保持各自配置。',
    states: { pending: '等待构建', building: '构建中', failed: '构建失败', built: '构建完成', staged: '已加入分发', selected: '已选择为默认', expired: '任务已清理，未找到产物', unavailable: '状态不可用' },
  },
  'zh-TW': {
    notSet: '未設定', unavailable: '暫時無法取得',
    inventory: { unmanaged: '模組清單尚未由 Beilo 管理，目前僅供檢視。', missing: '找不到已設定的模組清單。', invalid: '模組清單格式無效，請檢查設定。', unavailable: '暫時無法讀取模組清單，請重新整理後再試。', not_configured: '尚未設定模組分發清單。' },
    title: '建置與發布', selected: '預設模組', unknown: '未知', build: '建置此版本', retry: '重試建置', stage: '分發至節點', apply: '套用此版本', retained: '保留模組', switchVersion: '切換 / 回復版本', notConfigured: '尚未設定叢集建置服務。',
    explanation: '先檢查更新，再透過獨立 Job 建置與測試。分發保留舊版本；套用前驗證所有 Envoy 節點就緒。預設模組代表設定選擇，實際防護效果需透過流量驗證。',
    applyHint: '將切換未固定版本入口的預設 Coraza 模組。後端會確認所有節點已下載目標產物，並檢查預設版本未被其他操作修改。固定版本的入口維持各自設定。',
    states: { pending: '等待建置', building: '建置中', failed: '建置失敗', built: '建置完成', staged: '已加入分發', selected: '已選為預設', expired: '任務已清理，找不到產物', unavailable: '狀態無法取得' },
  },
  'en-US': {
    notSet: 'Not configured', unavailable: 'Unavailable',
    inventory: { unmanaged: 'This module inventory is externally managed and can only be viewed.', missing: 'The configured module inventory was not found.', invalid: 'The module inventory is invalid. Check its configuration.', unavailable: 'The module inventory is temporarily unavailable. Refresh to retry.', not_configured: 'Module distribution inventory is not configured.' },
    title: 'Build and release', selected: 'Default module', unknown: 'Unknown', build: 'Build this release', retry: 'Retry build', stage: 'Distribute to nodes', apply: 'Apply this version', retained: 'Retained module', switchVersion: 'Switch / roll back version', notConfigured: 'Cluster build service is not configured.',
    explanation: 'Check for updates, then build and test in an isolated Job. Distribution retains older versions. Applying checks every Envoy node for readiness. The default module is desired configuration; traffic tests verify protection.',
    applyHint: 'This changes the default Coraza module for entries without a version pin. The server checks that every node has the artifact and that the default has not changed concurrently. Pinned entries keep their own configuration.',
    states: { pending: 'Pending', building: 'Building', failed: 'Build failed', built: 'Built', staged: 'Added to distribution', selected: 'Selected as default', expired: 'Job cleaned up; artifact missing', unavailable: 'Status unavailable' },
  },
  'ja-JP': {
    notSet: '未設定', unavailable: '取得できません',
    inventory: { unmanaged: 'このモジュール一覧は Beilo の管理対象外のため、参照のみ可能です。', missing: '設定されたモジュール一覧が見つかりません。', invalid: 'モジュール一覧の形式が無効です。設定を確認してください。', unavailable: 'モジュール一覧を取得できません。更新して再試行してください。', not_configured: 'モジュール配布一覧が未設定です。' },
    title: 'ビルドと配布', selected: '既定モジュール', unknown: '不明', build: 'このリリースをビルド', retry: 'ビルドを再試行', stage: 'ノードへ配布', apply: 'このバージョンを適用', retained: '保持済みモジュール', switchVersion: '切り替え / ロールバック', notConfigured: 'クラスタービルドサービスが未設定です。',
    explanation: '更新確認後、独立した Job でビルドとテストを実行します。旧バージョンを保持し、適用前に全 Envoy ノードの準備を確認します。既定モジュールは設定上の選択であり、防御効果は通信テストで検証します。',
    applyHint: 'バージョン未固定の入口の既定 Coraza モジュールを変更します。全ノードへの配布と、既定バージョンが他の操作で変更されていないことを確認します。固定済みの入口は各自の設定を維持します。',
    states: { pending: '待機中', building: 'ビルド中', failed: 'ビルド失敗', built: 'ビルド完了', staged: '配布対象に追加済み', selected: '既定として選択済み', expired: 'Job 削除済み・成果物なし', unavailable: '状態を取得できません' },
  },
};
