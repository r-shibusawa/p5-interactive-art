// ============================================
// 03 大きさの恒常性 ─ 廊下の巨人
// 遠近法の廊下に、画面の上でまったく同じ大きさ（同じ px）の人を 2 人置く。奥の人ほど大きく見える
// 脳は「遠くにあるのにこの大きさ → 本当は大きい」と距離で補正している（大きさの恒常性）
// ドラッグ・←→ = 奥の人を前後に動かす / ↑↓ = 奥の人の大きさ / Enter = 記録 / R = 消す
// T = 真実を見る（廊下を消して、奥の人の「影」を手前の人のとなりに並べる）
// ============================================

let H0 = 170;               // ★ 手前の人の画面の高さ px
let farH = 170;             // 奥の人の画面の高さ px（最初は H0 と同じ）
let zFar = 30;              // 奥の人までの距離 m
let CAM = 1.6, PERSON = 1.7;   // ★ 目の高さ・人の背の高さ m
let truthKey = false, trials = [];
const BLUE = [40, 90, 200];

function setup() {
  createCanvas(windowWidth, windowHeight);
  drawScene(false);
  selfTest();
}
function draw() { drawScene(truthKey); }

// ---- 遠近法：距離 z m の床は画面の y = vy + f·CAM / z、高さ s m のものは f·s / z px に写る
function cam() { return { cx: Math.round(width * 0.4), vy: Math.round(height * 0.4), f: height * 0.6 }; }
function floorY(z) { let c = cam(); return Math.round(c.vy + (c.f * CAM) / z); }
function screenSize(sMeters, z) { return (cam().f * sMeters) / z; }
function zNear() { return (cam().f * PERSON) / H0; }          // 手前の人は本当の 1.7 m が H0 px に写る距離
function screenX(X, z) { let c = cam(); return Math.round(c.cx + (c.f * X) / z); }

function drawScene(truth) {
  background(truth ? 235 : 214);
  let c = cam(), zN = zNear(), zBack = 70;
  if (!truth) drawCorridor(c, zBack);
  let xN = screenX(-1.0, zN), yN = floorY(zN), xF = screenX(0.6, zFar), yF = floorY(zFar);
  drawPerson(xN, yN, H0, BLUE);
  drawPerson(xF, yF, farH, BLUE);
  if (truth) {
    // 影：奥の人をそのまま手前の人の左へ（同じ px）
    drawPerson(xN - 100, yN, farH, [120, 140, 190]);
    heightBar(xN - 170, yN, H0); heightBar(xF + 60, yF, farH);
    // 点線：同じ 1.7 m の人が奥にいたら、本当はこの大きさに写る
    let hp = Math.round(screenSize(PERSON, zFar));
    stroke(200, 40, 40); strokeWeight(2); noFill(); drawingContext.setLineDash([6, 5]);
    rect(xF - hp * 0.18, yF - hp, hp * 0.36, hp); drawingContext.setLineDash([]);
    noStroke(); fill(200, 40, 40); textSize(15); textAlign(LEFT, TOP);
    text('点線 = 同じ 1.7 m の人ならこの大きさ（' + hp + ' px）', xF + 20, yF + 8);
  }
  // 文字
  let realM = (PERSON * farH * zFar) / (H0 * zN);
  noStroke(); fill(25); textAlign(LEFT, BASELINE); textSize(18);
  text('ドラッグ・←→：奥の人の距離 ' + zFar.toFixed(1) + ' m　↑↓：奥の人の大きさ ' + farH + ' px　Enter：記録　T：真実', 20, 34);
  fill(70); textSize(15);
  text('奥の人の大きさを変えて、手前の人と「同じ背の高さの人」に見えたら Enter。いまの奥の人は、本当なら ' + realM.toFixed(2) + ' m の人', 20, 60);
  drawTable(Math.round(width * 0.7), 110);
  fill(selfTestResults.length && selfTestResults.every((r) => r.ok) ? color(40, 140, 70) : color(200, 40, 40)); textSize(14);
  text(selfTestLine(), 20, height - 16);
}

function drawCorridor(c, zBack) {
  let W = 2.2, Hc = 3.0, z0 = 0.8;     // 廊下の半分の幅・天井の高さ m、いちばん手前の距離
  let P = (X, Y, z) => [c.cx + (c.f * X) / z, c.vy + (c.f * (CAM - Y)) / z];   // 3D (X, 高さ Y, 距離 z) → 画面
  let face = (pts, g) => { fill(g); beginShape(); for (let q of pts) vertex(q[0], q[1]); endShape(CLOSE); };
  noStroke();
  face([P(-W, 0, z0), P(W, 0, z0), P(W, 0, zBack), P(-W, 0, zBack)], 186);       // 床
  face([P(-W, 0, z0), P(-W, Hc, z0), P(-W, Hc, zBack), P(-W, 0, zBack)], 204);   // 左の壁
  face([P(W, 0, z0), P(W, Hc, z0), P(W, Hc, zBack), P(W, 0, zBack)], 198);       // 右の壁
  face([P(-W, Hc, z0), P(W, Hc, z0), P(W, Hc, zBack), P(-W, Hc, zBack)], 224);   // 天井
  face([P(-W, 0, zBack), P(W, 0, zBack), P(W, Hc, zBack), P(-W, Hc, zBack)], 150); // 突き当たり
  stroke(120); strokeWeight(1);
  for (let z = 2; z < zBack; z *= 1.2) {                                     // 床と壁の目地（遠いほどつまる）
    let a = P(-W, 0, z), b = P(W, 0, z), at = P(-W, Hc, z), bt = P(W, Hc, z);
    line(a[0], a[1], b[0], b[1]); line(a[0], a[1], at[0], at[1]); line(b[0], b[1], bt[0], bt[1]);
  }
  for (let X = -W; X <= W + 1e-6; X += W / 4) { let a = P(X, 0, z0), b = P(X, 0, zBack); line(a[0], a[1], b[0], b[1]); }
}

// 足もと (x, y)・高さ h px の人（頭・胴・脚）。頭のてっぺんが y − h
function drawPerson(x, y, h, col) {
  noStroke(); fill(col);
  let r = h * 0.09;
  circle(x, y - h + r, 2 * r);
  rect(x - h * 0.14, y - h * 0.79, h * 0.28, h * 0.38, h * 0.06);
  rect(x - h * 0.12, y - h * 0.43, h * 0.1, h * 0.43);
  rect(x + h * 0.02, y - h * 0.43, h * 0.1, h * 0.43);
}
function heightBar(x, y, h) {
  stroke(200, 40, 40); strokeWeight(2); line(x, y, x, y - h); line(x - 6, y, x + 6, y); line(x - 6, y - h, x + 6, y - h);
  noStroke(); fill(200, 40, 40); textSize(15); textAlign(CENTER, BOTTOM); text(h + ' px', x, y - h - 4); textAlign(LEFT, BASELINE);
}

function mouseDragged() {
  let c = cam(), y = constrain(mouseY, floorY(60) + 1, floorY(zNear() * 1.05));
  zFar = constrain((c.f * CAM) / (y - c.vy), zNear() * 1.05, 60);
}
function keyPressed() {
  if (key === RIGHT_ARROW) zFar = Math.min(60, zFar * 1.1);
  if (key === LEFT_ARROW) zFar = Math.max(zNear() * 1.05, zFar / 1.1);
  if (key === UP_ARROW) farH = Math.min(400, farH + 2);
  if (key === DOWN_ARROW) farH = Math.max(10, farH - 2);
  if (key === 't' || key === 'T') truthKey = !truthKey;
  if (key === 'r' || key === 'R') trials = [];
  if (key === ENTER) {
    let hp = screenSize(PERSON, zFar);
    trials.push({ z: zFar, chosen: farH, persp: hp, k: constancy(farH, H0, hp) });
    farH = H0;
  }
}
// 恒常性 %：画面で同じ大きさを選んだら 0 %、遠近法どおり（本当の 1.7 m）を選んだら 100 %
function constancy(chosen, same, persp) { return ((same - chosen) / (same - persp)) * 100; }
function mean(a) { return a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0; }

function drawTable(x, y) {
  noStroke(); fill(25); textSize(16); textAlign(LEFT, BASELINE);
  let cw = [44, 70, 70, 76, 70], cols = (v, yy) => { let xx = x; v.forEach((s, i) => { text(s, xx, yy); xx += cw[i]; }); };
  cols(['試行', '距離', '選んだ', '遠近法', '恒常性'], y);
  let last = trials.slice(-10); fill(60);
  last.forEach((t, i) => cols([trials.length - last.length + i + 1, t.z.toFixed(1) + ' m', t.chosen + ' px', t.persp.toFixed(0) + ' px', t.k.toFixed(0) + ' %'], y + 24 * (i + 1)));
  fill(25); textSize(17);
  text(trials.length ? '平均の恒常性 ' + mean(trials.map((t) => t.k)).toFixed(0) + ' %（' + trials.length + ' 回）' : 'まだ記録がありません', x, y + 24 * 11 + 6);
  fill(80); textSize(13);
  text('0 % = 画面の大きさで判断、100 % = 距離を完全に補正', x, y + 24 * 12 + 6);
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. 奥の人を一番奥まで動かす。画面では同じ 170 px なのに、何 m の巨人に見える？
// 2. 恒常性を 3 つの距離で測る。遠いほど 100 % に近い？
// 3. T で廊下を消すと、2 人は同じ大きさに見える？ 錯視の原因は「人」ではなく「廊下」
// 4. drawCorridor の中の目地の線（line）を消すと、錯視はどうなる？
// 5. CAM（目の高さ）を 0.5 にすると、子どもの目線の廊下になる


// ==================================================
// ここから下は「錯視の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
function readPix(x, y) {
  let d = pixelDensity(), i = 4 * (Math.round(y * d) * Math.round(width * d) + Math.round(x * d));
  return [pixels[i], pixels[i + 1], pixels[i + 2]];
}
// 四角い範囲の中で、色 c の画素の上下のはし → 高さ px
function colorHeight(xa, xb, ya, yb, c, tol = 14) {
  let top = 1e9, bot = -1;
  for (let x = Math.round(xa); x <= xb; x += 2) for (let y = Math.max(0, Math.round(ya)); y <= Math.min(height - 1, yb); y++) {
    let p = readPix(x, y);
    if (Math.abs(p[0] - c[0]) <= tol && Math.abs(p[1] - c[1]) <= tol && Math.abs(p[2] - c[2]) <= tol) { top = Math.min(top, y); bot = Math.max(bot, y); }
  }
  return bot < 0 ? 0 : bot - top + 1;
}

// ---- 自己テスト：描いた画面で 2 人の高さを画素で測る。遠近法の式も確かめる
let selfTestResults = [];
function selfTest() {
  let R = [], ok = (name, cond) => R.push({ name, ok: !!cond }), zN = zNear();
  ok('はじめは 奥の人 = 手前の人 = ' + H0 + ' px（同じ定数）', farH === H0);
  drawScene(false); loadPixels();
  let xN = screenX(-1.0, zN), yN = floorY(zN), xF = screenX(0.6, zFar), yF = floorY(zFar);
  let hN = colorHeight(xN - 20, xN + 20, yN - H0 - 10, yN + 5, BLUE), hF = colorHeight(xF - 20, xF + 20, yF - farH - 10, yF + 5, BLUE);
  ok('画素で測った背の高さ：手前 ' + hN + ' px、奥 ' + hF + ' px（等しい）', hN === hF && Math.abs(hN - H0) <= 2);
  ok('遠近法：距離が 2 倍なら写る大きさは半分', Math.abs(screenSize(1, 10) - 2 * screenSize(1, 20)) < 1e-9);
  ok('手前の人の 1.7 m は、ちょうど H0 px に写る', Math.abs(screenSize(PERSON, zN) - H0) < 1e-9);
  ok('床の線は遠いほど上（消失点）に近づく', floorY(5) > floorY(10) && floorY(10) > floorY(40) && floorY(40) > cam().vy);
  ok('恒常性：画面と同じ 0 %、遠近法どおり 100 %', constancy(170, 170, 50) === 0 && constancy(50, 170, 50) === 100);
  selfTestResults = R;
  for (let r of R) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name);
  return R.every((r) => r.ok);
}
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
