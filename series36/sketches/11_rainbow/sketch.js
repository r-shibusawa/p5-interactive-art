// ============================================
// 11 虹のしくみ
// 太陽の光が水滴に入り（屈折）、裏で 1 回はね返り（反射）、出てくる（屈折）。この光が 42° の方向に集中する
//   水滴に入る高さ（衝突パラメータ b）を変えて光線を追跡し、戻ってくる角度をヒストグラムにする
//   角度が「いちばん溜まる」ところ（偏角が最小）が虹。波長で屈折率が違うので角度がずれて色に分かれる
// マウス上下 = 注目する光線の高さ b / 1 = 主虹（反射 1 回） 2 = 副虹（反射 2 回） / ↑↓ = 描く光線の本数 / W = 全部の色の光線を描く
// ============================================

let bounces = 1;          // 1 = 主虹、2 = 副虹
let rayCount = 30;        // ★ 描く光線の本数
let allColors = false;
let wavelengths = [400, 450, 500, 550, 600, 650, 700];
let histN = 20000;        // ★ ヒストグラム用に追跡する光線の本数（色ごと）
let hist = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
}

// ★ 水の屈折率（コーシーの式、λ は nm）
function nWater(nm) { let um = nm / 1000; return 1.3240 + 0.00318 / (um * um); }

// 光線と円の交点までの距離（inside = 中から外へ）
function hitCircle(px, py, dx, dy, cx, cy, r, inside) {
  let ox = px - cx, oy = py - cy;
  let B = 2 * (ox * dx + oy * dy), C = ox * ox + oy * oy - r * r, D = B * B - 4 * C;
  if (D < 0) return null;
  let q = Math.sqrt(D), t = inside ? (-B + q) / 2 : (-B - q) / 2;
  return t > 1e-6 ? t : null;
}

// ★ 高さ b（0〜1）で入った光線を追跡：屈折して入る → 中で k 回反射 → 屈折して出る。道すじと「戻ってくる角度」（度）を返す
function traceDrop(b, n, k, cx, cy, R) {
  let px = cx - 420, py = cy - b * R, dx = 1, dy = 0;
  let pts = [{ x: px, y: py }];
  let t = hitCircle(px, py, dx, dy, cx, cy, R, false);
  if (t === null) return { pts: [pts[0], { x: px + 900, y: py }], back: 0 };
  px += dx * t; py += dy * t; pts.push({ x: px, y: py });
  // 空気 → 水：法線（内向き）とスネルの法則
  let nx = (cx - px) / R, ny = (cy - py) / R;
  let cosI = dx * nx + dy * ny, cosT = Math.sqrt(Math.max(0, 1 - (1 - cosI * cosI) / (n * n)));
  let f = cosI / n - cosT;
  dx = dx / n - f * nx; dy = dy / n - f * ny;
  // 中で k 回反射
  for (let s = 0; s < k; s++) {
    t = hitCircle(px, py, dx, dy, cx, cy, R, true);
    if (t === null) break;
    px += dx * t; py += dy * t; pts.push({ x: px, y: py });
    let mx = (cx - px) / R, my = (cy - py) / R, dp = dx * mx + dy * my;
    dx -= 2 * dp * mx; dy -= 2 * dp * my;
  }
  // 水 → 空気
  t = hitCircle(px, py, dx, dy, cx, cy, R, true);
  if (t !== null) {
    px += dx * t; py += dy * t; pts.push({ x: px, y: py });
    let mx = (cx - px) / R, my = (cy - py) / R, c1 = -(dx * mx + dy * my), s2 = n * n * (1 - c1 * c1);
    if (s2 < 1) { let c2 = Math.sqrt(1 - s2), g = n * c1 - c2; dx = n * dx + g * mx; dy = n * dy + g * my; }
    else { let dp = dx * mx + dy * my; dx -= 2 * dp * mx; dy -= 2 * dp * my; }
  }
  pts.push({ x: px + dx * 700, y: py + dy * 700 });
  // 戻る角度：入ってきた向き (1, 0) の逆 (−1, 0) とのなす角
  let back = degrees(Math.acos(Math.max(-1, Math.min(1, -dx))));
  return { pts, back };
}

function buildHist(lo, hi, bins) {
  let counts = wavelengths.map(() => new Array(bins).fill(0)), maxC = 1;
  wavelengths.forEach((nm, wi) => {
    let n = nWater(nm);
    for (let q = 0; q < histN; q++) {
      let b = (q + 0.5) / histN, i = Math.asin(b), r = Math.asin(Math.sin(i) / n);
      let Dd = degrees(2 * i - 2 * (bounces + 1) * r + bounces * Math.PI);      // 偏角
      let backAng = Math.abs(180 - Dd);                                         // 戻る角度（反太陽点から）
      let bi = Math.floor((backAng - lo) / (hi - lo) * bins);
      if (bi >= 0 && bi < bins) { counts[wi][bi]++; maxC = Math.max(maxC, counts[wi][bi]); }
    }
  });
  return { counts, maxC, bounces };
}

function draw() {
  background(12, 16, 28);
  let cx = width * 0.32, cy = height * 0.5, R = 200;
  // 水滴
  noStroke(); fill(60, 100, 160, 70); circle(cx, cy, R * 2);
  noFill(); stroke(150, 200, 255, 120); strokeWeight(2); circle(cx, cy, R * 2);

  // 光線を描く
  blendMode(ADD);
  strokeWeight(1.5);
  let colsToDraw = allColors ? wavelengths : [550];
  for (let nm of colsToDraw) {
    let c = wavelengthToRGB(nm);
    stroke(c[0] * 0.35, c[1] * 0.35, c[2] * 0.35);
    for (let q = 0; q < rayCount; q++) {
      let b = (q + 0.5) / rayCount;
      let tr = traceDrop(b, nWater(nm), bounces, cx, cy, R);
      beginShape(); for (let p of tr.pts) vertex(p.x, p.y); endShape();
    }
  }
  blendMode(BLEND);
  // 注目する 1 本（マウス）
  let bSel = constrain(map(mouseY, cy - R, cy, 1, 0), 0.01, 0.999);
  let sel = traceDrop(bSel, nWater(550), bounces, cx, cy, R);
  stroke(255, 255, 200); strokeWeight(3); noFill();
  beginShape(); for (let p of sel.pts) vertex(p.x, p.y); endShape();

  // ★ ヒストグラム：色ごとに b を細かく変えて戻る角度を集計（反射の回数が変わったときだけ計算）
  let hx = width * 0.6, hw = width - hx - 40, hy = height - 90, hh = 300;
  let lo = bounces === 1 ? 36 : 46, hi = lo + 12, bins = 96;
  if (!hist || hist.bounces !== bounces) hist = buildHist(lo, hi, bins);
  let counts = hist.counts, maxC = hist.maxC;
  noStroke(); fill(255, 255, 255, 12); rect(hx - 10, hy - hh - 30, hw + 20, hh + 60, 10);
  for (let bi = 0; bi < bins; bi++) {
    let x = hx + bi / bins * hw, w = hw / bins;
    let y = hy;
    wavelengths.forEach((nm, wi) => {
      let h = counts[wi][bi] / maxC * hh / 2.2;
      let c = wavelengthToRGB(nm);
      fill(c[0], c[1], c[2], 200); rect(x, y - h, w + 0.5, h); y -= h;
    });
  }
  fill(200); textSize(13);
  for (let a = lo; a <= hi; a += 2) text(a + '°', hx + (a - lo) / (hi - lo) * hw - 8, hy + 18);
  text('戻ってくる角度（反太陽点からの角度）　高さ = その角度に集まった光線の数', hx, hy - hh - 12);
  // 注目光線の角度マーク
  if (sel.back > lo && sel.back < hi) { stroke(255, 255, 200); strokeWeight(2); let x = hx + (sel.back - lo) / (hi - lo) * hw; line(x, hy, x, hy - hh / 2); }

  // 虹の角度（デカルト光線）：戻る角度が折り返す所（主虹は最大、副虹は最小）
  let txt = [];
  for (let nm of [400, 700]) {
    let n = nWater(nm), best = bounces === 1 ? 0 : 1e9;
    for (let q = 0; q < 2000; q++) {
      let b = (q + 0.5) / 2000, i = Math.asin(b), r = Math.asin(Math.sin(i) / n);
      let ang = Math.abs(180 - degrees(2 * i - 2 * (bounces + 1) * r + bounces * Math.PI));
      best = bounces === 1 ? Math.max(best, ang) : Math.min(best, ang);
    }
    txt.push(nm + ' nm：' + nf(best, 1, 2) + '°');
  }
  noStroke(); fill(255); textSize(18);
  text((bounces === 1 ? '主虹（中で 1 回反射）' : '副虹（中で 2 回反射）') + '（1 / 2）　光線 ' + rayCount + ' 本（↑↓）　W：全部の色 ' + (allColors ? 'ON' : 'off'), 20, 40);
  fill(200); textSize(15);
  text('マウス上下で注目する光線（白）の高さを変える。b = ' + nf(bSel, 1, 2) + '　戻る角度 ' + nf(sel.back, 1, 1) + '°', 20, 68);
  fill(200); textSize(14);
  text('光が溜まる角度（最小偏角）　紫 ' + txt[0] + '　赤 ' + txt[1], hx, hy + 44);
  text(bounces === 1 ? '→ 主虹は外側が赤、約 42°' : '→ 副虹は外側が紫、約 51°。主虹と色の順が逆', hx, hy + 64);
  text('n(400) = ' + nf(nWater(400), 1, 4) + '　n(700) = ' + nf(nWater(700), 1, 4), 20, height - 30);
}

function keyPressed() {
  if (key === '1') bounces = 1;
  if (key === '2') bounces = 2;
  if (key === UP_ARROW) rayCount = Math.min(200, rayCount + 10);
  if (key === DOWN_ARROW) rayCount = Math.max(5, rayCount - 10);
  if (key === 'w' || key === 'W') allColors = !allColors;
}

// ---------- やってみよう ----------
// 1. マウスで b を 0 → 1 に動かす。戻る角度は大きくなって、約 42° で折り返す。折り返す所に光が溜まる
// 2. 副虹（2）は 51° 付近。主虹と副虹の間（42〜51°）は光が少なくて暗い（アレキサンダーの暗帯）
// 3. nWater の B を 0 にすると色が分かれない（白い虹）。霧の細かい水滴で本当に見える（霧虹）
// 4. 屈折率をガラス（1.5）にすると虹の角度はいくつ？ ガラス玉で虹を作れる？

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
