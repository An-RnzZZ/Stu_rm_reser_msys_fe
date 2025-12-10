<template>
  <div class="scene-container" ref="canvasContainer">
    <canvas ref="canvasRef"></canvas>

    <!-- 加载进度条 -->
    <div v-if="loading" class="loading-overlay">
      <div class="spinner"></div>
      <p>正在生成图书馆场景...</p>
    </div>

    <!-- 悬浮 UI -->
    <div class="ui-overlay" :class="{ 'ui-hidden': loading }">
      <!-- 返回建筑概览 -->
      <transition name="fade">
        <button
          v-if="viewMode !== 'building'"
          @click="resetView"
          class="back-btn"
        >
          ← 返回建筑概览
        </button>
      </transition>

      <!-- 左侧：楼层时间筛选面板（只在楼层视图显示） -->
      <transition name="fade">
        <div v-if="viewMode === 'floor'" class="time-filter-panel">
          <h3>座位时间筛选</h3>
          <p class="current-time">当前时间：{{ nowTimeLabel }}</p>

          <div class="filter-row">
            <label>日期</label>
            <select v-model="timeFilter.date" @change="applyTimeFilter">
              <option v-for="d in dateOptions" :key="d.value" :value="d.value">
                {{ d.label }}
              </option>
            </select>
          </div>

          <div class="filter-row">
            <label>开始时间（默认当前）</label>
            <select v-model="timeFilter.start" @change="applyTimeFilter">
              <option v-for="t in timeSlots" :key="t" :value="t">
                {{ t }}
              </option>
            </select>
          </div>

          <div class="filter-row">
            <label>结束时间（最晚 22:00）</label>
            <select v-model="timeFilter.end" @change="applyTimeFilter">
              <option v-for="t in timeSlots" :key="t" :value="t">
                {{ t }}
              </option>
            </select>
          </div>

          <p class="hint">
            · 座位在当前时间段内<br />
            · 预约结束时间 ≤ 所选结束时间 → 显示
            <span class="tag tag-partial">半空闲</span><br />
            · 预约结束时间 &gt; 所选结束时间 → 显示
            <span class="tag tag-occupied">占用</span>
          </p>
        </div>
      </transition>

      <!-- 楼层选择 -->
      <transition name="fade">
        <div class="floor-selector" v-if="viewMode === 'floor'">
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

      <!-- 图例 -->
      <div class="legend" v-if="viewMode === 'floor'">
        <div class="item"><span class="dot free"></span>空闲</div>
        <div class="item"><span class="dot partial"></span>半空闲</div>
        <div class="item"><span class="dot occupied"></span>占用</div>
        <div class="item"><span class="dot selected"></span>您的选择</div>
      </div>
    </div>

    <!-- 座位 Tooltip -->
    <div
      class="tooltip"
      ref="tooltipRef"
      :style="tooltipStyle"
      v-show="hoverInfo && !freezeTooltip"
    >
      {{ hoverInfo }}
    </div>

    <!-- 预约弹窗（点击可预约座位时） -->
    <div v-if="showReservationModal" class="reservation-overlay">
      <div class="reservation-dialog">
        <h2>预约座位</h2>
        <p class="seat-label">
          当前座位：<strong>{{ reservationSeatId }}</strong>
        </p>

        <div class="form-row">
          <label>日期</label>
          <select v-model="reservationForm.date">
            <option v-for="d in dateOptions" :key="d.value" :value="d.value">
              {{ d.label }}
            </option>
          </select>
        </div>

        <div class="form-row time-row">
          <div>
            <label>开始时间</label>
            <select v-model="reservationForm.start">
              <option v-for="t in timeSlots" :key="'start-' + t" :value="t">
                {{ t }}
              </option>
            </select>
          </div>
          <div>
            <label>结束时间（最晚 22:00）</label>
            <select v-model="reservationForm.end">
              <option v-for="t in timeSlots" :key="'end-' + t" :value="t">
                {{ t }}
              </option>
            </select>
          </div>
        </div>

        <div class="dialog-actions">
          <button class="btn-cancel" @click="cancelReservation">取消</button>
          <button class="btn-confirm" @click="confirmReservation">
            确认预约
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, reactive } from 'vue';
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
const canvasRef = ref(null);
const canvasContainer = ref(null);
const viewMode = ref('building');
const currentFloor = ref(1);
const totalFloors = 3;

const hoverInfo = ref('');
const tooltipRef = ref(null);
const tooltipStyle = reactive({ top: '0px', left: '0px' });
const freezeTooltip = ref(true);

const loading = ref(true);

// 预约弹窗状态（保留前端本地逻辑）
const showReservationModal = ref(false);
const selectedSeat = ref(null); // Three 对象
const reservationSeatId = ref(''); // 座位编号
const reservationForm = reactive({
  date: '',
  start: '',
  end: ''
});

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
let buildingRootGroup;
let floorStructureMeshes = []; // 建筑主体盒子
let floorInteriorGroups = []; // 每层内部组（内容由后端动态生成）
let floorShellGroups = []; // 每层“幽灵墙”轮廓
let roofMesh = null; // 屋顶
let envGroup = null; // 环境（马路、树等）
let animationId;

// 后处理
let composer;
let smaaPass, outlinePass;
let selectedOutlineObjects = [];

// 轨道控制器
let controls;

const FLOOR_LEVEL_HEIGHT = 4.0;
const libraryWidth = 40;

// 工具：解析 "HH:MM" 为分钟数
const parseTimeStr = (str) => {
  if (!str || typeof str !== 'string' || !str.includes(':')) return null;
  const [h, m] = str.split(':').map((v) => parseInt(v, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
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
  seatOccupied: new THREE.MeshStandardMaterial({
    color: 0xf28b82,
    roughness: 0.55,
    metalness: 0.08
  }),
  seatPartial: new THREE.MeshStandardMaterial({
    color: 0xffe9a7,
    roughness: 0.55,
    metalness: 0.08
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
  camera.position.set(55, 45, 55);
  camera.lookAt(0, 5, 0);

  renderer = new THREE.WebGLRenderer({
    canvas: canvasRef.value,
    antialias: true,
    alpha: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
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
  controls.maxDistance = 120;
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

// --- 建筑 + 幽灵墙（外壳仍然是静态 3 层，内部动态） ---
const createBuilding = () => {
  buildingRootGroup = new THREE.Group();
  scene.add(buildingRootGroup);

  const groundGeo = new THREE.PlaneGeometry(90, 90);
  const ground = new THREE.Mesh(groundGeo, materials.ground);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.position.y = -0.01;
  buildingRootGroup.add(ground);

  for (let i = 0; i < totalFloors; i++) {
    const floorY = i * FLOOR_LEVEL_HEIGHT + FLOOR_LEVEL_HEIGHT / 2;
    const floorSizeXY = libraryWidth * 0.9 - i * 0.5;

    const wallGeo = new THREE.BoxGeometry(
      floorSizeXY,
      FLOOR_LEVEL_HEIGHT,
      floorSizeXY
    );
    const floorMesh = new THREE.Mesh(wallGeo, materials.buildingWall.clone());
    floorMesh.position.y = floorY;
    floorMesh.castShadow = true;
    floorMesh.receiveShadow = true;
    floorMesh.userData = {
      type: 'floor',
      floorNumber: i + 1,
      name: `图书馆${i + 1}层`
    };
    buildingRootGroup.add(floorMesh);
    floorStructureMeshes.push(floorMesh);

    const windowPaneGeo = new THREE.BoxGeometry(
      floorSizeXY * 0.7,
      FLOOR_LEVEL_HEIGHT * 0.6,
      0.1
    );
    const window1 = new THREE.Mesh(windowPaneGeo, materials.buildingWindow);
    window1.position.set(0, floorY, floorSizeXY / 2 + 0.05);
    const window2 = window1.clone();
    window2.position.z *= -1;
    const window3 = new THREE.Mesh(
      new THREE.BoxGeometry(
        0.1,
        FLOOR_LEVEL_HEIGHT * 0.6,
        floorSizeXY * 0.7
      ),
      materials.buildingWindow
    );
    window3.position.set(floorSizeXY / 2 + 0.05, floorY, 0);
    const window4 = window3.clone();
    window4.position.x *= -1;

    buildingRootGroup.add(window1, window2, window3, window4);

    // 幽灵墙
    const shellGroup = new THREE.Group();
    shellGroup.name = `Floor_${i + 1}_Shell`;
    shellGroup.visible = false;
    const ghostMatBase = materials.ghostWall;

    const frontWall = new THREE.Mesh(
      new THREE.PlaneGeometry(floorSizeXY, FLOOR_LEVEL_HEIGHT),
      ghostMatBase.clone()
    );
    frontWall.position.set(0, floorY, floorSizeXY / 2 + 0.01);
    frontWall.userData = { type: 'ghostWall', side: 'front' };
    shellGroup.add(frontWall);

    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(floorSizeXY, FLOOR_LEVEL_HEIGHT),
      ghostMatBase.clone()
    );
    backWall.position.set(0, floorY, -floorSizeXY / 2 - 0.01);
    backWall.rotation.y = Math.PI;
    backWall.userData = { type: 'ghostWall', side: 'back' };
    shellGroup.add(backWall);

    const rightWall = new THREE.Mesh(
      new THREE.PlaneGeometry(floorSizeXY, FLOOR_LEVEL_HEIGHT),
      ghostMatBase.clone()
    );
    rightWall.position.set(floorSizeXY / 2 + 0.01, floorY, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.userData = { type: 'ghostWall', side: 'right' };
    rightWall.material.opacity = 0.06; // 右侧更虚
    shellGroup.add(rightWall);

    const leftWall = new THREE.Mesh(
      new THREE.PlaneGeometry(floorSizeXY, FLOOR_LEVEL_HEIGHT),
      ghostMatBase.clone()
    );
    leftWall.position.set(-floorSizeXY / 2 - 0.01, floorY, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.userData = { type: 'ghostWall', side: 'left' };
    shellGroup.add(leftWall);

    scene.add(shellGroup);
    floorShellGroups.push(shellGroup);
  }

  const roofBaseSize = libraryWidth * 0.9 - (totalFloors - 1) * 0.5;
  const roofGeo = new THREE.BoxGeometry(roofBaseSize + 0.3, 0.4, roofBaseSize + 0.3);
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x60748e,
    roughness: 0.6,
    metalness: 0.1
  });
  roofMesh = new THREE.Mesh(roofGeo, roofMat);
  roofMesh.position.y = totalFloors * FLOOR_LEVEL_HEIGHT + 0.2;
  roofMesh.castShadow = true;
  roofMesh.receiveShadow = true;
  buildingRootGroup.add(roofMesh);
};

// --- 环境 ---
const createEnvironment = () => {
  envGroup = new THREE.Group();
  envGroup.name = 'Environment';
  scene.add(envGroup);

  const roadGeo = new THREE.PlaneGeometry(90, 12);
  const road = new THREE.Mesh(roadGeo, materials.road);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.001, libraryWidth + 10);
  road.receiveShadow = true;
  envGroup.add(road);

  const lineGeo = new THREE.PlaneGeometry(70, 0.35);
  const line = new THREE.Mesh(lineGeo, materials.roadLine);
  line.rotation.x = -Math.PI / 2;
  line.position.set(0, 0.002, libraryWidth + 10);
  envGroup.add(line);

  const sidewalkGeo = new THREE.PlaneGeometry(90, 4);
  const sidewalk = new THREE.Mesh(sidewalkGeo, materials.sidewalk);
  sidewalk.rotation.x = -Math.PI / 2;
  sidewalk.position.set(0, 0.0015, libraryWidth + 5.5);
  sidewalk.receiveShadow = true;
  envGroup.add(sidewalk);

  const treePositions = [];
  const startX = -30;
  const endX = 30;
  for (let x = startX; x <= endX; x += 10) {
    treePositions.push({ x, z: libraryWidth + 3 });
    treePositions.push({ x, z: libraryWidth + 12 });
  }

  treePositions.forEach((pos) => {
    const tree = createTree();
    tree.position.set(pos.x, 0, pos.z);
    envGroup.add(tree);
  });

  envGroup.visible = true;
};

const createTree = () => {
  const treeGroup = new THREE.Group();

  const trunkGeo = new THREE.CylinderGeometry(0.25, 0.35, 2.2, 8);
  const trunk = new THREE.Mesh(trunkGeo, materials.treeTrunk);
  trunk.position.y = 1.1;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  treeGroup.add(trunk);

  const crownGeo = new THREE.SphereGeometry(1.1, 12, 12);
  const crown = new THREE.Mesh(crownGeo, materials.treeLeaf);
  crown.position.y = 2.7;
  crown.castShadow = true;
  crown.receiveShadow = true;
  treeGroup.add(crown);

  return treeGroup;
};

// --- 每层创建一个空的内部 group，内容全部由后端填充 ---
const createEmptyFloorGroups = () => {
  for (let i = 1; i <= totalFloors; i++) {
    const floorGroup = new THREE.Group();
    floorGroup.name = `Floor_${i}_Interior`;
    floorGroup.position.y = (i - 1) * FLOOR_LEVEL_HEIGHT;
    floorGroup.visible = false;
    floorInteriorGroups.push(floorGroup);
    scene.add(floorGroup);
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
const applySeatMaterialByStatus = (seat) => {
  const status = seat.userData.status;
  let mat;
  if (status === 'free') mat = materials.seatFree;
  else if (status === 'partial') mat = materials.seatPartial;
  else if (status === 'occupied') mat = materials.seatOccupied;
  else if (status === 'selected') mat = materials.selected;
  else mat = materials.seatFree;

  seat.traverse((child) => {
    if (child.isMesh) {
      // 跳过桌子，只改椅子：用父级 subtype 区分
      const parent = child.parent;
      if (parent && parent.userData && parent.userData.subtype === 'table') {
        return;
      }
      child.material = mat.clone();
    }
  });
};

// 对当前楼层所有座位应用筛选规则
const applyTimeFilterToCurrentFloorSeats = () => {
  const group = floorInteriorGroups[currentFloor.value - 1];
  if (!group) return;

  group.traverse((obj) => {
    if (obj.userData && obj.userData.type === 'seat') {
      if (obj.userData.status !== 'selected') {
        obj.userData.status = computeSeatStatusByFilter(obj);
      }
      applySeatMaterialByStatus(obj);
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
      id: `${roomDTO.id}-S${seatDTO.number}`,
      number: seatDTO.number,
      floor: floorNum,

      backendSeatId: seatDTO.id,
      resvSummary: seatDTO.resvSummary || [], // [{ start, end }]
      status: 'free',
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

    // 初始根据当前 timeFilter 计算状态
    unitGroup.userData.status = computeSeatStatusByFilter(unitGroup);
    applySeatMaterialByStatus(unitGroup);

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
  baseURL: 'http://localhost:8080',  // <<< 改成你 Spring Boot 实际地址和端口
  // withCredentials: true, // 如果有 cookie 之类的再开
});
// 然后在 fetchFloorLayout 里用这个实例：
const fetchFloorLayout = async (floorNum) => {
  const group = floorInteriorGroups[floorNum - 1];
  if (!group) return;

  const res = await api.get(`/building/${floorNum}`, {
    params: {
      date: timeFilter.date,
      start: timeFilter.start,
      end: timeFilter.end
    }
  });

  const payload = res.data || {};
  const rooms = payload.data || [];

  console.log('楼层', floorNum, 'payload =', payload);
  console.log('rooms =', rooms);

  group.clear();
  group.visible = true;

  const testBox = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0xff0000 })
  );
  testBox.position.set(0, 0.5, 0);
  group.add(testBox);

  rooms.forEach(roomDTO => buildRoomFromDTO(group, roomDTO, floorNum));


  // 这一句先关掉，等座位正常再开
  // if (viewMode.value === 'floor' && currentFloor.value === floorNum) {
  //   applyTimeFilterToCurrentFloorSeats();
  // }
};



// --- 楼层视图：显示座位 + 处理书架透明度 + 幽灵墙 ---
const showFloorInterior = (floorNum) => {
  floorInteriorGroups.forEach((group, index) => {
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

  floorShellGroups.forEach((shell, index) => {
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
    applySeatMaterialByStatus(object);
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

// --- 交互：鼠标移动 ---
const onMouseMove = (event) => {
  if (loading.value) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  let intersects = [];
  let selectableObjects = [];

  if (viewMode.value === 'building') {
    selectableObjects = floorStructureMeshes;
  } else if (viewMode.value === 'floor') {
    const currentFloorDetails = floorInteriorGroups[currentFloor.value - 1];
    if (currentFloorDetails) {
      currentFloorDetails.traverse((child) => {
        if (
          (child.isMesh && child.parent && child.parent.userData.type === 'seat') ||
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
      !['seat', 'floor', 'room'].includes(interactiveObject.userData.type) &&
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
      let statusText = '空闲';
      if (interactiveObject.userData.status === 'partial') statusText = '半空闲';
      else if (interactiveObject.userData.status === 'occupied') statusText = '占用';
      else if (interactiveObject.userData.status === 'selected')
        statusText = '已选中';

      hoverInfo.value = `${interactiveObject.userData.id}（${statusText}）`;
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

// --- 点击 ---
const onMouseClick = (event) => {
  if (loading.value) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  let intersects = [];
  if (viewMode.value === 'building') {
    intersects = raycaster.intersectObjects(floorStructureMeshes);
  } else if (viewMode.value === 'floor') {
    const currentFloorDetails = floorInteriorGroups[currentFloor.value - 1];
    if (currentFloorDetails) {
      intersects = raycaster.intersectObjects(currentFloorDetails.children, true);
    }
  }

  if (intersects.length > 0) {
    const object = intersects[0].object;
    let interactiveObject = object;
    while (
      interactiveObject &&
      !['seat', 'floor', 'room'].includes(interactiveObject.userData.type) &&
      interactiveObject.parent
      ) {
      interactiveObject = interactiveObject.parent;
    }

    if (
      interactiveObject &&
      interactiveObject.userData.type === 'floor' &&
      viewMode.value === 'building'
    ) {
      enterFloorView(interactiveObject.userData.floorNumber);
    } else if (
      interactiveObject &&
      interactiveObject.userData.type === 'seat' &&
      viewMode.value === 'floor'
    ) {
      handleSeatClick(interactiveObject);
    }
  }
};

// --- 进入楼层视图 ---
const enterFloorView = (floorNum) => {
  viewMode.value = 'floor';
  currentFloor.value = floorNum;
  freezeTooltip.value = true;
  selectedOutlineObjects = [];
  outlinePass.selectedObjects = selectedOutlineObjects;

  if (roofMesh) roofMesh.visible = false;
  if (envGroup) envGroup.visible = false;

  const targetFloorYBase = (floorNum - 1) * FLOOR_LEVEL_HEIGHT;
  const targetCameraPos = new THREE.Vector3(
    libraryWidth * 0.7,
    targetFloorYBase + FLOOR_LEVEL_HEIGHT * 1.8,
    libraryWidth * 0.7
  );
  const targetLookAt = new THREE.Vector3(
    0,
    targetFloorYBase + FLOOR_LEVEL_HEIGHT / 2,
    0
  );

  floorStructureMeshes.forEach((mesh) => {
    if (mesh.userData.floorNumber === floorNum) {
      gsap.to(mesh.material, { opacity: 0.1, duration: 1.5 });
    } else {
      gsap.to(mesh.position, {
        y: mesh.position.y + 50,
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
      floorStructureMeshes.forEach((m) => {
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

  const prevFloorGroup = floorInteriorGroups[currentFloor.value - 1];
  if (prevFloorGroup) {
    prevFloorGroup.visible = false;
  }

  if (roofMesh) roofMesh.visible = false;
  if (envGroup) envGroup.visible = false;

  currentFloor.value = floorNum;

  const targetFloorYBase = (floorNum - 1) * FLOOR_LEVEL_HEIGHT;
  const targetCameraPos = new THREE.Vector3(
    libraryWidth * 0.7,
    targetFloorYBase + FLOOR_LEVEL_HEIGHT * 1.8,
    libraryWidth * 0.7
  );
  const targetLookAt = new THREE.Vector3(
    0,
    targetFloorYBase + FLOOR_LEVEL_HEIGHT / 2,
    0
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

// --- 返回建筑视图 ---
const resetView = () => {
  viewMode.value = 'building';
  currentFloor.value = 0;
  freezeTooltip.value = true;
  selectedOutlineObjects = [];
  outlinePass.selectedObjects = selectedOutlineObjects;

  floorInteriorGroups.forEach((group) => {
    group.visible = false;
  });
  floorShellGroups.forEach((shell) => {
    shell.visible = false;
  });

  floorStructureMeshes.forEach((mesh) => {
    mesh.visible = true;

    gsap.to(mesh.position, {
      y:
        (mesh.userData.floorNumber - 1) * FLOOR_LEVEL_HEIGHT +
        FLOOR_LEVEL_HEIGHT / 2,
      duration: 1.2,
      ease: 'power1.out',
      delay: 0.4
    });

    gsap.to(mesh.material, { opacity: 0.95, duration: 1.2, delay: 0.4 });
  });

  if (roofMesh) roofMesh.visible = true;
  if (envGroup) envGroup.visible = true;

  if (controls) controls.enabled = false;

  const tl = gsap.timeline({
    defaults: { duration: 1.5, ease: 'power1.inOut' },
    onComplete: () => {
      freezeTooltip.value = false;
      if (controls) {
        controls.target.set(0, 5, 0);
        controls.enabled = true;
        controls.update();
      }
    }
  });

  tl.to(
    camera.position,
    {
      x: 55,
      y: 45,
      z: 55,
      onUpdate: () => camera.lookAt(0, 5, 0)
    },
    0
  );
};

// --- 座位点击：暂时仍使用你原来的本地预约逻辑 ---
const handleSeatClick = (seat) => {
  const res = seat.userData.reservation;

  if (res && res.date === timeFilter.date) {
    alert(
      `该座位当前已有预约：\n` +
      `开始时间：${res.start}\n` +
      `结束时间：${res.end}`
    );
    return;
  }

  floorInteriorGroups.forEach((group) => {
    group.traverse((child) => {
      if (
        child.userData &&
        child.userData.type === 'seat' &&
        child.userData.status === 'selected'
      ) {
        child.userData.status = computeSeatStatusByFilter(child);
        applySeatMaterialByStatus(child);
      }
    });
  });

  seat.userData.status = 'selected';
  applySeatMaterialByStatus(seat);

  gsap.fromTo(
    seat.scale,
    { x: 1, y: 1, z: 1 },
    {
      x: 1.1,
      y: 1.1,
      z: 1.1,
      duration: 0.2,
      yoyo: true,
      repeat: 1,
      ease: 'power1.inOut'
    }
  );

  selectedOutlineObjects = [seat];
  outlinePass.selectedObjects = selectedOutlineObjects;

  selectedSeat.value = seat;
  reservationSeatId.value = seat.userData.id;

  reservationForm.date = timeFilter.date;
  reservationForm.start = timeFilter.start || timeSlots.value[0] || '08:00';

  const idx = timeSlots.value.indexOf(reservationForm.start);
  const endIdx = Math.min(idx + 2, timeSlots.value.length - 1); // 默认加 1 小时
  reservationForm.end = timeSlots.value[endIdx] || '22:00';

  showReservationModal.value = true;
};

// 取消预约弹窗
const cancelReservation = () => {
  if (selectedSeat.value) {
    selectedSeat.value.userData.status = computeSeatStatusByFilter(
      selectedSeat.value
    );
    applySeatMaterialByStatus(selectedSeat.value);
  }
  selectedSeat.value = null;
  showReservationModal.value = false;
  selectedOutlineObjects = [];
  outlinePass.selectedObjects = selectedOutlineObjects;
};

// 确认预约（当前先保持前端逻辑，不和后端联动）
const confirmReservation = () => {
  if (!selectedSeat.value) {
    showReservationModal.value = false;
    return;
  }

  if (!reservationForm.date || !reservationForm.start || !reservationForm.end) {
    alert('请先选择完整的预约时间段');
    return;
  }

  const startM = parseTimeStr(reservationForm.start);
  const endM = parseTimeStr(reservationForm.end);
  const lastM = 22 * 60;

  if (endM == null || endM > lastM) {
    alert('结束时间不能晚于 22:00');
    return;
  }
  if (startM != null && endM <= startM) {
    alert('结束时间必须晚于开始时间');
    return;
  }

  const seat = selectedSeat.value;

  seat.userData.reservation = {
    date: reservationForm.date,
    start: reservationForm.start,
    end: reservationForm.end
  };

  // 本地先按当前筛选重新算状态
  seat.userData.status = computeSeatStatusByFilter(seat);
  applySeatMaterialByStatus(seat);

  alert(
    `已为座位 ${seat.userData.id} 创建预约（仅前端模拟）：\n` +
    `日期：${reservationForm.date}\n` +
    `时间：${reservationForm.start} - ${reservationForm.end}`
  );

  selectedSeat.value = null;
  showReservationModal.value = false;
  selectedOutlineObjects = [];
  outlinePass.selectedObjects = selectedOutlineObjects;
};

// --- 渲染循环 & 事件 ---
const animate = () => {
  animationId = requestAnimationFrame(animate);
  if (controls) controls.update();
  composer.render();
};

const handleResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  smaaPass.setSize(
    window.innerWidth * renderer.getPixelRatio(),
    window.innerHeight * renderer.getPixelRatio()
  );
  outlinePass.setSize(window.innerWidth, window.innerHeight);
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

onMounted(() => {
  initDateAndTimeOptions();
  initTimeSlots();
  initDefaultTimeFilter();

  initScene();
  createBuilding();
  createEnvironment();
  createEmptyFloorGroups();

  animate();

  window.addEventListener('resize', handleResize);
  window.addEventListener('click', onMouseClick);
  window.addEventListener('mousemove', onMouseMove);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('click', onMouseClick);
  window.removeEventListener('mousemove', onMouseMove);
  cancelAnimationFrame(animationId);
  if (controls) controls.dispose();
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
        &.partial {
          background: #ffe9a7;
        }
        &.occupied {
          background: #f28b82;
        }
        &.selected {
          background: #fff59d;
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
  z-index: 30;
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
</style>
