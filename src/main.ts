/*
 * @Author: trae+claude
 * @Date: 2026-06-24
 * @Modify: trae+claude, 2026-06-24, CSS 入口统一为 styles/index.css，移除冗余的 style.css 导入
 * @Desc: 应用入口文件
 *   初始化 Vue 实例、路由、状态管理、国际化
 *   加载全局样式
 */

import { createApp } from 'vue'

// 全局样式（唯一入口：设计令牌 + Tailwind 注入）
import './styles/index.css'

// 核心插件
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import i18n from './i18n'

const app = createApp(App)

// 注册路由
app.use(router)
// 注册状态管理
app.use(createPinia())
// 注册国际化
app.use(i18n)

app.mount('#app')

// 输出应用初始化信息，方便开发调试
console.log(
  `[app] 应用已挂载 | ` +
  `环境: ${import.meta.env.MODE} | ` +
  `调试: ${import.meta.env.VITE_DEBUG === 'true' ? '开启' : '关闭'}`
)
