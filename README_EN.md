# 🗣️ YellOut / YellZone

> Anonymous voice venting & resonance square for stressed adults (30–55). Press to yell, pitch-shift locally, release to the square — or slide up to burn forever.

[English](./README_EN.md) | [中文](./README.md)

## Architecture

Monorepo: `apps/web` (Vite/React), `apps/api` (Express + Node SQLite), `packages/shared` (types for a future `apps/mobile` Expo client). REST contract: [docs/API.md](./docs/API.md).

## Quick start

```bash
npm install
npm run build --workspace=@yellout/shared
npm run dev:api   # :8787
npm run dev:web   # :3000 (proxies /api)
```

Production: `npm run build && npm start` or `docker compose up --build`.

## Brand

Ember `#F97316` · Obsidian `#070B14` · Amber `#F59E0B` · Void `#1E293B`
