# 邮件模板

模板源码、版式、文案与品牌素材由本前端仓库交付。后端不内置模板文件，使用现有 `Store` 读取已保存模板，再填入通知事件数据、构造 MIME 并交给原 SMTP 发送管线。

## 文件与入口

- 控制台：**设置 → 邮件模板**。支持可视化字段、HTML 源码、纯文本备份、600px / 360px 预览与 JSON 导出。
- `src/email/layout.gohtml`：共享 HTML 版式，沿用原邮件设计。
- `src/email/templates.ts`：六种场景的默认配置、版式生成与离线预览。
- 邮件页眉的 `beilo` 保留为文字，蓝色圆点用独立元素绘制；“北落”复用 `public/beilo-chinese.svg` 的小篆路径。
- `src/email/logo.txt`：独立图形标识的 CID 内嵌 PNG Base64。发布时随模板一起保存，不要求后端携带图片。
- `public/email-templates/presets.json`：从当前前端源码导出的六套模板，可用于导入工具或 API 初始化。

重新生成默认模板包：

```sh
pnpm export:email
# 或导出到指定位置
pnpm export:email /tmp/beilo-email-presets.json
```

导出只生成默认模板 JSON 包，供导入工具或 API 初始化使用。

## 保存与发送

1. 在前端编辑并预览，点击“保存模板”。保存的完整对象包含 `subject`、`html`、`text`、`logoPNG`、静态 `values` 与可视化 `design`。
2. 前端通过已有身份验证和通知读写权限调用后端接口，不直接连接 etcd。
3. 后端将对象保存于 `notification/email-templates/{id}`。使用已有 etcd authority；其他数据库可实现相同 `Store` 接口。内存模式只适用于临时验证。
4. 在邮件渠道选择已保存模板。旧 `useTemplate: true` 配置单独存在时仍发送纯文本；只有同时配置有效 `templateID` 才启用 HTML。
5. Worker 在实际投递时读取最新已保存版本；HTML、纯文本与 CID PNG 一起发送，沿用现有队列、重试、收件人展开和 SMTP TLS 处理。

六种场景是可选设计，不会自动开启每日调度或新增业务事件来源。渠道使用其明确选择的模板。

| 接口 | 用途 |
| --- | --- |
| `GET /api/v1/notifications/email-templates` | 列出已保存模板 |
| `PUT /api/v1/notifications/email-templates/{id}` | 保存模板；首次 `version: 0`，后续提交当前版本 |
| `POST /api/v1/notifications/email-template-preview` | 服务端渲染草稿，返回主题、HTML 和纯文本；不发送邮件 |

保存采用原子版本检查；冲突返回 `409`，不会覆盖其他人的修改，前端保留当前草稿。导出文件不含 SMTP 凭据。

## 模板字段

正文动态字段使用 Go 字段语法，如 `{{.Title}}`、`{{.Summary}}`、`{{.OccurredAt}}`。`Fields` 是后端白名单业务字段，可使用 `{{range .Fields}}{{.Label}}: {{.Value}}{{end}}`。支持 `if`、`with`、`range`，不支持函数调用、模板递归或变量赋值。

HTML 中动态值由 Go `html/template` 按上下文转义。事件内容不被解释为模板源码；原始 payload 不会完整注入，URL 字段沿用现有去凭据、查询参数和片段的处理。操作链接必须为无内嵌凭据的 HTTP(S) 地址。

浏览器中的即时预览使用本地演示数据，iframe 开启 sandbox 与 CSP，不加载远程资源，也不会发起邮件投递。服务器保存前会再次校验源码与渲染结果。

前后端代码需要一同发布才能保存并实际使用模板。旧后端不支持这些接口时，前端明确显示不可保存，仍允许离线编辑、预览和导出。
