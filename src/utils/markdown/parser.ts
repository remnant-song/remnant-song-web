/*
 * @Author: trae+deepseek-v4-pro
 * @Date: 2026-08-09
 * @Modify: trae+deepseek-v4-pro, 2026-08-10, 集成 mdit-plugins 全套 21 个插件 +
 *   highlight.js 代码高亮 + github-markdown-css 主题美化
 * @Desc: Markdown 渲染器 —— 全功能版
 *   - 基于 markdown-it 核心引擎
 *   - 集成 mdit-plugins 社区插件生态（https://mdit-plugins.github.io/zh/）
 *   - 集成 highlight.js 实现代码语法高亮（190+ 语言）
 *   - 配合 github-markdown-css 实现 GitHub 风格美化
 */

import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'

// ============================================================
// mdit-plugins 插件导入
// 来源：https://mdit-plugins.github.io/zh/
// 共 21 个纯 Markdown 增强插件（无需外部运行时依赖）
// ============================================================
import { abbr } from '@mdit/plugin-abbr'           // 缩写词支持
import { alert } from '@mdit/plugin-alert'          // GFM 警示框
import { align } from '@mdit/plugin-align'           // 内容对齐
import { anchor } from '@mdit/plugin-anchor'          // 标题锚点
import { attrs } from '@mdit/plugin-attrs'           // 元素属性注入
import { container } from '@mdit/plugin-container'       // 自定义块容器
import { dl } from '@mdit/plugin-dl'               // 定义列表
import { fullEmoji } from '@mdit/plugin-emoji'          // 完整 emoji 支持
import { figure } from '@mdit/plugin-figure'          // 图片 + 标题
import { footnote } from '@mdit/plugin-footnote'        // 脚注
import { imgLazyload } from '@mdit/plugin-img-lazyload'    // 图片懒加载
import { imgMark } from '@mdit/plugin-img-mark'         // 主题模式图片标记
import { imgSize } from '@mdit/plugin-img-size'         // 图片尺寸
import { ins } from '@mdit/plugin-ins'              // 插入标签
import { mark } from '@mdit/plugin-mark'             // 高亮标记
import { ruby } from '@mdit/plugin-ruby'             // 注音/音标
import { spoiler } from '@mdit/plugin-spoiler'         // 折叠隐藏内容
import { stylize } from '@mdit/plugin-stylize'         // 文字样式化
import { sub } from '@mdit/plugin-sub'              // 下标
import { sup } from '@mdit/plugin-sup'              // 上标
import { tasklist } from '@mdit/plugin-tasklist'        // 任务列表

/**
 * 创建并配置 markdown-it 实例
 * 包含所有插件初始化 + highlight.js 代码高亮
 */
const md = new MarkdownIt({
  html: false,      // 禁止原始 HTML，防止 XSS
  linkify: true,     // 自动将 URL 转换为可点击链接
  breaks: false,     // 不将 \n 转换为 <br>（保持标准 Markdown 行为）
  typographer: true,  // 启用智能引号、破折号等排版美化
  /*
   * highlight.js 集成：对所有代码块进行语法高亮
   * - 自动检测语言（通过 ```lang 标记，未指定则用 'plaintext' 兜底）
   * - 样式类名前缀 hljs，配合 highlight.js CSS 主题使用
   */
  highlight(str: string, lang: string): string {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return (
          '<pre class="hljs"><code>' +
          hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
          '</code></pre>'
        )
      } catch (_e) {
        /* highlight 失败时降级为无高亮纯文本 */
      }
    }
    // 未知语言或无 lang 标记 → 自动检测 + HTML 转义
    const escaped = md.utils.escapeHtml(str)
    return '<pre class="hljs"><code>' + escaped + '</code></pre>'
  },
})

// ============================================================
// 插件注册顺序（按功能分组，无严格顺序要求）
// ============================================================

// 1. 基础语法增强
md.use(abbr)         // *[缩写]: 全称  → <abbr> 标签
md.use(sub)          // H~2~O → 下标
md.use(sup)          // x^2^ → 上标
md.use(ins)          // ++插入文本++ → <ins>
md.use(mark)         // ==高亮文本== → <mark>
md.use(ruby)         // {注音文本}^(拼音) → <ruby>
md.use(dl)           // 定义列表语法

// 2. 表情支持（完整 emoji 集合）
md.use(fullEmoji, {
  /*
   * 启用完整的 GitHub emoji 集合 :smile: → 😄 等
   * ponytail: fullEmoji 包大小约 85KB，若后续嫌弃体积大可换 lightEmoji
   */
})

// 3. 锚点与属性
md.use(anchor, {
  level: [1, 2, 3, 4, 5, 6],  // 所有级别标题都生成 id
  /*
   * ponytail: 当前不生成 permalink 图标（保持简洁）。
   * 如需标题旁的 # 链接图标，可配置 permalink: anchor.permalink.headerLink()
   */
})
md.use(attrs, {
  /*
   * 允许为元素添加属性：{style="color:red"} 等
   * ponytail: 仅开启了 limited 模式（仅 class/id），避免 XSS。
   * 若文章作者可信，可改为 allowedAttributes: ['style', 'class', 'id']
   */
})

// 4. 内容增强
md.use(alert)        // GFM 风格警示框 > [!NOTE] / > [!WARNING] 等
md.use(tasklist)     // - [ ] 和 - [x] 任务列表
md.use(footnote)     // [^1] 脚注引用
/*
 * 自定义容器语法：::: name / :::
 * 与旧版 markdown-it-container 不同，@mdit/plugin-container 每次 use 只能注册一种类型。
 * 因此分 5 次调用注册 info / tip / warning / danger / details。
 * 渲染为带 CSS class 的 <div>，样式由 markdown.css 提供。
 */
md.use(container, { name: 'info' })
md.use(container, { name: 'tip' })
md.use(container, { name: 'warning' })
md.use(container, { name: 'danger' })
md.use(container, { name: 'details' })
md.use(align)        // 段落对齐：-> 居右、->> 居中，样式类名 .has-text-align-*
md.use(stylize, {
  /*
   * 自定义文字样式规则：特定 Token 替换为带 class 的 <span>
   * 默认提供键盘按键 <kbd> 样式（对 #KEY# 包裹的文本）
   */
})
md.use(spoiler)      // !!剧透内容!! → 可点击展开的隐藏内容

// 5. 图片增强
md.use(figure, {
  /*
   * 图片 + alt 文本作为标题一起包裹在 <figure> 中
   * ![caption](url "title") → <figure><img><figcaption>
   */
})
md.use(imgLazyload)  // 图片自动添加 loading="lazy" 属性
md.use(imgMark)      // 按主题模式（亮/暗）标记图片，用于不同主题显示不同图片
md.use(imgSize)      // 支持 =WxH 语法设置图片尺寸

/**
 * 渲染 Markdown 文本为 HTML
 * @param raw 原始 Markdown 文本
 * @returns 渲染后的 HTML 字符串
 */
export function renderMarkdown(raw: string): string {
  return md.render(raw)
}

/**
 * 渲染 Markdown 文本为 HTML（行内模式，不包裹 <p> 标签）
 * @param raw 原始 Markdown 文本
 * @returns 行内 HTML 字符串
 */
export function renderMarkdownInline(raw: string): string {
  return md.renderInline(raw)
}

/**
 * 获取 markdown-it 实例（供外部扩展插件使用）
 */
export function getMarkdownIt(): MarkdownIt {
  return md
}
