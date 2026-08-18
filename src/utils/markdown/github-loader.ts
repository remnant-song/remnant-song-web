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

/*
 * @Author: trae+deepseek-v4-pro
 * @Date: 2026-08-12
 * @Desc: Gitee 镜像仓库配置（国内降级方案）
 *   当 GitHub 因大陆网络问题不可用时，自动切换到 Gitee 镜像
 *   Gitee API 格式与 GitHub 基本一致，可复用 GitHubTreeItem 类型
 */
const GITEE_OWNER = import.meta.env.VITE_GITEE_OWNER as string
const GITEE_REPO = import.meta.env.VITE_GITEE_REPO as string
const GITEE_BRANCH = import.meta.env.VITE_GITEE_BRANCH as string
const GITEE_TOKEN = import.meta.env.VITE_GITEE_TOKEN as string

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

// ============================================================
// Gitee 镜像加载器（国内降级方案）
// ============================================================
/*
 * @Author: trae+deepseek-v4-pro
 * @Date: 2026-08-12
 * @Desc: Gitee 镜像仓库文章加载器
 *   - API 格式与 GitHub 高度相似，复用 GitHubTreeItem 类型
 *   - Gitee API 基础 URL: https://gitee.com/api/v5
 *   - Raw 内容 URL: https://gitee.com/{owner}/{repo}/raw/{branch}/{path}
 *   - 认证方式：access_token 查询参数
 * ponytail: Gitee API 响应结构与 GitHub 一致，未做深度适配；
 *   若 Gitee API 变更导致字段差异，需在此处补充映射逻辑
 */

/** Gitee API 基础 URL */
const GITEE_API_BASE = 'https://gitee.com/api/v5'

/**
 * 从 Gitee Git Trees API 获取完整文件列表
 * 与 GitHub 版本 fetchFileTree 逻辑对称，仅 API 端点和认证方式不同
 * @returns 过滤后的 .md 文件条目列表
 */
async function fetchFileTreeFromGitee(): Promise<GitHubTreeItem[]> {
  let url = `${GITEE_API_BASE}/repos/${GITEE_OWNER}/${GITEE_REPO}/git/trees/${GITEE_BRANCH}?recursive=1`

  // Gitee 使用 access_token 查询参数认证
  if (GITEE_TOKEN) {
    url += `&access_token=${GITEE_TOKEN}`
  }

  console.log(`[gitee-loader] 请求文件树: ${url}`)

  const response = await fetch(url)

  if (!response.ok) {
    const errorText = await response.text().catch(() => '无响应体')
    throw new Error(
      `[gitee-loader] 获取文件树失败 (HTTP ${response.status}): ${errorText}`
    )
  }

  const data = await response.json()
  const allItems: GitHubTreeItem[] = data.tree || []

  console.log(`[gitee-loader] 仓库共 ${allItems.length} 个条目`)

  // 过滤：仅保留 .md 文件，排除非文章内容（与 GitHub 版本过滤逻辑一致）
  const mdFiles = allItems.filter((item) => {
    if (item.type !== 'blob') return false
    if (!item.path.endsWith('.md')) return false
    if (shouldExclude(item.path, item.type)) return false
    return true
  })

  console.log(
    `[gitee-loader] 过滤后 ${mdFiles.length} 个 .md 文件:\n` +
      mdFiles.map((f) => `  - ${f.path}`).join('\n')
  )

  return mdFiles
}

/**
 * 通过 Gitee API contents 端点获取文件原始内容
 * Gitee raw 域名不支持 CORS，改用 API 端点（返回 base64 编码）
 * API 端点: GET /api/v5/repos/{owner}/{repo}/contents/{path}?ref={branch}
 * @param filePath 文件相对于仓库根目录的路径
 * @returns 文件原始文本内容
 */
async function fetchRawContentFromGitee(filePath: string): Promise<string> {
  let url = `${GITEE_API_BASE}/repos/${GITEE_OWNER}/${GITEE_REPO}/contents/${encodeURIComponent(filePath)}?ref=${GITEE_BRANCH}`

  // Gitee 使用 access_token 查询参数认证
  if (GITEE_TOKEN) {
    url += `&access_token=${GITEE_TOKEN}`
  }

  const response = await fetch(url)

  if (!response.ok) {
    console.warn(
      `[gitee-loader] 获取文件内容失败: ${filePath} (HTTP ${response.status})`
    )
    return ''
  }

  const data = await response.json()

  // Gitee API contents 端点返回 base64 编码的内容
  if (data.encoding === 'base64' && data.content) {
    // atob 解码 base64 字符串
    return atob(data.content)
  }

  console.warn(
    `[gitee-loader] 文件内容格式异常: ${filePath}, encoding=${data.encoding}`
  )
  return ''
}

/**
 * 从 Gitee 镜像仓库加载所有 Markdown 文章
 * 工作流与 loadAllPostsFromGitHub 完全对称
 * @returns 已排序的文章列表
 */
async function loadAllPostsFromGitee(): Promise<PostEntry[]> {
  console.log('[gitee-loader] 开始从 Gitee 加载文章...')

  const mdFiles = await fetchFileTreeFromGitee()

  if (mdFiles.length === 0) {
    console.warn('[gitee-loader] 仓库中未找到符合条件的 .md 文件')
    return []
  }

  const rawContents = await Promise.all(
    mdFiles.map((file) => fetchRawContentFromGitee(file.path))
  )

  const entries: PostEntry[] = []
  for (let i = 0; i < mdFiles.length; i++) {
    const file = mdFiles[i]
    const content = rawContents[i]

    if (!content) {
      console.warn(`[gitee-loader] 跳过空内容文件: ${file.path}`)
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

  entries.sort((a, b) => {
    const aName = a.filePath.slice(a.filePath.lastIndexOf('/') + 1)
    const bName = b.filePath.slice(b.filePath.lastIndexOf('/') + 1)
    return bName.localeCompare(aName)
  })

  console.log(
    `[gitee-loader] 加载完成: ${entries.length} 篇文章，` +
      `${new Set(entries.map((e) => e.category)).size} 个分类`
  )

  return entries
}

// ============================================================
// 降级包装函数（对外暴露的统一入口）
// ============================================================
/*
 * @Author: trae+deepseek-v4-pro
 * @Date: 2026-08-12
 * @Desc: 带降级能力的远程文章加载器
 *   - 优先从 GitHub 加载，设置 8 秒超时
 *   - GitHub 失败（超时/网络错误/HTTP 错误）时自动降级到 Gitee 镜像
 *   - 双源均失败时才抛出错误
 *   - 对调用方（Vue 组件）完全透明，无需感知降级过程
 *
 * 降级触发条件（任一满足即触发）：
 *   1. GitHub 请求超时（> 8 秒无响应）→ 大陆网络不通的典型表现
 *   2. fetch 抛出网络异常（DNS 失败、连接重置等）
 *   3. GitHub API 返回非 2xx 状态码（403 限速、5xx 服务端错误等）
 */

/** GitHub 请求超时时间（毫秒），超过此时间视为不可用 */
const GITHUB_TIMEOUT_MS = 3000

/**
 * 带超时和降级的文章列表加载
 * 先尝试 GitHub，失败后自动切换 Gitee
 * @returns 已排序的文章列表
 */
export async function loadAllPostsFromRemote(): Promise<PostEntry[]> {
  console.log('[remote-loader] 开始加载文章（优先 GitHub，降级 Gitee）...')

  try {
    // 带超时的 GitHub 请求：8 秒内未响应则视为不可用
    const result = await Promise.race([
      loadAllPostsFromGitHub(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('[remote-loader] GitHub 请求超时（8s）')),
          GITHUB_TIMEOUT_MS
        )
      ),
    ])
    console.log('[remote-loader] GitHub 加载成功')
    return result
  } catch (githubErr) {
    // GitHub 失败，降级到 Gitee
    console.warn(
      '[remote-loader] GitHub 加载失败，降级到 Gitee 镜像:',
      githubErr instanceof Error ? githubErr.message : githubErr
    )

    try {
      const result = await loadAllPostsFromGitee()
      console.log('[remote-loader] Gitee 降级加载成功')
      return result
    } catch (giteeErr) {
      // 双源均失败，抛出合并错误
      console.error('[remote-loader] Gitee 降级也失败:', giteeErr)
      throw new Error(
        `[remote-loader] 文章加载失败（GitHub 和 Gitee 均不可用）。` +
          `GitHub 错误: ${githubErr instanceof Error ? githubErr.message : String(githubErr)}；` +
          `Gitee 错误: ${giteeErr instanceof Error ? giteeErr.message : String(giteeErr)}`
      )
    }
  }
}

/**
 * 带降级的单篇文章查找
 * 通过 loadAllPostsFromRemote 加载全量文章后过滤
 * @param category 分类名（根级文件传空字符串）
 * @param slug     URL slug
 */
export async function findPostFromRemote(
  category: string,
  slug: string
): Promise<PostEntry | undefined> {
  const posts = await loadAllPostsFromRemote()
  return posts.find((p) => p.category === category && p.slug === slug)
}