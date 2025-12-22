<template>
  <div class="admin-logs">
    <el-card>
      <div class="filter-row" style="display:flex;gap:12px;align-items:center;margin-bottom:12px;">
            <el-radio-group v-model="selectedLogType" size="small">
              <el-radio-button label="admin">管理员日志</el-radio-button>
              <el-radio-button label="system">系统日志</el-radio-button>
              <el-radio-button label="user">用户日志</el-radio-button>
            </el-radio-group>
        <el-input v-if="selectedLogType==='admin'" v-model="filters.adminName" placeholder="管理员名称" clearable style="width:200px" />
        <el-input v-if="selectedLogType==='user'" v-model="filters.userName" placeholder="用户名" clearable style="width:200px" />
        <el-select v-if="selectedLogType!=='system'" v-model="filters.actionType" placeholder="操作类型" clearable style="width:160px">
          <el-option v-for="t in actionTypes" :key="t" :label="t" :value="t" />
        </el-select>
        <el-select v-if="selectedLogType==='system'" v-model="filters.logType" placeholder="日志类型" clearable style="width:160px">
          <el-option label="INFO" value="INFO" />
          <el-option label="WARN" value="WARN" />
          <el-option label="ERROR" value="ERROR" />
        </el-select>
        <el-select v-if="selectedLogType!=='system'" v-model="filters.targetType" placeholder="目标类型" clearable style="width:160px">
          <el-option v-for="t in targetTypes" :key="t" :label="t" :value="t" />
        </el-select>
        <el-select v-if="selectedLogType!=='system'" v-model="filters.status" placeholder="状态" clearable style="width:120px">
          <el-option label="SUCCESS" value="SUCCESS" />
          <el-option label="FAIL" value="FAIL" />
        </el-select>
        <el-date-picker
          v-model="dateRange"
          type="datetimerange"
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          value-format="yyyy-MM-dd'T'HH:mm:ss"
          range-separator="至"
        />
        <el-button type="primary" @click="search">查询</el-button>
        <el-button @click="reset">重置</el-button>
      </div>

      <!-- 管理员日志表 -->
      <el-table v-if="selectedLogType==='admin'" :data="logs" style="width:100%">
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
      <el-table v-if="selectedLogType==='system'" :data="logs" style="width:100%">
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
      <el-table v-if="selectedLogType==='user'" :data="logs" style="width:100%">
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

      <div style="margin-top:12px;display:flex;justify-content:flex-end;align-items:center;">
        <el-pagination
          background
          :page-size="pageSize"
          :current-page.sync="page"
          :total="total"
          layout="total, prev, pager, next, jumper"
          @current-change="search"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import request from '../../utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'

const page = ref(1)
const pageSize = 20
const total = ref(0)
const logs = ref<any[]>([])
const dateRange = ref<[string,string] | null>(null)

const selectedLogType = ref<'admin'|'system'|'user'>('admin')

const filters = reactive({
  adminId: null as number | null,
  adminName: '',
  actionType: '',
  targetType: '',
  status: ''
})

// 扩展 filters 用于 system/user
;(filters as any).userName = ''
;(filters as any).logType = ''

const actionTypes = ['LOGIN','CREATE','UPDATE','DELETE','EXPORT','TEST','QUERY']
const targetTypes = ['USER','ROOM','RESERVATION','SYSTEM','LOG']

function buildParams() {
  const params: any = {
    // 后端分页参数：controller 使用 page (0-based for some endpoints)
    page: page.value - 1,
    size: pageSize
  }

  if (selectedLogType.value === 'admin') {
    if (filters.adminId) params.adminId = filters.adminId
    if (filters.adminName) params.adminName = filters.adminName
    if (filters.actionType) params.actionType = filters.actionType
    if (filters.targetType) params.targetType = filters.targetType
    if (filters.status) params.status = filters.status
  } else if (selectedLogType.value === 'system') {
    if ((filters as any).logType) params.logType = (filters as any).logType
    if (filters.actionType) params.operation = filters.actionType
  } else if (selectedLogType.value === 'user') {
    // user list endpoint supports only page/size; use generic search if keyword provided
    if ((filters as any).userName) params.userName = (filters as any).userName
    if (filters.actionType) params.actionType = filters.actionType
  }

  if (dateRange.value && dateRange.value.length === 2) {
    params.startTime = dateRange.value[0]
    params.endTime = dateRange.value[1]
  }

  return params
}

async function search() {
  try {
    const params = buildParams()

    if (selectedLogType.value === 'admin') {
      const body = await request.get('/admin/logs/admin/search', { params })
      if (body && body.code === 200 && body.data) {
        logs.value = body.data.content || []
        total.value = body.data.totalElements || 0
        return
      }
    }

    if (selectedLogType.value === 'system') {
      const body = await request.get('/admin/logs/system/search', { params })
      if (body && body.code === 200 && body.data) {
        logs.value = body.data.content || []
        total.value = body.data.totalElements || 0
        return
      }
    }

    if (selectedLogType.value === 'user') {
      // 优先使用通用搜索接口（若提供用户关键字），否则使用分页接口
      if ((filters as any).userName) {
        const body = await request.get('/admin/logs/search', { params: { keyword: (filters as any).userName, logType: 'USER', page: page.value, size: pageSize } })
        if (body && body.code === 200 && body.data) {
          logs.value = body.data.logs || []
          total.value = body.data.total || 0
          return
        }
      } else {
        const body = await request.get('/admin/logs/user', { params })
        if (body && body.code === 200 && body.data) {
          logs.value = body.data.content || []
          total.value = body.data.totalElements || 0
          return
        }
      }
    }

    ElMessage.error('获取日志失败')
  } catch (err: any) {
    console.error(err)
    ElMessage.error('获取日志时发生错误')
  }
}

function reset() {
  filters.adminId = null
  filters.adminName = ''
  filters.actionType = ''
  filters.targetType = ''
  filters.status = ''
  dateRange.value = null
  page.value = 1
  search()
}

function viewDetail(row: any) {
  ElMessageBox.alert(JSON.stringify(row, null, 2), '日志详情', { type: 'info', dangerouslyUseHTMLString: false })
}

async function deleteLog(id: number) {
    try {
      await ElMessageBox.confirm('确认删除该日志？', '提示', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' })
      let url = ''
      if (selectedLogType.value === 'admin') url = `/admin/logs/admin/${id}`
      else if (selectedLogType.value === 'system') url = `/admin/logs/system/${id}`
      else url = `/admin/logs/user/${id}`

      const res = await request.delete(url)
      if (res && res.code === 200) {
        ElMessage.success('已删除')
        search()
      } else {
        ElMessage.error('删除失败')
      }
    } catch (e) {
      // 取消或错误
    }
}

// initial load
// 当切换日志类型时重置分页并重新查询
watch(selectedLogType, () => {
  page.value = 1
  // 清理不相关的筛选项
  ;(filters as any).userName = ''
  ;(filters as any).logType = ''
  search()
})

search()
</script>

<style scoped>
.filter-row .el-input,
.filter-row .el-select,
.filter-row .el-date-picker {
  vertical-align: middle;
}
</style>
