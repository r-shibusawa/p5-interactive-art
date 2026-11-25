// ============================================
// 15 カメラ映像の動きをなめらかに判定 📷 ─ カメラの前のようす（いない・座っている・動いている）を、映像の「動きの量」だけから当てる。
// 動きの量 = 前のコマとの明るさの差の平均。それを 3 段階の観測（静か・少し動く・大きく動く）にする。
//   上の帯：そのコマの観測だけで決める（座っていても少し動けば「動いている」になる → ちらつく）
//   下の帯：HMM のフィルタ P(状態 | これまでの観測)。「状態はすぐには変わらない」（遷移行列の対角が大きい）ことを知っているので安定する
// 1 秒に 10 回、予測（× A）→ 更新（× b(観測)）をくり返すだけ（02 と同じ計算）
// C カメラ ⇔ マウス / ↑↓ 状態の変わりにくさ / ← → 動きの感度 / スペース 止める / R やり直し / S 画面を保存
// カメラが使えないときは、マウスを動かす速さを「動きの量」として使う
// ============================================

const ACT_STATES = ['いない', '座っている', '動いている'], ACT_OBS = ['静か', '少し動く', '大きく動く'];
const CW = 64, CH = 48;                  // ★ 動きを調べる映像の大きさ
const STEP_FRAMES = 6;                   // ★ 何コマごとに 1 回判定するか（60 fps なら 1 秒に 10 回）
const N_HIST = 240;                      // ★ 帯に残す判定の数（24 秒ぶん）
const ACT_EM = [[0.96, 0.035, 0.005], [0.6, 0.38, 0.02], [0.1, 0.4, 0.5]];   // ★ 出力行列 B（行 = 状態、列 = 静か・少し・大きく）
let stay = 0.97;                         // ★ 同じ状態にとどまる確率（大きいほど安定、小さいほどすばやい）
let gain = 1;                            // ★ 動きの感度
let cap = null, useCam = true, paused = false, prevGray = null, motionAcc = 0, motionN = 0, motionNow = 0;
let act = null, belief = [1 / 3, 1 / 3, 1 / 3], rawHist = [], filtHist = [], obsHist = [], lastMouse = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  act = activityModel(stay); restart();
  try { cap = createCapture(VIDEO, { flipped: true }); cap.size(CW, CH); cap.hide(); } catch (e) { cap = null; }
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
function restart() { belief = [1 / 3, 1 / 3, 1 / 3]; rawHist = []; filtHist = []; obsHist = []; }
function camLive() { return useCam && cap && cap.width > 0 && cap.elt && cap.elt.readyState >= 2 && cap.elt.videoWidth > 0; }
// ★ モデル：とどまる確率 s。いない ⇔ 座っている ⇔ 動いている と、となりへ移りやすい
function activityModel(s) {
  let r = 1 - s;
  return { p0: [1 / 3, 1 / 3, 1 / 3], tr: [[s, r * 0.8, r * 0.2], [r * 0.5, s, r * 0.5], [r * 0.2, r * 0.8, s]], em: ACT_EM };
}
function frameDiff(a, b) {               // ★ 2 コマの明るさの差の平均（0〜255）。a, b は明るさの配列
  if (!a || !b || a.length !== b.length || !a.length) return 0;
  let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
  return s / a.length;
}
function grayOf(px, n) { let g = new Float32Array(n); for (let i = 0; i < n; i++) g[i] = 0.299 * px[4 * i] + 0.587 * px[4 * i + 1] + 0.114 * px[4 * i + 2]; return g; }
function quantise(v, k) { let u = v * k; return u < 1.5 ? 0 : u < 8 ? 1 : 2; }       // ★ 動きの量 → 観測（静か・少し・大きく）
function rawDecide(m, x) { return argMax(m.em.map((r) => r[x])); }                    // ★ その観測をいちばん出しやすい状態（1 コマだけで決める）
function filterStep(m, b, x) { return normRow(vecMat(b, m.tr).map((v, j) => v * m.em[j][x])); }   // ★ 予測 → 更新
function countSwitches(seq) { let c = 0; for (let t = 1; t < seq.length; t++) if (seq[t] !== seq[t - 1]) c++; return c; }
function judgeStep(x) {
  belief = filterStep(act, belief, x);
  obsHist.push(x); rawHist.push(rawDecide(act, x)); filtHist.push(argMax(belief));
  for (let h of [obsHist, rawHist, filtHist]) if (h.length > N_HIST) h.shift();
}

function draw() {
  background(...BG);
  let live = camLive(), m = 0;
  if (live) { cap.loadPixels(); if (cap.pixels && cap.pixels.length >= CW * CH * 4) { let g = grayOf(cap.pixels, CW * CH); m = frameDiff(g, prevGray); prevGray = g; } }
  else { m = lastMouse ? clampv(Math.hypot(mouseX - lastMouse[0], mouseY - lastMouse[1]) * 0.6, 0, 60) : 0; lastMouse = [mouseX, mouseY]; }
  if (!paused) { motionAcc += m; motionN++; if (motionN >= STEP_FRAMES) { motionNow = motionAcc / motionN; motionAcc = 0; motionN = 0; judgeStep(quantise(motionNow, gain)); } }
  hudTitle('カメラ映像の動きをなめらかに判定：' + (live ? 'カメラ' : 'マウスの動き') + ' → 観測 → HMM のフィルタ', 'C カメラ ⇔ マウス　↑↓ 状態の変わりにくさ ' + fmtN(stay, 3) + '　← → 動きの感度 ' + fmtN(gain, 1) + '　スペース ' + (paused ? '再開' : '止める') + '　R やり直し　S 保存');
  // ---- 映像と動きの量
  let vx = 40, vy = 110, vw = 256, vh = 192;
  panelBox(vx, vy, vw, vh); if (live) image(cap, vx, vy, vw, vh); else note('カメラなし：マウスを動かしてみよう', vx + 24, vy + vh / 2, DIMC, 13);
  let x = quantise(motionNow, gain);
  note('動きの量 ' + fmtN(motionNow * gain, 1) + ' → 観測：' + ACT_OBS[x], vx, vy + vh + 28, LAN, 15);
  noStroke(); fill(...LINEC); rect(vx, vy + vh + 40, vw, 14, 4); fill(...LAN); rect(vx, vy + vh + 40, vw * clampv((motionNow * gain) / 16, 0, 1), 14, 4);
  stroke(...INK); strokeWeight(1); for (let th of [1.5, 8]) line(vx + (vw * th) / 16, vy + vh + 36, vx + (vw * th) / 16, vy + vh + 58);
  note('たての線 = 観測の境目（1.5 と 8）', vx, vy + vh + 76, DIMC, 12);
  // ---- 信念
  let bx = vx + vw + 60, bw = Math.min(360, width - bx - 480), best = argMax(belief);
  note('HMM の信念 P(状態 | これまでの観測)', bx, vy + 4, INK, 14);
  for (let j = 0; j < 3; j++) {
    let yy = vy + 24 + j * 44; noStroke(); fill(...LINEC); rect(bx + 90, yy, bw, 26, 5); fill(...ST_COLS[j]); rect(bx + 90, yy, bw * belief[j], 26, 5);
    note(ACT_STATES[j], bx, yy + 19, j === best ? INK : DIMC, 14); note(fmtN(belief[j], 2), bx + 96 + bw, yy + 19, DIMC, 13);
  }
  note('HMM の判定：' + ACT_STATES[best], bx, vy + 180, ST_COLS[best], 24);
  note('1 コマだけの判定：' + ACT_STATES[rawDecide(act, x)], bx, vy + 212, DIMC, 15);
  // ---- 行列
  let mx = width - 400;
  note('遷移行列 A（1 回の判定で）', mx, vy + 4, ROSE, 13); drawMatrix(act.tr, mx + 80, vy + 30, 70, 26, ACT_STATES, null, { col: ROSE, ts: 11, digits: 3 });
  note('出力行列 B（列 = 静か・少し・大きく）', mx, vy + 136, LAN, 13); drawMatrix(act.em, mx + 80, vy + 152, 70, 26, ACT_STATES, null, { col: LAN, ts: 11, digits: 3 });
  // ---- 帯
  let hx = 40, hw = width - 80, hy = vy + vh + 120, colOf = (z) => ST_COLS[z];
  note('観測（暗 = 静か、黄 = 少し動く、白 = 大きく動く）', hx, hy - 6, LAN, 12);
  drawBandN(obsHist, hx, hy, hw, 14, (o) => [LINEC, LAN, INK][o]);
  note('1 コマだけで決める：切りかわり ' + countSwitches(rawHist) + ' 回（ちらつく）', hx, hy + 44, DIMC, 13);
  drawBandN(rawHist, hx, hy + 50, hw, 26, colOf);
  note('HMM のフィルタで決める：切りかわり ' + countSwitches(filtHist) + ' 回（安定）', hx, hy + 106, INK, 13);
  drawBandN(filtHist, hx, hy + 112, hw, 26, colOf);
  for (let j = 0; j < 3; j++) { noStroke(); fill(...ST_COLS[j]); rect(hx + j * 130, hy + 156, 14, 14, 3); note(ACT_STATES[j], hx + j * 130 + 20, hy + 168, DIMC, 12); }
  note('右はしが今。最近 ' + N_HIST / 10 + ' 秒ぶん', hx + hw - 170, hy + 168, DIMC, 12);
  drawSelfTest();
}
function drawBandN(arr, x, y, w, h, colOf) {   // N_HIST 個ぶんの幅の帯（右づめ）
  noStroke(); fill(...PANEL); rect(x, y, w, h);
  let cw = w / N_HIST, off = N_HIST - arr.length;
  for (let s = 0, t = 1; t <= arr.length; t++) if (t === arr.length || arr[t] !== arr[s]) { fill(...colOf(arr[s])); rect(x + (off + s) * cw, y, (t - s) * cw + 0.6, h); s = t; }
}

function keyPressed() {
  if (key === 'c' || key === 'C') { useCam = !useCam; prevGray = null; lastMouse = null; }
  if (key === ' ') paused = !paused;
  if (key === 'r' || key === 'R') restart();
  if (key === 's' || key === 'S') saveCanvas('activity_hmm', 'png');
  if (key === UP_ARROW) { stay = Math.min(0.995, Math.round((stay + 0.005) * 1000) / 1000); act = activityModel(stay); }
  if (key === DOWN_ARROW) { stay = Math.max(0.5, Math.round((stay - 0.02) * 1000) / 1000); act = activityModel(stay); }
  if (key === RIGHT_ARROW) gain = Math.min(8, Math.round((gain + 0.2) * 10) / 10);
  if (key === LEFT_ARROW) gain = Math.max(0.2, Math.round((gain - 0.2) * 10) / 10);
  return false;
}

// やってみよう
// 1. カメラの前でじっと座る → 手をふる → 画面の外に出る、をやってみよう。上の帯と下の帯の切りかわりの回数はどのくらいちがう？
// 2. ↓ で変わりにくさを 0.5 まで下げると、HMM の判定はどうなる？ 0.995 だと、立ち上がってから判定が変わるまで何秒かかる？
// 3. 「座っている」と「いない」は、どちらも「静か」が多い。HMM はどうやって区別している？（B の 2 行目と、少しの動き）
// 4. 状態に「2 人いる」を足すには、ACT_EM と activityModel をどう変える？

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(850);
  let m = activityModel(0.97);
  check('遷移行列・出力行列の行の合計 = 1（とどまる確率 0.5〜0.995 のどれでも）', [0.5, 0.8, 0.97, 0.995].every((s) => rowSumErr(activityModel(s).tr) < 1e-12) && rowSumErr(ACT_EM) < 1e-12);
  let a = new Float32Array(100).fill(40), b = new Float32Array(100).fill(40), c = new Float32Array(100).fill(215);
  check('動きの量：同じコマどうしは 0、明るさが 175 ちがえば 175、長さがちがう・空なら 0', frameDiff(a, b) === 0 && near(frameDiff(a, c), 175, 1e-9) && frameDiff(a, null) === 0 && frameDiff(a, new Float32Array(5)) === 0);
  check('観測の境目：1.4 → 静か、1.6 → 少し動く、8.5 → 大きく動く。感度 2 倍なら 0.8 でも少し動く', quantise(1.4, 1) === 0 && quantise(1.6, 1) === 1 && quantise(8.5, 1) === 2 && quantise(0.8, 2) === 1);
  check('1 コマだけの判定：静か → いない、少し動く → 動いている、大きく動く → 動いている', rawDecide(m, 0) === 0 && rawDecide(m, 1) === 2 && rawDecide(m, 2) === 2);
  let xs = [0, 1, 0, 0, 2, 1, 1], bel = m.p0.slice(), fs = fwdScaled({ p0: vecMat(m.p0, m.tr), tr: m.tr, em: m.em }, emTable(m, xs)), worst = 0;
  for (let t = 0; t < xs.length; t++) { bel = filterStep(m, bel, xs[t]); worst = Math.max(worst, maxAbsDiff(bel, fs.ah[t]), Math.abs(sumOf(bel) - 1)); }
  let bf = bruteAll({ p0: vecMat(m.p0, m.tr), tr: m.tr, em: m.em }, emTable(m, xs));
  check('フィルタ（予測 → 更新）= スケーリングつき前向き = 総当たり（3⁷ = 2187 本）の事後確率', worst < 1e-12 && maxAbsDiff(bel, bf.gam[6]) < 1e-12);
  let s = hmmSample(m, 6000), raw = s.xs.map((x) => rawDecide(m, x)), fil = [], bb = m.p0.slice(), accR = 0, accF = 0;
  for (let t = 0; t < 6000; t++) { bb = filterStep(m, bb, s.xs[t]); fil.push(argMax(bb)); if (raw[t] === s.zs[t]) accR++; if (fil[t] === s.zs[t]) accF++; }
  check('モデルが作った 6000 回の判定：当たりは HMM ' + Math.round(accF / 60) + '% > 1 コマだけ ' + Math.round(accR / 60) + '%（差 > 10 ポイント）', accF > accR + 600);
  let sT = countSwitches(s.zs), sR = countSwitches(raw), sF = countSwitches(fil);
  check('切りかわりの回数：本当 ' + sT + '、HMM ' + sF + '、1 コマだけ ' + sR + '（1 コマだけは HMM の 3 倍以上ちらつく）', sR > 3 * sF && sF < 3 * sT + 10);
  let sit = new Array(300).fill(0).map((_, t) => (t % 5 === 0 ? 1 : 0)), b2 = m.p0.slice(), flips = 0, lastZ = -1; for (let x of sit) { b2 = filterStep(m, b2, x); let z = argMax(b2); if (z !== lastZ) { flips++; lastZ = z; } }
  check('「静か 4 回 + 少し動く 1 回」のくり返し（座っている人）：HMM は「座っている」に落ち着く（切りかわり ' + (flips - 1) + ' 回以下 3）、1 コマだけは 119 回', argMax(b2) === 1 && flips - 1 <= 3 && countSwitches(sit.map((x) => rawDecide(m, x))) === 119);
  let z0 = filterStep({ p0: [1, 0, 0], tr: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], em: [[1, 0, 0], [0, 1, 0], [0, 0, 1]] }, [1, 0, 0], 2);
  check('ありえない観測でも NaN にならない（一様にもどる）', noNaN(z0) && near(sumOf(z0), 1, 1e-12));
  reportSelfTest();
}

// ==================================================
// ここから下は「HMM の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 色と小さな道具（霧の夜と灯り：黄 = 見える観測、ばら色 = 隠れた状態）
const BG = [27, 33, 44];                // 背景（霧の夜の青ねずみ色）
const INK = [230, 234, 240];            // 文字（やわらかい白）
const LAN = [250, 208, 100], ROSE = [236, 124, 150], AQUA = [110, 200, 210], LILAC = [176, 156, 236], LEAF = [150, 210, 130], TANG = [240, 160, 96];
const DIMC = [142, 154, 172], PANEL = [38, 46, 60], LINEC = [76, 88, 108];
const ST_COLS = [ROSE, AQUA, LAN, LILAC, LEAF, TANG, [200, 200, 210], [130, 150, 240]];   // 状態の色
function clampv(v, a, b) { return v < a ? a : v > b ? b : v !== v ? a : v; }     // NaN なら a に戻す
function sumOf(a) { let s = 0; for (let v of a) s += v; return s; }
function argMax(a) { let b = 0; for (let i = 1; i < a.length; i++) if (a[i] > a[b]) b = i; return b; }   // 同点なら小さい番号
function fmtN(v, d) { if (typeof v !== 'number' || v !== v) return '?'; if (!isFinite(v)) return v > 0 ? '∞' : '−∞'; let s = v.toFixed(d === undefined ? 2 : d); return /^-0\.?0*$/.test(s) ? s.slice(1) : s; }
function fmtP(v) {                      // 確率の表示：小さい数は 1.2e-5 の形で
  if (typeof v !== 'number' || v !== v) return '?';
  if (v === 0) return '0'; if (Math.abs(v) >= 0.001) return v.toFixed(v >= 0.1 ? 3 : 4); return v.toExponential(1);
}
function hudTitle(t, sub) {             // 左上の見出しと操作の説明（日本語は 1 文字ずつ折り返す）
  textWrap(CHAR); noStroke(); fill(...INK); textSize(22); textAlign(LEFT, BASELINE); text(t, 30, 38);
  fill(...DIMC); textSize(14); textLeading(19); text(sub, 30, 62, width - 60);
}
function panelBox(x, y, w, h) { noStroke(); fill(...PANEL); rect(x, y, w, h, 8); }
function note(s, x, y, col, sz) { noStroke(); fill(...(col || DIMC)); textSize(sz || 13); textAlign(LEFT, BASELINE); text(s, x, y); }
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
function sampleFrom(p) { let u = rnd() * sumOf(p), c = 0; for (let i = 0; i < p.length; i++) { c += p[i]; if (u < c) return i; } return p.length - 1; }   // 確率 p[i] で i を返す
// ---- 隠れマルコフモデルの道具
// モデル m = { p0: はじめの分布 π, tr: 遷移行列 A（tr[i][j] = 状態 i の次に j）, em: 出力行列 B（em[j][k] = 状態 j が記号 k を出す） }
// どの計算も「出力の表」eb[t][j] = b_j(x_t)（時刻 t の観測を状態 j が出す確率）を受け取る → 記号でも数（正規分布）でも同じ道具が使える
function lg(p) { return p > 0 ? Math.log(p) : -Infinity; }          // log 0 は −∞（NaN にしない）
function logSumExp(a) {                // log(Σ e^a_i)：いちばん大きい値を先に引く。全部 −∞ なら −∞
  let m = -Infinity; for (let v of a) if (v > m) m = v;
  if (m === -Infinity) return -Infinity;
  let s = 0; for (let v of a) s += Math.exp(v - m);
  return m + Math.log(s);
}
function normRow(r) { let s = sumOf(r); return s > 1e-300 ? r.map((v) => v / s) : r.map(() => 1 / r.length); }   // 合計 1 に（全部 0 なら一様に）
function rowSumErr(a) { let d = 0; for (let r of a) d = Math.max(d, Math.abs(sumOf(r) - 1)); return d; }
function maxAbsDiff(a, b) { let d = 0; for (let i = 0; i < a.length; i++) d = Math.max(d, Array.isArray(a[i]) ? maxAbsDiff(a[i], b[i]) : Math.abs(a[i] - b[i])); return d; }
function vecMat(v, a) {                // 横ベクトル × 行列：1 歩先の分布
  let out = new Array(a[0].length).fill(0);
  for (let i = 0; i < v.length; i++) if (v[i] !== 0) for (let j = 0; j < out.length; j++) out[j] += v[i] * a[i][j];
  return out;
}
function emTable(m, xs) { return xs.map((x) => m.em.map((r) => r[x])); }   // 記号の列 → 出力の表
function hmmSample(m, n) {             // π, A, B からサイコロで列を作る：zs = 隠れた状態、xs = 観測
  let z = sampleFrom(m.p0), zs = [], xs = [];
  for (let t = 0; t < n; t++) { if (t > 0) z = sampleFrom(m.tr[z]); zs.push(z); xs.push(sampleFrom(m.em[z])); }
  return { zs, xs };
}
// ★ 前向き：α_t(j) = P(x_1..x_t, z_t = j) = b_j(x_t) Σ_i α_{t−1}(i) a_ij。尤度 P(x) = Σ_j α_T(j)
function fwdPlain(m, eb) {
  let n = m.p0.length, al = [];
  for (let t = 0; t < eb.length; t++) {
    let prev = t === 0 ? null : al[t - 1], row = new Array(n);
    for (let j = 0; j < n; j++) { let s = 0; if (t === 0) s = m.p0[j]; else for (let i = 0; i < n; i++) s += prev[i] * m.tr[i][j]; row[j] = s * eb[t][j]; }
    al.push(row);
  }
  return { al, lik: al.length ? sumOf(al[al.length - 1]) : 1 };
}
// ★ 後ろ向き：β_t(i) = P(x_{t+1}..x_T | z_t = i) = Σ_j a_ij b_j(x_{t+1}) β_{t+1}(j)。尤度 = Σ_i π_i b_i(x_1) β_1(i)
function bwdPlain(m, eb) {
  let n = m.p0.length, len = eb.length, be = new Array(len);
  for (let t = len - 1; t >= 0; t--) {
    be[t] = new Array(n).fill(t === len - 1 ? 1 : 0);
    if (t < len - 1) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) be[t][i] += m.tr[i][j] * eb[t + 1][j] * be[t + 1][j];
  }
  let lik = 0; if (len) for (let i = 0; i < n; i++) lik += m.p0[i] * eb[0][i] * be[0][i]; else lik = 1;
  return { be, lik };
}
// ★ スケーリングつきの前向き：毎時刻 合計 c_t で割る。ah[t] = P(z_t | x_1..x_t)（= フィルタ）、log P(x) = Σ log c_t
//   c_t = 0（ありえない観測）なら logLik = −∞ にして、その時刻は一様分布で先へ進む（NaN を作らない）
function fwdScaled(m, eb) {
  let n = m.p0.length, ah = [], cs = [], logLik = 0;
  for (let t = 0; t < eb.length; t++) {
    let pred = t === 0 ? m.p0 : vecMat(ah[t - 1], m.tr), row = pred.map((v, j) => v * eb[t][j]), c = sumOf(row);
    if (!(c > 0)) { logLik = -Infinity; row = new Array(n).fill(1 / n); c = 0; } else { row = row.map((v) => v / c); if (logLik !== -Infinity) logLik += Math.log(c); }
    ah.push(row); cs.push(c);
  }
  return { ah, cs, logLik };
}
function bwdScaled(m, eb, cs) {         // 同じ c_t で割った後ろ向き。γ_t(i) = ah[t][i] × bh[t][i]
  let n = m.p0.length, len = eb.length, bh = new Array(len);
  for (let t = len - 1; t >= 0; t--) {
    bh[t] = new Array(n).fill(t === len - 1 ? 1 : 0);
    if (t < len - 1) { let c = cs[t + 1] > 0 ? cs[t + 1] : 1; for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < n; j++) s += m.tr[i][j] * eb[t + 1][j] * bh[t + 1][j]; bh[t][i] = s / c; } }
  }
  return bh;
}
function fwdLog(m, eb) {                // 対数のまま：log α_t(j) = log b_j(x_t) + logSumExp_i(log α_{t−1}(i) + log a_ij)
  let n = m.p0.length, la = [], lt = m.tr.map((r) => r.map(lg)), buf = new Array(n);
  for (let t = 0; t < eb.length; t++) {
    let row = new Array(n);
    for (let j = 0; j < n; j++) { let s; if (t === 0) s = lg(m.p0[j]); else { for (let i = 0; i < n; i++) buf[i] = la[t - 1][i] + lt[i][j]; s = logSumExp(buf); } row[j] = s + lg(eb[t][j]); }
    la.push(row);
  }
  return { la, logLik: la.length ? logSumExp(la[la.length - 1]) : 0 };
}
// ★ 平滑化：γ_t(i) = P(z_t = i | 全部の観測)。filt = フィルタ P(z_t | x_1..x_t)
function smoothAll(m, eb) {
  let f = fwdScaled(m, eb), bh = bwdScaled(m, eb, f.cs);
  let gam = f.ah.map((a, t) => normRow(a.map((v, i) => v * bh[t][i])));
  return { filt: f.ah, gam, bh, cs: f.cs, logLik: f.logLik };
}
function xiAt(m, eb, sm, t) {           // ξ_t(i, j) = P(z_t = i, z_{t+1} = j | 全部の観測)
  let n = m.p0.length, c = sm.cs[t + 1] > 0 ? sm.cs[t + 1] : 1, out = [];
  for (let i = 0; i < n; i++) { out.push(new Array(n)); for (let j = 0; j < n; j++) out[i][j] = (sm.filt[t][i] * m.tr[i][j] * eb[t + 1][j] * sm.bh[t + 1][j]) / c; }
  return out;
}
// ★ ビタビ（対数）：dl[t][j] = 時刻 t に状態 j で終わるいちばん良い道の log 確率、bp[t][j] = そのとき 1 つ前にいた状態（戻り矢印）
function viterbiLog(m, eb) {
  let n = m.p0.length, len = eb.length, dl = [], bp = [], lt = m.tr.map((r) => r.map(lg));
  for (let t = 0; t < len; t++) {
    let row = new Array(n), back = new Array(n).fill(-1);
    for (let j = 0; j < n; j++) {
      let best = -Infinity, arg = -1;
      if (t === 0) best = lg(m.p0[j]); else for (let i = 0; i < n; i++) { let v = dl[t - 1][i] + lt[i][j]; if (v > best) { best = v; arg = i; } }
      row[j] = best + lg(eb[t][j]); back[j] = arg;
    }
    dl.push(row); bp.push(back);
  }
  let vitPath = new Array(len).fill(0), logP = len ? -Infinity : 0;
  if (len) { let z = argMax(dl[len - 1]); logP = dl[len - 1][z]; for (let t = len - 1; t >= 0; t--) { vitPath[t] = z; z = bp[t][z] >= 0 ? bp[t][z] : 0; } }
  return { vitPath, logP, dl, bp };
}
function pathLogProb(m, eb, zs) {       // 1 本の道 zs と観測がいっしょに起きる log 確率
  let s = 0; for (let t = 0; t < zs.length; t++) s += (t === 0 ? lg(m.p0[zs[0]]) : lg(m.tr[zs[t - 1]][zs[t]])) + lg(eb[t][zs[t]]);
  return s;
}
function postDecode(gam) { return gam.map(argMax); }                 // 事後復号：時刻ごとにいちばんありそうな状態
// ★ 総当たり：N^T 本の道を全部ためす（短い列だけ）。尤度、γ、ξ、いちばん良い道
function bruteAll(m, eb) {
  let n = m.p0.length, len = eb.length, total = Math.pow(n, len), zs = new Array(len).fill(0);
  let lik = 0, gam = eb.map(() => new Array(n).fill(0)), xi = eb.slice(1).map(() => m.p0.map(() => new Array(n).fill(0))), bestP = -1, best = null;
  for (let k = 0; k < total; k++) {
    let r = k; for (let t = len - 1; t >= 0; t--) { zs[t] = r % n; r = Math.floor(r / n); }
    let p = 1; for (let t = 0; t < len && p > 0; t++) p *= (t === 0 ? m.p0[zs[0]] : m.tr[zs[t - 1]][zs[t]]) * eb[t][zs[t]];
    if (p > bestP) { bestP = p; best = zs.slice(); }
    if (p === 0) continue;
    lik += p; for (let t = 0; t < len; t++) { gam[t][zs[t]] += p; if (t > 0) xi[t - 1][zs[t - 1]][zs[t]] += p; }
  }
  if (lik > 0) { gam = gam.map((g) => g.map((v) => v / lik)); xi = xi.map((x) => x.map((r) => r.map((v) => v / lik))); }
  return { lik, gam, xi, best, bestP, paths: total };
}
function stationaryOf(tr) {             // 定常分布 π A = π（なまけた連鎖 (π + πA)/2 をくり返す。周期があっても収束する）
  let v = new Array(tr.length).fill(1 / tr.length);
  for (let k = 0; k < 4000; k++) { let w = vecMat(v, tr), d = 0; for (let i = 0; i < v.length; i++) { let u = (v[i] + w[i]) / 2; d = Math.max(d, Math.abs(u - v[i])); v[i] = u; } if (d < 1e-15) break; }
  return normRow(v);
}
function hmmLogLik(m, xs) { return fwdScaled(m, emTable(m, xs)).logLik; }   // 記号の列の対数尤度 log P(x)
function predictK(belief, tr, k) { let v = belief.slice(); for (let s = 0; s < k; s++) v = vecMat(v, tr); return v; }   // k 歩先の予測：A を k 回掛ける
// ---- グラフの道具：g = { x, y, w, h, x0, x1, y0, y1 }
function gX(g, v) { return g.x + clampv((v - g.x0) / (g.x1 - g.x0), -0.02, 1.02) * g.w; }
function gY(g, v) { return g.y + g.h - clampv((v - g.y0) / (g.y1 - g.y0), -0.02, 1.02) * g.h; }
function plotAxes(g, xl, yl, xt, yt) {
  stroke(...LINEC); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h);
  noStroke(); fill(...DIMC); textSize(12); textAlign(CENTER, TOP);
  for (let v of xt) text(+v.toPrecision(4), gX(g, v), g.y + g.h + 4);
  textAlign(RIGHT, CENTER);
  for (let v of yt) text(+v.toPrecision(4), g.x - 5, gY(g, v));
  textAlign(LEFT, BASELINE); fill(...INK); textSize(13);
  text(xl, g.x + g.w - textWidth(xl), g.y + g.h + 32); text(yl, g.x, g.y - 8);
}
function polyline(pts) {               // 点が 2 つ以上あるときだけ折れ線を描く（空の beginShape を作らない）
  if (pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape();
}
function drawCurve(g, arr, col, sw, xOff, from, to) {   // arr[i] を x = i (+ xOff) に。長いときは間引いて 600 点まで
  let a = from || 0, b = to === undefined ? arr.length : to, n = b - a, stride = Math.max(1, Math.ceil(n / 600)), pts = [];
  for (let i = a; i < b; i += stride) if (isFinite(arr[i])) pts.push([gX(g, i + (xOff || 0)), gY(g, arr[i])]);
  stroke(...col); strokeWeight(sw || 2); polyline(pts);
}
function legend(x, y, items) {         // items = [[色, 名前], …]
  textSize(13); textAlign(LEFT, CENTER);
  for (let [c, s] of items) { noStroke(); fill(...c); rect(x, y - 5, 16, 10, 2); fill(...INK); text(s, x + 22, y); y += 20; }
}
function drawMatrix(a, x, y, cw, ch, rowNames, colNames, opts) {   // 行列を色つきの表で（明るい = 大きい）
  opts = opts || {}; let d = opts.digits === undefined ? 2 : opts.digits, col = opts.col || AQUA;
  textAlign(CENTER, CENTER); textSize(opts.ts || 13);
  for (let i = 0; i < a.length; i++) for (let j = 0; j < a[i].length; j++) {
    let v = a[i][j], t = clampv(Math.abs(v) / (opts.hi || 1), 0, 1); noStroke();
    fill(PANEL[0] + t * (col[0] * 0.75 - PANEL[0]), PANEL[1] + t * (col[1] * 0.75 - PANEL[1]), PANEL[2] + t * (col[2] * 0.75 - PANEL[2])); rect(x + j * cw, y + i * ch, cw - 2, ch - 2, 3);
    if (opts.numbers !== false) { fill(...INK); text(fmtN(v, d), x + j * cw + cw / 2, y + i * ch + ch / 2); }
  }
  fill(...DIMC);
  if (rowNames) for (let i = 0; i < a.length; i++) { textAlign(RIGHT, CENTER); text(rowNames[i], x - 6, y + i * ch + ch / 2); }
  if (colNames) for (let j = 0; j < a[0].length; j++) { textAlign(CENTER, BOTTOM); text(colNames[j], x + j * cw + cw / 2, y - 3); }
}
function drawBand(arr, x, y, w, h, colOf) {   // 状態の列を色の帯で（同じ色が続くところは 1 つの四角にまとめる）
  let n = arr.length, s = 0; noStroke();
  for (let t = 1; t <= n; t++) if (t === n || arr[t] !== arr[s]) { let c = colOf(arr[s]); if (c) { fill(...c); rect(x + (s / n) * w, y, ((t - s) / n) * w + 0.6, h); } s = t; }
}
function arrowLine(x1, y1, x2, y2, hs) { // 矢印
  let L = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / L, uy = (y2 - y1) / L; hs = hs || 7;
  line(x1, y1, x2 - ux * hs * 0.6, y2 - uy * hs * 0.6);
  push(); noStroke(); triangle(x2, y2, x2 - ux * hs - uy * hs * 0.5, y2 - uy * hs + ux * hs * 0.5, x2 - ux * hs + uy * hs * 0.5, y2 - uy * hs - ux * hs * 0.5); pop();
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return typeof a === 'number' && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) || ArrayBuffer.isView(v) ? Array.from(v).every(noNaN) : !(typeof v === 'number' && v !== v); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(...(selfTestResults.every((r) => r.ok) ? LEAF : [255, 90, 90])); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x === undefined ? width - 170 : x, y === undefined ? height - 14 : y); }
