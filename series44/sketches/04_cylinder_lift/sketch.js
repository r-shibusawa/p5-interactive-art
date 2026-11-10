// ============================================
// 04 円柱まわりの流れと循環 ─ クッタ・ジューコフスキーの定理
// 一様流 U の中の円柱（半径 a）に、循環 Γ（まわりを回る流れ）を足す
//   ψ = U (r − a²/r) sin θ + (Γ / 2π) ln(r / a)
// Γ = 0 なら上下対称で力はゼロ。Γ を足すと上が速く・下が遅くなり、圧力差で持ち上がる
//   揚力 L = ρ U Γ（形によらない！）　　回るボールが曲がる「マグヌス効果」と同じ
// 上下キー = 循環 Γ / 左右キー = 流速 U / R = 元に戻す
// ============================================

let U = 120; // ★ 一様流の速さ [px/秒]
let a = 90; // ★ 円柱の半径 [px]
let gam = 0; // 循環 Γ ÷ (4πUa)。1 をこえると淀み点が円柱からはなれる
let rho = 1; // ★ 密度
let spacing = 22; // ★ 流線の間かく [px]

let layer, fieldImg, dots = [], dirty = true;
let GX = 129, GY, cell, cx, cy;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  layer = createGraphics(width, height);
  layer.colorMode(HSB, 360, 100, 100, 100);
  cell = width / (GX - 1);
  GY = Math.ceil(height / cell) + 1;
  fieldImg = createImage(GX, GY);
  cx = width * 0.45; cy = height * 0.54;
  a = Math.min(a, height * 0.14);
  for (let i = 0; i < 320; i++) dots.push({ x: Math.random() * width, y: Math.random() * height });
}

function circulation() { return gam * 4 * Math.PI * U * a; }

// ★ 流れ関数 ψ と速度（x 右向き・y 上向きの座標。円柱の中心が原点）
function flowAt(x, y) {
  let r2 = Math.max(x * x + y * y, a * a), r = Math.sqrt(r2), sn = y / r, cs = x / r, G = circulation() / (2 * Math.PI);
  let psi = U * (r - a * a / r) * sn + G * Math.log(r / a);
  let vr = U * (1 - a * a / r2) * cs; // 半径方向
  let vt = -U * (1 + a * a / r2) * sn - G / r; // 周方向（反時計回りが正）
  return [psi, vr * cs - vt * sn, vr * sn + vt * cs];
}

// 圧力の色と流線を描き直す（Γ か U を変えたときだけ）
function rebuild() {
  let f = new Float32Array(GX * GY);
  fieldImg.loadPixels();
  for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) {
    let w = flowAt(i * cell - cx, cy - j * cell);
    f[i + j * GX] = w[0] / (U * spacing);
    // ベルヌーイの定理：圧力係数 Cp = (p − p∞) / (½ρU²) = 1 − (v/U)²
    let cp = constrain(1 - (w[1] * w[1] + w[2] * w[2]) / (U * U), -3, 1), k = (i + j * GX) * 4;
    let hot = Math.max(cp, 0), cold = Math.max(-cp / 3, 0); // 赤 = 高圧、青 = 低圧
    fieldImg.pixels[k] = 14 + 200 * hot; fieldImg.pixels[k + 1] = 26 + 40 * hot + 90 * cold; fieldImg.pixels[k + 2] = 46 + 170 * cold; fieldImg.pixels[k + 3] = 255;
  }
  fieldImg.updatePixels();
  layer.clear();
  layer.image(fieldImg, 0, 0, (GX) * cell, (GY) * cell);
  layer.stroke(0, 0, 100, 55); layer.strokeWeight(1.2);
  contourLines(layer, f, GX, GY, (i, j) => i * cell, (i, j) => j * cell, 0);
  dirty = false;
}

function draw() {
  if (dirty) rebuild();
  image(layer, 0, 0, width, height);
  let dt = Math.min(deltaTime / 1000, 0.033), G = circulation();

  // 流れに乗る粒
  noStroke(); fill(0, 0, 100, 80);
  for (let q of dots) {
    let w = flowAt(q.x - cx, cy - q.y);
    q.x += w[1] * dt; q.y -= w[2] * dt;
    if (q.x > width || q.y < 0 || q.y > height || Math.hypot(q.x - cx, q.y - cy) < a) { q.x = 0; q.y = Math.random() * height; }
    circle(q.x, q.y, 3.5);
  }

  // ---- 円柱の表面：圧力の色と、圧力が押す力（矢印）。足し合わせて揚力を数値で求める
  let liftSum = 0, n = 72;
  for (let k = 0; k < n; k++) {
    let th = (k + 0.5) * 2 * Math.PI / n;
    let vt = -2 * U * Math.sin(th) - G / (2 * Math.PI * a); // 表面の速さ
    let cp = 1 - vt * vt / (U * U);
    liftSum += -(0.5 * rho * U * U * cp) * Math.sin(th) * a * (2 * Math.PI / n); // 圧力 × 面積 × 上向き成分
    let px = cx + a * Math.cos(th), py = cy - a * Math.sin(th), len = constrain(cp, -6, 1) * 14;
    stroke(cp > 0 ? 8 : 205, 80, 100); strokeWeight(2);
    line(px, py, px + len * Math.cos(th), py - len * Math.sin(th)); // 外向き = 高圧、内向き = 低圧（吸われる）
  }
  fill(215, 40, 22); stroke(0, 0, 100); strokeWeight(2);
  circle(cx, cy, 2 * a);
  // 回転の向き
  noFill(); stroke(42, 80, 100); strokeWeight(3);
  if (Math.abs(gam) > 0.01) { arc(cx, cy, a, a, 0.4, 5.2); let s = gam > 0 ? 5.2 : 0.4, d = gam > 0 ? 1 : -1; line(cx + a / 2 * Math.cos(s), cy + a / 2 * Math.sin(s), cx + a / 2 * Math.cos(s) - 12 * d, cy + a / 2 * Math.sin(s) - 10); }
  // 淀み点（速さ 0 の点）：sin θ = −Γ / (4πUa)
  noStroke(); fill(42, 90, 100);
  if (Math.abs(gam) <= 1) {
    let ths = Math.asin(-gam);
    circle(cx + a * Math.cos(ths), cy - a * Math.sin(ths), 12); circle(cx - a * Math.cos(ths), cy - a * Math.sin(ths), 12);
  } else {
    let rs = a * (Math.abs(gam) + Math.sqrt(gam * gam - 1)); // 円柱をはなれた淀み点
    circle(cx, cy + (gam > 0 ? rs : -rs), 12);
  }
  // 揚力の矢印
  let L = rho * U * G; // ★ クッタ・ジューコフスキーの定理
  stroke(130, 70, 100); strokeWeight(5);
  let len = constrain(L / (rho * U * U * a) * 12, -220, 220);
  if (Math.abs(len) > 2) { line(cx, cy, cx, cy - len); line(cx, cy - len, cx - 9, cy - len + (len > 0 ? 12 : -12)); line(cx, cy - len, cx + 9, cy - len + (len > 0 ? 12 : -12)); }

  noStroke(); fill(0, 0, 100); textSize(18);
  text('循環 Γ = ' + nf(gam, 1, 2) + ' × 4πUa（上下キー）　流速 U = ' + U + '（左右キー）　R = 元に戻す', 20, 40);
  fill(0, 0, 80); textSize(15);
  text('揚力 L = ρUΓ = ' + nf(L / 1e6, 1, 3) + '　／　表面の圧力を足し合わせた値 = ' + nf(liftSum / 1e6, 1, 3) + '　（× 10⁶）　黄 ● = 淀み点　緑 = 揚力', 20, 68);
  text(Math.abs(gam) < 0.01 ? '上下対称：前後・上下の圧力がつり合い、力はゼロ（ダランベールのパラドックス）' : Math.abs(gam) <= 1 ? '上が速い → 上の圧力が低い（青）→ 上に吸い上げられる' : '淀み点が円柱からはなれ、円柱のまわりを回り続ける流体ができる', 20, height - 24);
}

function keyPressed() {
  if (key === UP_ARROW) gam = Math.min(gam + 0.1, 1.6);
  if (key === DOWN_ARROW) gam = Math.max(gam - 0.1, -1.6);
  if (key === RIGHT_ARROW) U = Math.min(U + 20, 240);
  if (key === LEFT_ARROW) U = Math.max(U - 20, 40);
  if (key === 'r' || key === 'R') { gam = 0; U = 120; }
  if (Math.abs(gam) < 0.001) gam = 0;
  dirty = true;
}

// ---------- やってみよう ----------
// 1. Γ = 0 で淀み点（黄）が前後にあるのを確認。上キーで Γ を増やすと 2 つの淀み点はどう動く？
// 2. Γ = 1.00 で 2 つが真下で 1 つに。それより増やすと？
// 3. 「ρUΓ」と「圧力を足し合わせた値」がいつも一致することを確かめる（定理の中身）
// 4. U を 2 倍にすると揚力は何倍？（Γ も 4πUa に比例させているので…）
// 5. 下キーで Γ を負に。野球のカーブ・サッカーの無回転でないシュートを思い出そう


// ==================================================
// ここから下は「等高線を描く道具」です
// ==================================================
// 等高線を引く（マーチングスクエア法）：nx × ny の格子の値 f が「整数」になる所を線で結ぶ
// X(i, j), Y(i, j) = 格子点の画面座標。wrap > 0 なら、値が wrap だけ飛ぶ「切れ目」をまたいでつなぐ
function contourLines(g, f, nx, ny, X, Y, wrap) {
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let c = [f[i + j * nx], f[i + 1 + j * nx], f[i + 1 + (j + 1) * nx], f[i + (j + 1) * nx]];
    if (wrap) for (let k = 1; k < 4; k++) c[k] -= wrap * Math.round((c[k] - c[0]) / wrap);
    let lo = Math.min(c[0], c[1], c[2], c[3]), hi = Math.max(c[0], c[1], c[2], c[3]);
    if (!(hi - lo < 5)) continue; // 特異点のすぐそば（値が急変）は描かない
    let px = [X(i, j), X(i + 1, j), X(i + 1, j + 1), X(i, j + 1)], py = [Y(i, j), Y(i + 1, j), Y(i + 1, j + 1), Y(i, j + 1)];
    for (let L = Math.ceil(lo); L <= hi; L++) {
      let q = [];
      for (let k = 0; k < 4; k++) {
        let a = c[k], b = c[(k + 1) % 4];
        if ((a < L) !== (b < L)) { let s = (L - a) / (b - a); q.push(px[k] + s * (px[(k + 1) % 4] - px[k]), py[k] + s * (py[(k + 1) % 4] - py[k])); }
      }
      if (q.length >= 4) g.line(q[0], q[1], q[2], q[3]);
      if (q.length === 8) g.line(q[4], q[5], q[6], q[7]);
    }
  }
}
