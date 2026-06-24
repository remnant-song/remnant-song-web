/*
 * @Author: trae+deepseek-v4-pro
 * @Date: 2026-06-24
 * @Desc: 国际化 (i18n) 核心配置
 *   - 使用 vue-i18n v9 与 Vue 3 组合式 API 兼容
 *   - 默认语言：根据浏览器语言降级选择，fallback 为 'en'
 *   - 语言选择持久化到 localStorage
 *   - 提供切换语言函数 switchLanguage
 */

import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import zhCN from './locales/zh-CN.json'

/** localStorage 存储语言偏好的 key */
const LANG_STORAGE_KEY = 'remnant-song-lang'

/**
 * 从 localStorage 读取已保存的语言偏好
 * 若无保存值则根据浏览器语言降级选择
 * @returns 语言代码 ('en' | 'zh-CN')
 */
function getDefaultLanguage(): string {
  // 1. 优先读取 localStorage 中持久化的语言偏好
  const saved = localStorage.getItem(LANG_STORAGE_KEY)
  if (saved === 'en' || saved === 'zh-CN') {
    console.log(`[i18n] 从 localStorage 恢复语言偏好: ${saved}`)
    return saved
  }

  // 2. 降级：根据浏览器语言自动选择
  const browserLang = navigator.language
  console.log(`[i18n] 浏览器语言: ${browserLang}`)

  if (browserLang.startsWith('zh')) {
    console.log('[i18n] 匹配到中文，使用 zh-CN')
    return 'zh-CN'
  }

  // 3. 默认使用英语
  console.log('[i18n] 默认使用英语 (en)')
  return 'en'
}

/**
 * i18n 实例
 * - legacy: false 开启组合式 API 模式
 * - globalInjection: true 允许在模板中使用 $t()
 * - fallbackLocale: 翻译缺失时回退到英语
 */
const i18n = createI18n({
  legacy: false,
  locale: getDefaultLanguage(),
  fallbackLocale: 'en',
  globalInjection: true,
  messages: {
    en,
    'zh-CN': zhCN,
  },
})

/**
 * 切换语言并在 localStorage 中持久化
 * @param lang 目标语言代码 ('en' | 'zh-CN')
 */
export function switchLanguage(lang: string): void {
  if (lang === 'en' || lang === 'zh-CN') {
    console.log(`[i18n] 切换语言: ${i18n.global.locale.value} → ${lang}`)
    i18n.global.locale.value = lang
    localStorage.setItem(LANG_STORAGE_KEY, lang)
    // 更新 <html lang> 属性，确保可访问性
    document.documentElement.lang = lang
  } else {
    console.warn(`[i18n] 不支持的语言代码: ${lang}，忽略切换`)
  }
}

/**
 * 获取当前语言代码
 * @returns 当前语言代码
 */
export function getCurrentLanguage(): string {
  return i18n.global.locale.value
}

export default i18n
