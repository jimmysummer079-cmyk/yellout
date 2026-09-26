# YellOut Mobile (Expo)

React Native / Expo 客户端，对接同一套后端 API（默认 `https://yellout.onrender.com`）。

## 功能

- 匿名会话 + 首次 onboarding + 动态代号
- 长按录音倾诉 / 上滑焚入虚空（永不上传）
- 同温层广场：播放、抱抱/懂你/同感/拍肩、短语音回复、举报
- 危机援助热线弹窗
- 48h 焚毁倒计时展示
- Render 免费档冷启动友好等待（30–60s 唤醒重试）

## 环境要求

- Node.js ≥ 22
- 仓库根目录已 `npm install`（npm workspaces）
- 手机安装免费 [Expo Go](https://expo.dev/go)（无需付费）

## 配置

| 变量 | 说明 |
|------|------|
| `EXPO_PUBLIC_API_URL` | API 根地址，默认 `https://yellout.onrender.com` |

也可在 `app.json` → `expo.extra.apiUrl` 中配置。

## 本地运行（Expo Go，免费）

```bash
# 在仓库根目录
npm install
npm run build --workspace=@yellout/shared

cd apps/mobile
npx expo start
```

用 Expo Go 扫码即可在真机调试。首次请求若服务休眠，App 会显示「服务器正在唤醒」并自动重试。

指定本地 API：

```bash
EXPO_PUBLIC_API_URL=http://127.0.0.1:8787 npx expo start
```

（真机访问电脑局域网 IP，而非 `127.0.0.1`。）

## 测试与打包校验

```bash
# 在 apps/mobile 或通过 workspace
npm run typecheck --workspace=@yellout/mobile
npm test --workspace=@yellout/mobile
npm run export:ios --workspace=@yellout/mobile
npm run export:android --workspace=@yellout/mobile
```

## EAS Build（免费额度）

已提供 [`eas.json`](./eas.json) preview 配置：

- `preview` / `preview-android-apk`：Android **APK**（internal）
- `preview-ios-internal`：iOS internal 分发

```bash
npm i -g eas-cli   # 可选
cd apps/mobile
npx eas-cli login   # 使用免费 Expo 账号
npx eas-cli build --profile preview-android-apk --platform android
npx eas-cli build --profile preview-ios-internal --platform ios
```

EAS 免费额度足够个人预览构建；**无需**付费 Apple Developer 即可用 Expo Go 日常开发。上架 App Store 才需要苹果开发者账号（本项目不强制）。

## 权限

- **iOS**：`NSMicrophoneUsageDescription`（app.json）
- **Android**：`RECORD_AUDIO`

## Monorepo

Metro 已配置 `watchFolders`、`disableHierarchicalLookup` 与 `@yellout/shared` 解析（见 `metro.config.js`）。根目录 `package.json` 的 `overrides` **仅作用于** `@yellout/mobile`（`react`/`react-dom` 18.3.1、`react-native` 0.76.9、`query-string` 7.1.3），避免把 Web 的 React 19 类型拉偏。若 npm 将 `expo-router` 嵌套安装，`postinstall` 脚本会把关键包 symlink 到仓库根 `node_modules`，保证 `babel-preset-expo` 能内联 `EXPO_ROUTER_APP_ROOT`。共享类型走 `packages/shared` 的 `react-native` export。
