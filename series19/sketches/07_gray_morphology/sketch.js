// ============================================
// 07 グレースケール・モルフォロジー
// 0/1 のかわりに明るさ（0〜1）。膨張 = SE の中の最大値、収縮 = 最小値 ── それだけで同じ道具が全部使える
// トップハット（元 − オープニング）= 小さく明るいもの、ブラックハット（クロージング − 元）= 小さく暗いもの
// 1〜7 で操作 / 左右で SE の大きさ / K で SE の形 / N で別の画像 / マウス上下 = 断面の行
// ============================================

let cols = 80, rows = 56, cell, oy = 130;
let gray, result;
let op = 2;          // ★ 1 元 2 膨張 3 収縮 4 オープン 5 クローズ 6 トップハット 7 ブラックハット
let seR = 2;         // ★ SE の半径
let seKind = 'disk'; // ★ 'box' 'disk'
let se = [], seed = 1, dirty = true;
let bufA, bufB; // 画像を描くためのバッファ（毎フレーム 1 マスずつ描くより速い）
let opNames = { 1: '元の画像', 2: '膨張（max）', 3: '収縮（min）', 4: 'オープニング', 5: 'クロージング', 6: 'トップハット', 7: 'ブラックハット' };
let formulas = { 1: 'f', 2: 'f ⊕ B = max', 3: 'f ⊖ B = min', 4: '(f ⊖ B) ⊕ B', 5: '(f ⊕ B) ⊖ B', 6: 'f − (f ∘ B)', 7: '(f • B) − f' };

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  cell = min((width - 70) / 2 / cols, (height - 310) / rows);
  noSmooth();
  bufA = createImage(cols, rows);
  bufB = createImage(cols, rows);
  makeImage();
}

// ★ 画像：ゆるい明るさの変化 + 明るい丸 + 暗い四角 + 細かい点
function makeImage() {
  noiseSeed(seed); randomSeed(seed);
  gray = new Float32Array(cols * rows);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    let v = 0.25 + 0.3 * noise(x * 0.05, y * 0.05) + 0.2 * (x / cols);
    if (dist(x, y, 20, 20) < 9) v += 0.4;
    if (dist(x, y, 58, 36) < 12) v += 0.3;
    if (x > 40 && x < 52 && y > 8 && y < 24) v -= 0.3;
    if (random() < 0.04) v += random() < 0.5 ? 0.5 : -0.5;
    gray[x + y * cols] = constrain(v, 0, 1);
  }
  dirty = true;
}

function recompute() {
  se = makeSE(seKind, seR);
  let f = gray;
  if (op === 1) result = f;
  else if (op === 2) result = grayDilate(f, se);
  else if (op === 3) result = grayErode(f, se);
  else if (op === 4) result = grayDilate(grayErode(f, se), se);
  else if (op === 5) result = grayErode(grayDilate(f, se), se);
  else if (op === 6) { let o = grayDilate(grayErode(f, se), se); result = f.map((v, i) => v - o[i]); }
  else { let c = grayErode(grayDilate(f, se), se); result = c.map((v, i) => v - f[i]); }
  toBuffer(gray, bufA);
  toBuffer(result, bufB);
  dirty = false;
}
// 明るさの配列 → 画像バッファ
function toBuffer(a, buf) {
  buf.loadPixels();
  for (let i = 0; i < a.length; i++) {
    let v = constrain(a[i], 0, 1) * 255;
    buf.pixels[i * 4] = v; buf.pixels[i * 4 + 1] = v; buf.pixels[i * 4 + 2] = v; buf.pixels[i * 4 + 3] = 255;
  }
  buf.updatePixels();
}

function drawPanel(buf, px, title, sub) {
  noStroke();
  image(buf, px, oy, cols * cell, rows * cell);
  fill(0, 0, 100); textSize(17); text(title, px, oy - 30);
  fill(0, 0, 60); textSize(13); text(sub, px, oy - 10);
}

function draw() {
  background(170, 45, 9);
  if (dirty) recompute();
  let pw = cols * cell, gap = 30;
  drawPanel(bufA, 20, '元の画像 f', '明るさ 0〜1');
  drawPanel(bufB, 20 + pw + gap, opNames[op] + '：' + formulas[op], 'SE = ' + (seKind === 'box' ? '正方形' : '円') + ' ' + (2 * seR + 1) + '×' + (2 * seR + 1) + '（左右で大きさ、K で形）');

  // 断面：マウスの行の明るさを折れ線に
  let my = constrain(floor((mouseY - oy) / cell), 0, rows - 1);
  stroke(45, 90, 100, 70); strokeWeight(1);
  line(20, oy + my * cell + cell / 2, 20 + pw, oy + my * cell + cell / 2);
  line(20 + pw + gap, oy + my * cell + cell / 2, 20 + 2 * pw + gap, oy + my * cell + cell / 2);
  let gy = oy + rows * cell + 50, gh = height - gy - 40, gw = 2 * pw + gap;
  if (gh > 30) {
    noStroke(); fill(170, 30, 14); rect(20, gy, gw, gh);
    for (let [a, hue] of [[gray, 0], [result, 45]]) {
      stroke(hue, hue ? 90 : 0, 100); strokeWeight(hue ? 2.5 : 1.5); noFill();
      beginShape();
      for (let x = 0; x < cols; x++) vertex(20 + (x / (cols - 1)) * gw, gy + gh - constrain(a[x + my * cols], 0, 1) * (gh - 6) - 3);
      endShape();
    }
    noStroke(); textSize(13);
    fill(0, 0, 100); text('― 元 f（行 ' + my + '）', 28, gy + 16);
    fill(45, 90, 100); text('― ' + opNames[op], 150, gy + 16);
  }

  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text('1〜7：操作（1 元 2 膨張 3 収縮 4 オープン 5 クローズ 6 トップハット 7 ブラックハット）　左右：SE　K：形　N：別の画像　マウス上下：断面', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  let hint = { 1: 'ゆるい明暗 + 明るい丸 + 暗い四角 + ゴマ塩ノイズ。右で操作を選ぶと何が残る？', 2: '最大値フィルタ：明るい所が広がる。暗い点は消え、明るい点は太る', 3: '最小値フィルタ：暗い所が広がる。明るい点は消え、暗い点は太る', 4: '明るい小さなもの（ノイズの白点）が消え、大きな明るい丸は残る', 5: '暗い小さなもの（ノイズの黒点）が埋まり、大きな暗い四角は残る', 6: '背景のゆるい明るさの変化を消して「小さく明るいもの」だけ取り出す（照明むら補正）', 7: '「小さく暗いもの」だけ取り出す（文字・ひび・血管の検出）' };
  text(hint[op], 20, 68);
}

function keyPressed() {
  if (key >= '1' && key <= '7') op = int(key);
  if (key === LEFT_ARROW) seR = max(1, seR - 1);
  if (key === RIGHT_ARROW) seR = min(6, seR + 1);
  if (key === 'k' || key === 'K') seKind = seKind === 'box' ? 'disk' : 'box';
  if (key === 'n' || key === 'N') { seed++; makeImage(); }
  dirty = true;
}

// ---------- やってみよう ----------
// 1. トップハット（6）で SE を大きくしていく。明るい丸が「背景」から「対象」に変わるのはいつ？
// 2. 断面の折れ線を見ながら 2 と 3 を切り替える。山が太る・谷が太る、を確認
// 3. makeImage の「文字」版を作る：pg.text で文字を描き、その明るさをノイズに重ねて 7 で取り出す

// ==================================================
// ここから下は「モルフォロジーの道具」（構造要素・グレースケールの膨張と収縮）
// （中身は読まなくても OK。消さないでね）
// ==================================================
function makeSE(kind, r) {
  let out = [];
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (kind === 'box') out.push([dx, dy]);
    else if (dx * dx + dy * dy <= r * r + r * 0.5) out.push([dx, dy]);
  }
  return out;
}
// グレースケールの膨張（max）／収縮（min）。画像の外側は端の値とみなす
function grayMorph(a, se, isMax) {
  let out = new Float32Array(a.length);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    let v = isMax ? -1 : 2;
    for (let k = 0; k < se.length; k++) {
      let nx = x + se[k][0], ny = y + se[k][1];
      if (nx < 0) nx = 0; else if (nx >= cols) nx = cols - 1;
      if (ny < 0) ny = 0; else if (ny >= rows) ny = rows - 1;
      let s = a[nx + ny * cols];
      if (isMax ? s > v : s < v) v = s;
    }
    out[x + y * cols] = v;
  }
  return out;
}
function grayDilate(a, se) { return grayMorph(a, se, true); }
function grayErode(a, se) { return grayMorph(a, se, false); }
