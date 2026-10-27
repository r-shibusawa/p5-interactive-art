// ============================================
// 00 開ループと閉ループ
// 同じ部屋を 2 つ並べて暖める
//   左 = 開ループ：ヒーターの強さを「計算で決め打ち」して放っておく
//   右 = 閉ループ：温度を測って、目標より低ければ ON・高ければ OFF（サーモスタット）
// 窓を開ける（外乱）と、2 つの差がはっきり出る
// マウス左右 = 窓の開き具合 / 上下キー = 目標温度 / R でやり直し
// ============================================

let target = 22; // ★ 目標温度 [℃]
let outside = 5; // ★ 外の気温 [℃]
let Pmax = 3.0; // ★ ヒーターの最大出力
let kWall = 0.1; // 壁から逃げる熱（温度差 1 ℃ あたり）
let kWin = 0.5; // ★ 窓を全開にしたとき逃げる熱
let speed = 3; // ★ シミュレーションの速さ（1 = 実時間）
let hyst = 0.3; // ★ サーモスタットのあそび（この幅で ON/OFF）

let Topen, Tclosed, Popen, Pclosed, heaterOn;
let win = 0;
let HIST = 600;
let hOpen = [], hClosed = [], hTarget = [], hPo = [], hPc = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  reset();
}

function reset() {
  Topen = outside; Tclosed = outside;
  heaterOn = false;
  hOpen = []; hClosed = []; hTarget = []; hPo = []; hPc = [];
}

function draw() {
  background(230, 30, 10);
  win = map(mouseX, 0, width, 0, 1, true);
  let dt = speed / 60;

  // ---- 開ループ：目標に届くはずの出力を計算して固定（窓のことは知らない）
  Popen = constrain(kWall * (target - outside), 0, Pmax); // ★ 計算で決めた一定値
  // ---- 閉ループ：測った温度で ON/OFF
  if (Tclosed < target - hyst) heaterOn = true;
  if (Tclosed > target + hyst) heaterOn = false;
  Pclosed = heaterOn ? Pmax : 0;

  // ★ 部屋の温度の変化：（ヒーター − 壁から逃げる熱 − 窓から逃げる熱）
  let loss = kWall + kWin * win;
  Topen += (Popen - loss * (Topen - outside)) * dt;
  Tclosed += (Pclosed - loss * (Tclosed - outside)) * dt;
  Topen = constrain(Topen, -20, 60); Tclosed = constrain(Tclosed, -20, 60);

  pushHist(hOpen, Topen); pushHist(hClosed, Tclosed); pushHist(hTarget, target);
  pushHist(hPo, Popen); pushHist(hPc, Pclosed);

  // ---- 部屋の絵
  let rw = width * 0.2, rh = height * 0.4, ry = height * 0.28;
  drawRoom(width * 0.04, ry, rw, rh, Topen, Popen, '開ループ', 200);
  drawRoom(width * 0.28, ry, rw, rh, Tclosed, Pclosed, '閉ループ', 30);

  // ---- グラフ
  let gx = width * 0.54, gw = width * 0.43;
  drawPlot(gx, height * 0.18, gw, height * 0.36, [
    { data: hTarget, hue: 0, sat: 0, name: '目標' }, { data: hOpen, hue: 200, name: '開ループ' }, { data: hClosed, hue: 30, name: '閉ループ' }
  ], 0, 40, '温度 [℃]');
  drawPlot(gx, height * 0.6, gw, height * 0.25, [
    { data: hPo, hue: 200, name: '開ループ' }, { data: hPc, hue: 30, name: '閉ループ' }
  ], -0.2, Pmax * 1.2, 'ヒーター出力');

  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text('目標 ' + target + ' ℃（上下キー）　窓の開き ' + nf(win * 100, 1, 0) + '%（マウス左右）　R でやり直し', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('開ループは「必要な出力」を最初に計算して固定。窓が開く（外乱）と届かなくなる。閉ループは温度を測るので、外乱があっても目標のまわりに留まる', 20, 68);
  fill(200, 60, 100);
  text('開ループの誤差 ' + nf(target - Topen, 1, 1) + ' ℃', width * 0.04, ry + rh + 60);
  fill(30, 80, 100);
  text('閉ループの誤差 ' + nf(target - Tclosed, 1, 1) + ' ℃', width * 0.28, ry + rh + 60);
}

// 部屋：壁・窓・ヒーター・温度計
function drawRoom(x, y, w, h, T, P, label, hue) {
  stroke(0, 0, 50); strokeWeight(3); noFill();
  rect(x, y, w, h);
  // 窓（右の壁に開く）
  noStroke(); fill(200, 30, 90, 40);
  rect(x + w - 8, y + h * 0.2, 16, h * 0.3);
  fill(230, 30, 10);
  rect(x + w - 8, y + h * 0.2, 16, h * 0.3 * win); // 開いた分だけ穴
  // ヒーター（出力に応じて赤く光る）
  let glow = map(P, 0, Pmax, 0, 100);
  fill(10, 90, 100, glow);
  rect(x + 20, y + h - 40, w - 40, 24, 4);
  stroke(0, 0, 60); strokeWeight(2); noFill();
  rect(x + 20, y + h - 40, w - 40, 24, 4);
  // 部屋の中の色（温度）
  noStroke();
  fill(map(T, outside, 30, 220, 0), 60, 80, 20);
  rect(x + 3, y + 3, w - 6, h - 6);
  // 温度計
  let tx = x + w * 0.5, t0 = y + h * 0.7, t1 = y + 20;
  stroke(0, 0, 40); strokeWeight(8); line(tx, t0, tx, t1);
  stroke(hue, 80, 100); strokeWeight(6);
  line(tx, t0, tx, map(constrain(T, 0, 40), 0, 40, t0, t1));
  stroke(0, 0, 70); strokeWeight(1);
  let ty = map(target, 0, 40, t0, t1);
  line(tx - 20, ty, tx + 20, ty);
  noStroke(); fill(0, 0, 100); textSize(22); textAlign(CENTER);
  text(nf(T, 1, 1) + ' ℃', tx, y + h + 30);
  fill(hue, 60, 100); textSize(18);
  text(label, tx, y - 14);
  textAlign(LEFT, BASELINE);
}

function keyPressed() {
  if (key === UP_ARROW) target = min(target + 1, 35);
  if (key === DOWN_ARROW) target = max(target - 1, 10);
  if (key === 'r' || key === 'R') reset();
}

// ---------- やってみよう ----------
// 1. 窓を閉めたまま待つ。開ループもちゃんと目標に届く？（モデルが正しければ届く）
// 2. 窓を半分開ける。開ループは何度まで下がる？ 閉ループは？
// 3. hyst（あそび）を 2 にすると閉ループの温度はどうゆれる？ 0.05 にすると ON/OFF の回数は？
// 4. 外気温 outside を 25 にして、目標 22 に「冷やす」には何が必要？


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
