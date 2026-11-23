// ============================================
// 11 鎖と反鎖 ─ 最長の鎖と最大の反鎖を計算して色づけ
// 鎖 = どの 2 つも比べられる部分（一列に並ぶ）、反鎖 = どの 2 つも比べられない部分（横に並ぶ）
// ミルスキーの定理：最長の鎖の長さ h = 反鎖に分けるときの最小の個数（ランクの段ごとに分ければちょうど h 個）
// ← → 半順序を変える / G 新しいランダムな半順序 / C 最長の鎖 / A 最大の反鎖 / L 段（反鎖への分割）の色 / 要素にマウス → 比べられる元
// ============================================

const KINDS = ['ランダムな半順序（G）', '部分集合 {a,b,c,d}', '60 の約数', '72 の約数', '120 の約数', '180 の約数'];
let ki = 0, lat, chainL = [], anti = [], seedN = 11, showC = true, showA = true, showL = true;

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); rebuild(); }

function posetOf(k) {
  if (k === 0) { seedRng(seedN); let Q = randomPoset(10 + Math.floor(rnd() * 7), 0.22); Q.lab = Q.lab.map((s, i) => 'abcdefghijklmnopq'[i]); return Q; }
  return k === 1 ? powersetPoset(4) : divisorPoset([0, 0, 60, 72, 120, 180][k]);
}
function longestChain(lat) {             // ランク（下からの最長の鎖）が最大の元から、ランクが 1 ずつ下がる被覆をたどる
  let h = Math.max(...lat.rk), x = lat.rk.indexOf(h), ch = [x];
  while (lat.rk[x] > 0) { x = lat.cov.find(([a, b]) => b === x && lat.rk[a] === lat.rk[x] - 1)[0]; ch.push(x); }
  return ch.reverse();
}
function maxAntichain(lat) {             // 比べられない元の最大の集まり（分枝限定法：v を入れる／入れない）
  let n = lat.n, comp = allOf(lat).map((i) => allOf(lat).reduce((m, j) => (lat.R[i][j] || lat.R[j][i] ? m | (1 << j) : m), 0)), best = 0, bestSet = 0;
  (function go(cand, cur, k) {
    if (k + popc(cand) <= best) return;
    if (!cand) { best = k; bestSet = cur; return; }
    let v = 31 - Math.clz32(cand & -cand);
    go(cand & ~comp[v], cur | (1 << v), k + 1);     // v を入れる → v と比べられる元は使えない
    go(cand & ~(1 << v), cur, k);                   // v を入れない
  })((1 << n) - 1, 0, 0);
  return allOf(lat).filter((i) => bestSet >> i & 1);
}
function isAntichain(lat, Sx) { return Sx.every((a) => Sx.every((b) => a === b || (!lat.R[a][b] && !lat.R[b][a]))); }
function rebuild() {
  lat = posetOf(ki); layoutHasse(lat, 100, 170, width * 0.55 - 100, height - 300, ki >= 1);
  chainL = longestChain(lat); anti = maxAntichain(lat);
}
const LCOL = [[70, 60, 120], [50, 80, 120], [60, 100, 90], [100, 80, 60], [100, 60, 90], [60, 70, 130], [90, 100, 60], [70, 90, 120]];

function draw() {
  background(18, 20, 44);
  let h = Math.max(...lat.rk) + 1, hov = nodeAt(lat, mouseX, mouseY, 20);
  // ---- 段（ランク）＝ 反鎖への分割（ミルスキー）
  if (showL) for (let r = 0; r < h; r++) { let ys = allOf(lat).filter((i) => lat.rk[i] === r).map((i) => lat.pos[i][1]); noStroke(); fill(...LCOL[r % 8], 120); rect(70, ys[0] - 24, width * 0.55 - 40, 48, 24); fill(200); textSize(13); text('段 ' + (r + 1), 18, ys[0] + 5); }
  let inC = (i) => showC && chainL.includes(i), inA = (i) => showA && anti.includes(i);
  drawHasse(lat, { rad: 18, fs: 12,
    col: (i) => (hov >= 0 && i !== hov && (lat.R[i][hov] || lat.R[hov][i]) ? [200, 200, 255] : inC(i) && inA(i) ? [255, 255, 255] : inC(i) ? [90, 225, 215] : inA(i) ? [255, 190, 90] : [130, 140, 190]),
    ecol: (a, b) => (inC(a) && inC(b) && Math.abs(chainL.indexOf(a) - chainL.indexOf(b)) === 1 ? [90, 225, 215] : null) });
  // ---- 右のパネル
  let px = width * 0.6, y = 160, levels = []; for (let r = 0; r < h; r++) levels.push(allOf(lat).filter((i) => lat.rk[i] === r).length);
  noStroke(); fill(230); textSize(18); text(KINDS[ki] + '　要素 ' + lat.n, px, y);
  textSize(16); fill(90, 225, 215); text('最長の鎖（水色）：長さ ' + chainL.length + '　' + chainL.map((i) => lat.lab[i]).join(' < '), px, y + 40, width - px - 20);
  fill(255, 190, 90); text('最大の反鎖（橙）：大きさ ' + anti.length + '　{' + anti.map((i) => lat.lab[i]).join(', ') + '}', px, y + 96, width - px - 20);
  fill(220); text('段ごとの個数：' + levels.join(', ') + '（' + h + ' 段、どの段も反鎖 ' + (levels.every((c, r) => isAntichain(lat, allOf(lat).filter((i) => lat.rk[i] === r))) ? '✓' : '✗') + '）', px, y + 152);
  textSize(15); fill(200);
  ['ミルスキーの定理：', '　最長の鎖の長さ ' + chainL.length + ' = 反鎖に分ける最小の個数 ' + h + '　' + (chainL.length === h ? '✓' : '✗'),
    '　（鎖と反鎖は 1 個までしか共有しない → h 個より少なく分けられない）', '逆向き（ディルワースの定理、12）：', '　最大の反鎖の大きさ ' + anti.length + ' = 鎖に分ける最小の個数',
    '鎖と反鎖の両方に入る元（白）はちょうど ' + chainL.filter((i) => anti.includes(i)).length + ' 個'].forEach((s, k) => text(s, px, y + 196 + 24 * k));
  fill(240); textSize(18); text('鎖と反鎖　' + (ki + 1) + ' / ' + KINDS.length + '：' + KINDS[ki], 20, 36);
  fill(175); textSize(15); text('← → 半順序　G 新しいランダム　C 鎖 ' + (showC ? 'ON' : 'OFF') + '　A 反鎖 ' + (showA ? 'ON' : 'OFF') + '　L 段 ' + (showL ? 'ON' : 'OFF') + '　マウスをのせる → 比べられる元（うす紫）', 20, 62);
  drawSelfTest(width - 180, height - 12);
}

function keyPressed() {
  if (key === RIGHT_ARROW) { ki = (ki + 1) % KINDS.length; rebuild(); }
  if (key === LEFT_ARROW) { ki = (ki + KINDS.length - 1) % KINDS.length; rebuild(); }
  if (key === 'g' || key === 'G') { ki = 0; seedN++; rebuild(); }
  if (key === 'c' || key === 'C') showC = !showC;
  if (key === 'a' || key === 'A') showA = !showA;
  if (key === 'l' || key === 'L') showL = !showL;
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let okM = true, okW = true, okC = true;
  seedRng(111);
  for (let t = 0; t < 40; t++) {
    let Q = randomPoset(5 + Math.floor(rnd() * 8), 0.3), ch = longestChain(Q), h = Math.max(...Q.rk) + 1;
    let bc = 0; for (let s = 0; s < Q.n; s++) (function dfs(x, len) { bc = Math.max(bc, len); for (let y = 0; y < Q.n; y++) if (y !== x && Q.R[x][y]) dfs(y, len + 1); })(s, 1);   // 確かめ用：全部の鎖を深さ優先でたどる
    if (ch.length !== bc || h !== bc || !ch.every((a, k) => k === 0 || Q.R[ch[k - 1]][a])) okC = false;
    for (let r = 0; r < h; r++) if (!isAntichain(Q, allOf(Q).filter((i) => Q.rk[i] === r))) okM = false;
    let A = maxAntichain(Q), bw = 0; for (let s = 0; s < 1 << Q.n; s++) { let Sx = allOf(Q).filter((i) => s >> i & 1); if (Sx.length > bw && isAntichain(Q, Sx)) bw = Sx.length; }   // 全部の部分集合を調べる
    if (!isAntichain(Q, A) || A.length !== bw) okW = false;
  }
  check('ランダムな半順序 40 個：求めた最長の鎖 = 全部の鎖をたどった最長', okC);
  check('ミルスキー：ランクの段はどれも反鎖で、段の数 = 最長の鎖の長さ', okM);
  check('分枝限定法の最大反鎖 = 全部の部分集合（最大 2^12 個）を調べた最大', okW);
  let B = powersetPoset(4), D = divisorPoset(60);
  check('部分集合の束 {a,b,c,d}：最長の鎖 5、最大の反鎖 6 = C(4, 2)', longestChain(B).length === 5 && maxAntichain(B).length === 6);
  check('60 の約数：最長の鎖 5（1 < 2 < 4 < 12 < 60 など）、最大の反鎖 4（段の個数 1,3,4,3,1）', longestChain(D).length === 5 && maxAntichain(D).length === 4);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. G を何回か押す。最長の鎖と最大の反鎖が共有する元（白）はいつも 1 個以下？ なぜ？
// 2. 段（ランク）ごとに分けると反鎖になる。いちばん少ない段の数は最長の鎖の長さ（ミルスキー）
// 3. 120 の約数で、最大の反鎖はどの段？ 真ん中の段がいちばん大きい？
// 4. 要素にマウスをのせると、比べられる元がうす紫に。比べられない元だけを集めると反鎖
// 5. 1 日の予定（00）で、同時にできる作業の最大数 = 最大の反鎖


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
