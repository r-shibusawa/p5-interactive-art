// ============================================
// 10 回転数と代数学の基本定理
// 多項式 p(z) = (z − α₁)(z − α₂)… に、半径 r の円 |z| = r をまるごと入れると、右に閉じた曲線ができる
//   その曲線が 0 のまわりを回る回数 ＝ 円の内側にある根の数。r を大きくすると必ず n 回 → n 次式には根が n 個ある（代数学の基本定理）
// ↑↓ = 円の半径 r / 根をドラッグ = 動かす / N = 根を足す / D = 根を減らす / スペース = r を自動で動かす
// ============================================

let roots = [];
let r = 1.0;                 // ★ 円の半径
let sweep = false, sweepT = 0;
let M = 500;                 // ★ 円の上の点の数
let dragI = -1;
let zc, wc, zs, Rw;          // 左右の中心と大きさ

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  roots = [{ x: -1.0, y: 0.35 }, { x: 0.75, y: 0.6 }, { x: 0.25, y: -0.9 }];
  layout();
}
function layout() {
  zs = min(width * 0.2, height * 0.32) / 1.25;
  Rw = min(width * 0.22, height * 0.34);
  zc = { x: width * 0.26, y: height * 0.56 }; wc = { x: width * 0.72, y: height * 0.56 };
}

// ★ p(z) = Π (z − α_k)（複素数のかけ算）
function poly(x, y) {
  let re = 1, im = 0;
  for (let a of roots) { let dx = x - a.x, dy = y - a.y; [re, im] = [re * dx - im * dy, re * dy + im * dx]; }
  return { re, im };
}

function draw() {
  background(215, 30, 12);
  if (sweep) { sweepT += 0.006; r = 1.25 + 1.15 * sin(sweepT - HALF_PI); }
  if (keyIsDown(UP_ARROW)) r = min(2.4, r + 0.01);
  if (keyIsDown(DOWN_ARROW)) r = max(0.05, r - 0.01);
  if (dragI >= 0) { roots[dragI].x = constrain((mouseX - zc.x) / zs, -2.2, 2.2); roots[dragI].y = constrain(-(mouseY - zc.y) / zs, -2.2, 2.2); }

  // 円の上の点と、その行き先 w = p(z)
  let ws = [], K = 0;
  for (let i = 0; i <= M; i++) { let th = (i / M) * TWO_PI, w = poly(r * cos(th), r * sin(th)); ws.push(w); K += Math.hypot(w.re, w.im); }
  K = K / (M + 1) + 1e-9;
  // ★ 回転数：w の向き（偏角）の変化を合計して 2π で割る
  let sum = 0;
  for (let i = 0; i < M; i++) {
    let d = Math.atan2(ws[i + 1].im, ws[i + 1].re) - Math.atan2(ws[i].im, ws[i].re);
    if (d > PI) d -= TWO_PI; if (d < -PI) d += TWO_PI;
    sum += d;
  }
  let wind = Math.round(sum / TWO_PI);
  let inside = roots.filter((a) => Math.hypot(a.x, a.y) < r).length;

  // 左：z の平面
  axes(zc, zs * 2.2, 'z の平面');
  noFill(); strokeWeight(5);
  for (let i = 0; i < M; i += 2) { let a = (i / M) * TWO_PI, b = ((i + 2) / M) * TWO_PI; stroke((i / M) * 360, 70, 100); line(zc.x + r * zs * cos(a), zc.y - r * zs * sin(a), zc.x + r * zs * cos(b), zc.y - r * zs * sin(b)); }
  for (let a of roots) { let isIn = Math.hypot(a.x, a.y) < r; noStroke(); fill(isIn ? 50 : 0, isIn ? 90 : 0, 100); circle(zc.x + a.x * zs, zc.y - a.y * zs, 18); }
  // 右：w = p(z) の平面（遠くを縮めて表示：w / (|w| + K)）
  axes(wc, Rw * 1.1, 'w = p(z) の平面');
  let toW = (w) => { let m = Math.hypot(w.re, w.im), s = Rw / (m + K); return { x: wc.x + w.re * s, y: wc.y - w.im * s }; };
  strokeWeight(3);
  for (let i = 0; i < M; i++) { let a = toW(ws[i]), b = toW(ws[i + 1]); stroke((i / M) * 360, 70, 100); line(a.x, a.y, b.x, b.y); }
  noStroke(); fill(0, 0, 100); circle(wc.x, wc.y, 12);
  // 動く目印
  let k = floor((frameCount * 2) % M), th = (k / M) * TWO_PI, mw = toW(ws[k]);
  fill(0, 0, 100); circle(zc.x + r * zs * cos(th), zc.y - r * zs * sin(th), 14); circle(mw.x, mw.y, 14);
  stroke(0, 0, 100, 50); strokeWeight(1); line(wc.x, wc.y, mw.x, mw.y);

  noStroke(); fill(0, 0, 100); textSize(26);
  text('r = ' + nf(r, 1, 2) + '　　0 のまわりを回る回数 = ' + wind + '　　円の内側の根 = ' + inside, 20, height - 70);
  fill(wind === inside ? 130 : 0, 60, 100); textSize(18);
  text(wind === inside ? '一致！（偏角の原理）' : '円がちょうど根の上を通っている', 20, height - 38);
  fill(0, 0, 70); textSize(16);
  text('次数 n = ' + roots.length + '。r を大きくすると回る回数は n になる。p(z) ≈ zⁿ だから', width * 0.5, height - 38);
  fill(0, 0, 100); textSize(18);
  text('↑↓：半径 r　根をドラッグ　N：根を足す　D：根を減らす　スペース：r を自動 ' + (sweep ? 'ON' : 'off'), 20, 40);
  fill(0, 0, 60); textSize(15);
  text('円の色と右の曲線の色が対応。黄色 = 円の内側の根。円が根を横切る瞬間、右の曲線は 0 を通過する', 20, 68);
}

function axes(c, L, title) {
  stroke(0, 0, 40); strokeWeight(1);
  line(c.x - L, c.y, c.x + L, c.y); line(c.x, c.y - L, c.x, c.y + L);
  noStroke(); fill(0, 0, 60); textSize(16); text(title, c.x - L, c.y - L + 4);
}

function mousePressed() {
  dragI = roots.findIndex((a) => Math.hypot(zc.x + a.x * zs - mouseX, zc.y - a.y * zs - mouseY) < 16);
}
function mouseReleased() { dragI = -1; }
function keyPressed() {
  if ((key === 'n' || key === 'N') && roots.length < 7) roots.push({ x: random(-1.5, 1.5), y: random(-1.5, 1.5) });
  if ((key === 'd' || key === 'D') && roots.length > 1) roots.pop();
  if (key === ' ') sweep = !sweep;
}

// ---------- やってみよう ----------
// 1. r をゆっくり大きくして、根を 1 つ追い越すたびに回る回数が 1 ずつ増えるのを確かめよう
// 2. 根を 2 つ重ねる（重根）と、右の曲線はどうなる？
// 3. poly() を p(z) = z² + 1 のように係数で書きかえてみよう。根は ±i（図の上下）にある？
// 4. 「円を大きくすると n 回、小さくすると 0 回 → 途中で必ず 0 を通る」。これが代数学の基本定理の証明のアイデア
