<template>
  <div
      class="absolute cursor-pointer group"
      :style="{
      left: item.style.left,
      top: item.style.top,
      width: item.style.width,
      transform: `translate(${parallaxOffset.x}px, ${parallaxOffset.y}px)`,
      transition: 'transform 0.1s linear'
    }"
      @click="openLink"
  >
    <!--
      @Modify: trae+deepseek-v4-pro, 2026-08-13
        常驻微微泛光轮廓（drop-shadow 白色光晕），hover 时增强
    -->
    <img
        :src="item.imgSrc"
        :alt="item.label"
        class="w-full h-auto object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.45)] transition-transform duration-300 ease-out will-change-transform"
        :class="{ 'scale-110 brightness-110 drop-shadow-[0_0_16px_rgba(255,255,255,0.8)]': isHovered }"
        @mouseenter="onHover"
        @mouseleave="onLeave"
    />

    <!-- 悬停对话框（平台名称） -->
    <div
        v-if="isHovered"
        class="absolute -top-12 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm text-gray-800 px-3 py-1 rounded-lg text-sm whitespace-nowrap shadow-lg animate-fadeIn"
    >
      {{ item.label }}
      <div class="absolute left-1/2 -bottom-1 -translate-x-1/2 w-2 h-2 bg-white/90 rotate-45"></div>
    </div>

    <!-- 待机动画（浮动）由CSS控制 -->
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import gsap from 'gsap'

const props = defineProps({
  item: Object,
  mouseX: Number,
  mouseY: Number
})

const isHovered = ref(false)

// 物件自身的微小视差偏移（相对物品层更深度的移动）
const parallaxOffset = computed(() => ({
  x: props.mouseX * 8,   // 微小额外偏移
  y: props.mouseY * 8
}))

function onHover() {
  isHovered.value = true
}

function onLeave() {
  isHovered.value = false
}

function openLink() {
  if (props.item.url) {
    window.open(props.item.url, '_blank', 'noopener')
  }
}
</script>

<style scoped>
/* 浮动待机动画 */
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-6px); }
}

/* 给每个物件应用浮动，使用不同延迟实现错落 */
div {
  animation: float 4s ease-in-out infinite;
}
div:nth-child(1) { animation-delay: 0s; }
div:nth-child(2) { animation-delay: 0.5s; }
div:nth-child(3) { animation-delay: 1s; }
div:nth-child(4) { animation-delay: 1.5s; }
div:nth-child(5) { animation-delay: 2s; }
div:nth-child(6) { animation-delay: 2.5s; }
</style>

<style>
/* 对话框淡入 */
@keyframes fadeIn {
  from { opacity: 0; transform: translate(-50%, 5px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}
.animate-fadeIn {
  animation: fadeIn 0.2s ease-out;
}
</style>