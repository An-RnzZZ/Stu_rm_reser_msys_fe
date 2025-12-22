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

            <el-menu-item index="/admin/violations">
                <el-icon><Bell /></el-icon>
                <span>违规管理</span>
            </el-menu-item>

            <el-menu-item index="/admin/appeals">
                <el-icon><Document /></el-icon>
                <span>申诉管理</span>
            </el-menu-item>
            
            <el-menu-item index="/admin/logs">
              <el-icon><Document /></el-icon> <!-- 操作日志改用文档图标 -->
              <span>操作日志</span>
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
  HomeFilled,
  Document
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
  height: 60px;
  flex-shrink: 0;
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

/* 侧边栏 - 核心修改：隐藏滚动条 */
.admin-aside {
  background-color: #1e3a5f;
  transition: width 0.3s;
  overflow-y: auto; /* 保留滚动功能（内容超出时仍可滚动） */
  overflow-x: hidden;
  /* 隐藏滚动条 - 兼容不同浏览器 */
  -ms-overflow-style: none;  /* IE 和 Edge */
  scrollbar-width: none;     /* Firefox */
}

/* 隐藏 Chrome/Safari 等 Webkit 内核浏览器的滚动条 */
.admin-aside::-webkit-scrollbar {
  display: none;
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


.admin-main {
  background-color: #f0f2f5;
  padding: 20px;
  overflow-y: auto;
  overflow-x: hidden;
  height: calc(100vh - 60px);
}

/* 确保内部容器可以滚动 */
:deep(.el-main) {
  overflow-y: auto !important;
  overflow-x: hidden !important;
}
</style>
