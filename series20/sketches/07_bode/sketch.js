// ============================================
// 07 ボード線図（周波数応答）
// 正弦波を入れると、同じ周波数の正弦波が「小さくなって・遅れて」出てくる
//   ゲイン |G(jω)|（何倍になるか、dB）と 位相 ∠G(jω)（どれだけ遅れるか、度）を ω ごとに描いたのがボード線図
// マウス左右 = 周波数 ω（対数）/ 1〜3 でシステム（一次遅れ・二次系・PID 付きループ）
// ============================================

let sys = 1;
let tau = 1.0; // ★ 一次遅れの時定数
let wn = 2.0, zeta = 0.2; // ★ 二次系の固有角周波数と減衰比（小さいと共振で山ができる）
let Kp = 3, Ki = 2, Kd = 0.5; // ★ PID 付きループのゲイン
let num = [1], den = [1, 1]; // 伝達関数の分子・分母（昇べきの係数：c[0] + c[1] s + c[2] s² …）
let w = 1, phase = 0, animT = 0;
let names = ['', '一次遅れ G = 1/(τs + 1)', '二次系 G = ωn²/(s² + 2ζωn s + ωn²)', 'PID 付きループ L = C(s)P(s)，P = 1/((s+1)(0.2s+1))'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  makeSystem();
}

function makeSystem() {
  if (sys === 1) { num = [1]; den = [1, tau]; }
  else if (sys === 2) { num = [wn * wn]; den = [wn * wn, 2 * zeta * wn, 1]; }
  else { num = [Ki, Kp, Kd]; den = polyMul([0, 1], polyMul([1, 1], [1, 0.2])); } // C = (Kd s² + Kp s + Ki)/s
}

function draw() {
  background(230, 30, 10);
  w = pow(10, map(mouseX, 0, width, -1, 2, true));
  let G = evalTF(num, den, w);
  let gain = cabs(G), ph = degrees(atan2(G[1], G[0]));
  if (ph > 0 && sys !== 3) ph -= 360;
  phase = ph;
  animT += 0.04;

  // ---- 左：入力と出力の波（横軸は位相 ωt、2 周期分）
  let ax = width * 0.05, ay = height * 0.2, aw = width * 0.4, ah = height * 0.4;
  noStroke(); fill(0, 0, 14); rect(ax, ay, aw, ah, 6);
  stroke(0, 0, 30); strokeWeight(1); line(ax, ay + ah / 2, ax + aw, ay + ah / 2);
  let amp = ah * 0.2;
  let dispGain = min(gain, 2.2);
  for (let pass = 0; pass < 2; pass++) {
    stroke(pass === 0 ? 0 : 30, pass === 0 ? 0 : 80, 100); strokeWeight(pass === 0 ? 2 : 3); noFill();
    beginShape();
    for (let i = 0; i <= 200; i++) {
      let ang = map(i, 0, 200, 0, 4 * PI) - animT;
      let val = pass === 0 ? sin(ang) : dispGain * sin(ang + radians(phase));
      vertex(map(i, 0, 200, ax, ax + aw), ay + ah / 2 - val * amp);
    }
    endShape();
  }
  // 右端の「いま」の値をおもりで表す（入力＝手、出力＝つながれた物体）
  let vin = sin(4 * PI - animT), vout = dispGain * sin(4 * PI - animT + radians(phase));
  noStroke(); fill(0, 0, 100); circle(ax + aw + 30, ay + ah / 2 - vin * amp, 18);
  fill(30, 80, 100); circle(ax + aw + 60, ay + ah / 2 - vout * amp, 18);
  fill(0, 0, 70); textSize(13); textAlign(LEFT, TOP);
  text('入力 sin(ωt)（白）と出力（橙）　ω = ' + nf(w, 1, 2) + ' rad/s', ax + 8, ay + 6);
  textAlign(LEFT, BASELINE);

  // ---- 右：ボード線図（ゲインと位相）
  let bx = width * 0.52, bw = width * 0.44, by1 = height * 0.18, bh = height * 0.3, by2 = height * 0.55;
  let N = 240, gains = [], phases = [], prev = null;
  for (let i = 0; i <= N; i++) {
    let wi = pow(10, map(i, 0, N, -1, 2));
    let Gi = evalTF(num, den, wi);
    gains.push(20 * Math.log10(max(cabs(Gi), 1e-9)));
    let p = degrees(atan2(Gi[1], Gi[0]));
    if (prev !== null) { while (p - prev > 180) p -= 360; while (p - prev < -180) p += 360; }
    else if (p > 0 && sys !== 3) p -= 360;
    phases.push(p); prev = p;
  }
  drawBode(bx, by1, bw, bh, gains, -60, 40, 'ゲイン [dB]　20·log10|G(jω)|', [0, -20, -40], 120);
  drawBode(bx, by2, bw, bh, phases, -270, 90, '位相 [deg]　∠G(jω)', [0, -90, -180], 200);
  // 選んだ ω の印
  let mx = map(log(w) / log(10), -1, 2, bx, bx + bw);
  stroke(45, 90, 100); strokeWeight(2);
  line(mx, by1, mx, by1 + bh); line(mx, by2, mx, by2 + bh);
  noStroke(); fill(45, 90, 100);
  circle(mx, map(constrain(20 * Math.log10(max(gain, 1e-9)), -60, 40), -60, 40, by1 + bh, by1), 10);
  circle(mx, map(constrain(phase, -270, 90), -270, 90, by2 + bh, by2), 10);

  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text('1〜3：' + names[sys] + '　ω = ' + nf(w, 1, 2) + ' rad/s（マウス左右）', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('ゲイン ' + nf(gain, 1, 3) + ' 倍（' + nf(20 * Math.log10(max(gain, 1e-9)), 1, 1) + ' dB）　位相 ' + nf(phase, 1, 1) + '°' + (phase < 0 ? '（遅れ）' : '') + '　横軸は対数：0.1 〜 100 rad/s', 20, 68);
  text('低い ω はそのまま通す、高い ω は小さく・遅れて出る（ローパス）。一次遅れは ω = 1/τ で −3 dB・−45°、二次系は ζ が小さいと ωn で山（共振）', 20, height - 30);
}

function drawBode(x, y, w, h, data, lo, hi, title, gridVals, hue) {
  noStroke(); fill(0, 0, 14); rect(x, y, w, h, 6);
  stroke(0, 0, 28); strokeWeight(1);
  for (let d = -1; d <= 2; d++) { let gx = map(d, -1, 2, x, x + w); line(gx, y, gx, y + h); }
  for (let gv of gridVals) { let gy = map(gv, lo, hi, y + h, y); line(x, gy, x + w, gy); }
  noStroke(); fill(0, 0, 60); textSize(11);
  for (let d = -1; d <= 2; d++) text(pow(10, d), map(d, -1, 2, x, x + w) + 3, y + h - 4);
  for (let gv of gridVals) text(gv, x + 3, map(gv, lo, hi, y + h, y) - 3);
  stroke(hue, 70, 100); strokeWeight(2.5); noFill();
  beginShape();
  for (let i = 0; i < data.length; i++) vertex(map(i, 0, data.length - 1, x, x + w), map(constrain(data[i], lo, hi), lo, hi, y + h, y));
  endShape();
  noStroke(); fill(0, 0, 70); textSize(13); textAlign(LEFT, TOP);
  text(title, x + 8, y + 6);
  textAlign(LEFT, BASELINE);
}

function keyPressed() {
  if (key >= '1' && key <= '3') { sys = int(key); makeSystem(); }
}

// ---------- やってみよう ----------
// 1. 一次遅れで ω = 1/τ（= 1）にマウスを置く。ゲイン −3 dB、位相 −45° を確かめる
// 2. 二次系の ζ を 0.05 にすると山はどれだけ高くなる？ ζ = 0.7 では？
// 3. PID 付きループ（3）で、位相が −180° になる ω でのゲインが 0 dB より下なら安定（→ 09 のゲイン余裕）
// 4. 低い ω でゲインが上がっていく（積分 1/s）のが 3 の特徴。I があると「ゆっくりの誤差」に強い


// ==================================================
// ここから下は「複素数と伝達関数の道具」です
// ==================================================
// 複素数は [実部, 虚部] の配列で表す
function cmul(a, b) { return [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]]; }
function cdiv(a, b) { let d = b[0] * b[0] + b[1] * b[1] + 1e-30; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; }
function cabs(a) { return Math.sqrt(a[0] * a[0] + a[1] * a[1]); }
// 多項式 c[0] + c[1] s + c[2] s² … を複素数 s で評価（ホーナー法）
function polyEvalC(c, s) {
  let acc = [0, 0];
  for (let i = c.length - 1; i >= 0; i--) acc = [cmul(acc, s)[0] + c[i], cmul(acc, s)[1]];
  return acc;
}
function polyMul(a, b) {
  let out = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) out[i + j] += a[i] * b[j];
  return out;
}
// 伝達関数 G(jω) = num(jω) / den(jω)
function evalTF(num, den, w) { return cdiv(polyEvalC(num, [0, w]), polyEvalC(den, [0, w])); }
