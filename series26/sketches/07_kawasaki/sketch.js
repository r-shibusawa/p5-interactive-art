// ============================================
// 07 川崎の定理
// 1 つの頂点に集まる折り目が平らにたためるのは、間の角を 1 つおきに足すと 180° になるとき
//   θ1 − θ2 + θ3 − θ4 + … = 0 ⇔ θ1 + θ3 + … = θ2 + θ4 + … = 180°
// ドラッグ = 折り目の端（●）を動かす / 4・6・8 = 折り目の本数 / K = 最後に動かした折り目で条件を満たす / R = ランダム
// ============================================

let angs = [];            // 折り目の角度（ラジアン、小さい順）
let dragI = -1, lastI = 0;
let cx, cy, R;
let gapPx = 9;            // ★ 右の「たたんだ図」で層をずらす幅

function setup() {
  createCanvas(windowWidth, windowHeight);
  R = min(width * 0.2, (height - 150) / 2.3);
  cx = width * 0.27; cy = 100 + R * 1.1;
  randomize(4);
}
function randomize(n) {
  angs = [];
  for (let i = 0; i < n; i++) angs.push((i + random(-0.3, 0.3)) * TWO_PI / n + 0.3);
  angs = angs.map((a) => (a + TWO_PI) % TWO_PI).sort((p, q) => p - q);
}
// 間の角 θ_i（折り目 i から i+1 まで）
function sectors() { return angs.map((a, i) => (i + 1 < angs.length ? angs[i + 1] : angs[0] + TWO_PI) - a); }
function altSum(th) { return th.reduce((s, t, i) => s + (i % 2 ? -t : t), 0); }

function draw() {
  background(34, 32, 40);
  let th = sectors(), S = altSum(th);
  let ok = abs(degrees(S)) < 0.5;
  if (dragI >= 0) {
    let a = atan2(mouseY - cy, mouseX - cx);
    let n = angs.length, lo = dragI > 0 ? angs[dragI - 1] : angs[n - 1] - TWO_PI, hi = dragI < n - 1 ? angs[dragI + 1] : angs[0] + TWO_PI;
    while (a < lo) a += TWO_PI;
    while (a > hi) a -= TWO_PI;
    angs[dragI] = constrain(a, lo + 0.04, hi - 0.04);
    resortCreases();
  }

  // 左：展開図（紙と折り目）
  noStroke(); fill(246, 240, 226); circle(cx, cy, R * 2.2);
  th.forEach((t, i) => {
    fill(i % 2 ? color(240, 200, 170) : color(190, 215, 240));
    arc(cx, cy, R * 1.2, R * 1.2, angs[i], angs[i] + t, PIE);
    let am = angs[i] + t / 2;
    fill(40); textSize(15); textAlign(CENTER, CENTER);
    text('θ' + (i + 1) + '\n' + nf(degrees(t), 1, 1) + '°', cx + cos(am) * R * 0.85, cy + sin(am) * R * 0.85);
  });
  textAlign(LEFT, BASELINE);
  angs.forEach((a, i) => {
    stroke(i === lastI ? color(255, 170, 30) : color(90)); strokeWeight(3);
    line(cx, cy, cx + cos(a) * R * 1.1, cy + sin(a) * R * 1.1);
    noStroke(); fill(i === dragI ? color(255, 170, 30) : color(40)); circle(cx + cos(a) * R * 1.0, cy + sin(a) * R * 1.0, 16);
  });

  // 右：たたんだ図。区切りごとに向きを反転しながら角を足す（φ = θ1 − θ2 + θ3 − …）
  let fx = width * 0.66, fy = cy;
  let phi = -HALF_PI;
  noFill();
  for (let i = 0; i < th.length; i++) {
    let dir = i % 2 ? -1 : 1, r0 = R * 0.6 + i * gapPx;
    let a0 = phi, a1 = phi + dir * th[i];
    stroke(i % 2 ? color(240, 160, 120) : color(120, 170, 240)); strokeWeight(5);
    arc(fx, fy, r0 * 2, r0 * 2, min(a0, a1), max(a0, a1));
    stroke(200); strokeWeight(1.5);
    line(fx, fy, fx + cos(a1) * (r0 + gapPx), fy + sin(a1) * (r0 + gapPx));
    phi = a1;
  }
  stroke(255); strokeWeight(2); line(fx, fy, fx + cos(-HALF_PI) * R * 0.6, fy + sin(-HALF_PI) * R * 0.6);
  noStroke(); fill(255); circle(fx, fy, 10);
  let gap = degrees(S);
  fill(ok ? color(80, 220, 140) : color(255, 110, 90)); textSize(18);
  text(ok ? '最後の層が出発点にもどった → 閉じる！' : 'ずれ ' + nf(gap, 1, 1) + '° → 閉じない（紙が破れる）', fx - R * 0.9, fy - R * 0.6 - 60);

  // パネル
  let odd = 0, even = 0;
  th.forEach((t, i) => { if (i % 2) even += t; else odd += t; });
  noStroke(); fill(255); textSize(18);
  text('ドラッグ：折り目の端（●）　4・6・8：本数　K：オレンジの折り目で条件を満たす　R：ランダム', 20, 40);
  fill(170); textSize(15);
  text('左 = 広げた紙（展開図）、右 = 平らにたたんだときの重なり。1 つおきに逆向きに角が重なっていく', 20, 68);
  let tx = width * 0.47, y = height - 120;
  textSize(22);
  fill(120, 170, 240); text('θ1 + θ3 + … = ' + nf(degrees(odd), 1, 1) + '°', tx, y);
  fill(240, 160, 120); text('θ2 + θ4 + … = ' + nf(degrees(even), 1, 1) + '°', tx, y + 32);
  fill(ok ? color(80, 220, 140) : color(255, 110, 90));
  text(ok ? '川崎の条件 OK' : '川崎の条件 NG（どちらも 180° にしよう）', tx, y + 70);
}

function resortCreases() {
  let moved = angs[dragI];
  angs = angs.map((a) => (a + TWO_PI) % TWO_PI);
  let order = angs.map((a, i) => i).sort((p, q) => angs[p] - angs[q]);
  angs = order.map((i) => angs[i]);
  dragI = angs.indexOf((moved + TWO_PI) % TWO_PI);
  lastI = dragI;
}

// ★ K：折り目 j を δ 動かすと θ_{j-1} が +δ、θ_j が −δ → 交互和は 2δ だけ変わる
function fixKawasaki() {
  let j = lastI, S = altSum(sectors());
  let sign = ((j - 1 + angs.length) % angs.length) % 2 ? -1 : 1;
  let d = -S / (2 * sign);
  let n = angs.length, lo = j > 0 ? angs[j - 1] : angs[n - 1] - TWO_PI, hi = j < n - 1 ? angs[j + 1] : angs[0] + TWO_PI;
  let a = angs[j] + d;
  if (a > lo + 0.01 && a < hi - 0.01) { angs[j] = a; dragI = j; resortCreases(); dragI = -1; }
}

function mousePressed() {
  dragI = -1;
  angs.forEach((a, i) => { if (dist(mouseX, mouseY, cx + cos(a) * R, cy + sin(a) * R) < 22) dragI = i; });
  if (dragI >= 0) lastI = dragI;
}
function mouseReleased() { dragI = -1; }
function keyPressed() {
  if (key === '4' || key === '6' || key === '8') { randomize(int(key)); lastI = 0; }
  if (key === 'r' || key === 'R') randomize(angs.length);
  if (key === 'k' || key === 'K') fixKawasaki();
}

// ---------- やってみよう ----------
// 1. 4 本の折り目で、θ1 + θ3 = 180° にしたまま θ1 だけを変えてみよう。どんな形でもたためる？
// 2. 右の図の「ずれ」が 0 になる瞬間を、ドラッグだけでつくってみよう
// 3. 6 本・8 本にして K を押す。どの折り目を動かしても直せる？
// 4. 06 の前川の定理（山と谷の数）と川崎の定理（角度）。両方そろっても、まだたためない例がある（大・小・大の補題を調べよう）
