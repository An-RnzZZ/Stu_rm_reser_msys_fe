<template>
  <div class="home">
    <el-container style="height: 100vh;">
      <el-header style="background-color: #409EFF; color: white;">
        <div style="display: flex; justify-content: space-between; align-items: center; height: 60px;">
          <h2 style="margin: 0;">自习室预约系统</h2>
          <el-button @click="handleLogout" type="text" style="color: white;">
            退出登录
          </el-button>
        </div>
      </el-header>

      <el-container>
        <el-aside width="200px" style="background-color: #f5f5f5;">
          <el-menu
            router
            :default-active="$route.path"
            style="border: none;"
          >
            <el-menu-item index="/">
              <el-icon><House /></el-icon>
              <span>首页</span>
            </el-menu-item>
            <el-menu-item index="/reservation">
              <el-icon><Calendar /></el-icon>
              <span>预约座位</span>
            </el-menu-item>
            <el-menu-item index="/my-reservations">
              <el-icon><Document /></el-icon>
              <span>我的预约</span>
            </el-menu-item>
            <el-menu-item index="/study-rooms">
              <el-icon><School /></el-icon>
              <span>自习室管理</span>
            </el-menu-item>
          </el-menu>
        </el-aside>

        <el-main style="padding: 20px;">
          <el-card>
            <template #header>
              <div class="card-header">
                <span>欢迎使用自习室预约系统</span>
              </div>
            </template>

            <el-row :gutter="20">
              <el-col :span="8">
                <el-statistic title="可用自习室" :value="12" />
              </el-col>
              <el-col :span="8">
                <el-statistic title="今日预约" :value="156" />
              </el-col>
              <el-col :span="8">
                <el-statistic title="使用率" :value="85.4" suffix="%" />
              </el-col>
            </el-row>

            <el-divider />

            <el-button type="primary" size="large" @click="$router.push('/reservation')">
              立即预约
            </el-button>
          </el-card>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { House, Calendar, Document, School } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'

const router = useRouter()

// 在 Home.vue 中
const handleLogout = () => {
  sessionStorage.removeItem('isLoggedIn')
  sessionStorage.removeItem('username')
  router.push('/login')
}

</script>

<style scoped>
.home {
  height: 100vh;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
