// ============================================
// 09 EM 法は 2 つの射影 ─ 2 つの正規分布の混合 w1 N(μ1, 1) + w2 N(μ2, 1) を 1 次元のデータに当てはめる（未知は μ1, μ2 だけ）
// E ステップ = e-射影：いまのモデルから「データに合う分布の集まり」へ。各点がどちらの山から来たかの確率 r_ik を計算
// M ステップ = m-射影：その r_ik を重みにして平均を取り直す（モデルの集まりへ戻る）。くり返すたびに対数尤度 log L は必ず増えるか同じ
// 自由エネルギー F = log L − Σ KL(r_i‖事後確率_i)：E で F = log L（すき間 0）、M で F が上がる。（クラスタリングとしての EM はシリーズ 61 の 08）
// クリック 右の平面で出発点 / スペース 半歩（E か M）/ A 自動 / D 新しいデータ / R 出発点にもどる
// ============================================

const W_MIX = [0.4, 0.6];                // ★ 2 つの山の重み（既知とする）
const TRUE_MU = [-1.5, 2];               // ★ データを作る本当の平均
const N_DATA = 150;
let xs = [], muEM = [-3.8, -2.5], startMu = [-3.8, -2.5], resp = [], phase = 'E', pathEM = [], logLs = [], auto = true, seedD = 9, pb, field = null, fKey = '', tick = 0;

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); makeData(); layout(); restart(); }
function windowResized() { resizeCanvas(windowWidth, windowHeight); layout(); }
function layout() { let s = Math.min(width * 0.38, height * 0.62); pb = plotBox(width * 0.56, 110, s, s, -4, 4, -4, 4); fKey = ''; }
function makeData() { seedRng(seedD); xs = []; for (let k = 0; k < N_DATA; k++) { let c = rnd() < W_MIX[0] ? 0 : 1; xs.push(TRUE_MU[c] + gaussRnd()); } fKey = ''; }
function restart() { muEM = startMu.slice(); resp = posterior(muEM); phase = 'E'; pathEM = [muEM.slice()]; logLs = [logLik(muEM)]; }
function npdf(x, m) { return Math.exp(-0.5 * (x - m) * (x - m)) / Math.sqrt(2 * Math.PI); }
function logLik(mu) { let s = 0; for (let x of xs) s += Math.log(Math.max(1e-300, W_MIX[0] * npdf(x, mu[0]) + W_MIX[1] * npdf(x, mu[1]))); return s; }
function posterior(mu) { return xs.map((x) => { let a = W_MIX[0] * npdf(x, mu[0]), b = W_MIX[1] * npdf(x, mu[1]), s = Math.max(a + b, 1e-300); return [a / s, b / s]; }); }   // ★ E ステップ
function mStep(r) { return [0, 1].map((k) => { let sw = 0, sx = 0; r.forEach((ri, i) => { sw += ri[k]; sx += ri[k] * xs[i]; }); return sw > 1e-12 ? sx / sw : 0; }); }   // ★ M ステップ：重みつき平均
function freeEnergy(r, mu) {             // F(r, μ) = Σ_i Σ_k r_ik log(w_k N(x_i; μ_k) / r_ik)
  let s = 0; xs.forEach((x, i) => { for (let k = 0; k < 2; k++) if (r[i][k] > 0) s += r[i][k] * Math.log(Math.max(1e-300, W_MIX[k] * npdf(x, mu[k])) / r[i][k]); }); return s;
}
function halfStep() {
  if (phase === 'E') { resp = posterior(muEM); phase = 'M'; }
  else { muEM = mStep(resp); phase = 'E'; pathEM.push(muEM.slice()); logLs.push(logLik(muEM)); if (pathEM.length > 200) { pathEM.shift(); logLs.shift(); } }
}

function draw() {
  background(...BG);
  hudTitle('EM 法は 2 つの射影：E ステップ（e-射影）と M ステップ（m-射影）', 'クリック 右の平面で出発点　スペース 半歩（次は ' + phase + ' ステップ）　A 自動 ' + (auto ? 'ON' : 'OFF') + '　D 新しいデータ　R 出発点にもどる');
  if (auto && ++tick % 20 === 0) halfStep();
  if (fKey !== seedD + '/' + width) { fKey = seedD + '/' + width; freeField(field); let topL = logLik(TRUE_MU) + 5; field = gridField(pb, (a, b) => Math.log1p(Math.max(0, topL - logLik([a, b]))), { level: 0.4, vmax: 6, cap: 5.8, c0: [60, 85, 125], c1: [24, 34, 54], res: 4 }); }
  // ---- 右：(μ1, μ2) 平面と log L の等高線、EM の道
  drawField(field); drawAxes(pb, 'μ1', 'μ2　（log L の等高線）');
  stroke(...DIMC, 120); strokeWeight(1); let [d1x, d1y] = toScr(pb, -4, -4), [d2x, d2y] = toScr(pb, 4, 4); line(d1x, d1y, d2x, d2y);
  plotLine(pb, pathEM, ORANGE, 2.5);
  for (let P of pathEM) { let [x, y] = toScr(pb, P[0], P[1]); noStroke(); fill(...ORANGE); circle(x, y, 5); }
  let [cx, cy] = toScr(pb, muEM[0], muEM[1]); fill(...(phase === 'M' ? VIOLET : ORANGE)); stroke(...BG); strokeWeight(2); circle(cx, cy, 14);
  noStroke(); fill(...DIMC); textSize(13); textAlign(LEFT, TOP); text('対角線 μ1 = μ2 をはさんで山が 2 つ（ラベルの入れかえ）。重みがちがうので高さがちがう', pb.x, pb.y + pb.h + 34, pb.w);
  // ---- 左上：データのヒストグラムと混合分布
  let b1 = plotBox(70, 110, width * 0.42, height * 0.33, -6, 6, 0, 0.45), bins = new Array(48).fill(0);
  for (let x of xs) { let i = Math.floor((x + 6) / 0.25); if (i >= 0 && i < 48) bins[i]++; }
  drawAxes(b1, 'x（データ ' + N_DATA + ' 個、点の色 = r_i1 の割合）', '密度');
  noStroke(); fill(...WIRE); for (let i = 0; i < 48; i++) { let h = bins[i] / (N_DATA * 0.25), [x0, y0] = toScr(b1, -6 + i * 0.25, h), [x1] = toScr(b1, -6 + (i + 1) * 0.25, 0); rect(x0, y0, x1 - x0 - 1, b1.y + b1.h - y0); }
  let c0 = [], c1 = [], cm = []; for (let k = 0; k <= 240; k++) { let x = -6 + k / 20, a = W_MIX[0] * npdf(x, muEM[0]), b = W_MIX[1] * npdf(x, muEM[1]); c0.push([x, a]); c1.push([x, b]); cm.push([x, a + b]); }
  plotLine(b1, c0, ORANGE, 2); plotLine(b1, c1, VIOLET, 2); plotLine(b1, cm, INK, 2.5);
  xs.forEach((x, i) => { let [sx] = toScr(b1, x, 0); let t = resp[i] ? resp[i][0] : 0.5; noStroke(); fill(ORANGE[0] * t + VIOLET[0] * (1 - t), ORANGE[1] * t + VIOLET[1] * (1 - t), ORANGE[2] * t + VIOLET[2] * (1 - t)); circle(sx, b1.y + b1.h - 6 - (i % 5) * 4, 5); });
  // ---- 左下：log L と F
  let L = logLik(muEM), F = freeEnergy(resp, muEM), lo = Math.min(...logLs) - 1, hi = Math.max(...logLs) + 1;
  let b2 = plotBox(70, height * 0.6, width * 0.42, height * 0.25, 0, Math.max(10, logLs.length - 1), lo, hi);
  drawAxes(b2, 'くり返し（M ステップの回数）', 'log L：必ず増えるか同じ');
  plotLine(b2, logLs.map((v, i) => [i, v]), LIME, 2.5);
  noStroke(); textAlign(LEFT, BASELINE); textSize(15); let ty = b2.y + b2.h + 50;
  fill(...INK); text('μ = (' + fmtN(muEM[0], 3) + ', ' + fmtN(muEM[1], 3) + ')　log L = ' + fmtN(L, 4) + '　F = ' + fmtN(F, 4), 70, ty);
  fill(...(phase === 'M' ? VIOLET : ORANGE)); text(phase === 'M' ? 'E ステップ直後：すき間 log L − F = ' + fmtN(L - F, 8) + '（ぴったり 0）' : 'M ステップ直後：すき間 log L − F = ' + fmtN(L - F, 6) + '（次の E で 0 に）', 70, ty + 24);
  drawSelfTest(width - 180, height - 14);
}
function mousePressed() { if (inRect(mouseX, mouseY, pb)) { let [a, b] = fromScr(pb, mouseX, mouseY); startMu = [clampv(a, -4, 4), clampv(b, -4, 4)]; restart(); } }
function keyPressed() {
  if (key === ' ') { auto = false; halfStep(); }
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'd' || key === 'D') { seedD++; makeData(); restart(); }
  if (key === 'r' || key === 'R') restart();
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  makeData(); seedRng(99);
  let okMono = true, okGap0 = true, okGap = true, okMmax = true, okDecomp = true;
  for (let s = 0; s < 10; s++) {
    let mu = [rnd() * 8 - 4, rnd() * 8 - 4], prev = logLik(mu);
    for (let it = 0; it < 60; it++) {
      let r = posterior(mu);
      if (Math.abs(freeEnergy(r, mu) - logLik(mu)) > 1e-9) okGap0 = false;          // E の直後は F = log L
      let mu2 = mStep(r), F2 = freeEnergy(r, mu2);
      for (let k = 0; k < 2; k++) for (let e of [-1e-3, 1e-3]) { let m3 = mu2.slice(); m3[k] += e; if (freeEnergy(r, m3) > F2) okMmax = false; }
      if (F2 > logLik(mu2) + 1e-9) okGap = false;                                     // いつも F ≤ log L
      let post = posterior(mu2), kl = r.reduce((s2, ri, i) => s2 + divKL(ri, post[i]), 0);
      if (Math.abs(logLik(mu2) - F2 - kl) > 1e-8) okDecomp = false;
      mu = mu2; let now = logLik(mu); if (now < prev - 1e-9) okMono = false; prev = now;
    }
  }
  check('10 か所から 60 回ずつ：log L は一度も減らない', okMono);
  check('E ステップの直後は F = log L（誤差 1e-9）、いつも F ≤ log L', okGap0 && okGap);
  check('M ステップの重みつき平均は F を最大にする（±0.001 ずらすと必ず下がる）', okMmax);
  check('log L − F = Σ KL(r_i ‖ 事後確率_i)（誤差 1e-8）', okDecomp);
  let mu = [-3, 3]; for (let it = 0; it < 400; it++) mu = mStep(posterior(mu));
  let h = 1e-5, g1 = (logLik([mu[0] + h, mu[1]]) - logLik([mu[0] - h, mu[1]])) / (2 * h), g2 = (logLik([mu[0], mu[1] + h]) - logLik([mu[0], mu[1] - h])) / (2 * h);
  check('収束した点では log L の傾き ≈ 0（' + fmtN(Math.abs(g1) + Math.abs(g2), 6) + '）、答え ≈ 本当の平均 (' + fmtN(mu[0], 2) + ', ' + fmtN(mu[1], 2) + ')', Math.abs(g1) + Math.abs(g2) < 1e-4 && Math.abs(mu[0] - TRUE_MU[0]) < 0.5 && Math.abs(mu[1] - TRUE_MU[1]) < 0.5);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 対角線の向こう側（μ1 > μ2）から出発すると、どちらの山に着く？ log L は本当の答えより低い？
// 2. 対角線のちょうど上から出発すると？（2 つの山が同じ平均のまま動けない「鞍点」）
// 3. TRUE_MU を [-0.5, 0.5] に近づけると、EM はゆっくりになる。等高線の形と比べよう
// 4. W_MIX を [0.5, 0.5] にすると、2 つの山の高さは同じになる？
// 5. 分散 σ も未知にすると、1 点に山が縮んで log L → ∞ になることがある。どう防ぐ？

// ==================================================
// ここから下は「情報幾何の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 色と小さな道具（等高線地図の色）
const BG = [22, 33, 52];                // 背景（深いスレートブルー）
const INK = [240, 236, 226];            // 文字（紙の白）
const ORANGE = [255, 150, 75], VIOLET = [170, 140, 255], TEAL = [95, 205, 190], ROSE = [255, 110, 125], LIME = [150, 225, 120], SAND = [235, 210, 150];
const DIMC = [140, 152, 175], PANEL = [32, 46, 70], WIRE = [62, 80, 110];
const OUTC = [[255, 150, 75], [95, 205, 190], [170, 140, 255], [235, 210, 150], [255, 110, 125], [150, 225, 120], [120, 175, 255], [230, 140, 210]];   // 結果ごとの色
function clampv(v, a, b) { return v < a ? a : v > b ? b : v !== v ? a : v; }     // NaN なら a に戻す
function fmtN(v, d) { if (typeof v !== 'number' || v !== v) return '?'; if (!isFinite(v)) return v > 0 ? '∞' : '−∞'; return v.toFixed(d === undefined ? 2 : d); }
function fmtP(p, d) { return '(' + p.map((v) => fmtN(v, d === undefined ? 2 : d)).join(', ') + ')'; }
function hudTitle(t, sub) {              // 左上のタイトルと操作の説明
  noStroke(); fill(...INK); textSize(22); textAlign(LEFT, BASELINE); text(t, 30, 38);
  fill(...DIMC); textSize(14); textLeading(19); text(sub, 30, 62);
}
function inRect(x, y, r) { return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; }
function drawField(f) { if (f) image(f.img, f.x, f.y, f.w, f.h); }   // 等高線の地図（画像）を描く
function freeField(f) { if (f && f.img) f.img.remove(); }
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
function gaussRnd() { let u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }   // 標準正規分布（ボックス-ミュラー法）
function rndDist(k, floor) {            // でたらめな確率分布（k 個、どれも floor 以上）
  let p = []; for (let i = 0; i < k; i++) p.push(-Math.log(1 - rnd()) + 1e-9);
  return mixFloor(normP(p), floor || 0);
}
function sampleIndex(p) { let u = rnd(), c = 0; for (let i = 0; i < p.length; i++) { c += p[i]; if (u < c) return i; } return p.length - 1; }
// ---- 情報の道具：確率分布 p = [p1, p2, ...]（合計 1）。log(0) は 0·log 0 = 0 として扱う
const TINY = 1e-300;
function normP(p) { let s = 0; for (let v of p) s += Math.max(0, v); if (!(s > 0)) return p.map(() => 1 / p.length); return p.map((v) => Math.max(0, v) / s); }
function mixFloor(p, f) { if (!f) return p; return normP(p.map((v) => Math.max(v, f))); }   // どの確率も f 以上に（0 を避ける）
function safeLog(v) { return Math.log(Math.max(v, TINY)); }
function entropyH(p) { let h = 0; for (let v of p) if (v > 0) h -= v * Math.log(v); return h; }           // エントロピー（ナット）
function divKL(p, q) {                  // KL ダイバージェンス D(p‖q)（ナット）。q が 0 で p > 0 なら ∞
  let d = 0;
  for (let i = 0; i < p.length; i++) { if (p[i] <= 0) continue; if (q[i] <= 0) return Infinity; d += p[i] * Math.log(p[i] / q[i]); }
  return Math.max(0, d);
}
function crossH(p, q) { let h = 0; for (let i = 0; i < p.length; i++) if (p[i] > 0) h -= p[i] * safeLog(q[i]); return h; }  // 交差エントロピー
function bhatta(p, q) { let s = 0; for (let i = 0; i < p.length; i++) s += Math.sqrt(Math.max(0, p[i] * q[i])); return Math.min(1, s); }
function fisherRao(p, q) { return 2 * Math.acos(clampv(bhatta(p, q), -1, 1)); }                          // フィッシャー-ラオ距離 = 球の大円の長さ
function hellingerSq(p, q) { let s = 0; for (let i = 0; i < p.length; i++) { let d = Math.sqrt(p[i]) - Math.sqrt(q[i]); s += d * d; } return s; }   // Σ(√p − √q)²
function tvDist(p, q) { let s = 0; for (let i = 0; i < p.length; i++) s += Math.abs(p[i] - q[i]); return s / 2; }
function alphaDiv(p, q, a) {            // α-ダイバージェンス（甘利の流儀）。α → −1 で D(p‖q)、α → +1 で D(q‖p)
  if (Math.abs(a + 1) < 1e-12) return divKL(p, q);
  if (Math.abs(a - 1) < 1e-12) return divKL(q, p);
  let s = 0, ea = (1 - a) / 2, eb = (1 + a) / 2;
  for (let i = 0; i < p.length; i++) s += Math.pow(Math.max(p[i], 0), ea) * Math.pow(Math.max(q[i], 0), eb);
  return Math.max(0, (4 / (1 - a * a)) * (1 - s));
}
function mixM(p, q, t) { return p.map((v, i) => (1 - t) * v + t * q[i]); }                       // m-測地線：確率をそのまま混ぜる
function mixE(p, q, t) { return normP(p.map((v, i) => Math.exp((1 - t) * safeLog(v) + t * safeLog(q[i])))); }   // e-測地線：対数で混ぜて正規化
function mixAlpha(p, q, t, a) {         // α-測地線：u^((1−α)/2) で混ぜて正規化（α = −1 は m、α = +1 は e）
  if (Math.abs(a - 1) < 1e-9) return mixE(p, q, t);
  let ex = (1 - a) / 2;
  return normP(p.map((v, i) => Math.pow((1 - t) * Math.pow(v, ex) + t * Math.pow(q[i], ex), 1 / ex)));
}
function bitsOf(nat) { return nat / Math.LN2; }
// ---- 2 次元の図の枠（データ座標 ↔ 画面）
function plotBox(x, y, w, h, x0, x1, y0, y1) { return { x, y, w, h, x0, x1, y0, y1 }; }
function toScr(b, u, v) { return [b.x + ((u - b.x0) / (b.x1 - b.x0)) * b.w, b.y + b.h - ((v - b.y0) / (b.y1 - b.y0)) * b.h]; }
function fromScr(b, sx, sy) { return [b.x0 + ((sx - b.x) / b.w) * (b.x1 - b.x0), b.y0 + ((b.y + b.h - sy) / b.h) * (b.y1 - b.y0)]; }
function drawAxes(b, xl, yl) {
  noFill(); stroke(...WIRE); strokeWeight(1); rect(b.x, b.y, b.w, b.h);
  noStroke(); fill(...DIMC); textSize(12); textAlign(CENTER, TOP); text(xl, b.x + b.w / 2, b.y + b.h + 16);
  textAlign(LEFT, TOP); text(fmtN(b.x0, 1), b.x, b.y + b.h + 3); textAlign(RIGHT, TOP); text(fmtN(b.x1, 1), b.x + b.w, b.y + b.h + 3);
  textAlign(RIGHT, CENTER); text(fmtN(b.y0, 1), b.x - 4, b.y + b.h); text(fmtN(b.y1, 1), b.x - 4, b.y); textAlign(LEFT, BOTTOM); text(yl, b.x, b.y - 4);
}
function plotLine(b, pts, col, w) {      // データ座標の点列を折れ線に（枠の外の部分は枠のふちで切る）
  if (!pts || pts.length < 2) return;
  noFill(); stroke(...col); strokeWeight(w || 2);
  let run = [], x0 = b.x - 1, x1 = b.x + b.w + 1, y0 = b.y - 1, y1 = b.y + b.h + 1;
  let flush = () => { if (run.length >= 2) { beginShape(); for (let q of run) vertex(q[0], q[1]); endShape(); } run = []; };
  let clip = (a, c) => {                 // 線分 a→c の枠の中の部分 [t0, t1]（リャン-バースキー法）。なければ null
    let t0 = 0, t1 = 1, dx = c[0] - a[0], dy = c[1] - a[1];
    for (let [p, q] of [[-dx, a[0] - x0], [dx, x1 - a[0]], [-dy, a[1] - y0], [dy, y1 - a[1]]]) {
      if (p === 0) { if (q < 0) return null; continue; }
      let r = q / p; if (p < 0) t0 = Math.max(t0, r); else t1 = Math.min(t1, r);
    }
    return t0 <= t1 ? [t0, t1] : null;
  };
  let prev = null;
  for (let p of pts) {
    let s = toScr(b, p[0], p[1]);
    if (!(s[0] === s[0] && s[1] === s[1] && isFinite(s[0]) && isFinite(s[1]))) { flush(); prev = null; continue; }
    if (prev) {
      let c = clip(prev, s);
      if (!c) flush();
      else {
        let A = [prev[0] + c[0] * (s[0] - prev[0]), prev[1] + c[0] * (s[1] - prev[1])], B = [prev[0] + c[1] * (s[0] - prev[0]), prev[1] + c[1] * (s[1] - prev[1])];
        if (c[0] > 0) { flush(); run.push(A); } else if (!run.length) run.push(A);
        run.push(B);
        if (c[1] < 1) flush();
      }
    }
    prev = s;
  }
  flush(); noStroke();                  // あとの文字にふちがつかないように
}
function gridField(b, fn, opt) {        // 長方形の上の等高線の地図（fn(u, v)）
  opt = opt || {};
  let res = opt.res || 3, gw = Math.ceil(b.w / res), gh = Math.ceil(b.h / res), g = createGraphics(gw, gh); g.pixelDensity(1); g.loadPixels();
  let vals = new Float64Array(gw * gh), lv = opt.level || 0.1, vmin = opt.vmin || 0, vmax = opt.vmax || 1, c0 = opt.c0 || [40, 60, 95], c1 = opt.c1 || ORANGE;
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) { let [u, v] = fromScr(b, b.x + (i + 0.5) * res, b.y + (j + 0.5) * res); vals[j * gw + i] = fn(u, v); }
  let bandOf = (v) => Math.floor(clampv((v - vmin) / lv, -1e6, 1e6));
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    let k = j * gw + i, v = vals[k], o = 4 * k, band = bandOf(v), t = clampv((v - vmin) / (vmax - vmin), 0, 1), sh = band % 2 ? 0.9 : 1;
    let edge = v < (opt.cap || Infinity) && ((i + 1 < gw && bandOf(vals[k + 1]) !== band) || (j + 1 < gh && bandOf(vals[k + gw]) !== band));
    for (let c = 0; c < 3; c++) g.pixels[o + c] = edge ? 235 : (c0[c] + (c1[c] - c0[c]) * t) * sh;
    g.pixels[o + 3] = edge ? 170 : 255;
  }
  g.updatePixels();
  return { img: g, x: b.x, y: b.y, w: b.w, h: b.h };
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestOk() { return selfTestResults.every((r) => r.ok); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(...(selfTestOk() ? LIME : ROSE)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
