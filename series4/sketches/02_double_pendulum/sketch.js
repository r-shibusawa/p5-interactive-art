// ============================================
// 02 二重振り子（バタフライ効果）
// 2本つないだ振り子は、物理法則どおりに動くのに予測できない
// 2つの振り子を「ほんのわずか」ちがう角度から同時に離すと…
// クリックでやり直し / マウス上下 = 最初のずれの大きさ / T で軌跡の ON/OFF
// ============================================

let pendulums = [];
let trailLayer;
let diff = 0.001; // 2つの振り子の最初の角度のちがい（ラジアン）
let showTrail = true;
let elapsed = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  trailLayer = createGraphics(width, height);
  trailLayer.colorMode(HSB, 360, 100, 100, 100);
  reset();
}

function reset() {
  diff = map(mouseY, 0, height, 0.1, 0.00001, true);
  pendulums = [];
  let a1 = PI / 2 + random(-0.3, 0.3), a2 = PI / 2 + random(-0.3, 0.3);
  pendulums.push(makePendulum(a1, a2, 170));
  pendulums.push(makePendulum(a1 + diff, a2, 10)); // ★ ほんの少しだけ違う
  trailLayer.background(230, 40, 10);
  elapsed = 0;
}

function makePendulum(a1, a2, hue) {
  return { a1, a2, v1: 0, v2: 0, hue, px: null, py: null };
}

function draw() {
  let ox = width / 2, oy = height * 0.35;
  let L = min(width, height) * 0.2; // 棒の長さ
  let g = 1;

  // 物理計算（1フレームに何回も細かく進めると正確になる）
  for (let p of pendulums) {
    for (let k = 0; k < 6; k++) simulate(p, g, 1 / 6);
    // 位置を計算
    let x1 = ox + L * sin(p.a1), y1 = oy + L * cos(p.a1);
    let x2 = x1 + L * sin(p.a2), y2 = y1 + L * cos(p.a2);
    if (showTrail && p.px !== null) {
      trailLayer.stroke(p.hue, 70, 100, 60);
      trailLayer.strokeWeight(2);
      trailLayer.line(p.px, p.py, x2, y2);
    }
    p.px = x2;
    p.py = y2;
  }
  elapsed++;

  image(trailLayer, 0, 0);

  // 振り子本体
  for (let p of pendulums) {
    let x1 = ox + L * sin(p.a1), y1 = oy + L * cos(p.a1);
    let x2 = x1 + L * sin(p.a2), y2 = y1 + L * cos(p.a2);
    stroke(p.hue, 50, 100);
    strokeWeight(4);
    line(ox, oy, x1, y1);
    line(x1, y1, x2, y2);
    noStroke();
    fill(p.hue, 70, 100);
    circle(x1, y1, 18);
    circle(x2, y2, 18);
  }

  // 2つの先端の距離
  let d = dist(pendulums[0].px, pendulums[0].py, pendulums[1].px, pendulums[1].py);
  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text('最初のずれ ' + diff.toFixed(5) + ' ラジアン（マウス上下でクリック時に決まる）　いまの先端の距離 ' + nf(d, 1, 1) + ' px　経過 ' + elapsed, 20, 40);
  text('クリックでやり直し　T で軌跡 ' + (showTrail ? 'ON' : 'off'), 20, 68);
}

// 二重振り子の運動方程式（教科書どおり。読まなくてOK）
function simulate(p, g, dt) {
  let m1 = 1, m2 = 1, L1 = 1, L2 = 1;
  let { a1, a2, v1, v2 } = p;
  let num1 = -g * (2 * m1 + m2) * sin(a1) - m2 * g * sin(a1 - 2 * a2) - 2 * sin(a1 - a2) * m2 * (v2 * v2 * L2 + v1 * v1 * L1 * cos(a1 - a2));
  let den1 = L1 * (2 * m1 + m2 - m2 * cos(2 * a1 - 2 * a2));
  let num2 = 2 * sin(a1 - a2) * (v1 * v1 * L1 * (m1 + m2) + g * (m1 + m2) * cos(a1) + v2 * v2 * L2 * m2 * cos(a1 - a2));
  let den2 = L2 * (2 * m1 + m2 - m2 * cos(2 * a1 - 2 * a2));
  let acc1 = num1 / den1, acc2 = num2 / den2;
  p.v1 += acc1 * dt * 0.05;
  p.v2 += acc2 * dt * 0.05;
  p.a1 += p.v1 * dt;
  p.a2 += p.v2 * dt;
}

function mousePressed() {
  reset();
}
function keyPressed() {
  if (key === 't' || key === 'T') showTrail = !showTrail;
}

// ---------- やってみよう ----------
// 1. 最初はぴったり重なって動く2つが、何秒後に別れるか数えよう
// 2. マウスを一番下にしてクリック（ずれ 0.00001）。それでも別れる？ 何秒で？
// 3. 振り子を5本に増やして、虹色にしてみよう（→ 13 で）
