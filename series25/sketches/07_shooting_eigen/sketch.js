// ============================================
// 07 固有値を数値で求める（シューティング法）
// 好きな V(x) をマウスで描くと、その中で許されるエネルギー（固有値）を探して ψn を描く
//   ψ'' = 2(V − E) ψ を左端から Numerov 法で積分 → 節（ψ = 0 の点）の数を数える → 二分法で E を絞りこむ
// ドラッグ = V(x) を描く / 1 = 調和 / 2 = 箱 / 3 = 二重井戸 / 4 = 周期的な山（結晶） / 5 = 斜面 / C = 平らに / ↑↓ = 求める準位の数 / P = ψ ⇔ |ψ|²
// ============================================

const N = 400;              // ★ 格子点の数
const XR = 4;               // x の範囲 −4 〜 4（両端は無限に高い壁）
const VMAX = 10;            // 描ける V の最大
let h = (2 * XR) / (N - 1);
let V = new Float64Array(N);
let levels = [];            // {E, psi}
let nLevels = 5;            // ★ 求める準位の数
let showProb = false;
let dirty = true, lastJ = -1;
let iters = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  preset(1);
}
function xAt(j) { return -XR + j * h; }

function preset(k) {
  for (let j = 0; j < N; j++) {
    let x = xAt(j), v = 0;
    if (k === 1) v = 0.5 * x * x;
    if (k === 3) v = 0.35 * sq(x * x - 4);
    if (k === 4) v = 3 * (1 - cos(PI * 2 * x)) / 2 + 0.02;
    if (k === 5) v = 1.2 * (x + XR);
    V[j] = min(v, VMAX);
  }
  dirty = true;
}

// ★ Numerov 法で左端（ψ = 0）から右端まで積分し、ψ と「符号が変わった回数」を返す
//   ψ(j+1) = [ (12 − 10 f(j)) ψ(j) − f(j−1) ψ(j−1) ] / f(j+1)、 f = 1 + h²/12 · 2(E − V)
function shoot(E, keep) {
  let psi = keep ? new Float64Array(N) : null;
  let f = (j) => 1 + (h * h / 12) * 2 * (E - V[j]);
  let p0 = 0, p1 = 1e-6, nodes = 0;
  if (keep) { psi[0] = p0; psi[1] = p1; }
  for (let j = 1; j < N - 1; j++) {
    let p2 = ((12 - 10 * f(j)) * p1 - f(j - 1) * p0) / f(j + 1);
    if ((p2 < 0 && p1 > 0) || (p2 > 0 && p1 < 0)) nodes++;
    if (abs(p2) > 1e12) {                      // 大きくなりすぎたら全体を縮める（形は同じ）
      p1 *= 1e-12; p2 *= 1e-12;
      if (keep) for (let i = 0; i <= j; i++) psi[i] *= 1e-12;
    }
    p0 = p1; p1 = p2;
    if (keep) psi[j + 1] = p2;
  }
  iters++;
  return { nodes, psi };
}

// ★ n 番目の固有値：右端までの符号変化の数 = E より下にある固有値の数（スツルムの定理）
//   その数が n 以下 → E は低すぎ、n+1 以上 → 高すぎ。二分法で 50 回
function findLevel(n) {
  let lo = Infinity;
  for (let j = 0; j < N; j++) lo = min(lo, V[j]);
  let hi = lo + 2;
  while (shoot(hi, false).nodes <= n && hi < 2000) hi = lo + (hi - lo) * 2;
  for (let it = 0; it < 50; it++) {
    let mid = (lo + hi) / 2;
    if (shoot(mid, false).nodes <= n) lo = mid; else hi = mid;
  }
  let E = (lo + hi) / 2, psi = shoot(E, true).psi;
  // 右の「入れない領域」（V > E）で |ψ| がまた大きくなる所は、E の誤差で指数関数的に伸びた分なので 0 にする
  let jt = N - 1;
  while (jt > 0 && V[jt] > E) jt--;
  let jm = N - 1, pm = Infinity;
  for (let j = jt; j < N; j++) if (abs(psi[j]) < pm) { pm = abs(psi[j]); jm = j; }
  for (let j = jm; j < N; j++) psi[j] = 0;
  // ψ を正規化（∫ψ² dx = 1）
  let s = 0;
  for (let j = 0; j < N; j++) s += psi[j] * psi[j] * h;
  for (let j = 0; j < N; j++) psi[j] /= sqrt(s);
  return { E, psi };
}

function solve() {
  iters = 0;
  levels = [];
  for (let n = 0; n < nLevels; n++) levels.push(findLevel(n));
  dirty = false;
}

function draw() {
  background(30, 25, 10);
  // マウスで V を描く（前の点との間も埋める）
  let left = 60, w = width - 380, base = height - 60, eU = (height - 200) / VMAX;
  if (mouseIsPressed && mouseY > 100 && mouseX > left && mouseX < left + w) {
    let j = constrain(round(((mouseX - left) / w) * (N - 1)), 0, N - 1);
    let v = constrain((base - mouseY) / eU, 0, VMAX);
    let a = lastJ < 0 ? j : lastJ;
    for (let k = min(a, j); k <= max(a, j); k++) V[k] = v;
    for (let k = max(0, j - 3); k <= min(N - 1, j + 3); k++) V[k] = v;
    lastJ = j; dirty = true;
  } else lastJ = -1;
  if (dirty && !mouseIsPressed) solve();

  let sx = (j) => left + (j / (N - 1)) * w;
  // V(x)
  noStroke(); fill(0, 0, 28);
  beginShape(); vertex(left, base);
  for (let j = 0; j < N; j++) vertex(sx(j), base - V[j] * eU);
  vertex(left + w, base); endShape(CLOSE);
  stroke(0, 0, 70); strokeWeight(3); line(left, base, left, 100); line(left + w, base, left + w, 100);
  // 準位と ψn
  if (!dirty) for (let n = 0; n < levels.length; n++) {
    let lv = levels[n], y = base - lv.E * eU;
    if (y < 90) continue;
    stroke(n * 55 + 10, 70, 100, 40); strokeWeight(1); line(left, y, left + w, y);
    noFill(); stroke(n * 55 + 10, 70, 100); strokeWeight(2);
    beginShape();
    for (let j = 0; j < N; j += 2) vertex(sx(j), y - (showProb ? lv.psi[j] * lv.psi[j] * 30 : lv.psi[j] * 40));
    endShape();
  }

  // 右：数値
  let rx = width - 290;
  noStroke(); fill(0, 0, 100); textSize(16); text('見つかった固有値', rx, 120);
  for (let n = 0; n < levels.length && !dirty; n++) {
    fill(n * 55 + 10, 70, 100); text('E' + n + ' = ' + nf(levels[n].E, 1, 4), rx, 152 + n * 26);
  }
  fill(0, 0, 60); textSize(13);
  text('調和（1）なら理論 En = n + 1/2', rx, 152 + nLevels * 26 + 10);
  text('箱（2）なら En = (n+1)² π² / (2·8²)', rx, 152 + nLevels * 26 + 30);
  text('= ' + nf(PI * PI / 128, 1, 4) + ' × (n+1)²', rx, 152 + nLevels * 26 + 50);
  text('積分した回数：' + iters, rx, 152 + nLevels * 26 + 80);

  fill(0, 0, 100); textSize(18);
  text('ドラッグ：V を描く　1〜5：例　C：平ら　↑↓ 準位の数 ' + nLevels + '　P：' + (showProb ? '|ψ|²' : 'ψ'), 20, 40);
  fill(0, 0, 60); textSize(15);
  text('n 番目の固有関数には節がちょうど n 個。E を上げ下げして「右端で ψ = 0 になる E」だけが許される → エネルギーはとびとびになる', 20, 68);
}

function keyPressed() {
  if (key >= '1' && key <= '5') preset(int(key));
  if (key === 'c' || key === 'C') preset(2);
  if (key === UP_ARROW) { nLevels = min(10, nLevels + 1); dirty = true; }
  if (key === DOWN_ARROW) { nLevels = max(1, nLevels - 1); dirty = true; }
  if (key === 'p' || key === 'P') showProb = !showProb;
}

// ---------- やってみよう ----------
// 1. 1（調和）で E0〜E4 が 0.5, 1.5, 2.5… になっているか確かめよう。ずれは N を増やすと小さくなる
// 2. 3（二重井戸）で E0 と E1 がほとんど同じ値になる。この差がトンネルの速さ（03 の 5、13 の 3）
// 3. 4（周期的な山）で準位を 10 にすると、近い準位がかたまって並ぶ = 結晶のエネルギーバンドのはじまり
// 4. 箱の真ん中に細い壁を描いて、壁を高くしていくと準位がどう 2 つずつ組になるか観察しよう
