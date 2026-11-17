// ============================================
// 01 エビングハウス錯視とポンゾ錯視
// 1：同じ大きさのオレンジの円でも、大きな円に囲まれると小さく、小さな円に囲まれると大きく見える
// 2：線路のように奥へ向かう 2 本の線の間では、上（遠く）の棒のほうが長く見える
// ↑↓ = 右（下）のオレンジの大きさ / ←→ = まわりの大きさ・線の傾き / 1・2 = 錯視の切替 / Enter = 記録 / R = 消す
// T またはマウスを押している間 = 真実を見る（まわりを消して、本当の大きさを px で表示）
// ============================================

let which = 1;               // 1 = エビングハウス、2 = ポンゾ
let R0 = 40;                 // ★ 左のオレンジの円の半径 px（標準）
let cmpR = 40;               // 右の円の半径（比較）。最初は R0 と同じ
let bigRatio = 1.7;          // ★ 大きい円の半径 ÷ R0
let smallRatio = 0.35;       // ★ 小さい円の半径 ÷ R0
let B0 = 160;                // ★ ポンゾの上の棒の長さ px（標準）
let cmpB = 160;              // 下の棒（比較）
let conv = 0.32;             // ★ ポンゾの線の傾き（0 = 平行）
let truthKey = false, trials = [];
const PAPER = 240, ORANGE = [235, 120, 30], RING = 110;

function setup() {
  createCanvas(windowWidth, windowHeight);
  drawScene(false);
  selfTest();
}
function truthOn() { return truthKey || mouseIsPressed; }
function draw() { drawScene(truthOn()); }

function layout() {
  return { y: Math.round(height * 0.45), xL: Math.round(width * 0.22), xR: Math.round(width * 0.55), cx: Math.round(width * 0.38),
           yTop: Math.round(height * 0.3), yBot: Math.round(height * 0.66) };
}

function drawScene(truth) {
  background(PAPER);
  let L = layout();
  if (which === 1) {
    if (!truth) {
      ringOf(L.xL, L.y, R0, 6, R0 * bigRatio, 14);             // 大きな円 6 個
      ringOf(L.xR, L.y, cmpR, 8, R0 * smallRatio, 8);          // 小さな円 8 個
    }
    noStroke(); fill(ORANGE);
    circle(L.xL, L.y, 2 * R0); circle(L.xR, L.y, 2 * cmpR);
    if (truth) {
      measureBar(L.xL - R0, L.xL + R0, L.y + R0 + 24, '直径 ' + 2 * R0 + ' px');
      measureBar(L.xR - cmpR, L.xR + cmpR, L.y + cmpR + 24, '直径 ' + 2 * cmpR + ' px');
    }
  } else {
    // 線路：消失点 (cx, vy) から広がる 2 本の線と枕木
    let vy = Math.round(height * 0.08), half = (y) => (y - vy) * conv + 30;
    if (!truth) {
      stroke(RING); strokeWeight(5);
      line(L.cx - 30, vy, L.cx - half(height), height); line(L.cx + 30, vy, L.cx + half(height), height);
      strokeWeight(2); stroke(RING, 120);
      for (let k = 1; k < 14; k++) { let y = vy + (height - vy) * Math.pow(k / 14, 1.6); line(L.cx - half(y), y, L.cx + half(y), y); }
    }
    noStroke(); fill(ORANGE);
    rect(L.cx - Math.floor(B0 / 2), L.yTop - 6, B0, 12);
    rect(L.cx - Math.floor(cmpB / 2), L.yBot - 6, cmpB, 12);
    if (truth) {
      measureBar(L.cx - Math.floor(B0 / 2), L.cx - Math.floor(B0 / 2) + B0, L.yTop + 26, B0 + ' px');
      measureBar(L.cx - Math.floor(cmpB / 2), L.cx - Math.floor(cmpB / 2) + cmpB, L.yBot + 26, cmpB + ' px');
    }
  }
  // 文字
  noStroke(); fill(30); textAlign(LEFT, BASELINE); textSize(18);
  let par = which === 1 ? '大きい円 × ' + bigRatio.toFixed(1) : '線の傾き ' + conv.toFixed(2);
  text('1・2：' + (which === 1 ? 'エビングハウス' : 'ポンゾ') + '　↑↓：' + (which === 1 ? '右の円' : '下の棒') + 'の大きさ　←→：' + par + '　Enter：記録　R：消す　T：真実', 20, 34);
  fill(90); textSize(15);
  text(which === 1 ? '右のオレンジが左と同じ大きさに見えたら Enter' : '下の棒が上の棒と同じ長さに見えたら Enter', 20, 60);
  drawTable(Math.round(width * 0.72), 110);
  fill(selfTestResults.length && selfTestResults.every((r) => r.ok) ? color(40, 140, 70) : color(200, 40, 40)); textSize(14);
  text(selfTestLine(), 20, height - 16);
}

// 中心 (x, y)・半径 r の円のまわりに、半径 rr の円を n 個、すき間 gap で並べる
function ringOf(x, y, r, n, rr, gap) {
  noStroke(); fill(RING);
  let d = r + gap + rr;
  for (let k = 0; k < n; k++) { let a = (k / n) * TWO_PI + PI / n; circle(x + d * Math.cos(a), y + d * Math.sin(a), 2 * rr); }
}
function measureBar(x0, x1, y, s) {
  stroke(200, 40, 40); strokeWeight(2); line(x0, y, x1, y); line(x0, y - 6, x0, y + 6); line(x1, y - 6, x1, y + 6);
  noStroke(); fill(200, 40, 40); textSize(16); textAlign(CENTER, TOP); text(s, (x0 + x1) / 2, y + 8); textAlign(LEFT, BASELINE);
}

function keyPressed() {
  if (key === '1' || key === '2') { which = +key; truthKey = false; }
  if (key === UP_ARROW) { if (which === 1) cmpR = Math.min(90, cmpR + 1); else cmpB = Math.min(400, cmpB + 2); }
  if (key === DOWN_ARROW) { if (which === 1) cmpR = Math.max(10, cmpR - 1); else cmpB = Math.max(40, cmpB - 2); }
  if (key === RIGHT_ARROW) { if (which === 1) bigRatio = Math.min(2.6, bigRatio + 0.1); else conv = Math.min(0.8, conv + 0.04); }
  if (key === LEFT_ARROW) { if (which === 1) bigRatio = Math.max(0.4, bigRatio - 0.1); else conv = Math.max(0, conv - 0.04); }
  if (key === 't' || key === 'T') truthKey = !truthKey;
  if (key === 'r' || key === 'R') trials = [];
  if (key === ENTER) {
    let std = which === 1 ? 2 * R0 : B0, seen = which === 1 ? 2 * cmpR : cmpB;
    trials.push({ which, par: which === 1 ? bigRatio.toFixed(1) : conv.toFixed(2), diff: seen - std, pct: illusionPct(seen, std) });
    if (which === 1) cmpR = R0 + Math.round((Math.random() - 0.5) * 16); else cmpB = B0 + Math.round((Math.random() - 0.5) * 60);
  }
}

function illusionPct(seen, real) { return ((seen - real) / real) * 100; }
function mean(a) { return a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0; }

function drawTable(x, y) {
  noStroke(); fill(30); textSize(16); textAlign(LEFT, BASELINE);
  let cw = [60, 140, 70, 80], cols = (v, yy) => { let xx = x; v.forEach((s, i) => { text(s, xx, yy); xx += cw[i]; }); };
  cols(['試行', '錯視（条件）', '差 px', '錯視量'], y);
  let last = trials.slice(-10); fill(70);
  last.forEach((t, i) => cols([trials.length - last.length + i + 1, (t.which === 1 ? 'エ ×' : 'ポ ') + t.par, (t.diff > 0 ? '+' : '') + t.diff, t.pct.toFixed(1) + ' %'], y + 24 * (i + 1)));
  fill(30); textSize(17);
  for (let w of [1, 2]) {
    let a = trials.filter((t) => t.which === w).map((t) => t.pct);
    text((w === 1 ? 'エビングハウス' : 'ポンゾ') + ' 平均 ' + (a.length ? mean(a).toFixed(1) + ' %（' + a.length + ' 回）' : '−'), x, y + 24 * 11 + (w - 1) * 26);
  }
  fill(90); textSize(14);
  text('錯視量 = (同じに見えた大きさ − 本当) ÷ 本当', x, y + 24 * 11 + 56);
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. エビングハウス：←→ で大きい円を R0 と同じ大きさ（× 1.0）にすると錯視は弱くなる？
// 2. ringOf の gap（すき間）を大きくすると？ まわりが遠いと効きにくい
// 3. ポンゾ：線の傾きを 0（平行）にすると、2 本の棒は同じに見える？
// 4. 枕木だけ・線だけにして、どちらが効いているか確かめよう
// 5. 何回か測って、エビングハウスとポンゾの平均の錯視量を比べよう


// ==================================================
// ここから下は「錯視の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
function readPix(x, y) {
  let d = pixelDensity(), i = 4 * (Math.round(y * d) * Math.round(width * d) + Math.round(x * d));
  return [pixels[i], pixels[i + 1], pixels[i + 2]];
}
// 高さ y の行で、色 c（RGB）の画素が続く長さを数える（x の範囲 xa〜xb）
function colorRun(y, xa, xb, c, tol = 12) {
  let first = -1, last = -1;
  for (let x = Math.max(0, xa); x <= Math.min(width - 1, xb); x++) {
    let p = readPix(x, y);
    if (Math.abs(p[0] - c[0]) <= tol && Math.abs(p[1] - c[1]) <= tol && Math.abs(p[2] - c[2]) <= tol) { if (first < 0) first = x; last = x; }
  }
  return first < 0 ? 0 : last - first + 1;
}

// ---- 自己テスト：両方の錯視を描いて画素を測り、比べる 2 つが本当に同じ大きさかを確かめる
let selfTestResults = [];
function selfTest() {
  let R = [], ok = (name, cond) => R.push({ name, ok: !!cond }), keep = which, L = layout();
  ok('はじめは 比較 = 標準（円の半径 ' + R0 + '、棒 ' + B0 + ' px、同じ定数）', cmpR === R0 && cmpB === B0);
  which = 1; drawScene(false); loadPixels();
  let a = colorRun(L.y, L.xL - 100, L.xL + 100, ORANGE), b = colorRun(L.y, L.xR - 100, L.xR + 100, ORANGE);
  ok('エビングハウス：画素で測った直径 ' + a + ' px と ' + b + ' px（等しい）', a === b && Math.abs(a - 2 * R0) <= 2);
  let pa = readPix(L.xL, L.y), pb = readPix(L.xR, L.y);
  ok('エビングハウス：2 つの円の中心の色が同じ ' + pa.join(','), pa.join() === pb.join() && pa.join() === ORANGE.join());
  which = 2; drawScene(false); loadPixels();
  let c = colorRun(L.yTop, L.cx - 300, L.cx + 300, ORANGE), d = colorRun(L.yBot, L.cx - 300, L.cx + 300, ORANGE);
  ok('ポンゾ：画素で測った棒の長さ ' + c + ' px と ' + d + ' px（等しい）', c === d && Math.abs(c - B0) <= 1);
  which = keep; drawScene(false);
  ok('錯視量 %：88 px に見えた 80 px は +10 %', Math.abs(illusionPct(88, 80) - 10) < 1e-9);
  ok('平均：[] は 0、[−4, 10] は 3', mean([]) === 0 && mean([-4, 10]) === 3);
  selfTestResults = R;
  for (let r of R) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name);
  return R.every((r) => r.ok);
}
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
