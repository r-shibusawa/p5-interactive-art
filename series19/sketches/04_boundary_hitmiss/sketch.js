// ============================================
// 04 境界抽出とヒット・オア・ミス
// 境界 = A − (A ⊖ B)：収縮して消えた部分 = 形のふち（1 マスの太さ）
// ヒット・オア・ミス：「ここは 1、ここは 0」という 3×3 のパターンにぴったり合う場所だけを見つける（角・孤立点・線の端）
// B で境界の種類（内側／外側／なし） / 1〜4 でパターン / ドラッグで描く / E で消しゴム / R でお手本 / C で全部消す
// ============================================

let cols = 96, rows = 64, cell, ox = 20, oy = 110;
let img;
let se = [];
let boundaryMode = 1; // 0 = なし, 1 = 内側 A−(A⊖B), 2 = 外側 (A⊕B)−A
let patternNo = 1, eraser = false;
// ★ パターン：'1' = 前景, '0' = 背景, '.' = どちらでもよい（3 行 × 3 文字）
let base = {
  1: ['00.', '011', '.11'],  // 左上の角
  3: ['000', '010', '000'],  // 孤立した 1 点
  4: ['000', '010', '.1.'],  // 線の端（下につながる）
};
let patNames = { 1: '左上の角', 2: '4 つの角', 3: '孤立点', 4: '線の端点' };
let patterns = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  cell = min((width - 400) / cols, (height - 140) / rows);
  se = makeSE('box', 1);
  img = new Uint8Array(cols * rows);
  preset();
  setPattern(1);
}

function preset() {
  img.fill(0);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (x > 8 && x < 36 && y > 8 && y < 30) img[x + y * cols] = 1;                           // 四角
    if ((x > 46 && x < 56 && y > 8 && y < 40) || (x > 46 && x < 80 && y > 30 && y < 40)) img[x + y * cols] = 1; // L
    if (y === 50 && x > 10 && x < 50) img[x + y * cols] = 1;                                 // 横線
    if (x === 70 && y > 44 && y < 60) img[x + y * cols] = 1;                                 // 縦線
    if (dist(x, y, 84, 16) < 7) img[x + y * cols] = 1;                                       // 円
  }
  for (let [x, y] of [[60, 52], [88, 50], [20, 58], [40, 60]]) img[x + y * cols] = 1;         // 孤立点
}

// パターンを 90° 回す
function rot(p) {
  let r = ['', '', ''];
  for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) r[y] += p[2 - x][y];
  return r;
}
function setPattern(n) {
  patternNo = n;
  if (n === 2) { patterns = [base[1]]; for (let k = 0; k < 3; k++) patterns.push(rot(patterns[k])); }
  else if (n === 4) { patterns = [base[4]]; for (let k = 0; k < 3; k++) patterns.push(rot(patterns[k])); }
  else patterns = [base[n]];
}

// ★ ヒット・オア・ミス：パターンが完全に一致するマスを 1 にする（画像の外は 0 とみなす）
function hitOrMiss(a, pats) {
  let out = new Uint8Array(a.length);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    for (let p of pats) {
      let ok = true;
      for (let dy = -1; dy <= 1 && ok; dy++) for (let dx = -1; dx <= 1; dx++) {
        let c = p[dy + 1][dx + 1];
        if (c === '.') continue;
        let nx = x + dx, ny = y + dy;
        let v = nx < 0 || ny < 0 || nx >= cols || ny >= rows ? 0 : a[nx + ny * cols];
        if ((c === '1') !== (v === 1)) { ok = false; break; }
      }
      if (ok) { out[x + y * cols] = 1; break; }
    }
  }
  return out;
}

function draw() {
  background(170, 45, 9);
  let er = erodeImg(img, se), di = dilateImg(img, se);
  let hm = hitOrMiss(img, patterns);
  noStroke();
  fill(170, 30, 16);
  rect(ox, oy, cols * cell, rows * cell);
  let nB = 0, nH = 0;
  for (let i = 0; i < img.length; i++) {
    let isB = boundaryMode === 1 ? img[i] && !er[i] : boundaryMode === 2 ? di[i] && !img[i] : false;
    if (isB) { nB++; fill(350, 80, 100); }
    else if (img[i]) fill(150, 50, boundaryMode ? 55 : 95);
    else continue;
    rect(ox + (i % cols) * cell, oy + floor(i / cols) * cell, cell - 1, cell - 1);
  }
  for (let i = 0; i < img.length; i++) {
    if (!hm[i]) continue;
    nH++;
    fill(45, 90, 100);
    circle(ox + (i % cols) * cell + cell / 2, oy + floor(i / cols) * cell + cell / 2, cell * 1.6);
  }
  // 右：パターンの図
  let px = ox + cols * cell + 40, py = oy, big = 24;
  fill(0, 0, 100); textSize(16);
  text('パターン ' + patternNo + '：' + patNames[patternNo] + '（' + patterns.length + ' 方向）', px, py - 10);
  for (let k = 0; k < patterns.length; k++) {
    let p = patterns[k], qx = px + (k % 2) * 90, qy = py + floor(k / 2) * 90;
    for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) {
      let c = p[y][x];
      fill(c === '1' ? 150 : c === '0' ? 350 : 170, c === '.' ? 20 : 60, c === '.' ? 30 : 90);
      rect(qx + x * big, qy + y * big, big - 2, big - 2);
      fill(0, 0, 100); textSize(13); textAlign(CENTER, CENTER);
      text(c === '.' ? '·' : c, qx + x * big + big / 2 - 1, qy + y * big + big / 2);
      textAlign(LEFT, BASELINE);
    }
  }
  let ty = py + (patterns.length > 2 ? 2 : 1) * 90 + 30;
  textSize(15);
  fill(150, 60, 90); text('■ 1 = 前景でなければならない（B1）', px, ty);
  fill(350, 60, 90); text('■ 0 = 背景でなければならない（B2）', px, ty + 24);
  fill(0, 0, 60); text('·  どちらでもよい', px, ty + 48);
  fill(45, 90, 100); text('● 一致した場所：' + nH, px, ty + 84);
  fill(350, 80, 100); text('■ 境界のマス：' + nB + '（' + ['なし', '内側 A − (A⊖B)', '外側 (A⊕B) − A'][boundaryMode] + '）', px, ty + 108);
  fill(0, 0, 60);
  text('A ⊛ B = (A ⊖ B1) ∩ (Aᶜ ⊖ B2)', px, ty + 144);
  text('「前景に B1 が入り、背景に B2 が入る」', px, ty + 168);

  fill(0, 0, 100);
  textSize(18);
  text('B：境界の種類　1〜4：パターン　ドラッグで描く（' + (eraser ? '消しゴム' : 'ペン') + '　E で切替）　R：お手本　C：全部消す', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('赤 = 境界（収縮で消えた 1 マス分）。黄 = パターンにぴったり合った場所。四角の角、孤立点、線の端だけを狙い撃ちできる', 20, 68);
}

function paint() {
  let gx = floor((mouseX - ox) / cell), gy = floor((mouseY - oy) / cell);
  if (gx >= 0 && gy >= 0 && gx < cols && gy < rows) img[gx + gy * cols] = eraser ? 0 : 1;
}
function mousePressed() { paint(); }
function mouseDragged() { paint(); }
function keyPressed() {
  if (key === 'b' || key === 'B') boundaryMode = (boundaryMode + 1) % 3;
  if (key >= '1' && key <= '4') setPattern(int(key));
  if (key === 'e' || key === 'E') eraser = !eraser;
  if (key === 'r' || key === 'R') preset();
  if (key === 'c' || key === 'C') img.fill(0);
}

// ---------- やってみよう ----------
// 1. パターン 2（4 つの角）で四角は 4 か所。L 字はいくつ？ 円には角があるか？
// 2. 1 マスずつ描いて、「孤立点」が一致する条件を確かめる（となりに 1 つでも点があるとダメ）
// 3. base に自分のパターンを足してみる。例：穴の内側の角、'011' '111' '111' で「右下が欠けていない場所」

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
