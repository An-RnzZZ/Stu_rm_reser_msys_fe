<template>
  <div class="user-manage">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>👥 用户管理</h1>
      <p>管理系统中的所有注册用户</p>
    </div>

    <!-- 搜索和操作栏 -->
    <el-card class="search-card" shadow="hover">
      <div class="search-bar">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索用户名或账号..."
          clearable
          style="width: 300px"
          :prefix-icon="Search"
          @input="handleSearch"
        />
        <div class="filter-group">
          <el-select v-model="blacklistFilter" placeholder="黑名单筛选" style="width: 140px" @change="handleSearch">
            <el-option label="全部用户" value="" />
            <el-option label="正常用户" value="normal" />
            <el-option label="黑名单用户" value="blacklisted" />
          </el-select>
          <el-button type="primary" :icon="Refresh" @click="loadUsers">
            刷新
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 用户列表 -->
    <el-card class="table-card" shadow="hover">
      <el-table
        :data="filteredUsers"
        stripe
        style="width: 100%"
        v-loading="loading"
        empty-text="暂无用户数据"
      >
        <el-table-column prop="userId" label="ID" width="80" sortable />

        <el-table-column prop="userName" label="用户名" width="150">
          <template #default="{ row }">
            <div class="user-cell">
              <el-avatar :size="32" class="user-avatar">
                {{ (row.userName || '?').charAt(0).toUpperCase() }}
              </el-avatar>
              <span>{{ row.userName || '-' }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="userAccount" label="账号" min-width="150" />
        
        <el-table-column label="违规次数" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.violationCount > 0" type="warning" size="small">
              {{ row.violationCount }}次
            </el-tag>
            <span v-else class="text-gray">0次</span>
          </template>
        </el-table-column>

        <el-table-column label="黑名单状态" width="120" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.isBlacklisted" type="danger" size="small" effect="dark">
              🚫 黑名单
            </el-tag>
            <el-tag v-else type="success" size="small">
              ✓ 正常
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="黑名单到期" width="170">
          <template #default="{ row }">
            <span v-if="row.isBlacklisted && row.blacklistUntil">
              {{ formatDateTime(row.blacklistUntil) }}
            </span>
            <span v-else class="text-gray">-</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link :icon="Edit" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button type="primary" link :icon="View" @click="handleViewReservations(row)">
              预约
            </el-button>
            
            <!-- 黑名单操作 -->
            <el-popconfirm
              v-if="row.isBlacklisted"
              title="确定要解除该用户的黑名单吗？"
              confirm-button-text="确定"
              cancel-button-text="取消"
              @confirm="handleRemoveFromBlacklist(row)"
            >
              <template #reference>
                <el-button type="success" link :icon="CircleCheck">
                  解除
                </el-button>
              </template>
            </el-popconfirm>
            <el-popconfirm
              v-else
              title="确定要将该用户加入黑名单吗？"
              confirm-button-text="确定"
              cancel-button-text="取消"
              @confirm="handleAddToBlacklist(row)"
            >
              <template #reference>
                <el-button type="warning" link :icon="Warning">
                  拉黑
                </el-button>
              </template>
            </el-popconfirm>
            
            <el-popconfirm
              title="确定要删除该用户吗？"
              confirm-button-text="确定"
              cancel-button-text="取消"
              @confirm="handleDelete(row)"
            >
              <template #reference>
                <el-button type="danger" link :icon="Delete">
                  删除
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
          :total="totalUsers"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- 编辑用户弹窗 -->
    <el-dialog
      v-model="editDialogVisible"
      title="编辑用户信息"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form
        :model="editForm"
        :rules="editRules"
        ref="editFormRef"
        label-width="80px"
      >
        <el-form-item label="用户ID">
          <el-input v-model="editForm.userId" disabled />
        </el-form-item>
        <el-form-item label="用户名" prop="userName">
          <el-input v-model="editForm.userName" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="账号" prop="userAccount">
          <el-input v-model="editForm.userAccount" placeholder="请输入账号" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitEdit" :loading="submitLoading">
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 用户预约记录弹窗 -->
    <el-dialog
      v-model="reservationsDialogVisible"
      :title="`${currentUser?.userName || '用户'} 的预约记录`"
      width="750px"
    >
      <el-table :data="userReservations" stripe v-loading="reservationsLoading">
        <el-table-column prop="resvId" label="预约ID" width="80" />
        <el-table-column label="座位" width="100">
          <template #default="{ row }">
            {{ row.seat?.seatNumber || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="resvDate" label="日期" width="120" />
        <el-table-column label="时间段" width="140">
          <template #default="{ row }">
            {{ formatTime(row.resvstartTime) }} - {{ formatTime(row.resvendTime) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getResvStatusType(row)" size="small">
              {{ getResvStatusText(row) }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!reservationsLoading && userReservations.length === 0" description="暂无预约记录" />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { Search, Refresh, Edit, Delete, View, Warning, CircleCheck } from '@element-plus/icons-vue'

// 用户数据类型
interface User {
  userId: number
  userName: string
  userAccount: string
  violationCount?: number
  isBlacklisted?: boolean
  blacklistUntil?: string
}

// 加载状态
const loading = ref(false)
const submitLoading = ref(false)
const reservationsLoading = ref(false)

// 用户列表
const users = ref<User[]>([])
const totalUsers = ref(0)

// 分页
const currentPage = ref(1)
const pageSize = ref(10)

// 搜索和筛选
const searchKeyword = ref('')
const blacklistFilter = ref('')

// 过滤后的用户列表
const filteredUsers = computed(() => {
  let result = users.value

  // 搜索过滤
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(user =>
      user.userName?.toLowerCase().includes(keyword) ||
      user.userAccount?.toLowerCase().includes(keyword)
    )
  }
  
  // 黑名单筛选
  if (blacklistFilter.value === 'normal') {
    result = result.filter(user => !user.isBlacklisted)
  } else if (blacklistFilter.value === 'blacklisted') {
    result = result.filter(user => user.isBlacklisted)
  }

  // 更新总数
  totalUsers.value = result.length

  // 分页
  const start = (currentPage.value - 1) * pageSize.value
  return result.slice(start, start + pageSize.value)
})

// 编辑弹窗
const editDialogVisible = ref(false)
const editFormRef = ref<FormInstance>()
const editForm = reactive({
  userId: '',
  userName: '',
  userAccount: ''
})

// 编辑表单验证规则
const editRules: FormRules = {
  userName: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '用户名长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  userAccount: [
    { required: true, message: '请输入账号', trigger: 'blur' },
    { min: 3, max: 50, message: '账号长度在 3 到 50 个字符', trigger: 'blur' }
  ]
}

// 预约记录弹窗
const reservationsDialogVisible = ref(false)
const userReservations = ref<any[]>([])
const currentUser = ref<User | null>(null)

// 格式化时间
const formatTime = (time: string) => time?.length > 5 ? time.substring(0, 5) : (time || '-')

const formatDateTime = (dateTimeStr: string) => {
  if (!dateTimeStr) return '-'
  try {
    const date = new Date(dateTimeStr)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return dateTimeStr
  }
}

// 预约状态映射
const resvStatusMap: Record<string, { type: string; text: string }> = {
  'ACTIVE': { type: 'primary', text: '有效' },
  'COMPLETED': { type: 'success', text: '已完成' },
  'VIOLATED': { type: 'danger', text: '已违约' },
  'CANCELLED': { type: 'info', text: '已取消' }
}

const getResvStatusType = (row: any) => {
  if (row.resvStatus && resvStatusMap[row.resvStatus]) {
    return resvStatusMap[row.resvStatus].type
  }
  // 兼容旧数据
  const today = new Date().toISOString().split('T')[0]
  if (row.resvDate === today) return 'primary'
  if (row.resvDate > today) return 'success'
  return 'info'
}

const getResvStatusText = (row: any) => {
  if (row.resvStatus && resvStatusMap[row.resvStatus]) {
    return resvStatusMap[row.resvStatus].text
  }
  // 兼容旧数据
  const today = new Date().toISOString().split('T')[0]
  if (row.resvDate === today) return '今日'
  if (row.resvDate > today) return '预约中'
  return '已完成'
}

// 加载用户列表
const loadUsers = async () => {
  loading.value = true
  try {
    const response = await fetch('http://120.46.219.204:8080/admin/users')
    const result = await response.json()

    if (result.code === 200) {
      users.value = result.data || []
      totalUsers.value = users.value.length
    } else {
      ElMessage.error(result.message || '加载用户列表失败')
    }
  } catch (error) {
    console.error('加载用户列表失败:', error)
    ElMessage.error('加载失败，请检查网络连接')
  } finally {
    loading.value = false
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

// 编辑用户
const handleEdit = (user: User) => {
  editForm.userId = String(user.userId)
  editForm.userName = user.userName || ''
  editForm.userAccount = user.userAccount || ''
  editDialogVisible.value = true
}

// 提交编辑
const submitEdit = async () => {
  if (!editFormRef.value) return

  const valid = await editFormRef.value.validate().catch(() => false)
  if (!valid) return

  submitLoading.value = true
  try {
    const response = await fetch(`http://120.46.219.204:8080/admin/users/${editForm.userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userName: editForm.userName,
        userAccount: editForm.userAccount
      })
    })

    const result = await response.json()

    if (result.code === 200) {
      ElMessage.success('用户信息更新成功')
      editDialogVisible.value = false
      loadUsers()
    } else {
      ElMessage.error(result.message || '更新失败')
    }
  } catch (error) {
    console.error('更新用户失败:', error)
    ElMessage.error('更新失败，请检查网络连接')
  } finally {
    submitLoading.value = false
  }
}

// 删除用户
const handleDelete = async (user: User) => {
  try {
    const response = await fetch(`http://120.46.219.204:8080/admin/users/${user.userId}`, {
      method: 'DELETE'
    })

    const result = await response.json()

    if (result.code === 200) {
      ElMessage.success('用户删除成功')
      loadUsers()
    } else {
      ElMessage.error(result.message || '删除失败')
    }
  } catch (error) {
    console.error('删除用户失败:', error)
    ElMessage.error('删除失败，请检查网络连接')
  }
}

// 加入黑名单
const handleAddToBlacklist = async (user: User) => {
  try {
    const response = await fetch(`http://localhost:8080/admin/blacklist/${user.userId}`, {
      method: 'POST'
    })

    const result = await response.json()

    if (result.code === 200) {
      ElMessage.success('用户已加入黑名单')
      loadUsers()
    } else {
      ElMessage.error(result.message || '操作失败')
    }
  } catch (error) {
    console.error('加入黑名单失败:', error)
    ElMessage.error('操作失败，请检查网络连接')
  }
}

// 解除黑名单
const handleRemoveFromBlacklist = async (user: User) => {
  try {
    const response = await fetch(`http://localhost:8080/admin/blacklist/${user.userId}`, {
      method: 'DELETE'
    })

    const result = await response.json()

    if (result.code === 200) {
      ElMessage.success('用户已从黑名单中移除')
      loadUsers()
    } else {
      ElMessage.error(result.message || '操作失败')
    }
  } catch (error) {
    console.error('解除黑名单失败:', error)
    ElMessage.error('操作失败，请检查网络连接')
  }
}

// 查看用户预约记录
const handleViewReservations = async (user: User) => {
  currentUser.value = user
  reservationsDialogVisible.value = true
  reservationsLoading.value = true

  try {
    const response = await fetch(`http://120.46.219.204:8080/admin/reservations/user/${user.userId}`)
    const result = await response.json()

    if (result.code === 200) {
      userReservations.value = result.data || []
    } else {
      userReservations.value = []
    }
  } catch (error) {
    console.error('加载预约记录失败:', error)
    userReservations.value = []
  } finally {
    reservationsLoading.value = false
  }
}

// 页面加载
onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.user-manage {
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

.filter-group {
  display: flex;
  gap: 12px;
  align-items: center;
}

/* 表格卡片 */
.table-card {
  border-radius: 12px;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 600;
}

.text-gray {
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

/* 响应式 */
@media (max-width: 768px) {
  .search-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .search-bar .el-input {
    width: 100% !important;
  }
  
  .filter-group {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
