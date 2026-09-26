# 🗣️ YellOut / YellZone

> 面向中年群体的匿名语音发泄与同温层互慰树洞。选择对象，按住咆哮，变声脱敏，松手送出或焚入虚空。

[中文](./README.md) | [English](./README_EN.md)

<div align="center">
  <img src="./apps/web/public/yellout-logo.jpg" width="160" height="160" alt="YellOut Logo" style="border-radius: 24px;" />
  <p><em>「声波破晓，咆哮释然」</em></p>
</div>

---

## 品牌色

| Token | Hex | 含义 |
|-------|-----|------|
| Ember Orange | `#F97316` | 宣泄与重生 |
| Obsidian Dark | `#070B14` | 私密底色 |
| Warm Amber | `#F59E0B` | 同温层微光 |
| Void Slate | `#1E293B` | 匿名与归零 |

---

## 架构

```
yellout/
├── apps/
│   ├── web/          # Vite + React 19 + Tailwind 4（中文 UI）
│   ├── api/          # Express + Node SQLite（匿名会话 / 倾诉 / 互动）
│   └── mobile/       # 预留 Expo 客户端
├── packages/shared/  # 共享类型与常量
├── e2e/              # Playwright 端到端测试
├── docs/API.md
├── Dockerfile        # 单容器：API + 静态前端
├── render.yaml       # Render Blueprint
└── docker-compose.yml
```

- **匿名身份**：设备令牌 + 随机代号，无注册
- **发泄上传**：本地 DSP 变声后 multipart 上传；**焚入虚空永不上传**
- **同温层广场**：跨会话共享；反应与短语音回复持久化
- **生命周期**：默认 48h 过期并删除音频
- **安全**：限流、举报、审核/危机 hook（无 `GEMINI_API_KEY` 时 stub 降级）
- **代理友好**：`trust proxy` 开启，读取 `PORT`，健康检查 `/api/v1/health`

完整 API 见 [docs/API.md](./docs/API.md)。

---

## 本地运行

需要 **Node.js ≥ 22**。

```bash
npm install
npm run build --workspace=@yellout/shared
npm run dev:api   # :8787
npm run dev:web   # :3000（代理 /api → 8787）
```

生产模式（API 托管前端）：

```bash
cp .env.example .env
npm install && npm run build && npm start
# http://127.0.0.1:8787
```

验证：

```bash
npm run typecheck
npm test                 # API 单元/集成
npm run test:e2e         # Playwright 端到端（对真实后端）
npm run build
```

---

## 部署到 Render（推荐）

仓库根目录的 [`render.yaml`](./render.yaml) 定义**单个 Docker Web Service** + **1GB 持久磁盘**（SQLite 与音频文件）。

### 为何是 `starter` 计划

Render **持久磁盘只能挂在付费实例上**（最小一般为 `starter`）。免费 Web Service **不能**挂盘；若改用免费档，需自行换成 Render Postgres + 对象存储（当前 Blueprint 未走这条路径）。

### 精确步骤

1. 打开 [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**
2. 连接本 GitHub 仓库（分支 `main` 或你的发布分支）；Render 自动读取根目录 `render.yaml`
3. 审核 Blueprint 预览：
   - Service：`yellout`（`runtime: docker`，`plan: starter`）
   - Disk：`yellout-data` → 挂载 `/data`（1 GB）
   - Health check：`/api/v1/health`
4. 在创建前填写密钥类环境变量（`sync: false`）：
   - **`CORS_ORIGIN`**（必填建议）：部署后的 HTTPS 源，例如 `https://yellout-xxxx.onrender.com`  
     （若首次尚不知域名：可先留空用默认反射 CORS，部署成功后到 Dashboard → Environment 填入完整 `https://…` 再 Redeploy）
   - **`GEMINI_API_KEY`**（可选）：留空则审核走 stub，服务仍可启动
5. **`SESSION_SECRET`** 由 Blueprint `generateValue: true` 自动生成，无需手填
6. 点击 **Apply** 等待首次构建；日志中应出现 `YellOut API listening on http://0.0.0.0:<PORT>`
7. 验收：
   ```bash
   curl -sS https://<your-service>.onrender.com/api/v1/health
   # → {"status":"ok",...}
   ```
8. 浏览器打开同一 HTTPS URL，完成 onboarding 后发一条倾诉，再开无痕窗口确认同温层可见

### 代理 / HTTPS 行为

| 项 | 行为 |
|----|------|
| `PORT` | Render 注入；应用 `listen(process.env.PORT \|\| 8787)` |
| `TRUST_PROXY=1` | `app.set('trust proxy', …)`，限流使用真实客户端 IP（`X-Forwarded-For`） |
| 对外 URL | 始终用 Render 提供的 **HTTPS** 域名；`CORS_ORIGIN` 填该 `https://` 源 |

磁盘路径（勿改除非同步改 Dockerfile）：`DATABASE_PATH=/data/yellout.db`，`UPLOAD_DIR=/data/uploads`。

---

## Docker / VPS / Fly.io

**Docker Compose（本机或任意 VPS）：**

```bash
docker compose up --build -d
# 健康检查: curl localhost:8787/api/v1/health
```

**纯 VPS：** 安装 Node 22 → `npm ci && npm run build && npm start`，用 systemd/Caddy/Nginx 反代并开启 HTTPS；把 `data/` 与 `uploads/` 放到持久卷。

**Fly.io：** `fly launch --dockerfile Dockerfile`，挂 volume 到 `/data`，设置与 Dockerfile 相同的 `DATABASE_PATH` / `UPLOAD_DIR`。

---

## 环境变量

见 [.env.example](./.env.example)。关键项：`PORT`、`DATABASE_PATH`、`UPLOAD_DIR`、`WEB_DIST`、`CORS_ORIGIN`、`GEMINI_API_KEY`（可选）、`TRUST_PROXY`。

---

## 产品要点

1. **极简发泄舱**：对象标签、长按录音、DSP 变声、上滑焚毁、车窗夜雨底噪
2. **同温层广场**：仅语音与图形化共鸣，无文本说教区
3. **危机守护**：醒目的援助热线弹窗

---

## 文档

- [API 契约](./docs/API.md)
- [贡献指南](./CONTRIBUTING.md)
- 应用内：`/privacy` · `/terms` · `/about`
