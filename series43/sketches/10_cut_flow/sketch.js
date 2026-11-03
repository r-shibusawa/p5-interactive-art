// ============================================
// 10 最大流 = 最小カット
// 水源 s から出口 t へ流せる最大の量（最大流）は、s と t を切り離すのに切るパイプの容量の最小（最小カット）に等しい
//   Ford–Fulkerson：残余グラフで s→t の道（増加路）を見つけては流す。道がなくなったら終わり
//   そのとき s から残余グラフで届く頂点の集合 S が最小カット。これは LP 双対の有名な例
// スペース = 1 ステップ（道を探す → 流す） / A = 自動 / 辺の数字をドラッグ上下 = 容量 / R = 流れをリセット
// ============================================

let nodes = [], edges = [];
let flowTotal = 0;
let path = null;            // いま光っている増加路 [{e, dir}]
let done = false, cutS = null;
let auto = false, dragE = -1, dragY0 = 0, dragC0 = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  build();
}
function build() {
  let cx = width / 2, cy = height / 2 + 20, W = Math.min(width * 0.38, 480), H = Math.min(height * 0.3, 230);
  nodes = [{ n: 's', x: cx - W, y: cy }, { n: 'a', x: cx - W / 3, y: cy - H }, { n: 'b', x: cx - W / 3, y: cy + H },
           { n: 'c', x: cx + W / 3, y: cy - H }, { n: 'd', x: cx + W / 3, y: cy + H }, { n: 't', x: cx + W, y: cy }];
  // ★ 辺と容量 [from, to, 容量]
  edges = [[0, 1, 7], [0, 2, 5], [1, 2, 3], [1, 3, 6], [2, 4, 8], [3, 2, 2], [3, 5, 5], [4, 3, 4], [4, 5, 7]].map(([u, v, c]) => ({ u, v, c, f: 0 }));
  resetFlow();
}
function resetFlow() { for (let e of edges) e.f = 0; flowTotal = 0; path = null; done = false; cutS = null; }

// ★ 残余グラフで BFS：s から t への道を探す（順方向は残り容量、逆方向は流れている分だけ戻せる）
function findPath() {
  let prev = new Array(nodes.length).fill(null), seen = [true, ...new Array(nodes.length - 1).fill(false)], q = [0];
  while (q.length) {
    let u = q.shift();
    for (let i = 0; i < edges.length; i++) {
      let e = edges[i];
      if (e.u === u && e.c - e.f > 0 && !seen[e.v]) { seen[e.v] = true; prev[e.v] = { e: i, dir: 1 }; q.push(e.v); }
      if (e.v === u && e.f > 0 && !seen[e.u]) { seen[e.u] = true; prev[e.u] = { e: i, dir: -1 }; q.push(e.u); }
    }
  }
  if (!seen[nodes.length - 1]) return { path: null, seen };
  let p = [], v = nodes.length - 1;
  while (v !== 0) { let s = prev[v]; p.push(s); v = s.dir === 1 ? edges[s.e].u : edges[s.e].v; }
  return { path: p.reverse(), seen };
}
function stepOnce() {
  if (done) return;
  if (!path) {
    let r = findPath();
    if (!r.path) { done = true; cutS = r.seen; auto = false; return; }
    path = r.path;
  } else {
    let delta = Math.min(...path.map((s) => (s.dir === 1 ? edges[s.e].c - edges[s.e].f : edges[s.e].f)));
    for (let s of path) edges[s.e].f += s.dir * delta;
    flowTotal += delta; path = null;
  }
}

function draw() {
  background(250, 40, 10);
  if (auto && frameCount % 45 === 0) stepOnce();
  // カットの塗り分け
  if (cutS) { noStroke(); for (let i = 0; i < nodes.length; i++) { fill(cutS[i] ? 10 : 180, 70, 100, 12); circle(nodes[i].x, nodes[i].y, 150); } }
  // 辺
  let cutCap = 0;
  for (let i = 0; i < edges.length; i++) {
    let e = edges[i], a = nodes[e.u], b = nodes[e.v];
    let onPath = path && path.some((s) => s.e === i);
    let isCut = cutS && cutS[e.u] && !cutS[e.v];
    if (isCut) cutCap += e.c;
    let ang = Math.atan2(b.y - a.y, b.x - a.x), ox = Math.cos(ang) * 26, oy = Math.sin(ang) * 26;
    // 容量 = 太さ（薄い）、流れ = 太さ（濃い）
    stroke(0, 0, 30); strokeWeight(2 + e.c * 1.6); line(a.x + ox, a.y + oy, b.x - ox, b.y - oy);
    if (e.f > 0) { stroke(isCut ? 55 : 180, 80, 100, 85); strokeWeight(2 + e.f * 1.6); line(a.x + ox, a.y + oy, b.x - ox, b.y - oy); }
    if (onPath) { stroke(55, 90, 100); strokeWeight(3); drawingContext.setLineDash([8, 8]); line(a.x + ox, a.y + oy, b.x - ox, b.y - oy); drawingContext.setLineDash([]); }
    if (isCut) { stroke(0, 90, 100); strokeWeight(3); let mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2; line(mx - 12 * Math.sin(ang), my + 12 * Math.cos(ang), mx + 12 * Math.sin(ang), my - 12 * Math.cos(ang)); }
    // 矢じり
    noStroke(); fill(0, 0, 60); push(); translate(b.x - ox, b.y - oy); rotate(ang); triangle(0, 0, -12, 6, -12, -6); pop();
    // ラベル f / c（ドラッグで容量）
    let mx = (a.x + b.x) / 2 - 6 * Math.sin(ang), my = (a.y + b.y) / 2 + 6 * Math.cos(ang);
    fill(250, 40, 10, 85); rect(mx - 24, my - 12, 48, 22, 4);
    fill(i === dragE ? 50 : 0, i === dragE ? 90 : 0, 100); textSize(14); textAlign(CENTER, CENTER); text(e.f + ' / ' + e.c, mx, my); textAlign(LEFT, BASELINE);
    e.lx = mx; e.ly = my;
  }
  // 頂点
  for (let i = 0; i < nodes.length; i++) {
    let n = nodes[i];
    stroke(0, 0, 100); strokeWeight(2); fill(i === 0 ? 10 : i === nodes.length - 1 ? 180 : 250, 60, i === 0 || i === nodes.length - 1 ? 100 : 40);
    circle(n.x, n.y, 44);
    noStroke(); fill(0, 0, 100); textSize(18); textAlign(CENTER, CENTER); text(n.n, n.x, n.y); textAlign(LEFT, BASELINE);
  }
  noStroke(); fill(0, 0, 100); textSize(18);
  let msg = done ? '✓ 増加路なし：最大流 ' + flowTotal + ' = 最小カットの容量 ' + cutCap + '（赤い印の辺を切る）' : path ? '増加路を見つけた（黄の点線）→ スペースで流す' : '流れ ' + flowTotal + '　スペースで増加路を探す';
  text(msg + '　A：自動 ' + (auto ? 'ON' : 'off') + '　R：リセット', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('辺の数字を上下にドラッグして容量を変える（流れはリセット）。終わったとき s から届く頂点（コーラル）と届かない頂点（アクア）を分けるパイプの容量の和 = 流れの量', 20, 68);
  fill(0, 0, 50); textSize(13);
  text('主問題：max 流量 s.t. 各辺 f ≤ c、各頂点で流入 = 流出　／　双対問題：min Σ c_e d_e s.t. d_e ≥ p_u − p_v（カットの LP）。弱双対「どんな流れ ≤ どんなカット」、強双対「等しい」', 20, height - 20);
}

function mousePressed() {
  for (let i = 0; i < edges.length; i++) if (dist(mouseX, mouseY, edges[i].lx, edges[i].ly) < 22) { dragE = i; dragY0 = mouseY; dragC0 = edges[i].c; }
}
function mouseDragged() {
  if (dragE < 0) return;
  let nc = constrain(Math.round(dragC0 + (dragY0 - mouseY) / 14), 1, 12);
  if (nc !== edges[dragE].c) { edges[dragE].c = nc; resetFlow(); }
}
function mouseReleased() { dragE = -1; }
function keyPressed() {
  if (key === ' ') stepOnce();
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'r' || key === 'R') resetFlow();
}

// ---------- やってみよう ----------
// 1. 終わったあとカットの辺を 1 本太く（容量を増やす）してもう一度。最大流は増える？ 増えないなら別の辺がボトルネック
// 2. s から出る辺を全部細くすると、カットは s のすぐそばになる
// 3. 逆向きに戻す辺（残余グラフの −1 方向）を使う増加路が出る容量を探そう
// 4. 2 人のプレイヤー：片方が容量 1 を足し、片方がカットを当てるゲームにしてみよう
