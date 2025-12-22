<template>
  <div class="dashboard">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>📊 仪表盘</h1>
      <p>欢迎回来，{{ adminName }}！这是系统运营概览。</p>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stat-cards">
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-icon users">
            <el-icon><User /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.totalUsers }}</div>
            <div class="stat-label">注册用户</div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :lg="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-icon reservations">
            <el-icon><Calendar /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.todayReservations }}</div>
            <div class="stat-label">今日预约</div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :lg="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-icon seats">
            <el-icon><Grid /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.totalSeats }}</div>
            <div class="stat-label">座位总数</div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :lg="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-icon signs">
            <el-icon><Finished /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.todaySigns }}</div>
            <div class="stat-label">今日签到</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 快捷操作 -->
    <el-row :gutter="20" class="quick-actions">
      <el-col :xs="24" :lg="12">
        <el-card class="action-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>⚡ 快捷操作</span>
            </div>
          </template>
          <div class="action-buttons">
            <el-button type="primary" @click="$router.push('/admin/users')">
              <el-icon><User /></el-icon>
              管理用户
            </el-button>
            <el-button type="success" @click="$router.push('/admin/reservations')">
              <el-icon><Calendar /></el-icon>
              查看预约
            </el-button>
            <el-button type="warning" @click="$router.push('/admin/seats')">
              <el-icon><Grid /></el-icon>
              座位管理
            </el-button>
            <el-button type="info" @click="$router.push('/admin/signs')">
              <el-icon><Finished /></el-icon>
              签到记录
            </el-button>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="12">
        <el-card class="action-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>📋 系统信息</span>
            </div>
          </template>
          <div class="system-info">
            <div class="info-item">
              <span class="info-label">系统版本</span>
              <span class="info-value">v1.0.0</span>
            </div>
            <div class="info-item">
              <span class="info-label">后端地址</span>
              <span class="info-value">localhost:8080</span>
            </div>
            <div class="info-item">
              <span class="info-label">当前时间</span>
              <span class="info-value">{{ currentTime }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">运行状态</span>
              <el-tag type="success" size="small">正常运行</el-tag>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 最近预约记录 -->
    <el-card class="recent-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>📅 最近预约记录</span>
          <el-button type="primary" link @click="$router.push('/admin/reservations')">
            查看全部 →
          </el-button>
        </div>
      </template>

      <el-table :data="recentReservations" stripe style="width: 100%" v-loading="loading">
        <el-table-column prop="resvId" label="预约ID" width="80" />
        <el-table-column label="用户" width="120">
          <template #default="{ row }">
            {{ row.user?.userName || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="座位" width="100">
          <template #default="{ row }">
            {{ row.seat?.seatNumber || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="resvDate" label="日期" width="120" />
        <el-table-column label="时间段">
          <template #default="{ row }">
            {{ row.resvstartTime }} - {{ row.resvendTime }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.resvDate)">
              {{ getStatusText(row.resvDate) }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && recentReservations.length === 0" description="暂无预约记录" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { User, Calendar, Grid, Finished } from '@element-plus/icons-vue'

// 管理员名称
const adminName = computed(() => {
  return sessionStorage.getItem('adminName') || sessionStorage.getItem('adminAccount') || '管理员'
})

// 加载状态
const loading = ref(false)

// 统计数据
const stats = reactive({
  totalUsers: 0,
  todayReservations: 0,
  totalSeats: 0,
  todaySigns: 0
})

// 最近预约
const recentReservations = ref<any[]>([])

// 当前时间
const currentTime = ref('')
let timeInterval: number | null = null

// 更新时间
const updateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 获取状态类型
const getStatusType = (dateStr: string) => {
  const today = new Date().toISOString().split('T')[0]
  if (dateStr === today) return 'primary'
  if (dateStr > today) return 'success'
  return 'info'
}

// 获取状态文本
const getStatusText = (dateStr: string) => {
  const today = new Date().toISOString().split('T')[0]
  if (dateStr === today) return '今日'
  if (dateStr > today) return '预约中'
  return '已完成'
}

// 加载统计数据
const loadStats = async () => {
  try {
    // 获取用户数量
    const usersRes = await fetch('http://120.46.219.204:8080/admin/users')
    const usersData = await usersRes.json()
    if (usersData.code === 200) {
      stats.totalUsers = usersData.data?.length || 0
    }

    // 获取座位数量
    const seatsRes = await fetch('http://120.46.219.204:8080/admin/seats')
    const seatsData = await seatsRes.json()
    if (seatsData.code === 200) {
      stats.totalSeats = seatsData.data?.length || 0
    }

    // 获取预约数量
    const reservationsRes = await fetch('http://120.46.219.204:8080/admin/reservations')
    const reservationsData = await reservationsRes.json()
    if (reservationsData.code === 200) {
      const today = new Date().toISOString().split('T')[0]
      const allReservations = reservationsData.data || []
      stats.todayReservations = allReservations.filter((r: any) => r.resvDate === today).length
      recentReservations.value = allReservations.slice(0, 5)
    }

    // 获取签到数量
    const signsRes = await fetch('http://120.46.219.204:8080/admin/signs')
    const signsData = await signsRes.json()
    if (signsData.code === 200) {
      stats.todaySigns = signsData.data?.length || 0
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
    ElMessage.error('加载数据失败，请检查后端服务')
  }
}

// 页面加载
onMounted(() => {
  updateTime()
  timeInterval = window.setInterval(updateTime, 1000)
  loadStats()
})

// 页面卸载
onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
})
</script>

<style scoped>
.dashboard {
  max-width: 1400px;
  margin: 0 auto;
}

/* 页面标题 */
.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0 0 8px 0;
  font-size: 24px;
  color: #1e3a5f;
}

.page-header p {
  margin: 0;
  color: #7f8c8d;
  font-size: 14px;
}

/* 统计卡片 */
.stat-cards {
  margin-bottom: 20px;
}

.stat-card {
  border-radius: 12px;
  margin-bottom: 16px;
}

.stat-card :deep(.el-card__body) {
  display: flex;
  align-items: center;
  padding: 20px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: white;
  margin-right: 16px;
}

.stat-icon.users {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-icon.reservations {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
}

.stat-icon.seats {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-icon.signs {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #1e3a5f;
  line-height: 1.2;
}

.stat-label {
  font-size: 14px;
  color: #7f8c8d;
  margin-top: 4px;
}

/* 快捷操作卡片 */
.quick-actions {
  margin-bottom: 20px;
}

.action-card {
  border-radius: 12px;
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: #1e3a5f;
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.action-buttons .el-button {
  border-radius: 8px;
}

/* 系统信息 */
.system-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  color: #7f8c8d;
  font-size: 14px;
}

.info-value {
  color: #1e3a5f;
  font-weight: 500;
}

/* 最近预约卡片 */
.recent-card {
  border-radius: 12px;
}

.recent-card :deep(.el-table) {
  border-radius: 8px;
}

/* 响应式 */
@media (max-width: 768px) {
  .stat-value {
    font-size: 22px;
  }

  .action-buttons {
    flex-direction: column;
  }

  .action-buttons .el-button {
    width: 100%;
  }
}
</style>
