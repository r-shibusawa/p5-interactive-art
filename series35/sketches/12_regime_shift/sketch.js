// ============================================
// 12 生態系の急変（レジームシフト）
// 草原の草の量 x と、草を食べる牛の数 c：dx/dt = r·x(1 − x/K) − c·x²/(1 + x²)（メイの放牧モデル）
//   牛をゆっくり増やすと、草はなめらかに少しずつ減る……が、ある所で一気に「はげ山」へ崩れる。牛を戻しても草は戻らない
//   湖の富栄養化、サンゴ礁、砂漠化でも同じことが起きる。崩れる前に「ゆれが大きく・ゆっくり」になる（早期警報シグナル）
// ←→ = 牛の数 c / A = c をゆっくり増やす・減らす / ↑↓ = ゆらぎの大きさ / R = 最初から
// ============================================

let r = 1, K = 10;          // ★ 草の成長の速さと上限
let c = 1.2;                // 牛の数（食べる強さ）
let x = 8.5;                // 草の量
let sigma = 0.25;           // ★ 天気などのゆらぎ
let auto = false, dir = 1;
let xs = [], cs = [], vars = [], acs = [];
let W = 150;                // ★ 警報を計算する窓の長さ
let blades = [];

function f(xx, cc) { return r * xx * (1 - xx / K) - cc * xx * xx / (1 + xx * xx); }
function cOf(xx) { return r * (1 - xx / K) * (1 + xx * xx) / xx; }      // f = 0 を c について解く（x > 0）

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  for (let i = 0; i < 160; i++) blades.push({ x: random(), h: random(0.6, 1), s: random(-0.3, 0.3) });
}

function draw() {
  background(100, 15, 11);
  if (auto) { c += dir * 0.0008; if (c > 2.9) dir = -1; if (c < 1.2) dir = 1; }
  for (let k = 0; k < 4; k++) {
    let dt = 0.05;
    x += f(x, c) * dt + sigma * Math.sqrt(dt) * randomGaussian();
    x = constrain(x, 0.01, K * 1.2);
  }
  xs.push(x); cs.push(c);
  if (xs.length > 600) { xs.shift(); cs.shift(); }
  // ★ 早期警報：最近 W 個の分散と、1 つずれの自己相関
  let win = xs.slice(-W);
  let m = win.reduce((s, v) => s + v, 0) / win.length;
  let vr = win.reduce((s, v) => s + (v - m) ** 2, 0) / win.length;
  let ac = 0; for (let i = 1; i < win.length; i++) ac += (win[i] - m) * (win[i - 1] - m);
  ac = vr > 1e-9 ? ac / (win.length - 1) / vr : 0;
  vars.push(vr); acs.push(ac);
  if (vars.length > 600) { vars.shift(); acs.shift(); }

  let py = 110, lw = width * 0.45, top = height * 0.42;
  // ---- 左上：草原
  noStroke(); fill(200, 40, 35); rect(30, py, lw, top - py, 8);
  fill(35, 45, 35); rect(30, top - 40, lw, 40, 0, 0, 8, 8);
  strokeWeight(3);
  for (let b of blades) {
    let bx = 30 + 10 + b.x * (lw - 20), hh = (x / K) * 110 * b.h;
    stroke(100, 70, 40 + 40 * x / K); line(bx, top - 40, bx + b.s * hh, top - 40 - hh);
  }
  noStroke();
  let nCow = round(c * 3);
  for (let i = 0; i < nCow; i++) {
    let cx = 60 + ((i * 97 + frameCount * 0.2 * (i % 2 ? 1 : -1)) % (lw - 60) + lw - 60) % (lw - 60), cy = top - 55 - (i % 3) * 8;
    fill(0, 0, 95); ellipse(cx, cy, 34, 20); fill(0, 0, 15); ellipse(cx - 6, cy - 2, 9, 7); ellipse(cx + 18, cy - 5, 12, 10);
  }
  fill(0, 0, 100); textSize(14); text('草の量 x = ' + nf(x, 1, 2) + '　牛 c = ' + nf(c, 1, 2), 44, py + 22);

  // ---- 右上：分岐図（横 = c、縦 = x）
  let rx = 60 + lw, rw = width - rx - 30;
  let toC = (v) => rx + (v - 1) / 2 * rw, toX = (v) => top - 10 - v / K * (top - py - 30);
  noStroke(); fill(100, 10, 17); rect(rx, py, rw, top - py, 8);
  for (let i = 1; i < 500; i++) {
    let x0 = 0.02 + i * 0.02, x1 = x0 + 0.02, c0 = cOf(x0), c1 = cOf(x1);
    if (c0 < 1 || c0 > 3 || c1 < 1 || c1 > 3) continue;
    let stable = (f(x0 + 0.001, c0) - f(x0 - 0.001, c0)) < 0;
    stroke(stable ? color(100, 60, 90) : color(0, 70, 90)); strokeWeight(stable ? 4 : 1.5);
    line(toC(c0), toX(x0), toC(c1), toX(x1));
  }
  stroke(100, 60, 90); strokeWeight(4); line(toC(1), toX(0), toC(3), toX(0));
  noStroke(); fill(45, 90, 100); circle(toC(c), toX(x), 12);
  stroke(200, 60, 100, 50); strokeWeight(1); line(toC(c), py, toC(c), top);
  noStroke(); fill(0, 0, 85); textSize(14); text('分岐図：緑 = 安定（草原・はげ山）、赤 = 不安定（境目）。横 = 牛 c（1 〜 3）', rx + 12, py + 22);

  // ---- 下：時間のグラフ（x、分散、自己相関）
  let gy = top + 20, gh = (height - gy - 30) / 3 - 10;
  plotLine(xs, 0, K, 30, gy, width - 60, gh, color(100, 60, 90), '草の量 x');
  plotLine(vars, 0, 1.5, 30, gy + gh + 10, width - 60, gh, color(30, 80, 100), '分散（ゆれの大きさ）= ' + nf(vr, 1, 3));
  plotLine(acs, 0, 1, 30, gy + 2 * (gh + 10), width - 60, gh, color(280, 50, 100), '自己相関（ゆっくりさ）= ' + nf(ac, 1, 2));

  noStroke(); fill(0, 0, 100); textSize(18);
  text('牛 c = ' + nf(c, 1, 3) + '（←→）　A：自動 ' + (auto ? (dir > 0 ? 'ON 増やす' : 'ON 減らす') : 'off') + '　ゆらぎ σ = ' + nf(sigma, 1, 2) + '（↑↓）　R：最初から', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('c ≈ 2.6 で草原の枝が消えて崩壊。戻すには c ≈ 1.8 まで減らす必要がある（ヒステリシス）。崩れる少し前から、分散と自己相関がじわじわ上がる', 20, 68);
}

function plotLine(arr, lo, hi, x0, y0, w, h, col, label) {
  noStroke(); fill(100, 10, 17); rect(x0, y0, w, h, 6);
  noFill(); stroke(col); strokeWeight(2);
  beginShape(); for (let i = 0; i < arr.length; i++) vertex(x0 + i / 600 * w, y0 + h - 4 - constrain((arr[i] - lo) / (hi - lo), 0, 1) * (h - 8)); endShape();
  noStroke(); fill(col); textSize(13); text(label, x0 + 10, y0 + 16);
}

function keyPressed() {
  if (key === LEFT_ARROW) { auto = false; c = max(1, c - 0.05); }
  if (key === RIGHT_ARROW) { auto = false; c = min(3, c + 0.05); }
  if (key === UP_ARROW) sigma = min(1, sigma + 0.05);
  if (key === DOWN_ARROW) sigma = max(0, sigma - 0.05);
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'r' || key === 'R') { c = 1.2; x = 8.5; xs = []; cs = []; vars = []; acs = []; auto = false; dir = 1; }
}

// ---------- やってみよう ----------
// 1. A で牛をゆっくり増やし、崩壊する c を記録。そのあと減らして、草原が戻る c を記録しよう
// 2. σ を 0.8 にすると、崩壊はもっと早く（小さい c で）起きる。なぜ？（谷が浅いと、ゆれで山をこえる）
// 3. 崩壊の何フレーム前から分散が上がり始めた？ 警報として使えそう？
// 4. 牛 c を時間とともに減らす「回復作戦」を考えよう。どこまで減らせば草原に戻る？
