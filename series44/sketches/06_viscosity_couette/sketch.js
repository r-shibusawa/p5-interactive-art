// ============================================
// 06 粘性 ─ クエット流とポアズイユ流
// 粘性 = となりの層を「引きずる」性質。速さの差をならして、運動量を横に伝える
// 2 枚の板のあいだの流れは、ナヴィエ・ストークス方程式がとても簡単になる：
//   ∂u/∂t = ν ∂²u/∂y² + G　　（ν = 動粘性係数、G = 圧力こう配による押す力）
// これは熱の拡散と同じ「拡散方程式」。止まった状態から始めて、定常解に近づくようすを見る
//   1 = クエット流（上の板を動かす → 直線）　2 = ポアズイユ流（圧力で押す → 放物線）　3 = 両方
// 1〜3 = 流れ / 上下キー = 粘性 ν / R = 止めた状態からやり直し / スペース = 一時停止
// ============================================

let nu = 0.1; // ★ 動粘性係数 ν（すき間 H = 1 としたときの値）
let Utop = 1.0; // ★ 上の板の速さ
let G = 0.8; // ★ 圧力こう配で押す力（ρ で割ったもの）
let scene = 1;
let N = 61; // 格子点の数（壁から壁まで）
let u, t = 0, paused = false;
let cols = []; // 色水のすじ（最初は縦一直線）

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  restart();
}

function restart() {
  u = new Float32Array(N);
  t = 0; cols = [];
  for (let k = 0; k < 6; k++) cols.push(new Float32Array(N).fill(k / 6));
}

function topSpeed() { return scene === 2 ? 0 : Utop; }
function push1() { return scene === 1 ? 0 : G; }
// 定常解（時間がたったあとの形）：直線 + 放物線
function steady(y) { return topSpeed() * y + push1() / (2 * nu) * y * (1 - y); }

// ★ 拡散方程式を 1 歩進める：u[i] の変化 = ν × (上 − 2 × 自分 + 下) / Δy² + G
function stepFlow(dt) {
  let dy = 1 / (N - 1), a = nu * dt / (dy * dy), g = push1();
  let old = u.slice();
  for (let i = 1; i < N - 1; i++) u[i] = old[i] + a * (old[i - 1] - 2 * old[i] + old[i + 1]) + g * dt;
  u[0] = 0; u[N - 1] = topSpeed(); // 壁では流体は壁と同じ速さ（すべりなし条件）
}

function draw() {
  background(215, 60, 10);
  let frameDt = paused ? 0 : 1 / 60;
  // 陽解法は ν Δt / Δy² ≤ 0.5 でないと発散するので、1 フレームを細かく分ける
  let dy = 1 / (N - 1), sub = Math.max(1, Math.ceil(frameDt * nu / (0.4 * dy * dy)));
  for (let k = 0; k < sub; k++) stepFlow(frameDt / sub);
  t += frameDt;

  let x0 = width * 0.05, x1 = width * 0.6, yB = height * 0.82, yT = height * 0.3, W = x1 - x0, H = yB - yT;
  let ypx = (i) => yB - H * i / (N - 1);

  // ---- 色水のすじ：それぞれの高さの速さで右へ流される（速度分布を積み上げた形になる）
  noFill(); strokeWeight(3);
  for (let n = 0; n < cols.length; n++) {
    let c = cols[n];
    for (let i = 0; i < N; i++) { c[i] += u[i] * frameDt * 0.25; c[i] -= Math.floor(c[i]); }
    stroke(185, 60, 100, 80);
    for (let i = 1; i < N; i++) if (Math.abs(c[i] - c[i - 1]) < 0.5) line(x0 + c[i - 1] * W, ypx(i - 1), x0 + c[i] * W, ypx(i));
  }
  // ---- 板
  noStroke(); fill(42, 40, 85);
  rect(x0, yB, W, 14); rect(x0, yT - 14, W, 14);
  stroke(215, 60, 10); strokeWeight(3);
  let slide = (t * topSpeed() * 0.25 * W) % 40;
  for (let x = x0 + slide; x < x1; x += 40) line(x, yT - 14, x, yT); // 上の板のしま模様（動きが見える）
  for (let x = x0; x < x1; x += 40) line(x, yB, x, yB + 14);
  if (scene !== 1) { stroke(12, 70, 100); strokeWeight(4); arrowLine(x0 - 30, (yB + yT) / 2, x0 - 4, (yB + yT) / 2); }

  // ---- 右：速度分布のグラフ（横 = 速さ u、縦 = 高さ y）
  let gx = width * 0.68, gw = width * 0.27, top = 1.1;
  for (let i = 0; i < N; i++) top = Math.max(top, steady(i / (N - 1)) * 1.08);
  let sc = gw / top;
  stroke(0, 0, 40); strokeWeight(1);
  line(gx, yT, gx, yB); line(gx, yB, gx + gw, yB); line(gx, yT, gx + gw, yT);
  stroke(42, 80, 100, 80); strokeWeight(2); noFill(); // 定常解（点線）
  for (let i = 0; i < N - 1; i += 2) line(gx + steady(i / (N - 1)) * sc, ypx(i), gx + steady((i + 1) / (N - 1)) * sc, ypx(i + 1));
  stroke(185, 70, 100); strokeWeight(3);
  beginShape();
  for (let i = 0; i < N; i++) vertex(gx + u[i] * sc, ypx(i));
  endShape();
  strokeWeight(1.5);
  for (let i = 5; i < N - 1; i += 5) if (Math.abs(u[i] * sc) > 6) arrowLine(gx, ypx(i), gx + u[i] * sc, ypx(i));

  // ---- 数字
  let err = 0, big = 1e-6;
  for (let i = 0; i < N; i++) { err += Math.abs(u[i] - steady(i / (N - 1))); big += Math.abs(steady(i / (N - 1))); }
  let shear = nu * (u[1] - u[0]) / dy; // 下の壁を引きずる力（せん断応力 ÷ ρ）= ν du/dy
  noStroke(); fill(0, 0, 100); textSize(18);
  text(['', '1 クエット流（上の板が動く）', '2 ポアズイユ流（圧力で押す）', '3 クエット + ポアズイユ'][scene] + '　ν = ' + nf(nu, 1, 3) + '（上下キー）　R = やり直し　スペース = ' + (paused ? '再生' : '停止'), 20, 40);
  fill(0, 0, 80); textSize(15);
  text('∂u/∂t = ν ∂²u/∂y² + G　　時刻 t = ' + nf(t, 1, 2) + '　　定常解との差 ' + nf(100 * err / big, 1, 1) + '%　　なじむ時間の目安 H²/ν = ' + nf(1 / nu, 1, 1), 20, 68);
  fill(0, 0, 65);
  text('水色 = いまの速度分布　黄の点線 = 定常解　下の壁を引きずる力 ν du/dy = ' + nf(shear, 1, 3), 20, 94);
  fill(185, 70, 100); textSize(14); text('速さ u(y)', gx + 6, yT - 22);
  fill(0, 0, 65); text('色水のすじ（最初は縦一直線）', x0, yT - 22);
}

function arrowLine(x1, y1, x2, y2) {
  line(x1, y1, x2, y2);
  let d = x2 > x1 ? -7 : 7;
  line(x2, y2, x2 + d, y2 - 4); line(x2, y2, x2 + d, y2 + 4);
}

function keyPressed() {
  if (key === '1' || key === '2' || key === '3') { scene = Number(key); restart(); }
  if (key === UP_ARROW) nu = Math.min(nu * 1.3, 0.6);
  if (key === DOWN_ARROW) nu = Math.max(nu / 1.3, 0.04);
  if (key === 'r' || key === 'R') restart();
  if (key === ' ') paused = !paused;
}

// ---------- やってみよう ----------
// 1. 1 のクエット流で R。板の動きが下の層へ「しみこむ」ようすを見る。直線になるまで何秒？
// 2. ν を上げると早くなじむ（時間は H²/ν に比例）。はちみつと水、どちらが早い？
// 3. 2 のポアズイユ流：ν を上げると最大の速さは下がる（u_max = G H² / 8ν）。確かめよう
// 4. 3 にして G を 4 にすると、下のほうが板より速くなる。G を −4 にすると逆流する場所ができる
// 5. draw の中の 0.4 を 0.6 に変えると計算がこわれる（数値不安定）。どんなふうにこわれる？
