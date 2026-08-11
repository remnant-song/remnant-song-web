/*
 * @Author: trae+deepseek-v4-pro
 * @Date: 2026-08-10
 * @Desc: Markdown 博客模块共享类型定义
 *   - 从 loader.ts 提取，供本地加载器和 GitHub 加载器共用
 *   - 保持接口兼容，调用方无需关心数据来源
 */

/** 单篇文章的元数据 + 原文 */
export interface PostEntry {
  /** URL 标识，取文件名去掉 .md 后缀 */
  slug: string
  /**
   * 分类名，即文件相对于仓库根目录（或 content/posts/）的目录路径
   * - 根级文件 → 空字符串
   * - 子目录文件 → 完整目录路径（如 "tech" 或 "tech/sub"）
   */
  category: string
  /** 文章标题，从正文第一个 H1 提取，找不到则用 slug 兜底 */
  title: string
  /** 原始文件路径，仅用于调试和排序 */
  filePath: string
  /** Markdown 原文，详情页渲染消费 */
  rawContent: string
}