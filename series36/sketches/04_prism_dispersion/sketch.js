// ============================================
// 04 プリズムと分散
// 白色光は 400〜700 nm の光の混ざりもの。ガラスの屈折率は波長で少し違う（短い波長ほど大きい）
//   コーシーの式： n(λ) = A + B/λ²   → 紫はよく曲がり、赤はあまり曲がらない → 虹色に分かれる（分散）
// マウス上下 = 光が入る高さ / ←→ = 入射角 / ↑↓ = 頂角 / G = ガラスの種類（クラウン・フリント） / R = リセット
// ============================================

let apex = 60;            // ★ 頂角（度）
let incDeg = -20;         // ★ 入射光の傾き（度）負 = 上向き
let glassKind = 0;        // 0 クラウン（ふつうのガラス）、1 フリント（分散が大きい）
let glasses = [{ name: 'クラウンガラス', A: 1.5046, B: 0.00420 }, { name: 'フリントガラス', A: 1.6000, B: 0.01200 }];   // ★ B の単位 μm²
let stepNm = 10;          // ★ 波長の刻み（nm）小さいほど光線が多い

function setup() {
  createCanvas(windowWidth, windowHeight);
}

// ★ 屈折率 n(λ)、λ は nm
function refIndex(nm) { let g = glasses[glassKind]; let um = nm / 1000; return g.A + g.B / (um * um); }

// 光線と線分の交点
function raySeg(px, py, dx, dy, a, b) {
  let ex = b.x - a.x, ey = b.y - a.y, den = dx * ey - dy * ex;
  if (Math.abs(den) < 1e-9) return null;
  let t = ((a.x - px) * ey - (a.y - py) * ex) / den, s = ((a.x - px) * dy - (a.y - py) * dx) / den;
  return t > 1e-6 && s >= 0 && s <= 1 ? t : null;
}
// スネルの法則で向きを変える（na → nb）。全反射なら null
function snellRefract(dx, dy, nx, ny, na, nb) {
  let c = -(dx * nx + dy * ny);
  if (c < 0) { nx = -nx; ny = -ny; c = -c; }          // 法線を光の来た側へ
  let r = na / nb, k = 1 - r * r * (1 - c * c);
  if (k < 0) return null;
  let f = r * c - Math.sqrt(k);
  return { x: r * dx + f * nx, y: r * dy + f * ny };
}

// ★ 多角形のガラスを通り抜ける光線を追跡（点の列を返す）
function tracePrism(px, py, dx, dy, poly, n) {
  let pts = [{ x: px, y: py }];
  let edges = poly.map((p, i) => [p, poly[(i + 1) % poly.length]]);
  let hit = nearest(px, py, dx, dy, edges, -1);
  if (!hit) { pts.push({ x: px + dx * 3000, y: py + dy * 3000 }); return pts; }
  px += dx * hit.t; py += dy * hit.t; pts.push({ x: px, y: py });
  let d = snellRefract(dx, dy, hit.nx, hit.ny, 1, n);
  if (!d) { pts.push({ x: px + dx * 3000, y: py + dy * 3000 }); return pts; }
  dx = d.x; dy = d.y;
  let last = hit.i;
  for (let k = 0; k < 6; k++) {                    // 中で最大 6 回
    let h = nearest(px, py, dx, dy, edges, last);
    if (!h) break;
    px += dx * h.t; py += dy * h.t; pts.push({ x: px, y: py });
    let out = snellRefract(dx, dy, h.nx, h.ny, n, 1);
    if (out) { dx = out.x; dy = out.y; break; }
    let dp = dx * h.nx + dy * h.ny;                 // 全反射
    dx -= 2 * dp * h.nx; dy -= 2 * dp * h.ny;
    last = h.i;
  }
  pts.push({ x: px + dx * 3000, y: py + dy * 3000 });
  return pts;
}
function nearest(px, py, dx, dy, edges, skip) {
  let best = null;
  edges.forEach(([a, b], i) => {
    if (i === skip) return;
    let t = raySeg(px, py, dx, dy, a, b);
    if (t !== null && (!best || t < best.t)) { let ex = b.x - a.x, ey = b.y - a.y, L = Math.hypot(ex, ey); best = { t, i, nx: -ey / L, ny: ex / L }; }
  });
  return best;
}

function draw() {
  background(12, 12, 20);
  let cx = width * 0.42, cy = height * 0.5, L = 340;
  let half = radians(apex) / 2;
  let top = cy - L * Math.cos(half) * 0.55;
  let poly = [{ x: cx, y: top }, { x: cx + L * Math.sin(half), y: top + L * Math.cos(half) }, { x: cx - L * Math.sin(half), y: top + L * Math.cos(half) }];

  // プリズム
  noStroke(); fill(120, 160, 200, 40);
  beginShape(); for (let p of poly) vertex(p.x, p.y); endShape(CLOSE);
  stroke(180, 210, 240, 160); strokeWeight(2); noFill();
  beginShape(); for (let p of poly) vertex(p.x, p.y); endShape(CLOSE);

  // スクリーン（右端）
  let scrX = width - 70;
  stroke(80); strokeWeight(6); line(scrX, 60, scrX, height - 60);

  // 白色光（入射）：左端の高さ y0 から傾き incDeg で
  let y0 = constrain(mouseY, top + 20, top + L * Math.cos(half) - 20);
  let dx = Math.cos(radians(incDeg)), dy = Math.sin(radians(incDeg));
  let sx = 40, sy = y0 - (cx - 80 - sx) * Math.tan(radians(incDeg));

  // 波長ごとに追跡して加算合成で描く
  blendMode(ADD);
  strokeWeight(2);
  let devRed = null, devViolet = null, landed = [];
  for (let nm = 400; nm <= 700; nm += stepNm) {
    let n = refIndex(nm);
    let pts = tracePrism(sx, sy, dx, dy, poly, n);
    let c = wavelengthToRGB(nm);
    stroke(c[0] * 0.55, c[1] * 0.55, c[2] * 0.55);
    noFill();
    beginShape(); for (let p of pts) vertex(p.x, p.y); endShape();
    // 偏角（入射方向と出射方向のなす角）
    let a = pts[pts.length - 2], b = pts[pts.length - 1];
    let odx = b.x - a.x, ody = b.y - a.y, oL = Math.hypot(odx, ody);
    let dev = degrees(Math.acos(constrain((odx * dx + ody * dy) / oL, -1, 1)));
    if (nm === 400) devViolet = dev;
    if (nm === 700) devRed = dev;
    if (odx > 0) { let t = (scrX - a.x) / odx; landed.push({ y: a.y + ody * t, c }); }
  }
  // スクリーンに映るスペクトル
  strokeWeight(5);
  for (let l of landed) if (l.y > 60 && l.y < height - 60) { stroke(l.c[0], l.c[1], l.c[2]); line(scrX - 3, l.y - 4, scrX - 3, l.y + 4); }
  blendMode(BLEND);
  // 入射の白線
  stroke(255); strokeWeight(3); line(sx, sy, sx + dx * 120, sy + dy * 120);

  // HUD
  noStroke(); fill(255); textSize(18);
  text('頂角 ' + apex + '°（↑↓）　入射角のずらし ' + incDeg + '°（←→）　' + glasses[glassKind].name + '（G）　マウス上下：光が入る高さ', 20, 40);
  fill(160); textSize(15);
  text('n(λ) = A + B/λ²：' + nf(glasses[glassKind].A, 1, 4) + ' + ' + nf(glasses[glassKind].B, 1, 4) + '/λ²（λ は μm）　n(400nm) = ' + nf(refIndex(400), 1, 4) + '　n(700nm) = ' + nf(refIndex(700), 1, 4), 20, 68);
  let px = 20, py = height - 100;
  fill(255, 255, 255, 20); rect(px - 4, py - 28, 520, 90, 10);
  fill(255); textSize(16);
  if (devRed !== null) text('偏角（曲がった角度）　赤 700nm：' + nf(devRed, 1, 2) + '°　紫 400nm：' + nf(devViolet, 1, 2) + '°　差 ' + nf(devViolet - devRed, 1, 2) + '°', px + 10, py);
  fill(200); textSize(14);
  text('差が大きいほど虹が広がる。フリントガラスは分散が大きい（シャンデリアのきらめき）', px + 10, py + 28);
  text('頂角を 90° 以上にすると中で全反射が起きる → 光が出てこない面がある', px + 10, py + 50);
  // スペクトルの凡例
  for (let nm = 400; nm <= 700; nm += 2) { let c = wavelengthToRGB(nm); stroke(c[0], c[1], c[2]); line(width - 360 + (nm - 400), 100, width - 360 + (nm - 400), 116); }
  noStroke(); fill(160); textSize(12); text('400 nm', width - 360, 132); text('700 nm', width - 100, 132);
}

function keyPressed() {
  if (key === UP_ARROW) apex = Math.min(120, apex + 2);
  if (key === DOWN_ARROW) apex = Math.max(10, apex - 2);
  if (key === LEFT_ARROW) incDeg = Math.max(-40, incDeg - 2);
  if (key === RIGHT_ARROW) incDeg = Math.min(40, incDeg + 2);
  if (key === 'g' || key === 'G') glassKind = 1 - glassKind;
  if (key === 'r' || key === 'R') { apex = 60; incDeg = -20; glassKind = 0; }
}

// ---------- やってみよう ----------
// 1. 入射角（←→）を変えて、偏角の差（紫 − 赤）がいちばん小さい角を探そう（最小偏角）
// 2. 頂角を小さく（10°）すると虹はほとんど広がらない。窓ガラスで虹が見えない理由
// 3. B を 0 にすると全部同じに曲がる（分散なし）。B を 0.03 にすると？
// 4. プリズムを 2 つ逆向きに並べると色がもとに戻る（ニュートンの実験）。poly をもう 1 つ足してみよう

// ==================================================
// ここから下は「色の道具」（波長 nm → RGB の近似）
// ==================================================
function wavelengthToRGB(nm) {
  nm = Math.max(380, Math.min(780, nm));
  let r = 0, g = 0, b = 0;
  if (nm < 440) { r = -(nm - 440) / 60; b = 1; }
  else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { g = 1; b = -(nm - 510) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm < 645) { r = 1; g = -(nm - 645) / 65; }
  else r = 1;
  let f = 1;
  if (nm < 420) f = 0.3 + 0.7 * (nm - 380) / 40;
  else if (nm > 700) f = 0.3 + 0.7 * (780 - nm) / 80;
  return [255 * Math.pow(r * f, 0.8), 255 * Math.pow(g * f, 0.8), 255 * Math.pow(b * f, 0.8)];
}
