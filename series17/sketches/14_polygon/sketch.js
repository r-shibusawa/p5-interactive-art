// ============================================
// 14 多角形の面積と内外判定
// 面積：基準点 O と各辺でできる三角形の「符号つき面積」（外積 ÷ 2）を足すだけ（靴ひも公式）
//       左回りの辺は +（緑）、右回りの辺は −（赤）。はみ出た部分が打ち消し合う
// 内外：マウスの点から右へ半直線をのばし、辺と交わる回数が奇数なら内側、偶数なら外側
// 操作：クリック = 頂点を追加 / ドラッグ = 頂点や O を動かす / C = 全部消す
//       スペース = 三角形を 1 つずつ足すアニメーション⇄全部 / 1〜3 = お手本（星・くし形・うず巻き）
// ============================================

let poly = [];
let O;                  // 面積を計算する基準点（どこに置いても答えは同じ）
let animate = true;
let drag = null;

const BG = '#14101f', PANEL = '#221a33', FG = '#e9e4f5', DIM = '#8c84a3';
const ORCHID = '#f0a3ff', MINT = '#6fe3d0', GOLD = '#ffcf6b', BAD = '#ff6b81';

function setup() {
  createCanvas(windowWidth, windowHeight);
  preset(1);
}

function preset(k) {
  let cx = (width - 300) / 2, cy = height * 0.56, R = min(width - 300, height) * 0.33;
  poly = [];
  if (k === 1) for (let i = 0; i < 10; i++) { let a = -HALF_PI + (i * TWO_PI) / 10, r = i % 2 ? R * 0.45 : R; poly.push(createVector(cx + cos(a) * r, cy + sin(a) * r)); }
  if (k === 2) {   // くし形（へこみが多い）
    let xs = [-1, -1, -0.6, -0.6, -0.2, -0.2, 0.2, 0.2, 0.6, 0.6, 1, 1];
    let ys = [0.8, -0.8, -0.8, 0.3, 0.3, -0.8, -0.8, 0.3, 0.3, -0.8, -0.8, 0.8];
    for (let i = 0; i < xs.length; i++) poly.push(createVector(cx + xs[i] * R, cy + ys[i] * R));
  }
  if (k === 3) for (let i = 0; i < 26; i++) { let a = i * 0.5, r = R * (0.15 + i * 0.033); poly.push(createVector(cx + cos(a) * r, cy + sin(a) * r)); }
  O = createVector(cx - R * 1.2, cy + R * 0.9);
}

// 画面は y が下向きなので、y を反転して計算（+ = 左回り）
function turn(o, a, b) { return (a.x - o.x) * (o.y - b.y) - (o.y - a.y) * (b.x - o.x); }

function draw() {
  background(BG);
  let n = poly.length;
  let shownTri = animate ? floor(frameCount / 20) % (n + 8) : n;   // 何枚目の三角形まで表示するか
  let sum = 0;

  // 符号つき三角形
  for (let i = 0; i < n && n >= 3; i++) {
    let a = poly[i], b = poly[(i + 1) % n];
    let s = turn(O, a, b) / 2;
    if (i < shownTri) {
      sum += s;
      noStroke(); fill(s > 0 ? 'rgba(111,227,208,0.18)' : 'rgba(255,107,129,0.18)');
      triangle(O.x, O.y, a.x, a.y, b.x, b.y);
      stroke(s > 0 ? MINT : BAD); strokeWeight(1); line(O.x, O.y, a.x, a.y);
    }
  }
  // 多角形
  noFill(); stroke(ORCHID); strokeWeight(3);
  beginShape(); for (let p of poly) vertex(p.x, p.y); if (n >= 3) endShape(CLOSE); else endShape();
  noStroke();
  poly.forEach((p, i) => { fill(ORCHID); circle(p.x, p.y, 11); fill(DIM); textSize(11); text(i, p.x + 7, p.y - 7); });
  fill(GOLD); circle(O.x, O.y, 14); fill(FG); textSize(14); text('O', O.x + 10, O.y + 4);

  // 内外判定（マウスから右へ）
  let crossings = [];
  if (n >= 3 && mouseX < width - 300 && mouseY > 90) {
    for (let i = 0; i < n; i++) {
      let a = poly[i], b = poly[(i + 1) % n];
      if ((a.y > mouseY) !== (b.y > mouseY)) {   // 辺がマウスの高さをまたぐ
        let x = a.x + ((mouseY - a.y) * (b.x - a.x)) / (b.y - a.y);
        if (x > mouseX) crossings.push(x);
      }
    }
    let inside = crossings.length % 2 === 1;
    stroke(inside ? MINT : DIM); strokeWeight(2); drawingContext.setLineDash([6, 5]);
    line(mouseX, mouseY, width - 300, mouseY); drawingContext.setLineDash([]);
    noStroke(); fill(GOLD); for (let x of crossings) circle(x, mouseY, 10);
    fill(inside ? MINT : BAD); circle(mouseX, mouseY, 14);
    textSize(15); text(`${crossings.length} 回 → ${inside ? '内側' : '外側'}`, mouseX + 12, mouseY - 12);
  }

  // パネル
  let px = width - 280, total = 0;
  for (let i = 0; i < n && n >= 3; i++) total += turn(O, poly[i], poly[(i + 1) % n]) / 2;
  fill(PANEL); rect(px, 20, 260, 270, 12);
  fill(FG); textAlign(LEFT, TOP); textSize(17); text('靴ひも公式', px + 18, 36);
  textSize(15);
  text(`頂点 ${n} 個\n足した三角形 ${min(shownTri, n)} / ${n}\nここまでの合計 ${round(sum)}\n\n面積 = |${round(total)}| = ${round(abs(total))}\n向き：${total > 0 ? '左回り（+）' : total < 0 ? '右回り（−）' : '—'}`, px + 18, 70);
  fill(DIM); textSize(13); text('O を動かしても面積は変わらない', px + 18, 250);
  textAlign(LEFT, BASELINE);

  fill(FG); textAlign(LEFT, TOP); textSize(22); text('多角形の面積と内外判定', 30, 24);
  fill(DIM); textSize(14); text('クリック 頂点を追加   ドラッグ 動かす（金の点 = O）   C 消す   スペース アニメーション⇄全部   1〜3 お手本', 30, 56);
  if (n < 3) { fill(BAD); textSize(16); text('頂点を 3 つ以上クリックしてください', 30, 84); }
  textAlign(LEFT, BASELINE);
}

function mousePressed() {
  if (mouseX > width - 290) return;
  drag = null;
  if (dist(mouseX, mouseY, O.x, O.y) < 14) drag = O;
  for (let p of poly) if (dist(mouseX, mouseY, p.x, p.y) < 12) drag = p;
  if (!drag && mouseY > 100) poly.push(createVector(mouseX, mouseY));
}
function mouseDragged() { if (drag) { drag.x = mouseX; drag.y = mouseY; } }
function mouseReleased() { drag = null; }

function keyPressed() {
  if (key === ' ') { animate = !animate; return false; }
  if (key === 'c' || key === 'C') poly = [];
  if ('123'.includes(key)) preset(Number(key));
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); preset(1); }
