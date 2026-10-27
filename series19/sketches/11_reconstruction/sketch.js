// ============================================
// 11 再構成と穴埋め（測地的膨張）
// マーカー（種）を「マスク（元の画像）の中だけで」膨張しつづける = 測地的膨張。止まったものが「再構成」
// 種を置いた塊だけ取り出す ／ 穴を埋める ／ 画面のふちに触れた物体を消す ── 全部この 1 つの道具で
// クリックで種を置く（モード 1） / 1〜3 でモード / スペースでやり直し / R で別の画像
// ============================================

let cols = 96, rows = 64, cell, ox = 20, oy = 110;
let mask, recMask, rec, arrival, markerSrc;
let mode = 1;      // ★ 1 = 種から再構成 2 = 穴埋め 3 = ふちに触れた物体を消す
let iter = 0, done = false, seed = 1;
let se = [];
let modeNames = { 1: '種から再構成', 2: '穴埋め', 3: 'ふちに触れた物体を消す' };

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  cell = min((width - 400) / cols, (height - 140) / rows);
  se = makeSE('box', 1); // ★ 測地的膨張の SE（3×3 = 8 近傍）
  makeMask();
}

// ★ 画像：穴のある塊、ふちに触れる塊、小さな塊
function makeMask() {
  randomSeed(seed);
  mask = new Uint8Array(cols * rows);
  let blobs = [];
  for (let n = 0; n < 7; n++) blobs.push([random(8, cols - 8), random(8, rows - 8), random(6, 14), random() < 0.6]);
  blobs.push([2, rows - 12, 9, false]);      // 左下のふちに触れる
  blobs.push([cols - 3, 12, 8, true]);       // 右上のふちに触れる
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    for (let [cx, cy, r, hole] of blobs) {
      let d = dist(x, y, cx, cy);
      if (d <= r && !(hole && d < r * 0.45)) mask[x + y * cols] = 1;
    }
  }
  startMode();
}

// ★ モードごとに「マスク」と「種」を決める
function startMode() {
  rec = new Uint8Array(cols * rows);
  if (mode === 1) {
    recMask = mask;                                    // マスクの中で種を育てる
    if (markerSrc) for (let i = 0; i < rec.length; i++) rec[i] = markerSrc[i] && mask[i] ? 1 : 0;
  } else if (mode === 2) {
    recMask = mask.map((v) => 1 - v);                  // 背景の中で、ふちから育てる
    for (let i = 0; i < rec.length; i++) if (isBorder(i) && recMask[i]) rec[i] = 1;
  } else {
    recMask = mask;                                    // 前景の中で、ふちから育てる
    for (let i = 0; i < rec.length; i++) if (isBorder(i) && mask[i]) rec[i] = 1;
  }
  arrival = new Int16Array(cols * rows).fill(-1);
  for (let i = 0; i < rec.length; i++) if (rec[i]) arrival[i] = 0;
  iter = 0; done = false;
}
function isBorder(i) { let x = i % cols, y = floor(i / cols); return x === 0 || y === 0 || x === cols - 1 || y === rows - 1; }

// ★ 測地的膨張を 1 回：膨張してからマスクと AND。変わらなくなったら終わり
function stepGeo() {
  if (done) return;
  let d = dilateImg(rec, se);
  let changed = false;
  for (let i = 0; i < rec.length; i++) {
    let v = d[i] && recMask[i] ? 1 : 0;
    if (v && !rec[i]) { changed = true; arrival[i] = iter + 1; }
    rec[i] = v;
  }
  iter++;
  if (!changed) done = true;
}

function draw() {
  background(170, 45, 9);
  if (!done && frameCount % 3 === 0) stepGeo();
  noStroke();
  fill(170, 30, 16);
  rect(ox, oy, cols * cell, rows * cell);
  let nRec = 0, nOut = 0;
  for (let i = 0; i < mask.length; i++) {
    let x = ox + (i % cols) * cell, y = oy + floor(i / cols) * cell;
    let out = mode === 1 ? rec[i] : mode === 2 ? mask[i] || !rec[i] : mask[i] && !rec[i]; // 最終結果
    if (out) nOut++;
    if (rec[i]) {
      nRec++;
      fill(arrival[i] === 0 ? 45 : (200 + arrival[i] * 4) % 360, 80, arrival[i] === 0 ? 100 : 85); // 種 = 黄、到達順で色
    } else if (mask[i]) fill(150, 40, mode === 1 ? 45 : 90);
    else continue;
    rect(x, y, cell - 1, cell - 1);
  }
  let px = ox + cols * cell + 40, ty = oy + 10;
  fill(45, 90, 100); textSize(34);
  text('膨張 ' + iter + ' 回' + (done ? ' 完了' : ''), px, ty + 20);
  textSize(16); fill(0, 0, 100);
  text('モード ' + mode + '：' + modeNames[mode], px, ty + 54);
  text('育った部分（色つき）' + nRec + ' マス', px, ty + 80);
  text('結果の前景：' + nOut + ' マス', px, ty + 104);
  fill(0, 0, 60);
  if (mode === 1) {
    text('マスク = 元の画像（暗い緑）', px, ty + 144);
    text('種 = クリックした所（黄）', px, ty + 168);
    text('R = 種 ⊕ B ∩ マスク をくり返す', px, ty + 192);
    text('→ 種のある塊だけが丸ごと取り出せる', px, ty + 216);
    text('（ラベリング・物体の選択）', px, ty + 240);
  } else if (mode === 2) {
    text('マスク = 背景（元の画像の補集合）', px, ty + 144);
    text('種 = 画面のふち', px, ty + 168);
    text('ふちから流れ込める背景だけが育つ', px, ty + 192);
    text('→ 流れ込めなかった背景 = 穴', px, ty + 216);
    text('結果 = 元の画像 ∪ 穴（穴が埋まる）', px, ty + 240);
  } else {
    text('マスク = 元の画像', px, ty + 144);
    text('種 = ふちに触れている前景', px, ty + 168);
    text('ふちから育った塊 = ふちに触れた物体', px, ty + 192);
    text('結果 = 元の画像 − 育った塊', px, ty + 216);
    text('（顕微鏡画像で切れた細胞を除外する）', px, ty + 240);
  }
  text('色 = 届いた順番（到達時刻）', px, ty + 280);

  fill(0, 0, 100);
  textSize(18);
  text('クリック：種を置く（モード 1）　1〜3：モード　スペース：やり直し　R：別の画像', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('普通の膨張は「どこまでも」広がる。マスクの中だけに制限した膨張（測地的膨張）をくり返すと、種とつながった部分だけが残る', 20, 68);
}

function mousePressed() {
  if (mode !== 1) return;
  let gx = floor((mouseX - ox) / cell), gy = floor((mouseY - oy) / cell);
  if (gx < 0 || gy < 0 || gx >= cols || gy >= rows) return;
  if (!markerSrc) markerSrc = new Uint8Array(cols * rows);
  markerSrc[gx + gy * cols] = 1;
  if (mask[gx + gy * cols]) { rec[gx + gy * cols] = 1; arrival[gx + gy * cols] = 0; done = false; }
}
function keyPressed() {
  if (key >= '1' && key <= '3') { mode = int(key); startMode(); }
  if (key === ' ') { if (mode === 1) markerSrc = null; startMode(); }
  if (key === 'r' || key === 'R') { seed++; markerSrc = null; makeMask(); }
}

// ---------- やってみよう ----------
// 1. モード 1 で、穴のある塊の「穴の中」をクリックしてみる。何も育たないのはなぜ？
// 2. モード 2 で、ふちに触れた塊の穴は埋まる？（ふちから流れ込める穴は「穴」ではない）
// 3. SE を十字（4 近傍）にすると、斜めにしかつながっていない所で止まる。8 近傍と 4 近傍の「つながり」のちがい

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
