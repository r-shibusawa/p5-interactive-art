// ============================================
// 01 n ステップ後の分布 ─ 「いまどこにいそうか」の確率（分布）に、遷移行列 P を 1 回掛けるごとに 1 歩すすむ
// μ_n = μ_0 P^n。P^n の (i, j) 成分 = i から始めて n 歩後に j にいる確率。
// n を大きくすると P^n のどの行も同じになっていく（どこから始めても同じ分布へ = 始まりを忘れる）。
// チャップマン-コルモゴロフ方程式 P^(m+n) = P^m P^n：「m 歩してから n 歩」= 「m + n 歩」を数値で確かめる
// スペース 1 歩 / A 自動 / R n = 0 に戻す / 1〜4 スタートの場所 / 5 均等にスタート / ↑↓ m（チャップマン-コルモゴロフの m）
// ============================================

const NAMES = ['家', '学校', '公園', '店'];
const transP = [                         // ★ 遷移行列（4 つの場所を 1 時間ごとに移動する人、各行の合計 = 1）
  [0.5, 0.3, 0.1, 0.1],
  [0.2, 0.5, 0.2, 0.1],
  [0.3, 0.0, 0.4, 0.3],
  [0.4, 0.1, 0.2, 0.3],
];
const MAX_N = 40;                        // ★ グラフに描く n の上限
let mu0 = [1, 0, 0, 0], nNow = 0, dists = [], shown = [], powers = [], spreads = [], piVec, auto = true, ckM = 3;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  piVec = stationaryExact(transP);
  powers = [eyeMat(4)]; for (let k = 1; k <= MAX_N; k++) powers.push(matMul(powers[k - 1], transP));   // P^0, P^1, …（くり返し掛ける）
  spreads = powers.map(colSpread);
  restart(mu0);
}
function restart(m) { mu0 = m.slice(); nNow = 0; dists = [mu0.slice()]; shown = mu0.slice(); }
function oneStep() { if (nNow >= MAX_N) return; dists.push(vecMat(dists[nNow], transP)); nNow++; }   // ★ μ_(n+1) = μ_n P
// P^n の各列で「いちばん大きい行 − いちばん小さい行」の最大：0 なら全部の行が同じ
function colSpread(a) { let d = 0; for (let j = 0; j < a.length; j++) { let c = a.map((r) => r[j]); d = Math.max(d, Math.max(...c) - Math.min(...c)); } return d; }

function draw() {
  background(...BG);
  if (auto && frameCount % 40 === 0) oneStep();
  let target = dists[nNow];
  for (let k = 0; k < 4; k++) shown[k] += (target[k] - shown[k]) * 0.15;   // 棒をなめらかに動かす
  hudTitle('n ステップ後の分布：n = ' + nNow + '　μ_n = μ_0 P^n', 'スペース 1 歩　A 自動（' + (auto ? 'ON' : 'OFF') + '）　R n = 0　1〜4 スタートの場所　5 均等にスタート　↑↓ m = ' + ckM);

  // ---- いまの分布（棒）と定常分布（線）
  let bx = 40, by = 120, bw = Math.min(380, width * 0.3), bh = 220;
  noStroke(); fill(...CREAM); textSize(15); textAlign(LEFT, BASELINE); text('分布 μ_' + nNow + '（棒）と、行き着く先 π（白い線）', bx, by - 12);
  drawBars(bx, by, bw, bh, shown, STATE_COLS, 1, NAMES);
  for (let k = 0; k < 4; k++) { let x = bx + (k + 0.5) * (bw / 4), y = by + bh - piVec[k] * bh; stroke(...CREAM); strokeWeight(2); line(x - bw / 8, y, x + bw / 8, y); noStroke(); fill(...CREAM); textSize(13); textAlign(CENTER, BOTTOM); text(fmtN(target[k], 3), x, by + bh - shown[k] * bh - 4); }

  // ---- これまでの分布を積み上げた帯（左 = n 0）
  let sx = bx, sy = by + bh + 70, sw = bw, sh = 120, cw = sw / (MAX_N + 1);
  fill(...CREAM); textSize(14); textAlign(LEFT, BASELINE); text('n = 0, 1, 2, … の分布を並べた帯（縦の長さ = 確率）', sx, sy - 10);
  for (let n = 0; n <= nNow; n++) { let y = sy; for (let k = 0; k < 4; k++) { noStroke(); fill(...STATE_COLS[k]); rect(sx + n * cw, y, Math.max(1, cw - 1), dists[n][k] * sh); y += dists[n][k] * sh; } }
  noFill(); stroke(84, 76, 70); rect(sx, sy, sw, sh);

  // ---- P^n の表
  let mx = bx + bw + 70, my = 120;
  noStroke(); fill(...CREAM); textSize(15); textAlign(LEFT, BASELINE); text('P^' + nNow + '（行 = スタート、列 = n 歩後）', mx, my - 26);
  drawMatrix(powers[nNow], mx + 44, my, 62, 30, NAMES, { ts: 13, digits: 3 });
  fill(...SUB); textSize(13); textAlign(LEFT, BASELINE);
  text('n が大きいと、どの行も π = (' + piVec.map((v) => fmtN(v, 3)).join(', ') + ') に', mx, my + 4 * 30 + 24);

  // ---- 行のちがい（対数）
  let g = { x: mx + 40, y: my + 200, w: Math.min(440, width - mx - 90), h: 170, x0: 0, x1: MAX_N, y0: -16, y1: 0 };
  plotAxes(g, 'n', 'log₁₀（P^n の行どうしの最大のちがい）', [0, 10, 20, 30, 40], [-16, -8, 0]);
  drawCurve(g, spreads.map((d) => Math.log10(Math.max(d, 1e-16))), TEAL, 2.5);
  noStroke(); fill(...DICE); circle(gX(g, nNow), gY(g, Math.log10(Math.max(spreads[nNow], 1e-16))), 10);

  // ---- チャップマン-コルモゴロフ
  let ckN = Math.max(1, nNow), lhs = powers[Math.min(MAX_N, ckM + ckN)] || matPow(transP, ckM + ckN), rhs = matMul(powers[ckM], powers[ckN]);
  let cy = g.y + g.h + 64;
  fill(...CREAM); textSize(16); textAlign(LEFT, BASELINE);
  text('チャップマン-コルモゴロフ：P^(' + ckM + '+' + ckN + ') = P^' + ckM + ' × P^' + ckN, mx, cy);
  fill(...MUSTARD); text('いちばん大きなずれ = ' + maxAbsDiff(lhs, rhs).toExponential(1) + '（計算の丸め誤差だけ）', mx, cy + 26);
  fill(...SUB); textSize(13); text('「m 歩後にどこかの k にいて、そこから n 歩」を全部の k で足すと m + n 歩後', mx, cy + 50);
  drawSelfTest(width - 180, height - 14);
}

function keyPressed() {
  if (key === ' ') oneStep();
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'r' || key === 'R') restart(mu0);
  if (key >= '1' && key <= '4') { let m = [0, 0, 0, 0]; m[Number(key) - 1] = 1; restart(m); }
  if (key === '5') restart([0.25, 0.25, 0.25, 0.25]);
  if (key === UP_ARROW) ckM = Math.min(20, ckM + 1);
  if (key === DOWN_ARROW) ckM = Math.max(0, ckM - 1);
  return false;
}

// ============================================
// やってみよう
// 1. 1〜4 でスタートを変えても、n = 20 くらいで棒はいつも同じ高さ（π）になる？
// 2. transP の 1 行を [0, 0, 0, 1] にしたり、家 ⇔ 学校 だけを行き来する行列にすると、行はそろう？（03 の分類へ）
// 3. ログのグラフはほぼ直線 = ちがいが毎回ほぼ同じ割合で縮む。その割合は P の 2 番目に大きい固有値の大きさ
// 4. ↑↓ で m を変えて、P^(m+n) と P^m P^n のずれがいつも 10⁻¹⁶ くらいなのを見よう
// ============================================

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  check('遷移行列の各行の合計 = 1', rowSumErr(transP) < 1e-12);
  let pw = [eyeMat(4)]; for (let k = 1; k <= 60; k++) pw.push(matMul(pw[k - 1], transP));
  check('P^n（n = 1〜60）の各行の合計 = 1', pw.every((a) => rowSumErr(a) < 1e-12));
  let ck = 0; for (let m = 0; m <= 10; m++) for (let n = 0; n <= 10; n++) ck = Math.max(ck, maxAbsDiff(pw[m + n], matMul(pw[m], pw[n])));
  check('チャップマン-コルモゴロフ P^(m+n) = P^m P^n（m, n ≤ 10、ずれ ' + ck.toExponential(1) + '）', ck < 1e-12);
  let mu = [0.1, 0.2, 0.3, 0.4], v = mu.slice(); for (let k = 0; k < 12; k++) v = vecMat(v, transP);
  check('μ に P を 12 回掛ける = μ P^12', maxAbsDiff(v, vecMat(mu, pw[12])) < 1e-14);
  let pi = stationaryExact(transP);
  check('P^60 のどの行も定常分布 π（ずれ < 10⁻¹⁰）', pw[60].every((r) => maxAbsDiff(r, pi) < 1e-10));
  let mono = true; for (let k = 1; k <= 60; k++) if (colSpread(pw[k]) > colSpread(pw[k - 1]) + 1e-15) mono = false;
  check('行どうしのちがいは n とともに増えない（列の幅が縮む）', mono);
  seedRng(11); let cnt = [0, 0, 0, 0], runs = 40000;   // シミュレーション：家から 5 歩後にどこにいる？
  for (let r = 0; r < runs; r++) { let s = 0; for (let t = 0; t < 5; t++) s = sampleFrom(transP[s]); cnt[s]++; }
  check('家から 5 歩のシミュレーション（4 万回）≈ P^5 の 1 行目（ずれ < 0.01）', maxAbsDiff(cnt.map((c) => c / runs), pw[5][0]) < 0.01);
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
