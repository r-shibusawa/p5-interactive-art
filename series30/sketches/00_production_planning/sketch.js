// ============================================
// 00 意思決定をモデルにする ─ 生産計画
// 工房で椅子を x 脚、テーブルを y 台つくる。木材・作業時間・塗装ラインには上限がある。利益がいちばん大きい計画は？
//   OR（オペレーションズ・リサーチ）の第一歩は「決めること（変数）」「目的（利益）」「制約（資源）」に分けて式にすること
// ドラッグ = 生産計画（点）を動かす / P = 最適解を見せる / ←→ = 椅子の利益 / ↑↓ = テーブルの利益 / I = 整数だけ / R = 元に戻す
// ============================================

let profitA = 30, profitB = 40;       // ★ 1 個あたりの利益（千円）：椅子・テーブル
let res = [                            // ★ 資源の制約：a·x + b·y ≤ cap
  { name: '木材', a: 2, b: 3, cap: 120, unit: 'kg', hue: 30 },
  { name: '作業時間', a: 2, b: 1, cap: 80, unit: '時間', hue: 200 },
  { name: '塗装ライン', a: 0, b: 1, cap: 35, unit: '台', hue: 300 },
];
let planX = 10, planY = 10;            // 今の生産計画（椅子 x、テーブル y）
let showOpt = false, intOnly = false;
let X_MAX = 70, Y_MAX = 50;            // グラフの範囲
let pl, pt, pw, ph;                    // グラフの位置と大きさ

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  layout();
}
function layout() {
  pl = 80; pt = 110;
  pw = min(width * 0.55, (height - 190) * X_MAX / Y_MAX);
  ph = pw * Y_MAX / X_MAX;
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); layout(); }
function sx(x) { return pl + x / X_MAX * pw; }
function sy(y) { return pt + ph - y / Y_MAX * ph; }

// 制約をすべて満たすか（x ≥ 0, y ≥ 0 も）
function isFeasible(x, y) {
  if (x < -1e-9 || y < -1e-9) return false;
  for (let r of res) if (r.a * x + r.b * y > r.cap + 1e-7) return false;
  return true;
}

function draw() {
  background(225, 30, 12);
  let cons = res.map(r => [r.a, r.b, r.cap]).concat([[-1, 0, 0], [0, -1, 0]]);
  let poly = feasibleVertices(cons);

  // 目盛り
  stroke(0, 0, 100, 10); strokeWeight(1);
  for (let x = 0; x <= X_MAX; x += 10) line(sx(x), pt, sx(x), pt + ph);
  for (let y = 0; y <= Y_MAX; y += 10) line(pl, sy(y), pl + pw, sy(y));
  noStroke(); fill(0, 0, 60); textSize(12); textAlign(CENTER, TOP);
  for (let x = 0; x <= X_MAX; x += 10) text(x, sx(x), pt + ph + 6);
  textAlign(RIGHT, CENTER);
  for (let y = 0; y <= Y_MAX; y += 10) text(y, pl - 8, sy(y));
  textAlign(LEFT, BASELINE);
  fill(0, 0, 80); textSize(14);
  text('椅子 x（脚）→', pl + pw - 90, pt + ph + 36);
  text('↑ テーブル y（台）', pl - 60, pt - 12);

  // 実行可能領域（すべての制約を満たす多角形）
  fill(120, 60, 70, 22); noStroke();
  beginShape(); for (let v of poly) vertex(sx(v[0]), sy(v[1])); endShape(CLOSE);
  if (intOnly) {
    for (let x = 0; x <= X_MAX; x += 2) for (let y = 0; y <= Y_MAX; y += 2) {
      fill(0, 0, 100, isFeasible(x, y) ? 40 : 8); circle(sx(x), sy(y), 3);
    }
  }

  // 制約の境界線
  for (let r of res) {
    let seg = clipLine(r.a, r.b, r.cap);
    if (!seg) continue;
    stroke(r.hue, 70, 100); strokeWeight(2);
    line(sx(seg[0][0]), sy(seg[0][1]), sx(seg[1][0]), sy(seg[1][1]));
    noStroke(); fill(r.hue, 60, 100); textSize(13);
    text(r.name + '：' + r.a + 'x + ' + r.b + 'y ≤ ' + r.cap, sx(seg[1][0]) + 6, sy(seg[1][1]) + (r.b === 0 ? 0 : 14));
  }

  // 今の計画を通る「等利益線」（この線上はどこでも利益が同じ）
  let z = profitA * planX + profitB * planY;
  dashed(z, color(50, 80, 100, 70));

  // 最適解：多角形の頂点のどれか
  let best = null;
  for (let v of poly) { let zz = profitA * v[0] + profitB * v[1]; if (!best || zz > best.z + 1e-9) best = { x: v[0], y: v[1], z: zz }; }
  if (showOpt && best) {
    dashed(best.z, color(50, 90, 100));
    noStroke(); fill(50, 90, 100); circle(sx(best.x), sy(best.y), 18);
    fill(0, 0, 100); textSize(15);
    text('最適 (' + nf(best.x, 1, 1) + ', ' + nf(best.y, 1, 1) + ') 利益 ' + nf(best.z, 1, 0), sx(best.x) + 14, sy(best.y) - 12);
    // 目的関数の向き（矢印）
    stroke(50, 90, 100); strokeWeight(2);
    let len = 50, n = sqrt(profitA * profitA + profitB * profitB);
    let ax = sx(best.x), ay = sy(best.y);
    line(ax, ay, ax + profitA / n * len, ay - profitB / n * len);
  }
  for (let v of poly) { noStroke(); fill(0, 0, 100, 70); circle(sx(v[0]), sy(v[1]), 7); }

  // 今の計画（点）
  let ok = isFeasible(planX, planY);
  noStroke(); fill(ok ? color(140, 80, 100) : color(0, 80, 100)); circle(sx(planX), sy(planY), 20);
  fill(0, 0, 10); textAlign(CENTER, CENTER); textSize(11); text(ok ? '✓' : '✗', sx(planX), sy(planY));
  textAlign(LEFT, BASELINE);

  // 右側：資源の使用量
  let rx = pl + pw + 60, ry = pt + 10, bw = width - rx - 40;
  fill(0, 0, 100); textSize(22);
  text('椅子 ' + nf(planX, 1, intOnly ? 0 : 1) + ' 脚 ＋ テーブル ' + nf(planY, 1, intOnly ? 0 : 1) + ' 台', rx, ry);
  fill(ok ? color(140, 70, 100) : color(0, 70, 100)); textSize(30);
  text('利益 ' + nf(z, 1, 0) + ' 千円' + (ok ? '' : '（実行不可能）'), rx, ry + 44);
  textSize(15);
  for (let i = 0; i < res.length; i++) {
    let r = res[i], used = r.a * planX + r.b * planY, y = ry + 90 + i * 70;
    fill(0, 0, 85); text(r.name + '　' + nf(used, 1, 1) + ' / ' + r.cap + ' ' + r.unit + '　余り ' + nf(r.cap - used, 1, 1), rx, y);
    fill(0, 0, 25); rect(rx, y + 10, bw, 18, 4);
    fill(used > r.cap + 1e-7 ? color(0, 80, 100) : color(r.hue, 60, 90));
    rect(rx, y + 10, bw * min(1.3, used / r.cap) / 1.3, 18, 4);
    stroke(0, 0, 100); strokeWeight(2); line(rx + bw / 1.3, y + 6, rx + bw / 1.3, y + 32); noStroke();
  }
  fill(0, 0, 70); textSize(14);
  let ty = ry + 320;
  text('モデル（線形計画法 LP）', rx, ty);
  fill(0, 0, 90); textSize(15);
  text('最大化　' + profitA + 'x + ' + profitB + 'y', rx, ty + 26);
  for (let i = 0; i < res.length; i++) text('制約　' + res[i].a + 'x + ' + res[i].b + 'y ≤ ' + res[i].cap + '（' + res[i].name + '）', rx, ty + 50 + i * 22);
  text('　　　x ≥ 0,  y ≥ 0', rx, ty + 50 + res.length * 22);
  if (best) { fill(0, 0, 60); text('今の利益は最適の ' + nf(100 * z / best.z, 1, 1) + '%', rx, ty + 80 + res.length * 22); }

  fill(0, 0, 100); textSize(18);
  text('ドラッグ：計画を動かす　P：最適解 ' + (showOpt ? 'ON' : 'off') + '　←→ 椅子の利益 ' + profitA + '　↑↓ テーブルの利益 ' + profitB + '　I：整数だけ ' + (intOnly ? 'ON' : 'off') + '　R：元に戻す', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('緑の多角形 = 作れる計画（実行可能領域）。黄色の点線 = 同じ利益の線。点線を右上へ平行移動して、最後に触れる角が最適解', 20, 68);
}

function mousePressed() { movePlan(); }
function mouseDragged() { movePlan(); }
function movePlan() {
  if (mouseX < pl - 20 || mouseX > pl + pw + 20 || mouseY < pt - 20 || mouseY > pt + ph + 20) return;
  planX = constrain((mouseX - pl) / pw * X_MAX, 0, X_MAX);
  planY = constrain((pt + ph - mouseY) / ph * Y_MAX, 0, Y_MAX);
  if (intOnly) { planX = round(planX); planY = round(planY); }
}

function keyPressed() {
  if (key === 'p' || key === 'P') showOpt = !showOpt;
  if (key === 'i' || key === 'I') { intOnly = !intOnly; if (intOnly) { planX = round(planX); planY = round(planY); } }
  if (key === RIGHT_ARROW) profitA = min(100, profitA + 5);
  if (key === LEFT_ARROW) profitA = max(5, profitA - 5);
  if (key === UP_ARROW) profitB = min(100, profitB + 5);
  if (key === DOWN_ARROW) profitB = max(5, profitB - 5);
  if (key === 'r' || key === 'R') { profitA = 30; profitB = 40; planX = 10; planY = 10; showOpt = false; }
}

// ---------- やってみよう ----------
// 1. まず P を押さずに、ドラッグだけで利益が最大の計画を探そう。最適解（P）とどれくらい違った？
// 2. ←→ で椅子の利益を上げていくと、最適な角が別の角へジャンプする。いくつで変わる？
// 3. 4 つ目の制約（例：「椅子は 25 脚まで」→ { a: 1, b: 0, cap: 25 }）を res に足してみよう
// 4. I で整数だけにすると、最適な角が整数でないとき何が起こる？（→ 02 整数計画）


// ==================================================
// ここから下は「線形計画を描くための道具」
// ==================================================
// 制約 [a, b, c]（a·x + b·y ≤ c）の境界線どうしの交点のうち、全部の制約を満たすもの = 多角形の頂点
function feasibleVertices(cons) {
  let pts = [];
  for (let i = 0; i < cons.length; i++) for (let j = i + 1; j < cons.length; j++) {
    let [a1, b1, c1] = cons[i], [a2, b2, c2] = cons[j];
    let det = a1 * b2 - a2 * b1;
    if (Math.abs(det) < 1e-9) continue;
    let x = (c1 * b2 - c2 * b1) / det, y = (a1 * c2 - a2 * c1) / det;
    if (cons.every(c => c[0] * x + c[1] * y <= c[2] + 1e-7) && !pts.some(p => Math.abs(p[0] - x) + Math.abs(p[1] - y) < 1e-6)) pts.push([x, y]);
  }
  let cx = 0, cy = 0;
  for (let p of pts) { cx += p[0] / pts.length; cy += p[1] / pts.length; }
  pts.sort((p, q) => Math.atan2(p[1] - cy, p[0] - cx) - Math.atan2(q[1] - cy, q[0] - cx));
  return pts;
}
// 直線 a·x + b·y = c のうち、グラフの枠の中に入る部分
function clipLine(a, b, c) {
  let pts = [];
  if (Math.abs(b) > 1e-9) { for (let x of [0, X_MAX]) { let y = (c - a * x) / b; if (y >= 0 && y <= Y_MAX) pts.push([x, y]); } }
  if (Math.abs(a) > 1e-9) { for (let y of [0, Y_MAX]) { let x = (c - b * y) / a; if (x >= 0 && x <= X_MAX) pts.push([x, y]); } }
  if (pts.length < 2) return null;
  pts.sort((p, q) => p[0] - q[0] || q[1] - p[1]);
  return [pts[0], pts[pts.length - 1]];
}
// 利益が z になる直線（等利益線）を点線で描く
function dashed(z, col) {
  let seg = clipLine(profitA, profitB, z);
  if (!seg) return;
  stroke(col); strokeWeight(2);
  drawingContext.setLineDash([8, 6]);
  line(sx(seg[0][0]), sy(seg[0][1]), sx(seg[1][0]), sy(seg[1][1]));
  drawingContext.setLineDash([]);
}
