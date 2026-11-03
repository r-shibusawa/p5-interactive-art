// ============================================
// 14 フレネ・ブラシ ─ 接線と法線で描く筆
// ドラッグした軌跡の各点で接線 T と法線 N と曲率 κ を計算し、N の方向にリボンや羽を描く
//   幅は曲率で変わる（急カーブで太く or 細く）、色は κ の符号（左曲がり = 暖色、右曲がり = 寒色）
//   κ は直前の 3 点から：κ = 4 × 三角形の面積 / (3 辺の長さの積)（メンガー曲率）
// ドラッグ = 描く / 1〜4 = ブラシ（リボン・羽・くし・接触円）/ ↑↓ = 太さ / F = 急カーブで太く ↔ 細く / B = 紙の色 / C = クリア / S = 保存
// ============================================

let brush = 1, baseW = 14, fatOnCurve = true;   // ★ ブラシの種類・基本の太さ・曲率で太くするか
let smoothing = 0.35;                           // ★ 手ぶれを抑える（小さいほどなめらか）
let kGain = 25;                                 // ★ 曲率が幅に効く強さ
let pg, sp = null, trail = [], lastK = 0, lastW = 0, darkPaper = true;
let cursorHist = [];                            // 筆先の案内（T と N の小さな標構）用
let names = ['リボン', '羽', 'くし（T と N）', '接触円'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  pg = createGraphics(width, height); pg.colorMode(HSB, 360, 100, 100, 100);
  clearPaper();
}
function clearPaper() { if (darkPaper) pg.background(230, 20, 8); else pg.background(45, 8, 97); }

function draw() {
  image(pg, 0, 0);
  if (mouseIsPressed && mouseY > 90) {
    // なめらかにした筆先の位置
    if (!sp) sp = { x: mouseX, y: mouseY };
    sp = { x: sp.x + (mouseX - sp.x) * smoothing, y: sp.y + (mouseY - sp.y) * smoothing };
    let l = trail[trail.length - 1];
    if (!l || Math.hypot(sp.x - l.x, sp.y - l.y) > 2.5) { trail.push({ x: sp.x, y: sp.y }); if (trail.length > 4) trail.shift(); stamp(); }
  }
  // 筆先の案内：押していないときも、マウスの動きから T と N と κ を計算して小さな標構を描く
  cursorHist.push({ x: mouseX, y: mouseY }); if (cursorHist.length > 3) cursorHist.shift();
  if (!mouseIsPressed && cursorHist.length === 3) {
    let f = frenet2D(cursorHist[0], cursorHist[1], cursorHist[2]);
    if (f) {
      stroke(0, 0, darkPaper ? 100 : 20, 70); strokeWeight(2); line(mouseX, mouseY, mouseX + f.tx * 30, mouseY + f.ty * 30);
      stroke(f.k > 0 ? 25 : 200, 80, 100, 90); line(mouseX, mouseY, mouseX + f.nx * 30 * (f.k > 0 ? 1 : -1), mouseY + f.ny * 30 * (f.k > 0 ? 1 : -1));
      noFill(); stroke(45, 90, 100, 40); circle(mouseX, mouseY, 2 * baseW);
    }
  }
  // 今の筆先の情報
  noStroke(); fill(0, 0, darkPaper ? 100 : 15); textSize(18);
  text('ドラッグ：描く　1〜4：ブラシ（' + names[brush - 1] + '）　↑↓：太さ ' + baseW + '　F：急カーブで' + (fatOnCurve ? '太く' : '細く') + '　B：紙の色　C：クリア　S：保存', 20, 40);
  fill(0, 0, darkPaper ? 65 : 40); textSize(15);
  text('暖色 = 左曲がり（κ > 0）　寒色 = 右曲がり（κ < 0）　最後の κ = ' + nf(lastK, 1, 4) + '　幅 = ' + nf(lastW, 1, 1) + ' px　（幅 = 太さ ± ' + kGain + '·|κ|·太さ）', 20, 66);
}

// 3 点 a, b, c から接線 T、左向きの法線 N、メンガー曲率 κ を求める
function frenet2D(a, b, c) {
  let abx = b.x - a.x, aby = b.y - a.y, bcx = c.x - b.x, bcy = c.y - b.y, acx = c.x - a.x, acy = c.y - a.y;
  let cr = abx * bcy - aby * bcx;                                          // 外積（符号 = 曲がる向き）
  let la = Math.hypot(abx, aby), lb = Math.hypot(bcx, bcy), lc = Math.hypot(acx, acy);
  if (lc < 1e-6) return null;
  let k = la * lb * lc > 1e-9 ? -(2 * cr) / (la * lb * lc) : 0;           // 画面は y 下向きなので符号を反転して左 = +
  let tx = acx / lc, ty = acy / lc;
  return { k, tx, ty, nx: ty, ny: -tx };
}
// 直前の 3 点から T, N, κ を求めて、1 スタンプ描く
function stamp() {
  if (trail.length < 3) return;
  let a = trail[trail.length - 3], b = trail[trail.length - 2], c = trail[trail.length - 1];
  let f = frenet2D(a, b, c);
  if (!f) return;
  let { k, tx, ty, nx, ny } = f;
  let kk = Math.min(1, Math.abs(k) * kGain);
  let w = fatOnCurve ? baseW * (0.4 + 1.6 * kk) : baseW * (1.6 - 1.4 * kk);
  lastK = k; lastW = w;
  let hue = k > 0 ? 20 + 20 * kk : 200 + 40 * kk, sat = 35 + 60 * kk;
  pg.noStroke();
  if (brush === 1) {                                                       // リボン：前の点と今の点の ± N を四角でつなぐ
    let pw = lastRibbonW === null ? w : lastRibbonW;
    pg.fill(hue, sat, 95, 85);
    pg.quad(b.x + nx * pw, b.y + ny * pw, c.x + nx * w, c.y + ny * w, c.x - nx * w, c.y - ny * w, b.x - nx * pw, b.y - ny * pw);
    lastRibbonW = w;
  } else if (brush === 2) {                                                // 羽：法線方向に短い線を左右交互に、少し後ろへ流す
    pg.stroke(hue, sat, 100, 70); pg.strokeWeight(1.5);
    let side = (featherCount++ % 2) * 2 - 1, L = w * 2.2;
    pg.line(c.x, c.y, c.x + (nx * side - tx * 0.6) * L, c.y + (ny * side - ty * 0.6) * L);
    pg.stroke(0, 0, 100, 60); pg.strokeWeight(2.5); pg.point(c.x, c.y);
  } else if (brush === 3) {                                                // くし：T（白）と N（色）の小さな標構
    if (featherCount++ % 3 === 0) {
      pg.strokeWeight(2); pg.stroke(0, 0, 100, 80); pg.line(c.x, c.y, c.x + tx * w * 1.2, c.y + ty * w * 1.2);
      pg.stroke(hue, sat, 100, 90); pg.line(c.x, c.y, c.x + nx * w * (k > 0 ? 1 : -1), c.y + ny * w * (k > 0 ? 1 : -1));
      pg.noStroke(); pg.fill(0, 0, 100); pg.circle(c.x, c.y, 4);
    }
  } else {                                                                 // 接触円：半径 1/|κ| の薄い円を曲率中心に
    let r = Math.min(1 / Math.max(Math.abs(k), 1e-9), 400);
    if (r < 400 && featherCount++ % 2 === 0) {
      let sgn = k > 0 ? 1 : -1;
      pg.noFill(); pg.stroke(hue, sat, 100, 18); pg.strokeWeight(1);
      pg.circle(c.x + nx * r * sgn, c.y + ny * r * sgn, 2 * r);
    }
    pg.noStroke(); pg.fill(0, 0, 100, 90); pg.circle(c.x, c.y, 3);
  }
}
let lastRibbonW = null, featherCount = 0;

function mousePressed() { trail = []; sp = null; lastRibbonW = null; }
function mouseReleased() { trail = []; sp = null; lastRibbonW = null; }
function keyPressed() {
  if (key >= '1' && key <= '4') brush = +key;
  if (key === 'f' || key === 'F') fatOnCurve = !fatOnCurve;
  if (key === 'b' || key === 'B') { darkPaper = !darkPaper; clearPaper(); }
  if (key === 'c' || key === 'C') clearPaper();
  if (key === 's' || key === 'S') saveCanvas('frenet_brush', 'png');
  if (key === UP_ARROW) baseW = Math.min(60, baseW + 2);
  if (key === DOWN_ARROW) baseW = Math.max(2, baseW - 2);
}

// ---------- やってみよう ----------
// 1. ゆっくり大きな円を描くと一色、小さな渦を描くと濃い色になる。κ の大きさが色の濃さ
// 2. 「の」の字を描くと左右どちらの色？ 逆向きに書くと？（κ の符号 = 回る向き）
// 3. 羽（2）の長さに sin(frameCount) を掛けて揺らぐ筆にしよう。接触円（4）の透明度を κ で変えよう
// 4. 13 の音と合体して、描きながら曲率の音を鳴らす「歌う筆」にしよう
