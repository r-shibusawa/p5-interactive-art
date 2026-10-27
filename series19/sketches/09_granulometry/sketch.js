// ============================================
// 09 粒度分析（granulometry）
// 半径 k の円でオープニングすると、半径 k より小さい粒は消える。k を 0, 1, 2, … と増やしながら面積を測る
// 「k で消えた面積」のグラフ = パターンスペクトル。粒の大きさの分布が、粒を 1 つも数えずにわかる
// 左右で k / 上下で粒の数 / 1〜3 で粒の大きさの分布 / スペースで新しい粒
// ============================================

let cols = 96, rows = 64, cell, ox = 20, oy = 110;
let img;
let nGrains = 16;   // ★ 粒の数
let distKind = 1;   // ★ 1 = いろいろ 2 = 2 種類 3 = 1 種類
let kMax = 12;      // ★ 調べる最大半径
let k = 0, seed = 1;
let opened = [], areas = [], radii = [];
let distNames = { 1: 'いろいろな大きさ（半径 2〜8）', 2: '2 種類（半径 3 と 7）', 3: '1 種類（半径 5）' };

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  cell = min((width - 420) / cols, (height - 140) / rows);
  makeGrains();
}

// ★ 粒（円）をランダムに置く（重ならない場所を探す）
function makeGrains() {
  randomSeed(seed);
  img = new Uint8Array(cols * rows);
  radii = [];
  let placed = [];
  for (let n = 0; n < nGrains; n++) {
    let r = distKind === 1 ? floor(random(2, 9)) : distKind === 2 ? (random() < 0.5 ? 3 : 7) : 5;
    for (let tries = 0; tries < 40; tries++) {
      let cx = random(r + 1, cols - r - 1), cy = random(r + 1, rows - r - 1);
      if (placed.some((p) => dist(p[0], p[1], cx, cy) < p[2] + r + 2)) continue;
      placed.push([cx, cy, r]);
      radii.push(r);
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (dist(x, y, cx, cy) <= r + 0.3) img[x + y * cols] = 1;
      break;
    }
  }
  analyze();
}

// ★ 半径 0..kMax の円でオープニングして面積を記録
function analyze() {
  opened = []; areas = [];
  for (let r = 0; r <= kMax; r++) {
    let o = openDisk(img, r);
    opened.push(o);
    let a = 0;
    for (let i = 0; i < o.length; i++) a += o[i];
    areas.push(a);
  }
  k = min(k, kMax);
}

function draw() {
  background(170, 45, 9);
  noStroke();
  fill(170, 30, 16);
  rect(ox, oy, cols * cell, rows * cell);
  let cur = opened[k], prev = k > 0 ? opened[k - 1] : img;
  for (let i = 0; i < img.length; i++) {
    if (!img[i]) continue;
    if (cur[i]) fill(150, 60, 95);
    else if (prev[i]) fill(350, 85, 100);   // この k で消えた粒
    else fill(150, 30, 28);                 // もっと前に消えた粒
    rect(ox + (i % cols) * cell, oy + floor(i / cols) * cell, cell - 1, cell - 1);
  }

  // 右：パターンスペクトル（k で消えた面積）
  let px = ox + cols * cell + 50, pw = width - px - 30, py = oy + 60, ph = (height - 200) * 0.5;
  fill(0, 0, 100); textSize(16);
  text('パターンスペクトル：半径 k で消えた面積', px, py - 30);
  fill(0, 0, 60); textSize(13);
  text('PS(k) = area(A ∘ D_{k−1}) − area(A ∘ D_k)', px, py - 12);
  // デジタルの円は厳密には「ふるい」の条件を満たさないので、ごくまれに負になる → 0 とみなす
  let ps = [0];
  for (let r = 1; r <= kMax; r++) ps.push(max(0, areas[r - 1] - areas[r]));
  let maxPS = max(1, ...ps);
  let bw = pw / (kMax + 1);
  stroke(0, 0, 30); line(px, py + ph, px + pw, py + ph);
  noStroke();
  for (let r = 1; r <= kMax; r++) {
    let h = (ps[r] / maxPS) * (ph - 10);
    fill(r === k ? 350 : 150, r === k ? 85 : 60, r === k ? 100 : 80);
    rect(px + r * bw + 2, py + ph - h, bw - 4, h);
    fill(0, 0, 60); textSize(12);
    text(r, px + r * bw + bw / 2 - 4, py + ph + 16);
  }
  fill(0, 0, 60); textSize(13);
  text('半径 k →', px + pw - 50, py + ph + 34);
  // 面積の曲線
  let qy = py + ph + 70, qh = height - qy - 40;
  fill(0, 0, 100); textSize(16);
  text('面積 area(A ∘ D_k)：' + areas[k] + ' / ' + areas[0] + '　粒 ' + radii.length + ' 個', px, qy - 10);
  stroke(0, 0, 30); noFill(); rect(px, qy, pw, qh);
  stroke(45, 90, 100); strokeWeight(2.5);
  beginShape();
  for (let r = 0; r <= kMax; r++) vertex(px + r * bw + bw / 2, qy + qh - (areas[r] / max(areas[0], 1)) * (qh - 6) - 3);
  endShape();
  noStroke(); fill(350, 85, 100);
  circle(px + k * bw + bw / 2, qy + qh - (areas[k] / max(areas[0], 1)) * (qh - 6) - 3, 10);
  // 答え合わせ：本当にその半径の粒がいくつあるか（棒の上の白い数字）
  let hist = new Array(kMax + 1).fill(0);
  for (let r of radii) hist[min(r, kMax)]++;
  fill(0, 0, 100); textSize(13);
  for (let r = 1; r <= kMax; r++) if (hist[r]) text(hist[r], px + r * bw + bw / 2 - 4, py + ph - (ps[r] / maxPS) * (ph - 10) - 6);
  fill(0, 0, 60);
  text('白い数字 = 実際にその半径の粒の数（答え）', px, qy + qh + 20);

  fill(0, 0, 100);
  textSize(18);
  text('左右：k = ' + k + '（赤 = この k で消えた粒）　上下：粒 ' + radii.length + ' 個　1〜3：大きさの分布（' + distNames[distKind] + '）　スペース：新しい粒', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('「ふるい」の原理：目の粗さ k のふるいで小さい粒から落ちていく。落ちた量をグラフにすると粒の大きさの分布になる（粉体・細胞・泡の計測）', 20, 68);
}

function keyPressed() {
  if (key === LEFT_ARROW) k = max(0, k - 1);
  if (key === RIGHT_ARROW) k = min(kMax, k + 1);
  if (key === UP_ARROW) { nGrains = min(60, nGrains + 4); makeGrains(); }
  if (key === DOWN_ARROW) { nGrains = max(4, nGrains - 4); makeGrains(); }
  if (key >= '1' && key <= '3') { distKind = int(key); makeGrains(); }
  if (key === ' ') { seed++; makeGrains(); }
}

// ---------- やってみよう ----------
// 1. 分布 2（半径 3 と 8）で、スペクトルの山が 2 つ出るか。山の位置は半径と合っている？
// 2. 粒を増やして重なりを作る。重なった粒は「大きな粒」に見える → スペクトルはどうずれる？
// 3. 正方形 SE 版を作る（openDisk のかわりに makeSE('box', k) で収縮→膨張）。円の粒でも同じ結果になる？

// ==================================================
// ここから下は「モルフォロジーの道具」（距離変換で円のオープニングを速く計算）
// （中身は読まなくても OK。消さないでね）
// ==================================================
// 半径 r の円でオープニング：収縮 = 「背景までの距離 > r」、膨張 = 「収縮後の形までの距離 ≤ r」
function openDisk(a, r) {
  if (r === 0) return Uint8Array.from(a);
  let din = edtSquared((i) => !a[i]);
  let er = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) er[i] = a[i] && din[i] > r * r + r * 0.5 ? 1 : 0; // 収縮（SE は makeSE の円と同じ）
  let dout = edtSquared((i) => er[i]);
  let out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = dout[i] <= r * r + r * 0.5 ? 1 : 0;
  return out;
}
// 2 乗ユークリッド距離変換（Felzenszwalb & Huttenlocher）：isSite(i) が true のマスまでの距離²
function edtSquared(isSite) {
  let BIG = 1e9, n = cols * rows;
  let f = new Float64Array(n), g = new Float64Array(n), out = new Float64Array(n);
  for (let i = 0; i < n; i++) f[i] = isSite(i) ? 0 : BIG;
  let col = new Float64Array(rows), tmp = new Float64Array(rows);
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) col[y] = f[x + y * cols];
    edt1d(col, rows, tmp);
    for (let y = 0; y < rows; y++) g[x + y * cols] = tmp[y];
  }
  let rowv = new Float64Array(cols), tmp2 = new Float64Array(cols);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) rowv[x] = g[x + y * cols];
    edt1d(rowv, cols, tmp2);
    for (let x = 0; x < cols; x++) out[x + y * cols] = tmp2[x];
  }
  return out;
}
function edt1d(f, n, d) {
  let v = new Int32Array(n), z = new Float64Array(n + 1);
  let k = 0; v[0] = 0; z[0] = -1e20; z[1] = 1e20;
  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
    k++; v[k] = q; z[k] = s; z[k + 1] = 1e20;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
  }
}
