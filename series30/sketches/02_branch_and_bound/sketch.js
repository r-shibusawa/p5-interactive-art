// ============================================
// 02 整数計画と分枝限定法
// 「椅子 3.75 脚」は作れない。変数を整数に限ると、LP の最適解を四捨五入しても最適とは限らない
//   分枝限定法：LP を解く → 小数の変数で「x ≤ 3」「x ≥ 4」に分ける（分枝）→ 今の最良の整数解より良くなれない枝は切る（限定）
// スペース = 1 ステップ / A = 自動 / B = 深さ優先 ⇄ 最良優先 / 1〜3 = 問題 / R = やり直し
// ============================================

let problems = [                       // ★ 最大化 c·(x, y)、制約 a·x + b·y ≤ cap
  { c: [5, 4], cons: [[6, 4, 24], [1, 2, 6]] },
  { c: [8, 5], cons: [[1, 1, 6], [9, 5, 45]] },
  { c: [2, 3], cons: [[1, 3, 10.5], [3, 1, 11]] },
];
let prob = 0;
let nodes = [], active = [], root = null, current = null, incumbent = null;
let bestFirst = false, auto = false, done = false, explored = 0;
let X_MAX = 8, Y_MAX = 7;
let pl, pt, pw, ph;
let depthGap = 78;                     // 木の段の間隔

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  pl = 70; pt = 120; ph = min(height - 220, width * 0.36 * Y_MAX / X_MAX); pw = ph * X_MAX / Y_MAX;
  reset();
}
function sx(x) { return pl + x / X_MAX * pw; }
function sy(y) { return pt + ph - y / Y_MAX * ph; }

function reset() {
  nodes = []; active = []; incumbent = null; current = null; done = false; explored = 0;
  root = makeNode([0, 0], [Infinity, Infinity], null, '元の問題（LP 緩和）');
  active.push(root);
}
// 節（部分問題）をつくって、すぐ LP を解いておく
function makeNode(lb, ub, parent, cond) {
  let n = { lb, ub, parent, cond, children: [], depth: parent ? parent.depth + 1 : 0, status: 'wait' };
  let s = solveLP(lb, ub);
  if (s) { n.x = s.x; n.y = s.y; n.z = s.z; } else n.status = 'none';
  nodes.push(n);
  return n;
}
function solveLP(lb, ub) {
  let P = problems[prob];
  let cons = P.cons.concat([[-1, 0, -lb[0]], [0, -1, -lb[1]]]);
  if (ub[0] < Infinity) cons.push([1, 0, ub[0]]);
  if (ub[1] < Infinity) cons.push([0, 1, ub[1]]);
  let best = null;
  for (let v of feasibleVertices(cons)) { let z = P.c[0] * v[0] + P.c[1] * v[1]; if (!best || z > best.z + 1e-9) best = { x: v[0], y: v[1], z }; }
  return best;
}
function isInt(v) { return abs(v - round(v)) < 1e-6; }

// ★ 分枝限定法の 1 ステップ
function stepBB() {
  if (!active.length) { done = true; auto = false; current = null; return; }
  let k = active.length - 1;                               // 深さ優先：最後に入れた節
  if (bestFirst) for (let i = 0; i < active.length; i++) if ((active[i].z ?? -1) > (active[k].z ?? -1)) k = i;   // 最良優先：上界が一番大きい節
  let n = active.splice(k, 1)[0];
  current = n; explored++;
  if (n.status === 'none') { n.status = 'infeasible'; return; }                       // 解なし
  if (incumbent && n.z <= incumbent.z + 1e-9) { n.status = 'pruned'; return; }      // 限定：これ以上良くならない
  if (isInt(n.x) && isInt(n.y)) {                                                   // 整数解が見つかった
    n.status = 'integer';
    if (!incumbent || n.z > incumbent.z) incumbent = n;
    return;
  }
  n.status = 'branched';                                                            // 分枝
  let v = isInt(n.x) ? 1 : 0, val = v === 0 ? n.x : n.y, name = v === 0 ? 'x' : 'y';
  let ubA = n.ub.slice(); ubA[v] = floor(val);
  let lbB = n.lb.slice(); lbB[v] = ceil(val);
  let a = makeNode(n.lb.slice(), ubA, n, name + ' ≤ ' + floor(val));
  let b = makeNode(lbB, n.ub.slice(), n, name + ' ≥ ' + ceil(val));
  n.children = [a, b];
  active.push(a, b);
}

function draw() {
  background(225, 30, 12);
  if (auto && frameCount % 30 === 0) stepBB();
  let P = problems[prob];

  // 左：整数の格子点と実行可能領域
  stroke(0, 0, 100, 10); strokeWeight(1);
  for (let x = 0; x <= X_MAX; x++) line(sx(x), pt, sx(x), pt + ph);
  for (let y = 0; y <= Y_MAX; y++) line(pl, sy(y), pl + pw, sy(y));
  noStroke(); fill(0, 0, 60); textSize(12);
  for (let x = 0; x <= X_MAX; x++) text(x, sx(x) - 3, pt + ph + 16);
  for (let y = 1; y <= Y_MAX; y++) text(y, pl - 16, sy(y) + 4);
  let rootPoly = feasibleVertices(P.cons.concat([[-1, 0, 0], [0, -1, 0]]));
  fill(120, 50, 70, 15); beginShape(); for (let v of rootPoly) vertex(sx(v[0]), sy(v[1])); endShape(CLOSE);
  if (current && current.status !== 'infeasible') {
    let cons = P.cons.concat([[-1, 0, -current.lb[0]], [0, -1, -current.lb[1]]]);
    if (current.ub[0] < Infinity) cons.push([1, 0, current.ub[0]]);
    if (current.ub[1] < Infinity) cons.push([0, 1, current.ub[1]]);
    fill(190, 70, 90, 35); beginShape(); for (let v of feasibleVertices(cons)) vertex(sx(v[0]), sy(v[1])); endShape(CLOSE);
  }
  for (let x = 0; x <= X_MAX; x++) for (let y = 0; y <= Y_MAX; y++) {
    let ok = P.cons.every(c => c[0] * x + c[1] * y <= c[2] + 1e-9);
    fill(0, 0, 100, ok ? 85 : 15); circle(sx(x), sy(y), ok ? 8 : 4);
  }
  if (root.z !== undefined) { fill(50, 90, 100); circle(sx(root.x), sy(root.y), 12); fill(50, 60, 100); textSize(13); text('LP 最適 ' + nf(root.z, 1, 2), sx(root.x) + 10, sy(root.y) - 8); }
  if (current && current.z !== undefined) { noFill(); stroke(190, 80, 100); strokeWeight(3); circle(sx(current.x), sy(current.y), 22); }
  if (incumbent) { noStroke(); fill(140, 80, 100); star(sx(incumbent.x), sy(incumbent.y), 13); }
  noStroke(); fill(0, 0, 85); textSize(15);
  text('最大化 ' + P.c[0] + 'x + ' + P.c[1] + 'y', pl, pt + ph + 46);
  P.cons.forEach((c, i) => text(c[0] + 'x + ' + c[1] + 'y ≤ ' + c[2], pl + i * 170, pt + ph + 70));
  text('x, y は 0 以上の整数', pl, pt + ph + 94);

  // 右：分枝限定の木
  let tx = pl + pw + 60, tw = width - tx - 30, ty = pt + 10;
  let slot = { n: 0 };
  countLeaves(root, slot);
  let maxD = 1; for (let n of nodes) maxD = max(maxD, n.depth);
  depthGap = min(78, (height - ty - 110) / maxD);
  let pos = new Map(); let leaf = { i: 0 };
  placeNode(root, tx, tw / max(1, slot.n), ty, pos, leaf);
  for (let n of nodes) for (let c of n.children) {
    let a = pos.get(n), b = pos.get(c);
    stroke(0, 0, 100, 35); strokeWeight(2); line(a.x, a.y, b.x, b.y);
    noStroke(); fill(0, 0, 80); textSize(12); textAlign(CENTER, CENTER);
    text(c.cond, (a.x + b.x) / 2 + (b.x < a.x ? -26 : 26), (a.y + b.y) / 2);
  }
  textAlign(CENTER, CENTER);
  for (let n of nodes) {
    let p = pos.get(n), col = statusColor(n.status);
    stroke(n === current ? color(190, 80, 100) : col); strokeWeight(n === current ? 4 : 2);
    fill(n.status === 'wait' ? color(225, 30, 18) : col);
    circle(p.x, p.y, 44);
    noStroke(); fill(n.status === 'wait' ? color(0, 0, 90) : color(0, 0, 8)); textSize(12);
    text(n.z === undefined ? '解なし' : nf(n.z, 1, 1), p.x, p.y);
    if (n.z !== undefined) { fill(0, 0, 70); textSize(10); text('(' + nf(n.x, 1, 2) + ', ' + nf(n.y, 1, 2) + ')', p.x, p.y + 32); }
  }
  textAlign(LEFT, BASELINE);
  // 凡例
  let ly = height - 40, lx = tx;
  for (let [s, t] of [['wait', '未処理'], ['branched', '分枝した'], ['integer', '整数解'], ['pruned', '限定で切った'], ['infeasible', '解なし']]) {
    fill(s === 'wait' ? color(225, 30, 30) : statusColor(s)); circle(lx + 8, ly - 5, 14); fill(0, 0, 80); textSize(13); text(t, lx + 20, ly); lx += 120;
  }

  let ub = incumbent ? incumbent.z : -Infinity;
  for (let n of active) if (n.z !== undefined) ub = max(ub, n.z);
  fill(0, 0, 100); textSize(18);
  text('スペース：1 ステップ　A：自動 ' + (auto ? 'ON' : 'off') + '　B：' + (bestFirst ? '最良優先' : '深さ優先') + '　1〜3：問題 ' + (prob + 1) + '　R：やり直し', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('調べた節 ' + explored + '　暫定解（★）' + (incumbent ? nf(incumbent.z, 1, 1) + ' at (' + round(incumbent.x) + ', ' + round(incumbent.y) + ')' : 'まだない') + '　上界 ' + (ub > -Infinity ? nf(ub, 1, 2) : '—') + (done ? '　✓ 最適が証明された' : '') + '　　節の数字 = その部分問題の LP の値（これ以上は良くならない上界）', 20, 68);
}

function statusColor(s) {
  return { wait: color(0, 0, 60), branched: color(210, 50, 80), integer: color(140, 75, 90), pruned: color(30, 70, 90), infeasible: color(0, 60, 70), none: color(0, 0, 60) }[s];
}
function countLeaves(n, c) { if (!n.children.length) c.n++; else for (let k of n.children) countLeaves(k, c); }
function placeNode(n, x0, sw, y0, pos, leaf) {
  let y = y0 + n.depth * depthGap;
  if (!n.children.length) { pos.set(n, { x: x0 + (leaf.i + 0.5) * sw, y }); leaf.i++; return; }
  for (let c of n.children) placeNode(c, x0, sw, y0, pos, leaf);
  pos.set(n, { x: (pos.get(n.children[0]).x + pos.get(n.children[1]).x) / 2, y });
}

function keyPressed() {
  if (key === ' ') stepBB();
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'b' || key === 'B') { bestFirst = !bestFirst; reset(); }
  if (key === '1' || key === '2' || key === '3') { prob = int(key) - 1; reset(); }
  if (key === 'r' || key === 'R') reset();
}

// ---------- やってみよう ----------
// 1. 問題 1 の LP 最適解 (3, 1.5) を四捨五入すると (3, 2)。それは実行可能？ 整数の最適解はどこだった？
// 2. 深さ優先と最良優先（B）で「調べた節」の数を比べよう。どちらが早く暫定解を見つける？
// 3. 分枝する変数を「x が先」から「y が先」に変えると木の形はどう変わる？（stepBB の v）
// 4. problems に自分の問題を足そう。変数が整数でないといけない現実の例は？（人数、トラックの台数…）


// ==================================================
// ここから下は「LP を解くための道具」と「星を描く道具」
// ==================================================
function feasibleVertices(cons) {
  let pts = [];
  for (let i = 0; i < cons.length; i++) for (let j = i + 1; j < cons.length; j++) {
    let [a1, b1, c1] = cons[i], [a2, b2, c2] = cons[j];
    let det = a1 * b2 - a2 * b1;
    if (Math.abs(det) < 1e-9) continue;
    let x = (c1 * b2 - c2 * b1) / det, y = (a1 * c2 - a2 * c1) / det;
    if (cons.every(c => c[0] * x + c[1] * y <= c[2] + 1e-7) && !pts.some(p => Math.abs(p[0] - x) + Math.abs(p[1] - y) < 1e-6)) pts.push([x, y]);
  }
  let cx = 0, cy = 0;
  for (let p of pts) { cx += p[0] / pts.length; cy += p[1] / pts.length; }
  pts.sort((p, q) => Math.atan2(p[1] - cy, p[0] - cx) - Math.atan2(q[1] - cy, q[0] - cx));
  return pts;
}
function star(x, y, r) {
  beginShape();
  for (let i = 0; i < 10; i++) { let a = -HALF_PI + i * PI / 5, rr = i % 2 ? r * 0.45 : r; vertex(x + cos(a) * rr, y + sin(a) * rr); }
  endShape(CLOSE);
}
