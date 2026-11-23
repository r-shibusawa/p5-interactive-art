// ============================================
// 14 束の音 ─ 約数の束の各要素を音の高さにして、鎖をたどって鳴らす
// 素因数ごとに音程を決める：2 → 長 3 度（×5/4）、3 → 完全 5 度（×3/2）、5 → 長 2 度（×9/8）、7 → ×7/4
// 約数 d = 2^a·3^b·5^c… の高さ = 基音 × (5/4)^a·(3/2)^b·(9/8)^c…。かけ算なので 上限（lcm）と下限（gcd）の 2 音の積 = もとの 2 音の積
// クリックで音 ON / 要素をクリック → その音、2 つ目をクリック → 2 音のあと上限と下限 / スペース ランダムな極大鎖を鳴らす
// ← → n を変える / ↑↓ テンポ / M 消音 / 音量は小さめから（全体の音量 MASTER は 0.2 以下）
// ============================================

const NS = [60, 72, 120, 180, 210, 360, 30];   // ★ 選べる n
const BASE = 130.81;                           // ★ 基音（ド、C3）Hz
const RATIO = { 2: 5 / 4, 3: 3 / 2, 5: 9 / 8, 7: 7 / 4, 11: 11 / 8 };   // ★ 素因数ごとの音程
let ni = 0, lat, sel = [], seq = [], tempo = 0.32, muted = false, rings = [];

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); rebuild(); }

function freqOf(d) { return primeFactors(d).reduce((f, [p, e]) => f * (RATIO[p] || 1) ** e, BASE); }
function noteName(f) { let m = 12 * Math.log2(f / 440) + 69, k = Math.round(m), c = Math.round((m - k) * 100); return ['ド', 'ド♯', 'レ', 'レ♯', 'ミ', 'ファ', 'ファ♯', 'ソ', 'ソ♯', 'ラ', 'ラ♯', 'シ'][((k % 12) + 12) % 12] + Math.floor(k / 12 - 1) + (c ? (c > 0 ? '+' : '') + c + '¢' : ''); }
function rebuild() { lat = divisorPoset(NS[ni]); sel = []; seq = []; layoutHasse(lat, 100, 170, width * 0.6 - 100, height - 290, true); }
function randomChain(lat) {              // ⊥ から、すぐ上の元（被覆）をランダムに選んで ⊤ まで = 極大鎖
  let x = botOf(lat), ch = [x];
  while (x !== topOf(lat)) { let up = lat.cov.filter(([a, b]) => a === x).map(([a, b]) => b); x = up[Math.floor(Math.random() * up.length)]; ch.push(x); }
  return ch;
}
function countChains(lat) {              // 極大鎖の数：下から「すぐ下の元の数の合計」を順に足す
  let ord = allOf(lat).sort((a, b) => lat.rk[a] - lat.rk[b]), c = new Array(lat.n).fill(0); c[botOf(lat)] = 1;
  for (let y of ord) for (let [a, b] of lat.cov) if (b === y) c[y] += c[a];
  return c[topOf(lat)];
}
function multinomial(n) { let f = primeFactors(n), fact = (k) => (k <= 1 ? 1 : k * fact(k - 1)); return fact(f.reduce((s, x) => s + x[1], 0)) / f.reduce((s, x) => s * fact(x[1]), 1); }
function sound(i, delay, dur) { let f = freqOf(lat.val[i]); if (!muted) tone(f, delay, dur, 0.5); rings.push({ i, t: millis() + delay * 1000, life: dur * 1000 }); }

function draw() {
  background(18, 20, 44);
  let now = millis(), act = new Set(rings.filter((r) => now >= r.t && now < r.t + r.life).map((r) => r.i));
  rings = rings.filter((r) => now < r.t + r.life);
  // ---- 鳴っている元のまわりに波紋
  for (let r of rings) if (now >= r.t) { let a = (now - r.t) / r.life; noFill(); stroke(255, 220, 140, 200 * (1 - a)); strokeWeight(2); circle(...lat.pos[r.i], 40 + 90 * a); }
  let fmin = freqOf(1), fmax = freqOf(NS[ni]);
  drawHasse(lat, { rad: 22, fs: 13, col: (i) => { let u = Math.log(freqOf(lat.val[i]) / fmin) / Math.max(1e-9, Math.log(fmax / fmin)); return act.has(i) ? [255, 255, 255] : sel.includes(i) ? [255, 220, 140] : [70 + 140 * u, 150 + 60 * (1 - u), 230 - 90 * u]; },
    ecol: (a, b) => (seq.includes(a) && seq.includes(b) && Math.abs(seq.indexOf(a) - seq.indexOf(b)) === 1 ? [255, 220, 140] : null) });
  // ---- 右のパネル
  let px = width * 0.63, y = 160, n = NS[ni];
  noStroke(); fill(230); textSize(17); text('n = ' + n + ' = ' + primeFactors(n).map(([p, e]) => p + (e > 1 ? '^' + e : '')).join('·') + '　約数 ' + lat.n + ' 個', px, y);
  textSize(14); fill(190);
  text('音程：2 → ×5/4、3 → ×3/2、5 → ×9/8、7 → ×7/4', px, y + 28);
  text('極大鎖（1 から n まで 1 歩ずつ）の数：' + countChains(lat) + ' 本', px, y + 52);
  let hv = nodeAt(lat, mouseX, mouseY, 24);
  if (hv >= 0) { fill(255, 220, 140); textSize(16); text(lat.val[hv] + '：' + freqOf(lat.val[hv]).toFixed(1) + ' Hz（' + noteName(freqOf(lat.val[hv])) + '）', px, y + 86); }
  if (sel.length === 2) {
    let [a, b] = sel.map((i) => lat.val[i]), L = lcmOf(a, b), G = gcdOf(a, b);
    fill(220); textSize(15);
    text('2 音 ' + a + ' と ' + b + '　→　上限 lcm = ' + L + '、下限 gcd = ' + G, px, y + 124);
    text('f(lcm)·f(gcd) = ' + (freqOf(L) * freqOf(G)).toFixed(1) + '　f(a)·f(b) = ' + (freqOf(a) * freqOf(b)).toFixed(1), px, y + 148);
    text('→ 上限と下限の 2 音は、もとの 2 音と「平均の高さ」が同じ', px, y + 172);
  }
  if (seq.length) { fill(255, 220, 140); textSize(15); text('鎖：' + seq.map((i) => lat.val[i]).join(' → '), px, y + 214, width - px - 20); text('　　' + seq.map((i) => noteName(freqOf(lat.val[i]))).join(' → '), px, y + 262, width - px - 20); }
  fill(240); textSize(18); text('束の音　約数 d の高さ = 基音 × 素因数ごとの音程の積', 20, 36);
  fill(175); textSize(15);
  text((audioCtx ? (muted ? '消音中（M）' : '音 ON') : 'クリックで音 ON') + '　クリック 音・2 つで上限と下限　スペース 極大鎖を鳴らす　← → n（' + NS.join(', ') + '）　↑↓ テンポ ' + tempo.toFixed(2) + ' 秒　M 消音', 20, 62);
  drawSelfTest(width - 180, height - 12);
}

function mousePressed() {
  startAudio();
  let i = nodeAt(lat, mouseX, mouseY, 26); if (i < 0) return;
  if (sel.length >= 2) sel = []; sel.push(i); sound(i, 0, 0.9);
  if (sel.length === 2) { sound(sel[0], 0.6, 1.2); sound(sel[1], 0.6, 1.2); sound(joinOf(lat, sel[0], sel[1]), 1.5, 1.4); sound(meetOf(lat, sel[0], sel[1]), 1.5, 1.4); }
}
function keyPressed() {
  startAudio();
  if (key === ' ') { seq = randomChain(lat); seq.forEach((x, k) => sound(x, k * tempo, tempo * (seq.length - k) + 0.6)); }   // 音を重ねていくと和音に
  if (key === RIGHT_ARROW) { ni = (ni + 1) % NS.length; rebuild(); }
  if (key === LEFT_ARROW) { ni = (ni + NS.length - 1) % NS.length; rebuild(); }
  if (key === UP_ARROW) tempo = Math.max(0.12, tempo - 0.04);
  if (key === DOWN_ARROW) tempo = Math.min(0.8, tempo + 0.04);
  if (key === 'm' || key === 'M') muted = !muted;
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let mono = true, mult = true, range = true, cnt = true;
  for (let n of NS) {
    let Q = divisorPoset(n);
    for (let [a, b] of Q.cov) if (!(freqOf(Q.val[a]) < freqOf(Q.val[b]))) mono = false;
    for (let a of Q.val) for (let b of Q.val) if (Math.abs(freqOf(lcmOf(a, b)) * freqOf(gcdOf(a, b)) - freqOf(a) * freqOf(b)) > 1e-6 * freqOf(a) * freqOf(b)) mult = false;
    if (freqOf(n) > 2000 || freqOf(1) < 100) range = false;
    if (countChains(Q) !== multinomial(n)) cnt = false;
  }
  check('d | e なら f(d) < f(e)（割り切る方向に音が上がる＝単調）', mono);
  check('すべての組で f(lcm)·f(gcd) = f(a)·f(b)（指数の max + min = 和）', mult);
  check('極大鎖の数 = 多項係数 (a+b+c)!/(a!b!c!)（60 なら 4!/(2!1!1!) = 12）', cnt && countChains(divisorPoset(60)) === 12);
  let Q = divisorPoset(360), ok = true; for (let t = 0; t < 30; t++) { let ch = randomChain(Q); if (ch[0] !== 0 || ch[ch.length - 1] !== Q.n - 1 || !ch.every((x, k) => k === 0 || Q.cov.some(([a, b]) => a === ch[k - 1] && b === x))) ok = false; }
  check('ランダムな鎖はいつも 1 から n まで被覆をたどる極大鎖', ok);
  check('音の高さは 100〜2000 Hz の中、全体の音量 MASTER ≤ 0.2', range && MASTER <= 0.2);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. スペースを何回か押す。同じ n でも鎖ごとに音の進み方がちがう。でも最後の和音は？
// 2. 2 つクリックして、上限と下限の 2 音を聞きくらべよう
// 3. RATIO を 2 → 2（オクターブ）、3 → 3/2 にすると？ 音の並びはどう変わる？
// 4. n = 210 = 2·3·5·7 は 4 次元の立方体。7 の音程 ×7/4 は「自然 7 度」と呼ばれる少し低い音
// 5. 自由制作：自分の n と音程で、束をたどる曲を作ろう


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
// ---- 音の道具（Web Audio）。音量の上限：全体の音量 MASTER は 0.2 以下
const MASTER = 0.12;                   // ★ 全体の音量（0.2 以下にしておく）
let audioCtx = null, masterOut = null;
function startAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    masterOut = audioCtx.createGain(); masterOut.gain.value = Math.min(0.2, MASTER); masterOut.connect(audioCtx.destination);
  }
  audioCtx.resume();
}
function tone(freq, delay, dur, vol) { // やわらかい音（三角波＋少しの倍音）。delay 秒後から dur 秒
  if (!audioCtx) return;
  let t0 = audioCtx.currentTime + Math.max(0, delay), gn = audioCtx.createGain(), lp = audioCtx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 2400;
  gn.gain.setValueAtTime(0, t0); gn.gain.linearRampToValueAtTime(clampv(vol, 0, 1) * 0.4, t0 + 0.02); gn.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(0.1, dur));
  for (let [mul, w, a] of [[1, 'triangle', 1], [2, 'sine', 0.25]]) {
    let o = audioCtx.createOscillator(), g2 = audioCtx.createGain(); o.type = w; o.frequency.value = clampv(freq * mul, 40, 4000); g2.gain.value = a;
    o.connect(g2); g2.connect(lp); o.start(t0); o.stop(t0 + Math.max(0.1, dur) + 0.05);
  }
  lp.connect(gn); gn.connect(masterOut);
}
