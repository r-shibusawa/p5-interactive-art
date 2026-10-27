// ============================================
// 14 オフライン最小値問題 ─ 先に全部の命令を知っていれば
// 「挿入（数字）」と「最小値を取り出す（E）」の列が最初から全部わかっているとき、どの E が何を取り出すかを互いに素な集合で求める
// E で区切ったブロック K₁, K₂, … を集合にする。小さい数 i から順に：i の入ったブロック K_j の E が i を取り出す → K_j を次のブロックに合併
// スペース = 1 歩進める / A = 自動再生 / N = 新しい命令列 / R = 最初から
// ============================================

let NKEYS = 9;        // ★ 挿入する数の個数（1〜n を 1 回ずつ）
let SPEED = 0.9;      // ★ 自動再生の秒数

let seq = [], m = 0;
let blockOf = [], members = [];
let parent = [], blockLabel = [], exists = [], nextB = [];
let extracted = [], i = 0, phase = 0, msg = '', hiBlock = -1, hiKey = -1, mergeTo = -1;
let auto = false, timer = 0;
let pos = {};

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  seq = [6, 3, 'E', 8, 1, 'E', 'E', 9, 4, 'E', 2, 7, 'E', 5, 'E'];   // 最初の例（N で新しい列）
  restart();
}

function newSequence() {
  let keys = [...Array(NKEYS).keys()].map((k) => k + 1);
  for (let a = keys.length - 1; a > 0; a--) { let b = floor(random(a + 1)); [keys[a], keys[b]] = [keys[b], keys[a]]; }
  seq = []; let inHeap = 0;
  for (let k of keys) {
    seq.push(k); inHeap++;
    while (inHeap > 0 && random() < 0.45) { seq.push('E'); inHeap--; }
  }
  restart();
}

function find(x) { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }

function restart() {
  m = seq.filter((s) => s === 'E').length;
  // ブロック番号 1..m+1。要素 = 数 1..n と、各ブロックの代表（空のブロック用）n+1..n+m+1
  let n = seq.filter((s) => s !== 'E').length;
  NKEYS = n;
  parent = [...Array(n + m + 2).keys()];
  blockLabel = []; exists = []; nextB = [];
  let b = 1;
  for (let j = 1; j <= m + 1; j++) { blockLabel[n + j] = j; exists[j] = true; nextB[j] = j + 1; }
  for (let s of seq) {
    if (s === 'E') b++;
    else parent[s] = n + b;      // 数 s をブロック b の集合へ
  }
  extracted = Array(m + 2).fill(null);
  i = 0; phase = 0; hiBlock = -1; hiKey = -1; mergeTo = -1;
  msg = `ブロック K₁〜K${sub(m + 1)} が集合。小さい数 1 から順に見ていく`;
}
function sub(n) { return String(n).split('').map((c) => '₀₁₂₃₄₅₆₇₈₉'[+c]).join(''); }
function blockOfKey(k) { return blockLabel[find(k)]; }

function advance() {
  let n = NKEYS;
  if (i >= n && phase === 0) { msg = '完了！ 下の「確かめ」と同じ答えになったか見てみよう'; hiBlock = -1; hiKey = -1; return; }
  if (phase === 0) {
    i++; hiKey = i;
    let j = blockOfKey(i); hiBlock = j;
    if (j === m + 1) { msg = `${i} は最後のブロック K${sub(m + 1)} → どの E にも取り出されない`; mergeTo = -1; phase = 0; return; }
    extracted[j] = i;
    msg = `FIND-SET(${i}) → K${sub(j)}。ブロック K${sub(j)} のすぐ後の E（${j} 番目）が ${i} を取り出す`;
    phase = 1;
  } else {
    let j = hiBlock, l = nextB[j];
    while (!exists[l]) l = nextB[l];
    // K_l = K_j ∪ K_l
    let rj = find(n + j), rl = find(n + l);
    parent[rj] = rl; blockLabel[rl] = l;
    exists[j] = false;
    msg = `K${sub(j)} を次に残っているブロック K${sub(l)} に合併（UNION）。${j} 番目の E はもう使い終わった`;
    mergeTo = l; phase = 0;
  }
}

// 確かめ：本当にヒープで順に実行する
function onlineAnswer() {
  let h = [], out = [];
  for (let s of seq) { if (s === 'E') { h.sort((a, b) => a - b); out.push(h.length ? h.shift() : '空'); } else h.push(s); }
  return out;
}

function draw() {
  background(300, 25, 9);
  if (auto) { timer += deltaTime / 1000; if (timer > SPEED) { timer = 0; advance(); } }
  let n = NKEYS;
  // 命令列
  let tw = min(58, (width - 60) / seq.length), tx0 = width / 2 - (seq.length * tw) / 2, ty = 130;
  let eCount = 0, blockX = {}, bStart = tx0;
  textAlign(CENTER, CENTER);
  seq.forEach((s, q) => {
    let x = tx0 + q * tw;
    if (s === 'E') {
      eCount++;
      blockX[eCount] = [bStart, x];
      bStart = x + tw;
      let ans = extracted[eCount];
      noStroke(); fill(ans !== null ? color(50, 85, 100) : color(300, 30, 35)); rect(x + 3, ty, tw - 6, 44, 6);
      fill(ans !== null ? color(0, 0, 10) : color(0, 0, 100)); textSize(16); text('E', x + tw / 2, ty + 14);
      textSize(13); text(ans !== null ? ans : '?', x + tw / 2, ty + 32);
    } else {
      noStroke(); fill(300, 20, 22); rect(x + 3, ty, tw - 6, 44, 6);
      fill(0, 0, 85); textSize(18); text(s, x + tw / 2, ty + 22);
    }
  });
  blockX[m + 1] = [bStart, tx0 + seq.length * tw];
  textAlign(LEFT, TOP); fill(0, 0, 70); textSize(13); noStroke(); text('命令列（左から実行）', tx0, ty - 22);

  // ブロック（集合）
  let by = 250, bh = 150;
  let cnt = {};
  for (let k = 1; k <= n; k++) { let j = blockOfKey(k); cnt[j] = (cnt[j] || 0) + 1; }
  for (let j in cnt) { let [a, b] = blockX[j], w = max(tw * 0.9, b - a - 6); bh = max(bh, 60 + ceil(cnt[j] / max(1, floor(w / 34))) * 34); }
  for (let j = 1; j <= m + 1; j++) {
    let [a, b] = blockX[j];
    let w = max(tw * 0.9, b - a - 6);
    let alive = exists[j];
    stroke(hiBlock === j ? color(50, 90, 100) : mergeTo === j ? color(140, 70, 90) : color(300, 30, alive ? 50 : 20));
    strokeWeight(hiBlock === j || mergeTo === j ? 3 : 1.2);
    fill(300, 25, alive ? 16 : 10);
    if (!alive) drawingContext.setLineDash([4, 5]);
    rect(a + 3, by, w, bh, 8);
    drawingContext.setLineDash([]);
    noStroke(); fill(0, 0, alive ? 85 : 35); textAlign(CENTER, TOP); textSize(14);
    text(`K${sub(j)}`, a + 3 + w / 2, by + 6);
  }
  // 数のチップ（集合の中を動く）
  let count = {};
  for (let k = 1; k <= n; k++) {
    let j = blockOfKey(k);
    count[j] = (count[j] || 0) + 1;
    let [a, b] = blockX[j], w = max(tw * 0.9, b - a - 6);
    let cols = max(1, floor(w / 34)), idx = count[j] - 1;
    let tx = a + 3 + 20 + (idx % cols) * 34, tyy = by + 46 + floor(idx / cols) * 34;
    if (!pos[k]) pos[k] = { x: tx, y: tyy };
    pos[k].x = lerp(pos[k].x, tx, 0.12); pos[k].y = lerp(pos[k].y, tyy, 0.12);
    let done = k <= i;
    noStroke();
    fill(k === hiKey ? color(50, 90, 100) : done ? color(300, 15, 35) : color((k * 40) % 360, 50, 80));
    circle(pos[k].x, pos[k].y, 30);
    fill(k === hiKey ? color(0, 0, 10) : color(0, 0, done ? 60 : 10)); textAlign(CENTER, CENTER); textSize(14); text(k, pos[k].x, pos[k].y);
  }

  // 結果
  let ry = by + bh + 50;
  textAlign(LEFT, TOP); fill(0, 0, 100); textSize(16);
  text(`extracted 配列：[ ${extracted.slice(1, m + 1).map((v) => (v === null ? '·' : v)).join(', ')} ]`, 30, ry);
  fill(0, 0, 70); text(`確かめ（ヒープで順に実行）：[ ${onlineAnswer().join(', ')} ]`, 30, ry + 30);

  fill(0, 0, 100); textSize(26); text('オフライン最小値問題', 24, 18);
  textSize(15); fill(0, 0, 80);
  text(`挿入 n = ${n}、取り出し m = ${m}。FIND-SET と UNION だけで、全体が O(n α(n))（ヒープなら O(n lg n)）`, 24, 56);
  fill(50, 80, 100); textSize(17); text(msg, 24, 86);
  fill(0, 0, 60); textSize(14);
  text(`スペース = 1 歩 / A = 自動再生${auto ? '（ON）' : ''} / N = 新しい命令列 / R = 最初から`, 24, height - 30);
}

function keyPressed() {
  if (key === ' ') { advance(); return false; }
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'n' || key === 'N') { pos = {}; newSequence(); }
  if (key === 'r' || key === 'R') restart();
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }
