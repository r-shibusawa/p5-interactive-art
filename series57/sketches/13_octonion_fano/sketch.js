// ============================================
// 13 八元数とファノ平面 ─ 7 つの虚数単位 e1〜e7 の掛け算
// 7 点 7 本の線（円も 1 本の線）。同じ線の上の 3 つは e_a e_b = e_c（矢印の向きなら ＋、逆なら −）
// 表の積（fanoMul）と、ケーリー-ディクソン構成の積（cdMul、12）が完全に一致することを確かめる
// 点をクリック：1 つ目 a、2 つ目 b で積、3 つ目 c で (ab)c と a(bc) / R：ランダムな八元数を取りかえ / 1〜7：線を順に光らせる
// ============================================

// 点の位置：三角形の頂点・辺の中点・重心（ラベルは FANO_LINES がこの図の線になるように選んだ）
const POS_LABEL = [1, 2, 4, 6, 3, 5, 7];   // 上・左下・右下・下の中点・左の中点・右の中点・重心
let picked = [], lit = -1, xyz;
let cx, cy, rad;

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); seedRng(77); newRandom(); }
function newRandom() { xyz = [cdRandom(8), cdRandom(8), cdRandom(8)]; }
function ptPos(label) {
  let s = POS_LABEL.indexOf(label), T = [cx, cy - rad], BL = [cx - rad * 0.866, cy + rad / 2], BR = [cx + rad * 0.866, cy + rad / 2];
  let mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  return [T, BL, BR, mid(BL, BR), mid(T, BL), mid(T, BR), [cx, cy]][s];
}
function onCircle(L) { return L.every((a) => [6, 3, 5].includes(a)); }
function octName(v) {
  let nz = v.map((x, a) => [x, a]).filter((t) => Math.abs(t[0]) > 1e-12);
  if (nz.length === 0) return '0';
  return nz.map((t, n) => (t[0] < 0 ? '−' : n ? '+' : '') + (Math.abs(Math.abs(t[0]) - 1) < 1e-12 && t[1] ? '' : Math.abs(t[0]).toFixed(Number.isInteger(t[0]) ? 0 : 2)) + (t[1] ? 'e' + t[1] : '')).join(' ');
}

function draw() {
  background(16, 18, 34);
  cx = Math.min(width * 0.27, 380); cy = height * 0.55; rad = Math.min(260, height * 0.33);
  // 7 本の線（向き付き）
  FANO_LINES.forEach((L, n) => {
    let on = n === lit || (picked.length >= 2 && L.includes(picked[0]) && L.includes(picked[1]));
    let col = on ? color(255, 205, 90) : color(110, 150, 220, 170);
    stroke(col); strokeWeight(on ? 4 : 2); noFill();
    if (onCircle(L)) {
      circle(cx, cy + rad / 4, rad);         // 内接円（半径 = rad/2）
      for (let t = 0; t < 3; t++) {          // a → b → c の向きに円の上の矢印
        let p0 = ptPos(L[t]), p1 = ptPos(L[(t + 1) % 3]);
        let a0 = Math.atan2(p0[1] - cy - rad / 4, p0[0] - cx), a1 = Math.atan2(p1[1] - cy - rad / 4, p1[0] - cx);
        let d = Math.atan2(Math.sin(a1 - a0), Math.cos(a1 - a0)), am = a0 + d / 2;
        arrowHead(cx + (rad / 2) * Math.cos(am), cy + rad / 4 + (rad / 2) * Math.sin(am), am + (d > 0 ? Math.PI / 2 : -Math.PI / 2), col);
      }
    } else {
      let P = L.map(ptPos);
      // 両はしの 2 点を結ぶ。矢印は a → b → c → a の向き（となり合う 2 点の間だけ）
      let ends = [[0, 1], [1, 2], [0, 2]].reduce((m, e) => (dd(P[e[0]], P[e[1]]) > dd(P[m[0]], P[m[1]]) ? e : m));
      line(P[ends[0]][0], P[ends[0]][1], P[ends[1]][0], P[ends[1]][1]);
      for (let t = 0; t < 3; t++) { let p0 = P[t], p1 = P[(t + 1) % 3], d = dd(p0, p1); if (d > rad * 1.2) continue; arrowHead((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, Math.atan2(p1[1] - p0[1], p1[0] - p0[0]), col); }
    }
  });
  for (let a = 1; a <= 7; a++) {
    let p = ptPos(a), n = picked.indexOf(a);
    stroke(255); strokeWeight(n >= 0 ? 3 : 1); fill(n === 0 ? color(110, 170, 255) : n === 1 ? color(255, 150, 90) : n === 2 ? color(150, 230, 150) : color(30, 36, 66));
    circle(p[0], p[1], 50); noStroke(); fill(255); textAlign(CENTER, CENTER); textSize(20); text('e' + a, p[0], p[1]);
  }
  textAlign(LEFT, BASELINE);

  // ---- 選んだ単位の積
  let tx = width * 0.55, ty = 130;
  fill(240); noStroke(); textSize(18);
  if (picked.length >= 2) {
    let [a, b] = picked, ea = cdBasis(8, a), eb = cdBasis(8, b);
    let ab = fanoMul(ea, eb), ab2 = cdMul(ea, eb), ba = fanoMul(eb, ea);
    text('e' + a + ' e' + b + ' = ' + octName(ab) + '　（表）', tx, ty);
    text('e' + a + ' e' + b + ' = ' + octName(ab2) + '　（ケーリー-ディクソン）', tx, ty + 26);
    fill(255, 150, 150); text('e' + b + ' e' + a + ' = ' + octName(ba) + (a !== b ? '　（反対の符号）' : ''), tx, ty + 52);
    if (picked.length === 3) {
      let c = picked[2], ec = cdBasis(8, c), l = fanoMul(fanoMul(ea, eb), ec), r = fanoMul(ea, fanoMul(eb, ec)), same = cdMaxAbs(cdSub(l, r)) < 1e-12;
      fill(240); text('(e' + a + ' e' + b + ') e' + c + ' = ' + octName(l), tx, ty + 90);
      text('e' + a + ' (e' + b + ' e' + c + ') = ' + octName(r), tx, ty + 116);
      fill(same ? color(130, 230, 150) : color(255, 150, 150));
      text(same ? '→ 同じ（3 つが同じ線の上、または同じものがある）' : '→ 符号が反対！ 結合法則が成り立たない', tx, ty + 142);
    }
  } else { fill(170); textSize(16); text('点を 2 つクリックすると積、3 つ目で (ab)c と a(bc) を比べる', tx, ty); }

  // ---- ランダムな八元数で確かめる
  let [x, y, z] = xyz, xy = cdMul(x, y);
  let rows = [
    ['|xy|', cdNorm(xy).toFixed(6), '|x||y|', (cdNorm(x) * cdNorm(y)).toFixed(6)],
    ['表の積 − CD の積', cdMaxAbs(cdSub(fanoMul(x, y), xy)).toExponential(1), '', ''],
    ['(xy)z − x(yz)', cdNorm(cdAssoc(x, y, z)).toFixed(4), '← 0 でない（非結合）', ''],
    ['(xx)y − x(xy)', cdNorm(cdAssoc(x, x, y)).toExponential(1), '← 交代的', ''],
    ['(x, y, xy) の結合子', cdNorm(cdAssoc(x, y, xy)).toExponential(1), '← x と y だけなら結合的（アルティン）', ''],
  ];
  fill(255, 210, 110); textSize(17); text('ランダムな八元数 x, y, z（R で取りかえ）', tx, ty + 210);
  textSize(15);
  rows.forEach((r, n) => { fill(190); text(r[0], tx, ty + 240 + n * 26); fill(235); text(r[1], tx + 190, ty + 240 + n * 26); fill(170); text(r[2] + ' ' + r[3], tx + 300, ty + 240 + n * 26); });
  fill(170); textSize(14);
  text('ノルムの積 |xy| = |x||y| は成り立つ（だから 0 でない八元数で割り算ができる）。表の符号を 1 つでもまちがえると、これがくずれる', tx, ty + 390, width - tx - 20, 60);

  fill(240); textSize(20);
  text('八元数とファノ平面　7 本の線 = 7 つの「四元数のコピー」', 20, 36);
  fill(175); textSize(15);
  text('点をクリック：a, b（積）, c（結合法則）。4 つ目で選び直し　R：x, y, z を取りかえ　1〜7：線を 1 本ずつ光らせる　0：消す', 20, 62);
  text('同じ線の 3 つ (a, b, c) は ij = k と同じ：e_a e_b = e_c、e_b e_c = e_a、e_c e_a = e_b。矢印と逆に掛けると −', 20, 86);
  drawSelfTest(width - 170, height - 12);
}
function dd(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }
function arrowHead(x, y, ang, col) {
  push(); translate(x, y); rotate(ang); noStroke(); fill(col); triangle(10, 0, -7, -7, -7, 7); pop();
}

function mousePressed() {
  for (let a = 1; a <= 7; a++) {
    let p = ptPos(a);
    if (dd(p, [mouseX, mouseY]) < 30) { if (picked.length >= 3) picked = []; picked.push(a); return; }
  }
}
function keyPressed() {
  if (key === 'r' || key === 'R') newRandom();
  if (key >= '1' && key <= '7') lit = +key - 1;
  if (key === '0') lit = -1;
  if (key === RIGHT_ARROW) lit = (lit + 1) % 7;
  if (key === LEFT_ARROW) lit = (lit + 6) % 7;
  if (key === ' ') picked = [];
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = []; seedRng(13);
  // cdMul から向き付きの線を求め直して、FANO_LINES と比べる
  let found = [];
  for (let a = 1; a < 8; a++) for (let b = 1; b < 8; b++) if (a !== b) {
    let r = cdMul(cdBasis(8, a), cdBasis(8, b)), c = r.findIndex((v) => v !== 0);
    if (r[c] === 1) { let t = [a, b, c], m = t.indexOf(Math.min(...t)); found.push([t[m], t[(m + 1) % 3], t[(m + 2) % 3]].join()); }
  }
  let want = FANO_LINES.map((L) => L.join());
  check('cdMul の約束から求めた 7 本の向き付きの線 = FANO_LINES', want.every((s) => found.includes(s)) && found.every((s) => want.includes(s)));
  let e1 = 0, e2 = 0, e3 = 0, e4 = 0, e5 = 0;
  for (let t = 0; t < 200; t++) {
    let x = cdRandom(8), y = cdRandom(8), z = cdRandom(8);
    e1 = Math.max(e1, cdMaxAbs(cdSub(fanoMul(x, y), cdMul(x, y))));
    e2 = Math.max(e2, Math.abs(cdNorm(cdMul(x, y)) / (cdNorm(x) * cdNorm(y)) - 1));
    e3 = Math.max(e3, cdMaxAbs(cdAssoc(x, x, y)), cdMaxAbs(cdAssoc(x, y, y)));
    e4 = Math.max(e4, cdMaxAbs(cdAssoc(x, y, cdMul(x, y))), cdMaxAbs(cdAssoc(cdMul(y, x), x, y)), cdMaxAbs(cdAssoc(cdMul(x, x), y, x)));
    e5 = Math.max(e5, cdNorm(cdAssoc(x, y, z)));
  }
  check('表の積（fanoMul）= ケーリー-ディクソンの積（cdMul）：200 組で差 ' + e1.toExponential(1), e1 < 1e-12);
  check('ノルムの積 |xy| = |x||y|（200 組、相対 1e-9）', e2 < 1e-9);
  let u1 = cdBasis(8, 1), u2 = cdBasis(8, 2), u4 = cdBasis(8, 4);
  check('結合法則が破れる：(e1e2)e4 = −e1(e2e4)、ランダムでも結合子 ≠ 0', cdMaxAbs(cdAdd(cdMul(cdMul(u1, u2), u4), cdMul(u1, cdMul(u2, u4)))) === 0 && cdMaxAbs(cdMul(cdMul(u1, u2), u4)) === 1 && e5 > 0.1);
  check('交代的：(xx)y = x(xy)、(xy)y = x(yy)', e3 < 1e-11);
  check('アルティンの定理：x と y から作った元どうしは結合的（(x, y, xy) = 0 など）', e4 < 1e-10);
  let sq = true, anti = true;
  for (let a = 1; a < 8; a++) { if (cdMaxAbs(cdAdd(fanoMul(cdBasis(8, a), cdBasis(8, a)), cdBasis(8, 0))) !== 0) sq = false; for (let b = 1; b < 8; b++) if (a !== b && cdMaxAbs(cdAdd(fanoMul(cdBasis(8, a), cdBasis(8, b)), fanoMul(cdBasis(8, b), cdBasis(8, a)))) !== 0) anti = false; }
  check('e_a² = −1、a ≠ b なら e_a e_b = −e_b e_a', sq && anti);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. e1 → e2 とクリック。結果は？ e2 → e1 では？ 同じ線の上の 3 つが「1 組の i, j, k」になっていることを確かめよう
// 2. 同じ線にない 3 つ（例 e1, e2, e4）をクリック。(ab)c と a(bc) はどうなる？ 同じ線の上の 3 つでは？
// 3. FANO_LINES の 1 本の向きを逆にすると（例 [1, 2, 3] → [1, 3, 2]）、自己テストのどれが ✗ になる？ |xy| = |x||y| は？
// 4. R で何回取りかえても、交代的・アルティンの行は 0 のまま？ (xy)z − x(yz) は？
// 5. 1 本の線の 3 つと 1 で「四元数」ができる。7 本の線 → 四元数のコピーが 7 つ入っている


// ==================================================
// ここから下は「四元数の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 種つきの乱数（同じ種なら毎回同じ列）。自己テストで使う
let rngState = 1;
function seedRng(s) { rngState = (s >>> 0) || 1; }
function rnd() {                       // 0〜1 の一様乱数（mulberry32）
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rndNormal() { let u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
// ---- ケーリー-ディクソン構成：長さ 2ⁿ の配列 = 「数の 2 つ組」(a, b)
//   積の約束 (a, b)(c, d) = (ac − d* b, da + b c*)、共役 (a, b)* = (a*, −b)
//   長さ 1 = 実数、2 = 複素数、4 = 四元数（qMul と一致）、8 = 八元数、16 = 十六元数
function cdConj(x) {
  if (x.length === 1) return [x[0]];
  let h = x.length / 2;
  return cdConj(x.slice(0, h)).concat(x.slice(h).map((v) => -v));
}
function cdMul(x, y) {
  let n = x.length;
  if (n === 1) return [x[0] * y[0]];
  let h = n / 2, a = x.slice(0, h), b = x.slice(h), c = y.slice(0, h), d = y.slice(h);
  let ac = cdMul(a, c), db = cdMul(cdConj(d), b), da = cdMul(d, a), bc = cdMul(b, cdConj(c));
  return ac.map((v, t) => v - db[t]).concat(da.map((v, t) => v + bc[t]));
}
function cdAdd(x, y) { return x.map((v, t) => v + y[t]); }
function cdSub(x, y) { return x.map((v, t) => v - y[t]); }
function cdNorm(x) { return Math.sqrt(x.reduce((s, v) => s + v * v, 0)); }
function cdBasis(n, a, s) { let v = new Array(n).fill(0); v[a] = s === undefined ? 1 : s; return v; }   // e_a
function cdRandom(n) { return Array.from({ length: n }, () => rndNormal()); }
function cdMaxAbs(x) { return x.reduce((m, v) => Math.max(m, Math.abs(v)), 0); }
function cdAssoc(x, y, z) { return cdSub(cdMul(cdMul(x, y), z), cdMul(x, cdMul(y, z))); }   // 結合子 (xy)z − x(yz)
// ---- ファノ平面の掛け算表（上の cdMul の約束から求めた 7 本の向き付きの線）
//   (a, b, c) は e_a e_b = e_c、e_b e_c = e_a、e_c e_a = e_b（逆順はマイナス）、e_a² = −1
const FANO_LINES = [[1, 2, 3], [1, 4, 5], [1, 7, 6], [2, 4, 6], [2, 5, 7], [3, 4, 7], [3, 6, 5]];
function fanoUnit(a, b) {              // e_a e_b = s · e_c を [s, c] で返す（a, b は 0〜7、0 = 実数の 1）
  if (a === 0) return [1, b];
  if (b === 0) return [1, a];
  if (a === b) return [-1, 0];
  for (let L of FANO_LINES) {
    let ia = L.indexOf(a), ib = L.indexOf(b);
    if (ia >= 0 && ib >= 0) { let c = L[3 - ia - ib]; return [(ib - ia + 3) % 3 === 1 ? 1 : -1, c]; }
  }
  return [0, 0];
}
function fanoMul(x, y) {               // 八元数の積を表から（双線形にのばす）
  let r = new Array(8).fill(0);
  for (let a = 0; a < 8; a++) if (x[a] !== 0) for (let b = 0; b < 8; b++) if (y[b] !== 0) {
    let [s, c] = fanoUnit(a, b); r[c] += s * x[a] * y[b];
  }
  return r;
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y, g) {       // g = 描く先（省略で画面、WEBGL では HUD のバッファ）
  g = g || window;
  g.noStroke(); g.fill(selfTestResults.every((r) => r.ok) ? g.color(120, 210, 150) : g.color(255, 90, 90));
  g.textSize(14); g.textAlign(LEFT, BASELINE); g.text(selfTestLine(), x, y);
}
