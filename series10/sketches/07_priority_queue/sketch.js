// ============================================
// 07 優先度つきキュー
// 「いちばん急ぎの仕事」をすぐ取り出せる箱。中身は最大ヒープ（06）
// INSERT：末尾に入れて、親より大きければ上へ（Θ(log n)）
// EXTRACT-MAX：根を取り出し、末尾を根に置いて沈める（Θ(log n)）
// INCREASE-KEY：値を大きくして上へ。病院の救急、OS のタスク、イベントのシミュレーションで使う
// クリック：ランダムな仕事を追加　スペース：最大を取り出す　ノードをクリック：+30（INCREASE-KEY）
// A：自動（ランダムに来て、順に処理）　C：空にする
// ============================================

let heap = [], doneLog = [], auto = false, anim = [], timer = 0;
let names = ['メール', '会議', '修理', '電話', '書類', '発表', '検査', '発送', '計算', '印刷', '面談', '掃除'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  for (let i = 0; i < 7; i++) insert(floor(random(1, 100)));
  anim = [];
}

function insert(p) {
  heap.push({ p, name: random(names) });
  let i = heap.length - 1;
  anim.push(['add', i]);
  while (i > 0 && heap[parent(i)].p < heap[i].p) {
    [heap[i], heap[parent(i)]] = [heap[parent(i)], heap[i]];
    anim.push(['up', i, parent(i)]);
    i = parent(i);
  }
}

function extractMax() {
  if (heap.length === 0) { doneLog.unshift('（空です）'); return; }
  let top = heap[0];
  let last = heap.pop();
  if (heap.length > 0) {
    heap[0] = last;
    let i = 0;
    while (true) {
      let l = 2 * i + 1, r = 2 * i + 2, m = i;
      if (l < heap.length && heap[l].p > heap[m].p) m = l;
      if (r < heap.length && heap[r].p > heap[m].p) m = r;
      if (m === i) break;
      [heap[i], heap[m]] = [heap[m], heap[i]];
      anim.push(['down', i, m]);
      i = m;
    }
  }
  doneLog.unshift('処理：' + top.name + '（優先度 ' + top.p + '）');
  doneLog = doneLog.slice(0, 12);
}

function increaseKey(i, delta) {
  heap[i].p = min(999, heap[i].p + delta);
  while (i > 0 && heap[parent(i)].p < heap[i].p) {
    [heap[i], heap[parent(i)]] = [heap[parent(i)], heap[i]];
    anim.push(['up', i, parent(i)]);
    i = parent(i);
  }
}

function parent(i) { return floor((i - 1) / 2); }

function pos(i) {
  let depth = floor(Math.log2(i + 1)), idx = i - (Math.pow(2, depth) - 1), cnt = Math.pow(2, depth);
  let W = width - 420;
  return { x: 40 + W * (idx + 0.5) / cnt, y: 150 + depth * 80 };
}

function draw() {
  background(170, 30, 10);
  if (auto) {
    timer++;
    if (timer % 40 === 0 && random() < 0.6) insert(floor(random(1, 100)));
    if (timer % 55 === 0) extractMax();
    if (heap.length > 30) extractMax();
  }
  let flash = anim.length ? anim[anim.length - 1] : null;
  if (frameCount % 20 === 0) anim = [];
  for (let i = 1; i < heap.length; i++) {
    let a = pos(parent(i)), b = pos(i);
    stroke(0, 0, 40); strokeWeight(2); line(a.x, a.y, b.x, b.y);
  }
  for (let i = 0; i < heap.length; i++) {
    let q = pos(i), d = 4 - min(3, floor(Math.log2(i + 1)));
    let sz = 22 + d * 8;
    noStroke();
    fill(map(heap[i].p, 0, 120, 200, 0), 70, 95);
    if (flash && flash.slice(1).includes(i)) fill(45, 100, 100);
    circle(q.x, q.y, sz * 1.6);
    fill(0, 0, 10); textAlign(CENTER, CENTER); textSize(12 + d);
    text(heap[i].p, q.x, q.y - 4);
    textSize(9 + d * 0.5); text(heap[i].name, q.x, q.y + 9);
  }
  // 右：処理した順
  let x0 = width - 360;
  noStroke(); fill(0, 0, 100); textAlign(LEFT, BASELINE); textSize(16);
  text('取り出した順（大きい順になる）', x0, 150);
  textSize(14);
  for (let i = 0; i < doneLog.length; i++) { fill(0, 0, 90 - i * 5); text(doneLog[i], x0, 180 + i * 24); }

  fill(0, 0, 100); textSize(22);
  text('優先度つきキュー　中身 ' + heap.length + ' 個　最大 = ' + (heap.length ? heap[0].p : '—') + (auto ? '　自動運転中' : ''), 20, 40);
  fill(0, 0, 65); textSize(15);
  text('空いた所をクリック：追加　スペース：最大を取り出す　ノードをクリック：+30　A：自動　C：空にする', 20, 68);
  text('どの操作も木の高さ log₂n 回の入れかえで終わる。並べ切るより速く「いま一番」だけわかる', 20, 92);
}

function mousePressed() {
  for (let i = 0; i < heap.length; i++) {
    let q = pos(i);
    if (dist(mouseX, mouseY, q.x, q.y) < 26) { increaseKey(i, 30); return; }
  }
  if (mouseY > 110 && heap.length < 31) insert(floor(random(1, 100)));
}

function keyPressed() {
  if (key === ' ') extractMax();
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'c' || key === 'C') { heap = []; doneLog = []; }
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. 10 個入れてから全部取り出すと、大きい順に並ぶ（= ヒープソート）
// 2. 優先度の小さい順に取り出す「最小ヒープ」にするには？（ダイクストラ法で使う）
// 3. 自動運転で、来る速さと処理の速さを変えて、行列が伸びるか見てみよう
