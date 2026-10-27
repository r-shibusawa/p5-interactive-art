// ============================================
// 12 勾配降下法
// 山の斜面で「いちばん急な下り坂（−勾配）」の方向へ少しずつ進むと、谷底（最小値）に近づく
//   x ← x − η·∇f(x)    η（学習率）が小さすぎると遅く、大きすぎると行き過ぎて振動・発散する
// P キーで「制約つき」：動ける範囲（円）の外に出たら、いちばん近い円の中の点に戻す（射影）
// 操作：クリック = 出発点 / スペース = 再生・停止 / → = 1 歩 / ↑↓ = 学習率 η
//       P = 制約（円）あり⇄なし / 1〜3 = 地形（細長い谷・バナナ形の谷・谷がいくつも）
// ============================================

let fn = 1;
let eta = 0.05;         // ★ 学習率
let constrained = false;
let pos = null, trail = [], fHist = [], diverged = false;
let auto = true, speed = 6;
let terrain;            // 地形の絵（あらかじめ描いておく）
let dom;                // 表示する範囲

const BG = '#14101f', PANEL = '#221a33', FG = '#e9e4f5', DIM = '#8c84a3';
const ORCHID = '#f0a3ff', MINT = '#6fe3d0', GOLD = '#ffcf6b', BAD = '#ff6b81';

// ★ 地形（損失関数）
function f(x, y) {
  if (fn === 1) return 0.5 * (x * x + 10 * y * y);                       // 細長いお椀
  if (fn === 2) return (1 - x) ** 2 + 6 * (y - x * x) ** 2;              // ローゼンブロック（バナナ形）
  return 0.15 * (x * x + y * y) - cos(1.8 * x) * cos(1.8 * y);           // 谷がいくつも
}
function grad(x, y) {
  let h = 1e-4;
  return [(f(x + h, y) - f(x - h, y)) / (2 * h), (f(x, y + h) - f(x, y - h)) / (2 * h)];
}
// 制約：中心 c、半径 r の円
function disk() { return fn === 2 ? { cx: -0.8, cy: 1.2, r: 0.9 } : { cx: -1.6, cy: 0.9, r: 1.0 }; }

function setup() {
  createCanvas(windowWidth, windowHeight);
  pickFn(1);
}

function pickFn(k) {
  fn = k;
  dom = fn === 2 ? { x0: -2, x1: 2, y0: -1, y1: 3 } : { x0: -3.5, x1: 3.5, y0: -2.5, y1: 2.5 };
  eta = fn === 2 ? 0.02 : fn === 1 ? 0.05 : 0.2;
  drawTerrain();
  startAt(fn === 2 ? -1.5 : 3, fn === 2 ? 2.5 : fn === 1 ? 1.8 : 1.5);
}

// 画面座標 ⇄ 地形の座標（地図部分は左側）
function mapW() { return width - 300; }
function toScreen(x, y) { return [map(x, dom.x0, dom.x1, 20, mapW() - 20), map(y, dom.y0, dom.y1, height - 20, 110)]; }
function toWorld(sx, sy) { return [map(sx, 20, mapW() - 20, dom.x0, dom.x1), map(sy, height - 20, 110, dom.y0, dom.y1)]; }

function drawTerrain() {
  if (terrain) terrain.remove();
  terrain = createGraphics(width, height);
  terrain.noStroke();
  let g = 6, vals = [];
  for (let sx = 20; sx < mapW() - 20; sx += g) for (let sy = 110; sy < height - 20; sy += g) {
    let [x, y] = toWorld(sx + g / 2, sy + g / 2);
    vals.push([sx, sy, f(x, y)]);
  }
  let lo = min(vals.map((v) => v[2])), hi = max(vals.map((v) => v[2]));
  for (let [sx, sy, v] of vals) {
    let t = Math.log(1 + (v - lo)) / Math.log(1 + (hi - lo));   // 対数スケールで色分け
    let band = floor(t * 14);
    let c = lerpColor(color('#2a1d4a'), color('#e7b5ff'), band / 14);
    terrain.fill(c); terrain.rect(sx, sy, g, g);
  }
}

function startAt(x, y) { pos = [x, y]; trail = [[x, y]]; fHist = [f(x, y)]; diverged = false; }

// ★ 1 歩進む
function descend() {
  if (!pos || diverged) return;
  let [gx, gy] = grad(pos[0], pos[1]);
  let x = pos[0] - eta * gx, y = pos[1] - eta * gy;
  if (constrained) {  // 射影：円の外に出たら円周上のいちばん近い点へ
    let D = disk(), dx = x - D.cx, dy = y - D.cy, r = sqrt(dx * dx + dy * dy);
    if (r > D.r) { x = D.cx + (dx / r) * D.r; y = D.cy + (dy / r) * D.r; }
  }
  if (!isFinite(x) || !isFinite(y) || abs(x) > 1e3 || abs(y) > 1e3) { diverged = true; return; }
  pos = [x, y]; trail.push([x, y]); fHist.push(f(x, y));
  if (trail.length > 400) { trail.shift(); fHist.shift(); }
}

function draw() {
  background(BG);
  if (auto && frameCount % speed === 0) descend();
  image(terrain, 0, 0);
  // 制約の円
  if (constrained) {
    let D = disk(), [sx, sy] = toScreen(D.cx, D.cy);
    let rx = (D.r * (mapW() - 40)) / (dom.x1 - dom.x0), ry = (D.r * (height - 130)) / (dom.y1 - dom.y0);
    noFill(); stroke(MINT); strokeWeight(3); drawingContext.setLineDash([8, 6]);
    ellipse(sx, sy, rx * 2, ry * 2);
    drawingContext.setLineDash([]);
  }
  // 軌跡
  noFill(); stroke(GOLD); strokeWeight(2.5);
  beginShape(); for (let [x, y] of trail) { let [sx, sy] = toScreen(x, y); vertex(sx, sy); } endShape();
  noStroke(); fill(GOLD);
  for (let [x, y] of trail) { let [sx, sy] = toScreen(x, y); circle(sx, sy, 5); }
  if (pos) {
    let [sx, sy] = toScreen(pos[0], pos[1]);
    let [gx, gy] = grad(pos[0], pos[1]);
    // −勾配の矢印
    let L = 60, m = sqrt(gx * gx + gy * gy) || 1;
    if (m > 1e-3) { stroke(BAD); strokeWeight(3); line(sx, sy, sx - (gx / m) * L, sy + (gy / m) * L); }
    noStroke(); fill(FG); circle(sx, sy, 14);
  }

  // パネル
  let px = width - 280;
  fill(PANEL); rect(px, 20, 260, height - 40, 12);
  fill(FG); textAlign(LEFT, TOP); textSize(17); text('f(x) の変化', px + 18, 36);
  if (fHist.length > 1) {
    let lo = min(fHist), hi = max(fHist);
    noFill(); stroke(ORCHID); strokeWeight(2);
    beginShape(); fHist.forEach((v, i) => vertex(px + 20 + (i / (fHist.length - 1)) * 220, 220 - ((v - lo) / max(hi - lo, 1e-9)) * 150)); endShape();
  }
  noStroke(); fill(FG); textSize(15);
  let info = pos ? `x = (${pos[0].toFixed(3)}, ${pos[1].toFixed(3)})\nf(x) = ${f(pos[0], pos[1]).toFixed(4)}\n歩数 ${trail.length - 1}` : '';
  text(`学習率 η = ${eta.toPrecision(2)}\n${info}\n制約：${constrained ? 'あり（円の中だけ）' : 'なし'}`, px + 18, 240);
  if (diverged) { fill(BAD); textSize(18); text('発散しました！\nη を小さくしてみよう', px + 18, 380); }
  fill(DIM); textSize(13);
  text('赤い矢印 = −∇f（いちばん急な下り）\n金の線 = たどった道', px + 18, height - 90);

  fill(FG); textSize(22); text('勾配降下法  急な下り坂へ少しずつ', 30, 24);
  fill(DIM); textSize(14); text('クリック 出発点   スペース 再生/停止   → 1 歩   ↑↓ 学習率   P 制約   1 細長い谷  2 バナナ形  3 谷がいくつも', 30, 56);
}

function mousePressed() {
  if (mouseX < mapW() - 20 && mouseY > 110) { let [x, y] = toWorld(mouseX, mouseY); startAt(x, y); }
}

function keyPressed() {
  if (key === ' ') { auto = !auto; return false; }
  if (key === RIGHT_ARROW) { descend(); return false; }
  if (key === UP_ARROW) { eta *= 1.5; return false; }
  if (key === DOWN_ARROW) { eta /= 1.5; return false; }
  if (key === 'p' || key === 'P') { constrained = !constrained; if (pos) startAt(trail[0][0], trail[0][1]); }
  if ('123'.includes(key)) pickFn(Number(key));
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); pickFn(fn); }
