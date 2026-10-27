// ============================================
// 12 ウォーターシェッド（分水嶺）
// 画像を「地形」とみなし、谷底（極小）から水をためていく。水面が上がって 2 つの湖がぶつかる所に「堤防」を作る = 分水嶺
// くっついた塊は、距離変換を裏返した地形（中心が谷）で分けられる
// スペースで再生／一時停止 / 右で 1 段上げる / 1〜2 で地形（ノイズ・くっついた丸） / ドラッグで丸を足す（2） / R でやり直し
// ============================================

let cols = 80, rows = 56, cell, ox = 20, oy = 110;
let h, labels, blocked, minima = [], buckets = [];
let terrain = 2;    // ★ 1 = ノイズの地形 2 = くっついた丸（距離変換）
let levels = 48;    // ★ 水面の段数
let level = -1, nLabels = 0, playing = true, seed = 1;
let img;            // 地形 2 用の二値画像
let se4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
let se8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  cell = min((width - 400) / cols, (height - 140) / rows);
  makeTerrain();
}

function makeTerrain() {
  h = new Int16Array(cols * rows);
  blocked = new Uint8Array(cols * rows);
  if (terrain === 1) {
    noiseSeed(seed);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) h[x + y * cols] = floor(noise(x * 0.06, y * 0.06) * (levels - 1));
  } else {
    randomSeed(seed);
    img = new Uint8Array(cols * rows);
    let c = [];
    for (let n = 0; n < 6; n++) c.push([random(12, cols - 12), random(10, rows - 10), random(7, 12)]);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) for (let [cx, cy, r] of c) if (dist(x, y, cx, cy) <= r) img[x + y * cols] = 1;
    terrainFromImage();
    return;
  }
  resetFlood();
}

// ★ 二値画像 → 地形：距離変換を裏返す（中心ほど深い谷）。背景は水が入らない「岩」
function terrainFromImage() {
  let sq = edtSquared((i) => !img[i]);
  let maxD = 1;
  for (let i = 0; i < sq.length; i++) if (img[i]) maxD = max(maxD, Math.sqrt(sq[i]));
  for (let i = 0; i < h.length; i++) {
    blocked[i] = img[i] ? 0 : 1;
    h[i] = img[i] ? floor((1 - Math.sqrt(sq[i]) / maxD) * (levels - 1)) : levels;
  }
  resetFlood();
}

// ★ 谷底（極小）を探す：まわり（8 近傍）に自分より低いマスがない「平らな所」
function findMinima() {
  minima = [];
  let seen = new Uint8Array(cols * rows);
  for (let s0 = 0; s0 < h.length; s0++) {
    if (seen[s0] || blocked[s0]) continue;
    let cells = [s0], stack = [s0], lower = false;
    seen[s0] = 1;
    while (stack.length) {
      let i = stack.pop(), x = i % cols, y = floor(i / cols);
      for (let [dx, dy] of se8) {
        let nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        let j = nx + ny * cols;
        if (blocked[j]) continue;
        if (h[j] < h[i]) lower = true;
        else if (h[j] === h[i] && !seen[j]) { seen[j] = 1; stack.push(j); cells.push(j); }
      }
    }
    if (!lower) minima.push({ h: h[s0], cells });
  }
}

function resetFlood() {
  labels = new Int16Array(cols * rows); // 0 = まだ, -1 = 分水嶺, 1〜 = 湖の番号
  level = -1; nLabels = 0;
  buckets = [];
  for (let l = 0; l <= levels; l++) buckets.push([]);
  findMinima();
}

// となりの未処理のマスを「高さの順番待ち」に入れる（水面より低ければ今すぐ）
function pushNeighbors(i) {
  let x = i % cols, y = floor(i / cols);
  for (let [dx, dy] of se4) {
    let nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
    let j = nx + ny * cols;
    if (!labels[j] && !blocked[j]) buckets[max(h[j], level)].push(j);
  }
}

// ★ 水面を 1 段上げる（Meyer の洪水アルゴリズム：低いマスから順に、となりの湖の色をもらう）
function floodStep() {
  if (level >= levels - 1) return;
  level++;
  // (1) 水面の高さに谷底があれば、新しい湖が生まれる
  for (let m of minima) {
    if (m.h !== level) continue;
    nLabels++;
    for (let i of m.cells) labels[i] = nLabels;
    for (let i of m.cells) pushNeighbors(i);
  }
  // (2) 水面以下のマスを順番に処理：となりが 1 色なら同じ湖、2 色以上なら分水嶺
  let q = buckets[level], head = 0;
  while (head < q.length) {
    let i = q[head++];
    if (labels[i]) continue;
    let x = i % cols, y = floor(i / cols), found = 0, conflict = false, wshed = false;
    for (let [dx, dy] of se4) {
      let nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      let l = labels[nx + ny * cols];
      if (l > 0) { if (found && l !== found) conflict = true; found = l; }
      else if (l === -1) wshed = true;
    }
    labels[i] = conflict ? -1 : found ? found : wshed ? -1 : 0;
    if (labels[i]) pushNeighbors(i);
  }
  buckets[level] = [];
}

function draw() {
  background(170, 45, 9);
  if (playing && frameCount % 4 === 0) floodStep();
  noStroke();
  let nWshed = 0;
  for (let i = 0; i < h.length; i++) {
    let x = ox + (i % cols) * cell, y = oy + floor(i / cols) * cell;
    if (blocked[i]) { fill(170, 30, 14); }
    else if (labels[i] === -1) { nWshed++; fill(45, 95, 100); }
    else if (labels[i] > 0) fill((labels[i] * 53) % 360, 70, 55 + (h[i] / levels) * 40);
    else fill(0, 0, 20 + (h[i] / levels) * 70);
    rect(x, y, cell, cell);
  }
  let px = ox + cols * cell + 40, ty = oy + 10;
  fill(45, 90, 100); textSize(34);
  text('水面 ' + max(level, 0) + ' / ' + (levels - 1), px, ty + 20);
  textSize(16); fill(0, 0, 100);
  text('湖（領域）の数：' + nLabels + ' / 谷底 ' + minima.length, px, ty + 54);
  text('分水嶺のマス：' + nWshed, px, ty + 78);
  // 水面のゲージ
  fill(0, 0, 25); rect(px, ty + 96, 240, 12, 6);
  fill(200, 80, 100); rect(px, ty + 96, 240 * (max(level, 0) / (levels - 1)), 12, 6);
  fill(0, 0, 60);
  text('白黒 = 地形の高さ（白ほど高い）', px, ty + 140);
  text('色 = 湖（どの谷底から来た水か）', px, ty + 164);
  text('黄 = 分水嶺（2 つの湖がぶつかった所）', px, ty + 188);
  if (terrain === 2) {
    text('地形 = 距離変換の裏返し：', px, ty + 228);
    text('丸の中心が谷底、くびれが峠', px, ty + 252);
    text('→ くっついた丸がくびれで分かれる', px, ty + 276);
    text('（細胞・粒の分離の定番手法）', px, ty + 300);
  } else {
    text('谷底（極小）1 つにつき湖が 1 つ', px, ty + 228);
    text('ノイズ画像は谷が多く「過分割」になる', px, ty + 252);
    text('→ 実際はマーカー（11）で谷を選ぶ', px, ty + 276);
    text('　または勾配画像（08）を地形にする', px, ty + 300);
  }

  fill(0, 0, 100);
  textSize(18);
  text('スペース：' + (playing ? '一時停止' : '再生') + '　右：1 段上げる　1〜2：地形（' + (terrain === 1 ? 'ノイズ' : 'くっついた丸') + '）　ドラッグ：丸を足す（2）　R：やり直し　N：別の地形', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('水面を少しずつ上げる。新しい谷に水がたまれば新しい湖、湖と湖がぶつかれば堤防（分水嶺）。最後に残った堤防が「境界線」', 20, 68);
}

function paint() {
  if (terrain !== 2) return;
  let gx = floor((mouseX - ox) / cell), gy = floor((mouseY - oy) / cell);
  if (gx < 0 || gy < 0 || gx >= cols || gy >= rows) return;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (dist(x, y, gx, gy) <= 6) img[x + y * cols] = 1; // ★ 足す丸の半径
  terrainFromImage();
}
function mousePressed() { paint(); }
function mouseDragged() { if (frameCount % 4 === 0) paint(); }
function keyPressed() {
  if (key === ' ') playing = !playing;
  if (key === RIGHT_ARROW) { playing = false; floodStep(); }
  if (key === '1' || key === '2') { terrain = int(key); makeTerrain(); }
  if (key === 'r' || key === 'R') resetFlood();
  if (key === 'n' || key === 'N') { seed++; makeTerrain(); }
}

// ---------- やってみよう ----------
// 1. 地形 2 で、丸を 2 つ重ねて描く。分水嶺はくびれの位置に出る？ 重なりが大きいと分かれない？
// 2. 地形 1 で湖の数を数える。ノイズの noise(x*0.06) を 0.12 にすると湖はどうなる？（過分割）
// 3. 08 の勾配画像を地形にしてみる（h = 勾配 × (levels−1)）。物体の輪郭で堤防ができる

// ==================================================
// ここから下は「モルフォロジーの道具」（ユークリッド距離変換）
// （中身は読まなくても OK。消さないでね）
// ==================================================
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
