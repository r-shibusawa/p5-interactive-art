// ============================================
// 04 ランダムグラフと巨大成分（エルデシュ＝レーニ）
// 点どうしを確率 p でつなぐ。p が小さいとバラバラ、ある値を超えると突然ほとんどがひとつながりに
// マウス左右 = p / 色 = つながっている仲間（連結成分） / R で配置をやり直す
// ============================================

let n = 80;
let nodes = [], edges = [];
let p = 0.02;
let comp = []; // 各点の成分番号
let seed = 1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  layout();
}

function layout() {
  nodes = [];
  for (let i = 0; i < n; i++) {
    let a = (TWO_PI * i) / n;
    nodes.push({ x: width / 2 + cos(a) * min(width, height) * 0.38, y: height / 2 + 30 + sin(a) * min(width, height) * 0.38 });
  }
}

function build() {
  randomSeed(seed);
  edges = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (random() < p) edges.push([i, j]); // ★ 確率 p でつなぐ
  // ★ 連結成分：union-find
  let parent = [];
  for (let i = 0; i < n; i++) parent.push(i);
  let find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  for (let [a, b] of edges) parent[find(a)] = find(b);
  let ids = {}, k = 0;
  comp = [];
  for (let i = 0; i < n; i++) {
    let r = find(i);
    if (ids[r] === undefined) ids[r] = k++;
    comp.push(ids[r]);
  }
}

function draw() {
  background(220, 40, 10);
  p = map(mouseX, 0, width, 0, 0.06, true);
  build();

  // 成分の大きさ
  let sizes = {};
  for (let c of comp) sizes[c] = (sizes[c] || 0) + 1;
  let biggest = max(...Object.values(sizes));
  let bigId = Object.keys(sizes).find((k) => sizes[k] === biggest);

  for (let [a, b] of edges) {
    let inBig = comp[a] == bigId;
    stroke(inBig ? 45 : 200, inBig ? 90 : 40, inBig ? 90 : 50, 60);
    strokeWeight(inBig ? 1.5 : 1);
    line(nodes[a].x, nodes[a].y, nodes[b].x, nodes[b].y);
  }
  for (let i = 0; i < n; i++) {
    noStroke();
    let inBig = comp[i] == bigId;
    fill(inBig ? 45 : (comp[i] * 47) % 360, inBig ? 90 : 50, inBig ? 100 : 60);
    circle(nodes[i].x, nodes[i].y, inBig ? 14 : 10);
  }

  // 右上：巨大成分の割合
  let avgDeg = (2 * edges.length) / n;
  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text('p = ' + nf(p, 1, 3) + '（マウス左右）　エッジ ' + edges.length + '　平均次数 ' + nf(avgDeg, 1, 2) + '　成分の数 ' + Object.keys(sizes).length + '　最大の成分 ' + biggest + ' / ' + n, 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('理論：平均次数が 1 を超えると「巨大成分」が現れる（相転移）。黄 = 最大の成分。p = 1/n ≈ ' + nf(1 / n, 1, 3) + ' が境目', 20, 68);
  // メーター
  fill(0, 0, 20);
  rect(width - 260, 90, 220, 16, 8);
  fill(45, 90, 100);
  rect(width - 260, 90, (220 * biggest) / n, 16, 8);
  fill(0, 0, 70);
  textSize(13);
  text('最大成分の割合', width - 260, 124);
}

function keyPressed() {
  if (key === 'r' || key === 'R') seed = floor(random(10000));
}

// ---------- やってみよう ----------
// 1. p を 0 からゆっくり上げて、黄色が「突然」増える瞬間を見つける（平均次数 ≈ 1）
// 2. n を 200 にすると境目の p は変わる？（1/n になる）
// 3. 伝染病や噂は、平均次数が 1 を超えると大流行する。同じ現象
