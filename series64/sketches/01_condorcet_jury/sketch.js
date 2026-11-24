// ============================================
// 01 コンドルセの陪審定理 ─ 正解率 p の人が n 人、それぞれ独立に投票して多数決。多数決の正解率は？
// 正解する人の数は 2 項分布 → 多数決の正解率 = Σ_{k > n/2} C(n, k) p^k (1 − p)^(n − k) を正確に計算（左のグラフ）
//   p > 0.5 なら n を増やすほど 1 に近づき、p < 0.5 なら 0 に近づく
//   右：「まねっこ」を入れる。各人は確率 c でリーダーの意見をまね、残りは自分で考える（1 人の正解率は p のまま、2 人の相関 = c²）
//   相関が強いと、人数を増やしても多数決の正解率は p 付近から上がらない（点 = シミュレーション、線 = 正確な計算）
// スライダー（ドラッグ）p・まねる確率 c・人数 n / スペース シミュレーションをやり直す
// ============================================

const N_MAX = 101;                     // ★ グラフの人数の最大（奇数）
let sliders, simN = [], simOk = [], lastVote = null, simNs = [1, 3, 5, 9, 15, 25, 41, 61, 81, 101];

function setup() {
  createCanvas(windowWidth, windowHeight); textWrap(CHAR); pixelDensity(1);
  sliders = [
    { x: 0, y: 0, w: 240, lo: 0.3, hi: 0.9, v: 0.6, name: '1 人の正解率 p', d: 3 },   // ★
    { x: 0, y: 0, w: 240, lo: 0, hi: 1, v: 0.4, name: 'まねる確率 c', d: 2 },          // ★ 0 = みんな独立
    { x: 0, y: 0, w: 240, lo: 1, hi: 101, v: 25, name: '人数 n（奇数）', d: 0, int: true },
  ];
  selfTest(); resetSim();
}
// ★ 独立な n 人の多数決の正解率（2 項分布の和。n が偶数なら同数はコイン投げで半分）
function majorityExact(n, p) {
  if (n <= 0) return 0.5;
  let logp = Math.log(Math.max(1e-300, p)), logq = Math.log(Math.max(1e-300, 1 - p)), lc = 0, s = 0;   // lc = log C(n, k)
  for (let k = 0; k <= n; k++) {
    if (k > 0) lc += Math.log(n - k + 1) - Math.log(k);
    let pk = Math.exp(lc + k * logp + (n - k) * logq);
    if (2 * k > n) s += pk; else if (2 * k === n) s += pk / 2;
  }
  return clampv(s, 0, 1);
}
function binomRow(n, p) {             // 2 項分布の確率 P(k), k = 0..n を全部（対数で計算してあふれないように）
  let row = [], lc = 0, lp = Math.log(Math.max(1e-300, p)), lq = Math.log(Math.max(1e-300, 1 - p));
  for (let k = 0; k <= n; k++) { if (k > 0) lc += Math.log(n - k + 1) - Math.log(k); row.push(p <= 0 ? (k === 0 ? 1 : 0) : p >= 1 ? (k === n ? 1 : 0) : Math.exp(lc + k * lp + (n - k) * lq)); }
  return row;
}
// ★ まねっこモデルの正確な値：まねる人の数 m ~ 2 項(n, c)、残り n − m 人は独立。リーダーが正しいか（確率 p）で場合分け
function majorityCopy(n, p, c) {
  let s = 0, pm = binomRow(n, c), need = Math.floor(n / 2) + 1;   // need = 過半数
  for (let m = 0; m <= n; m++) {
    if (pm[m] < 1e-15) continue;
    let rest = n - m, row = binomRow(rest, p), okL = 0, okW = 0;
    for (let k = 0; k <= rest; k++) { if (k + m >= need) okL += row[k]; if (k >= need) okW += row[k]; }
    s += pm[m] * (p * okL + (1 - p) * okW);
  }
  return clampv(s, 0, 1);
}
let curveKey = '', curves = null;
function getCurves(p, c) {            // グラフの線は、スライダーが変わったときだけ計算し直す
  let k = p + ',' + c; if (k === curveKey) return curves;
  curveKey = k; curves = { ind: [], cp: [], faint: {} };
  for (let n = 1; n <= N_MAX; n += 2) curves.ind.push([n, majorityExact(n, p)]);
  for (let n = 1; n <= N_MAX; n += 4) curves.cp.push([n, majorityCopy(n, p, c)]);
  for (let pp of [0.4, 0.45, 0.55, 0.7, 0.8]) { curves.faint[pp] = []; for (let n = 1; n <= N_MAX; n += 2) curves.faint[pp].push([n, majorityExact(n, pp)]); }
  return curves;
}
// 1 回の投票（シミュレーション）：戻り値 = 各人が正しいか（0/1）の配列
function voteOnce(n, p, c) { let lead = rnd() < p ? 1 : 0, v = []; for (let i = 0; i < n; i++) v.push(rnd() < c ? lead : rnd() < p ? 1 : 0); v.lead = lead; return v; }
function resetSim() { simN = simNs.map(() => 0); simOk = simNs.map(() => 0); }

function draw() {
  background(...BG_COL);
  let p = sliders[0].v, c = sliders[1].v, n = sliders[2].v | 1;
  // 1 フレームに 6 ミリ秒だけシミュレーション
  let t0 = performance.now();
  while (performance.now() - t0 < 6) for (let q = 0; q < simNs.length; q++) { let v = voteOnce(simNs[q], p, c); simN[q]++; if (2 * sumArr(v) > simNs[q]) simOk[q]++; }
  if (frameCount % 30 === 1) lastVote = voteOnce(n, p, c);
  let cv = getCurves(p, c);
  // ---- 左：独立な投票者の正確な曲線
  let half = (width - 160) / 2, g = { x: 70, y: 120, w: half - 40, h: height * 0.42, x0: 1, x1: N_MAX, y0: 0, y1: 1 };
  plotAxes(g, '人数 n（奇数）', '独立な n 人の多数決の正解率（2 項分布で正確に計算）', [1, 25, 51, 75, 101], [0, 0.25, 0.5, 0.75, 1]);
  for (let pp of [0.4, 0.45, 0.55, 0.7, 0.8]) { stroke(120, 95, 100); strokeWeight(1); polyline(cv.faint[pp].map(([k, v]) => [gX(g, k), gY(g, v)])); noStroke(); fill(150, 130, 130); textSize(11); textAlign(LEFT, CENTER); if (pp < 0.6) text('p=' + pp, g.x + g.w + 4, gY(g, majorityExact(N_MAX, pp))); }
  stroke(...GOLD); strokeWeight(3); polyline(cv.ind.map(([k, v]) => [gX(g, k), gY(g, v)]));
  stroke(...INK); strokeWeight(1); drawingContext.setLineDash([4, 4]); line(g.x, gY(g, 0.5), g.x + g.w, gY(g, 0.5)); drawingContext.setLineDash([]);
  noStroke(); fill(...GOLD); circle(gX(g, n), gY(g, majorityExact(n, p)), 10);
  // ---- 右：まねっこがいるとき
  let g2 = { x: 120 + half, y: 120, w: half - 60, h: height * 0.42, x0: 1, x1: N_MAX, y0: 0, y1: 1 };
  plotAxes(g2, '人数 n', 'まねっこモデル：線 = 正確な値、点 = シミュレーション', [1, 25, 51, 75, 101], [0, 0.25, 0.5, 0.75, 1]);
  stroke(...GOLD); strokeWeight(1.5); drawingContext.setLineDash([5, 4]); polyline(cv.ind.map(([k, v]) => [gX(g2, k), gY(g2, v)])); drawingContext.setLineDash([]);
  stroke(...TEAL); strokeWeight(3); polyline(cv.cp.map(([k, v]) => [gX(g2, k), gY(g2, v)]));
  noStroke(); fill(...INK); simNs.forEach((k, q) => { if (simN[q]) circle(gX(g2, k), gY(g2, simOk[q] / simN[q]), 9); });
  legend(g2.x + 12, g2.y + 18, [[GOLD, '独立（c = 0）'], [TEAL, 'まねる確率 c = ' + fmtNum(c, 2) + '（相関 c² = ' + fmtNum(c * c, 2) + '）'], [INK, 'シミュレーション（' + simN[0] + ' 回ずつ）']]);
  // ---- 下：いまの n 人の 1 回の投票（金 = 正解、赤 = まちがい、枠 = まねた人）
  let vy = g.y + g.h + 70, cols = Math.min(n, 51), cs = Math.min(22, (width - 520) / 51);
  sliders.forEach((s, k) => { s.x = 70; s.y = vy + 20 + 56 * k; drawSlider(s); });
  if (lastVote && lastVote.length === n) {
    lastVote.forEach((v, i) => { noStroke(); fill(...(v ? GOLD : WINE)); circle(420 + (i % cols) * cs, vy + 10 + Math.floor(i / cols) * cs, cs * 0.8); });
    let k = sumArr(lastVote); fill(220, 210, 195); textSize(15); textAlign(LEFT, BASELINE);
    text('1 回の投票（30 フレームごと）：正解 ' + k + ' 人 / ' + n + ' 人 → 多数決は' + (2 * k > n ? '正解' : 'まちがい') + '（リーダーは' + (lastVote.lead ? '正解' : 'まちがい') + '）', 420, vy + 10 + 3 * cs + 20);
  }
  fill(...INK); textSize(16); textAlign(LEFT, BASELINE);
  text('n = ' + n + '：独立なら ' + pctStr(majorityExact(n, p)) + '、まねっこありなら ' + pctStr(majorityCopy(n, p, c)) + '（1 人なら ' + pctStr(p) + '）', 420, vy + 10 + 3 * cs + 50);
  noStroke(); fill(...INK); textSize(20); textAlign(LEFT, BASELINE);
  text('コンドルセの陪審定理　p > 0.5 の独立な人が増えると、多数決はほぼ必ず正しい', 40, 40);
  fill(170, 155, 145); textSize(15); text('スライダー p・c・n をドラッグ　スペース シミュレーションをやり直す', 40, 66);
  drawSelfTest(width - 170, height - 12);
}
function mousePressed() { dragSlider = sliderHit(sliders, mouseX, mouseY); if (dragSlider) { sliderSet(dragSlider, mouseX); resetSim(); } }
function mouseDragged() { if (dragSlider) { sliderSet(dragSlider, mouseX); resetSim(); } }
function mouseReleased() { dragSlider = null; }
function keyPressed() { if (key === ' ') resetSim(); return false; }

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let okB = true;                       // 総当たり：2^n 通りの「誰が正解か」を全部数える
  for (let n = 1; n <= 15; n += 2) for (let p of [0.3, 0.55, 0.6, 0.8]) {
    let s = 0;
    for (let m = 0; m < 1 << n; m++) { let k = 0; for (let b = 0; b < n; b++) if (m & (1 << b)) k++; if (2 * k > n) s += Math.pow(p, k) * Math.pow(1 - p, n - k); }
    if (Math.abs(s - majorityExact(n, p)) > 1e-12) okB = false;
  }
  check('2 項分布の和 = 総当たり（2^n 通り）、n = 1〜15 の奇数 × p = 0.3, 0.55, 0.6, 0.8（1e-12）', okB);
  let up = true, down = true;
  for (let n = 1; n + 2 <= 201; n += 2) { if (!(majorityExact(n + 2, 0.55) > majorityExact(n, 0.55))) up = false; if (!(majorityExact(n + 2, 0.45) < majorityExact(n, 0.45))) down = false; }
  check('奇数 n で：p = 0.55 なら n とともに増え（n = 201 で ' + fmtNum(majorityExact(201, 0.55), 3) + '）、p = 0.45 なら減る', up && down);
  check('n = 1 なら p そのもの、p = 0.5 ならどの n でも 0.5', near(majorityExact(1, 0.7), 0.7, 1e-12) && near(majorityExact(51, 0.5), 0.5, 1e-12));
  check('まねっこモデル：c = 0 なら独立の式と同じ、c = 1 なら全員リーダーと同じで p', near(majorityCopy(21, 0.6, 0), majorityExact(21, 0.6), 1e-12) && near(majorityCopy(21, 0.6, 1), 0.6, 1e-12));
  seedRng(77); let T = 20000, ok = 0, okI = 0, two = 0;
  for (let t = 0; t < T; t++) { let v = voteOnce(21, 0.6, 0.4); if (2 * sumArr(v) > 21) ok++; okI += v[0]; two += v[0] * v[1]; }
  let ex = majorityCopy(21, 0.6, 0.4), se = Math.sqrt(ex * (1 - ex) / T), pa = okI / T, cov = two / T - pa * pa;
  check('シミュレーション 2 万回（n = 21, p = 0.6, c = 0.4）の多数決の正解率 ' + fmtNum(ok / T, 4) + ' = 正確な値 ' + fmtNum(ex, 4) + '（±4 標準誤差）', Math.abs(ok / T - ex) < 4 * se);
  check('まねっこでも 1 人の正解率は p（' + fmtNum(pa, 3) + '）、2 人の相関 ≈ c² = 0.16（' + fmtNum(cov / (pa * (1 - pa)), 3) + '）', Math.abs(pa - 0.6) < 0.015 && Math.abs(cov / (pa * (1 - pa)) - 0.16) < 0.03);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. p = 0.51 でも、n = 101 なら多数決の正解率は何 %？ わずかな差が人数で大きくなる
// 2. p = 0.45 にすると、人数を増やすほど多数決はまちがう。「みんなで決める」が危ないとき
// 3. c を 0 → 1 に動かそう。c = 0.5 だと、n を増やしても正解率は何 % 付近で止まる？
// 4. まねっこの多数決は、ほとんど「リーダー 1 人の答え」になる。アンサンブルで「ちがうモデル」を集める理由
// 5. 03 では、投票ではなく数の「平均」で、相関があるとどこまで誤差が下がるかを式で確かめる

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
