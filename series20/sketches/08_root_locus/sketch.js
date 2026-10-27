// ============================================
// 08 根軌跡（ゲイン K を変えると極はどう動くか）
// フィードバック u = K (r − y) をかけると、閉ループの極は 1 + K P(s) = 0 の解
//   K を 0 から大きくしていくと、極は開ループの極から出発して動いていく（根軌跡）
//   3 次のプラントでは、K が大きいと極が虚軸を越えて右半面へ = 不安定
// 左右キー = K / 1〜3 でプラント
// ============================================

let plant = 1;
let K = 5; // ★ フィードバックゲイン
let num = [1], den = [1]; // 開ループ P(s) の分子・分母（昇べき）
let locus = []; // [{K, roots:[[re,im],…]}]
let Kcrit = null;
let stepResp = [], stable = true, clPoles = [], olPoles = [], olZeros = [];
let names = ['', 'P = 1/((s+1)(s+2)(s+3))', 'P = 1/(s(s+1)(s+2))　（積分器つき）', 'P = (s+4)/((s+1)(s+2)(s+3))　（零点つき）'];
let planeX, planeY, planeW, planeH, sigRange = [-8, 3], omRange = [-8, 8];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  makePlant();
}

function makePlant() {
  if (plant === 1) { num = [1]; den = polyMul([1, 1], polyMul([2, 1], [3, 1])); }
  else if (plant === 2) { num = [1]; den = polyMul([0, 1], polyMul([1, 1], [2, 1])); }
  else { num = [4, 1]; den = polyMul([1, 1], polyMul([2, 1], [3, 1])); }
  // ★ 根軌跡：K を対数で 0.01 〜 500 まで動かして、1 + K P(s) = 0 の根を集める
  locus = []; Kcrit = null;
  for (let i = 0; i <= 300; i++) {
    let Ki = pow(10, map(i, 0, 300, -2, 2.7));
    let roots = polyRoots(polyAdd(den, polyScale(num, Ki)));
    locus.push({ K: Ki, roots });
    if (Kcrit === null && max(...roots.map((p) => p[0])) > 0) Kcrit = Ki;
  }
  olPoles = polyRoots(den); olZeros = num.length > 1 ? polyRoots(num) : [];
  updateK();
}

function updateK() {
  let charPoly = polyAdd(den, polyScale(num, K));
  clPoles = polyRoots(charPoly);
  stable = max(...clPoles.map((p) => p[0])) < 0;
  stepResp = stepResponse(polyScale(num, K), charPoly, 10);
}

function draw() {
  background(230, 30, 10);
  planeX = width * 0.05; planeY = height * 0.18; planeW = width * 0.42; planeH = height * 0.66;
  // ---- s 平面
  noStroke(); fill(120, 50, 30, 30); rect(planeX, planeY, sx(0) - planeX, planeH);
  fill(0, 60, 40, 30); rect(sx(0), planeY, planeX + planeW - sx(0), planeH);
  stroke(0, 0, 70); strokeWeight(2);
  line(sx(0), planeY, sx(0), planeY + planeH); line(planeX, sy(0), planeX + planeW, sy(0));
  // 軌跡（K が小さい = 暗い、大きい = 明るい）
  noStroke();
  for (let i = 0; i < locus.length; i++) {
    fill(200, 60, map(i, 0, locus.length, 40, 100));
    for (let p of locus[i].roots) if (inPlane(p)) circle(sx(p[0]), sy(p[1]), 4);
  }
  // 開ループの極（×）と零点（○）
  stroke(0, 0, 100); strokeWeight(3);
  for (let p of olPoles) { let X = sx(p[0]), Y = sy(p[1]); line(X - 8, Y - 8, X + 8, Y + 8); line(X - 8, Y + 8, X + 8, Y - 8); }
  noFill();
  for (let z of olZeros) circle(sx(z[0]), sy(z[1]), 16);
  // いまの閉ループ極
  for (let p of clPoles) {
    noStroke(); fill(p[0] < 0 ? 120 : 0, 80, 100); circle(sx(p[0]), sy(p[1]), 14);
    fill(0, 0, 100); textSize(12); text(nf(p[0], 1, 2) + (abs(p[1]) > 1e-6 ? ' ± ' + nf(abs(p[1]), 1, 2) + 'j' : ''), sx(p[0]) + 10, sy(p[1]) - 8);
  }
  noStroke(); fill(0, 0, 70); textSize(13);
  text('× 開ループの極（K = 0 の出発点）　○ 零点（K → ∞ の行き先）　● いまの閉ループ極', planeX + 10, planeY + planeH - 10);

  // ---- ステップ応答
  let gx = width * 0.52, gy = height * 0.2, gw = width * 0.44, gh = height * 0.4;
  let peakAbs = 2;
  for (let v of stepResp) peakAbs = max(peakAbs, abs(v));
  peakAbs = min(peakAbs, 20);
  noStroke(); fill(0, 0, 14); rect(gx, gy, gw, gh, 6);
  stroke(0, 0, 30); strokeWeight(1);
  line(gx, map(0, -peakAbs, peakAbs, gy + gh, gy), gx + gw, map(0, -peakAbs, peakAbs, gy + gh, gy));
  stroke(45, 90, 100, 60); line(gx, map(1, -peakAbs, peakAbs, gy + gh, gy), gx + gw, map(1, -peakAbs, peakAbs, gy + gh, gy));
  stroke(stable ? 120 : 0, 80, 100); strokeWeight(2.5); noFill();
  beginShape();
  for (let i = 0; i < stepResp.length; i++) vertex(map(i, 0, stepResp.length - 1, gx, gx + gw), map(constrain(stepResp[i], -peakAbs, peakAbs), -peakAbs, peakAbs, gy + gh, gy));
  endShape();
  noStroke(); fill(0, 0, 70); textSize(13);
  text('閉ループのステップ応答（0〜10 秒）　黄 = 目標 1　縦 ±' + nf(peakAbs, 1, 1), gx + 8, gy + 18);

  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text('K = ' + nf(K, 1, 2) + '（左右キー）　' + names[plant] + '（1〜3）　' + (stable ? '安定' : '不安定！'), 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('閉ループ T = KP/(1 + KP)。極は 1 + KP(s) = 0 の解。K を上げると速くなるが、虚軸に近づいてゆれ、越えると発散' + (Kcrit ? '　虚軸を越える K ≈ ' + nf(Kcrit, 1, 1) : '　この範囲では不安定にならない'), 20, 68);
  fill(0, 0, 60);
  text('軌跡は実軸の極から出発して合流し、枝分かれして上下へ。零点があると軌跡を引き寄せて安定にしやすい（3）。積分器（2）は低い K でも虚軸へ', gx, gy + gh + 30);
  text('定常値 = KP(0)/(1 + KP(0))：1 では K/(6 + K)（偏差が残る）、2 では 1（積分器があるので偏差 0）', gx, gy + gh + 54);
}

function sx(re) { return map(re, sigRange[0], sigRange[1], planeX, planeX + planeW); }
function sy(im) { return map(im, omRange[0], omRange[1], planeY + planeH, planeY); }
function inPlane(p) { return p[0] > sigRange[0] && p[0] < sigRange[1] && p[1] > omRange[0] && p[1] < omRange[1]; }

function keyPressed() {
  if (key === RIGHT_ARROW) { K = min(K * 1.15, 500); updateK(); }
  if (key === LEFT_ARROW) { K = max(K / 1.15, 0.01); updateK(); }
  if (key >= '1' && key <= '3') { plant = int(key); makePlant(); }
}

// ---------- やってみよう ----------
// 1. プラント 1 で K を上げていき、極が虚軸を越える瞬間（K ≈ 60）のステップ応答を見る
// 2. 同じ K で 1 と 3 を比べる。零点がある 3 は不安定にならない。なぜ？（軌跡が零点に吸い寄せられる）
// 3. 2（積分器つき）は K = 6 で限界。でも定常値は 1（偏差なし）。04・05 の話とつながる
// 4. 極が実軸で合流して分かれる点（分岐点）を探す。そこが「ゆれ始める K」


// ==================================================
// ここから下は「多項式と応答の道具」です
// ==================================================
function cmul(a, b) { return [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]]; }
function cdiv(a, b) { let d = b[0] * b[0] + b[1] * b[1] + 1e-30; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; }
function polyMul(a, b) {
  let out = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) out[i + j] += a[i] * b[j];
  return out;
}
function polyAdd(a, b) { let out = []; for (let i = 0; i < max(a.length, b.length); i++) out.push((a[i] || 0) + (b[i] || 0)); return out; }
function polyScale(a, k) { return a.map((v) => v * k); }
function polyEvalC(c, s) {
  let acc = [0, 0];
  for (let i = c.length - 1; i >= 0; i--) acc = [cmul(acc, s)[0] + c[i], cmul(acc, s)[1]];
  return acc;
}
// 多項式の根（Durand–Kerner 法）：昇べきの係数 → [[re, im], …]
function polyRoots(c) {
  let n = c.length - 1;
  while (n > 0 && abs(c[n]) < 1e-12) n--;
  if (n < 1) return [];
  let a = c.slice(0, n + 1).map((v) => v / c[n]);
  let roots = [];
  for (let i = 0; i < n; i++) roots.push([0.4 * Math.cos(2 * Math.PI * i / n + 0.3), 0.9 * Math.sin(2 * Math.PI * i / n + 0.3)]);
  for (let it = 0; it < 200; it++) {
    let maxMove = 0;
    for (let i = 0; i < n; i++) {
      let numer = polyEvalC(a, roots[i]), denom = [1, 0];
      for (let j = 0; j < n; j++) if (j !== i) denom = cmul(denom, [roots[i][0] - roots[j][0], roots[i][1] - roots[j][1]]);
      let d = cdiv(numer, denom);
      roots[i] = [roots[i][0] - d[0], roots[i][1] - d[1]];
      maxMove = max(maxMove, abs(d[0]) + abs(d[1]));
    }
    if (maxMove < 1e-10) break;
  }
  return roots.map((r) => [r[0], abs(r[1]) < 1e-7 ? 0 : r[1]]);
}
// ステップ応答：伝達関数 b(s)/a(s)（可制御正準形で積分、T 秒）
function stepResponse(b, a, T) {
  let n = a.length - 1, an = a[n];
  let z = new Array(n).fill(0), out = [];
  let h = 0.002, steps = round(T / h), every = max(1, floor(steps / 500));
  for (let k = 0; k < steps; k++) {
    let top = 1; // 入力 u = 1
    for (let i = 0; i < n; i++) top -= a[i] * z[i];
    top /= an;
    for (let i = 0; i < n - 1; i++) z[i] += z[i + 1] * h;
    z[n - 1] += top * h;
    let y = 0;
    for (let i = 0; i < n && i < b.length; i++) y += b[i] * z[i];
    for (let i = 0; i < n; i++) z[i] = constrain(z[i], -1e6, 1e6);
    if (k % every === 0) out.push(constrain(y, -1e6, 1e6));
  }
  return out;
}
