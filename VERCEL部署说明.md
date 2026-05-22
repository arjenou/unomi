# 部署：避免访客看到「安全认证 / 浏览器确认」界面

若页面长时间停在 **「ブラウザを確認しています」** 并转圈，多半是 **域名前面的 CDN/WAF（常见为 Cloudflare）** 在做浏览器检测，**不是** 本仓库 HTML 能关掉的。请先在 **Cloudflare**（若 `unomi-jp.com` 的 DNS 在 Cloudflare 解析）处理，再查 Vercel。

---

## 0. Cloudflare（出现「ブラウザを確認しています」时优先查）

登录 [Cloudflare Dashboard](https://dash.cloudflare.com) → 选中域名 `unomi-jp.com`：

| 位置 | 建议（公开官网、减少验证页） |
|------|------------------------------|
| **Security** → **Settings** → **Security Level** | 设为 **Medium** 或 **Low**；不要长期开 **I'm Under Attack**（会全员挑战）。 |
| **Security** → **Bots** | 若开了 **Super Bot Fight Mode** 等，可先 **关闭** 或改为较宽松策略（按套餐可见选项略有不同）。 |
| **Firewall Rules / WAF** | 检查是否有规则对 `/service/*` 或全站 **Challenge / JS Challenge**；公开页面可改为 **Allow** 或删除该条测试。 |
| **SSL/TLS** | 与「浏览器确认」无直接关系，一般不必为关验证而改。 |

保存后等 **1～3 分钟** 再用无痕窗口访问 `https://www.unomi-jp.com/service/index.html` 复测。

> **说明：** 浏览器右上角若出现 **「验证你的身份」**（中文），有时是 **Edge / 系统或扩展** 的提示，与网站无关；可换 Chrome 无痕或暂时关掉相关扩展对比。

---

## 1. Vercel 部署保护（登录页、Vercel 账号验证）

**路径：** 项目 → **Settings** → **Deployment Protection**

| 设置项 | 建议（公开官网） |
|--------|------------------|
| **Production** | 选择 **Disabled** / **Only Preview Deployments**（仅保护预览），确保 **生产环境（Production）不设密码、不要求 Vercel 账号登录**。 |
| **Vercel Authentication** | 若希望任何人都能打开正式域名，应对 Production **关闭**；仅内部预览可保留给 Preview。 |
| **Password Protection** | 生产环境 **关闭**（除非刻意做内测）。 |

保存后 **重新部署一次** 或等待配置生效，再用无痕窗口访问正式域名验证。

---

## 2. 安全 → 攻击挑战模式

**路径：** 项目 → **Settings** → **Security** → **Attack Challenge Mode**

- 若团队曾开启过，访客可能在异常流量期间看到挑战页。
- 正常展示官网时建议：**关闭**（无攻击时不必长期开启）。

---

## 3. 预览地址（Preview）与生产地址（Production）

- **Hobby 计划**下，**预览部署（`*.vercel.app` 的预览链接）** 默认可能带 **Standard Protection**，未登录会看到验证界面——这是预期行为。
- **避免误解：** 请用已绑定并指向 **Production** 的 **自定义域名**（如 `www.unomi-jp.com`）测试「是否还会出现验证页」；不要只用某次 PR 的 Preview URL 判断。

若必须分享 **无需登录** 的预览链接：在 **Deployment Protection** 里为特定域名添加 **例外**，或使用官方文档中的 **Protection Bypass**（适合自动化；分享链接需按文档配置）。

---

## 4. 团队 / 账号与「补全资料」

若控制台顶部或邮件提示 **完善团队信息、验证身份、绑定支付方式** 等：

- 按提示在 **Team Settings** / **Billing** 中补全（企业合规或风控有时会拦截部分功能）。
- 这与「访客打开网站」不同：访客侧仍主要取决于第 1、2 节的开关。

---

## 5. 本仓库 `vercel.json` 说明

当前根目录 `vercel.json` 仅声明静态输出目录，**不能**在文件里单独「关闭」控制台里的部署保护；**必须在网页控制台** 修改上述选项。

若你希望构建产物中的 **源码浏览路径**（如 `/_src`）策略与团队默认一致，可在 Vercel 文档中查阅 **Build Logs and Source Protection**，按需调整；与「整站访客认证页」不是同一类设置。

本仓库还在根目录提供 **`/api/seminar-notify`**（Serverless + nodemailer），与静态 `outputDirectory` 可同时存在。

**`/form/`** 为 **静态页**：正文（议程、概要、推荐对象、登壇者等）来自 ec-force 页面导出数据中的 HTML 片段，**不加载** ec-force 的 Next/GraphQL；仅保留 **ec-force 的 CSS（外链 + 内联 styled）** 以还原版式。表单为 **自建 `<form>`**，仅 **`fetch` 本站 `/api/seminar-notify`**，无 **`api.ec-force.com` CORS** 依赖。根目录 **`vercel.json`** 的 **`/images/*` → ec-force** 的 rewrite 仍可用于站内对 `/images/...` 的引用。

---

## 5.1 /form セミナー申込メール（API + nodemailer）

`/form/` 页面内脚本在用户提交 **「送信する」** 后，将表单字段整理为 **`fields` 数组**，**POST JSON** 到 **`/api/seminar-notify`**，由 **nodemailer** 发到 **`HBY@unomi-jp.com`（固定）**；可选 **`SEMINAR_NOTIFY_CC`** 抄送。

在 Vercel → **Settings** → **Environment Variables** 中配置 SMTP（示例名，按你的邮服文档填写）：

| 变量名 | 说明 |
|--------|------|
| `SMTP_HOST` | SMTP 主机 |
| `SMTP_PORT` | 端口，默认 `587` |
| `SMTP_SECURE` | `true` / `false`；端口 `465` 时多为 `true` |
| `SMTP_USER` / `SMTP_PASS` | 认证账号与密码或应用专用密码 |
| `SMTP_FROM` | 发件人地址（可选，未设则用 `SMTP_USER`） |
| `SEMINAR_NOTIFY_CC` | 可选，抄送（逗号分隔）；主收件人固定为 **`HBY@unomi-jp.com`** |
| `SEMINAR_ALLOWED_ORIGINS` | 可选，逗号分隔的浏览器 `Origin` 白名单；**不填**时允许 `https://www.unomi-jp.com`、`https://unomi-jp.com`、Vercel 预览 **`*.vercel.app`**，以及 **`http://127.0.0.1:*` / `http://localhost:*`**（便于 `vercel dev`） |

若未配置 `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS`，API 返回 **503**，页面会提示送信系统未配置。

### 502 + `Send failed`（SMTP 已配但发信失败）

说明 **`nodemailer.sendMail` 抛错**：请求已到达 Serverless，CORS 与 JSON 校验通过，**问题在邮服连接或认证**。请在 Vercel → 该项目 → **Deployments** → 选最新生产部署 → **Functions** / **Runtime Logs**，搜索 **`seminar-notify sendMail`** 查看完整错误栈。

常见原因与处理：

| 现象 / 返回 JSON 中的 `code` | 建议 |
|------------------------------|------|
| **`EAUTH`** / `535` | 账号或密码错误；若用 Gmail / Google Workspace，需 **应用专用密码**，不能只用普通登录密码。 |
| **`ECONNECTION`** / **`ETIMEDOUT`** | 主机名或端口错误；防火墙或邮服 **拒绝 Vercel 出口 IP**（少数企业 SMTP 会拦）；换支持 Serverless 的 SMTP（如 SendGrid、Resend、Amazon SES、Postmark 等）或向邮服开通发信。 |
| **`ESOCKET` / TLS** | `SMTP_PORT` 与 **`SMTP_SECURE`** 不匹配：587 多为 `SMTP_SECURE=false`（STARTTLS）；465 多为 `true` 且 `secure: true`。 |
| **`SMTP_FROM` 被拒** | 部分邮服要求 **发件人域名与认证账号一致**；在环境变量里把 `SMTP_FROM` 设为邮服允许的 From（或与 `SMTP_USER` 同域）。 |

部署更新后，若仍返回 502，响应体可能包含 **`code`**、**`responseCode`**（不含密码），便于与邮服文档对照。

**本地联调**：VS Code Live Server（`http://127.0.0.1:5500`）**无法**提供 **`/api/seminar-notify`**，请在项目根执行 **`npx vercel dev`** 后打开终端给出的地址下的 **`/form/`**。复制根目录 **`.env.example`** 为 **`.env.local`** 并填入 SMTP 即可测发信。

---

## 6. 自检清单（保存前打勾）

- [ ] **Cloudflare**（若使用）：Security Level 非「Under Attack」；Bots/WAF 未对全站强挑战  
- [ ] **Deployment Protection**：Production 不要求登录 / 无密码  
- [ ] **Attack Challenge Mode**：未长期开启（除非正在应对攻击）  
- [ ] 用 **正式域名 + 无痕窗口** 复测，而非仅用 Preview 链接  
- [ ] 团队/账单提示已处理（若有）

---

## 官方文档

- [Deployment Protection](https://vercel.com/docs/security/deployment-protection)  
- [Bypass / Exceptions](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection)  
- [Security settings](https://vercel.com/docs/project-configuration/security-settings)  
- [Attack Challenge Mode](https://vercel.com/docs/attack-challenge-mode)

按上述设置后，**公开访问生产站点**时不应再出现 Vercel 的登录/安全认证页；若仍出现，请截图具体 URL（是否 `*.vercel.app` 预览）与浏览器匿名模式结果，便于区分 Preview 与 Production。
