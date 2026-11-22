import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  BattleSession,
  BuildingInstance,
  BuildingType,
} from '../types/game';
import {
  MaterialPalette,
  buildRaidBossModel,
  buildStructureModel,
  buildTroopModel,
  createMaterialPalette,
} from './modelBuilders';
import {
  createContactShadowTexture,
  createGrassGridTexture,
  createStoneTexture,
} from './proceduralTextures';

export type CameraPreset = 'isometric' | 'tactical' | 'cinematic';

export interface SceneCallbacks {
  onTileClick: (gx: number, gz: number) => void;
  onBuildingClick: (buildingId: string) => void;
  onBattleGroundClick: (x: number, z: number) => void;
  onContextLost?: () => void;
}

const _raycaster = new THREE.Raycaster();
const _pointer = new THREE.Vector2();
const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _hitPoint = new THREE.Vector3();
const _camTargetPos = new THREE.Vector3(18, 17, 18);
const _camTargetLook = new THREE.Vector3(0, 0, 0);

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

function createHpBar(width: number, colorHex: number): THREE.Group {
  const g = new THREE.Group();
  const bg = new THREE.Mesh(
    new THREE.PlaneGeometry(width, 0.18),
    new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide }),
  );
  g.add(bg);
  const fill = new THREE.Mesh(
    new THREE.PlaneGeometry(width - 0.06, 0.12),
    new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide }),
  );
  fill.position.z = 0.01;
  fill.userData.isFill = true;
  g.add(fill);
  return g;
}

export class CitadelScene {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private palette: MaterialPalette;
  private isSoftwareGl: boolean;
  private callbacks: SceneCallbacks;

  private baseGroup = new THREE.Group();
  private battleGroup = new THREE.Group();
  private vfxGroup = new THREE.Group();
  private hoverTileMesh: THREE.Mesh;
  private selectedRingMesh: THREE.Mesh;

  private buildingMeshes = new Map<string, { group: THREE.Group; sig: string }>();
  private battleBuildingMeshes = new Map<string, { group: THREE.Group; hpBar: THREE.Group; destroyed: boolean }>();
  private unitMeshes = new Map<string, { group: THREE.Group; hpBar: THREE.Group; targetX: number; targetZ: number }>();
  private bossMesh: { group: THREE.Group; hpBar: THREE.Group } | null = null;
  private projectileMeshes: THREE.Mesh[] = [];

  private mode: 'base' | 'battle' = 'base';
  private placingActive = false;
  private selectedBuildingId: string | null = null;
  private cameraTweenActive = false;
  private frameId = 0;
  private disposed = false;
  private clock = new THREE.Clock();
  private pointerDownPos = { x: 0, y: 0 };

  constructor(container: HTMLElement, callbacks: SceneCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.isSoftwareGl = detectSoftwareWebGL();

    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.touchAction = 'none';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    const skyColor = new THREE.Color(0x0b1628);
    this.scene.background = skyColor;
    this.scene.fog = new THREE.FogExp2(0x0b1628, 0.011);

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 160);
    this.camera.position.set(18, 17, 18);

    // Studio environment reflection
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // 3-point warm/cool outdoor citadel lighting
    const hemi = new THREE.HemisphereLight(0x93c5fd, 0x1e293b, 0.72);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff1d0, 1.85);
    sun.position.set(18, 28, 16);
    sun.castShadow = !this.isSoftwareGl;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 2;
    sun.shadow.camera.far = 70;
    const d = 18;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.02;
    this.scene.add(sun);

    const rim = new THREE.DirectionalLight(0x38bdf8, 0.55);
    rim.position.set(-16, 12, -18);
    this.scene.add(rim);

    // Procedural textures & material palette
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    const grassTex = createGrassGridTexture(maxAniso);
    const stoneTex = createStoneTexture(maxAniso);
    const shadowTex = createContactShadowTexture();
    this.palette = createMaterialPalette(stoneTex, shadowTex);

    this.buildEnvironmentIsland(grassTex);

    // Tile hover highlight & selected building ring
    this.hoverTileMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.9, 1.9),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.42, depthWrite: false }),
    );
    this.hoverTileMesh.rotation.x = -Math.PI / 2;
    this.hoverTileMesh.position.y = 0.03;
    this.hoverTileMesh.visible = false;
    this.scene.add(this.hoverTileMesh);

    this.selectedRingMesh = new THREE.Mesh(
      new THREE.RingGeometry(0.95, 1.15, 28),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }),
    );
    this.selectedRingMesh.rotation.x = -Math.PI / 2;
    this.selectedRingMesh.position.y = 0.04;
    this.selectedRingMesh.visible = false;
    this.scene.add(this.selectedRingMesh);

    this.scene.add(this.baseGroup);
    this.scene.add(this.battleGroup);
    this.scene.add(this.vfxGroup);
    this.battleGroup.visible = false;

    // OrbitControls tuned for desktop + mobile touch
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 38;
    this.controls.minPolarAngle = Math.PI * 0.14;
    this.controls.maxPolarAngle = Math.PI * 0.43;
    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };
    this.controls.addEventListener('start', () => {
      this.cameraTweenActive = false;
    });

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.startLoop();
  }

  private buildEnvironmentIsland(grassTex: THREE.CanvasTexture) {
    // 26x26 grass grid plateau (13x13 grid of 2x2 unit cells -> -6..+6)
    const plateauGeo = new THREE.BoxGeometry(26, 1.4, 26);
    const grassMat = new THREE.MeshStandardMaterial({
      map: grassTex,
      roughness: 0.88,
      metalness: 0.02,
    });
    const cliffMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.9,
      metalness: 0.05,
    });
    const plateau = new THREE.Mesh(plateauGeo, [cliffMat, cliffMat, grassMat, cliffMat, cliffMat, cliffMat]);
    plateau.position.y = -0.7;
    plateau.receiveShadow = true;
    this.scene.add(plateau);

    // Outer stepped stone border rim
    const rimGeo = new THREE.BoxGeometry(27.2, 0.9, 27.2);
    const rimMesh = new THREE.Mesh(rimGeo, this.palette.darkStone);
    rimMesh.position.y = -1.15;
    rimMesh.receiveShadow = true;
    this.scene.add(rimMesh);

    // Expansive glowing azure moat / ocean plane extending into fog
    const waterGeo = new THREE.PlaneGeometry(240, 240);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.2,
      metalness: 0.35,
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -1.65;
    this.scene.add(water);

    // InstancedMesh perimeter pines and crystal outcrops around outer edge
    const treeCount = 36;
    const coneGeo = new THREE.ConeGeometry(0.65, 1.85, 7);
    const treeMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.78 });
    const treeInst = new THREE.InstancedMesh(coneGeo, treeMat, treeCount);
    const dummy = new THREE.Object3D();
    const tint = new THREE.Color();

    for (let i = 0; i < treeCount; i++) {
      const side = i % 4;
      const t = ((Math.floor(i / 4) / (treeCount / 4)) - 0.5) * 24;
      const offset = 13.3 + (i % 3) * 0.25;
      const x = side === 0 ? t : side === 1 ? t : side === 2 ? -offset : offset;
      const z = side === 0 ? -offset : side === 1 ? offset : t;
      dummy.position.set(x, -0.15, z);
      const s = 0.82 + ((i * 37) % 30) / 100;
      dummy.scale.set(s, s, s);
      dummy.rotation.y = i * 0.9;
      dummy.updateMatrix();
      treeInst.setMatrixAt(i, dummy.matrix);
      tint.setHSL(0.36 + (i % 5) * 0.015, 0.62, 0.38);
      treeInst.setColorAt(i, tint);
    }
    treeInst.instanceMatrix.needsUpdate = true;
    if (treeInst.instanceColor) treeInst.instanceColor.needsUpdate = true;
    treeInst.computeBoundingSphere();
    this.scene.add(treeInst);
  }

  private bindEvents() {
    const dom = this.renderer.domElement;

    const onPointerDown = (e: PointerEvent) => {
      this.pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (this.mode !== 'base' || !this.placingActive) {
        this.hoverTileMesh.visible = false;
        return;
      }
      const rect = dom.getBoundingClientRect();
      _pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      _raycaster.setFromCamera(_pointer, this.camera);
      if (_raycaster.ray.intersectPlane(_groundPlane, _hitPoint)) {
        const gx = Math.round(_hitPoint.x / 2);
        const gz = Math.round(_hitPoint.z / 2);
        if (gx >= -6 && gx <= 6 && gz >= -6 && gz <= 6) {
          this.hoverTileMesh.position.set(gx * 2, 0.03, gz * 2);
          this.hoverTileMesh.visible = true;
          return;
        }
      }
      this.hoverTileMesh.visible = false;
    };

    const onPointerUp = (e: PointerEvent) => {
      const moved = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
      if (moved > 8) return; // Was a camera drag

      const rect = dom.getBoundingClientRect();
      _pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      _raycaster.setFromCamera(_pointer, this.camera);

      if (this.mode === 'battle') {
        if (_raycaster.ray.intersectPlane(_groundPlane, _hitPoint)) {
          if (Math.abs(_hitPoint.x) <= 13 && Math.abs(_hitPoint.z) <= 13) {
            this.callbacks.onBattleGroundClick(_hitPoint.x, _hitPoint.z);
          }
        }
        return;
      }

      // Base mode: check building selection first unless placing
      if (!this.placingActive) {
        const hits = _raycaster.intersectObjects(this.baseGroup.children, true);
        if (hits.length > 0) {
          let obj: THREE.Object3D | null = hits[0].object;
          while (obj && !obj.userData.buildingId) {
            obj = obj.parent;
          }
          if (obj?.userData.buildingId) {
            this.callbacks.onBuildingClick(obj.userData.buildingId);
            return;
          }
        }
      }

      if (_raycaster.ray.intersectPlane(_groundPlane, _hitPoint)) {
        const gx = Math.round(_hitPoint.x / 2);
        const gz = Math.round(_hitPoint.z / 2);
        if (gx >= -6 && gx <= 6 && gz >= -6 && gz <= 6) {
          this.callbacks.onTileClick(gx, gz);
        }
      }
    };

    const onResize = () => {
      if (this.disposed) return;
      const w = Math.max(1, this.container.clientWidth);
      const h = Math.max(1, this.container.clientHeight);
      const aspect = w / h;
      this.camera.aspect = aspect;
      this.camera.fov = aspect < 1 ? Math.min(66, 45 / Math.pow(aspect, 0.42)) : 45;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(this.container);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      this.callbacks.onContextLost?.();
    };

    dom.addEventListener('pointerdown', onPointerDown);
    dom.addEventListener('pointermove', onPointerMove);
    dom.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('webglcontextlost', onContextLost);
    window.addEventListener('resize', onResize);

    this.cleanupListeners = () => {
      resizeObserver.disconnect();
      dom.removeEventListener('pointerdown', onPointerDown);
      dom.removeEventListener('pointermove', onPointerMove);
      dom.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('webglcontextlost', onContextLost);
      window.removeEventListener('resize', onResize);
    };
  }

  private cleanupListeners: () => void = () => {};

  public setMode(mode: 'base' | 'battle') {
    this.mode = mode;
    this.baseGroup.visible = mode === 'base';
    this.battleGroup.visible = mode === 'battle';
    this.selectedRingMesh.visible = mode === 'base' && Boolean(this.selectedBuildingId);
    if (mode === 'battle') {
      this.hoverTileMesh.visible = false;
    }
  }

  public setPlacingActive(active: boolean) {
    this.placingActive = active;
    if (!active) this.hoverTileMesh.visible = false;
  }

  public setSelectedBuilding(buildingId: string | null, gx?: number, gz?: number) {
    this.selectedBuildingId = buildingId;
    if (buildingId && gx !== undefined && gz !== undefined && this.mode === 'base') {
      this.selectedRingMesh.position.set(gx * 2, 0.04, gz * 2);
      this.selectedRingMesh.visible = true;
    } else {
      this.selectedRingMesh.visible = false;
    }
  }

  public setCameraPreset(preset: CameraPreset) {
    if (preset === 'isometric') {
      _camTargetPos.set(18, 17, 18);
      _camTargetLook.set(0, 0, 0);
    } else if (preset === 'tactical') {
      _camTargetPos.set(0, 26, 10);
      _camTargetLook.set(0, 0, 0);
    } else {
      _camTargetPos.set(11, 8.5, 13);
      _camTargetLook.set(0, 1.2, 0);
    }
    this.cameraTweenActive = true;
  }

  public syncBaseBuildings(buildings: BuildingInstance[]) {
    const keepIds = new Set(buildings.map((b) => b.id));
    for (const [id, entry] of this.buildingMeshes.entries()) {
      if (!keepIds.has(id)) {
        this.baseGroup.remove(entry.group);
        this.buildingMeshes.delete(id);
      }
    }

    for (const b of buildings) {
      const sig = `${b.type}_${b.level}`;
      const existing = this.buildingMeshes.get(b.id);
      if (existing && existing.sig === sig) {
        existing.group.position.set(b.gx * 2, 0, b.gz * 2);
        if (b.id === this.selectedBuildingId) {
          this.selectedRingMesh.position.set(b.gx * 2, 0.04, b.gz * 2);
        }
        continue;
      }
      if (existing) {
        this.baseGroup.remove(existing.group);
      }
      const meshGroup = buildStructureModel(b.type as BuildingType, b.level, this.palette);
      meshGroup.position.set(b.gx * 2, 0, b.gz * 2);
      meshGroup.userData.buildingId = b.id;
      this.baseGroup.add(meshGroup);
      this.buildingMeshes.set(b.id, { group: meshGroup, sig });
    }
  }

  public syncBattleState(battle: BattleSession | null) {
    if (!battle) {
      for (const entry of this.battleBuildingMeshes.values()) this.battleGroup.remove(entry.group);
      for (const entry of this.unitMeshes.values()) this.battleGroup.remove(entry.group);
      if (this.bossMesh) {
        this.battleGroup.remove(this.bossMesh.group);
        this.bossMesh = null;
      }
      this.battleBuildingMeshes.clear();
      this.unitMeshes.clear();
      return;
    }

    // Sync battle buildings
    const bIds = new Set(battle.buildings.map((b) => b.id));
    for (const [id, entry] of this.battleBuildingMeshes.entries()) {
      if (!bIds.has(id)) {
        this.battleGroup.remove(entry.group);
        this.battleBuildingMeshes.delete(id);
      }
    }

    for (const b of battle.buildings) {
      let entry = this.battleBuildingMeshes.get(b.id);
      if (!entry) {
        const group = buildStructureModel(b.type, b.level, this.palette);
        group.position.set(b.gx * 2, 0, b.gz * 2);
        const hpBar = createHpBar(1.6, 0xef4444);
        hpBar.position.set(0, 3.1, 0);
        group.add(hpBar);
        this.battleGroup.add(group);
        entry = { group, hpBar, destroyed: false };
        this.battleBuildingMeshes.set(b.id, entry);
      }

      const ratio = Math.max(0.01, b.hp / Math.max(1, b.maxHp));
      entry.hpBar.visible = !b.destroyed && b.hp < b.maxHp;
      entry.hpBar.lookAt(this.camera.position);
      const fill = entry.hpBar.children.find((c) => c.userData.isFill);
      if (fill) {
        fill.scale.x = ratio;
        fill.position.x = -(1 - ratio) * 0.77;
      }

      if (b.destroyed && !entry.destroyed) {
        entry.destroyed = true;
        entry.group.scale.y = 0.18;
      }
    }

    // Sync Raid Boss
    if (battle.mode === 'raid' && battle.boss) {
      if (!this.bossMesh) {
        const group = buildRaidBossModel(this.palette);
        const hpBar = createHpBar(3.4, 0xf97316);
        hpBar.position.set(0, 4.7, 0);
        group.add(hpBar);
        this.battleGroup.add(group);
        this.bossMesh = { group, hpBar };
      }
      this.bossMesh.group.position.set(battle.boss.x, 0, battle.boss.z);
      this.bossMesh.group.visible = battle.boss.hp > 0;
      const ratio = Math.max(0.01, battle.boss.hp / Math.max(1, battle.boss.maxHp));
      this.bossMesh.hpBar.lookAt(this.camera.position);
      const fill = this.bossMesh.hpBar.children.find((c) => c.userData.isFill);
      if (fill) {
        fill.scale.x = ratio;
        fill.position.x = -(1 - ratio) * 1.65;
      }
    } else if (this.bossMesh) {
      this.battleGroup.remove(this.bossMesh.group);
      this.bossMesh = null;
    }

    // Sync Units
    const uIds = new Set(battle.units.map((u) => u.id));
    for (const [id, entry] of this.unitMeshes.entries()) {
      if (!uIds.has(id)) {
        this.battleGroup.remove(entry.group);
        this.unitMeshes.delete(id);
      }
    }

    for (const u of battle.units) {
      let entry = this.unitMeshes.get(u.id);
      if (!entry) {
        const group = buildTroopModel(u.type, this.palette);
        group.position.set(u.x, 0, u.z);
        const hpBar = createHpBar(0.95, 0x22c55e);
        hpBar.position.set(0, 1.65, 0);
        group.add(hpBar);
        this.battleGroup.add(group);
        entry = { group, hpBar, targetX: u.x, targetZ: u.z };
        this.unitMeshes.set(u.id, entry);
      }
      entry.targetX = u.x;
      entry.targetZ = u.z;
      const ratio = Math.max(0.01, u.hp / Math.max(1, u.maxHp));
      entry.hpBar.visible = u.hp < u.maxHp;
      entry.hpBar.lookAt(this.camera.position);
      const fill = entry.hpBar.children.find((c) => c.userData.isFill);
      if (fill) {
        fill.scale.x = ratio;
        fill.position.x = -(1 - ratio) * 0.44;
      }
    }

    // Sync Projectile VFX
    while (this.projectileMeshes.length > 0) {
      const m = this.projectileMeshes.pop()!;
      this.vfxGroup.remove(m);
      m.geometry.dispose();
    }
    const now = Date.now();
    for (const prj of battle.projectiles) {
      const age = Math.min(1, (now - prj.createdAt) / 340);
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 6, 6),
        new THREE.MeshBasicMaterial({ color: prj.color }),
      );
      mesh.position.set(
        THREE.MathUtils.lerp(prj.fromX, prj.toX, age),
        THREE.MathUtils.lerp(prj.fromY, prj.toY, age) + Math.sin(age * Math.PI) * 0.8,
        THREE.MathUtils.lerp(prj.fromZ, prj.toZ, age),
      );
      this.vfxGroup.add(mesh);
      this.projectileMeshes.push(mesh);
    }
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private startLoop() {
    const tick = () => {
      if (this.disposed) return;
      const dt = Math.min(0.05, this.clock.getDelta());
      const elapsed = this.clock.elapsedTime;

      if (this.cameraTweenActive) {
        this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, _camTargetPos.x, 5, dt);
        this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, _camTargetPos.y, 5, dt);
        this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, _camTargetPos.z, 5, dt);
        this.controls.target.x = THREE.MathUtils.damp(this.controls.target.x, _camTargetLook.x, 5, dt);
        this.controls.target.y = THREE.MathUtils.damp(this.controls.target.y, _camTargetLook.y, 5, dt);
        this.controls.target.z = THREE.MathUtils.damp(this.controls.target.z, _camTargetLook.z, 5, dt);
        if (this.camera.position.distanceTo(_camTargetPos) < 0.08) {
          this.cameraTweenActive = false;
        }
      }

      // Spin crystal spires and mine wheels
      const activeGroup = this.mode === 'base' ? this.baseGroup : this.battleGroup;
      activeGroup.traverse((obj) => {
        if (obj.userData.spin) {
          obj.rotation.y += dt * 1.4;
        } else if (obj.userData.spinX) {
          obj.rotation.x += dt * 2.2;
        } else if (obj.userData.turret) {
          obj.rotation.y = Math.sin(elapsed * 0.9) * 0.6;
        }
      });

      // Smooth unit movement & march bob
      if (this.mode === 'battle') {
        for (const [id, entry] of this.unitMeshes.entries()) {
          const dx = entry.targetX - entry.group.position.x;
          const dz = entry.targetZ - entry.group.position.z;
          if (Math.hypot(dx, dz) > 0.03) {
            entry.group.rotation.y = Math.atan2(dx, dz);
          }
          entry.group.position.x = THREE.MathUtils.damp(entry.group.position.x, entry.targetX, 10, dt);
          entry.group.position.z = THREE.MathUtils.damp(entry.group.position.z, entry.targetZ, 10, dt);
          entry.group.position.y = Math.abs(Math.sin(elapsed * 9 + id.length)) * 0.12;
        }
        if (this.bossMesh && this.bossMesh.group.visible) {
          this.bossMesh.group.rotation.y = Math.sin(elapsed * 0.7) * 0.35;
        }
      }

      this.controls.update();
      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.afterDraw(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.cleanupListeners();
    this.controls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
