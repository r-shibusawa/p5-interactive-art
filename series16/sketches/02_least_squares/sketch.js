// ============================================
// 02 最小二乗法：点にいちばん近い曲線
// 点が多すぎて全部を通る曲線はない → 縦のずれ（残差）の 2 乗の和が最小の多項式を選ぶ
// 正規方程式 AᵀA c = Aᵀy を解く。AᵀA は「対称正定値」なのでコレスキー分解で安全に解ける
// クリック：点を追加 / ドラッグ：点を動かす / 1〜6：多項式の次数 / C：全部消す / N：ランダムな点 / S：点を整列
// ============================================

let degree = 1;      // ★ 最初の次数（1 = 直線）
let showSquares = true; // ★ 残差を「正方形」で描く（面積の合計を最小にしている）

let pts = [], coef = null, dragI = -1, ATA = null, L = null, sse = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  textWrap(CHAR); // 日本語を文字単位で折り返す
  randomPoints();
}

function randomPoints() {
  pts = [];
  for (let i = 0; i < 12; i++) { let x = map(i, 0, 11, -0.9, 0.9); pts.push({ x, y: 0.6 * sin(x * 2.4) + random(-0.15, 0.15) }); }
  fit();
}

// 正規方程式を作ってコレスキー分解（AᵀA = LLᵀ）で解く
function fit() {
  let m = degree + 1;
  coef = null; ATA = null; L = null;
  if (pts.length < m) return;
  ATA = Array.from({ length: m }, () => Array(m).fill(0));
  let ATy = Array(m).fill(0);
  for (let p of pts) {
    let pw = []; for (let k = 0; k < m; k++) pw.push(pow(p.x, k));
    for (let i = 0; i < m; i++) { ATy[i] += pw[i] * p.y; for (let j = 0; j < m; j++) ATA[i][j] += pw[i] * pw[j]; }
  }
  L = Array.from({ length: m }, () => Array(m).fill(0));
  for (let j = 0; j < m; j++) {
    let s = ATA[j][j];
    for (let k = 0; k < j; k++) s -= L[j][k] * L[j][k];
    if (s <= 1e-12) { coef = null; L = null; return; } // 正定値でない（点の x が重なりすぎ）
    L[j][j] = sqrt(s);
    for (let i = j + 1; i < m; i++) { let t = ATA[i][j]; for (let k = 0; k < j; k++) t -= L[i][k] * L[j][k]; L[i][j] = t / L[j][j]; }
  }
  let z = Array(m).fill(0);
  for (let i = 0; i < m; i++) { let t = ATy[i]; for (let k = 0; k < i; k++) t -= L[i][k] * z[k]; z[i] = t / L[i][i]; }
  coef = Array(m).fill(0);
  for (let i = m - 1; i >= 0; i--) { let t = z[i]; for (let k = i + 1; k < m; k++) t -= L[k][i] * coef[k]; coef[i] = t / L[i][i]; }
  sse = 0; for (let p of pts) sse += sq(p.y - evalP(p.x));
}

function evalP(x) { let v = 0; for (let k = coef.length - 1; k >= 0; k--) v = v * x + coef[k]; return v; } // ホーナー法

function draw() {
  background(18, 14, 26);
  let R = plotRect();
  fill(235); noStroke(); textSize(26); textAlign(LEFT, BASELINE);
  text('最小二乗法：点にいちばん近い曲線', 30, 50);
  textSize(15); fill(150);
  text('クリック：点を追加　ドラッグ：動かす　1〜6：次数（いま ' + degree + '）　C：消す　N：ランダム　S：残差の正方形 ' + (showSquares ? 'ON' : 'OFF'), 30, 80);

  fill(28, 22, 38); noStroke(); rect(R.x, R.y, R.w, R.h, 12);
  stroke(50, 42, 68); strokeWeight(1);
  for (let k = -4; k <= 4; k++) { let gx = sx(k / 4.4, R), gy = sy(k / 4.4, R); line(gx, R.y, gx, R.y + R.h); line(R.x, gy, R.x + R.w, gy); }

  if (coef) {
    for (let p of pts) {
      let e = p.y - evalP(p.x), px = sx(p.x, R), py = sy(p.y, R), qy = sy(evalP(p.x), R);
      if (showSquares) { noStroke(); fill(255, 200, 90, 40); let s = qy - py; rect(px, min(py, qy), abs(s) * (e > 0 ? 1 : -1), abs(s)); }
      stroke(255, 200, 90); strokeWeight(2); line(px, py, px, qy);
    }
    noFill(); stroke(78, 225, 190); strokeWeight(4); beginShape();
    for (let i = 0; i <= 200; i++) { let x = map(i, 0, 200, -1, 1), v = evalP(x); if (abs(v) < 1.6) vertex(sx(x, R), sy(v, R)); else { endShape(); beginShape(); } }
    endShape();
  }
  for (let i = 0; i < pts.length; i++) { noStroke(); fill(i === dragI ? 255 : color(255, 95, 109)); circle(sx(pts[i].x, R), sy(pts[i].y, R), 16); }

  // 右の数字パネル
  let px = R.x + R.w + 30, w = width - px - 30;
  fill(235); textSize(18); textAlign(LEFT, TOP); noStroke();
  if (!coef) {
    fill(255, 120, 120);
    text(pts.length < degree + 1 ? `${degree} 次式には点が ${degree + 1} 個以上いる（いま ${pts.length} 個）` : 'AᵀA が正定値でない（x が同じ点ばかり）→ 解が 1 つに決まらない', px, 130, w);
  } else {
    text('いちばん近い多項式', px, 120);
    textSize(16); fill(78, 225, 190);
    let s = 'y = ' + coef.map((c, k) => (k === 0 ? fmt(c) : (c >= 0 ? '+ ' : '− ') + fmt(abs(c)) + 'x' + (k > 1 ? sup(k) : ''))).join(' ');
    text(s, px, 150, w);
    fill(255, 200, 90); textSize(18);
    text('残差の 2 乗の和 = ' + sse.toFixed(4), px, 205);
    fill(200); textSize(15); text('AᵀA（対称：左上と右下が鏡うつし）', px, 245);
    drawMat(ATA, px, 270, min(48, w / ATA.length), true);
    fill(200); textSize(15); text('コレスキー分解の L（AᵀA = LLᵀ）', px, 290 + ATA.length * min(48, w / ATA.length));
    drawMat(L, px, 315 + ATA.length * min(48, w / ATA.length), min(48, w / ATA.length), false);
  }
  fill(150); textSize(14); textAlign(LEFT, TOP);
  text('次数を上げると残差は小さくなるが、点の間で曲線が暴れる（過学習）。\n点が n 個なら n−1 次式で全部を通る（=補間、06 で）。\nAᵀA は対称正定値なので、ピボットなしで分解しても 0 で割らない。', px, height - 130, w);
}

function drawMat(Mx, x0, y0, cs, heat) {
  let mx = 0; for (let r of Mx) for (let v of r) mx = max(mx, abs(v));
  for (let i = 0; i < Mx.length; i++) for (let j = 0; j < Mx.length; j++) {
    let v = Mx[i][j];
    fill(heat ? lerpColor(color(40, 34, 56), color(255, 95, 109), abs(v) / (mx || 1)) : (j > i ? color(28, 22, 38) : color(30, 90, 80)));
    stroke(18, 14, 26); rect(x0 + j * cs, y0 + i * cs, cs, cs, 4);
    noStroke(); fill(235); textAlign(CENTER, CENTER); textSize(cs * 0.24);
    if (!(j > i && !heat)) text(v.toFixed(1), x0 + j * cs + cs / 2, y0 + i * cs + cs / 2);
  }
  textAlign(LEFT, TOP);
}

function plotRect() { let s = min(width * 0.58, height - 150); return { x: 30, y: 110, w: s, h: height - 140 }; }
function sx(x, R) { return R.x + ((x + 1.1) / 2.2) * R.w; }
function sy(y, R) { return R.y + R.h / 2 - (y / 1.6) * (R.h / 2); }
function wx(px, R) { return ((px - R.x) / R.w) * 2.2 - 1.1; }
function wy(py, R) { return -((py - R.y - R.h / 2) / (R.h / 2)) * 1.6; }

function mousePressed() {
  let R = plotRect();
  if (mouseX < R.x || mouseX > R.x + R.w || mouseY < R.y || mouseY > R.y + R.h) return;
  dragI = -1;
  for (let i = 0; i < pts.length; i++) if (dist(mouseX, mouseY, sx(pts[i].x, R), sy(pts[i].y, R)) < 14) dragI = i;
  if (dragI < 0) { pts.push({ x: constrain(wx(mouseX, R), -1, 1), y: wy(mouseY, R) }); dragI = pts.length - 1; }
  fit();
}
function mouseDragged() {
  if (dragI < 0) return;
  let R = plotRect();
  pts[dragI].x = constrain(wx(mouseX, R), -1, 1); pts[dragI].y = constrain(wy(mouseY, R), -1.5, 1.5); fit();
}
function mouseReleased() { dragI = -1; }
function keyPressed() {
  if (key >= '1' && key <= '6') { degree = int(key); fit(); }
  if (key === 'c' || key === 'C') { pts = []; fit(); }
  if (key === 'n' || key === 'N') randomPoints();
  if (key === 's' || key === 'S') showSquares = !showSquares;
}
function fmt(v) { return abs(v) < 0.005 ? '0' : v.toFixed(2); }
function sup(k) { return String(k).split('').map(c => '⁰¹²³⁴⁵⁶⁷⁸⁹'[c]).join(''); }
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. 1 点だけ大きく外す（外れ値）。直線はどれくらい引っぱられる？ 2 乗なので強く引っぱられる
// 2. 点を 4 つにして次数 3 → 残差 0（全部の点を通る）
// 3. x が全部同じ点を 2 つだけ置いて 1 次 → 正定値でなくなる（縦の直線は y = 式で書けない）
