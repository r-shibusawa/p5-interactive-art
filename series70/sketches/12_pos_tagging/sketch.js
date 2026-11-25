// ============================================
// 12 品詞タグ付け ─ 状態 = 品詞（名詞・動詞・…）、観測 = 単語。下の小さな英語コーパス（この教材のために書いた 56 文、品詞つき）を数えて HMM を作る：
//   遷移 A = 「限定詞の次は名詞が多い」などの品詞のつながり（数 +1 して割る）、出力 B = 「名詞のとき dog が出る」などの単語の出やすさ（数 +0.1 して割る）：加算スムージング
// 文を打つと、ビタビでいちばんありそうな品詞の列を付ける。flies（ハエ / 飛ぶ）や like（好む / 〜のように）のように 2 つの品詞がありうる単語は、前後の単語で決まる。
// 知らない単語：コーパスに 1 回しか出ない単語を「知らない単語の見本」と考え、その品詞の割合を使う（名詞・動詞になりやすい）
// 文字キー・スペース 文を打つ（全部入力になる）/ Backspace 1 文字消す / Esc 全部消す / ↑↓ 例文 / Tab 右の表を切りかえ
// ============================================

const TAGS = ['D', 'N', 'V', 'A', 'P', 'R', 'B'], TAG_JP = ['限定詞', '名詞', '動詞', '形容詞', '前置詞', '代名詞', '副詞'];
const CORPUS = [                         // ★ 学習用の文（単語/品詞）。自分の文を足してみよう
  'the/D old/A dog/N sleeps/V', 'a/D small/A bird/N flies/V over/P the/D lake/N', 'the/D flies/N like/V the/D sweet/A jam/N', 'she/R runs/V like/P the/D wind/N',
  'they/R watch/V the/D old/A clock/N', 'my/D watch/N is/V new/A', 'the/D light/N is/V bright/A', 'he/R carries/V a/D light/A bag/N',
  'we/R fish/V in/P the/D river/N', 'the/D fish/N swim/V quickly/B', 'she/R walks/V to/P the/D station/N', 'the/D long/A walks/N are/V good/A',
  'the/D plants/N need/V water/N', 'he/R plants/V a/D tree/N in/P the/D garden/N', 'i/R like/V green/A tea/N', 'the/D cat/N sleeps/V on/P the/D warm/A chair/N',
  'a/D kite/N flies/V high/B', 'the/D children/N play/V in/P the/D park/N', 'birds/N sing/V in/P the/D morning/N', 'he/R sings/V like/P a/D bird/N',
  'the/D small/A flies/N sit/V on/P the/D fruit/N', 'time/N moves/V slowly/B', 'we/R like/V the/D new/A teacher/N', 'the/D teacher/N reads/V a/D long/A book/N',
  'she/R reads/V quickly/B', 'they/R walk/V slowly/B in/P the/D rain/N', 'the/D rain/N falls/V on/P the/D roof/N', 'a/D bright/A star/N shines/V over/P the/D hill/N',
  'you/R watch/V the/D birds/N', 'the/D dog/N runs/V after/P the/D cat/N', 'it/R looks/V like/P rain/N', 'the/D red/A kite/N is/V in/P the/D tree/N',
  'he/R is/V happy/A', 'the/D river/N is/V deep/A', 'i/R see/V a/D plane/N', 'the/D plane/N flies/V over/P the/D city/N',
  'she/R likes/V the/D quiet/A garden/N', 'we/R eat/V fresh/A fish/N', 'the/D cook/N makes/V a/D good/A soup/N', 'they/R cook/V with/P fresh/A plants/N',
  'the/D boy/N has/V a/D new/A watch/N', 'a/D girl/N walks/V with/P her/D dog/N', 'old/A friends/N talk/V often/B', 'the/D students/N like/V music/N',
  'he/R often/B reads/V in/P the/D park/N', 'the/D wind/N is/V strong/A', 'she/R sees/V the/D light/N of/P the/D moon/N', 'flies/N are/V small/A',
  'the/D bee/N flies/V to/P the/D flower/N', 'it/R runs/V quickly/B', 'we/R sit/V under/P the/D big/A tree/N', 'the/D moon/N is/V like/P a/D lamp/N',
  'dogs/N like/V long/A walks/N', 'the/D baby/N sleeps/V quietly/B', 'my/D friend/N plays/V the/D piano/N', 'a/D cat/N sits/V near/P the/D door/N',
];
const EXAMPLES = ['the bird flies like the wind', 'the flies like the jam', 'she walks in the park', 'the walks are long', 'they watch the fish', 'my watch is old', 'he plants a blorf near the zorp'];   // ★ 例文（↑↓）
const EMIT_ADD = 0.1;                    // ★ 単語の数に足す数。遷移は +1 だが、単語は種類が多い（120 種類）ので +1 だと強すぎる → +0.1
const MAX_WORDS = 10, TYPE_KEYS = "abcdefghijklmnopqrstuvwxyz' ";
let tagger = null, typed = EXAMPLES[0], exNo = 0, result = null, showTable = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  tagger = trainTagger(CORPUS); retag();
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
function parseLine(s) { return s.split(' ').map((w) => { let k = w.lastIndexOf('/'); return [w.slice(0, k), TAGS.indexOf(w.slice(k + 1))]; }).filter((p) => p[0] && p[1] >= 0); }
// ★ 数えて作る：文のはじめの品詞、品詞 → 品詞（「文の終わり」も行き先の 1 つ）、品詞 → 単語
function trainTagger(lines) {
  let n = TAGS.length, start = new Array(n).fill(0), trans = [], emitC = [], tagTotal = new Array(n).fill(0), wordTotal = Object.create(null), endC = new Array(n).fill(0);
  for (let i = 0; i < n; i++) { trans.push(new Array(n).fill(0)); emitC.push(Object.create(null)); }   // 素の辞書（"constructor" などの単語も正しく数える）
  for (let ln of lines) {
    let ws = parseLine(ln);
    ws.forEach(([w, t], k) => { if (k === 0) start[t]++; else trans[ws[k - 1][1]][t]++; emitC[t][w] = (emitC[t][w] || 0) + 1; tagTotal[t]++; wordTotal[w] = (wordTotal[w] || 0) + 1; if (k === ws.length - 1) endC[t]++; });
  }
  let vocab = Object.keys(wordTotal), unk = new Array(n).fill(0);
  for (let t = 0; t < n; t++) for (let w in emitC[t]) if (wordTotal[w] === 1) unk[t]++;        // 1 回しか出ない単語 = 「知らない単語」の見本
  return { p0: start.map((c) => (c + 1) / (lines.length + n)), tr: trans.map((r, i) => { let s = sumOf(r) + endC[i]; return r.map((c) => (c + 1) / (s + n + 1)); }),
    pEnd: endC.map((c, i) => (c + 1) / (sumOf(trans[i]) + c + n + 1)), emitC, tagTotal, unk, vocab, wordTotal, sentences: lines.length };
}
// ★ 品詞 t が単語 w を出す確率（加算スムージング）。知らない単語は unk[t] を数として使う。単語全部 + 「知らない単語」で合計 1
function emitProb(tg, t, w) {
  let denom = tg.tagTotal[t] + tg.unk[t] + EMIT_ADD * (tg.vocab.length + 1);
  return ((tg.wordTotal[w] ? tg.emitC[t][w] || 0 : tg.unk[t]) + EMIT_ADD) / denom;
}
function tokenize(s) { return String(s).toLowerCase().split(/[^a-z']+/).filter((w) => w.length > 0).slice(0, MAX_WORDS); }
// ★ タグ付け：出力の表を作ってビタビ（最後の単語には「そこで文が終わる確率」も掛ける）。γ（単語ごとの品詞の確率）も計算する
function tagSentence(tg, words) {
  if (!words.length) return { words, tags: [], gam: [], logP: 0, known: [] };
  let eb = words.map((w, k) => TAGS.map((_, t) => emitProb(tg, t, w) * (k === words.length - 1 ? tg.pEnd[t] : 1))), v = viterbiLog(tg, eb), sm = smoothAll(tg, eb);
  return { words, tags: v.vitPath, gam: sm.gam, logP: v.logP, known: words.map((w) => !!tg.wordTotal[w]), eb };
}
function tagsSeenFor(tg, w) { return TAGS.map((_, t) => t).filter((t) => tg.emitC[t][w]); }
function retag() { result = tagSentence(tagger, tokenize(typed)); }

function draw() {
  background(...BG);
  hudTitle('品詞タグ付け：自作の小さな英語コーパス（' + tagger.sentences + ' 文、' + tagger.vocab.length + ' 種類の単語）から数えた HMM', '文字キー・スペース 文を打つ　Backspace 1 文字消す　Esc 全部消す　↑↓ 例文　Tab 右の表を切りかえ　（文字キーは全部入力になる）');
  noStroke(); fill(...LAN); textSize(15); textAlign(LEFT, BASELINE); text('文：', 40, 122);
  fill(...INK); textSize(24); text(typed + (frameCount % 60 < 30 ? '▏' : ''), 84, 124);
  let ws = result.words, n = ws.length, x0 = 50, cw = Math.min(118, (Math.min(width - 420, 1180) - x0) / Math.max(1, n)), y0 = 180;
  if (!n) note('英語の文を打ってみよう（例：the bird flies like the wind）', x0, y0 + 30, DIMC, 15);
  for (let k = 0; k < n; k++) {
    let x = x0 + k * cw, t = result.tags[k], seen = tagsSeenFor(tagger, ws[k]);
    noStroke(); fill(...INK); textSize(Math.min(20, cw / 5.2)); textAlign(CENTER, BASELINE); text(ws[k], x + cw / 2, y0);
    fill(...ST_COLS[t]); rect(x + 6, y0 + 12, cw - 12, 30, 6); fill(...BG); textSize(15); textAlign(CENTER, CENTER); text(TAG_JP[t], x + cw / 2, y0 + 27);
    note(!result.known[k] ? '？知らない単語' : seen.length > 1 ? seen.map((s) => TAG_JP[s]).join(' / ') : '', x + 6, y0 + 62, !result.known[k] ? ROSE : LAN, 11);
    for (let j = 0; j < TAGS.length; j++) {                    // γ の小さな棒
      let yy = y0 + 76 + j * 20, p = result.gam[k][j]; noStroke(); fill(...LINEC); rect(x + 6, yy, cw - 12, 14, 3); fill(...ST_COLS[j], j === t ? 255 : 150); rect(x + 6, yy, (cw - 12) * p, 14, 3);
      if (p > 0.005) { fill(...INK); textSize(10); textAlign(RIGHT, CENTER); text(fmtN(p, 2), x + cw - 9, yy + 7); }
    }
    if (k > 0) { stroke(...DIMC); fill(...DIMC); strokeWeight(1.5); arrowLine(x - 4, y0 + 27, x + 5, y0 + 27, 6); }
  }
  for (let j = 0; j < TAGS.length; j++) note(TAG_JP[j], 6, y0 + 88 + j * 20, ST_COLS[j], 10);
  let ty = y0 + 76 + 7 * 20 + 30;
  note('色の箱 = ビタビで決めた品詞　下の棒 = その単語がそれぞれの品詞である確率 γ（前後の単語も使った値）', x0, ty, DIMC, 12);
  if (n) note('いちばん良い品詞の列の log 確率 = ' + fmtN(result.logP, 2) + '　黄色の小さな字 = コーパスで 2 つ以上の品詞で出てきた単語', x0, ty + 22, DIMC, 12);
  note('例文（↑↓）：' + (exNo >= 0 ? exNo + 1 + ' / ' + EXAMPLES.length : '自分で打った文'), x0, ty + 50, INK, 13);
  for (let k = 0; k < EXAMPLES.length; k++) note((k === exNo ? '▶ ' : '　 ') + EXAMPLES[k], x0, ty + 74 + k * 20, k === exNo ? LAN : DIMC, 13);
  // ---- 右：遷移行列 か 単語の出やすさ
  let rx = Math.max(width - 390, 700), cs = 40;
  if (showTable === 0) {
    note('遷移行列 A（行 = 前の品詞、列 = 次の品詞）', rx, 150, INK, 13);
    drawMatrix(tagger.tr, rx + 60, 184, cs, 30, TAG_JP, TAGS, { col: ROSE, ts: 10, hi: 0.8 });
    note('文のはじめの品詞', rx, 184 + 7 * 30 + 30, INK, 13);
    drawMatrix([tagger.p0], rx + 60, 184 + 7 * 30 + 56, cs, 28, null, TAGS, { col: AQUA, ts: 10, hi: 0.8 });
    note('文の終わり', rx, 184 + 7 * 30 + 116, INK, 13);
    drawMatrix([tagger.pEnd], rx + 60, 184 + 7 * 30 + 142, cs, 28, null, TAGS, { col: LAN, ts: 10, hi: 0.8 });
    note('D 限定詞の次は N 名詞か A 形容詞、R 代名詞の次は V 動詞 が多い', rx, 184 + 7 * 30 + 196, DIMC, 11);
  } else {
    note('打った文の単語の出やすさ b_品詞(単語)（行 = 品詞、列 = 単語）', rx - 40, 150, INK, 13);
    if (n) drawMatrix(TAGS.map((_, t) => ws.map((w) => emitProb(tagger, t, w))), rx + 20, 184, Math.min(cs, 330 / n), 30, TAG_JP, ws.map((w) => w.slice(0, 4)), { col: LAN, ts: 9, hi: 0.08, digits: 3 });
    note('知らない単語は、どの品詞でも小さい数（名詞・動詞・形容詞がやや大きい）', rx - 40, 184 + 7 * 30 + 30, DIMC, 11);
  }
  drawSelfTest();
}

function keyPressed() {
  let k = String(key);
  if (k.length === 1 && TYPE_KEYS.includes(k.toLowerCase())) { if (typed.length < 60) typed += k.toLowerCase(); exNo = -1; retag(); return false; }
  if (key === BACKSPACE) { typed = typed.slice(0, -1); exNo = -1; retag(); }
  if (key === ESCAPE) { typed = ''; exNo = -1; retag(); }
  if (key === DOWN_ARROW) { exNo = (exNo + 1) % EXAMPLES.length; typed = EXAMPLES[exNo]; retag(); }
  if (key === UP_ARROW) { exNo = (exNo + EXAMPLES.length - 1) % EXAMPLES.length; typed = EXAMPLES[exNo]; retag(); }
  if (key === TAB) showTable = 1 - showTable;
  return false;
}

// やってみよう
// 1. 「the bird flies like the wind」と「the flies like the jam」で、flies と like の品詞はどう変わる？ γ の棒はどのくらい迷っている？
// 2. コーパスにない単語（blorf、zorp など）をまぜた文を打とう。どの品詞になる？ 前に the があるときと he があるときでちがう？
// 3. 「fish fish fish」と打つとどうなる？ なぜそう読んだ？
// 4. CORPUS に自分の文を 5 つ足して（単語/品詞 の形で）、タグ付けが変わるか試そう。「-ly で終わる知らない単語は副詞」というルールを足すには？

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let tg = trainTagger(CORPUS), n = TAGS.length;
  check('コーパス ' + tg.sentences + ' 文：どの単語にも品詞があり、数えた単語の合計 = ' + sumOf(tg.tagTotal), CORPUS.every((ln) => parseLine(ln).length === ln.split(' ').length) && sumOf(tg.tagTotal) === CORPUS.join(' ').split(' ').length);
  check('文のはじめの確率の合計 = 1、遷移行列の行 + 「文の終わり」の合計 = 1（+1 スムージングで 0 はない）', near(sumOf(tg.p0), 1, 1e-12) && tg.tr.every((r, i) => near(sumOf(r) + tg.pEnd[i], 1, 1e-12) && r.every((v) => v > 0)));
  let okE = true; for (let t = 0; t < n; t++) { let s = emitProb(tg, t, 'zzz-unknown'); for (let w of tg.vocab) s += emitProb(tg, t, w); if (!near(s, 1, 1e-12)) okE = false; }
  check('単語の出やすさ：全部の単語 + 「知らない単語」で合計 = 1（7 つの品詞とも）', okE);
  check('flies・like・watch・walks・plants・fish・light は 2 つ以上の品詞で出てくる', ['flies', 'like', 'watch', 'walks', 'plants', 'fish', 'light'].every((w) => tagsSeenFor(tg, w).length >= 2));
  let tagStr = (s) => tagSentence(tg, tokenize(s)).tags.map((t) => TAGS[t]).join(' ');
  let want = [['the bird flies like the wind', 'D N V P D N'], ['the flies like the jam', 'D N V D N'], ['she walks in the park', 'R V P D N'], ['the walks are long', 'D N V A'], ['they watch the fish', 'R V D N'], ['my watch is old', 'D N V A'], ['we fish in the lake', 'R V P D N'], ['he plants a tree', 'R V D N']];
  let bad = want.filter(([s, t]) => tagStr(s) !== t);
  check('2 つの品詞がありうる単語をふくむ 8 文：期待どおりの品詞（flies は 名詞 / 動詞、like は 動詞 / 前置詞 に分かれる）' + (bad.length ? ' ✗ ' + bad[0][0] + ' → ' + tagStr(bad[0][0]) : ''), bad.length === 0);
  check('知らない単語：the zorp sleeps → D N V、he plants a blorf near the zorp → R V D N P D N', tagStr('the zorp sleeps') === 'D N V' && tagStr('he plants a blorf near the zorp') === 'R V D N P D N');
  let right = 0, total = 0; for (let ln of CORPUS) { let ws = parseLine(ln), r = tagSentence(tg, ws.map((p) => p[0])); ws.forEach((p, k) => { total++; if (r.tags[k] === p[1]) right++; }); }
  check('学習に使った文をタグ付けし直すと ' + right + ' / ' + total + ' 語が正解（95% 以上）', right / total >= 0.95);
  let r4 = tagSentence(tg, ['the', 'flies', 'like', 'jam']), bf = bruteAll(tg, r4.eb);
  check('ビタビ = 総当たり（7⁴ = 2401 通りの品詞の列）、γ = 総当たり', near(Math.exp(r4.logP), bf.bestP, 1e-12 * bf.bestP) && r4.tags.join() === bf.best.join() && maxAbsDiff(r4.gam, bf.gam) < 1e-12);
  let junk = [tagSentence(tg, tokenize('')), tagSentence(tg, tokenize("'' 123 !!")), tagSentence(tg, tokenize('qq zz xx yy ww vv uu tt ss rr pp oo nn'))];
  check('空の文・記号だけ・知らない単語だけの長い文でも止まらない（単語は ' + MAX_WORDS + ' 個まで）、NaN なし', junk[0].tags.length === 0 && junk[1].tags.length <= 1 && junk[2].tags.length === MAX_WORDS && noNaN(junk[2].gam) && isFinite(junk[2].logP));
  check('知らない単語になりやすい品詞は名詞（1 回だけ出た単語がいちばん多い）、限定詞・前置詞は少ない', argMax(tg.unk) === 1 && tg.unk[0] < tg.unk[1] && tg.unk[4] < tg.unk[1]);
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
