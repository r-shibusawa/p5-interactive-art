// ============================================
// 05 外積と線分の交差判定
// 外積 (b − a) × (c − a) の「符号」だけで、c が線分 a→b の左にあるか右にあるかがわかる
// 2 本の線分は「互いに相手の両側にまたがっている」とき交わる
// 一直線上（外積 = 0）のときだけ、範囲に入っているか（ON-SEGMENT）を調べる
// 操作：点をドラッグ / R = ランダム / 1〜4 = お手本（交差・離れている・一直線・端が接する）
// ============================================

let pts = [];
let drag = -1;
let names = ['p1', 'p2', 'p3', 'p4'];
let showArea = true;    // ★ 外積の大きさ（平行四辺形の面積）を表示する

const BG = '#14101f', PANEL = '#221a33', FG = '#e9e4f5', DIM = '#8c84a3';
const ORCHID = '#f0a3ff', MINT = '#6fe3d0', GOLD = '#ffcf6b', BAD = '#ff6b81';

function setup() {
  createCanvas(windowWidth, windowHeight);
  preset(1);
}

function preset(k) {
  let cx = width * 0.42, cy = height * 0.55, u = min(width, height) * 0.28;
  let P = {
    1: [[-1, -0.6], [1, 0.7], [-0.8, 0.8], [0.9, -0.7]],
    2: [[-1, -0.6], [0.2, 0.1], [-0.2, 0.9], [0.9, 0.3]],
    3: [[-1, -0.5], [0.3, 0.15], [-0.2, -0.1], [1, 0.5]],
    4: [[-1, 0.6], [1, 0.6], [0, 0.6], [0.4, -0.8]],
  }[k];
  pts = P.map(([x, y]) => createVector(cx + x * u, cy + y * u));
}

// 画面は y が下向きなので、y を反転して「数学の向き」で外積を計算する
function turn(o, a, b) { return (a.x - o.x) * -(b.y - o.y) - -(a.y - o.y) * (b.x - o.x); }
function onSegment(a, b, c) { return min(a.x, b.x) <= c.x && c.x <= max(a.x, b.x) && min(a.y, b.y) <= c.y && c.y <= max(a.y, b.y); }

function draw() {
  background(BG);
  let [p1, p2, p3, p4] = pts;
  // ★ 2 本の線分が交わるか
  let d1 = turn(p3, p4, p1), d2 = turn(p3, p4, p2);
  let d3 = turn(p1, p2, p3), d4 = turn(p1, p2, p4);
  let straddle1 = (d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0);
  let straddle2 = (d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0);
  let hit = false, why = '';
  if (straddle1 && straddle2) { hit = true; why = '互いに相手の両側にまたがっている'; }
  else if (abs(d1) < 1 && onSegment(p3, p4, p1)) { hit = true; why = 'p1 が線分 p3p4 の上にある'; }
  else if (abs(d2) < 1 && onSegment(p3, p4, p2)) { hit = true; why = 'p2 が線分 p3p4 の上にある'; }
  else if (abs(d3) < 1 && onSegment(p1, p2, p3)) { hit = true; why = 'p3 が線分 p1p2 の上にある'; }
  else if (abs(d4) < 1 && onSegment(p1, p2, p4)) { hit = true; why = 'p4 が線分 p1p2 の上にある'; }
  else why = !straddle1 ? 'p1 と p2 が線分 p3p4 の同じ側にある' : 'p3 と p4 が線分 p1p2 の同じ側にある';

  // 外積の平行四辺形（p1→p2 と p1→p3）
  if (showArea) {
    noStroke(); fill(d3 > 0 ? 'rgba(111,227,208,0.14)' : 'rgba(255,107,129,0.14)');
    quad(p1.x, p1.y, p2.x, p2.y, p2.x + p3.x - p1.x, p2.y + p3.y - p1.y, p3.x, p3.y);
    stroke(DIM); strokeWeight(1); drawingContext.setLineDash([5, 5]);
    line(p1.x, p1.y, p3.x, p3.y); line(p1.x, p1.y, p4.x, p4.y);
    drawingContext.setLineDash([]);
  }
  // 線分（矢印つき）
  arrowSeg(p1, p2, ORCHID);
  arrowSeg(p3, p4, MINT);
  // 交点
  if (hit) {
    let den = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
    let X = p1;
    if (abs(den) > 1e-9) {
      let t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / den;
      X = createVector(p1.x + t * (p2.x - p1.x), p1.y + t * (p2.y - p1.y));
    } else X = [p1, p2, p3, p4].find((p, i) => i < 2 ? onSegment(p3, p4, p) : onSegment(p1, p2, p));
    noFill(); stroke(GOLD); strokeWeight(3); circle(X.x, X.y, 26 + sin(frameCount * 0.15) * 4);
  }
  // 点
  pts.forEach((p, i) => {
    noStroke(); fill(i < 2 ? ORCHID : MINT); circle(p.x, p.y, drag === i ? 22 : 16);
    fill(FG); textSize(16); textAlign(LEFT, BOTTOM); text(names[i], p.x + 12, p.y - 6);
  });

  // パネル
  let px = width - 380, py = 30;
  noStroke(); fill(PANEL); rect(px, py, 350, 330, 12);
  fill(FG); textAlign(LEFT, TOP); textSize(18); text('外積の符号（左 = +、右 = −）', px + 20, py + 18);
  textSize(15);
  let rows = [
    ['d1', 'p1 は p3→p4 の', d1], ['d2', 'p2 は p3→p4 の', d2],
    ['d3', 'p3 は p1→p2 の', d3], ['d4', 'p4 は p1→p2 の', d4],
  ];
  rows.forEach(([nm, lab, v], k) => {
    let y = py + 60 + k * 34;
    fill(k < 2 ? MINT : ORCHID); text(nm, px + 20, y);
    fill(FG); text(lab + (abs(v) < 1 ? ' 線上（0）' : v > 0 ? ' 左（+）' : ' 右（−）'), px + 60, y);
    fill(abs(v) < 1 ? GOLD : v > 0 ? MINT : BAD); text(nf(v / 1000, 1, 1) + 'k', px + 270, y);
  });
  fill(hit ? MINT : BAD); textSize(24); text(hit ? '交わる！' : '交わらない', px + 20, py + 210);
  fill(DIM); textSize(14); text(why, px + 20, py + 246, 310);
  fill(DIM); textSize(13);
  text('色つきの平行四辺形の面積 = |(p2−p1)×(p3−p1)|', px + 20, py + 290);

  fill(FG); textSize(22); textAlign(LEFT, TOP); text('外積と線分の交差判定', 30, 24);
  fill(DIM); textSize(14); text('点をドラッグ   R ランダム   1〜4 お手本（交差 / 離れている / 一直線 / 端が接する）   A 面積の表示', 30, 56);
  textSize(15); fill(FG);
  text('外積 (b−a)×(c−a) = (bx−ax)(cy−ay) − (by−ay)(cx−ax)\n割り算も三角関数も使わない → 誤差に強く、速い', 30, height - 70);
}

function arrowSeg(a, b, col) {
  stroke(col); strokeWeight(4); line(a.x, a.y, b.x, b.y);
  let ang = atan2(b.y - a.y, b.x - a.x);
  push(); translate((a.x + b.x) / 2, (a.y + b.y) / 2); rotate(ang);
  noStroke(); fill(col); triangle(10, 0, -6, -7, -6, 7); pop();
}

function mousePressed() {
  drag = -1;
  pts.forEach((p, i) => { if (dist(mouseX, mouseY, p.x, p.y) < 24) drag = i; });
}
function mouseDragged() { if (drag >= 0) pts[drag].set(mouseX, mouseY); }
function mouseReleased() { drag = -1; }

function keyPressed() {
  if ('1234'.includes(key)) preset(Number(key));
  if (key === 'r' || key === 'R') pts = pts.map(() => createVector(random(80, width - 460), random(120, height - 120)));
  if (key === 'a' || key === 'A') showArea = !showArea;
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }
