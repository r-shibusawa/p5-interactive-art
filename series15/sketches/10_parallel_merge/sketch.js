// ============================================
// 10 並列マージと並列マージソート
// ふつうのマージは先頭から 1 つずつ → n ステップかかり、並列にできない
// 並列マージ：長い方の真ん中 x を選び、短い方で x が入る場所を二分探索 → x の最終位置が決まる
// 左右の 2 つの小さなマージは独立なので、同時に（spawn）できる。深さは O(lg n)、スパンは Θ(lg² n)
// スペース = 1 段進む / A = 自動 / 上下 = 要素数 / R = 新しい数
// ============================================

let n = 32;
let T = [], out = [];
let calls = [];     // {depth, p1, r1, p2, r2, q1, q2, q3}
let maxDepth = 0, level = -1;
let auto = false, timer = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  rebuild();
}

function rebuild() {
  let h = n / 2 + floor(random(-n / 6, n / 6));
  let a = [...Array(h)].map(() => floor(random(1, 100))).sort((x, y) => x - y);
  let b = [...Array(n - h)].map(() => floor(random(1, 100))).sort((x, y) => x - y);
  T = a.concat(b);
  out = new Array(n).fill(null);
  calls = []; maxDepth = 0;
  pmerge(0, h - 1, h, n - 1, 0, 0);
  level = -1; auto = false;
}

// T[p1..r1] と T[p2..r2]（どちらも整列済み）を out[p3..] にマージする。実際の計算は再帰の記録だけ
function pmerge(p1, r1, p2, r2, p3, depth) {
  let n1 = r1 - p1 + 1, n2 = r2 - p2 + 1;
  if (n1 < n2) { [p1, p2] = [p2, p1]; [r1, r2] = [r2, r1]; [n1, n2] = [n2, n1]; }
  if (n1 === 0) return;
  let q1 = floor((p1 + r1) / 2);
  let q2 = binarySearch(T[q1], p2, r2);
  let q3 = p3 + (q1 - p1) + (q2 - p2);
  calls.push({ depth, p1, r1, p2, r2, q1, q2, q3 });
  maxDepth = max(maxDepth, depth);
  pmerge(p1, q1 - 1, p2, q2 - 1, p3, depth + 1);      // spawn：左側
  pmerge(q1 + 1, r1, q2, r2, q3 + 1, depth + 1);       // 右側（同時に動ける）
}

// T[p..r] で x 以上になる最初の位置
function binarySearch(x, p, r) {
  let low = p, high = max(p, r + 1);
  while (low < high) { let mid = floor((low + high) / 2); if (x <= T[mid]) high = mid; else low = mid + 1; }
  return high;
}

function advance() {
  if (level >= maxDepth) { auto = false; return; }
  level++;
  for (let c of calls) if (c.depth === level) out[c.q3] = T[c.q1];
}

function draw() {
  background(100, 25, 9);
  if (auto && ++timer % 40 === 0) advance();
  let bw = (width - 120) / n, x0 = 60;
  let h = calls.length ? calls[0] : null;
  // 上：入力（整列済みの 2 つ）
  let yIn = 300;
  let cur = calls.filter((c) => c.depth === level);
  for (let i = 0; i < n; i++) {
    let used = calls.some((c) => c.depth <= level && c.q1 === i);
    let firstHalf = h && ((i >= min(h.p1, h.p2) && i <= (h.p1 < h.p2 ? h.r1 : h.r2)));
    let isPivot = cur.some((c) => c.q1 === i);
    fill(isPivot ? color(50, 90, 100) : used ? color(0, 0, 25) : firstHalf ? color(195, 60, 85) : color(330, 50, 90));
    noStroke();
    let hh = T[i] * 1.6;
    rect(x0 + i * bw + 1, yIn - hh, bw - 2, hh, 3);
    fill(0, 0, 80); textAlign(CENTER, CENTER); textSize(min(12, bw * 0.5)); text(T[i], x0 + (i + 0.5) * bw, yIn + 10);
  }
  // 今の段の部分問題：短い方での二分探索の位置（線）
  for (let c of cur) {
    stroke(50, 90, 100); strokeWeight(2);
    let x = x0 + c.q2 * bw;
    line(x, yIn - 170, x, yIn + 20);
    stroke(50, 60, 70); strokeWeight(1); noFill();
    rect(x0 + c.p1 * bw, yIn - 172, (c.r1 - c.p1 + 1) * bw, 4);
    if (c.r2 >= c.p2) rect(x0 + c.p2 * bw, yIn - 172, (c.r2 - c.p2 + 1) * bw, 4);
  }
  // 下：出力
  let yOut = 560;
  for (let i = 0; i < n; i++) {
    noStroke();
    if (out[i] === null) { fill(0, 0, 18); rect(x0 + i * bw + 1, yOut - 10, bw - 2, 10, 3); continue; }
    let c = calls.find((q) => q.q3 === i);
    fill(c.depth === level ? color(50, 90, 100) : color((c.depth * 45) % 360, 60, 90));
    let hh = out[i] * 1.6;
    rect(x0 + i * bw + 1, yOut - hh, bw - 2, hh, 3);
    fill(0, 0, 80); textAlign(CENTER, CENTER); textSize(min(12, bw * 0.5)); text(out[i], x0 + (i + 0.5) * bw, yOut + 10);
  }
  // 段ごとの数
  textAlign(LEFT, BASELINE); noStroke();
  for (let d = 0; d <= maxDepth; d++) {
    let k = calls.filter((c) => c.depth === d).length;
    fill(d <= level ? color((d * 45) % 360, 60, 90) : color(0, 0, 30));
    rect(x0 + d * 46, yOut + 40, 40, -min(60, k * 3));
    fill(0, 0, 70); textSize(12); text(k, x0 + d * 46 + 10, yOut + 56);
  }
  fill(0, 0, 70); textSize(13); text('段ごとに同時に決まる要素の数', x0, yOut + 76);
  fill(0, 0, 100); textSize(18);
  text('スペース：1 段進む　A：自動　上下：要素数 n = ' + n + '　R：新しい数', 20, 36);
  textSize(15); fill(0, 0, 65);
  text('青と桃 = 整列済みの 2 つの列。黄 = 今の段で選ばれた「長い方の真ん中」と、短い方での二分探索の位置', 20, 62);
  let lg = log(n) / log(2);
  fill(0, 0, 100); textSize(20);
  text('段 ' + (level + 1) + ' / ' + (maxDepth + 1) + '（ふつうのマージなら ' + n + ' ステップ）', 20, height - 90);
  fill(0, 0, 80); textSize(16);
  text('並列マージ：ワーク Θ(n)、スパン Θ(lg² n) ≈ ' + round(lg * lg) + '　　並列マージソート：ワーク Θ(n lg n)、スパン Θ(lg³ n)、並列度 Θ(n / lg² n)', 20, height - 58);
  fill(45, 80, 100);
  text('1 段ごとに、長い方は必ず半分、合計は 3/4 以下になる → 段の数は O(lg n)', 20, height - 28);
}

function keyPressed() {
  if (key === ' ') advance();
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === UP_ARROW) { n = min(128, n * 2); rebuild(); }
  if (key === DOWN_ARROW) { n = max(8, n / 2); rebuild(); }
  if (key === 'r' || key === 'R') rebuild();
}

// ---------- やってみよう ----------
// 1. n を 2 倍にしても、段の数は少ししか増えない（ふつうのマージは 2 倍）
// 2. 片方の列がとても短いときはどうなる？（rebuild の h を 1 にしてみる）
// 3. これをマージソートの各段で使うと並列マージソート。07 の DAG のように描いてみよう
