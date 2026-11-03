// ============================================
// 08 ガウス＝ボネの定理 ─ 曲がり方を全部足すと「穴の数」になる
// 三角形に分けた閉曲面で、各頂点の「角不足」= 2π − （その頂点に集まる三角形の角の和）が離散的なガウス曲率
//   角不足の総和 = 2π χ（χ = オイラー標数 = V − E + F = 2 − 2g、g = 穴の数）
//   球面 → 4π、トーラス → 0、2 つ穴 → −4π。頂点をどう動かしても（形を変えても）総和は変わらない！
// 1〜3 = 曲面（球面・トーラス・2 つ穴）/ 頂点をドラッグ = 変形 / 空いた所をドラッグ = 視点 / N = ランダムに揺らす / L = なめらかにする / R = 元に戻す
// ============================================

let surfNo = 1, V = [], Fc = [], V0 = [];
let defect = [], hud, geo, edgeGeo, dirty = true;
let dragV = -1, dragMoved = false;
let noiseAmp = 14;                 // ★ N で揺らす大きさ（px）

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  colorMode(HSB, 360, 100, 100, 100);
  hud = createGraphics(width, height); hud.colorMode(HSB, 360, 100, 100, 100);
  buildSurface();
}

// ★ 曲面の三角形分割を作る（V = 頂点 [x,y,z]、Fc = 三角形 [i,j,k]）
function buildSurface() {
  V = []; Fc = [];
  if (surfNo === 1) icosphere(2, 170);
  else if (surfNo === 2) torusMesh(24, 12, 150, 62);
  else genus2(150, 62);
  V0 = V.map((p) => p.slice());
  dirty = true;
}

// 各頂点の角不足を計算（2π − 角の和）
function computeDefects() {
  defect = V.map(() => TWO_PI);
  for (let [a, b, c] of Fc) {
    for (let [i, j, k] of [[a, b, c], [b, c, a], [c, a, b]]) {
      let u = unit3(sub3(V[j], V[i])), w = unit3(sub3(V[k], V[i]));
      defect[i] -= Math.acos(constrain(dot3(u, w), -1, 1));
    }
  }
}

function rebuildGeo() {
  computeDefects();
  if (geo) freeGeometry(geo);
  if (edgeGeo) freeGeometry(edgeGeo);
  geo = new p5.Geometry();
  for (let side = 0; side < 2; side++) {
    for (let i = 0; i < V.length; i++) { geo.vertices.push(new p5.Vector(V[i][0], V[i][1], V[i][2])); let c = kColor(defect[i], 0.35); geo.vertexColors.push(c[0], c[1], c[2], 1); }
    let off = side * V.length;
    for (let [a, b, c] of Fc) geo.faces.push(side === 0 ? [a + off, b + off, c + off] : [a + off, c + off, b + off]);
  }
  geo.computeNormals();
  edgeGeo = buildGeometry(() => { noFill(); for (let [a, b, c] of Fc) { beginShape(); for (let i of [a, b, c, a]) { let p = lift(V[i], i); vertex(p[0], p[1], p[2]); } endShape(); } });
  dirty = false;
}
// 辺を少し外側に浮かせて描く（面と重ならないように）
function lift(p, i) { let n = vnormal(i); return [0, 1, 2].map((k) => p[k] + 1.2 * n[k]); }
let vnCache = [];
function vnormal(i) { return vnCache[i] || [0, 0, 0]; }
function computeVNormals() {
  vnCache = V.map(() => [0, 0, 0]);
  for (let [a, b, c] of Fc) { let n = cross3(sub3(V[b], V[a]), sub3(V[c], V[a])); for (let i of [a, b, c]) for (let k = 0; k < 3; k++) vnCache[i][k] += n[k]; }
  vnCache = vnCache.map(unit3);
}

function draw() {
  background(220, 30, 9);
  if (dirty) { computeVNormals(); rebuildGeo(); }
  let total = defect.reduce((s, d) => s + d, 0), chi = total / TWO_PI;
  let E = (Fc.length * 3) / 2;

  ambientLight(85); directionalLight(190, 190, 190, -0.4, 0.6, -1); directionalLight(80, 80, 80, 0.5, -0.4, 0.5);
  push(); rotateX(rotX); rotateY(rotY);
  noStroke(); model(geo);
  stroke(0, 0, 100, 45); strokeWeight(1); noFill(); model(edgeGeo);
  // つかんでいる頂点
  if (dragV >= 0) { push(); translate(V[dragV][0], V[dragV][1], V[dragV][2]); noStroke(); fill(45, 90, 100); sphere(6); pop(); }
  pop();

  // HUD
  hud.clear(); hud.noStroke();
  hud.fill(0, 0, 100); hud.textSize(18);
  hud.text('1〜3：曲面（' + ['球面', 'トーラス', '2 つ穴の曲面'][surfNo - 1] + '）　頂点をドラッグ：変形　N：揺らす　L：なめらかに　R：元に戻す　空いた所をドラッグ：視点', 20, 40);
  hud.fill(0, 0, 65); hud.textSize(15);
  hud.text('色 = 角不足（赤 = +、青 = −、白 = 0）。頂点 V = ' + V.length + '　辺 E = ' + E + '　面 F = ' + Fc.length + '　→　V − E + F = ' + (V.length - E + Fc.length), 20, 66);
  hud.fill(0, 0, 100, 8); hud.rect(20, height - 140, 700, 116, 10);
  hud.fill(0, 0, 100); hud.textSize(22);
  hud.text('角不足の総和 Σ(2π − Σθ) = ' + nf(total, 1, 4) + ' = 2π × ' + nf(chi, 1, 4), 36, height - 100);
  hud.textSize(18);
  hud.text('→ χ = ' + Math.round(chi) + '、穴の数 g = (2 − χ)/2 = ' + Math.round((2 - chi) / 2) + '　　（頂点を動かしても変わらない：ガウス＝ボネの定理）', 36, height - 66);
  hud.fill(0, 0, 65); hud.textSize(14);
  hud.text('角不足の最大 ' + nf(Math.max(...defect), 1, 3) + '　最小 ' + nf(Math.min(...defect), 1, 3) + '　（1 点ずつは変わるのに、足すと変わらない）', 36, height - 40);
  // 角不足のヒストグラム
  let hx = width - 300, hy = height - 180, hw = 260, hh = 120, bins = new Array(24).fill(0);
  for (let d of defect) bins[constrain(Math.floor(((d + 1.2) / 2.4) * 24), 0, 23)]++;
  let mx = Math.max(...bins, 1);
  hud.fill(0, 0, 100, 8); hud.rect(hx - 10, hy - 30, hw + 20, hh + 60, 10);
  for (let i = 0; i < 24; i++) { let c = kColor((i + 0.5) / 24 * 2.4 - 1.2, 0.35); hud.fill(cssRGB(c)); hud.rect(hx + (i / 24) * hw, hy + hh - (bins[i] / mx) * hh, hw / 24 - 1, (bins[i] / mx) * hh); }
  hud.fill(0, 0, 70); hud.textSize(13); hud.text('頂点ごとの角不足の分布（−1.2 〜 +1.2 rad）', hx, hy - 12);
  showHud();
}

// ---- マウス：頂点をつかむ or 視点を回す
function mousePressed() {
  dragV = -1; dragMoved = false;
  let best = 16;
  for (let i = 0; i < V.length; i++) { let s = toScreen(V[i]); let d = Math.hypot(s.x - mouseX, s.y - mouseY); if (d < best) { best = d; dragV = i; } }
}
function mouseDragged() {
  dragMoved = true;
  if (dragV >= 0) {
    let s = toScreen(V[dragV]), ez = (height / 2) / Math.tan(Math.PI / 6), sc = (ez - s.z) / ez;
    let d = invRot([(mouseX - pmouseX) * sc, (mouseY - pmouseY) * sc, 0]);
    for (let k = 0; k < 3; k++) V[dragV][k] = constrain(V[dragV][k] + d[k], -400, 400);
    dirty = true;
  } else { rotY += (mouseX - pmouseX) * 0.01; rotX = constrain(rotX + (mouseY - pmouseY) * 0.01, -1.6, 1.6); }
}
function mouseReleased() { dragV = -1; }
function keyPressed() {
  if (key >= '1' && key <= '3') { surfNo = +key; buildSurface(); }
  if (key === 'n' || key === 'N') { for (let p of V) for (let k = 0; k < 3; k++) p[k] += (Math.random() - 0.5) * 2 * noiseAmp; dirty = true; }
  if (key === 'l' || key === 'L') { laplacian(0.5); dirty = true; }
  if (key === 'r' || key === 'R') { V = V0.map((p) => p.slice()); dirty = true; }
}
// 各頂点を隣の平均に近づける（なめらかに。総和は変わらない）
function laplacian(t) {
  let sum = V.map(() => [0, 0, 0]), cnt = V.map(() => 0);
  for (let [a, b, c] of Fc) for (let [i, j] of [[a, b], [b, c], [c, a]]) { for (let k = 0; k < 3; k++) { sum[i][k] += V[j][k]; sum[j][k] += V[i][k]; } cnt[i]++; cnt[j]++; }
  V = V.map((p, i) => cnt[i] ? [0, 1, 2].map((k) => p[k] + t * (sum[i][k] / cnt[i] - p[k])) : p);
}

// ---------- やってみよう ----------
// 1. 球面（1）の頂点を 1 つ大きく引っぱると、その頂点の角不足は増え、周りは減る（青くなる）。総和は 4π のまま
// 2. N を何度も押してぐしゃぐしゃにしても χ は変わらない。L で戻していくと色が白に近づく（曲率が散らばる）
// 3. 2 つ穴（3）は総和が −4π。「穴が多いほど鞍（青）が多い」のはなぜ？
// 4. icosphere(2, ...) を icosphere(3, ...) にして三角形を増やしても総和は同じ（頂点ごとの角不足は小さくなる）

// ==================================================
// ここから下は「3D の道具」です（三角形分割を作る・ベクトル・視点・HUD）
// （中身は読まなくても OK。消さないでね）
// ==================================================
let rotX = -0.4, rotY = 0.5;
function sub3(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function dot3(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross3(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function unit3(a) { let l = Math.sqrt(dot3(a, a)) || 1; return a.map((x) => x / l); }
function rotPt(p) { let cy = Math.cos(rotY), sy = Math.sin(rotY), cx = Math.cos(rotX), sx = Math.sin(rotX); let x1 = cy * p[0] + sy * p[2], z1 = -sy * p[0] + cy * p[2]; return [x1, cx * p[1] - sx * z1, sx * p[1] + cx * z1]; }
function toScreen(p) { let q = rotPt(p), ez = (height / 2) / Math.tan(Math.PI / 6), s = ez / (ez - q[2]); return { x: width / 2 + q[0] * s, y: height / 2 + q[1] * s, z: q[2] }; }
function invRot(q) { let cy = Math.cos(rotY), sy = Math.sin(rotY), cx = Math.cos(rotX), sx = Math.sin(rotX); let y1 = cx * q[1] + sx * q[2], z1 = -sx * q[1] + cx * q[2]; return [cy * q[0] - sy * z1, y1, sy * q[0] + cy * z1]; }
function cssRGB(c) { return 'rgb(' + Math.round(c[0] * 255) + ',' + Math.round(c[1] * 255) + ',' + Math.round(c[2] * 255) + ')'; }
function kColor(v, s) { let t = Math.tanh(v / s); return t > 0 ? [1, 1 - 0.85 * t, 1 - 0.85 * t] : [1 + 0.8 * t, 1 + 0.6 * t, 1]; }
function showHud() { drawingContext.clear(drawingContext.DEPTH_BUFFER_BIT); image(hud, -width / 2, -height / 2); }
// 正二十面体を n 回分割して球に貼った三角形分割
function icosphere(n, r) {
  let t = (1 + Math.sqrt(5)) / 2;
  V = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map((p) => unit3(p).map((x) => x * r));
  Fc = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  for (let s = 0; s < n; s++) {
    let cache = {}, nf = [];
    let mid = (a, b) => { let key = Math.min(a, b) + '_' + Math.max(a, b); if (cache[key] === undefined) { cache[key] = V.length; V.push(unit3([0, 1, 2].map((k) => (V[a][k] + V[b][k]) / 2)).map((x) => x * r)); } return cache[key]; };
    for (let [a, b, c] of Fc) { let ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); nf.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]); }
    Fc = nf;
  }
}
// トーラスの格子三角形分割
function torusMesh(nu, nv, R, r) {
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { let u = (i / nu) * TWO_PI, v = (j / nv) * TWO_PI; V.push([(R + r * Math.cos(v)) * Math.cos(u), -r * Math.sin(v), (R + r * Math.cos(v)) * Math.sin(u)]); }
  let id = (i, j) => (i % nu) * nv + (j % nv);
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) Fc.push([id(i, j), id(i + 1, j), id(i, j + 1)], [id(i + 1, j), id(i + 1, j + 1), id(i, j + 1)]);
}
// 2 つ穴の曲面：穴が 2 つあいた板を厚みづけして、なめらかにする
function genus2(W, cs) {
  let nx = 7, ny = 3, hole = (i, j) => j === 1 && (i === 1 || i === 5);
  let top = {}, bot = {};
  let node = (i, j, up) => { let key = i + '_' + j, tbl = up ? top : bot; if (tbl[key] === undefined) { tbl[key] = V.length; V.push([(i - nx / 2) * cs, up ? -cs * 1.1 : cs * 1.1, (j - ny / 2) * cs]); } return tbl[key]; };
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    if (hole(i, j)) continue;
    let a = node(i, j, 1), b = node(i + 1, j, 1), c = node(i + 1, j + 1, 1), d = node(i, j + 1, 1);
    Fc.push([a, b, c], [a, c, d]);
    let a2 = node(i, j, 0), b2 = node(i + 1, j, 0), c2 = node(i + 1, j + 1, 0), d2 = node(i, j + 1, 0);
    Fc.push([a2, c2, b2], [a2, d2, c2]);
    // 境界の辺には壁をつける
    let edges = [[i, j, i + 1, j, i, j - 1], [i + 1, j, i + 1, j + 1, i + 1, j], [i + 1, j + 1, i, j + 1, i, j + 1], [i, j + 1, i, j, i - 1, j]];
    for (let [x1, y1, x2, y2, ni, nj] of edges) {
      let filled = ni >= 0 && nj >= 0 && ni < nx && nj < ny && !hole(ni, nj);
      if (filled) continue;
      let p = node(x1, y1, 1), q = node(x2, y2, 1), p2 = node(x1, y1, 0), q2 = node(x2, y2, 0);
      Fc.push([p, q2, q], [p, p2, q2]);
    }
  }
  for (let s = 0; s < 5; s++) laplacian(0.6);
  V = V.map((p) => p.map((x) => x * 1.35));
}
