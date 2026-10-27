// ============================================
// 06 距離変換（distance transform）
// 形の中の各マスに「いちばん近い背景までの距離」を書き込む → 熱い色ほど奥
// 「距離 > t」のマスを残す = 半径 t の円で収縮。背景側の距離 ≤ t を足す = 半径 t の円で膨張
// 1〜3 で距離の種類（ユークリッド・市街地・チェス盤） / 上下で t / D で内側⇄外側 / ドラッグで描く / E で消しゴム / R でお手本 / C で全部消す
// ============================================

let cols = 96, rows = 64, cell, ox = 20, oy = 110;
let img, dt;
let metric = 1;    // ★ 1 = ユークリッド 2 = 市街地（4 近傍） 3 = チェス盤（8 近傍）
let t = 4;         // ★ しきい値（半径）
let outside = false, eraser = false, dirty = true, maxD = 1;
let names = { 1: 'ユークリッド √(dx²+dy²)', 2: '市街地 |dx|+|dy|', 3: 'チェス盤 max(|dx|,|dy|)' };

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  cell = min((width - 400) / cols, (height - 140) / rows);
  img = new Uint8Array(cols * rows);
  preset();
}

function preset() {
  img.fill(0);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (dist(x, y, 26, 30) < 17 || dist(x, y, 44, 40) < 11) img[x + y * cols] = 1;
    if (x > 60 && x < 90 && y > 10 && y < 54) img[x + y * cols] = 1;
    if (y > 56 && y < 60 && x > 6 && x < 50) img[x + y * cols] = 1;
  }
  dirty = true;
}

// ★ 距離変換：fg が 1 のマスについて、fg が 0 のいちばん近いマスまでの距離
function distanceTransform(fg) {
  let out = new Float32Array(cols * rows);
  if (metric === 1) {
    let sq = edtSquared((i) => !fg[i]);
    for (let i = 0; i < out.length; i++) out[i] = Math.sqrt(sq[i]);
  } else {
    // 2 回の走査（前向き・後ろ向き）で市街地／チェス盤の距離が正確に求まる
    let BIG = 1e6;
    for (let i = 0; i < out.length; i++) out[i] = fg[i] ? BIG : 0;
    let nb = metric === 2 ? [[-1, 0, 1], [0, -1, 1]] : [[-1, 0, 1], [0, -1, 1], [-1, -1, 1], [1, -1, 1]];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) relax(out, x, y, nb);
    let nb2 = nb.map(([dx, dy, w]) => [-dx, -dy, w]);
    for (let y = rows - 1; y >= 0; y--) for (let x = cols - 1; x >= 0; x--) relax(out, x, y, nb2);
  }
  return out;
}
function relax(d, x, y, nb) {
  let i = x + y * cols;
  for (let [dx, dy, w] of nb) {
    let nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
    if (d[nx + ny * cols] + w < d[i]) d[i] = d[nx + ny * cols] + w;
  }
}

function recompute() {
  let fg = outside ? img.map((v) => 1 - v) : img;
  dt = distanceTransform(fg);
  maxD = 1;
  for (let i = 0; i < dt.length; i++) if (dt[i] < 1e5 && dt[i] > maxD) maxD = dt[i];
  dirty = false;
}

function draw() {
  background(170, 45, 9);
  if (dirty) recompute();
  noStroke();
  fill(170, 30, 16);
  rect(ox, oy, cols * cell, rows * cell);
  let nSel = 0;
  for (let i = 0; i < img.length; i++) {
    let x = ox + (i % cols) * cell, y = oy + floor(i / cols) * cell;
    let d = dt[i];
    if (!outside) {
      if (!img[i]) continue;
      let sel = d > t;                                   // 収縮：距離 > t が残る
      if (sel) nSel++;
      fill(sel ? 45 : 200 - (d / maxD) * 200, sel ? 90 : 80, sel ? 100 : 40 + (d / maxD) * 60);
    } else {
      if (img[i]) { fill(150, 60, 95); rect(x, y, cell - 1, cell - 1); continue; }
      let sel = d <= t;                                  // 膨張：距離 ≤ t を足す
      if (sel) nSel++;
      if (!sel && d > 3 * t + 2) continue;
      fill(sel ? 45 : 200, sel ? 70 : 60, sel ? 70 : 60 - (d / maxD) * 40);
    }
    rect(x, y, cell - 1, cell - 1);
  }
  // マウス位置の距離
  let mx = floor((mouseX - ox) / cell), my = floor((mouseY - oy) / cell);
  let mv = mx >= 0 && my >= 0 && mx < cols && my < rows ? dt[mx + my * cols] : null;

  let px = ox + cols * cell + 40, ty = oy + 10;
  fill(0, 0, 100); textSize(16);
  text('距離：' + names[metric], px, ty);
  fill(0, 0, 60);
  text('最大 ' + nf(maxD, 1, 1) + '　マウス位置 ' + (mv === null || mv > 1e5 ? '—' : nf(mv, 1, 1)), px, ty + 26);
  // カラーバー
  for (let k = 0; k < 40; k++) { fill(200 - (k / 40) * 200, 80, 40 + (k / 40) * 60); rect(px + k * 5, ty + 40, 5, 14); }
  fill(0, 0, 60); text('0', px, ty + 70); text(nf(maxD, 1, 0), px + 190, ty + 70);
  textSize(34); fill(45, 90, 100);
  text('t = ' + t, px, ty + 120);
  textSize(16); fill(0, 0, 100);
  text(outside ? '黄 = 距離 ≤ t の背景（' + nSel + ' マス）' : '黄 = 距離 > t の前景（' + nSel + ' マス）', px, ty + 150);
  fill(0, 0, 60);
  if (!outside) {
    text('= 半径 t の円で収縮した形 A ⊖ D_t', px, ty + 176);
    text('どんな t でも 1 回の距離変換で出せる', px, ty + 200);
    text('（収縮を t 回くり返すより速い）', px, ty + 224);
    text('いちばん熱い所 = 形の中心軸（05 の骨格）', px, ty + 260);
  } else {
    text('緑 ∪ 黄 = 半径 t の円で膨張 A ⊕ D_t', px, ty + 176);
    text('背景側の距離変換 = 形からの「等高線」', px, ty + 200);
    text('ボロノイ図・最近傍探索にも使える', px, ty + 224);
  }
  text('市街地とチェス盤は 2 回の走査で O(N)', px, ty + 300);
  text('ユークリッドも 1 次元ずつ放物線で O(N)', px, ty + 324);

  fill(0, 0, 100);
  textSize(18);
  text('1〜3：距離の種類　上下：t　D：内側⇄外側（' + (outside ? '外側・膨張' : '内側・収縮') + '）　ドラッグで描く（' + (eraser ? '消しゴム' : 'ペン') + '　E）　R：お手本　C：全部消す', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('市街地距離で「円」はひし形、チェス盤では正方形、ユークリッドで本当の円。収縮・膨張の「角の形」がここで決まる', 20, 68);
}

function paint() {
  let gx = floor((mouseX - ox) / cell), gy = floor((mouseY - oy) / cell);
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    let x = gx + dx, y = gy + dy;
    if (x >= 0 && y >= 0 && x < cols && y < rows && dx * dx + dy * dy <= 5) img[x + y * cols] = eraser ? 0 : 1;
  }
  dirty = true;
}
function mousePressed() { paint(); }
function mouseDragged() { paint(); }
function keyPressed() {
  if (key >= '1' && key <= '3') metric = int(key);
  if (key === UP_ARROW) t = min(30, t + 1);
  if (key === DOWN_ARROW) t = max(0, t - 1);
  if (key === 'd' || key === 'D') outside = !outside;
  if (key === 'e' || key === 'E') eraser = !eraser;
  if (key === 'r' || key === 'R') preset();
  if (key === 'c' || key === 'C') { img.fill(0); dirty = true; }
  dirty = true;
}

// ---------- やってみよう ----------
// 1. 1 点だけ描いて外側モードにする。1〜3 で「円」の形がどう変わる？（ひし形・正方形・円）
// 2. 内側モードで t を上げていく。2 つの円がくっついた形は、どの t で 2 つに分かれる？（→ 12 のウォーターシェッド）
// 3. 距離がいちばん大きいマスだけ残すと「中心線」になる。05 の細線化と比べてみよう

// ==================================================
// ここから下は「モルフォロジーの道具」（ユークリッド距離変換）
// （中身は読まなくても OK。消さないでね）
// ==================================================
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
// 1 次元：放物線の下側包絡線
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
