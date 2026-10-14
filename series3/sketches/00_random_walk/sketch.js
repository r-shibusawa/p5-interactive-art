// ============================================
// 00 ランダムウォーク（いちばん簡単な「生き物」）
// 毎フレーム、ランダムな方向に1歩進むだけ。でも足あとは生き物らしく見える
// クリックで歩く人を追加 / C で消す / マウス左右 = 歩はば
// ============================================

let walkers = []; // 歩く人たち

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  background(0, 0, 8);
  // 最初の1人は画面の真ん中から
  walkers.push({ x: width / 2, y: height / 2, hue: random(360) });
}

function draw() {
  let step = map(mouseX, 0, width, 1, 8, true); // 歩はば

  for (let w of walkers) {
    // ★ ここが「ルール」：ランダムな方向に step だけ進む
    let angle = random(TWO_PI);
    let nx = w.x + cos(angle) * step;
    let ny = w.y + sin(angle) * step;

    stroke(w.hue, 60, 100, 60);
    strokeWeight(2);
    line(w.x, w.y, nx, ny);

    w.x = constrain(nx, 0, width); // 画面の外に出ないように
    w.y = constrain(ny, 0, height);
  }

  // 説明（背景を塗らないので、帯を描いて文字を見やすく）
  noStroke();
  fill(0, 0, 8);
  rect(0, 0, width, 44);
  fill(0, 0, 100);
  textSize(16);
  text('歩く人 ' + walkers.length + '　クリックで追加　C で消す　マウス左右で歩はば ' + nf(step, 1, 1), 16, 28);
}

function mousePressed() {
  if (mouseY < 44) return;
  walkers.push({ x: mouseX, y: mouseY, hue: random(360) });
}

function keyPressed() {
  if (key === 'c' || key === 'C') {
    background(0, 0, 8);
    walkers = [];
  }
  if (key === 's' || key === 'S') saveCanvas('walk', 'png');
}

// ---------- やってみよう ----------
// 1. random(TWO_PI) を random(-0.5, 0.5) + 前の角度 にすると「くねくね」歩く
//    （w.angle を覚えておく必要がある）
// 2. 上下左右の4方向だけにすると？  let angle = floor(random(4)) * HALF_PI;
// 3. 100人クリックで置いて、しばらく待つとどんな模様になる？
