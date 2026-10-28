// ============================================
// 06 単振り子と非線形性
// 本物の振り子 θ'' = −(g/L) sin θ と、小さい角度の近似 θ'' = −(g/L) θ を並べて比べる
//   振れ幅が大きいと周期が長くなる。右上は位相図（θ, ω）、太い線がセパラトリクス（揺れると回るの境目）
// ↑↓ = 振れ幅 / 位相図をクリック = その状態からスタート / D = 空気抵抗 / スペース = リセット
// ============================================

let g = 9.8, Lm = 1.0;     // ★ 重力加速度 [m/s²] と ひもの長さ [m]
let amp = 1.2;             // ★ 最初の振れ幅 [rad]
let damping = false;
let gamma = 0.15;          // ★ 空気抵抗の強さ
let th, om, thL, omL;      // 本物（非線形）と近似（線形）
let trail = [], phaseBG;
let tSim = 0, lastCross = NaN, measuredT = NaN, prevOm = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  makePhaseBG();
  reset(amp, 0);
}
function reset(a, w) { th = a; om = w; thL = a; omL = w; trail = []; tSim = 0; lastCross = NaN; measuredT = NaN; prevOm = w; }

// ★ 運動方程式（非線形と線形）
function f(t, w, linear) {
  let a = linear ? -(g / Lm) * t : -(g / Lm) * sin(t);
  if (damping) a -= gamma * w;
  return a;
}
function rk4(t, w, h, linear) {
  let k1t = w, k1w = f(t, w, linear);
  let k2t = w + k1w * h / 2, k2w = f(t + k1t * h / 2, w + k1w * h / 2, linear);
  let k3t = w + k2w * h / 2, k3w = f(t + k2t * h / 2, w + k2w * h / 2, linear);
  let k4t = w + k3w * h, k4w = f(t + k3t * h, w + k3w * h, linear);
  return [t + h / 6 * (k1t + 2 * k2t + 2 * k3t + k4t), w + h / 6 * (k1w + 2 * k2w + 2 * k3w + k4w)];
}

// 周期の理論値：T = T₀ / AGM(1, cos(θ₀/2))（算術幾何平均を使うと楕円積分が速く計算できる）
function periodRatio(a) {
  let x = 1, y = cos(a / 2);
  if (y <= 1e-6) return 99;
  for (let i = 0; i < 20; i++) { let nx = (x + y) / 2; y = sqrt(x * y); x = nx; }
  return 1 / x;
}

// 位相図の背景：エネルギー E = ω²/2 − (g/L) cos θ の等高線を色の帯で
let PH = { x: 0, y: 0, w: 0, h: 0, tmax: Math.PI * 1.25, wmax: 9 };
function makePhaseBG() {
  PH = { x: width * 0.52, y: height * 0.12, w: width * 0.44, h: height * 0.42, tmax: PI * 1.25, wmax: 9 };
  phaseBG = createGraphics(220, 110);
  phaseBG.colorMode(HSB, 360, 100, 100, 100); phaseBG.noStroke();
  let Es = 2 * g / Lm;
  for (let i = 0; i < 220; i++) for (let j = 0; j < 110; j++) {
    let t = map(i, 0, 219, -PH.tmax, PH.tmax), w = map(j, 0, 109, PH.wmax, -PH.wmax);
    let E = 0.5 * w * w + (g / Lm) * (1 - cos(t));
    let band = floor(E / 3) % 2;
    phaseBG.fill(E < Es ? 220 : 280, 40, band ? 22 : 17); phaseBG.rect(i, j, 1, 1);
  }
}
function phX(t) { return map(t, -PH.tmax, PH.tmax, PH.x, PH.x + PH.w); }
function phY(w) { return map(w, -PH.wmax, PH.wmax, PH.y + PH.h, PH.y); }

function draw() {
  background(230, 30, 10);
  let sub = 10, h = 1 / 60 / sub;
  for (let k = 0; k < sub; k++) {
    [th, om] = rk4(th, om, h, false);
    [thL, omL] = rk4(thL, omL, h, true);
    tSim += h;
    // 周期を測る：ω が + から − に変わった瞬間（右端）の間隔
    if (prevOm > 0 && om <= 0) { if (isFinite(lastCross)) measuredT = tSim - lastCross; lastCross = tSim; }
    prevOm = om;
  }
  om = constrain(om, -50, 50); omL = constrain(omL, -50, 50);
  trail.push([th, om]); if (trail.length > 400) trail.shift();

  // ---- 振り子 2 つ
  let px = width * 0.25, py = height * 0.38, Lp = min(height * 0.36, width * 0.18);
  noStroke(); fill(0, 0, 60); circle(px, py, 10);
  let drawBob = (a, hue, al) => {
    let bx = px + Lp * sin(a), by = py + Lp * cos(a);
    stroke(hue, 40, 90, al); strokeWeight(2); line(px, py, bx, by);
    noStroke(); fill(hue, 70, 100, al); circle(bx, by, 34);
  };
  drawBob(thL, 200, 55);
  drawBob(th, 30, 100);
  noStroke(); textSize(14);
  fill(30, 70, 100); text('● 本物 sin θ', width * 0.04, height * 0.82);
  fill(200, 70, 100); text('● 近似 θ（小さい角度なら sin θ ≈ θ）', width * 0.04, height * 0.85);

  // ---- 位相図
  image(phaseBG, PH.x, PH.y, PH.w, PH.h);
  // セパラトリクス ω = ±2√(g/L) cos(θ/2)
  stroke(55, 90, 100); strokeWeight(2.5); noFill();
  for (let sgn of [1, -1]) { beginShape(); for (let t = -PH.tmax; t <= PH.tmax; t += 0.05) vertex(phX(t), phY(sgn * 2 * sqrt(g / Lm) * abs(cos(t / 2)))); endShape(); }
  stroke(30, 80, 100); strokeWeight(2);
  let prevT = NaN;
  beginShape();
  for (let q of trail) {
    let t = ((q[0] + PI) % TWO_PI + TWO_PI) % TWO_PI - PI;   // −π〜π に折りたたむ
    if (abs(t - prevT) > PI) { endShape(); beginShape(); }
    vertex(phX(t), phY(constrain(q[1], -PH.wmax, PH.wmax))); prevT = t;
  }
  endShape();
  let tw = ((th + PI) % TWO_PI + TWO_PI) % TWO_PI - PI;
  noStroke(); fill(30, 80, 100); circle(phX(tw), phY(constrain(om, -PH.wmax, PH.wmax)), 12);
  fill(0, 0, 80); textSize(13); text('位相図：横 θ（−225°〜225°）、縦 ω。黄色 = セパラトリクス。クリックでその状態からスタート', PH.x + 8, PH.y + 18);

  // ---- 振れ幅と周期のグラフ
  let gx = PH.x, gy = height * 0.6, gw = PH.w, gh = height * 0.3;
  noStroke(); fill(0, 0, 14); rect(gx, gy, gw, gh, 6);
  let T0 = TWO_PI * sqrt(Lm / g);
  stroke(30, 80, 100); strokeWeight(2); noFill();
  beginShape(); for (let a = 0.01; a < 3.1; a += 0.02) vertex(map(a, 0, PI, gx + 20, gx + gw - 20), map(min(periodRatio(a), 4), 0.8, 4, gy + gh - 20, gy + 30)); endShape();
  stroke(200, 70, 100); line(gx + 20, map(1, 0.8, 4, gy + gh - 20, gy + 30), gx + gw - 20, map(1, 0.8, 4, gy + gh - 20, gy + 30));
  let a0 = abs(amp);
  noStroke(); fill(55, 90, 100); circle(map(a0, 0, PI, gx + 20, gx + gw - 20), map(min(periodRatio(a0), 4), 0.8, 4, gy + gh - 20, gy + 30), 12);
  fill(0, 0, 80); textSize(13);
  text('周期 T / T₀ と振れ幅 θ₀（0°〜180°）　T₀ = 2π√(L/g) = ' + nf(T0, 1, 3) + ' s　180° に近づくと周期は無限大', gx + 8, gy + 18);

  noStroke(); fill(0, 0, 100); textSize(18);
  text('振れ幅 θ₀ = ' + nf(degrees(amp), 1, 0) + '°（↑↓）　空気抵抗 ' + (damping ? 'ON' : 'OFF') + '（D）　スペース：リセット', 20, 40);
  fill(0, 0, 65); textSize(15);
  text('周期：測定 ' + (isFinite(measuredT) ? nf(measuredT, 1, 3) : '—') + ' s　理論 ' + nf(T0 * periodRatio(a0), 1, 3) + ' s　近似 ' + nf(T0, 1, 3) + ' s（振れ幅によらない = 等時性、ガリレオ）', 20, 68);
}

function mousePressed() {
  if (mouseX > PH.x && mouseX < PH.x + PH.w && mouseY > PH.y && mouseY < PH.y + PH.h) {
    let t = map(mouseX, PH.x, PH.x + PH.w, -PH.tmax, PH.tmax), w = map(mouseY, PH.y + PH.h, PH.y, -PH.wmax, PH.wmax);
    amp = constrain(t, -PI, PI); reset(t, w);
  }
}
function keyPressed() {
  if (key === UP_ARROW) { amp = min(amp + radians(10), radians(179)); reset(amp, 0); }
  if (key === DOWN_ARROW) { amp = max(amp - radians(10), radians(5)); reset(amp, 0); }
  if (key === 'd' || key === 'D') damping = !damping;
  if (key === ' ') reset(amp, 0);
}

// ---------- やってみよう ----------
// 1. 振れ幅 10° では 2 つの振り子はほぼ同じ。90° では？ 170° では？ どのくらいでずれ始める？
// 2. 位相図でセパラトリクスの外側をクリック → 振り子はぐるぐる回り続ける
// 3. セパラトリクスのすぐ内側をクリック → 真上でしばらく止まりそうになる（周期がとても長い）
// 4. D で空気抵抗を入れると、位相図の点は渦を巻いて (0, 0) に吸い込まれる
