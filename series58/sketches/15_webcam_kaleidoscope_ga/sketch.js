// ============================================
// 15 カメラで鏡の万華鏡 ─ 鏡は法線ベクトル、像は −n v n⁻¹ の積で全部作る
// 2〜4 枚の鏡（中心を通る直線）を法線ベクトル n で置く。鏡の積（ベルソル）を幅優先で全部集めると「群」になる
// 鏡のなす角が 180°/k なら像は 2k 個で模様が閉じる（二面体群）。ずれると像がどこまでも増えて、模様が重なってにごる
// ドラッグ：法線の丸 / 2 3 4：鏡の枚数 / K：角を 180°/k にそろえる / ↑↓：k / V：カメラ ⇔ テスト画像 / S：保存 / R：元にもどす
// ============================================

const G2 = makeAlgebra([1, 1]);
let normAng = [Math.PI / 2, Math.PI / 2 + 0.9, 0.3, 1.2];   // ★ 鏡の法線の向き（ラジアン）
let mirrorCount = 2, kSnap = 6, useCam = true;
const CAP_MAX = 48;                     // ★ 集める像の上限（閉じないときの打ち切り）
let cap, testImg, drag = -1, grp = null;
const VIO = [180, 130, 255], CYA = [90, 220, 240], SIL = [215, 220, 230], GOLD = [255, 210, 120];

function setup() {
  createCanvas(windowWidth, windowHeight);
  cap = createCapture(VIDEO, { flipped: true }); cap.size(640, 480); cap.hide();
  testImg = makeTestImage(480);
  selfTest();
}
function normals() { return normAng.slice(0, mirrorCount).map((a) => [Math.cos(a), Math.sin(a)]); }
function camReady() { return useCam && cap && cap.width > 0 && cap.elt.readyState >= 2 && cap.elt.videoWidth > 0; }
// 鏡の法線から生まれる群を幅優先で集める（±W は同じ変換なので行列でくらべる）
function generate(ns, cap0) {
  let gens = ns.map((v) => G2.unit(G2.vec(v))), list = [{ V: G2.scalar(1), M: [1, 0, 0, 1] }], queue = [list[0]];
  while (queue.length && list.length < cap0) {
    let it = queue.shift();
    for (let g of gens) {
      let W = G2.gp(g, it.V), e1 = G2.vecOf(G2.applyVersor(W, G2.blade(1))), e2 = G2.vecOf(G2.applyVersor(W, G2.blade(2))), M = [e1[0], e2[0], e1[1], e2[1]];
      if (list.some((q) => q.M.every((x, i) => Math.abs(x - M[i]) < 1e-6))) continue;
      let el = { V: W, M }; list.push(el); queue.push(el);
      if (list.length >= cap0) break;
    }
  }
  return { list, closed: queue.length === 0 };
}
// 鏡の直線のうち、となりあう 2 本のいちばんせまいすき間（ここを映像の「種」にする）
function seedWedge() {
  let ls = normals().map((n) => (((Math.atan2(n[1], n[0]) + Math.PI / 2) % Math.PI) + Math.PI) % Math.PI).sort((p, q) => p - q);
  ls = ls.filter((a, i) => i === 0 || a - ls[i - 1] > 1e-6);                 // 同じ直線に重なった鏡は 1 本として数える
  if (ls.length > 1 && ls[0] + Math.PI - ls[ls.length - 1] < 1e-6) ls.pop();
  let best = [ls[0], ls[0] + Math.PI];
  for (let i = 0; i < ls.length; i++) { let a = ls[i], b = i + 1 < ls.length ? ls[i + 1] : ls[0] + Math.PI; if (b - a < best[1] - best[0]) best = [a, b]; }
  return best;
}

function draw() {
  background(10);
  let cx = width / 2, cy = height / 2, rad = Math.hypot(width, height) / 2;
  grp = generate(normals(), CAP_MAX);
  let src = camReady() ? cap.elt : testImg.elt, sw = camReady() ? cap.elt.videoWidth : testImg.width, sh = camReady() ? cap.elt.videoHeight : testImg.height;
  let [w0, w1] = seedWedge(), ctx = drawingContext, sc = Math.max((2 * rad) / sw, (2 * rad) / sh);   // 画面のはしまで映像でうめる
  for (let el of grp.list) {
    let M = el.M;                                            // 数学の座標（y 上向き）→ 画面（y 下向き）にするため符号を調整
    ctx.save(); ctx.globalAlpha = grp.closed ? 1 : 0.45;
    ctx.translate(cx, cy); ctx.transform(M[0], -M[2], -M[1], M[3], 0, 0);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, rad, -w1, -w0); ctx.closePath(); ctx.clip();
    if (camReady()) { ctx.scale(-1, 1); }                   // カメラは鏡写し
    ctx.drawImage(src, (-sw * sc) / 2, (-sh * sc) / 2, sw * sc, sh * sc);
    ctx.restore();
  }
  // 鏡の直線と法線（ドラッグできる丸）
  let ns = normals(), hr = Math.min(width, height) * 0.22;
  ns.forEach((n, i) => {
    let t = [-n[1], n[0]], col = i % 2 ? CYA : VIO;
    stroke(col[0], col[1], col[2], 220); strokeWeight(2.5); line(cx - t[0] * rad, cy + t[1] * rad, cx + t[0] * rad, cy - t[1] * rad);
    arrowS(cx, cy, cx + n[0] * hr, cy - n[1] * hr, color(col), 2); noStroke(); fill(col); circle(cx + n[0] * hr, cy - n[1] * hr, 20);
  });
  // ---- 文字（背景を少し暗く）
  let n1 = G2.vec(ns[0]), n2 = G2.vec(ns[1]), rotor = G2.gp(n2, n1), al = Math.atan2(ns[0][0] * ns[1][1] - ns[0][1] * ns[1][0], ns[0][0] * ns[1][0] + ns[0][1] * ns[1][1]);
  noStroke(); fill(0, 170); rect(0, 0, width, 128); rect(0, height - 34, width, 34);
  fill(SIL); textSize(17); textAlign(LEFT, BASELINE);
  text('ドラッグ：法線の丸　2 3 4：鏡 ' + mirrorCount + ' 枚　K：180°/k にそろえる（↑↓ k = ' + kSnap + '）　V：' + (camReady() ? 'カメラ' : 'テスト画像') + '　S：保存　R：元にもどす', 16, 28);
  textSize(15); fill(VIO);
  text('鏡 1 の法線 n = ' + G2.str(n1, 3) + '、鏡 2 の法線 m = ' + G2.str(n2, 3) + '、なす角 α = ' + (Math.abs(al) * 180 / Math.PI).toFixed(2) + '°', 16, 54);
  fill(CYA); text('2 回の反射 = ローター R = mn = ' + G2.str(rotor, 3) + '　→ 2α = ' + (Math.abs(2 * al) * 180 / Math.PI).toFixed(2) + '° の回転', 16, 78);
  fill(grp.closed ? GOLD : [255, 120, 120]);
  text(grp.closed ? '閉じた！ 像は ' + grp.list.length + ' 個（反射 ' + grp.list.filter((e) => G2.isOdd(e.V)).length + ' + 回転 ' + grp.list.filter((e) => !G2.isOdd(e.V)).length + '）= 二面体群 D' + grp.list.length / 2 : '閉じない：' + CAP_MAX + ' 個で打ち切り（半透明の像が重なってにごる）→ K で角をそろえる', 16, 102);
  if (!camReady()) { fill(170); textSize(13); text(useCam ? 'カメラを待っています（許可が必要。V でテスト画像）' : 'テスト画像を表示中', 16, height - 12); }
  drawSelfTest(width - 170, height - 12);
}

function makeTestImage(sz) {             // カメラがないとき用：色の帯と文字
  let g = createGraphics(sz, sz); g.colorMode(HSB, 360, 100, 100); g.noStroke();
  for (let i = 0; i < 24; i++) { g.fill((i * 15) % 360, 70, 95); g.rect(0, (i * sz) / 24, sz, sz / 24 + 1); }
  for (let i = 0; i < 9; i++) { g.fill((i * 40 + 180) % 360, 60, 100); g.circle(sz * (0.15 + 0.1 * i), sz * (0.5 + 0.3 * Math.sin(i)), sz * 0.12); }
  g.fill(0, 0, 100); g.textSize(sz * 0.25); g.textAlign(CENTER, CENTER); g.text('GA', sz * 0.62, sz * 0.4);
  return g;
}

function mousePressed() {
  drag = -1; let hr = Math.min(width, height) * 0.22, best = 30;
  normals().forEach((n, i) => { let d = Math.hypot(mouseX - (width / 2 + n[0] * hr), mouseY - (height / 2 - n[1] * hr)); if (d < best) { best = d; drag = i; } });
}
function mouseDragged() { if (drag >= 0) normAng[drag] = Math.atan2(height / 2 - mouseY, mouseX - width / 2); }
function mouseReleased() { drag = -1; }
function keyPressed() {
  if (key >= '2' && key <= '4') mirrorCount = +key;
  if (key === UP_ARROW) kSnap = Math.min(12, kSnap + 1);
  if (key === DOWN_ARROW) kSnap = Math.max(2, kSnap - 1);
  if (key === 'k' || key === 'K' || key === UP_ARROW || key === DOWN_ARROW) for (let i = 1; i < 4; i++) normAng[i] = normAng[0] + (i * Math.PI) / kSnap;
  if (key === 'v' || key === 'V') useCam = !useCam;
  if (key === 's' || key === 'S') saveCanvas('ga_kaleidoscope', 'png');
  if (key === 'r' || key === 'R') { normAng = [Math.PI / 2, Math.PI / 2 + 0.9, 0.3, 1.2]; mirrorCount = 2; kSnap = 6; }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = []; seedRng(15);
  let ok1 = true, ok2 = true;
  for (let k = 0; k < 40; k++) {
    let n = G2.unit(G2.randVec()), v = G2.randVec(), nv = G2.vecOf(n), vv = G2.vecOf(v), d = nv[0] * vv[0] + nv[1] * vv[1];
    ok1 = ok1 && nearArr(G2.vecOf(G2.reflect(n, v)), [vv[0] - 2 * d * nv[0], vv[1] - 2 * d * nv[1]], 1e-12);
    let m = G2.unit(G2.randVec()), mv = G2.vecOf(m), al = Math.atan2(nv[0] * mv[1] - nv[1] * mv[0], nv[0] * mv[0] + nv[1] * mv[1]);
    ok2 = ok2 && nearArr(G2.vecOf(G2.applyVersor(G2.gp(m, n), v)), matVec(rotMat2(2 * al), vv), 1e-12);
  }
  check('反射 −n v n⁻¹ = ハウスホルダーの式 v − 2(v·n)n', ok1);
  check('2 枚の鏡の積 mn の作用 = 2α の回転行列', ok2);
  let okK = true;
  for (let k = 2; k <= 9; k++) { let g = generate([[1, 0], [Math.cos(Math.PI / k), Math.sin(Math.PI / k)]], 100); okK = okK && g.closed && g.list.length === 2 * k && g.list.filter((e) => G2.isOdd(e.V)).length === k; }
  check('α = 180°/k（k = 2〜9）で像は 2k 個、うち反射が k 個（二面体群 D_k）', okK);
  check('α = 1 rad では ' + CAP_MAX + ' 個で打ち切り（閉じない）', !generate([[1, 0], [Math.cos(1), Math.sin(1)]], CAP_MAX).closed);
  let g3 = generate([[1, 0], [Math.cos(Math.PI / 3), Math.sin(Math.PI / 3)], [Math.cos((2 * Math.PI) / 3), Math.sin((2 * Math.PI) / 3)]], 100);
  check('3 枚の鏡（60° おき）でも群は D3 の 6 個', g3.closed && g3.list.length === 6);
  check('反射の行列式 = −1、回転 = +1（向きが反転するかどうか = ベルソルの偶奇）', g3.list.every((e) => near(e.M[0] * e.M[3] - e.M[1] * e.M[2], G2.isOdd(e.V) ? -1 : 1, 1e-12)));
  let ru = G2.gp(G2.unit(G2.vec([1, 0])), G2.unit(G2.vec([0.3, 0.8])));
  check('単位の法線なら R = mn は R R~ = 1', near(G2.gp(ru, G2.rev(ru))[0], 1, 1e-12));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. K を押して模様が閉じたら、↑↓ で k を変えよう。像の数は？
// 2. 法線の丸を少しだけずらして、模様が閉じなくなる様子を見よう。画面の像の数は？
// 3. 3 を押して鏡を 3 枚に。K でそろえると 3 枚でも同じ群になる？
// 4. 2α が 360° の整数分の 1 でないとき、回転 R を何回くり返しても元にもどらない。なぜ？
// 5. CAP_MAX を大きくすると何が起きる？（重くなるので 200 くらいまで）


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
