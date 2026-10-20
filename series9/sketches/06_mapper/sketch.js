// ============================================
// 06 Mapper（データの「地図」をつくる）
// 点群を 1 つの値（ここでは x 座標）で輪切りにし、各輪切りの中で近い点をまとめて 1 つの丸にする
// 輪切りを少し重ねると、隣の丸どうしがつながってグラフになる。高次元データの形を見る定番の方法
// マウス左右 = 輪切りの数 / 上下 = 重なり / 1〜3 で形 / クリックで作り直す
// ============================================

let pts = [];
let shape = 1;
let seed = 3;
let intervals = 6, overlap = 0.3;
let mapperNodes = [], mapperEdges = [];
let names = ['', '円', 'Y 字', '8 の字'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  makePoints();
}

function makePoints() {
  randomSeed(seed);
  pts = [];
  let cx = width * 0.28, cy = height / 2 + 30, R = min(width, height) * 0.22;
  for (let i = 0; i < 160; i++) {
    let a = random(TWO_PI), x, y;
    if (shape === 1) { x = cx + cos(a) * R; y = cy + sin(a) * R; }
    else if (shape === 2) { let t = random(); let br = floor(random(3)); let ang = [-HALF_PI, PI * 0.25, PI * 0.75][br]; x = cx + cos(ang) * R * t; y = cy + sin(ang) * R * t; }
    else { x = cx + R * 1.2 * sin(a); y = cy + R * 0.8 * sin(a) * cos(a); }
    pts.push({ x: x + randomGaussian() * 6, y: y + randomGaussian() * 6 });
  }
}

// ★ Mapper
function runMapper() {
  let xs = pts.map((p) => p.x), lo = min(xs), hi = max(xs);
  let w = (hi - lo) / intervals;
  mapperNodes = []; mapperEdges = [];
  for (let k = 0; k < intervals; k++) {
    // 1. 輪切り（重なりあり）
    let a = lo + k * w - w * overlap, b = lo + (k + 1) * w + w * overlap;
    let idx = pts.map((p, i) => i).filter((i) => pts[i].x >= a && pts[i].x <= b);
    // 2. 輪切りの中でクラスタリング（距離 eps 以内はつなぐ：単連結）
    let parent = {};
    for (let i of idx) parent[i] = i;
    let find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
    let eps = 45;
    for (let i of idx) for (let j of idx) if (i < j && dist(pts[i].x, pts[i].y, pts[j].x, pts[j].y) < eps) parent[find(i)] = find(j);
    let groups = {};
    for (let i of idx) { let r = find(i); (groups[r] = groups[r] || []).push(i); }
    // 3. クラスタ = 丸
    for (let g of Object.values(groups)) {
      if (g.length < 2) continue;
      mapperNodes.push({ members: g, k, x: g.reduce((s, i) => s + pts[i].x, 0) / g.length, y: g.reduce((s, i) => s + pts[i].y, 0) / g.length });
    }
  }
  // 4. 点を共有する丸どうしをつなぐ
  for (let i = 0; i < mapperNodes.length; i++) for (let j = i + 1; j < mapperNodes.length; j++) {
    if (mapperNodes[i].members.some((m) => mapperNodes[j].members.includes(m))) mapperEdges.push([i, j]);
  }
}

function draw() {
  background(230, 40, 10);
  intervals = floor(map(mouseX, 0, width, 3, 14, true));
  overlap = map(mouseY, 0, height, 0.6, 0.05, true);
  runMapper();

  // 左：点群と輪切り
  let xs = pts.map((p) => p.x), lo = min(xs), hi = max(xs), w = (hi - lo) / intervals;
  noStroke();
  for (let k = 0; k < intervals; k++) {
    fill((k * 50) % 360, 50, 60, 12);
    rect(lo + k * w - w * overlap, 100, w * (1 + 2 * overlap), height - 140);
  }
  for (let p of pts) { fill(0, 0, 100, 70); circle(p.x, p.y, 5); }

  // 右：Mapper グラフ（輪切りの順に左から並べ、縦はクラスタの位置）
  let gx = width * 0.58, gw = width - gx - 60, gy = 130, gh = height - 200;
  for (let [i, j] of mapperEdges) {
    let a = mapperNodes[i], b = mapperNodes[j];
    stroke(0, 0, 60);
    strokeWeight(2);
    line(gx + (a.k / (intervals - 1)) * gw, map(a.y, 100, height - 40, gy, gy + gh), gx + (b.k / (intervals - 1)) * gw, map(b.y, 100, height - 40, gy, gy + gh));
  }
  for (let nd of mapperNodes) {
    noStroke();
    fill((nd.k * 50) % 360, 70, 100);
    circle(gx + (nd.k / (intervals - 1)) * gw, map(nd.y, 100, height - 40, gy, gy + gh), 14 + sqrt(nd.members.length) * 4);
  }
  // 輪の数（グラフの独立なループ = E − V + 連結成分）
  let parent = mapperNodes.map((_, i) => i);
  let find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  for (let [i, j] of mapperEdges) parent[find(i)] = find(j);
  let comps = new Set(mapperNodes.map((_, i) => find(i))).size;
  let loops = mapperEdges.length - mapperNodes.length + comps;

  fill(0, 0, 100);
  textSize(18);
  text('輪切り ' + intervals + '（左右）　重なり ' + nf(overlap, 1, 2) + '（上下）　形：' + names[shape] + '（1〜3）　丸 ' + mapperNodes.length + '　線 ' + mapperEdges.length + '　グラフの輪 ' + loops, 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('左：x で輪切り（色の帯）。右：各帯の中の塊を丸に、点を共有する丸をつなぐ。円は輪、Y 字は枝分かれ、8 の字は輪 2 つのグラフになる', 20, 68);
}

function keyPressed() { if (key >= '1' && key <= '3') { shape = int(key); makePoints(); } }
function mousePressed() { seed = floor(random(10000)); makePoints(); }

// ---------- やってみよう ----------
// 1. 輪切りを 3 にすると形が壊れ、14 にすると細かすぎて切れる。ちょうどいい数は？
// 2. 重なりを 0.05 にすると線が消える（隣と点を共有しないから）
// 3. 輪切りの基準を x から「中心からの距離」に変えると、円はどんなグラフに？
