// ============================================
// 00 パーセプトロンと収束定理 ─ ローゼンブラットの学習則：まちがえた点 x のぶんだけ、重みを w ← w + y x と動かす
// 点 x = (x1, x2) にバイアスの 1 を足した (x1, x2, 1) で考える（直線 w1 x1 + w2 x2 + w3 = 0）。y = +1（マゼンタ）/ −1（ライム）
// 収束定理（ノビコフ）：直線で分けられるなら、修正の回数 k は必ず (R/γ)² 以下で止まる
//   R = いちばん遠い点の長さ ‖(x, 1)‖、γ = 余白（分ける単位ベクトル u に対して、いちばん近い点までの距離 y u·(x, 1)）
// 証明の 2 本の式：u·w ≥ kγ（毎回 γ 以上近づく）と ‖w‖² ≤ kR²（長さは √k R までしか伸びない）→ k ≤ (R/γ)²
// しきい値のニューロン（マカロック-ピッツ、series51/09）に「学ぶ」しくみを足したもの。XOR は分けられないので止まらない
// クリック 点を置く / 1 2 置く色 / スペース 一時停止 / ← → 速さ / R 新しいデータ / X XOR の配置 / C 全部消す
// ============================================

const N_PTS = 40;                        // ★ 種つきデータの点の数
const MARGIN0 = 0.08;                    // ★ 種つきデータの余白（小さいほど修正が増える）
const SPEEDS = [0.1, 0.34, 1, 5, 40];    // 1 フレームに調べる点の数
let pts = [], wv = [0, 0, 0], kMist = 0, ticks = 0, cur = 0, epochClean = 0, epochs = 0, done = false;
let uStar = null, paused = false, speedIdx = 2, addCls = 1, seedNo = 1, acc = 0, hist = [], flash = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  makeSeparable(seedNo);
}

// ---- データ：ランダムな直線 u*（3 次元の単位ベクトル）で色を決め、余白 MARGIN0 より近い点は捨てる
function separableData(seed, n, m0) {
  seedRng(seed);
  let a = 2 * Math.PI * rnd(), u = [Math.cos(a), Math.sin(a), 0.6 * (rnd() - 0.5)], nu = normV(u), out = [];
  u = u.map((v) => v / nu);
  while (out.length < n) {
    let p = [2 * rnd() - 1, 2 * rnd() - 1], s = u[0] * p[0] + u[1] * p[1] + u[2];
    if (Math.abs(s) >= m0) out.push({ x: p, y: s > 0 ? 1 : -1 });
  }
  return { pts: out, u };
}
function makeSeparable(seed) { let d = separableData(seed, N_PTS, MARGIN0); pts = d.pts; uStar = d.u; resetLearn(); }
function makeXor() {
  seedRng(seedNo + 100); pts = []; uStar = null;
  for (let q = 0; q < 4; q++) for (let k = 0; k < 6; k++) { let cx = q % 2 ? 0.5 : -0.5, cy = q < 2 ? 0.5 : -0.5; pts.push({ x: [cx + 0.3 * (rnd() - 0.5), cy + 0.3 * (rnd() - 0.5)], y: q === 0 || q === 3 ? 1 : -1 }); }
  resetLearn();
}
function resetLearn() { wv = [0, 0, 0]; kMist = 0; ticks = 0; cur = 0; epochClean = 0; epochs = 0; done = false; hist = [{ k: 0, uw: 0, ww: 0 }]; }
function aug(p) { return [p[0], p[1], 1]; }          // バイアスの 1 を足す
function radiusR(ps) { let r = 0; for (let p of ps) r = Math.max(r, normV(aug(p.x))); return r; }
function marginOf(ps, u) {                // 単位ベクトル u の余白（負なら分けられていない）
  let nu = normV(u); if (!(nu > 0)) return -1;
  let g = Infinity; for (let p of ps) g = Math.min(g, (p.y * dotV(u, aug(p.x))) / nu);
  return g;
}
// ★ パーセプトロンの 1 回：点 p を調べ、まちがい（y w·x ≤ 0）なら w ← w + η y x
function perceptronTick(w, p, eta) {
  let xa = aug(p.x);
  if (p.y * dotV(w, xa) <= 0) { for (let i = 0; i < 3; i++) w[i] += eta * p.y * xa[i]; return true; }
  return false;
}
function perceptronRun(ps, eta, maxEpochs, u) {   // 収束まで（または maxEpochs 周まで）回す
  let w = [0, 0, 0], k = 0, proof = true, R = radiusR(ps), gam = u ? marginOf(ps, u) : 0;
  for (let e = 0; e < maxEpochs; e++) {
    let bad = 0;
    for (let p of ps) if (perceptronTick(w, p, eta)) {
      bad++; k++;
      if (u) { let s = w.map((v) => v / eta); if (dotV(u, s) < k * gam - 1e-9 || dotV(s, s) > k * R * R + 1e-9) proof = false; }
    }
    if (bad === 0) return { w, k, converged: true, epochs: e + 1, proof };
  }
  return { w, k, converged: false, epochs: maxEpochs, proof };
}

function learnTick() {
  if (done || pts.length === 0) return;
  let p = pts[cur % pts.length];
  if (perceptronTick(wv, p, 1)) { kMist++; epochClean = 0; flash = 12; let u = uStar || null; hist.push({ k: kMist, uw: u ? dotV(u, wv) : 0, ww: normV(wv) }); if (hist.length > 4000) hist.shift(); }
  else epochClean++;
  cur++; ticks++;
  if (cur % pts.length === 0) epochs++;
  if (epochClean >= pts.length) done = true;
}

function draw() {
  background(...BG);
  if (!paused) { acc += SPEEDS[speedIdx]; while (acc >= 1) { learnTick(); acc -= 1; } }
  if (flash > 0) flash--;
  let R = radiusR(pts), u = uStar || (done ? wv : null), gam = u ? marginOf(pts, u) : NaN, bound = gam > 0 ? (R / gam) ** 2 : Infinity;
  hudTitle('パーセプトロンと収束定理：修正 ' + kMist + ' 回　' + epochs + ' 周' + (done ? '　→ 止まった（全部正しい）' : pts.length && epochs >= 300 ? '　→ 止まらない（分けられない？）' : ''),
    'クリック 点を置く（' + (addCls > 0 ? 'マゼンタ +1' : 'ライム −1') + '、1 2 で切りかえ）　スペース ' + (paused ? '再開' : '一時停止') + '　← → 速さ ' + SPEEDS[speedIdx] + ' 点/フレーム　R 新しいデータ　X XOR　C 全部消す');
  // ---- 左：点と直線
  let side = Math.min(height - 130, width * 0.47), bx = { x: 30, y: 90, w: side };
  noStroke(); fill(...PANEL); rect(bx.x, bx.y, side, side);
  stroke(...WIRE); line(bx.x + side / 2, bx.y, bx.x + side / 2, bx.y + side); line(bx.x, bx.y + side / 2, bx.x + side, bx.y + side / 2);
  if (uStar) drawLine(bx, uStar, [...SUB, 120], 1);
  if (normV(wv) > 0) drawLine(bx, wv, flash > 0 ? AMBER : INK, 3);
  for (let i = 0; i < pts.length; i++) {
    let p = pts[i], s = toBox(bx, p.x), bad = normV(wv) > 0 && p.y * dotV(wv, aug(p.x)) <= 0;
    stroke(bad ? AMBER : 10); strokeWeight(bad ? 2 : 1); fill(...(p.y > 0 ? MAG : LIME)); circle(s[0], s[1], 13);
  }
  if (pts.length && !done) { let s = toBox(bx, pts[cur % pts.length].x); noFill(); stroke(...INK); strokeWeight(1.5); circle(s[0], s[1], 24); }
  noStroke(); fill(...SUB); textSize(13); textAlign(LEFT, BASELINE);
  text('白 = いまの直線 w·(x, 1) = 0' + (uStar ? '　うすい線 = データを作った直線 u*' : '') + '　オレンジのふち = まちがっている点', bx.x, bx.y + side + 22);
  // ---- 右：数値と証明の 2 本の式
  let rx = bx.x + side + 50, rw = width - rx - 40;
  fill(...INK); textSize(16);
  text('w = (' + wv.map((v) => fmtN(v, 2)).join(', ') + ')　点の数 ' + pts.length, rx, 112);
  text('R = 最大の ‖(x, 1)‖ = ' + fmtN(R, 3), rx, 140);
  text('γ = 余白 = ' + (gam > 0 ? fmtN(gam, 4) : '—（分ける直線がまだない）') + (uStar ? '（u* で測る）' : done ? '（止まった直線で測る）' : ''), rx, 166);
  fill(...AMBER); textSize(18);
  text('上限 (R/γ)² = ' + (isFinite(bound) ? fmtN(bound, 1) : '—') + '　　修正の回数 k = ' + kMist + (isFinite(bound) ? (kMist <= bound ? '  ≤ 上限 ✓' : '  > 上限 ✗') : ''), rx, 200);
  let g = { x: rx, y: 250, w: rw, h: Math.min(260, height - 420), x0: 0, x1: Math.max(10, kMist), y0: 0, y1: 1 };
  let ks = hist.map((h) => h.k), ww = hist.map((h) => h.ww), uw = hist.map((h) => h.uw);
  g.y1 = Math.max(1, R * Math.sqrt(g.x1), ...ww);
  plotAxes(g, '修正の回数 k', '証明の 2 本の式：‖w‖ ≤ √k R（上の線）と u·w ≥ kγ（下の線）', [0, g.x1], [0, +g.y1.toPrecision(2)]);
  let kk = []; for (let i = 0; i <= 60; i++) kk.push((i / 60) * g.x1);
  plotXY(g, kk, kk.map((k) => R * Math.sqrt(k)), [...SKY, 140], 1);
  plotXY(g, ks, ww, SKY, 2);
  if (uStar) { plotXY(g, kk, kk.map((k) => k * gam), [...MAG, 140], 1); plotXY(g, ks, uw, MAG, 2); }
  legend(rx + 10, g.y + 18, [[SKY, '‖w‖（太）と √k R（細）'], ...(uStar ? [[MAG, 'u*·w（太）と kγ（細）']] : [])]);
  fill(...SUB); textSize(13); textAlign(LEFT, BASELINE);
  let ty = g.y + g.h + 56;
  text('u·w は 1 回の修正で γ 以上ふえ、‖w‖² は R² 以下しかふえない。', rx, ty);
  text('u·w ≤ ‖w‖ なので kγ ≤ √k R → k ≤ (R/γ)²。点の数や順番によらない上限', rx, ty + 20);
  text('X の XOR の配置は、どんな直線でも分けられない → 修正が永遠に続く（05 で隠れ層を使って解く）', rx, ty + 40);
  drawSelfTest(width - 180, height - 14);
}
function toBox(bx, p) { return [bx.x + ((p[0] + 1) / 2) * bx.w, bx.y + ((1 - p[1]) / 2) * bx.w]; }
function drawLine(bx, w, col, sw) {      // w1 x1 + w2 x2 + w3 = 0 を [−1, 1]² の中に描く
  let pa = [];
  if (Math.abs(w[1]) > 1e-9) for (let x1 of [-1, 1]) pa.push([x1, -(w[0] * x1 + w[2]) / w[1]]);
  else if (Math.abs(w[0]) > 1e-9) for (let x2 of [-1, 1]) pa.push([-w[2] / w[0], x2]);
  if (pa.length < 2) return;
  let a = toBox(bx, pa[0]), b = toBox(bx, pa[1]);
  stroke(...col); strokeWeight(sw); drawingContext.save(); drawingContext.beginPath(); drawingContext.rect(bx.x, bx.y, bx.w, bx.w); drawingContext.clip();
  line(a[0], a[1], b[0], b[1]); drawingContext.restore();
}

function mousePressed() {
  let side = Math.min(height - 130, width * 0.47), x = ((mouseX - 30) / side) * 2 - 1, y = 1 - ((mouseY - 90) / side) * 2;
  if (Math.abs(x) <= 1 && Math.abs(y) <= 1) { pts.push({ x: [x, y], y: addCls }); uStar = null; done = false; epochClean = 0; }
}
function keyPressed() {
  if (key === '1') addCls = 1;
  if (key === '2') addCls = -1;
  if (key === ' ') paused = !paused;
  if (key === RIGHT_ARROW) speedIdx = Math.min(SPEEDS.length - 1, speedIdx + 1);
  if (key === LEFT_ARROW) speedIdx = Math.max(0, speedIdx - 1);
  if (key === 'r' || key === 'R') makeSeparable(++seedNo);
  if (key === 'x' || key === 'X') makeXor();
  if (key === 'c' || key === 'C') { pts = []; uStar = null; resetLearn(); }
  return false;
}

// ============================================
// やってみよう
// ・MARGIN0 を 0.02 や 0.2 にする。修正の回数と上限 (R/γ)² はどう変わる？
// ・R でデータを何回も作り直す。修正の回数が上限をこえることはある？
// ・C で消して、自分で点を置く。余白の小さい配置（境目ぎりぎりの点）だと修正が増える？
// ・X の XOR で、何周しても止まらないことを確かめる。点を 1 つ消したら止まる？
// ============================================

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let allOk = true, proofOk = true, info = '';
  for (let s = 1; s <= 6; s++) {
    let d = separableData(s, N_PTS, MARGIN0), R = radiusR(d.pts), gm = marginOf(d.pts, d.u), r = perceptronRun(d.pts, 1, 5000, d.u);
    if (!(r.converged && r.k <= (R / gm) ** 2 && marginOf(d.pts, r.w) > 0)) allOk = false;
    if (!r.proof) proofOk = false;
    if (s === 1) info = 'k = ' + r.k + ' ≤ ' + fmtN((R / gm) ** 2, 0);
  }
  check('6 つの種のデータで止まり、修正の回数 ≤ (R/γ)²（種 1：' + info + '）', allOk);
  check('証明の 2 本の式 u·w ≥ kγ と ‖w‖² ≤ kR² が毎回成り立つ', proofOk);
  let d = separableData(3, N_PTS, MARGIN0), r1 = perceptronRun(d.pts, 1, 5000), r2 = perceptronRun(d.pts, 0.1, 5000);
  check('学習率 η を 0.1 にしても、w = 0 から始めれば修正の回数は同じ（w が 0.1 倍になるだけ）', r1.k === r2.k && r1.w.every((v, i) => near(v * 0.1, r2.w[i], 1e-9)));
  let xor = [{ x: [0.5, 0.5], y: 1 }, { x: [-0.5, -0.5], y: 1 }, { x: [-0.5, 0.5], y: -1 }, { x: [0.5, -0.5], y: -1 }], rx = perceptronRun(xor, 1, 2000);
  check('XOR の 4 点：2000 周しても止まらない（修正 ' + rx.k + ' 回）', !rx.converged && rx.k > 2000);
  let noBias = d.pts.map((p) => ({ x: p.x, y: p.y })), shifted = noBias.map((p) => ({ x: [p.x[0] + 3, p.x[1] + 3], y: p.y })), rs = perceptronRun(shifted, 1, 20000);
  check('点を (3, 3) ずらしても、バイアスつきなら分けられて止まる', rs.converged && marginOf(shifted, rs.w) > 0);
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
