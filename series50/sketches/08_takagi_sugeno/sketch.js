// ============================================
// 08 高木-菅野型ファジィモデル
// 規則の後件が「1 次式」：もし x が Aᵢ なら y = pᵢ x + qᵢ。出力は所属度で重みをつけた平均
//   y = Σ μᵢ(x) (pᵢ x + qᵢ) ÷ Σ μᵢ(x)　→　少ない規則で曲線（sin など）を近似できる
// マウス = x を選ぶ / ←→ = 規則の数 / L = 後件の決め方（接線 ⇔ 最小二乗）/ 1〜3 = 近似する関数 / ↑↓ = MF の幅
// ============================================

let nRules = 5;                 // ★ 規則の数
let widthK = 0.55;              // ★ ガウス MF の幅（中心の間隔の何倍か）
let useLS = true;               // ★ true = 最小二乗で pᵢ, qᵢ を決める、false = 中心での接線
const TARGETS = [
  { name: 'sin x', f: (x) => Math.sin(x), df: (x) => Math.cos(x), lo: 0, hi: 2 * Math.PI },
  { name: 'x² / 4 − 1', f: (x) => (x * x) / 4 - 1, df: (x) => x / 2, lo: -3, hi: 3 },
  { name: 'tanh(3x)', f: (x) => Math.tanh(3 * x), df: (x) => 3 / Math.cosh(3 * x) ** 2, lo: -2, hi: 2 },
];
let tg = 0, tsModel, errs = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  selfTest();
  rebuild();
}

// 規則を作る：中心 cᵢ を等間隔に、ガウス MF、後件 (pᵢ, qᵢ)
function buildModel(T, n, ls, wk) {
  let d = (T.hi - T.lo) / (n - 1), mfs = [];
  for (let i = 0; i < n; i++) mfs.push({ type: 'gauss', p: [T.lo + i * d, wk * d] });
  let pq = ls ? fitLS(T, mfs) : mfs.map((mf) => { let c = mf.p[0], p = T.df(c); return [p, T.f(c) - p * c]; });
  return { mfs, pq };
}
function rebuild() {
  let T = TARGETS[tg];
  tsModel = buildModel(T, nRules, useLS, widthK);
  errs = [];
  for (let n = 2; n <= 12; n++) errs.push(errorOf(T, buildModel(T, n, useLS, widthK)));
}
// 高木-菅野の出力：重み付き平均（どの規則も発火しなければ null）
function tsk(mfs, pq, x) {
  let sw = 0, sy = 0;
  for (let i = 0; i < mfs.length; i++) { let w = evalMF(mfs[i], x); sw += w; sy += w * (pq[i][0] * x + pq[i][1]); }
  return sw > 1e-12 ? sy / sw : null;
}
function errorOf(T, m) {
  let s = 0, mx = 0, n = 400;
  for (let k = 0; k <= n; k++) { let x = T.lo + ((T.hi - T.lo) * k) / n, e = (tsk(m.mfs, m.pq, x) ?? 0) - T.f(x); s += e * e; mx = Math.max(mx, Math.abs(e)); }
  return { rms: Math.sqrt(s / (n + 1)), max: mx };
}
// 最小二乗：y ≈ Σ wᵢ(x)(pᵢ x + qᵢ) を 200 点で合わせる（正規方程式をガウスの消去法で）
function fitLS(T, mfs) {
  let n = mfs.length, m = 2 * n, A = [], b = [];
  for (let k = 0; k <= 200; k++) {
    let x = T.lo + ((T.hi - T.lo) * k) / 200, w = mfs.map((mf) => evalMF(mf, x)), sw = w.reduce((a, c) => a + c, 0) || 1, row = [];
    for (let i = 0; i < n; i++) row.push((w[i] / sw) * x, w[i] / sw);
    A.push(row); b.push(T.f(x));
  }
  let M = [], r = [];
  for (let i = 0; i < m; i++) {
    M.push([]); r.push(0);
    for (let j = 0; j < m; j++) { let s = i === j ? 1e-9 : 0; for (let k = 0; k < A.length; k++) s += A[k][i] * A[k][j]; M[i].push(s); }
    for (let k = 0; k < A.length; k++) r[i] += A[k][i] * b[k];
  }
  let th = solve(M, r), pq = [];
  for (let i = 0; i < n; i++) pq.push([th[2 * i], th[2 * i + 1]]);
  return pq;
}

function draw() {
  background(250, 18, 14);
  let T = TARGETS[tg], px = 50, py = 110, pw = width * 0.58, ph = height * 0.5;
  let X = (x) => px + ((x - T.lo) / (T.hi - T.lo)) * pw, Y = (y) => py + ph / 2 - (y / 1.6) * (ph / 2);
  let xm = clampv(T.lo + ((mouseX - px) / pw) * (T.hi - T.lo), T.lo, T.hi);

  fill(0, 0, 95); noStroke(); textSize(18);
  text('←→ 規則の数 ' + nRules + '　L：後件 = ' + (useLS ? '最小二乗' : '中心での接線') + '　1〜3：関数 = ' + T.name + '　↑↓ MF の幅 ×' + nf(widthK, 1, 2) + '　マウス：x', 20, 36);
  fill(0, 0, 70); textSize(15);
  text('細い線 = 規則ごとの 1 次式 pᵢx + qᵢ（濃さ = 今の x での重み）、白 = 本物の関数、オレンジ = 高木-菅野の出力', 20, 62);

  stroke(0, 0, 100, 20); strokeWeight(1); noFill(); rect(px, py, pw, ph); line(px, Y(0), px + pw, Y(0));
  // 規則ごとの 1 次式
  let w = tsModel.mfs.map((mf) => evalMF(mf, xm)), sw = w.reduce((a, c) => a + c, 0);
  tsModel.pq.forEach(([p, q], i) => {
    let c = tsModel.mfs[i].p[0], d = (T.hi - T.lo) / (nRules - 1);
    stroke(175, 60, 85, 25 + 75 * (sw > 0 ? w[i] / sw : 0)); strokeWeight(2);
    let x0 = Math.max(T.lo, c - d), x1 = Math.min(T.hi, c + d);
    line(X(x0), Y(clampv(p * x0 + q, -1.6, 1.6)), X(x1), Y(clampv(p * x1 + q, -1.6, 1.6)));
  });
  plotFn(X, Y, T, (x) => T.f(x), color(0, 0, 100, 70), 2);
  plotFn(X, Y, T, (x) => tsk(tsModel.mfs, tsModel.pq, x) ?? 0, color(20, 55, 100), 3.5);
  // MF（下の帯）
  let my = py + ph + 20, mh = height * 0.14;
  tsModel.mfs.forEach((mf, i) => plotFn(X, (v) => my + mh - v * mh, T, (x) => evalMF(mf, x), color(260, 30, 90, 70), 1.5));
  stroke(0, 0, 100); strokeWeight(1.5); line(X(xm), py, X(xm), my + mh);
  let yo = tsk(tsModel.mfs, tsModel.pq, xm);
  noStroke(); fill(20, 55, 100); circle(X(xm), Y(yo ?? 0), 12);
  fill(0, 0, 70); textSize(13); text('前件のメンバーシップ関数 μᵢ(x)（ガウス）', px, my + mh + 18);

  // 表：今の x での計算
  let tx = width * 0.64, ty = 110, rh = Math.min(26, (height * 0.5) / (nRules + 3));
  fill(0, 0, 95); textSize(17); text('x = ' + nf(xm, 1, 3) + ' での計算', tx, ty);
  textSize(13); fill(0, 0, 70);
  let cols = [0, 44, 110, 200, 310];
  ['規則', 'μᵢ', 'wᵢ = μᵢ/Σμ', 'yᵢ = pᵢx + qᵢ', 'wᵢ · yᵢ'].forEach((h, k) => text(h, tx + cols[k], ty + 26));
  let tot = 0;
  for (let i = 0; i < nRules; i++) {
    let yi = tsModel.pq[i][0] * xm + tsModel.pq[i][1], wb = sw > 0 ? w[i] / sw : 0, yy = ty + 26 + (i + 1) * rh;
    tot += wb * yi;
    fill(175, 60, 50, 60); rect(tx + cols[2], yy - rh + 8, wb * 60, rh - 8);
    fill(0, 0, 92);
    [String(i + 1), nf(w[i], 1, 3), nf(wb, 1, 3), nf(yi, 1, 3), nf(wb * yi, 1, 3)].forEach((s, k) => text(s, tx + cols[k], yy));
  }
  let ye = ty + 26 + (nRules + 1) * rh + 8;
  fill(20, 55, 100); textSize(18); text('出力 y = Σ wᵢ yᵢ = ' + nf(tot, 1, 4), tx, ye);
  fill(0, 0, 80); textSize(15); text('本物 f(x) = ' + nf(T.f(xm), 1, 4) + '　誤差 = ' + nf(tot - T.f(xm), 1, 4), tx, ye + 24);

  // 規則の数と誤差のグラフ
  let gx = tx, gy = ye + 60, gw = width - tx - 40, gh = height - gy - 70, emax = Math.max(...errs.map((e) => e.max), 1e-6);
  fill(0, 0, 70); textSize(13); text('規則の数 2〜12 と最大誤差（対数目盛り）　今：RMS ' + nf(errorOf(T, tsModel).rms, 1, 4) + '、最大 ' + nf(errorOf(T, tsModel).max, 1, 4), gx, gy - 8);
  errs.forEach((e, k) => {
    let bw = gw / errs.length, bh = clampv((Math.log10(Math.max(e.max, 1e-5)) + 5) / (Math.log10(emax) + 5), 0, 1) * gh;
    fill(k + 2 === nRules ? color(20, 55, 100) : color(260, 30, 70)); rect(gx + k * bw + 2, gy + gh - bh, bw - 4, bh);
    fill(0, 0, 70); text(k + 2, gx + k * bw + bw / 2 - 6, gy + gh + 16);
  });

  fill(selfTestResults.every((r) => r.ok) ? color(160, 50, 90) : color(0, 80, 100)); textSize(14);
  text(selfTestLine(), 20, height - 20);
}
function plotFn(X, Y, T, f, col, sw) {
  noFill(); stroke(col); strokeWeight(sw); beginShape();
  for (let k = 0; k <= 200; k++) { let x = T.lo + ((T.hi - T.lo) * k) / 200; vertex(X(x), Y(clampv(f(x), -1.6, 1.6))); }
  endShape();
}

function keyPressed() {
  if (key === LEFT_ARROW) nRules = Math.max(2, nRules - 1);
  if (key === RIGHT_ARROW) nRules = Math.min(12, nRules + 1);
  if (key === UP_ARROW) widthK = Math.min(1.5, widthK + 0.05);
  if (key === DOWN_ARROW) widthK = Math.max(0.2, widthK - 0.05);
  if (key === 'l' || key === 'L') useLS = !useLS;
  if (key === '1' || key === '2' || key === '3') tg = Number(key) - 1;
  rebuild();
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let m2 = [{ type: 'tri', p: [-2, 0, 2] }, { type: 'tri', p: [0, 2, 4] }], pq2 = [[1, 1], [3, 0]];
  check('2 規則：x = 1.5 で μ = 0.25, 0.75、y₁ = x + 1 = 2.5、y₂ = 3x = 4.5 → 0.25·2.5 + 0.75·4.5 = 4', near(tsk(m2, pq2, 1.5), 4, 1e-12));
  check('後件が全部 y = 2x + 1 なら、出力もちょうど 2x + 1（重みの和で割るから）', [0.3, 1.1, 1.9].every((x) => near(tsk(m2, [[2, 1], [2, 1]], x), 2 * x + 1, 1e-12)));
  check('どの規則も発火しない x（範囲の外）→ 0 で割らずに「値なし」', tsk(m2, pq2, 9) === null);
  let lin = { f: (x) => 3 - 0.5 * x, df: () => -0.5, lo: 0, hi: 4 };
  check('最小二乗：本物が 1 次式なら誤差 0（< 1e-6）', errorOf(lin, buildModel(lin, 4, true, 0.55)).max < 1e-6);
  let S = TARGETS[0], e3 = errorOf(S, buildModel(S, 3, false, 0.55)).max, e8 = errorOf(S, buildModel(S, 8, false, 0.55)).max;
  check('sin x・接線の後件：規則 3 個 → 8 個で最大誤差が減る（' + e3.toFixed(3) + ' → ' + e8.toFixed(3) + '）', e8 < e3);
  check('sin x・規則 5 個：最小二乗のほうが接線より誤差が小さい', errorOf(S, buildModel(S, 5, true, 0.55)).max < errorOf(S, buildModel(S, 5, false, 0.55)).max);
  check('sin x を 8 規則・最小二乗で：最大誤差 < 0.01', errorOf(S, buildModel(S, 8, true, 0.55)).max < 0.01);
  let tg0 = buildModel(S, 5, false, 0.55);
  check('接線の後件：規則 i の 1 次式は中心 cᵢ で sin と同じ値・同じ傾き', tg0.mfs.every((mf, i) => { let c = mf.p[0]; return near(tg0.pq[i][0] * c + tg0.pq[i][1], Math.sin(c), 1e-12) && near(tg0.pq[i][0], Math.cos(c), 1e-12); }));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 規則 2 個で sin x はどれくらい近似できる？ 何個で誤差 0.01 を切る？
// 2. L で「接線」にすると、規則が少ないときの誤差はどうなる？ 最小二乗とくらべる
// 3. ↑↓ で MF の幅を変えると、出力がギザギザになったり、なまったりする
// 4. 2 の x²/4 − 1 は、規則 2 個でも意外とよく合う。なぜ？
// 5. マウスで x を動かして、表の wᵢ · yᵢ を全部足すと出力になることを確かめる
// 6. 最小二乗の 1 次式（細い線）は、接線とはかなりちがう向きになる。誤差は小さいが「規則の意味」は読みにくい


// ==================================================
// ここから下は「ファジィの道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- メンバーシップ関数（所属度 μ を 0〜1 で返す）
function trimf(x, a, b, c) {            // 三角：a で 0、b で 1、c で 0
  if (x < a || x > c) return 0;
  if (x === b) return 1;
  if (x < b) return b > a ? (x - a) / (b - a) : 1;
  return c > b ? (c - x) / (c - b) : 1;
}
function gaussmf(x, c, s) { return Math.exp(-((x - c) * (x - c)) / (2 * s * s)); }
// mf = { type: 'tri', p: [a, b, c] } のような形
function evalMF(mf, x) {
  let p = mf.p;
  if (mf.type === 'tri') return trimf(x, p[0], p[1], p[2]);
  if (mf.type === 'gauss') return gaussmf(x, p[0], p[1]);
  return 0;
}
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
// 連立 1 次方程式 M θ = r（部分ピボットつきガウスの消去法）
function solve(M, r) {
  let n = r.length, A = M.map((row, i) => row.concat([r[i]]));
  for (let c = 0; c < n; c++) {
    let p = c; for (let i = c + 1; i < n; i++) if (Math.abs(A[i][c]) > Math.abs(A[p][c])) p = i;
    [A[c], A[p]] = [A[p], A[c]];
    if (Math.abs(A[c][c]) < 1e-14) continue;
    for (let i = c + 1; i < n; i++) { let f = A[i][c] / A[c][c]; for (let j = c; j <= n; j++) A[i][j] -= f * A[c][j]; }
  }
  let x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) { let s = A[i][n]; for (let j = i + 1; j < n; j++) s -= A[i][j] * x[j]; x[i] = Math.abs(A[i][i]) < 1e-14 ? 0 : s / A[i][i]; }
  return x;
}

// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
