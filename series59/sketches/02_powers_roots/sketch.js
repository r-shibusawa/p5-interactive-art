// ============================================
// 02 冪と「分数の冪」 ─ a^{⊗n} = a ⊗ a ⊗ … ⊗ a = n·a、a^{⊗1/n} = a / n（⊗ の n 乗根 = n で割る = 平均）
// 1 周 k 本の回路の重みの合計 w を ⊗ の k 乗根にすると「1 本あたりの平均」 → 08 の固有値（サイクル時間）の正体
// 右：多項式 p(x) = ⊕ c_k ⊗ x^{⊗k} = max_k (c_k + k·x) は折れ線（凸）。ホーナー法なら ⊗ は 4 回で計算できる
//   （折れ線の形・「根」の話はシリーズ 38 トロピカル幾何学。ここでは計算の道具として使う）
// ↑↓ a / ← → n / 右のグラフ：左はしの ● を上下にドラッグ = 係数 c_k、クリックで選んで E = ε / R ランダム
// ============================================

let aVal = 3, nPow = 4;                // ★ 底 a と指数 n
let coef = [4, 2, 1, 1.5, -1];          // ★ p(x) の係数 c_0 … c_4（ε にもできる）
let ring = [3, 7, 2, 8];                // ★ 回路の辺の重み（4 本で 1 周）
let selK = 0, dragK = -1, gP = null;

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); selfTest(); }

// ★ ⊗ のべき：n 回 ⊗ する（ε の 0 乗は e = 0）
function powRepeat(a, n) { let p = 0; for (let t = 0; t < n; t++) p = mpMul(p, a); return p; }
// ★ くり返し 2 乗法：a^{⊗n} を約 2·log₂n 回の ⊗ で（ops = ⊗ の回数）
function powFast(a, n) {
  let res = 0, base = a, ops = 0;
  while (n > 0) { if (n & 1) { res = mpMul(res, base); ops++; } n >>= 1; if (n > 0) { base = mpMul(base, base); ops++; } }
  return { v: res, ops };
}
function powFrac(a, n) { return a === NEG_INF ? NEG_INF : a / n; }                 // a^{⊗1/n}（n ≥ 1）
function polyDirect(c, x) { let s = NEG_INF; c.forEach((ck, k) => (s = mpAdd(s, mpMul(ck, k * x)))); return s; }
function polyHorner(c, x) { let s = c[c.length - 1]; for (let k = c.length - 2; k >= 0; k--) s = mpAdd(c[k], mpMul(x, s)); return s; }
function winner(c, x) { let b = -1, v = NEG_INF; c.forEach((ck, k) => { let t = mpMul(ck, k * x); if (t > v + 1e-12) { v = t; b = k; } }); return b; }

function draw() {
  background(22, 22, 28);
  noStroke(); fill(240); textSize(20); textAlign(LEFT, BASELINE);
  text('冪と分数の冪　a = ' + mpFmt(aVal) + '、n = ' + nPow, 40, 40);
  fill(170); textSize(15); text('↑↓ a　← → n　右：● をドラッグで係数、クリックで選んで E = ε　R ランダム', 40, 66);

  // ---- 左：a^{⊗t} の階段（t = 0 … n）
  let g = { x: 70, y: 110, w: width * 0.36, h: 230, x0: 0, x1: 8, y0: Math.min(0, 8 * aVal) - 1, y1: Math.max(0, 8 * aVal) + 1 };
  plotAxes(g, '指数 t', 'a^{⊗t} = t·a', [0, 2, 4, 6, 8], [g.y0, 0, g.y1].map((v) => Math.round(v)));
  for (let t = 0; t <= 8; t++) {
    let v = powRepeat(aVal, t), on = t <= nPow;
    fill(on ? color(255, 170, 70) : color(255, 170, 70, 60)); noStroke();
    let y = gY(g, v), y0 = gY(g, 0); rect(gX(g, t) - 10, Math.min(y, y0), 20, Math.abs(y - y0));
  }
  let pf = powFast(aVal, nPow), y = g.y + g.h + 70;
  fill(240); textSize(18);
  text('a^{⊗' + nPow + '} = ' + Array(Math.max(1, nPow)).fill(mpFmt(aVal)).join(' ⊗ ') + ' = ' + mpFmt(powRepeat(aVal, nPow)) + '　（= ' + nPow + ' × ' + mpFmt(aVal) + '）', 40, y);
  fill(200); textSize(16);
  text('くり返し 2 乗法：' + mpFmt(pf.v) + '（⊗ ' + pf.ops + ' 回。ふつうに掛けると ' + Math.max(0, nPow - 1) + ' 回）', 40, y + 28);
  fill(255, 220, 120); textSize(18);
  text('a^{⊗1/' + Math.max(1, nPow) + '} = ' + mpFmt(aVal) + ' / ' + Math.max(1, nPow) + ' = ' + mpFmt(powFrac(aVal, Math.max(1, nPow)), 3) + '　→ ' + Math.max(1, nPow) + ' 乗すると ' + mpFmt(powRepeat(powFrac(aVal, Math.max(1, nPow)), Math.max(1, nPow)), 3), 40, y + 62);
  // ---- 回路の平均
  let cx = 160, cy = y + 170, R = 70, w = ring.reduce((s, v) => mpMul(s, v), 0);
  stroke(120, 200, 255); strokeWeight(2); noFill(); circle(cx, cy, 2 * R);
  for (let k = 0; k < ring.length; k++) {
    let t = (k / ring.length) * TWO_PI - HALF_PI, t2 = ((k + 0.5) / ring.length) * TWO_PI - HALF_PI;
    noStroke(); fill(120, 200, 255); circle(cx + R * cos(t), cy + R * sin(t), 14);
    fill(230); textSize(14); textAlign(CENTER, CENTER); text(ring[k], cx + (R + 18) * cos(t2), cy + (R + 18) * sin(t2));
  }
  textAlign(LEFT, BASELINE); fill(220); textSize(16);
  text('1 周の重み w = ' + ring.join(' ⊗ ') + ' = ' + w, cx + 110, cy - 20);
  fill(120, 200, 255);
  text('w^{⊗1/' + ring.length + '} = ' + w + ' / ' + ring.length + ' = ' + mpFmt(powFrac(w, ring.length), 2) + '　= 1 本あたりの平均', cx + 110, cy + 8);
  text('（08 の固有値 λ = サイクル時間）', cx + 110, cy + 32);

  // ---- 右：p(x) = max_k (c_k + k x)
  gP = { x: width * 0.52, y: 110, w: width * 0.44, h: height - 270, x0: -4, x1: 4, y0: -8, y1: 16 };
  plotAxes(gP, 'x', 'p(x) = max_k (c_k + k·x)', [-4, -2, 0, 2, 4], [-8, 0, 8, 16]);
  stroke(70); line(gX(gP, 0), gP.y, gX(gP, 0), gP.y + gP.h);
  let cols = [[255, 170, 70], [120, 200, 255], [150, 230, 160], [255, 220, 120], [220, 150, 255]];
  coef.forEach((ck, k) => {
    if (ck === NEG_INF) return;
    stroke(...cols[k], 110); strokeWeight(1.5); line(gX(gP, -4), gY(gP, ck - 4 * k), gX(gP, 4), gY(gP, ck + 4 * k));
  });
  let pts = []; for (let i = 0; i <= 160; i++) { let x = -4 + (8 * i) / 160, v = polyDirect(coef, x); if (v !== NEG_INF) pts.push([gX(gP, x), gY(gP, v)]); }
  stroke(250); strokeWeight(4); polyline(pts);
  coef.forEach((ck, k) => {
    let yy = ck === NEG_INF ? gP.y + gP.h + 22 : gY(gP, ck);
    noStroke(); fill(...cols[k], ck === NEG_INF ? 80 : 255); circle(gX(gP, 0) - 24 - 22 * k, yy, k === selK ? 18 : 13);
    fill(230); textSize(12); textAlign(CENTER, BOTTOM); text('c' + k, gX(gP, 0) - 24 - 22 * k, yy - 9);
  });
  let mx = clampv((mouseX - gP.x) / gP.w * 8 - 4, -4, 4), k = winner(coef, mx);
  textAlign(LEFT, BASELINE); fill(240); textSize(16);
  text('x = ' + mx.toFixed(2) + '：そのまま max = ' + mpFmt(polyDirect(coef, mx), 3) + '　ホーナー法 = ' + mpFmt(polyHorner(coef, mx), 3) + (k >= 0 ? '　（勝っている項 k = ' + k + '）' : ''), gP.x, gP.y + gP.h + 58);
  fill(170); textSize(14);
  text('ホーナー：c0 ⊕ x⊗(c1 ⊕ x⊗(c2 ⊕ x⊗(c3 ⊕ x⊗c4)))', gP.x, gP.y + gP.h + 82);
  text('係数：' + coef.map((c, i) => 'c' + i + ' = ' + mpFmt(c)).join('、'), gP.x, gP.y + gP.h + 104);
  drawSelfTest(width - 170, height - 12);
}

function handleAt(mx, my) {
  if (!gP) return -1;
  for (let k = 0; k < coef.length; k++) { let yy = coef[k] === NEG_INF ? gP.y + gP.h + 22 : gY(gP, coef[k]); if (Math.hypot(mx - (gX(gP, 0) - 24 - 22 * k), my - yy) < 12) return k; }
  return -1;
}
function mousePressed() { dragK = handleAt(mouseX, mouseY); if (dragK >= 0) selK = dragK; }
function mouseDragged() { if (dragK >= 0) coef[dragK] = Math.round(clampv(gP.y0 + ((gP.y + gP.h - mouseY) / gP.h) * (gP.y1 - gP.y0), -8, 16) * 2) / 2; }
function mouseReleased() { dragK = -1; }
function keyPressed() {
  if (key === UP_ARROW) aVal = Math.min(10, aVal + 0.5);
  if (key === DOWN_ARROW) aVal = Math.max(-5, aVal - 0.5);
  if (key === RIGHT_ARROW) nPow = Math.min(8, nPow + 1);
  if (key === LEFT_ARROW) nPow = Math.max(0, nPow - 1);
  if (key === 'e' || key === 'E') coef[selK] = coef[selK] === NEG_INF ? 0 : NEG_INF;
  if (key === 'r' || key === 'R') coef = coef.map(() => Math.round(Math.random() * 16 - 6));
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(2);
  let ok1 = true, ok2 = true, ok3 = true, ok4 = true;
  for (let t = 0; t < 200; t++) {
    let a = rndInt(-20, 20), b = rndInt(-20, 20), n = rndInt(0, 12);
    if (powRepeat(a, n) !== n * a || powFast(a, n).v !== n * a) ok1 = false;
    if (n > 0 && !near(powRepeat(powFrac(a, n), n), a, 1e-9)) ok2 = false;
    if (powRepeat(mpAdd(a, b), n) !== mpAdd(powRepeat(a, n), powRepeat(b, n))) ok3 = false;
    if (powRepeat(mpMul(a, b), n) !== mpMul(powRepeat(a, n), powRepeat(b, n))) ok4 = false;
  }
  check('a^{⊗n} = n·a（くり返し・くり返し 2 乗法とも、200 通り）', ok1 && powFast(3, 13).ops <= 7);
  check('分数の冪：(a^{⊗1/n})^{⊗n} = a、ε^{⊗n} = ε（n ≥ 1）、ε^{⊗0} = e = 0', ok2 && powRepeat(NEG_INF, 3) === NEG_INF && powRepeat(NEG_INF, 0) === 0);
  check('「夢の公式」(a ⊕ b)^{⊗n} = a^{⊗n} ⊕ b^{⊗n}（ふつうの数では成り立たない）と (a ⊗ b)^{⊗n} = a^{⊗n} ⊗ b^{⊗n}', ok3 && ok4 && (2 + 3) ** 2 !== 2 ** 2 + 3 ** 2);
  let okH = true, okC = true;
  for (let t = 0; t < 100; t++) {
    let c = Array.from({ length: 5 }, () => (rnd() < 0.2 ? NEG_INF : rndInt(-9, 9))), x = rnd() * 8 - 4, y = rnd() * 8 - 4;
    if (polyDirect(c, x) !== NEG_INF || polyHorner(c, x) !== NEG_INF) if (!near(polyDirect(c, x), polyHorner(c, x), 1e-9)) okH = false;
    let m = polyDirect(c, (x + y) / 2); if (m !== NEG_INF && m > (polyDirect(c, x) + polyDirect(c, y)) / 2 + 1e-9) okC = false;
  }
  check('ホーナー法 = そのまま max（係数に ε を入れて 100 通り）', okH);
  check('p(x) は凸：p((x+y)/2) ≤ (p(x) + p(y))/2', okC);
  check('回路 3, 7, 2, 8 の重み 20 の ⊗ 4 乗根 = 平均 5', powFrac(ring.reduce((s, v) => mpMul(s, v), 0), 4) === 5);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. a を負にすると a^{⊗n} の階段はどうなる？ a = 0（= e）なら？
// 2. n = 8 で、くり返し 2 乗法の ⊗ の回数はいくつ？ n = 1000 なら？
// 3. 回路の重み ring を変えて、⊗ の 4 乗根（平均）を確かめよう。いちばん遅い回路が全体の速さを決める（08）
// 4. 右のグラフで c2 を ε にすると、折れ線のどこが変わる？
// 5. 「夢の公式」(a ⊕ b)^{⊗2} = a^{⊗2} ⊕ b^{⊗2} を、ふつうの数 (a + b)² と比べよう

// ==================================================
// ここから下は「マックスプラスの道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- マックスプラスの数：ε = −∞（「ゼロ」= 起きない・制約なし）、e = 0（「いち」= 待ち時間なし）
const NEG_INF = -Infinity;
function mpAdd(a, b) { return a >= b ? a : b; }                                   // a ⊕ b = max(a, b)
function mpMul(a, b) { return a === NEG_INF || b === NEG_INF ? NEG_INF : a + b; }  // a ⊗ b = a + b（ε があれば ε。−∞ + ∞ を作らない）
function mpFmt(v, d) {                                                             // ε を「ε」と表示（−Infinity を見せない）
  if (v === NEG_INF) return 'ε';
  if (v === Infinity) return '+∞';
  if (typeof v !== 'number' || v !== v) return '?';
  let s = (+v.toFixed(d === undefined ? 1 : d)).toString();
  return s === '-0' ? '0' : s;
}
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
// ---- グラフと図の道具：g = { x, y, w, h, x0, x1, y0, y1 }
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
function gX(g, v) { return g.x + clampv((v - g.x0) / (g.x1 - g.x0), -0.02, 1.02) * g.w; }
function gY(g, v) { return g.y + g.h - clampv((v - g.y0) / (g.y1 - g.y0), -0.02, 1.02) * g.h; }
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
function noNaN(v) { return Array.isArray(v) ? v.every(noNaN) : !(typeof v === 'number' && v !== v); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(120, 210, 150) : color(255, 90, 90)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
