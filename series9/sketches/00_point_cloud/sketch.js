// ============================================
// 00 点の集まりに「形」はあるか？
// データは点の集まり（点群）。人の目には円や 8 の字に見えるが、コンピュータにはただの座標の列
// TDA（位相的データ解析）は「穴がいくつあるか」のように、形の本質を数で取り出す方法
// 1〜5 で形を切りかえ / マウス上下 = ばらつき（ノイズ） / 左右 = 点の数 / クリックで作り直す
// ============================================

let pts = [];
let shape = 1;
let names = ['', '円（穴 1 つ）', '2 つの円（穴 2 つ）', '8 の字', 'ただの塊（穴なし）', '2 つの塊'];
let seed = 1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

// ★ 形から点をサンプリングする
function makePoints(n, noiseAmt) {
  randomSeed(seed);
  let out = [];
  let cx = width / 2, cy = height / 2 + 30, R = min(width, height) * 0.25;
  for (let i = 0; i < n; i++) {
    let a = random(TWO_PI), x, y;
    if (shape === 1) { x = cx + cos(a) * R; y = cy + sin(a) * R; }
    else if (shape === 2) { let s = random() < 0.5 ? -1 : 1; x = cx + s * R * 1.1 + cos(a) * R * 0.6; y = cy + sin(a) * R * 0.6; }
    else if (shape === 3) { let t = a; x = cx + R * 1.2 * sin(t); y = cy + R * 0.8 * sin(t) * cos(t); }
    else if (shape === 4) { let r = R * sqrt(random()); x = cx + cos(a) * r; y = cy + sin(a) * r; }
    else { let s = random() < 0.5 ? -1 : 1; let r = R * 0.5 * sqrt(random()); x = cx + s * R + cos(a) * r; y = cy + sin(a) * r; }
    out.push({ x: x + randomGaussian() * noiseAmt, y: y + randomGaussian() * noiseAmt });
  }
  return out;
}

function draw() {
  background(230, 40, 10);
  let n = floor(map(mouseX, 0, width, 20, 200, true));
  let noiseAmt = map(mouseY, 0, height, 40, 0, true);
  pts = makePoints(n, noiseAmt);

  noStroke();
  for (let p of pts) {
    fill(170, 70, 100);
    circle(p.x, p.y, 9);
  }
  fill(0, 0, 100);
  textSize(18);
  text('形：' + names[shape] + '（1〜5）　点 ' + n + ' 個（マウス左右）　ばらつき ' + round(noiseAmt) + '（上下）　クリックで別のサンプル', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('コンピュータが持っているのは ' + n + ' 組の (x, y) だけ。「穴がある」ことをどう計算で言い当てる？ → 01 から順に', 20, 68);
  // 座標の列（データの正体）
  textSize(12);
  fill(0, 0, 45);
  let s = pts.slice(0, 6).map((p) => '(' + round(p.x) + ', ' + round(p.y) + ')').join('  ') + '  …';
  text('データ: ' + s, 20, height - 20);
}

function keyPressed() { if (key >= '1' && key <= '5') shape = int(key); }
function mousePressed() { seed = floor(random(10000)); }

// ---------- やってみよう ----------
// 1. ノイズを上げていくと、どこまで「円」に見える？ 自分の目の限界を知ろう
// 2. 点を 20 個にすると、8 の字と 2 つの円の区別はつく？
// 3. 自分の形を 6 として追加しよう（例：渦巻き、三角形の輪郭）
