/*
 * @Author: trae+deepseek-v4-pro
 * @Date: 2026-08-10
 * @Desc: GitHub 博客文章加载器
 *   - 通过 GitHub REST API 拉取远程仓库中的 Markdown 文件
 *   - 使用 Git Trees API（recursive=1）一次性获取完整文件树（1 次 API 调用）
 *   - 通过 raw.githubusercontent.com 获取文件原始内容（不计入 API 限速）
 *   - 过滤规则：排除 .obsidian/、resources/、"commit" 类型（git submodule）等
 *   - 分类依据：文件所在目录路径（相对于仓库根目录），嵌套目录保持完整路径
 *   - 排序规则：按文件名降序
 * ponytail: 当前每次页面加载都重新拉取，无缓存。后续可加 localStorage
 *   缓存 + ETag 条件请求减少 API 调用。
 */

import type { PostEntry } from './types'

// ============================================================
// 环境变量读取（由 Vite 在构建时注入 import.meta.env）
// ============================================================
const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN as string
const GITHUB_OWNER = import.meta.env.VITE_GITHUB_OWNER as string
const GITHUB_REPO = import.meta.env.VITE_GITHUB_REPO as string
const GITHUB_BRANCH = import.meta.env.VITE_GITHUB_BRANCH as string

// ============================================================
// 常量
// ============================================================

/** 需要排除的目录前缀（Obsidian 配置、资源文件等） */
const EXCLUDED_DIR_PREFIXES = ['.obsidian/', 'resources/']

/** 需要排除的根级文件 */
const EXCLUDED_ROOT_FILES = ['.gitmodules']

/** GitHub API 基础 URL */
const API_BASE = 'https://api.github.com'

/** 请求头（含认证 Token） */
function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`
  }
  return headers
}

// ============================================================
// 类型定义
// ============================================================

/** GitHub Tree API 返回的单个条目 */
interface GitHubTreeItem {
  path: string
  mode: string
  type: 'blob' | 'tree' | 'commit'
  sha: string
  size?: number
  url: string
}

/**
 * 从 Markdown 正文中提取第一个 H1 作为标题
 * 与 loader.ts 中的 extractTitle 逻辑一致
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

// ============================================================
// 核心函数
// ============================================================

/**
 * 判断文件路径是否应被排除
 * @param path 文件相对路径
 * @param type Git 对象类型
 */
function shouldExclude(path: string, type: string): boolean {
  // 排除 git submodule（type === "commit"）
  if (type === 'commit') return true

  // 排除特定根级文件
  if (EXCLUDED_ROOT_FILES.includes(path)) return true

  // 排除特定目录下的所有文件
  for (const prefix of EXCLUDED_DIR_PREFIXES) {
    if (path.startsWith(prefix)) return true
  }

  return false
}

/**
 * 从 GitHub Tree API 获取完整文件列表
 * 一次 API 调用即可获取仓库所有文件的扁平列表
 * @returns 过滤后的 .md 文件条目列表
 */
async function fetchFileTree(): Promise<GitHubTreeItem[]> {
  const url = `${API_BASE}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/trees/${GITHUB_BRANCH}?recursive=1`

  console.log(`[github-loader] 请求文件树: ${url}`)

  const response = await fetch(url, { headers: buildHeaders() })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '无响应体')
    throw new Error(
      `[github-loader] 获取文件树失败 (HTTP ${response.status}): ${errorText}`
    )
  }

  const data = await response.json()
  const allItems: GitHubTreeItem[] = data.tree || []

  console.log(`[github-loader] 仓库共 ${allItems.length} 个条目`)

  // 过滤：仅保留 .md 文件，排除非文章内容
  const mdFiles = allItems.filter((item) => {
    if (item.type !== 'blob') return false
    if (!item.path.endsWith('.md')) return false
    if (shouldExclude(item.path, item.type)) return false
    return true
  })

  console.log(
    `[github-loader] 过滤后 ${mdFiles.length} 个 .md 文件:\n` +
      mdFiles.map((f) => `  - ${f.path}`).join('\n')
  )

  return mdFiles
}

/**
 * 通过 raw.githubusercontent.com 获取文件原始内容
 * raw 域名走 CDN，不计入 GitHub API 限速配额
 * @param filePath 文件相对于仓库根目录的路径
 * @returns 文件原始文本内容
 */
async function fetchRawContent(filePath: string): Promise<string> {
  const url = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${filePath}`

  const response = await fetch(url)

  if (!response.ok) {
    console.warn(
      `[github-loader] 获取文件内容失败: ${filePath} (HTTP ${response.status})`
    )
    return ''
  }

  return response.text()
}

/**
 * 从文件路径中解析分类和 slug
 *
 * 分类规则：
 * - 根级文件（如 requirements.md）→ category = ''（空字符串）
 * - 子目录文件（如 dream/钢琴.md）→ category = "dream"
 * - 嵌套子目录（如 Exploration and Reflection/子目录/xxx.md）
 *   → category = "Exploration and Reflection/子目录"
 *
 * slug 规则：
 * - 文件名去掉 .md 后缀
 *
 * @param filePath 文件相对于仓库根目录的路径
 */
function parsePath(filePath: string): { category: string; slug: string } {
  const parts = filePath.split('/')
  const fileName = parts[parts.length - 1]
  const slug = fileName.replace(/\.md$/, '')

  // 根级文件：category 为空字符串
  if (parts.length === 1) {
    return { category: '', slug }
  }

  // 子目录文件：category 为完整目录路径
  const category = parts.slice(0, -1).join('/')
  return { category, slug }
}

/**
 * 加载 GitHub 仓库中所有 Markdown 文章
 *
 * 工作流：
 * 1. 调用 Git Trees API 获取完整文件树（1 次 API 请求）
 * 2. 过滤出 .md 文件
 * 3. 并发获取所有文件原始内容（raw.githubusercontent.com，不限速）
 * 4. 解析标题、分类、slug
 * 5. 按文件名降序排列
 *
 * @returns 已排序的文章列表
 */
export async function loadAllPostsFromGitHub(): Promise<PostEntry[]> {
  console.log('[github-loader] 开始从 GitHub 加载文章...')

  // 1. 获取文件树
  const mdFiles = await fetchFileTree()

  if (mdFiles.length === 0) {
    console.warn('[github-loader] 仓库中未找到符合条件的 .md 文件')
    return []
  }

  // 2. 并发获取所有文件原始内容
  const rawContents = await Promise.all(
    mdFiles.map((file) => fetchRawContent(file.path))
  )

  // 3. 组装 PostEntry 列表
  const entries: PostEntry[] = []
  for (let i = 0; i < mdFiles.length; i++) {
    const file = mdFiles[i]
    const content = rawContents[i]

    if (!content) {
      // 内容获取失败，跳过该文章
      console.warn(`[github-loader] 跳过空内容文件: ${file.path}`)
      continue
    }

    const { category, slug } = parsePath(file.path)

    entries.push({
      slug,
      category,
      title: extractTitle(content, slug),
      filePath: file.path,
      rawContent: content,
    })
  }

  // 4. 按文件名降序排列
  entries.sort((a, b) => {
    const aName = a.filePath.slice(a.filePath.lastIndexOf('/') + 1)
    const bName = b.filePath.slice(b.filePath.lastIndexOf('/') + 1)
    return bName.localeCompare(aName)
  })

  console.log(
    `[github-loader] 加载完成: ${entries.length} 篇文章，` +
      `${new Set(entries.map((e) => e.category)).size} 个分类`
  )

  return entries
}

/**
 * 按分类和 slug 从 GitHub 仓库中查找单篇文章
 * 先加载全部文章再过滤（与本地 loader 的 findPost 行为一致）
 * @param category 分类名（根级文件传空字符串）
 * @param slug     URL slug
 */
export async function findPostFromGitHub(
  category: string,
  slug: string
): Promise<PostEntry | undefined> {
  const posts = await loadAllPostsFromGitHub()
  return posts.find((p) => p.category === category && p.slug === slug)
}

/**
 * 获取 GitHub 仓库中所有分类及其文章数量
 * @returns 分类名 + 文章数列表
 */
export async function getCategoriesFromGitHub(): Promise<
  { name: string; count: number }[]
> {
  const posts = await loadAllPostsFromGitHub()
  const map = new Map<string, number>()
  for (const p of posts) {
    const name = p.category || 'uncategorized'
    map.set(name, (map.get(name) || 0) + 1)
  }
  return Array.from(map.entries()).map(([name, count]) => ({ name, count }))
}