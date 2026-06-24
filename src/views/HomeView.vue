<!--
  @Author: trae+deepseek-v4-pro
  @Date: 2026-06-24
  @Desc: 首页视图组件
    展示个人网站的核心信息，包括问候语、角色定位和 CTA 按钮
    使用 vue-i18n 的 $t() 方法获取多语言文本
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <section class="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
    <!-- 问候语 -->
    <p class="text-lg text-accent mb-2">{{ t('home.greeting') }}</p>

    <!-- 网站名 / 人物名 -->
    <h1 class="text-5xl sm:text-6xl font-heading text-text-h mb-4">
      {{ t('app.title') }}
    </h1>

    <!-- 角色定位 -->
    <h2 class="text-2xl font-heading text-text font-normal mb-8">
      {{ t('home.role') }}
    </h2>

    <!-- CTA 按钮 -->
    <router-link
      to="/works"
      class="inline-block px-6 py-3 rounded-lg bg-accent text-white no-underline
             text-base font-medium transition-all hover:opacity-90 hover:shadow-lg"
    >
      {{ t('home.cta') }}
    </router-link>
  </section>
</template>
