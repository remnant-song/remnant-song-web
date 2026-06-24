# 架构文档 — Remnant Song Web

> 最后更新：2026-06-24 | 作者：trae+deepseek-v4-pro

---

## 1. 项目概述

`remnant-song-web` 是一个纯静态个人网站项目，基于 Vue 3 生态构建。项目追求"高自定义、高可扩展"，所有结构均支持按需裁剪。

## 2. 技术栈

| 类别 | 技术 | 用途 |
|------|------|------|
| 框架 | Vue 3 (Composition API) | UI 框架 |
| 构建 | Vite | 开发 & 生产构建 |
| 语言 | TypeScript (strict) | 类型安全 |
| 路由 | vue-router 4 | SPA 路由 |
| 状态 | Pinia | 全局状态管理 |
| 动效 | GSAP | 高性能动画 |
| 样式 | Tailwind CSS + PostCSS | 原子化 CSS |
| i18n | vue-i18n 9 | 多语言支持 |

## 3. 目录结构

```text
remnant-song-web/
├── .env                     # 环境变量（VITE_ 前缀暴露给客户端）
├── .env.d.ts                # 环境变量 TypeScript 类型声明
├── index.html               # HTML 入口
├── vite.config.ts           # Vite 配置（别名、构建分包、CSS 预处理器）
├── tailwind.config.js       # Tailwind CSS 配置（设计令牌扩展）
├── postcss.config.js        # PostCSS 配置（tailwindcss + autoprefixer）
├── tsconfig.json            # TS 总配置（引用子配置）
├── tsconfig.app.json        # 应用代码 TS 配置（strict + paths）
├── tsconfig.node.json       # Node 端 TS 配置（vite.config.ts 等）
├── docs/
│   └── ARCHITECTURE.md      # 本文档
└── src/                     # 项目源码（详见下方）
```

### src/ 目录详解

```text
src/
├── main.ts                  # 应用入口：创建 Vue 实例、注册插件
├── App.vue                  # 根组件：挂载 DefaultLayout
├── style.css                # 原有基础样式（CSS 自定义属性 + 基础重置）
│
├── i18n/                    # 国际化
│   ├── index.ts             # i18n 实例创建 + 语言切换/获取函数
│   └── locales/             # 语言包（JSON）
│       ├── en.json          #   英文
│       └── zh-CN.json       #   简体中文
│
├── router/
│   └── index.ts             # 路由配置 + 导航守卫（动态标题）
│
├── layouts/
│   └── DefaultLayout.vue    # 默认布局（Header + RouterView + Footer）
│
├── views/                   # 页面级路由组件（每个路由对应一个 view）
│   ├── HomeView.vue         #   首页
│   └── NotFoundView.vue     #   404 页面
│
├── components/              # 可复用通用组件
│   └── common/              #   基础组件（Button, Icon, Modal 等）
│
├── composables/             # 组合式函数（Hooks）
│   └── .gitkeep             #   示例：useLanguage.ts, useTheme.ts
│
├── stores/                  # Pinia 状态管理模块
│   └── .gitkeep             #   示例：useAppStore.ts
│
├── utils/                   # 纯函数工具模块
│   └── .gitkeep             #   示例：format.ts, request.ts
│
├── types/                   # 全局 TS 类型定义
│   └── .gitkeep
│
├── styles/                  # 全局样式
│   └── index.css            #   唯一 CSS 入口：设计令牌(CSS变量) + Tailwind 指令 + 全局层样式
│
└── assets/                  # 静态资源（图片、SVG、字体）
    └── .gitkeep
```

## 4. 关键设计决策

### 4.1 路径别名 `@`

- `@` → `src/`，在 `vite.config.ts`（构建时）和 `tsconfig.app.json`（类型检查时）两端同步配置
- 统一使用 `@/` 导入，避免相对路径地狱

### 4.2 构建分包策略

通过 Vite `rollupOptions.output.manualChunks` 将依赖拆分为：

| Chunk | 内容 | 策略 |
|-------|------|------|
| `vendor` | vue, pinia, vue-router, gsap | 长期缓存（版本不常变） |
| `libs` | 其他 node_modules | 按需更新 |

### 4.3 国际化 (i18n)

- **语言检测优先级**：localStorage > navigator.language > 默认 'en'
- **持久化**：用户手动切换后写入 localStorage，下次访问自动恢复
- **全局可用**：模板中用 `$t('key')`，脚本中用 `useI18n().t('key')`
- **语言包扩展**：在 `src/i18n/locales/` 下新建 JSON 文件，并在 `src/i18n/index.ts` 中注册

### 4.4 路由设计

- `createWebHistory`（HTML5 History 模式），需要服务器配置 fallback
- 路由懒加载：所有页面组件使用动态 `import()`
- 导航守卫自动设置页面标题：`{route.meta.title} | {VITE_APP_TITLE}`

### 4.5 样式策略

- **Tailwind CSS** 作为主力样式工具（原子化 class），组件中所有布局/排版/颜色通过 Tailwind utility class 表达
- **CSS 自定义属性** 定义设计令牌（`src/styles/index.css`），Tailwind `theme.extend` 通过 `var()` 引用，保持单一来源
- **唯一入口**：`src/styles/index.css` 是项目唯一的 CSS 入口文件，按顺序包含：设计令牌 → Tailwind 注入 → 全局层样式
- **Preflight 接管**：Tailwind 的 `@tailwind base`（Preflight）负责所有 HTML 元素的基础重置（margin/box-sizing 等），不额外定义 CSS 重置规则

## 5. 扩展指南

### 5.1 添加新页面

1. 在 `src/views/` 创建 `XxxView.vue`
2. 在 `src/router/index.ts` 的 `routes` 数组中添加路由：

```ts
{
  path: '/xxx',
  name: 'Xxx',
  component: () => import('@/views/XxxView.vue'),
  meta: { title: '页面标题' },
}
```

3. 在 `src/i18n/locales/en.json` 和 `zh-CN.json` 中添加对应的翻译键

### 5.2 添加导航项

1. 在 `src/layouts/DefaultLayout.vue` 的 `navItems` 数组中添加：

```ts
{ key: 'newItem', path: '/new-path' },
```

2. 语言包中 `nav.newItem` 也需同步添加

### 5.3 添加新语言

1. 在 `src/i18n/locales/` 创建 `ja.json`（日文）等语言包
2. 在 `src/i18n/index.ts` 中 import 并在 `messages` 中注册
3. 在 `switchLanguage()` 中添加该语言代码的处理分支

### 5.4 添加 Pinia Store

1. 在 `src/stores/` 创建 `useXxxStore.ts`
2. 按命名约定 `useXxxStore` 命名（与 `defineStore('xxx', ...)` 一致）

### 5.5 添加全局 Composable

1. 在 `src/composables/` 创建 `useXxx.ts`
2. 按命名约定 `useXxx` 命名

## 6. 开发约定

- **导入路径**：始终使用 `@/` 别名，禁止 `../../../` 相对路径
- **组件命名**：Vue SFC 使用 PascalCase，composable 使用 `use` 前缀
- **类型安全**：尽量为函数参数和返回值标注类型
- **注释规范**：新增代码块使用 `@Author` / `@Date` / `@Desc` 块注释包裹
- **ponytail 标记**：有意的简化实现用 `ponytail:` 注释标注，说明已知限制和升级路径

## 7. 环境变量

| 变量名 | 用途 | 默认值 |
|--------|------|--------|
| `VITE_R2_BASE_URL` | R2 存储外链基础 URL | 空（部署时填入） |
| `VITE_APP_TITLE` | 应用标题 | `Remnant Song` |
| `VITE_API_BASE_URL` | API 基础路径 | 空（后续对接） |
| `VITE_DEBUG` | 调试模式开关 | `false` |

所有 `VITE_` 前缀变量通过 `import.meta.env.VITE_XXX` 访问，类型定义在 `.env.d.ts`。

## 8. 构建 & 部署

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 生产构建（含类型检查）
npm run build

# 预览生产构建
npm run preview
```

> **注意**：生产构建命令 `npm run build` 会先执行 `vue-tsc -b` 进行全量类型检查（strict 模式），确保零类型错误。
