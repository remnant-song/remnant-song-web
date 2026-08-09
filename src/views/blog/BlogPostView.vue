<!--
  @Author: trae+glm-5.2
  @Date: 2026-08-09
  @Desc: 博客文章详情页 —— Step 1 极简版，硬编码一篇 md，仅验证渲染链路
-->
<script setup lang="ts">
import { computed } from 'vue'
import { renderMarkdown } from '@/utils/markdown/parser'

/*
 * ponytail: 当前硬编码导入单篇 md 做验证。
 * 后续改为列表 + 动态 slug 时，这里只需改成 props.slug → 查找原文 → 渲染。
 */
import helloMd from '@/content/posts/task1.1.md?raw'

const html = computed(() => renderMarkdown(helloMd))
</script>

<template>
  <article class="max-w-3xl mx-auto px-4 py-8">
    <div v-html="html" />
  </article>
</template>