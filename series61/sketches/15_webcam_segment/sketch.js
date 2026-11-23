// ============================================
// 15 カメラ映像の色でクラスタリング ─ 画素を 5 次元の点 (r, g, b, w·x, w·y) にして k-means → ポスターのように塗り分け
//   w = 位置の重み。0 なら色だけで分ける（離れた場所の同じ色も同じクラスタ）、大きいと近い場所どうしがまとまる（領域分割）
//   毎フレーム最初からやり直すと、中心の番号や位置が変わって画面がちらつく
//   → 前のフレームの中心から始めて、1 フレームに割り当て + 更新を 1 回だけ（少しずつ追いかける）
//   右下の「ちらつき」= 前のフレームから色（クラスタ）が変わった画素の割合
// ↑↓ k / ← → 位置の重み w / I 中心を選び直す（k-means++）/ V カメラ ⇔ テスト画像 / S 保存
// ============================================

const CW = 160, CH = 120, NF = 5;      // カメラの大きさ、特徴の次元
let cap, useCam = true, kNum = 6, wPos = 0.6, feat, lab, prevLab, centers = [], outImg, srcImg, flicker = 0, jNow = 0, testT = 0;   // ★ kNum = 色の数、wPos = 位置の重み

function setup() {
  createCanvas(windowWidth, windowHeight); textWrap(CHAR); pixelDensity(1);
  cap = createCapture(VIDEO, { flipped: true }); cap.size(CW, CH); cap.hide();
  feat = new Float32Array(CW * CH * NF); lab = new Int32Array(CW * CH); prevLab = new Int32Array(CW * CH).fill(-1);
  outImg = createImage(CW, CH); srcImg = createImage(CW, CH);
  selfTest(); seedRng(15); fillFeatures(testImage(0, 0), feat, wPos); centers = segInit(feat, kNum);
}
// ★ 画素 → 特徴 (r, g, b, w·x, w·y)。位置は 0〜255 にそろえてから w 倍
function fillFeatures(px, f, w) {
  for (let i = 0; i < CW * CH; i++) { let q = i * NF; f[q] = px[4 * i]; f[q + 1] = px[4 * i + 1]; f[q + 2] = px[4 * i + 2]; f[q + 3] = w * (255 * (i % CW)) / CW; f[q + 4] = w * (255 * Math.floor(i / CW)) / CH; }
}
function d2(f, q, c) { let s = 0; for (let d = 0; d < NF; d++) { let e = f[q + d] - c[d]; s += e * e; } return s; }
// ★ 割り当て（いちばん近い中心）。J（慣性）を返す
function segAssign(f, cs, out) { let J = 0; for (let i = 0; i < out.length; i++) { let best = 0, bd = Infinity; for (let j = 0; j < cs.length; j++) { let v = d2(f, i * NF, cs[j]); if (v < bd) { bd = v; best = j; } } out[i] = best; J += bd; } return J; }
// ★ 更新（仲間の平均。仲間 0 の中心は動かさない）
function segUpdate(f, lb, cs) {
  let sum = cs.map(() => new Float64Array(NF)), cnt = new Array(cs.length).fill(0);
  for (let i = 0; i < lb.length; i++) { let l = lb[i]; cnt[l]++; for (let d = 0; d < NF; d++) sum[l][d] += f[i * NF + d]; }
  return cs.map((c, j) => (cnt[j] ? Array.from(sum[j], (v) => v / cnt[j]) : c.slice()));
}
function reviveEmpty(f, lb, cs) {     // 仲間 0 の中心は、いちばん合っていない画素へ移す（J は増えない）
  let cnt = new Array(cs.length).fill(0); for (let l of lb) cnt[l]++;
  for (let j = 0; j < cs.length; j++) if (!cnt[j]) { let far = 0, fd = -1; for (let i = 0; i < lb.length; i += 3) { let v = d2(f, i * NF, cs[lb[i]]); if (v > fd) { fd = v; far = i; } } cs[j] = Array.from(f.subarray(far * NF, far * NF + NF)); lb[far] = j; }
  return cs;
}
function segInit(f, k) {               // k-means++（1000 画素だけ見て選ぶ）
  let sample = []; for (let s = 0; s < 1000; s++) { let i = Math.floor(rnd() * (f.length / NF)); sample.push(Array.from(f.subarray(i * NF, i * NF + NF))); }
  return initPlusPlus(sample, k);
}
function setPositionWeight(w) {        // 位置の重みを変えたら、中心の位置の成分も同じ割合で直す
  centers = centers.map((c) => [c[0], c[1], c[2], wPos > 0 ? (c[3] * w) / wPos : (w * 255) / 2, wPos > 0 ? (c[4] * w) / wPos : (w * 255) / 2]); wPos = w;
}

function draw() {
  background(22, 24, 34);
  let live = useCam && cap && cap.width > 0 && cap.elt.readyState >= 2 && cap.elt.videoWidth > 0, px = null;
  if (live) { cap.loadPixels(); if (cap.pixels.length >= CW * CH * 4) px = cap.pixels; }
  if (!px) { testT += 1; px = testImage(testT, testT); }
  fillFeatures(px, feat, wPos);
  prevLab.set(lab);
  segAssign(feat, centers, lab); centers = segUpdate(feat, lab, reviveEmpty(feat, lab, centers)); jNow = segAssign(feat, centers, lab);   // ★ 1 フレームに 1 回だけ
  let ch = 0; for (let i = 0; i < lab.length; i++) if (lab[i] !== prevLab[i]) ch++;
  flicker = 0.9 * flicker + 0.1 * (ch / lab.length);
  outImg.loadPixels(); srcImg.loadPixels();
  for (let i = 0; i < CW * CH; i++) { let c = centers[lab[i]]; for (let d = 0; d < 3; d++) { outImg.pixels[4 * i + d] = c[d]; srcImg.pixels[4 * i + d] = px[4 * i + d]; } outImg.pixels[4 * i + 3] = srcImg.pixels[4 * i + 3] = 255; }
  outImg.updatePixels(); srcImg.updatePixels();
  let big = Math.min((width - 420) / CW, (height - 170) / CH);
  image(srcImg, 40, 110, 320, 240); noSmooth(); image(outImg, 400, 110, CW * big, CH * big); smooth();
  // ---- パレット
  let cnt = new Array(centers.length).fill(0); for (let l of lab) cnt[l]++;
  noStroke(); textAlign(LEFT, BASELINE);
  centers.forEach((c, j) => { fill(c[0], c[1], c[2]); rect(40 + (j % 6) * 52, 390 + Math.floor(j / 6) * 52, 44, 44, 5); fill(200); textSize(11); text(((100 * cnt[j]) / lab.length).toFixed(0) + '%', 40 + (j % 6) * 52, 448 + Math.floor(j / 6) * 52); });
  fill(220); textSize(15);
  text('J（1 画素あたり）= ' + (jNow / lab.length).toFixed(1) + '\nちらつき = ' + (100 * flicker).toFixed(2) + '%（前のフレームから色が変わった画素）', 40, 530, 330);
  fill(150); textSize(13);
  text(wPos === 0 ? 'w = 0：色だけで分ける。画面の右と左の同じ色は同じクラスタ' : 'w = ' + wPos.toFixed(1) + '：位置も使う。大きくすると画面がタイルのような領域に分かれる（スーパーピクセルの考え方）', 40, 600, 330);
  // ---- 文字
  fill(240); textSize(20);
  text('カメラ映像の色でクラスタリング　k = ' + kNum + '　位置の重み w = ' + wPos.toFixed(1) + (live ? '' : '　（テスト画像）'), 40, 40);
  fill(170); textSize(15); text('↑↓ k　← → 位置の重み w　I 中心を選び直す　V カメラ ⇔ テスト画像　S 保存', 40, 66);
  drawSelfTest(width - 170, height - 12);
}

function keyPressed() {
  if (key === UP_ARROW || key === DOWN_ARROW) { kNum = clampv(kNum + (key === UP_ARROW ? 1 : -1), 2, 12); centers = segInit(feat, kNum); }
  if (key === RIGHT_ARROW) setPositionWeight(Math.min(3, +(wPos + 0.2).toFixed(1)));
  if (key === LEFT_ARROW) setPositionWeight(Math.max(0, +(wPos - 0.2).toFixed(1)));
  if (key === 'i' || key === 'I') centers = segInit(feat, kNum);
  if (key === 'v' || key === 'V') useCam = !useCam;
  if (key === 's' || key === 'S') saveCanvas('cluster_camera', 'png');
  return false;
}
// カメラがないときのテスト画像：空と地面のグラデーション、動く太陽、色の四角（ノイズ少し）
function testImage(t, seed) {
  let p = new Uint8ClampedArray(CW * CH * 4), sx = 40 + 30 * Math.sin(t * 0.03);
  seedRng(1000 + (seed | 0));
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    let c = y < 70 ? [80 + y, 140 + y, 230] : [90, 150 - (y - 70), 60];
    if ((x - sx - 60) ** 2 + (y - 30) ** 2 < 300) c = [255, 210, 80];
    if (x > 20 && x < 55 && y > 80 && y < 110) c = [200, 60, 70];
    if (x > 110 && x < 145 && y > 85 && y < 112) c = [70, 80, 200];
    let i = 4 * (x + CW * y), nz = 8 * (rnd() - 0.5);
    p[i] = c[0] + nz; p[i + 1] = c[1] + nz; p[i + 2] = c[2] + nz; p[i + 3] = 255;
  }
  return p;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let f = new Float32Array(CW * CH * NF), lb = new Int32Array(CW * CH);
  seedRng(3); fillFeatures(testImage(0, 1), f, 0.6);
  let cs = segInit(f, 6), prev = segAssign(f, cs, lb), mono = true;
  for (let t = 0; t < 8; t++) { cs = segUpdate(f, lb, cs); let J = segAssign(f, cs, lb); if (J > prev * (1 + 1e-6)) mono = false; prev = J; }
  check('前の中心から 1 回ずつ（割り当て + 更新）続けても J は増えない（8 回）', mono);
  let cenOk = true, cs2 = segUpdate(f, lb, cs);
  for (let j = 0; j < cs.length; j++) { let n = 0, s = 0; for (let i = 0; i < lb.length; i++) if (lb[i] === j) { n++; s += f[i * NF]; } if (n && Math.abs(s / n - cs2[j][0]) > 1e-3) cenOk = false; }
  check('更新した中心 = 仲間の画素の平均（赤の成分で確認）', cenOk);
  let f0 = new Float32Array(CW * CH * NF); fillFeatures(testImage(0, 1), f0, 0);
  let c0 = segInit(f0, 4), l0 = new Int32Array(CW * CH); segAssign(f0, c0, l0);
  let colOnly = true; for (let i = 0; i < l0.length; i += 37) { let b = 0, bd = Infinity; c0.forEach((c, j) => { let v = (f0[i * NF] - c[0]) ** 2 + (f0[i * NF + 1] - c[1]) ** 2 + (f0[i * NF + 2] - c[2]) ** 2; if (v < bd) { bd = v; b = j; } }); if (b !== l0[i]) colOnly = false; }
  check('w = 0 なら位置は無視：色 (r, g, b) だけでいちばん近い中心と同じ', colOnly && f0[3] === 0 && f0[CW * CH * NF - 1] === 0);
  // ちらつき：次のフレーム（ノイズがちがう）で、前の中心から始める vs 最初からやり直す
  let fa = new Float32Array(CW * CH * NF), fb = new Float32Array(CW * CH * NF), la = new Int32Array(CW * CH), lw = new Int32Array(CW * CH), lc = new Int32Array(CW * CH);
  fillFeatures(testImage(10, 2), fa, 0.6); fillFeatures(testImage(11, 3), fb, 0.6);
  seedRng(4); let ca = segInit(fa, 6); for (let t = 0; t < 4; t++) { segAssign(fa, ca, la); ca = segUpdate(fa, la, ca); } segAssign(fa, ca, la);
  segAssign(fb, ca, lw); let cw = segUpdate(fb, lw, ca); segAssign(fb, cw, lw);
  seedRng(99); let cc = segInit(fb, 6); for (let t = 0; t < 4; t++) { segAssign(fb, cc, lc); cc = segUpdate(fb, lc, cc); } segAssign(fb, cc, lc);
  let chW = 0, chC = 0; for (let i = 0; i < la.length; i++) { if (lw[i] !== la[i]) chW++; if (lc[i] !== la[i]) chC++; }
  check('前の中心から始めるとちらつきが少ない：変わった画素 ' + ((100 * chW) / la.length).toFixed(1) + '% < やり直し ' + ((100 * chC) / la.length).toFixed(1) + '%', chW < chC);
  let spread = (w) => { let ff = new Float32Array(CW * CH * NF), ll = new Int32Array(CW * CH); fillFeatures(testImage(0, 5), ff, w); seedRng(6); let c = segInit(ff, 6); for (let t = 0; t < 5; t++) { segAssign(ff, c, ll); c = segUpdate(ff, ll, c); } segAssign(ff, c, ll); let s = 0; for (let i = 0; i < ll.length; i++) { let q = c[ll[i]], x = (255 * (i % CW)) / CW, y = (255 * Math.floor(i / CW)) / CH; s += w > 0 ? (x - q[3] / w) ** 2 + (y - q[4] / w) ** 2 : 0; } return s / ll.length; };
  let mx = (w) => { let ff = new Float32Array(CW * CH * NF); fillFeatures(testImage(0, 5), ff, w); return ff; };
  check('位置の重み w を大きくすると、クラスタは場所でまとまる（中心からの平均の場所のずれ² が w = 0.5 → 3 で減る）', spread(3) < spread(0.5) && noNaN(Array.from(mx(1).slice(0, 10))));
  let two = new Float32Array(CW * CH * NF); fillFeatures(new Uint8ClampedArray(CW * CH * 4).map((_, i) => (i % 4 === 3 ? 255 : Math.floor(i / 4) % 2 ? 200 : 20)), two, 0);
  seedRng(7); let c12 = segInit(two, 12), l12 = new Int32Array(CW * CH); for (let t = 0; t < 3; t++) { segAssign(two, c12, l12); c12 = segUpdate(two, l12, c12); }
  check('2 色しかない画像で k = 12 にしても、仲間 0 の中心は動かないだけで NaN なし', noNaN(c12.flat()) && c12.length === 12);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. ← → で位置の重み w を 0 → 3 に。0 では色だけ、大きいとタイルのような領域に分かれる
// 2. ↑↓ で k を 2 にすると、画面は何と何に分かれる？（明るい・暗い？ 肌と背景？）
// 3. I で中心を選び直すと、一瞬ちらついてから落ち着く。毎フレーム I を押すとどうなるか想像しよう
// 4. 服の色を変えたり手を動かしたりして、クラスタが追いかけてくる様子を見よう
// 5. S で保存して、自分のポスター風の写真を作ろう。13 の減色と同じことを動画でやっている

// ==================================================
// ここから下は「クラスタリングの道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 共通：値をはさむ・クラスタの色・距離（点は [x, y] や [r, g, b] のような配列）
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
const PAL = [[176, 140, 255], [110, 230, 190], [255, 190, 80], [110, 180, 255], [255, 120, 130], [200, 240, 110], [255, 150, 220], [90, 210, 220], [255, 150, 70], [190, 190, 255]];
function palC(k, a) {                  // クラスタ k の色（k < 0 = ノイズ = 灰色）
  let al = a === undefined ? 255 : a;
  if (k < 0) return color(120, 120, 135, al);
  let c = PAL[k % PAL.length]; return color(c[0], c[1], c[2], al);
}
function sqd(a, b) { let s = 0; for (let i = 0; i < a.length; i++) { let d = a[i] - b[i]; s += d * d; } return s; }   // 距離の 2 乗
function edist(a, b) { return Math.sqrt(sqd(a, b)); }                                                              // ユークリッド距離
function meanOf(arr) { if (!arr.length) return 0; let s = 0; for (let v of arr) s += v; return s / arr.length; }
// ---- 種つきの乱数（同じ種なら毎回同じ列）
let rngState = 1, gaussSpare = null;
function seedRng(s) { rngState = (s >>> 0) || 1; gaussSpare = null; }
function rnd() {                       // 0〜1 の一様乱数（mulberry32）
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rndInt(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
function gauss() {                     // 標準正規分布（ボックス-ミュラー法）
  if (gaussSpare !== null) { let g = gaussSpare; gaussSpare = null; return g; }
  let u = 1 - rnd(), v = rnd(), r = Math.sqrt(-2 * Math.log(u));
  gaussSpare = r * Math.sin(2 * Math.PI * v); return r * Math.cos(2 * Math.PI * v);
}
// ---- k-means（ロイドのアルゴリズム）。目的関数 = 慣性 = Σ |x_i − 中心|²
function nearestCenter(p, centers) { let best = 0, bd = Infinity; for (let j = 0; j < centers.length; j++) { let d = sqd(p, centers[j]); if (d < bd) { bd = d; best = j; } } return best; }
function assignLabels(pts, centers) { return pts.map((p) => nearestCenter(p, centers)); }        // ① 割り当て
function inertiaOf(pts, centers, labels) { let s = 0; for (let i = 0; i < pts.length; i++) s += sqd(pts[i], centers[labels[i]]); return s; }
function updateCenters(pts, labels, centers) {                                                     // ② 更新（仲間の平均。仲間 0 なら動かさない）
  let k = centers.length, dim = centers[0].length, sum = centers.map(() => new Array(dim).fill(0)), cnt = new Array(k).fill(0);
  for (let i = 0; i < pts.length; i++) { let l = labels[i]; cnt[l]++; for (let d = 0; d < dim; d++) sum[l][d] += pts[i][d]; }
  return sum.map((s, j) => (cnt[j] ? s.map((v) => v / cnt[j]) : centers[j].slice()));
}
function initRandomCenters(pts, k) {   // ランダムに k 点えらぶ（重ならないように）
  if (!pts.length) return Array.from({ length: k }, () => [0, 0]);
  let idx = pts.map((_, i) => i), out = [];
  for (let j = 0; j < Math.min(k, pts.length); j++) { let r = j + Math.floor(rnd() * (idx.length - j)); [idx[j], idx[r]] = [idx[r], idx[j]]; out.push(pts[idx[j]].slice()); }
  while (out.length < k) out.push(pts[0].slice());
  return out;
}
function initPlusPlus(pts, k) {        // k-means++：今ある中心から遠い点ほど（距離² に比例して）えらばれやすい
  if (!pts.length) return Array.from({ length: k }, () => [0, 0]);
  let out = [pts[Math.floor(rnd() * pts.length)].slice()], d2 = pts.map((p) => sqd(p, out[0]));
  while (out.length < k) {
    let tot = 0; for (let v of d2) tot += v;
    let r = rnd() * tot, pick = pts.length - 1;
    if (tot > 0) { for (let i = 0; i < pts.length; i++) { r -= d2[i]; if (r <= 0) { pick = i; break; } } } else pick = Math.floor(rnd() * pts.length);
    out.push(pts[pick].slice());
    for (let i = 0; i < pts.length; i++) d2[i] = Math.min(d2[i], sqd(pts[i], pts[pick]));
  }
  return out;
}
// 最後まで回す。hist = 半ステップ（割り当て・更新）ごとの慣性
function lloyd(pts, centers0, maxIter) {
  let centers = centers0.map((c) => c.slice()), labels = assignLabels(pts, centers), hist = [inertiaOf(pts, centers, labels)], iters = 0;
  for (let it = 0; it < (maxIter || 100); it++) {
    let nc = updateCenters(pts, labels, centers); hist.push(inertiaOf(pts, nc, labels));
    let nl = assignLabels(pts, nc); hist.push(inertiaOf(pts, nc, nl));
    centers = nc; iters++;
    let same = nl.every((v, i) => v === labels[i]); labels = nl;
    if (same) break;
  }
  return { centers, labels, inertia: hist[hist.length - 1], hist, iters };
}
function kmeansBest(pts, k, restarts, usePP, maxIter) {   // restarts 回やり直して慣性がいちばん小さいものを選ぶ
  let best = null, all = [];
  for (let r = 0; r < restarts; r++) { let res = lloyd(pts, usePP ? initPlusPlus(pts, k) : initRandomCenters(pts, k), maxIter); all.push(res.inertia); if (!best || res.inertia < best.inertia) best = res; }
  best.all = all; return best;
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) ? v.every(noNaN) : !(typeof v === 'number' && v !== v); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(120, 210, 150) : color(255, 90, 90)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
