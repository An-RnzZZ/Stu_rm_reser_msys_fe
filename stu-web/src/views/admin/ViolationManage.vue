<template>
  <div class="violation-manage">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>⚠️ 违规管理</h1>
      <p>管理用户的违规记录，包括缺勤和早退</p>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-item">
            <div class="stat-icon total">
              <el-icon><Document /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.total }}</div>
              <div class="stat-label">总违规记录</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-item">
            <div class="stat-icon valid">
              <el-icon><WarningFilled /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.valid }}</div>
              <div class="stat-label">有效违规</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-item">
            <div class="stat-icon appealing">
              <el-icon><ChatLineSquare /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.appealing }}</div>
              <div class="stat-label">申诉中</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-item">
            <div class="stat-icon cleared">
              <el-icon><CircleCheck /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.cleared }}</div>
              <div class="stat-label">已清除</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 搜索和操作栏 -->
    <el-card class="search-card" shadow="hover">
      <div class="search-bar">
        <div class="search-left">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索用户名或违规描述..."
            clearable
            style="width: 250px"
            :prefix-icon="Search"
            @input="handleSearch"
          />
          <el-select v-model="filterType" placeholder="违规类型" clearable style="width: 130px" @change="handleSearch">
            <el-option label="全部类型" value="" />
            <el-option label="缺勤" value="ABSENT" />
            <el-option label="早退" value="EARLY_LEAVE" />
          </el-select>
          <el-select v-model="filterStatus" placeholder="违规状态" clearable style="width: 130px" @change="handleSearch">
            <el-option label="全部状态" value="" />
            <el-option label="有效" value="VALID" />
            <el-option label="申诉中" value="APPEALING" />
            <el-option label="已清除" value="CLEARED" />
          </el-select>
        </div>
        <div class="search-right">
          <el-button type="warning" :icon="Bell" @click="triggerViolationCheck" :loading="checkLoading">
            触发违规检查
          </el-button>
          <el-button type="primary" :icon="Refresh" @click="loadViolations">
            刷新
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 违规记录表格 -->
    <el-card class="table-card" shadow="hover">
      <el-table
        :data="filteredViolations"
        stripe
        style="width: 100%"
        v-loading="loading"
        empty-text="暂无违规记录"
      >
        <el-table-column prop="violationId" label="ID" width="70" sortable />
        <el-table-column label="用户" width="150">
          <template #default="{ row }">
            <div class="user-cell">
              <el-avatar :size="28" class="user-avatar">
                {{ (row.user?.userName || '?').charAt(0).toUpperCase() }}
              </el-avatar>
              <span>{{ row.user?.userName || '-' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="违规类型" width="100">
          <template #default="{ row }">
            <el-tag :type="row.violationType === 'ABSENT' ? 'danger' : 'warning'" size="small">
              {{ row.violationType === 'ABSENT' ? '缺勤' : '早退' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="违规时间" width="170">
          <template #default="{ row }">
            {{ formatDateTime(row.violationTime) }}
          </template>
        </el-table-column>
        <el-table-column prop="violationDesc" label="违规描述" min-width="200" show-overflow-tooltip />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.violationStatus)" size="small">
              {{ getStatusText(row.violationStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="关联预约" width="100">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="viewReservation(row)" v-if="row.reservation">
              #{{ row.reservation?.resvId }}
            </el-button>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="viewDetail(row)">
              详情
            </el-button>
            <el-popconfirm
              v-if="row.violationStatus === 'VALID'"
              title="确定要清除该违规记录吗？"
              confirm-button-text="确定"
              cancel-button-text="取消"
              @confirm="clearViolation(row)"
            >
              <template #reference>
                <el-button type="success" link size="small">
                  清除
                </el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="totalViolations"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailDialogVisible" title="违规详情" width="600px">
      <el-descriptions :column="2" border v-if="currentViolation">
        <el-descriptions-item label="违规ID">{{ currentViolation.violationId }}</el-descriptions-item>
        <el-descriptions-item label="违规类型">
          <el-tag :type="currentViolation.violationType === 'ABSENT' ? 'danger' : 'warning'">
            {{ currentViolation.violationType === 'ABSENT' ? '缺勤' : '早退' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="用户">{{ currentViolation.user?.userName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="用户账号">{{ currentViolation.user?.userAccount || '-' }}</el-descriptions-item>
        <el-descriptions-item label="违规时间" :span="2">{{ formatDateTime(currentViolation.violationTime) }}</el-descriptions-item>
        <el-descriptions-item label="违规描述" :span="2">{{ currentViolation.violationDesc }}</el-descriptions-item>
        <el-descriptions-item label="违规状态">
          <el-tag :type="getStatusType(currentViolation.violationStatus)">
            {{ getStatusText(currentViolation.violationStatus) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="关联预约">
          {{ currentViolation.reservation ? `#${currentViolation.reservation.resvId}` : '-' }}
        </el-descriptions-item>
      </el-descriptions>

      <!-- 关联预约信息 -->
      <div v-if="currentViolation?.reservation" style="margin-top: 20px;">
        <h4 style="margin-bottom: 12px; color: #303133;">预约信息</h4>
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="预约日期">{{ currentViolation.reservation.resvDate }}</el-descriptions-item>
          <el-descriptions-item label="时间段">
            {{ currentViolation.reservation.resvstartTime }} - {{ currentViolation.reservation.resvendTime }}
          </el-descriptions-item>
          <el-descriptions-item label="座位">
            {{ currentViolation.reservation.seat?.seatNumber || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="自习室">
            {{ currentViolation.reservation.seat?.room?.roomName || '-' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
        <el-button 
          v-if="currentViolation?.violationStatus === 'VALID'" 
          type="success" 
          @click="clearViolationFromDetail"
        >
          清除违规
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Search,
  Refresh,
  Document,
  WarningFilled,
  ChatLineSquare,
  CircleCheck,
  Bell
} from '@element-plus/icons-vue'

// 类型定义
interface Violation {
  violationId: number
  violationType: string
  violationTime: string
  violationDesc: string
  violationStatus: string
  user?: {
    userId: number
    userName: string
    userAccount: string
  }
  reservation?: {
    resvId: number
    resvDate: string
    resvstartTime: string
    resvendTime: string
    seat?: {
      seatNumber: number
      room?: {
        roomName: string
      }
    }
  }
}

// 状态
const loading = ref(false)
const checkLoading = ref(false)
const violations = ref<Violation[]>([])
const totalViolations = ref(0)

// 分页
const currentPage = ref(1)
const pageSize = ref(10)

// 搜索和筛选
const searchKeyword = ref('')
const filterType = ref('')
const filterStatus = ref('')

// 统计
const stats = reactive({
  total: 0,
  valid: 0,
  appealing: 0,
  cleared: 0
})

// 弹窗
const detailDialogVisible = ref(false)
const currentViolation = ref<Violation | null>(null)

// 过滤后的数据
const filteredViolations = computed(() => {
  let result = violations.value

  // 关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(v =>
      v.user?.userName?.toLowerCase().includes(keyword) ||
      v.violationDesc?.toLowerCase().includes(keyword)
    )
  }

  // 类型筛选
  if (filterType.value) {
    result = result.filter(v => v.violationType === filterType.value)
  }

  // 状态筛选
  if (filterStatus.value) {
    result = result.filter(v => v.violationStatus === filterStatus.value)
  }

  totalViolations.value = result.length

  // 分页
  const start = (currentPage.value - 1) * pageSize.value
  return result.slice(start, start + pageSize.value)
})

// 加载违规记录
const loadViolations = async () => {
  loading.value = true
  try {
    const response = await fetch('http://120.46.219.204:8080/admin/violations')
    const result = await response.json()

    if (result.code === 200) {
      violations.value = result.data || []
      calculateStats()
      ElMessage.success('数据加载成功')
    } else {
      ElMessage.error(result.message || '加载失败')
    }
  } catch (error) {
    console.error('加载违规记录失败:', error)
    ElMessage.error('加载失败，请检查网络连接')
  } finally {
    loading.value = false
  }
}

// 计算统计
const calculateStats = () => {
  stats.total = violations.value.length
  stats.valid = violations.value.filter(v => v.violationStatus === 'VALID').length
  stats.appealing = violations.value.filter(v => v.violationStatus === 'APPEALING').length
  stats.cleared = violations.value.filter(v => v.violationStatus === 'CLEARED').length
}

// 触发违规检查
const triggerViolationCheck = async () => {
  checkLoading.value = true
  try {
    const response = await fetch('http://120.46.219.204:8080/admin/violations/check', {
      method: 'POST'
    })
    const result = await response.json()

    if (result.code === 200) {
      ElMessage.success('违规检查完成')
      loadViolations()
    } else {
      ElMessage.error(result.message || '检查失败')
    }
  } catch (error) {
    console.error('违规检查失败:', error)
    ElMessage.error('检查失败，请重试')
  } finally {
    checkLoading.value = false
  }
}

// 清除违规
const clearViolation = async (violation: Violation) => {
  try {
    const response = await fetch(`http://120.46.219.204:8080/admin/violations/${violation.violationId}`, {
      method: 'DELETE'
    })
    const result = await response.json()

    if (result.code === 200) {
      ElMessage.success('违规记录已清除')
      loadViolations()
    } else {
      ElMessage.error(result.message || '清除失败')
    }
  } catch (error) {
    console.error('清除违规失败:', error)
    ElMessage.error('清除失败，请重试')
  }
}

// 从详情弹窗清除违规
const clearViolationFromDetail = async () => {
  if (currentViolation.value) {
    await clearViolation(currentViolation.value)
    detailDialogVisible.value = false
  }
}

// 查看详情
const viewDetail = (violation: Violation) => {
  currentViolation.value = violation
  detailDialogVisible.value = true
}

// 查看预约
const viewReservation = (violation: Violation) => {
  currentViolation.value = violation
  detailDialogVisible.value = true
}

// 搜索处理
const handleSearch = () => {
  currentPage.value = 1
}

// 分页处理
const handleSizeChange = () => {
  currentPage.value = 1
}

const handlePageChange = () => {
  // 分页变化时自动更新显示
}

// 格式化时间
const formatDateTime = (dateStr: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

// 状态类型和文本
const getStatusType = (status: string) => {
  switch (status) {
    case 'VALID': return 'danger'
    case 'CLEARED': return 'success'
    case 'APPEALING': return 'warning'
    default: return 'info'
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'VALID': return '有效'
    case 'CLEARED': return '已清除'
    case 'APPEALING': return '申诉中'
    default: return status
  }
}

// 页面加载
onMounted(() => {
  loadViolations()
})
</script>

<style scoped>
.violation-manage {
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
.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  border-radius: 12px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.stat-icon.total {
  background: linear-gradient(135deg, #409EFF 0%, #66b1ff 100%);
}

.stat-icon.valid {
  background: linear-gradient(135deg, #f56c6c 0%, #fab6b6 100%);
}

.stat-icon.appealing {
  background: linear-gradient(135deg, #e6a23c 0%, #f0c78a 100%);
}

.stat-icon.cleared {
  background: linear-gradient(135deg, #67c23a 0%, #95d475 100%);
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

/* 搜索卡片 */
.search-card {
  border-radius: 12px;
  margin-bottom: 20px;
}

.search-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.search-left {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.search-right {
  display: flex;
  gap: 12px;
}

/* 表格卡片 */
.table-card {
  border-radius: 12px;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 600;
  font-size: 12px;
}

/* 分页 */
.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

/* 弹窗样式 */
:deep(.el-dialog) {
  border-radius: 12px;
}

:deep(.el-dialog__header) {
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 15px;
}

:deep(.el-dialog__footer) {
  border-top: 1px solid #f0f0f0;
  padding-top: 15px;
}

/* 响应式 */
@media (max-width: 1200px) {
  .stats-row .el-col {
    margin-bottom: 12px;
  }
}

@media (max-width: 768px) {
  .search-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .search-left,
  .search-right {
    width: 100%;
  }
}
</style>
