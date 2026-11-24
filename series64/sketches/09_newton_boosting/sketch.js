// ============================================
// 09 2 次の勾配ブースティング ─ 勾配 g（1 階微分）だけでなく、ヘッセ h（2 階微分）も使って木を作る（XGBoost の考え方）
// ロジスティック損失：p = σ(F)、g = p − y、h = p(1 − p)。葉の値 w = −G/(H + λ)（G, H = 葉の中の g, h の合計）
//   分割の利得 = ½ [G_L²/(H_L + λ) + G_R²/(H_R + λ) − G²/(H + λ)] − γ。利得が正のときだけ分ける
//   λ（↑↓）は葉の値を小さく、γ（← →）は木を小さくする正則化。1 次（series62/11 と同じ：残差 y − p に木をあてはめる）と比べる
//   右下の木 = いま作った木（葉の数字 = w、節の数字 = 利得）
// ↑↓ λ / ← → γ / スペース 一時停止 / D データの形 / R データを作り直す
// ============================================

const LAMS = [0, 0.5, 1, 2, 5, 10, 30], GAMS = [0, 0.5, 1, 2, 4, 8];
let lamI = 2, gamI = 0, nu = 0.3, depthMax = 3, kind = 4, seedD = 5, paused = false;   // ★ nu = 学習率、depthMax = 木の深さ
const MAX_R = 120, CELLS = 60;
let trainD, testD, newton, first, regionImg;

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); pixelDensity(1); regionImg = createImage(CELLS, CELLS); selfTest(); restart(); }
// ★ g と h で木を作る（貪欲に：全部の特徴量 × 全部のしきい値の利得を調べる）
function growNT(X, g, h, idx, depth, o) {
  let G = 0, H = 0; for (let i of idx) { G += g[i]; H += h[i]; }
  let node = { leaf: true, w: -G / (H + o.lam), G, H, n: idx.length, depth };
  if (depth >= o.maxDepth || idx.length < 2) return node;
  let best = null, base = (G * G) / (H + o.lam);
  for (let f = 0; f < 2; f++) {
    let ord = idx.slice().sort((a, b) => X[a][f] - X[b][f]), GL = 0, HL = 0;
    for (let q = 0; q < ord.length - 1; q++) {
      GL += g[ord[q]]; HL += h[ord[q]];
      let v0 = X[ord[q]][f], v1 = X[ord[q + 1]][f]; if (!(v1 > v0)) continue;
      let gain = 0.5 * ((GL * GL) / (HL + o.lam) + ((G - GL) ** 2) / (H - HL + o.lam) - base) - o.gam;
      if (!best || gain > best.gain) best = { f, thr: (v0 + v1) / 2, gain };
    }
  }
  if (!best || !(best.gain > 0)) return node;
  let L = idx.filter((i) => X[i][best.f] <= best.thr), R = idx.filter((i) => X[i][best.f] > best.thr);
  return { leaf: false, f: best.f, thr: best.thr, gain: best.gain, depth, n: idx.length, left: growNT(X, g, h, L, depth + 1, o), right: growNT(X, g, h, R, depth + 1, o) };
}
function ntValue(t, x) { while (!t.leaf) t = x[t.f] <= t.thr ? t.left : t.right; return t.w; }
function ntLeaves(t) { return t.leaf ? 1 : ntLeaves(t.left) + ntLeaves(t.right); }
function logLoss(F, y) { let s = 0; for (let i = 0; i < y.length; i++) { let p = clampv(sigm(F[i]), 1e-12, 1 - 1e-12); s -= y[i] ? Math.log(p) : Math.log(1 - p); } return s / y.length; }
// ブースター：second = true なら 2 次（h = p(1 − p)、λ, γ つき）、false なら 1 次（h = 1、λ = γ = 0 → 葉 = 残差の平均）
function makeBooster(second) { return { second, trees: [], F: new Array(trainD.X.length).fill(0), Ft: new Array(testD.X.length).fill(0), loss: [logLoss(new Array(trainD.X.length).fill(0), trainD.y)], leaves: [], grid: new Float32Array(CELLS * CELLS) }; }
function boostOne(B, o) {
  let p = B.F.map(sigm), g = p.map((v, i) => v - trainD.y[i]), h = B.second ? p.map((v) => Math.max(1e-6, v * (1 - v))) : p.map(() => 1);
  let t = growNT(trainD.X, g, h, trainD.X.map((_, i) => i), 0, B.second ? o : { lam: 0, gam: 0, maxDepth: o.maxDepth });
  B.F = B.F.map((f, i) => f + nu * ntValue(t, trainD.X[i])); B.Ft = B.Ft.map((f, i) => f + nu * ntValue(t, testD.X[i]));
  B.trees.push(t); B.loss.push(logLoss(B.F, trainD.y)); B.leaves.push(ntLeaves(t));
}
function opts() { return { lam: LAMS[lamI], gam: GAMS[gamI], maxDepth: depthMax }; }
function restart() {
  paused = false; trainD = makeData2D(kind, 300, 0.08, seedD); testD = makeData2D(kind, 1000, 0.08, seedD + 77); newton = makeBooster(true); first = makeBooster(false); }
function accOf(B) { return B.Ft.filter((f, i) => (f > 0 ? 1 : 0) === testD.y[i]).length / testD.y.length; }

function draw() {
  background(...BG_COL);
  if (!paused && newton.trees.length < MAX_R) {
    boostOne(newton, opts()); boostOne(first, opts());
    let t = newton.trees[newton.trees.length - 1];      // 新しい木の分だけマス目の F に足す
    for (let j = 0; j < CELLS; j++) for (let i = 0; i < CELLS; i++) newton.grid[i + CELLS * j] += nu * ntValue(t, [(i + 0.5) / CELLS, 1 - (j + 0.5) / CELLS]);
  }
  paintImage(regionImg, (u, v) => probCol(sigm(newton.grid[Math.min(CELLS - 1, Math.floor(u * CELLS)) + CELLS * Math.min(CELLS - 1, Math.floor((1 - v) * CELLS))]), 0.8));
  let side = Math.min(height - 200, width * 0.36), bx = { x: 40, y: 110, w: side, h: side };
  noSmooth(); image(regionImg, bx.x, bx.y, side, side); smooth(); frameBox(bx); drawPoints(bx, trainD.X, trainD.y, 6);
  noStroke(); fill(200, 185, 170); textSize(13); textAlign(LEFT, BASELINE); text('2 次のブースティングの確率 σ(F)。テスト正解率 ' + pctStr(accOf(newton)) + '（1 次は ' + pctStr(accOf(first)) + '）', bx.x, bx.y + side + 22, side);
  // ---- 右上：訓練の損失
  let rx = bx.x + side + 70, top = Math.max(...newton.loss, ...first.loss), g = { x: rx, y: 110, w: (width - rx - 50) * 0.55, h: height * 0.34, x0: 0, x1: MAX_R, y0: 0, y1: top * 1.05 };
  plotAxes(g, 'ラウンド', '訓練の損失：金 = 2 次、青緑 = 1 次', [0, MAX_R / 2, MAX_R], [0, +(top / 2).toFixed(2), +top.toFixed(2)]);
  stroke(...TEAL); strokeWeight(2.5); polyline(first.loss.map((v, k) => [gX(g, k), gY(g, v)]));
  stroke(...GOLD); polyline(newton.loss.map((v, k) => [gX(g, k), gY(g, v)]));
  // ---- 右上の右：葉の数
  let g2 = { x: g.x + g.w + 50, y: g.y, w: width - g.x - g.w - 100, h: g.h, x0: 0, x1: MAX_R, y0: 0, y1: Math.pow(2, depthMax) + 0.5 };
  plotAxes(g2, 'ラウンド', '2 次の木の葉の数', [0, MAX_R], [0, Math.pow(2, depthMax)]);
  noStroke(); fill(...GOLD); newton.leaves.forEach((l, k) => rect(gX(g2, k), gY(g2, l), Math.max(1, g2.w / MAX_R - 1), g2.y + g2.h - gY(g2, l)));
  // ---- 右下：いまの木
  let ty = g.y + g.h + 66, last = newton.trees[newton.trees.length - 1];
  noStroke(); fill(...INK); textSize(15); textAlign(LEFT, BASELINE); text('いまの 2 次の木（λ = ' + LAMS[lamI] + '、γ = ' + GAMS[gamI] + '）：節 = 利得、葉 = w = −G/(H + λ)', rx, ty);
  if (last) drawNT(last, rx, ty + 30, width - rx - 50, height - ty - 90);
  // ---- 文字
  fill(...INK); textSize(20); textAlign(LEFT, BASELINE); text('2 次の勾配ブースティング　データ：' + SHAPES[kind] + '　ラウンド ' + newton.trees.length + '　学習率 ν = ' + nu, 40, 40);
  fill(170, 155, 145); textSize(15); text('↑↓ λ = ' + LAMS[lamI] + '　← → γ = ' + GAMS[gamI] + '　スペース 一時停止　D データの形　R データを作り直す', 40, 66);
  drawSelfTest(width - 170, height - 12);
}
function drawNT(t, x0, y0, w, h) {     // 葉を左から並べ、親は子のまん中
  let pos = new Map(), nl = 0, rh = Math.min(64, h / (depthMax + 1));
  let place = (q) => { if (q.leaf) { pos.set(q, nl++); return pos.get(q); } let a = place(q.left), b = place(q.right); pos.set(q, (a + b) / 2); return pos.get(q); };
  place(t);
  let cw = w / Math.max(1, nl), P = (q) => [x0 + (pos.get(q) + 0.5) * cw, y0 + q.depth * rh + 14];
  let walk = (q) => {
    let [x, y] = P(q);
    if (!q.leaf) for (let c of [q.left, q.right]) { let [cx, cy] = P(c); stroke(120, 95, 100); strokeWeight(1.2); line(x, y + 12, cx, cy - 12); walk(c); }
    noStroke(); fill(...(q.leaf ? probCol(sigm(3 * q.w), 1) : [60, 40, 48])); rect(x - Math.min(48, cw / 2 - 3), y - 12, 2 * Math.min(48, cw / 2 - 3), 24, 5);
    fill(...INK); textSize(11); textAlign(CENTER, CENTER); text(q.leaf ? fmtNum(q.w, 2) : (q.f ? 'y' : 'x') + '≤' + fmtNum(q.thr, 2) + ' ' + fmtNum(q.gain, 1), x, y);
  };
  walk(t);
}
function keyPressed() {
  if (key === UP_ARROW) { lamI = Math.min(LAMS.length - 1, lamI + 1); newton = makeBooster(true); first = makeBooster(false); }
  if (key === DOWN_ARROW) { lamI = Math.max(0, lamI - 1); newton = makeBooster(true); first = makeBooster(false); }
  if (key === RIGHT_ARROW) { gamI = Math.min(GAMS.length - 1, gamI + 1); newton = makeBooster(true); first = makeBooster(false); }
  if (key === LEFT_ARROW) { gamI = Math.max(0, gamI - 1); newton = makeBooster(true); first = makeBooster(false); }
  if (key === ' ') paused = !paused;
  if (key === 'd' || key === 'D') { kind = (kind + 1) % SHAPES.length; restart(); }
  if (key === 'r' || key === 'R') { seedD++; restart(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  restart();
  let F0 = 0.7, ok = true;               // ロジスティック損失 L(F) = −y log σ(F) − (1 − y) log(1 − σ(F)) の g, h を数値微分で
  for (let y of [0, 1]) { let L = (F) => -(y ? Math.log(sigm(F)) : Math.log(1 - sigm(F))), e = 1e-4, p = sigm(F0); if (Math.abs((L(F0 + e) - L(F0 - e)) / (2 * e) - (p - y)) > 1e-7 || Math.abs((L(F0 + e) - 2 * L(F0) + L(F0 - e)) / (e * e) - p * (1 - p)) > 1e-5) ok = false; }
  check('g = p − y と h = p(1 − p) は、ロジスティック損失の 1 階・2 階の数値微分と一致', ok);
  let n = trainD.X.length, p = new Array(n).fill(0.5), g = p.map((v, i) => v - trainD.y[i]), h = p.map((v) => v * (1 - v)), all = trainD.X.map((_, i) => i), o = { lam: 1, gam: 0, maxDepth: 1 };
  let obj = (ids, w) => { let s = 0.5 * o.lam * w * w; for (let i of ids) s += g[i] * w + 0.5 * h[i] * w * w; return s; };   // 2 次の近似の目的関数
  let leaf = growNT(trainD.X, g, h, all, 0, { lam: 1, gam: 0, maxDepth: 0 }), G = sumArr(g), H = sumArr(h);
  check('葉の値 = −G/(H + λ)、それが 2 次の目的関数 Σ(g·w + ½h·w²) + ½λw² の最小点', near(leaf.w, -G / (H + 1), 1e-12) && obj(all, leaf.w) < obj(all, leaf.w + 1e-3) && obj(all, leaf.w) < obj(all, leaf.w - 1e-3));
  let st = growNT(trainD.X, g, h, all, 0, o), Lx = all.filter((i) => trainD.X[i][st.f] <= st.thr), Rx = all.filter((i) => trainD.X[i][st.f] > st.thr);
  let direct = obj(all, leaf.w) - obj(Lx, st.left.w) - obj(Rx, st.right.w);
  check('分割の利得の式 = 目的関数を直接計算した減り（' + fmtNum(st.gain, 6) + ' = ' + fmtNum(direct, 6) + '、1e-9）', near(st.gain, direct, 1e-9));
  let bestB = -Infinity;                 // 総当たり：全部の中点で直接計算した減りの最大
  for (let f = 0; f < 2; f++) { let vals = [...new Set(trainD.X.map((x) => x[f]))].sort((a, b) => a - b); for (let q = 0; q + 1 < vals.length; q++) { let th = (vals[q] + vals[q + 1]) / 2, A = all.filter((i) => trainD.X[i][f] <= th), B = all.filter((i) => trainD.X[i][f] > th), wa = -sumArr(A.map((i) => g[i])) / (sumArr(A.map((i) => h[i])) + 1), wb = -sumArr(B.map((i) => g[i])) / (sumArr(B.map((i) => h[i])) + 1); bestB = Math.max(bestB, obj(all, leaf.w) - obj(A, wa) - obj(B, wb)); } }
  check('選んだ分割の利得 ≥ 総当たり（全部の中点で直接計算）の最大', st.gain >= bestB - 1e-9);
  let lv = [0, 1, 5, 20, 80].map((gm) => ntLeaves(growNT(trainD.X, g, h, all, 0, { lam: 1, gam: gm, maxDepth: 4 })));
  check('同じ g, h なら γ を大きくするほど葉は減る（γ = 0, 1, 5, 20, 80 → ' + lv.join(', ') + '）', lv.every((v, k) => k === 0 || v <= lv[k - 1]) && lv[4] < lv[0]);
  let nb = makeBooster(true), fb = makeBooster(false);
  for (let r = 0; r < 30; r++) { boostOne(nb, { lam: 1, gam: 0, maxDepth: 3 }); boostOne(fb, { lam: 1, gam: 0, maxDepth: 3 }); }
  check('30 ラウンド後の訓練の損失：2 次 ' + fmtNum(nb.loss[30], 4) + ' < 1 次 ' + fmtNum(fb.loss[30], 4) + '（同じ ν = ' + nu + '、深さ 3）', nb.loss[30] < fb.loss[30] && noNaN(nb.F));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 損失のグラフで、2 次（金）が 1 次（青緑）より速く下がるのを確かめよう。ν を 0.1 や 1 にすると？
// 2. ← → で γ を大きくすると、右上の葉の数が減る。γ = 8 だと木はほとんど切り株に
// 3. ↑↓ で λ を大きくすると、葉の数字（w）が小さくなる。損失の下がり方は？
// 4. 木の図の利得の数字は、根に近いほど大きい？ 利得 < γ の分割はしない
// 5. 2 次の利得は「この分割で 2 次の近似の損失がどれだけ減るか」。自己テストでは直接計算と比べている

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
