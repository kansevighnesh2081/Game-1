import * as THREE from 'three';
import { BuildingType, TROOP_CATALOG, TroopType } from '../types/game';

export interface MaterialPalette {
  stone: THREE.MeshStandardMaterial;
  darkStone: THREE.MeshStandardMaterial;
  wood: THREE.MeshStandardMaterial;
  gold: THREE.MeshStandardMaterial;
  azureRoof: THREE.MeshStandardMaterial;
  crimsonRoof: THREE.MeshStandardMaterial;
  crystal: THREE.MeshPhysicalMaterial;
  iron: THREE.MeshStandardMaterial;
  obsidian: THREE.MeshStandardMaterial;
  magma: THREE.MeshStandardMaterial;
  contactShadow: THREE.MeshBasicMaterial;
}

export function createMaterialPalette(stoneTex: THREE.CanvasTexture, shadowTex: THREE.CanvasTexture): MaterialPalette {
  return {
    stone: new THREE.MeshStandardMaterial({ map: stoneTex, color: 0xe2e8f0, roughness: 0.78, metalness: 0.05 }),
    darkStone: new THREE.MeshStandardMaterial({ map: stoneTex, color: 0x475569, roughness: 0.85, metalness: 0.08 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.82, metalness: 0.02 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.24, metalness: 0.88 }),
    azureRoof: new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.42, metalness: 0.15 }),
    crimsonRoof: new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.45, metalness: 0.12 }),
    crystal: new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.55,
      roughness: 0.12,
      metalness: 0.1,
      clearcoat: 1.0,
    }),
    iron: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3, metalness: 0.82 }),
    obsidian: new THREE.MeshStandardMaterial({ color: 0x1e1b2e, roughness: 0.65, metalness: 0.22 }),
    magma: new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xea580c,
      emissiveIntensity: 1.25,
      roughness: 0.35,
      metalness: 0.1,
    }),
    contactShadow: new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
    }),
  };
}

function addContactShadow(group: THREE.Group, mat: THREE.MeshBasicMaterial, radius: number) {
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), mat);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = 0.02;
  group.add(plane);
}

export function buildStructureModel(type: BuildingType, level: number, pal: MaterialPalette): THREE.Group {
  const group = new THREE.Group();
  const scaleBoost = 1 + (level - 1) * 0.06;

  addContactShadow(group, pal.contactShadow, type === 'stone_wall' ? 1.05 : 1.35);

  if (type === 'citadel_keep') {
    // 1. Stone foundation plinth
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.45, 1.9), pal.darkStone);
    base.position.y = 0.225;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    // 2. Main castle keep hall
    const hall = new THREE.Mesh(new THREE.BoxGeometry(1.45, 1.25, 1.45), pal.stone);
    hall.position.y = 1.05;
    hall.castShadow = true;
    hall.receiveShadow = true;
    group.add(hall);

    // 3. Central golden spire roof
    const mainRoof = new THREE.Mesh(new THREE.ConeGeometry(1.1, 1.15, 4), pal.azureRoof);
    mainRoof.position.y = 2.25;
    mainRoof.rotation.y = Math.PI / 4;
    mainRoof.castShadow = true;
    group.add(mainRoof);

    // 4-7. Four corner turrets with gold caps
    const corners = [
      [-0.78, -0.78],
      [0.78, -0.78],
      [-0.78, 0.78],
      [0.78, 0.78],
    ];
    for (const [cx, cz] of corners) {
      const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 1.45, 8), pal.stone);
      turret.position.set(cx, 0.95, cz);
      turret.castShadow = true;
      group.add(turret);

      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.5, 8), pal.gold);
      cap.position.set(cx, 1.9, cz);
      cap.castShadow = true;
      group.add(cap);
    }

    // 8. Glowing crystal crown atop main spire
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), pal.crystal);
    gem.position.y = 2.95;
    gem.userData.spin = true;
    group.add(gem);

    // 9. Arched wooden gate
    const gate = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.72, 0.14), pal.wood);
    gate.position.set(0, 0.65, 0.74);
    group.add(gate);
  } else if (type === 'gold_mine') {
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.05, 0.2, 8), pal.darkStone);
    pad.position.y = 0.1;
    pad.receiveShadow = true;
    group.add(pad);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 1.1), pal.wood);
    frame.position.y = 0.65;
    frame.castShadow = true;
    group.add(frame);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.6, 4), pal.stone);
    roof.position.y = 1.38;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);

    // Rotating gold ore wheel
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.08, 8, 16), pal.gold);
    wheel.position.set(0.68, 0.75, 0);
    wheel.rotation.y = Math.PI / 2;
    wheel.userData.spinX = true;
    group.add(wheel);

    // Gold nuggets mound
    const ore1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.26, 0), pal.gold);
    ore1.position.set(-0.25, 0.4, 0.68);
    group.add(ore1);
    const ore2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2, 0), pal.gold);
    ore2.position.set(0.18, 0.35, 0.72);
    group.add(ore2);
  } else if (type === 'crystal_extractor') {
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 0.22, 10), pal.darkStone);
    pad.position.y = 0.11;
    group.add(pad);

    const vat = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.0, 12), pal.crystal);
    vat.position.y = 0.72;
    group.add(vat);

    const ringBottom = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.07, 8, 16), pal.iron);
    ringBottom.rotation.x = Math.PI / 2;
    ringBottom.position.y = 0.32;
    group.add(ringBottom);

    const ringTop = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.07, 8, 16), pal.gold);
    ringTop.rotation.x = Math.PI / 2;
    ringTop.position.y = 1.18;
    group.add(ringTop);

    const spire = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), pal.crystal);
    spire.position.y = 1.65;
    spire.userData.spin = true;
    group.add(spire);
  } else if (type === 'archer_tower') {
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.35, 1.25), pal.darkStone);
    plinth.position.y = 0.175;
    group.add(plinth);

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.58, 1.45, 8), pal.stone);
    shaft.position.y = 1.05;
    shaft.castShadow = true;
    group.add(shaft);

    const deck = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.22, 1.15), pal.wood);
    deck.position.y = 1.85;
    deck.castShadow = true;
    group.add(deck);

    const turret = new THREE.Group();
    turret.position.y = 2.15;
    turret.userData.turret = true;
    const bowFrame = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.06, 6, 12, Math.PI), pal.gold);
    bowFrame.rotation.x = Math.PI / 2;
    turret.add(bowFrame);
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.65, 6), pal.iron);
    bolt.rotation.x = Math.PI / 2;
    turret.add(bolt);
    group.add(turret);
  } else if (type === 'arcane_cannon') {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 1.02, 0.45, 8), pal.darkStone);
    base.position.y = 0.225;
    base.castShadow = true;
    group.add(base);

    const mount = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.45, 0.95), pal.iron);
    mount.position.y = 0.65;
    mount.castShadow = true;
    group.add(mount);

    const barrelGroup = new THREE.Group();
    barrelGroup.position.y = 1.05;
    barrelGroup.userData.turret = true;
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 1.15, 12), pal.obsidian);
    barrel.rotation.x = Math.PI / 3;
    barrel.position.z = 0.22;
    barrel.castShadow = true;
    barrelGroup.add(barrel);

    const runeRing = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.06, 8, 16), pal.gold);
    runeRing.position.set(0, 0.15, 0.42);
    runeRing.rotation.x = -Math.PI / 6;
    barrelGroup.add(runeRing);
    group.add(barrelGroup);
  } else if (type === 'barracks') {
    const floor = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.2, 1.45), pal.darkStone);
    floor.position.y = 0.1;
    group.add(floor);

    const hall = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.85, 1.15), pal.wood);
    hall.position.y = 0.62;
    hall.castShadow = true;
    group.add(hall);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.15, 0.72, 4), pal.crimsonRoof);
    roof.position.y = 1.4;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);

    const banner = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 0.4), pal.gold);
    banner.position.set(0.75, 0.85, 0.45);
    group.add(banner);
  } else if (type === 'blacksmith_forge') {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.22, 1.4), pal.darkStone);
    slab.position.y = 0.11;
    group.add(slab);

    const furnace = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 1.25, 8), pal.stone);
    furnace.position.set(-0.35, 0.82, -0.2);
    furnace.castShadow = true;
    group.add(furnace);

    const hearth = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 10), pal.magma);
    hearth.position.set(-0.35, 0.55, 0.25);
    group.add(hearth);

    const anvil = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.35, 0.3), pal.iron);
    anvil.position.set(0.38, 0.4, 0.22);
    anvil.castShadow = true;
    group.add(anvil);

    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.65, 0.18), pal.gold);
    blade.position.set(0.38, 0.85, 0.22);
    blade.rotation.z = -0.35;
    group.add(blade);
  } else if (type === 'stone_wall') {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.95, 0.65), pal.stone);
    wall.position.y = 0.475;
    wall.castShadow = true;
    wall.receiveShadow = true;
    group.add(wall);

    for (const bx of [-0.62, 0, 0.62]) {
      const crenel = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.28, 0.7), pal.darkStone);
      crenel.position.set(bx, 1.05, 0);
      crenel.castShadow = true;
      group.add(crenel);
    }
  }

  // Level star trim indicator on buildings > level 1
  if (level > 1 && type !== 'stone_wall') {
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.25 * Math.min(level, 4), 0.1, 0.14), pal.gold);
    trim.position.set(0, 0.28, 0.85);
    group.add(trim);
  }

  group.scale.setScalar(scaleBoost);
  return group;
}

export function buildTroopModel(type: TroopType, pal: MaterialPalette): THREE.Group {
  const group = new THREE.Group();
  const def = TROOP_CATALOG[type];
  const armorMat = new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.38, metalness: 0.45 });

  addContactShadow(group, pal.contactShadow, 0.55);

  const scale = type === 'arcane_golem' ? 1.45 : type === 'sky_charger' ? 1.1 : 0.95;

  // Torso
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.22, 0.62, 8), armorMat);
  torso.position.y = 0.55;
  torso.castShadow = true;
  group.add(torso);

  // Helmet / Head
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 12, 12),
    type === 'arcane_golem' ? pal.crystal : pal.iron,
  );
  head.position.y = 1.02;
  head.castShadow = true;
  group.add(head);

  // Weapon / Crest
  if (type === 'vanguard_knight') {
    const shield = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.48, 0.36), pal.gold);
    shield.position.set(-0.3, 0.55, 0.15);
    group.add(shield);
    const sword = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.65, 0.1), pal.iron);
    sword.position.set(0.32, 0.72, 0.22);
    sword.rotation.x = 0.45;
    group.add(sword);
  } else if (type === 'ember_archer') {
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.04, 6, 12, Math.PI), pal.gold);
    bow.position.set(0.26, 0.64, 0.2);
    bow.rotation.z = -Math.PI / 2;
    group.add(bow);
  } else if (type === 'arcane_golem') {
    const shoulderL = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24, 0), pal.obsidian);
    shoulderL.position.set(-0.36, 0.85, 0);
    group.add(shoulderL);
    const shoulderR = shoulderL.clone();
    shoulderR.position.x = 0.36;
    group.add(shoulderR);
  } else if (type === 'sky_charger') {
    const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.08, 0.25), pal.gold);
    wingL.position.set(-0.35, 0.75, -0.1);
    wingL.rotation.z = 0.35;
    group.add(wingL);
    const wingR = wingL.clone();
    wingR.position.x = 0.35;
    wingR.rotation.z = -0.35;
    group.add(wingR);
  }

  group.scale.setScalar(scale);
  return group;
}

export function buildRaidBossModel(pal: MaterialPalette): THREE.Group {
  const group = new THREE.Group();
  addContactShadow(group, pal.contactShadow, 2.2);

  // Massive Obsidian legs
  for (const lx of [-0.65, 0.65]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 1.35, 8), pal.obsidian);
    leg.position.set(lx, 0.675, 0);
    leg.castShadow = true;
    group.add(leg);
  }

  // Magma-veined torso
  const torso = new THREE.Mesh(new THREE.DodecahedronGeometry(1.15, 0), pal.obsidian);
  torso.position.y = 2.05;
  torso.castShadow = true;
  group.add(torso);

  const magmaCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.68, 0), pal.magma);
  magmaCore.position.set(0, 2.05, 0.65);
  magmaCore.userData.spin = true;
  group.add(magmaCore);

  // Horned Crown Head
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 0.85), pal.obsidian);
  head.position.y = 3.35;
  head.castShadow = true;
  group.add(head);

  for (const hx of [-0.45, 0.45]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.75, 6), pal.magma);
    horn.position.set(hx, 3.85, 0);
    horn.rotation.z = hx > 0 ? -0.35 : 0.35;
    group.add(horn);
  }

  // Colossus Hammer
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.4, 8), pal.iron);
  handle.position.set(1.45, 1.9, 0.4);
  handle.rotation.x = 0.3;
  group.add(handle);

  const hammerHead = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.65, 1.1), pal.magma);
  hammerHead.position.set(1.45, 2.95, 0.72);
  hammerHead.castShadow = true;
  group.add(hammerHead);

  return group;
}
