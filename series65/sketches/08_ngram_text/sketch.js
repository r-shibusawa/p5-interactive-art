// ============================================
// 08 文字の n-gram で文章生成 ─ 「直前の k 文字」を状態にしたマルコフ連鎖
// お手本の文章（このスケッチのために書いたオリジナルの短い文）で、k 文字の並びのあとに来た文字を数える
//   → P(次の文字 | 直前 k 文字) = 数 / 合計。サイコロを振って 1 文字ずつ足していくと、新しい文章ができる。
// k を上げると本物らしくなるが、お手本の文のコピー（水色）が増える。エントロピー率 = 1 文字あたりの「迷い」（ビット）
// スペース 新しく生成 / ↑↓ 次数 k（0〜4）/ T 日本語 ⇔ 英語
// ============================================

// ★ お手本の文章（自由に書きかえてよい。長いほど、高い次数でも新しい文が出やすい）
const JA_TEXT = '朝の駅前には小さなパン屋があって、店の前を通るたびに焼きたての匂いがする。雨の日は傘の色がならび、晴れの日は自転車が川ぞいの道を走っていく。わたしは毎朝その道を歩いて、橋の上で少しだけ立ち止まる。川の水は昨日と同じように見えるけれど、本当は昨日とは別の水だ。空の雲も、道の影も、いつも少しずつちがう。だから同じ道を歩いても、同じ朝は二度とこない。パン屋の主人は、今日の空を見てから焼くパンを決めるそうだ。くもりの日には丸いパン、雨の日には甘いパン、晴れの日には長いパン。次に何を焼くかは、今日の空だけで決まる。昨日の空は、もう関係ない。夕方になると、川の上の空は少しずつ赤くなり、橋の上の人の影が長くのびる。わたしは帰り道にパン屋に寄って、残っているパンを一つ買う。店の主人は、明日の空はどうだろうねと言いながら、窓の外の雲を見ている。明日の朝も、わたしは同じ道を歩くだろう。けれど、明日の道は今日の道とは少しちがう。雨の日のあとには晴れの日が来ることが多く、晴れの日のあとにはまた晴れの日が来ることも多い。くもりの日は、雨にも晴れにもなる。どの日も、次の日のことは今日の空だけが知っている。';
const EN_TEXT = 'the river town wakes up slowly. a bus turns at the corner, a dog waits by the bakery door, and the baker looks at the sky before choosing the bread. on cloudy days she bakes round loaves, on rainy days sweet buns, and on sunny days long thin sticks that crack when you break them. nobody remembers what the sky looked like last week, and it does not matter. tomorrow depends only on today. children walk to school along the river, counting the bridges, and every morning the water looks the same, though it is never the same water. the clouds drift, the shadows move, and the town keeps changing one small piece at a time. ';
const GEN_LEN = 300;                     // ★ 生成する文字数
const COPY_LEN = 8;                      // ★ この長さの並びがお手本にそのまま出てきたら「コピー」とみなす
let lang = 0, ngK = 2, models = [], corpusChars = [], copySet = null, genFull = '', shown = 0, coverMask = [], copyRate = 0, entRates = [], copyByK = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  seedRng(8); loadCorpus();
}
function corpusText() { return lang === 0 ? JA_TEXT : EN_TEXT; }
function loadCorpus() {
  corpusChars = Array.from(corpusText());
  models = []; for (let k = 0; k <= 4; k++) models.push(buildNgram(corpusChars, k));
  entRates = models.map((m) => ngramEntropy(m));
  copySet = gramSet(corpusChars, COPY_LEN);
  copyByK = models.map((m) => copyCoverage(Array.from(generateText(m, corpusChars, 1000)), copySet, COPY_LEN).rate);   // 次数ごとに 1000 文字ずつ試す
  makeText();
}
function makeText() { genFull = generateText(models[ngK], corpusChars, GEN_LEN); shown = 0; let c = copyCoverage(Array.from(genFull), copySet, COPY_LEN); coverMask = c.mask; copyRate = c.rate; }

// ★ 学習：文章を輪っか（最後の次は最初）として、直前 k 文字 → 次の文字 を数える。どの文脈にも必ず「次」がある
function buildNgram(chars, k) {
  let n = chars.length, counts = new Map();
  for (let i = 0; i < n; i++) {
    let ctx = ''; for (let j = 0; j < k; j++) ctx += chars[(i + j) % n];
    let nx = chars[(i + k) % n], row = counts.get(ctx);
    if (!row) { row = new Map(); counts.set(ctx, row); }
    row.set(nx, (row.get(nx) || 0) + 1);
  }
  return { k, counts, n };
}
function condProbs(m, ctx) {             // P(次 | 文脈) を大きい順に [[文字, 確率], …]
  let row = m.counts.get(ctx); if (!row) return [];
  let tot = 0; for (let v of row.values()) tot += v;
  return Array.from(row.entries()).map(([c, v]) => [c, v / tot]).sort((a, b) => b[1] - a[1]);
}
// エントロピー率 H = −Σ_文脈 p(文脈) Σ_次 p(次|文脈) log₂ p(次|文脈)（輪っかなので p(文脈) は定常分布そのもの）
function ngramEntropy(m) {
  let h = 0;
  for (let row of m.counts.values()) {
    let tot = 0; for (let v of row.values()) tot += v;
    for (let v of row.values()) h -= (tot / m.n) * (v / tot) * Math.log2(v / tot);
  }
  return h;
}
function generateText(m, chars, len) {   // お手本のランダムな場所の k 文字から始めて、1 文字ずつサイコロ
  let st = rndInt(0, chars.length - 1), out = [];
  for (let j = 0; j < m.k; j++) out.push(chars[(st + j) % chars.length]);
  while (out.length < len + m.k) {
    let ctx = out.slice(out.length - m.k).join(''), pr = condProbs(m, ctx);
    out.push(pr.length ? pr[sampleFrom(pr.map((e) => e[1]))][0] : chars[0]);
  }
  return out.slice(m.k).join('');
}
function gramSet(chars, len) { let s = new Set(), n = chars.length; for (let i = 0; i < n; i++) { let g = ''; for (let j = 0; j < len; j++) g += chars[(i + j) % n]; s.add(g); } return s; }
function copyCoverage(gen, set, len) {   // お手本にある len 文字の並びに含まれる文字に印をつける
  let mask = new Array(gen.length).fill(false);
  for (let i = 0; i + len <= gen.length; i++) if (set.has(gen.slice(i, i + len).join(''))) for (let j = 0; j < len; j++) mask[i + j] = true;
  return { mask, rate: gen.length ? mask.filter((v) => v).length / gen.length : 0 };
}

function draw() {
  background(...BG);
  shown = Math.min(genFull.length, shown + 3);
  hudTitle('文字の n-gram：次数 k = ' + ngK + '（直前 ' + ngK + ' 文字で次を決める）　' + (lang === 0 ? '日本語' : '英語'), 'スペース 新しく生成　↑↓ 次数 k　T 日本語 ⇔ 英語　水色 = お手本の ' + COPY_LEN + ' 文字以上のコピー');

  // ---- 生成した文章（1 文字ずつ折り返す）
  let bx = 40, by = 100, bw = width * 0.56, ts = lang === 0 ? 20 : 19, lh = ts * 1.55, chars = Array.from(genFull);
  noStroke(); fill(46, 41, 38); rect(bx - 12, by - 12, bw + 24, Math.min(height - by - 100, 11 * lh + 24), 10);
  textSize(ts); textAlign(LEFT, TOP);
  let x = bx, y = by;
  for (let i = 0; i < shown; i++) {
    let w = textWidth(chars[i]);
    if (x + w > bx + bw) { x = bx; y += lh; }
    if (y > by + 10 * lh) break;
    fill(...(coverMask[i] ? TEAL : CREAM)); text(chars[i], x, y); x += w;
  }
  let ty = Math.min(height - 70, by + 11 * lh + 44);
  fill(...CREAM); textSize(15); textAlign(LEFT, BASELINE);
  text('コピーの割合（' + COPY_LEN + ' 文字以上の並びがお手本にそのまま出てくる文字）= ' + Math.round(copyRate * 100) + '%', bx, ty);
  fill(...SUB); textSize(13); text('次数ごとのコピーの割合（1000 文字ずつ生成）', bx, ty + 26);
  for (let k = 0; k <= 4; k++) { let x2 = bx + k * (bw / 5); noStroke(); fill(...(k === ngK ? DICE : [110, 100, 90])); rect(x2, ty + 36, (bw / 5 - 16) * copyByK[k], 14, 3); fill(...CREAM); textSize(12); text('k = ' + k + '：' + Math.round(copyByK[k] * 100) + '%', x2, ty + 66); }

  // ---- 次数ごとのエントロピー率
  let px = width * 0.64, py = 110, pw = width - px - 40;
  fill(...CREAM); textSize(15); text('エントロピー率 H（ビット / 文字）', px, py);
  let hmax = Math.max(1, entRates[0]);
  for (let k = 0; k <= 4; k++) {
    let yy = py + 14 + k * 30;
    noStroke(); fill(...(k === ngK ? DICE : [110, 100, 90])); rect(px + 50, yy, (entRates[k] / hmax) * (pw - 140), 20, 3);
    fill(...CREAM); textSize(13); textAlign(LEFT, CENTER); text('k = ' + k, px, yy + 10);
    text(fmtN(entRates[k], 2) + '　文脈 ' + models[k].counts.size, px + 58 + (entRates[k] / hmax) * (pw - 140), yy + 10);
  }
  textAlign(LEFT, BASELINE); fill(...SUB); textSize(13);
  text('文字の種類 ' + models[1].counts.size + '　→ でたらめなら log₂ ' + models[1].counts.size + ' = ' + fmtN(Math.log2(models[1].counts.size), 2) + ' ビット', px, py + 175);
  text('k を上げると迷いが減る（H が小さい）＝ お手本どおりになる', px, py + 195);

  // ---- 遷移表の一部：いまの文章の最後の k 文字のあとに来る文字
  let ctxChars = chars.slice(Math.max(0, shown - ngK), shown), ctx = ctxChars.join('');
  if (shown < ngK) ctx = '';
  let pr = condProbs(models[ngK], ngK === 0 ? '' : ctx).slice(0, 8), qy = py + 235;
  fill(...CREAM); textSize(15); text('遷移表の 1 行：「' + (ngK === 0 ? '（文脈なし）' : ctx.replace(/ /g, '␣')) + '」の次は？', px, qy);
  pr.forEach(([c, p], i) => {
    let yy = qy + 14 + i * 26;
    noStroke(); fill(...TEAL); rect(px + 40, yy, p * (pw - 120), 18, 3);
    fill(...CREAM); textSize(15); textAlign(CENTER, CENTER); text(c === ' ' ? '␣' : c, px + 16, yy + 9);
    textSize(13); textAlign(LEFT, CENTER); text(fmtN(p, 2), px + 48 + p * (pw - 120), yy + 9);
  });
  drawSelfTest(width - 180, height - 14);
}

function keyPressed() {
  if (key === ' ') makeText();
  if (key === UP_ARROW) { ngK = Math.min(4, ngK + 1); makeText(); }
  if (key === DOWN_ARROW) { ngK = Math.max(0, ngK - 1); makeText(); }
  if (key === 't' || key === 'T') { lang = 1 - lang; loadCorpus(); }
  return false;
}

// やってみよう
// 1. k = 0（文字の出る割合だけ）と k = 4 を比べよう。どこから「文章らしく」なる？
// 2. JA_TEXT を自分の書いた文章（日記や作文）に書きかえて、自分の文体のまねをさせよう
// 3. お手本を 2 倍の長さにすると、同じ k でもコピーの割合は下がる？
// 4. 文字ではなく「単語」を状態にすると？（英語なら split(' ') で単語の列にできる）

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(81);
  for (let [nm, tx] of [['日本語', JA_TEXT], ['英語', EN_TEXT]]) {
    let ch = Array.from(tx), ms = [0, 1, 2, 3, 4].map((k) => buildNgram(ch, k));
    let okSum = ms.every((m) => Array.from(m.counts.keys()).every((c) => near(sumOf(condProbs(m, c).map((e) => e[1])), 1, 1e-12)));
    check(nm + '：どの文脈でも次の文字の確率の合計 = 1（k = 0〜4）', okSum);
    // 輪っかにしたので、k 文字の文脈は全部「次」を持つ
    let okNext = ms.every((m) => { let s = gramSet(ch, m.k + 1), ok = true; for (let g of s) if (!m.counts.has(Array.from(g).slice(0, m.k).join(''))) ok = false; return ok; });
    check(nm + '：どの文脈にも次の文字がある（輪っか）', okNext);
    let hs = ms.map(ngramEntropy);
    check(nm + '：エントロピー率は k とともに減る（' + hs.map((h) => fmtN(h, 2)).join(' ≥ ') + '）', hs.every((h, i) => i === 0 || h <= hs[i - 1] + 1e-12));
    // k = 1：文字の出る割合は、学んだ遷移行列の定常分布（πP = π）
    let al = Array.from(ms[1].counts.keys()), ix = new Map(al.map((c, i) => [c, i])), tp = zerosMat(al.length), freq = new Array(al.length).fill(0);
    for (let c of al) for (let [d, p] of condProbs(ms[1], c)) tp[ix.get(c)][ix.get(d)] = p;
    for (let c of ch) freq[ix.get(c)] += 1 / ch.length;
    check(nm + '：k = 1 の文字の割合 π は π P = π を満たす', maxAbsDiff(vecMat(freq, tp), freq) < 1e-12);
    check(nm + '：k = 1 の H = 定常分布での −Σ π P log₂ P', near(entropyRate(tp, freq), hs[1], 1e-10));
  }
  let ch = Array.from(JA_TEXT), m2 = buildNgram(ch, 2), g = Array.from(generateText(m2, ch, 2000)), s3 = gramSet(ch, 3);
  let allSeen = true; for (let i = 0; i + 3 <= g.length; i++) if (!s3.has(g.slice(i, i + 3).join(''))) allSeen = false;
  check('k = 2 で生成した文の 3 文字の並びは、どれもお手本にある', allSeen);
  let cs8 = gramSet(ch, COPY_LEN), r1 = copyCoverage(Array.from(generateText(buildNgram(ch, 1), ch, 3000)), cs8, COPY_LEN).rate, r4 = copyCoverage(Array.from(generateText(buildNgram(ch, 4), ch, 3000)), cs8, COPY_LEN).rate;
  check('k を上げるとコピーが増える（k = 1：' + Math.round(r1 * 100) + '% → k = 4：' + Math.round(r4 * 100) + '%）', r4 > r1 + 0.3);
  // サンプリングの確かめ：「の」の次の文字の出る割合 ≈ 遷移確率
  let m1 = buildNgram(ch, 1), pr = condProbs(m1, 'の'), cnt = new Map(), nS = 20000;
  for (let t = 0; t < nS; t++) { let c = pr[sampleFrom(pr.map((e) => e[1]))][0]; cnt.set(c, (cnt.get(c) || 0) + 1); }
  check('「の」の次を 2 万回引いた割合 ≈ 遷移確率（ずれ < 0.015）', pr.every(([c, p]) => Math.abs((cnt.get(c) || 0) / nS - p) < 0.015));
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
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) || ArrayBuffer.isView(v) ? Array.from(v).every(noNaN) : !(typeof v === 'number' && !isFinite(v)); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(120, 220, 190) : color(255, 90, 90)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
