// ============================================
// 15 ウェブカメラ輝度のモース理論（おまけ）
// カメラの映像を小さく縮めて、明るさを高さ関数にする。離散勾配場を毎フレーム計算して
//   極小（暗い点）・鞍点・極大（明るい点）と、流域の境界（分水嶺）を映像の上に重ねる
//   ↑↓ のしきい値 ε で持続の短い臨界点を隠す（簡略化）。カメラが使えないときは動くノイズ画像で代用
// ↑↓ = しきい値 ε / B = 流域の境界 / I = 明暗を反転 / M = 記号の大きさ（カメラの許可が必要）
// ============================================

let vw = 64, vh = 48;             // ★ 映像の解像度
let cap, usingCam = false, startMs = 0;
let cx, pos, pair = [], h = [], basin = [];
let ox = 30, oy = 100, cs, eps = 0.06, showBasin = true, invert = false, big = false;
let shown = { mins: [], sads: [], maxs: [] }, boundary = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  pixelDensity(1);
  cs = Math.min((width - 60) / (vw - 1), (height - 150) / (vh - 1));
  cx = makeGridComplex(vw - 1, vh - 1);
  pos = gridPositions(cx, ox, oy, cs);
  h = new Array((vw) * (vh)).fill(0.5);
  cap = createCapture(VIDEO, { flipped: true });
  cap.size(vw, vh);
  cap.hide();
  startMs = millis();
}

// ★ 高さ関数を更新：カメラの明るさ（なければノイズ）を少しなめらかにして、前のフレームと混ぜる
function updateHeights() {
  let src = [];
  cap.loadPixels();
  usingCam = cap.width > 0 && cap.pixels.length >= vw * vh * 4;
  for (let j = 0; j < vh; j++) for (let i = 0; i < vw; i++) {
    let v;
    if (usingCam) { let p = (i + j * vw) * 4; v = (cap.pixels[p] * 0.3 + cap.pixels[p + 1] * 0.59 + cap.pixels[p + 2] * 0.11) / 255; }
    else v = noise(i * 0.08 + frameCount * 0.01, j * 0.08, frameCount * 0.005);
    src.push(invert ? 1 - v : v);
  }
  for (let j = 0; j < vh; j++) for (let i = 0; i < vw; i++) {
    let s = 0, n = 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { let x = i + di, y = j + dj; if (x >= 0 && y >= 0 && x < vw && y < vh) { s += src[x + y * vw]; n++; } }
    let v = cx.vid[i][j], target = s / n + 0.00001 * (i * 3 + j);
    h[v] = h[v] * 0.5 + target * 0.5;
  }
}

// ★ 勾配場 → 臨界点の持続（パーシステンスの近似）→ ε 以上のものだけ表示。流域の境界も求める
function analyze() {
  pair = gradientFromHeight(cx, h);
  let cells = cx.cells;
  basin = new Array(cells.length).fill(-1);
  for (let v = 0; v < cells.length; v++) {
    if (cells[v].dim !== 0 || basin[v] >= 0) continue;
    let trail = [], c = v;
    while (basin[c] < 0 && pair[c] >= 0) { trail.push(c); let e = pair[c]; c = cells[e].verts[0] === c ? cells[e].verts[1] : cells[e].verts[0]; }
    let b = basin[c] >= 0 ? basin[c] : c;
    basin[c] = b; for (let t of trail) basin[t] = b;
  }
  let ch = (c) => Math.max(...cells[c].verts.map((v) => h[v]));
  let minPers = {}, maxPers = {}, sads = [];
  for (let c = 0; c < cells.length; c++) {
    if (pair[c] >= 0 || cells[c].dim !== 1) continue;
    let down = descendPaths(cx, pair, c).map((p) => p[p.length - 1]), up = ascendPaths(cx, pair, c).map((p) => p[p.length - 1]);
    let pd = Infinity, pu = Infinity;
    if (down.length === 2 && down[0] !== down[1]) { let young = h[down[0]] > h[down[1]] ? down[0] : down[1]; pd = ch(c) - h[young]; minPers[young] = Math.min(minPers[young] ?? Infinity, pd); }
    if (up.length >= 2 && new Set(up).size >= 2) { let young = up.reduce((a, b) => (ch(a) < ch(b) ? a : b)); pu = ch(young) - ch(c); maxPers[young] = Math.min(maxPers[young] ?? Infinity, pu); }
    if (Math.min(pd, pu) >= eps) sads.push(c);
  }
  shown.sads = sads;
  shown.mins = []; shown.maxs = [];
  for (let c = 0; c < cells.length; c++) if (pair[c] < 0) {
    if (cells[c].dim === 0 && (minPers[c] ?? Infinity) >= eps) shown.mins.push(c);
    if (cells[c].dim === 2 && (maxPers[c] ?? Infinity) >= eps) shown.maxs.push(c);
  }
  boundary = [];
  for (let i = 0; i < vw - 1; i++) for (let j = 0; j < vh - 1; j++) { let a = cx.vid[i][j]; if (basin[a] !== basin[cx.vid[i + 1][j]] || basin[a] !== basin[cx.vid[i][j + 1]]) boundary.push(a); }
}

function draw() {
  background(225, 30, 8);
  if (frameCount % 3 === 0) { updateHeights(); analyze(); }
  // 映像（高さ）を描く
  noStroke();
  for (let i = 0; i < vw - 1; i++) for (let j = 0; j < vh - 1; j++) { let v = h[cx.vid[i][j]]; fill(220, 15, 10 + v * 85); rect(ox + i * cs, oy + j * cs, cs + 0.5, cs + 0.5); }
  if (showBasin) { fill(85, 60, 100, 35); for (let a of boundary) rect(pos[a].x - cs / 2, pos[a].y - cs / 2, cs, cs); }
  let r = big ? 2 : 1;
  for (let c of shown.mins) { fill(272, 80, 100); circle(pos[c].x, pos[c].y, 9 * r); }
  for (let c of shown.maxs) { fill(12, 85, 100); circle(pos[c].x, pos[c].y, 9 * r); }
  stroke(85, 90, 100); strokeWeight(2 * r); noFill();
  for (let c of shown.sads) { let p = pos[c]; line(p.x - 4 * r, p.y - 4 * r, p.x + 4 * r, p.y + 4 * r); line(p.x - 4 * r, p.y + 4 * r, p.x + 4 * r, p.y - 4 * r); }
  let m = countCritical(cx, pair);
  fill(0, 0, 100); noStroke(); textSize(20); textAlign(LEFT, BASELINE);
  text((usingCam ? 'カメラ' : millis() - startMs < 3000 ? 'カメラを待っています…' : 'カメラなし → ノイズ画像') + '　臨界点 m = (' + m.join(', ') + ')　→ ε = ' + nf(eps, 1, 2) + ' 以上：極小 ' + shown.mins.length + '　鞍点 ' + shown.sads.length + '　極大 ' + shown.maxs.length, ox, 40);
  fill(0, 0, 65); textSize(15);
  text('↑↓：しきい値 ε　B：流域の境界 ' + (showBasin ? 'ON' : 'off') + '　I：反転　M：記号を大きく　　紫 = 極小（暗い点）　× = 鞍点　コーラル = 極大（明るい点）　ライム = 分水嶺', ox, 66);
}

function keyPressed() {
  if (key === UP_ARROW) eps = Math.min(0.6, eps + 0.02);
  if (key === DOWN_ARROW) eps = Math.max(0, eps - 0.02);
  if (key === 'b' || key === 'B') showBasin = !showBasin;
  if (key === 'i' || key === 'I') invert = !invert;
  if (key === 'm' || key === 'M') big = !big;
}

// ---------- やってみよう ----------
// 1. 顔を映して ε を上げる。最後まで残る極大は？（たいてい額や鼻先）残る極小は？（目・鼻の穴）
// 2. 手を広げると指ごとに極大が出て、指の間に鞍点が出る。何本の鞍点が出る？ 極大 − 鞍点 は？
// 3. 懐中電灯やスマホのライトを動かして、極大が流域（分水嶺）をどう動かすか見よう
// 4. 反転（I）すると極大と極小が入れかわる。分水嶺（流域の境界）はどう変わる？


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

// 臨界胞体 c（次元 k）から矢印を逆にたどって上る V-パス（次元 k+1 の臨界胞体で終わる）
function ascendPaths(cx, pair, c, maxLen) {
  let cells = cx.cells, out = [], path = [c], onPath = { [c]: true };
  let walk = () => {
    let a = path[path.length - 1];
    for (let b of cells[a].cofaces) {
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
