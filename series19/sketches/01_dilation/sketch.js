// ============================================
// 01 膨張（dilation）A ⊕ B
// 構造要素 B を画像の上でなぞり、少しでも前景に当たったマスを ON にする → 形が太る
// 離れていたものがくっつき、小さな穴やすき間は埋まる
// スペースで 1 回膨張（黄色 = 新しく増えたマス） / A で自動 / 1〜3 でお手本 / 左右で SE の大きさ / K で SE の形 / D で描くモード / R でもどす
// ============================================

let cols = 96, rows = 64, cell, ox = 20, oy = 110;
let img, orig, added;
let seKind = 'disk'; // ★ 'box' 'cross' 'disk'
let seR = 1;         // ★ SE の半径
let se = [];
let steps = 0, auto = false, drawMode = false, shape = 1;
let kinds = ['box', 'cross', 'disk'], seNames = { box: '正方形', cross: '十字', disk: '円' };

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  cell = min((width - 400) / cols, (height - 140) / rows);
  preset(1);
  se = makeSE(seKind, seR);
}

function preset(k) {
  shape = k;
  orig = new Uint8Array(cols * rows);
  if (k === 1) {
    // すき間のある 2 つの円と、点線
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if (dist(x, y, 26, 30) < 13 || dist(x, y, 54, 30) < 11) orig[x + y * cols] = 1;
      if (y === 54 && x > 10 && x < 86 && x % 4 < 2) orig[x + y * cols] = 1;
      if (x > 70 && x < 90 && y > 10 && y < 44 && !(x > 76 && x < 84 && y > 18 && y < 36)) orig[x + y * cols] = 1;
    }
  } else if (k === 2) {
    orig = textToGrid('p5', 56);
  } else {
    randomSeed(3);
    for (let k2 = 0; k2 < 120; k2++) orig[floor(random(cols)) + floor(random(rows)) * cols] = 1;
  }
  reset();
}
function reset() {
  img = Uint8Array.from(orig);
  added = new Uint8Array(cols * rows);
  steps = 0;
}

// ★ 1 回の膨張。新しく ON になったマスを added に記録
function stepDilate() {
  let next = dilateImg(img, se);
  for (let i = 0; i < img.length; i++) added[i] = next[i] && !img[i] ? 1 : 0;
  img = next;
  steps++;
}

function draw() {
  background(170, 45, 9);
  if (auto && frameCount % 20 === 0) stepDilate();
  noStroke();
  fill(170, 30, 16);
  rect(ox, oy, cols * cell, rows * cell);
  let area = 0, nAdded = 0;
  for (let i = 0; i < cols * rows; i++) {
    if (!img[i]) continue;
    area++;
    if (added[i]) { nAdded++; fill(45, 90, 100); } else fill(150, 60, 95);
    rect(ox + (i % cols) * cell, oy + floor(i / cols) * cell, cell - 1, cell - 1);
  }
  // 右：SE と数値
  let px = ox + cols * cell + 40, py = oy, big = 20;
  fill(0, 0, 100); textSize(16);
  text('構造要素 B：' + seNames[seKind] + ' ' + (2 * seR + 1) + '×' + (2 * seR + 1), px, py - 10);
  for (let dy = -seR; dy <= seR; dy++) for (let dx = -seR; dx <= seR; dx++) {
    let on = se.some((o) => o[0] === dx && o[1] === dy);
    fill(on ? 150 : 170, on ? 60 : 30, on ? 95 : 20);
    rect(px + (dx + seR) * big, py + (dy + seR) * big, big - 2, big - 2);
  }
  let ty = py + (2 * seR + 1) * big + 40;
  textSize(40); fill(45, 90, 100);
  text('膨張 ' + steps + ' 回', px, ty);
  textSize(16); fill(0, 0, 100);
  text('前景のマス：' + area + '（+' + nAdded + '）', px, ty + 36);
  fill(0, 0, 60);
  text('A ⊕ B = { p | p に置いた B が A に当たる }', px, ty + 70);
  text('= A の各点に B を置いた和集合', px, ty + 94);
  text('黄色：今回ふえたマス', px, ty + 128);
  text('n 回の膨張 ≒ 半径 n×r の円で膨張', px, ty + 152);
  text('くっつく・穴が埋まる・太る', px, ty + 176);

  fill(0, 0, 100);
  textSize(18);
  text('スペース：1 回膨張　A：自動（' + (auto ? 'ON' : 'OFF') + '）　1〜3：お手本　左右：SE の大きさ　K：SE の形　D：描くモード（' + (drawMode ? 'ON' : 'OFF') + '）　R：もどす', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('膨張は「B がどこかに当たるマスを全部 ON」。離れた 2 つの円はいつくっつく？ 点線はいつ 1 本の線になる？', 20, 68);
}

function paint() {
  if (!drawMode) return;
  let gx = floor((mouseX - ox) / cell), gy = floor((mouseY - oy) / cell);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    let x = gx + dx, y = gy + dy;
    if (x >= 0 && y >= 0 && x < cols && y < rows) { img[x + y * cols] = 1; orig[x + y * cols] = 1; }
  }
}
function mousePressed() { paint(); }
function mouseDragged() { paint(); }
function keyPressed() {
  if (key === ' ') stepDilate();
  if (key === 'a' || key === 'A') auto = !auto;
  if (key >= '1' && key <= '3') preset(int(key));
  if (key === LEFT_ARROW) seR = max(1, seR - 1);
  if (key === RIGHT_ARROW) seR = min(4, seR + 1);
  if (key === 'k' || key === 'K') seKind = kinds[(kinds.indexOf(seKind) + 1) % 3];
  if (key === 'd' || key === 'D') drawMode = !drawMode;
  if (key === 'r' || key === 'R') reset();
  se = makeSE(seKind, seR);
}

// ---------- やってみよう ----------
// 1. お手本 1 で、2 つの円がくっつくまでに何回かかる？ SE を大きくすると回数は？
// 2. お手本 3（ばらばらの点）を膨張し続けると、何がどの順で起きる？
// 3. 正方形で膨張した角と、円で膨張した角の形を見比べる（SE の形が角の形になる）

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
// 膨張（max）と収縮（min）。画像の外側は端のマスと同じ値とみなす
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
// 文字をマス目の画像にする
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
