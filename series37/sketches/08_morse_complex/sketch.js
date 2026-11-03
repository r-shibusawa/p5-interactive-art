// ============================================
// 08 モース複体 ─ 臨界胞体だけでできた小さな複体
// 臨界胞体を頂点にして、鞍点 → 極小、極大 → 鞍点 の V-パスの本数（mod 2）が 1 なら辺で結ぶ
//   これが「モース複体」。元の複体よりずっと小さいのに、ホモロジー（ベッチ数）は同じ ─ 離散モース理論の主定理
//   境界行列を Z2 で掃き出してモース複体のベッチ数を計算し、元の b_k とくらべる
// N = 新しい高さ関数 / 1〜3 = 円盤・円環・穴 2 つ / P = V-パスの表示 / K = キャンセルして小さくする
// ============================================

let nx = 14, ny = 9, cs = 56;     // ★ 格子の大きさ
let cx, pos, pair = [], h = [];
let ox = 50, oy = 110, shapeNo = 2, showPaths = true;
let mc = null;                     // モース複体 { nodes, edges, bettiM }

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  buildComplex();
}
function buildComplex() {
  let holes = shapeNo === 1 ? [] : shapeNo === 2 ? [[5, 3, 4, 3]] : [[3, 3, 3, 3], [8, 3, 3, 3]];
  cx = makeGridComplex(nx, ny, 'none', (i, j) => !holes.some(([x, y, w, hh]) => i >= x && i < x + w && j >= y && j < y + hh));
  pos = gridPositions(cx, ox, oy, cs);
  newHeight();
}
function newHeight() {
  noiseSeed(Math.floor(random(10000)));
  h = [];
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= ny; j++) if (cx.vid[i][j] >= 0) h[cx.vid[i][j]] = noise(i * 0.35, j * 0.35) + 0.0001 * (i * 3 + j);
  pair = gradientFromHeight(cx, h);
  buildMorseComplex();
}

// ★ モース複体：臨界胞体の間の V-パスを数える（mod 2 が境界係数）
function buildMorseComplex() {
  let nodes = [], edges = [], idx = {};
  for (let c = 0; c < cx.cells.length; c++) if (pair[c] < 0) { idx[c] = nodes.length; nodes.push(c); }
  for (let c of nodes) if (cx.cells[c].dim > 0) {
    let count = {}, paths = descendPaths(cx, pair, c);
    for (let p of paths) { let e = p[p.length - 1]; count[e] = (count[e] || 0) + 1; }
    for (let e in count) edges.push({ a: c, b: Number(e), n: count[e], paths: paths.filter((p) => p[p.length - 1] === Number(e)) });
  }
  // Z2 の境界行列 ∂1（鞍点 → 極小）、∂2（極大 → 鞍点）の階数
  let byDim = [0, 1, 2].map((d) => nodes.filter((c) => cx.cells[c].dim === d));
  let rank = (d) => {
    let rows = byDim[d].map((c) => byDim[d - 1].map((e) => (edges.find((q) => q.a === c && q.b === e) || { n: 0 }).n % 2));
    let r = 0, ncol = byDim[d - 1].length;
    for (let col = 0; col < ncol && r < rows.length; col++) {
      let piv = -1; for (let i = r; i < rows.length; i++) if (rows[i][col]) { piv = i; break; }
      if (piv < 0) continue;
      [rows[r], rows[piv]] = [rows[piv], rows[r]];
      for (let i = 0; i < rows.length; i++) if (i !== r && rows[i][col]) for (let k = 0; k < ncol; k++) rows[i][k] ^= rows[r][k];
      r++;
    }
    return r;
  };
  let r1 = rank(1), r2 = rank(2);
  mc = { nodes, edges, m: byDim.map((q) => q.length), bettiM: [byDim[0].length - r1, byDim[1].length - r1 - r2, byDim[2].length - r2] };
}

function draw() {
  background(225, 30, 8);
  // 元の複体（うすく）
  noStroke();
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) { let f = cx.fid[i][j]; if (f < 0) continue; let v = cx.cells[f].verts.reduce((s, q) => s + h[q], 0) / cx.cells[f].verts.length; fill(200 - v * 150, 30, 15 + v * 25); rect(ox + i * cs, oy + j * cs, cs, cs); }
  stroke(0, 0, 28); strokeWeight(1);
  for (let c = 0; c < cx.cells.length; c++) if (cx.cells[c].dim === 1) { let a = pos[cx.cells[c].verts[0]], b = pos[cx.cells[c].verts[1]]; line(a.x, a.y, b.x, b.y); }
  // モース複体の辺（V-パスまたは直線）
  for (let e of mc.edges) {
    let odd = e.n % 2 === 1, d = cx.cells[e.a].dim;
    if (showPaths) for (let p of e.paths) { stroke(d === 1 ? 190 : 30, 60, 90, odd ? 60 : 25); strokeWeight(odd ? 3 : 1.5); noFill(); beginShape(); for (let c of p) vertex(pos[c].x, pos[c].y); endShape(); }
    if (odd) { stroke(d === 1 ? 190 : 30, 80, 100); strokeWeight(4); line(pos[e.a].x, pos[e.a].y, pos[e.b].x, pos[e.b].y); }
    else { stroke(0, 0, 60); strokeWeight(2); drawingContext.setLineDash([6, 8]); line(pos[e.a].x, pos[e.a].y, pos[e.b].x, pos[e.b].y); drawingContext.setLineDash([]); }
  }
  // 節点 = 臨界胞体
  noStroke();
  for (let c of mc.nodes) { let d = cx.cells[c].dim; fill([272, 85, 12][d], 80, 100); circle(pos[c].x, pos[c].y, d === 1 ? 16 : 22); }

  let b = bettiNumbers(cx);
  fill(0, 0, 100); noStroke(); textSize(20); textAlign(LEFT, BASELINE);
  text('元の複体：V = ' + b.V + '　E = ' + b.E + '　F = ' + b.F + '　b = (' + b.b0 + ', ' + b.b1 + ', ' + b.b2 + ')　　→　モース複体：m = (' + mc.m.join(', ') + ')　b = (' + mc.bettiM.join(', ') + ')', ox, 44);
  fill(0, 0, 65); textSize(15);
  text('N：新しい高さ関数　1〜3：形　P：V-パス ' + (showPaths ? 'ON' : 'off') + '　K：キャンセルで小さく　　実線 = V-パスが奇数本（係数 1）　点線 = 偶数本（係数 0）', ox, 72);
  let same = mc.bettiM.every((v, k) => v === [b.b0, b.b1, b.b2][k]);
  fill(same ? 85 : 0, 80, 100); textSize(17);
  text((same ? '✓ ' : '✗ ') + '胞体 ' + (b.V + b.E + b.F) + ' 個の複体と、' + (mc.m[0] + mc.m[1] + mc.m[2]) + ' 個のモース複体は同じホモロジー', ox, oy + ny * cs + 36);
  fill(0, 0, 55); textSize(14);
  text('境界 ∂(鞍点) = Σ 極小（V-パスの本数 mod 2）、∂(極大) = Σ 鞍点。b_k = m_k − rank ∂_k − rank ∂_{k+1}', ox, oy + ny * cs + 60);
}

// K：V-パスが 1 本のペアを 1 つキャンセル（07 と同じ）
function cancelOne() {
  for (let e of mc.edges) if (e.n === 1) { let p = e.paths[0]; for (let k = 0; k + 1 < p.length; k += 2) { pair[p[k]] = p[k + 1]; pair[p[k + 1]] = p[k]; } buildMorseComplex(); return; }
}
function keyPressed() {
  if (key === 'n' || key === 'N') newHeight();
  if (key === 'p' || key === 'P') showPaths = !showPaths;
  if (key === 'k' || key === 'K') cancelOne();
  if (key === '1' || key === '2' || key === '3') { shapeNo = Number(key); buildComplex(); }
}

// ---------- やってみよう ----------
// 1. 点線（V-パスが 2 本）の辺を見つけよう。2 本のパスは極小のどちら側を通っている？
// 2. K を押し続けると節点が減っていく。最後にはモース複体に何が残る？ b はずっと同じ？
// 3. 円環（2）で鞍点が 1 つだけになったとき、その鞍点の ∂ はなぜ 0 になる？（2 本のパスが同じ極小に）
// 4. モース複体の辺を「鞍点 → 極小」だけにすると、残った成分の数が b0。その理由を考えよう


// ==================================================
// ここから下は「離散モース理論の道具」
//   格子の胞体複体をつくる・ベッチ数を数える・高さ関数から勾配場をつくる・V-パスをたどる
// ==================================================

// 格子（nx × ny マス）の胞体複体。ident は辺の同一視：'none' | 'torus' | 'sphere' | 'klein'
//   mask(i, j) が false のマス（面）は入れない（穴のある複体をつくる）
//   返り値 cx：cells = [{ dim, verts, faces, cofaces }]（頂点 → 辺 → 面の順に番号）
//             vid[i][j]・eh[i][j]（横の辺）・ev[i][j]（縦の辺）・fid[i][j] = 格子の位置 → 胞体番号（なければ -1）


// ==================================================
// ここから下は「離散モース理論の道具」
//   格子の胞体複体をつくる・高さ関数から勾配場をつくる・V-パスをたどる・ベッチ数を数える・描く
// ==================================================

// 格子（nx × ny マス）の胞体複体。ident は辺の同一視：'none' | 'torus' | 'sphere' | 'klein'
//   mask(i, j) が false のマス（面）は入れない（穴のある複体をつくる）
//   返り値 cx：cells = [{ dim, verts, faces, cofaces }]（頂点 → 辺 → 面の順に番号）
//             vid[i][j]・eh[i][j]（横の辺）・ev[i][j]（縦の辺）・fid[i][j] = 格子の位置 → 胞体番号（なければ -1）
function makeGridComplex(nx, ny, ident, mask) {
  ident = ident || 'none';
  let canon = (i, j) => {
    if (ident === 'torus') { i = i % nx; j = j % ny; }
    else if (ident === 'klein') { if (i === nx) { i = 0; j = ny - j; } if (j === ny) j = 0; }
    else if (ident === 'sphere') { if (j === 0) { j = i; i = 0; } else if (i === nx) { i = j; j = ny; } }
    return i + ',' + j;
  };
  let cells = [], keyId = {};
  let getCell = (k, dim, verts) => { if (keyId[k] === undefined) { keyId[k] = cells.length; cells.push({ dim, verts, faces: [], cofaces: [] }); } return keyId[k]; };
  let vid = [], eh = [], ev = [], fid = [];
  for (let i = 0; i <= nx; i++) { vid[i] = []; eh[i] = []; ev[i] = []; fid[i] = []; for (let j = 0; j <= ny; j++) { vid[i][j] = -1; eh[i][j] = -1; ev[i][j] = -1; fid[i][j] = -1; } }
  let keep = (i, j) => i >= 0 && j >= 0 && i < nx && j < ny && (!mask || mask(i, j));
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= ny; j++)
    if (keep(i, j) || keep(i - 1, j) || keep(i, j - 1) || keep(i - 1, j - 1)) { let v = getCell('v' + canon(i, j), 0, []); cells[v].verts = [v]; vid[i][j] = v; }
  // 辺は「格子のどの位置の辺か」で同一視する（同じ 2 頂点をもつ別の辺もあるので頂点の組では区別しない）
  let canonE = (i, j, dir) => {
    if (ident === 'torus') { i = i % nx; j = j % ny; }
    else if (ident === 'klein') { if (dir === 'h' && j === ny) j = 0; if (dir === 'v' && i === nx) { i = 0; j = ny - j - 1; } }
    else if (ident === 'sphere') { if (dir === 'h' && j === 0) { dir = 'v'; j = i; i = 0; } else if (dir === 'v' && i === nx) { dir = 'h'; i = j; j = ny; } }
    return 'e' + dir + i + ',' + j;
  };
  let addEdge = (k, a, b) => (a < 0 || b < 0 || a === b) ? -1 : getCell(k, 1, [Math.min(a, b), Math.max(a, b)]);
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= ny; j++) {
    if (i < nx && (keep(i, j) || keep(i, j - 1))) eh[i][j] = addEdge(canonE(i, j, 'h'), vid[i][j], vid[i + 1][j]);
    if (j < ny && (keep(i, j) || keep(i - 1, j))) ev[i][j] = addEdge(canonE(i, j, 'v'), vid[i][j], vid[i][j + 1]);
  }
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    if (!keep(i, j)) continue;
    let vs = [...new Set([vid[i][j], vid[i + 1][j], vid[i][j + 1], vid[i + 1][j + 1]])].sort((a, b) => a - b);
    let f = getCell('f' + i + ',' + j, 2, vs);
    fid[i][j] = f;
    for (let e of [eh[i][j], eh[i][j + 1], ev[i][j], ev[i + 1][j]]) if (e >= 0) { cells[e].ncof = (cells[e].ncof || 0) + 1; if (!cells[f].faces.includes(e)) cells[f].faces.push(e); }
  }
  for (let c = 0; c < cells.length; c++) {
    if (cells[c].dim === 1) cells[c].faces = cells[c].verts.slice();
    for (let f of cells[c].faces) if (!cells[f].cofaces.includes(c)) cells[f].cofaces.push(c);
  }
  return { cells, nx, ny, vid, eh, ev, fid, ident };
}

// ベッチ数：b0 = つながった塊の数（Union-Find）、b2 = 閉じた曲面の数、b1 = b0 + b2 − χ（Z2 係数）
function bettiNumbers(cx) {
  let cells = cx.cells, V = 0, E = 0, F = 0;
  let parent = cells.map((c, i) => i);
  let find = (a) => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
  let union = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[a] = b; };
  for (let i = 0; i < cells.length; i++) {
    let c = cells[i];
    if (c.dim === 0) V++;
    else if (c.dim === 1) { E++; union(c.verts[0], c.verts[1]); }
    else { F++; for (let e of c.faces) if (cells[e].cofaces.length === 2) union(cells[e].cofaces[0], cells[e].cofaces[1]); }   // 辺を共有する面をつなぐ
  }
  let b0 = 0, closed = {};
  for (let i = 0; i < cells.length; i++) {
    if (cells[i].dim === 0 && find(i) === i) b0++;
    if (cells[i].dim === 2) { let r = find(i); if (closed[r] === undefined) closed[r] = true; for (let e of cells[i].faces) if ((cells[e].ncof || 0) !== 2) closed[r] = false; }   // ncof = 面に接する回数（折り返しは 2 回）
  }
  let b2 = Object.values(closed).filter((x) => x).length;
  let chi = V - E + F;
  return { b0, b1: b0 + b2 - chi, b2, chi, V, E, F };
}

// 高さ関数 h[頂点] から離散勾配場（ペアリング）をつくる（lower star 法：Robins ら 2011）
//   返り値 pair[胞体] = 矢印の相手の胞体番号、臨界なら -1
function gradientFromHeight(cx, h) {
  let cells = cx.cells, n = cells.length;
  let pair = new Array(n).fill(-1), done = new Array(n).fill(false);
  // 胞体の「値」= 頂点の高さを大きい順に並べた列（同じ高さは頂点番号で区別）
  let gval = cells.map((c) => c.verts.map((v) => [h[v], v]).sort((a, b) => b[0] - a[0] || b[1] - a[1]));
  let cmp = (a, b) => { let x = gval[a], y = gval[b]; for (let k = 0; k < Math.min(x.length, y.length); k++) { if (x[k][0] !== y[k][0]) return x[k][0] - y[k][0]; if (x[k][1] !== y[k][1]) return x[k][1] - y[k][1]; } return x.length - y.length; };
  for (let x = 0; x < n; x++) {
    if (cells[x].dim !== 0) continue;
    let inL = {}, L = [];                                   // x の lower star：x がいちばん高い頂点である胞体
    for (let e of cells[x].cofaces) if (gval[e][0][1] === x) { L.push(e); inL[e] = true; for (let f of cells[e].cofaces) if (gval[f][0][1] === x && !inL[f]) { L.push(f); inL[f] = true; } }
    done[x] = true;
    if (!L.length) continue;                                // 臨界な頂点（極小）
    let unpaired = (a) => cells[a].faces.filter((b) => inL[b] && !done[b]);
    let edges = L.filter((c) => cells[c].dim === 1).sort(cmp);
    let delta = edges[0];
    pair[x] = delta; pair[delta] = x; done[delta] = true;   // いちばん低い辺と x をペアに
    let pq0 = edges.slice(1), pq1 = [];
    let addCof = (a) => { for (let b of cells[a].cofaces) if (inL[b] && !done[b] && unpaired(b).length === 1 && !pq1.includes(b)) pq1.push(b); };
    addCof(delta);
    while (pq0.length || pq1.length) {
      while (pq1.length) {
        pq1.sort(cmp);
        let a = pq1.shift(), u = unpaired(a);
        if (u.length === 0) pq0.push(a);
        else { let b = u[0]; pair[a] = b; pair[b] = a; done[a] = done[b] = true; pq0 = pq0.filter((c) => c !== b); addCof(a); addCof(b); }
      }
      if (pq0.length) { pq0.sort(cmp); let g = pq0.shift(); done[g] = true; addCof(g); }   // g は臨界
    }
  }
  return pair;
}

// 臨界胞体 c（次元 k）から矢印をたどって下る V-パスをすべて集める（次元 k−1 の臨界胞体で終わる）
//   返り値：パス（胞体番号の列）の配列。閉路に出会ったパスには loop = true がつく
function descendPaths(cx, pair, c, maxLen) {
  let cells = cx.cells, out = [], path = [c], onPath = { [c]: true };
  let walk = () => {
    let a = path[path.length - 1];
    for (let b of cells[a].faces) {
      if (b === pair[a]) continue;
      let p = pair[b];
      if (p < 0) out.push(path.concat([b]));
      else if (cells[p].dim === cells[a].dim) {
        if (onPath[p]) { let q = path.concat([b, p]); q.loop = true; out.push(q); }
        else if (path.length < (maxLen || 4000)) { path.push(b, p); onPath[p] = true; walk(); path.pop(); path.pop(); onPath[p] = false; }
      }
    }
  };
  walk();
  return out;
}

// 各胞体の描く位置 pos[胞体] = { x, y }（頂点 = 格子点、辺 = 中点、面 = 中心。同一視された胞体は最初の位置）
function gridPositions(cx, ox, oy, cs) {
  let pos = new Array(cx.cells.length).fill(null);
  let put = (c, x, y) => { if (c >= 0 && !pos[c]) pos[c] = { x, y }; };
  for (let i = 0; i <= cx.nx; i++) for (let j = 0; j <= cx.ny; j++) {
    put(cx.vid[i][j], ox + i * cs, oy + j * cs);
    put(cx.eh[i][j], ox + (i + 0.5) * cs, oy + j * cs);
    put(cx.ev[i][j], ox + i * cs, oy + (j + 0.5) * cs);
    put(cx.fid[i][j], ox + (i + 0.5) * cs, oy + (j + 0.5) * cs);
  }
  return pos;
}
