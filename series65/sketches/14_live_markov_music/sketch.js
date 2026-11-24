// ============================================
// 14 その場で学ぶマルコフ音楽 🔊 ─ キーボードの A S D F G H J K がドレミファソラシド。
// あなたが弾いた「この音の次にこの音」を数えて、遷移行列をその場で学ぶ（右の表がどんどん変わる）。
// スペースを押すと、学んだ連鎖が即興で演奏する。よく使った音 = 定常分布 π、迷いの大きさ = エントロピー率（ビット / 音）。
// （series7/08 はお手本の曲から学ぶ。ここではあなたの演奏から学び、行列と定常分布が見える）
// A〜K 弾く / スペース 連鎖の即興 ON/OFF / C 忘れる / 1 お手本のフレーズを学ばせる / ↑↓ テンポ
// 音量は小さめから。全体の音量 MASTER は 0.2 以下
// ============================================

const KEYS = 'asdfghjk';                 // ★ 弾くキー（左から ド レ ミ ファ ソ ラ シ ド）
const NOTE_NAMES = ['ド', 'レ', 'ミ', 'ファ', 'ソ', 'ラ', 'シ', 'ド↑'];
const MIDI = [60, 62, 64, 65, 67, 69, 71, 72];   // ★ 音の高さ（MIDI 番号、60 = 真ん中のド）
const ADD_EPS = 0.02;                     // ★ まだ弾いていないつながりにも少しだけ確率を（0 にすると一度も弾いていない動きはしない）
const DEMO = 'ドレミドレミソミレドレミレド';   // 1 キーで学ばせるお手本（ドレミのフレーズ）
let counts, lastPlayed = -1, userNotes = [], chainNotes = [], improv = false, chainCur = -1, nextAt = 0, beatMs = 320, flash = [], learnedP, piVec, hRate = 0, msg = '';

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  seedRng(14); clearAll();
}
function clearAll() { counts = zerosMat(8); lastPlayed = -1; userNotes = []; chainNotes = []; improv = false; flash = new Array(8).fill(0); relearn(); }
// ★ 数 → 確率：(数 + ADD_EPS) / 行の合計。まだ 1 回も弾いていない行は全部同じ確率
function probFromCounts(c, eps) {
  return c.map((r) => { let s = sumOf(r) + eps * r.length; return s > 0 ? r.map((v) => (v + eps) / s) : r.map(() => 1 / r.length); });
}
function relearn() { learnedP = probFromCounts(counts, ADD_EPS); piVec = stationaryExact(learnedP) || new Array(8).fill(1 / 8); hRate = entropyRate(learnedP, piVec); }
function learnNote(c, last, n) { if (last >= 0) c[last][n]++; return n; }    // 前の音 → この音 を 1 回数える
function totalCount(c) { let s = 0; for (let r of c) s += sumOf(r); return s; }
function sound(n) { startAudio(); if (audioCtx) playNote(midiHz(MIDI[n]), audioCtx.currentTime + 0.01, 0.4, 'triangle'); flash[n] = 1; }
function playByUser(n) { lastPlayed = learnNote(counts, lastPlayed, n); userNotes.push(n); if (userNotes.length > 40) userNotes.shift(); sound(n); relearn(); }

function draw() {
  background(...BG);
  if (improv && millis() >= nextAt) {     // 連鎖が 1 音すすめる：今の音の行からサイコロ
    chainCur = chainCur < 0 ? sampleFrom(piVec) : sampleFrom(learnedP[chainCur]);
    chainNotes.push(chainCur); if (chainNotes.length > 40) chainNotes.shift(); sound(chainCur); nextAt = millis() + beatMs;
  }
  hudTitle('その場で学ぶマルコフ音楽：学んだつながり ' + totalCount(counts) + ' 回　' + (improv ? '連鎖が即興中 ♪' : ''),
    'A S D F G H J K 弾く　スペース 即興 ON/OFF　C 忘れる　1 お手本を学ばせる　↑↓ テンポ ' + Math.round(60000 / beatMs) + '　音量は小さめから');
  // ---- 鍵盤
  let kx = 40, ky = 100, kw = Math.min(70, (width * 0.5 - 40) / 8), kh = 150;
  for (let n = 0; n < 8; n++) {
    flash[n] *= 0.9; let c = STATE_COLS[n];
    stroke(...BG); strokeWeight(3); fill(236, 228, 210); if (flash[n] > 0.05) fill(c[0], c[1], c[2]);   // 鳴った鍵は音の色に光る
    rect(kx + n * kw, ky, kw, kh, 0, 0, 8, 8);
    noStroke(); fill(40); textSize(16); textAlign(CENTER, BASELINE); text(NOTE_NAMES[n], kx + n * kw + kw / 2, ky + kh - 30);
    fill(110); textSize(14); text(KEYS[n].toUpperCase(), kx + n * kw + kw / 2, ky + kh - 10);
  }
  // ---- 演奏の帯（あなた・連鎖）
  let ry = ky + kh + 50, rw = 8 * kw;
  ribbon(userNotes, kx, ry, rw, 'あなたの演奏（最近 40 音）');
  ribbon(chainNotes, kx, ry + 120, rw, '連鎖の即興（最近 40 音）');
  if (msg && millis() < 3000 + nextAt) { noStroke(); fill(...DICE); textSize(15); textAlign(LEFT, BASELINE); text(msg, kx, ry + 250); }
  // ---- 遷移行列
  let mx = width * 0.56, my = 120, cw = Math.min(54, (width - mx - 50) / 8.4);
  noStroke(); fill(...CREAM); textSize(15); textAlign(LEFT, BASELINE); text('学んだ遷移行列 P（行 = 今の音、列 = 次の音）', mx, my - 30);
  drawMatrix(learnedP, mx + 34, my, cw, 26, NOTE_NAMES, { ts: 11, hi: 0.8 });
  if (lastPlayed >= 0) { noFill(); stroke(...DICE); strokeWeight(2); rect(mx + 34, my + lastPlayed * 26, 8 * cw - 2, 24, 3); }
  // ---- 定常分布
  let sy = my + 8 * 26 + 50;
  noStroke(); fill(...CREAM); textSize(15); textAlign(LEFT, BASELINE); text('定常分布 π（連鎖が長く弾くと、各音をどれだけ使うか）', mx, sy);
  drawBars(mx + 34, sy + 10, 8 * cw, 110, piVec, STATE_COLS, Math.max(0.3, ...piVec), NOTE_NAMES);
  let ty = sy + 160; fill(...CREAM); textSize(15); textAlign(LEFT, BASELINE);
  text('エントロピー率 H = ' + fmtN(hRate, 2) + ' ビット / 音（でたらめなら log₂ 8 = 3）', mx, ty);
  fill(...SUB); textSize(13);
  text('同じフレーズばかり弾く → H が小さい（次が読める）。いろいろ弾く → H が大きい', mx, ty + 22);
  drawSelfTest(width - 180, height - 14);
}
function ribbon(arr, x, y, w, title) {   // 音の並び：高さ = 音の高さ、色 = 音
  noStroke(); fill(...SUB); textSize(13); textAlign(LEFT, BASELINE); text(title, x, y - 8);
  fill(46, 41, 38); rect(x, y, w, 90, 6);
  let bw = w / 40;
  for (let i = 0; i < arr.length; i++) { fill(...STATE_COLS[arr[i]]); rect(x + i * bw + 1, y + 80 - arr[i] * 10, bw - 2, 8, 2); }
}

function keyPressed() {
  let n = KEYS.indexOf(String(key).toLowerCase());
  if (n >= 0 && String(key).length === 1) { playByUser(n); return false; }
  if (key === ' ') {
    startAudio();
    if (totalCount(counts) === 0) { improv = false; msg = 'まだ何も学んでいません。A〜K で何音か弾いてから（または 1 キー）'; nextAt = millis(); return false; }
    improv = !improv; chainCur = lastPlayed; nextAt = millis(); msg = '';
  }
  if (key === 'c' || key === 'C') clearAll();
  if (key === '1') { let prev = lastPlayed; for (let n2 of demoIndices()) prev = learnNote(counts, prev, n2); lastPlayed = prev; relearn(); }
  if (key === UP_ARROW) beatMs = Math.max(120, beatMs - 40);
  if (key === DOWN_ARROW) beatMs = Math.min(800, beatMs + 40);
  return false;
}
function demoIndices() { return Array.from(DEMO).map((ch) => ['ド', 'レ', 'ミ', 'フ', 'ソ', 'ラ', 'シ'].indexOf(ch)).filter((v) => v >= 0); }

// やってみよう
// 1. 「ドレミ」だけをくり返し弾いて即興させよう。行列とエントロピー率はどうなる？
// 2. ADD_EPS を 0 にすると、弾いたことのないつながりは二度と出ない。0.2 にすると？
// 3. 自分の好きな曲の出だしを弾いて学ばせ、連鎖の即興が「似ている」か聞きくらべよう
// 4. MIDI を別の音階（例：60, 63, 65, 67, 70, 72, 75, 77 = ブルース風）に変えてみよう

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(140);
  let c = zerosMat(8), last = -1, seq = [0, 1, 2, 0, 1, 2, 4, 2, 1, 0];
  for (let n of seq) last = learnNote(c, last, n);
  check('数えたつながり = 弾いた音の数 − 1（' + (seq.length - 1) + '）、2 → 1 は 1 回', totalCount(c) === seq.length - 1 && c[2][1] === 1 && c[0][1] === 2);
  let pe = probFromCounts(zerosMat(8), ADD_EPS), pie = stationaryExact(pe);
  check('何も学んでいないとき：P は全部 1/8、π も 1/8、H = 3 ビット（NaN なし）', noNaN(pe) && maxAbsDiff(pe, zerosMat(8).map((r) => r.map(() => 1 / 8))) < 1e-12 && maxAbsDiff(pie, new Array(8).fill(1 / 8)) < 1e-12 && near(entropyRate(pe, pie), 3, 1e-12));
  let pz = probFromCounts(zerosMat(8), 0);
  check('ADD_EPS = 0 でも空の行は等しい確率（0 で割らない）', noNaN(pz) && rowSumErr(pz) < 1e-12);
  let p = probFromCounts(c, ADD_EPS);
  check('学んだ P の各行の合計 = 1', rowSumErr(p) < 1e-12);
  let pi = stationaryExact(p), pw = stationaryPower(p, 1e-14).pi;
  check('定常分布：連立方程式 = べき乗法', maxAbsDiff(pi, pw) < 1e-10);
  let cyc = zerosMat(8); last = -1; for (let k = 0; k < 30; k++) last = learnNote(cyc, last, k % 3);
  let pc = probFromCounts(cyc, 0), pic = stationaryPower(pc, 1e-15, 100000, [1 / 3, 1 / 3, 1 / 3, 0, 0, 0, 0, 0]).pi;
  check('「ドレミ」のくり返し（ADD_EPS = 0）：π = 1/3 ずつ、H = 0 ビット', maxAbsDiff(pic.slice(0, 3), [1 / 3, 1 / 3, 1 / 3]) < 1e-12 && near(entropyRate(pc, pic), 0, 1e-12));
  let cur = 0, freq = new Array(8).fill(0), nS = 40000;
  for (let t = 0; t < nS; t++) { cur = sampleFrom(p[cur]); freq[cur]++; }
  check('連鎖に 4 万音弾かせた割合 ≈ π（ずれ < 0.01）', maxAbsDiff(freq.map((v) => v / nS), pi) < 0.01);
  check('エントロピー率 0 ≤ H = ' + fmtN(entropyRate(p, pi), 3) + ' ≤ log₂ 8', entropyRate(p, pi) >= 0 && entropyRate(p, pi) <= 3 + 1e-12);
  check('お手本のフレーズ ' + demoIndices().length + ' 音を読めた', demoIndices().length === 14);
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
// ---- 音の道具（Web Audio）。全体の音量 MASTER は 0.2 以下
const MASTER = 0.12;                   // ★ 全体の音量（0.2 以下にしておく）
let audioCtx = null, masterOut = null;
function startAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    masterOut = audioCtx.createGain(); masterOut.gain.value = Math.min(0.2, MASTER); masterOut.connect(audioCtx.destination);
  }
  audioCtx.resume();
}
function playNote(freq, when, dur, wave) {   // 1 音（やわらかく立ち上がって消える）
  if (!audioCtx) return;
  let o = audioCtx.createOscillator(), gn = audioCtx.createGain();
  o.type = wave || 'triangle'; o.frequency.setValueAtTime(freq, when);
  gn.gain.setValueAtTime(0.0001, when); gn.gain.exponentialRampToValueAtTime(0.6, when + 0.02);
  gn.gain.exponentialRampToValueAtTime(0.001, when + dur);
  o.connect(gn); gn.connect(masterOut); o.start(when); o.stop(when + dur + 0.05);
}
function midiHz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) || ArrayBuffer.isView(v) ? Array.from(v).every(noNaN) : !(typeof v === 'number' && !isFinite(v)); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(120, 220, 190) : color(255, 90, 90)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
