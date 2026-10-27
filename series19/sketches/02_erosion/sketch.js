// ============================================
// 02 収縮（erosion）A ⊖ B
// 構造要素 B が「すっぽり入る」マスだけを残す → 形がやせる。細い所は切れ、小さなゴミは消える
// 双対性：前景を収縮することは、背景を膨張すること（C で補集合の表示に切り替え）
// スペースで 1 回収縮（赤 = 消えたマス） / A で自動 / C で補集合 / 1〜3 でお手本 / 左右で SE の大きさ / K で SE の形 / D で描くモード / R でもどす
// ============================================

let cols = 96, rows = 64, cell, ox = 20, oy = 110;
let img, orig, removed;
let seKind = 'disk'; // ★ 'box' 'cross' 'disk'
let seR = 1;         // ★ SE の半径
let se = [];
let steps = 0, auto = false, drawMode = false, complement = false;
let kinds = ['box', 'cross', 'disk'], seNames = { box: '正方形', cross: '十字', disk: '円' };

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  cell = min((width - 400) / cols, (height - 140) / rows);
  preset(1);
  se = makeSE(seKind, seR);
}

function preset(k) {
  orig = new Uint8Array(cols * rows);
  if (k === 1) {
    // 細いくびれでつながった 2 つの塊、細い線、ゴミ
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if (dist(x, y, 24, 30) < 14 || dist(x, y, 50, 30) < 12) orig[x + y * cols] = 1;
      if (x >= 30 && x <= 44 && abs(y - 30) <= 1) orig[x + y * cols] = 1;
      if (x > 66 && x < 90 && y > 8 && y < 48) orig[x + y * cols] = 1;
      if (y > 52 && y < 55 && x > 8 && x < 60) orig[x + y * cols] = 1;
    }
    randomSeed(5);
    for (let i = 0; i < 40; i++) orig[floor(random(cols * rows))] = 1;
  } else if (k === 2) {
    orig = textToGrid('p5', 56);
  } else {
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (noise(x * 0.09, y * 0.09) > 0.5) orig[x + y * cols] = 1;
  }
  reset();
}
function reset() {
  img = Uint8Array.from(orig);
  removed = new Uint8Array(cols * rows);
  steps = 0;
}

// ★ 1 回の収縮。消えたマスを removed に記録
function stepErode() {
  let next = erodeImg(img, se);
  for (let i = 0; i < img.length; i++) removed[i] = img[i] && !next[i] ? 1 : 0;
  img = next;
  steps++;
}

function draw() {
  background(170, 45, 9);
  if (auto && frameCount % 20 === 0) stepErode();
  noStroke();
  fill(170, 30, 16);
  rect(ox, oy, cols * cell, rows * cell);
  let area = 0, nRemoved = 0;
  for (let i = 0; i < cols * rows; i++) {
    let on = complement ? !img[i] : img[i];
    if (removed[i]) { nRemoved++; fill(complement ? 45 : 350, 90, 100); } // 消えたマス（補集合では「背景がふえたマス」）
    else if (on) fill(complement ? 200 : 150, 60, 95);
    else continue;
    if (on) area++;
    rect(ox + (i % cols) * cell, oy + floor(i / cols) * cell, cell - 1, cell - 1);
  }
  // 双対性チェック：A ⊖ B と (Aᶜ ⊕ B)ᶜ は同じか
  let e = erodeImg(img, se), comp = img.map((v) => 1 - v), d = dilateImg(comp, se);
  let diff = 0;
  for (let i = 0; i < img.length; i++) if (e[i] !== 1 - d[i]) diff++;

  let px = ox + cols * cell + 40, py = oy, big = 20;
  fill(0, 0, 100); textSize(16);
  text('構造要素 B：' + seNames[seKind] + ' ' + (2 * seR + 1) + '×' + (2 * seR + 1), px, py - 10);
  for (let dy = -seR; dy <= seR; dy++) for (let dx = -seR; dx <= seR; dx++) {
    let on = se.some((o) => o[0] === dx && o[1] === dy);
    fill(on ? 150 : 170, on ? 60 : 30, on ? 95 : 20);
    rect(px + (dx + seR) * big, py + (dy + seR) * big, big - 2, big - 2);
  }
  let ty = py + (2 * seR + 1) * big + 40;
  textSize(40); fill(350, 80, 100);
  text('収縮 ' + steps + ' 回', px, ty);
  textSize(16); fill(0, 0, 100);
  text((complement ? '背景' : '前景') + 'のマス：' + area + (complement ? '（黄 = 背景がふえた）' : '（赤 = 消えた ' + nRemoved + '）'), px, ty + 36);
  fill(0, 0, 60);
  text('A ⊖ B = { p | p に置いた B が A に入る }', px, ty + 70);
  text('細い所は切れ、ゴミは消え、穴は広がる', px, ty + 94);
  fill(0, 0, 100);
  text('双対性： A ⊖ B = (Aᶜ ⊕ B)ᶜ', px, ty + 128);
  fill(0, 0, 60);
  text('「前景を収縮」=「背景を膨張」', px, ty + 152);
  text('いまの画像で両者の差：' + diff + ' マス', px, ty + 176);
  text('C で背景（補集合）の表示に切り替え', px, ty + 200);

  fill(0, 0, 100);
  textSize(18);
  text('スペース：1 回収縮　A：自動（' + (auto ? 'ON' : 'OFF') + '）　C：補集合表示（' + (complement ? 'ON' : 'OFF') + '）　1〜3：お手本　左右：SE の大きさ　K：SE の形　D：描く　R：もどす', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text(complement ? '青 = 背景。背景を膨張させると（黄色がふえる）、前景はやせる。つまり同じ操作を裏から見ている' : '収縮は「B がすっぽり入るマスだけ残す」。くびれはいつ切れる？ ゴミが消えるのは何回目？', 20, 68);
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
  if (key === ' ') stepErode();
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'c' || key === 'C') complement = !complement;
  if (key >= '1' && key <= '3') preset(int(key));
  if (key === LEFT_ARROW) seR = max(1, seR - 1);
  if (key === RIGHT_ARROW) seR = min(4, seR + 1);
  if (key === 'k' || key === 'K') seKind = kinds[(kinds.indexOf(seKind) + 1) % 3];
  if (key === 'd' || key === 'D') drawMode = !drawMode;
  if (key === 'r' || key === 'R') reset();
  se = makeSE(seKind, seR);
}

// ---------- やってみよう ----------
// 1. お手本 1 で、くびれが切れるのは何回目？ ゴミが全部消えるのは？（SE の大きさを変えて比べる）
// 2. 収縮を続けると最後に残るのは「いちばん太い場所」。どこが最後まで残る？
// 3. 01 の膨張を n 回 → 収縮を n 回 しても元には戻らない。何が変わる？（→ 03 のクロージング）

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
