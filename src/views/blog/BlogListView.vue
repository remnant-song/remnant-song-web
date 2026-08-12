<!--
  @Author: trae+glm-5.2
  @Date: 2026-08-09
  @Modify: trae+deepseek-v4-pro, 2026-08-10,
    支持双数据源：本地 glob 加载（local）与 GitHub API 加载（github）
    通过 VITE_POST_SOURCE 环境变量切换
  @Desc: 博客文章列表页
    - 按分类分组展示所有文章
    - 支持 ?category=xxx 查询参数过滤特定分类
    - 每篇文章卡片显示标题、分类标签，点击跳转详情页
  ponytail: 当前为全量展示，文章数 > 50 时再考虑分页/虚拟滚动
-->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import type { PostEntry } from '@/utils/markdown/types'
import SyncGithub from "@/components/common/sync-github.vue";

const route = useRoute()

// ============================================================
// 数据源切换
// ============================================================
const postSource = import.meta.env.VITE_POST_SOURCE as string

/** 文章列表（响应式） */
const allPosts = ref<PostEntry[]>([])

/** 加载状态 */
const loading = ref(true)

/** 加载错误信息 */
const error = ref<string | null>(null)

/** 从查询参数获取分类过滤条件 */
const filterCategory = computed(() => (route.query.category as string) || '')

/** 根据查询参数过滤后的文章列表 */
const filteredPosts = computed<PostEntry[]>(() => {
  if (!filterCategory.value) return allPosts.value
  return allPosts.value.filter((p) => p.category === filterCategory.value)
})

/** 按分类分组，根级文章归入 'uncategorized' */
const groupedPosts = computed<Record<string, PostEntry[]>>(() => {
  const groups: Record<string, PostEntry[]> = {}
  for (const post of filteredPosts.value) {
    const cat = post.category || 'uncategorized'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(post)
  }
  return groups
})

/** 分类名列表（保持分组顺序，uncategorized 放最后） */
const categoryNames = computed(() => {
  return Object.keys(groupedPosts.value).sort((a, b) => {
    if (a === 'uncategorized') return 1
    if (b === 'uncategorized') return -1
    return a.localeCompare(b)
  })
})

/** 构建文章详情页跳转路径 */
function postUrl(post: PostEntry): string {
  if (post.category) {
    return `/blog/${post.category}/${post.slug}`
  }
  return `/blog/${post.slug}`
}

// ============================================================
// 生命周期：根据数据源加载文章
// ============================================================
onMounted(async () => {
  loading.value = true
  error.value = null

  try {
    if (postSource === 'github') {
      // GitHub 远程加载（异步）
      const { loadAllPostsFromGitHub } = await import(
        '@/utils/markdown/github-loader'
      )
      allPosts.value = await loadAllPostsFromGitHub()
    } else {
      // 本地 glob 加载（同步，保持原有行为）
      const { loadAllPosts } = await import('@/utils/markdown/loader')
      allPosts.value = loadAllPosts()
    }
  } catch (err) {
    console.error('[BlogListView] 加载文章失败:', err)
    error.value = err instanceof Error ? err.message : '未知错误'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- 加载状态 -->
    <div v-if="loading" class="text-center py-16">
      <sync-github/>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="text-center py-16">
      <p class="text-lg text-red-500">加载失败</p>
      <p class="text-sm text-text opacity-50 mt-2">{{ error }}</p>
    </div>

    <!-- 正常内容 -->
    <template v-else>
      <!-- 页头 -->
      <div class="mb-8">
        <h1 class="text-3xl font-heading text-text-h mb-2">
          {{ filterCategory ? `分类：${filterCategory}` : '博客' }}
        </h1>
        <p class="text-sm text-text opacity-60">
          共 {{ filteredPosts.length }} 篇文章
        </p>
        <!-- 分类过滤标签 -->
        <div v-if="!filterCategory" class="flex flex-wrap gap-2 mt-3">
          <router-link
            v-for="cat in categoryNames"
            :key="cat"
            :to="`/blog?category=${cat}`"
            class="text-xs px-2.5 py-1 rounded-full border border-border text-text
                   hover:border-accent hover:text-accent transition-colors no-underline"
          >
            {{ cat === 'uncategorized' ? '未分类' : cat }}
            <span class="opacity-50 ml-1">{{ groupedPosts[cat].length }}</span>
          </router-link>
        </div>
        <!-- 清除过滤 -->
        <router-link
          v-if="filterCategory"
          to="/blog"
          class="text-sm text-accent no-underline hover:underline mt-2 inline-block"
        >
          ← 查看全部文章
        </router-link>
      </div>

      <!-- 文章列表（按分类分组） -->
      <template v-if="filteredPosts.length > 0">
        <section
          v-for="catName in categoryNames"
          :key="catName"
          class="mb-8"
        >
          <h2 class="text-lg font-heading text-text-h mb-3 pb-2 border-b border-border">
            {{ catName === 'uncategorized' ? '未分类' : catName }}
          </h2>
          <div class="space-y-3">
            <router-link
              v-for="post in groupedPosts[catName]"
              :key="post.slug"
              :to="postUrl(post)"
              class="block p-4 rounded-lg border border-border bg-bg
                     hover:border-accent hover:bg-accent/5 transition-colors no-underline"
            >
              <h3 class="text-base font-medium text-text-h mb-1">
                {{ post.title }}
              </h3>
              <div class="flex items-center gap-2 text-xs text-text opacity-50">
                <span>{{ post.slug }}</span>
                <span v-if="post.category" class="px-1.5 py-0.5 rounded bg-code-bg">
                  {{ post.category }}
                </span>
              </div>
            </router-link>
          </div>
        </section>
      </template>

      <!-- 空状态 -->
      <div
        v-else
        class="text-center py-16 text-text opacity-50"
      >
        <p class="text-lg">暂无文章</p>
        <p class="text-sm mt-2">
          {{ postSource === 'github'
            ? 'GitHub 仓库中未找到符合条件的文章'
            : '在 src/content/posts/ 下添加 .md 文件即可'
          }}
        </p>
      </div>
    </template>
  </div>
</template>