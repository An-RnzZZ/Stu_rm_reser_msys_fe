<template>
  <div class="sign-container">
    <!-- 今日签到卡片 -->
    <el-card class="sign-card">
      <template #header>
        <div class="card-header">
          <span class="title">📍 今日签到</span>
          <span class="date">{{ todayDate }}</span>
        </div>
      </template>

      <div v-loading="loading">
        <!-- 今日预约列表 -->
        <div v-if="todayReservations.length > 0" class="reservation-list">
          <div
            v-for="resv in todayReservations"
            :key="resv.resvId"
            class="reservation-item"
          >
            <div class="resv-info">
              <div class="resv-seat">
                <el-icon><Grid /></el-icon>
                <span>{{ resv.seat?.seatNumber || '座位' }}</span>
              </div>
              <div class="resv-time">
                <el-icon><Clock /></el-icon>
                <span>{{ formatTime(resv.resvstartTime) }} - {{ formatTime(resv.resvendTime) }}</span>
              </div>
              <div class="resv-room">
                <el-icon><OfficeBuilding /></el-icon>
                <span>{{ resv.seat?.room?.roomName || '自习室' }}</span>
              </div>
            </div>

            <div class="resv-actions">
              <!-- 签到状态 -->
              <el-tag v-if="getSignStatus(resv) === 'NOT_SIGNED'" type="warning">待签到</el-tag>
              <el-tag v-else-if="getSignStatus(resv) === 'SIGNED_IN'" type="success">已签到</el-tag>
              <el-tag v-else-if="getSignStatus(resv) === 'SIGNED_OUT'" type="info">已签退</el-tag>

              <!-- 操作按钮 -->
              <el-button
                v-if="getSignStatus(resv) === 'NOT_SIGNED'"
                type="primary"
                @click="handleSignIn(resv)"
                :loading="signingResvId === resv.resvId"
              >
                ✓ 立即签到
              </el-button>
              <el-button
                v-else-if="getSignStatus(resv) === 'SIGNED_IN'"
                type="warning"
                @click="handleSignOut(resv)"
                :loading="signingResvId === resv.resvId"
              >
                签退
              </el-button>
            </div>
          </div>
        </div>

        <!-- 无预约提示 -->
        <el-empty v-else description="今日暂无预约" />
      </div>
    </el-card>

    <!-- 签到记录卡片 -->
    <el-card class="sign-card" style="margin-top: 20px;">
      <template #header>
        <div class="card-header">
          <span class="title">📋 签到记录</span>
          <el-select v-model="statusFilter" placeholder="签到状态" style="width: 120px;" @change="loadSignRecords">
            <el-option label="全部" value="" />
            <el-option label="正常" value="NORMAL" />
            <el-option label="迟到" value="LATE" />
            <el-option label="补签" value="MAKEUP" />
          </el-select>
        </div>
      </template>

      <el-table :data="signRecords" v-loading="recordsLoading" empty-text="暂无签到记录">
        <el-table-column label="日期" width="120">
          <template #default="{ row }">
            {{ row.reservation?.resvDate || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="座位" width="100">
          <template #default="{ row }">
            {{ row.reservation?.seat?.seatNumber || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="预约时段" width="150">
          <template #default="{ row }">
            {{ formatTime(row.reservation?.resvstartTime) }} - {{ formatTime(row.reservation?.resvendTime) }}
          </template>
        </el-table-column>
        <el-table-column label="签到时间" width="100">
          <template #default="{ row }">
            {{ formatTimestamp(row.signinTime) }}
          </template>
        </el-table-column>
        <el-table-column label="签退时间" width="100">
          <template #default="{ row }">
            {{ row.signoutTime ? formatTimestamp(row.signoutTime) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.signStatus)">
              {{ getStatusText(row.signStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="使用时长" width="100">
          <template #default="{ row }">
            {{ calculateDuration(row.signinTime, row.signoutTime) }}
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="signRecords.length === 0 && !recordsLoading" description="暂无签到记录" />
    </el-card>

    <!-- 签到统计 -->
    <el-card class="sign-card" style="margin-top: 20px;">
      <template #header>
        <span class="title">📊 签到统计</span>
      </template>
      <el-row :gutter="20">
        <el-col :span="6">
          <el-statistic title="总签到次数" :value="stats.total" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="正常签到" :value="stats.normal" suffix="次" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="迟到次数" :value="stats.late" suffix="次" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="出勤率" :value="stats.rate" suffix="%" />
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Grid, Clock, OfficeBuilding } from '@element-plus/icons-vue'

// 接口定义
interface Reservation {
  resvId: number
  resvDate: string
  resvstartTime: string
  resvendTime: string
  seat?: {
    seatId: number
    seatNumber: string
    room?: {
      roomId: number
      roomName: string
    }
  }
}

interface SignRecord {
  signId: number
  signinTime: string
  signoutTime: string | null
  signStatus: string
  reservation?: Reservation
}

// 状态
const loading = ref(false)
const recordsLoading = ref(false)
const signingResvId = ref<number | null>(null)
const statusFilter = ref('')

const todayReservations = ref<Reservation[]>([])
const signRecords = ref<SignRecord[]>([])
const signMap = ref<Map<number, SignRecord>>(new Map()) // resvId -> SignRecord

const stats = reactive({
  total: 0,
  normal: 0,
  late: 0,
  rate: 100
})

// 今日日期
const todayDate = computed(() => {
  const now = new Date()
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${'日一二三四五六'[now.getDay()]}`
})

// 获取今日日期字符串 YYYY-MM-DD
const getTodayStr = () => new Date().toISOString().split('T')[0]

// 获取用户ID
const getUserId = () => {
  const userId = sessionStorage.getItem('userId')
  return userId ? parseInt(userId) : null
}

// 加载今日预约
const loadTodayReservations = async () => {
  const userId = getUserId()
  if (!userId) {
    ElMessage.warning('请先登录')
    return
  }

  loading.value = true
  try {
    // 获取用户所有预约
    const response = await fetch(`http://localhost:8080/admin/reservations/user/${userId}`)
    const result = await response.json()

    if (result.code === 200) {
      const today = getTodayStr()
      // 筛选今日预约
      todayReservations.value = (result.data || []).filter(
        (r: Reservation) => r.resvDate === today
      )

      // 获取今日预约的签到状态
      await loadSignStatusForReservations()
    }
  } catch (error) {
    console.error('加载预约失败:', error)
    ElMessage.error('加载预约失败')
  } finally {
    loading.value = false
  }
}

// 加载预约的签到状态
const loadSignStatusForReservations = async () => {
  const userId = getUserId()
  if (!userId) return

  try {
    const response = await fetch(`http://localhost:8080/sign/user/${userId}`)
    const result = await response.json()

    if (result.code === 200) {
      signMap.value.clear()
      ;(result.data || []).forEach((sign: SignRecord) => {
        if (sign.reservation?.resvId) {
          signMap.value.set(sign.reservation.resvId, sign)
        }
      })
    }
  } catch (error) {
    console.error('加载签到状态失败:', error)
  }
}

// 获取预约的签到状态
const getSignStatus = (resv: Reservation): string => {
  const sign = signMap.value.get(resv.resvId)
  if (!sign) return 'NOT_SIGNED'
  if (sign.signoutTime) return 'SIGNED_OUT'
  return 'SIGNED_IN'
}

// 签到
const handleSignIn = async (resv: Reservation) => {
  const userId = getUserId()
  if (!userId) {
    ElMessage.warning('请先登录')
    return
  }

  signingResvId.value = resv.resvId
  try {
    console.log('签到请求参数:', { userId, resvId: resv.resvId })

    const response = await fetch('http://localhost:8080/sign/in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userId,
        resvId: resv.resvId
      })
    })

    const result = await response.json()
    console.log('签到响应:', result)

    if (result.code === 200) {
      ElMessage.success('签到成功！')
      await loadTodayReservations()
      await loadSignRecords()
    } else {
      ElMessage.error(result.message || '签到失败')
    }
  } catch (error) {
    console.error('签到失败:', error)
    ElMessage.error('签到失败，请检查网络')
  } finally {
    signingResvId.value = null
  }
}

// 签退
const handleSignOut = async (resv: Reservation) => {
  const userId = getUserId()
  if (!userId) {
    ElMessage.warning('请先登录')
    return
  }

  signingResvId.value = resv.resvId
  try {
    const response = await fetch('http://localhost:8080/sign/out', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userId,
        resvId: resv.resvId
      })
    })

    const result = await response.json()

    if (result.code === 200) {
      ElMessage.success('签退成功！')
      await loadTodayReservations()
      await loadSignRecords()
    } else {
      ElMessage.error(result.message || '签退失败')
    }
  } catch (error) {
    console.error('签退失败:', error)
    ElMessage.error('签退失败，请检查网络')
  } finally {
    signingResvId.value = null
  }
}

// 加载签到记录
const loadSignRecords = async () => {
  const userId = getUserId()
  if (!userId) return

  recordsLoading.value = true
  try {
    const response = await fetch(`http://localhost:8080/sign/user/${userId}`)
    const result = await response.json()

    if (result.code === 200) {
      signRecords.value = result.data || []

      // 筛选
      if (statusFilter.value) {
        signRecords.value = signRecords.value.filter(
          r => r.signStatus === statusFilter.value
        )
      }

      calculateStats()
    }
  } catch (error) {
    console.error('加载签到记录失败:', error)
  } finally {
    recordsLoading.value = false
  }
}

// 计算统计数据
const calculateStats = () => {
  const allRecords = signRecords.value
  stats.total = allRecords.length
  stats.normal = allRecords.filter(r => r.signStatus === 'NORMAL').length
  stats.late = allRecords.filter(r => r.signStatus === 'LATE' || r.signStatus === 'MAKEUP').length
  stats.rate = stats.total > 0 ? Math.round((stats.normal / stats.total) * 100) : 100
}

// 格式化时间 HH:mm:ss -> HH:mm
const formatTime = (time: string | undefined) => {
  if (!time) return '-'
  return time.length > 5 ? time.substring(0, 5) : time
}

// 格式化时间戳
const formatTimestamp = (timestamp: string | undefined) => {
  if (!timestamp) return '-'
  try {
    const date = new Date(timestamp)
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  } catch {
    return '-'
  }
}

// 计算时长
const calculateDuration = (start: string | undefined, end: string | null | undefined) => {
  if (!start || !end) return '-'
  try {
    const startTime = new Date(start).getTime()
    const endTime = new Date(end).getTime()
    const diff = Math.floor((endTime - startTime) / 1000 / 60)
    const hours = Math.floor(diff / 60)
    const mins = diff % 60
    return hours > 0 ? `${hours}时${mins}分` : `${mins}分钟`
  } catch {
    return '-'
  }
}

// 状态标签类型
const getStatusTagType = (status: string) => {
  const map: Record<string, string> = {
    'NORMAL': 'success',
    'LATE': 'warning',
    'MAKEUP': 'info',
    'ABSENT': 'danger'
  }
  return map[status] || 'info'
}

// 状态文本
const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    'NORMAL': '正常',
    'LATE': '迟到',
    'MAKEUP': '补签',
    'ABSENT': '缺席'
  }
  return map[status] || status
}

onMounted(() => {
  loadTodayReservations()
  loadSignRecords()
})
</script>

<style scoped>
.sign-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.sign-card {
  border-radius: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-size: 18px;
  font-weight: bold;
}

.date {
  color: #909399;
  font-size: 14px;
}

.reservation-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.reservation-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7ed 100%);
  border-radius: 8px;
  flex-wrap: wrap;
  gap: 12px;
}

.resv-info {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.resv-seat, .resv-time, .resv-room {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #606266;
}

.resv-seat {
  font-size: 18px;
  font-weight: bold;
  color: #409eff;
}

.resv-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

:deep(.el-statistic__head) {
  font-size: 14px;
}

:deep(.el-statistic__content) {
  font-size: 24px;
}
</style>
