// ============================================
// 11 カルマンフィルタで追跡
// ノイズだらけの観測（×印）から、ボールの本当の位置と速度を推定する
//   予測：x ← F x（等速で進むはず）、P ← F P Fᵀ + Q（不確かさは増える）
//   更新：K = P Hᵀ (H P Hᵀ + R)⁻¹、x ← x + K (z − H x)、P ← (I − K H) P（観測で不確かさが減る）
// ↑↓ = 観測ノイズ R / ←→ = プロセスノイズ Q / スペース = 観測を止める（ボールが隠れた状態）/ R = リセット
// ============================================

let ball;                    // 本当の状態 {x, y, vx, vy}
let measSigma = 25;          // ★ 観測ノイズの標準偏差（px）
let procSigma = 0.3;         // ★ プロセスノイズ（モデルからのずれ）
let xs, P;                   // 推定 [x, y, vx, vy] と共分散 4×4
let z = null;                // 観測
let blind = false;
let trailTrue = [], trailEst = [], trailZ = [];
let gainMag = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  resetAll();
}
function resetAll() {
  ball = { x: width * 0.2, y: height * 0.5, vx: 3, vy: -1.5 };
  xs = [width / 2, height / 2, 0, 0];
  P = matScaled(eye4(), 10000);     // 最初は何もわからない
  trailTrue = []; trailEst = []; trailZ = [];
}

// ★ 予測ステップ
function kfPredict() {
  let F = [[1, 0, 1, 0], [0, 1, 0, 1], [0, 0, 1, 0], [0, 0, 0, 1]];
  let q = procSigma * procSigma;
  let Q = [[q / 4, 0, q / 2, 0], [0, q / 4, 0, q / 2], [q / 2, 0, q, 0], [0, q / 2, 0, q]];
  xs = matVec(F, xs);
  P = matAdd(matMul(matMul(F, P), matT(F)), Q);
}
// ★ 更新ステップ（観測 z = [x, y]）
function kfUpdate(zx, zy) {
  let H = [[1, 0, 0, 0], [0, 1, 0, 0]];
  let R = [[measSigma * measSigma, 0], [0, measSigma * measSigma]];
  let S = matAdd(matMul(matMul(H, P), matT(H)), R);         // 2×2
  let K = matMul(matMul(P, matT(H)), inv2(S));                // 4×2
  let y = [zx - xs[0], zy - xs[1]];
  let Ky = matVec(K, y);
  for (let i = 0; i < 4; i++) xs[i] += Ky[i];
  P = matMul(matSub(eye4(), matMul(K, H)), P);
  gainMag = K[0][0];
}

function draw() {
  background(215, 35, 12);
  // 本当のボール：等速＋わずかな揺らぎ、壁で跳ね返る
  ball.vx += randomGaussian() * 0.05; ball.vy += randomGaussian() * 0.05;
  ball.x += ball.vx; ball.y += ball.vy;
  if (ball.x < 30 || ball.x > width - 30) ball.vx *= -1;
  if (ball.y < 120 || ball.y > height - 30) ball.vy *= -1;
  ball.x = constrain(ball.x, 30, width - 30); ball.y = constrain(ball.y, 120, height - 30);

  kfPredict();
  if (!blind) { z = { x: ball.x + randomGaussian() * measSigma, y: ball.y + randomGaussian() * measSigma }; kfUpdate(z.x, z.y); }
  else z = null;

  trailTrue.push({ x: ball.x, y: ball.y }); trailEst.push({ x: xs[0], y: xs[1] });
  if (z) trailZ.push(z);
  if (trailTrue.length > 400) { trailTrue.shift(); trailEst.shift(); }
  if (trailZ.length > 120) trailZ.shift();

  // 観測
  stroke(0, 80, 100, 50); strokeWeight(1);
  for (let p of trailZ) { line(p.x - 4, p.y - 4, p.x + 4, p.y + 4); line(p.x - 4, p.y + 4, p.x + 4, p.y - 4); }
  // 軌跡
  noFill(); strokeWeight(2);
  stroke(170, 60, 100, 60); beginShape(); for (let p of trailTrue) vertex(p.x, p.y); endShape();
  stroke(45, 90, 100, 90); beginShape(); for (let p of trailEst) vertex(p.x, p.y); endShape();
  // 不確かさの楕円（P の位置ブロック 2×2 の固有ベクトル・固有値）
  drawEllipse(xs[0], xs[1], P[0][0], P[0][1], P[1][1]);
  // ボールと推定
  noStroke(); fill(170, 60, 100); circle(ball.x, ball.y, 18);
  noFill(); stroke(45, 90, 100); strokeWeight(3); circle(xs[0], xs[1], 22);
  stroke(45, 90, 100, 70); line(xs[0], xs[1], xs[0] + xs[2] * 12, xs[1] + xs[3] * 12);   // 推定速度

  let err = sqrt(sq(xs[0] - ball.x) + sq(xs[1] - ball.y));
  noStroke(); fill(0, 0, 100); textSize(18);
  text('観測ノイズ σ = ' + measSigma + '（↑↓）　プロセスノイズ q = ' + nf(procSigma, 1, 2) + '（←→）　スペース：観測 ' + (blind ? 'なし（隠れている）' : 'あり') + '　R：リセット　推定の誤差 ' + nf(err, 1, 1) + ' px　ゲイン K = ' + nf(gainMag, 1, 2), 20, 40);
  fill(0, 0, 60); textSize(15);
  text('水色 = 本当のボール　赤 × = ノイズつき観測　黄 = 推定（輪 = 不確かさ 2σ の楕円、線 = 推定した速度）。観測を止めると楕円が膨らむ', 20, 68);
  let px = width - 400, py = 110;
  fill(0, 0, 100, 8); rect(px - 16, py - 30, 390, 96, 10);
  fill(45, 90, 100); textSize(14);
  text('予測　x = F x,  P = F P Fᵀ + Q', px, py);
  text('更新　K = P Hᵀ (H P Hᵀ + R)⁻¹', px, py + 22);
  text('　　　x += K (z − H x),  P = (I − K H) P', px, py + 44);
  fill(0, 0, 60); textSize(13);
  text('K ≈ 1：観測を信じる　K ≈ 0：予測を信じる', px, py + 64);
}

// 2×2 対称行列 [[a, b], [b, c]] の固有分解で楕円を描く
function drawEllipse(cx, cy, a, b, c) {
  let tr = a + c, det = a * c - b * b;
  let disc = sqrt(max(0, tr * tr / 4 - det));
  let l1 = tr / 2 + disc, l2 = max(tr / 2 - disc, 0.01);
  let th = abs(b) < 1e-9 ? 0 : atan2(l1 - a, b);
  push(); translate(cx, cy); rotate(th);
  noFill(); stroke(45, 90, 100, 60); strokeWeight(1.5);
  ellipse(0, 0, 4 * sqrt(l1), 4 * sqrt(l2));
  pop();
}

function keyPressed() {
  if (key === UP_ARROW) measSigma = min(150, measSigma + 5);
  if (key === DOWN_ARROW) measSigma = max(2, measSigma - 5);
  if (key === RIGHT_ARROW) procSigma = min(3, procSigma * 1.5);
  if (key === LEFT_ARROW) procSigma = max(0.02, procSigma / 1.5);
  if (key === ' ') blind = !blind;
  if (key === 'r' || key === 'R') resetAll();
}

// ---------- やってみよう ----------
// 1. σ を 100 にしても推定はボールに近い。観測 1 個では無理なのに、なぜ？（過去の観測を速度ごと平均している）
// 2. q を小さくすると推定はなめらかだが、壁で跳ね返ったとき追いつくのが遅い。q と σ の役割のちがい
// 3. スペースで観測を止めて 2 秒待つ。推定はまっすぐ進む（等速モデル）。壁は知らないのでつき抜ける
// 4. モデルを「等加速度」（状態 6 つ）にすると F と Q はどうなる？

// ==================================================
// ここから下は「行列の道具」（4×4 と 2×2 の小さな行列計算）
// ==================================================
function eye4() { return [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]; }
function matScaled(A, s) { return A.map((r) => r.map((v) => v * s)); }
function matT(A) { return A[0].map((_, j) => A.map((r) => r[j])); }
function matAdd(A, B) { return A.map((r, i) => r.map((v, j) => v + B[i][j])); }
function matSub(A, B) { return A.map((r, i) => r.map((v, j) => v - B[i][j])); }
function matMul(A, B) {
  return A.map((r) => B[0].map((_, j) => r.reduce((s, v, k) => s + v * B[k][j], 0)));
}
function matVec(A, v) { return A.map((r) => r.reduce((s, a, k) => s + a * v[k], 0)); }
function inv2(M) {
  let d = M[0][0] * M[1][1] - M[0][1] * M[1][0];
  if (abs(d) < 1e-12) d = 1e-12;
  return [[M[1][1] / d, -M[0][1] / d], [-M[1][0] / d, M[0][0] / d]];
}
