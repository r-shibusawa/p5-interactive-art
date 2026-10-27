// ============================================
// 14 木の音楽（自由制作のベース）🔊
// キー（1〜99）を音の高さにして赤黒木に入れる。入れるたびに「探索の道のり」がメロディになる
// スペースで木をなぞって演奏：中間順なら必ず「下から上へ」の音階になる（二分探索木の性質を耳で聞く）
// 操作：クリック = その横位置の高さの音を木に入れる / スペース = なぞって演奏 / W = なぞり方を変える
//       A = 自動作曲（ランダムに入れ続ける）/ C = 空に / 数字 + Enter = その数を入れる
// ============================================
// ★ のついた数字を変えて、自分の「データ構造の音楽」に！

let scaleSteps = [0, 2, 4, 7, 9];  // ★ 音階（ペンタトニック）。[0, 2, 4, 5, 7, 9, 11] で長音階
let baseMidi = 48;            // ★ いちばん低い音（48 = C3）
let tempo = 9;                // ★ 何フレームごとに 1 音鳴らすか
let wave = 'triangle';        // ★ 音色 'sine' 'square' 'sawtooth' 'triangle'
let maxNodes = 40;            // ★ 木の大きさの上限

let queue = [], pulse = {}, walkType = 0, auto = false, buf = '', lastPos = {};
let walkNames = ['中間順（小さい順＝上がっていく音階）', '先行順（根から）', '後行順（葉から）'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(RGB);
  holdFrames = 0; animSpeed = 0.12;
  root = NIL; LOG = false;
  for (let k of [50, 25, 75, 12, 37, 62, 88]) rbInsert(k);
  recordFrame(root, isNil, 'クリックで音を木に入れよう。スペースで演奏');
}
function keyToMidi(k) {
  let idx = floor(map(k, 1, 99, 0, scaleSteps.length * 3 - 0.001));
  return baseMidi + 12 * floor(idx / scaleSteps.length) + scaleSteps[idx % scaleSteps.length];
}
let palette = [];
function keyColor(k) {
  if (!palette.length) { colorMode(HSB, 360, 100, 100); for (let i = 0; i <= 100; i++) { let c = color(map(i, 1, 99, 200, 400) % 360, 70, 95); palette.push(c); } colorMode(RGB); palette = palette.map((c) => [red(c), green(c), blue(c)]); }
  return palette[constrain(round(k), 0, 100)];
}

function addKey(k) {
  // 探索の道のりをメロディとして鳴らす
  let x = root;
  while (x !== NIL && x.key !== k) { queue.push(x.key); x = k < x.key ? x.left : x.right; }
  queue.push(k);
  if (x === NIL && countNodes(root) < maxNodes) rbInsert(k);
  recordFrame(root, isNil, `${k} を入れた：道のり ${queue.length} 音`, [k]);
}
function playWalk() {
  let out = [];
  (function w(x) { if (x === NIL) return; if (walkType === 1) out.push(x.key); w(x.left); if (walkType === 0) out.push(x.key); w(x.right); if (walkType === 2) out.push(x.key); })(root);
  queue.push(...out);
  recordFrame(root, isNil, walkNames[walkType] + ' で演奏');
}

function draw() {
  background(10, 10, 18);
  updateFrames();
  if (auto && frameCount % (tempo * 6) === 0) { if (countNodes(root) >= maxNodes) { root = NIL; } addKey(floor(random(1, 100))); }
  if (frameCount % tempo === 0 && queue.length) {
    let k = queue.shift();
    playNote(noteToFreq(keyToMidi(k)), 0.25, tempo / 30, wave);
    pulse[k] = 1;
  }
  noStroke(); fill(240); textAlign(LEFT, TOP); textSize(26);
  text('木の音楽', 30, 24);
  fill(170, 170, 210); textSize(15);
  text('クリック = 音を入れる　スペース = 演奏　W = なぞり方　A = 自動作曲 ' + (auto ? 'ON' : 'OFF') + '　C = 空に　数字 + Enter', 30, 60);
  fill(255); textSize(16); text('なぞり方：' + walkNames[walkType] + '　入力：' + buf, 30, 88);
  // 横軸 = 音の高さの目安
  for (let k = 1; k < 100; k += 1) { let c = keyColor(k); fill(c[0], c[1], c[2], 40); rect(map(k, 1, 99, 50, width - 50), height - 44, (width - 100) / 99 + 1, 14); }
  lastPos = drawTreeFrames({ fill: (nd, k) => keyColor(+k) });
  // 鳴った節点を光らせる
  for (let k in pulse) {
    if (lastPos[k]) { let c = keyColor(+k); noFill(); stroke(c[0], c[1], c[2], 255 * pulse[k]); strokeWeight(3); circle(lastPos[k][0], lastPos[k][1], 40 + (1 - pulse[k]) * 60); }
    pulse[k] -= 0.04; if (pulse[k] <= 0) delete pulse[k];
  }
  noStroke(); fill(255, 225, 140); textAlign(LEFT, TOP); textSize(16);
  if (frames.length) text(frames[cur].msg, 30, height - 80);
}
function mousePressed() {
  startAudio();
  if (mouseY < 110) return;
  addKey(constrain(round(map(mouseX, 50, width - 50, 1, 99)), 1, 99));
}
function keyPressed() {
  startAudio();
  if (key >= '0' && key <= '9') { if (buf.length < 2) buf += key; return; }
  if (key === BACKSPACE) { buf = buf.slice(0, -1); return; }
  if (key === ENTER && buf) { let v = constrain(int(buf), 1, 99); addKey(v); buf = ''; }
  let k = key.toLowerCase();
  if (key === ' ') playWalk();
  if (k === 'w') walkType = (walkType + 1) % 3;
  if (k === 'a') auto = !auto;
  if (k === 'c') { root = NIL; queue = []; recordFrame(root, isNil, '空にしました'); }
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. 中間順の演奏は何を入れても「上がっていく音階」。先行順・後行順は木の形でメロディが変わる
// 2. scaleSteps を [0, 3, 5, 7, 10]（ブルース風）や [0, 1, 5, 7, 8]（都節）に
// 3. 赤黒木のかわりに 08 の普通の二分探索木を使うと、入れる順番で形（＝曲）が大きく変わる


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


// ==================================================
// ここから下は「音を鳴らすための道具」です
// ==================================================
let audioCtx, masterOut;
function startAudio() {
  if (!audioCtx) { audioCtx = new AudioContext(); masterOut = audioCtx.createDynamicsCompressor(); masterOut.connect(audioCtx.destination); }
  audioCtx.resume();
}
function playNote(freqHz, volume = 0.3, duration = 0.3, type = 'triangle', when) {
  if (!audioCtx) return;
  let t = when === undefined ? audioCtx.currentTime : when;
  let osc = audioCtx.createOscillator(), amp = audioCtx.createGain();
  osc.type = type; osc.frequency.value = freqHz;
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(volume, t + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(amp); amp.connect(masterOut); osc.start(t); osc.stop(t + duration + 0.05);
}
function noteToFreq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }
