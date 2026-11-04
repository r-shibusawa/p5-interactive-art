// ============================================
// 11 ラテン方格と魔方陣
// ラテン方格：n×n のマスに n 種類の記号を、どの行・どの列にも 1 回ずつ置く（数独のルール）
// 2 つのラテン方格を重ねてすべてのペアが 1 回ずつ現れるとき「直交」（グレコ・ラテン方格）
// 直交する 2 つから魔方陣（行・列・対角線の和が全部同じ）がつくれる
// ↑↓ = n（3〜7）/ 1 = ラテン方格 / 2 = グレコ・ラテン方格 / 3 = 魔方陣 / スペース = 行をシャッフル（ラテン方格のまま）
// ============================================

let n = 5;            // ★ 大きさ
let view = 2;         // 1: ラテン方格, 2: 直交ペア, 3: 魔方陣
let A = [], B = [];   // 2 つのラテン方格（0〜n−1）
let rowOrder = [];    // 行の並べ替え（シャッフル用）
let hasPair = true;
let symbols = ['●', '▲', '■', '◆', '★', '✚', '♥'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  build();
}

// ★ 直交するラテン方格のペアをつくる
function build() {
  A = []; B = []; hasPair = true;
  rowOrder = [];
  for (let i = 0; i < n; i++) rowOrder.push(i);
  if (n % 2 === 1) {
    // 奇数 n：A = (−i − j + cA) mod n, B = (i − j + cB) mod n → 直交し、対角線の和もそろう
    let cA = ((n - 3) / 2 + n) % n, cB = (n - 1) / 2;
    for (let i = 0; i < n; i++) {
      A.push([]); B.push([]);
      for (let j = 0; j < n; j++) { A[i].push((((-i - j + cA) % n) + n) % n); B[i].push((((i - j + cB) % n) + n) % n); }
    }
  } else if (n === 4) {
    A = [[0, 1, 2, 3], [2, 3, 0, 1], [3, 2, 1, 0], [1, 0, 3, 2]];
    B = [[0, 1, 2, 3], [3, 2, 1, 0], [1, 0, 3, 2], [2, 3, 0, 1]];
  } else {
    // n = 6：直交するペアは存在しない（オイラーの 36 人の士官問題、タリー 1901 年）。どちらもラテン方格だが直交しない組を見せる
    hasPair = false;
    for (let i = 0; i < n; i++) { A.push([]); B.push([]); for (let j = 0; j < n; j++) { A[i].push((i + j) % n); B[i].push((i - j + n) % n); } }
  }
}

function cellRect(i, j) {
  let s = Math.min(78, (height - 220) / n);
  let x0 = width * 0.36 - (n * s) / 2, y0 = 130 + ((height - 220) - n * s) / 2;
  return { x: x0 + j * s, y: y0 + i * s, s };
}
function a(i, j) { return A[rowOrder[i]][j]; }
function b(i, j) { return B[rowOrder[i]][j]; }
function magic(i, j) { return n * a(i, j) + b(i, j) + 1; }

// 直交しているか：ペア (A,B) がすべて異なるか
function orthogonal() {
  let seen = {};
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { let key2 = a(i, j) * n + b(i, j); if (seen[key2]) return false; seen[key2] = true; }
  return true;
}

function draw() {
  background(222, 28, 11);
  textAlign(CENTER, CENTER);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    let r = cellRect(i, j);
    let hueA = (a(i, j) * 360) / n;
    noStroke();
    if (view === 3) fill(0, 0, 22); else fill(hueA, 60, 85);
    rect(r.x + 1, r.y + 1, r.s - 2, r.s - 2, 6);
    if (view === 1) { fill(0, 0, 10); textSize(r.s * 0.4); text(a(i, j) + 1, r.x + r.s / 2, r.y + r.s / 2); }
    if (view === 2) { fill(0, 0, 100); textSize(r.s * 0.42); text(symbols[b(i, j)], r.x + r.s / 2, r.y + r.s / 2); }
    if (view === 3) { fill(hueA, 50, 100); textSize(r.s * 0.36); text(magic(i, j), r.x + r.s / 2, r.y + r.s / 2); }
  }
  // 魔方陣：和を表示
  if (view === 3) {
    textSize(14);
    let target = (n * (n * n + 1)) / 2;
    for (let i = 0; i < n; i++) {
      let s = 0; for (let j = 0; j < n; j++) s += magic(i, j);
      let r = cellRect(i, n - 1);
      fill(s === target ? 130 : 0, 80, 100); text(s, r.x + r.s + 28, r.y + r.s / 2);
    }
    for (let j = 0; j < n; j++) {
      let s = 0; for (let i = 0; i < n; i++) s += magic(i, j);
      let r = cellRect(n - 1, j);
      fill(s === target ? 130 : 0, 80, 100); text(s, r.x + r.s / 2, r.y + r.s + 20);
    }
    let d1 = 0, d2 = 0;
    for (let i = 0; i < n; i++) { d1 += magic(i, i); d2 += magic(i, n - 1 - i); }
    let r0 = cellRect(0, 0), r1 = cellRect(0, n - 1);
    fill(d1 === target ? 130 : 0, 80, 100); text('↘ ' + d1, r0.x - 30, r0.y - 16);
    fill(d2 === target ? 130 : 0, 80, 100); text(d2 + ' ↙', r1.x + r1.s + 30, r1.y - 16);
  }
  textAlign(LEFT, BASELINE);

  // 右パネル
  let px = width * 0.66, py = 130;
  noStroke(); fill(0, 0, 100, 8); rect(px - 16, py - 30, width - px, height - py - 60, 10);
  fill(0, 0, 100); textSize(20);
  let ortho = orthogonal();
  if (view === 1) {
    text('ラテン方格（色 = 記号 A）', px, py);
    fill(0, 0, 70); textSize(15);
    text('どの行・列にも 1〜' + n + ' が 1 回ずつ。数独は', px, py + 34);
    text('「3×3 ブロック」の条件を足したラテン方格', px, py + 56);
    text('n = ' + n + ' のラテン方格の数：' + latinCount(n), px, py + 92);
    text('（1, 2, 12, 576, 161280, 812851200, …）', px, py + 114);
    text('スペース：行を入れかえてもラテン方格のまま', px, py + 150);
  } else if (view === 2) {
    text('グレコ・ラテン方格（色 A ＋ 記号 B）', px, py);
    fill(0, 0, 70); textSize(15);
    text('色のラテン方格と記号のラテン方格を重ねる。', px, py + 34);
    text('(色, 記号) のペア ' + n * n + ' 通りがすべて 1 回ずつ', px, py + 56);
    fill(ortho ? 130 : 20, 80, 100); textSize(17);
    text(ortho ? '直交している ✓' : '直交していない（同じペアがある）', px, py + 92);
    fill(0, 0, 70); textSize(15);
    if (!hasPair) { text('n = 6 では直交するペアが存在しない！', px, py + 128); text('（オイラーの「36 人の士官」、タリー 1901）', px, py + 150); text('n = 2, 6 以外はすべて存在（1959 年に解決）', px, py + 172); }
    else { text('奇数 n：A = (−i−j), B = (i−j) mod n。', px, py + 128); text('n = 4 は手でつくったペア（有限体 GF(4)）', px, py + 150); }
    text('応用：実験計画法（行 = 日、列 = 畑、色 = 肥料、', px, py + 200);
    text('記号 = 品種 → 偏りなく全部の組合せを試せる）', px, py + 222);
  } else {
    text('魔方陣：n·A + B + 1', px, py);
    fill(0, 0, 70); textSize(15);
    text('各行・列には A の値 0〜' + (n - 1) + ' と B の値が', px, py + 34);
    text('1 回ずつ → 和はどこも同じ', px, py + 56);
    text('定和 = n(n²+1)/2 = ' + (n * (n * n + 1)) / 2, px, py + 92);
    text('対角線もそろうには A, B の対角線もラテン', px, py + 128);
    text('（緑 = 定和に一致、赤 = 不一致）', px, py + 150);
    if (!hasPair) text('n = 6 は直交ペアがないのでこの方法は使えない', px, py + 186);
    text('スペースで行を入れかえると対角線がくずれる', px, py + 220);
  }

  fill(0, 0, 100); textSize(18);
  text('n = ' + n + '（↑↓）　1：ラテン方格　2：グレコ・ラテン方格　3：魔方陣　スペース：行をシャッフル　R：元に戻す', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('ラテン方格 = 数独のルール。2 つを直交させると実験計画・暗号・誤り訂正符号にも使える', 20, 68);
}

function latinCount(m) { return [1, 1, 2, 12, 576, 161280, 812851200, 61479419904000][m] || '?'; }

function keyPressed() {
  if (key === UP_ARROW && n < 7) { n++; build(); }
  if (key === DOWN_ARROW && n > 3) { n--; build(); }
  if (key === '1' || key === '2' || key === '3') view = Number(key);
  if (key === ' ') { for (let i = n - 1; i > 0; i--) { let j = Math.floor(Math.random() * (i + 1)); [rowOrder[i], rowOrder[j]] = [rowOrder[j], rowOrder[i]]; } }
  if (key === 'r' || key === 'R') build();
}

// ---------- やってみよう ----------
// 1. n = 3 のラテン方格は 12 個。行の入れかえ（スペース）だけで何種類できる？（3! = 6）
// 2. 魔方陣モードで行をシャッフルすると、行・列の和はそのまま、対角線だけくずれる。なぜ？
// 3. n = 6 で 2 を押す：赤い「直交していない」が出る。同じペアがどこにあるか探そう
// 4. 偶数 n = 4 のペア A, B をクリックで編集できるようにして、直交チェックが ✓ のまま保てるか試そう
