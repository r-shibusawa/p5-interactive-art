// ============================================
// 04 反射 ─ 鏡の法線ベクトル n で v ↦ −n v n⁻¹
// 幾何代数では「鏡」は法線ベクトル 1 本。反射は掛け算 −n v n⁻¹ だけで計算できる（行列も角度もいらない）
// 2 枚の鏡で続けて反射すると、鏡のなす角 α の 2 倍の回転：m(n v n⁻¹)m⁻¹ = (mn) v (mn)⁻¹。R = mn がローター
// ドラッグ：鏡の法線（紫・水色の丸）、図形（黄色の丸）/ K：万華鏡（2 枚の鏡が生む像を全部）/ 2〜8：α = 180°/k にそろえる / R：元にもどす
// ============================================

const G2 = makeAlgebra([1, 1]);
let nA = [1, 0.15], nB = [0.55, 0.9];   // ★ 2 枚の鏡の法線（長さは何でもよい：n⁻¹ が割ってくれる）
let fig = [2.2, 0.9];                   // ★ 図形の位置
let unitPx = 90, drag = -1, kaleido = false;
const SHAPE = [[0, 0], [0.9, 0], [0.9, 0.22], [0.25, 0.22], [0.25, 0.45], [0.65, 0.45], [0.65, 0.65], [0.25, 0.65], [0.25, 1.1], [0, 1.1]];   // 「F」の形（向きがわかる）
const VIO = [180, 130, 255], CYA = [90, 220, 240], SIL = [215, 220, 230], GOLD = [255, 210, 120];

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); }
function toPx(p) { return [width * 0.42 + p[0] * unitPx, height * 0.55 - p[1] * unitPx]; }
function shapeVecs() { return SHAPE.map((p) => G2.vec([fig[0] + (p[0] - 0.4) * 0.8, fig[1] + (p[1] - 0.5) * 0.8])); }
function drawShape(vs, col, al, sw) {
  stroke(col[0], col[1], col[2], al); strokeWeight(sw || 2); fill(col[0], col[1], col[2], al * 0.3);
  polyline(vs.map((v) => toPx(G2.vecOf(v))), true);
}
// 鏡（法線 n に垂直な直線）と法線の矢印
function drawMirror(nv, col) {
  let L = Math.hypot(nv[0], nv[1]), t = [-nv[1] / L, nv[0] / L], far = 12;
  let p1 = toPx([t[0] * far, t[1] * far]), p2 = toPx([-t[0] * far, -t[1] * far]);
  stroke(col[0], col[1], col[2], 200); strokeWeight(3); line(p1[0], p1[1], p2[0], p2[1]);
  let o = toPx([0, 0]), h = toPx(nv);
  arrowS(o[0], o[1], h[0], h[1], color(col), 2); noStroke(); fill(col); circle(h[0], h[1], 16);
}
// 鏡の法線から生まれる群（ベルソルの積）を幅優先で集める。上限 cap 個
function generate(normals, cap) {
  let gens = normals.map((v) => G2.unit(G2.vec(v))), list = [G2.scalar(1)], mats = [[1, 0, 0, 1]], queue = [G2.scalar(1)];
  while (queue.length && list.length < cap) {
    let V = queue.shift();
    for (let g of gens) {
      let W = G2.gp(g, V), e1 = G2.vecOf(G2.applyVersor(W, G2.blade(1))), e2 = G2.vecOf(G2.applyVersor(W, G2.blade(2))), M = [e1[0], e2[0], e1[1], e2[1]];
      if (mats.some((q) => q.every((x, i) => Math.abs(x - M[i]) < 1e-6))) continue;   // ±W は同じ変換
      list.push(W); mats.push(M); queue.push(W);
      if (list.length >= cap) break;
    }
  }
  return { list, closed: queue.length === 0 };
}

function draw() {
  background(14, 14, 18);
  let n = G2.vec(nA), m = G2.vec(nB), vs = shapeVecs();
  let alpha = Math.atan2(nA[0] * nB[1] - nA[1] * nB[0], nA[0] * nB[0] + nA[1] * nB[1]);   // n から m への角
  let rotor = G2.gp(m, n), Ru = G2.smul(rotor, 1 / G2.norm(rotor));
  let grp = null;
  if (kaleido) {
    grp = generate([nA, nB], 60);
    for (let V of grp.list.slice(1)) drawShape(vs.map((v) => G2.applyVersor(V, v)), G2.isOdd(V) ? CYA : VIO, 90, 1.5);
  }
  drawMirror(nA, VIO); drawMirror(nB, CYA);
  let img1 = vs.map((v) => G2.reflect(n, v)), img2 = img1.map((v) => G2.reflect(m, v));
  if (!kaleido) {
    drawShape(img1, VIO, 160); drawShape(img2, [255, 160, 220], 220, 2.5);
    // 回転行列で 2α 回した図形（点線）→ 2 回反射とぴったり重なる
    let M = rotMat2(2 * alpha); stroke(255); strokeWeight(1); noFill(); drawingContext.setLineDash([4, 5]);
    polyline(vs.map((v) => toPx(matVec(M, G2.vecOf(v)))), true); drawingContext.setLineDash([]);
  }
  drawShape(vs, GOLD, 255, 2.5);
  let fp = toPx(fig); noStroke(); fill(GOLD); circle(fp[0], fp[1], 14);
  // ---- 文字
  fill(SIL); textSize(18); textAlign(LEFT, BASELINE);
  text('ドラッグ：鏡の法線・図形　K：万華鏡 ' + (kaleido ? 'ON' : 'off') + '　2〜8：α = 180°/k　R：元にもどす', 20, 34);
  textSize(16); let y = 64, row = (s, c) => { fill(c || SIL); text(s, 20, y); y += 25; };
  row('n = ' + G2.str(n) + '　m = ' + G2.str(m) + '　鏡のなす角 α = ' + (alpha * 180 / Math.PI).toFixed(2) + '°', SIL);
  row('1 回目（紫）：v ↦ −n v n⁻¹　　2 回目（ピンク）：v ↦ −m(−n v n⁻¹)m⁻¹ = (mn) v (mn)⁻¹', VIO);
  row('ローター R = mn = ' + G2.str(rotor, 3) + '　→ 単位にすると ' + G2.str(Ru, 3) + ' = cos(α) − I sin(α)', [255, 160, 220]);
  row('回転角 = 2α = ' + (2 * alpha * 180 / Math.PI).toFixed(2) + '°　（白い点線 = 回転行列で 2α 回した図形。ピンクとぴったり重なる）', SIL);
  if (grp) {
    let k = Math.PI / Math.abs(alpha), isK = Math.abs(k - Math.round(k)) < 1e-6;
    row('万華鏡：像の数 ' + grp.list.length + (grp.closed ? '（閉じた！ 二面体群 D' + grp.list.length / 2 + '、紫 = 回転、水色 = 反射）' : '個以上 → 閉じない（α が 180°/k でないと像がどこまでも増える）'), grp.closed ? GOLD : [255, 120, 120]);
    if (!isK) row('ヒント：2〜8 キーで α を 180°/k にそろえると模様が閉じる', [150, 150, 150]);
  }
  drawSelfTest(width - 170, height - 14);
}

function mousePressed() {
  drag = -1; let best = 26, cands = [nA, nB, fig];
  cands.forEach((p, i) => { let s = toPx(p), d = Math.hypot(mouseX - s[0], mouseY - s[1]); if (d < best) { best = d; drag = i; } });
}
function mouseDragged() {
  if (drag < 0) return;
  let p = [clampv((mouseX - width * 0.42) / unitPx, -4, 4), clampv((height * 0.55 - mouseY) / unitPx, -4, 4)];
  if (drag < 2 && Math.hypot(p[0], p[1]) < 0.3) return;     // 法線が 0 になると鏡が決まらない
  let t = [nA, nB, fig][drag]; t[0] = p[0]; t[1] = p[1];
}
function mouseReleased() { drag = -1; }
function keyPressed() {
  if (key === 'k' || key === 'K') kaleido = !kaleido;
  if (key >= '2' && key <= '8') {
    let a = Math.atan2(nA[1], nA[0]) + Math.PI / +key, L = Math.hypot(nB[0], nB[1]);
    nB[0] = L * Math.cos(a); nB[1] = L * Math.sin(a);
  }
  if (key === 'r' || key === 'R') { nA[0] = 1; nA[1] = 0.15; nB[0] = 0.55; nB[1] = 0.9; fig[0] = 2.2; fig[1] = 0.9; kaleido = false; }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = []; seedRng(4);
  let ok1 = true, ok2 = true, ok3 = true, ok4 = true, ok5 = true;
  for (let k = 0; k < 40; k++) {
    let n = G2.smul(G2.randVec(), 1 + 3 * rnd()), m = G2.smul(G2.randVec(), 0.5 + rnd()), v = G2.randVec();
    let nv = G2.vecOf(n), vv = G2.vecOf(v), r = G2.vecOf(G2.reflect(n, v));
    let nn = nv[0] ** 2 + nv[1] ** 2, d = (vv[0] * nv[0] + vv[1] * nv[1]) / nn;
    ok1 = ok1 && nearArr(r, [vv[0] - 2 * d * nv[0], vv[1] - 2 * d * nv[1]], 1e-12);   // ハウスホルダーの式
    ok2 = ok2 && G2.near(G2.reflect(n, G2.reflect(n, v)), v, 1e-12) && near(Math.hypot(...r), Math.hypot(...vv), 1e-12);
    let mv = G2.vecOf(m), al = Math.atan2(nv[0] * mv[1] - nv[1] * mv[0], nv[0] * mv[0] + nv[1] * mv[1]);
    let twice = G2.vecOf(G2.reflect(m, G2.reflect(n, v))), viaR = G2.vecOf(G2.applyVersor(G2.gp(m, n), v));
    ok3 = ok3 && nearArr(twice, matVec(rotMat2(2 * al), vv), 1e-12) && nearArr(viaR, twice, 1e-12);
    let Ru = G2.unit(G2.gp(m, n));
    ok4 = ok4 && G2.near(G2.gp(Ru, G2.rev(Ru)), G2.scalar(1), 1e-12) && G2.near(G2.rev(G2.gp(m, n)), G2.gp(n, m), 1e-12);
    let perp = G2.vec([-nv[1], nv[0]]);
    ok5 = ok5 && G2.near(G2.reflect(n, perp), perp, 1e-12) && G2.near(G2.reflect(n, n), G2.smul(n, -1), 1e-12);
  }
  check('−n v n⁻¹ = v − 2(v·n)n/|n|²（ハウスホルダーの式と一致、n は単位でなくてよい）', ok1);
  check('同じ鏡で 2 回反射すると元にもどる、長さは変わらない', ok2);
  check('2 回の反射 = 回転行列で 2α 回転 = (mn) v (mn)⁻¹', ok3);
  check('R = mn を単位にすると R R~ = 1、R~ = nm（逆回転）', ok4);
  check('鏡の上のベクトルは動かない、法線は −n になる', ok5);
  let okK = true;
  for (let k = 2; k <= 8; k++) okK = okK && generate([[1, 0], [Math.cos(Math.PI / k), Math.sin(Math.PI / k)]], 100).list.length === 2 * k;
  check('α = 180°/k なら像は 2k 個（二面体群 D_k、k = 2〜8）', okK);
  check('α = 1 rad（180°/k でない）では 60 個をこえても閉じない', !generate([[1, 0], [Math.cos(1), Math.sin(1)]], 60).closed);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 法線を回して、ピンクの図形（2 回反射）が白い点線（回転行列で 2α）といつも重なることを確かめよう
// 2. 2 枚の鏡を平行に近づける（α → 0）と回転はどうなる？ 直角（α = 90°）なら？
// 3. 紫の図形（1 回反射）は「F」が裏返っている。2 回反射すると裏返りはどうなる？
// 4. K で万華鏡。3 を押すと像は何個？ 法線を少しずらすと何が起きる？
// 5. n の長さを変えても反射の結果は変わらない。なぜ？（n⁻¹ = n/|n|²）


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
