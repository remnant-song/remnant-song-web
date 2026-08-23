<!--
  @Author: trae+deepseek-v4-pro
  @Date: 2026-08-13
  @Desc: 装饰物件组件（纯展示，无交互）
    与 RoomItem 的区别：
    - 无 hover 悬停对话框
    - 无 click 点击跳转
    - 无 hover 放大/发光效果
    - 仅保留视差偏移跟随鼠标移动
    用于房间场景中的静态装饰素材（书架、台灯、花瓶等）
-->

<template>
  <div
      class="absolute pointer-events-none"
      :style="{
      left: item.style.left,
      top: item.style.top,
      width: item.style.width,
      height: item.style.height,
      transform: `translate(${parallaxOffset.x}px, ${parallaxOffset.y}px)`,
      transition: 'transform 0.1s linear'
    }"
  >
    <img
        :src="item.imgSrc"
        :alt="item.id"
        class="w-full h-full object-contain drop-shadow-lg"
    />
  </div>
</template>

<script setup lang="ts">
/*
 * @Author: trae+deepseek-v4-pro
 * @Date: 2026-08-13
 * @Desc: 装饰物件脚本逻辑
 *   - 接收父组件传入的鼠标坐标，计算视差偏移
 *   - pointer-events-none 确保不阻挡下方 RoomItem 的点击
 */
import { computed } from 'vue'

interface DecorationItem {
  id: string
  imgSrc: string
  style: {
    left: string
    top: string
    width: string
    height?: string
  }
}

const props = defineProps<{
  item: DecorationItem
  mouseX: number
  mouseY: number
}>()

/** 装饰物件的微小视差偏移（与 RoomItem 保持一致的计算逻辑） */
const parallaxOffset = computed(() => ({
  x: props.mouseX * 8,
  y: props.mouseY * 8,
}))
</script>