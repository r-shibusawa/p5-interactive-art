// ============================================
// 03 ニュートン法は不動点反復
// f(x) = 0 を解くニュートン法 x ← x − f(x)/f'(x) は、写像 g(x) = x − f(x)/f'(x) の不動点反復（01）そのもの
//   根 r で g'(r) = 0 → 01 の「傾き 0 は一番速い」。正しい桁数が毎回ほぼ 2 倍になる（2 次収束）
// クリック = 出発点 x₀ / スペース = 1 回進める / A = 自動 / 1〜4 = 関数 / F = 複素平面のニュートン・フラクタル（z³ − 1）
// ============================================

let FUNCS = [
  { name: 'x² − 2', f: (x) => x * x - 2, d: (x) => 2 * x, roots: [Math.SQRT2, -Math.SQRT2] },
  { name: 'x³ − 2x + 2', f: (x) => x * x * x - 2 * x + 2, d: (x) => 3 * x * x - 2, roots: [-1.7692923542386314] },
  { name: 'cos x − x', f: (x) => Math.cos(x) - x, d: (x) => -Math.sin(x) - 1, roots: [0.7390851332151607] },
  { name: 'x³ − x', f: (x) => x * x * x - x, d: (x) => 3 * x * x - 1, roots: [-1, 0, 1] },
];
let fi = 0;
let x0 = 2.6;
let xs = [];
let shown = 1;
let auto = true;
let lo = -3, hi = 3;               // ★ 横軸の範囲
let basinG;                        // 実数直線の「どの根へ行くか」の帯
let fractal = false, fracG, fracRow = 0, orbit = [];
let fw = 240, fh = 150;            // ★ フラクタルの解像度（小さいほど速い）

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  fracG = createGraphics(fw, fh); fracG.pixelDensity(1);
  basinG = createGraphics(400, 1); basinG.pixelDensity(1);
  restart();
}
function Fn() { return FUNCS[fi]; }
function g(x) { let d = Fn().d(x); return abs(d) < 1e-12 ? x : x - Fn().f(x) / d; }   // ★ ニュートン写像
function restart() {
  xs = [x0];
  for (let i = 0; i < 30; i++) { let n = g(xs[xs.length - 1]); xs.push(constrain(n, -1e6, 1e6)); }
  shown = 1;
  buildBasins();
}
function nearestRoot(x) {
  let best = -1, bd = 1e-6;
  Fn().roots.forEach((r, i) => { if (abs(x - r) < bd) { bd = abs(x - r); best = i; } });
  return best;
}
const ROOTCOL = [190, 45, 320];

function buildBasins() {
  basinG.loadPixels();
  for (let i = 0; i < 400; i++) {
    let x = lerp(lo, hi, i / 399), it = 0;
    for (; it < 60; it++) { x = g(x); if (nearestRoot(x) >= 0) break; }
    let r = nearestRoot(x);
    let c = r < 0 ? [0, 0, 0] : hsbToRgb(ROOTCOL[r], 70, 100 - it * 2.5);
    basinG.pixels[i * 4] = c[0]; basinG.pixels[i * 4 + 1] = c[1]; basinG.pixels[i * 4 + 2] = c[2]; basinG.pixels[i * 4 + 3] = 255;
  }
  basinG.updatePixels();
}

function draw() {
  background(230, 30, 11);
  if (fractal) { drawFractal(); return; }
  if (auto && frameCount % 40 === 0 && shown < 12) shown++;
  let W = (width - 120) / 2, H = height * 0.45, ax = 40, ay = 110, bxp = 80 + W;
  let ylo = -4, yhi = 4;
  let X = (x, x0p) => x0p + (x - lo) / (hi - lo) * W;
  let Y = (y) => constrain(ay + H - (y - ylo) / (yhi - ylo) * H, ay - 100, ay + H + 100);

  // 左：f のグラフと接線
  noFill(); stroke(0, 0, 35); strokeWeight(1); rect(ax, ay, W, H);
  clipTo(ax, ay, W, H);
  stroke(0, 0, 45); line(ax, Y(0), ax + W, Y(0));
  stroke(190, 70, 100); strokeWeight(2.5); beginShape();
  for (let s = 0; s <= 300; s++) { let x = lerp(lo, hi, s / 300); vertex(X(x, ax), Y(Fn().f(x))); }
  endShape();
  for (let i = 0; i < shown - 1; i++) {
    let x = xs[i], y = Fn().f(x);
    stroke(320, 70, 100, 50); strokeWeight(1); line(X(x, ax), Y(0), X(x, ax), Y(y));
    stroke(320, 70, 100); strokeWeight(1.5); line(X(x, ax), Y(y), X(xs[i + 1], ax), Y(0));   // 接線を x 軸まで
  }
  noStroke(); fill(320, 70, 100); circle(X(xs[shown - 1], ax), Y(0), 9);
  unclip();
  fill(0, 0, 70); textSize(14); text('y = ' + Fn().name + '　接線が x 軸と交わる所が次の x', ax, ay - 10);

  // 右：g(x) = x − f/f' と y = x、クモの巣
  noFill(); stroke(0, 0, 35); rect(bxp, ay, W, H);
  clipTo(bxp, ay, W, H);
  let Yg = (y) => constrain(ay + H - (y - lo) / (hi - lo) * H, ay - 100, ay + H + 100);
  stroke(0, 0, 70, 60); strokeWeight(1.5); line(bxp, ay + H, bxp + W, ay);
  stroke(45, 90, 100); strokeWeight(2.5);
  let prev = null;
  for (let s = 0; s <= 400; s++) {
    let x = lerp(lo, hi, s / 400), y = g(x);
    let p = { x: X(x, bxp), y: Yg(y), ok: abs(y) < 50 };
    if (prev && prev.ok && p.ok && abs(p.y - prev.y) < H * 0.5) line(prev.x, prev.y, p.x, p.y);
    prev = p;
  }
  stroke(320, 70, 100); strokeWeight(1.5);
  for (let i = 0; i < shown - 1; i++) {
    line(X(xs[i], bxp), Yg(xs[i]), X(xs[i], bxp), Yg(xs[i + 1]));
    line(X(xs[i], bxp), Yg(xs[i + 1]), X(xs[i + 1], bxp), Yg(xs[i + 1]));
  }
  noStroke();
  for (let r of Fn().roots) { fill(45, 90, 100); circle(X(r, bxp), Yg(r), 12); }
  unclip();
  fill(0, 0, 70); text("g(x) = x − f(x)/f'(x) と y = x。交点 = f の根 = g の不動点。そこで g は平ら（g' = 0）", bxp, ay - 10);

  // 帯：実数直線の各点がどの根へ行くか
  image(basinG, ax, ay + H + 20, W, 26);
  noFill(); stroke(0, 0, 100); strokeWeight(2); line(X(x0, ax), ay + H + 14, X(x0, ax), ay + H + 52);
  noStroke(); fill(0, 0, 60); textSize(13);
  text('出発点ごとに行き先の根で色分け（黒 = どこにも着かない）。根の近くは広い同じ色、f\' = 0 の近くは色が入り乱れる', ax, ay + H + 60, W);

  // 表：桁数が倍々になる
  let tx = bxp, ty = ay + H + 44;
  fill(0, 0, 100); textSize(15);
  text('n', tx, ty); text('x_n', tx + 34, ty); text('|x_n − r|', tx + 200, ty); text('正しい桁', tx + 330, ty);
  let r0 = Fn().roots[0];
  for (let i = 0; i < min(shown, 8); i++) {
    let r = Fn().roots.reduce((a, b) => abs(xs[i] - b) < abs(xs[i] - a) ? b : a, r0);
    let e = abs(xs[i] - r), digits = e > 0 ? max(0, -Math.log10(e)) : 16;
    fill(0, 0, 85);
    text(i, tx, ty + 24 + i * 22); text(nf(xs[i], 1, 12), tx + 34, ty + 24 + i * 22); text(e > 0 ? e.toExponential(2) : '0', tx + 200, ty + 24 + i * 22);
    fill(140, 70, 100); rect(tx + 330, ty + 12 + i * 22, digits * 10, 12);
  }

  noStroke(); fill(0, 0, 100); textSize(18);
  text((fi + 1) + '：f(x) = ' + Fn().name + '　クリック：x₀ = ' + nf(x0, 1, 3) + '　スペース：1 回進める　A：自動 ' + (auto ? 'ON' : 'off') + '　1〜4：関数　F：フラクタル', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('01 の「傾きが 0 に近いほど速い」を最大限に使う方法。2 次収束：誤差 e → 定数 × e²（桁が倍）。関数 2 で x₀ = 0 にすると 0 ↔ 1 の周期にはまる', 20, 68);
}

// 複素平面の z³ − 1：3 つの根のどれへ行くかで色分け（少しずつ計算する）
function drawFractal() {
  fracG.loadPixels();
  for (let n = 0; n < 12 && fracRow < fh; n++, fracRow++) {
    for (let i = 0; i < fw; i++) {
      let zr = map(i, 0, fw, -2.4, 2.4), zi = map(fracRow, 0, fh, -1.5, 1.5);
      let it = 0, root = -1;
      for (; it < 40; it++) {
        let nz = newtonZ(zr, zi); zr = nz[0]; zi = nz[1];
        root = whichRoot(zr, zi); if (root >= 0) break;
      }
      let c = root < 0 ? [0, 0, 0] : hsbToRgb(ROOTCOL[root], 70, 100 - it * 4);
      let p = (fracRow * fw + i) * 4;
      fracG.pixels[p] = c[0]; fracG.pixels[p + 1] = c[1]; fracG.pixels[p + 2] = c[2]; fracG.pixels[p + 3] = 255;
    }
  }
  fracG.updatePixels();
  image(fracG, 0, 0, width, height);
  // クリックした点の軌道
  stroke(0, 0, 100); strokeWeight(2); noFill();
  if (orbit.length > 1) { beginShape(); for (let z of orbit) vertex(map(z[0], -2.4, 2.4, 0, width), map(z[1], -1.5, 1.5, 0, height)); endShape(); }
  noStroke(); fill(0, 0, 0, 60); rect(0, 0, width, 84);
  fill(0, 0, 100); textSize(18);
  text('z³ − 1 = 0 のニュートン法（複素数）　クリック：その点からの軌道　F：もどる', 20, 40);
  fill(0, 0, 75); textSize(15);
  text('3 色 = 3 つの根（1、−½ ± (√3/2)i）の吸引域。境界では 3 色がどこまでも入り組む（どの 2 色の境にも 3 色目がある）', 20, 68);
}
function newtonZ(zr, zi) {
  // z ← z − (z³ − 1)/(3z²)
  let z2r = zr * zr - zi * zi, z2i = 2 * zr * zi;
  let z3r = z2r * zr - z2i * zi, z3i = z2r * zi + z2i * zr;
  let nr = z3r - 1, ni = z3i, dr = 3 * z2r, di = 3 * z2i;
  let den = dr * dr + di * di;
  if (den < 1e-12) return [zr, zi];
  return [zr - (nr * dr + ni * di) / den, zi - (ni * dr - nr * di) / den];
}
function whichRoot(zr, zi) {
  let R = [[1, 0], [-0.5, 0.8660254], [-0.5, -0.8660254]];
  for (let i = 0; i < 3; i++) if ((zr - R[i][0]) ** 2 + (zi - R[i][1]) ** 2 < 1e-6) return i;
  return -1;
}

function mousePressed() {
  if (fractal) {
    let z = [map(mouseX, 0, width, -2.4, 2.4), map(mouseY, 0, height, -1.5, 1.5)];
    orbit = [z];
    for (let i = 0; i < 30; i++) orbit.push(newtonZ(orbit[i][0], orbit[i][1]));
    return;
  }
  let W = (width - 120) / 2;
  if (mouseY < 100) return;
  let rx = mouseX < 40 + W ? (mouseX - 40) / W : (mouseX - 80 - W) / W;
  x0 = lerp(lo, hi, constrain(rx, 0, 1));
  restart();
}
function keyPressed() {
  if (key >= '1' && key <= '4') { fi = int(key) - 1; restart(); }
  if (key === ' ') { shown = min(xs.length, shown + 1); auto = false; }
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'f' || key === 'F') { fractal = !fractal; fracRow = 0; orbit = []; }
}

// ---------- やってみよう ----------
// 1. 関数 1 で表の「正しい桁」の棒が 1 → 2 → 4 → 8 → 16 と倍々になるのを確かめよう（01 の関数 3 は 1 桁ずつ）
// 2. 関数 4（x³ − x）の帯で、x₀ = 0.45 付近の色の乱れを拡大してみよう（lo, hi を 0.4, 0.5 に）
// 3. 関数 2 で x₀ = 0 から始めると 0 → 1 → 0 → … 。g の不動点でない「周期点」につかまる
// 4. newtonZ を z³ − 1 から z⁴ − 1 に変えると色は 4 つ。whichRoot の根も書きかえよう

// ==================================================
// ここから下は「道具」
// ==================================================
// グラフの枠の外に線がはみ出さないようにする
function clipTo(x, y, w, h) { drawingContext.save(); drawingContext.beginPath(); drawingContext.rect(x, y, w, h); drawingContext.clip(); }
function unclip() { drawingContext.restore(); }
// HSB（0〜360, 0〜100, 0〜100）→ RGB（0〜255）。画素に直接色を書くときに使う
function hsbToRgb(h, s, b) {
  s /= 100; b = max(0, b) / 100;
  let kf = (n) => (n + h / 60) % 6;
  let fc = (n) => b * (1 - s * Math.max(0, Math.min(kf(n), 4 - kf(n), 1)));
  return [255 * fc(5), 255 * fc(3), 255 * fc(1)];
}
