// ============================================
// 01 クモの巣図（くり返しを目で見る）
// 放物線 y = r x (1−x) と、対角線 y = x の間を、はしご状にたどる
// 1つの点に吸い込まれる／四角くまわる／永遠にさまよう、が一目でわかる
// マウス左右 = r / クリックで最初の値 / スペースで一時停止
// ============================================

let r = 3.2;
let x = 0.2;
let path = []; // たどった点
let paused = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(230, 40, 10);
  let newR = map(mouseX, 0, width, 2.5, 4.0, true);
  if (abs(newR - r) > 0.001) {
    r = newR;
    path = []; // r が変わったらやり直し
  }

  // グラフの領域（正方形）
  let s = min(width, height) - 160;
  let ox = (width - s) / 2, oy = 100;
  let X = (v) => ox + v * s; // 0〜1 → 画面
  let Y = (v) => oy + s - v * s;

  // 枠と対角線
  noFill();
  stroke(0, 0, 35);
  strokeWeight(1);
  rect(ox, oy, s, s);
  line(X(0), Y(0), X(1), Y(1));

  // 放物線
  stroke(170, 80, 100);
  strokeWeight(3);
  beginShape();
  for (let v = 0; v <= 1.001; v += 0.01) vertex(X(v), Y(r * v * (1 - v)));
  endShape();

  // ---- 1ステップ進める ----
  if (!paused && frameCount % 6 === 0 && path.length < 400) {
    let y = r * x * (1 - x); // 上（下）へ：放物線で次の値を読む
    path.push([x, x, x, y]); // 縦の線
    path.push([x, y, y, y]); // 横の線：対角線まで戻す（次の x になる）
    x = y;
  }

  // たどった線（新しいほど明るい）
  for (let i = 0; i < path.length; i++) {
    let [a, b, c, d] = path[i];
    stroke(40, 90, 100, map(i, 0, path.length, 15, 100));
    strokeWeight(1.5);
    line(X(a), Y(b), X(c), Y(d));
  }
  noStroke();
  fill(40, 90, 100);
  circle(X(x), Y(x), 10);

  fill(0, 0, 100);
  textSize(18);
  text('r = ' + nf(r, 1, 3) + '（マウス左右）　x = ' + nf(x, 1, 4) + '　ステップ ' + path.length / 2 + '　クリックで最初の値を変える　スペースで一時停止', 20, 40);
  fill(0, 0, 60);
  textSize(14);
  text('x(今年)', X(1) - 50, Y(0) + 24);
  text('x(来年)', ox - 60, oy - 12);
}

function mousePressed() {
  x = random(0.05, 0.95);
  path = [];
}
function keyPressed() {
  if (key === ' ') paused = !paused;
}

// ---------- やってみよう ----------
// 1. r = 2.8：らせんを描いて1点に吸い込まれる。 r = 3.3：四角をまわる（周期2）
// 2. r = 3.9：どこにも落ち着かず、放物線の下を埋めつくす（カオス）
// 3. 放物線を別の式（例：r * sin(PI * x)）にしても、同じことが起きる？
