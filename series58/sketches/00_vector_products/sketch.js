// ============================================
// 00 内積と外積のその先 ─ ベクトルの「掛け算」を 3 つ並べる
// 内積 a·b（スカラー：どれだけ同じ向きか）、外積 a×b（3 次元でだけ決まる法線ベクトル）、
// ウェッジ積 a∧b（向き付きの平行四辺形 = 二重ベクトル）。a∧b = −b∧a、a∧a = 0、|a∧b| = |a||b| sin θ
// ドラッグ：a・b の先を動かす / S：a と b を入れかえる（向きが逆になる）/ P：射影の表示 / R：元にもどす
// ============================================

const G3 = makeAlgebra([1, 1, 1]);     // 3 次元の幾何代数 G(3)（平面のベクトルは z = 0 として入れる）
let va = [3, 1], vb = [1.2, 2.5];      // ★ 最初のベクトル（単位 = マス目 1 つ）
let unitPx = 70;                       // ★ 長さ 1 のピクセル数
let drag = -1, swapped = false, showProj = true;
const VIO = [180, 130, 255], CYA = [90, 220, 240], SIL = [215, 220, 230];

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); }
function ox() { return width * 0.36; }
function oy() { return height * 0.6; }
function toPx(v) { return [ox() + v[0] * unitPx, oy() - v[1] * unitPx]; }

function draw() {
  background(14, 14, 18);
  drawGrid();
  let p = swapped ? vb : va, q = swapped ? va : vb;     // 1 つ目と 2 つ目（S で入れかえ）
  let a = G3.vec([p[0], p[1], 0]), b = G3.vec([q[0], q[1], 0]);
  let ab = G3.inner(a, b)[0], wd = G3.wedge(a, b), w12 = wd[3];
  let cr = cross3([p[0], p[1], 0], [q[0], q[1], 0]);
  let la = Math.hypot(p[0], p[1]), lb = Math.hypot(q[0], q[1]);
  let th = Math.atan2(p[0] * q[1] - p[1] * q[0], p[0] * q[0] + p[1] * q[1]);
  // ---- a∧b：平行四辺形（反時計回り = +、紫 / 時計回り = −、水色）
  let o = toPx([0, 0]), pa = toPx(p), pb = toPx(q), pab = toPx([p[0] + q[0], p[1] + q[1]]);
  let col = w12 >= 0 ? VIO : CYA;
  noStroke(); fill(col[0], col[1], col[2], 60); quad(o[0], o[1], pa[0], pa[1], pab[0], pab[1], pb[0], pb[1]);
  stroke(col[0], col[1], col[2], 160); strokeWeight(1); drawingContext.setLineDash([5, 5]);
  line(pa[0], pa[1], pab[0], pab[1]); line(pb[0], pb[1], pab[0], pab[1]); drawingContext.setLineDash([]);
  circulation((o[0] + pab[0]) / 2, (o[1] + pab[1]) / 2, Math.atan2(-p[1], p[0]), th, col);
  // ---- a·b：b を a の向きに射影した長さ × |a|
  if (showProj && la > 1e-6) {
    let t = ab / (la * la), pr = toPx([p[0] * t, p[1] * t]);
    stroke(255, 210, 120, 180); strokeWeight(1); drawingContext.setLineDash([3, 4]); line(pb[0], pb[1], pr[0], pr[1]); drawingContext.setLineDash([]);
    stroke(255, 210, 120); strokeWeight(5); line(o[0], o[1], pr[0], pr[1]);
  }
  arrowS(o[0], o[1], pa[0], pa[1], color(VIO), 3); arrowS(o[0], o[1], pb[0], pb[1], color(CYA), 3);
  noStroke(); fill(VIO); textSize(22); text(swapped ? 'b' : 'a', pa[0] + 10, pa[1] - 8); fill(CYA); text(swapped ? 'a' : 'b', pb[0] + 10, pb[1] - 8);
  inset3d(p, q, cr, w12);
  // ---- 文字
  let first = swapped ? 'b' : 'a', second = swapped ? 'a' : 'b';
  fill(SIL); textSize(18); textAlign(LEFT, BASELINE);
  text('ドラッグ：ベクトルの先　S：順番を入れかえる（いま ' + first + '∧' + second + '）　P：射影 ' + (showProj ? 'ON' : 'off') + '　R：元にもどす', 20, 34);
  let y = 76; textSize(17);
  let row = (s, c) => { fill(c || SIL); text(s, 20, y); y += 28; };
  row('a = (' + va[0].toFixed(2) + ', ' + va[1].toFixed(2) + ')　b = (' + vb[0].toFixed(2) + ', ' + vb[1].toFixed(2) + ')　θ = ' + (th * 180 / Math.PI).toFixed(1) + '°（1 つ目から 2 つ目へ）');
  row('内積 ' + first + '·' + second + ' = ' + ab.toFixed(3) + '　= |a||b| cos θ = ' + (la * lb * Math.cos(th)).toFixed(3) + '　（スカラー・次数 0。黄色の線 = 射影 × |a|）', [255, 210, 120]);
  row('ウェッジ ' + first + '∧' + second + ' = ' + G3.str(wd, 3) + '　（二重ベクトル・次数 2 = 向き付きの面積）', col);
  row('面積 |' + first + '∧' + second + '| = ' + Math.abs(w12).toFixed(3) + '　= |a||b| |sin θ| = ' + (la * lb * Math.abs(Math.sin(th))).toFixed(3), col);
  row(second + '∧' + first + ' = ' + G3.str(G3.wedge(b, a), 3) + '（符号が逆）　a∧a = ' + G3.str(G3.wedge(a, a)), SIL);
  row('外積 ' + first + '×' + second + ' = (' + cr.map((v) => v.toFixed(3)).join(', ') + ')　← 3 次元の法線。数は a∧b と同じ（右上の図）', [150, 200, 160]);
  fill(150); textSize(14);
  text('外積 × は 3 次元でしか法線が 1 本に決まらないが、∧ は「面そのもの」なので 2 次元でも 4 次元でも同じ式で使える', 20, height - 40);
  drawSelfTest(width - 170, height - 14);
}

// 1 つ目から 2 つ目へ回る向きの小さな矢印
function circulation(cx, cy, a0, th, col) {
  let r = 34, n = 24, pts = [];
  for (let i = 0; i <= n; i++) { let t = a0 - (th * i) / n; pts.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]); }
  noFill(); stroke(col); strokeWeight(2); polyline(pts);
  let e = pts[n], d = pts[n - 1];
  arrowS(d[0], d[1], e[0], e[1], color(col), 2);
}

// 右上の小窓：3 次元で見た a、b、a∧b（xy 平面の面）と a×b（法線）
function inset3d(p, q, cr, w12) {
  let cx = width - 230, cy = 230, s = 34;
  let pr = (x, y, z) => [cx + (y - x) * 0.87 * s, cy + (x + y) * 0.5 * s - z * s];
  noStroke(); fill(255, 255, 255, 8); rect(cx - 200, cy - 190, 400, 330, 10);
  stroke(70); strokeWeight(1);
  for (let k = -3; k <= 3; k++) { let a1 = pr(k, -3, 0), a2 = pr(k, 3, 0), b1 = pr(-3, k, 0), b2 = pr(3, k, 0); line(a1[0], a1[1], a2[0], a2[1]); line(b1[0], b1[1], b2[0], b2[1]); }
  let sc = 0.6, o = pr(0, 0, 0), A = pr(p[0] * sc, p[1] * sc, 0), B = pr(q[0] * sc, q[1] * sc, 0), AB = pr((p[0] + q[0]) * sc, (p[1] + q[1]) * sc, 0);
  let col = w12 >= 0 ? VIO : CYA;
  noStroke(); fill(col[0], col[1], col[2], 70); quad(o[0], o[1], A[0], A[1], AB[0], AB[1], B[0], B[1]);
  arrowS(o[0], o[1], A[0], A[1], color(VIO), 2); arrowS(o[0], o[1], B[0], B[1], color(CYA), 2);
  let N = pr(0, 0, clampv(cr[2] * sc * sc, -4, 4));
  arrowS(o[0], o[1], N[0], N[1], color(150, 200, 160), 3);
  noStroke(); fill(170); textSize(13); textAlign(CENTER, BASELINE);
  text('3 次元で見ると：a∧b は面、a×b はその法線', cx, cy + 128); textAlign(LEFT, BASELINE);
}

function drawGrid() {
  stroke(32); strokeWeight(1);
  for (let x = ox() % unitPx; x < width; x += unitPx) line(x, 0, x, height);
  for (let y = oy() % unitPx; y < height; y += unitPx) line(0, y, width, y);
  stroke(70); line(0, oy(), width, oy()); line(ox(), 0, ox(), height);
}

function mousePressed() {
  drag = -1; let best = 30;
  [va, vb].forEach((v, i) => { let s = toPx(v), d = Math.hypot(mouseX - s[0], mouseY - s[1]); if (d < best) { best = d; drag = i; } });
}
function mouseDragged() {
  if (drag < 0) return;
  let v = [Math.round(((mouseX - ox()) / unitPx) * 10) / 10, Math.round(((oy() - mouseY) / unitPx) * 10) / 10];
  v = [clampv(v[0], -8, 8), clampv(v[1], -6, 6)];
  if (drag === 0) va = v; else vb = v;
}
function mouseReleased() { drag = -1; }
function keyPressed() {
  if (key === 's' || key === 'S') swapped = !swapped;
  if (key === 'p' || key === 'P') showProj = !showProj;
  if (key === 'r' || key === 'R') { va = [3, 1]; vb = [1.2, 2.5]; swapped = false; }
  return false;
}

// ---- 自己テスト：ランダムなベクトルで性質を確かめる
function selfTest() {
  selfTestResults = []; seedRng(58);
  let ok1 = true, ok2 = true, ok3 = true, ok4 = true, ok5 = true, ok6 = true, ok7 = true;
  for (let k = 0; k < 50; k++) {
    let a = G3.randVec(), b = G3.randVec(), c = G3.randVec(), av = G3.vecOf(a), bv = G3.vecOf(b);
    ok1 = ok1 && G3.near(G3.wedge(a, b), G3.smul(G3.wedge(b, a), -1));
    ok2 = ok2 && G3.isZero(G3.wedge(a, a));
    let la = len3(av), lb = len3(bv), sn = Math.sqrt(Math.max(0, 1 - (dot3(av, bv) / (la * lb)) ** 2));
    ok3 = ok3 && near(G3.gradeSize(G3.wedge(a, b), 2), la * lb * sn, 1e-9);
    let w = G3.wedge(a, b), cr = cross3(av, bv);
    ok4 = ok4 && nearArr([w[6], -w[5], w[3]], cr);
    ok5 = ok5 && G3.near(G3.inner(a, b), G3.smul(G3.add(G3.gp(a, b), G3.gp(b, a)), 0.5)) && G3.near(w, G3.smul(G3.sub(G3.gp(a, b), G3.gp(b, a)), 0.5));
    ok6 = ok6 && near(dot3(av, bv) ** 2 + G3.gradeSize(w, 2) ** 2, la * la * lb * lb);
    ok7 = ok7 && G3.near(G3.wedge(G3.add(a, c), b), G3.add(G3.wedge(a, b), G3.wedge(c, b)));
  }
  check('a∧b = −b∧a（ランダムな 50 組）', ok1);
  check('a∧a = 0', ok2);
  check('|a∧b| = |a||b| sin θ', ok3);
  check('a∧b の成分（e23, −e13, e12）= a×b の成分', ok4);
  check('a·b = (ab + ba)/2、a∧b = (ab − ba)/2', ok5);
  check('(a·b)² + |a∧b|² = |a|²|b|²（ラグランジュの恒等式）', ok6);
  check('∧ は線形：(a + c)∧b = a∧b + c∧b', ok7);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. b を a と同じ向きにすると、a·b と a∧b はそれぞれどうなる？ 直角にすると？
// 2. S で順番を入れかえて、平行四辺形の色（向き）と a∧b の符号が変わることを確かめよう
// 3. 面積 |a∧b| が最大になるのは θ が何度のとき？ |a||b| と比べよう
// 4. 右上の図の緑の法線 a×b の長さは、平行四辺形の面積と同じ。4 次元だと法線はどうなる？（06 へ）
// 5. unitPx を変えて、画面を広く使ってみよう


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
