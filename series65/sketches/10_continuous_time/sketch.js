// ============================================
// 10 連続時間マルコフ連鎖 ─ 1 日ごとではなく、好きな時刻に状態が変わる。例：機械の 稼働・点検・故障・修理
// 状態 i にいる時間は指数分布（平均 1 / q_i）。時間がきたら、率 q_ij に比例する確率で次の状態 j へ。
// 率をまとめた生成行列 Q（対角 = −q_i、各行の合計 = 0）。時刻 t の分布 p(t) = p(0) e^{Qt} は、
// 一様化：P~ = I + Q/Λ を「ポアソン回数」だけかける式で正確に計算できる。定常分布は π Q = 0（待ち行列の出生死滅過程は series29/05）
// ↑↓ 故障の率 / ← → 修理の率 / R 全部を稼働から / スペース 一時停止 / F 速さ
// ============================================

const NAMES = ['稼働', '点検', '故障', '修理'];
let failRate = 0.2, repairRate = 0.5;    // ★ 稼働 → 故障 の率、修理 → 稼働 の率（1 日あたり）
const INSPECT = 0.3, BACK = 2.0, START_FIX = 1.0;   // ★ 稼働 → 点検、点検 → 稼働、故障 → 修理 の率
const NM = 400, TMAX = 30;               // ★ 機械の台数とグラフの長さ（日）
let genQ, piStat, curves = [], fleet = [], simT = 0, paused = false, fast = false, fleetLog = [], holds = [], gantt = [], nodes = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  seedRng(10); rebuild();
}
function makeQ(f, r) {                   // 生成行列：非対角 = 率、対角 = −（行のほかの合計）
  let q = zerosMat(4);
  q[0][1] = INSPECT; q[0][2] = f; q[1][0] = BACK; q[2][3] = START_FIX; q[3][0] = r;
  for (let i = 0; i < 4; i++) q[i][i] = -(sumOf(q[i]) - q[i][i]);
  return q;
}
function unifRate(q) { let m = 0; for (let i = 0; i < q.length; i++) m = Math.max(m, -q[i][i]); return m || 1; }
// ★ 一様化：p(t) = Σ_n e^{−Λt} (Λt)^n / n! · p0 P~^n（ポアソンの重みの合計が 1 − 10⁻¹⁵ になるまで）
function uniformDist(p0, q, t) {
  let lam = unifRate(q), pt = eyeMat(q.length).map((r, i) => r.map((v, j) => v + q[i][j] / lam)), w = Math.exp(-lam * t), v = p0.slice(), out = p0.map((x) => x * w), acc = w;
  for (let n = 1; n < 2000 && acc < 1 - 1e-15; n++) { v = vecMat(v, pt); w *= (lam * t) / n; acc += w; for (let i = 0; i < out.length; i++) out[i] += w * v[i]; }
  return out;
}
function stationaryCtmc(q) { let lam = unifRate(q); return stationaryExact(eyeMat(q.length).map((r, i) => r.map((v, j) => v + q[i][j] / lam))); }
function holdTime(q, s) { return -Math.log(1 - rnd()) / -q[s][s]; }          // 指数分布の待ち時間
function jumpFrom(q, s) { return sampleFrom(q[s].map((v, j) => (j === s ? 0 : v))); }   // 率に比例して次へ
function rebuild() {
  genQ = makeQ(failRate, repairRate); piStat = stationaryCtmc(genQ);
  curves = []; for (let k = 0; k <= 200; k++) curves.push(uniformDist([1, 0, 0, 0], genQ, (k / 200) * TMAX));
  restart();
}
function restart() {
  simT = 0; fleetLog = []; holds = []; gantt = [{ s: 0, t: 0 }];
  fleet = []; for (let m = 0; m < NM; m++) fleet.push({ s: 0, enter: 0, next: holdTime(genQ, 0), ox: randn() * 0.35, oy: randn() * 0.35 });
}
function advance(dt) {                    // 全部の機械を時刻 simT + dt まで進める
  let t1 = simT + dt;
  for (let m = 0; m < fleet.length; m++) {
    let f = fleet[m];
    while (f.next <= t1) {
      if (f.s === 0 && holds.length < 4000) holds.push(f.next - f.enter);
      f.s = jumpFrom(genQ, f.s); f.enter = f.next; f.next += holdTime(genQ, f.s);
      if (m === 0 && f.enter <= TMAX) gantt.push({ s: f.s, t: f.enter });
    }
  }
  simT = t1;
  if (simT <= TMAX) { let c = [0, 0, 0, 0]; for (let f of fleet) c[f.s]++; fleetLog.push({ t: simT, p: c.map((v) => v / NM) }); }
}

function draw() {
  background(...BG);
  if (!paused) advance((fast ? 0.25 : 0.05));
  hudTitle('連続時間マルコフ連鎖：' + NM + ' 台の機械　時刻 ' + fmtN(simT, 1) + ' 日', '↑↓ 故障の率 ' + fmtN(failRate, 2) + '　← → 修理の率 ' + fmtN(repairRate, 2) + '　R 稼働からやり直し　スペース 一時停止　F 速さ（' + (fast ? '速い' : 'ふつう') + '）');
  // ---- 遷移図（太さ = 率）と機械の点
  let gcx = width * 0.2, gcy = height * 0.42, rad = Math.min(width * 0.12, height * 0.17), mx = 0;
  nodes = [[gcx, gcy - rad], [gcx + rad, gcy], [gcx, gcy + rad], [gcx - rad, gcy]];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if (i !== j) mx = Math.max(mx, genQ[i][j]);
  let wide = genQ.map((r, i) => r.map((v, j) => (i === j ? 0 : v / mx)));
  let hits = drawChainGraph(nodes, wide, 40, STATE_COLS, { names: NAMES, labels: false, nameSize: 14 });
  noStroke(); fill(...CREAM); textSize(13); textAlign(CENTER, CENTER);
  for (let h of hits) text(fmtN(genQ[h.i][h.j], 2), h.mx, h.my - 12);
  for (let f of fleet) {                 // 機械 1 台 = 点 1 つ。いまの状態の円の外側に集まる
    let c = STATE_COLS[f.s], ux = nodes[f.s][0] - gcx, uy = nodes[f.s][1] - gcy, L = Math.hypot(ux, uy) || 1;
    fill(c[0], c[1], c[2], 200); circle(nodes[f.s][0] + (ux / L) * 68 + f.ox * 26, nodes[f.s][1] + (uy / L) * 66 + f.oy * 20, 4);
  }
  // 生成行列
  let qx = 40, qy = gcy + rad + 128;
  fill(...CREAM); textSize(14); textAlign(LEFT, BASELINE); text('生成行列 Q（行の合計 = 0）', qx, qy - 22);
  drawMatrix(genQ, qx + 40, qy, 62, 24, NAMES, { ts: 12, hi: 2.3 });
  fill(...SUB); textSize(13); textAlign(LEFT, BASELINE);
  text('定常分布 π（πQ = 0）= ' + piStat.map((v, i) => NAMES[i] + ' ' + fmtN(v, 3)).join('　'), qx, qy + 4 * 24 + 22);
  text('稼働している割合 = ' + Math.round(piStat[0] * 100) + '%', qx, qy + 4 * 24 + 42);

  // ---- 時刻 t の分布：一様化の計算（線）と 400 台の割合（点）
  let g = { x: width * 0.47, y: 110, w: width * 0.49, h: height * 0.36, x0: 0, x1: TMAX, y0: 0, y1: 1 };
  plotAxes(g, '時刻 t（日）', '確率 p_i(t)　線 = 一様化の計算、点 = ' + NM + ' 台の割合', [0, 10, 20, 30], [0, 0.5, 1]);
  for (let i = 0; i < 4; i++) {
    stroke(...STATE_COLS[i]); strokeWeight(2); polyline(curves.map((p, k) => [gX(g, (k / 200) * TMAX), gY(g, p[i])]));
    stroke(...STATE_COLS[i], 90); strokeWeight(1); line(g.x, gY(g, piStat[i]), g.x + g.w, gY(g, piStat[i]));
    noStroke(); fill(...STATE_COLS[i]); for (let k = 0; k < fleetLog.length; k += 4) circle(gX(g, fleetLog[k].t), gY(g, fleetLog[k].p[i]), 4);
  }
  legend(g.x + g.w - 70, g.y + 14, NAMES.map((n, i) => [STATE_COLS[i], n]));
  // ---- 1 台めの機械の記録（帯）
  let by = g.y + g.h + 56; noStroke(); fill(...CREAM); textSize(13); textAlign(LEFT, BASELINE); text('1 台めの機械の記録（色 = 状態、長さ = とどまった時間）', g.x, by - 6);
  for (let k = 0; k < gantt.length; k++) {
    let t0 = gantt[k].t, t1 = Math.min(TMAX, k + 1 < gantt.length ? gantt[k + 1].t : simT); if (t1 <= t0) continue;
    fill(...STATE_COLS[gantt[k].s]); rect(gX(g, t0), by, gX(g, t1) - gX(g, t0), 16);
  }
  // ---- 稼働にとどまった時間のヒストグラムと指数分布
  let hg = { x: g.x, y: by + 60, w: g.w, h: height - by - 130, x0: 0, x1: 8, y0: 0, y1: -genQ[0][0] * 1.1 };
  plotAxes(hg, '稼働が続いた時間（日）', 'ヒストグラム（' + holds.length + ' 回）と指数分布 q e^(−qt)、平均 1/q = ' + fmtN(-1 / genQ[0][0], 2) + ' 日', [0, 2, 4, 6, 8], []);
  let nb = 32, bins = new Array(nb).fill(0); for (let h of holds) { let b = Math.floor((h / 8) * nb); if (b < nb) bins[b]++; }
  noStroke(); fill(...STATE_COLS[0], 160);
  for (let b = 0; b < nb; b++) { let d = holds.length ? bins[b] / holds.length / (8 / nb) : 0; rect(gX(hg, (b * 8) / nb), gY(hg, d), hg.w / nb - 1, hg.y + hg.h - gY(hg, d)); }
  let q0 = -genQ[0][0], pts = []; for (let k = 0; k <= 80; k++) { let t = (k / 80) * 8; pts.push([gX(hg, t), gY(hg, q0 * Math.exp(-q0 * t))]); }
  stroke(...CREAM); strokeWeight(2); polyline(pts);
  drawSelfTest(width - 180, height - 14);
}

function keyPressed() {
  if (key === ' ') paused = !paused;
  if (key === 'f' || key === 'F') fast = !fast;
  if (key === 'r' || key === 'R') restart();
  if (key === UP_ARROW) { failRate = Math.min(2, Math.round((failRate + 0.05) * 100) / 100); rebuild(); }
  if (key === DOWN_ARROW) { failRate = Math.max(0.05, Math.round((failRate - 0.05) * 100) / 100); rebuild(); }
  if (key === RIGHT_ARROW) { repairRate = Math.min(3, Math.round((repairRate + 0.1) * 10) / 10); rebuild(); }
  if (key === LEFT_ARROW) { repairRate = Math.max(0.1, Math.round((repairRate - 0.1) * 10) / 10); rebuild(); }
  return false;
}

// やってみよう
// 1. 修理の率を 2 倍にすると、稼働している割合 π_稼働 はどれだけ上がる？
// 2. 点の割合（シミュレーション）は線（計算）にどのくらい近い？ NM を 4000 にすると？
// 3. ヒストグラムが指数分布になるのは「いままで何日動いたかに関係なく、壊れやすさは同じ」だから（無記憶性）
// 4. 状態を 1 つ増やして（例：部品待ち）、生成行列の行の合計が 0 になるように率を書こう

// ---- 自己テスト
function expmTaylor(a) {                 // 行列の指数関数：2^s で割ってテイラー展開 30 項、s 回 2 乗する
  let n = a.length, nm = 0; for (let r of a) nm = Math.max(nm, sumOf(r.map(Math.abs)));
  let s = Math.max(0, Math.ceil(Math.log2(nm / 0.25))), b = a.map((r) => r.map((v) => v / Math.pow(2, s))), term = eyeMat(n), out = eyeMat(n);
  for (let k = 1; k <= 30; k++) { term = matMul(term, b).map((r) => r.map((v) => v / k)); out = out.map((r, i) => r.map((v, j) => v + term[i][j])); }
  for (let k = 0; k < s; k++) out = matMul(out, out);
  return out;
}
function selfTest() {
  selfTestResults = [];
  seedRng(100);
  let q = makeQ(0.2, 0.5);
  check('生成行列：各行の合計 = 0、対角の外は ≥ 0', rowSumErr(q, 0) < 1e-12 && q.every((r, i) => r.every((v, j) => i === j || v >= 0)));
  let worst = 0; for (let t of [0.5, 3, 10]) { let e = expmTaylor(q.map((r) => r.map((v) => v * t))); for (let i = 0; i < 4; i++) { let p0 = [0, 0, 0, 0]; p0[i] = 1; worst = Math.max(worst, maxAbsDiff(uniformDist(p0, q, t), e[i])); } }
  check('一様化 = 行列の指数関数 e^{Qt}（テイラー + 2 乗、t = 0.5, 3, 10）ずれ ' + worst.toExponential(1), worst < 1e-9);
  let pi = stationaryCtmc(q), piQ = vecMat(pi, q);
  check('定常分布：π Q = 0、Σ π = 1', maxAbsDiff(piQ, [0, 0, 0, 0]) < 1e-12 && near(sumOf(pi), 1, 1e-12));
  check('p(200) → π（どこから始めても）', maxAbsDiff(uniformDist([0, 0, 1, 0], q, 200), pi) < 1e-9);
  // 飛び移りだけの連鎖 J_ij = q_ij / q_i の定常分布 ν と、平均の滞在時間 1/q_i から：π_i ∝ ν_i / q_i
  let jm = q.map((r, i) => r.map((v, j) => (i === j ? 0 : v / -q[i][i]))), nu = stationaryExact(jm), w = nu.map((v, i) => v / -q[i][i]), sw = sumOf(w);
  check('π_i ∝ ν_i × 平均の滞在時間（飛び移りの連鎖から）', maxAbsDiff(w.map((v) => v / sw), pi) < 1e-12);
  let s = 0, t = 0, occ = [0, 0, 0, 0], hs = [], tEnd = 100000;
  while (t < tEnd) { let h = holdTime(q, s); occ[s] += Math.min(h, tEnd - t); if (s === 0) hs.push(h); t += h; s = jumpFrom(q, s); }
  check('1 台を 10 万日動かした時間の割合 ≈ π（ずれ < 0.01）', maxAbsDiff(occ.map((v) => v / tEnd), pi) < 0.01);
  check('稼働にとどまる時間の平均 ≈ 1/q_0 = ' + fmtN(1 / 0.5, 2) + ' 日（ずれ < 3%）', Math.abs(meanOf(hs) * 0.5 - 1) < 0.03);
  let cnt = [0, 0, 0, 0], nF = 4000;
  for (let m = 0; m < nF; m++) { let st = 0, tt = holdTime(q, 0); while (tt <= 2) { st = jumpFrom(q, st); tt += holdTime(q, st); } cnt[st]++; }
  check('4000 台の t = 2 の割合 ≈ 一様化の p(2)（ずれ < 0.03）', maxAbsDiff(cnt.map((v) => v / nF), uniformDist([1, 0, 0, 0], q, 2)) < 0.03);
  reportSelfTest();
}

// ==================================================
// ここから下は「マルコフ連鎖の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 色と小さな道具
const BG = [32, 28, 26];                // 背景（あたたかい炭色）
const CREAM = [246, 236, 214], DICE = [236, 96, 58], TEAL = [44, 178, 166], MUSTARD = [236, 190, 82], PLUM = [190, 130, 200], SUB = [190, 178, 160];
const STATE_COLS = [[236, 96, 58], [44, 178, 166], [236, 190, 82], [190, 130, 200], [120, 190, 240], [150, 210, 110], [240, 140, 170], [200, 170, 130]];
function clampv(v, a, b) { return v < a ? a : v > b ? b : v !== v ? a : v; }     // NaN なら a に戻す
function sumOf(a) { let s = 0; for (let v of a) s += v; return s; }
function meanOf(a) { return a.length ? sumOf(a) / a.length : 0; }
function sampleFrom(p) { let u = rnd() * sumOf(p), c = 0; for (let i = 0; i < p.length; i++) { c += p[i]; if (u < c) return i; } return p.length - 1; }   // 確率 p[i] で i を返す
function fmtN(v, d) { if (typeof v !== 'number' || v !== v) return '?'; if (!isFinite(v)) return '∞'; let s = v.toFixed(d === undefined ? 2 : d); return /^-0\.?0*$/.test(s) ? s.slice(1) : s; }
function hudTitle(t, sub) {            // 左上の見出しと操作の説明
  noStroke(); fill(...CREAM); textSize(22); textAlign(LEFT, BASELINE); text(t, 40, 42);
  fill(...SUB); textSize(15); text(sub, 40, 68);
}
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
// ---- 行列の道具（行列 = 配列の配列。遷移行列 transP[i][j] = i の次に j へ行く確率、行の和 = 1）
function zerosMat(n, m) { let a = []; for (let i = 0; i < n; i++) a.push(new Array(m === undefined ? n : m).fill(0)); return a; }
function eyeMat(n) { let a = zerosMat(n); for (let i = 0; i < n; i++) a[i][i] = 1; return a; }
function copyMat(a) { return a.map((r) => r.slice()); }
function matMul(a, b) {                // 行列の積 (a b)[i][j] = Σ_k a[i][k] b[k][j]
  let n = a.length, m = b[0].length, kk = b.length, c = zerosMat(n, m);
  for (let i = 0; i < n; i++) for (let k = 0; k < kk; k++) { let v = a[i][k]; if (v !== 0) for (let j = 0; j < m; j++) c[i][j] += v * b[k][j]; }
  return c;
}
function vecMat(v, a) {                // 横ベクトル × 行列：次の時刻の分布 = いまの分布 × P
  let out = new Array(a[0].length).fill(0);
  for (let i = 0; i < v.length; i++) if (v[i] !== 0) for (let j = 0; j < out.length; j++) out[j] += v[i] * a[i][j];
  return out;
}
function matPow(a, k) { let r = eyeMat(a.length); for (let t = 0; t < k; t++) r = matMul(r, a); return r; }   // P^k（k 回かけるだけ）
function maxAbsDiff(a, b) {            // 2 つの行列（またはベクトル）のいちばん大きなずれ
  let d = 0;
  for (let i = 0; i < a.length; i++) { if (Array.isArray(a[i])) d = Math.max(d, maxAbsDiff(a[i], b[i])); else d = Math.max(d, Math.abs(a[i] - b[i])); }
  return d;
}
function rowSumErr(a, target) { let d = 0; for (let r of a) d = Math.max(d, Math.abs(sumOf(r) - (target === undefined ? 1 : target))); return d; }
function fixRows(a) {                  // 行の和を 1 に。全部 0 の行は「その場にとどまる」にする（NaN を出さない）
  return a.map((r, i) => { let s = sumOf(r); if (!(s > 1e-12)) { let z = r.map(() => 0); z[i] = 1; return z; } return r.map((v) => v / s); });
}
function solveLinear(a, b) {           // ガウスの消去法（部分ピボット）で a x = b。解けなければ null
  let n = a.length, m = a.map((r, i) => r.concat([b[i]]));
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    if (Math.abs(m[p][c]) < 1e-13) return null;
    [m[c], m[p]] = [m[p], m[c]];
    for (let r = 0; r < n; r++) { if (r === c) continue; let f = m[r][c] / m[c][c]; if (f !== 0) for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k]; }
  }
  return m.map((r, i) => r[n] / r[i]);
}
function matInv(a) {                   // 逆行列（ガウス-ジョルダン）。逆がなければ null
  let n = a.length, cols = [];
  for (let j = 0; j < n; j++) { let e = new Array(n).fill(0); e[j] = 1; let x = solveLinear(a, e); if (!x) return null; cols.push(x); }
  return a.map((_, i) => cols.map((c) => c[i]));
}
// 定常分布：π P = π と Σ π = 1 を連立方程式として解く（(P^T − I) π = 0 の最後の式を Σ π = 1 に置きかえる）
function stationaryExact(a) {
  let n = a.length, m = zerosMat(n), b = new Array(n).fill(0);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) m[i][j] = a[j][i] - (i === j ? 1 : 0);
  for (let j = 0; j < n; j++) m[n - 1][j] = 1; b[n - 1] = 1;
  return solveLinear(m, b);
}
function stationaryPower(a, tol, maxIt, start) {   // べき乗法：π ← π P を変化が tol 未満になるまで
  let n = a.length, v = start ? start.slice() : new Array(n).fill(1 / n), its = 0, d = Infinity;
  while (d > (tol || 1e-13) && its < (maxIt || 100000)) { let w = vecMat(v, a); d = maxAbsDiff(w, v); v = w; its++; }
  return { pi: v, its };
}
function tvDist(p, q) { let s = 0; for (let i = 0; i < p.length; i++) s += Math.abs(p[i] - q[i]); return s / 2; }   // 全変動距離
function entropyRate(a, pi) {          // エントロピー率 H = −Σ_i π_i Σ_j P_ij log₂ P_ij（1 歩あたりの情報量、ビット）
  let h = 0;
  for (let i = 0; i < a.length; i++) for (let v of a[i]) if (v > 0) h -= pi[i] * v * Math.log2(v);
  return h;
}
// ---- 遷移図を描く道具：矢印の太さ = 確率
function bezPts(ax, ay, bx, by, bend, r) {          // 少しふくらんだ曲線の点（両はしの円 r の中は除く）
  let mx = (ax + bx) / 2, my = (ay + by) / 2, dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
  let cx = mx - (dy / L) * bend * L, cy = my + (dx / L) * bend * L, pts = [];
  for (let k = 0; k <= 30; k++) {
    let t = k / 30, x = (1 - t) * (1 - t) * ax + 2 * t * (1 - t) * cx + t * t * bx, y = (1 - t) * (1 - t) * ay + 2 * t * (1 - t) * cy + t * t * by;
    if (Math.hypot(x - ax, y - ay) > r + 2 && Math.hypot(x - bx, y - by) > r + 6) pts.push([x, y]);
  }
  return pts;
}
function arrowHeadAt(pts, sz) {       // 折れ線の最後に三角の矢じり
  if (pts.length < 2) return;
  let [x1, y1] = pts[pts.length - 2], [x2, y2] = pts[pts.length - 1], L = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / L, uy = (y2 - y1) / L;
  triangle(x2 + ux * sz, y2 + uy * sz, x2 - uy * sz * 0.6, y2 + ux * sz * 0.6, x2 + uy * sz * 0.6, y2 - ux * sz * 0.6);
}
// nodes = [[x, y], …]、a = 遷移行列。戻り値：矢印ごとの { i, j, mx, my }（ラベルやクリック判定用）
function drawChainGraph(nodes, a, r, cols, opts) {
  opts = opts || {};
  let cx = meanOf(nodes.map((p) => p[0])), cy = meanOf(nodes.map((p) => p[1])), hits = [];
  for (let i = 0; i < nodes.length; i++) for (let j = 0; j < nodes.length; j++) {
    let p = a[i][j]; if (!(p > 1e-9)) continue;
    let col = cols[i % cols.length], w = 1 + 11 * p, pts;
    if (i === j) {                     // 自分に戻る矢印：外側に小さな輪
      let ox = nodes[i][0] - cx, oy = nodes[i][1] - cy, L = Math.hypot(ox, oy) || 1, ux = ox / L, uy = L > 1 ? oy / L : -1;
      if (L <= 1) ux = 0;
      let lx = nodes[i][0] + ux * r * 1.55, ly = nodes[i][1] + uy * r * 1.55, rr = r * 0.62, base = Math.atan2(-uy, -ux);
      pts = []; for (let k = 0; k <= 32; k++) { let t = base + 0.9 + (k / 32) * (2 * Math.PI - 1.8); pts.push([lx + rr * Math.cos(t), ly + rr * Math.sin(t)]); }
      hits.push({ i, j, mx: lx + ux * rr, my: ly + uy * rr });
    } else {
      pts = bezPts(nodes[i][0], nodes[i][1], nodes[j][0], nodes[j][1], 0.14, r);
      if (pts.length) hits.push({ i, j, mx: pts[pts.length >> 1][0], my: pts[pts.length >> 1][1] });
    }
    stroke(col[0], col[1], col[2], opts.alphaEdge || 210); strokeWeight(w); noFill(); polyline(pts);
    noStroke(); fill(col[0], col[1], col[2], opts.alphaEdge || 230); arrowHeadAt(pts, 8 + w * 0.8);
    if (opts.labels !== false && pts.length) {
      let h = hits[hits.length - 1]; fill(...CREAM); textSize(13); textAlign(CENTER, CENTER); text(fmtN(p, 2), h.mx, h.my - 12);
    }
  }
  for (let i = 0; i < nodes.length; i++) {
    let col = cols[i % cols.length]; stroke(...CREAM); strokeWeight(opts.hl === i ? 4 : 1.5); fill(col[0] * 0.55, col[1] * 0.55, col[2] * 0.55);
    circle(nodes[i][0], nodes[i][1], 2 * r);
    noStroke(); fill(...CREAM); textAlign(CENTER, CENTER); textSize(opts.nameSize || 18); text(opts.names ? opts.names[i] : String(i), nodes[i][0], nodes[i][1]);
  }
  return hits;
}
function drawMatrix(a, x, y, cw, ch, names, opts) {   // 行列を色つきの表で（濃い = 大きい）
  opts = opts || {}; let d = opts.digits === undefined ? 2 : opts.digits, n = a.length, m = a[0].length, hi = opts.hi || 1;
  textAlign(CENTER, CENTER); textSize(opts.ts || 13);
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
    let v = a[i][j], t = clampv(Math.abs(v) / hi, 0, 1); noStroke();
    fill(48 + t * (TEAL[0] - 48), 42 + t * (TEAL[1] - 42), 40 + t * (TEAL[2] - 40)); rect(x + j * cw, y + i * ch, cw - 2, ch - 2, 3);
    fill(...CREAM); text(fmtN(v, d), x + j * cw + cw / 2, y + i * ch + ch / 2);
  }
  if (names) { fill(...SUB); for (let i = 0; i < n; i++) { textAlign(RIGHT, CENTER); text(names[i], x - 6, y + i * ch + ch / 2); } for (let j = 0; j < m; j++) { textAlign(CENTER, BOTTOM); text(names[j], x + j * cw + cw / 2, y - 3); } }
}
// ---- グラフの道具：g = { x, y, w, h, x0, x1, y0, y1 }
function gX(g, v) { return g.x + clampv((v - g.x0) / (g.x1 - g.x0), -0.02, 1.02) * g.w; }
function gY(g, v) { return g.y + g.h - clampv((v - g.y0) / (g.y1 - g.y0), -0.02, 1.02) * g.h; }
function plotAxes(g, xl, yl, xt, yt) {
  stroke(84, 76, 70); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h);
  noStroke(); fill(...SUB); textSize(12); textAlign(CENTER, TOP);
  for (let v of xt) text(+v.toPrecision(3), gX(g, v), g.y + g.h + 4);
  textAlign(RIGHT, CENTER);
  for (let v of yt) text(+v.toPrecision(3), g.x - 5, gY(g, v));
  textAlign(LEFT, BASELINE); fill(...CREAM); textSize(13);
  text(xl, g.x + g.w - textWidth(xl), g.y + g.h + 30); text(yl, g.x, g.y - 8);
}
function polyline(pts) {               // 点が 2 つ以上あるときだけ折れ線を描く（空の beginShape を作らない）
  if (pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape();
}
function drawCurve(g, arr, col, sw, xOff) {   // arr[i] を x = i (+ xOff) に。長いときは間引いて 600 点まで
  let n = arr.length, stride = Math.max(1, Math.ceil(n / 600)), pts = [];
  for (let i = 0; i < n; i += stride) pts.push([gX(g, i + (xOff || 0)), gY(g, arr[i])]);
  if (n > 1 && (n - 1) % stride) pts.push([gX(g, n - 1 + (xOff || 0)), gY(g, arr[n - 1])]);
  stroke(...col); strokeWeight(sw || 2); polyline(pts);
}
function legend(x, y, items) {         // items = [[色, 名前], …]
  textSize(13); textAlign(LEFT, CENTER);
  for (let [c, s] of items) { noStroke(); fill(...c); rect(x, y - 5, 16, 10); fill(...CREAM); text(s, x + 22, y); y += 20; }
}
function drawBars(x, y, w, h, vals, cols, top, names) {   // 棒グラフ（top = 縦軸の上限）
  let n = vals.length, bw = w / n;
  stroke(84, 76, 70); strokeWeight(1); line(x, y + h, x + w, y + h); noStroke();
  for (let i = 0; i < n; i++) {
    let c = cols[i % cols.length], hh = clampv(vals[i] / (top || 1), 0, 1) * h; fill(...c); rect(x + i * bw + bw * 0.12, y + h - hh, bw * 0.76, hh, 3);
    if (names) { fill(...SUB); textSize(12); textAlign(CENTER, TOP); text(names[i], x + i * bw + bw / 2, y + h + 4); }
  }
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) || ArrayBuffer.isView(v) ? Array.from(v).every(noNaN) : !(typeof v === 'number' && !isFinite(v)); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(120, 220, 190) : color(255, 90, 90)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
