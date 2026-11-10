// ============================================
// 09 カルマン渦列
// 流れの中に円柱を置くと、後ろに「右回り・左回り」の渦が交互にはがれて 2 列に並ぶ
// 電線が風でヒューと鳴る、旗がはためく、橋がゆれる ── みんなこの渦のしわざ
//   はがれる周波数 f は ストローハル数 St = f D / U ≈ 0.2 でほぼ決まる（D = 円柱の直径）
// ここでは格子ボルツマン法（LBM, D2Q9）で解く：流体を「9 方向に動く粒子の集まり」として
// ぶつかる → 動く をくり返すと、全体としてナヴィエ・ストークス方程式にしたがう流れになる
// ドラッグ = 物体を動かす / 上下キー = レイノルズ数 / 1〜3 = 形 / V = 表示 / R = やり直し
// ============================================

let U0 = 0.1; // ★ 流れの速さ（格子の単位。0.15 より大きくすると計算がこわれやすい）
let Re = 100; // ★ レイノルズ数 Re = U D / ν
let D = 12; // ★ 物体の大きさ [マス]
let stepsPerFrame = 8; // ★ 1 フレームに進める回数
let shapeNo = 1; // 1 = 円柱, 2 = 平板, 3 = 四角柱
let viewNo = 0; // 0 = 渦度, 1 = 速さ
let nx = 160, ny;
let n0, nN, nS, nE, nW, nNE, nSE, nNW, nSW, rho, ux, uy, bar, img;
let bx, by, steps = 0, lastCross = 0, periods = [], lastV = 0, dots = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  ny = Math.max(20, Math.round(nx * height / width));
  img = createImage(nx, ny);
  bx = Math.round(nx * 0.22); by = Math.round(ny * 0.5) + 1; // まん中から 1 マスずらす（渦が早く出始める）
  for (let i = 0; i < 400; i++) dots.push({ x: Math.random() * nx, y: Math.random() * ny });
  restart();
}

function restart() {
  let n = nx * ny;
  n0 = new Float32Array(n); nN = new Float32Array(n); nS = new Float32Array(n); nE = new Float32Array(n); nW = new Float32Array(n);
  nNE = new Float32Array(n); nSE = new Float32Array(n); nNW = new Float32Array(n); nSW = new Float32Array(n);
  rho = new Float32Array(n); ux = new Float32Array(n); uy = new Float32Array(n); bar = new Uint8Array(n);
  for (let k = 0; k < n; k++) setEquil(k, U0, 0, 1);
  placeBody();
  steps = 0; periods = []; lastCross = 0;
}

function viscosity() { return Math.max(U0 * D / Re, 0.004); } // ν = U D / Re

// 物体の形をマス目に書きこむ
function placeBody() {
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
    let dx = x - bx, dy = y - by, k = x + y * nx, was = bar[k];
    let inBody = shapeNo === 1 ? dx * dx + dy * dy <= D * D / 4 : shapeNo === 2 ? (dx === 0 && Math.abs(dy) <= D / 2) : (Math.abs(dx) <= D / 2 && Math.abs(dy) <= D / 2);
    bar[k] = inBody && x > 1 && x < nx - 2 && y > 1 && y < ny - 2 ? 1 : 0;
    if (was && !bar[k]) setEquil(k, 0, 0, 1); // 物体がどいた所は、止まった流体でうめる
  }
}

// 平衡分布：速度 (vx, vy)・密度 r の流体なら、9 方向の粒子はこの割合になる
function setEquil(k, vx, vy, r) {
  let u2 = 1 - 1.5 * (vx * vx + vy * vy), a = r / 9, b = r / 36;
  n0[k] = 4 / 9 * r * u2;
  nE[k] = a * (u2 + 3 * vx + 4.5 * vx * vx); nW[k] = a * (u2 - 3 * vx + 4.5 * vx * vx);
  nN[k] = a * (u2 + 3 * vy + 4.5 * vy * vy); nS[k] = a * (u2 - 3 * vy + 4.5 * vy * vy);
  nNE[k] = b * (u2 + 3 * (vx + vy) + 4.5 * (vx + vy) * (vx + vy)); nSW[k] = b * (u2 - 3 * (vx + vy) + 4.5 * (vx + vy) * (vx + vy));
  nSE[k] = b * (u2 + 3 * (vx - vy) + 4.5 * (vx - vy) * (vx - vy)); nNW[k] = b * (u2 - 3 * (vx - vy) + 4.5 * (vx - vy) * (vx - vy));
  rho[k] = r; ux[k] = vx; uy[k] = vy;
}

// ★ 衝突：各マスで密度と速度を求め、粒子の分布を平衡分布へ近づける（近づく速さ ω が粘性を決める）
function collide() {
  let omega = 1 / (3 * viscosity() + 0.5);
  for (let y = 1; y < ny - 1; y++) for (let x = 1; x < nx - 1; x++) {
    let k = x + y * nx;
    let r = n0[k] + nN[k] + nS[k] + nE[k] + nW[k] + nNW[k] + nNE[k] + nSW[k] + nSE[k];
    let vx = (nE[k] + nNE[k] + nSE[k] - nW[k] - nNW[k] - nSW[k]) / r;
    let vy = (nN[k] + nNE[k] + nNW[k] - nS[k] - nSE[k] - nSW[k]) / r;
    rho[k] = r; ux[k] = vx; uy[k] = vy;
    let u2 = 1 - 1.5 * (vx * vx + vy * vy), a = r / 9, b = r / 36, s = vx + vy, d = vx - vy;
    n0[k] += omega * (4 / 9 * r * u2 - n0[k]);
    nE[k] += omega * (a * (u2 + 3 * vx + 4.5 * vx * vx) - nE[k]);
    nW[k] += omega * (a * (u2 - 3 * vx + 4.5 * vx * vx) - nW[k]);
    nN[k] += omega * (a * (u2 + 3 * vy + 4.5 * vy * vy) - nN[k]);
    nS[k] += omega * (a * (u2 - 3 * vy + 4.5 * vy * vy) - nS[k]);
    nNE[k] += omega * (b * (u2 + 3 * s + 4.5 * s * s) - nNE[k]);
    nSW[k] += omega * (b * (u2 - 3 * s + 4.5 * s * s) - nSW[k]);
    nSE[k] += omega * (b * (u2 + 3 * d + 4.5 * d * d) - nSE[k]);
    nNW[k] += omega * (b * (u2 - 3 * d + 4.5 * d * d) - nNW[k]);
  }
}

// ★ 並進：粒子をそれぞれの向きへ 1 マス動かす。物体に当たった粒子は来た向きへはね返る
function stream() {
  for (let y = ny - 2; y > 0; y--) for (let x = 1; x < nx - 1; x++) { let k = x + y * nx; nN[k] = nN[k - nx]; nNW[k] = nNW[k + 1 - nx]; }
  for (let y = ny - 2; y > 0; y--) for (let x = nx - 2; x > 0; x--) { let k = x + y * nx; nE[k] = nE[k - 1]; nNE[k] = nNE[k - 1 - nx]; }
  for (let y = 1; y < ny - 1; y++) for (let x = nx - 2; x > 0; x--) { let k = x + y * nx; nS[k] = nS[k + nx]; nSE[k] = nSE[k - 1 + nx]; }
  for (let y = 1; y < ny - 1; y++) for (let x = 1; x < nx - 1; x++) { let k = x + y * nx; nW[k] = nW[k + 1]; nSW[k] = nSW[k + 1 + nx]; }
  for (let y = 2; y < ny - 2; y++) for (let x = 2; x < nx - 2; x++) {
    let k = x + y * nx;
    if (bar[k]) {
      nE[k + 1] = nW[k]; nW[k - 1] = nE[k]; nN[k + nx] = nS[k]; nS[k - nx] = nN[k];
      nNE[k + nx + 1] = nSW[k]; nNW[k + nx - 1] = nSE[k]; nSE[k - nx + 1] = nNW[k]; nSW[k - nx - 1] = nNE[k];
    }
  }
}

function draw() {
  let broken = false;
  for (let s = 0; s < stepsPerFrame; s++) {
    for (let x = 0; x < nx; x++) { setEquil(x, U0, 0, 1); setEquil(x + (ny - 1) * nx, U0, 0, 1); } // 外わくは一様流
    for (let y = 0; y < ny; y++) { setEquil(y * nx, U0, 0, 1); setEquil(nx - 1 + y * nx, U0, 0, 1); }
    collide(); stream();
    steps++;
    // 物体の 3D 後ろで、縦の速さ uy が「負 → 正」になる瞬間を数える（= 渦が 1 組はがれた）
    let pk = Math.min(bx + 3 * D, nx - 3) + by * nx, pv = uy[pk];
    if (lastV < 0 && pv >= 0) { if (lastCross > 0 && steps - lastCross > 40) { periods.push(steps - lastCross); if (periods.length > 6) periods.shift(); } lastCross = steps; }
    lastV = pv;
    if (!(rho[pk] > 0.3 && rho[pk] < 3)) broken = true;
  }
  if (broken) restart(); // 計算がこわれたら最初から

  // ---- 色をつける
  img.loadPixels();
  let px = img.pixels;
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
    let k = x + y * nx, q = k * 4, r, g, b, edge = x < 3 || x > nx - 4 || y < 3 || y > ny - 4;
    if (bar[k]) { r = 222; g = 196; b = 140; }
    else if (viewNo === 0) { // 渦度（画面で反時計回り = 赤）。外わくのすぐそばは描かない
      let s = edge ? 0 : -(uy[k + 1] - uy[k - 1] - ux[k + nx] + ux[k - nx]) * 0.5 / U0 * 6, a = Math.min(Math.abs(s), 1);
      r = 8 + (s > 0 ? 247 : 20) * a; g = 16 + (s > 0 ? 110 : 200) * a; b = 34 + (s > 0 ? 70 : 221) * a;
    } else { let sp = Math.min(Math.hypot(ux[k], uy[k]) / U0 / 1.6, 1); r = 8 + 240 * sp * sp; g = 16 + 220 * sp; b = 60 + 150 * sp; }
    px[q] = r; px[q + 1] = g; px[q + 2] = b; px[q + 3] = 255;
  }
  img.updatePixels();
  image(img, 0, 0, width, height);

  // ---- 流れに乗る粒
  noStroke(); fill(0, 0, 100, 60);
  let cw = width / nx, ch = height / ny;
  for (let q of dots) {
    let k = constrain(Math.floor(q.x), 1, nx - 2) + constrain(Math.floor(q.y), 1, ny - 2) * nx;
    q.x += ux[k] * stepsPerFrame; q.y += uy[k] * stepsPerFrame;
    if (q.x > nx - 1 || q.x < 0 || q.y < 0 || q.y > ny || bar[k]) { q.x = 1; q.y = Math.random() * ny; }
    circle(q.x * cw, q.y * ch, 3);
  }
  noFill(); stroke(42, 80, 100); strokeWeight(2);
  circle(Math.min(bx + 3 * D, nx - 3) * cw, by * ch, 12);

  // ---- 文字
  let T = periods.length ? periods.reduce((a, b) => a + b, 0) / periods.length : 0;
  noStroke(); fill(215, 60, 8, 78); rect(0, 0, width, 100);
  fill(0, 0, 100); textSize(18);
  text('レイノルズ数 Re = U D / ν = ' + nf(U0 * D / viscosity(), 1, 0) + '（上下キー）　形：' + ['', '円柱', '平板', '四角柱'][shapeNo] + '（1〜3）　表示：' + (viewNo ? '速さ' : '渦度') + '（V）　ドラッグ = 動かす　R = やり直し', 20, 38);
  fill(0, 0, 80); textSize(15);
  text(T > 0 ? '黄 ○ で測った渦の周期 T = ' + nf(T, 1, 0) + ' ステップ　→　ストローハル数 St = D / (U T) = ' + nf(D / (U0 * T), 1, 3) + '　（実験では Re が 100〜1000 で 0.16〜0.21）' : '渦がはがれ始めるのを待っています…（Re が 50 より小さいと、渦は後ろにくっついたままではがれない）', 20, 66);
  fill(0, 0, 65);
  text('赤 = 反時計回り、青 = 時計回りの渦。上と下から交互にはがれ、千鳥（ジグザグ）に並ぶ', 20, 90);
}

function mouseDragged() {
  bx = constrain(Math.round(mouseX / width * nx), D, nx - 4 * D); by = constrain(Math.round(mouseY / height * ny), D, ny - D);
  placeBody(); periods = []; lastCross = 0;
}

function keyPressed() {
  if (key === UP_ARROW) Re = Math.min(Re * 1.25, 300);
  if (key === DOWN_ARROW) Re = Math.max(Re / 1.25, 10);
  if (key === '1' || key === '2' || key === '3') { shapeNo = Number(key); placeBody(); periods = []; lastCross = 0; }
  if (key === 'v' || key === 'V') viewNo = 1 - viewNo;
  if (key === 'r' || key === 'R') restart();
}

// ---------- やってみよう ----------
// 1. 渦がはがれ始めるまで待つ。St はいくつ？ Re を上下キーで変えると St はどう変わる？
// 2. Re を 30 まで下げる。渦は 2 つ並んで円柱の後ろにくっつく（双子渦）。はがれ始める Re は？
// 3. 円柱をドラッグでゆっくり動かす／壁の近くに置く。渦の並びはどう変わる？
// 4. 2 の平板・3 の四角柱と比べる。St が大きい（速くはがれる）のはどれ？
// 5. 直径 5 mm の電線に風速 10 m/s：f = St U / D = 0.2 × 10 / 0.005 = 400 Hz。これが「風の音」
// 6. D を 6 や 20 にして St を測る。直径が変わっても St がほぼ同じなら、相似則が成り立っている
