// ============================================
// 13 意見はどう広がるか（投票者モデル）
// 各点は 2 つの意見（青／橙）のどちらか。毎回ランダムな点が「隣の 1 人の意見をまねる」だけ
// ネットワークの形によって、まとまる・分かれる・ずっと揺れる
// 1 = 格子 / 2 = ランダム / 3 = 2 つのグループ / クリックで点の意見を反転 / R でやり直し
// ============================================

let n = 150, nodes = [], adj = [], edges = [];
let opinion = [];
let topology = 1;
let history = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  build();
}

function build() {
  nodes = []; adj = []; edges = []; history = [];
  for (let i = 0; i < n; i++) adj.push([]);
  let link = (a, b) => { if (a !== b && !adj[a].includes(b)) { adj[a].push(b); adj[b].push(a); edges.push([a, b]); } };
  if (topology === 1) {
    let cols = 15;
    for (let i = 0; i < n; i++) nodes.push({ x: map(i % cols, 0, cols - 1, 100, width * 0.62), y: map(floor(i / cols), 0, 9, 130, height - 60) });
    for (let i = 0; i < n; i++) { if (i % cols < cols - 1) link(i, i + 1); if (i + cols < n) link(i, i + cols); }
  } else if (topology === 2) {
    for (let i = 0; i < n; i++) nodes.push({ x: random(100, width * 0.62), y: random(130, height - 60) });
    for (let i = 0; i < n; i++) for (let k = 0; k < 2; k++) link(i, floor(random(n)));
  } else {
    for (let i = 0; i < n; i++) nodes.push({ x: (i < n / 2 ? width * 0.2 : width * 0.5) + random(-110, 110), y: height * 0.55 + random(-200, 200) });
    for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) {
      let j = i < n / 2 ? floor(random(n / 2)) : floor(random(n / 2)) + n / 2;
      link(i, j);
    }
    for (let k = 0; k < 3; k++) link(floor(random(n / 2)), floor(random(n / 2)) + n / 2); // 2 グループを細くつなぐ
  }
  opinion = nodes.map(() => (random() < 0.5 ? 0 : 1));
}

function draw() {
  background(220, 40, 10);
  // ★ 投票者モデル：ランダムな点が、ランダムな隣の意見をコピー（1 フレームに 20 回）
  for (let k = 0; k < 20; k++) {
    let i = floor(random(n));
    if (adj[i].length) opinion[i] = opinion[random(adj[i])];
  }
  if (frameCount % 5 === 0) {
    history.push(opinion.filter((o) => o).length / n);
    if (history.length > 300) history.shift();
  }

  for (let [a, b] of edges) {
    stroke(opinion[a] === opinion[b] ? [200, 30][opinion[a]] : 0, opinion[a] === opinion[b] ? 50 : 0, opinion[a] === opinion[b] ? 60 : 30);
    strokeWeight(1);
    line(nodes[a].x, nodes[a].y, nodes[b].x, nodes[b].y);
  }
  for (let i = 0; i < n; i++) {
    noStroke();
    fill([200, 30][opinion[i]], 80, 100);
    circle(nodes[i].x, nodes[i].y, 12);
  }

  // 右：橙の割合の推移
  let gx = width * 0.7, gw = width - gx - 40, gy = height * 0.25, gh = height * 0.5;
  stroke(0, 0, 30);
  line(gx, gy + gh, gx + gw, gy + gh);
  line(gx, gy + gh / 2, gx + gw, gy + gh / 2);
  noFill();
  stroke(30, 80, 100);
  strokeWeight(2.5);
  beginShape();
  for (let t = 0; t < history.length; t++) vertex(gx + (t / 300) * gw, gy + gh - history[t] * gh);
  endShape();
  noStroke();
  fill(0, 0, 60);
  textSize(14);
  text('橙の割合（100% か 0% で意見が統一）', gx, gy - 10);
  let frac = opinion.filter((o) => o).length / n;
  fill(0, 0, 100);
  textSize(22);
  text('橙 ' + nf(frac * 100, 1, 0) + ' %　青 ' + nf((1 - frac) * 100, 1, 0) + ' %', gx, gy + gh + 36);

  fill(0, 0, 100);
  textSize(18);
  text('1：格子　2：ランダム　3：2 つのグループ　クリックで意見を反転　R でやり直し　' + (frac === 0 || frac === 1 ? '→ 意見が統一された！' : ''), 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('ルールは「隣の 1 人をまねる」だけ。格子は大きな塊が育ち、ランダムは速く統一、2 グループはなかなか決まらない（分極）', 20, 68);
}

function mousePressed() {
  for (let i = 0; i < n; i++) if (dist(mouseX, mouseY, nodes[i].x, nodes[i].y) < 10) opinion[i] = 1 - opinion[i];
}
function keyPressed() {
  if (key >= '1' && key <= '3') { topology = int(key); build(); }
  if (key === 'r' || key === 'R') build();
}

// ---------- やってみよう ----------
// 1. 3 つのトポロジーで、統一されるまでの時間を比べる
// 2. 2 グループ（3）で、グループ間の線を増やすと（link を 3 → 20）どうなる？
// 3. 「まねない頑固者」を 1 人入れると（その点は更新しない）、全体はどうなる？
