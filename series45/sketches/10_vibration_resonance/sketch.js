// ============================================
// 10 強制振動と共振
// ばね・おもり・ダンパーを周期的な力でゆする：m x″ + c x′ + k x = F0 cos ωt（RK4 で積分）
// ゆする速さが固有振動数に近いと振幅が何倍にもなる（共振）。振幅倍率 M = 1 / √((1 − r²)² + (2ζr)²)、r = ω / ωn
// ←→ = 周波数比 r / ↑↓ = 減衰比 ζ / A = 動吸振器（小さなおもりを追加）/ S = r をゆっくり自動で上げる / R = リセット
// ============================================

let freqRatio = 0.6;         // 周波数比 r = ω / ωn
let zeta = 0.08;             // ★ 減衰比 ζ
let naturalHz = 1.0;         // ★ 固有振動数（Hz）
let staticPx = 9;            // ★ 静たわみ F0 / k（px）。振幅はこの M 倍になる
let massRatio = 0.15;        // ★ 動吸振器の質量比 μ = m2 / m1
let zeta2 = 0.02;            // ★ 動吸振器の減衰
let absorber = false, sweeping = false;
let st = [0, 0, 0, 0];       // 状態 [x1, v1, x2, v2]
let forcePhase = 0, tNow = 0;
let ampNow = 0, peakHold = 0, lastCrossT = 0;
let measured = [];           // シミュレーションから測った (r, 振幅倍率)
let strip = [];              // 時間波形

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

// ★ 運動方程式（ωn² で割った形）。動吸振器は主系と同じ固有振動数にそろえてある
function deriv(s, ph) {
  let wn = TWO_PI * naturalHz, f = wn * wn * staticPx * Math.cos(ph);
  let a1 = f - 2 * zeta * wn * s[1] - wn * wn * s[0];
  let a2 = 0;
  if (absorber) {
    let rel = wn * wn * (s[2] - s[0]) + 2 * zeta2 * wn * (s[3] - s[1]);   // 吸振器のばね＋ダンパーの力 / m2
    a1 += massRatio * rel;
    a2 = -rel;
  }
  return [s[1], a1, s[3], a2];
}
function rk4(dt) {
  let w = TWO_PI * naturalHz * freqRatio;
  let add = (s, k, h) => s.map((v, i) => v + k[i] * h);
  let k1 = deriv(st, forcePhase), k2 = deriv(add(st, k1, dt / 2), forcePhase + (w * dt) / 2);
  let k3 = deriv(add(st, k2, dt / 2), forcePhase + (w * dt) / 2), k4 = deriv(add(st, k3, dt), forcePhase + w * dt);
  st = st.map((v, i) => constrain(v + ((k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) * dt) / 6, -1e5, 1e5));
  forcePhase += w * dt; tNow += dt;
}

// ★ 理論の応答（複素数で 2×2 の連立方程式を解く）：返り値は 振幅倍率 と 位相遅れ
function response(r) {
  // 主系：(1 − r²) + i 2ζr、吸振器：k2 項 = μ(1 + i 2ζ2 r)、(1 − r²) + i 2ζ2 r
  let d1 = [1 - r * r, 2 * zeta * r];
  if (!absorber) return { mag: 1 / Math.hypot(d1[0], d1[1]), lag: Math.atan2(d1[1], d1[0]) };
  let kc = [massRatio, massRatio * 2 * zeta2 * r];                 // 吸振器のばね＋ダンパー
  let d22 = [1 - r * r, 2 * zeta2 * r];                            // 吸振器側（μ で割った形）
  let cm = (p, q) => [p[0] * q[0] - p[1] * q[1], p[0] * q[1] + p[1] * q[0]];
  // X1 = F · D22 / ((D1 + kc) · D22·μ − kc²) を μ でそろえて計算
  let D11 = [d1[0] + kc[0], d1[1] + kc[1]], D22 = [massRatio * d22[0], massRatio * d22[1]];
  let det = cm(D11, D22), kk = cm(kc, kc);
  det = [det[0] - kk[0], det[1] - kk[1]];
  let dm = det[0] * det[0] + det[1] * det[1];
  let x = [(D22[0] * det[0] + D22[1] * det[1]) / dm, (D22[1] * det[0] - D22[0] * det[1]) / dm];
  return { mag: Math.hypot(x[0], x[1]), lag: Math.atan2(-x[1], x[0]) };
}

function draw() {
  background(212, 45, 13);
  if (keyIsDown(LEFT_ARROW)) freqRatio -= 0.004;
  if (keyIsDown(RIGHT_ARROW)) freqRatio += 0.004;
  if (sweeping) { freqRatio += 0.0006; if (freqRatio >= 2.2) sweeping = false; }
  freqRatio = constrain(freqRatio, 0.1, 2.2);
  // ---- 積分（1 フレーム = 1/60 秒を 8 分割）
  for (let i = 0; i < 8; i++) {
    let before = st[1];
    rk4(1 / 480);
    peakHold = Math.max(peakHold, Math.abs(st[0]));
    if (before > 0 && st[1] <= 0) {                      // 速度が + → − に変わる瞬間 = 山。1 周期ごとに振幅を測る
      ampNow = peakHold; peakHold = 0;
      measured.push({ r: freqRatio, m: ampNow / staticPx });
      if (measured.length > 500) measured.shift();
    }
  }
  strip.push({ x: st[0], f: Math.cos(forcePhase) });
  if (strip.length > 360) strip.shift();

  // ---- 左：ばね・おもり・ダンパー
  let ccx = width * 0.2, restY = height * 0.5, ceilY = 110;
  let y1 = restY + constrain(st[0], -230, 250);
  let shakeY = ceilY + staticPx * Math.cos(forcePhase) * 1.5;      // 力の向きを天井の動きで表す
  noStroke(); fill(0, 0, 40); rect(ccx - 110, shakeY - 14, 220, 14);
  stroke(140, 50, 90); strokeWeight(2.5); noFill();
  beginShape();
  for (let i = 0; i <= 20; i++) vertex(ccx - 40 + (i === 0 || i === 20 ? 0 : i % 2 ? 16 : -16), lerp(shakeY, y1 - 34, i / 20));
  endShape();
  stroke(0, 0, 70); strokeWeight(3);
  let midD = (shakeY + y1 - 34) / 2;
  line(ccx + 40, shakeY, ccx + 40, midD + 14); line(ccx + 28, midD + 14, ccx + 52, midD + 14);
  line(ccx + 22, midD - 16, ccx + 22, midD + 30); line(ccx + 58, midD - 16, ccx + 58, midD + 30); line(ccx + 22, midD + 30, ccx + 58, midD + 30);
  line(ccx + 40, midD + 30, ccx + 40, y1 - 34);
  noStroke(); fill(200, 55, 90); rect(ccx - 70, y1 - 34, 140, 68, 8);
  fill(0, 0, 100); textSize(15); text('m', ccx - 6, y1 + 6);
  if (absorber) {
    let y2 = y1 + 110 + constrain(st[2] - st[0], -70, 200);
    stroke(35, 70, 100); strokeWeight(2.5); noFill();
    beginShape();
    for (let i = 0; i <= 12; i++) vertex(ccx + (i === 0 || i === 12 ? 0 : i % 2 ? 12 : -12), lerp(y1 + 34, y2 - 20, i / 12));
    endShape();
    noStroke(); fill(35, 80, 100); rect(ccx - 34, y2 - 20, 68, 40, 6);
    fill(0, 0, 10); textSize(13); text('動吸振器', ccx - 28, y2 + 5);
  }
  stroke(0, 0, 100, 30); strokeWeight(1); line(ccx - 150, restY, ccx + 150, restY);
  // 力の矢印
  let fa = Math.cos(forcePhase) * 46;
  stroke(0, 80, 100); strokeWeight(4);
  if (Math.abs(fa) > 4) { line(ccx - 100, y1, ccx - 100, y1 + fa); line(ccx - 100, y1 + fa, ccx - 107, y1 + fa - Math.sign(fa) * 9); line(ccx - 100, y1 + fa, ccx - 93, y1 + fa - Math.sign(fa) * 9); }

  // ---- 右上：応答曲線（振幅倍率）、右中：位相
  let gx = width * 0.44, gw = width - gx - 50, gy = 120, gh = height * 0.36, mTop = 8;
  let X = (r) => gx + (r / 2.2) * gw, Y = (m) => gy + gh - (Math.min(m, mTop) / mTop) * gh;
  stroke(0, 0, 45); strokeWeight(1); line(gx, gy, gx, gy + gh); line(gx, gy + gh, gx + gw, gy + gh);
  stroke(0, 0, 100, 25); line(X(1), gy, X(1), gy + gh);
  noFill(); stroke(200, 60, 100); strokeWeight(2.5);
  beginShape();
  for (let i = 1; i <= 220; i++) vertex(X(i / 100), Y(response(i / 100).mag));
  endShape();
  noStroke(); fill(50, 90, 100, 60);
  for (let p of measured) circle(X(p.r), Y(p.m), 5);                 // 測った点
  let th = response(freqRatio);
  fill(0, 80, 100); circle(X(freqRatio), Y(th.mag), 13);
  fill(0, 0, 60); textSize(12);
  for (let r = 0; r <= 2; r += 0.5) text(nf(r, 1, 1), X(r) - 8, gy + gh + 16);
  for (let m = 0; m <= mTop; m += 2) text(m, gx - 18, Y(m) + 4);
  text('周波数比 r = ω / ωn', gx + gw - 130, gy + gh + 34);
  fill(200, 50, 100); textSize(14); text('振幅倍率 M（青線＝理論、黄点＝シミュレーションの実測）', gx, gy - 10);
  // 位相
  let py = gy + gh + 60, ph = 70;
  stroke(0, 0, 45); strokeWeight(1); line(gx, py, gx, py + ph); line(gx, py + ph, gx + gw, py + ph);
  noFill(); stroke(320, 60, 100); strokeWeight(2);
  beginShape();
  for (let i = 1; i <= 220; i++) { let lg = response(i / 100).lag; if (lg < 0) lg += TWO_PI; vertex(X(i / 100), py + (Math.min(lg, Math.PI) / Math.PI) * ph); }
  endShape();
  let lagNow = th.lag < 0 ? th.lag + TWO_PI : th.lag;
  noStroke(); fill(0, 80, 100); circle(X(freqRatio), py + (Math.min(lagNow, Math.PI) / Math.PI) * ph, 10);
  fill(320, 50, 100); textSize(14); text('位相の遅れ（上 0° 〜 下 180°）：いま ' + nf((lagNow * 180) / Math.PI, 1, 0) + '°', gx, py - 8);
  // 時間波形
  let sy0 = height - 70, sAmp = 44;
  stroke(0, 0, 40); strokeWeight(1); line(gx, sy0, gx + gw, sy0);
  noFill();
  if (strip.length > 1) {
    stroke(0, 80, 100, 70); strokeWeight(1.5);
    beginShape(); for (let i = 0; i < strip.length; i++) vertex(gx + (i / 360) * gw, sy0 - strip[i].f * 14); endShape();
    stroke(200, 60, 100); strokeWeight(2);
    beginShape(); for (let i = 0; i < strip.length; i++) vertex(gx + (i / 360) * gw, sy0 + constrain(strip[i].x / (staticPx * mTop), -1.2, 1.2) * sAmp); endShape();
  }
  noStroke(); fill(0, 0, 60); textSize(12); text('赤＝力、青＝変位（下向きが正）。山のずれが位相の遅れ', gx, sy0 - 50);

  // ---- 文字
  noStroke(); fill(0, 0, 100); textSize(18);
  text('←→：周波数比 r = ' + nf(freqRatio, 1, 2) + '　↑↓：減衰比 ζ = ' + nf(zeta, 1, 2) + '　A：動吸振器 ' + (absorber ? 'ON' : 'off') + '　S：自動スイープ ' + (sweeping ? 'ON' : 'off') + '　R：リセット', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('r = 1（固有振動数と同じ速さ）でゆすると振幅が最大。理論の振幅倍率 M = ' + nf(th.mag, 1, 2) + '、実測 ' + nf(ampNow / staticPx, 1, 2) + '（落ち着くまで少し待つ）', 20, 68);
  fill(0, 0, 100); textSize(14);
  text('m x″ + c x′ + k x = F0 cos ωt', 30, height - 70);
  fill(0, 0, 65); textSize(13);
  text(absorber ? '動吸振器：小さなおもりが代わりに揺れて、r = 1 の振幅を消す（山が 2 つに割れる）' : 'M = 1 / √((1 − r²)² + (2ζr)²)　最大はおよそ 1 / 2ζ = ' + nf(1 / (2 * zeta), 1, 1), 30, height - 46);
}

function keyPressed() {
  if (key === UP_ARROW) zeta = constrain(zeta + 0.01, 0.03, 1);
  if (key === DOWN_ARROW) zeta = constrain(zeta - 0.01, 0.03, 1);
  if (key === 'a' || key === 'A') { absorber = !absorber; st[2] = st[0]; st[3] = st[1]; measured = []; }
  if (key === 's' || key === 'S') { sweeping = !sweeping; if (sweeping) { freqRatio = 0.2; measured = []; } }
  if (key === 'r' || key === 'R') { st = [0, 0, 0, 0]; measured = []; strip = []; freqRatio = 0.6; zeta = 0.08; sweeping = false; }
  if (key === UP_ARROW || key === DOWN_ARROW) measured = [];
}

// ---------- やってみよう ----------
// 1. S で自動スイープ。黄色の実測点が青い理論曲線をなぞる。ずれるのはどこ？（スイープが速いと共振が育ちきらない）
// 2. r = 1 で位相の遅れはちょうど 90°。r が小さいと力と同じ向き、大きいと逆向きに動く。時間波形で確かめよう
// 3. ζ を 0.03 まで下げると倍率は 1/2ζ ≈ 17。ブランコを「タイミングよく」押すと大きく揺れるのと同じ
// 4. A で動吸振器を付けると r = 1 の山が消えて 2 つに割れる。massRatio を 0.3 にすると 2 つの山の間隔は？
// 5. 洗濯機は脱水で回転が上がるとき r = 1 を通過する。r = 1.5 で使うなら ζ は大きい方がいい？小さい方がいい？
