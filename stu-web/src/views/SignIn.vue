<template>
  <div class="signin-container">
    <!-- 今日预约 - 签到卡片 -->
    <el-card class="today-card">
      <template #header>
        <div class="card-header">
          <span class="title">📍 今日签到</span>
          <el-tag type="info">{{ todayDate }}</el-tag>
        </div>
      </template>

      <!-- 有今日预约 -->
      <div v-if="todayReservations.length > 0" class="today-reservations">
        <div
          v-for="reservation in todayReservations"
          :key="reservation.resvId"
          class="reservation-item"
        >
          <div class="reservation-info">
            <div class="seat-info">
              <el-icon class="seat-icon"><Grid /></el-icon>
              <span class="seat-number">{{ reservation.seat?.seatNumber || '未分配座位' }}</span>
            </div>
            <div class="time-info">
              <el-icon><Clock /></el-icon>
              <span>{{ formatTime(reservation.resvstartTime) }} - {{ formatTime(reservation.resvendTime) }}</span>
            </div>
            <div class="room-info" v-if="reservation.seat?.room">
              <el-icon><OfficeBuilding /></el-icon>
              <span>{{ reservation.seat.room.roomName }}</span>
            </div>
          </div>

          <div class="reservation-status">
            <!-- 未签到 -->
            <template v-if="!reservation.signRecord">
              <el-tag type="warning" size="large">待签到</el-tag>
              <el-button
                type="primary"
                size="large"
                :loading="signingIn === reservation.resvId"
                @click="handleSignIn(reservation)"
              >
                <el-icon><Check /></el-icon>
                立即签到
              </el-button>
            </template>

            <!-- 已签到未签退 -->
            <template v-else-if="!reservation.signRecord.signoutTime">
              <div class="signed-info">
                <el-tag type="success" size="large">已签到</el-tag>
                <span class="signin-time">
                  签到时间: {{ formatDateTime(reservation.signRecord.signinTime) }}
                </span>
              </div>
              <el-button
                type="warning"
                size="large"
                :loading="signingOut === reservation.resvId"
                @click="handleSignOut(reservation)"
              >
                <el-icon><Close /></el-icon>
                签退
              </el-button>
            </template>

            <!-- 已签退 -->
            <template v-else>
              <div class="completed-info">
                <el-tag type="info" size="large">已完成</el-tag>
                <div class="time-details">
                  <span>签到: {{ formatDateTime(reservation.signRecord.signinTime) }}</span>
                  <span>签退: {{ formatDateTime(reservation.signRecord.signoutTime) }}</span>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- 无今日预约 -->
      <el-empty v-else description="今日暂无预约">
        <el-button type="primary" @click="$router.push('/reservation')">
          去预约座位
        </el-button>
      </el-empty>
    </el-card>

    <!-- 签到记录历史 -->
    <el-card class="history-card">
      <template #header>
        <div class="card-header">
          <span class="title">📋 签到记录</span>
          <el-select
            v-model="filterStatus"
            placeholder="签到状态"
            clearable
            style="width: 120px"
            @change="loadSignHistory"
          >
            <el-option label="全部" value="" />
            <el-option label="正常" value="NORMAL" />
            <el-option label="迟到" value="LATE" />
            <el-option label="缺席" value="ABSENT" />
          </el-select>
        </div>
      </template>

      <el-table :data="signHistory" v-loading="historyLoading" stripe>
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
            <span v-if="row.reservation">
              {{ formatTime(row.reservation.resvstartTime) }} - {{ formatTime(row.reservation.resvendTime) }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="签到时间" width="160">
          <template #default="{ row }">
            {{ row.signinTime ? formatDateTime(row.signinTime) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="签退时间" width="160">
          <template #default="{ row }">
            {{ row.signoutTime ? formatDateTime(row.signoutTime) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.signStatus)">
              {{ getStatusText(row.signStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="使用时长">
          <template #default="{ row }">
            {{ calculateDuration(row.signinTime, row.signoutTime) }}
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!historyLoading && signHistory.length === 0" description="暂无签到记录" />

      <!-- 分页 -->
      <div class="pagination-container" v-if="signHistory.length > 0">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="totalRecords"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="loadSignHistory"
          @current-change="loadSignHistory"
        />
      </div>
    </el-card>

    <!-- 签到统计 -->
    <el-card class="stats-card">
      <template #header>
        <div class="card-header">
          <span class="title">📊 签到统计</span>
        </div>
      </template>
      <el-row :gutter="20">
        <el-col :xs="12" :sm="6">
          <el-statistic title="总签到次数" :value="signStats.total" />
        </el-col>
        <el-col :xs="12" :sm="6">
          <el-statistic title="正常签到" :value="signStats.normal">
            <template #suffix>
              <span style="color: #67C23A; font-size: 14px;"> 次</span>
            </template>
          </el-statistic>
        </el-col>
        <el-col :xs="12" :sm="6">
          <el-statistic title="迟到次数" :value="signStats.late">
            <template #suffix>
              <span style="color: #E6A23C; font-size: 14px;"> 次</span>
            </template>
          </el-statistic>
        </el-col>
        <el-col :xs="12" :sm="6">
          <el-statistic title="出勤率" :value="signStats.attendanceRate" suffix="%" />
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Grid, Clock, OfficeBuilding, Check, Close } from '@element-plus/icons-vue'

// 今日日期
const todayDate = computed(() => {
  return new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  })
})

// 今日预约
const todayReservations = ref<any[]>([])
const signingIn = ref<number | null>(null)
const signingOut = ref<number | null>(null)

// 签到历史
const signHistory = ref<any[]>([])
const historyLoading = ref(false)
const filterStatus = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const totalRecords = ref(0)

// 签到统计
const signStats = reactive({
  total: 0,
  normal: 0,
  late: 0,
  absent: 0,
  attendanceRate: 0
})

// 获取当前用户ID
const getCurrentUserId = () => {
  return sessionStorage.getItem('userId') || '1'
}

// 加载今日预约
const loadTodayReservations = async () => {
  try {
    const userId = getCurrentUserId()
    const today = new Date().toISOString().split('T')[0]

    // 获取用户的预约
    const response = await fetch(`http://localhost:8080/admin/reservations/user/${userId}`)
    const result = await response.json()

    if (result.code === 200) {
      // 筛选今日预约
      const allReservations = result.data || []
      const todayList = allReservations.filter((r: any) => r.resvDate === today)

      // 获取签到记录并关联
      const signsResponse = await fetch(`http://localhost:8080/admin/signs/user/${userId}`)
      const signsResult = await signsResponse.json()
      const signs = signsResult.code === 200 ? signsResult.data || [] : []

      // 将签到记录关联到预约
      todayReservations.value = todayList.map((reservation: any) => {
        const signRecord = signs.find((s: any) => s.reservation?.resvId === reservation.resvId)
        return { ...reservation, signRecord }
      })
    }
  } catch (error) {
    console.error('加载今日预约失败:', error)
    ElMessage.error('加载今日预约失败')
  }
}

// 加载签到历史
const loadSignHistory = async () => {
  historyLoading.value = true
  try {
    const userId = getCurrentUserId()

    let url = `http://localhost:8080/admin/signs/user/${userId}`
    if (filterStatus.value) {
      url = `http://localhost:8080/admin/signs/status/${filterStatus.value}`
    }

    const response = await fetch(url)
    const result = await response.json()

    if (result.code === 200) {
      let records = result.data || []

      // 如果按状态筛选，需要再按用户过滤
      if (filterStatus.value) {
        records = records.filter((r: any) => String(r.user?.userId) === userId)
      }

      totalRecords.value = records.length

      // 分页
      const start = (currentPage.value - 1) * pageSize.value
      signHistory.value = records.slice(start, start + pageSize.value)

      // 计算统计
      calculateStats(result.data || [])
    }
  } catch (error) {
    console.error('加载签到历史失败:', error)
  } finally {
    historyLoading.value = false
  }
}

// 计算统计数据
const calculateStats = (allRecords: any[]) => {
  const userId = getCurrentUserId()
  const userRecords = allRecords.filter((r: any) => String(r.user?.userId) === userId)

  signStats.total = userRecords.length
  signStats.normal = userRecords.filter((r: any) => r.signStatus === 'NORMAL').length
  signStats.late = userRecords.filter((r: any) => r.signStatus === 'LATE').length
  signStats.absent = userRecords.filter((r: any) => r.signStatus === 'ABSENT').length

  const attended = signStats.normal + signStats.late
  signStats.attendanceRate = signStats.total > 0
    ? Math.round((attended / signStats.total) * 100)
    : 100
}

// 签到
const handleSignIn = async (reservation: any) => {
  try {
    await ElMessageBox.confirm(
      `确认签到？\n座位: ${reservation.seat?.seatNumber || '-'}\n时间: ${formatTime(reservation.resvstartTime)} - ${formatTime(reservation.resvendTime)}`,
      '签到确认',
      { confirmButtonText: '确认签到', cancelButtonText: '取消', type: 'info' }
    )

    signingIn.value = reservation.resvId

    // 调用签到API
    const response = await fetch('http://localhost:8080/sign/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reservationId: reservation.resvId,
        userId: getCurrentUserId()
      })
    })

    const result = await response.json()

    if (result.code === 200) {
      ElMessage.success('签到成功！')
      loadTodayReservations()
      loadSignHistory()
    } else {
      ElMessage.error(result.message || '签到失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('签到失败:', error)
      ElMessage.error('签到失败，请重试')
    }
  } finally {
    signingIn.value = null
  }
}

// 签退
const handleSignOut = async (reservation: any) => {
  try {
    await ElMessageBox.confirm(
      '确认签退？签退后将结束本次使用。',
      '签退确认',
      { confirmButtonText: '确认签退', cancelButtonText: '取消', type: 'warning' }
    )

    signingOut.value = reservation.resvId

    // 调用签退API
    const response = await fetch('http://localhost:8080/sign/signout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signId: reservation.signRecord?.signId,
        userId: getCurrentUserId()
      })
    })

    const result = await response.json()

    if (result.code === 200) {
      ElMessage.success('签退成功！')
      loadTodayReservations()
      loadSignHistory()
    } else {
      ElMessage.error(result.message || '签退失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('签退失败:', error)
      ElMessage.error('签退失败，请重试')
    }
  } finally {
    signingOut.value = null
  }
}

// 格式化时间
const formatTime = (time: string) => {
  if (!time) return '-'
  if (time.length > 5) return time.substring(0, 5)
  return time
}

// 格式化日期时间
const formatDateTime = (datetime: string) => {
  if (!datetime) return '-'
  try {
    const date = new Date(datetime)
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return datetime
  }
}

// 计算时长
const calculateDuration = (start: string, end: string) => {
  if (!start || !end) return '-'
  try {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const diffMs = endDate.getTime() - startDate.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    const hours = Math.floor(diffMins / 60)
    const mins = diffMins % 60

    if (hours > 0 && mins > 0) return `${hours}小时${mins}分钟`
    if (hours > 0) return `${hours}小时`
    return `${mins}分钟`
  } catch {
    return '-'
  }
}

// 获取状态类型
const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    'NORMAL': 'success',
    'LATE': 'warning',
    'ABSENT': 'danger',
    'MAKEUP': 'info'
  }
  return map[status] || 'info'
}

// 获取状态文本
const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    'NORMAL': '正常',
    'LATE': '迟到',
    'ABSENT': '缺席',
    'MAKEUP': '补签'
  }
  return map[status] || status || '-'
}

// 页面加载
onMounted(() => {
  loadTodayReservations()
  loadSignHistory()
})
</script>

<style scoped>
.signin-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

/* 今日预约卡片 */
.today-card {
  border-radius: 12px;
}

.today-reservations {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.reservation-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7ed 100%);
  border-radius: 12px;
  flex-wrap: wrap;
  gap: 16px;
}

.reservation-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.seat-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.seat-icon {
  color: #409EFF;
  font-size: 24px;
}

.time-info,
.room-info {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #606266;
  font-size: 14px;
}

.reservation-status {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.signed-info,
.completed-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.signin-time,
.time-details {
  font-size: 12px;
  color: #909399;
}

.time-details {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

/* 历史记录卡片 */
.history-card {
  border-radius: 12px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

/* 统计卡片 */
.stats-card {
  border-radius: 12px;
}

/* 响应式 */
@media (max-width: 768px) {
  .reservation-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .reservation-status {
    width: 100%;
    justify-content: space-between;
  }

  .signed-info,
  .completed-info {
    align-items: flex-start;
  }
}
</style>
