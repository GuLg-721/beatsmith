import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: () => import('@/views/HomeView.vue')
    },
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/LoginView.vue')
    },
    {
      path: '/songs',
      name: 'Songs',
      component: () => import('@/views/SongsView.vue')
    },
    {
      path: '/leaderboard',
      name: 'Leaderboard',
      component: () => import('@/views/LeaderboardView.vue')
    },
    {
      path: '/editor',
      name: 'Editor',
      component: () => import('@/views/EditorView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/play/:mapId',
      name: 'Player',
      component: () => import('@/views/PlayerView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/map/:mapId',
      name: 'MapDetail',
      component: () => import('@/views/MapDetailView.vue')
    },
    {
      path: '/profile/:id',
      name: 'Profile',
      component: () => import('@/views/ProfileView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/settings',
      name: 'Settings',
      component: () => import('@/views/SettingsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/share/:mapId',
      name: 'Share',
      component: () => import('@/views/ShareView.vue')
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: () => import('@/views/NotFoundView.vue')
    }
  ]
})

// 路由守卫
router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('beatsmith_token')
  if (to.meta.requiresAuth && !token) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
  } else {
    next()
  }
})

export default router
