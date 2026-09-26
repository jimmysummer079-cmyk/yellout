# 🤝 参与贡献 (Contributing)

感谢关注 **YellOut / YellZone**。

## 工作流

1. Fork 并 clone
2. `npm install`
3. 从 `main` 开特性分支
4. 本地验证：
   ```bash
   npm run typecheck
   npm test
   npm run build
   ```
5. 提交 PR，说明动机、范围与测试情况

## 仓库结构

- `apps/web` — 前端
- `apps/api` — 后端与 API 测试
- `packages/shared` — 共享类型（移动端将复用）
- `docs/API.md` — REST 契约，变更请同步文档

主分支需通过 Review 后方可合并。
