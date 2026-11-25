// ============================================
// 04 指数型分布族 ─ p(x; θ) = exp(θ·x − ψ(θ))（× 土台の重み）。ψ(θ) は合計を 1 にする「対数分配関数」
// 自然パラメータ θ と、期待値パラメータ η = E[x] = ∇ψ(θ) の 2 つの座標で同じ分布を表せる
// ψ の傾きが η、ψ をルジャンドル変換した φ(η) = θ·η − ψ(θ) の傾きが θ。ψ(θ) + φ(η) − θ·η = 0 がいつも成り立つ
// 1 ベルヌーイ 2 ポアソン 3 3 値のカテゴリ 4 正規分布 / 左（θ）か右（η）をドラッグ：もう片方が動く / スペース 自動で動かす
// ============================================

const FAMS = [
  { name: 'ベルヌーイ（コイン）', dim: 1, th: [-5, 5], et: [0, 1], start: [0.8],
    psi: (t) => (t[0] > 0 ? t[0] + Math.log1p(Math.exp(-t[0])) : Math.log1p(Math.exp(t[0]))),
    eta: (t) => [1 / (1 + Math.exp(-t[0]))], phi: (e) => xlogx(e[0]) + xlogx(1 - e[0]), theta: (e) => [Math.log(e[0] / (1 - e[0]))] },
  { name: 'ポアソン（回数）', dim: 1, th: [-3, 2.5], et: [0, 12], start: [1],
    psi: (t) => Math.exp(t[0]), eta: (t) => [Math.exp(t[0])], phi: (e) => xlogx(e[0]) - e[0], theta: (e) => [Math.log(e[0])] },
  { name: '3 値のカテゴリ（x = 1, 2, 3 の印）', dim: 2, th: [-4, 4, -4, 4], et: [0, 1, 0, 1], start: [1, -0.5],
    psi: (t) => Math.log(1 + Math.exp(t[0]) + Math.exp(t[1])), eta: (t) => { let z = 1 + Math.exp(t[0]) + Math.exp(t[1]); return [Math.exp(t[0]) / z, Math.exp(t[1]) / z]; },
    phi: (e) => xlogx(e[0]) + xlogx(e[1]) + xlogx(1 - e[0] - e[1]), theta: (e) => [Math.log(e[0] / (1 - e[0] - e[1])), Math.log(e[1] / (1 - e[0] - e[1]))] },
  { name: '正規分布（x と x² を数える）', dim: 2, th: [-3, 3, -3, -0.1], et: [-3, 3, 0, 12], start: [1, -0.5],
    psi: (t) => (-t[0] * t[0]) / (4 * t[1]) - 0.5 * Math.log(-2 * t[1]), eta: (t) => [-t[0] / (2 * t[1]), (t[0] * t[0]) / (4 * t[1] * t[1]) - 1 / (2 * t[1])],
    phi: (e) => -0.5 - 0.5 * Math.log(e[1] - e[0] * e[0]), theta: (e) => { let v = e[1] - e[0] * e[0]; return [e[0] / v, -1 / (2 * v)]; } },
];
let famK = 0, thetaVec = [0.8], etaVec = [0], boxL, boxR, grab = null, auto = false, tAuto = 0;

function xlogx(v) { return v > 0 ? v * Math.log(v) : 0; }
function fam() { return FAMS[famK]; }
function setTheta(t) { let f = fam(); thetaVec = clampTheta(f, t); etaVec = f.eta(thetaVec); }
function clampTheta(f, t) {              // 図の範囲・定義域の中に収める（正規分布は θ2 < 0、カテゴリと 1 次元は範囲内）
  let out = [clampv(t[0], f.th[0], f.th[1])];
  if (f.dim === 2) out.push(clampv(t[1], f.th[2], f.th[3]));   // 正規分布は θ2 < 0 が必要（上限 −0.1）
  return out;
}
function setEta(e) {
  let f = fam();
  if (f.dim === 1) e = [clampv(e[0], f.et[0] + 1e-3, f.et[1] - 1e-3)];
  else if (famK === 2) { let a = clampv(e[0], 0.003, 0.994), b = clampv(e[1], 0.003, 0.997 - a); e = [a, b]; }
  else { let m = clampv(e[0], -3, 3); e = [m, clampv(e[1], m * m + 0.17, Math.min(12, m * m + 5))]; }   // σ² = η2 − η1² を θ の範囲に合わせる
  setTheta(f.theta(e));
}
function setup() { createCanvas(windowWidth, windowHeight); selfTest(); layout(); setTheta(fam().start); }
function windowResized() { resizeCanvas(windowWidth, windowHeight); layout(); }
function layout() { let w = width * 0.4, h = height * 0.5; boxL = { x: 70, y: 110, w, h }; boxR = { x: width * 0.54, y: 110, w, h }; }
function boxes() {
  let f = fam();
  if (f.dim === 1) {
    let pl = f.th, el = f.et, ys = [], yt = [];
    for (let k = 0; k <= 100; k++) { ys.push(f.psi([pl[0] + ((pl[1] - pl[0]) * k) / 100])); yt.push(f.phi([el[0] + 1e-4 + ((el[1] - el[0] - 2e-4) * k) / 100])); }
    return [plotBox(boxL.x, boxL.y, boxL.w, boxL.h, pl[0], pl[1], Math.min(...ys) - 0.5, Math.max(...ys) + 0.5), plotBox(boxR.x, boxR.y, boxR.w, boxR.h, el[0], el[1], Math.min(...yt) - 0.5, Math.max(...yt) + 0.5)];
  }
  return [plotBox(boxL.x, boxL.y, boxL.w, boxL.h, f.th[0], f.th[1], f.th[2], f.th[3]), plotBox(boxR.x, boxR.y, boxR.w, boxR.h, f.et[0], f.et[1], f.et[2], f.et[3])];
}

function draw() {
  background(...BG);
  let f = fam();
  hudTitle('指数型分布族：θ 座標と η 座標　― ' + f.name, '1 ベルヌーイ　2 ポアソン　3 カテゴリ　4 正規分布　左（θ）か右（η）をドラッグ　スペース 自動 ' + (auto ? 'ON' : 'OFF'));
  if (auto) { tAuto += 0.01; let c = [0.5 * (f.th[0] + f.th[1]), f.dim === 2 ? 0.5 * (f.th[2] + f.th[3]) : 0]; setTheta([c[0] + 0.35 * (f.th[1] - f.th[0]) * Math.cos(tAuto), f.dim === 2 ? c[1] + 0.3 * (f.th[3] - f.th[2]) * Math.sin(1.3 * tAuto) : 0]); }
  let [bL, bR] = boxes();
  if (f.dim === 1) draw1D(f, bL, bR); else draw2D(f, bL, bR);
  // ---- 下：数値と分布
  let ps = f.psi(thetaVec), ph = f.phi(etaVec), te = thetaVec.reduce((s, v, i) => s + v * etaVec[i], 0), fd = thetaVec.map((_, i) => { let h = 1e-5, a = thetaVec.slice(), b = thetaVec.slice(); a[i] += h; b[i] -= h; return (f.psi(a) - f.psi(b)) / (2 * h); });
  let y0 = bL.y + bL.h + 60; noStroke(); textAlign(LEFT, BASELINE); textSize(16);
  fill(...ORANGE); text('θ = ' + fmtP(thetaVec, 3), 70, y0); fill(...VIOLET); text('η = ∇ψ(θ) = ' + fmtP(etaVec, 3) + '　（差分で ' + fmtP(fd, 3) + '）', 70, y0 + 26);
  fill(...INK); text('ψ(θ) = ' + fmtN(ps, 4) + '、φ(η) = ' + fmtN(ph, 4) + '、θ·η = ' + fmtN(te, 4), 70, y0 + 52);
  fill(...LIME); text('ψ(θ) + φ(η) − θ·η = ' + (ps + ph - te).toExponential(2) + '（いつも 0：ルジャンドル変換）', 70, y0 + 78);
  drawDist(f, { x: width * 0.6, y: y0 - 20, w: width * 0.34, h: height - y0 - 30 });
  drawSelfTest(width - 180, height - 14);
}
function draw1D(f, bL, bR) {             // ψ のグラフと接線（傾き η、切片 −φ）、φ のグラフと接線（傾き θ、切片 −ψ）
  let c1 = [], c2 = [];
  for (let k = 0; k <= 200; k++) { let t = bL.x0 + ((bL.x1 - bL.x0) * k) / 200; c1.push([t, f.psi([t])]); let e = bR.x0 + 1e-4 + ((bR.x1 - bR.x0 - 2e-4) * k) / 200; c2.push([e, f.phi([e])]); }
  drawAxes(bL, 'θ（自然パラメータ）', 'ψ(θ)：接線の傾き = η、切片 = −φ(η)'); drawAxes(bR, 'η（期待値パラメータ）', 'φ(η)：接線の傾き = θ、切片 = −ψ(θ)');
  plotLine(bL, c1, ORANGE, 3); plotLine(bR, c2, VIOLET, 3);
  let t = thetaVec[0], e = etaVec[0], ps = f.psi(thetaVec), ph = f.phi(etaVec);
  plotLine(bL, [[bL.x0, ps + e * (bL.x0 - t)], [bL.x1, ps + e * (bL.x1 - t)]], [...VIOLET, 200], 1.5);
  plotLine(bR, [[bR.x0, ph + t * (bR.x0 - e)], [bR.x1, ph + t * (bR.x1 - e)]], [...ORANGE, 200], 1.5);
  for (let [b, x, y, col] of [[bL, t, ps, ORANGE], [bR, e, ph, VIOLET]]) { let [sx, sy] = toScr(b, x, y); noStroke(); fill(...col); circle(sx, sy, 14); }
}
function draw2D(f, bL, bR) {             // θ 平面の格子と、それを η へ写した曲がった格子
  drawAxes(bL, 'θ1', 'θ 平面（まっすぐな格子）'); drawAxes(bR, 'η1', 'η 平面（同じ格子を η = ∇ψ(θ) で写すと曲がる）');
  for (let k = 0; k <= 8; k++) {
    let a = f.th[0] + ((f.th[1] - f.th[0]) * k) / 8, b = f.th[2] + ((f.th[3] - f.th[2]) * k) / 8, l1 = [], l2 = [], m1 = [], m2 = [];
    for (let j = 0; j <= 120; j++) {
      let s = f.th[2] + ((f.th[3] - f.th[2]) * j) / 120, r = f.th[0] + ((f.th[1] - f.th[0]) * j) / 120;
      let t1 = clampTheta(f, [a, s]), t2 = clampTheta(f, [r, b]);
      l1.push(t1); m1.push(f.eta(t1)); l2.push(t2); m2.push(f.eta(t2));
    }
    plotLine(bL, l1, [...ORANGE, 170], 1.3); plotLine(bL, l2, [...VIOLET, 170], 1.3); plotLine(bR, m1, [...ORANGE, 170], 1.3); plotLine(bR, m2, [...VIOLET, 170], 1.3);
  }
  let [x1, y1] = toScr(bL, thetaVec[0], thetaVec[1]), [x2, y2] = toScr(bR, etaVec[0], etaVec[1]);
  noStroke(); fill(...ORANGE); circle(x1, y1, 16); fill(...VIOLET); circle(x2, y2, 16);
}
function drawDist(f, r) {               // いまの分布の形
  noStroke(); fill(...DIMC); textSize(13); textAlign(LEFT, BASELINE); text('この θ（= この η）の分布', r.x, r.y);
  let rr = { x: r.x, y: r.y + 14, w: r.w, h: r.h - 40 };
  if (famK === 0) drawBars([1 - etaVec[0], etaVec[0]], rr, { names: ['x = 0', 'x = 1'] });
  else if (famK === 1) { let p = [], lam = etaVec[0], v = Math.exp(-lam); for (let x = 0; x < 16; x++) { p.push(v); v *= lam / (x + 1); } drawBars(p, rr, { names: p.map((_, i) => String(i)), cols: p.map(() => TEAL), vmax: Math.max(...p) * 1.15 }); }
  else if (famK === 2) drawBars([etaVec[0], etaVec[1], 1 - etaVec[0] - etaVec[1]], rr);
  else { let m = etaVec[0], s = Math.sqrt(Math.max(1e-6, etaVec[1] - m * m)), b = plotBox(rr.x, rr.y, rr.w, rr.h, -6, 6, 0, 1.4), c = []; for (let k = 0; k <= 200; k++) { let x = -6 + (12 * k) / 200; c.push([x, Math.min(1.4, gaussPdf(x, m, s))]); } drawAxes(b, 'x　（μ = ' + fmtN(m, 2) + '、σ = ' + fmtN(s, 2) + '）', ''); plotLine(b, c, TEAL, 2.5); }
}
function mousePressed() { grab = inRect(mouseX, mouseY, boxL) ? 'L' : inRect(mouseX, mouseY, boxR) ? 'R' : null; if (grab) auto = false; mouseDragged(); }
function mouseDragged() {
  if (!grab) return;
  let [bL, bR] = boxes(), f = fam();
  if (grab === 'L') { let [u, v] = fromScr(bL, mouseX, mouseY); setTheta(f.dim === 1 ? [u] : [u, v]); }
  else { let [u, v] = fromScr(bR, mouseX, mouseY); setEta(f.dim === 1 ? [u] : [u, v]); }
}
function mouseReleased() { grab = null; }
function keyPressed() {
  for (let k = 1; k <= 4; k++) if (key === String(k)) { famK = k - 1; setTheta(fam().start); }
  if (key === ' ') auto = !auto;
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(4); let okGrad = true, okInv = true, okLeg = true, okDual = true;
  for (let f of FAMS) for (let k = 0; k < 30; k++) {
    let t = [f.th[0] * 0.6 + rnd() * (f.th[1] - f.th[0]) * 0.6]; if (f.dim === 2) t.push(f === FAMS[3] ? -0.2 - rnd() * 2.7 : -3 + rnd() * 6);
    let e = f.eta(t), h = 1e-5;
    for (let i = 0; i < f.dim; i++) {
      let a = t.slice(), b = t.slice(); a[i] += h; b[i] -= h;
      if (Math.abs((f.psi(a) - f.psi(b)) / (2 * h) - e[i]) > 1e-6 * (1 + Math.abs(e[i]))) okGrad = false;
      let ea = e.slice(), eb = e.slice(), hh = 1e-6 * (1 + Math.abs(e[i])); ea[i] += hh; eb[i] -= hh;
      if (Math.abs((f.phi(ea) - f.phi(eb)) / (2 * hh) - t[i]) > 1e-4 * (1 + Math.abs(t[i]))) okDual = false;
    }
    let t2 = f.theta(e); if (t2.some((v, i) => Math.abs(v - t[i]) > 1e-8 * (1 + Math.abs(t[i])))) okInv = false;
    if (Math.abs(f.psi(t) + f.phi(e) - t.reduce((s, v, i) => s + v * e[i], 0)) > 1e-10 * (1 + Math.abs(f.psi(t)))) okLeg = false;
  }
  check('4 つの族で η = ∇ψ(θ)（中心差分、相対誤差 1e-6）', okGrad);
  check('逆向きも θ = ∇φ(η)（双対：φ の傾きが θ）', okDual);
  check('θ → η → θ がもとにもどる（誤差 1e-8）', okInv);
  check('ψ(θ) + φ(η) − θ·η = 0（120 点、誤差 1e-10）', okLeg);
  let f = FAMS[0], best = -Infinity, e0 = 0.3; for (let k = 0; k <= 20000; k++) { let t = -6 + (12 * k) / 20000; best = Math.max(best, t * e0 - f.psi([t])); }
  check('ルジャンドル変換 φ(η) = max_θ (θη − ψ(θ)) を総当たりで（ベルヌーイ、誤差 1e-6）', Math.abs(best - f.phi([e0])) < 1e-6);
  let t0 = 0.7, h2 = 1e-4, d2 = (f.psi([t0 + h2]) - 2 * f.psi([t0]) + f.psi([t0 - h2])) / (h2 * h2), mu = f.eta([t0])[0];
  check('ψ の 2 階微分 = x の分散 = フィッシャー情報（ベルヌーイ η(1−η)、相対誤差 1e-6）', Math.abs(d2 / (mu * (1 - mu)) - 1) < 1e-6);
  let g = FAMS[3], en = g.eta([2 / 1.5 ** 2, -1 / (2 * 1.5 ** 2)]);
  check('正規分布 N(2, 1.5²)：θ = (μ/σ², −1/(2σ²)) → η = (μ, μ² + σ²) = (2, 6.25)', Math.abs(en[0] - 2) < 1e-12 && Math.abs(en[1] - 6.25) < 1e-12);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. ベルヌーイで θ を大きくすると η はどこまで行く？ ψ のグラフの傾きと比べよう（シグモイド関数）
// 2. 左の接線の切片が −φ(η) になっているのを確かめよう。右の接線の切片は？
// 3. 正規分布で、θ 平面のまっすぐな格子が η 平面でどう曲がるか見よう。どの向きに混んでいる？
// 4. ψ はどれも下に凸。もし凸でなかったら η = ∇ψ(θ) から θ が 1 つに決まらない
// 5. 次の 05：θ でまっすぐ（e-測地線）と η でまっすぐ（m-測地線）。2 つの「まっすぐ」がある

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
// ---- 棒グラフ（ドラッグで高さを変えられる）
function drawBars(p, r, opt) {          // r = {x, y, w, h}、opt = {cols, names, vmax, ghost（重ねて描く別の分布）}
  opt = opt || {};
  let k = p.length, bw = r.w / k, vmax = opt.vmax || 1;
  stroke(...WIRE); strokeWeight(1); line(r.x, r.y + r.h, r.x + r.w, r.y + r.h);
  for (let i = 0; i < k; i++) {
    let hh = (clampv(p[i], 0, vmax) / vmax) * r.h, col = (opt.cols || OUTC)[i % 8];
    noStroke(); fill(...col, 210); rect(r.x + i * bw + 3, r.y + r.h - hh, bw - 6, hh, 3);
    if (opt.ghost) { let gh = (clampv(opt.ghost[i], 0, vmax) / vmax) * r.h; noFill(); stroke(...INK); strokeWeight(1.5); rect(r.x + i * bw + 3, r.y + r.h - gh, bw - 6, gh, 3); }
    noStroke(); fill(...INK); textSize(12); textAlign(CENTER, BASELINE);
    if (bw >= 30) text(fmtN(p[i], 2), r.x + (i + 0.5) * bw, r.y + r.h - hh - 4);   // 細い棒では数字を省く
    fill(...DIMC); text(opt.names ? opt.names[i] : String(i + 1), r.x + (i + 0.5) * bw, r.y + r.h + 15);
  }
}
function barsDrag(p, r, mx, my, floor) {  // 棒をドラッグ：i 番目の高さを変えて、残りを比例で縮める（合計 1 のまま）
  let k = p.length, i = Math.floor((mx - r.x) / (r.w / k));
  if (i < 0 || i >= k || my < r.y - 30 || my > r.y + r.h + 20) return p;
  let v = clampv((r.y + r.h - my) / r.h, floor || 0.001, 1 - (floor || 0.001) * (k - 1)), rest = 1 - p[i], q = p.slice();
  for (let j = 0; j < k; j++) q[j] = j === i ? v : rest > 1e-9 ? (p[j] / rest) * (1 - v) : (1 - v) / (k - 1);
  return mixFloor(q, floor || 0.001);
}
// ---- 正規分布 N(μ, σ) の道具。フィッシャー計量 ds² = (dμ² + 2dσ²) / σ²
function gaussPdf(x, m, s) { return Math.exp(-((x - m) * (x - m)) / (2 * s * s)) / (s * Math.sqrt(2 * Math.PI)); }
function gaussFR(m1, s1, m2, s2) {      // フィッシャー-ラオ距離（閉じた式）
  let a = ((m1 - m2) * (m1 - m2)) / 2 + (s1 - s2) * (s1 - s2);
  return Math.SQRT2 * Math.acosh(1 + a / (2 * s1 * s2));
}
function gaussKL(m1, s1, m2, s2) { return Math.log(s2 / s1) + (s1 * s1 + (m1 - m2) * (m1 - m2)) / (2 * s2 * s2) - 0.5; }   // D(N1‖N2)
// ★ 測地線：u = μ/√2 と置くと (u, σ) では半円（中心は σ = 0 の上）→ (μ, σ) では横に √2 倍の半楕円
function gaussGeodesic(m1, s1, m2, s2, n) {
  let u1 = m1 / Math.SQRT2, u2 = m2 / Math.SQRT2, out = [];
  if (Math.abs(u1 - u2) < 1e-9 * (1 + Math.abs(u1))) { for (let k = 0; k <= n; k++) out.push([m1, s1 * Math.pow(s2 / s1, k / n)]); return out; }
  let c = (u2 * u2 + s2 * s2 - u1 * u1 - s1 * s1) / (2 * (u2 - u1)), rr = Math.hypot(u1 - c, s1);
  let t1 = Math.atan2(s1, u1 - c), t2 = Math.atan2(s2, u2 - c);
  for (let k = 0; k <= n; k++) { let t = t1 + ((t2 - t1) * k) / n; out.push([(c + rr * Math.cos(t)) * Math.SQRT2, rr * Math.sin(t)]); }
  return out;
}
function metricLength(path) {           // 折れ線の長さをフィッシャー計量で（区間の真ん中の σ を使う）
  let L = 0;
  for (let k = 1; k < path.length; k++) {
    let dm = path[k][0] - path[k - 1][0], ds = path[k][1] - path[k - 1][1], sm = (path[k][1] + path[k - 1][1]) / 2;
    L += Math.sqrt(dm * dm + 2 * ds * ds) / sm;
  }
  return L;
}
// 測地線の方程式（クリストッフェル記号から）：μ'' = 2μ'σ'/σ、σ'' = −μ'²/(2σ) + σ'²/σ を RK4 で解く
function geodesicRK4(m, s, vm, vs, T, n) {
  let st = [m, s, vm, vs], h = T / n, out = [[m, s]];
  let fd = (y) => [y[2], y[3], (2 * y[2] * y[3]) / y[1], (-y[2] * y[2]) / (2 * y[1]) + (y[3] * y[3]) / y[1]];
  for (let k = 0; k < n; k++) {
    let k1 = fd(st), k2 = fd(st.map((v, i) => v + (h / 2) * k1[i])), k3 = fd(st.map((v, i) => v + (h / 2) * k2[i])), k4 = fd(st.map((v, i) => v + h * k3[i]));
    st = st.map((v, i) => v + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
    if (!(st[1] > 1e-6)) st[1] = 1e-6;
    out.push([st[0], st[1]]);
  }
  return out;
}
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
