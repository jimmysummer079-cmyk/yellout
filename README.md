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
│   └── api/          # Express + Node SQLite（匿名会话 / 倾诉 / 互动）
├── packages/
│   └── shared/       # 共享类型与常量（供未来 mobile/ 复用）
├── docs/API.md       # REST 契约（React Native / Expo 将对接同一后端）
├── Dockerfile
└── docker-compose.yml
```

- **匿名身份**：`POST /api/v1/session` 下发设备令牌 + 随机代号，无注册、无通讯录、无社交登录。
- **发泄上传**：浏览器录音 → 本地 DSP 变声 → multipart 上传；**焚入虚空永不上传**。
- **同温层广场**：跨会话共享帖子；抱抱 / 懂你 / 同感 / 拍肩与短语音回复持久化。
- **生命周期**：默认 **48h** 过期，定时任务删除 DB 记录与音频文件。
- **安全**：全局限流 + 发泄/回复限流、举报接口、审核/危机检测 hook（无 `GEMINI_API_KEY` 时降级为 stub）。

完整 API 见 [docs/API.md](./docs/API.md)。

---

## 本地运行（一条命令）

需要 **Node.js ≥ 22**。

```bash
npm install
npm run build --workspace=@yellout/shared
npm run dev:api   # http://127.0.0.1:8787
# 另开终端
npm run dev:web   # http://127.0.0.1:3000  （Vite 代理 /api → 8787）
```

或生产模式（API 同时托管前端静态资源）：

```bash
cp .env.example .env
npm install
npm run build
npm start
# 打开 http://127.0.0.1:8787
```

验证：

```bash
npm run typecheck
npm test
npm run build
```

---

## Docker 部署

```bash
docker compose up --build -d
# http://localhost:8787
```

数据卷挂载 SQLite 与 `uploads/`。可选设置 `GEMINI_API_KEY` 启用审核。

---

## 环境变量

见 [.env.example](./.env.example)。`GEMINI_API_KEY` 可选；未设置时审核始终走本地 stub，服务可正常启动。

---

## 产品要点

1. **极简发泄舱**：对象标签、长按录音、DSP 变声、上滑焚毁、车窗夜雨底噪。
2. **同温层广场**：仅语音与图形化共鸣，无文本说教区。
3. **危机守护**：醒目的援助热线弹窗（含强制触发路径）。

---

## 文档

- [API 契约](./docs/API.md)
- [贡献指南](./CONTRIBUTING.md)
- [隐私政策](/privacy) / [使用条款](/terms)（应用内页面）

预留目录：未来可在 `apps/mobile/` 增加 Expo 客户端，直接依赖 `@yellout/shared` 与同一 REST API。
