// ============================================
// 07 トランプは何回切ればよい？ ─ リフルシャッフル（山を 2 つに分けて、ぱらぱらと交互に落とす）を何回すれば「よく混ざる」？
// GSR モデル：分ける枚数は 2 項分布、落とすときは「残りの枚数に比例した確率」で左右の山から 1 枚ずつ。
// k 回切った後に並びが σ になる確率は「上昇列の数 r」だけで決まる：C(n + 2^k − r, n) / 2^(kn)
//   上昇列 = 1, 2, 3, … と番号順に拾っていくとき、何回目でぜんぶ拾えるか（1 回 = 切る前のまま）
// これで「完全にばらばら（どの並びも 1/n!）」との全変動距離を 52 枚でぴったり計算できる → 7 回あたりで急に小さくなる（カットオフ）
// スペース 1 回切る / R 新しいデッキ / ↑↓ グラフで強調する枚数 n / 1 2 3 小さいデッキ（4・5・6 枚）の総当たりの表
// ============================================

const DECK = 52;                         // ★ 画面のデッキの枚数
const MAX_K = 14;                        // ★ グラフの最大の回数
let deck = [], decks = [], tvCache = {}, nShow = 52, smallN = 5, brute = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  seedRng(7); newDeck(); makeBrute(smallN);
}
function newDeck() { deck = []; for (let i = 0; i < DECK; i++) deck.push(i); decks = [deck.slice()]; }
// ★ GSR のリフルシャッフル 1 回
function riffle(d) {
  let c = 0; for (let i = 0; i < d.length; i++) if (rnd() < 0.5) c++;        // 上の山の枚数 ~ 2 項分布
  let left = d.slice(0, c), right = d.slice(c), out = [], a = 0, b = 0;
  while (a < left.length || b < right.length) {
    let L = left.length - a, R = right.length - b;
    if (rnd() < L / (L + R)) out.push(left[a++]); else out.push(right[b++]);   // 残りの枚数に比例して落とす
  }
  return out;
}
function risingSeqs(d) {                 // 上昇列の数：カード i + 1 がカード i より前にあるたびに 1 つ増える
  let where = []; d.forEach((c, k) => (where[c] = k)); let r = 1;
  for (let i = 0; i + 1 < d.length; i++) if (where[i + 1] < where[i]) r++;
  return r;
}
// ★ オイラー数の割合 e(n, r) = （上昇列が r 個の並びの数）/ n!：e(n, r) = [r e(n−1, r) + (n − r + 1) e(n−1, r−1)] / n
function eulerFrac(n) {
  let e = [1]; // n = 1：r = 1 だけ（e[0] が r = 1）
  for (let m = 2; m <= n; m++) { let f = new Array(m).fill(0); for (let r = 1; r <= m; r++) f[r - 1] = ((r <= m - 1 ? r * e[r - 1] : 0) + (r >= 2 ? (m - r + 1) * e[r - 2] : 0)) / m; e = f; }
  return e;
}
// ★ k 回後の全変動距離（ぴったり）：½ Σ_r e(n, r) |n! × 確率 − 1|、n! × 確率 = Π_{j=1..n} (a − r + j) / a、a = 2^k
function tvExact(n, k) {
  let key = n + ',' + k; if (tvCache[key] !== undefined) return tvCache[key];
  let e = eulerFrac(n), a = Math.pow(2, k), s = 0;
  for (let r = 1; r <= n; r++) { let prod = 1; for (let j = 1; j <= n; j++) prod *= (a - r + j) / a; s += e[r - 1] * Math.abs(prod - 1); }
  return (tvCache[key] = s / 2);
}
// 総当たり（小さいデッキ）：n! 通りの並びの確率を、1 回ごとに 2^n 通りの落とし方で全部計算して更新する
function permsOf(n) { let out = [[]]; for (let m = 0; m < n; m++) { let nx = []; for (let p of out) for (let k = 0; k <= p.length; k++) nx.push(p.slice(0, k).concat([m], p.slice(k))); out = nx; } return out; }
function bruteTV(n, kMax) {
  let ps = permsOf(n), idx = new Map(ps.map((p, i) => [p.join(','), i])), dist = new Array(ps.length).fill(0), res = [];
  dist[idx.get(Array.from({ length: n }, (_, i) => i).join(","))] = 1;   // 最初は番号順
  let nxt = ps.map((p) => { let m = new Array(1 << n); for (let bits = 0; bits < 1 << n; bits++) { let c = 0; for (let i = 0; i < n; i++) if (!(bits >> i & 1)) c++; let left = p.slice(0, c), right = p.slice(c), out = [], a = 0, b = 0; for (let i = 0; i < n; i++) out.push(bits >> i & 1 ? right[b++] : left[a++]); m[bits] = idx.get(out.join(',')); } return m; });
  for (let k = 1; k <= kMax; k++) {      // 2^n 通りの 0/1 の列（0 = 上の山から、1 = 下の山から）がどれも確率 1/2^n = GSR モデル
    let nd = new Array(ps.length).fill(0);
    for (let i = 0; i < ps.length; i++) if (dist[i] > 0) for (let m of nxt[i]) nd[m] += dist[i] / (1 << n);
    dist = nd; res.push(tvDist(dist, new Array(ps.length).fill(1 / ps.length)));
  }
  return res;
}
function makeBrute(n) { brute = { n, tv: bruteTV(n, 8) }; }

function draw() {
  background(...BG);
  hudTitle('トランプは何回切ればよい？　いま ' + (decks.length - 1) + ' 回、上昇列 ' + risingSeqs(deck) + ' 個', 'スペース 1 回切る　R 新しいデッキ　↑↓ グラフの n = ' + nShow + '　1 2 3 総当たりの表（4・5・6 枚）');

  // ---- デッキの帯（1 段 = 1 回切った後の並び。色 = 最初の位置）
  let x0 = 40, y0 = 100, cw = Math.min(10, (width * 0.45) / DECK), rh = Math.min(26, (height * 0.62) / 16);
  noStroke(); fill(...CREAM); textSize(14); textAlign(LEFT, BASELINE); text('1 段 = 1 回切った後の並び（色 = 最初の位置。虹色がばらばらになれば混ざった）', x0, y0 - 6);
  colorMode(HSB, 360, 100, 100);
  decks.slice(-16).forEach((d, row) => { for (let i = 0; i < d.length; i++) { fill((d[i] / DECK) * 300, 70, 95); rect(x0 + i * cw, y0 + row * rh, cw - 1, rh - 3); } });
  colorMode(RGB, 255);
  decks.slice(-16).forEach((d, row) => { fill(...SUB); textSize(11); textAlign(LEFT, CENTER); text((decks.length > 16 ? decks.length - 16 : 0) + row + ' 回　上昇列 ' + risingSeqs(d), x0 + DECK * cw + 8, y0 + row * rh + rh / 2 - 1); });

  // ---- 全変動距離のグラフ（ぴったり計算）
  let gx = width * 0.55, g = { x: gx, y: 120, w: Math.min(520, width - gx - 40), h: height * 0.4, x0: 0, x1: MAX_K, y0: 0, y1: 1 };
  plotAxes(g, 'リフルシャッフルの回数 k', '完全にばらばらとの全変動距離（ぴったり）', [0, 2, 4, 6, 8, 10, 12, 14], [0, 0.5, 1]);
  [[13, PLUM], [26, TEAL], [52, DICE], [104, MUSTARD]].forEach(([n, col]) => {
    let pts = []; for (let k = 0; k <= MAX_K; k++) pts.push([gX(g, k), gY(g, tvExact(n, k))]);
    stroke(...col); strokeWeight(n === nShow ? 4 : 1.5); polyline(pts);
  });
  if (![13, 26, 52, 104].includes(nShow)) { let pts = []; for (let k = 0; k <= MAX_K; k++) pts.push([gX(g, k), gY(g, tvExact(nShow, k))]); stroke(...CREAM); strokeWeight(3); polyline(pts); }
  legend(g.x + g.w - 110, g.y + 20, [[PLUM, '13 枚'], [TEAL, '26 枚'], [DICE, '52 枚'], [MUSTARD, '104 枚']]);
  let kNow = Math.min(MAX_K, decks.length - 1); noStroke(); fill(...CREAM); circle(gX(g, kNow), gY(g, tvExact(nShow, kNow)), 10);
  // 数の表
  let ty = g.y + g.h + 60; fill(...CREAM); textSize(14); textAlign(LEFT, BASELINE); text(nShow + ' 枚：', gx, ty);
  for (let k = 1; k <= 10; k++) { let v = tvExact(nShow, k); fill(...(v < 0.25 ? TEAL : v > 0.9 ? DICE : MUSTARD)); text(k + ' 回 ' + fmtN(v, 3), gx + 54 + ((k - 1) % 5) * 92, ty + Math.floor((k - 1) / 5) * 22); }
  // 総当たりとの比較
  let by = ty + 70; fill(...CREAM); textSize(14); text(brute.n + ' 枚（' + [1, 1, 2, 6, 24, 120, 720][brute.n] + ' 通りの並び）：総当たり vs 上昇列の式', gx, by);
  for (let k = 1; k <= 5; k++) { fill(...SUB); textSize(13); text(k + ' 回　総当たり ' + fmtN(brute.tv[k - 1], 6) + '　式 ' + fmtN(tvExact(brute.n, k), 6), gx, by + k * 20); }
  drawSelfTest(width - 180, height - 14);
}

function keyPressed() {
  if (key === ' ') { deck = riffle(deck); decks.push(deck.slice()); }
  if (key === 'r' || key === 'R') newDeck();
  let opts = [4, 8, 13, 20, 26, 52, 104];
  if (key === UP_ARROW) nShow = opts[Math.min(opts.length - 1, opts.indexOf(nShow) + 1)];
  if (key === DOWN_ARROW) nShow = opts[Math.max(0, opts.indexOf(nShow) - 1)];
  if (key === '1' || key === '2' || key === '3') { smallN = 3 + Number(key); makeBrute(smallN); }
  return false;
}

// ============================================
// やってみよう
// 1. スペースを 7 回押して、虹色がどれくらい崩れるか見よう。3 回だとまだ色のかたまりが見える
// 2. 上昇列の数は 1 回切るごとに最大 2 倍。52 枚がばらばら（上昇列 ≈ 26）になるには何回？
// 3. 枚数を 2 倍（104 枚）にすると、必要な回数は 1 回くらいしか増えない（約 1.5 log₂ n）
// 4. 本物のリフルは GSR モデルより「交互に落ちやすい」。riffle() の L / (L + R) を変えると？
// ============================================

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let worst = 0;
  for (let n = 2; n <= 6; n++) { let b = bruteTV(n, 6); for (let k = 1; k <= 6; k++) worst = Math.max(worst, Math.abs(b[k - 1] - tvExact(n, k))); }
  check('n = 2〜6 枚、1〜6 回：総当たりの全変動距離 = 上昇列の式（ずれ ' + worst.toExponential(1) + '）', worst < 1e-12);
  let e52 = eulerFrac(52), okSum = true;
  for (let k = 0; k <= 12; k++) { let a = Math.pow(2, k), s = 0; for (let r = 1; r <= 52; r++) { let pr = 1; for (let j = 1; j <= 52; j++) pr *= (a - r + j) / a; s += e52[r - 1] * pr; } if (Math.abs(s - 1) > 1e-9) okSum = false; }
  check('52 枚：全部の並びの確率の合計 = 1（k = 0〜12）', okSum && near(sumOf(e52), 1, 1e-12));
  let dec = true; for (let k = 1; k <= 14; k++) if (tvExact(52, k) > tvExact(52, k - 1) + 1e-15) dec = false;
  check('52 枚：全変動距離は回数とともに減る', dec);
  check('52 枚：7 回 = ' + fmtN(tvExact(52, 7), 3) + '（ベイヤー-ダイアコニスの表 0.334）、6 回 0.614、8 回 0.167', near(tvExact(52, 7), 0.334, 6e-4) && near(tvExact(52, 6), 0.614, 6e-4) && near(tvExact(52, 8), 0.167, 6e-4));
  check('52 枚：4 回まではほぼ 1（> 0.99）、10 回で < 0.05', tvExact(52, 4) > 0.99 && tvExact(52, 10) < 0.05);
  seedRng(77); let cnt = [0, 0, 0, 0], runs = 40000;   // 4 枚を 1 回：上昇列 1 個 = 5/16、2 個 = 11/16
  for (let t = 0; t < runs; t++) cnt[risingSeqs(riffle([0, 1, 2, 3])) - 1]++;
  check('4 枚を 1 回（シミュレーション 4 万回）：上昇列 1 個 ≈ 5/16、2 個 ≈ 11/16', near(cnt[0] / runs, 5 / 16, 0.01) && near(cnt[1] / runs, 11 / 16, 0.01) && cnt[2] === 0);
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
