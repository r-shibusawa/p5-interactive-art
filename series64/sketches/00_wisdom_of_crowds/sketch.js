// ============================================
// 00 集合知 ─ ビンの中の玉の数を 200 人が推測する。みんなの推測の「平均」は、ふつうの 1 人よりよく当たる
// 推測 = 本当の数 + みんな共通の偏り b + 人それぞれのばらつき σ·z（z は標準正規分布）
//   多様性予測定理：集団の誤差 =「個人の誤差の平均」−「多様性（推測どうしのばらつき）」← どんな推測でも毎回ぴったり成り立つ式
//   ばらばらな推測ほど（多様性が大きいほど）集団は個人より強い。でも全員が同じ方向に偏る b は、平均しても消えない
// スライダー（ドラッグ）共通の偏り b・ばらつき σ・人数 n / スペース 新しい集団 / A 自動 / R 元に戻す
// ============================================

const TRUE_COUNT = 850;                // ★ ビンの中の本当の玉の数
let sliders, zs = [], guesses = [], crowdSeed = 1, autoRun = false, hist = [], jarImg;

function setup() {
  createCanvas(windowWidth, windowHeight); textWrap(CHAR); pixelDensity(1);
  sliders = [
    { x: 60, y: 0, w: 260, lo: -300, hi: 300, v: 0, name: '共通の偏り b', d: 0 },      // ★ 全員がそろって多め（+）/ 少なめ（−）に言う量
    { x: 60, y: 0, w: 260, lo: 0, hi: 400, v: 200, name: 'ばらつき σ', d: 0 },         // ★ 人それぞれのばらつき
    { x: 60, y: 0, w: 260, lo: 1, hi: 400, v: 200, name: '人数 n', d: 0, int: true },   // ★ 推測する人の数
  ];
  jarImg = makeJar(); selfTest(); newCrowd();
}
function newCrowd() { seedRng(crowdSeed++ * 7919); zs = []; for (let i = 0; i < 400; i++) zs.push(rndGauss()); remake(true); }
// ★ 推測を作る：本当の数 + b + σ·z（0 より小さくはならない）
function makeGuesses(b, sg, n, z) { let g = []; for (let i = 0; i < n; i++) g.push(Math.max(0, Math.round(TRUE_COUNT + b + sg * z[i]))); return g; }
// 多様性予測定理の 3 つの量
function crowdStats(g, t) {
  let m = meanOf(g), indiv = 0, div = 0;
  for (let v of g) { indiv += (v - t) ** 2; div += (v - m) ** 2; }
  indiv /= g.length; div /= g.length;
  return { mean: m, crowd: (m - t) ** 2, indiv, div, beat: g.filter((v) => Math.abs(v - t) > Math.abs(m - t)).length / g.length };
}
function remake(record) {
  guesses = makeGuesses(sliders[0].v, sliders[1].v, sliders[2].v, zs);
  if (record) { let s = crowdStats(guesses, TRUE_COUNT); hist.push(s); if (hist.length > 60) hist.shift(); }
}

function draw() {
  background(...BG_COL);
  if (autoRun && frameCount % 20 === 0) newCrowd();
  let st = crowdStats(guesses, TRUE_COUNT);
  // ---- 左：ビンとスライダー
  image(jarImg, 40, 96, 300, 300);
  sliders.forEach((s, k) => { s.y = 450 + 56 * k; drawSlider(s); });
  noStroke(); fill(200, 185, 170); textSize(14); textAlign(LEFT, BASELINE);
  text('本当の数 = ' + TRUE_COUNT + '　集団の答え（平均）= ' + fmtNum(st.mean, 1), 40, 640);
  text('集団の答えは ' + pctStr(st.beat) + ' の人より本当の数に近い', 40, 664);
  // ---- 右上：推測のヒストグラム
  let gx = 400, g = { x: gx, y: 120, w: width - gx - 50, h: height * 0.3, x0: 0, x1: 2000, y0: 0, y1: 1 };
  let bins = new Array(50).fill(0); for (let v of guesses) bins[Math.min(49, Math.floor(v / 40))]++;
  let top = Math.max(5, ...bins); g.y1 = top;
  plotAxes(g, '推測した玉の数', '人数（ヒストグラム）　白 = 本当の数、金 = 集団の平均', [0, 500, 1000, 1500, 2000], [0, top]);
  noStroke(); fill(...TEAL, 200);
  bins.forEach((c, k) => { if (c) rect(gX(g, k * 40) + 1, gY(g, c), gX(g, 40) - gX(g, 0) - 2, g.y + g.h - gY(g, c)); });
  strokeWeight(3); stroke(...INK); line(gX(g, TRUE_COUNT), g.y, gX(g, TRUE_COUNT), g.y + g.h);
  stroke(...GOLD); line(gX(g, st.mean), g.y, gX(g, st.mean), g.y + g.h);
  // ---- 右中：定理の 3 本の棒（集団の誤差 = 個人の誤差の平均 − 多様性）
  let by = g.y + g.h + 70, big = Math.max(1, st.indiv), bw = (width - gx - 330) / big;
  let bars = [['個人の誤差の平均', st.indiv, WINE], ['多様性（推測のばらつき）', st.div, TEAL], ['集団の誤差', st.crowd, GOLD]];
  bars.forEach(([nm, v, c], k) => {
    let yy = by + 34 * k; noStroke(); fill(...c); rect(gx + 200, yy, Math.max(1, v * bw), 22);
    fill(220, 210, 195); textSize(14); textAlign(RIGHT, CENTER); text(nm, gx + 190, yy + 11);
    textAlign(LEFT, CENTER); text(fmtNum(v, 1), gx + 208 + Math.max(1, v * bw), yy + 11);
  });
  fill(...INK); textSize(16); textAlign(LEFT, BASELINE);
  text(fmtNum(st.crowd, 3) + ' = ' + fmtNum(st.indiv, 3) + ' − ' + fmtNum(st.div, 3) + '　（差 ' + fmtNum(st.indiv - st.div - st.crowd, 9) + '）', gx, by + 130);
  // ---- 右下：これまでの集団（赤 = 個人の誤差の平均、金 = 集団の誤差）
  let h2 = { x: gx, y: by + 175, w: width - gx - 50, h: Math.max(60, height - by - 255), x0: 0, x1: 60, y0: 0, y1: Math.max(100, ...hist.map((s) => s.indiv)) * 1.1 };
  plotAxes(h2, '集団の番号（スペース / A で増える）', 'これまでの集団：赤 = 個人の誤差の平均、金 = 集団の誤差', [0, 30, 60], [0, Math.round(h2.y1)]);
  strokeWeight(2); stroke(...WINE); polyline(hist.map((s, k) => [gX(h2, k), gY(h2, s.indiv)]));
  stroke(...GOLD); polyline(hist.map((s, k) => [gX(h2, k), gY(h2, s.crowd)]));
  // ---- 文字
  noStroke(); fill(...INK); textSize(20); textAlign(LEFT, BASELINE);
  text('集団の知恵と多様性予測定理　集団の誤差 = 個人の誤差の平均 − 多様性', 40, 40);
  fill(170, 155, 145); textSize(15); text('スライダー b・σ・n をドラッグ　スペース 新しい集団　A 自動' + (autoRun ? '（ON）' : '（OFF）') + '　R 元に戻す', 40, 66);
  drawSelfTest(width - 170, height - 12);
}
function mousePressed() { startDrag(); }
function startDrag() { dragSlider = sliderHit(sliders, mouseX, mouseY); if (dragSlider) { sliderSet(dragSlider, mouseX); remake(false); } }
function mouseDragged() { if (dragSlider) { sliderSet(dragSlider, mouseX); remake(false); } }
function mouseReleased() { if (dragSlider) remake(true); dragSlider = null; }
function keyPressed() {
  if (key === ' ') newCrowd();
  if (key === 'a' || key === 'A') autoRun = !autoRun;
  if (key === 'r' || key === 'R') { sliders[0].v = 0; sliders[1].v = 200; sliders[2].v = 200; hist = []; newCrowd(); }
  return false;
}
function makeJar() {                   // ビンの絵（玉は TRUE_COUNT 個。1 回だけ描いておく）
  let gr = createGraphics(300, 300); gr.pixelDensity(1); gr.background(...BG_COL);
  gr.noFill(); gr.stroke(...INK); gr.strokeWeight(3); gr.rect(50, 30, 200, 260, 20);
  seedRng(5); gr.noStroke();
  for (let i = 0; i < TRUE_COUNT; i++) { let c = rnd() < 0.5 ? GOLD : rnd() < 0.5 ? TEAL : WINE; gr.fill(...c); gr.circle(60 + 180 * rnd(), 290 - 8 - 220 * Math.sqrt(rnd()), 6); }
  return gr;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let okId = true, okLe = true;
  for (let r = 0; r < 20; r++) {        // でたらめな集団 20 組：b・σ・n もでたらめ
    seedRng(100 + r); let n = rndInt(1, 300), z = []; for (let i = 0; i < n; i++) z.push(rndGauss());
    let s = crowdStats(makeGuesses(600 * rnd() - 300, 400 * rnd(), n, z), TRUE_COUNT);
    if (Math.abs(s.crowd - (s.indiv - s.div)) > 1e-9 * Math.max(1, s.indiv)) okId = false;
    if (s.crowd > s.indiv + 1e-9) okLe = false;
  }
  check('多様性予測定理：でたらめな集団 20 組すべてで 集団の誤差 = 個人の誤差の平均 − 多様性（相対 1e-9）', okId);
  check('集団の誤差 ≤ 個人の誤差の平均（多様性 ≥ 0 だから、いつも）', okLe);
  let z0 = Array.from({ length: 200 }, () => 1), s0 = crowdStats(makeGuesses(120, 0, 200, z0), TRUE_COUNT);
  check('σ = 0・偏り b = 120：多様性 = 0、集団の誤差 = b² = 14400（平均しても偏りは消えない）', s0.div === 0 && near(s0.crowd, 14400, 1e-9));
  seedRng(9); let zb = []; for (let i = 0; i < 10000; i++) zb.push(rndGauss());
  let sb = crowdStats(makeGuesses(0, 200, 10000, zb), TRUE_COUNT);
  check('偏りなし・σ = 200・1 万人：集団の誤差 ' + fmtNum(sb.crowd, 1) + ' ≪ 個人の誤差の平均 ' + fmtNum(sb.indiv, 0) + '（≈ σ² = 40000）', sb.crowd < 0.01 * sb.indiv && Math.abs(sb.indiv / 40000 - 1) < 0.05);
  let s1 = crowdStats([1000], TRUE_COUNT);
  check('1 人だけの集団：多様性 = 0、集団の誤差 = 個人の誤差 = 150² = 22500', s1.div === 0 && s1.crowd === 22500 && s1.indiv === 22500);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. b = 0 のまま σ を大きくしていこう。個人の誤差は増えるのに、集団の誤差はあまり増えないのはなぜ？
// 2. b = +200 にすると、人数 n をいくら増やしても集団の誤差は 200² 付近から下がらない（全員が同じ方向にまちがう）
// 3. 人数 n = 1 にすると、多様性は 0 で「集団の誤差 = 個人の誤差」。n = 2, 3 だと？
// 4. 定理の式の「差」がいつも 0（計算の誤差だけ）なのを確かめよう。どんな推測の集まりでも成り立つ式
// 5. 03 では「相関がある」推測（みんな少しずつ似ている）を平均すると、どこまで誤差が下がるかを計算する

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
