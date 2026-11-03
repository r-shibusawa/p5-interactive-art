// ============================================
// 03 凹面鏡・凸面鏡と球面収差
// 平行光線が球面鏡に当たると、焦点 F（曲率半径の半分 R/2）に集まる（凹面）／ F から出たように広がる（凸面）
//   でも球面では、端のほうの光線ほど手前で軸と交わる = 球面収差。放物面鏡なら全部 1 点に集まる
// ↑↓ = 曲率半径 R / ←→ = 鏡の大きさ（開口） / P = 球面 ⇄ 放物面 / C = 凹 ⇄ 凸 / マウス上下 = 光線の傾き
// ============================================

let R = 440;              // ★ 曲率半径（px）
let aperture = 0.8;       // ★ 鏡の大きさ（R に対する割合 0.2〜0.95）
let rayCount = 25;        // ★ 光線の本数
let concave = true;
let parabolic = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

// 光線（p, d）と鏡の交点までの距離 t と法線 n（なければ null）
function hitMirror(px, py, dx, dy, V, axis, H) {
  let F = R / 2;
  let s = concave ? 1 : -1;                   // 凹: x = Vx − y²/(4F) 側に曲がる
  if (parabolic) {
    // (px + t dx − Vx) + s (py + t dy − ay)² / (4F) = 0 → t の 2 次方程式
    let yy = py - axis;
    let A = s * dy * dy / (4 * F), B = dx + s * 2 * yy * dy / (4 * F), C = (px - V) + s * yy * yy / (4 * F);
    let ts = solveQuad(A, B, C);
    for (let t of ts) {
      let y = py + t * dy - axis;
      if (t > 1e-6 && Math.abs(y) <= H) { let ny = s * 2 * y / (4 * F); let L = Math.hypot(1, ny); return { t, nx: 1 / L, ny: ny / L }; }
    }
    return null;
  }
  // 球面：中心 C = (Vx − sR, axis)
  let cx = V - s * R, cy = axis;
  let ox = px - cx, oy = py - cy;
  let B = 2 * (ox * dx + oy * dy), C = ox * ox + oy * oy - R * R;
  let ts = solveQuad(1, B, C);
  for (let t of ts) {
    let x = px + t * dx, y = py + t * dy;
    if (t > 1e-6 && Math.abs(y - axis) <= H && (concave ? x > cx : x < cx)) return { t, nx: (x - cx) / R, ny: (y - cy) / R };
  }
  return null;
}
function solveQuad(A, B, C) {
  if (Math.abs(A) < 1e-9) return Math.abs(B) < 1e-9 ? [] : [-C / B];
  let D = B * B - 4 * A * C;
  if (D < 0) return [];
  let q = Math.sqrt(D);
  return [(-B - q) / (2 * A), (-B + q) / (2 * A)].sort((a, b) => a - b);
}

function draw() {
  background(230, 40, 8);
  let V = width * 0.72, axis = height * 0.55;
  let H = Math.min(aperture * R, height * 0.44);
  let tilt = map(mouseY, 0, height, 0.12, -0.12, true);   // 入射光線の傾き（ラジアン）
  let F = R / 2;

  // 光軸
  stroke(0, 0, 100, 30); strokeWeight(1); line(0, axis, width, axis);

  // 鏡の形
  noFill(); stroke(190, 20, 100); strokeWeight(5);
  beginShape();
  for (let y = -H; y <= H; y += 4) vertex(mirrorX(y, V), axis + y);
  endShape();

  // 光線
  let crossings = [];
  blendMode(ADD);
  strokeWeight(1.5);
  for (let i = 0; i < rayCount; i++) {
    let y0 = -H + (2 * H) * (i + 0.5) / rayCount;
    let dx = Math.cos(tilt), dy = Math.sin(tilt);
    let px = 0, py = axis + y0 - V * Math.tan(tilt);        // 左端から出発（鏡の面で高さ y0 になる）
    let h = hitMirror(px, py, dx, dy, V, axis, H);
    let edge = Math.abs(i - (rayCount - 1) / 2) / (rayCount / 2);   // 端の光線ほど 1
    stroke(45, 60, 100, 45);
    if (!h) { line(px, py, px + dx * 3000, py + dy * 3000); continue; }
    let hx = px + dx * h.t, hy = py + dy * h.t;
    line(px, py, hx, hy);
    // ★ 反射： d' = d − 2(d·n)n
    let dp = dx * h.nx + dy * h.ny;
    let rx = dx - 2 * dp * h.nx, ry = dy - 2 * dp * h.ny;
    stroke(edge > 0.8 ? 0 : 170, 70, 100, 45);
    line(hx, hy, hx + rx * 3000, hy + ry * 3000);
    if (!concave) { stroke(170, 70, 100, 18); drawDashed(hx, hy, hx - rx * 3000, hy - ry * 3000); }
    // 軸と交わる位置
    if (Math.abs(ry) > 1e-6) { let t = (axis - hy) / ry; crossings.push({ x: hx + rx * t, edge }); }
  }
  blendMode(BLEND);

  // 焦点と交点のずれ
  let fx = V - (concave ? F : -F);
  noStroke(); fill(0, 0, 100); circle(fx, axis, 8);
  textSize(14); text('F', fx - 4, axis + 24);
  fill(0, 0, 60); circle(V - (concave ? R : -R), axis, 6); text('C', V - (concave ? R : -R) - 4, axis + 24);
  for (let c of crossings) { fill(c.edge > 0.8 ? 0 : 45, 80, 100, 70); circle(c.x, axis, 5); }
  let marg = crossings.length ? crossings.reduce((a, c) => (c.edge > a.edge ? c : a), crossings[0]) : null;

  // HUD
  fill(0, 0, 100); textSize(18);
  text((concave ? '凹面鏡' : '凸面鏡') + '（C）　' + (parabolic ? '放物面' : '球面') + '（P）　R = ' + R + '（↑↓）　f = R/2 = ' + F + '　開口 ' + nf(aperture, 1, 2) + '（←→）　マウス上下：光線の傾き', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('黄 = 入射光、水色 = 反射光、赤 = いちばん端の光線。軸上の点は反射光が軸と交わる位置', 20, 68);
  let px = 20, py = height - 110;
  fill(0, 0, 100, 8); rect(px - 4, py - 28, 560, 100, 10);
  fill(0, 0, 100); textSize(16);
  if (marg && !parabolic) {
    text('端の光線が軸と交わる位置：F から ' + nf(Math.abs(marg.x - fx), 1, 0) + ' px ずれ（球面収差）', px + 10, py);
    text('鏡を小さく（←）すると収差が減る。P で放物面にすると 0 になる', px + 10, py + 28);
  } else if (parabolic) {
    text('放物面：平行光線はすべて 1 点 F に集まる（パラボラアンテナ・望遠鏡）', px + 10, py);
    text('ただし傾いた光（マウス）にはコマ収差が出る', px + 10, py + 28);
  }
  fill(0, 0, 70); textSize(14);
  text(concave ? '凹面鏡：太陽光を集める・懐中電灯の反射板・反射望遠鏡' : '凸面鏡：広い範囲が小さく映る。カーブミラー・車のサイドミラー', px + 10, py + 56);
}

function mirrorX(y, V) {
  let F = R / 2, s = concave ? 1 : -1;
  if (parabolic) return V - s * y * y / (4 * F);
  let cx = V - s * R;
  return cx + s * Math.sqrt(Math.max(0, R * R - y * y));
}
function drawDashed(x1, y1, x2, y2) {
  let d = Math.hypot(x2 - x1, y2 - y1), n = Math.max(1, Math.floor(d / 14));
  for (let i = 0; i < n; i += 2) line(x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n, x1 + (x2 - x1) * (i + 1) / n, y1 + (y2 - y1) * (i + 1) / n);
}

function keyPressed() {
  if (key === UP_ARROW) R = Math.min(1200, R + 20);
  if (key === DOWN_ARROW) R = Math.max(120, R - 20);
  if (key === RIGHT_ARROW) aperture = Math.min(0.95, aperture + 0.05);
  if (key === LEFT_ARROW) aperture = Math.max(0.2, aperture - 0.05);
  if (key === 'p' || key === 'P') parabolic = !parabolic;
  if (key === 'c' || key === 'C') concave = !concave;
}

// ---------- やってみよう ----------
// 1. 開口を 0.95 にして、端の光線（赤）がどれだけ F より手前で交わるか見よう。開口 0.3 では？
// 2. P を押して放物面に。全部 F に集まる。でもマウスで傾けると像がにじむ（コマ収差）
// 3. 凸面鏡（C）：反射光の点線をたどると、鏡の裏の F から出たように見える（虚焦点）
// 4. rayCount を 200 にして blendMode(ADD) の重なりで「火線（カースティック）」を見よう → 05 へ
