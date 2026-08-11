/*
 * @Author: trae+deepseek-v4-pro
 * @Date: 2026-06-24
 * @Desc: Vite 环境变量类型声明
 *   扩展 ImportMetaEnv 接口，为项目使用的所有环境变量提供类型提示
 *   使用方式：import.meta.env.VITE_R2_BASE_URL
 */

/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** R2 存储外链基础 URL，用于资源（图片/字体等）加载 */
  readonly VITE_R2_BASE_URL: string
  /** 应用标题，可在不同部署环境自定义 */
  readonly VITE_APP_TITLE: string
  /** API 基础路径（预留，后续对接后端时使用） */
  readonly VITE_API_BASE_URL: string
  /** 是否开启调试模式 */
  readonly VITE_DEBUG: string
  /**
   * 文章数据源
   * - 'local'：本地 src/content/posts/ 下 .md 文件
   * - 'github'：远程 GitHub 仓库拉取
   */
  readonly VITE_POST_SOURCE: 'local' | 'github'
  /** GitHub 仓库所有者 */
  readonly VITE_GITHUB_OWNER: string
  /** GitHub 仓库名 */
  readonly VITE_GITHUB_REPO: string
  /** GitHub 分支名 */
  readonly VITE_GITHUB_BRANCH: string
  /** GitHub Personal Access Token（提升 API 限速） */
  readonly VITE_GITHUB_TOKEN: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
