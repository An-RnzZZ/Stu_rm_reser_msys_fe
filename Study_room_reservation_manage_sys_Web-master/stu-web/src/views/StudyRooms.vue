<template>
  <div class="rooms-container">
    <el-card class="rooms-card">
      <template #header>
        <div class="card-header">
          <span class="title">自习室管理</span>
          <div class="header-actions">
            <el-button type="primary" @click="handleAddRoom">
              <el-icon><Plus /></el-icon>新增自习室
            </el-button>
            <el-button @click="refreshRooms" :loading="loading">
              <el-icon><Refresh /></el-icon>刷新
            </el-button>
          </div>
        </div>
      </template>

      <!-- 搜索和筛选 -->
      <div class="filter-container">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索自习室名称或位置"
          style="width: 300px; margin-right: 16px;"
          clearable
          @clear="handleSearch"
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <el-select v-model="filterStatus" placeholder="全部状态" style="width: 120px; margin-right: 16px;">
          <el-option label="全部" value="" />
          <el-option label="可用" value="available" />
          <el-option label="维护中" value="maintenance" />
          <el-option label="已关闭" value="closed" />
        </el-select>

        <el-button type="primary" @click="handleSearch">搜索</el-button>
      </div>

      <!-- 自习室表格 -->
      <el-table
        :data="paginatedRooms"
        v-loading="loading"
        style="width: 100%"
        :default-sort="{ prop: 'id', order: 'ascending' }"
      >
        <el-table-column prop="id" label="ID" width="80" sortable />
        <el-table-column prop="name" label="自习室名称" width="180" sortable />
        <el-table-column prop="location" label="位置" width="150" />
        <el-table-column prop="capacity" label="总容量" width="100" sortable />
        <el-table-column prop="availableSeats" label="可用座位" width="100">
          <template #default="{ row }">
            <el-tag :type="row.availableSeats > 5 ? 'success' : row.availableSeats > 0 ? 'warning' : 'danger'">
              {{ row.availableSeats }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="equipment" label="设备" width="200">
          <template #default="{ row }">
            <div class="equipment-tags">
              <el-tag
                v-for="item in row.equipment"
                :key="item"
                size="small"
                class="equipment-tag"
              >
                {{ item }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" show-overflow-tooltip />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button
              type="danger"
              size="small"
              @click="handleDelete(row)"
              :disabled="row.status !== 'closed'"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="filteredRooms.length"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>

      <!-- 统计卡片 -->
      <el-row :gutter="20" class="stats-row">
        <el-col :span="6">
          <el-card class="stat-card" shadow="hover">
            <div class="stat-content">
              <el-icon class="stat-icon" style="color: #409eff;"><OfficeBuilding /></el-icon>
              <div class="stat-info">
                <div class="stat-value">{{ stats.totalRooms }}</div>
                <div class="stat-label">总自习室数</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card" shadow="hover">
            <div class="stat-content">
              <el-icon class="stat-icon" style="color: #67c23a;"><User /></el-icon>
              <div class="stat-info">
                <div class="stat-value">{{ stats.totalCapacity }}</div>
                <div class="stat-label">总座位数</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card" shadow="hover">
            <div class="stat-content">
              <el-icon class="stat-icon" style="color: #e6a23c;"><Warning /></el-icon>
              <div class="stat-info">
                <div class="stat-value">{{ stats.maintenanceRooms }}</div>
                <div class="stat-label">维护中</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card" shadow="hover">
            <div class="stat-content">
              <el-icon class="stat-icon" style="color: #f56c6c;"><CloseBold /></el-icon>
              <div class="stat-info">
                <div class="stat-value">{{ stats.closedRooms }}</div>
                <div class="stat-label">已关闭</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      @close="resetDialog"
    >
      <el-form
        :model="roomForm"
        :rules="roomRules"
        ref="roomFormRef"
        label-width="100px"
        label-position="left"
      >
        <el-form-item label="自习室名称" prop="name">
          <el-input v-model="roomForm.name" placeholder="请输入自习室名称" />
        </el-form-item>

        <el-form-item label="位置" prop="location">
          <el-input v-model="roomForm.location" placeholder="请输入位置，如：A栋201室" />
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="总容量" prop="capacity">
              <el-input-number
                v-model="roomForm.capacity"
                :min="1"
                :max="100"
                controls-position="right"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="可用座位" prop="availableSeats">
              <el-input-number
                v-model="roomForm.availableSeats"
                :min="0"
                :max="roomForm.capacity"
                controls-position="right"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="roomForm.status">
            <el-radio label="available">可用</el-radio>
            <el-radio label="maintenance">维护中</el-radio>
            <el-radio label="closed">已关闭</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="设备配置" prop="equipment">
          <el-select
            v-model="roomForm.equipment"
            multiple
            placeholder="请选择设备"
            style="width: 100%"
          >
            <el-option
              v-for="item in equipmentOptions"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="描述" prop="description">
          <el-input
            v-model="roomForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入自习室描述"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitRoomForm" :loading="submitting">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Refresh, Search, OfficeBuilding, User, Warning, CloseBold } from '@element-plus/icons-vue'
import type { StudyRoomForManagement } from '@/types/reservation'

const loading = ref(false)
const dialogVisible = ref(false)
const submitting = ref(false)
const roomFormRef = ref<FormInstance>()

// 搜索条件
const searchKeyword = ref('')
const filterStatus = ref('')

// 分页
const currentPage = ref(1)
const pageSize = ref(10)

// 表单数据
const roomForm = reactive({
  id: 0,
  name: '',
  location: '',
  capacity: 30,
  availableSeats: 30,
  status: 'available',
  equipment: [] as string[],
  description: ''
})

// 表单验证规则
const roomRules: FormRules = {
  name: [
    { required: true, message: '请输入自习室名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  location: [
    { required: true, message: '请输入位置', trigger: 'blur' }
  ],
  capacity: [
    { required: true, message: '请输入总容量', trigger: 'blur' }
  ],
  status: [
    { required: true, message: '请选择状态', trigger: 'change' }
  ]
}

// 设备选项
const equipmentOptions = [
  '空调', '投影仪', '白板', '电源插座', 'WiFi',
  '打印机', '饮水机', '储物柜', '监控摄像头', '紧急照明'
]

// 模拟数据
const studyRooms = ref<StudyRoomForManagement[]>([
  { id: 1, name: '静思阁', location: 'A栋201', capacity: 30, availableSeats: 15, status: 'available', equipment: ['空调', '投影仪', '白板', '电源插座', 'WiFi'], description: '安静学习区，适合个人学习' },
  { id: 2, name: '致远轩', location: 'A栋202', capacity: 25, availableSeats: 8, status: 'available', equipment: ['空调', '白板', '电源插座', 'WiFi', '饮水机'], description: '小组讨论区，配有白板' },
  { id: 3, name: '明德堂', location: 'B栋101', capacity: 40, availableSeats: 0, status: 'maintenance', equipment: ['空调', '投影仪', '电源插座', 'WiFi'], description: '大型自习室，设备维护中' },
  { id: 4, name: '博学厅', location: 'B栋102', capacity: 35, availableSeats: 20, status: 'available', equipment: ['空调', '打印机', '电源插座', 'WiFi', '储物柜'], description: '综合学习区，设备齐全' },
  { id: 5, name: '创新空间', location: 'C栋301', capacity: 20, availableSeats: 5, status: 'available', equipment: ['空调', '投影仪', '白板', '电源插座', 'WiFi', '监控摄像头'], description: '创新实验室，适合项目开发' }
])

// 统计信息
const stats = reactive({
  totalRooms: 0,
  totalCapacity: 0,
  maintenanceRooms: 0,
  closedRooms: 0
})

// 计算属性：筛选后的自习室
const filteredRooms = computed(() => {
  let result = studyRooms.value

  // 按关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(room =>
      room.name.toLowerCase().includes(keyword) ||
      room.location.toLowerCase().includes(keyword)
    )
  }

  // 按状态筛选
  if (filterStatus.value) {
    result = result.filter(room => room.status === filterStatus.value)
  }

  return result
})

// 计算属性：分页后的数据
const paginatedRooms = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredRooms.value.slice(start, end)
})

// 对话框标题
const dialogTitle = computed(() => {
  return roomForm.id ? '编辑自习室' : '新增自习室'
})

// 状态类型映射
const getStatusType = (status: string) => {
  const typeMap: Record<string, string> = {
    'available': 'success',
    'maintenance': 'warning',
    'closed': 'danger'
  }
  return typeMap[status] || 'info'
}

// 状态文本映射
const getStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    'available': '可用',
    'maintenance': '维护中',
    'closed': '已关闭'
  }
  return textMap[status] || status
}

// 搜索处理
const handleSearch = () => {
  currentPage.value = 1
  updateStats()
}

// 刷新数据
const refreshRooms = async () => {
  loading.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    ElMessage.success('数据已刷新')
  } catch (error) {
    ElMessage.error('刷新失败')
  } finally {
    loading.value = false
  }
}

// 新增自习室
const handleAddRoom = () => {
  resetDialog()
  dialogVisible.value = true
}

// 编辑自习室
const handleEdit = (room: StudyRoomForManagement) => {
  Object.assign(roomForm, room)
  dialogVisible.value = true
}

// 删除自习室
const handleDelete = async (room: StudyRoomForManagement) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除自习室 "${room.name}" 吗？此操作不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 模拟API调用
    loading.value = true
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 从列表中删除
    const index = studyRooms.value.findIndex(r => r.id === room.id)
    if (index !== -1) {
      studyRooms.value.splice(index, 1)
    }

    ElMessage.success('删除成功')
    updateStats()
  } catch {
    // 用户取消操作
  } finally {
    loading.value = false
  }
}

// 提交表单
const submitRoomForm = async () => {
  if (!roomFormRef.value) return

  const valid = await roomFormRef.value.validate()
  if (!valid) return

  submitting.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1500))

    if (roomForm.id) {
      // 更新
      const index = studyRooms.value.findIndex(r => r.id === roomForm.id)
      if (index !== -1) {
        studyRooms.value[index] = { ...roomForm }
      }
      ElMessage.success('更新成功')
    } else {
      // 新增
      const newRoom = {
        ...roomForm,
        id: Math.max(...studyRooms.value.map(r => r.id)) + 1
      }
      studyRooms.value.push(newRoom)
      ElMessage.success('新增成功')
    }

    dialogVisible.value = false
    updateStats()
  } catch (error) {
    ElMessage.error('操作失败')
  } finally {
    submitting.value = false
  }
}

// 重置对话框
const resetDialog = () => {
  if (roomFormRef.value) {
    roomFormRef.value.resetFields()
  }
  Object.assign(roomForm, {
    id: 0,
    name: '',
    location: '',
    capacity: 30,
    availableSeats: 30,
    status: 'available',
    equipment: [],
    description: ''
  })
}

// 分页处理
const handleSizeChange = (val: number) => {
  pageSize.value = val
  currentPage.value = 1
}

const handleCurrentChange = (val: number) => {
  currentPage.value = val
}

// 更新统计信息
const updateStats = () => {
  stats.totalRooms = studyRooms.value.length
  stats.totalCapacity = studyRooms.value.reduce((sum, room) => sum + room.capacity, 0)
  stats.maintenanceRooms = studyRooms.value.filter(r => r.status === 'maintenance').length
  stats.closedRooms = studyRooms.value.filter(r => r.status === 'closed').length
}

onMounted(() => {
  updateStats()
})
</script>

<style scoped>
.rooms-container {
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
  gap: 12px;
}

.filter-container {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.pagination-container {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
}

.stats-row {
  margin-top: 30px;
}

.stat-card {
  margin-bottom: 20px;
}

.stat-content {
  display: flex;
  align-items: center;
}

.stat-icon {
  font-size: 48px;
  margin-right: 20px;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.equipment-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.equipment-tag {
  margin: 2px;
}

:deep(.el-table .cell) {
  line-height: 1.5;
}
</style>
