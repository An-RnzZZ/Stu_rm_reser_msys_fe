<template>
  <div class="reservation-manage">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>📅 预约管理</h1>
      <p>查看和管理所有座位预约记录</p>
    </div>

    <!-- 筛选栏 -->
    <el-card class="filter-card" shadow="hover">
      <div class="filter-bar">
        <div class="filter-left">
          <el-date-picker
            v-model="filterDate"
            type="date"
            placeholder="选择日期筛选"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            clearable
            @change="handleDateFilter"
          />
          <el-select
            v-model="filterStatus"
            placeholder="预约状态"
            clearable
            style="width: 140px"
            @change="handleFilter"
          >
            <el-option label="全部" value="" />
            <el-option label="今日预约" value="today" />
            <el-option label="未来预约" value="future" />
            <el-option label="已完成" value="past" />
          </el-select>
          <el-input
            v-model="searchKeyword"
            placeholder="搜索用户名..."
            clearable
            style="width: 200px"
            :prefix-icon="Search"
            @input="handleFilter"
          />
        </div>
        <div class="filter-right">
          <el-button type="primary" :icon="Refresh" @click="loadReservations">
            刷新
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 统计信息 -->
    <el-row :gutter="16" class="stat-row">
      <el-col :xs="12" :sm="6">
        <div class="mini-stat">
          <span class="mini-stat-value">{{ stats.total }}</span>
          <span class="mini-stat-label">总预约数</span>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="mini-stat">
          <span class="mini-stat-value" style="color: #409EFF;">{{ stats.today }}</span>
          <span class="mini-stat-label">今日预约</span>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="mini-stat">
          <span class="mini-stat-value" style="color: #67C23A;">{{ stats.future }}</span>
          <span class="mini-stat-label">未来预约</span>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="mini-stat">
          <span class="mini-stat-value" style="color: #909399;">{{ stats.past }}</span>
          <span class="mini-stat-label">已完成</span>
        </div>
      </el-col>
    </el-row>

    <!-- 预约列表 -->
    <el-card class="table-card" shadow="hover">
      <el-table
        :data="filteredReservations"
        stripe
        style="width: 100%"
        v-loading="loading"
        empty-text="暂无预约记录"
      >
        <el-table-column prop="resvId" label="预约ID" width="90" sortable />

        <el-table-column label="用户" width="140">
          <template #default="{ row }">
            <div class="user-cell">
              <el-avatar :size="28" class="user-avatar">
                {{ (row.user?.userName || '?').charAt(0).toUpperCase() }}
              </el-avatar>
              <span>{{ row.user?.userName || '-' }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="座位信息" width="150">
          <template #default="{ row }">
            <div>
              <div class="seat-number">{{ row.seat?.seatNumber || '-' }}</div>
              <div class="seat-room" v-if="row.seat?.room">
                {{ row.seat.room.roomName }}
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="resvDate" label="预约日期" width="120" sortable />

        <el-table-column label="时间段" width="150">
          <template #default="{ row }">
            <el-tag type="info" effect="plain">
              {{ formatTime(row.resvstartTime) }} - {{ formatTime(row.resvendTime) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="时长" width="80">
          <template #default="{ row }">
            {{ calculateDuration(row.resvstartTime, row.resvendTime) }}
          </template>
        </el-table-column>

        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.resvDate)" effect="dark">
              {{ getStatusText(row.resvDate) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link :icon="View" @click="handleViewDetail(row)">
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="totalCount"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- 预约详情弹窗 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="预约详情"
      width="500px"
    >
      <div class="detail-content" v-if="currentReservation">
        <div class="detail-item">
          <span class="detail-label">预约ID</span>
          <span class="detail-value">{{ currentReservation.resvId }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">用户</span>
          <span class="detail-value">
            {{ currentReservation.user?.userName || '-' }}
            ({{ currentReservation.user?.userAccount || '-' }})
          </span>
        </div>
        <div class="detail-item">
          <span class="detail-label">座位</span>
          <span class="detail-value">{{ currentReservation.seat?.seatNumber || '-' }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">预约日期</span>
          <span class="detail-value">{{ currentReservation.resvDate }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">时间段</span>
          <span class="detail-value">
            {{ formatTime(currentReservation.resvstartTime) }} -
            {{ formatTime(currentReservation.resvendTime) }}
          </span>
        </div>
        <div class="detail-item">
          <span class="detail-label">时长</span>
          <span class="detail-value">
            {{ calculateDuration(currentReservation.resvstartTime, currentReservation.resvendTime) }}
          </span>
        </div>
        <div class="detail-item">
          <span class="detail-label">状态</span>
          <el-tag :type="getStatusType(currentReservation.resvDate)" effect="dark">
            {{ getStatusText(currentReservation.resvDate) }}
          </el-tag>
        </div>
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
import { Search, Refresh, View } from '@element-plus/icons-vue'

// 预约数据
const reservations = ref<any[]>([])
const loading = ref(false)

// 分页
const currentPage = ref(1)
const pageSize = ref(10)
const totalCount = ref(0)

// 筛选
const filterDate = ref('')
const filterStatus = ref('')
const searchKeyword = ref('')

// 统计
const stats = reactive({
  total: 0,
  today: 0,
  future: 0,
  past: 0
})

// 详情弹窗
const detailDialogVisible = ref(false)
const currentReservation = ref<any>(null)

// 过滤后的预约列表
const filteredReservations = computed(() => {
  let result = [...reservations.value]
  const today = new Date().toISOString().split('T')[0]

  // 日期筛选
  if (filterDate.value) {
    result = result.filter(r => r.resvDate === filterDate.value)
  }

  // 状态筛选
  if (filterStatus.value) {
    switch (filterStatus.value) {
      case 'today':
        result = result.filter(r => r.resvDate === today)
        break
      case 'future':
        result = result.filter(r => r.resvDate > today)
        break
      case 'past':
        result = result.filter(r => r.resvDate < today)
        break
    }
  }

  // 关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(r =>
      r.user?.userName?.toLowerCase().includes(keyword) ||
      r.user?.userAccount?.toLowerCase().includes(keyword)
    )
  }

  totalCount.value = result.length

  // 分页
  const start = (currentPage.value - 1) * pageSize.value
  return result.slice(start, start + pageSize.value)
})

// 加载预约数据
const loadReservations = async () => {
  loading.value = true
  try {
    const response = await fetch('http://localhost:8080/admin/reservations')
    const result = await response.json()

    if (result.code === 200) {
      reservations.value = result.data || []
      calculateStats()
    } else {
      ElMessage.error(result.message || '加载预约列表失败')
    }
  } catch (error) {
    console.error('加载预约列表失败:', error)
    ElMessage.error('加载失败，请检查网络连接')
  } finally {
    loading.value = false
  }
}

// 计算统计数据
const calculateStats = () => {
  const today = new Date().toISOString().split('T')[0]
  stats.total = reservations.value.length
  stats.today = reservations.value.filter(r => r.resvDate === today).length
  stats.future = reservations.value.filter(r => r.resvDate > today).length
  stats.past = reservations.value.filter(r => r.resvDate < today).length
}

// 日期筛选
const handleDateFilter = () => {
  currentPage.value = 1
}

// 通用筛选
const handleFilter = () => {
  currentPage.value = 1
}

// 分页
const handleSizeChange = () => {
  currentPage.value = 1
}

const handlePageChange = () => {}

// 查看详情
const handleViewDetail = (reservation: any) => {
  currentReservation.value = reservation
  detailDialogVisible.value = true
}

// 格式化时间
const formatTime = (time: string) => {
  if (!time) return '-'
  if (time.length > 5) {
    return time.substring(0, 5)
  }
  return time
}

// 计算时长
const calculateDuration = (start: string, end: string) => {
  if (!start || !end) return '-'

  const parseTime = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }

  const startMin = parseTime(start)
  const endMin = parseTime(end)
  const diff = endMin - startMin

  const hours = Math.floor(diff / 60)
  const mins = diff % 60

  if (hours > 0 && mins > 0) {
    return `${hours}h${mins}m`
  } else if (hours > 0) {
    return `${hours}h`
  } else {
    return `${mins}m`
  }
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

// 页面加载
onMounted(() => {
  loadReservations()
})
</script>

<style scoped>
.reservation-manage {
  max-width: 1400px;
  margin: 0 auto;
}

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

.filter-card {
  border-radius: 12px;
  margin-bottom: 16px;
}

.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.filter-left {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.stat-row {
  margin-bottom: 16px;
}

.mini-stat {
  background: white;
  border-radius: 10px;
  padding: 16px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.mini-stat-value {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: #1e3a5f;
}

.mini-stat-label {
  font-size: 12px;
  color: #7f8c8d;
  margin-top: 4px;
}

.table-card {
  border-radius: 12px;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-avatar {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
  font-weight: 600;
  font-size: 12px;
}

.seat-number {
  font-weight: 600;
  color: #1e3a5f;
}

.seat-room {
  font-size: 12px;
  color: #7f8c8d;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.detail-content {
  padding: 10px 0;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-label {
  color: #7f8c8d;
  font-size: 14px;
}

.detail-value {
  color: #1e3a5f;
  font-weight: 500;
}

@media (max-width: 768px) {
  .filter-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-left {
    flex-direction: column;
  }

  .filter-left > * {
    width: 100% !important;
  }
}
</style>
