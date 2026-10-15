/* The 3D camera coverage map: one column per half-degree square (about 35 x 30 miles), height and
   colour by how many cameras volunteers have mapped there. Data comes from assets/data/coverage.json,
   which scripts/build-coverage.mjs writes.

   Markup: <div class="covmap" data-state="ohio" data-chips> with an <img class="covmap-poster"> inside.
   The picture stays up until the first frame is drawn, and stays for good where WebGL isn't available.

   Controls: drag to move the map, right-drag (or Shift-drag) to spin and tilt, scroll or pinch to zoom,
   two fingers twist to spin. Clicking a column opens that state's page. */
const DATA_URL = '/assets/data/coverage.json';
const W = 975, H = 610, CX = W / 2, CY = H / 2;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmt = (n) => n.toLocaleString('en-US');

let dataPromise;
export function loadCoverage() {
  dataPromise ??= fetch(DATA_URL).then((r) => { if (!r.ok) throw new Error('coverage ' + r.status); return r.json(); });
  return dataPromise;
}

const PRESETS = {
  us:    { yaw: -0.25, pitch: 0.95, dist: 1050, tx: 0, tz: 40 },
  west:  { yaw: 0.35, pitch: 0.75, dist: 560, tx: -300, tz: -20 },
  mid:   { yaw: -0.1, pitch: 0.8, dist: 560, tx: 60, tz: -60 },
  south: { yaw: -0.3, pitch: 0.75, dist: 600, tx: 60, tz: 140 },
  east:  { yaw: -0.6, pitch: 0.75, dist: 460, tx: 330, tz: -100 },
};

function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

export async function mount(el) {
  if (!hasWebGL()) return null;
  const [THREE, data] = await Promise.all([import('/assets/vendor/three.module.min.js'), loadCoverage()]);
  const focusSlug = el.dataset.state || null;
  const focus = focusSlug ? data.stateList.findIndex((s) => s[1] === focusSlug) : -1;

  const canvas = document.createElement('canvas');
  canvas.className = 'covmap-canvas';
  canvas.setAttribute('aria-label', el.dataset.label || 'Interactive 3D map of mapped license plate cameras. Taller, brighter columns mean more cameras.');
  canvas.setAttribute('role', 'img');
  el.prepend(canvas);
  el.setAttribute('data-lenis-prevent', ''); // the page's smooth scrolling would otherwise eat the wheel
  const tip = document.createElement('div');
  tip.className = 'covmap-tip'; tip.hidden = true; el.append(tip);

  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); }
  catch { canvas.remove(); return null; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0a0c10, 900, 1900);
  const camera = new THREE.PerspectiveCamera(38, 1, 1, 5000);
  const toX = (x) => x - CX, toZ = (y) => y - CY;

  function addLines(list, color, y) {
    const pos = [];
    for (const l of list) for (let i = 0; i < l.length - 2; i += 2) pos.push(toX(l[i]), y, toZ(l[i + 1]), toX(l[i + 2]), y, toZ(l[i + 3]));
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    scene.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color })));
  }
  addLines(data.outline.inner, 0x2b3a52, 0.3);
  addLines(data.outline.outer, 0x4a6386, 0.4);
  const grid = new THREE.GridHelper(1800, 72, 0x111827, 0x0e1420); grid.position.y = -0.5; scene.add(grid);

  const cells = data.cells, maxN = cells.reduce((m, c) => Math.max(m, c[2]), 1);
  const box = new THREE.BoxGeometry(1, 1, 1); box.translate(0, 0.5, 0);
  const mesh = new THREE.InstancedMesh(box, new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.1 }), cells.length);
  const m4 = new THREE.Matrix4(), col = new THREE.Color(), dim = new THREE.Color(0x283244);
  const stops = [[0, 0x1e3a8a], [0.35, 0x3b82f6], [0.7, 0xf87171], [1, 0xfbbf24]].map(([t, c]) => [t, new THREE.Color(c)]);
  function ramp(t) {
    for (let i = 1; i < stops.length; i++) if (t <= stops[i][0]) {
      const [a, ca] = stops[i - 1], [b, cb] = stops[i]; return col.copy(ca).lerp(cb, (t - a) / (b - a));
    }
    return col.copy(stops[3][1]);
  }
  // On a state page the scale follows that state, so a small state still reads as a landscape.
  const scaleMax = focus >= 0 ? cells.reduce((m, c) => (c[3] === focus ? Math.max(m, c[2]) : m), 1) : maxN;
  const heights = cells.map((c) => 2 + 150 * Math.sqrt(Math.min(1, c[2] / scaleMax)) * (focus >= 0 && c[3] !== focus ? 0.12 : 1));
  const grow = { k: reduce ? 1 : 0 };
  function placeColumns() {
    for (let i = 0; i < cells.length; i++) {
      m4.makeScale(5.2, Math.max(0.6, heights[i] * grow.k), 5.2); m4.setPosition(toX(cells[i][0]), 0, toZ(cells[i][1]));
      mesh.setMatrixAt(i, m4);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  cells.forEach((c, i) => mesh.setColorAt(i, focus >= 0 && c[3] !== focus ? dim : ramp(Math.pow(Math.min(1, c[2] / scaleMax), 0.45))));
  placeColumns(); scene.add(mesh);
  scene.add(new THREE.HemisphereLight(0xbfd4ff, 0x0a0c10, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4); sun.position.set(-300, 600, 400); scene.add(sun);

  // Camera: an orbit around a target on the ground, eased toward `goal`.
  function frameState(i) {
    const s = data.stateList[i], [x0, y0, x1, y1] = s.slice(5);
    const span = Math.max(x1 - x0, (y1 - y0) * 1.3, 60);
    return { yaw: -0.15, pitch: 1.0, dist: Math.min(1300, span * 2.8 + 180), tx: (x0 + x1) / 2 - CX, tz: (y0 + y1) / 2 - CY + span * 0.08 };
  }
  const start = focus >= 0 ? frameState(focus) : PRESETS.us;
  const view = Object.assign({}, start, focus >= 0 ? {} : { dist: start.dist * 1.25, yaw: start.yaw - 0.35 });
  const goal = Object.assign({}, start);
  let idle = 0;
  const fly = (p) => { Object.assign(goal, p); idle = 0; };

  // Pointer controls.
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitV = new THREE.Vector3();
  const pts = new Map();
  let mode = null, lx = 0, ly = 0, moved = 0, last2 = null;
  function setNdc(x, y) { const r = canvas.getBoundingClientRect(); ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); }
  function ground(x, y) { setNdc(x, y); return ray.ray.intersectPlane(plane, hitV) ? hitV.clone() : null; }
  function pick(x, y) { setNdc(x, y); const h = ray.intersectObject(mesh)[0]; return h ? h.instanceId : -1; }
  function pair() { const [a, b] = [...pts.values()]; return { d: Math.hypot(b.x - a.x, b.y - a.y), ang: Math.atan2(b.y - a.y, b.x - a.x), my: (a.y + b.y) / 2 }; }
  const clampPitch = (p) => Math.min(1.45, Math.max(0.35, p));
  const unpress = () => el.querySelectorAll('[data-fly]').forEach((b) => b.setAttribute('aria-pressed', 'false'));

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    lx = e.clientX; ly = e.clientY; moved = 0; idle = 0; tip.hidden = true;
    if (pts.size === 2) { mode = 'two'; last2 = pair(); } else mode = e.button === 2 || e.shiftKey || e.ctrlKey ? 'spin' : 'pan';
  });
  const end = (e) => {
    const wasTap = mode === 'pan' && moved < 6 && pts.size === 1;
    pts.delete(e.pointerId);
    if (wasTap && e.type === 'pointerup') {
      const i = pick(e.clientX, e.clientY);
      if (i >= 0) { const s = data.stateList[cells[i][3]]; if (s && s[1] !== focusSlug) location.href = '/states/' + s[1] + '/'; }
    }
    mode = pts.size === 1 ? 'pan' : null;
    if (pts.size === 1) { const p = [...pts.values()][0]; lx = p.x; ly = p.y; }
  };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', () => { if (!mode) tip.hidden = true; });
  canvas.addEventListener('pointermove', (e) => {
    if (!mode) { hover(e); return; }
    if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    idle = 0;
    if (mode === 'two' && pts.size === 2) {
      const now = pair();
      goal.dist = Math.min(1600, Math.max(140, goal.dist * last2.d / Math.max(1, now.d)));
      goal.yaw -= now.ang - last2.ang;
      goal.pitch = clampPitch(goal.pitch + (now.my - last2.my) * 0.004);
      last2 = now; moved += 10; return;
    }
    const dx = e.clientX - lx, dy = e.clientY - ly;
    moved += Math.abs(dx) + Math.abs(dy);
    if (mode === 'pan') {
      const a = ground(lx, ly), b = ground(e.clientX, e.clientY);
      if (a && b) { const mx = a.x - b.x, mz = a.z - b.z; view.tx += mx; goal.tx += mx; view.tz += mz; goal.tz += mz; }
      if (moved > 6) unpress();
    } else {
      goal.yaw -= dx * 0.006; goal.pitch = clampPitch(goal.pitch + dy * 0.004);
    }
    lx = e.clientX; ly = e.clientY;
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault(); idle = 0;
    goal.dist = Math.min(1600, Math.max(140, goal.dist * (1 + Math.max(-0.5, Math.min(0.5, e.deltaY * 0.001)))));
  }, { passive: false });

  function hover(e) {
    if (e.pointerType === 'touch') return;
    const i = pick(e.clientX, e.clientY);
    if (i < 0) { tip.hidden = true; canvas.style.cursor = ''; return; }
    const c = cells[i], s = data.stateList[c[3]];
    tip.innerHTML = '<b>' + fmt(c[2]) + '</b> camera' + (c[2] === 1 ? '' : 's') + ' here' + (s ? '<br>' + s[0] : '');
    const r = el.getBoundingClientRect();
    tip.style.left = e.clientX - r.left + 'px'; tip.style.top = e.clientY - r.top + 'px'; tip.hidden = false;
    canvas.style.cursor = s && s[1] !== focusSlug ? 'pointer' : '';
  }

  // Region buttons.
  el.querySelectorAll('[data-fly]').forEach((b) => b.addEventListener('click', () => {
    el.querySelectorAll('[data-fly]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    fly(PRESETS[b.dataset.fly]);
  }));

  function resize() {
    const w = el.clientWidth, h = el.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(el); resize();

  // Only draw while the map is on screen and the tab is visible, to save battery.
  let visible = true, running = false, last = 0;
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; kick(); }, { threshold: 0 }).observe(el);
  document.addEventListener('visibilitychange', kick);
  function kick() { if (!running && visible && !document.hidden) { running = true; last = performance.now(); requestAnimationFrame(frame); } }
  let first = true;
  function frame(now) {
    if (!visible || document.hidden) { running = false; return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now; idle += dt;
    if (!reduce && idle > 5) goal.yaw += dt * 0.04;
    const k = reduce ? 1 : 1 - Math.pow(0.02, dt);
    for (const key in view) view[key] += (goal[key] - view[key]) * k;
    const d = view.dist * Math.max(1, 1.5 / camera.aspect);
    scene.fog.near = d * 0.85; scene.fog.far = d * 1.9;
    camera.position.set(view.tx + d * Math.sin(view.yaw) * Math.cos(view.pitch), d * Math.sin(view.pitch), view.tz + d * Math.cos(view.yaw) * Math.cos(view.pitch));
    const lift = camera.aspect < 1 ? (el.dataset.lift ? +el.dataset.lift : 170) * (1 - camera.aspect) : 0; // narrow screens: room for the headline
    // Wide screens: slide the map right to leave the left side for the headline (data-shift, a share of the view).
    const shift = camera.aspect > 1.2 && el.dataset.shift ? +el.dataset.shift * d * 0.55 : 0;
    const rx = Math.cos(view.yaw), rz = -Math.sin(view.yaw);
    camera.position.x -= rx * shift; camera.position.z -= rz * shift;
    camera.lookAt(view.tx - rx * shift, 0, view.tz - rz * shift - lift);
    if (grow.k < 1) { grow.k = Math.min(1, grow.k + dt / 1.6); placeColumns(); }
    renderer.render(scene, camera);
    if (first) { first = false; el.classList.add('is-live'); }
    requestAnimationFrame(frame);
  }
  kick();

  return {
    data,
    flyToState(slug) {
      const i = data.stateList.findIndex((s) => s[1] === slug);
      if (i >= 0) { unpress(); fly(frameState(i)); }
    },
  };
}

// Mount every map on the page, and let other scripts reach them.
window.NitoMaps = [];
for (const el of document.querySelectorAll('.covmap')) {
  mount(el).then((m) => { if (m) { window.NitoMaps.push(m); el.dispatchEvent(new CustomEvent('covmap:ready', { detail: m, bubbles: true })); } })
    .catch((err) => console.warn('Coverage map unavailable:', err));
}
