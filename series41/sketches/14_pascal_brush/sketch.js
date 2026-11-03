// ============================================
// 14 パスカル・ブラシ
// クリックした所から、二項係数 mod m の模様（03）が三角形に広がっていくスタンプ
// 余りで色を塗る。m とマスの大きさで模様が変わる。ドラッグで連続スタンプ
// クリック／ドラッグ = スタンプ / ↑↓ = m（2〜9）/ ←→ = マスの大きさ / F = 向きを回す / C = 消す / S = 保存
// ============================================

let m = 3;                  // ★ 割る数
let cellS = 6;              // ★ マスの大きさ（px）
let rowsMax = 40;           // ★ 何行まで広がるか
let growth = 1.2;           // ★ 1 フレームに進む行数
let stamps = [];            // 広がっている最中のスタンプ
let layer;                  // 描きためる層
let angleIdx = 0;           // 向き（0: 下向き, 1: 左, 2: 上, 3: 右）
let lastX = -999, lastY = -999;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  layer = createGraphics(width, height);
  layer.colorMode(HSB, 360, 100, 100, 100);
  layer.background(230, 30, 8);
  layer.noStroke();
}

function addStamp(x, y) {
  stamps.push({ x, y, m, s: cellS, row: [1], drawn: 0, progress: 0, hue: (frameCount * 3) % 360, ang: (angleIdx * HALF_PI) });
}

// ★ 次の行：両端は 1、あとは (左上 + 右上) mod m
function nextRow(row, md) {
  let out = [1 % md];
  for (let i = 1; i < row.length; i++) out.push((row[i - 1] + row[i]) % md);
  out.push(1 % md);
  return out;
}

function draw() {
  // スタンプを進める（新しい行だけ層に描く → 速い）
  for (let st of stamps) {
    st.progress += growth;
    while (st.drawn < Math.min(rowsMax, Math.floor(st.progress))) {
      drawRow(st);
      st.row = nextRow(st.row, st.m);
      st.drawn++;
    }
  }
  stamps = stamps.filter((st) => st.drawn < rowsMax);

  image(layer, 0, 0);
  noStroke(); fill(0, 0, 100); textSize(18);
  text('mod ' + m + '（↑↓）　マス ' + cellS + 'px（←→）　F：向き　C：消す　S：保存　広がり中：' + stamps.length, 20, 40);
  fill(0, 0, 60); textSize(15);
  text('クリック／ドラッグでスタンプ。余り 0 は塗らない。m = 2 でシェルピンスキー、素数 m でそれぞれのフラクタル', 20, 68);
  // カーソルに小さなプレビュー
  noFill(); stroke(0, 0, 100, 40); strokeWeight(1);
  let L = rowsMax * cellS;
  push();
  translate(mouseX, mouseY);
  rotate(angleIdx * HALF_PI);
  triangle(0, 0, -L / 2, L, L / 2, L);
  pop();
}

// 行 st.drawn を層に描く（向きに応じて回す）
function drawRow(st) {
  let r = st.drawn, s = st.s;
  layer.push();
  layer.translate(st.x, st.y);
  layer.rotate(st.ang);
  for (let k = 0; k < st.row.length; k++) {
    let v = st.row[k];
    if (v === 0) continue;
    layer.fill((st.hue + (v * 360) / st.m * 0.5) % 360, 70, 95 - r * 0.8);
    layer.rect((k - r / 2) * s - s / 2, r * s, s - 1, s - 1);
  }
  layer.pop();
}

function mousePressed() { addStamp(mouseX, mouseY); lastX = mouseX; lastY = mouseY; }
function mouseDragged() {
  // ★ 一定の距離を動いたら次のスタンプ
  if (Math.hypot(mouseX - lastX, mouseY - lastY) > cellS * 5) { addStamp(mouseX, mouseY); lastX = mouseX; lastY = mouseY; }
}

function keyPressed() {
  if (key === UP_ARROW && m < 9) m++;
  if (key === DOWN_ARROW && m > 2) m--;
  if (key === RIGHT_ARROW && cellS < 14) cellS++;
  if (key === LEFT_ARROW && cellS > 2) cellS--;
  if (key === 'f' || key === 'F') angleIdx = (angleIdx + 1) % 4;
  if (key === 'c' || key === 'C') { layer.background(230, 30, 8); stamps = []; }
  if (key === 's' || key === 'S') saveCanvas('pascal_brush', 'png');
}

// ---------- やってみよう ----------
// 1. m = 2 と m = 3 と m = 5 で同じ場所にスタンプして、模様の「自己相似」のちがいを見よう
// 2. rowsMax を 128 にしてマスを 2px にすると、大きなシェルピンスキーが描ける（m = 2 で 2^7 行）
// 3. 色を「余り」ではなく「行番号」で決めると虹色の三角形に。drawRow の fill を変えよう
// 4. 向き（F）を変えながら中心から 4 方向に押すと、雪の結晶のような形に。自由制作のベースにどうぞ
