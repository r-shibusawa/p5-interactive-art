// ============================================
// 04 直流回路とキルヒホッフの法則 ─ 回路を「連立方程式」で解く（節点解析）
// 各点（節点）で 入る電流 = 出る電流（キルヒホッフの電流則）、電池は 2 点の電位差を決める。
// これを行列の連立方程式にして毎フレーム解き（ガウスの消去法）、電流を点の流れ、電位を色で描く
// 1〜4 = 回路 / 抵抗をクリック = 抵抗値を変える / 電池をクリック = 電圧を変える / スペース = 止める / R = 値をもどす
// ============================================

const RVALS = [5, 10, 20, 30, 40, 50, 100];   // ★ クリックで切りかわる抵抗値 [Ω]
const VVALS = [3, 6, 8, 9, 12];                // ★ 電池の電圧 [V]
const DOT_SPEED = 160;                         // ★ 点の速さ：1 A で 1 秒に何 px 進むか
let circuit, sol, preset = 1, paused = false, UNIT = 90, ox = 120, oy = 190;

// 回路：要素 = { t: 'R' 抵抗 / 'V' 電池（p1 が −、p2 が ＋）/ 'W' 導線, p1, p2（格子の座標）, v（Ω か V）}
function makeCircuit(n) {
  let E = (t, x1, y1, x2, y2, v) => ({ t, p1: [x1, y1], p2: [x2, y2], v, ph: 0 });
  if (n === 1) return [E('V', 0, 4, 0, 0, 12), E('R', 0, 0, 3, 0, 10), E('R', 3, 0, 6, 0, 20), E('R', 6, 0, 6, 4, 30), E('W', 6, 4, 0, 4)];
  if (n === 2) return [E('V', 0, 4, 0, 0, 8), E('W', 0, 0, 2, 0), E('W', 2, 0, 4, 0), E('W', 4, 0, 6, 0), E('W', 0, 4, 2, 4), E('W', 2, 4, 4, 4), E('W', 4, 4, 6, 4),
    E('R', 2, 0, 2, 4, 10), E('R', 4, 0, 4, 4, 40), E('R', 6, 0, 6, 4, 20)];
  if (n === 3) return [E('V', 0, 4, 0, 0, 12), E('R', 0, 0, 3, 0, 20), E('R', 3, 0, 3, 4, 30), E('W', 3, 0, 6, 0), E('R', 6, 0, 6, 4, 30), E('W', 6, 4, 3, 4), E('W', 3, 4, 0, 4)];
  return [E('V', 0, 4, 0, 0, 12), E('W', 0, 0, 3, 0), E('W', 0, 4, 3, 4), E('R', 3, 0, 1.5, 2, 10), E('R', 3, 0, 4.5, 2, 20), E('R', 1.5, 2, 3, 4, 30), E('R', 4.5, 2, 3, 4, 50), E('R', 1.5, 2, 4.5, 2, 40)];
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  UNIT = Math.min((width * 0.55) / 7, (height - 300) / 4.5); ox = 60 + UNIT * 1.2; oy = 200;
  circuit = makeCircuit(1); sol = solveCircuit(circuit);
  selfTest();
}

function draw() {
  background(14, 18, 26);
  sol = solveCircuit(circuit);                 // 毎フレーム解く（値を変えるとすぐ反映）
  let P = (p) => [ox + p[0] * UNIT, oy + p[1] * UNIT], Vmax = Math.max(1e-9, ...sol.V);
  circuit.forEach((e, k) => {
    let [x1, y1] = P(e.p1), [x2, y2] = P(e.p2), I = sol.I[k];
    drawElement(e, x1, y1, x2, y2);
    // 電流の点：p1 → p2 の向きに、速さ ∝ 電流
    if (!paused) e.ph = (e.ph + (I * DOT_SPEED * Math.min(deltaTime, 50)) / 1000) % 24;
    let L = Math.hypot(x2 - x1, y2 - y1);
    noStroke(); fill(255, 230, 120);
    if (Math.abs(I) > 1e-6) for (let s = ((e.ph % 24) + 24) % 24; s < L; s += 24) circle(x1 + ((x2 - x1) * s) / L, y1 + ((y2 - y1) * s) / L, 6);
    if (e.t !== 'W') {
      let mx = (x1 + x2) / 2, my = (y1 + y2) / 2, horiz = Math.abs(y2 - y1) < Math.abs(x2 - x1);
      fill(e.t === 'R' ? color(255, 190, 140) : color(160, 220, 255)); textSize(14); textAlign(CENTER, CENTER);
      text((e.t === 'R' ? e.v + ' Ω' : e.v + ' V') + '\n' + Math.abs(I).toFixed(3) + ' A', mx + (horiz ? 0 : 46), my + (horiz ? -34 : 0));
      textAlign(LEFT, BASELINE);
    }
  });
  // 節点：色 = 電位（青 0 V → 赤 最大）
  sol.nodes.forEach((p, i) => {
    let [x, y] = P(p), t = sol.V[i] / Vmax;
    stroke(20); strokeWeight(1); fill(60 + 190 * t, 90, 250 - 190 * t); circle(x, y, 16);
    noStroke(); fill(220); textSize(12); text(sol.V[i].toFixed(2) + ' V', x + 10, y + 20);
  });
  // ---- 右：数字
  let tx = width * 0.66, y = 200, bi = circuit.findIndex((e) => e.t === 'V'), Ib = sol.I[bi], Vb = circuit[bi].v;
  noStroke(); fill(235); textSize(16);
  text('電池から出る電流 I = ' + Ib.toFixed(4) + ' A', tx, y); y += 28;
  text('合成抵抗 R = V / I = ' + (Math.abs(Ib) > 1e-12 ? (Vb / Ib).toFixed(3) : '—') + ' Ω', tx, y); y += 28;
  fill(255, 230, 120); text(formulaText(), tx, y, width - tx - 16); y += 54;
  fill(235); text('電池の電力 V·I = ' + (Vb * Ib).toFixed(3) + ' W', tx, y); y += 26;
  text('抵抗の発熱 ΣI²R = ' + circuit.reduce((s, e, k) => s + (e.t === 'R' ? sol.I[k] * sol.I[k] * e.v : 0), 0).toFixed(3) + ' W', tx, y); y += 30;
  fill(150, 230, 170); text('節点の電流則のずれ（最大）= ' + sci(sol.kcl, 2) + ' A', tx, y); y += 24;
  fill(170); textSize(13);
  text('どの節点でも「入る電流の合計 = 出る電流の合計」。未知数 = 節点の電位 ' + (sol.nodes.length - 1) + ' 個 + 電池・導線の電流 ' + sol.nv + ' 個 → ' + sol.n + ' 元の連立方程式', tx, y, width - tx - 16);
  fill(235); textSize(17);
  text('1 直列　2 並列　3 直並列　4 ブリッジ ｜ 抵抗・電池をクリックで値を変える　スペース 止める（' + (paused ? '止めている' : '流れている') + '）　R 値をもどす', 20, 34);
  fill(170); textSize(13);
  text('黄色の点 = 電流（速さ ∝ 電流の大きさ。点は ＋ の電荷の向き＝電流の向きに進む）。丸 = 節点（色 = 電位：青 0 V → 赤 高い）。電池の長い線が ＋', 20, 60, width - 40);
  drawSelfTest(20, height - 14);
}

function formulaText() {
  let R = circuit.filter((e) => e.t === 'R').map((e) => e.v);
  if (preset === 1) return '式：直列 R1 + R2 + R3 = ' + (R[0] + R[1] + R[2]).toFixed(3) + ' Ω';
  if (preset === 2) return '式：並列 1 / (1/R1 + 1/R2 + 1/R3) = ' + (1 / (1 / R[0] + 1 / R[1] + 1 / R[2])).toFixed(3) + ' Ω';
  if (preset === 3) return '式：R1 + (R2 と R3 の並列) = ' + (R[0] + 1 / (1 / R[1] + 1 / R[2])).toFixed(3) + ' Ω';
  return 'ブリッジ：R1/R3 = R2/R4 のとき まん中（' + R[4] + ' Ω）に電流が流れない。いま R1/R3 = ' + (R[0] / R[2]).toFixed(3) + '、R2/R4 = ' + (R[1] / R[3]).toFixed(3);
}

function drawElement(e, x1, y1, x2, y2) {
  let L = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / L, uy = (y2 - y1) / L, nx = -uy, ny = ux;
  stroke(200, 205, 215); strokeWeight(3); noFill();
  if (e.t === 'W') { line(x1, y1, x2, y2); return; }
  let a = L * 0.32, b = L * 0.68;
  line(x1, y1, x1 + ux * a, y1 + uy * a); line(x1 + ux * b, y1 + uy * b, x2, y2);
  if (e.t === 'R') {                           // ぎざぎざ（抵抗）
    stroke(255, 170, 110); beginShape();
    for (let i = 0; i <= 8; i++) { let s = a + ((b - a) * i) / 8, o = i === 0 || i === 8 ? 0 : i % 2 ? 10 : -10; vertex(x1 + ux * s + nx * o, y1 + uy * s + ny * o); }
    endShape();
  } else {                                     // 電池：短い線が −（p1 側）、長い線が ＋（p2 側）
    let m = L / 2;
    line(x1 + ux * a, y1 + uy * a, x1 + ux * (m - 6), y1 + uy * (m - 6)); line(x1 + ux * (m + 6), y1 + uy * (m + 6), x1 + ux * b, y1 + uy * b);
    stroke(120, 200, 255); strokeWeight(4);
    let c1 = [x1 + ux * (m - 6), y1 + uy * (m - 6)], c2 = [x1 + ux * (m + 6), y1 + uy * (m + 6)];
    line(c1[0] - nx * 10, c1[1] - ny * 10, c1[0] + nx * 10, c1[1] + ny * 10);
    line(c2[0] - nx * 22, c2[1] - ny * 22, c2[0] + nx * 22, c2[1] + ny * 22);
  }
}

function mousePressed() {
  let best = 16, hit = -1;
  circuit.forEach((e, k) => {
    if (e.t === 'W') return;
    let [x1, y1] = [ox + e.p1[0] * UNIT, oy + e.p1[1] * UNIT], [x2, y2] = [ox + e.p2[0] * UNIT, oy + e.p2[1] * UNIT];
    let d = distToSeg(mouseX, mouseY, x1, y1, x2, y2); if (d < best) { best = d; hit = k; }
  });
  if (hit < 0) return;
  let e = circuit[hit], list = e.t === 'R' ? RVALS : VVALS;
  e.v = list[(list.indexOf(e.v) + 1) % list.length];
}
function keyPressed() {
  if (key >= '1' && key <= '4') { preset = +key; circuit = makeCircuit(preset); }
  if (key === 'r' || key === 'R') circuit = makeCircuit(preset);
  if (key === ' ') paused = !paused;
}

// ---- 自己テスト：手で計算した電流と比べる
function selfTest() {
  selfTestResults = [];
  let s1 = solveCircuit(makeCircuit(1));
  check('直列 10 + 20 + 30 Ω、12 V → どこも 0.2 A', [1, 2, 3, 4].every((k) => near(Math.abs(s1.I[k]), 0.2, 1e-12)));
  let c2 = makeCircuit(2), s2 = solveCircuit(c2), ri = [7, 8, 9].map((k) => Math.abs(s2.I[k]));
  check('並列 10・40・20 Ω、8 V → 0.8・0.2・0.4 A、合成 5.714 Ω', near(ri[0], 0.8, 1e-12) && near(ri[1], 0.2, 1e-12) && near(ri[2], 0.4, 1e-12) && near(8 / Math.abs(s2.I[0]), 1 / (1 / 10 + 1 / 40 + 1 / 20), 1e-9));
  let c4 = makeCircuit(4); c4[3].v = 10; c4[4].v = 20; c4[5].v = 30; c4[6].v = 60;
  check('つりあったブリッジ（10/30 = 20/60）→ まん中の電流 0', Math.abs(solveCircuit(c4).I[7]) < 1e-12);
  check('どの回路でも、どの節点でも 入る = 出る（電流則）', [1, 2, 3, 4].every((n) => solveCircuit(makeCircuit(n)).kcl < 1e-12));
  let drop = [1, 2, 3].reduce((s, k) => s + Math.abs(s1.I[k]) * makeCircuit(1)[k].v, 0);
  check('一周の電圧降下の合計 = 電池の電圧（電圧則）', near(drop, 12, 1e-12));
  let x = gaussSolve([[2, 1, -1], [-3, -1, 2], [-2, 1, 2]], [8, -11, -3]);
  check('連立方程式を解く道具：2x+y−z=8 … → (2, 3, −1)', x && near(x[0], 2, 1e-12) && near(x[1], 3, 1e-12) && near(x[2], -1, 1e-12));
  let c3 = makeCircuit(3), s3 = solveCircuit(c3), Pr = c3.reduce((s, e, k) => s + (e.t === 'R' ? s3.I[k] * s3.I[k] * e.v : 0), 0);
  check('電池の電力 V·I = 抵抗の発熱 ΣI²R（エネルギー保存）', nearRel(12 * Math.abs(s3.I[0]), Pr, 1e-12));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 直列で、まん中の抵抗を 100 Ω にすると電流と各抵抗の電圧はどう変わる？
// 2. 並列で、1 本だけ 5 Ω にすると、ほかの 2 本の電流は変わる？ 電池の電流は？
// 3. ブリッジで、まん中の電流が 0 になる組み合わせを探そう（R1/R3 = R2/R4）
// 4. 電池の電力と、抵抗の発熱の合計が いつも同じになることを確かめよう
// 5. makeCircuit に 5 番目の回路（電池 2 つ、はしご形など）を足してみよう


// ==================================================
// ここから下は「電磁気の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 節点解析（電池・導線の電流も未知数にする「修正節点解析」）
// 未知数：節点の電位（最初の電池の − を 0 V とする）と、電池・導線を流れる電流
function solveCircuit(c) {
  let nodes = [], idx = (p) => { let i = nodes.findIndex((q) => Math.abs(q[0] - p[0]) < 1e-9 && Math.abs(q[1] - p[1]) < 1e-9); if (i < 0) { nodes.push(p); i = nodes.length - 1; } return i; };
  let g0 = idx(c.find((e) => e.t === 'V').p1);            // 0 V の点
  let ends = c.map((e) => [idx(e.p1), idx(e.p2)]);
  let vs = c.map((e, k) => (e.t === 'R' ? -1 : k)).filter((k) => k >= 0);
  let nn = nodes.length, row = (i) => (i < g0 ? i : i - 1), n = nn - 1 + vs.length;
  let A = Array.from({ length: n }, () => new Array(n).fill(0)), b = new Array(n).fill(0);
  c.forEach((e, k) => {
    let [a, bb] = ends[k];
    if (e.t === 'R') {                                     // 抵抗：コンダクタンス 1/R を 4 か所に
      let G = 1 / e.v;
      if (a !== g0) { A[row(a)][row(a)] += G; if (bb !== g0) A[row(a)][row(bb)] -= G; }
      if (bb !== g0) { A[row(bb)][row(bb)] += G; if (a !== g0) A[row(bb)][row(a)] -= G; }
    } else {                                               // 電池・導線：V(p2) − V(p1) = 電圧（導線は 0 V）
      let m = nn - 1 + vs.indexOf(k), v = e.t === 'V' ? e.v : 0;
      if (a !== g0) { A[row(a)][m] += 1; A[m][row(a)] -= 1; }
      if (bb !== g0) { A[row(bb)][m] -= 1; A[m][row(bb)] += 1; }
      b[m] = v;
    }
  });
  let x = gaussSolve(A, b) || new Array(n).fill(0);
  let V = nodes.map((_, i) => (i === g0 ? 0 : x[row(i)]));
  let I = c.map((e, k) => (e.t === 'R' ? (V[ends[k][0]] - V[ends[k][1]]) / e.v : x[nn - 1 + vs.indexOf(k)]));
  let net = new Array(nn).fill(0);                        // 確かめ：節点から出ていく電流の合計
  c.forEach((e, k) => { net[ends[k][0]] += I[k]; net[ends[k][1]] -= I[k]; });
  return { nodes, V, I, n, nv: vs.length, kcl: Math.max(...net.map(Math.abs)) };
}
// ---- ガウスの消去法（部分ピボット選択つき）。解けないときは null
function gaussSolve(A0, b0) {
  let n = b0.length, A = A0.map((r) => r.slice()), b = b0.slice();
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    if (Math.abs(A[p][c]) < 1e-14) return null;
    [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
    for (let r = c + 1; r < n; r++) { let f = A[r][c] / A[c][c]; if (f === 0) continue; for (let k = c; k < n; k++) A[r][k] -= f * A[c][k]; b[r] -= f * b[c]; }
  }
  let x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) { let s = b[r]; for (let k = r + 1; k < n; k++) s -= A[r][k] * x[k]; x[r] = s / A[r][r]; }
  return x;
}
function distToSeg(px, py, x1, y1, x2, y2) {
  let dx = x2 - x1, dy = y2 - y1, t = clampv(((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy), 0, 1);
  return Math.hypot(px - x1 - t * dx, py - y1 - t * dy);
}
// ---- 描く道具（どのスケッチも同じ）
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
function polyline(pts) {               // 点が 2 つ以上あるときだけ折れ線を描く（[[x, y], ...]）
  if (!pts || pts.length < 2) return;
  beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape();
}
function arrowTo(x1, y1, x2, y2, hs) {  // (x1, y1) → (x2, y2) の矢印。hs = 矢じりの大きさ
  let dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy);
  if (!(L > 0.5)) return;
  line(x1, y1, x2, y2);
  let ux = dx / L, uy = dy / L, h = Math.min(hs || 8, L * 0.5);
  line(x2, y2, x2 - h * ux + h * 0.5 * uy, y2 - h * uy - h * 0.5 * ux);
  line(x2, y2, x2 - h * ux - h * 0.5 * uy, y2 - h * uy + h * 0.5 * ux);
}
const SUP = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
function sci(v, d) {                   // 0.000032 → "3.20×10⁻⁵"（大きい数・小さい数を読みやすく）
  if (!isFinite(v)) return '—';
  if (v === 0) return '0';
  let sig = d === undefined ? 3 : d, e = Math.floor(Math.log10(Math.abs(v)));
  if (e >= -2 && e <= 3) return v.toFixed(Math.max(0, sig - 1 - e));
  let m = v / Math.pow(10, e);
  return m.toFixed(sig - 1) + '×10' + String(e).split('').map((c) => SUP[c]).join('');
}
// グラフの枠：g = { x, y, w, h }。lo〜hi の範囲で、数字の配列 arr を左から右へ（cap 個ぶん）
function plotFrame(g, title, lo, hi) {
  noFill(); stroke(70, 80, 100); strokeWeight(1); rect(g.x, g.y, g.w, g.h);
  if (lo < 0 && hi > 0) { let y0 = g.y + g.h * (hi / (hi - lo)); stroke(70, 80, 100, 160); line(g.x, y0, g.x + g.w, y0); }
  noStroke(); fill(200); textSize(13); text(title, g.x + 4, g.y - 6);
  fill(140); textSize(11); text(sci(hi, 2), g.x + g.w + 4, g.y + 10); text(sci(lo, 2), g.x + g.w + 4, g.y + g.h);
}
function plotTrace(g, arr, lo, hi, cap) {
  if (!arr || arr.length < 2) return;
  noFill(); beginShape();
  for (let i = 0; i < arr.length; i++) vertex(g.x + (i / (cap - 1)) * g.w, g.y + g.h - clampv((arr[i] - lo) / (hi - lo), 0, 1) * g.h);
  endShape();
}
function pushCap(arr, v, cap) { arr.push(v); if (arr.length > cap) arr.shift(); }
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function nearRel(a, b, rel) { return near(a, b, Math.abs(b) * rel); }   // 相対誤差 rel 以内
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) {
  noStroke(); textSize(13);
  if (selfTestResults.length > 0 && selfTestResults.every((r) => r.ok)) fill(120, 220, 160); else fill(255, 100, 90);
  text(selfTestLine(), x, y);
}
