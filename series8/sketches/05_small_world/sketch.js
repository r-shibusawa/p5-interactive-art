// ============================================
// 05 スモールワールド（6 次の隔たり）
// 隣としかつながっていない輪は「遠い」。少しだけランダムにつなぎかえると、
// 世界が一気に小さくなる（平均の距離が急に減る）のに、ご近所づきあい（クラスタ）は残る
// マウス左右 = つなぎかえ確率 β / 点をクリック = その点からの距離を色で表示
// ============================================

let n = 60, k = 4; // 点の数、各点が隣とつなぐ数
let edges = [], adj = [];
let beta = 0;
let source = 0;
let distFrom = [];
let seed = 3;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

// ★ ワッツ＝ストロガッツ：輪をつくって、各エッジを確率 β でランダムにつなぎかえる
function build() {
  randomSeed(seed);
  edges = []; adj = [];
  for (let i = 0; i < n; i++) adj.push([]);
  for (let i = 0; i < n; i++) for (let j = 1; j <= k / 2; j++) {
    let a = i, b = (i + j) % n;
    if (random() < beta) {
      let tries = 0;
      do { b = floor(random(n)); tries++; } while ((b === a || adj[a].includes(b)) && tries < 50);
    }
    if (!adj[a].includes(b) && a !== b) { edges.push([a, b]); adj[a].push(b); adj[b].push(a); }
  }
  // 距離（BFS）
  distFrom = new Array(n).fill(-1);
  let q = [source]; distFrom[source] = 0;
  while (q.length) { let c = q.shift(); for (let nb of adj[c]) if (distFrom[nb] < 0) { distFrom[nb] = distFrom[c] + 1; q.push(nb); } }
}

// クラスタ係数：自分の友だちどうしが友だちである割合
function clustering() {
  let total = 0;
  for (let i = 0; i < n; i++) {
    let nb = adj[i];
    if (nb.length < 2) continue;
    let links = 0;
    for (let a = 0; a < nb.length; a++) for (let b = a + 1; b < nb.length; b++) if (adj[nb[a]].includes(nb[b])) links++;
    total += links / ((nb.length * (nb.length - 1)) / 2);
  }
  return total / n;
}

function draw() {
  background(220, 40, 10);
  beta = map(mouseX, 0, width, 0, 1, true);
  build();
  let cx = width * 0.4, cy = height * 0.55, r = min(width, height) * 0.36;
  let pos = (i) => [cx + cos((TWO_PI * i) / n - HALF_PI) * r, cy + sin((TWO_PI * i) / n - HALF_PI) * r];

  for (let [a, b] of edges) {
    let [ax, ay] = pos(a), [bx, by] = pos(b);
    let far = abs(a - b) > k && abs(a - b) < n - k;
    stroke(far ? 45 : 200, far ? 90 : 40, far ? 100 : 60, far ? 80 : 50);
    strokeWeight(far ? 1.5 : 1);
    line(ax, ay, bx, by);
  }
  let maxD = max(...distFrom);
  for (let i = 0; i < n; i++) {
    let [x, y] = pos(i);
    noStroke();
    fill(distFrom[i] < 0 ? 0 : map(distFrom[i], 0, max(maxD, 1), 120, 0), 80, 100);
    circle(x, y, i === source ? 22 : 12);
  }

  // 統計
  let reach = distFrom.filter((d) => d >= 0);
  let avg = reach.reduce((a, b) => a + b, 0) / reach.length;
  let rx = width * 0.75;
  noStroke();
  fill(0, 0, 100);
  textSize(22);
  text('β = ' + nf(beta, 1, 2), rx, height * 0.3);
  textSize(18);
  text('平均の距離 ' + nf(avg, 1, 2) + ' 歩', rx, height * 0.3 + 44);
  text('最大の距離 ' + maxD + ' 歩', rx, height * 0.3 + 76);
  text('クラスタ係数 ' + nf(clustering(), 1, 2), rx, height * 0.3 + 108);
  fill(0, 0, 60);
  textSize(15);
  text('β = 0：輪（遠い・クラスタ高）\nβ 小：近道が少し（近い・クラスタ高）← スモールワールド\nβ = 1：ランダム（近い・クラスタ低）', rx, height * 0.3 + 160);

  fill(0, 0, 100);
  textSize(18);
  text('マウス左右 = つなぎかえ確率 β　点をクリック = そこからの距離を色で（緑 = 近い、赤 = 遠い）　黄の線 = 近道', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('β をほんの少し（0.05）上げるだけで平均距離が激減。地球上の誰とでも 6 人でつながる「6 次の隔たり」のしくみ', 20, 68);
}

function mousePressed() {
  let cx = width * 0.4, cy = height * 0.55, r = min(width, height) * 0.36;
  for (let i = 0; i < n; i++) {
    let x = cx + cos((TWO_PI * i) / n - HALF_PI) * r, y = cy + sin((TWO_PI * i) / n - HALF_PI) * r;
    if (dist(mouseX, mouseY, x, y) < 14) source = i;
  }
}
function keyPressed() {
  if (key === 'r' || key === 'R') seed = floor(random(10000));
}

// ---------- やってみよう ----------
// 1. β = 0 → 0.05 → 0.2 → 1 で、平均距離とクラスタ係数の変わり方を比べる
// 2. n を 200 にすると、β = 0 の平均距離は？（n / (2k) くらい）
// 3. 近道が 1 本あるだけで、どれだけ距離が縮むか
