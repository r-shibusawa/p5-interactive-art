// ============================================
// 08 二分探索木：探索・最小・後者・なぞり方
// どの節点でも「左の部分木のキー ≤ 自分 ≤ 右の部分木のキー」。だから大小を比べて左右に進むだけで探せる
// かかる時間は木の高さ h に比例：O(h)
// 操作：数字 + Enter = 挿入 / 数字 + S = 探索 / N = 最小 / X = 最大 / 節点をクリック = 後者（次に大きいキー）
//       W = なぞり方（中間順 → 先行順 → 後行順）/ スペース = ランダムに挿入 / R = 最初の木 / C = 空に
//       P = 再生・一時停止 / ← → = コマ送り
// ============================================

let firstKeys = [21, 10, 30, 5, 14, 26, 35, 3, 8, 12, 17]; // ★ 最初の木
let rootB = null, buf = '', walkType = 0, lastPos = {};
let walkNames = ['中間順（inorder：左 → 自分 → 右）', '先行順（preorder：自分 → 左 → 右）', '後行順（postorder：左 → 右 → 自分）'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  buildFirst();
}
function rec(msg, hl = [], extra = {}) { recordFrame(rootB, (x) => x === null, msg, hl, extra); }
function buildFirst() { rootB = null; for (let k of firstKeys) treeInsert(k, false); clearFrames(); rec('二分探索木。左 < 自分 < 右 がどこでも成り立つ'); }

function treeInsert(k, show = true) {
  let z = { key: k, left: null, right: null, p: null };
  let y = null, x = rootB, path = [];
  while (x !== null) {
    if (k === x.key) { if (show) rec(`${k} はもうある`, [k]); return null; }
    y = x; path.push(x.key);
    if (show) rec(`${k} ${k < x.key ? '<' : '>'} ${x.key} → ${k < x.key ? '左' : '右'}へ`, [x.key]);
    x = k < x.key ? x.left : x.right;
  }
  z.p = y;
  if (y === null) rootB = z; else if (k < y.key) y.left = z; else y.right = z;
  if (show) rec(`空いた所に ${k} をつける（${path.length} 回の比較）`, [k]);
  return z;
}
function treeSearch(k) {
  let x = rootB, c = 0;
  while (x !== null && k !== x.key) { c++; rec(`${k} ${k < x.key ? '<' : '>'} ${x.key} → ${k < x.key ? '左' : '右'}へ`, [x.key]); x = k < x.key ? x.left : x.right; }
  if (x) rec(`${k} を見つけた！（${c + 1} 回の比較）`, [k]); else rec(`NIL に着いた → ${k} はない（${c} 回の比較）`);
}
function treeMin(x, show) { while (x.left !== null) { if (show) rec('左へ、左へ…', [x.key]); x = x.left; } return x; }
function treeMax(x, show) { while (x.right !== null) { if (show) rec('右へ、右へ…', [x.key]); x = x.right; } return x; }
function findB(k) { let x = rootB; while (x && x.key !== k) x = k < x.key ? x.left : x.right; return x; }
function successor(x) {
  rec(`${x.key} の後者（次に大きいキー）を探す`, [x.key]);
  if (x.right !== null) {
    rec('右の部分木がある → その中の最小', [x.right.key]);
    let s = treeMin(x.right, true);
    rec(`後者は ${s.key}`, [s.key]); return;
  }
  let y = x.p;
  while (y !== null && x === y.right) { rec('右の子として上がってきた → さらに上へ', [y.key]); x = y; y = y.p; }
  if (y) rec(`左の子として上がってきた所 ${y.key} が後者`, [y.key]); else rec('いちばん大きいので後者はない');
}
function walk(x, type, out) {
  if (x === null) return;
  if (type === 1) { out.push(x.key); rec('訪問：' + x.key, [x.key], { out: out.slice() }); }
  walk(x.left, type, out);
  if (type === 0) { out.push(x.key); rec('訪問：' + x.key, [x.key], { out: out.slice() }); }
  walk(x.right, type, out);
  if (type === 2) { out.push(x.key); rec('訪問：' + x.key, [x.key], { out: out.slice() }); }
}

function draw() {
  background(16, 22, 30);
  updateFrames();
  noStroke(); fill(240); textAlign(LEFT, TOP); textSize(26);
  text('二分探索木：探す・最小・後者・なぞる', 30, 24);
  fill(150, 170, 200); textSize(15);
  text('数字 + Enter 挿入　数字 + S 探索　N 最小　X 最大　クリック 後者　W なぞる　スペース ランダム　R 最初の木　C 空に　P 再生/停止　← →', 30, 60);
  fill(255); textSize(18); text('入力：' + buf + (frameCount % 60 < 30 ? '｜' : ''), 30, 90);
  lastPos = drawTreeFrames({ fill: () => [40, 120, 150] });
  let f = currentFrame();
  if (f && f.out) {
    fill(140, 230, 190); textSize(20); textAlign(LEFT, TOP);
    text('出力：' + f.out.join('  '), 30, height - 120);
  }
  drawFrameMessage(height - 80);
}

function keyPressed() {
  if (key >= '0' && key <= '9') { if (buf.length < 3) buf += key; return; }
  if (key === BACKSPACE) { buf = buf.slice(0, -1); return; }
  if (key === RIGHT_ARROW) { stepForward(); return; }
  if (key === LEFT_ARROW) { stepBack(); return; }
  let k = key.toLowerCase();
  if (k === 'p') { playing = !playing; return; }
  skipToEnd();
  if (key === ENTER && buf) { treeInsert(int(buf)); buf = ''; }
  if (k === 's' && buf) { treeSearch(int(buf)); buf = ''; }
  if (k === 'n') { if (rootB) { let x = treeMin(rootB, true); rec(`最小は ${x.key}（いちばん左）`, [x.key]); } }
  if (k === 'x') { if (rootB) { let x = treeMax(rootB, true); rec(`最大は ${x.key}（いちばん右）`, [x.key]); } }
  if (k === 'w') { rec(walkNames[walkType] + ' でなぞる', [], { out: [] }); walk(rootB, walkType, []); walkType = (walkType + 1) % 3; }
  if (key === ' ') treeInsert(floor(random(1, 100)));
  if (k === 'r') buildFirst();
  if (k === 'c') { rootB = null; clearFrames(); rec('空の木。数字 + Enter で入れよう'); }
}
function mousePressed() {
  for (let kk in lastPos) {
    if (dist(mouseX, mouseY, lastPos[kk][0], lastPos[kk][1]) < 22) { skipToEnd(); successor(findB(+kk)); return; }
  }
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. W で中間順にすると、出力が小さい順に並ぶ（二分探索木のいちばん大事な性質）
// 2. 17 の後者は？（右の部分木がないので上がっていく → 21）
// 3. 1, 2, 3, … と順番に入れると木がまっすぐ 1 本に。探索が O(n) になってしまう → 10 と 11 へ


// ==================================================
// ここから下は「木を描く道具」です（アニメーション用）
// 操作の途中経過を「コマ」として記録し、順番になめらかに再生します
// ==================================================
let frames = [], cur = 0, tAnim = 1, hold = 0, playing = true;
let animSpeed = 0.07, holdFrames = 35; // コマの切りかえの速さ・止まる長さ
let TREE_TOP = 140, TREE_BOTTOM = 160;  // 木を描く範囲（上の余白・下の余白）

function recordFrame(rt, nilTest, msg, hl = [], extra = {}) {
  let nodes = {}, edges = [], i = 0, maxD = 0;
  function walk(x, d, pk) {
    if (nilTest(x)) return;
    walk(x.left, d + 1, x.key);
    nodes[x.key] = { i: i++, d, color: x.color, size: x.size, max: x.max, label: x.label };
    if (d > maxD) maxD = d;
    walk(x.right, d + 1, x.key);
    if (pk !== undefined) edges.push([String(pk), String(x.key)]);
  }
  walk(rt, 0);
  frames.push(Object.assign({ nodes, edges, n: i, maxD, msg, hl: hl.filter((k) => k !== null && k !== undefined).map(String) }, extra));
  if (frames.length > 400) { frames.shift(); cur = max(0, cur - 1); }
}
function clearFrames() { frames = []; cur = 0; tAnim = 1; hold = 0; }
function framesBusy() { return frames.length > 0 && (cur < frames.length - 1 || tAnim < 1); }
function updateFrames() {
  if (frames.length === 0) return;
  if (tAnim < 1) { tAnim = min(1, tAnim + animSpeed); return; }
  if (cur < frames.length - 1 && playing) {
    if (hold++ < holdFrames) return;
    hold = 0; cur++; tAnim = 0;
  }
}
function stepForward() { if (cur < frames.length - 1) { cur++; tAnim = 0; hold = 0; } }
function stepBack() { if (cur > 0) { cur--; tAnim = 1; } }
function skipToEnd() { cur = max(0, frames.length - 1); tAnim = 1; }
function currentFrame() { return frames[cur]; }

function layoutPos(f, k) {
  let nd = f.nodes[k];
  let gap = min(78, (height - TREE_TOP - TREE_BOTTOM) / max(1, f.maxD + 1));
  return [50 + ((nd.i + 0.5) / max(1, f.n)) * (width - 100), TREE_TOP + nd.d * gap];
}
function nodeRadius(f) { return constrain(((width - 100) / max(1, f.n)) * 0.42, 9, 24); }
function easeT(t) { return t < 0.5 ? 2 * t * t : 1 - pow(-2 * t + 2, 2) / 2; }

// style: { fill(nd,k) → [r,g,b], label(k,nd) → 文字, sub(k,nd) → 下の小さい文字 }
function drawTreeFrames(style = {}) {
  if (frames.length === 0) return {};
  let B = frames[cur], A = cur > 0 && tAnim < 1 ? frames[cur - 1] : B;
  let t = easeT(tAnim), pos = {};
  for (let k in B.nodes) {
    let pb = layoutPos(B, k);
    if (A.nodes[k]) { let pa = layoutPos(A, k); pos[k] = [lerp(pa[0], pb[0], t), lerp(pa[1], pb[1], t), 255]; }
    else pos[k] = [pb[0], pb[1], 255 * t];
  }
  let r = lerp(nodeRadius(A), nodeRadius(B), t);
  strokeWeight(2);
  for (let [a, b] of B.edges) {
    if (!pos[a] || !pos[b]) continue;
    stroke(120, 130, 165, min(pos[a][2], pos[b][2]));
    line(pos[a][0], pos[a][1], pos[b][0], pos[b][1]);
  }
  for (let k in A.nodes) if (!B.nodes[k]) { let p = layoutPos(A, k); noStroke(); fill(240, 90, 90, 255 * (1 - t)); circle(p[0], p[1], r * 2 * (1 + t)); }
  textAlign(CENTER, CENTER);
  for (let k in B.nodes) {
    let nd = B.nodes[k], [x, y, a] = pos[k];
    let ndA = A.nodes[k] || nd;
    let c0 = style.fill ? style.fill(ndA, k) : defaultFill(ndA), c1 = style.fill ? style.fill(nd, k) : defaultFill(nd);
    let hl = B.hl.includes(k);
    if (hl) { noStroke(); fill(255, 214, 90, 70 * (a / 255)); circle(x, y, r * 3.1); }
    stroke(hl ? color(255, 214, 90, a) : color(230, 230, 240, a * 0.6));
    strokeWeight(hl ? 4 : 1.5);
    fill(lerp(c0[0], c1[0], t), lerp(c0[1], c1[1], t), lerp(c0[2], c1[2], t), a);
    circle(x, y, r * 2);
    noStroke();
    fill(255, a);
    let lab = style.label ? style.label(k, nd) : k;
    textSize(constrain(r * (String(lab).length > 2 ? 0.62 : 0.85), 8, 18));
    text(lab, x, y);
    if (style.sub) { fill(190, 200, 230, a); textSize(constrain(r * 0.6, 9, 13)); text(style.sub(k, nd), x, y + r + 10); }
  }
  return pos;
}
function defaultFill(nd) {
  if (nd.color === 'R') return [222, 60, 75];
  if (nd.color === 'B') return [28, 30, 40];
  return [40, 120, 150];
}
function drawFrameMessage(y) {
  if (frames.length === 0) return;
  let f = frames[cur];
  noStroke(); fill(255, 225, 140); textAlign(LEFT, TOP); textSize(18);
  text(f.msg || '', 30, y);
  fill(140, 150, 180); textSize(13);
  text(`コマ ${cur + 1} / ${frames.length}　${playing ? '▶ 再生中' : '⏸ 一時停止'}（P 再生/停止　← → コマ送り）`, 30, y + 28);
}
