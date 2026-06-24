<!--
  @Author: trae+claude
  @Date: 2026-06-24
  @Desc: 404 页面未找到视图
    当用户访问未定义路由时展示此页面，提供返回首页的引导
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <section class="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
    <!-- 404 大字 -->
    <h1 class="text-8xl sm:text-9xl font-heading text-accent opacity-80 mb-4">
      {{ t('notFound.title') }}
    </h1>

    <!-- 提示信息 -->
    <h2 class="text-2xl font-heading text-text mb-8">
      {{ t('notFound.message') }}
    </h2>

    <!-- 返回首页 -->
    <router-link
      to="/"
      class="inline-block px-6 py-3 rounded-lg border border-border text-text no-underline
             text-base transition-colors hover:border-accent hover:text-accent"
    >
      {{ t('notFound.goHome') }}
    </router-link>
  </section>
</template>
