// ============================================
// 01 反復とクモの巣図
// x₁ = f(x₀), x₂ = f(x₁), … とくり返す。グラフ上では「縦に f へ → 横に対角線へ」をくり返す（クモの巣図）
//   不動点 x* で |f'(x*)| < 1 なら近くの点は吸い寄せられ、> 1 なら押し返される
// クリック = 出発点 x₀ / 1〜4 = 関数 / ↑↓ = パラメータ / ←→ = 速さ / スペース = 止める・動かす / R = やり直し
// ============================================

let FUNCS = [
  { name: 'a·cos x', lo: 0, hi: 1.6, a: 1, amin: 0.2, amax: 1.6, f: (x, a) => a * Math.cos(x) },
  { name: 'ロジスティック r·x(1−x)', lo: 0, hi: 1, a: 2.8, amin: 0.5, amax: 4, f: (x, a) => a * x * (1 - x) },
  { name: 'x − a(x² − 2)（√2 を探す）', lo: 0, hi: 2.4, a: 0.25, amin: 0.05, amax: 0.95, f: (x, a) => x - a * (x * x - 2) },
  { name: 'tanh(a·x)', lo: -2, hi: 2, a: 1.6, amin: 0.3, amax: 3, f: (x, a) => Math.tanh(a * x) },
];
let fi = 1;          // 今の関数の番号
let x0 = 0.12;       // 出発点
let path = [];       // 反復の値 x0, x1, x2, …
let maxSteps = 120;  // ★ 何回くり返すか
let every = 12;      // ★ 何フレームごとに 1 回進めるか（小さいほど速い）
let running = true;
let fixedPts = [];
let SZ, gx, gy;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  SZ = min(width * 0.5, height - 170); gx = 60; gy = 100;
  restart();
}

function F() { return FUNCS[fi]; }
function fv(x) { return F().f(x, F().a); }
function restart() { path = [x0]; findFixed(); }

// 不動点と、そこでの傾き f'(x*)
function findFixed() {
  fixedPts = [];
  let lo = F().lo, hi = F().hi, n = 800;
  let pg = fv(lo) - lo;
  for (let s = 1; s <= n; s++) {
    let x = lo + (hi - lo) * s / n, g = fv(x) - x;
    if (pg * g <= 0 && !(pg === 0 && s > 1)) {
      let a = x - (hi - lo) / n, b = x;
      for (let k = 0; k < 50; k++) { let m = (a + b) / 2; if ((fv(a) - a) * (fv(m) - m) <= 0) b = m; else a = m; }
      let xs = (a + b) / 2, h = 1e-5;
      fixedPts.push({ x: xs, d: (fv(xs + h) - fv(xs - h)) / (2 * h) });
    }
    pg = g;
  }
}

function toPx(x) { return constrain(gx + (x - F().lo) / (F().hi - F().lo) * SZ, gx - 60, gx + SZ + 60); }
function toPy(y) { return constrain(gy + SZ - (y - F().lo) / (F().hi - F().lo) * SZ, gy - 60, gy + SZ + 60); }

function draw() {
  background(230, 30, 11);
  if (running && frameCount % every === 0 && path.length < maxSteps) {
    let nx = fv(path[path.length - 1]);
    if (isFinite(nx)) path.push(constrain(nx, -1e6, 1e6));
  }
  // 枠・対角線・y = f(x)
  noFill(); stroke(0, 0, 40); strokeWeight(1); rect(gx, gy, SZ, SZ);
  stroke(0, 0, 70, 70); strokeWeight(2); line(gx, gy + SZ, gx + SZ, gy);
  stroke(190, 70, 100); strokeWeight(3);
  beginShape();
  for (let s = 0; s <= 300; s++) {
    let x = F().lo + (F().hi - F().lo) * s / 300;
    vertex(toPx(x), toPy(fv(x)));
  }
  endShape();

  // クモの巣：(x, x) → (x, f(x)) → (f(x), f(x)) → …
  stroke(320, 70, 100, 80); strokeWeight(1.5); noFill();
  beginShape();
  vertex(toPx(path[0]), toPy(F().lo));
  for (let i = 0; i < path.length - 1; i++) {
    vertex(toPx(path[i]), toPy(path[i + 1]));
    vertex(toPx(path[i + 1]), toPy(path[i + 1]));
  }
  endShape();
  noStroke(); fill(320, 70, 100); circle(toPx(path[0]), toPy(F().lo), 10);
  let last = path[path.length - 1];
  fill(0, 0, 100); circle(toPx(last), toPy(last), 9);

  // 不動点：引き寄せ（緑）か押し返し（赤）か
  textSize(14);
  for (let p of fixedPts) {
    let attract = abs(p.d) < 1;
    fill(attract ? 140 : 0, 80, 100);
    circle(toPx(p.x), toPy(p.x), 14);
    text("x* = " + nf(p.x, 1, 3) + "  |f'| = " + nf(abs(p.d), 1, 2) + (attract ? '  引き寄せる' : '  押し返す'), toPx(p.x) + 12, toPy(p.x) + 22);
  }

  drawSeries();

  noStroke(); fill(0, 0, 100); textSize(18);
  text((fi + 1) + '：' + F().name + '　パラメータ = ' + nf(F().a, 1, 3) + '（↑↓）　クリック：x₀　1〜4：関数　←→：速さ　スペース：' + (running ? '止める' : '動かす') + '　R：やり直し', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('縦に動いて曲線に当たる = f を 1 回かける。横に動いて対角線に当たる = その値を次の入力にする。傾き f\' が −1〜1 の不動点にだけ吸い込まれる', 20, 68);
}

// 右側：x_n を回数ごとに並べたグラフ
function drawSeries() {
  let x0p = gx + SZ + 60, w = width - x0p - 40, y0p = gy + 20, h = SZ * 0.55;
  if (w < 160) return;
  noFill(); stroke(0, 0, 35); rect(x0p, y0p, w, h);
  for (let p of fixedPts) {
    let yy = map(p.x, F().lo, F().hi, y0p + h, y0p);
    stroke(abs(p.d) < 1 ? 140 : 0, 70, 90, 50); line(x0p, yy, x0p + w, yy);
  }
  let n0 = max(0, path.length - 60);
  stroke(320, 70, 100); strokeWeight(2);
  beginShape();
  for (let i = n0; i < path.length; i++) vertex(x0p + (i - n0) / 59 * w, constrain(map(path[i], F().lo, F().hi, y0p + h, y0p), y0p - 10, y0p + h + 10));
  endShape();
  noStroke(); fill(0, 0, 70); textSize(14);
  text('x_n（横軸 = 回数 n、直近 60 回）', x0p, y0p - 10);
  let ty = y0p + h + 34;
  fill(0, 0, 100); textSize(16);
  text('n = ' + (path.length - 1) + '　x_n = ' + nf(last1(), 1, 6), x0p, ty);
  fill(0, 0, 60); textSize(14);
  let lines = [
    '・0 < f\' < 1：片側からまっすぐ近づく（階段）',
    '・−1 < f\' < 0：左右に振れながら近づく（うずまき）',
    '・|f\'| > 1：離れていく。行き先は別の不動点・周期・カオス',
    '・ロジスティックで r を 3 より大きくすると？ 3.5、3.9 では？',
  ];
  for (let i = 0; i < lines.length; i++) text(lines[i], x0p, ty + 30 + i * 24);
}
function last1() { return path[path.length - 1]; }

function mousePressed() {
  if (mouseX > gx && mouseX < gx + SZ && mouseY > gy - 20 && mouseY < gy + SZ + 20) {
    x0 = map(mouseX, gx, gx + SZ, F().lo, F().hi);
    restart();
  }
}
function keyPressed() {
  if (key >= '1' && key <= '4') { fi = int(key) - 1; x0 = F().lo + (F().hi - F().lo) * 0.12; restart(); }
  if (key === UP_ARROW || key === 'ArrowUp') { F().a = min(F().amax, F().a + 0.05); restart(); }
  if (key === DOWN_ARROW || key === 'ArrowDown') { F().a = max(F().amin, F().a - 0.05); restart(); }
  if (key === LEFT_ARROW || key === 'ArrowLeft') every = min(60, every + 2);
  if (key === RIGHT_ARROW || key === 'ArrowRight') every = max(1, every - 2);
  if (key === ' ') running = !running;
  if (key === 'r' || key === 'R') restart();
}

// ---------- やってみよう ----------
// 1. 関数 1（cos）で a = 1 のとき、どこから出発しても同じ値（0.739…）に着く。電卓で cos を押し続けても同じ
// 2. 関数 3 で a を 0.35 にすると一番速く √2 に着く。そのとき f'(√2) はいくつ？（0 に近いほど速い → 03 ニュートン法）
// 3. 関数 2 で r = 3.2 にすると 2 つの値を行き来する（周期 2）。不動点はあるのに着かないのはなぜ？
// 4. FUNCS に自分の関数（例 x => Math.sin(3 * x)）を足して、不動点の数と傾きを調べよう
