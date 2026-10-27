// ============================================
// 01 一次遅れ系（ステップ応答と時定数 τ）
// 水そうに水を入れると、水位は「すぐには」上がらず、だんだん目標に近づく
//   τ y' + y = K u　　→　入力を 1 にすると y は K に向かって指数関数で近づく
//   t = τ のとき、ちょうど最終値の 63.2% に届く
// 左右キー = 時定数 τ / 上下キー = ゲイン K / 入力は 5 秒ごとに ON・OFF
// ============================================

let tau = 1.0; // ★ 時定数 [秒]（タンクなら 断面積 × 排水のしにくさ、RC 回路なら R × C）
let K = 1.0; // ★ ゲイン（入力 1 に対して最終的に y がいくつになるか）
let period = 5; // ★ 入力を切り替える間隔 [秒]

let y = 0, u = 1, t = 0, tStep = 0, yStep = 0;
let HIST = 600, dt = 1 / 60;
let hY = [], hU = [], hT = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(230, 30, 10);
  // ★ 一次遅れの式：y の変化 = (K u − y) / τ
  y += ((K * u - y) / tau) * dt;
  t += dt;
  if (t - tStep >= period) { u = 1 - u; tStep = t; yStep = y; } // 入力を切り替え
  pushHist(hY, y); pushHist(hU, u); pushHist(hT, t);

  // ---- 水そうの絵
  let tx = width * 0.08, ty = height * 0.25, tw = width * 0.3, th = height * 0.5;
  let maxLevel = max(1.3, K * 1.3);
  // 入口のパイプとバルブ
  stroke(0, 0, 60); strokeWeight(10);
  line(tx + tw * 0.5, ty - 60, tx + tw * 0.5, ty - 10);
  noStroke(); fill(u ? 200 : 0, u ? 80 : 0, u ? 100 : 40);
  rect(tx + tw * 0.5 - 20, ty - 90, 40, 24, 6);
  fill(0, 0, 100); textSize(14); textAlign(CENTER);
  text('入力 u = ' + u + (u ? '（注水中）' : '（止めた）'), tx + tw * 0.5, ty - 100);
  // 注ぐ水
  if (u) { fill(200, 70, 100, 70); rect(tx + tw * 0.5 - 4, ty - 10, 8, th - map(y, 0, maxLevel, 0, th) + 4); }
  // 水
  let lvl = map(constrain(y, 0, maxLevel), 0, maxLevel, 0, th);
  fill(200, 70, 90, 70);
  rect(tx, ty + th - lvl, tw, lvl);
  // 目標（K u）の線と 63.2% の線
  stroke(45, 90, 100); strokeWeight(2);
  let yFinal = ty + th - map(constrain(K * u, 0, maxLevel), 0, maxLevel, 0, th);
  line(tx - 10, yFinal, tx + tw + 10, yFinal);
  // タンクの枠
  stroke(0, 0, 70); strokeWeight(4); noFill();
  line(tx, ty, tx, ty + th); line(tx, ty + th, tx + tw, ty + th); line(tx + tw, ty + th, tx + tw, ty);
  // 排水
  stroke(0, 0, 60); strokeWeight(10); line(tx + tw, ty + th - 20, tx + tw + 50, ty + th - 20);
  noStroke(); fill(200, 70, 100, 60);
  rect(tx + tw + 50, ty + th - 24, 8, 10 + y * 20);
  fill(0, 0, 100); textSize(20); textAlign(LEFT, BASELINE);
  text('y = ' + nf(y, 1, 3), tx + 10, ty + th - lvl - 10);
  fill(45, 90, 100); textSize(14);
  text('最終値 K·u = ' + nf(K * u, 1, 2), tx + tw + 14, yFinal + 5);
  textAlign(LEFT, BASELINE);

  // ---- グラフ（右）
  let gx = width * 0.5, gy = height * 0.2, gw = width * 0.46, gh = height * 0.45;
  let hi = max(1.3, K * 1.3);
  drawPlot(gx, gy, gw, gh, [{ data: hU, hue: 0, sat: 0, name: '入力 u' }, { data: hY, hue: 200, name: '出力 y' }], -0.1, hi, '時間（右端がいま、幅 10 秒）');
  // τ の位置（切り替えから τ 秒後）に印
  let iStep = hT.findIndex((v) => v >= tStep);
  let iTau = hT.findIndex((v) => v >= tStep + tau);
  if (iStep >= 0) {
    let X = (i) => map(i, 0, HIST - 1, gx, gx + gw);
    let Y = (v) => map(constrain(v, -0.1, hi), -0.1, hi, gy + gh, gy);
    stroke(45, 90, 100, 60); strokeWeight(1);
    line(X(iStep), gy, X(iStep), gy + gh);
    if (iTau >= 0) {
      let y63 = yStep + 0.632 * (K * u - yStep);
      stroke(45, 90, 100); strokeWeight(2);
      line(X(iTau), gy + gh, X(iTau), Y(y63));
      line(X(iStep), Y(y63), X(iTau), Y(y63));
      noStroke(); fill(45, 90, 100); circle(X(iTau), Y(y63), 10);
      textSize(14); text('t = τ：63.2%', X(iTau) + 6, Y(y63) - 8);
    }
  }
  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text('τ = ' + nf(tau, 1, 2) + ' 秒（左右キー）　K = ' + nf(K, 1, 2) + '（上下キー）　5 秒ごとに入力が切り替わる', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('τ y\' + y = K u 。τ が大きいほど「のんびり」、K が大きいほど最終値が高い。3τ で 95%、4τ で 98% に届く', 20, 68);
  fill(0, 0, 60);
  text('水そう：τ = 断面積 × 排水のしにくさ　　RC 回路：τ = R × C　　部屋の温度、モーターの回転数、コーヒーの冷め方も同じ式', 20, height - 30);
}

function keyPressed() {
  if (key === RIGHT_ARROW) tau = min(tau * 1.25, 10);
  if (key === LEFT_ARROW) tau = max(tau / 1.25, 0.1);
  if (key === UP_ARROW) K = min(K + 0.25, 3);
  if (key === DOWN_ARROW) K = max(K - 0.25, 0.25);
}

// ---------- やってみよう ----------
// 1. τ を 0.2 と 4 で比べる。入力が切り替わった瞬間の「傾き」はどう変わる？（傾き = K u / τ）
// 2. 63.2% の印が、どんな τ でもグラフの同じ「形」の場所につくことを確かめる
// 3. period を 1 にして τ = 2 にする。追いつけずに三角波のようになる（→ 07 の周波数応答）
// 4. 入力を 0/1 の切り替えではなく、マウスの高さにしてみよう（u = map(mouseY, ...)）


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
