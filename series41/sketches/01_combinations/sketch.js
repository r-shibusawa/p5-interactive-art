// ============================================
// 01 組合せと二項係数
// n 個から k 個を「選ぶ」（順番は関係なし）やり方は C(n,k) = n! / (k!(n−k)!) 通り
// 全部のパターンを並べて数え、C(n,k) = C(n−1,k−1) + C(n−1,k) を色分けで確かめる
// ↑↓ = n（1〜8）/ ←→ = k / H = 漸化式の色分け / C = 補集合（選ばなかった方）を見る
// ============================================

let n = 5, k = 2;          // ★ 最初の n と k
let subsets = [];          // 選び方の一覧（0/1 の配列）
let showRecur = true;      // 漸化式の色分け
let showComp = false;      // 補集合表示
let anim = 0;              // 並び替えアニメの進み具合

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  rebuild();
}

// ★ k 個選ぶパターンを辞書順に全部つくる（再帰）
function rebuild() {
  subsets = [];
  let cur = [];
  function rec(start, left) {
    if (left === 0) {
      let row = new Array(n).fill(0);
      for (let i of cur) row[i] = 1;
      subsets.push(row);
      return;
    }
    for (let i = start; i <= n - left; i++) { cur.push(i); rec(i + 1, left - 1); cur.pop(); }
  }
  rec(0, k);
  anim = 0;
}

function choose(a, b) {
  if (b < 0 || b > a) return 0;
  let r = 1;
  for (let i = 1; i <= b; i++) r = (r * (a - b + i)) / i;
  return Math.round(r);
}

function draw() {
  background(225, 25, 11);
  anim = Math.min(1, anim + 0.04);
  let total = subsets.length;

  // 漸化式：最後の要素（n 番目）を含むか含まないかで 2 グループ
  let withLast = subsets.filter((s) => s[n - 1] === 1);
  let without = subsets.filter((s) => s[n - 1] === 0);
  let list = showRecur ? withLast.concat(without) : subsets;

  // レイアウト
  let cell = n <= 6 ? 16 : 13;
  let rowH = cell + 6, tileW = n * cell + 30;
  let x0 = 30, y0 = 200;
  let perCol = Math.max(1, Math.floor((height - y0 - 30) / rowH));
  for (let idx = 0; idx < list.length; idx++) {
    let s = list[idx];
    let col = Math.floor(idx / perCol), row = idx % perCol;
    let x = x0 + col * tileW, y = y0 + row * rowH;
    if (x > width - 320) break;
    let hasLast = s[n - 1] === 1;
    for (let i = 0; i < n; i++) {
      let chosen = showComp ? 1 - s[i] : s[i];
      noStroke();
      if (chosen) fill(showRecur ? (hasLast ? 35 : 185) : 45, 75, 100);
      else fill(0, 0, 30);
      rect(x + i * cell, y, cell - 2, cell - 2, 3);
    }
  }

  // 右パネル：数と式
  let px = width - 300, py = 200;
  noStroke();
  fill(0, 0, 100, 8);
  rect(px - 20, py - 40, 290, 340, 12);
  fill(0, 0, 100);
  textSize(46);
  text('C(' + n + ',' + k + ') = ' + total, px, py + 10);
  textSize(16);
  fill(0, 0, 70);
  text(n + '! / (' + k + '! × ' + (n - k) + '!) = ' + factorialStr(n) + ' / (' + factorial(k) + ' × ' + factorial(n - k) + ')', px, py + 44);
  if (showRecur) {
    fill(35, 75, 100);
    text('■ ' + n + ' 番を含む：C(' + (n - 1) + ',' + (k - 1) + ') = ' + withLast.length, px, py + 86);
    fill(185, 75, 100);
    text('■ ' + n + ' 番を含まない：C(' + (n - 1) + ',' + k + ') = ' + without.length, px, py + 110);
    fill(0, 0, 100);
    text('足すと ' + withLast.length + ' + ' + without.length + ' = ' + total, px, py + 134);
  }
  fill(0, 0, 70);
  text('対称性：C(' + n + ',' + (n - k) + ') = ' + choose(n, n - k) + (showComp ? '（いま補集合を表示中）' : ''), px, py + 176);
  // パスカルの三角形の n 行目
  fill(0, 0, 100);
  text('パスカルの三角形 ' + n + ' 行目：', px, py + 214);
  let rowVals = [];
  for (let j = 0; j <= n; j++) rowVals.push(choose(n, j));
  let cx = px;
  for (let j = 0; j <= n; j++) {
    let w = textWidth(rowVals[j] + '') + 14;
    if (j === k) { fill(45, 80, 100); rect(cx - 4, py + 226, w, 24, 4); fill(0, 0, 10); }
    else fill(0, 0, 80);
    text(rowVals[j], cx + 3, py + 244);
    cx += w + 6;
  }
  fill(0, 0, 70);
  text('合計 ' + Math.pow(2, n) + ' = 2^' + n + '（全部の選び方）', px, py + 280);

  // 説明
  fill(0, 0, 100);
  textSize(18);
  text('n = ' + n + '（↑↓）　k = ' + k + '（←→）　H：漸化式の色分け ' + (showRecur ? 'ON' : 'off') + '　C：補集合 ' + (showComp ? 'ON' : 'off'), 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('1 行 = 1 通りの選び方（明るいマスが選んだもの）。最後の玉を「含む／含まない」で 2 つに分けると C(n−1,k−1) + C(n−1,k)', 20, 68);
  text('補集合（C）：選ばなかった方を見ると C(n,k) = C(n,n−k) の理由がわかる', 20, 92);
}

function keyPressed() {
  if (key === UP_ARROW && n < 8) { n++; rebuild(); }
  if (key === DOWN_ARROW && n > 1) { n--; k = Math.min(k, n); rebuild(); }
  if (key === RIGHT_ARROW && k < n) { k++; rebuild(); }
  if (key === LEFT_ARROW && k > 0) { k--; rebuild(); }
  if (key === 'h' || key === 'H') showRecur = !showRecur;
  if (key === 'c' || key === 'C') showComp = !showComp;
}

// ---------- やってみよう ----------
// 1. n = 6 で k を 0 → 6 と動かす。数が 1, 6, 15, 20, 15, 6, 1 と左右対称になる理由を C で確かめよう
// 2. k = 2 の C(n,2) = n(n−1)/2。「握手の数」「対角線＋辺の数」と同じ。n を変えて確かめよう
// 3. rebuild を書きかえて、「隣どうしを選ばない」組合せだけ数えると？（フィボナッチ数が出る）
// 4. 選んだ k 個をさらに並べる（順列）と n!/(n−k)! 通り。00 とくらべて k! 倍になる理由は？

// ---------- 道具 ----------
function factorial(m) { let f = 1; for (let i = 2; i <= m; i++) f *= i; return f; }
function factorialStr(m) { return factorial(m) + ''; }
