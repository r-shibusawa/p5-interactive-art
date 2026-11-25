// ============================================
// 11 再帰網の力学とリザバー計算 ─ ニューロン 100 個がランダムにつながった再帰網：x(t+1) = tanh(W x(t) + w_in u(t))
// W の大きさは「スペクトル半径」ρ（固有値の絶対値の最大）で決まる。べき乗法：v ← W v / ‖W v‖ をくり返し、1 回あたりの伸び率の平均
//   ρ < 1：昔の状態はだんだん忘れる（ちがう初期状態でも、同じ入力ならやがて同じ状態に = エコー状態性）
//   ρ > 1：自分で動き続け、小さな差が消えない（混沌）
// リザバー計算：W はランダムのまま固定し、出力の重みだけをリッジ回帰（連立 1 次方程式 1 回）で学ぶ。次の値を予測させる
// ↑↓ スペクトル半径 ρ / T 課題（サイン波 ⇔ マッキー-グラス）/ R 別のランダムな網 / スペース 一時停止
// ============================================

const NR = 100, WASH = 100, N_FIT = 1000, N_TEST = 400;   // ★ ニューロンの数、捨てる長さ、学習・テストの長さ
const RIDGE = 1e-6;                      // ★ 出力の重みのリッジ
let rhoT = 0.9, task = 0, seedE = 1, wRes = null, wInp = null, stA = null, stB = null, distLog = [], traces = [], tNow = 0, series = null, fitRes = null, pausedE = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  rebuildRes();
}

// ★ スペクトル半径：べき乗法。複素数の固有値の組（回転）でも、長い区間の伸び率の平均（対数）なら正しく出る
function spectralRadius(m, iters, seed) {
  let n = m.length; seedRng(seed || 3); let v = []; for (let i = 0; i < n; i++) v.push(randn());
  let nv = normV(v); v = v.map((x) => x / nv); let acc = 0, cnt = 0;
  for (let k = 0; k < iters; k++) { let w = matVec(m, v), nw = normV(w); if (!(nw > 0)) return 0; if (k >= iters / 3) { acc += Math.log(nw); cnt++; } v = w.map((x) => x / nw); }
  return Math.exp(acc / cnt);
}
function randomReservoir(n, rho, seed) {
  seedRng(seed); let m = []; for (let i = 0; i < n; i++) { let r = []; for (let j = 0; j < n; j++) r.push(rnd() < 0.2 ? randn() : 0); m.push(r); }   // 2 割だけつながる
  let r0 = spectralRadius(m, 600, seed + 1); return m.map((r) => r.map((v) => (v * rho) / r0));
}
function stepRes(x, u) { let y = matVec(wRes, x); for (let i = 0; i < y.length; i++) y[i] = Math.tanh(y[i] + wInp[i] * u); return y; }
// 課題の時系列：サイン波、またはマッキー-グラス方程式 dx/dt = 0.2 x(t−17)/(1 + x(t−17)^10) − 0.1 x（オイラー法 dt = 0.1、1 ごとに記録）
function makeSeries(kind, len) {
  if (kind === 0) return Array.from({ length: len }, (_, t) => 0.8 * Math.sin((2 * Math.PI * t) / 25) * Math.sin((2 * Math.PI * t) / 210 + 1));
  let dt = 0.1, lag = 170, h = new Array(lag + 1).fill(1.2), out = [], x = 1.2;
  for (let s = 0; s < (len + 300) * 10; s++) {
    let xl = h[(s) % (lag + 1)]; x = x + dt * ((0.2 * xl) / (1 + Math.pow(xl, 10)) - 0.1 * x); h[s % (lag + 1)] = x;
    if (s % 10 === 0 && s >= 3000) out.push(x - 0.9);
  }
  return out.slice(0, len);
}
// ★ 出力の重みの学習：状態 [x, u, 1] から次の値 u(t+1) をリッジ回帰で。テスト区間の正規化 2 乗誤差（NMSE）を返す
function fitReadout(ser) {
  let x = new Array(NR).fill(0), feats = [];
  for (let t = 0; t < ser.length - 1; t++) { x = stepRes(x, ser[t]); feats.push(x.concat([ser[t], 1])); }
  let phi = feats.slice(WASH, WASH + N_FIT), y = ser.slice(WASH + 1, WASH + N_FIT + 1), wo = ridgeSolve(phi, y, RIDGE);
  let pred = [], err = 0, vr = 0, test = ser.slice(WASH + N_FIT + 1, WASH + N_FIT + 1 + N_TEST), m = meanOf(test);
  for (let t = 0; t < N_TEST; t++) { let p = dotV(wo, feats[WASH + N_FIT + t]); pred.push(p); err += (p - test[t]) ** 2; vr += (test[t] - m) ** 2; }
  return { wo, pred, test, nmse: err / Math.max(1e-12, vr), phi, y };
}
function rebuildRes() {
  wRes = randomReservoir(NR, rhoT, 50 + seedE); seedRng(60 + seedE); wInp = []; for (let i = 0; i < NR; i++) wInp.push(rnd() - 0.5);
  stA = []; stB = []; for (let i = 0; i < NR; i++) { stA.push(randn() * 0.8); stB.push(randn() * 0.8); }
  distLog = []; traces = []; tNow = 0;
  series = makeSeries(task, WASH + N_FIT + N_TEST + 2); fitRes = fitReadout(series);
}

function draw() {
  background(...BG);
  if (!pausedE) for (let k = 0; k < 2; k++) {
    let u = series[tNow % series.length]; stA = stepRes(stA, u); stB = stepRes(stB, u); tNow++;
    let d = normV(stA.map((v, i) => v - stB[i])); distLog.push(d); if (distLog.length > 400) distLog.shift();
    traces.push(stA.slice(0, 6)); if (traces.length > 300) traces.shift();
  }
  hudTitle('再帰網とリザバー計算：スペクトル半径 ρ = ' + fmtN(rhoT, 2) + (rhoT < 1 ? '（< 1：忘れる）' : rhoT === 1 ? '（= 1：境目）' : '（> 1：自分で動き続ける）') + '　課題 ' + (task ? 'マッキー-グラス' : 'サイン波') + '　テストの NMSE = ' + fmtE(fitRes.nmse),
    '↑↓ ρ　T 課題　R 別のランダムな網　スペース ' + (pausedE ? '再開' : '一時停止') + '　（ニューロン ' + NR + ' 個、学ぶのは出力の重み ' + (NR + 2) + ' 個だけ）');
  let lw = width * 0.46, h3 = (height - 220) / 3;
  // ① 2 つの初期状態の距離
  let g1 = { x: 70, y: 105, w: lw - 70, h: h3 - 40, x0: 0, x1: 400, y0: -12, y1: 2 };
  plotAxes(g1, '時刻（最近の 400）', '① 初期状態だけちがう 2 つの網の距離 log₁₀‖x_A − x_B‖（同じ入力）', [0, 400], [-12, -6, 0]);
  plotXY(g1, distLog.map((_, i) => i), distLog.map((d) => Math.log10(Math.max(1e-13, d))), MAG, 2);
  // ② ニューロン 6 個の動き
  let g2 = { x: 70, y: g1.y + h3 + 20, w: lw - 70, h: h3 - 40, x0: 0, x1: 300, y0: -1, y1: 1 };
  plotAxes(g2, '時刻', '② ニューロン 6 個の出力 x_i(t)（tanh なので −1〜1）', [0, 300], [-1, 0, 1]);
  let cols = [MAG, LIME, SKY, AMBER, VIOLET, INK];
  for (let c = 0; c < 6; c++) plotXY(g2, traces.map((_, i) => i), traces.map((r) => r[c]), [...cols[c], 200], 1.5);
  // ③ 予測
  let g3 = { x: 70, y: g2.y + h3 + 20, w: width - 110, h: h3 - 30, x0: 0, x1: 200, y0: -1, y1: 1 };
  if (task) { g3.y0 = -0.6; g3.y1 = 0.6; }
  plotAxes(g3, 'テスト区間の時刻（学習に使っていない所）', '③ 次の値の予測：白 = 本物、マゼンタ = リザバーの予測（出力の重みだけ学習）', [0, 200], [g3.y0, 0, g3.y1]);
  let ts = []; for (let t = 0; t < 200; t++) ts.push(t);
  plotXY(g3, ts, fitRes.test.slice(0, 200), [...INK, 200], 3);
  plotXY(g3, ts, fitRes.pred.slice(0, 200), MAG, 1.5);
  // 右上：説明と数値
  let rx = lw + 40; noStroke(); fill(...INK); textSize(15); textAlign(LEFT, BASELINE);
  let est = spectralRadiusCached();
  text('べき乗法で測った ρ = ' + fmtN(est, 4) + '（目標 ' + fmtN(rhoT, 2) + '）', rx, 120);
  text('いまの距離 ‖x_A − x_B‖ = ' + fmtE(distLog[distLog.length - 1] || 0), rx, 146);
  fill(...SUB); textSize(13);
  let lines = ['ρ < 1 なら距離は指数的に 0 へ（下がる直線）→ 状態は「最近の入力」だけで決まる',
    'ρ が 1 に近いほど、ゆっくり忘れる = 長く覚えている。ただし大きすぎると',
    '入力と関係なく自分で動き出し、予測に使えない（ρ = 1.3〜1.6 で試す）',
    '学ぶのは最後の出力の重みだけ：(ΦᵀΦ + λI) w = Φᵀy を 1 回解くだけ',
    '誤差逆伝播で時間をさかのぼる（勾配消失・爆発 01・07）必要がない',
    'NMSE = 予測の 2 乗誤差 ÷ 本物の分散（0 に近いほど良い）'];
  lines.forEach((s, i) => text(s, rx, 180 + 20 * i));
  drawSelfTest(width - 180, height - 14);
}
let cachedRho = null;
function spectralRadiusCached() { if (!cachedRho || cachedRho.m !== wRes) cachedRho = { m: wRes, v: spectralRadius(wRes, 300, 9) }; return cachedRho.v; }

function keyPressed() {
  if (key === UP_ARROW) { rhoT = Math.min(1.6, Math.round((rhoT + 0.1) * 10) / 10); rebuildRes(); }
  if (key === DOWN_ARROW) { rhoT = Math.max(0.1, Math.round((rhoT - 0.1) * 10) / 10); rebuildRes(); }
  if (key === 't' || key === 'T') { task = 1 - task; rebuildRes(); }
  if (key === 'r' || key === 'R') { seedE++; rebuildRes(); }
  if (key === ' ') pausedE = !pausedE;
  return false;
}

// ============================================
// やってみよう
// ・ρ = 0.5、0.9、1.2、1.5 で ① の距離のグラフをくらべる。忘れる速さは ρ とどう関係する？
// ・マッキー-グラス（T）で、ρ を変えて NMSE がいちばん小さくなるところを探す
// ・NR を 20 や 300 にすると予測はどう変わる？
// ・RIDGE を 1 にすると？ 1e-12 にすると？
// ============================================

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let blk = zerosMat(6), rot = (i, r, a) => { blk[i][i] = r * Math.cos(a); blk[i][i + 1] = -r * Math.sin(a); blk[i + 1][i] = r * Math.sin(a); blk[i + 1][i + 1] = r * Math.cos(a); };
  rot(0, 0.9, 0.7); rot(2, 0.5, 2.1); rot(4, 0.3, 0.2);
  let e1 = spectralRadius(blk, 600, 4);
  check('べき乗法：回転を含む行列（固有値が複素数の組、ρ = 0.9）で ' + fmtN(e1, 5), Math.abs(e1 - 0.9) < 0.009);
  let keepW = wRes, keepI = wInp;
  wRes = randomReservoir(NR, 0.8, 51); let e2 = spectralRadius(wRes, 800, 77);
  check('ランダムな網を ρ = 0.8 にそろえ、別の初期ベクトルで測り直しても ' + fmtN(e2, 4), Math.abs(e2 - 0.8) < 0.016);
  seedRng(61); wInp = []; for (let i = 0; i < NR; i++) wInp.push(rnd() - 0.5);
  let a = [], b = []; for (let i = 0; i < NR; i++) { a.push(randn()); b.push(randn()); }
  for (let t = 0; t < 300; t++) { let u = Math.sin(t * 0.3); a = stepRes(a, u); b = stepRes(b, u); }
  let dist = normV(a.map((v, i) => v - b[i]));
  check('ρ = 0.8：ちがう初期状態でも 300 歩で同じ状態に（距離 ' + fmtE(dist) + '、エコー状態性）', dist < 1e-6);
  wRes = randomReservoir(NR, 1.5, 52); let c = []; for (let i = 0; i < NR; i++) c.push(0.5 * randn());
  for (let t = 0; t < 300; t++) c = stepRes(c, 0);
  check('ρ = 1.5、入力 0：300 歩たっても動き続ける（‖x‖ = ' + fmtN(normV(c), 2) + '）', normV(c) > 0.5);
  wRes = randomReservoir(NR, 0.9, 53); let fr = fitReadout(makeSeries(0, WASH + N_FIT + N_TEST + 2));
  check('ρ = 0.9：サイン波の次の値をテスト区間で予測、NMSE = ' + fmtE(fr.nmse) + ' < 1e−3', fr.nmse < 1e-3);
  let gW = fr.phi[0].map(() => 0); for (let i = 0; i < fr.phi.length; i++) { let e = dotV(fr.wo, fr.phi[i]) - fr.y[i]; for (let j = 0; j < gW.length; j++) gW[j] += fr.phi[i][j] * e; }
  let res = Math.max(...gW.map((g, j) => Math.abs(g + RIDGE * fr.wo[j])));
  check('出力の重みは正規方程式 Φᵀ(Φw − y) + λw = 0 を満たす（残り ' + fmtE(res) + '）', res < 1e-6);
  wRes = keepW; wInp = keepI;
  reportSelfTest();
}

// ==================================================
// ここから下は「神経回路網の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 色と小さな道具（神経細胞：深い青緑の黒、あたたかい白、シナプスのマゼンタ、軸索のライム）
const BG = [8, 22, 24];                  // 背景（深い青緑の黒）
const INK = [246, 238, 224];             // 文字（あたたかい白）
const MAG = [232, 72, 160], LIME = [184, 232, 76], AMBER = [250, 186, 72], SKY = [96, 196, 236], VIOLET = [168, 140, 250];
const SUB = [150, 178, 172], PANEL = [16, 38, 40], WIRE = [44, 76, 76];
function clampv(v, a, b) { return v < a ? a : v > b ? b : v !== v ? a : v; }     // NaN なら a に戻す
function sumOf(a) { let s = 0; for (let v of a) s += v; return s; }
function meanOf(a) { return a.length ? sumOf(a) / a.length : 0; }
function fmtN(v, d) { if (typeof v !== 'number' || v !== v) return '?'; if (!isFinite(v)) return v > 0 ? '∞' : '−∞'; let s = v.toFixed(d === undefined ? 2 : d); return /^-0\.?0*$/.test(s) ? s.slice(1) : s; }
function fmtE(v) { if (typeof v !== 'number' || !isFinite(v)) return '?'; return v === 0 ? '0' : v.toExponential(1); }
function hudTitle(t, sub) {              // 左上のタイトルと操作の説明
  noStroke(); fill(...INK); textSize(22); textAlign(LEFT, BASELINE); text(t, 30, 38);
  fill(...SUB); textSize(14); text(sub, 30, 62);
}
function sigm(z) { return 1 / (1 + Math.exp(-clampv(z, -40, 40))); }
// ---- 種つきの乱数（同じ種なら毎回同じ列 → 実験をくり返せる）
let rngState = 1;
function seedRng(s) { rngState = (s >>> 0) || 1; }
function rnd() {                         // 0〜1 の一様乱数（mulberry32）
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rndInt(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
function randn() { let u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }   // 標準正規分布
function shuffleArr(a) { for (let i = a.length - 1; i > 0; i--) { let j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
// ---- 行列の道具
function zerosMat(n, m) { let a = []; for (let i = 0; i < n; i++) a.push(new Array(m === undefined ? n : m).fill(0)); return a; }
function dotV(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }
function normV(a) { return Math.sqrt(dotV(a, a)); }
function matVec(a, v) { return a.map((r) => dotV(r, v)); }
function transposeM(a) { return a[0].map((_, j) => a.map((r) => r[j])); }
function solveLinear(a, b) {             // ガウスの消去法（部分ピボット）で a x = b。解けなければ null
  let n = b.length, m = a.map((r, i) => r.concat([b[i]]));
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    if (Math.abs(m[p][c]) < 1e-300) return null;
    [m[c], m[p]] = [m[p], m[c]];
    for (let r = c + 1; r < n; r++) { let f = m[r][c] / m[c][c]; if (f !== 0) for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k]; }
  }
  let x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) { let s = m[i][n]; for (let k = i + 1; k < n; k++) s -= m[i][k] * x[k]; x[i] = s / m[i][i]; }
  return x.every((v) => isFinite(v)) ? x : null;
}
// リッジ回帰 (ΦᵀΦ + λI) w = Φᵀ y。phi = 行がデータ、列が特徴
function ridgeSolve(phi, y, lam) {
  let p = phi[0].length, a = zerosMat(p), b = new Array(p).fill(0);
  for (let i = 0; i < phi.length; i++) { let f = phi[i]; for (let j = 0; j < p; j++) { b[j] += f[j] * y[i]; for (let k = j; k < p; k++) a[j][k] += f[j] * f[k]; } }
  for (let j = 0; j < p; j++) { a[j][j] += lam; for (let k = 0; k < j; k++) a[j][k] = a[k][j]; }
  return solveLinear(a, b) || new Array(p).fill(0);
}
// ---- グラフの道具：g = { x, y, w, h, x0, x1, y0, y1 }
function gX(g, v) { return g.x + clampv((v - g.x0) / (g.x1 - g.x0), -0.02, 1.02) * g.w; }
function gY(g, v) { return g.y + g.h - clampv((v - g.y0) / (g.y1 - g.y0), -0.02, 1.02) * g.h; }
function plotAxes(g, xl, yl, xt, yt) {
  stroke(...WIRE); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h);
  noStroke(); fill(...SUB); textSize(12); textAlign(CENTER, TOP);
  for (let v of xt) text(+v.toPrecision(3), gX(g, v), g.y + g.h + 4);
  textAlign(RIGHT, CENTER);
  for (let v of yt) text(+v.toPrecision(3), g.x - 5, gY(g, v));
  textAlign(LEFT, BASELINE); fill(...INK); textSize(13);
  text(xl, g.x + g.w - textWidth(xl), g.y + g.h + 30); text(yl, g.x, g.y - 8);
}
function polyline(pts) {                 // 点が 2 つ以上あるときだけ折れ線を描く（空の beginShape を作らない）
  if (pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape();
}
function plotXY(g, xs, ys, col, sw) {    // (xs[i], ys[i]) を折れ線で（有限の値だけ）
  let pts = []; for (let i = 0; i < xs.length; i++) if (isFinite(ys[i])) pts.push([gX(g, xs[i]), gY(g, ys[i])]);
  stroke(...col); strokeWeight(sw || 2); polyline(pts);
}
function legend(x, y, items) {           // items = [[色, 名前], …]
  textSize(13); textAlign(LEFT, CENTER);
  for (let [c, s] of items) { noStroke(); fill(...c); rect(x, y - 5, 16, 10); fill(...INK); text(s, x + 22, y); y += 20; }
  textAlign(LEFT, BASELINE);
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function relErr(a, b) { return Math.abs(a - b) / Math.max(1e-12, Math.abs(a) + Math.abs(b)); }
function noNaN(v) { return Array.isArray(v) || ArrayBuffer.isView(v) ? Array.from(v).every(noNaN) : !(typeof v === 'number' && !isFinite(v)); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(150, 230, 170) : color(255, 90, 110)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
