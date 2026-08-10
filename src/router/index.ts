/*
 * @Author: trae+deepseek-v4-pro
 * @Date: 2026-06-24
 * @Desc: Vue Router 路由配置
 *   - 使用 createWebHistory 实现 HTML5 History 模式
 *   - 包含基础路由：首页 (/) 和 404 通配路由
 *   - 路由懒加载：HomeView 和 NotFoundView 使用动态 import
 */

import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

/**
 * 路由表定义
 * 后续添加新页面时在此数组中扩展 route 对象即可
 */
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    // 路由级懒加载：仅当用户访问该路由时才加载对应组件
    component: () => import('@/views/HomeView.vue'),
    meta: {
      title: 'Home',
    },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFoundView.vue'),
    meta: {
      title: '404',
    },
  },
  {
    path: '/blog',
    name: 'BlogList',
    component: () => import('@/views/blog/BlogListView.vue'),
    meta: { title: 'Blog' },
  },
  {
    path: '/blog/:slug',
    name: 'BlogPost',
    component: () => import('@/views/blog/BlogPostView.vue'),
    meta: { title: 'Blog' },
  },
  {
    path: '/blog/:category/:slug',
    name: 'BlogPostCategorized',
    component: () => import('@/views/blog/BlogPostView.vue'),
    meta: { title: 'Blog' },
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

/**
 * 全局前置守卫：根据路由 meta.title 动态设置页面标题
 */
router.beforeEach((to, _from, next) => {
  const appTitle = import.meta.env.VITE_APP_TITLE || 'Remnant Song'
  const pageTitle = to.meta.title as string | undefined

  if (pageTitle) {
    document.title = `${pageTitle} | ${appTitle}`
  } else {
    document.title = appTitle
  }

  next()
})

export default router
