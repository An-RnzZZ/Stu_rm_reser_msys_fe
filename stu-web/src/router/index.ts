import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

declare module 'vue-router' {
interface RouteMeta {
requiresAuth?: boolean
requiresGuest?: boolean
requiresAdmin?: boolean
title?: string
keepAlive?: boolean
}
}

const routes: RouteRecordRaw[] = [
{
path: '/',
redirect: '/login',
meta: { title: '重定向' }
},
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
    path: '/sign-in',
    name: 'sign-in',
    component: () => import('../views/SignIn.vue'),
    meta: {
      requiresAuth: true,
      title: '签到签退',
      keepAlive: true
    }
  },
  {
    path: '/admin/login',
    name: 'admin-login',
    component: () => import('../views/admin/AdminLogin.vue'),
    meta: {
      title: '管理员登录 - 自习室预约系统'
    }
  },
  {
    path: '/admin',
    name: 'admin',
    component: () => import('../views/admin/AdminLayout.vue'),
    meta: {
      requiresAdmin: true
    },
    redirect: '/admin/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'admin-dashboard',
        component: () => import('../views/admin/Dashboard.vue'),
        meta: { requiresAdmin: true, title: '仪表盘 - 管理后台' }
      },
      {
        path: 'users',
        name: 'admin-users',
        component: () => import('../views/admin/UserManage.vue'),
        meta: { requiresAdmin: true, title: '用户管理 - 管理后台' }
      },
      {
        path: 'reservations',
        name: 'admin-reservations',
        component: () => import('../views/admin/ReservationManage.vue'),
        meta: { requiresAdmin: true, title: '预约管理 - 管理后台' }
      },
      {
        path: 'seats',
        name: 'admin-seats',
        component: () => import('../views/admin/SeatManage.vue'),
        meta: { requiresAdmin: true, title: '座位管理 - 管理后台' }
      },
      {
        path: 'signs',
        name: 'admin-signs',
        component: () => import('../views/admin/SignManage.vue'),
        meta: { requiresAdmin: true, title: '签到记录 - 管理后台' }
      },
      {
        path: 'logs',
        name: 'admin-logs',
        component: () => import('../views/admin/AdminLogList.vue'),
        meta: { requiresAdmin: true, title: '操作日志 - 管理后台' }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../views/NotFound.vue'),
    meta: { title: '页面未找到' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

router.beforeEach((to,_from, next) => {
  const isUserLoggedIn = sessionStorage.getItem('isLoggedIn')
  const isAdminLoggedIn = sessionStorage.getItem('isAdminLoggedIn')

  if (to.meta.title) {
    document.title = to.meta.title as string
  } else {
    document.title = '自习室预约系统'
  }

  if (to.meta.requiresAdmin && !isAdminLoggedIn) {
    next({ path: '/admin/login', query: { redirect: to.fullPath } })
    return
  }

  if (to.meta.requiresAuth && !isUserLoggedIn) {
    next({ path: '/login', query: { redirect: to.fullPath } })
    return
  }

  if (to.meta.requiresGuest && isUserLoggedIn) {
    next('/home')
    return
  }

  next()
})

export default router
