<template>
  <div class="art-title-wrapper" data-tauri-drag-region>
    <svg
        data-tauri-drag-region
        width="100%"
        height="auto"
        :viewBox="viewBox"
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

      <!-- 背景装饰：几何图形（随文本宽度等比缩放） -->
      <g v-if="showBackground === 'graphic'" filter="url(#filter-crayon)" opacity="0.6">
        <circle :cx="120 * scaleX" cy="50" r="15" fill="#ED90BD" />
        <circle :cx="780 * scaleX" cy="180" r="20" fill="#54C1CC" />
        <path :d="`M${200 * scaleX},190 Q${400 * scaleX},120 ${600 * scaleX},200`" stroke="#C87438" stroke-width="8" fill="none" stroke-linecap="round" />
        <rect :x="650 * scaleX" y="40" width="30" height="30" fill="#5D5F86" :transform="`rotate(20 ${665 * scaleX} 55)`" />
      </g>

      <!-- 背景装饰：毛刷笔触（随文本宽度等比缩放） -->
      <g v-if="showBackground === 'brush'" opacity="0.6" filter="url(#filter-brush)">
        <path data-tauri-drag-region :d="`M${80 * scaleX} 180 Q${250 * scaleX} 185, ${450 * scaleX} 175 T${820 * scaleX} 180`" stroke="url(#g-pink-brush)" stroke-width="20" stroke-linecap="round" stroke-linejoin="round" fill="none" />
        <path data-tauri-drag-region :d="`M${80 * scaleX} 182 Q${250 * scaleX} 187, ${450 * scaleX} 177 T${820 * scaleX} 182`" stroke="url(#g-pink-brush)" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.8" />
        <path data-tauri-drag-region :d="`M${80 * scaleX} 178 Q${250 * scaleX} 183, ${450 * scaleX} 173 T${820 * scaleX} 178`" stroke="url(#g-orange-brush)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.5" />
      </g>

      <!-- 主体文字层：动态生成字符 -->
      <g filter="url(#filter-crayon)">
        <text
            v-for="(item, index) in titleLetters"
            :key="index"
            data-tauri-drag-region
            :x="item.x"
            :y="textY"
            font-family="Arial Black, Helvetica, sans-serif"
            :font-size="fontSize"
            font-weight="900"
            :fill="`url(#${item.gradient})`"
            :stroke="item.shadow"
            :stroke-width="strokeWidth"
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

const props = defineProps({
  /** 要显示的文本内容（必填） */
  text: {
    type: String,
    required: true
  },
  /** 背景装饰类型：graphic 几何图形 / brush 毛刷笔触 / null 无 */
  showBackground: {
    type: String,
    default: null,
    validator: (value: string | null) => [null, 'graphic', 'brush'].includes(value)
  },
  /** 是否开启逐字书写动画 */
  animate: {
    type: Boolean,
    default: false
  },
  /** 字符间水平间距（SVG坐标系单位） */
  charSpacing: {
    type: Number,
    default: 90
  },
  /** 首个字符的左侧起始X坐标 */
  startX: {
    type: Number,
    default: 50
  },
  /** 字体大小（SVG坐标系单位） */
  fontSize: {
    type: Number,
    default: 110
  },
  /** 文本基线Y轴坐标 */
  textY: {
    type: Number,
    default: 140
  },
  /** 文字描边宽度 */
  strokeWidth: {
    type: Number,
    default: 5
  }
})

const isMounted = ref(false)
onMounted(() => { isMounted.value = true })

/**
 * 颜色计算逻辑：读取全局 CSS 变量
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

// 品牌颜色定义（与原组件完全一致）
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

// 前5个字符配色映射（与原组件 RIKKANOTE 配色完全对齐）
const colorMapping = computed(() => [
  { gradient: 'g-orange', shadow: orangeShadow.value },
  { gradient: 'g-purple', shadow: purpleShadow.value },
  { gradient: 'g-pink', shadow: pinkShadow.value },
  { gradient: 'g-pink', shadow: pinkShadow.value },
  { gradient: 'g-cyan', shadow: cyanShadow.value },
])
const mutedMapping = computed(() => ({ gradient: 'g-muted', shadow: mutedFore.value }))

// 动态计算画布尺寸与背景缩放比例
const viewBoxWidth = computed(() => props.startX * 2 + props.text.length * props.charSpacing)
const viewBox = computed(() => `0 0 ${viewBoxWidth.value} 200`)
const scaleX = computed(() => viewBoxWidth.value / 900)

// 动态生成每个字符的配置
interface TitleLetter {
  char: string
  x: number
  gradient: string
  shadow: string
}
const titleLetters = computed<TitleLetter[]>(() => {
  return props.text.split('').map((char, index) => {
    const colorItem = index < colorMapping.value.length
        ? colorMapping.value[index]
        : mutedMapping.value
    return {
      char,
      x: props.startX + index * props.charSpacing,
      gradient: colorItem.gradient,
      shadow: colorItem.shadow
    }
  })
})
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
  /* 使用 CSS 变量控制动画延迟，默认值为 0 防止未定义时出错 */
  animation-delay: calc(var(--index, 0) * 0.2s);
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