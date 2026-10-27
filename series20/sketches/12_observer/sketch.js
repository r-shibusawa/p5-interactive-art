// ============================================
// 12 オブザーバーとカルマンフィルタ
// 測れるのは「ノイズまじりの位置」だけ。速度を知りたい
//   素直に差分すると、ノイズが何十倍にもなる
//   オブザーバー：モデルで予測して、測定とのずれで修正する（x̂' = A x̂ + B u + L (z − C x̂)）
//   カルマンフィルタ：そのゲイン L を「ノイズの大きさ」から最適に決める
// 上下キー = ノイズの大きさ / 左右キー = オブザーバーの速さ ωo / K = カルマンフィルタに切替 / クリック = 押す
// ============================================

let sigma = 0.2; // ★ 測定ノイズの標準偏差
let wo = 5; // ★ オブザーバーの極（−ωo の重根）。大きいほど速く追うがノイズに弱い
let useKalman = false;
let q = 0.5; // ★ カルマンフィルタが想定する「モデルのあいまいさ」
let c = 0.5; // 摩擦

let p = 0, v = 0, t = 0, u = 0, push_ = 0;
let z = 0, zPrev = 0, vDiff = 0;
let pHat = 0, vHat = 0;
let P = [[1, 0], [0, 1]], Kg = [0, 0]; // カルマンフィルタの共分散とゲイン
let HIST = 600, dt = 1 / 60;
let hP = [], hZ = [], hPh = [], hV = [], hVd = [], hVh = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(230, 30, 10);
  t += dt;
  // ---- 本当の台車（入力は正弦波 + クリックの押し）
  u = 3 * sin(0.8 * t) + push_;
  push_ *= 0.9;
  v += (u - c * v) * dt;
  p += v * dt;
  p = constrain(p, -10, 10); v = constrain(v, -20, 20);
  // ---- 測定：位置にノイズ
  zPrev = z;
  z = p + randomGaussian() * sigma;
  vDiff = (z - zPrev) / dt; // 素直な差分

  // ---- 推定
  let A = [[0, 1], [0, -c]];
  if (!useKalman) {
    // ★ ルーエンバーガー・オブザーバー：極を −ωo（重根）に置く L
    let l1 = 2 * wo - c, l2 = wo * wo - l1 * c;
    let err = z - pHat;
    pHat += (vHat + l1 * err) * dt;
    vHat += (u - c * vHat + l2 * err) * dt;
    Kg = [l1 * dt, l2 * dt];
  } else {
    // ★ カルマンフィルタ（離散）：予測 → 共分散を更新 → ゲイン → 修正
    let F = [[1, dt], [0, 1 - c * dt]];
    pHat = pHat + vHat * dt;
    vHat = vHat + (u - c * vHat) * dt;
    let FP = m2mul(F, P);
    P = m2add(m2mul(FP, m2T(F)), [[q * dt * dt * dt / 3, q * dt * dt / 2], [q * dt * dt / 2, q * dt]]);
    let S = P[0][0] + sigma * sigma + 1e-9;
    Kg = [P[0][0] / S, P[1][0] / S];
    let err = z - pHat;
    pHat += Kg[0] * err; vHat += Kg[1] * err;
    P = [[(1 - Kg[0]) * P[0][0], (1 - Kg[0]) * P[0][1]], [P[1][0] - Kg[1] * P[0][0], P[1][1] - Kg[1] * P[0][1]]];
  }
  pHat = constrain(pHat, -20, 20); vHat = constrain(vHat, -50, 50);
  pushHist(hP, p); pushHist(hZ, z); pushHist(hPh, pHat); pushHist(hV, v); pushHist(hVd, vDiff); pushHist(hVh, vHat);

  // ---- 台車 3 台（本当・測定・推定）
  let rx0 = width * 0.05, rx1 = width * 0.47, X = (xw) => map(xw, -6, 6, rx0, rx1);
  let rows = [[p, '本当の位置', 30, 1], [z, '測定（ノイズ）', 0, 0.5], [pHat, '推定', 200, 1]];
  for (let i = 0; i < 3; i++) {
    let ry = height * 0.28 + i * height * 0.17, [val, label, hue, alpha] = rows[i];
    stroke(0, 0, 40); strokeWeight(2); line(rx0, ry + 20, rx1, ry + 20);
    let cx = X(constrain(val, -6, 6));
    if (i === 2) { stroke(hue, 70, 100); strokeWeight(3); noFill(); rect(cx - 30, ry - 16, 60, 36, 6); }
    else { noStroke(); fill(hue, i === 1 ? 0 : 80, 100, alpha * 100); rect(cx - 30, ry - 16, 60, 36, 6); }
    noStroke(); fill(hue, i === 1 ? 0 : 70, 100); textSize(14); text(label + '　' + nf(val, 1, 2), rx0, ry - 26);
  }
  // 速度の矢印（本当と推定）
  let ry = height * 0.28;
  stroke(30, 80, 100); strokeWeight(4); line(X(p), ry + 40, X(p) + v * 10, ry + 40);
  stroke(200, 70, 100); line(X(pHat), height * 0.28 + 2 * height * 0.17 + 40, X(pHat) + vHat * 10, height * 0.28 + 2 * height * 0.17 + 40);

  // ---- グラフ
  let gx = width * 0.52, gw = width * 0.44;
  drawPlot(gx, height * 0.16, gw, height * 0.3, [{ data: hZ, hue: 0, sat: 0, name: '測定 z', weight: 1 }, { data: hP, hue: 30, name: '本当' }, { data: hPh, hue: 200, name: '推定' }], -7, 7, '位置');
  drawPlot(gx, height * 0.5, gw, height * 0.3, [{ data: hVd, hue: 0, sat: 0, name: '差分', weight: 1 }, { data: hV, hue: 30, name: '本当' }, { data: hVh, hue: 200, name: '推定' }], -8, 8, '速度（測っていないのに推定できる）');

  let vErr = 0;
  for (let i = 0; i < hV.length; i++) vErr += sq(hV[i] - hVh[i]);
  vErr = sqrt(vErr / max(hV.length, 1));
  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text((useKalman ? 'カルマンフィルタ' : 'オブザーバー ωo = ' + nf(wo, 1, 1) + '（左右キー）') + '　ノイズ σ = ' + nf(sigma, 1, 2) + '（上下キー）　K で切替　クリックで押す　速度の誤差 RMS ' + nf(vErr, 1, 2), 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('差分 (z − z前)/dt はノイズが dt で割られて暴れる。オブザーバーは「モデルの予測」を信じ、測定とのずれだけで少しずつ直す。ゲイン = [' + nf(Kg[0], 1, 3) + ', ' + nf(Kg[1], 1, 3) + ']', 20, 68);
  text(useKalman ? 'カルマンフィルタ：ノイズ σ が大きいほど測定を信じない（ゲインが小さくなる）。σ を変えてゲインの数字を見よう' : 'ωo を上げると追いつきは速いがノイズも拾う。下げるとなめらかだが遅れる。この「さじ加減」を自動で決めるのがカルマンフィルタ（K）', 20, height - 30);
}

function mousePressed() { push_ = mouseX > width * 0.26 ? 30 : -30; }
function keyPressed() {
  if (key === UP_ARROW) sigma = min(sigma + 0.05, 1);
  if (key === DOWN_ARROW) sigma = max(sigma - 0.05, 0);
  if (key === RIGHT_ARROW) wo = min(wo + 1, 40);
  if (key === LEFT_ARROW) wo = max(wo - 1, 1);
  if (key === 'k' || key === 'K') { useKalman = !useKalman; P = [[1, 0], [0, 1]]; }
}

// ---------- やってみよう ----------
// 1. σ = 0.5 にして、差分の速度（灰）と推定（青）を比べる。推定はなぜ使えるレベルなのか
// 2. ωo を 1 にする：なめらかだが遅れる。30 にする：ノイズを拾う。ちょうどいいのは？
// 3. K でカルマンに切替、σ を 0 → 1 と変えてゲインの変化を見る。q（モデルのあいまいさ）を 10 にすると？
// 4. 本当の摩擦 c を 1.0 にしてモデル（A）は 0.5 のまま → モデルのずれがあると推定はどうなる？


// ==================================================
// ここから下は「2×2 行列とグラフの道具」です
// ==================================================
function m2mul(P, Q) { return [[P[0][0] * Q[0][0] + P[0][1] * Q[1][0], P[0][0] * Q[0][1] + P[0][1] * Q[1][1]], [P[1][0] * Q[0][0] + P[1][1] * Q[1][0], P[1][0] * Q[0][1] + P[1][1] * Q[1][1]]]; }
function m2add(P, Q) { return [[P[0][0] + Q[0][0], P[0][1] + Q[0][1]], [P[1][0] + Q[1][0], P[1][1] + Q[1][1]]]; }
function m2T(P) { return [[P[0][0], P[1][0]], [P[0][1], P[1][1]]]; }
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
