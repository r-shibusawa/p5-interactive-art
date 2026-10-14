// ============================================
// 14 レスラー・アトラクター（おまけ）
// ローレンツより単純な式で、らせんを描きながら「折り返す」カオス
// 自動で回転 / マウス上下 = パラメータ c（周期 → カオスへ）/ 1〜3 で別の方程式
// ============================================

let x = 1, y = 1, z = 1;
let trail = [];
let angle = 0;
let c = 5.7;
let type = 1;
let names = ['', 'レスラー', 'トーマス', 'アイザワ'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(250, 40, 8);
  angle += 0.004;
  c = map(mouseY, 0, height, 8, 2, true);

  // 1フレームに何ステップか進める
  for (let k = 0; k < 10; k++) {
    let dx, dy, dz, dt;
    if (type === 1) {
      // ★ レスラー方程式
      let a = 0.2, b = 0.2;
      dx = -y - z;
      dy = x + a * y;
      dz = b + z * (x - c);
      dt = 0.01;
    } else if (type === 2) {
      // トーマスの循環対称アトラクター（sin だけ！）
      let bb = 0.19;
      dx = sin(y) - bb * x;
      dy = sin(z) - bb * y;
      dz = sin(x) - bb * z;
      dt = 0.05;
    } else {
      // アイザワ・アトラクター
      let a = 0.95, b = 0.7, cc = 0.6, d = 3.5, e = 0.25, f = 0.1;
      dx = (z - b) * x - d * y;
      dy = d * x + (z - b) * y;
      dz = cc + a * z - (z * z * z) / 3 - (x * x + y * y) * (1 + e * z) + f * z * x * x * x;
      dt = 0.01;
    }
    x += dx * dt;
    y += dy * dt;
    z += dz * dt;
    trail.push([x, y, z]);
  }
  if (trail.length > 4000) trail.splice(0, 10);

  // 描く（回転させて投影）
  let scale = type === 1 ? 22 : type === 2 ? 90 : 180;
  let zoff = type === 1 ? -10 : type === 3 ? -0.5 : 0;
  noFill();
  strokeWeight(1.5);
  beginShape();
  for (let i = 0; i < trail.length; i++) {
    let [px, py, pz] = trail[i];
    let rx = px * cos(angle) - py * sin(angle);
    let ry = px * sin(angle) + py * cos(angle);
    // 少し上から見る
    let sy = ry * 0.4 - (pz + zoff) * 0.9;
    stroke((pz * 10 + 200) % 360, 70, 100, map(i, 0, trail.length, 5, 100));
    vertex(width / 2 + rx * scale, height / 2 + sy * scale);
  }
  endShape();

  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text(names[type] + '・アトラクター　' + (type === 1 ? 'c = ' + nf(c, 1, 2) + '（マウス上下。小さいと周期、大きいとカオス）' : '') + '　1〜3 で方程式を変える', 20, 40);
}

function keyPressed() {
  if (key >= '1' && key <= '3') {
    type = int(key);
    trail = [];
    x = 1; y = 1; z = 1;
    if (type === 3) { x = 0.1; y = 0; z = 0; }
  }
}

// ---------- やってみよう ----------
// 1. レスラーで c を 2 → 8 へ。1つの輪 → 2重 → 4重 → ぐちゃぐちゃ（周期倍分岐！）
// 2. トーマス（2）は sin だけ。bb を 0.1 にすると？
// 3. 3つの式をよく見ると、どれも「x, y, z がおたがいを変えあう」だけ
