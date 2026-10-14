// ============================================
// 13 100本の二重振り子
// 最初の角度が 0.0001 ずつちがう振り子を 100 本、同時に離す
// 最初は1本に見えるが、やがて虹色の扇のように広がり、ばらばらに
// クリックでやり直し / マウス左右 = 本数
// ============================================

let pends = [];
let count = 100;
let t = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  reset();
}

function reset() {
  count = floor(map(mouseX, 0, width, 10, 200, true));
  pends = [];
  let base1 = PI * 0.75, base2 = PI * 0.5;
  for (let i = 0; i < count; i++) {
    pends.push({ a1: base1 + i * 0.0001, a2: base2, v1: 0, v2: 0, hue: (i / count) * 300 });
  }
  t = 0;
}

function draw() {
  background(240, 40, 8);
  let ox = width / 2, oy = height * 0.4;
  let L = min(width, height) * 0.2;

  for (let p of pends) {
    for (let k = 0; k < 6; k++) simulate(p, 1 / 6);
    let x1 = ox + L * sin(p.a1), y1 = oy + L * cos(p.a1);
    let x2 = x1 + L * sin(p.a2), y2 = y1 + L * cos(p.a2);
    stroke(p.hue, 70, 100, 70);
    strokeWeight(2);
    line(ox, oy, x1, y1);
    line(x1, y1, x2, y2);
    noStroke();
    fill(p.hue, 70, 100);
    circle(x2, y2, 8);
  }
  t++;

  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text(count + ' 本の振り子（最初の角度は 0.0001 ずつちがう）　経過 ' + t + '　クリックでやり直し（マウス左右で本数）', 20, 40);
}

function simulate(p, dt) {
  let g = 1, m1 = 1, m2 = 1, L1 = 1, L2 = 1;
  let { a1, a2, v1, v2 } = p;
  let num1 = -g * (2 * m1 + m2) * sin(a1) - m2 * g * sin(a1 - 2 * a2) - 2 * sin(a1 - a2) * m2 * (v2 * v2 * L2 + v1 * v1 * L1 * cos(a1 - a2));
  let den1 = L1 * (2 * m1 + m2 - m2 * cos(2 * a1 - 2 * a2));
  let num2 = 2 * sin(a1 - a2) * (v1 * v1 * L1 * (m1 + m2) + g * (m1 + m2) * cos(a1) + v2 * v2 * L2 * m2 * cos(a1 - a2));
  let den2 = L2 * (2 * m1 + m2 - m2 * cos(2 * a1 - 2 * a2));
  p.v1 += (num1 / den1) * dt * 0.05;
  p.v2 += (num2 / den2) * dt * 0.05;
  p.a1 += p.v1 * dt;
  p.a2 += p.v2 * dt;
}

function mousePressed() {
  reset();
}

// ---------- やってみよう ----------
// 1. 広がり始めるまでの時間を数えよう。ずれ 0.0001 を 0.00001 にすると、どれだけ遅くなる？
// 2. base1 を PI * 0.3（低い位置から）にすると、ばらばらにならない。カオスには「エネルギー」が必要
// 3. 先端の軌跡を残して描くと、きれいな絵になる（02 の trailLayer を参考に）
