// ============================================
// 04 モンテカルロと TD 学習 ─ 5 つの状態 A〜E のランダムウォーク（真ん中 C から出発、左右に 1/2 ずつ）
// 右はしに出たら報酬 1、左はしなら 0。真の価値 = 右に出る確率 = 1/6, 2/6, …, 5/6。
// モンテカルロ（MC）はエピソードの最後まで待って「実際の結果」に近づける。TD(0) は 1 歩ごとに「次の状態の推定」に近づける
// ↑↓ TD の学習率 α / ← → MC の学習率 α / F 速さ / スペース やり直し
// ============================================

let alphaTD = 0.1, alphaMC = 0.03;       // ★ 学習率（↑↓ と ← → で変える）
const N_EPIS = 100, N_RUNS = 100;        // ★ 誤差の曲線：100 エピソード × 100 回の平均
const TRUE_V = [1, 2, 3, 4, 5].map((i) => i / 6);
let vTD, vMC, walker = 3, path = [3], episodes = 0, fast = false, rmsTD, rmsMC, runsDone = 0, lastR = null;

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); seedRng(9); resetAll(); }
function resetAll() { vTD = [0, 0.5, 0.5, 0.5, 0.5, 0.5, 0]; vMC = vTD.slice(); walker = 3; path = [3]; episodes = 0; resetCurves(); }
function resetCurves() { rmsTD = new Array(N_EPIS + 1).fill(0); rmsMC = new Array(N_EPIS + 1).fill(0); runsDone = 0; }
function rms(V) { let e = 0; for (let i = 1; i <= 5; i++) e += (V[i] - TRUE_V[i - 1]) ** 2; return Math.sqrt(e / 5); }

// 状態の番号：0 = 左はし（終わり）、1〜5 = A〜E、6 = 右はし（終わり）
function walkStep(s) { return s + (rnd() < 0.5 ? -1 : 1); }
// ★ TD(0)：V(s) ← V(s) + α (r + V(s′) − V(s))。終わりの状態の価値は 0
function tdUpdate(V, s, s2, alpha) { let r = s2 === 6 ? 1 : 0, v2 = s2 === 0 || s2 === 6 ? 0 : V[s2]; V[s] += alpha * (r + v2 - V[s]); }
// ★ 初回訪問モンテカルロ：エピソードで最初に来た状態ごとに V(s) ← V(s) + α (G − V(s))（G = 最後の報酬）
function mcUpdate(V, states, G, alpha, counts) {
  let seen = {};
  for (let s of states) { if (seen[s]) continue; seen[s] = true; if (counts) { counts[s]++; V[s] += (G - V[s]) / counts[s]; } else V[s] += alpha * (G - V[s]); }
}
function runEpisodeTD(V, alpha) { let s = 3; for (;;) { let s2 = walkStep(s); tdUpdate(V, s, s2, alpha); if (s2 === 0 || s2 === 6) return; s = s2; } }
function runEpisodeMC(V, alpha, counts) { let s = 3, states = [3]; for (;;) { s = walkStep(s); if (s === 0 || s === 6) break; states.push(s); } mcUpdate(V, states, s === 6 ? 1 : 0, alpha, counts); }
function curveRun(acc, isTD, alpha, runs) {  // 1 回分の誤差の曲線を足しこむ
  let V = [0, 0.5, 0.5, 0.5, 0.5, 0.5, 0]; acc[0] += rms(V) / runs;
  for (let e = 1; e <= N_EPIS; e++) { isTD ? runEpisodeTD(V, alpha) : runEpisodeMC(V, alpha); acc[e] += rms(V) / runs; }
}
function demoStep() {                     // 画面のエージェントを 1 歩（TD はすぐ更新、MC は最後に）
  let s2 = walkStep(walker); tdUpdate(vTD, walker, s2, alphaTD);
  if (s2 === 0 || s2 === 6) { mcUpdate(vMC, path, s2 === 6 ? 1 : 0, alphaMC); lastR = s2 === 6 ? 1 : 0; episodes++; walker = 3; path = [3]; }
  else { walker = s2; path.push(s2); }
}

function draw() {
  background(...BG);
  let t0 = performance.now();
  if (fast) { while (performance.now() - t0 < 3) demoStep(); } else if (frameCount % 10 === 0) demoStep();
  while (runsDone < N_RUNS && performance.now() - t0 < 6) { curveRun(rmsTD, true, alphaTD, N_RUNS); curveRun(rmsMC, false, alphaMC, N_RUNS); runsDone++; }

  noStroke(); fill(240); textSize(22); textAlign(LEFT, BASELINE);
  text('モンテカルロ と TD(0)：ランダムウォーク　エピソード ' + episodes, 40, 42);
  fill(170, 176, 210); textSize(15);
  text('↑↓ TD の α = ' + alphaTD.toFixed(2) + '　← → MC の α = ' + alphaMC.toFixed(2) + '　F 速さ（' + (fast ? '速い' : 'ふつう') + '）　スペース やり直し', 40, 68);

  // ---- 一列の状態
  let cx0 = 120, gapX = Math.min(130, (width - 240) / 6), cy = 140;
  for (let i = 0; i <= 6; i++) {
    let x = cx0 + i * gapX;
    if (i === 0 || i === 6) { fill(60, 66, 110); rect(x - 22, cy - 22, 44, 44, 6); fill(230); textAlign(CENTER, CENTER); textSize(15); text(i === 6 ? '+1' : '0', x, cy); continue; }
    fill(30, 34, 70); stroke(...CYAN, 160); strokeWeight(2); circle(x, cy, 52);
    noStroke(); fill(240); textAlign(CENTER, CENTER); textSize(18); text('ABCDE'[i - 1], x, cy);
    if (i < 6) { stroke(90, 96, 140); line(x + 28, cy, x + gapX - 28, cy); }
  }
  noStroke(); fill(...GOLD); circle(cx0 + walker * gapX, cy - 42, 20);
  fill(170, 176, 210); textSize(13); textAlign(LEFT, CENTER);
  text('いまのエピソードの道：' + path.map((s) => 'ABCDE'[s - 1]).join(' → ') + (lastR !== null ? '　（前回の結果 ' + lastR + '）' : ''), 40, cy + 50);

  // ---- 推定値（画面の 1 回の学習）
  let g = { x: 70, y: 250, w: width * 0.38, h: height - 360, x0: 0.5, x1: 5.5, y0: 0, y1: 1 };
  plotAxes(g, '状態（A〜E）', '価値の推定', [1, 2, 3, 4, 5], [0, 0.5, 1]);
  stroke(...LIME); strokeWeight(2); polyline(TRUE_V.map((v, i) => [gX(g, i + 1), gY(g, v)]));
  stroke(...CYAN); strokeWeight(3); polyline([1, 2, 3, 4, 5].map((i) => [gX(g, i), gY(g, vTD[i])]));
  stroke(...PINK); polyline([1, 2, 3, 4, 5].map((i) => [gX(g, i), gY(g, vMC[i])]));
  legend(g.x + 12, g.y + 16, [[LIME, '真の価値 1/6〜5/6'], [CYAN, 'TD(0)'], [PINK, 'モンテカルロ']]);
  noStroke(); fill(220); textSize(14); textAlign(LEFT, BASELINE);
  text('誤差（RMS）　TD ' + fmtN(rms(vTD), 3) + '　MC ' + fmtN(rms(vMC), 3), g.x, g.y + g.h + 50);

  // ---- 誤差の曲線（100 回の平均）
  let h = { x: width * 0.53, y: 250, w: width * 0.42, h: height - 360, x0: 0, x1: N_EPIS, y0: 0, y1: 0.25 };
  plotAxes(h, 'エピソード', '誤差 RMS（' + runsDone + ' 回の平均）', [0, 25, 50, 75, 100], [0, 0.05, 0.1, 0.15, 0.2, 0.25]);
  if (runsDone > 0) {
    drawCurve(h, rmsTD.map((v) => (v * N_RUNS) / runsDone), CYAN, 2.5);
    drawCurve(h, rmsMC.map((v) => (v * N_RUNS) / runsDone), PINK, 2.5);
  }
  legend(h.x + h.w - 200, h.y + 16, [[CYAN, 'TD(0) α = ' + alphaTD.toFixed(2)], [PINK, 'MC α = ' + alphaMC.toFixed(2)]]);
  noStroke(); fill(170, 176, 210); textSize(13); textAlign(LEFT, BASELINE);
  text('α が大きいと速く下がるが、ゆれが残って下げ止まる。', h.x, h.y + h.h + 50);
  text('TD は「推定で推定を更新」するので、少ないデータで強い', h.x, h.y + h.h + 70);
  drawSelfTest(width - 180, height - 14);
}

function keyPressed() {
  let old = [alphaTD, alphaMC];
  if (key === UP_ARROW) alphaTD = Math.min(0.5, Math.round((alphaTD + 0.01) * 100) / 100);
  if (key === DOWN_ARROW) alphaTD = Math.max(0.01, Math.round((alphaTD - 0.01) * 100) / 100);
  if (key === RIGHT_ARROW) alphaMC = Math.min(0.5, Math.round((alphaMC + 0.01) * 100) / 100);
  if (key === LEFT_ARROW) alphaMC = Math.max(0.01, Math.round((alphaMC - 0.01) * 100) / 100);
  if (old[0] !== alphaTD || old[1] !== alphaMC) resetCurves();
  if (key === 'f' || key === 'F') fast = !fast;
  if (key === ' ') resetAll();
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(1);
  let V = [0, 0.5, 0.5, 0.5, 0.5, 0.5, 0], counts = new Array(7).fill(0);
  for (let e = 0; e < 3000; e++) runEpisodeMC(V, 0, counts);
  check('モンテカルロ（標本平均）3000 エピソード：RMS ' + fmtN(rms(V), 4) + ' < 0.05', rms(V) < 0.05);
  seedRng(1); let W = [0, 0.5, 0.5, 0.5, 0.5, 0.5, 0];
  for (let e = 0; e < 3000; e++) runEpisodeTD(W, 0.01);
  check('TD(0)（α = 0.01）3000 エピソード：RMS ' + fmtN(rms(W), 4) + ' < 0.05', rms(W) < 0.05);
  let T = [0].concat(TRUE_V, [0]), okFix = true;
  for (let s = 1; s <= 5; s++) { let exp = 0.5 * ((s - 1 === 0 ? 0 : T[s - 1]) - T[s]) + 0.5 * ((s + 1 === 6 ? 1 : T[s + 1]) - T[s]); if (!near(exp, 0, 1e-12)) okFix = false; }
  check('真の価値 i/6 では TD の更新の期待値がちょうど 0（ベルマン方程式の解）', okFix);
  seedRng(2); let a = new Array(N_EPIS + 1).fill(0); for (let r = 0; r < 100; r++) curveRun(a, true, 0.05, 100);
  let bestMC = Infinity;
  for (let al of [0.01, 0.02, 0.03, 0.04]) { let b = new Array(N_EPIS + 1).fill(0); for (let r = 0; r < 100; r++) curveRun(b, false, al, 100); bestMC = Math.min(bestMC, meanOf(b.slice(50))); }
  check('100 回平均・エピソード 50〜100 の誤差：TD(α = 0.05) ' + fmtN(meanOf(a.slice(50)), 3) + ' < MC のいちばん良い α ' + fmtN(bestMC, 3), meanOf(a.slice(50)) < bestMC);
  check('誤差は 1 エピソード目より 100 エピソード目のほうが小さい（TD）', a[100] < a[1] && noNaN(a));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. TD の α を 0.15 → 0.05 にすると、曲線はどう変わる？（速さと最後の誤差のかけひき）
// 2. MC の α をいろいろ変えて、TD より良くなる α はある？
// 3. F で速くして、画面の推定値（左のグラフ）が真の値 1/6〜5/6 にどう近づくか見よう
// 4. 状態を 19 個にふやすと？（TRUE_V も変える）
// 5. α を 1/（その状態に来た回数）にすると、MC はただの平均になる。これが標本平均

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
