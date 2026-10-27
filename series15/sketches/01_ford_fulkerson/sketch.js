// ============================================
// 01 フォード＝ファルカーソン法
// 「残余ネットワーク」= あとどれだけ流せるか（順向き）と、どれだけ戻せるか（逆向き）の地図
// 残余ネットワークで s から t への道（増加道）を探し、いちばん細いところの量だけ流す。道がなくなったら最大
// スペース = 1 手ずつ / A = 自動 / G = フローと残余ネットワークを切りかえ / 1：お手本 / 2：ランダム / R = 最初から
// ============================================

let nodes = [], edges = [];
let phase = 'find';   // find → augment → … → done
let path = [];        // 増加道：{e, dir}（dir = +1 順向き、-1 逆向き）
let bottleneck = 0;
let showResidual = true;
let auto = false, timer = 0;
let opLog = [];
let reach = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  preset(1);
}

function P(fx, fy) { return { x: width * fx, y: height * fy }; }

function preset(k) {
  if (k === 1) {
    nodes = [{ name: 's', ...P(0.1, 0.55) }, { name: 'a', ...P(0.33, 0.32) }, { name: 'b', ...P(0.33, 0.78) }, { name: 'c', ...P(0.62, 0.32) }, { name: 'd', ...P(0.62, 0.78) }, { name: 't', ...P(0.85, 0.55) }];
    edges = [[0, 1, 10], [0, 2, 12], [1, 2, 3], [1, 3, 9], [1, 4, 4], [2, 4, 11], [4, 3, 5], [3, 5, 15], [4, 5, 9]].map(([u, v, c]) => ({ u, v, c, f: 0 }));
  } else {
    nodes = [{ name: 's', ...P(0.08, 0.55) }];
    let names = 'abcdefgh';
    for (let i = 0; i < 8; i++) nodes.push({ name: names[i], ...P(0.27 + floor(i / 3) * 0.2 + random(-0.03, 0.03), 0.28 + (i % 3) * 0.25 + random(-0.04, 0.04)) });
    nodes.push({ name: 't', ...P(0.88, 0.55) });
    edges = [];
    let add = (u, v) => { if (u !== v && !edges.some((e) => (e.u === u && e.v === v) || (e.u === v && e.v === u))) edges.push({ u, v, c: floor(random(2, 12)), f: 0 }); };
    for (let i = 1; i <= 3; i++) add(0, i);
    for (let i = 6; i <= 8; i++) add(i, 9);
    for (let i = 1; i <= 8; i++) for (let j = i + 1; j <= 8; j++) if (abs(nodes[i].x - nodes[j].x) < width * 0.25 && random() < 0.4) add(nodes[i].x <= nodes[j].x ? i : j, nodes[i].x <= nodes[j].x ? j : i);
  }
  reset();
}

function reset() {
  for (let e of edges) e.f = 0;
  phase = 'find'; path = []; opLog = []; reach = []; auto = false;
}

// 残余容量のある向き（順向き c-f、逆向き f）をすべて並べる
function residualArcs() {
  let arcs = [];
  for (let e of edges) {
    if (e.c - e.f > 0) arcs.push({ e, dir: 1, from: e.u, to: e.v, r: e.c - e.f });
    if (e.f > 0) arcs.push({ e, dir: -1, from: e.v, to: e.u, r: e.f });
  }
  return arcs;
}

// 深さ優先探索で増加道を 1 本探す（フォード＝ファルカーソン法は探し方を決めていない）
function findPathDFS() {
  let arcs = residualArcs();
  let seen = new Array(nodes.length).fill(false);
  let t = nodes.length - 1;
  let stack = [];
  function dfs(v) {
    if (v === t) return true;
    seen[v] = true;
    for (let a of arcs) if (a.from === v && !seen[a.to]) { stack.push(a); if (dfs(a.to)) return true; stack.pop(); }
    return false;
  }
  if (dfs(0)) return stack;
  reach = seen.map((s, i) => s || i === 0);
  return null;
}

function advance() {
  if (phase === 'find') {
    let p = findPathDFS();
    if (!p) { phase = 'done'; auto = false; return; }
    path = p; bottleneck = min(p.map((a) => a.r));
    phase = 'augment';
  } else if (phase === 'augment') {
    for (let a of path) a.e.f += a.dir * bottleneck;
    opLog.push(path.map((a) => nodes[a.from].name).join('→') + '→t　+' + bottleneck);
    if (opLog.length > 9) opLog.shift();
    path = []; phase = 'find';
  }
}

function value() { let v = 0; for (let e of edges) { if (e.u === 0) v += e.f; if (e.v === 0) v -= e.f; } return v; }

function draw() {
  background(230, 40, 10);
  if (auto && ++timer % 40 === 0) advance();
  if (phase === 'done') {
    // 最小カット：s から残余ネットワークでたどれる点（S 側）を塗る
    noStroke();
    for (let i = 0; i < nodes.length; i++) if (reach[i]) { fill(140, 60, 60, 25); circle(nodes[i].x, nodes[i].y, 120); }
  }
  if (showResidual) for (let a of residualArcs()) drawArc(a);
  else for (let e of edges) drawFlowEdge(e);
  for (let a of path) drawArc(a, true);
  for (let i = 0; i < nodes.length; i++) {
    let n = nodes[i];
    noStroke(); fill(i === 0 ? color(140, 70, 85) : i === nodes.length - 1 ? color(20, 75, 95) : color(230, 15, 88));
    circle(n.x, n.y, 50);
    fill(0, 0, 10); textAlign(CENTER, CENTER); textSize(17); text(n.name, n.x, n.y);
  }
  textAlign(LEFT, BASELINE);
  fill(0, 0, 100); textSize(18);
  text('スペース：1 手　A：自動　G：' + (showResidual ? '残余ネットワーク表示中' : 'フロー表示中') + '　1：お手本　2：ランダム　R：最初から', 20, 36);
  textSize(15); fill(0, 0, 65);
  text(showResidual ? '青 = 順向きにあと流せる量（c − f）　橙 = 逆向きに戻せる量（f）。逆向きを使うと「前に流した分を取り消せる」' : '数字 = 流れ / 容量', 20, 62);
  let msg = phase === 'find' ? '次：残余ネットワークで s → t の道を探す（深さ優先）' : phase === 'augment' ? '見つかった増加道（黄）。いちばん細いところ = ' + bottleneck + ' だけ流す' : '増加道がない → 最大フロー！ 緑 = s から行ける点。緑→外 の線が最小カット（全部満杯）';
  textSize(20); fill(45, 80, 100); text(msg, 20, height - 64);
  textSize(26); fill(0, 0, 100); text('フローの値 = ' + value(), 20, height - 26);
  textSize(14); fill(0, 0, 70);
  for (let i = 0; i < opLog.length; i++) text(opLog[i], width - 300, 100 + i * 22);
}

function arrow(x1, y1, x2, y2, off, w, col) {
  let ang = atan2(y2 - y1, x2 - x1);
  let ox = -sin(ang) * off, oy = cos(ang) * off;
  let ax = x1 + cos(ang) * 28 + ox, ay = y1 + sin(ang) * 28 + oy, bx = x2 - cos(ang) * 30 + ox, by = y2 - sin(ang) * 30 + oy;
  stroke(col); strokeWeight(w); line(ax, ay, bx, by);
  noStroke(); fill(col);
  triangle(bx, by, bx - cos(ang - 0.45) * 14, by - sin(ang - 0.45) * 14, bx - cos(ang + 0.45) * 14, by - sin(ang + 0.45) * 14);
  return { mx: (ax + bx) / 2 + ox * 0.9, my: (ay + by) / 2 + oy * 0.9 };
}

function edgeLabel(m, s, col) {
  noStroke(); fill(230, 40, 12, 85); rectMode(CENTER); rect(m.mx, m.my, 14 + s.length * 9, 22, 5); rectMode(CORNER);
  fill(col); textAlign(CENTER, CENTER); textSize(14); text(s, m.mx, m.my);
}

function drawArc(a, hi = false) {
  let A = nodes[a.from], B = nodes[a.to];
  let col = hi ? color(50, 90, 100) : a.dir > 0 ? color(200, 70, 90) : color(25, 80, 95);
  let m = arrow(A.x, A.y, B.x, B.y, 9, hi ? 6 : 1.5 + a.r * 0.35, col);
  if (!hi) edgeLabel(m, '' + a.r, col);
}

function drawFlowEdge(e) {
  let A = nodes[e.u], B = nodes[e.v];
  let full = e.f === e.c;
  let m = arrow(A.x, A.y, B.x, B.y, 0, 2 + e.f * 0.6, full ? color(45, 90, 100) : e.f > 0 ? color(195, 80, 95) : color(230, 15, 40));
  edgeLabel(m, e.f + '/' + e.c, full ? color(45, 90, 100) : color(0, 0, 95));
}

function keyPressed() {
  if (key === ' ') advance();
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'g' || key === 'G') showResidual = !showResidual;
  if (key === '1' || key === '2') preset(int(key));
  if (key === 'r' || key === 'R') reset();
}

// ---------- やってみよう ----------
// 1. G で残余ネットワークとフローを見比べる。逆向きの橙の矢印を使った増加道はどれ？
// 2. お手本の最大フローは 21。最後に緑から外へ出る線の容量を足すと？（最大フロー最小カット定理）
// 3. findPathDFS の探す順番を変えると、道の選び方と回数が変わる（02 で比べる）
