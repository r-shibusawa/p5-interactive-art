// ============================================
// 15 結び目ブラシ ＋ カメラ 📷
// 描いた線どうしが交わると、自動で「上・下・上・下…」と交互に重なる（交代結び目の編み目）。ケルト文様のような組みひも模様に
//   背景にカメラの映像（使えないときは無地）。線の終わりを始まりの近くで離すと輪になり、全部が輪なら不変量も計算する
// ドラッグ = 描く / 1・2・4 = 対称（1 回・2 回・4 回回転）/ V = カメラ / ↑↓ = 帯の太さ / S = 保存 / C = 消す
// ============================================

let strokes = [];            // 描き終わった線（画面の点の列）。closed = 輪か
let cur = null;              // いま描いている線
let sym = 4;                 // ★ 回転対称の数
let bandW = 14;              // ★ 帯の太さ
let spacing = 8;             // ★ 点の間かく（px）
let maxPts = 1800;           // ★ 点の数の上限（多いと重い）
let cap, useCam = true;
let D = null, curves = [], info = '';
let PAL;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  PAL = [color(38, 45, 95), color(10, 70, 95), color(205, 45, 95), color(140, 40, 85)];
  cap = createCapture(VIDEO, { flipped: true });
  cap.size(160, 120);
  cap.hide();
}

// 対称にした全部の線（回転して増やす）
function buildCurves() {
  curves = [];
  let cx = width / 2, cy = height / 2;
  strokes.forEach((s, si) => {
    for (let k = 0; k < sym; k++) {
      let a = (TWO_PI * k) / sym, ca = Math.cos(a), sa = Math.sin(a);
      curves.push({ si, closed: s.closed, pts: s.pts.map(([x, y]) => [cx + (x - cx) * ca - (y - cy) * sa, cy + (x - cx) * sa + (y - cy) * ca]) });
    }
  });
  analyse();
}

// ★ 交点を見つけて、線に沿って「上・下・上・下」と交互に決める
function analyse() {
  if (!curves.length) { D = null; info = ''; return; }
  let math = curves.map((c) => (c.closed ? c.pts.concat([c.pts[0]]) : c.pts).map(([x, y]) => [x, -y, 0]));
  let D0 = diagramOf(math, true, (A, B) => A.ci < B.ci || (A.ci === B.ci && A.i < B.i));
  let overOf = {}, key = (A, B) => (A.ci < B.ci || (A.ci === B.ci && A.i < B.i) ? A.ci + ':' + A.i + '|' + B.ci + ':' + B.i : B.ci + ':' + B.i + '|' + A.ci + ':' + A.i);
  D0.pass.forEach((P, ci) => P.forEach((p, q) => {
    let c = D0.cross[p.k], A = { ci: c.o.ci, i: c.o.seg }, B = { ci: c.u.ci, i: c.u.seg }, k = key(A, B);
    if (overOf[k] === undefined) { let mine = p.over ? A : B, other = p.over ? B : A; overOf[k] = q % 2 === 0 ? mine : other; }
  }));
  let over = (A, B) => { let o = overOf[key(A, B)]; return o ? o.ci === A.ci && o.i === A.i : true; };
  D = diagramOf(math, true, over);
  info = '交点 ' + D.cross.length;
  // 全部が輪なら、閉じた図として不変量も計算（交点が少ないときだけ）
  if (curves.every((c) => c.closed) && D.cross.length <= 12) {
    let Dc = diagramOf(curves.map((c) => c.pts.map(([x, y]) => [x, -y, 0])), false, over);
    if (Dc.pd.length) { let id = identify(Dc.pd); info += '　輪 ' + curves.length + ' 本　行列式 ' + id.d + '　V = ' + jonesStr(id.V) + (id.hits.length ? '　＝ ' + id.hits.map((h) => h.name + h.how).join('、') : ''); }
  } else if (curves.every((c) => c.closed)) info += '　（交点が 12 より多いので不変量は省略）';
}

function draw() {
  // 背景：カメラ（暗く・色を落として）。使えなければ無地
  background(228, 45, 14);
  if (useCam && cap && cap.width > 0) { tint(0, 0, 100, 35); image(cap, 0, 0, width, height); noTint(); fill(228, 60, 12, 55); noStroke(); rect(0, 0, width, height); }

  // 帯：太い縁 → 中の色、の 2 回。下を通るところはすき間（交点の上下は analyse で交互に決めた）
  if (D) {
    let gaps = curves.map((c, ci) => D.cross.filter((x) => x.u.ci === ci).map((x) => x.u.s));
    for (let pass = 0; pass < 2; pass++) {
      noFill(); strokeCap(ROUND); strokeJoin(ROUND);
      curves.forEach((c, ci) => {
        let pts = c.closed ? c.pts.concat([c.pts[0]]) : c.pts;
        if (pass === 0) { stroke(228, 60, 8); strokeWeight(bandW + 8); }
        else { stroke(PAL[c.si % PAL.length]); strokeWeight(bandW); }
        drawGapped(window, pts, gaps[ci], bandW * 0.9 + 4, false);
      });
    }
    // 帯の中の細い線（ケルト文様の二重線）
    curves.forEach((c, ci) => { let pts = c.closed ? c.pts.concat([c.pts[0]]) : c.pts; stroke(228, 50, 15, 70); strokeWeight(2); drawGapped(window, pts, gaps[ci], bandW * 0.9 + 4, false); });
  }
  if (cur && cur.length > 1) { noFill(); stroke(55, 70, 100); strokeWeight(bandW * 0.6); polyline(window, cur); }

  noStroke(); fill(0, 0, 100); textSize(18);
  text('ドラッグ：描く　1・2・4：対称 ' + sym + '　V：カメラ ' + (useCam ? 'ON' : 'off') + '　↑↓：太さ　S：保存　C：消す', 20, 36);
  fill(0, 0, 75); textSize(15);
  text(info || '線どうしが交わると、上・下・上・下… と交互に編まれる。終わりを始まりの近くで離すと輪になる', 20, 62, width - 40, 60);
}

function mousePressed() { if (mouseY > 80) cur = [[mouseX, mouseY]]; }
function mouseDragged() {
  if (!cur) return;
  let l = cur[cur.length - 1], total = strokes.reduce((a, s) => a + s.pts.length, 0) * sym + cur.length * sym;
  if (dist(mouseX, mouseY, l[0], l[1]) >= spacing && total < maxPts) cur.push([mouseX, mouseY]);
}
function mouseReleased() {
  if (!cur) return;
  if (cur.length >= 4) {                                     // 短すぎる線は捨てる
    let a = cur[0], b = cur[cur.length - 1], closed = cur.length > 10 && dist(a[0], a[1], b[0], b[1]) < 30;
    if (closed) cur.pop();
    strokes.push({ pts: cur, closed });
    buildCurves();
  }
  cur = null;
}
function keyPressed() {
  if (key === '1' || key === '2' || key === '4') { sym = Number(key); buildCurves(); }
  if (key === 'v' || key === 'V') useCam = !useCam;
  if (key === UP_ARROW) bandW = min(30, bandW + 2);
  if (key === DOWN_ARROW) bandW = max(4, bandW - 2);
  if (key === 's' || key === 'S') saveCanvas('knot_brush', 'png');
  if (key === 'c' || key === 'C') { strokes = []; buildCurves(); }
}

// ---------- やってみよう ----------
// 1. 対称 4 で、中心のまわりに小さな輪を 1 つ描く。4 つの輪が編まれて、絡み目になる
// 2. 1 本の線でぐるぐる描いて輪にすると、交代結び目の図ができる。行列式と V を見てみよう
// 3. PAL の色を変えて、自分の組みひも模様を作ろう（帯の色は線ごとにちがう）
// 4. analyse の q % 2 === 0 を q % 2 === 1 にすると、上下が全部反対（鏡像）になる
// 5. sym を 6 や 8 にするには？（keyPressed に足す）。雪の結晶のような模様に


// ==================================================
// ここから下は「結び目の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 結び目の表と不変量の計算
// PD 符号：交点ごとに [i, j, k, l]（辺の番号）。i = 下をくぐって入ってくる辺、そこから反時計回りに j, k, l。
//   下のひもは i → k、上のひもは j と l を結ぶ。番号は KnotTheory / Knot Atlas と同じ約束
// ジョーンズ多項式の約束：A = t^(−1/4)。右手系三葉（交点の符号が全部 +）は V = t + t³ − t⁴、左手系は −t⁻⁴ + t⁻³ + t⁻¹
const KNOTS = [
  { name: '0_1', jp: '自明な結び目', pd: [] },
  { name: '3_1', jp: '三葉結び目', pd: [[1, 4, 2, 5], [3, 6, 4, 1], [5, 2, 6, 3]] },
  { name: '4_1', jp: '8 の字結び目', pd: [[4, 2, 5, 1], [8, 6, 1, 5], [6, 3, 7, 4], [2, 7, 3, 8]] },
  { name: '5_1', jp: '五葉結び目', pd: [[1, 6, 2, 7], [3, 8, 4, 9], [5, 10, 6, 1], [7, 2, 8, 3], [9, 4, 10, 5]] },
  { name: '5_2', jp: '3 ねじれ結び目', pd: [[1, 4, 2, 5], [3, 8, 4, 9], [5, 10, 6, 1], [9, 6, 10, 7], [7, 2, 8, 3]] },
  { name: '6_1', jp: 'ステベドア結び目', pd: [[1, 4, 2, 5], [7, 10, 8, 11], [3, 9, 4, 8], [9, 3, 10, 2], [5, 12, 6, 1], [11, 6, 12, 7]] },
  { name: '6_2', jp: '6_2 結び目', pd: [[1, 4, 2, 5], [5, 10, 6, 11], [3, 9, 4, 8], [9, 3, 10, 2], [7, 12, 8, 1], [11, 6, 12, 7]] },
  { name: '6_3', jp: '6_3 結び目', pd: [[4, 2, 5, 1], [8, 4, 9, 3], [12, 9, 1, 10], [10, 5, 11, 6], [6, 11, 7, 12], [2, 8, 3, 7]] },
  { name: 'L2a1', jp: 'ホップ絡み目', pd: [[4, 1, 3, 2], [2, 3, 1, 4]] },
  { name: 'L5a1', jp: 'ホワイトヘッド絡み目', pd: [[6, 1, 7, 2], [10, 7, 5, 8], [4, 5, 1, 6], [2, 10, 3, 9], [8, 4, 9, 3]] },
  { name: 'L6a4', jp: 'ボロミアン環', pd: [[6, 1, 7, 2], [12, 8, 9, 7], [4, 12, 1, 11], [10, 5, 11, 6], [8, 4, 5, 3], [2, 9, 3, 10]] },
];
function knotByName(nm) { return KNOTS.find((k) => k.name === nm); }
function mirrorPD(pd) { return pd.map(([i, j, k, l]) => [i, l, k, j]); }   // 鏡像：上下を入れかえる

// 交点の符号と成分（輪）を調べる。上のひもの向きは「辺の両端の一方が入口、もう一方が出口」から決める
function pdInfo(pd) {
  let n = pd.length, occ = {}, par = {};
  let root = (a) => (par[a] === a ? a : (par[a] = root(par[a])));
  let join = (a, b) => { par[a] === undefined && (par[a] = a); par[b] === undefined && (par[b] = b); par[root(a)] = root(b); };
  pd.forEach((X, c) => { X.forEach((a, p) => (occ[a] = occ[a] || []).push([c, p])); join(X[0], X[2]); join(X[1], X[3]); });
  let head = pd.map(() => [true, null, false, null]);        // head[c][p]：その位置で辺が交点へ入ってくるか
  for (let changed = true; changed; ) {
    changed = false;
    for (let a in occ) {
      let [o1, o2] = occ[a];
      if (!o2) continue;
      let h1 = head[o1[0]][o1[1]], h2 = head[o2[0]][o2[1]];
      if (h1 !== null && h2 === null) { head[o2[0]][o2[1]] = !h1; changed = true; }
      if (h2 !== null && h1 === null) { head[o1[0]][o1[1]] = !h2; changed = true; }
    }
    for (let h of head) {
      if (h[1] !== null && h[3] === null) { h[3] = !h[1]; changed = true; }
      if (h[3] !== null && h[1] === null) { h[1] = !h[3]; changed = true; }
    }
  }
  let roots = [...new Set(Object.keys(occ).map((a) => root(+a)))];
  let comp = {}; for (let a in occ) comp[a] = roots.indexOf(root(+a));
  let signs = pd.map((X, c) => (head[c][1] === false ? 1 : -1));   // 上が l → j なら +、j → l なら −
  return { n, signs, comp, nComp: roots.length, underComp: pd.map((X) => comp[X[0]]), overComp: pd.map((X) => comp[X[1]]) };
}
function writhe(pd) { return pdInfo(pd).signs.reduce((s, x) => s + x, 0); }
// 絡み数：成分 a と b の間の交点の符号の和 ÷ 2
function linkingNumber(pd, a, b) {
  let I = pdInfo(pd), s = 0;
  pd.forEach((X, c) => { let u = I.underComp[c], o = I.overComp[c]; if ((u === a && o === b) || (u === b && o === a)) s += I.signs[c]; });
  return s / 2;
}

// 弧（下をくぐるところで切れた線）：上のひも j と l は同じ弧
function pdArcs(pd) {
  let par = {}, root = (a) => (par[a] === a ? a : (par[a] = root(par[a])));
  for (let X of pd) for (let a of X) if (par[a] === undefined) par[a] = a;
  for (let X of pd) par[root(X[1])] = root(X[3]);
  let ids = [], arcOf = {};
  for (let a in par) { let r = root(+a); if (!ids.includes(r)) ids.push(r); arcOf[a] = ids.indexOf(r); }
  return { arcOf, nArcs: ids.length };
}
// 彩色の行列：交点ごとに 2·上 − 下1 − 下2（= 0 mod n が彩色の条件）
function colourMatrix(pd) {
  let { arcOf, nArcs } = pdArcs(pd);
  return { M: pd.map(([i, j, k]) => { let r = new Array(nArcs).fill(0); r[arcOf[j]] += 2; r[arcOf[i]] -= 1; r[arcOf[k]] -= 1; return r; }), nArcs, arcOf };
}
// 整数行列を対角化（スミス標準形の手前まで）。M·V = U⁻¹·D。V（列の操作）も記録する
function diagonalize(M0, nc) {
  let M = M0.map((r) => r.slice()), nr = M.length;
  let V = []; for (let i = 0; i < nc; i++) { V.push(new Array(nc).fill(0)); V[i][i] = 1; }
  let colOp = (a, b, q) => { for (let r of M) r[a] -= q * r[b]; for (let r of V) r[a] -= q * r[b]; };   // 列 a −= q·列 b
  let swapC = (a, b) => { for (let r of M) [r[a], r[b]] = [r[b], r[a]]; for (let r of V) [r[a], r[b]] = [r[b], r[a]]; };
  let d = [];
  for (let t = 0; t < Math.min(nr, nc); t++) {
    for (;;) {
      let best = null;
      for (let i = t; i < nr; i++) for (let j = t; j < nc; j++) if (M[i][j] !== 0 && (!best || Math.abs(M[i][j]) < Math.abs(M[best[0]][best[1]]))) best = [i, j];
      if (!best) break;
      [M[t], M[best[0]]] = [M[best[0]], M[t]]; swapC(t, best[1]);
      let p = M[t][t], clean = true;
      for (let i = t + 1; i < nr; i++) { let q = Math.trunc(M[i][t] / p); if (q) for (let j = t; j < nc; j++) M[i][j] -= q * M[t][j]; if (M[i][t]) clean = false; }
      for (let j = t + 1; j < nc; j++) { let q = Math.trunc(M[t][j] / p); if (q) colOp(j, t, q); if (M[t][j]) clean = false; }
      if (clean) break;
    }
    d.push(t < nr && M[t] ? M[t][t] : 0);
  }
  while (d.length < nc) d.push(0);
  return { d: d.map(Math.abs), V };
}
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; }
// フォックス n 彩色の数 = ∏ gcd(dᵢ, n)（dᵢ = 対角成分。n が素数でなくても正しい）
function colourings(pd, n) {
  if (pd.length === 0) return n;
  let { M, nArcs } = colourMatrix(pd);
  return diagonalize(M, nArcs).d.reduce((s, x) => s * gcd(x, n), 1);
}
// k 番目の n 彩色（弧ごとの色の配列）。0 ≤ k < colourings(pd, n)
function colouringAt(pd, n, k) {
  let { M, nArcs } = colourMatrix(pd), { d, V } = diagonalize(M, nArcs);
  let y = d.map((x) => { let g = gcd(x, n), m = k % g; k = Math.floor(k / g); return m * (n / g); });
  return V.map((r) => (((r.reduce((s, v, j) => s + v * y[j], 0)) % n) + n) % n);
}
// 行列式（結び目の行列式）= 対角成分のうち 0 でないものの積（階数が 弧の数 − 1 のとき）
function determinant(pd) {
  if (pd.length === 0) return 1;
  let { M, nArcs } = colourMatrix(pd), { d } = diagonalize(M, nArcs);
  let nz = d.filter((x) => x !== 0);
  return nz.length === nArcs - 1 ? nz.reduce((s, x) => s * x, 1) : 0;
}

// ---- 多項式（係数の配列。添字 = t の次数）
function pTrim(a) { a = a.slice(); while (a.length > 1 && a[a.length - 1] === 0) a.pop(); return a.length ? a : [0]; }
function pAdd(a, b, s = 1) { let r = []; for (let i = 0; i < Math.max(a.length, b.length); i++) r.push((a[i] || 0) + s * (b[i] || 0)); return pTrim(r); }
function pMul(a, b) { let r = new Array(a.length + b.length - 1).fill(0); a.forEach((x, i) => b.forEach((y, j) => (r[i + j] += x * y))); return pTrim(r); }
function pZero(a) { return a.length === 1 && a[0] === 0; }
function pDiv(a, b) {                       // 割り切れる割り算（ベアイス法では必ず割り切れる）
  a = pTrim(a); b = pTrim(b);
  if (pZero(a)) return [0];
  let q = new Array(Math.max(1, a.length - b.length + 1)).fill(0), r = a.slice();
  for (let i = r.length - b.length; i >= 0; i--) {
    let c = r[i + b.length - 1] / b[b.length - 1];
    q[i] = c; for (let j = 0; j < b.length; j++) r[i + j] -= c * b[j];
  }
  return pTrim(q.map(Math.round));
}
function pEval(a, t) { return a.reduce((s, c, i) => s + c * Math.pow(t, i), 0); }
// 多項式の行列式（ベアイス法：分数を使わない消去法）
function polyDet(M) {
  let n = M.length; if (n === 0) return [1];
  M = M.map((r) => r.map((x) => x.slice())); let prev = [1], sign = 1;
  for (let k = 0; k < n - 1; k++) {
    if (pZero(M[k][k])) {
      let s = M.findIndex((r, i) => i > k && !pZero(r[k]));
      if (s < 0) return [0];
      [M[k], M[s]] = [M[s], M[k]]; sign = -sign;
    }
    for (let i = k + 1; i < n; i++) for (let j = k + 1; j < n; j++)
      M[i][j] = pDiv(pAdd(pMul(M[i][j], M[k][k]), pMul(M[i][k], M[k][j]), -1), prev);
    prev = M[k][k];
  }
  return M[n - 1][n - 1].map((c) => c * sign);
}
// アレクサンダー行列：上の弧に 1 − t、下の 2 本に t と −1（どちらに t が付くかは交点の符号で決まる）
function alexanderMatrix(pd) {
  let { arcOf, nArcs } = pdArcs(pd), sg = pdInfo(pd).signs;
  return pd.map(([i, j, k], c) => {
    let r = []; for (let a = 0; a < nArcs; a++) r.push([0]);
    let put = (a, p) => (r[a] = pAdd(r[a], p));
    put(arcOf[j], [1, -1]);
    if (sg[c] > 0) { put(arcOf[i], [0, 1]); put(arcOf[k], [-1]); } else { put(arcOf[i], [-1]); put(arcOf[k], [0, 1]); }
    return r;
  });
}
// アレクサンダー多項式：最後の行と列を消した小行列式。t^k 倍と符号をそろえる（最低次の係数が正）
function alexander(pd) {
  if (pd.length === 0) return [1];
  let M = alexanderMatrix(pd).slice(0, -1).map((r) => r.slice(0, -1));
  let p = pTrim(polyDet(M));
  if (pZero(p)) return [0];
  while (p[0] === 0) p.shift();
  return p[0] < 0 ? p.map((c) => -c) : p;
}

// ---- カウフマン括弧 → ジョーンズ多項式（ローラン多項式は { 次数: 係数 } の形）
function lAdd(a, b, s = 1) { let r = Object.assign({}, a); for (let e in b) { r[e] = (r[e] || 0) + s * b[e]; if (!r[e]) delete r[e]; } return r; }
function lMul(a, b) { let r = {}; for (let e in a) for (let f in b) { let g = +e + +f; r[g] = (r[g] || 0) + a[e] * b[f]; if (!r[g]) delete r[g]; } return r; }
// 1 つの状態（bits の i 桁目 = 1 なら交点 i を B に開く）のループの数
function stateLoops(pd, bits) {
  let par = {}, root = (a) => (par[a] === a ? a : (par[a] = root(par[a])));
  for (let X of pd) for (let a of X) par[a] = a;
  pd.forEach(([i, j, k, l], c) => {
    if ((bits >> c) & 1) { par[root(i)] = root(l); par[root(j)] = root(k); }   // B：(i,l) と (j,k)
    else { par[root(i)] = root(j); par[root(k)] = root(l); }                  // A：(i,j) と (k,l)
  });
  return new Set(Object.keys(par).map((a) => root(+a))).size;
}
const BRACKET_MAX = 14;                    // ★ これより交点が多いと 2^n 状態が多すぎるので計算しない
let bracketCache = {};
// 括弧 ⟨K⟩ = Σ A^(a−b) d^(ループ − 1)、d = −A² − A⁻²（{ A の次数: 係数 }）
function bracket(pd) {
  let n = pd.length; if (n === 0) return { 0: 1 };
  if (n > BRACKET_MAX) return null;
  let key = JSON.stringify(pd); if (bracketCache[key]) return bracketCache[key];
  let dpow = [{ 0: 1 }], d = { 2: -1, '-2': -1}, r = {};
  for (let s = 0; s < 1 << n; s++) {
    let b = 0; for (let c = 0; c < n; c++) b += (s >> c) & 1;
    let L = stateLoops(pd, s);
    while (dpow.length < L) dpow.push(lMul(dpow[dpow.length - 1], d));
    r = lAdd(r, lMul({ [n - 2 * b]: 1 }, dpow[L - 1]));
  }
  return (bracketCache[key] = r);
}
// ジョーンズ多項式 V(t) = (−A³)^(−w) ⟨K⟩ を A = t^(−1/4) で。返り値 { 2×(t の次数): 係数 }（絡み目は半整数の次数になるので 2 倍で持つ）
function jones(pd) {
  let br = bracket(pd); if (!br) return null;
  let w = writhe(pd), f = lMul(br, { [-3 * w]: w % 2 === 0 ? 1 : -1 }), V = {};
  for (let e in f) V[-e / 2] = f[e];
  return V;
}
function jonesMirror(V) { let r = {}; for (let e in V) r[-e] = V[e]; return r; }
function jonesEval(V, t) { let s = 0; for (let e in V) s += V[e] * Math.pow(t, e / 2); return s; }
function lEqual(a, b) { return JSON.stringify(Object.entries(a).filter((x) => x[1]).sort((x, y) => x[0] - y[0])) === JSON.stringify(Object.entries(b).filter((x) => x[1]).sort((x, y) => x[0] - y[0])); }
const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '/': 'ᐟ' };
function supStr(s) { return String(s).split('').map((ch) => SUP[ch] || ch).join(''); }
// 多項式を文字列に。terms = [[次数の文字列, 係数], ...]（次数の小さい順）
function termsStr(terms, v) {
  let out = '';
  for (let [e, c] of terms) {
    if (!c) continue;
    let mono = e === '0' ? '' : v + (e === '1' ? '' : supStr(e)), a = Math.abs(c);
    let body = mono === '' ? String(a) : (a === 1 ? '' : a) + mono;
    out += out === '' ? (c < 0 ? '−' : '') + body : (c < 0 ? ' − ' : ' + ') + body;
  }
  return out || '0';
}
function jonesStr(V) {
  if (!V) return '（交点が多すぎて省略）';
  return termsStr(Object.keys(V).map(Number).sort((a, b) => a - b).map((e) => [e % 2 === 0 ? String(e / 2) : e + '/2', V[e]]), 't');
}
function alexStr(p) { return termsStr(p.map((c, i) => [String(i), c]).reverse(), 't'); }

// ---- 表から名前をさがす：行列式・アレクサンダー・（計算できれば）ジョーンズが全部一致するもの
let tableInv = null;
function identify(pd) {
  if (!tableInv) tableInv = KNOTS.map((k) => ({ k, nc: pdInfo(k.pd).nComp || 1, d: determinant(k.pd), A: alexStr(alexander(k.pd)), V: jones(k.pd) }));
  let V = jones(pd), A = alexStr(alexander(pd)), d = determinant(pd), nc = pdInfo(pd).nComp || 1;
  let hits = [];
  for (let t of tableInv) {
    if (t.nc !== nc || t.d !== d || t.A !== A) continue;
    if (!V) hits.push({ name: t.k.name, jp: t.k.jp, how: '（V は省略）' });
    else if (lEqual(V, t.V)) hits.push({ name: t.k.name, jp: t.k.jp, how: '' });
    else if (lEqual(V, jonesMirror(t.V))) hits.push({ name: t.k.name, jp: t.k.jp, how: '（鏡像）' });
  }
  return { hits, V, A, d, nc };
}

// ---- 自己テスト：知られている値と、ここで計算した値を比べる
let selfTestResults = [];
function selfTest() {
  let R = [], ok = (what, cond) => R.push({ what, ok: !!cond });
  let J = (nm) => jones(knotByName(nm).pd), A = (nm) => alexStr(alexander(knotByName(nm).pd)), D = (nm) => determinant(knotByName(nm).pd);
  let L3 = knotByName('3_1').pd, R3 = mirrorPD(L3);
  ok('自明な結び目 V = 1', lEqual(J('0_1'), { 0: 1 }));
  ok('ねじれた輪（R1, ±）も V = 1', lEqual(jones([[1, 1, 2, 2]]), { 0: 1 }) && lEqual(jones([[2, 1, 1, 2]]), { 0: 1 }));
  ok('右手系三葉 w = +3, V = t + t³ − t⁴', writhe(R3) === 3 && lEqual(jones(R3), { 2: 1, 6: 1, 8: -1 }));
  ok('左手系三葉 w = −3, V = −t⁻⁴ + t⁻³ + t⁻¹', writhe(L3) === -3 && lEqual(jones(L3), { '-8': -1, '-6': 1, '-2': 1 }));
  ok('8 の字 V = t⁻² − t⁻¹ + 1 − t + t²', lEqual(J('4_1'), { '-4': 1, '-2': -1, 0: 1, 2: -1, 4: 1 }));
  ok('5_1 V = −t⁻⁷ + t⁻⁶ − t⁻⁵ + t⁻⁴ + t⁻²', lEqual(J('5_1'), { '-14': -1, '-12': 1, '-10': -1, '-8': 1, '-4': 1 }));
  ok('6_3 V = −t⁻³ + 2t⁻² − 2t⁻¹ + 3 − 2t + 2t² − t³', lEqual(J('6_3'), { '-6': -1, '-4': 2, '-2': -2, 0: 3, 2: -2, 4: 2, 6: -1 }));
  ok('ホップ絡み目 V = −t^(−1/2) − t^(−5/2), 絡み数 ±1', lEqual(J('L2a1'), { '-1': -1, '-5': -1 }) && Math.abs(linkingNumber(knotByName('L2a1').pd, 0, 1)) === 1);
  ok('ホワイトヘッド：絡み数 0、V はほどけた 2 輪と違う', linkingNumber(knotByName('L5a1').pd, 0, 1) === 0 && lEqual(J('L5a1'), { '-7': 1, '-5': -2, '-3': 1, '-1': -2, 1: 1, 3: -1 }));
  let bor = knotByName('L6a4').pd, bi = pdInfo(bor);
  ok('ボロミアン：3 本、どの 2 本も絡み数 0', bi.nComp === 3 && [[0, 1], [0, 2], [1, 2]].every(([a, b]) => linkingNumber(bor, a, b) === 0) && lEqual(J('L6a4'), { '-6': -1, '-4': 3, '-2': -2, 0: 4, 2: -2, 4: 3, 6: -1 }));
  ok('アレクサンダー 三葉 t² − t + 1', A('3_1') === 't² − t + 1');
  ok('アレクサンダー 8 の字 t² − 3t + 1', A('4_1') === 't² − 3t + 1');
  ok('アレクサンダー 5_2 2t² − 3t + 2、6_1 2t² − 5t + 2', A('5_2') === '2t² − 3t + 2' && A('6_1') === '2t² − 5t + 2');
  ok('アレクサンダー 6_2 t⁴ − 3t³ + 3t² − 3t + 1、6_3 t⁴ − 3t³ + 5t² − 3t + 1', A('6_2') === 't⁴ − 3t³ + 3t² − 3t + 1' && A('6_3') === 't⁴ − 3t³ + 5t² − 3t + 1');
  ok('行列式 1, 3, 5, 5, 7, 9, 11, 13', [['0_1', 1], ['3_1', 3], ['4_1', 5], ['5_1', 5], ['5_2', 7], ['6_1', 9], ['6_2', 11], ['6_3', 13]].every(([k, v]) => D(k) === v));
  ok('三葉は 3 彩色 9 通り、8 の字は 3 通り（彩色できない）・5 彩色 25 通り', colourings(L3, 3) === 9 && colourings(knotByName('4_1').pd, 3) === 3 && colourings(knotByName('4_1').pd, 5) === 25);
  ok('表の全部で |Δ(−1)| = |V(−1)| = 行列式（3 つの別々の計算が一致）、結び目は V(1) = 1', KNOTS.every((k) => {
    let d = determinant(k.pd), V = jones(k.pd);
    return Math.abs(pEval(alexander(k.pd), -1)) === d && Math.round(jonesAbsAtMinus1(V)) === d && (k.name[0] === 'L' || Math.round(jonesEval(V, 1)) === 1);
  }));
  if (typeof knotCurves === 'function') ok('表の全部で、形（3D 曲線）から作った図の PD 符号 = 表の PD 符号（V とねじれ数が一致）', KNOTS.every((k) => { let p = diagramOf(knotCurves(k.name)).pd; return p.length === k.pd.length && writhe(p) === writhe(k.pd) && lEqual(jones(p), jones(k.pd)); }));
  ok('鏡像で t ↔ t⁻¹（三葉の左右は区別できる）', lEqual(jones(R3), jonesMirror(jones(L3))) && !lEqual(jones(R3), jones(L3)));
  selfTestResults = R;
  for (let r of R) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.what);
  return R.every((r) => r.ok);
}
// |V(−1)|：t^(1/2) = i を入れる（i の h 乗は 1, i, −1, −i をくり返す）
function jonesAbsAtMinus1(V) { let re = 0, im = 0; for (let h in V) { let m = ((+h % 4) + 4) % 4; if (m === 0) re += V[h]; if (m === 1) im += V[h]; if (m === 2) re -= V[h]; if (m === 3) im -= V[h]; } return Math.hypot(re, im); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }

// ---- 曲線 → 結び目の図（交点を見つけて PD 符号にする）
// curves：輪ごとの点の列 [[x, y, z], ...]（閉じた折れ線）。x 右・y 上・z 手前（大きいほうが上を通る）
function segHit(p1, p2, p3, p4) {
  let d = (p2[0] - p1[0]) * (p4[1] - p3[1]) - (p2[1] - p1[1]) * (p4[0] - p3[0]);
  if (Math.abs(d) < 1e-12) return null;
  let t = ((p3[0] - p1[0]) * (p4[1] - p3[1]) - (p3[1] - p1[1]) * (p4[0] - p3[0])) / d;
  let u = ((p3[0] - p1[0]) * (p2[1] - p1[1]) - (p3[1] - p1[1]) * (p2[0] - p1[0])) / d;
  return t >= 0 && t < 1 && u >= 0 && u < 1 ? [t, u] : null;
}
// over(A, B)：交点で A が上なら true を返す関数（省略すると z で決める）。A, B = { ci: 輪の番号, i: 線分の番号 }
function diagramOf(curves, open = false, over = null) {
  let segs = [];
  curves.forEach((c, ci) => { let m = c.length; for (let i = 0; i < (open ? m - 1 : m); i++) { let a = c[i], b = c[(i + 1) % m];
    segs.push({ ci, i, a, b, x0: Math.min(a[0], b[0]), x1: Math.max(a[0], b[0]), y0: Math.min(a[1], b[1]), y1: Math.max(a[1], b[1]) }); } });
  segs.sort((A, B) => A.x0 - B.x0);
  let cross = [];
  for (let p = 0; p < segs.length; p++) {
    let A = segs[p];
    for (let q = p + 1; q < segs.length && segs[q].x0 <= A.x1; q++) {
      let B = segs[q];
      if (B.y0 > A.y1 || B.y1 < A.y0) continue;
      if (A.ci === B.ci) { let m = curves[A.ci].length, d = Math.abs(A.i - B.i); if (d <= 1 || (!open && d === m - 1)) continue; }
      let r = segHit(A.a, A.b, B.a, B.b); if (!r) continue;
      let zA = A.a[2] + (A.b[2] - A.a[2]) * r[0], zB = B.a[2] + (B.b[2] - B.a[2]) * r[1];
      let aOver = over ? over(A, B) : zA > zB;
      let [O, U, ro, ru] = aOver ? [A, B, r[0], r[1]] : [B, A, r[1], r[0]];
      let dv = [O.b[0] - O.a[0], O.b[1] - O.a[1]], du = [U.b[0] - U.a[0], U.b[1] - U.a[1]];
      cross.push({ x: A.a[0] + (A.b[0] - A.a[0]) * r[0], y: A.a[1] + (A.b[1] - A.a[1]) * r[0],
        o: { ci: O.ci, s: O.i + ro, seg: O.i }, u: { ci: U.ci, s: U.i + ru, seg: U.i }, sign: dv[0] * du[1] - dv[1] * du[0] > 0 ? 1 : -1, dv, du });
    }
  }
  // 輪ごとに、通過点（交点を通るところ）を曲線の向きに並べて辺に番号をつける
  let pass = curves.map(() => []);
  cross.forEach((c, k) => { pass[c.o.ci].push({ s: c.o.s, k, over: true }); pass[c.u.ci].push({ s: c.u.s, k, over: false }); });
  let base = 0;
  pass.forEach((P) => { P.sort((a, b) => a.s - b.s); let m = P.length;
    P.forEach((p, q) => { p.inL = base + (q === 0 ? m : q); p.outL = base + q + 1; }); base += m; });
  for (let P of pass) for (let p of P) cross[p.k][p.over ? 'po' : 'pu'] = p;
  let pd = cross.map((c) => {
    let i = c.pu.inL, k = c.pu.outL;
    // i から反時計回りに次の端が j。符号 + のとき、それは上のひもの出ていく側
    return c.sign > 0 ? [i, c.po.outL, k, c.po.inL] : [i, c.po.inL, k, c.po.outL];
  });
  return { pd, cross, pass, edges: base };
}
// 折れ線の長さの道具：at(長さ) で点、toLen(点の番号 + 割合) で長さ、piece(a, b) で長さ a〜b の部分の点の列
function pathOf(pts, closed = true) {
  let n = pts.length, segN = closed ? n : n - 1, cum = [0];
  for (let i = 0; i < segN; i++) { let a = pts[i], b = pts[(i + 1) % n]; cum.push(cum[i] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
  let L = cum[segN];
  let at = (s) => { if (closed) s -= Math.floor(s / L) * L; else s = Math.max(0, Math.min(L, s));
    let lo = 0, hi = segN - 1; while (lo < hi) { let m = (lo + hi + 1) >> 1; if (cum[m] <= s) lo = m; else hi = m - 1; }
    let a = pts[lo], b = pts[(lo + 1) % n], f = (s - cum[lo]) / (cum[lo + 1] - cum[lo] || 1); return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; };
  let toLen = (s) => { let i = Math.max(0, Math.min(Math.floor(s), segN - 1)); return cum[i] + (cum[i + 1] - cum[i]) * (s - i); };
  let piece = (a, b) => { let out = [at(a)];
    for (let k = 1; k <= 2 * segN; k++) { let s = cum[k % segN] + Math.floor(k / segN) * L; if (!closed && k > segN) break; if (s >= b) break; if (s > a) out.push(pts[k % n]); }
    out.push(at(b)); return out; };
  return { L, at, toLen, piece };
}
function polyline(g, P) { if (P.length < 2) return; g.beginShape(); for (let p of P) g.vertex(p[0], p[1]); g.endShape(); }
// 下を通るところにすき間をあけて描く（gapS：すき間の位置（点の番号 + 割合）、gap：すき間の半分の長さ）
//   style(q)：q 番目のすき間のあとの部分（＝ 1 本の弧）を描く前に呼ばれる（色を変えたいとき）
function drawGapped(g, pts, gapS, gap, closed = true, style = null) {
  if (pts.length < 2) return;
  let P = pathOf(pts, closed); if (P.L <= 0) return;
  let gaps = gapS.map(P.toLen).sort((a, b) => a - b);
  if (gaps.length === 0) { if (style) style(0); g.beginShape(); for (let p of pts) g.vertex(p[0], p[1]); closed ? g.endShape(CLOSE) : g.endShape(); return; }
  if (!closed) { let s0 = 0; gaps.forEach((c, q) => { if (style) style(q - 1); if (c - gap > s0) polyline(g, P.piece(s0, c - gap)); s0 = Math.max(s0, c + gap); });
    if (style) style(gaps.length - 1); if (s0 < P.L) polyline(g, P.piece(s0, P.L)); return; }
  gaps.forEach((c, q) => { let a = c + gap, b = (q + 1 < gaps.length ? gaps[q + 1] : gaps[0] + P.L) - gap; if (b > a) { if (style) style(q); polyline(g, P.piece(a, b)); } });
}
// 結び目の図を描く（cs：曲線、D：diagramOf の結果、中心 cx, cy・半径 R で画面へ。cols：輪ごとの色）
function toScreen(cs, cx, cy, R) { return cs.map((c) => c.map((p) => [cx + p[0] * R, cy - p[1] * R, p[2]])); }
function drawDiagram(g, scr, D, cols, w = 5, gap = 10) {
  g.noFill(); g.strokeWeight(w);
  scr.forEach((c, ci) => { g.stroke(cols[ci % cols.length]); drawGapped(g, c, D.cross.filter((x) => x.u.ci === ci).map((x) => x.u.s), gap); });
}

// 点を回転（画面と同じ回し方：rotateX(−rx) のあと rotateY(ry)。WEBGL の y は下向きなので符号に注意）
function rotPts(cs, rx, ry) {
  let cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx);
  return cs.map((c) => c.map(([x, y, z]) => { let x1 = x * cy + z * sy, z1 = -x * sy + z * cy, y1 = -y;
    return [x1, -(y1 * cx + z1 * sx), -y1 * sx + z1 * cx]; }));
}
