// ============================================
// 10 ランダム化と多様性 ─ 木の作り方にどれだけ「でたらめ」を入れるかで、木どうしの似かたと強さが変わる
// バギング（点をブートストラップ）、ランダム部分空間（木ごとに特徴量を 2 つだけ）、Extra Trees（しきい値まで乱数で決める）
//   左 = κ-誤差図：木の組 1 つが点 1 つ。横 = κ（偶然を差し引いた一致度。1 = 同じ答え、0 = 偶然と同じくらい）、縦 = 2 本の平均の誤差
//   左下ほど「ちがうのに、それぞれ正確」。右 = Extra Trees の試す候補の数 K を減らす（でたらめを強くする）と…
//   1 本ずつは弱くなる（赤）のに、30 本の多数決（金）はほとんど落ちない／むしろ上がる範囲がある。多様性（青緑）が上がるから
//   特徴量 = 2 つの役に立つもの（三日月）+ 関係ない乱数。ランダムフォレスト（分割ごとに特徴量を選ぶ）は series62/09
// スペース 一時停止 / ← → 関係ない特徴量の数 / R やり直す
// ============================================

let nNoise = 2, nTrain = 300, nTest = 1000, seedD = 3, paused = false;   // ★ 関係ない特徴量の数
const N_TREES = 30, SWEEP_K = [64, 16, 4, 2, 1];                          // ★ 木の本数、Extra Trees の候補の数 K
const METHODS = [{ name: 'バギング', col: [236, 214, 160] }, { name: 'ランダム部分空間（2 つ）', col: [110, 165, 240] }, { name: 'Extra Trees（K = 2）', col: [64, 186, 176] }, { name: '完全にランダム（K = 1）', col: [196, 72, 96] }];
let trainD, testD, groups = [], sweep = [], allIdx;

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); pixelDensity(1); selfTest(); restart(); }
function makeHD(n, seed) { let D = makeData2D(4, n, 0.1, seed); seedRng(seed + 7); D.X = D.X.map((x) => x.concat(Array.from({ length: nNoise }, () => rnd()))); return D; }
function restart() {
  paused = false;
  trainD = makeHD(nTrain, seedD); testD = makeHD(nTest, seedD + 1); allIdx = trainD.X.map((_, i) => i);
  seedRng(seedD * 31); groups = METHODS.map(() => newGroup()); sweep = SWEEP_K.map(() => newGroup());
}
function newGroup() { return { preds: [], pairs: [], votes: new Float32Array(nTest) }; }
// ★ 方法ごとの木の作り方（でたらめの入れ方）
function makeTree(m, K) {
  let d = trainD.X[0].length, all = Array.from({ length: d }, (_, f) => f);
  if (m === 0) return growRT(trainD.X, trainD.y, bootIdx(nTrain), 0, {});                                   // バギング
  if (m === 1) return growRT(trainD.X, trainD.y, allIdx, 0, { feats: shuffleArr(all).slice(0, Math.min(2, d)) });   // ランダム部分空間
  return growRT(trainD.X, trainD.y, allIdx, 0, { randK: K > 0 ? K : m === 2 ? 2 : 1 });                  // Extra Trees
}
// ★ κ（カッパ）：θ1 = 一致した割合、θ2 = 偶然に一致する割合 = Σ_c p_a(c)·p_b(c)。κ = (θ1 − θ2)/(1 − θ2)
function kappaOf(a, b) {
  let n = a.length, agree = 0, a1 = 0, b1 = 0;
  for (let i = 0; i < n; i++) { if (a[i] === b[i]) agree++; a1 += a[i]; b1 += b[i]; }
  let t1 = agree / n, t2 = (a1 / n) * (b1 / n) + (1 - a1 / n) * (1 - b1 / n);
  return t2 >= 1 - 1e-12 ? 1 : (t1 - t2) / (1 - t2);
}
function errOf(p) { let e = 0; for (let i = 0; i < p.length; i++) if (p[i] !== testD.y[i]) e++; return e / p.length; }
function addTree(gr, m, K) {           // 木を 1 本足し、前の木との組の κ と平均の誤差を記録
  let t = makeTree(m, K), p = Uint8Array.from(testD.X, (x) => (rtProb(t, x) > 0.5 ? 1 : 0)), e = errOf(p);
  for (let q of gr.preds) { let dis = 0; for (let i = 0; i < nTest; i++) if (q.p[i] !== p[i]) dis++; gr.pairs.push({ k: kappaOf(q.p, p), e: (q.e + e) / 2, dis: dis / nTest }); }
  gr.preds.push({ p, e }); for (let i = 0; i < nTest; i++) gr.votes[i] += p[i];
}
function groupStats(gr) {
  let T = gr.preds.length; if (!T) return null;
  let ens = 0; for (let i = 0; i < nTest; i++) if ((2 * gr.votes[i] > T ? 1 : 0) === testD.y[i]) ens++;
  return { ind: 1 - meanOf(gr.preds.map((q) => q.e)), ens: ens / nTest, dis: gr.pairs.length ? meanOf(gr.pairs.map((q) => q.dis)) : 0 };
}

function draw() {
  background(...BG_COL);
  let t0 = performance.now();
  while (!paused && performance.now() - t0 < 7) {   // 1 フレームに 7 ミリ秒ぶん木を育てる
    let gi = groups.findIndex((gr) => gr.preds.length < N_TREES), si = sweep.findIndex((gr) => gr.preds.length < N_TREES);
    if (gi >= 0) addTree(groups[gi], gi, 0); else if (si >= 0) addTree(sweep[si], 2, SWEEP_K[si]); else break;
  }
  // ---- 左：κ-誤差図
  let side = Math.min(height - 190, width * 0.45), g = { x: 70, y: 110, w: side, h: side, x0: -0.2, x1: 1, y0: 0.1, y1: 0.45 };
  plotAxes(g, 'κ（右ほど似ている）', 'κ-誤差図：点 = 木の組（' + N_TREES + ' 本 → ' + (N_TREES * (N_TREES - 1)) / 2 + ' 組）', [-0.2, 0, 0.5, 1], [0.1, 0.2, 0.3, 0.4]);
  noStroke(); groups.forEach((gr, m) => { fill(...METHODS[m].col, 110); for (let q of gr.pairs) circle(gX(g, q.k), gY(g, q.e), 4); });
  textSize(13); text('縦 = 2 本の誤差の平均', g.x + 6, g.y + g.h - 8);
  legend(g.x + g.w - 210, g.y + 16, METHODS.map((m) => [m.col, m.name]));
  // ---- 右上：方法ごとの 1 本の正解率と多数決の正解率
  let rx = g.x + g.w + 80, rw = width - rx - 50, ty = 120;
  noStroke(); fill(...INK); textSize(15); textAlign(LEFT, BASELINE); text('テスト正解率：うすい = 1 本の平均、こい = ' + N_TREES + ' 本の多数決、数字 = 不一致率', rx, ty);
  groups.forEach((gr, m) => {
    let s = groupStats(gr), yy = ty + 20 + 44 * m; if (!s) return;
    fill(...METHODS[m].col, 110); rect(rx + 170, yy, Math.max(1, (s.ind - 0.5) * 2 * (rw - 240)), 16);
    fill(...METHODS[m].col); rect(rx + 170, yy + 18, Math.max(1, (s.ens - 0.5) * 2 * (rw - 240)), 16);
    fill(210, 195, 180); textSize(12); textAlign(RIGHT, CENTER); text(METHODS[m].name, rx + 160, yy + 17);
    textAlign(LEFT, CENTER); text(pctStr(s.ind) + ' → ' + pctStr(s.ens) + '　（' + fmtNum(s.dis, 3) + '）', rx + 176 + (s.ens - 0.5) * 2 * (rw - 240), yy + 26);
  });
  // ---- 右下：Extra Trees の K を変える
  let g2 = { x: rx, y: ty + 44 * 4 + 70, w: rw - 30, h: Math.max(80, height - (ty + 44 * 4 + 70) - 90), x0: 0, x1: SWEEP_K.length - 1, y0: 0, y1: 1 };
  plotAxes(g2, '候補の数 K（右ほどでたらめ）', 'Extra Trees：赤 = 1 本の正解率、金 = 多数決の正解率、青緑 = 不一致率', [], [0, 0.5, 1]);
  noStroke(); fill(175, 160, 150); textSize(12); textAlign(CENTER, TOP); SWEEP_K.forEach((K, k) => text('K=' + K, gX(g2, k), g2.y + g2.h + 4));
  let st = sweep.map(groupStats).map((s, k) => [k, s]).filter((q) => q[1]);
  for (let [key2, c] of [['ind', WINE], ['ens', GOLD], ['dis', TEAL]]) { stroke(...c); strokeWeight(2.5); polyline(st.map(([k, s]) => [gX(g2, k), gY(g2, s[key2])])); noStroke(); fill(...c); for (let [k, s] of st) circle(gX(g2, k), gY(g2, s[key2]), 7); }
  // ---- 文字
  noStroke(); fill(...INK); textSize(20); textAlign(LEFT, BASELINE); text('ランダム化と多様性　特徴量 ' + (2 + nNoise) + ' 個（役に立つのは 2 つ）', 40, 40);
  fill(170, 155, 145); textSize(15); text('スペース 一時停止　← → 関係ない特徴量の数　R やり直す', 40, 66);
  drawSelfTest(width - 170, height - 12);
}
function keyPressed() {
  if (key === ' ') paused = !paused;
  if (key === RIGHT_ARROW) { nNoise = Math.min(8, nNoise + 1); restart(); }
  if (key === LEFT_ARROW) { nNoise = Math.max(0, nNoise - 1); restart(); }
  if (key === 'r' || key === 'R') { seedD++; restart(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let a = [1, 1, 0, 0, 1, 0, 1, 1], b = [1, 0, 0, 0, 1, 1, 1, 0];      // 手計算：一致 5/8、θ2 = (5/8)(4/8) + (3/8)(4/8) = 1/2 → κ = 0.25
  let c = [1, 0, 1, 0, 0, 1];
  check('κ の式：手計算の例で 0.25、同じ答えどうしなら 1、半々の答えの正反対なら −1', near(kappaOf(a, b), 0.25, 1e-12) && near(kappaOf(a, a), 1, 1e-12) && near(kappaOf(c, c.map((v) => 1 - v)), -1, 1e-12));
  restart();
  let g64 = newGroup(), g1 = newGroup(), gb = newGroup();
  for (let t = 0; t < 15; t++) { addTree(g64, 2, 64); addTree(g1, 2, 1); addTree(gb, 0, 0); }
  check('どの組の κ も −1〜1、不一致率は 0〜1（Extra Trees 2 通り × 105 組）', g64.pairs.concat(g1.pairs).every((q) => q.k >= -1 - 1e-12 && q.k <= 1 + 1e-12 && q.dis >= 0 && q.dis <= 1));
  let s64 = groupStats(g64), s1 = groupStats(g1), sb = groupStats(gb);
  check('でたらめを強くする（K = 64 → 1）と 1 本の正解率は下がる（' + pctStr(s64.ind) + ' → ' + pctStr(s1.ind) + '）', s1.ind < s64.ind);
  check('でたらめを強くすると不一致率（多様性）は上がる（' + fmtNum(s64.dis, 3) + ' → ' + fmtNum(s1.dis, 3) + '）', s1.dis > s64.dis);
  check('多数決で伸びる分も大きくなる（K = 64：+' + pctStr(s64.ens - s64.ind) + '、K = 1：+' + pctStr(s1.ens - s1.ind) + '）', s1.ens - s1.ind > s64.ens - s64.ind && s1.ens > s1.ind);
  check('バギングの 15 本の多数決 ' + pctStr(sb.ens) + ' > 1 本の平均 ' + pctStr(sb.ind), sb.ens > sb.ind);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. κ-誤差図で、赤（完全にランダム）の雲はどこにある？ バギング（象牙色）と比べて右左・上下は？
// 2. 右下のグラフで、多数決（金）がいちばん高い K はいくつ？ 1 本の正解率（赤）がいちばん高い K と同じ？
// 3. ← → で関係ない特徴量を増やすと、ランダム部分空間（青）はどうなる？ 役に立つ特徴量を引かない木が増える
// 4. 不一致率が 0 の組は κ = 1。どんな作り方だとそうなる？（でたらめを全部やめると、同じ木しかできない）
// 5. 11 では、木以外のモデルの組で「多様性」をいろいろな物差しで測る

// ==================================================
// ここから下は「アンサンブル学習の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 小さな道具：はさむ・合計・平均・いちばん大きい番号・数の表示
function clampv(v, a, b) { return v < a ? a : v > b ? b : v !== v ? a : v; }     // NaN なら a に戻す
function sumArr(a) { let s = 0; for (let v of a) s += v; return s; }
function meanOf(a) { return a.length ? sumArr(a) / a.length : 0; }
function varOf(a) { let m = meanOf(a), s = 0; for (let v of a) s += (v - m) * (v - m); return a.length ? s / a.length : 0; }   // ÷n の分散
function argMaxArr(a) { let b = 0; for (let i = 1; i < a.length; i++) if (a[i] > a[b]) b = i; return b; }   // 同点なら小さい番号
function sigm(z) { return 1 / (1 + Math.exp(-clampv(z, -40, 40))); }
function fmtNum(v, d) { if (typeof v !== 'number' || !isFinite(v)) return '?'; let s = (+v.toFixed(d === undefined ? 2 : d)).toString(); return s === '-0' ? '0' : s; }
function pctStr(v) { return fmtNum(100 * v, 1) + '%'; }
// ---- 種つきの乱数（同じ種なら毎回同じ列）
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
function rndGauss() { let u = Math.max(1e-12, rnd()), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }   // 標準正規分布
function shuffleArr(a) { for (let i = a.length - 1; i > 0; i--) { let j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
// ---- 合成データ（[0, 1]² の 2 次元、2 クラス、種つき）。kind = 0 かたまり / 1 斜め / 2 円 / 3 XOR / 4 三日月 / 5 しま
const SHAPES = ['かたまり', '斜め', '円', 'XOR', '三日月', 'しま'];
function trueLabel(kind, u, v) {
  if (kind === 0) return (u - 0.32) ** 2 + (v - 0.36) ** 2 < (u - 0.68) ** 2 + (v - 0.64) ** 2 + 0.03 * Math.sin(9 * u) ? 0 : 1;
  if (kind === 1) return u + 0.8 * v > 0.9 ? 1 : 0;
  if (kind === 2) return (u - 0.5) ** 2 + (v - 0.5) ** 2 < 0.09 ? 1 : 0;
  if (kind === 3) return (u > 0.5) !== (v > 0.5) ? 1 : 0;
  if (kind === 4) return v > 0.5 + 0.28 * Math.cos(Math.PI * (1.6 * u - 0.3)) - 0.18 ? 1 : 0;
  return Math.sin(10 * u + 3 * v) > 0 ? 1 : 0;
}
// n 個、flip = ラベルをわざと入れかえる割合（ノイズ）
function makeData2D(kind, n, flip, seed) {
  seedRng(seed);
  let X = [], y = [];
  for (let i = 0; i < n; i++) {
    let u = 0.02 + 0.96 * rnd(), v = 0.02 + 0.96 * rnd(), c = trueLabel(kind, u, v);
    if (rnd() < flip) c = 1 - c;
    X.push([u, v]); y.push(c);
  }
  return { X, y };
}
// ---- ランダム化した分類木（2 クラス、ジニ不純度）。o = { maxDepth, feats（使える特徴量の番号）, mtry（分割ごとに見る数、0 = 全部）, randK（> 0 なら Extra Trees：ランダムな (特徴量, しきい値) を randK 個だけ試す）}
function giniCount(n1, n) { if (n <= 0) return 0; let p = n1 / n; return 2 * p * (1 - p) * n; }   // ジニ不純度 × 点の数
function growRT(X, y, idx, depth, o) {
  let n = idx.length, n1 = 0; for (let i of idx) n1 += y[i];
  let node = { leaf: true, p: n ? n1 / n : 0.5 };
  if (n1 === 0 || n1 === n || n < 2 || depth >= (o.maxDepth || 30)) return node;
  let feats = o.feats || X[0].map((_, f) => f), base = giniCount(n1, n), best = null;
  let tryCut = (f, thr) => { let l = 0, l1 = 0; for (let i of idx) if (X[i][f] <= thr) { l++; l1 += y[i]; } if (l === 0 || l === n) return; let dec = base - giniCount(l1, l) - giniCount(n1 - l1, n - l); if (!best || dec > best.dec) best = { f, thr, dec }; };
  if (o.randK > 0) {                     // Extra Trees：しきい値は [最小, 最大] の一様乱数
    for (let c = 0; c < o.randK; c++) { let f = feats[Math.floor(rnd() * feats.length)], lo = Infinity, hi = -Infinity; for (let i of idx) { lo = Math.min(lo, X[i][f]); hi = Math.max(hi, X[i][f]); } if (hi > lo) tryCut(f, lo + rnd() * (hi - lo)); }
  } else {                               // いちばん良い分割（並べて、左から 1 つずつ動かす）
    let fs = feats.slice(); if (o.mtry > 0 && o.mtry < fs.length) fs = shuffleArr(fs).slice(0, o.mtry);
    for (let f of fs) {
      let ord = idx.slice().sort((a, b) => X[a][f] - X[b][f]), l1 = 0;
      for (let q = 0; q < n - 1; q++) { l1 += y[ord[q]]; let v0 = X[ord[q]][f], v1 = X[ord[q + 1]][f]; if (!(v1 > v0)) continue; let dec = base - giniCount(l1, q + 1) - giniCount(n1 - l1, n - q - 1); if (!best || dec > best.dec) best = { f, thr: (v0 + v1) / 2, dec }; }
    }
  }
  if (!best) return node;
  let L = [], R = []; for (let i of idx) (X[i][best.f] <= best.thr ? L : R).push(i);
  return { leaf: false, f: best.f, thr: best.thr, left: growRT(X, y, L, depth + 1, o), right: growRT(X, y, R, depth + 1, o) };
}
function rtProb(t, x) { while (!t.leaf) t = x[t.f] <= t.thr ? t.left : t.right; return t.p; }
function bootIdx(n) { let a = []; for (let k = 0; k < n; k++) a.push(Math.floor(rnd() * n)); return a; }
// ---- 描く道具：色（オーケストラ：えんじ色の黒、象牙色、金管の金、弦の青緑）、領域の絵、点
const BG_COL = [24, 11, 16];                                     // 背景（えんじ色の黒）
const INK = [242, 233, 214], GOLD = [226, 176, 74], TEAL = [64, 186, 176], WINE = [196, 72, 96];
const CLS_COL = [[226, 170, 70], [60, 182, 176]];                // ★ クラス 0（金）・クラス 1（青緑）の色
function probCol(p, k) {             // クラス 1 の確率 → 背景と混ぜた色（k = 濃さ）
  let c = [], a = clampv(k === undefined ? 0.55 : k, 0, 1) * Math.abs(2 * p - 1) + 0.12;
  for (let q = 0; q < 3; q++) c.push(BG_COL[q] + ((p > 0.5 ? CLS_COL[1][q] : CLS_COL[0][q]) - BG_COL[q]) * a);
  return c;
}
// img の全部の画素に fn(u, v) → [r, g, b] を塗る（u は右向き、v は上向き、どちらも 0〜1）
function paintImage(img, fn) {
  img.loadPixels();
  let W = img.width, H = img.height;
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    let c = fn((px + 0.5) / W, 1 - (py + 0.5) / H), i = 4 * (px + W * py);
    img.pixels[i] = c[0]; img.pixels[i + 1] = c[1]; img.pixels[i + 2] = c[2]; img.pixels[i + 3] = 255;
  }
  img.updatePixels();
}
function toPx(bx, u, v) { return [bx.x + u * bx.w, bx.y + (1 - v) * bx.h]; }   // [0,1]² → 画面
function fromPx(bx, px, py) { return [(px - bx.x) / bx.w, 1 - (py - bx.y) / bx.h]; }
function drawPoints(bx, X, y, r) {
  stroke(10); strokeWeight(1);
  for (let i = 0; i < X.length; i++) { let p = toPx(bx, X[i][0], X[i][1]); fill(...CLS_COL[y[i]]); circle(p[0], p[1], r); }
}
function frameBox(bx, col) { noFill(); stroke(...(col || [110, 80, 85])); strokeWeight(1); rect(bx.x, bx.y, bx.w, bx.h); }
// ---- グラフの道具：g = { x, y, w, h, x0, x1, y0, y1 }
function gX(g, v) { return g.x + clampv((v - g.x0) / (g.x1 - g.x0), -0.02, 1.02) * g.w; }
function gY(g, v) { return g.y + g.h - clampv((v - g.y0) / (g.y1 - g.y0), -0.02, 1.02) * g.h; }
function plotAxes(g, xl, yl, xt, yt) {
  stroke(95, 70, 75); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h);
  noStroke(); fill(175, 160, 150); textSize(12); textAlign(CENTER, TOP);
  for (let v of xt) text(+v.toPrecision(3), gX(g, v), g.y + g.h + 4);
  textAlign(RIGHT, CENTER);
  for (let v of yt) text(+v.toPrecision(3), g.x - 5, gY(g, v));
  textAlign(LEFT, BASELINE); fill(215, 205, 190); textSize(13);
  text(xl, g.x + g.w - textWidth(xl), g.y + g.h + 32); text(yl, g.x, g.y - 8);
}
function polyline(pts) {               // 点が 2 つ以上あるときだけ折れ線を描く（空の beginShape を作らない）
  if (pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape();
}
function legend(x, y, items) {         // items = [[色, 名前], …]
  textSize(13); textAlign(LEFT, CENTER); noStroke();
  items.forEach(([c, s], k) => { fill(...c); rect(x, y + 20 * k - 5, 14, 10, 2); fill(220, 210, 195); text(s, x + 22, y + 20 * k); });
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) || ArrayBuffer.isView(v) ? Array.from(v).every(noNaN) : !(typeof v === 'number' && !isFinite(v)); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(140, 215, 170) : color(255, 90, 110)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
