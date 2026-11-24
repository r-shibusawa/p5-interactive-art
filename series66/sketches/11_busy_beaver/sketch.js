// ============================================
// 11 忙しいビーバーと停止問題 ─ 状態が n 個の機械で、空のテープから始めて「止まるもののうち」いちばんたくさん 1 を書くのは？
// 記号は 0 と 1、止まる状態 H への最後の 1 手も数える。2 状態は 1 が 4 個（6 手）、4 状態は 13 個（107 手）。
// 3 状態では「1 の数の王者」（6 個・14 手）と「手数の王者」（21 手・1 は 5 個）が別の機械。
// 2 状態の機械 20736 個を全部ためすと：止まる / 止まらない（同じ様子のくり返し・ずれながらのくり返しを見つけた）/ 判定できない（手数の上限まで）
// 1〜4 王者を選ぶ / スペース 再生・一時停止 / ↑↓ 判定の手数の上限 / R 全部ためすのをやり直す
// ============================================

const CHAMPS = [                        // ★ [名前, 機械（A0:1RB = 状態 A で 0 を読んだら 1 を書いて右へ、B へ）, 1 の数, 手数]
  ['2 状態の王者', 'A0:1RB A1:1LB B0:1LA B1:1RH', 4, 6],
  ['3 状態：1 の数の王者', 'A0:1RB A1:1RH B0:0RC B1:1RB C0:1LC C1:1LA', 6, 14],
  ['3 状態：手数の王者', 'A0:1RB A1:1RH B0:1LB B1:0RC C0:1LC C1:1LA', 5, 21],
  ['4 状態の王者', 'A0:1RB A1:1LB B0:1LA B1:0LC C0:1RH C1:1LD D0:1RD D1:0RA', 13, 107],
];
let champ = 0, rows = [], shown = 0, playing = true, budget = 40, enumIdx = 0, counts, best, enumDone = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  loadChamp(0); restartEnum();
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
function loadChamp(k) {                 // 1 手ごとのテープを全部記録しておく（時空図用）
  champ = k; let m = tmFromCode(CHAMPS[k][1]), c = tmStart(m, '', 0);
  rows = [{ tape: new Map(c.tape), head: c.head, q: c.q }];
  while (!c.halted && c.steps < 500) { tmStep(m, c); rows.push({ tape: new Map(c.tape), head: c.head, q: c.q }); }
  shown = 1; playing = true;
}
// ---- 2 状態の機械を全部ためす（速いシミュレータ：テープは配列）
const OPT = [];                         // 1 つの遷移の選び方 12 通り：書く 0/1 × 左右 × 次 A/B/H
for (let w = 0; w < 2; w++) for (let d = -1; d <= 1; d += 2) for (let nx = 0; nx < 3; nx++) OPT.push([w, d, nx]);
const tapeBuf = new Uint8Array(2048), saveBuf = new Uint8Array(2048);
function classify(idx, maxSteps) {      // 返り値 {kind: 'halt' | 'loop' | 'shift' | 'unknown', ones, steps}
  let tr = [OPT[idx % 12], OPT[Math.floor(idx / 12) % 12], OPT[Math.floor(idx / 144) % 12], OPT[Math.floor(idx / 1728) % 12]];   // A0 A1 B0 B1
  tapeBuf.fill(0); let head = 1024, q = 0, lo = 1024, hi = 1024, savedQ = -1, savedHead = 0, savedLo = 0, savedHi = 0, recs = [];
  for (let s = 1; s <= maxSteps; s++) {
    // ずれながらくり返す：書いたことのない端のマスに来たら記録。前の記録と「状態」と「そこから戻って読んだ範囲のテープ」が
    // 同じなら、そのあとは同じ動きを少しずつずれながら永遠にくり返す（空白へ逃げ続けるのもこの仲間）
    if (head < lo || head > hi) {
      let dir = head < lo ? -1 : 1;
      for (let rc of recs) if (rc.q === q && rc.dir === dir) {
        let same = true;
        for (let i = rc.pos; i !== rc.far + (-dir); i -= dir) { let old = i - rc.base >= 0 && i - rc.base < rc.snap.length ? rc.snap[i - rc.base] : 0; if (tapeBuf[head + (i - rc.pos)] !== old) { same = false; break; } }
        if (same) return { kind: 'shift', steps: s - 1 };
      }
      let a = Math.min(lo, head), b = Math.max(hi, head);
      recs.push({ q, dir, pos: head, far: head, base: a, snap: tapeBuf.slice(a, b + 1) });
      if (recs.length > 8) recs.shift();
    }
    let r = tr[q * 2 + tapeBuf[head]];
    tapeBuf[head] = r[0]; lo = Math.min(lo, head); hi = Math.max(hi, head); head += r[1];
    if (head < 1 || head > 2046) return { kind: 'unknown', steps: s };
    for (let rc of recs) rc.far = rc.dir < 0 ? Math.max(rc.far, head) : Math.min(rc.far, head);   // 記録のあと、どこまで戻ったか
    if (r[2] === 2) { let ones = 0; for (let i = lo; i <= hi; i++) ones += tapeBuf[i]; return { kind: 'halt', ones, steps: s }; }
    q = r[2];
    // くり返し：ブレントの方法で 1, 2, 4, 8 … 手目の様子を保存し、まったく同じ様子にもどったら止まらない
    if (q === savedQ && head === savedHead && lo === savedLo && hi === savedHi) { let same = true; for (let i = lo; i <= hi; i++) if (tapeBuf[i] !== saveBuf[i]) { same = false; break; } if (same) return { kind: 'loop', steps: s }; }
    if ((s & (s - 1)) === 0) { saveBuf.set(tapeBuf.subarray(lo, hi + 1), lo); savedQ = q; savedHead = head; savedLo = lo; savedHi = hi; }
  }
  return { kind: 'unknown', steps: maxSteps };
}
function restartEnum() { enumIdx = 0; enumDone = false; counts = { halt: 0, loop: 0, shift: 0, unknown: 0 }; best = { ones: 0, steps: 0 }; }
function enumSlice(ms) {                // 1 フレームに ms ミリ秒だけ進める（60fps のまま）
  let t0 = performance.now();
  while (enumIdx < 20736 && performance.now() - t0 < ms) for (let k = 0; k < 64 && enumIdx < 20736; k++) {
    let r = classify(enumIdx++, budget); counts[r.kind]++;
    if (r.kind === 'halt') { best.ones = Math.max(best.ones, r.ones); best.steps = Math.max(best.steps, r.steps); }
  }
  if (enumIdx >= 20736) enumDone = true;
}

function draw() {
  background(...BG);
  hudTitle('忙しいビーバーと停止問題：' + CHAMPS[champ][0], '1〜4 王者を選ぶ　スペース 再生・一時停止　↑↓ 判定の手数の上限（' + budget + '）　R 全部ためすのをやり直す');
  if (playing && frameCount % 3 === 0 && shown < rows.length) shown++;
  if (!enumDone) enumSlice(5);
  // ---- 王者の機械：状態表と時空図
  let m = tmFromCode(CHAMPS[champ][1]), cur = rows[shown - 1];
  noStroke(); textAlign(LEFT, BASELINE); fill(...INK); textSize(15);
  text('状態表', 30, 100);
  m.states.forEach((q, i) => ['0', '1'].forEach((s, j) => { let r = m.rules[q + s]; fill(...(cur.q === q && (cur.tape.get(cur.head) || '0') === s && shown < rows.length ? AMBER : DIMC)); textSize(14); text(q + s + ' → ' + r.join(''), 30 + j * 110, 124 + i * 22); }));
  let ones = [...cur.tape.values()].filter((v) => v === '1').length;
  fill(...(shown >= rows.length ? LIME : INK)); textSize(18);
  text('手数 ' + (shown - 1) + '　1 の数 ' + ones + (shown >= rows.length ? '　止まった（' + CHAMPS[champ][2] + ' 個・' + CHAMPS[champ][3] + ' 手）' : ''), 30, 124 + m.states.length * 22 + 20);
  // 時空図
  let lo = 0, hi = 0; for (let r of rows) { lo = Math.min(lo, r.head, ...r.tape.keys()); hi = Math.max(hi, r.head, ...r.tape.keys()); }
  let gy = 124 + m.states.length * 22 + 44, gh = height - gy - 40, ch = Math.min(24, gh / rows.length), cw = Math.min(40, (width * 0.5 - 60) / (hi - lo + 1));
  for (let k = 0; k < shown; k++) { let r = rows[k];
    for (let i = lo; i <= hi; i++) { noStroke(); fill(...(r.tape.get(i) === '1' ? AMBER : [22, 40, 32])); rect(30 + (i - lo) * cw, gy + k * ch, cw - 1, Math.max(1, ch - (ch > 3 ? 1 : 0))); }
    fill(...CYAN); rect(30 + (r.head - lo) * cw + cw * 0.3, gy + k * ch, cw * 0.4, Math.max(1, ch - 1)); }
  // ---- 2 状態の機械を全部ためす
  let px = width * 0.56, py = 100;
  textAlign(LEFT, BASELINE); fill(...INK); textSize(16); text('2 状態の機械を全部ためす：' + enumIdx + ' / 20736（手数の上限 ' + budget + '）', px, py);
  let kinds = [['halt', '止まる', LIME], ['loop', '止まらない：同じ様子のくり返し', CYAN], ['shift', '止まらない：ずれながらくり返す', VIOLET], ['unknown', '判定できない（上限まで動いた）', ROSE]];
  kinds.forEach(([k, lab, col], i) => {
    let y = py + 28 + i * 30, w = (counts[k] / 20736) * (width - px - 60);
    noStroke(); fill(...col, 200); rect(px, y, Math.max(1, w), 20, 3);
    fill(...INK); textSize(14); text(lab + '　' + counts[k], px + Math.max(1, w) + 8, y + 15);
  });
  fill(...DIMC); textSize(14);
  text('止まるものの中で 1 の数の最大 ' + best.ones + '、手数の最大 ' + best.steps + (enumDone ? '（= 2 状態の王者 4 個・6 手）' : ''), px, py + 156);
  text('上限を小さくすると「判定できない」が増える。', px, py + 180);
  text('どんな上限・どんな工夫でも、全部の機械を判定できる方法はない ↓', px, py + 202);
  drawDiagonal(px, py + 236, width - px - 40, height - py - 390);
  drawSelfTest(width - 180, height - 14);
}
function drawDiagonal(x, y, w, h) {     // 停止問題の対角線論法の図
  let n = 6, cs = Math.min(36, h / (n + 2), w / (n + 4)), pat = [[1, 0, 1, 1, 0, 1], [0, 0, 1, 0, 1, 1], [1, 1, 1, 0, 0, 0], [0, 1, 0, 1, 1, 0], [1, 1, 0, 0, 0, 1], [0, 0, 1, 1, 1, 1]];
  noStroke(); fill(...INK); textSize(15); textAlign(LEFT, BASELINE); text('停止問題：「止まるか判定する機械」があると仮定すると…', x, y);
  for (let i = 0; i < n; i++) {
    fill(...DIMC); textSize(12); textAlign(CENTER, CENTER); text('機械' + (i + 1), x + 30, y + 30 + (i + 1) * cs); text('入力' + (i + 1), x + 70 + i * cs, y + 30);
    for (let j = 0; j < n; j++) { fill(...(i === j ? AMBER : PANEL)); rect(x + 70 + j * cs - cs / 2 + 1, y + 30 + (i + 1) * cs - cs / 2 + 1, cs - 2, cs - 2, 3); fill(...(i === j ? [10, 20, 15] : INK)); text(pat[i][j] ? '止' : '∞', x + 70 + j * cs, y + 30 + (i + 1) * cs); }
  }
  let ly = y + 30 + (n + 1) * cs; fill(...ROSE); textAlign(CENTER, CENTER);
  text('反', x + 30, ly);
  for (let j = 0; j < n; j++) { fill(...ROSE, 80); rect(x + 70 + j * cs - cs / 2 + 1, ly - cs / 2 + 1, cs - 2, cs - 2, 3); fill(...INK); text(pat[j][j] ? '∞' : '止', x + 70 + j * cs, ly); }
  fill(...DIMC); textSize(13); textAlign(LEFT, TOP); textLeading(18);
  text('対角線（自分自身を入力）の答えを全部反対にした機械「反」を作る。\n「反」は表のどの行ともどこかでちがう → 表にない。でも「反」も機械なので\n表のどこかにあるはず。矛盾！ だから、どの機械にも使える停止の判定機は\n作れない（チューリング 1936）', x, ly + cs * 0.8);
}

function keyPressed() {
  if (key >= '1' && key <= '4') loadChamp(+key - 1);
  if (key === ' ') { if (shown >= rows.length) shown = 1; playing = !playing; }
  if (key === UP_ARROW) { budget = Math.min(200, budget + 10); restartEnum(); }
  if (key === DOWN_ARROW) { budget = Math.max(5, budget - 5); restartEnum(); }
  if (key === 'r' || key === 'R') restartEnum();
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  for (let [name, code, ones, steps] of CHAMPS) {
    let c = tmRun(tmFromCode(code), '', 1000);
    check(name + '：1 の数 ' + tmCount(c, '1') + '、手数 ' + c.steps + '（期待 ' + ones + ' 個・' + steps + ' 手）', c.halted && tmCount(c, '1') === ones && c.steps === steps);
  }
  let cnt = { halt: 0, loop: 0, shift: 0, unknown: 0 }, bo = 0, bs = 0, okSure = true;
  for (let i = 0; i < 20736; i++) { let r = classify(i, 100); cnt[r.kind]++; if (r.kind === 'halt') { bo = Math.max(bo, r.ones); bs = Math.max(bs, r.steps); } }
  check('2 状態の機械 20736 個（上限 100 手）：止まるものの最大は 1 が ' + bo + ' 個・' + bs + ' 手（= 王者）', bo === 4 && bs === 6);
  let unk = []; for (let i = 0; i < 20736; i++) if (classify(i, 100).kind === 'unknown') unk.push(i);
  check('分類の合計 = 20736、上限 100 手で判定できないのは ' + cnt.unknown + ' 個だけ（2000 手まで動かしてもどれも止まらない）', cnt.halt + cnt.loop + cnt.shift + cnt.unknown === 20736 && cnt.unknown === 12 && unk.every((i) => classify(i, 2000).kind !== 'halt'));
  let nSure = 0;
  for (let i = 0; i < 20736; i += 37) { let r = classify(i, 100); if (r.kind === 'loop' || r.kind === 'shift') { nSure++; if (classify(i, 1500).kind === 'halt') okSure = false; } }
  check('「止まらない」と判定した機械は、1500 手まで動かしても本当に止まらない（' + nSure + ' 個を抜き取り）', okSure && nSure > 200);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 4 で 4 状態の王者を再生しよう。107 手のあいだ、ヘッドはどんな形で行ったり来たりする？（時空図）
// 2. ↓ で上限を 5 や 10 にすると「判定できない」が出てくる。上限を上げると減るが、状態が増えると……
// 3. 5 状態の王者は 4098 個の 1 を 47176870 手で書く。6 状態の答えは今でもわかっていない
// 4. CHAMPS の機械を 1 か所だけ変えてみよう（例：B1:1RH を B1:1LH に）。1 の数と手数はどうなる？
// 5. 「くり返し」「ずれながらくり返す」の判定は確実。でも「そのうち止まるかも」としか言えない機械はいつまでも判定できない。対角線の図と見くらべよう

// ==================================================
// ここから下は「オートマトンの道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 色と小さな道具
const BG = [9, 20, 15];                 // 背景（回路基板の黒緑）
const INK = [226, 240, 228];            // 文字（蛍光の白）
const AMBER = [255, 170, 50], CYAN = [70, 215, 230], LIME = [140, 230, 120], ROSE = [255, 100, 120], VIOLET = [185, 150, 255];
const DIMC = [125, 155, 138], PANEL = [18, 36, 28], WIRE = [44, 74, 58];
function clampv(v, a, b) { return v < a ? a : v > b ? b : v !== v ? a : v; }     // NaN なら a に戻す
function fmtN(v, d) { if (typeof v !== 'number' || v !== v) return '?'; return v.toFixed(d === undefined ? 2 : d); }
function hudTitle(t, sub) {              // 左上のタイトルと操作の説明
  noStroke(); fill(...INK); textSize(22); textAlign(LEFT, BASELINE); text(t, 30, 38);
  fill(...DIMC); textSize(14); textLeading(19); text(sub, 30, 62);
}
function typeInto(s, ch, allowed, maxLen) {   // 文字の入力：allowed に入っている 1 文字だけ足す（長さの上限つき）
  if (typeof ch !== 'string' || ch.length !== 1 || allowed.indexOf(ch) < 0) return s;
  return s.length < (maxLen || 40) ? s + ch : s;
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
function rndString(alpha, len) { let s = ''; for (let i = 0; i < len; i++) s += alpha[Math.floor(rnd() * alpha.length)]; return s; }
// ---- チューリング機械の道具
// 機械 = { states: ['A','B'], syms: ['0','1'], blank: '0', rules: { A0: ['1', 'R', 'B'], ... }, start: 'A', halt: 'H' }
//   規則がないときも止まる（「止まる」= 規則がない or 状態 H）
function tmStart(m, s, head) {
  let tape = new Map(); for (let i = 0; i < s.length; i++) if (s[i] !== m.blank) tape.set(i, s[i]);
  return { tape, head: head || 0, q: m.start, steps: 0, halted: false, lo: 0, hi: Math.max(0, s.length - 1) };
}
function tmRead(cfg, i, blank) { let v = cfg.tape.get(i); return v === undefined ? blank : v; }
function tmStep(m, cfg) {               // 1 手：読む → 書く → 動く → 状態を変える
  if (cfg.halted) return false;
  let r = m.rules[cfg.q + tmRead(cfg, cfg.head, m.blank)];
  if (!r || cfg.q === m.halt) { cfg.halted = true; return false; }
  if (r[0] === m.blank) cfg.tape.delete(cfg.head); else cfg.tape.set(cfg.head, r[0]);
  cfg.head += r[1] === 'R' ? 1 : r[1] === 'L' ? -1 : 0;
  cfg.q = r[2]; cfg.steps++;
  cfg.lo = Math.min(cfg.lo, cfg.head); cfg.hi = Math.max(cfg.hi, cfg.head);
  if (cfg.q === m.halt) cfg.halted = true;
  return true;
}
function tmRun(m, s, maxSteps, head) { let cfg = tmStart(m, s, head); while (!cfg.halted && cfg.steps < maxSteps) tmStep(m, cfg); return cfg; }
function tmTape(cfg, blank, lo, hi) { let s = ''; for (let i = lo; i <= hi; i++) s += tmRead(cfg, i, blank); return s; }
function tmContent(cfg, blank) {        // 空白でない部分だけの文字列
  let ks = [...cfg.tape.keys()]; if (!ks.length) return '';
  return tmTape(cfg, blank, Math.min(...ks), Math.max(...ks));
}
function tmCount(cfg, sym) { let n = 0; for (let v of cfg.tape.values()) if (v === sym) n++; return n; }
function tmFromCode(code) {             // 'A0:1RB A1:1LB B0:1LA B1:1RH' のような短い書き方から
  let rules = {}, states = new Set();
  for (let part of code.trim().split(/\s+/)) { let [k, v] = part.split(':'); rules[k] = [v[0], v[1], v.slice(2)]; states.add(k.slice(0, -1)); }
  return { states: [...states], syms: ['0', '1'], blank: '0', rules, start: 'A', halt: 'H' };
}
function drawTape(cfg, blank, x, y, cw, ncell, center, cols) {   // テープのマスとヘッド
  let lo = Math.round(center - ncell / 2);
  textAlign(CENTER, CENTER); textSize(Math.min(22, cw * 0.6));
  for (let k = 0; k < ncell; k++) {
    let i = lo + k, v = tmRead(cfg, i, blank), cx = x + k * cw;
    stroke(...WIRE); strokeWeight(1); fill(...((cols && cols[v]) || PANEL)); rect(cx, y, cw - 2, cw * 1.2, 4);
    noStroke(); fill(...INK); text(v === blank ? '' : v, cx + cw / 2 - 1, y + cw * 0.6);
    if (i === cfg.head) { fill(...AMBER); triangle(cx + cw / 2 - 1, y - 4, cx + cw / 2 - 10, y - 18, cx + cw / 2 + 8, y - 18); noFill(); stroke(...AMBER); strokeWeight(3); rect(cx, y, cw - 2, cw * 1.2, 4); noStroke(); }
  }
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(...(selfTestResults.every((r) => r.ok) ? LIME : ROSE)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
