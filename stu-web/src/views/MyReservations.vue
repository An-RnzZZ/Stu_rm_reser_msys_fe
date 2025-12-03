<template>
  <div class="reservations-container">
    <el-card class="reservations-card">
      <template #header>
        <div class="card-header">
          <span class="title">我的预约记录</span>
          <div class="header-actions">
            <el-date-picker
              v-model="filterDate"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              style="width: 240px; margin-right: 16px;"
            />
            <el-select v-model="filterStatus" placeholder="全部状态" style="width: 120px;">
              <el-option label="全部" value="" />
              <el-option label="已预约" value="RESERVED" />
              <el-option label="使用中" value="IN_USE" />
              <el-option label="已完成" value="COMPLETED" />
              <el-option label="已取消" value="CANCELLED" />
            </el-select>
          </div>
        </div>
      </template>

      <el-table
        :data="filteredReservations"
        v-loading="loading"
        style="width: 100%"
        :default-sort="{ prop: 'reservationTime', order: 'descending' }"
      >
        <el-table-column prop="id" label="预约ID" width="100" />
        <el-table-column prop="roomName" label="自习室" width="150" />
        <el-table-column prop="date" label="日期" width="120">
          <template #default="{ row }">
            {{ formatDate(row.date) }}
          </template>
        </el-table-column>
        <el-table-column prop="timeSlot" label="时间段" width="180" />
        <el-table-column prop="seatNumber" label="座位号" width="100" />
        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="预约时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.createTime) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'RESERVED'"
              type="danger"
              size="small"
              @click="cancelReservation(row)"
            >
              取消预约
            </el-button>
            <el-button
              v-if="row.status === 'RESERVED'"
              type="primary"
              size="small"
              @click="viewDetails(row)"
            >
              查看详情
            </el-button>
            <span v-else class="no-action">--</span>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
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

      <!-- 统计信息 -->
      <el-row :gutter="20" class="stats-row">
        <el-col :span="6">
          <el-statistic title="总预约次数" :value="stats.total" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="进行中" :value="stats.active" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="已完成" :value="stats.completed" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="取消率" :value="stats.cancelRate" suffix="%" />
        </el-col>
      </el-row>
    </el-card>

    <!-- 详情对话框 -->
    <el-dialog v-model="detailDialogVisible" title="预约详情" width="500px">
      <div v-if="selectedReservation" class="detail-content">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="预约ID">
            {{ selectedReservation.id }}
          </el-descriptions-item>
          <el-descriptions-item label="自习室">
            {{ selectedReservation.roomName }}
          </el-descriptions-item>
          <el-descriptions-item label="预约时间">
            {{ formatDate(selectedReservation.date) }} {{ selectedReservation.timeSlot }}
          </el-descriptions-item>
          <el-descriptions-item label="座位号">
            {{ selectedReservation.seatNumber || '未分配' }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(selectedReservation.status)">
              {{ getStatusText(selectedReservation.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="备注">
            {{ selectedReservation.remark || '无' }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatDateTime(selectedReservation.createTime) }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { Reservation } from '@/types/reservation'

const loading = ref(false)
const detailDialogVisible = ref(false)
const selectedReservation = ref<Reservation | null>(null)

// 筛选条件
const filterDate = ref<[Date, Date] | null>(null)
const filterStatus = ref('')

// 分页
const currentPage = ref(1)
const pageSize = ref(10)
const totalReservations = ref(0)

// 统计信息
const stats = reactive({
  total: 0,
  active: 0,
  completed: 0,
  cancelRate: 0
})

// 模拟数据
const reservations = ref<Reservation[]>([
  { id: 1, roomName: '静思阁', date: new Date(), timeSlot: '09:00-12:00', seatNumber: 'A12', status: 'RESERVED', remark: '需要电源插座', createTime: new Date('2024-01-15 08:30:00') },
  { id: 2, roomName: '致远轩', date: new Date(Date.now() + 86400000), timeSlot: '14:00-16:00', seatNumber: 'B05', status: 'RESERVED', remark: '', createTime: new Date('2024-01-14 15:20:00') },
  { id: 3, roomName: '明德堂', date: new Date('2024-01-10'), timeSlot: '19:00-21:00', seatNumber: 'C08', status: 'COMPLETED', remark: '', createTime: new Date('2024-01-09 10:15:00') },
  { id: 4, roomName: '博学厅', date: new Date('2024-01-12'), timeSlot: '10:00-12:00', seatNumber: 'D03', status: 'CANCELLED', remark: '时间冲突', createTime: new Date('2024-01-11 09:45:00') },
  { id: 5, roomName: '创新空间', date: new Date(), timeSlot: '15:00-17:00', seatNumber: 'E11', status: 'IN_USE', remark: '小组讨论', createTime: new Date('2024-01-13 14:20:00') }
])

// 计算属性：筛选后的预约记录
const filteredReservations = computed(() => {
  let result = reservations.value

  // 按状态筛选
  if (filterStatus.value) {
    result = result.filter(item => item.status === filterStatus.value)
  }

  // 按日期筛选
  if (filterDate.value) {
    const [start, end] = filterDate.value
    result = result.filter(item => {
      const itemDate = new Date(item.date)
      return itemDate >= start && itemDate <= end
    })
  }

  // 分页
  totalReservations.value = result.length
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return result.slice(start, end)
})

// 状态类型映射
const getStatusType = (status: string) => {
  const typeMap: Record<string, string> = {
    'RESERVED': 'primary',
    'IN_USE': 'warning',
    'COMPLETED': 'success',
    'CANCELLED': 'info'
  }
  return typeMap[status] || 'info'
}

// 状态文本映射
const getStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    'RESERVED': '已预约',
    'IN_USE': '使用中',
    'COMPLETED': '已完成',
    'CANCELLED': '已取消'
  }
  return textMap[status] || status
}

// 格式化日期
const formatDate = (date: Date) => {
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

// 格式化日期时间
const formatDateTime = (date: Date) => {
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 取消预约
const cancelReservation = async (reservation: Reservation) => {
  try {
    await ElMessageBox.confirm(
      `确定要取消预约吗？\n自习室：${reservation.roomName}\n时间：${formatDate(reservation.date)} ${reservation.timeSlot}`,
      '取消确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 模拟API调用
    loading.value = true
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 更新状态
    reservation.status = 'CANCELLED'
    ElMessage.success('预约已取消')
    updateStats()
  } catch {
    // 用户取消操作
  } finally {
    loading.value = false
  }
}

// 查看详情
const viewDetails = (reservation: Reservation) => {
  selectedReservation.value = reservation
  detailDialogVisible.value = true
}

// 更新统计信息
const updateStats = () => {
  const total = reservations.value.length
  const active = reservations.value.filter(r => r.status === 'RESERVED' || r.status === 'IN_USE').length
  const completed = reservations.value.filter(r => r.status === 'COMPLETED').length
  const cancelled = reservations.value.filter(r => r.status === 'CANCELLED').length

  stats.total = total
  stats.active = active
  stats.completed = completed
  stats.cancelRate = total > 0 ? Math.round((cancelled / total) * 100) : 0
}

// 分页处理
const handleSizeChange = (val: number) => {
  pageSize.value = val
  currentPage.value = 1
}

const handleCurrentChange = (val: number) => {
  currentPage.value = val
}

onMounted(() => {
  updateStats()
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
}

.pagination-container {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
}

.stats-row {
  margin-top: 30px;
}

.no-action {
  color: #909399;
  font-size: 14px;
}

.detail-content {
  line-height: 1.8;
}

:deep(.el-descriptions__label) {
  width: 100px;
}
</style>
