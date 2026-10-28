// ============================================
// 11 トルシェ・タイルとランダム・タイル
// 1 種類のタイルを「向き」だけ変えて並べる。向きをランダムにすると、迷路や流れる曲線が現れる
//   トルシェ（1704 年、三角形）、スミス（1987 年、4 分の 1 円）、斜め線 1 本（10 PRINT の迷路）
// 1〜4 = タイルの種類 / クリック = その 1 枚を回す / スペース = ランダム / R = 規則で並べる / A = 自動で回る / C = 塗り分け / ↑↓ = 大きさ / S = 保存
// ============================================

let kind = 1;           // ★ 1 = 4 分の 1 円、2 = 斜め線（迷路）、3 = 三角形、4 = 波線
let cell = 60;          // ★ タイルの大きさ
let auto = false;
let colored = true;
let rule = 0;           // 0 = ランダム、1〜4 = 規則
let cols, rows;
let ori = [];           // 向き（0〜3）
let turn = [];          // 回転アニメーションの残り（ラジアン）

let colA = [245, 235, 215], colB = [40, 60, 100], lineCol = [230, 90, 70];   // ★ 色

function setup() {
  createCanvas(windowWidth, windowHeight);
  layout();
}

function layout() {
  cols = Math.ceil(width / cell);
  rows = Math.ceil((height - 90) / cell);
  ori = [];
  turn = [];
  for (let i = 0; i < cols * rows; i++) { ori.push(floor(random(4))); turn.push(0); }
}

function draw() {
  background(colB[0], colB[1], colB[2]);
  if (auto && frameCount % 3 === 0) spinTile(floor(random(cols * rows)));
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      let k = j * cols + i;
      turn[k] *= 0.82;                       // 回転アニメーションをだんだん止める
      if (Math.abs(turn[k]) < 0.01) turn[k] = 0;
      push();
      translate(i * cell + cell / 2, 90 + j * cell + cell / 2);
      rotate(-turn[k]);
      drawTile(ori[k], i, j);
      pop();
    }
  }
  noStroke();
  fill(0, 0, 0, 190);
  rect(0, 0, width, 90);
  fill(255);
  textSize(20);
  let nm = ['', '4 分の 1 円（スミス）', '斜め線 1 本（迷路）', '三角形（トルシェ）', '波線'][kind];
  text(nm + '（1〜4）　並べ方：' + ['ランダム', '市松', '列ごと', '同心', 'ノイズ'][rule] + '（スペース / R）', 20, 36);
  textSize(15);
  fill(200);
  text('クリックで 1 枚回す。A 自動 ' + (auto ? 'ON' : 'OFF') + '　C 塗り分け ' + (colored ? 'ON' : 'OFF') + '　線が必ず辺の真ん中でつながるので、どう並べても途切れない', 20, 66);
}

// ★ タイル 1 枚（中心が原点）
function drawTile(o, i, j) {
  let h = cell / 2;
  rotate((o * PI) / 2);
  if (kind === 1) {
    // 2 つの角を中心に 4 分の 1 円。向き 0 と 2、1 と 3 は同じ形
    let flip = o % 2;
    // 塗り分け：角 (格子点) の偶奇で色を決めると、つながった領域が交互の色になる
    let even = (i + j + flip) % 2 === 0;
    let cap = colored ? (even ? colA : colB) : colB, band = colored ? (even ? colB : colA) : colB;
    noStroke();
    fill(band[0], band[1], band[2]);
    rect(-h, -h, cell, cell);
    fill(cap[0], cap[1], cap[2]);
    arc(-h, -h, cell, cell, 0, HALF_PI, PIE);
    arc(h, h, cell, cell, PI, PI + HALF_PI, PIE);
    noFill();
    stroke(lineCol[0], lineCol[1], lineCol[2]);
    strokeWeight(cell * 0.08);
    arc(-h, -h, cell, cell, 0, HALF_PI);
    arc(h, h, cell, cell, PI, PI + HALF_PI);
  } else if (kind === 2) {
    noStroke();
    fill(colB[0], colB[1], colB[2]);
    rect(-h, -h, cell, cell);
    stroke(colA[0], colA[1], colA[2]);
    strokeWeight(cell * 0.12);
    strokeCap(SQUARE);
    line(-h, -h, h, h);
  } else if (kind === 3) {
    noStroke();
    fill(colA[0], colA[1], colA[2]);
    rect(-h, -h, cell, cell);
    fill(colored ? lineCol : colB);
    triangle(-h, -h, h, -h, -h, h);
  } else {
    noStroke();
    fill(colB[0], colB[1], colB[2]);
    rect(-h, -h, cell, cell);
    noFill();
    stroke(colA[0], colA[1], colA[2]);
    strokeWeight(cell * 0.1);
    // 上の辺の真ん中 → 右の辺の真ん中、下の辺の真ん中 → 左の辺の真ん中を S 字で
    bezier(0, -h, 0, -h * 0.2, h * 0.2, 0, h, 0);
    bezier(0, h, 0, h * 0.2, -h * 0.2, 0, -h, 0);
  }
}

// ★ 並べ方の規則
function arrange() {
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    let k = j * cols + i, o;
    if (rule === 0) o = floor(random(4));
    else if (rule === 1) o = (i + j) % 2;
    else if (rule === 2) o = i % 4;
    else if (rule === 3) o = Math.floor(Math.max(Math.abs(i - cols / 2), Math.abs(j - rows / 2))) % 2 + 2 * ((i < cols / 2) !== (j < rows / 2) ? 1 : 0);
    else o = floor(noise(i * 0.15, j * 0.15) * 8) % 4;
    if (o !== ori[k]) { turn[k] += HALF_PI * ((o - ori[k] + 4) % 4); ori[k] = o; }
  }
}

function spinTile(k) {
  ori[k] = (ori[k] + 1) % 4;
  turn[k] += HALF_PI;
}

function mousePressed() {
  let i = floor(mouseX / cell), j = floor((mouseY - 90) / cell);
  if (i >= 0 && j >= 0 && i < cols && j < rows) spinTile(j * cols + i);
}

function keyPressed() {
  if (key >= '1' && key <= '4') kind = int(key);
  if (key === ' ') { rule = 0; arrange(); }
  if (key === 'r' || key === 'R') { rule = (rule % 4) + 1; arrange(); }
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'c' || key === 'C') colored = !colored;
  if (key === UP_ARROW) { cell = Math.min(160, cell + 10); layout(); }
  if (key === DOWN_ARROW) { cell = Math.max(16, cell - 10); layout(); }
  if (key === 's' || key === 'S') saveCanvas('truchet', 'png');
}

// ---------- やってみよう ----------
// 1. 2（斜め線）を小さく（↓）すると迷路になる。入口から出口まで行ける？
// 2. 1 で C を ON。どう回しても 2 色で塗り分けられるのはなぜ？（格子点の偶奇がヒント）
// 3. R の規則を自分で作ろう（arrange の rule === 2 の行を、i * j % 4 などに）
// 4. A で自動回転にして、ゆっくり変わる「動く壁紙」を作ろう
