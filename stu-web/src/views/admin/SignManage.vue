<template>
  <div class="sign-manage">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>✅ 签到记录</h1>
      <p>查看用户签到和签退记录</p>
    </div>

    <!-- 筛选栏 -->
    <el-card class="filter-card" shadow="hover">
      <div class="filter-bar">
        <div class="filter-left">
          <el-select
            v-model="filterStatus"
            placeholder="签到状态"
            clearable
            style="width: 150px"
            @change="handleFilter"
          >
            <el-option label="全部状态" value="" />
            <el-option label="正常签到" value="NORMAL">
              <el-tag type="success" size="small">正常</el-tag>
            </el-option>
            <el-option label="迟到" value="LATE">
              <el-tag type="warning" size="small">迟到</el-tag>
            </el-option>
            <el-option label="补签" value="MAKEUP">
              <el-tag type="info" size="small">补签</el-tag>
            </el-option>
            <el-option label="缺席" value="ABSENT">
              <el-tag type="danger" size="small">缺席</el-tag>
            </el-option>
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
          <el-button type="primary" :icon="Refresh" @click="loadSigns">
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
          <span class="mini-stat-label">总签到数</span>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="mini-stat">
          <span class="mini-stat-value" style="color: #67C23A;">{{ stats.normal }}</span>
          <span class="mini-stat-label">正常签到</span>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="mini-stat">
          <span class="mini-stat-value" style="color: #E6A23C;">{{ stats.late }}</span>
          <span class="mini-stat-label">迟到</span>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="mini-stat">
          <span class="mini-stat-value" style="color: #F56C6C;">{{ stats.absent }}</span>
          <span class="mini-stat-label">缺席</span>
        </div>
      </el-col>
    </el-row>

    <!-- 签到列表 -->
    <el-card class="table-card" shadow="hover">
      <el-table
        :data="filteredSigns"
        stripe
        style="width: 100%"
        v-loading="loading"
        empty-text="暂无签到记录"
      >
        <el-table-column prop="signId" label="签到ID" width="90" sortable />

        <el-table-column label="用户" width="140">
          <template #default="{ row }">
            <div class="user-cell" v-if="row.user">
              <el-avatar :size="28" class="user-avatar">
                {{ (row.user.userName || '?').charAt(0).toUpperCase() }}
              </el-avatar>
              <span>{{ row.user.userName || '-' }}</span>
            </div>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>

        <el-table-column label="关联预约" width="150">
          <template #default="{ row }">
            <div v-if="row.reservation">
              <div class="resv-date">{{ row.reservation.resvDate }}</div>
              <div class="resv-seat" v-if="row.reservation.seat">
                座位: {{ row.reservation.seat.seatNumber }}
              </div>
            </div>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>

        <el-table-column label="签到时间" width="180">
          <template #default="{ row }">
            <div v-if="row.signinTime" class="time-cell">
              <el-icon><Clock /></el-icon>
              {{ formatDateTime(row.signinTime) }}
            </div>
            <span v-else class="text-muted">未签到</span>
          </template>
        </el-table-column>

        <el-table-column label="签退时间" width="180">
          <template #default="{ row }">
            <div v-if="row.signoutTime" class="time-cell">
              <el-icon><Clock /></el-icon>
              {{ formatDateTime(row.signoutTime) }}
            </div>
            <span v-else class="text-muted">未签退</span>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.signStatus)" effect="dark">
              {{ getStatusLabel(row.signStatus) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="100" fixed="right">
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

    <!-- 签到详情弹窗 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="签到详情"
      width="550px"
    >
      <div class="detail-content" v-if="currentSign">
        <!-- 状态卡片 -->
        <div class="status-card" :class="getStatusClass(currentSign.signStatus)">
          <div class="status-icon">
            <el-icon v-if="currentSign.signStatus === 'NORMAL'"><CircleCheck /></el-icon>
            <el-icon v-else-if="currentSign.signStatus === 'LATE'"><Warning /></el-icon>
            <el-icon v-else-if="currentSign.signStatus === 'ABSENT'"><CircleClose /></el-icon>
            <el-icon v-else><InfoFilled /></el-icon>
          </div>
          <div class="status-text">{{ getStatusLabel(currentSign.signStatus) }}</div>
        </div>

        <el-divider />

        <div class="detail-item">
          <span class="detail-label">签到ID</span>
          <span class="detail-value">{{ currentSign.signId }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">用户</span>
          <span class="detail-value">
            {{ currentSign.user?.userName || '-' }}
            ({{ currentSign.user?.userAccount || '-' }})
          </span>
        </div>
        <div class="detail-item" v-if="currentSign.reservation">
          <span class="detail-label">预约日期</span>
          <span class="detail-value">{{ currentSign.reservation.resvDate }}</span>
        </div>
        <div class="detail-item" v-if="currentSign.reservation?.seat">
          <span class="detail-label">座位</span>
          <span class="detail-value">{{ currentSign.reservation.seat.seatNumber }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">签到时间</span>
          <span class="detail-value">{{ formatDateTime(currentSign.signinTime) || '未签到' }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">签退时间</span>
          <span class="detail-value">{{ formatDateTime(currentSign.signoutTime) || '未签退' }}</span>
        </div>
        <div class="detail-item" v-if="currentSign.signinTime && currentSign.signoutTime">
          <span class="detail-label">使用时长</span>
          <span class="detail-value">{{ calculateDuration(currentSign.signinTime, currentSign.signoutTime) }}</span>
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
import {
  Search, Refresh, View, Clock,
  CircleCheck, Warning, CircleClose, InfoFilled
} from '@element-plus/icons-vue'

// 签到数据
const signs = ref<any[]>([])
const loading = ref(false)

// 分页
const currentPage = ref(1)
const pageSize = ref(10)
const totalCount = ref(0)

// 筛选
const filterStatus = ref('')
const searchKeyword = ref('')

// 统计
const stats = reactive({
  total: 0,
  normal: 0,
  late: 0,
  absent: 0
})

// 弹窗
const detailDialogVisible = ref(false)
const currentSign = ref<any>(null)

// 过滤后的签到列表
const filteredSigns = computed(() => {
  let result = [...signs.value]

  // 状态筛选
  if (filterStatus.value) {
    result = result.filter(s => s.signStatus === filterStatus.value)
  }

  // 关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(s =>
      s.user?.userName?.toLowerCase().includes(keyword) ||
      s.user?.userAccount?.toLowerCase().includes(keyword)
    )
  }

  totalCount.value = result.length

  // 分页
  const start = (currentPage.value - 1) * pageSize.value
  return result.slice(start, start + pageSize.value)
})

// 加载签到数据
const loadSigns = async () => {
  loading.value = true
  try {
    const response = await fetch('/api/admin/signs')
    const result = await response.json()

    if (result.code === 200) {
      signs.value = result.data || []
      calculateStats()
    } else {
      ElMessage.error(result.message || '加载签到记录失败')
    }
  } catch (error) {
    console.error('加载签到记录失败:', error)
    ElMessage.error('加载失败，请检查网络连接')
  } finally {
    loading.value = false
  }
}

// 计算统计
const calculateStats = () => {
  stats.total = signs.value.length
  stats.normal = signs.value.filter(s => s.signStatus === 'NORMAL').length
  stats.late = signs.value.filter(s => s.signStatus === 'LATE').length
  stats.absent = signs.value.filter(s => s.signStatus === 'ABSENT').length
}

// 筛选处理
const handleFilter = () => {
  currentPage.value = 1
}

// 分页处理
const handleSizeChange = () => {
  currentPage.value = 1
}

const handlePageChange = () => {}

// 查看详情
const handleViewDetail = (sign: any) => {
  currentSign.value = sign
  detailDialogVisible.value = true
}

// 格式化日期时间
const formatDateTime = (datetime: string) => {
  if (!datetime) return ''
  try {
    const date = new Date(datetime)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
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

    if (hours > 0 && mins > 0) {
      return `${hours}小时${mins}分钟`
    } else if (hours > 0) {
      return `${hours}小时`
    } else {
      return `${mins}分钟`
    }
  } catch {
    return '-'
  }
}

// 获取状态标签类型
const getStatusTagType = (status: string) => {
  switch (status) {
    case 'NORMAL': return 'success'
    case 'LATE': return 'warning'
    case 'ABSENT': return 'danger'
    case 'MAKEUP': return 'info'
    default: return 'info'
  }
}

// 获取状态文本
const getStatusLabel = (status: string) => {
  switch (status) {
    case 'NORMAL': return '正常'
    case 'LATE': return '迟到'
    case 'ABSENT': return '缺席'
    case 'MAKEUP': return '补签'
    default: return status || '-'
  }
}

// 获取状态类
const getStatusClass = (status: string) => {
  switch (status) {
    case 'NORMAL': return 'status-normal'
    case 'LATE': return 'status-late'
    case 'ABSENT': return 'status-absent'
    default: return 'status-info'
  }
}

// 页面加载
onMounted(() => {
  loadSigns()
})
</script>

<style scoped>
.sign-manage {
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
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
  font-weight: 600;
  font-size: 12px;
}

.resv-date {
  font-weight: 500;
  color: #1e3a5f;
}

.resv-seat {
  font-size: 12px;
  color: #7f8c8d;
}

.time-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #606266;
}

.text-muted {
  color: #909399;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.detail-content {
  padding: 10px 0;
}

.status-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 10px;
}

.status-card.status-normal {
  background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
  color: #155724;
}

.status-card.status-late {
  background: linear-gradient(135deg, #fff3cd 0%, #ffeeba 100%);
  color: #856404;
}

.status-card.status-absent {
  background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
  color: #721c24;
}

.status-card.status-info {
  background: linear-gradient(135deg, #e2e3e5 0%, #d6d8db 100%);
  color: #383d41;
}

.status-icon {
  font-size: 40px;
  margin-bottom: 8px;
}

.status-text {
  font-size: 18px;
  font-weight: 600;
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
