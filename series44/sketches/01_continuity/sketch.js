// ============================================
// 01 連続の式　A₁ v₁ = A₂ v₂
// 水はつぶれない（非圧縮）ので、管のどこでも「毎秒通る量」は同じ
//   流量 Q = 断面積 A × 速さ v = 一定　→　細い所ほど速い
// ホースの先をつぶすと水が勢いよく飛ぶのと同じしくみ
// 管の中を上下にドラッグ = しぼる / 上下キー = 流量 Q / R = 元に戻す
// ============================================

let Q = 30000; // ★ 流量（毎秒流れる量。2D なので [px²/秒]）
let throat = 0.45; // ★ しぼり（いちばん細い所の太さ ÷ 元の太さ）
let pipeH = 150; // ★ 管の太さの半分 [px]
let N = 700; // ★ 粒の数

let parts = [], cy;
let gateX = [0.14, 0.5, 0.86], gateCount = [0, 0, 0], gateRate = [0, 0, 0], gateT = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  cy = height * 0.42;
  pipeH = Math.min(pipeH, height * 0.2);
  // 粒を「面積あたり同じ密度」でまく（広い所に多く、細い所に少なく）
  while (parts.length < N) {
    let x = Math.random() * width;
    if (Math.random() < halfHeight(x) / pipeH) parts.push({ x: x, eta: Math.random() * 2 - 1 });
  }
}

// ★ 管の形：場所 x での「太さの半分」。まん中がなめらかに細くなる
function halfHeight(x) {
  let s = constrain((x - width / 2) / (width * 0.22), -1, 1);
  return pipeH * (1 - (1 - throat) * 0.5 * (1 + Math.cos(Math.PI * s)));
}
// ★ 連続の式：v = Q / A（A = 太さ = 2 × halfHeight）
function speedAt(x) { return Q / (2 * halfHeight(x)); }

function draw() {
  background(215, 60, 10);
  let dt = Math.min(deltaTime / 1000, 0.033);
  if (mouseIsPressed && mouseY > 90 && mouseY < cy + pipeH + 40) throat = constrain(Math.abs(mouseY - cy) / pipeH, 0.15, 1);

  // ---- 管の壁
  stroke(42, 40, 85); strokeWeight(5); noFill();
  for (let sgn of [-1, 1]) {
    beginShape();
    for (let x = 0; x <= width; x += 8) vertex(x, cy + sgn * (halfHeight(x) + 4));
    vertex(width, cy + sgn * (halfHeight(width) + 4));
    endShape();
  }

  // ---- 粒：x 方向に v(x) で進み、管の形に合わせて上下に寄る
  noStroke();
  for (let q of parts) {
    let x0 = q.x;
    let v = speedAt(q.x);
    q.x += speedAt(q.x + v * dt / 2) * dt;
    for (let k = 0; k < 3; k++) if (x0 < gateX[k] * width && q.x >= gateX[k] * width) gateCount[k]++;
    if (q.x > width) { q.x -= width; q.eta = Math.random() * 2 - 1; }
    fill(map(v, 80, 500, 200, 10, true), 70, 100);
    circle(q.x, cy + q.eta * halfHeight(q.x), 5);
  }

  // ---- 通過した粒を数える（1 秒ごとに集計）
  gateT += dt;
  if (gateT >= 1) { for (let k = 0; k < 3; k++) { gateRate[k] = gateCount[k] / gateT; gateCount[k] = 0; } gateT = 0; }

  // ---- 3 か所の断面：A・v・A×v を表示
  textAlign(CENTER); textSize(15);
  for (let k = 0; k < 3; k++) {
    let x = gateX[k] * width, h = halfHeight(x), v = speedAt(x);
    stroke(0, 0, 100, 60); strokeWeight(1);
    line(x, cy - h, x, cy + h);
    stroke(180, 80, 100); strokeWeight(3);
    arrow(x, cy, x + v * 0.25, cy);
    noStroke(); fill(0, 0, 100);
    text('A = ' + nf(2 * h, 1, 0), x, cy + pipeH + 40);
    fill(180, 80, 100);
    text('v = ' + nf(v, 1, 0), x, cy + pipeH + 62);
    fill(42, 80, 100);
    text('A × v = ' + nf(2 * h * v, 1, 0), x, cy + pipeH + 84);
    fill(0, 0, 65);
    text('数えた粒 ' + nf(gateRate[k], 1, 0) + ' 個/秒', x, cy + pipeH + 106);
  }
  textAlign(LEFT, BASELINE);

  // ---- グラフ：断面積 A(x) と速さ v(x)
  let gy = height * 0.94, gh = height * 0.11;
  noStroke(); fill(215, 50, 16); rect(0, gy - gh - 10, width, gh + 30);
  noFill(); strokeWeight(2);
  stroke(0, 0, 80); beginShape();
  for (let x = 0; x <= width; x += 8) vertex(x, gy - gh * halfHeight(x) / pipeH * 0.5);
  endShape();
  stroke(180, 80, 100); beginShape();
  for (let x = 0; x <= width; x += 8) vertex(x, gy - gh * constrain(speedAt(x) / 700, 0, 1));
  endShape();
  noStroke(); textSize(14);
  fill(0, 0, 80); text('断面積 A(x)', 20, gy - gh + 4);
  fill(180, 80, 100); text('速さ v(x) = Q / A(x)', 130, gy - gh + 4);

  fill(0, 0, 100); textSize(18);
  text('連続の式　A₁v₁ = A₂v₂ = Q = ' + nf(Q, 1, 0) + '（上下キー）　しぼり ' + nf(throat * 100, 1, 0) + '%（管の中を上下にドラッグ）', 20, 40);
  fill(0, 0, 65); textSize(15);
  text('細い所の速さは 太い所の ' + nf(1 / throat, 1, 2) + ' 倍。でも「毎秒通る粒の数」は 3 か所ともほぼ同じ（粒はたまらないし、消えない）', 20, 68);
}

function arrow(x1, y1, x2, y2) {
  line(x1, y1, x2, y2);
  let a = Math.atan2(y2 - y1, x2 - x1);
  line(x2, y2, x2 - 10 * Math.cos(a - 0.5), y2 - 10 * Math.sin(a - 0.5));
  line(x2, y2, x2 - 10 * Math.cos(a + 0.5), y2 - 10 * Math.sin(a + 0.5));
}

function keyPressed() {
  if (key === UP_ARROW) Q = Math.min(Q * 1.2, 80000);
  if (key === DOWN_ARROW) Q = Math.max(Q / 1.2, 8000);
  if (key === 'r' || key === 'R') { Q = 30000; throat = 0.45; }
}

// ---------- やってみよう ----------
// 1. しぼりを 50% にする。v は何倍？ 25% では？（A が半分 → v が 2 倍）
// 2. 「数えた粒」が 3 か所でほぼ同じになることを確かめる。Q を変えるとどうなる？
// 3. halfHeight() を書きかえて、しぼりを 2 か所にしてみよう
// 4. 3D の円管なら A = πr²。半径を半分にすると速さは何倍？（→ 4 倍）
// 5. 川幅が広い所は流れがゆるやか。浅くなる所は？ 身近な例をさがそう
