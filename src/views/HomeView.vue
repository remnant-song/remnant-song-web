<!--
  @Author: trae+deepseek-v4-pro
  @Date: 2026-06-24
  @Desc: 首页视图组件
    展示个人网站的核心信息，包括问候语、角色定位和 CTA 按钮
    使用 vue-i18n 的 $t() 方法获取多语言文本
-->

<script setup lang="ts">
import ArtTitle from '@/components/common/ArtTitle.vue'
</script>

<template>
<!--  <FluidBackground/>-->
  <ArtTitle
      text="REMNANT SONG"
      show-background="brush"
      animate
      :animation-speed="1.5"
      :spacing="[90, 90, 110, 100, 100, 100, 50, 90, 90, 100, 100]"
  />
</template>
