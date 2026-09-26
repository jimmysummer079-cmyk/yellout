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

仓库根目录已提供 [`render.yaml`](./render.yaml) Blueprint：

1. 打开 [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**
2. 连接本 GitHub 仓库，Render 会读取 `render.yaml`
3. 确认服务计划为 **`starter`（付费）**——**持久磁盘需要付费实例**；免费 Web Service 无法挂盘
4. 磁盘挂载到 `/data`（SQLite + 音频文件）
5. 在 Environment 中按需填写：
   - `CORS_ORIGIN`：你的 `https://<service>.onrender.com`（首次部署后可回填）
   - `GEMINI_API_KEY`（可选，留空则走审核 stub）
6. 部署完成后健康检查路径为 **`/api/v1/health`**
7. Render 会注入 `PORT`；应用已 `listen(process.env.PORT)` 并设置 `trust proxy`

> 若不想使用磁盘：可自行改为托管 Postgres + 对象存储，并改 `DATABASE_PATH` / `UPLOAD_DIR` 实现——当前默认路径是单机 SQLite + 本地 uploads，配合 Render Disk 最简单。

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
