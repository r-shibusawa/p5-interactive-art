// ============================================
// 15 区間木：重なる区間を O(log n) で探す
// 区間 [low, high] を low をキーにして赤黒木に入れ、各節点に max（部分木の high の最大）を足す
// 区間の探索 search(i)：重ならないなら、左の部分木の max ≥ i.low のときだけ左へ、そうでなければ右へ
//   → 左に行ったのに見つからなければ右にもない、ことが証明できる。だから 1 本道で済む
// 予定表の空き確認、地図の範囲検索、遺伝子の領域検索などに使われる
// 操作：下の時間軸をドラッグ = 調べる区間 / Q = ランダムな区間で探す / スペース = 区間を追加
//       F = 見本の区間 / 節点をクリック = 削除 / C = 空に / P・← → = 再生操作
// ============================================

let maxCoord = 40;   // ★ 時間軸の長さ
let query = null, drag = null, lastPos = {};

function setup() {
  createCanvas(windowWidth, windowHeight);
  sampleIntervals();
}
function showFrame(msg, hl = []) { fixAll(root); recordFrame(root, isNil, msg, hl); }
function addInterval(lo, hi) {
  if (rbSearch(lo) !== NIL) return false; // low が同じものは入れない（簡単のため）
  return rbInsert(lo, { high: hi, label: `${lo},${hi}` });
}
function sampleIntervals() {
  root = NIL; LOG = false;
  for (let [a, b] of [[12, 18], [3, 7], [22, 27], [1, 4], [10, 15], [14, 16], [30, 34], [6, 9], [20, 21], [33, 38]]) addInterval(a, b); // 見本の 10 区間
  clearFrames(); showFrame('節点 = [low, high]、下の数字 = max。時間軸をドラッグして重なる区間を探そう');
}
function overlap(x, i) { return x.key <= i.high && i.low <= x.high; }
function intervalSearch(i) {
  query = i;
  showFrame(`区間 [${i.low}, ${i.high}] と重なるものを探す`);
  let x = root;
  while (x !== NIL && !overlap(x, i)) {
    if (x.left !== NIL && x.left.max >= i.low) { showFrame(`[${x.label}] は重ならない。左の max = ${x.left.max} ≥ ${i.low} → 左へ`, [x.key]); x = x.left; }
    else { showFrame(`[${x.label}] は重ならない。左の max ${x.left === NIL ? 'なし' : '= ' + x.left.max} < ${i.low} → 右へ`, [x.key]); x = x.right; }
  }
  if (x === NIL) showFrame('NIL に着いた → 重なる区間はない');
  else showFrame(`[${x.label}] が重なる！`, [x.key]);
}
function draw() {
  background(18, 16, 26);
  updateFrames();
  noStroke(); fill(240); textAlign(LEFT, TOP); textSize(26);
  text('区間木（max で拡張した赤黒木）', 30, 24);
  fill(180, 170, 210); textSize(15);
  text('時間軸をドラッグ = 調べる区間　Q = ランダムに調べる　スペース = 区間を追加　F = 見本の区間　クリック = 削除　C = 空に　P / ← →', 30, 60);
  TREE_TOP = 120; TREE_BOTTOM = height * 0.42 + 40;
  lastPos = drawTreeFrames({ label: (k, nd) => nd.label, sub: (k, nd) => 'max ' + nd.max });
  // 時間軸と区間
  let ax = 60, aw = width - 120, ay = height * 0.62;
  let X = (v) => ax + (v / maxCoord) * aw;
  stroke(90); strokeWeight(1); line(ax, ay, ax + aw, ay);
  noStroke(); fill(130); textSize(11); textAlign(CENTER, TOP);
  for (let v = 0; v <= maxCoord; v += 5) text(v, X(v), ay + 4);
  let f = currentFrame(), ints = [];
  (function w(x) { if (x === NIL) return; w(x.left); ints.push(x); w(x.right); })(root);
  let rowH = min(18, (height - ay - 120) / max(1, ints.length));
  ints.forEach((x, r) => {
    let hl = f && f.hl.includes(String(x.key));
    let ov = query && overlap(x, query);
    fill(hl ? color(255, 214, 90) : ov ? color(120, 220, 160) : color(110, 120, 200));
    rect(X(x.key), ay + 22 + r * rowH, max(4, X(x.high) - X(x.key)), rowH - 4, 3);
  });
  let q = drag ? { low: min(drag.a, drag.b), high: max(drag.a, drag.b) } : query;
  if (q) {
    fill(255, 214, 90, 50); rect(X(q.low), ay - 30, max(3, X(q.high) - X(q.low)), height - ay - 60);
    fill(255, 214, 90); textAlign(LEFT, BOTTOM); textSize(14);
    text(`調べる区間 [${q.low}, ${q.high}]（緑 = 本当に重なる区間）`, X(q.low), ay - 34);
  }
  drawFrameMessage(height - 70);
}
function coordAt(mx) { return constrain(round(((mx - 60) / (width - 120)) * maxCoord), 0, maxCoord); }
function mousePressed() {
  if (mouseY > height * 0.6) { drag = { a: coordAt(mouseX), b: coordAt(mouseX) }; return; }
  for (let kk in lastPos) if (dist(mouseX, mouseY, lastPos[kk][0], lastPos[kk][1]) < 22) { skipToEnd(); LOG = false; rbDelete(+kk); showFrame(`low = ${kk} の区間を削除`); return; }
}
function mouseDragged() { if (drag) drag.b = coordAt(mouseX); }
function mouseReleased() {
  if (!drag) return;
  let i = { low: min(drag.a, drag.b), high: max(drag.a, drag.b) };
  drag = null; skipToEnd(); intervalSearch(i);
}
function keyPressed() {
  if (key === RIGHT_ARROW) { stepForward(); return; }
  if (key === LEFT_ARROW) { stepBack(); return; }
  let k = key.toLowerCase();
  if (k === 'p') { playing = !playing; return; }
  skipToEnd(); LOG = false;
  if (k === 'q') { let lo = floor(random(maxCoord - 3)); intervalSearch({ low: lo, high: lo + floor(random(4)) }); }
  if (key === ' ') {
    for (let t = 0; t < 20; t++) { let lo = floor(random(maxCoord - 2)), hi = min(maxCoord, lo + floor(random(1, 9))); if (countNodes(root) < 24 && addInterval(lo, hi)) { showFrame(`[${lo}, ${hi}] を追加（max は通り道と回転した所だけ更新）`, [lo]); break; } }
  }
  if (k === 'f') sampleIntervals();
  if (k === 'c') { root = NIL; query = null; showFrame('空にしました'); }
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. [19, 21] を調べる → [20, 21] が見つかる。通った節点はいくつ？
// 2. [19, 19] を調べる → どれとも重ならない。それでも 1 本道で「ない」とわかる
// 3. 重なる区間を「全部」列挙するには？（左右の両方に行く必要がある所だけ両方へ）


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
