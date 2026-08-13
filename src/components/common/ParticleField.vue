<template>
  <div class="absolute inset-0 pointer-events-none overflow-hidden">
    <div
        v-for="particle in particles"
        :key="particle.id"
        class="absolute rounded-full bg-white/60"
        :style="{
        width: particle.size + 'px',
        height: particle.size + 'px',
        left: particle.x + '%',
        top: particle.y + '%',
        opacity: particle.opacity,
        boxShadow: `0 0 ${particle.size * 2}px rgba(255,255,255,0.5)`,
        animation: `drift ${particle.duration}s infinite linear`,
        animationDelay: particle.delay + 's'
      }"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'

const particles = ref(
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      opacity: Math.random() * 0.5 + 0.2,
      duration: Math.random() * 10 + 8,
      delay: Math.random() * -10
    }))
)
</script>

<style scoped>
@keyframes drift {
  0% { transform: translate(0, 0); }
  25% { transform: translate(15px, -20px); }
  50% { transform: translate(-10px, 15px); }
  75% { transform: translate(-20px, -5px); }
  100% { transform: translate(0, 0); }
}
</style>