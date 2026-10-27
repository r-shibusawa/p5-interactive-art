// ============================================
// 06 多項式の 2 つの表し方：係数か、点の値か
// 次数 n−1 の多項式は「n 個の係数」でも「n 個の点（x, y）」でも 1 つに決まる
// 係数 → 点：ホーナー法で 1 点 Θ(n)。点 → 係数：ラグランジュ補間。
// かけ算は点の値なら点ごとに掛けるだけ（Θ(n)）。だから「速く変換する方法」= FFT（07〜09）が欲しい
// ドラッグ：点を動かす / クリック：点を追加 / D：マウスに近い点を消す / マウスの横位置：ホーナー法で計算する x
// L：ラグランジュの基底を表示 / M：かけ算モード / N：ランダム / C：2 点に戻す
// ============================================

let hornerSpeed = 40; // ★ ホーナー法の 1 段の表示時間（フレーム）

let pts = [], coef = [], ok = true, drag = -1, showL = false, mulMode = false;
let hornerT = 0, lastX0 = null;
let Bpts = [{ x: -1, y: 0.6 }, { x: 0, y: -0.4 }, { x: 1, y: 0.8 }];

function setup() {
  createCanvas(windowWidth, windowHeight);
  textWrap(CHAR);
  pts = [{ x: -0.9, y: -0.3 }, { x: -0.3, y: 0.6 }, { x: 0.3, y: -0.2 }, { x: 0.9, y: 0.5 }];
  interp();
}

function polyMul(p, q) { let r = Array(p.length + q.length - 1).fill(0); for (let i = 0; i < p.length; i++) for (let j = 0; j < q.length; j++) r[i + j] += p[i] * q[j]; return r; }

// ラグランジュ補間：Σ y_k · Π_{j≠k} (x − x_j)/(x_k − x_j) を展開して係数にする
function lagrange(P) {
  let n = P.length, c = Array(n).fill(0);
  for (let k = 0; k < n; k++) {
    let num = [1], den = 1;
    for (let j = 0; j < n; j++) if (j !== k) { num = polyMul(num, [-P[j].x, 1]); den *= P[k].x - P[j].x; }
    if (abs(den) < 1e-9) return null;
    for (let i = 0; i < n; i++) c[i] += (P[k].y * num[i]) / den;
  }
  return c;
}
function interp() { let c = lagrange(pts); ok = !!c; if (c) coef = c; }
function horner(c, x) { let v = 0; for (let k = c.length - 1; k >= 0; k--) v = v * x + c[k]; return v; }

function R() { return { x: 30, y: 110, w: width * 0.58, h: height - 140 }; }
function sx(x) { let r = R(); return r.x + ((x + 1.2) / 2.4) * r.w; }
function sy(y) { let r = R(); return r.y + r.h / 2 - (y / 1.6) * (r.h / 2); }
function wx(px) { let r = R(); return ((px - r.x) / r.w) * 2.4 - 1.2; }
function wy(py) { let r = R(); return -((py - r.y - r.h / 2) / (r.h / 2)) * 1.6; }

function curve(c, col, w) {
  noFill(); stroke(col); strokeWeight(w); beginShape();
  for (let i = 0; i <= 240; i++) { let x = map(i, 0, 240, -1.2, 1.2), v = horner(c, x); if (abs(v) < 1.7) vertex(sx(x), sy(v)); else { endShape(); beginShape(); } }
  endShape();
}

function draw() {
  background(18, 14, 26);
  let r = R();
  fill(235); noStroke(); textSize(26); textAlign(LEFT, BASELINE);
  text('多項式の 2 つの表し方：係数か、点の値か' + (mulMode ? '　［かけ算モード］' : ''), 30, 50);
  textSize(15); fill(150);
  text('ドラッグ：点　クリック：追加　D：消す　マウスの横位置：ホーナー法　L：基底 ' + (showL ? 'ON' : 'OFF') + '　M：かけ算モード　N：ランダム　C：2 点に', 30, 80);
  fill(28, 22, 38); rect(r.x, r.y, r.w, r.h, 12);
  push(); drawingContext.beginPath(); drawingContext.rect(r.x, r.y, r.w, r.h); drawingContext.clip(); // 枠の外は描かない
  stroke(50, 42, 68); strokeWeight(1); line(r.x, sy(0), r.x + r.w, sy(0)); line(sx(0), r.y, sx(0), r.y + r.h);

  if (!ok) { noStroke(); fill(255, 110, 110); textSize(18); text('x が同じ点が 2 つある → 1 つの多項式では通れない（補間できない）', r.x + 20, r.y + 30); }
  if (ok && showL) {
    for (let k = 0; k < pts.length; k++) {
      let num = [1], den = 1;
      for (let j = 0; j < pts.length; j++) if (j !== k) { num = polyMul(num, [-pts[j].x, 1]); den *= pts[k].x - pts[j].x; }
      curve(num.map(v => (v * pts[k].y) / den), color((k * 67) % 360 < 180 ? 120 : 200, 120 + k * 15, 255, 120), 1.5);
    }
  }
  if (ok) curve(coef, color(78, 225, 190), 4);

  let bc = lagrange(Bpts);
  if (mulMode && ok && bc) {
    curve(bc, color(255, 200, 90), 3);
    let cc = polyMul(coef, bc), N = cc.length;
    curve(cc, color(255, 95, 109), 4);
    for (let j = 0; j < N; j++) { // 積の次数 + 1 個の点で、値を掛け算するだけ
      let x = map(j, 0, N - 1, -1, 1), va = horner(coef, x), vb = horner(bc, x), vc = va * vb;
      stroke(255, 95, 109, 120); strokeWeight(1); line(sx(x), sy(0), sx(x), sy(constrain(vc, -1.6, 1.6)));
      noStroke(); fill(255, 95, 109); circle(sx(x), sy(constrain(vc, -1.6, 1.6)), 10);
    }
  }
  for (let i = 0; i < pts.length; i++) { noStroke(); fill(i === drag ? 255 : color(78, 225, 190)); circle(sx(pts[i].x), sy(pts[i].y), 18); }
  pop();

  // ホーナー法：マウスの x で値を計算する
  let px = r.x + r.w + 30, w = width - px - 30, yy = 112;
  textAlign(LEFT, TOP); noStroke();
  fill(235); textSize(18); text('係数表現', px, yy); yy += 28;
  textSize(15); fill(78, 225, 190);
  if (ok) text('A(x) = ' + coef.map((c, k) => (k === 0 ? fmt(c) : (c >= 0 ? ' + ' : ' − ') + fmt(abs(c)) + 'x' + (k > 1 ? sup(k) : ''))).join(''), px, yy, w);
  yy += 52;
  fill(235); textSize(18); text('点・値表現', px, yy); yy += 28;
  textSize(15); fill(200); text(pts.map(p => `(${p.x.toFixed(2)}, ${p.y.toFixed(2)})`).join('  '), px, yy, w); yy += 52;

  let inside = mouseX > r.x && mouseX < r.x + r.w && mouseY > r.y && mouseY < r.y + r.h;
  if (ok && inside) {
    let x0 = wx(mouseX);
    if (lastX0 === null || abs(x0 - lastX0) > 0.02) { hornerT = 0; lastX0 = x0; }
    hornerT++;
    let n = coef.length, stage = min(n - 1, floor(hornerT / hornerSpeed));
    let v = coef[n - 1];
    for (let k = n - 2; k >= n - 1 - stage; k--) v = v * x0 + coef[k];
    stroke(255, 200, 90, 150); strokeWeight(1); line(sx(x0), r.y, sx(x0), r.y + r.h);
    if (stage === n - 1) { noStroke(); fill(255, 200, 90); circle(sx(x0), sy(constrain(v, -1.6, 1.6)), 16); }
    noStroke(); fill(235); textSize(18); text(`ホーナー法で A(${x0.toFixed(2)}) を計算`, px, yy); yy += 30;
    let s = fmt(coef[n - 1]);
    for (let k = n - 2; k >= 0; k--) s = `(${s})·x + ${fmt(coef[k])}`;
    textSize(14); fill(170); text(s.replace(/\+ -/g, '− '), px, yy, w); yy += 60;
    textSize(16);
    let acc = coef[n - 1];
    fill(stage >= 0 ? color(255, 200, 90) : 120); text(`始め：${fmt(acc)}`, px, yy); yy += 24;
    for (let k = n - 2; k >= 0; k--) {
      let on = n - 2 - k < stage;
      acc = acc * x0 + coef[k];
      fill(on ? color(255, 200, 90) : 90); text(`× ${x0.toFixed(2)} + ${fmt(coef[k])} → ${fmt(acc)}`, px, yy); yy += 24;
    }
    fill(150); textSize(14); text(`かけ算 ${n - 1} 回・足し算 ${n - 1} 回だけ（Θ(n)）。x² や x³ を別々に計算しない`, px, yy + 6, w);
  } else { fill(150); textSize(15); text('グラフの上にマウスを置くと、その x でホーナー法の計算が見られる', px, yy, w); }
  fill(150); textSize(14); textAlign(LEFT, TOP);
  text(mulMode
    ? '黄 B(x) と緑 A(x) を掛けた赤 C(x)。係数どうしの掛け算は Θ(n²) だが、点の値なら「同じ x の値を掛ける」だけ。\n積の次数は増えるので、点は 2n 個いる。'
    : '点が n 個なら n−1 次式がちょうど 1 つ（ヴァンデルモンド行列が正則）。\n点 → 係数（補間）は Θ(n²)。FFT は特別な x（1 の n 乗根）を選んで両方向を Θ(n log n) にする。', px, height - 100, w);
}

function mousePressed() {
  let r = R(); if (mouseX < r.x || mouseX > r.x + r.w || mouseY < r.y || mouseY > r.y + r.h) return;
  drag = -1; for (let i = 0; i < pts.length; i++) if (dist(mouseX, mouseY, sx(pts[i].x), sy(pts[i].y)) < 14) drag = i;
  if (drag < 0 && pts.length < 9) { pts.push({ x: wx(mouseX), y: wy(mouseY) }); drag = pts.length - 1; interp(); }
}
function mouseDragged() { if (drag >= 0) { pts[drag].x = constrain(wx(mouseX), -1.15, 1.15); pts[drag].y = constrain(wy(mouseY), -1.5, 1.5); interp(); } }
function mouseReleased() { drag = -1; }
function keyPressed() {
  if (key === 'l' || key === 'L') showL = !showL;
  if (key === 'm' || key === 'M') mulMode = !mulMode;
  if (key === 'n' || key === 'N') { let k = floor(random(3, 7)); pts = []; for (let i = 0; i < k; i++) pts.push({ x: map(i, 0, k - 1, -1, 1) + random(-0.08, 0.08), y: random(-0.8, 0.8) }); interp(); }
  if (key === 'c' || key === 'C') { pts = [{ x: -0.6, y: -0.4 }, { x: 0.6, y: 0.4 }]; interp(); }
  if ((key === 'd' || key === 'D') && pts.length > 1) { let bi = 0; for (let i = 1; i < pts.length; i++) if (dist(mouseX, mouseY, sx(pts[i].x), sy(pts[i].y)) < dist(mouseX, mouseY, sx(pts[bi].x), sy(pts[bi].y))) bi = i; pts.splice(bi, 1); interp(); }
}
function fmt(v) { return abs(v) < 0.005 ? '0' : v.toFixed(2); }
function sup(k) { return String(k).split('').map(c => '⁰¹²³⁴⁵⁶⁷⁸⁹'[c]).join(''); }
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. 点を 1 つ追加すると、曲線全体が変わる。係数は全部変わるか？
// 2. L で基底を出す：基底 ℓₖ は自分の点で yₖ、ほかの点で 0。足すと緑の曲線
// 3. 点を左右の端に近づけると、曲線が端で暴れる（ルンゲ現象）
