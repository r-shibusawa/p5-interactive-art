// ============================================
// 15 カメラで流体をかき混ぜる 📷
// カメラの映像の「動いた所」を力に変えて、07 のナヴィエ・ストークス方程式のソルバーに入れる
//   明るさの時間変化 ∂I/∂t と、明るさのこう配 ∇I から、動きの向きを見積もる（オプティカルフロー）
//     動き ≈ −(∂I/∂t) ∇I / |∇I|²
//   動いた所には、映像の色がそのまま染料として入る → 手をふると自分の色のけむりが流れる
// カメラが使えないとき・M を押したときは、マウスのドラッグでかき混ぜる
// V = 映像を表示 / 上下キー = 力の強さ / 左右キー = 感度 / M = マウスに切替 / C = 消す
// ============================================

let nu = 0.002; // ★ 動粘性係数 ν
let dt = 1.0;
let forceGain = 0.5; // ★ 動きを力にする強さ（上下キー）
let sense = 18; // ★ この明るさの変化より小さい動きは無視（左右キー。小さいほど敏感）
let fade = 0.985; // ★ 染料が消える速さ
let camW = 160, camH = 120; // カメラ画像の大きさ
let NX = 112, NY;
let W2, u, v, u0, v0, p, dvg, dyeR, dyeG, dyeB, tmp, img;
let cap, lum, lumOld, camOK = false, showCam = true, useMouse = false, moved = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  NY = Math.max(16, Math.round(NX * height / width));
  W2 = NX + 2;
  img = createImage(NX, NY);
  cap = createCapture(VIDEO, { flipped: true });
  cap.size(camW, camH);
  cap.hide();
  wipe();
}

function wipe() {
  let n = W2 * (NY + 2);
  u = new Float32Array(n); v = new Float32Array(n); u0 = new Float32Array(n); v0 = new Float32Array(n);
  p = new Float32Array(n); dvg = new Float32Array(n); tmp = new Float32Array(n);
  dyeR = new Float32Array(n); dyeG = new Float32Array(n); dyeB = new Float32Array(n);
  lum = new Float32Array(n); lumOld = new Float32Array(n);
}

// ★ カメラの動きを力と染料に変える
function cameraForces(active) {
  cap.loadPixels();
  let px = cap.pixels;
  if (!(cap.width > 0) || !px || px.length < camW * camH * 4) return false;
  // 格子の各マスに対応する画素の明るさ（と色）を読む
  let col = new Float32Array(lum.length * 3);
  for (let j = 1; j <= NY; j++) for (let i = 1; i <= NX; i++) {
    let cx = Math.min(camW - 1, Math.floor((i - 0.5) / NX * camW)), cy = Math.min(camH - 1, Math.floor((j - 0.5) / NY * camH)), q = (cx + cy * camW) * 4, n = IX(i, j);
    lumOld[n] = lum[n];
    lum[n] = (px[q] + px[q + 1] + px[q + 2]) / 3;
    col[n * 3] = px[q]; col[n * 3 + 1] = px[q + 1]; col[n * 3 + 2] = px[q + 2];
  }
  moved = 0;
  if (frameCount < 20 || !active) return true; // 最初の数フレームは明るさが安定しないので待つ。マウスのときは読むだけ
  for (let j = 2; j < NY; j++) for (let i = 2; i < NX; i++) {
    let n = IX(i, j), It = lum[n] - lumOld[n];
    if (Math.abs(It) < sense) continue;
    let Ix = (lum[n + 1] - lum[n - 1]) / 2, Iy = (lum[n + W2] - lum[n - W2]) / 2, g2 = Ix * Ix + Iy * Iy + 40;
    let fx = constrain(-It * Ix / g2, -2, 2), fy = constrain(-It * Iy / g2, -2, 2); // 動きの向き
    u[n] += fx * forceGain; v[n] += fy * forceGain;
    dyeR[n] = Math.min(dyeR[n] + col[n * 3] / 255 * 0.35, 1.5); dyeG[n] = Math.min(dyeG[n] + col[n * 3 + 1] / 255 * 0.35, 1.5); dyeB[n] = Math.min(dyeB[n] + col[n * 3 + 2] / 255 * 0.35, 1.5);
    moved++;
  }
  return true;
}

// カメラがないとき：マウスのドラッグで力と色（場所で色が変わる）
function mouseForces() {
  if (!mouseIsPressed) return;
  let ci = mouseX / width * NX + 1, cj = mouseY / height * NY + 1;
  let fx = constrain((mouseX - pmouseX) / width * NX * 0.5, -4, 4), fy = constrain((mouseY - pmouseY) / height * NY * 0.5, -4, 4);
  let h = (frameCount * 2) % 360, c = [0.5 + 0.5 * Math.cos(h / 57.3), 0.5 + 0.5 * Math.cos(h / 57.3 - 2.1), 0.5 + 0.5 * Math.cos(h / 57.3 + 2.1)];
  for (let j = Math.max(1, Math.floor(cj - 7)); j <= Math.min(NY, cj + 7); j++)
    for (let i = Math.max(1, Math.floor(ci - 7)); i <= Math.min(NX, ci + 7); i++) {
      let w = Math.exp(-((i - ci) * (i - ci) + (j - cj) * (j - cj)) / 10), n = IX(i, j);
      u[n] += fx * w; v[n] += fy * w;
      dyeR[n] = Math.min(dyeR[n] + c[0] * w * 0.5, 1.5); dyeG[n] = Math.min(dyeG[n] + c[1] * w * 0.5, 1.5); dyeB[n] = Math.min(dyeB[n] + c[2] * w * 0.5, 1.5);
    }
}

function draw() {
  camOK = cameraForces(!useMouse);
  if (!camOK || useMouse) mouseForces();

  stepVelocity(); // ナヴィエ・ストークス方程式を 1 歩（道具の中）
  for (let d of [dyeR, dyeG, dyeB]) { tmp.set(d); advect(0, d, tmp, u, v); for (let k = 0; k < d.length; k++) d[k] *= fade; }

  background(215, 60, 6);
  if (camOK && showCam) { push(); tint(0, 0, 100, 30); image(cap, 0, 0, width, height); pop(); }
  img.loadPixels();
  let px = img.pixels;
  for (let j = 1; j <= NY; j++) for (let i = 1; i <= NX; i++) {
    let n = IX(i, j), k = ((i - 1) + (j - 1) * NX) * 4, a = Math.max(dyeR[n], dyeG[n], dyeB[n]);
    px[k] = Math.min(255 * dyeR[n], 255); px[k + 1] = Math.min(255 * dyeG[n], 255); px[k + 2] = Math.min(255 * dyeB[n], 255);
    px[k + 3] = Math.min(a * 320, 255); // 染料のない所は透明（下の映像が見える）
  }
  img.updatePixels();
  image(img, 0, 0, width, height);

  noStroke(); fill(215, 60, 8, 78); rect(0, 0, width, 76);
  fill(0, 0, 100); textSize(18);
  text((camOK && !useMouse ? 'カメラの前で手を動かそう（動いたマス ' + moved + '）' : 'マウスをドラッグしてかき混ぜる' + (camOK ? '' : '（カメラが使えません。アドレスバーで許可）')) + '　V 映像　M マウス　C 消す', 20, 34);
  fill(0, 0, 75); textSize(15);
  text('ナヴィエ・ストークス方程式 ∂u/∂t + (u·∇)u = −∇p/ρ + ν∇²u + f の外力 f を、映像の動きから作る　力 ' + nf(forceGain, 1, 2) + '（上下キー）　感度 ' + sense + '（左右キー）', 20, 60);
}

function keyPressed() {
  if (key === 'v' || key === 'V') showCam = !showCam;
  if (key === 'm' || key === 'M') useMouse = !useMouse;
  if (key === 'c' || key === 'C') { let a = lum, b = lumOld; wipe(); lum = a; lumOld = b; }
  if (key === UP_ARROW) forceGain = Math.min(forceGain + 0.1, 2);
  if (key === DOWN_ARROW) forceGain = Math.max(forceGain - 0.1, 0.1);
  if (key === RIGHT_ARROW) sense = Math.min(sense + 3, 60);
  if (key === LEFT_ARROW) sense = Math.max(sense - 3, 6);
}

// ---------- やってみよう ----------
// 1. 手をゆっくり横に動かす／すばやくふる。けむりの流れる向きと勢いはどう変わる？
// 2. 色のついた物（ペン、スマホの画面）をふる。その色の染料が出る
// 3. 感度（左右キー）を下げるとノイズでも動く。上げると大きな動きだけに反応する
// 4. ν を 0.05 にすると、ねばい液体の中で動いているようになる
// 5. fade を 0.999 にして絵を残す。14 の墨流しのように、体で模様を描こう
// 6. cameraForces の中で v[n] -= 0.05 を足すと、動いた所から上へ「炎」のように立ちのぼる


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
