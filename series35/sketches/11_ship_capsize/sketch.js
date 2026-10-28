// ============================================
// 11 船の転覆と復原力
// 船が傾くと、水に沈んだ部分の中心（浮心 B）が低い側へ動き、重心 G との間に「起き上がる力のうで」GZ ができる
//   外から傾ける力（風・波）M を少しずつ強くしても、船はなめらかに少し傾くだけ。でも M が GZ の山をこえると
//   つり合う角度がなくなり、一気に転覆する（折り目のカタストロフィー）。逆さまの船も安定 → 元には戻らない
// ↑↓ = 風の力 M / ←→ = 重心の高さ / W = 波 / A = 風をゆっくり強める / R = 起こす
// ============================================

let hull = [[-1, -0.6], [1, -0.6], [1.05, 0.6], [-1.05, 0.6]];   // ★ 船の断面（左右対称、y が上）
let fillRatio = 0.4;        // ★ 断面のうち水に沈む割合
let zg = 0.0;               // ★ 重心の高さ（断面の中心が 0）
let M = 0;                  // 外からの傾ける力
let phi = 0, omega = 0;     // 傾き（ラジアン）と角速度
let waves = false, auto = false;
let gzTab = [], cTab = [];  // 角度ごとの GZ と水面の高さ
let N = 360;
let t = 0;
let phiLog = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  buildTable();
}

// ---- 船の計算：角度 φ で傾けたとき、決まった面積だけ沈む水面の高さ c を探し、沈んだ部分の中心 B を求める
function rot(p, a) { return [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)]; }
function clipBelow(poly, c) {          // y < c の部分だけ残す
  let out = [];
  for (let i = 0; i < poly.length; i++) {
    let p = poly[i], q = poly[(i + 1) % poly.length];
    let pin = p[1] < c, qin = q[1] < c;
    if (pin) out.push(p);
    if (pin !== qin) { let s = (c - p[1]) / (q[1] - p[1]); out.push([p[0] + s * (q[0] - p[0]), c]); }
  }
  return out;
}
function areaCentroid(poly) {
  let A = 0, cx = 0, cy = 0;
  for (let i = 0; i < poly.length; i++) {
    let p = poly[i], q = poly[(i + 1) % poly.length], cr = p[0] * q[1] - q[0] * p[1];
    A += cr; cx += (p[0] + q[0]) * cr; cy += (p[1] + q[1]) * cr;
  }
  A /= 2;
  return Math.abs(A) < 1e-9 ? { A: 0, x: 0, y: 0 } : { A: Math.abs(A), x: cx / (6 * A), y: cy / (6 * A) };
}
function buildTable() {
  let total = areaCentroid(hull).A, target = total * fillRatio;
  gzTab = []; cTab = [];
  for (let i = 0; i <= N; i++) {
    let a = -PI + TWO_PI * i / N;
    let poly = hull.map((p) => rot(p, a));
    let lo = -2, hi = 2;
    for (let k = 0; k < 40; k++) { let mid = (lo + hi) / 2; if (areaCentroid(clipBelow(poly, mid)).A < target) lo = mid; else hi = mid; }
    let B = areaCentroid(clipBelow(poly, lo));
    let G = rot([0, zg], a);
    gzTab.push(G[0] - B.x);     // ★ GZ > 0 なら起き上がる向きの力
    cTab.push(lo);
  }
}
function lookup(tab, a) {
  a = ((a + PI) % TWO_PI + TWO_PI) % TWO_PI - PI;
  let f = (a + PI) / TWO_PI * N, i = Math.min(N - 1, Math.floor(f));
  return tab[i] + (tab[i + 1] - tab[i]) * (f - i);
}

function draw() {
  background(210, 35, 14);
  if (auto) M = min(0.6, M + 0.0004);
  if (waves) t += 0.03;
  let Mtot = M + (waves ? 0.12 * Math.sin(t) : 0);
  for (let k = 0; k < 6; k++) {
    let dt = 1 / 360;
    omega += (-lookup(gzTab, phi) * 30 + Mtot * 30 - 1.2 * omega) * dt * 6;
    omega = constrain(omega, -20, 20);
    phi += omega * dt * 6;
  }
  phi = ((phi + PI) % TWO_PI + TWO_PI) % TWO_PI - PI;
  phiLog.push(phi); if (phiLog.length > 400) phiLog.shift();
  let capsized = abs(phi) > HALF_PI;

  // ---- 左：船
  let lw = width * 0.5, U = min(lw / 4.5, 130), cx = lw / 2 + 10, wy = height * 0.55;
  let c = lookup(cTab, phi);
  let toS = (p) => { let w = rot(p, phi); return [cx + w[0] * U, wy - (w[1] - c) * U]; };
  noStroke(); fill(0, 0, 100, 8);
  // 空と海
  fill(205, 70, 45, 80); rect(0, wy + (waves ? 6 * Math.sin(t * 2) : 0), lw + 20, height - wy);
  fill(capsized ? color(0, 60, 70) : color(30, 30, 85));
  beginShape(); for (let p of hull) { let s = toS(p); vertex(s[0], s[1]); } endShape(CLOSE);
  // マスト
  let m0 = toS([0, 0.6]), m1 = toS([0, 1.8]);
  stroke(0, 0, 90); strokeWeight(4); line(m0[0], m0[1], m1[0], m1[1]);
  noStroke(); fill(0, 0, 95, 80);
  let s1 = toS([0.05, 1.7]), s2 = toS([0.05, 0.75]), s3 = toS([0.8, 0.75]); triangle(s1[0], s1[1], s2[0], s2[1], s3[0], s3[1]);
  // G と B
  let poly = hull.map((p) => rot(p, phi));
  let B = areaCentroid(clipBelow(poly, c));
  let Gs = toS([0, zg]), Bs = [cx + B.x * U, wy - (B.y - c) * U];
  fill(0, 80, 100); circle(Gs[0], Gs[1], 14); fill(190, 80, 100); circle(Bs[0], Bs[1], 14);
  stroke(0, 80, 100); strokeWeight(2); line(Gs[0], Gs[1], Gs[0], Gs[1] + 50);
  stroke(190, 80, 100); line(Bs[0], Bs[1], Bs[0], Bs[1] - 50);
  noStroke(); fill(0, 0, 100); textSize(14); text('G', Gs[0] + 10, Gs[1] - 6); text('B', Bs[0] + 10, Bs[1] + 16);
  // 風の矢印
  let wl = Mtot * 300;
  stroke(50, 80, 100); strokeWeight(5); line(cx - wl, 140, cx, 140);
  if (capsized) { noStroke(); fill(0, 80, 100); textSize(30); text('転覆！ R で起こす', 30, height - 40); }

  // ---- 右：GZ 曲線
  let gx = lw + 30, gy = 110, gw = width - gx - 30, gh = height - 150;
  let gmax = 0; for (let v of gzTab) gmax = max(gmax, abs(v));
  let toA = (a) => gx + (a + PI) / TWO_PI * gw, toG = (v) => gy + gh / 2 - v / (gmax * 1.2) * (gh / 2 - 20);
  noStroke(); fill(210, 30, 20); rect(gx, gy, gw, gh, 8);
  stroke(0, 0, 100, 15); strokeWeight(1); line(gx, toG(0), gx + gw, toG(0)); line(toA(0), gy, toA(0), gy + gh);
  noFill(); stroke(30, 60, 100); strokeWeight(3);
  beginShape(); for (let i = 0; i <= N; i++) vertex(toA(-PI + TWO_PI * i / N), toG(gzTab[i])); endShape();
  stroke(50, 80, 100); strokeWeight(2); line(gx, toG(Mtot), gx + gw, toG(Mtot));
  noStroke(); fill(0, 0, 100); circle(toA(phi), toG(lookup(gzTab, phi)), 14);
  fill(0, 0, 85); textSize(14);
  text('横 = 傾き φ（−180° 〜 180°）、縦 = 起き上がる力のうで GZ（オレンジ）。黄の線 = 風の力 M', gx + 12, gy + 22);
  text('黄の線とオレンジの交点がつり合いの角度。黄の線が山の上へ出ると交点が消える = 転覆', gx + 12, gy + 44);

  noStroke(); fill(0, 0, 100); textSize(18);
  text('φ = ' + nf(degrees(phi), 1, 1) + '°　風 M = ' + nf(M, 1, 3) + '（↑↓）　重心 ' + nf(zg, 1, 2) + '（←→）　W：波 ' + (waves ? 'ON' : 'off') + '　A：風を強める ' + (auto ? 'ON' : 'off') + '　R：起こす', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('重心 G が高いほど GZ の山が低くなり、弱い風で転覆する。荷物を高く積みすぎた船・人が片側に集まった船が危ないのはこのため', 20, 68);
}

function keyPressed() {
  if (key === UP_ARROW) { auto = false; M = min(0.6, M + 0.01); }
  if (key === DOWN_ARROW) { auto = false; M = max(-0.6, M - 0.01); }
  if (key === RIGHT_ARROW) { zg = min(0.8, zg + 0.05); buildTable(); }
  if (key === LEFT_ARROW) { zg = max(-0.5, zg - 0.05); buildTable(); }
  if (key === 'w' || key === 'W') waves = !waves;
  if (key === 'a' || key === 'A') { auto = !auto; if (auto) M = 0; }
  if (key === 'r' || key === 'R') { phi = 0; omega = 0; M = 0; auto = false; }
}

// ---------- やってみよう ----------
// 1. A で風をゆっくり強め、転覆した M の値を記録しよう。重心を上げる（→）とその値はどうなる？
// 2. 転覆したあと M を 0 に戻しても、船は起き上がらない。GZ のグラフで理由を説明しよう
// 3. 波（W）があると、GZ の山より弱い風でも転覆することがある。なぜ？
// 4. hull の形を変えよう：幅を広くする、船底を V 字にする（点を 1 つ足す）。GZ の山はどう変わる？
