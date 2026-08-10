<!--
  @Author: trae+glm-5.2
  @Date: 2026-08-09
  @Desc: 博客文章详情页
    - 根据路由参数 category 和 slug 动态匹配文章
    - 分类文章路由：/blog/:category/:slug
    - 根级文章路由：/blog/:slug（category 为空字符串）
    - 文章未找到时显示提示信息
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { renderMarkdown } from '@/utils/markdown/parser'
import { findPost } from '@/utils/markdown/loader'

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
</script>

<template>
  <article class="max-w-3xl mx-auto px-4 py-8">
    <!-- 面包屑：分类名 → 文章标题 -->
    <div v-if="post" class="mb-6 text-sm text-text opacity-50">
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

    <div v-html="html" />
  </article>
</template>