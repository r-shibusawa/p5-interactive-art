// ============================================
// 02 カムと従動節
// 「どんなふうに持ち上げたいか」（変位曲線 s(θ)）を先に決め、そこからカムの輪郭を作る
// 等速は角で加速度が無限大（衝撃）、単振動は加速度が飛ぶ、サイクロイドはなめらか
// 回転が速すぎると、ばねが従動節を押さえきれずカムから離れる（跳躍・ジャンプ）
// 1〜3 = 変位曲線（等速・単振動・サイクロイド）/ ←→ = 基礎円の半径 / ↑↓ = 回転数 / スペース = 止める
// ============================================

let lawId = 1;            // 1 等速 / 2 単振動 / 3 サイクロイド
let baseR = 60;           // ★ 基礎円の半径（mm）
let liftH = 25;           // ★ リフト量 h（mm）
let rollerR = 8;          // ★ ローラーの半径（mm）
let rpm = 300;            // ★ カムの回転数
let springAcc = 300000;   // ★ ばねが従動節を押し戻す加速度（mm/s²）
let riseEnd = 120, dwellEnd = 180, fallEnd = 300;   // ★ 上昇・休止・下降の区切り（度）
let th = 0, playing = true;
let follY = 0, follV = 0, gapMax = 0, jumpTimer = 0;
const PXMM = 2;           // 1 mm を何 px で描くか

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

// ★ 変位曲線（u = 0〜1 → 0〜1）
function law(u) {
  if (lawId === 1) return u;                                           // 等速
  if (lawId === 2) return (1 - Math.cos(Math.PI * u)) / 2;             // 単振動
  return u - Math.sin(TWO_PI * u) / TWO_PI;                            // サイクロイド
}
// カム角 θ（ラジアン）→ リフト s（mm）
function camLift(t) {
  let d = ((((t * 180) / Math.PI) % 360) + 360) % 360;
  if (d < riseEnd) return liftH * law(d / riseEnd);
  if (d < dwellEnd) return liftH;
  if (d < fallEnd) return liftH * (1 - law((d - dwellEnd) / (fallEnd - dwellEnd)));
  return 0;
}
function camD1(t) { return (camLift(t + 1e-3) - camLift(t - 1e-3)) / 2e-3; }            // ds/dθ
function camD2(t) { return (camLift(t + 2e-3) - 2 * camLift(t) + camLift(t - 2e-3)) / 4e-6; }  // d²s/dθ²

function draw() {
  background(212, 45, 13);
  let omega = (rpm * TWO_PI) / 60;
  // ---- 従動節の運動（スローモーションで積分）：カムに触れていなければ、ばねの加速度で落ちる
  if (playing) {
    let n = 20, dth = 0.03 / n, dt = dth / omega;
    for (let i = 0; i < n; i++) {
      th += dth;
      follV -= springAcc * dt;
      follY += follV * dt;
      let s = camLift(th);
      if (follY <= s) { follY = s; follV = camD1(th) * omega; }
      gapMax = Math.max(gapMax, follY - s);
    }
    if (th > TWO_PI) { th -= TWO_PI; if (gapMax > 0.05) jumpTimer = 90; gapMax = 0; }
  }
  if (jumpTimer > 0) jumpTimer--;
  let gap = follY - camLift(th);

  // ---- カムの輪郭：ピッチ曲線（ローラー中心の通り道）を内側へローラー半径ぶんオフセット
  let ccx = width * 0.25, ccy = height * 0.7;
  let pitch = [];
  for (let i = 0; i < 240; i++) {
    let p = (i / 240) * TWO_PI, r = (baseR + rollerR + camLift(p)) * PXMM;
    let a = -HALF_PI + p - th;                       // カム角 p の点は、いま画面のこの向きにある
    pitch.push({ x: r * Math.cos(a), y: r * Math.sin(a) });
  }
  let prof = [];
  for (let i = 0; i < 240; i++) {
    let a = pitch[(i + 239) % 240], b = pitch[(i + 1) % 240];
    let tx = b.x - a.x, ty = b.y - a.y, tl = Math.hypot(tx, ty) || 1;
    prof.push({ x: pitch[i].x - (ty / tl) * rollerR * PXMM, y: pitch[i].y + (tx / tl) * rollerR * PXMM });
  }
  push();
  translate(ccx, ccy);
  noFill(); stroke(0, 0, 45, 60); strokeWeight(1);
  circle(0, 0, baseR * 2 * PXMM);                     // 基礎円
  stroke(35, 60, 80, 50);
  beginShape(); for (let p of pitch) vertex(p.x, p.y); endShape(CLOSE);   // ピッチ曲線
  fill(200, 45, 60); stroke(200, 50, 95); strokeWeight(2);
  beginShape(); for (let p of prof) vertex(p.x, p.y); endShape(CLOSE);    // カム
  stroke(0, 0, 100, 60);
  line(0, 0, 40 * Math.cos(-HALF_PI - th), 40 * Math.sin(-HALF_PI - th));  // 回転の目印
  noStroke(); fill(0, 0, 100); circle(0, 0, 14);
  // 従動節（ローラー + 棒 + ばね）
  let ry = -(baseR + rollerR + follY) * PXMM;
  stroke(0, 0, 85); strokeWeight(8); line(0, ry, 0, ry - 120);
  noStroke(); fill(gap > 0.05 ? 0 : 35, 85, 100); circle(0, ry, rollerR * 2 * PXMM);
  let topY = -(baseR + rollerR + liftH) * PXMM - 120;
  fill(0, 0, 35); rect(-50, topY - 10, 100, 10);       // ばね受け
  rect(-34, ry - 50, 68, 6);                           // 従動節のつば
  stroke(140, 50, 90); strokeWeight(2); noFill();
  beginShape();
  for (let i = 0; i <= 12; i++) vertex(i === 0 || i === 12 ? 0 : (i % 2 ? 20 : -20), lerp(topY, ry - 50, i / 12));
  endShape();
  pop();

  // ---- 圧力角 α：tan α = (ds/dθ) / (基礎円 + ローラー + s)
  let alphaNow = Math.atan(camD1(th) / (baseR + rollerR + camLift(th)));
  let alphaMax = 0;
  for (let i = 0; i < 360; i++) { let t = (i / 360) * TWO_PI; alphaMax = Math.max(alphaMax, Math.abs(Math.atan(camD1(t) / (baseR + rollerR + camLift(t))))); }
  let aDeg = (alphaMax * 180) / Math.PI;

  // ---- グラフ（変位・速度・加速度）
  let gx = width * 0.54, gw = width - gx - 50, gy = 240, gh = (height - gy - 50) / 3;
  let peakV = liftH / ((riseEnd * Math.PI) / 180) * 2.2, peakA = liftH / Math.pow((riseEnd * Math.PI) / 180, 2) * 7;
  let rows = [
    { name: '変位 s', hue: 35, f: camLift, peak: liftH * 1.1, base: 0.9 },
    { name: '速度 ds/dθ', hue: 190, f: camD1, peak: peakV, base: 0.5 },
    { name: '加速度 d²s/dθ²', hue: 320, f: camD2, peak: peakA, base: 0.5 },
  ];
  let thNow = ((th % TWO_PI) + TWO_PI) % TWO_PI;
  for (let i = 0; i < 3; i++) {
    let r = rows[i], y0 = gy + gh * i + gh * r.base, amp = gh * (r.base > 0.6 ? 0.8 : 0.45);
    stroke(0, 0, 30); strokeWeight(1); line(gx, y0, gx + gw, y0);
    noFill(); stroke(r.hue, 70, 100); strokeWeight(2.5);
    beginShape();
    for (let k = 0; k <= 360; k++) vertex(gx + (k / 360) * gw, y0 - constrain(r.f((k / 360) * TWO_PI) / r.peak, -1.05, 1.05) * amp);
    endShape();
    noStroke(); fill(r.hue, 70, 100);
    circle(gx + (thNow / TWO_PI) * gw, y0 - constrain(r.f(thNow) / r.peak, -1.05, 1.05) * amp, 11);
    fill(r.hue, 50, 100); textSize(14); text(r.name, gx, gy + gh * i + 14);
  }
  if (lawId === 1) { fill(320, 60, 100); textSize(13); text('↑ 等速は角で加速度が ∞（針のようなとげ）＝ 衝撃', gx + gw * 0.36, gy + gh * 2 + 14); }
  noStroke(); fill(0, 0, 60); textSize(12);
  for (let d = 0; d <= 360; d += 60) text(d + '°', gx + (d / 360) * gw - 8, gy + gh * 3 + 18);

  // ---- 文字
  noStroke(); fill(0, 0, 100); textSize(18);
  text('1〜3：変位曲線（' + ['等速', '単振動', 'サイクロイド'][lawId - 1] + '）　←→：基礎円 ' + baseR + ' mm　↑↓：回転数 ' + rpm + ' rpm　スペース：' + (playing ? '止める' : '動かす'), 20, 40);
  fill(0, 0, 60); textSize(15);
  text('変位曲線 s(θ) を決める → 半径 = 基礎円 + s(θ) でカムの形になる。画面はスローモーション（実際は 1 秒に ' + nf(rpm / 60, 1, 1) + ' 回転）', 20, 68);
  let ix = width * 0.54 + 12, iy = 120;
  fill(0, 0, 100, 8); rect(ix - 12, iy - 26, 520, 118, 10);
  fill(0, 0, 100); textSize(16);
  text('圧力角 tan α = (ds/dθ) / (R₀ + s)', ix, iy);
  fill(aDeg > 30 ? 0 : 140, 70, 100);
  text('いま α = ' + nf((alphaNow * 180) / Math.PI, 1, 1) + '°　最大 ' + nf(aDeg, 1, 1) + '°' + (aDeg > 30 ? '（30° 超：こじれる）' : '（30° 以下：良好）'), ix, iy + 28);
  fill(jumpTimer > 0 || gap > 0.05 ? 0 : 140, 70, 100);
  text(jumpTimer > 0 || gap > 0.05 ? '跳躍あり！ 従動節がカムから離れた（すき間 ' + nf(Math.max(gap, 0), 1, 2) + ' mm）' : '跳躍なし（ばねが押さえている）', ix, iy + 56);
  fill(0, 0, 60); textSize(13);
  text('跳躍の条件：カムが要求する減速 |d²s/dθ²| ω² ＞ ばねの加速度', ix, iy + 80);
}

function keyPressed() {
  if (key === '1' || key === '2' || key === '3') lawId = Number(key);
  if (key === LEFT_ARROW) baseR = constrain(baseR - 5, 20, 80);
  if (key === RIGHT_ARROW) baseR = constrain(baseR + 5, 20, 80);
  if (key === UP_ARROW) rpm = constrain(rpm + 100, 100, 3000);
  if (key === DOWN_ARROW) rpm = constrain(rpm - 100, 100, 3000);
  if (key === ' ') playing = !playing;
}

// ---------- やってみよう ----------
// 1. 1 → 2 → 3 と切り替えて加速度のグラフを比べよう。とげ（∞）→ 段差 → なめらか
// 2. ↑ で回転数を上げていく。単振動（2）とサイクロイド（3）で、跳躍が始まる回転数はそれぞれいくつ？
// 3. ← で基礎円を小さくすると圧力角が大きくなる。30° を超えない最小の基礎円を探そう（小さいカム ⇄ 小さい圧力角）
// 4. riseEnd を 60 にすると（急に持ち上げる）、圧力角と跳躍はどうなる？
// 5. law() に「5 次多項式 10u³ − 15u⁴ + 6u⁵」を 4 番目として足し、加速度の最大値をサイクロイドと比べよう
