// ============================================
// 10 プログラム解析の束 ─ 「到達する定義」を束の上の不動点反復で求める
// 各ノードの値は 定義 {d1, …, d6} の部分集合（2^6 = 64 個の束、⊥ = ∅）。OUT[n] = gen[n] ∪ (IN[n] − kill[n])、IN[n] = ∪ OUT[前のノード]
// ⊥ から全ノードを順にくり返し更新すると、値は束を上へ上へと上がり、変わらなくなった所が最小不動点（09 のクリーネの反復）
// スペース 1 周 / A 自動 / R ⊥ にもどす / ノードをクリック → そのノードの OUT が束を上っていく道を右に表示
// ============================================

const NODES = [                        // ★ [コード, 定義の番号（なければ −1）, 変数, x, y]
  ['START', -1, '', 0.5, 0], ['d1: i = 0', 0, 'i', 0.5, 1], ['d2: s = 0', 1, 's', 0.5, 2], ['while (i < 10)', -1, '', 0.5, 3],
  ['if (i % 3 == 0)', -1, '', 0.3, 4], ['d3: s = s + i', 2, 's', 0.1, 5], ['d4: s = s − 1', 3, 's', 0.5, 5], ['d5: i = i + 1', 4, 'i', 0.3, 6],
  ['d6: t = s * 2', 5, 't', 0.85, 4], ['print(t)', -1, '', 0.85, 5]];
const EDGES = [[0, 1], [1, 2], [2, 3], [3, 4], [3, 8], [4, 5], [4, 6], [5, 7], [6, 7], [7, 3], [8, 9]];
const ND = 6, VCOL = { i: [90, 225, 215], s: [255, 190, 90], t: [255, 120, 170] };
let IN = [], OUT = [], hist = [], rounds = 0, done = false, auto = true, sel = 6, PS = null, genK = null;

function setup() { createCanvas(windowWidth, windowHeight); genK = genKill(); selfTest(); PS = powersetPoset(ND); PS.lab = PS.lab.map(() => ''); layoutHasse(PS, width * 0.6, 200, width * 0.37, height - 330); resetIt(); }

function genKill() {                   // gen = そのノードの定義、kill = 同じ変数のほかの定義
  return NODES.map(([c, d, v]) => { let kill = 0; NODES.forEach(([c2, d2, v2]) => { if (d >= 0 && d2 >= 0 && v2 === v && d2 !== d) kill |= 1 << d2; }); return { gen: d >= 0 ? 1 << d : 0, kill }; });
}
function preds(n) { return EDGES.filter((e) => e[1] === n).map((e) => e[0]); }
function roundRobin(I, O) {            // 1 周：全ノードを順に更新。変わったら true
  let ch = false;
  for (let n = 0; n < NODES.length; n++) {
    let i = 0; for (let p of preds(n)) i |= O[p];
    let o = genK[n].gen | (i & ~genK[n].kill);
    if (i !== I[n] || o !== O[n]) ch = true; I[n] = i; O[n] = o;
  }
  return ch;
}
function solve(start) { let I = new Array(NODES.length).fill(start), O = new Array(NODES.length).fill(start), k = 0; while (roundRobin(I, O) && k < 100) k++; return { I, O, k }; }
function resetIt() { IN = new Array(NODES.length).fill(0); OUT = new Array(NODES.length).fill(0); hist = [OUT.slice()]; rounds = 0; done = false; }
function stepIt() { if (done) return; let ch = roundRobin(IN, OUT); if (ch) { rounds++; hist.push(OUT.slice()); } else done = true; }
function defName(m) { let s = []; for (let d = 0; d < ND; d++) if (m >> d & 1) s.push('d' + (d + 1)); return s.length ? '{' + s.join(',') + '}' : '∅'; }
function defVar(d) { return NODES.find((nd) => nd[1] === d)[2]; }

function draw() {
  background(18, 20, 44);
  if (auto && frameCount % 50 === 0) stepIt();
  let gx = 30, gw = width * 0.52, gy = 120, gh = (height - 200) / 7, bw = 170, bh = 34, lat = (n) => [gx + NODES[n][3] * (gw - bw), gy + NODES[n][4] * gh];
  // ---- フローグラフ
  for (let [a, b] of EDGES) {
    let [x1, y1] = lat(a), [x2, y2] = lat(b); stroke(110, 120, 180); strokeWeight(2); noFill();
    if (b === 3 && a === 7) { line(x1, y1 + bh / 2, x1 - 50, y1 + bh / 2); line(x1 - 50, y1 + bh / 2, x1 - 50, y2 + bh / 2); line(x1 - 50, y2 + bh / 2, x2, y2 + bh / 2); }   // ループの戻り
    else line(x1 + bw / 2, y1 + bh, x2 + bw / 2, y2);
  }
  for (let n = 0; n < NODES.length; n++) {
    let [x, y] = lat(n); stroke(n === sel ? 255 : 90, n === sel ? 255 : 100, n === sel ? 255 : 160); strokeWeight(n === sel ? 3 : 1); fill(34, 38, 80); rect(x, y, bw, bh, 6);
    noStroke(); fill(235); textSize(14); text(NODES[n][0], x + 8, y + 22);
    for (let d = 0; d < ND; d++) if (OUT[n] >> d & 1) { fill(...VCOL[defVar(d)]); rect(x + 4 + d * 27, y + bh + 3, 24, 15, 3); fill(18, 20, 44); textSize(11); text('d' + (d + 1), x + 9 + d * 27, y + bh + 15); }
  }
  // ---- 右：2^6 の束と、選んだノードの OUT の道
  let path = hist.map((h) => h[sel]);
  stroke(255, 255, 255, 60); strokeWeight(1);
  for (let [a, b] of PS.cov) line(PS.pos[a][0], PS.pos[a][1], PS.pos[b][0], PS.pos[b][1]);
  noStroke(); for (let i = 0; i < PS.n; i++) { fill(path.includes(i) ? [255, 220, 120] : [110, 120, 170]); circle(PS.pos[i][0], PS.pos[i][1], path[path.length - 1] === i ? 16 : 8); }
  stroke(255, 220, 120); strokeWeight(3); for (let k = 1; k < path.length; k++) if (path[k] !== path[k - 1]) line(...PS.pos[path[k - 1]], ...PS.pos[path[k]]);
  noStroke(); fill(220); textSize(15);
  text('束 2^6（定義の集合、64 個）の上で「' + NODES[sel][0] + '」の OUT が上る道', width * 0.6, 150);
  fill(255, 220, 120); text(path.map(defName).filter((s, k) => k === 0 || s !== defName(path[k - 1])).join(' → '), width * 0.6, 174, width * 0.38);
  // ---- 文字
  fill(240); textSize(18); text('プログラム解析の束：到達する定義　' + rounds + ' 周目' + (done ? '　→ 変わらなくなった = 最小不動点（' + rounds + ' 周で収束）' : ''), 20, 36);
  fill(175); textSize(15); text('スペース 1 周　A 自動 ' + (auto ? 'ON' : 'OFF') + '　R ⊥ にもどす　ノードをクリック → 右に束の上の道　（チップ = OUT、色 = 変数 i 水色・s 橙・t ピンク）', 20, 62);
  fill(200); textSize(14); text('「print(t) の前に届く s の定義は？」→ d6 の IN を見る：' + defName(IN[8]) + '　（d2, d3, d4 の 3 つとも届きうる）', 20, 88);
  drawSelfTest(width - 180, height - 12);
}

function mousePressed() {
  let gx = 30, gw = width * 0.52, gy = 120, gh = (height - 200) / 7, bw = 170, bh = 34;
  for (let n = 0; n < NODES.length; n++) { let x = gx + NODES[n][3] * (gw - bw), y = gy + NODES[n][4] * gh; if (mouseX > x && mouseX < x + bw && mouseY > y && mouseY < y + bh) sel = n; }
}
function keyPressed() {
  if (key === ' ') stepIt();
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'r' || key === 'R') resetIt();
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let s = solve(0), fix = true;
  for (let n = 0; n < NODES.length; n++) { let i = 0; for (let p of preds(n)) i |= s.O[p]; if (s.I[n] !== i || s.O[n] !== (genK[n].gen | (i & ~genK[n].kill))) fix = false; }
  check('⊥ からの反復は ' + s.k + ' 周で止まり、そこで方程式 OUT = gen ∪ (IN − kill) がすべて成り立つ（不動点）', fix && s.k < 10);
  let ref = new Array(NODES.length).fill(0);   // 確かめ用：定義のノードから、同じ変数を定義し直すノードを通らずに行けるか（道の探索）
  NODES.forEach(([c, d, v], dn) => { if (d < 0) return; let seen = new Set(), q = EDGES.filter((e) => e[0] === dn).map((e) => e[1]);
    while (q.length) { let m = q.shift(); if (seen.has(m)) continue; seen.add(m); ref[m] |= 1 << d; if (m !== dn && NODES[m][2] === v) continue; for (let e of EDGES) if (e[0] === m) q.push(e[1]); } });
  check('反復の答え IN = 道の探索で求めた答え（全ノード）', s.I.every((v, n) => v === ref[n]));
  let I2 = new Array(NODES.length).fill(0), O2 = new Array(NODES.length).fill(0), wl = [...Array(NODES.length).keys()].reverse(), cnt = 0;   // ワークリスト法（逆順から）
  while (wl.length && cnt < 1000) { cnt++; let n = wl.pop(), i = 0; for (let p of preds(n)) i |= O2[p]; let o = genK[n].gen | (i & ~genK[n].kill); I2[n] = i; if (o !== O2[n]) { O2[n] = o; for (let e of EDGES) if (e[0] === n && !wl.includes(e[1])) wl.push(e[1]); } }
  check('ワークリスト法（更新の順番がちがう）でも同じ答え', I2.every((v, n) => v === s.I[n]) && O2.every((v, n) => v === s.O[n]));
  resetIt(); let incr = true; for (let k = 0; k < 20; k++) { let prev = OUT.slice(); stepIt(); if (!OUT.every((v, n) => (prev[n] & v) === prev[n])) incr = false; }
  check('反復のたびに各ノードの値は束を上る（減らない＝単調）', incr && done);
  let topSol = solve((1 << ND) - 1);
  check('⊤（全部の定義）から始めても不動点に着き、それは最小不動点以上', topSol.O.every((v, n) => (s.O[n] & v) === s.O[n]));
  check('例：d6（t = s * 2）に届く s の定義は d2, d3, d4（i の定義 d1, d5 も）', s.I[8] === 0b011111);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. スペースで 1 周ずつ進めよう。ループ（while）のせいで、2 周目に d5 が while に届く
// 2. 「d4: s = s − 1」をクリック。その OUT は束の上でどう上っていく？
// 3. EDGES から [7, 3] を消す（ループをなくす）と、何周で止まる？
// 4. 定数伝播：値の束を「⊥ < 0, 1, 2, … < ⊤（わからない）」にすると、同じ反復で定数が見つかる
// 5. 型推論や最適化も、束と不動点で考えられる


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
