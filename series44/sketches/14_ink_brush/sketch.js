// ============================================
// 14 墨流し（マーブリング）ブラシ
// 水面に墨や絵の具を落とし、竹串でそっと引くと、流れの形がそのまま模様になる（日本の「墨流し」、トルコの「エブル」）
// ここでは 07 のナヴィエ・ストークス方程式のソルバーに色インクを流して描く
//   インクは紙の色から光を「吸う」ので、重ねるほど暗くなる（絵の具の混色）
// ドラッグ = インクを流す / 1〜5 = 色 / T = 竹串（インクなしで流れだけ作る）/ スペース = くし（櫛）を通す
// 上下キー = 筆の太さ / 左右キー = 粘性 / S = 画像を保存 / C = 全部消す
// ============================================

let nu = 0.0005; // ★ 動粘性係数 ν（左右キー。大きいと模様が動かない）
let dt = 1.0;
let brush = 2.5; // ★ 筆の太さ [マス]
let push1 = 0.45; // ★ ドラッグで水を押す強さ
let settle = 0.985; // ★ 水が静まる速さ（1 = いつまでも動く、0.9 = すぐ止まる）
let inkAmount = 0.5; // ★ 1 フレームに出るインクの量
let paper = [244, 238, 224]; // ★ 紙の色
// ★ インク：[赤を吸う量, 緑を吸う量, 青を吸う量]。全部吸えば黒、青だけ吸えば黄色に見える
let inks = [[1.0, 1.0, 1.0], [1.0, 0.65, 0.15], [0.05, 0.9, 0.85], [0.0, 0.25, 0.95], [0.85, 0.1, 0.75]];
let inkNames = ['墨', '藍（あい）', '朱（しゅ）', '山吹（やまぶき）', '若竹（わかたけ）'];
let inkNo = 0, stickOnly = false, combX = -1, saveNext = false;
let NX = 160, NY;
let W2, u, v, u0, v0, p, dvg, dyeR, dyeG, dyeB, tmp, img;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  NY = Math.max(16, Math.round(NX * height / width));
  W2 = NX + 2;
  img = createImage(NX, NY);
  wipe();
}

function wipe() {
  let n = W2 * (NY + 2);
  u = new Float32Array(n); v = new Float32Array(n); u0 = new Float32Array(n); v0 = new Float32Array(n);
  p = new Float32Array(n); dvg = new Float32Array(n); tmp = new Float32Array(n);
  dyeR = new Float32Array(n); dyeG = new Float32Array(n); dyeB = new Float32Array(n);
}

// 場所 (ci, cj) に、速度 (fx, fy) とインク（色 ink、量 amount）を足す
function splat(ci, cj, fx, fy, ink, amount) {
  let r = brush;
  for (let j = Math.max(1, Math.floor(cj - 2.5 * r)); j <= Math.min(NY, cj + 2.5 * r); j++)
    for (let i = Math.max(1, Math.floor(ci - 2.5 * r)); i <= Math.min(NX, ci + 2.5 * r); i++) {
      let w = Math.exp(-((i - ci) * (i - ci) + (j - cj) * (j - cj)) / (r * r)), n = IX(i, j);
      u[n] += fx * w; v[n] += fy * w;
      if (ink) { dyeR[n] = Math.min(dyeR[n] + ink[0] * amount * w, 4); dyeG[n] = Math.min(dyeG[n] + ink[1] * amount * w, 4); dyeB[n] = Math.min(dyeB[n] + ink[2] * amount * w, 4); }
    }
}

function draw() {
  // ---- 筆（マウス）：動かした向きに水を押し、インクを置く
  if (mouseIsPressed && mouseY > 0) {
    let dx = (mouseX - pmouseX) / width * NX, dy = (mouseY - pmouseY) / height * NY;
    let steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / brush)); // 速く動かしても線がとぎれないように
    for (let s = 1; s <= steps; s++) {
      let mx = lerp(pmouseX, mouseX, s / steps), my = lerp(pmouseY, mouseY, s / steps);
      splat(mx / width * NX + 1, my / height * NY + 1, constrain(dx, -6, 6) * push1 / steps, constrain(dy, -6, 6) * push1 / steps, stickOnly ? null : inks[inkNo], inkAmount / steps);
    }
  }
  // ---- くし：等間かくの歯が左から右へ通りぬける
  if (combX >= 0) {
    for (let j = 6; j < NY; j += 12) splat(combX, j, 0.5, 0, null, 0);
    combX += 1.5;
    if (combX > NX) combX = -1;
  }

  stepVelocity(); // ナヴィエ・ストークス方程式を 1 歩（道具の中）
  for (let k = 0; k < u.length; k++) { u[k] *= settle; v[k] *= settle; }
  // インク 3 色ぶんを流れで運ぶ
  for (let d of [dyeR, dyeG, dyeB]) { tmp.set(d); advect(0, d, tmp, u, v); }

  // ---- 紙の色 × インクが吸った残り
  img.loadPixels();
  let px = img.pixels;
  for (let j = 1; j <= NY; j++) for (let i = 1; i <= NX; i++) {
    let n = IX(i, j), k = ((i - 1) + (j - 1) * NX) * 4;
    px[k] = paper[0] * Math.exp(-1.6 * dyeR[n]); px[k + 1] = paper[1] * Math.exp(-1.6 * dyeG[n]); px[k + 2] = paper[2] * Math.exp(-1.6 * dyeB[n]); px[k + 3] = 255;
  }
  img.updatePixels();
  image(img, 0, 0, width, height);

  // ---- 文字（S で保存するフレームでは出さない）
  if (saveNext) { saveCanvas('suminagashi', 'png'); saveNext = false; }
  else {
    noStroke(); fill(0, 0, 15, 70); textSize(15);
    text('1〜5 色：' + inkNames[inkNo] + '　T 竹串 ' + (stickOnly ? 'ON（流れだけ）' : 'OFF') + '　スペース = くし　太さ ' + nf(brush, 1, 1) + '（上下キー）　ν = ' + nf(nu, 1, 4) + '（左右キー）　S 保存　C 消す', 16, 26);
    for (let k = 0; k < inks.length; k++) {
      fill(0, 0, 100); stroke(0, 0, k === inkNo ? 10 : 70); strokeWeight(k === inkNo ? 3 : 1);
      let c = inks[k].map((a, ch) => paper[ch] * Math.exp(-1.6 * a));
      push(); colorMode(RGB, 255); fill(c[0], c[1], c[2]); circle(30 + k * 34, 52, 24); pop();
    }
  }
}

function keyPressed() {
  if (key >= '1' && key <= '5') { inkNo = Number(key) - 1; stickOnly = false; }
  if (key === 't' || key === 'T') stickOnly = !stickOnly;
  if (key === ' ') combX = 1;
  if (key === UP_ARROW) brush = Math.min(brush + 0.5, 6);
  if (key === DOWN_ARROW) brush = Math.max(brush - 0.5, 1);
  if (key === RIGHT_ARROW) nu = Math.min(nu * 2, 0.256);
  if (key === LEFT_ARROW) nu = Math.max(nu / 2, 0.0005);
  if (key === 's' || key === 'S') saveNext = true;
  if (key === 'c' || key === 'C') wipe();
}

// ---------- やってみよう ----------
// 1. 墨で大きく円を描き、藍・朱を中に落とす。T で竹串にして、外から中へ・中から外へ引いてみよう
// 2. 色の帯を横に何本か引いてからスペース（くし）。もう一度、こんどは縦にマウスで引くと「矢羽根」模様
// 3. ν を大きくすると（右キー）筆のあとがすぐ止まる。小さいと長く流れ続ける。好みの「水」を見つけよう
// 4. inks に自分の色を足す。[0, 0, 1] は何色？ [1, 0, 0] は？（吸う色の反対の色に見える）
// 5. paper を [20, 24, 40] にして、inks を負の数（光る絵の具）にすると夜空のような絵になる
// 6. settle を 1 にして、draw の中で v[k] -= 0.002 * dyeR[k]（インクのある所を上へ）を足すと、けむりのような絵になる


// ==================================================
// ここから下は「流れを解く道具」です（全部コピーすること）
// ==================================================
// ---- 流体ソルバー（07 と同じ。ナヴィエ・ストークス方程式を 粘性 → 移流 → 圧力 の順に解く）
function IX(i, j) { return i + W2 * j; }
function stepVelocity() {
  if (nu > 0) { u0.set(u); v0.set(v); diffuse(1, u, u0, nu); diffuse(2, v, v0, nu); } // 粘性 ν∇²u
  u0.set(u); v0.set(v);
  advect(1, u, u0, u0, v0); advect(2, v, v0, u0, v0); // 移流 −(u·∇)u
  project(); // 圧力 −∇p と ∇·u = 0
  for (let k = 0; k < u.length; k++) {
    if (!(Math.abs(u[k]) < 20)) u[k] = constrain(u[k] || 0, -20, 20);
    if (!(Math.abs(v[k]) < 20)) v[k] = constrain(v[k] || 0, -20, 20);
  }
}
function diffuse(b, x, x0, k) { let a = dt * k; linSolve(b, x, x0, a, 1 + 4 * a, 10); }
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
  setBnd(0, dvg);
  linSolve(0, p, dvg, 1, 4, 25);
  for (let j = 1; j <= NY; j++) for (let i = 1; i <= NX; i++) {
    let n = IX(i, j);
    u[n] -= 0.5 * (p[n + 1] - p[n - 1]);
    v[n] -= 0.5 * (p[n + W2] - p[n - W2]);
  }
  setBnd(1, u); setBnd(2, v);
}
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
function setBnd(b, x) {
  for (let i = 1; i <= NX; i++) {
    x[IX(i, 0)] = b === 2 ? -x[IX(i, 1)] : x[IX(i, 1)];
    x[IX(i, NY + 1)] = b === 2 ? -x[IX(i, NY)] : x[IX(i, NY)];
  }
  for (let j = 0; j <= NY + 1; j++) {
    x[IX(0, j)] = b === 1 ? -x[IX(1, j)] : x[IX(1, j)];
    x[IX(NX + 1, j)] = b === 1 ? -x[IX(NX, j)] : x[IX(NX, j)];
  }
}
