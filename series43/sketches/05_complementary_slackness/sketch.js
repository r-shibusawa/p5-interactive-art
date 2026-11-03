// ============================================
// 05 相補性条件と影の価格
// 最適解では「ゆるい制約（余りがある）の双対変数は 0」「きつい制約（等号）の双対変数は正」
//   y_i × (b_i − a_i·x*) = 0　　y_i = 制約 i の右辺 b_i を 1 増やしたときの最適値の増え方（影の価格）
//   3 本の制約（資源）をドラッグして平行移動すると、どの資源が「足りない」かが y で見える
// 制約の線をドラッグ = b_i を変える / 1〜2 = 例題 / R = リセット
// ============================================

let c = [3, 2];                                   // ★ 目的関数（利益）
let A = [[1, 1], [1, 3], [3, 1]];                 // ★ 3 本の制約（資源の使い方）
let b = [4, 6, 9];                                // ★ 資源の量（ドラッグで変わる）
let RANGE = 8;
let dragK = -1;
let labels = ['資源 1', '資源 2', '資源 3'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}
function preset(k) {
  if (k === 1) { c = [3, 2]; A = [[1, 1], [1, 3], [3, 1]]; b = [4, 6, 9]; }
  if (k === 2) { c = [1, 4]; A = [[2, 1], [1, 2], [1, 5]]; b = [8, 7, 12]; }
}
function panel() { return { x: 20, y: 100, w: width * 0.55, h: height - 150 }; }
function toScreen(P, px, py) { return { x: P.x + px / RANGE * P.w, y: P.y + P.h - py / RANGE * P.h }; }
function toMath(P, sx, sy) { return [(sx - P.x) / P.w * RANGE, (P.y + P.h - sy) / P.h * RANGE]; }
function lineInBox(a, v) {
  let out = [];
  if (Math.abs(a[1]) > 1e-9) for (let x of [0, RANGE]) { let y = (v - a[0] * x) / a[1]; if (y >= -1e-9 && y <= RANGE + 1e-9) out.push({ x, y }); }
  if (Math.abs(a[0]) > 1e-9) for (let y of [0, RANGE]) { let x = (v - a[1] * y) / a[0]; if (x > 1e-9 && x < RANGE - 1e-9) out.push({ x, y }); }
  return out.length >= 2 ? [out[0], out[out.length - 1]] : null;
}

function draw() {
  background(250, 40, 10);
  let P = panel();
  noFill(); stroke(0, 0, 35); strokeWeight(1); rect(P.x, P.y, P.w, P.h);
  let cons = A.map((row, i) => ({ a: row, b: b[i], sense: '<=' }));
  let rp = solveLP2(cons, c, true);
  let yd = solveDual3(A, b, c);                   // 双対変数 y（影の価格）
  // 影の価格を差分でも確かめる：b_i を 1 増やしたときの最適値の差
  let diffs = b.map((bi, i) => { let b2 = b.slice(); b2[i] += 1; let r2 = solveLP2(A.map((row, k) => ({ a: row, b: b2[k], sense: '<=' })), c, true); return r2.feasible && rp.feasible ? r2.value - rp.value : 0; });

  // 実行可能領域
  let poly = [{ x: 0, y: 0 }, { x: RANGE, y: 0 }, { x: RANGE, y: RANGE }, { x: 0, y: RANGE }];
  for (let k of cons) poly = clipHalf(poly, k.a[0], k.a[1], k.b);
  if (poly.length >= 3) { noStroke(); fill(10, 70, 100, 22); beginShape(); for (let p of poly) { let s = toScreen(P, p.x, p.y); vertex(s.x, s.y); } endShape(CLOSE); }
  // 制約の直線（ゆるい = 細い灰色、きつい = 太い）
  let slack = rp.feasible ? b.map((bi, i) => bi - (A[i][0] * rp.x[0] + A[i][1] * rp.x[1])) : b.map(() => 0);
  for (let i = 0; i < 3; i++) {
    let q = lineInBox(A[i], b[i]); if (!q) continue;
    let tight = slack[i] < 1e-6, hue = [10, 180, 300][i];
    stroke(hue, 70, 100, tight ? 100 : 45); strokeWeight(tight ? 5 : 2);
    if (i === dragK) strokeWeight(7);
    let s1 = toScreen(P, q[0].x, q[0].y), s2 = toScreen(P, q[1].x, q[1].y); line(s1.x, s1.y, s2.x, s2.y);
    noStroke(); fill(hue, 60, 100); textSize(13);
    text(labels[i] + '：' + A[i][0] + 'x1 + ' + A[i][1] + 'x2 ≤ ' + nf(b[i], 1, 1), (s1.x + s2.x) / 2 + 8, (s1.y + s2.y) / 2 - 8);
  }
  if (rp.feasible) {
    // 目的関数の等高線と最適解
    let q = lineInBox(c, rp.value);
    drawingContext.setLineDash([6, 6]); stroke(50, 90, 100); strokeWeight(2);
    if (q) { let s1 = toScreen(P, q[0].x, q[0].y), s2 = toScreen(P, q[1].x, q[1].y); line(s1.x, s1.y, s2.x, s2.y); }
    drawingContext.setLineDash([]);
    let s = toScreen(P, rp.x[0], rp.x[1]);
    noStroke(); fill(50, 90, 100); circle(s.x, s.y, 16);
    fill(0, 0, 100); textSize(14); text('x* = (' + nf(rp.x[0], 1, 2) + ', ' + nf(rp.x[1], 1, 2) + ')　利益 ' + nf(rp.value, 1, 2), s.x + 12, s.y - 10);
  }
  for (let v = 0; v <= RANGE; v += 2) { let s = toScreen(P, v, 0); noStroke(); fill(0, 0, 50); textSize(11); text(v, s.x - 3, P.y + P.h + 14); let t = toScreen(P, 0, v); text(v, P.x - 16, t.y + 4); }

  // 右：双対変数のバーと相補性のチェック
  let bx = P.x + P.w + 30, bw = width - bx - 30, by0 = 130;
  noStroke(); fill(0, 0, 100); textSize(16); text('双対変数 y（影の価格）と余り（スラック）', bx, by0 - 10);
  let ymax = Math.max(1, ...yd.map((v) => Math.abs(v)));
  for (let i = 0; i < 3; i++) {
    let yy = by0 + 30 + i * 150, hue = [10, 180, 300][i], tight = slack[i] < 1e-6;
    fill(hue, 60, 100); textSize(15); text(labels[i] + '　' + (tight ? 'きつい（等号）' : 'ゆるい（余り ' + nf(slack[i], 1, 2) + '）'), bx, yy);
    fill(0, 0, 25); rect(bx, yy + 10, bw, 24, 4);
    fill(hue, 80, 100); rect(bx, yy + 10, bw * constrain(yd[i] / ymax, 0, 1), 24, 4);
    fill(0, 0, 100); textSize(14); text('y' + (i + 1) + ' = ' + nf(yd[i], 1, 2), bx + 6, yy + 28);
    fill(0, 0, 70); textSize(13);
    text('y' + (i + 1) + ' × 余り = ' + nf(yd[i], 1, 2) + ' × ' + nf(slack[i], 1, 2) + ' = ' + nf(yd[i] * slack[i], 1, 2) + (Math.abs(yd[i] * slack[i]) < 1e-3 ? '　✓' : ''), bx, yy + 56);
    text('b' + (i + 1) + ' を +1 すると利益は +' + nf(diffs[i], 1, 2) + (Math.abs(diffs[i] - yd[i]) < 0.05 ? '　= y' + (i + 1) + ' ✓' : '　（頂点が移るので y とずれる）'), bx, yy + 78);
  }
  fill(0, 0, 70); textSize(14);
  text('双対の目的値 b·y = ' + nf(b[0] * yd[0] + b[1] * yd[1] + b[2] * yd[2], 1, 2) + (rp.feasible ? '　= 主の最適値 ' + nf(rp.value, 1, 2) : ''), bx, by0 + 30 + 3 * 150);

  noStroke(); fill(0, 0, 100); textSize(18);
  text('制約の線をドラッグして資源の量 b を変える　1〜2：例題　R：リセット', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('最適解が乗っている線（きつい制約）だけ価格 y が付く。余っている資源は増やしても利益が変わらない（価格 0）。y_i × 余り_i = 0 が相補性条件', 20, 68);
}

function mousePressed() {
  let P = panel(); let m = toMath(P, mouseX, mouseY);
  let best = 1e9;
  for (let i = 0; i < 3; i++) {
    let d = Math.abs(A[i][0] * m[0] + A[i][1] * m[1] - b[i]) / Math.hypot(A[i][0], A[i][1]);
    if (d < best && d < 0.35) { best = d; dragK = i; }
  }
}
function mouseDragged() {
  if (dragK < 0) return;
  let P = panel(); let m = toMath(P, mouseX, mouseY);
  b[dragK] = constrain(Math.round((A[dragK][0] * m[0] + A[dragK][1] * m[1]) * 2) / 2, 0.5, 30);
}
function mouseReleased() { dragK = -1; }
function keyPressed() {
  if (key >= '1' && key <= '2') preset(int(key));
  if (key === 'r' || key === 'R') preset(1);
}

// ---------- やってみよう ----------
// 1. 資源 3（紫）を遠くへ動かすと y3 = 0。近づけて最適解に触れた瞬間に y3 > 0 になる
// 2. 3 本すべてが最適点を通るように調整（退化）。y は一通りに決まる？ 差分とのずれを見よう
// 3. 価格の合計 b·y はいつも利益と同じ。資源の「価値」の総和 = 利益、という読み方
// 4. c を [1, 1] に変えると（コードの ★）、きつい制約の組み合わせはどう変わる？


// ==================================================
// ここから下は「LP の道具」（頂点列挙、3 変数の双対、半平面の切り取り。読まなくても OK）
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
  return { feasible: true, x: best.x, value: best.value };
}
// 双対 min b·y s.t. Aᵀy ≥ c, y ≥ 0（3 変数）：5 枚の平面から 3 枚ずつ選んで頂点を列挙
function solveDual3(AA, bb, cc) {
  let planes = [[AA[0][0], AA[1][0], AA[2][0], cc[0]], [AA[0][1], AA[1][1], AA[2][1], cc[1]], [1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0]];
  let best = null;
  for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) for (let k = j + 1; k < 5; k++) {
    let y = solve3(planes[i], planes[j], planes[k]); if (!y) continue;
    let ok = y.every((v) => v >= -1e-7) && [0, 1].every((t) => planes[t][0] * y[0] + planes[t][1] * y[1] + planes[t][2] * y[2] >= planes[t][3] - 1e-7);
    if (!ok) continue;
    let val = bb[0] * y[0] + bb[1] * y[1] + bb[2] * y[2];
    if (!best || val < best.val - 1e-9) best = { y, val };
  }
  return best ? best.y.map((v) => Math.max(0, v)) : [0, 0, 0];
}
// 3 元連立 1 次方程式（クラメルの公式）。各行 [a, b, c, d] は a y1 + b y2 + c y3 = d
function solve3(r1, r2, r3) {
  let det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  let M = [r1, r2, r3], D = det(M);
  if (Math.abs(D) < 1e-9) return null;
  return [0, 1, 2].map((col) => det(M.map((r) => r.map((v, ci) => (ci === col ? r[3] : v)))) / D);
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
