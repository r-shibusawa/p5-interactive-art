// ============================================
// 12 互いを観察する系（二次サイバネティクス）
// コイン合わせ：A は「同じ面」なら勝ち、B は「ちがう面」なら勝ち。どちらも相手の過去の手から次の手を予測する
// でも相手も自分を予測している。観察する者が、観察される系の一部になる → 手の列はどんどん「読めない」（エントロピー 1 ビット）へ
// ↑↓ = A の記憶の長さ / ←→ = B の記憶の長さ（自動のとき） / H = あなた vs B（← = 表、→ = 裏） / スペース = 速さ / R = やり直し
// ============================================

let kA = 3, kB = 1;          // ★ 何手前まで覚えて予測するか（0〜6）
const FORGET = 0.98;         // ★ 古い記録をだんだん忘れる（相手の変化についていくため）
const SURE = 0.1;           // ★ 予測に自信がないとみなす幅
const WIN = 200;             // 成績を数える直近の手数
let A, B, rng, game, human = false, speeds = [1, 4, 20], spI = 1, lastHuman = '';

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  selfTest();
  resetAll();
}
function resetAll() { rng = makeRng(12); A = makePlayer(kA, true); B = makePlayer(kB, false); game = { a: [], b: [], hitA: [], hitB: [], winA: 0, n: 0 }; }
// ---- 予測する人：相手の直近 k 手の並び（文脈）ごとに、次に 0 / 1 が来た回数を数える
function makePlayer(k, matcher) { return { k, matcher, cnt: new Float64Array((1 << k) * 2), opp: [] }; }
function ctx(p) { let c = 0; for (let i = 0; i < p.k; i++) c = c * 2 + (p.opp[p.opp.length - 1 - i] || 0); return c; }
function probOne(p) { if (p.opp.length < p.k) return 0.5; let c = ctx(p), n0 = p.cnt[2 * c], n1 = p.cnt[2 * c + 1]; return (n1 + 0.5) / (n0 + n1 + 1); }
// 自信がない（確率が 0.5 ± SURE の中）ときは、コインを投げて決める
function predict(p, r) { let q = probOne(p); return Math.abs(q - 0.5) < SURE ? (r() < 0.5 ? 1 : 0) : q > 0.5 ? 1 : 0; }
function chooseMove(p, r) { let g = predict(p, r); return { guess: g, move: p.matcher ? g : 1 - g }; }
function learn(p, oppMove) {
  if (p.opp.length >= p.k) { for (let i = 0; i < p.cnt.length; i++) p.cnt[i] *= FORGET; p.cnt[2 * ctx(p) + oppMove] += 1; }
  p.opp.push(oppMove); if (p.opp.length > 64) p.opp.shift();
}
// ---- エントロピー（ビット）：1 手ずつの H1 と、2 手前までを知ったときの条件つき H(x | 前 2 手)
function entropy1(xs) { let n = xs.length; if (!n) return 0; let p = xs.reduce((a, b) => a + b, 0) / n; return p <= 0 || p >= 1 ? 0 : -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p)); }
function condEntropy(xs, m) {
  let tab = {}, n = 0;
  for (let i = m; i < xs.length; i++) { let key = xs.slice(i - m, i).join(''); tab[key] = tab[key] || [0, 0]; tab[key][xs[i]]++; n++; }
  let h = 0; for (let key in tab) { let [a, b] = tab[key], t = a + b; for (let c of [a, b]) if (c) h -= (c / n) * Math.log2(c / t); }
  return n ? h : 0;
}
function playRound(moveA) {
  let ca = chooseMove(A, rng), cb = chooseMove(B, rng), ma = moveA === undefined ? ca.move : moveA;
  game.a.push(ma); game.b.push(cb.move); game.hitA.push(ca.guess === cb.move ? 1 : 0); game.hitB.push(cb.guess === ma ? 1 : 0);
  if (ma === cb.move) game.winA++; game.n++;
  for (let key of ['a', 'b', 'hitA', 'hitB']) if (game[key].length > 600) game[key].shift();
  learn(A, cb.move); learn(B, ma);
}
function rate(arr) { let s = arr.slice(-WIN); return s.length ? s.reduce((a, b) => a + b, 0) / s.length : 0; }

function draw() {
  background(24, 35, 10);
  if (!human && frameCount % (spI === 0 ? 20 : 1) === 0) for (let k = 0; k < (spI === 0 ? 1 : speeds[spI]); k++) playRound();

  say('互いを観察する系 ─ 相手を予測する相手を、予測する', 20, 36, 20);
  say(human ? 'あなた（A：同じ面なら勝ち）vs 予測器 B　← 表(0)　→ 裏(1)　↑↓ なし　H 自動に戻す　R やり直し'
            : '↑↓ A の記憶 ' + kA + ' 手　←→ B の記憶 ' + kB + ' 手　H あなたが A になる　スペース 速さ ×' + speeds[spI] + '　R やり直し', 20, 62, 15, C_SUB);

  // ---- 手の列（上 = A、下 = B）
  let x0 = 30, y0 = 100, cw = Math.max(4, (width - 60) / 120), sa = game.a.slice(-120), sb = game.b.slice(-120);
  say('A の手（同じ面なら A の勝ち）', x0, y0, 14, C_TUBE); say('B の手', x0, y0 + 70, 14, C_SCOPE);
  for (let i = 0; i < sa.length; i++) {
    noStroke(); fill(sa[i] ? col(C_TUBE) : color(24, 40, 30)); rect(x0 + i * cw, y0 + 10, cw - 1, 36);
    fill(sb[i] ? col(C_SCOPE) : color(135, 40, 25)); rect(x0 + i * cw, y0 + 80, cw - 1, 36);
    if (sa[i] === sb[i]) { fill(col(C_BRASS)); rect(x0 + i * cw, y0 + 52, cw - 1, 8); }
  }
  say('黄色 = 同じ面（A の勝ち）', x0, y0 + 140, 13, C_BRASS);
  // ---- 成績
  let mx = 30, my = y0 + 190, ea = entropy1(game.a.slice(-WIN)), eb = entropy1(game.b.slice(-WIN));
  let rows = [['', 'A（' + (human ? 'あなた' : '記憶 ' + kA + ' 手') + '）', 'B（記憶 ' + kB + ' 手）'],
    ['予測の的中率（直近 ' + WIN + ' 手）', human ? '—' : (100 * rate(game.hitA)).toFixed(1) + '%', (100 * rate(game.hitB)).toFixed(1) + '%'],
    ['手の列のエントロピー H₁（ビット）', ea.toFixed(3), eb.toFixed(3)],
    ['前 2 手を知ったときの H（読めなさ）', condEntropy(game.a.slice(-WIN), 2).toFixed(3), condEntropy(game.b.slice(-WIN), 2).toFixed(3)]];
  rows.forEach((r, i) => r.forEach((c, k) => say(c, mx + (k ? 300 + (k - 1) * 220 : 0), my + i * 30, i ? 16 : 14, k === 1 ? C_TUBE : k === 2 ? C_SCOPE : C_TXT)));
  say('対戦 ' + game.n + ' 回　A の勝ち ' + game.winA + '（' + (game.n ? ((100 * game.winA) / game.n).toFixed(1) : '—') + '%）', mx, my + 136, 17);
  if (human) say(lastHuman, mx, my + 166, 16, C_BRASS);
  say('あいてを読めれば勝てる → 読まれた側は手を変える → 読まれない手（でたらめ、1 ビット）へ近づく', mx, my + 196, 14, C_SUB);
  // ---- 的中率のグラフ
  let gx = width * 0.62, gy = my - 10, gw = width - gx - 30, gh = height - gy - 50;
  let roll = (arr) => { let out = []; for (let i = 20; i <= arr.length; i++) out.push(arr.slice(i - 20, i).reduce((a, b) => a + b, 0) / 20); return out; };
  plotFrame(gx, gy, gw, gh, '的中率（20 手の平均、0〜1、点線 = 0.5）');
  hLine(0.5, gx, gy, gw, gh, 0, 1, C_BRASS);
  if (!human) plotLine(roll(game.hitA), gx, gy, gw, gh, 0, 1, C_TUBE, 581, 1.8);
  plotLine(roll(game.hitB), gx, gy, gw, gh, 0, 1, C_SCOPE, 581, 1.8);
  drawSelfTest();
}

function keyPressed() {
  if (human && (key === LEFT_ARROW || key === RIGHT_ARROW)) {
    let m = key === LEFT_ARROW ? 0 : 1, bGuess = predict(B, rng); playRound(m);
    lastHuman = 'あなた ' + (m ? '裏' : '表') + '、B ' + (game.b[game.b.length - 1] ? '裏' : '表') + '（B の予想は ' + (bGuess ? '裏' : '表') + '）' + (m === game.b[game.b.length - 1] ? '　あなたの勝ち' : '　B の勝ち');
    return;
  }
  if (key === UP_ARROW) { kA = Math.min(6, kA + 1); resetAll(); }
  if (key === DOWN_ARROW) { kA = Math.max(0, kA - 1); resetAll(); }
  if (key === RIGHT_ARROW) { kB = Math.min(6, kB + 1); resetAll(); }
  if (key === LEFT_ARROW) { kB = Math.max(0, kB - 1); resetAll(); }
  if (key === 'h' || key === 'H') { human = !human; resetAll(); }
  if (key === ' ') spI = (spI + 1) % speeds.length;
  if (key === 'r' || key === 'R') resetAll();
}

// ---- 自己テスト：決まった相手に対する予測
function accVs(k, seqFn, n) {
  let p = makePlayer(k, true), r = makeRng(3), hit = 0;
  for (let t = 0; t < n; t++) { let x = seqFn(t), g = predict(p, r); if (t >= n / 2 && g === x) hit++; learn(p, x); }
  return hit / (n / 2);
}
function selfTest() {
  selfTestResults = [];
  check('交互の相手 0101…：記憶 1 手で的中率 ' + (100 * accVs(1, (t) => t % 2, 400)).toFixed(0) + '%（> 95%）', accVs(1, (t) => t % 2, 400) > 0.95);
  let a0 = accVs(0, (t) => (t % 3 === 2 ? 1 : 0), 600), a2 = accVs(2, (t) => (t % 3 === 2 ? 1 : 0), 600);
  check('001001…：記憶 2 手 ' + (100 * a2).toFixed(0) + '% は 記憶 0 手 ' + (100 * a0).toFixed(0) + '% より当たる（2 手前まで見ないと周期がわからない）', a2 > 0.95 && a0 < 0.7);
  let rr = makeRng(99), ar = accVs(3, () => (rr() < 0.5 ? 1 : 0), 8000);
  check('でたらめな相手には、どんな予測も約 50%（' + (100 * ar).toFixed(1) + '%、±3% 以内）', Math.abs(ar - 0.5) < 0.03);
  check('エントロピー：同じ手ばかり 0 ビット、0101… は H₁ = 1 ビットでも前 2 手を知れば 0', near(entropy1([1, 1, 1, 1]), 0) && near(entropy1([0, 1, 0, 1]), 1) && near(condEntropy([0, 1, 0, 1, 0, 1, 0, 1], 2), 0));
  let pA = makePlayer(3, true), pB = makePlayer(1, false), r2 = makeRng(5), xs = [];
  for (let t = 0; t < 3000; t++) { let a = chooseMove(pA, r2).move, b = chooseMove(pB, r2).move; xs.push(a); learn(pA, b); learn(pB, a); }
  let h = condEntropy(xs.slice(-1000), 2);
  check('予測器どうし 3000 回：A の手は前 2 手を知っても読みにくい（H = ' + h.toFixed(3) + ' > 0.8 ビット）', h > 0.8);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. H を押して、あなたが A になろう。B（予測器）に何 % 読まれる？ 50% より読まれたら、あなたの手にはくせがある
// 2. 記憶の長い方が勝つ？ ↑↓ ←→ で A と B の記憶を変えて、勝率を比べよう
// 3. 予測器どうしだと、手の列のエントロピーはどこへ行く？「読まれないこと」が最善になる理由は？
// 4. FORGET を 1（忘れない）にすると、ふるまいはどう変わる？
// 5. 「観察する人も観察される系の中にいる」例を身のまわりで探そう（テスト対策、流行、株価…）


// ==================================================
// ここから下は「サイバネティクスの道具」（中身は読まなくても OK。消さないでね）
// ==================================================
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
function fin(v, d) { return Number.isFinite(v) ? v : d; }        // NaN・Infinity なら d にもどす
// 決まった種（seed）から毎回同じ乱数列（0〜1）を出す。自己テストをいつも同じにするため
function makeRng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ---- 画面の道具（色は [色相, 彩度, 明るさ] の配列）
const C_TXT = [40, 12, 96], C_SUB = [35, 18, 72], C_SCOPE = [135, 70, 92], C_TUBE = [24, 85, 100], C_BRASS = [42, 55, 88], C_ALARM = [0, 80, 100];
function col(c, a) { return color(c[0], c[1], c[2], a === undefined ? 100 : a); }
function say(s, x, y, size, c) { noStroke(); fill(col(c || C_TXT)); textSize(size || 15); text(s, x, y); }
// オシロスコープ風の枠
function plotFrame(x, y, w, h, title) {
  noStroke(); fill(130, 40, 6, 90); rect(x, y, w, h, 6);
  stroke(130, 40, 40, 40); strokeWeight(1);
  for (let k = 1; k < 4; k++) line(x, y + (h * k) / 4, x + w, y + (h * k) / 4);
  noFill(); stroke(C_BRASS[0], C_BRASS[1], 60); rect(x, y, w, h, 6);
  if (title) say(title, x + 8, y + 18, 13, C_SUB);
}
// arr の値を lo〜hi の範囲で、枠 (x, y, w, h) に折れ線で描く（n = 横に並べる点の数）
function plotLine(arr, x, y, w, h, lo, hi, c, n, wt) {
  if (!arr || arr.length < 2) return;
  n = n || arr.length;
  stroke(col(c)); strokeWeight(wt || 2); noFill();
  beginShape();
  for (let i = 0; i < arr.length; i++) vertex(x + (i / (n - 1)) * w, y + h - clampv((fin(arr[i], lo) - lo) / (hi - lo), 0, 1) * h);
  endShape();
}
function hLine(v, x, y, w, h, lo, hi, c) {   // グラフの中の水平線（目標値など）
  let yy = y + h - clampv((v - lo) / (hi - lo), 0, 1) * h;
  stroke(col(c, 70)); strokeWeight(1); drawingContext.setLineDash([6, 5]); line(x, yy, x + w, yy); drawingContext.setLineDash([]);
}
// ブロック図の箱（名前と今の値）
function blockBox(x, y, w, h, name, val, c) {
  stroke(col(c || C_BRASS)); strokeWeight(2); fill(25, 40, 16); rect(x, y, w, h, 8);
  noStroke(); fill(col(C_TXT)); textAlign(CENTER, CENTER); textSize(15); text(name, x + w / 2, y + h / 2 - (val === undefined ? 0 : 10));
  if (val !== undefined) { fill(col(c || C_TUBE)); textSize(14); text(val, x + w / 2, y + h / 2 + 12); }
  textAlign(LEFT, BASELINE);
}
// 信号の矢印：点が流れて「ループを回る」ようすを見せる（phase = 0〜1）
function flowArrow(x1, y1, x2, y2, c, phase, label) {
  stroke(col(c)); strokeWeight(2); line(x1, y1, x2, y2);
  let a = Math.atan2(y2 - y1, x2 - x1);
  noStroke(); fill(col(c)); triangle(x2, y2, x2 - 11 * Math.cos(a - 0.4), y2 - 11 * Math.sin(a - 0.4), x2 - 11 * Math.cos(a + 0.4), y2 - 11 * Math.sin(a + 0.4));
  for (let k = 0; k < 3; k++) { let f = (phase + k / 3) % 1; circle(x1 + (x2 - x1) * f, y1 + (y2 - y1) * f, 6); }
  if (label) { fill(col(C_SUB)); textSize(13); text(label, (x1 + x2) / 2 + 6, (y1 + y2) / 2 - 6); }
}

// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return Number.isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest() { say(selfTestLine(), 20, height - 16, 14, selfTestResults.every((r) => r.ok) ? C_SCOPE : C_ALARM); }
