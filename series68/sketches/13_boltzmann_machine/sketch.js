// ============================================
// 13 ボルツマンマシン ─ 見える 9 個（3 × 3 の画素）と隠れ 3 個の、0/1 のニューロン。同じ層どうしはつながない（制限ボルツマンマシン）
// エネルギー E(v, h) = −a·v − b·h − vᵀ W h、確率 p(v, h) = e^(−E) / Z。Z = 全部の状態の e^(−E) の合計（分配関数）
// 状態は 2^12 = 4096 通りしかないので、Z も確率も対数尤度もその勾配も、全部数えて「正確に」計算できる
//   正確な勾配 = ⟨v h⟩_データ − ⟨v h⟩_モデル。ふつうは後ろの項が計算できないので、
//   コントラスティブ・ダイバージェンス（CD-1）：データから 1 回だけギブスサンプリングした v′ で代わりにする
// 下の「夢」：モデルから v → h → v → … とギブスサンプリング（1 変数ずつの条件付き分布は series65/12、0/1 の相互作用はイジング模型 series55/11）
// スペース 一時停止 / ↑↓ 学習率 / R 初期値を変えてやり直す / F 夢の速さ
// ============================================

const NV = 9, NHID = 3;                  // 見える・隠れの数（★ NV + NHID ≤ 12 なら全部数えられる）
const DATA_PATS = ['111000000', '000111000', '000000111', '100100100', '010010010', '001001001'];   // ★ しま模様（横 3 本・縦 3 本）
const LRS = [0.02, 0.05, 0.1, 0.2];
let lrIdx = 3, rbmCD = null, rbmEx = null, llCD = [], llEx = [], epochs = 0, seedB = 1, pausedB = false, dreamV = null, dreamLog = [], dreamSpd = 1, dataV = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  dataV = DATA_PATS.map((s) => s.split('').map(Number));
  restartRBM();
}

function makeRBM(seed) { seedRng(seed); let w = []; for (let i = 0; i < NV; i++) { let r = []; for (let j = 0; j < NHID; j++) r.push(0.1 * randn()); w.push(r); } return { w, a: new Array(NV).fill(0), b: new Array(NHID).fill(0) }; }
function copyRBM(m) { return { w: m.w.map((r) => r.slice()), a: m.a.slice(), b: m.b.slice() }; }
function bitsOf(k, n) { let v = []; for (let i = 0; i < n; i++) v.push((k >> i) & 1); return v; }
function energyVH(m, v, h) { let e = 0; for (let i = 0; i < NV; i++) e -= m.a[i] * v[i]; for (let j = 0; j < NHID; j++) { e -= m.b[j] * h[j]; for (let i = 0; i < NV; i++) e -= v[i] * m.w[i][j] * h[j]; } return e; }
function hidInput(m, v, j) { let s = m.b[j]; for (let i = 0; i < NV; i++) s += v[i] * m.w[i][j]; return s; }
function visInput(m, h, i) { let s = m.a[i]; for (let j = 0; j < NHID; j++) s += m.w[i][j] * h[j]; return s; }
// ★ 自由エネルギー F(v) = −a·v − Σ_j log(1 + e^(b_j + v·W_j))（h を全部足し合わせた結果。p(v) = e^(−F(v)) / Z）
function freeEnergy(m, v) { let f = 0; for (let i = 0; i < NV; i++) f -= m.a[i] * v[i]; for (let j = 0; j < NHID; j++) { let x = hidInput(m, v, j); f -= x > 30 ? x : Math.log(1 + Math.exp(x)); } return f; }
// 見える層の 512 通り全部の確率（正確）
function exactPv(m) { let lp = [], mx = -Infinity; for (let k = 0; k < 1 << NV; k++) { let l = -freeEnergy(m, bitsOf(k, NV)); lp.push(l); mx = Math.max(mx, l); } let z = 0; for (let l of lp) z += Math.exp(l - mx); return { p: lp.map((l) => Math.exp(l - mx) / z), logZ: mx + Math.log(z) }; }
function exactLL(m, data) { let lz = exactPv(m).logZ, s = 0; for (let v of data) s += -freeEnergy(m, v) - lz; return s / data.length; }
// ★ 正確な勾配：⟨v_i p(h_j|v)⟩_データ − Σ_v p(v) v_i p(h_j|v)
function exactGrad(m, data) {
  let gw = zerosMat(NV, NHID), ga = new Array(NV).fill(0), gb = new Array(NHID).fill(0), pv = exactPv(m).p;
  let acc = (v, wt) => { let ph = []; for (let j = 0; j < NHID; j++) ph.push(sigm(hidInput(m, v, j))); for (let i = 0; i < NV; i++) { ga[i] += wt * v[i]; for (let j = 0; j < NHID; j++) gw[i][j] += wt * v[i] * ph[j]; } for (let j = 0; j < NHID; j++) gb[j] += wt * ph[j]; };
  for (let v of data) acc(v, 1 / data.length);
  for (let k = 0; k < 1 << NV; k++) acc(bitsOf(k, NV), -pv[k]);
  return { w: gw, a: ga, b: gb };
}
// ★ CD-1：v0 → h0（サンプル）→ v1（サンプル）→ p(h|v1)。勾配の代わりに v0 p(h|v0) − v1 p(h|v1)
function cdGrad(m, data) {
  let gw = zerosMat(NV, NHID), ga = new Array(NV).fill(0), gb = new Array(NHID).fill(0), n = data.length;
  for (let v0 of data) {
    let ph0 = [], h0 = [], v1 = [], ph1 = [];
    for (let j = 0; j < NHID; j++) { ph0.push(sigm(hidInput(m, v0, j))); h0.push(rnd() < ph0[j] ? 1 : 0); }
    for (let i = 0; i < NV; i++) v1.push(rnd() < sigm(visInput(m, h0, i)) ? 1 : 0);
    for (let j = 0; j < NHID; j++) ph1.push(sigm(hidInput(m, v1, j)));
    for (let i = 0; i < NV; i++) { ga[i] += (v0[i] - v1[i]) / n; for (let j = 0; j < NHID; j++) gw[i][j] += (v0[i] * ph0[j] - v1[i] * ph1[j]) / n; }
    for (let j = 0; j < NHID; j++) gb[j] += (ph0[j] - ph1[j]) / n;
  }
  return { w: gw, a: ga, b: gb };
}
function ascend(m, g, lr) { for (let i = 0; i < NV; i++) { m.a[i] = clampv(m.a[i] + lr * g.a[i], -20, 20); for (let j = 0; j < NHID; j++) m.w[i][j] = clampv(m.w[i][j] + lr * g.w[i][j], -20, 20); } for (let j = 0; j < NHID; j++) m.b[j] = clampv(m.b[j] + lr * g.b[j], -20, 20); }
function restartRBM() { rbmCD = makeRBM(130 + seedB); rbmEx = copyRBM(rbmCD); llCD = [exactLL(rbmCD, dataV)]; llEx = [llCD[0]]; epochs = 0; seedRng(131 + seedB); dreamV = dataV[0].slice(); dreamLog = []; }
function gibbsDream(m, v) { let h = []; for (let j = 0; j < NHID; j++) h.push(rnd() < sigm(hidInput(m, v, j)) ? 1 : 0); let nv = []; for (let i = 0; i < NV; i++) nv.push(rnd() < sigm(visInput(m, h, i)) ? 1 : 0); return nv; }

function draw() {
  background(...BG);
  if (!pausedB && epochs < 8000) {
    for (let k = 0; k < 8; k++) { ascend(rbmCD, cdGrad(rbmCD, dataV), LRS[lrIdx]); ascend(rbmEx, exactGrad(rbmEx, dataV), LRS[lrIdx]); epochs++; }
    llCD.push(exactLL(rbmCD, dataV)); llEx.push(exactLL(rbmEx, dataV));
  }
  if (frameCount % [12, 4, 1][dreamSpd] === 0) { dreamV = gibbsDream(rbmCD, dreamV); dreamLog.push(dreamV); if (dreamLog.length > 40) dreamLog.shift(); }
  let ex = exactPv(rbmCD), onData = 0; for (let v of dataV) onData += ex.p[parseInt(v.slice().reverse().join(''), 2)];
  hudTitle('制限ボルツマンマシン（見える 9・隠れ 3）：' + epochs + ' 回　対数尤度 CD-1 ' + fmtN(llCD[llCD.length - 1], 3) + '／正確な勾配 ' + fmtN(llEx[llEx.length - 1], 3),
    'スペース ' + (pausedB ? '再開' : '一時停止') + '　↑↓ 学習率 ' + LRS[lrIdx] + '　R 初期値を変える　F 夢の速さ　｜　Z = Σ e^(−E) を 2^12 = 4096 通り全部足して計算');
  // ---- 左：データとフィルタ
  let cs = 16, x0 = 40, y0 = 104;
  noStroke(); fill(...INK); textSize(14); textAlign(LEFT, BASELINE); text('学ぶデータ（しま 6 枚）', x0, y0 - 4);
  dataV.forEach((v, k) => drawPix(v, x0 + k * (3 * cs + 12), y0 + 6, cs, null));
  text('隠れニューロン 3 個の重み W（マゼンタ = +、ライム = −）', x0, y0 + 96);
  for (let j = 0; j < NHID; j++) { let col = rbmCD.w.map((r) => r[j]), mx = Math.max(0.5, ...col.map(Math.abs)); drawPix(col.map((v) => v / mx), x0 + j * (3 * 22 + 16), y0 + 106, 22, 'div'); }
  // ---- 中：確率の高い見える状態
  let top = ex.p.map((p, k) => [p, k]).sort((a, b) => b[0] - a[0]).slice(0, 12), mx2 = top[0][0];
  let mxX = x0, myY = y0 + 220;
  fill(...INK); text('モデルの確率 p(v) が高い順（正確な値）　データの 6 枚の合計 = ' + fmtN(100 * onData, 1) + '%', mxX, myY - 6);
  top.forEach(([p, k], q) => {
    let v = bitsOf(k, NV), isData = DATA_PATS.includes(v.join('')), x = mxX + q * 58, bh = 80 * (p / mx2);
    drawPix(v, x, myY + 4, 14, null);
    noStroke(); fill(...(isData ? LIME : MAG)); rect(x, myY + 150 - bh, 42, bh, 2);
    fill(...SUB); textSize(11); text(fmtN(100 * p, 1) + '%', x, myY + 166);
  });
  fill(...SUB); textSize(12); text('ライム = データにある模様、マゼンタ = データにない模様（全部の確率の合計 = ' + fmtN(sumOf(ex.p), 6) + '）', mxX, myY + 186);
  // ---- 下：夢（ギブスサンプリング）
  let dy = myY + 220;
  fill(...INK); textSize(14); text('夢：モデルからギブスサンプリング v → h → v → …（最近の 40 個、左が古い）', mxX, dy);
  dreamLog.forEach((v, q) => drawPix(v, mxX + (q % 20) * 38, dy + 10 + Math.floor(q / 20) * 40, 10, null));
  // ---- 右：対数尤度
  let rx = Math.min(width * 0.62, 760), g = { x: rx + 30, y: 110, w: width - rx - 80, h: (height - 250) * 0.6, x0: 0, x1: Math.max(10, llCD.length - 1), y0: -7, y1: -1 };
  plotAxes(g, '学習の回数（×8）', '正確な対数尤度（データ 1 枚あたりの log p(v)）', [0, g.x1], [-7, -5, -3, -1]);
  stroke(...AMBER, 160); strokeWeight(1); line(g.x, gY(g, Math.log(1 / 6)), g.x + g.w, gY(g, Math.log(1 / 6)));
  plotXY(g, llEx.map((_, i) => i), llEx, LIME, 2.5); plotXY(g, llCD.map((_, i) => i), llCD, MAG, 2);
  legend(g.x + 12, g.y + g.h - 46, [[LIME, '正確な勾配（全部数える）'], [MAG, 'CD-1（1 回のギブス）'], [AMBER, '理想 log(1/6)']]);
  noStroke(); fill(...SUB); textSize(13); textAlign(LEFT, BASELINE);
  let ty = g.y + g.h + 50;
  ['CD-1 は正確な勾配ではない（サンプルなのでギザギザ、', '1 回ごとに上がるとは限らない）。長く続けると下がることも', '状態が多いと Z は数えられないので、ふつうは CD を使う', '理想 = 6 枚に 1/6 ずつ → log(1/6) = ' + fmtN(Math.log(1 / 6), 3), '隠れ 3 個 → h は 8 通り。それで 6 枚を作りわける'].forEach((s, q) => text(s, g.x, ty + 20 * q));
  drawSelfTest(width - 180, height - 14);
}
function drawPix(v, x, y, cs, kind) {
  for (let i = 0; i < 9; i++) { noStroke(); fill(...(kind === 'div' ? divCol(v[i]) : v[i] > 0.5 ? INK : [26, 48, 50])); rect(x + (i % 3) * cs, y + Math.floor(i / 3) * cs, cs - 1, cs - 1, 2); }
}

function keyPressed() {
  if (key === ' ') pausedB = !pausedB;
  if (key === UP_ARROW) { lrIdx = Math.min(LRS.length - 1, lrIdx + 1); restartRBM(); }
  if (key === DOWN_ARROW) { lrIdx = Math.max(0, lrIdx - 1); restartRBM(); }
  if (key === 'r' || key === 'R') { seedB++; restartRBM(); }
  if (key === 'f' || key === 'F') dreamSpd = (dreamSpd + 1) % 3;
  return false;
}

// ============================================
// やってみよう
// ・学習が進むと、夢の模様はしま模様ばかりになる？ データにない模様はどれくらい出る？
// ・DATA_PATS を自分の模様（例：対角線 '100010001'）に変えて学ばせる
// ・NHID を 1 や 2 にすると、データの 6 枚の合計の確率はどこまで上がる？（NV + NHID ≤ 12 で）
// ・学習率を ↑↓ で変えて、CD-1 と正確な勾配の差を見る
// ============================================

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let data = DATA_PATS.map((s) => s.split('').map(Number)), m = makeRBM(77);
  seedRng(78); for (let i = 0; i < NV; i++) m.a[i] = 0.3 * randn(); for (let j = 0; j < NHID; j++) m.b[j] = 0.3 * randn(); m.w = m.w.map((r) => r.map(() => randn()));
  let zFull = 0; for (let k = 0; k < 1 << NV; k++) for (let q = 0; q < 1 << NHID; q++) zFull += Math.exp(-energyVH(m, bitsOf(k, NV), bitsOf(q, NHID)));
  let ex = exactPv(m);
  check('Z を 4096 通り全部で数えた値 = 自由エネルギーで h を消した値（log Z = ' + fmtN(ex.logZ, 4) + '）', near(Math.log(zFull), ex.logZ, 1e-10));
  check('見える層の 512 通りの確率の合計 = 1', near(sumOf(ex.p), 1, 1e-12));
  let v = data[3], cond = true;
  for (let j = 0; j < NHID; j++) { let num = 0, den = 0; for (let q = 0; q < 1 << NHID; q++) { let h = bitsOf(q, NHID), e = Math.exp(-energyVH(m, v, h)); den += e; if (h[j]) num += e; } if (!near(num / den, sigm(hidInput(m, v, j)), 1e-12)) cond = false; }
  check('p(h_j = 1 | v) = σ(b_j + Σ v_i W_ij)（全部数えた条件付き確率と一致）', cond);
  let g = exactGrad(m, data), worst = 0, hh = 1e-6;
  for (let [i, j] of [[0, 0], [4, 1], [8, 2]]) { let p1 = copyRBM(m), p2 = copyRBM(m); p1.w[i][j] += hh; p2.w[i][j] -= hh; worst = Math.max(worst, relErr(g.w[i][j], (exactLL(p1, data) - exactLL(p2, data)) / (2 * hh))); }
  { let p1 = copyRBM(m), p2 = copyRBM(m); p1.a[2] += hh; p2.a[2] -= hh; worst = Math.max(worst, relErr(g.a[2], (exactLL(p1, data) - exactLL(p2, data)) / (2 * hh))); }
  check('正確な勾配 ⟨vh⟩_データ − ⟨vh⟩_モデル = 対数尤度の差分（相対誤差 ' + fmtE(worst) + '）', worst < 1e-5);
  let me = makeRBM(140), l0 = exactLL(me, data), mono = true, prev = l0;
  for (let t = 0; t < 40; t++) { ascend(me, exactGrad(me, data), 0.05); let l = exactLL(me, data); if (l < prev - 1e-12) mono = false; prev = l; }
  check('正確な勾配で小さな学習率なら、対数尤度は毎回上がる（' + fmtN(l0, 3) + ' → ' + fmtN(prev, 3) + '）', mono && prev > l0);
  let mc = makeRBM(141), c0 = exactLL(mc, data); seedRng(142);
  for (let t = 0; t < 600; t++) ascend(mc, cdGrad(mc, data), 0.1);
  let c1 = exactLL(mc, data);
  check('CD-1 で 600 回：学習の終わりの正確な対数尤度が最初より高い（' + fmtN(c0, 3) + ' → ' + fmtN(c1, 3) + '）', c1 > c0 + 1);
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
// ---- 画像の道具：img の全部の画素に fn(u, v) → [r, g, b] を塗る（u は右向き、v は上向き、どちらも 0〜1）
function paintImage(img, fn) {
  img.loadPixels();
  let w = img.width, h = img.height, d = img.pixelDensity ? img.pixelDensity() : 1;
  for (let py = 0; py < h * d; py++) for (let px = 0; px < w * d; px++) {
    let c = fn((px + 0.5) / (w * d), 1 - (py + 0.5) / (h * d)), i = 4 * (px + w * d * py);
    img.pixels[i] = c[0]; img.pixels[i + 1] = c[1]; img.pixels[i + 2] = c[2]; img.pixels[i + 3] = 255;
  }
  img.updatePixels();
}
function mixCol(a, b, t) { t = clampv(t, 0, 1); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
function divCol(v) { return v >= 0 ? mixCol(PANEL, MAG, v) : mixCol(PANEL, LIME, -v); }   // −1〜1 → ライム・暗い・マゼンタ
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
