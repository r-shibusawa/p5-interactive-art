// ============================================
// 02 エドモンズ＝カープ法と最小カット
// 道の「選び方」で回数が大違い。左：運の悪い選び方（真ん中の細い線を毎回通る）→ 2C 回
// 右：幅優先探索で「いちばん短い道」を選ぶ（エドモンズ＝カープ法）→ 2 回。どんな地図でも O(VE²) 回で終わる
// スペース = 再生・停止 / 上下 = 容量 C を変える / R = 最初から
// 終わると右に最小カット（s 側と t 側を分ける線）が出る。カットの容量 = 最大フロー
// ============================================

let Cs = [10, 100, 1000, 10000];
let ci = 1;
let left, right;
let playing = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  reset();
}

function makeNet(cx) {
  let C = Cs[ci];
  let w = width * 0.2, h = height * 0.22, cy = height * 0.5;
  let nodes = [{ name: 's', x: cx - w, y: cy }, { name: 'a', x: cx, y: cy - h }, { name: 'b', x: cx, y: cy + h }, { name: 't', x: cx + w, y: cy }];
  let edges = [[0, 1, C], [0, 2, C], [1, 2, 1], [1, 3, C], [2, 3, C]].map(([u, v, c]) => ({ u, v, c, f: 0 }));
  return { nodes, edges, iters: 0, done: false, last: [], reach: null };
}

function reset() {
  left = makeNet(width * 0.27); left.bad = true;
  right = makeNet(width * 0.73);
  playing = false;
}

function arcs(net) {
  let out = [];
  for (let e of net.edges) {
    if (e.c - e.f > 0) out.push({ e, dir: 1, from: e.u, to: e.v, r: e.c - e.f });
    if (e.f > 0) out.push({ e, dir: -1, from: e.v, to: e.u, r: e.f });
  }
  return out;
}

// 幅優先探索：辺の数がいちばん少ない増加道
function bfsPath(net) {
  let A = arcs(net), prev = [null, null, null, null], seen = [true, false, false, false], q = [0];
  while (q.length) {
    let v = q.shift();
    for (let a of A) if (a.from === v && !seen[a.to]) { seen[a.to] = true; prev[a.to] = a; q.push(a.to); }
  }
  net.reach = seen;
  if (!seen[3]) return null;
  let p = [], v = 3;
  while (v !== 0) { p.unshift(prev[v]); v = prev[v].from; }
  return p;
}

// 運の悪い選び方：真ん中の線（a→b か、その逆向き）を必ず使う道を選ぶ
function badPath(net) {
  let A = arcs(net);
  let find = (seq) => {
    let p = [];
    for (let k = 0; k < seq.length - 1; k++) { let a = A.find((x) => x.from === seq[k] && x.to === seq[k + 1]); if (!a) return null; p.push(a); }
    return p;
  };
  return find([0, 1, 2, 3]) || find([0, 2, 1, 3]) || bfsPath(net);
}

function augmentOnce(net) {
  if (net.done) return;
  let p = net.bad ? badPath(net) : bfsPath(net);
  if (!p) { net.done = true; bfsPath(net); return; }
  let b = min(p.map((a) => a.r));
  for (let a of p) a.e.f += a.dir * b;
  net.iters++; net.last = p;
}

function value(net) { return net.edges[0].f + net.edges[1].f; }

function draw() {
  background(240, 35, 9);
  if (playing) {
    // 運の悪い方は回数が多いので、1 フレームに何回か進める
    let k = max(1, floor(Cs[ci] / 200));
    if (frameCount % 20 === 0) augmentOnce(right);
    for (let i = 0; i < k; i++) augmentOnce(left);
    if (left.done && right.done) playing = false;
  }
  stroke(0, 0, 30); line(width / 2, 90, width / 2, height - 20);
  drawNet(left, '運の悪い増加道の選び方（深さ優先で真ん中を通る）', color(0, 70, 95));
  drawNet(right, 'エドモンズ＝カープ法（幅優先 = 最短の道）', color(160, 70, 90));
  fill(0, 0, 100); noStroke(); textSize(18); textAlign(LEFT, BASELINE);
  text('スペース：' + (playing ? '停止' : '再生') + '　上下：容量 C = ' + Cs[ci] + '　R：最初から', 20, 36);
  textSize(15); fill(0, 0, 65);
  text('真ん中の線の容量は 1 だけ。それを行ったり来たりすると、1 回に 1 しか増えない', 20, 62);
}

function drawNet(net, title, col) {
  if (net.done && net.reach) {
    // 最小カット：s 側（残余ネットワークで s から行ける点）を緑の雲で囲む
    noStroke();
    for (let i = 0; i < 4; i++) if (net.reach[i]) { fill(140, 60, 60, 25); circle(net.nodes[i].x, net.nodes[i].y, 130); }
  }
  for (let e of net.edges) {
    let A = net.nodes[e.u], B = net.nodes[e.v];
    let onPath = net.last.some((a) => a.e === e) && !net.done;
    let cut = net.done && net.reach && net.reach[e.u] && !net.reach[e.v];
    let ang = atan2(B.y - A.y, B.x - A.x);
    let ax = A.x + cos(ang) * 28, ay = A.y + sin(ang) * 28, bx = B.x - cos(ang) * 30, by = B.y - sin(ang) * 30;
    stroke(240, 15, 30); strokeWeight(e.c === 1 ? 3 : 14); line(ax, ay, bx, by);
    let r = e.f / e.c;
    stroke(cut ? color(45, 90, 100) : onPath ? color(50, 90, 100) : color(195, 80, 95)); strokeWeight(e.c === 1 ? 3 : 2 + 12 * r);
    if (e.f > 0 || cut) line(ax, ay, cut ? bx : lerp(ax, bx, max(r, 0.02)), cut ? by : lerp(ay, by, max(r, 0.02)));
    noStroke(); fill(0, 0, 85);
    triangle(bx, by, bx - cos(ang - 0.45) * 14, by - sin(ang - 0.45) * 14, bx - cos(ang + 0.45) * 14, by - sin(ang + 0.45) * 14);
    let mx = (ax + bx) / 2 - sin(ang) * 20, my = (ay + by) / 2 + cos(ang) * 20;
    fill(cut ? color(45, 90, 100) : color(0, 0, 95)); textAlign(CENTER, CENTER); textSize(14);
    text(e.f + '/' + e.c, mx, my);
  }
  for (let n of net.nodes) {
    noStroke(); fill(n.name === 's' ? color(140, 70, 85) : n.name === 't' ? color(20, 75, 95) : color(240, 15, 88));
    circle(n.x, n.y, 50); fill(0, 0, 10); textSize(18); text(n.name, n.x, n.y);
  }
  let cx = net.nodes[1].x;
  textAlign(CENTER, BASELINE);
  fill(col); textSize(18); text(title, cx, 120);
  fill(0, 0, 100); textSize(40); text(net.iters + ' 回', cx, height - 110);
  textSize(18); fill(0, 0, 80);
  text('フローの値 ' + value(net) + (net.done ? '　（最大 = 2C = ' + 2 * Cs[ci] + '）' : ''), cx, height - 76);
  if (net.done) { fill(45, 90, 100); text('黄 = 最小カットの線。容量の合計 ' + 2 * Cs[ci] + ' = 最大フロー', cx, height - 46); }
  textAlign(LEFT, BASELINE);
}

function keyPressed() {
  if (key === ' ') playing = !playing;
  if (key === UP_ARROW) { ci = min(Cs.length - 1, ci + 1); reset(); }
  if (key === DOWN_ARROW) { ci = max(0, ci - 1); reset(); }
  if (key === 'r' || key === 'R') reset();
}

// ---------- やってみよう ----------
// 1. C を 10000 にする。左は 20000 回、右は 2 回。容量が無理数だと左は終わらないことさえある
// 2. 最小カットの線（黄）の容量を足すと、最大フローと必ず同じになる（最大フロー最小カット定理）
// 3. 真ん中の線の容量を 1 から C に変えると、左の回数はどうなる？
