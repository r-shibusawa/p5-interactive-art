// ============================================
// 15 カメラでモルフォロジー（おまけ）
// カメラの映像を小さく縮めて 2 値化し、膨張・収縮・オープン・クローズ・勾配をリアルタイムでかける
// オープニングのあとに塊を数えると「ノイズを除いた物体の数」になる（カメラの許可が必要）
// 1〜6 で操作 / 左右で SE の大きさ / マウス左右 = しきい値 / I で白黒反転 / 上下で数える塊の最小サイズ
// ============================================

let cols = 96, rows = 72, cell, oy = 130;
let cap, bin, result, labels;
let op = 4;         // ★ 1 なし 2 膨張 3 収縮 4 オープン 5 クローズ 6 勾配
let seR = 1;        // ★ SE の半径
let minSize = 10;   // ★ 数える塊の最小マス数
let invert = false, se = [], nBlobs = 0;
let opNames = { 1: 'そのまま', 2: '膨張', 3: '収縮', 4: 'オープニング', 5: 'クロージング', 6: '勾配（膨張 − 収縮）' };

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  colorMode(HSB, 360, 100, 100, 100);
  cell = min((width - 70) / 2 / cols, (height - 220) / rows);
  cap = createCapture(VIDEO, { flipped: true });
  cap.size(cols, rows);
  cap.hide();
  bin = new Uint8Array(cols * rows);
  result = bin;
  labels = new Int16Array(cols * rows);
}

function draw() {
  background(170, 45, 9);
  let threshold = map(mouseX, 0, width, 30, 220, true); // ★ しきい値
  se = makeSE('disk', seR);
  if (cap.width > 0) {
    cap.loadPixels();
    if (cap.pixels.length >= cols * rows * 4) {
      for (let i = 0; i < cols * rows; i++) {
        let b = (cap.pixels[i * 4] + cap.pixels[i * 4 + 1] + cap.pixels[i * 4 + 2]) / 3;
        bin[i] = (invert ? b > threshold : b < threshold) ? 1 : 0;
      }
    }
  }
  if (op === 1) result = bin;
  else if (op === 2) result = dilateImg(bin, se);
  else if (op === 3) result = erodeImg(bin, se);
  else if (op === 4) result = dilateImg(erodeImg(bin, se), se);
  else if (op === 5) result = erodeImg(dilateImg(bin, se), se);
  else { let d = dilateImg(bin, se), e = erodeImg(bin, se); result = d.map((v, i) => v && !e[i] ? 1 : 0); }
  nBlobs = labelComponents(result);

  let pw = cols * cell, gap = 30, px2 = 20 + pw + gap;
  noStroke();
  fill(170, 30, 16); rect(20, oy, pw, rows * cell); rect(px2, oy, pw, rows * cell);
  for (let i = 0; i < bin.length; i++) {
    let x = (i % cols) * cell, y = oy + floor(i / cols) * cell;
    if (bin[i]) { fill(0, 0, 85); rect(20 + x, y, cell, cell); }
    if (result[i]) { fill(labels[i] > 0 ? (labels[i] * 47) % 360 : 0, labels[i] > 0 ? 70 : 0, labels[i] > 0 ? 95 : 35); rect(px2 + x, y, cell, cell); }
  }
  fill(0, 0, 100); textSize(17);
  text('2 値化（しきい値 ' + round(threshold) + '、' + (invert ? '明るい' : '暗い') + '部分 = ON）', 20, oy - 30);
  text(opNames[op] + '　SE = 円 ' + (2 * seR + 1) + '×' + (2 * seR + 1), px2, oy - 30);
  fill(0, 0, 60); textSize(13);
  text('カメラ → ' + cols + '×' + rows + ' に縮小 → 明るさの平均 → 0/1', 20, oy - 10);
  text('色 = 塊ごと（' + minSize + ' マス未満の塊は灰色で数えない）', px2, oy - 10);
  let by = oy + rows * cell + 40;
  textSize(40); fill(45, 90, 100);
  text('塊 ' + nBlobs, px2, by);
  textSize(15); fill(0, 0, 60);
  text('手・顔・机の上の物を映して、操作ごとに塊の数がどう変わるか見る。オープニングでノイズの点が消え、クロージングで物体の中の穴が埋まる', 20, by + 36);

  fill(0, 0, 100);
  textSize(18);
  text('1〜6：操作（1 なし 2 膨張 3 収縮 4 オープン 5 クローズ 6 勾配）　左右：SE　マウス左右：しきい値　I：反転　上下：最小サイズ', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text(cap.width > 0 ? '背景は無地に。しきい値を調整して、物体だけが白くなるようにしてから操作を切り替えよう' : 'カメラの許可を待っています…（アドレスバーの鍵マークで許可）', 20, 68);
}

// ★ 連結成分のラベリング（8 近傍）。minSize 未満の塊は数えない
function labelComponents(a) {
  labels.fill(0);
  let n = 0;
  for (let s = 0; s < a.length; s++) {
    if (!a[s] || labels[s]) continue;
    let stack = [s], comp = [s];
    labels[s] = -1;
    while (stack.length) {
      let i = stack.pop(), x = i % cols, y = floor(i / cols);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        let nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        let j = nx + ny * cols;
        if (a[j] && !labels[j]) { labels[j] = -1; stack.push(j); comp.push(j); }
      }
    }
    if (comp.length >= minSize) { n++; for (let i of comp) labels[i] = n; }
  }
  return n;
}

function keyPressed() {
  if (key >= '1' && key <= '6') op = int(key);
  if (key === LEFT_ARROW) seR = max(1, seR - 1);
  if (key === RIGHT_ARROW) seR = min(4, seR + 1);
  if (key === 'i' || key === 'I') invert = !invert;
  if (key === UP_ARROW) minSize = min(200, minSize + 5);
  if (key === DOWN_ARROW) minSize = max(1, minSize - 5);
}

// ---------- やってみよう ----------
// 1. 机に消しゴムやペンを並べて、オープニングで「物の数」が正しく出るしきい値と SE を探す
// 2. 勾配（6）で輪郭だけにする。SE を大きくすると輪郭は太くなる
// 3. 塊の数を音の高さにする（13 の道具をコピー）。手を広げると音が変わる楽器に

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
