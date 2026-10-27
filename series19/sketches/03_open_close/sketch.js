// ============================================
// 03 オープニングとクロージング
// オープニング A∘B = 収縮してから膨張 → 小さなゴミ・細い突起が消える（形はほぼ元のまま）
// クロージング A•B = 膨張してから収縮 → 小さな穴・すき間が埋まる（形はほぼ元のまま）
// 上下でノイズの量 / 左右で SE の大きさ / 1〜3 でお手本 / K で SE の形 / スペースで別のノイズ
// ============================================

let cols = 72, rows = 48, cell, oy = 130;
let clean, noisy, opened, closed;
let noiseP = 0.03;   // ★ ノイズの割合（0〜0.15）
let seR = 1;         // ★ SE の半径
let seKind = 'disk'; // ★ 'box' 'cross' 'disk'
let se = [], seed = 1, shape = 1, dirty = true;
let kinds = ['box', 'cross', 'disk'], seNames = { box: '正方形', cross: '十字', disk: '円' };

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  cell = min((width - 100) / 3 / cols, (height - 260) / rows);
  preset(1);
}

function preset(k) {
  shape = k;
  clean = new Uint8Array(cols * rows);
  if (k === 1) {
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if (dist(x, y, 22, 22) < 14 || (x > 42 && x < 66 && y > 8 && y < 40) || (y > 38 && y < 44 && x > 6 && x < 40)) clean[x + y * cols] = 1;
    }
  } else if (k === 2) clean = textToGrid('ab', 48);
  else for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (noise(x * 0.1, y * 0.1) > 0.52) clean[x + y * cols] = 1;
  dirty = true;
}

// ★ ゴミ（背景に白点）と穴（前景に黒点）をランダムに加える
function addNoise() {
  randomSeed(seed);
  noisy = Uint8Array.from(clean);
  for (let i = 0; i < noisy.length; i++) if (random() < noiseP) noisy[i] = 1 - noisy[i];
}

function recompute() {
  se = makeSE(seKind, seR);
  addNoise();
  opened = dilateImg(erodeImg(noisy, se), se); // オープニング
  closed = erodeImg(dilateImg(noisy, se), se); // クロージング
  dirty = false;
}

// 正解（clean）とのちがいを数える：ゴミ（余計な 1）と穴（足りない 1）
function errors(a) {
  let specks = 0, holes = 0;
  for (let i = 0; i < a.length; i++) { if (a[i] && !clean[i]) specks++; if (!a[i] && clean[i]) holes++; }
  return [specks, holes];
}

function drawPanel(a, px, title, sub) {
  noStroke();
  fill(170, 30, 16);
  rect(px, oy, cols * cell, rows * cell);
  for (let i = 0; i < a.length; i++) {
    if (!a[i]) continue;
    // 正解と違うマスは色を変える（赤 = 余計、青 = 足りないのは描けないので下で数える）
    fill(clean[i] ? 150 : 350, clean[i] ? 60 : 80, 95);
    rect(px + (i % cols) * cell, oy + floor(i / cols) * cell, cell - 1, cell - 1);
  }
  let [s, h] = errors(a);
  fill(0, 0, 100); textSize(17);
  text(title, px, oy - 32);
  fill(0, 0, 60); textSize(13);
  text(sub, px, oy - 12);
  textSize(15);
  fill(350, 80, 100); text('ゴミ（余計な点）' + s, px, oy + rows * cell + 22);
  fill(200, 70, 100); text('穴（足りない点）' + h, px + 175, oy + rows * cell + 22);
}

function draw() {
  background(170, 45, 9);
  if (dirty) recompute();
  let gap = 30, pw = cols * cell;
  drawPanel(noisy, 20, 'ノイズ入り A', 'ゴミと穴をランダムに加えた');
  drawPanel(opened, 20 + pw + gap, 'オープニング A∘B = (A⊖B)⊕B', '収縮 → 膨張。ゴミが消える');
  drawPanel(closed, 20 + 2 * (pw + gap), 'クロージング A•B = (A⊕B)⊖B', '膨張 → 収縮。穴が埋まる');

  fill(0, 0, 100);
  textSize(18);
  text('上下：ノイズ ' + nf(noiseP, 1, 2) + '　左右：SE = ' + seNames[seKind] + ' ' + (2 * seR + 1) + '×' + (2 * seR + 1) + '（K で形）　1〜3：お手本　スペース：別のノイズ', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('収縮だけだと形までやせる。収縮のあと同じ B で膨張すると、残った部分は元の太さに戻る ── これがオープニング。クロージングはその裏返し', 20, 68);
  let by = oy + rows * cell + 60;
  fill(0, 0, 60);
  text('性質：A∘B ⊆ A ⊆ A•B（オープンは削るだけ、クローズは足すだけ）　2 回やっても変わらない（べき等）　B より小さいものは残れない', 20, by);
  text('やってみよう：オープン → クローズ（A∘B)•B で両方のノイズを取る。10 で比べる', 20, by + 24);
}

function keyPressed() {
  if (key === UP_ARROW) noiseP = min(0.15, noiseP + 0.01);
  if (key === DOWN_ARROW) noiseP = max(0, noiseP - 0.01);
  if (key === LEFT_ARROW) seR = max(1, seR - 1);
  if (key === RIGHT_ARROW) seR = min(4, seR + 1);
  if (key === 'k' || key === 'K') seKind = kinds[(kinds.indexOf(seKind) + 1) % 3];
  if (key >= '1' && key <= '3') preset(int(key));
  if (key === ' ') seed++;
  dirty = true;
}

// ---------- やってみよう ----------
// 1. ノイズを増やしていくと、オープニングでも取れないゴミが出てくる。なぜ？（ゴミが集まって B より大きくなる）
// 2. SE を大きくすると、お手本 1 の細い横棒はオープニングで消える。棒の太さと SE の大きさの関係は？
// 3. お手本 2 の文字で、クロージングの SE を大きくすると「a」の穴が埋まる。文字がつぶれない限界は？

// ==================================================
// ここから下は「モルフォロジーの道具」（構造要素・膨張・収縮）
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
