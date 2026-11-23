// ============================================
// 03 上限と下限の計算 ─ 「最小上界」がいつもあるとは限らない
// 2 点 a, b の上界 = 両方より上の元。その中に最小のものがあれば上限 a ∨ b（なければ上限なし）。下限 a ∧ b も同じ
// どの 2 点にも上限と下限があるとき「束」。束は代数としても見られる：交換・結合・吸収・冪等の 4 つの法則
// ← → 図を変える（束と束でないもの 6 種類）/ 要素を 2 つクリック / スペース 選択を消す
// ============================================

let gi = 0, lat, sel = [], laws = null;
const GALLERY = [                      // ★ [名前, 要素の名前, 被覆 [下, 上] の組]
  ['12 の約数', ['1', '2', '3', '4', '6', '12'], [[0, 1], [0, 2], [1, 3], [1, 4], [2, 4], [3, 5], [4, 5]]],
  ['N5（五角形）', ['0', 'a', 'b', 'c', '1'], [[0, 1], [1, 2], [2, 4], [0, 3], [3, 4]]],
  ['M3（ダイヤモンド）', ['0', 'a', 'b', 'c', '1'], [[0, 1], [0, 2], [0, 3], [1, 4], [2, 4], [3, 4]]],
  ['ちょうネクタイ（束でない）', ['0', 'a', 'b', 'c', 'd', '1'], [[0, 1], [0, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 5], [4, 5]]],
  ['上がない V 字（束でない）', ['0', 'a', 'b', 'c'], [[0, 1], [0, 2], [1, 3]]],
  ['2 × 3 の格子', ['00', '10', '01', '11', '02', '12'], [[0, 1], [0, 2], [1, 3], [2, 3], [2, 4], [3, 5], [4, 5]]],
];

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); rebuild(); }

function galleryPoset(g) { return fromCovers(g[1], g[2]); }   // 被覆の組から順序の表（閉包）を作る
function minimalOf(lat, Sx) { return Sx.filter((x) => !Sx.some((y) => y !== x && lat.R[y][x])); }   // 極小元（下にほかがない）
function maximalOf(lat, Sx) { return Sx.filter((x) => !Sx.some((y) => y !== x && lat.R[x][y])); }
function lawCheck(lat) {                 // 束の 4 つの法則を全部の組（3 つ組）で確かめる
  let n = lat.n, J = (a, b) => joinOf(lat, a, b), M = (a, b) => meetOf(lat, a, b), c = { comm: true, assoc: true, absorb: true, idem: true, order: true };
  for (let a = 0; a < n; a++) {
    if (J(a, a) !== a || M(a, a) !== a) c.idem = false;
    for (let b = 0; b < n; b++) {
      if (J(a, b) !== J(b, a) || M(a, b) !== M(b, a)) c.comm = false;
      if (J(a, M(a, b)) !== a || M(a, J(a, b)) !== a) c.absorb = false;
      if ((lat.R[a][b] === 1) !== (M(a, b) === a) || (lat.R[a][b] === 1) !== (J(a, b) === b)) c.order = false;
      for (let d = 0; d < n; d++) if (J(J(a, b), d) !== J(a, J(b, d)) || M(M(a, b), d) !== M(a, M(b, d))) c.assoc = false;
    }
  }
  return c;
}
function rebuild() {
  lat = galleryPoset(GALLERY[gi]); sel = [];
  layoutHasse(lat, 160, 180, width * 0.5 - 160, height - 320);
  laws = isLattice(lat) ? lawCheck(lat) : null;
}

function draw() {
  background(18, 20, 44);
  let two = sel.length === 2, up = two ? upperOf(lat, sel[0], sel[1]) : [], lo = two ? lowerOf(lat, sel[0], sel[1]) : [];
  let mu = minimalOf(lat, up), ml = maximalOf(lat, lo), jn = two ? joinOf(lat, sel[0], sel[1]) : -1, mt = two ? meetOf(lat, sel[0], sel[1]) : -1;
  drawHasse(lat, { rad: 24, fs: 16, col: (i) => (sel.includes(i) ? [255, 255, 255] : i === jn ? [90, 225, 215] : i === mt ? [255, 190, 90] : mu.includes(i) || ml.includes(i) ? [255, 110, 130] : up.includes(i) ? [150, 205, 210] : lo.includes(i) ? [225, 195, 150] : [150, 160, 205]) });
  // ---- 右：上界・下界の計算
  let px = width * 0.56, y = 170, nm = (Sx) => (Sx.length ? '{' + Sx.map((i) => lat.lab[i]).join(', ') + '}' : '∅（ない）');
  noStroke(); fill(230); textSize(18); text(GALLERY[gi][0] + '　→　' + (isLattice(lat) ? '束（どの 2 点にも上限と下限がある）' : '束ではない'), px, y);
  textSize(16); y += 44;
  if (two) {
    let a = lat.lab[sel[0]], b = lat.lab[sel[1]];
    fill(255); text('a = ' + a + '、b = ' + b, px, y);
    fill(150, 205, 210); text('上界（a と b の両方以上）：' + nm(up), px, y + 32);
    fill(255, 130, 150); text('その中の極小元：' + nm(mu), px, y + 58);
    fill(90, 225, 215); text(jn >= 0 ? '上限 a ∨ b = ' + lat.lab[jn] + '（極小元がちょうど 1 つ = 最小元）' : mu.length > 1 ? '上限なし：極小元が ' + mu.length + ' つあり、最小がない' : '上限なし：上界がひとつもない', px, y + 84);
    fill(225, 195, 150); text('下界（a と b の両方以下）：' + nm(lo), px, y + 124);
    fill(255, 130, 150); text('その中の極大元：' + nm(ml), px, y + 150);
    fill(255, 190, 90); text(mt >= 0 ? '下限 a ∧ b = ' + lat.lab[mt] : ml.length > 1 ? '下限なし：極大元が ' + ml.length + ' つ' : '下限なし：下界がない', px, y + 176);
  } else { fill(175); text('要素を 2 つクリック', px, y); }
  y += 230;
  fill(230); textSize(17); text('束の 2 つの見方：順序（≤）と代数（∨, ∧ の計算）', px, y);
  textSize(15);
  if (laws) {
    let L = [['交換律　a ∨ b = b ∨ a、a ∧ b = b ∧ a', laws.comm], ['結合律　(a ∨ b) ∨ c = a ∨ (b ∨ c)', laws.assoc], ['吸収律　a ∨ (a ∧ b) = a、a ∧ (a ∨ b) = a', laws.absorb], ['冪等律　a ∨ a = a、a ∧ a = a', laws.idem], ['順序にもどる　a ≤ b ⇔ a ∧ b = a ⇔ a ∨ b = b', laws.order]];
    L.forEach(([s, ok], k) => { fill(ok ? [140, 225, 180] : [255, 110, 110]); text((ok ? '✓ ' : '✗ ') + s, px, y + 30 + 26 * k); });
    fill(150, 156, 190); textSize(13); text('すべての a, b, c の組（' + lat.n + '³ = ' + lat.n ** 3 + ' 通り）で確かめた', px, y + 170);
  } else { fill(255, 150, 150); text('上限がない組があるので ∨ が計算できない → 代数の法則は考えられない', px, y + 30); }
  fill(240); textSize(18); text('上限と下限の計算　' + (gi + 1) + ' / ' + GALLERY.length + '：' + GALLERY[gi][0], 20, 36);
  fill(175); textSize(15); text('← → 図を変える　クリック 2 つ選ぶ　スペース 選択を消す　（白 = 選んだ 2 点、水色 = 上限、橙 = 下限、赤 = 極小・極大の候補）', 20, 62);
  drawSelfTest(width - 180, height - 12);
}

function mousePressed() { let i = nodeAt(lat, mouseX, mouseY, 28); if (i < 0) return; if (sel.length >= 2) sel = []; if (!sel.includes(i)) sel.push(i); }
function keyPressed() {
  if (key === RIGHT_ARROW) { gi = (gi + 1) % GALLERY.length; rebuild(); }
  if (key === LEFT_ARROW) { gi = (gi + GALLERY.length - 1) % GALLERY.length; rebuild(); }
  if (key === ' ') sel = [];
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let G = GALLERY.map(galleryPoset), bow = G[3], vv = G[4];
  check('ちょうネクタイ：a, b の上界は {c, d, 1}、極小元が c と d の 2 つ → 上限なし、束ではない', upperOf(bow, 1, 2).join() === '3,4,5' && minimalOf(bow, upperOf(bow, 1, 2)).length === 2 && joinOf(bow, 1, 2) === -1 && !isLattice(bow));
  check('V 字：b と c には上界がひとつもない → 束ではない', upperOf(vv, 2, 3).length === 0 && !isLattice(vv));
  check('12 の約数・N5・M3・2 × 3 の格子は束', [0, 1, 2, 5].every((k) => isLattice(G[k])));
  let uniq = [0, 1, 2, 5].every((k) => { let Q = G[k]; for (let a = 0; a < Q.n; a++) for (let b = 0; b < Q.n; b++) { let U = upperOf(Q, a, b); if (U.filter((x) => U.every((y) => Q.R[x][y])).length !== 1) return false; } return true; });
  check('束ではどの組も、上界の中の最小元がちょうど 1 つ（上限は一意）', uniq);
  check('束 4 つのすべての 3 つ組で 交換・結合・吸収・冪等律、a ≤ b ⇔ a ∧ b = a', [0, 1, 2, 5].every((k) => Object.values(lawCheck(G[k])).every((v) => v)));
  seedRng(3); let cnt = 0, nl = 0;
  for (let t = 0; t < 60; t++) {
    let Q = randomPoset(3 + (t % 6), 0.5), byMin = true;
    for (let a = 0; a < Q.n; a++) for (let b = 0; b < Q.n; b++) if (minimalOf(Q, upperOf(Q, a, b)).length !== 1 || maximalOf(Q, lowerOf(Q, a, b)).length !== 1) byMin = false;
    if (isLattice(Q) === byMin) cnt++; if (byMin) nl++;
  }
  check('ランダムな半順序 60 個：「束」の判定 = どの組も上界の極小元・下界の極大元が 1 つずつ（' + nl + ' 個が束）', cnt === 60 && nl > 0 && nl < 60);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. ちょうネクタイで a と b を選ぶ。上界は 3 つあるのに上限がないのはなぜ？
// 2. V 字に 1 つ要素を足して束にするには、どこに足せばいい？（GALLERY に書き足してみよう）
// 3. N5 で a と c を選ぶ。上限・下限はどこ？ a と b では？
// 4. 束なら 4 つの法則が全部 ✓。どれか 1 つが ✗ になる図は作れる？
// 5. 2 × 3 の格子の上限は「成分ごとの max」。01 の約数の束と同じしくみ


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
