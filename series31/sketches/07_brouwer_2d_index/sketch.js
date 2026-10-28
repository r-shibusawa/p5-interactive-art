// ============================================
// 07 ブラウワーの不動点定理（2 次元）─ 回転数で不動点を追いつめる
// 正方形を自分の中へ連続に写す f には不動点がある。ずれのベクトル v(p) = f(p) − p を考える
//   輪の上で v が何回まわるか（指数・回転数）が 0 でなければ、輪の中に不動点がある。外周では v は必ず内向き → 回転数 1
//   06 の二分法の 2 次元版：正方形を 4 つに割り、回転数が 0 でない小正方形だけ残す
// ドラッグ = 白丸（ゆがみの根元）と矢じり（ゆがみの向き）/ ←→ = 回転 / ↑↓ = 輪の大きさ / スペース = 4 分割して絞る / R = 絞り込みをやり直す / A = 矢印 / N = 新しいゆがみ
// ============================================

let theta = 1.2;          // ★ 全体の回転
let shrink = 0.92;        // ★ 全体の縮み
let sigma = 0.45;         // ★ ゆがみの広がり
let handles = [];         // {ax, ay, vx, vy}
let loopR = 0.25;         // マウスの輪の半径
let showArrows = true;
let cells = [];           // 残っている小正方形 {x, y, w}
let level = 0;
let fieldG, dirty = true;
let SZ, ox, oy;
let drag = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  SZ = min(height - 150, width * 0.55); ox = 40; oy = 105;
  fieldG = createGraphics(90, 90); fieldG.pixelDensity(1);
  newHandles();
}
function newHandles() {
  handles = [];
  for (let i = 0; i < 3; i++) handles.push({ ax: random(-0.7, 0.7), ay: random(-0.7, 0.7), vx: random(-0.6, 0.6), vy: random(-0.6, 0.6) });
  resetCells();
}
function resetCells() { cells = [{ x: -1, y: -1, w: 2 }]; level = 0; dirty = true; }

// ★ 写像 f：回して少し縮め、白丸のまわりを矢じりの向きに押す。最後に正方形の中に押し戻す（連続）
function f(x, y) {
  let c = Math.cos(theta), s = Math.sin(theta);
  let nx = shrink * (c * x - s * y), ny = shrink * (s * x + c * y);
  for (let h of handles) {
    let w = Math.exp(-((x - h.ax) ** 2 + (y - h.ay) ** 2) / (sigma * sigma));
    nx += h.vx * w; ny += h.vy * w;
  }
  return [constrain(nx, -1, 1), constrain(ny, -1, 1)];
}
function v(x, y) { let q = f(x, y); return [q[0] - x, q[1] - y]; }

// 閉じた折れ線の上で v が何回まわるか（回転数）
function windingOf(pts) {
  let total = 0, prev = null;
  for (let i = 0; i <= pts.length; i++) {
    let p = pts[i % pts.length], d = v(p[0], p[1]), a = Math.atan2(d[1], d[0]);
    if (prev !== null) { let da = a - prev; while (da > PI) da -= TWO_PI; while (da < -PI) da += TWO_PI; total += da; }
    prev = a;
  }
  return Math.round(total / TWO_PI);
}
function squarePts(c, m) {
  let p = [];
  for (let i = 0; i < m; i++) p.push([c.x + c.w * i / m, c.y]);
  for (let i = 0; i < m; i++) p.push([c.x + c.w, c.y + c.w * i / m]);
  for (let i = 0; i < m; i++) p.push([c.x + c.w * (1 - i / m), c.y + c.w]);
  for (let i = 0; i < m; i++) p.push([c.x, c.y + c.w * (1 - i / m)]);
  return p;
}
// ★ 4 分割して、回転数が 0 でない小正方形だけ残す
function subdivide() {
  let next = [];
  for (let c of cells) {
    let h = c.w / 2;
    for (let q of [{ x: c.x, y: c.y, w: h }, { x: c.x + h, y: c.y, w: h }, { x: c.x, y: c.y + h, w: h }, { x: c.x + h, y: c.y + h, w: h }]) {
      if (windingOf(squarePts(q, 16)) !== 0) next.push(q);
    }
  }
  if (next.length > 0 && next.length < 300) { cells = next; level++; }
}

function sx(x) { return ox + (x + 1) / 2 * SZ; }
function sy(y) { return oy + (1 - y) / 2 * SZ; }
function wx(px) { return (px - ox) / SZ * 2 - 1; }
function wy(py) { return 1 - (py - oy) / SZ * 2; }

function draw() {
  background(230, 30, 11);
  if (keyIsDown(LEFT_ARROW)) { theta -= 0.02; resetCells(); }
  if (keyIsDown(RIGHT_ARROW)) { theta += 0.02; resetCells(); }
  if (dirty) { buildField(); dirty = false; }
  image(fieldG, ox, oy, SZ, SZ);

  // 矢印：p から f(p) へ
  if (showArrows) {
    stroke(0, 0, 100, 55); strokeWeight(1);
    for (let i = 0; i < 18; i++) for (let j = 0; j < 18; j++) {
      let x = -1 + (i + 0.5) / 9, y = -1 + (j + 0.5) / 9, q = f(x, y);
      let ex = lerp(x, q[0], 0.5), ey = lerp(y, q[1], 0.5);
      line(sx(x), sy(y), sx(ex), sy(ey));
      noStroke(); fill(0, 0, 100, 70); circle(sx(ex), sy(ey), 3); stroke(0, 0, 100, 55);
    }
  }
  // 絞り込み中の小正方形
  noFill(); stroke(0, 0, 100); strokeWeight(2);
  for (let c of cells) rect(sx(c.x), sy(c.y + c.w), c.w / 2 * SZ, c.w / 2 * SZ);
  // ゆがみの取っ手
  for (let h of handles) {
    stroke(0, 0, 100); strokeWeight(2); line(sx(h.ax), sy(h.ay), sx(h.ax + h.vx), sy(h.ay + h.vy));
    noStroke(); fill(0, 0, 100); circle(sx(h.ax), sy(h.ay), 14);
    fill(45, 90, 100); circle(sx(h.ax + h.vx), sy(h.ay + h.vy), 11);
  }
  // マウスの輪と回転数
  let mx = wx(mouseX), my = wy(mouseY), inside = abs(mx) <= 1.2 && abs(my) <= 1.2 && drag === null;
  let loopPts = [];
  for (let i = 0; i < 90; i++) { let t = i / 90 * TWO_PI; loopPts.push([mx + loopR * Math.cos(t), my + loopR * Math.sin(t)]); }
  let idx = 0;
  if (inside) {
    idx = windingOf(loopPts);
    noFill(); stroke(idx === 0 ? 0 : 45, idx === 0 ? 0 : 90, 100); strokeWeight(3);
    circle(sx(mx), sy(my), loopR * SZ);
    noStroke(); fill(0, 0, 100); textSize(18); text('回転数 ' + idx, sx(mx) + loopR * SZ / 2 + 8, sy(my));
    drawCompass(loopPts, idx);
  }
  let outer = windingOf(squarePts({ x: -1, y: -1, w: 2 }, 60));
  let best = cells[0];

  noStroke(); fill(0, 0, 100); textSize(18);
  text('θ = ' + nf(theta, 1, 2) + '（←→）　輪の半径 ' + nf(loopR, 1, 2) + '（↑↓）　スペース：4 分割して絞る（' + level + ' 回、残り ' + cells.length + ' 個）　R：やり直し　A：矢印　N：新しいゆがみ', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('色 = ずれ v = f(p) − p の向き（暗いほど小さい）。全部の色が集まる黒っぽい点が不動点。外周の回転数 = ' + outer + '（外周では v が内向き）', 20, 68);
  let tx = ox + SZ + 40;
  fill(0, 0, 100); textSize(16);
  if (level > 0) text('絞り込んだ不動点 ≈ (' + nf(best.x + best.w / 2, 1, 5) + ', ' + nf(best.y + best.w / 2, 1, 5) + ')、幅 ' + best.w.toExponential(1), tx, height - 70);
  fill(0, 0, 60); textSize(14);
  text('06 の二分法は「符号が変わる半分」を残した。2 次元では「回転数が 0 でない 1/4」を残す。回転数が 0 でない輪の中には必ず不動点がある', tx, height - 40, width - tx - 20);
}

// 右：輪を 1 周するあいだの v の向き（羅針盤）
function drawCompass(pts, idx) {
  let cxp = ox + SZ + 40 + 150, cyp = oy + 170, R = 120;
  if (cxp + R > width) return;
  noFill(); stroke(0, 0, 40); strokeWeight(1); circle(cxp, cyp, R * 2);
  for (let i = 0; i < pts.length; i++) {
    let d = v(pts[i][0], pts[i][1]), a = Math.atan2(d[1], d[0]);
    let rr = R * (0.55 + 0.4 * i / pts.length);
    noStroke(); fill(i / pts.length * 300, 70, 100);
    circle(cxp + rr * Math.cos(a), cyp - rr * Math.sin(a), 6);
  }
  noStroke(); fill(0, 0, 100); textSize(16);
  text('輪を 1 周する間の v の向き', cxp - R, cyp - R - 20);
  text('→ ' + idx + ' 回まわった', cxp - 50, cyp + R + 30);
  fill(0, 0, 60); textSize(14);
  text('（色は輪の上の位置。内側から外側へらせん）', cxp - R, cyp + R + 54);
}

// 背景：v の向きを色相、大きさを明るさで（小さい画像に描いて拡大）
function buildField() {
  fieldG.loadPixels();
  let n = fieldG.width;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    let x = -1 + 2 * (i + 0.5) / n, y = 1 - 2 * (j + 0.5) / n, d = v(x, y);
    let hue = (Math.atan2(d[1], d[0]) / TWO_PI * 360 + 360) % 360, m = Math.hypot(d[0], d[1]);
    let c = hsbToRgb(hue, 60, 15 + 70 * Math.min(1, m * 2.5));
    let k = (j * n + i) * 4;
    fieldG.pixels[k] = c[0]; fieldG.pixels[k + 1] = c[1]; fieldG.pixels[k + 2] = c[2]; fieldG.pixels[k + 3] = 255;
  }
  fieldG.updatePixels();
}

function mousePressed() {
  drag = null;
  for (let h of handles) {
    if (dist(mouseX, mouseY, sx(h.ax + h.vx), sy(h.ay + h.vy)) < 12) drag = { h, tip: true };
    else if (dist(mouseX, mouseY, sx(h.ax), sy(h.ay)) < 12) drag = { h, tip: false };
  }
}
function mouseDragged() {
  if (!drag) return;
  let x = constrain(wx(mouseX), -1, 1), y = constrain(wy(mouseY), -1, 1);
  if (drag.tip) { drag.h.vx = x - drag.h.ax; drag.h.vy = y - drag.h.ay; } else { drag.h.ax = x; drag.h.ay = y; }
  resetCells();
}
function mouseReleased() { drag = null; }
function keyPressed() {
  if (key === ' ') subdivide();
  if (key === 'r' || key === 'R') resetCells();
  if (key === 'a' || key === 'A') showArrows = !showArrows;
  if (key === 'n' || key === 'N') newHandles();
  if (key === UP_ARROW) loopR = min(1.2, loopR + 0.03);
  if (key === DOWN_ARROW) loopR = max(0.03, loopR - 0.03);
}

// ---------- やってみよう ----------
// 1. 輪を不動点のまわりに置くと回転数 1（または −1）、何もない所では 0。輪をゆっくり不動点に近づけて、数が変わる瞬間を見よう
// 2. スペースを 10 回押すと幅は 2/1024。小正方形が 2 か所以上に分かれたら、不動点がいくつある？
// 3. 回転数 −1 の不動点（鞍点のような向き）を作れるか。取っ手を動かして探そう
// 4. f の constrain を外すと外周の回転数は 1 のままか？ 正方形からはみ出す写像では定理が使えない理由を考えよう

// ==================================================
// ここから下は「道具」
// ==================================================
function hsbToRgb(h, s, b) {
  s /= 100; b /= 100;
  let kf = (k) => (k + h / 60) % 6;
  let fc = (k) => b * (1 - s * Math.max(0, Math.min(kf(k), 4 - kf(k), 1)));
  return [255 * fc(5), 255 * fc(3), 255 * fc(1)];
}
