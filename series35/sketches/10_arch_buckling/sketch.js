// ============================================
// 10 アーチの座屈
// 1 = 浅いアーチ（2 本の棒）：上から押す力 P をゆっくり増やすと、ある所で「ペコッ」と下へ反転する（飛び移り座屈）
//   力を戻しても元に戻らない（ヒステリシス）。ペットボトルのへこみ、缶のふた、ヘアピンの「パチン」
// 2 = 柱（オイラー座屈）：P が 1 をこえると柱は左右どちらかに曲がる。小さな横の力 ε（不完全さ）が向きを決める
//   V = q⁴/4 + (1 − P)q²/2 − εq はカスプそのもの。(P, ε) の平面に 4(1 − P)³ + 27ε² = 0 のカスプが現れる
// 1/2 = 切りかえ / ↑↓ = 力 P / ←→ = 横の力 ε（2） / A = 自動で押したり戻したり / R = 戻す
// ============================================

let scene = 1;
let P = 0, eps = 0.05;      // 力と不完全さ
let k = 10;                 // ★ 棒のばねの強さ
let h0 = 0.5;               // ★ アーチの高さ（半分の幅 = 1）
let y = h0, vy = 0;         // アーチの頂点
let q = 0, vq = 0;          // 柱の曲がり
let auto = true, t = 0;
let trail = [];
let Pmax = 0;
let snaps = 0, lastSnap = -100;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  // アーチが耐えられる最大の力を先に調べる
  for (let yy = 0; yy <= h0; yy += 0.001) Pmax = max(Pmax, archP(yy));
}

// アーチ：頂点が y のときにつり合う力
function archP(yy) { let s = Math.sqrt(1 + yy * yy), s0 = Math.sqrt(1 + h0 * h0); return -2 * k * (s - s0) * yy / s; }
function archForce(yy) { return archP(yy) - P; }             // 上向きの力（棒の反発 − 押す力）
function columnForce(qq) { return -(qq ** 3 + (1 - P) * qq - eps); }   // −V'(q)

function draw() {
  background(30, 20, 11);
  if (auto) {
    t += 0.006;
    if (scene === 1) P = 1.35 * Pmax * Math.sin(t);
    else { P = 1.6 + 0.4 * Math.sin(t * 0.5); eps = 0.25 * Math.sin(t * 1.7); }
  }
  let before = scene === 1 ? y : q;
  for (let i = 0; i < 10; i++) {
    let dt = 1 / 300;
    if (scene === 1) { vy += (archForce(y) * 40 - 6 * vy) * dt; y += vy * dt; y = constrain(y, -1.5, 1.5); }
    else { vq += (columnForce(q) * 60 - 8 * vq) * dt; q += vq * dt; q = constrain(q, -2, 2); }
  }
  let after = scene === 1 ? y : q;
  if (abs(after - before) > 0.02 && frameCount - lastSnap > 30) { snaps++; lastSnap = frameCount; }
  trail.push(scene === 1 ? { p: P, s: y } : { p: P, s: q, e: eps });
  if (trail.length > 1200) trail.splice(0, 1);

  let lw = width * 0.5;
  if (scene === 1) drawArch(lw); else drawColumn(lw);
  drawGraph(lw + 30, 110, width - lw - 60, height - 150);

  noStroke(); fill(0, 0, 100); textSize(18);
  text((scene === 1 ? '1：浅いアーチ' : '2：柱（オイラー座屈）') + '　P = ' + nf(P, 1, 2) + '（↑↓）' + (scene === 2 ? '　ε = ' + nf(eps, 1, 3) + '（←→）' : '') + '　A：自動 ' + (auto ? 'ON' : 'off') + '　R：戻す　ペコッ ' + snaps + ' 回', 20, 40);
  fill(0, 0, 60); textSize(15);
  text(scene === 1 ? '右の図：横 = 押す力 P、縦 = 頂点の高さ。曲線の山（P = ' + nf(Pmax, 1, 2) + '）をこえると、つり合いがなくなって下の枝へとぶ。戻すときは −' + nf(Pmax, 1, 2) + ' でとぶ'
    : '右の図：(P, ε) の平面。黄のカスプの内側では曲がり方が 2 通り。P > 1 で ε の符号を変えると、カスプのへりで柱が反対側へパチンと移る', 20, 68);
}

function drawArch(lw) {
  let U = min(lw * 0.35, 220), cx = lw / 2 + 20, cy = height * 0.55;
  noStroke(); fill(30, 15, 25); rect(cx - U * 1.3, cy + 6, U * 0.3, 40); rect(cx + U, cy + 6, U * 0.3, 40);
  let top = { x: cx, y: cy - y * U };
  stroke(y > 0 ? color(30, 80, 100) : color(190, 70, 100)); strokeWeight(14);
  line(cx - U, cy, top.x, top.y); line(cx + U, cy, top.x, top.y);
  noStroke(); fill(0, 0, 100); circle(cx - U, cy, 16); circle(cx + U, cy, 16); circle(top.x, top.y, 18);
  // 力の矢印
  let L = P / Pmax * 80;
  stroke(0, 80, 100); strokeWeight(5); line(top.x, top.y - 20 - abs(L), top.x, top.y - 20);
  noStroke(); fill(0, 80, 100);
  if (P > 0) triangle(top.x, top.y - 14, top.x - 10, top.y - 30, top.x + 10, top.y - 30);
  else if (P < 0) triangle(top.x, top.y - 24 - abs(L) - 10, top.x - 10, top.y - 20 - abs(L) + 4, top.x + 10, top.y - 20 - abs(L) + 4);
}

function drawColumn(lw) {
  let H = height - 300, cx = lw / 2 + 20, y0 = height - 80, y1 = y0 - H;
  noStroke(); fill(30, 15, 25); rect(cx - 60, y0, 120, 20); rect(cx - 60, y1 - 20, 120, 20);
  noFill(); stroke(abs(q) < 0.05 ? color(0, 0, 90) : q > 0 ? color(30, 80, 100) : color(190, 70, 100)); strokeWeight(12);
  beginShape(); for (let i = 0; i <= 40; i++) { let s = i / 40; vertex(cx + q * 90 * Math.sin(PI * s), y0 - H * s); } endShape();
  // 上から押す力 P と、横の力 ε
  stroke(0, 80, 100); strokeWeight(5); line(cx, y1 - 90, cx, y1 - 30);
  noStroke(); fill(0, 80, 100); triangle(cx, y1 - 22, cx - 10, y1 - 38, cx + 10, y1 - 38);
  stroke(50, 90, 100); strokeWeight(4); let ex = eps * 300;
  line(cx - ex - (ex > 0 ? 20 : -20), y0 - H / 2, cx - (ex > 0 ? 20 : -20), y0 - H / 2);
  noStroke(); fill(0, 0, 80); textSize(14); text('P', cx + 14, y1 - 50); text('ε', cx - ex - 30, y0 - H / 2 - 10);
}

function drawGraph(gx, gy, gw, gh) {
  noStroke(); fill(30, 15, 18); rect(gx, gy, gw, gh, 8);
  stroke(0, 0, 100, 15); strokeWeight(1); line(gx + gw / 2, gy, gx + gw / 2, gy + gh); line(gx, gy + gh / 2, gx + gw, gy + gh / 2);
  if (scene === 1) {
    let toP = (p) => gx + gw / 2 + p / (1.5 * Pmax) * gw / 2, toS = (s) => gy + gh / 2 - s / 0.8 * (gh / 2 - 10);
    noFill(); stroke(0, 0, 100, 40); strokeWeight(3);
    beginShape(); for (let yy = -0.8; yy <= 0.8; yy += 0.01) { let p = archP(yy); if (abs(p) < 1.5 * Pmax) vertex(toP(p), toS(yy)); else { endShape(); beginShape(); } } endShape();
    strokeWeight(2); stroke(30, 80, 100, 60);
    beginShape(); for (let p of trail) vertex(toP(p.p), toS(p.s)); endShape();
    noStroke(); fill(50, 90, 100); circle(toP(P), toS(y), 14);
    fill(0, 0, 80); textSize(14); text('横 = P、縦 = 頂点の高さ y。白 = つり合いの曲線、オレンジ = たどった道', gx + 12, gy + 22);
  } else {
    let toP = (p) => gx + 20 + (p - 0) / 2.2 * (gw - 40), toE = (e) => gy + gh / 2 - e / 0.55 * (gh / 2 - 20);
    fill(50, 90, 100, 40); stroke(50, 90, 100); strokeWeight(2);
    beginShape();
    for (let p = 1; p <= 2.2; p += 0.02) vertex(toP(p), toE(2 * ((p - 1) / 3) ** 1.5));
    for (let p = 2.2; p >= 1; p -= 0.02) vertex(toP(p), toE(-2 * ((p - 1) / 3) ** 1.5));
    endShape(CLOSE);
    noStroke();
    for (let p of trail) { fill(p.s > 0 ? color(30, 80, 100, 50) : color(190, 70, 100, 50)); circle(toP(p.p), toE(p.e), 3); }
    fill(0, 0, 100); circle(toP(P), toE(eps), 14);
    fill(0, 0, 80); textSize(14); text('横 = P（0 〜 2.2）、縦 = ε。点の色 = 曲がった向き（オレンジ = 右、水色 = 左）', gx + 12, gy + 22);
    text('P = 1（オイラーの座屈荷重）', toP(1) - 20, gy + gh - 12);
  }
}

function keyPressed() {
  let step = scene === 1 ? Pmax * 0.05 : 0.05;
  if (key === UP_ARROW) { auto = false; P += step; }
  if (key === DOWN_ARROW) { auto = false; P -= step; }
  if (key === RIGHT_ARROW) { auto = false; eps = min(0.35, eps + 0.02); }
  if (key === LEFT_ARROW) { auto = false; eps = max(-0.35, eps - 0.02); }
  P = constrain(P, scene === 1 ? -1.5 * Pmax : 0, scene === 1 ? 1.5 * Pmax : 2.2);
  if (key === '1' || key === '2') { scene = Number(key); trail = []; P = scene === 1 ? 0 : 0.5; y = h0; vy = 0; q = 0; vq = 0; }
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'r' || key === 'R') { P = scene === 1 ? 0 : 0.5; y = h0; vy = 0; q = 0; vq = 0; trail = []; snaps = 0; }
}

// ---------- やってみよう ----------
// 1. アーチ（1）で ↑ を少しずつ押し、ペコッとなる P を記録。h0 を 0.3 にすると耐えられる力はどうなる？
// 2. 柱（2）で ε = 0 にして P を 1 より大きくすると、柱はどちらに曲がる？（ほんの少しの誤差で決まる）
// 3. 柱で P = 1.8 に固定し、ε を + から − へゆっくり。パチンと移る ε を黄のカスプのへりと比べよう
// 4. 定規を両手で押して曲げてみよう。横から指で押すと、反対側へパチンと移る
