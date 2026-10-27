// ============================================
// 12 赤黒木：削除
// 二分探索木と同じように消したあと、黒い節点が抜けたら「黒が 1 つ足りない」所ができる
// それを x（2 重の黒）として、兄弟 w の色と w の子の色でケース 1〜4 に分けて直す
// 操作：節点をクリック = 削除 / 数字 + D = 削除 / 数字 + Enter = 挿入 / スペース = ランダムに削除
//       R = 1〜20 の木を作り直す / P = 再生・一時停止 / ← → = コマ送り
// ============================================

let startN = 20;   // ★ 最初の木の節点数
let buf = '', lastPos = {};

function setup() {
  createCanvas(windowWidth, windowHeight);
  rebuild();
}
function rebuild() {
  root = NIL; LOG = false;
  for (let k = 1; k <= startN; k++) rbInsert(k);
  LOG = true; clearFrames();
  rbLog('1〜' + startN + ' の赤黒木。節点をクリックして削除してみよう');
}
function draw() {
  background(16, 14, 24);
  updateFrames();
  noStroke(); fill(240); textAlign(LEFT, TOP); textSize(26);
  text('赤黒木：削除', 30, 24);
  fill(180, 170, 210); textSize(15);
  text('クリック = 削除　数字 + D = 削除　数字 + Enter = 挿入　スペース = ランダムに削除　R = 作り直す　P 再生/停止　← → コマ送り', 30, 60);
  fill(255); textSize(18); text('入力：' + buf + (frameCount % 60 < 30 ? '｜' : ''), 30, 90);
  lastPos = drawTreeFrames();
  let n = countNodes(root), bh = blackHeight(root);
  fill(220); textAlign(RIGHT, TOP); textSize(16);
  text(`節点 ${n} 個　高さ ${treeHeight(root)}`, width - 30, 90);
  fill(bh > 0 ? color(140, 230, 160) : color(255, 120, 120));
  if (!framesBusy()) text(bh > 0 ? `✓ 5 つの性質 OK　黒高さ = ${bh - 1}` : '途中…', width - 30, 112);
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
  if (k === 'd' && buf) { if (!rbDelete(int(buf))) rbLog(`${buf} はない`); buf = ''; }
  if (key === ENTER && buf) { if (!rbInsert(int(buf))) rbLog(`${buf} はもうある`); buf = ''; }
  if (key === ' ') { let ks = allKeys(root); if (ks.length) rbDelete(random(ks)); else rbLog('空です（R で作り直す）'); }
  if (k === 'r') rebuild();
}
function mousePressed() {
  for (let kk in lastPos) if (dist(mouseX, mouseY, lastPos[kk][0], lastPos[kk][1]) < 22) { skipToEnd(); rbDelete(+kk); return; }
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. 赤い葉を消す → 何も起きない（黒の数は変わらない）
// 2. 黒い葉を消す → ケース 2 で問題が上へ、ケース 4 で解決。どのケースが何回出るか数えよう
// 3. スペースを連打して全部消してみよう。最後まで 5 つの性質は守られる


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


// ==================================================
// ここから下は「赤黒木の道具」です（挿入・削除・回転を JavaScript で書いたもの）
// NIL は「番兵」：葉の代わりに置く黒い節点。すべての葉がこの 1 個を指す
// ==================================================
const NIL = { key: null, color: 'B', size: 0, max: -Infinity };
NIL.left = NIL.right = NIL.p = NIL;
let root = NIL;
let LOG = true; // false にすると途中経過を記録しない
function isNil(x) { return x === NIL || x === null || x === undefined; }
function lbl(x) { return x.label ?? x.key; }
function rbLog(msg, hl = []) { if (LOG) { fixAll(root); recordFrame(root, isNil, msg, hl); } }
// 拡張データ構造：size（部分木の節点数）と max（区間の右端の最大）を子から計算
function fix(x) { if (x === NIL) return; x.size = x.left.size + x.right.size + 1; x.max = Math.max(x.high ?? x.key, x.left.max, x.right.max); }
function fixAll(x) { if (x === NIL) return; fixAll(x.left); fixAll(x.right); fix(x); }

function leftRotate(x) {
  let y = x.right;
  x.right = y.left;
  if (y.left !== NIL) y.left.p = x;
  y.p = x.p;
  if (x.p === NIL) root = y;
  else if (x === x.p.left) x.p.left = y;
  else x.p.right = y;
  y.left = x; x.p = y;
  fix(x); fix(y); // 回転で変わるのは x と y の 2 つだけ → O(1) で更新できる
}
function rightRotate(x) {
  let y = x.left;
  x.left = y.right;
  if (y.right !== NIL) y.right.p = x;
  y.p = x.p;
  if (x.p === NIL) root = y;
  else if (x === x.p.right) x.p.right = y;
  else x.p.left = y;
  y.right = x; x.p = y;
  fix(x); fix(y);
}
function rbSearch(k) { let x = root; while (x !== NIL && k !== x.key) x = k < x.key ? x.left : x.right; return x; }
function treeMinimum(x) { while (x.left !== NIL) x = x.left; return x; }

function rbInsert(k, extra = {}) {
  if (rbSearch(k) !== NIL) return null; // 同じキーは入れない
  let z = Object.assign({ key: k, left: NIL, right: NIL, p: NIL, color: 'R', size: 1 }, extra);
  z.max = z.high ?? k;
  let y = NIL, x = root;
  while (x !== NIL) { y = x; x = z.key < x.key ? x.left : x.right; }
  z.p = y;
  if (y === NIL) root = z;
  else if (z.key < y.key) y.left = z;
  else y.right = z;
  rbLog(`${lbl(z)} を二分探索木として挿入し、赤にぬる`, [k]);
  rbInsertFixup(z);
  return z;
}
function rbInsertFixup(z) {
  while (z.p.color === 'R') {
    if (z.p === z.p.p.left) {
      let y = z.p.p.right; // おじ
      if (y.color === 'R') {
        z.p.color = 'B'; y.color = 'B'; z.p.p.color = 'R';
        rbLog('ケース1：おじが赤 → 親とおじを黒、祖父を赤にして、祖父から続ける', [z.key, z.p.key, y.key, z.p.p.key]);
        z = z.p.p;
      } else {
        if (z === z.p.right) {
          z = z.p; leftRotate(z);
          rbLog('ケース2：z が「内側」の孫 → 親で左回転してケース3の形に', [z.key, z.p.key]);
        }
        z.p.color = 'B'; z.p.p.color = 'R';
        rbLog('ケース3：親を黒、祖父を赤にぬりかえ', [z.p.key, z.p.p.key]);
        rightRotate(z.p.p);
        rbLog('ケース3：祖父で右回転 → 赤が 2 つ続く所がなくなった', [z.p.key]);
      }
    } else {
      let y = z.p.p.left;
      if (y.color === 'R') {
        z.p.color = 'B'; y.color = 'B'; z.p.p.color = 'R';
        rbLog('ケース1（左右反対）：おじが赤 → 親とおじを黒、祖父を赤に', [z.key, z.p.key, y.key, z.p.p.key]);
        z = z.p.p;
      } else {
        if (z === z.p.left) {
          z = z.p; rightRotate(z);
          rbLog('ケース2（左右反対）：親で右回転', [z.key, z.p.key]);
        }
        z.p.color = 'B'; z.p.p.color = 'R';
        rbLog('ケース3（左右反対）：親を黒、祖父を赤に', [z.p.key, z.p.p.key]);
        leftRotate(z.p.p);
        rbLog('ケース3（左右反対）：祖父で左回転', [z.p.key]);
      }
    }
  }
  if (root.color === 'R') { root.color = 'B'; rbLog('根を黒にする（性質2）。完了', [root.key]); }
  else rbLog('赤黒木の性質がすべて成り立った。完了', []);
}

function rbTransplant(u, v) {
  if (u.p === NIL) root = v;
  else if (u === u.p.left) u.p.left = v;
  else u.p.right = v;
  v.p = u.p;
}
function rbDelete(k) {
  let z = rbSearch(k);
  if (z === NIL) return false;
  rbLog(`${lbl(z)} を削除する`, [z.key]);
  let y = z, yColor = y.color, x;
  if (z.left === NIL) { x = z.right; rbTransplant(z, z.right); rbLog('左の子がない → 右の子で置きかえる', [x.key]); }
  else if (z.right === NIL) { x = z.left; rbTransplant(z, z.left); rbLog('右の子がない → 左の子で置きかえる', [x.key]); }
  else {
    y = treeMinimum(z.right); yColor = y.color; x = y.right;
    rbLog(`子が 2 つ → 次に大きい ${lbl(y)}（右の部分木の最小）を代わりに使う`, [z.key, y.key]);
    if (y.p === z) x.p = y;
    else { rbTransplant(y, y.right); y.right = z.right; y.right.p = y; }
    rbTransplant(z, y); y.left = z.left; y.left.p = y; y.color = z.color;
    rbLog(`${lbl(y)} を ${lbl(z)} の場所へ（色も引きつぐ）`, [y.key]);
  }
  if (yColor === 'B') rbDeleteFixup(x);
  else rbLog('取り除いたのは赤 → 性質はくずれない。完了', []);
  return true;
}
function rbDeleteFixup(x) {
  rbLog(`黒が 1 つ足りない（x = ${x === NIL ? 'NIL' : lbl(x)} が「2 重の黒」）`, [x.key]);
  while (x !== root && x.color === 'B') {
    if (x === x.p.left) {
      let w = x.p.right; // 兄弟
      if (w.color === 'R') {
        w.color = 'B'; x.p.color = 'R'; leftRotate(x.p); w = x.p.right;
        rbLog('ケース1：兄弟 w が赤 → 色をかえて左回転し、黒い兄弟にする', [w.key, x.p.key]);
      }
      if (w.left.color === 'B' && w.right.color === 'B') {
        w.color = 'R'; x = x.p;
        rbLog('ケース2：w の子が両方黒 → w を赤にして、問題を親へ上げる', [w.key, x.key]);
      } else {
        if (w.right.color === 'B') {
          w.left.color = 'B'; w.color = 'R'; rightRotate(w); w = x.p.right;
          rbLog('ケース3：w の左だけ赤 → w で右回転してケース4の形に', [w.key]);
        }
        w.color = x.p.color; x.p.color = 'B'; w.right.color = 'B'; leftRotate(x.p);
        rbLog('ケース4：w の右が赤 → 色をかえて親で左回転。黒が足りた', [w.key]);
        x = root;
      }
    } else {
      let w = x.p.left;
      if (w.color === 'R') {
        w.color = 'B'; x.p.color = 'R'; rightRotate(x.p); w = x.p.left;
        rbLog('ケース1（左右反対）：兄弟 w が赤 → 右回転', [w.key, x.p.key]);
      }
      if (w.right.color === 'B' && w.left.color === 'B') {
        w.color = 'R'; x = x.p;
        rbLog('ケース2（左右反対）：w を赤にして親へ', [w.key, x.key]);
      } else {
        if (w.left.color === 'B') {
          w.right.color = 'B'; w.color = 'R'; leftRotate(w); w = x.p.left;
          rbLog('ケース3（左右反対）：w で左回転', [w.key]);
        }
        w.color = x.p.color; x.p.color = 'B'; w.left.color = 'B'; rightRotate(x.p);
        rbLog('ケース4（左右反対）：親で右回転。黒が足りた', [w.key]);
        x = root;
      }
    }
  }
  x.color = 'B';
  rbLog('x を黒にぬって完了', [x.key]);
}
// 性質のチェック：赤の子は黒か？ どの道も黒の数が同じか？ → 黒高さを返す（こわれていたら -1）
function blackHeight(x) {
  if (x === NIL) return 1;
  if (x.color === 'R' && (x.left.color === 'R' || x.right.color === 'R')) return -1;
  let a = blackHeight(x.left), b = blackHeight(x.right);
  if (a < 0 || b < 0 || a !== b) return -1;
  return a + (x.color === 'B' ? 1 : 0);
}
function treeHeight(x) { return x === NIL ? 0 : 1 + Math.max(treeHeight(x.left), treeHeight(x.right)); }
function countNodes(x) { return x === NIL ? 0 : 1 + countNodes(x.left) + countNodes(x.right); }
function allKeys(x, out = []) { if (x !== NIL) { allKeys(x.left, out); out.push(x.key); allKeys(x.right, out); } return out; }
