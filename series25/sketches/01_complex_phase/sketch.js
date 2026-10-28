// ============================================
// 01 複素数と位相
// 波動関数 ψ は複素数。大きさ |ψ| と向き（位相 θ）をもつ「回る矢印」 ψ = |ψ| e^{iθ} = |ψ|(cos θ + i sin θ)
//   平面波 ψ(x, t) = e^{i(kx − ωt)} は x 方向にねじれたらせん。色 = 位相、明るさ = |ψ| で 1 本の帯にも描ける
// 1 = 波 1 本 / 2 = 2 本の重ね合わせ（うなり） / ←→ = 2 本目の波数 k2 / ↑↓ = 1 本目の波数 k1 / D = 分散 ω = k²/2 ⇔ ω = k / マウス = 見る場所 x / スペース = 停止
// ============================================

let k1 = 0.6, k2 = 0.75;   // ★ 波数（1 あたりの位相の進み）
let mode = 1;
let dispersive = true;     // true：ω = k²/2（自由粒子、ħ = m = 1） / false：ω = k（光や音のように形が崩れない）
let t = 0, running = true;
let xs = 360;              // ★ 描く点の数
let xRange = 60;           // 画面の幅に入れる x の範囲

function omega(k) { return dispersive ? (k * k) / 2 : k; }

// 位置 x、時刻 t での ψ（複素数を {re, im} で返す）
function psi(x) {
  let th1 = k1 * x - omega(k1) * t;
  let re = cos(th1), im = sin(th1);
  if (mode === 2) {
    let th2 = k2 * x - omega(k2) * t;
    re = (re + cos(th2)) / 2; im = (im + sin(th2)) / 2;
  }
  return { re, im };
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(250, 30, 10);
  if (running) t += deltaTime / 1000 * 2;

  let left = 360, right = width - 40, w = right - left;
  let cyH = height * 0.36, amp = height * 0.14;     // らせんの中心と大きさ
  let xOf = (i) => left + (i / (xs - 1)) * w;
  let xVal = (i) => (i / (xs - 1)) * xRange;

  // --- らせん（斜めから見た 3D：横 = x、縦 = Re ψ、奥行き = Im ψ）---
  stroke(0, 0, 40); strokeWeight(1);
  line(left, cyH, right, cyH);
  noFill();
  // Re の影（平らな波）
  stroke(200, 70, 90, 40); strokeWeight(1.5);
  beginShape(); for (let i = 0; i < xs; i++) vertex(xOf(i), cyH - psi(xVal(i)).re * amp); endShape();
  // 本体
  strokeWeight(3);
  for (let i = 1; i < xs; i++) {
    let a = psi(xVal(i - 1)), b = psi(xVal(i));
    let hue = ((atan2(b.im, b.re) + PI) / TWO_PI) * 360;
    stroke(hue, 80, 100, b.im > 0 ? 100 : 45);        // 奥（Im < 0）は暗く
    line(xOf(i - 1) + a.im * 10, cyH - a.re * amp * 0.85 + a.im * amp * 0.35, xOf(i) + b.im * 10, cyH - b.re * amp * 0.85 + b.im * amp * 0.35);
  }

  // --- 色の帯：色 = 位相、明るさ = |ψ| ---
  let by = height * 0.62, bh = 50;
  noStroke();
  for (let i = 0; i < xs; i++) {
    let p = psi(xVal(i));
    let m = sqrt(p.re * p.re + p.im * p.im);
    fill(((atan2(p.im, p.re) + PI) / TWO_PI) * 360, 80, m * 100);
    rect(xOf(i), by, w / xs + 1, bh);
  }
  // |ψ|² のグラフ（2 本ならうなり）
  let gy = height * 0.9, gh = height * 0.14;
  stroke(0, 0, 40); strokeWeight(1); line(left, gy, right, gy);
  noFill(); stroke(55, 80, 100); strokeWeight(2);
  beginShape();
  for (let i = 0; i < xs; i++) { let p = psi(xVal(i)); vertex(xOf(i), gy - (p.re * p.re + p.im * p.im) * gh); }
  endShape();
  noStroke(); fill(0, 0, 70); textSize(14);
  text('色 = 位相 θ　明るさ = |ψ|', left, by - 8);
  text('|ψ|² = 見つかる確率の濃さ（1 本の平面波なら どこでも同じ）', left, gy - gh - 6);

  // --- 左：複素平面の回る矢印（マウスの位置 x）---
  let mi = constrain(floor(((mouseX - left) / w) * (xs - 1)), 0, xs - 1);
  let p = psi(xVal(mi));
  let cx = 180, cyc = height * 0.42, R = 120;
  stroke(0, 0, 35); strokeWeight(1);
  line(cx - R - 20, cyc, cx + R + 20, cyc); line(cx, cyc - R - 20, cx, cyc + R + 20);
  noFill(); circle(cx, cyc, 2 * R);
  let hue = ((atan2(p.im, p.re) + PI) / TWO_PI) * 360;
  stroke(hue, 80, 100); strokeWeight(4);
  line(cx, cyc, cx + p.re * R, cyc - p.im * R);
  noStroke(); fill(hue, 80, 100); circle(cx + p.re * R, cyc - p.im * R, 14);
  // Re と Im の成分
  stroke(200, 70, 90); strokeWeight(2); line(cx, cyc + R + 34, cx + p.re * R, cyc + R + 34);
  stroke(30, 70, 95); line(cx - R - 34, cyc, cx - R - 34, cyc - p.im * R);
  stroke(0, 0, 100, 40); strokeWeight(1); line(xOf(mi), 90, xOf(mi), height - 20);
  // 位相の色相環
  noStroke(); for (let a = 0; a < 360; a += 6) { fill(a, 80, 100); let r = R + 8, aa = radians(a) - PI; circle(cx + r * cos(aa), cyc - r * sin(aa), 5); }

  fill(0, 0, 100); textSize(15);
  text('Re ψ = ' + nf(p.re, 1, 2), cx - 50, cyc + R + 58);
  text('Im ψ = ' + nf(p.im, 1, 2), 20, cyc - R - 30);
  text('|ψ| = ' + nf(sqrt(p.re * p.re + p.im * p.im), 1, 2) + '   θ = ' + nf(degrees(atan2(p.im, p.re)), 1, 0) + '°', cx - 80, cyc + R + 84);
  text('x = ' + nf(xVal(mi), 1, 1), cx - 30, cyc + R + 108);

  fill(0, 0, 100); textSize(18);
  text('1/2：波の数（' + mode + '）　↑↓ k1 = ' + nf(k1, 1, 2) + '　←→ k2 = ' + nf(k2, 1, 2) + '　D：' + (dispersive ? 'ω = k²/2（物質波）' : 'ω = k（形が崩れない波）') + '　スペース：' + (running ? '動' : '止') + '　マウス：見る x', 20, 40);
  fill(0, 0, 60); textSize(15);
  let vph = omega(k1) / k1, vg = dispersive ? (k1 + k2) / 2 : 1;
  text('位相速度 ω/k = ' + nf(vph, 1, 2) + '　うなりの包絡線の速さ（群速度）≈ ' + nf(vg, 1, 2) + '　→ 物質波では山の速さと「かたまり」の速さが違う', 20, 68);
}

function keyPressed() {
  if (key === '1') mode = 1;
  if (key === '2') mode = 2;
  if (key === UP_ARROW) k1 = min(2, k1 + 0.05);
  if (key === DOWN_ARROW) k1 = max(0.05, k1 - 0.05);
  if (key === RIGHT_ARROW) k2 = min(2, k2 + 0.05);
  if (key === LEFT_ARROW) k2 = max(0.05, k2 - 0.05);
  if (key === 'd' || key === 'D') dispersive = !dispersive;
  if (key === ' ') running = !running;
}

// ---------- やってみよう ----------
// 1. マウスを右へ動かすと矢印はどう回る？ 時間を止めて（スペース）x だけ変えると、位相が k ずつ進むのがわかる
// 2. 2 にして k1 と k2 を近づけると、うなりの間隔（2π / |k1 − k2|）が広がる
// 3. D で ω = k に切り替えると、山とうなりが同じ速さで進む。ω = k²/2 だと山の速さは包絡線（群速度）のちょうど半分
// 4. 3 本目の波（k3）を足すと、うなりはどうなる？ 波をたくさん足すと「1 つのかたまり」= 波束（02）になる
