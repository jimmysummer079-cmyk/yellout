# 🤝 参与贡献指南 (Contributing to YellOut)

感谢你关注并愿意为 **YellOut / YellZone**（中年情绪发泄树洞）贡献力量！

为了保证主线代码的纯净性、安全性与代码质量，本项目采用开源社区规范的 **Fork & Pull Request 审核合并机制**。**所有外部提交必须经过 Maintainer (@jimmysummer079-cmyk) 的代码审查（Code Review）与批准后方可合入主分支。**

---

## 🛠️ 贡献工作流 (Workflow)

1. **Fork 本仓库**
   - 点击 GitHub 页面右上角的 `Fork` 按钮，将项目派生至你的个人账号下。

2. **Clone 到本地并拉取依赖**
   ```bash
   git clone https://github.com/<你的用户名>/yellout.git
   cd yellout
   npm install
   ```

3. **创建特性分支 (Feature Branch)**
   - 请勿直接在 `main` 分支上开发。创建具有明确语义的分支，例如：
     ```bash
     git checkout -b feature/audio-pitch-filter
     # 或
     git checkout -b fix/mobile-haptics
     ```

4. **本地验证与规范**
   - 开发完成后，确保编译和类型检查无错误：
     ```bash
     npm run lint
     npm run build
     ```

5. **提交变更与清晰的 Commit 描述**
   ```bash
   git add .
   git commit -m "feat(audio): 新增机器电音混响算法"
   git push origin feature/audio-pitch-filter
   ```

6. **发起 Pull Request (PR)**
   - 在 GitHub 仓库页面点击 **New Pull Request**；
   - 详细填写你的 PR 动机、修改范围以及测试情况；
   - 提交后，仓库维护者将收到通知并进行审核。

---

## 🔒 审核与合并规则 (Review & Merge Policy)

- 🛡️ **主分支保护 (Branch Protection)**：`main` 分支已开启保护，**禁止任何未经审核的直接 Push 提交**。
- 👀 **强制人工审核**：每个 PR 必须经过项目负责人审阅并给出 `Approve` 决定后才能点击 Merge。
- 💬 **积极探讨**：若有架构或设计方案调整，建议先在 GitHub Issues 中发起讨论。
