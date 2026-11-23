// ============================================
// 01 半環のルール ─ ⊕ と ⊗ は、ふつうの + と × と同じルールをどこまで守る？
// 交換・結合・分配法則、ゼロ（⊕ の単位元）といち（⊗ の単位元）は 4 つとも成り立つ → 「半環」
//   でも (max, +) には ⊕ の逆元がない（a ⊕ x = ε となる x がない ＝ 引き算ができない）。そのかわり a ⊕ a = a（冪等）
//   表は各ルールを 300 組のランダムな数（ε や ±∞ も入れて）で確かめた結果
// 1〜4 半環を選ぶ / ← → a・b・c を選ぶ / ↑↓ その値を変える / E その値を「ゼロ」に / スペース 別の乱数で表を作り直す
// ============================================

const SEMIRINGS = [                    // ★ 4 つの半環：⊕、⊗、ゼロ、いち
  { name: '(+, ×) ふつう', add: (a, b) => a + b, mul: (a, b) => a * b, zero: 0, one: 1, idem: false },
  { name: '(max, +)', add: mpAdd, mul: mpMul, zero: -Infinity, one: 0, idem: true },
  { name: '(min, +)', add: (a, b) => (a <= b ? a : b), mul: (a, b) => (a === Infinity || b === Infinity ? Infinity : a + b), zero: Infinity, one: 0, idem: true },
  { name: '(max, min)', add: (a, b) => (a >= b ? a : b), mul: (a, b) => (a <= b ? a : b), zero: -Infinity, one: Infinity, idem: true },
];
const LAWS = [                         // ★ 確かめるルール（sr = 半環、a, b, c = 数）
  { name: '⊕ の交換法則　a ⊕ b = b ⊕ a', f: (s, a, b) => [s.add(a, b), s.add(b, a)] },
  { name: '⊕ の結合法則　(a ⊕ b) ⊕ c = a ⊕ (b ⊕ c)', f: (s, a, b, c) => [s.add(s.add(a, b), c), s.add(a, s.add(b, c))] },
  { name: '⊗ の交換法則　a ⊗ b = b ⊗ a', f: (s, a, b) => [s.mul(a, b), s.mul(b, a)] },
  { name: '⊗ の結合法則　(a ⊗ b) ⊗ c = a ⊗ (b ⊗ c)', f: (s, a, b, c) => [s.mul(s.mul(a, b), c), s.mul(a, s.mul(b, c))] },
  { name: '分配法則　a ⊗ (b ⊕ c) = a⊗b ⊕ a⊗c', f: (s, a, b, c) => [s.mul(a, s.add(b, c)), s.add(s.mul(a, b), s.mul(a, c))] },
  { name: 'ゼロ　a ⊕ ゼロ = a', f: (s, a) => [s.add(a, s.zero), a] },
  { name: 'ゼロは吸収　a ⊗ ゼロ = ゼロ', f: (s, a) => [s.mul(a, s.zero), s.zero] },
  { name: 'いち　a ⊗ いち = a', f: (s, a) => [s.mul(a, s.one), a] },
  { name: '冪等　a ⊕ a = a', f: (s, a) => [s.add(a, a), a] },
  { name: '⊕ の逆元（引き算）a ⊕ x = ゼロ の x がある', f: (s, a) => [hasAddInverse(s, a), true] },
  { name: '⊗ の逆元（割り算）a ⊗ x = いち（a ≠ ゼロ）', f: (s, a) => [a === s.zero || hasMulInverse(s, a), true] },
];
let cur = 1, vals = [3, 5, -Infinity], sel = 0, table = [], tableSeed = 1;

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); selfTest(); buildTable(); }

// 引き算：候補 x を順に試す（ふつうなら x = −a。max・min は x を何にしても a ⊕ x ≥ a なのでゼロにならない）
function hasAddInverse(s, a) { return [-a, s.zero, s.one, 0, -1e9, 1e9, NEG_INF, Infinity].some((x) => s.add(a, x) === s.zero); }
function hasMulInverse(s, a) { return [-a, 1 / a, s.one, s.zero].some((x) => { let v = s.mul(a, x); return v === s.one || (isFinite(v) && Math.abs(v - s.one) < 1e-12); }); }
function sample(s) {                   // 整数（小数の誤差を避ける）とゼロ・いち
  let u = rnd();
  if (u < 0.12) return s.zero; if (u < 0.2) return s.one;
  return rndInt(-9, 9);
}
function lawHolds(s, law, a, b, c) { let [p, q] = law.f(s, a, b, c); return p === q; }
function buildTable() {
  seedRng(tableSeed); table = SEMIRINGS.map((s) => LAWS.map(() => 0));
  for (let si = 0; si < SEMIRINGS.length; si++) for (let t = 0; t < 300; t++) {
    let s = SEMIRINGS[si], a = sample(s), b = sample(s), c = sample(s);
    LAWS.forEach((law, li) => { if (lawHolds(s, law, a, b, c)) table[si][li]++; });
  }
}
function fmtS(s, v) { return v === s.zero && s.zero !== 0 ? 'ゼロ(' + mpFmt(v) + ')' : v === Infinity ? '+∞' : mpFmt(v, 0); }

function draw() {
  background(22, 22, 28);
  let x0 = 40, y0 = 104, cw = Math.min(190, (width - 520) / 4), rh = 28;
  textAlign(LEFT, BASELINE); noStroke(); fill(240); textSize(20);
  text('半環のルール　いまの半環：' + SEMIRINGS[cur].name + '　ゼロ = ' + mpFmt(SEMIRINGS[cur].zero) + '、いち = ' + mpFmt(SEMIRINGS[cur].one), x0, 40);
  fill(170); textSize(15); text('1〜4 半環　← → a・b・c を選ぶ　↑↓ 値　E ゼロにする　スペース 別の乱数で表を作り直す（いまの種 ' + tableSeed + '）', x0, 66);
  // ---- 表
  textSize(15); fill(200);
  SEMIRINGS.forEach((s, si) => { fill(si === cur ? color(255, 200, 90) : 200); text(s.name, x0 + 470 + si * cw, y0); });
  LAWS.forEach((law, li) => {
    let y = y0 + 30 + li * rh;
    fill(li % 2 ? 30 : 36); rect(x0 - 8, y - 20, 470 + 4 * cw, rh);
    fill(220); text(law.name, x0, y);
    SEMIRINGS.forEach((s, si) => {
      let n = table[si][li], all = n === 300;
      fill(all ? color(120, 210, 150) : n === 0 ? color(255, 120, 100) : color(255, 200, 90));
      text((all ? '✓ ' : '✗ ') + n + ' / 300', x0 + 470 + si * cw, y);
    });
  });
  // ---- いまの a, b, c で 1 つずつ計算
  let s = SEMIRINGS[cur], [a, b, c] = vals, yy = y0 + 60 + LAWS.length * rh;
  fill(240); textSize(18);
  text('いまの数：' + ['a', 'b', 'c'].map((nm, i) => (i === sel ? '▶' : '') + nm + ' = ' + fmtS(s, vals[i])).join('　　'), x0, yy);
  textSize(15);
  LAWS.slice(0, 9).forEach((law, li) => {
    let [p, q] = law.f(s, a, b, c), ok = p === q, col = li < 5 ? 0 : 1, row = li < 5 ? li : li - 5;
    fill(ok ? color(160, 220, 180) : color(255, 140, 120));
    text(law.name.split('　')[0] + '：' + fmtS(s, p) + (ok ? ' = ' : ' ≠ ') + fmtS(s, q), x0 + col * 560, yy + 28 + row * 22);
  });
  fill(255, 220, 120); textSize(16);
  text(s.idem ? '冪等な半環では a ⊕ x ≥ a（max）なので、a ⊕ x = ゼロ にはならない → 引き算ができない。「足すと戻せない」= 待ち時間は取り消せない'
    : 'ふつうの数には引き算（−a）がある。でも冪等ではない：' + a + ' + ' + a + ' = ' + (a + a), x0, yy + 28 + 5 * 22 + 14);
  drawSelfTest(width - 170, height - 12);
}

function keyPressed() {
  for (let k = 1; k <= 4; k++) if (key === String(k)) cur = k - 1;
  if (key === LEFT_ARROW) sel = (sel + 2) % 3;
  if (key === RIGHT_ARROW) sel = (sel + 1) % 3;
  let v = vals[sel], s = SEMIRINGS[cur];
  if (key === UP_ARROW) vals[sel] = isFinite(v) ? Math.min(9, v + 1) : 0;
  if (key === DOWN_ARROW) vals[sel] = isFinite(v) ? Math.max(-9, v - 1) : 0;
  if (key === 'e' || key === 'E') vals[sel] = s.zero;
  if (key === ' ') { tableSeed++; buildTable(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let count = (si, li, seed) => { seedRng(seed); let s = SEMIRINGS[si], n = 0; for (let t = 0; t < 500; t++) if (lawHolds(s, LAWS[li], sample(s), sample(s), sample(s))) n++; return n; };
  let first9 = (si) => [0, 1, 2, 3, 4, 5, 6, 7, 8].every((li) => count(si, li, 7 + li) === 500);
  check('(max, +)：交換・結合・分配・ゼロ・吸収・いち・冪等が 500 組すべてで成り立つ（ε 入り）', first9(1));
  check('(min, +) と (max, min) も同じ 9 つのルールが成り立つ（+∞ 入り）', first9(2) && first9(3));
  check('(+, ×) は冪等でない（a + a ≠ a の組がある）が、ほかの 8 つは成り立つ', count(0, 8, 3) < 500 && [0, 1, 2, 3, 4, 5, 6, 7].every((li) => count(0, li, 11) === 500));
  check('(max, +) には ⊕ の逆元がない：a ≠ ε なら a ⊕ x = ε となる x はない', [-9, -1, 0, 4, 9].every((a) => !hasAddInverse(SEMIRINGS[1], a)) && hasAddInverse(SEMIRINGS[0], 4));
  check('(max, +) は割り算ができる（半体）：a ⊗ (−a) = e = 0', [-9, -1, 0, 4, 9].every((a) => mpMul(a, -a) === 0));
  let ok = true; for (let s of SEMIRINGS) for (let a of [s.zero, s.one, -3, 5]) for (let b of [s.zero, s.one, 2]) if (!noNaN([s.add(a, b), s.mul(a, b)])) ok = false;
  check('どの半環でもゼロ・いち・数の組み合わせで NaN が出ない', ok);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 2 を押して (max, +) にし、a = 3, b = 3 で冪等 a ⊕ a = a を確かめよう。1 のふつうの数ではどうなる？
// 2. E で a をゼロ（ε）にして、「ゼロは吸収」a ⊗ ε = ε を確かめよう。待ち合わせで言うと？
// 3. (max, min) の「いち」は +∞。a ⊗ +∞ = min(a, +∞) = a になるのはなぜ？（道の「太さ」の計算に使う）
// 4. 引き算がないのに、なぜ方程式が解ける？ → 05 の「残余」（いちばん大きい劣解）
// 5. LAWS に「a ⊕ (b ⊗ c) = (a ⊕ b) ⊗ (a ⊕ c)」を足してみよう。どの半環で成り立つ？

// ==================================================
// ここから下は「マックスプラスの道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- マックスプラスの数：ε = −∞（「ゼロ」= 起きない・制約なし）、e = 0（「いち」= 待ち時間なし）
const NEG_INF = -Infinity;
function mpAdd(a, b) { return a >= b ? a : b; }                                   // a ⊕ b = max(a, b)
function mpMul(a, b) { return a === NEG_INF || b === NEG_INF ? NEG_INF : a + b; }  // a ⊗ b = a + b（ε があれば ε。−∞ + ∞ を作らない）
function mpFmt(v, d) {                                                             // ε を「ε」と表示（−Infinity を見せない）
  if (v === NEG_INF) return 'ε';
  if (v === Infinity) return '+∞';
  if (typeof v !== 'number' || v !== v) return '?';
  let s = (+v.toFixed(d === undefined ? 1 : d)).toString();
  return s === '-0' ? '0' : s;
}
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
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) ? v.every(noNaN) : !(typeof v === 'number' && v !== v); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(120, 210, 150) : color(255, 90, 90)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
