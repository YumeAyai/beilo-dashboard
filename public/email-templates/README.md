# beilo. 邮件模板

模板源码与品牌素材由前端仓库维护，控制台入口为“设置 → 邮件模板”。

`presets.json` 为六类场景的默认模板包。运行 `pnpm export:email` 可从 `src/email/` 重新导出。
模板通过通知接口保存到共享 Store；后端只读取、填入事件字段并发送。

详见 [维护与接口说明](../../docs/email-templates.md)。
