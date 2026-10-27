// ============================================
// 03 根つき木の表し方
// 子の数が決まっていない木でも、各節点に「いちばん左の子」と「すぐ右の兄弟」の 2 本の矢印だけで表せる
// （左子・右兄弟表現 left-child, right-sibling）。左が普通の絵、右が同じ木を 2 本の矢印で描いたもの
// 操作：左の木の節点をクリック = 子を追加 / スペース = ランダムな木 / 1 = 二分木 / 2 = 子が何個でもよい木 / R = 小さな木
// ============================================

let maxChildren = 4;  // ★ ランダムな木の子の数の最大
let maxNodes = 22;    // ★ 節点の数の上限

let rootT, nextId = 0, hoverId = -1, mode = 2;
let msg = '左の木の節点をクリックすると子が増える';

function setup() {
  createCanvas(windowWidth, windowHeight);
  smallTree();
}

function newNode() { return { id: nextId++, children: [] }; }
function smallTree() {
  nextId = 0; rootT = newNode();
  let a = newNode(), b = newNode(), c = newNode();
  rootT.children.push(a, b, c);
  a.children.push(newNode(), newNode());
  c.children.push(newNode());
}
function randomTree(maxK) {
  nextId = 0; rootT = newNode();
  let q = [rootT];
  while (q.length && nextId < maxNodes - maxK) {
    let x = q.shift();
    let k = floor(random(x === rootT ? 2 : 0, maxK + 1));
    for (let i = 0; i < k && nextId < maxNodes; i++) { let c = newNode(); x.children.push(c); q.push(c); }
  }
}
function countAll(x) { return 1 + x.children.reduce((s, c) => s + countAll(c), 0); }

// 普通の木の位置：葉を左から順に並べ、親は子の真ん中
function layoutGeneral(x, d, ctr, out) {
  if (x.children.length === 0) { out[x.id] = { x: ctr.v++, d }; return out[x.id].x; }
  let xs = x.children.map((c) => layoutGeneral(c, d + 1, ctr, out));
  out[x.id] = { x: (xs[0] + xs[xs.length - 1]) / 2, d };
  return out[x.id].x;
}
// 左子・右兄弟の二分木：left = 最初の子、right = 次の兄弟。中間順で横位置を決める
function toLCRS(x, sib) {
  return { id: x.id, left: x.children.length ? toLCRS(x.children[0], x.children.slice(1)) : null,
           right: sib && sib.length ? toLCRS(sib[0], sib.slice(1)) : null };
}
function layoutBinary(b, d, ctr, out) {
  if (!b) return;
  layoutBinary(b.left, d + 1, ctr, out);
  out[b.id] = { x: ctr.v++, d };
  layoutBinary(b.right, d + 1, ctr, out);
}

function draw() {
  background(20, 22, 26);
  noStroke(); fill(240); textAlign(LEFT, TOP); textSize(26);
  text('根つき木の表し方：左子・右兄弟表現', 30, 24);
  fill(160, 170, 190); textSize(15);
  text('左の節点をクリック = 子を追加　スペース = ランダム　1 = 二分木　2 = 子が何個でもよい木　R = 小さな木', 30, 60);

  let gen = {}, ctr = { v: 0 };
  layoutGeneral(rootT, 0, ctr, gen);
  let leaves = ctr.v;
  let bin = {}, ctr2 = { v: 0 }, lc = toLCRS(rootT, null);
  layoutBinary(lc, 0, ctr2, bin);
  let n = ctr2.v;
  let maxDg = max(Object.values(gen).map((p) => p.d)), maxDb = max(Object.values(bin).map((p) => p.d));

  let half = width / 2, top0 = 150;
  let P = (p) => ({ x: 30 + ((p.x + 0.5) / max(1, leaves)) * (half - 60), y: top0 + p.d * min(80, (height - 260) / (maxDg + 1)) });
  let Q = (p) => ({ x: half + 30 + ((p.x + 0.5) / n) * (half - 60), y: top0 + p.d * min(60, (height - 260) / (maxDb + 1)) });

  // ホバー判定（左の木）
  hoverId = -1;
  for (let id in gen) { let p = P(gen[id]); if (dist(mouseX, mouseY, p.x, p.y) < 18) hoverId = +id; }
  for (let id in bin) { let p = Q(bin[id]); if (dist(mouseX, mouseY, p.x, p.y) < 18) hoverId = +id; }

  // 左：普通の木
  fill(200); textSize(18); textAlign(CENTER, TOP);
  text(mode === 1 ? '二分木（子は left / right の 2 つまで）' : '子が何個でもよい木', half / 2, 105);
  (function edges(x) { for (let c of x.children) { let a = P(gen[x.id]), b = P(gen[c.id]); stroke(110, 120, 150); strokeWeight(2); line(a.x, a.y, b.x, b.y); edges(c); } })(rootT);
  for (let id in gen) drawNode(P(gen[id]), +id);

  // 右：左子・右兄弟
  fill(200); noStroke(); textSize(18); textAlign(CENTER, TOP);
  text('同じ木を「左の子」と「右の兄弟」の 2 本で', half + half / 2, 105);
  (function e2(b) {
    if (!b) return;
    let a = Q(bin[b.id]);
    if (b.left) { let c = Q(bin[b.left.id]); arrowL(a, c, color(120, 210, 255)); e2(b.left); }
    if (b.right) { let c = Q(bin[b.right.id]); arrowL(a, c, color(255, 170, 110)); e2(b.right); }
  })(lc);
  for (let id in bin) drawNode(Q(bin[id]), +id);

  stroke(50); line(half, 100, half, height - 110);
  noStroke(); textAlign(LEFT, TOP); textSize(15);
  fill(120, 210, 255); text('青 = left-child（いちばん左の子）', half + 30, height - 100);
  fill(255, 170, 110); text('橙 = right-sibling（すぐ右の兄弟）', half + 30, height - 76);
  fill(255, 225, 140); textSize(18);
  text(msg + `　（節点 ${countAll(rootT)} 個：どちらの表し方でも矢印は 2 本ずつ → O(n) のメモリ）`, 30, height - 46);
}

function drawNode(p, id) {
  let h = id === hoverId;
  stroke(h ? color(255, 214, 90) : color(200)); strokeWeight(h ? 4 : 1.5);
  fill(id === 0 ? color(150, 90, 200) : color(50, 130, 120));
  circle(p.x, p.y, 30);
  noStroke(); fill(255); textAlign(CENTER, CENTER); textSize(13);
  text(id, p.x, p.y);
}
function arrowL(a, b, c) {
  stroke(c); strokeWeight(2);
  let ang = atan2(b.y - a.y, b.x - a.x);
  let ex = b.x - cos(ang) * 16, ey = b.y - sin(ang) * 16;
  line(a.x, a.y, ex, ey);
  noStroke(); fill(c);
  triangle(ex, ey, ex - cos(ang - 0.4) * 9, ey - sin(ang - 0.4) * 9, ex - cos(ang + 0.4) * 9, ey - sin(ang + 0.4) * 9);
}
function findNode(x, id) { if (x.id === id) return x; for (let c of x.children) { let r = findNode(c, id); if (r) return r; } return null; }

function mousePressed() {
  if (hoverId < 0) return;
  if (countAll(rootT) >= maxNodes) { msg = 'これ以上は増やせません'; return; }
  let x = findNode(rootT, hoverId);
  if (mode === 1 && x.children.length >= 2) { msg = '二分木なので子は 2 つまで'; return; }
  x.children.push(newNode());
  msg = `節点 ${x.id} に子を追加：右では「最後の子の右兄弟」としてつながる`;
}
function keyPressed() {
  let k = key.toLowerCase();
  if (key === ' ') { randomTree(mode === 1 ? 2 : maxChildren); msg = 'ランダムな木'; }
  if (key === '1') { mode = 1; randomTree(2); msg = '二分木：左右の子を区別する（p, left, right の 3 本）'; }
  if (key === '2') { mode = 2; randomTree(maxChildren); msg = '子の数が決まっていない木'; }
  if (k === 'r') { smallTree(); msg = '小さな木'; }
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. 根に子を 6 個つける。左は横に広がるが、右は「橙の矢印が 1 列に並ぶ」だけ
// 2. 右の図で、ある節点の子を全部たどるには？（青で 1 回下りて、橙で右へ進み続ける）
// 3. 二分木の配列表現（ヒープ）：節点 i の子は 2i, 2i+1。シリーズ10 のヒープソートとくらべよう
