// ============================================
// 01 ハミルトンの発見 ─ i² = j² = k² = ijk = −1
// 1, i, j, k の掛け算表を qMul（4 次元ベクトルの積）で計算して並べる。ij = k なのに ji = −k
// 一般の四元数の積は、16 個の「基本の積」を表から足し合わせたもの（分配法則）。それが qMul の式と一致する
// 表のマスをクリック：a·b と b·a を比べる / R：新しい p, q / スペース：i → j → k の輪を回す
// ============================================

const NAMES = ['1', 'i', 'j', 'k'];
const HAMILTON = [['1', 'i', 'j', 'k'], ['i', '−1', 'k', '−j'], ['j', '−k', '−1', 'i'], ['k', 'j', '−i', '−1']];   // 1843 年の表（行 × 列）
let selA = 1, selB = 2;                // 選んだマス（行 a、列 b）
let pq = [[1, 2, -1, 0.5], [0.5, -1, 3, 2]];   // ★ 一般の四元数 p, q
let spin = 0, spinning = false;

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); }
function basis(a) { let v = [0, 0, 0, 0]; v[a] = 1; return v; }
function qName(v) {                    // ±1, ±i, ±j, ±k なら名前に
  for (let a = 0; a < 4; a++) for (let s of [1, -1]) if (qDist(v, qScl(basis(a), s)) < 1e-12) return (s < 0 ? '−' : '') + NAMES[a];
  return qStr(v, 2);
}
function expandMul(p, q) {             // 分配法則：p q = Σ p_a q_b (e_a e_b)、e_a e_b は表から
  let r = [0, 0, 0, 0], terms = [];
  for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) {
    let e = qMul(basis(a), basis(b)); r = qAdd(r, qScl(e, p[a] * q[b])); terms.push([a, b, e]);
  }
  return { r, terms };
}

function draw() {
  background(18, 20, 36);
  if (spinning) spin += 0.01;
  // ---- 掛け算表
  let x0 = 60, y0 = 150, cs = 86;
  textAlign(CENTER, CENTER);
  for (let r = -1; r < 4; r++) for (let c = -1; c < 4; c++) {
    let x = x0 + (c + 1) * cs, y = y0 + (r + 1) * cs;
    if (r < 0 && c < 0) { fill(150); textSize(15); noStroke(); text('a ＼ b', x + cs / 2, y + cs / 2); continue; }
    if (r < 0 || c < 0) { noStroke(); fill(255, 210, 110); textSize(30); text(NAMES[r < 0 ? c : r], x + cs / 2, y + cs / 2); continue; }
    let v = qMul(basis(r), basis(c)), nm = qName(v), on = r === selA && c === selB, tr = r === selB && c === selA;
    stroke(70, 80, 120); strokeWeight(1);
    fill(on ? color(60, 120, 90) : tr ? color(120, 70, 70) : nm[0] === '−' ? color(40, 36, 60) : color(30, 40, 66));
    rect(x, y, cs, cs);
    noStroke(); fill(nm[0] === '−' ? color(255, 150, 150) : color(235)); textSize(30); text(nm, x + cs / 2, y + cs / 2);
  }
  textAlign(LEFT, BASELINE);
  let a = basis(selA), b = basis(selB), ab = qMul(a, b), ba = qMul(b, a);
  fill(240); textSize(22); noStroke();
  text(NAMES[selA] + ' · ' + NAMES[selB] + ' = ' + qName(ab), x0, y0 + 5 * cs + 40);
  fill(ab[0] === ba[0] && qDist(ab, ba) < 1e-12 ? color(130, 230, 150) : color(255, 150, 150));
  text(NAMES[selB] + ' · ' + NAMES[selA] + ' = ' + qName(ba) + (qDist(ab, ba) < 1e-12 ? '　（同じ）' : '　（符号が反対！）'), x0, y0 + 5 * cs + 72);
  fill(180); textSize(14);
  text('4 次元ベクトルとして：' + qStr(a, 0) + ' × ' + qStr(b, 0) + ' = ' + qStr(ab, 0), x0, y0 + 5 * cs + 100);

  // ---- i → j → k の輪
  let cx = 640, cy = 300, rr = 90;
  noFill(); stroke(255, 200, 80, 120); strokeWeight(2); circle(cx, cy, rr * 2);
  for (let n = 0; n < 3; n++) {
    let an = -Math.PI / 2 + spin + (n * 2 * Math.PI) / 3, am = an + Math.PI / 3, px = cx + rr * Math.cos(am), py = cy + rr * Math.sin(am);
    noStroke(); fill(255, 200, 80); push(); translate(px, py); rotate(am + Math.PI / 2); triangle(8, 0, -6, -6, -6, 6); pop();
    fill(30, 40, 66); stroke(255, 200, 80); circle(cx + rr * Math.cos(an), cy + rr * Math.sin(an), 46);
    noStroke(); fill(255); textSize(24); textAlign(CENTER, CENTER); text(NAMES[n + 1], cx + rr * Math.cos(an), cy + rr * Math.sin(an));
  }
  textAlign(LEFT, BASELINE); fill(200); textSize(14);
  text('矢印の向きに掛けると ＋：ij = k, jk = i, ki = j', cx - 160, cy + rr + 50);
  text('逆向きに掛けると −：ji = −k, kj = −i, ik = −j', cx - 160, cy + rr + 72);

  // ---- 一般の積を表から組み立てる
  let [p, q] = pq, ex = expandMul(p, q), direct = qMul(p, q), tx = 900, ty = 130;
  fill(240); textSize(17); text('p = ' + qStr(p, 2), tx, ty); text('q = ' + qStr(q, 2), tx, ty + 24);
  fill(175); textSize(13); text('p q = Σ pₐ q_b (eₐ e_b)：16 個の基本の積を表から足す', tx, ty + 52);
  for (let n = 0; n < 16; n++) {
    let [ia, ib, e] = ex.terms[n], c = p[ia] * q[ib];
    fill(nm0(e) ? color(255, 150, 150) : color(200)); textSize(12);
    text((c >= 0 ? '+' : '−') + Math.abs(c).toFixed(2) + ' (' + NAMES[ia] + NAMES[ib] + ' = ' + qName(e) + ')', tx + (n % 2) * 170, ty + 76 + Math.floor(n / 2) * 18);
  }
  fill(130, 230, 150); textSize(16);
  text('表から：' + qStr(ex.r, 3), tx, ty + 240); text('qMul ：' + qStr(direct, 3), tx, ty + 264);
  fill(255, 150, 150); text('q p  ：' + qStr(qMul(q, p), 3) + '（ちがう）', tx, ty + 288);

  // ---- ブルーム橋
  fill(255, 210, 110); textSize(16); text('1843 年 10 月 16 日、ダブリンのブルーム橋（Broom Bridge）', 640, height - 120);
  fill(200); textSize(14);
  text('散歩中のハミルトンは「3 つ組」ではなく「4 つ組」なら割り算ができると気づき、i² = j² = k² = ijk = −1 を橋の石に刻んだ。いまは記念の銘板がある', 640, height - 96, width - 660, 80);

  fill(240); textSize(20);
  text('ハミルトンの発見　i² = j² = k² = ijk = −1', 20, 36);
  fill(175); textSize(15);
  text('表のマスをクリック：a·b と b·a（赤いマス）を比べる　R：新しい p, q　スペース：i → j → k の輪を回す', 20, 62);
  text('緑 = 選んだ a·b、赤 = 入れかえた b·a。1 は何と掛けても変わらない。i, j, k どうしは順番で符号が変わる', 20, 86);
  drawSelfTest(width - 170, height - 12);
}
function nm0(e) { return e[0] < 0 || e[1] < 0 || e[2] < 0 || e[3] < 0; }

function mousePressed() {
  let x0 = 60, y0 = 150, cs = 86, c = Math.floor((mouseX - x0) / cs) - 1, r = Math.floor((mouseY - y0) / cs) - 1;
  if (r >= 0 && r < 4 && c >= 0 && c < 4) { selA = r; selB = c; }
}
function keyPressed() {
  if (key === 'r' || key === 'R') pq = [0, 1].map(() => [0, 1, 2, 3].map(() => Math.round(Math.random() * 8 - 4) / 2));
  if (key === ' ') spinning = !spinning;
  if (key === RIGHT_ARROW) selB = (selB + 1) % 4;
  if (key === LEFT_ARROW) selB = (selB + 3) % 4;
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = []; seedRng(2);
  let one = [1, 0, 0, 0], m1 = [-1, 0, 0, 0], ii = basis(1), jj = basis(2), kk = basis(3);
  check('i² = j² = k² = −1', [ii, jj, kk].every((e) => qDist(qMul(e, e), m1) === 0));
  check('ijk = −1', qDist(qMul(qMul(ii, jj), kk), m1) === 0);
  check('ij = k, jk = i, ki = j', qDist(qMul(ii, jj), kk) === 0 && qDist(qMul(jj, kk), ii) === 0 && qDist(qMul(kk, ii), jj) === 0);
  check('ji = −k, kj = −i, ik = −j（交換しない）', qDist(qMul(jj, ii), qScl(kk, -1)) === 0 && qDist(qMul(kk, jj), qScl(ii, -1)) === 0 && qDist(qMul(ii, kk), qScl(jj, -1)) === 0);
  let same = true;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (qName(qMul(basis(r), basis(c))) !== HAMILTON[r][c]) same = false;
  check('qMul で作った 4 × 4 の表 = ハミルトンの表', same);
  let e1 = 0, e2 = 0, e3 = 0, nc = 0;
  for (let t = 0; t < 200; t++) {
    let p = qScl(qRandom(), 3 * rnd()), q = qScl(qRandom(), 3 * rnd()), s = qRandom();
    e1 = Math.max(e1, qDist(expandMul(p, q).r, qMul(p, q)));
    e2 = Math.max(e2, qDist(qMul(qMul(p, q), s), qMul(p, qMul(q, s))));
    e3 = Math.max(e3, qDist(qMul(one, p), p), qDist(qMul(p, one), p));
    if (qDist(qMul(p, q), qMul(q, p)) > 1e-6) nc++;
  }
  check('表から足した積（分配法則）= qMul', e1 < 1e-12);
  check('結合法則 (pq)s = p(qs)（200 組）', e2 < 1e-12);
  check('1 は単位元、でも一般に pq ≠ qp（' + nc + ' / 200 組）', e3 === 0 && nc === 200);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. i·j と j·i、j·k と k·j をクリックで比べよう。符号はどうなる？ 輪の矢印と見比べよう
// 2. 表の対角線（i², j², k²）はなぜ全部 −1？ 1 の行と列はなぜ「そのまま」？
// 3. ijk = −1 を、(ij)k = k·k と i(jk) = i·i の 2 通りで計算しよう（結合法則）
// 4. R で p, q を変えよう。p q と q p で、ちがうのはどの成分？（実部は同じ → 02 へ）
// 5. ハミルトンが 3 つ組（1, i, j）で割り算を作れなかった理由を考えよう。i·j はどこに行く？


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
// ---- 四元数 [w, x, y, z] = w + xi + yj + zk（ふつうの配列）
function qMake(w, x, y, z) { return [w, x, y, z]; }
function qMul(a, b) {                  // ハミルトン積（i² = j² = k² = ijk = −1）
  return [a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
          a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
          a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
          a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0]];
}
function qConj(a) { return [a[0], -a[1], -a[2], -a[3]]; }               // 共役 q*
function qAdd(a, b) { return a.map((v, t) => v + b[t]); }
function qSub(a, b) { return a.map((v, t) => v - b[t]); }
function qScl(a, s) { return a.map((v) => v * s); }
function qDot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]; }
function qNorm(a) { return Math.sqrt(qDot(a, a)); }                     // |q|
function qUnit(a) { let n = qNorm(a); return n > 1e-300 ? qScl(a, 1 / n) : [1, 0, 0, 0]; }
function qInv(a) { let n2 = qDot(a, a); return n2 > 1e-300 ? qScl(qConj(a), 1 / n2) : [0, 0, 0, 0]; }   // q⁻¹ = q*/|q|²
function qDist(a, b) { return qNorm(qSub(a, b)); }
function qAxisAngle(n, th) {           // 軸 n（単位ベクトル）まわりに角度 th の回転：cos(th/2) + sin(th/2) n
  let u = v3Unit(n), s = Math.sin(th / 2);
  return [Math.cos(th / 2), u[0] * s, u[1] * s, u[2] * s];
}
function qRot(q, v) {                  // v を q v q* で回す（v は 3 次元ベクトル → 純四元数）
  let r = qMul(qMul(q, [0, v[0], v[1], v[2]]), qConj(q));
  return [r[1], r[2], r[3]];
}
function qToMat(q) {                   // 同じ q から作った 3×3 回転行列（単位四元数のとき）
  let [w, x, y, z] = q;
  return [[1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
          [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
          [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)]];
}
function qExp(a) {                     // exp(w + v) = e^w (cos|v| + sin|v| v/|v|)
  let vn = Math.hypot(a[1], a[2], a[3]), ew = Math.exp(a[0]), s = vn > 1e-12 ? Math.sin(vn) / vn : 1 - (vn * vn) / 6;
  return [ew * Math.cos(vn), ew * s * a[1], ew * s * a[2], ew * s * a[3]];
}
function qLog(a) {                     // log q = ln|q| + acos(w/|q|) v/|v|
  let n = qNorm(a), vn = Math.hypot(a[1], a[2], a[3]), th = Math.atan2(vn, a[0]), s = vn > 1e-12 ? th / vn : 1 / Math.max(n, 1e-300);
  return [Math.log(Math.max(n, 1e-300)), s * a[1], s * a[2], s * a[3]];
}
function qSlerp(a, b, t, shortest) {   // 球面線形補間。shortest = true なら −b と近い方の道
  let d = qDot(a, b);
  if (shortest && d < 0) { b = qScl(b, -1); d = -d; }
  d = clampv(d, -1, 1);
  let om = Math.acos(d), so = Math.sin(om);
  if (so < 1e-9) return qUnit(qAdd(qScl(a, 1 - t), qScl(b, t)));        // ほぼ同じ向き → lerp で十分
  return qAdd(qScl(a, Math.sin((1 - t) * om) / so), qScl(b, Math.sin(t * om) / so));
}
function qNlerp(a, b, t, shortest) {   // 正規化した線形補間（まっすぐ結んで |q| = 1 にもどす）
  if (shortest && qDot(a, b) < 0) b = qScl(b, -1);
  return qUnit(qAdd(qScl(a, 1 - t), qScl(b, t)));
}
function qAngle(a, b) {                // 2 つの姿勢の間の回転角（0〜π）。a⁻¹b の角を atan2 で（小さい角でも正確）
  let d = qMul(qConj(qUnit(a)), qUnit(b));
  return 2 * Math.atan2(Math.hypot(d[1], d[2], d[3]), Math.abs(d[0]));
}
function qRandom() {                   // 一様にランダムな単位四元数（S³ の上の点）
  return qUnit([rndNormal(), rndNormal(), rndNormal(), rndNormal()]);
}
function qStr(a, dg) { dg = dg === undefined ? 3 : dg; return '(' + a.map((v) => (Math.abs(v) < 0.5 * Math.pow(10, -dg) ? 0 : v).toFixed(dg)).join(', ') + ')'; }
// ---- 3 次元ベクトルと 3×3 行列
function v3Dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function v3Cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function v3Len(a) { return Math.hypot(a[0], a[1], a[2]); }
function v3Unit(a) { let n = v3Len(a); return n > 1e-300 ? [a[0] / n, a[1] / n, a[2] / n] : [0, 0, 1]; }
function v3Add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function v3Scl(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
function v3Dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }
function matVec(m, v) { return [0, 1, 2].map((r) => m[r][0] * v[0] + m[r][1] * v[1] + m[r][2] * v[2]); }
function matMul(a, b) { return [0, 1, 2].map((r) => [0, 1, 2].map((c) => a[r][0] * b[0][c] + a[r][1] * b[1][c] + a[r][2] * b[2][c])); }
function matT(a) { return [0, 1, 2].map((r) => [0, 1, 2].map((c) => a[c][r])); }
function matDet(a) { return v3Dot(a[0], v3Cross(a[1], a[2])); }
function matOrthoErr(a) {              // |MᵀM − I| の最大成分（回転行列なら 0）
  let m = matMul(matT(a), a), e = 0;
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) e = Math.max(e, Math.abs(m[r][c] - (r === c ? 1 : 0)));
  return e;
}
function matDiff(a, b) { let e = 0; for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) e = Math.max(e, Math.abs(a[r][c] - b[r][c])); return e; }
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
