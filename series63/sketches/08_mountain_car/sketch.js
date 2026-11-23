// ============================================
// 08 山登り車とタイルコーディング ─ 力の弱い車は、そのままでは右の坂を登れない
// 反対側の坂に登って勢いをつける必要がある。状態は「位置 x と速度 v」の連続値なので、表には書けない。
// そこで 8 枚の少しずつずらした格子（タイリング）で状態を表し（タイルコーディング）、Q(s,a) = 当たったタイルの重みの合計 で近似。
// 1 歩ごとに −1 の報酬、SARSA で重みを更新。右上の地形 = 学習した「ゴールまでのコスト」−max_a Q
// F 速さ / スペース 一時停止 / R やり直し / M 人が運転（← → で押す）
// ============================================

const N_TILINGS = 8, N_GRID = 8;          // ★ タイリングの枚数と、1 枚の格子の細かさ（8 × 8）
const ALPHA = 0.5 / N_TILINGS;            // ★ 学習率（タイル 1 枚あたり）
const MAX_LEN = 5000;                     // ★ 1 エピソードの上限
const PER = (N_GRID + 1) * (N_GRID + 1); // ずらすので 1 枚あたり 9 × 9 のタイル
let car, speed = 1, paused = false, manual = false, manualPush = 1, costImg = null, costMax = 1;
const SPEEDS = ['ゆっくり', 'ふつう', '速い'];

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); seedRng(8); car = makeCar(); costImg = createGraphics(40, 40); costImg.noStroke(); }

// ---- 山登り車の物理（よく使われる決まった式）：v += 0.001·a − 0.0025·cos(3x)、x += v
function carPhysics(x, v, a) {           // a = 0 左に押す、1 押さない、2 右に押す
  v = clampv(v + 0.001 * (a - 1) - 0.0025 * Math.cos(3 * x), -0.07, 0.07);
  x = x + v;
  if (x < -1.2) { x = -1.2; v = 0; }      // 左の壁にぶつかったら止まる
  if (x > 0.5) x = 0.5;
  return [x, v];
}
// ★ タイルコーディング：8 枚の格子それぞれで (x, v) が入るタイルの番号（× 3 行動ぶんの場所の先頭）
function tilesOf(x, v, out) {
  let xs = ((x + 1.2) / 1.7) * N_GRID, vs = ((v + 0.07) / 0.14) * N_GRID;
  for (let t = 0; t < N_TILINGS; t++) {
    let ix = Math.floor(xs + t / N_TILINGS), iv = Math.floor(vs + ((3 * t) % N_TILINGS) / N_TILINGS);   // x は 1、v は 3 ずつずらす
    ix = clampv(ix, 0, N_GRID); iv = clampv(iv, 0, N_GRID);
    out[t] = (t * PER + ix * (N_GRID + 1) + iv) * 3;
  }
  return out;
}
function qOf(w, T, a) { let s = 0; for (let t = 0; t < N_TILINGS; t++) s += w[T[t] + a]; return s; }
function greedyAct(w, T) { return argmaxR([0, 1, 2].map((a) => qOf(w, T, a))); }
function makeCar() { let c = { w: new Float64Array(N_TILINGS * PER * 3), T: new Int32Array(N_TILINGS), T2: new Int32Array(N_TILINGS), len: 0, epLens: [], traj: [] }; startEpisode(c); return c; }
function startEpisode(c) { c.x = -0.6 + 0.2 * rnd(); c.v = 0; c.len = 0; c.traj = []; tilesOf(c.x, c.v, c.T); c.a = greedyAct(c.w, c.T); }
// ★ SARSA の 1 歩（Q の初期値 0 は −1 の報酬にくらべて楽観的なので、ε = 0 でも探索する）
function carStep(c) {
  let [x2, v2] = carPhysics(c.x, c.v, c.a), r = -1, goal = x2 >= 0.5, a2 = 0;
  c.len++; if (c.len % 4 === 0) c.traj.push([x2, v2]);
  let target = r;                        // ゴールに着いたら先の価値はない
  if (!goal) { tilesOf(x2, v2, c.T2); a2 = greedyAct(c.w, c.T2); target = r + qOf(c.w, c.T2, a2); }
  let d = target - qOf(c.w, c.T, c.a);
  for (let t = 0; t < N_TILINGS; t++) c.w[c.T[t] + c.a] += ALPHA * d;   // 当たったタイルの重みだけを動かす
  if (goal || c.len >= MAX_LEN) { c.epLens.push(c.len); startEpisode(c); return true; }
  c.x = x2; c.v = v2; c.a = a2; c.T.set(c.T2);
  return false;
}
function updateCostImage() {             // 40 × 40 の点で −max_a Q を色に
  let T = new Int32Array(N_TILINGS), vals = [];
  for (let j = 0; j < 40; j++) for (let i = 0; i < 40; i++) { tilesOf(-1.2 + (1.7 * (i + 0.5)) / 40, 0.07 - (0.14 * (j + 0.5)) / 40, T); vals.push(-maxOf([0, 1, 2].map((a) => qOf(car.w, T, a)))); }
  costMax = Math.max(1, maxOf(vals));
  costImg.background(0);
  vals.forEach((v, k) => { let t = clampv(v / costMax, 0, 1); costImg.fill(30 + 220 * t, 40 + 150 * t * t, 120 - 80 * t); costImg.rect(k % 40, Math.floor(k / 40), 1, 1); });
}

function draw() {
  background(...BG);
  let t0 = performance.now();
  if (manual) { if (frameCount % 2 === 0) { [car.x, car.v] = carPhysics(car.x, car.v, manualPush); car.traj.push([car.x, car.v]); if (car.x >= 0.5) { car.x = -0.5; car.v = 0; car.traj = []; } } }
  else if (!paused) {
    if (speed === 0) carStep(car); else if (speed === 1) for (let k = 0; k < 8; k++) carStep(car);
    else while (performance.now() - t0 < 6) carStep(car);
  }
  if (frameCount % 30 === 1) updateCostImage();

  noStroke(); fill(240); textSize(22); textAlign(LEFT, BASELINE);
  text('山登り車：タイルコーディング + SARSA　エピソード ' + car.epLens.length + (manual ? '（人が運転中）' : ''), 40, 42);
  fill(170, 176, 210); textSize(15);
  text('F 速さ（' + SPEEDS[speed] + '）　スペース 一時停止　R やり直し　M 人が運転（← → で押す）', 40, 68);

  // ---- 坂と車
  let hx = 40, hy = 110, hw = width * 0.5, hh = height * 0.42, toX = (x) => hx + ((x + 1.2) / 1.7) * hw, toY = (x) => hy + hh * 0.5 - Math.sin(3 * x) * hh * 0.42;
  let pts = []; for (let i = 0; i <= 100; i++) { let x = -1.2 + (1.7 * i) / 100; pts.push([toX(x), toY(x)]); }
  stroke(110, 120, 180); strokeWeight(3); polyline(pts);
  stroke(...GOLD); strokeWeight(2); line(toX(0.5), toY(0.5), toX(0.5), toY(0.5) - 40); noStroke(); fill(...GOLD); triangle(toX(0.5), toY(0.5) - 40, toX(0.5) - 22, toY(0.5) - 33, toX(0.5), toY(0.5) - 26);
  let cx = toX(car.x), cy = toY(car.x), ang = Math.atan(-Math.cos(3 * car.x) * 3 * hh * 0.42 / (hw / 1.7));
  push(); translate(cx, cy); rotate(ang); fill(...CYAN); rect(-22, -24, 44, 18, 5); fill(240); circle(-12, -5, 11); circle(12, -5, 11); pop();
  let act = manual ? manualPush : car.a; fill(230); textSize(15); textAlign(CENTER, BASELINE);
  text(['← 左に押す', '押さない', '右に押す →'][act], cx, cy - 40);
  textAlign(LEFT, BASELINE); fill(200, 205, 235);
  text('位置 x = ' + fmtN(car.x, 3) + '　速度 v = ' + fmtN(car.v, 4) + '　この回 ' + car.len + ' 歩', hx, hy + hh + 20);

  // ---- コストの地形（位置 × 速度）
  let ix = width * 0.58, iy = 110, iw = Math.min(width * 0.38, hh * 1.25), ih = hh;
  image(costImg, ix, iy, iw, ih);
  noFill(); stroke(80, 86, 130); rect(ix, iy, iw, ih);
  stroke(255, 220); strokeWeight(1.5);
  polyline(car.traj.map(([x, v]) => [ix + ((x + 1.2) / 1.7) * iw, iy + ((0.07 - v) / 0.14) * ih]));
  noStroke(); fill(200, 205, 235); textSize(13);
  text('位置 x →（−1.2〜0.5）', ix, iy + ih + 18); text('↑ 速度 v（−0.07〜0.07）', ix, iy - 8);
  text('明るい = ゴールまで遠い（コスト最大 ' + Math.round(costMax) + ' 歩ぶん）。白い線 = いまのエピソード', ix, iy + ih + 38);

  // ---- エピソードごとの歩数
  let n = car.epLens.length, g = { x: 70, y: hy + hh + 80, w: width - 140, h: height - (hy + hh + 80) - 70, x0: 0, x1: Math.max(50, n), y0: 2, y1: Math.log10(MAX_LEN) };
  plotAxes(g, 'エピソード', 'log₁₀（ゴールまでの歩数）', [0, Math.round(g.x1 / 2), g.x1], [2, 3]);
  stroke(...LIME, 120); strokeWeight(1); line(g.x, gY(g, Math.log10(200)), g.x + g.w, gY(g, Math.log10(200)));
  drawCurve(g, car.epLens.map((v) => Math.log10(v)), CYAN, 2);
  noStroke(); fill(170, 176, 210); textSize(13); text('緑の線 = 200 歩。はじめは数千歩かかるが、何十エピソードかで 100〜200 歩になる', g.x + 10, g.y + 18);
  drawSelfTest(width - 180, height - 14);
}

function keyPressed() {
  if (key === 'f' || key === 'F') speed = (speed + 1) % 3;
  if (key === ' ') paused = !paused;
  if (key === 'r' || key === 'R') car = makeCar();
  if (key === 'm' || key === 'M') { manual = !manual; startEpisode(car); }
  if (key === LEFT_ARROW) manualPush = 0;
  if (key === RIGHT_ARROW) manualPush = 2;
  return false;
}
function keyReleased() { manualPush = 1; return false; }

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let okB = true; seedRng(1);
  for (let i = 0; i < 2000; i++) { let [x, v] = carPhysics(-1.2 + 1.7 * rnd(), -0.07 + 0.14 * rnd(), rndInt(0, 2)); if (x < -1.2 || x > 0.5 || v < -0.07 || v > 0.07 || !isFinite(x + v)) okB = false; }
  let [x1, v1] = carPhysics(-0.5, 0, 2);
  check('物理の式どおり：x = −0.5、v = 0 で右に押すと v = 0.001 − 0.0025 cos(−1.5)、範囲も守る', okB && near(v1, 0.001 - 0.0025 * Math.cos(-1.5), 1e-15) && near(x1, -0.5 + v1, 1e-15));
  let A = tilesOf(-0.3, 0.01, new Int32Array(N_TILINGS)), B = tilesOf(-0.29, 0.01, new Int32Array(N_TILINGS)), C = tilesOf(0.4, -0.06, new Int32Array(N_TILINGS));
  let share = (p, q) => p.filter((v, i) => v === q[i]).length;
  check('タイルは 8 枚に 1 つずつ当たる。近い状態はタイルを多く共有（' + share(A, B) + ' 枚）、遠い状態は共有しない（' + share(A, C) + ' 枚）', new Set(A).size === 8 && share(A, B) >= 6 && share(A, C) === 0);
  seedRng(3); let c = makeCar(), firstOK = -1;
  while (c.epLens.length < 100) { carStep(c); let n = c.epLens.length; if (firstOK < 0 && n && c.epLens[n - 1] < 200) firstOK = n; }
  check('100 エピソード以内に 200 歩未満でゴール（' + firstOK + ' 回目）、最後の 10 回の平均 ' + fmtN(meanOf(c.epLens.slice(-10)), 0) + ' 歩 < 200', firstOK > 0 && firstOK <= 40 && meanOf(c.epLens.slice(-10)) < 200);
  let ok10 = 0, T = new Int32Array(N_TILINGS);
  for (let k = 0; k < 10; k++) { let x = -0.6 + (0.2 * k) / 9, v = 0, t = 0; for (; t < 500 && x < 0.5; t++) [x, v] = carPhysics(x, v, argmaxFirst([0, 1, 2].map((a) => qOf(c.w, tilesOf(x, v, T), a)))); if (t < 200) ok10++; }
  check('学習した貪欲方策：スタート 10 か所のうち ' + ok10 + ' か所で 200 歩未満', ok10 >= 9);
  check('重みは有限（NaN なし）', noNaN(c.w));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. M で自分で運転してみよう。何歩でゴールできる？ どう押すのがよい？
// 2. N_TILINGS を 1 にすると（ずらさない 1 枚の格子）学習はどう変わる？
// 3. N_GRID を 4 や 16 にすると？（粗いと区別できない、細かいと覚えることが多い）
// 4. コストの地形のうずまきの形は、何を表している？（勢いをつけてから登る道）
// 5. 同じ「棒を立てる・車を動かす」問題を、人が設計した制御で解くのがシリーズ 20・50。ここでは設計せず学ぶ

// ==================================================
// ここから下は「強化学習の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 色と小さな道具
const BG = [14, 16, 34];                // 背景（アーケードの紺）
const GOLD = [255, 196, 60], CYAN = [90, 215, 245], PINK = [245, 110, 170], LIME = [160, 230, 110], VIOLET = [175, 140, 255];
function clampv(v, a, b) { return v < a ? a : v > b ? b : v !== v ? a : v; }     // NaN なら a に戻す
function argmaxR(q) {                  // いちばん大きい値の番号（同点はランダムに 1 つ）
  let m = -Infinity, best = [];
  for (let i = 0; i < q.length; i++) {
    if (q[i] > m + 1e-12) { m = q[i]; best = [i]; } else if (Math.abs(q[i] - m) <= 1e-12) best.push(i);
  }
  return best.length ? best[Math.floor(rnd() * best.length)] : 0;
}
function argmaxFirst(q) { let b = 0; for (let i = 1; i < q.length; i++) if (q[i] > q[b]) b = i; return b; }   // 同点は若い番号
function maxOf(q) { let m = -Infinity; for (let v of q) if (v > m) m = v; return m; }
function epsGreedy(q, eps) { return rnd() < eps ? Math.floor(rnd() * q.length) : argmaxR(q); }   // ε の確率でランダム、ほかは貪欲
function softmaxArr(h, tau) {          // ボルツマン分布 exp(h/τ) / Σ（大きい数でもあふれないように最大値を引く）
  let m = maxOf(h), e = h.map((v) => Math.exp((v - m) / (tau || 1))), s = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / s);
}
function sampleFrom(p) { let u = rnd(), c = 0; for (let i = 0; i < p.length; i++) { c += p[i]; if (u < c) return i; } return p.length - 1; }
function meanOf(a) { return a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0; }
function fmtN(v, d) { if (typeof v !== 'number' || v !== v) return '?'; let s = v.toFixed(d === undefined ? 2 : d); return s === '-0.00' || s === '-0.0' || s === '-0' ? s.slice(1) : s; }
// ---- 種つきの乱数（同じ種なら毎回同じ列 → 実験をくり返せる）
let rngState = 1;
function seedRng(s) { rngState = (s >>> 0) || 1; }
function rnd() {                       // 0〜1 の一様乱数（mulberry32）
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rndInt(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
function randn() { let u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }   // 標準正規分布
// ---- グラフの道具：g = { x, y, w, h, x0, x1, y0, y1 }
function gX(g, v) { return g.x + clampv((v - g.x0) / (g.x1 - g.x0), -0.02, 1.02) * g.w; }
function gY(g, v) { return g.y + g.h - clampv((v - g.y0) / (g.y1 - g.y0), -0.02, 1.02) * g.h; }
function plotAxes(g, xl, yl, xt, yt) {
  stroke(70, 76, 110); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h);
  noStroke(); fill(150, 156, 190); textSize(12); textAlign(CENTER, TOP);
  for (let v of xt) text(+v.toPrecision(3), gX(g, v), g.y + g.h + 4);
  textAlign(RIGHT, CENTER);
  for (let v of yt) text(+v.toPrecision(3), g.x - 5, gY(g, v));
  textAlign(LEFT, BASELINE); fill(205, 210, 235); textSize(13);
  text(xl, g.x + g.w - textWidth(xl), g.y + g.h + 30); text(yl, g.x, g.y - 8);
}
function polyline(pts) {               // 点が 2 つ以上あるときだけ折れ線を描く（空の beginShape を作らない）
  if (pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape();
}
function smoothArr(a, k) {             // 直前 k 個の平均（ギザギザの学習曲線をならす）
  let out = [], s = 0;
  for (let i = 0; i < a.length; i++) { s += a[i]; if (i >= k) s -= a[i - k]; out.push(s / Math.min(i + 1, k)); }
  return out;
}
function drawCurve(g, arr, col, sw, xOff) {   // arr[i] を x = i (+ xOff) に。長いときは間引いて 600 点まで
  let n = arr.length, stride = Math.max(1, Math.ceil(n / 600)), pts = [];
  for (let i = 0; i < n; i += stride) pts.push([gX(g, i + (xOff || 0)), gY(g, arr[i])]);
  if (n > 1 && (n - 1) % stride) pts.push([gX(g, n - 1 + (xOff || 0)), gY(g, arr[n - 1])]);
  stroke(...col); strokeWeight(sw || 2); polyline(pts);
}
function legend(x, y, items) {         // items = [[色, 名前], …]
  textSize(13); textAlign(LEFT, CENTER);
  for (let [c, s] of items) { noStroke(); fill(...c); rect(x, y - 5, 16, 10); fill(220, 225, 245); text(s, x + 22, y); y += 20; }
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) || ArrayBuffer.isView(v) ? Array.from(v).every(noNaN) : !(typeof v === 'number' && !isFinite(v)); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(120, 225, 200) : color(255, 90, 120)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
