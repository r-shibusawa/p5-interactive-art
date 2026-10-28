// ============================================
// 09 三体問題とラグランジュ点
// 太陽と惑星と一緒に回る座標（回転座標系）で見ると、重力と遠心力がつり合う点が 5 つある（L1〜L5）
//   色の帯 = 有効ポテンシャルの等高線。L4・L5 は山の頂上なのに、コリオリの力のおかげで小さな星が留まる
// クリック = 小さな星を置く / 4 = L4 のまわりに置く / 1 = L1 のまわりに置く / ↑↓ = 質量比 μ / F = 8 の字の三体 / P = 少しずらす / C = 消す
// ============================================

let mu = 0.01;             // ★ 惑星の質量 /（太陽 + 惑星）。0.0385 より大きいと L4 は不安定
let speed = 6;             // ★ 1 フレームに何ステップ進めるか
let h = 0.002;             // ★ 時間の刻み（無次元）
let parts = [];            // 小さな星 {x, y, vx, vy, hue, trail}
let Lpts = [], bg;
let fig8 = false, bodies = [];
let HIST = 600, hC = [], hE = [];
let SC, CX, CY;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  CX = width * 0.25; CY = height * 0.54; SC = min(width * 0.44 / 3.2, (height - 150) / 2.6);
  rebuild();
  addCluster(3, 0.02);
}

// 有効ポテンシャル Ω = (x² + y²)/2 + (1 − μ)/r₁ + μ/r₂（遠心力 + 2 つの重力）
function Omega(x, y) {
  let r1 = sqrt((x + mu) ** 2 + y * y), r2 = sqrt((x - 1 + mu) ** 2 + y * y);
  return (x * x + y * y) / 2 + (1 - mu) / max(r1, 1e-3) + mu / max(r2, 1e-3);
}
// ★ 回転座標系の運動方程式：重力 + 遠心力 + コリオリの力（2ẏ, −2ẋ）
function deriv(s) {
  let [x, y, vx, vy] = s;
  let r1 = max(sqrt((x + mu) ** 2 + y * y), 0.01), r2 = max(sqrt((x - 1 + mu) ** 2 + y * y), 0.01);
  let ax = 2 * vy + x - (1 - mu) * (x + mu) / r1 ** 3 - mu * (x - 1 + mu) / r2 ** 3;
  let ay = -2 * vx + y - (1 - mu) * y / r1 ** 3 - mu * y / r2 ** 3;
  return [vx, vy, ax, ay];
}
function rk4(s, dt, f) {
  let k1 = f(s), k2 = f(s.map((v, i) => v + k1[i] * dt / 2)), k3 = f(s.map((v, i) => v + k2[i] * dt / 2)), k4 = f(s.map((v, i) => v + k3[i] * dt));
  return s.map((v, i) => v + dt / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
}

function rebuild() {
  // L1〜L3：x 軸上で力がつり合う点を二分法で探す
  let fx = (x) => x - (1 - mu) * (x + mu) / abs(x + mu) ** 3 - mu * (x - 1 + mu) / abs(x - 1 + mu) ** 3;
  let bis = (a, b) => { for (let i = 0; i < 80; i++) { let c = (a + b) / 2; if (fx(a) * fx(c) <= 0) b = c; else a = c; } return (a + b) / 2; };
  Lpts = [[bis(-mu + 1e-4, 1 - mu - 1e-4), 0], [bis(1 - mu + 1e-4, 2), 0], [bis(-2, -mu - 1e-4), 0], [0.5 - mu, sqrt(3) / 2], [0.5 - mu, -sqrt(3) / 2]];
  // 背景：Ω の等高線を色の帯で（小さい画像に描いて拡大）
  bg = createGraphics(180, 146); bg.pixelDensity(1); bg.loadPixels();
  let cL = Omega(Lpts[0][0], 0);
  for (let j = 0; j < bg.height; j++) for (let i = 0; i < bg.width; i++) {
    let x = (i / bg.width - 0.5) * (width * 0.46) / SC, y = -(j / bg.height - 0.5) * (height - 120) / SC;
    let o = min(Omega(x, y), cL + 0.2), band = floor(o / 0.015), k = 4 * (j * bg.width + i);   // 遠く・星の近くは同じ色に
    let c = hsb2rgb(map(constrain(o, 1.4, cL + 0.15), 1.4, cL + 0.15, 240, 330), 0.45, band % 2 ? 0.26 : 0.19);
    bg.pixels[k] = c[0]; bg.pixels[k + 1] = c[1]; bg.pixels[k + 2] = c[2]; bg.pixels[k + 3] = 255;
  }
  bg.updatePixels();
}

function addAt(x, y, vx, vy, hue) {
  parts.push({ s: [x, y, vx, vy], hue, trail: [] });
  if (parts.length > 40) parts.shift();
}
function addCluster(li, spread) {
  for (let i = 0; i < 8; i++) addAt(Lpts[li][0] + (Math.random() - 0.5) * spread, Lpts[li][1] + (Math.random() - 0.5) * spread, 0, 0, li === 3 ? 140 : 20);
}
function jacobi(s) { return 2 * Omega(s[0], s[1]) - s[2] * s[2] - s[3] * s[3]; }

// 8 の字の解（Chenciner–Montgomery 2000）：同じ質量 3 つが同じ 8 の字を追いかけあう
function startFig8(eps) {
  let x1 = 0.97000436, y1 = -0.24308753, vx3 = -0.93240737, vy3 = -0.86473146;
  bodies = [[x1, y1, -vx3 / 2, -vy3 / 2], [-x1, -y1, -vx3 / 2, -vy3 / 2], [eps, 0, vx3, vy3]].map((s, i) => ({ s, hue: [30, 200, 320][i], trail: [] }));
  hE = [];
}
function fig8Deriv(all) {
  // all = [x1, y1, vx1, vy1, x2, ...]
  let out = new Array(12).fill(0);
  for (let i = 0; i < 3; i++) { out[4 * i] = all[4 * i + 2]; out[4 * i + 1] = all[4 * i + 3]; }
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    if (i === j) continue;
    let dx = all[4 * j] - all[4 * i], dy = all[4 * j + 1] - all[4 * i + 1], r = max(sqrt(dx * dx + dy * dy), 0.02);
    out[4 * i + 2] += dx / r ** 3; out[4 * i + 3] += dy / r ** 3;
  }
  return out;
}
function fig8Energy(all) {
  let E = 0;
  for (let i = 0; i < 3; i++) E += 0.5 * (all[4 * i + 2] ** 2 + all[4 * i + 3] ** 2);
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) E -= 1 / max(Math.hypot(all[4 * j] - all[4 * i], all[4 * j + 1] - all[4 * i + 1]), 0.02);
  return E;
}

function draw() {
  background(250, 30, 8);
  if (fig8) { drawFig8(); return; }
  for (let k = 0; k < speed; k++) for (let p of parts) p.s = rk4(p.s, h, deriv);
  parts = parts.filter((p) => p.s.every(isFinite) && Math.hypot(p.s[0], p.s[1]) < 3);
  for (let p of parts) { p.trail.push([p.s[0], p.s[1]]); if (p.trail.length > 500) p.trail.shift(); }
  if (parts.length) pushHist(hC, jacobi(parts[0].s));

  imageMode(CENTER); image(bg, CX, CY, width * 0.46, height - 120); imageMode(CORNER);
  let X = (x) => CX + x * SC, Y = (y) => CY - y * SC;
  noStroke(); fill(45, 90, 100); circle(X(-mu), Y(0), 30);
  fill(200, 60, 100); circle(X(1 - mu), Y(0), 8 + 60 * sqrt(mu));
  Lpts.forEach((L, i) => { noFill(); stroke(0, 0, 100); strokeWeight(1.5); circle(X(L[0]), Y(L[1]), 12); noStroke(); fill(0, 0, 100); textSize(14); text('L' + (i + 1), X(L[0]) + 8, Y(L[1]) - 8); });
  for (let p of parts) {
    stroke(p.hue, 70, 100, 60); strokeWeight(1.2); noFill();
    beginShape(); for (let q of p.trail) vertex(X(q[0]), Y(q[1])); endShape();
    noStroke(); fill(p.hue, 70, 100); circle(X(p.s[0]), Y(p.s[1]), 7);
  }

  // 右：説明とヤコビ積分
  let gx = width * 0.52, gw = width * 0.44;
  noStroke(); fill(0, 0, 12); rect(gx, height * 0.12, gw, height * 0.36, 6);
  fill(0, 0, 85); textSize(15);
  let lines = ['μ = ' + nf(mu, 1, 4) + '（↑↓）　L4・L5 の安定条件 μ < 0.0385 → ' + (mu < 0.0385 ? '安定' : '不安定'),
    'L1 = ' + nf(Lpts[0][0], 1, 3) + '、L2 = ' + nf(Lpts[1][0], 1, 3) + '、L3 = ' + nf(Lpts[2][0], 1, 3) + '（太陽と惑星の距離 = 1）',
    'L4・L5 は太陽・惑星と正三角形をつくる点（緑の星）',
    'L1 は峠（鞍点）。少しずれると転がり落ちる（オレンジの星）',
    '本物の例：木星のトロヤ群小惑星（L4・L5）、JWST（L2）'];
  lines.forEach((s, i) => text(s, gx + 14, height * 0.12 + 30 + i * 28));
  drawPlot(gx, height * 0.54, gw, height * 0.34, [{ data: hC, hue: 140, name: 'C = 2Ω − v²' }], hC.length ? min(...hC) - 0.01 : 0, hC.length ? max(...hC) + 0.01 : 1, '1 つめの星のヤコビ積分（回転座標系で保存される「エネルギー」）');

  noStroke(); fill(0, 0, 100); textSize(18);
  text('クリック：星を置く　4：L4 に置く　1：L1 に置く　↑↓：μ　F：8 の字の三体　C：消す', 20, 40);
  fill(0, 0, 65); textSize(15);
  text('回転座標系では、遠心力（外向き）とコリオリの力（速度に直角）がはたらく。止まって置いた星も、すぐに曲がって動き出す', 20, 68);
}

function drawFig8() {
  let all = [].concat(...bodies.map((b) => b.s));
  for (let k = 0; k < 12; k++) all = rk4(all, 0.001, fig8Deriv);
  if (!all.every(isFinite)) { startFig8(0); return; }
  bodies.forEach((b, i) => { b.s = all.slice(4 * i, 4 * i + 4); b.trail.push([b.s[0], b.s[1]]); if (b.trail.length > 700) b.trail.shift(); });
  pushHist(hE, fig8Energy(all));
  let S = min(width * 0.2, height * 0.35), X = (x) => width * 0.25 + x * S, Y = (y) => height * 0.54 - y * S;
  for (let b of bodies) {
    stroke(b.hue, 70, 100, 60); strokeWeight(2); noFill();
    beginShape(); for (let q of b.trail) vertex(X(q[0]), Y(q[1])); endShape();
    noStroke(); fill(b.hue, 70, 100); circle(X(b.s[0]), Y(b.s[1]), 22);
  }
  let px = 0, py = 0; for (let b of bodies) { px += b.s[2]; py += b.s[3]; }
  drawPlot(width * 0.52, height * 0.2, width * 0.44, height * 0.4, [{ data: hE, hue: 55, name: '全エネルギー' }], -1.4, -1.2, 'エネルギー（保存されるはず）');
  noStroke(); fill(0, 0, 100); textSize(18);
  text('8 の字の三体（Chenciner–Montgomery の解）　P：真ん中の星を少しずらす　F：戻る', 20, 40);
  fill(0, 0, 65); textSize(15);
  text('同じ質量の 3 つの星が 1 本の 8 の字を追いかけあう特別な周期解。運動量の合計 (' + nf(px, 1, 4) + ', ' + nf(py, 1, 4) + ')。少しずらすと、いつか崩れる（カオス、シリーズ 4）', 20, 68);
}

function mousePressed() {
  if (fig8 || mouseX > width * 0.48 || mouseY < 90) return;
  addAt((mouseX - CX) / SC, -(mouseY - CY) / SC, 0, 0, 55);
}
function keyPressed() {
  if (key === '4') addCluster(3, 0.04);
  if (key === '1') addCluster(0, 0.01);
  if (key === UP_ARROW) { mu = min(mu * 1.5, 0.3); rebuild(); parts = []; hC = []; }
  if (key === DOWN_ARROW) { mu = max(mu / 1.5, 0.001); rebuild(); parts = []; hC = []; }
  if (key === 'c' || key === 'C') { parts = []; hC = []; }
  if (key === 'f' || key === 'F') { fig8 = !fig8; if (fig8) startFig8(0); }
  if (key === 'p' || key === 'P') { if (fig8) startFig8(0.01); }
}

// ---------- やってみよう ----------
// 1. 4 で L4 に星を置く。星はおたまじゃくしのような形でゆっくり回るが、L4 から離れない
// 2. μ を 0.05 以上にして同じことをする。今度は飛び去っていく（ラウスの条件）
// 3. 1 で L1 に置くと、太陽か惑星のどちらかへ落ちていく。峠の上のボールと同じ
// 4. F の 8 の字で P を押し、何周で崩れるか数える。刻み h を小さくすると長持ちする？


// ==================================================
// ここから下は「グラフを描く道具」です
// ==================================================
// HSB（色相 0〜360、彩度・明るさ 0〜1）→ RGB（0〜255）
function hsb2rgb(hh, ss, vv) {
  let f = (n) => { let k = (n + hh / 60) % 6; return vv - vv * ss * Math.max(0, Math.min(k, 4 - k, 1)); };
  return [f(5) * 255, f(3) * 255, f(1) * 255];
}
function pushHist(arr, val) {
  arr.push(isFinite(val) ? val : 0);
  if (arr.length > HIST) arr.shift();
}
function drawPlot(x0, y0, w, h0, series, lo, hi, title) {
  noStroke(); fill(0, 0, 12); rect(x0, y0, w, h0, 6);
  for (let s of series) {
    stroke(s.hue, 70, 100); strokeWeight(2); noFill();
    beginShape();
    for (let i = 0, off = HIST - s.data.length; i < s.data.length; i++) vertex(map(i + off, 0, HIST - 1, x0, x0 + w), map(constrain(s.data[i], lo, hi), lo, hi, y0 + h0 - 10, y0 + 30));
    endShape();
  }
  noStroke(); fill(0, 0, 70); textSize(13); textAlign(LEFT, TOP);
  text(title + '　範囲 ' + nf(lo, 1, 3) + '〜' + nf(hi, 1, 3), x0 + 8, y0 + 6);
  textAlign(LEFT, BASELINE);
}
