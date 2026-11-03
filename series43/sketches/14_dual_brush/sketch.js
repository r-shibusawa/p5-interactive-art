// ============================================
// 14 双対ブラシ
// 左に描いた「点」の軌跡が、右では「直線」の束になって現れる（00 の双対変換をブラシに）
//   どちらのパネルに描いても、相手側に双対が描かれる。色は時間で変わり、線は重なって光る
//   M でモード：アフィン（点 (a,b) → 直線 y = ax − b）／ 極（点 p → 直線 ⟨p, x⟩ = 1）
// ドラッグ = 描く / M = モード / ↑↓ = 線の濃さ / C = 全部消す / S = 保存
// ============================================

let gL, gR;                   // 左右のパネルの絵（描きためる）
let modeNo = 0;               // 0 = アフィン, 1 = 極
let lineAlpha = 14;           // ★ 直線の濃さ（薄いほど重なりがきれい）
let RANGE = 3;                // ★ 数学座標の範囲 ±RANGE
let hueT = 0;
let modeNames = ['アフィン：点 (a, b) ↔ 直線 y = ax − b', '極：点 p ↔ 直線 ⟨p, x⟩ = 1（原点が極）'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  let { L } = panels();
  gL = createGraphics(L.w, L.h); gR = createGraphics(L.w, L.h);
  for (let g of [gL, gR]) { g.colorMode(HSB, 360, 100, 100, 100); g.background(250, 40, 10); }
}
function panels() {
  let w = (width - 60) / 2, h = height - 150, y = 100;
  return { L: { x: 20, y, w, h }, R: { x: 40 + w, y, w, h } };
}
// パネル内の画面座標 ↔ 数学座標（パネルの左上を原点とした px で扱う）
function toMath(P, sx, sy) { return { x: (sx - P.x) / P.w * 2 * RANGE - RANGE, y: RANGE - (sy - P.y) / P.h * 2 * RANGE }; }
function toLocal(P, x, y) { return { x: (x + RANGE) / (2 * RANGE) * P.w, y: (RANGE - y) / (2 * RANGE) * P.h }; }

// ★ 点 p の双対直線を、相手のバッファ g に描く
function drawDualLine(g, P, p, hue) {
  let a, b;
  if (modeNo === 0) {
    // y = p.x · x − p.y
    a = toLocal(P, -RANGE, p.x * -RANGE - p.y); b = toLocal(P, RANGE, p.x * RANGE - p.y);
  } else {
    // ⟨p, x⟩ = 1：足 p/|p|²、向き p に直交
    let d2 = p.x * p.x + p.y * p.y; if (d2 < 1e-4) return;
    let fx = p.x / d2, fy = p.y / d2, tx = -p.y / Math.sqrt(d2), ty = p.x / Math.sqrt(d2);
    a = toLocal(P, fx + tx * 20, fy + ty * 20); b = toLocal(P, fx - tx * 20, fy - ty * 20);
  }
  g.stroke(hue, 70, 100, lineAlpha); g.strokeWeight(1.2); g.line(a.x, a.y, b.x, b.y);
}
function drawPointTrail(g, P, p, q, hue) {
  let a = toLocal(P, p.x, p.y), b = toLocal(P, q.x, q.y);
  g.stroke(hue, 70, 100, 90); g.strokeWeight(3); g.line(a.x, a.y, b.x, b.y);
}

function draw() {
  background(250, 40, 10);
  let { L, R } = panels();
  image(gL, L.x, L.y); image(gR, R.x, R.y);
  noFill(); stroke(0, 0, 35); strokeWeight(1); rect(L.x, L.y, L.w, L.h); rect(R.x, R.y, R.w, R.h);
  // 軸（薄く）
  stroke(0, 0, 100, 10);
  for (let P of [L, R]) { line(P.x, P.y + P.h / 2, P.x + P.w, P.y + P.h / 2); line(P.x + P.w / 2, P.y, P.x + P.w / 2, P.y + P.h); if (modeNo === 1) circle(P.x + P.w / 2, P.y + P.h / 2, P.w / RANGE); }
  // マウスの双対をプレビュー（点線）
  let onL = inside(L, mouseX, mouseY), onR = inside(R, mouseX, mouseY);
  if (onL || onR) {
    let P = onL ? L : R, Q = onL ? R : L, p = toMath(P, mouseX, mouseY);
    let a, b;
    if (modeNo === 0) { a = toLocal(Q, -RANGE, p.x * -RANGE - p.y); b = toLocal(Q, RANGE, p.x * RANGE - p.y); }
    else { let d2 = p.x * p.x + p.y * p.y || 1e-4; let fx = p.x / d2, fy = p.y / d2, tx = -p.y / Math.sqrt(d2), ty = p.x / Math.sqrt(d2); a = toLocal(Q, fx + tx * 20, fy + ty * 20); b = toLocal(Q, fx - tx * 20, fy - ty * 20); }
    stroke(0, 0, 100, 40); strokeWeight(1); drawingContext.setLineDash([4, 6]);
    let c = clipSeg(Q, { x: Q.x + a.x, y: Q.y + a.y }, { x: Q.x + b.x, y: Q.y + b.y }); if (c) line(c[0].x, c[0].y, c[1].x, c[1].y);
    drawingContext.setLineDash([]);
    noFill(); stroke(0, 0, 100, 60); circle(mouseX, mouseY, 10);
  }
  noStroke(); fill(0, 0, 100); textSize(18);
  text(modeNames[modeNo] + '（M）　濃さ ' + lineAlpha + '（↑↓）　C：消す　S：保存', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('左に曲線を描くと右に「直線の包絡線」として同じ曲線の双対が浮かぶ。円を描くと？ 直線を描くと？（直線上の点の双対は 1 点を通る）', 20, 68);
}
function inside(P, sx, sy) { return sx >= P.x && sx <= P.x + P.w && sy >= P.y && sy <= P.y + P.h; }

function mouseDragged() {
  let { L, R } = panels();
  let onL = inside(L, mouseX, mouseY), onR = inside(R, mouseX, mouseY);
  if (!onL && !onR) return;
  let P = onL ? L : R, gSelf = onL ? gL : gR, gOther = onL ? gR : gL, Q = onL ? R : L;
  hueT = (hueT + 0.8) % 360;
  let p = toMath(P, mouseX, mouseY), q = toMath(P, pmouseX, pmouseY);
  if (!inside(P, pmouseX, pmouseY)) q = p;
  drawPointTrail(gSelf, P, p, q, hueT);
  // 2 点の間を補間して直線を何本か引く（なめらかな包絡線になる）
  let n = Math.max(1, Math.min(6, Math.floor(dist(mouseX, mouseY, pmouseX, pmouseY) / 3)));
  for (let k = 1; k <= n; k++) { let t = k / n; drawDualLine(gOther, Q, { x: q.x + (p.x - q.x) * t, y: q.y + (p.y - q.y) * t }, hueT); }
}
function keyPressed() {
  if (key === 'm' || key === 'M') modeNo = 1 - modeNo;
  if (key === 'c' || key === 'C') for (let g of [gL, gR]) g.background(250, 40, 10);
  if (key === 's' || key === 'S') saveCanvas('dual_brush', 'png');
  if (key === UP_ARROW) lineAlpha = Math.min(60, lineAlpha + 2);
  if (key === DOWN_ARROW) lineAlpha = Math.max(2, lineAlpha - 2);
}

// ---------- やってみよう ----------
// 1. 左にまっすぐな線を引く → 右の直線は 1 点に集まる（共点）。左に円 → 右に？（極モードでは円）
// 2. 右に描くと左に直線が出る。双対の双対は元に戻るので、左右どちらで描いても同じ「言語」
// 3. 線の濃さを下げて、ゆっくり大きく描く。包絡線がくっきりする条件は？
// 4. 色を「位置」で決める（hue = p.x に応じて）、線の太さを「原点からの距離」で決める、などに改造


// ---------- 道具：線分を枠で切る（Liang–Barsky） ----------
function clipSeg(P, s1, s2) {
  let t0 = 0, t1 = 1, dx = s2.x - s1.x, dy = s2.y - s1.y;
  for (let [p, q] of [[-dx, s1.x - P.x], [dx, P.x + P.w - s1.x], [-dy, s1.y - P.y], [dy, P.y + P.h - s1.y]]) {
    if (p === 0) { if (q < 0) return null; continue; }
    let r = q / p;
    if (p < 0) { if (r > t1) return null; if (r > t0) t0 = r; } else { if (r < t0) return null; if (r < t1) t1 = r; }
  }
  return [{ x: s1.x + t0 * dx, y: s1.y + t0 * dy }, { x: s1.x + t1 * dx, y: s1.y + t1 * dy }];
}
