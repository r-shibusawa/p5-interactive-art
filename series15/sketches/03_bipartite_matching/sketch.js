// ============================================
// 03 2 部グラフの最大マッチング（フローで解く）
// 左 = 人、右 = 仕事。線 = 「その仕事ができる」。1 人 1 つ、1 つの仕事に 1 人で、なるべく多くペアを作る
// s → 人 → 仕事 → t に容量 1 のパイプをつなぐと、最大フロー = 最大マッチング
// 増加道は「マッチしていない線」と「マッチしている線（逆向き = ペアを解消）」を交互にたどる
// スペース = 1 手 / A = 自動 / 左の点 → 右の点 とクリック = 線を足す・消す / R = ランダム / C = 線を全部消す
// ============================================

let L = ['Aさん', 'Bさん', 'Cさん', 'Dさん', 'Eさん', 'Fさん'];
let R = ['料理', '会計', '設計', '接客', '運転', '翻訳'];
let adj = [];       // adj[i] = 人 i ができる仕事
let matchL = [], matchR = [];
let path = null, phase = 'find', auto = false, timer = 0;
let picked = -1;
let count = 0;
let message = '';

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  randomGraph();
}

function randomGraph() {
  adj = L.map(() => R.map(() => random() < 0.32).map((b, j) => (b ? j : -1)).filter((j) => j >= 0));
  // 「欲張りに選ぶと詰まる」形を少し混ぜる
  adj[0] = [0, 1]; adj[1] = [0];
  resetMatch();
}

function resetMatch() {
  matchL = L.map(() => -1); matchR = R.map(() => -1);
  path = null; phase = 'find'; count = 0; message = 'スペースで、空いている人から増加道を探す';
}

function lx(i) { return width * 0.3; }
function ly(i) { return map(i, 0, L.length - 1, height * 0.2, height * 0.85); }
function rx(j) { return width * 0.7; }
function ry(j) { return map(j, 0, R.length - 1, height * 0.2, height * 0.85); }

// 増加道を幅優先で探す：左（未マッチ）→ 右 →（マッチの線で戻る）→ 左 → … → 右（未マッチ）
function findAugmenting() {
  let prevR = R.map(() => -1), seenL = L.map(() => false);
  let q = [];
  for (let i = 0; i < L.length; i++) if (matchL[i] < 0) { q.push(i); seenL[i] = true; }
  while (q.length) {
    let i = q.shift();
    for (let j of adj[i]) {
      if (prevR[j] >= 0 || matchL[i] === j) continue;
      prevR[j] = i;
      if (matchR[j] < 0) return cleanPath(j, prevR);
      let k = matchR[j];
      if (!seenL[k]) { seenL[k] = true; q.push(k); }
    }
  }
  return null;
}

// 右の終点 j から、prevR とマッチをたどって交互道を作る
function cleanPath(j, prevR) {
  let p = [];
  while (true) {
    let i = prevR[j];
    p.unshift({ i, j, matched: false });
    let back = matchL[i];
    if (back < 0) break;
    p.unshift({ i, j: back, matched: true });
    j = back;
  }
  return p;
}

function advance() {
  if (phase === 'find') {
    path = findAugmenting();
    if (!path) { phase = 'done'; auto = false; message = '増加道なし → 最大マッチング ' + count + ' 組（= 最大フロー）'; return; }
    phase = 'flip';
    message = '増加道（黄）：点線 = 今ペアの線 → 解消、実線 = 新しくペアに。ペアが 1 組増える';
  } else if (phase === 'flip') {
    for (let s of path) if (s.matched) { matchL[s.i] = -1; matchR[s.j] = -1; }
    for (let s of path) if (!s.matched) { matchL[s.i] = s.j; matchR[s.j] = s.i; }
    count++; path = null; phase = 'find';
    message = 'ペア ' + count + ' 組。次の増加道を探す';
  }
}

function draw() {
  background(255, 30, 9);
  if (auto && ++timer % 45 === 0) advance();
  // s と t（フローの見方）
  let sx = width * 0.1, tx = width * 0.9, cy = height * 0.52;
  for (let i = 0; i < L.length; i++) { stroke(140, 50, matchL[i] >= 0 ? 80 : 30); strokeWeight(matchL[i] >= 0 ? 3 : 1); line(sx, cy, lx(i), ly(i)); }
  for (let j = 0; j < R.length; j++) { stroke(20, 50, matchR[j] >= 0 ? 80 : 30); strokeWeight(matchR[j] >= 0 ? 3 : 1); line(rx(j), ry(j), tx, cy); }
  for (let i = 0; i < L.length; i++) for (let j of adj[i]) {
    let m = matchL[i] === j;
    stroke(m ? color(195, 80, 100) : color(255, 15, 45)); strokeWeight(m ? 7 : 2);
    line(lx(i), ly(i), rx(j), ry(j));
  }
  if (path) for (let s of path) {
    stroke(50, 90, 100); strokeWeight(5);
    if (s.matched) drawingContext.setLineDash([10, 8]);
    line(lx(s.i), ly(s.i), rx(s.j), ry(s.j));
    drawingContext.setLineDash([]);
  }
  noStroke();
  fill(140, 70, 85); circle(sx, cy, 44); fill(20, 75, 95); circle(tx, cy, 44);
  fill(0, 0, 10); textAlign(CENTER, CENTER); textSize(18); text('s', sx, cy); text('t', tx, cy);
  for (let i = 0; i < L.length; i++) node(lx(i), ly(i), L[i], matchL[i] >= 0, picked === i);
  for (let j = 0; j < R.length; j++) node(rx(j), ry(j), R[j], matchR[j] >= 0, false);
  textAlign(LEFT, BASELINE);
  fill(0, 0, 100); textSize(18);
  text('スペース：1 手　A：自動　左→右とクリックで線を足す・消す　R：ランダム　C：線を全部消す', 20, 36);
  textSize(15); fill(0, 0, 65);
  text('細い線 s→人、仕事→t、人→仕事 はすべて容量 1。太い青 = マッチング（流れ 1）', 20, 62);
  fill(45, 80, 100); textSize(20); text(message, 20, height - 26);
  fill(0, 0, 100); textSize(30); textAlign(RIGHT, BASELINE); text(count + ' 組', width - 30, 50); textAlign(LEFT, BASELINE);
}

function node(x, y, s, on, sel) {
  fill(sel ? color(50, 90, 100) : on ? color(195, 60, 95) : color(255, 10, 85));
  rectMode(CENTER); rect(x, y, 96, 40, 20); rectMode(CORNER);
  fill(0, 0, 10); textSize(16); text(s, x, y);
}

function mousePressed() {
  for (let i = 0; i < L.length; i++) if (abs(mouseX - lx(i)) < 50 && abs(mouseY - ly(i)) < 22) { picked = i; return; }
  for (let j = 0; j < R.length; j++) if (abs(mouseX - rx(j)) < 50 && abs(mouseY - ry(j)) < 22 && picked >= 0) {
    let k = adj[picked].indexOf(j);
    if (k >= 0) adj[picked].splice(k, 1); else adj[picked].push(j);
    picked = -1; resetMatch(); return;
  }
  picked = -1;
}

function keyPressed() {
  if (key === ' ') advance();
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'r' || key === 'R') randomGraph();
  if (key === 'c' || key === 'C') { adj = L.map(() => []); resetMatch(); }
}

// ---------- やってみよう ----------
// 1. Aさん→料理 を先に選ぶと Bさん が困る。増加道は「Aさん、会計に移って」と自動で譲らせる
// 2. 全員がペアになれない線の引き方を作る（ホールの定理：k 人ができる仕事が k 個未満だと無理）
// 3. 1 回に 1 本ずつではなく、何本も同時に増やすのが 04 ホップクロフト＝カープ法
