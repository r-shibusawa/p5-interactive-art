// ============================================
// 05 確率的勾配法（SGD）と適応的手法（RMSProp・Adam）
// データ N 点の損失の平均 f(w, b) = (1/N) Σ fᵢ(w, b) を、全部の勾配の代わりに B 個だけ選んだ勾配（ミニバッチ）で下る
//   1 回は安いがゆらぐ。学習率 η が一定だと、f − f* はある高さ（雑音の床）で止まる。η を小さくしていけば床も下がる
// 1 = 線形回帰 / 2 = ロジスティック回帰 / ↑↓ = 学習率の倍率 / ←→ = バッチの大きさ B / N = 新しいデータ / スペース = 自動 / R = 最初から
// ============================================

const NPTS = 120;                         // ★ データの点の数
const BS = [1, 4, 16, 64, NPTS];          // ★ バッチの大きさの候補
const KMAX = 4000, PERF = 6;              // ★ 反復の最大回数、1 フレームに何回
const RHO = 0.9, B1 = 0.9, B2 = 0.999, EPS = 1e-8;   // ★ RMSProp の ρ、Adam の β₁・β₂
let which = 0, bi = 0, lrm = 1, seed = 7, M, V, CI, runs, k = 0, auto = true, MC, rnd, FP;

function setup() {
  createCanvas(windowWidth, windowHeight);
  MC = [{ name: 'GD（全部の勾配）', col: PAL.cy }, { name: 'SGD η 一定', col: PAL.pk }, { name: 'SGD η/(1+k/200)', col: PAL.gr }, { name: 'RMSProp', col: PAL.vi }, { name: 'Adam', col: PAL.or }];
  selfTest();
  rebuild();
}
function gauss(r) { return Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r()); }
function sigm(z) { return 1 / (1 + Math.exp(-z)); }
// データと損失：θ = (w, b)、aᵢ = (xᵢ, 1)、zᵢ = w xᵢ + b
function makeModel(md, sd) {
  let r = rngSeed(sd), X = [], Y = [];
  for (let i = 0; i < NPTS; i++) {
    if (md === 0) { let x = 2 * r() - 1; X.push(x); Y.push(1.5 * x - 0.5 + 0.5 * gauss(r)); }
    else { let x = 4 * r() - 2; X.push(x); Y.push(r() < sigm(2 * x - 0.5) ? 1 : 0); }
  }
  let lossI = md === 0 ? (z, y) => 0.5 * (z - y) ** 2 : (z, y) => (z > 0 ? z + Math.log1p(Math.exp(-z)) : Math.log1p(Math.exp(z))) - y * z;
  let resI = md === 0 ? (z, y) => z - y : (z, y) => sigm(z) - y, curvI = md === 0 ? () => 1 : (z) => sigm(z) * (1 - sigm(z));
  let Mo = { md, X, Y, N: NPTS,
    f: (w, b) => { let s = 0; for (let i = 0; i < NPTS; i++) s += lossI(w * X[i] + b, Y[i]); return s / NPTS; },
    gi: (i, w, b) => { let q = resI(w * X[i] + b, Y[i]); return [q * X[i], q]; },
    g: (w, b) => { let p = [0, 0]; for (let i = 0; i < NPTS; i++) { let q = resI(w * X[i] + b, Y[i]); p[0] += q * X[i]; p[1] += q; } return [p[0] / NPTS, p[1] / NPTS]; },
    H: (w, b) => { let a = 0, c = 0, d = 0; for (let i = 0; i < NPTS; i++) { let s = curvI(w * X[i] + b); a += s * X[i] * X[i]; c += s * X[i]; d += s; } return [[a / NPTS, c / NPTS], [c / NPTS, d / NPTS]]; } };
  let th = [0, 0];   // 最小点：線形は正規方程式 1 回（= ニュートン 1 回）、ロジスティックはニュートン法を ‖∇f‖ < 1e−14 まで
  for (let it = 0; it < 50 && !(vlen(Mo.g(...th)) < 1e-14); it++) { let dd = solve2(Mo.H(...th), Mo.g(...th)); th = [th[0] - dd[0], th[1] - dd[1]]; }
  Mo.xs = [th]; Mo.fs = Mo.f(...th); Mo.view = [th[0], th[1], 3.2];
  let Hs = Mo.H(...th), H0 = Mo.H(0, 0); Mo.L = eig2(md === 0 ? Hs : [[H0[0][0], H0[0][1]], [H0[1][0], H0[1][1]]]).l[1];   // ロジスティック：σ' ≤ 1/4 で H ≤ H(0,0)
  return Mo;
}
function lrs(Mo) { return [1 / Mo.L, 0.5 / Mo.L, 0.5 / Mo.L, 0.01, 0.02].map((v) => v * lrm); }
function rebuild() {
  M = makeModel(which, seed); V = makeView(16, 74, width * 0.46, height - 124, M.view); CI = contourImage(V, M.f); rnd = rngSeed(seed + 99);
  let t0 = [M.xs[0][0] - 2.4, M.xs[0][1] + 1.8];
  runs = MC.map(() => ({ th: t0.slice(), m: [0, 0], v: [0, 0], P: [t0], fv: [M.f(...t0) - M.fs], gn: [vlen(M.g(...t0))], ma: [M.f(...t0) - M.fs], sw: M.f(...t0) - M.fs, acc: 0, nacc: 0, dead: false }));
  k = 0; FP = floorPred(M, lrs(M)[1], BS[bi]);
}
function batchGrad(Mo, th, B, r) { let p = [0, 0]; for (let j = 0; j < B; j++) { let i = Math.floor(r() * Mo.N), q = Mo.gi(i, ...th); p[0] += q[0]; p[1] += q[1]; } return [p[0] / B, p[1] / B]; }   // 復元抽出
function iterate(Mo, R, m, k, B, eta, r) {
  if (R.dead) return;
  let g = m === 0 ? Mo.g(...R.th) : batchGrad(Mo, R.th, B, r), th = R.th;
  if (m === 0 || m === 1) th = [th[0] - eta * g[0], th[1] - eta * g[1]];
  else if (m === 2) { let e = eta / (1 + k / 200); th = [th[0] - e * g[0], th[1] - e * g[1]]; }
  else if (m === 3) { R.v = R.v.map((v, j) => RHO * v + (1 - RHO) * g[j] * g[j]); th = th.map((t, j) => t - (eta * g[j]) / (Math.sqrt(R.v[j]) + EPS)); }
  else { R.m = R.m.map((v, j) => B1 * v + (1 - B1) * g[j]); R.v = R.v.map((v, j) => B2 * v + (1 - B2) * g[j] * g[j]); th = th.map((t, j) => t - (eta * R.m[j] / (1 - B1 ** (k + 1))) / (Math.sqrt(R.v[j] / (1 - B2 ** (k + 1))) + EPS)); }
  let f = Mo.f(...th) - Mo.fs;
  if (bad(f) || bad(th[0]) || bad(th[1])) { R.dead = true; R.fv.push(NaN); return; }
  R.th = th; R.P.push(th); R.fv.push(f); R.gn.push(vlen(Mo.g(...th)));
  if (R.ma) { let n = R.fv.length; R.sw += f - (n > 50 ? R.fv[n - 51] : 0); R.ma.push(R.sw / Math.min(50, n)); }   // 50 回の移動平均
  if (k >= KMAX / 2) { R.acc += f; R.nacc++; }
}
// 雑音の床の予測：誤差 e の 2 次モーメント P が止まる式 AP + PA − η 𝓜(P) = η Σ_B を解き、E[f − f*] = ½ tr(AP)
//   線形回帰・復元抽出：𝓜(P) = (1/B) E[aaᵀPaaᵀ] + (1 − 1/B) APA、Σ_B = (1/B) E[r*² aaᵀ]（この 2 つで厳密）
//   ロジスティック：A = H(θ*)、𝓜(P) = APA、Σ_B = (1/B) E[gᵢgᵢᵀ]（雑音が θ によらないとした近似）
function floorPred(Mo, eta, B) {
  let A = Mo.H(...Mo.xs[0]), mm = (P, Q) => [[P[0][0] * Q[0][0] + P[0][1] * Q[1][0], P[0][0] * Q[0][1] + P[0][1] * Q[1][1]], [P[1][0] * Q[0][0] + P[1][1] * Q[1][0], P[1][0] * Q[0][1] + P[1][1] * Q[1][1]]];
  let Sg = [[0, 0], [0, 0]], Mop = (P) => mm(mm(A, P), A);
  for (let i = 0; i < Mo.N; i++) { let q = Mo.gi(i, ...Mo.xs[0]); Sg[0][0] += q[0] * q[0] / Mo.N / B; Sg[0][1] += q[0] * q[1] / Mo.N / B; Sg[1][1] += q[1] * q[1] / Mo.N / B; }
  if (Mo.md === 0) Mop = (P) => { let s = [[0, 0], [0, 0]]; for (let i = 0; i < Mo.N; i++) { let a = [[Mo.X[i] * Mo.X[i], Mo.X[i]], [Mo.X[i], 1]], t = mm(mm(a, P), a); for (let u = 0; u < 2; u++) for (let v = 0; v < 2; v++) s[u][v] += t[u][v] / Mo.N; } let apa = mm(mm(A, P), A); return s.map((rw, u) => rw.map((x, v) => x / B + (1 - 1 / B) * apa[u][v])); };
  let op = (P) => { let a = mm(A, P), b = mm(P, A), c = Mop(P); return [a[0][0] + b[0][0] - eta * c[0][0], a[0][1] + b[0][1] - eta * c[0][1], a[1][1] + b[1][1] - eta * c[1][1]]; };
  let cols = [op([[1, 0], [0, 0]]), op([[0, 1], [1, 0]]), op([[0, 0], [0, 1]])], rhs = [eta * Sg[0][0], eta * Sg[0][1], eta * Sg[1][1]];
  let det3 = (c) => c[0][0] * (c[1][1] * c[2][2] - c[1][2] * c[2][1]) - c[1][0] * (c[0][1] * c[2][2] - c[0][2] * c[2][1]) + c[2][0] * (c[0][1] * c[1][2] - c[0][2] * c[1][1]);
  let D = det3(cols), p = [0, 1, 2].map((j) => det3(cols.map((c, i) => (i === j ? rhs : c))) / D);   // クラメルの公式（cols は列）
  return 0.5 * (A[0][0] * p[0] + 2 * A[0][1] * p[1] + A[1][1] * p[2]);
}

function draw() {
  background(PAL.bg);
  if (auto) for (let s = 0; s < PERF && k < KMAX; s++, k++) runs.forEach((R, m) => iterate(M, R, m, k, BS[bi], lrs(M)[m], rnd));
  image(CI, V.px, V.py);
  runs.forEach((R, m) => drawPath(V, R.P.slice(-300), MC[m].col, 1.5, false));
  hud([[(which === 0 ? '線形回帰 y ≈ w x + b（二乗誤差）' : 'ロジスティック回帰 P(y=1) = σ(w x + b)') + '　横 w・縦 b の損失 f(w, b)　k = ' + k, PAL.ink],
    ['1 線形　2 ロジスティック　↑↓ 学習率 ×' + lrm + '　←→ バッチ B = ' + BS[bi] + '　N 新しいデータ　スペース 自動 ' + (auto ? 'ON' : 'off') + '　R 最初から', PAL.dim]], 16, 14, 16);
  // データと、いまの (w, b) の直線・曲線
  let x0 = width * 0.5, y0 = 80, w = width - x0 - 24, h = height * 0.25, xr = which === 0 ? 1.1 : 2.2, ylo = which === 0 ? -3.5 : -0.2, yhi = which === 0 ? 2.5 : 1.2;
  let DX = (x) => x0 + ((x + xr) / (2 * xr)) * w, DY = (y) => y0 + h - ((y - ylo) / (yhi - ylo)) * h;
  fill(8, 26, 50, 230); stroke(PAL.line); rect(x0, y0, w, h); noStroke(); fill(PAL.ink);
  for (let i = 0; i < M.N; i++) circle(DX(M.X[i]), DY(Math.min(yhi, Math.max(ylo, M.Y[i]))), 4);
  runs.forEach((R, m) => { if (R.dead) return; noFill(); stroke(MC[m].col); strokeWeight(1.5); beginShape(); for (let j = 0; j <= 40; j++) { let x = -xr + (2 * xr * j) / 40, z = R.th[0] * x + R.th[1], y = which === 0 ? z : sigm(z); vertex(DX(x), DY(Math.min(yhi, Math.max(ylo, y)))); } endShape(); });
  let et = lrs(M), fp = FP, R1 = runs[1];
  hud([['SGD η 一定 = ' + fmt(et[1], 3) + '、B = ' + BS[bi] + ' の雑音の床：予測 E[f − f*] ≈ ' + fmt(fp, 3) + '　実測（後半の平均）' + (R1.nacc ? fmt(R1.acc / R1.nacc, 3) : '…'), PAL.pk],
    [which === 0 ? '予測の前提：線形回帰・復元抽出・誤差の 2 次モーメントが定常（この場合は厳密）' : '予測の前提：最小点のまわりで 2 次近似・雑音は一定（近似）', PAL.dim]], x0, y0 + h + 8, 13);
  let ks = runs[0].fv.map(() => fp), top = y0 + h + 62, ph = (height - top - 100) * 0.6;
  logPlot(x0 + 34, top, w - 40, ph, runs.map((R, m) => ({ v: m ? R.ma : R.fv, c: MC[m].col, name: MC[m].name + (R.dead ? '（発散）' : '') })).concat([{ v: ks, c: PAL.ye, dash: true, wt: 3, name: 'SGD η 一定の床（予測）' }]), { kmax: KMAX, lo: -12, title: 'f(θ_k) − f*（確率的な 4 つは 50 回の移動平均）' });
  logPlot(x0 + 34, top + ph + 44, w - 40, height - top - ph - 100, runs.map((R, m) => ({ v: R.gn, c: MC[m].col })), { kmax: KMAX, lo: -8, title: '‖∇f(θ_k)‖' });
  drawSelfTest();
}
function keyPressed() {
  if (key === '1' || key === '2') { which = +key - 1; rebuild(); }
  if (key === UP_ARROW) { lrm = Math.min(16, lrm * 2); rebuild(); }
  if (key === DOWN_ARROW) { lrm = Math.max(1 / 16, lrm / 2); rebuild(); }
  if (key === RIGHT_ARROW) { bi = Math.min(BS.length - 1, bi + 1); rebuild(); }
  if (key === LEFT_ARROW) { bi = Math.max(0, bi - 1); rebuild(); }
  if (key === 'n' || key === 'N') { seed++; rebuild(); }
  if (key === ' ') auto = !auto;
  if (key === 'r' || key === 'R') rebuild();
}

function selfTest() {
  let Ml = makeModel(0, 7), Mg = makeModel(1, 7);
  for (let Mo of [Ml, Mg]) {
    let e = derivErr(Mo, [[0.3, -0.2], [2, 1], [-1, 0.5]]), nm = Mo.md ? 'ロジスティック' : '線形';
    stOk(nm + '：損失の勾配・ヘッセ行列 = 差分', e.g < 1e-6 && e.H < 1e-5, 'g ' + fmt(e.g) + ', H ' + fmt(e.H));
    stOk(nm + '：最小点 θ* で ‖∇f‖ < 1e−12', vlen(Mo.g(...Mo.xs[0])) < 1e-12, 'θ* = (' + fmt(Mo.xs[0][0], 5) + ', ' + fmt(Mo.xs[0][1], 5) + ')');
    let r = rngSeed(5), perm = [...Array(Mo.N).keys()].sort(() => r() - 0.5), avg = [0, 0], th = [0.7, -0.4];
    for (let s = 0; s < Mo.N; s += 10) { let p = [0, 0]; for (let i of perm.slice(s, s + 10)) { let q = Mo.gi(i, ...th); p[0] += q[0] / 10; p[1] += q[1] / 10; } avg[0] += p[0] / (Mo.N / 10); avg[1] += p[1] / (Mo.N / 10); }
    let g = Mo.g(...th); stOk(nm + '：重ならない 12 個のミニバッチの勾配の平均 = 全体の勾配', Math.hypot(avg[0] - g[0], avg[1] - g[1]) < 1e-12);
  }
  let o = Mg.Y.map((y, i) => [Mg.X[i], y]).sort((a, b) => a[0] - b[0]).map((p) => p[1]), mono = (s) => s.every((v, i) => i === 0 || v >= s[i - 1]);
  stOk('ロジスティック：データは 1 本のしきい値で分けられない（だから f* が有限）', !mono(o) && !mono(o.slice().reverse()));
  let R = { th: [1, 1], m: [0, 0], v: [0, 0], P: [], fv: [], gn: [], acc: 0, nacc: 0 }, g0 = Ml.g(1, 1);
  iterate(Ml, R, 4, 0, NPTS, 0.02, rngSeed(1));   // B = N でも復元抽出なので g は全体の勾配と少し違う → 大きさだけ確かめる
  stOk('Adam の 1 歩目：各成分がちょうど η·|g|/(|g|+ε) ≈ η だけ動く（バイアス補正）', Math.abs(Math.abs(R.th[0] - 1) - 0.02) < 1e-6 && Math.abs(Math.abs(R.th[1] - 1) - 0.02) < 1e-6, '動き ' + fmt(Math.abs(R.th[0] - 1), 6) + ', ' + fmt(Math.abs(R.th[1] - 1), 6) + '（|g| ~ ' + fmt(vlen(g0)) + '）');
  let eta = 0.5 / Ml.L;
  for (let [B, sd] of [[1, 11], [4, 12]]) {
    let fp = floorPred(Ml, eta, B), r = rngSeed(sd), th = Ml.xs[0].slice(), sum = 0, n = 0;
    for (let kk = 0; kk < 30000; kk++) { let gb = batchGrad(Ml, th, B, r); th = [th[0] - eta * gb[0], th[1] - eta * gb[1]]; if (kk >= 1000) { sum += Ml.f(...th) - Ml.fs; n++; } }
    stOk('線形・B=' + B + '・η=0.5/L：雑音の床 実測（29000 回の平均）≈ 予測（±5%）', Math.abs(sum / n / fp - 1) < 0.05, '予測 ' + fmt(fp, 4) + ' 実測 ' + fmt(sum / n, 4));
  }
  let ra = rngSeed(3), rb = rngSeed(3), A = { th: [0, 0], m: [0, 0], v: [0, 0], P: [], fv: [], gn: [], acc: 0, nacc: 0 }, Bd = { th: [0, 0], m: [0, 0], v: [0, 0], P: [], fv: [], gn: [], acc: 0, nacc: 0 };
  for (let kk = 0; kk < KMAX; kk++) { iterate(Ml, A, 1, kk, 1, eta, ra); iterate(Ml, Bd, 2, kk, 1, eta, rb); }
  let tail = (R) => R.fv.slice(-1000).reduce((s, v) => s + v, 0) / 1000;
  stOk('η を減らす SGD のほうが、η 一定より f* に近づく（最後の 1000 回の平均）', tail(Bd) < tail(A), fmt(tail(Bd), 3) + ' < ' + fmt(tail(A), 3));
  let G = { th: [0, 0], m: [0, 0], v: [0, 0], P: [], fv: [], gn: [], acc: 0, nacc: 0 }; for (let kk = 0; kk < 300; kk++) iterate(Ml, G, 0, kk, 1, 1 / Ml.L, null);
  stOk('全部の勾配の GD（t = 1/L）はゆらがず f* に収束', G.fv[G.fv.length - 1] < 1e-25, fmt(G.fv[G.fv.length - 1]));
  stReport();
}

// ---------- やってみよう ----------
// 1. ←→ で B を 1 → 4 → 16 にすると、SGD η 一定の床が 1/4 ずつ下がる（予測の点線と比べよう）
// 2. ↑↓ で学習率を 2 倍にすると床も約 2 倍。GD は 2/L を超えると発散する
// 3. Adam と RMSProp は成分ごとに歩幅をそろえる。等高線の楕円がつぶれていても進み方があまり変わらない
// 4. 2（ロジスティック）では床の予測は近似。データの点と、確率の曲線（σ）の当てはまりを見よう
// 5. N で別のデータにしても、床の予測と実測は合う？

// ==================================================
// ここから下は「最適化の道具」（中身は読まなくても OK。消さないでね）
// テスト関数（値・勾配・ヘッセ行列）、等高線、対数グラフ、2×2 行列、直線探索、自己テスト
// ==================================================
const PAL = { bg: '#0c2445', ink: '#e8f2fb', dim: '#8eb2cf', line: '#2c5a85', or: '#ff7a2f', cy: '#5fd8f0', gr: '#8de07a', ye: '#ffd24a', pk: '#ff6fa8', vi: '#b79cff', rd: '#ff5a5a' };

// ---- テスト関数 { f 値, g 勾配, H ヘッセ行列, xs 最小点, fs 最小値, view [中心x, 中心y, 横の半幅] }
function quadFn(kap, th = 0.5) {     // f = ½ xᵀAx、A の固有値は μ = 1 と L = κ（θ だけ回転）
  let c = Math.cos(th), s = Math.sin(th), a = c * c + kap * s * s, b = (1 - kap) * c * s, d = s * s + kap * c * c;
  return { name: '2 次関数 κ = ' + fmt(kap), f: (x, y) => 0.5 * (a * x * x + 2 * b * x * y + d * y * y), g: (x, y) => [a * x + b * y, b * x + d * y],
    H: () => [[a, b], [b, d]], mu: 1, L: kap, xs: [[0, 0]], fs: 0, view: [0, 0, 3.2], start: [-2.6, 1.6], convex: true, th };
}
const ROSEN = { name: 'ローゼンブロック', f: (x, y) => (1 - x) ** 2 + 100 * (y - x * x) ** 2,
  g: (x, y) => [-2 * (1 - x) - 400 * x * (y - x * x), 200 * (y - x * x)],
  H: (x, y) => [[2 - 400 * (y - x * x) + 800 * x * x, -400 * x], [-400 * x, 200]], xs: [[1, 1]], fs: 0, view: [-0.2, 0.9, 2.1], start: [-1.2, 1] };
const HIMMEL = { name: 'ヒンメルブラウ', f: (x, y) => (x * x + y - 11) ** 2 + (x + y * y - 7) ** 2,
  g: (x, y) => [4 * x * (x * x + y - 11) + 2 * (x + y * y - 7), 2 * (x * x + y - 11) + 4 * y * (x + y * y - 7)],
  H: (x, y) => [[12 * x * x + 4 * y - 42, 4 * x + 4 * y], [4 * x + 4 * y, 4 * x + 12 * y * y - 26]],
  xs: [[3, 2], [-2.8051, 3.1313], [-3.7793, -3.2832], [3.5844, -1.8481]], fs: 0, view: [0, 0, 6.2], start: [-0.3, -0.9] };
const BEALE = (() => {
  let C = [1.5, 2.25, 2.625], each = (x, y, fn) => C.forEach((c, i) => { let n = i + 1; fn(c - x + x * y ** n, y ** n - 1, n * x * y ** (n - 1), n * y ** (n - 1), n > 1 ? n * (n - 1) * x * y ** (n - 2) : 0); });
  return { name: 'ビール', f: (x, y) => { let s = 0; each(x, y, (r) => (s += r * r)); return s; },
    g: (x, y) => { let p = [0, 0]; each(x, y, (r, rx, ry) => { p[0] += 2 * r * rx; p[1] += 2 * r * ry; }); return p; },
    H: (x, y) => { let a = 0, b = 0, d = 0; each(x, y, (r, rx, ry, rxy, ryy) => { a += 2 * rx * rx; b += 2 * (rx * ry + r * rxy); d += 2 * (ry * ry + r * ryy); }); return [[a, b], [b, d]]; },
    xs: [[3, 0.5]], fs: 0, view: [0.6, 0, 4.6], start: [-1.5, 1.8] };
})();
HIMMEL.xs = HIMMEL.xs.map((p) => criticalPoint(HIMMEL, p));   // 4 つの最小点を ∇f = 0 のニュートン法で精密に
const LSE = (() => {                  // log(e^(x+3y−0.1) + e^(x−3y−0.1) + e^(−x−0.1))：凸。最小点 (−ln2 / 2, 0)、最小値 (3/2)ln2 − 0.1
  let pr = (x, y) => { let z = [x + 3 * y - 0.1, x - 3 * y - 0.1, -x - 0.1], m = Math.max(...z), e = z.map((v) => Math.exp(v - m)), s = e[0] + e[1] + e[2]; return [m + Math.log(s), e.map((v) => v / s)]; };
  return { name: 'log-sum-exp', f: (x, y) => pr(x, y)[0], g: (x, y) => { let p = pr(x, y)[1]; return [p[0] + p[1] - p[2], 3 * p[0] - 3 * p[1]]; },
    H: (x, y) => { let p = pr(x, y)[1], g0 = p[0] + p[1] - p[2], g1 = 3 * p[0] - 3 * p[1]; return [[1 - g0 * g0, g1 - g0 * g1], [g1 - g0 * g1, 9 * (p[0] + p[1]) - g1 * g1]]; },
    xs: [[-Math.LN2 / 2, 0]], fs: 1.5 * Math.LN2 - 0.1, view: [-0.4, 0, 2.4], start: [-2, 1.1], convex: true, L: 10 };
})();

// ---- 2×2 の行列とベクトル
function eig2(M) {                    // 対称行列の固有値（小さい順）と固有ベクトル
  let a = M[0][0], b = M[0][1], d = M[1][1], t = (a + d) / 2, r = Math.hypot((a - d) / 2, b), l1 = t - r;
  let v = Math.abs(b) > 1e-14 * (Math.abs(a) + Math.abs(d) + 1) ? [l1 - d, b] : a <= d ? [1, 0] : [0, 1], n = Math.hypot(v[0], v[1]);
  v = [v[0] / n, v[1] / n];
  return { l: [l1, t + r], v: [v, [-v[1], v[0]]] };
}
function solve2(M, r) { let det = M[0][0] * M[1][1] - M[0][1] * M[1][0]; return [(M[1][1] * r[0] - M[0][1] * r[1]) / det, (M[0][0] * r[1] - M[1][0] * r[0]) / det]; }
function vlen(v) { return Math.hypot(...v); }
function vdot(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }
function vaxpy(a, x, y) { return y.map((yi, i) => yi + a * x[i]); }   // a·x + y
function bad(v) { return !isFinite(v) || Math.abs(v) > 1e12; }
function errTo(F, p) { return Math.min(...F.xs.map((q) => Math.hypot(p[0] - q[0], p[1] - q[1]))); }

// ---- 微分のチェック（中心差分）。H は「解析的な勾配」の差分と比べる
function fdGrad(fn, x, y, h = 1e-6) { return [(fn(x + h, y) - fn(x - h, y)) / (2 * h), (fn(x, y + h) - fn(x, y - h)) / (2 * h)]; }
function derivErr(F, pts) {
  let eg = 0, eh = 0, rel = (a, b) => Math.abs(a - b) / Math.max(1, Math.abs(b));
  for (let [x, y] of pts) {
    let g = F.g(x, y), n = fdGrad(F.f, x, y), H = F.H(x, y), h = 1e-6;
    let gx1 = F.g(x + h, y), gx0 = F.g(x - h, y), gy1 = F.g(x, y + h), gy0 = F.g(x, y - h);
    let N = [[(gx1[0] - gx0[0]) / (2 * h), (gy1[0] - gy0[0]) / (2 * h)], [(gx1[1] - gx0[1]) / (2 * h), (gy1[1] - gy0[1]) / (2 * h)]];
    eg = Math.max(eg, rel(g[0], n[0]), rel(g[1], n[1]));
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) eh = Math.max(eh, rel(H[i][j], N[i][j]));
  }
  return { g: eg, H: eh };
}
// ∇f = 0 をニュートン法で解く（停留点を探す）
function criticalPoint(F, p, it = 60) {
  for (let k = 0; k < it; k++) { let d = solve2(F.H(p[0], p[1]), F.g(p[0], p[1])); if (!isFinite(d[0] + d[1])) return null; p = [p[0] - d[0], p[1] - d[1]]; if (vlen(d) < 1e-14) break; }
  return vlen(F.g(p[0], p[1])) < 1e-8 ? p : null;
}
// アルミホの条件 f(x + t d) ≤ f(x) + c₁ t ∇fᵀd になるまで t を β 倍（試した点も返す）
function armijo(F, p, d, c1 = 1e-4, beta = 0.5, t = 1) {
  let f0 = F.f(p[0], p[1]), sl = vdot(F.g(p[0], p[1]), d), tries = [];
  for (let k = 0; k < 60; k++) { let fq = F.f(p[0] + t * d[0], p[1] + t * d[1]); tries.push([t, fq]); if (fq <= f0 + c1 * t * sl) break; t *= beta; }
  return { t, tries, slope: sl };
}

// ---- 画面と世界の座標（縦横の縮尺は同じ）
function makeView(px, py, pw, ph, v) {
  let V = { px, py, pw: Math.round(pw), ph: Math.round(ph), cx: v[0], cy: v[1], hw: v[2] };
  V.sc = V.pw / (2 * V.hw); V.hh = V.ph / (2 * V.sc);
  V.toS = (x, y) => [V.px + V.pw / 2 + (x - V.cx) * V.sc, V.py + V.ph / 2 - (y - V.cy) * V.sc];
  V.toW = (sx, sy) => [V.cx + (sx - V.px - V.pw / 2) / V.sc, V.cy - (sy - V.py - V.ph / 2) / V.sc];
  V.inside = (sx, sy) => sx >= V.px && sx <= V.px + V.pw && sy >= V.py && sy <= V.py + V.ph;
  return V;
}
// 等高線の画像：格子で値を計算 → 分位点で段を決め、色ぬり ＋ マーチングスクエアで線（関数を変えたときだけ呼ぶ）
function contourImage(V, fz, nLev = 18) {
  let cs = 5, nx = Math.ceil(V.pw / cs) + 1, ny = Math.ceil(V.ph / cs) + 1, Z = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { let [x, y] = V.toW(V.px + i * cs, V.py + j * cs), z = fz(x, y); Z[j * nx + i] = isFinite(z) ? z : 1e300; }
  let srt = Array.from(Z).filter((z) => z < 1e300).sort((a, b) => a - b), lev = [];
  for (let k = 1; k <= nLev; k++) lev.push(srt[Math.min(srt.length - 1, Math.floor(srt.length * Math.pow(k / (nLev + 1), 1.7)))]);
  let G = createGraphics(V.pw, V.ph); G.pixelDensity(1);
  let ctx = G.drawingContext, img = ctx.createImageData(V.pw, V.ph), band = new Uint8Array(nx * ny);
  for (let q = 0; q < Z.length; q++) { let b = 0; while (b < nLev && Z[q] > lev[b]) b++; band[q] = Z[q] >= 1e300 ? 255 : b; }
  for (let py = 0; py < V.ph; py++) for (let px = 0; px < V.pw; px++) {
    let b = band[Math.round(py / cs) * nx + Math.round(px / cs)], t = b === 255 ? 1.25 : b / nLev, o = 4 * (py * V.pw + px);
    img.data[o] = 14 + 34 * (1 - t); img.data[o + 1] = 40 + 62 * (1 - t); img.data[o + 2] = 72 + 70 * (1 - t); img.data[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  // 方眼（製図用紙）
  let gs = Math.pow(10, Math.floor(Math.log10(V.hw / 2))); if (V.hw / gs > 10) gs *= 2; if (V.hw / gs > 10) gs *= 2.5;
  ctx.strokeStyle = 'rgba(120,200,240,0.12)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let x = Math.ceil((V.cx - V.hw) / gs) * gs; x < V.cx + V.hw; x += gs) { let s = V.toS(x, 0)[0] - V.px; ctx.moveTo(s, 0); ctx.lineTo(s, V.ph); }
  for (let y = Math.ceil((V.cy - V.hh) / gs) * gs; y < V.cy + V.hh; y += gs) { let s = V.toS(0, y)[1] - V.py; ctx.moveTo(0, s); ctx.lineTo(V.pw, s); }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(110,215,250,0.55)';
  for (let L of lev) {
    ctx.beginPath();
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      let a = Z[j * nx + i], b = Z[j * nx + i + 1], c = Z[(j + 1) * nx + i + 1], d = Z[(j + 1) * nx + i], P = [];
      if (a > L !== b > L) P.push(i + (L - a) / (b - a), j);
      if (b > L !== c > L) P.push(i + 1, j + (L - b) / (c - b));
      if (d > L !== c > L) P.push(i + (L - d) / (c - d), j + 1);
      if (a > L !== d > L) P.push(i, j + (L - a) / (d - a));
      for (let q = 0; q + 3 < P.length; q += 4) { ctx.moveTo(P[q] * cs, P[q + 1] * cs); ctx.lineTo(P[q + 2] * cs, P[q + 3] * cs); }
    }
    ctx.stroke();
  }
  G.levels = lev;
  return G;
}

// ---- 対数グラフ：series = [{ v: 値の配列, c: 色, name, dash }]。0 以下・NaN は描かない。opt = { lo, hi, logx, title, kmax }
function logPlot(x, y, w, h, series, opt = {}) {
  let lo = opt.lo, hi = opt.hi, kmax = opt.kmax || 1, mn = Infinity, mx = -Infinity;
  for (let s of series) { if (!opt.kmax) kmax = Math.max(kmax, s.v.length - 1); for (let v of s.v) if (v > 0 && isFinite(v)) { mn = Math.min(mn, Math.log10(v)); mx = Math.max(mx, Math.log10(v)); } }
  if (lo === undefined) lo = isFinite(mn) ? Math.max(-17, Math.floor(mn)) : -16;
  if (hi === undefined) hi = isFinite(mx) ? Math.ceil(mx) : 2;
  if (hi <= lo) hi = lo + 1;
  let X = (k) => x + w * (opt.logx ? Math.log(1 + k) / Math.log(1 + kmax) : k / kmax), Y = (v) => y + h - (h * (Math.log10(v) - lo)) / (hi - lo);
  push();
  fill(8, 26, 50, 230); stroke(PAL.line); strokeWeight(1); rect(x, y, w, h);
  textSize(11); textAlign(RIGHT, CENTER);
  let de = Math.max(1, Math.ceil((hi - lo) / 8));
  for (let e = lo; e <= hi; e += de) { let yy = Y(Math.pow(10, e)); stroke(40, 80, 120); line(x, yy, x + w, yy); noStroke(); fill(PAL.dim); text('10' + sup(e), x - 4, yy); }
  textAlign(CENTER, TOP); noStroke(); fill(PAL.dim);
  let kt = opt.logx ? [1, 10, 100, 1000, 10000].filter((k) => k <= kmax) : [0, Math.round(kmax / 2), kmax];
  for (let k of kt) text(k, X(k), y + h + 3);
  text(opt.xlabel || '反復 k', x + w / 2, y + h + 16);
  for (let s of series) {
    stroke(s.c); strokeWeight(s.wt || 2); noFill();
    if (s.dash) drawingContext.setLineDash([6, 5]);
    let pts = [];
    let flush = () => { if (pts.length >= 2) { beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape(); } else if (pts.length === 1) point(pts[0][0], pts[0][1]); pts = []; };
    for (let k = 0; k < s.v.length && k <= kmax; k++) { let v = s.v[k]; if (v > 0 && isFinite(v)) pts.push([X(k), Math.max(y, Math.min(y + h, Y(v)))]); else flush(); }
    flush(); drawingContext.setLineDash([]);
  }
  noStroke(); textAlign(RIGHT, TOP); textSize(12);
  series.filter((s) => s.name).forEach((s, i) => { let yy = y + 6 + 15 * i; noStroke(); fill(s.c); text(s.name, x + w - 34, yy); stroke(s.c); strokeWeight(2); if (s.dash) drawingContext.setLineDash([4, 3]); line(x + w - 28, yy + 7, x + w - 8, yy + 7); drawingContext.setLineDash([]); });
  if (opt.title) { noStroke(); fill(PAL.ink); textSize(13); textAlign(LEFT, BOTTOM); text(opt.title, x, y - 4); }
  pop();
}

// ---- 描く道具
function arrow(x1, y1, x2, y2, c, w = 2) {
  let a = Math.atan2(y2 - y1, x2 - x1), L = Math.hypot(x2 - x1, y2 - y1), hd = Math.min(12, L * 0.4);
  push(); stroke(c); fill(c); strokeWeight(w); line(x1, y1, x2, y2);
  if (L > 2) triangle(x2, y2, x2 - hd * Math.cos(a - 0.4), y2 - hd * Math.sin(a - 0.4), x2 - hd * Math.cos(a + 0.4), y2 - hd * Math.sin(a + 0.4));
  pop();
}
function drawPath(V, P, c, w = 2, dots = true) {   // 反復点の列を折れ線と点で
  if (P.length === 0) return;
  push(); stroke(c); strokeWeight(w); noFill();
  if (P.length >= 2) { beginShape(); for (let p of P) { let s = V.toS(p[0], p[1]); vertex(s[0], s[1]); } endShape(); }
  if (dots) { noStroke(); fill(c); for (let i = 0; i < P.length; i += Math.max(1, Math.floor(P.length / 60))) { let s = V.toS(P[i][0], P[i][1]); circle(s[0], s[1], 5); } }
  let s = V.toS(P[P.length - 1][0], P[P.length - 1][1]); stroke(255); strokeWeight(1.5); fill(c); circle(s[0], s[1], 11);
  pop();
}
function hud(lines, x, y, sz = 15, lh = 1.45) {   // 文字の列（[文字, 色] または 文字）
  push(); noStroke(); textSize(sz); textAlign(LEFT, TOP);
  lines.forEach((L, i) => { let [s, c] = Array.isArray(L) ? L : [L, PAL.ink]; fill(c); text(s, x, y + i * sz * lh); });
  pop();
}
const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
function sup(n) { return String(n).split('').map((ch) => SUP[ch] || ch).join(''); }
function fmt(v, d = 3) {             // 数の表示（発散・とても小さい数も）
  if (!isFinite(v) || Math.abs(v) > 1e12) return '発散';
  if (v === 0) return '0';
  let a = Math.abs(v);
  if (a < 1e-3 || a >= 1e5) { let e = Math.floor(Math.log10(a)), m = v / Math.pow(10, e); return m.toFixed(d - 1) + '×10' + sup(e); }
  return String(+v.toPrecision(d));
}
function rngSeed(s) { return () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---- 自己テスト（起動時に、知られている答えと照合する）
let selfTestResults = [];
function stOk(name, cond, info = '') { selfTestResults.push({ name, ok: !!cond, info }); }
function stReport() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name + (r.info ? '  [' + r.info + ']' : '')); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest() { push(); noStroke(); textSize(14); textAlign(LEFT, BOTTOM); fill(selfTestResults.every((r) => r.ok) ? PAL.gr : PAL.rd); text(selfTestLine(), 16, height - 12); pop(); }
