// ============================================
// 10 状態空間と極配置
// 位置と速度をまとめて「状態 x = [x1, x2]」にすると、システムは x' = A x + B u
//   フィードバック u = −K x をかけると閉ループは x' = (A − BK) x
//   好きな極を指定して K を逆算する = 極配置（アッカーマンの公式）
// 1〜4 = 配置する極 / 0 = フィードバックなし / クリック = 初期状態（位相面）
// ============================================

let k = 1.0, c = 0.2; // ★ バネ定数と摩擦（弱い減衰のバネ・マス系）
let A = [[0, 1], [-k, -c]], B = [0, 1];
let presets = [ // ★ 配置したい極
  { name: 'なし（K = 0）', poles: null },
  { name: '−1, −1（ゆっくり）', poles: [[-1, 0], [-1, 0]] },
  { name: '−3, −3（速い）', poles: [[-3, 0], [-3, 0]] },
  { name: '−1 ± 2j（少しゆれる）', poles: [[-1, 2], [-1, -2]] },
  { name: '−0.3 ± 3j（よくゆれる）', poles: [[-0.3, 3], [-0.3, -3]] },
];
let preset = 2;
let Kf = [0, 0];
let x1 = 2.5, x2 = 0, u = 0;
let trail = [];
let HIST = 600, dt = 1 / 60;
let h1 = [], h2 = [], hU = [];
let ppx, ppy, ppw, pph, r1 = 3, r2 = 4;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  placePoles();
}

function placePoles() {
  let p = presets[preset].poles;
  if (!p) { Kf = [0, 0]; return; }
  // 望む特性多項式 s² + α1 s + α0
  let a1 = -(p[0][0] + p[1][0]), a0 = p[0][0] * p[1][0] - p[0][1] * p[1][1];
  // ★ アッカーマン：K = [0 1] · [B AB]⁻¹ · (A² + α1 A + α0 I)
  let AB = m2vec(A, B);
  let Wc = [[B[0], AB[0]], [B[1], AB[1]]];
  let phi = m2add(m2add(m2mul(A, A), m2scale(A, a1)), m2scale([[1, 0], [0, 1]], a0));
  let row = m2mul(m2inv(Wc), phi)[1];
  Kf = [row[0], row[1]];
}

function draw() {
  background(230, 30, 10);
  ppx = width * 0.05; ppy = height * 0.16; ppw = width * 0.42; pph = height * 0.7;
  // ★ 状態フィードバック u = −K x
  u = constrain(-(Kf[0] * x1 + Kf[1] * x2), -30, 30);
  for (let s = 0; s < 4; s++) {
    let d1 = A[0][0] * x1 + A[0][1] * x2 + B[0] * u;
    let d2 = A[1][0] * x1 + A[1][1] * x2 + B[1] * u;
    x1 += d1 * dt / 4; x2 += d2 * dt / 4;
  }
  x1 = constrain(x1, -10, 10); x2 = constrain(x2, -20, 20);
  trail.push([x1, x2]); if (trail.length > 900) trail.shift();
  pushHist(h1, x1); pushHist(h2, x2); pushHist(hU, u);

  // ---- 位相面（x1 横、x2 縦）
  noStroke(); fill(0, 0, 14); rect(ppx, ppy, ppw, pph, 6);
  stroke(0, 0, 30); strokeWeight(1);
  line(px(0), ppy, px(0), ppy + pph); line(ppx, py(0), ppx + ppw, py(0));
  // ベクトル場（閉ループの x' の向き）
  stroke(200, 40, 60); strokeWeight(1);
  for (let i = -r1; i <= r1; i += 0.5) for (let j = -r2; j <= r2; j += 0.8) {
    let uu = constrain(-(Kf[0] * i + Kf[1] * j), -30, 30);
    let d1 = A[0][1] * j, d2 = A[1][0] * i + A[1][1] * j + uu;
    let L = sqrt(d1 * d1 + d2 * d2) + 1e-9;
    line(px(i), py(j), px(i) + d1 / L * 10, py(j) - d2 / L * 10);
  }
  // 軌跡
  noFill(); strokeWeight(2);
  beginShape();
  for (let i = 0; i < trail.length; i++) { stroke(30, 80, 100, map(i, 0, trail.length, 10, 100)); vertex(px(trail[i][0]), py(trail[i][1])); }
  endShape();
  noStroke(); fill(30, 80, 100); circle(px(x1), py(x2), 14);
  fill(0, 0, 70); textSize(13);
  text('位相面：横 = 位置 x1、縦 = 速度 x2　（クリックで初期状態）　矢印 = 閉ループの流れ', ppx + 8, ppy + 18);
  // おもりの絵（上の帯）
  let ry = height * 0.11;
  stroke(0, 0, 40); strokeWeight(2); line(ppx, ry + 14, ppx + ppw, ry + 14);
  stroke(200, 60, 100); strokeWeight(2); line(px(0), ry - 14, px(0), ry + 14);
  noStroke(); fill(30, 80, 100); rect(px(x1) - 16, ry - 12, 32, 24, 4);

  // ---- 時間グラフ
  let gx = width * 0.52, gw = width * 0.44;
  drawPlot(gx, height * 0.16, gw, height * 0.32, [{ data: h1, hue: 30, name: '位置 x1' }, { data: h2, hue: 200, name: '速度 x2' }], -4, 4, '状態');
  drawPlot(gx, height * 0.53, gw, height * 0.22, [{ data: hU, hue: 120, name: 'u = −Kx' }], -15, 15, '入力');

  // 閉ループの極を確認（2×2 なら手計算：tr と det）
  let M = [[A[0][0] - B[0] * Kf[0], A[0][1] - B[0] * Kf[1]], [A[1][0] - B[1] * Kf[0], A[1][1] - B[1] * Kf[1]]];
  let tr = M[0][0] + M[1][1], det = M[0][0] * M[1][1] - M[0][1] * M[1][0];
  let disc = tr * tr - 4 * det;
  let polesTxt = disc >= 0 ? nf((tr + sqrt(disc)) / 2, 1, 2) + ', ' + nf((tr - sqrt(disc)) / 2, 1, 2) : nf(tr / 2, 1, 2) + ' ± ' + nf(sqrt(-disc) / 2, 1, 2) + 'j';
  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text('極：' + presets[preset].name + '（0〜4）　K = [' + nf(Kf[0], 1, 2) + ', ' + nf(Kf[1], 1, 2) + ']　閉ループの極（A − BK の固有値）= ' + polesTxt, 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('x\' = Ax + Bu,  A = [[0, 1], [−k, −c]],  B = [0, 1]。u = −K x = −(k1·位置 + k2·速度)：k1 はバネを強く、k2 は摩擦を強くするのと同じ', 20, 68);
  text('位相面では、安定な極 → 原点に吸い込まれる。実数極なら直線的に、複素極ならうずを巻いて。極を遠くに置くほど速いが u が大きい', gx, height * 0.8);
  text('極配置は「どんな性格にしたいか」を先に決めて K を逆算する。1 〜 4 で K がどう変わるか見よう', gx, height * 0.8 + 24);
}

function px(v) { return map(v, -r1, r1, ppx, ppx + ppw); }
function py(v) { return map(v, -r2, r2, ppy + pph, ppy); }

function mousePressed() {
  if (mouseX > ppx && mouseX < ppx + ppw && mouseY > ppy && mouseY < ppy + pph) {
    x1 = map(mouseX, ppx, ppx + ppw, -r1, r1); x2 = map(mouseY, ppy + pph, ppy, -r2, r2); trail = [];
  }
}
function keyPressed() {
  if (key >= '0' && key <= '4') { preset = int(key); placePoles(); }
}

// ---------- やってみよう ----------
// 1. 0（フィードバックなし）で初期状態を置く。うずを巻いてゆっくり原点へ（極 −0.1 ± 1j）
// 2. 2（−3, −3）と 4（−0.3 ± 3j）で同じ初期状態から。軌跡の形と u の大きさを比べる
// 3. presets に自分の極を追加（例：−5 ± 5j）。K はどれだけ大きくなる？ u の上限 30 に当たる？
// 4. 極を右半面（+0.5）に置いてみる → 原点から離れていく。K の符号はどうなっている？


// ==================================================
// ここから下は「2×2 行列とグラフの道具」です
// ==================================================
function m2mul(P, Q) { return [[P[0][0] * Q[0][0] + P[0][1] * Q[1][0], P[0][0] * Q[0][1] + P[0][1] * Q[1][1]], [P[1][0] * Q[0][0] + P[1][1] * Q[1][0], P[1][0] * Q[0][1] + P[1][1] * Q[1][1]]]; }
function m2add(P, Q) { return [[P[0][0] + Q[0][0], P[0][1] + Q[0][1]], [P[1][0] + Q[1][0], P[1][1] + Q[1][1]]]; }
function m2scale(P, s) { return [[P[0][0] * s, P[0][1] * s], [P[1][0] * s, P[1][1] * s]]; }
function m2vec(P, v) { return [P[0][0] * v[0] + P[0][1] * v[1], P[1][0] * v[0] + P[1][1] * v[1]]; }
function m2inv(P) { let d = P[0][0] * P[1][1] - P[0][1] * P[1][0]; return [[P[1][1] / d, -P[0][1] / d], [-P[1][0] / d, P[0][0] / d]]; }
function pushHist(arr, v) {
  arr.push(isFinite(v) ? v : 0);
  if (arr.length > HIST) arr.shift();
}
// 時間プロット：枠 (x, y, w, h) に series = [{data, hue, name}] を描く（縦の範囲 lo〜hi）
function drawPlot(x, y, w, h, series, lo, hi, title) {
  noStroke(); fill(0, 0, 14); rect(x, y, w, h, 6);
  stroke(0, 0, 30); strokeWeight(1);
  let y0 = map(0, lo, hi, y + h, y);
  if (y0 > y && y0 < y + h) line(x, y0, x + w, y0);
  for (let s of series) {
    stroke(s.hue, s.sat === undefined ? 70 : s.sat, 100); strokeWeight(s.weight || 2); noFill();
    beginShape();
    for (let i = 0; i < s.data.length; i++) vertex(map(i, 0, HIST - 1, x, x + w), map(constrain(s.data[i], lo, hi), lo, hi, y + h, y));
    endShape();
  }
  noStroke(); fill(0, 0, 70); textSize(13); textAlign(LEFT, TOP);
  text(title, x + 8, y + 6);
  let lx = x + w - 8; textAlign(RIGHT, TOP);
  for (let s of series) { fill(s.hue, s.sat === undefined ? 70 : s.sat, 100); text(s.name, lx, y + 6); lx -= textWidth(s.name) + 14; }
  textAlign(LEFT, BASELINE);
}
