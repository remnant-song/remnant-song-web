<!--
  @Author: trae+claude
  @Date: 2026-06-24
  @Desc: Vue 根组件
    作为应用的最外层容器，直接渲染布局组件
    布局组件内部通过 <router-view> 管理页面切换
-->

<script setup lang="ts">
import DefaultLayout from '@/layouts/DefaultLayout.vue'
</script>

<template>
  <DefaultLayout />
</template>
