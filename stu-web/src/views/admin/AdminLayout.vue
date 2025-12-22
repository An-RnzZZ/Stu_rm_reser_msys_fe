<template>
  <div class="admin-layout">
    <el-container style="height: 100vh;">
      <!-- 顶部导航栏 -->
      <el-header class="admin-header">
        <div class="header-left">
          <el-icon class="menu-toggle" @click="toggleSidebar">
            <Fold v-if="!isCollapse" />
            <Expand v-else />
          </el-icon>
          <h2>🏫 自习室管理系统</h2>
        </div>
        <div class="header-right">
          <span class="admin-info">
            <el-icon><UserFilled /></el-icon>
            {{ adminName }}
          </span>
          <el-button type="text" class="logout-btn" @click="handleLogout">
            <el-icon><SwitchButton /></el-icon>
            退出登录
          </el-button>
        </div>
      </el-header>

      <el-container>
        <!-- 侧边栏菜单 -->
        <el-aside :width="isCollapse ? '64px' : '220px'" class="admin-aside">
          <el-menu
            router
            :default-active="$route.path"
            :collapse="isCollapse"
            class="admin-menu"
            background-color="#1e3a5f"
            text-color="#b8c7d9"
            active-text-color="#ffffff"
          >
            <el-menu-item index="/admin/dashboard">
              <el-icon><DataAnalysis /></el-icon>
              <span>仪表盘</span>
            </el-menu-item>

            <el-menu-item index="/admin/users">
              <el-icon><User /></el-icon>
              <span>用户管理</span>
            </el-menu-item>

            <el-menu-item index="/admin/reservations">
              <el-icon><Calendar /></el-icon>
              <span>预约管理</span>
            </el-menu-item>

            <el-menu-item index="/admin/seats">
              <el-icon><Grid /></el-icon>
              <span>座位管理</span>
            </el-menu-item>

            <el-menu-item index="/admin/buildings">
              <el-icon><OfficeBuilding /></el-icon>
              <span>建筑管理</span>
            </el-menu-item>

            <el-menu-item index="/admin/signs">
              <el-icon><Finished /></el-icon>
              <span>签到记录</span>
            </el-menu-item>

            <el-divider style="margin: 20px 12px; border-color: rgba(255,255,255,0.1);" />

            <el-menu-item index="/home">
              <el-icon><HomeFilled /></el-icon>
              <span>返回前台</span>
            </el-menu-item>
          </el-menu>
        </el-aside>

        <!-- 主内容区域 -->
        <el-main class="admin-main">
          <router-view />
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Fold,
  Expand,
  UserFilled,
  SwitchButton,
  DataAnalysis,
  User,
  Calendar,
  Grid,
  Finished,
  HomeFilled
} from '@element-plus/icons-vue'

const router = useRouter()

// 侧边栏折叠状态
const isCollapse = ref(false)

// 管理员名称
const adminName = computed(() => {
  return sessionStorage.getItem('adminName') || sessionStorage.getItem('adminAccount') || '管理员'
})

// 切换侧边栏
const toggleSidebar = () => {
  isCollapse.value = !isCollapse.value
}

// 退出登录
const handleLogout = () => {
  ElMessageBox.confirm('确定要退出登录吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    // 清除管理员登录状态
    sessionStorage.removeItem('isAdminLoggedIn')
    sessionStorage.removeItem('adminAccount')
    sessionStorage.removeItem('adminId')
    sessionStorage.removeItem('adminName')

    ElMessage.success('已退出登录')
    router.push('/admin/login')
  }).catch(() => {
    // 取消退出
  })
}

// 检查登录状态
onMounted(() => {
  const isLoggedIn = sessionStorage.getItem('isAdminLoggedIn')
  if (!isLoggedIn) {
    ElMessage.warning('请先登录')
    router.push('/admin/login')
  }
})
</script>

<style scoped>
.admin-layout {
  height: 100vh;
  overflow: hidden;
}

/* 顶部导航栏 */
.admin-header {
  background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.header-left h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.menu-toggle {
  font-size: 20px;
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  transition: background-color 0.3s;
}

.menu-toggle:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.admin-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
}

.logout-btn {
  color: rgba(255, 255, 255, 0.9) !important;
  font-size: 14px;
}

.logout-btn:hover {
  color: #ffffff !important;
}

/* 侧边栏 */
.admin-aside {
  background-color: #1e3a5f;
  transition: width 0.3s;
  overflow: hidden;
}

.admin-menu {
  border-right: none;
  height: 100%;
}

.admin-menu:not(.el-menu--collapse) {
  width: 220px;
}

:deep(.el-menu-item) {
  margin: 4px 8px;
  border-radius: 8px;
}

:deep(.el-menu-item:hover) {
  background-color: rgba(255, 255, 255, 0.1) !important;
}

:deep(.el-menu-item.is-active) {
  background: linear-gradient(135deg, #3d7ab7 0%, #5a9fd4 100%) !important;
}

/* 主内容区域 */
.admin-main {
  background-color: #f0f2f5;
  padding: 20px;
  overflow-y: auto;
}
</style>
