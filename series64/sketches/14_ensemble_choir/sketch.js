// ============================================
// 14 アンサンブルの合唱 🔊 ─ 5 つのモデルが 5 人の歌い手。マウスの位置で、それぞれの予測（クラス）を音の高さで歌う
// クラス 0 なら ド（C）の長三和音、クラス 1 なら ファ♯（F♯）の長三和音の音を、歌い手ごとの決まった位置（根音・3 度・5 度…）で歌う
//   5 人の意見がそろうと 1 つの長三和音（協和音）。割れると C と F♯ の和音が混ざる（不協和音。ペトルーシュカ和音とも呼ばれる）
//   いちばん低い音 = 多数決の答え。音量 = その歌い手の自信（確率が 0.5 から遠いほど大きい）
//   背景 = ソフト投票の地図、白い線 = 5 つのモデルの境界。境界の近くほど意見が割れる
// クリック 音を出す（もう一度で止める）/ A 自動でなぞる / 1〜5 歌い手を黙らせる / ← → データの形 / R データを作り直す
// ============================================

let kind = 4, nTrain = 200, flipP = 0.08, seedD = 2;            // ★ データ
const ROOTS = [48, 54], SINGER_IV = [0, 4, 7, 12, 16];             // ★ クラスの根音（C3 と F♯3）、歌い手ごとの音の位置（半音）
let trainD, models = [], mlpLeft = 0, regionImg, bndImg, voices = [], bass = null, soundOn = false, autoOn = true, mute = [false, false, false, false, false], plotBox, agreeHist = [];
const CELLS = 70;

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); pixelDensity(1); regionImg = createImage(CELLS, CELLS); bndImg = createImage(CELLS, CELLS); selfTest(); restart(); }
function restart() {
  trainD = makeData2D(kind, nTrain, flipP, seedD);
  models = [0, 1, 2, 4].map((k) => fitBase(k, trainD.X, trainD.y)); models.splice(3, 0, { type: 'mlp', net: makeMLP(2, 10, true, 7) });
  mlpLeft = 300; repaint();
}
function repaint() {
  paintImage(regionImg, (u, v) => probCol(softVote(models, [u, v]), 0.7));
  let pr = []; for (let j = 0; j < CELLS; j++) for (let i = 0; i < CELLS; i++) pr.push(models.map((m) => predOf(m, [(i + 0.5) / CELLS, 1 - (j + 0.5) / CELLS])));
  bndImg.loadPixels();
  for (let q = 0; q < CELLS * CELLS; q++) { let i = q % CELLS, edge = 0; for (let k = 0; k < 5; k++) if ((i + 1 < CELLS && pr[q + 1][k] !== pr[q][k]) || (q + CELLS < CELLS * CELLS && pr[q + CELLS][k] !== pr[q][k])) edge++; bndImg.pixels[4 * q] = 255; bndImg.pixels[4 * q + 1] = 245; bndImg.pixels[4 * q + 2] = 220; bndImg.pixels[4 * q + 3] = Math.min(255, edge * 110); }
  bndImg.updatePixels();
}
// ★ 歌い手 k がクラス c のときの音（MIDI 番号）と、多数決の低音
function singerMidi(k, c) { return ROOTS[c] + SINGER_IV[k]; }
function bassMidi(maj) { return ROOTS[maj] - 12; }
function choirAt(x) {
  let ps = models.map((m) => probOf(m, x)), cs = ps.map((p) => (p > 0.5 ? 1 : 0)), n1 = sumArr(cs), maj = 2 * n1 > 5 ? 1 : 0;
  return { ps, cs, maj, agree: Math.max(n1, 5 - n1), midis: cs.map((c, k) => singerMidi(k, c)) };
}

function draw() {
  background(...BG_COL);
  if (mlpLeft > 0) { mlpTrain(models[3].net, trainD.X.map(centerX), trainD.y, 15, 0.03); mlpLeft -= 15; if (mlpLeft <= 0) repaint(); }
  let side = Math.min(height - 170, width * 0.48); plotBox = { x: 40, y: 100, w: side, h: side };
  noSmooth(); image(regionImg, plotBox.x, plotBox.y, side, side); image(bndImg, plotBox.x, plotBox.y, side, side); smooth(); frameBox(plotBox);
  drawPoints(plotBox, trainD.X, trainD.y, 5);
  // 聞く位置：マウス（図の上）か、自動でなぞる 8 の字
  let m = fromPx(plotBox, mouseX, mouseY), onMap = m[0] >= 0 && m[0] <= 1 && m[1] >= 0 && m[1] <= 1, tt = frameCount / 240;
  let pos = autoOn && !onMap ? [0.5 + 0.42 * Math.sin(2 * Math.PI * tt), 0.5 + 0.38 * Math.sin(4 * Math.PI * tt)] : [clampv(m[0], 0, 1), clampv(m[1], 0, 1)];
  let ch = choirAt(pos), pp = toPx(plotBox, pos[0], pos[1]);
  noFill(); stroke(255); strokeWeight(2); circle(pp[0], pp[1], 22); line(pp[0] - 16, pp[1], pp[0] + 16, pp[1]); line(pp[0], pp[1] - 16, pp[0], pp[1] + 16);
  agreeHist.push(ch.agree); if (agreeHist.length > 300) agreeHist.shift();
  // ---- 音
  if (soundOn && audioCtx) {
    ch.midis.forEach((md, k) => setVoice(voices[k], midiHz(md), mute[k] ? 0 : 0.06 + 0.14 * Math.abs(2 * ch.ps[k] - 1)));
    setVoice(bass, midiHz(bassMidi(ch.maj)), 0.22);
  }
  // ---- 右：歌い手
  let rx = plotBox.x + side + 60, rw = width - rx - 40, sy = 150, lo = 30, hi = 72, yOf = (md) => sy + 300 - ((md - lo) / (hi - lo)) * 300;
  noStroke(); fill(...INK); textSize(16); textAlign(LEFT, BASELINE); text('5 人の歌い手（高さ = 歌っている音）', rx, sy - 20);
  for (let md = 36; md <= 72; md += 12) { stroke(70, 50, 56); strokeWeight(1); line(rx, yOf(md), rx + rw, yOf(md)); noStroke(); fill(140, 120, 120); textSize(11); textAlign(RIGHT, CENTER); text('C' + (md / 12 - 1), rx - 4, yOf(md)); }
  ch.midis.forEach((md, k) => {
    let x = rx + 40 + k * ((rw - 120) / 4), y = yOf(md), c = ch.cs[k];
    noStroke(); fill(...(mute[k] ? [70, 60, 60] : CLS_COL[c])); circle(x, y, 26 + 30 * Math.abs(2 * ch.ps[k] - 1));
    fill(20); textAlign(CENTER, CENTER); textSize(12); text(c ? 'F♯' : 'C', x, y);
    fill(...BASE_COL[k]); textSize(12); textAlign(CENTER, TOP); text((k + 1) + ' ' + BASE_NAMES[k], x, sy + 318); fill(200, 185, 170); text('p = ' + fmtNum(ch.ps[k], 2), x, sy + 336);
  });
  let by = yOf(bassMidi(ch.maj)); noStroke(); fill(...GOLD); rect(rx + 10, by - 6, rw - 20, 12, 6); fill(20); textSize(11); textAlign(CENTER, CENTER); text('低音 = 多数決：クラス ' + ch.maj + (ch.maj ? '（F♯）' : '（C）'), rx + rw / 2, by);
  // ---- 一致のようす
  noStroke(); fill(...(ch.agree === 5 ? TEAL : ch.agree === 4 ? GOLD : WINE)); textSize(20); textAlign(LEFT, BASELINE);
  text(ch.agree === 5 ? '5 人一致 → 協和音（長三和音）' : ch.agree + ' 対 ' + (5 - ch.agree) + ' → 不協和音（2 つの和音が混ざる）', rx, sy + 390);
  let g = { x: rx, y: sy + 420, w: rw, h: Math.max(40, height - sy - 500), x0: 0, x1: 300, y0: 2.5, y1: 5.5 };
  plotAxes(g, '', 'これまでの一致の人数（5 = 全員一致）', [], [3, 4, 5]);
  stroke(...GOLD); strokeWeight(2); polyline(agreeHist.map((a, k) => [gX(g, k), gY(g, a)]));
  // ---- 文字
  noStroke(); fill(...INK); textSize(20); textAlign(LEFT, BASELINE); text('アンサンブルの合唱　データ：' + SHAPES[kind] + (mlpLeft > 0 ? '　（ネットを学習中…）' : '') + (soundOn ? '　♪ 音 ON' : '　音 OFF（クリックで ON）'), 40, 40);
  fill(170, 155, 145); textSize(15); text('クリック 音 ON/OFF　A 自動でなぞる' + (autoOn ? '（ON）' : '（OFF）') + '　1〜5 歌い手を黙らせる　← → データの形　R データを作り直す', 40, 66);
  drawSelfTest(width - 170, height - 12);
}
function mousePressed() {
  startAudio(); if (!audioCtx) return;
  if (!voices.length) { for (let k = 0; k < 5; k++) voices.push(makeVoice('triangle')); bass = makeVoice('sine'); }
  soundOn = !soundOn;
  if (!soundOn) { voices.forEach((v) => setVoice(v, 220, 0)); setVoice(bass, 110, 0); }
}
function keyPressed() {
  if (key === 'a' || key === 'A') autoOn = !autoOn;
  for (let k = 1; k <= 5; k++) if (key === String(k)) mute[k - 1] = !mute[k - 1];
  if (key === RIGHT_ARROW) { kind = (kind + 1) % SHAPES.length; restart(); }
  if (key === LEFT_ARROW) { kind = (kind + SHAPES.length - 1) % SHAPES.length; restart(); }
  if (key === 'r' || key === 'R') { seedD++; restart(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let inTriad = (pcs) => { for (let r = 0; r < 12; r++) for (let t of [[0, 4, 7], [0, 3, 7]]) { let tri = t.map((v) => (v + r) % 12); if (pcs.every((p) => tri.includes(p))) return true; } return false; };
  let okU = [0, 1].every((c) => inTriad([0, 1, 2, 3, 4].map((k) => singerMidi(k, c) % 12))), okS = true;
  for (let mask = 1; mask < 31; mask++) if (inTriad([0, 1, 2, 3, 4].map((k) => singerMidi(k, (mask >> k) & 1) % 12))) okS = false;
  check('全員一致なら 5 つの音は 1 つの長三和音の中、割れた 30 通りはどれも 1 つの長三和音・短三和音に入らない', okU && okS);
  check('音の高さ：A4 = MIDI 69 = 440 Hz、1 オクターブ上で 2 倍、低音は根音の 1 オクターブ下', midiHz(69) === 440 && near(midiHz(81) / midiHz(69), 2, 1e-12) && bassMidi(0) === 36 && bassMidi(1) === 42);
  let tr = makeData2D(4, 200, 0.08, 2), te = makeData2D(4, 500, 0.08, 99), ms = [0, 1, 2, 3, 4].map((k) => fitBase(k, tr.X, tr.y)), accs = ms.map((m) => accuracyOf((x) => predOf(m, x), te.X, te.y));
  check('三日月データで 4 つのモデルは 80% 以上、切り株も 65% 以上（' + accs.map(pctStr).join(', ') + '）', accs.slice(0, 4).every((a) => a >= 0.8) && accs[4] >= 0.65);
  let sv = models; models = ms; seedRng(5); let okM = true, okA = true;
  for (let t = 0; t < 300; t++) { let x = [rnd(), rnd()], c = choirAt(x); if (c.maj !== hardVote(ms, x)) okM = false; if (!(c.agree >= 3 && c.agree <= 5)) okA = false; }
  models = sv;
  check('低音（多数決）= 5 つのハード投票の答え（300 点）。5 人なので一致の人数はいつも 3〜5', okM && okA);
  check('音量の上限：MASTER = ' + MASTER + ' ≤ 0.2、歌い手 1 人の音量 ≤ 0.2', MASTER <= 0.2 && 0.06 + 0.14 <= 0.2 + 1e-12);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. クリックで音を出し、マウスを境界の上でゆっくり動かそう。どこで音がにごる？
// 2. 1〜5 で歌い手を 1 人ずつ黙らせると、にごりは減る？ どのモデルがいちばん「ちがう意見」を歌う？
// 3. ROOTS の 54（F♯）を 55（G）にすると？ 割れても協和音になってしまう組合せがある（自己テストも ✗ に）
// 4. SINGER_IV を [0, 7, 12, 19, 24]（根音と 5 度だけ）にすると、和音の響きはどう変わる？
// 5. 自由制作：モデルの数を増やしたり、確率で音の大きさだけでなく音色を変えたりしてみよう

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
// ---- 連立 1 次方程式 A w = b（部分ピボットつきのガウスの消去法）。ridge = 対角に足す小さな数（解けないのを防ぐ）
function solveLin(A, b, ridge) {
  let n = b.length, M = A.map((r, i) => r.slice().concat([b[i]]));
  for (let i = 0; i < n; i++) M[i][i] += ridge || 0;
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-14) continue;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) if (r !== c) { let f = M[r][c] / M[c][c]; if (f !== 0) for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  return M.map((r, i) => (Math.abs(r[i]) < 1e-14 ? 0 : r[n] / r[i]));
}
// ---- k 近傍法：近い k 個のうちクラス 1 の割合 = 確率
function fitKnn(X, y, k) { return { type: 'knn', X, y, k }; }
function knnProb(m, x) {
  let bd = [], bc = [], k = Math.min(m.k, m.X.length);
  for (let i = 0; i < m.X.length; i++) {
    let d = (m.X[i][0] - x[0]) ** 2 + (m.X[i][1] - x[1]) ** 2;
    if (bd.length < k || d < bd[bd.length - 1]) {      // 小さい順の列に挿入（並べ替えはしない）
      let q = bd.length < k ? bd.length : bd.length - 1;
      while (q > 0 && bd[q - 1] > d) { bd[q] = bd[q - 1]; bc[q] = bc[q - 1]; q--; }
      bd[q] = d; bc[q] = m.y[i];
    }
  }
  return k ? sumArr(bc) / k : 0.5;
}
// ---- ロジスティック回帰（ニュートン法、L2 正則化 λ）。F = 特徴量ベクトルの列、戻り値 = 重み w
function fitLogitVec(F, y, lam, iters) {
  let d = F[0].length, w = new Array(d).fill(0);
  for (let it = 0; it < (iters || 25); it++) {
    let g = new Array(d).fill(0), H = Array.from({ length: d }, () => new Array(d).fill(0));
    for (let i = 0; i < F.length; i++) {
      let f = F[i], p = sigm(dotV(w, f)), r = p - y[i], s = Math.max(1e-6, p * (1 - p));
      for (let a = 0; a < d; a++) { g[a] += r * f[a]; for (let b = 0; b < d; b++) H[a][b] += s * f[a] * f[b]; }
    }
    for (let a = 0; a < d; a++) { g[a] += lam * w[a]; H[a][a] += lam; }
    let dw = solveLin(H, g, 0), big = 0;
    for (let a = 0; a < d; a++) { w[a] -= clampv(dw[a], -20, 20); big = Math.max(big, Math.abs(dw[a])); }
    if (big < 1e-9) break;
  }
  return w;
}
function dotV(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }
function logitFeat(x, quad) { let u = x[0] - 0.5, v = x[1] - 0.5; return quad ? [1, u, v, u * u, v * v, u * v] : [1, u, v]; }
function fitLogit(X, y, quad, lam) { return { type: 'logit', quad: !!quad, w: fitLogitVec(X.map((x) => logitFeat(x, quad)), y, lam === undefined ? 0.01 : lam) }; }
function logitProb(m, x) { return sigm(dotV(m.w, logitFeat(x, m.quad))); }
// ---- ガウスのナイーブベイズ：クラスごとに、特徴量ごとの平均と分散（特徴量どうしは独立と仮定）
function fitNB(X, y) {
  let m = { type: 'nb', prior: [0, 0], mu: [[0, 0], [0, 0]], va: [[0, 0], [0, 0]] };
  for (let c = 0; c < 2; c++) {
    let pts = X.filter((_, i) => y[i] === c); m.prior[c] = (pts.length + 1) / (X.length + 2);
    for (let f = 0; f < 2; f++) { let col = pts.map((p) => p[f]); m.mu[c][f] = col.length ? meanOf(col) : 0.5; m.va[c][f] = Math.max(1e-3, varOf(col)); }
  }
  return m;
}
function nbProb(m, x) {
  let lg = [0, 1].map((c) => Math.log(m.prior[c]) + [0, 1].reduce((s, f) => s - 0.5 * Math.log(2 * Math.PI * m.va[c][f]) - (x[f] - m.mu[c][f]) ** 2 / (2 * m.va[c][f]), 0));
  return sigm(lg[1] - lg[0]);
}
// ---- 隠れ層 1 層のニューラルネット（tanh）。cls = true なら出力はシグモイド（交差エントロピー）、false なら直線（2 乗誤差 / 2）
// 学習はフルバッチの Adam。mlpTrain(net, X, y, 回数) を 1 フレームに少しずつ呼べば画面は止まらない
function makeMLP(nIn, nH, cls, seed) {
  seedRng(seed);
  let s1 = 1.5 / Math.sqrt(nIn), net = { nIn, nH, cls, W1: [], b1: [], W2: [], b2: 0, t: 0, ad: null };
  for (let j = 0; j < nH; j++) { net.W1.push(Array.from({ length: nIn }, () => s1 * rndGauss())); net.b1.push(0.5 * rndGauss()); net.W2.push(rndGauss() / Math.sqrt(nH)); }
  return net;
}
function mlpOut(net, x) {
  let o = net.b2;
  for (let j = 0; j < net.nH; j++) { let z = net.b1[j]; for (let k = 0; k < net.nIn; k++) z += net.W1[j][k] * x[k]; o += net.W2[j] * Math.tanh(z); }
  return net.cls ? sigm(o) : o;
}
function mlpLoss(net, X, y) {
  let L = 0;
  for (let i = 0; i < X.length; i++) { let p = mlpOut(net, X[i]); L += net.cls ? -(y[i] ? Math.log(Math.max(1e-12, p)) : Math.log(Math.max(1e-12, 1 - p))) : 0.5 * (p - y[i]) ** 2; }
  return X.length ? L / X.length : 0;
}
// 誤差逆伝播：平均の損失の勾配（W1, b1, W2, b2 と同じ形）
function mlpGrad(net, X, y) {
  let g = { W1: net.W1.map((r) => r.map(() => 0)), b1: net.b1.map(() => 0), W2: net.W2.map(() => 0), b2: 0 }, h = new Array(net.nH), n = X.length || 1;
  for (let i = 0; i < X.length; i++) {
    let x = X[i], o = net.b2;
    for (let j = 0; j < net.nH; j++) { let z = net.b1[j]; for (let k = 0; k < net.nIn; k++) z += net.W1[j][k] * x[k]; h[j] = Math.tanh(z); o += net.W2[j] * h[j]; }
    let d = ((net.cls ? sigm(o) : o) - y[i]) / n;              // どちらの損失でも出力の誤差は (予測 − 正解)
    g.b2 += d;
    for (let j = 0; j < net.nH; j++) { g.W2[j] += d * h[j]; let dz = d * net.W2[j] * (1 - h[j] * h[j]); g.b1[j] += dz; for (let k = 0; k < net.nIn; k++) g.W1[j][k] += dz * x[k]; }
  }
  return g;
}
function mlpParams(o) { return [].concat(...o.W1, o.b1, o.W2, [o.b2]); }   // 全部のパラメータを 1 列に
function mlpSetParams(net, p) { let q = 0; for (let j = 0; j < net.nH; j++) for (let k = 0; k < net.nIn; k++) net.W1[j][k] = p[q++]; for (let j = 0; j < net.nH; j++) net.b1[j] = p[q++]; for (let j = 0; j < net.nH; j++) net.W2[j] = p[q++]; net.b2 = p[q++]; }
function mlpTrain(net, X, y, iters, lr, wd) {   // Adam（β1 = 0.9, β2 = 0.999）、wd = 重みの減衰
  let p = mlpParams(net);
  if (!net.ad) net.ad = { m: p.map(() => 0), v: p.map(() => 0) };
  for (let it = 0; it < iters; it++) {
    let g = mlpParams(mlpGrad(net, X, y)); net.t++;
    let b1t = 1 - Math.pow(0.9, net.t), b2t = 1 - Math.pow(0.999, net.t);
    for (let q = 0; q < p.length; q++) {
      let gq = g[q] + (wd || 0) * p[q];
      net.ad.m[q] = 0.9 * net.ad.m[q] + 0.1 * gq; net.ad.v[q] = 0.999 * net.ad.v[q] + 0.001 * gq * gq;
      p[q] = clampv(p[q] - (lr || 0.02) * (net.ad.m[q] / b1t) / (Math.sqrt(net.ad.v[q] / b2t) + 1e-8), -50, 50);
    }
    mlpSetParams(net, p);
  }
}
// ---- 切り株（深さ 1 の木）：特徴量 1 つ × しきい値 1 つ。重み w つき。左右の葉 = クラス 1 の重みの割合（確率）
function fitStump(X, y, w) {
  let n = X.length, W = 0, W1 = 0, best = null;
  for (let i = 0; i < n; i++) { let wi = w ? w[i] : 1; W += wi; if (y[i]) W1 += wi; }
  for (let f = 0; f < 2; f++) {
    let ord = X.map((_, i) => i).sort((a, b) => X[a][f] - X[b][f]), lw = 0, l1 = 0;
    for (let q = 0; q < n - 1; q++) {
      let i = ord[q], wi = w ? w[i] : 1; lw += wi; if (y[i]) l1 += wi;
      let v0 = X[i][f], v1 = X[ord[q + 1]][f]; if (!(v1 > v0)) continue;
      let err = Math.min(l1, lw - l1) + Math.min(W1 - l1, W - lw - (W1 - l1));   // 左右それぞれ多数決にしたときの重みつき誤り
      if (!best || err < best.err - 1e-12) best = { feat: f, thr: (v0 + v1) / 2, lw, l1, err };
    }
  }
  if (!best) return { type: 'stump', feat: 0, thr: 2, pl: (W1 + 1) / (W + 2), pr: 0.5, err: Math.min(W1, W - W1) };
  return { type: 'stump', feat: best.feat, thr: best.thr, pl: (best.l1 + 0.5) / (best.lw + 1), pr: (W1 - best.l1 + 0.5) / (W - best.lw + 1), err: best.err };
}
function stumpProb(m, x) { return x[m.feat] <= m.thr ? m.pl : m.pr; }
// ---- 5 種類の「ちがうモデル」をまとめて扱う：fitBase(番号, X, y) → モデル、probOf(モデル, x) → クラス 1 の確率
const BASE_NAMES = ['k 近傍法', 'ロジスティック回帰', 'ナイーブベイズ', 'ニューラルネット', '切り株'];
const BASE_COL = [[240, 120, 100], [236, 214, 160], [110, 165, 240], [190, 135, 235], [150, 210, 95]];   // ★ モデルの色
function fitBase(kind, X, y, seed) {
  if (kind === 0) return fitKnn(X, y, 15);                     // ★ k = 15
  if (kind === 1) return fitLogit(X, y, false);                // 直線の境界
  if (kind === 2) return fitNB(X, y);
  if (kind === 3) { let net = makeMLP(2, 10, true, seed || 7), Xc = X.map(centerX); mlpTrain(net, Xc, y, 300, 0.03); return { type: 'mlp', net }; }
  return fitStump(X, y);
}
function centerX(x) { return [2 * x[0] - 1, 2 * x[1] - 1]; }  // ネットには [−1, 1] に直して渡す
function probOf(m, x) {
  if (m.type === 'knn') return knnProb(m, x);
  if (m.type === 'logit') return logitProb(m, x);
  if (m.type === 'nb') return nbProb(m, x);
  if (m.type === 'mlp') return mlpOut(m.net, centerX(x));
  if (m.type === 'stump') return stumpProb(m, x);
  return 0.5;
}
function predOf(m, x) { return probOf(m, x) > 0.5 ? 1 : 0; }
function accuracyOf(fn, X, y) { let ok = 0; for (let i = 0; i < X.length; i++) if (fn(X[i]) === y[i]) ok++; return X.length ? ok / X.length : 0; }
// 投票：hard = 多数決（同数ならソフトの確率で決める）、soft = 確率の平均
function hardVote(ms, x) { let v = 0; for (let m of ms) v += predOf(m, x); return 2 * v > ms.length ? 1 : 2 * v < ms.length ? 0 : softVote(ms, x) > 0.5 ? 1 : 0; }
function softVote(ms, x) { let s = 0; for (let m of ms) s += probOf(m, x); return ms.length ? s / ms.length : 0.5; }
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
// ---- 音の道具（Web Audio）。音量の上限：全体の音量 MASTER は 0.2 以下
const MASTER = 0.1;                    // ★ 全体の音量（0.2 以下にしておく）
let audioCtx = null, masterOut = null;
function startAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    masterOut = audioCtx.createGain(); masterOut.gain.value = Math.min(0.2, MASTER); masterOut.connect(audioCtx.destination);
  }
  audioCtx.resume();
}
function makeVoice(wave) {             // 鳴りっぱなしの声 1 つ（周波数と音量をあとから変える）
  if (!audioCtx) return null;
  let o = audioCtx.createOscillator(), gn = audioCtx.createGain();
  o.type = wave || 'triangle'; o.frequency.value = 220; gn.gain.value = 0; o.connect(gn); gn.connect(masterOut); o.start();
  return { o, gn };
}
function setVoice(vc, freq, vol) {
  if (!vc || !(freq > 20 && freq < 8000)) return;
  let t = audioCtx.currentTime;
  vc.o.frequency.setTargetAtTime(freq, t, 0.03); vc.gn.gain.setTargetAtTime(clampv(vol, 0, 1), t, 0.05);
}
function midiHz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) || ArrayBuffer.isView(v) ? Array.from(v).every(noNaN) : !(typeof v === 'number' && !isFinite(v)); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(140, 215, 170) : color(255, 90, 110)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
