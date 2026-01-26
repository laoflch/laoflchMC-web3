# Vue3 + Element Plus 项目

这是一个基于 Vue 3 和 Element Plus 构建的前端项目。

## 项目结构

```
vue3-elementplus-project/
├── index.html          # 入口HTML文件
├── package.json        # 项目配置和依赖
├── vite.config.js      # Vite构建工具配置
├── README.md           # 项目说明文档
└── src/                # 源代码目录
    ├── main.js         # 应用入口文件
    └── App.vue         # 根组件
```

## 技术栈

- Vue 3 - 渐进式JavaScript框架
- Element Plus - Vue 3 UI组件库
- Vite - 现代前端构建工具

## 开始使用

### 安装依赖

```bash
npm install
```

### 开发模式运行

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 预览生产版本

```bash
npm run preview
```

## 功能特性

本项目展示了Element Plus的多种组件：

- 布局组件：Container、Header、Main、Footer
- 导航组件：Menu
- 表单组件：Input、Select、Radio、Checkbox、DatePicker、TimePicker、Switch、Slider
- 数据展示组件：Table、Card
- 反馈组件：Dialog、Notification
- 其他组件：Button、Icon

## 注意事项

如果遇到Node.js版本兼容性问题，请确保使用Node.js 14或更高版本。

## 角色与导航控制（开发提示）

本项目支持基于用户角色的导航过滤（示例：`admin`、`editor`、`guest`）。导航项在 `src/config/nav.js` 中通过 `allowedRoles` 字段配置。

开发时可在浏览器控制台手动设置用户信息以测试不同角色视图：

```js
localStorage.setItem('user_info', JSON.stringify({ username: 'dev', role: 'admin', name: '开发者' }))
```

刷新页面后 Layout 会根据 `user_info.role` 显示或隐藏对应菜单项。

