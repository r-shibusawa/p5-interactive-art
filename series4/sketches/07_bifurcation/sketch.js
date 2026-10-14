// ============================================
// 07 分岐図（カオスへの地図）
// 横軸 r、縦軸「落ち着いた先の値」。00 の実験を全部の r について一度に描く
// 1本 → 2本 → 4本 → … → カオス。ズームすると同じ形がまた現れる（フラクタル！）
// ドラッグで範囲を選んでズーム / R でリセット
// ============================================

let rMin = 2.5, rMax = 4.0, xMin = 0, xMax = 1;
let dragStart = null;
let layer;
let drawnCols = 0; // 何列まで描いたか（少しずつ描く）

function setup() {
  createCanvas(windowWidth, windowHeight);
  layer = createGraphics(width, height);
  layer.colorMode(HSB, 360, 100, 100, 100);
  restart();
}

function restart() {
  layer.background(240, 40, 8);
  drawnCols = 0;
}

function draw() {
  // 1フレームに 12 列ずつ描く
  for (let k = 0; k < 12 && drawnCols < width; k++, drawnCols++) {
    let r = map(drawnCols, 0, width, rMin, rMax);
    let x = 0.5;
    for (let i = 0; i < 300; i++) x = r * x * (1 - x); // 落ち着くまで待つ
    for (let i = 0; i < 200; i++) {
      // 落ち着いた先を点で打つ
      x = r * x * (1 - x);
      let py = map(x, xMin, xMax, height, 50);
      if (py >= 50 && py <= height) {
        layer.stroke(map(r, rMin, rMax, 180, 320), 60, 100, 35);
        layer.point(drawnCols, py);
      }
    }
  }
  image(layer, 0, 0);

  // ドラッグ中の範囲
  if (dragStart) {
    noFill();
    stroke(40, 90, 100);
    strokeWeight(2);
    rect(dragStart.x, dragStart.y, mouseX - dragStart.x, mouseY - dragStart.y);
  }

  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text('r: ' + nf(rMin, 1, 4) + ' 〜 ' + nf(rMax, 1, 4) + '　　x: ' + nf(xMin, 1, 3) + ' 〜 ' + nf(xMax, 1, 3) + '　　ドラッグで範囲を選んでズーム　R でリセット', 20, 32);
  // マウス位置の r
  fill(0, 0, 70);
  textSize(14);
  text('r = ' + nf(map(mouseX, 0, width, rMin, rMax), 1, 4), mouseX + 10, height - 10);
}

function mousePressed() {
  if (mouseY > 50) dragStart = createVector(mouseX, mouseY);
}

function mouseReleased() {
  if (!dragStart) return;
  let x1 = min(dragStart.x, mouseX), x2 = max(dragStart.x, mouseX);
  let y1 = min(dragStart.y, mouseY), y2 = max(dragStart.y, mouseY);
  if (x2 - x1 > 10 && y2 - y1 > 10) {
    let nrMin = map(x1, 0, width, rMin, rMax), nrMax = map(x2, 0, width, rMin, rMax);
    let nxMax = map(y1, height, 50, xMin, xMax), nxMin = map(y2, height, 50, xMin, xMax);
    rMin = nrMin; rMax = nrMax; xMin = nxMin; xMax = nxMax;
    restart();
  }
  dragStart = null;
}

function keyPressed() {
  if (key === 'r' || key === 'R') {
    rMin = 2.5; rMax = 4.0; xMin = 0; xMax = 1;
    restart();
  }
  if (key === 's' || key === 'S') saveCanvas('bifurcation', 'png');
}

// ---------- やってみよう ----------
// 1. 1本が2本に分かれる r（約 3.0）、2本が4本に分かれる r（約 3.449）を読み取ろう
// 2. r ≈ 3.83 の「白い窓」をズーム。中に小さな分岐図がまるごと入っている
// 3. 分岐の間隔がだんだん狭くなる比率は、どんな式でも約 4.669（ファイゲンバウム定数）
