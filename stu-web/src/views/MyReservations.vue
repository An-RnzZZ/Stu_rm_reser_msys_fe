<template>
  <div class="reservations-container">
    <el-card class="reservations-card">
      <template #header>
        <div class="card-header">
          <span class="title">我的预约记录</span>
          <div class="header-actions">
            <el-date-picker
              v-model="filterDate"
              type="date"
              placeholder="选择日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              clearable
              style="width: 150px; margin-right: 12px;"
              @change="handleFilter"
            />
            <el-select v-model="filterStatus" placeholder="全部状态" style="width: 120px;" @change="handleFilter">
              <el-option label="全部" value="" />
              <el-option label="今日" value="today" />
              <el-option label="未来" value="future" />
              <el-option label="已过期" value="past" />
            </el-select>
            <el-button type="primary" :icon="Refresh" style="margin-left: 12px;" @click="loadReservations">
              刷新
            </el-button>
          </div>
        </div>
      </template>

      <el-table
        :data="filteredReservations"
        v-loading="loading"
        style="width: 100%"
        empty-text="暂无预约记录"
      >
        <el-table-column prop="resvId" label="预约ID" width="100" />
        <el-table-column label="自习室" width="150">
          <template #default="{ row }">
            {{ row.seat?.room?.roomName || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="resvDate" label="日期" width="120" sortable />
        <el-table-column label="时间段" width="150">
          <template #default="{ row }">
            {{ formatTime(row.resvstartTime) }} - {{ formatTime(row.resvendTime) }}
          </template>
        </el-table-column>
        <el-table-column label="座位号" width="100">
          <template #default="{ row }">
            {{ row.seat?.seatNumber || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row)">
              {{ getStatusText(row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="viewDetails(row)">
              详情
            </el-button>
            <el-popconfirm
              v-if="canCancel(row)"
              title="确定要取消这个预约吗？"
              confirm-button-text="确定"
              cancel-button-text="取消"
              @confirm="cancelReservation(row)"
            >
              <template #reference>
                <el-button type="danger" size="small">取消</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="totalReservations"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>

      <el-row :gutter="20" class="stats-row">
        <el-col :span="6">
          <el-statistic title="总预约次数" :value="stats.total" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="今日预约" :value="stats.today" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="未来预约" :value="stats.future" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="已完成" :value="stats.past" />
        </el-col>
      </el-row>
    </el-card>

    <el-dialog v-model="detailDialogVisible" title="预约详情" width="500px">
      <div v-if="selectedReservation" class="detail-content">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="预约ID">{{ selectedReservation.resvId }}</el-descriptions-item>
          <el-descriptions-item label="自习室">{{ selectedReservation.seat?.room?.roomName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="座位号">{{ selectedReservation.seat?.seatNumber || '-' }}</el-descriptions-item>
          <el-descriptions-item label="预约日期">{{ selectedReservation.resvDate }}</el-descriptions-item>
          <el-descriptions-item label="时间段">
            {{ formatTime(selectedReservation.resvstartTime) }} - {{ formatTime(selectedReservation.resvendTime) }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(selectedReservation)">
              {{ getStatusText(selectedReservation) }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'

interface Reservation {
  resvId: number
  resvDate: string
  resvstartTime: string
  resvendTime: string
  resvStatus?: string  // 预约状态: ACTIVE/COMPLETED/VIOLATED/CANCELLED
  seat?: {
    seatId: number
    seatNumber: string
    room?: {
      roomId: number
      roomName: string
    }
  }
}

const loading = ref(false)
const detailDialogVisible = ref(false)
const selectedReservation = ref<Reservation | null>(null)
const filterDate = ref('')
const filterStatus = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const totalReservations = ref(0)
const reservations = ref<Reservation[]>([])

const stats = reactive({
  total: 0,
  today: 0,
  future: 0,
  past: 0
})

const getTodayDate = () => new Date().toISOString().split('T')[0]

const getCurrentUserId = () => sessionStorage.getItem('userId')

// 加载预约数据
const loadReservations = async () => {
  const userId = getCurrentUserId()

  if (!userId) {
    ElMessage.warning('请先登录')
    return
  }

  loading.value = true
  try {
    const response = await fetch(`http://120.46.219.204:8080/admin/reservations/user/${userId}`)
    const result = await response.json()

    if (result.code === 200) {
      reservations.value = result.data || []
      calculateStats()
      ElMessage.success('数据加载成功')
    } else {
      ElMessage.error(result.message || '加载失败')
    }
  } catch (error) {
    console.error('加载预约数据失败:', error)
    ElMessage.error('加载失败，请检查网络')
  } finally {
    loading.value = false
  }
}

const calculateStats = () => {
  const today = getTodayDate()
  stats.total = reservations.value.length
  stats.today = reservations.value.filter(r => r.resvDate === today).length
  stats.future = reservations.value.filter(r => r.resvDate > today).length
  stats.past = reservations.value.filter(r => r.resvDate < today).length
}

const filteredReservations = computed(() => {
  let result = [...reservations.value]
  const today = getTodayDate()

  if (filterDate.value) {
    result = result.filter(item => item.resvDate === filterDate.value)
  }

  if (filterStatus.value) {
    switch (filterStatus.value) {
      case 'today': result = result.filter(item => item.resvDate === today); break
      case 'future': result = result.filter(item => item.resvDate > today); break
      case 'past': result = result.filter(item => item.resvDate < today); break
    }
  }

  result.sort((a, b) => b.resvDate.localeCompare(a.resvDate))
  totalReservations.value = result.length

  const start = (currentPage.value - 1) * pageSize.value
  return result.slice(start, start + pageSize.value)
})

const formatTime = (time: string) => time?.length > 5 ? time.substring(0, 5) : (time || '-')

// 预约状态映射
const statusMap: Record<string, { type: string; text: string }> = {
  'ACTIVE': { type: 'primary', text: '有效' },
  'COMPLETED': { type: 'success', text: '已完成' },
  'VIOLATED': { type: 'danger', text: '已违约' },
  'CANCELLED': { type: 'info', text: '已取消' }
}

const getStatusType = (row: Reservation) => {
  // 优先使用后端返回的预约状态
  if (row.resvStatus && statusMap[row.resvStatus]) {
    return statusMap[row.resvStatus].type
  }
  // 兼容旧逻辑：根据日期判断
  const today = getTodayDate()
  if (row.resvDate === today) return 'primary'
  if (row.resvDate > today) return 'success'
  return 'info'
}

const getStatusText = (row: Reservation) => {
  // 优先使用后端返回的预约状态
  if (row.resvStatus && statusMap[row.resvStatus]) {
    return statusMap[row.resvStatus].text
  }
  // 兼容旧逻辑：根据日期判断
  const today = getTodayDate()
  if (row.resvDate === today) return '今日'
  if (row.resvDate > today) return '预约中'
  return '已完成'
}

// 只有ACTIVE状态的预约且日期未过期才能取消
const canCancel = (row: Reservation) => {
  const isActive = !row.resvStatus || row.resvStatus === 'ACTIVE'
  return isActive && row.resvDate >= getTodayDate()
}

const cancelReservation = async (reservation: Reservation) => {
  try {
    loading.value = true
    const response = await fetch(`http://120.46.219.204:8080/reservation/${reservation.resvId}`, {
      method: 'DELETE'
    })
    const result = await response.json()

    if (result.code === 200) {
      ElMessage.success('预约已取消')
      await loadReservations()
    } else {
      ElMessage.error(result.message || '取消失败')
    }
  } catch (error) {
    ElMessage.error('取消失败，请重试')
  } finally {
    loading.value = false
  }
}

const viewDetails = (reservation: Reservation) => {
  selectedReservation.value = reservation
  detailDialogVisible.value = true
}

const handleFilter = () => { currentPage.value = 1 }
const handleSizeChange = () => { currentPage.value = 1 }
const handleCurrentChange = () => {}

onMounted(() => {
  loadReservations()
})
</script>

<style scoped>
.reservations-container {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.title {
  font-size: 20px;
  font-weight: bold;
}

.header-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.pagination-container {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
}

.stats-row {
  margin-top: 30px;
}

.detail-content {
  line-height: 1.8;
}

:deep(.el-descriptions__label) {
  width: 100px;
}

@media (max-width: 768px) {
  .card-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .header-actions {
    width: 100%;
  }
}
</style>
