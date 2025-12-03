<template>
  <div class="reservation-container">
    <el-card class="reservation-card">
      <template #header>
        <div class="card-header">
          <span class="title">预约自习室</span>
          <el-button type="primary" @click="refreshRooms" :loading="loadingRooms">
            <el-icon><Refresh /></el-icon>刷新可用房间
          </el-button>
        </div>
      </template>

      <el-form
        :model="reservationForm"
        :rules="rules"
        ref="reservationFormRef"
        label-width="100px"
        class="reservation-form"
      >
        <!-- 修复：添加单独的form-item容器 -->
        <div class="form-item-wrapper">
          <el-form-item label="选择日期" prop="date" class="date-item">
            <el-date-picker
              v-model="reservationForm.date"
              type="date"
              placeholder="选择预约日期"
              :disabled-date="disabledDate"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </el-form-item>
        </div>

        <div class="form-item-wrapper">
          <el-form-item label="时间段" required class="time-range-item">
            <div class="time-range-container">
              <el-col :span="11">
                <el-form-item prop="startTime" class="time-item">
                  <el-time-select
                    v-model="reservationForm.startTime"
                    placeholder="开始时间"
                    start="08:00"
                    step="00:30"
                    end="22:00"
                    :max-time="reservationForm.endTime"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="2" class="time-separator">至</el-col>
              <el-col :span="11">
                <el-form-item prop="endTime" class="time-item">
                  <el-time-select
                    v-model="reservationForm.endTime"
                    placeholder="结束时间"
                    start="08:30"
                    step="00:30"
                    end="22:30"
                    :min-time="reservationForm.startTime"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
            </div>
          </el-form-item>
        </div>

        <div class="form-item-wrapper">
          <el-form-item label="选择自习室" prop="roomId" class="room-selection-item">
            <div class="room-selection-container">
              <el-radio-group
                v-model="reservationForm.roomId"
                @change="handleRoomChange"
                class="room-radio-group"
              >
                <div class="room-grid">
                  <div
                    v-for="room in availableRooms"
                    :key="room.id"
                    class="room-item-wrapper"
                    :class="{ 'disabled': room.availableSeats === 0 }"
                  >
                    <el-radio
                      :label="room.id"
                      :disabled="room.availableSeats === 0"
                      class="room-radio"
                    >
                      <div class="room-card-content">
                        <div class="room-card-header">
                          <h4 class="room-name">{{ room.name }}</h4>
                          <el-tag
                            :type="room.status === '可用' ? 'success' : 'danger'"
                            size="small"
                            class="room-status"
                          >
                            {{ room.status }}
                          </el-tag>
                        </div>
                        <div class="room-details">
                          <div class="room-detail-item">
                            <span class="detail-label">容量:</span>
                            <span class="detail-value">{{ room.capacity }}人</span>
                          </div>
                          <div class="room-detail-item">
                            <span class="detail-label">可用座位:</span>
                            <span class="detail-value">{{ room.availableSeats }}</span>
                          </div>
                          <div class="room-detail-item">
                            <span class="detail-label">位置:</span>
                            <span class="detail-value">{{ room.location }}</span>
                          </div>
                        </div>
                      </div>
                    </el-radio>
                  </div>
                </div>
              </el-radio-group>
            </div>
          </el-form-item>
        </div>

        <div class="form-item-wrapper">
          <el-form-item label="备注" prop="remark" class="remark-item">
            <el-input
              v-model="reservationForm.remark"
              type="textarea"
              :rows="3"
              placeholder="请输入备注信息（可选）"
              maxlength="200"
              show-word-limit
              class="remark-input"
            />
          </el-form-item>
        </div>

        <div class="form-item-wrapper">
          <el-form-item class="action-buttons">
            <el-button type="primary" @click="submitReservation" :loading="submitting">
              提交预约
            </el-button>
            <el-button @click="resetForm">重置</el-button>
          </el-form-item>
        </div>
      </el-form>

      <!-- 预约规则说明 -->
      <el-card class="rules-card">
        <template #header>
          <span class="rules-title">预约规则说明</span>
        </template>
        <ul class="rules-list">
          <li>可预约未来7天内的自习室</li>
          <li>每次预约时长最短1小时，最长4小时</li>
          <li>每人每天最多预约2个时间段</li>
          <li>请至少提前30分钟预约</li>
          <li>如需取消预约，请在预约开始前1小时操作</li>
        </ul>
      </el-card>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import type { StudyRoom } from '@/types/reservation'

const reservationFormRef = ref<FormInstance>()
const loadingRooms = ref(false)
const submitting = ref(false)

// 表单数据
const reservationForm = reactive({
  date: '',
  startTime: '',
  endTime: '',
  roomId: '',
  remark: ''
})

// 可用自习室列表
const availableRooms = ref<StudyRoom[]>([
  { id: 1, name: '静思阁', capacity: 30, availableSeats: 15, location: 'A栋201', status: '可用' },
  { id: 2, name: '致远轩', capacity: 25, availableSeats: 8, location: 'A栋202', status: '可用' },
  { id: 3, name: '明德堂', capacity: 40, availableSeats: 0, location: 'B栋101', status: '满员' },
  { id: 4, name: '博学厅', capacity: 35, availableSeats: 20, location: 'B栋102', status: '可用' },
  { id: 5, name: '创新空间', capacity: 20, availableSeats: 5, location: 'C栋301', status: '可用' }
])

// 表单验证规则
const rules: FormRules = {
  date: [
    { required: true, message: '请选择预约日期', trigger: 'change' }
  ],
  startTime: [
    { required: true, message: '请选择开始时间', trigger: 'change' }
  ],
  endTime: [
    { required: true, message: '请选择结束时间', trigger: 'change' }
  ],
  roomId: [
    { required: true, message: '请选择自习室', trigger: 'change' }
  ]
}

// 禁用过去的日期
const disabledDate = (time: Date) => {
  const today = new Date()
  const maxDate = new Date()
  maxDate.setDate(today.getDate() + 7) // 只能预约未来7天
  return time.getTime() < today.setHours(0, 0, 0, 0) || time.getTime() > maxDate.getTime()
}

// 处理自习室选择变化
const handleRoomChange = (roomId: string) => {
  const selectedRoom = availableRooms.value.find(room => room.id === Number(roomId))
  if (selectedRoom && selectedRoom.availableSeats === 0) {
    ElMessage.warning('该自习室已满员，请选择其他自习室')
  }
}

// 刷新可用房间
const refreshRooms = async () => {
  loadingRooms.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    ElMessage.success('自习室信息已更新')
  } catch (error) {
    ElMessage.error('刷新失败')
  } finally {
    loadingRooms.value = false
  }
}

// 提交预约
const submitReservation = async () => {
  if (!reservationFormRef.value) return

  const valid = await reservationFormRef.value.validate()
  if (!valid) return

  submitting.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1500))

    ElMessage.success('预约成功！')
    resetForm()

    // 这里可以跳转到"我的预约"页面
    // router.push('/my-reservations')
  } catch (error) {
    ElMessage.error('预约失败，请重试')
  } finally {
    submitting.value = false
  }
}

// 重置表单
const resetForm = () => {
  reservationFormRef.value?.resetFields()
}

onMounted(() => {
  // 设置默认日期为明天
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  reservationForm.date = tomorrow.toISOString().split('T')[0]
})
</script>

<style scoped>
/* 重置和基础样式 */
.reservation-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.reservation-card {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

/* 卡片头部 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

/* 表单布局修复 */
.reservation-form {
  margin-top: 20px;
}

.form-item-wrapper {
  margin-bottom: 24px;
  position: relative;
}

/* 日期选择器 */
.date-item :deep(.el-form-item__label) {
  font-weight: 500;
  color: #606266;
  padding-right: 20px;
}

/* 时间段选择 */
.time-range-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.time-item {
  margin-bottom: 0;
}

.time-separator {
  text-align: center;
  color: #909399;
  font-size: 14px;
  flex-shrink: 0;
}

/* 自习室选择 - 主要修复区域 */
.room-selection-container {
  width: 100%;
}

.room-radio-group {
  width: 100%;
}

.room-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  width: 100%;
}

.room-item-wrapper {
  position: relative;
  transition: all 0.3s ease;
  border-radius: 8px;
  overflow: hidden;
}

.room-item-wrapper.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.room-item-wrapper:not(.disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Radio按钮样式重置 */
.room-radio {
  width: 100%;
  height: 100%;
  margin: 0 !important;
}

.room-radio :deep(.el-radio__input) {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 2;
}

.room-radio :deep(.el-radio__label) {
  display: block !important;
  width: 100% !important;
  height: 100% !important;
  padding: 0 !important;
  margin: 0 !important;
  line-height: normal !important;
  font-size: 14px !important;
}

/* 自习室卡片内容 */
.room-card-content {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  background: white;
  height: 100%;
  box-sizing: border-box;
  position: relative;
  z-index: 1;
}

.room-item-wrapper:not(.disabled) .room-card-content:hover {
  border-color: #409eff;
  background-color: #f5f7fa;
}

.room-item-wrapper :deep(.el-radio__input.is-checked + .room-card-content) {
  border-color: #409eff;
  background-color: #f0f9ff;
}

/* 卡片头部 */
.room-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.room-name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  line-height: 1.4;
  flex: 1;
  padding-right: 30px; /* 为radio按钮留出空间 */
}

.room-status {
  flex-shrink: 0;
  font-size: 12px;
  height: 22px;
  line-height: 20px;
}

/* 房间详情 */
.room-details {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.room-detail-item {
  display: flex;
  align-items: center;
  font-size: 13px;
  line-height: 1.4;
}

.detail-label {
  color: #909399;
  min-width: 70px;
  margin-right: 8px;
}

.detail-value {
  color: #606266;
  font-weight: 500;
}

/* 禁用状态 */
.room-item-wrapper.disabled .room-card-content {
  background-color: #f5f5f5;
  border-color: #e0e0e0;
}

.room-item-wrapper.disabled .room-name {
  color: #b0b0b0;
}

.room-item-wrapper.disabled .room-detail-item .detail-label,
.room-item-wrapper.disabled .room-detail-item .detail-value {
  color: #b0b0b0;
}

/* 备注区域 */
.remark-input {
  font-size: 14px;
  line-height: 1.5;
}

/* 按钮区域 */
.action-buttons {
  margin-top: 8px;
}

.action-buttons :deep(.el-form-item__content) {
  margin-left: 0 !important;
  display: flex;
  gap: 12px;
}

/* 规则说明 */
.rules-card {
  margin-top: 32px;
  border-top: 1px solid #f0f0f0;
  background-color: #fafafa;
}

.rules-title {
  font-weight: 600;
  color: #909399;
  font-size: 14px;
}

.rules-list {
  margin: 0;
  padding-left: 20px;
  color: #606266;
  font-size: 13px;
  line-height: 1.6;
}

.rules-list li {
  margin-bottom: 6px;
  position: relative;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .reservation-container {
    padding: 12px;
  }

  .room-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .time-range-container {
    flex-direction: column;
    gap: 8px;
  }

  .time-separator {
    width: 100%;
    text-align: center;
    padding: 4px 0;
  }

  .time-item {
    width: 100%;
  }
}
</style>

<!-- 全局样式覆盖 -->
<style>
/* 修复Element Plus全局样式冲突 */
.el-form-item__label {
  font-weight: 500 !important;
  color: #606266 !important;
  line-height: 32px !important;
}

.el-form-item {
  margin-bottom: 0 !important;
}

.el-radio__label {
  font-size: 14px !important;
}

.el-tag {
  font-size: 12px !important;
}

.el-card__header {
  padding: 16px 20px !important;
  border-bottom: 1px solid #f0f0f0 !important;
}

.el-card__body {
  padding: 20px !important;
}
</style>
