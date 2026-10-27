// ============================================
// 15 勾配降下法で直線をあてはめる（線形回帰）
// 直線 y = w·x + b の「ずれ（残差）の 2 乗の平均」を損失として、(w, b) を勾配降下で動かす
// 右の小さな地図は (w, b) の損失の地形。金の点がそこを下っていく
// 点線は一発で解ける最小 2 乗法の答え。勾配降下はそこに近づいていく
// 操作：クリック = 点を追加 / スペース = 再生・停止 / → = 1 歩 / ↑↓ = 学習率
//       G = 全部の点を使う（バッチ）⇄ 1 点ずつ（確率的） / R = 新しいデータ / C = 全部消す
//       1〜3 = お手本（右上がり・はずれ値あり・急な坂）
// ============================================

let pts = [];           // 正規化した座標（x, y とも −1〜1 くらい）
let w = -1, b = 0.8;    // ★ 直線の傾きと切片の初期値
let eta = 0.1;          // ★ 学習率
let stochastic = false;
let auto = true, speed = 4;
let path = [], lossHist = [];
let surf, surfDirty = true;
const W0 = -3, W1 = 3, B0 = -2, B1 = 2;   // 損失の地図の範囲

const BG = '#14101f', PANEL = '#221a33', FG = '#e9e4f5', DIM = '#8c84a3';
const ORCHID = '#f0a3ff', MINT = '#6fe3d0', GOLD = '#ffcf6b', BAD = '#ff6b81';

function setup() {
  createCanvas(windowWidth, windowHeight);
  preset(1);
}

function preset(k) {
  pts = [];
  let slope = k === 3 ? 2.2 : 0.7, icpt = k === 3 ? -0.3 : 0.1;
  for (let i = 0; i < 30; i++) { let x = random(-1, 1); pts.push({ x, y: slope * x + icpt + randomGaussian() * 0.15 }); }
  if (k === 2) { pts.push({ x: 0.8, y: -1.2 }); pts.push({ x: 0.9, y: -1.0 }); }   // はずれ値
  resetModel();
}
function resetModel() { w = -1; b = 0.8; path = [[w, b]]; lossHist = [loss(w, b)]; surfDirty = true; }

function loss(ww, bb) {
  if (!pts.length) return 0;
  return pts.reduce((s, p) => s + (ww * p.x + bb - p.y) ** 2, 0) / pts.length;
}
// 最小 2 乗法の答え（正規方程式）
function leastSquares() {
  let n = pts.length; if (n < 2) return null;
  let mx = pts.reduce((s, p) => s + p.x, 0) / n, my = pts.reduce((s, p) => s + p.y, 0) / n;
  let sxx = pts.reduce((s, p) => s + (p.x - mx) ** 2, 0), sxy = pts.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0);
  if (sxx < 1e-12) return null;
  let ww = sxy / sxx; return { w: ww, b: my - ww * mx };
}

// ★ 1 歩
function descend() {
  if (!pts.length) return;
  let use = stochastic ? [random(pts)] : pts;
  let gw = 0, gb = 0;
  for (let p of use) { let r = w * p.x + b - p.y; gw += 2 * r * p.x; gb += 2 * r; }
  gw /= use.length; gb /= use.length;
  w -= eta * gw; b -= eta * gb;
  if (!isFinite(w) || abs(w) > 1e4) { resetModel(); return; }
  path.push([w, b]); lossHist.push(loss(w, b));
  if (path.length > 500) { path.shift(); lossHist.shift(); }
}

// 画面 ⇄ データの座標
function plotW() { return width - 340; }
function sx(x) { return map(x, -1.3, 1.3, 40, plotW() - 20); }
function sy(y) { return map(y, -2, 2, height - 30, 110); }

function drawSurface() {
  let S = 240;
  if (surf) surf.remove();
  surf = createGraphics(S, S);
  surf.noStroke();
  let vals = [], g = 6;
  for (let i = 0; i < S; i += g) for (let j = 0; j < S; j += g) {
    let ww = map(i + g / 2, 0, S, W0, W1), bb = map(j + g / 2, S, 0, B0, B1);
    vals.push([i, j, loss(ww, bb)]);
  }
  let lo = min(vals.map((v) => v[2])), hi = max(vals.map((v) => v[2]));
  for (let [i, j, v] of vals) {
    let t = hi - lo > 1e-12 ? Math.log(1 + v - lo) / Math.log(1 + hi - lo) : 0;
    surf.fill(lerpColor(color('#2a1d4a'), color('#e7b5ff'), floor(t * 12) / 12));
    surf.rect(i, j, g, g);
  }
  surfDirty = false;
}

function draw() {
  background(BG);
  if (auto && frameCount % speed === 0) descend();
  if (surfDirty) drawSurface();

  // 軸
  stroke('#3a2f52'); strokeWeight(1); line(sx(-1.3), sy(0), sx(1.3), sy(0)); line(sx(0), sy(-2), sx(0), sy(2));
  // 残差
  for (let p of pts) { stroke(BAD); strokeWeight(1.5); line(sx(p.x), sy(p.y), sx(p.x), sy(w * p.x + b)); }
  // 最小 2 乗法の直線
  let ls = leastSquares();
  if (ls) { stroke(MINT); strokeWeight(2); drawingContext.setLineDash([8, 6]); line(sx(-1.3), sy(ls.w * -1.3 + ls.b), sx(1.3), sy(ls.w * 1.3 + ls.b)); drawingContext.setLineDash([]); }
  // いまの直線
  stroke(GOLD); strokeWeight(4); line(sx(-1.3), sy(w * -1.3 + b), sx(1.3), sy(w * 1.3 + b));
  noStroke(); fill(ORCHID); for (let p of pts) circle(sx(p.x), sy(p.y), 10);

  // 右のパネル：損失の地図
  let px = width - 310, py = 20;
  fill(PANEL); rect(px, py, 290, height - 40, 12);
  fill(FG); textAlign(LEFT, TOP); textSize(16); text('(w, b) の損失の地形', px + 20, py + 14);
  image(surf, px + 25, py + 44);
  let mx = (ww) => px + 25 + map(ww, W0, W1, 0, 240), my = (bb) => py + 44 + map(bb, B1, B0, 0, 240);
  noFill(); stroke(GOLD); strokeWeight(1.5);
  beginShape(); for (let [ww, bb] of path) vertex(mx(constrain(ww, W0, W1)), my(constrain(bb, B0, B1))); endShape();
  noStroke(); fill(GOLD); circle(mx(constrain(w, W0, W1)), my(constrain(b, B0, B1)), 10);
  if (ls) { fill(MINT); circle(mx(constrain(ls.w, W0, W1)), my(constrain(ls.b, B0, B1)), 8); }
  fill(DIM); textSize(12); text('横 = 傾き w   縦 = 切片 b   緑 = 最小 2 乗法の答え', px + 20, py + 290);
  // 損失の推移
  if (lossHist.length > 1) {
    let lo = min(lossHist), hi = max(lossHist);
    noFill(); stroke(ORCHID); strokeWeight(2);
    beginShape(); lossHist.forEach((v, i) => vertex(px + 25 + (i / (lossHist.length - 1)) * 240, py + 420 - ((v - lo) / max(hi - lo, 1e-9)) * 90)); endShape();
  }
  noStroke(); fill(FG); textSize(14);
  text(`損失（2 乗誤差の平均）${loss(w, b).toFixed(4)}\nw = ${w.toFixed(3)}   b = ${b.toFixed(3)}\n学習率 η = ${eta.toPrecision(2)}\n${stochastic ? '確率的（1 点ずつ）→ ふらふら進む' : 'バッチ（全部の点）→ なめらか'}`, px + 20, py + 440);
  if (ls) { fill(MINT); text(`最小 2 乗法：w = ${ls.w.toFixed(3)}, b = ${ls.b.toFixed(3)}`, px + 20, py + 530); }

  fill(FG); textSize(22); text('勾配降下法で直線をあてはめる', 30, 24);
  fill(DIM); textSize(14); text('クリック 点を追加   スペース 再生/停止   → 1 歩   ↑↓ 学習率   G バッチ⇄確率的   R 新データ   C 消す   1〜3 お手本', 30, 56);
  if (pts.length < 2) { fill(BAD); text('点を 2 つ以上クリックしてください', 30, 84); }
}

function mousePressed() {
  if (mouseX < plotW() && mouseY > 100) {
    pts.push({ x: map(mouseX, 40, plotW() - 20, -1.3, 1.3), y: map(mouseY, height - 30, 110, -2, 2) });
    surfDirty = true;
  }
}

function keyPressed() {
  if (key === ' ') { auto = !auto; return false; }
  if (key === RIGHT_ARROW) { descend(); return false; }
  if (key === UP_ARROW) { eta = min(eta * 1.5, 5); return false; }
  if (key === DOWN_ARROW) { eta /= 1.5; return false; }
  if (key === 'g' || key === 'G') stochastic = !stochastic;
  if (key === 'r' || key === 'R') preset(1);
  if (key === 'c' || key === 'C') { pts = []; resetModel(); }
  if ('123'.includes(key)) preset(Number(key));
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); surfDirty = true; }
