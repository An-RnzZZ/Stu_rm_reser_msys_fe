<template>
  <div class="violations-container">
    <!-- 违规状态卡片 -->
    <el-row :gutter="20" class="status-row">
      <el-col :span="6">
        <el-card class="status-card" shadow="hover">
          <div class="status-item">
            <div class="status-icon" :class="{ 'danger': violationStatus.violationCount >= 3 }">
              <el-icon><WarningFilled /></el-icon>
            </div>
            <div class="status-info">
              <div class="status-value">{{ violationStatus.violationCount }}</div>
              <div class="status-label">违规次数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="status-card" shadow="hover">
          <div class="status-item">
            <div class="status-icon success">
              <el-icon><Ticket /></el-icon>
            </div>
            <div class="status-info">
              <div class="status-value">{{ violationStatus.makeupChances }}</div>
              <div class="status-label">剩余补签次数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="status-card" shadow="hover">
          <div class="status-item">
            <div class="status-icon" :class="violationStatus.isBlacklisted ? 'danger' : 'success'">
              <el-icon><UserFilled /></el-icon>
            </div>
            <div class="status-info">
              <div class="status-value">{{ violationStatus.isBlacklisted ? '是' : '否' }}</div>
              <div class="status-label">黑名单状态</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="status-card" shadow="hover">
          <div class="status-item">
            <div class="status-icon warning">
              <el-icon><Clock /></el-icon>
            </div>
            <div class="status-info">
              <div class="status-value">{{ violationStatus.blacklistUntil ? formatDate(violationStatus.blacklistUntil) : '-' }}</div>
              <div class="status-label">黑名单解除时间</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 黑名单警告 -->
    <el-alert
      v-if="violationStatus.isBlacklisted"
      title="您当前处于黑名单中，无法进行预约操作"
      type="error"
      :closable="false"
      show-icon
      style="margin-bottom: 20px;"
    >
      <template #default>
        黑名单将于 {{ formatDate(violationStatus.blacklistUntil) }} 自动解除，届时违规次数将重置为0。
      </template>
    </el-alert>

    <!-- 违规记录列表 -->
    <el-card class="violations-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span class="title">
            <el-icon><Document /></el-icon>
            我的违规记录
          </span>
          <el-button type="primary" :icon="Refresh" @click="loadData">刷新</el-button>
        </div>
      </template>

      <el-table
        :data="violations"
        v-loading="loading"
        stripe
        style="width: 100%"
        empty-text="暂无违规记录，继续保持！"
      >
        <el-table-column prop="violationId" label="ID" width="80" />
        <el-table-column label="违规类型" width="120">
          <template #default="{ row }">
            <el-tag :type="row.violationType === 'ABSENT' ? 'danger' : 'warning'">
              {{ row.violationType === 'ABSENT' ? '缺勤' : '早退' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="违规时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.violationTime) }}
          </template>
        </el-table-column>
        <el-table-column prop="violationDesc" label="违规描述" min-width="200" show-overflow-tooltip />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.violationStatus)">
              {{ getStatusText(row.violationStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <!-- 补签按钮（仅缺勤且有效的违规可补签） -->
            <el-button
              v-if="row.violationType === 'ABSENT' && row.violationStatus === 'VALID' && violationStatus.makeupChances > 0"
              type="success"
              size="small"
              @click="handleMakeup(row)"
            >
              补签
            </el-button>
            <!-- 申诉按钮（仅有效的违规可申诉） -->
            <el-button
              v-if="row.violationStatus === 'VALID'"
              type="warning"
              size="small"
              @click="handleAppeal(row)"
            >
              申诉
            </el-button>
            <!-- 查看申诉状态 -->
            <el-button
              v-if="row.violationStatus === 'APPEALING'"
              type="info"
              size="small"
              @click="viewAppealStatus(row)"
            >
              查看申诉
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 我的申诉记录 -->
    <el-card class="appeals-card" shadow="hover" style="margin-top: 20px;">
      <template #header>
        <div class="card-header">
          <span class="title">
            <el-icon><ChatLineSquare /></el-icon>
            我的申诉记录
          </span>
        </div>
      </template>

      <el-table
        :data="appeals"
        v-loading="appealsLoading"
        stripe
        style="width: 100%"
        empty-text="暂无申诉记录"
      >
        <el-table-column prop="appealId" label="申诉ID" width="80" />
        <el-table-column label="违规ID" width="80">
          <template #default="{ row }">
            {{ row.violation?.violationId || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="appealReason" label="申诉理由" min-width="200" show-overflow-tooltip />
        <el-table-column label="申诉时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.appealTime) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getAppealStatusType(row.appealStatus)">
              {{ getAppealStatusText(row.appealStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="处理结果" min-width="150">
          <template #default="{ row }">
            <span v-if="row.processRemark">{{ row.processRemark }}</span>
            <span v-else class="text-muted">待处理</span>
          </template>
        </el-table-column>
        <el-table-column label="处理时间" width="180">
          <template #default="{ row }">
            {{ row.processTime ? formatDateTime(row.processTime) : '-' }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 补签对话框 -->
    <el-dialog v-model="makeupDialogVisible" title="使用补签" width="450px">
      <el-alert type="info" :closable="false" style="margin-bottom: 20px;">
        <template #title>
          补签说明
        </template>
        <ul style="margin: 10px 0 0 0; padding-left: 20px;">
          <li>补签将消耗1次补签机会（剩余：{{ violationStatus.makeupChances }} 次）</li>
          <li>补签成功后，该违规记录将被清除</li>
          <li>您的违规次数将减少1次</li>
        </ul>
      </el-alert>
      
      <el-descriptions :column="1" border v-if="currentViolation">
        <el-descriptions-item label="违规ID">{{ currentViolation.violationId }}</el-descriptions-item>
        <el-descriptions-item label="违规类型">缺勤</el-descriptions-item>
        <el-descriptions-item label="违规时间">{{ formatDateTime(currentViolation.violationTime) }}</el-descriptions-item>
        <el-descriptions-item label="违规描述">{{ currentViolation.violationDesc }}</el-descriptions-item>
      </el-descriptions>

      <template #footer>
        <el-button @click="makeupDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmMakeup" :loading="makeupLoading">确认补签</el-button>
      </template>
    </el-dialog>

    <!-- 申诉对话框 -->
    <el-dialog v-model="appealDialogVisible" title="提交申诉" width="500px">
      <el-form :model="appealForm" :rules="appealRules" ref="appealFormRef" label-width="80px">
        <el-form-item label="违规ID">
          <el-input :value="currentViolation?.violationId" disabled />
        </el-form-item>
        <el-form-item label="违规类型">
          <el-input :value="currentViolation?.violationType === 'ABSENT' ? '缺勤' : '早退'" disabled />
        </el-form-item>
        <el-form-item label="申诉理由" prop="appealReason">
          <el-input
            v-model="appealForm.appealReason"
            type="textarea"
            :rows="4"
            placeholder="请详细说明申诉理由，以便管理员审核..."
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="appealDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAppeal" :loading="appealLoading">提交申诉</el-button>
      </template>
    </el-dialog>

    <!-- 查看申诉详情对话框 -->
    <el-dialog v-model="viewAppealDialogVisible" title="申诉详情" width="500px">
      <el-descriptions :column="1" border v-if="currentAppeal">
        <el-descriptions-item label="申诉ID">{{ currentAppeal.appealId }}</el-descriptions-item>
        <el-descriptions-item label="申诉理由">{{ currentAppeal.appealReason }}</el-descriptions-item>
        <el-descriptions-item label="申诉时间">{{ formatDateTime(currentAppeal.appealTime) }}</el-descriptions-item>
        <el-descriptions-item label="申诉状态">
          <el-tag :type="getAppealStatusType(currentAppeal.appealStatus)">
            {{ getAppealStatusText(currentAppeal.appealStatus) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="处理结果" v-if="currentAppeal.processRemark">
          {{ currentAppeal.processRemark }}
        </el-descriptions-item>
        <el-descriptions-item label="处理时间" v-if="currentAppeal.processTime">
          {{ formatDateTime(currentAppeal.processTime) }}
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="viewAppealDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import {
  WarningFilled,
  Ticket,
  UserFilled,
  Clock,
  Document,
  ChatLineSquare,
  Refresh
} from '@element-plus/icons-vue'

// 类型定义
interface ViolationStatus {
  userId: number
  userName: string
  violationCount: number
  makeupChances: number
  isBlacklisted: boolean
  blacklistUntil: string | null
}

interface Violation {
  violationId: number
  violationType: string
  violationTime: string
  violationDesc: string
  violationStatus: string
  reservation?: any
}

interface Appeal {
  appealId: number
  appealReason: string
  appealTime: string
  appealStatus: string
  processRemark: string | null
  processTime: string | null
  violation?: Violation
}

// 状态
const loading = ref(false)
const appealsLoading = ref(false)
const makeupLoading = ref(false)
const appealLoading = ref(false)

const violationStatus = reactive<ViolationStatus>({
  userId: 0,
  userName: '',
  violationCount: 0,
  makeupChances: 2,
  isBlacklisted: false,
  blacklistUntil: null
})

const violations = ref<Violation[]>([])
const appeals = ref<Appeal[]>([])

// 对话框
const makeupDialogVisible = ref(false)
const appealDialogVisible = ref(false)
const viewAppealDialogVisible = ref(false)
const currentViolation = ref<Violation | null>(null)
const currentAppeal = ref<Appeal | null>(null)

// 申诉表单
const appealFormRef = ref<FormInstance>()
const appealForm = reactive({
  appealReason: ''
})

const appealRules: FormRules = {
  appealReason: [
    { required: true, message: '请输入申诉理由', trigger: 'blur' },
    { min: 10, max: 500, message: '申诉理由需要10-500个字符', trigger: 'blur' }
  ]
}

// 获取当前用户ID
const getCurrentUserId = () => {
  return sessionStorage.getItem('userId')
}

// 加载数据
const loadData = async () => {
  const userId = getCurrentUserId()
  if (!userId) {
    ElMessage.warning('请先登录')
    return
  }

  await Promise.all([
    loadViolationStatus(userId),
    loadViolations(userId),
    loadAppeals(userId)
  ])
}

// 加载违规状态
const loadViolationStatus = async (userId: string) => {
  try {
    const response = await fetch(`http://120.46.219.204:8080/violation/status/${userId}`)
    const result = await response.json()
    if (result.code === 200 && result.data) {
      Object.assign(violationStatus, result.data)
    }
  } catch (error) {
    console.error('加载违规状态失败:', error)
  }
}

// 加载违规记录
const loadViolations = async (userId: string) => {
  loading.value = true
  try {
    const response = await fetch(`http://120.46.219.204:8080/violation/user/${userId}`)
    const result = await response.json()
    if (result.code === 200) {
      violations.value = result.data || []
    }
  } catch (error) {
    console.error('加载违规记录失败:', error)
    ElMessage.error('加载违规记录失败')
  } finally {
    loading.value = false
  }
}

// 加载申诉记录
const loadAppeals = async (userId: string) => {
  appealsLoading.value = true
  try {
    const response = await fetch(`http://120.46.219.204:8080/violation/appeal/user/${userId}`)
    const result = await response.json()
    if (result.code === 200) {
      appeals.value = result.data || []
    }
  } catch (error) {
    console.error('加载申诉记录失败:', error)
  } finally {
    appealsLoading.value = false
  }
}

// 处理补签
const handleMakeup = (violation: Violation) => {
  currentViolation.value = violation
  makeupDialogVisible.value = true
}

// 确认补签
const confirmMakeup = async () => {
  if (!currentViolation.value) return

  const userId = getCurrentUserId()
  if (!userId) return

  makeupLoading.value = true
  try {
    const response = await fetch('http://120.46.219.204:8080/violation/makeup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: parseInt(userId),
        violationId: currentViolation.value.violationId,
        resvId: currentViolation.value.reservation?.resvId
      })
    })

    const result = await response.json()
    if (result.code === 200) {
      ElMessage.success('补签成功！违规记录已清除')
      makeupDialogVisible.value = false
      loadData()
    } else {
      ElMessage.error(result.message || '补签失败')
    }
  } catch (error) {
    console.error('补签失败:', error)
    ElMessage.error('补签失败，请重试')
  } finally {
    makeupLoading.value = false
  }
}

// 处理申诉
const handleAppeal = async (violation: Violation) => {
  const userId = getCurrentUserId()
  if (!userId) return

  // 检查是否已申诉
  try {
    const response = await fetch(`http://120.46.219.204:8080/violation/appeal/check?userId=${userId}&violationId=${violation.violationId}`)
    const result = await response.json()
    if (result.code === 200 && result.data?.hasAppealed) {
      ElMessage.warning('您已对该违规记录提交过申诉')
      return
    }
  } catch (error) {
    console.error('检查申诉状态失败:', error)
  }

  currentViolation.value = violation
  appealForm.appealReason = ''
  appealDialogVisible.value = true
}

// 提交申诉
const submitAppeal = async () => {
  if (!appealFormRef.value || !currentViolation.value) return

  const valid = await appealFormRef.value.validate().catch(() => false)
  if (!valid) return

  const userId = getCurrentUserId()
  if (!userId) return

  appealLoading.value = true
  try {
    const response = await fetch('http://120.46.219.204:8080/violation/appeal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: parseInt(userId),
        violationId: currentViolation.value.violationId,
        appealReason: appealForm.appealReason
      })
    })

    const result = await response.json()
    if (result.code === 200) {
      ElMessage.success('申诉提交成功，请等待管理员审核')
      appealDialogVisible.value = false
      loadData()
    } else {
      ElMessage.error(result.message || '申诉提交失败')
    }
  } catch (error) {
    console.error('申诉提交失败:', error)
    ElMessage.error('申诉提交失败，请重试')
  } finally {
    appealLoading.value = false
  }
}

// 查看申诉状态
const viewAppealStatus = async (violation: Violation) => {
  const appeal = appeals.value.find(a => a.violation?.violationId === violation.violationId)
  if (appeal) {
    currentAppeal.value = appeal
    viewAppealDialogVisible.value = true
  } else {
    ElMessage.info('未找到申诉记录')
  }
}

// 格式化日期
const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN')
}

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

const getAppealStatusType = (status: string) => {
  switch (status) {
    case 'PENDING': return 'warning'
    case 'APPROVED': return 'success'
    case 'REJECTED': return 'danger'
    default: return 'info'
  }
}

const getAppealStatusText = (status: string) => {
  switch (status) {
    case 'PENDING': return '待处理'
    case 'APPROVED': return '已通过'
    case 'REJECTED': return '已驳回'
    default: return status
  }
}

// 页面加载
onMounted(() => {
  loadData()
})
</script>

<style scoped>
.violations-container {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.status-row {
  margin-bottom: 20px;
}

.status-card {
  border-radius: 12px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-icon {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  background: linear-gradient(135deg, #409EFF 0%, #66b1ff 100%);
  color: white;
}

.status-icon.success {
  background: linear-gradient(135deg, #67c23a 0%, #95d475 100%);
}

.status-icon.warning {
  background: linear-gradient(135deg, #e6a23c 0%, #f0c78a 100%);
}

.status-icon.danger {
  background: linear-gradient(135deg, #f56c6c 0%, #fab6b6 100%);
}

.status-info {
  flex: 1;
}

.status-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}

.status-label {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

.violations-card,
.appeals-card {
  border-radius: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header .title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: bold;
}

.text-muted {
  color: #909399;
}

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

@media (max-width: 1200px) {
  .status-row .el-col {
    margin-bottom: 12px;
  }
}
</style>
