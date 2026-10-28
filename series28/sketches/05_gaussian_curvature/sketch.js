// ============================================
// 05 ガウス曲率
// 面の各点で「いちばん曲がる向き」と「いちばん曲がらない向き」の曲率 κ1, κ2（主曲率）を掛けたもの = ガウス曲率 K
//   K > 0（赤）：お椀・球。K = 0（白）：円柱・平面。K < 0（青）：鞍（馬の鞍、ポテトチップス）
// クリック = 点を調べる / 1 = 球面 2 = 円柱 3 = 鞍面 4 = トーラス 5 = 猿の鞍 6 = でこぼこ / H = 平均曲率で色 / ↑↓ = 色の強さ / ドラッグ = 視点
// ============================================

let kind = 4;
let useH = false;               // false = ガウス曲率 K、true = 平均曲率 H で色をつける
let gain = 1.5;                 // ★ 色の強さ
let pu = 0.4, pv = 0.6;
let SC, surfModel, gridModel, press = null;

const SURF = {
  1: { name: '球面（K > 0 どこでも）', u: [-Math.PI, Math.PI], v: [-1.5, 1.5], f: (u, v) => [Math.cos(v) * Math.cos(u), Math.cos(v) * Math.sin(u), Math.sin(v)] },
  2: { name: '円柱（K = 0 どこでも）', u: [-Math.PI, Math.PI], v: [-1, 1], f: (u, v) => [0.7 * Math.cos(u), 0.7 * Math.sin(u), v] },
  3: { name: '鞍面（K < 0）', u: [-1.2, 1.2], v: [-1.2, 1.2], f: (u, v) => [u, v, (u * u - v * v) / 2] },
  4: { name: 'トーラス（外側 +、内側 −）', u: [-Math.PI, Math.PI], v: [-Math.PI, Math.PI], f: (u, v) => [(1 + 0.45 * Math.cos(v)) * Math.cos(u), (1 + 0.45 * Math.cos(v)) * Math.sin(u), 0.45 * Math.sin(v)] },
  5: { name: '猿の鞍 z = x³ − 3xy²（足が 3 本）', u: [-1.1, 1.1], v: [-1.1, 1.1], f: (u, v) => [u, v, 0.6 * (u * u * u - 3 * u * v * v)] },
  6: { name: 'でこぼこ（山と谷と峠）', u: [-1.3, 1.3], v: [-1.3, 1.3], f: (u, v) => [u, v, 0.45 * Math.exp(-3 * ((u - 0.4) ** 2 + v * v)) - 0.35 * Math.exp(-3 * ((u + 0.5) ** 2 + (v - 0.3) ** 2))] },
};

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  setupView();
  SC = min(width, height) * 0.3;
  rebuild();
}
function S() { return SURF[kind]; }

// ★ 曲率の計算：第一基本形式 E, F, G と第二基本形式 L, M, N から
function curv(u, v) {
  let f = S().f, h = 0.002;
  let p = f(u, v);
  let ru = vmul(vsub(f(u + h, v), f(u - h, v)), 1 / (2 * h));
  let rv = vmul(vsub(f(u, v + h), f(u, v - h)), 1 / (2 * h));
  let ruu = vmul(vadd(vsub(f(u + h, v), vmul(p, 2)), f(u - h, v)), 1 / (h * h));
  let rvv = vmul(vadd(vsub(f(u, v + h), vmul(p, 2)), f(u, v - h)), 1 / (h * h));
  let ruv = vmul(vsub(vsub(f(u + h, v + h), f(u + h, v - h)), vsub(f(u - h, v + h), f(u - h, v - h))), 1 / (4 * h * h));
  let n = vunit(vcross(ru, rv));
  let E = vdot(ru, ru), F = vdot(ru, rv), G = vdot(rv, rv);
  let L = vdot(ruu, n), M = vdot(ruv, n), N = vdot(rvv, n);
  let W = E * G - F * F;
  let K = (L * N - M * M) / W, H = (E * N - 2 * F * M + G * L) / (2 * W);
  let disc = Math.sqrt(max(0, H * H - K));
  return { p, ru, rv, n, E, F, G, L, M, N, K, H, k1: H + disc, k2: H - disc };
}
// 主曲率 k の向き（(II − k I) w = 0 を解く）
function principalDir(c, k) {
  let a = [c.M - k * c.F, -(c.L - k * c.E)], b = [c.N - k * c.G, -(c.M - k * c.F)];
  let w = Math.hypot(...a) > Math.hypot(...b) ? a : b;
  if (Math.hypot(...w) < 1e-9) w = [1, 0];
  return vunit(vadd(vmul(c.ru, w[0]), vmul(c.rv, w[1])));
}
// 曲率 → 色（+ 赤、0 白、− 青）
function kColor(u, v) {
  let c = curv(u, v), x = Math.tanh((useH ? c.H : c.K) * gain);
  if (x >= 0) return [235, 235 - 190 * x, 225 - 200 * x];
  return [235 + 200 * x, 235 + 120 * x, 240];
}
function rebuild() {
  if (surfModel) { freeGeometry(surfModel); freeGeometry(gridModel); }
  let s = S();
  surfModel = makeSurface(s.f, s.u[0], s.u[1], s.v[0], s.v[1], 72, 54, kColor);
  gridModel = makeGrid(s.f, s.u[0], s.u[1], s.v[0], s.v[1], 16, 12, [60, 60, 80]);
}

function draw() {
  background(16, 18, 28);
  dragView();
  let c = curv(pu, pv);
  ambientLight(140); directionalLight(200, 200, 200, 0.3, 0.6, -1);
  push();
  rotateX(rotX); rotateY(rotY);
  model(surfModel); showLines(gridModel);
  // 2 つの主方向と、その向きの「法断面」の接触円（同じ側なら K > 0、反対側なら K < 0）
  for (let [k, col] of [[c.k1, [255, 150, 40]], [c.k2, [40, 220, 255]]]) {
    let d = principalDir(c, k);
    stroke(...col); strokeWeight(4); seg(vsub(c.p, vmul(d, 0.35)), vadd(c.p, vmul(d, 0.35)));
    strokeWeight(1.5); noFill();
    if (Math.abs(k) > 0.05) {
      let rho = 1 / k, ctr = vadd(c.p, vmul(c.n, rho));
      beginShape();
      for (let i = 0; i <= 80; i++) { let a = (i / 80) * TWO_PI; vtx(vadd(ctr, vadd(vmul(c.n, -rho * Math.cos(a)), vmul(d, Math.abs(rho) * Math.sin(a))))); }
      endShape();
    } else seg(vsub(c.p, vmul(d, 1.2)), vadd(c.p, vmul(d, 1.2)));
  }
  stroke(255); strokeWeight(3); seg(c.p, vadd(c.p, vmul(c.n, 0.4)));
  let q = toP(c.p);
  push(); translate(q[0], q[1], q[2]); noStroke(); fill(255, 230, 90); sphere(7); pop();
  pop();
  drawHud(c);
  showHud();
}

function drawHud(c) {
  hud.clear();
  hud.noStroke(); hud.fill(255); hud.textSize(18);
  hud.text('クリック：点を調べる　1〜6：面（' + S().name + '）　H：' + (useH ? '平均曲率 H' : 'ガウス曲率 K') + ' で色　↑↓：色の強さ　ドラッグ：視点', 20, 40);
  hud.fill(170); hud.textSize(15);
  hud.text('橙 = いちばん曲がる向き（κ1）、水色 = いちばん曲がらない向き（κ2）。2 つの円が同じ側 → K > 0、反対側 → K < 0、片方がまっすぐ → K = 0', 20, 68);
  let x = 20, y = height - 200;
  hud.fill(0, 0, 0, 160); hud.rect(x - 10, y - 30, 520, 190, 10);
  hud.textSize(16); hud.fill(255, 170, 80);
  hud.text('κ1 = ' + nf(c.k1, 1, 3), x, y);
  hud.fill(80, 230, 255); hud.text('κ2 = ' + nf(c.k2, 1, 3), x + 160, y);
  hud.fill(255); hud.textSize(20);
  hud.text('K = κ1 κ2 = ' + nf(c.K, 1, 3), x, y + 34);
  hud.textSize(16); hud.text('H = (κ1 + κ2)/2 = ' + nf(c.H, 1, 3), x + 270, y + 34);
  hud.fill(200); hud.textSize(14);
  hud.text('K = (LN − M²) / (EG − F²)　L, M, N = 2 階微分の法線成分（第二基本形式）', x, y + 64);
  hud.text('E, F, G = ' + nf(c.E, 1, 2) + ', ' + nf(c.F, 1, 2) + ', ' + nf(c.G, 1, 2) + '　L, M, N = ' + nf(c.L, 1, 2) + ', ' + nf(c.M, 1, 2) + ', ' + nf(c.N, 1, 2), x, y + 88);
  // 色の凡例
  for (let i = 0; i < 200; i++) {
    let s = (i / 199) * 2 - 1;
    let col = s >= 0 ? [235, 235 - 190 * s, 225 - 200 * s] : [235 + 200 * s, 235 + 120 * s, 240];
    hud.fill(...col); hud.rect(x + i * 2, y + 110, 2, 16);
  }
  hud.fill(200); hud.textSize(13);
  hud.text('−（鞍）', x, y + 146); hud.text('0（平ら・円柱）', x + 160, y + 146); hud.text('+（お椀）', x + 350, y + 146);
}

function mousePressed() { dragging = true; press = { x: mouseX, y: mouseY }; }
function mouseReleased() {
  dragging = false;
  if (press && Math.hypot(mouseX - press.x, mouseY - press.y) < 5) {
    let s = S(), hit = pickUV(s.f, mouseX, mouseY, s.u[0], s.u[1], s.v[0], s.v[1]);
    if (hit) { pu = hit.u; pv = hit.v; }
  }
  press = null;
}
function keyPressed() {
  if ('123456'.includes(key) && key.length === 1) { kind = int(key); pu = 0.3; pv = 0.3; rebuild(); }
  if (key === 'h' || key === 'H') { useH = !useH; rebuild(); }
  if (key === UP_ARROW) { gain = min(20, gain * 1.4); rebuild(); }
  if (key === DOWN_ARROW) { gain = max(0.1, gain / 1.4); rebuild(); }
}

// ---------- やってみよう ----------
// 1. 球面の K を半径を変えて確かめる（式の 1 を R にすると K = 1/R²）
// 2. 円柱は曲がって見えるのに K = 0。紙を丸めると円柱になる = 紙（平面）と同じ K。紙で球は包めない理由
// 3. トーラスの外側・内側・てっぺんで K を比べる。境目（K = 0）の線はどこ？
// 4. H で色を変えると、鞍面の原点は H = 0（極小曲面：石けん膜と同じ）。K と H のちがいを説明しよう


// ==================================================
// ここから下は「3D の道具」（視点・ベクトル計算・面をつくる・画面への投影）
// ==================================================
let rotX = -0.5, rotY = 0.5, EZ, hud, dragging = false;
function setupView() {
  EZ = height / 2 / Math.tan(PI / 6);
  perspective(PI / 3, width / height, EZ / 20, EZ * 20);
  camera(0, 0, EZ, 0, 0, 0, 0, 1, 0);
  hud = createGraphics(width, height);
}
function dragView() { if (mouseIsPressed && dragging) { rotY += movedX * 0.01; rotX = constrain(rotX - movedY * 0.01, -1.5, 1.5); } }
function showHud() { drawingContext.clear(drawingContext.DEPTH_BUFFER_BIT); noLights(); image(hud, -width / 2, -height / 2); }
// 数学の座標（z が上）→ p5 の座標（y が下）に SC 倍
function toP(p) { return [p[0] * SC, -p[2] * SC, p[1] * SC]; }
function vtx(p) { let q = toP(p); vertex(q[0], q[1], q[2]); }
function seg(a, b) { let p = toP(a), q = toP(b); line(p[0], p[1], p[2], q[0], q[1], q[2]); }
function vadd(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function vsub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function vmul(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
function vdot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function vcross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function vlen(a) { return Math.sqrt(vdot(a, a)); }
function vunit(a) { let l = vlen(a) || 1; return vmul(a, 1 / l); }
// 面 f(u, v) を三角形でつくる（col(u, v) → [r, g, b] で色）
function makeSurface(f, u0, u1, v0, v1, nu, nv, col) {
  return buildGeometry(() => {
    noStroke();
    beginShape(TRIANGLES);
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      for (let [a, b] of [[0, 0], [1, 0], [1, 1], [0, 0], [1, 1], [0, 1]]) {
        let u = u0 + ((u1 - u0) * (i + a)) / nu, v = v0 + ((v1 - v0) * (j + b)) / nv, e = 0.001;
        let n = vunit(vcross(vsub(f(u + e, v), f(u - e, v)), vsub(f(u, v + e), f(u, v - e))));
        fill(...col(u, v)); normal(n[0], -n[2], n[1]); vtx(f(u, v));
      }
    }
    endShape();
  });
}
// 面の網目（u 一定の線と v 一定の線）。線の色は showLines で描くときに決まる
function makeGrid(f, u0, u1, v0, v1, nu, nv, c) {
  let geo = buildGeometry(() => {
    noFill();
    for (let side of [1, -1]) {   // 面の表と裏に少し浮かせて 2 回（面にうもれないように）
      let g = (u, v) => { let e = 0.001, n = vunit(vcross(vsub(f(u + e, v), f(u - e, v)), vsub(f(u, v + e), f(u, v - e)))); return vadd(f(u, v), vmul(n, 0.005 * side)); };
      for (let i = 0; i <= nu; i++) { beginShape(); for (let k = 0; k <= 60; k++) vtx(g(u0 + ((u1 - u0) * i) / nu, v0 + ((v1 - v0) * k) / 60)); endShape(); }
      for (let j = 0; j <= nv; j++) { beginShape(); for (let k = 0; k <= 90; k++) vtx(g(u0 + ((u1 - u0) * k) / 90, v0 + ((v1 - v0) * j) / nv)); endShape(); }
    }
  });
  geo.lineColor = c;
  return geo;
}
// buildGeometry でつくった線は、model() の直前の stroke の色で描かれる
function showLines(geo, w) { stroke(...geo.lineColor); strokeWeight(w || 1); model(geo); }
// 数学の座標の点が、いまの視点で画面のどこに見えるか（depth が大きいほど手前）
function project(p) {
  let [x, y, z] = toP(p);
  let cy = Math.cos(rotY), sy = Math.sin(rotY), cx = Math.cos(rotX), sx = Math.sin(rotX);
  let x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
  let y2 = y * cx - z1 * sx, z2 = y * sx + z1 * cx;
  let s = EZ / (EZ - z2);
  return { sx: width / 2 + x1 * s, sy: height / 2 + y2 * s, depth: z2 };
}
// 画面の (mx, my) に見えている面の点 (u, v) を探す（なければ null）
function pickUV(f, mx, my, u0, u1, v0, v1) {
  let N = 70, best = null;
  for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
    let u = u0 + ((u1 - u0) * i) / N, v = v0 + ((v1 - v0) * j) / N, s = project(f(u, v));
    if (Math.hypot(s.sx - mx, s.sy - my) < 22 && (!best || s.depth > best.depth)) best = { u, v, depth: s.depth };
  }
  if (!best) return null;
  let u = best.u, v = best.v, du = (u1 - u0) / N, dv = (v1 - v0) / N;
  let err = (a, b) => { let s = project(f(a, b)); return (s.sx - mx) ** 2 + (s.sy - my) ** 2; };
  let e = err(u, v);
  for (let k = 0; k < 60 && du > 1e-5; k++) {
    let moved = false;
    for (let [a, b] of [[du, 0], [-du, 0], [0, dv], [0, -dv]]) {
      let uu = u + a, vv = constrain(v + b, v0, v1), ee = err(uu, vv);
      if (ee < e) { e = ee; u = uu; v = vv; moved = true; }
    }
    if (!moved) { du /= 2; dv /= 2; }
  }
  return e < 36 ? { u, v } : null;
}
