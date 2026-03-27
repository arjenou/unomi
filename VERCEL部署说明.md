# Vercel 部署：避免访客看到「安全认证 / 登录验证」界面

访客在浏览器里看到 **Vercel 登录页、人机验证、或「Verify / Continue」** 一类界面，几乎都不是由仓库里的 HTML 决定的，而是 **Vercel 项目/团队层面的访问控制**。请按下面顺序在 **Vercel 控制台** 里逐项检查并保存。

---

## 1. 部署保护（最常见原因）

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

---

## 6. 自检清单（保存前打勾）

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
