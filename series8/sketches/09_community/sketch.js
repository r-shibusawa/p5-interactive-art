// ============================================
// 09 コミュニティ検出（仲良しグループを見つける）
// 「自分の隣で多数派のラベルに合わせる」を全員がくり返すと、密につながった仲間が同じ色になる
// （ラベル伝播法）。SNS のグループ分け、タンパク質の機能分類などに使われる
// スペースで 1 ステップ / R で新しいネットワーク / 自動で力学レイアウト
// ============================================

let n = 90, nodes = [], adj = [], edges = [];
let label = [];
let stepCount = 0;
let autoStep = true;
let timer = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  build();
}

// 3 つのグループが「中は密、外は疎」につながったネットワーク
function build() {
  nodes = []; adj = []; edges = [];
  for (let i = 0; i < n; i++) { nodes.push({ x: random(width), y: random(100, height), vx: 0, vy: 0, group: floor(i / 30) }); adj.push([]); }
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    let same = nodes[i].group === nodes[j].group;
    if (random() < (same ? 0.18 : 0.008)) { edges.push([i, j]); adj[i].push(j); adj[j].push(i); }
  }
  label = nodes.map((_, i) => i); // ★ 最初は全員ちがうラベル
  stepCount = 0;
}

// ★ ラベル伝播の 1 ステップ：隣でいちばん多いラベルに乗りかえる
function propagate() {
  let orderIdx = nodes.map((_, i) => i).sort(() => random() - 0.5);
  let changed = 0;
  for (let i of orderIdx) {
    if (!adj[i].length) continue;
    let count = {};
    for (let nb of adj[i]) count[label[nb]] = (count[label[nb]] || 0) + 1;
    let best = Object.keys(count).reduce((a, b) => (count[a] >= count[b] ? a : b));
    if (int(best) !== label[i]) { label[i] = int(best); changed++; }
  }
  stepCount++;
  if (changed === 0) autoStep = false;
}

function draw() {
  background(220, 40, 10);
  if (autoStep && millis() - timer > 700 && frameCount > 60) { timer = millis(); propagate(); }
  forces();

  for (let [a, b] of edges) {
    let same = label[a] === label[b];
    stroke(same ? (label[a] * 37) % 360 : 0, same ? 50 : 0, same ? 70 : 35, 60);
    strokeWeight(1);
    line(nodes[a].x, nodes[a].y, nodes[b].x, nodes[b].y);
  }
  for (let i = 0; i < n; i++) {
    noStroke();
    fill((label[i] * 37) % 360, 70, 100);
    circle(nodes[i].x, nodes[i].y, 14);
  }
  let distinct = new Set(label).size;
  fill(0, 0, 100);
  textSize(18);
  text('ステップ ' + stepCount + '　ラベルの種類 ' + distinct + '　' + (autoStep ? '自動で進行中…' : '収束（これ以上変わらない）') + '　スペースで 1 ステップ　R で新しいネットワーク', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('最初は全員別の色。「隣の多数派に合わせる」だけで、密につながったグループが同じ色にまとまる', 20, 68);
}

function forces() {
  for (let i = 0; i < n; i++) {
    let fx = (width / 2 - nodes[i].x) * 0.002, fy = (height / 2 + 40 - nodes[i].y) * 0.002;
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      let dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y, d2 = max(dx * dx + dy * dy, 100);
      fx += (dx / d2) * 600; fy += (dy / d2) * 600;
    }
    nodes[i].vx = (nodes[i].vx + fx) * 0.5; nodes[i].vy = (nodes[i].vy + fy) * 0.5;
  }
  for (let [a, b] of edges) {
    let dx = nodes[b].x - nodes[a].x, dy = nodes[b].y - nodes[a].y, d = max(sqrt(dx * dx + dy * dy), 1);
    let f = (d - 50) * 0.01;
    nodes[a].vx += (dx / d) * f; nodes[a].vy += (dy / d) * f; nodes[b].vx -= (dx / d) * f; nodes[b].vy -= (dy / d) * f;
  }
  for (let nd of nodes) { nd.x = constrain(nd.x + nd.vx, 20, width - 20); nd.y = constrain(nd.y + nd.vy, 90, height - 20); }
}

function keyPressed() {
  if (key === ' ') propagate();
  if (key === 'r' || key === 'R') { build(); autoStep = true; }
}

// ---------- やってみよう ----------
// 1. 収束したとき、色の数はいくつ？ 作ったグループ（3 つ）と一致した？
// 2. グループ間のつながり確率 0.008 を 0.05 にすると、分けにくくなる
// 3. 同じネットワークでも、順番のランダムさで結果が少し変わる（R で何度も）
