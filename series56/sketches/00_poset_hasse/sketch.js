// ============================================
// 00 半順序とハッセ図 ─ 「a ≤ b」の矢印から、順序の表とハッセ図を計算する
// 半順序 = 反射律（a ≤ a）・反対称律（a ≤ b かつ b ≤ a なら a = b）・推移律（a ≤ b ≤ c なら a ≤ c）
// 矢印を足りない分だけ足す（推移的閉包）→ 間に何もはさまらない矢印だけ残す（被覆 = ハッセ図の辺）→ ランクで高さをそろえる
// 左の何もない所をクリックで要素を追加 / 要素から要素へドラッグで「a ≤ b」の矢印 / D 最後の矢印を消す / C 全部消す
// 1 2 3 例（推移律が足りない・約数・輪になる）/ スペース 閉包で足した矢印を表示 / R 例 1 にもどす
// ============================================

const MAX_NODES = 16;                  // ★ 要素の数の上限
const NODE_R = 18;                     // ★ 要素の丸の半径
let nodes = [], arrows = [], dragFrom = -1, showClosure = true, info = null;

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); preset(1); }

function preset(k) {
  let w = width * 0.5, h = height;
  let lat = (pts, ar) => { nodes = pts.map(([x, y], i) => ({ x: 40 + x * (w - 80), y: 140 + y * (h - 260), name: 'abcdefghijklmnop'[i] })); arrows = ar; };
  if (k === 1) lat([[0.2, 0.9], [0.1, 0.5], [0.5, 0.2], [0.6, 0.6], [0.8, 0.0], [0.15, 0.1]], [[0, 1], [1, 2], [0, 3], [3, 2], [2, 4], [1, 5]]);
  if (k === 2) { let D = [1, 2, 3, 4, 6, 12], ar = []; for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) if (i !== j && D[j] % D[i] === 0) ar.push([i, j]);
    lat([[0.5, 1], [0.15, 0.55], [0.85, 0.7], [0.3, 0.15], [0.7, 0.3], [0.5, 0]], ar); nodes.forEach((nd, i) => (nd.name = String(D[i]))); }
  if (k === 3) lat([[0.2, 0.8], [0.8, 0.8], [0.5, 0.2], [0.5, 0.55]], [[0, 1], [1, 2], [2, 0], [0, 3]]);
  analyze();
}
// 矢印（と a ≤ a）の表 → 閉包 → 半順序か調べる → ハッセ図
function relFrom(n, ar) { let R = []; for (let i = 0; i < n; i++) { R.push(new Uint8Array(n)); R[i][i] = 1; } for (let [a, b] of ar) R[a][b] = 1; return R; }
function analyze() {
  let n = nodes.length, R0 = relFrom(n, arrows), C = closeRel(R0), miss = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (C[i][j] && !R0[i][j]) miss.push([i, j]);
  let cyc = null; for (let i = 0; i < n && !cyc; i++) for (let j = i + 1; j < n; j++) if (C[i][j] && C[j][i]) { cyc = [i, j]; break; }
  info = { R0, C, miss, cyc, trans: isTransitive(R0), poset: !cyc, lat: null };
  if (!cyc && n > 0) { info.lat = posetFromRel(C, nodes.map((nd) => nd.name)); layoutHasse(info.lat, width * 0.56, 170, width * 0.4, height - 300); }
}
function isCover(a, b) { return info.lat && info.lat.cov.some(([x, y]) => x === a && y === b); }

function draw() {
  background(18, 20, 44);
  stroke(60, 66, 110); line(width * 0.52, 110, width * 0.52, height - 40);
  // ---- 左：自分で描いた矢印（ハッセ図に残る辺 = 水色、推移律で言える辺 = 灰色、閉包で足した辺 = 点線の橙）
  if (showClosure) for (let [a, b] of info.miss) arrowLine(nodes[a], nodes[b], [255, 180, 90], true);
  for (let [a, b] of arrows) arrowLine(nodes[a], nodes[b], info.cyc ? [255, 110, 110] : isCover(a, b) ? [100, 220, 220] : [130, 136, 170], false);
  if (dragFrom >= 0) { stroke(255, 220, 120); strokeWeight(2); line(nodes[dragFrom].x, nodes[dragFrom].y, mouseX, mouseY); }
  textAlign(CENTER, CENTER); textSize(15);
  for (let nd of nodes) { stroke(18, 20, 44); strokeWeight(2); fill(226, 232, 248); circle(nd.x, nd.y, 2 * NODE_R); noStroke(); fill(18, 20, 44); text(nd.name, nd.x, nd.y + 1); }
  textAlign(LEFT, BASELINE);
  // ---- 右：ハッセ図（半順序のときだけ）
  noStroke(); fill(200, 206, 230); textSize(16);
  if (info.lat) { drawHasse(info.lat, { rad: NODE_R, fs: 15 }); text('ハッセ図（被覆 ' + info.lat.cov.length + ' 本、高さ = ランク = 下からの最長の鎖）', width * 0.56, 140); }
  else if (info.cyc) { fill(255, 120, 120); text('反対称律が破れている：' + nodes[info.cyc[0]].name + ' ≤ ' + nodes[info.cyc[1]].name + ' かつ ' + nodes[info.cyc[1]].name + ' ≤ ' + nodes[info.cyc[0]].name, width * 0.56, 140);
    text('矢印が輪になると半順序ではない → ハッセ図は描けない（D で矢印を消す）', width * 0.56, 166); }
  // ---- 文字
  let st = (ok) => (ok ? '✓' : '✗'), np = 0; for (let r of info.C) for (let v of r) np += v;
  fill(240); textSize(18);
  text('半順序とハッセ図　要素 ' + nodes.length + '　矢印 ' + arrows.length + '　閉包の「≤」 ' + (np - nodes.length) + ' 組（a ≤ a を除く）', 20, 36);
  fill(175); textSize(15);
  text('クリック 要素を追加　ドラッグ 矢印 a ≤ b　D 消す　C 全部消す　1 2 3 例　スペース 閉包の矢印 ' + (showClosure ? '表示' : '非表示') + '　R もどす', 20, 62);
  fill(255, 210, 130);
  text('反射律 ' + st(true) + '（a ≤ a は自動で入れる）　反対称律 ' + st(!info.cyc) + '　推移律 ' + st(info.trans) + (info.trans ? '' : '（閉包で ' + info.miss.length + ' 本足す = 橙の点線）') + '　→ ' + (info.poset ? '半順序' : '半順序ではない'), 20, 88);
  fill(150, 156, 190); textSize(13);
  text('水色 = ハッセ図に残る矢印（被覆）　灰色 = 推移律から言えるので省く矢印', 20, height - 16);
  drawSelfTest(width - 180, height - 12);
}

function arrowLine(p, q, c, dashed) {
  let dx = q.x - p.x, dy = q.y - p.y, L = Math.hypot(dx, dy); if (L < 1) return;
  let ux = dx / L, uy = dy / L, x1 = p.x + ux * NODE_R, y1 = p.y + uy * NODE_R, x2 = q.x - ux * (NODE_R + 2), y2 = q.y - uy * (NODE_R + 2);
  stroke(...c); strokeWeight(2);
  if (dashed) { for (let t = 0; t < 1; t += 0.1) line(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, x1 + (x2 - x1) * (t + 0.05), y1 + (y2 - y1) * (t + 0.05)); } else line(x1, y1, x2, y2);
  noStroke(); fill(...c); triangle(x2, y2, x2 - ux * 12 - uy * 6, y2 - uy * 12 + ux * 6, x2 - ux * 12 + uy * 6, y2 - uy * 12 - ux * 6);
}
function nodeNear(x, y) { for (let i = 0; i < nodes.length; i++) if (Math.hypot(nodes[i].x - x, nodes[i].y - y) < NODE_R + 4) return i; return -1; }
function mousePressed() {
  if (mouseX > width * 0.52 || mouseY < 110) return;
  let i = nodeNear(mouseX, mouseY);
  if (i >= 0) dragFrom = i;
  else if (nodes.length < MAX_NODES) { nodes.push({ x: mouseX, y: mouseY, name: 'abcdefghijklmnop'[nodes.length] }); analyze(); }
}
function mouseReleased() {
  if (dragFrom < 0) return;
  let j = nodeNear(mouseX, mouseY);
  if (j >= 0 && j !== dragFrom && !arrows.some(([a, b]) => a === dragFrom && b === j)) { arrows.push([dragFrom, j]); analyze(); }
  dragFrom = -1;
}
function keyPressed() {
  if (key === '1' || key === '2' || key === '3') preset(+key);
  if (key === 'r' || key === 'R') preset(1);
  if (key === 'c' || key === 'C') { nodes = []; arrows = []; analyze(); }
  if ((key === 'd' || key === 'D' || key === 'Backspace') && arrows.length) { arrows.pop(); analyze(); }
  if (key === ' ') showClosure = !showClosure;
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let chain = relFrom(4, [[0, 1], [1, 2], [2, 3]]), Cc = closeRel(chain), np = 0; for (let r of Cc) for (let v of r) np += v;
  check('鎖 0 ≤ 1 ≤ 2 ≤ 3：矢印だけでは推移律が ✗、閉包は半順序で「<」が 6 組、被覆は 3 本', !isTransitive(chain) && isPoset(Cc) && np - 4 === 6 && coversOf(Cc).length === 3);
  check('輪になる関係 a ≤ b ≤ c ≤ a は、閉包すると反対称律 ✗（半順序ではない）', !isAntisym(closeRel(relFrom(3, [[0, 1], [1, 2], [2, 0]]))));
  let bad = relFrom(3, [[0, 1], [1, 2]]);
  check('わざと作った関係（反射・反対称は ✓、推移が ✗）を見分ける', isReflexive(bad) && isAntisym(bad) && !isTransitive(bad));
  let D = divisorPoset(12);
  check('12 の約数の束：要素 6、被覆 7 本（2 3 → 4 6 → 12 …）、12 のランク = 3（素因数の数）', D.n === 6 && D.cov.length === 7 && D.rk[5] === 3);
  seedRng(56); let okAll = true;
  for (let t = 0; t < 30; t++) {
    let lat = randomPoset(4 + Math.floor(rnd() * 10), 0.3), C2 = closeRel(relFrom(lat.n, lat.cov));
    if (!lat.R.every((r, i) => r.every((v, j) => v === C2[i][j]))) okAll = false;                     // 被覆の閉包 = もとの順序
    for (let k = 0; k < lat.cov.length; k++) { let C3 = closeRel(relFrom(lat.n, lat.cov.filter((e, m) => m !== k))); if (C3[lat.cov[k][0]][lat.cov[k][1]]) okAll = false; }   // どの辺も省けない
    for (let [a, b] of lat.cov) if (lat.rk[b] < lat.rk[a] + 1) okAll = false;
  }
  check('ランダムな半順序 30 個：被覆の閉包でもとの順序にもどり、被覆はどれも省けない（最小）、ランクは辺で増える', okAll);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 例 1：a ≤ b ≤ c なのに a ≤ c の矢印がない。橙の点線が閉包で足した矢印。ハッセ図ではどれが残る？
// 2. 例 2：12 の約数の「割り切る」矢印を全部描いた。ハッセ図では何本に減る？
// 3. 例 3 は輪になっている。どの矢印を消すと半順序になる？（D で最後の矢印を消す）
// 4. C で消して、自分の 1 日の予定（「起きる ≤ 朝ごはん」など）を半順序にしてみよう
// 5. 同じハッセ図になる矢印の描き方は何通りある？


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
