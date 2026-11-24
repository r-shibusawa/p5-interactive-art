// ============================================
// 00 天気のマルコフ連鎖 ─ 「明日の天気は、今日の天気だけで決まる」と考えるモデル
// 晴れ・くもり・雨の 3 つの状態と、矢印の確率（遷移確率）。同じ状態から出る矢印の確率の合計はいつも 1。
// 1 日ごとにサイコロ（0〜1 の乱数 u）を振り、今日の行の区切りのどこに u が落ちたかで明日が決まる。
// 長く続けると、晴れ・くもり・雨の日の割合は、決まった値（定常分布 π、02 で詳しく）に近づく
// 矢印のラベルをドラッグ（上下）で確率を変える / スペース 1 日すすめる / A 自動 / R 最初から / 1 2 3 今日の天気
// ============================================

const NAMES = ['晴れ', 'くもり', '雨'];
let transP = [                           // ★ 遷移行列：transP[今日][明日]（各行の合計 = 1）
  [0.6, 0.3, 0.1],
  [0.3, 0.4, 0.3],
  [0.2, 0.4, 0.4],
];
const SHOW_DAYS = 42;                    // ★ カレンダーに並べる日数（6 週間）
let today = 0, days = [], counts = [0, 0, 0], lastU = -1, auto = true, nodes = [], hits = [], dragEdge = null, dragY = 0, piExact = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  seedRng(2024); restart();
}
function restart() { days = [today]; counts = [0, 0, 0]; counts[today] = 1; lastU = -1; piExact = stationaryExact(transP) || [1 / 3, 1 / 3, 1 / 3]; }

// ★ サイコロで明日を決める：u が [0, p0) なら 0、[p0, p0+p1) なら 1、残りは 2
function nextWeather(row, u) { let c = 0; for (let j = 0; j < row.length; j++) { c += row[j]; if (u < c) return j; } return row.length - 1; }
function advanceDay() { lastU = rnd(); today = nextWeather(transP[today], lastU); days.push(today); counts[today]++; if (days.length > 4000) days.shift(); }
// 1 つの確率を v にして、同じ行の残りを「元の比のまま」縮める（行の合計 = 1 を保つ）
function setProb(a, i, j, v) {
  v = clampv(v, 0, 1); let rest = 0; for (let k = 0; k < a.length; k++) if (k !== j) rest += a[i][k];
  for (let k = 0; k < a.length; k++) { if (k === j) continue; a[i][k] = rest > 1e-12 ? (a[i][k] / rest) * (1 - v) : (1 - v) / (a.length - 1); }
  a[i][j] = v;
}

function draw() {
  background(...BG);
  if (auto && frameCount % 15 === 0) advanceDay();
  hudTitle('天気のマルコフ連鎖：' + days.length + ' 日目　今日は「' + NAMES[today] + '」', 'ラベルを上下にドラッグ 確率を変える　スペース 1 日　A 自動（' + (auto ? 'ON' : 'OFF') + '）　R 最初から　1 2 3 今日の天気');

  // ---- 遷移図（矢印の太さ = 確率）
  let gcx = width * 0.22, gcy = height * 0.4, rad = Math.min(width, height) * 0.16;
  nodes = [0, 1, 2].map((k) => [gcx + rad * Math.cos(-Math.PI / 2 + (k * 2 * Math.PI) / 3), gcy + rad * Math.sin(-Math.PI / 2 + (k * 2 * Math.PI) / 3)]);
  hits = drawChainGraph(nodes, transP, 34, STATE_COLS, { names: NAMES, hl: today, nameSize: 15 });
  if (dragEdge) { noFill(); stroke(...MUSTARD); strokeWeight(2); circle(dragEdge.mx, dragEdge.my - 12, 34); }

  // ---- 遷移行列とサイコロ
  let mx = width * 0.47, my = 120;
  noStroke(); fill(...CREAM); textSize(15); textAlign(LEFT, BASELINE); text('遷移行列 P（行 = 今日、列 = 明日）', mx, my - 26);
  drawMatrix(transP, mx + 50, my, 70, 30, NAMES, { ts: 14 });
  let dy = my + 3 * 30 + 40, bw = Math.min(380, width * 0.3);
  fill(...CREAM); textSize(15); textAlign(LEFT, BASELINE); text('サイコロ：今日（' + NAMES[days.length > 1 ? days[days.length - 2] : today] + '）の行を 0〜1 に並べて、u が落ちた所が明日', mx, dy);
  let row = transP[days.length > 1 ? days[days.length - 2] : today], c = 0;
  for (let j = 0; j < 3; j++) { noStroke(); fill(...STATE_COLS[j]); rect(mx + c * bw, dy + 12, row[j] * bw, 26); fill(20); textSize(12); textAlign(CENTER, CENTER); if (row[j] > 0.08) text(NAMES[j], mx + (c + row[j] / 2) * bw, dy + 25); c += row[j]; }
  if (lastU >= 0) { stroke(...CREAM); strokeWeight(3); line(mx + lastU * bw, dy + 6, mx + lastU * bw, dy + 44); noStroke(); fill(...CREAM); textSize(13); textAlign(CENTER, TOP); text('u = ' + fmtN(lastU, 3), mx + lastU * bw, dy + 46); }

  // ---- 割合：シミュレーション と 定常分布
  let ty = dy + 90, tot = sumOf(counts);
  fill(...CREAM); textSize(15); textAlign(LEFT, BASELINE); text('天気の日の割合（' + tot + ' 日）　棒 = シミュレーション　線 = 定常分布 π', mx, ty);
  for (let k = 0; k < 3; k++) {
    let y = ty + 16 + k * 30, f = counts[k] / Math.max(1, tot);
    noStroke(); fill(...STATE_COLS[k]); rect(mx + 60, y, f * bw, 20, 3);
    stroke(...CREAM); strokeWeight(2); line(mx + 60 + piExact[k] * bw, y - 3, mx + 60 + piExact[k] * bw, y + 23);
    noStroke(); fill(...CREAM); textSize(13); textAlign(LEFT, CENTER); text(NAMES[k], mx, y + 10);
    text(fmtN(f, 3) + ' / π = ' + fmtN(piExact[k], 3), mx + 70 + bw, y + 10);
  }

  // ---- カレンダー（最近の 6 週間）
  let cs = Math.min(64, (width - 80) / 14), cx0 = 40, cy0 = height - cs * 3 - 40, start = Math.max(0, days.length - SHOW_DAYS);
  fill(...SUB); textSize(13); textAlign(LEFT, BASELINE); text('カレンダー（左上から右へ、最近の ' + SHOW_DAYS + ' 日）', cx0, cy0 - 10);
  for (let k = start; k < days.length; k++) {
    let p = k - start, x = cx0 + (p % 14) * cs, y = cy0 + Math.floor(p / 14) * cs;
    noStroke(); fill(48, 43, 40); rect(x + 2, y + 2, cs - 4, cs - 4, 6);
    weatherIcon(days[k], x + cs / 2, y + cs / 2 + 2, cs * 0.5);
    noStroke(); fill(...SUB); textSize(10); textAlign(LEFT, TOP); text(k + 1, x + 5, y + 4);
  }
  drawSelfTest(width - 180, height - 14);
}

function weatherIcon(w, x, y, s) {       // 晴れ = 太陽、くもり = 雲、雨 = 雲としずく
  if (w === 0) { stroke(...DICE); strokeWeight(2); for (let k = 0; k < 8; k++) { let t = (k * Math.PI) / 4; line(x + Math.cos(t) * s * 0.42, y + Math.sin(t) * s * 0.42, x + Math.cos(t) * s * 0.6, y + Math.sin(t) * s * 0.6); } noStroke(); fill(...DICE); circle(x, y, s * 0.6); return; }
  noStroke(); fill(w === 1 ? color(200, 196, 186) : color(150, 160, 175));
  circle(x - s * 0.22, y, s * 0.45); circle(x + s * 0.18, y - s * 0.05, s * 0.55); rect(x - s * 0.44, y, s * 0.86, s * 0.22, s * 0.1);
  if (w === 2) { stroke(...TEAL); strokeWeight(2); for (let k = -1; k <= 1; k++) line(x + k * s * 0.25, y + s * 0.3, x + k * s * 0.25 - 3, y + s * 0.48); }
}

function mousePressed() {
  dragEdge = null; let best = 26;
  for (let h of hits) { let d = Math.hypot(mouseX - h.mx, mouseY - (h.my - 12)); if (d < best) { best = d; dragEdge = h; } }
  dragY = mouseY;
}
function mouseDragged() {
  if (!dragEdge) return;
  setProb(transP, dragEdge.i, dragEdge.j, Math.round((transP[dragEdge.i][dragEdge.j] + (dragY - mouseY) / 250) * 100) / 100);
  dragY = mouseY; piExact = stationaryExact(transP) || piExact;
}
function mouseReleased() { if (dragEdge) { transP = fixRows(transP); piExact = stationaryExact(transP) || piExact; } dragEdge = null; }
function keyPressed() {
  if (key === ' ') advanceDay();
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'r' || key === 'R') restart();
  if (key === '1' || key === '2' || key === '3') { today = Number(key) - 1; restart(); }
  return false;
}

// ============================================
// やってみよう
// 1. 雨 → 雨 の確率を 0.9 にすると、カレンダーに「梅雨」のような長い雨の続きが現れる。割合はどう変わる？
// 2. 晴れ → 晴れ = 1 にすると、一度晴れたらずっと晴れ（吸収状態、04・05 で詳しく）
// 3. 1 2 3 でちがう天気から始めても、長く続けると割合は同じ π に近づく？
// 4. draw() の frameCount % 15 を % 1 にすると 1 秒に 60 日。割合が π に近づく速さを見よう
// ============================================

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let pt = [[0.6, 0.3, 0.1], [0.3, 0.4, 0.3], [0.2, 0.4, 0.4]];
  check('遷移行列の各行の合計 = 1', rowSumErr(pt) < 1e-12);
  let pe = stationaryExact(pt), pw = stationaryPower(pt, 1e-14).pi;
  check('定常分布：連立方程式 = べき乗法（' + pe.map((v) => fmtN(v, 4)).join(', ') + '）', maxAbsDiff(pe, pw) < 1e-10);
  check('π P = π、Σ π = 1', maxAbsDiff(vecMat(pe, pt), pe) < 1e-12 && near(sumOf(pe), 1, 1e-12));
  // 手計算：π = (24, 22, 15) / 61 … (π0 = 0.6π0 + 0.3π1 + 0.2π2 などを解く)
  check('定常分布 = (24, 22, 15) / 61（手計算）', maxAbsDiff(pe, [24 / 61, 22 / 61, 15 / 61]) < 1e-12);
  seedRng(7); let w = 0, cnt = [0, 0, 0], nD = 200000;
  for (let t = 0; t < nD; t++) { w = nextWeather(pt[w], rnd()); cnt[w]++; }
  check('20 万日のシミュレーションの割合 ≈ π（ずれ < 0.01）', maxAbsDiff(cnt.map((c) => c / nD), pe) < 0.01);
  let pc = copyMat(pt); setProb(pc, 0, 2, 0.5);
  check('確率を変えても行の合計 = 1（0.6 : 0.3 の比 → 0.333 : 0.167）', rowSumErr(pc) < 1e-12 && near(pc[0][0], 1 / 3, 1e-12) && near(pc[0][1], 1 / 6, 1e-12));
  setProb(pc, 1, 1, 1); setProb(pc, 1, 0, 0.4);
  check('残りが 0 の行でも NaN にならず合計 = 1', noNaN(pc) && rowSumErr(pc) < 1e-12);
  reportSelfTest();
}

// ==================================================
// ここから下は「マルコフ連鎖の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 色と小さな道具
const BG = [32, 28, 26];                // 背景（あたたかい炭色）
const CREAM = [246, 236, 214], DICE = [236, 96, 58], TEAL = [44, 178, 166], MUSTARD = [236, 190, 82], PLUM = [190, 130, 200], SUB = [190, 178, 160];
const STATE_COLS = [[236, 96, 58], [44, 178, 166], [236, 190, 82], [190, 130, 200], [120, 190, 240], [150, 210, 110], [240, 140, 170], [200, 170, 130]];
function clampv(v, a, b) { return v < a ? a : v > b ? b : v !== v ? a : v; }     // NaN なら a に戻す
function sumOf(a) { let s = 0; for (let v of a) s += v; return s; }
function meanOf(a) { return a.length ? sumOf(a) / a.length : 0; }
function sampleFrom(p) { let u = rnd() * sumOf(p), c = 0; for (let i = 0; i < p.length; i++) { c += p[i]; if (u < c) return i; } return p.length - 1; }   // 確率 p[i] で i を返す
function fmtN(v, d) { if (typeof v !== 'number' || v !== v) return '?'; if (!isFinite(v)) return '∞'; let s = v.toFixed(d === undefined ? 2 : d); return /^-0\.?0*$/.test(s) ? s.slice(1) : s; }
function hudTitle(t, sub) {            // 左上の見出しと操作の説明
  noStroke(); fill(...CREAM); textSize(22); textAlign(LEFT, BASELINE); text(t, 40, 42);
  fill(...SUB); textSize(15); text(sub, 40, 68);
}
// ---- 種つきの乱数（同じ種なら毎回同じ列 → 実験をくり返せる）
let rngState = 1;
function seedRng(s) { rngState = (s >>> 0) || 1; }
function rnd() {                       // 0〜1 の一様乱数（mulberry32）
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rndInt(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
function randn() { let u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }   // 標準正規分布
// ---- 行列の道具（行列 = 配列の配列。遷移行列 transP[i][j] = i の次に j へ行く確率、行の和 = 1）
function zerosMat(n, m) { let a = []; for (let i = 0; i < n; i++) a.push(new Array(m === undefined ? n : m).fill(0)); return a; }
function eyeMat(n) { let a = zerosMat(n); for (let i = 0; i < n; i++) a[i][i] = 1; return a; }
function copyMat(a) { return a.map((r) => r.slice()); }
function matMul(a, b) {                // 行列の積 (a b)[i][j] = Σ_k a[i][k] b[k][j]
  let n = a.length, m = b[0].length, kk = b.length, c = zerosMat(n, m);
  for (let i = 0; i < n; i++) for (let k = 0; k < kk; k++) { let v = a[i][k]; if (v !== 0) for (let j = 0; j < m; j++) c[i][j] += v * b[k][j]; }
  return c;
}
function vecMat(v, a) {                // 横ベクトル × 行列：次の時刻の分布 = いまの分布 × P
  let out = new Array(a[0].length).fill(0);
  for (let i = 0; i < v.length; i++) if (v[i] !== 0) for (let j = 0; j < out.length; j++) out[j] += v[i] * a[i][j];
  return out;
}
function matPow(a, k) { let r = eyeMat(a.length); for (let t = 0; t < k; t++) r = matMul(r, a); return r; }   // P^k（k 回かけるだけ）
function maxAbsDiff(a, b) {            // 2 つの行列（またはベクトル）のいちばん大きなずれ
  let d = 0;
  for (let i = 0; i < a.length; i++) { if (Array.isArray(a[i])) d = Math.max(d, maxAbsDiff(a[i], b[i])); else d = Math.max(d, Math.abs(a[i] - b[i])); }
  return d;
}
function rowSumErr(a, target) { let d = 0; for (let r of a) d = Math.max(d, Math.abs(sumOf(r) - (target === undefined ? 1 : target))); return d; }
function fixRows(a) {                  // 行の和を 1 に。全部 0 の行は「その場にとどまる」にする（NaN を出さない）
  return a.map((r, i) => { let s = sumOf(r); if (!(s > 1e-12)) { let z = r.map(() => 0); z[i] = 1; return z; } return r.map((v) => v / s); });
}
function solveLinear(a, b) {           // ガウスの消去法（部分ピボット）で a x = b。解けなければ null
  let n = a.length, m = a.map((r, i) => r.concat([b[i]]));
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    if (Math.abs(m[p][c]) < 1e-13) return null;
    [m[c], m[p]] = [m[p], m[c]];
    for (let r = 0; r < n; r++) { if (r === c) continue; let f = m[r][c] / m[c][c]; if (f !== 0) for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k]; }
  }
  return m.map((r, i) => r[n] / r[i]);
}
function matInv(a) {                   // 逆行列（ガウス-ジョルダン）。逆がなければ null
  let n = a.length, cols = [];
  for (let j = 0; j < n; j++) { let e = new Array(n).fill(0); e[j] = 1; let x = solveLinear(a, e); if (!x) return null; cols.push(x); }
  return a.map((_, i) => cols.map((c) => c[i]));
}
// 定常分布：π P = π と Σ π = 1 を連立方程式として解く（(P^T − I) π = 0 の最後の式を Σ π = 1 に置きかえる）
function stationaryExact(a) {
  let n = a.length, m = zerosMat(n), b = new Array(n).fill(0);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) m[i][j] = a[j][i] - (i === j ? 1 : 0);
  for (let j = 0; j < n; j++) m[n - 1][j] = 1; b[n - 1] = 1;
  return solveLinear(m, b);
}
function stationaryPower(a, tol, maxIt, start) {   // べき乗法：π ← π P を変化が tol 未満になるまで
  let n = a.length, v = start ? start.slice() : new Array(n).fill(1 / n), its = 0, d = Infinity;
  while (d > (tol || 1e-13) && its < (maxIt || 100000)) { let w = vecMat(v, a); d = maxAbsDiff(w, v); v = w; its++; }
  return { pi: v, its };
}
function tvDist(p, q) { let s = 0; for (let i = 0; i < p.length; i++) s += Math.abs(p[i] - q[i]); return s / 2; }   // 全変動距離
function entropyRate(a, pi) {          // エントロピー率 H = −Σ_i π_i Σ_j P_ij log₂ P_ij（1 歩あたりの情報量、ビット）
  let h = 0;
  for (let i = 0; i < a.length; i++) for (let v of a[i]) if (v > 0) h -= pi[i] * v * Math.log2(v);
  return h;
}
// ---- 遷移図を描く道具：矢印の太さ = 確率
function bezPts(ax, ay, bx, by, bend, r) {          // 少しふくらんだ曲線の点（両はしの円 r の中は除く）
  let mx = (ax + bx) / 2, my = (ay + by) / 2, dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
  let cx = mx - (dy / L) * bend * L, cy = my + (dx / L) * bend * L, pts = [];
  for (let k = 0; k <= 30; k++) {
    let t = k / 30, x = (1 - t) * (1 - t) * ax + 2 * t * (1 - t) * cx + t * t * bx, y = (1 - t) * (1 - t) * ay + 2 * t * (1 - t) * cy + t * t * by;
    if (Math.hypot(x - ax, y - ay) > r + 2 && Math.hypot(x - bx, y - by) > r + 6) pts.push([x, y]);
  }
  return pts;
}
function arrowHeadAt(pts, sz) {       // 折れ線の最後に三角の矢じり
  if (pts.length < 2) return;
  let [x1, y1] = pts[pts.length - 2], [x2, y2] = pts[pts.length - 1], L = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / L, uy = (y2 - y1) / L;
  triangle(x2 + ux * sz, y2 + uy * sz, x2 - uy * sz * 0.6, y2 + ux * sz * 0.6, x2 + uy * sz * 0.6, y2 - ux * sz * 0.6);
}
// nodes = [[x, y], …]、a = 遷移行列。戻り値：矢印ごとの { i, j, mx, my }（ラベルやクリック判定用）
function drawChainGraph(nodes, a, r, cols, opts) {
  opts = opts || {};
  let cx = meanOf(nodes.map((p) => p[0])), cy = meanOf(nodes.map((p) => p[1])), hits = [];
  for (let i = 0; i < nodes.length; i++) for (let j = 0; j < nodes.length; j++) {
    let p = a[i][j]; if (!(p > 1e-9)) continue;
    let col = cols[i % cols.length], w = 1 + 11 * p, pts;
    if (i === j) {                     // 自分に戻る矢印：外側に小さな輪
      let ox = nodes[i][0] - cx, oy = nodes[i][1] - cy, L = Math.hypot(ox, oy) || 1, ux = ox / L, uy = L > 1 ? oy / L : -1;
      if (L <= 1) ux = 0;
      let lx = nodes[i][0] + ux * r * 1.55, ly = nodes[i][1] + uy * r * 1.55, rr = r * 0.62, base = Math.atan2(-uy, -ux);
      pts = []; for (let k = 0; k <= 32; k++) { let t = base + 0.9 + (k / 32) * (2 * Math.PI - 1.8); pts.push([lx + rr * Math.cos(t), ly + rr * Math.sin(t)]); }
      hits.push({ i, j, mx: lx + ux * rr, my: ly + uy * rr });
    } else {
      pts = bezPts(nodes[i][0], nodes[i][1], nodes[j][0], nodes[j][1], 0.14, r);
      if (pts.length) hits.push({ i, j, mx: pts[pts.length >> 1][0], my: pts[pts.length >> 1][1] });
    }
    stroke(col[0], col[1], col[2], opts.alphaEdge || 210); strokeWeight(w); noFill(); polyline(pts);
    noStroke(); fill(col[0], col[1], col[2], opts.alphaEdge || 230); arrowHeadAt(pts, 8 + w * 0.8);
    if (opts.labels !== false && pts.length) {
      let h = hits[hits.length - 1]; fill(...CREAM); textSize(13); textAlign(CENTER, CENTER); text(fmtN(p, 2), h.mx, h.my - 12);
    }
  }
  for (let i = 0; i < nodes.length; i++) {
    let col = cols[i % cols.length]; stroke(...CREAM); strokeWeight(opts.hl === i ? 4 : 1.5); fill(col[0] * 0.55, col[1] * 0.55, col[2] * 0.55);
    circle(nodes[i][0], nodes[i][1], 2 * r);
    noStroke(); fill(...CREAM); textAlign(CENTER, CENTER); textSize(opts.nameSize || 18); text(opts.names ? opts.names[i] : String(i), nodes[i][0], nodes[i][1]);
  }
  return hits;
}
function drawMatrix(a, x, y, cw, ch, names, opts) {   // 行列を色つきの表で（濃い = 大きい）
  opts = opts || {}; let d = opts.digits === undefined ? 2 : opts.digits, n = a.length, m = a[0].length, hi = opts.hi || 1;
  textAlign(CENTER, CENTER); textSize(opts.ts || 13);
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
    let v = a[i][j], t = clampv(Math.abs(v) / hi, 0, 1); noStroke();
    fill(48 + t * (TEAL[0] - 48), 42 + t * (TEAL[1] - 42), 40 + t * (TEAL[2] - 40)); rect(x + j * cw, y + i * ch, cw - 2, ch - 2, 3);
    fill(...CREAM); text(fmtN(v, d), x + j * cw + cw / 2, y + i * ch + ch / 2);
  }
  if (names) { fill(...SUB); for (let i = 0; i < n; i++) { textAlign(RIGHT, CENTER); text(names[i], x - 6, y + i * ch + ch / 2); } for (let j = 0; j < m; j++) { textAlign(CENTER, BOTTOM); text(names[j], x + j * cw + cw / 2, y - 3); } }
}
// ---- グラフの道具：g = { x, y, w, h, x0, x1, y0, y1 }
function gX(g, v) { return g.x + clampv((v - g.x0) / (g.x1 - g.x0), -0.02, 1.02) * g.w; }
function gY(g, v) { return g.y + g.h - clampv((v - g.y0) / (g.y1 - g.y0), -0.02, 1.02) * g.h; }
function plotAxes(g, xl, yl, xt, yt) {
  stroke(84, 76, 70); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h);
  noStroke(); fill(...SUB); textSize(12); textAlign(CENTER, TOP);
  for (let v of xt) text(+v.toPrecision(3), gX(g, v), g.y + g.h + 4);
  textAlign(RIGHT, CENTER);
  for (let v of yt) text(+v.toPrecision(3), g.x - 5, gY(g, v));
  textAlign(LEFT, BASELINE); fill(...CREAM); textSize(13);
  text(xl, g.x + g.w - textWidth(xl), g.y + g.h + 30); text(yl, g.x, g.y - 8);
}
function polyline(pts) {               // 点が 2 つ以上あるときだけ折れ線を描く（空の beginShape を作らない）
  if (pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape();
}
function drawCurve(g, arr, col, sw, xOff) {   // arr[i] を x = i (+ xOff) に。長いときは間引いて 600 点まで
  let n = arr.length, stride = Math.max(1, Math.ceil(n / 600)), pts = [];
  for (let i = 0; i < n; i += stride) pts.push([gX(g, i + (xOff || 0)), gY(g, arr[i])]);
  if (n > 1 && (n - 1) % stride) pts.push([gX(g, n - 1 + (xOff || 0)), gY(g, arr[n - 1])]);
  stroke(...col); strokeWeight(sw || 2); polyline(pts);
}
function legend(x, y, items) {         // items = [[色, 名前], …]
  textSize(13); textAlign(LEFT, CENTER);
  for (let [c, s] of items) { noStroke(); fill(...c); rect(x, y - 5, 16, 10); fill(...CREAM); text(s, x + 22, y); y += 20; }
}
function drawBars(x, y, w, h, vals, cols, top, names) {   // 棒グラフ（top = 縦軸の上限）
  let n = vals.length, bw = w / n;
  stroke(84, 76, 70); strokeWeight(1); line(x, y + h, x + w, y + h); noStroke();
  for (let i = 0; i < n; i++) {
    let c = cols[i % cols.length], hh = clampv(vals[i] / (top || 1), 0, 1) * h; fill(...c); rect(x + i * bw + bw * 0.12, y + h - hh, bw * 0.76, hh, 3);
    if (names) { fill(...SUB); textSize(12); textAlign(CENTER, TOP); text(names[i], x + i * bw + bw / 2, y + h + 4); }
  }
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) || ArrayBuffer.isView(v) ? Array.from(v).every(noNaN) : !(typeof v === 'number' && !isFinite(v)); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(120, 220, 190) : color(255, 90, 90)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
