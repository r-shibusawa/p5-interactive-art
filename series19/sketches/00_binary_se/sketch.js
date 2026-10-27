// ============================================
// 00 二値画像と構造要素（モルフォロジーの材料）
// 画像を「0 と 1 のマス目」として扱い、小さな形 = 構造要素（SE）を画像の上で動かす
// SE が「すっぽり入る」か「少しでも当たる」か ── これが収縮と膨張の正体
// ドラッグで描く / E で消しゴム / 1〜3 で SE の形（正方形・十字・円） / 左右で SE の大きさ / R でお手本 / C で全部消す
// ============================================

let cols = 96, rows = 64, cell, ox = 20, oy = 110;
let img;            // 0 / 1 の配列（1 = 前景 = 白いマス）
let seKind = 'box'; // ★ 'box'（正方形） 'cross'（十字） 'disk'（円）
let seR = 1;        // ★ SE の半径（1 なら 3×3）
let se = [];
let eraser = false;
let seNames = { box: '正方形', cross: '十字', disk: '円' };

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  cell = min((width - 400) / cols, (height - 140) / rows);
  img = new Uint8Array(cols * rows);
  preset();
  se = makeSE(seKind, seR);
}

// お手本：リング、穴あき四角、小さなゴミ
function preset() {
  img.fill(0);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    let d = dist(x, y, 30, 32);
    if (d < 19 && d > 8) img[x + y * cols] = 1;
    if (x > 56 && x < 86 && y > 12 && y < 52) img[x + y * cols] = 1;
    if (x > 66 && x < 74 && y > 26 && y < 40) img[x + y * cols] = 0;
  }
  for (let k = 0; k < 30; k++) img[floor(random(cols * rows))] = 1; // ★ ゴミの数
}

function draw() {
  background(170, 45, 9);
  // 画像
  noStroke();
  fill(170, 30, 16);
  rect(ox, oy, cols * cell, rows * cell);
  let area = 0;
  for (let i = 0; i < cols * rows; i++) {
    if (!img[i]) continue;
    area++;
    fill(150, 60, 95);
    rect(ox + (i % cols) * cell, oy + floor(i / cols) * cell, cell - 1, cell - 1);
  }

  // マウスの位置に SE を重ねる：すっぽり入る（fits）？ 当たる（hits）？
  let mx = floor((mouseX - ox) / cell), my = floor((mouseY - oy) / cell);
  let fits = false, hits = false, inside = mx >= 0 && my >= 0 && mx < cols && my < rows;
  if (inside) {
    let onCount = 0;
    for (let [dx, dy] of se) {
      let nx = constrain(mx + dx, 0, cols - 1), ny = constrain(my + dy, 0, rows - 1);
      if (img[nx + ny * cols]) onCount++;
    }
    fits = onCount === se.length;
    hits = onCount > 0;
    noFill();
    strokeWeight(2);
    stroke(fits ? 45 : hits ? 20 : 0, fits || hits ? 90 : 0, 100);
    for (let [dx, dy] of se) rect(ox + (mx + dx) * cell, oy + (my + dy) * cell, cell - 1, cell - 1);
    noStroke();
    fill(45, 90, 100);
    rect(ox + mx * cell + cell * 0.3, oy + my * cell + cell * 0.3, cell * 0.4, cell * 0.4); // 原点
  }

  // 右：SE の拡大図
  let px = ox + cols * cell + 40, py = oy, big = 22;
  fill(0, 0, 100); textSize(16);
  text('構造要素 B（' + seNames[seKind] + '、' + (2 * seR + 1) + '×' + (2 * seR + 1) + '、' + se.length + ' マス）', px, py - 10);
  for (let dy = -seR; dy <= seR; dy++) for (let dx = -seR; dx <= seR; dx++) {
    let on = se.some((o) => o[0] === dx && o[1] === dy);
    fill(on ? 150 : 170, on ? 60 : 30, on ? 95 : 20);
    rect(px + (dx + seR) * big, py + (dy + seR) * big, big - 2, big - 2);
  }
  fill(45, 90, 100);
  rect(px + seR * big + big * 0.3, py + seR * big + big * 0.3, big * 0.4, big * 0.4);
  let ty = py + (2 * seR + 1) * big + 40;
  textSize(15);
  fill(0, 0, 100);
  text('マウスの位置で B は…', px, ty);
  fill(fits ? 45 : 0, fits ? 90 : 0, fits ? 100 : 40);
  text((fits ? '● ' : '○ ') + 'すっぽり入る（fits）→ 収縮しても残る', px, ty + 26);
  fill(hits ? 20 : 0, hits ? 90 : 0, hits ? 100 : 40);
  text((hits ? '● ' : '○ ') + '少しでも当たる（hits）→ 膨張で ON になる', px, ty + 52);
  fill(0, 0, 60);
  text('前景のマス：' + area + ' / ' + cols * rows, px, ty + 90);
  text('収縮 A ⊖ B = fits するマスの集まり', px, ty + 124);
  text('膨張 A ⊕ B = hits するマスの集まり', px, ty + 148);

  fill(0, 0, 100);
  textSize(18);
  text('ドラッグで描く（' + (eraser ? '消しゴム' : 'ペン') + '　E で切替）　1〜3：SE の形　左右：SE の大きさ　R：お手本　C：全部消す', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('画像 = 0 と 1 のマス目（二値画像）。小さな形 B（構造要素）を画像の上で動かして「入るか」「当たるか」を調べるのがモルフォロジー', 20, 68);
}

function paint() {
  let gx = floor((mouseX - ox) / cell), gy = floor((mouseY - oy) / cell);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    let x = gx + dx, y = gy + dy;
    if (x >= 0 && y >= 0 && x < cols && y < rows) img[x + y * cols] = eraser ? 0 : 1;
  }
}
function mousePressed() { paint(); }
function mouseDragged() { paint(); }
function keyPressed() {
  if (key === '1') seKind = 'box';
  if (key === '2') seKind = 'cross';
  if (key === '3') seKind = 'disk';
  if (key === LEFT_ARROW) seR = max(1, seR - 1);
  if (key === RIGHT_ARROW) seR = min(5, seR + 1);
  if (key === 'e' || key === 'E') eraser = !eraser;
  if (key === 'r' || key === 'R') preset();
  if (key === 'c' || key === 'C') img.fill(0);
  se = makeSE(seKind, seR);
}

// ---------- やってみよう ----------
// 1. SE を大きくして、リングの上でも「すっぽり入る」場所を探す。入らなくなるのは半径いくつから？
// 2. 小さなゴミの上では「当たる」が「入らない」。収縮するとゴミは消える、と予想できる
// 3. 十字と円では「入る」範囲がどう違う？ 四角の角で比べてみよう

// ==================================================
// ここから下は「モルフォロジーの道具」（構造要素）
// ==================================================
// 構造要素：原点からのずれ [dx, dy] のリスト
function makeSE(kind, r) {
  let out = [];
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (kind === 'box') out.push([dx, dy]);
    else if (kind === 'cross') { if (dx === 0 || dy === 0) out.push([dx, dy]); }
    else if (dx * dx + dy * dy <= r * r + r * 0.5) out.push([dx, dy]);
  }
  return out;
}
