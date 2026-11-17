// ============================================
// 00 ミュラー＝リヤー錯視
// 同じ長さの 2 本の線でも、両はしの矢羽が外向き（＞─＜）だと長く、内向き（＜─＞）だと短く見える
// 下の線（比較）の長さを ↑↓ で変えて「上と同じに見える」所で Enter → 実際の差（px と %）を記録する（調整法）
// ↑↓ = 比較の長さ / ←→ = 矢羽の角度 / A・Z = 矢羽の長さ / F = 矢羽の向きを入れかえ / Enter = 記録 / R = 記録を消す
// T またはマウスを押している間 = 真実を見る（矢羽を消して、本当の長さを px で表示）
// ============================================

let L0 = 300;               // ★ 上の線（標準刺激）の長さ px
let cmpLen = 300;           // 下の線（比較刺激）の長さ。最初は L0 と同じ
let finAng = 35;            // ★ 矢羽の角度（度）
let finLen = 60;            // ★ 矢羽の長さ px
let SW = 6;                 // ★ 線の太さ px
let swapFins = false, truthKey = false;
let trials = [];            // 記録：{ ang, fl, len, diff, pct }
const PAPER = 236, INK = 25;

function setup() {
  createCanvas(windowWidth, windowHeight);
  L0 = Math.round(Math.min(300, width * 0.28));
  cmpLen = L0;
  drawScene(false);
  selfTest();
}

function truthOn() { return truthKey || mouseIsPressed; }

function draw() {
  drawScene(truthOn());
}

// 2 本の線の位置（画面の大きさから決める）
function layout() {
  return { cx: Math.round(width * 0.36), y1: Math.round(height * 0.3), y2: Math.round(height * 0.55) };
}

function drawScene(truth) {
  background(PAPER);
  let { cx, y1, y2 } = layout();
  drawML(cx, y1, L0, !swapFins, !truth);       // 上：標準（外向きの矢羽）
  drawML(cx, y2, cmpLen, swapFins, !truth);    // 下：比較（内向きの矢羽）

  if (truth) {
    // 両はしに縦の補助線と、本当の長さ
    stroke(200, 40, 40); strokeWeight(1);
    for (let [y, len] of [[y1, L0], [y2, cmpLen]]) {
      let x0 = cx - Math.floor(len / 2), x1 = x0 + len;
      line(x0 - 0.5, y - 40, x0 - 0.5, y + 40); line(x1 + 0.5, y - 40, x1 + 0.5, y + 40);   // 線のすぐ外側の 1 px
      for (let x = x0; x <= x1; x += 50) line(x, y + 14, x, y + 22);   // 50 px ごとの目盛り
    }
    noStroke(); fill(200, 40, 40); textSize(18); textAlign(LEFT, CENTER);
    text('上 ' + L0 + ' px', cx + L0 / 2 + 60, y1);
    text('下 ' + cmpLen + ' px（差 ' + signed(cmpLen - L0) + ' px）', cx + Math.max(cmpLen, L0) / 2 + 60, y2);
  }

  // 文字
  noStroke(); fill(INK); textAlign(LEFT, BASELINE); textSize(18);
  text('↑↓：下の線の長さ　←→：矢羽の角度 ' + finAng + '°　A・Z：矢羽の長さ ' + finLen + ' px　F：向きを入れかえ　Enter：記録　R：消す', 20, 34);
  fill(90); textSize(15);
  text('下の線が上の線と「同じ長さに見える」ところで Enter。T かマウスを押すと矢羽が消えて本当の長さが見える', 20, 60);
  drawTable(20, height - 230);
  drawGraph(Math.round(width * 0.66), 110, Math.round(width * 0.3), Math.round(height * 0.42));
  fill(selfTestResults.length && selfTestResults.every((r) => r.ok) ? color(40, 140, 70) : color(200, 40, 40)); textSize(14);
  text(selfTestLine(), 20, height - 16);
}

// ミュラー＝リヤー図形：中心 cx、高さ y、長さ len。out = true なら外向き（＞─＜）
function drawML(cx, y, len, out, fins) {
  let x0 = cx - Math.floor(len / 2), x1 = x0 + len;
  noStroke(); fill(INK);
  rect(x0, y - SW / 2, len, SW);                     // 線（軸）は長方形で描く → 長さが正確
  if (!fins) return;
  stroke(INK); strokeWeight(SW); strokeCap(ROUND);
  for (let [x, dir] of [[x0, -1], [x1, 1]]) {
    let p = finTip(x, y, dir, out);
    line(x, y, p[0], p[1] - 0); line(x, y, p[0], 2 * y - p[1]);
  }
}
// 矢羽の先の位置：dir = −1 が左はし、+1 が右はし
function finTip(x, y, dir, out) {
  let a = (finAng * Math.PI) / 180, s = out ? dir : -dir;
  return [x + s * finLen * Math.cos(a), y - finLen * Math.sin(a)];
}

function keyPressed() {
  if (key === UP_ARROW) cmpLen = Math.min(Math.round(width * 0.6), cmpLen + 2);
  if (key === DOWN_ARROW) cmpLen = Math.max(40, cmpLen - 2);
  if (key === RIGHT_ARROW) finAng = Math.min(85, finAng + 5);
  if (key === LEFT_ARROW) finAng = Math.max(5, finAng - 5);
  if (key === 'a' || key === 'A') finLen = Math.min(140, finLen + 10);
  if (key === 'z' || key === 'Z') finLen = Math.max(0, finLen - 10);
  if (key === 'f' || key === 'F') swapFins = !swapFins;
  if (key === 't' || key === 'T') truthKey = !truthKey;
  if (key === 'r' || key === 'R') trials = [];
  if (key === ENTER) {
    trials.push({ ang: finAng, fl: finLen, len: cmpLen, diff: cmpLen - L0, pct: illusionPct(cmpLen, L0) });
    cmpLen = L0 + Math.round((Math.random() - 0.5) * 80);   // 次の試行は少しずらしてから始める
  }
}

// 錯視量 %：（同じに見えた長さ − 本当の長さ）÷ 本当の長さ
function illusionPct(seen, real) { return ((seen - real) / real) * 100; }
function mean(a) { return a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0; }
function signed(v) { return (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v); }

function drawTable(x, y) {
  let head = ['試行', '角度', '羽の長さ', '比較の長さ', '差 px', '錯視量'], cw = [50, 60, 90, 100, 70, 80];
  let cols = (vals, yy) => { let xx = x; vals.forEach((v, i) => { text(v, xx, yy); xx += cw[i]; }); };
  noStroke(); fill(INK); textSize(16); textAlign(LEFT, BASELINE);
  cols(head, y);
  let last = trials.slice(-6);
  fill(70);
  last.forEach((t, i) => cols([trials.length - last.length + i + 1, t.ang + '°', t.fl, t.len, signed(t.diff), t.pct.toFixed(1) + ' %'], y + 24 * (i + 1)));
  fill(INK); textSize(18);
  text(trials.length ? '平均の錯視量 ' + mean(trials.map((t) => t.pct)).toFixed(1) + ' %（' + trials.length + ' 回）' : 'まだ記録がありません', x, y + 24 * 7 + 6);
}

// 角度ごとの錯視量のグラフ（横：角度、縦：%）
function drawGraph(gx, gy, gw, gh) {
  noFill(); stroke(150); strokeWeight(1); rect(gx, gy, gw, gh);
  let yOf = (p) => gy + gh - ((p + 10) / 50) * gh, xOf = (a) => gx + (a / 90) * gw;
  stroke(190); line(gx, yOf(0), gx + gw, yOf(0));
  noStroke(); fill(90); textSize(13); textAlign(RIGHT, CENTER);
  for (let p of [-10, 0, 20, 40]) text(p + '%', gx - 4, yOf(p));
  textAlign(CENTER, TOP); for (let a of [0, 30, 60, 90]) text(a + '°', xOf(a), gy + gh + 4);
  textAlign(LEFT, BASELINE); text('矢羽の角度と錯視量（点 = 試行）', gx, gy - 8);
  fill(200, 40, 40);
  for (let t of trials) circle(xOf(t.ang), constrain(yOf(t.pct), gy, gy + gh), 8);
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. 角度 35° で 3 回測って平均を出す。次に 70° で。どちらが錯視が強い？
// 2. 矢羽の長さを 0 にすると錯視量は 0 % に近づく？（Z を押し続ける）
// 3. F で向きを入れかえると、差の符号はどうなる？
// 4. T で真実を見てから、もう一度測る。知っていても錯視は消えない？
// 5. 友だちと測り比べよう。錯視の強さには個人差がある


// ==================================================
// ここから下は「錯視の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 画面の画素を読む（pixelDensity に対応）
function readPix(x, y) {
  let d = pixelDensity(), i = 4 * (Math.round(y * d) * Math.round(width * d) + Math.round(x * d));
  return [pixels[i], pixels[i + 1], pixels[i + 2]];
}
// 高さ y の行で、色が c に近い画素が続く範囲 [左, 右] を探す（x の範囲 xa〜xb）
function inkRun(y, xa, xb, c, tol = 12) {
  let first = -1, last = -1;
  for (let x = Math.max(0, xa); x <= Math.min(width - 1, xb); x++) {
    let p = readPix(x, y);
    if (Math.abs(p[0] - c) <= tol && Math.abs(p[1] - c) <= tol && Math.abs(p[2] - c) <= tol) { if (first < 0) first = x; last = x; }
  }
  return first < 0 ? 0 : last - first + 1;
}

// ---- 自己テスト：描いた画面の画素を測って、2 本が本当に同じ長さかを確かめる
let selfTestResults = [];
function selfTest() {
  let R = [], ok = (name, cond) => R.push({ name, ok: !!cond });
  let { cx, y1, y2 } = layout(), xa = cx - L0, xb = cx + L0;
  ok('はじめは 標準 = 比較 = ' + L0 + ' px（同じ定数）', cmpLen === L0);
  drawScene(true); loadPixels();                     // 真実モード（矢羽なし）で画素を測る
  let m1 = inkRun(y1, xa, xb, INK), m2 = inkRun(y2, xa, xb, INK);
  ok('画素で測った長さ：上 ' + m1 + ' px、下 ' + m2 + ' px（等しく、L0 ±1）', m1 === m2 && Math.abs(m1 - L0) <= 1);
  drawScene(false); loadPixels();                    // 錯視の図（矢羽あり）
  let c1 = readPix(cx, y1), c2 = readPix(cx, y2);
  ok('錯視の図でも 2 本の線の色は同じ', c1.join() === c2.join() && c1[0] === INK);
  let tO = finTip(100, 50, 1, true), tI = finTip(100, 50, 1, false);
  ok('矢羽の先：外向きと内向きは左右対称（はしからの距離が同じ）', Math.abs(tO[0] - 100 + (tI[0] - 100)) < 1e-9 && tO[1] === tI[1]);
  ok('錯視量 %：330 px に見えた 300 px の線は +10 %', Math.abs(illusionPct(330, 300) - 10) < 1e-9);
  ok('平均：記録 0 回は 0、[2, 4, 9] は 5', mean([]) === 0 && mean([2, 4, 9]) === 5);
  selfTestResults = R;
  for (let r of R) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name);
  return R.every((r) => r.ok);
}
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
