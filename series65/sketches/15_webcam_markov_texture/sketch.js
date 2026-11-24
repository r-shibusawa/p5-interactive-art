// ============================================
// 15 カメラ映像のマルコフ模様 📷 ─ 映像の色を 8 色に減らし（k 平均法）、
//   「この色の右どなりは何色か」（横の遷移）と「この色の下は何色か」（縦の遷移）を数えて 2 つの遷移行列にする。
// 左上から 1 マスずつ、左と上の色から次の色をサイコロで決めていくと、元の映像の「色の並び方の雰囲気」を持つ新しい模様になる。
// 左と上の両方を使うときは P(c | 左 a, 上 b) ∝ 横[a][c] × (縦[b][c] / π_c)^w で近似する（w = 縦の強さ）
// スペース 新しい模様 / ↑↓ 縦の強さ w / C カメラ ⇔ テスト画像 / F 学習を止める / S 画面を保存
// カメラが使えないときは、自動でテスト画像（空・山・しま模様）を使う
// ============================================

const CW = 64, CH = 48;                  // ★ 学習に使う映像の大きさ（小さいほど速い）
const GW = 96, GH = 72;                  // ★ 作る模様のマスの数
const NCOL = 8;                          // 色の数
const ROWS_PER_FRAME = 4;                // ★ 1 フレームに作る行の数（ゆっくり描かれる様子が見える）
let vMix = 1;                            // ★ 縦の強さ w（0 = 横だけ → 横じま、1 = 横と縦）
let cap = null, useCam = true, frozen = false, palette = [], srcLabels = [], horT, vertT, colFreq, genLab = [], genRow = 0, waitFrames = 0;
let srcImg, quantImg, genImg, testPix;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  seedRng(15); noSmooth();
  testPix = makeTestPixels(CW, CH);
  srcImg = createImage(CW, CH); quantImg = createImage(CW, CH); genImg = createImage(GW, GH);
  palette = initPalette(testPix); learnFrom(testPix); startPattern();
  try { cap = createCapture(VIDEO, { flipped: true }); cap.size(CW, CH); cap.hide(); } catch (e) { cap = null; }
}
function camLive() { return useCam && cap && cap.width > 0 && cap.elt && cap.elt.readyState >= 2 && cap.elt.videoWidth > 0; }
// テスト画像：空のグラデーション、太陽、山、しま模様の畑（RGBA の配列）
function makeTestPixels(w, h) {
  let px = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let r = 120 + y * 2, g = 170 + y, b = 235, ridge = h * 0.55 - 10 * Math.sin(x * 0.12) - 6 * Math.sin(x * 0.31);
    if (Math.hypot(x - w * 0.75, y - h * 0.22) < h * 0.12) { r = 250; g = 200; b = 70; }
    if (y > ridge) { r = 70; g = 110; b = 80; }
    if (y > h * 0.72) { let s = Math.floor((x + (y - h * 0.72) * 0.8) / 5) % 2; r = s ? 200 : 140; g = s ? 160 : 90; b = s ? 70 : 50; }
    let i = 4 * (y * w + x); px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255;
  }
  return px;
}
function initPalette(px) { let out = [], n = px.length / 4; for (let k = 0; k < NCOL; k++) { let i = Math.floor(((k + 0.5) / NCOL) * n) * 4; out.push([px[i], px[i + 1], px[i + 2]]); } return out; }
function nearestCol(pal, r, g, b) { let best = 0, bd = Infinity; for (let k = 0; k < pal.length; k++) { let d = (pal[k][0] - r) ** 2 + (pal[k][1] - g) ** 2 + (pal[k][2] - b) ** 2; if (d < bd) { bd = d; best = k; } } return best; }
// ★ k 平均法：各画素を一番近い色に分け、色をその平均に動かす（を its 回）。最後に明るさの順に並べる
function kmeansStep(pal, px, its) {
  let n = px.length / 4, lab = new Int32Array(n);
  for (let it = 0; it < its; it++) {
    let sums = pal.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < n; i++) { let k = nearestCol(pal, px[4 * i], px[4 * i + 1], px[4 * i + 2]); lab[i] = k; sums[k][0] += px[4 * i]; sums[k][1] += px[4 * i + 1]; sums[k][2] += px[4 * i + 2]; sums[k][3]++; }
    pal = pal.map((c, k) => { if (sums[k][3]) return [sums[k][0] / sums[k][3], sums[k][1] / sums[k][3], sums[k][2] / sums[k][3]]; let j = 4 * Math.floor(rnd() * n); return [px[j], px[j + 1], px[j + 2]]; });   // 使われない色は、映像のどこかの画素の色にし直す
  }
  pal.sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
  for (let i = 0; i < n; i++) lab[i] = nearestCol(pal, px[4 * i], px[4 * i + 1], px[4 * i + 2]);
  return { pal, lab };
}
// ★ 遷移を数える：横 = (x, y) → (x+1, y)、縦 = (x, y) → (x, y+1)。画像は輪っか（右はしの次は左はし、下はしの次は上はし）として数える
//   → 下のほうの色からも上のほうの色へ戻れる（閉じたクラスに閉じこめられない、03 を参照）。数が 0 の行は全部同じ確率に
function countTransitions(lab, w, h) {
  let hc = zerosMat(NCOL), vc = zerosMat(NCOL), fr = new Array(NCOL).fill(0);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let a = lab[y * w + x]; fr[a]++;
    hc[a][lab[y * w + (x + 1) % w]]++;
    vc[a][lab[((y + 1) % h) * w + x]]++;
  }
  let toP = (c) => c.map((r) => { let s = sumOf(r); return s > 0 ? r.map((v) => v / s) : r.map(() => 1 / NCOL); });
  return { hc, vc, horP: toP(hc), vertP: toP(vc), freq: fr.map((v) => v / (w * h)) };
}
function learnFrom(px) {
  let r = kmeansStep(palette, px, 3); palette = r.pal; srcLabels = r.lab;
  let t = countTransitions(srcLabels, CW, CH); horT = t.horP; vertT = t.vertP; colFreq = t.freq;
}
// ★ 1 マスの色：左 a と上 b（ないときは −1）から
function nextColor(hp, vp, fr, a, b, w) {
  let wts = new Array(NCOL).fill(0);
  for (let c = 0; c < NCOL; c++) {
    if (a < 0 && b < 0) wts[c] = fr[c];
    else if (b < 0) wts[c] = hp[a][c];
    else if (a < 0) wts[c] = vp[b][c];
    else wts[c] = hp[a][c] * Math.pow(vp[b][c] / Math.max(fr[c], 1e-9), w);
  }
  if (!(sumOf(wts) > 0)) return a >= 0 ? sampleFrom(hp[a]) : sampleFrom(fr.map((v) => v + 1e-9));   // 両方と合わないときは横だけで
  return sampleFrom(wts);
}
function generateRows(lab, gw, y0, y1, hp, vp, fr, w) {
  for (let y = y0; y < y1; y++) for (let x = 0; x < gw; x++) lab[y * gw + x] = nextColor(hp, vp, fr, x > 0 ? lab[y * gw + x - 1] : -1, y > 0 ? lab[(y - 1) * gw + x] : -1, w);
}
function startPattern() { genLab = new Int32Array(GW * GH); genRow = 0; waitFrames = 0; }
function paintLabels(img, lab, n) { img.loadPixels(); for (let i = 0; i < n; i++) { let c = palette[lab[i]] || [0, 0, 0]; img.pixels[4 * i] = c[0]; img.pixels[4 * i + 1] = c[1]; img.pixels[4 * i + 2] = c[2]; img.pixels[4 * i + 3] = 255; } img.updatePixels(); }

function draw() {
  background(...BG);
  let live = camLive(), px = testPix;
  if (live) { cap.loadPixels(); if (cap.pixels && cap.pixels.length >= CW * CH * 4) px = cap.pixels; }
  if (!frozen && frameCount % 20 === 0) learnFrom(px);
  if (genRow < GH) { let y1 = Math.min(GH, genRow + ROWS_PER_FRAME); generateRows(genLab, GW, genRow, y1, horT, vertT, colFreq, vMix); genRow = y1; }
  else if (++waitFrames > 180) startPattern();     // 3 秒ながめたら次の模様
  hudTitle('カメラ映像のマルコフ模様：' + (live ? 'カメラ' : 'テスト画像') + 'から学ぶ' + (frozen ? '（学習を止めている）' : ''),
    'スペース 新しい模様　↑↓ 縦の強さ w = ' + fmtN(vMix, 1) + '　C カメラ ⇔ テスト画像　F 学習を止める　S 保存');
  // ---- 元の映像と 8 色にした映像
  srcImg.loadPixels(); for (let i = 0; i < CW * CH * 4; i++) srcImg.pixels[i] = px[i]; srcImg.updatePixels();
  paintLabels(quantImg, srcLabels, CW * CH);
  let sw = Math.min(256, width * 0.2), sh = (sw * CH) / CW, x0 = 40, y0 = 104;
  image(srcImg, x0, y0, sw, sh); image(quantImg, x0, y0 + sh + 30, sw, sh);
  noStroke(); fill(...SUB); textSize(13); textAlign(LEFT, BASELINE); text('元の映像', x0, y0 - 6); text('8 色に減らした映像', x0, y0 + sh + 24);
  for (let k = 0; k < NCOL; k++) { fill(...palette[k]); rect(x0 + k * (sw / NCOL), y0 + 2 * sh + 40, sw / NCOL - 3, 18, 3); }
  fill(...SUB); textSize(12); textAlign(LEFT, BASELINE); text('8 色と、その割合 π（棒の高さ、数字は %）', x0, y0 + 2 * sh + 76);
  for (let k = 0; k < NCOL; k++) { fill(...palette[k]); let hh = clampv(colFreq[k] / Math.max(...colFreq), 0, 1) * 70; rect(x0 + k * (sw / NCOL), y0 + 2 * sh + 86 + 70 - hh, sw / NCOL - 3, hh); text(Math.round(colFreq[k] * 100), x0 + k * (sw / NCOL) + 2, y0 + 2 * sh + 172); }
  // ---- 作った模様
  paintLabels(genImg, genLab, GW * genRow);
  let gx = x0 + sw + 40, gwid = Math.min(width * 0.42, ((height - 130) * GW) / GH), ghei = (gwid * GH) / GW;
  image(genImg, gx, y0, gwid, ghei);
  fill(...SUB); text('マルコフ連鎖で作った模様（' + GW + ' × ' + GH + ' マス、左上から 1 マスずつ）', gx, y0 - 6);
  if (genRow < GH) { stroke(...CREAM); strokeWeight(1); line(gx, y0 + (genRow / GH) * ghei, gx + gwid, y0 + (genRow / GH) * ghei); }
  // ---- 遷移行列のヒートマップ（横と縦）
  let hx = gx + gwid + 40, cell = Math.max(10, Math.min(22, (width - hx - 50) / NCOL));
  heatmap(horT, hx, y0 + 20, cell, '横の遷移：左 → 右');
  heatmap(vertT, hx, y0 + 60 + NCOL * cell + 30, cell, '縦の遷移：上 → 下');
  noStroke(); fill(...SUB); textSize(12); textAlign(LEFT, BASELINE);
  let ty = y0 + 2 * (NCOL * cell) + 150;
  text('対角が濃い = 同じ色が続く', hx, ty); text('w = 0 だと縦の関係を使わず横じまに', hx, ty + 18);
  drawSelfTest(width - 180, height - 14);
}
function heatmap(m, x, y, c, title) {    // 行 = 今の色、列 = 次の色（白いほど確率が大きい）
  noStroke(); fill(...CREAM); textSize(13); textAlign(LEFT, BASELINE); text(title, x, y - 8);
  for (let i = 0; i < NCOL; i++) {
    fill(...palette[i]); rect(x, y + 14 + i * c, c - 2, c - 2); rect(x + 14 + (i + 1) * c, y, c - 2, c - 2 - 6);
    for (let j = 0; j < NCOL; j++) { let v = Math.sqrt(m[i][j]); fill(40 + 210 * v, 36 + 200 * v, 34 + 180 * v); rect(x + 14 + (j + 1) * c, y + 14 + i * c, c - 2, c - 2); }
  }
}

function keyPressed() {
  if (key === ' ') startPattern();
  if (key === 'c' || key === 'C') { useCam = !useCam; }
  if (key === 'f' || key === 'F') frozen = !frozen;
  if (key === 's' || key === 'S') saveCanvas('markov_texture', 'png');
  if (key === UP_ARROW) { vMix = Math.min(2, Math.round((vMix + 0.2) * 10) / 10); startPattern(); }
  if (key === DOWN_ARROW) { vMix = Math.max(0, Math.round((vMix - 0.2) * 10) / 10); startPattern(); }
  return false;
}

// やってみよう
// 1. しま模様のシャツや本棚をカメラに映すと、模様はどう変わる？ F で学習を止めてじっくり見よう
// 2. w を 0（横だけ）にすると、なぜ横じまになる？ 2 にすると？
// 3. NCOL を 4 や 16 に変えると、模様の細かさはどう変わる？
// 4. 遷移を「右どなり」ではなく「2 つ右」で数えると？

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(150);
  let px = makeTestPixels(CW, CH), r = kmeansStep(initPalette(px), px, 6), n = CW * CH, okN = true;
  for (let i = 0; i < n; i++) if (r.lab[i] !== nearestCol(r.pal, px[4 * i], px[4 * i + 1], px[4 * i + 2])) okN = false;
  check('8 色に減らす：どの画素も一番近い色に分けられている', okN && r.pal.length === NCOL);
  let t = countTransitions(r.lab, CW, CH);
  check('数えた数（輪っか）：横も縦も ' + CW * CH + ' 組', totalOf(t.hc) === CW * CH && totalOf(t.vc) === CW * CH);
  check('輪っかなので、色の割合は横の連鎖の定常分布：π 横 = π', maxAbsDiff(vecMat(t.freq, t.horP), t.freq) < 1e-12 && maxAbsDiff(vecMat(t.freq, t.vertP), t.freq) < 1e-12);
  check('横・縦の遷移行列の各行の合計 = 1、色の割合の合計 = 1', rowSumErr(t.horP) < 1e-12 && rowSumErr(t.vertP) < 1e-12 && near(sumOf(t.freq), 1, 1e-12));
  // しま模様（横に 0, 1, 2 のくり返し、縦は同じ）→ 模様をそのまま作り直す
  let sw = 30, sh = 20, sl = new Int32Array(sw * sh); for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) sl[y * sw + x] = x % 3;
  let ts = countTransitions(sl, sw, sh), gl = new Int32Array(sw * sh), okS = true;
  check('しま模様：横は 0→1→2→0 が確率 1、縦は同じ色が確率 1', ts.horP[0][1] === 1 && ts.horP[1][2] === 1 && ts.horP[2][0] === 1 && [0, 1, 2].every((k) => ts.vertP[k][k] === 1));
  generateRows(gl, sw, 0, sh, ts.horP, ts.vertP, ts.freq, 1);
  for (let y = 1; y < sh; y++) for (let x = 0; x < sw; x++) if (gl[y * sw + x] !== gl[x] || (x > 0 && gl[x] !== (gl[x - 1] + 1) % 3)) okS = false;
  check('しま模様から作った模様は、きちんと同じしま模様', okS);
  // 横の連鎖だけで長い列を作ると、遷移の割合 ≈ 横の遷移行列
  let cur = 0, cnt = zerosMat(NCOL); for (let k = 0; k < 60000; k++) { let nx = sampleFrom(t.horP[cur]); cnt[cur][nx]++; cur = nx; }
  let worst = 0; for (let i = 0; i < NCOL; i++) { let s = sumOf(cnt[i]); if (s > 2000) for (let j = 0; j < NCOL; j++) worst = Math.max(worst, Math.abs(cnt[i][j] / s - t.horP[i][j])); }
  check('横の連鎖で 6 万歩：つながりの割合 ≈ 横の遷移行列（ずれ < 0.02）', worst < 0.02);
  // 模様の中のとなりどうしは、元の映像で起きたつながりだけ（確率 0 のつながりは作らない）
  let pairStats = (g, w) => { let hOk = 0, hN = 0, vOk = 0, vN = 0; for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { let c = g[y * GW + x]; if (x > 0) { hN++; if (t.horP[g[y * GW + x - 1]][c] > 0) hOk++; } if (y > 0) { vN++; if (t.vertP[g[(y - 1) * GW + x]][c] > 0) vOk++; } } return [hOk / hN, vOk / vN]; };
  let g0 = new Int32Array(GW * GH); generateRows(g0, GW, 0, GH, t.horP, t.vertP, t.freq, 0);
  let g2 = new Int32Array(GW * GH); generateRows(g2, GW, 0, GH, t.horP, t.vertP, t.freq, 1);
  let s0 = pairStats(g0), s2 = pairStats(g2);
  check('w = 0 と 1：横のとなりは全部、元の映像にあるつながり', s0[0] === 1 && s2[0] === 1);
  check('w = 1：縦のとなりも ' + Math.round(s2[1] * 100) + '% が元の映像にあるつながり（w = 0 は ' + Math.round(s0[1] * 100) + '%）', s2[1] > 0.95 && s2[1] >= s0[1]);
  let one = new Int32Array(100).fill(3), t1 = countTransitions(one, 10, 10), g1 = new Int32Array(100); generateRows(g1, 10, 0, 10, t1.horP, t1.vertP, t1.freq, 1);
  check('1 色だけの映像でも NaN にならず、模様も 1 色', noNaN(t1.horP) && noNaN(t1.vertP) && g1.every((v) => v === 3));
  reportSelfTest();
}
function totalOf(m) { let s = 0; for (let r of m) s += sumOf(r); return s; }

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
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) || ArrayBuffer.isView(v) ? Array.from(v).every(noNaN) : !(typeof v === 'number' && !isFinite(v)); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(120, 220, 190) : color(255, 90, 90)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
