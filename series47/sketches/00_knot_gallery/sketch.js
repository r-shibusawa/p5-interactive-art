// ============================================
// 00 結び目表のギャラリー
// 結び目・絡み目の表（Rolfsen の表の 3_1, 4_1, 5_1 …）を 3D の管で回して見る。右下は「今の向きから見た図」（下を通るひもにすき間）
// 名前・最小交点数・成分の数・不変量（ねじれ数、行列式、アレクサンダー多項式、ジョーンズ多項式）は、すべて図のデータ（PD 符号）から計算している
// ←→ = 結び目を選ぶ / M = 鏡像（上下を全部入れかえる）/ ドラッグ = 回す / スペース = 自動回転 / D = 図の表示
// ============================================

let idx = 1;                 // 表の何番目か
let mirror = false;          // 鏡像にするか
let rx = -0.5, ry = 0, spin = true;
let geom = null, hud;
let tubeR = 0.06;            // ★ 管の太さ
let showDiagram = true;
let info = {};
const COLS = [[226, 200, 150], [235, 90, 60], [130, 165, 240]];   // ★ 麻ひも・朱・藍の 3 色

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  hud = createGraphics(width, height);
  selfTest();                // 知られている値と照合（結果はコンソールと画面左下に）
  rebuild();
}

// 選んだ結び目の曲線（鏡像なら z を反転 ＝ すべての交点の上下が入れかわる）
function curvesNow() {
  let cs = knotCurves(KNOTS[idx].name, 240);
  return mirror ? cs.map((c) => c.map(([x, y, z]) => [x, y, -z])) : cs;
}

function rebuild() {
  let cs = curvesNow(), K = KNOTS[idx];
  if (geom) freeGeometry(geom);
  geom = buildGeometry(() => {
    noStroke();
    cs.forEach((c, k) => { fill(...COLS[k % 3]); tube(c.map(([x, y, z]) => [x, -y, z]), tubeR, 8); });   // 画面は y が下向き
  });
  // ★ 不変量は「図のデータ」から計算する（表の名前は使わない）
  let pd = mirror ? mirrorPD(K.pd) : K.pd;
  let V = jones(pd), I = pdInfo(pd);
  info = {
    name: K.name, jp: K.jp, cross: pd.length, comps: I.nComp || 1, w: writhe(pd), det: determinant(pd),
    alex: alexStr(alexander(pd)), V: jonesStr(V),
    chiral: lEqual(V, jonesMirror(V)) ? '鏡像と見分けがつかない（V(t) = V(1/t)。両手型の候補）' : '鏡像と区別できる（V(t) ≠ V(1/t)）＝ 両手型でない',
  };
}

function draw() {
  background(16, 22, 46);
  if (mouseIsPressed) { ry += movedX * 0.01; rx = constrain(rx + movedY * 0.01, -1.5, 1.5); }
  else if (spin) ry += 0.006;

  push();
  translate(-width * 0.12, 0, 0);
  rotateX(-rx); rotateY(ry);
  ambientLight(90); directionalLight(255, 255, 255, 0.3, 0.5, -0.8); pointLight(120, 130, 200, 0, -400, 400);
  specularMaterial(50); shininess(25);
  scale(min(width, height) * 0.3);
  model(geom);
  pop();

  drawHUD();
  drawingContext.clear(drawingContext.DEPTH_BUFFER_BIT);
  image(hud, -width / 2, -height / 2);
}

function drawHUD() {
  let g = hud;
  g.clear(); g.noStroke();
  g.fill(255); g.textSize(18);
  g.text('←→：結び目を選ぶ（' + (idx + 1) + ' / ' + KNOTS.length + '）　M：鏡像 ' + (mirror ? 'ON' : 'off') + '　ドラッグ：回す　スペース：自動回転　D：図', 20, 36);
  g.fill(170, 180, 210); g.textSize(15);
  g.text('名前の「5_2」は「最小交点数 5 の 2 番目」という意味（Rolfsen の結び目表）。L で始まるのは 2 本以上の輪がからんだ絡み目', 20, 62);

  let x0 = width - 470, y0 = 96;
  g.fill(240, 205, 140); g.textSize(40); g.text(info.name, x0, y0 + 30);
  g.fill(255); g.textSize(22); g.text(info.jp + (mirror ? '（鏡像）' : ''), x0 + 130, y0 + 28);
  g.textSize(16); g.fill(230);
  let rows = [['最小交点数', info.cross], ['輪の数（成分）', info.comps], ['ねじれ数 w（符号の和）', info.w], ['行列式 det', info.det],
              ['アレクサンダー Δ(t)', info.alex], ['ジョーンズ V(t)', info.V]];
  rows.forEach(([k, v], i) => { g.fill(170, 180, 210); g.text(k, x0, y0 + 70 + i * 28); g.fill(255); g.text(String(v), x0 + 210, y0 + 70 + i * 28); });
  g.fill(235, 120, 90); g.text(info.chiral, x0, y0 + 70 + rows.length * 28 + 6);

  // 今の向きから見た図（真上から写す。交点の数は向きで変わる）
  if (showDiagram) {
    let cs = rotPts(curvesNow(), rx, ry), D = diagramOf(cs), R = 120, cx = width - 250, cy = height - 190;
    g.fill(255, 255, 255, 14); g.rect(cx - R - 30, cy - R - 30, 2 * R + 60, 2 * R + 76, 10);
    drawDiagram(g, toScreen(cs, cx, cy, R * 0.95), D, COLS.map((c) => g.color(...c)), 4, 8);
    g.noStroke(); g.fill(255); g.textSize(14);
    g.text('この向きの図：交点 ' + D.pd.length + '　ねじれ数 ' + writhe(D.pd), cx - R - 16, cy + R + 36);
  }
  g.fill(selfTestResults.every((r) => r.ok) ? g.color(140, 230, 160) : g.color(255, 100, 100)); g.textSize(15);
  g.text(selfTestLine() + '（コンソールに詳しい結果）', 20, height - 24);
}

function keyPressed() {
  if (key === RIGHT_ARROW) { idx = (idx + 1) % KNOTS.length; rebuild(); }
  if (key === LEFT_ARROW) { idx = (idx + KNOTS.length - 1) % KNOTS.length; rebuild(); }
  if (key === 'm' || key === 'M') { mirror = !mirror; rebuild(); }
  if (key === ' ') spin = !spin;
  if (key === 'd' || key === 'D') showDiagram = !showDiagram;
}

// ---------- やってみよう ----------
// 1. 3_1 を M で鏡像にすると、ジョーンズ多項式の t が t⁻¹ に入れかわる。4_1 や 6_3 では？（鏡像と同じ ＝ 両手型）
// 2. ドラッグで向きを変えて、右下の図の交点の数がいちばん少なくなる向きを探そう。最小交点数より少なくなる？
// 3. 4_1 と 5_1 は行列式がどちらも 5。アレクサンダー多項式では区別できる？
// 4. ねじれ数は向きで変わるのに、ジョーンズ多項式は変わらない。右下の数と見比べよう
// 5. KNOTS に自分で PD 符号を足してみよう（Knot Atlas に載っている）。形がない結び目は 0_1 の輪で表示される


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

// ---- 結び目の形（3D の曲線）。式があるものは式、ないものはフーリエ級数の係数（x, y, z ごとに [cos, sin] × 次数）
// どれも、真上（z 軸）から見た図が最小の交点数になるように選んである（自己テストで PD 符号と照合）
const FOURIER = {
  '5_2': [[[[-0.15, -0.14], [-0.53, 0.46], [0.21, -0.27], [0.05, 0.33], [0.06, 0.14], [0.03, -0.04], [-0.07, 0.02]], [[-0.19, 0.23], [-0.63, -0.15], [0.15, 0.12], [-0.32, -0.17], [-0.16, 0], [0.11, 0.1], [-0.02, 0.07]], [[0.07, -0.07], [0.13, 0], [-0.12, -0.06], [0.02, -0.05], [0.2, 0.32], [0.21, 0.14], [-0.02, 0.07]]]],
  '6_1': [[[[-0.27, 0.05], [-0.73, 0.2], [0.31, -0.11], [-0.23, 0.14], [0, 0.05], [0.01, -0.02], [-0.02, 0.08]], [[0.1, 0.23], [-0.04, -0.33], [0.2, 0.27], [-0.03, -0.13], [0.21, 0.18], [0.22, 0.15], [-0.02, -0.03]], [[-0.02, -0.02], [0.02, -0.01], [0.07, 0.05], [0.05, 0.04], [0.14, 0.06], [-0.18, -0.15], [-0.19, -0.2]]]],
  '6_2': [[[[0.1, -0.15], [0.61, -0.41], [-0.06, 0.12], [0.27, -0.02], [0, -0.13], [-0.05, -0.05], [0.02, -0.03]], [[-0.13, 0.2], [-0.37, -0.19], [0.13, 0.32], [0.33, -0.23], [0.18, 0.04], [-0.02, 0.08], [0.04, -0.09]], [[-0.09, 0], [0.09, 0.04], [-0.12, -0.09], [-0.16, 0.05], [0.29, -0.17], [0.23, 0.26], [0.11, -0.05]]]],
  '6_3': [[[[0.16, -0.21], [0.64, -0.07], [-0.23, 0.14], [0.34, 0.03], [0.21, 0.01], [-0.02, 0.02], [-0.03, -0.03]], [[-0.15, -0.25], [-0.51, 0.4], [-0.09, -0.11], [0.36, 0.17], [-0.04, 0.03], [-0.03, 0.16], [0.08, 0.06]], [[0.05, 0.07], [0.09, -0.1], [-0.01, 0.04], [-0.12, -0.13], [0.07, 0.05], [0.11, 0.28], [0.15, 0.08]]]],
  'L5a1': [[[[-0.03, 0.01], [0.52, 0.3], [0, 0.01], [0.06, -0.01], [0, 0], [0.02, 0.07]], [[-1, 0.3], [-0.02, -0.01], [-0.05, 0.32], [0, 0], [-0.07, 0], [0, 0]], [[0.33, -0.05], [0.01, 0.01], [0.14, 0.26], [0, 0], [-0.07, -0.15], [0, 0]]], [[[-0.3, 0.84], [-0.03, -0.05], [0.04, -0.02], [0.03, 0.08], [-0.01, -0.01], [0.01, -0.03]], [[-1.04, -0.31], [-0.09, 0.21], [0.09, 0.13], [-0.12, 0.06], [0.01, 0.06], [-0.02, 0]], [[0.42, 0.13], [0.12, -0.15], [0.13, 0.2], [-0.11, 0.03], [-0.01, 0.03], [-0.05, -0.01]]]],
};
function knotCurves(name, N = 240) {
  let samp = (f) => { let c = []; for (let i = 0; i < N; i++) c.push(f((i / N) * 2 * Math.PI)); return c; };
  let fs = (C) => (t) => C.map((d) => d.reduce((s, [a, b], h) => s + a * Math.cos((h + 1) * t) + b * Math.sin((h + 1) * t), 0));
  let cs;
  if (name === '0_1') cs = [samp((t) => [Math.cos(t), Math.sin(t), 0])];
  else if (name === '3_1') cs = [samp((t) => [Math.sin(t) + 2 * Math.sin(2 * t), Math.cos(t) - 2 * Math.cos(2 * t), -Math.sin(3 * t)])];
  else if (name === '4_1') cs = [samp((t) => [(2 + Math.cos(2 * t)) * Math.cos(3 * t), (2 + Math.cos(2 * t)) * Math.sin(3 * t), Math.sin(4 * t)])];
  else if (name === '5_1') cs = [samp((t) => [(2 + Math.cos(5 * t)) * Math.cos(2 * t), (2 + Math.cos(5 * t)) * Math.sin(2 * t), Math.sin(5 * t)])];
  else if (name === 'L2a1') cs = [samp((t) => [Math.cos(t) - 0.55, Math.sin(t), -0.5 * Math.sin(t)]), samp((t) => [Math.cos(t) + 0.55, 0.5 * Math.sin(t), Math.sin(t)])];
  else if (name === 'L6a4') cs = [0, 1, 2].map((k) => { let a = Math.PI / 2 + (k * 2 * Math.PI) / 3; return samp((t) => [0.62 * Math.cos(a) + Math.cos(t), 0.62 * Math.sin(a) + Math.sin(t), 0.6 * Math.cos(3 * t)]); });
  else if (FOURIER[name]) cs = FOURIER[name].map((C) => samp(fs(C)));
  else cs = [samp((t) => [Math.cos(t), Math.sin(t), 0])];             // 形がわからないものは輪で
  // 大きさをそろえる（xy の半径の最大を 1 に）
  let all = [].concat(...cs), cx = all.reduce((s, p) => s + p[0], 0) / all.length, cy = all.reduce((s, p) => s + p[1], 0) / all.length;
  let r = Math.max(...all.map((p) => Math.hypot(p[0] - cx, p[1] - cy)));
  return cs.map((c) => c.map((p) => [(p[0] - cx) / r, (p[1] - cy) / r, p[2] / r]));
}

// ---- 曲線のまわりにチューブ（3D）。平行移動フレームで、つなぎ目のねじれを補正する
function tube(c, rad, sides = 10) {
  let n = c.length, T = [], Nn = [], B = [];
  let sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], nrm = (a) => { let m = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / m, a[1] / m, a[2] / m]; };
  let crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], dt = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  for (let i = 0; i < n; i++) T.push(nrm(sub(c[(i + 1) % n], c[(i - 1 + n) % n])));
  let N0 = nrm(crs(T[0], Math.abs(T[0][2]) < 0.9 ? [0, 0, 1] : [1, 0, 0])), cur = N0;
  for (let i = 0; i < n; i++) { let d = dt(cur, T[i]); cur = nrm(cur.map((x, k) => x - d * T[i][k])); Nn.push(cur); }
  let d0 = dt(cur, T[0]), end = nrm(cur.map((x, k) => x - d0 * T[0][k]));
  let alpha = Math.atan2(dt(crs(end, N0), T[0]), dt(end, N0));
  for (let i = 0; i < n; i++) { let a = (alpha * i) / n, b0 = crs(T[i], Nn[i]); Nn[i] = Nn[i].map((x, k) => x * Math.cos(a) + b0[k] * Math.sin(a)); B.push(crs(T[i], Nn[i])); }
  for (let i = 0; i < n; i++) {
    let j = (i + 1) % n;
    beginShape(TRIANGLE_STRIP);
    for (let s = 0; s <= sides; s++) {
      let a = (s / sides) * 2 * Math.PI, ca = Math.cos(a) * rad, sa = Math.sin(a) * rad;
      for (let k of [i, j]) { let nx = Nn[k][0] * ca + B[k][0] * sa, ny = Nn[k][1] * ca + B[k][1] * sa, nz = Nn[k][2] * ca + B[k][2] * sa;
        normal(nx, ny, nz); vertex(c[k][0] + nx, c[k][1] + ny, c[k][2] + nz); }
    }
    endShape();
  }
}
