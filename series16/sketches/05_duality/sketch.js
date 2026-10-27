// ============================================
// 05 双対性：資源の「値段」から見たもう 1 つの LP
// 主問題「材料の範囲で利益 c·x を最大に」には、双対問題「材料 1 単位の値段 y を、
// どの商品も値段の合計 ≥ 利益 になるように決めて、材料全体の値段 b·y を最小に」がペアでついてくる。
// 最適値は必ず一致する（強双対定理）。y は材料を 1 増やしたときの利益の増え方（影の価格）
// 制約の線をドラッグ：材料の量 b を増減 / 矢印の先をドラッグ：利益 c / マウスを領域に：その計画の利益
// 1：パン屋  2：お手本  3：ランダム
// ============================================

let range = 10; // ★ 画面に表示する範囲

let cons, c, labels, opt, ys = [], drag = null;

function setup() { createCanvas(windowWidth, windowHeight);
  textWrap(CHAR); preset(1); }

function preset(k) {
  if (k === 1) { cons = [[2, 1, 10], [1, 2, 8], [0, 1, 3.5]]; c = [3, 2]; labels = ['小麦粉', 'バター', '砂糖']; }
  if (k === 2) { cons = [[3, -1, 9], [1, 1, 7], [-1, 2, 8]]; c = [2, 1]; labels = ['(1)', '(2)', '(3)']; }
  if (k === 3) { cons = []; for (let i = 0; i < 3; i++) cons.push([floor(random(1, 5)), floor(random(1, 5)), floor(random(6, 16))]); c = [floor(random(1, 5)), floor(random(1, 5))]; labels = ['資源A', '資源B', '資源C']; }
  update();
}

// 2 変数の LP を「角を全部調べる」方法で解く
function lpSolve(C, obj) {
  let all = C.concat([[-1, 0, 0], [0, -1, 0], [1, 0, 1000], [0, 1, 1000]]);
  let best = null;
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
    let [a, b, e] = all[i], [p, q, f] = all[j], det = a * q - b * p;
    if (abs(det) < 1e-12) continue;
    let x = (e * q - b * f) / det, y = (a * f - e * p) / det;
    if (all.every(([u, v, w]) => u * x + v * y <= w + 1e-7)) { let z = obj[0] * x + obj[1] * y; if (!best || z > best.z + 1e-9) best = { x, y, z }; }
  }
  if (best && (best.x > 999 || best.y > 999)) best.unb = true;
  return best;
}

function update() {
  opt = lpSolve(cons, c);
  ys = [];
  if (!opt || opt.unb) return;
  let eps = 1e-4;
  for (let i = 0; i < cons.length; i++) { // 材料 i を少しだけ増やしたら利益がどれだけ増えるか
    let C2 = cons.map((r, k) => (k === i ? [r[0], r[1], r[2] + eps] : r));
    let o2 = lpSolve(C2, c); ys.push(max(0, (o2.z - opt.z) / eps));
  }
}

function R() { let s = min(width * 0.5, height - 150); return { x: 40, y: 110, s }; }
function toS(p) { let r = R(); return [r.x + (p[0] / range) * r.s, r.y + r.s - (p[1] / range) * r.s]; }
function toW(x, y) { let r = R(); return [((x - r.x) / r.s) * range, ((r.y + r.s - y) / r.s) * range]; }

function draw() {
  background(18, 14, 26);
  let r = R();
  fill(235); noStroke(); textSize(26); textAlign(LEFT, BASELINE);
  text('双対性：資源の値段から見たもう 1 つの LP', 30, 50);
  textSize(15); fill(150);
  text('制約の線をドラッグ：材料の量 b　矢印ドラッグ：利益 c　マウスを領域に：その計画の利益　1：パン屋　2：お手本　3：ランダム', 30, 80);

  fill(28, 22, 38); rect(r.x, r.y, r.s, r.s, 8);
  push(); drawingContext.beginPath(); drawingContext.rect(r.x, r.y, r.s, r.s); drawingContext.clip();
  let P = [[0, 0], [100, 0], [100, 100], [0, 100]];
  for (let [a, b, e] of cons) P = clipHalf(P, a, b, e);
  if (P.length >= 3) { fill(78, 225, 190, 60); stroke(78, 225, 190); strokeWeight(2); beginShape(); for (let p of P) { let s = toS(p); vertex(s[0], s[1]); } endShape(CLOSE); }
  for (let i = 0; i < cons.length; i++) {
    let [a, b, e] = cons[i], p, q;
    if (abs(b) > abs(a)) { p = [-5, (e + 5 * a) / b]; q = [range + 5, (e - (range + 5) * a) / b]; } else { p = [(e + 5 * b) / a, -5]; q = [(e - (range + 5) * b) / a, range + 5]; }
    let s1 = toS(p), s2 = toS(q);
    stroke(255, 95, 109, ys[i] > 1e-6 ? 255 : 110); strokeWeight(ys[i] > 1e-6 ? 3.5 : 2); line(s1[0], s1[1], s2[0], s2[1]);
  }
  // 最適点で、c を「効いている制約の法線」の組み合わせに分解する
  if (opt && !opt.unb) {
    // c = Σ yᵢ aᵢ を矢印の継ぎ足しで描く（最後の矢印の先が c の先と一致する）
    let o = toS([opt.x, opt.y]), k = 130 / mag(c[0], c[1]);
    let px = o[0], py = o[1];
    for (let i = 0; i < cons.length; i++) if (ys[i] > 1e-6) {
      let [a, b] = cons[i], qx = px + a * ys[i] * k, qy = py - b * ys[i] * k;
      stroke(255, 95, 109); strokeWeight(3); line(px, py, qx, qy);
      noStroke(); fill(255, 95, 109); circle(qx, qy, 8); textSize(14); text(`y${sub(i + 1)}·a${sub(i + 1)}`, (px + qx) / 2 + 6, (py + qy) / 2 + 14);
      px = qx; py = qy;
    }
    stroke(255, 200, 90); strokeWeight(4); line(o[0], o[1], o[0] + c[0] * k, o[1] - c[1] * k);
    noStroke(); fill(255, 200, 90); textSize(14); text('c', o[0] + c[0] * k + 6, o[1] - c[1] * k - 6);
    circle(o[0], o[1], 20);
  }
  let mw = toW(mouseX, mouseY), mFeas = mw[0] >= 0 && mw[1] >= 0 && cons.every(([a, b, e]) => a * mw[0] + b * mw[1] <= e + 1e-9);
  if (mFeas && mouseX < r.x + r.s) { noStroke(); fill(255); circle(mouseX, mouseY, 10); }
  pop();
  let o = toS([0, 0]); stroke(255, 200, 90); strokeWeight(4); line(o[0], o[1], o[0] + c[0] * 25, o[1] - c[1] * 25); noStroke(); fill(255, 200, 90); circle(o[0] + c[0] * 25, o[1] - c[1] * 25, 16);

  // 右：主問題と双対問題
  let px = r.x + r.s + 30, w = width - px - 30, yy = 112;
  textAlign(LEFT, TOP); noStroke();
  fill(235); textSize(18); text('主問題（作る量 x を決める）', px, yy); yy += 28;
  textSize(16); fill(255, 200, 90); text(`最大化  ${c[0]}x₁ + ${c[1]}x₂`, px + 16, yy); yy += 24; fill(220);
  for (let i = 0; i < cons.length; i++) { let [a, b, e] = cons[i]; text(`${labels[i]}：${f(a)}x₁ + ${f(b)}x₂ ≤ ${f(e)}`, px + 16, yy); yy += 22; }
  yy += 14;
  fill(235); textSize(18); text('双対問題（材料の値段 y を決める）', px, yy); yy += 28;
  textSize(16); fill(255, 95, 109);
  text('最小化  ' + cons.map((r, i) => `${f(r[2])}y${sub(i + 1)}`).join(' + '), px + 16, yy); yy += 24; fill(220);
  text('x₁ の値段：' + cons.map((r, i) => `${f(r[0])}y${sub(i + 1)}`).join(' + ') + ` ≥ ${c[0]}`, px + 16, yy); yy += 22;
  text('x₂ の値段：' + cons.map((r, i) => `${f(r[1])}y${sub(i + 1)}`).join(' + ') + ` ≥ ${c[1]}`, px + 16, yy); yy += 22;
  text('y ≥ 0', px + 16, yy); yy += 36;

  if (!opt) { fill(255, 110, 110); textSize(18); text('実行不能', px, yy); }
  else if (opt.unb) { fill(255, 200, 90); textSize(18); text('主問題が非有界 → 双対問題は実行不能', px, yy); }
  else {
    let dual = cons.reduce((s, r, i) => s + r[2] * ys[i], 0);
    fill(78, 225, 190); textSize(18);
    text(`主問題の最大値　c·x* = ${f(opt.z)}　（x* = (${f(opt.x)}, ${f(opt.y)})）`, px, yy); yy += 28;
    fill(255, 95, 109);
    text(`双対の最小値　　b·y* = ${f(dual)}　（y* = (${ys.map(f).join(', ')})）`, px, yy); yy += 40;
    // 弱双対性のものさし
    let bx = px, bw = w - 20, zmax = opt.z * 1.6 || 1;
    fill(40, 34, 56); rect(bx, yy, bw, 14, 7);
    let X = v => bx + constrain(v / zmax, 0, 1) * bw;
    fill(78, 225, 190); rect(bx, yy, X(opt.z) - bx, 14, 7);
    if (mFeas) { let zm = c[0] * mw[0] + c[1] * mw[1]; fill(255); circle(X(zm), yy + 7, 14); fill(220); textSize(13); text(`マウスの計画：利益 ${f(zm)}`, bx, yy + 22); }
    stroke(255, 95, 109); strokeWeight(3); line(X(dual), yy - 8, X(dual), yy + 22); noStroke();
    yy += 50;
    fill(200); textSize(14);
    text('弱双対性：どんな計画の利益も、どんな値段づけの合計以下。両方が一致したら、どちらも最適の証明になる。', px, yy, w); yy += 50;
    for (let i = 0; i < cons.length; i++) { fill(ys[i] > 1e-6 ? color(255, 150, 160) : color(140)); text(`${labels[i]} の影の価格 y${sub(i + 1)} = ${f(ys[i])}` + (ys[i] > 1e-6 ? '（使い切っている＝増やせば利益が増える）' : '（余っている＝増やしても得しない）'), px, yy, w); yy += 22; }
  }
  fill(150); textSize(14);
  text('左の図：最適点で、利益の矢印 c は「使い切っている制約の矢印 aᵢ」を yᵢ 倍して足したもの。\nこれがシンプレックス法の最後の z の式から y を読み取れる理由。', px, height - 70, w);
}

function clipHalf(P, a1, a2, b) {
  let out = [];
  for (let i = 0; i < P.length; i++) {
    let p = P[i], q = P[(i + 1) % P.length], fp = a1 * p[0] + a2 * p[1] - b, fq = a1 * q[0] + a2 * q[1] - b;
    if (fp <= 1e-9) out.push(p);
    if ((fp < -1e-9 && fq > 1e-9) || (fp > 1e-9 && fq < -1e-9)) { let t = fp / (fp - fq); out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]); }
  }
  return out;
}
function mousePressed() {
  let o = toS([0, 0]);
  if (dist(mouseX, mouseY, o[0] + c[0] * 25, o[1] - c[1] * 25) < 14) { drag = { obj: true }; return; }
  let w = toW(mouseX, mouseY);
  for (let i = 0; i < cons.length; i++) { let [a, b, e] = cons[i]; if (abs(a * w[0] + b * w[1] - e) / mag(a, b) < 0.3) { drag = { i }; return; } }
}
function mouseDragged() {
  if (!drag) return;
  if (drag.obj) { let o = toS([0, 0]); c = [max(0, round((mouseX - o[0]) / 25)), max(0, round((o[1] - mouseY) / 25))]; if (!c[0] && !c[1]) c = [1, 0]; }
  else { let w = toW(mouseX, mouseY), [a, b] = cons[drag.i]; cons[drag.i][2] = round((a * w[0] + b * w[1]) * 2) / 2; }
  update();
}
function mouseReleased() { drag = null; }
function keyPressed() { if (key >= '1' && key <= '3') preset(int(key)); }
function f(v) { if (abs(v) < 1e-6) return '0'; return abs(v - round(v)) < 1e-6 ? String(round(v)) : v.toFixed(2); }
function sub(k) { return String(k).split('').map(ch => '₀₁₂₃₄₅₆₇₈₉'[ch]).join(''); }
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. パン屋でバターの線を 1 だけ外へ動かす。利益の増え方が y₂ と同じになるか確かめる
// 2. 砂糖を増やしても利益が増えない理由を、図で説明する（砂糖の線が最適点にふれていない）
// 3. 利益の矢印を回して、どの材料の値段が 0 になるか観察する（相補性）
