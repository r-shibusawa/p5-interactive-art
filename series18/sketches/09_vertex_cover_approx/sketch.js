// ============================================
// 09 頂点被覆の 2 倍近似（線を選んで両端を取る）
// 最小の頂点被覆は NP 困難。でも「残っている線を 1 本選んで両端を両方取る」をくり返すだけで、最適の 2 倍以内が保証される
// 理由：選んだ線どうしは端を共有しない。最適解もそれぞれの線の端を少なくとも 1 つ取るので、最適 ≥ 選んだ線の本数 = 近似 ÷ 2
// スペース：1 手ずつ進める（もう一度押すと自動）/ O：最適解を表示 / R：ランダムなグラフ / 1〜3：お手本
// 何もない所をクリック：点を追加 / 点から点へドラッグ：線を追加
// ============================================

let nodes = [], edges = [];
let cover = [], picked = [], remaining = [];
let auto = false, timer = 0, opt = null, showOpt = false;
let MAX_N = 16; // ★ 最適解の総当たりは 2^点の数

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  preset(1);
}

function preset(k) {
  nodes = []; edges = [];
  let cx = width / 2, cy = height * 0.56, R = min(width, height) * 0.33;
  if (k === 1) { // 星：最適 1、近似 2
    nodes.push({ x: cx, y: cy });
    for (let i = 0; i < 8; i++) { nodes.push({ x: cx + cos(TWO_PI * i / 8) * R, y: cy + sin(TWO_PI * i / 8) * R }); edges.push([0, i + 1]); }
  } else if (k === 2) { // 離れた線 3 本：近似 6 点、最適 3 点でちょうど 2 倍
    for (let i = 0; i < 6; i++) nodes.push({ x: cx - R + (i % 3) * R, y: cy + (i < 3 ? -R * 0.5 : R * 0.5) });
    for (let i = 0; i < 3; i++) edges.push([i, i + 3]);
  } else randomGraph(11);
  resetAlg();
}
function randomGraph(n) {
  nodes = []; edges = [];
  for (let i = 0; i < n; i++) nodes.push({ x: random(120, width - 120), y: random(170, height - 90) });
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    if (dist(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y) < min(width, height) * 0.32 && random() < 0.5) edges.push([i, j]);
  }
}
function resetAlg() { cover = []; picked = []; remaining = edges.map((e) => e.slice()); auto = false; opt = null; showOpt = false; }

function algStep() {
  if (remaining.length === 0) return false;
  let e = random(remaining);                 // ★ 線の選び方を変えてみよう（例：remaining[0]）
  picked.push(e);
  cover.push(e[0], e[1]);
  remaining = remaining.filter(([a, b]) => !cover.includes(a) && !cover.includes(b)); // 端が被覆に入った線を消す
  if (remaining.length === 0) computeOpt();
  return true;
}
function computeOpt() {
  let n = nodes.length;
  if (n > MAX_N) { opt = null; return; }
  let best = null;
  for (let m = 0; m < 1 << n; m++) {
    let c = 0; for (let i = 0; i < n; i++) if ((m >> i) & 1) c++;
    if (best && c >= best.c) continue;
    if (edges.every(([a, b]) => ((m >> a) & 1) || ((m >> b) & 1))) best = { m, c };
  }
  opt = best;
}

let dragFrom = -1;
function draw() {
  background(210, 30, 9);
  if (auto && ++timer % 30 === 0) if (!algStep()) auto = false;

  for (let [a, b] of edges) {
    let alive = remaining.some(([p, q]) => p === a && q === b);
    let isPick = picked.some(([p, q]) => p === a && q === b);
    stroke(isPick ? color(45, 90, 100) : alive ? color(0, 0, 80) : color(150, 50, 60, 60));
    strokeWeight(isPick ? 7 : alive ? 2.5 : 2);
    line(nodes[a].x, nodes[a].y, nodes[b].x, nodes[b].y);
  }
  if (dragFrom >= 0) { stroke(0, 0, 100); strokeWeight(2); line(nodes[dragFrom].x, nodes[dragFrom].y, mouseX, mouseY); }
  nodes.forEach((p, i) => {
    let inC = cover.includes(i), inO = showOpt && opt && (opt.m >> i) & 1;
    noStroke();
    if (inO) { fill(280, 70, 100); circle(p.x, p.y, 52); }
    fill(inC ? color(45, 90, 100) : color(210, 20, 55));
    circle(p.x, p.y, 34);
    fill(0, 0, 10); textAlign(CENTER, CENTER); textSize(13); text(i, p.x, p.y);
  });

  noStroke(); textAlign(LEFT, BASELINE); fill(0, 0, 100); textSize(18);
  text('スペース：1 手（2 回目から自動）　O：最適解　R：ランダム　1：星　2：ペア 3 組　3：ランダム　クリック：点　ドラッグ：線', 20, 34);
  textSize(20); fill(45, 85, 100);
  text('近似：選んだ線 ' + picked.length + ' 本 → 被覆 ' + cover.length + ' 点　（残りの線 ' + remaining.length + ' 本）', 20, 70);
  if (remaining.length === 0 && edges.length > 0) {
    if (opt) {
      fill(280, 60, 100);
      text('最適：' + opt.c + ' 点　　近似 / 最適 = ' + nf(cover.length / opt.c, 1, 2) + '（必ず 2 以下）' + (showOpt ? '' : '　O で表示'), 20, 102);
    } else { fill(0, 0, 70); text('点が ' + MAX_N + ' 個より多いので最適解は計算しない（2^n 通り）', 20, 102); }
  }
  fill(0, 0, 60); textSize(15);
  text('黄色の太線どうしは端を共有しない（マッチング）。最適解も各黄色線に 1 点ずつは必要 → 最適 ≥ 黄線の本数、近似 = 2 × 黄線の本数', 20, height - 22);
}

function hit(x, y) { for (let i = 0; i < nodes.length; i++) if (dist(x, y, nodes[i].x, nodes[i].y) < 20) return i; return -1; }
function mousePressed() {
  if (mouseY < 110) return;
  dragFrom = hit(mouseX, mouseY);
  if (dragFrom < 0 && nodes.length < 24) { nodes.push({ x: mouseX, y: mouseY }); resetAlg(); }
}
function mouseReleased() {
  if (dragFrom >= 0) {
    let to = hit(mouseX, mouseY);
    if (to >= 0 && to !== dragFrom && !edges.some(([a, b]) => (a === dragFrom && b === to) || (a === to && b === dragFrom))) {
      edges.push([min(dragFrom, to), max(dragFrom, to)]); resetAlg();
    }
  }
  dragFrom = -1;
}
function keyPressed() {
  if (key === ' ') { if (remaining.length === 0) resetAlg(); else if (picked.length > 0) auto = !auto; else algStep(); }
  if (key === 'o' || key === 'O') { if (!opt && remaining.length === 0) computeOpt(); showOpt = !showOpt; }
  if (key === 'r' || key === 'R') { randomGraph(11); resetAlg(); }
  if (key >= '1' && key <= '3') preset(int(key));
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. 星（1）で近似は 2、最適は 1。比がちょうど 2 になる
// 2. ランダムなグラフで何度も試し、比の平均を記録しよう（2 よりかなり小さいことが多い）
// 3. 「次数がいちばん大きい点を取る」貪欲法に変えると？（実は比が log n まで悪くなる例がある）
