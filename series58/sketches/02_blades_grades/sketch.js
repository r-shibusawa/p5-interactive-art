// ============================================
// 02 ブレードと次数 ─ 3 次元の幾何代数は 8 つの基底でできている
// 1（スカラー・次数 0）、e1 e2 e3（ベクトル・次数 1）、e12 e23 e13（二重ベクトル = 面・次数 2）、e123（三重ベクトル = 体積・次数 3）
// コンピュータの中では基底を「ビットマスク」で表す：e1 = 001、e2 = 010、e3 = 100、e13 = 101 …（どの e_i を含むか）
// 下の 8 本のスライダ：マルチベクトル A の成分 / 1 2 3：v = e1, e2, e3 / A：A、W：v∧A、L：v⌋A、G：vA を見る / スペース：ランダム / C：0 に
// ============================================

const G3 = makeAlgebra([1, 1, 1]);
let comps = [0.5, 1, 0, 0, 0, 0, 0.8, 0];   // ★ 最初の A の成分（ビットマスク順：1, e1, e2, e12, e3, e13, e23, e123）
let vIdx = 1, view = 'W', dragS = -1;
const GCOL = [[220, 220, 230], [90, 220, 240], [180, 130, 255], [255, 190, 110]];   // 次数 0〜3 の色
const SIL = [215, 220, 230];

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); }
// 斜めから見た 3D → 画面（右手系：x 左下、y 右下、z 上）
function pr(cx, cy, s, x, y, z) { return [cx + (y - x) * 0.87 * s, cy + (x + y) * 0.5 * s - z * s]; }

function draw() {
  background(14, 14, 18);
  let A = Float64Array.from(comps), v = G3.blade(1 << (vIdx - 1));
  let res = view === 'A' ? A : view === 'W' ? G3.wedge(v, A) : view === 'L' ? G3.lc(v, A) : G3.gp(v, A);
  let vname = 'e' + vIdx, rname = view === 'A' ? 'A' : view === 'W' ? vname + '∧A' : view === 'L' ? vname + '⌋A' : vname + 'A';
  // ---- 上：8 つの基底の絵とビットマスク
  let w = Math.min(150, (width - 40) / 8);
  for (let m = 0; m < 8; m++) {
    let cx = 20 + w * m + w / 2, cy = 150, g = G3.grade[m], col = GCOL[g];
    noStroke(); fill(255, 255, 255, 8); rect(cx - w / 2 + 4, 56, w - 8, 150, 8);
    bladeIcon(m, cx, cy - 10, 26, col); noStroke();
    fill(col); textAlign(CENTER, BASELINE); textSize(17); text(G3.names[m], cx, 186);
    fill(150); textSize(13); text(m.toString(2).padStart(3, '0') + '　次数 ' + g, cx, 202);
  }
  // ---- 中：スライダ（A の成分）
  let sy = 250, sh = 150;
  for (let m = 0; m < 8; m++) {
    let cx = 20 + w * m + w / 2, col = GCOL[G3.grade[m]];
    stroke(60); strokeWeight(1); line(cx, sy, cx, sy + sh); line(cx - 14, sy + sh / 2, cx + 14, sy + sh / 2);
    let yy = sy + sh / 2 - comps[m] * (sh / 4);
    noStroke(); fill(col); circle(cx, yy, 18);
    fill(SIL); textSize(13); textAlign(CENTER, BASELINE); text(comps[m].toFixed(2), cx, sy + sh + 18);
  }
  textAlign(LEFT, BASELINE);
  // ---- 下左：次数ごとの大きさの棒（A と結果）
  let gx = 30, gy = height - 40;
  gradeBars(gx, gy, 'A', A); gradeBars(gx + 330, gy, rname, res);
  // ---- 下右：結果を絵で（ベクトル = 矢印、二重ベクトル = 面、三重ベクトル = 立方体）
  drawMV(width * 0.8, height - 150, res);
  // ---- 文字
  fill(SIL); textSize(18);
  text('スライダ：A の成分　1 2 3：v = e1 / e2 / e3（いま ' + vname + '）　A W L G：' + rname + ' を見る　スペース：ランダム　C：0 に', 20, 34);
  textSize(16); fill(GCOL[1]);
  text('A = ' + G3.str(A), 20, 452);
  fill(GCOL[3]); text(rname + ' = ' + G3.str(res), 20, 478);
  fill(150); textSize(14);
  text(view === 'W' ? '∧ は次数を 1 つ上げる（同じ e_i を含むブレードは 0 に消える：ビットが重なる）' : view === 'L' ? '⌋（左縮約）は次数を 1 つ下げる（' + vname + ' を含むブレードだけ残る）' : view === 'G' ? '幾何積 vA = v⌋A + v∧A（下げた部分と上げた部分の和）' : 'A は 8 つの数の組。次数ごとに色分け', 20, 504);
  drawSelfTest(width - 170, height - 14);
}

// 基底ブレードの小さな絵
function bladeIcon(m, cx, cy, s, col) {
  let ax = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], idx = [0, 1, 2].filter((i) => (m >> i) & 1);
  let o = pr(cx, cy, s, 0, 0, 0);
  stroke(70); strokeWeight(1);
  for (let a of ax) { let p = pr(cx, cy, s, a[0] * 1.3, a[1] * 1.3, a[2] * 1.3); line(o[0], o[1], p[0], p[1]); }
  if (idx.length === 0) { noStroke(); fill(col); circle(o[0], o[1], 14); }
  if (idx.length === 1) { let a = ax[idx[0]], p = pr(cx, cy, s, a[0], a[1], a[2]); arrowS(o[0], o[1], p[0], p[1], color(col), 3); }
  if (idx.length >= 2) {
    let faces = idx.length === 2 ? [[idx[0], idx[1]]] : [[0, 1], [1, 2], [0, 2]];
    for (let [i, j] of faces) {
      let u = ax[i], w = ax[j], q = [o, pr(cx, cy, s, ...u), pr(cx, cy, s, u[0] + w[0], u[1] + w[1], u[2] + w[2]), pr(cx, cy, s, ...w)];
      noStroke(); fill(col[0], col[1], col[2], idx.length === 2 ? 110 : 60); quad(q[0][0], q[0][1], q[1][0], q[1][1], q[2][0], q[2][1], q[3][0], q[3][1]);
    }
    if (idx.length === 3) { noFill(); stroke(col); strokeWeight(1.5); let t = pr(cx, cy, s, 1, 1, 1), c = pr(cx, cy, s, 1, 1, 0); line(c[0], c[1], t[0], t[1]); }
  }
}

function gradeBars(x, y, nm, m) {
  fill(SIL); textSize(15); text(nm + ' の次数ごとの大きさ', x, y - 118);
  for (let g = 0; g < 4; g++) {
    let h = Math.min(90, G3.gradeSize(m, g) * 50);
    noStroke(); fill(40); rect(x + g * 70, y - 90, 50, 90);
    fill(GCOL[g]); rect(x + g * 70, y, 50, -h);
    fill(170); textSize(13); textAlign(CENTER, BASELINE); text('次数 ' + g, x + g * 70 + 25, y + 18); textAlign(LEFT, BASELINE);
  }
}

// マルチベクトルの絵：ベクトル部分は矢印、二重ベクトル部分は法線（双対）に垂直な正方形、三重ベクトルは立方体
function drawMV(cx, cy, m) {
  let s = 60, o = pr(cx, cy, s, 0, 0, 0);
  stroke(55); strokeWeight(1);
  for (let a of [[1.6, 0, 0], [0, 1.6, 0], [0, 0, 1.6]]) { let p = pr(cx, cy, s, ...a); line(o[0], o[1], p[0], p[1]); }
  let t = m[7];
  if (Math.abs(t) > 1e-3) {
    let c = Math.cbrt(Math.abs(t)), col = GCOL[3];
    for (let [u, w] of [[[c, 0, 0], [0, c, 0]], [[0, c, 0], [0, 0, c]], [[c, 0, 0], [0, 0, c]]]) {
      let q = [o, pr(cx, cy, s, ...u), pr(cx, cy, s, u[0] + w[0], u[1] + w[1], u[2] + w[2]), pr(cx, cy, s, ...w)];
      noStroke(); fill(col[0], col[1], col[2], t > 0 ? 50 : 25); quad(q[0][0], q[0][1], q[1][0], q[1][1], q[2][0], q[2][1], q[3][0], q[3][1]);
    }
  }
  let nrm = [m[6], -m[5], m[3]], bl = len3(nrm);           // 二重ベクトル → 法線（e23 → x、e31 = −e13 → y、e12 → z）
  if (bl > 1e-3) {
    let nn = nrm.map((x) => x / bl), h = Math.abs(nn[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    let u = cross3(nn, h); u = u.map((x) => x / len3(u)); let w = cross3(nn, u), r = Math.sqrt(bl);
    u = u.map((x) => x * r); w = w.map((x) => x * r);
    let q = [o, pr(cx, cy, s, ...u), pr(cx, cy, s, u[0] + w[0], u[1] + w[1], u[2] + w[2]), pr(cx, cy, s, ...w)];
    noStroke(); fill(GCOL[2][0], GCOL[2][1], GCOL[2][2], 110); quad(q[0][0], q[0][1], q[1][0], q[1][1], q[2][0], q[2][1], q[3][0], q[3][1]);
  }
  let vv = [m[1], m[2], m[4]];
  if (len3(vv) > 1e-3) { let p = pr(cx, cy, s, ...vv); arrowS(o[0], o[1], p[0], p[1], color(GCOL[1]), 3); }
  if (Math.abs(m[0]) > 1e-3) { noStroke(); fill(GCOL[0]); circle(o[0], o[1], 8 + 10 * Math.min(3, Math.abs(m[0]))); }
}

function mousePressed() {
  dragS = -1; let w = Math.min(150, (width - 40) / 8);
  for (let m = 0; m < 8; m++) { let cx = 20 + w * m + w / 2; if (Math.abs(mouseX - cx) < 22 && mouseY > 230 && mouseY < 420) dragS = m; }
  mouseDragged();
}
function mouseDragged() { if (dragS >= 0) comps[dragS] = Math.round(clampv((250 + 75 - mouseY) / 37.5, -2, 2) * 20) / 20; }
function mouseReleased() { dragS = -1; }
function keyPressed() {
  if (key >= '1' && key <= '3') vIdx = +key;
  if ('AWLG'.includes(key.toUpperCase()) && key.length === 1) view = key.toUpperCase();
  if (key === ' ') comps = comps.map(() => Math.round((Math.random() * 4 - 2) * 4) / 4);
  if (key === 'c' || key === 'C') comps = comps.map(() => 0);
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = []; seedRng(2);
  check('ブレードの次数 = ビットの数（e13 = 101 → 2、e123 = 111 → 3）', G3.grade[5] === 2 && G3.grade[7] === 3 && G3.names[5] === 'e13');
  let G5 = makeAlgebra([1, 1, 1, 1, 1]), cnt = (G, k) => G.grade.filter((g) => g === k).length;
  check('次数ごとの基底の数は二項係数：n = 3 → 1, 3, 3, 1、n = 5 → 1, 5, 10, 10, 5, 1（合計 2ⁿ）', [1, 3, 3, 1].every((c, k) => cnt(G3, k) === c) && [1, 5, 10, 10, 5, 1].every((c, k) => cnt(G5, k) === c) && G5.nb === 32);
  check('並べかえの符号：e2e1 = −e12、e3e1 = −e13、e3e2e1 = −e123', reorderSign(2, 1) === -1 && reorderSign(4, 1) === -1 && G3.near(G3.gp(G3.blade(4), G3.blade(2), G3.blade(1)), G3.blade(7, -1)));
  let okW = true, okL = true, okG = true;
  for (let k = 0; k < 30; k++) {
    let v = G3.randVec(), Am = G3.rand();
    for (let g = 0; g <= 3; g++) {
      let Ag = G3.gradePart(Am, g), up = G3.wedge(v, Ag), dn = G3.lc(v, Ag);
      okW = okW && G3.near(up, G3.gradePart(up, g + 1));
      okL = okL && G3.near(dn, g > 0 ? G3.gradePart(dn, g - 1) : G3.zero());
    }
    okG = okG && G3.near(G3.gp(v, Am), G3.add(G3.lc(v, Am), G3.wedge(v, Am)));
  }
  check('∧ は次数を 1 上げる（v∧⟨A⟩_k は次数 k + 1 だけ）', okW);
  check('⌋ は次数を 1 下げる（v⌋⟨A⟩_k は次数 k − 1 だけ、スカラーには 0）', okL);
  check('ベクトル v の幾何積 vA = v⌋A + v∧A', okG);
  check('e1∧e2∧e3 = e123、e1∧e1 = 0、e1⌋e12 = e2', G3.near(G3.wedge(G3.blade(1), G3.blade(2), G3.blade(4)), G3.blade(7)) && G3.isZero(G3.wedge(G3.blade(1), G3.blade(1))) && G3.near(G3.lc(G3.blade(1), G3.blade(3)), G3.blade(2)));
  check('逆順 Ã の符号は次数 0〜3 で +, +, −, −', G3.near(G3.rev(G3.add(G3.scalar(1), G3.blade(1), G3.blade(3), G3.blade(7))), G3.add(G3.scalar(1), G3.blade(1), G3.blade(3, -1), G3.blade(7, -1))));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. A = e12 だけにして、1 2 3 で v を変え W（∧）を見よう。e3∧e12 は？ e1∧e12 は？（ビットが重なると 0）
// 2. L（⌋）で e1⌋e12 と e3⌋e12 を比べよう。どちらが 0？
// 3. G（幾何積）の結果が W と L の和になっていることを、次数の棒で確かめよう
// 4. ビットマスクで e2 と e13 の積の番号は？（2 XOR 5 = 7 → e123、符号は並べかえの回数）
// 5. 4 次元（n = 4）なら基底は何個？ 次数ごとの数は？（makeAlgebra([1,1,1,1]) で確かめられる）


// ==================================================
// ここから下は「幾何代数の道具」（中身は読まなくても OK。消さないでね）
//   マルチベクトル = 2ⁿ 個の数の配列。基底ブレードは「ビットマスク」で番号をつける
//   例（n = 3）：0 = 1、1 = e1、2 = e2、3 = e12、4 = e3、5 = e13、6 = e23、7 = e123（e31 = −e13）
//   幾何積：ブレード a と b を並べかえる回数（入れかえ 1 回で −1）× 同じ e_i が 2 つ並んだら e_i² を掛ける
// ==================================================
function bitCount(x) { let c = 0; while (x) { c += x & 1; x >>= 1; } return c; }
// 基底 a のうしろに基底 b を並べ、標準の順（番号の小さい順）にするまでの入れかえ回数 → 奇数なら −1
function reorderSign(a, b) { a >>= 1; let s = 0; while (a) { s += bitCount(a & b); a >>= 1; } return s & 1 ? -1 : 1; }
// 代数をつくる：metric = 各 e_i の 2 乗（+1 か −1）。[1,1,1] = G(3)、[-1,-1] = Cl(0,2)、[1,-1,-1,-1] = 時空の代数
function makeAlgebra(metric, names) {
  const n = metric.length, nb = 1 << n, tbl = new Float64Array(nb * nb), grade = [];
  for (let a = 0; a < nb; a++) {
    grade.push(bitCount(a));
    for (let b = 0; b < nb; b++) {
      let s = reorderSign(a, b), c = a & b;
      for (let i = 0; i < n; i++) if ((c >> i) & 1) s *= metric[i];   // 同じ e_i どうし → e_i² = ±1
      tbl[a * nb + b] = s;
    }
  }
  const A = { n, nb, metric, grade, tbl };
  A.names = names || grade.map((g, a) => { if (!a) return '1'; let s = 'e'; for (let i = 0; i < n; i++) if ((a >> i) & 1) s += i + 1; return s; });
  A.zero = () => new Float64Array(nb);
  A.scalar = (s) => { let m = A.zero(); m[0] = s; return m; };
  A.blade = (mask, c) => { let m = A.zero(); m[mask] = c === undefined ? 1 : c; return m; };
  A.vec = (v) => { let m = A.zero(); for (let i = 0; i < n; i++) m[1 << i] = v[i] || 0; return m; };
  A.vecOf = (m) => { let v = []; for (let i = 0; i < n; i++) v.push(m[1 << i]); return v; };
  A.add = (...ms) => { let r = A.zero(); for (let m of ms) for (let i = 0; i < nb; i++) r[i] += m[i]; return r; };
  A.sub = (a, b) => a.map((x, i) => x - b[i]);
  A.smul = (a, s) => a.map((x) => x * s);
  // 積の共通部分：kind 0 = 幾何積、1 = 外積 ∧（共通の e_i がないときだけ）、2 = 左縮約 ⌋（a のブレードが b に含まれるときだけ）
  function prod(a, b, kind) {
    const r = new Float64Array(nb);
    for (let i = 0; i < nb; i++) {
      const x = a[i]; if (x === 0) continue;
      for (let j = 0; j < nb; j++) {
        const y = b[j]; if (y === 0) continue;
        if (kind === 1 && (i & j)) continue;
        if (kind === 2 && (i & j) !== i) continue;
        r[i ^ j] += tbl[i * nb + j] * x * y;
      }
    }
    return r;
  }
  A.gp = (a, b, ...more) => { let r = prod(a, b, 0); for (let m of more) r = prod(r, m, 0); return r; };
  A.wedge = (a, b, ...more) => { let r = prod(a, b, 1); for (let m of more) r = prod(r, m, 1); return r; };
  A.lc = (a, b) => prod(a, b, 2);
  A.inner = (a, b) => A.gradePart(A.gp(a, b), 0);                // ベクトルどうしなら a·b
  A.sp = (a, b) => A.gp(a, b)[0];                                  // スカラー部分
  A.gradePart = (a, k) => a.map((x, i) => (grade[i] === k ? x : 0));
  A.gradeSize = (a, k) => { let s = 0; for (let i = 0; i < nb; i++) if (grade[i] === k) s += a[i] * a[i]; return Math.sqrt(s); };
  A.rev = (a) => a.map((x, i) => ((grade[i] * (grade[i] - 1)) / 2) % 2 ? -x : x);   // 逆順 ã（掛ける順を逆に）
  A.ginv = (a) => a.map((x, i) => (grade[i] % 2 ? -x : x));       // 次数の反転（奇数次に −）
  A.normSq = (a) => A.gp(a, A.rev(a))[0];
  A.norm = (a) => Math.sqrt(Math.abs(A.normSq(a)));
  A.unit = (a) => A.smul(a, 1 / (A.norm(a) || 1));
  A.inv = (a) => { let r = A.rev(a), s = A.gp(a, r); return A.smul(r, 1 / s[0]); };   // 逆元（ベクトル・ブレード・ベルソル用：a ã がスカラー）
  A.pss = A.blade(nb - 1);                                         // 擬スカラー（一番上のブレード）
  A.dualOf = (a) => A.gp(a, A.inv(A.pss));                         // 双対 a* = a I⁻¹
  A.undual = (a) => A.gp(a, A.pss);
  A.meet = (a, b) => A.undual(A.wedge(A.dualOf(a), A.dualOf(b)));  // 交わり（向きと大きさは決めかた次第）
  A.sandwich = (R, x) => A.gp(R, x, A.rev(R));                     // R x R~（回転）
  A.reflect = (nv, x) => A.smul(A.gp(nv, x, A.inv(nv)), -1);       // −n x n⁻¹（法線 n の鏡で反射）
  A.isOdd = (V) => { let o = 0, e = 0; for (let i = 0; i < nb; i++) if (grade[i] % 2) o += V[i] * V[i]; else e += V[i] * V[i]; return o > e; };
  A.applyVersor = (V, x) => A.smul(A.gp(V, x, A.inv(V)), A.isOdd(V) ? -1 : 1);   // ±V x V⁻¹（鏡 k 枚の積なら符号 (−1)^k）
  // 二重ベクトル B の指数関数 e^B：B² がスカラーなら閉じた式、そうでなければ級数（割って 2 乗をくり返す）
  A.expB = (B, forceSeries) => {
    let b2 = A.gp(B, B), rest = 0;
    for (let i = 1; i < nb; i++) rest += Math.abs(b2[i]);
    if (!forceSeries && rest < 1e-12) {
      let s = b2[0], r = A.zero(), c, k;
      if (s < -1e-15) { let t = Math.sqrt(-s); c = Math.cos(t); k = Math.sin(t) / t; }
      else if (s > 1e-15) { let t = Math.sqrt(s); c = Math.cosh(t); k = Math.sinh(t) / t; }
      else { c = 1; k = 1; }
      for (let i = 0; i < nb; i++) r[i] = k * B[i];
      r[0] += c; return r;
    }
    let sz = 0; for (let x of B) sz = Math.max(sz, Math.abs(x));
    let sq = 0; while (sz > 0.25 && sq < 40) { sz /= 2; sq++; }
    let X = A.smul(B, 1 / Math.pow(2, sq)), term = A.scalar(1), sum = A.scalar(1);
    for (let k = 1; k < 30; k++) { term = A.smul(A.gp(term, X), 1 / k); sum = A.add(sum, term); }
    for (let k = 0; k < sq; k++) sum = A.gp(sum, sum);
    return sum;
  };
  A.near = (a, b, tol) => { tol = tol === undefined ? 1e-9 : tol; for (let i = 0; i < nb; i++) if (!(Math.abs(a[i] - b[i]) <= tol)) return false; return true; };
  A.isZero = (a, tol) => A.near(a, A.zero(), tol);
  A.rand = () => { let m = A.zero(); for (let i = 0; i < nb; i++) m[i] = rnd() * 2 - 1; return m; };
  A.randVec = () => A.vec(Array.from({ length: n }, () => rnd() * 2 - 1));
  // 文字にする：「1.20 + 0.50 e12」
  A.str = (a, d) => {
    d = d === undefined ? 2 : d; let s = '';
    for (let i = 0; i < nb; i++) {
      let x = a[i]; if (Math.abs(x) < Math.pow(10, -d) / 2) continue;
      let v = Math.abs(x).toFixed(d);
      s += (s ? (x < 0 ? ' − ' : ' + ') : x < 0 ? '−' : '') + (i ? (v === (1).toFixed(d) ? '' : v + ' ') + A.names[i] : v);
    }
    return s || '0';
  };
  return A;
}

// ---- 比べるための「ふつうの」計算（行列・外積・行列式）
function dot3(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross3(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function len3(a) { return Math.sqrt(dot3(a, a)); }
function det3(a, b, c) { return dot3(a, cross3(b, c)); }
function matVec(M, v) { return M.map((r) => r.reduce((s, x, j) => s + x * v[j], 0)); }
function matMul(P, Q) { return P.map((r) => Q[0].map((_, j) => r.reduce((s, x, k) => s + x * Q[k][j], 0))); }
function rotMat2(t) { return [[Math.cos(t), -Math.sin(t)], [Math.sin(t), Math.cos(t)]]; }
function rodrigues(ax, t) {             // 軸 ax（単位ベクトル）まわりに角 t 回す行列
  let [x, y, z] = ax, c = Math.cos(t), s = Math.sin(t), k = 1 - c;
  return [[c + x * x * k, x * y * k - z * s, x * z * k + y * s], [y * x * k + z * s, c + y * y * k, y * z * k - x * s], [z * x * k - y * s, z * y * k + x * s, c + z * z * k]];
}
function nearArr(a, b, tol) { tol = tol === undefined ? 1e-9 : tol; return a.length === b.length && a.every((x, i) => Math.abs(x - b[i]) <= tol); }
// ---- 種つきの乱数（自己テストで毎回同じ数を使う）
let rngState = 1;
function seedRng(s) { rngState = (s >>> 0) || 1; }
function rnd() {
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
// ---- 描く道具（画面の座標）
function arrowS(x1, y1, x2, y2, col, sw, g) {
  g = g || window; let a = Math.atan2(y2 - y1, x2 - x1), h = 8 + (sw || 2) * 2;
  g.stroke(col); g.strokeWeight(sw || 2); g.line(x1, y1, x2, y2);
  if (Math.hypot(x2 - x1, y2 - y1) < 2) return;
  g.noStroke(); g.fill(col);
  g.triangle(x2, y2, x2 - h * Math.cos(a - 0.4), y2 - h * Math.sin(a - 0.4), x2 - h * Math.cos(a + 0.4), y2 - h * Math.sin(a + 0.4));
}
function polyline(pts, closed) {        // 点が 2 つ以上あるときだけ折れ線を描く
  if (pts.length < 2) return;
  beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape(closed ? CLOSE : undefined);
}
// ---- 3D（WEBGL）の画面の文字：HTML の文字を重ねる（カメラを回しても動かない）
let hudDiv = null, hudTestDiv = null;
function makeHud() {
  hudDiv = createDiv(''); hudDiv.position(16, 8);
  hudDiv.style('color', '#d7dce6'); hudDiv.style('font', '15px/1.6 sans-serif'); hudDiv.style('pointer-events', 'none'); hudDiv.style('white-space', 'pre');
  hudTestDiv = createDiv(selfTestLine()); hudTestDiv.style('font', '14px sans-serif'); hudTestDiv.style('pointer-events', 'none');
  hudTestDiv.style('position', 'fixed'); hudTestDiv.style('right', '20px'); hudTestDiv.style('bottom', '10px');
  hudTestDiv.style('color', selfTestResults.every((r) => r.ok) ? '#96dcc8' : '#ff646e');
}
function hudSet(s) { if (hudDiv && frameCount % 4 === 1) hudDiv.html(s); }
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let k = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (k === selfTestResults.length ? '✓ ' : '✗ ') + k + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y, g) {
  g = g || window; g.noStroke();
  if (selfTestResults.every((r) => r.ok)) g.fill(150, 220, 200); else g.fill(255, 100, 110);
  g.textSize(14); g.textAlign(LEFT, BASELINE); g.text(selfTestLine(), x, y);
}
