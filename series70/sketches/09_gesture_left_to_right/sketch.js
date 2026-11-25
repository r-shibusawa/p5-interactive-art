// ============================================
// 09 左から右へ進む HMM でジェスチャ認識 ─ マウスで描いた線を 24 本の短い矢印に分け、それぞれを 8 方向の記号（→ ↘ ↓ ↙ ← ↖ ↑ ↗）にする。
// ジェスチャごと（丸・三角・Z・L）に 1 つずつ HMM を用意する。状態は 6 個で、「とどまる・次へ・1 つ飛ばす」しかできない（左から右へ。バキス型）。
// 描いた記号の列を 4 つの HMM に入れて尤度 P(x | モデル) をくらべ、いちばん大きいジェスチャと判定する。
// 音声認識で「単語ごとに HMM を作り、いちばん尤度の高い単語を答える」のと同じ考え方（状態 = 単語の中の音の順番）
// ドラッグ 描く / スペース お手本を自動で描く / 1〜4 教えるジェスチャを選ぶ → T 今の線をそのお手本に追加して学習 / C 追加したお手本を忘れる
// ※ 描きはじめの位置と向きも大事：丸は上から時計回り、三角は上から右下へ、Z は左上から、L は上から下へ
// ============================================

const G_NAMES = ['丸', '三角', 'Z', 'L'];
const N_SEG = 24;                        // ★ 線を何本の矢印に分けるか
const N_ST = 6;                          // ★ 1 つのジェスチャの状態の数
const N_TRAIN = 12;                      // ★ はじめに自動で作るお手本の数（ジェスチャごと）
const WOBBLE = 0.02;                    // ★ 自動で作るお手本の「手のふるえ」の大きさ
const EPS_EM = 0.05;                     // ★ 出力の数に足す小さな数（1 度も出なかった方向でも確率 0 にしない）
const DIR_ARROWS = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'];
let gModels = [], trainSets = [], userAdded = [0, 0, 0, 0], drawing = [], lastStroke = null, lastSyms = null, verdict = null, teachSel = 0, isDown = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  seedRng(79); resetTraining(); demoStroke();
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
function resetTraining() { trainSets = G_NAMES.map((_, c) => { let a = []; for (let k = 0; k < N_TRAIN; k++) a.push(strokeToSyms(synthStroke(c, WOBBLE))); return a; }); userAdded = [0, 0, 0, 0]; gModels = trainSets.map((s) => trainClass(s, 15).m); }
function templatePts(c) {                // お手本の形（0〜1 の座標、y は下向き）
  if (c === 0) { let p = []; for (let k = 0; k <= 32; k++) { let a = -Math.PI / 2 + (k / 32) * 2 * Math.PI; p.push([0.5 + 0.5 * Math.cos(a), 0.5 + 0.5 * Math.sin(a)]); } return p; }
  if (c === 1) return [[0.5, 0], [1, 1], [0, 1], [0.5, 0]];
  if (c === 2) return [[0, 0], [1, 0], [0, 1], [1, 1]];
  return [[0, 0], [0, 1], [0.8, 1]];
}
// ★ お手本に「人が描いたようなゆれ」を足す：大きさ・かたむき・点のふるえ
function synthStroke(c, wobble) {
  let base = resample(templatePts(c), 60), sx = 0.8 + 0.4 * rnd(), sy = 0.8 + 0.4 * rnd(), rot = (rnd() - 0.5) * 0.35, cs = Math.cos(rot), sn = Math.sin(rot);
  return base.map(([x, y]) => { let u = (x - 0.5) * sx, v = (y - 0.5) * sy; return [u * cs - v * sn + wobble * randn(), u * sn + v * cs + wobble * randn()]; });
}
// ★ 線を「長さが等しい n 本」に分け直す（速く描いた所も遅く描いた所も同じあつかいに）。短すぎる線は null
function resample(pts, n) {
  if (!pts || pts.length < 2) return null;
  let acc = [0]; for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  let total = acc[acc.length - 1]; if (!(total > 1e-9)) return null;
  let out = [], k = 0;
  for (let s = 0; s <= n; s++) {
    let target = (s / n) * total; while (k < pts.length - 2 && acc[k + 1] < target) k++;
    let seg = acc[k + 1] - acc[k], f = seg > 0 ? clampv((target - acc[k]) / seg, 0, 1) : 0;
    out.push([pts[k][0] + (pts[k + 1][0] - pts[k][0]) * f, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * f]);
  }
  return out;
}
function dirSymbols(pts) {               // ★ となりの点への向きを 8 方向の番号に（0 = 右、2 = 下、4 = 左、6 = 上）
  let out = []; for (let i = 1; i < pts.length; i++) { let a = Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]); out.push(((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8); }
  return out;
}
function strokeToSyms(pts) { let r = resample(pts, N_SEG); return r ? dirSymbols(r) : null; }
// ★ 左から右への HMM の出発点：遷移は「とどまる 0.6・次へ 0.3・1 つ飛ばす 0.1」だけ。0 のところは EM をしても 0 のまま
function bakisStart(n, k) {
  let m = { p0: new Array(n).fill(0), tr: [], em: [] }; m.p0[0] = 1;
  for (let i = 0; i < n; i++) { let row = new Array(n).fill(0); row[i] = 0.6; if (i + 1 < n) row[i + 1] = 0.3; if (i + 2 < n) row[i + 2] = 0.1; m.tr.push(normRow(row)); m.em.push(normRow(new Array(k).fill(0).map(() => 1 + 0.2 * rnd()))); }
  return m;
}
function trainClass(seqs, iters, eps) { let m = bakisStart(N_ST, 8), lls = []; for (let it = 0; it < iters; it++) { let r = baumWelchStep(m, seqs, eps === undefined ? EPS_EM : eps); lls.push(r.logLik); m = r.m; } return { m, lls }; }
// ★ 判定：4 つのモデルの対数尤度をくらべる。どのモデルでも出せない列なら −1
function classify(models, syms) {
  if (!syms || !syms.length) return { best: -1, scores: models.map(() => -Infinity) };
  let scores = models.map((m) => hmmLogLik(m, syms)), best = argMax(scores);
  return { best: scores[best] > -Infinity ? best : -1, scores };
}
function judge() { lastSyms = strokeToSyms(lastStroke); verdict = classify(gModels, lastSyms); }
function demoStroke() {                  // お手本を 1 本、描く場所に合わせて作る
  let c = rndInt(0, 3), sz = Math.min(260, height * 0.32), cx = 60 + drawW() / 2, cy = 120 + drawH() / 2;
  lastStroke = synthStroke(c, WOBBLE).map(([x, y]) => [cx + x * sz, cy + y * sz]); drawing = []; judge();
}
function drawW() { return Math.max(360, width * 0.48); }
function drawH() { return Math.max(300, height - 330); }

function draw() {
  background(...BG);
  hudTitle('左から右へ進む HMM でジェスチャ認識', 'ドラッグ 描く　スペース お手本を自動で描く　1〜4 教えるジェスチャ（今：' + G_NAMES[teachSel] + '）→ T 今の線をお手本に追加　C 追加を忘れる');
  let ax = 60, ay = 120, aw = drawW(), ah = drawH();
  panelBox(ax, ay, aw, ah); note('ここに描く（丸は上から時計回り、三角は上から右下へ、Z は左上から、L は上から下へ）', ax + 12, ay + 22, DIMC, 12);
  // 描いた線：色 = いちばん尤度が高いモデルのビタビの状態（左から右へ進む）
  let vp = verdict && verdict.best >= 0 ? viterbiLog(gModels[verdict.best], emTable(gModels[verdict.best], lastSyms)).vitPath : null, rs = lastStroke ? resample(lastStroke, N_SEG) : null;
  if (rs) for (let i = 1; i < rs.length; i++) { stroke(...(vp ? ST_COLS[vp[i - 1] % ST_COLS.length] : DIMC)); strokeWeight(5); line(rs[i - 1][0], rs[i - 1][1], rs[i][0], rs[i][1]); }
  if (rs) { noStroke(); fill(...INK); circle(rs[0][0], rs[0][1], 12); }
  if (drawing.length > 1) { stroke(...INK); strokeWeight(3); polyline(drawing); }
  // 記号の列
  let sy = ay + ah + 26; note('8 方向の記号の列（24 本）と、その状態', ax, sy, INK, 13);
  if (lastSyms) for (let i = 0; i < lastSyms.length; i++) { let x = ax + i * Math.min(30, aw / 24); noStroke(); fill(...(vp ? ST_COLS[vp[i] % ST_COLS.length] : LINEC)); rect(x, sy + 10, Math.min(30, aw / 24) - 3, 26, 4); fill(...BG); textSize(16); textAlign(CENTER, CENTER); text(DIR_ARROWS[lastSyms[i]], x + Math.min(30, aw / 24) / 2 - 1.5, sy + 23); }
  else note('（線が短すぎて記号にできない）', ax, sy + 30, ROSE, 13);
  for (let s = 0; s < N_ST; s++) { noStroke(); fill(...ST_COLS[s]); rect(ax + s * 62, sy + 52, 14, 14, 3); note('状態 ' + (s + 1), ax + s * 62 + 18, sy + 64, DIMC, 12); }
  // ---- 右：判定
  let rx = ax + aw + 40, post = verdict ? softmaxOf(verdict.scores) : [0, 0, 0, 0];
  note(verdict && verdict.best >= 0 ? '判定：' + G_NAMES[verdict.best] : '判定できない', rx, 150, verdict && verdict.best >= 0 ? LAN : ROSE, 30);
  for (let c = 0; c < 4; c++) {
    let y = 190 + c * 44; note(G_NAMES[c], rx, y + 18, c === teachSel ? LAN : INK, 16);
    noStroke(); fill(...LINEC); rect(rx + 60, y + 4, 220, 18, 4); fill(...(verdict && c === verdict.best ? LAN : DIMC)); rect(rx + 60, y + 4, 220 * post[c], 18, 4);
    note('log P = ' + (verdict ? fmtN(verdict.scores[c], 1) : '—') + '　お手本 ' + trainSets[c].length + ' 本' + (userAdded[c] ? '（+' + userAdded[c] + '）' : ''), rx + 290, y + 18, DIMC, 12);
  }
  note('棒 = 4 つの尤度をくらべた割合（log P が 1 つ大きいと約 2.7 倍）', rx, 384, DIMC, 12);
  // 判定されたモデルの中身
  let show = verdict && verdict.best >= 0 ? verdict.best : teachSel, m = gModels[show], cw = Math.min(40, (width - rx - 80) / 8);
  note('「' + G_NAMES[show] + '」の HMM：出力行列 B（行 = 状態 1〜6、列 = 方向）', rx, 420, INK, 13);
  drawMatrix(m.em, rx + 40, 448, cw, 24, ['1', '2', '3', '4', '5', '6'], DIR_ARROWS, { col: LAN, numbers: false });
  note('遷移行列 A（左下は全部 0 = もどれない）', rx, 448 + 6 * 24 + 30, INK, 13);
  drawMatrix(m.tr, rx + 40, 448 + 6 * 24 + 44, cw, 22, ['1', '2', '3', '4', '5', '6'], null, { col: ROSE, ts: 10 });
  drawSelfTest();
}
function softmaxOf(sc) { let m = Math.max(...sc); if (m === -Infinity) return sc.map(() => 0); return normRow(sc.map((v) => Math.exp(v - m))); }

function mousePressed() { let ax = 60, ay = 120; isDown = mouseX >= ax && mouseX <= ax + drawW() && mouseY >= ay && mouseY <= ay + drawH(); drawing = isDown ? [[mouseX, mouseY]] : []; }
function mouseDragged() { if (isDown && drawing.length < 2000) drawing.push([mouseX, mouseY]); }
function mouseReleased() { if (isDown && drawing.length >= 2) { lastStroke = drawing.slice(); judge(); } drawing = []; isDown = false; }
function keyPressed() {
  if (key === ' ') demoStroke();
  if (key >= '1' && key <= '4' && String(key).length === 1) teachSel = Number(key) - 1;
  if ((key === 't' || key === 'T') && lastSyms) { trainSets[teachSel].push(lastSyms.slice()); userAdded[teachSel]++; if (trainSets[teachSel].length > 60) trainSets[teachSel].splice(N_TRAIN, 1); gModels[teachSel] = trainClass(trainSets[teachSel], 15).m; judge(); }
  if (key === 'c' || key === 'C') { seedRng(79); resetTraining(); judge(); }
  return false;
}

// やってみよう
// 1. 丸・三角・Z・L を自分で描いて、正しく判定される？ 丸を反時計回りに描くとどうなる？ なぜ？
// 2. 線の色（状態）は、描きはじめから終わりまで順番に変わっていく。三角の「かど」と色の変わり目は合っている？
// 3. 自分だけのジェスチャ（たとえば「V」）を 5 回描いて、4 キー → T で「L」のかわりに教えよう
// 4. N_ST を 2 にすると（状態が少ない）、どのジェスチャが見分けられなくなる？

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(790);
  let rs = resample([[0, 0], [10, 0], [10, 10]], 8), okLen = rs.length === 9; for (let i = 1; i < rs.length; i++) if (!near(Math.hypot(rs[i][0] - rs[i - 1][0], rs[i][1] - rs[i - 1][1]), 2.5, 1e-9)) okLen = false;
  check('線を分け直す：9 個の点が等しい間かく（道のり 20 を 8 等分）', okLen && near(rs[4][0], 10, 1e-9) && near(rs[8][1], 10, 1e-9));
  check('方向の記号：右 0・下 2・左 4・上 6・右下 1', dirSymbols([[0, 0], [5, 0], [5, 5], [0, 5], [0, 0], [3, 3]]).join() === '0,2,4,6,1');
  check('短すぎる線（1 点・同じ点だけ）は記号にしない（null）、判定は −1 で止まらない', strokeToSyms([[3, 3]]) === null && strokeToSyms([[3, 3], [3, 3], [3, 3]]) === null && strokeToSyms(null) === null && classify([bakisStart(6, 8)], null).best === -1);
  let sets = G_NAMES.map((_, c) => { let a = []; for (let k = 0; k < N_TRAIN; k++) a.push(strokeToSyms(synthStroke(c, WOBBLE))); return a; }), trained = sets.map((s) => trainClass(s, 15)), models = trained.map((t) => t.m);
  let okTri = models.every((m) => m.tr.every((row, i) => row.every((v, j) => (j >= i && j <= i + 2) || v === 0)) && rowSumErr(m.tr) < 1e-9 && rowSumErr(m.em) < 1e-9 && m.p0[0] === 1);
  check('学習のあとも遷移行列は上三角（とどまる・次へ・1 つ飛ばす だけ）、行の合計 = 1、いつも状態 1 から始まる', okTri);
  let pure = trainClass(sets[1], 15, 0).lls, okMono = true; for (let i = 1; i < pure.length; i++) if (pure[i] < pure[i - 1] - 1e-9) okMono = false;
  check('バウム-ウェルチ（小さな数を足さない場合）：対数尤度は下がらない', okMono);
  let right = 0, total = 0, okLR = true;
  for (let c = 0; c < 4; c++) for (let k = 0; k < 15; k++) { let syms = strokeToSyms(synthStroke(c, WOBBLE)), v = classify(models, syms); total++; if (v.best === c) right++; let vp = viterbiLog(models[c], emTable(models[c], syms)).vitPath; for (let t = 1; t < vp.length; t++) if (vp[t] < vp[t - 1]) okLR = false; }
  check('新しく作った 60 本のジェスチャ（各 15 本）を全部正しく判定：' + right + ' / ' + total, total === 60 && right === total);
  check('ビタビの状態は左から右へしか進まない（60 本全部）', okLR);
  let z = synthStroke(2, 0.02), fwdLL = hmmLogLik(models[2], strokeToSyms(z)), revLL = hmmLogLik(models[2], strokeToSyms(z.slice().reverse()));
  check('Z を逆向きに描くと、Z のモデルの尤度は大きく下がる（順番も見ている）：' + fmtN(fwdLL, 1) + ' → ' + fmtN(revLL, 1), revLL < fwdLL - 10);
  let junk = []; for (let k = 0; k < 40; k++) junk.push([rnd() * 100, rnd() * 100]); let vj = classify(models, strokeToSyms(junk));
  check('でたらめな線でも NaN にならず、どれかに判定される（尤度はどれも低い）', noNaN(vj.scores) && vj.best >= 0 && Math.max(...vj.scores) < fwdLL - 10);
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
// ---- バウム-ウェルチ（EM）の道具
function randomRow(k, sharp) { let r = []; for (let i = 0; i < k; i++) r.push(Math.pow(0.05 + rnd(), sharp || 1)); return normRow(r); }
function randomHmm(n, k) { let m = { p0: randomRow(n), tr: [], em: [] }; for (let i = 0; i < n; i++) { m.tr.push(randomRow(n)); m.em.push(randomRow(k)); } return m; }
function copyHmm(m) { return { p0: m.p0.slice(), tr: m.tr.map((r) => r.slice()), em: m.em.map((r) => r.slice()) }; }
// ★ 1 回の EM：E ステップで γ（状態 i にいた期待回数）と ξ（i → j と動いた期待回数）を足し合わせ、M ステップで割り算する
//   seqs = 観測列のリスト。eps = 出力の数に足す小さな数（0 でもよい）。戻り値の logLik は「更新する前」のモデルの対数尤度
function baumWelchStep(m, seqs, eps) {
  let n = m.p0.length, k = m.em[0].length, logLik = 0;
  let g0 = new Array(n).fill(0), trNum = m.tr.map(() => new Array(n).fill(0)), emNum = m.em.map(() => new Array(k).fill(eps || 0));
  for (let xs of seqs) {
    if (!xs.length) continue;
    let eb = emTable(m, xs), sm = smoothAll(m, eb); logLik += sm.logLik;
    if (sm.logLik === -Infinity) continue;                    // このモデルでは出せない列は数えない
    for (let i = 0; i < n; i++) g0[i] += sm.gam[0][i];
    for (let t = 0; t < xs.length; t++) for (let i = 0; i < n; i++) emNum[i][xs[t]] += sm.gam[t][i];
    for (let t = 0; t + 1 < xs.length; t++) {
      let c = sm.cs[t + 1];
      for (let i = 0; i < n; i++) { let a = sm.filt[t][i]; if (a === 0) continue; for (let j = 0; j < n; j++) trNum[i][j] += (a * m.tr[i][j] * eb[t + 1][j] * sm.bh[t + 1][j]) / c; }
    }
  }
  let next = { p0: sumOf(g0) > 0 ? normRow(g0) : m.p0.slice(), tr: trNum.map((r, i) => (sumOf(r) > 1e-12 ? normRow(r) : m.tr[i].slice())), em: emNum.map((r, i) => (sumOf(r) > 1e-12 ? normRow(r) : m.em[i].slice())) };
  return { m: next, logLik };
}
function permsOf(n) {                   // 0..n−1 の並べかえを全部（n ≤ 6）
  let out = [], cur = [], used = new Array(n).fill(false);
  (function rec() { if (cur.length === n) { out.push(cur.slice()); return; } for (let i = 0; i < n; i++) if (!used[i]) { used[i] = true; cur.push(i); rec(); cur.pop(); used[i] = false; } })();
  return out;
}
// ★ ラベルの入れかえ：学んだ状態の番号は本物とそろっているとは限らない。cost(本物 i, 学習 p[i]) の合計が最小になる並べかえ p を探す
function bestPerm(n, cost) { let best = null, bc = Infinity; for (let p of permsOf(n)) { let c = 0; for (let i = 0; i < n; i++) c += cost(i, p[i]); if (c < bc) { bc = c; best = p; } } return best; }
function permuteHmm(m, p) { return { p0: p.map((i) => m.p0[i]), tr: p.map((i) => p.map((j) => m.tr[i][j])), em: p.map((i) => m.em[i].slice()) }; }
function rowDist(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s; }
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
