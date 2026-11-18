// ============================================
// 09 HR 図 ─ 星の明るさと温度の図で、星の大きさと一生がわかる
// 横 = 表面温度 T（左ほど熱い、対数）、縦 = 光度 L（太陽 = 1、対数）
// シュテファン-ボルツマン L = 4πR²σT⁴ より、半径 R/R☉ = √(L/L☉) × (T☉/T)²。斜めの点線は半径が同じ線
// 主系列の目安：L ∝ M^3.5、R ∝ M^0.8（近似）→ 寿命 τ ≈ 100 億年 × M / L = 100 億年 × M^−2.5
// クリック = 星を選ぶ / ←→ = 主系列の星の質量 M / N = 次の星 / 星の値はおおよその値
// ============================================

const T_SUN = 5772, L_SUN = 3.828e26, R_SUN = 6.957e8, SIGMA = 5.670374e-8;
// 実在の星：名前、光度 [L☉]、表面温度 [K]（おおよその値）、種類
const HR_STARS = [
  ['太陽', 1, 5772, '主系列'], ['シリウス A', 25, 9940, '主系列'], ['ベガ', 40, 9600, '主系列'], ['プロキオン A', 7, 6530, '主系列'],
  ['スピカ', 20000, 25000, '主系列'], ['プロキシマ・ケンタウリ', 0.0017, 3040, '主系列（赤色矮星）'], ['アークトゥルス', 170, 4300, '赤色巨星'],
  ['アルデバラン', 440, 3900, '赤色巨星'], ['ベテルギウス', 100000, 3600, '赤色超巨星'], ['リゲル', 120000, 12100, '青色超巨星'], ['シリウス B', 0.056, 25000, '白色矮星'],
];
let sel = 0, mass = 1.0, g;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
}
function radiusOf(L, T) { return Math.sqrt(L) * Math.pow(T_SUN / T, 2); }        // [R☉]
function lumOf(R, T) { return R * R * Math.pow(T / T_SUN, 4); }                   // [L☉]
function msStar(M) { let L = Math.pow(M, 3.5), R = Math.pow(M, 0.8); return { L, R, T: T_SUN * Math.pow(L / (R * R), 0.25), life: 10 * Math.pow(M, -2.5) }; }   // 寿命の単位は 10 億年
function xOfT(T) { return g.x + ((Math.log10(40000) - Math.log10(T)) / (Math.log10(40000) - Math.log10(2500))) * g.w; }
function yOfL(L) { return g.y + g.h - ((Math.log10(L) + 4.5) / 11) * g.h; }

function draw() {
  background(6, 10, 28);
  g = { x: 80, y: 100, w: width * 0.6, h: height - 190 };
  stroke(70, 80, 120); noFill(); rect(g.x, g.y, g.w, g.h);
  // 温度の色の帯（下）
  for (let i = 0; i < 60; i++) { let T = 40000 * Math.pow(2500 / 40000, i / 59); let c = tColor(T); noStroke(); fill(c[0], c[1], c[2], 160); rect(xOfT(T) - g.w / 120, g.y + g.h + 2, g.w / 59 + 1, 6); }
  // 半径が同じ線
  for (let R of [0.001, 0.01, 0.1, 1, 10, 100, 1000]) {
    let pts = []; for (let i = 0; i <= 40; i++) { let T = 40000 * Math.pow(2500 / 40000, i / 40), L = lumOf(R, T); if (L > 10 ** -4.5 && L < 10 ** 6.5) pts.push([xOfT(T), yOfL(L)]); }
    stroke(120, 130, 170, 90); drawingContext.setLineDash([4, 6]); polyline(pts); drawingContext.setLineDash([]);
    if (pts.length) { noStroke(); fill(130, 140, 180); textSize(11); text(R + ' R☉', pts[pts.length - 1][0] - 40, pts[pts.length - 1][1] - 4); }
  }
  // 主系列の目安（M = 0.1〜30）
  let ms = []; for (let i = 0; i <= 60; i++) { let s = msStar(0.1 * Math.pow(300, i / 60)); ms.push([xOfT(s.T), yOfL(s.L)]); }
  drawingContext.save(); drawingContext.beginPath(); drawingContext.rect(g.x, g.y, g.w, g.h); drawingContext.clip();   // 枠の外は描かない
  stroke(250, 225, 140, 150); strokeWeight(6); polyline(ms); strokeWeight(1);
  drawingContext.restore();
  noStroke(); fill(250, 225, 140, 200); textSize(13);
  text('主系列（M = 0.1〜30 M☉ の目安）', xOfT(16000), yOfL(3000) - 30);
  fill(170, 175, 200); text('巨星', xOfT(4300), yOfL(300) - 22); text('超巨星', xOfT(6000), yOfL(1e5) - 18); text('白色矮星', xOfT(20000), yOfL(0.003));
  // 実在の星
  HR_STARS.forEach((s, i) => {
    let c = tColor(s[2]), x = xOfT(s[2]), y = yOfL(s[1]), r = clampv(6 + 3 * Math.log10(radiusOf(s[1], s[2]) + 0.01), 4, 22);
    noStroke(); fill(c[0], c[1], c[2]); circle(x, y, r * 2);
    if (i === sel) { noFill(); stroke(255); circle(x, y, r * 2 + 10); }
    noStroke(); fill(215, 220, 235); textSize(12); text(s[0], x + r + 4, y + 4);
  });
  // 主系列の星（質量 M）
  let m = msStar(mass), mx = xOfT(m.T), my = yOfL(m.L);
  stroke(255); noFill(); line(mx - 10, my, mx + 10, my); line(mx, my - 10, mx, my + 10);
  // 目盛り
  noStroke(); fill(160, 170, 195); textSize(12); textAlign(CENTER, TOP);
  for (let T of [40000, 20000, 10000, 5000, 3000]) text(T + ' K', xOfT(T), g.y + g.h + 12);
  textAlign(RIGHT, CENTER); for (let e = -4; e <= 6; e += 2) text('10^' + e, g.x - 6, yOfL(10 ** e));
  textAlign(LEFT, BASELINE); fill(205, 210, 225); textSize(13); text('光度 L [L☉]', g.x, g.y - 8); text('表面温度 T（左ほど熱い）', g.x + g.w - 150, g.y + g.h + 44);

  // ---- 右の数字
  let s = HR_STARS[sel], R = radiusOf(s[1], s[2]), x0 = g.x + g.w + 30, y0 = 120, lh = 24;
  fill(240, 236, 215); textSize(17); text(s[0] + '（' + s[3] + '）', x0, y0);
  fill(215, 220, 235); textSize(14);
  [['光度 L', fmt(s[1]) + ' L☉'], ['表面温度 T', s[2] + ' K'], ['半径 R = √L (T☉/T)²', fmt(R) + ' R☉'], ['', '= ' + fmt(R * 109.1) + ' 地球の半径'], ['L [W] = 4πR²σT⁴', (4 * Math.PI * (R * R_SUN) ** 2 * SIGMA * s[2] ** 4).toExponential(2) + ' W']]
    .forEach((r, i) => { fill(200, 205, 225); text(r[0], x0, y0 + 30 + i * lh); fill(250, 225, 140); text(r[1], x0 + 160, y0 + 30 + i * lh); });
  let y1 = y0 + 30 + 6 * lh + 10;
  fill(240, 236, 215); textSize(17); text('主系列の星　M = ' + mass.toFixed(2) + ' M☉（←→）', x0, y1);
  [['L = M^3.5', fmt(m.L) + ' L☉'], ['R = M^0.8', fmt(m.R) + ' R☉'], ['T = T☉(L/R²)^¼', m.T.toFixed(0) + ' K'], ['寿命 ≈ 100 億年 × M^−2.5', fmtLife(m.life)]]
    .forEach((r, i) => { fill(200, 205, 225); textSize(14); text(r[0], x0, y1 + 30 + i * lh); fill(250, 225, 140); text(r[1], x0 + 190, y1 + 30 + i * lh); });
  // 大きさくらべ（太陽と、選んだ星。円の半径は R の 1/3 乗で縮めて描く）
  let by = y1 + 30 + 4 * lh + 60;
  noStroke(); fill(...tColor(5772)); circle(x0 + 30, by, 2 * 12);
  let c = tColor(s[2]); fill(c[0], c[1], c[2]); circle(x0 + 130, by, 2 * clampv(12 * Math.cbrt(R), 1, 70));
  fill(170, 175, 200); textSize(12); text('太陽　　　　' + s[0] + '（大きさは R^⅓ で縮めて描いた）', x0, by + 80);

  noStroke(); fill(240, 236, 215); textSize(18);
  text('HR 図　｜ クリック = 星を選ぶ　N 次の星　←→ 主系列の星の質量', 20, 34);
  fill(250, 225, 140); textSize(15);
  text('点線 = 半径が同じ線（L ∝ T⁴）。右上ほど大きい（巨星）、左下ほど小さい（白色矮星）', 20, 60);
  drawSelfTest(20, height - 12);
}
function fmt(v) { return v >= 1000 || v < 0.01 ? v.toExponential(2) : v.toPrecision(3); }
function fmtLife(gy) { return gy >= 1 ? (gy * 10).toPrecision(3) + ' 億年' : (gy * 1000).toPrecision(3) + ' 百万年'; }
// 温度 → だいたいの色（08 の計算の結果を、簡単な表にして線形補間）
const TCOL = [[2500, [255, 150, 70]], [3600, [255, 190, 120]], [5000, [255, 228, 196]], [5772, [255, 240, 225]], [7000, [245, 243, 255]], [10000, [205, 220, 255]], [20000, [170, 195, 255]], [40000, [155, 180, 255]]];
function tColor(T) {
  T = clampv(T, 2500, 40000);
  for (let i = 0; i < TCOL.length - 1; i++) if (T <= TCOL[i + 1][0]) { let t = (T - TCOL[i][0]) / (TCOL[i + 1][0] - TCOL[i][0]); return TCOL[i][1].map((v, k) => v + t * (TCOL[i + 1][1][k] - v)); }
  return TCOL[TCOL.length - 1][1];
}

function mousePressed() {
  if (!g) return;
  let best = -1, bd = 30;
  HR_STARS.forEach((s, i) => { let d = Math.hypot(mouseX - xOfT(s[2]), mouseY - yOfL(s[1])); if (d < bd) { bd = d; best = i; } });
  if (best >= 0) sel = best;
}
function keyPressed() {
  if (key === RIGHT_ARROW) mass = Math.min(30, mass * 1.1);
  if (key === LEFT_ARROW) mass = Math.max(0.1, mass / 1.1);
  if (key === 'n' || key === 'N') sel = (sel + 1) % HR_STARS.length;
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  check('太陽：4πR☉²σT☉⁴ = 3.83 × 10²⁶ W（2% 以内）', near((4 * Math.PI * R_SUN ** 2 * SIGMA * T_SUN ** 4) / 3.83e26, 1, 0.02));
  check('太陽の L と T から求めた半径 = 1 R☉', near(radiusOf(1, T_SUN), 1, 1e-12));
  check('半径と光度の式はたがいに逆（R → L → R）', near(radiusOf(lumOf(37, 4100), 4100), 37, 1e-9));
  let sb = radiusOf(0.056, 25000);
  check('シリウス B は地球くらいの大きさ（0.008〜0.02 R☉）= 白色矮星', sb > 0.008 && sb < 0.02);
  check('ベテルギウスは太陽の 500 倍以上の大きさ（超巨星）', radiusOf(100000, 3600) > 500);
  check('主系列の目安 M = 1 は太陽（L = 1、T = 5772 K）を通る', near(msStar(1).L, 1, 1e-12) && near(msStar(1).T, T_SUN, 1e-9));
  check('寿命：M = 1 で 100 億年、M = 2 で約 18 億年、M = 10 で約 3200 万年', near(msStar(1).life, 10, 1e-12) && near(msStar(2).life, 1.768, 0.01) && near(msStar(10).life, 0.0316, 0.001));
  check('同じ半径の線は傾き 4（L ∝ T⁴）', near(Math.log10(lumOf(5, 20000) / lumOf(5, 2000)), 4, 1e-12));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 星をクリックして半径を見よう。いちばん大きいのは？ いちばん小さいのは？
// 2. ←→ で質量を変えて、主系列の上を動く星を見よう。重い星ほど明るく、熱く、短命
// 3. 太陽の 10 倍の質量の星の寿命は？ 恐竜がいた時代（約 6600 万年前）と比べよう
// 4. HR_STARS に知っている星を足そう（光度と温度は理科年表やウィキペディアで）
// 5. 太陽は将来、赤色巨星（右上）を通って白色矮星（左下）になる。その道すじを線で描いてみよう


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
