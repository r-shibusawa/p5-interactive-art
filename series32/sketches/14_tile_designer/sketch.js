// ============================================
// 14 タイル・デザイナー 🔊（自由制作のベース）
// 左のマス目に 1 枚のタイルを描くと、右に並べた模様がその場で変わる
//   並べ方：平行移動・回転・鏡映・すべり鏡映・ハーフドロップ。描くときの対称（ミラー）も選べる
//   スペース = タイルを左から右へ「楽譜」として演奏（上ほど高い音）
// ドラッグ = 描く / 下の色をクリック = 色 / E = 消しゴム / M = 描くときの対称 / 1〜5 = 並べ方 / P = 配色 / R = ランダム / C = 消す / S = 保存
// ============================================

let G = 12;             // ★ タイルのマス数（G × G）
let tileSize = 72;      // ★ 右側に並べるタイルの大きさ
let cells = [];         // 色番号（0 = 背景）
let brush = 1, eraser = false;
let sym = 1;            // 描くときの対称 0〜4
let arrangeMode = 2;    // 並べ方 1〜5
let palIdx = 0;
let tileG;
let playing = false, playCol = 0, lastPaint = -1;

// ★ 配色（先頭が背景）
let palettes = [
  [[245, 238, 225], [30, 60, 110], [220, 80, 60], [240, 180, 50], [70, 150, 120]],
  [[20, 22, 30], [250, 210, 90], [90, 200, 230], [240, 100, 150], [240, 240, 240]],
  [[230, 225, 210], [120, 80, 50], [190, 140, 90], [60, 90, 70], [30, 30, 30]],
];
let symNames = ['なし', '左右', '上下左右', '4 回回転', '斜め'];
let arrNames = ['', '平行移動', '回転（4 枚で 1 組）', '鏡映（折り返し）', 'すべり鏡映', 'ハーフドロップ'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  tileG = createGraphics(G, G);
  cells = new Array(G * G).fill(0);
  randomTile();
}

function draw() {
  background(30, 32, 40);
  let pal = palettes[palIdx];
  // タイルの画像を作る（1 マス = 1 画素）
  tileG.noStroke();
  for (let i = 0; i < G * G; i++) {
    let c = pal[cells[i]];
    tileG.fill(c[0], c[1], c[2]);
    tileG.rect(i % G, Math.floor(i / G), 1, 1);
  }
  // 右：並べた模様
  let x0 = 420, ctx = drawingContext;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, 0, width - x0, height);
  ctx.clip();
  noSmooth();
  let nx = Math.ceil((width - x0) / tileSize) + 1, ny = Math.ceil(height / tileSize) + 1;
  for (let j = -1; j < ny; j++) for (let i = 0; i < nx; i++) drawCopy(x0 + i * tileSize, j * tileSize, i, j);
  smooth();
  ctx.restore();

  // 左：エディタ
  let es = 26, ex = 30, ey = 110;
  for (let i = 0; i < G * G; i++) {
    let c = pal[cells[i]];
    fill(c[0], c[1], c[2]);
    stroke(60);
    strokeWeight(1);
    rect(ex + (i % G) * es, ey + Math.floor(i / G) * es, es, es);
  }
  if (playing) { noFill(); stroke(255, 60, 60); strokeWeight(3); rect(ex + playCol * es, ey, es, G * es); }
  // 色の見本
  for (let k = 1; k < pal.length; k++) {
    fill(pal[k][0], pal[k][1], pal[k][2]);
    stroke(k === brush && !eraser ? 255 : 80);
    strokeWeight(k === brush && !eraser ? 4 : 1);
    rect(ex + (k - 1) * 50, ey + G * es + 20, 40, 40, 6);
  }
  noStroke();
  fill(255);
  textSize(20);
  text('タイル・デザイナー', 30, 40);
  textSize(15);
  fill(200);
  text('描く対称：' + symNames[sym] + '（M）　' + (eraser ? '消しゴム（E）' : ''), 30, 68);
  text('並べ方：' + arrNames[arrangeMode] + '（1〜5）', 30, 90);
  text('スペース：演奏 ' + (playing ? '■' : '▶') + '　P 配色　R ランダム　↑↓ 大きさ', 30, ey + G * es + 90);
  text('C 消す　S 保存　クリックで音も出ます 🔊', 30, ey + G * es + 114);

  // ★ 演奏：8 フレームごとに 1 列進み、色のあるマスを鳴らす
  if (playing && frameCount % 8 === 0) {
    for (let r = 0; r < G; r++) if (cells[r * G + playCol] > 0) noteFor(r, cells[r * G + playCol], 0.06);
    playCol = (playCol + 1) % G;
  }
}

// ★ (i, j) 番目のタイルの置き方
function drawCopy(x, y, i, j) {
  push();
  translate(x + tileSize / 2, y + tileSize / 2);
  if (arrangeMode === 2) rotate([[0, 1], [3, 2]][((j % 2) + 2) % 2][i % 2] * HALF_PI);   // 4 枚で 1 周
  if (arrangeMode === 3) scale(i % 2 ? -1 : 1, j % 2 ? -1 : 1);
  if (arrangeMode === 4 && j % 2) { scale(-1, 1); translate(tileSize / 2, 0); }
  if (arrangeMode === 5 && i % 2) translate(0, tileSize / 2);
  image(tileG, -tileSize / 2, -tileSize / 2, tileSize, tileSize);
  pop();
}

function paintAt(mx, my) {
  let es = 26, ex = 30, ey = 110;
  let cx = Math.floor((mx - ex) / es), cy = Math.floor((my - ey) / es);
  if (cx < 0 || cy < 0 || cx >= G || cy >= G) return false;
  let v = eraser ? 0 : brush;
  for (let [a, b] of symCells(cx, cy)) cells[b * G + a] = v;
  if (lastPaint !== cy * G + cx && v > 0) noteFor(cy, v, 0.08);
  lastPaint = cy * G + cx;
  return true;
}

// ★ 描くときの対称：1 マス塗ると、対応するマスも塗る
function symCells(x, y) {
  let m = G - 1, out = [[x, y]];
  if (sym === 1) out.push([m - x, y]);
  if (sym === 2) out.push([m - x, y], [x, m - y], [m - x, m - y]);
  if (sym === 3) out.push([m - y, x], [m - x, m - y], [y, m - x]);
  if (sym === 4) out.push([y, x]);
  return out;
}

function mousePressed() {
  startAudio();
  let es = 26, ex = 30, ey = 110 + G * es + 20;
  for (let k = 1; k < 5; k++) if (mouseX > ex + (k - 1) * 50 && mouseX < ex + (k - 1) * 50 + 40 && mouseY > ey && mouseY < ey + 40) { brush = k; eraser = false; return; }
  paintAt(mouseX, mouseY);
}
function mouseDragged() { paintAt(mouseX, mouseY); }
function mouseReleased() { lastPaint = -1; }

function randomTile() {
  cells.fill(0);
  for (let k = 0; k < 18; k++) {
    let x = floor(random(G)), y = floor(random(G)), v = floor(random(1, 5));
    for (let [a, b] of symCells(x, y)) cells[b * G + a] = v;
  }
}

function keyPressed() {
  startAudio();
  if (key >= '1' && key <= '5') arrangeMode = int(key);
  if (key === 'm' || key === 'M') sym = (sym + 1) % 5;
  if (key === 'e' || key === 'E') eraser = !eraser;
  if (key === 'p' || key === 'P') palIdx = (palIdx + 1) % palettes.length;
  if (key === 'r' || key === 'R') randomTile();
  if (key === 'c' || key === 'C') cells.fill(0);
  if (key === ' ') { playing = !playing; playCol = 0; }
  if (key === UP_ARROW) tileSize = Math.min(200, tileSize + 12);
  if (key === DOWN_ARROW) tileSize = Math.max(24, tileSize - 12);
  if (key === 's' || key === 'S') saveCanvas('my_tile', 'png');
}

// ---------- やってみよう ----------
// 1. 角に 4 分の 1 円を描いて 2（回転）にすると、円がつながる。トルシェ（11）と同じ考え
// 2. 端のマスに描いた模様が、となりのタイルとつながるようにデザインしよう（左端と右端をそろえる）
// 3. 4（すべり鏡映）や 5（ハーフドロップ）は壁紙やテキスタイルでよく使われる並べ方
// 4. 演奏しながら描き足して、模様と音を同時にデザインしよう。G を 16 にすると細かく描ける


// ==================================================
// ここから下は「音を鳴らすための道具」
// ==================================================
let audioCtx, masterOut;
function startAudio() {
  if (!audioCtx) { audioCtx = new AudioContext(); masterOut = audioCtx.createDynamicsCompressor(); masterOut.connect(audioCtx.destination); }
  audioCtx.resume();
}
// 行（上ほど高い）と色（音色）から音を作る
function noteFor(row, colorIdx, vol) {
  if (!audioCtx) return;
  let penta = [0, 2, 4, 7, 9];
  let deg = G - 1 - row, semis = 12 * Math.floor(deg / 5) + penta[deg % 5];
  let f = 196 * Math.pow(2, semis / 12);
  let t = audioCtx.currentTime, o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = ['sine', 'triangle', 'square', 'sawtooth', 'sine'][colorIdx % 5];
  o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  o.connect(g);
  g.connect(masterOut);
  o.start(t);
  o.stop(t + 0.35);
}
