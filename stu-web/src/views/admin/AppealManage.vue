<template>
  <div class="appeal-manage">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>📝 申诉管理</h1>
      <p>处理用户提交的违规申诉请求</p>
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
              <div class="stat-label">总申诉数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card pending-card" shadow="hover" @click="filterStatus = 'PENDING'">
          <div class="stat-item">
            <div class="stat-icon pending">
              <el-icon><Clock /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.pending }}</div>
              <div class="stat-label">待处理</div>
            </div>
            <el-badge :value="stats.pending" v-if="stats.pending > 0" class="pending-badge" />
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover" @click="filterStatus = 'APPROVED'">
          <div class="stat-item">
            <div class="stat-icon approved">
              <el-icon><CircleCheck /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.approved }}</div>
              <div class="stat-label">已通过</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover" @click="filterStatus = 'REJECTED'">
          <div class="stat-item">
            <div class="stat-icon rejected">
              <el-icon><CircleClose /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.rejected }}</div>
              <div class="stat-label">已驳回</div>
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
            placeholder="搜索用户名或申诉理由..."
            clearable
            style="width: 280px"
            :prefix-icon="Search"
            @input="handleSearch"
          />
          <el-select v-model="filterStatus" placeholder="申诉状态" clearable style="width: 130px" @change="handleSearch">
            <el-option label="全部状态" value="" />
            <el-option label="待处理" value="PENDING" />
            <el-option label="已通过" value="APPROVED" />
            <el-option label="已驳回" value="REJECTED" />
          </el-select>
        </div>
        <div class="search-right">
          <el-button type="primary" :icon="Refresh" @click="loadAppeals">
            刷新
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 申诉记录表格 -->
    <el-card class="table-card" shadow="hover">
      <el-table
        :data="filteredAppeals"
        stripe
        style="width: 100%"
        v-loading="loading"
        empty-text="暂无申诉记录"
        row-class-name="appeal-row"
      >
        <el-table-column prop="appealId" label="ID" width="70" sortable />
        <el-table-column label="申诉用户" width="140">
          <template #default="{ row }">
            <div class="user-cell">
              <el-avatar :size="28" class="user-avatar">
                {{ (row.user?.userName || '?').charAt(0).toUpperCase() }}
              </el-avatar>
              <span>{{ row.user?.userName || '-' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="违规信息" width="150">
          <template #default="{ row }">
            <div v-if="row.violation">
              <el-tag :type="row.violation.violationType === 'ABSENT' ? 'danger' : 'warning'" size="small">
                {{ row.violation.violationType === 'ABSENT' ? '缺勤' : '早退' }}
              </el-tag>
              <span style="margin-left: 4px; color: #909399;">#{{ row.violation.violationId }}</span>
            </div>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="appealReason" label="申诉理由" min-width="200" show-overflow-tooltip />
        <el-table-column label="申诉时间" width="170">
          <template #default="{ row }">
            {{ formatDateTime(row.appealTime) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.appealStatus)" size="small">
              {{ getStatusText(row.appealStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="处理结果" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.processRemark">{{ row.processRemark }}</span>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="viewDetail(row)">
              详情
            </el-button>
            <template v-if="row.appealStatus === 'PENDING'">
              <el-button type="success" link size="small" @click="handleApprove(row)">
                通过
              </el-button>
              <el-button type="danger" link size="small" @click="handleReject(row)">
                驳回
              </el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="totalAppeals"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailDialogVisible" title="申诉详情" width="650px">
      <div v-if="currentAppeal">
        <!-- 申诉信息 -->
        <h4 class="section-title">申诉信息</h4>
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="申诉ID">{{ currentAppeal.appealId }}</el-descriptions-item>
          <el-descriptions-item label="申诉状态">
            <el-tag :type="getStatusType(currentAppeal.appealStatus)">
              {{ getStatusText(currentAppeal.appealStatus) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="申诉用户">{{ currentAppeal.user?.userName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="用户账号">{{ currentAppeal.user?.userAccount || '-' }}</el-descriptions-item>
          <el-descriptions-item label="申诉时间" :span="2">{{ formatDateTime(currentAppeal.appealTime) }}</el-descriptions-item>
          <el-descriptions-item label="申诉理由" :span="2">
            <div class="appeal-reason">{{ currentAppeal.appealReason }}</div>
          </el-descriptions-item>
        </el-descriptions>

        <!-- 违规信息 -->
        <h4 class="section-title" style="margin-top: 20px;">关联违规信息</h4>
        <el-descriptions :column="2" border size="small" v-if="currentAppeal.violation">
          <el-descriptions-item label="违规ID">{{ currentAppeal.violation.violationId }}</el-descriptions-item>
          <el-descriptions-item label="违规类型">
            <el-tag :type="currentAppeal.violation.violationType === 'ABSENT' ? 'danger' : 'warning'">
              {{ currentAppeal.violation.violationType === 'ABSENT' ? '缺勤' : '早退' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="违规时间" :span="2">
            {{ formatDateTime(currentAppeal.violation.violationTime) }}
          </el-descriptions-item>
          <el-descriptions-item label="违规描述" :span="2">
            {{ currentAppeal.violation.violationDesc }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 处理结果（已处理的申诉显示） -->
        <div v-if="currentAppeal.appealStatus !== 'PENDING'" style="margin-top: 20px;">
          <h4 class="section-title">处理结果</h4>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="处理状态">
              <el-tag :type="getStatusType(currentAppeal.appealStatus)">
                {{ getStatusText(currentAppeal.appealStatus) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="处理时间">
              {{ formatDateTime(currentAppeal.processTime) }}
            </el-descriptions-item>
            <el-descriptions-item label="处理管理员">
              {{ currentAppeal.admin?.adminName || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="处理备注" :span="2">
              {{ currentAppeal.processRemark || '-' }}
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </div>

      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
        <template v-if="currentAppeal?.appealStatus === 'PENDING'">
          <el-button type="danger" @click="handleReject(currentAppeal)">驳回申诉</el-button>
          <el-button type="success" @click="handleApprove(currentAppeal)">通过申诉</el-button>
        </template>
      </template>
    </el-dialog>

    <!-- 处理申诉弹窗 -->
    <el-dialog v-model="processDialogVisible" :title="processType === 'approve' ? '通过申诉' : '驳回申诉'" width="500px">
      <el-alert
        :type="processType === 'approve' ? 'success' : 'warning'"
        :closable="false"
        style="margin-bottom: 20px;"
      >
        <template #title>
          {{ processType === 'approve' ? '通过申诉将清除该违规记录，用户的违规次数将减少1次' : '驳回申诉后，违规记录将恢复为有效状态' }}
        </template>
      </el-alert>

      <el-form :model="processForm" :rules="processRules" ref="processFormRef" label-width="100px">
        <el-form-item label="申诉ID">
          <el-input :value="processAppeal?.appealId" disabled />
        </el-form-item>
        <el-form-item label="申诉用户">
          <el-input :value="processAppeal?.user?.userName" disabled />
        </el-form-item>
        <el-form-item label="处理备注" prop="processRemark">
          <el-input
            v-model="processForm.processRemark"
            type="textarea"
            :rows="3"
            :placeholder="processType === 'approve' ? '请输入通过理由（可选）' : '请输入驳回理由'"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="processDialogVisible = false">取消</el-button>
        <el-button
          :type="processType === 'approve' ? 'success' : 'danger'"
          @click="confirmProcess"
          :loading="processLoading"
        >
          {{ processType === 'approve' ? '确认通过' : '确认驳回' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import {
  Search,
  Refresh,
  Document,
  Clock,
  CircleCheck,
  CircleClose
} from '@element-plus/icons-vue'

// 类型定义
interface Appeal {
  appealId: number
  appealReason: string
  appealTime: string
  appealStatus: string
  processRemark: string | null
  processTime: string | null
  user?: {
    userId: number
    userName: string
    userAccount: string
  }
  violation?: {
    violationId: number
    violationType: string
    violationTime: string
    violationDesc: string
    violationStatus: string
  }
  admin?: {
    adminId: number
    adminName: string
  }
}

// 状态
const loading = ref(false)
const processLoading = ref(false)
const appeals = ref<Appeal[]>([])
const totalAppeals = ref(0)

// 分页
const currentPage = ref(1)
const pageSize = ref(10)

// 搜索和筛选
const searchKeyword = ref('')
const filterStatus = ref('')

// 统计
const stats = reactive({
  total: 0,
  pending: 0,
  approved: 0,
  rejected: 0
})

// 弹窗
const detailDialogVisible = ref(false)
const processDialogVisible = ref(false)
const currentAppeal = ref<Appeal | null>(null)
const processAppeal = ref<Appeal | null>(null)
const processType = ref<'approve' | 'reject'>('approve')

// 处理表单
const processFormRef = ref<FormInstance>()
const processForm = reactive({
  processRemark: ''
})

const processRules: FormRules = {
  processRemark: [
    { max: 200, message: '备注不能超过200字', trigger: 'blur' }
  ]
}

// 过滤后的数据
const filteredAppeals = computed(() => {
  let result = appeals.value

  // 关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(a =>
      a.user?.userName?.toLowerCase().includes(keyword) ||
      a.appealReason?.toLowerCase().includes(keyword)
    )
  }

  // 状态筛选
  if (filterStatus.value) {
    result = result.filter(a => a.appealStatus === filterStatus.value)
  }

  totalAppeals.value = result.length

  // 分页
  const start = (currentPage.value - 1) * pageSize.value
  return result.slice(start, start + pageSize.value)
})

// 获取管理员ID
const getAdminId = () => {
  return sessionStorage.getItem('adminId')
}

// 加载申诉记录
const loadAppeals = async () => {
  loading.value = true
  try {
    const response = await fetch('/api/admin/appeals')
    const result = await response.json()

    if (result.code === 200) {
      appeals.value = result.data || []
      calculateStats()
      ElMessage.success('数据加载成功')
    } else {
      ElMessage.error(result.message || '加载失败')
    }
  } catch (error) {
    console.error('加载申诉记录失败:', error)
    ElMessage.error('加载失败，请检查网络连接')
  } finally {
    loading.value = false
  }
}

// 计算统计
const calculateStats = () => {
  stats.total = appeals.value.length
  stats.pending = appeals.value.filter(a => a.appealStatus === 'PENDING').length
  stats.approved = appeals.value.filter(a => a.appealStatus === 'APPROVED').length
  stats.rejected = appeals.value.filter(a => a.appealStatus === 'REJECTED').length
}

// 查看详情
const viewDetail = (appeal: Appeal) => {
  currentAppeal.value = appeal
  detailDialogVisible.value = true
}

// 处理通过
const handleApprove = (appeal: Appeal) => {
  processAppeal.value = appeal
  processType.value = 'approve'
  processForm.processRemark = ''
  processDialogVisible.value = true
  detailDialogVisible.value = false
}

// 处理驳回
const handleReject = (appeal: Appeal) => {
  processAppeal.value = appeal
  processType.value = 'reject'
  processForm.processRemark = ''
  processDialogVisible.value = true
  detailDialogVisible.value = false
}

// 确认处理
const confirmProcess = async () => {
  if (!processAppeal.value) return

  const adminId = getAdminId()
  if (!adminId) {
    ElMessage.error('请先登录管理员账号')
    return
  }

  // 驳回时必须填写理由
  if (processType.value === 'reject' && !processForm.processRemark.trim()) {
    ElMessage.warning('请填写驳回理由')
    return
  }

  processLoading.value = true
  try {
    const endpoint = processType.value === 'approve' ? 'approve' : 'reject'
    const response = await fetch(`/api/admin/appeals/${processAppeal.value.appealId}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminId: parseInt(adminId),
        processRemark: processForm.processRemark || (processType.value === 'approve' ? '申诉通过' : '申诉驳回')
      })
    })

    const result = await response.json()

    if (result.code === 200) {
      ElMessage.success(processType.value === 'approve' ? '申诉已通过，违规记录已清除' : '申诉已驳回')
      processDialogVisible.value = false
      loadAppeals()
    } else {
      ElMessage.error(result.message || '处理失败')
    }
  } catch (error) {
    console.error('处理申诉失败:', error)
    ElMessage.error('处理失败，请重试')
  } finally {
    processLoading.value = false
  }
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
    case 'PENDING': return 'warning'
    case 'APPROVED': return 'success'
    case 'REJECTED': return 'danger'
    default: return 'info'
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'PENDING': return '待处理'
    case 'APPROVED': return '已通过'
    case 'REJECTED': return '已驳回'
    default: return status
  }
}

// 页面加载
onMounted(() => {
  loadAppeals()
})
</script>

<style scoped>
.appeal-manage {
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
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.pending-card {
  position: relative;
}

.pending-badge {
  position: absolute;
  top: 10px;
  right: 10px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
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

.stat-icon.pending {
  background: linear-gradient(135deg, #e6a23c 0%, #f0c78a 100%);
}

.stat-icon.approved {
  background: linear-gradient(135deg, #67c23a 0%, #95d475 100%);
}

.stat-icon.rejected {
  background: linear-gradient(135deg, #f56c6c 0%, #fab6b6 100%);
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

.text-muted {
  color: #909399;
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

.section-title {
  margin: 0 0 12px 0;
  font-size: 15px;
  color: #303133;
  font-weight: 600;
}

.appeal-reason {
  line-height: 1.6;
  white-space: pre-wrap;
}

/* 待处理行高亮 */
:deep(.appeal-row) {
  cursor: pointer;
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
