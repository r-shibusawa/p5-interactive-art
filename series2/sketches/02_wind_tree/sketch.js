// ============================================
// 02 風にゆれる木
// ランダムな枝 ＋ ノイズでゆっくりゆれる ＋ 花が咲く
// クリックで新しい木が生える / S で保存
// ============================================

let seed = 1; // 木の形を決める「種」（同じ種なら同じ木）
let leafHue = 340; // 花の色

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  // 空のグラデーション
  for (let y = 0; y < height; y += 4) {
    stroke(map(y, 0, height, 220, 30), 40, map(y, 0, height, 30, 85));
    line(0, y, width, y);
  }

  // ★ 毎フレーム同じ種からランダムを始めると、木の形が毎回同じになる
  randomSeed(seed);

  translate(width / 2, height);
  branch(height * 0.25, 0);
}

function branch(len, depth) {
  // 風：ノイズで角度が少しずつ変わる（depth が深いほど大きくゆれる）
  let wind = (noise(frameCount * 0.005, depth) - 0.5) * depth * 0.08;
  rotate(wind);

  strokeWeight(map(depth, 0, 9, 16, 1, true));
  stroke(25, 60, map(depth, 0, 9, 35, 60));
  line(0, 0, 0, -len);
  translate(0, -len);

  if (len < 8) {
    // 枝の先に花を咲かせる
    noStroke();
    fill(leafHue + random(-20, 20), 60, 100, 80);
    circle(0, 0, random(6, 16));
    return;
  }

  // 枝の数と角度をランダムに決める（randomSeed のおかげで毎フレーム同じ）
  let n = random() < 0.3 ? 3 : 2;
  for (let i = 0; i < n; i++) {
    push();
    rotate(random(-0.7, 0.7));
    branch(len * random(0.6, 0.8), depth + 1);
    pop();
  }
}

function mousePressed() {
  seed = floor(random(100000)); // 新しい種 → 新しい木
  leafHue = random(360); // 花の色もランダム
}

function keyPressed() {
  if (key === 's' || key === 'S') saveCanvas('tree', 'png');
}

// ---------- やってみよう ----------
// 1. 風の強さ 0.08 を 0.3 にすると？（台風！）
// 2. 花を circle から、ellipse や文字 text('❀', 0, 0) に変えよう
// 3. 枝の数 3 になる確率 0.3 を変えて、木の茂り方を変えよう
