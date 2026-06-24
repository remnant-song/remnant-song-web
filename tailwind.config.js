/*
 * @Author: trae+deepseek-v4-pro
 * @Date: 2026-06-24
 * @Desc: Tailwind CSS 配置
 *   - content: 扫描所有 Vue/TS/JS/HTML 文件中的 class 使用
 *   - theme.extend: 基于 style.css 中的 CSS 自定义属性扩展设计令牌
 *   - 后续可按需扩展 colors、spacing、fontFamily 等
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      /*
       * 使用 CSS 变量与 style.css 中的设计系统保持一致
       * 后续可在 variables.css 中统一管理
       */
      colors: {
        'text': 'var(--text)',
        'text-h': 'var(--text-h)',
        'bg': 'var(--bg)',
        'border': 'var(--border)',
        'code-bg': 'var(--code-bg)',
        'accent': 'var(--accent)',
        'accent-bg': 'var(--accent-bg)',
        'accent-border': 'var(--accent-border)',
        'social-bg': 'var(--social-bg)',
      },
      fontFamily: {
        sans: 'var(--sans)',
        heading: 'var(--heading)',
        mono: 'var(--mono)',
      },
    },
  },
  plugins: [],
}
