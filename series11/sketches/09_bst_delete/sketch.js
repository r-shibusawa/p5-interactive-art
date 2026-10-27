// ============================================
// 09 二分探索木の削除と TRANSPLANT
// 消す節点 z の子の数で 3 通り：
//   子がない／左だけ／右だけ → 子で z を置きかえる（TRANSPLANT）
//   子が 2 つ → 右の部分木の最小 y（z の後者）を z の場所へ持ってくる
// 操作：節点をクリック = 削除 / 数字 + D = 削除 / 数字 + Enter = 挿入 / スペース = ランダムに 1 個削除
//       R = 最初の木 / P = 再生・一時停止 / ← → = コマ送り
// ============================================

let firstKeys = [21, 10, 30, 5, 14, 26, 35, 3, 8, 12, 17, 28, 16]; // ★ 最初の木
let rootB = null, buf = '', lastPos = {};

function setup() {
  createCanvas(windowWidth, windowHeight);
  buildFirst();
}
function rec(msg, hl = []) { recordFrame(rootB, (x) => x === null, msg, hl); }
function buildFirst() { rootB = null; for (let k of firstKeys) insertB(k); clearFrames(); rec('節点をクリックすると削除。子の数で 3 通りに分かれる'); }
function insertB(k) {
  let z = { key: k, left: null, right: null, p: null }, y = null, x = rootB;
  while (x) { if (x.key === k) return; y = x; x = k < x.key ? x.left : x.right; }
  z.p = y;
  if (!y) rootB = z; else if (k < y.key) y.left = z; else y.right = z;
}
function findB(k) { let x = rootB; while (x && x.key !== k) x = k < x.key ? x.left : x.right; return x; }
function minB(x) { while (x.left) x = x.left; return x; }

// u の場所に v をつなぎかえる（v は null でもよい）
function transplant(u, v) {
  if (u.p === null) rootB = v;
  else if (u === u.p.left) u.p.left = v;
  else u.p.right = v;
  if (v !== null) v.p = u.p;
}
function treeDelete(z) {
  rec(`${z.key} を削除する`, [z.key]);
  if (z.left === null) {
    rec(z.right ? `左の子がない → 右の子 ${z.right.key} で置きかえる` : '子がない → ただ外す', [z.key, z.right && z.right.key]);
    transplant(z, z.right);
  } else if (z.right === null) {
    rec(`右の子がない → 左の子 ${z.left.key} で置きかえる`, [z.key, z.left.key]);
    transplant(z, z.left);
  } else {
    let y = minB(z.right);
    rec(`子が 2 つ → 右の部分木の最小 ${y.key}（後者）を使う`, [z.key, y.key]);
    if (y.p !== z) {
      rec(`まず ${y.key} を外して、その右の子 ${y.right ? y.right.key : 'NIL'} で置きかえる`, [y.key]);
      transplant(y, y.right);
      y.right = z.right; y.right.p = y;
    }
    transplant(z, y);
    y.left = z.left; y.left.p = y;
  }
  rec(`削除完了。まだ「左 < 自分 < 右」が成り立っている（中間順：${inorder(rootB).join(' ')}）`);
}
function inorder(x, out = []) { if (x) { inorder(x.left, out); out.push(x.key); inorder(x.right, out); } return out; }

function draw() {
  background(26, 18, 22);
  updateFrames();
  noStroke(); fill(240); textAlign(LEFT, TOP); textSize(26);
  text('二分探索木の削除（TRANSPLANT）', 30, 24);
  fill(200, 160, 175); textSize(15);
  text('クリック = 削除　数字 + D = 削除　数字 + Enter = 挿入　スペース = ランダムに削除　R = 最初の木　P 再生/停止　← → コマ送り', 30, 60);
  fill(255); textSize(18); text('入力：' + buf + (frameCount % 60 < 30 ? '｜' : ''), 30, 90);
  lastPos = drawTreeFrames({ fill: () => [150, 70, 110] });
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
  if (key === ENTER && buf) { insertB(int(buf)); rec(`${buf} を挿入`, [int(buf)]); buf = ''; }
  if (k === 'd' && buf) { let z = findB(int(buf)); if (z) treeDelete(z); else rec(`${buf} はない`); buf = ''; }
  if (key === ' ') { let ks = inorder(rootB); if (ks.length) treeDelete(findB(random(ks))); else rec('木が空です（R で戻す）'); }
  if (k === 'r') buildFirst();
}
function mousePressed() {
  for (let kk in lastPos) if (dist(mouseX, mouseY, lastPos[kk][0], lastPos[kk][1]) < 22) { skipToEnd(); let z = findB(+kk); if (z) treeDelete(z); return; }
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. 葉（3, 8, 12…）を消す → ただ外れる。17（子 1 つ）を消す → 16 が上がる
// 2. 10（子 2 つ）を消す → 後者 12 が 10 の場所へ。21（根）を消すと？（後者 26 には右の子 28 がいる）
// 3. 後者ではなく「前者（左の部分木の最大）」を使っても正しい。書きかえてみよう


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
