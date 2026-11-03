// ============================================
// 03 2 変数 LP の主問題と双対問題
// 主問題 (P)：max c·x  s.t. A x ≤ b, x ≥ 0　　双対問題 (D)：min b·y  s.t. Aᵀ y ≥ c, y ≥ 0
//   左に (P) の実行可能領域と目的関数の等高線、右に (D) の同じもの。最適値はぴったり一致する（強双対性）
//   制約の係数（b や A）を変えると両方の領域が同時に変わる
// ←→ = 係数を選ぶ / ↑↓ = 値を変える / 1〜3 = 例題 / R = リセット
// ============================================

let c = [3, 2];                           // ★ 目的関数の係数
let A = [[1, 1], [1, 3]];                 // ★ 制約の係数行列（2 本）
let b = [4, 6];                           // ★ 制約の右辺
let sel = 0;                              // いま選んでいる係数（0〜7）
let names = ['c1', 'c2', 'a11', 'a12', 'b1', 'a21', 'a22', 'b2'];
let RANGE = 8;                            // ★ 各パネルの表示範囲（0〜RANGE）

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  preset(1);
}
function preset(k) {
  if (k === 1) { c = [3, 2]; A = [[1, 1], [1, 3]]; b = [4, 6]; }
  if (k === 2) { c = [2, 5]; A = [[1, 2], [3, 1]]; b = [6, 7]; }
  if (k === 3) { c = [4, 1]; A = [[2, 1], [1, 4]]; b = [5, 8]; }
}
function getParam(i) { return [c[0], c[1], A[0][0], A[0][1], b[0], A[1][0], A[1][1], b[1]][i]; }
function setParam(i, v) {
  v = constrain(v, 0, 12);
  if (i === 0) c[0] = v; else if (i === 1) c[1] = v; else if (i === 2) A[0][0] = v; else if (i === 3) A[0][1] = v;
  else if (i === 4) b[0] = v; else if (i === 5) A[1][0] = v; else if (i === 6) A[1][1] = v; else b[1] = v;
}

function panels() {
  let w = (width - 60) / 2, h = height - 230, y = 100;
  return { L: { x: 20, y, w, h }, R: { x: 40 + w, y, w, h } };
}
function toScreen(P, x, y) { return { x: P.x + x / RANGE * P.w, y: P.y + P.h - y / RANGE * P.h }; }

// パネルに LP を描く：cons = 制約（a·x <= b / >=）、cc = 目的関数、opt = 最適解
function drawLP(P, cons, cc, res, hue, title, varNames) {
  noFill(); stroke(0, 0, 35); strokeWeight(1); rect(P.x, P.y, P.w, P.h);
  noStroke(); fill(0, 0, 70); textSize(14); text(title, P.x + 10, P.y + 22);
  // 実行可能領域：箱を半平面で切る
  let poly = [{ x: 0, y: 0 }, { x: RANGE, y: 0 }, { x: RANGE, y: RANGE }, { x: 0, y: RANGE }];
  for (let k of cons) poly = k.sense === '<=' ? clipHalf(poly, k.a[0], k.a[1], k.b) : clipHalf(poly, -k.a[0], -k.a[1], -k.b);
  if (poly.length >= 3) { noStroke(); fill(hue, 70, 100, 22); beginShape(); for (let p of poly) { let s = toScreen(P, p.x, p.y); vertex(s.x, s.y); } endShape(CLOSE); }
  // 制約の直線
  for (let k of cons) {
    stroke(hue, 60, 100, 80); strokeWeight(2);
    let pts2 = lineInBox(k.a, k.b); if (pts2) { let s1 = toScreen(P, pts2[0].x, pts2[0].y), s2 = toScreen(P, pts2[1].x, pts2[1].y); line(s1.x, s1.y, s2.x, s2.y); }
  }
  // 目的関数の等高線（点線）と最適の等高線
  if (res.feasible) {
    drawingContext.setLineDash([4, 6]); stroke(50, 60, 100, 50); strokeWeight(1);
    let vmax = Math.max(1e-6, cc[0] * RANGE + cc[1] * RANGE);
    for (let v = vmax / 6; v < vmax; v += vmax / 6) { let q = lineInBox(cc, v); if (q) { let s1 = toScreen(P, q[0].x, q[0].y), s2 = toScreen(P, q[1].x, q[1].y); line(s1.x, s1.y, s2.x, s2.y); } }
    drawingContext.setLineDash([]);
    stroke(50, 90, 100); strokeWeight(3);
    let q = lineInBox(cc, res.value); if (q) { let s1 = toScreen(P, q[0].x, q[0].y), s2 = toScreen(P, q[1].x, q[1].y); line(s1.x, s1.y, s2.x, s2.y); }
    let s = toScreen(P, res.x[0], res.x[1]);
    noStroke(); fill(50, 90, 100); circle(s.x, s.y, 16);
    fill(0, 0, 100); textSize(14); text(varNames + ' = (' + nf(res.x[0], 1, 2) + ', ' + nf(res.x[1], 1, 2) + ')　値 ' + nf(res.value, 1, 2), s.x + 12, s.y - 10);
  }
  for (let v = 0; v <= RANGE; v += 2) { let s = toScreen(P, v, 0); noStroke(); fill(0, 0, 50); textSize(11); text(v, s.x - 3, P.y + P.h + 14); let t = toScreen(P, 0, v); text(v, P.x - 16, t.y + 4); }
}
// 直線 a·x = v を箱 [0,RANGE]² で切った 2 端点
function lineInBox(a, v) {
  let out = [];
  if (Math.abs(a[1]) > 1e-9) for (let x of [0, RANGE]) { let y = (v - a[0] * x) / a[1]; if (y >= -1e-9 && y <= RANGE + 1e-9) out.push({ x, y }); }
  if (Math.abs(a[0]) > 1e-9) for (let y of [0, RANGE]) { let x = (v - a[1] * y) / a[0]; if (x > 1e-9 && x < RANGE - 1e-9) out.push({ x, y }); }
  return out.length >= 2 ? [out[0], out[out.length - 1]] : null;
}

function draw() {
  background(250, 40, 10);
  let { L, R } = panels();
  let consP = [{ a: A[0], b: b[0], sense: '<=' }, { a: A[1], b: b[1], sense: '<=' }];
  let consD = [{ a: [A[0][0], A[1][0]], b: c[0], sense: '>=' }, { a: [A[0][1], A[1][1]], b: c[1], sense: '>=' }];
  let rp = solveLP2(consP, c, true), rd = solveLP2(consD, b, false);
  drawLP(L, consP, c, rp, 10, '主問題 (P)：max ' + c[0] + 'x1 + ' + c[1] + 'x2　s.t. ' + A[0][0] + 'x1 + ' + A[0][1] + 'x2 ≤ ' + b[0] + ',  ' + A[1][0] + 'x1 + ' + A[1][1] + 'x2 ≤ ' + b[1] + ',  x ≥ 0', 'x');
  drawLP(R, consD, b, rd, 180, '双対問題 (D)：min ' + b[0] + 'y1 + ' + b[1] + 'y2　s.t. ' + A[0][0] + 'y1 + ' + A[1][0] + 'y2 ≥ ' + c[0] + ',  ' + A[0][1] + 'y1 + ' + A[1][1] + 'y2 ≥ ' + c[1] + ',  y ≥ 0', 'y');

  // 係数パネル
  let py = height - 95;
  noStroke(); fill(0, 0, 100, 8); rect(20, py - 30, width - 40, 85, 8);
  textSize(16);
  for (let i = 0; i < 8; i++) {
    let x = 40 + i * 120;
    fill(i === sel ? 50 : 0, i === sel ? 90 : 0, i === sel ? 100 : 70); text(names[i] + ' = ' + getParam(i), x, py);
  }
  fill(0, 0, 60); textSize(14); text('←→ で係数を選び、↑↓ で変える（b を増やすと (P) の領域が広がり (D) の目的関数が重くなる）', 40, py + 30);

  let msg;
  if (!rp.feasible) msg = '(P) に実行可能解がない → (D) は非有界（または実行不能）';
  else if (rp.unbounded) msg = '(P) が非有界 → (D) に実行可能解がない';
  else if (!rd.feasible) msg = '(D) に実行可能解がない';
  else msg = '最適値：(P) ' + nf(rp.value, 1, 2) + '　=　(D) ' + nf(rd.value, 1, 2) + (Math.abs(rp.value - rd.value) < 1e-4 ? '　✓ 強双対性（一致）' : '');
  fill(0, 0, 100); textSize(18);
  text(msg + '　　1〜3：例題　R：リセット', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('主問題の制約の本数 = 双対変数の数、主変数の数 = 双対の制約の本数。行列 A は転置され、c と b が入れ替わる。最大化 ↔ 最小化、≤ ↔ ≥', 20, 68);
}

function keyPressed() {
  if (key === RIGHT_ARROW) sel = (sel + 1) % 8;
  if (key === LEFT_ARROW) sel = (sel + 7) % 8;
  if (key === UP_ARROW) setParam(sel, getParam(sel) + 1);
  if (key === DOWN_ARROW) setParam(sel, getParam(sel) - 1);
  if (key >= '1' && key <= '3') preset(int(key));
  if (key === 'r' || key === 'R') preset(1);
}

// ---------- やってみよう ----------
// 1. b1 を 1 ずつ増やすと最適値はいくつずつ増える？ その増え方が双対の最適解 y1（影の価格）
// 2. c1 を大きくしていくと (P) の最適な頂点が移る。そのとき (D) の最適な頂点も移る？
// 3. a11 = a12 = 0 にして b1 = 0 にすると？ (P) の実行可能領域と (D) の非有界を観察
// 4. 例題 2 の最適解で、きつい制約（等号で成り立つ）と y の正負の関係を見よう（→ 05）


// ==================================================
// ここから下は「LP の道具」（2 変数の頂点列挙と半平面の切り取り。読まなくても OK）
// ==================================================

// cons = [{ a: [a1, a2], b, sense: '<=' | '>=' }]（x ≥ 0 は自動で追加）、maximize = true なら最大化
function solveLP2(cons, cc, maximize) {
  let BIG = 1e3;
  let all = cons.concat([{ a: [1, 0], b: 0, sense: '>=' }, { a: [0, 1], b: 0, sense: '>=' }]);
  let lines = all.map((k) => ({ a: k.a, b: k.b })).concat([{ a: [1, 0], b: BIG }, { a: [0, 1], b: BIG }]);
  let best = null;
  for (let i = 0; i < lines.length; i++) for (let j = i + 1; j < lines.length; j++) {
    let p = lines[i], q = lines[j], det = p.a[0] * q.a[1] - p.a[1] * q.a[0];
    if (Math.abs(det) < 1e-9) continue;
    let x = [(p.b * q.a[1] - q.b * p.a[1]) / det, (p.a[0] * q.b - q.a[0] * p.b) / det];
    let ok = all.every((k) => { let v = k.a[0] * x[0] + k.a[1] * x[1]; return k.sense === '<=' ? v <= k.b + 1e-7 : v >= k.b - 1e-7; }) && x[0] <= BIG + 1e-7 && x[1] <= BIG + 1e-7;
    if (!ok) continue;
    let val = cc[0] * x[0] + cc[1] * x[1];
    if (!best || (maximize ? val > best.value + 1e-9 : val < best.value - 1e-9)) best = { x, value: val };
  }
  if (!best) return { feasible: false };
  return { feasible: true, x: best.x, value: best.value, unbounded: best.x[0] > BIG - 1 || best.x[1] > BIG - 1 };
}
// 多角形を半平面 nx*x + ny*y <= c で切る（Sutherland–Hodgman）
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
