// ============================================
// 06 掃引線で交差を見つける
// 縦の線（掃引線）を左から右へ動かし、「いま線にかかっている線分」を上から順に並べておく
// 新しく入った線分は「すぐ上」と「すぐ下」とだけ、抜けるときはその上下どうしを比べる
// 全部の組（n(n−1)/2 通り）を調べなくても、交差があれば必ず見つかる → O(n log n)
// 操作：端点をドラッグ / スペース = 再生・停止 / → = 次のイベント / R = ランダム
//       S = 最初の交差で止める⇄最後まで / 1〜3 = お手本
// ============================================

let segs = [];
let N = 8;              // ★ 線分の数
let events = [], ev = 0;
let onLine = [];        // 掃引線にかかっている線分（上から順）
let sweepX = 0, targetX = 0;
let checks = [], found = [];
let stopAtFirst = true;
let auto = true, waiting = 0;
let drag = null;

const BG = '#14101f', PANEL = '#221a33', FG = '#e9e4f5', DIM = '#8c84a3';
const ORCHID = '#f0a3ff', MINT = '#6fe3d0', GOLD = '#ffcf6b', BAD = '#ff6b81';

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  preset(1);
}

function preset(k) {
  segs = [];
  let W = width - 360;
  for (let i = 0; i < N; i++) {
    let x1 = random(60, W * 0.7), x2 = x1 + random(120, W * 0.45);
    let y1 = random(140, height - 60), y2 = random(140, height - 60);
    if (k === 2) { y1 = 140 + i * (height - 200) / N; y2 = y1 + random(-20, 20); }            // 交わらない
    if (k === 3) { y1 = i % 2 ? 160 : height - 80; y2 = i % 2 ? height - 80 : 160; }          // たくさん交わる
    segs.push({ a: createVector(x1, y1), b: createVector(min(x2, W - 20), y2), hue: (i * 360) / N });
  }
  restart();
}

function restart() {
  for (let s of segs) { if (s.a.x > s.b.x) [s.a, s.b] = [s.b, s.a]; if (abs(s.b.x - s.a.x) < 3) s.b.x = s.a.x + 3; }  // 縦の線分はなし
  events = [];
  segs.forEach((s, i) => { events.push({ x: s.a.x, y: s.a.y, left: true, i }); events.push({ x: s.b.x, y: s.b.y, left: false, i }); });
  events.sort((p, q) => p.x - q.x || (q.left - p.left) || p.y - q.y);   // 同じ x なら左端が先、y の小さい方が先
  ev = 0; onLine = []; checks = []; found = [];
  sweepX = 30; targetX = events.length ? events[0].x : 30;
}

function yAt(s, x) { return s.a.y + ((s.b.y - s.a.y) * (x - s.a.x)) / (s.b.x - s.a.x); }
function turn(o, a, b) { return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x); }
function onSeg(a, b, c) { return min(a.x, b.x) <= c.x && c.x <= max(a.x, b.x) && min(a.y, b.y) <= c.y && c.y <= max(a.y, b.y); }
function intersects(i, j) {
  let p1 = segs[i].a, p2 = segs[i].b, p3 = segs[j].a, p4 = segs[j].b;
  let d1 = turn(p3, p4, p1), d2 = turn(p3, p4, p2), d3 = turn(p1, p2, p3), d4 = turn(p1, p2, p4);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  return (d1 === 0 && onSeg(p3, p4, p1)) || (d2 === 0 && onSeg(p3, p4, p2)) || (d3 === 0 && onSeg(p1, p2, p3)) || (d4 === 0 && onSeg(p1, p2, p4));
}
function test(i, j) {
  if (i === undefined || j === undefined) return;
  let hit = intersects(i, j);
  checks.push({ i, j, hit, t: frameCount });
  if (hit && !found.some((f) => (f.i === i && f.j === j) || (f.i === j && f.j === i))) found.push({ i, j });
}

// ★ イベントを 1 つ処理する
function processEvent() {
  if (ev >= events.length || (stopAtFirst && found.length)) return;
  let e = events[ev++];
  sweepX = e.x;
  if (e.left) {
    // INSERT：掃引線との交点の y で並ぶ位置を決める
    let pos = onLine.findIndex((k) => yAt(segs[k], e.x) > e.y);
    if (pos < 0) pos = onLine.length;
    onLine.splice(pos, 0, e.i);
    test(e.i, onLine[pos - 1]);   // すぐ上と
    test(e.i, onLine[pos + 1]);   // すぐ下と
  } else {
    let pos = onLine.indexOf(e.i);
    test(onLine[pos - 1], onLine[pos + 1]);   // 抜けたあと隣どうしになる 2 本
    onLine.splice(pos, 1);
  }
  if (ev < events.length) targetX = events[ev].x;
}

function draw() {
  background(260, 45, 10);
  let W = width - 360;
  // 掃引線を次のイベントまで動かす
  if (auto && !(stopAtFirst && found.length) && ev < events.length) {
    sweepX = min(sweepX + 4, targetX);
    if (sweepX >= targetX) { if (++waiting > 10) { waiting = 0; processEvent(); } }
  }
  // 線分
  segs.forEach((s, i) => {
    let active = onLine.includes(i);
    let bad = found.some((f) => f.i === i || f.j === i);
    stroke(s.hue, bad ? 90 : 55, active ? 100 : 55); strokeWeight(active ? 4 : 2);
    line(s.a.x, s.a.y, s.b.x, s.b.y);
    noStroke(); fill(s.hue, 55, 100); circle(s.a.x, s.a.y, 9); circle(s.b.x, s.b.y, 9);
    fill(0, 0, 90); textSize(13); textAlign(RIGHT, CENTER); text(i, s.a.x - 8, s.a.y);
  });
  // 比べた組（最近のものを点線で）
  for (let c of checks.slice(-3)) {
    let y1 = constrain(yAt(segs[c.i], sweepX), 0, height), y2 = constrain(yAt(segs[c.j], sweepX), 0, height);
    stroke(c.hit ? 350 : 45, 70, 100, 70); strokeWeight(2); drawingContext.setLineDash([4, 4]);
    line(sweepX + 12, y1, sweepX + 12, y2); drawingContext.setLineDash([]);
  }
  // 交点
  for (let f of found) {
    let p1 = segs[f.i].a, p2 = segs[f.i].b, p3 = segs[f.j].a, p4 = segs[f.j].b;
    let den = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
    if (abs(den) < 1e-9) continue;
    let t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / den;
    noFill(); stroke(45, 80, 100); strokeWeight(3);
    circle(p1.x + t * (p2.x - p1.x), p1.y + t * (p2.y - p1.y), 24 + sin(frameCount * 0.2) * 4);
  }
  // 掃引線
  stroke(300, 40, 100); strokeWeight(2); line(sweepX, 110, sweepX, height - 20);
  // イベント点（x 軸上）
  noStroke();
  events.forEach((e, k) => { fill(k < ev ? color(0, 0, 40) : color(300, 30, 100)); triangle(e.x, height - 12, e.x - 5, height - 2, e.x + 5, height - 2); });

  // パネル：掃引線の状態
  let px = width - 330;
  fill(260, 35, 18); rect(px, 20, 310, height - 40, 12);
  fill(0, 0, 95); textAlign(LEFT, TOP); textSize(17); text('掃引線の上の線分（上から順）', px + 18, 36);
  onLine.forEach((k, r) => {
    let y = 76 + r * 36;
    fill(segs[k].hue, 55, 90); rect(px + 18, y, 34, 28, 6);
    fill(0, 0, 10); textAlign(CENTER, CENTER); text(k, px + 35, y + 14);
    fill(0, 0, 80); textAlign(LEFT, CENTER); text(`y = ${round(yAt(segs[k], sweepX))}`, px + 64, y + 14);
  });
  textAlign(LEFT, TOP); fill(0, 0, 95);
  let by = height - 200;
  text(`イベント ${ev} / ${events.length}`, px + 18, by);
  text(`調べた組 ${checks.length} 回`, px + 18, by + 28);
  fill(0, 0, 60); text(`全部の組なら ${(N * (N - 1)) / 2} 回`, px + 18, by + 56);
  fill(found.length ? color(45, 80, 100) : color(0, 0, 95));
  text(found.length ? `交差あり！（${found.map((f) => f.i + '×' + f.j).join(', ')}）` : '交差はまだない', px + 18, by + 90, 280);
  fill(0, 0, 60); textSize(13); text(stopAtFirst ? 'S：最初の交差で止める（「交差があるか」だけ知りたいとき）' : 'S：最後まで掃引する', px + 18, by + 140);

  fill(0, 0, 95); textSize(22); textAlign(LEFT, TOP); text('掃引線  左から右へ、隣どうしだけを比べる', 30, 24);
  fill(0, 0, 60); textSize(14); text('端点をドラッグ   スペース 再生/停止   → 次のイベント   R ランダム   S 止め方   1〜3 お手本', 30, 56);
}

function mousePressed() {
  drag = null;
  for (let s of segs) for (let end of ['a', 'b']) if (dist(mouseX, mouseY, s[end].x, s[end].y) < 14) drag = s[end];
}
function mouseDragged() { if (drag) { drag.x = constrain(mouseX, 20, width - 360); drag.y = constrain(mouseY, 110, height - 20); restart(); } }
function mouseReleased() { drag = null; }

function keyPressed() {
  if (key === ' ') { auto = !auto; return false; }
  if (key === RIGHT_ARROW) { processEvent(); return false; }
  if (key === 'r' || key === 'R') preset(1);
  if (key === 's' || key === 'S') { stopAtFirst = !stopAtFirst; restart(); }
  if ('123'.includes(key)) preset(Number(key));
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); preset(1); }
