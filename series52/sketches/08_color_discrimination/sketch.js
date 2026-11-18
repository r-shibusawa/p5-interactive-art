// ============================================
// 08 色の弁別 ─ 色の「違いがわかる範囲」は楕円になる（マカダムの考え方）
// 円の左半分が基準の色、右半分が比べる色。CIELAB の a*b* 平面で、8 つの方向に基準からずらしてある
// ←→（細かく）↑↓（大きく）で差を変え、「ちょうど違いがわからなくなった」所でスペース（調整法）
// 8 方向の点に楕円 A x² + B xy + C y² = 1 を最小二乗で当てはめ、長い軸・短い軸・向きを表示する。差の大きさは ΔE（Lab の距離）
// C = 基準の色を変える / O = シミュレーション観察者 / R = やり直し
// ============================================

const REFS = [                         // ★ 基準の色（CIELAB の L*, a*, b*）
  { name: '灰色', lab: [60, 0, 0] }, { name: '赤みの肌色', lab: [65, 18, 22] }, { name: '緑', lab: [60, -30, 20] },
  { name: '青', lab: [50, 5, -35] }, { name: '黄', lab: [80, 0, 50] },
];
const NDIR = 8;                        // ★ 方向の数
const SIM = { a: 3, b: 1.2, ang: 40, noise: 0.08 };   // ★ シミュレーション観察者の本当の楕円（半径 ΔE と向き [度]）
let ri = 0, dirs = [], di = 0, r = 12, pts = [], fit = null, simMode = false, simSeed = 1, outGamut = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  resetData(false);
}
function resetData(sim) {
  simMode = sim; pts = []; fit = null; seedRng(Date.now());
  dirs = shuffleArr([...Array(NDIR).keys()].map((k) => (k * 2 * Math.PI) / NDIR)); di = 0; r = 10 + 6 * rnd();
}
function compLab(th, rr) { let L = REFS[ri].lab; return [L[0], L[1] + rr * Math.cos(th), L[2] + rr * Math.sin(th)]; }
function accept() {
  if (di >= dirs.length) return;
  let th = dirs[di]; pts.push([r * Math.cos(th), r * Math.sin(th)]);
  di++; r = 10 + 6 * rnd(); fit = fitEllipse(pts);   // 次の方向は大きめの差から始める
}
// 楕円 A x² + B xy + C y² = 1：未知数 A, B, C について 1 次式なので、ふつうの最小二乗（3 × 3 の連立方程式）
function fitEllipse(p) {
  if (p.length < 3) return null;
  let M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], v = [0, 0, 0];
  for (let q of p) { let row = [q[0] * q[0], q[0] * q[1], q[1] * q[1]]; for (let i = 0; i < 3; i++) { v[i] += row[i]; for (let j = 0; j < 3; j++) M[i][j] += row[i] * row[j]; } }
  let D = det3(M); if (Math.abs(D) < 1e-12) return null;
  let [A, B, C] = [0, 1, 2].map((k) => det3(M.map((rw, i) => rw.map((x, j) => (j === k ? v[i] : x)))) / D);
  let tr = A + C, dd = Math.sqrt(((A - C) / 2) ** 2 + (B / 2) ** 2), l1 = tr / 2 - dd, l2 = tr / 2 + dd;   // 2 × 2 行列の固有値
  if (!(l1 > 0 && l2 > 0)) return { A, B, C, ok: false };
  let ang = 0.5 * Math.atan2(B, A - C) + Math.PI / 2;   // 長い軸（小さい固有値）の向き
  return { A, B, C, ok: true, major: 1 / Math.sqrt(l1), minor: 1 / Math.sqrt(l2), ang };
}
function angDeg(a) { return (((a * 180) / Math.PI) % 180 + 180) % 180; }   // 向き（0〜180 度）
function det3(m) { return m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]); }
function ellipseR(e, th) { let c = Math.cos(th), s = Math.sin(th); return 1 / Math.sqrt(e.A * c * c + e.B * c * s + e.C * s * s); }   // 方向 θ の半径
function simEllipse() { let t = (SIM.ang * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t), ia = 1 / SIM.a ** 2, ib = 1 / SIM.b ** 2; return { A: c * c * ia + s * s * ib, B: 2 * c * s * (ia - ib), C: s * s * ia + c * c * ib }; }
function runSim(seed) {
  resetData(true); seedRng(seed);
  let e = simEllipse();
  for (let k = 0; k < 16; k++) { let th = (k * 2 * Math.PI) / 16, rr = ellipseR(e, th) * (1 + SIM.noise * rndNormal()); pts.push([rr * Math.cos(th), rr * Math.sin(th)]); }
  di = dirs.length; fit = fitEllipse(pts);
}

function draw() {
  background(30, 32, 40);
  fill(235); noStroke(); textSize(18);
  text('←→ 細かく　↑↓ 大きく　スペース：違いがわからなくなった所で決定　C 基準の色（' + REFS[ri].name + '）　O シミュレーション観察者　R やり直し', 20, 36);
  fill(170); textSize(15);
  text('円の左右の色が「同じに見える」ぎりぎりまで差を小さくする。小さくしすぎたら戻してよい', 20, 62);

  // ---- 左右に分かれた円（基準 | 比較）
  let R = Math.min(width * 0.16, height * 0.25), cx = width * 0.25, cy = 120 + R;
  let ref = labToRgb(REFS[ri].lab).rgb;
  fill(linToSrgb(0.18)); rect(cx - R - 30, cy - R - 30, 2 * R + 60, 2 * R + 60);
  if (di < dirs.length) {
    let c = labToRgb(compLab(dirs[di], r)); outGamut = !c.inGamut;
    fill(ref[0], ref[1], ref[2]); arc(cx, cy, 2 * R, 2 * R, HALF_PI, PI + HALF_PI, PIE);
    fill(c.rgb[0], c.rgb[1], c.rgb[2]); arc(cx, cy, 2 * R, 2 * R, -HALF_PI, HALF_PI, PIE);
    fill(220); textSize(15);
    text('方向 ' + (di + 1) + ' / ' + dirs.length + '　いまの差 ΔE = ' + r.toFixed(2) + (outGamut ? '　（画面で出せない色：切りつめ中）' : ''), cx - R - 30, cy + R + 60);
  } else { fill(ref[0], ref[1], ref[2]); circle(cx, cy, 2 * R); fill(220); textSize(15); text(simMode ? 'シミュレーション観察者（16 方向）' : 'できた！ C で別の色、R でやり直し', cx - R - 30, cy + R + 60); }
  fill(200); textSize(14); text((simMode ? 'シミュレーション観察者' : 'あなたが観察者') + '　基準 L*a*b* = (' + REFS[ri].lab.join(', ') + ')', cx - R - 30, cy + R + 84);

  // ---- a*b* 平面の楕円
  let g = { x: width * 0.56, y: 110, w: Math.min(width * 0.38, height * 0.55), h: Math.min(width * 0.38, height * 0.55) };
  let lim = 8, ox = g.x + g.w / 2, oy = g.y + g.h / 2, k = g.w / (2 * lim);
  stroke(95); noFill(); rect(g.x, g.y, g.w, g.h); stroke(70); line(g.x, oy, g.x + g.w, oy); line(ox, g.y, ox, g.y + g.h);
  noStroke(); fill(170); textSize(12); text('+a*（赤）', g.x + g.w - 54, oy - 6); text('+b*（黄）', ox + 6, g.y + 14); text('±' + lim + ' ΔE', g.x + 4, g.y + g.h - 6);
  let drawE = (e, col, w) => { stroke(col); strokeWeight(w); let p = []; for (let i = 0; i <= 120; i++) { let th = (i / 120) * 2 * Math.PI, rr = Math.min(ellipseR(e, th), lim * 1.4); p.push([ox + k * rr * Math.cos(th), oy - k * rr * Math.sin(th)]); } polyline(p); };
  if (simMode) drawE(simEllipse(), color(120, 200, 140), 1.5);
  if (fit && fit.ok) drawE(fit, color(255, 170, 90), 3);
  noStroke(); fill(120, 190, 255);
  for (let q of pts) circle(ox + k * clampv(q[0], -lim, lim), oy - k * clampv(q[1], -lim, lim), 9);
  if (di < dirs.length) { stroke(255, 255, 255, 120); strokeWeight(1); let th = dirs[di]; line(ox, oy, ox + k * Math.min(r, lim) * Math.cos(th), oy - k * Math.min(r, lim) * Math.sin(th)); }
  noStroke(); fill(235); textSize(16);
  let ry = g.y + g.h + 40;
  if (fit && fit.ok) text('楕円：長い軸 ΔE ' + fit.major.toFixed(2) + '、短い軸 ΔE ' + fit.minor.toFixed(2) + '、向き ' + angDeg(fit.ang).toFixed(0) + '°', g.x, ry);
  else text(fit ? '楕円にならない（点を増やすか、測り直す）' : '3 方向以上で楕円を当てはめる', g.x, ry);
  fill(170); textSize(13); text('ΔE ≈ 1〜2 がよく言われる「違いがわかる目安」。楕円の大きさと向きは基準の色で変わる', g.x, ry + 24);
  if (simMode) { fill(120, 200, 140); textSize(14); text('本当の楕円：長い軸 ' + SIM.a + '、短い軸 ' + SIM.b + '、向き ' + SIM.ang + '°', g.x, ry + 48); }
  fill(selfTestResults.every((q) => q.ok) ? color(120, 210, 150) : color(255, 90, 90)); textSize(14);
  text(selfTestLine(), 20, height - 12);
}

function keyPressed() {
  if (key === LEFT_ARROW) r = clampv(r / 1.06, 0.2, 40);
  if (key === RIGHT_ARROW) r = clampv(r * 1.06, 0.2, 40);
  if (key === DOWN_ARROW) r = clampv(r / 1.3, 0.2, 40);
  if (key === UP_ARROW) r = clampv(r * 1.3, 0.2, 40);
  if (key === ' ') accept();
  if (key === 'c' || key === 'C') { ri = (ri + 1) % REFS.length; resetData(false); }
  if (key === 'o' || key === 'O') runSim(++simSeed);
  if (key === 'r' || key === 'R') resetData(false);
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let w = rgbToLab([255, 255, 255]);
  check('sRGB の白 → Lab = (100, 0, 0)', near(w[0], 100, 1e-6) && near(w[1], 0, 1e-6) && near(w[2], 0, 1e-6));
  check('同じ色どうしの ΔE = 0、黒 → L* = 0', near(deltaE(rgbToLab([200, 50, 30]), rgbToLab([200, 50, 30])), 0) && near(rgbToLab([0, 0, 0])[0], 0, 1e-9));
  let back = labToRgb(rgbToLab([200, 50, 30])).rgb;
  check('sRGB → Lab → sRGB で元にもどる（200, 50, 30）', near(back[0], 200, 1e-6) && near(back[1], 50, 1e-6) && near(back[2], 30, 1e-6));
  check('a* = 120 の色は画面で出せない（色域の外）と判定', labToRgb([50, 120, 0]).inGamut === false && labToRgb([60, 0, 0]).inGamut === true);
  let e = simEllipse(), p = []; for (let i = 0; i < 8; i++) { let th = (i * Math.PI) / 4, rr = ellipseR(e, th); p.push([rr * Math.cos(th), rr * Math.sin(th)]); }
  let f = fitEllipse(p);
  check('ゆらぎのない 8 点から楕円（3, 1.2, 40°）をそのまま復元', f && f.ok && near(f.major, 3, 1e-6) && near(f.minor, 1.2, 1e-6) && near(angDeg(f.ang), 40, 1e-4));
  check('円（半径 2）の点なら長い軸 = 短い軸 = 2', (() => { let q = fitEllipse([[2, 0], [0, 2], [-2, 0], [0, -2], [Math.SQRT2, Math.SQRT2]]); return q && near(q.major, 2, 1e-9) && near(q.minor, 2, 1e-9); })());
  seedRng(52); let sp = []; for (let k = 0; k < 64; k++) { let th = (k * 2 * Math.PI) / 64, rr = ellipseR(e, th) * (1 + SIM.noise * rndNormal()); sp.push([rr * Math.cos(th), rr * Math.sin(th)]); }
  let fs = fitEllipse(sp);
  check('シミュレーション観察者 64 方向：軸の長さ ±15%', fs && fs.ok && near(fs.major, 3, 0.45) && near(fs.minor, 1.2, 0.18));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 灰色で 8 方向を測ろう。楕円は円に近い？ どの方向に細長い？
// 2. C で緑や青に変えて測り直そう。楕円の大きさや向きはどう変わる？（マカダムの楕円も場所で形がちがう）
// 3. 自分の ΔE は 1〜2 くらい？ 画面の明るさや部屋の明かりで変わる？
// 4. 文字の色と背景の色の ΔE がいくつなら読みやすい？ 色覚の多様性も考えよう
// 5. NDIR を 16 にすると楕円は安定する？ O でシミュレーション観察者と比べよう


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
// ---- 色の道具：光の量 ⇔ XYZ ⇔ CIELAB（白 = RGB(255,255,255) = D65）
const M_XYZ = [[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]];
const WHITE = M_XYZ.map((r) => r[0] + r[1] + r[2]);       // RGB = (1,1,1) の XYZ を白とする
function labF(t) { return t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116; }
function labFi(f) { return f * f * f > 216 / 24389 ? f * f * f : (116 * f - 16) / (24389 / 27); }
function rgbToLab(rgb) {
  let l = rgb.map(srgbToLin), xyz = M_XYZ.map((r) => r[0] * l[0] + r[1] * l[1] + r[2] * l[2]);
  let f = xyz.map((v, i) => labF(v / WHITE[i]));
  return [116 * f[1] - 16, 500 * (f[0] - f[1]), 200 * (f[1] - f[2])];
}
function labToRgb(lab) {               // 戻り値 { rgb, inGamut }（色域の外なら切りつめる）
  let fy = (lab[0] + 16) / 116, fx = fy + lab[1] / 500, fz = fy - lab[2] / 200;
  let xyz = [labFi(fx) * WHITE[0], labFi(fy) * WHITE[1], labFi(fz) * WHITE[2]];
  let d = M_XYZ[0][0] * (M_XYZ[1][1] * M_XYZ[2][2] - M_XYZ[1][2] * M_XYZ[2][1]) - M_XYZ[0][1] * (M_XYZ[1][0] * M_XYZ[2][2] - M_XYZ[1][2] * M_XYZ[2][0]) + M_XYZ[0][2] * (M_XYZ[1][0] * M_XYZ[2][1] - M_XYZ[1][1] * M_XYZ[2][0]);
  let m = M_XYZ, inv = [
    [(m[1][1] * m[2][2] - m[1][2] * m[2][1]) / d, (m[0][2] * m[2][1] - m[0][1] * m[2][2]) / d, (m[0][1] * m[1][2] - m[0][2] * m[1][1]) / d],
    [(m[1][2] * m[2][0] - m[1][0] * m[2][2]) / d, (m[0][0] * m[2][2] - m[0][2] * m[2][0]) / d, (m[0][2] * m[1][0] - m[0][0] * m[1][2]) / d],
    [(m[1][0] * m[2][1] - m[1][1] * m[2][0]) / d, (m[0][1] * m[2][0] - m[0][0] * m[2][1]) / d, (m[0][0] * m[1][1] - m[0][1] * m[1][0]) / d]];
  let lin = inv.map((r) => r[0] * xyz[0] + r[1] * xyz[1] + r[2] * xyz[2]);
  let inGamut = lin.every((v) => v >= -1e-4 && v <= 1 + 1e-4);
  return { rgb: lin.map(linToSrgb), inGamut };
}
function deltaE(p, q) { return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); }   // ΔE（CIE76）= Lab 空間の距離
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
