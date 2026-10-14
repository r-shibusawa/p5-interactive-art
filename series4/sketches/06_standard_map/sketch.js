// ============================================
// 06 スタンダード写像（島とカオスの海）
// 「回転しながら、周期的にキックされる」コマの動きを 2 つの数で表す
// クリックした場所から軌道を追うと、きれいな輪（島）か、散らばる点（カオスの海）になる
// クリックで軌道を追加 / マウス上下 = キックの強さ K / C で消す
// ============================================

let K = 0.9; // キックの強さ（0 = 規則的、大きいほどカオス）
let orbits = []; // 追っている軌道 {x, p, hue}
let layer;

function setup() {
  createCanvas(windowWidth, windowHeight);
  layer = createGraphics(width, height);
  layer.colorMode(HSB, 360, 100, 100, 100);
  layer.background(240, 40, 8);
  // 最初にいくつかの軌道をランダムに
  for (let i = 0; i < 25; i++) orbits.push({ x: random(TWO_PI), p: random(TWO_PI), hue: random(360) });
}

function draw() {
  let nk = map(mouseY, 0, height, 2.0, 0.0, true);
  if (abs(nk - K) > 0.01) {
    K = nk;
    layer.background(240, 40, 8);
  }

  // それぞれの軌道を 200 ステップ進めて点を打つ
  for (let o of orbits) {
    for (let i = 0; i < 200; i++) {
      // ★ スタンダード写像：運動量がキックされ、角度が運動量ぶん進む
      o.p = (o.p + K * sin(o.x) + TWO_PI) % TWO_PI;
      o.x = (o.x + o.p + TWO_PI) % TWO_PI;
      layer.stroke(o.hue, 60, 100, 50);
      layer.point(map(o.x, 0, TWO_PI, 0, width), map(o.p, 0, TWO_PI, height, 0));
    }
  }

  image(layer, 0, 0);
  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text('K = ' + nf(K, 1, 2) + '（マウス上下）　クリックで軌道を追加　C で消す　軌道 ' + orbits.length, 20, 40);
  fill(0, 0, 60);
  textSize(14);
  text('横：角度 x　縦：運動量 p　　p ← p + K sin(x),  x ← x + p', 20, 66);
}

function mousePressed() {
  if (mouseY < 50) return;
  orbits.push({ x: map(mouseX, 0, width, 0, TWO_PI), p: map(mouseY, height, 0, 0, TWO_PI), hue: random(360) });
}

function keyPressed() {
  if (key === 'c' || key === 'C') {
    orbits = [];
    layer.background(240, 40, 8);
  }
}

// ---------- やってみよう ----------
// 1. K を 0 にすると全部まっすぐな線（規則的）。0.5、1.0、1.5 と上げていこう
// 2. 島（輪）の中をクリック → 輪の上に乗る。島の外をクリック → 海に散らばる
// 3. 島の「中の島」を探してズーム…はできないが、島の中を細かくクリックしてみよう
