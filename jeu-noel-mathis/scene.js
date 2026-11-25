// Scène 3D de Noël : Père Noël, jouets, cadeaux, sapin, neige (Three.js, textures générées)
import * as THREE from 'three';
import { RoomEnvironment } from './RoomEnvironment.js';
import { RoundedBoxGeometry } from './RoundedBoxGeometry.js';

/* ---------- utilitaires ---------- */
function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const R = rng(20261225);
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

function makeCanvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

export function startScene(canvas, { reducedMotion = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.6 : 1.8));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const tex = (c, { srgb = true, repeat = [1, 1] } = {}) => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = ANISO;
    return t;
  };

  /* ---------- textures procédurales ---------- */
  // Velours (manteau, bonnet)
  function velvetCanvas(base, size = 512) {
    const [c, g] = makeCanvas(size);
    g.fillStyle = base; g.fillRect(0, 0, size, size);
    for (let i = 0; i < 70; i++) {
      const x = R() * size, y = R() * size, r = 30 + R() * 90, light = R() < 0.5;
      for (const [ox, oy] of [[0, 0], [-size, 0], [0, -size], [-size, -size], [size, 0], [0, size]]) {
        const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
        gr.addColorStop(0, light ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.12)');
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
      }
    }
    const img = g.getImageData(0, 0, size, size), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (R() - 0.5) * 26;
      d[i] = clamp255(d[i] + n); d[i + 1] = clamp255(d[i + 1] + n * 0.6); d[i + 2] = clamp255(d[i + 2] + n * 0.6);
    }
    g.putImageData(img, 0, 0);
    return c;
  }
  // Fourrure / poils (barbe, bordures, nounours, sapin)
  function furCanvas(base, light, dark, strokes = 9000, size = 512, dir = Math.PI / 2, spread = 1.3, len = 10) {
    const [c, g] = makeCanvas(size);
    g.fillStyle = base; g.fillRect(0, 0, size, size);
    g.lineCap = 'round';
    for (let i = 0; i < strokes; i++) {
      const x = R() * size, y = R() * size, l = len * (0.4 + R()), a = dir + (R() - 0.5) * spread;
      g.strokeStyle = R() < 0.55 ? light : dark;
      g.globalAlpha = 0.3 + R() * 0.55;
      g.lineWidth = 0.8 + R() * 1.6;
      const dx = Math.cos(a) * l, dy = Math.sin(a) * l;
      for (const [ox, oy] of [[0, 0], [-size, 0], [0, -size], [-size, -size]]) {
        g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(x + ox + dx, y + oy + dy); g.stroke();
      }
    }
    g.globalAlpha = 1;
    return c;
  }
  // Bandes en spirale (enseigne de barbier, sucre d'orge)
  function stripesCanvas(colors, kx, ky, w = 256, h = 512, soft = 0.012) {
    const [c, g] = makeCanvas(w, h);
    const img = g.createImageData(w, h), d = img.data, cols = colors.map(hex), n = cols.length;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let t = (x / w) * kx + (y / h) * ky; t -= Math.floor(t);
      const f = t * n, k = Math.floor(f), fr = f - k;
      const a = cols[k % n], b = cols[(k + 1) % n];
      const m = fr > 1 - soft * n ? (fr - (1 - soft * n)) / (soft * n) : 0;
      const i = (y * w + x) * 4;
      d[i] = a[0] + (b[0] - a[0]) * m; d[i + 1] = a[1] + (b[1] - a[1]) * m; d[i + 2] = a[2] + (b[2] - a[2]) * m; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  }
  // Papiers cadeaux
  function paperCanvas(kind) {
    const size = 512, [c, g] = makeCanvas(size);
    if (kind === 'stripes') {
      g.fillStyle = '#0f5c3b'; g.fillRect(0, 0, size, size);
      const img = g.getImageData(0, 0, size, size), d = img.data, gold = hex('#e9c46a');
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        let t = (x + y) / 64; t -= Math.floor(t);
        if (t < 0.22) { const i = (y * size + x) * 4; d[i] = gold[0]; d[i + 1] = gold[1]; d[i + 2] = gold[2]; }
        else if (t > 0.3 && t < 0.33) { const i = (y * size + x) * 4; d[i] = 235; d[i + 1] = 245; d[i + 2] = 238; }
      }
      g.putImageData(img, 0, 0);
    } else if (kind === 'dots') {
      g.fillStyle = '#b5122c'; g.fillRect(0, 0, size, size);
      g.fillStyle = '#fff6ee';
      for (let y = 0; y <= size; y += 64) for (let x = 0; x <= size; x += 64) {
        const ox = (y / 64) % 2 ? 32 : 0;
        for (const dx of [0, -size]) { g.beginPath(); g.arc(x + ox + dx, y, 11, 0, Math.PI * 2); g.fill(); }
      }
    } else if (kind === 'stars') {
      g.fillStyle = '#132a56'; g.fillRect(0, 0, size, size);
      const star = (cx, cy, r) => {
        g.beginPath();
        for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * 0.42 : r; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
        g.closePath(); g.fill();
      };
      for (let y = 0; y <= size; y += 128) for (let x = 0; x <= size; x += 128) {
        const ox = (y / 128) % 2 ? 64 : 0;
        g.fillStyle = '#f1c75b'; for (const dx of [0, -size]) star(x + ox + dx, y, 26);
        g.fillStyle = 'rgba(255,255,255,0.8)';
        for (const dx of [0, -size]) { g.beginPath(); g.arc(x + ox + dx + 64, y + 40, 4, 0, Math.PI * 2); g.fill(); }
      }
    } else {
      g.fillStyle = '#f3e7d3'; g.fillRect(0, 0, size, size);
      for (let i = 0; i < size; i += 128) {
        g.fillStyle = 'rgba(178,18,40,0.55)'; g.fillRect(i + 20, 0, 44, size); g.fillRect(0, i + 20, size, 44);
        g.fillStyle = 'rgba(20,92,58,0.7)'; g.fillRect(i + 96, 0, 6, size); g.fillRect(0, i + 96, size, 6);
      }
    }
    return c;
  }
  function noiseCanvas(base, amp, size = 256) {
    const [c, g] = makeCanvas(size);
    g.fillStyle = base; g.fillRect(0, 0, size, size);
    const img = g.getImageData(0, 0, size, size), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const n = (R() - 0.5) * amp; d[i] = clamp255(d[i] + n); d[i + 1] = clamp255(d[i + 1] + n); d[i + 2] = clamp255(d[i + 2] + n); }
    g.putImageData(img, 0, 0);
    return c;
  }
  function radialCanvas(inner = 0.45) {
    const [c, g] = makeCanvas(256);
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, '#fff'); gr.addColorStop(inner, '#fff'); gr.addColorStop(1, '#000');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    return c;
  }

  /* ---------- matériaux ---------- */
  const velvetC = velvetCanvas('#a3121f');
  const velvet = new THREE.MeshPhysicalMaterial({
    map: tex(velvetC, { repeat: [2, 2] }), bumpMap: tex(velvetC, { srgb: false, repeat: [2, 2] }), bumpScale: 1.2,
    roughness: 0.78, sheen: 1, sheenColor: new THREE.Color('#ff7b7b'), sheenRoughness: 0.42,
  });
  const furMat = (base, light, dark, rep = 3, sheen = '#ffffff') => {
    const c = furCanvas(base, light, dark);
    return new THREE.MeshPhysicalMaterial({
      map: tex(c, { repeat: [rep, rep] }), bumpMap: tex(c, { srgb: false, repeat: [rep, rep] }), bumpScale: 2.4,
      roughness: 1, sheen: 0.7, sheenColor: new THREE.Color(sheen), sheenRoughness: 0.8,
    });
  };
  const fur = furMat('#f4f1ec', '#ffffff', '#c9c4bd', 3);
  const skin = new THREE.MeshPhysicalMaterial({ color: '#f0c2a1', roughness: 0.55, sheen: 0.35, sheenColor: new THREE.Color('#ffd9c9') });
  const cheek = new THREE.MeshPhysicalMaterial({ color: '#f08b84', roughness: 0.6, sheen: 0.3 });
  const noseMat = new THREE.MeshPhysicalMaterial({ color: '#e8877a', roughness: 0.35, clearcoat: 0.4 });
  const eye = new THREE.MeshPhysicalMaterial({ color: '#0b0b0d', roughness: 0.05, clearcoat: 1 });
  const leather = new THREE.MeshPhysicalMaterial({
    color: '#151313', roughness: 0.32, clearcoat: 0.9, clearcoatRoughness: 0.18,
    bumpMap: tex(noiseCanvas('#808080', 50), { srgb: false, repeat: [4, 4] }), bumpScale: 0.5,
  });
  const gold = new THREE.MeshStandardMaterial({ color: '#e8b95a', metalness: 1, roughness: 0.22 });
  const chrome = new THREE.MeshStandardMaterial({ color: '#eef2f7', metalness: 1, roughness: 0.1 });
  const lacquer = (color) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.12 });
  const satin = (color) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.32, sheen: 0.6, sheenColor: new THREE.Color('#ffffff'), clearcoat: 0.35 });
  const paper = (kind, rep = 1) => new THREE.MeshPhysicalMaterial({ map: tex(paperCanvas(kind), { repeat: [rep, rep] }), roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.35 });
  const wood = new THREE.MeshStandardMaterial({ map: tex(furCanvas('#6b4227', '#8a5a36', '#4a2c18', 3000, 256, 0, 0.1, 40)), roughness: 0.8 });

  /* ---------- scène ---------- */
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const world = new THREE.Group();
  scene.add(world);

  scene.add(new THREE.HemisphereLight('#c3d6ff', '#3b2a22', 0.7));
  const key = new THREE.DirectionalLight('#ffe1b5', 2.7);
  key.position.set(4.5, 8, 6.5);
  key.castShadow = true;
  key.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
  Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -3, near: 1, far: 30 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.025;
  scene.add(key);
  const rim = new THREE.DirectionalLight('#8db4ff', 1.9);
  rim.position.set(-6, 4.5, -6);
  scene.add(rim);
  const warm = new THREE.PointLight('#ff9b55', 18, 14, 2);
  warm.position.set(-2.6, 1.6, 3.2);
  scene.add(warm);

  const M = (geo, mat, o = {}) => {
    const m = new THREE.Mesh(geo, mat);
    if (o.p) m.position.set(o.p[0], o.p[1], o.p[2]);
    if (o.r) m.rotation.set(o.r[0], o.r[1], o.r[2]);
    if (o.s !== undefined) Array.isArray(o.s) ? m.scale.set(o.s[0], o.s[1], o.s[2]) : m.scale.setScalar(o.s);
    m.castShadow = o.cast !== false; m.receiveShadow = o.receive !== false;
    return m;
  };

  /* ---- sol enneigé ---- */
  const snowC = noiseCanvas('#eef3fb', 22);
  const ground = M(new THREE.CircleGeometry(8, 96), new THREE.MeshStandardMaterial({
    color: '#ffffff', map: tex(snowC, { repeat: [10, 10] }), bumpMap: tex(snowC, { srgb: false, repeat: [10, 10] }), bumpScale: 1.4,
    roughness: 0.95, alphaMap: tex(radialCanvas(0.42), { srgb: false }), transparent: true, depthWrite: false,
  }), { r: [-Math.PI / 2, 0, 0], cast: false });
  world.add(ground);
  const snowMat = new THREE.MeshStandardMaterial({ color: '#f4f8ff', map: tex(snowC, { repeat: [3, 3] }), roughness: 0.92 });
  for (const [x, z, r, sy] of [[-1.5, 0.95, 1.05, 0.34], [1.45, 1.0, 0.95, 0.3], [0, 0.3, 1.35, 0.22], [-2.7, 0.5, 0.7, 0.3], [2.4, -0.1, 0.8, 0.28]]) {
    world.add(M(new THREE.SphereGeometry(r, 40, 24), snowMat, { p: [x, -r * sy * 0.55, z], s: [1, sy, 1], cast: false }));
  }

  /* ---- Père Noël ---- */
  const santa = new THREE.Group();
  world.add(santa);
  for (const sx of [-1, 1]) {
    santa.add(M(new THREE.CylinderGeometry(0.17, 0.18, 0.32, 28), leather, { p: [0.3 * sx, 0.2, 0.04] }));
    santa.add(M(new THREE.SphereGeometry(0.19, 28, 18), leather, { p: [0.3 * sx, 0.09, 0.17], s: [1, 0.55, 1.45] }));
  }
  santa.add(M(new THREE.CylinderGeometry(0.74, 0.9, 0.8, 64, 1, true), velvet, { p: [0, 0.74, 0] }));
  santa.add(M(new THREE.SphereGeometry(0.8, 72, 54), velvet, { p: [0, 1.14, 0], s: [1, 1.02, 0.92] }));
  santa.add(M(new THREE.TorusGeometry(0.89, 0.12, 24, 80), fur, { p: [0, 0.37, 0], r: [Math.PI / 2, 0, 0] }));
  santa.add(M(new RoundedBoxGeometry(0.28, 0.66, 0.12, 4, 0.05), fur, { p: [0, 0.68, 0.81], r: [-0.2, 0, 0] }));
  santa.add(M(new THREE.SphereGeometry(1, 40, 30), fur, { p: [0, 1.32, 0.64], s: [0.15, 0.5, 0.12] }));
  santa.add(M(new THREE.TorusGeometry(0.79, 0.078, 18, 90), leather, { p: [0, 1.0, 0], r: [Math.PI / 2, 0, 0], s: [1, 0.92, 1] }));
  const buckle = new THREE.Group();
  buckle.position.set(0, 1.0, 0.79);
  buckle.add(M(new RoundedBoxGeometry(0.36, 0.28, 0.06, 3, 0.025), gold));
  buckle.add(M(new THREE.BoxGeometry(0.2, 0.13, 0.075), leather));
  santa.add(buckle);
  santa.add(M(new THREE.TorusGeometry(0.42, 0.14, 22, 60), fur, { p: [0, 1.86, 0.02], r: [Math.PI / 2, 0, 0] }));

  const head = new THREE.Group();
  head.position.set(0, 2.1, 0.05);
  santa.add(head);
  head.add(M(new THREE.SphereGeometry(0.4, 56, 42), skin));
  for (const sx of [-1, 1]) {
    head.add(M(new THREE.SphereGeometry(0.09, 20, 16), skin, { p: [0.39 * sx, 0, -0.02], s: [0.55, 1, 0.8] }));
    head.add(M(new THREE.SphereGeometry(0.05, 24, 18), eye, { p: [0.135 * sx, 0.08, 0.35] }));
    head.add(M(new THREE.CapsuleGeometry(0.038, 0.12, 6, 14), fur, { p: [0.145 * sx, 0.19, 0.335], r: [0, 0, Math.PI / 2 - 0.2 * sx] }));
    head.add(M(new THREE.SphereGeometry(0.1, 24, 18), cheek, { p: [0.215 * sx, -0.02, 0.29], s: [1, 0.78, 0.6] }));
    head.add(M(new THREE.CapsuleGeometry(0.075, 0.2, 8, 18), fur, { p: [0.135 * sx, -0.1, 0.36], r: [0, 0, Math.PI / 2 - 0.38 * sx] }));
  }
  head.add(M(new THREE.SphereGeometry(0.088, 28, 20), noseMat, { p: [0, 0.0, 0.41] }));

  // Barbe : base + touffes
  const beard = new THREE.Group();
  beard.position.set(0, 1.8, 0.2);
  santa.add(beard);
  const BX = 0.5, BY = 0.6, BZ = 0.33;
  beard.add(M(new THREE.SphereGeometry(1, 48, 36), fur, { s: [BX * 0.9, BY * 0.88, BZ * 0.9], p: [0, -0.04, 0] }));
  const puffCount = 130;
  const puffs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 3), fur, puffCount);
  puffs.castShadow = true; puffs.receiveShadow = true;
  {
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), e = new THREE.Euler();
    let placed = 0, guard = 0;
    while (placed < puffCount && guard++ < 5000) {
      const th = (R() - 0.5) * 2.6, ph = -1.4 + R() * 1.75;
      const y = BY * Math.sin(ph);
      if (y > 0.02 && Math.abs(th) < 0.85) continue; // laisse la bouche dégagée
      v.set(BX * Math.sin(th) * Math.cos(ph), y, BZ * Math.cos(th) * Math.cos(ph));
      const r = 0.065 + R() * 0.06;
      sc.set(r, r * 1.15, r);
      q.setFromEuler(e.set(R() * 3, R() * 3, R() * 3));
      m4.compose(v, q, sc);
      puffs.setMatrixAt(placed++, m4);
    }
    puffs.count = placed;
  }
  beard.add(puffs);

  // Bonnet
  const hat = new THREE.Group();
  hat.position.set(0, 2.4, 0.03);
  hat.rotation.set(-0.12, 0, -0.1);
  santa.add(hat);
  hat.add(M(new THREE.TorusGeometry(0.41, 0.115, 22, 70), fur, { r: [Math.PI / 2, 0, 0] }));
  const coneGeo = new THREE.ConeGeometry(0.4, 1.0, 56, 24, true);
  {
    const p = coneGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i), t = y + 0.5;
      p.setX(i, p.getX(i) + t * t * 0.55);
      p.setY(i, y - t * t * 0.18);
    }
    coneGeo.computeVertexNormals();
  }
  hat.add(M(coneGeo, velvet, { p: [0, 0.5, 0] }));
  const pompom = M(new THREE.SphereGeometry(0.14, 36, 28), fur, { p: [0.56, 0.84, 0] });
  hat.add(pompom);

  // Bras
  const arms = [];
  for (const sx of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(0.66 * sx, 1.62, 0.05);
    santa.add(pivot);
    pivot.add(M(new THREE.CapsuleGeometry(0.175, 0.5, 10, 24), velvet, { p: [0, -0.36, 0] }));
    pivot.add(M(new THREE.TorusGeometry(0.17, 0.08, 16, 36), fur, { p: [0, -0.69, 0], r: [Math.PI / 2, 0, 0] }));
    pivot.add(M(new THREE.SphereGeometry(0.15, 30, 22), leather, { p: [0, -0.85, 0], s: [1, 1.12, 0.9] }));
    pivot.add(M(new THREE.SphereGeometry(0.065, 18, 14), leather, { p: [-0.11 * sx, -0.77, 0.06] }));
    arms.push(pivot);
  }
  arms[0].rotation.set(0.15, 0, -0.38);
  arms[1].rotation.set(-0.25, 0, 2.45);

  /* ---- Cadeaux ---- */
  function gift(w, h, d, kind, ribbon) {
    const g = new THREE.Group();
    g.add(M(new RoundedBoxGeometry(w, h, d, 4, 0.035), paper(kind, Math.max(1, Math.round(w * 1.6))), { p: [0, h / 2, 0] }));
    const rib = satin(ribbon);
    g.add(M(new THREE.BoxGeometry(w + 0.014, h + 0.014, d * 0.14), rib, { p: [0, h / 2, 0] }));
    g.add(M(new THREE.BoxGeometry(w * 0.14, h + 0.016, d + 0.016), rib, { p: [0, h / 2, 0] }));
    const loop = new THREE.TorusGeometry(w * 0.15, w * 0.042, 14, 36);
    g.add(M(loop, rib, { p: [-w * 0.12, h + w * 0.09, 0], r: [0, 0.35, 0.55], s: [1.15, 0.8, 1] }));
    g.add(M(loop, rib, { p: [w * 0.12, h + w * 0.09, 0], r: [0, -0.35, -0.55], s: [1.15, 0.8, 1] }));
    g.add(M(new THREE.SphereGeometry(w * 0.065, 18, 14), rib, { p: [0, h + w * 0.04, 0] }));
    return g;
  }
  const gA = gift(0.86, 0.8, 0.86, 'stripes', '#e8c068'); gA.position.set(-1.5, 0, 0.9); gA.rotation.y = 0.35; world.add(gA);
  const gB = gift(0.5, 0.44, 0.5, 'dots', '#f2d27a'); gB.position.set(-1.46, 0.8, 0.86); gB.rotation.y = -0.25; world.add(gB);
  const gC = gift(0.72, 0.66, 0.72, 'stars', '#d42a3a'); gC.position.set(1.45, 0, 0.95); gC.rotation.y = -0.4; world.add(gC);
  const gD = gift(0.42, 0.38, 0.42, 'tartan', '#1f7a4c'); gD.position.set(0.82, 0, 1.68); gD.rotation.y = 0.6; world.add(gD);

  /* ---- Nounours ---- */
  {
    const brown = furMat('#8a5a35', '#a8774c', '#5e3a20', 2, '#ffd9b0');
    const tan = furMat('#d9b48a', '#ecd0ac', '#b48b62', 2, '#fff0dd');
    const t = new THREE.Group();
    t.add(M(new THREE.SphereGeometry(0.42, 40, 30), brown, { p: [0, 0.45, 0], s: [1, 1.08, 0.95] }));
    t.add(M(new THREE.SphereGeometry(0.28, 32, 24), tan, { p: [0, 0.43, 0.27], s: [1, 1.08, 0.5] }));
    t.add(M(new THREE.SphereGeometry(0.33, 40, 30), brown, { p: [0, 1.05, 0.02] }));
    t.add(M(new THREE.SphereGeometry(0.14, 28, 20), tan, { p: [0, 0.97, 0.3], s: [1.2, 0.9, 1] }));
    t.add(M(new THREE.SphereGeometry(0.052, 18, 14), eye, { p: [0, 1.02, 0.43], s: [1.2, 0.85, 1] }));
    for (const sx of [-1, 1]) {
      t.add(M(new THREE.SphereGeometry(0.04, 16, 12), eye, { p: [0.12 * sx, 1.13, 0.28] }));
      t.add(M(new THREE.SphereGeometry(0.12, 24, 18), brown, { p: [0.25 * sx, 1.32, 0], s: [1, 1, 0.6] }));
      t.add(M(new THREE.SphereGeometry(0.07, 18, 14), tan, { p: [0.25 * sx, 1.32, 0.05], s: [1, 1, 0.4] }));
      t.add(M(new THREE.CapsuleGeometry(0.11, 0.26, 8, 16), brown, { p: [0.42 * sx, 0.62, 0.12], r: [0.3, 0, 0.65 * sx] }));
      t.add(M(new THREE.CapsuleGeometry(0.13, 0.22, 8, 16), brown, { p: [0.22 * sx, 0.15, 0.3], r: [Math.PI / 2, 0, 0] }));
      t.add(M(new THREE.SphereGeometry(0.1, 20, 16), tan, { p: [0.22 * sx, 0.15, 0.5], s: [1, 1, 0.35] }));
    }
    t.add(M(new THREE.TorusGeometry(0.25, 0.07, 14, 40), satin('#c81e32'), { p: [0, 0.8, 0.02], r: [Math.PI / 2, 0, 0] }));
    t.add(M(new RoundedBoxGeometry(0.12, 0.3, 0.05, 2, 0.02), satin('#c81e32'), { p: [0.12, 0.63, 0.25], r: [0.2, 0, 0.25] }));
    t.position.set(-0.78, 0, 1.6); t.rotation.y = 0.4; t.scale.setScalar(0.62);
    world.add(t);
  }

  /* ---- Casse-noisette (soldat en bois) ---- */
  {
    const red = lacquer('#c41a2b'), white = lacquer('#f3efe6'), black = lacquer('#111111'), green = lacquer('#0f5a3a');
    const n = new THREE.Group();
    n.add(M(new THREE.CylinderGeometry(0.38, 0.4, 0.12, 40), green, { p: [0, 0.06, 0] }));
    for (const sx of [-1, 1]) {
      n.add(M(new THREE.CylinderGeometry(0.1, 0.1, 0.55, 24), white, { p: [0.12 * sx, 0.45, 0] }));
      n.add(M(new THREE.CylinderGeometry(0.115, 0.12, 0.22, 24), black, { p: [0.12 * sx, 0.23, 0.01] }));
      n.add(M(new THREE.CylinderGeometry(0.075, 0.075, 0.55, 20), red, { p: [0.36 * sx, 1.02, 0], r: [0, 0, 0.12 * sx] }));
      n.add(M(new THREE.SphereGeometry(0.085, 20, 16), white, { p: [0.39 * sx, 0.72, 0] }));
      n.add(M(new THREE.SphereGeometry(0.1, 20, 16), gold, { p: [0.3 * sx, 1.3, 0], s: [1.2, 0.5, 1] }));
      n.add(M(new THREE.SphereGeometry(0.03, 14, 10), eye, { p: [0.075 * sx, 1.55, 0.2] }));
      n.add(M(new THREE.SphereGeometry(0.05, 16, 12), cheek, { p: [0.12 * sx, 1.47, 0.18], s: [1, 0.8, 0.5] }));
      n.add(M(new THREE.CapsuleGeometry(0.035, 0.12, 6, 12), black, { p: [0.08 * sx, 1.43, 0.215], r: [0, 0, Math.PI / 2 - 0.4 * sx] }));
    }
    n.add(M(new THREE.CylinderGeometry(0.29, 0.31, 0.66, 40), red, { p: [0, 1.0, 0] }));
    n.add(M(new THREE.CylinderGeometry(0.315, 0.315, 0.08, 40), black, { p: [0, 0.73, 0] }));
    n.add(M(new RoundedBoxGeometry(0.12, 0.1, 0.04, 2, 0.015), gold, { p: [0, 0.73, 0.31] }));
    for (const y of [0.88, 1.0, 1.12, 1.24]) n.add(M(new THREE.SphereGeometry(0.03, 14, 10), gold, { p: [0, y, 0.3] }));
    n.add(M(new THREE.CylinderGeometry(0.21, 0.22, 0.38, 32), skin, { p: [0, 1.5, 0] }));
    n.add(M(new THREE.SphereGeometry(0.035, 14, 10), noseMat, { p: [0, 1.5, 0.22] }));
    n.add(M(new RoundedBoxGeometry(0.16, 0.06, 0.03, 2, 0.01), white, { p: [0, 1.37, 0.21] }));
    n.add(M(new THREE.CylinderGeometry(0.235, 0.225, 0.48, 32), black, { p: [0, 1.92, 0] }));
    n.add(M(new THREE.CylinderGeometry(0.24, 0.24, 0.07, 32), gold, { p: [0, 1.72, 0] }));
    n.add(M(new THREE.ConeGeometry(0.07, 0.3, 16), lacquer('#e8c068'), { p: [0, 2.3, 0] }));
    n.position.set(2.2, 0, -0.3); n.rotation.y = -0.45; n.scale.setScalar(0.92);
    world.add(n);
  }

  /* ---- Enseigne de barbier ---- */
  const poleTex = tex(stripesCanvas(['#d42232', '#f7f7f7', '#1f4fb8', '#f7f7f7'], 1, 3), { repeat: [1, 1] });
  {
    const p = new THREE.Group();
    p.add(M(new THREE.CylinderGeometry(0.3, 0.34, 0.06, 40), chrome, { p: [0, 0.03, 0] }));
    p.add(M(new THREE.CylinderGeometry(0.055, 0.055, 0.6, 20), chrome, { p: [0, 0.33, 0] }));
    p.add(M(new THREE.CylinderGeometry(0.2, 0.22, 0.12, 40), chrome, { p: [0, 0.68, 0] }));
    p.add(M(new THREE.CylinderGeometry(0.16, 0.16, 1.3, 56, 1, true),
      new THREE.MeshStandardMaterial({ map: poleTex, emissiveMap: poleTex, emissive: '#ffffff', emissiveIntensity: 0.35, roughness: 0.35 }),
      { p: [0, 1.39, 0] }));
    p.add(M(new THREE.CylinderGeometry(0.195, 0.195, 1.32, 56, 1, true),
      new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.22, roughness: 0.04, clearcoat: 1, depthWrite: false }),
      { p: [0, 1.39, 0], cast: false }));
    p.add(M(new THREE.CylinderGeometry(0.22, 0.2, 0.12, 40), chrome, { p: [0, 2.1, 0] }));
    p.add(M(new THREE.SphereGeometry(0.18, 36, 24), chrome, { p: [0, 2.18, 0], s: [1, 0.8, 1] }));
    p.position.set(-2.55, 0, -0.35);
    world.add(p);
  }

  /* ---- Sapin ---- */
  const lightsA = new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: '#ffd36b', emissiveIntensity: 2 });
  const lightsB = new THREE.MeshStandardMaterial({ color: '#ffe0e0', emissive: '#ff8a5c', emissiveIntensity: 2 });
  const starMesh = (() => {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + Math.PI / 2, rr = i % 2 ? 0.1 : 0.24;
      i ? s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.02, bevelSegments: 3 });
    g.center();
    return M(g, new THREE.MeshStandardMaterial({ color: '#ffd66b', emissive: '#ffb02e', emissiveIntensity: 0.9, metalness: 0.6, roughness: 0.28 }));
  })();
  {
    const needles = furMat('#1b5a37', '#2f8552', '#0c3220', 4, '#9fe0b4');
    const tr = new THREE.Group();
    tr.add(M(new THREE.CylinderGeometry(0.12, 0.16, 0.42, 18), wood, { p: [0, 0.21, 0] }));
    const layers = [[1.15, 1.25, 0.8], [0.92, 1.1, 1.4], [0.66, 0.95, 1.95], [0.4, 0.78, 2.45]];
    for (const [r, h, y] of layers) tr.add(M(new THREE.ConeGeometry(r, h, 48, 6), needles, { p: [0, y, 0] }));
    const rAt = (y) => {
      let best = 0;
      for (const [r, h, yc] of layers) { const y0 = yc - h / 2; if (y >= y0 && y <= yc + h / 2) best = Math.max(best, r * (1 - (y - y0) / h)); }
      return best;
    };
    const bulb = new THREE.SphereGeometry(0.042, 12, 10);
    for (let i = 0; i < 44; i++) {
      const f = i / 44, y = 0.35 + f * 2.35, a = f * Math.PI * 2 * 5.5, r = rAt(y) + 0.02;
      tr.add(M(bulb, i % 2 ? lightsA : lightsB, { p: [Math.cos(a) * r, y, Math.sin(a) * r], cast: false }));
    }
    const baubleMats = [lacquer('#c81e32'), new THREE.MeshStandardMaterial({ color: '#e8b95a', metalness: 1, roughness: 0.2 }), lacquer('#d9e6ff')];
    for (let i = 0; i < 14; i++) {
      const f = (i + 0.5) / 14, y = 0.45 + f * 2.0, a = i * 2.4, r = rAt(y) - 0.02;
      tr.add(M(new THREE.SphereGeometry(0.085, 20, 16), baubleMats[i % 3], { p: [Math.cos(a) * r, y - 0.05, Math.sin(a) * r] }));
    }
    starMesh.position.set(0, 2.98, 0);
    tr.add(starMesh);
    tr.position.set(-1.55, 0, -1.7);
    tr.scale.setScalar(1.08);
    world.add(tr);
  }

  /* ---- Sucre d'orge ---- */
  {
    const caneTex = tex(stripesCanvas(['#d42232', '#fbfbfb'], 1, 1, 256, 256, 0.02), { repeat: [14, 1] });
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.7, 0), new THREE.Vector3(0, 1.2, 0),
      new THREE.Vector3(0.07, 1.42, 0), new THREE.Vector3(0.26, 1.52, 0), new THREE.Vector3(0.44, 1.42, 0), new THREE.Vector3(0.5, 1.24, 0),
    ]);
    const caneMat = new THREE.MeshPhysicalMaterial({ map: caneTex, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 });
    const cane = new THREE.Group();
    cane.add(M(new THREE.TubeGeometry(curve, 96, 0.055, 18, false), caneMat));
    cane.add(M(new THREE.SphereGeometry(0.055, 18, 14), caneMat, { p: [0.5, 1.24, 0] }));
    cane.position.set(1.95, 0, 1.2); cane.rotation.set(0, -0.6, -0.28);
    world.add(cane);
  }

  /* ---- Boules flottantes ---- */
  const floaters = [];
  function ornament(color, metal) {
    const g = new THREE.Group();
    g.add(M(new THREE.SphereGeometry(0.22, 40, 30), new THREE.MeshPhysicalMaterial({ color, metalness: metal, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 })));
    g.add(M(new THREE.CylinderGeometry(0.06, 0.065, 0.08, 20), gold, { p: [0, 0.23, 0] }));
    g.add(M(new THREE.TorusGeometry(0.035, 0.011, 8, 20), gold, { p: [0, 0.29, 0] }));
    g.add(M(new THREE.CylinderGeometry(0.004, 0.004, 2.2, 6), gold, { p: [0, 1.4, 0], cast: false }));
    return g;
  }
  for (const [c, m, x, y, z] of [['#c4182b', 0.35, -2.25, 3.0, 0.7], ['#e2b04f', 0.9, 2.45, 2.85, 0.55], ['#15724a', 0.4, -0.9, 3.45, -0.4], ['#cfe0ff', 0.6, 1.35, 3.5, -0.6]]) {
    const o = ornament(c, m); o.position.set(x, y, z); world.add(o);
    floaters.push({ o, y, ph: R() * 6 });
  }

  /* ---- Ciseaux de barbier ---- */
  const scissors = new THREE.Group();
  const halves = [];
  {
    const blade = new THREE.Shape();
    blade.moveTo(-0.035, 0); blade.lineTo(0.05, 0);
    blade.quadraticCurveTo(0.055, 0.55, 0.0, 0.95);
    blade.quadraticCurveTo(-0.03, 0.5, -0.035, 0);
    const bladeGeo = new THREE.ExtrudeGeometry(blade, { depth: 0.022, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2 });
    for (const sx of [1, -1]) {
      const h = new THREE.Group();
      h.add(M(bladeGeo, chrome, { p: [0, 0, sx > 0 ? 0.008 : -0.032] }));
      h.add(M(new RoundedBoxGeometry(0.06, 0.3, 0.035, 2, 0.012), chrome, { p: [0.0, -0.15, sx > 0 ? 0.02 : -0.02] }));
      h.add(M(new THREE.TorusGeometry(0.11, 0.028, 14, 40), gold, { p: [0.04, -0.4, sx > 0 ? 0.02 : -0.02] }));
      h.scale.x = sx;
      scissors.add(h);
      halves.push(h);
    }
    scissors.add(M(new THREE.CylinderGeometry(0.035, 0.035, 0.09, 18), gold, { r: [Math.PI / 2, 0, 0] }));
    scissors.position.set(0.98, 2.55, 0.85);
    scissors.rotation.set(0.2, -0.3, -0.5);
    scissors.scale.setScalar(0.85);
    world.add(scissors);
  }

  /* ---- Neige ---- */
  const flakeC = (() => {
    const [c, g] = makeCanvas(64);
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.65)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return c;
  })();
  const NF = small ? 420 : 900;
  const fPos = new Float32Array(NF * 3), fSpd = new Float32Array(NF), fPh = new Float32Array(NF);
  for (let i = 0; i < NF; i++) {
    fPos[i * 3] = (R() - 0.5) * 13; fPos[i * 3 + 1] = R() * 7.5; fPos[i * 3 + 2] = (R() - 0.5) * 9;
    fSpd[i] = 0.25 + R() * 0.45; fPh[i] = R() * 6.28;
  }
  const fGeo = new THREE.BufferGeometry();
  fGeo.setAttribute('position', new THREE.BufferAttribute(fPos, 3));
  const flakes = new THREE.Points(fGeo, new THREE.PointsMaterial({ size: 0.075, map: tex(flakeC), transparent: true, depthWrite: false, opacity: 0.95 }));
  world.add(flakes);

  /* ---------- caméra & mise en page ---------- */
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const base = new THREE.Vector3(), target = new THREE.Vector3(), look = new THREE.Vector3();
  let wide = false;
  const pointer = { x: 0, y: 0, cx: 0, cy: 0 };

  function layout() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    wide = w / h > 1.2 && w >= 900;
    if (wide) {
      world.scale.setScalar(1);
      // place la scène dans l'espace libre à droite du texte
      const textRight = Math.max(24, (w - 1180) / 2 + 24) + 560;
      const free = Math.max(320, w - textRight - 30);
      const center = textRight + 30 + free / 2;
      const d = Math.max(12.2, (6.4 * h) / (2 * Math.tan(THREE.MathUtils.degToRad(15)) * free));
      base.set(0, 1.55 + 0.75 * (d / 12.8), d); target.set(0.05, 1.55, 0);
      camera.setViewOffset(w, h, -(center - w / 2), -h * 0.035, w, h);
    } else {
      world.scale.setScalar(0.9);
      base.set(0, 2.15, 10.6); target.set(-0.1, 1.42, 0);
      camera.clearViewOffset();
    }
    camera.updateProjectionMatrix();
    camera.position.copy(base); camera.lookAt(target);
    if (reducedMotion) render();
  }

  function render() { renderer.render(scene, camera); }

  /* ---------- animation ---------- */
  const clock = new THREE.Clock();
  let t = 0, running = false, visible = true, raf = 0;

  function update(dt) {
    t += dt;
    santa.rotation.y = Math.sin(t * 0.6) * 0.09;
    arms[1].rotation.z = 2.45 + Math.sin(t * 4.2) * 0.17;
    head.rotation.set(0, Math.sin(t * 0.8) * 0.1, Math.sin(t * 1.3) * 0.035);
    hat.rotation.z = -0.1 + Math.sin(t * 2.1) * 0.035;
    const open = 0.05 + 0.42 * Math.pow(Math.abs(Math.sin(t * 1.7)), 3);
    halves[0].rotation.z = open / 2; halves[1].rotation.z = -open / 2;
    scissors.position.y = 2.55 + Math.sin(t * 1.1) * 0.08;
    scissors.rotation.y = -0.3 + Math.sin(t * 0.7) * 0.25;
    for (const f of floaters) { f.o.position.y = f.y + Math.sin(t * 0.9 + f.ph) * 0.09; f.o.rotation.y += dt * 0.4; }
    poleTex.offset.y = (poleTex.offset.y - dt * 0.12) % 1;
    lightsA.emissiveIntensity = 1.4 + Math.sin(t * 2.6) * 0.9;
    lightsB.emissiveIntensity = 1.4 + Math.sin(t * 2.6 + Math.PI) * 0.9;
    starMesh.rotation.y = Math.sin(t * 0.8) * 0.5;
    const p = fGeo.attributes.position.array;
    for (let i = 0; i < NF; i++) {
      p[i * 3 + 1] -= fSpd[i] * dt;
      p[i * 3] += Math.sin(t * 0.8 + fPh[i]) * 0.12 * dt;
      if (p[i * 3 + 1] < 0) { p[i * 3 + 1] = 7.5; p[i * 3] = (R() - 0.5) * 13; }
    }
    fGeo.attributes.position.needsUpdate = true;
    // parallaxe douce
    pointer.cx += (pointer.x - pointer.cx) * Math.min(1, dt * 3);
    pointer.cy += (pointer.y - pointer.cy) * Math.min(1, dt * 3);
    const sway = wide ? 0 : Math.sin(t * 0.25) * 0.35;
    camera.position.set(base.x + pointer.cx * 0.7 + sway, base.y + pointer.cy * 0.35, base.z);
    look.copy(target);
    camera.lookAt(look);
  }

  function loop() {
    raf = 0;
    if (!running) return;
    update(Math.min(clock.getDelta(), 0.05));
    render();
    raf = requestAnimationFrame(loop);
  }
  function setRunning(on) {
    on = on && !reducedMotion;
    if (on === running) return;
    running = on;
    if (on) { clock.getDelta(); if (!raf) raf = requestAnimationFrame(loop); }
  }

  window.addEventListener('pointermove', (e) => {
    if (!wide) return;
    pointer.x = (e.clientX / window.innerWidth - 0.5) * 2;
    pointer.y = -(e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  const ro = new ResizeObserver(() => layout());
  ro.observe(canvas);
  const io = new IntersectionObserver((es) => { visible = es[0].isIntersecting; setRunning(visible && !document.hidden); });
  io.observe(canvas);
  document.addEventListener('visibilitychange', () => setRunning(visible && !document.hidden));

  layout();
  update(0.016);
  render();
  setRunning(true);

  return { render, layout, renderer, camera, setTime: (s) => { t = s; update(0); render(); } };
}
