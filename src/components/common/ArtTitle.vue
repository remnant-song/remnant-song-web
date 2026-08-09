<template>
  <div class="art-title-wrapper" data-tauri-drag-region>
    <svg
        data-tauri-drag-region
        width="100%"
        height="auto"
        :viewBox="`0 0 ${viewBoxWidth} 200`"
        xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <!-- 蜡笔质感滤镜 -->
        <filter id="filter-crayon" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="4" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="4" xChannelSelector="R" yChannelSelector="G" />
          <feGaussianBlur stdDeviation="0.4" />
        </filter>

        <!-- 毛刷纹理滤镜 -->
        <filter id="filter-brush" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
          <feGaussianBlur stdDeviation="0.8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        <!-- 动态生成每个独立颜色配置的渐变 -->
        <linearGradient
            v-for="cfg in uniqueColorConfigs"
            :key="cfg.id"
            :id="cfg.id"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
        >
          <stop offset="0%" :stop-color="cfg.lightColor" />
          <stop offset="100%" :stop-color="cfg.color" />
        </linearGradient>

        <!-- 背景装饰专用渐变（保留原有意向） -->
        <linearGradient id="g-orange-brush" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#FF8A00" />
          <stop offset="50%" stop-color="#FFB039" />
          <stop offset="100%" stop-color="#FFD56B" />
        </linearGradient>
        <linearGradient id="g-pink-brush" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#FF9EBB" />
          <stop offset="50%" stop-color="#FFC2D1" />
          <stop offset="100%" stop-color="#FFE5EC" />
        </linearGradient>
      </defs>

      <!-- 背景装饰：几何图形（随文本宽度等比缩放） -->
      <g v-if="showBackground === 'graphic'" filter="url(#filter-crayon)" opacity="0.6">
        <circle :cx="120 * scaleX" cy="50" r="15" fill="#ED90BD" />
        <circle :cx="780 * scaleX" cy="180" r="20" fill="#54C1CC" />
        <path
            :d="`M${200 * scaleX},190 Q${400 * scaleX},120 ${600 * scaleX},200`"
            stroke="#C87438"
            stroke-width="8"
            fill="none"
            stroke-linecap="round"
        />
        <rect
            :x="650 * scaleX"
            y="40"
            width="30"
            height="30"
            fill="#5D5F86"
            :transform="`rotate(20 ${665 * scaleX} 55)`"
        />
      </g>

      <!-- 背景装饰：毛刷笔触（随文本宽度等比缩放） -->
      <g v-if="showBackground === 'brush'" opacity="0.6" filter="url(#filter-brush)">
        <path
            data-tauri-drag-region
            :d="`M${80 * scaleX} 180 Q${250 * scaleX} 185, ${450 * scaleX} 175 T${820 * scaleX} 180`"
            stroke="url(#g-pink-brush)"
            stroke-width="20"
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"
        />
        <path
            data-tauri-drag-region
            :d="`M${80 * scaleX} 182 Q${250 * scaleX} 187, ${450 * scaleX} 177 T${820 * scaleX} 182`"
            stroke="url(#g-pink-brush)"
            stroke-width="10"
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"
            opacity="0.8"
        />
        <path
            data-tauri-drag-region
            :d="`M${80 * scaleX} 178 Q${250 * scaleX} 183, ${450 * scaleX} 173 T${820 * scaleX} 178`"
            stroke="url(#g-orange-brush)"
            stroke-width="4"
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"
            opacity="0.5"
        />
      </g>

      <!-- 主体文字层 -->
      <g filter="url(#filter-crayon)">
        <text
            v-for="(item, index) in finalLetters"
            :key="index"
            data-tauri-drag-region
            :x="item.x"
            :y="textY"
            font-family="Arial Black, Helvetica, sans-serif"
            :font-size="fontSize"
            font-weight="900"
            :fill="`url(#${item.gradientId})`"
            :stroke="item.config.shadowColor"
            :stroke-width="strokeWidth"
            stroke-linejoin="round"
            :class="{ 'animate-letter': animate }"
            :style="{ '--index': index }"
        >
          {{ item.char }}
        </text>
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
import {computed, onMounted, ref, watch} from 'vue'

// ======================= 类型定义 =======================
export interface ColorConfig {
  /** 主色，用于渐变终点 */
  color: string
  /** 浅色，用于渐变起点，不提供时自动基于主色提亮 */
  lightColor?: string
  /** 描边/阴影颜色，不提供时自动基于主色加深 */
  shadowColor?: string
}

type ColorSource = string | ColorConfig
type SpacingSource = number | number[] | ((index: number, char: string) => number)

// ======================= Props =======================
const props = withDefaults(
    defineProps<{
      /** 要显示的文本 */
      text: string
      /** 颜色配置：支持预设名称/颜色字符串/完整配置对象的数组，或返回上述类型的函数 */
      colors?: ColorSource[] | ((index: number, char: string) => ColorSource)
      /** 用户自定义的额外颜色预设，会与内置预设合并 */
      colorPresets?: Record<string, ColorConfig>
      /** 字符间距：统一数值 / 数组 / 函数 (单位：SVG 坐标) */
      spacing?: SpacingSource
      /** 背景装饰类型 */
      showBackground?: 'graphic' | 'brush' | null
      /** 是否开启动画 */
      animate?: boolean
      /** 第一个字符的 X 起始坐标 */
      startX?: number
      /** 字体大小 */
      fontSize?: number
      /** 文本基线 Y 坐标 */
      textY?: number
      /** 文字描边宽度 */
      strokeWidth?: number
    }>(),
    {
      colors: undefined,
      colorPresets: () => ({}),
      spacing: 90,
      showBackground: null,
      animate: false,
      startX: 50,
      fontSize: 110,
      textY: 140,
      strokeWidth: 5,
    }
)

// ======================= 内置预设（保持与原组件相同的色彩逻辑，可被 colorPresets 覆盖） =======================
const builtInPresets = ref<Record<string, ColorConfig>>({})

// 从 CSS 变量读取颜色值的辅助函数
const getCssVar = (name: string): string => {
  if (typeof document === 'undefined') return ''
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || ''
}

/*
 * @Author: trae + DeepSeek-V4-Pro
 * @Date: 2026-08-09
 * @Desc: 修复 lightenHsl 返回值被双重包裹 hsl() 的 bug。
 *        原实现返回已包裹 hsl() 的完整字符串（如 "hsl(330 80% 65%)"），
 *        但 initPresets 中又通过 `hsl(${lightenHsl(...)})` 再次包裹，
 *        导致最终产生 "hsl(hsl(330 80% 65%))" 或 "hsl(#ffffff)" 等无效颜色值，
 *        SVG 渐变由此失效，文字失去蜡笔纹理及描边效果。
 *        修复方式：改为返回纯 HSL 数值（如 "330 80% 65%"），
 *        与 getCssVar 返回值格式一致，由调用方统一包裹 hsl()。
 */
const lightenHsl = (hsl: string, amount: number): string => {
  if (!hsl) return '' // 返回空串，让调用方的 || 回退值生效
  const parts = hsl.split(' ')
  if (parts.length !== 3) return hsl
  return `${parts[0]} ${parts[1]} ${Math.min(100, parseFloat(parts[2]) + amount)}%`
}

// 组件挂载后读取一次 CSS 变量，后续通过 colorPresets 扩展
const initPresets = () => {
  const pink = getCssVar('--brand-pink')
  const purple = getCssVar('--brand-purple')
  const orange = getCssVar('--brand-orange')
  const cyan = getCssVar('--brand-cyan')
  const muted = getCssVar('--muted')
  const mutedFg = getCssVar('--sidebar-primary')
  /*
   * @Desc: --brand-*-shadow 是 HEX 颜色（如 #B5447B），直接读取即可，
   *        不再通过 hsl() 包裹，避免产生 "hsl(#B5447B)" 无效值。
   */
  const pinkShadow = getCssVar('--brand-pink-shadow')
  const purpleShadow = getCssVar('--brand-purple-shadow')
  const orangeShadow = getCssVar('--brand-orange-shadow')
  const cyanShadow = getCssVar('--brand-cyan-shadow')

  /*
   * @Author: trae + DeepSeek-V4-Pro
   * @Date: 2026-08-09
   * @Desc: 修复 shadowColor 生成逻辑。
   *        CSS 变量中 --brand-*-shadow 为 HEX 颜色（如 #B5447B），
   *        原代码错误地将其包裹在 hsl() 中，生成 "hsl(#B5447B)" 等无效值；
   *        而 --sidebar-primary 为纯 HSL 数值（如 "240 6% 30%"），
   *        原代码却未包裹 hsl()，生成 "240 6% 30%" 无效值。
   *        修复：HEX 变量直接使用，HSL 数值变量包裹 hsl()，
   *        未定义时回退为硬编码的 hsl() 颜色值。
   */
  builtInPresets.value = {
    pink: {
      color: `hsl(${pink || '330 80% 55%'})`,
      lightColor: `hsl(${lightenHsl(pink, 10) || '330 80% 65%'})`,
      shadowColor: pinkShadow || 'hsl(330 50% 30%)',
    },
    purple: {
      color: `hsl(${purple || '260 70% 55%'})`,
      lightColor: `hsl(${lightenHsl(purple, 20) || '260 70% 75%'})`,
      shadowColor: purpleShadow || 'hsl(260 45% 30%)',
    },
    orange: {
      color: `hsl(${orange || '25 95% 55%'})`,
      lightColor: `hsl(${lightenHsl(orange, 20) || '25 95% 75%'})`,
      shadowColor: orangeShadow || 'hsl(25 80% 30%)',
    },
    cyan: {
      color: `hsl(${cyan || '185 70% 50%'})`,
      lightColor: `hsl(${lightenHsl(cyan, 20) || '185 70% 70%'})`,
      shadowColor: cyanShadow || 'hsl(185 60% 25%)',
    },
    muted: {
      color: `hsl(${muted || '0 0% 50%'})`,
      lightColor: `hsl(${lightenHsl(muted, 5) || '0 0% 55%'})`,
      shadowColor: mutedFg ? `hsl(${mutedFg})` : '#333333',
    },
  }
}

if (typeof window !== 'undefined') {
  initPresets()
} else {
  // SSR 回退
  builtInPresets.value = {
    pink: { color: 'hsl(330 80% 55%)', lightColor: 'hsl(330 80% 65%)', shadowColor: 'hsl(330 50% 30%)' },
    purple: { color: 'hsl(260 70% 55%)', lightColor: 'hsl(260 70% 75%)', shadowColor: 'hsl(260 45% 30%)' },
    orange: { color: 'hsl(25 95% 55%)', lightColor: 'hsl(25 95% 75%)', shadowColor: 'hsl(25 80% 30%)' },
    cyan: { color: 'hsl(185 70% 50%)', lightColor: 'hsl(185 70% 70%)', shadowColor: 'hsl(185 60% 25%)' },
    muted: { color: 'hsl(0 0% 50%)', lightColor: 'hsl(0 0% 55%)', shadowColor: '#333333' },
  }
}

// 合并预设
const allPresets = computed<Record<string, ColorConfig>>(() => ({
  ...builtInPresets.value,
  ...props.colorPresets,
}))

// 预设名称列表（用于随机分配）
const presetNames = computed(() => Object.keys(allPresets.value))

// ======================= 颜色解析 =======================
/**
 * 将任意颜色源解析为完整的 ColorConfig
 */
const resolveColorConfig = (source: ColorSource | undefined, fallbackIndex: number): ColorConfig => {
  // 未提供时使用伪随机分配（基于索引保证稳定性）
  if (source === undefined) {
    const names = presetNames.value
    if (names.length === 0) return { color: '#000', lightColor: '#888', shadowColor: '#333' }
    // 确定性的伪随机索引
    const idx = (fallbackIndex * 2654435761) % names.length
    return allPresets.value[names[Math.abs(idx)]]!
  }

  // 如果是字符串：先检查预设，再当作直接颜色值
  if (typeof source === 'string') {
    const preset = allPresets.value[source]
    if (preset) return preset
    // 直接当作颜色：自动生成配套色
    return autoGenerateColors(source)
  }

  // 已经是 ColorConfig，补全缺失的 lightColor / shadowColor
  return {
    color: source.color,
    lightColor: source.lightColor ?? autoGenerateLight(source.color),
    shadowColor: source.shadowColor ?? autoGenerateShadow(source.color),
  }
}

// 简单的自动颜色生成（基于 HSL 调整）
const parseColorToHsl = (color: string): { h: number; s: number; l: number } | null => {
  // 简易解析 hex / rgb / hsl
  if (color.startsWith('hsl')) {
    const match = color.match(/[\d.]+/g)
    if (match && match.length >= 3) {
      return { h: parseFloat(match[0]), s: parseFloat(match[1]), l: parseFloat(match[2]) }
    }
  }
  // 更严谨的解析可引入 color 库，此处保持轻量
  return null
}

const autoGenerateLight = (color: string): string => {
  const hsl = parseColorToHsl(color)
  if (hsl) {
    return `hsl(${hsl.h}, ${hsl.s}%, ${Math.min(100, hsl.l + 20)}%)`
  }
  return color // 回退
}

const autoGenerateShadow = (color: string): string => {
  const hsl = parseColorToHsl(color)
  if (hsl) {
    return `hsl(${hsl.h}, ${hsl.s}%, ${Math.max(0, hsl.l - 30)}%)`
  }
  return '#222'
}

const autoGenerateColors = (color: string): ColorConfig => ({
  color,
  lightColor: autoGenerateLight(color),
  shadowColor: autoGenerateShadow(color),
})

// ======================= 间距解析 =======================
const resolveSpacing = (index: number, char: string): number => {
  const s = props.spacing
  if (typeof s === 'number') return s
  if (Array.isArray(s)) {
    // 循环使用数组中的间距值
    return s[index % s.length] ?? 90
  }
  if (typeof s === 'function') {
    return s(index, char)
  }
  return 90
}

// ======================= 字符渲染配置生成 =======================
// @Author: trae + DeepSeek-V4-Flash
// @Date: 2026-07-11
// @Desc: 合并 renderedLetters 和 finalLetters 为单一 computed，直接生成带完整 gradientId 的字符渲染配置，避免中间变量暴露给模板。
interface LetterRender {
  char: string
  x: number
  gradientId: string
  config: ColorConfig
}

const finalLetters = computed<LetterRender[]>(() => {
  const chars = props.text.split('')
  const letters: LetterRender[] = []
  let currentX = props.startX

  chars.forEach((char, index) => {
    // 获取颜色源
    let colorSource: ColorSource | undefined
    const colorsProp = props.colors
    if (colorsProp !== undefined) {
      if (typeof colorsProp === 'function') {
        colorSource = colorsProp(index, char)
      } else if (Array.isArray(colorsProp)) {
        // 循环使用
        colorSource = colorsProp[index % colorsProp.length]
      }
    }

    const config = resolveColorConfig(colorSource, index)
    const spacing = resolveSpacing(index, char)

    letters.push({
      char,
      x: currentX,
      gradientId: '', // 临时占位，后面统一补全
      config,
    })

    currentX += spacing
  })

  // 为每个唯一颜色配置生成渐变 ID
  const colorToIdMap = new Map<string, string>()
  const configs: { id: string; lightColor: string; color: string }[] = []
  letters.forEach((letter) => {
    const cfg = letter.config
    const key = `${cfg.color}|||${cfg.lightColor}`
    if (!colorToIdMap.has(key)) {
      const id = `g-char-${configs.length}`
      colorToIdMap.set(key, id)
      configs.push({ id, lightColor: cfg.lightColor!, color: cfg.color })
    }
  })

  // 补全 gradientId
  return letters.map((l) => ({
    ...l,
    gradientId: colorToIdMap.get(`${l.config.color}|||${l.config.lightColor}`) ?? 'g-char-0',
  }))
})

// 去重的颜色配置，为每个唯一配置生成渐变 ID（供模板中 <linearGradient> 使用）
// 从 finalLetters 中提取，消除与 renderedLetters 的耦合
const uniqueColorConfigs = computed(() => {
  const map = new Map<string, { id: string; lightColor: string; color: string }>()
  finalLetters.value.forEach((letter) => {
    const cfg = letter.config
    const key = `${cfg.color}|||${cfg.lightColor}`
    if (!map.has(key)) {
      map.set(key, {
        id: letter.gradientId,
        lightColor: cfg.lightColor!,
        color: cfg.color,
      })
    }
  })
  return Array.from(map.values())
})

// 计算画布总宽度（基于最后一个字符的 x 坐标 + 平均间距的一半，保证不裁剪）
const viewBoxWidth = computed(() => {
  const lastLetter = finalLetters.value[finalLetters.value.length - 1]
  if (!lastLetter) return props.startX * 2
  // 加上一个平均间距的估算值作为右侧留白
  const avgSpacing = typeof props.spacing === 'number' ? props.spacing : 90
  return lastLetter.x + avgSpacing + props.startX
})

// 背景缩放比例（相对于 900 基准）
const scaleX = computed(() => viewBoxWidth.value / 900)

// 客户端挂载后，若 CSS 变量未及时读取，重新初始化预设
const isMounted = ref(false)
if (typeof window !== 'undefined') {
  onMounted?.(() => {
    isMounted.value = true
    initPresets()
  })
} else {
  // 非浏览器环境跳过
  const onMounted = (fn: () => void) => fn()
}
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

/* 书写动画 */
.animate-letter {
  opacity: 0;
  fill-opacity: 0;
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  filter: blur(4px);
  transform: translateY(10px);
  animation: writing 2.4s cubic-bezier(0.23, 1, 0.32, 1) forwards;
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