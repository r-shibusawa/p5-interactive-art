// ============================================
// 10 自然の中のボロノイ（ウォーリーノイズ）
// キリンの模様、ひび割れた泥、細胞、トンボの羽 … 自然にはボロノイ図のような模様がたくさんある
//   ウォーリーノイズ：F1 = いちばん近い点までの距離、F2 = 2 番目に近い点までの距離。F2 − F1 が小さい所 = 境界
//   点はマス目に 1 個ずつ置くので、調べるのはまわり 3×3 マスの 9 個だけ → 速い
// 1 = キリン / 2 = ひび割れた泥 / 3 = 細胞 / 4 = トンボの羽 / ↑↓ = 模様の大きさ / スペース = 一時停止 / P = 点を表示
// ============================================

let style = 1;
let gs = 100;             // ★ マス目の大きさ（画面の px。大きいほど模様が大きい）
let res = 4;              // ★ 何画素ずつまとめて計算するか
let buf, gw, gh;
let t = 0, paused = false, showPts = false;
let seeds = [];           // マスごとの乱数（点の位置と色のゆらぎ）
let fx, fy, fv, cw, ch;   // このフレームの点の位置（マスごとに 1 回だけ計算しておく）
let names = ['', 'キリン', 'ひび割れた泥', '細胞', 'トンボの羽'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  gw = ceil(width / res); gh = ceil(height / res);
  buf = createGraphics(gw, gh);
  buf.pixelDensity(1);
  for (let i = 0; i < 4096; i++) seeds.push({ a: random(TWO_PI), b: random(TWO_PI), s: random(0.5, 1.5), v: random() });
}

function seedOf(i, j) { return seeds[((i * 73856093) ^ (j * 19349663)) >>> 0 & 4095]; }
// マス (i, j) の点の位置（ゆっくり動く）
function featurePoint(i, j) {
  let s = seedOf(i, j);
  return { x: i + 0.5 + 0.4 * Math.sin(t * s.s + s.a), y: j + 0.5 + 0.4 * Math.sin(t * s.s * 0.8 + s.b), v: s.v };
}

// ★ ウォーリーノイズ：F1, F2 と、いちばん近い点の乱数 v を返す
function worley(x, y) {
  let ci = Math.floor(x), cj = Math.floor(y), f1 = 9, f2 = 9, v = 0;
  for (let j = cj - 1; j <= cj + 1; j++) for (let i = ci - 1; i <= ci + 1; i++) {
    let k = (i + 1) + (j + 1) * cw;
    let d = Math.sqrt((fx[k] - x) ** 2 + (fy[k] - y) ** 2);
    if (d < f1) { f2 = f1; f1 = d; v = fv[k]; } else if (d < f2) f2 = d;
  }
  return [f1, f2, v];
}

// ★ 模様ごとの色の決め方（F1, F2 − F1 を使う）
function shade(f1, f2, v, x, y) {
  let e = f2 - f1, lw = res * (style === 4 ? 1.6 : 1) * 1.8 / gs;   // lw = 線が途切れない最低の太さ（画素 2〜3 個分）
  if (style === 1) {                                    // キリン：太いクリーム色のすき間と茶色のまだら
    if (e < 0.16) return [238, 222, 180];
    let k = 0.75 + 0.25 * v - 0.25 * f1;
    return [150 * k + 20, 85 * k, 35 * k];
  }
  if (style === 2) {                                    // ひび割れた泥：細い黒いひびと、縁が反り返った明るい土
    if (e < max(0.05, lw)) return [45, 30, 20];
    let k = 0.7 + 0.35 * Math.min(1, e * 2) + 0.1 * v;
    return [160 * k, 118 * k, 78 * k];
  }
  if (style === 3) {                                    // 細胞：明るい膜、紫の核、ピンクの細胞質
    if (e < max(0.06, lw)) return [250, 235, 245];
    if (f1 < 0.16 + 0.05 * v) return [90, 40, 120];
    let k = 1 - 0.5 * f1;
    return [230 * k, 120 * k + 40 * v, 170 * k];
  }
  // トンボの羽：細い脈と、虹色に光る膜
  if (e < max(0.035, lw)) return [30, 35, 40];
  let h = (200 + 120 * f1 + 40 * Math.sin(x * 0.05)) % 360, c = hsbToRgb(h, 25 + 20 * v, 92 - 25 * f1);
  return c;
}

function paintBuffer() {
  buf.loadPixels();
  let px = buf.pixels;
  let sx = style === 4 ? 0.55 : 1, sy = style === 4 ? 1.6 : 1;   // トンボの羽は横に長いセル
  cw = ceil(width * sx / gs) + 3; ch = ceil(height * sy / gs) + 3;
  fx = new Float32Array(cw * ch); fy = new Float32Array(cw * ch); fv = new Float32Array(cw * ch);
  for (let j = -1; j < ch - 1; j++) for (let i = -1; i < cw - 1; i++) {
    let p = featurePoint(i, j), k = (i + 1) + (j + 1) * cw;
    fx[k] = p.x; fy[k] = p.y; fv[k] = p.v;
  }
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
    let x = (gx + 0.5) * res * sx / gs, y = (gy + 0.5) * res * sy / gs;
    let [f1, f2, v] = worley(x, y);
    let c = shade(f1, f2, v, gx, gy), k = 4 * (gx + gy * gw);
    px[k] = c[0]; px[k + 1] = c[1]; px[k + 2] = c[2]; px[k + 3] = 255;
  }
  buf.updatePixels();
}

function draw() {
  if (!paused) t += 0.01;
  paintBuffer();
  image(buf, 0, 0, gw * res, gh * res);
  if (showPts) {
    let sx = style === 4 ? 0.55 : 1, sy = style === 4 ? 1.6 : 1;
    noStroke(); fill(0, 0, 100);
    for (let j = 0; j < ch - 2; j++) for (let i = 0; i < cw - 2; i++) {
      let p = featurePoint(i, j);
      circle(p.x * gs / sx, p.y * gs / sy, 6);
    }
  }
  noStroke(); fill(0, 0, 0, 55); rect(0, 0, width, 84);
  fill(0, 0, 100); textSize(18);
  text('1〜4：' + names[style] + '　↑↓：大きさ ' + gs + '　スペース：' + (paused ? '再開' : '一時停止') + '　P：点を表示 ' + (showPts ? 'ON' : 'off'), 20, 40);
  fill(0, 0, 80); textSize(15);
  text('F1 = 最寄りの点までの距離、F2 = 2 番目。F2 − F1 ≈ 0 が境界（ボロノイの辺）。しきい値と色の決め方を変えるだけで、キリン・泥・細胞・羽になる', 20, 68);
}

function keyPressed() {
  if (key === '1' || key === '2' || key === '3' || key === '4') style = int(key);
  if (key === UP_ARROW) gs = min(300, gs + 10);
  if (key === DOWN_ARROW) gs = max(30, gs - 10);
  if (key === ' ') paused = !paused;
  if (key === 'p' || key === 'P') showPts = !showPts;
}

// ---------- やってみよう ----------
// 1. キリン（1）のしきい値 0.16 を 0.05 や 0.3 にしてみよう。どの動物に見える？（ヒョウ？ カメの甲羅？）
// 2. F1 だけで明るさを決めると「泡」や「水面のゆらぎ（コースティクス）」のように見える。shade を書きかえよう
// 3. 点を 2 段階（大きなマスと小さなマス）重ねて、大きなひびと小さなひびのある泥にしよう
// 4. 0.4 * Math.sin の 0.4 を 0 にすると、点がマスの中心にそろう。模様はどうなる？（正方形のタイル）

// 色の変換（HSB → RGB 0〜255）
function hsbToRgb(h, s, b) {
  s /= 100; b /= 100;
  let k = (n) => (n + h / 60) % 6;
  let f = (n) => b * (1 - s * Math.max(0, Math.min(k(n), 4 - k(n), 1)));
  return [255 * f(5), 255 * f(3), 255 * f(1)];
}
