<template>
  <div class="art-title-wrapper" data-tauri-drag-region>
    <svg
      data-tauri-drag-region
      width="1000"
      height="220"
      viewBox="0 0 900 200"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <!-- 蜡笔质感滤镜：保留颗粒感 -->
        <filter id="filter-crayon" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="4" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="4" xChannelSelector="R" yChannelSelector="G" />
          <feGaussianBlur stdDeviation="0.4" />
        </filter>

        <!-- 毛刷纹理滤镜：增加噪点和轻微模糊 -->
        <filter id="filter-brush" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" result="noise"/>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G"/>
          <feGaussianBlur stdDeviation="0.8" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>

        <!-- 动态生成通用颜色渐变 -->
        <linearGradient v-for="g in gradients" :key="g.id" :id="g.id" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" :style="{ stopColor: g.light }" />
          <stop offset="100%" :style="{ stopColor: g.main }" />
        </linearGradient>

        <!-- 笔触专用渐变 -->
        <linearGradient id="g-orange-brush" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#FF8A00"/><stop offset="50%" stop-color="#FFB039"/><stop offset="100%" stop-color="#FFD56B"/>
        </linearGradient>
        <linearGradient id="g-pink-brush" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#FF9EBB"/><stop offset="50%" stop-color="#FFC2D1"/><stop offset="100%" stop-color="#FFE5EC"/>
        </linearGradient>
      </defs>

      <!-- 背景装饰：几何图形 -->
      <g v-if="showBackground === 'graphic'" filter="url(#filter-crayon)" opacity="0.6">
        <circle cx="120" cy="50" r="15" fill="#ED90BD" />
        <circle cx="780" cy="180" r="20" fill="#54C1CC" />
        <path d="M200,190 Q400,120 600,200" stroke="#C87438" stroke-width="8" fill="none" stroke-linecap="round" />
        <rect x="650" y="40" width="30" height="30" fill="#5D5F86" transform="rotate(20 665 55)" />
      </g>

      <!-- 背景装饰：毛刷笔触 -->
      <g v-if="showBackground === 'brush'" opacity="0.6" filter="url(#filter-brush)">
        <path data-tauri-drag-region d="M80 180 Q250 185, 450 175 T820 180" stroke="url(#g-pink-brush)" stroke-width="20" stroke-linecap="round" stroke-linejoin="round" fill="none" />
        <path data-tauri-drag-region d="M80 182 Q250 187, 450 177 T820 182" stroke="url(#g-pink-brush)" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.8" />
        <path data-tauri-drag-region d="M80 178 Q250 183, 450 173 T820 178" stroke="url(#g-orange-brush)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.5" />
      </g>

      <!-- 主体文字层 -->
      <g filter="url(#filter-crayon)">
        <text
          v-for="(item, index) in titleLetters"
          :key="index"
          data-tauri-drag-region
          :x="item.x" y="140"
          font-family="Arial Black, Helvetica, sans-serif"
          font-size="110"
          font-weight="900"
          :fill="`url(#${item.gradient})`"
          :stroke="item.shadow"
          stroke-width="5"
          stroke-linejoin="round"
          :class="{ 'animate-letter': animate }"
          :style="{ '--index': index }"
        >{{ item.char }}</text>
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

/**
 * props: 控制背景装饰显示类型
 * - 'graphic': 几何图形
 * - 'brush': 毛刷笔触
 * - null: 无
 */
const props = defineProps({
  showBackground: {
    type: String,
    default: null,
    validator: (value: any) => [null, 'graphic', 'brush'].includes(value)
  },
  animate: {
    type: Boolean,
    default: false
  }
})

const isMounted = ref(false)
onMounted(() => { isMounted.value = true })

/**
 * 颜色计算逻辑优化
 */
const getHslValue = (varName: string) => {
  if (!isMounted.value || typeof document === 'undefined') return '0 0% 0%'
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
}

const color = (varName: string, lightAdd = 0) => computed(() => {
  const base = getHslValue(varName)
  if (!base) return 'black'
  if (lightAdd === 0) return `hsl(${base})`
  const parts = base.split(' ')
  if (parts.length !== 3) return `hsl(${base})`
  return `hsl(${parts[0]} ${parts[1]} ${Math.min(100, parseFloat(parts[2]) + lightAdd)}%)`
})

// 品牌颜色定义
const pinkMain = color('--brand-pink'), pinkLight = color('--brand-pink', 10), pinkShadow = color('--brand-pink-shadow')
const purpleMain = color('--brand-purple'), purpleLight = color('--brand-purple', 20), purpleShadow = color('--brand-purple-shadow')
const orangeMain = color('--brand-orange'), orangeLight = color('--brand-orange', 20), orangeShadow = color('--brand-orange-shadow')
const cyanMain = color('--brand-cyan'), cyanLight = color('--brand-cyan', 20), cyanShadow = color('--brand-cyan-shadow')
const mutedMain = color('--muted'), mutedLight = color('--muted', 5), mutedFore = color('--sidebar-primary')

const gradients = computed(() => [
  { id: 'g-pink', main: pinkMain.value, light: pinkLight.value },
  { id: 'g-purple', main: purpleMain.value, light: purpleLight.value },
  { id: 'g-orange', main: orangeMain.value, light: orangeLight.value },
  { id: 'g-cyan', main: cyanMain.value, light: cyanLight.value },
  { id: 'g-muted', main: mutedMain.value, light: mutedLight.value },
])

const titleLetters = computed(() => [
  { char: 'R', x: 50,  gradient: 'g-orange', shadow: orangeShadow.value },
  { char: 'I', x: 140, gradient: 'g-purple', shadow: purpleShadow.value },
  { char: 'K', x: 190, gradient: 'g-pink',   shadow: pinkShadow.value },
  { char: 'K', x: 290, gradient: 'g-pink',   shadow: pinkShadow.value },
  { char: 'A', x: 390, gradient: 'g-cyan',   shadow: cyanShadow.value },
  { char: 'N', x: 535, gradient: 'g-muted',  shadow: mutedFore.value },
  { char: 'O', x: 630, gradient: 'g-muted',  shadow: mutedFore.value },
  { char: 'T', x: 725, gradient: 'g-muted',  shadow: mutedFore.value },
  { char: 'E', x: 810, gradient: 'g-muted',  shadow: mutedFore.value },
])
</script>

<style scoped>
.art-title-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding: 2rem;
  background: transparent;
}

svg {
  width: 100%;
  height: auto;
  max-width: 1200px;
}

/* 书写动画样式 */
.animate-letter {
  opacity: 0;
  fill-opacity: 0;
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  filter: blur(4px);
  transform: translateY(10px);
  animation: writing 2.4s cubic-bezier(0.23, 1, 0.32, 1) forwards;
  animation-delay: calc(var(--index) * 0.2s);
}

@keyframes writing {
  0% {
    opacity: 0;
    fill-opacity: 0;
    stroke-dashoffset: 1000;
    filter: blur(8px);
    transform: translateY(20px);
  }
  30% {
    opacity: 1;
    stroke-dashoffset: 1000;
    fill-opacity: 0;
  }
  70% {
    stroke-dashoffset: 0;
    fill-opacity: 0;
    filter: blur(0);
    transform: translateY(0);
  }
  100% {
    opacity: 1;
    fill-opacity: 1;
    stroke-dashoffset: 0;
    filter: blur(0);
    transform: translateY(0);
  }
}
</style>