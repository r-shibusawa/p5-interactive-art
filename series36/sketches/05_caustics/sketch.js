// ============================================
// 05 ガラス円柱・水滴の光線追跡と火線（カースティック）
// たくさんの平行光線が丸いガラスに入り、屈折・反射をくり返す
//   境界ごとにフレネルの式で「反射する割合 R」と「通り抜ける割合 1−R」に分け、両方を追いかける
//   光線が集中する場所が明るい曲線 = 火線（コップの底やプールの底のゆらめく光）
// マウス = 光の来る方向 / ↑↓ = 屈折率 n / ←→ = 光線の本数 / B = 反射の回数 / 1〜3 = 水・ガラス・ダイヤ
// ============================================

let n = 1.5;              // ★ 屈折率
let rayCount = 260;       // ★ 光線の本数
let maxBounce = 4;        // ★ 中で反射する最大回数
let radius = 230;         // ★ 円の半径

function setup() {
  createCanvas(windowWidth, windowHeight);
}

// 光線（p から向き d）と円（中心 c、半径 r）の交点までの距離。inside = 中から出る場合
function hitCircle(px, py, dx, dy, cx, cy, r, inside) {
  let ox = px - cx, oy = py - cy;
  let B = 2 * (ox * dx + oy * dy), C = ox * ox + oy * oy - r * r;
  let D = B * B - 4 * C;
  if (D < 0) return null;
  let q = Math.sqrt(D);
  let t = inside ? (-B + q) / 2 : (-B - q) / 2;
  return t > 1e-6 ? t : null;
}
// ★ フレネルの反射率（s と p の平均）
function fresnelR(na, nb, cosI, cosT) {
  let rs = (na * cosI - nb * cosT) / (na * cosI + nb * cosT);
  let rp = (na * cosT - nb * cosI) / (na * cosT + nb * cosI);
  return (rs * rs + rp * rp) / 2;
}
function seg(x1, y1, x2, y2, w, hue) {
  stroke(hue[0], hue[1], hue[2], Math.min(255, 255 * w)); line(x1, y1, x2, y2);
}

function draw() {
  background(8, 10, 18);
  let cx = width * 0.5, cy = height * 0.55;
  let ang = Math.atan2(mouseY - cy, mouseX - cx);          // マウスの方向から光が来る
  let dx = -Math.cos(ang), dy = -Math.sin(ang);             // 光の向き（マウス→中心）
  let ex = -dy, ey = dx;                                    // 光に直角な向き
  let startDist = radius * 2.2;

  blendMode(ADD);
  strokeWeight(1.2);
  let alpha = 3.2 / Math.sqrt(rayCount / 100);              // 本数が増えたら 1 本を暗く
  let outCol = [255 * 0.3 * alpha, 200 * 0.3 * alpha, 90 * 0.3 * alpha];
  let inCol = [90 * 0.3 * alpha, 200 * 0.3 * alpha, 255 * 0.3 * alpha];
  for (let i = 0; i < rayCount; i++) {
    let off = -radius * 1.02 + radius * 2.04 * (i + 0.5) / rayCount;
    let px = cx - dx * startDist + ex * off, py = cy - dy * startDist + ey * off;
    let ddx = dx, ddy = dy;
    let t = hitCircle(px, py, ddx, ddy, cx, cy, radius, false);
    if (t === null) { seg(px, py, px + ddx * 2500, py + ddy * 2500, 0.5, outCol); continue; }
    let hx = px + ddx * t, hy = py + ddy * t;
    seg(px, py, hx, hy, 0.5, outCol);
    // 外から中へ：法線は内向き
    let nx = (cx - hx) / radius, ny = (cy - hy) / radius;
    let cosI = ddx * nx + ddy * ny;
    let sinT2 = (1 / n) * (1 / n) * (1 - cosI * cosI);
    let cosT = Math.sqrt(1 - sinT2);
    let R = fresnelR(1, n, cosI, cosT);
    // 反射光（外へ）
    let rx = ddx - 2 * cosI * nx, ry = ddy - 2 * cosI * ny;
    seg(hx, hy, hx + rx * 2500, hy + ry * 2500, R, outCol);
    // 屈折光（中へ）
    let w = 1 - R;
    let f = cosI / n - cosT;
    ddx = ddx / n - f * nx; ddy = ddy / n - f * ny;
    px = hx; py = hy;
    for (let b = 0; b <= maxBounce; b++) {
      let t2 = hitCircle(px, py, ddx, ddy, cx, cy, radius, true);
      if (t2 === null) break;
      let qx = px + ddx * t2, qy = py + ddy * t2;
      seg(px, py, qx, qy, w, inCol);
      // 中から外へ：法線は内向き（光と逆向き）
      let mx = (cx - qx) / radius, my = (cy - qy) / radius;
      let c1 = -(ddx * mx + ddy * my);                 // 入射角の cos
      let s2 = n * n * (1 - c1 * c1);
      let Rb = 1, c2 = 0;
      if (s2 < 1) { c2 = Math.sqrt(1 - s2); Rb = fresnelR(n, 1, c1, c2); }
      if (s2 < 1) {                                     // 外へ出る光
        let g = n * c1 - c2;
        let ox = n * ddx + g * mx, oy = n * ddy + g * my;
        seg(qx, qy, qx + ox * 2500, qy + oy * 2500, w * (1 - Rb), outCol);
      }
      // 中で反射して続ける
      let dp = ddx * mx + ddy * my;
      ddx -= 2 * dp * mx; ddy -= 2 * dp * my;
      w *= Rb;
      px = qx; py = qy;
      if (w < 0.01) break;
    }
  }
  blendMode(BLEND);

  // 円
  noFill(); stroke(255, 255, 255, 90); strokeWeight(2); circle(cx, cy, radius * 2);

  noStroke(); fill(255); textSize(18);
  text('n = ' + nf(n, 1, 2) + '（↑↓）　光線 ' + rayCount + ' 本（←→）　中で反射 ' + maxBounce + ' 回まで（B）　1：水 1.33　2：ガラス 1.5　3：ダイヤ 2.42', 20, 40);
  fill(160); textSize(15);
  text('マウスの方向から光が来る。黄 = 外の光、水色 = 中の光。明るい線が火線（光線の包絡線）。反射率はフレネルの式で計算', 20, 68);
  fill(160); textSize(14);
  text('n = 1.33 のとき、中で 1 回反射して戻る光が 42° 付近に集まる → 虹（11）', 20, height - 30);
}

function keyPressed() {
  if (key === UP_ARROW) n = Math.min(2.6, n + 0.02);
  if (key === DOWN_ARROW) n = Math.max(1.0, n - 0.02);
  if (key === RIGHT_ARROW) rayCount = Math.min(800, rayCount + 40);
  if (key === LEFT_ARROW) rayCount = Math.max(40, rayCount - 40);
  if (key === 'b' || key === 'B') maxBounce = (maxBounce + 1) % 6;
  if (key === '1') n = 1.33;
  if (key === '2') n = 1.5;
  if (key === '3') n = 2.42;
}

// ---------- やってみよう ----------
// 1. n を 1.0 から少しずつ上げる。火線の先（光が集まる点）はどう動く？ n = 2 では円の中に入る
// 2. ダイヤ（n = 2.42）は反射率が高く、中で何度も反射する → きらめきの理由
// 3. maxBounce を 0 にして、1 回目の屈折だけで火線（コップの底の三日月形）ができることを確かめよう
// 4. 円を 2 つ並べて（hitCircle をもう 1 回）レンズのように光を集めよう
