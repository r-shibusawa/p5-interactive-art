// ============================================
// 01 幾何積 ab = a·b + a∧b ─ 内積と外積をひとつの掛け算にまとめる
// 2 つのベクトルの幾何積は「スカラー（内積）＋ 二重ベクトル（ウェッジ）」。順番を変えると ba = a·b − a∧b
// ベクトルどうしで掛けると a² = |a|²（ただの数）なので、逆元 a⁻¹ = a/|a|² があり「割り算」ができる
// ドラッグ：a・b の先 / V：a⁻¹ の表示 / 表のマスにマウス：その掛け算の計算 / R：元にもどす
// ============================================

const G2 = makeAlgebra([1, 1]);        // 2 次元の幾何代数 G(2)：基底 1, e1, e2, e12
let va = [2.5, 0.8], vb = [0.9, 2];    // ★ 最初のベクトル
let unitPx = 70;                       // ★ 長さ 1 のピクセル数
let drag = -1, showInv = true;
const VIO = [180, 130, 255], CYA = [90, 220, 240], SIL = [215, 220, 230], GOLD = [255, 210, 120];

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); }
function ox() { return width * 0.27; }
function oy() { return height * 0.62; }
function toPx(v) { return [ox() + v[0] * unitPx, oy() - v[1] * unitPx]; }

function draw() {
  background(14, 14, 18);
  stroke(32); strokeWeight(1);
  for (let x = ox() % unitPx; x < width * 0.55; x += unitPx) line(x, 90, x, height);
  for (let y = oy() % unitPx; y < height; y += unitPx) if (y > 90) line(0, y, width * 0.55, y);
  stroke(70); line(0, oy(), width * 0.55, oy()); line(ox(), 90, ox(), height);
  let a = G2.vec(va), b = G2.vec(vb), ab = G2.gp(a, b), ba = G2.gp(b, a);
  let o = toPx([0, 0]), pa = toPx(va), pb = toPx(vb);
  // a∧b の平行四辺形
  let pab = toPx([va[0] + vb[0], va[1] + vb[1]]), col = ab[3] >= 0 ? VIO : CYA;
  noStroke(); fill(col[0], col[1], col[2], 45); quad(o[0], o[1], pa[0], pa[1], pab[0], pab[1], pb[0], pb[1]);
  // a⁻¹ = a / |a|²（a と同じ向き、長さは 1/|a|）
  if (showInv) {
    let ai = G2.vecOf(G2.inv(a)), pi = toPx(ai);
    arrowS(o[0], o[1], pi[0], pi[1], color(255, 150, 200), 2);
    noStroke(); fill(255, 150, 200); textSize(16); text('a⁻¹', pi[0] + 6, pi[1] + 18);
    noFill(); stroke(255, 150, 200, 60); circle(o[0], o[1], 2 * unitPx);   // 単位円：a と a⁻¹ は単位円をはさんで反対側
  }
  arrowS(o[0], o[1], pa[0], pa[1], color(VIO), 3); arrowS(o[0], o[1], pb[0], pb[1], color(CYA), 3);
  noStroke(); textSize(22); fill(VIO); text('a', pa[0] + 8, pa[1] - 6); fill(CYA); text('b', pb[0] + 8, pb[1] - 6);

  // ---- 右：ab と ba の成分を棒で
  let bx = width * 0.58, by = 130;
  fill(SIL); textSize(17); text('幾何積を成分に分ける（1, e1, e2, e12 の 4 つの数）', bx, by - 22);
  bars(bx, by + 10, 'ab', ab, VIO); bars(bx, by + 160, 'ba', ba, CYA);
  // ---- 掛け算の表（基底どうし）
  let hov = table(bx, by + 340);
  // ---- 文字
  fill(SIL); textSize(18); textAlign(LEFT, BASELINE);
  text('ドラッグ：ベクトルの先　V：a⁻¹ ' + (showInv ? 'ON' : 'off') + '　表のマスにマウス：計算を見る　R：元にもどす', 20, 34);
  textSize(16); let y = 62;
  let row = (s, c) => { fill(c || SIL); text(s, 20, y); y += 24; };
  row('ab = ' + G2.str(ab, 3) + '　= a·b + a∧b', VIO);
  row('ba = ' + G2.str(ba, 3) + '　= a·b − a∧b（二重ベクトルだけ符号が逆）', CYA);
  let a2 = G2.gp(a, a), back = G2.gp(G2.inv(a), ab);
  fill(SIL); textSize(15);
  text('a² = aa = ' + G2.str(a2, 3) + '　= |a|²（ただの数！）　a⁻¹ = a/|a|² = ' + G2.str(G2.inv(a), 3), 20, height - 64);
  text('割り算：a⁻¹(ab) = ' + G2.str(back, 3) + '　→ b がもどってくる（ab を知っていれば a で割って b がわかる）', 20, height - 40);
  if (hov) { fill(GOLD); text(hov, bx, height - 18); }
  drawSelfTest(width - 170, height - 14);
}

// マルチベクトルの 4 つの成分を棒グラフで
function bars(x, y, nm, m, col) {
  let w = 70, sc = 14;
  fill(col); textSize(16); textAlign(LEFT, BASELINE); text(nm, x, y + 60);
  for (let i = 0; i < 4; i++) {
    let cx = x + 50 + i * (w + 20), v = clampv(m[i], -8, 8), base = y + 60;
    noStroke(); fill(40); rect(cx, base - 56, w, 112);
    fill(col[0], col[1], col[2], 200); rect(cx, base, w, -v * sc / 2 * 1.0);
    fill(SIL); textSize(13); textAlign(CENTER, BASELINE);
    text(G2.names[i] + (i === 0 ? '（内積）' : i === 3 ? '（∧）' : ''), cx + w / 2, base + 76);
    text(m[i].toFixed(2), cx + w / 2, base - 60);
  }
  textAlign(LEFT, BASELINE);
}

// 基底どうしの掛け算の表（+ は紫、− は水色）。マウスの下のマスの計算を返す
function table(x, y) {
  let cw = 76, ch = 30, hov = null;
  fill(SIL); textSize(15); text('基底の掛け算表（行 × 列）', x, y - 12);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    let p = G2.gp(G2.blade(i), G2.blade(j)), k = i ^ j, s = p[k];
    let cx = x + (j + 1) * cw, cy = y + (i + 1) * ch;
    let inside = mouseX > cx && mouseX < cx + cw && mouseY > cy && mouseY < cy + ch;
    noStroke(); fill(s > 0 ? color(VIO[0], VIO[1], VIO[2], inside ? 160 : 70) : color(CYA[0], CYA[1], CYA[2], inside ? 160 : 70)); rect(cx + 1, cy + 1, cw - 2, ch - 2);
    fill(240); textSize(15); textAlign(CENTER, CENTER); text((s < 0 ? '−' : '') + G2.names[k], cx + cw / 2, cy + ch / 2);
    if (inside) hov = G2.names[i] + ' × ' + G2.names[j] + ' = ' + (s < 0 ? '−' : '') + G2.names[k] + '　（入れかえ ' + (reorderSign(i, j) < 0 ? '奇数回 → −' : '偶数回 → +') + (i & j ? '、同じ e を e² = 1 で消す' : '') + '）';
  }
  for (let i = 0; i < 4; i++) {
    fill(170); textAlign(CENTER, CENTER);
    text(G2.names[i], x + (i + 1) * cw + cw / 2, y + ch / 2); text(G2.names[i], x + cw / 2, y + (i + 1) * ch + ch / 2);
  }
  textAlign(LEFT, BASELINE);
  fill(150); textSize(14); text('e1e2 = e12、e2e1 = −e12、e12e12 = e1e2e1e2 = −e1e1e2e2 = −1', x, y + 5 * ch + 24);
  return hov;
}

function mousePressed() {
  drag = -1; let best = 30;
  [va, vb].forEach((v, i) => { let s = toPx(v), d = Math.hypot(mouseX - s[0], mouseY - s[1]); if (d < best) { best = d; drag = i; } });
}
function mouseDragged() {
  if (drag < 0) return;
  let v = [clampv(Math.round(((mouseX - ox()) / unitPx) * 10) / 10, -3.5, 3.5), clampv(Math.round(((oy() - mouseY) / unitPx) * 10) / 10, -3.5, 3.5)];
  if (Math.hypot(v[0], v[1]) < 0.1) v = [0.1, 0];           // 長さ 0 には逆元がない
  if (drag === 0) va = v; else vb = v;
}
function mouseReleased() { drag = -1; }
function keyPressed() {
  if (key === 'v' || key === 'V') showInv = !showInv;
  if (key === 'r' || key === 'R') { va = [2.5, 0.8]; vb = [0.9, 2]; }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = []; seedRng(1);
  const G3 = makeAlgebra([1, 1, 1]);
  let okA = true, okB = true, okC = true, okD = true, okE = true, okF = true;
  for (let k = 0; k < 40; k++) {
    let a = G3.randVec(), b = G3.randVec();
    okA = okA && G3.near(G3.gp(a, b), G3.add(G3.inner(a, b), G3.wedge(a, b)));
    okB = okB && G3.near(G3.add(G3.gp(a, b), G3.gp(b, a)), G3.smul(G3.inner(a, b), 2));
    okC = okC && G3.near(G3.gp(a, a), G3.scalar(dot3(G3.vecOf(a), G3.vecOf(a))));
    okD = okD && G3.near(G3.gp(a, G3.inv(a)), G3.scalar(1)) && G3.near(G3.gp(G3.inv(a), G3.gp(a, b)), b);
    let x = G3.rand(), y = G3.rand(), z = G3.rand();
    okE = okE && G3.near(G3.gp(G3.gp(x, y), z), G3.gp(x, G3.gp(y, z)), 1e-12);
    okF = okF && G3.near(G3.gp(x, G3.add(y, z)), G3.add(G3.gp(x, y), G3.gp(x, z)), 1e-12);
  }
  check('ベクトルの幾何積 ab = a·b + a∧b（G(3)、40 組）', okA);
  check('ab + ba = 2 a·b（だから ab ≠ ba のときは a∧b ≠ 0）', okB);
  check('a² = |a|²（スカラー）', okC);
  check('a a⁻¹ = 1、a⁻¹(ab) = b（割り算）', okD);
  check('結合法則 (xy)z = x(yz)（ランダムなマルチベクトル）', okE);
  check('分配法則 x(y + z) = xy + xz', okF);
  let e1 = G2.blade(1), e2 = G2.blade(2), e12 = G2.blade(3);
  check('表：e1e2 = e12、e2e1 = −e12、e1² = e2² = 1、e12² = −1', G2.near(G2.gp(e1, e2), e12) && G2.near(G2.gp(e2, e1), G2.smul(e12, -1)) && G2.near(G2.gp(e1, e1), G2.scalar(1)) && G2.near(G2.gp(e12, e12), G2.scalar(-1)));
  check('平行なら ab = ba（a∧b = 0）、直交なら ab = −ba（a·b = 0）', G2.near(G2.gp(G2.vec([1, 2]), G2.vec([2, 4])), G2.gp(G2.vec([2, 4]), G2.vec([1, 2]))) && G2.near(G2.gp(G2.vec([1, 2]), G2.vec([-2, 1])), G2.smul(G2.gp(G2.vec([-2, 1]), G2.vec([1, 2])), -1)));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. b を a と平行にすると ab と ba はどうなる？ 直角にすると？
// 2. a を短くすると a⁻¹ はどうなる？ a と a⁻¹ の長さを掛けるといくつ？
// 3. 表のマスにマウスをのせて、e12 × e1 と e1 × e12 を手で計算してみよう
// 4. ab のスカラー部分と e12 部分から、a と b のなす角を求めるには？（tan θ = (a∧b)/(a·b)）
// 5. 行列の掛け算と同じように、幾何積も「順番が大事」。どの部分の符号が変わる？


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
