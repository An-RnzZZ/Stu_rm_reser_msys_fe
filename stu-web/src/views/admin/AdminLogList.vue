<template>
  <div class="admin-logs">
    <el-card>
      <!-- 重构筛选栏：移除内联样式，改用scoped样式，增加布局稳定性 -->
      <div class="filter-row">
        <el-radio-group v-model="selectedLogType" size="small">
          <el-radio-button label="admin">管理员日志</el-radio-button>
          <el-radio-button label="system">系统日志</el-radio-button>
          <el-radio-button label="user">用户日志</el-radio-button>
        </el-radio-group>

        <!-- 管理员名称筛选 -->
        <el-input
          v-if="selectedLogType==='admin'"
          v-model="filters.adminName"
          placeholder="管理员名称"
          clearable
        />

        <!-- 用户名筛选 -->
        <el-input
          v-if="selectedLogType==='user'"
          v-model="filters.userName"
          placeholder="用户名"
          clearable
        />

        <!-- 操作类型筛选 -->
        <el-select
          v-if="selectedLogType!=='system'"
          v-model="filters.actionType"
          placeholder="操作类型"
          clearable
        >
          <el-option v-for="t in actionTypes" :key="t" :label="t" :value="t" />
        </el-select>

        <!-- 系统日志类型筛选 -->
        <el-select
          v-if="selectedLogType==='system'"
          v-model="filters.logType"
          placeholder="日志类型"
          clearable
        >
          <el-option label="INFO" value="INFO" />
          <el-option label="WARN" value="WARN" />
          <el-option label="ERROR" value="ERROR" />
        </el-select>

        <!-- 目标类型筛选 -->
        <el-select
          v-if="selectedLogType!=='system'"
          v-model="filters.targetType"
          placeholder="目标类型"
          clearable
        >
          <el-option v-for="t in targetTypes" :key="t" :label="t" :value="t" />
        </el-select>

        <!-- 状态筛选 -->
        <el-select
          v-if="selectedLogType!=='system'"
          v-model="filters.status"
          placeholder="状态"
          clearable
        >
          <el-option label="SUCCESS" value="SUCCESS" />
          <el-option label="FAIL" value="FAIL" />
        </el-select>

        <!-- 时间范围筛选 -->
        <el-date-picker
          v-model="dateRange"
          type="datetimerange"
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          value-format="yyyy-MM-dd'T'HH:mm:ss"
          range-separator="至"
        />

        <!-- 操作按钮 -->
        <el-button type="primary" @click="search">查询</el-button>
        <el-button @click="reset">重置</el-button>
      </div>

      <!-- 管理员日志表 -->
      <el-table v-if="selectedLogType==='admin'" :data="logs" style="width:100%" border>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="adminName" label="管理员" min-width="140" />
        <el-table-column prop="adminAccount" label="账号" min-width="140" />
        <el-table-column prop="actionType" label="操作类型" width="120" />
        <el-table-column prop="targetType" label="目标类型" width="140" />
        <el-table-column prop="targetName" label="目标名称" min-width="160" />
        <el-table-column prop="operation" label="操作说明" min-width="200" />
        <el-table-column prop="ipAddress" label="IP" width="140" />
        <el-table-column prop="status" label="状态" width="100" />
        <el-table-column prop="createdAt" label="时间" min-width="180" />
        <el-table-column label="操作" width="140">
          <template #default="scope">
            <el-button type="text" size="small" @click="viewDetail(scope.row)">详情</el-button>
            <el-button type="text" size="small" @click="deleteLog(scope.row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 系统日志表 -->
      <el-table v-if="selectedLogType==='system'" :data="logs" style="width:100%" border>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="logType" label="日志类型" width="120" />
        <el-table-column prop="module" label="模块" min-width="140" />
        <el-table-column prop="operation" label="操作/说明" min-width="200" />
        <el-table-column prop="content" label="内容" min-width="240" />
        <el-table-column prop="ipAddress" label="IP" width="140" />
        <el-table-column prop="status" label="状态" width="100" />
        <el-table-column prop="createdAt" label="时间" min-width="180" />
        <el-table-column label="操作" width="120">
          <template #default="scope">
            <el-button type="text" size="small" @click="viewDetail(scope.row)">详情</el-button>
            <el-button type="text" size="small" @click="deleteLog(scope.row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 用户日志表 -->
      <el-table v-if="selectedLogType==='user'" :data="logs" style="width:100%" border>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="userId" label="用户ID" width="100" />
        <el-table-column prop="userName" label="用户名" min-width="140" />
        <el-table-column prop="userAccount" label="账号" min-width="140" />
        <el-table-column prop="actionType" label="操作类型" width="120" />
        <el-table-column prop="targetType" label="目标类型" width="140" />
        <el-table-column prop="operation" label="操作说明" min-width="200" />
        <el-table-column prop="ipAddress" label="IP" width="140" />
        <el-table-column prop="result" label="结果" width="100" />
        <el-table-column prop="createdAt" label="时间" min-width="180" />
        <el-table-column label="操作" width="140">
          <template #default="scope">
            <el-button type="text" size="small" @click="viewDetail(scope.row)">详情</el-button>
            <el-button type="text" size="small" @click="deleteLog(scope.row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页栏：优化样式，增加间距和对齐 -->
      <div class="pagination-wrap">
        <el-pagination
          background
          :page-size="pageSize"
          :current-page.sync="page"
          :total="total"
          layout="total, prev, pager, next, jumper"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import request from '../../utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'

// 分页参数
const page = ref(1)
const pageSize = 20
const total = ref(0)
const logs = ref<any[]>([])
const dateRange = ref<[string, string] | null>(null)

// 选中的日志类型
const selectedLogType = ref<'admin' | 'system' | 'user'>('admin')

// 规范筛选参数类型，避免any滥用
interface Filters {
  // 通用
  actionType: string
  targetType: string
  status: string
  // 管理员日志
  adminId: number | null
  adminName: string
  // 系统日志
  logType: string
  // 用户日志
  userName: string
}

// 初始化筛选参数
const filters = reactive<Filters>({
  // 通用
  actionType: '',
  targetType: '',
  status: '',
  // 管理员
  adminId: null,
  adminName: '',
  // 系统
  logType: '',
  // 用户
  userName: ''
})

// 枚举值
const actionTypes = ['LOGIN', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT', 'TEST', 'QUERY']
const targetTypes = ['USER', 'ROOM', 'RESERVATION', 'SYSTEM', 'LOG']

// 构建请求参数
function buildParams() {
  const params: Record<string, any> = {
    page: page.value - 1, // 后端分页从0开始
    size: pageSize
  }

  // 根据日志类型拼接参数
  switch (selectedLogType.value) {
    case 'admin':
      if (filters.adminId) params.adminId = filters.adminId
      if (filters.adminName) params.adminName = filters.adminName
      if (filters.actionType) params.actionType = filters.actionType
      if (filters.targetType) params.targetType = filters.targetType
      if (filters.status) params.status = filters.status
      break
    case 'system':
      if (filters.logType) params.logType = filters.logType
      if (filters.actionType) params.operation = filters.actionType
      break
    case 'user':
      if (filters.userName) params.userName = filters.userName
      if (filters.actionType) params.actionType = filters.actionType
      break
  }

  // 时间范围
  if (dateRange.value && dateRange.value.length === 2) {
    params.startTime = dateRange.value[0]
    params.endTime = dateRange.value[1]
  }

  return params
}

// 搜索日志
async function search() {
  try {
    const params = buildParams()
    let url = ''

    // 根据日志类型选择接口
    switch (selectedLogType.value) {
      case 'admin':
        url = '/api/admin/logs/admin/search'
        break
      case 'system':
        url = '/api/admin/logs/system/search'
        break
      case 'user':
        url = filters.userName
          ? '/api/admin/logs/search'
          : '/api/admin/logs/user'
        // 用户搜索特殊处理
        if (filters.userName) {
          params.keyword = filters.userName
          params.logType = 'USER'
          params.page = page.value // 该接口分页从1开始
        }
        break
    }

    const res = await request.get(url, { params })
    if (res && res.code === 200 && res.data) {
      // 适配不同接口的返回格式
      if (selectedLogType.value === 'user' && filters.userName) {
        logs.value = res.data.logs || []
        total.value = res.data.total || 0
      } else {
        logs.value = res.data.content || []
        total.value = res.data.totalElements || 0
      }
    } else {
      ElMessage.error('获取日志失败')
    }
  } catch (err: any) {
    console.error('搜索日志失败：', err)
    ElMessage.error('获取日志时发生错误')
  }
}

// 重置筛选条件
function reset() {
  // 重置所有筛选参数
  filters.adminId = null
  filters.adminName = ''
  filters.actionType = ''
  filters.targetType = ''
  filters.status = ''
  filters.logType = ''
  filters.userName = ''

  // 重置时间范围
  dateRange.value = null
  // 重置分页
  page.value = 1
  // 重新搜索
  search()
}

// 查看详情
function viewDetail(row: any) {
  ElMessageBox.alert(
    `<pre>${JSON.stringify(row, null, 2)}</pre>`,
    '日志详情',
    {
      type: 'info',
      dangerouslyUseHTMLString: true,
      confirmButtonText: '关闭'
    }
  )
}

// 删除日志
async function deleteLog(id: number) {
  try {
    await ElMessageBox.confirm(
      '确认删除该日志？删除后不可恢复！',
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 构建删除接口
    let url = ''
    switch (selectedLogType.value) {
      case 'admin':
        url = `/api/admin/logs/admin/${id}`
        break
      case 'system':
        url = `/api/admin/logs/system/${id}`
        break
      case 'user':
        url = `/api/admin/logs/user/${id}`
        break
    }

    const res = await request.delete(url)
    if (res && res.code === 200) {
      ElMessage.success('日志删除成功')
      search() // 重新加载数据
    } else {
      ElMessage.error('日志删除失败')
    }
  } catch (e) {
    // 取消删除不做处理
  }
}

// 分页变化处理（避免重复触发）
function handlePageChange(val: number) {
  page.value = val
  search()
}

// 监听日志类型切换：重置分页和无关筛选项
watch(selectedLogType, (newType) => {
  page.value = 1

  // 重置无关的筛选项
  switch (newType) {
    case 'admin':
      filters.logType = ''
      filters.userName = ''
      break
    case 'system':
      filters.adminName = ''
      filters.userName = ''
      filters.actionType = ''
      filters.targetType = ''
      filters.status = ''
      break
    case 'user':
      filters.adminName = ''
      filters.logType = ''
      break
  }

  search()
}, { immediate: false })

// 初始加载
search()
</script>

<style scoped>
/* 筛选栏样式：核心修复排版问题 */
.filter-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap; /* 关键：超出自动换行，避免排版错乱 */
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}

/* 统一筛选控件宽度，避免大小不一 */
.filter-row .el-input,
.filter-row .el-select,
.filter-row .el-date-picker {
  width: 200px;
  vertical-align: middle;
}

/* 特殊控件宽度调整 */
.filter-row .el-select:nth-child(6), /* 状态筛选 */
.filter-row .el-select:nth-child(5) { /* 目标类型筛选 */
  width: 160px;
}

.filter-row .el-select:nth-child(4) { /* 系统日志类型 */
  width: 160px;
}

.filter-row .el-date-picker {
  width: 380px; /* 时间范围选择器宽度 */
}

/* 分页栏样式优化 */
.pagination-wrap {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding-top: 10px;
  border-top: 1px solid #ebeef5;
}

/* 表格样式优化 */
.admin-logs .el-table {
  --el-table-header-text-color: #303133;
  --el-table-row-hover-bg-color: #f8f9fa;
}
</style>
