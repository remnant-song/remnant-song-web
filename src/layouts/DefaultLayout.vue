<!--
  @Author: trae+deepseek-v4-pro
  @Date: 2026-06-24
  @Desc: 默认布局组件
    提供网站整体的页头 (Header)、主内容区 (RouterView)、页脚 (Footer) 框架
    页头包含网站标题、导航菜单和语言切换按钮
    使用 Tailwind CSS 工具类进行样式编排
-->

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { switchLanguage, getCurrentLanguage } from '@/i18n'

const router = useRouter()
const { t } = useI18n()

/** 导航菜单项 —— 需要与 i18n locales 中的 nav.* 键对应 */
const navItems = [
  { key: 'home', path: '/' },
  { key: 'blog', path: '/blog' },
  // 后续扩展更多导航项，在此数组中添加即可
  // { key: 'about', path: '/about' },
  // { key: 'works', path: '/works' },
  // { key: 'contact', path: '/contact' },
]

/**
 * 切换语言：当前是 en 则切到 zh-CN，反之亦然
 */
function handleSwitchLanguage(): void {
  const current = getCurrentLanguage()
  const next = current === 'en' ? 'zh-CN' : 'en'
  switchLanguage(next)
}

/** 判断当前路由是否激活 */
function isActive(path: string): boolean {
  return router.currentRoute.value.path === path
}
</script>

<template>
  <div class="flex flex-col min-h-screen">
    <!-- ========== Header / 页头 ========== -->
    <header class="sticky top-0 z-50 bg-bg/80 backdrop-blur-sm border-b border-border">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-center relative">
        <!-- 网站标题 -->
<!--        <router-link-->
<!--          to="/"-->
<!--          class="text-xl font-heading text-text-h no-underline hover:text-accent transition-colors"-->
<!--        >-->
<!--          {{ t('app.title') }}-->
<!--        </router-link>-->

        <!-- 导航菜单 -->
        <nav class="hidden sm:flex items-center gap-6">
          <router-link
            v-for="item in navItems"
            :key="item.key"
            :to="item.path"
            class="text-sm text-text no-underline transition-colors"
            :class="isActive(item.path) ? 'text-accent font-medium' : 'hover:text-text-h'"
          >
            {{ t(`nav.${item.key}`) }}
          </router-link>
        </nav>

        <!-- 语言切换按钮 -->
        <button
          class="absolute right-4 text-sm px-3 py-1.5 rounded-md border border-border bg-transparent text-text 
                 hover:border-accent hover:text-accent transition-colors cursor-pointer"
          :title="t('language.label')"
          @click="handleSwitchLanguage"
        >
          {{ getCurrentLanguage() === 'en' ? t('language.switch') : 'English' }}
        </button>
      </div>
    </header>

    <!-- ========== Main Content / 主内容区 ========== -->
    <main class="flex-1">
      <router-view v-slot="{ Component }">
        <!--
          @Modify: trae+deepseek-v4-pro, 2026-08-10
            去掉 mode="out-in"，避免 scoped CSS 导致过渡钩子卡死。
            旧组件离开过渡的 transitionend 事件不触发时，新组件永远不挂载。
            若后续需要交错动画，改用 :deep() 穿透样式或全局 CSS。
        -->
        <transition name="page-fade">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- ========== Footer / 页脚 ========== -->
<!--    <footer class="border-t border-border py-6 text-center">-->
<!--      <p class="text-sm text-text m-0">-->
<!--        &copy; {{ currentYear }} {{ t('app.title') }}. {{ t('footer.copyright') }}-->
<!--      </p>-->
<!--      <p class="text-xs text-text mt-1 opacity-60">-->
<!--        {{ t('footer.builtWith') }}-->
<!--      </p>-->
<!--    </footer>-->
  </div>
</template>

<style scoped>
/* 页面切换过渡动画 */
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.2s ease;
}

.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
}
</style>
