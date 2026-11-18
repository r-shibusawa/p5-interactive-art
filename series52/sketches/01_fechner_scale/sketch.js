// ============================================
// 01 フェヒナーの法則 ─ JND を積み上げると対数になる
// 光の量 I が JND（ΔI = k·I）ずつ増えるたびに「感じ」が 1 段上がるとすると、段の数 n = ln(I/I₀) ÷ ln(1 + k)（対数）
// 上：灰色の階段を「光の量で等間隔」「対数で等間隔（フェヒナー）」「L*（べき 1/3）」で並べて比べる
// 右：二分法の実験。両はしの灰色の「ちょうど真ん中」に見える灰色を ←→（細かく）↑↓（大きく）で選び、スペースで決定。7 回で自分の尺度ができる
// O = シミュレーション観察者 / R = やり直し
// ============================================

const L_LO = 0.005, L_HI = 1;          // ★ いちばん暗い・明るい光の量（画面の白 = 1）
const STEPS = 8;                       // ★ 灰色の階段の段数
const JND_K = 0.25;                    // ★ 左下の図の JND の比 k（実際は 0.01〜0.08 くらい。見やすく大きめ）
const SIM = { gamma: 0.4, noise: 0.02 };   // ★ シミュレーション観察者：感じ = I^γ、真ん中を選ぶときのゆらぎ
const ORDER = [[0, 1], [0, 0.5], [0.5, 1], [0, 0.25], [0.25, 0.5], [0.5, 0.75], [0.75, 1]];   // 二分する区間（感じの目盛り）
let lum = {}, qi = 0, mid = 0.2, fitG = null, simMode = false, simSeed = 1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  resetData(false);
}
function resetData(sim) { simMode = sim; lum = { 0: L_LO, 1: L_HI }; qi = 0; fitG = null; seedRng(Date.now()); newMid(); }
function newMid() {                    // 最初の位置は区間の中のランダムな所（かたよりを防ぐ）
  if (qi >= ORDER.length) return;
  let a = lum[ORDER[qi][0]], b = lum[ORDER[qi][1]];
  mid = Math.exp(Math.log(a) + (0.2 + 0.6 * rnd()) * (Math.log(b) - Math.log(a)));
}
function accept() {
  if (qi >= ORDER.length) return;
  let q = ORDER[qi]; lum[(q[0] + q[1]) / 2] = mid; qi++; newMid(); fitG = fitGamma(lum);
}

// 感じ S = (I^γ − I₀^γ) ÷ (I₁^γ − I₀^γ)。γ → 0 の極限が対数（フェヒナー）、γ = 1 が物理的に等間隔
function senseOf(I, g) {
  if (Math.abs(g) < 1e-6) return Math.log(I / L_LO) / Math.log(L_HI / L_LO);
  return (Math.pow(I, g) - Math.pow(L_LO, g)) / (Math.pow(L_HI, g) - Math.pow(L_LO, g));
}
function lumOf(S, g) {                 // senseOf の逆
  S = clampv(S, 0, 1);
  if (Math.abs(g) < 1e-6) return L_LO * Math.pow(L_HI / L_LO, S);
  return Math.pow(Math.pow(L_LO, g) + S * (Math.pow(L_HI, g) - Math.pow(L_LO, g)), 1 / g);
}
// 自分の点 (I, S) に γ を当てはめる（二乗誤差が最小の γ を黄金分割探索で）
function fitGamma(m) {
  let pts = Object.keys(m).map(Number).filter((s) => s > 0 && s < 1).map((s) => [m[s], s]);
  if (pts.length < 1) return null;
  let err = (g) => pts.reduce((e, p) => e + (senseOf(p[0], g) - p[1]) ** 2, 0);
  let a = 0.001, b = 1.5, r = (Math.sqrt(5) - 1) / 2;
  for (let i = 0; i < 80; i++) { let c = b - r * (b - a), d = a + r * (b - a); if (err(c) < err(d)) b = d; else a = c; }
  let g = (a + b) / 2;
  return { g, rms: Math.sqrt(err(g) / pts.length), pts };
}
// シミュレーション観察者：感じの真ん中 (Sa + Sb)/2 にゆらぎを足し、その感じの明るさを選ぶ
function simPick(a, b) { let S = (senseOf(a, SIM.gamma) + senseOf(b, SIM.gamma)) / 2 + SIM.noise * rndNormal(); return lumOf(S, SIM.gamma); }
function runSim(seed) {
  resetData(true); seedRng(seed);
  for (let q of ORDER) lum[(q[0] + q[1]) / 2] = simPick(lum[q[0]], lum[q[1]]);
  qi = ORDER.length; fitG = fitGamma(lum);
}
function gray(I) { return linToSrgb(I); }

function draw() {
  background(30, 32, 40);
  fill(235); noStroke(); textSize(18);
  text('←→ 細かく　↑↓ 大きく　スペース：真ん中に決定　O：シミュレーション観察者　R：やり直し', 20, 36);
  fill(170); textSize(15);
  text('JND は光の量に比例（ウェーバー）→ JND の数で数えた「感じ」は対数（フェヒナー）。自分の目で真ん中を選んで確かめる', 20, 62);

  // ---- 3 つの階段
  let sw = Math.min(70, (width * 0.5) / STEPS), y = 90;
  let rows = [['光の量で等間隔', (t) => L_LO + t * (L_HI - L_LO)], ['対数で等間隔（フェヒナー）', (t) => L_LO * Math.pow(L_HI / L_LO, t)], ['L* で等間隔（べき 1/3）', (t) => lstarToY(lerpL(t))]];
  rows.forEach((r, k) => {
    fill(200); textSize(14); text(r[0], 20, y + k * 78 + 14);
    for (let i = 0; i < STEPS; i++) { let I = r[1](i / (STEPS - 1)); fill(gray(I)); rect(20 + i * sw, y + k * 78 + 22, sw, 46); }
  });
  // ---- JND の階段 → 対数（左下）
  let g1 = { x: 60, y: y + 270, w: width * 0.42, h: height - y - 370, x0: 0, x1: L_HI, y0: 0, y1: Math.log(L_HI / L_LO) / Math.log(1 + JND_K) };
  plotAxes(g1, '光の量 I', 'JND の数 n', [0, 0.25, 0.5, 0.75, 1], [0, Math.round(g1.y1 / 2), Math.floor(g1.y1)]);
  stroke(120, 190, 255); strokeWeight(2);
  let pts = [], I = L_LO, n = 0;
  while (I * (1 + JND_K) <= L_HI) { pts.push([gX(g1, I), gY(g1, n)]); I *= 1 + JND_K; pts.push([gX(g1, I), gY(g1, n)]); n++; pts.push([gX(g1, I), gY(g1, n)]); }
  polyline(pts);
  stroke(255, 170, 90); strokeWeight(2.5); pts = [];
  for (let i = 0; i <= 200; i++) { let x = L_LO + (i / 200) * (L_HI - L_LO); pts.push([gX(g1, x), gY(g1, Math.log(x / L_LO) / Math.log(1 + JND_K))]); }
  polyline(pts);
  noStroke(); fill(180); textSize(13); text('青：I を 1 + k 倍するごとに 1 段（k = ' + JND_K + '）　橙：n = ln(I/I₀) ÷ ln(1 + k)', g1.x, g1.y + g1.h + 46);

  // ---- 二分法の実験（右上）
  let ex = width * 0.56, ey = 100, pw = 110;
  fill(gray(0.18)); rect(ex - 20, ey - 20, pw * 3 + 80, pw + 40);   // まわりは一定の灰色
  if (qi < ORDER.length) {
    let q = ORDER[qi];
    fill(gray(lum[q[0]])); rect(ex, ey, pw, pw); fill(gray(mid)); rect(ex + pw + 20, ey, pw, pw); fill(gray(lum[q[1]])); rect(ex + 2 * pw + 40, ey, pw, pw);
    fill(220); textSize(15);
    text((simMode ? '' : 'まん中の灰色が、左右の「ちょうど真ん中」に見えるように　') + (qi + 1) + ' / ' + ORDER.length + '（感じ ' + q[0] + ' と ' + q[1] + ' の間）', ex - 20, ey + pw + 50);
  } else { fill(220); textSize(16); text(simMode ? 'シミュレーション観察者の結果' : 'できた！ これが自分の明るさの尺度。R でもう一度', ex - 20, ey + pw + 50); }

  // ---- 自分の尺度のグラフ（右下）
  let g2 = { x: ex + 20, y: ey + pw + 90, w: width * 0.38, h: height - ey - pw - 210, x0: 0, x1: 1, y0: 0, y1: 1 };
  plotAxes(g2, '光の量 I', '感じ S（0〜1）', [0, 0.25, 0.5, 0.75, 1], [0, 0.25, 0.5, 0.75, 1]);
  let curve2 = (gm, c, w) => { stroke(c); strokeWeight(w); let p = []; for (let i = 0; i <= 200; i++) { let x = L_LO + Math.pow(i / 200, 2) * (L_HI - L_LO); p.push([gX(g2, x), gY(g2, senseOf(x, gm))]); } polyline(p); };
  curve2(1, color(110), 1.5); curve2(0, color(200, 120, 255), 1.5);
  if (simMode) curve2(SIM.gamma, color(120, 200, 140), 1.5);
  if (fitG) curve2(fitG.g, color(255, 170, 90), 3);
  noStroke(); fill(120, 190, 255);
  for (let s in lum) circle(gX(g2, lum[s]), gY(g2, +s), 10);
  fill(235); textSize(16);
  text(fitG ? '当てはめ：S ∝ I^γ　γ = ' + fitG.g.toFixed(3) + '（誤差 ' + fitG.rms.toFixed(3) + '）' : 'スペースで真ん中を決めると点がふえる', g2.x, g2.y + g2.h + 44);
  textSize(13); fill(170);
  text('灰：γ = 1（物理的に等間隔）　紫：γ → 0（対数 = フェヒナー）' + (simMode ? '　緑：本当の γ = ' + SIM.gamma : ''), g2.x, g2.y + g2.h + 66);
  fill(selfTestResults.every((r) => r.ok) ? color(120, 210, 150) : color(255, 90, 90)); textSize(14);
  text(selfTestLine(), 20, height - 12);
}
function lerpL(t) { let a = 116 * Math.cbrt(L_LO) - 16; return a + t * (100 - a); }   // L* の範囲（暗い所は近似）
function lstarToY(Ls) { return Math.pow((Ls + 16) / 116, 3); }

function keyPressed() {
  if (key === LEFT_ARROW) mid = clampv(mid / 1.02, L_LO, L_HI);
  if (key === RIGHT_ARROW) mid = clampv(mid * 1.02, L_LO, L_HI);
  if (key === DOWN_ARROW) mid = clampv(mid / 1.15, L_LO, L_HI);
  if (key === UP_ARROW) mid = clampv(mid * 1.15, L_LO, L_HI);
  if (key === ' ') accept();
  if (key === 'o' || key === 'O') runSim(++simSeed);
  if (key === 'r' || key === 'R') resetData(false);
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  check('sRGB ⇔ 光の量：0 → 0、255 → 1、128 → 0.216 → 128', near(srgbToLin(0), 0) && near(srgbToLin(255), 1) && near(srgbToLin(128), 0.2158605, 1e-6) && near(linToSrgb(srgbToLin(128)), 128, 1e-9));
  let I = L_LO, n = 0; while (I * (1 + 0.1) <= L_HI) { I *= 1.1; n++; }
  check('JND を n 回積むと I₀(1 + k)ⁿ：n = ⌊ln(I₁/I₀) ÷ ln 1.1⌋ = ' + n, n === Math.floor(Math.log(L_HI / L_LO) / Math.log(1.1)) && near(I, L_LO * Math.pow(1.1, n), 1e-12));
  check('γ → 0 の極限は対数：S(γ = 0.0001) ≈ S(対数)', near(senseOf(0.07, 1e-4), senseOf(0.07, 0), 1e-3));
  check('lumOf は senseOf の逆（γ = 0.4、S = 0.3）', near(senseOf(lumOf(0.3, 0.4), 0.4), 0.3, 1e-12));
  let m = { 0: L_LO, 1: L_HI }; for (let q of ORDER) m[(q[0] + q[1]) / 2] = lumOf((q[0] + q[1]) / 2, 0.4);
  check('ゆらぎのない観察者（γ = 0.4）の 7 点から γ = 0.400 を復元', fitGamma(m) && near(fitGamma(m).g, 0.4, 1e-3));
  seedRng(52); m = { 0: L_LO, 1: L_HI }; for (let q of ORDER) m[(q[0] + q[1]) / 2] = simPick(m[q[0]], m[q[1]]);
  check('シミュレーション観察者（ゆらぎ 0.02）：γ ≈ 0.4（±0.1）', fitGamma(m) && near(fitGamma(m).g, 0.4, 0.1));
  check('対数の階段は比が一定（となりの段の比がどこでも同じ）', near((L_LO * Math.pow(L_HI / L_LO, 2 / 7)) / (L_LO * Math.pow(L_HI / L_LO, 1 / 7)), Math.pow(L_HI / L_LO, 1 / 7), 1e-9));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 3 つの階段のうち、段の差がいちばん「そろって」見えるのはどれ？
// 2. 7 回の二分法で自分の γ を出そう。0（対数）と 1（物理的に等間隔）のどちらに近い？
// 3. まわりの灰色（gray(0.18)）を黒や白に変えると、真ん中の選び方は変わる？
// 4. JND_K を 0.05 にすると左下の階段は何段になる？ 実際の明るさの JND（1〜2%）なら？
// 5. 画面の明るさ設定を変えて測り直すと γ は変わる？ 画面ごとのちがいも考えよう


// ==================================================
// ここから下は「心理物理の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 種つきの乱数（同じ種なら毎回同じ列）。シミュレーション観察者と自己テストで使う
let rngState = 1;
function seedRng(s) { rngState = (s >>> 0) || 1; }
function rnd() {                       // 0〜1 の一様乱数（mulberry32）
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rndNormal() { let u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }   // 標準正規分布
function shuffleArr(a) { for (let i = a.length - 1; i > 0; i--) { let j = Math.floor(rnd() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
// ---- 正規分布：Φ（累積分布）と z（その逆関数。二分法で数値的に解く）
function erfA(x) {                     // 誤差関数（Abramowitz & Stegun 7.1.26、誤差 1.5e-7 以下）
  let s = x < 0 ? -1 : 1; x = Math.abs(x);
  let t = 1 / (1 + 0.3275911 * x);
  let y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return s * y;
}
function Phi(x) { return 0.5 * (1 + erfA(x / Math.SQRT2)); }
function zOf(p) {                      // Φ(z) = p となる z
  p = clampv(p, 1e-9, 1 - 1e-9);
  let lo = -9, hi = 9;
  for (let i = 0; i < 70; i++) { let m = (lo + hi) / 2; if (Phi(m) < p) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
// 割合を 1/(2N) で補正（0 や 1 だと z が無限大になるので）
function rateFix(k, n) { return n > 0 ? clampv(k / n, 1 / (2 * n), 1 - 1 / (2 * n)) : 0.5; }
// ---- 画面の値 sRGB（0〜255）⇔ 光の量（0〜1、線形）。画面の値 128 は光の量では約 0.22
function srgbToLin(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function linToSrgb(v) { v = clampv(v, 0, 1); return 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055); }
// ---- グラフの道具：g = { x, y, w, h, x0, x1, y0, y1, logx, logy }
function gX(g, v) { let t = g.logx ? (Math.log(v) - Math.log(g.x0)) / (Math.log(g.x1) - Math.log(g.x0)) : (v - g.x0) / (g.x1 - g.x0); return g.x + clampv(t, -0.02, 1.02) * g.w; }
function gY(g, v) { let t = g.logy ? (Math.log(v) - Math.log(g.y0)) / (Math.log(g.y1) - Math.log(g.y0)) : (v - g.y0) / (g.y1 - g.y0); return g.y + g.h - clampv(t, -0.02, 1.02) * g.h; }
function plotAxes(g, xl, yl, xt, yt) {
  stroke(95); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h);
  noStroke(); fill(165); textSize(12); textAlign(CENTER, TOP);
  for (let v of xt) text(+v.toPrecision(3), gX(g, v), g.y + g.h + 4);
  textAlign(RIGHT, CENTER);
  for (let v of yt) text(+v.toPrecision(3), g.x - 5, gY(g, v));
  textAlign(LEFT, BASELINE); fill(205); textSize(13);
  text(xl, g.x + g.w - textWidth(xl), g.y + g.h + 32); text(yl, g.x, g.y - 8);
}
function polyline(pts) {               // 点が 2 つ以上あるときだけ折れ線を描く
  if (pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape();
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
