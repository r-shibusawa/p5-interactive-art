// ============================================
// 10 量子もつれとベルの不等式
// 一重項状態 (|↑↓⟩ − |↓↑⟩)/√2 のペアを左右に飛ばし、角度 a, b の検出器でスピンを測る（結果は +1 か −1）
//   相関 E(a,b) = ⟨AB⟩ = −cos(a − b)。CHSH の S = |E(a,b) − E(a,b') + E(a',b) + E(a',b')| は
//   どんな「隠れた変数」の理論でも ≤ 2。でも量子力学では 2√2 ≈ 2.83 まで行く（実験でも確かめられた）
// ←→ = A の角度 a / ↑↓ = B の角度 b / H = 量子 ⇔ 隠れた変数モデル / スペース = 角度を自動で一周 / C = 記録を消す
// ============================================

let a = 0, b = 45;          // ★ 検出器の角度（度）
let hidden = false;         // 隠れた変数モデル
let pairsPerFrame = 60;     // ★ 1 フレームのペア数
let sweep = false;
let sumAB = 0, nAB = 0;     // いまの角度での相関
let eCurve = [];             // 角度の差ごとの測定値 {sum, n}（0〜180° を 36 区間）
let chsh = [[0, 0], [0, 0], [0, 0], [0, 0]];   // CHSH の 4 つの組の {sum, n}
let flights = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  reset();
}
function reset() { eCurve = Array.from({ length: 37 }, () => ({ sum: 0, n: 0 })); chsh = [[0, 0], [0, 0], [0, 0], [0, 0]]; sumAB = 0; nAB = 0; }

// ★ 1 組のペアを測る：A と B の結果（±1）を返す
function measure(aDeg, bDeg) {
  let ar = radians(aDeg), br = radians(bDeg);
  if (!hidden) {
    // 量子力学：A はでたらめに ±1。B が A と同じになる確率は sin²((a − b)/2)
    let A = random() < 0.5 ? 1 : -1;
    let B = random() < sq(sin((ar - br) / 2)) ? A : -A;
    return [A, B];
  }
  // 隠れた変数：ペアは生まれたときに方向 λ を持っていて、結果は λ と検出器の角度だけで決まる
  let lam = random(TWO_PI);
  let A = cos(ar - lam) >= 0 ? 1 : -1;
  let B = cos(br - lam) >= 0 ? -1 : 1;
  return [A, B];
}

function draw() {
  background(320, 20, 10);
  if (sweep) { b = (b + 0.5) % 360; }
  for (let i = 0; i < pairsPerFrame; i++) {
    let [A, B] = measure(a, b);
    sumAB += A * B; nAB++;
    let d = abs(((a - b) % 360 + 540) % 360 - 180);          // 角度の差 0〜180°
    let k = round(d / 5); eCurve[k].sum += A * B; eCurve[k].n++;
    if (i === 0 && frameCount % 4 === 0) flights.push({ t: 0, A, B });
  }
  // CHSH の 4 組：a = 0°, a' = 90°, b = 45°, b' = 135°
  let sets = [[0, 45], [0, 135], [90, 45], [90, 135]];
  for (let s = 0; s < 4; s++) for (let i = 0; i < 25; i++) { let [A, B] = measure(sets[s][0], sets[s][1]); chsh[s][0] += A * B; chsh[s][1]++; }
  let E = (s) => (chsh[s][1] ? chsh[s][0] / chsh[s][1] : 0);
  let S = abs(E(0) - E(1) + E(2) + E(3));

  // --- 上：源と 2 つの検出器 ---
  let cx = width / 2, cy = height * 0.27, dxA = cx - width * 0.32, dxB = cx + width * 0.32;
  noStroke(); fill(0, 0, 80); circle(cx, cy, 26);
  for (let f of flights) {
    f.t += 0.04;
    let xa = lerp(cx, dxA, min(f.t, 1)), xb = lerp(cx, dxB, min(f.t, 1));
    fill(190, 60, 100, f.t < 1 ? 100 : 0); circle(xa, cy, 9); circle(xb, cy, 9);
  }
  let landed = flights.filter((f) => f.t >= 1).pop();
  flights = flights.filter((f) => f.t < 1.3);
  for (let [x, ang, res, nm] of [[dxA, a, landed ? landed.A : 0, 'A'], [dxB, b, landed ? landed.B : 0, 'B']]) {
    fill(res > 0 ? color(120, 70, 80) : res < 0 ? color(0, 70, 80) : color(0, 0, 30)); circle(x, cy, 90);
    stroke(55, 90, 100); strokeWeight(4);
    let r = radians(ang);
    line(x - 38 * sin(r), cy + 38 * cos(r), x + 38 * sin(r), cy - 38 * cos(r));
    noStroke(); fill(55, 90, 100); circle(x + 38 * sin(r), cy - 38 * cos(r), 10);
    fill(0, 0, 100); textSize(16); textAlign(CENTER);
    text(nm + '：' + nf(ang, 1, 0) + '°　結果 ' + (res > 0 ? '+1' : res < 0 ? '−1' : ''), x, cy + 70);
    textAlign(LEFT);
  }

  // --- 左下：E(θ) のグラフ ---
  let gx = 70, gy = height * 0.48, gw = width * 0.5, gh = height * 0.38;
  noFill(); stroke(0, 0, 35); strokeWeight(1); rect(gx, gy, gw, gh); line(gx, gy + gh / 2, gx + gw, gy + gh / 2);
  let ex = (d) => gx + (d / 180) * gw, ey = (e) => gy + gh / 2 - e * (gh / 2);
  stroke(200, 70, 100); strokeWeight(2); beginShape();
  for (let d = 0; d <= 180; d += 2) vertex(ex(d), ey(-cos(radians(d))));
  endShape();
  stroke(30, 80, 100); beginShape();
  for (let d = 0; d <= 180; d += 2) vertex(ex(d), ey(-1 + (2 * d) / 180));
  endShape();
  noStroke(); fill(0, 0, 100);
  for (let k = 0; k < eCurve.length; k++) if (eCurve[k].n > 20) circle(ex(k * 5), ey(eCurve[k].sum / eCurve[k].n), 7);
  let dNow = abs(((a - b) % 360 + 540) % 360 - 180);
  stroke(55, 90, 100, 60); line(ex(dNow), gy, ex(dNow), gy + gh);
  noStroke(); fill(0, 0, 70); textSize(14);
  text('角度の差 a − b（0〜180°）', gx + gw - 170, gy + gh + 22);
  text('E = +1', gx - 60, gy + 6); text('E = −1', gx - 60, gy + gh);
  fill(200, 70, 100); text('量子：−cos(a − b)', gx + 10, gy + 20);
  fill(30, 80, 100); text('隠れた変数：直線（三角波）', gx + 10, gy + 40);
  fill(0, 0, 100); text('白い点 = シミュレーションの測定値', gx + 10, gy + 60);

  // --- 右下：CHSH ---
  let px = gx + gw + 60, py = gy + 20;
  fill(0, 0, 100); textSize(18); text('CHSH（a = 0°, a′ = 90°, b = 45°, b′ = 135°）', px, py);
  textSize(16);
  let lbl = ['E(a, b)', 'E(a, b′)', 'E(a′, b)', 'E(a′, b′)'];
  for (let s = 0; s < 4; s++) text(lbl[s] + ' = ' + nf(E(s), 1, 3), px, py + 32 + s * 24);
  textSize(28); fill(S > 2.05 ? color(120, 70, 100) : color(30, 80, 100));
  text('S = ' + nf(S, 1, 3), px, py + 160);
  textSize(15); fill(0, 0, 70);
  text('古典（隠れた変数）の上限 2　｜　量子の上限 2√2 = 2.828', px, py + 190);
  let bw = width - px - 60;
  fill(0, 0, 25); rect(px, py + 205, bw, 18);
  fill(S > 2 ? color(120, 70, 90) : color(30, 80, 90)); rect(px, py + 205, (min(S, 3) / 3) * bw, 18);
  stroke(0, 0, 100); line(px + (2 / 3) * bw, py + 198, px + (2 / 3) * bw, py + 230);
  stroke(120, 70, 100); line(px + (2.828 / 3) * bw, py + 198, px + (2.828 / 3) * bw, py + 230);
  noStroke(); fill(0, 0, 70); textSize(14);
  text('いまの角度での相関 E = ' + nf(nAB ? sumAB / nAB : 0, 1, 3) + '（理論 ' + nf(hidden ? -1 + (2 * dNow) / 180 : -cos(radians(dNow)), 1, 3) + '）', px, py + 260);

  fill(0, 0, 100); textSize(18);
  text('←→ a = ' + nf(a, 1, 0) + '°　↑↓ b = ' + nf(b, 1, 0) + '°　H：' + (hidden ? '隠れた変数モデル' : '量子力学') + '　スペース：b を自動で回す ' + (sweep ? 'ON' : 'off') + '　C：記録を消す', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('同じ角度なら必ず逆（E = −1）。ここまでは「最初から決まっていた」でも説明できる。違いが出るのは斜めの角度：量子のほうが相関が強い', 20, 68);
}

function keyPressed() {
  if (key === LEFT_ARROW) { a = (a + 345) % 360; sumAB = 0; nAB = 0; }
  if (key === RIGHT_ARROW) { a = (a + 15) % 360; sumAB = 0; nAB = 0; }
  if (key === UP_ARROW) { b = (b + 15) % 360; sumAB = 0; nAB = 0; }
  if (key === DOWN_ARROW) { b = (b + 345) % 360; sumAB = 0; nAB = 0; }
  if (key === 'h' || key === 'H') { hidden = !hidden; reset(); }
  if (key === ' ') sweep = !sweep;
  if (key === 'c' || key === 'C') reset();
}

// ---------- やってみよう ----------
// 1. a = b にして E = −1 を確かめる。a − b = 90° では E = 0（無相関）
// 2. H で隠れた変数モデルにすると、0° と 180° では量子と一致するのに 45° でずれる。S はいくつ？
// 3. CHSH の角度を変えて（sets を書き換えて）、量子で S が最大になる角度を探そう
// 4. 隠れた変数モデルの measure を自分で工夫して S > 2 にできるか挑戦（ベルの定理：局所的なら無理）
