// ============================================
// 00 平面曲線の曲率と接触円
// 曲線の各点での「曲がり具合」が曲率 κ。κ = 1/r（r は曲線にいちばんぴったり合う円 = 接触円の半径）
//   x(t), y(t) の 1 階・2 階微分から κ = (x'y'' − y'x'') / (x'² + y'²)^{3/2}（差分で計算）
//   進む向きに対して左に曲がると +、右に曲がると −。まっすぐなら 0（接触円は無限に大きい）
// ドラッグ = 自分で曲線を描く / P = プリセット（楕円・リマソン・レムニスケート・心臓形・正弦波）/ スペース = 一時停止 / ←→ = 速さ
// ============================================

let h = 6;                 // ★ 曲線を等間隔に打ち直すときの点の間隔（px）
let speed = 1.2;           // ★ 曲線の上を走る速さ（1 フレームに進む点の数）
let maxR = 1500;           // ★ これより大きい接触円は「ほぼ直線」とみなして描かない
let pts = [], kappa = [], closed = true;
let raw = [], drawing = false;
let head = 0, paused = false, preset = 0;
let names = ['楕円', 'リマソン（内側に輪）', 'レムニスケート（∞）', '心臓形（カージオイド）', '正弦波（開いた曲線）'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  setPreset(0);
}

// ★ プリセットの曲線（媒介変数 t で定義）
function presetCurve(no, t) {
  let cx = width * 0.5, cy = height * 0.42, s = Math.min(width, height) * 0.19;
  if (no === 0) return { x: cx + 1.7 * s * Math.cos(t), y: cy + 0.9 * s * Math.sin(t) };
  if (no === 1) { let r = 0.55 * s * (1 + 2 * Math.cos(t)); return { x: cx - 0.5 * s + r * Math.cos(t), y: cy + r * Math.sin(t) }; }
  if (no === 2) { let d = 1 + Math.sin(t) ** 2; return { x: cx + 1.8 * s * Math.cos(t) / d, y: cy + 1.8 * s * Math.sin(t) * Math.cos(t) / d }; }
  if (no === 3) { let r = 0.9 * s * (1 - Math.cos(t)); return { x: cx + 0.6 * s + r * Math.cos(t), y: cy + r * Math.sin(t) }; }
  return { x: cx + (t / TWO_PI - 0.5) * width * 0.8, y: cy + 0.8 * s * Math.sin(2 * t) };
}

function setPreset(no) {
  preset = no;
  let src = [];
  for (let i = 0; i <= 400; i++) src.push(presetCurve(no, (i / 400) * TWO_PI));
  closed = no !== 4;
  pts = resample(src, h, closed);
  kappa = curvatureOf(pts, h, closed);
  head = 0;
}

function draw() {
  background(150, 25, 10);
  if (!paused && !drawing) head = (head + speed) % Math.max(pts.length, 1);
  if (keyIsDown(LEFT_ARROW)) speed = Math.max(0.2, speed - 0.03);
  if (keyIsDown(RIGHT_ARROW)) speed = Math.min(6, speed + 0.03);

  let kmax = 1e-6;
  for (let k of kappa) kmax = Math.max(kmax, Math.abs(k));

  // 曲線（曲率で色をつける：左曲がり = 赤、右曲がり = 青、まっすぐ = 白）
  strokeWeight(3);
  noFill();
  for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) {
    let a = pts[i], b = pts[(i + 1) % pts.length];
    let k = kappa[i] / kmax;
    stroke(k > 0 ? 5 : 215, Math.min(100, Math.abs(k) * 110), 100);
    line(a.x, a.y, b.x, b.y);
  }
  // 描いている途中の線
  if (drawing) { stroke(0, 0, 100, 60); strokeWeight(2); beginShape(); for (let p of raw) vertex(p.x, p.y); endShape(); }

  // 走る点と接触円
  let i = Math.floor(head) % pts.length;
  if (pts.length > 3 && !drawing) {
    let p = pts[i], k = kappa[i];
    let nx = pts[(i + 1) % pts.length], pv = pts[(i - 1 + pts.length) % pts.length];
    let tx = nx.x - pv.x, ty = nx.y - pv.y, tl = Math.hypot(tx, ty) || 1;
    tx /= tl; ty /= tl;
    let lx = ty, ly = -tx;                                   // 進む向きの左側の法線（画面は y が下向き）
    let r = 1 / Math.max(Math.abs(k), 1e-9);
    if (r < maxR) {
      let sgn = k > 0 ? 1 : -1;
      let cxx = p.x + lx * r * sgn, cyy = p.y + ly * r * sgn;
      noFill(); stroke(45, 90, 100, 70); strokeWeight(2);
      circle(cxx, cyy, 2 * r);
      stroke(45, 90, 100, 50); strokeWeight(1);
      line(p.x, p.y, cxx, cyy);
      noStroke(); fill(45, 90, 100); circle(cxx, cyy, 7);
    } else {
      stroke(0, 0, 100, 60); strokeWeight(1);
      line(p.x - tx * 200, p.y - ty * 200, p.x + tx * 200, p.y + ty * 200);
    }
    stroke(0, 0, 100, 80); strokeWeight(3);
    line(p.x, p.y, p.x + tx * 50, p.y + ty * 50);          // 接線ベクトル
    noStroke(); fill(0, 0, 100); circle(p.x, p.y, 12);
    // 数値
    fill(0, 0, 100); textSize(18);
    text('κ = ' + nf(k, 1, 4) + ' /px　　接触円の半径 r = 1/|κ| = ' + (r < maxR ? nf(r, 1, 1) + ' px' : '∞（ほぼ直線）'), 20, height - 185);
  }

  drawGraph(kmax, i);

  noStroke(); fill(0, 0, 100); textSize(18);
  text('P：プリセット（' + names[preset] + '）　ドラッグ：自分で描く　スペース：' + (paused ? '再開' : '一時停止') + '　←→：速さ ' + nf(speed, 1, 1), 20, 40);
  fill(0, 0, 65); textSize(15);
  text('κ = (x\'y\'\' − y\'x\'\') / (x\'² + y\'²)^{3/2}　赤 = 左に曲がる（κ > 0）　青 = 右に曲がる（κ < 0）　黄色い円 = 接触円（半径 1/|κ|）', 20, 66);
}

// 下のグラフ：横 = 曲線の上の位置、縦 = κ
function drawGraph(kmax, cur) {
  let gx = 20, gy = height - 160, gw = width - 40, gh = 130;
  noStroke(); fill(0, 0, 100, 6); rect(gx, gy, gw, gh, 8);
  stroke(0, 0, 100, 25); strokeWeight(1); line(gx, gy + gh / 2, gx + gw, gy + gh / 2);
  noFill(); strokeWeight(2);
  beginShape();
  for (let i = 0; i < kappa.length; i++) {
    let k = kappa[i] / kmax;
    stroke(k > 0 ? 5 : 215, 70, 100);
    vertex(gx + (i / kappa.length) * gw, gy + gh / 2 - k * gh * 0.45);
  }
  endShape();
  let x = gx + (cur / Math.max(kappa.length, 1)) * gw;
  stroke(45, 90, 100); line(x, gy, x, gy + gh);
  noStroke(); fill(0, 0, 60); textSize(13);
  text('κ のグラフ（最大 |κ| = ' + nf(kmax, 1, 4) + '）', gx + 8, gy + 18);
  text('+' , gx + gw - 20, gy + 18); text('−', gx + gw - 20, gy + gh - 8);
}

function mousePressed() { if (mouseY < height - 170) { drawing = true; raw = [{ x: mouseX, y: mouseY }]; } }
function mouseDragged() {
  if (!drawing) return;
  let l = raw[raw.length - 1];
  if (Math.hypot(mouseX - l.x, mouseY - l.y) > 3) raw.push({ x: mouseX, y: mouseY });
}
function mouseReleased() {
  if (!drawing) return;
  drawing = false;
  if (raw.length < 12) return;
  closed = Math.hypot(raw[0].x - raw[raw.length - 1].x, raw[0].y - raw[raw.length - 1].y) < 60;
  let sm = smoothPoly(raw, 3, closed);
  pts = resample(sm, h, closed);
  pts = smoothPoly(pts, 2, closed);
  kappa = curvatureOf(pts, h, closed);
  head = 0;
}
function keyPressed() {
  if (key === 'p' || key === 'P') setPreset((preset + 1) % names.length);
  if (key === ' ') paused = !paused;
}

// ---------- やってみよう ----------
// 1. 楕円の κ が最大になるのはどこ？（長軸の端）。接触円の大きさが場所で変わるのを見よう
// 2. リマソンの内側の輪と外側で κ の符号は同じ？ 走る点が「左に曲がる」か「右に曲がる」かで考える
// 3. 自分でまっすぐな線を描くと κ ≈ 0、接触円はどうなる？ ギザギザに描くとグラフはどうなる？
// 4. h（点の間隔）を 3 や 12 にすると κ のグラフはどう変わる？（差分の精度と、ノイズの関係）

// ==================================================
// ここから下は「曲線の道具」です（等間隔に打ち直す・なめらかにする・曲率を差分で求める）
// （中身は読まなくても OK。消さないでね）
// ==================================================

// 折れ線を間隔 h の点列に打ち直す
function resample(src, h, isClosed) {
  let out = [], acc = 0;
  let n = src.length + (isClosed ? 1 : 0);
  out.push({ x: src[0].x, y: src[0].y });
  for (let i = 1; i < n; i++) {
    let a = src[i - 1], b = src[i % src.length];
    let d = Math.hypot(b.x - a.x, b.y - a.y);
    let t = 0;
    while (acc + (d - t) >= h) {
      let need = h - acc; t += need; acc = 0;
      out.push({ x: a.x + (b.x - a.x) * (t / d), y: a.y + (b.y - a.y) * (t / d) });
    }
    acc += d - t;
  }
  if (isClosed && out.length > 1 && Math.hypot(out[0].x - out[out.length - 1].x, out[0].y - out[out.length - 1].y) < h * 0.5) out.pop();
  return out;
}

// 3 点平均を n 回かけてなめらかにする（開いた曲線は端を固定）
function smoothPoly(p, n, isClosed) {
  let q = p.map((v) => ({ x: v.x, y: v.y }));
  for (let k = 0; k < n; k++) {
    let r = q.map((v) => ({ x: v.x, y: v.y }));
    for (let i = 0; i < q.length; i++) {
      if (!isClosed && (i === 0 || i === q.length - 1)) continue;
      let a = q[(i - 1 + q.length) % q.length], b = q[(i + 1) % q.length];
      r[i] = { x: (a.x + 2 * q[i].x + b.x) / 4, y: (a.y + 2 * q[i].y + b.y) / 4 };
    }
    q = r;
  }
  return q;
}

// 等間隔の点列の曲率（中心差分）。画面の y が下向きなので符号を反転して「左曲がり = +」にする
function curvatureOf(p, h, isClosed) {
  let n = p.length, out = [];
  for (let i = 0; i < n; i++) {
    let im = isClosed ? (i - 1 + n) % n : Math.max(i - 1, 0), ip = isClosed ? (i + 1) % n : Math.min(i + 1, n - 1);
    let x1 = (p[ip].x - p[im].x) / (2 * h), y1 = (p[ip].y - p[im].y) / (2 * h);
    let x2 = (p[ip].x - 2 * p[i].x + p[im].x) / (h * h), y2 = (p[ip].y - 2 * p[i].y + p[im].y) / (h * h);
    let den = Math.pow(x1 * x1 + y1 * y1, 1.5);
    out.push(den > 1e-9 ? -(x1 * y2 - y1 * x2) / den : 0);
  }
  return out;
}
