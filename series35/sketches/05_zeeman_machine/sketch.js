// ============================================
// 05 ジーマンのカタストロフィー・マシン
// 円板（中心で自由に回る）の縁の 1 点に、ゴムひもを 2 本つなぐ。1 本は上の固定点 A へ、もう 1 本の端 Q をマウスで動かす
//   ゴムの伸びのエネルギー E(θ) がいちばん小さい角度へ円板は回る。Q をゆっくり動かしても、ある所で円板が「パチン」と回る
//   黄色い領域 = エネルギーの谷が 2 つある Q の場所。4 つのとがった点（カスプ）をもつひし形。へりをこえるときにとぶ
// マウス = 端 Q / A = 自動で左右に往復 / T = 黄色い領域の表示 / C = 軌跡を消す / ↑↓ = ゴムの自然長
// ============================================

let U;                       // 1 単位 = 何ピクセル
let cx, cy;                  // 円板の中心（画面）
let r = 1;                   // ★ 円板の半径
let dA = 2;                  // ★ 中心から固定点 A までの距離
let l0 = 1;                  // ★ ゴムの自然長（これより短いとたるむ）
let theta = 0.3, omega = 0;  // 円板の角度と角速度
let damping = 1.8;           // ★ 回転の摩擦
let Q = { x: 0.6, y: 3 };    // 動かす端（単位は U）
let auto = false, showRegion = true;
let t = 0;
let qTrail = [], thLog = [];
let region;                  // 谷が 2 つの領域の絵
let snaps = 0, flash = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  U = min((height - 130) / 6.6, 110);
  cx = width * 0.36; cy = 110 + 2.3 * U;
  buildRegion();
}

// 円板の縁の点 P(θ)（θ = 0 で真下）
function rim(th) { return { x: r * Math.sin(th), y: r * Math.cos(th) }; }
// ★ エネルギー：のびたゴムだけが E = ½(のび)² をもつ
function energy(th, q) {
  let p = rim(th), e = 0;
  for (let s of [{ x: 0, y: -dA }, q]) {
    let d = Math.hypot(p.x - s.x, p.y - s.y) - l0;
    if (d > 0) e += 0.5 * d * d;
  }
  return e;
}
function dE(th, q) { return (energy(th + 1e-4, q) - energy(th - 1e-4, q)) / 2e-4; }
// θ を一周調べて、エネルギーの谷の数を数える
function countMinima(q) {
  let n = 0, N = 120, es = [];
  for (let i = 0; i < N; i++) es.push(energy(TWO_PI * i / N, q));
  for (let i = 0; i < N; i++) if (es[i] < es[(i + N - 1) % N] && es[i] <= es[(i + 1) % N]) n++;
  return n;
}

function buildRegion() {
  region = createGraphics(width, height);
  region.colorMode(HSB, 360, 100, 100, 100);
  region.noStroke();
  let cell = 4;
  for (let px = 0; px < width; px += cell) for (let py = cy + 0.3 * U; py < height; py += cell) {
    let q = { x: (px + cell / 2 - cx) / U, y: (py + cell / 2 - cy) / U };
    if (Math.abs(q.x) > 2.5) continue;
    if (countMinima(q) >= 2) { region.fill(50, 80, 100, 35); region.rect(px, py, cell, cell); }
  }
}

function draw() {
  background(205, 30, 12);
  if (auto) { t += 0.01; Q = { x: 1.3 * Math.sin(t), y: 3.0 }; }
  else if (mouseY > 100) Q = { x: constrain((mouseX - cx) / U, -3, 3), y: constrain((mouseY - cy) / U, 0.5, 5) };
  // 円板の運動（小さな刻みで）
  for (let k = 0; k < 8; k++) {
    let dt = 1 / 240;
    omega += (-40 * dE(theta, Q) - damping * omega) * dt;
    omega = constrain(omega, -40, 40);
    theta += omega * dt;
  }
  theta = ((theta + PI) % TWO_PI + TWO_PI) % TWO_PI - PI;
  if (abs(omega) > 3 && flash === 0) { snaps++; flash = 40; }
  if (flash > 0) flash--;
  qTrail.push({ x: Q.x, y: Q.y }); if (qTrail.length > 600) qTrail.shift();
  thLog.push(theta); if (thLog.length > 500) thLog.shift();

  if (showRegion) image(region, 0, 0);
  // Q の軌跡
  noFill(); stroke(190, 60, 100, 50); strokeWeight(2);
  beginShape(); for (let q of qTrail) vertex(cx + q.x * U, cy + q.y * U); endShape();

  // 固定点 A・円板・ゴム
  let p = rim(theta);
  let P = { x: cx + p.x * U, y: cy + p.y * U };
  let A = { x: cx, y: cy - dA * U }, Qs = { x: cx + Q.x * U, y: cy + Q.y * U };
  for (let s of [A, Qs]) {
    let stretch = max(0, dist(P.x, P.y, s.x, s.y) / U - l0);
    stroke(330, 60 + stretch * 20, 100); strokeWeight(map(stretch, 0, 3, 6, 2, true));
    line(P.x, P.y, s.x, s.y);
  }
  noStroke(); fill(0, 0, 85); circle(A.x, A.y, 16);
  fill(210, 20, flash > 0 ? 60 + flash : 55); circle(cx, cy, 2 * r * U);
  stroke(0, 0, 100); strokeWeight(3); line(cx, cy, P.x, P.y);
  noStroke(); fill(45, 90, 100); circle(P.x, P.y, 16); fill(0, 0, 100); circle(cx, cy, 8);
  fill(190, 70, 100); circle(Qs.x, Qs.y, 18);
  fill(0, 0, 80); textSize(14); text('A（固定）', A.x + 12, A.y + 5); text('Q', Qs.x + 12, Qs.y + 5);

  // ---- 右：円板の角度のグラフ
  let gx = width * 0.66, gy = 110, gw = width - gx - 30, gh = height * 0.4;
  noStroke(); fill(205, 25, 18); rect(gx, gy, gw, gh, 8);
  stroke(0, 0, 100, 15); line(gx, gy + gh / 2, gx + gw, gy + gh / 2);
  noFill(); stroke(45, 90, 100); strokeWeight(2);
  beginShape(); for (let i = 0; i < thLog.length; i++) vertex(gx + i / 500 * gw, gy + gh / 2 - thLog[i] / PI * (gh / 2 - 8)); endShape();
  noStroke(); fill(0, 0, 80); textSize(14); text('円板の角度 θ（時間 →）。急な段差 = パチン', gx + 12, gy + 22);
  // エネルギー E(θ) のグラフ
  let ey = gy + gh + 30, eh = height - ey - 30;
  fill(205, 25, 18); rect(gx, ey, gw, eh, 8);
  let es = [], emax = 0;
  for (let i = 0; i <= 120; i++) { let e = energy(-PI + TWO_PI * i / 120, Q); es.push(e); emax = max(emax, e); }
  noFill(); stroke(330, 60, 100); strokeWeight(2);
  beginShape(); for (let i = 0; i <= 120; i++) vertex(gx + i / 120 * gw, ey + eh - 10 - es[i] / (emax + 1e-6) * (eh - 40)); endShape();
  noStroke(); fill(45, 90, 100);
  circle(gx + (theta + PI) / TWO_PI * gw, ey + eh - 10 - energy(theta, Q) / (emax + 1e-6) * (eh - 40), 12);
  fill(0, 0, 80); text('エネルギー E(θ)（横 = −180° 〜 180°）。谷の数：' + countMinima(Q), gx + 12, ey + 22);

  noStroke(); fill(0, 0, 100); textSize(18);
  text('マウス = 端 Q　A：自動 ' + (auto ? 'ON' : 'off') + '　T：黄色い領域　C：軌跡を消す　↑↓：自然長 l0 = ' + nf(l0, 1, 2) + '　パチン ' + snaps + ' 回', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('Q を黄色い領域の中で動かしても円板は大きく動かない。領域の左右のへりをこえた瞬間、谷が消えて円板がパチンと回る。とがった先（カスプ）の下を通ると、なめらかに回る', 20, 68);
}

function keyPressed() {
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 't' || key === 'T') showRegion = !showRegion;
  if (key === 'c' || key === 'C') qTrail = [];
  if (key === UP_ARROW) { l0 = min(1.6, l0 + 0.1); buildRegion(); }
  if (key === DOWN_ARROW) { l0 = max(0.4, l0 - 0.1); buildRegion(); }
}

// ---------- やってみよう ----------
// 1. Q を黄色い領域の左のへりから右のへりへゆっくり動かし、パチンと回る場所を確かめよう。戻るときは？
// 2. 黄色い領域のとがった先より下（遠く）を通ると、パチンとならない。なぜ？（04 のループが消える a > 0 と同じ）
// 3. dA を 2.5 にしたり、l0 を変えたりすると、カスプの位置と大きさはどう変わる？
// 4. 本物をつくろう：厚紙の円板・画びょう・輪ゴム 2 本でできる（ジーマン 1972）
