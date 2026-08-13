<template>
  <div
      ref="roomContainer"
      class="relative w-full overflow-hidden cursor-crosshair"
      :style="{ height: 'calc(100vh - 4rem)' }"
      @mousemove="onMouseMove"
      @mouseleave="onMouseLeave"
  >
    <!-- 远景层 -->
    <div
        ref="layerFar"
        class="absolute inset-0 bg-cover bg-center will-change-transform"
        :style="{ backgroundImage: `url(${farBg})`, transform: farTransform }"
    />

    <!--
      中景层 —— 暂时注释，图片资源 /images/room/bg-mid.png 尚不存在
    <div
        ref="layerMid"
        class="absolute inset-0 bg-cover bg-center will-change-transform"
        :style="{ backgroundImage: `url('/images/room/bg-mid.png')`, transform: midTransform }"
    />
    -->


    <ParticleField />

    <!-- 物件层 (所有RoomItem放在这里) -->
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

<!--    <div-->
<!--        ref="layerFront"-->
<!--        class="absolute inset-0 bg-cover bg-center pointer-events-none will-change-transform"-->
<!--        :style="{ backgroundImage: `url('${frontBg}')`, transform: frontTransform }"-->
<!--    />-->
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import gsap from 'gsap'
import RoomItem from '../components/common/RoomItem.vue'
import ParticleField from '../components/common/ParticleField.vue' // 暂时注释

/*
 * @Modify: trae+deepseek-v4-pro, 2026-08-13
 *   Vite 中 inline :style 的 url() 不会自动解析资源路径，
 *   必须通过 import 导入图片，获取构建后的真实 URL
 */
import farBg from '@/assets/image/animeRoom/mid2.png'
import bilibiliImg from '@/assets/image/animeRoom/bilibili.png'
import frontBg from '@/assets/image/animeRoom/front.png'
import githubImg from '@/assets/image/animeRoom/github.png'

// 容器和层refs
const roomContainer = ref(null)
const layerFar = ref(null)
const layerMid = ref(null)
const layerItems = ref(null)
const layerFront = ref(null)

// 鼠标归一化坐标（-0.5 ~ 0.5）
const mouseX = ref(0)
const mouseY = ref(0)

// 视差强度系数（不同层移动范围）
const FAR_MOVE = 10     // px
const MID_MOVE = 25
const ITEMS_MOVE = 40
const FRONT_MOVE = 60

// 使用 GSAP quickTo 平滑更新 transform
let farToX, farToY, midToX, midToY, itemsToX, itemsToY, frontToX, frontToY

// 初始化 quickTo 实例（在 mounted 后调用）
function initQuickTo() {
  if (layerFar.value) {
    farToX = gsap.quickTo(layerFar.value, 'x', { duration: 0.6, ease: 'power2.out' })
    farToY = gsap.quickTo(layerFar.value, 'y', { duration: 0.6, ease: 'power2.out' })
  }
  if (layerMid.value) {
    midToX = gsap.quickTo(layerMid.value, 'x', { duration: 0.5, ease: 'power2.out' })
    midToY = gsap.quickTo(layerMid.value, 'y', { duration: 0.5, ease: 'power2.out' })
  }
  if (layerItems.value) {
    itemsToX = gsap.quickTo(layerItems.value, 'x', { duration: 0.4, ease: 'power2.out' })
    itemsToY = gsap.quickTo(layerItems.value, 'y', { duration: 0.4, ease: 'power2.out' })
  }
  if (layerFront.value) {
    frontToX = gsap.quickTo(layerFront.value, 'x', { duration: 0.3, ease: 'power2.out' })
    frontToY = gsap.quickTo(layerFront.value, 'y', { duration: 0.3, ease: 'power2.out' })
  }
}

// 由于 quickTo 需要 DOM，用 onMounted
import { onMounted } from 'vue'
onMounted(initQuickTo)

function onMouseMove(e) {
  if (!roomContainer.value) return
  const rect = roomContainer.value.getBoundingClientRect()
  // 归一化坐标：中心为0，左上 -0.5，右下 0.5
  const nx = (e.clientX - rect.left) / rect.width - 0.5
  const ny = (e.clientY - rect.top) / rect.height - 0.5
  mouseX.value = nx
  mouseY.value = ny

  // 更新各层位移
  farToX?.(nx * FAR_MOVE * -1)
  farToY?.(ny * FAR_MOVE * -1)
  midToX?.(nx * MID_MOVE * -1)
  midToY?.(ny * MID_MOVE * -1)
  itemsToX?.(nx * ITEMS_MOVE * -1)
  itemsToY?.(ny * ITEMS_MOVE * -1)
  frontToX?.(nx * FRONT_MOVE * -1)
  frontToY?.(ny * FRONT_MOVE * -1)
}

function onMouseLeave() {
  // 复位
  mouseX.value = 0
  mouseY.value = 0
  farToX?.(0); farToY?.(0)
  midToX?.(0); midToY?.(0)
  itemsToX?.(0); itemsToY?.(0)
  frontToX?.(0); frontToY?.(0)
}

// 备用：也可通过 computed 直接绑定，但 GSAP quickTo 性能更好
const farTransform = computed(() => `translate(${mouseX.value * FAR_MOVE * -1}px, ${mouseY.value * FAR_MOVE * -1}px)`)
const midTransform = computed(() => `translate(${mouseX.value * MID_MOVE * -1}px, ${mouseY.value * MID_MOVE * -1}px)`)
const itemLayerTransform = computed(() => `translate(${mouseX.value * ITEMS_MOVE * -1}px, ${mouseY.value * ITEMS_MOVE * -1}px)`)
const frontTransform = computed(() => `translate(${mouseX.value * FRONT_MOVE * -1}px, ${mouseY.value * FRONT_MOVE * -1}px)`)

const items = [
  {
    id: 'bilibili',
    imgSrc: bilibiliImg,
    label: 'Bilibili',
    url: 'https://space.bilibili.com/你的ID',
    style: { left: '15%', top: '55%', width: '120px' }
  },
  {
    id: 'github',
    imgSrc: githubImg,
    label: 'GitHub',
    url: 'https://github.com/你的ID',
    style: { left: '70%', top: '65%', width: '120px' }
  },
]
</script>