// ============================================
// 05 翼型 ─ ジューコフスキー変換
// 円柱まわりの流れ（04）を、写像 z = ζ + c²/ζ で「翼のまわりの流れ」に写す
// 円の中心をずらすと、厚み（左右）と反り（上下）のある翼になる
// 循環 Γ は「流れが後縁（とがった後ろの端）からなめらかに離れる」ように決まる（クッタの条件）
//   Γ = 4πUR sin(α + β)　→　揚力係数 C_L ≈ 2π sin(α + β)
// 左右キー = 迎角 α / 上下キー = 反り / 1・2 = 厚み / K = クッタの条件 ON/OFF / R = 元に戻す
// ============================================

let U0 = 2.0; // ★ 一様流の速さ（翼の長さ ≈ 4 を 2 秒で通る）
let alphaDeg = 6; // ★ 迎角 α [度]
let camber = 0.1; // ★ 反り（円の中心を上にずらす量）
let thick = 0.1; // ★ 厚み（円の中心を左にずらす量）
let kutta = true;
let c = 1; // 写像 z = ζ + c²/ζ の c（翼の長さ ≈ 4c）

let R, beta, al, G, mux, muy; // 円の半径、後縁の角度、迎角 [rad]、Γ/2π、円の中心
let layer, dirty = true, cols = [], lastRelease = 0, t = 0;
let unit, ox, oy;
let NT = 121, NR = 34;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  layer = createGraphics(width, height);
  layer.colorMode(HSB, 360, 100, 100, 100);
  unit = width / 13; ox = width * 0.48; oy = height * 0.55;
}

function update() {
  al = alphaDeg * Math.PI / 180;
  mux = -thick; muy = camber;
  R = Math.hypot(c - mux, muy); // 円は ζ = c（→ 後縁）を通る
  beta = Math.asin(muy / R);
  G = kutta ? 2 * U0 * R * Math.sin(al + beta) : 0; // ★ クッタの条件（G = Γ/2π）
}

// ζ 平面の点 → 翼の平面 z → 画面（流れが水平になるよう −α 回す）
function toScreen(zx, zy) {
  let d = zx * zx + zy * zy, x = zx + c * c * zx / d, y = zy - c * c * zy / d; // ★ z = ζ + c²/ζ
  let ca = Math.cos(al), sa = Math.sin(al);
  return [ox + (x * ca + y * sa) * unit, oy - (-x * sa + y * ca) * unit];
}

// ζ 平面での流れ関数 ψ（円柱の流れを α だけ傾けたもの。04 と同じ式）
function psiAt(r, th) { return U0 * (r - R * R / r) * Math.sin(th - al) + G * Math.log(r / R); }

// 粒子の動き dζ/dt = (dW/dζ の共役) ÷ |dz/dζ|²
function zetaVelocity(zx, zy) {
  let dx = zx - mux, dy = zy - muy, ca = Math.cos(al), sa = Math.sin(al);
  let px = dx * ca + dy * sa, py = -dx * sa + dy * ca; // 流れの向きに合わせた座標
  let r2 = Math.max(px * px + py * py, R * R);
  let ax = U0 * (1 - R * R * (px * px - py * py) / (r2 * r2)) + G * py / r2;
  let ay = U0 * (R * R * 2 * px * py / (r2 * r2)) + G * px / r2;
  let wx = ax * ca + ay * sa, wy = -ax * sa + ay * ca; // dW/dζ
  let z2 = zx * zx + zy * zy, jx = 1 - c * c * (zx * zx - zy * zy) / (z2 * z2), jy = c * c * 2 * zx * zy / (z2 * z2);
  let j2 = Math.max(jx * jx + jy * jy, 0.03);
  return [wx / j2, -wy / j2];
}

function rebuild() {
  update();
  // 円のまわりの極座標の格子で ψ を計算し、格子ごと翼の平面へ写して等高線を引く
  let f = new Float32Array(NT * NR), sx = new Float32Array(NT * NR), sy = new Float32Array(NT * NR);
  for (let j = 0; j < NR; j++) for (let i = 0; i < NT; i++) {
    let r = R * Math.pow(9, j / (NR - 1)), th = i * 2 * Math.PI / (NT - 1);
    f[i + j * NT] = psiAt(r, th) / (U0 * 0.22);
    let s = toScreen(mux + r * Math.cos(th), muy + r * Math.sin(th));
    sx[i + j * NT] = s[0]; sy[i + j * NT] = s[1];
  }
  layer.clear();
  layer.stroke(185, 60, 100, 60); layer.strokeWeight(1.2);
  contourLines(layer, f, NT, NR, (i, j) => sx[i + j * NT], (i, j) => sy[i + j * NT], 0);
  dirty = false;
}

function draw() {
  background(215, 60, 10);
  if (dirty) rebuild();
  image(layer, 0, 0, width, height);
  let dt = Math.min(deltaTime / 1000, 0.033);
  t += dt;

  // ---- タイムライン：左から縦 1 列の粒を 0.4 秒ごとに放す（上を通る粒のほうが先に着く！）
  if (t - lastRelease > 0.4) {
    lastRelease = t;
    let col = [];
    for (let k = -12; k <= 12; k++) { let x = -6.5, y = k * 0.22 + 0.11; col.push({ x: x * Math.cos(al) - y * Math.sin(al), y: x * Math.sin(al) + y * Math.cos(al) }); }
    cols.push(col);
    if (cols.length > 22) cols.shift();
  }
  for (let n = 0; n < cols.length; n++) {
    let prev = null;
    for (let q of cols[n]) {
      let v = zetaVelocity(q.x, q.y), sp = Math.hypot(v[0], v[1]), lim = Math.min(1, 12 / (sp + 1e-6));
      q.x += v[0] * lim * dt; q.y += v[1] * lim * dt;
      let s = toScreen(q.x, q.y);
      if (prev && Math.hypot(s[0] - prev[0], s[1] - prev[1]) < 50) { stroke(42, 70, 100, 70); strokeWeight(1.5); line(prev[0], prev[1], s[0], s[1]); }
      noStroke(); fill(42, 60, 100); circle(s[0], s[1], 4);
      prev = s;
    }
  }

  // ---- 翼：表面の圧力で色をつける（青 = 低圧、赤 = 高圧）
  let n = 180, pts = [];
  for (let k = 0; k <= n; k++) { let th = k * 2 * Math.PI / n; pts.push(toScreen(mux + R * Math.cos(th), muy + R * Math.sin(th))); }
  fill(215, 30, 30); noStroke();
  beginShape(); for (let q of pts) vertex(q[0], q[1]); endShape(CLOSE);
  strokeWeight(5);
  for (let k = 0; k < n; k++) {
    let th = (k + 0.5) * 2 * Math.PI / n, zx = mux + R * Math.cos(th), zy = muy + R * Math.sin(th);
    let vt = -2 * U0 * Math.sin(th - al) - G / R; // 円の表面の速さ
    let z2 = zx * zx + zy * zy, jx = 1 - c * c * (zx * zx - zy * zy) / (z2 * z2), jy = c * c * 2 * zx * zy / (z2 * z2);
    let sp = Math.abs(vt) / Math.sqrt(Math.max(jx * jx + jy * jy, 0.01)); // 翼の表面の速さ
    let cp = constrain(1 - sp * sp / (U0 * U0), -3, 1);
    stroke(cp > 0 ? 8 : 205, 85, cp > 0 ? 40 + 60 * cp : 40 - 20 * cp);
    line(pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1]);
  }
  // 揚力の矢印
  let CL = Math.PI * G / (U0 * c); // C_L = L / (½ρU² × 4c),  L = ρUΓ
  stroke(130, 70, 100); strokeWeight(5);
  let len = constrain(CL * 90, -200, 200);
  if (Math.abs(len) > 2) { line(ox, oy, ox, oy - len); line(ox, oy - len, ox - 9, oy - len + (len > 0 ? 12 : -12)); line(ox, oy - len, ox + 9, oy - len + (len > 0 ? 12 : -12)); }

  // ---- 左下：もとの円（ζ 平面）
  let ix = 110, iy = height - 120, iu = 55;
  noFill(); stroke(0, 0, 50); strokeWeight(1);
  line(ix - 90, iy, ix + 90, iy); line(ix, iy - 90, ix, iy + 90);
  stroke(185, 60, 100); strokeWeight(2); circle(ix + mux * iu, iy - muy * iu, 2 * R * iu);
  noStroke(); fill(42, 90, 100); circle(ix + c * iu, iy, 9); circle(ix + mux * iu, iy - muy * iu, 5);
  fill(0, 0, 65); textSize(13);
  text('ζ 平面の円（黄 = 後縁になる点）', ix - 90, iy + 108);

  noStroke(); fill(0, 0, 100); textSize(18);
  text('迎角 α = ' + alphaDeg + '°（左右キー）　反り ' + nf(camber, 1, 2) + '（上下キー）　厚み ' + nf(thick, 1, 2) + '（1・2）　クッタの条件 ' + (kutta ? 'ON' : 'OFF') + '（K）', 20, 40);
  fill(0, 0, 80); textSize(15);
  text('循環 Γ = ' + nf(2 * Math.PI * G, 1, 2) + '　揚力係数 C_L = ' + nf(CL, 1, 2) + '　（薄い翼の理論：2π sin(α + β) = ' + nf(2 * Math.PI * Math.sin(al + beta), 1, 2) + '）', 20, 68);
  fill(0, 0, 65);
  text(kutta ? '黄色の列：上を通る粒のほうが先に後縁へ着く。「上下で同時に着く」わけではない。速い上面は低圧（青）' : 'Γ = 0：流れが後縁を回り込み（速さ無限大）、揚力はゼロ。実際の流れでは粘性がこれを許さず、Γ が生まれる', 20, 94);
}

function keyPressed() {
  if (key === RIGHT_ARROW) alphaDeg = Math.min(alphaDeg + 1, 18);
  if (key === LEFT_ARROW) alphaDeg = Math.max(alphaDeg - 1, -10);
  if (key === UP_ARROW) camber = Math.min(camber + 0.02, 0.3);
  if (key === DOWN_ARROW) camber = Math.max(camber - 0.02, 0);
  if (key === '1') thick = Math.max(thick - 0.02, 0.02);
  if (key === '2') thick = Math.min(thick + 0.02, 0.3);
  if (key === 'k' || key === 'K') kutta = !kutta;
  if (key === 'r' || key === 'R') { alphaDeg = 6; camber = 0.1; thick = 0.1; kutta = true; }
  camber = Math.round(camber * 100) / 100; thick = Math.round(thick * 100) / 100;
  dirty = true; cols = [];
}

// ---------- やってみよう ----------
// 1. 迎角を 0° → 12° と上げる。C_L はほぼ直線で増える（1° あたり約 0.11）
// 2. 反りを 0 にして α = 0° にすると揚力は？ 反りがあると α = 0° でも揚力が出るのはなぜ？
// 3. K でクッタの条件を切る。後縁のまわりの流線と、粒の列の進み方を比べる
// 4. 厚みを 0.02 にすると「板」に近づく。厚みを変えても C_L があまり変わらないことを確かめる
// 5. この理論には「失速」がない（粘性を無視しているから）。本物の翼は α が 15° 前後で流れがはがれる


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
