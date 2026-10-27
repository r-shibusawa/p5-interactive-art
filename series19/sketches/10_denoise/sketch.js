// ============================================
// 10 ノイズ除去（ごま塩ノイズ）
// 文字や図形に「白い点（塩）」と「黒い点（ごま）」をまぜて、モルフォロジーで元にもどす
// オープン→クローズ、クローズ→オープン、メディアン（多数決）を比べて、まちがいの数で勝負
// 1〜4 で方法 / 上下でノイズの量 / 左右で SE の大きさ / P で元の絵 / スペースで別のノイズ
// ============================================

let cols = 96, rows = 64, cell, oy = 130;
let clean, noisy, result;
let method = 2;    // ★ 1 なし 2 オープン→クローズ 3 クローズ→オープン 4 メディアン（3×3 多数決）
let noiseP = 0.08; // ★ ノイズの割合
let seR = 1;       // ★ SE の半径
let se = [], seed = 1, picture = 1, dirty = true;
let names = { 1: 'そのまま', 2: 'オープン → クローズ (A∘B)•B', 3: 'クローズ → オープン (A•B)∘B', 4: 'メディアン（3×3 の多数決）' };

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  cell = min((width - 70) / 2 / cols, (height - 250) / rows);
  makePicture();
}

function makePicture() {
  if (picture === 1) clean = textToGrid('p5', 62);
  else {
    clean = new Uint8Array(cols * rows);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if (dist(x, y, 26, 30) < 15 || (x > 50 && x < 88 && y > 10 && y < 52 && !(x > 60 && x < 78 && y > 20 && y < 42)) || (y > 54 && y < 58 && x > 6 && x < 46)) clean[x + y * cols] = 1;
    }
  }
  dirty = true;
}

function recompute() {
  se = makeSE('disk', seR);
  randomSeed(seed);
  noisy = Uint8Array.from(clean);
  for (let i = 0; i < noisy.length; i++) if (random() < noiseP) noisy[i] = 1 - noisy[i]; // ★ ごま塩
  if (method === 1) result = noisy;
  else if (method === 2) result = closeImg(openImg(noisy, se), se);
  else if (method === 3) result = openImg(closeImg(noisy, se), se);
  else result = median3(noisy);
  dirty = false;
}

// ★ 3×3 の多数決（二値画像のメディアンフィルタ）
function median3(a) {
  let out = new Uint8Array(a.length);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    let n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      let nx = constrain(x + dx, 0, cols - 1), ny = constrain(y + dy, 0, rows - 1);
      n += a[nx + ny * cols];
    }
    out[x + y * cols] = n >= 5 ? 1 : 0;
  }
  return out;
}

function errorsOf(a) {
  let fp = 0, fn = 0;
  for (let i = 0; i < a.length; i++) { if (a[i] && !clean[i]) fp++; if (!a[i] && clean[i]) fn++; }
  return [fp, fn];
}

function drawPanel(a, px, title) {
  noStroke();
  fill(170, 30, 16);
  rect(px, oy, cols * cell, rows * cell);
  for (let i = 0; i < a.length; i++) {
    if (a[i]) fill(clean[i] ? 150 : 350, clean[i] ? 60 : 85, 95);      // 赤 = 余計な白
    else if (clean[i]) fill(200, 70, 60);                                // 青 = 足りない白
    else continue;
    rect(px + (i % cols) * cell, oy + floor(i / cols) * cell, cell - 1, cell - 1);
  }
  let [fp, fn] = errorsOf(a);
  fill(0, 0, 100); textSize(17); text(title, px, oy - 30);
  textSize(15);
  fill(350, 85, 100); text('余計な白（塩）' + fp, px, oy - 10);
  fill(200, 70, 90); text('足りない白（ごま）' + fn, px + 150, oy - 10);
  fill(0, 0, 100); text('まちがい合計 ' + (fp + fn), px + 330, oy - 10);
  return fp + fn;
}

function draw() {
  background(170, 45, 9);
  if (dirty) recompute();
  let pw = cols * cell, gap = 30;
  let e1 = drawPanel(noisy, 20, 'ノイズ入り（割合 ' + nf(noiseP, 1, 2) + '）');
  let e2 = drawPanel(result, 20 + pw + gap, names[method] + (method !== 4 ? '　SE = 円 ' + (2 * seR + 1) + '×' + (2 * seR + 1) : ''));
  let by = oy + rows * cell + 28;
  textSize(28); fill(45, 90, 100);
  text('まちがい ' + e1 + ' → ' + e2 + (e2 < e1 ? '　（' + nf((1 - e2 / max(e1, 1)) * 100, 1, 0) + '% 減）' : ''), 20, by + 10);
  textSize(15); fill(0, 0, 60);
  text('オープンは「塩」を取り、クローズは「ごま」を取る。順番で結果が変わる（両方とも元の形を少し変える）。メディアンは線形フィルタではない「順序統計」の仲間', 20, by + 44);
  text('方法を切り替えて、ノイズの量・SE の大きさごとに一番まちがいが少ない方法を探そう', 20, by + 68);

  fill(0, 0, 100);
  textSize(18);
  text('1〜4：方法（1 なし 2 オープン→クローズ 3 クローズ→オープン 4 メディアン）　上下：ノイズ　左右：SE　P：元の絵　スペース：別のノイズ', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('赤 = 余計な白、青 = 足りない白。正解（ノイズを入れる前の絵）と比べてまちがいを数える', 20, 68);
}

function keyPressed() {
  if (key >= '1' && key <= '4') method = int(key);
  if (key === UP_ARROW) noiseP = min(0.3, noiseP + 0.02);
  if (key === DOWN_ARROW) noiseP = max(0, noiseP - 0.02);
  if (key === LEFT_ARROW) seR = max(1, seR - 1);
  if (key === RIGHT_ARROW) seR = min(3, seR + 1);
  if (key === 'p' || key === 'P') { picture = 3 - picture; makePicture(); }
  if (key === ' ') seed++;
  dirty = true;
}

// ---------- やってみよう ----------
// 1. ノイズ 0.10 でどの方法が一番まちがいが少ない？ 0.20 では？（ノイズが多いと 3×3 では足りなくなる）
// 2. SE を大きくすると、ノイズは消えるが「p5」の細い部分も消える。まちがいが増え始めるのはどこ？
// 3. 方法 5 を作る：メディアンを 2 回。または「オープン→クローズ」を 5×5 の多数決の後にかける

// ==================================================
// ここから下は「モルフォロジーの道具」（構造要素・膨張・収縮・文字の画像）
// （中身は読まなくても OK。消さないでね）
// ==================================================
function makeSE(kind, r) {
  let out = [];
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (kind === 'box') out.push([dx, dy]);
    else if (kind === 'cross') { if (dx === 0 || dy === 0) out.push([dx, dy]); }
    else if (dx * dx + dy * dy <= r * r + r * 0.5) out.push([dx, dy]);
  }
  return out;
}
function morph(a, se, isDilate) {
  let out = new Uint8Array(a.length);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    let v = isDilate ? 0 : 1;
    for (let k = 0; k < se.length; k++) {
      let nx = x + se[k][0], ny = y + se[k][1];
      if (nx < 0) nx = 0; else if (nx >= cols) nx = cols - 1;
      if (ny < 0) ny = 0; else if (ny >= rows) ny = rows - 1;
      let s = a[nx + ny * cols];
      if (isDilate ? s : !s) { v = isDilate ? 1 : 0; break; }
    }
    out[x + y * cols] = v;
  }
  return out;
}
function dilateImg(a, se) { return morph(a, se, true); }
function erodeImg(a, se) { return morph(a, se, false); }
function openImg(a, se) { return dilateImg(erodeImg(a, se), se); }
function closeImg(a, se) { return erodeImg(dilateImg(a, se), se); }
function textToGrid(str, px) {
  let pg = createGraphics(cols, rows);
  pg.pixelDensity(1);
  pg.background(0); pg.fill(255); pg.noStroke();
  pg.textAlign(CENTER, CENTER); pg.textStyle(BOLD); pg.textSize(px);
  pg.text(str, cols / 2, rows / 2);
  pg.loadPixels();
  let out = new Uint8Array(cols * rows);
  for (let i = 0; i < cols * rows; i++) out[i] = pg.pixels[i * 4] > 127 ? 1 : 0;
  pg.remove();
  return out;
}
