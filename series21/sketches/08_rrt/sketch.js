// ============================================
// 08 RRT ─ ランダムに伸びる木で道を探す
// マス目に切らなくても道が探せる。ランダムな点を打ち、木のいちばん近い節からそこへ少し伸ばす。これだけ
//   木は「まだ行っていない広い場所」へ自然に伸びていく（探索の偏りが空間の広さに比例）
//   RRT*：新しい節の親を「近くでいちばんコストが小さい節」に選び直し、周りの節もつなぎ直す（rewire）→ 道がだんだん短くなる
// スペース = 伸ばす／止める / クリック = ゴール / ↑↓ = ゴールへの偏り / S = RRT ⇄ RRT* / R = 地図をつくり直す / C = 木を消す
// ============================================

let obstacles = [];           // 長方形 {x, y, w, h}
let nodes = [];               // {x, y, parent, cost}
let start, goal;
let stepLen = 22;             // ★ 1 回に伸ばす長さ
let goalBias = 0.05;          // ★ ゴールをサンプルする確率
let goalRadius = 18;
let maxNodes = 3000;          // ★ 節の上限
let perFrame = 6;             // ★ 1 フレームで試す回数
let star = false;             // RRT* にするか
let rewireR = 60;             // ★ RRT* でつなぎ直す半径
let running = false;
let bestGoal = -1;            // ゴールに届いた節（最良）

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  makeMap();
}

function makeMap() {
  obstacles = [];
  for (let i = 0; i < 9; i++) obstacles.push({ x: random(width * 0.2, width * 0.8), y: random(110, height - 120), w: random(30, 110), h: random(30, 140) });
  start = { x: 80, y: height / 2 };
  goal = { x: width - 100, y: height / 2 };
  resetTree();
}
function resetTree() { nodes = [{ x: start.x, y: start.y, parent: -1, cost: 0 }]; bestGoal = -1; }

function inObstacle(x, y) {
  if (x < 0 || y < 100 || x > width || y > height) return true;
  for (let o of obstacles) if (x > o.x && x < o.x + o.w && y > o.y && y < o.y + o.h) return true;
  return false;
}
// 線分が障害物にぶつかるか（数点をサンプルして調べる）
function blocked(a, b) {
  let d = sqrt(sq(a.x - b.x) + sq(a.y - b.y));
  let n = max(2, ceil(d / 6));
  for (let i = 0; i <= n; i++) if (inObstacle(lerp(a.x, b.x, i / n), lerp(a.y, b.y, i / n))) return true;
  return false;
}
function nearest(p) {
  let bi = 0, bd = Infinity;
  for (let i = 0; i < nodes.length; i++) { let d = sq(nodes[i].x - p.x) + sq(nodes[i].y - p.y); if (d < bd) { bd = d; bi = i; } }
  return bi;
}

// ★ RRT の 1 回：サンプル → いちばん近い節 → そこから stepLen だけ伸ばす
function grow() {
  if (nodes.length >= maxNodes) { running = false; return; }
  let s = random() < goalBias ? { x: goal.x, y: goal.y } : { x: random(width), y: random(100, height) };
  let ni = nearest(s);
  let nn = nodes[ni];
  let d = sqrt(sq(s.x - nn.x) + sq(s.y - nn.y));
  if (d < 1) return;
  let q = { x: nn.x + (s.x - nn.x) / d * min(stepLen, d), y: nn.y + (s.y - nn.y) / d * min(stepLen, d) };
  if (blocked(nn, q)) return;
  let parent = ni, cost = nn.cost + min(stepLen, d);
  let near = [];
  if (star) {
    // ★ RRT*：半径内の節から「コストが最小になる親」を選ぶ
    for (let i = 0; i < nodes.length; i++) {
      let dd = sqrt(sq(nodes[i].x - q.x) + sq(nodes[i].y - q.y));
      if (dd < rewireR) {
        near.push([i, dd]);
        if (nodes[i].cost + dd < cost && !blocked(nodes[i], q)) { cost = nodes[i].cost + dd; parent = i; }
      }
    }
  }
  nodes.push({ x: q.x, y: q.y, parent, cost });
  let qi = nodes.length - 1;
  if (star) {
    // rewire：新しい節を経由したほうが近道になる節は親をつけ替える
    for (let [i, dd] of near) {
      if (cost + dd < nodes[i].cost && !blocked(q, nodes[i])) { nodes[i].parent = qi; nodes[i].cost = cost + dd; }
    }
  }
  if (sqrt(sq(q.x - goal.x) + sq(q.y - goal.y)) < goalRadius) {
    if (bestGoal < 0 || cost < nodes[bestGoal].cost) bestGoal = qi;
    if (!star) running = false;
  }
}

function draw() {
  background(215, 35, 12);
  if (running) for (let k = 0; k < perFrame; k++) grow();
  // RRT* は rewire でコストが変わるので、ゴール付近の最良節を取り直す
  if (star && bestGoal >= 0) {
    for (let i = 0; i < nodes.length; i++) if (sqrt(sq(nodes[i].x - goal.x) + sq(nodes[i].y - goal.y)) < goalRadius && nodes[i].cost < nodes[bestGoal].cost) bestGoal = i;
  }

  noStroke();
  fill(0, 60, 70);
  for (let o of obstacles) rect(o.x, o.y, o.w, o.h, 4);
  // 木
  stroke(200, 50, 80, 50);
  strokeWeight(1);
  for (let i = 1; i < nodes.length; i++) { let p = nodes[nodes[i].parent]; line(p.x, p.y, nodes[i].x, nodes[i].y); }
  // 道
  if (bestGoal >= 0) {
    stroke(45, 90, 100);
    strokeWeight(4);
    for (let i = bestGoal; nodes[i].parent >= 0; i = nodes[i].parent) { let p = nodes[nodes[i].parent]; line(p.x, p.y, nodes[i].x, nodes[i].y); }
  }
  noStroke();
  fill(170, 80, 100); circle(start.x, start.y, 20);
  fill(120, 80, 100, 40); circle(goal.x, goal.y, goalRadius * 2);
  fill(120, 80, 100); circle(goal.x, goal.y, 16);

  fill(0, 0, 100);
  textSize(18);
  text('スペース：' + (running ? '止める' : '伸ばす') + '　' + (star ? 'RRT*' : 'RRT') + '（S）　ゴールへの偏り ' + nf(goalBias, 1, 2) + '（↑↓）　節 ' + nodes.length + '　クリック：ゴール　R：地図　C：木を消す' + (bestGoal >= 0 ? '　道の長さ ' + nf(nodes[bestGoal].cost, 1, 0) : ''), 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('RRT は届いたら終わり（道はガタガタ）。RRT* は届いた後も伸ばし続けると道が短くまっすぐになっていく。偏りを 0 にすると空間を均等に埋める', 20, 68);
}

function mousePressed() {
  if (mouseY < 90 || inObstacle(mouseX, mouseY)) return;
  goal = { x: mouseX, y: mouseY };
  bestGoal = -1;
}
function keyPressed() {
  if (key === ' ') running = !running;
  if (key === 's' || key === 'S') { star = !star; resetTree(); running = true; }
  if (key === UP_ARROW) goalBias = min(0.5, goalBias + 0.05);
  if (key === DOWN_ARROW) goalBias = max(0, goalBias - 0.05);
  if (key === 'r' || key === 'R') makeMap();
  if (key === 'c' || key === 'C') resetTree();
}

// ---------- やってみよう ----------
// 1. 偏り 0 と 0.5 で、ゴールに届くまでの節の数を比べよう。偏りが大きいと障害物の裏で詰まることがある
// 2. RRT* を 3000 節まで伸ばして、道の長さが下がっていくのを見る。rewireR を 120 にすると？
// 3. stepLen を 5 にすると細かいが遅い。60 だと障害物をすり抜ける？（blocked の 6 px 刻みを見る）
// 4. 狭い隙間（障害物を 2 つ並べる）を通る道を RRT はなかなか見つけない。なぜ？
