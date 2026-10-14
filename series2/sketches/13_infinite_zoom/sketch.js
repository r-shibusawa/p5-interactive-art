// ============================================
// 13 無限ズーム
// シェルピンスキーのカーペットに、どこまでも吸い込まれていく
// 「拡大しても同じ形」= 自己相似 だから、ずっとズームし続けられる
// マウス左右 = 速さ / クリックで 一時停止
// ============================================

let t = 0; // ズームの進み具合
let paused = false;
let drawn = 0;
let lastDepth = -1; // 最後に色を指定した深さ

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  noStroke();
}

function draw() {
  background(0, 0, 4);
  if (!paused) t += map(mouseX, 0, width, 0.001, 0.01, true);
  if (t >= 1) t -= 1; // 1 周したら最初に戻す（9倍ズームで元の形と重なる）

  // 9^t 倍に拡大（左上→右下 の順に2回たどる ＝ 9倍 で同じ形に戻る）
  let zoom = pow(9, t);
  let S = min(width, height) * 0.9;

  // ズームの中心：左上のマスの中の右下のマス…を無限にたどった点 (S/4, S/4)
  translate(width / 2, height / 2);
  scale(zoom);
  translate(-S / 4, -S / 4);

  drawn = 0;
  lastDepth = -1;
  carpet(-S / 2, -S / 2, S, 0, zoom);

  resetMatrix();
  fill(0, 0, 100);
  textSize(16);
  text('マウス左右で速さ　クリックで一時停止　描いた四角 ' + drawn, 20, 30);
}

function carpet(x, y, s, depth, zoom) {
  // この四角が画面のどこに映るか（translate と scale を自分で計算）
  let S = min(width, height) * 0.9;
  let screenSize = s * zoom;
  let left = width / 2 + (x - S / 4) * zoom;
  let top = height / 2 + (y - S / 4) * zoom;

  // 画面の外にある四角は描かない（これで無限に深くても速い）
  if (left > width || top > height || left + screenSize < 0 || top + screenSize < 0) return;

  // 画面上で小さすぎる、または深すぎたら、そのまま塗って終わり
  if (screenSize < 8 || depth > 12) {
    if (depth !== lastDepth) {
      // 同じ深さは同じ色なので、色の指定は深さが変わったときだけ（速くするため）
      fill((depth * 25 + frameCount * 0.2) % 360, 60, 100);
      lastDepth = depth;
    }
    rect(x, y, s, s);
    drawn++;
    return;
  }
  let u = s / 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (i === 1 && j === 1) continue; // 真ん中は穴
      carpet(x + i * u, y + j * u, u, depth + 1, zoom);
    }
  }
}

function mousePressed() {
  paused = !paused;
}

// ---------- やってみよう ----------
// 1. 穴を「真ん中」から「左上」に変えると、ズームの中心もずれる（どこに変えればいい？）
// 2. 色の式を変えて、深さごとに虹色にしよう
// 3. カーペットではなく、05 の三角形で無限ズームをつくってみよう
