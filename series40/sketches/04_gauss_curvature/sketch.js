// ============================================
// 04 ガウス曲率 K と平均曲率 H で色をつける
// 曲面の各点で、第一基本形式 (E, F, G) = (r_u·r_u, r_u·r_v, r_v·r_v) と
//   第二基本形式 (L, M, N) = (r_uu·n, r_uv·n, r_vv·n) を差分で計算し
//   K = (LN − M²)/(EG − F²)、H = (EN + GL − 2FM)/(2(EG − F²))
//   K > 0 = お椀のように丸い（赤）、K < 0 = 鞍のように反る（青）、K ≈ 0 = 平ら・筒（白）
// 1〜4 = 曲面（トーラス・鞍・起伏・球面）/ C = K ↔ H で色分け / マウス = 調べる点（右下の (u,v) 平面に対応）/ ドラッグ = 視点を回す
// ============================================

let surfNo = 1, colorBy = 'K';
let nu = 48, nv = 48;          // ★ メッシュの分割数
let scaleF = 120;              // ★ 曲面の大きさ（px）
let hud, geo, SF, Kmap = [], Hmap = [], kRef = 1, hRef = 1;
let probe = { u: 0.5, v: 0.5 };   // 調べる点（パラメータ平面の 0〜1）
let dragging = false;

// ★ 曲面のカタログ（数学の座標 [x, y, z]、z が上）
let SURFACES = [
  { name: 'トーラス', u: [0, 2 * Math.PI], v: [0, 2 * Math.PI], wrapU: true, wrapV: true, f: (u, v) => [(1.3 + 0.55 * Math.cos(v)) * Math.cos(u), (1.3 + 0.55 * Math.cos(v)) * Math.sin(u), 0.55 * Math.sin(v)] },
  { name: '鞍（双曲放物面）', u: [-1.5, 1.5], v: [-1.5, 1.5], f: (u, v) => [u, v, 0.5 * (u * u - v * v)] },
  { name: '起伏（山と谷）', u: [-2, 2], v: [-2, 2], f: (u, v) => [u, v, 0.55 * (Math.sin(1.7 * u + 0.3) * Math.cos(1.3 * v) + 0.6 * Math.sin(2.6 * v + 1) * Math.cos(0.9 * u))] },
  { name: '球面', u: [0, 2 * Math.PI], v: [-Math.PI / 2 + 0.05, Math.PI / 2 - 0.05], wrapU: true, f: (u, v) => [1.4 * Math.cos(u) * Math.cos(v), 1.4 * Math.sin(u) * Math.cos(v), 1.4 * Math.sin(v)] },
];

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  colorMode(HSB, 360, 100, 100, 100);
  hud = createGraphics(width, height); hud.colorMode(HSB, 360, 100, 100, 100);
  build();
}

function pt(u, v) { let q = SF.f(u, v); return [q[0] * scaleF, -q[2] * scaleF, q[1] * scaleF]; }
function uAt(t) { return SF.u[0] + (SF.u[1] - SF.u[0]) * t; }
function vAt(t) { return SF.v[0] + (SF.v[1] - SF.v[0]) * t; }

// 全頂点で K, H を計算して色をつける
function build() {
  SF = SURFACES[surfNo - 1];
  let P = [], vals = [];
  Kmap = []; Hmap = [];
  for (let i = 0; i <= nu; i++) {
    P.push([]); Kmap.push([]); Hmap.push([]);
    for (let j = 0; j <= nv; j++) {
      let u = uAt(i / nu), v = vAt(j / nv), ff = fundForms(pt, u, v);
      P[i].push(ff.p); Kmap[i].push(ff.K * scaleF * scaleF); Hmap[i].push(ff.H * scaleF);
      vals.push(Math.abs(ff.K * scaleF * scaleF));
    }
  }
  vals.sort((a, b) => a - b);
  kRef = Math.max(vals[Math.floor(vals.length * 0.8)], 1e-4);         // 色の基準（|K| の 80% 点）
  let hv = Hmap.flat().map(Math.abs).sort((a, b) => a - b);
  hRef = Math.max(hv[Math.floor(hv.length * 0.8)], 1e-4);
  let C = [];
  for (let i = 0; i <= nu; i++) { C.push([]); for (let j = 0; j <= nv; j++) C[i].push(colorBy === 'K' ? kColor(Kmap[i][j], kRef) : kColor(Hmap[i][j], hRef)); }
  if (geo) freeGeometry(geo);
  geo = gridMesh(P, C, SF.wrapU, SF.wrapV);
}

function draw() {
  background(215, 35, 9);
  if (!dragging) probe = { u: constrain(mouseX / width, 0, 1), v: constrain(1 - mouseY / height, 0, 1) };
  let u = uAt(probe.u), v = vAt(probe.v), ff = fundForms(pt, u, v);
  let K = ff.K * scaleF * scaleF, H = ff.H * scaleF;

  ambientLight(80); directionalLight(200, 200, 200, -0.4, 0.6, -1); directionalLight(90, 90, 90, 0.5, -0.4, 0.5);
  push(); rotateX(rotX); rotateY(rotY);
  noStroke(); model(geo);
  // 調べる点：法線と接平面の小さな四角
  let p = ff.p, n = ff.n, L = 60;
  stroke(0, 0, 100); strokeWeight(2.5);
  line(p[0], p[1], p[2], p[0] + n[0] * L, p[1] + n[1] * L, p[2] + n[2] * L);
  let eu = ff.ru.map((x) => x / (Math.sqrt(ff.E) || 1)), ev = ff.rv.map((x) => x / (Math.sqrt(ff.G) || 1)), s = 40;
  stroke(45, 90, 100, 80); strokeWeight(1.5); noFill();
  beginShape();
  for (let [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]]) vertex(p[0] + s * (a * eu[0] + b * ev[0]), p[1] + s * (a * eu[1] + b * ev[1]), p[2] + s * (a * eu[2] + b * ev[2]));
  endShape();
  push(); translate(p[0], p[1], p[2]); noStroke(); fill(0, 0, 100); sphere(6); pop();
  pop();

  // HUD
  hud.clear(); hud.noStroke();
  hud.fill(0, 0, 100); hud.textSize(18);
  hud.text('1〜4：曲面（' + SF.name + '）　C：色分け = ' + (colorBy === 'K' ? 'ガウス曲率 K' : '平均曲率 H') + '　マウス：調べる点　ドラッグ：視点', 20, 40);
  hud.fill(0, 0, 65); hud.textSize(15);
  hud.text('K = (LN − M²)/(EG − F²)　H = (EN + GL − 2FM)/(2(EG − F²))　赤 = K > 0（丸い）　青 = K < 0（鞍）　白 = K ≈ 0（平ら・筒）', 20, 66);
  // 数値パネル
  hud.fill(0, 0, 100, 8); hud.rect(20, height - 150, 520, 126, 10);
  hud.fill(0, 0, 100); hud.textSize(20);
  hud.text('K = ' + nf(K, 1, 3) + '　　H = ' + nf(H, 1, 3) + (Math.abs(K) < 0.02 ? '　（ほぼ平ら or 筒）' : K > 0 ? '　（楕円的な点）' : '　（双曲的な点）'), 36, height - 118);
  let disc = Math.max(H * H - K, 0), k1 = H + Math.sqrt(disc), k2 = H - Math.sqrt(disc);
  hud.text('主曲率 κ1 = ' + nf(k1, 1, 3) + '　κ2 = ' + nf(k2, 1, 3) + '　（K = κ1κ2、H = (κ1+κ2)/2）', 36, height - 88);
  hud.fill(0, 0, 65); hud.textSize(14);
  hud.text('E = ' + nf(ff.E / scaleF / scaleF, 1, 2) + '  F = ' + nf(ff.F / scaleF / scaleF, 1, 2) + '  G = ' + nf(ff.G / scaleF / scaleF, 1, 2) + '　　L = ' + nf(ff.L / scaleF, 1, 2) + '  M = ' + nf(ff.M / scaleF, 1, 2) + '  N = ' + nf(ff.N / scaleF, 1, 2) + '　（曲面の大きさを 1 とした単位）', 36, height - 56);
  // パラメータ平面と調べる点
  let bx = width - 230, by = height - 230, bw = 200, bh = 200;
  hud.fill(0, 0, 100, 8); hud.rect(bx - 10, by - 10, bw + 20, bh + 20, 10);
  for (let i = 0; i < 20; i++) for (let j = 0; j < 20; j++) { let c = colorBy === 'K' ? kColor(Kmap[Math.round((i + 0.5) / 20 * nu)][Math.round((j + 0.5) / 20 * nv)], kRef) : kColor(Hmap[Math.round((i + 0.5) / 20 * nu)][Math.round((j + 0.5) / 20 * nv)], hRef); hud.fill(cssRGB(c)); hud.rect(bx + (i / 20) * bw, by + bh - ((j + 1) / 20) * bh, bw / 20 + 0.5, bh / 20 + 0.5); }
  hud.noFill(); hud.stroke(0, 0, 100); hud.strokeWeight(2); hud.circle(bx + probe.u * bw, by + bh - probe.v * bh, 12);
  hud.noStroke(); hud.fill(0, 0, 70); hud.textSize(13);
  hud.text('(u, v) 平面（マウスで動かす）', bx, by - 16);
  // 凡例
  for (let i = 0; i < 60; i++) { let c = kColor((i / 59 - 0.5) * 2 * (colorBy === 'K' ? kRef : hRef) * 1.5, colorBy === 'K' ? kRef : hRef); hud.fill(cssRGB(c)); hud.rect(width - 240 + i * 3.5, 100, 4, 14); }
  hud.fill(0, 0, 70); hud.text('−', width - 256, 112); hud.text('+', width - 22, 112); hud.text(colorBy + ' の色', width - 240, 94);
  showHud();
}

function keyPressed() {
  if (key >= '1' && key <= '4') { surfNo = +key; build(); }
  if (key === 'c' || key === 'C') { colorBy = colorBy === 'K' ? 'H' : 'K'; build(); }
}
function mousePressed() { dragging = true; }
function mouseReleased() { dragging = false; }
function mouseDragged() { rotY += (mouseX - pmouseX) * 0.01; rotX = constrain(rotX + (mouseY - pmouseY) * 0.01, -1.6, 1.6); }

// ---------- やってみよう ----------
// 1. トーラス（1）の外側は赤（K > 0）、内側は青（K < 0）、その境目（いちばん上と下の円）は白。なぜ？
// 2. 球面（4）はどこでも K = 1/R²（半径 1.4 なら 0.51）。マウスをどこに置いても同じ値になるか確かめよう
// 3. 鞍（2）は全部青。C で H に切り替えると中心で H = 0（極小曲面に近い点）
// 4. SURFACES に円柱 (cos u, sin u, v) を足すと K = 0 で真っ白、H ≠ 0 になる。平面と円柱は「内側から見ると同じ」

// ==================================================
// ここから下は「曲面の道具」です（基本形式の差分計算・メッシュ・色・HUD）
// （中身は読まなくても OK。消さないでね）
// ==================================================
let rotX = -0.5, rotY = 0.6;
function dot3(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross3(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
// 点 (u, v) で r_u, r_v, r_uu, r_uv, r_vv を中心差分で求め、第一・第二基本形式と K, H を返す
function fundForms(f, u, v) {
  let h = 1e-3;
  let p = f(u, v), pu1 = f(u + h, v), pu0 = f(u - h, v), pv1 = f(u, v + h), pv0 = f(u, v - h);
  let puv = f(u + h, v + h), puV = f(u + h, v - h), pUv = f(u - h, v + h), pUV = f(u - h, v - h);
  let ru = [0, 1, 2].map((i) => (pu1[i] - pu0[i]) / (2 * h)), rv = [0, 1, 2].map((i) => (pv1[i] - pv0[i]) / (2 * h));
  let ruu = [0, 1, 2].map((i) => (pu1[i] - 2 * p[i] + pu0[i]) / (h * h)), rvv = [0, 1, 2].map((i) => (pv1[i] - 2 * p[i] + pv0[i]) / (h * h));
  let ruv = [0, 1, 2].map((i) => (puv[i] - puV[i] - pUv[i] + pUV[i]) / (4 * h * h));
  let c = cross3(ru, rv), cl = Math.sqrt(dot3(c, c)) || 1e-12, n = c.map((x) => x / cl);
  let E = dot3(ru, ru), F = dot3(ru, rv), G = dot3(rv, rv), L = dot3(ruu, n), M = dot3(ruv, n), N = dot3(rvv, n);
  let det = E * G - F * F || 1e-12;
  return { p, ru, rv, n, E, F, G, L, M, N, K: (L * N - M * M) / det, H: (E * N + G * L - 2 * F * M) / (2 * det) };
}
// 曲率 → 色（+ 赤、0 白、− 青）
function cssRGB(c) { return 'rgb(' + Math.round(c[0] * 255) + ',' + Math.round(c[1] * 255) + ',' + Math.round(c[2] * 255) + ')'; }
function kColor(v, s) { let t = Math.tanh(v / s); return t > 0 ? [1, 1 - 0.85 * t, 1 - 0.85 * t] : [1 + 0.8 * t, 1 + 0.6 * t, 1]; }
// P[i][j] = [x, y, z]、C[i][j] = [r, g, b]（0〜1）の格子から p5.Geometry を作る（両面に光が当たるよう裏面も作る）
function gridMesh(P, C, wrapU, wrapV) {
  let g = new p5.Geometry(), nu = P.length - 1, nv = P[0].length - 1;
  let NU = wrapU ? nu : nu + 1, NV = wrapV ? nv : nv + 1;
  let idx = (i, j) => (i % NU) * NV + (j % NV);
  for (let side = 0; side < 2; side++) {
    for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { g.vertices.push(new p5.Vector(P[i][j][0], P[i][j][1], P[i][j][2])); let c = C ? C[i][j] : [0.8, 0.8, 0.8]; g.vertexColors.push(c[0], c[1], c[2], 1); }
    let off = side * NU * NV;
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      let a = idx(i, j) + off, b = idx(i + 1, j) + off, c = idx(i, j + 1) + off, d = idx(i + 1, j + 1) + off;
      if (side === 0) g.faces.push([a, b, c], [b, d, c]); else g.faces.push([a, c, b], [b, c, d]);
    }
  }
  g.computeNormals();
  return g;
}
function showHud() { drawingContext.clear(drawingContext.DEPTH_BUFFER_BIT); image(hud, -width / 2, -height / 2); }
