// ============================================
// 05 細線化とスケルトン
// 細線化（Zhang–Suen）：形のふちを「つながりを壊さないように」少しずつ削って、太さ 1 の線にする
// モルフォロジー・スケルトン（Lantuéjoul）：収縮を k 回 → それをオープニングして引く、を全部足す
// スペースで 1 ステップ / A で自動 / M で方式を切替 / 1〜3 でお手本 / ドラッグで描く / R でもどす
// ============================================

let cols = 96, rows = 64, cell, ox = 20, oy = 110;
let img, orig, removed, skel;
let mode = 'thin'; // ★ 'thin' = Zhang–Suen, 'skel' = モルフォロジー・スケルトン
let pass = 0, iter = 0, done = false, auto = false;
let kStep = 0, seB = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  cell = min((width - 400) / cols, (height - 140) / rows);
  seB = makeSE('box', 1); // ★ スケルトン用の SE（3×3）
  preset(1);
}

function preset(k) {
  if (k === 1) orig = textToGrid('p5', 60);
  else if (k === 2) {
    orig = new Uint8Array(cols * rows);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if ((x > 10 && x < 40 && y > 10 && y < 54) || (x > 30 && x < 86 && y > 24 && y < 40) || dist(x, y, 76, 16) < 9) orig[x + y * cols] = 1;
    }
  } else {
    orig = new Uint8Array(cols * rows);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (noise(x * 0.07, y * 0.07) > 0.52) orig[x + y * cols] = 1;
  }
  reset();
}
function reset() {
  img = Uint8Array.from(orig);
  removed = new Uint8Array(cols * rows);
  skel = new Uint8Array(cols * rows);
  pass = 0; iter = 0; kStep = 0; done = false;
}

function at(x, y) { return x < 0 || y < 0 || x >= cols || y >= rows ? 0 : img[x + y * cols]; }

// ★ Zhang–Suen の 1 サブイテレーション（pass 0 と 1 を交互に）
function stepThin() {
  if (done) return;
  let del = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (!img[x + y * cols]) continue;
    let p2 = at(x, y - 1), p3 = at(x + 1, y - 1), p4 = at(x + 1, y), p5 = at(x + 1, y + 1);
    let p6 = at(x, y + 1), p7 = at(x - 1, y + 1), p8 = at(x - 1, y), p9 = at(x - 1, y - 1);
    let n = [p2, p3, p4, p5, p6, p7, p8, p9];
    let B = n.reduce((s, v) => s + v, 0);               // 近傍の 1 の数
    let A = 0;                                            // 0 → 1 に変わる回数（一周）
    for (let k = 0; k < 8; k++) if (n[k] === 0 && n[(k + 1) % 8] === 1) A++;
    let c1 = pass === 0 ? p2 * p4 * p6 === 0 && p4 * p6 * p8 === 0 : p2 * p4 * p8 === 0 && p2 * p6 * p8 === 0;
    if (B >= 2 && B <= 6 && A === 1 && c1) del.push(x + y * cols);
  }
  removed.fill(0);
  for (let i of del) { img[i] = 0; removed[i] = 1; }
  if (pass === 1) iter++;
  if (del.length === 0 && pass === 1) done = true;
  pass = 1 - pass;
}

// ★ スケルトンの k 番目の部分 S_k = (A ⊖ kB) − ((A ⊖ kB) ∘ B)
function stepSkel() {
  if (done) return;
  let o = dilateImg(erodeImg(img, seB), seB);
  removed.fill(0);
  let any = false;
  for (let i = 0; i < img.length; i++) {
    if (img[i] && !o[i]) { skel[i] = 1; removed[i] = 1; }
    if (img[i]) any = true;
  }
  img = erodeImg(img, seB);
  kStep++;
  if (!any || kStep > 40) done = true;
}

function draw() {
  background(170, 45, 9);
  if (auto && frameCount % 6 === 0) (mode === 'thin' ? stepThin : stepSkel)();
  noStroke();
  fill(170, 30, 16);
  rect(ox, oy, cols * cell, rows * cell);
  let area = 0, nSkel = 0;
  for (let i = 0; i < img.length; i++) {
    let x = ox + (i % cols) * cell, y = oy + floor(i / cols) * cell;
    if (mode === 'skel' && orig[i] && !img[i]) { fill(150, 40, 35); rect(x, y, cell - 1, cell - 1); } // 削られた元の形
    if (removed[i]) { fill(mode === 'thin' ? 350 : 45, 85, 100); rect(x, y, cell - 1, cell - 1); }
    else if (mode === 'skel' && skel[i]) { nSkel++; fill(45, 90, 100); rect(x, y, cell - 1, cell - 1); }
    else if (img[i]) { area++; fill(150, 60, 95); rect(x, y, cell - 1, cell - 1); }
  }
  let px = ox + cols * cell + 40, ty = oy + 10;
  textSize(16);
  if (mode === 'thin') {
    fill(45, 90, 100); textSize(34); text('細線化 ' + iter + ' 周', px, ty + 20);
    textSize(16); fill(0, 0, 100);
    text('次：サブステップ ' + (pass + 1) + (done ? '（完了）' : ''), px, ty + 50);
    text('残りのマス：' + area, px, ty + 76);
    fill(0, 0, 60);
    text('ふちのマス p を消す条件：', px, ty + 116);
    text('・近傍の 1 が 2〜6 個', px, ty + 140);
    text('　（線の端でも、内部でもない）', px, ty + 164);
    text('・一周して 0→1 がちょうど 1 回', px, ty + 188);
    text('　（消してもつながりが切れない）', px, ty + 212);
    text('・第 1 段は右か下が 0、第 2 段は左か上が 0', px, ty + 236);
    text('赤 = このステップで消えたマス', px, ty + 272);
    text('全方向から同じだけ削るので中心線が残る', px, ty + 296);
  } else {
    fill(45, 90, 100); textSize(34); text('収縮 ' + kStep + ' 回', px, ty + 20);
    textSize(16); fill(0, 0, 100);
    text('スケルトンのマス：' + nSkel + (done ? '（完了）' : ''), px, ty + 50);
    fill(0, 0, 60);
    text('S_k = (A ⊖ kB) − ((A ⊖ kB) ∘ B)', px, ty + 90);
    text('= k 回収縮した形のうち、', px, ty + 114);
    text('　オープニングで消えてしまう「とがった所」', px, ty + 138);
    text('スケルトン S = S_0 ∪ S_1 ∪ … （黄色）', px, ty + 162);
    text('黄 = 今回見つかった S_k', px, ty + 198);
    text('暗い緑 = 削られた元の形', px, ty + 222);
    text('S_k を k 回膨張して全部足すと A に戻る', px, ty + 258);
    text('つながりは保証されない（ばらばらになる）', px, ty + 282);
  }

  fill(0, 0, 100);
  textSize(18);
  text('スペース：1 ステップ　A：自動（' + (auto ? 'ON' : 'OFF') + '）　M：方式（' + (mode === 'thin' ? 'Zhang–Suen 細線化' : 'モルフォロジー・スケルトン') + '）　1〜3：お手本　ドラッグで描く　R：もどす', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text(mode === 'thin' ? '「太さ 1 でつながった中心線」が欲しい（文字認識・指紋・道路地図）。収縮だと細い所が先に切れるので、条件つきで削る' : 'モルフォロジーだけで作る骨格。中心線に「近い」が、とぎれたり点になったりする。細線化と見比べよう', 20, 68);
}

function paint() {
  let gx = floor((mouseX - ox) / cell), gy = floor((mouseY - oy) / cell);
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    let x = gx + dx, y = gy + dy;
    if (x >= 0 && y >= 0 && x < cols && y < rows && dx * dx + dy * dy <= 5) { img[x + y * cols] = 1; orig[x + y * cols] = 1; }
  }
  done = false;
}
function mousePressed() { paint(); }
function mouseDragged() { paint(); }
function keyPressed() {
  if (key === ' ') (mode === 'thin' ? stepThin : stepSkel)();
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'm' || key === 'M') { mode = mode === 'thin' ? 'skel' : 'thin'; reset(); }
  if (key >= '1' && key <= '3') preset(int(key));
  if (key === 'r' || key === 'R') reset();
}

// ---------- やってみよう ----------
// 1. 太い線を描いて細線化。何周で終わる？（太さの半分くらい）
// 2. 「p5」の細線化とスケルトンを見比べる。どちらが文字として読みやすい？
// 3. お手本 2 の四角：細線化すると線の端に「ひげ」が出る。ひげを消すには？（端点から数回削る = 枝刈り）

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
