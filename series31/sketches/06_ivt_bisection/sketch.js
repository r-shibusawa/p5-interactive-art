// ============================================
// 06 中間値の定理と 1 次元のブラウワー
// [0,1] を [0,1] の中へ「ペンを離さずに」写す f は必ず不動点を持つ：g(x) = f(x) − x は g(0) ≥ 0、g(1) ≤ 0 → 途中で 0（中間値の定理）
//   証明がそのまま探し方になる：真ん中の符号を見て半分を捨てる（二分法）。1 回で誤差が半分
// ドラッグ = 曲線を描く（左から右へ）/ スペース = 二分法を 1 回 / A = 自動 / J = ペンを離すと「跳ぶ」/ R = ランダムな曲線 / C = 消す
// ============================================

let NB = 240;               // ★ 曲線を何本の縦の区間で持つか
let vals = [];              // 描いた値（未定義は null）
let Fv = [];                // すき間を埋めた値
let jumpMode = false;       // true：ペンを離した所はつながずに跳ぶ（連続でない）
let a = 0, b = 1, hist = [];
let auto = false;
let SZ, gx, gy;
let lastBin = -1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  SZ = min(width * 0.46, height - 170); gx = 60; gy = 100;
  randomCurve();
}

function randomCurve() {
  let p = [random(TWO_PI), random(TWO_PI)], k = [random(2, 5), random(5, 11)];
  for (let i = 0; i < NB; i++) { let x = i / (NB - 1); vals[i] = constrain(0.5 + 0.3 * Math.sin(k[0] * x + p[0]) + 0.15 * Math.sin(k[1] * x + p[1]), 0, 1); }
  rebuild();
}
// すき間を埋める：ふつうは直線でつなぐ（連続）、J のときは左の値のまま（跳ぶ）
function rebuild() {
  let idx = []; for (let i = 0; i < NB; i++) if (vals[i] !== null && vals[i] !== undefined) idx.push(i);
  if (idx.length === 0) { for (let i = 0; i < NB; i++) Fv[i] = 0.5; }
  else {
    for (let i = 0; i < NB; i++) {
      if (vals[i] !== null && vals[i] !== undefined) { Fv[i] = vals[i]; continue; }
      let L = -1, R = -1;
      for (let j of idx) { if (j < i) L = j; if (j > i && R < 0) R = j; }
      if (L < 0) Fv[i] = vals[R]; else if (R < 0) Fv[i] = vals[L];
      else Fv[i] = jumpMode ? vals[L] : lerp(vals[L], vals[R], (i - L) / (R - L));
    }
  }
  a = 0; b = 1; hist = [];
}
// ★ f(x)：連続モードは直線でつなぐ、跳ぶモードは区間ごとに一定の値
function fv(x) {
  let u = constrain(x, 0, 1) * (NB - 1);
  if (jumpMode) return Fv[round(u)];
  let i = min(floor(u), NB - 2);
  return lerp(Fv[i], Fv[i + 1], u - i);
}
function g(x) { return fv(x) - x; }

function bisect() {
  if (b - a < 1e-12) return;
  let m = (a + b) / 2, gm = g(m);
  hist.push({ a, b, m, gm });
  if (gm === 0) { a = b = m; return; }
  if (g(a) * gm < 0) b = m; else a = m;     // 符号が変わる側の半分を残す
}

function X(x) { return gx + x * SZ; }
function Y(y) { return gy + SZ - y * SZ; }

function draw() {
  background(230, 30, 11);
  if (auto && frameCount % 30 === 0 && hist.length < 30) bisect();
  // 残っている区間 [a, b] を帯で
  noStroke(); fill(45, 90, 100, 18); rect(X(a), gy, max(2, (b - a) * SZ), SZ);
  noFill(); stroke(0, 0, 40); strokeWeight(1); rect(gx, gy, SZ, SZ);
  stroke(0, 0, 70, 70); strokeWeight(2); line(X(0), Y(0), X(1), Y(1));
  // 曲線（g の符号で色分け：上 = f(x) > x、下 = f(x) < x）
  strokeWeight(3);
  for (let i = 0; i < 400; i++) {
    let x1 = i / 400, x2 = (i + 1) / 400;
    stroke(g(x1) >= 0 ? 190 : 330, 70, 100);
    line(X(x1), Y(fv(x1)), X(x2), Y(fv(x2)));
  }
  // 端の条件
  noStroke(); fill(190, 70, 100); circle(X(0), Y(fv(0)), 10);
  fill(330, 70, 100); circle(X(1), Y(fv(1)), 10);
  // 二分法の点
  for (let i = 0; i < hist.length; i++) {
    let h = hist[i];
    stroke(0, 0, 100, 30 + 70 * i / hist.length); strokeWeight(1);
    line(X(h.m), Y(0), X(h.m), Y(fv(h.m)));
  }
  let m = (a + b) / 2;
  noStroke(); fill(45, 90, 100); circle(X(m), Y(fv(m)), 12);
  fill(0, 0, 60); textSize(13);
  text('0', gx - 14, gy + SZ + 4); text('1', gx + SZ - 4, gy + SZ + 18); text('1', gx - 14, gy + 6);

  // 右：二分法の表
  let tx = gx + SZ + 50, ty = gy + 10;
  fill(0, 0, 100); textSize(16);
  text('n　　a　　　　　 b　　　　　 g(真ん中)', tx, ty);
  let n0 = max(0, hist.length - 14);
  textSize(14);
  for (let i = n0; i < hist.length; i++) {
    let h = hist[i];
    fill(h.gm >= 0 ? 190 : 330, 60, 100);
    text((i + 1) + '　' + nf(h.a, 1, 8) + '　' + nf(h.b, 1, 8) + '　' + (h.gm >= 0 ? '+' : '−') + nf(abs(h.gm), 1, 6), tx, ty + 24 + (i - n0) * 21);
  }
  let by = ty + 24 + 14 * 21 + 20;
  fill(0, 0, 100); textSize(16);
  text('区間の幅 b − a = 2⁻ⁿ = ' + (b - a).toExponential(2) + '　→ 真ん中 ' + nf(m, 1, 8), tx, by);
  let stuck = (b - a) < 1e-5 && abs(g(m)) > 0.01;
  fill(stuck ? 0 : 140, 80, 100);
  text(stuck ? '区間は縮んだのに |g| が 0 にならない → 不動点ではなく「跳び」にたどり着いた'
             : '|g(真ん中)| = ' + nf(abs(g(m)), 1, 8) + (hist.length > 0 ? '　（1 回で幅が半分。10 回で約 1/1000）' : ''), tx, by + 28);
  fill(0, 0, 60); textSize(14);
  text('水色 = f(x) > x（右へ動く）、桃色 = f(x) < x（左へ動く）。左端は必ず水色、右端は必ず桃色', tx, by + 60);
  text('ペンを離さずに水色から桃色へ行くには、対角線（f(x) = x）を通るしかない', tx, by + 84);

  noStroke(); fill(0, 0, 100); textSize(18);
  text('ドラッグ：描く　スペース：二分法　A：自動 ' + (auto ? 'ON' : 'off') + '　J：跳ぶモード ' + (jumpMode ? 'ON（連続でない）' : 'off（連続）') + '　R：ランダム　C：消す　n = ' + hist.length, 20, 40);
  fill(0, 0, 60); textSize(15);
  text('曲線は 0〜1 の箱からはみ出せない（f は [0,1] → [0,1]）。J をオンにしてペンを離しながら描くと、不動点のない f が作れる', 20, 68);
}

function mousePressed() { lastBin = -1; addPoint(); }
function mouseDragged() { addPoint(); }
function addPoint() {
  if (mouseX < gx - 10 || mouseX > gx + SZ + 10 || mouseY < gy - 30 || mouseY > gy + SZ + 30) return;
  let i = round(constrain((mouseX - gx) / SZ, 0, 1) * (NB - 1));
  let v = constrain((gy + SZ - mouseY) / SZ, 0, 1);
  if (lastBin >= 0 && lastBin !== i) {
    // ドラッグ中はすき間を直線で埋める（ペンを離していない）
    let s0 = Math.sign(i - lastBin), v0 = vals[lastBin];
    for (let j = lastBin + s0; j !== i; j += s0) vals[j] = lerp(v0, v, (j - lastBin) / (i - lastBin));
  }
  vals[i] = v; lastBin = i;
  rebuild();
}
function keyPressed() {
  if (key === ' ') bisect();
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'j' || key === 'J') { jumpMode = !jumpMode; rebuild(); }
  if (key === 'r' || key === 'R') randomCurve();
  if (key === 'c' || key === 'C') { vals = []; for (let i = 0; i < NB; i++) vals[i] = null; rebuild(); }
}

// ---------- やってみよう ----------
// 1. C で消してから、対角線を 5 回またぐ曲線を描こう。二分法はどの不動点にたどり着く？ それはなぜ？
// 2. J をオンにして、左半分は上、右半分は下に「ペンを離して」描く。対角線に触れない f を作れたら二分法を走らせる
// 3. 10 回で幅は 1/1024、20 回で約 100 万分の 1。小数 6 桁の精度には何回要る？
// 4. 2 次元（07）では「符号」の代わりに何を数えればよいだろう？（ヒント：回る回数）
