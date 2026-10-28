// ============================================
// 12 微分方程式と不動点（ピカールの逐次近似）
// y' = f(t, y)、y(0) = y₀ の解は、「関数を関数に写す写像」Φ(y)(t) = y₀ + ∫₀ᵗ f(s, y(s)) ds の不動点
//   定数 y₀ から始めて Φ を何度もかけると、曲線が 1 本ずつ本当の解（白い点線）に近づく。これが解の存在と一意性の証明（ピカール＝リンデレーフ）
// スペース = Φ をもう 1 回 / A = 自動 / 1〜4 = 方程式 / ↑↓ = 区間の長さ T / グラフをクリック = 初期値 y₀ / R = 最初から
// ============================================

let EQS = [
  { name: "y' = y", f: (t, y) => y, y0: 1, T: 2, ylo: -0.5, yhi: 8, note: 'y_k は eᵗ のテイラー展開\n1 + t + t²/2! + … + tᵏ/k! そのもの' },
  { name: "y' = t − y²", f: (t, y) => t - y * y, y0: 0, T: 3, ylo: -1, yhi: 3, note: '式では解けない方程式でも、\n積分をくり返すだけで解に近づく' },
  { name: "y' = y²", f: (t, y) => y * y, y0: 1, T: 0.9, ylo: -0.5, yhi: 12, note: '本当の解 1/(1 − t) は t = 1 で無限大。\nT を 1 より長くすると近似は収束しない' },
  { name: "y' = −2t·y", f: (t, y) => -2 * t * y, y0: 1, T: 2.5, ylo: -1.5, yhi: 1.5, note: '解は e^(−t²)。T が長いと正しくなるまで\n何回もかかる（大きく振れてから落ち着く）' },
];
let ei = 0;
let M = 400;               // ★ 区間を何点で表すか
let iters = [];            // y_0, y_1, …（それぞれ M+1 個の値）
let exact = [];
let auto = true;
let y0, T;
let gx, gy, W, H;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  gx = 70; gy = 110; W = width * 0.52; H = height - 200;
  pick(0);
}
function E() { return EQS[ei]; }
function pick(i) { ei = i; y0 = E().y0; T = E().T; restart(); }
function restart() {
  iters = [new Array(M + 1).fill(y0)];
  // 本当の解（ルンゲ＝クッタ法で細かく）
  exact = [y0];
  let y = y0, h = T / M / 10;
  for (let i = 0; i < M; i++) {
    for (let s = 0; s < 10; s++) {
      let t = (i * 10 + s) * h;
      let k1 = E().f(t, y), k2 = E().f(t + h / 2, y + h / 2 * k1), k3 = E().f(t + h / 2, y + h / 2 * k2), k4 = E().f(t + h, y + h * k3);
      y = constrain(y + h / 6 * (k1 + 2 * k2 + 2 * k3 + k4), -1e6, 1e6);
    }
    exact.push(y);
  }
}
// ★ ピカール写像 Φ：y₀ + （f(s, y(s)) の積分を台形でたし合わせる）
function picard(yk) {
  let out = [y0], acc = 0, h = T / M;
  for (let i = 1; i <= M; i++) {
    let t0 = (i - 1) * h, t1 = i * h;
    acc += h * (E().f(t0, yk[i - 1]) + E().f(t1, yk[i])) / 2;
    out.push(constrain(y0 + acc, -1e6, 1e6));
  }
  return out;
}
function nextIter() { if (iters.length < 30) iters.push(picard(iters[iters.length - 1])); }
function supDiff(a, b) { let m = 0; for (let i = 0; i <= M; i++) m = max(m, abs(a[i] - b[i])); return m; }

function X(i) { return gx + i / M * W; }
function Y(y) { return constrain(gy + H - (y - E().ylo) / (E().yhi - E().ylo) * H, gy - 5, gy + H + 5); }

function draw() {
  background(230, 30, 11);
  if (auto && frameCount % 50 === 0) nextIter();
  noFill(); stroke(0, 0, 35); strokeWeight(1); rect(gx, gy, W, H);
  stroke(0, 0, 45); line(gx, Y(0), gx + W, Y(0));
  // これまでの近似
  for (let k = 0; k < iters.length; k++) {
    let last = k === iters.length - 1;
    stroke((200 + k * 22) % 360, 60, 100, last ? 100 : 45); strokeWeight(last ? 3 : 1.5);
    beginShape(); for (let i = 0; i <= M; i += 2) vertex(X(i), Y(iters[k][i])); endShape();
  }
  // 本当の解
  stroke(0, 0, 100); strokeWeight(2); drawingContext.setLineDash([5, 7]);
  beginShape(); for (let i = 0; i <= M; i += 2) vertex(X(i), Y(exact[i])); endShape();
  drawingContext.setLineDash([]);
  noStroke(); fill(0, 0, 100); circle(X(0), Y(y0), 10);
  fill(0, 0, 60); textSize(13);
  text('t = 0', gx - 10, gy + H + 20); text('t = ' + nf(T, 1, 2), gx + W - 30, gy + H + 20);
  text('y = ' + E().yhi, gx - 60, gy + 6); text('y = ' + E().ylo, gx - 60, gy + H);
  if (E().name === "y' = y²" && T > 1) { let i1 = round(M / T); stroke(0, 80, 100, 60); line(X(i1), gy, X(i1), gy + H); }

  // 右：差の大きさ（対数）
  let px = gx + W + 50, pw = width - px - 30, ph = H * 0.5;
  noFill(); stroke(0, 0, 35); rect(px, gy, pw, ph);
  let ly = (v) => map(constrain(Math.log10(max(v, 1e-12)), -12, 4), 4, -12, gy, gy + ph);
  let bw = pw / 30;
  noStroke();
  for (let k = 1; k < iters.length; k++) {
    let d = supDiff(iters[k], iters[k - 1]), e = supDiff(iters[k], exact);
    fill((200 + k * 22) % 360, 60, 100); rect(px + (k - 1) * bw + 1, ly(d), bw * 0.45, gy + ph - ly(d));
    fill(0, 0, 100, 50); rect(px + (k - 1) * bw + bw * 0.5, ly(e), bw * 0.4, gy + ph - ly(e));
  }
  fill(0, 0, 70); textSize(14);
  text('色の棒：となり同士の差 ‖y_k − y_{k−1}‖', px, gy - 26);
  text('白い棒：本当の解との差 ‖y_k − y‖（縦は対数）', px, gy - 8);
  for (let e = 4; e >= -12; e -= 4) text('1e' + e, px - 40, ly(Math.pow(10, e)) + 4);
  let ty = gy + ph + 40;
  fill(0, 0, 100); textSize(16);
  text('k = ' + (iters.length - 1) + '　y_k(T) = ' + nf(iters[iters.length - 1][M], 1, 6) + '　本当の値 ' + nf(exact[M], 1, 6), px, ty);
  fill(0, 0, 80); textSize(15);
  let lines = [
    E().note.split('\n')[0], E().note.split('\n')[1] || '',
    '',
    'なぜ近づく？ f が y についてリプシッツ',
    '（|f(t,y) − f(t,z)| ≤ L|y − z|）なら',
    '　‖Φᵏ(y) − Φᵏ(z)‖ ≤ (LT)ᵏ / k! · ‖y − z‖',
    'k! はどんな累乗よりも速く大きくなる',
    '→ いつかは縮小写像（02）→ 解がただ 1 つ',
    '',
    "y' = y² のように f が急に大きくなると、",
    'L が全体でとれず、解が途中で無限大に飛ぶ',
  ];
  for (let i = 0; i < lines.length; i++) text(lines[i], px, ty + 32 + i * 24);

  noStroke(); fill(0, 0, 100); textSize(18);
  text((ei + 1) + '：' + E().name + '、y(0) = ' + nf(y0, 1, 2) + '　スペース：Φ をかける　A：自動 ' + (auto ? 'ON' : 'off') + '　1〜4：方程式　T = ' + nf(T, 1, 2) + '（↑↓）　クリック：y₀　R：最初から', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('y_{k+1}(t) = y₀ + ∫₀ᵗ f(s, y_k(s)) ds。1 回ごとに「正しい部分」が左から右へ伸びていく', 20, 68);
}

function mousePressed() {
  if (mouseX > gx && mouseX < gx + W && mouseY > gy && mouseY < gy + H) {
    y0 = map(mouseY, gy + H, gy, E().ylo, E().yhi);
    if (ei === 2) y0 = constrain(y0, -3, 3);
    restart();
  }
}
function keyPressed() {
  if (key >= '1' && key <= '4') pick(int(key) - 1);
  if (key === ' ') { auto = false; nextIter(); }
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === UP_ARROW) { T = min(6, T + 0.1); restart(); }
  if (key === DOWN_ARROW) { T = max(0.2, T - 0.1); restart(); }
  if (key === 'r' || key === 'R') restart();
}

// ---------- やってみよう ----------
// 1. 方程式 1 で y_3 を手で計算しよう：y_1 = 1 + t、y_2 = 1 + t + t²/2、y_3 = ？ グラフと比べる
// 2. 方程式 3 で T を 0.9 → 1.3 にすると、白い点線（本当の解）はどうなる？ 近似の曲線は？
// 3. 方程式 4 で T = 2.5 と T = 1 で、白い棒が 1e-6 を切るまでの回数を比べよう（(LT)ᵏ/k! の LT が効く）
// 4. EQS に y' = sin(y) + t などを足してみよう。ylo, yhi も合わせて変える
