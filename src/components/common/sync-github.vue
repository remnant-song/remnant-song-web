<template>
  <div class="page">
    <div class="sync-container">
      <!-- 两层 Lottie 叠加 -->
      <DotLottieVue
          src="/src/assets/github icon black.json"
          :autoplay="true"
          :loop="true"
          class="lottie-layer icon-layer"
          style="width: 50px; height: 50px;"

      />
      <DotLottieVue
          src="/src/assets/sync2.json"
          :autoplay="true"
          :loop="true"
          class="lottie-layer sync-layer"
          style="width: 150px; height: 150px;"

      />
    </div>
  </div>
</template>

<script setup>
import { DotLottieVue } from '@lottiefiles/dotlottie-vue'
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.sync-container {
  position: relative;
  width: 260px;
  height: 260px;
}

.lottie-layer {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

/* 旋转箭头放大到 1.3 倍，形成包围圈 */
.sync-layer {
  /* 将 translate 居中与 scale 合并，避免 transform 相互覆盖 */
  transform: translate(-50%, -50%) scale(1.3);
  transform-origin: center center;
}
</style>