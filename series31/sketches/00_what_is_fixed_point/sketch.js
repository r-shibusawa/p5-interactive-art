// ============================================
// 00 不動点とは
// 写像 f で動かしても「動かない点」 f(x*) = x* が不動点。グラフでは y = f(x) と対角線 y = x の交点
//   右：上の線の点 x が下の線の f(x) へ移る矢印。まっすぐ下を向く矢印が不動点
// ドラッグ = 制御点（白丸）を上下に動かして f の形を変える / 1〜4 = 形の見本 / マウスを左のグラフに乗せる = その x の行き先
// ============================================

let ys = [0.75, 0.7, 0.6, 0.45, 0.35, 0.3, 0.2];   // ★ 制御点の高さ（x = 0, 1/6, …, 1 での f の値）
let samples = 600;                                 // ★ 交点を探すときの分割数
let dragIdx = -1;
let fixedPts = [];
let SZ, px0, py0;                                   // グラフの大きさと左上

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  layout();
  findFixed();
}
function layout() {
  SZ = min(width * 0.44, height - 190);
  px0 = 60; py0 = 110;
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); layout(); }

// ★ 写像 f：制御点をなめらかにつなぐ曲線（Catmull-Rom）。値は [0, 1] に収める
function fx(x) {
  let n = ys.length - 1;
  let u = constrain(x, 0, 1) * n;
  let i = min(floor(u), n - 1), t = u - i;
  let p0 = ys[max(i - 1, 0)], p1 = ys[i], p2 = ys[i + 1], p3 = ys[min(i + 2, n)];
  let m1 = (p2 - p0) / 2, m2 = (p3 - p1) / 2;
  let t2 = t * t, t3 = t2 * t;
  let v = (2 * t3 - 3 * t2 + 1) * p1 + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2 + (t3 - t2) * m2;
  return constrain(v, 0, 1);
}

// 不動点を探す：g(x) = f(x) − x の符号が変わる所を見つけて、二分法で絞り込む
function findFixed() {
  fixedPts = [];
  let prevX = 0, prevG = fx(0) - 0;
  if (abs(prevG) < 1e-9) fixedPts.push(0);
  for (let s = 1; s <= samples; s++) {
    let x = s / samples, g = fx(x) - x;
    if (prevG > 0 && g <= 0 || prevG < 0 && g >= 0) {
      let a = prevX, b = x;
      for (let k = 0; k < 40; k++) {
        let m = (a + b) / 2;
        if ((fx(a) - a) * (fx(m) - m) <= 0) b = m; else a = m;
      }
      fixedPts.push((a + b) / 2);
    }
    prevX = x; prevG = g;
  }
}

function toPx(x) { return px0 + x * SZ; }
function toPy(y) { return py0 + SZ - y * SZ; }

function draw() {
  background(230, 30, 11);
  // 枠と対角線
  noFill(); stroke(0, 0, 40); strokeWeight(1);
  rect(px0, py0, SZ, SZ);
  stroke(0, 0, 70, 70); strokeWeight(2);
  line(toPx(0), toPy(0), toPx(1), toPy(1));
  // y = f(x)
  stroke(190, 70, 100); strokeWeight(3);
  beginShape();
  for (let s = 0; s <= 200; s++) { let x = s / 200; vertex(toPx(x), toPy(fx(x))); }
  endShape();
  // 制御点
  for (let i = 0; i < ys.length; i++) {
    let x = i / (ys.length - 1);
    noStroke(); fill(0, 0, 100, i === dragIdx ? 100 : 70);
    circle(toPx(x), toPy(ys[i]), 14);
  }
  // 不動点
  for (let x of fixedPts) {
    stroke(45, 90, 100, 60); strokeWeight(1);
    line(toPx(x), toPy(0), toPx(x), toPy(x));
    noStroke(); fill(45, 90, 100);
    circle(toPx(x), toPy(x), 16);
  }
  // マウスの x の行き先（x → f(x) → 対角線で f(x) を横軸へ戻す）
  if (mouseX > px0 && mouseX < px0 + SZ && mouseY > py0 && mouseY < py0 + SZ && dragIdx < 0) {
    let x = (mouseX - px0) / SZ, y = fx(x);
    stroke(320, 70, 100); strokeWeight(2);
    line(toPx(x), toPy(0), toPx(x), toPy(y));
    line(toPx(x), toPy(y), toPx(y), toPy(y));
    line(toPx(y), toPy(y), toPx(y), toPy(0));
    noStroke(); fill(320, 70, 100);
    circle(toPx(x), toPy(0), 10); triangleDown(toPx(y), toPy(0) + 2);
    textSize(14); text('x = ' + nf(x, 1, 2) + ' → f(x) = ' + nf(y, 1, 2), toPx(x) + 8, toPy(0) + 22);
  }
  noStroke(); fill(0, 0, 60); textSize(13);
  text('0', px0 - 14, py0 + SZ + 4); text('1', px0 + SZ - 4, py0 + SZ + 18); text('1', px0 - 14, py0 + 6);
  text('y = x', toPx(0.86), toPy(0.92));
  fill(190, 70, 100); text('y = f(x)', toPx(0.02), toPy(fx(0.02)) - 12);

  drawArrows();

  // 説明
  noStroke(); fill(0, 0, 100); textSize(18);
  text('不動点 f(x*) = x* の数：' + fixedPts.length + '　　ドラッグ：制御点を動かす　1〜4：見本　マウスを乗せる：行き先', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('f が [0,1] を [0,1] の中へ連続に写すかぎり、曲線は左の辺（f(0) ≥ 0）から右の辺（f(1) ≤ 1）へ必ず対角線をまたぐ → 不動点は 1 つ以上ある', 20, 68);
  fill(45, 90, 100); textSize(16);
  let lx = px0 + SZ + 60, ly = py0 + SZ - 10;
  text('x* = ' + fixedPts.map((x) => nf(x, 1, 3)).join(',  '), lx, ly);
}

// 右側：矢印の図。上の線の x から下の線の f(x) へ
function drawArrows() {
  let x0 = px0 + SZ + 60, x1 = width - 60, y1 = py0 + 40, y2 = py0 + SZ * 0.62;
  if (x1 - x0 < 200) return;
  stroke(0, 0, 60); strokeWeight(2);
  line(x0, y1, x1, y1); line(x0, y2, x1, y2);
  noStroke(); fill(0, 0, 70); textSize(14);
  text('x（動かす前）', x0, y1 - 12); text('f(x)（動かした後）', x0, y2 + 26);
  let n = 28;
  for (let i = 0; i <= n; i++) {
    let x = i / n, y = fx(x);
    let g = y - x;
    // 右へ動く点は水色、左へ動く点は桃色、ほとんど動かない点は黄色
    if (abs(g) < 0.02) stroke(45, 90, 100); else if (g > 0) stroke(190, 60, 100, 70); else stroke(330, 60, 100, 70);
    strokeWeight(1.5);
    line(lerp(x0, x1, x), y1, lerp(x0, x1, y), y2);
  }
  for (let x of fixedPts) {
    stroke(45, 90, 100); strokeWeight(4);
    line(lerp(x0, x1, x), y1, lerp(x0, x1, x), y2);
  }
  noStroke(); fill(0, 0, 60); textSize(14);
  text('水色 = 右へ動く（f(x) > x）　桃色 = 左へ動く（f(x) < x）　黄色 = 動かない', x0, y2 + 56);
  text('左端の点は右へしか動けない、右端の点は左へしか動けない → 途中のどこかで「動かない」点がある', x0, y2 + 80);
}

function mousePressed() {
  dragIdx = -1;
  for (let i = 0; i < ys.length; i++) {
    let x = i / (ys.length - 1);
    if (dist(mouseX, mouseY, toPx(x), toPy(ys[i])) < 16) dragIdx = i;
  }
}
function mouseDragged() {
  if (dragIdx >= 0) { ys[dragIdx] = constrain((py0 + SZ - mouseY) / SZ, 0, 1); findFixed(); }
}
function mouseReleased() { dragIdx = -1; }

function keyPressed() {
  if (key === '1') ys = [0.75, 0.7, 0.6, 0.45, 0.35, 0.3, 0.2];
  if (key === '2') ys = [0.05, 0.08, 0.15, 0.5, 0.85, 0.92, 0.95];
  if (key === '3') ys = [0.3, 0.05, 0.6, 0.2, 0.9, 0.4, 0.95];
  if (key === '4') ys = ys.map(() => random());
  findFixed();
}

// ---------- やってみよう ----------
// 1. 不動点を 0 個にできる？ 制御点をどう動かしても対角線をまたいでしまう理由を言葉で説明しよう
// 2. 見本 2 は不動点が 3 つ。真ん中の不動点と両端の不動点は何が違う？（01 のクモの巣図で確かめる）
// 3. fx の最後の constrain(v, 0, 1) を外して、値を 1.2 まで出せるようにすると不動点が消せるか
// 4. ys の数を 7 → 12 に増やして、不動点が 7 つある f を作ろう

// ==================================================
// ここから下は「道具」
// ==================================================
function triangleDown(x, y) { triangle(x - 6, y - 10, x + 6, y - 10, x, y); }
