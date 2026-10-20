// ============================================
// 08 ページランク（Google の検索順位のもと）
// 「たくさんリンクされているページは重要。重要なページからのリンクはもっと重要」
// ランダムに動き回る「サーファー」が、よく滞在するページほど重要 ＝ ページランク
// クリック → 別の点へドラッグでリンク（矢印） / スペースでサーファーを放つ / R でやり直し
// ============================================

let nodes = [], links = []; // links: [from, to]（向きあり）
let rank = [];
let visits = [];
let surfers = [];
let dragFrom = -1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  reset();
}

function reset() {
  nodes = []; links = []; surfers = [];
  for (let i = 0; i < 8; i++) nodes.push({ x: width * 0.3 + cos((TWO_PI * i) / 8) * 230, y: height * 0.55 + sin((TWO_PI * i) / 8) * 230 });
  links = [[0, 1], [1, 2], [2, 0], [3, 0], [4, 0], [5, 0], [6, 2], [7, 6], [2, 3]];
  visits = new Array(8).fill(0);
  computeRank();
}

// ★ ページランク：全ページ同じ値から始めて、「リンク先に自分の値を分配する」を何回もくり返す
function computeRank() {
  let n = nodes.length, d = 0.85; // d = リンクをたどる確率（1−d でランダムジャンプ）
  rank = new Array(n).fill(1 / n);
  for (let iter = 0; iter < 50; iter++) {
    let next = new Array(n).fill((1 - d) / n);
    for (let i = 0; i < n; i++) {
      let out = links.filter(([a]) => a === i);
      if (out.length === 0) for (let j = 0; j < n; j++) next[j] += (d * rank[i]) / n; // 行き止まりは全員へ
      else for (let [, b] of out) next[b] += (d * rank[i]) / out.length; // リンク先に等分
    }
    rank = next;
  }
}

function draw() {
  background(220, 40, 10);
  // サーファーを動かす
  for (let s of surfers) {
    s.t += 0.04;
    if (s.t >= 1) {
      s.at = s.to;
      visits[s.at]++;
      let out = links.filter(([a]) => a === s.at);
      s.to = random() < 0.85 && out.length ? random(out)[1] : floor(random(nodes.length)); // ★ 85% でリンク、15% でジャンプ
      s.t = 0;
    }
  }

  // リンク（矢印）
  for (let [a, b] of links) {
    let ax = nodes[a].x, ay = nodes[a].y, bx = nodes[b].x, by = nodes[b].y;
    let ang = atan2(by - ay, bx - ax), r = 18 + sqrt(rank[b]) * 60;
    let ex = bx - cos(ang) * r, ey = by - sin(ang) * r;
    stroke(0, 0, 55);
    strokeWeight(2);
    line(ax, ay, ex, ey);
    noStroke();
    fill(0, 0, 55);
    triangle(ex, ey, ex - cos(ang - 0.4) * 14, ey - sin(ang - 0.4) * 14, ex - cos(ang + 0.4) * 14, ey - sin(ang + 0.4) * 14);
  }
  if (dragFrom >= 0) { stroke(45, 90, 100); line(nodes[dragFrom].x, nodes[dragFrom].y, mouseX, mouseY); }
  // ノード：大きさ = ページランク
  let maxR = max(...rank);
  for (let i = 0; i < nodes.length; i++) {
    noStroke();
    fill(map(rank[i], 0, maxR, 200, 40), 80, 100);
    circle(nodes[i].x, nodes[i].y, 30 + sqrt(rank[i]) * 120);
    fill(0, 0, 10);
    textAlign(CENTER, CENTER);
    textSize(14);
    text(String.fromCharCode(65 + i) + '\n' + nf(rank[i], 1, 2), nodes[i].x, nodes[i].y);
  }
  textAlign(LEFT, BASELINE);
  for (let s of surfers) {
    let x = lerp(nodes[s.at].x, nodes[s.to].x, s.t), y = lerp(nodes[s.at].y, nodes[s.to].y, s.t);
    fill(45, 90, 100);
    circle(x, y, 12);
  }

  // 右：訪問回数（サーファーの統計）とページランクの比較
  let rx = width * 0.66, rw = width - rx - 50;
  let totalV = visits.reduce((a, b) => a + b, 0) || 1;
  noStroke();
  fill(0, 0, 100);
  textSize(16);
  text('ページランク（計算） vs サーファーの滞在割合（実測）', rx, height * 0.22);
  for (let i = 0; i < nodes.length; i++) {
    let y = height * 0.26 + i * 38;
    fill(0, 0, 70);
    textSize(14);
    text(String.fromCharCode(65 + i), rx, y + 14);
    fill(map(rank[i], 0, maxR, 200, 40), 80, 100);
    rect(rx + 24, y, rank[i] * rw * 1.6, 12, 6);
    fill(45, 90, 100);
    rect(rx + 24, y + 15, (visits[i] / totalV) * rw * 1.6, 12, 6);
  }

  fill(0, 0, 100);
  textSize(18);
  text('ドラッグでリンク（矢印）を追加　スペースでサーファー（黄）を放つ ' + surfers.length + ' 人　R でやり直し', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('大きい点 = ページランクが高い。多くのページから、しかも重要なページからリンクされている点が大きくなる（A と C を見比べて）', 20, 68);
}

function nearest(x, y) { for (let i = 0; i < nodes.length; i++) if (dist(x, y, nodes[i].x, nodes[i].y) < 35) return i; return -1; }
function mousePressed() { if (mouseY > 80) dragFrom = nearest(mouseX, mouseY); }
function mouseReleased() {
  if (dragFrom >= 0) {
    let to = nearest(mouseX, mouseY);
    if (to >= 0 && to !== dragFrom && !links.some(([a, b]) => a === dragFrom && b === to)) { links.push([dragFrom, to]); computeRank(); }
  }
  dragFrom = -1;
}
function keyPressed() {
  if (key === ' ') for (let k = 0; k < 5; k++) surfers.push({ at: 0, to: floor(random(nodes.length)), t: 0 });
  if (key === 'r' || key === 'R') reset();
}

// ---------- やってみよう ----------
// 1. A は 4 本リンクされている。C は 2 本。でも C のほうが大きくなるのはなぜ？（A からリンクされているから）
// 2. 自分から自分へのリンクや、2 点だけでリンクし合う「ずる」をしても、d = 0.85 のおかげで大きくなりすぎない
// 3. サーファーをたくさん放って長く待つと、実測がページランクに近づく
