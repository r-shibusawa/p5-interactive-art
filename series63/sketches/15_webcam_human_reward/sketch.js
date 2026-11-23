// ============================================
// 15 体で報酬を与える 📷 ─ 画面の生き物が 4 つの動き方から 1 つを選んで 2 秒間やってみせる。
// その間にカメラの前で手を振ると、動きの量（前のフレームとの差 = フレーム差分）がそのまま報酬になる。
// 生き物は「勾配バンディット」で学ぶ：好み H を持ち、確率 π = ソフトマックス(H) で選ぶ。
// 報酬が平均より大きければ選んだ動きの H を上げ、ほかを下げる：H_a ← H_a + α (R − R_bar) (1 − π_a)
// カメラが使えないときは、2 秒の間のマウスのクリックが報酬（3 回で満点）
// ↑↓ 感度 / R 学習をやり直す / C カメラ ⇔ マウス / S 画面を保存
// ============================================

const ACTS = ['ぴょんぴょん（金）', 'くるくる（水色）', 'ぷるぷる（ピンク）', 'のびちぢみ（紫）'];
const TRIAL_FRAMES = 120;                // ★ 1 回の長さ（60 フレーム = 1 秒）
const ALPHA = 0.4;                       // ★ 学習率
const CAM_W = 64, CAM_H = 48;            // カメラを小さくして差分をとる
let sens = 6;                            // ★ 感度（動きの量に掛ける数）
let prefs, rBar = 0, nTrials = 0, act = 0, trialT = 0, motionSum = 0, clicks = 0, rewardLog = [], cap = null, prevGray = null, useCam = true, lastMotion = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  seedRng(15); resetLearning();
  try { cap = createCapture(VIDEO, { flipped: true }); cap.size(CAM_W, CAM_H); cap.hide(); } catch (e) { cap = null; }
}
function resetLearning() { prefs = new Array(ACTS.length).fill(0); rBar = 0; nTrials = 0; rewardLog = []; startTrial(); }
function probs() { return softmaxArr(prefs, 1); }
function startTrial() { act = sampleFrom(probs()); trialT = 0; motionSum = 0; clicks = 0; }
// ★ 勾配バンディットの更新（base = R_bar = これまでの報酬の平均 = ベースライン）
function banditUpdate(H, base, a, r) {
  let p = softmaxArr(H, 1);
  for (let b = 0; b < H.length; b++) H[b] = clampv(H[b] + ALPHA * (r - base) * ((b === a ? 1 : 0) - p[b]), -20, 20);
}
// ★ フレーム差分：前のフレームとの明るさの差の平均（0〜1）
function frameDiff(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return a.length ? s / a.length / 255 : 0; }
function camLive() { return useCam && cap && cap.width > 0 && cap.elt && cap.elt.readyState >= 2 && cap.elt.videoWidth > 0; }
function readMotion() {
  if (!camLive()) return 0;
  cap.loadPixels(); if (!cap.pixels || cap.pixels.length < CAM_W * CAM_H * 4) return 0;
  let g = new Float32Array(CAM_W * CAM_H);
  for (let i = 0; i < g.length; i++) g[i] = (cap.pixels[4 * i] + cap.pixels[4 * i + 1] + cap.pixels[4 * i + 2]) / 3;
  let m = prevGray ? frameDiff(g, prevGray) : 0; prevGray = g; return m;
}

function draw() {
  background(...BG);
  lastMotion = readMotion(); motionSum += lastMotion; trialT++;
  if (trialT >= TRIAL_FRAMES) {          // 1 回おわり → 報酬を計算して学習
    let r = camLive() ? clampv((motionSum / TRIAL_FRAMES) * sens * 10, 0, 1) : clampv(clicks / 3, 0, 1);
    nTrials++; banditUpdate(prefs, rBar, act, r); rBar += (r - rBar) / nTrials;
    rewardLog.push({ a: act, r }); startTrial();
  }
  noStroke(); fill(240); textSize(22); textAlign(LEFT, BASELINE);
  text('体で報酬を与える：' + nTrials + ' 回目　いまの動き = ' + ACTS[act], 40, 42);
  fill(170, 176, 210); textSize(15);
  text((camLive() ? 'カメラの前で手を振ると報酬' : 'マウスのクリックが報酬（カメラなし）') + '　↑↓ 感度 ' + sens + '　R やり直し　C カメラ ⇔ マウス　S 保存', 40, 68);

  // ---- 生き物
  let cx = width * 0.3, cy = height * 0.42, t = frameCount / 60, sz = Math.min(width, height) * 0.16, cols = [GOLD, CYAN, PINK, VIOLET];
  push(); translate(cx, cy);
  if (act === 0) translate(0, -Math.abs(Math.sin(t * 6)) * sz * 0.6);
  if (act === 1) rotate(t * 4);
  if (act === 2) translate(Math.sin(t * 40) * 6, 0);
  let sx = act === 3 ? 1 + 0.35 * Math.sin(t * 5) : 1, sy = act === 3 ? 1 - 0.3 * Math.sin(t * 5) : 1;
  noStroke(); fill(...cols[act]); ellipse(0, 0, sz * sx, sz * sy);
  fill(20); circle(-sz * 0.18, -sz * 0.08, sz * 0.12); circle(sz * 0.18, -sz * 0.08, sz * 0.12);
  noFill(); stroke(20); strokeWeight(3); arc(0, sz * 0.08, sz * 0.3, sz * 0.18, 0.2, Math.PI - 0.2);
  pop();
  // 1 回の残り時間
  noStroke(); fill(60, 66, 110); rect(cx - 150, cy + sz + 20, 300, 10, 5); fill(...cols[act]); rect(cx - 150, cy + sz + 20, (300 * trialT) / TRIAL_FRAMES, 10, 5);

  // ---- カメラと動きの量
  let vx = width * 0.58, vy = 100, vw = 192, vh = 144;
  if (camLive()) image(cap, vx, vy, vw, vh); else { fill(30, 34, 70); rect(vx, vy, vw, vh); fill(200); textSize(13); textAlign(CENTER, CENTER); text('カメラなし：クリックで報酬\n（いま ' + clicks + ' 回）', vx + vw / 2, vy + vh / 2); }
  textAlign(LEFT, BASELINE); fill(230); textSize(14);
  text('動きの量 ' + fmtN(lastMotion * sens * 10, 2), vx + vw + 20, vy + 20);
  fill(...LIME); rect(vx + vw + 20, vy + 30, clampv(lastMotion * sens * 10, 0, 1) * 160, 12);
  // 確率
  let p = probs(), py = vy + vh + 40; fill(230); textSize(15); text('選ぶ確率 π（好み H のソフトマックス）', vx, py);
  p.forEach((v, k) => { fill(...cols[k]); rect(vx, py + 14 + k * 30, v * 300, 20, 4); fill(230); textSize(13); text(ACTS[k] + '　' + Math.round(100 * v) + '%', vx + 310, py + 29 + k * 30); });
  // 報酬の履歴
  let g = { x: vx, y: py + 170, w: width - vx - 50, h: height - (py + 170) - 70, x0: 0, x1: Math.max(20, rewardLog.length), y0: 0, y1: 1 };
  plotAxes(g, '回', '報酬（色 = その回の動き）', [0, g.x1], [0, 0.5, 1]);
  noStroke(); rewardLog.forEach((h, i) => { fill(...cols[h.a]); circle(gX(g, i + 0.5), gY(g, h.r), 8); });
  stroke(255, 120); strokeWeight(1); line(g.x, gY(g, rBar), g.x + g.w, gY(g, rBar));
  noStroke(); fill(170, 176, 210); textSize(13); text('白い線 = 平均の報酬 R_bar（ベースライン）', g.x, g.y + g.h + 46);
  drawSelfTest(width - 180, height - 14);
}

function mousePressed() { clicks++; }
function keyPressed() {
  if (key === UP_ARROW) sens = Math.min(30, sens + 1);
  if (key === DOWN_ARROW) sens = Math.max(1, sens - 1);
  if (key === 'r' || key === 'R') resetLearning();
  if (key === 'c' || key === 'C') useCam = !useCam;
  if (key === 's' || key === 'S') saveCanvas('human_reward', 'png');
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(1); let H = [0, 0, 0, 0], base = 0;
  for (let n = 1; n <= 500; n++) { let a = sampleFrom(softmaxArr(H, 1)), r = clampv((a === 2 ? 0.8 : 0.2) + 0.15 * randn(), 0, 1); banditUpdate(H, base, a, r); base += (r - base) / n; }
  let p = softmaxArr(H, 1);
  check('報酬が多い動き（ぷるぷる、平均 0.8）を 500 回で学ぶ：π = ' + Math.round(100 * p[2]) + '% > 80%', p[2] > 0.8);
  check('確率の合計 = 1、NaN なし', near(p.reduce((a, b) => a + b, 0), 1, 1e-12) && noNaN(H));
  let H2 = [0.5, -0.2, 0.1, 0], s0 = H2.reduce((a, b) => a + b, 0); banditUpdate(H2, 0.3, 1, 0.9);
  check('平均より良い報酬なら選んだ動きの H が上がり、ほかは下がる（H の合計は変わらない）', H2[1] > -0.2 && H2[0] < 0.5 && near(H2.reduce((a, b) => a + b, 0), s0, 1e-12));
  let a = new Float32Array(100).fill(80), b = a.slice(); for (let i = 0; i < 25; i++) b[i] = 80 + 255 * 0.5;
  check('フレーム差分：同じ絵なら 0、4 分の 1 が明るさ 127.5 変わると 0.125', frameDiff(a, a) === 0 && near(frameDiff(a, b), 0.125, 1e-6));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 「くるくる」のときだけ手を振って、何回で確率が 8 割をこえるか数えよう
// 2. 途中で好みを変えると、生き物はついてくる？（勾配バンディットは確率がかたよると試さなくなる）
// 3. ALPHA を 0.1 と 1.0 でくらべよう
// 4. 動きを 1 つ足そう（ACTS と、描くところに 1 つずつ）
// 5. 人がほめると学ぶのは、大きな言語モデルの「人のフィードバックによる強化学習」と同じ考え方。どんな注意が要る？（13 の報酬のずる）

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
