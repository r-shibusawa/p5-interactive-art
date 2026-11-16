// ============================================
// 05 粒子群最適化（PSO）─ 等高線の谷底を群れでさがす
// 粒子はそれぞれ「いまの勢い（慣性）」「自分が見つけた一番いい場所 p」「群れ全体の一番いい場所 g」に引かれて動く
// v ← w v ＋ c1 r1 (p − x) ＋ c2 r2 (g − x)、x ← x ＋ v。関数の値が小さいほどよい（最小値はどれも 0）
// 1〜4 = 関数（球・Rastrigin・Ackley・Himmelblau）/ ←→ = 慣性 w / ↑↓ = c1（自分のベスト）/ C = c2（群れのベスト）を切替
// クリック = その場所に粒子を集めてやり直す / R = ランダムにやり直す / F = 速さ / スペース = 一時停止
// ============================================

let NP = 30;                 // ★ 粒子の数
let wIn = 0.72;              // 慣性 w
let c1 = 1.49, c2 = 1.49;    // 自分のベストへの引き、群れのベストへの引き
let c2List = [0, 0.5, 1.0, 1.49, 2.0];
let framesPerIter = 4;       // 何フレームに 1 回更新するか（F で切替）
let fnId = 1;
let parts = [];
let gBest = { x: 0, y: 0 }, gBestVal = Infinity, iterCount = 0;
let hist = [];
let field, paused = false;
let lastParts = null;        // 粒子 0 の 3 つの力（矢印で表示）
const FUNCS = [
  { name: '球（sphere）x² + y²', lo: -5.12, hi: 5.12, f: (x, y) => x * x + y * y, opt: [[0, 0]] },
  { name: 'Rastrigin（たくさんの穴）', lo: -5.12, hi: 5.12, f: (x, y) => 20 + x * x - 10 * Math.cos(2 * Math.PI * x) + y * y - 10 * Math.cos(2 * Math.PI * y), opt: [[0, 0]] },
  { name: 'Ackley（平らな高原に深い穴）', lo: -5, hi: 5, f: (x, y) => -20 * Math.exp(-0.2 * Math.sqrt(0.5 * (x * x + y * y))) - Math.exp(0.5 * (Math.cos(2 * Math.PI * x) + Math.cos(2 * Math.PI * y))) + Math.E + 20, opt: [[0, 0]] },
  { name: 'Himmelblau（谷底が 4 つ）', lo: -5, hi: 5, f: (x, y) => (x * x + y - 11) ** 2 + (x + y * y - 7) ** 2, opt: [[3, 2], [-2.805118, 3.131312], [-3.77931, -3.283186], [3.584428, -1.848126]] },
];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  field = createGraphics(220, 220); field.pixelDensity(1);
  chooseFn(1);
}
function chooseFn(id) { fnId = id; drawField(); restart(null); }
function curFn() { return FUNCS[fnId - 1]; }
function evalF(x, y) { let v = curFn().f(x, y); return isFinite(v) ? v : 1e9; }

function restart(at) {
  let fn = curFn(), span = fn.hi - fn.lo;
  parts = []; gBestVal = Infinity; iterCount = 0; hist = [];
  for (let i = 0; i < NP; i++) {
    let x = at ? at.x + (Math.random() - 0.5) * span * 0.08 : fn.lo + Math.random() * span;
    let y = at ? at.y + (Math.random() - 0.5) * span * 0.08 : fn.lo + Math.random() * span;
    let p = { x, y, vx: (Math.random() - 0.5) * span * 0.05, vy: (Math.random() - 0.5) * span * 0.05, bx: x, by: y, bv: evalF(x, y) };
    parts.push(p);
    if (p.bv < gBestVal) { gBestVal = p.bv; gBest = { x, y }; }
  }
}

// ★ PSO の 1 回分
function psoIteration() {
  let fn = curFn(), vmax = (fn.hi - fn.lo) * 0.2;
  for (let i = 0; i < parts.length; i++) {
    let p = parts[i];
    let r1 = Math.random(), r2 = Math.random();
    let ix = wIn * p.vx, iy = wIn * p.vy;                                  // 慣性
    let px = c1 * r1 * (p.bx - p.x), py = c1 * r1 * (p.by - p.y);          // 自分のベストへ
    let gx = c2 * r2 * (gBest.x - p.x), gy = c2 * r2 * (gBest.y - p.y);    // 群れのベストへ
    if (i === 0) lastParts = { x: p.x, y: p.y, ix, iy, px, py, gx, gy };
    p.vx = constrain(ix + px + gx, -vmax, vmax); p.vy = constrain(iy + py + gy, -vmax, vmax);
    p.x = constrain(p.x + p.vx, fn.lo, fn.hi); p.y = constrain(p.y + p.vy, fn.lo, fn.hi);
    let v = evalF(p.x, p.y);
    if (v < p.bv) { p.bv = v; p.bx = p.x; p.by = p.y; }
  }
  for (let p of parts) if (p.bv < gBestVal) { gBestVal = p.bv; gBest = { x: p.bx, y: p.by }; }
  iterCount++;
  hist.push(Math.log10(Math.max(gBestVal, 1e-12)));
  if (hist.length > 300) hist.shift();
}

function draw() {
  background(262, 40, 12);
  if (!paused && frameCount % framesPerIter === 0) psoIteration();
  let fn = curFn(), sz = Math.min(height - 110, width * 0.58), ox = 30, oy = 90;
  let SX = (x) => ox + ((x - fn.lo) / (fn.hi - fn.lo)) * sz, SY = (y) => oy + sz - ((y - fn.lo) / (fn.hi - fn.lo)) * sz;
  image(field, ox, oy, sz, sz);
  // 最適解の場所
  noFill(); stroke(120, 70, 100); strokeWeight(2);
  for (let o of fn.opt) { line(SX(o[0]) - 7, SY(o[1]), SX(o[0]) + 7, SY(o[1])); line(SX(o[0]), SY(o[1]) - 7, SX(o[0]), SY(o[1]) + 7); }
  // 粒子：線 = 自分のベストへの線、点 = いまの位置
  stroke(0, 0, 100, 25); strokeWeight(1);
  for (let p of parts) line(SX(p.x), SY(p.y), SX(p.bx), SY(p.by));
  noStroke(); fill(55, 80, 100);
  for (let p of parts) circle(SX(p.x), SY(p.y), 8);
  fill(0, 90, 100); circle(SX(gBest.x), SY(gBest.y), 14);
  // 粒子 0 の速度の 3 成分（矢印）
  if (lastParts) {
    let k = sz / (fn.hi - fn.lo), x0 = SX(lastParts.x), y0 = SY(lastParts.y);
    arrowTo(x0, y0, lastParts.ix * k, -lastParts.iy * k, color(200, 70, 100));
    arrowTo(x0, y0, lastParts.px * k, -lastParts.py * k, color(120, 70, 100));
    arrowTo(x0, y0, lastParts.gx * k, -lastParts.gy * k, color(0, 80, 100));
    noFill(); stroke(0, 0, 100); strokeWeight(1.5); circle(x0, y0, 16);
  }

  // ---- 右：数字とグラフ
  let gx = ox + sz + 40, gw = width - gx - 30;
  noStroke(); fill(0, 0, 100); textSize(16);
  let info = ['関数 ' + fnId + '：' + fn.name, '反復 ' + iterCount + ' 回（粒子 ' + NP + ' 個）',
    '群れのベストの値 f(g) = ' + (gBestVal < 1e-4 ? gBestVal.toExponential(2) : nf(gBestVal, 1, 4)),
    'g = (' + nf(gBest.x, 1, 3) + ', ' + nf(gBest.y, 1, 3) + ')',
    '本当の最小値 = 0（緑の ＋）'];
  for (let i = 0; i < info.length; i++) text(info[i], gx, 110 + i * 26);
  drawPlot(hist, gx, 280, gw, 160, -12, 3, color(0, 85, 100), '最良値の推移（縦軸は log10 f。下ほど 0 に近い）');
  noStroke(); fill(0, 0, 70); textSize(12);
  text('10³', gx - 26, 290); text('10⁻¹²', gx - 34, 444);
  textSize(14);
  fill(200, 70, 100); text('青 = 慣性 w v', gx, 490);
  fill(120, 70, 100); text('緑 = c1 r1 (p − x)　自分のベストへ', gx, 512);
  fill(0, 80, 100); text('赤 = c2 r2 (g − x)　群れのベストへ', gx, 534);
  fill(0, 0, 70); text('（○ の付いた粒子 0 の 3 つの成分。足したものが次の速度）', gx, 556);

  fill(0, 0, 100); textSize(18);
  text('1〜4：関数　←→：慣性 w = ' + nf(wIn, 1, 2) + '　↑↓：c1 = ' + nf(c1, 1, 2) + '　C：c2 = ' + nf(c2, 1, 2) + '　F：速さ　スペース：' + (paused ? '停止中' : '実行中'), 20, 36);
  fill(0, 0, 70); textSize(14);
  text('クリック：そこに粒子を集めてやり直す（わざと悪い所から始める）　R：ランダムにやり直す', 20, 60);
}

function mousePressed() {
  let fn = curFn(), sz = Math.min(height - 110, width * 0.58), ox = 30, oy = 90;
  if (mouseX < ox || mouseX > ox + sz || mouseY < oy || mouseY > oy + sz) return;
  restart({ x: fn.lo + ((mouseX - ox) / sz) * (fn.hi - fn.lo), y: fn.lo + ((oy + sz - mouseY) / sz) * (fn.hi - fn.lo) });
}
function keyPressed() {
  let n = parseInt(key);
  if (n >= 1 && n <= 4) chooseFn(n);
  if (key === RIGHT_ARROW) wIn = Math.min(wIn + 0.05, 1.2);
  if (key === LEFT_ARROW) wIn = Math.max(wIn - 0.05, 0);
  if (key === UP_ARROW) c1 = Math.min(c1 + 0.1, 3);
  if (key === DOWN_ARROW) c1 = Math.max(c1 - 0.1, 0);
  if (key === 'c' || key === 'C') c2 = c2List[(c2List.indexOf(c2) + 1) % c2List.length];
  if (key === 'f' || key === 'F') framesPerIter = framesPerIter === 4 ? 1 : 4;
  if (key === 'r' || key === 'R') restart(null);
  if (key === ' ') paused = !paused;
}

// ---------- やってみよう ----------
// 1. 1（球）は 100 回もあれば 10⁻¹⁰ 以下まで下がる。2（Rastrigin）だと途中で止まることがある。それはどんな場所？
// 2. w = 1.0 以上にすると粒子が止まらず暴れる。w = 0.3 だとすぐ止まる。ちょうどいい w は？
// 3. C で c2 = 0 にすると、みんな自分のベストしか見ない（群れでない）。結果はどうなる？
// 4. 4（Himmelblau）では谷底が 4 つ。何回か R をして、群れはどの谷に行く？ 1 回で 4 つ全部は見つからない（07 で解決）
// 5. 画面の隅をクリックして、わざと悪い場所から始める。それでも群れは谷底を見つけられる？

// ==================================================
// ここから下は「描くための道具」です（等高線・矢印・グラフ）
// ==================================================
function drawField() {
  let fn = curFn(), W = field.width, vals = [], vmax = 0;
  for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
    let x = fn.lo + ((i + 0.5) / W) * (fn.hi - fn.lo), y = fn.hi - ((j + 0.5) / W) * (fn.hi - fn.lo);
    let v = Math.log(1 + evalF(x, y)); vals.push(v); vmax = Math.max(vmax, v);
  }
  field.loadPixels();
  for (let k = 0; k < vals.length; k++) {
    let t = vals[k] / vmax, band = (t * 14) % 1 < 0.08 ? 0.75 : 1;   // 14 段の等高線
    field.pixels[k * 4] = (40 + 200 * t) * band; field.pixels[k * 4 + 1] = (25 + 90 * (1 - t)) * band; field.pixels[k * 4 + 2] = (70 + 60 * (1 - t)) * band; field.pixels[k * 4 + 3] = 255;
  }
  field.updatePixels();
}
function arrowTo(x, y, dx, dy, c) {
  let m = Math.hypot(dx, dy); if (m < 2) return;
  stroke(c); strokeWeight(2.5); line(x, y, x + dx, y + dy);
  let ux = dx / m, uy = dy / m;
  line(x + dx, y + dy, x + dx - ux * 8 - uy * 5, y + dy - uy * 8 + ux * 5); line(x + dx, y + dy, x + dx - ux * 8 + uy * 5, y + dy - uy * 8 - ux * 5);
}
function drawPlot(arr, x, y, w, h, lo, hi, c, title) {
  noStroke(); fill(0, 0, 0, 35); rect(x, y, w, h);
  fill(0, 0, 85); textSize(13); text(title, x, y - 8);
  if (arr.length < 2) return;
  noFill(); stroke(c); strokeWeight(2);
  beginShape();
  for (let i = 0; i < arr.length; i++) vertex(x + (i / 299) * w, y + h - constrain((arr[i] - lo) / (hi - lo), 0, 1) * h);
  endShape();
}
