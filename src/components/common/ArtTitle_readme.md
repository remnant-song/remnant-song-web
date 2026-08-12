# ArtTitle 艺术字组件使用文档

## 概述
`ArtTitle` 是一个基于 SVG 的艺术字标题组件，支持蜡笔/毛刷质感、动态渐变填充、自定义颜色与间距、背景装饰以及逐字书写动画。组件已修复 `gradientId` 失效问题，当前版本可直接使用。

## Props 列表

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `text` | `string` | **必填** | 要显示的文本内容 |
| `colors` | `ColorSource[] \| (index: number, char: string) => ColorSource` | `undefined` | 字符颜色配置，支持数组、函数；未提供时自动随机使用内置预设 |
| `colorPresets` | `Record<string, ColorConfig>` | `{}` | 自定义颜色预设，与内置预设合并（可覆盖同名字段） |
| `spacing` | `number \| number[] \| (index: number, char: string) => number` | `90` | 字符水平间距（SVG单位），可统一、循环数组或逐个函数定义 |
| `showBackground` | `'graphic' \| 'brush' \| null` | `null` | 背景装饰类型：`graphic` 几何图形，`brush` 毛刷笔触，`null` 无 |
| `animate` | `boolean` | `false` | 是否开启逐字书写动画 |
| `startX` | `number` | `50` | 第一个字符的左侧起始 X 坐标 |
| `fontSize` | `number` | `110` | 字体大小（SVG 单位） |
| `textY` | `number` | `140` | 文本基线 Y 坐标 |
| `strokeWidth` | `number` | `5` | 文字描边宽度 |
| `animationSpeed` | `number` | `1` | 动画速度倍率，`1` 为正常速度（2.4s 总时长 / 0.2s 字符延迟），`2` 为两倍速，`0.5` 为半速。≤ 0 时视为 `1` |

### 颜色相关类型
```ts
interface ColorConfig {
  color: string        // 主色，用于渐变终点
  lightColor?: string  // 浅色，用于渐变起点；未提供时自动基于主色提亮
  shadowColor?: string // 描边/阴影颜色；未提供时自动基于主色加深
}
type ColorSource = string | ColorConfig
```

## 内置颜色预设
组件内置了五个颜色预设，并尝试从当前页面的 CSS 变量中读取实际值，如果获取不到则使用硬编码回退：

| 预设名称 | CSS 变量依赖 | 回退主色 |
|----------|--------------|----------|
| `pink` | `--brand-pink` `--brand-pink-shadow` | `hsl(330 80% 55%)` |
| `purple` | `--brand-purple` `--brand-purple-shadow` | `hsl(260 70% 55%)` |
| `orange` | `--brand-orange` `--brand-orange-shadow` | `hsl(25 95% 55%)` |
| `cyan` | `--brand-cyan` `--brand-cyan-shadow` | `hsl(185 70% 50%)` |
| `muted` | `--muted` `--sidebar-primary` | `hsl(0 0% 50%)`（阴影 `#333`） |

你可以通过 `colorPresets` prop 添加新的预设，或覆盖已有的。

## 颜色自动补全规则
当提供的颜色不包含 `lightColor` 或 `shadowColor` 时，组件会基于主色自动计算：
- **提亮**：主色 HSL 亮度 +20%，上限 100%
- **加深**：主色 HSL 亮度 -30%，下限 0%  
  （仅对 `hsl(...)` 格式的主色生效，其他格式回退为原始主色或固定值）

## 使用示例

### 1. 基础使用（全随机颜色、默认间距、无背景、无动画）
```vue
<ArtTitle text="HELLO" />
```
每个字符会从内置预设中确定性随机分配颜色（相同文本颜色固定）。

### 2. 使用预设名称数组
```vue
<ArtTitle text="VUE" :colors="['pink', 'cyan', 'orange']" />
```
按数组顺序循环应用预设颜色。

### 3. 混合使用：预设、直接颜色、完整配置
```vue
<ArtTitle
  text="DESIGN"
  :colors="[
    'purple',                          // 预设
    '#FF5733',                         // 直接颜色，自动生成亮色/阴影
    { color: '#00ff00', shadowColor: '#003300' } // 完整配置
  ]"
/>
```

### 4. 使用函数按索引动态指定颜色
```vue
<ArtTitle
  text="REMNANT SONG"
  :colors="(index) => {
    if (index >= 7) return { color: '#1a1a1a', lightColor: '#d4d4d4', shadowColor: '#000000' }; // 后四个字符黑白
    // 前七个不处理，自动随机
  }"
  show-background="brush"
  animate
/>
```

### 5. 自定义间距：统一数值、数组、函数
```vue
<!-- 统一间距 -->
<ArtTitle text="SPACING" :spacing="120" />

<!-- 循环使用数组中的间距值 -->
<ArtTitle text="ARRAY" :spacing="[100, 80, 120]" />

<!-- 根据字符动态调整间距 -->
<ArtTitle text="DYNAMIC" :spacing="(i, char) => char === 'Y' ? 60 : 100" />
```

### 6. 背景装饰
```vue
<!-- 几何图形背景 -->
<ArtTitle text="GRAPHIC" show-background="graphic" />

<!-- 毛刷笔触下划线 -->
<ArtTitle text="BRUSH" show-background="brush" />
```

### 7. 开启动画
```vue
<ArtTitle text="ANIMATE" animate />
```
动画为逐字书写效果，延迟递增，可配合 `show-background` 一起使用。

### 7.1 调节动画速度
```vue
<!-- 2 倍速，快放 -->
<ArtTitle text="FAST" animate :animation-speed="2" />

<!-- 0.5 倍速，慢放 -->
<ArtTitle text="SLOW" animate :animation-speed="0.5" />
```
通过 `animationSpeed` 倍率控制，`2` 表示总时长减半（1.2s）、字符延迟减半（0.1s），`0.5` 反之。

### 8. 扩展自定义预设色板
```vue
<template>
  <ArtTitle
    text="BRAND"
    :color-presets="{
      brand: { color: '#123456', lightColor: '#abcdef', shadowColor: '#000' }
    }"
    :colors="['brand', 'pink']"
  />
</template>
```

### 9. 调整文字大小、位置和描边宽度
```vue
<ArtTitle
  text="STYLE"
  :font-size="80"
  :text-y="120"
  :stroke-width="3"
  :start-x="80"
/>
```

### 10. 完整组合示例
```vue
<ArtTitle
  text="REMNANT SONG"
  :colors="(i) => i >= 7 ? { color: '#1a1a1a', lightColor: '#d4d4d4', shadowColor: '#000' } : undefined"
  show-background="brush"
  animate
  :spacing="[90, 90, 85, 95, 90, 100, 90, 90, 85, 95]"
  :font-size="120"
  :stroke-width="6"
/>
```

## 工作原理
- 字符逐个计算 X 坐标（基于 `startX` + 累计间距），画布宽度自动适配。
- 颜色配置会去重生成 `<linearGradient>`，提高性能。
- 背景装饰根据总宽度比例缩放，确保覆盖整个文本区域。
- 动画使用 CSS `@keyframes`，通过 `animation-delay: calc(var(--index) * 0.2s)` 实现逐字延迟。

## 注意事项
- 组件依赖全局 CSS 变量来读取品牌色，若页面未定义这些变量，将使用内置回退值。
- `fontSize`、`textY`、`strokeWidth` 等均使用 SVG 用户坐标系，缩放关系由 `viewBox` 和 SVG 的 `width/height` 控制。
- 当使用 `showBackground` 时，下划线/几何图形可能与文本重叠，可适当调整 `textY` 避免视觉冲突。
- 函数形式 `colors` 若返回 `undefined`，则对该字符使用随机内置预设。