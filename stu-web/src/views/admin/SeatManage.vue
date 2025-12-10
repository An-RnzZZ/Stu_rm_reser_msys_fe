<template>
  <div class="seat-manage">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>🪑 座位管理</h1>
      <p>查看和管理自习室座位信息</p>
    </div>

    <!-- 操作栏 -->
    <el-card class="filter-card" shadow="hover">
      <div class="filter-bar">
        <div class="filter-left">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索座位编号..."
            clearable
            style="width: 250px"
            :prefix-icon="Search"
            @input="handleSearch"
          />
          <el-select
            v-model="filterRoom"
            placeholder="筛选自习室"
            clearable
            style="width: 180px"
            @change="handleSearch"
          >
            <el-option
              v-for="room in roomOptions"
              :key="room.value"
              :label="room.label"
              :value="room.value"
            />
          </el-select>
        </div>
        <div class="filter-right">
          <el-button type="primary" :icon="Refresh" @click="loadSeats">
            刷新
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 座位统计 -->
    <el-row :gutter="16" class="stat-row">
      <el-col :xs="12" :sm="8">
        <div class="mini-stat">
          <span class="mini-stat-value">{{ stats.total }}</span>
          <span class="mini-stat-label">座位总数</span>
        </div>
      </el-col>
      <el-col :xs="12" :sm="8">
        <div class="mini-stat">
          <span class="mini-stat-value" style="color: #67C23A;">{{ stats.available }}</span>
          <span class="mini-stat-label">可用座位</span>
        </div>
      </el-col>
      <el-col :xs="12" :sm="8">
        <div class="mini-stat">
          <span class="mini-stat-value" style="color: #E6A23C;">{{ roomOptions.length }}</span>
          <span class="mini-stat-label">自习室数量</span>
        </div>
      </el-col>
    </el-row>

    <!-- 座位列表 -->
    <el-card class="table-card" shadow="hover">
      <el-table
        :data="filteredSeats"
        stripe
        style="width: 100%"
        v-loading="loading"
        empty-text="暂无座位数据"
      >
        <el-table-column prop="seatId" label="座位ID" width="90" sortable />

        <el-table-column label="座位编号" width="150">
          <template #default="{ row }">
            <div class="seat-cell">
              <div class="seat-icon">
                <el-icon><Grid /></el-icon>
              </div>
              <span class="seat-number">{{ row.seatNumber || '-' }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="所属自习室" min-width="180">
          <template #default="{ row }">
            <div v-if="row.room">
              <div class="room-name">{{ row.room.roomName }}</div>
              <div class="room-info" v-if="row.room.roomFloor">
                {{ row.room.roomFloor }}楼
              </div>
            </div>
            <span v-else class="text-muted">未分配</span>
          </template>
        </el-table-column>

        <el-table-column label="座位位置" width="120">
          <template #default="{ row }">
            <span v-if="row.seatRow && row.seatCol">
              第{{ row.seatRow }}排 第{{ row.seatCol }}列
            </span>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.seatStatus === 'AVAILABLE' ? 'success' : 'warning'">
              {{ row.seatStatus === 'AVAILABLE' ? '可用' : '占用' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link :icon="View" @click="handleViewDetail(row)">
              详情
            </el-button>
            <el-button type="primary" link :icon="Calendar" @click="handleViewReservations(row)">
              预约
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

    <!-- 座位详情弹窗 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="座位详情"
      width="500px"
    >
      <div class="detail-content" v-if="currentSeat">
        <div class="detail-header">
          <div class="seat-big-icon">
            <el-icon><Grid /></el-icon>
          </div>
          <div class="seat-title">
            <h3>{{ currentSeat.seatNumber }}</h3>
            <p>{{ currentSeat.room?.roomName || '未分配自习室' }}</p>
          </div>
        </div>

        <el-divider />

        <div class="detail-item">
          <span class="detail-label">座位ID</span>
          <span class="detail-value">{{ currentSeat.seatId }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">座位编号</span>
          <span class="detail-value">{{ currentSeat.seatNumber }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">所属自习室</span>
          <span class="detail-value">{{ currentSeat.room?.roomName || '-' }}</span>
        </div>
        <div class="detail-item" v-if="currentSeat.room?.roomFloor">
          <span class="detail-label">楼层</span>
          <span class="detail-value">{{ currentSeat.room.roomFloor }}楼</span>
        </div>
        <div class="detail-item" v-if="currentSeat.seatRow">
          <span class="detail-label">位置</span>
          <span class="detail-value">第{{ currentSeat.seatRow }}排 第{{ currentSeat.seatCol }}列</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">状态</span>
          <el-tag :type="currentSeat.seatStatus === 'AVAILABLE' ? 'success' : 'warning'">
            {{ currentSeat.seatStatus === 'AVAILABLE' ? '可用' : '占用' }}
          </el-tag>
        </div>
      </div>
      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 座位预约记录弹窗 -->
    <el-dialog
      v-model="reservationsDialogVisible"
      :title="`座位 ${currentSeat?.seatNumber || ''} 的预约记录`"
      width="700px"
    >
      <el-table :data="seatReservations" stripe v-loading="reservationsLoading">
        <el-table-column prop="resvId" label="预约ID" width="80" />
        <el-table-column label="用户" width="120">
          <template #default="{ row }">
            {{ row.user?.userName || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="resvDate" label="日期" width="120" />
        <el-table-column label="时间段">
          <template #default="{ row }">
            {{ formatTime(row.resvstartTime) }} - {{ formatTime(row.resvendTime) }}
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
      <el-empty v-if="!reservationsLoading && seatReservations.length === 0" description="暂无预约记录" />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh, View, Grid, Calendar } from '@element-plus/icons-vue'

// 座位数据
const seats = ref<any[]>([])
const loading = ref(false)

// 分页
const currentPage = ref(1)
const pageSize = ref(10)
const totalCount = ref(0)

// 筛选
const searchKeyword = ref('')
const filterRoom = ref('')

// 自习室选项
const roomOptions = ref<{ label: string; value: string }[]>([])

// 统计
const stats = reactive({
  total: 0,
  available: 0
})

// 弹窗
const detailDialogVisible = ref(false)
const reservationsDialogVisible = ref(false)
const currentSeat = ref<any>(null)
const seatReservations = ref<any[]>([])
const reservationsLoading = ref(false)

// 过滤后的座位列表
const filteredSeats = computed(() => {
  let result = [...seats.value]

  // 关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(s =>
      s.seatNumber?.toLowerCase().includes(keyword)
    )
  }

  // 自习室筛选
  if (filterRoom.value) {
    result = result.filter(s => s.room?.roomName === filterRoom.value)
  }

  totalCount.value = result.length

  // 分页
  const start = (currentPage.value - 1) * pageSize.value
  return result.slice(start, start + pageSize.value)
})

// 加载座位数据
const loadSeats = async () => {
  loading.value = true
  try {
    const response = await fetch('http://localhost:8080/admin/seats')
    const result = await response.json()

    if (result.code === 200) {
      seats.value = result.data || []
      calculateStats()
      extractRoomOptions()
    } else {
      ElMessage.error(result.message || '加载座位列表失败')
    }
  } catch (error) {
    console.error('加载座位列表失败:', error)
    ElMessage.error('加载失败，请检查网络连接')
  } finally {
    loading.value = false
  }
}

// 计算统计
const calculateStats = () => {
  stats.total = seats.value.length
  stats.available = seats.value.filter(s => s.seatStatus === 'AVAILABLE' || !s.seatStatus).length
}

// 提取自习室选项
const extractRoomOptions = () => {
  const roomSet = new Set<string>()
  seats.value.forEach(seat => {
    if (seat.room?.roomName) {
      roomSet.add(seat.room.roomName)
    }
  })
  roomOptions.value = Array.from(roomSet).map(name => ({
    label: name,
    value: name
  }))
}

// 搜索处理
const handleSearch = () => {
  currentPage.value = 1
}

// 分页处理
const handleSizeChange = () => {
  currentPage.value = 1
}

const handlePageChange = () => {}

// 查看详情
const handleViewDetail = (seat: any) => {
  currentSeat.value = seat
  detailDialogVisible.value = true
}

// 查看座位预约记录
const handleViewReservations = async (seat: any) => {
  currentSeat.value = seat
  reservationsDialogVisible.value = true
  reservationsLoading.value = true

  try {
    // 获取所有预约，然后筛选该座位的预约
    const response = await fetch('http://localhost:8080/admin/reservations')
    const result = await response.json()

    if (result.code === 200) {
      const allReservations = result.data || []
      seatReservations.value = allReservations.filter(
        (r: any) => r.seat?.seatId === seat.seatId
      )
    } else {
      seatReservations.value = []
    }
  } catch (error) {
    console.error('加载预约记录失败:', error)
    seatReservations.value = []
  } finally {
    reservationsLoading.value = false
  }
}

// 格式化时间
const formatTime = (time: string) => {
  if (!time) return '-'
  if (time.length > 5) {
    return time.substring(0, 5)
  }
  return time
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
  loadSeats()
})
</script>

<style scoped>
.seat-manage {
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

.seat-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.seat-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 18px;
}

.seat-number {
  font-weight: 600;
  color: #1e3a5f;
}

.room-name {
  font-weight: 500;
  color: #1e3a5f;
}

.room-info {
  font-size: 12px;
  color: #7f8c8d;
}

.text-muted {
  color: #909399;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 10px;
}

.seat-big-icon {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 28px;
}

.seat-title h3 {
  margin: 0 0 4px 0;
  font-size: 20px;
  color: #1e3a5f;
}

.seat-title p {
  margin: 0;
  color: #7f8c8d;
  font-size: 14px;
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
