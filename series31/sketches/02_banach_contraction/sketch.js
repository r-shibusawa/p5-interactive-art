// ============================================
// 02 縮小写像の原理（バナッハの不動点定理）
// どの 2 点の距離も k 倍（k < 1）以下に縮める写像 T は、不動点をちょうど 1 つ持ち、どこから始めても T をくり返すとそこへ着く
//   誤差は毎回 k 倍 → 対数グラフでは直線。始める前に「何回で足りるか」まで分かる（事前評価）
// ←→ = 縮小率 k / ↑↓ = 回転 θ / N = 曲がった写像（非線形）/ クリック = 出発点 / スペース = 止める・動かす / R = やり直し
// ============================================

let k = 0.8;                 // ★ 縮小率（1 以上にすると？）
let theta = 0.6;             // ★ 1 回ごとに回す角度
let bx = 0.55, by = 0.3;     // ★ 平行移動
let nonlinear = false;
let eps = 1e-6;              // ★ 目標の精度
let start = { x: -1.3, y: 1.1 };
let seq = [];                // 出発点からの列 x0, x1, …
let shown = 1;               // 何個目まで表示したか
let others = [];             // ほかの出発点たち
let running = true;
let fixedP = { x: 0, y: 0 };
let cx0, cy0, U;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  cx0 = width * 0.3; cy0 = height * 0.57; U = min(width, height) * 0.2;
  rebuild();
}

// ★ 写像 T：回して k 倍して平行移動。N のときは少し曲げる（曲げた分を割って縮小率は k 以下のまま）
function T(p) {
  let x = p.x, y = p.y;
  if (nonlinear) {
    let c = 0.35, w = 1.6;
    x = (p.x + c * Math.sin(w * p.y)) / (1 + c * w);
    y = (p.y + c * Math.sin(w * p.x)) / (1 + c * w);
  }
  let cs = Math.cos(theta), sn = Math.sin(theta);
  return { x: constrain(k * (cs * x - sn * y) + bx, -1e3, 1e3), y: constrain(k * (sn * x + cs * y) + by, -1e3, 1e3) };
}

function rebuild() {
  // 不動点：何度もくり返して求める（k < 1 なら必ず着く）
  let p = { x: 0, y: 0 };
  for (let i = 0; i < 3000; i++) p = T(p);
  fixedP = p;
  seq = [start];
  for (let i = 0; i < 80; i++) seq.push(T(seq[seq.length - 1]));
  shown = 1;
  others = [];
  for (let i = 0; i < 14; i++) {
    let a = i / 14 * TWO_PI;
    others.push([{ x: 1.6 * Math.cos(a), y: 1.6 * Math.sin(a) }]);
  }
}

function sx(x) { return cx0 + x * U; }
function sy(y) { return cy0 - y * U; }
function dd(p, q) { return Math.hypot(p.x - q.x, p.y - q.y); }

function draw() {
  background(230, 30, 11);
  if (running && frameCount % 20 === 0 && shown < seq.length) {
    shown++;
    for (let o of others) if (o.length < 40) o.push(T(o[o.length - 1]));
  }
  // 正方形 Q, T(Q), T²(Q), … ：入れ子になって 1 点に縮む
  noFill();
  let sq0 = [];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 20; j++) {
    let t = j / 20, c = [[-1.6, -1.6], [1.6, -1.6], [1.6, 1.6], [-1.6, 1.6]];
    let a = c[i], b = c[(i + 1) % 4];
    sq0.push({ x: lerp(a[0], b[0], t), y: lerp(a[1], b[1], t) });
  }
  let poly = sq0;
  for (let n = 0; n < 9; n++) {
    stroke(200 + n * 14, 50, 90, 70 - n * 6); strokeWeight(n === 0 ? 2 : 1.5);
    beginShape(); for (let p of poly) vertex(sx(p.x), sy(p.y)); endShape(CLOSE);
    poly = poly.map(T);
  }
  // ほかの出発点の軌跡（どこから始めても同じ点へ）
  for (let o of others) {
    stroke(0, 0, 70, 40); strokeWeight(1);
    for (let i = 0; i < o.length - 1; i++) line(sx(o[i].x), sy(o[i].y), sx(o[i + 1].x), sy(o[i + 1].y));
    noStroke(); fill(0, 0, 80, 70); let q = o[o.length - 1]; circle(sx(q.x), sy(q.y), 5);
  }
  // 主役の列
  stroke(320, 70, 100); strokeWeight(2);
  for (let i = 0; i < shown - 1; i++) line(sx(seq[i].x), sy(seq[i].y), sx(seq[i + 1].x), sy(seq[i + 1].y));
  noStroke();
  for (let i = 0; i < shown; i++) { fill(320, 70, 100, i === 0 ? 100 : 80); circle(sx(seq[i].x), sy(seq[i].y), i === 0 ? 12 : 7); }
  // 不動点
  if (k < 1) { fill(45, 90, 100); circle(sx(fixedP.x), sy(fixedP.y), 14); }

  drawErrorPlot();

  noStroke(); fill(0, 0, 100); textSize(18);
  text('k = ' + nf(k, 1, 2) + '（←→）　θ = ' + nf(theta, 1, 2) + '（↑↓）　N：' + (nonlinear ? '曲がった写像' : 'まっすぐ（相似変換）') + '　クリック：出発点　スペース：' + (running ? '止める' : '動かす') + '　R：やり直し', 20, 40);
  fill(0, 0, 60); textSize(15);
  text(k < 1 ? '正方形 Q を T でくり返し写すと、入れ子の図形が 1 点（黄色 = 不動点）に縮む。どの出発点（白）も同じ点へ着く'
             : 'k ≥ 1：縮小写像ではない。不動点があっても列はそこへ着かない（広がる・回り続ける）', 20, 68);
}

// 右側：誤差 |x_n − x*| の対数グラフと事前評価
function drawErrorPlot() {
  let x0p = width * 0.6, w = width * 0.36, y0p = 130, h = height * 0.42;
  noFill(); stroke(0, 0, 35); strokeWeight(1); rect(x0p, y0p, w, h);
  let N = 60, top = 1, bot = -12;              // 縦軸 = log10（10¹ 〜 10⁻¹²）
  let gyv = (v) => map(constrain(Math.log10(max(v, 1e-14)), bot, top), top, bot, y0p, y0p + h);
  for (let e = top; e >= bot; e -= 3) {
    stroke(0, 0, 25); line(x0p, gyv(Math.pow(10, e)), x0p + w, gyv(Math.pow(10, e)));
    noStroke(); fill(0, 0, 55); textSize(12); text('1e' + e, x0p - 38, gyv(Math.pow(10, e)) + 4);
  }
  stroke(45, 90, 100, 60); line(x0p, gyv(eps), x0p + w, gyv(eps));
  // 事前評価：|x_n − x*| ≤ kⁿ/(1−k)·|x1 − x0|
  let d01 = dd(seq[0], seq[1]);
  if (k < 1) {
    stroke(190, 70, 100); strokeWeight(1.5); drawingContext.setLineDash([6, 6]);
    noFill(); beginShape();
    for (let n = 0; n <= N; n++) vertex(x0p + n / N * w, gyv(Math.pow(k, n) / (1 - k) * d01));
    endShape(); drawingContext.setLineDash([]);
  }
  // 実際の誤差
  noStroke(); fill(320, 70, 100);
  let reached = -1;
  for (let n = 0; n < min(shown, N + 1); n++) {
    let e = dd(seq[n], fixedP);
    circle(x0p + n / N * w, gyv(e), 6);
    if (reached < 0 && e < eps) reached = n;
  }
  fill(0, 0, 70); textSize(14);
  text('誤差 |x_n − x*|（縦は対数、横は回数 n）', x0p, y0p - 12);
  let ty = y0p + h + 34;
  textSize(16); fill(0, 0, 100);
  if (k < 1) {
    let need = ceil(Math.log(eps * (1 - k) / max(d01, 1e-12)) / Math.log(k));
    text('事前評価（点線）：|x_n − x*| ≤ kⁿ /(1−k) · |x₁ − x₀|', x0p, ty);
    fill(190, 70, 100); text('→ 誤差 ' + eps + ' 以下に必要な回数 n ≥ ' + max(0, need) + '（始める前に分かる）', x0p, ty + 28);
    fill(320, 70, 100); text('実際に ' + eps + ' を切った回数：' + (reached >= 0 ? reached : '…'), x0p, ty + 56);
    fill(0, 0, 60); textSize(14);
    text('傾き = log₁₀ k = ' + nf(Math.log10(k), 1, 3) + '（1 回で桁が ' + nf(-Math.log10(k), 1, 2) + ' 個ずつ減る）', x0p, ty + 86);
    text('事後評価：|x_n − x*| ≤ k/(1−k) · |x_n − x_{n−1}|（止めどきの判定に使う）', x0p, ty + 110);
  } else {
    fill(0, 80, 100); text('k ≥ 1 なので評価式は使えない', x0p, ty);
  }
}

function mousePressed() {
  if (mouseX < width * 0.56 && mouseY > 90) {
    start = { x: (mouseX - cx0) / U, y: (cy0 - mouseY) / U };
    rebuild();
  }
}
function keyPressed() {
  if (key === LEFT_ARROW) k = max(0.1, k - 0.05);
  if (key === RIGHT_ARROW) k = min(1.1, k + 0.05);
  if (key === UP_ARROW) theta += 0.1;
  if (key === DOWN_ARROW) theta -= 0.1;
  if (key === 'n' || key === 'N') nonlinear = !nonlinear;
  if (key === ' ') running = !running;
  if (key === 'r' || key === 'R') start = { x: -1.3, y: 1.1 };
  rebuild();
}

// ---------- やってみよう ----------
// 1. k = 0.5 と k = 0.9 で、誤差のグラフの傾きを比べよう。10 桁合わせるのに何回ずつ要る？
// 2. k = 1、θ = 0.6 にすると？（回るだけで近づかない。不動点はあるのに着かない）
// 3. N の曲がった写像でも直線のグラフになる。曲がっていても「縮小率 k 以下」なら定理が使える
// 4. eps を 1e-10 にして、事前評価の回数と実際の回数を比べよう。事前評価はいつも「多め」に言う
