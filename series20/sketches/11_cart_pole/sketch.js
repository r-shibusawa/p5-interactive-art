// ============================================
// 11 倒立振子（台車で棒を立てる）
// 手のひらでほうきを立てるのと同じ。倒れそうな向きに台車を動かして支える
//   状態 x = [台車の位置, 速度, 棒の角度, 角速度]（4 つ）
//   直立まわりで線形化 x' = Ax + Bu → 極配置で K を求め、u = −K x
// クリック = 棒をつつく / 1〜3 = 配置する極 / 上下キー = ゲインの倍率 / R でやり直し
// ============================================

let M = 1.0, m = 0.1, l = 0.5, g = 9.8; // ★ 台車の質量、棒の質量、棒の半分の長さ
let Fmax = 30; // ★ モーターの最大の力
let presets = [ // ★ 配置する極（4 つ）
  { name: 'ゆっくり −1.5, −2, −2.5, −3', poles: [-1.5, -2, -2.5, -3] },
  { name: '標準 −3, −3.5, −4, −4.5', poles: [-3, -3.5, -4, -4.5] },
  { name: '強い −6, −7, −8, −9', poles: [-6, -7, -8, -9] },
];
let preset = 1;
let gainScale = 1.0; // ★ 上下キーで K 全体を何倍にするか（1 以外だと設計とずれる）
let Kf = [0, 0, 0, 0];
let st = [0, 0, 0.1, 0]; // [x, ẋ, θ, θ̇]
let F = 0, fallen = false, pokeTimer = 0, pokeDir = 0;
let HIST = 600, dt = 1 / 60;
let hTh = [], hX = [], hF = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  design();
}

// 直立まわりで線形化して、極配置で K を求める
function design() {
  let { A, B } = linearize((s, u) => cartPoleDeriv(s, u), [0, 0, 0, 0], 0);
  Kf = ackermann(A, B, presets[preset].poles);
}

// ★ 倒立振子の運動方程式（θ = 0 が直立、右に倒れると正）
function cartPoleDeriv(s, u) {
  let [x, xd, th, thd] = s;
  let sn = sin(th), cs = cos(th);
  let tmp = (u + m * l * thd * thd * sn) / (M + m);
  let thdd = (g * sn - cs * tmp) / (l * (4 / 3 - (m * cs * cs) / (M + m)));
  let xdd = tmp - (m * l * thdd * cs) / (M + m);
  return [xd, xdd, thd, thdd];
}

function draw() {
  background(230, 30, 10);
  // ★ 状態フィードバック u = −K x（倒れたら制御をやめる）
  F = fallen ? 0 : constrain(-gainScale * (Kf[0] * st[0] + Kf[1] * st[1] + Kf[2] * st[2] + Kf[3] * st[3]), -Fmax, Fmax);
  for (let k = 0; k < 4; k++) {
    let d = cartPoleDeriv(st, F);
    for (let i = 0; i < 4; i++) st[i] += d[i] * dt / 4;
    if (abs(st[0]) > 4) { st[0] = constrain(st[0], -4, 4); st[1] *= -0.3; } // レールの端で跳ね返る
    st[1] = constrain(st[1], -30, 30); st[3] = constrain(st[3], -40, 40);
  }
  if (abs(st[2]) > 1.0 && !fallen) fallen = true;
  pushHist(hTh, degrees(st[2])); pushHist(hX, st[0]); pushHist(hF, F);

  // ---- 台車と棒
  let railY = height * 0.62, rx0 = width * 0.05, rx1 = width * 0.47;
  let X = (xw) => map(xw, -4, 4, rx0, rx1), L = (rx1 - rx0) / 8 * 2 * l * 2;
  stroke(0, 0, 50); strokeWeight(4); line(rx0, railY + 20, rx1, railY + 20);
  let cx = X(st[0]);
  noStroke(); fill(30, 80, 100); rect(cx - 35, railY - 20, 70, 40, 6);
  fill(0, 0, 30); circle(cx - 20, railY + 16, 16); circle(cx + 20, railY + 16, 16);
  let tipX = cx + L * sin(st[2]), tipY = railY - 20 - L * cos(st[2]);
  stroke(fallen ? 0 : 200, 60, 100); strokeWeight(8); line(cx, railY - 20, tipX, tipY);
  noStroke(); fill(fallen ? 0 : 200, 60, 100); circle(tipX, tipY, 22);
  // 力の矢印
  stroke(120, 80, 100); strokeWeight(5); line(cx, railY, cx + F * 3, railY);
  // つついた印
  if (pokeTimer > 0) { pokeTimer--; noStroke(); fill(45, 90, 100); textSize(28); textAlign(CENTER); text(pokeDir > 0 ? '→ つん' : 'つん ←', tipX, tipY - 30); textAlign(LEFT, BASELINE); }
  noStroke(); fill(0, 0, 100); textSize(14); textAlign(CENTER);
  text('θ = ' + nf(degrees(st[2]), 1, 1) + '°　x = ' + nf(st[0], 1, 2), cx, railY + 50);
  textAlign(LEFT, BASELINE);
  if (fallen) { fill(0, 80, 100); textSize(32); text('倒れた！　R でやり直し', rx0 + 20, height * 0.25); }

  // ---- グラフ
  let gx = width * 0.52, gw = width * 0.44;
  drawPlot(gx, height * 0.16, gw, height * 0.24, [{ data: hTh, hue: 200, name: '角度 θ [deg]' }], -30, 30, '棒の角度');
  drawPlot(gx, height * 0.43, gw, height * 0.2, [{ data: hX, hue: 30, name: '台車の位置 x' }], -4, 4, '台車');
  drawPlot(gx, height * 0.66, gw, height * 0.2, [{ data: hF, hue: 120, name: '力 F' }], -Fmax, Fmax, '制御入力');

  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text('極：' + presets[preset].name + '（1〜3）　ゲイン倍率 ' + nf(gainScale, 1, 1) + '（上下キー）　クリックで棒をつつく　R でやり直し', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('K = [' + Kf.map((v) => nf(v * gainScale, 1, 1)).join(', ') + ']　u = −K x。棒が右に倒れかけたら台車を右へ（棒の下にもぐり込む）。倍率を小さくすると支えきれず、大きすぎると力の上限に当たってガタつく', 20, 68);
  text('線形化 → 4 次の極配置（アッカーマン）。倒立振子はセグウェイ・ロケットの姿勢制御・二足歩行の基本問題', 20, height - 30);
}

function mousePressed() {
  if (fallen) { resetAll(); return; }
  pokeDir = mouseX > map(st[0], -4, 4, width * 0.05, width * 0.47) ? -1 : 1; // 棒の右側をクリック → 左へ押す
  st[3] += pokeDir * 1.2; // ★ つつく強さ
  pokeTimer = 30;
}
function resetAll() { st = [0, 0, 0.1, 0]; fallen = false; }
function keyPressed() {
  if (key >= '1' && key <= '3') { preset = int(key) - 1; design(); }
  if (key === UP_ARROW) gainScale = min(gainScale + 0.1, 3);
  if (key === DOWN_ARROW) gainScale = max(gainScale - 0.1, 0);
  if (key === 'r' || key === 'R') resetAll();
}

// ---------- やってみよう ----------
// 1. 倍率を 0.1 ずつ下げていく。どこで倒れる？（線形化モデルでは安定でも、力の上限と非線形で倒れる）
// 2. 「強い」極で強くつつく。力が上限（±30）に張りつくと救えない
// 3. 棒を長く（l = 1.0）すると支えやすい？ 短く（0.2）すると？ ほうきと鉛筆のちがい
// 4. K の符号を見る。位置 x の係数が負（目標から離れる向きに一瞬動く）なのはなぜ？


// ==================================================
// ここから下は「線形化と極配置の道具」です（n 次元の行列を扱う）
// ==================================================
// 数値微分で x' = f(x, u) を x0, u0 のまわりで線形化 → A（n×n）, B（n）
function linearize(f, x0, u0) {
  let n = x0.length, h = 1e-5, A = [], B = [];
  for (let i = 0; i < n; i++) A.push(new Array(n).fill(0));
  for (let j = 0; j < n; j++) {
    let xp = x0.slice(), xm = x0.slice(); xp[j] += h; xm[j] -= h;
    let fp = f(xp, u0), fm = f(xm, u0);
    for (let i = 0; i < n; i++) A[i][j] = (fp[i] - fm[i]) / (2 * h);
  }
  let fp = f(x0, u0 + h), fm = f(x0, u0 - h);
  for (let i = 0; i < n; i++) B.push((fp[i] - fm[i]) / (2 * h));
  return { A, B };
}
// アッカーマンの公式：K = [0 … 0 1] · Wc⁻¹ · φ(A)、Wc = [B AB A²B …]、φ = 望む特性多項式
function ackermann(A, B, poles) {
  let n = A.length;
  let cols = [B.slice()];
  for (let i = 1; i < n; i++) cols.push(matVec(A, cols[i - 1]));
  let Wc = [];
  for (let i = 0; i < n; i++) Wc.push(cols.map((c) => c[i]));
  let alpha = [1];
  for (let p of poles) alpha = polyMulReal(alpha, [-p, 1]); // (s − p1)(s − p2)…（昇べき）
  let phi = matZero(n), Ak = matIdentity(n);
  for (let i = 0; i < alpha.length; i++) { phi = matAdd(phi, matScale(Ak, alpha[i])); Ak = matMul(Ak, A); }
  let lastRow = matMul(matInv(Wc), phi)[n - 1];
  return lastRow;
}
function matZero(n) { return Array.from({ length: n }, () => new Array(n).fill(0)); }
function matIdentity(n) { let I = matZero(n); for (let i = 0; i < n; i++) I[i][i] = 1; return I; }
function matAdd(P, Q) { return P.map((r, i) => r.map((v, j) => v + Q[i][j])); }
function matScale(P, s) { return P.map((r) => r.map((v) => v * s)); }
function matMul(P, Q) { return P.map((r) => Q[0].map((_, j) => r.reduce((acc, v, k) => acc + v * Q[k][j], 0))); }
function matVec(P, v) { return P.map((r) => r.reduce((acc, a, k) => acc + a * v[k], 0)); }
function polyMulReal(a, b) {
  let out = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) out[i + j] += a[i] * b[j];
  return out;
}
// 逆行列（ガウス・ジョルダン法）
function matInv(P) {
  let n = P.length, M = P.map((r, i) => [...r, ...matIdentity(n)[i]]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (abs(M[r][col]) > abs(M[piv][col])) piv = r;
    [M[col], M[piv]] = [M[piv], M[col]];
    let d = M[col][col] || 1e-12;
    for (let j = 0; j < 2 * n; j++) M[col][j] /= d;
    for (let r = 0; r < n; r++) if (r !== col) { let f = M[r][col]; for (let j = 0; j < 2 * n; j++) M[r][j] -= f * M[col][j]; }
  }
  return M.map((r) => r.slice(n));
}
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
