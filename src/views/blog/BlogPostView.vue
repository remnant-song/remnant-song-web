<!--
  @Author: trae+glm-5.2
  @Date: 2026-08-09
  @Modify: trae+deepseek-v4-pro, 2026-08-10,
    引入 markdown-body 样式、highlight.js 主题、mdit-plugins 附加样式；
    添加 spoiler 点击展开交互；
    新增 onMounted 钩子初始化文章内的交互元素；
    支持双数据源：本地 glob 加载（local）与 GitHub API 加载（github）；
    路由改为 catch-all 模式（/blog/:pathMatch(.*)*），支持任意层级嵌套分类
  @Desc: 博客文章详情页
    - 路由为 /blog/:pathMatch(.*)*，最后一个路径段为 slug，其余为 category
    - 支持任意层级嵌套分类（如 /blog/A/B/C/slug）
    - 文章未找到时显示提示信息
-->
<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUpdate, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { renderMarkdown } from '@/utils/markdown/parser'
import type { PostEntry } from '@/utils/markdown/types'

/*
 * 引入全量 Markdown 美化样式：
 * - github-markdown-css：GitHub 官方 Markdown 排版
 * - highlight.js 主题：GitHub 代码高亮
 * - mdit-plugins 附加样式：alert / container / spoiler / footnote 等
 */
import '@/styles/markdown.css'

const route = useRoute()

// ============================================================
// 数据源切换
// ============================================================
const postSource = import.meta.env.VITE_POST_SOURCE as string

/*
 * 路由参数解析（catch-all 模式，路由为 /blog/:pathMatch(.*)*）
 * pathMatch 为字符串数组，最后一个元素为 slug，其余元素拼接为 category
 * 示例：
 *   /blog/requirements → pathMatch=["requirements"], slug="requirements", category=""
 *   /blog/dream/钢琴 → pathMatch=["dream","钢琴"], slug="钢琴", category="dream"
 *   /blog/Exploration and Reflection/首屏/前端3d → pathMatch=["Exploration and Reflection","首屏","前端3d"], slug="前端3d", category="Exploration and Reflection/首屏"
 */
const pathMatch = computed(() => (route.params.pathMatch as string[]) || [])
const slug = computed(() => {
  const arr = pathMatch.value
  return arr.length > 0 ? arr[arr.length - 1] : ''
})
const category = computed(() => {
  const arr = pathMatch.value
  return arr.length > 1 ? arr.slice(0, -1).join('/') : ''
})

/** 文章对象（null = 加载中，undefined = 未找到） */
const post = ref<PostEntry | undefined | null>(null)

/** 加载状态 */
const loading = ref(true)

/** 加载错误信息 */
const error = ref<string | null>(null)

const html = computed(() => {
  if (loading.value) {
    return '<p class="text-text opacity-50 text-center py-16">加载中...</p>'
  }
  if (error.value) {
    return `<p class="text-red-500 text-center py-16">加载失败: ${error.value}</p>`
  }
  if (!post.value) {
    return '<p class="text-text opacity-50 text-center py-16">文章未找到</p>'
  }
  return renderMarkdown(post.value.rawContent)
})

/**
 * 初始化文章内的交互元素
 * - spoiler（剧透）：点击展开/隐藏
 * ponytail: 当前仅 spoiler 需要 JS 交互，后续如添加 mermaid/
 *   tab 等插件时需在此扩展初始化逻辑
 */
function initPostInteractions(): void {
  // spoiler 点击展开交互
  const spoilers = document.querySelectorAll('.markdown-body .spoiler')
  spoilers.forEach((el) => {
    // 避免重复绑定
    if ((el as HTMLElement).dataset.spoilerInit === 'true') return
    ;(el as HTMLElement).dataset.spoilerInit = 'true'

    el.addEventListener('click', () => {
      el.classList.toggle('revealed')
    })
  })
}

let initTimer: ReturnType<typeof setTimeout> | null = null

// ============================================================
// 文章加载函数（onMounted 和 watch 共用）
// ============================================================
async function loadPost() {
  loading.value = true
  error.value = null

  try {
    if (postSource === 'github') {
      /*
       * @Modify: trae+deepseek-v4-pro, 2026-08-12
       *   改用 findPostFromRemote，内部自动降级：
       *   GitHub 8 秒超时 → 自动切换 Gitee 镜像
       */
      const { findPostFromRemote } = await import(
        '@/utils/markdown/github-loader'
      )
      post.value = await findPostFromRemote(category.value, slug.value)
    } else {
      const { findPost } = await import('@/utils/markdown/loader')
      post.value = findPost(category.value, slug.value)
    }
  } catch (err) {
    console.error('[BlogPostView] 加载文章失败:', err)
    error.value = err instanceof Error ? err.message : '未知错误'
  } finally {
    loading.value = false
  }

  // 初始化交互元素
  nextTick(() => {
    initPostInteractions()
  })
}

// ============================================================
// 生命周期
// ============================================================
onMounted(() => {
  loadPost()
})

/*
 * 路由切换时（同一组件复用），重新加载文章
 * 同时重新初始化交互元素
 */
watch([category, slug], () => {
  loadPost()
})

/*
 * 路由切换时（同一组件复用），v-html 更新后 DOM 也变了，
 * 需要重新初始化交互。
 * ponytail: beforeUpdate + nextTick 的组合可覆盖大部分场景，
 * 若出现边缘情况（如极慢渲染），可改用 MutationObserver
 */
onBeforeUpdate(() => {
  if (initTimer) clearTimeout(initTimer)
  initTimer = setTimeout(() => {
    initPostInteractions()
  }, 0)
})
</script>

<template>
  <article class="max-w-3xl mx-auto px-4 py-8">
    <!-- 面包屑：始终显示 -->
    <div class="mb-6 text-sm text-text opacity-50">
      <router-link to="/blog" class="text-accent no-underline hover:underline">
        博客
      </router-link>
      <template v-if="post && post.category">
        <span class="mx-2">/</span>
        <router-link
          :to="`/blog?category=${post.category}`"
          class="text-accent no-underline hover:underline"
        >
          {{ post.category }}
        </router-link>
      </template>
      <span class="mx-2">/</span>
      <span>{{ post?.title || slug }}</span>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="text-center py-16 text-text opacity-50">
      <p class="text-lg">加载中...</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="text-center py-16">
      <p class="text-lg text-red-500">加载失败</p>
      <p class="text-sm text-text opacity-50 mt-2">{{ error }}</p>
      <router-link
        to="/blog"
        class="text-sm text-accent no-underline hover:underline mt-4 inline-block"
      >
        ← 返回博客列表
      </router-link>
    </div>

    <!-- 文章未找到 -->
    <div v-else-if="!post" class="text-center py-16">
      <p class="text-lg text-text opacity-50">文章未找到</p>
      <router-link
        to="/blog"
        class="text-sm text-accent no-underline hover:underline mt-4 inline-block"
      >
        ← 返回博客列表
      </router-link>
    </div>

    <!-- 文章内容 -->
    <template v-else>
      <!--
        markdown-body：github-markdown-css 的作用域 class
        所有 GitHub 风格排版仅在 .markdown-body 内生效
      -->
      <div class="markdown-body" v-html="html" />
    </template>
  </article>
</template>