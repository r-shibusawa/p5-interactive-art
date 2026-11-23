// ============================================
// 12 ディルワースの定理 ─ 最大の反鎖の大きさ = 鎖で全部をおおうときの最小の本数
// 二部グラフ（左に各元のコピー、右に各元のコピー、x < y なら 左x — 右y）の最大マッチング M を増加道で求める
// マッチした辺 x — y を「x の次は y」とつなぐと鎖に分かれ、本数 = n − |M|。ケーニヒの定理で同じ大きさの反鎖も見つかる
// ← → 半順序を変える / ↑↓ 部分集合の束の k（スペルナーの定理）/ G 新しいランダム / スペース 1 歩 / A 自動 / R やり直し
// ============================================

const KINDS = ['ランダムな半順序（G）', '部分集合の束', '60 の約数', '360 の約数'];
let ki = 0, kSet = 4, lat, mL = [], mR = [], nextI = 0, auto = true, seedN = 12, anti = [];

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); rebuild(); }

function posetOf(k) {
  if (k === 0) { seedRng(seedN); let Q = randomPoset(9 + Math.floor(rnd() * 6), 0.2); Q.lab = Q.lab.map((s, i) => 'abcdefghijklmnop'[i]); return Q; }
  return k === 1 ? powersetPoset(kSet) : divisorPoset(k === 2 ? 60 : 360);
}
// 増加道：左 i から、まだマッチしていない右か、マッチ相手が別の道を見つけられる右へ（クーンの方法）
function augment(lat, i, mL, mR, seen) {
  for (let j = 0; j < lat.n; j++) if (j !== i && lat.R[i][j] && !seen[j]) {       // 推移的閉包の辺 i < j を使う（被覆だけでは足りない）
    seen[j] = 1;
    if (mR[j] < 0 || augment(lat, mR[j], mL, mR, seen)) { mL[i] = j; mR[j] = i; return true; }
  }
  return false;
}
function fullMatching(lat) { let a = new Array(lat.n).fill(-1), b = new Array(lat.n).fill(-1); for (let i = 0; i < lat.n; i++) augment(lat, i, a, b, new Uint8Array(lat.n)); return [a, b]; }
function chainsOf(lat, mL, mR) { let out = []; for (let i = 0; i < lat.n; i++) if (mR[i] < 0) { let c = [i]; while (mL[c[c.length - 1]] >= 0) c.push(mL[c[c.length - 1]]); out.push(c); } return out; }
function konig(lat, mL, mR) {            // マッチしていない左から交互道でたどれる頂点 Z → 反鎖 = {x | 左x ∈ Z かつ 右x ∉ Z}
  let zL = new Uint8Array(lat.n), zR = new Uint8Array(lat.n), q = [];
  for (let i = 0; i < lat.n; i++) if (mL[i] < 0) { zL[i] = 1; q.push(i); }
  while (q.length) { let i = q.shift(); for (let j = 0; j < lat.n; j++) if (j !== i && lat.R[i][j] && !zR[j] && mL[i] !== j) { zR[j] = 1; let k = mR[j]; if (k >= 0 && !zL[k]) { zL[k] = 1; q.push(k); } } }
  return allOf(lat).filter((x) => zL[x] && !zR[x]);
}
function isAntichain(lat, Sx) { return Sx.every((a) => Sx.every((b) => a === b || (!lat.R[a][b] && !lat.R[b][a]))); }
function binom(n, r) { let c = 1; for (let i = 1; i <= r; i++) c = (c * (n - r + i)) / i; return Math.round(c); }
function rebuild() { lat = posetOf(ki); layoutHasse(lat, 80, 170, width * 0.48 - 80, height - 300, ki >= 1); restart(); }
function restart() { mL = new Array(lat.n).fill(-1); mR = new Array(lat.n).fill(-1); nextI = 0; anti = []; }
function stepIt() { if (nextI < lat.n) { augment(lat, nextI, mL, mR, new Uint8Array(lat.n)); nextI++; if (nextI === lat.n) anti = konig(lat, mL, mR); } }

const CC = [[90, 225, 215], [255, 190, 90], [255, 120, 170], [170, 150, 255], [140, 225, 120], [255, 240, 120], [120, 170, 255], [255, 150, 100], [200, 120, 255], [120, 255, 200]];
function draw() {
  background(18, 20, 44);
  if (auto && frameCount % 25 === 0) stepIt();
  let chs = chainsOf(lat, mL, mR), cid = new Array(lat.n); chs.forEach((c, k) => c.forEach((x) => (cid[x] = k)));
  // ---- 左：ハッセ図に鎖の色（マッチした辺 x → y を太く）
  stroke(255, 255, 255, 25); strokeWeight(1); for (let [a, b] of lat.cov) line(...lat.pos[a], ...lat.pos[b]);
  strokeWeight(5); for (let i = 0; i < lat.n; i++) if (mL[i] >= 0) { stroke(...CC[cid[i] % 10]); line(...lat.pos[i], ...lat.pos[mL[i]]); }
  textAlign(CENTER, CENTER); textSize(lat.n > 20 ? 9 : 12);
  for (let i = 0; i < lat.n; i++) { stroke(anti.includes(i) ? 255 : 18); strokeWeight(anti.includes(i) ? 4 : 2); fill(...CC[cid[i] % 10]); circle(...lat.pos[i], lat.n > 20 ? 26 : 32); noStroke(); fill(18, 20, 44); text(lat.lab[i], ...lat.pos[i]); }
  // ---- 中：二部グラフ（左のコピー → 右のコピー）
  let bx = width * 0.52, bw = 150, by = 150, bh = Math.min(22, (height - 220) / lat.n);
  for (let i = 0; i < lat.n; i++) for (let j = 0; j < lat.n; j++) if (i !== j && lat.R[i][j]) { let mt = mL[i] === j; stroke(mt ? CC[cid[i] % 10] : [255, 255, 255, 30]); strokeWeight(mt ? 3 : 1); line(bx, by + i * bh, bx + bw, by + j * bh); }
  noStroke(); textSize(11);
  for (let i = 0; i < lat.n; i++) { fill(i === nextI ? [255, 255, 255] : [200, 206, 230]); text(lat.lab[i], bx - 14, by + i * bh); text(lat.lab[i], bx + bw + 14, by + i * bh); }
  textAlign(LEFT, BASELINE); fill(200); textSize(13); text('左 x — 右 y（x < y）', bx - 10, by - 18);
  // ---- 右のパネル
  let px = bx + bw + 50, y = 160, M = mL.filter((v) => v >= 0).length;
  fill(230); textSize(17); text(KINDS[ki] + (ki === 1 ? ' k = ' + kSet : '') + '　n = ' + lat.n, px, y);
  textSize(15); fill(220);
  text('マッチング |M| = ' + M + '（左 ' + nextI + ' / ' + lat.n + ' まで処理）', px, y + 34);
  text('鎖の本数 = n − |M| = ' + (lat.n - M), px, y + 60);
  chs.slice(0, 10).forEach((c, k) => { fill(...CC[k % 10]); text(c.map((x) => lat.lab[x]).join(' < '), px, y + 92 + 20 * k, width - px - 10); });
  y += 100 + 20 * Math.min(10, chs.length);
  if (nextI === lat.n) {
    fill(255); text('ケーニヒの反鎖（白わく）：大きさ ' + anti.length + (isAntichain(lat, anti) ? ' ✓ 反鎖' : ' ✗'), px, y + 10);
    fill(140, 225, 180); text('最大反鎖 ' + anti.length + ' = 最小の鎖の本数 ' + (lat.n - M) + (anti.length === lat.n - M ? '　✓ ディルワース' : '　✗'), px, y + 36);
  } else { fill(175); text('スペースで 1 歩（左の元から増加道をさがす）', px, y + 10); }
  if (ki === 1) { fill(255, 220, 120); text('スペルナー：最大反鎖 = 真ん中の段 C(' + kSet + ', ' + Math.floor(kSet / 2) + ') = ' + binom(kSet, Math.floor(kSet / 2)), px, y + 70); }
  fill(240); textSize(18); text('ディルワースの定理　' + KINDS[ki] + '：最大マッチング → 最小の鎖の分割と最大の反鎖', 20, 36);
  fill(175); textSize(15); text('← → 半順序　↑↓ 部分集合の束の k（2〜5）　G 新しいランダム　スペース 1 歩　A 自動 ' + (auto ? 'ON' : 'OFF') + '　R やり直し', 20, 62);
  drawSelfTest(width - 180, height - 12);
}

function keyPressed() {
  if (key === RIGHT_ARROW) { ki = (ki + 1) % KINDS.length; rebuild(); }
  if (key === LEFT_ARROW) { ki = (ki + KINDS.length - 1) % KINDS.length; rebuild(); }
  if (key === UP_ARROW && kSet < 5) { kSet++; ki = 1; rebuild(); }
  if (key === DOWN_ARROW && kSet > 2) { kSet--; ki = 1; rebuild(); }
  if (key === 'g' || key === 'G') { ki = 0; seedN++; rebuild(); }
  if (key === ' ') stepIt();
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'r' || key === 'R') restart();
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let okD = true, okC = true; seedRng(1212);
  for (let t = 0; t < 40; t++) {
    let Q = randomPoset(4 + Math.floor(rnd() * 9), 0.25), [a, b] = fullMatching(Q), M = a.filter((v) => v >= 0).length, A = konig(Q, a, b), ch = chainsOf(Q, a, b), bw = 0;
    for (let s = 0; s < 1 << Q.n; s++) { let Sx = allOf(Q).filter((i) => s >> i & 1); if (Sx.length > bw && isAntichain(Q, Sx)) bw = Sx.length; }   // 確かめ用：全部の部分集合
    if (Q.n - M !== bw || A.length !== bw || !isAntichain(Q, A)) okD = false;
    let all = ch.flat().sort((x, y) => x - y); if (all.join() !== allOf(Q).join() || ch.length !== Q.n - M || !ch.every((c) => c.every((x, k) => k === 0 || Q.R[c[k - 1]][x]))) okC = false;
  }
  check('ランダムな半順序 40 個：鎖の本数 n − |M| = 全部の部分集合で調べた最大反鎖 = ケーニヒの反鎖の大きさ', okD);
  check('マッチングから作った鎖はどれも本当に鎖で、全部の元をちょうど 1 回ずつおおう', okC);
  let sp = [2, 3, 4, 5].map((k) => { let Q = powersetPoset(k), [a, b] = fullMatching(Q); return konig(Q, a, b).length; });
  check('スペルナーの定理：k = 2, 3, 4, 5 の最大反鎖 = ' + sp.join(', ') + ' = C(k, ⌊k/2⌋)（k = 4 で 6）', sp.join() === '2,3,6,10');
  let D = divisorPoset(360), [a, b] = fullMatching(D);
  check('360 = 2³·3²·5 の約数：最大反鎖 = 真ん中の段の 6 個 = 鎖 6 本', konig(D, a, b).length === 6 && D.n - a.filter((v) => v >= 0).length === 6);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. スペースで 1 歩ずつ。マッチングが 1 つ増えるたびに鎖が 1 本減る
// 2. 最後に白わくの反鎖が出る。それぞれの鎖から 1 個ずつ選ばれている？
// 3. ↑↓ で k を変えて、部分集合の束の最大反鎖が真ん中の段 C(k, ⌊k/2⌋) になることを確かめよう
// 4. augment の中の lat.R[i][j] を「被覆の辺だけ」にすると、鎖の本数が増えることがある。なぜ？
// 5. 仕事の順番（半順序）を、何人で並行してやれば最短で終わる？（鎖 = 1 人の担当）


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
