import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

// 定义路由元信息类型
declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean      // 需要登录才能访问
    requiresGuest?: boolean     // 需要未登录才能访问（如登录/注册页）
    title?: string             // 页面标题
    keepAlive?: boolean        // 是否保持页面状态
  }
}

// 路由配置
const routes: RouteRecordRaw[] = [
  // 重定向
  {
    path: '/',
    redirect: '/login',
    meta: { title: '重定向' }
  },

  // 认证相关页面（未登录状态访问）
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/Login.vue'),
    meta: {
      requiresGuest: true,
      title: '登录 - 自习室预约系统'
    }
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('../views/Register.vue'),
    meta: {
      requiresGuest: true,
      title: '注册 - 自习室预约系统'
    }
  },

  // 主应用页面（需要登录）
  {
    path: '/home',
    name: 'home',
    component: () => import('../views/Home.vue'),
    meta: {
      requiresAuth: true,
      title: '首页 - 自习室预约系统',
      keepAlive: true
    }
  },

  // 预约功能页面
  {
    path: '/reservation',
    name: 'reservation',
    component: () => import('../views/RoomBooking.vue'),
    meta: {
      requiresAuth: true,
      title: '预约座位',
      keepAlive: true
    }
  },
  {
    path: '/my-reservations',
    name: 'my-reservations',
    component: () => import('../views/MyReservations.vue'),
    meta: {
      requiresAuth: true,
      title: '我的预约',
      keepAlive: true
    }
  },
  {
    path: '/study-rooms',
    name: 'study-rooms',
    component: () => import('../views/StudyRooms.vue'),
    meta: {
      requiresAuth: true,
      title: '自习室管理',
      keepAlive: true
    }
  },

  // 404页面 - 处理未匹配的路由
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../views/NotFound.vue'),
    meta: { title: '页面未找到' }
  }
]

// 创建路由器实例
const router = createRouter({
  history: createWebHistory(),
  routes,
  // 滚动行为配置
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// 路由守卫 - 全局前置守卫
router.beforeEach((to, from, next) => {
  // 检查登录状态
  const isLoggedIn = sessionStorage.getItem('isLoggedIn')

  // 调试信息（开发环境）
  if (import.meta.env.DEV) {
    console.log('路由守卫检查:', {
      目标路径: to.path,
      来源路径: from.path,
      登录状态: isLoggedIn,
      路由元信息: to.meta
    })
  }

  // 设置页面标题
  if (to.meta.title) {
    document.title = to.meta.title as string
  } else {
    document.title = '自习室预约系统'
  }

  // 检查是否需要认证
  if (to.meta.requiresAuth && !isLoggedIn) {
    // 未登录且尝试访问需要认证的页面，重定向到登录页
    console.log('需要登录，重定向到登录页')
    next({
      path: '/login',
      // 保存当前尝试访问的页面，登录后可以跳转回来
      query: { redirect: to.fullPath }
    })
    return
  }

  // 检查是否需要未登录状态（如登录/注册页）
  if (to.meta.requiresGuest && isLoggedIn) {
    // 已登录用户访问登录/注册页，重定向到首页
    console.log('已登录用户访问认证页，重定向到首页')
    next('/home')
    return
  }

  // 其他情况正常放行
  next()
})

// 路由守卫 - 全局后置钩子
router.afterEach((to, from) => {
  // 可以在这里添加页面访问统计等
  if (import.meta.env.DEV) {
    console.log(`页面跳转: ${from.path} -> ${to.path}`)
  }
})

// 路由错误处理
router.onError((error) => {
  console.error('路由错误:', error)

  // 如果是组件加载失败，可能是代码分割的chunk加载失败
  if (/Loading chunk \d+ failed/.test(error.message)) {
    // 可以在这里重新加载页面或提示用户刷新
    console.warn('代码块加载失败，可能需要刷新页面')
  }
})

export default router
