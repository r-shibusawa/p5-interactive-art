// ============================================
// 08 レイノルズ数　Re = U L / ν
// ナヴィエ・ストークス方程式の「移流（慣性）」と「粘性」の強さの比。流れの性格はこの 1 つの数で決まる
//   ∂u/∂t + (u·∇)u = −∇p/ρ + ν∇²u ,　∇·u = 0　　（07 と同じソルバーで解いている）
//   Re が小さい：粘性が勝ち、乱れはすぐ消える → 層流（なめらか）
//   Re が大きい：慣性が勝ち、小さな乱れが育つ → 渦ができ、やがて乱流へ
// 左のノズルから速さ U・幅 L の噴流を出し、ν を変えて Re を変える
// 上下キー = Re / 1〜3 = Re 10・100・1000 / V = 渦度／染料 / R = やり直し
// ============================================

let Re = 100; // ★ レイノルズ数
let Ujet = 1.0; // ★ 噴流の速さ U [マス/ステップ]
let L = 10; // ★ ノズルの幅 L [マス]
let coflow = 0.12; // ★ まわりのゆっくりした流れ（U に対する割合）
let wobble = 0.03; // ★ ノズルの出口に入れる小さなゆれ（自然界にいつもある「乱れのたね」）
let NX = 160, NY;
let viewNo = 0, dt = 1;
let W2, u, v, u0, v0, p, dvg, dye, dye0, img, inflow;
let probe = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  NY = Math.max(16, Math.round(NX * height / width));
  W2 = NX + 2;
  img = createImage(NX, NY);
  restart();
}

function restart() {
  let n = W2 * (NY + 2);
  u = new Float32Array(n); v = new Float32Array(n); u0 = new Float32Array(n); v0 = new Float32Array(n);
  p = new Float32Array(n); dvg = new Float32Array(n); dye = new Float32Array(n); dye0 = new Float32Array(n);
  inflow = new Float32Array(NY + 2);
  // ノズルの速度分布：まん中の幅 L だけ速い（角は少し丸める）
  for (let j = 0; j <= NY + 1; j++) inflow[j] = Ujet * (coflow + (1 - coflow) * 0.5 * (1 + Math.tanh((L / 2 - Math.abs(j - (NY + 1) / 2)) / 1.2)));
  for (let j = 0; j <= NY + 1; j++) for (let i = 0; i <= NX + 1; i++) u[IX(i, j)] = Ujet * coflow;
  probe = [];
}

function IX(i, j) { return i + W2 * j; }
function viscosity() { return Ujet * L / Re; } // ★ Re = U L / ν　→　ν = U L / Re

// ナヴィエ・ストークス方程式を 1 歩進める（07 と同じ：粘性 → 移流 → 圧力）
function stepFluid() {
  let nu = viscosity();
  u0.set(u); v0.set(v);
  diffuse(1, u, u0, nu); diffuse(2, v, v0, nu);
  u0.set(u); v0.set(v);
  advect(1, u, u0, u0, v0); advect(2, v, v0, u0, v0);
  project();
  dye0.set(dye);
  advect(0, dye, dye0, u, v);
  for (let k = 0; k < u.length; k++) {
    if (!(Math.abs(u[k]) < 8)) u[k] = constrain(u[k] || 0, -8, 8);
    if (!(Math.abs(v[k]) < 8)) v[k] = constrain(v[k] || 0, -8, 8);
  }
}

function diffuse(b, x, x0, k) { let a = dt * k; linSolve(b, x, x0, a, 1 + 4 * a, 14); }

function advect(b, d, d0, uu, vv) {
  for (let j = 1; j <= NY; j++) for (let i = 1; i <= NX; i++) {
    let n = IX(i, j);
    let x = constrain(i - dt * uu[n], 0.5, NX + 0.5), y = constrain(j - dt * vv[n], 0.5, NY + 0.5);
    let i0 = Math.floor(x), j0 = Math.floor(y), s = x - i0, t = y - j0, m = IX(i0, j0);
    d[n] = (1 - s) * ((1 - t) * d0[m] + t * d0[m + W2]) + s * ((1 - t) * d0[m + 1] + t * d0[m + 1 + W2]);
  }
  setBnd(b, d);
}

function project() {
  for (let j = 1; j <= NY; j++) for (let i = 1; i <= NX; i++) {
    let n = IX(i, j);
    dvg[n] = -0.5 * (u[n + 1] - u[n - 1] + v[n + W2] - v[n - W2]);
  }
  linSolve(3, p, dvg, 1, 4, 40);
  for (let j = 1; j <= NY; j++) for (let i = 1; i <= NX; i++) {
    let n = IX(i, j);
    u[n] -= 0.5 * (p[n + 1] - p[n - 1]);
    v[n] -= 0.5 * (p[n + W2] - p[n - W2]);
  }
  setBnd(1, u); setBnd(2, v);
}

function draw() {
  stepFluid();
  render();
  image(img, 0, 0, width, height);

  // ---- 観測点（ノズルから 0.55 画面ぶん下流）での縦方向の速さ v の記録
  let pi = Math.floor(NX * 0.55), pj = Math.floor((NY + 1) / 2);
  probe.push(v[IX(pi, pj)]);
  if (probe.length > 400) probe.shift();
  let px = pi / NX * width, py = pj / NY * height;
  noFill(); stroke(42, 80, 100); strokeWeight(2); circle(px, py, 14);
  let gx = width - 440, gy = height - 150, gw = 420, gh = 130, amp = 0;
  noStroke(); fill(215, 60, 8, 80); rect(gx, gy, gw, gh, 6);
  stroke(0, 0, 40); strokeWeight(1); line(gx, gy + gh / 2, gx + gw, gy + gh / 2);
  stroke(42, 80, 100); strokeWeight(2); noFill();
  if (probe.length > 1) {
    beginShape();
    for (let k = 0; k < probe.length; k++) { vertex(gx + k / 400 * gw, gy + gh / 2 - constrain(probe[k] / Ujet * gh, -gh / 2, gh / 2)); amp = Math.max(amp, Math.abs(probe[k])); }
    endShape();
  }
  noStroke(); fill(42, 80, 100); textSize(13);
  text('黄 ○ での縦の速さ v（ゆれ幅 ' + nf(amp / Ujet * 100, 1, 1) + '% U）', gx + 8, gy + 18);

  // ---- 文字
  noStroke(); fill(215, 60, 8, 78); rect(0, 0, width, 104);
  let nu = viscosity();
  fill(0, 0, 100); textSize(20);
  text('レイノルズ数 Re = U L / ν = ' + nf(Ujet, 1, 1) + ' × ' + L + ' / ' + nf(nu, 1, 4) + ' = ' + nf(Re, 1, 0) + '（上下キー、1〜3）', 20, 38);
  fill(0, 0, 80); textSize(15);
  text('ナヴィエ・ストークス方程式　∂u/∂t + (u·∇)u = −∇p/ρ + ν∇²u ,  ∇·u = 0　　　表示：' + (viewNo === 0 ? '渦度' : '染料') + '（V）　R = やり直し', 20, 66);
  fill(Re < 150 ? 185 : Re < 700 ? 42 : 12, 60, 100);
  text(Re < 150 ? '粘性が勝つ：噴流はなめらかに広がって弱まるだけ（層流）。乱れを入れてもすぐ消える' : Re < 700 ? '慣性と粘性がせりあう：噴流がうねり始め、上下に渦が並ぶ' : '慣性が勝つ：小さな乱れがすぐに育ち、渦がぶつかり合って不規則になる（乱流への入り口）', 20, 90);
}

function keyPressed() {
  if (key === UP_ARROW) Re = Math.min(Re * 1.5, 5000);
  if (key === DOWN_ARROW) Re = Math.max(Re / 1.5, 2);
  if (key === '1') Re = 10;
  if (key === '2') Re = 100;
  if (key === '3') Re = 1000;
  if (key === 'v' || key === 'V') viewNo = 1 - viewNo;
  if (key === 'r' || key === 'R') restart();
}

// ---------- やってみよう ----------
// 1. 1 → 2 → 3 と押して比べる。噴流がうねり始める Re はどのくらい？（上下キーで細かくさがす）
// 2. 右下のグラフ：Re が小さいとゆれ幅はほぼ 0、大きいと不規則にゆれる。「規則的」にゆれる Re はある？
// 3. wobble を 0 にする。Re = 1000 でもなめらかなまま？ → 乱れの「たね」がないと育たない
// 4. L を 20 にすると Re は 2 倍。U を 2 倍にしても 2 倍。同じ Re なら同じ流れになる？（相似則）
// 5. 身のまわりの Re を計算しよう：ν（水）≈ 10⁻⁶ m²/s、ν（空気）≈ 1.5 × 10⁻⁵ m²/s。泳ぐ人、飛ぶ蚊、歩く人のまわりの空気
// ※ 格子があらいので、計算そのものがもつ「にせの粘性（数値粘性）」があり、本当の Re は表示より少し低い


// ==================================================
// ここから下は「解くための道具」と「色をつける道具」です（07 とほぼ同じ。ちがうのは境界だけ）
// ==================================================
function linSolve(b, x, x0, a, c, iters) {
  let ic = 1 / c;
  for (let k = 0; k < iters; k++) {
    for (let j = 1; j <= NY; j++) {
      let r = j * W2;
      for (let i = 1; i <= NX; i++) { let n = r + i; x[n] = (x0[n] + a * (x[n - 1] + x[n + 1] + x[n - W2] + x[n + W2])) * ic; }
    }
    setBnd(b, x);
  }
}
// 境界条件：左 = 流入（ノズル）、右 = 流出（そのまま出ていく）、上下 = すべる壁
// b = 1：u、2：v、3：圧力、0：染料
function setBnd(b, x) {
  for (let i = 1; i <= NX; i++) {
    x[IX(i, 0)] = b === 2 ? -x[IX(i, 1)] : x[IX(i, 1)];
    x[IX(i, NY + 1)] = b === 2 ? -x[IX(i, NY)] : x[IX(i, NY)];
  }
  for (let j = 0; j <= NY + 1; j++) {
    let jet = inflow[j] > Ujet * (coflow + 1) / 2;
    if (b === 1) { x[IX(0, j)] = inflow[j]; x[IX(1, j)] = inflow[j]; }
    else if (b === 2) { let w = jet ? wobble * Ujet * (Math.sin(frameCount * 1.57 * Ujet / L) + Math.random() * 2 - 1) : 0; x[IX(0, j)] = w; x[IX(1, j)] = w; }
    else if (b === 0) { x[IX(0, j)] = jet ? 1 : 0; x[IX(1, j)] = jet ? 1 : 0; }
    else x[IX(0, j)] = x[IX(1, j)];
    x[IX(NX + 1, j)] = b === 3 ? -x[IX(NX, j)] : x[IX(NX, j)]; // 出口：圧力 0、ほかは「こう配 0」
  }
}
function render() {
  img.loadPixels();
  let px = img.pixels;
  for (let j = 1; j <= NY; j++) for (let i = 1; i <= NX; i++) {
    let n = IX(i, j), k = ((i - 1) + (j - 1) * NX) * 4, r, g, b;
    if (viewNo === 1) {
      let d = Math.min(dye[n], 1.2);
      r = 8 + 150 * d * d * 0.6; g = 16 + 190 * d; b = 34 + 220 * d;
    } else { // 渦度：反時計回り = 赤、時計回り = 青
      let s = -0.5 * (v[n + 1] - v[n - 1] - u[n + W2] + u[n - W2]) * 5 / Ujet, a = Math.min(Math.abs(s), 1);
      r = 8 + (s > 0 ? 247 : 20) * a; g = 16 + (s > 0 ? 110 : 200) * a; b = 34 + (s > 0 ? 70 : 221) * a;
    }
    px[k] = r; px[k + 1] = g; px[k + 2] = b; px[k + 3] = 255;
  }
  img.updatePixels();
}
