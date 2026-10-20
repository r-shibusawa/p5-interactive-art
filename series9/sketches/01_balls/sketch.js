// ============================================
// 01 点を太らせる（半径 r の円）
// 各点のまわりに半径 r の円を置く。r を大きくすると円が重なり、
// 「いくつの塊か」「穴はあるか」が、r によって変わっていく
// マウス左右 = 半径 r / 1〜3 で形 / クリックで作り直す
// ============================================

let pts = [];
let r = 20;
let shape = 1;
let seed = 1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  makePoints();
}

function makePoints() {
  randomSeed(seed);
  pts = [];
  let cx = width / 2, cy = height / 2 + 30, R = min(width, height) * 0.25;
  for (let i = 0; i < 40; i++) {
    let a = random(TWO_PI), x, y;
    if (shape === 1) { x = cx + cos(a) * R; y = cy + sin(a) * R; }
    else if (shape === 2) { let s = random() < 0.5 ? -1 : 1; x = cx + s * R * 1.1 + cos(a) * R * 0.6; y = cy + sin(a) * R * 0.6; }
    else { let rr = R * sqrt(random()); x = cx + cos(a) * rr; y = cy + sin(a) * rr; }
    pts.push({ x: x + randomGaussian() * 8, y: y + randomGaussian() * 8 });
  }
}

// ★ 塊の数：円が重なる（距離 < 2r）点どうしを同じグループに（union-find）
function countComponents() {
  let parent = pts.map((_, i) => i);
  let find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
    if (dist(pts[i].x, pts[i].y, pts[j].x, pts[j].y) < 2 * r) parent[find(i)] = find(j);
  }
  let ids = new Set(pts.map((_, i) => find(i)));
  return { count: ids.size, group: pts.map((_, i) => find(i)) };
}

function draw() {
  background(230, 40, 10);
  r = map(mouseX, 0, width, 2, 160, true);
  let { count, group } = countComponents();
  let ids = [...new Set(group)];

  // 円（塊ごとに色）
  noStroke();
  for (let i = 0; i < pts.length; i++) {
    fill((ids.indexOf(group[i]) * 53) % 360, 60, 80, 35);
    circle(pts[i].x, pts[i].y, r * 2);
  }
  for (let p of pts) {
    fill(0, 0, 100);
    circle(p.x, p.y, 7);
  }

  fill(0, 0, 100);
  textSize(18);
  text('半径 r = ' + round(r) + '（マウス左右）　塊の数 = ' + count + '　1：円　2：2 つの円　3：塊　クリックで作り直す', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('r が小さい：全部バラバラ（塊 40）→ r を大きくすると合体 → さらに大きくすると穴が埋まる。「どの r で何が起きるか」を記録するのが TDA', 20, 68);
}

function keyPressed() { if (key >= '1' && key <= '3') { shape = int(key); makePoints(); } }
function mousePressed() { seed = floor(random(10000)); makePoints(); }

// ---------- やってみよう ----------
// 1. 塊の数が 1 になる r を見つけよう。形 1 と形 3 でちがう？
// 2. 円（1）で、穴が「できて → 消える」r の範囲を目で読み取ろう（02 以降で計算する）
// 3. 円の数が 2 つから 1 つになる r は、2 つの円の「すきま」の半分
