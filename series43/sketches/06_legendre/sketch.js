// ============================================
// 06 ルジャンドル変換
// 凸関数 f に対して  f*(p) = sup_x ( p x − f(x) )
//   「傾き p の直線 y = px をどこまで下げれば f に接するか」：接線の切片が −f*(p)
//   f** = f（凸なら元に戻る）。凸でない f は f** が「凸包」になる
// マウス左右 = p / 1〜6 = 関数 / D = f** を重ねる / N = ノイズ凸関数を作り直す
// ============================================

let fNo = 1;
let XR = 3, PR = 4;                 // ★ x の範囲 ±XR、p の範囲 ±PR
let N = 240;                        // ★ 標本の数
let xs = [], fx = [], ps = [], fstar = [];
let showDD = false;
let noiseF = [];
let fnames = ['', 'x²/2', 'eˣ', 'x⁴/4', '|x|', 'ノイズ凸関数', 'x⁴/4 − x²（凸でない）'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  makeNoiseF();
  rebuild();
}
// ★ 関数の定義
function fval(x) {
  if (fNo === 1) return x * x / 2;
  if (fNo === 2) return Math.exp(x);
  if (fNo === 3) return x ** 4 / 4;
  if (fNo === 4) return Math.abs(x);
  if (fNo === 5) { let i = constrain(Math.round((x + XR) / (2 * XR) * (N - 1)), 0, N - 1); return noiseF[i]; }
  return x ** 4 / 4 - x * x;
}
// f'' > 0 のランダムな値を 2 回積分して凸関数を作る
function makeNoiseF() {
  let d2 = [], d1 = [0], f = [0];
  for (let i = 0; i < N; i++) d2.push(0.2 + 2.5 * Math.pow(Math.abs(Math.sin(i * 0.37 + Math.random() * 0.3)), 2) * Math.random());
  let h = 2 * XR / (N - 1);
  for (let i = 1; i < N; i++) d1.push(d1[i - 1] + d2[i] * h);
  let mid = d1[Math.floor(N / 2)];
  for (let i = 1; i < N; i++) f.push(f[i - 1] + (d1[i] - mid) * h);
  let mn = Math.min(...f);
  noiseF = f.map((v) => v - mn);
}
function rebuild() {
  xs = []; fx = []; ps = []; fstar = [];
  for (let i = 0; i < N; i++) { let x = -XR + 2 * XR * i / (N - 1); xs.push(x); fx.push(fval(x)); }
  for (let i = 0; i < N; i++) { let p = -PR + 2 * PR * i / (N - 1); ps.push(p); fstar.push(conj(p).val); }
}
// ★ 共役：sup_x (p x − f(x)) を標本から求める
function conj(p) {
  let best = -Infinity, bi = 0;
  for (let i = 0; i < N; i++) { let v = p * xs[i] - fx[i]; if (v > best) { best = v; bi = i; } }
  return { val: best, x: xs[bi], edge: bi === 0 || bi === N - 1 };
}
function biconj(x) { let best = -Infinity; for (let i = 0; i < N; i++) best = Math.max(best, ps[i] * x - fstar[i]); return best; }

function panels() {
  let w = (width - 60) / 2, h = height - 150, y = 100;
  return { L: { x: 20, y, w, h, xr: XR, yr: 6 }, R: { x: 40 + w, y, w, h, xr: PR, yr: 10 } };
}
function toS(P, x, y) { return { x: P.x + (x + P.xr) / (2 * P.xr) * P.w, y: P.y + P.h * 0.75 - y / P.yr * P.h * 0.65 }; }
function drawFrame(P, title) {
  noFill(); stroke(0, 0, 35); strokeWeight(1); rect(P.x, P.y, P.w, P.h);
  let o = toS(P, 0, 0); stroke(0, 0, 30); line(P.x, o.y, P.x + P.w, o.y); line(o.x, P.y, o.x, P.y + P.h);
  noStroke(); fill(0, 0, 70); textSize(14); text(title, P.x + 10, P.y + 22);
}
// 曲線を描く（枠の外に出た部分は切って描かない）
function plot(P, xsArr, ysArr, hue, w, dash) {
  if (dash) drawingContext.setLineDash([6, 6]);
  noFill(); stroke(hue, 70, 100); strokeWeight(w);
  let drawing = false;
  for (let i = 0; i < xsArr.length; i++) {
    let y = ysArr[i], ok = isFinite(y) && y > -P.yr * 0.36 && y < P.yr * 0.78;
    if (ok) { if (!drawing) { beginShape(); drawing = true; } let s = toS(P, xsArr[i], y); vertex(s.x, s.y); }
    else if (drawing) { endShape(); drawing = false; }
  }
  if (drawing) endShape();
  drawingContext.setLineDash([]);
}

function draw() {
  background(250, 40, 10);
  let { L, R } = panels();
  let p = map(constrain(mouseX, L.x, L.x + L.w), L.x, L.x + L.w, -PR, PR);
  if (mouseX > R.x) p = map(constrain(mouseX, R.x, R.x + R.w), R.x, R.x + R.w, -PR, PR);
  let cj = conj(p);
  drawFrame(L, 'f(x) = ' + fnames[fNo] + '　と直線 y = px　（p = ' + nf(p, 1, 2) + '）');
  drawFrame(R, 'f*(p) = sup( px − f(x) )');

  // 左：f、直線 px、接線 px − f*(p)
  plot(L, xs, fx, 10, 3, false);
  if (showDD) plot(L, xs, xs.map(biconj), 55, 3, true);
  let s1 = toS(L, -XR, -p * XR), s2 = toS(L, XR, p * XR);
  stroke(180, 60, 100, 50); strokeWeight(1.5); drawingContext.setLineDash([4, 6]); line(s1.x, s1.y, s2.x, s2.y); drawingContext.setLineDash([]);
  let t1 = toS(L, -XR, -p * XR - cj.val), t2 = toS(L, XR, p * XR - cj.val);
  stroke(180, 70, 100); strokeWeight(2.5); line(t1.x, t1.y, t2.x, t2.y);
  // x* と縦のギャップ、切片
  let sx = toS(L, cj.x, constrain(fval(cj.x), -L.yr * 0.36, L.yr * 0.78)), sl = toS(L, cj.x, constrain(p * cj.x, -L.yr * 0.36, L.yr * 0.78));
  stroke(55, 90, 100); strokeWeight(3); line(sx.x, sx.y, sl.x, sl.y);
  noStroke(); fill(55, 90, 100); circle(sx.x, sx.y, 12);
  let ic = toS(L, 0, constrain(-cj.val, -L.yr * 0.36, L.yr * 0.78)); fill(180, 70, 100); circle(ic.x, ic.y, 10);
  fill(0, 0, 100); textSize(13); text('切片 = −f*(p) = ' + nf(-cj.val, 1, 2), ic.x + 10, ic.y + (cj.val > 0 ? 18 : -8));
  text('x* = ' + nf(cj.x, 1, 2) + (cj.edge ? '（端：sup が範囲の外 → f* = ∞ 寄り）' : ''), sx.x + 10, sx.y - 10);
  text('px − f(x) の最大 = ' + nf(cj.val, 1, 2), sl.x + 10, sl.y + 16);

  // 右：f* と現在の p
  plot(R, ps, fstar, 180, 3, false);
  let sp = toS(R, p, constrain(cj.val, -R.yr * 0.36, R.yr * 0.78));
  stroke(180, 60, 100, 50); strokeWeight(1); line(sp.x, R.y, sp.x, R.y + R.h);
  noStroke(); fill(55, 90, 100); circle(sp.x, sp.y, 12);
  fill(0, 0, 100); textSize(13); text('f*(' + nf(p, 1, 2) + ') = ' + nf(cj.val, 1, 2), sp.x + 10, sp.y - 10);
  if (fNo === 4) { fill(0, 0, 70); textSize(13); text('|x| の共役は |p| ≤ 1 で 0、外では ∞（壁）', R.x + 10, R.y + R.h - 12); }
  if (fNo === 1) { fill(0, 0, 70); textSize(13); text('x²/2 の共役は p²/2：自分自身に戻る（自己双対）', R.x + 10, R.y + R.h - 12); }
  if (fNo === 2) { fill(0, 0, 70); textSize(13); text('eˣ の共役は p ln p − p（p > 0）：エントロピーの形', R.x + 10, R.y + R.h - 12); }

  noStroke(); fill(0, 0, 100); textSize(18);
  text('f = ' + fnames[fNo] + '（1〜6）　p = ' + nf(p, 1, 2) + '（マウス左右）　D：f** を重ねる ' + (showDD ? 'ON（黄の点線）' : 'off') + '　N：ノイズ凸関数を作り直す', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('傾き p の直線を下から f に押しつける。接する高さが −f*(p)。x の世界の「点」が p の世界の「傾き」に、関数が関数に写る双対変換。凸なら f** = f、凸でないと f** は凸包', 20, 68);
}

function keyPressed() {
  if (key >= '1' && key <= '6') { fNo = int(key); rebuild(); }
  if (key === 'd' || key === 'D') showDD = !showDD;
  if (key === 'n' || key === 'N') { makeNoiseF(); if (fNo === 5) rebuild(); }
}

// ---------- やってみよう ----------
// 1. f = x²/2 で p を動かし、接点 x* = p になることを確かめる。f* も x²/2 と同じ形
// 2. |x|（4）で p を ±1 の外へ出すと sup が「端」になる。f* が ∞ になる意味は？
// 3. 6（凸でない）で D を押す。f** が f の下側をまっすぐ埋める（凸包）のはなぜ？
// 4. 物理：f = 運動エネルギー mv²/2 の共役は p²/2m（ラグランジアン → ハミルトニアン）。m を入れてみよう
