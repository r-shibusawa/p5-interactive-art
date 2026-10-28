// ============================================
// 01 1 回折りでできること（藤田・羽鳥の公理）
// 「点や線を、別の点や線に重ねる」1 回の折りでつくれる折り線は 7 種類しかない（O1〜O7）
//   O6 は 3 次方程式を解くのと同じで、定規とコンパスにはできない作図ができる（02・03 で使う）
// 1〜7 = 公理を選ぶ / ドラッグ = 点 P1・P2 と直線の端（□）を動かす / P = 放物線を表示（O5・O6）
// ============================================

let axiom = 1;
let showParabola = true;
let H = {};                 // つかめる点（P1, P2 と、直線 L1・L2 を決める 2 点ずつ）
let dragKey = null;
let px0, py0, PS;           // 紙の位置と大きさ
let gridN = 1500;           // ★ O6 で答えを探すときの細かさ

const INFO = {
  1: ['O1', '2 点 P1・P2 を通る折り線', 'ただ 1 本。定規で線を引くのと同じ'],
  2: ['O2', '点 P1 を点 P2 に重ねる折り線', 'P1 と P2 の垂直二等分線。ただ 1 本'],
  3: ['O3', '直線 L1 を直線 L2 に重ねる折り線', '角の二等分線。交わるなら 2 本、平行なら 1 本'],
  4: ['O4', '点 P1 を通り、直線 L1 に垂直な折り線', 'L1 を自分自身に重ねる。ただ 1 本'],
  5: ['O5', '点 P2 を通り、点 P1 を直線 L1 に乗せる折り線', '中心 P2・半径 |P1P2| の円と L1 の交点 → 0〜2 本（2 次方程式）'],
  6: ['O6', '点 P1 を L1 に、点 P2 を L2 に同時に乗せる折り線', '2 つの放物線の共通接線 → 0〜3 本（3 次方程式！）'],
  7: ['O7', '点 P1 を L1 に乗せ、直線 L2 に垂直な折り線', '0〜1 本'],
};
const USES = { 1: ['P1', 'P2'], 2: ['P1', 'P2'], 3: ['A1', 'B1', 'A2', 'B2'], 4: ['P1', 'A1', 'B1'], 5: ['P1', 'P2', 'A1', 'B1'], 6: ['P1', 'P2', 'A1', 'B1', 'A2', 'B2'], 7: ['P1', 'A1', 'B1', 'A2', 'B2'] };

function setup() {
  createCanvas(windowWidth, windowHeight);
  layout();
}
function layout() {
  PS = min(width * 0.62, height - 160);
  px0 = width * 0.36 - PS / 2; py0 = 110;
  let at = (u, v) => ({ x: px0 + u * PS, y: py0 + v * PS });
  H = { P1: at(0.3, 0.25), P2: at(0.62, 0.55), A1: at(0.05, 0.85), B1: at(0.95, 0.8), A2: at(0.15, 0.1), B2: at(0.4, 0.95) };
}

// ★ 公理ごとの折り線を計算する。返り値 { lines: [折り線], images: [[P, P の行き先]], circle }
function solve() {
  let P1 = H.P1, P2 = H.P2, L1 = lineOf(H.A1, H.B1), L2 = lineOf(H.A2, H.B2);
  let r = { lines: [], images: [] };
  if (axiom === 1) r.lines.push(lineOf(P1, P2));
  if (axiom === 2) { r.lines.push(bisector(P1, P2)); r.images.push([P1, P2]); }
  if (axiom === 3) {
    let X = intersect(L1, L2);
    if (X) {
      r.lines.push({ p: X, u: nrm(L1.u.x + L2.u.x, L1.u.y + L2.u.y) });
      r.lines.push({ p: X, u: nrm(L1.u.x - L2.u.x, L1.u.y - L2.u.y) });
    } else r.lines.push({ p: { x: (L1.p.x + L2.p.x) / 2, y: (L1.p.y + L2.p.y) / 2 }, u: L1.u });
  }
  if (axiom === 4) r.lines.push({ p: P1, u: { x: -L1.u.y, y: L1.u.x } });
  if (axiom === 5) {
    let rad = dist(P1.x, P1.y, P2.x, P2.y);
    r.circle = { c: P2, r: rad };
    let t0 = (P2.x - L1.p.x) * L1.u.x + (P2.y - L1.p.y) * L1.u.y;     // P2 から L1 へ下ろした足
    let d = sdist(P2, L1);
    if (rad * rad >= d * d) {
      let h = sqrt(rad * rad - d * d);
      for (let s of h < 1e-6 ? [0] : [-h, h]) {
        let X = { x: L1.p.x + L1.u.x * (t0 + s), y: L1.p.y + L1.u.y * (t0 + s) };
        r.lines.push(bisector(P1, X)); r.images.push([P1, X]);
      }
    }
  }
  if (axiom === 6) {
    // L1 の上の点 X(t) に P1 を乗せる折り線のうち、P2 の行き先が L2 に乗るものを探す（符号が変わる所を二分法）
    let f = (t) => { let X = onLine(L1, t); return dist(X.x, X.y, P1.x, P1.y) < 1e-6 ? NaN : sdist(refl(P2, bisector(P1, X)), L2); };
    let lo = -3000, hi = 3000, pt = lo, pf = f(lo);
    for (let i = 1; i <= gridN; i++) {
      let t = lo + (hi - lo) * i / gridN, v = f(t);
      if (isFinite(v) && isFinite(pf) && pf * v <= 0 && Math.abs(pf - v) < 2000) {
        let a = pt, b = t, fa = pf;
        for (let k = 0; k < 40; k++) { let m = (a + b) / 2, fm = f(m); if (fa * fm <= 0) b = m; else { a = m; fa = fm; } }
        let X = onLine(L1, (a + b) / 2), cr = bisector(P1, X);
        r.lines.push(cr); r.images.push([P1, X], [P2, refl(P2, cr)]);
      }
      pt = t; pf = v;
    }
  }
  if (axiom === 7) {
    let n1 = { x: -L1.u.y, y: L1.u.x };
    let den = L2.u.x * n1.x + L2.u.y * n1.y;
    if (Math.abs(den) > 1e-6) {
      let s = -((P1.x - L1.p.x) * n1.x + (P1.y - L1.p.y) * n1.y) / den;
      let X = { x: P1.x + L2.u.x * s, y: P1.y + L2.u.y * s };
      if (s * s > 1e-6) { r.lines.push(bisector(P1, X)); r.images.push([P1, X]); }
    }
  }
  return r;
}

function draw() {
  background(34, 32, 40);
  noStroke(); fill(246, 240, 226); rect(px0, py0, PS, PS);
  let sol = solve();
  let use = USES[axiom];

  // 放物線（焦点 P・準線 L の点の集まり）：P を L に乗せる折り線は、この放物線の接線
  if (showParabola && (axiom === 5 || axiom === 6)) {
    drawParabola(H.P1, lineOf(H.A1, H.B1), color(230, 120, 90, 120));
    if (axiom === 6) drawParabola(H.P2, lineOf(H.A2, H.B2), color(80, 140, 230, 120));
  }
  if (sol.circle) { noFill(); stroke(120, 120, 120, 150); strokeWeight(1); circle(sol.circle.c.x, sol.circle.c.y, sol.circle.r * 2); }

  // 与えられた直線
  if (use.includes('A1')) { stroke(200, 70, 50); strokeWeight(3); infLine(lineOf(H.A1, H.B1)); }
  if (use.includes('A2')) { stroke(50, 100, 200); strokeWeight(3); infLine(lineOf(H.A2, H.B2)); }

  // 折り線（紙の中だけ太く）
  let cols = [[255, 190, 40], [80, 210, 140], [200, 110, 255]];
  sol.lines.forEach((L, i) => {
    let c = cols[i % 3];
    stroke(c[0], c[1], c[2], 90); strokeWeight(1.5); infLine(L);
    let seg = clipToPaper(L);
    if (seg) { stroke(c[0], c[1], c[2]); strokeWeight(5); line(seg[0].x, seg[0].y, seg[1].x, seg[1].y); }
  });
  // 点の行き先（折ると P → X）
  for (let [a, b] of sol.images) {
    stroke(60, 60, 60, 160); strokeWeight(1.5);
    drawingContext.setLineDash([5, 5]); line(a.x, a.y, b.x, b.y); drawingContext.setLineDash([]);
    noStroke(); fill(255, 190, 40); circle(b.x, b.y, 10);
  }
  // つかめる点
  for (let k of use) {
    let p = H[k];
    noStroke();
    if (k[0] === 'P') { fill(30); circle(p.x, p.y, 16); fill(255); textSize(14); text(k, p.x + 10, p.y - 10); }
    else { fill(k.endsWith('1') ? color(200, 70, 50) : color(50, 100, 200)); rect(p.x - 7, p.y - 7, 14, 14); }
  }

  // 説明パネル
  let info = INFO[axiom], tx = px0 + PS + 40;
  noStroke(); fill(255); textSize(18);
  text('1〜7：公理を選ぶ　ドラッグ：P1・P2・直線の端（□）を動かす　P：放物線 ' + (showParabola ? 'ON' : 'off'), 20, 40);
  fill(170); textSize(15);
  text('1 回の折りで「点・線を点・線に重ねる」やり方は 7 通り。この 7 つで作図できる数は、定規とコンパスより多い', 20, 68);
  fill(255, 190, 40); textSize(44); text(info[0], tx, py0 + 40);
  fill(255); textSize(20); text(info[1], tx, py0 + 84, width - tx - 20);
  fill(190); textSize(16); text(info[2], tx, py0 + 150, width - tx - 20);
  fill(255); textSize(26); text('折り線 ' + sol.lines.length + ' 本', tx, py0 + 230);
  fill(150); textSize(14);
  let y = py0 + 280;
  for (let k = 1; k <= 7; k++) { fill(k === axiom ? 255 : 130); text(INFO[k][0] + '  ' + INFO[k][1], tx, y); y += 24; }
  fill(150); text('O1〜O6 は藤田文章（1989）、O7 は羽鳥公士郎（2001）が加えた', tx, y + 12, width - tx - 20);
}

function drawParabola(F, L, c) {
  // 準線 L の上の点 X から垂直に h だけ離れた点：|Y − F| = h  →  h = (t² + d²) / (2d)
  let d = sdist(F, L);
  if (Math.abs(d) < 1) return;
  let t0 = (F.x - L.p.x) * L.u.x + (F.y - L.p.y) * L.u.y;
  noFill(); stroke(c); strokeWeight(2);
  beginShape();
  for (let t = -900; t <= 900; t += 12) {
    let h = (t * t + d * d) / (2 * d);
    let X = onLine(L, t0 + t);
    vertex(X.x - L.u.y * h, X.y + L.u.x * h);
  }
  endShape();
}

function mousePressed() {
  dragKey = null;
  let bd = 22;
  for (let k of USES[axiom]) { let d = dist(mouseX, mouseY, H[k].x, H[k].y); if (d < bd) { bd = d; dragKey = k; } }
}
function mouseDragged() { if (dragKey) H[dragKey] = { x: constrain(mouseX, 0, width), y: constrain(mouseY, 90, height) }; }
function mouseReleased() { dragKey = null; }
function keyPressed() {
  if (key >= '1' && key <= '7') axiom = int(key);
  if (key === 'p' || key === 'P') showParabola = !showParabola;
  if (key === 'r' || key === 'R') layout();
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); layout(); }

// ---------- やってみよう ----------
// 1. O5 で P1 を円の外へ動かすと折り線が 0 本になる。2 本 → 1 本 → 0 本の境目はどんなとき？
// 2. O6 で折り線が 3 本になる配置を探そう。3 次方程式の解が 3 つある状態
// 3. O6 で P を動かすと放物線も動く。折り線が「2 つの放物線の両方に接する線」になっていることを確かめよう
// 4. O3 で L1 と L2 を平行にすると？ O7 で L1 と L2 を平行にすると？


// ==================================================
// ここから下は「直線と鏡映の道具」
// ==================================================
function nrm(x, y) { let l = Math.hypot(x, y) || 1; return { x: x / l, y: y / l }; }
function lineOf(a, b) { return { p: a, u: nrm(b.x - a.x, b.y - a.y) }; }
function onLine(L, t) { return { x: L.p.x + L.u.x * t, y: L.p.y + L.u.y * t }; }
function bisector(a, b) { let u = nrm(-(b.y - a.y), b.x - a.x); return { p: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, u }; }
function sdist(q, L) { return (q.x - L.p.x) * -L.u.y + (q.y - L.p.y) * L.u.x; }
function refl(q, L) { let s = sdist(q, L); return { x: q.x + 2 * s * L.u.y, y: q.y - 2 * s * L.u.x }; }
function intersect(L1, L2) {
  let den = L1.u.x * L2.u.y - L1.u.y * L2.u.x;
  if (Math.abs(den) < 1e-9) return null;
  let t = ((L2.p.x - L1.p.x) * L2.u.y - (L2.p.y - L1.p.y) * L2.u.x) / den;
  return onLine(L1, t);
}
function infLine(L) { line(L.p.x - L.u.x * 3000, L.p.y - L.u.y * 3000, L.p.x + L.u.x * 3000, L.p.y + L.u.y * 3000); }
function clipToPaper(L) { // 紙（正方形）と直線が交わる線分
  let pts = [{ x: px0, y: py0 }, { x: px0 + PS, y: py0 }, { x: px0 + PS, y: py0 + PS }, { x: px0, y: py0 + PS }], r = [];
  for (let i = 0; i < 4; i++) {
    let a = pts[i], b = pts[(i + 1) % 4], sa = sdist(a, L), sb = sdist(b, L);
    if (sa * sb <= 0 && sa !== sb) { let t = sa / (sa - sb); r.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }); }
  }
  return r.length >= 2 ? [r[0], r[1]] : null;
}
