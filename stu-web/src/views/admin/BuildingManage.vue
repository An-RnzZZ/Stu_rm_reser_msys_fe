<template>
  <div class="scene-container" ref="canvasContainer">
    <canvas
      ref="canvasRef"
      :class="{ 'canvas-disabled': isModalOpen }"
    />


    <!-- ================== 加载中 ================== -->
    <div v-if="loading" class="loading-overlay">
      <div class="spinner"></div>
      <p>正在生成图书馆场景...</p>
    </div>

    <!-- ================== UI 悬浮层 ================== -->
    <div class="ui-overlay" :class="{ 'ui-hidden': loading }">

      <!-- ===== 新建筑放置面板 ===== -->
      <div
        v-if="adminMode === 'placingBuilding'"
        class="placement-panel"
        @mousedown.stop
        @mouseup.stop
        @click.stop
      >
        <div class="panel-header">
          🏗 新建筑放置
        </div>

        <div class="panel-body">
          <div class="pos-row">
            <span>X</span>
            <strong>{{ ghostPosX.toFixed(1) }}</strong>
          </div>
          <div class="pos-row">
            <span>Z</span>
            <strong>{{ ghostPosZ.toFixed(1) }}</strong>
          </div>

          <div class="hint">
            使用方向键微调位置（Shift 加速）
          </div>
        </div>

        <div class="panel-actions">
          <button class="btn-cancel" @click="cancelGhostBuilding">
            取消
          </button>
          <button class="btn-confirm" @click="confirmGhostBuilding">
            确认放置
          </button>
        </div>
      </div>

      <!-- ===== 顶部按钮 ===== -->
      <transition name="fade">
        <div>
          <button
            v-if="viewMode !== 'campus'"
            @click="resetView"
            class="back-btn"
          >
            ← 返回建筑概览
          </button>

          <button
            v-if="viewMode === 'campus'"
            @click="enterAddBuildingMode"
            class="back-btn"
          >
            ➕ 新增建筑
          </button>

          <!-- ⭐ 新增：删除建筑 -->
          <button
            v-if="viewMode === 'building'"
            @click="confirmDeleteBuilding"
            class="back-btn danger"
          >
            🗑 删除该建筑
          </button>
        </div>
      </transition>


      <!-- ===== 楼层选择 ===== -->
      <transition name="fade">
        <div
          v-if="viewMode === 'floor'"
          class="floor-selector"
          @mousedown.stop
          @mouseup.stop
          @click.stop
        >
          <div class="floor-label">选择楼层:</div>
          <button
            v-for="floorNum in totalFloors"
            :key="floorNum"
            :class="{ active: currentFloor === floorNum }"
            @click="selectFloor(floorNum)"
          >
            {{ floorNum }}F
          </button>
        </div>
      </transition>

      <!-- ===== 图例 ===== -->
      <div
        class="legend"
        v-if="viewMode === 'floor'"
        @mousedown.stop
        @mouseup.stop
        @click.stop
      >
        <div class="item">
          <span class="dot free"></span>正常启用
        </div>
        <div class="item">
          <span class="dot disabled"></span>维修中
        </div>
      </div>
    </div>

    <!-- ================== Tooltip ================== -->
    <div
      class="tooltip"
      ref="tooltipRef"
      :style="tooltipStyle"
      v-show="hoverInfo && !freezeTooltip"
    >
      {{ hoverInfo }}
    </div>

    <!-- ================== 座位管理弹窗 ================== -->
    <div
      v-if="showSeatAdminModal"
      class="reservation-overlay"
      @click.self="closeSeatAdmin"
      @mousedown.stop
      @mouseup.stop
    >
      <div
        class="reservation-dialog"
        @click.stop
        @mousedown.stop
        @mouseup.stop
      >
        <h2>座位管理</h2>

        <p class="seat-label">
          当前座位：
          <strong>{{ adminSeat?.userData.id }}</strong>
        </p>

        <div class="form-row">
          <label>座位状态</label>
          <select
            v-model="adminSeat.userData.enabled"
            @change="toggleSeatEnable"
          >
            <option :value="true">启用</option>
            <option :value="false">禁用</option>
          </select>
        </div>

        <div class="dialog-actions">
          <button class="btn-cancel" @click="closeSeatAdmin">
            关闭
          </button>
        </div>
      </div>
    </div>

    <!-- ================== 建筑配置确认弹窗 ================== -->
    <div
      v-if="showBuildingConfigModal"
      class="reservation-overlay"
      @click.self="showBuildingConfigModal = false"
      @mousedown.stop
      @mouseup.stop
    >
      <div
        class="reservation-dialog"
        @click.stop
        @mousedown.stop
        @mouseup.stop
      >
        <h2>确认建筑配置</h2>

        <div class="form-row">
          <label>建筑名称</label>
          <input
            type="text"
            v-model.trim="addForm.name"
            placeholder="请输入建筑名称"
          />
        </div>


        <div class="form-row">
          <label>楼层数</label>
          <input type="number" v-model.number="addForm.floors" min="1" />
        </div>

        <div class="form-row">
          <label>每层自习室数量</label>
          <input type="number" v-model.number="addForm.roomsPerFloor" min="1" />
        </div>

        <div class="form-row">
          <label>每个自习室座位数</label>
          <input type="number" v-model.number="addForm.seatsPerRoom" min="1" />
        </div>

        <p class="hint">
          确认后将生成建筑结构和所有座位
        </p>

        <div class="dialog-actions">
          <button
            class="btn-cancel"
            @click="showBuildingConfigModal = false"
          >
            返回修改
          </button>
          <button
            class="btn-confirm"
            @click="confirmCreateBuildingFinal"
          >
            确认创建
          </button>
        </div>
      </div>
    </div>
  </div>
</template>


<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, reactive, computed, watch } from 'vue';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { Vector2 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';
import axios from 'axios';

// --- 状态管理 ---

const totalFloors = ref(0); // ✅ 新增：左侧楼层按钮数量

const showBuildingConfigModal = ref(false);
// 新增建筑表单
const addForm = reactive({
  name: '',
  floors: 3,
  roomsPerFloor: 2,
  seatsPerRoom: 20
});

const canvasRef = ref(null);
const canvasContainer = ref(null);
type ViewMode = 'campus' | 'building' | 'floor';
const viewMode = ref<ViewMode>('campus');
const currentFloor = ref(1);
const DEFAULT_FLOORS = 3;

const hoverInfo = ref('');
const tooltipRef = ref(null);
const tooltipStyle = reactive({ top: '0px', left: '0px' });
const freezeTooltip = ref(true);

const loading = ref(true);

type AdminMode = 'normal' | 'placingBuilding';

const adminMode = ref<AdminMode>('normal');
let ghostBuilding: BuildingInstance | null = null;
const ghostPosX = ref(0);
const ghostPosZ = ref(0);

const timeTicks = ref(['08:00', '12:00', '16:00', '20:00', '22:00']); // 时间刻度
// ======================
// 幽灵墙 Padding（只影响可视，不影响后端）
// ======================
const SHELL_PADDING_X = 2.5;   // 左右
const SHELL_PADDING_Z = 4.0;   // 前后（一定要大于 X）

// 座位管理弹窗
const showSeatAdminModal = ref(false);
const adminSeat = ref(null);
type FloorLayoutResp = ResponseMessage<RoomDTO[]> | RoomDTO[];

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
    y: number; // 你现在当 z 用
    enabled: boolean;
    resvSummary: { start: string; end: string }[];
  }>;
};


type ResponseMessage<T> = {
  code: number;
  message: string;
  data: T;
};


const enterAddBuildingMode = () => {
  // 只有在 campus 才允许放置
  if (viewMode.value !== 'campus') return;

  adminMode.value = 'placingBuilding';

  // 给一个默认名字也行（可选）
  if (!addForm.name) addForm.name = 'New Building';

  startGhostBuilding();
};

// 把后端 Building 转成 createBuildingInstance 需要的 config
const mapBackendBuildingToConfig = (b: BackendBuilding) => {
  return {
    id: b.buildingId,
    name: b.buildingName,
    position: { x: b.buildingPosX, z: b.buildingPosZ },
    floors: b.buildingFloors,
    roomsPerFloor: b.buildingRoomsPerFloor,
    seatsPerRoom: b.buildingSeatsPerRoom,
    width: b.buildingWidth,
    depth: b.buildingDepth
  };
};

const isModalOpen = computed(() => {
  return showSeatAdminModal.value || showBuildingConfigModal.value;

});

watch(isModalOpen, (open) => {
  // ⚠️ controls 可能还没初始化，所以一定要判空
  if (controls) {
    controls.enabled = !open;
  }
});
// 新增：更新时间刻度（根据动态时间范围）
const updateTimeTicks = (startMin, endMin) => {
  const duration = endMin - startMin;
  const ticks = [];

  // 将分钟数转换为时间字符串
  const formatTime = (minutes) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  // 根据时长决定显示几个刻度
  if (duration <= 60) { // 1小时以内：显示开始和结束
    ticks.push(formatTime(startMin));
    ticks.push(formatTime(endMin));
  } else if (duration <= 240) { // 4小时以内：显示3个刻度
    const mid = Math.round((startMin + endMin) / 2);
    ticks.push(formatTime(startMin));
    ticks.push(formatTime(mid));
    ticks.push(formatTime(endMin));
  } else { // 4小时以上：显示5个刻度
    const interval = duration / 4;
    ticks.push(formatTime(startMin));
    ticks.push(formatTime(startMin + interval));
    ticks.push(formatTime(startMin + interval * 2));
    ticks.push(formatTime(startMin + interval * 3));
    ticks.push(formatTime(endMin));
  }

  timeTicks.value = ticks;
};

// 更新用户选择的时间段在时间条上的位置
// 更新用户选择的时间段在时间条上的位置



// 楼层时间筛选状态
const timeFilter = reactive({
  date: '',
  start: '',
  end: ''
});
const nowTimeLabel = ref('');

// 日期选项（今/明/后天）
const dateOptions = ref([]);
// 时间段选项（半小时，最晚 22:00）
const timeSlots = ref([]);

// --- Three.js 核心变量 ---
let scene, camera, renderer, raycaster, mouse;

interface BuildingInstance {
  id: number;
  name: string;
  width: number;
  depth: number;
  floors: number;
  rootGroup: THREE.Group;
  floorStructureMeshes: THREE.Mesh[];
  floorInteriorGroups: THREE.Group[];
  floorShellGroups: THREE.Group[];
  roofMesh?: THREE.Mesh;
  hitBox?: THREE.Mesh;
  __layout?: Record<number, any[]>;
}

const buildings: BuildingInstance[] = [];
let activeBuilding: BuildingInstance | null = null;

let envGroup = null; // 环境（马路、树等）
let animationId;

// 后处理
let composer;
let smaaPass, outlinePass;
let selectedOutlineObjects = [];

// 轨道控制器
let controls;

const FLOOR_LEVEL_HEIGHT = 4.0;
const DEFAULT_WIDTH = 40;
const DEFAULT_DEPTH = 40;
// 工具：解析 "HH:MM" 为分钟数
const parseTimeStr = (str) => {
  if (!str || typeof str !== 'string' || !str.includes(':')) return null;
  const [h, m] = str.split(':').map((v) => parseInt(v, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};



const startGhostBuilding = () => {
  // 防止重复
  if (ghostBuilding) {
    scene.remove(ghostBuilding.rootGroup);
    ghostBuilding = null;
  }

  ghostBuilding = createBuildingInstance({
    id: -1,
    name: '新建筑（预览）',
    position: { x: 0, z: 0 }
  });

// ⭐ 标记幽灵
  ghostBuilding.rootGroup.userData.isGhost = true;

// ⭐ 关键：放到 layer 1
  ghostBuilding.rootGroup.traverse(obj => {
    obj.layers.set(1);
  });

  applyGhostStyle(ghostBuilding);
  ghostPosX.value = ghostBuilding.rootGroup.position.x;
  ghostPosZ.value = ghostBuilding.rootGroup.position.z;


};


const applyGhostStyle = (building: BuildingInstance) => {
  building.rootGroup.traverse((obj) => {
    if (!obj.isMesh) return;

    obj.material = obj.material.clone();
    obj.material.transparent = true;
    obj.material.opacity = 0.25;

    // 幽灵蓝
    if (obj.material.color) {
      obj.material.color.multiplyScalar(0.8);
    }

    // 不投射阴影
    obj.castShadow = false;
    obj.receiveShadow = false;
  });

  // 幽灵建筑不能被点击
  if (building.hitBox) {
    building.hitBox.visible = false;
  }
};


const cancelGhostBuilding = () => {
  if (ghostBuilding) {
    scene.remove(ghostBuilding.rootGroup);
    ghostBuilding = null;
  }


  addForm.name = '';

  adminMode.value = 'normal';
};



const confirmGhostBuilding = () => {
  if (!ghostBuilding) return;
  // ⭐ 不创建，只弹窗
  showBuildingConfigModal.value = true;

};


const confirmCreateBuildingFinal = async () => {
  if (!ghostBuilding) return;

  // 🔒 校验建筑名
  if (!addForm.name || addForm.name.trim().length === 0) {
    alert('请输入建筑名称');
    return;
  }

  try {
    await api.post('/building/add', {
      buildingName: addForm.name.trim(),
      buildingPosX: ghostBuilding.rootGroup.position.x,
      buildingPosZ: ghostBuilding.rootGroup.position.z,
      buildingFloors: addForm.floors,
      buildingRoomsPerFloor: addForm.roomsPerFloor,
      buildingSeatsPerRoom: addForm.seatsPerRoom
    });

    // 移除幽灵
    scene.remove(ghostBuilding.rootGroup);
    ghostBuilding = null;

    // 重拉建筑
    await loadBuildingsFromBackend();

    adminMode.value = 'normal';
    showBuildingConfigModal.value = false;

    // 🧹 重置表单
    addForm.name = '';
    addForm.floors = 3;
    addForm.roomsPerFloor = 2;
    addForm.seatsPerRoom = 20;

  } catch (e) {
    console.error('create building failed:', e);
    alert('创建建筑失败，请查看后端日志');
  }
};



const getActiveBuildingCenter = () => {
  const c = new THREE.Vector3();
  if (!activeBuilding) return c;
  activeBuilding.rootGroup.getWorldPosition(c);
  return c;
};



// --- 材质 ---
const materials = {
  buildingWall: new THREE.MeshStandardMaterial({
    color: 0xa9bed8,
    roughness: 0.7,
    metalness: 0.08,
    transparent: true,
    opacity: 0.95
  }),
  buildingWindow: new THREE.MeshStandardMaterial({
    color: 0xd9e7f5,
    transparent: true,
    opacity: 0.32,
    roughness: 0.15,
    metalness: 0.08
  }),
  ground: new THREE.MeshStandardMaterial({
    color: 0xd5e6f0,
    roughness: 0.85,
    metalness: 0
  }),
  roomFloor: new THREE.MeshStandardMaterial({
    color: 0xf7f9fc,
    roughness: 0.6,
    metalness: 0.03
  }),
  seatFree: new THREE.MeshStandardMaterial({
    color: 0x7ec4b8,
    roughness: 0.55,
    metalness: 0.08
  }),

  seatDisabled: new THREE.MeshStandardMaterial({
    color: 0x9ca3af,
    roughness: 0.6,
    metalness: 0.05
  }),
  highlight: new THREE.MeshStandardMaterial({
    color: 0x9ec5ff,
    roughness: 0.35,
    metalness: 0.15
  }),
  selected: new THREE.MeshStandardMaterial({
    color: 0xfff59d,
    roughness: 0.35,
    metalness: 0.15
  }),
  bookShelf: new THREE.MeshStandardMaterial({
    color: 0x8b6b5c,
    roughness: 0.75,
    metalness: 0.02,
    transparent: true,
    opacity: 0.6
  }),
  desk: new THREE.MeshStandardMaterial({
    color: 0xd0c0b2,
    roughness: 0.55,
    metalness: 0.04
  }),
  road: new THREE.MeshStandardMaterial({
    color: 0x4b5563,
    roughness: 0.9,
    metalness: 0.05
  }),
  roadLine: new THREE.MeshStandardMaterial({
    color: 0xe5e7eb,
    roughness: 0.8,
    metalness: 0.02
  }),
  sidewalk: new THREE.MeshStandardMaterial({
    color: 0xe0e7ff,
    roughness: 0.85,
    metalness: 0.02
  }),
  treeTrunk: new THREE.MeshStandardMaterial({
    color: 0x795548,
    roughness: 0.9,
    metalness: 0.0
  }),
  treeLeaf: new THREE.MeshStandardMaterial({
    color: 0x7fbf9f,
    roughness: 0.7,
    metalness: 0.02
  }),
  ghostWall: new THREE.MeshStandardMaterial({
    color: 0xa9bed8,
    roughness: 0.9,
    metalness: 0.0,
    transparent: true,
    opacity: 0.18
  })
};

// --- 初始化场景 ---
const initScene = () => {
  scene = new THREE.Scene();
  scene.background = new THREE.Color('#e8f1fb');
  scene.add(new THREE.AmbientLight(0xfafcff, 0.9));

  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.layers.enable(0);   // 正常建筑
  camera.layers.enable(1); // 幽灵建筑
  camera.position.set(55, 45, 55);
  camera.lookAt(0, 5, 0);


  renderer = new THREE.WebGLRenderer({
    canvas: canvasRef.value,
    antialias: true,
    alpha: true
  });
  resizeByContainer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // OrbitControls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 25;
  controls.maxDistance = 300;
  controls.minPolarAngle = Math.PI / 6;
  controls.maxPolarAngle = Math.PI / 2.1;
  controls.target.set(0, 5, 0);
  controls.enabled = false; // 初始飞入结束后再启用
  controls.update();

  scene.add(new THREE.AmbientLight(0xf6fbff, 0.8));

  const dirLight = new THREE.DirectionalLight(0xfdfcff, 1.25);
  dirLight.position.set(20, 35, 20);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 0.1;
  dirLight.shadow.camera.far = 80;
  dirLight.shadow.camera.left = -25;
  dirLight.shadow.camera.right = 25;
  dirLight.shadow.camera.top = 25;
  dirLight.shadow.camera.bottom = -25;
  dirLight.shadow.bias = -0.0005;
  scene.add(dirLight);

  raycaster = new THREE.Raycaster();
  // ⭐ 关键：raycaster 只检测 layer 0
  raycaster.layers.enable(0);
  raycaster.layers.disable(1);

  mouse = new THREE.Vector2();

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  outlinePass = new OutlinePass(
    new Vector2(window.innerWidth, window.innerHeight),
    scene,
    camera
  );
  outlinePass.edgeStrength = 2.0;
  outlinePass.edgeGlow = 0.5;
  outlinePass.edgeThickness = 1.0;
  outlinePass.pulsePeriod = 0;
  outlinePass.visibleEdgeColor.set(0x91c4ff);
  outlinePass.hiddenEdgeColor.set(0x1b2636);
  composer.addPass(outlinePass);

  smaaPass = new SMAAPass(
    window.innerWidth * renderer.getPixelRatio(),
    window.innerHeight * renderer.getPixelRatio()
  );
  composer.addPass(smaaPass);

  // 初始飞入动画
  setTimeout(() => {
    loading.value = false;
    freezeTooltip.value = false;

    if (controls) controls.enabled = false;

    gsap.fromTo(
      camera.position,
      { x: 80, y: 70, z: 80 },
      {
        x: 55,
        y: 45,
        z: 55,
        duration: 1.5,
        ease: 'power2.out',
        delay: 0.3,
        onUpdate: () => {
          camera.lookAt(0, 5, 0);
        },
        onComplete: () => {
          camera.lookAt(0, 5, 0);
          if (controls) {
            controls.target.set(0, 5, 0);
            controls.enabled = true;
            controls.update();
          }
        }
      }
    );
  }, 800);
};


const createWindowsForBuilding = (building: BuildingInstance) => {
  building.floorStructureMeshes.forEach((floorMesh, i) => {
    const floorNum = i + 1;

    // ✅ 与 createBuildingInstance 里墙体尺寸完全一致
    const floorSizeX = building.width * 0.9 - i * 0.5;
    const floorSizeZ = building.depth * 0.9 - i * 0.5;

    const windowHeight = FLOOR_LEVEL_HEIGHT * 0.6;
    const windowThickness = 0.12;
    const windowRatio = 0.7;

    const isGhostBuilding = building.rootGroup.userData.isGhost;
    const windowMaterial = isGhostBuilding
      ? new THREE.MeshStandardMaterial({
        color: 0xa9bed8,
        transparent: true,
        opacity: 0.25,
        roughness: 0.7,
        metalness: 0.08
      })
      : materials.buildingWindow.clone();

    // ✅ 外贴一点点，确保“贴在墙外表面”看得到
    const eps = 0.02;

    // 建一个容器，方便后面统一更新/删除
    const winGroup = new THREE.Group();
    winGroup.name = `Floor_${floorNum}_Windows`;
    winGroup.userData = { type: 'windowGroup', floorNumber: floorNum };

    // 前后窗
    const fbGeo = new THREE.BoxGeometry(
      floorSizeX * windowRatio,
      windowHeight,
      windowThickness
    );
    const front = new THREE.Mesh(fbGeo, windowMaterial);
    front.position.set(0, 0, floorSizeZ / 2 + windowThickness / 2 + eps);
    front.userData = { type: 'window', side: 'front', floorNumber: floorNum };

    const back = new THREE.Mesh(fbGeo, windowMaterial);
    back.position.set(0, 0, -(floorSizeZ / 2 + windowThickness / 2 + eps));
    back.userData = { type: 'window', side: 'back', floorNumber: floorNum };

    // 左右窗
    const lrGeo = new THREE.BoxGeometry(
      windowThickness,
      windowHeight,
      floorSizeZ * windowRatio
    );
    const right = new THREE.Mesh(lrGeo, windowMaterial);
    right.position.set(floorSizeX / 2 + windowThickness / 2 + eps, 0, 0);
    right.userData = { type: 'window', side: 'right', floorNumber: floorNum };

    const left = new THREE.Mesh(lrGeo, windowMaterial);
    left.position.set(-(floorSizeX / 2 + windowThickness / 2 + eps), 0, 0);
    left.userData = { type: 'window', side: 'left', floorNumber: floorNum };

    // ✅ 关键：挂到 floorMesh 上（窗户会跟着每层一起移动/隐藏）
    winGroup.add(front, back, right, left);
    floorMesh.add(winGroup);

    // 幽灵建筑放到 layer 1（你原来逻辑保持）
    if (isGhostBuilding) {
      winGroup.traverse(obj => obj.layers.set(1));
    }
  });
};



const handleGhostKeyMove = (e: KeyboardEvent) => {
  // 🚫 输入框里不响应
  const tag = (e.target as HTMLElement)?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;

  if (adminMode.value !== 'placingBuilding' || !ghostBuilding) return;

  const step = e.shiftKey ? 5 : 1;

  switch (e.key) {
    case 'ArrowUp':
      ghostBuilding.rootGroup.position.z -= step;
      break;
    case 'ArrowDown':
      ghostBuilding.rootGroup.position.z += step;
      break;
    case 'ArrowLeft':
      ghostBuilding.rootGroup.position.x -= step;
      break;
    case 'ArrowRight':
      ghostBuilding.rootGroup.position.x += step;
      break;
  }

  // 更新窗户位置
  updateWindowsPosition(ghostBuilding);

  ghostPosX.value = ghostBuilding.rootGroup.position.x;
  ghostPosZ.value = ghostBuilding.rootGroup.position.z;
};

// 更新窗户的位置
const updateWindowsPosition = (b: BuildingInstance) => {
  b.floorStructureMeshes.forEach((floorMesh, i) => {
    const floorSizeX = b.width * 0.9 - i * 0.5;
    const floorSizeZ = b.depth * 0.9 - i * 0.5;

    const windowThickness = 0.12;
    const windowRatio = 0.7;
    const eps = 0.02;

    // 找到这一层的 windowGroup
    const winGroup = floorMesh.children.find(
      c => c.userData?.type === 'windowGroup'
    ) as THREE.Group | undefined;
    if (!winGroup) return;

    winGroup.traverse((obj: any) => {
      if (!obj.isMesh || obj.userData?.type !== 'window') return;

      const side = obj.userData.side;
      if (side === 'front') {
        obj.position.set(0, 0, floorSizeZ / 2 + windowThickness / 2 + eps);
        // 重新设置几何，防止尺寸不匹配
        obj.geometry.dispose();
        obj.geometry = new THREE.BoxGeometry(floorSizeX * windowRatio, obj.geometry.parameters.height ?? FLOOR_LEVEL_HEIGHT * 0.6, windowThickness);
      } else if (side === 'back') {
        obj.position.set(0, 0, -(floorSizeZ / 2 + windowThickness / 2 + eps));
      } else if (side === 'right') {
        obj.position.set(floorSizeX / 2 + windowThickness / 2 + eps, 0, 0);
      } else if (side === 'left') {
        obj.position.set(-(floorSizeX / 2 + windowThickness / 2 + eps), 0, 0);
      }
    });
  });
};






// --- 建筑 + 幽灵墙（外壳仍然是静态 3 层，内部动态） ---
const createBuildingInstance = (config: {
  id: number;
  name: string;
  position?: { x: number; z: number };
  floors?: number;
  width?: number;
  depth?: number;
}) => {
  const floors = config.floors ?? DEFAULT_FLOORS;
  const width = config.width ?? DEFAULT_WIDTH;
  const depth = config.depth ?? DEFAULT_DEPTH;

  const building: BuildingInstance = {
    id: config.id,
    name: config.name,
    width,
    depth,
    floors,
    rootGroup: new THREE.Group(),
    floorStructureMeshes: [],
    floorInteriorGroups: [],
    floorShellGroups: [],
    roofMesh: undefined
  };

  building.rootGroup.name = `Building_${config.id}`;

  if (config.position) {
    building.rootGroup.position.set(
      config.position.x,
      0,
      config.position.z
    );
  }

  scene.add(building.rootGroup);
  const groundW = Math.max(width, 20) + 50;
  const groundD = Math.max(depth, 20) + 50;
  const groundGeo = new THREE.PlaneGeometry(groundW, groundD);
  const ground = new THREE.Mesh(groundGeo, materials.ground);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.position.y = -0.01;
  building.rootGroup.add(ground);

  for (let i = 0; i < floors; i++) {
    const floorY = i * FLOOR_LEVEL_HEIGHT + FLOOR_LEVEL_HEIGHT / 2;
    const baseFloorSizeX = width * 0.9 - i * 0.5;   // 实体结构尺寸
    const baseFloorSizeZ = depth * 0.9 - i * 0.5;

// ⭐ 幽灵墙用“扩展后的尺寸”
    const shellSizeX = baseFloorSizeX + SHELL_PADDING_X * 2;
    const shellSizeZ = baseFloorSizeZ + SHELL_PADDING_Z * 2;

    const wallGeo = new THREE.BoxGeometry(
      baseFloorSizeX,
      FLOOR_LEVEL_HEIGHT,
      baseFloorSizeZ
    );

    const floorMesh = new THREE.Mesh(wallGeo, materials.buildingWall.clone());
    floorMesh.position.y = floorY;
    floorMesh.castShadow = true;
    floorMesh.receiveShadow = true;
    floorMesh.userData = {
      type: 'floor',
      floorNumber: i + 1,
      name: `图书馆${i + 1}层`,
      originalY: floorY // ⭐ 新增
    };
    floorMesh.userData.originalY = floorY;
    building.rootGroup.add(floorMesh);
    building.floorStructureMeshes.push(floorMesh);


    // 幽灵墙
    const shellGroup = new THREE.Group();
    shellGroup.name = `Floor_${i + 1}_Shell`;
    shellGroup.visible = false;

// ⭐ 把整组放到这一层的高度
    shellGroup.position.y = floorY;

    const ghostMatBase = materials.ghostWall;
    const THICK = 0.15;
    const EPS = 0.02;

// 前
    const frontWall = new THREE.Mesh(
      new THREE.BoxGeometry(shellSizeX, FLOOR_LEVEL_HEIGHT, THICK),
      ghostMatBase.clone()
    );
    frontWall.position.set(0, 0, shellSizeZ / 2 + THICK / 2 + EPS);
    shellGroup.add(frontWall);

// 后
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(shellSizeX, FLOOR_LEVEL_HEIGHT, THICK),
      ghostMatBase.clone()
    );
    backWall.position.set(0, 0, -shellSizeZ / 2 - THICK / 2 - EPS);
    shellGroup.add(backWall);

// 右
    const rightWall = new THREE.Mesh(
      new THREE.BoxGeometry(THICK, FLOOR_LEVEL_HEIGHT, shellSizeZ),
      ghostMatBase.clone()
    );
    rightWall.position.set(shellSizeX / 2 + THICK / 2 + EPS, 0, 0);
    rightWall.material.opacity = 0.06;
    shellGroup.add(rightWall);

// 左
    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(THICK, FLOOR_LEVEL_HEIGHT, shellSizeZ),
      ghostMatBase.clone()
    );
    leftWall.position.set(-shellSizeX / 2 - THICK / 2 - EPS, 0, 0);
    shellGroup.add(leftWall);

// ✅ 挂在 building 上（不是 floorMesh）
    building.rootGroup.add(shellGroup);
    building.floorShellGroups.push(shellGroup);

  }

  const roofBaseSizeXY = width * 0.9 - (floors - 1) * 0.5;
  const roofBaseSizeZ = depth* 0.9 - (floors - 1) * 0.5;
  const roofGeo = new THREE.BoxGeometry(roofBaseSizeXY + 0.3, 0.4, roofBaseSizeZ + 0.3);
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x60748e,
    roughness: 0.6,
    metalness: 0.1
  });
  building.roofMesh = new THREE.Mesh(roofGeo, roofMat);
  building.roofMesh.position.y = floors * FLOOR_LEVEL_HEIGHT + 0.2;
  building.roofMesh.castShadow = true;
  building.roofMesh.receiveShadow = true;
  building.rootGroup.add(building.roofMesh);
// ======================
// 建筑点击代理（Campus 用）
// ======================
  const hitBoxHeight = floors * FLOOR_LEVEL_HEIGHT + 1;
  const hitBoxGeo = new THREE.BoxGeometry(
    width * 0.95,
    hitBoxHeight,
    depth * 0.95
  );

  const hitBoxMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.0, // 完全不可见
    depthWrite: false
  });

  const hitBox = new THREE.Mesh(hitBoxGeo, hitBoxMat);
  hitBox.position.y = hitBoxHeight / 2;
  hitBox.userData = {
    type: 'building',
    buildingId: building.id
  };

// ⚠️ 一定要加到 rootGroup
  building.rootGroup.add(hitBox);
  building.hitBox = hitBox;

  // 为建筑添加窗户（调用新的方法）
  createWindowsForBuilding(building);  // 调用新创建的方法来生成窗户

  return building;
};

const createBuildingFromBackend = (b: BackendBuilding) => {
  const cfg = mapBackendBuildingToConfig(b);

  // 防止重复：用 cfg.id（也就是 buildingId）
  if (buildings.some(x => x.id === cfg.id)) return;

  const building = createBuildingInstance(cfg);
  createEmptyFloorGroups(building);

  buildings.push(building);
  building.rootGroup.visible = (viewMode.value === 'campus');
};




// --- 环境 ---
const createEnvironment = () => {
  envGroup = new THREE.Group();
  envGroup.name = 'Environment';
  scene.add(envGroup);

  // 只创建简单的地面，不创建街道和树木
  const groundGeo = new THREE.PlaneGeometry(90, 90);
  const ground = new THREE.Mesh(groundGeo, materials.ground);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.position.y = -0.01;
  envGroup.add(ground);


};

const toggleSeatEnable = async () => {
  const seat = adminSeat.value;
  if (!seat) return;

  try {
    await api.put('/seat/update', {
      seatId: seat.userData.backendSeatId,
      seatEnabled: seat.userData.enabled // ✅ 直接用 v-model 的值
    });

    applySeatMaterialByEnabled(seat);
  } catch (error) {
    console.error('Failed to update seat status:', error);
  }
};




const closeSeatAdmin = () => {
  adminSeat.value = null;
  showSeatAdminModal.value = false;

  selectedOutlineObjects = [];
  outlinePass.selectedObjects = [];
};


const loadBuildingsFromBackend = async () => {
  // 你后端是 /all（按你 Controller 的写法，实际前缀看你类上的 @RequestMapping）
  const res = await api.get<ResponseMessage<BackendBuilding[]>>('/building/all');
  console.log('raw res.data =', res.data);
  if (res.data.code !== 200) {
    console.warn('fetch buildings failed:', res.data.message);
    return;
  }

  // 清空旧建筑（避免重复）
  buildings.forEach(b => scene.remove(b.rootGroup));
  buildings.length = 0;

  res.data.data.forEach((b) => {
    const cfg = mapBackendBuildingToConfig(b);
    const inst = createBuildingInstance(cfg);
    createEmptyFloorGroups(inst);
    buildings.push(inst);

    inst.rootGroup.visible = (viewMode.value === 'campus');
  });
};


// --- 每层创建一个空的内部 group，内容全部由后端填充 ---
const createEmptyFloorGroups = (building: BuildingInstance) => {
  for (let i = 1; i <= building.floors; i++) {
    const floorGroup = new THREE.Group();
    floorGroup.name = `Building_${building.id}_Floor_${i}_Interior`;
    floorGroup.position.y = (i - 1) * FLOOR_LEVEL_HEIGHT;
    floorGroup.visible = false;

    building.floorInteriorGroups.push(floorGroup);
    building.rootGroup.add(floorGroup); // ✅ 必须挂在 building 下
  }
};

// --- 根据当前时间筛选计算座位状态（使用后端的 resvSummary） ---
const computeSeatStatusByFilter = (seat) => {
  const list = seat.userData.resvSummary;
  if (!list || list.length === 0) return 'free';

  const filterStart = parseTimeStr(timeFilter.start);
  const filterEnd = parseTimeStr(timeFilter.end);
  if (filterStart == null || filterEnd == null) return 'free';

  let occupied = false;
  let partial = false;

  for (const r of list) {
    const resStart = parseTimeStr(r.start);
    const resEnd = parseTimeStr(r.end);
    if (resStart == null || resEnd == null) continue;

    // 完全不重叠
    if (resEnd <= filterStart || resStart >= filterEnd) continue;

    // 完全覆盖
    if (resStart <= filterStart && resEnd >= filterEnd) {
      occupied = true;
      break;
    }

    // 有部分重叠
    partial = true;
  }

  if (occupied) return 'occupied';
  if (partial) return 'partial';
  return 'free';
};


// 根据状态切换座位材质
const applySeatMaterialByEnabled = (seat) => {
  const mat =
    seat.userData.enabled === false
      ? materials.seatDisabled  // 如果禁用，设置禁用样式
      : materials.seatFree;     // 如果启用，设置正常样式

  seat.traverse((child) => {
    if (!child.isMesh) return;
    if (child.parent?.userData?.subtype === 'table') return;
    child.material = mat.clone();
  });
};




const updateSeatStatus = async (seatId, enabled) => {
  try {
    const response = await api.post('/seat/update', {
      seatId,
      enabled
    });

    // 根据后端返回结果进行处理（成功、失败）
    if (response.data.code === 200) {
      console.log('Seat status updated successfully');
    } else {
      console.error('Failed to update seat status');
    }
  } catch (error) {
    console.error('Error updating seat status:', error);
  }
};

// 对当前楼层所有座位应用筛选规则
const applyTimeFilterToCurrentFloorSeats = () => {
  const group = activeBuilding?.floorInteriorGroups[currentFloor.value - 1];
  if (!group) return;

  group.traverse((obj) => {
    if (obj.userData && obj.userData.type === 'seat') {
      if (obj.userData.status !== 'selected') {
        obj.userData.status = computeSeatStatusByFilter(obj);
      }
      applySeatMaterialByEnabled(obj);
    }
  });
};

// --- 构建房间与座位：完全根据后端 RoomDisplayDTO ---
// 根据 RoomDisplayDTO 构建房间 + 里面所有座位
const buildRoomFromDTO = (parentGroup, roomDTO, floorNum) => {
  console.log('buildRoomFromDTO:', roomDTO);

  const roomGroup = new THREE.Group();

  // ✅ 房间世界坐标：用后端的 position.x / position.z
  //   y 高度由整个楼层 group 决定，这里只加一点点偏移防止 z-fighting
  if (roomDTO.position) {
    roomGroup.position.set(roomDTO.position.x, 0.1, roomDTO.position.z);
  } else {
    roomGroup.position.set(0, 0.1, 0);
  }

  // ✅ 房间平面：size.width / size.depth
  const width = roomDTO.size?.width ?? 10;
  const depth = roomDTO.size?.depth ?? 10;

  const roomFloorGeo = new THREE.PlaneGeometry(width, depth);
  const roomFloor = new THREE.Mesh(roomFloorGeo, materials.roomFloor.clone());
  roomFloor.rotation.x = -Math.PI / 2;
  roomFloor.receiveShadow = true;
  roomFloor.userData = {
    type: 'room',
    id: roomDTO.id,
    name: roomDTO.name,
    floor: floorNum,
    roomType: roomDTO.type
  };
  roomGroup.add(roomFloor);

  // ✅ 座位：seats 可能为空，这里用 (roomDTO.seats || [])
  (roomDTO.seats || []).forEach((seatDTO) => {
    const unitGroup = new THREE.Group();
    unitGroup.userData = {
      type: 'seat',
      // 展示用编号：roomId-S{number}
      id: `S${seatDTO.number}`,
      number: seatDTO.number,
      floor: floorNum,

      backendSeatId: seatDTO.id,
      resvSummary: seatDTO.resvSummary || [], // [{ start, end }]
      enabled: seatDTO.enabled ?? true, // ✅ 新增
      reservation: null // 前端临时预约
    };

    // ✅ 注意：你的 JSON 里 seat 用的是 x / y，
    //    原来的静态数据是 x / z，所以我们这里把你给的 y 当作 z 用
    unitGroup.position.set(seatDTO.x || 0, 0, seatDTO.y || 0);

    // --- 椅子（chairGroup） ---
    const chairGroup = new THREE.Group();
    chairGroup.userData = { subtype: 'chair' };

    const seatPadGeo = new THREE.BoxGeometry(0.7, 0.1, 0.7);
    const seatPad = new THREE.Mesh(seatPadGeo, materials.seatFree.clone());
    seatPad.position.y = 0.4;
    chairGroup.add(seatPad);

    const backRestGeo = new THREE.BoxGeometry(0.7, 0.8, 0.1);
    const backRest = new THREE.Mesh(backRestGeo, materials.seatFree.clone());
    backRest.position.set(0, 0.8, -0.3);
    chairGroup.add(backRest);

    const legGeo = new THREE.BoxGeometry(0.1, 0.4, 0.1);
    const leg1 = new THREE.Mesh(legGeo, materials.seatFree.clone());
    leg1.position.set(0.3, 0.2, 0.3);
    const leg2 = leg1.clone();
    leg2.position.x *= -1;
    const leg3 = leg1.clone();
    leg3.position.z *= -1;
    const leg4 = leg1.clone();
    leg4.position.x *= -1;
    leg4.position.z *= -1;
    chairGroup.add(leg1, leg2, leg3, leg4);

    chairGroup.traverse((c) => {
      if (c.isMesh) {
        c.castShadow = true;
        c.material = materials.seatFree.clone();
        c.material.transparent = true;
        const originOpacity = c.material.opacity;
        c.material.opacity = 0;
        // 入场淡入一下，顺便证明“确实创建了”
        gsap.to(c.material, {
          opacity: originOpacity,
          duration: 0.5,
          delay: Math.random() * 0.2
        });
      }
    });

    unitGroup.add(chairGroup);

    // --- 桌子 ---
    const tableGeo = new THREE.BoxGeometry(1.2, 0.7, 0.8);
    const table = new THREE.Mesh(tableGeo, materials.desk.clone());
    table.position.set(0, 0.35, 1.0);
    table.castShadow = true;
    table.receiveShadow = true;
    table.userData = { subtype: 'table' };
    unitGroup.add(table);


    applySeatMaterialByEnabled(unitGroup);

    roomGroup.add(unitGroup);
  });

  // ✅ 学习房：书架
  if (roomDTO.type === 'study') {
    const shelfHeight = 2.5;
    const shelfWidth = 0.5;
    const shelfDepth = depth * 0.5;
    const xOffset = width / 2 + shelfWidth / 2 + 0.3;
    const zOffset = depth / 2 - shelfDepth / 2 - 0.3;

    const leftBackShelfMat = materials.bookShelf.clone();
    const leftBackShelfGeo = new THREE.BoxGeometry(
      shelfWidth,
      shelfHeight,
      shelfDepth
    );
    const leftBackShelf = new THREE.Mesh(leftBackShelfGeo, leftBackShelfMat);
    leftBackShelf.position.set(-xOffset, shelfHeight / 2, -zOffset);
    leftBackShelf.castShadow = true;
    leftBackShelf.receiveShadow = true;
    leftBackShelf.userData = {
      type: 'bookshelf',
      side: 'left-back',
      originalOpacity: leftBackShelf.material.opacity
    };
    roomGroup.add(leftBackShelf);

    const rightFrontShelfMat = materials.bookShelf.clone();
    const rightFrontShelfGeo = new THREE.BoxGeometry(
      shelfWidth,
      shelfHeight,
      shelfDepth
    );
    const rightFrontShelf = new THREE.Mesh(
      rightFrontShelfGeo,
      rightFrontShelfMat
    );
    rightFrontShelf.position.set(xOffset, shelfHeight / 2, zOffset);
    rightFrontShelf.castShadow = true;
    rightFrontShelf.receiveShadow = true;
    rightFrontShelf.userData = {
      type: 'bookshelf',
      side: 'right-front',
      originalOpacity: rightFrontShelf.material.opacity
    };
    roomGroup.add(rightFrontShelf);
  }

  // ✅ 接待前台房间
  if (roomDTO.type === 'info') {
    const roomW = width;
    const roomD = depth;

    const counterGeo = new THREE.BoxGeometry(roomW * 0.8, 1.0, 1.2);
    const counterMat = materials.desk.clone();
    counterMat.color = new THREE.Color(0xcad7f5);
    const counter = new THREE.Mesh(counterGeo, counterMat);
    counter.position.set(0, 0.5, roomD * 0.1);
    counter.castShadow = true;
    counter.receiveShadow = true;
    counter.userData = { type: 'infoCounter' };
    roomGroup.add(counter);
    // （这里下面屏幕、牌子、柱子你原来的那段也可以照搬）
  }

  parentGroup.add(roomGroup);
};
const api = axios.create({
  baseURL: '/api',  // <<< 改成你 Spring Boot 实际地址和端口
  // withCredentials: true, // 如果有 cookie 之类的再开
});
// 然后在 fetchFloorLayout 里用这个实例：
const fetchFloorLayout = async (floorNum: number) => {
  const group = activeBuilding?.floorInteriorGroups[floorNum - 1];
  if (!group || !activeBuilding) return;

  group.clear();
  group.visible = true;

  try {
    // ✅ 你把路径改成你后端真实路径
    const res = await api.get<FloorLayoutResp>(
      `/building/${activeBuilding.id}/floor/${floorNum}/admin`
    );

    // 兼容：后端可能直接返回数组，也可能包了一层 ResponseMessage
    const rooms: RoomDTO[] = Array.isArray(res.data)
      ? res.data
      : (res.data.data ?? []);

    console.log('rooms from backend =', rooms);

    rooms.forEach(roomDTO => buildRoomFromDTO(group, roomDTO, floorNum));
  } catch (e) {
    console.error('fetchFloorLayout error:', e);
  }
};




// --- 楼层视图：显示座位 + 处理书架透明度 + 幽灵墙 ---
const showFloorInterior = (floorNum) => {
  if (!activeBuilding) return;


  activeBuilding?.floorInteriorGroups.forEach((group, index) => {
    const isTarget = index + 1 === floorNum;
    group.visible = isTarget;
    if (isTarget) {
      // 书架透明度
      group.traverse((child) => {
        if (child.userData && child.userData.type === 'bookshelf') {
          const mat = child.material;
          if (!mat) return;
          mat.transparent = true;

          if (child.userData.side === 'right-front') {
            mat.opacity = 0.15;
          } else if (child.userData.side === 'left-back') {
            mat.opacity = 0.75;
          }
          child.userData.originalOpacity = mat.opacity;
        }
      });
    }
  });

  activeBuilding?.floorShellGroups.forEach((shell, index) => {
    shell.visible = index + 1 === floorNum;
  });
};

// --- 高亮/恢复 ---
let lastHovered = null;

const setHighlightMaterial = (object, material) => {
  object.traverse((child) => {
    if (child.isMesh && child.material) {
      if (!child.userData.originalMaterialColor) {
        child.userData.originalMaterialColor = child.material.color.getHex();
      }
      child.material = material.clone();
    }
  });
};

const restoreOriginalMaterial = (object) => {
  if (object.userData && object.userData.type === 'seat') {
    applySeatMaterialByEnabled(object);
    object.traverse((child) => {
      if (
        child.isMesh &&
        child.userData &&
        child.userData.originalMaterialColor
      ) {
        delete child.userData.originalMaterialColor;
      }
    });
    return;
  }

  object.traverse((child) => {
    if (child.isMesh && child.userData.originalMaterialColor) {
      if (object.userData.type === 'floor') {
        child.material = materials.buildingWall.clone();
      }
      delete child.userData.originalMaterialColor;
    }
  });
};
const resizeByContainer = () => {
  if (!canvasContainer.value || !renderer || !camera) return;

  const { width, height } =
    canvasContainer.value.getBoundingClientRect();

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height, false);

  // 🔐 关键：这些必须判空
  if (composer) composer.setSize(width, height);
  if (outlinePass) outlinePass.setSize(width, height);
  if (smaaPass) {
    smaaPass.setSize(
      width * renderer.getPixelRatio(),
      height * renderer.getPixelRatio()
    );
  }
};


// --- 交互：鼠标移动 ---
const onMouseMove = (event: MouseEvent) => {
  if (loading.value || isModalOpen.value) return; // ✅ 加这一句
  if (!canvasRef.value) return;

  updateMouseByCanvas(event);
  raycaster.setFromCamera(mouse, camera);

  let intersects = [];
  let selectableObjects = [];
  if (viewMode.value === 'campus') {
    selectableObjects = buildings
      .map(b => b.hitBox)
      .filter(Boolean);
  }
  else if (viewMode.value === 'building') {
    selectableObjects = activeBuilding?.floorStructureMeshes|| [];
  } else if (viewMode.value === 'floor') {
    const currentFloorDetails = activeBuilding?.floorInteriorGroups[currentFloor.value - 1];
    if (currentFloorDetails) {
      currentFloorDetails.traverse((child) => {
        if (
          (child.isMesh &&
            child.parent &&
            child.parent.userData.type === 'seat') ||
          (child.isGroup && child.userData.type === 'seat') ||
          (child.isMesh && child.userData.type === 'room')
        ) {
          selectableObjects.push(child);
        }
      });
    }
  }

  intersects = raycaster.intersectObjects(selectableObjects, true);

  if (intersects.length > 0) {
    const object = intersects[0].object;
    let interactiveObject = object;
    while (
      interactiveObject &&
      !['seat', 'floor', 'room', 'building'].includes(interactiveObject.userData.type) &&
      interactiveObject.parent
      ) {
      interactiveObject = interactiveObject.parent;
    }

    if (interactiveObject && interactiveObject !== lastHovered) {
      if (lastHovered) {
        if (
          lastHovered.userData.type === 'seat' &&
          lastHovered.userData.status !== 'selected'
        ) {
          restoreOriginalMaterial(lastHovered);
        } else if (lastHovered.userData.type === 'floor') {
          lastHovered.material = materials.buildingWall.clone();
        }
      }

      if (
        interactiveObject.userData.type === 'seat' &&
        interactiveObject.userData.status !== 'selected'
      ) {
        setHighlightMaterial(interactiveObject, materials.highlight);
        selectedOutlineObjects = [interactiveObject];
      } else if (
        interactiveObject.userData.type === 'floor' &&
        viewMode.value === 'building'
      ) {
        interactiveObject.material = materials.buildingWall.clone();
        interactiveObject.material.color.setHex(0x7b90aa);
        selectedOutlineObjects = [interactiveObject];
      } else {
        selectedOutlineObjects = [];
      }
      outlinePass.selectedObjects = selectedOutlineObjects;

      lastHovered = interactiveObject;
    }

    document.body.style.cursor = 'pointer';

    if (interactiveObject.userData.type === 'floor') {
      hoverInfo.value = interactiveObject.userData.name;
    } else if (interactiveObject.userData.type === 'room') {
      hoverInfo.value = interactiveObject.userData.name;
    } else if (interactiveObject.userData.type === 'seat') {
      if (interactiveObject.userData.enabled) {
        hoverInfo.value = `${interactiveObject.userData.id}（正常）`;
      } else {
        hoverInfo.value = `${interactiveObject.userData.id}（维修中）`;
      }
    }else if (interactiveObject.userData.type === 'building') {
      const b = buildings.find(x => x.id === interactiveObject.userData.buildingId);
      hoverInfo.value = b ? `进入：${b.name}` : '进入建筑';
    }

    tooltipStyle.left = event.clientX + 15 + 'px';
    tooltipStyle.top = event.clientY + 15 + 'px';
  } else {
    if (lastHovered) {
      if (
        lastHovered.userData.type === 'seat' &&
        lastHovered.userData.status !== 'selected'
      ) {
        restoreOriginalMaterial(lastHovered);
      } else if (lastHovered.userData.type === 'floor') {
        lastHovered.material = materials.buildingWall.clone();
      }
      lastHovered = null;
    }
    selectedOutlineObjects = [];
    outlinePass.selectedObjects = selectedOutlineObjects;
    document.body.style.cursor = 'default';
    hoverInfo.value = '';
  }
};
const updateMouseByCanvas = (event: MouseEvent) => {
  const canvas = canvasRef.value as HTMLCanvasElement | null;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
};

// --- 点击 ---
const onMouseClick = (event: MouseEvent) => {
  if (loading.value || isModalOpen.value) return; // ✅ 加这一句
  if (!canvasRef.value) return;

  const rect = canvasRef.value.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  let intersects: THREE.Intersection[] = [];

  // ✅ 这里必须是 if / else if / else if
  if (viewMode.value === 'campus') {
    const objs = buildings.map(b => b.hitBox).filter(Boolean) as THREE.Object3D[];
    intersects = raycaster.intersectObjects(objs, true);
  }
  else if (viewMode.value === 'building') {
    intersects = raycaster.intersectObjects(activeBuilding?.floorStructureMeshes || [], true);
  }
  else if (viewMode.value === 'floor') {
    const currentFloorGroup = activeBuilding?.floorInteriorGroups[currentFloor.value - 1];
    if (!currentFloorGroup) return;

    const seatObjects: THREE.Object3D[] = [];
    currentFloorGroup.traverse(obj => {
      if (obj.userData?.type === 'seat') seatObjects.push(obj);
    });

    intersects = raycaster.intersectObjects(seatObjects, true);
  }

  if (intersects.length === 0) return;

  // ✅ 支持 building
  let target: THREE.Object3D | null = intersects[0].object;
  while (
    target &&
    !['seat', 'floor', 'building'].includes(target.userData?.type) &&
    target.parent
    ) {
    target = target.parent;
  }
  if (!target) return;

  // Campus：进入建筑
  if (viewMode.value === 'campus' && target.userData?.type === 'building') {
    const building = buildings.find(b => b.id === target.userData.buildingId);
    if (building) enterBuildingView(building);
    return;
  }

  // Building：进入楼层
  if (viewMode.value === 'building' && target.userData?.type === 'floor') {
    enterFloorView(target.userData.floorNumber);
    return;
  }

  // Floor：座位管理
  if (viewMode.value === 'floor' && target.userData?.type === 'seat') {
    handleSeatClick(target);
  }
};



// --- 进入楼层视图 ---
const enterFloorView = (floorNum) => {
  viewMode.value = 'floor';
  // ✅ 兜底：防止某些路径没走 enterBuildingView
  if (activeBuilding) totalFloors.value = activeBuilding.floors;
  currentFloor.value = floorNum;
  freezeTooltip.value = true;
  selectedOutlineObjects = [];
  outlinePass.selectedObjects = selectedOutlineObjects;

  if (activeBuilding && activeBuilding.roofMesh) {
    activeBuilding.roofMesh.visible = false;
  }
  if (envGroup) envGroup.visible = false;

  const center = getActiveBuildingCenter();

  const targetFloorYBase = (floorNum - 1) * FLOOR_LEVEL_HEIGHT;

  const offset = Math.max(activeBuilding?.width ?? DEFAULT_WIDTH, activeBuilding?.depth ?? DEFAULT_DEPTH) * 0.7;



// ✅ 看向该建筑的楼层中心（不是世界原点）
  const targetCameraPos = new THREE.Vector3(
    center.x + offset,
    targetFloorYBase + FLOOR_LEVEL_HEIGHT * 1.8,
    center.z + offset
  );
  const targetLookAt = new THREE.Vector3(
    center.x,
    targetFloorYBase + FLOOR_LEVEL_HEIGHT / 2,
    center.z
  );




  activeBuilding?.floorStructureMeshes.forEach((mesh) => {
    if (mesh.userData.floorNumber === floorNum) {
      gsap.to(mesh.material, { opacity: 0.1, duration: 1.5 });
    } else {
      gsap.to(mesh.position, {
        y: mesh.userData.originalY + 50,
        duration: 1.5,
        ease: 'power2.inOut'
      });
      gsap.to(mesh.material, { opacity: 0, duration: 1.5 });
    }
  });

  if (controls) controls.enabled = false;

  const tl = gsap.timeline({
    defaults: { duration: 1.8, ease: 'power2.inOut' },
    onComplete: async () => {
      activeBuilding?.floorStructureMeshes.forEach((m) => {
        m.visible = false;
      });

      await fetchFloorLayout(floorNum); // 先根据后端构建布局
      showFloorInterior(floorNum); // 再控制可见性 & 书架透明
      freezeTooltip.value = false;

      if (controls) {
        controls.target.copy(targetLookAt);
        controls.enabled = true;
        controls.update();
      }
    }
  });

  tl.to(
    camera.position,
    {
      x: targetCameraPos.x,
      y: targetFloorYBase + FLOOR_LEVEL_HEIGHT * 1.8,
      z: targetCameraPos.z,
      onUpdate: () => camera.lookAt(targetLookAt)
    },
    0
  );
};

// --- 楼层切换（左侧按钮） ---
const selectFloor = (floorNum) => {
  if (currentFloor.value === floorNum) return;

  freezeTooltip.value = true;
  selectedOutlineObjects = [];
  outlinePass.selectedObjects = selectedOutlineObjects;

  const prevFloorGroup = activeBuilding?.floorInteriorGroups[currentFloor.value - 1];
  if (prevFloorGroup) {
    prevFloorGroup.visible = false;
  }

  if (activeBuilding && activeBuilding.roofMesh) {
    activeBuilding.roofMesh.visible = false;
  }
  if (envGroup) envGroup.visible = false;

  currentFloor.value = floorNum;

  const center = getActiveBuildingCenter();

  const targetFloorYBase = (floorNum - 1) * FLOOR_LEVEL_HEIGHT;
  const offset = Math.max(activeBuilding?.width ?? DEFAULT_WIDTH, activeBuilding?.depth ?? DEFAULT_DEPTH) * 0.7;

  const targetCameraPos = new THREE.Vector3(
    center.x + offset * 0.7,
    targetFloorYBase + FLOOR_LEVEL_HEIGHT * 1.8,
    center.z + offset * 0.7
  );

  const targetLookAt = new THREE.Vector3(
    center.x,
    targetFloorYBase + FLOOR_LEVEL_HEIGHT / 2,
    center.z
  );


  if (controls) controls.enabled = false;

  const tl = gsap.timeline({
    defaults: { duration: 1.2, ease: 'power1.inOut' },
    onComplete: async () => {
      await fetchFloorLayout(floorNum);
      showFloorInterior(floorNum);
      freezeTooltip.value = false;

      if (controls) {
        controls.target.copy(targetLookAt);
        controls.enabled = true;
        controls.update();
      }
    }
  });

  tl.to(
    camera.position,
    {
      x: targetCameraPos.x,
      y: targetFloorYBase + FLOOR_LEVEL_HEIGHT * 1.8,
      z: targetCameraPos.z,
      onUpdate: () => camera.lookAt(targetLookAt)
    },
    0
  );
};

const syncCampusVisibility = () => {
  buildings.forEach(b => {
    b.rootGroup.visible = viewMode.value === 'campus';
  });
};


// --- 返回建筑视图 ---
const resetView = () => {
  viewMode.value = 'campus';
  currentFloor.value = 1;
  totalFloors.value = 0; // ✅ 清掉
  activeBuilding = null;

  freezeTooltip.value = true;

  selectedOutlineObjects = [];
  outlinePass.selectedObjects = [];

  // 还原所有建筑（现在只有 activeBuilding）
  buildings.forEach((b) => {
    // ⭐⭐ 核心修复 ⭐⭐
    b.rootGroup.visible = true;

    b.floorInteriorGroups.forEach((group) => (group.visible = false));
    b.floorShellGroups.forEach((shell) => (shell.visible = false));

    b.floorStructureMeshes.forEach((mesh) => {
      mesh.visible = true;

      if (mesh.userData.originalY !== undefined) {
        mesh.position.y = mesh.userData.originalY;
      }

      gsap.to(mesh.material, { opacity: 0.95, duration: 1.0 });
    });

    if (b.roofMesh) b.roofMesh.visible = true;
  });


  if (envGroup) envGroup.visible = true;

  freezeTooltip.value = true;

// ⭐ 用统一的平滑返回
  flyCameraToCampus();

// tooltip 解冻稍微延后，配合动画
  setTimeout(() => {
    freezeTooltip.value = false;
  }, 800);

};



const flyCameraToBuilding = (
  building: BuildingInstance,
  options?: {
    distance?: number;
    height?: number;
    duration?: number;
  }
) => {
  if (!controls) return;

  const distance = options?.distance ?? 55;
  const height = options?.height ?? 45;
  const duration = options?.duration ?? 1.8;

  // 建筑中心
  const center = new THREE.Vector3();
  building.rootGroup.getWorldPosition(center);

  // 相机最终位置（对角）
  const targetCameraPos = new THREE.Vector3(
    center.x + distance,
    center.y + height,
    center.z + distance
  );

  // 最终注视点
  const targetLookAt = new THREE.Vector3(
    center.x,
    center.y + 5,
    center.z
  );

  // 当前状态（作为动画起点）
  const startPos = camera.position.clone();
  const startTarget = controls.target.clone();

  controls.enabled = false;

  const progress = { t: 0 };

  gsap.to(progress, {
    t: 1,
    duration,
    ease: 'power3.inOut', // ⭐ 更柔和
    onUpdate: () => {
      // 平滑插值位置
      camera.position.lerpVectors(startPos, targetCameraPos, progress.t);

      // 平滑插值视线
      controls.target.lerpVectors(startTarget, targetLookAt, progress.t);

      controls.update();
    },
    onComplete: () => {
      camera.position.copy(targetCameraPos);
      controls.target.copy(targetLookAt);
      controls.enabled = true;
      controls.update();
    }
  });
};



const flyCameraToCampus = () => {
  if (!controls) return;

  // 🎯 campus 的目标视角
  const targetCameraPos = new THREE.Vector3(90, 70, 90);
  const targetLookAt = new THREE.Vector3(0, 5, 0);

  const startPos = camera.position.clone();
  const startTarget = controls.target.clone();

  controls.enabled = false;

  const progress = { t: 0 };

  gsap.to(progress, {
    t: 1,
    duration: 1.8,
    ease: 'power3.inOut',
    onUpdate: () => {
      camera.position.lerpVectors(startPos, targetCameraPos, progress.t);
      controls.target.lerpVectors(startTarget, targetLookAt, progress.t);
      controls.update();
    },
    onComplete: () => {
      camera.position.copy(targetCameraPos);
      controls.target.copy(targetLookAt);
      controls.enabled = true;
      controls.update();
    }
  });
};


// --- 座位点击：暂时仍使用你原来的本地预约逻辑 ---
const handleSeatClick = (seat) => {


  adminSeat.value = seat;
  showSeatAdminModal.value = true;
};


const enterBuildingView = (building: BuildingInstance) => {
  activeBuilding = building;
  totalFloors.value = building.floors; // ✅ 关键：更新楼层按钮数量

  viewMode.value = 'building';
  freezeTooltip.value = true;
  selectedOutlineObjects = [];
  outlinePass.selectedObjects = [];

  buildings.forEach((b) => {
    b.rootGroup.visible = b === building;
  });

  flyCameraToBuilding(building);
};




// --- 渲染循环 & 事件 ---
const animate = () => {
  animationId = requestAnimationFrame(animate);
  if (controls) controls.update();
  composer.render();
};

const handleResize = () => {
  resizeByContainer();
  if (controls) controls.update();
};

// 初始化日期选项（今/明/后天）
const initDateAndTimeOptions = () => {
  const today = new Date();
  const opts = [];

  for (let i = 0; i < 3; i++) {
    const d = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const value = `${y}-${m}-${dd}`;
    let labelPrefix = '';
    if (i === 0) labelPrefix = '今天';
    else if (i === 1) labelPrefix = '明天';
    else labelPrefix = '后天';
    opts.push({
      value,
      label: `${labelPrefix} ${value}`
    });
  }

  dateOptions.value = opts;
  timeFilter.date = opts[0].value;
};

// 从 08:00 到 22:00 每 30 分钟一个 slot
const initTimeSlots = () => {
  const slots = [];
  let h = 8;
  let m = 0;
  while (h < 22 || (h === 22 && m === 0)) {
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    slots.push(`${hh}:${mm}`);
    m += 30;
    if (m >= 60) {
      m = 0;
      h++;
    }
  }
  timeSlots.value = slots;
};

// 初始化默认筛选时间
const initDefaultTimeFilter = () => {
  const now = new Date();
  const hh = now.getHours();
  const mm = now.getMinutes();
  nowTimeLabel.value = `${String(hh).padStart(2, '0')}:${String(mm).padStart(
    2,
    '0'
  )}`;

  const slots = timeSlots.value;
  if (!slots.length) return;

  const nowMin = hh * 60 + mm;
  let startSlot = slots[0];
  for (const t of slots) {
    const tm = parseTimeStr(t);
    if (tm >= nowMin) {
      startSlot = t;
      break;
    }
  }

  timeFilter.start = startSlot;

  const idx = slots.indexOf(startSlot);
  const endIdx = Math.min(idx + 2, slots.length - 1); // 默认 +1 小时
  timeFilter.end = slots[endIdx];
};

const confirmDeleteBuilding = async () => {
  if (!activeBuilding) return;

  const ok = window.confirm(
    `确认删除建筑「${activeBuilding.name}」？\n\n⚠️ 该操作将删除该建筑下所有楼层、房间和座位，且不可恢复。`
  );
  if (!ok) return;

  try {
    await api.delete(`/building/${activeBuilding.id}`);

    // 从 Three.js 场景移除
    scene.remove(activeBuilding.rootGroup);

    // 从本地数组移除
    const idx = buildings.findIndex(b => b.id === activeBuilding!.id);
    if (idx !== -1) buildings.splice(idx, 1);

    activeBuilding = null;

    // 回到 campus 视图
    resetView();

  } catch (e) {
    console.error('delete building failed:', e);
    alert('删除失败，请查看后端日志');
  }
};


// 时间筛选变化时：重新从后端拉取当前楼层布局
const applyTimeFilter = async () => {
  const startM = parseTimeStr(timeFilter.start);
  let endM = parseTimeStr(timeFilter.end);
  const lastM = 22 * 60;

  if (endM == null || endM > lastM) {
    timeFilter.end = '22:00';
    endM = lastM;
  }
  if (startM != null && endM != null && endM <= startM) {
    const idx = timeSlots.value.indexOf(timeFilter.start);
    const nextIdx = Math.min(idx + 1, timeSlots.value.length - 1);
    timeFilter.end = timeSlots.value[nextIdx];
  }

  if (viewMode.value === 'floor') {
    await fetchFloorLayout(currentFloor.value);
  }
};

onMounted(async ()  => {
  // ======================
  // 时间 & UI 初始化
  // ======================
  initDateAndTimeOptions();
  initTimeSlots();
  initDefaultTimeFilter();

  // ======================
  // Three.js 场景初始化
  // ======================
  initScene();


  // ======================
  // 环境
  // ======================
  createEnvironment();

  // ======================
  // 渲染循环
  // ======================
  animate();
  await loadBuildingsFromBackend();
  activeBuilding = null;
  // ======================
  // 事件监听
  // ======================
  window.addEventListener('resize', handleResize);
  window.addEventListener('click', onMouseClick);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('keydown', handleGhostKeyMove);
});


onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('click', onMouseClick);
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('keydown', handleGhostKeyMove);
  if (animationId) cancelAnimationFrame(animationId);
  controls?.dispose();
  renderer?.dispose();
  composer?.dispose();
});


</script>

<style scoped lang="scss">
.scene-container {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: radial-gradient(
      circle at 50% 20%,
      #f8fbff,
      #dce9f7 60%,
      #c9d8ef 100%
  );
}

canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #9fb5d5, #c3d5f1);
  color: #f9fbff;
  z-index: 10;

  .spinner {
    width: 60px;
    height: 60px;
    border: 8px solid rgba(255, 255, 255, 0.4);
    border-top: 8px solid #7ea7ff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }

  p {
    font-size: 1rem;
    letter-spacing: 1px;
  }
}

.ui-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  padding: 20px;
  display: flex;
  flex-direction: column;
  z-index: 5;
  color: #1f2933;

  &.ui-hidden {
    opacity: 0;
  }

  .back-btn {
    pointer-events: auto;
    margin-top: 16px;
    align-self: flex-start;
    border: none;
    outline: none;
    cursor: pointer;
    border-radius: 999px;
    padding: 8px 16px;
    font-size: 0.9rem;
    background: linear-gradient(135deg, #60a5fa, #93c5fd);
    color: #f9fbff;
    box-shadow: 0 6px 18px rgba(37, 99, 235, 0.35);
    transition: all 0.2s ease;

    &:hover {
      transform: translateY(-3px) scale(1.02);
      box-shadow: 0 10px 24px rgba(37, 99, 235, 0.4);
    }
  }

  .time-filter-panel {
    pointer-events: auto;
    position: absolute;
    left: 20px;
    top: 90px;
    width: 260px;
    padding: 12px 14px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.88);
    border: 1px solid rgba(209, 224, 255, 0.9);
    backdrop-filter: blur(12px);
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.2);
    font-size: 0.85rem;

    h3 {
      margin: 0 0 6px;
      font-size: 0.98rem;
      color: #1f2937;
    }

    .current-time {
      margin: 0 0 10px;
      color: #4b5563;
    }

    .filter-row {
      display: flex;
      flex-direction: column;
      margin-bottom: 8px;

      label {
        font-size: 0.78rem;
        color: #6b7280;
        margin-bottom: 3px;
      }

      input,
      select {
        padding: 5px 8px;
        border-radius: 8px;
        border: 1px solid #d1d5db;
        font-size: 0.86rem;
        outline: none;
        background: #ffffff;

        &:focus {
          border-color: #60a5fa;
          box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.35);
        }
      }
    }

    .hint {
      font-size: 0.78rem;
      color: #6b7280;
      line-height: 1.4;

      .tag {
        display: inline-block;
        padding: 1px 6px;
        border-radius: 999px;
        font-size: 0.75rem;
        margin: 0 2px;
      }

      .tag-partial {
        background: #fff7cc;
        color: #92400e;
      }

      .tag-occupied {
        background: #fee2e2;
        color: #b91c1c;
      }
    }
  }

  .floor-selector {
    pointer-events: auto;
    position: absolute;
    left: 20px;
    top: calc(90px + 350px);
    width: 260px;
    padding: 10px 14px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.85);
    border: 1px solid rgba(209, 224, 255, 0.9);
    backdrop-filter: blur(12px);
    box-shadow: 0 6px 18px rgba(15, 23, 42, 0.12);

    display: flex;
    flex-wrap: wrap;          /* ⭐ 允许换行 */
    align-items: center;
    gap: 8px;


  .floor-label {
      font-size: 0.85rem;
      color: #374151;
      margin-right: 6px;
      white-space: nowrap;
    }

    button {
      border: none;
      outline: none;
      cursor: pointer;
      border-radius: 999px;
      padding: 6px 10px;
      font-size: 0.85rem;
      background: rgba(255, 255, 255, 0.9);
      color: #4b5563;
      transition: all 0.15s ease;

      &:hover {
        background: #e5efff;
      }

      &.active {
        background: #60a5fa;
        color: #f9fbff;
        box-shadow: 0 3px 10px rgba(37, 99, 235, 0.35);
      }
    }
  }

  .legend {
    pointer-events: auto;
    align-self: flex-end;
    margin-top: auto;
    padding: 10px 14px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(215, 226, 255, 0.9);
    backdrop-filter: blur(12px);
    display: flex;
    flex-direction: column;
    gap: 6px;
    box-shadow: 0 6px 18px rgba(15, 23, 42, 0.12);

    .item {
      display: flex;
      align-items: center;
      font-size: 0.9rem;
      color: #1f2933;

      .dot {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        margin-right: 6px;

        &.free {
          background: #7ec4b8;
        }
        &.disabled {
          background: #9ca3af; // 灰色：维修中
        }
      }
    }
  }
}

.tooltip {
  position: fixed;
  z-index: 20;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.8);
  color: #f9fafb;
  font-size: 0.9rem;
  pointer-events: none;
  transform: translate3d(0, 0, 0);
  white-space: nowrap;
}

.reservation-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.reservation-dialog {
  width: 320px;
  max-width: 90vw;
  background: #f9fbff;
  border-radius: 16px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.35);
  padding: 18px 20px 16px;
  animation: fadeInUp 0.2s ease-out;

  h2 {
    margin: 0 0 8px;
    font-size: 1.1rem;
    color: #1f2937;
  }

  .seat-label {
    margin: 0 0 12px;
    font-size: 0.9rem;
    color: #4b5563;

    strong {
      color: #2563eb;
    }
  }

  .form-row {
    display: flex;
    flex-direction: column;
    margin-bottom: 10px;

    label {
      font-size: 0.8rem;
      color: #6b7280;
      margin-bottom: 4px;
    }

    input,
    select {
      padding: 6px 8px;
      border-radius: 8px;
      border: 1px solid #d1d5db;
      font-size: 0.9rem;
      outline: none;
      background: #ffffff;

      &:focus {
        border-color: #60a5fa;
        box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.35);
      }
    }
  }

  .time-row {
    flex-direction: row;
    gap: 8px;

    > div {
      flex: 1;
    }
  }

  .dialog-actions {
    margin-top: 6px;
    display: flex;
    justify-content: flex-end;
    gap: 8px;

    button {
      border-radius: 999px;
      padding: 6px 12px;
      font-size: 0.85rem;
      border: none;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-cancel {
      background: #e5e7eb;
      color: #374151;

      &:hover {
        background: #d1d5db;
      }
    }

    .btn-confirm {
      background: linear-gradient(135deg, #3b82f6, #60a5fa);
      color: #f9fafb;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 7px 16px rgba(37, 99, 235, 0.45);
      }
    }
  }
}


.canvas-disabled {
  pointer-events: none; // ✅ 弹窗打开时，canvas 完全不吃鼠标
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translate3d(0, 12px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}
/* 时间条样式 */
.time-bar-container {
  margin-bottom: 20px;
  padding: 15px;
  background: rgba(249, 251, 255, 0.9);
  border-radius: 10px;
  border: 1px solid #e5e7eb;
}

.time-bar-title {
  margin: 0 0 10px 0;
  font-size: 0.9rem;
  color: #4b5563;
  font-weight: 600;
}

.time-bar {
  position: relative;
  height: 60px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  margin-bottom: 8px;
}

.time-ticks {
  display: flex;
  justify-content: space-between;
  padding: 5px 0;
  border-bottom: 1px solid #e2e8f0;
  background: rgba(255, 255, 255, 0.8);
}

.time-tick {
  font-size: 0.7rem;
  color: #64748b;
  position: relative;
  transform: translateX(-50%);
}

.time-tick:first-child {
  transform: translateX(0);
}

.time-tick:last-child {
  transform: translateX(-100%);
}

.time-bar-slots {
  position: absolute;
  top: 25px;
  left: 0;
  right: 0;
  bottom: 0;
}

.time-slot {
  position: absolute;
  height: 30px;
  border-radius: 4px;
  transition: all 0.2s ease;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 500;
}

.time-slot.free {
  background: linear-gradient(135deg, #86efac, #4ade80);
  border: 1px solid #22c55e;
}

.time-slot.occupied {
  background: linear-gradient(135deg, #fca5a5, #ef4444);
  border: 1px solid #dc2626;
}

.time-slot.selected {
  background: linear-gradient(135deg, #93c5fd, #3b82f6);
  border: 1px solid #2563eb;
  z-index: 2;
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.4);
}

.time-slot:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

/* 用户选择指示器 */
.user-selection-indicator {
  position: absolute;
  top: 0;
  height: 100%;
  background: rgba(59, 130, 246, 0.15);
  border: 2px dashed #3b82f6;
  border-radius: 4px;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.selection-label {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  background: #3b82f6;
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  white-space: nowrap;
}

.selection-label::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 5px solid #3b82f6;
}

/* 时间条图例 */
.time-bar-legend {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-top: 10px;
}

.legend-item {
  display: flex;
  align-items: center;
  font-size: 0.8rem;
  color: #4b5563;
}


.back-btn.danger {
  background: linear-gradient(135deg, #ef4444, #f87171);
  box-shadow: 0 6px 18px rgba(220, 38, 38, 0.4);
}

.back-btn.danger:hover {
  box-shadow: 0 10px 24px rgba(220, 38, 38, 0.55);
}

.color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-right: 6px;
  display: inline-block;
}

.color-dot.free {
  background: linear-gradient(135deg, #86efac, #4ade80);
}

.color-dot.occupied {
  background: linear-gradient(135deg, #fca5a5, #ef4444);
}

.color-dot.selected {
  background: linear-gradient(135deg, #93c5fd, #3b82f6);
}

/* 弹窗宽度调整 */
.reservation-dialog {
  width: 500px; /* 增加宽度以容纳时间条 */
  max-width: 90vw;
}

/* 响应式调整 */
@media (max-width: 600px) {
  .time-bar {
    height: 50px;
  }

  .time-tick {
    font-size: 0.6rem;
  }

  .time-slot {
    height: 25px;
    font-size: 0.6rem;
  }

  .time-bar-legend {
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
}

.placement-panel {
  pointer-events: auto;
  width: 240px;
  padding: 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(14px);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.25);
  border: 1px solid rgba(200, 220, 255, 0.9);

  .panel-header {
    font-size: 0.95rem;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 10px;
  }

  .panel-body {
    .pos-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
      font-size: 0.85rem;

      span {
        color: #6b7280;
      }

      strong {
        color: #2563eb;
        font-weight: 600;
      }
    }

    .hint {
      margin-top: 8px;
      font-size: 0.75rem;
      color: #6b7280;
    }
  }

  .panel-actions {
    margin-top: 12px;
    display: flex;
    justify-content: space-between;
    gap: 8px;

    button {
      flex: 1;
      border: none;
      border-radius: 999px;
      padding: 6px 0;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-cancel {
      background: #e5e7eb;
      color: #374151;

      &:hover {
        background: #d1d5db;
      }
    }

    .btn-confirm {
      background: linear-gradient(135deg, #3b82f6, #60a5fa);
      color: #f9fafb;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 7px 18px rgba(37, 99, 235, 0.45);
      }
    }
  }
}

</style>
