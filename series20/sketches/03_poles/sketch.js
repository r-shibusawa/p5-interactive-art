// ============================================
// 03 極と安定性（s 平面）
// システムの「性格」は極（伝達関数の分母が 0 になる s）で決まる
//   極 p = σ ± jω　→　応答は e^(σt) cos(ωt)
//   σ < 0（左半面）なら消えていく = 安定、σ > 0（右半面）なら育つ = 不安定
// 極をマウスでドラッグ / 1〜3 で極の数（実数 1 つ・複素対・対 + 実数）
// ============================================

let mode = 2; // ★ 1 = 実数極 1 つ、2 = 複素共役の対、3 = 対 + 実数極
let poles = [];
let dragging = -1;
let Tmax = 10; // ★ インパルス応答を計算する時間 [秒]
let resp = [];
let planeX, planeY, planeW, planeH;
let sigRange = [-5, 2], omRange = [-5, 5];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  makePoles();
}

function makePoles() {
  if (mode === 1) poles = [{ re: -1, im: 0 }];
  else if (mode === 2) poles = [{ re: -0.5, im: 2.5 }, { re: -0.5, im: -2.5 }];
  else poles = [{ re: -0.5, im: 2.5 }, { re: -0.5, im: -2.5 }, { re: -2, im: 0 }];
}

function draw() {
  background(230, 30, 10);
  planeX = width * 0.05; planeY = height * 0.18; planeW = width * 0.4; planeH = height * 0.66;
  resp = impulseResponse(poles, Tmax);

  // ---- s 平面
  noStroke(); fill(120, 50, 30, 40); // 左半面 = 安定
  rect(planeX, planeY, sx(0) - planeX, planeH);
  fill(0, 60, 40, 40); // 右半面 = 不安定
  rect(sx(0), planeY, planeX + planeW - sx(0), planeH);
  stroke(0, 0, 40); strokeWeight(1); noFill();
  for (let R = 1; R <= 5; R++) circle(sx(0), sy(0), 2 * (sx(R) - sx(0)));
  stroke(0, 0, 70); strokeWeight(2);
  line(sx(0), planeY, sx(0), planeY + planeH); line(planeX, sy(0), planeX + planeW, sy(0));
  noStroke(); fill(0, 0, 70); textSize(13);
  text('σ（実部）→', planeX + planeW - 80, sy(0) - 8);
  text('jω（虚部）', sx(0) + 8, planeY + 16);
  text('安定（左半面）', planeX + 10, planeY + planeH - 10);
  text('不安定（右半面）', sx(0) + 10, planeY + planeH - 10);
  // 極
  for (let i = 0; i < poles.length; i++) {
    let p = poles[i];
    stroke(p.re < 0 ? 120 : 0, 80, 100); strokeWeight(4);
    let X = sx(p.re), Y = sy(p.im);
    line(X - 10, Y - 10, X + 10, Y + 10); line(X - 10, Y + 10, X + 10, Y - 10);
    noStroke(); fill(0, 0, 100); textSize(14);
    text(nf(p.re, 1, 2) + (p.im >= 0 ? ' + ' : ' − ') + nf(abs(p.im), 1, 2) + 'j', X + 14, Y - 10);
  }

  // ---- インパルス応答（右）
  let gx = width * 0.5, gy = height * 0.2, gw = width * 0.46, gh = height * 0.45;
  let peakAbs = 1;
  for (let v of resp) peakAbs = max(peakAbs, abs(v));
  peakAbs = min(peakAbs, 20);
  noStroke(); fill(0, 0, 14); rect(gx, gy, gw, gh, 6);
  stroke(0, 0, 30); strokeWeight(1); line(gx, gy + gh / 2, gx + gw, gy + gh / 2);
  let maxRe = max(...poles.map((p) => p.re));
  stroke(maxRe < 0 ? 120 : maxRe > 0 ? 0 : 45, 80, 100); strokeWeight(2); noFill();
  beginShape();
  for (let i = 0; i < resp.length; i++) vertex(map(i, 0, resp.length - 1, gx, gx + gw), map(constrain(resp[i], -peakAbs, peakAbs), -peakAbs, peakAbs, gy + gh, gy));
  endShape();
  noStroke(); fill(0, 0, 70); textSize(13);
  text('インパルス応答（0〜' + Tmax + ' 秒）　縦 ±' + nf(peakAbs, 1, 1), gx + 8, gy + 18);

  // ---- 説明
  let verdict = maxRe < -1e-6 ? '安定（消えていく）' : maxRe > 1e-6 ? '不安定（育っていく）' : '限界（ゆれ続ける）';
  let main = poles[0];
  let wn = sqrt(main.re * main.re + main.im * main.im), zeta = wn > 0 ? -main.re / wn : 0;
  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text('極をドラッグ　1〜3 で極の数　いま：' + verdict, 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('p = σ ± jω → e^(σt)·cos(ωt)。σ が左ほど速く消える、ω が大きいほど速くゆれる。' + (mode >= 2 ? '　ωn = |p| = ' + nf(wn, 1, 2) + '　ζ = −σ/|p| = ' + nf(zeta, 1, 2) + '（02 の ζ・ωn と同じ）' : ''), 20, 68);
  fill(0, 0, 60);
  text('原点からの距離 = 速さ（円）、角度 = 減衰比。虚軸の上 = ゆれ続ける（限界）。実軸の上 = ゆれない', gx, gy + gh + 30);
  text('伝達関数 G(s) = 1 / ((s − p1)(s − p2)…)。極は「分母が 0」になる s。制御とは、極を左半面の好きな場所に動かすこと（→ 08・10）', gx, gy + gh + 54);
}

// 画面座標 ↔ s 平面
function sx(re) { return map(re, sigRange[0], sigRange[1], planeX, planeX + planeW); }
function sy(im) { return map(im, omRange[0], omRange[1], planeY + planeH, planeY); }

function mousePressed() {
  dragging = -1;
  for (let i = 0; i < poles.length; i++) if (dist(mouseX, mouseY, sx(poles[i].re), sy(poles[i].im)) < 25) dragging = i;
}
function mouseDragged() {
  if (dragging < 0) return;
  let re = constrain(map(mouseX, planeX, planeX + planeW, sigRange[0], sigRange[1]), sigRange[0], sigRange[1]);
  let im = constrain(map(mouseY, planeY + planeH, planeY, omRange[0], omRange[1]), omRange[0], omRange[1]);
  let p = poles[dragging];
  if (p.im === 0 && abs(im) < 0.3) im = 0; // 実軸の極は実軸上に留まる
  if (mode >= 2 && dragging < 2) { // 複素対は鏡写し
    if (abs(im) < 0.15) im = 0.15 * (p.im >= 0 ? 1 : -1);
    poles[0] = { re, im: abs(im) }; poles[1] = { re, im: -abs(im) };
  } else poles[dragging] = { re, im: 0 };
}
function mouseReleased() { dragging = -1; }
function keyPressed() {
  if (key >= '1' && key <= '3') { mode = int(key); makePoles(); }
}

// ---------- やってみよう ----------
// 1. 複素対を虚軸（σ = 0）の上に置く → 永遠にゆれる。右へ出すと？
// 2. 対を原点から遠ざける（同じ角度のまま）→ 形は同じで速くなる
// 3. 3 で実数極を −0.2 に置く → ゆっくりの極が「支配的」になり、ゆれが見えにくくなる
// 4. 実数極を右半面に置く → ゆれずに発散する（指数関数的に育つ）


// ==================================================
// ここから下は「応答を計算する道具」です
// ==================================================
// 極のリスト → 分母多項式の係数（昇べき：a[0] + a[1] s + … + s^n）
function polyFromPoles(ps) {
  let a = [1];
  let used = new Array(ps.length).fill(false);
  for (let i = 0; i < ps.length; i++) {
    if (used[i]) continue;
    let f;
    if (abs(ps[i].im) < 1e-9) f = [-ps[i].re, 1]; // (s − p)
    else { // (s − p)(s − p̄) = s² − 2σ s + (σ² + ω²)
      f = [ps[i].re * ps[i].re + ps[i].im * ps[i].im, -2 * ps[i].re, 1];
      for (let j = i + 1; j < ps.length; j++) if (!used[j] && abs(ps[j].re - ps[i].re) < 1e-9 && abs(ps[j].im + ps[i].im) < 1e-9) { used[j] = true; break; }
    }
    used[i] = true;
    a = polyMul(a, f);
  }
  return a;
}
function polyMul(a, b) {
  let out = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) out[i + j] += a[i] * b[j];
  return out;
}
// 1/分母 のインパルス応答：y^(n) = −Σ a_i y^(i)、初期値 y^(n−1)(0) = 1
function impulseResponse(ps, T) {
  let a = polyFromPoles(ps), n = a.length - 1;
  let z = new Array(n).fill(0);
  z[n - 1] = 1;
  let out = [], h = 0.004, steps = round(T / h), every = max(1, floor(steps / 500));
  for (let k = 0; k < steps; k++) {
    let top = 0;
    for (let i = 0; i < n; i++) top -= a[i] * z[i];
    for (let i = 0; i < n - 1; i++) z[i] += z[i + 1] * h;
    z[n - 1] += top * h;
    for (let i = 0; i < n; i++) z[i] = constrain(z[i], -1e6, 1e6);
    if (k % every === 0) out.push(z[0]);
  }
  return out;
}
