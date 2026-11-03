// ============================================
// 10 パーシステンスで簡略化 ─ ノイズの臨界点を消す
// ノイズだらけの地形には臨界点が山ほどある。「鞍点 − 極小」「極大 − 鞍点」のペアを、高さの差（パーシステンス）が小さい順にキャンセルする（07）
//   しきい値 ε 以下のペアを全部消すと、ε より「しっかりした」臨界点だけが残る
//   右のバーコード：各ペアの誕生（低い方の高さ）から死（高い方の高さ）までの棒。長い棒 = 本物の地形、短い棒 = ノイズ
// ↑↓ = しきい値 ε / N = 新しい地形 / ←→ = ノイズの量
// ============================================

let nx = 48, ny = 30;             // ★ 地形の解像度
let cx, pos, basePair = [], pair = [], h = [];
let seq = [];                     // キャンセルの列 [{ path, pers, dim, birth, death }]
let eps = 0.05, noiseAmt = 0.25, ox = 30, oy = 100, cs, pg;
let dirty = true;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  cs = Math.min((width * 0.62 - 40) / nx, (height - 150) / ny);
  cx = makeGridComplex(nx, ny);
  pos = gridPositions(cx, ox, oy, cs);
  pg = createGraphics(width, height); pg.colorMode(HSB, 360, 100, 100, 100);
  newTerrain();
}

function newTerrain() {
  noiseSeed(Math.floor(random(10000)));
  h = [];
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= ny; j++) h[cx.vid[i][j]] = noise(i * 0.08, j * 0.08) + noiseAmt * noise(i * 0.6 + 5, j * 0.6 + 5) + 0.00001 * (i * 3 + j);
  basePair = gradientFromHeight(cx, h);
  buildSequence();
  dirty = true;
}
function cellHeight(p, c) { return Math.max(...cx.cells[c].verts.map((v) => h[v])); }

// ★ キャンセルの列を一度だけ計算：パーシステンス最小のペアを消す、をできなくなるまでくり返す（07 と同じ貪欲法）
function buildSequence() {
  pair = basePair.slice(); seq = [];
  while (true) {
    let best = null;
    for (let c = 0; c < cx.cells.length; c++) {
      if (pair[c] >= 0 || cx.cells[c].dim === 0) continue;
      let paths = descendPaths(cx, pair, c), ends = {};
      for (let p of paths) { let e = p[p.length - 1]; ends[e] = (ends[e] || []).concat([p]); }
      for (let e in ends) if (ends[e].length === 1) { let pers = cellHeight(pair, c) - cellHeight(pair, Number(e)); if (!best || pers < best.pers) best = { path: ends[e][0], pers, dim: cx.cells[c].dim - 1, birth: cellHeight(pair, Number(e)), death: cellHeight(pair, c) }; }
    }
    if (!best) break;
    cancelPath(pair, best.path); seq.push(best);
  }
}
function cancelPath(pr, path) { for (let k = 0; k + 1 < path.length; k += 2) { pr[path[k]] = path[k + 1]; pr[path[k + 1]] = path[k]; } }

// ★ ε 以下のキャンセルだけを最初からやり直す
function applyEps() {
  pair = basePair.slice();
  for (let s of seq) { if (s.pers > eps) break; cancelPath(pair, s.path); }
  pg.clear(); pg.noStroke();
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) { let v = cx.cells[cx.fid[i][j]].verts.reduce((s, q) => s + h[q], 0) / 4; pg.fill(200 - v * 110, 35, 18 + v * 50); pg.rect(ox + i * cs, oy + j * cs, cs + 0.5, cs + 0.5); }
  for (let c = 0; c < cx.cells.length; c++) if (pair[c] < 0) {
    let d = cx.cells[c].dim;
    if (d === 1) { let a = pos[cx.cells[c].verts[0]], b = pos[cx.cells[c].verts[1]]; pg.stroke(85, 90, 100); pg.strokeWeight(5); pg.line(a.x, a.y, b.x, b.y); }
    else { pg.noStroke(); pg.fill(d === 0 ? 272 : 12, 80, 100); pg.circle(pos[c].x, pos[c].y, 12); }
  }
  dirty = false;
}

function draw() {
  background(225, 30, 8);
  if (dirty) applyEps();
  image(pg, 0, 0);
  // バーコード
  let bx = ox + nx * cs + 40, bw = width - bx - 30, by = oy, bh = height - 160;
  let lo = Math.min(...h), hi = Math.max(...h), X = (v) => bx + (v - lo) / (hi - lo) * bw;
  let bars = seq.slice().sort((a, b) => a.dim - b.dim || b.pers - a.pers);
  let rowH = Math.min(10, bh / Math.max(1, bars.length));
  for (let k = 0; k < bars.length; k++) {
    let s = bars[k], alive = s.pers > eps;
    stroke(s.dim === 0 ? 272 : 85, alive ? 80 : 20, alive ? 100 : 50); strokeWeight(Math.max(1, rowH - 2));
    line(X(s.birth), by + k * rowH, X(s.death), by + k * rowH);
  }
  stroke(0, 0, 40); strokeWeight(1); line(bx, by + bh + 4, bx + bw, by + bh + 4);
  stroke(48, 90, 100); line(bx, by + bh + 4, bx + eps / (hi - lo) * bw, by + bh + 4); strokeWeight(3); line(bx + eps / (hi - lo) * bw, by + bh - 6, bx + eps / (hi - lo) * bw, by + bh + 14);
  noStroke(); fill(0, 0, 65); textSize(13);
  text('高さ（棒 = 誕生 → 死、長さ = パーシステンス）　黄色の目盛 = ε', bx, by + bh + 32);
  let m = countCritical(cx, pair), nCut = seq.filter((s) => s.pers <= eps).length;
  fill(0, 0, 100); textSize(20); textAlign(LEFT, BASELINE);
  text('ε = ' + nf(eps, 1, 3) + '　消したペア ' + nCut + ' / ' + seq.length + '　　残った臨界点 m = (' + m.join(', ') + ')　（最初は (' + countCritical(cx, basePair).join(', ') + ')）', ox, 40);
  fill(0, 0, 65); textSize(15);
  text('↑↓：しきい値 ε　N：新しい地形　←→：ノイズの量 ' + nf(noiseAmt, 1, 2) + '　　紫 = 極小　ライム = 鞍点　コーラル = 極大　　棒：紫 = 極小–鞍点のペア　ライム = 鞍点–極大のペア', ox, 66);
}

function keyPressed() {
  if (key === UP_ARROW) { eps = Math.min(1.5, eps + 0.01); dirty = true; }
  if (key === DOWN_ARROW) { eps = Math.max(0, eps - 0.01); dirty = true; }
  if (key === 'n' || key === 'N') newTerrain();
  if (key === RIGHT_ARROW) { noiseAmt = Math.min(0.8, noiseAmt + 0.05); newTerrain(); }
  if (key === LEFT_ARROW) { noiseAmt = Math.max(0, noiseAmt - 0.05); newTerrain(); }
}

// ---------- やってみよう ----------
// 1. ε を 0 から少しずつ上げて、臨界点が「ばらばらに」ではなく「2 つずつ」消えるのを見よう
// 2. 棒の長さの分布を見て、ノイズと本物の境目の ε を決めよう。ノイズの量（←→）を変えると境目はどう動く？
// 3. ε を最大にすると極小 1 つだけが残る（円盤の b0 = 1）。その極小は地形のどこ？
// 4. パーシステンスの長い順に 3 つの極小を選んで、地形の「本当の盆地」と言えるか確かめよう


// ==================================================
// ここから下は「離散モース理論の道具」
//   格子の胞体複体をつくる・高さ関数から勾配場をつくる・V-パスをたどる・臨界胞体を数える
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

// 臨界胞体の数 [m0, m1, m2]
function countCritical(cx, pair) {
  let m = [0, 0, 0];
  for (let i = 0; i < cx.cells.length; i++) if (pair[i] < 0) m[cx.cells[i].dim]++;
  return m;
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
