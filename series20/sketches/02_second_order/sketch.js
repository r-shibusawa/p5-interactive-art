// ============================================
// 02 二次系と減衰（バネ・マス・ダンパ）
// おもりをバネで引っぱると、行きすぎて（オーバーシュート）ゆれながら落ち着く
//   y'' + 2ζωn y' + ωn² y = ωn² r
//   ζ（減衰比）が小さいとゆれる、1 でちょうど、1 より大きいとのんびり
// 左右キー = ζ / 上下キー = ωn（固有角周波数）/ スペース = もう一度ステップ
// ============================================

let zeta = 0.3; // ★ 減衰比 ζ（0 = ゆれ続ける、1 = 臨界減衰）
let wn = 3.0; // ★ 固有角周波数 ωn [rad/s]（大きいほど速い）
let period = 6; // ★ 目標を切り替える間隔 [秒]

let y = 0, v = 0, r = 1, t = 0, tStep = 0;
let peak = 0, tSettle = 0;
let HIST = 600, dt = 1 / 60;
let hY = [], hR = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(230, 30, 10);
  // ★ 二次系の式を細かく 4 回に分けて積分（安定のため）
  for (let k = 0; k < 4; k++) {
    let a = wn * wn * (r - y) - 2 * zeta * wn * v;
    v += a * dt / 4;
    y += v * dt / 4;
  }
  y = constrain(y, -5, 5); v = constrain(v, -100, 100);
  t += dt;
  let e = r - y;
  if (r === 1 && y - 1 > peak) peak = y - 1; // 行きすぎの最大値
  if (abs(e) > 0.02) tSettle = t - tStep; // 2% の帯に入りきるまでの時間
  if (t - tStep >= period) { r = 1 - r; tStep = t; peak = 0; tSettle = 0; }
  pushHist(hY, y); pushHist(hR, r);

  // ---- バネ・おもり・ダンパの絵
  let wallX = width * 0.06, baseY = height * 0.5, scaleX = width * 0.18;
  let mx = wallX + 60 + scaleX * (0.5 + y); // おもりの位置
  let rx = wallX + 60 + scaleX * (0.5 + r);
  stroke(0, 0, 50); strokeWeight(6); line(wallX, baseY - 120, wallX, baseY + 120); // 壁
  stroke(0, 0, 40); strokeWeight(2); line(wallX, baseY + 60, width * 0.46, baseY + 60); // 床
  // バネ（ジグザグ）
  stroke(200, 60, 100); strokeWeight(3); noFill();
  beginShape();
  vertex(wallX, baseY - 30);
  let n = 12;
  for (let i = 1; i < n; i++) vertex(map(i, 0, n, wallX, mx - 30), baseY - 30 + (i % 2 ? -14 : 14));
  vertex(mx - 30, baseY - 30);
  endShape();
  // ダンパ（筒とピストン）
  stroke(0, 0, 70); strokeWeight(3);
  line(wallX, baseY + 30, wallX + 70, baseY + 30);
  noFill(); rect(wallX + 70, baseY + 16, 60, 28);
  line(wallX + 70 + constrain(map(y, -0.5, 1.5, 10, 50), 5, 55), baseY + 18, wallX + 70 + constrain(map(y, -0.5, 1.5, 10, 50), 5, 55), baseY + 42);
  line(wallX + 70 + constrain(map(y, -0.5, 1.5, 10, 50), 5, 55), baseY + 30, mx - 30, baseY + 30);
  // 目標の線
  stroke(45, 90, 100); strokeWeight(2); line(rx, baseY - 100, rx, baseY + 60);
  // おもり
  noStroke(); fill(30, 80, 100);
  rect(mx - 30, baseY - 60, 60, 120, 8);
  fill(0, 0, 100); textSize(14); textAlign(CENTER);
  text('y = ' + nf(y, 1, 2), mx, baseY + 90);
  fill(45, 90, 100); text('目標 r = ' + r, rx, baseY - 110);
  textAlign(LEFT, BASELINE);

  // ---- グラフ
  let gx = width * 0.5, gy = height * 0.2, gw = width * 0.46, gh = height * 0.45;
  drawPlot(gx, gy, gw, gh, [{ data: hR, hue: 45, sat: 90, name: '目標 r' }, { data: hY, hue: 30, name: '出力 y' }], -0.6, 2.0, '時間（右端がいま、幅 10 秒）');
  // ±2% の帯
  noStroke(); fill(45, 90, 100, 12);
  rect(gx, map(1.02, -0.6, 2.0, gy + gh, gy), gw, map(0.98, -0.6, 2.0, gy + gh, gy) - map(1.02, -0.6, 2.0, gy + gh, gy));

  let kind = zeta < 1 ? '不足減衰（ゆれる）' : zeta === 1 ? '臨界減衰（いちばん速く落ち着く）' : '過減衰（ゆれないがのんびり）';
  let osTheory = zeta < 1 ? exp(-PI * zeta / sqrt(1 - zeta * zeta)) * 100 : 0;
  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text('ζ = ' + nf(zeta, 1, 2) + '（左右キー）　ωn = ' + nf(wn, 1, 1) + '（上下キー）　' + kind, 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('オーバーシュート ' + nf(peak * 100, 1, 1) + '%（理論値 ' + nf(osTheory, 1, 1) + '%）　整定時間（±2%）' + nf(tSettle, 1, 2) + ' 秒（目安 4/(ζωn) = ' + nf(4 / (zeta * wn + 1e-9), 1, 2) + ' 秒）', 20, 68);
  text('y\'\' + 2ζωn y\' + ωn² y = ωn² r 　車のサスペンション、ドアクローザー、ロボットアームの関節…「ゆれ方」はこの 2 つの数で決まる', 20, height - 30);
}

function keyPressed() {
  if (key === RIGHT_ARROW) zeta = min(round((zeta + 0.1) * 10) / 10, 2.5);
  if (key === LEFT_ARROW) zeta = max(round((zeta - 0.1) * 10) / 10, 0);
  if (key === UP_ARROW) wn = min(wn + 0.5, 12);
  if (key === DOWN_ARROW) wn = max(wn - 0.5, 0.5);
  if (key === ' ') { r = 1 - r; tStep = t; peak = 0; tSettle = 0; }
}

// ---------- やってみよう ----------
// 1. ζ = 0 にする。ゆれが止まらない（減衰なし）。ωn を変えるとゆれの速さだけ変わる
// 2. ζ = 0.7 がよく使われる「ちょうどいい」値。オーバーシュートは何 % ？
// 3. ωn を 2 倍にすると整定時間は何倍？（4/(ζωn) を確かめる）
// 4. ζ = 1 と ζ = 2 で、どちらが先に ±2% に入る？ 「ゆれない = 速い」ではない


// ==================================================
// ここから下は「グラフを描く道具」です
// ==================================================
function pushHist(arr, v) {
  arr.push(isFinite(v) ? v : 0);
  if (arr.length > HIST) arr.shift();
}
// 時間プロット：枠 (x, y, w, h) に series = [{data, hue, name}] を描く（縦の範囲 lo〜hi）
function drawPlot(x, y, w, h, series, lo, hi, title) {
  noStroke(); fill(0, 0, 14); rect(x, y, w, h, 6);
  stroke(0, 0, 30); strokeWeight(1);
  let y0 = map(0, lo, hi, y + h, y);
  if (y0 > y && y0 < y + h) line(x, y0, x + w, y0);
  for (let s of series) {
    stroke(s.hue, s.sat === undefined ? 70 : s.sat, 100); strokeWeight(s.weight || 2); noFill();
    beginShape();
    for (let i = 0; i < s.data.length; i++) vertex(map(i, 0, HIST - 1, x, x + w), map(constrain(s.data[i], lo, hi), lo, hi, y + h, y));
    endShape();
  }
  noStroke(); fill(0, 0, 70); textSize(13); textAlign(LEFT, TOP);
  text(title, x + 8, y + 6);
  let lx = x + w - 8; textAlign(RIGHT, TOP);
  for (let s of series) { fill(s.hue, s.sat === undefined ? 70 : s.sat, 100); text(s.name, lx, y + 6); lx -= textWidth(s.name) + 14; }
  textAlign(LEFT, BASELINE);
}
