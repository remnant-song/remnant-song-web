/*
 * @Author: trae+glm-5.2
 * @Date: 2026-08-09
 * @Desc: Markdown 渲染器 —— 当前极简版，仅调用 markdown-it 做基础渲染
 */
import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({
    html: false,   // 暂不开启，安全第一
    linkify: true,
})

export function renderMarkdown(raw: string): string {
    return md.render(raw)
}