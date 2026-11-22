import * as THREE from 'three';

export function createGrassGridTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Rich stylized emerald-meadow checkerboard with subtle grass texture
  const cells = 13;
  const cellSize = size / cells;

  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      const even = (x + y) % 2 === 0;
      ctx.fillStyle = even ? '#3d8b4d' : '#357d44';
      ctx.fillRect(x * cellSize, y * cellSize, cellSize + 0.5, cellSize + 0.5);

      // Subtle inner tile highlight for base-building readability
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x * cellSize + 1, y * cellSize + 1, cellSize - 2, cellSize - 2);
    }
  }

  // Organic grass blades speckle
  for (let i = 0; i < 1400; i++) {
    const px = Math.random() * size;
    const py = Math.random() * size;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(134, 239, 172, 0.12)' : 'rgba(20, 83, 45, 0.14)';
    ctx.fillRect(px, py, 2, 3);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createStoneTexture(maxAnisotropy: number, baseHex = '#cbd5e1', mortarHex = '#64748b'): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = mortarHex;
  ctx.fillRect(0, 0, size, size);

  const rows = 6;
  const cols = 4;
  const rh = size / rows;
  const cw = size / cols;

  for (let r = 0; r < rows; r++) {
    const offset = r % 2 === 0 ? 0 : cw * 0.5;
    for (let c = -1; c <= cols; c++) {
      ctx.fillStyle = baseHex;
      ctx.fillRect(c * cw + offset + 3, r * rh + 3, cw - 6, rh - 6);
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.fillRect(c * cw + offset + 3, r * rh + 3, cw - 6, 4);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(2, 6, 23, 0.52)');
  grad.addColorStop(0.6, 'rgba(2, 6, 23, 0.2)');
  grad.addColorStop(1, 'rgba(2, 6, 23, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
