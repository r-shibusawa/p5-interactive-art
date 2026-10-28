// ============================================
// 15 カメラ映像を同相変形
// 自分の顔をゴムのように連続に変形する。ねじっても、うずまきにしても、円で裏返しても「つながり方」は変わらない ＝ 同相写像
//   どの変形にも「元に戻す変形（逆写像）」がある。画面の各点は、逆写像で元の映像のどこを見ればいいかを計算して色を決めている
// マウス = 変形の中心 / 1 = ねじり / 2 = うずまき / 3 = 円の反転 / 4 = メビウス変換 / 5 = ふくらみ / ↑↓ = 強さ / G = 方眼 / P = 映像 ↔ 模様 / S = 保存
// ============================================

let cap, src, out;
let SW = 160, SH = 120;      // カメラの解像度
let OW = 320, OH = 240;      // ★ 変形した画像の解像度（大きいほどきれいで重い）
let mode = 1;
let strength = 2.5;          // ★ 変形の強さ
let showGrid = true;
let usePattern = false;
let pattern;
let cx = 0, cy = 0;          // 変形の中心（正規化座標）
let dispX, dispY, dispW, dispH;
let names = ['', 'ねじり', 'うずまき', '円の反転', 'メビウス変換', 'ふくらみ'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  cap = createCapture(VIDEO, { flipped: true });
  cap.size(SW, SH);
  cap.hide();
  src = createGraphics(SW, SH); src.pixelDensity(1);
  out = createImage(OW, OH);
  pattern = makePattern();
  dispH = min(height - 140, (width - 40) * 0.75); dispW = dispH / 0.75;
  dispX = (width - dispW) / 2; dispY = 100;
}

// ★ 変形 f（前向き）と、その逆 finv。座標は画面の中心が (0, 0)、上下の端が ±1
function fwd(x, y) { return warp(x, y, 1); }
function inv(x, y) { return warp(x, y, -1); }
function warp(x, y, dir) {
  let dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy);
  if (mode === 1 || mode === 2) {
    let a = mode === 1 ? strength * Math.pow(Math.max(0, 1 - r / 0.9), 2) : strength * Math.exp(-(r * r) / 0.12);
    a *= dir;
    return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)];
  }
  if (mode === 3) {        // 円の反転：中心からの距離 r → ρ²/r（内と外が入れかわる。自分自身が逆写像）
    let rho = 0.15 + strength * 0.08, s = (rho * rho) / Math.max(r * r, 1e-6);
    return [cx + dx * s, cy + dy * s];
  }
  if (mode === 4) {        // メビウス変換 w = (z − a)/(1 − ā z)：円板を円板にうつし、点 a を中心へ
    let ax = cx * 0.9, ay = cy * 0.9, sgn = dir > 0 ? -1 : 1;
    let nr = x + sgn * ax, ni = y + sgn * ay;                         // z ∓ a
    let dr = 1 + sgn * (ax * x + ay * y), di = sgn * (ax * y - ay * x); // 1 ∓ ā z
    let m = dr * dr + di * di || 1e-9;
    return [(nr * dr + ni * di) / m, (ni * dr - nr * di) / m];
  }
  // ふくらみ：r → r^γ（γ < 1 で中心がふくらむ）
  let g = Math.pow(1 / (1 + strength * 0.3), dir), R = 0.9;
  if (r >= R || r < 1e-9) return [x, y];
  let s = (R * Math.pow(r / R, g)) / r;
  return [cx + dx * s, cy + dy * s];
}

function draw() {
  background(20);
  let ready = !usePattern && cap && cap.width > 0 && cap.elt && cap.elt.readyState >= 2;
  if (ready) src.image(cap, 0, 0, SW, SH); else src.image(pattern, 0, 0, SW, SH);
  src.loadPixels(); out.loadPixels();
  let sp = src.pixels, op = out.pixels;
  for (let j = 0; j < OH; j++) {
    let y = (j - OH / 2) / (OH / 2);
    for (let i = 0; i < OW; i++) {
      let x = (i - OW / 2) / (OH / 2), q = inv(x, y);
      let sx = Math.floor(q[0] * (SH / 2) + SW / 2), sy = Math.floor(q[1] * (SH / 2) + SH / 2), o = 4 * (i + j * OW);
      if (sx >= 0 && sx < SW && sy >= 0 && sy < SH) { let k = 4 * (sx + sy * SW); op[o] = sp[k]; op[o + 1] = sp[k + 1]; op[o + 2] = sp[k + 2]; }
      else { op[o] = 30; op[o + 1] = 30; op[o + 2] = 40; }
      op[o + 3] = 255;
    }
  }
  out.updatePixels();
  image(out, dispX, dispY, dispW, dispH);
  // 方眼：元の映像のまっすぐな線を前向きの変形で写す
  let toScr = (p) => [dispX + dispW / 2 + p[0] * dispH / 2, dispY + dispH / 2 + p[1] * dispH / 2];
  if (showGrid) {
    noFill(); stroke(255, 255, 120, 150); strokeWeight(1.5);
    for (let k = -6; k <= 6; k++) for (let d = 0; d < 2; d++) {
      let run = [];
      for (let s = -1.4; s <= 1.42; s += 0.02) {
        let p = d === 0 ? fwd((k / 6) * 1.33, s) : fwd((s * 1.33) / 1.4, k / 6);
        let okP = s <= 1.4 && isFinite(p[0]) && Math.abs(p[0]) < 3 && Math.abs(p[1]) < 3;
        if (okP) { run.push(toScr(p)); continue; }
        if (run.length > 1) { beginShape(); for (let c of run) vertex(c[0], c[1]); endShape(); }
        run = [];
      }
    }
  }
  let m = toScr([cx, cy]);
  noFill(); stroke(255, 80, 80); strokeWeight(2); circle(m[0], m[1], 16);
  // 元の映像（小さく）
  image(src, 20, height - SH - 20);
  noStroke(); fill(255); textSize(13); text('元の映像', 20, height - SH - 28);
  fill(255); textSize(18);
  text('マウス：中心　1 ねじり　2 うずまき　3 円の反転　4 メビウス変換　5 ふくらみ　↑↓：強さ ' + nf(strength, 1, 1) + '　G：方眼　P：' + (usePattern || !ready ? '模様' : 'カメラ') + '　S：保存', 20, 40);
  fill(160); textSize(15);
  text(names[mode] + '：' + ['', '中心ほど大きく回す', '中心のまわりだけ渦をまく', '円の内側と外側を入れかえる（中心は無限の遠くへ）', '円板の中の点 a を中心へ運ぶ（円板の中での「平行移動」）', '中心をふくらませる'][mode] + '。黄色い方眼 = 元のまっすぐな線の行き先' + (ready ? '' : '　（カメラなし → 模様で表示）'), 20, 68);
}

function mouseMoved() { setCenter(); }
function mouseDragged() { setCenter(); }
function setCenter() {
  cx = constrain((mouseX - dispX - dispW / 2) / (dispH / 2), -1.3, 1.3);
  cy = constrain((mouseY - dispY - dispH / 2) / (dispH / 2), -1, 1);
  if (mode === 4) { let r = Math.hypot(cx, cy); if (r > 0.95) { cx *= 0.95 / r; cy *= 0.95 / r; } }
}
function keyPressed() {
  if ('12345'.includes(key) && key.length === 1) { mode = int(key); setCenter(); }
  if (key === UP_ARROW) strength = min(8, strength + 0.5);
  if (key === DOWN_ARROW) strength = max(0, strength - 0.5);
  if (key === 'g' || key === 'G') showGrid = !showGrid;
  if (key === 'p' || key === 'P') usePattern = !usePattern;
  if (key === 's' || key === 'S') saveCanvas('homeomorphism', 'png');
}

// ---------- やってみよう ----------
// 1. ねじりの強さを 8 にしても、顔はちぎれない（つながり方は同じ）。何回ねじったら元に戻ると思う？
// 2. 円の反転で、自分の顔を円の中に閉じこめよう。円の上の点は動かない（不動点）
// 3. warp() に自分の変形を足そう。「逆写像」も書けないと画面は描けない。逆が書けない変形はある？
// 4. 方眼をよく見ると、変形しても直角に交わったまま（メビウス変換・反転は角度を保つ「等角写像」）


// ==================================================
// ここから下は「カメラがないときの模様の道具」
// ==================================================
function makePattern() {
  let g = createGraphics(SW, SH);
  g.pixelDensity(1); g.noStroke();
  for (let i = 0; i < 16; i++) for (let j = 0; j < 12; j++) { g.fill((i + j) % 2 ? 235 : 60, (i + j) % 2 ? 200 : 90, (i + j) % 2 ? 120 : 180); g.rect(i * 10, j * 10, 10, 10); }
  g.fill(255, 220, 80); g.circle(80, 60, 70);
  g.fill(40); g.circle(68, 52, 10); g.circle(92, 52, 10);
  g.noFill(); g.stroke(40); g.strokeWeight(3); g.arc(80, 64, 36, 26, 0.2, PI - 0.2);
  return g;
}
