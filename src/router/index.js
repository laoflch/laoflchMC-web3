
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue'),
    meta: { title: '首页' }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/movies',
    name: 'Movies',
    component: () => import('../views/Movies.vue'),
    meta: { title: '电影仓库' }
  },
  {
    path: '/data-management',
    name: 'DataManagement',
    component: () => import('../views/DataManagement.vue'),
    meta: { title: '数据管理' }
  },
  {
    path: '/global-index-management',
    name: 'GlobalIndexManagement',
    component: () => import('../views/GlobalIndexManagement.vue'),
    meta: { title: '全局索引管理' }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('../views/Profile.vue'),
    meta: { title: '个人中心' }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/NotFound.vue'),
    meta: { title: '页面不存在' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 全局前置守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  document.title = to.meta.title ? `${to.meta.title} - Vue3 + Element Plus` : 'Vue3 + Element Plus'
  next()
})

export default router
