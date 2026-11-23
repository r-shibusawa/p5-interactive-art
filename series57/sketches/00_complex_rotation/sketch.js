// ============================================
// 00 複素数と平面の回転 ─ 掛け算 = 回転と拡大
// 複素数 z = x + iy を平面の点とみなす。w を掛けると、z は arg w だけ回って |w| 倍にのびる
// e^{iθ} = cos θ + i sin θ（級数を本当に足して確かめる）。掛ける順番を変えても同じ（交換法則）
// z と w をドラッグ / スペース：w を何回も掛ける（らせん）/ ← → θ（E のとき）/ E：e^{iθ} を級数で / R：最初から
// ============================================

let zc = [1.6, 0.6], wc = [0.9, 0.75];   // ★ 最初の z と w（[実部, 虚部]）
let powers = 0, showExp = false, theta = 1.0;
const UNIT = 110;                      // ★ 1 の長さ（ピクセル）
const N_TERMS = 30;                    // ★ e^{iθ} の級数を何項まで足すか
let dragging = null, ox, oy;

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); }

function cMul(a, b) { return [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]]; }   // (a + bi)(c + di)
function cAbs(a) { return Math.hypot(a[0], a[1]); }
function cArg(a) { return Math.atan2(a[1], a[0]); }
function cExpSeries(th, nTerms) {      // e^{iθ} = Σ (iθ)ⁿ / n! を本当に足す
  let sum = [0, 0], term = [1, 0];
  for (let n = 0; n < nTerms; n++) { sum = [sum[0] + term[0], sum[1] + term[1]]; term = cMul(term, [0, th / (n + 1)]); }
  return sum;
}
function toScr(c) { return [ox + c[0] * UNIT, oy - c[1] * UNIT]; }
function fromScr(x, y) { return [(x - ox) / UNIT, (oy - y) / UNIT]; }

function draw() {
  background(16, 20, 38);
  ox = width * 0.36; oy = height * 0.56;
  if (dragging) { let c = fromScr(mouseX, mouseY); c = [clampv(c[0], -4, 4), clampv(c[1], -3, 3)]; if (dragging === 'z') zc = c; else wc = c; }
  if (showExp) wc = cExpSeries(theta, N_TERMS);
  // 方眼と単位円
  stroke(40, 50, 80); strokeWeight(1);
  for (let x = -6; x <= 6; x++) line(ox + x * UNIT, 0, ox + x * UNIT, height);
  for (let y = -5; y <= 5; y++) line(0, oy + y * UNIT, width * 0.68, oy + y * UNIT);
  stroke(120, 130, 170); line(0, oy, width * 0.68, oy); line(ox, 0, ox, height);
  noFill(); stroke(255, 255, 255, 70); circle(ox, oy, 2 * UNIT);
  noStroke(); fill(150); textSize(14); text('実軸', ox + 4.4 * UNIT, oy - 6); text('虚軸 i', ox + 6, oy - 3.9 * UNIT);
  let zw = cMul(zc, wc), wz = cMul(wc, zc);
  // スペース：z, zw, zw², ... のらせん
  if (powers > 0) {
    let c = zc.slice(), pts = [toScr(c)];
    for (let n = 0; n < powers; n++) { c = cMul(c, wc); if (cAbs(c) > 30) break; pts.push(toScr(c)); }
    stroke(255, 200, 80, 160); strokeWeight(2); noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape();
    noStroke(); fill(255, 200, 80); for (let p of pts) circle(p[0], p[1], 6);
  }
  // 角の弧：arg z（青）と arg w（橙）、arg zw = arg z + arg w
  let az = cArg(zc), aw = cArg(wc);
  noFill(); strokeWeight(3);
  stroke(110, 170, 255); arcDir(0, az, 0.55);
  stroke(255, 150, 90); arcDir(az, az + aw, 0.75);
  arrowTo(zc, [110, 170, 255], 'z'); arrowTo(wc, [255, 150, 90], 'w'); arrowTo(zw, [130, 230, 150], 'zw');
  let p = toScr(wz); noFill(); stroke(255); strokeWeight(1.5); circle(p[0], p[1], 20);
  if (showExp) { let e = toScr(cExpSeries(theta, N_TERMS)); stroke(255, 150, 90, 120); line(ox, oy, e[0], oy); line(e[0], oy, e[0], e[1]); }

  // 右の表
  let tx = width * 0.7, ty = 120;
  fill(240); noStroke(); textSize(17);
  let rows = [['z', zc], ['w', wc], ['z·w', zw], ['w·z', wz]];
  rows.forEach((r, n) => { text(r[0] + ' = ' + r[1][0].toFixed(3) + (r[1][1] >= 0 ? ' + ' : ' − ') + Math.abs(r[1][1]).toFixed(3) + 'i', tx, ty + n * 26); });
  textSize(15); fill(200);
  text('|z| |w| = ' + (cAbs(zc) * cAbs(wc)).toFixed(4) + '　|zw| = ' + cAbs(zw).toFixed(4), tx, ty + 120);
  text('arg z + arg w = ' + deg(az + aw) + '°　arg zw = ' + deg(cArg(zw)) + '°', tx, ty + 144);
  fill(130, 230, 150); text('zw − wz = ' + Math.hypot(zw[0] - wz[0], zw[1] - wz[1]).toExponential(1) + '　（交換法則：順番を変えても同じ）', tx, ty + 170, width - tx - 10, 60);
  fill(255, 200, 80); textSize(16); text('e^{iθ} = Σ (iθ)ⁿ/n!（' + N_TERMS + ' 項）', tx, ty + 240);
  let es = cExpSeries(theta, N_TERMS);
  fill(220); textSize(15);
  text('θ = ' + theta.toFixed(3) + '　級数 = ' + es[0].toFixed(6) + ' + ' + es[1].toFixed(6) + 'i', tx, ty + 266);
  text('cos θ + i sin θ = ' + Math.cos(theta).toFixed(6) + ' + ' + Math.sin(theta).toFixed(6) + 'i', tx, ty + 290);
  fill(170); textSize(14);
  text('i を掛ける = 90° 回す、i·i = −1 = 180° 回す。2 次元の回転は「複素数を 1 つ掛ける」だけ。では 3 次元の回転は？ ハミルトンは「3 つ組の数」を 10 年以上さがした → 01', tx, ty + 330, width - tx - 20, 120);

  fill(240); textSize(20); textAlign(LEFT, BASELINE);
  text('複素数と平面の回転　w を掛けると、arg w だけ回って |w| 倍', 20, 36);
  fill(175); textSize(15);
  text('z（青）と w（橙）をドラッグ　スペース：w を何回も掛ける　E：w = e^{iθ}（級数で計算）　← → θ　R：最初から　白い○ = w·z（z·w と同じ点）', 20, 62);
  drawSelfTest(width - 170, height - 12);
}
function deg(a) { let d = ((a * 180 / Math.PI) % 360 + 540) % 360 - 180; return d.toFixed(1); }
function arcDir(a0, a1, r) {           // 角 a0 → a1 の弧（数学の向き：反時計回り）
  beginShape(); for (let s = 0; s <= 40; s++) { let a = a0 + ((a1 - a0) * s) / 40; vertex(ox + r * UNIT * Math.cos(a), oy - r * UNIT * Math.sin(a)); } endShape();
}
function arrowTo(c, col, lab) {
  let p = toScr(c), a = Math.atan2(p[1] - oy, p[0] - ox);
  stroke(...col); strokeWeight(3); line(ox, oy, p[0], p[1]);
  noStroke(); fill(...col); triangle(p[0], p[1], p[0] - 14 * Math.cos(a - 0.35), p[1] - 14 * Math.sin(a - 0.35), p[0] - 14 * Math.cos(a + 0.35), p[1] - 14 * Math.sin(a + 0.35));
  textSize(18); text(lab, p[0] + 10, p[1] - 8);
}

function mousePressed() {
  let pz = toScr(zc), pw = toScr(wc);
  if (Math.hypot(mouseX - pz[0], mouseY - pz[1]) < 30) dragging = 'z';
  else if (Math.hypot(mouseX - pw[0], mouseY - pw[1]) < 30) { dragging = 'w'; showExp = false; }
}
function mouseReleased() { dragging = null; }
function keyPressed() {
  if (key === ' ') powers = powers > 0 ? 0 : 24;
  if (key === 'e' || key === 'E') { showExp = !showExp; if (!showExp) wc = [0.9, 0.75]; }
  if (key === RIGHT_ARROW) { theta += Math.PI / 12; showExp = true; }
  if (key === LEFT_ARROW) { theta -= Math.PI / 12; showExp = true; }
  if (key === 'r' || key === 'R') { zc = [1.6, 0.6]; wc = [0.9, 0.75]; powers = 0; showExp = false; theta = 1; }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = []; seedRng(1);
  let e1 = 0, e2 = 0, e3 = 0, e4 = 0;
  for (let t = 0; t < 200; t++) {
    let a = [rndNormal(), rndNormal()], b = [rndNormal(), rndNormal()], c = [rndNormal(), rndNormal()];
    let ab = cMul(a, b), ba = cMul(b, a);
    e1 = Math.max(e1, Math.hypot(ab[0] - ba[0], ab[1] - ba[1]));
    e2 = Math.max(e2, Math.abs(cAbs(ab) - cAbs(a) * cAbs(b)));
    let d = cArg(ab) - cArg(a) - cArg(b); e3 = Math.max(e3, Math.abs(Math.atan2(Math.sin(d), Math.cos(d))));
    let l = cMul(cMul(a, b), c), r = cMul(a, cMul(b, c)); e4 = Math.max(e4, Math.hypot(l[0] - r[0], l[1] - r[1]));
  }
  check('交換法則 zw = wz（200 組）', e1 < 1e-12);
  check('|zw| = |z||w|', e2 < 1e-12);
  check('arg zw = arg z + arg w（2π を法として）', e3 < 1e-12);
  check('結合法則 (ab)c = a(bc)', e4 < 1e-12);
  let ii = cMul([0, 1], [0, 1]), iv = cMul([0, 1], [3, 2]);
  check('i·i = −1、i を掛けると (x, y) → (−y, x)（90° 回転）', ii[0] === -1 && ii[1] === 0 && iv[0] === -2 && iv[1] === 3);
  let e5 = 0;
  for (let th = -6; th <= 6; th += 0.37) { let s = cExpSeries(th, 40); e5 = Math.max(e5, Math.abs(s[0] - Math.cos(th)), Math.abs(s[1] - Math.sin(th))); }
  check('e^{iθ} の級数 = cos θ + i sin θ（|θ| ≤ 6、40 項、差 ' + e5.toExponential(1) + '）', e5 < 1e-10);
  let w = cExpSeries(0.7, 40), z = [2, -1], r = cMul(w, z), m = [Math.cos(0.7) * 2 - Math.sin(0.7) * -1, Math.sin(0.7) * 2 + Math.cos(0.7) * -1];
  check('e^{iθ} を掛ける = 回転行列 [[cos, −sin], [sin, cos]] を掛ける', Math.hypot(r[0] - m[0], r[1] - m[1]) < 1e-12);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. w を単位円の上（|w| = 1）に置くと、スペースのらせんはどうなる？ 1 の外・内に置くと？
// 2. w = i（0 + 1i）にしてスペース。何回掛けると z にもどる？ w = e^{2πi/5} なら？
// 3. E を押して ← → で θ を変えよう。級数の項数 N_TERMS を 5 にすると、θ が大きいときに何が起きる？
// 4. 2 次元の回転は掛け算 1 回。では 3 次元の回転は「3 つ組の数」でできる？ ハミルトンの答え → 01


// ==================================================
// ここから下は「四元数の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 種つきの乱数（同じ種なら毎回同じ列）。自己テストで使う
let rngState = 1;
function seedRng(s) { rngState = (s >>> 0) || 1; }
function rnd() {                       // 0〜1 の一様乱数（mulberry32）
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rndNormal() { let u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y, g) {       // g = 描く先（省略で画面、WEBGL では HUD のバッファ）
  g = g || window;
  g.noStroke(); g.fill(selfTestResults.every((r) => r.ok) ? g.color(120, 210, 150) : g.color(255, 90, 90));
  g.textSize(14); g.textAlign(LEFT, BASELINE); g.text(selfTestLine(), x, y);
}
