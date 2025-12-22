<template>
  <div class="home">
    <el-container style="height: 100vh;">
      <el-header style="background-color: #409EFF; color: white;">
        <div style="display: flex; justify-content: space-between; align-items: center; height: 60px;">
          <h2 style="margin: 0;">自习室预约系统</h2>
          <div style="display: flex; align-items: center; gap: 15px;">
            <span v-if="userInfo" style="font-size: 14px;">
              欢迎，{{ userInfo.username || '用户' }}
            </span>
            <el-button @click="handleLogout" type="text" style="color: white;">
              退出登录
            </el-button>
          </div>
        </div>
      </el-header>

      <el-container>
        <el-aside width="200px" style="background-color: #f5f5f5;">
          <el-menu
            router
            :default-active="$route.path"
            style="border: none;"
          >
            <el-menu-item index="/">
              <el-icon><House /></el-icon>
              <span>首页</span>
            </el-menu-item>
            <el-menu-item index="/reservation">
              <el-icon><Calendar /></el-icon>
              <span>预约座位</span>
            </el-menu-item>
            <el-menu-item index="/my-reservations">
              <el-icon><Document /></el-icon>
              <span>我的预约</span>
            </el-menu-item>
            <el-menu-item index="/sign-in">
              <el-icon><Check /></el-icon>
              <span>签到/签退</span>
            </el-menu-item>
            <el-menu-item index="/my-violations">
              <el-icon><Warning /></el-icon>
              <span>我的违规</span>
            </el-menu-item>
          </el-menu>
        </el-aside>

        <el-main style="padding: 20px;">
          <el-card>
            <template #header>
              <div class="card-header">
                <span>欢迎使用自习室预约系统</span>
                <el-button
                  @click="refreshData"
                  size="small"
                  :loading="loading"
                  :disabled="loading"
                >
                  <el-icon><Refresh /></el-icon>
                  刷新数据
                </el-button>
              </div>
            </template>

            <!-- 加载状态 -->
            <div v-if="loading" style="text-align: center; padding: 20px;">
              <el-icon class="is-loading" style="font-size: 24px;">
                <Loading />
              </el-icon>
              <p style="margin-top: 10px; color: #666;">加载中...</p>
            </div>

            <!-- 错误状态 -->
            <div v-else-if="error" style="text-align: center; padding: 20px;">
              <el-result icon="error" title="数据加载失败" :sub-title="error">
                <template #extra>
                  <el-button type="primary" @click="refreshData">重试</el-button>
                </template>
              </el-result>
            </div>

            <!-- 正常状态 -->
            <div v-else>
              <!-- 三个核心卡片：我的预约、当前使用率（全建筑汇总）、可用座位（全建筑汇总） -->
              <el-row :gutter="20">
                <!-- 卡片1：我的预约 -->
                <el-col :span="8">
                  <el-card shadow="hover">
                    <template #header>
                      <div style="font-size: 16px; font-weight: bold; color: #409EFF;">
                        <el-icon><Document /></el-icon>
                        我的预约
                      </div>
                    </template>
                    <div style="text-align: center;">
                      <div style="font-size: 36px; font-weight: bold; color: #409EFF;">
                        {{ stats.myTodayReservations !== '' ? stats.myTodayReservations : '未获取到数据' }}
                      </div>
                    </div>
                  </el-card>
                </el-col>

                <!-- 卡片2：当前使用率（全建筑汇总） -->
                <el-col :span="8">
                  <el-card shadow="hover">
                    <template #header>
                      <div style="font-size: 16px; font-weight: bold; color: #E6A23C;">
                        <el-icon><TrendCharts /></el-icon>
                        当前使用率
                      </div>
                    </template>
                    <div style="text-align: center;">
                      <div style="font-size: 36px; font-weight: bold; color: #E6A23C;">
                        {{ stats.currentUsageRate !== '' ? `${stats.currentUsageRate}%` : '未获取到数据' }}
                      </div>
                    </div>
                  </el-card>
                </el-col>

                <!-- 卡片3：可用座位（全建筑汇总） -->
                <el-col :span="8">
                  <el-card shadow="hover">
                    <template #header>
                      <div style="font-size: 16px; font-weight: bold; color: #67C23A;">
                        <el-icon><User /></el-icon>
                        可用座位
                      </div>
                    </template>
                    <div style="text-align: center;">
                      <div style="font-size: 36px; font-weight: bold; color: #67C23A;">
                        {{ stats.availableSeats !== '' ? stats.availableSeats : '未获取到数据' }}
                      </div>
                    </div>
                  </el-card>
                </el-col>
              </el-row>

              <el-divider />

              <!-- 快速操作区 -->
              <div style="display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap;">
                <el-button type="primary" size="large" @click="goto3DReservation">
                  <el-icon><Calendar /></el-icon>
                  预约座位
                </el-button>

                <el-button
                  v-if="stats.myTodayReservations !== ''"
                  type="success"
                  size="large"
                  @click="$router.push('/my-reservations')"
                >
                  <el-icon><Document /></el-icon>
                  查看我的预约 ({{ stats.myTodayReservations }})
                </el-button>

                <el-button type="warning" size="large" @click="$router.push('/sign-in')">
                  <el-icon><Check /></el-icon>
                  签到/签退
                </el-button>
              </div>
            </div>
          </el-card>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import axios from 'axios'
import {
  House,
  Calendar,
  Document,
  Check,
  Warning,
  Refresh,
  Loading,
  TrendCharts,
  User
} from '@element-plus/icons-vue'

const router = useRouter()

// --- 核心类型定义 ---
type BackendBuilding = {
  buildingId: number;
  buildingName: string;
  buildingPosX: number;
  buildingPosZ: number;
  buildingFloors: number;
  buildingRoomsPerFloor: number;
  buildingSeatsPerRoom: number;
  buildingWidth: number;
  buildingDepth: number;
};

type RoomDTO = {
  id: number;
  name: string;
  type: 'study' | 'info';
  position: { x: number; z: number };
  size: { width: number; depth: number };
  seats: Array<{
    id: number | string;
    number: number;
    x: number;
    y: number;
    enabled: boolean;
    resvSummary: { start: string; end: string }[];
  }>;
};

type ResponseMessage<T> = {
  code: number;
  message: string;
  data: T;
};

type FloorLayoutResp = ResponseMessage<RoomDTO[]> | RoomDTO[];

// --- 预约记录类型 ---
interface Reservation {
  resvId: number
  resvDate: string
  resvstartTime: string
  resvendTime: string
  seat?: {
    seatId: number
    seatNumber: string
    room?: {
      roomId: number
      roomName: string
    }
  }
}

// --- 响应式数据 ---
const loading = ref(false)
const error = ref('')
const userInfo = ref<any>(null)

// 统计数据：初始值为空字符串（仅接口失败时保持空）
const stats = ref({
  myTodayReservations: '', // 今日预约数
  currentUsageRate: '',    // 全建筑汇总使用率
  availableSeats: ''       // 全建筑汇总可用座位数
})

// 建筑列表（仅用于计算汇总数据，不展示）
const buildings = ref<BackendBuilding[]>([])

// 时间筛选
const timeFilter = ref({
  date: '',
  start: '',
  end: ''
})

// --- 创建API实例 ---
const api = axios.create({
  baseURL: 'http://localhost:8080',
  timeout: 5000
})

// --- 工具函数 ---
// 获取今日日期（和子页面一致）
const getTodayDate = () => new Date().toISOString().split('T')[0]

// 获取当前用户ID（和子页面一致）
const getCurrentUserId = () => {
  const userId = sessionStorage.getItem('userId')
  if (userId) return userId

  const userInfoStr = sessionStorage.getItem('userInfo')
  if (userInfoStr) {
    try {
      const user = JSON.parse(userInfoStr)
      if (user.userId) return user.userId.toString()
    } catch (e) {
      console.error('解析用户信息失败:', e)
    }
  }
  return ''
}

// --- 时间处理工具函数 ---
const parseTimeStr = (str: string) => {
  if (!str || typeof str !== 'string' || !str.includes(':')) return null;
  const [h, m] = str.split(':').map((v) => parseInt(v, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

const formatMin = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// --- 座位状态计算 ---
const computeSeatStatusByFilter = (seat: any, filterStart: number, filterEnd: number) => {
  if (seat?.enabled === false) return 'disabled';
  const list = seat?.resvSummary;
  if (!list || list.length === 0) return 'free';
  if (filterStart == null || filterEnd == null) return 'free';

  const intervals = list
    .map(r => {
      const resStart = parseTimeStr(r.start);
      const resEnd = parseTimeStr(r.end);
      if (resStart == null || resEnd == null) return null;
      return { start: resStart, end: resEnd };
    })
    .filter(Boolean)
    .sort((a, b) => a.start - b.start);

  if (intervals.length === 0) return 'free';

  let coveredStart = filterStart;
  for (const interval of intervals) {
    if (interval.start <= coveredStart && interval.end > coveredStart) {
      coveredStart = interval.end;
      if (coveredStart >= filterEnd) return 'occupied';
    }
  }

  for (const interval of intervals) {
    if (interval.start < filterEnd && interval.end > filterStart) return 'partial';
  }

  return 'free';
};

// --- 初始化时间筛选 ---
const initDateAndTimeOptions = () => {
  const today = getTodayDate();
  timeFilter.value.date = today;

  const now = new Date();
  const hh = now.getHours();
  const mm = Math.floor(now.getMinutes() / 30) * 30;
  timeFilter.value.start = formatMin(hh * 60 + mm);
  timeFilter.value.end = hh * 60 + mm + 120 > 22 * 60 ? '22:00' : formatMin(hh * 60 + mm + 120);
};

// --- 获取用户信息 ---
const fetchUserInfo = () => {
  const userInfoStr = sessionStorage.getItem('userInfo')
  if (userInfoStr) {
    try {
      userInfo.value = JSON.parse(userInfoStr)
    } catch (e) {
      console.error('解析用户信息失败:', e)
    }
  }
}

// --- 获取我的今日预约数 ---
const fetchMyReservations = async () => {
  stats.value.myTodayReservations = '';

  const userId = getCurrentUserId()
  if (!userId) {
    ElMessage.warning('请先登录');
    return;
  }

  try {
    const response = await fetch(`http://localhost:8080/admin/reservations/user/${userId}`);
    const result = await response.json();

    if (result.code === 200) {
      const reservations: Reservation[] = result.data || [];
      const today = getTodayDate();
      const todayReservations = reservations.filter(r => r.resvDate === today).length;
      stats.value.myTodayReservations = todayReservations;
    } else {
      throw new Error(result.message || '获取我的预约数失败');
    }
  } catch (err: any) {
    console.error('获取我的预约数失败:', err);
    stats.value.myTodayReservations = '';
    ElMessage.warning('获取今日预约数失败');
  }
}

// --- 获取建筑列表（仅用于计算汇总数据）---
const fetchBuildings = async () => {
  try {
    const res = await api.get<ResponseMessage<BackendBuilding[]>>('/building/all');
    if (res.data.code === 200) {
      buildings.value = res.data.data || [];
      // 获取建筑列表后，立即计算全建筑汇总的座位和使用率
      await calculateAllBuildingsStats();
      return buildings.value;
    } else {
      throw new Error(res.data.message || '获取建筑数据失败')
    }
  } catch (err: any) {
    console.error('获取建筑数据失败:', err);
    buildings.value = [];
    // 建筑数据获取失败，置空汇总数据
    stats.value.availableSeats = '';
    stats.value.currentUsageRate = '';
    throw err;
  }
};

// --- 计算全建筑汇总的使用率和可用座位 ---
const calculateAllBuildingsStats = async () => {
  if (buildings.value.length === 0) {
    stats.value.availableSeats = '';
    stats.value.currentUsageRate = '';
    return;
  }

  loading.value = true;
  let totalFreeAllBuildings = 0; // 全建筑可用座位总数
  let totalAllAllBuildings = 0;  // 全建筑座位总数

  try {
    // 遍历所有建筑
    for (const building of buildings.value) {
      // 遍历当前建筑的所有楼层
      for (let floorNum = 1; floorNum <= building.buildingFloors; floorNum++) {
        const res = await api.get<FloorLayoutResp>(
          `/building/${building.buildingId}/floor/${floorNum}/user`,
          { params: { date: timeFilter.value.date, start: timeFilter.value.start, end: timeFilter.value.end } }
        );

        const rooms: RoomDTO[] = Array.isArray(res.data)
          ? res.data
          : (res.data.data ?? []);

        // 统计当前楼层的座位状态
        let free = 0, total = 0;
        const filterStart = parseTimeStr(timeFilter.value.start);
        const filterEnd = parseTimeStr(timeFilter.value.end);

        rooms.forEach(room => {
          room.seats.forEach(seat => {
            total++;
            const status = computeSeatStatusByFilter(seat, filterStart, filterEnd);
            if (status === 'free') free++;
          });
        });

        // 累加到全建筑总数
        totalFreeAllBuildings += free;
        totalAllAllBuildings += total;
      }
    }

    // 计算全建筑汇总的使用率和可用座位
    stats.value.availableSeats = totalFreeAllBuildings;
    stats.value.currentUsageRate = totalAllAllBuildings > 0
      ? Math.round((totalAllAllBuildings - totalFreeAllBuildings) / totalAllAllBuildings * 100)
      : 0;

  } catch (err: any) {
    console.error('计算全建筑汇总数据失败:', err);
    stats.value.availableSeats = '';
    stats.value.currentUsageRate = '';
    ElMessage.warning('获取全建筑座位数据失败');
  } finally {
    loading.value = false;
  }
};

// --- 3D预约跳转逻辑 ---
const goto3DReservation = () => {
  router.push({
    path: '/reservation',
    query: {
      mode: '3d',
      date: timeFilter.value.date,
      start: timeFilter.value.start,
      end: timeFilter.value.end
    }
  });
};

// --- 刷新所有数据 ---
const refreshData = async () => {
  loading.value = true;
  error.value = '';

  try {
    await Promise.all([
      fetchUserInfo(),
      fetchMyReservations(),
      fetchBuildings()
    ]);
    ElMessage.success('数据更新成功');
  } catch (err: any) {
    console.error('刷新数据失败:', err);
    error.value = '未获取到数据';
    ElMessage.error('数据更新失败');
  } finally {
    loading.value = false;
  }
};

// --- 退出登录 ---
const handleLogout = () => {
  ElMessageBox.confirm('确定要退出登录吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    sessionStorage.clear();
    ElMessage.success('已退出登录');
    router.push('/login');
  });
};

// --- 初始化 ---
onMounted(async () => {
  initDateAndTimeOptions();
  await refreshData();
});
</script>

<style scoped>
.home {
  height: 100vh;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 卡片样式优化 */
.el-card {
  border-radius: 10px;
  transition: all 0.3s ease;
}

.el-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

/* 响应式调整 */
@media (max-width: 768px) {
  .el-col {
    margin-bottom: 20px;
  }

  .el-header {
    padding: 0 10px;
  }

  h2 {
    font-size: 18px;
  }

  .el-button {
    margin-bottom: 10px;
  }
}
</style>
