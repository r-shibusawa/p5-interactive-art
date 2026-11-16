// ============================================
// 06 人工蜂コロニー（ABC）─ 働き蜂・追従蜂・偵察蜂の 3 役
// エサ場（花）1 つに働き蜂 1 匹。働き蜂は近くを少し探して、よければ移る。巣で待つ追従蜂は「良いエサ場ほど高い確率」で選んでそこを探す
// limit 回続けて良くならないエサ場は放棄され、偵察蜂がランダムな新しい場所を探しに行く。花の大きさ = エサ場の質、× = 放棄した場所
// 1〜3 = 関数（Rastrigin・Schwefel・Ackley）/ ↑↓ = limit（あきらめるまでの回数）/ ←→ = 速さ / R = やり直し / スペース = 一時停止
// ============================================

let SN = 20;                 // ★ エサ場の数（＝働き蜂の数＝追従蜂の数）
let limit = 30;              // あきらめるまでの回数
let framesPerCycle = 12;     // 1 サイクルを何フレームで見せるか
let fnId = 1;
let foods = [];              // {x, y, f, trial}
let bestVal = Infinity, bestPos = { x: 0, y: 0 }, cycleCount = 0, abandonCount = 0;
let hist = [], onlookers = [], scouts = [], ghosts = [];
let field, paused = false;
const FUNCS = [
  { name: 'Rastrigin（たくさんの穴）', lo: -5.12, hi: 5.12, f: (x, y) => 20 + x * x - 10 * Math.cos(2 * Math.PI * x) + y * y - 10 * Math.cos(2 * Math.PI * y), opt: [0, 0] },
  { name: 'Schwefel（いちばん深い穴が隅にある）', lo: -500, hi: 500, f: (x, y) => 837.9658 - x * Math.sin(Math.sqrt(Math.abs(x))) - y * Math.sin(Math.sqrt(Math.abs(y))), opt: [420.9687, 420.9687] },
  { name: 'Ackley（平らな高原に深い穴）', lo: -5, hi: 5, f: (x, y) => -20 * Math.exp(-0.2 * Math.sqrt(0.5 * (x * x + y * y))) - Math.exp(0.5 * (Math.cos(2 * Math.PI * x) + Math.cos(2 * Math.PI * y))) + Math.E + 20, opt: [0, 0] },
];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  field = createGraphics(220, 220); field.pixelDensity(1);
  chooseFn(1);
}
function curFn() { return FUNCS[fnId - 1]; }
function evalF(x, y) { let v = curFn().f(x, y); return isFinite(v) ? Math.max(v, 0) : 1e9; }
function fitness(f) { return 1 / (1 + f); }
function randomFood() { let fn = curFn(), x = fn.lo + Math.random() * (fn.hi - fn.lo), y = fn.lo + Math.random() * (fn.hi - fn.lo); return { x, y, f: evalF(x, y), trial: 0 }; }
function chooseFn(id) { fnId = id; drawField(); restart(); }
function restart() {
  foods = []; for (let i = 0; i < SN; i++) foods.push(randomFood());
  bestVal = Infinity; cycleCount = 0; abandonCount = 0; hist = []; onlookers = []; scouts = []; ghosts = [];
  memorize();
}
function memorize() { for (let s of foods) if (s.f < bestVal) { bestVal = s.f; bestPos = { x: s.x, y: s.y }; } }

// ★ エサ場 i の近くを探す：v = x ＋ φ (x − x_k)（ほかのエサ場 k との差を使う）。良ければ移る（貪欲）
function tryNeighbour(i) {
  let fn = curFn(), s = foods[i], k = Math.floor(Math.random() * (SN - 1)); if (k >= i) k++;
  let phi = Math.random() * 2 - 1, nx = s.x, ny = s.y;
  if (Math.random() < 0.5) nx = constrain(s.x + phi * (s.x - foods[k].x), fn.lo, fn.hi);
  else ny = constrain(s.y + phi * (s.y - foods[k].y), fn.lo, fn.hi);
  let nv = evalF(nx, ny);
  if (nv < s.f) { s.x = nx; s.y = ny; s.f = nv; s.trial = 0; return true; }
  s.trial++; return false;
}

// ★ ABC の 1 サイクル：働き蜂 → 追従蜂 → 偵察蜂
function abcCycle() {
  for (let i = 0; i < SN; i++) tryNeighbour(i);                              // 働き蜂
  let fits = foods.map((s) => fitness(s.f)), total = fits.reduce((a, b) => a + b, 0);
  onlookers = [];
  for (let n = 0; n < SN; n++) {                                             // 追従蜂：ルーレットで選ぶ
    let r = Math.random() * total, i = 0;
    while (i < SN - 1 && r > fits[i]) { r -= fits[i]; i++; }
    tryNeighbour(i); onlookers.push(i);
  }
  memorize();
  scouts = [];
  let worst = -1;
  for (let i = 0; i < SN; i++) if (foods[i].trial > limit && (worst < 0 || foods[i].trial > foods[worst].trial)) worst = i;
  if (worst >= 0) {                                                          // 偵察蜂：1 サイクルに 1 匹まで
    ghosts.push({ x: foods[worst].x, y: foods[worst].y, life: 1 });
    let nf0 = randomFood();
    scouts.push({ fx: foods[worst].x, fy: foods[worst].y, tx: nf0.x, ty: nf0.y });
    foods[worst] = nf0; abandonCount++;
    memorize();
  }
  cycleCount++;
  hist.push(Math.log10(Math.max(bestVal, 1e-12)));
  if (hist.length > 300) hist.shift();
}

function draw() {
  background(30, 30, 12);
  if (!paused && frameCount % framesPerCycle === 0) abcCycle();
  let tCyc = (frameCount % framesPerCycle) / framesPerCycle;
  let fn = curFn(), sz = Math.min(height - 110, width * 0.58), ox = 30, oy = 90;
  let SX = (x) => ox + ((x - fn.lo) / (fn.hi - fn.lo)) * sz, SY = (y) => oy + sz - ((y - fn.lo) / (fn.hi - fn.lo)) * sz;
  image(field, ox, oy, sz, sz);
  noFill(); stroke(120, 70, 100); strokeWeight(2);
  line(SX(fn.opt[0]) - 8, SY(fn.opt[1]), SX(fn.opt[0]) + 8, SY(fn.opt[1])); line(SX(fn.opt[0]), SY(fn.opt[1]) - 8, SX(fn.opt[0]), SY(fn.opt[1]) + 8);
  // 放棄した場所（×）
  stroke(0, 0, 100); strokeWeight(2);
  for (let g of ghosts) { stroke(0, 0, 100, g.life * 80); let x = SX(g.x), y = SY(g.y); line(x - 6, y - 6, x + 6, y + 6); line(x - 6, y + 6, x + 6, y - 6); g.life -= 0.01; }
  ghosts = ghosts.filter((g) => g.life > 0);
  // 花（エサ場）：大きさ = 質。色 = あきらめ度（trial / limit）
  let fmax = Math.max(...foods.map((s) => fitness(s.f)));
  noStroke();
  for (let s of foods) {
    let q = fitness(s.f) / fmax, x = SX(s.x), y = SY(s.y), r = 8 + 18 * q;
    fill((330 + 80 * Math.min(1, s.trial / limit)) % 360, 60, 100, 85);
    for (let p = 0; p < 5; p++) circle(x + Math.cos((p * Math.PI * 2) / 5) * r * 0.45, y + Math.sin((p * Math.PI * 2) / 5) * r * 0.45, r * 0.6);
    fill(50, 90, 100); circle(x, y, r * 0.4);
  }
  // 巣と蜂
  let hx = ox + sz / 2, hy = oy + sz + 2;
  fill(40, 80, 90); rect(hx - 22, hy - 14, 44, 18, 6);
  fill(50, 90, 100);
  for (let i of onlookers) {                                 // 追従蜂：巣からエサ場へ
    let s = foods[i], e = tCyc < 0.5 ? tCyc * 2 : 2 - tCyc * 2;
    circle(lerp(hx, SX(s.x), e) + Math.sin(frameCount * 0.7 + i) * 3, lerp(hy, SY(s.y), e), 5);
  }
  fill(190, 80, 100);
  for (let sc of scouts) circle(lerp(SX(sc.fx), SX(sc.tx), tCyc), lerp(SY(sc.fy), SY(sc.ty), tCyc), 8);   // 偵察蜂
  fill(0, 90, 100); circle(SX(bestPos.x), SY(bestPos.y), 10);

  // ---- 右：数字とグラフ
  let gx = ox + sz + 40, gw = width - gx - 30;
  fill(0, 0, 100); textSize(16);
  let info = ['関数 ' + fnId + '：' + fn.name, 'サイクル ' + cycleCount + ' 回（エサ場 ' + SN + '、limit = ' + limit + '）',
    '最良値 = ' + (bestVal < 1e-4 ? bestVal.toExponential(2) : nf(bestVal, 1, 4)) + '　（本当の最小値 0 は緑の ＋）',
    '最良の場所 = (' + nf(bestPos.x, 1, 3) + ', ' + nf(bestPos.y, 1, 3) + ')', '放棄して偵察した回数 = ' + abandonCount];
  for (let i = 0; i < info.length; i++) text(info[i], gx, 110 + i * 26);
  drawPlot(hist, gx, 280, gw, 160, -12, 3, color(40, 85, 100), '最良値の推移（縦軸は log10 f）');
  noStroke(); textSize(14);
  fill(50, 90, 100); text('● 黄 = 追従蜂（良い花ほどたくさん来る）', gx, 480);
  fill(190, 80, 100); text('● 水色 = 偵察蜂（放棄した花から、ランダムな場所へ）', gx, 502);
  fill(0, 0, 80); text('花の色：ピンク = 最近よくなった → 黄 = もうすぐあきらめる', gx, 524);
  text('働き蜂は各花に 1 匹ずつ（花の位置そのもの）', gx, 546);

  fill(0, 0, 100); textSize(18);
  text('1〜3：関数　↑↓：limit = ' + limit + '　←→：速さ（' + framesPerCycle + ' フレーム / サイクル）　R：やり直し　スペース：' + (paused ? '停止中' : '実行中'), 20, 36);
  fill(0, 0, 70); textSize(14);
  text('働き蜂：自分の花の近くを探す → 追従蜂：良い花を確率で選んで探す → 偵察蜂：limit 回良くならない花を捨てて新しい場所へ', 20, 60);
}

function keyPressed() {
  let n = parseInt(key);
  if (n >= 1 && n <= 3) chooseFn(n);
  if (key === UP_ARROW) limit = Math.min(limit + 5, 200);
  if (key === DOWN_ARROW) limit = Math.max(limit - 5, 5);
  if (key === RIGHT_ARROW) framesPerCycle = Math.max(framesPerCycle - 2, 1);
  if (key === LEFT_ARROW) framesPerCycle = Math.min(framesPerCycle + 2, 40);
  if (key === 'r' || key === 'R') restart();
  if (key === ' ') paused = !paused;
}

// ---------- やってみよう ----------
// 1. 2（Schwefel）は一番深い穴が右上の隅にある。ABC は見つけられる？ PSO（05）でも試して比べよう
// 2. limit を 5 にすると偵察が増えて「広く浅く」、200 にすると偵察がほぼなくなり「狭く深く」。どちらが速く 0 に近づく？
// 3. 追従蜂がどの花に集まるか見よう。良い花に集中しすぎると何が困る？
// 4. SN を 5 と 50 で比べる。同じサイクル数での最良値は？（数が多いと 1 サイクルの計算も多い）
// 5. 本物のミツバチは 8 の字ダンスで良い花を教える（12 で詳しく）。ABC の「ルーレットで選ぶ」がダンスの代わり

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
    let t = vals[k] / vmax, band = (t * 14) % 1 < 0.08 ? 0.75 : 1;
    field.pixels[k * 4] = (30 + 120 * t) * band; field.pixels[k * 4 + 1] = (60 + 70 * (1 - t)) * band; field.pixels[k * 4 + 2] = (40 + 40 * t) * band; field.pixels[k * 4 + 3] = 255;
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
