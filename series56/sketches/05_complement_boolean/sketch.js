// ============================================
// 05 補元とブール代数 ─ a ∧ b = ⊥ かつ a ∨ b = ⊤ となる b が「a の補元」
// 補元は ない／1 つ／いくつも ある。分配束では補元は多くても 1 つ。どの元にも補元がある分配束 = ブール代数
// ブール代数は 原子（⊥ のすぐ上）の集合の部分集合の束と同じ形 → 要素の数はいつも 2^k。約数の束は n に平方因子がないときブール代数
// ← → 束を変える / ↑↓ 約数の束の n / 要素をクリック → その補元 / スペース 選択を消す
// ============================================

const DIV_NS = [6, 12, 30, 36, 60, 105, 210];   // ★ 約数の束で選べる n
let gi = 0, di = 2, lat, info, sel = -1;
const KINDS = ['約数の束', '部分集合 {a,b,c,d}', 'N5', 'M3', '鎖（4 個）', '2 × 3 の格子'];

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); rebuild(); }

function latticeOf(k) {
  if (k === 0) return divisorPoset(DIV_NS[di]);
  if (k === 1) return powersetPoset(4);
  if (k === 2) return fromCovers(['0', 'a', 'b', 'c', '1'], [[0, 1], [1, 2], [2, 4], [0, 3], [3, 4]]);
  if (k === 3) return fromCovers(['0', 'x', 'y', 'z', '1'], [[0, 1], [0, 2], [0, 3], [1, 4], [2, 4], [3, 4]]);
  if (k === 4) return fromCovers(['0', '1', '2', '3'], [[0, 1], [1, 2], [2, 3]]);
  return fromCovers(['00', '10', '01', '11', '02', '12'], [[0, 1], [0, 2], [1, 3], [2, 3], [2, 4], [3, 5], [4, 5]]);
}
// 補元・分配・ブール代数かどうか
function analyze(lat) {
  tables(lat); let bt = botOf(lat), tp = topOf(lat), n = lat.n, r = { comp: [], dist: true, atoms: [] };
  for (let a = 0; a < n; a++) { let c = []; for (let b = 0; b < n; b++) if (lat.M[a][b] === bt && lat.J[a][b] === tp) c.push(b); r.comp.push(c); }
  for (let x = 0; x < n && r.dist; x++) for (let y = 0; y < n; y++) for (let z = 0; z < n; z++) if (lat.M[x][lat.J[y][z]] !== lat.J[lat.M[x][y]][lat.M[x][z]]) { r.dist = false; break; }
  r.complemented = r.comp.every((c) => c.length > 0); r.unique = r.comp.every((c) => c.length <= 1);
  r.boolean = r.complemented && r.dist;
  r.atoms = lat.cov.filter(([a, b]) => a === bt).map(([a, b]) => b);
  // 原子の集合への写像 x → {x より下の原子}。ブール代数ならこれが部分集合の束への同型
  r.code = allOf(lat).map((x) => r.atoms.reduce((m, at, t) => m | (lat.R[at][x] ? 1 << t : 0), 0));
  r.iso = new Set(r.code).size === lat.n && lat.n === 1 << r.atoms.length && allOf(lat).every((x) => allOf(lat).every((y) => (lat.R[x][y] === 1) === ((r.code[x] & r.code[y]) === r.code[x])));
  return r;
}
function squarefree(n) { return primeFactors(n).every((f) => f[1] === 1); }
function rebuild() { lat = latticeOf(gi); info = analyze(lat); sel = -1; layoutHasse(lat, 110, 170, width * 0.52 - 110, height - 290, gi <= 1); }

function draw() {
  background(18, 20, 44);
  let cs = sel >= 0 ? info.comp[sel] : [];
  drawHasse(lat, { rad: 21, fs: 13, col: (i) => (i === sel ? [255, 255, 255] : cs.includes(i) ? [255, 120, 170] : info.comp[i].length === 0 ? [110, 116, 150] : info.comp[i].length === 1 ? [90, 225, 215] : [255, 190, 90]) });
  // ---- 右のパネル
  let px = width * 0.56, y = 160, yes = (v) => (v ? '✓ はい' : '✗ いいえ');
  noStroke(); fill(230); textSize(18); text(KINDS[gi] + (gi === 0 ? ' n = ' + DIV_NS[di] + ' = ' + primeFactors(DIV_NS[di]).map((f) => f[0] + (f[1] > 1 ? '^' + f[1] : '')).join('·') : '') + '　要素 ' + lat.n, px, y);
  textSize(16);
  let nz = info.comp.filter((c) => c.length === 0).length, n1 = info.comp.filter((c) => c.length === 1).length, nm = lat.n - nz - n1;
  fill(110, 116, 150); text('● 補元がない ' + nz, px, y + 36); fill(90, 225, 215); text('● 補元が 1 つ ' + n1, px + 170, y + 36); fill(255, 190, 90); text('● 補元が 2 つ以上 ' + nm, px + 330, y + 36);
  fill(220);
  text('補元束（どの元にも補元がある）？ ' + yes(info.complemented), px, y + 74);
  text('分配束？ ' + yes(info.dist) + '　補元は一意？ ' + yes(info.unique), px, y + 100);
  fill(info.boolean ? [140, 225, 180] : [255, 140, 150]); textSize(18);
  text('ブール代数（補元束 かつ 分配束）？ ' + yes(info.boolean), px, y + 136);
  textSize(15); fill(200);
  if (info.boolean) { text('原子 ' + info.atoms.length + ' 個：' + info.atoms.map((i) => lat.lab[i]).join(', ') + '　→ 要素 2^' + info.atoms.length + ' = ' + lat.n, px, y + 166);
    text('x → 「x より下の原子の集合」が部分集合の束への同型 ' + (info.iso ? '✓' : '✗'), px, y + 190); }
  if (gi === 0) text('n = ' + DIV_NS[di] + ' は平方因子' + (squarefree(DIV_NS[di]) ? 'なし → ブール代数' : 'あり（p² で割り切れる）→ ブール代数ではない'), px, y + 220);
  if (sel >= 0) { fill(255, 140, 180); textSize(16);
    text(lat.lab[sel] + ' の補元：' + (cs.length ? cs.map((i) => lat.lab[i]).join('、') : 'ない'), px, y + 262);
    for (let k = 0; k < Math.min(3, cs.length); k++) text('　' + lat.lab[sel] + ' ∧ ' + lat.lab[cs[k]] + ' = ' + lat.lab[lat.M[sel][cs[k]]] + '（⊥）、' + lat.lab[sel] + ' ∨ ' + lat.lab[cs[k]] + ' = ' + lat.lab[lat.J[sel][cs[k]]] + '（⊤）', px, y + 290 + 24 * k); }
  else { fill(175); textSize(15); text('要素をクリック → 補元（ピンク）を表示', px, y + 262); }
  fill(240); textSize(18); text('補元とブール代数　' + (gi + 1) + ' / ' + KINDS.length + '：' + KINDS[gi], 20, 36);
  fill(175); textSize(15); text('← → 束を変える　↑↓ 約数の束の n（' + DIV_NS.join(', ') + '）　クリック 補元を見る　スペース 選択を消す', 20, 62);
  drawSelfTest(width - 180, height - 12);
}

function mousePressed() { let i = nodeAt(lat, mouseX, mouseY, 24); sel = i; }
function keyPressed() {
  if (key === RIGHT_ARROW) { gi = (gi + 1) % KINDS.length; rebuild(); }
  if (key === LEFT_ARROW) { gi = (gi + KINDS.length - 1) % KINDS.length; rebuild(); }
  if (key === UP_ARROW) { di = Math.min(DIV_NS.length - 1, di + 1); gi = 0; rebuild(); }
  if (key === DOWN_ARROW) { di = Math.max(0, di - 1); gi = 0; rebuild(); }
  if (key === ' ') sel = -1;
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let ok = true, pow2 = true, cnt = 0;
  for (let n = 2; n <= 100; n++) { let r = analyze(divisorPoset(n)); if (r.boolean !== squarefree(n)) ok = false; if (r.boolean) { cnt++; if (!r.iso || (r.code.length & (r.code.length - 1)) !== 0) pow2 = false; } }
  check('n = 2〜100：約数の束がブール代数 ⇔ n に平方因子がない（' + cnt + ' 個）', ok && cnt === 60);
  check('見つかったブール代数はどれも要素 2^k 個で、原子の部分集合の束と同型', pow2);
  let n5 = analyze(latticeOf(2)), m3 = analyze(latticeOf(3));
  check('N5：補元束だが c の補元は a と b の 2 つ（分配でない）', n5.complemented && n5.comp[3].join() === '1,2' && !n5.dist);
  check('M3：x の補元は y と z の 2 つ', m3.comp[1].join() === '2,3' && !m3.dist);
  check('鎖 0 < 1 < 2 < 3：真ん中の 1, 2 には補元がない', analyze(latticeOf(4)).comp.map((c) => c.length).join() === '1,0,0,1');
  ok = true; for (let n of [12, 36, 60, 72, 360]) { let r = analyze(divisorPoset(n)); if (!r.dist || !r.unique) ok = false; }
  check('分配束（約数の束 12, 36, 60, 72, 360）では補元は多くても 1 つ', ok);
  check('部分集合の束：X の補元 = 補集合 U − X（ビットの反転）', analyze(powersetPoset(4)).comp.every((c, x) => c.length === 1 && c[0] === (15 ^ x)));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. ↑↓ で n = 30 と 60 をくらべよう。60 = 2²·3·5 では、どの約数の補元がない？ なぜ？
// 2. N5 の c をクリック。補元が 2 つあるのは分配律が破れているから（04 を見よう）
// 3. 約数の束で d の補元は n/d？ 平方因子がない n で確かめよう
// 4. 部分集合の束の補元は補集合。ド・モルガンの法則 (X ∪ Y)ᶜ = Xᶜ ∩ Yᶜ も束の言葉で書ける
// 5. ブール代数の要素の数はいつも 2 のべき。要素 6 個のブール代数がないのはなぜ？


// ==================================================
// ここから下は「束論の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 順序集合 P = { n, R, lab, cov, rk, pos }。R[i][j] = 1 は「i ≤ j」（n × n の 0/1 の表）
function makePoset(n, leqFn, labs) {
  let R = [];
  for (let i = 0; i < n; i++) { R.push(new Uint8Array(n)); for (let j = 0; j < n; j++) R[i][j] = i === j || leqFn(i, j) ? 1 : 0; }
  return posetFromRel(R, labs);
}
function posetFromRel(R, labs) { let n = R.length, cov = coversOf(R); return { n, R, cov, rk: ranksOf(n, cov), pos: [], lab: labs || [...Array(n).keys()].map(String) }; }
function fromCovers(labs, cv) { let n = labs.length, R = []; for (let i = 0; i < n; i++) R.push(new Uint8Array(n)); for (let [a, b] of cv) R[a][b] = 1; return posetFromRel(closeRel(R), labs); }   // 被覆の組から
function closeRel(R) {                 // 反射的・推移的閉包（ワーシャル法：k を経由して行けるなら i ≤ j）
  let n = R.length, C = R.map((r) => Uint8Array.from(r));
  for (let i = 0; i < n; i++) C[i][i] = 1;
  for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) if (C[i][k]) for (let j = 0; j < n; j++) if (C[k][j]) C[i][j] = 1;
  return C;
}
function isReflexive(R) { return R.every((r, i) => r[i] === 1); }
function isAntisym(R) { for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) if (R[i][j] && R[j][i]) return false; return true; }
function isTransitive(R) { let n = R.length; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (R[i][j]) for (let k = 0; k < n; k++) if (R[j][k] && !R[i][k]) return false; return true; }
function isPoset(R) { return isReflexive(R) && isAntisym(R) && isTransitive(R); }
function coversOf(R) {                 // 被覆 a ⋖ b：a < b で、間にはさまる c がない（推移的簡約 = ハッセ図の辺）
  let n = R.length, E = [], lt = (a, b) => a !== b && R[a][b] && !R[b][a];
  for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) if (lt(a, b)) {
    let ok = true; for (let c = 0; c < n && ok; c++) if (lt(a, c) && lt(c, b)) ok = false;
    if (ok) E.push([a, b]);
  }
  return E;
}
function ranksOf(n, cov) {             // ランク = 下から c までの最長の鎖の長さ（最大 n 回くり返せば止まる）
  let rk = new Array(n).fill(0);
  for (let t = 0; t <= n; t++) { let ch = false; for (let [a, b] of cov) if (rk[b] < rk[a] + 1 && rk[a] < n) { rk[b] = rk[a] + 1; ch = true; } if (!ch) break; }
  return rk;
}
function allOf(P) { return [...Array(P.n).keys()]; }
function upperOf(P, a, b) { return allOf(P).filter((c) => P.R[a][c] && P.R[b][c]); }   // 上界：a と b の両方より上
function lowerOf(P, a, b) { return allOf(P).filter((c) => P.R[c][a] && P.R[c][b]); }   // 下界
function leastOf(P, Sx) { for (let x of Sx) if (Sx.every((y) => P.R[x][y])) return x; return -1; }      // 最小元（なければ −1）
function greatestOf(P, Sx) { for (let x of Sx) if (Sx.every((y) => P.R[y][x])) return x; return -1; }   // 最大元
function joinOf(P, a, b) { return leastOf(P, upperOf(P, a, b)); }     // 上限 a ∨ b = 最小上界（なければ −1）
function meetOf(P, a, b) { return greatestOf(P, lowerOf(P, a, b)); }  // 下限 a ∧ b = 最大下界
function botOf(P) { return leastOf(P, allOf(P)); }
function topOf(P) { return greatestOf(P, allOf(P)); }
function isLattice(P) { if (P.n === 0) return false; for (let a = 0; a < P.n; a++) for (let b = a + 1; b < P.n; b++) if (joinOf(P, a, b) < 0 || meetOf(P, a, b) < 0) return false; return true; }
function tables(P) {                   // 上限・下限の表（何度も使うので先に計算）
  P.J = []; P.M = [];
  for (let a = 0; a < P.n; a++) { P.J.push(new Int16Array(P.n)); P.M.push(new Int16Array(P.n)); for (let b = 0; b < P.n; b++) { P.J[a][b] = joinOf(P, a, b); P.M[a][b] = meetOf(P, a, b); } }
  return P;
}
// ---- よく使う束：約数の束（割り切る）と部分集合の束（含まれる）
function gcdOf(a, b) { while (b) [a, b] = [b, a % b]; return a; }
function lcmOf(a, b) { return (a / gcdOf(a, b)) * b; }
function divisorsOf(n) { let d = []; for (let k = 1; k <= n; k++) if (n % k === 0) d.push(k); return d; }
function primeFactors(n) { let f = []; for (let p = 2; p * p <= n; p++) if (n % p === 0) { let e = 0; while (n % p === 0) { n /= p; e++; } f.push([p, e]); } if (n > 1) f.push([n, 1]); return f; }
function divisorPoset(n) {
  let D = divisorsOf(n), P = makePoset(D.length, (i, j) => D[j] % D[i] === 0, D.map(String)), ps = primeFactors(n).map((f) => f[0]), dir = [-1, 1, -0.3, 0.55, -0.62];
  P.val = D; P.hint = (i) => ps.reduce((s, p, t) => { let e = 0, v = D[i]; while (v % p === 0) { v /= p; e++; } return s + e * dir[t % 5]; }, 0);
  return P;
}
function popc(m) { let c = 0; while (m) { c += m & 1; m >>= 1; } return c; }
function setName(m, k) { let s = ''; for (let t = 0; t < k; t++) if (m >> t & 1) s += 'abcdefg'[t]; return s || '∅'; }
function powersetPoset(k) {
  let P = makePoset(1 << k, (i, j) => (i & j) === i, [...Array(1 << k).keys()].map((m) => setName(m, k))), dir = [-1, 1, -0.3, 0.55];
  P.val = [...Array(1 << k).keys()]; if (k <= 4) P.hint = (i) => dir.reduce((s, d, t) => s + (i >> t & 1) * d, 0);
  return P;
}
// ---- ハッセ図を描く：高さ = ランク、横 = hint（なければ下の被覆の平均の順）
function layoutHasse(P, x, y, w, h, exact) {
  let mr = Math.max(0, ...P.rk), lv = [], px = new Array(P.n).fill(0.5);
  for (let r = 0; r <= mr; r++) lv.push([]);
  for (let i = 0; i < P.n; i++) lv[P.rk[i]].push(i);
  for (let r = 0; r <= mr; r++) {
    for (let i of lv[r]) { if (P.hint) px[i] = P.hint(i); else { let s = 0, c = 0; for (let [a, b] of P.cov) if (b === i) { s += px[a]; c++; } px[i] = (c ? s / c : 0.5) + i * 1e-6; } }
    lv[r].sort((a, b) => px[a] - px[b]);
    if (!(exact && P.hint)) lv[r].forEach((i, k) => (px[i] = (k + 0.5) / lv[r].length));
  }
  if (exact && P.hint) { let lo = Math.min(...px), hi = Math.max(...px); px = px.map((v) => (hi > lo ? 0.04 + 0.92 * (v - lo) / (hi - lo) : 0.5)); }
  P.pos = []; for (let i = 0; i < P.n; i++) P.pos.push([x + w * px[i], y + h - (mr ? P.rk[i] / mr : 0.5) * h]);
}
function drawHasse(P, o) {             // o = { col(i), ecol(a, b), rad, fs }。色は [r, g, b]
  o = o || {}; let rad = o.rad || 16;
  strokeWeight(2);
  for (let [a, b] of P.cov) { stroke(...((o.ecol && o.ecol(a, b)) || [96, 108, 168])); line(P.pos[a][0], P.pos[a][1], P.pos[b][0], P.pos[b][1]); }
  textAlign(CENTER, CENTER); textSize(o.fs || 13);
  for (let i = 0; i < P.n; i++) {
    stroke(18, 20, 44); strokeWeight(2); fill(...((o.col && o.col(i)) || [226, 232, 248])); circle(P.pos[i][0], P.pos[i][1], 2 * rad);
    noStroke(); fill(18, 20, 44); text(P.lab[i], P.pos[i][0], P.pos[i][1] + 1);
  }
  textAlign(LEFT, BASELINE);
}
function nodeAt(P, mx, my, r) { let best = -1, bd = r || 20; for (let i = 0; i < P.n; i++) { let d = Math.hypot(P.pos[i][0] - mx, P.pos[i][1] - my); if (d < bd) { bd = d; best = i; } } return best; }
// ---- 種つきの乱数（同じ種なら毎回同じ列）
let rngState = 1;
function seedRng(sd) { rngState = (sd >>> 0) || 1; }
function rnd() {                       // 0〜1 の一様乱数（mulberry32）
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function randomPoset(n, p) { let o = []; for (let i = 0; i < n; i++) o.push(i); for (let i = n - 1; i > 0; i--) { let j = Math.floor(rnd() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; }   // ランダムな順番 o で、前 → 後ろに確率 p で辺 → 閉包
  let R = []; for (let i = 0; i < n; i++) R.push(new Uint8Array(n));
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) if (rnd() < p) R[o[a]][o[b]] = 1;
  return posetFromRel(closeRel(R));
}
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let k = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (k === selfTestResults.length ? '✓ ' : '✗ ') + k + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(...(selfTestResults.every((r) => r.ok) ? [120, 220, 170] : [255, 90, 90])); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
