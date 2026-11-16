// ============================================
// 07 ホタルアルゴリズム ─ 明るい仲間に引き寄せられる
// 関数の値が小さい場所にいるホタルほど明るい。暗いホタルは、自分より明るい全員に引き寄せられる
// 引き寄せの強さ β = β0 · e^{−γ r²}。光は距離 r で弱まるので、γ が大きいと「近くの明るい仲間」にしか寄らない → 谷ごとに小さな群れができ、複数の答えを同時に見つける
// 1〜2 = 関数（Himmelblau・Rastrigin）/ ↑↓ = 吸収係数 γ / ←→ = ランダムさ α / R = やり直し / F = 速さ / スペース = 一時停止
// ============================================

let NF = 40;                 // ★ ホタルの数
let beta0 = 1.0;             // ★ 距離 0 での引き寄せの強さ
let gammaA = 1.0;            // 吸収係数 γ（大きいほど光が届かない）
let alphaR = 0.2;            // ランダムな動きの大きさ α（毎回 0.97 倍に小さくなる）
let alphaNow = alphaR;
let fnId = 1, framesPerIter = 4;
let flies = [];
let bestVal = Infinity, bestPos = { x: 0, y: 0 }, iterCount = 0, foundCount = 0;
let hist = [], field, paused = false;
const FUNCS = [
  { name: 'Himmelblau（谷底が 4 つ、どれも 0）', lo: -5, hi: 5, f: (x, y) => (x * x + y - 11) ** 2 + (x + y * y - 7) ** 2, opt: [[3, 2], [-2.805118, 3.131312], [-3.77931, -3.283186], [3.584428, -1.848126]] },
  { name: 'Rastrigin（穴だらけ、底は中央の 1 つ）', lo: -5.12, hi: 5.12, f: (x, y) => 20 + x * x - 10 * Math.cos(2 * Math.PI * x) + y * y - 10 * Math.cos(2 * Math.PI * y), opt: [[0, 0]] },
];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  field = createGraphics(220, 220); field.pixelDensity(1);
  chooseFn(1);
}
function curFn() { return FUNCS[fnId - 1]; }
function evalF(x, y) { let v = curFn().f(x, y); return isFinite(v) ? v : 1e9; }
function chooseFn(id) { fnId = id; drawField(); restart(); }
function restart() {
  let fn = curFn();
  flies = [];
  for (let i = 0; i < NF; i++) { let x = fn.lo + Math.random() * (fn.hi - fn.lo), y = fn.lo + Math.random() * (fn.hi - fn.lo); flies.push({ x, y, f: evalF(x, y) }); }
  bestVal = Infinity; iterCount = 0; hist = []; alphaNow = alphaR;
  memorize();
}
function memorize() { for (let p of flies) if (p.f < bestVal) { bestVal = p.f; bestPos = { x: p.x, y: p.y }; } }

// ★ ホタルアルゴリズムの 1 回分：i より明るい j があれば、そのたびに j の方へ動く（ヤンの元の形）。ランダムな一歩は 1 回に 1 度
function fireflyIteration() {
  let fn = curFn(), span = fn.hi - fn.lo;
  for (let i = 0; i < NF; i++) {
    let p = flies[i], pull = 0;
    for (let j = 0; j < NF; j++) {
      let q = flies[j];
      if (j === i || q.f >= p.f) continue;                        // 自分より明るい（値が小さい）相手だけ
      let dx = (q.x - p.x) / span, dy = (q.y - p.y) / span;       // 距離は箱の大きさ = 1 で測る
      let b = beta0 * Math.exp(-gammaA * 100 * (dx * dx + dy * dy));   // γ は「箱の 1/10」を 1 とした単位
      p.x += b * (q.x - p.x); p.y += b * (q.y - p.y); pull += b;
    }
    if (pull > 0.02) {                                             // 引き寄せられたホタル：ランダムな一歩を足して移る
      p.x = constrain(p.x + alphaNow * span * (Math.random() - 0.5), fn.lo, fn.hi);
      p.y = constrain(p.y + alphaNow * span * (Math.random() - 0.5), fn.lo, fn.hi);
      p.f = evalF(p.x, p.y);
    } else {                                                       // 近くに明るい仲間がいない＝その場のリーダー：小さくゆらいで、良ければ移る
      let nx = constrain(p.x + alphaNow * span * 0.2 * (Math.random() - 0.5), fn.lo, fn.hi), ny = constrain(p.y + alphaNow * span * 0.2 * (Math.random() - 0.5), fn.lo, fn.hi);
      let nv = evalF(nx, ny);
      if (nv < p.f) { p.x = nx; p.y = ny; p.f = nv; }
    }
  }
  alphaNow *= 0.97;
  memorize();
  // いくつの谷底（最小値）を見つけたか：f < 0.01 で、谷底から 0.1 以内にホタルがいる数
  foundCount = 0;
  for (let o of fn.opt) if (flies.some((p) => Math.hypot(p.x - o[0], p.y - o[1]) < 0.1 && p.f < 0.01)) foundCount++;
  iterCount++;
  hist.push(Math.log10(Math.max(bestVal, 1e-12)));
  if (hist.length > 300) hist.shift();
}

function draw() {
  background(240, 45, 9);
  if (!paused && frameCount % framesPerIter === 0) fireflyIteration();
  let fn = curFn(), sz = Math.min(height - 110, width * 0.58), ox = 30, oy = 90;
  let SX = (x) => ox + ((x - fn.lo) / (fn.hi - fn.lo)) * sz, SY = (y) => oy + sz - ((y - fn.lo) / (fn.hi - fn.lo)) * sz;
  image(field, ox, oy, sz, sz);
  noFill(); strokeWeight(2);
  for (let o of fn.opt) {
    let hit = flies.some((p) => Math.hypot(p.x - o[0], p.y - o[1]) < 0.1 && p.f < 0.01);
    stroke(hit ? 120 : 0, 70, 100); circle(SX(o[0]), SY(o[1]), 26);
  }
  // ホタル：明るさ = 値の小ささ（順位）
  let sorted = flies.map((p) => p.f).sort((a, b) => a - b);
  noStroke();
  for (let p of flies) {
    let rank = sorted.indexOf(p.f) / NF, glow = 1 - rank;
    fill(60, 80, 100, 15 + 25 * glow); circle(SX(p.x), SY(p.y), 10 + 26 * glow);
    fill(60, 40 + 50 * glow, 40 + 60 * glow); circle(SX(p.x), SY(p.y), 6);
  }
  // 光の届く範囲（β が β0 の半分になる距離）
  let rHalf = Math.sqrt(Math.log(2) / (gammaA * 100)) * sz;
  noFill(); stroke(60, 60, 100, 40); strokeWeight(1);
  if (rHalf < sz) circle(SX(bestPos.x), SY(bestPos.y), rHalf * 2);

  // ---- 右：数字とグラフ
  let gx = ox + sz + 40, gw = width - gx - 30;
  noStroke(); fill(0, 0, 100); textSize(16);
  let info = ['関数 ' + fnId + '：' + fn.name, '反復 ' + iterCount + ' 回（ホタル ' + NF + ' 匹、α = ' + nf(alphaNow, 1, 3) + '）',
    '最良値 = ' + (bestVal < 1e-4 ? bestVal.toExponential(2) : nf(bestVal, 1, 4)) + '（本当の最小値 0）',
    '見つけた谷底：' + foundCount + ' / ' + fn.opt.length + '（緑の ○）',
    '光が半分になる距離 = 箱の ' + nf(Math.sqrt(Math.log(2) / (gammaA * 100)) * 100, 1, 1) + ' %'];
  for (let i = 0; i < info.length; i++) text(info[i], gx, 110 + i * 26);
  drawPlot(hist, gx, 280, gw, 160, -12, 3, color(60, 85, 100), '最良値の推移（縦軸は log10 f）');
  noStroke(); fill(0, 0, 75); textSize(14);
  text('x_i ← x_i ＋ β0 e^{−γ r²} (x_j − x_i) ＋ α (乱数 − ½)', gx, 480);
  text('γ → 0：光がどこまでも届く → 全員が 1 番明るい仲間へ（PSO に近い）', gx, 504);
  text('γ 大：近くの仲間しか見えない → 谷ごとに群れができる', gx, 528);

  fill(0, 0, 100); textSize(18);
  text('1〜2：関数　↑↓：吸収係数 γ = ' + nf(gammaA, 1, 3) + '　←→：ランダムさ α = ' + nf(alphaR, 1, 2) + '　R：やり直し　F：速さ　スペース：' + (paused ? '停止中' : '実行中'), 20, 36);
  fill(0, 0, 70); textSize(14);
  text('明るい（値が小さい）仲間に寄っていく。γ を変えて、谷底を 1 つだけ見つけるか、4 つ同時に見つけるかを比べよう', 20, 60);
}

function keyPressed() {
  let n = parseInt(key);
  if (n >= 1 && n <= 2) chooseFn(n);
  if (key === UP_ARROW) gammaA = Math.min(gammaA * 2, 64);
  if (key === DOWN_ARROW) gammaA = Math.max(gammaA / 2, 0.001);
  if (key === RIGHT_ARROW) { alphaR = Math.min(alphaR + 0.05, 1); alphaNow = alphaR; }
  if (key === LEFT_ARROW) { alphaR = Math.max(alphaR - 0.05, 0); alphaNow = alphaR; }
  if (key === 'f' || key === 'F') framesPerIter = framesPerIter === 4 ? 1 : 4;
  if (key === 'r' || key === 'R') restart();
  if (key === ' ') paused = !paused;
}

// ---------- やってみよう ----------
// 1. Himmelblau で γ = 0.001（↓ を何回か）にすると全員が 1 つの谷へ。γ = 1 だと 4 つの谷に分かれる？ 見つけた谷底の数を比べよう
// 2. γ = 64 にすると光がほとんど届かず、ホタルは自分の近くしか見えない。ランダムに歩くだけに近くなる
// 3. α = 0 にすると？ ランダムさがないと、最初に明るかったホタルの所で止まってしまう
// 4. 2（Rastrigin）は穴が規則正しく並ぶ。γ が大きいとたくさんの穴に分かれて止まる。それでも中央は見つかる？
// 5. 「複数の答えを同時に見つける」と何がうれしい？（第 1 候補がダメなときの予備、設計の選択肢）

// ==================================================
// ここから下は「描くための道具」です（等高線・グラフ）
// ==================================================
function drawField() {
  let fn = curFn(), W = field.width, vals = [], vmax = 0;
  for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
    let x = fn.lo + ((i + 0.5) / W) * (fn.hi - fn.lo), y = fn.hi - ((j + 0.5) / W) * (fn.hi - fn.lo);
    let v = Math.log(1 + evalF(x, y)); vals.push(v); vmax = Math.max(vmax, v);
  }
  field.loadPixels();
  for (let k = 0; k < vals.length; k++) {
    let t = vals[k] / vmax, band = (t * 14) % 1 < 0.08 ? 0.7 : 1;
    field.pixels[k * 4] = (20 + 60 * t) * band; field.pixels[k * 4 + 1] = (30 + 40 * t) * band; field.pixels[k * 4 + 2] = (60 + 90 * t) * band; field.pixels[k * 4 + 3] = 255;
  }
  field.updatePixels();
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
