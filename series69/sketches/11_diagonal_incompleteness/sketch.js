// ============================================
// 11 対角線論法と不完全性 ─ 「表に全部並べた」と言われたら、対角線を反転した行を作る。その行は表のどの行ともちがう
// ① カントール：0 と 1 の無限の列は数えきれない　② 停止問題：止まるかを判定するプログラムは作れない
// ③ ゲーデル：「この文は証明できない」という文が作れる（10 のゲーデル数で、式が自分の番号について話せる）
// 1 2 3 図を選ぶ / スペース 対角線を 1 マスずつ / ↑↓ 表の大きさ / R 新しい表
// ============================================

let panel = 0, sizeN = 10, table = [], sweep = -1, sweepT = 0, seed = 1;   // ★ sizeN = 表の大きさ（4〜16）

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  newTable();
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
function makeTable(n) { let t = []; for (let i = 0; i < n; i++) { let r = []; for (let j = 0; j < n; j++) r.push(rnd() < 0.5 ? 1 : 0); t.push(r); } return t; }
function newTable() { seedRng(seed++); table = makeTable(sizeN); sweep = -1; }
// ★ 対角線の反転：k 番目の行の k 番目を反対にした列 → k 番目の行とは k 番目でちがう
function diagonalFlip(t) { return t.map((r, k) => 1 - r[k]); }
function firstDiff(a, b) { for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return i; return -1; }
const PANELS = [
  { title: '① カントールの対角線論法', row: (i) => 'f(' + i + ')', col: (j) => j + '', cell: (v) => '' + v, newRow: 'd',
    note: ['「0 と 1 の無限の列を全部、f(0), f(1), f(2), … と並べた」としよう。', '対角線（f(k) の k 桁目）を全部反転した列 d を作ると、d は f(k) と k 桁目がちがう。', 'つまり d は表のどこにもない → どう並べても並べきれない（実数は自然数より多い）'] },
  { title: '② 停止問題（チューリング 1936）', row: (i) => 'P' + i, col: (j) => 'P' + j, cell: (v) => (v ? '止' : '∞'), newRow: 'D',
    note: ['「プログラム P にプログラム Q を入力すると止まるか」を答える判定器 H があるとする（表のマス）。', 'D(x) = 「H が x(x) は止まると言えば永久ループ、止まらないと言えば止まる」を作ると、D の行は対角線の反転。', 'D 自身も表のどこかの行のはずなのに、D(D) で矛盾 → H は作れない（忙しいビーバーの図はシリーズ 66 の 11）'] },
  { title: '③ ゲーデルの不完全性定理（1931）', row: (i) => 'φ' + i + '(x)', col: (j) => j + '', cell: (v) => (v ? '⊢' : '・'), newRow: 'ψ',
    note: ['行 = 変数 x を 1 つ持つ式 φ0, φ1, …（ゲーデル数の順）、マス = 「φk(n) は証明できる（⊢）か」。', 'ψ(x) = 「φx(x) は証明できない」は 10 のゲーデル数で算術の式として書ける。ψ = φg とすると', 'G = ψ(g) = 「φg(g) は証明できない」= 「この文 G は証明できない」。G が証明できたら矛盾 → G は証明できない（そして正しい）'] },
];

function draw() {
  background(...BG);
  let pn = PANELS[panel], n = table.length;
  hudTitle('対角線論法と不完全性：' + pn.title, '1 カントール　2 停止問題　3 ゲーデル　スペース 対角線を 1 マスずつ　↑↓ 表の大きさ ' + n + '　R 新しい表');
  if (sweep >= 0 && sweep < n) { sweepT++; if (sweepT > 30) { sweepT = 0; sweep++; } }
  let d = diagonalFlip(table), x0 = 110, y0 = 120, cs = Math.min(36, (height - 330) / (n + 2), (width * 0.55 - x0) / n);
  noStroke(); textAlign(CENTER, CENTER); textSize(cs * 0.45);
  for (let j = 0; j < n; j++) { fill(...DIMC); text(pn.col(j), x0 + j * cs + cs / 2, y0 - cs * 0.5); }
  for (let i = 0; i < n; i++) {
    fill(...(i === sweep ? YEL : DIMC)); textAlign(RIGHT, CENTER); text(pn.row(i), x0 - 10, y0 + i * cs + cs / 2); textAlign(CENTER, CENTER);
    for (let j = 0; j < n; j++) {
      let diag = i === j, lit = diag && (sweep < 0 || i <= sweep);
      fill(...(lit ? [110, 96, 50] : PANEL)); rect(x0 + j * cs + 1, y0 + i * cs + 1, cs - 2, cs - 2, 3);
      fill(...(lit ? YEL : INK)); text(pn.cell(table[i][j]), x0 + j * cs + cs / 2, y0 + i * cs + cs / 2);
    }
  }
  // ---- 反転した行
  let yd = y0 + (n + 0.6) * cs;
  fill(...PINK); textAlign(RIGHT, CENTER); text(pn.newRow, x0 - 10, yd + cs / 2); textAlign(CENTER, CENTER);
  for (let j = 0; j < n; j++) {
    let show = sweep < 0 || j <= sweep;
    stroke(...PINK); strokeWeight(1.5); fill(...BG); rect(x0 + j * cs + 1, yd + 1, cs - 2, cs - 2, 3);
    noStroke(); fill(...PINK); if (show) text(pn.cell(d[j]), x0 + j * cs + cs / 2, yd + cs / 2);
  }
  // ---- それぞれの行とのちがい
  let rx = width * 0.6;
  fill(...YEL); textSize(15); textAlign(LEFT, BASELINE); text(pn.newRow + ' は表のどの行ともちがう：', rx, 120);
  for (let i = 0; i < n; i++) {
    let show = sweep < 0 || i <= sweep;
    fill(...(show ? (d[i] !== table[i][i] ? GRN : PINK) : DIMC)); textSize(13);
    text(show ? pn.newRow + ' ≠ ' + pn.row(i) + '（' + i + ' 番目がちがう：' + pn.cell(d[i]) + ' と ' + pn.cell(table[i][i]) + '）' : '…', rx, 146 + i * 19);
  }
  // ---- 説明と、定理の正確な主張
  fill(...INK); textSize(14); textAlign(LEFT, TOP); textLeading(21);
  text(pn.note.join('\n'), 30, height - 190, width - 60, 70);
  fill(...SKY); textSize(13); textLeading(19);
  text('第 1 不完全性定理（ゲーデル 1931、ロッサー 1936 で強めた形）：自然数の足し算と掛け算を扱える程度に強く、無矛盾で、公理が計算で列挙できる理論には、その理論の中では証明も反証もできない文がある。\n' +
    '（ゲーデルのもとの証明では「反証もできない」の半分に ω 無矛盾性という強い仮定を使い、ロッサーがただの無矛盾性に弱めた。第 2 不完全性定理：そのような理論は自分の無矛盾性を証明できない）', 30, height - 112, width - 60, 80);
  drawSelfTest(width - 180, height - 14);
}
function keyPressed() {
  if (key >= '1' && key <= '3') { panel = Number(key) - 1; sweep = -1; }
  if (key === ' ') { sweep = sweep < 0 || sweep >= table.length ? 0 : sweep; sweepT = 0; }
  if (key === UP_ARROW) { sizeN = Math.min(16, sizeN + 1); newTable(); }
  if (key === DOWN_ARROW) { sizeN = Math.max(4, sizeN - 1); newTable(); }
  if (key === 'r' || key === 'R') newTable();
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(77); let ok = 0;
  for (let k = 0; k < 200; k++) { let t = makeTable(rndInt(1, 16)), d = diagonalFlip(t); if (t.every((r, i) => firstDiff(d, r) >= 0 && d[i] !== r[i])) ok++; }
  check('でたらめな表 200 個（1〜16 行）：対角線を反転した列は、k 行目と k 番目で必ずちがう', ok === 200);
  let allMiss = true, count = 0;
  for (let s = 1; s <= 3; s++) {                // 集合 S の要素 → S の部分集合（ビットの集まり）への関数を全部
    let nSub = 1 << s, total = Math.pow(nSub, s);
    for (let code = 0; code < total; code++) {
      let f = [], c = code; for (let x = 0; x < s; x++) { f.push(c % nSub); c = Math.floor(c / nSub); }
      let diag = 0; for (let x = 0; x < s; x++) if (!((f[x] >> x) & 1)) diag |= 1 << x;   // 対角線の集合 { x : x ∉ f(x) }
      if (f.indexOf(diag) >= 0) allMiss = false; count++;
    }
  }
  check('要素 1〜3 個の集合 S から部分集合への関数 ' + count + ' 個を全部ためす：どれも { x : x ∉ f(x) } を取りこぼす（カントールの定理）', allMiss && count === 2 + 16 + 512);
  const pair = (a, b) => ((a + b) * (a + b + 1)) / 2 + b;
  const unpair = (z) => { let w = Math.floor((Math.sqrt(8 * z + 1) - 1) / 2), t = (w * (w + 1)) / 2, b = z - t; return [w - b, b]; };
  let pairOk = true; for (let z = 0; z < 5000; z++) { let [a, b] = unpair(z); if (pair(a, b) !== z || a < 0 || b < 0) pairOk = false; }
  check('くらべ：自然数の組 (a, b) は数えられる（カントールの対関数が 0〜4999 で行って戻れる）', pairOk);
  let seen = new Set(); for (let n = 1; n < 2048; n++) seen.add(n.toString(2).slice(1));
  check('くらべ：有限の 0/1 の列は数えられる（n を 2 進数にして先頭の 1 を消すと、長さ 10 までの 2047 個がちょうど 1 回ずつ）', seen.size === 2047);
  let models = [];
  for (let g = 0; g < 2; g++) for (let pr = 0; pr < 2; pr++) if ((g === 1) === (pr === 0) && (!pr || g)) models.push([g, pr]);
  check('「G ⇔ G は証明できない」と「証明できるものは正しい」を両方みたす真偽は 1 通り：G は正しく、証明できない', models.length === 1 && models[0][0] === 1 && models[0][1] === 0);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. スペースで対角線を 1 マスずつ。d は f(0) と 0 番目、f(1) と 1 番目、… でちがうことを確かめよう
// 2. 表を 16 にしても、何回 R を押しても、d は必ず表の外。表を作る人が「d も入れたよ」と言ったら？（その新しい表でまた作る）
// 3. 停止問題の D と、ゲーデルの ψ は「対角線を反転した行」の同じ形。どこが対応しているか表にしてみよう
// 4. 不完全性定理の 3 つの条件（十分強い・無矛盾・公理が計算で列挙できる）の 1 つでもなくすと、どうなる？
//    （例：正しい算術の文を全部公理にすると完全になるが、公理を列挙するプログラムが作れない）
// 5. 「この文はうそ」（13 のうそつきのパラドックス）と「この文は証明できない」のちがいは？

// ==================================================
// ここから下は「論理の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 色と小さな道具（黒板とチョーク）
const BG = [40, 54, 47];                // 背景（黒板の灰緑）
const INK = [238, 238, 228];            // 文字（白いチョーク）
const YEL = [246, 218, 120], SKY = [128, 186, 222], PINK = [238, 146, 150], GRN = [164, 214, 146], LILAC = [196, 170, 230];
const DIMC = [150, 166, 156], PANEL = [50, 66, 58], LINEC = [92, 112, 102];
function clampv(v, a, b) { return v < a ? a : v > b ? b : v !== v ? a : v; }     // NaN なら a に戻す
function fmtN(v, d) { if (typeof v !== 'number' || v !== v) return '?'; return v.toFixed(d === undefined ? 2 : d); }
function hudTitle(t, sub) {              // 左上のタイトルと操作の説明（日本語は 1 文字ずつ折り返す）
  textWrap(CHAR); noStroke(); fill(...INK); textSize(22); textAlign(LEFT, BASELINE); text(t, 30, 38);
  fill(...DIMC); textSize(14); textLeading(19); text(sub, 30, 62);
}
function typeInto(s, ch, allowed, maxLen) {   // 文字の入力：allowed に入っている 1 文字だけ足す（長さの上限つき）
  if (typeof ch !== 'string' || ch.length !== 1 || allowed.indexOf(ch) < 0) return s;
  return s.length < (maxLen || 40) ? s + ch : s;
}
function chalkPanel(x, y, w, h) { noStroke(); fill(...PANEL); rect(x, y, w, h, 8); }
function drawInputLine(x, y, label, s, err, active) {   // 入力欄：文字列と、まちがいの説明
  noStroke(); fill(...(active === false ? DIMC : YEL)); textSize(15); textAlign(LEFT, BASELINE); text(label, x, y);
  let lx = x + textWidth(label) + 8;
  fill(...INK); textSize(20); text(s + (active !== false && frameCount % 60 < 30 ? '▏' : ''), lx, y + 1);
  if (err) { fill(...PINK); textSize(14); text('✗ ' + err, lx, y + 22); }
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
function rndPick(arr) { return arr[Math.floor(rnd() * arr.length)]; }
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(...(selfTestResults.every((r) => r.ok) ? GRN : PINK)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
