<!--
  @Author: trae+deepseek-v4-pro
  @Date: 2026-08-13
  @Desc: 传送门页面（AnimeRoom）
    重构后简化为两层：背景层 + 物件层
    背景层使用 bgImg_v3.png，物件层放置社交链接 RoomItem
  @Modify: trae+deepseek-v4-pro, 2026-08-13
    移除 ParticleField（粒子）、DecorationItem（装饰素材）、
    中景层（layerMid）、前景层（layerFront），仅保留核心两层
-->
<template>
  <div
      ref="roomContainer"
      class="relative w-full overflow-hidden cursor-crosshair"
      :style="{ height: '100vh' }"
      @mousemove="onMouseMove"
      @mouseleave="onMouseLeave"
  >
    <!--
      @Modify: trae+deepseek-v4-pro, 2026-08-13
        背景层移除视差 —— 固定不动，不再随鼠标浮动
    -->
    <div
        class="absolute inset-0 bg-cover bg-center"
        :style="{ backgroundImage: `url(${bgImg})` }"
    />

    <!--
      @Modify: trae+deepseek-v4-pro, 2026-08-13
        光线覆盖层 —— 固定全屏叠加，无缩放无位移
        shineOpacity 可调透明度（0~1），默认 0.5
    -->
    <div
        class="absolute inset-0 bg-cover bg-center pointer-events-none"
        :style="{
          backgroundImage: `url(${shineImg})`,
          opacity: shineOpacity,
          width: '70%',
          top: '20%',
          left: '16%',
        }"
    />

    <!-- 物件层（社交链接，可点击） -->
    <div
        ref="layerItems"
        class="absolute inset-0 will-change-transform"
        :style="{ transform: itemLayerTransform }"
    >
      <RoomItem
          v-for="item in items"
          :key="item.id"
          :item="item"
          :mouse-x="mouseX"
          :mouse-y="mouseY"
      />
    </div>
  </div>
</template>

<script setup>
/*
 * @Author: trae+deepseek-v4-pro
 * @Date: 2026-08-13
 * @Desc: 传送门页面逻辑
 *   两层结构：背景层（bgImg_v3）+ 物件层（社交链接 RoomItem）
 *   视差效果：背景层微弱移动（BG_MOVE），物件层较大移动（ITEMS_MOVE）
 */
import { ref, computed } from 'vue'
import gsap from 'gsap'
import RoomItem from '../components/common/RoomItem.vue'

/*
 * 素材导入 —— Vite inline :style 的 url() 不会自动解析，
 * 必须通过 import 获取构建后的真实 URL
 */
import bgImg from '@/assets/image/animeRoom/bgImg_v3.png'
import shineImg from '@/assets/image/animeRoom/shine.png'
import bilibiliMirrorImg from '@/assets/image/animeRoom/item/bilibili_mirror.png'
import githubImg from '@/assets/image/animeRoom/item/github.png'
import douyinImg from '@/assets/image/animeRoom/item/douyin.png'

// ==================== 容器与层 refs ====================
const roomContainer = ref(null)
const layerItems = ref(null)

// ==================== 鼠标归一化坐标（-0.5 ~ 0.5） ====================
const mouseX = ref(0)
const mouseY = ref(0)

// ==================== 光线覆盖层透明度（0~1，可调） ====================
const shineOpacity = ref(0.5)

// ==================== 视差强度系数（仅物件层） ====================
const ITEMS_MOVE = 40

// ==================== GSAP quickTo（仅物件层） ====================
let itemsToX, itemsToY

function initQuickTo() {
  if (layerItems.value) {
    itemsToX = gsap.quickTo(layerItems.value, 'x', { duration: 0.4, ease: 'power2.out' })
    itemsToY = gsap.quickTo(layerItems.value, 'y', { duration: 0.4, ease: 'power2.out' })
  }
}

import { onMounted } from 'vue'
onMounted(initQuickTo)

// ==================== 鼠标事件 ====================
function onMouseMove(e) {
  if (!roomContainer.value) return
  const rect = roomContainer.value.getBoundingClientRect()
  const nx = (e.clientX - rect.left) / rect.width - 0.5
  const ny = (e.clientY - rect.top) / rect.height - 0.5
  mouseX.value = nx
  mouseY.value = ny

  itemsToX?.(nx * ITEMS_MOVE * -1)
  itemsToY?.(ny * ITEMS_MOVE * -1)
}

function onMouseLeave() {
  mouseX.value = 0
  mouseY.value = 0
  itemsToX?.(0); itemsToY?.(0)
}

// ==================== computed 变换（仅物件层） ====================
const itemLayerTransform = computed(() => `translate(${mouseX.value * ITEMS_MOVE * -1}px, ${mouseY.value * ITEMS_MOVE * -1}px)`)

// ==================== 社交链接物件数据 ====================
const items = [
  {
    id: 'bilibili',
    imgSrc: bilibiliMirrorImg,
    label: 'Bilibili',
    url: 'https://space.bilibili.com/490572831',
    style: { left: '22%', top: '56%', width: '180px' }
  },
  {
    id: 'github',
    imgSrc: githubImg,
    label: 'GitHub',
    url: 'https://github.com/remnant-song',
    style: { left: '45%', top: '70%', width: '120px' }
  },
  {
    id: 'douyin',
    imgSrc: douyinImg,
    label: 'Douyin',
    url: 'https://github.com/你的ID',
    style: { left: '35%', top: '35%', width: '120px' }
  },
]
</script>