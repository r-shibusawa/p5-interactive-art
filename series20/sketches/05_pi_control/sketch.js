// ============================================
// 05 PI 制御（積分で偏差を消す）
// 04 の台車に「誤差をためる」項を足す
//   u = Kp e + Ki ∫e dt　　誤差が残っているかぎり積分が増え続け、風に負けなくなる
// ただしモーターの力には上限がある。遠い目標を指すと積分がたまりすぎて行きすぎる = ワインドアップ
// クリック = 目標 / 左右キー = Kp / 上下キー = Ki / D = 風 ON/OFF / W = アンチワインドアップ ON/OFF
// ============================================

let Kp = 2.0; // ★ 比例ゲイン
let Ki = 1.0; // ★ 積分ゲイン
let umax = 5; // ★ モーターの最大の力（小さめにして飽和を見やすく）
let antiWindup = false; // ★ W で切り替え
let wind = 0;
let m = 1, c = 1.5;

let x = 0, v = 0, r = 2, u = 0, I = 0, uP = 0, uI = 0;
let HIST = 600, dt = 1 / 60;
let hX = [], hR = [], hU = [], hI = [];
let railY, railX0, railX1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(230, 30, 10);
  railY = height * 0.5; railX0 = width * 0.05; railX1 = width * 0.47;

  // ★ PI 制御
  let e = r - x;
  let uRaw = Kp * e + Ki * I;
  u = constrain(uRaw, -umax, umax);
  let saturated = abs(uRaw) > umax;
  // 積分：アンチワインドアップ ON なら「飽和中に、さらに飽和させる向き」には積まない
  if (!(antiWindup && saturated && Math.sign(e) === Math.sign(uRaw))) I += e * dt;
  I = constrain(I, -50, 50);
  uP = Kp * e; uI = Ki * I;
  for (let k = 0; k < 2; k++) {
    let a = (u - c * v + wind) / m;
    v += a * dt / 2;
    x += v * dt / 2;
  }
  x = constrain(x, -5, 5); v = constrain(v, -50, 50);
  pushHist(hX, x); pushHist(hR, r); pushHist(hU, u); pushHist(hI, uI);

  // ---- レールと台車
  stroke(0, 0, 50); strokeWeight(4); line(railX0, railY + 30, railX1, railY + 30);
  stroke(45, 90, 100); strokeWeight(2); line(wx(r), railY - 80, wx(r), railY + 30);
  noStroke(); fill(45, 90, 100); textSize(14); textAlign(CENTER);
  text('目標 r = ' + nf(r, 1, 2), wx(r), railY - 90);
  if (abs(wind) > 0.01) {
    stroke(200, 50, 100, 70); strokeWeight(2);
    for (let i = 0; i < 4; i++) { let yy = railY - 60 + i * 25; line(railX0 + 20 + i * 15, yy, railX0 + 20 + i * 15 + wind * 12, yy); }
  }
  let cx = wx(x);
  noStroke(); fill(30, 80, 100);
  rect(cx - 40, railY - 30, 80, 50, 8);
  fill(0, 0, 30); circle(cx - 22, railY + 24, 20); circle(cx + 22, railY + 24, 20);
  stroke(saturated ? 0 : 120, 80, 100); strokeWeight(5);
  line(cx, railY - 5, cx + u * 12, railY - 5);
  noStroke(); fill(0, 0, 100); textSize(14);
  text('x = ' + nf(x, 1, 2), cx, railY - 40);
  textAlign(LEFT, BASELINE);

  // ---- 制御入力の内訳（棒グラフ）
  let bx = width * 0.05, by = height * 0.72, bw = width * 0.4;
  drawBar(bx, by, bw, 'P 項  Kp·e', uP, 200);
  drawBar(bx, by + 34, bw, 'I 項  Ki·∫e', uI, 300);
  drawBar(bx, by + 68, bw, '出力 u（上限 ±' + umax + '）', u, saturated ? 0 : 120);
  if (saturated) { fill(0, 80, 100); textSize(14); text('飽和中！' + (antiWindup ? '（積分を止めている）' : '（積分がたまり続けている）'), bx + bw * 0.6, by + 68 - 6); }

  // ---- グラフ
  let gx = width * 0.52, gw = width * 0.44;
  drawPlot(gx, height * 0.18, gw, height * 0.36, [{ data: hR, hue: 45, sat: 90, name: '目標 r' }, { data: hX, hue: 30, name: '位置 x' }], -5, 5, '位置');
  drawPlot(gx, height * 0.6, gw, height * 0.25, [{ data: hU, hue: 120, name: '出力 u' }, { data: hI, hue: 300, name: 'I 項' }], -umax * 2, umax * 2, '制御入力');

  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text('Kp = ' + nf(Kp, 1, 2) + '（左右）　Ki = ' + nf(Ki, 1, 2) + '（上下）　風 ' + (wind ? 'ON' : 'OFF') + '（D）　アンチワインドアップ ' + (antiWindup ? 'ON' : 'OFF') + '（W）　誤差 ' + nf(e, 1, 2), 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('積分項は「誤差が残っているかぎり増え続ける」ので、最後には風とつり合う力を自分で見つける（定常偏差 0）。遠い目標 → 飽和中に I がたまりすぎ → 行きすぎ', 20, 68);
  text('W でアンチワインドアップ ON：飽和しているあいだは積分をためない。行きすぎが消えることを比べよう', 20, height - 30);
}

function drawBar(x, y, w, label, val, hue) {
  noStroke(); fill(0, 0, 20); rect(x, y, w, 22, 4);
  let mid = x + w / 2, len = constrain(val / (umax * 2) * (w / 2), -w / 2, w / 2);
  fill(hue, 70, 100); rect(min(mid, mid + len), y, abs(len), 22, 4);
  stroke(0, 0, 60); strokeWeight(1); line(mid, y, mid, y + 22);
  noStroke(); fill(0, 0, 100); textSize(13);
  text(label + ' = ' + nf(val, 1, 2), x + 6, y - 5);
}
function wx(xw) { return map(xw, -5, 5, railX0, railX1); }

function mousePressed() {
  if (mouseX < railX1 + 20 && mouseY > railY - 150 && mouseY < railY + 80) r = constrain(map(mouseX, railX0, railX1, -5, 5), -4.5, 4.5);
}
function keyPressed() {
  if (key === RIGHT_ARROW) Kp = min(Kp * 1.3, 50);
  if (key === LEFT_ARROW) Kp = max(Kp / 1.3, 0.2);
  if (key === UP_ARROW) Ki = min(Ki + 0.25, 10);
  if (key === DOWN_ARROW) Ki = max(Ki - 0.25, 0);
  if (key === 'd' || key === 'D') wind = wind ? 0 : 3;
  if (key === 'w' || key === 'W') antiWindup = !antiWindup;
}

// ---------- やってみよう ----------
// 1. 風 ON で Ki = 0（P だけ）→ 偏差が残る。Ki を 1 にすると I 項がじわじわ増えて偏差が消える
// 2. 目標を一番遠くにクリック（W は OFF）→ 行きすぎる。I 項のグラフを見る。W を ON にして同じことを
// 3. Ki を大きくしすぎるとどうなる？（積分はゆれを増やす。極が右へ寄る）
// 4. umax を 50 にするとワインドアップは起きる？


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
