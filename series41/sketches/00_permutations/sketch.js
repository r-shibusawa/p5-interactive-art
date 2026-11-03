// ============================================
// 00 順列をすべて並べる
// n 個の色玉の並べ方（順列）は n! = n × (n−1) × … × 1 通り
// Heap のアルゴリズム（隣り合わない 2 つを入れ替えていく）で、1 つずつ全部つくる
// ↑↓ = n（3〜6）/ スペース = 一時停止 / L = 辞書順生成と Heap を切り替え / R = 最初から / マウス左右 = 速さ
// ============================================

let n = 4;               // ★ 玉の数（3〜6）
let perm = [];           // いまの順列（0..n-1 の並び）
let hist = [];           // できた順列の記録（表示用）
let total = 1;           // n!
let paused = false;
let useLex = false;      // true なら辞書順（next permutation）
let swapped = [-1, -1];  // 直前に入れ替えた 2 か所（光らせる）
let done = false;
let tick = 0;
let histLayer;           // 順列の一覧を描きためる層
// Heap のアルゴリズム用の状態
let heapC = [], heapI = 1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  histLayer = createGraphics(width, height);
  restart();
}

function restart() {
  perm = [];
  for (let i = 0; i < n; i++) perm.push(i);
  total = factorial(n);
  hist = [];
  heapC = new Array(n).fill(0);
  heapI = 1;
  done = false;
  swapped = [-1, -1];
  histLayer.clear();
  histLayer.colorMode(HSB, 360, 100, 100, 100);
  record();
}

// ★ Heap のアルゴリズム：1 回呼ぶと次の順列に進む（入れ替えは 1 回だけ）
function heapNext() {
  while (heapI < n) {
    if (heapC[heapI] < heapI) {
      let j = heapI % 2 === 0 ? 0 : heapC[heapI];
      [perm[j], perm[heapI]] = [perm[heapI], perm[j]];
      swapped = [j, heapI];
      heapC[heapI]++;
      heapI = 1;
      return true;
    }
    heapC[heapI] = 0;
    heapI++;
  }
  return false;   // 全部できた
}

// ★ 辞書順：後ろから「上がる所」を探して入れ替え、残りを反転
function lexNext() {
  let i = n - 2;
  while (i >= 0 && perm[i] > perm[i + 1]) i--;
  if (i < 0) return false;
  let j = n - 1;
  while (perm[j] < perm[i]) j--;
  [perm[i], perm[j]] = [perm[j], perm[i]];
  swapped = [i, j];
  let a = i + 1, b = n - 1;
  while (a < b) { [perm[a], perm[b]] = [perm[b], perm[a]]; a++; b--; }
  return true;
}

function record() {
  let idx = hist.length;
  hist.push(perm.slice());
  // 一覧に 1 行ぶん描く
  let lay = layout();
  let col = idx % lay.perRow, rowI = Math.floor(idx / lay.perRow);
  let x0 = lay.x + col * lay.tileW, y0 = lay.y + rowI * lay.tileH;
  histLayer.noStroke();
  for (let i = 0; i < n; i++) {
    histLayer.fill(ballHue(perm[i]), 70, 95);
    histLayer.rect(x0 + i * lay.s, y0, lay.s - 1, lay.s - 1);
  }
}

// 一覧の並べ方（n によって大きさを変える）
function layout() {
  let s = n <= 4 ? 14 : n === 5 ? 10 : 7;
  let tileW = n * s + 8, tileH = s + 4;
  let x = 30, y = 250;
  let perRow = Math.max(1, Math.floor((width - 60) / tileW));
  return { s, tileW, tileH, x, y, perRow };
}

function ballHue(v) { return (v * 360) / n + 10; }

function draw() {
  background(230, 30, 10);
  let speed = map(mouseX, 0, width, 2, 30, true);   // 1 秒あたりの順列の数
  if (!paused && !done) {
    tick += speed / 60;
    while (tick >= 1 && !done) {
      tick -= 1;
      let ok = useLex ? lexNext() : heapNext();
      if (ok) record(); else { done = true; swapped = [-1, -1]; }
    }
  }

  // 一覧
  image(histLayer, 0, 0);

  // いまの順列（大きく）
  let r = 56, gap = 16;
  let x0 = width / 2 - ((n * (r + gap)) - gap) / 2 + r / 2, y0 = 160;
  for (let i = 0; i < n; i++) {
    let glow = (i === swapped[0] || i === swapped[1]) ? 1 : 0;
    noStroke();
    if (glow) { fill(50, 80, 100, 40); circle(x0 + i * (r + gap), y0, r + 22); }
    fill(ballHue(perm[i]), 70, 95);
    circle(x0 + i * (r + gap), y0, r);
    fill(0, 0, 15);
    textAlign(CENTER, CENTER);
    textSize(22);
    text(perm[i] + 1, x0 + i * (r + gap), y0);
  }
  textAlign(LEFT, BASELINE);

  // 説明
  noStroke();
  fill(0, 0, 100);
  textSize(18);
  let formula = [];
  for (let i = n; i >= 1; i--) formula.push(i);
  text('n = ' + n + '（↑↓）　' + n + '! = ' + formula.join(' × ') + ' = ' + total + '　できた数：' + hist.length + ' / ' + total +
       '　方式：' + (useLex ? '辞書順' : 'Heap') + '（L）　' + (paused ? '一時停止中' : '') + (done ? '　完了！ R でもう一度' : ''), 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text(useLex ? '辞書順：後ろから見て「上がる場所」を見つけ、そこを入れ替えて残りを反転する。並びがきれいに増えていく'
              : 'Heap のアルゴリズム：毎回 2 つだけ入れ替える。同じ順列は 2 度と出ない（マウス左右で速さ、スペースで一時停止）', 20, 68);
  fill(0, 0, 45);
  text('できた順列の一覧（1 行 = 1 つの順列）', 30, 240);
}

function keyPressed() {
  if (key === UP_ARROW && n < 6) { n++; restart(); }
  if (key === DOWN_ARROW && n > 3) { n--; restart(); }
  if (key === ' ') paused = !paused;
  if (key === 'l' || key === 'L') { useLex = !useLex; restart(); }
  if (key === 'r' || key === 'R') restart();
}

// ---------- やってみよう ----------
// 1. n を 3 → 4 → 5 → 6 と増やすと、できる数は 6 → 24 → 120 → 720。一覧の長さの増え方を見よう
// 2. 辞書順（L）では一覧がきれいに並ぶ。Heap ではどう見える？ どちらも全部の順列を 1 回ずつ通る
// 3. 「1 番の玉が先頭にある順列」だけ数えると (n−1)! になるはず。一覧から数えてみよう
// 4. ballHue を変えて、2 色（同じ色の玉が 2 個）にしたら「見かけ上ちがう並び」はいくつ？（n!/2!）

// ---------- 道具 ----------
function factorial(k) { let f = 1; for (let i = 2; i <= k; i++) f *= i; return f; }
