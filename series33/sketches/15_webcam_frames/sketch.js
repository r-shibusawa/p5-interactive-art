// ============================================
// 15 カメラで黄金比を探す
// カメラの映像に、黄金比・白銀比の長方形と螺旋のフレームを重ねる。顔や物にぴったり合わせて構図を探そう
// カメラが使えないときは、作った風景（夕日と山）が代わりに出る
// ドラッグ = フレームを動かす / 右下の角をドラッグ = 大きさ / 1〜4 = 比 / T = 縦横 / F = 螺旋の向き / G = 分割線 / スペース = 保存
// ============================================

let cap;
let fr = { x: 0, y: 0, w: 0 };   // フレーム（左上と長い辺の長さ）
let ratioIdx = 0;
let portrait = false;
let flipSp = 0;                  // 螺旋の向き（0〜3）
let showLines = true;
let dragMode = '';               // 'move' / 'size' / ''
let grab = { x: 0, y: 0 };
let flashT = 0;
const RATIO_LIST = [
  { name: '黄金比 φ', v: (1 + Math.sqrt(5)) / 2, n: 1, hue: 45 },
  { name: '白銀比（大和比）√2', v: Math.SQRT2, n: 0, hue: 200 },
  { name: '白銀比 1+√2', v: 1 + Math.SQRT2, n: 2, hue: 210 },
  { name: '青銅比', v: (3 + Math.sqrt(13)) / 2, n: 3, hue: 25 },
];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  cap = createCapture(VIDEO, { flipped: true });
  cap.size(640, 480);
  cap.hide();
  fr.w = width * 0.5;
  fr.x = width * 0.25;
  fr.y = height * 0.25;
}

function frameSize() {
  let r = RATIO_LIST[ratioIdx].v;
  return portrait ? { w: fr.w / r, h: fr.w } : { w: fr.w, h: fr.w / r }; // fr.w = 長い辺
}

function draw() {
  background(0);
  // 映像（画面いっぱいに、縦横比を保って）
  if (cap && cap.width > 0) {
    let s = max(width / cap.width, height / cap.height);
    image(cap, (width - cap.width * s) / 2, (height - cap.height * s) / 2, cap.width * s, cap.height * s);
  } else {
    fakeScene();
  }

  // ドラッグ中
  if (dragMode === 'move') { fr.x = mouseX - grab.x; fr.y = mouseY - grab.y; }
  if (dragMode === 'size') {
    fr.w = portrait ? max(mouseY - fr.y, 60) : max(mouseX - fr.x, 60);
  }
  let fs = frameSize();
  drawFrame(fr.x, fr.y, fs.w, fs.h);

  // 撮影したときの白いフラッシュ
  if (flashT > 0) { noStroke(); fill(0, 0, 100, flashT); rect(0, 0, width, height); flashT -= 8; }

  // 文字
  noStroke();
  fill(0, 0, 0, 55);
  rect(0, 0, width, 80);
  fill(0, 0, 100);
  textSize(18);
  text(RATIO_LIST[ratioIdx].name + ' = ' + nf(RATIO_LIST[ratioIdx].v, 1, 3) + '（1〜4）　T：' + (portrait ? '縦長' : '横長') + '　F：螺旋の向き　G：分割線 ' + (showLines ? 'ON' : 'off') + '　スペース：保存', 20, 34);
  fill(0, 0, 75);
  textSize(14);
  text((cap && cap.width > 0 ? 'カメラ映像' : 'カメラが使えないので作った風景を表示中') + '。枠をドラッグで移動、右下の白い角で大きさ。顔の目の高さを分割線に合わせてみよう', 20, 60);
}

// 長方形・正方形の分割・螺旋・黄金分割線
function drawFrame(x, y, w, h) {
  let rr = RATIO_LIST[ratioIdx];
  let fw = w, fh = h; // 画面上の大きさ（下で w, h を入れかえるので覚えておく）
  push();
  // 中心に移動して、縦長なら 90° 回す（中身はいつも横長として描く）。F で 4 通りに反転
  translate(x + w / 2, y + h / 2);
  if (portrait) { rotate(HALF_PI); let t = w; w = h; h = t; }
  if (flipSp === 1 || flipSp === 3) scale(-1, 1);
  if (flipSp >= 2) scale(1, -1);
  translate(-w / 2, -h / 2);
  noFill();
  stroke(rr.hue, 70, 100, 90);
  strokeWeight(3);
  rect(0, 0, w, h);
  // 正方形を取っていく：左 → 上 → 右 → 下 の順に、入るだけ（貴金属比なら毎回 n 枚、√2 は 1 枚のあと 2 枚ずつ）
  let ox = 0, oy = 0, ww = w, hh = h;
  let arcs = [];
  strokeWeight(1.5);
  stroke(rr.hue, 50, 100, 70);
  for (let d = 0; d < 12 && min(ww, hh) > 2; d++) {
    let dir = d % 4, sq = min(ww, hh);
    let k = max(1, floor(max(ww, hh) / sq + 1e-6));
    let bx, by, bw, bh;
    if (dir === 0) { bx = ox; by = oy; bw = k * sq; bh = sq; ox += k * sq; ww -= k * sq; }
    else if (dir === 1) { bx = ox; by = oy; bw = sq; bh = k * sq; oy += k * sq; hh -= k * sq; }
    else if (dir === 2) { bx = ox + ww - k * sq; by = oy; bw = k * sq; bh = sq; ww -= k * sq; }
    else { bx = ox; by = oy + hh - k * sq; bw = sq; bh = k * sq; hh -= k * sq; }
    for (let j = 0; j < k; j++) {
      if (dir % 2 === 0) rect(bx + j * sq, by, sq, sq); else rect(bx, by + j * sq, sq, sq);
    }
    // このブロックを横切る 1/4 楕円（04 と同じ作り方）：角 O から u 方向に k 枚、v 方向に 1 枚
    let O = [{ x: bx, y: by }, { x: bx + bw, y: by }, { x: bx + bw, y: by + bh }, { x: bx, y: by + bh }][dir];
    let u = [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }][dir];
    let v = { x: -u.y, y: u.x };
    arcs.push({ O, u, v, a: k * sq, b: sq });
  }
  // 螺旋
  stroke(50, 90, 100);
  strokeWeight(3);
  beginShape();
  for (let c of arcs) {
    let Q = { x: c.O.x + c.a * c.u.x + c.b * c.v.x, y: c.O.y + c.a * c.u.y + c.b * c.v.y };
    for (let th = 0; th <= HALF_PI + 0.001; th += HALF_PI / 12) {
      vertex(Q.x - c.a * Math.cos(th) * c.u.x - c.b * Math.sin(th) * c.v.x, Q.y - c.a * Math.cos(th) * c.u.y - c.b * Math.sin(th) * c.v.y);
    }
  }
  endShape();
  // 黄金分割線（1/φ² と 1/φ）または三分割
  if (showLines) {
    stroke(0, 0, 100, 60);
    strokeWeight(1);
    drawingContext.setLineDash([6, 6]);
    let t1 = rr.n === 1 ? 1 - 1 / rr.v : 1 / 3, t2 = rr.n === 1 ? 1 / rr.v : 2 / 3;
    line(w * t1, 0, w * t1, h); line(w * t2, 0, w * t2, h);
    line(0, h * t1, w, h * t1); line(0, h * t2, w, h * t2);
    drawingContext.setLineDash([]);
  }
  pop();
  // 大きさを変える角
  noStroke();
  fill(0, 0, 100);
  rect(x + fw - 10, y + fh - 10, 20, 20, 4);
}

// カメラがないときの風景（夕日と山）
function fakeScene() {
  for (let y = 0; y < height; y += 8) {
    fill(20 + y / height * 20, 60, 100 - y / height * 50);
    noStroke();
    rect(0, y, width, 8);
  }
  fill(40, 80, 100);
  circle(width * 0.618, height * 0.42, min(width, height) * 0.18);
  fill(250, 40, 25);
  beginShape();
  vertex(0, height);
  for (let x = 0; x <= width; x += 20) vertex(x, height * 0.62 - noise(x * 0.004) * height * 0.25);
  vertex(width, height);
  endShape(CLOSE);
}

function mousePressed() {
  let fs = frameSize();
  if (abs(mouseX - (fr.x + fs.w)) < 20 && abs(mouseY - (fr.y + fs.h)) < 20) dragMode = 'size';
  else if (mouseX > fr.x && mouseX < fr.x + fs.w && mouseY > fr.y && mouseY < fr.y + fs.h) { dragMode = 'move'; grab = { x: mouseX - fr.x, y: mouseY - fr.y }; }
}
function mouseReleased() { dragMode = ''; }

function keyPressed() {
  if (key >= '1' && key <= '4') ratioIdx = int(key) - 1;
  if (key === 't' || key === 'T') {
    portrait = !portrait;
    if (portrait) { fr.y = min(fr.y, 100); fr.w = min(fr.w, height - fr.y - 20); } // 画面からはみ出さないように
  }
  if (key === 'f' || key === 'F') flipSp = (flipSp + 1) % 4;
  if (key === 'g' || key === 'G') showLines = !showLines;
  if (key === ' ') { saveCanvas('golden_frame', 'png'); flashT = 80; }
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. 顔を枠に入れて、目・鼻・口がどの分割線の近くにあるか確かめよう
// 2. 部屋の窓・本・ポスターを映して、どの比の枠にいちばん合うか探そう
// 3. 分割線を「三分割（1/3）」と「黄金分割（0.382）」で切りかえて、写真の印象を比べよう
// 4. 枠の中だけを切り取って保存するように改造してみよう（get(x, y, w, h) を使う）

// ---------- 道具 ----------
// 螺旋は「正方形のブロックごとに 1/4 楕円」をつないだ近似（黄金比なら 1/4 円 = よく見る黄金螺旋）
