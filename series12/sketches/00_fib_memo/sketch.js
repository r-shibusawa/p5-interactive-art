// ============================================
// 00 フィボナッチの呼び出し木：同じ計算を何度もしていない？
// fib(n) = fib(n-1) + fib(n-2)。そのまま再帰すると同じ fib(k) を何度も計算する（部分問題の重複）
// 一度計算した答えを表にメモすると、呼び出しが激減する。これが動的計画法（DP）の出発点
// 1 = 素朴な再帰 / 2 = メモ化 / 3 = ボトムアップ / ←→ = n / スペース = 再生・停止 / R = 最初から
// ============================================

let n = 7;            // ★ 最初の n（素朴な再帰は 11 くらいまで）
let speedScale = 1;   // ★ アニメの速さ（2 にすると倍速）

let mode = 1;
let nodes = [], events = [], t = 0, playing = true;
let leaves = 1, maxDepth = 1, callCount = [];

const BG = '#16111c', PANEL = '#231a2b', FG = '#f3eaf0', MUTED = '#9a8aa3';
const RASP = '#ff6b8b', CYAN = '#5ee6e0', AMBER = '#ffc857';

function setup() {
  createCanvas(windowWidth, windowHeight);
  rebuild();
}

function rebuild() {
  nodes = []; events = []; t = 0;
  callCount = new Array(n + 1).fill(0);
  if (mode === 3) {
    for (let i = 0; i <= n; i++) events.push({ type: 'fill', k: i });
    return;
  }
  let leafNo = 0, memo = {};
  maxDepth = 0;
  function call(k, depth, parent) {
    let node = { k, depth, parent, kids: [], hit: false, val: 0, enter: events.length };
    nodes.push(node);
    events.push({ type: 'enter', node });
    if (parent) parent.kids.push(node);
    maxDepth = max(maxDepth, depth);
    if (mode === 2 && memo[k] !== undefined) {
      node.hit = true; node.val = memo[k];      // メモに答えがある → 計算しない
    } else if (k < 2) {
      node.val = k;
    } else {
      let a = call(k - 1, depth + 1, node).val;
      let b = call(k - 2, depth + 1, node).val;
      node.val = a + b;
    }
    if (mode === 2) memo[k] = node.val;
    if (node.kids.length === 0) node.x = leafNo++;
    else node.x = (node.kids[0].x + node.kids[node.kids.length - 1].x) / 2;
    node.exit = events.length;
    events.push({ type: 'exit', node });
    return node;
  }
  call(n, 0, null);
  leaves = max(1, leafNo);
}

function draw() {
  background(BG);
  if (playing && t < events.length) t = min(events.length, t + max(0.15, events.length / 500) * speedScale);
  let shown = floor(t);

  noStroke(); fill(FG); textAlign(LEFT, TOP); textSize(26);
  let names = ['', '素朴な再帰', 'メモ化（トップダウン）', 'ボトムアップ（表を左から埋める）'];
  text(`fib(${n}) を計算する ─ ${names[mode]}`, 32, 24);
  textSize(15); fill(MUTED);
  text('1 素朴 / 2 メモ化 / 3 ボトムアップ　←→ n　スペース 再生・停止　R 最初から', 32, 60);

  if (mode === 3) drawBottomUp(shown);
  else drawTree(shown);
}

function drawTree(shown) {
  let W = width * 0.68, top = 130, bottom = height - 60;
  let dy = min(80, (bottom - top) / max(1, maxDepth));
  let r = constrain((W - 60) / leaves * 0.8, 8, 36);
  let px = (nd) => leaves === 1 ? W / 2 : map(nd.x, 0, leaves - 1, 40, W - 20);
  let py = (nd) => top + nd.depth * dy;

  let calls = 0, hits = 0;
  for (let i = 0; i < callCount.length; i++) callCount[i] = 0;
  for (let nd of nodes) {
    if (nd.enter > shown) continue;
    calls++;
    if (nd.hit) hits++; else callCount[nd.k]++;
    if (nd.parent) { stroke(255, 255, 255, 50); strokeWeight(1.5); line(px(nd), py(nd), px(nd.parent), py(nd.parent)); }
  }
  for (let nd of nodes) {
    if (nd.enter > shown) continue;
    let done = nd.exit <= shown;
    noStroke();
    if (nd.hit) fill(CYAN);
    else if (!done) fill(AMBER);
    else fill(color(RASP));
    circle(px(nd), py(nd), r);
    if (r > 16) {
      fill(BG); textAlign(CENTER, CENTER); textSize(min(16, r * 0.45));
      text(nd.k, px(nd), py(nd));
    }
  }

  // 右のパネル：fib(k) が何回計算されたか
  let x0 = W + 20, w = width - x0 - 24;
  noStroke(); fill(PANEL); rect(x0, 110, w, height - 150, 12);
  fill(FG); textAlign(LEFT, TOP); textSize(18);
  text(`呼び出し回数：${calls} / ${nodes.length}`, x0 + 16, 126);
  if (mode === 2) { fill(CYAN); text(`メモから答えた：${hits} 回`, x0 + 16, 152); }
  fill(MUTED); textSize(14);
  text('fib(k) を実際に計算した回数', x0 + 16, 186);
  let rowH = min(26, (height - 260) / (n + 1));
  let mx = max(1, ...callCount);
  for (let k = 0; k <= n; k++) {
    let y = 212 + k * rowH;
    fill(MUTED); textAlign(RIGHT, CENTER); textSize(13);
    text(`fib(${k})`, x0 + 70, y + rowH / 2);
    fill(callCount[k] > 1 ? RASP : CYAN);
    rect(x0 + 78, y + 3, (w - 130) * callCount[k] / mx, rowH - 6, 3);
    fill(FG); textAlign(LEFT, CENTER);
    text(callCount[k], x0 + 84 + (w - 130) * callCount[k] / mx, y + rowH / 2);
  }
  // 凡例
  let ly = height - 34;
  textSize(13); textAlign(LEFT, CENTER);
  fill(AMBER); circle(40, ly, 14); fill(MUTED); text('計算中', 52, ly);
  fill(RASP); circle(130, ly, 14); fill(MUTED); text('答えが出た', 142, ly);
  if (mode === 2) { fill(CYAN); circle(250, ly, 14); fill(MUTED); text('メモを見ただけ', 262, ly); }
}

function drawBottomUp(shown) {
  let cw = min(110, (width - 80) / (n + 1)), y = height * 0.45, x0 = (width - cw * (n + 1)) / 2;
  let f = [0, 1];
  for (let i = 2; i <= n; i++) f[i] = f[i - 1] + f[i - 2];
  for (let i = 0; i <= n; i++) {
    let x = x0 + i * cw;
    let filled = i < shown, cur = i === shown - 1;
    stroke(cur ? AMBER : '#3a2f44'); strokeWeight(cur ? 3 : 1.5);
    fill(filled ? (cur ? '#4a3a20' : PANEL) : BG);
    rect(x + 3, y, cw - 6, cw - 6, 8);
    noStroke(); fill(MUTED); textAlign(CENTER, BOTTOM); textSize(13);
    text(`f[${i}]`, x + cw / 2, y - 6);
    if (filled) { fill(FG); textAlign(CENTER, CENTER); textSize(min(22, cw * 0.28)); text(f[i], x + cw / 2, y + cw / 2 - 3); }
    if (cur && i >= 2) {
      for (let d of [1, 2]) {
        let sx = x0 + (i - d) * cw + cw / 2, ex = x + cw / 2;
        noFill(); stroke(d === 1 ? CYAN : RASP); strokeWeight(2.5);
        let h = 50 + d * 30;
        bezier(sx, y + cw, sx, y + cw + h, ex, y + cw + h, ex, y + cw);
      }
    }
  }
  noStroke(); fill(FG); textAlign(CENTER, TOP); textSize(18);
  text(`足し算の回数：${max(0, min(shown, n + 1) - 2)} 回（素朴な再帰なら ${fibCalls(n)} 回の呼び出し）`, width / 2, y + cw + 120);
  fill(MUTED); textSize(15);
  text('f[i] = f[i-1] + f[i-2] を i の小さい順に。必要な答えはいつも表にある', width / 2, y + cw + 150);
}

function fibCalls(k) { let a = 1, b = 1; for (let i = 2; i <= k; i++) [a, b] = [b, a + b + 1]; return k < 2 ? 1 : b; }

function keyPressed() {
  if (key === '1' || key === '2' || key === '3') {
    mode = int(key);
    if (mode === 1) n = min(n, 11);
    rebuild();
  }
  let lim = mode === 1 ? 11 : mode === 2 ? 22 : 30;
  if (key === RIGHT_ARROW) { n = min(lim, n + 1); rebuild(); }
  if (key === LEFT_ARROW) { n = max(1, n - 1); rebuild(); }
  if (key === ' ') playing = !playing;
  if (key === 'r' || key === 'R') { t = 0; playing = true; }
}

function mousePressed() { playing = !playing; }
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
