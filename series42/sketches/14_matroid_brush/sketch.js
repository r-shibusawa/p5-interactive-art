// ============================================
// 14 全域木ブラシ
// ドラッグで点を撒くと、近い点どうしの「最小全域木（森）」がリアルタイムに伸びていく成長アート
//   点を足すたびにクラスカル法（06）をやり直す：軽い辺から順に、閉路ができなければ採用
//   新しく採用された辺はにゅっと伸びて現れ、不要になった辺は消える。色は辺の長さ（重み）
// ドラッグ = 点を撒く / ↑↓ = つなぐ半径 / M = 最小 ⇄ 最大全域木 / P = 点の表示 / C = クリア / S = 保存
// ============================================

let pts = [];                        // {x, y}
let cand = [];                       // 候補の辺 {a, b, w}
let tree = {};                       // 採用中の辺  key "a-b" → {a, b, w, born}
let radius = 90;                     // ★ この距離より近い点どうしだけ辺の候補にする
let kNear = 6;                       // ★ 1 点あたりの候補の本数
let spacing = 9;                     // ★ 点と点の最小間隔（ドラッグ中）
let maxPts = 900;                    // ★ 点の上限
let maximum = false;                 // true = 最大全域木
let showPts = true;
let grow = 18;                       // ★ 辺が伸びきるまでのフレーム数

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  textFont('sans-serif');
  strokeCap(ROUND);
}

// ★ 点を 1 つ足す：近い点への辺を候補に加えて、木を作り直す
function addPoint(x, y) {
  if (pts.length >= maxPts) return;
  for (let p of pts) if (dist(x, y, p.x, p.y) < spacing) return;
  let i = pts.length;
  pts.push({ x, y });
  let near = [];
  for (let j = 0; j < i; j++) { let d = dist(x, y, pts[j].x, pts[j].y); if (d < radius) near.push({ a: j, b: i, w: d }); }
  near.sort((p, q) => p.w - q.w);
  for (let e of near.slice(0, kNear)) cand.push(e);
  rebuild();
}
function rebuild() {
  let order = cand.slice().sort((p, q) => maximum ? q.w - p.w : p.w - q.w);
  let uf = makeUF(pts.length), next = {};
  for (let e of order) {
    if (uf.union(e.a, e.b)) { let k = e.a + '-' + e.b; next[k] = tree[k] || { a: e.a, b: e.b, w: e.w, born: frameCount }; }
  }
  tree = next;
}

function draw() {
  background(260, 35, 7);
  if (mouseIsPressed && mouseY > 90) addPoint(mouseX + random(-4, 4), mouseY + random(-4, 4));

  for (let k in tree) {
    let e = tree[k], p = pts[e.a], q = pts[e.b];
    let t = constrain((frameCount - e.born) / grow, 0, 1);
    t = 1 - (1 - t) * (1 - t);   // ゆっくり止まる
    let hue = (map(e.w, 0, radius, 300, 120) + 360) % 360;
    stroke(hue, 70, 100, 90); strokeWeight(map(e.w, 0, radius, 4, 1.2));
    line(p.x, p.y, lerp(p.x, q.x, t), lerp(p.y, q.y, t));
  }
  if (showPts) { noStroke(); fill(0, 0, 100, 70); for (let p of pts) circle(p.x, p.y, 3); }

  textAlign(LEFT, BASELINE);
  noStroke(); fill(0, 0, 100); textSize(18);
  text('ドラッグ：点を撒く　↑↓：半径 ' + radius + '　M：' + (maximum ? '最大' : '最小') + '全域木　P：点 ' + (showPts ? 'ON' : 'off') + '　C：クリア　S：保存', 20, 40);
  fill(0, 0, 60); textSize(15);
  let comps = pts.length - Object.keys(tree).length;
  text('点 ' + pts.length + ' / ' + maxPts + '　辺 ' + Object.keys(tree).length + '　木の数 ' + comps + '　（辺の数 = 点の数 − 木の数：階数）' + (pts.length >= maxPts ? '　上限！ C でクリア' : ''), 20, 66);
}

function keyPressed() {
  if (key === UP_ARROW) { radius = min(300, radius + 15); recand(); }
  if (key === DOWN_ARROW) { radius = max(20, radius - 15); recand(); }
  if (key === 'm' || key === 'M') { maximum = !maximum; tree = {}; rebuild(); }
  if (key === 'p' || key === 'P') showPts = !showPts;
  if (key === 'c' || key === 'C') { pts = []; cand = []; tree = {}; }
  if (key === 's' || key === 'S') saveCanvas('matroid_brush', 'png');
}
// 半径を変えたら候補の辺を全部作り直す
function recand() {
  cand = [];
  for (let i = 0; i < pts.length; i++) {
    let near = [];
    for (let j = 0; j < i; j++) { let d = dist(pts[i].x, pts[i].y, pts[j].x, pts[j].y); if (d < radius) near.push({ a: j, b: i, w: d }); }
    near.sort((p, q) => p.w - q.w);
    for (let e of near.slice(0, kNear)) cand.push(e);
  }
  rebuild();
}

// ---------- やってみよう ----------
// 1. ゆっくり 1 本の線を描く → 木は線になる。ぐるっと輪を描く → 閉路はできない（どこか 1 か所が切れる）
// 2. M で最大全域木にする。同じ点なのに全然ちがう形になる。どちらも「基」だが重みがちがう
// 3. 色を「辺の長さ」でなく「描いた順」や「木の番号（union–find の根）」にしてみよう
// 4. 点を消すブラシを作る（右クリックで近くの点を削除 → cand から外して rebuild）。木はどう変わる？

// ==================================================
// ここから下は「マトロイドの道具」（union–find）
// ==================================================
function makeUF(n) {
  let parent = [...Array(n).keys()];
  let find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  let union = (a, b) => { a = find(a); b = find(b); if (a === b) return false; parent[a] = b; return true; };
  return { find, union };
}
