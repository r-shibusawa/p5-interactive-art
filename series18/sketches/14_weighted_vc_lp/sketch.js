// ============================================
// 14 重みつき頂点被覆：線形計画で緩めて、丸める
// 点に重さ（費用）がある。費用の合計が最小の頂点被覆は NP 困難
// ① 「取る = 1／取らない = 0」を「0〜1 の小数 x」に緩める（線形計画法：各線で x_u + x_v ≥ 1）→ 多項式時間で解ける
// ② x ≥ 1/2 の点を全部取る（丸め）→ どの線も片方は 1/2 以上なので被覆になり、費用は LP の 2 倍以下 ≤ 最適の 2 倍
// 実はこの LP の最適解は 0, 1/2, 1 だけで作れる（だからここでは 3ⁿ 通りを調べて LP を解いている）
// スペース：解く / 点をクリック：重さを 1→2→…→6 / R：ランダム / 1：三角形（LP が 1/2 だらけになる例）
// ============================================

let nodes = [], edges = [];
let lp = null, ip = null, gen = null;
let N = 9;    // ★ 点の数（LP は 3^N、整数の最適は 2^N 通りを調べる）

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  randomGraph();
}
function randomGraph() {
  nodes = []; edges = [];
  let cx = width / 2, cy = height * 0.55, R = min(width * 0.3, height * 0.32);
  for (let i = 0; i < N; i++) nodes.push({ x: cx + cos(TWO_PI * i / N) * R * random(0.6, 1), y: cy + sin(TWO_PI * i / N) * R * random(0.6, 1), w: floor(random(1, 7)) });
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) if (random() < 0.3) edges.push([i, j]);
  if (edges.length === 0) edges.push([0, 1]);
  reset();
}
function triangles() {
  nodes = []; edges = [];
  let cx = width / 2, cy = height * 0.55, R = min(width, height) * 0.28;
  for (let t = 0; t < 3; t++) for (let k = 0; k < 3; k++) {
    let a = TWO_PI * t / 3, b = a + TWO_PI * k / 3 + HALF_PI;
    nodes.push({ x: cx + cos(a) * R + cos(b) * R * 0.35, y: cy + sin(a) * R + sin(b) * R * 0.35, w: 1 });
  }
  for (let t = 0; t < 3; t++) edges.push([3 * t, 3 * t + 1], [3 * t + 1, 3 * t + 2], [3 * t, 3 * t + 2]);
  reset();
}
function reset() { lp = null; ip = null; gen = null; }

function* solveAll() {
  let n = nodes.length, best = null, bestI = null;
  let x = new Array(n).fill(0);
  let total = pow(3, n);
  for (let code = 0; code < total; code++) {
    let c = code;
    for (let i = 0; i < n; i++) { x[i] = (c % 3) / 2; c = floor(c / 3); }
    if (edges.every(([a, b]) => x[a] + x[b] >= 1)) {
      let cost = x.reduce((s, v, i) => s + v * nodes[i].w, 0);
      if (!best || cost < best.cost - 1e-9) best = { x: x.slice(), cost };
      if (x.every((v) => v !== 0.5) && (!bestI || cost < bestI.cost)) bestI = { x: x.slice(), cost };
    }
    if (code % 400 === 0) { lp = best; yield code / total; }
  }
  lp = best; ip = bestI;
}

function draw() {
  background(190, 30, 9);
  let progress = 1;
  if (gen) { let r = gen.next(); if (r.done) gen = null; else progress = r.value; }
  let rounded = lp ? lp.x.map((v) => v >= 0.5) : null;

  for (let [a, b] of edges) { stroke(0, 0, 100, 35); strokeWeight(2); line(nodes[a].x, nodes[a].y, nodes[b].x, nodes[b].y); }
  nodes.forEach((p, i) => {
    let r = 26 + p.w * 7;
    let v = lp ? lp.x[i] : 0;
    noStroke();
    fill(0, 0, 25); circle(p.x, p.y, r);
    // LP の値を「水位」で表す
    if (lp) {
      fill(v === 1 ? color(45, 85, 100) : v === 0.5 ? color(190, 70, 100) : color(0, 0, 25));
      arc(p.x, p.y, r, r, HALF_PI - PI * v, HALF_PI + PI * v, CHORD);
    }
    if (ip && !gen && ip.x[i] === 1) { noFill(); stroke(280, 70, 100); strokeWeight(3); drawingContext.setLineDash([6, 4]); circle(p.x, p.y, r + 14); drawingContext.setLineDash([]); }
    if (rounded && !gen && rounded[i]) { noFill(); stroke(130, 80, 100); strokeWeight(4); circle(p.x, p.y, r + 4); }
    noStroke(); fill(0, 0, 100); textAlign(CENTER, CENTER); textSize(14);
    text('重さ ' + p.w, p.x, p.y - r / 2 - 14);
    if (lp) { textSize(16); fill(0, 0, 100); text(v === 0.5 ? '½' : v, p.x, p.y); }
  });

  noStroke(); textAlign(LEFT, BASELINE); fill(0, 0, 100); textSize(18);
  text('スペース：解く　点をクリック：重さを変える　R：ランダム　1：三角形 3 つ', 20, 34);
  if (gen) { fill(45, 80, 100); text('LP を解いています… ' + nf(progress * 100, 1, 0) + '%', 20, 68); }
  if (lp && !gen) {
    let rc = rounded.reduce((s, b, i) => s + (b ? nodes[i].w : 0), 0);
    textSize(19);
    fill(190, 70, 100); text('① LP（小数を許す）の最小費用 = ' + nf(lp.cost, 1, 1) + '　（青 = ½、黄 = 1）', 20, 70);
    fill(280, 60, 100); text('   本当の最適（0/1 だけ）= ' + (ip ? ip.cost : '?') + '　（紫の点線）', 20, 98);
    fill(130, 70, 100); text('② ½ 以上を丸めて取る = ' + rc + '（緑の輪）　→ ' + nf(lp.cost, 1, 1) + ' ≤ ' + (ip ? ip.cost : '?') + ' ≤ ' + rc + ' ≤ 2 × ' + nf(lp.cost, 1, 1) + ' = ' + nf(2 * lp.cost, 1, 1), 20, 126);
  }
  fill(0, 0, 60); textSize(15);
  text('LP は「緩めた問題」なので最適以下。丸めると各点の値は最大 2 倍になるだけ → 2 倍近似。三角形では LP = 1.5、最適 = 2 の差（整数性ギャップ）', 20, height - 22);
}

function mousePressed() {
  for (let p of nodes) if (dist(mouseX, mouseY, p.x, p.y) < 20 + p.w * 4) { p.w = (p.w % 6) + 1; reset(); return; }
}
function keyPressed() {
  if (key === ' ' && !gen) gen = solveAll();
  if (key === 'r' || key === 'R') randomGraph();
  if (key === '1') triangles();
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. 三角形（1）で LP の値が全部 ½ になるのを確かめよう。丸めると全部取る（費用 9、最適 6）
// 2. 重さを極端に（6 と 1）してみよう。LP はどこに 1 を置く？
// 3. 丸めのしきい値を ½ 以外（例えば 0.6）にすると、被覆にならないことがある。なぜ？
