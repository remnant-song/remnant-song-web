import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],

  /*
   * @Author: trae+deepseek-v4-pro
   * @Date: 2026-06-24
   * @Desc: 配置路径别名 @ -> src，方便模块导入
   */
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  /*
   * @Author: trae+deepseek-v4-pro
   * @Date: 2026-06-24
   * @Desc: 构建优化配置
   *   - manualChunks: 将基础库（vue/pinia/vue-router/gsap）分包为 vendor，减小主包体积 & 利用浏览器缓存
   *   - 其他 node_modules 依赖打包为 libs chunk
   */
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            // 基础框架库 → vendor chunk（长期缓存）
            if (
              id.includes('/vue/') ||
              id.includes('/pinia/') ||
              id.includes('/vue-router/') ||
              id.includes('/gsap/')
            ) {
              return 'vendor'
            }
            // 其他第三方依赖 → libs chunk
            return 'libs'
          }
        },
      },
    },
  },
})
