// ============================================
// 03 相関があると平均は効きにくい ─ n 個の予測を平均すると、ばらつき（分散）はどこまで下がる？
// 1 つの予測の誤差 = σ·(√ρ·z₀ + √(1 − ρ)·zᵢ)：z₀ はみんな共通の誤差、zᵢ はそれぞれの誤差 → どの 2 つも相関 ρ
//   平均の分散 = ρσ² + (1 − ρ)σ²/n。n をいくら増やしても ρσ²（点線）より下がらない
//   左の的：中心が正解、小さな点が n 個の予測、金の星が平均。ρ が大きいと点がそろって同じ方向にずれ、平均もずれる
//   右：線 = 式、白い点 = シミュレーション。だから「ちがう（相関の小さい）」モデルを集めることが大事
// スライダー（ドラッグ）相関 ρ・誤差の大きさ σ・的の上の予測の数 n / スペース シミュレーションをやり直す
// ============================================

const NS = [1, 2, 3, 5, 8, 12, 20, 30, 50];   // ★ シミュレーションする n
let sliders, simSq = [], simCnt = [], dart = null;

function setup() {
  createCanvas(windowWidth, windowHeight); textWrap(CHAR); pixelDensity(1);
  sliders = [
    { x: 60, y: 0, w: 260, lo: 0, hi: 1, v: 0.3, name: '相関 ρ', d: 2 },               // ★
    { x: 60, y: 0, w: 260, lo: 0.2, hi: 2, v: 1, name: '1 つの予測の誤差 σ', d: 2 },
    { x: 60, y: 0, w: 260, lo: 1, hi: 50, v: 10, name: '的の上の予測の数 n', d: 0, int: true },
  ];
  selfTest(); resetSim();
}
// ★ 相関 ρ の n 個の誤差（平均 0、分散 σ²）
function corrErrors(n, rho, sg) { let z0 = rndGauss(), e = []; for (let i = 0; i < n; i++) e.push(sg * (Math.sqrt(rho) * z0 + Math.sqrt(1 - rho) * rndGauss())); return e; }
function avgVarFormula(n, rho, sg) { return rho * sg * sg + ((1 - rho) * sg * sg) / n; }   // ★ ρσ² + (1 − ρ)σ²/n
function resetSim() { simSq = NS.map(() => 0); simCnt = NS.map(() => 0); }

function draw() {
  background(...BG_COL);
  let rho = sliders[0].v, sg = sliders[1].v, n = sliders[2].v;
  let t0 = performance.now();
  while (performance.now() - t0 < 5) NS.forEach((k, q) => { let m = meanOf(corrErrors(k, rho, sg)); simSq[q] += m * m; simCnt[q]++; });   // 正解は 0 なので 平均² の平均 = 分散
  if (!dart || frameCount % 40 === 0) dart = { x: corrErrors(n, rho, sg), y: corrErrors(n, rho, sg) };
  // ---- 左：的
  let R = Math.min(170, height * 0.24), cx = 60 + 170, cy = 130 + R, sc = R / 3;   // 半径 R = 誤差 3
  noFill(); for (let k = 3; k >= 1; k--) { stroke(110, 80, 85); strokeWeight(1); circle(cx, cy, 2 * k * sc); }
  stroke(...INK); line(cx - 8, cy, cx + 8, cy); line(cx, cy - 8, cx, cy + 8);
  if (dart && dart.x.length === n) {
    noStroke(); fill(...TEAL, 200);
    for (let i = 0; i < n; i++) circle(cx + clampv(dart.x[i], -3.3, 3.3) * sc, cy - clampv(dart.y[i], -3.3, 3.3) * sc, 7);
    fill(...GOLD); star(cx + clampv(meanOf(dart.x), -3.3, 3.3) * sc, cy - clampv(meanOf(dart.y), -3.3, 3.3) * sc, 12);
  }
  sliders.forEach((s, k) => { s.y = cy + R + 60 + 56 * k; drawSlider(s); });
  // ---- 右：平均の分散と n
  let gx = 480, g = { x: gx, y: 120, w: width - gx - 60, h: height - 280, x0: 0, x1: 50, y0: 0, y1: sg * sg * 1.05 };
  plotAxes(g, '平均する予測の数 n', '平均の分散：線 = ρσ² + (1 − ρ)σ²/n、点 = シミュレーション、点線 = 下限 ρσ²', [0, 10, 20, 30, 40, 50], [0, sg * sg / 2, sg * sg]);
  for (let rr of [0, 0.1, 0.3, 0.6, 1]) {
    stroke(120, 95, 100); strokeWeight(1); let pts = []; for (let k = 1; k <= 50; k++) pts.push([gX(g, k), gY(g, avgVarFormula(k, rr, sg))]); polyline(pts);
    noStroke(); fill(150, 130, 130); textSize(11); textAlign(LEFT, CENTER); text('ρ=' + rr, g.x + g.w + 4, gY(g, avgVarFormula(50, rr, sg)));
  }
  stroke(...GOLD); strokeWeight(3); { let pts = []; for (let k = 1; k <= 50; k++) pts.push([gX(g, k), gY(g, avgVarFormula(k, rho, sg))]); polyline(pts); }
  stroke(...WINE); strokeWeight(1.5); drawingContext.setLineDash([6, 5]); line(g.x, gY(g, rho * sg * sg), g.x + g.w, gY(g, rho * sg * sg)); drawingContext.setLineDash([]);
  noStroke(); fill(...INK); NS.forEach((k, q) => { if (simCnt[q]) circle(gX(g, k), gY(g, simSq[q] / simCnt[q]), 10); });
  // ---- 表
  let ty = g.y + g.h + 54; fill(220, 210, 195); textSize(14); textAlign(LEFT, BASELINE);
  text('n = ' + n + '：式 ' + fmtNum(avgVarFormula(n, rho, sg), 4) + '　シミュレーション（n = 50：' + simCnt[NS.length - 1] + ' 回）' + fmtNum(simCnt[8] ? simSq[8] / simCnt[8] : NaN, 4) + '（式 ' + fmtNum(avgVarFormula(50, rho, sg), 4) + '）', gx, ty);
  text('1 つなら σ² = ' + fmtNum(sg * sg, 3) + '　→　無限に集めても ρσ² = ' + fmtNum(rho * sg * sg, 3) + '（減らせるのは最大 ' + pctStr(1 - rho) + ' まで）', gx, ty + 24);
  // ---- 文字
  fill(...INK); textSize(20); text('相関があると平均は効きにくい　Var(平均) = ρσ² + (1 − ρ)σ²/n', 40, 40);
  fill(170, 155, 145); textSize(15); text('スライダー ρ・σ・n をドラッグ　スペース シミュレーションをやり直す', 40, 66);
  drawSelfTest(width - 170, height - 12);
}
function star(x, y, r) { beginShape(); for (let k = 0; k < 10; k++) { let a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.45 : r; vertex(x + rr * Math.cos(a), y + rr * Math.sin(a)); } endShape(CLOSE); }
function mousePressed() { dragSlider = sliderHit(sliders, mouseX, mouseY); if (dragSlider) { sliderSet(dragSlider, mouseX); resetSim(); dart = null; } }
function mouseDragged() { if (dragSlider) { sliderSet(dragSlider, mouseX); resetSim(); dart = null; } }
function mouseReleased() { dragSlider = null; }
function keyPressed() { if (key === ' ') { resetSim(); dart = null; } return false; }

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(3); let T = 20000, okSim = true, worst = 0;
  for (let [rr, k] of [[0, 1], [0, 10], [0.3, 10], [0.6, 50], [0.9, 5]]) {
    let s = 0; for (let t = 0; t < T; t++) { let m = meanOf(corrErrors(k, rr, 1.5)); s += m * m; }
    let rel = Math.abs(s / T / avgVarFormula(k, rr, 1.5) - 1); worst = Math.max(worst, rel); if (rel > 0.05) okSim = false;
  }
  check('シミュレーション（2 万回）= 式 ρσ² + (1 − ρ)σ²/n、5 通りの (ρ, n) で 5% 以内（最大のずれ ' + pctStr(worst) + '）', okSim);
  let C = (i, j) => (i === j ? 1 : 0.35) * 2.25, tot = 0;     // 共分散行列から直接：Var(平均) = (1/n²) Σᵢ Σⱼ Cov(i, j)
  for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) tot += C(i, j);
  check('式 = 共分散行列の和 ÷ n²（n = 7, ρ = 0.35, σ = 1.5、1e-12）', near(tot / 49, avgVarFormula(7, 0.35, 1.5), 1e-12));
  check('n = 1 ならどの ρ でも σ²、ρ = 1 ならどの n でも σ²（平均しても変わらない）', near(avgVarFormula(1, 0.7, 2), 4, 1e-12) && near(avgVarFormula(40, 1, 2), 4, 1e-12));
  check('n → ∞ で ρσ² に近づく（n = 10⁶、ρ = 0.3）', near(avgVarFormula(1e6, 0.3, 1), 0.3, 1e-6));
  seedRng(8); let sxy = 0, sxx = 0;
  for (let t = 0; t < T; t++) { let e = corrErrors(2, 0.5, 1); sxy += e[0] * e[1]; sxx += e[0] * e[0]; }
  check('作った誤差どうしの相関 ≈ ρ = 0.5（' + fmtNum(sxy / sxx, 3) + '）', Math.abs(sxy / sxx - 0.5) < 0.02);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. ρ = 0 にして n を増やそう。平均の分散は σ²/n でどこまでも下がる（00 の集合知の、いちばん良い場合）
// 2. ρ = 0.3 だと n = 50 でも ρσ² の少し上で止まる。「たくさん集める」より「ρ を下げる」方が効く
// 3. 的の上で ρ = 0.9 にすると、点がみんな同じ方向にずれる。これが「同じまちがいをするモデル」
// 4. ρ = 0.5 のとき、n = 1 → 2 → 10 で分散はそれぞれ何 % 減る？ 最初の数個がいちばん効く
// 5. 04 からは、本当に「ちがう種類のモデル」を集めて組み合わせる。10・11 で相関（多様性）を測る

// ==================================================
// ここから下は「アンサンブル学習の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 小さな道具：はさむ・合計・平均・いちばん大きい番号・数の表示
function clampv(v, a, b) { return v < a ? a : v > b ? b : v !== v ? a : v; }     // NaN なら a に戻す
function sumArr(a) { let s = 0; for (let v of a) s += v; return s; }
function meanOf(a) { return a.length ? sumArr(a) / a.length : 0; }
function varOf(a) { let m = meanOf(a), s = 0; for (let v of a) s += (v - m) * (v - m); return a.length ? s / a.length : 0; }   // ÷n の分散
function argMaxArr(a) { let b = 0; for (let i = 1; i < a.length; i++) if (a[i] > a[b]) b = i; return b; }   // 同点なら小さい番号
function sigm(z) { return 1 / (1 + Math.exp(-clampv(z, -40, 40))); }
function fmtNum(v, d) { if (typeof v !== 'number' || !isFinite(v)) return '?'; let s = (+v.toFixed(d === undefined ? 2 : d)).toString(); return s === '-0' ? '0' : s; }
function pctStr(v) { return fmtNum(100 * v, 1) + '%'; }
// ---- 種つきの乱数（同じ種なら毎回同じ列）
let rngState = 1;
function seedRng(s) { rngState = (s >>> 0) || 1; }
function rnd() {                       // 0〜1 の一様乱数（mulberry32）
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rndInt(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
function rndGauss() { let u = Math.max(1e-12, rnd()), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }   // 標準正規分布
function shuffleArr(a) { for (let i = a.length - 1; i > 0; i--) { let j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
// ---- 描く道具：色（オーケストラ：えんじ色の黒、象牙色、金管の金、弦の青緑）、領域の絵、点
const BG_COL = [24, 11, 16];                                     // 背景（えんじ色の黒）
const INK = [242, 233, 214], GOLD = [226, 176, 74], TEAL = [64, 186, 176], WINE = [196, 72, 96];
const CLS_COL = [[226, 170, 70], [60, 182, 176]];                // ★ クラス 0（金）・クラス 1（青緑）の色
function probCol(p, k) {             // クラス 1 の確率 → 背景と混ぜた色（k = 濃さ）
  let c = [], a = clampv(k === undefined ? 0.55 : k, 0, 1) * Math.abs(2 * p - 1) + 0.12;
  for (let q = 0; q < 3; q++) c.push(BG_COL[q] + ((p > 0.5 ? CLS_COL[1][q] : CLS_COL[0][q]) - BG_COL[q]) * a);
  return c;
}
// img の全部の画素に fn(u, v) → [r, g, b] を塗る（u は右向き、v は上向き、どちらも 0〜1）
function paintImage(img, fn) {
  img.loadPixels();
  let W = img.width, H = img.height;
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    let c = fn((px + 0.5) / W, 1 - (py + 0.5) / H), i = 4 * (px + W * py);
    img.pixels[i] = c[0]; img.pixels[i + 1] = c[1]; img.pixels[i + 2] = c[2]; img.pixels[i + 3] = 255;
  }
  img.updatePixels();
}
function toPx(bx, u, v) { return [bx.x + u * bx.w, bx.y + (1 - v) * bx.h]; }   // [0,1]² → 画面
function fromPx(bx, px, py) { return [(px - bx.x) / bx.w, 1 - (py - bx.y) / bx.h]; }
function drawPoints(bx, X, y, r) {
  stroke(10); strokeWeight(1);
  for (let i = 0; i < X.length; i++) { let p = toPx(bx, X[i][0], X[i][1]); fill(...CLS_COL[y[i]]); circle(p[0], p[1], r); }
}
function frameBox(bx, col) { noFill(); stroke(...(col || [110, 80, 85])); strokeWeight(1); rect(bx.x, bx.y, bx.w, bx.h); }
// ---- グラフの道具：g = { x, y, w, h, x0, x1, y0, y1 }
function gX(g, v) { return g.x + clampv((v - g.x0) / (g.x1 - g.x0), -0.02, 1.02) * g.w; }
function gY(g, v) { return g.y + g.h - clampv((v - g.y0) / (g.y1 - g.y0), -0.02, 1.02) * g.h; }
function plotAxes(g, xl, yl, xt, yt) {
  stroke(95, 70, 75); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h);
  noStroke(); fill(175, 160, 150); textSize(12); textAlign(CENTER, TOP);
  for (let v of xt) text(+v.toPrecision(3), gX(g, v), g.y + g.h + 4);
  textAlign(RIGHT, CENTER);
  for (let v of yt) text(+v.toPrecision(3), g.x - 5, gY(g, v));
  textAlign(LEFT, BASELINE); fill(215, 205, 190); textSize(13);
  text(xl, g.x + g.w - textWidth(xl), g.y + g.h + 32); text(yl, g.x, g.y - 8);
}
function polyline(pts) {               // 点が 2 つ以上あるときだけ折れ線を描く（空の beginShape を作らない）
  if (pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape();
}
function legend(x, y, items) {         // items = [[色, 名前], …]
  textSize(13); textAlign(LEFT, CENTER); noStroke();
  items.forEach(([c, s], k) => { fill(...c); rect(x, y + 20 * k - 5, 14, 10, 2); fill(220, 210, 195); text(s, x + 22, y + 20 * k); });
}
// ---- 画面の中のスライダー：s = { x, y, w, lo, hi, v, name, d（表示の桁）}。マウスでドラッグ
let dragSlider = null;
function drawSlider(s) {
  let t = (s.v - s.lo) / (s.hi - s.lo);
  stroke(110, 80, 85); strokeWeight(4); line(s.x, s.y, s.x + s.w, s.y);
  stroke(...GOLD); line(s.x, s.y, s.x + t * s.w, s.y);
  noStroke(); fill(dragSlider === s ? 255 : INK[0], INK[1], INK[2]); circle(s.x + t * s.w, s.y, 16);
  fill(215, 205, 190); textSize(14); textAlign(LEFT, BOTTOM); text(s.name + ' = ' + fmtNum(s.v, s.d === undefined ? 2 : s.d), s.x, s.y - 10);
}
function sliderHit(sl, mx, my) { for (let s of sl) if (mx > s.x - 10 && mx < s.x + s.w + 10 && Math.abs(my - s.y) < 14) return s; return null; }
function sliderSet(s, mx) { let v = s.lo + clampv((mx - s.x) / s.w, 0, 1) * (s.hi - s.lo); s.v = s.int ? Math.round(v) : v; }
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) || ArrayBuffer.isView(v) ? Array.from(v).every(noNaN) : !(typeof v === 'number' && !isFinite(v)); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(140, 215, 170) : color(255, 90, 110)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
