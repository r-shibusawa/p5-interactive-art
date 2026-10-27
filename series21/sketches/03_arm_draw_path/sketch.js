// ============================================
// 03 3 リンクアームで文字を描く
// 「手先にこの線をなぞらせたい」→ 軌道上の点を順に目標にして IK（CCD）で追いかける
// 下のグラフは 3 つの関節角の時間変化。手先はまっすぐ動いても関節はまっすぐ動かない
// 1 = 円 / 2 = 四角 / 3 = 文字 N / 4 = 星 / ↑↓ = 速さ / スペース = 一時停止 / C = 描いた線を消す
// ============================================

let L = [150, 120, 90];     // ★ 3 本のリンクの長さ
let q = [1.2, -0.6, -0.4];  // 関節角
let shape = 1;
let t = 0;                  // 軌道のパラメータ 0〜1
let speed = 0.002;          // ★ 1 フレームで進む t
let paused = false;
let pen = [];               // 手先が実際に通った点
let hist = [[], [], []];    // 関節角の履歴
let names = ['', '円', '四角', '文字 N', '星'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function basePos() { return { x: width * 0.3, y: height * 0.55 }; }
function center() { let b = basePos(); return { x: b.x + 200, y: b.y - 140 }; }

// ★ 軌道：t（0〜1）→ 目標の点
function pathPoint(tt) {
  let c = center(), R = 90;
  if (shape === 1) return { x: c.x + R * cos(TWO_PI * tt), y: c.y + R * sin(TWO_PI * tt) };
  if (shape === 2) return polyline([[-R, -R], [R, -R], [R, R], [-R, R], [-R, -R]], tt, c);
  if (shape === 3) return polyline([[-R * 0.7, R], [-R * 0.7, -R], [R * 0.7, R], [R * 0.7, -R]], tt, c);
  let star = [];
  for (let i = 0; i <= 5; i++) { let a = -HALF_PI + i * TWO_PI * 2 / 5; star.push([R * cos(a), R * sin(a)]); }
  return polyline(star, tt, c);
}
// 折れ線を等速でなぞる
function polyline(pts, tt, c) {
  let total = 0, segs = [];
  for (let i = 0; i + 1 < pts.length; i++) { let d = sqrt(sq(pts[i + 1][0] - pts[i][0]) + sq(pts[i + 1][1] - pts[i][1])); segs.push(d); total += d; }
  let s = tt * total;
  for (let i = 0; i < segs.length; i++) {
    if (s <= segs[i] || i === segs.length - 1) {
      let u = constrain(s / segs[i], 0, 1);
      return { x: c.x + lerp(pts[i][0], pts[i + 1][0], u), y: c.y + lerp(pts[i][1], pts[i + 1][1], u) };
    }
    s -= segs[i];
  }
  return c;
}

function joints() {
  let b = basePos();
  let pts = [{ x: b.x, y: b.y }];
  let a = 0;
  for (let i = 0; i < 3; i++) {
    a += q[i];
    let p = pts[pts.length - 1];
    pts.push({ x: p.x + L[i] * cos(a), y: p.y - L[i] * sin(a) });
  }
  return pts;
}

// CCD を何回か回して手先を目標へ（1 フレームに 3 回で十分なめらか）
function solveIK(tx, ty) {
  for (let k = 0; k < 3; k++) {
    for (let i = 2; i >= 0; i--) {
      let pts = joints();
      let j = pts[i], h = pts[3];
      let d = atan2(-(ty - j.y), tx - j.x) - atan2(-(h.y - j.y), h.x - j.x);
      q[i] += atan2(sin(d), cos(d)) * 0.8;   // ★ 0.8 = 少し控えめに回すと震えにくい
    }
  }
}

function draw() {
  background(215, 35, 12);
  if (!paused) { t += speed; if (t >= 1) { t -= 1; } }
  let target = pathPoint(t);
  solveIK(target.x, target.y);
  let pts = joints();
  pen.push({ x: pts[3].x, y: pts[3].y });
  if (pen.length > 1500) pen.shift();
  for (let i = 0; i < 3; i++) { hist[i].push(q[i]); if (hist[i].length > 400) hist[i].shift(); }

  // 目標の軌道（薄く）
  noFill();
  stroke(0, 0, 100, 15);
  strokeWeight(1);
  beginShape();
  for (let u = 0; u <= 1; u += 0.005) { let p = pathPoint(u); vertex(p.x, p.y); }
  endShape();
  // 描いた線
  stroke(45, 90, 100, 80);
  strokeWeight(3);
  beginShape();
  for (let p of pen) vertex(p.x, p.y);
  endShape();

  // 腕
  let hues = [200, 270, 320];
  for (let i = 0; i < 3; i++) {
    stroke(hues[i], 60, 95);
    strokeWeight(12 - i * 2);
    line(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
  }
  noStroke();
  for (let i = 0; i < 3; i++) { fill(0, 0, 100); circle(pts[i].x, pts[i].y, 14); }
  fill(45, 90, 100);
  circle(pts[3].x, pts[3].y, 14);
  fill(0, 0, 40);
  rect(pts[0].x - 30, pts[0].y, 60, 14, 3);
  noFill();
  stroke(120, 90, 100);
  strokeWeight(2);
  circle(target.x, target.y, 18);

  // 関節角グラフ
  let gx = width * 0.58, gy = 120, gw = width * 0.38, gh = height - 240;
  noStroke();
  fill(0, 0, 100, 6);
  rect(gx - 10, gy - 10, gw + 20, gh + 20, 10);
  for (let i = 0; i < 3; i++) {
    let y0 = gy + (i + 0.5) * gh / 3;
    stroke(0, 0, 40);
    strokeWeight(1);
    line(gx, y0, gx + gw, y0);
    stroke(hues[i], 60, 95);
    strokeWeight(2);
    noFill();
    beginShape();
    for (let k = 0; k < hist[i].length; k++) vertex(gx + (k / 400) * gw, y0 - (atan2(sin(hist[i][k]), cos(hist[i][k])) / PI) * gh / 7);
    endShape();
    noStroke();
    fill(hues[i], 60, 95);
    textSize(13);
    text('q' + (i + 1) + ' = ' + nf(degrees(atan2(sin(q[i]), cos(q[i]))), 1, 0) + '°', gx + 6, y0 - gh / 7 - 2);
  }

  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text('軌道：' + names[shape] + '（1〜4）　速さ ' + nf(speed * 1000, 1, 1) + '（↑↓）　スペース：' + (paused ? '再開' : '一時停止') + '　C：線を消す　t = ' + nf(t, 1, 2), 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('手先が直線を描くとき、関節角（右のグラフ）はカーブする。これが「関節空間」と「作業空間」のちがい。速すぎると IK が追いつかず線が崩れる', 20, 68);
}

function keyPressed() {
  if (key >= '1' && key <= '4') { shape = int(key); t = 0; pen = []; }
  if (key === UP_ARROW) speed = min(0.02, speed * 1.4);
  if (key === DOWN_ARROW) speed = max(0.0003, speed / 1.4);
  if (key === ' ') paused = !paused;
  if (key === 'c' || key === 'C') pen = [];
}

// ---------- やってみよう ----------
// 1. 四角の角で関節角のグラフが「折れる」のを探そう。手先の向きが急に変わる瞬間
// 2. 速さを上げると描いた線が目標からずれる。どのくらいまで追いつける？（solveIK の回数を増やすと？）
// 3. pathPoint に自分の文字や形を追加しよう（shape === 5）。自分の名前の頭文字が描けるか
// 4. center() を基部から遠くへ動かすと届かなくなる。届かないときアームはどうふるまう？
