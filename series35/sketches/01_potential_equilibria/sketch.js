// ============================================
// 01 ポテンシャルと平衡点
// ボールが止まれる場所 = 地形 V(x; a) の傾きが 0 の所（平衡点、V'(x) = 0）
//   V'' > 0（谷の底）なら安定、V'' < 0（山の頂上）なら不安定
// 右の図は「a を変えたとき平衡点がどこにあるか」。谷と山がぶつかって消える所 = 折り目（fold、サドル・ノード分岐）
// マウス左右（または ←→）= a / 1〜3 = 地形の種類 / ドラッグ（左の図）= ボールを置く / R = ボールを戻す
// ============================================

let kind = 1;            // 地形の種類
let a = -1;              // パラメータ
let x = 0.5, v = 0;      // ボール
let damping = 3;         // ★ 摩擦
let names = ['', '折り目  V = x³/3 + a·x', '傾いた谷  V = x⁴/4 + a·x²/2 + 0.25·x', '二つの谷  V = x⁴/4 − x²/2 + a·x'];

// ★ 地形と、その傾き V'、曲がり具合 V''
function V(xx, aa) {
  if (kind === 1) return xx * xx * xx / 3 + aa * xx;
  if (kind === 2) return xx ** 4 / 4 + aa * xx * xx / 2 + 0.25 * xx;
  return xx ** 4 / 4 - xx * xx / 2 + aa * xx;
}
function dV(xx, aa) {
  if (kind === 1) return xx * xx + aa;
  if (kind === 2) return xx * xx * xx + aa * xx + 0.25;
  return xx * xx * xx - xx + aa;
}
function ddV(xx, aa) {
  if (kind === 1) return 2 * xx;
  if (kind === 2) return 3 * xx * xx + aa;
  return 3 * xx * xx - 1;
}
// V'(x; a) = 0 を a について解く（3 つとも a は 1 次式なので解ける）
function aOf(xx) {
  if (kind === 1) return -xx * xx;
  if (kind === 2) return Math.abs(xx) < 1e-3 ? NaN : -(xx * xx * xx + 0.25) / xx;
  return xx - xx * xx * xx;
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(230, 30, 12);
  // ボールの運動
  for (let k = 0; k < 6; k++) {
    let dt = 1 / 120;
    v += (-8 * dV(x, a) - damping * v) * dt;
    x += v * dt;
    if (x < -2 || x > 2) { x = constrain(x, -2, 2); v = 0; }
  }

  let gap = 40, pw = (width - 3 * gap) / 2, py = 110, ph = height - py - 40;
  // ---- 左：地形 V(x)
  let lx = gap;
  let toX = (xx) => lx + (xx + 2) / 4 * pw;
  let toY = (vv) => py + ph * 0.55 - vv * ph * 0.16;
  noStroke(); fill(230, 25, 18); rect(lx, py, pw, ph, 8);
  stroke(0, 0, 100, 15); line(lx, toY(0), lx + pw, toY(0));
  noFill(); stroke(150, 50, 80); strokeWeight(4);
  beginShape();
  for (let i = 0; i <= 160; i++) { let xx = -2 + 4 * i / 160; vertex(toX(xx), constrain(toY(V(xx, a)), py, py + ph)); }
  endShape();
  let eqs = roots(a);
  for (let e of eqs) {
    let yy = toY(V(e, a));
    if (yy < py || yy > py + ph) continue;
    let st = ddV(e, a) > 0;
    strokeWeight(3);
    if (st) { noStroke(); fill(150, 70, 100); } else { stroke(0, 70, 100); fill(230, 25, 18); }
    circle(toX(e), yy, 18);
  }
  noStroke(); fill(45, 90, 100);
  circle(toX(x), constrain(toY(V(x, a)) - 12, py, py + ph), 22);
  fill(0, 0, 80); textSize(16);
  text(names[kind], lx + 16, py + 28);
  text('● 安定（V\'\' > 0）　○ 不安定（V\'\' < 0）　平衡点の数：' + eqs.length, lx + 16, py + 52);

  // ---- 右：平衡点の図（横 = a、縦 = x）
  let rx = 2 * gap + pw;
  let toA = (aa) => rx + (aa + 2) / 4 * pw;
  let toXr = (xx) => py + ph / 2 - xx / 2 * (ph / 2 - 20);
  noStroke(); fill(230, 25, 18); rect(rx, py, pw, ph, 8);
  stroke(0, 0, 100, 15); strokeWeight(1);
  line(rx, toXr(0), rx + pw, toXr(0)); line(toA(0), py, toA(0), py + ph);
  // x を少しずつ変えて (a(x), x) をつなぐ。安定 = 実線、不安定 = 点線ふう
  let prev = null;
  for (let i = 0; i <= 400; i++) {
    let xx = -2 + 4 * i / 400, aa = aOf(xx);
    let p = isFinite(aa) && aa > -2 && aa < 2 ? { x: toA(aa), y: toXr(xx), st: ddV(xx, aa) > 0 } : null;
    if (p && prev) {
      if (p.st) { stroke(150, 70, 100); strokeWeight(4); line(prev.x, prev.y, p.x, p.y); }
      else if (i % 4 < 2) { stroke(0, 70, 100); strokeWeight(3); line(prev.x, prev.y, p.x, p.y); }
    }
    prev = p;
  }
  // 折り目の点（V' = 0 かつ V'' = 0）
  noStroke(); fill(45, 90, 100);
  for (let i = 0; i < 400; i++) {
    let x0 = -2 + 4 * (i + 0.37) / 400, x1 = x0 + 0.01;
    let a0 = aOf(x0), a1 = aOf(x1);
    if (isFinite(a0) && isFinite(a1) && ddV(x0, a0) * ddV(x1, a1) < 0 && abs(a0) < 2) { circle(toA(a0), toXr(x0), 14); }
  }
  // いまの a と、ボール
  stroke(200, 70, 100); strokeWeight(2); line(toA(a), py, toA(a), py + ph);
  noStroke(); fill(45, 90, 100); circle(toA(a), toXr(x), 16);
  fill(0, 0, 80); textSize(16);
  text('平衡点の図：横 = a、縦 = x。緑 = 安定、赤の点線 = 不安定、黄 = 折り目', rx + 16, py + 28);
  text('a', rx + pw - 24, toXr(0) - 8); text('x', toA(0) + 8, py + 50);

  noStroke(); fill(0, 0, 100); textSize(18);
  text('a = ' + nf(a, 1, 2) + '（マウス左右 / ←→）　1〜3：地形　ドラッグ：ボールを置く　R：ボールを戻す', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('青い縦線と曲線の交点 = いまの平衡点。a を動かすと、緑（谷）と赤（山）が黄の点でぶつかって消える。そこにいたボールは行き場を失う', 20, 68);
}

function roots(aa) {
  let out = [], prev = dV(-2, aa);
  for (let i = 1; i <= 400; i++) {
    let xx = -2 + 4 * i / 400, cur = dV(xx, aa);
    if (prev * cur < 0 || cur === 0) out.push(xx - 0.01 * cur / (cur - prev + 1e-12));
    prev = cur;
  }
  return out;
}

function mouseMoved() {
  let gap = 40, pw = (width - 3 * gap) / 2;
  if (mouseY > 90 && mouseX > 2 * gap + pw) a = constrain(map(mouseX, 2 * gap + pw, width - gap, -2, 2), -2, 2);
}
function mouseDragged() {
  let gap = 40, pw = (width - 3 * gap) / 2;
  if (mouseX < gap + pw && mouseY > 90) { x = constrain(map(mouseX, gap, gap + pw, -2, 2), -2, 2); v = 0; }
  else mouseMoved();
}
function keyPressed() {
  if (key === LEFT_ARROW) a = max(-2, a - 0.05);
  if (key === RIGHT_ARROW) a = min(2, a + 0.05);
  if (key === '1' || key === '2' || key === '3') { kind = Number(key); x = 0.5; v = 0; }
  if (key === 'r' || key === 'R') { x = 0.5; v = 0; }
}

// ---------- やってみよう ----------
// 1. 地形 1 で a を −1 から +1 へ。a = 0 で谷と山がぶつかる。そのとき V''（曲がり具合）はいくつ？
// 2. 地形 3 で、平衡点が 3 つある a の範囲を右の図から読みとろう（答え：約 −0.38 < a < 0.38）
// 3. 地形 2 の右の図は折り目が 1 つだけ。0.25 を 0 にすると形がどう変わる？（ピッチフォーク分岐）
// 4. 自分の地形 V を 1 つ追加してみよう：V, dV, ddV, aOf の 4 つを書き足す
