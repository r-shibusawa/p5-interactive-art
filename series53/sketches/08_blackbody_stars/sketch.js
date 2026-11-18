// ============================================
// 08 黒体放射と星の色 ─ 温度だけで、星の色と明るさが決まる
// プランクの式 B(λ, T) = 2hc² / λ⁵ ÷ (e^(hc/λkT) − 1)　→ 山の位置 λmax = b / T（ウィーンの法則、b = 2.898 × 10⁻³ m·K）
// 1 m² から出る光の量 = σT⁴（シュテファン-ボルツマンの法則。曲線の下の面積 × π を数値積分して確かめる）
// 見える色 = スペクトルに人の目の色合わせ関数 x̄ ȳ z̄（CIE 1931 の近似式）を掛けて積分 → XYZ → sRGB
// ←→ = 温度（Shift で大きく）/ 1〜8 = 実在の星 / L = 縦軸を対数に / 星の温度はおおよその値
// ============================================

const HP = 6.62607015e-34, CL = 2.99792458e8, KB = 1.380649e-23, SIGMA = 5.670374e-8, WIEN_B = 2.897771955e-3;
// 実在の星：名前、表面温度 [K]（おおよその値）
const STARLIST = [['ベテルギウス', 3600], ['アルデバラン', 3900], ['アークトゥルス', 4300], ['太陽', 5772], ['プロキオン', 6530], ['ベガ', 9600], ['リゲル', 12100], ['スピカ', 25000]];
let temp = 5772, logY = false, sel = 3, rainbow, cache = null, starRgb = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  rainbow = makeRainbow(380, 780);
  starRgb = STARLIST.map((s) => rgbOf(xyzOf(s[1])));   // 一覧の星の色（1 回だけ計算）
  selfTest();
}
function planck(lam, T) {             // [W / (m² · sr · m)]、lam [m]
  let x = (HP * CL) / (lam * KB * T);
  if (x > 700) return 0;               // e^x があふれないように（とても短い波長では 0）
  return (2 * HP * CL * CL) / Math.pow(lam, 5) / Math.expm1(x);
}
// CIE 1931 の色合わせ関数の近似（区分的なガウス関数の和。Wyman・Sloan・Shirley 2013）λ [nm]
function gpw(x, mu, s1, s2) { let t = (x - mu) / (x < mu ? s1 : s2); return Math.exp(-0.5 * t * t); }
function cmf(l) {
  return [1.056 * gpw(l, 599.8, 37.9, 31.0) + 0.362 * gpw(l, 442.0, 16.0, 26.7) - 0.065 * gpw(l, 501.1, 20.4, 26.2),
          0.821 * gpw(l, 568.8, 46.9, 40.5) + 0.286 * gpw(l, 530.9, 16.3, 31.1),
          1.217 * gpw(l, 437.0, 11.8, 36.0) + 0.681 * gpw(l, 459.0, 26.0, 13.8)];
}
function xyzOf(T) { let X = 0, Y = 0, Z = 0; for (let l = 380; l <= 780; l += 2) { let b = planck(l * 1e-9, T), c = cmf(l); X += b * c[0]; Y += b * c[1]; Z += b * c[2]; } return [X, Y, Z]; }
function chroma(T) { let [X, Y, Z] = xyzOf(T), s = X + Y + Z; return [X / s, Y / s]; }
// XYZ → sRGB（いちばん大きいチャンネルを 1 にそろえてから、ガンマをかける）
function rgbOf(xyz) {
  let [X, Y, Z] = xyz, r = 3.2406 * X - 1.5372 * Y - 0.4986 * Z, g = -0.9689 * X + 1.8758 * Y + 0.0415 * Z, b = 0.0557 * X - 0.2040 * Y + 1.0570 * Z;
  let m = Math.max(r, g, b, 1e-30);
  return [r, g, b].map((v) => { v = clampv(v / m, 0, 1); return 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055); });
}
function peakNumeric(T) {              // 曲線の山を黄金分割探索で探す
  let a = 50e-9, b = 2e-4, g = (Math.sqrt(5) - 1) / 2, c = b - g * (b - a), d = a + g * (b - a);
  for (let i = 0; i < 200; i++) { if (planck(c, T) > planck(d, T)) b = d; else a = c; c = b - g * (b - a); d = a + g * (b - a); }
  return (a + b) / 2;
}
function totalFlux(T) {                // π ∫ B dλ を対数の刻みで数値積分（台形公式）
  let s = 0, N = 4000, l0 = Math.log(10e-9), l1 = Math.log(1e-2), prev = null;
  for (let i = 0; i <= N; i++) { let lam = Math.exp(l0 + ((l1 - l0) * i) / N), f = planck(lam, T) * lam; if (prev !== null) s += ((f + prev) / 2) * ((l1 - l0) / N); prev = f; }
  return Math.PI * s;
}
function makeRainbow(l0, l1) {
  let g = createGraphics(400, 1); g.pixelDensity(1); g.loadPixels();
  for (let i = 0; i < 400; i++) { let c = cmf(l0 + ((l1 - l0) * i) / 399), rgb = rgbOf(c), Y = clampv(c[1] * 1.4, 0, 1); for (let k = 0; k < 3; k++) g.pixels[4 * i + k] = rgb[k] * Y; g.pixels[4 * i + 3] = 255; }
  g.updatePixels(); return g;
}

function draw() {
  background(6, 10, 28);
  if (!cache || cache.T !== temp) cache = { T: temp, rgb: rgbOf(xyzOf(temp)), ch: chroma(temp), flux: totalFlux(temp) };
  let lmax = WIEN_B / temp, pk = planck(lmax, temp);
  let g = { x: 70, y: 110, w: width * 0.56, h: height * 0.62, x0: 100, x1: 3000, y0: logY ? pk * 1e-4 : 0, y1: pk * 1.1, logy: logY };
  noStroke(); image(rainbow, gX(g, 380), g.y + g.h - 14, gX(g, 780) - gX(g, 380), 14);
  plotAxes(g, '波長 λ [nm]', 'B(λ, T)（いまの温度の山 = 1）' + (logY ? '　対数：1 目盛り = 10 倍' : ''), [100, 500, 1000, 1500, 2000, 2500, 3000], []);
  noStroke(); fill(160, 170, 195); textSize(12); textAlign(RIGHT, CENTER);
  for (let v of logY ? [1e-4, 1e-3, 1e-2, 0.1, 1] : [0, 0.5, 1]) text(v, g.x - 5, gY(g, v * pk));
  textAlign(LEFT, BASELINE);
  // 実在の星の曲線（同じ縦軸。はみ出す部分は上で止まる）
  STARLIST.forEach((s, i) => { let c = starRgb[i]; stroke(c[0], c[1], c[2], 70); strokeWeight(1); polyline(curvePts(g, s[1])); });
  stroke(cache.rgb[0], cache.rgb[1], cache.rgb[2]); strokeWeight(3); polyline(curvePts(g, temp)); strokeWeight(1);
  stroke(255, 200); line(gX(g, lmax * 1e9), g.y, gX(g, lmax * 1e9), g.y + g.h);
  noStroke(); fill(250, 225, 140); textSize(14); text('λmax = ' + (lmax * 1e9).toFixed(0) + ' nm', gX(g, lmax * 1e9) + 6, g.y + 16);
  fill(170, 175, 200); textSize(12); text('見える光（380〜780 nm）', gX(g, 380), g.y + g.h - 20);
  // ---- 星の色
  let sx = width * 0.8, sy = height * 0.3, sr = Math.min(110, height * 0.15);
  for (let i = 6; i >= 1; i--) { noStroke(); fill(cache.rgb[0], cache.rgb[1], cache.rgb[2], 18); circle(sx, sy, sr * 2 + i * 14); }
  fill(cache.rgb[0], cache.rgb[1], cache.rgb[2]); circle(sx, sy, 2 * sr);
  fill(240, 236, 215); textSize(15); textAlign(CENTER);
  text('計算した色 RGB(' + cache.rgb.map((v) => v.toFixed(0)).join(', ') + ')', sx, sy + sr + 30);
  text('色度 x = ' + cache.ch[0].toFixed(4) + '、y = ' + cache.ch[1].toFixed(4), sx, sy + sr + 52);
  textAlign(LEFT, BASELINE);
  // ---- 星の一覧
  let x0 = width * 0.66, y0 = sy + sr + 90;
  STARLIST.forEach((s, i) => {
    let c = starRgb[i], y = y0 + i * 24;
    noStroke(); fill(c[0], c[1], c[2]); circle(x0 + 8, y - 5, 14);
    fill(i === sel && temp === s[1] ? color(250, 225, 140) : color(210, 215, 230)); textSize(14);
    text((i + 1) + '  ' + s[0] + '　約 ' + s[1] + ' K　λmax ' + ((WIEN_B / s[1]) * 1e9).toFixed(0) + ' nm', x0 + 24, y);
  });

  noStroke(); fill(240, 236, 215); textSize(18);
  text('黒体放射と星の色　｜ ←→ 温度（Shift で大きく）　1〜8 実在の星　L 縦軸を対数に', 20, 34);
  fill(250, 225, 140); textSize(16);
  text('T = ' + temp.toFixed(0) + ' K　ウィーン：λmax = b / T = ' + (lmax * 1e9).toFixed(1) + ' nm　シュテファン-ボルツマン：σT⁴ = ' + (SIGMA * temp ** 4 / 1e6).toFixed(2) + ' MW/m²（数値積分 ' + (cache.flux / 1e6).toFixed(2) + '）', 20, 60);
  fill(180, 185, 210); textSize(13);
  text('温度が 2 倍 → 山の波長は 1/2、光の量は 2⁴ = 16 倍。低温は赤、太陽は白、高温は青白い（緑の星がないのは、山が緑でも全部の色がまざるから）', 20, height - 34);
  drawSelfTest(20, height - 12);
}
function curvePts(g, T) { let p = []; for (let i = 0; i <= 160; i++) { let l = g.x0 + ((g.x1 - g.x0) * i) / 160, b = planck(l * 1e-9, T); if (g.logy && b <= 0) continue; p.push([gX(g, l), gY(g, Math.max(b, g.logy ? g.y0 : 0))]); } return p; }

function keyPressed() {
  let f = keyIsDown(SHIFT) ? 1.25 : 1.04;
  if (key === RIGHT_ARROW) temp = Math.min(40000, Math.round(temp * f));
  if (key === LEFT_ARROW) temp = Math.max(1000, Math.round(temp / f));
  if (key >= '1' && key <= '8') { sel = +key - 1; temp = STARLIST[sel][1]; }
  if (key === 'l' || key === 'L') logY = !logY;
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  check('ウィーンの法則：数値で探した山 λmax × T = 2.898 × 10⁻³ m·K（3000・5772・10000 K）', [3000, 5772, 10000].every((T) => near((peakNumeric(T) * T) / WIEN_B, 1, 1e-4)));
  check('シュテファン-ボルツマン：π ∫ B dλ = σT⁴（1% 以内）', [3000, 5772, 20000].every((T) => near(totalFlux(T) / (SIGMA * T ** 4), 1, 0.01)));
  let Lsun = 4 * Math.PI * 6.957e8 ** 2 * SIGMA * 5772 ** 4;
  check('太陽：L = 4πR²σT⁴（R = 6.957 × 10⁸ m、T = 5772 K）= 3.83 × 10²⁶ W（2% 以内）', near(Lsun / 3.83e26, 1, 0.02));
  let c65 = chroma(6500);
  check('6500 K の色度は x ≈ 0.313、y ≈ 0.324（白）', near(c65[0], 0.3135, 0.01) && near(c65[1], 0.3236, 0.01));
  let r3 = rgbOf(xyzOf(3000)), r10 = rgbOf(xyzOf(10000));
  check('3000 K は赤っぽい（R > G > B）、10000 K は青白い（B > R）', r3[0] > r3[1] && r3[1] > r3[2] && r10[2] > r10[0]);
  let best = 0, bl = 0; for (let l = 400; l <= 700; l++) if (cmf(l)[1] > best) { best = cmf(l)[1]; bl = l; }
  check('色合わせ関数 ȳ（明るさの感じ方）の山は 555 nm 付近で約 1', bl >= 550 && bl <= 562 && near(best, 1, 0.04));
  check('温度 2 倍で光の量は 16 倍', near(totalFlux(8000) / totalFlux(4000), 16, 0.16));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 1〜8 で星を選んで、色と山の位置を比べよう。ベテルギウスの山は見える光の外（赤外線）
// 2. ←→ で温度を変え、白く見えるのは何 K くらいからか探そう
// 3. L で縦軸を対数に。温度が上がると、どの波長でも光が強くなる（曲線は交わらない）
// 4. 電球（約 2800 K）やろうそく（約 1900 K）の色を作ってみよう
// 5. 緑色の星が見つからないのはなぜ？ 山が 500 nm 付近の温度にして色を確かめよう


// ==================================================
// ここから下は「天文の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
const DEG = Math.PI / 180;             // 度 → ラジアン
function wrap360(a) { return ((a % 360) + 360) % 360; }
function wrap180(a) { return wrap360(a + 180) - 180; }
// ---- グラフの道具：g = { x, y, w, h, x0, x1, y0, y1, logx, logy }
function gX(g, v) { let t = g.logx ? (Math.log(v) - Math.log(g.x0)) / (Math.log(g.x1) - Math.log(g.x0)) : (v - g.x0) / (g.x1 - g.x0); return g.x + clampv(isFinite(t) ? t : 0, -0.02, 1.02) * g.w; }
function gY(g, v) { let t = g.logy ? (Math.log(v) - Math.log(g.y0)) / (Math.log(g.y1) - Math.log(g.y0)) : (v - g.y0) / (g.y1 - g.y0); return g.y + g.h - clampv(isFinite(t) ? t : 0, -0.02, 1.02) * g.h; }
function plotAxes(g, xl, yl, xt, yt) {
  stroke(80, 90, 120); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h);
  noStroke(); fill(160, 170, 195); textSize(12); textAlign(CENTER, TOP);
  for (let v of xt) text(+v.toPrecision(3), gX(g, v), g.y + g.h + 4);
  textAlign(RIGHT, CENTER);
  for (let v of yt) text(+v.toPrecision(3), g.x - 5, gY(g, v));
  textAlign(LEFT, BASELINE); fill(205, 210, 225); textSize(13);
  text(xl, g.x + g.w - textWidth(xl), g.y + g.h + 32); text(yl, g.x, g.y - 8);
}
function polyline(pts, closed) {       // 点が 2 つ以上あるときだけ折れ線を描く（空の beginShape はエラーになるため）
  if (!pts || pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape(closed ? CLOSE : undefined);
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); textSize(13); textAlign(LEFT, BASELINE); fill(selfTestResults.every((r) => r.ok) ? color(130, 215, 160) : color(255, 95, 95)); text(selfTestLine(), x, y); }
