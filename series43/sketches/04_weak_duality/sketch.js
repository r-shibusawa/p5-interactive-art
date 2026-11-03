// ============================================
// 04 弱双対性
// (P) の実行可能な x と (D) の実行可能な y をどう選んでも、必ず  c·x ≤ b·y
//   証明は 1 行：c·x ≤ (Aᵀy)·x = y·(Ax) ≤ y·b　（x ≥ 0, Aᵀy ≥ c, y ≥ 0, Ax ≤ b を使う）
//   ギャップ b·y − c·x が 0 になる組を見つけたら、それが両方の最適解
// マウス = x（左の領域の中） / ←→ ↑↓ = y / O = y を最適解へ / 1〜3 = 例題
// ============================================

let c = [3, 2], A = [[1, 1], [1, 3]], b = [4, 6];   // ★ LP の係数（03 と同じ）
let x = [1, 1], y = [1, 1];
let RANGE = 8;
let ySpeed = 0.03;                                   // ★ 矢印キーで y が動く速さ
let bestGap = Infinity;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}
function preset(k) {
  if (k === 1) { c = [3, 2]; A = [[1, 1], [1, 3]]; b = [4, 6]; }
  if (k === 2) { c = [2, 5]; A = [[1, 2], [3, 1]]; b = [6, 7]; }
  if (k === 3) { c = [4, 1]; A = [[2, 1], [1, 4]]; b = [5, 8]; }
  bestGap = Infinity; y = [1, 1];
}
function panels() {
  let w = (width - 60) / 2, h = height - 300, yy = 100;
  return { L: { x: 20, y: yy, w, h }, R: { x: 40 + w, y: yy, w, h } };
}
function toScreen(P, px, py) { return { x: P.x + px / RANGE * P.w, y: P.y + P.h - py / RANGE * P.h }; }
function toMath(P, sx, sy) { return [(sx - P.x) / P.w * RANGE, (P.y + P.h - sy) / P.h * RANGE]; }

function feasibleP(v) { return v[0] >= -1e-9 && v[1] >= -1e-9 && A.every((row, i) => row[0] * v[0] + row[1] * v[1] <= b[i] + 1e-9); }
function feasibleD(v) { return v[0] >= -1e-9 && v[1] >= -1e-9 && [0, 1].every((j) => A[0][j] * v[0] + A[1][j] * v[1] >= c[j] - 1e-9); }

function drawRegion(P, cons, hue, title, pt, ok, name) {
  noFill(); stroke(0, 0, 35); strokeWeight(1); rect(P.x, P.y, P.w, P.h);
  noStroke(); fill(0, 0, 70); textSize(14); text(title, P.x + 10, P.y + 22);
  let poly = [{ x: 0, y: 0 }, { x: RANGE, y: 0 }, { x: RANGE, y: RANGE }, { x: 0, y: RANGE }];
  for (let k of cons) poly = k.sense === '<=' ? clipHalf(poly, k.a[0], k.a[1], k.b) : clipHalf(poly, -k.a[0], -k.a[1], -k.b);
  if (poly.length >= 3) {
    noStroke(); fill(hue, 70, 100, 22); beginShape(); for (let p of poly) { let s = toScreen(P, p.x, p.y); vertex(s.x, s.y); } endShape(CLOSE);
    stroke(hue, 60, 100, 80); strokeWeight(2); noFill(); beginShape(); for (let p of poly) { let s = toScreen(P, p.x, p.y); vertex(s.x, s.y); } endShape(CLOSE);
  }
  let s = toScreen(P, constrain(pt[0], 0, RANGE), constrain(pt[1], 0, RANGE));
  stroke(ok ? hue : 0, 90, 100); strokeWeight(3); noFill(); circle(s.x, s.y, 18);
  if (ok) { noStroke(); fill(hue, 90, 100); circle(s.x, s.y, 10); }
  noStroke(); fill(0, 0, 100); textSize(14);
  text(name + ' = (' + nf(pt[0], 1, 2) + ', ' + nf(pt[1], 1, 2) + ')' + (ok ? '' : '  ✗ 実行可能でない'), s.x + 14, s.y - 10);
}

function draw() {
  background(250, 40, 10);
  let { L, R } = panels();
  if (keyIsDown(LEFT_ARROW)) y[0] -= ySpeed; if (keyIsDown(RIGHT_ARROW)) y[0] += ySpeed;
  if (keyIsDown(DOWN_ARROW)) y[1] -= ySpeed; if (keyIsDown(UP_ARROW)) y[1] += ySpeed;
  y[0] = constrain(y[0], 0, RANGE); y[1] = constrain(y[1], 0, RANGE);
  if (mouseX > L.x && mouseX < L.x + L.w && mouseY > L.y && mouseY < L.y + L.h) x = toMath(L, mouseX, mouseY);

  let consP = [{ a: A[0], b: b[0], sense: '<=' }, { a: A[1], b: b[1], sense: '<=' }];
  let consD = [{ a: [A[0][0], A[1][0]], b: c[0], sense: '>=' }, { a: [A[0][1], A[1][1]], b: c[1], sense: '>=' }];
  let okP = feasibleP(x), okD = feasibleD(y);
  drawRegion(L, consP, 10, '(P) 実行可能領域：A x ≤ b, x ≥ 0　マウスで x を選ぶ', x, okP, 'x');
  drawRegion(R, consD, 180, '(D) 実行可能領域：Aᵀ y ≥ c, y ≥ 0　矢印キーで y を動かす', y, okD, 'y');

  // 3 つの値：c·x ≤ y·(Ax) ≤ b·y
  let Ax = [A[0][0] * x[0] + A[0][1] * x[1], A[1][0] * x[0] + A[1][1] * x[1]];
  let cx = c[0] * x[0] + c[1] * x[1], mid = y[0] * Ax[0] + y[1] * Ax[1], by = b[0] * y[0] + b[1] * y[1];
  let opt = solveLP2(consP, c, true);
  let gap = by - cx;
  if (okP && okD) bestGap = Math.min(bestGap, gap);

  // 数直線
  let ny = height - 110, nx0 = 60, nx1 = width - 60, vmax = Math.max(10, opt.feasible ? opt.value * 2.2 : 20);
  let X = (v) => nx0 + constrain(v, 0, vmax) / vmax * (nx1 - nx0);
  stroke(0, 0, 50); strokeWeight(2); line(nx0, ny, nx1, ny);
  for (let v = 0; v <= vmax; v += 2) { stroke(0, 0, 40); line(X(v), ny - 5, X(v), ny + 5); noStroke(); fill(0, 0, 50); textSize(11); text(v, X(v) - 4, ny + 20); }
  if (opt.feasible) { stroke(50, 90, 100); strokeWeight(2); line(X(opt.value), ny - 26, X(opt.value), ny + 8); noStroke(); fill(50, 90, 100); textSize(13); text('最適値 ' + nf(opt.value, 1, 2), X(opt.value) - 30, ny - 32); }
  if (okP && okD) { noStroke(); fill(gap < 0.2 ? 120 : 300, 70, 100, 30); rect(X(cx), ny - 14, X(by) - X(cx), 28); }
  noStroke(); fill(okP ? 10 : 0, okP ? 90 : 0, okP ? 100 : 50); circle(X(cx), ny, 18); textSize(13); text('c·x = ' + nf(cx, 1, 2), X(cx) - 30, ny + 40);
  fill(okD ? 180 : 0, okD ? 90 : 0, okD ? 100 : 50); circle(X(by), ny, 18); text('b·y = ' + nf(by, 1, 2), X(by) - 30, ny + 58);
  fill(0, 0, 70); circle(X(mid), ny, 8); text('y·Ax = ' + nf(mid, 1, 2), X(mid) - 30, ny - 50);

  noStroke(); fill(0, 0, 100); textSize(18);
  let msg = okP && okD ? (gap < 0.2 ? '🎉 ギャップ ' + nf(gap, 1, 2) + '：どちらも最適！' : 'ギャップ b·y − c·x = ' + nf(gap, 1, 2) + '（これまでの最小 ' + nf(bestGap, 1, 2) + '）') : '実行可能な点どうしで比べよう（赤丸は領域の外）';
  text(msg + '　　O：y を最適へ　1〜3：例題', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('c·x ≤ (Aᵀy)·x = y·(Ax) ≤ y·b。左の不等号は Aᵀy ≥ c と x ≥ 0、右は Ax ≤ b と y ≥ 0。だから主の値はいつも双対の値を超えない', 20, 68);
}

function keyPressed() {
  if (key >= '1' && key <= '3') preset(int(key));
  if (key === 'o' || key === 'O') {
    let consD = [{ a: [A[0][0], A[1][0]], b: c[0], sense: '>=' }, { a: [A[0][1], A[1][1]], b: c[1], sense: '>=' }];
    let r = solveLP2(consD, b, false); if (r.feasible) y = r.x.slice();
  }
}

// ---------- やってみよう ----------
// 1. x を領域の頂点に置き、y を矢印で動かしてギャップを 0 にする。ギャップ 0 の y は 1 つだけ？
// 2. わざと x を領域の外に出すと c·x が b·y を超えることがある。弱双対性は「実行可能」が前提
// 3. 真ん中の y·Ax は必ず 2 つの値の間にある。等号になるのはどんなとき？（→ 05 相補性）
// 4. 例題 2 と 3 でも試す。最適値に届かない y はどの制約がゆるい？


// ==================================================
// ここから下は「LP の道具」（2 変数の頂点列挙と半平面の切り取り。読まなくても OK）
// ==================================================
function solveLP2(cons, cc, maximize) {
  let BIG = 1e3;
  let all = cons.concat([{ a: [1, 0], b: 0, sense: '>=' }, { a: [0, 1], b: 0, sense: '>=' }]);
  let lines = all.map((k) => ({ a: k.a, b: k.b })).concat([{ a: [1, 0], b: BIG }, { a: [0, 1], b: BIG }]);
  let best = null;
  for (let i = 0; i < lines.length; i++) for (let j = i + 1; j < lines.length; j++) {
    let p = lines[i], q = lines[j], det = p.a[0] * q.a[1] - p.a[1] * q.a[0];
    if (Math.abs(det) < 1e-9) continue;
    let v = [(p.b * q.a[1] - q.b * p.a[1]) / det, (p.a[0] * q.b - q.a[0] * p.b) / det];
    let ok = all.every((k) => { let s = k.a[0] * v[0] + k.a[1] * v[1]; return k.sense === '<=' ? s <= k.b + 1e-7 : s >= k.b - 1e-7; }) && v[0] <= BIG + 1e-7 && v[1] <= BIG + 1e-7;
    if (!ok) continue;
    let val = cc[0] * v[0] + cc[1] * v[1];
    if (!best || (maximize ? val > best.value + 1e-9 : val < best.value - 1e-9)) best = { x: v, value: val };
  }
  if (!best) return { feasible: false };
  return { feasible: true, x: best.x, value: best.value, unbounded: best.x[0] > BIG - 1 || best.x[1] > BIG - 1 };
}
function clipHalf(poly, nx, ny, cv) {
  let out = [];
  for (let i = 0; i < poly.length; i++) {
    let a = poly[i], bb = poly[(i + 1) % poly.length];
    let fa = nx * a.x + ny * a.y - cv, fb = nx * bb.x + ny * bb.y - cv;
    if (fa <= 0) out.push(a);
    if ((fa < 0 && fb > 0) || (fa > 0 && fb < 0)) { let t = fa / (fa - fb); out.push({ x: a.x + (bb.x - a.x) * t, y: a.y + (bb.y - a.y) * t }); }
  }
  return out;
}
