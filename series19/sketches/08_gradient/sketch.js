// ============================================
// 08 モルフォロジー勾配（エッジ検出）
// 膨張 − 収縮 = 形のふちだけが残る（太さ 2）。元 − 収縮 = 内側のふち、膨張 − 元 = 外側のふち
// 二値画像でもグレースケール画像でも同じ式で動く
// 1〜3 で勾配の種類 / 4〜6 でお手本（図形・文字・グレー） / 左右で SE の大きさ / ドラッグで描く / E で消しゴム / C で全部消す
// ============================================

let cols = 96, rows = 64, cell, oy = 130;
let img, result;
let gradMode = 1;  // ★ 1 = 対称 (f⊕B)−(f⊖B)  2 = 内部 f−(f⊖B)  3 = 外部 (f⊕B)−f
let seR = 1;       // ★ SE の半径
let se = [], dirty = true, eraser = false, shape = 4;
let gradNames = { 1: '対称勾配 (f ⊕ B) − (f ⊖ B)', 2: '内部勾配 f − (f ⊖ B)', 3: '外部勾配 (f ⊕ B) − f' };

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  cell = min((width - 70) / 2 / cols, (height - 220) / rows);
  preset(4);
}

function preset(k) {
  shape = k;
  img = new Float32Array(cols * rows);
  if (k === 4) {
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if (dist(x, y, 26, 30) < 16 || (x > 50 && x < 86 && y > 10 && y < 50 && !(x > 60 && x < 76 && y > 22 && y < 38))) img[x + y * cols] = 1;
    }
  } else if (k === 5) {
    let g = textToGrid('ab', 60);
    for (let i = 0; i < g.length; i++) img[i] = g[i];
  } else {
    noiseSeed(4);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      let v = 0.2 + 0.4 * noise(x * 0.04, y * 0.04);
      if (dist(x, y, 30, 32) < 16) v += 0.35;
      if (x > 56 && x < 86 && y > 14 && y < 50) v += 0.25 + 0.15 * sin(x * 0.5);
      img[x + y * cols] = constrain(v, 0, 1);
    }
  }
  dirty = true;
}

function recompute() {
  se = makeSE('disk', seR);
  let d = grayDilate(img, se), e = grayErode(img, se);
  result = new Float32Array(cols * rows);
  for (let i = 0; i < result.length; i++) result[i] = gradMode === 1 ? d[i] - e[i] : gradMode === 2 ? img[i] - e[i] : d[i] - img[i];
  dirty = false;
}

function draw() {
  background(170, 45, 9);
  if (dirty) recompute();
  let pw = cols * cell, gap = 30, px2 = 20 + pw + gap;
  noStroke();
  fill(170, 30, 16); rect(20, oy, pw, rows * cell); rect(px2, oy, pw, rows * cell);
  let nEdge = 0;
  for (let i = 0; i < img.length; i++) {
    let x = (i % cols) * cell, y = oy + floor(i / cols) * cell;
    if (img[i] > 0.02) { fill(150, 30, 20 + img[i] * 75); rect(20 + x, y, cell - 1, cell - 1); }
    let g = result[i];
    if (g > 0.02) { nEdge += g > 0.5 ? 1 : 0; fill(45 - g * 20, 90, 40 + g * 60); rect(px2 + x, y, cell - 1, cell - 1); }
  }
  fill(0, 0, 100); textSize(17);
  text('元の画像 f（ドラッグで描く）', 20, oy - 30);
  text(gradNames[gradMode], px2, oy - 30);
  fill(0, 0, 60); textSize(13);
  text(shape === 6 ? 'グレースケール' : '二値画像（0 / 1）', 20, oy - 10);
  text('SE = 円 ' + (2 * seR + 1) + '×' + (2 * seR + 1) + '　強いエッジのマス：' + nEdge + '　明るさ = 勾配の大きさ', px2, oy - 10);

  let by = oy + rows * cell + 30;
  fill(0, 0, 100); textSize(15);
  text('対称勾配：ふちの内側と外側の両方（太さ 2r）　内部勾配：ふちの内側だけ　外部勾配：ふちの外側だけ', 20, by);
  fill(0, 0, 60);
  text('グレースケールでは「SE の範囲内の明るさの差（max − min）」= 画像の変化の大きさ。SE を大きくすると、ゆるい変化も拾うようになる', 20, by + 24);
  text('Sobel などの微分フィルタと違い、方向を持たない・線形ではない。ノイズに強く、物体の輪郭がきれいに閉じる（→ 12 ウォーターシェッドの入力）', 20, by + 48);

  fill(0, 0, 100);
  textSize(18);
  text('1〜3：勾配の種類　4〜6：お手本（図形・文字・グレー）　左右：SE の大きさ　ドラッグで描く（' + (eraser ? '消しゴム' : 'ペン') + '　E で切替）　C：全部消す', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('膨張で太らせた形から収縮でやせた形を引くと、ふちだけが残る。「太らせる − やせさせる」がエッジ検出', 20, 68);
}

function paint() {
  let gx = floor((mouseX - 20) / cell), gy = floor((mouseY - oy) / cell);
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    let x = gx + dx, y = gy + dy;
    if (x >= 0 && y >= 0 && x < cols && y < rows && dx * dx + dy * dy <= 5) img[x + y * cols] = eraser ? 0 : 1;
  }
  dirty = true;
}
function mousePressed() { paint(); }
function mouseDragged() { paint(); }
function keyPressed() {
  if (key >= '1' && key <= '3') gradMode = int(key);
  if (key >= '4' && key <= '6') preset(int(key));
  if (key === LEFT_ARROW) seR = max(1, seR - 1);
  if (key === RIGHT_ARROW) seR = min(4, seR + 1);
  if (key === 'e' || key === 'E') eraser = !eraser;
  if (key === 'c' || key === 'C') img.fill(0);
  dirty = true;
}

// ---------- やってみよう ----------
// 1. 内部勾配と外部勾配を足すと対称勾配になる。4 の四角でふちの太さを数えて確かめる
// 2. グレー画像（6）で SE を大きくする。細かい縞（sin）と大きな丸、どちらが先に消える？
// 3. 「勾配 > しきい値」で二値化してから 05 の細線化にかけると、太さ 1 の輪郭線になる

// ==================================================
// ここから下は「モルフォロジーの道具」（構造要素・グレースケールの膨張と収縮・文字の画像）
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
