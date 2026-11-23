// ============================================
// 00 20 の質問 ─ 心の中で動物を 1 つ決めて、コンピュータの「はい/いいえ」の質問に答えよう
// コンピュータは、残っている候補を「なるべく半分ずつ」に分ける質問を選ぶ → 質問を重ねた「決定木」ができる
//   N 個を見分けるには、どう質問しても最低 log₂N 回（20 種類なら 4.32 回、いちばん長い道は 5 回以上）
//   悪い質問（1 匹だけ当てにいく）だと平均の回数がふえる。B で「よい質問 ⇔ 悪い質問」の木を比べよう
//   （シリーズ 10 の 09 も「決定木」：並べかえの比較の木で n log n 回の下限。こちらはデータから「学習する」決定木）
// → / Y はい / ← / N いいえ / スペース コンピュータが 1 匹選んで自動で答える / B よい ⇔ 悪い質問 / R 最初から
// ============================================

const QUESTIONS = ['哺乳類？', '空を飛ぶ？', '水の中で暮らす？', '足が 4 本？', '人より大きい？', '肉や虫を食べる？', 'しま・ぶち模様？', 'ペットで飼う？', '卵を産む？', '夜に動く？', '首か鼻が長い？'];
const ANIMALS = [                      // ★ 自分で動物と答えを足してみよう（1 = はい、0 = いいえ。同じ行が 2 つあると見分けられない）
  ['イヌ', [1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0]], ['ネコ', [1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0]],
  ['ウマ', [1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0]], ['シマウマ', [1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0]],
  ['ゾウ', [1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1]], ['キリン', [1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1]],
  ['トラ', [1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 0]], ['ライオン', [1, 0, 0, 1, 1, 1, 0, 0, 0, 1, 0]],
  ['コウモリ', [1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0]], ['クジラ', [1, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0]],
  ['イルカ', [1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1]], ['ハムスター', [1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0]],
  ['ペンギン', [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0]], ['ワシ', [0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0]],
  ['フクロウ', [0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0]], ['インコ', [0, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0]],
  ['金魚', [0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0]], ['カエル', [0, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0]],
  ['ヘビ', [0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 0]], ['カメ', [0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 0]],
];
let goodMode = true, qRoot, cur, path = [], secret = -1, autoT = 0, qid = 0;

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); selfTest(); rebuild(); }
function rebuild() { qid = 0; qRoot = buildQ(ANIMALS.map((_, i) => i), 0, goodMode); restart(); }
function restart() { cur = qRoot; path = [qRoot.id]; secret = -1; }
// ★ 質問の木を作る：候補 cands を、yes と no に分ける質問を選ぶ
// よい質問 = 小さいほうの側がいちばん大きい（= 半分に近い = 情報利得が最大）、悪い質問 = 小さいほうがいちばん小さい（でも 0 ではない）
function buildQ(cands, depth, good) {
  let node = { id: qid++, depth, cands, leaf: cands.length <= 1 };
  if (node.leaf) return node;
  let best = -1, bestScore = good ? -1 : Infinity;
  for (let q = 0; q < QUESTIONS.length; q++) {
    let yes = cands.filter((i) => ANIMALS[i][1][q] === 1).length, m = Math.min(yes, cands.length - yes);
    if (m === 0) continue;                                       // 全員同じ答え → 何もわからない質問
    if (good ? m > bestScore : m < bestScore) { best = q; bestScore = m; }
  }
  if (best < 0) { node.leaf = true; return node; }             // 見分けられない（同じ行がある）
  node.q = best;
  node.left = buildQ(cands.filter((i) => ANIMALS[i][1][best] === 1), depth + 1, good);   // 左 = はい
  node.right = buildQ(cands.filter((i) => ANIMALS[i][1][best] === 0), depth + 1, good);  // 右 = いいえ
  return node;
}
function leavesOf(t) { return t.leaf ? [t] : leavesOf(t.left).concat(leavesOf(t.right)); }
function avgDepth(t) { let L = leavesOf(t); return sumArr(L.map((l) => l.depth)) / L.length; }
function answer(yes) { if (cur.leaf) return; cur = yes ? cur.left : cur.right; path.push(cur.id); }

function draw() {
  background(...BG_COL);
  if (secret >= 0 && !cur.leaf && millis() - autoT > 800) { autoT = millis(); answer(ANIMALS[secret][1][cur.q] === 1); }
  // ---- 木（左から右へ。行 = 葉の順番、列 = 深さ）
  let L = leavesOf(qRoot), maxD = Math.max(...L.map((l) => l.depth)), tb = { x: 40, y: 110, w: width * 0.56, h: height - 170 };
  let rowH = tb.h / L.length, colW = (tb.w - 110) / Math.max(1, maxD), pos = {};
  let place = (t) => { if (t.leaf) { pos[t.id] = L.indexOf(t); return pos[t.id]; } pos[t.id] = (place(t.left) + place(t.right)) / 2; return pos[t.id]; };
  place(qRoot);
  let P = (t) => [tb.x + t.depth * colW, tb.y + (pos[t.id] + 0.5) * rowH], onPath = new Set(path);
  let walk = (t) => {
    if (t.leaf) return;
    for (let c of [t.left, t.right]) {
      let a = P(t), b = P(c), hot = onPath.has(c.id);
      stroke(hot ? color(255, 230, 120) : c === t.left ? color(120, 190, 120, 150) : color(200, 120, 100, 150)); strokeWeight(hot ? 3.5 : 1.5);
      line(a[0], a[1], a[0] + colW * 0.5, b[1]); line(a[0] + colW * 0.5, b[1], b[0], b[1]);
      walk(c);
    }
  };
  walk(qRoot);
  textAlign(LEFT, CENTER); textSize(12);
  for (let t of Object.values(collect(qRoot))) {
    let [x, yy] = P(t), hot = onPath.has(t.id);
    noStroke();
    if (t.leaf) { fill(hot ? color(255, 230, 120) : 220); textSize(Math.min(14, rowH * 0.8)); text(t.cands.map((i) => ANIMALS[i][0]).join('・'), x + 6, yy); }
    else { fill(hot ? color(255, 230, 120) : color(60, 90, 75)); circle(x, yy, 9); if (colW > 60 && t.depth < 4) { fill(hot ? 255 : 170); textSize(11); text(QUESTIONS[t.q], x + 6, yy - 9); } }
  }
  // ---- いまの質問
  let px = tb.x + tb.w + 30, pw = width - px - 30;
  textAlign(LEFT, BASELINE); noStroke(); fill(240); textSize(20);
  text('20 の質問　' + (goodMode ? 'よい質問（半分に分ける）' : '悪い質問（1 匹ずつ当てにいく）') + 'の木', 40, 40);
  fill(170); textSize(15); text('→ / Y はい　← / N いいえ　スペース コンピュータが選んで自動で答える　B よい ⇔ 悪い質問　R 最初から', 40, 66);
  fill(35, 52, 44); rect(px, 110, pw, 120, 12);
  fill(255, 235, 150); textSize(26);
  if (cur.leaf) text(cur.cands.length === 1 ? 'わかった！「' + ANIMALS[cur.cands[0]][0] + '」でしょう？' : '見分けられない…', px + 20, 160, pw - 40);
  else text('Q' + (path.length) + '. ' + QUESTIONS[cur.q], px + 20, 160);
  fill(190); textSize(15);
  text(cur.leaf ? (path.length - 1) + ' 回の質問で当てた（R でもう一度）' : 'はい → / いいえ ←' + (secret >= 0 ? '（コンピュータが「' + ANIMALS[secret][0] + '」で答えている）' : ''), px + 20, 205);
  // 残りの候補
  let k = cur.cands.length, h = Math.log2(Math.max(1, k));
  fill(220); textSize(16); text('残りの候補 ' + k + ' 匹　→ あと最低 log₂' + k + ' = ' + fmtNum(h, 2) + ' 回', px, 270);
  textSize(15);
  ANIMALS.forEach((a, i) => { let inC = cur.cands.includes(i); fill(inC ? color(175, 225, 95) : color(90, 105, 95)); text(a[0], px + (i % 4) * (pw / 4), 300 + Math.floor(i / 4) * 24); });
  let ya = 300 + 5 * 24 + 20, gd = avgDepth(qRoot);
  if (!cur.leaf) {
    let yes = cur.cands.filter((i) => ANIMALS[i][1][cur.q] === 1).length;
    fill(200); text('この質問：はい ' + yes + ' 匹 / いいえ ' + (k - yes) + ' 匹 → 情報利得 ' + fmtNum(entropyP(yes / k), 3) + ' ビット（半分ずつなら 1）', px, ya, pw);
  }
  fill(220); textSize(16);
  text('この木の平均の質問数 ' + fmtNum(gd, 2) + ' 回、いちばん長い道 ' + maxD + ' 回', px, ya + 60);
  text('下限：log₂20 = ' + fmtNum(Math.log2(ANIMALS.length), 2) + ' 回（平均）、⌈log₂20⌉ = ' + Math.ceil(Math.log2(ANIMALS.length)) + ' 回（最長）', px, ya + 86);
  fill(160); textSize(14);
  text('1 回の「はい/いいえ」でわかるのは最大 1 ビット。20 通りを区別するには log₂20 ビット要る。よい質問はいつも 1 ビットに近い答えを引き出す', px, ya + 120, pw);
  drawSelfTest(width - 170, height - 12);
}
function collect(t, out) { out = out || {}; out[t.id] = t; if (!t.leaf) { collect(t.left, out); collect(t.right, out); } return out; }
function keyPressed() {
  if (key === RIGHT_ARROW || key === 'y' || key === 'Y') { secret = -1; answer(true); }
  if (key === LEFT_ARROW || key === 'n' || key === 'N') { secret = -1; answer(false); }
  if (key === ' ') { restart(); secret = Math.floor(Math.random() * ANIMALS.length); autoT = millis(); }
  if (key === 'b' || key === 'B') { goodMode = !goodMode; rebuild(); }
  if (key === 'r' || key === 'R') restart();
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let rows = ANIMALS.map((a) => a[1].join(''));
  check('動物は 20 種類、答えの行はぜんぶちがう（同じ行だと見分けられない）', ANIMALS.length === 20 && new Set(rows).size === 20 && ANIMALS.every((a) => a[1].length === QUESTIONS.length));
  qid = 0; let g = buildQ(ANIMALS.map((_, i) => i), 0, true), b = buildQ(ANIMALS.map((_, i) => i), 0, false);
  check('よい木も悪い木も、葉はちょうど 20 枚で 1 匹ずつ', [g, b].every((t) => leavesOf(t).length === 20 && leavesOf(t).every((l) => l.cands.length === 1)));
  let reach = (t, i) => { while (!t.leaf) t = ANIMALS[i][1][t.q] === 1 ? t.left : t.right; return t.cands[0]; };
  check('どの動物も、自分の答えで木をたどると自分にたどり着く', ANIMALS.every((_, i) => reach(g, i) === i && reach(b, i) === i));
  let dg = avgDepth(g), mg = Math.max(...leavesOf(g).map((l) => l.depth));
  check('平均の質問数 ' + fmtNum(dg, 2) + ' ≥ log₂20 = 4.32、いちばん長い道 ' + mg + ' ≥ 5', dg >= Math.log2(20) - 1e-9 && mg >= 5);
  check('クラフトの等式：葉ごとの 2^(−深さ) の合計 = 1（2 分木）', near(sumArr(leavesOf(g).map((l) => Math.pow(2, -l.depth))), 1));
  check('よい質問の木の平均 ' + fmtNum(dg, 2) + ' < 悪い質問の木の平均 ' + fmtNum(avgDepth(b), 2), dg < avgDepth(b));
  check('情報利得：半分ずつ（10 / 10）なら 1 ビット、1 / 19 なら 0.29 ビット', near(entropyP(0.5), 1) && near(entropyP(1 / 20), 0.2864, 1e-4));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 心の中で動物を決めて答えよう。何回で当たった？ log₂20 = 4.32 と比べよう
// 2. B で悪い質問の木にすると、いちばん長い道は何回？ なぜ長くなる？
// 3. ANIMALS に動物を 1 匹足してみよう（同じ行になったら、自己テストが ✗ になる → 質問を 1 つ足す）
// 4. 32 種類なら最低何回？ 1000 種類なら？（2 の何乗か）
// 5. 01 では、「半分に近い」をエントロピーと情報利得で数えて、データのしきい値選びに使う

// ==================================================
// ここから下は「決定木の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 小さな道具：はさむ・合計・いちばん大きい番号
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
function sumArr(a) { let s = 0; for (let v of a) s += v; return s; }
function argMaxArr(a) { let b = 0; for (let i = 1; i < a.length; i++) if (a[i] > a[b]) b = i; return b; }   // 同点なら小さい番号
// ---- 不純度：counts = 各クラスの個数（重みつきでもよい）
function entropyP(p) { return p <= 0 || p >= 1 ? 0 : -p * Math.log2(p) - (1 - p) * Math.log2(1 - p); }   // 2 クラスのエントロピー（ビット）
function entropyOf(counts) {
  let n = sumArr(counts), h = 0; if (n <= 0) return 0;
  for (let c of counts) if (c > 0) { let q = c / n; h -= q * Math.log2(q); }
  return Math.max(0, h);
}
function giniOf(counts) { let n = sumArr(counts), s = 1; if (n <= 0) return 0; for (let c of counts) s -= (c / n) * (c / n); return Math.max(0, s); }
function errOf(counts) { let n = sumArr(counts); return n <= 0 ? 0 : Math.max(0, 1 - Math.max(...counts) / n); }   // 誤分類率
function impurityOf(counts, crit) { return crit === 'entropy' ? entropyOf(counts) : crit === 'error' ? errOf(counts) : giniOf(counts); }
// 分けたときの「不純度の減り」= 親 − (左の割合·左 + 右の割合·右)。crit = 'entropy' なら情報利得
function gainOf(parent, left, right, crit) {
  let n = sumArr(parent), nl = sumArr(left), nr = sumArr(right); if (n <= 0) return 0;
  return impurityOf(parent, crit) - (nl / n) * impurityOf(left, crit) - (nr / n) * impurityOf(right, crit);
}
// ---- 描く道具：クラスの色、領域の絵、木の図
const CLS_COL = [[245, 140, 75], [85, 175, 240], [175, 225, 95]];   // ★ クラス A・B・C の色
const BG_COL = [20, 30, 26];                                       // 背景（森の色）
function mixCol(probs, k) {           // クラスの割合 → 背景と混ぜた色（k = 色の濃さ）
  let c = BG_COL.slice(), s = sumArr(probs) || 1;
  probs.forEach((p, j) => { for (let q = 0; q < 3; q++) c[q] += (p / s) * (CLS_COL[j][q] - BG_COL[q]) * k; });
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
function drawPoints(bx, X, y, r, ws) {   // ws = 点の大きさの倍率（なければ 1）
  stroke(15); strokeWeight(1);
  for (let i = 0; i < X.length; i++) { let p = toPx(bx, X[i][0], X[i][1]); fill(...CLS_COL[y[i]]); circle(p[0], p[1], r * (ws ? ws[i] : 1)); }
}
function fmtNum(v, d) { if (!isFinite(v)) return '?'; let s = (+v.toFixed(d === undefined ? 2 : d)).toString(); return s === '-0' ? '0' : s; }
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) ? v.every(noNaN) : !(typeof v === 'number' && v !== v); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(120, 210, 150) : color(255, 90, 90)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
