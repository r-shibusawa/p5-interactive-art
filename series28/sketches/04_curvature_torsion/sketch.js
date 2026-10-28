// ============================================
// 04 曲線の曲率と捩率
// 曲率 κ = どれだけ曲がっているか = いちばんよく接する円（接触円）の半径の逆数 1/ρ
//   3D の曲線では、進む向き T・曲がる向き N・その直角 B の「フレネ枠」がねじれる速さ = 捩率 τ
// 1 = 平面の曲線（←→ で形）/ 2 = つる巻き線（↑↓ でピッチ）/ 3 = 三葉結び目 / スペース = 止める / O = 接触円 / ドラッグ = 視点（3D）
// ============================================

let mode = 1, shape2d = 0;
let t = 0, playing = true, showCircle = true;
let speed = 0.006;             // ★ 点の進む速さ
let pitch = 0.35;              // ★ つる巻き線のピッチ b（半径 a = 1）
let yaw = 0.6, tilt = 0.5;     // 3D の見る向き
let U;                         // 1 の長さ（px）

// ★ 平面の曲線 (x(t), y(t))、t は 0〜2π
const CURVES2D = [
  { name: '楕円', f: (t) => [1.4 * Math.cos(t), 0.8 * Math.sin(t)] },
  { name: 'リマソン', f: (t) => [(0.6 + Math.cos(t)) * Math.cos(t), (0.6 + Math.cos(t)) * Math.sin(t)] },
  { name: '正弦波', f: (t) => [(t - Math.PI) / 2.2, 0.7 * Math.sin(2 * t)] },
  { name: 'リサージュ', f: (t) => [1.3 * Math.sin(2 * t), 0.9 * Math.sin(3 * t)] },
];
function curve3(s) {
  if (mode === 2) return [Math.cos(2 * s), Math.sin(2 * s), pitch * (2 * s - 2 * Math.PI)];   // つる巻き線（2 周、半径 a = 1）
  return [0.45 * (Math.sin(s) + 2 * Math.sin(2 * s)), 0.45 * (Math.cos(s) - 2 * Math.cos(2 * s)), -0.45 * Math.sin(3 * s)];   // 三葉結び目
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  U = min(width, height) * 0.25;
}

// ★ 数値微分：r'、r''、r'''
function derivs(f, s) {
  let h = 0.002, a = f(s - 2 * h), b = f(s - h), c = f(s), d = f(s + h), e = f(s + 2 * h);
  let n = c.length, d1 = [], d2 = [], d3 = [];
  for (let i = 0; i < n; i++) {
    d1.push((d[i] - b[i]) / (2 * h));
    d2.push((d[i] - 2 * c[i] + b[i]) / (h * h));
    d3.push((e[i] - 2 * d[i] + 2 * b[i] - a[i]) / (2 * h * h * h));
  }
  return { p: c, d1, d2, d3 };
}

function draw() {
  background(18, 18, 28);
  if (playing) t = (t + speed) % TWO_PI;
  if (mode === 1) draw2d(); else draw3d();
  noStroke(); fill(255); textSize(18);
  text('1：平面の曲線（←→：' + CURVES2D[shape2d].name + '）　2：つる巻き線（↑↓：ピッチ ' + nf(pitch, 1, 2) + '）　3：三葉結び目　スペース：止める　O：接触円', 20, 40);
  fill(170); textSize(15);
  text(mode === 1 ? '黄色の円 = 接触円（その点で曲線にいちばんよく合う円）。半径 ρ が小さいほど急カーブ：κ = 1/ρ。符号は左に曲がると +、右なら −'
    : 'T（赤）= 進む向き、N（緑）= 曲がる向き、B（青）= T × N。B の向きが変わる速さが捩率 τ（平面からはみ出す度合い）', 20, 68);
}

function draw2d() {
  let f = CURVES2D[shape2d].f, cx = width / 2, cy = height * 0.45;
  let P = (q) => [cx + q[0] * U, cy - q[1] * U];
  // 曲率で色をつけた曲線
  strokeWeight(3);
  let ks = [];
  for (let i = 0; i <= 300; i++) {
    let s = (i / 300) * TWO_PI, D = derivs(f, s);
    let k = (D.d1[0] * D.d2[1] - D.d1[1] * D.d2[0]) / Math.pow(D.d1[0] ** 2 + D.d1[1] ** 2, 1.5);
    ks.push(k);
    if (i > 0) {
      let a = P(f(s - TWO_PI / 300)), b = P(D.p);
      stroke(k >= 0 ? 255 : 120, 160 - min(abs(k), 4) * 20, k >= 0 ? 120 : 255);
      line(a[0], a[1], b[0], b[1]);
    }
  }
  let D = derivs(f, t), sp = Math.hypot(D.d1[0], D.d1[1]);
  let k = (D.d1[0] * D.d2[1] - D.d1[1] * D.d2[0]) / sp ** 3;
  let T = [D.d1[0] / sp, D.d1[1] / sp], N = [-T[1], T[0]];   // N は左向き（符号つき曲率と合わせる）
  let p = P(D.p);
  if (showCircle && Math.abs(k) > 0.02) {
    let rho = 1 / k, c = P([D.p[0] + N[0] * rho, D.p[1] + N[1] * rho]);
    noFill(); stroke(255, 230, 90, 200); strokeWeight(2); circle(c[0], c[1], 2 * Math.abs(rho) * U);
    stroke(255, 230, 90, 120); line(p[0], p[1], c[0], c[1]);
    noStroke(); fill(255, 230, 90); circle(c[0], c[1], 6);
  }
  stroke(255, 90, 90); strokeWeight(3); line(p[0], p[1], p[0] + T[0] * 70, p[1] - T[1] * 70);
  stroke(90, 230, 120); line(p[0], p[1], p[0] + N[0] * 50, p[1] - N[1] * 50);
  noStroke(); fill(255); circle(p[0], p[1], 12);
  fill(255, 230, 90); textSize(17);
  text('κ = (x′y″ − y′x″) / (x′² + y′²)^(3/2) = ' + nf(k, 1, 3) + '　　接触円の半径 ρ = 1/|κ| = ' + (Math.abs(k) > 0.01 ? nf(1 / Math.abs(k), 1, 3) : '∞（変曲点）'), 20, height - 175);
  plot(ks, null, t, 'κ(t)（赤 = 左に曲がる、青 = 右に曲がる）');
}

function proj(q) {   // 3D → 画面（正射影）
  let c = Math.cos(yaw), s = Math.sin(yaw);
  let x1 = c * q[0] + s * q[1], y1 = -s * q[0] + c * q[1];
  let up = y1 * Math.sin(tilt) + q[2] * Math.cos(tilt);
  let k = mode === 2 ? U * 0.55 : U;   // つる巻き線は縦に長いので小さめに
  return [width / 2 + x1 * k, height * 0.42 - up * k];
}
function draw3d() {
  let ks = [], ts = [];
  stroke(160, 180, 255, 160); strokeWeight(2); noFill();
  let prev = null;
  for (let i = 0; i <= 400; i++) {
    let s = (i / 400) * TWO_PI, D = derivs(curve3, s);
    let cr = vcross(D.d1, D.d2), cl = vlen(cr);
    ks.push(cl / vlen(D.d1) ** 3); ts.push(vdot(cr, D.d3) / max(cl * cl, 1e-9));
    let q = proj(D.p);
    if (prev) line(prev[0], prev[1], q[0], q[1]);
    prev = q;
  }
  let D = derivs(curve3, t), cr = vcross(D.d1, D.d2);
  let T = vunit(D.d1), B = vunit(cr), N = vcross(B, T);
  let k = vlen(cr) / vlen(D.d1) ** 3, tau = vdot(cr, D.d3) / max(vdot(cr, cr), 1e-9);
  let p = proj(D.p);
  // 接触円（T と N が張る平面の中）
  if (showCircle && k > 0.02) {
    let rho = 1 / k, c = vadd(D.p, vmul(N, rho));
    stroke(255, 230, 90, 180); strokeWeight(1.5); noFill(); beginShape();
    for (let i = 0; i <= 60; i++) { let a = (i / 60) * TWO_PI; let q = proj(vadd(c, vadd(vmul(N, -rho * Math.cos(a)), vmul(T, rho * Math.sin(a))))); vertex(q[0], q[1]); }
    endShape();
  }
  // B が張る「法平面」の小さな四角（ねじれが見える）
  let L = 0.35;
  for (let [v, col] of [[T, [255, 90, 90]], [N, [90, 230, 120]], [B, [100, 150, 255]]]) {
    let q = proj(vadd(D.p, vmul(v, L)));
    stroke(...col); strokeWeight(4); line(p[0], p[1], q[0], q[1]);
  }
  noStroke(); fill(255); circle(p[0], p[1], 12);
  fill(255, 230, 90); textSize(17);
  let txt = 'κ = |r′ × r″| / |r′|³ = ' + nf(k, 1, 3) + '　　τ = (r′ × r″)·r‴ / |r′ × r″|² = ' + nf(tau, 1, 3);
  if (mode === 2) txt += '　　理論値：κ = a/(a²+b²) = ' + nf(1 / (1 + pitch * pitch), 1, 3) + '、τ = b/(a²+b²) = ' + nf(pitch / (1 + pitch * pitch), 1, 3);
  text(txt, 20, height - 175);
  plot(ks, ts, t, 'κ（黄）と τ（水色）');
}

// 下のグラフ
function plot(a, b, tNow, title) {
  let x0 = 40, x1 = width - 40, y0 = height - 140, h = 110;
  noStroke(); fill(255, 255, 255, 12); rect(x0, y0, x1 - x0, h, 6);
  let all = a.concat(b || []).map(Math.abs), m = max(1, min(8, max(all) * 1.1));
  stroke(255, 60); line(x0, y0 + h / 2, x1, y0 + h / 2);
  for (let [arr, c] of [[a, [255, 230, 90]], [b, [120, 220, 255]]]) {
    if (!arr) continue;
    stroke(...c); strokeWeight(2); noFill(); beginShape();
    for (let i = 0; i < arr.length; i++) vertex(x0 + ((x1 - x0) * i) / (arr.length - 1), y0 + h / 2 - (constrain(arr[i], -m, m) / m) * (h / 2 - 4));
    endShape();
  }
  let xn = x0 + ((x1 - x0) * tNow) / TWO_PI;
  stroke(255); line(xn, y0, xn, y0 + h);
  noStroke(); fill(200); textSize(13); text(title + '　縦軸 ±' + nf(m, 1, 1), x0 + 8, y0 + 16);
}

function mouseDragged() { if (mode > 1) { yaw -= movedX * 0.01; tilt = constrain(tilt + movedY * 0.01, -1.5, 1.5); } }
function keyPressed() {
  if (key === '1' || key === '2' || key === '3') mode = int(key);
  if (key === LEFT_ARROW) shape2d = (shape2d + CURVES2D.length - 1) % CURVES2D.length;
  if (key === RIGHT_ARROW) shape2d = (shape2d + 1) % CURVES2D.length;
  if (key === UP_ARROW) pitch = min(1.5, pitch + 0.05);
  if (key === DOWN_ARROW) pitch = max(0, pitch - 0.05);
  if (key === ' ') playing = !playing;
  if (key === 'o' || key === 'O') showCircle = !showCircle;
}

// ---------- やってみよう ----------
// 1. 楕円の κ がいちばん大きいのはどこ？ 接触円の半径と楕円の長さ 1.4・0.8 の関係（ρ = b²/a）を確かめよう
// 2. 正弦波で κ = 0 になる点（変曲点）では接触円が直線（半径 ∞）になる
// 3. つる巻き線のピッチを 0 にすると τ = 0（平面の円）。ピッチを大きくすると κ と τ はどう変わる？
// 4. curve3 に自分の 3D 曲線（例：(cos t, sin t, sin 3t)）を入れて、κ と τ のグラフを見よう


// ==================================================
// ここから下は「ベクトルの道具」
// ==================================================
function vadd(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function vmul(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
function vdot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function vcross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function vlen(a) { return Math.sqrt(vdot(a, a)); }
function vunit(a) { let l = vlen(a) || 1; return vmul(a, 1 / l); }
