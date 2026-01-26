<!-- .github/copilot-instructions.md - 为 AI 编码助手提供本仓库的可发现约定与快速上手信息 -->
# Copilot 使用说明（仓库专用，简明）

下面说明面向在此仓库中自动化或交互式编码的 AI 代理。目标：让你在本项目中快速产出修改，遵循既有约定，避免破坏关键全局行为。

## 一句话概览
- 项目类型：Vue 3 + Element Plus 前端演示应用，使用 Vite 构建。主要展示表单、对话框、以及基于路由的视图。

## 必读架构要点（快速掌握）
- 入口：`src/main.js` — 创建 `app`、注册 `ElementPlus`、并把 `@element-plus/icons-vue` 的图标全局注册到组件库。
- 路由：`src/router/index.js` — 路由使用懒加载（dynamic import）。路由条目中使用 `meta.title`，并在 `router.beforeEach` 中将其写入 `document.title`。
- 视图与组件：页面放在 `src/views/*`，可复用 UI 组件在 `src/components/*`。核心示例：`src/components/Login.vue`（实现 `modelValue` / `update:modelValue` 的对话框模式）和 `src/views/Login.vue`（使用 Element Plus 表单验证）。

## 项目约定（必须遵守的模式）
- 全局图标：不要单独在组件内注册 Element Plus 图标；默认在 `src/main.js` 已注册为全局组件，若要新增图标也在此处统一注册。
- 路由懒加载：保持 `component: () => import('../views/Name.vue')` 写法以保留按需加载行为。
- 页面标题：更新或新增路由时请维护 `meta.title` 字段。
- 对话框通信：对话框组件使用 `modelValue` prop 并 emit `update:modelValue`；父组件以 `v-model` 或 `:modelValue`+`@update:modelValue` 控制显示。
- 表单验证：使用 Element Plus 的 `ref` + `validate()` 模式（参见 `src/components/Login.vue`）。
- 样式覆盖：组件内使用 `scoped` + `:deep()` 以覆盖 Element Plus 的内部样式。
- 别名：Vite 别名 `@` 指向 `/src`（见 `vite.config.js`），AI 生成 import 时可使用 `@/`。

## 常用命令（可复制运行）
- 安装依赖：
```bash
npm install
```
- 本地开发（热重载）：
```bash
npm run dev
```
- 生产打包：
```bash
npm run build
```
- 本地预览构建包：
```bash
npm run preview
```

## 集成点与外部依赖
- UI：`element-plus` 与 `@element-plus/icons-vue`（见 `package.json`）。
- 路由：`vue-router@4`（使用路由守卫和懒加载）。
- 构建：`vite` + `@vitejs/plugin-vue`。

## 发现性示例（常用改动参考）
- 全局图标注册：查看 [src/main.js](src/main.js#L1-L200) 中如何将 icon 集合注册为组件。
- 懒加载路由与页面标题：参见 [src/router/index.js](src/router/index.js#L1-L200) 中 `meta.title` 使用。
- 对话框组件约定：`src/components/Login.vue` 演示 `modelValue` + `update:modelValue`，父页示例在 [src/views/Login.vue](src/views/Login.vue#L1-L200)。

## 安全边界与修改建议（不要越过）
- 不要移除或重构 `src/main.js` 中的全局注册逻辑，除非你同时迁移图标注册与插件注入点。
- 添加新依赖时更新 `package.json` 并在 PR 描述中说明用途及兼容性影响。

## 当你不确定时（快速提示）
- 需要新增全局行为（store、插件、全局样式）：优先修改 `src/main.js` 并在 `README.md` 或 PR 中记录变更。
- 路由相关改动：始终确保新路由有 `meta.title`，并使用懒加载写法。

---
如果你希望我把这些要点进一步精简为 checklist、或自动在 PR 模板中注入检查项，告诉我想要的格式和深度。
