// ============================================
// 04 ヒステリシス
// カスプの地形 V(x) = x⁴ + a·x² + b·x で a < 0 に固定し、b を行ったり来たりさせる
//   右へ動かすときは b = +bc でとび、左へ戻すときは b = −bc でとぶ。行きと帰りで道が違う → ループ（ヒステリシス）
//   bc = √(−8a³/27)。身近な例：磁石の磁化、サーモスタット（暖房のオン・オフ）、気分の切り替わり
// ←→ = 往復の速さ / ↑↓ = a（谷の深さ） / M = マウスで b を動かす / スペース = 一時停止 / C = ループを消す
// ============================================

let a = -1.5;               // ★ a < 0 で谷が 2 つ
let b = 0, x = -0.9;
let speed = 0.008;          // ★ 往復の速さ
let amp = 2.4;              // ★ 往復の幅
let phase = 0;
let useMouse = false, paused = false;
let path = [];              // (b, x, 向き) の記録
let jumpsUp = [], jumpsDown = [];

function dV(xx) { return 4 * xx * xx * xx + 2 * a * xx + b; }
function V(xx) { return xx ** 4 + a * xx * xx + b * xx; }
function bc() { return a < 0 ? Math.sqrt(-8 * a * a * a / 27) : 0; }

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(280, 25, 11);
  let prevB = b, prevX = x;
  if (!paused) {
    if (useMouse) b = constrain(map(mouseX, width * 0.42, width - 40, -3, 3), -3, 3);
    else { phase += speed; b = amp * Math.sin(phase); }
    for (let k = 0; k < 20; k++) x -= 0.004 * dV(x);
    x = constrain(x, -1.8, 1.8);
    let dir = b >= prevB ? 1 : -1;
    path.push({ b, x, dir });
    if (path.length > 2000) path.shift();
    if (abs(x - prevX) > 0.08) (dir > 0 ? jumpsUp : jumpsDown).push(b);
    if (jumpsUp.length > 5) jumpsUp.shift();
    if (jumpsDown.length > 5) jumpsDown.shift();
  }

  let py = 110, ph = height - py - 40;
  // ---- 左：地形とボール
  let lx = 30, lw = width * 0.38;
  let toX = (xx) => lx + (xx + 1.8) / 3.6 * lw;
  let toY = (vv) => py + ph * 0.45 - vv * ph * 0.12;
  noStroke(); fill(280, 20, 17); rect(lx, py, lw, ph, 8);
  fill(300, 35, 45);
  beginShape(); vertex(lx, py + ph);
  for (let i = 0; i <= 160; i++) { let xx = -1.8 + 3.6 * i / 160; vertex(toX(xx), constrain(toY(V(xx)), py, py + ph)); }
  vertex(lx + lw, py + ph); endShape(CLOSE);
  fill(x > 0 ? color(25, 90, 100) : color(195, 80, 100));
  circle(toX(x), constrain(toY(V(x)) - 13, py + 13, py + ph), 26);
  fill(0, 0, 85); textSize(15);
  text('b = ' + nf(b, 1, 2) + (b >= prevB ? '  →' : '  ←'), lx + 16, py + 28);

  // ---- 右：(b, x) の図
  let rx = lx + lw + 30, rw = width - rx - 30;
  let toB = (bb) => rx + (bb + 3) / 6 * rw;
  let toXr = (xx) => py + ph / 2 - xx / 1.6 * (ph / 2 - 20);
  noStroke(); fill(280, 20, 17); rect(rx, py, rw, ph, 8);
  stroke(0, 0, 100, 15); strokeWeight(1);
  line(rx, toXr(0), rx + rw, toXr(0)); line(toB(0), py, toB(0), py + ph);
  // 平衡点の S 字（b = −4x³ − 2a·x）。真ん中（不安定）は細く
  noFill();
  for (let i = 0; i < 320; i++) {
    let x0 = -1.6 + 3.2 * i / 320, x1 = x0 + 0.01;
    let b0 = -4 * x0 ** 3 - 2 * a * x0, b1 = -4 * x1 ** 3 - 2 * a * x1;
    if (abs(b0) > 3 || abs(b1) > 3) continue;
    let stable = 12 * x0 * x0 + 2 * a > 0;
    stroke(0, 0, 100, stable ? 35 : 20); strokeWeight(stable ? 8 : 2);
    line(toB(b0), toXr(x0), toB(b1), toXr(x1));
  }
  // とぶ位置の目印
  let c = bc();
  stroke(0, 80, 100, 60); strokeWeight(1);
  for (let s of [-1, 1]) line(toB(s * c), py, toB(s * c), py + ph);
  // 実際にたどった道：行き（右向き）= オレンジ、帰り（左向き）= 水色
  strokeWeight(3);
  for (let i = 1; i < path.length; i++) {
    let p = path[i], q = path[i - 1];
    stroke(p.dir > 0 ? color(25, 90, 100, 70) : color(195, 80, 100, 70));
    line(toB(q.b), toXr(q.x), toB(p.b), toXr(p.x));
  }
  noStroke(); fill(45, 90, 100); circle(toB(b), toXr(x), 16);
  fill(0, 0, 85); textSize(15);
  text('横 = b（原因）、縦 = x（状態）。白い太線 = 谷、細線 = 山。赤い縦線 = とぶ位置 b = ±' + nf(c, 1, 2), rx + 16, py + 28);
  fill(25, 90, 100); text('行き（→）でとんだ b：' + jumpsUp.map((v) => nf(v, 1, 2)).join(', '), rx + 16, py + ph - 40);
  fill(195, 80, 100); text('帰り（←）でとんだ b：' + jumpsDown.map((v) => nf(v, 1, 2)).join(', '), rx + 16, py + ph - 16);

  noStroke(); fill(0, 0, 100); textSize(18);
  text('a = ' + nf(a, 1, 2) + '（↑↓）　速さ ' + nf(speed * 1000, 1, 0) + '（←→）　M：マウスで b ' + (useMouse ? 'ON' : 'off') + '　スペース：' + (paused ? '再開' : '一時停止') + '　C：消す', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('同じ b = 0 でも、さっきまで右にいたか左にいたかで状態がちがう = 「記憶」をもつ。a を 0 に近づけるとループは細くなり、a > 0 で消える', 20, 68);
}

function keyPressed() {
  if (key === UP_ARROW) { a = min(0.5, a + 0.1); path = []; }
  if (key === DOWN_ARROW) { a = max(-2.5, a - 0.1); path = []; }
  if (key === RIGHT_ARROW) speed = min(0.05, speed * 1.4);
  if (key === LEFT_ARROW) speed = max(0.001, speed / 1.4);
  if (key === 'm' || key === 'M') useMouse = !useMouse;
  if (key === ' ') paused = !paused;
  if (key === 'c' || key === 'C') { path = []; jumpsUp = []; jumpsDown = []; }
}

// ---------- やってみよう ----------
// 1. a = −0.5, −1.5, −2.5 でループの幅を測り、bc = √(−8a³/27) と比べよう
// 2. amp を 1.0 にすると（bc より小さい往復）、ボールは一度もとばない。なぜ？
// 3. 速さを最大にするとループが太る（遅れ）。本物の磁石でも速く動かすとループが広がる
// 4. サーモスタット：b = 室温、x = 暖房オン/オフとして、室温を b で上下させるシミュレーションにしてみよう
