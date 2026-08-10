<!--
  @Author: trae+glm-5.2
  @Date: 2026-08-09
  @Modify: trae+deepseek-v4-pro, 2026-08-10,
    引入 markdown-body 样式、highlight.js 主题、mdit-plugins 附加样式；
    添加 spoiler 点击展开交互；
    新增 onMounted 钩子初始化文章内的交互元素
  @Desc: 博客文章详情页
    - 根据路由参数 category 和 slug 动态匹配文章
    - 分类文章路由：/blog/:category/:slug
    - 根级文章路由：/blog/:slug（category 为空字符串）
    - 文章未找到时显示提示信息
-->
<script setup lang="ts">
import { computed, onMounted, onBeforeUpdate, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { renderMarkdown } from '@/utils/markdown/parser'
import { findPost } from '@/utils/markdown/loader'

/*
 * 引入全量 Markdown 美化样式：
 * - github-markdown-css：GitHub 官方 Markdown 排版
 * - highlight.js 主题：GitHub 代码高亮
 * - mdit-plugins 附加样式：alert / container / spoiler / footnote 等
 */
import '@/styles/markdown.css'

const route = useRoute()

/*
 * 分类：从路由 params 获取
 * - /blog/:slug → category 为 undefined，取空字符串
 * - /blog/:category/:slug → category 有值
 */
const category = (route.params.category as string) || ''
const slug = route.params.slug as string

const post = findPost(category, slug)

const html = computed(() => {
  if (!post) {
    return '<p class="text-text opacity-50 text-center py-16">文章未找到</p>'
  }
  return renderMarkdown(post.rawContent)
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

onMounted(() => {
  nextTick(() => {
    initPostInteractions()
  })
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
  <article v-if="post" class="max-w-3xl mx-auto px-4 py-8">
    <!-- 面包屑：分类名 → 文章标题 -->
    <div class="mb-6 text-sm text-text opacity-50">
      <router-link to="/blog" class="text-accent no-underline hover:underline">
        博客
      </router-link>
      <template v-if="post.category">
        <span class="mx-2">/</span>
        <router-link
          :to="`/blog?category=${post.category}`"
          class="text-accent no-underline hover:underline"
        >
          {{ post.category }}
        </router-link>
      </template>
      <span class="mx-2">/</span>
      <span>{{ post.title }}</span>
    </div>

    <!--
      markdown-body：github-markdown-css 的作用域 class
      所有 GitHub 风格排版仅在 .markdown-body 内生效
    -->
    <div class="markdown-body" v-html="html" />
  </article>

  <!-- 文章未找到 -->
  <article v-else class="max-w-3xl mx-auto px-4 py-8">
    <div class="text-center py-16">
      <p class="text-lg text-text opacity-50">文章未找到</p>
      <router-link
        to="/blog"
        class="text-sm text-accent no-underline hover:underline mt-4 inline-block"
      >
        ← 返回博客列表
      </router-link>
    </div>
  </article>
</template>
