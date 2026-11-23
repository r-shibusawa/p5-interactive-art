// ============================================
// 15 カメラと束 ─ 映像のブロックを「対象」、見た目の特徴を「属性」にして、概念束をその場で計算する
// 160 × 120 の映像を 8 × 6 = 48 ブロックに分け、明るい・暗い・赤っぽい・青っぽい・縦のエッジ・動き の 6 つの属性を 0/1 で決める
// 属性の部分集合 2^6 = 64 通りから概念（外延 = ブロックの集合、内包 = 属性の集合）を全部求め、概念束を描く（08 と同じ計算）
// 概念の丸をクリック → その外延のブロックを映像の上で強調 / ↑↓ 明るさのしきい値 / ← → 動きのしきい値 / V カメラ ⇔ テスト画像 / S 保存
// ============================================

const CW = 160, CH = 120, BX = 8, BY = 6;      // 映像の大きさとブロックの数
const ATTRS = ['明るい', '暗い', '赤っぽい', '青っぽい', '縦エッジ', '動き'];
let attrAt = [], cap, testImg, lum, prevLum, objs = [], concepts = [], CLt = null, pickB = -1, thrB = 0.55, thrM = 0.05, useCam = true, live = false;

function setup() {
  createCanvas(windowWidth, windowHeight); pixelDensity(1);
  cap = createCapture(VIDEO, { flipped: true }); cap.size(CW, CH); cap.hide();
  testImg = createImage(CW, CH); lum = new Float32Array(CW * CH); prevLum = new Float32Array(CW * CH);
  selfTest();
}
// ---- 画素 → ブロックの属性（ビットマスク）
function blockAttrs(px, lumA, prevA, tb, tm) {
  let sums = [];
  for (let k = 0; k < BX * BY; k++) sums.push([0, 0, 0, 0, 0, 0]);
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    let i = x + CW * y, o = 4 * i, r = px[o], g = px[o + 1], b = px[o + 2], L = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    lumA[i] = L; let s = sums[Math.floor((x * BX) / CW) + BX * Math.floor((y * BY) / CH)];
    s[0] += L; s[1] += (r - (g + b) / 2) / 255; s[2] += (b - (r + g) / 2) / 255; s[3] += x > 0 ? Math.abs(L - lumA[i - 1]) : 0; s[4] += Math.abs(L - prevA[i]); s[5]++;
  }
  return sums.map(([L, rd, bl, ex, mv, c]) => (L / c > tb ? 1 : 0) | (L / c < 0.3 ? 2 : 0) | (rd / c > 0.12 ? 4 : 0) | (bl / c > 0.1 ? 8 : 0) | (ex / c > 0.06 ? 16 : 0) | (mv / c > tm ? 32 : 0));
}
// ---- 概念：属性の部分集合 B → 外延 B′（ブロック）→ 内包 B″
function conceptsOf(ob, nA) {
  let seen = new Map();
  for (let B = 0; B < 1 << nA; B++) {
    let ext = []; ob.forEach((m, g) => { if ((m & B) === B) ext.push(g); });
    let key = ext.join(','); if (!seen.has(key)) seen.set(key, { ext, B: ext.reduce((m, g) => m & ob[g], (1 << nA) - 1) });
  }
  return [...seen.values()].sort((p, q) => p.ext.length - q.ext.length);
}
function latticeOf(cs) {               // 外延の ⊆ ＝ 内包の ⊇ で並べる
  let lat = makePoset(cs.length, (i, j) => (cs[i].B & cs[j].B) === cs[j].B, cs.map((c) => String(c.ext.length)));
  lat.hint = (i) => [0, 1, 2, 3, 4, 5].reduce((s, a) => s + (cs[i].B >> a & 1 ? [-1, 1, -0.5, 0.5, -0.2, 0.25][a] : 0), 0); return lat;
}
function testPixels(t) {               // テスト画像：明暗のグラデーション、動く赤い円、青い四角、縦じま
  let a = new Uint8ClampedArray(CW * CH * 4), cx = 80 + 50 * Math.sin(t * 0.03), cy = 60 + 30 * Math.cos(t * 0.021);
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    let o = 4 * (x + CW * y), v = 40 + 170 * (x / CW), c = [v, v, v];
    if (x > 120 && y > 70) c = [40, 60, 200];
    if (y < 30 && x < 60) c = (x >> 2) % 2 ? [230, 230, 230] : [20, 20, 20];
    if (Math.hypot(x - cx, y - cy) < 16) c = [220, 40, 40];
    a[o] = c[0]; a[o + 1] = c[1]; a[o + 2] = c[2]; a[o + 3] = 255;
  }
  return a;
}

function draw() {
  background(18, 20, 44);
  live = useCam && cap && cap.width > 0 && cap.elt.readyState >= 2 && cap.elt.videoWidth > 0;
  let px = null;
  if (live) { cap.loadPixels(); if (cap.pixels.length >= CW * CH * 4) px = cap.pixels; }
  if (!px) { px = testPixels(frameCount); testImg.loadPixels(); testImg.pixels.set(px); testImg.updatePixels(); }
  if (frameCount % 6 === 1 || !CLt) {  // 6 コマに 1 回、文脈と概念束を計算しなおす
    let t = prevLum; prevLum = lum; lum = t;
    objs = blockAttrs(px, lum, prevLum, thrB, thrM); concepts = conceptsOf(objs, ATTRS.length); CLt = latticeOf(concepts);
    attrAt = ATTRS.map((nm, a) => { let B = objs.reduce((m, o) => (o >> a & 1 ? m & o : m), 63); return concepts.findIndex((c) => c.B === B); });   // 属性 a の概念 μ(a) = (a′, a″)
    layoutHasse(CLt, width * 0.56, 190, width * 0.41, height - 300);
  }
  // ---- 映像とブロック
  let sc = Math.min((width * 0.5) / CW, (height - 260) / CH), x0 = 20, y0 = 100, bw = (CW * sc) / BX, bh = (CH * sc) / BY;
  image(live ? cap : testImg, x0, y0, CW * sc, CH * sc);
  let ci = concepts.findIndex((c) => c.B === pickB), ext = ci >= 0 ? concepts[ci].ext : [];
  for (let g = 0; g < BX * BY; g++) {
    let bx = x0 + (g % BX) * bw, by = y0 + Math.floor(g / BX) * bh;
    stroke(255, 255, 255, 40); strokeWeight(1); noFill(); if (ext.includes(g)) { fill(90, 225, 215, 110); stroke(90, 225, 215); strokeWeight(2); } rect(bx, by, bw, bh);
    noStroke(); for (let a = 0; a < 6; a++) if (objs[g] >> a & 1) { fill(...[[255, 255, 200], [90, 90, 120], [255, 80, 80], [80, 120, 255], [255, 255, 255], [255, 190, 90]][a]); circle(bx + 6 + a * 7, by + bh - 6, 6); }
  }
  // ---- 概念束（ラベル = 外延のブロックの数、属性名は μ(m) の上に）
  drawHasse(CLt, { rad: 13, fs: 10, col: (i) => (i === ci ? [90, 225, 215] : ci >= 0 && CLt.R[i][ci] ? [150, 200, 210] : [150, 160, 205]) });
  textAlign(CENTER, BASELINE); textSize(12);
  let used = {}; ATTRS.forEach((nm, a) => { let k = attrAt[a]; if (k >= 0) { used[k] = (used[k] || 0) + 1; fill(255, 220, 140); text(nm, CLt.pos[k][0], CLt.pos[k][1] - 4 - 12 * used[k]); } });
  textAlign(LEFT, BASELINE);
  // ---- 文字
  let ty = y0 + CH * sc + 30; fill(200); textSize(14);
  text((live ? 'カメラ映像' : 'テスト画像（V でカメラ）') + '　点の色：明るい 黄白・暗い 紺・赤っぽい 赤・青っぽい 青・縦エッジ 白・動き 橙', x0, ty);
  if (ci >= 0) { fill(90, 225, 215); text('選んだ概念：内包 {' + ATTRS.filter((n, a) => pickB >> a & 1).join('、') + '}　外延 ' + ext.length + ' ブロック（水色）', x0, ty + 24); }
  else { fill(175); text('右の丸をクリック → その概念のブロックを映像で強調', x0, ty + 24); }
  fill(175); text('明るさのしきい値 ' + thrB.toFixed(2) + '（↑↓）　動きのしきい値 ' + thrM.toFixed(2) + '（← →）', x0, ty + 48);
  fill(240); textSize(18); text('カメラと束　48 ブロック × 6 属性 → 概念 ' + concepts.length + ' 個（6 コマごとに計算）', 20, 36);
  fill(175); textSize(15); text('丸をクリック 外延を強調　↑↓ 明るさ　← → 動き　V カメラ ⇔ テスト画像　S 保存', 20, 62);
  drawSelfTest(width - 180, height - 12);
}

function mousePressed() { if (!CLt) return; let i = nodeAt(CLt, mouseX, mouseY, 16); if (i >= 0) pickB = concepts[i].B === pickB ? -1 : concepts[i].B; }
function keyPressed() {
  if (key === UP_ARROW) thrB = Math.min(0.9, thrB + 0.05);
  if (key === DOWN_ARROW) thrB = Math.max(0.3, thrB - 0.05);
  if (key === RIGHT_ARROW) thrM = Math.min(0.3, thrM + 0.01);
  if (key === LEFT_ARROW) thrM = Math.max(0.01, thrM - 0.01);
  if (key === 'v' || key === 'V') useCam = !useCam;
  if (key === 's' || key === 'S') saveCanvas('lattice_camera', 'png');
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  check('「i ≠ j」の 4 × 4 の文脈 → 概念 16 個（部分集合の束）', conceptsOf([14, 13, 11, 7], 4).length === 16);
  let L1 = new Float32Array(CW * CH), L0 = new Float32Array(CW * CH), ob = blockAttrs(testPixels(0), L1, L0, 0.55, 0.05), cs = conceptsOf(ob, 6);
  let oa = (g) => ob[g], blk = (x, y) => Math.floor((x * BX) / CW) + BX * Math.floor((y * BY) / CH);
  check('テスト画像の属性：右下は青っぽい、左上のしまは縦エッジ、右上は明るい、左下は暗い', oa(blk(150, 110)) & 8 && oa(blk(10, 10)) & 16 && oa(blk(150, 10)) & 1 && oa(blk(5, 110)) & 2);
  check('どの概念も A′ = B かつ B′ = A（' + cs.length + ' 個）', cs.every((c) => c.ext.every((g) => (ob[g] & c.B) === c.B) && ob.every((m, g) => ((m & c.B) === c.B) === c.ext.includes(g))));
  let I = new Set([63]), grow = true; ob.forEach((m) => I.add(m));   // 確かめ用：内包 = 対象の属性集合の共通部分（∩ で閉じる）
  while (grow) { grow = false; for (let a of [...I]) for (let b of [...I]) if (!I.has(a & b)) { I.add(a & b); grow = true; } }
  check('概念の内包の集合 = 各ブロックの属性集合を ∩ で閉じたもの（別の計算と一致）', I.size === cs.length && cs.every((c) => I.has(c.B)));
  let lat = latticeOf(cs), ok = isLattice(lat); for (let i = 0; i < lat.n; i++) for (let j = 0; j < lat.n; j++) { let m = meetOf(lat, i, j); if (cs[m].ext.join() !== cs[i].ext.filter((g) => cs[j].ext.includes(g)).join()) ok = false; }
  check('概念束は束で、下限の外延 = 外延の共通部分', ok);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 手をふると「動き」の属性が増える。概念束の形はどう変わる？
// 2. 赤いものをカメラに向けて、「赤っぽい」の概念をクリック。どのブロックが光る？
// 3. ↑↓ で明るさのしきい値を変えると、概念の数は増える？ 減る？
// 4. ATTRS に「緑っぽい」を足してみよう（blockAttrs に 1 行足す）。概念は最大 2^7 = 128 個
// 5. S で保存。自分の部屋を「概念束」で説明する作品にしよう


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
