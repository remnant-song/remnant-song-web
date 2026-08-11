/*
 * @Author: trae+glm-5.2
 * @Date: 2026-08-09
 * @Modify: trae+deepseek-v4-pro, 2026-08-10, 提取 PostEntry 类型到 types.ts 共享
 * @Desc: 博客文章本地加载器
 *   - 使用 import.meta.glob 在构建时加载 src/content/posts/ 下所有 .md 文件
 *   - 分类依据：文件所在目录（相对于 posts/），根级文件分类为空字符串
 *   - 排序规则：按文件名降序（若文件名含 YYYY-MM-DD 前缀则天然按时间倒序）
 * ponytail: 当前为纯前端 glob 加载，未来切换到 GitHub 同步时，
 *   只需替换 loadAllPosts 的实现为读取 .cache/posts-index.json 即可，
 *   调用方（BlogListView / BlogPostView）无需改动。
 */

import type { PostEntry } from './types'

// 重新导出，保持向后兼容（已有调用方 import type { PostEntry } from '@/utils/markdown/loader'）
export type { PostEntry }

/**
 * 使用 Vite 的 import.meta.glob 在构建时一次性加载所有 Markdown 文件
 * - eager: true → 同步加载，避免列表页首屏空白
 * - as: 'raw' → 获取文件原始文本内容，不做任何转换
 */
const postModules = import.meta.glob('/src/content/posts/**/*.md', {
  as: 'raw',
  eager: true,
})

/**
 * 从 Markdown 正文中提取第一个 H1 作为标题
 * @param content 原始 Markdown 文本
 * @param fallbackSlug slug 兜底值
 */
function extractTitle(content: string, fallbackSlug: string): string {
  const match = content.match(/^#\s+(.+)$/m)
  if (match && match[1]) {
    return match[1].trim()
  }
  // 兜底：slug 转空格 + 首字母大写
  return fallbackSlug
    .replace(/-/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase())
}

/**
 * 加载所有文章并按文件名降序排列
 * @returns PostEntry[] 已排序的文章列表
 */
export function loadAllPosts(): PostEntry[] {
  const entries: PostEntry[] = []

  for (const [filePath, rawContent] of Object.entries(postModules)) {
    // 将绝对路径转为相对于 content/posts/ 的路径
    // 例如：/src/content/posts/tech/hello.md → tech/hello.md
    const relative = filePath.replace(/^.*\/content\/posts\//, '')
    const parts = relative.split('/')
    const fileName = parts[parts.length - 1]
    const slug = fileName.replace(/\.md$/, '')
    // 分类：文件在子目录中时取目录名，否则为空字符串
    const category = parts.length > 1 ? parts.slice(0, -1).join('/') : ''
    const content = rawContent as string

    entries.push({
      slug,
      category,
      title: extractTitle(content, slug),
      filePath,
      rawContent: content,
    })
  }

  // 按文件名降序（YYYY-MM-DD-slug.md 格式天然按时间倒序）
  entries.sort((a, b) => {
    const aName = a.filePath.slice(a.filePath.lastIndexOf('/') + 1)
    const bName = b.filePath.slice(b.filePath.lastIndexOf('/') + 1)
    return bName.localeCompare(aName)
  })

  console.log(
    `[loader] 加载 ${entries.length} 篇文章，` +
      `${new Set(entries.map((e) => e.category)).size} 个分类`
  )

  return entries
}

/**
 * 按分类和 slug 查找单篇文章
 * @param category 分类名（根级文件传空字符串）
 * @param slug     URL slug
 */
export function findPost(
  category: string,
  slug: string
): PostEntry | undefined {
  return loadAllPosts().find(
    (p) => p.category === category && p.slug === slug
  )
}

/**
 * 获取所有分类及其文章数量
 * ponytail: 分类数 < 20 时 O(n) 遍历足够，无需建索引
 */
export function getCategories(): { name: string; count: number }[] {
  const posts = loadAllPosts()
  const map = new Map<string, number>()
  for (const p of posts) {
    const name = p.category || 'uncategorized'
    map.set(name, (map.get(name) || 0) + 1)
  }
  return Array.from(map.entries()).map(([name, count]) => ({ name, count }))
}