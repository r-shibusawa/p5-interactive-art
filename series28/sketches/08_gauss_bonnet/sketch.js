// ============================================
// 08 ガウス＝ボネの定理
// 球面の三角形（辺は大円 = 測地線）の内角の和は 180° より大きい。はみ出した分 = 面積 ÷ R²
//   面全体では「曲率の合計 ∬K dA = 2π × オイラー標数 χ」。形をどう変えても球面は 4π、トーラスは 0
// 頂点をドラッグ = 三角形を変える / 球の他の所をドラッグ = 回す / 1〜3 = 三角形の例 / ↑↓ = 球の半径 R / M = 面積を点で数える
// ============================================

let V = [];                  // 三角形の頂点（単位ベクトル）
let R = 1;                   // ★ 球の半径（単位は自由。面積 = 超過 × R²）
let yaw = 2.36, tilt = 0.5;
let drag = -1, dragStart = null;
let samples = [], showMC = true;
let NS = 30000;              // ★ 面積を数えるための点の数
let totals = [];             // 右の表：閉じた面の ∬K dA

function setup() {
  createCanvas(windowWidth, windowHeight);
  preset(2);
  // 球面上に一様にばらまいた点（面積を数えるため）
  for (let i = 0; i < NS; i++) {
    let z = Math.random() * 2 - 1, a = Math.random() * TWO_PI, r = Math.sqrt(1 - z * z);
    samples.push([r * Math.cos(a), r * Math.sin(a), z]);
  }
  // ★ いろいろな閉じた面で ∬K dA を数値計算
  let sphere1 = (u, v) => [Math.cos(v) * Math.cos(u), Math.cos(v) * Math.sin(u), Math.sin(v)];
  let ellip = (u, v) => [1.2 * Math.cos(v) * Math.cos(u), 0.8 * Math.cos(v) * Math.sin(u), 0.5 * Math.sin(v)];
  let lumpy = (u, v) => vmul(sphere1(u, v), 1 + 0.25 * Math.sin(3 * u) * Math.cos(v) ** 2 + 0.15 * Math.cos(2 * v));
  let torus = (u, v) => [(1 + 0.4 * Math.cos(v)) * Math.cos(u), (1 + 0.4 * Math.cos(v)) * Math.sin(u), 0.4 * Math.sin(v)];
  let torus2 = (u, v) => [(1 + 0.3 * Math.cos(v) + 0.15 * Math.cos(3 * u)) * Math.cos(u), (1 + 0.3 * Math.cos(v)) * Math.sin(u), 0.3 * Math.sin(v) + 0.2 * Math.sin(2 * u)];
  totals = [
    ['球面', integrateK(sphere1, -HALF_PI, HALF_PI), 2],
    ['楕円体', integrateK(ellip, -HALF_PI, HALF_PI), 2],
    ['でこぼこの球', integrateK(lumpy, -HALF_PI, HALF_PI), 2],
    ['トーラス', integrateK(torus, -PI, PI), 0],
    ['ゆがんだトーラス', integrateK(torus2, -PI, PI), 0],
  ];
}

function preset(k) {
  let s = (la, lo) => [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
  if (k === 1) V = [s(0.5, 0.4), s(0.62, 0.55), s(0.45, 0.6)];     // 小さい三角形：ほぼ平ら
  if (k === 2) V = [s(HALF_PI - 0.001, 0), s(0, 0), s(0, HALF_PI)]; // 北極と赤道の 2 点：3 つとも 90°
  if (k === 3) V = [s(0.9, -0.3), s(-0.4, -0.6), s(-0.2, 1.6)];     // 大きい三角形
}

// 3D → 画面（正射影）
function view(p) {
  let c = Math.cos(yaw), s = Math.sin(yaw);
  let x1 = c * p[0] + s * p[1], y1 = -s * p[0] + c * p[1];
  let up = y1 * Math.sin(tilt) + p[2] * Math.cos(tilt), depth = -y1 * Math.cos(tilt) + p[2] * Math.sin(tilt);
  let Rp = min(width * 0.28, height * 0.36);
  return { x: width * 0.33 + x1 * Rp, y: height * 0.52 - up * Rp, front: depth > 0, depth, Rp };
}
function unview(mx, my) {   // 画面 → 球面の手前の点
  let Rp = view([0, 0, 1]).Rp;
  let X = (mx - width * 0.33) / Rp, U = -(my - height * 0.52) / Rp, D = 1 - X * X - U * U;
  if (D < 0) return null;
  let d = Math.sqrt(D), y1 = U * Math.sin(tilt) - d * Math.cos(tilt), z1 = U * Math.cos(tilt) + d * Math.sin(tilt);
  let c = Math.cos(yaw), s = Math.sin(yaw);
  return [c * X - s * y1, s * X + c * y1, z1];
}
function slerp(a, b, t) {
  let w = Math.acos(constrain(vdot(a, b), -1, 1));
  if (w < 1e-6) return a;
  return vadd(vmul(a, Math.sin((1 - t) * w) / Math.sin(w)), vmul(b, Math.sin(t * w) / Math.sin(w)));
}
// ★ 頂点 A での内角：A から B へ向かう大円の向きと、A から C へ向かう向きのなす角
function angleAt(A, B, C) {
  let tb = vunit(vsub(B, vmul(A, vdot(A, B)))), tc = vunit(vsub(C, vmul(A, vdot(A, C))));
  return Math.acos(constrain(vdot(tb, tc), -1, 1));
}
function det3(a, b, c) { return vdot(a, vcross(b, c)); }

function draw() {
  background(16, 18, 28);
  let Rp = view([0, 0, 1]).Rp;
  noStroke(); fill(32, 44, 72); circle(width * 0.33, height * 0.52, 2 * Rp);
  // 経線・緯線
  strokeWeight(1);
  for (let la = -60; la <= 60; la += 30) arcLine((t) => sphPt(radians(la), t * TWO_PI), [170, 190, 255, 60]);
  for (let lo = 0; lo < 180; lo += 30) arcLine((t) => sphPt(t * TWO_PI, radians(lo)), [170, 190, 255, 60]);
  // 面積を数える点（三角形の中だけ）
  let s0 = Math.sign(det3(V[0], V[1], V[2])), inside = 0;
  for (let i = 0; i < NS; i++) {
    let p = samples[i];
    if (Math.sign(det3(V[0], V[1], p)) === s0 && Math.sign(det3(V[1], V[2], p)) === s0 && Math.sign(det3(V[2], V[0], p)) === s0) {
      inside++;
      if (showMC && i % 3 === 0) { let q = view(p); if (q.front) { stroke(255, 210, 90, 160); point(q.x, q.y); } }
    }
  }
  // 三角形の辺（大円の弧）
  strokeWeight(3);
  for (let i = 0; i < 3; i++) { let a = V[i], b = V[(i + 1) % 3]; arcLine((t) => slerp(a, b, t), [255, 120, 120, 255], true); }
  let ang = [angleAt(V[0], V[1], V[2]), angleAt(V[1], V[2], V[0]), angleAt(V[2], V[0], V[1])];
  let names = ['A', 'B', 'C'];
  for (let i = 0; i < 3; i++) {
    let q = view(V[i]);
    noStroke(); fill(q.front ? 255 : 120); circle(q.x, q.y, drag === i ? 20 : 15);
    fill(255, q.front ? 255 : 120); textSize(18); text(names[i] + ' ' + nf(degrees(ang[i]), 1, 1) + '°', q.x + 12, q.y - 10);
  }
  let sum = ang[0] + ang[1] + ang[2], excess = sum - PI, mcArea = (4 * PI * inside) / NS;

  noStroke(); fill(255); textSize(18);
  text('頂点をドラッグ：三角形　他をドラッグ：回す　1〜3：例　↑↓：半径 R = ' + nf(R, 1, 1) + '　M：面積を点で数える ' + (showMC ? 'ON' : 'off'), 20, 40);
  fill(170); textSize(15);
  text('辺は大円（球面の測地線）。三角形が大きいほど内角の和は 180° を超える。小さい三角形はほぼ 180°（00 の「局所的に平ら」）', 20, 68);
  let x = 20, y = height - 150;
  fill(0, 0, 0, 160); rect(x - 10, y - 30, 600, 150, 10);
  fill(255); textSize(18);
  text('内角の和 = ' + nf(degrees(sum), 1, 2) + '°　→　超過 = 和 − 180° = ' + nf(degrees(excess), 1, 2) + '° = ' + nf(excess, 1, 4) + ' rad', x, y);
  fill(255, 210, 90);
  text('面積（黄色い点で数えた）= 4πR² × ' + inside + ' / ' + NS + ' = ' + nf(mcArea * R * R, 1, 4), x, y + 32);
  fill(120, 220, 255);
  text('面積 ÷ R² = ' + nf(mcArea, 1, 4) + '　≈　超過 ' + nf(excess, 1, 4) + '　（ガウス＝ボネ）', x, y + 62);
  fill(170); textSize(14);
  text('球面のガウス曲率 K = 1/R² なので ∬K dA = 面積/R²。三角形では「内角の和 − π = ∬K dA」', x, y + 90);
  drawTable();
}
function sphPt(lo, la) { return [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)]; }
function arcLine(f, c, keep) {
  stroke(...c); let prev = null;
  for (let i = 0; i <= 80; i++) {
    let q = view(f(i / 80));
    if (prev) { if (q.front && prev.front) stroke(...c); else stroke(c[0], c[1], c[2], keep ? 60 : 0); line(prev.x, prev.y, q.x, q.y); }
    prev = q;
  }
}

// 右の表：閉じた面の曲率の合計
function drawTable() {
  let x = width * 0.66, y = 140;
  noStroke(); fill(0, 0, 0, 160); rect(x - 16, y - 34, width * 0.34 - 10, 60 + totals.length * 34 + 70, 10);
  fill(255); textSize(17); text('閉じた面全体の ∬K dA（数値積分）', x, y - 6);
  textSize(14);
  totals.forEach(([nm, v, chi], i) => {
    let yy = y + 30 + i * 34;
    fill(220); text(nm, x, yy);
    fill(255, 210, 90); text('∬K dA = ' + nf(v, 1, 3), x + 118, yy);
    fill(120, 220, 255); text('÷ 2π = ' + nf(v / TWO_PI, 1, 2) + '（χ = ' + chi + '）', x + 250, yy);
  });
  fill(170); textSize(14);
  let yy = y + 40 + totals.length * 34;
  text('へこませても伸ばしても、合計は 2πχ のまま。', x, yy);
  text('χ = 2 − 2g（g = 穴の数）。', x, yy + 22);
  text('曲率の「量」は形でなく位相で決まる', x, yy + 44);
}
// ∬K dA を (u, v) の格子で足し合わせる（K√(EG − F²) du dv）
function integrateK(f, v0, v1) {
  let nu = 120, nv = 80, du = TWO_PI / nu, dv = (v1 - v0) / nv, h = 0.002, sum = 0;
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    let u = (i + 0.5) * du, v = v0 + (j + 0.5) * dv, p = f(u, v);
    let ru = vmul(vsub(f(u + h, v), f(u - h, v)), 1 / (2 * h)), rv = vmul(vsub(f(u, v + h), f(u, v - h)), 1 / (2 * h));
    let ruu = vmul(vadd(vsub(f(u + h, v), vmul(p, 2)), f(u - h, v)), 1 / (h * h)), rvv = vmul(vadd(vsub(f(u, v + h), vmul(p, 2)), f(u, v - h)), 1 / (h * h));
    let ruv = vmul(vsub(vsub(f(u + h, v + h), f(u + h, v - h)), vsub(f(u - h, v + h), f(u - h, v - h))), 1 / (4 * h * h));
    let cr = vcross(ru, rv), W = vlen(cr);
    if (W < 1e-9) continue;
    let n = vmul(cr, 1 / W);
    let L = vdot(ruu, n), M = vdot(ruv, n), N = vdot(rvv, n);
    sum += ((L * N - M * M) / (W * W)) * W * du * dv;   // K dA
  }
  return sum;
}

function mousePressed() {
  drag = -1;
  for (let i = 0; i < 3; i++) { let q = view(V[i]); if (q.front && dist(mouseX, mouseY, q.x, q.y) < 18) drag = i; }
  dragStart = { x: mouseX, y: mouseY, yaw, tilt };
}
function mouseDragged() {
  if (drag >= 0) { let p = unview(mouseX, mouseY); if (p) V[drag] = p; }
  else if (dragStart && mouseX < width * 0.64) { yaw = dragStart.yaw - (mouseX - dragStart.x) * 0.01; tilt = constrain(dragStart.tilt + (mouseY - dragStart.y) * 0.01, -1.4, 1.4); }
}
function mouseReleased() { drag = -1; }
function keyPressed() {
  if ('123'.includes(key) && key.length === 1) preset(int(key));
  if (key === UP_ARROW) R = min(10, R + 0.5);
  if (key === DOWN_ARROW) R = max(0.5, R - 0.5);
  if (key === 'm' || key === 'M') showMC = !showMC;
}

// ---------- やってみよう ----------
// 1. 例 2（北極と赤道の 2 点）：3 つの角がすべて 90°。和 270°、超過 90° = π/2 = 球面の 1/8 の面積
// 2. 頂点を寄せて小さい三角形に。超過は面積に比例して 0 に近づく（平面の 180° にもどる）
// 3. R を 2 倍にすると、同じ形の三角形の面積は 4 倍。でも角度は変わらない → 「面積 ÷ R²」が角度で決まる
// 4. 右の表に自分の面（例：(1 + 0.3 sin 5u) をかけた球）を追加。∬K dA は 4π のまま？


// ==================================================
// ここから下は「ベクトルの道具」
// ==================================================
function vadd(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function vsub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function vmul(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
function vdot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function vcross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function vlen(a) { return Math.sqrt(vdot(a, a)); }
function vunit(a) { let l = vlen(a) || 1; return vmul(a, 1 / l); }
