// ============================================
// 07 カオスゲーム（ランダムからフラクタルが生まれる）
// 「頂点をランダムに1つ選んで、そこへ半分だけ近づく」をくり返すと…？
// 3〜8 キーで頂点の数 / マウス上下 = 近づく割合 / クリックで頂点を置く
// ============================================

let vertices = [];
let px, py; // 今の点の位置
let layer;
let ratio = 0.5; // どれだけ近づくか（0.5 = 半分）
let lastIndex = -1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  layer = createGraphics(width, height);
  layer.colorMode(HSB, 360, 100, 100, 100);
  setPolygon(3);
}

// 正 n 角形の頂点を置く
function setPolygon(n) {
  vertices = [];
  let r = min(width, height) * 0.42;
  for (let i = 0; i < n; i++) {
    let a = -HALF_PI + (TWO_PI * i) / n;
    vertices.push(createVector(width / 2 + cos(a) * r, height / 2 + 40 + sin(a) * r));
  }
  reset();
}

function reset() {
  layer.background(0, 0, 6);
  px = random(width);
  py = random(height);
}

function draw() {
  // マウスで近づく割合を変える（変わったら描き直す）
  let r = map(mouseY, 0, height, 0.7, 0.3, true);
  if (abs(r - ratio) > 0.003) {
    ratio = r;
    reset();
  }

  // 1フレームに 2000 回くり返す
  for (let i = 0; i < 2000; i++) {
    let k = floor(random(vertices.length)); // 頂点をランダムに選ぶ
    // 頂点が4つ以上のとき：同じ頂点を続けて選ばない（こうすると模様がきれいに出る）
    if (vertices.length >= 4 && k === lastIndex) continue;
    lastIndex = k;
    let v = vertices[k];
    px = lerp(px, v.x, ratio); // 選んだ頂点に向かって ratio だけ近づく
    py = lerp(py, v.y, ratio);
    layer.stroke((k * 360) / vertices.length, 60, 100, 60);
    layer.point(px, py);
  }
  image(layer, 0, 0);

  // 頂点を描く
  noStroke();
  fill(0, 0, 100);
  for (let v of vertices) circle(v.x, v.y, 10);

  textSize(16);
  text('頂点 ' + vertices.length + '（3〜8 キー）　近づく割合 ' + nf(ratio, 1, 2) + '（マウス上下）　クリックで頂点を置く', 20, 30);
}

function keyPressed() {
  if (key >= '3' && key <= '8') setPolygon(int(key));
  if (key === 'r' || key === 'R') setPolygon(3);
}

function mousePressed() {
  // 自分で好きな場所に頂点を置く（最初のクリックで頂点をリセット）
  if (vertices.length >= 8 || mouseY < 50) return;
  vertices.push(createVector(mouseX, mouseY));
  reset();
}

// ---------- やってみよう ----------
// 1. 3つの頂点・割合 0.5 → シェルピンスキーの三角形になる！（05 と同じ形）
// 2. 頂点 4つ、5つ、6つで、きれいに見える割合を探そう
// 3. 「同じ頂点を続けて選ばない」ルールを消すと、四角形はどうなる？
