// ============================================
// 09 地形のモース・スメール複体 ─ 流域と稜線・谷線
// ハイトマップ（ノイズ地形）の各頂点を矢印にそって流す。たどり着く極小ごとに色分けすると「流域（分水嶺で区切られた盆地）」になる
//   鞍点から降りる V-パス = 谷線（極小へ）、鞍点から登る V-パス = 稜線（極大へ）。合わせてモース・スメール複体
// マウスドラッグ = 地形を盛り上げる / Shift+ドラッグ = 掘る / N = 新しい地形 / B = 流域の色 / L = 稜線・谷線 / ↑↓ = ブラシの大きさ
// ============================================

let nx = 64, ny = 40;             // ★ 地形の解像度
let cx, pos, pair = [], h = [], basin = [];
let ox = 30, oy = 100, cs, pg;
let showBasin = true, showLines = true, brush = 5, dirty = true, lastCompute = 0;
let hues = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  cs = Math.min((width - 60) / nx, (height - 150) / ny);
  cx = makeGridComplex(nx, ny);
  pos = gridPositions(cx, ox, oy, cs);
  pg = createGraphics(width, height); pg.colorMode(HSB, 360, 100, 100, 100);
  for (let k = 0; k < 4000; k++) hues.push((k * 137.5) % 360);
  noiseDetail(2, 0.35);
  newTerrain();
}

function newTerrain() {
  noiseSeed(Math.floor(random(10000)));
  h = [];
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= ny; j++) h[cx.vid[i][j]] = noise(i * 0.05, j * 0.05) + 0.12 * noise(i * 0.14 + 7, j * 0.14 + 7) + 0.00001 * (i * 3 + j);
  dirty = true;
}

// ★ 勾配場 → 流域（各頂点を矢印にそって流して、着いた極小の番号）→ 画像に描く
function computeField() {
  pair = gradientFromHeight(cx, h);
  basin = new Array(cx.cells.length).fill(-1);
  let cells = cx.cells;
  for (let v = 0; v < cells.length; v++) {
    if (cells[v].dim !== 0 || basin[v] >= 0) continue;
    let trail = [], c = v;
    while (basin[c] < 0 && pair[c] >= 0) { trail.push(c); let e = pair[c]; c = cells[e].verts[0] === c ? cells[e].verts[1] : cells[e].verts[0]; }
    let b = basin[c] >= 0 ? basin[c] : c;
    basin[c] = b; for (let t of trail) basin[t] = b;
  }
  // 描画（面の色 = 流域、明るさ = 高さ）
  pg.clear(); pg.noStroke();
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    let f = cx.fid[i][j], vs = cells[f].verts, v = vs.reduce((s, q) => s + h[q], 0) / 4;
    let b = basin[vs[3]], edge = vs.some((q) => basin[q] !== b);
    if (showBasin) pg.fill(hues[b % hues.length], edge ? 20 : 55, 20 + v * 55); else pg.fill(200 - v * 120, 40, 20 + v * 55);
    pg.rect(ox + i * cs, oy + j * cs, cs + 0.5, cs + 0.5);
  }
  if (showLines) for (let c = 0; c < cells.length; c++) if (pair[c] < 0 && cells[c].dim === 1) {
    pg.noFill();
    for (let [paths, hue] of [[descendPaths(cx, pair, c), 205], [ascendPaths(cx, pair, c), 12]]) {
      pg.stroke(hue, 85, 100, 85); pg.strokeWeight(2);
      for (let p of paths) { pg.beginShape(); for (let q of p) pg.vertex(pos[q].x, pos[q].y); pg.endShape(); }
    }
  }
  pg.noStroke();
  for (let c = 0; c < cells.length; c++) if (pair[c] < 0) {
    let d = cells[c].dim; pg.fill([272, 85, 12][d], 75, 100);
    if (d === 1) { let a = pos[cells[c].verts[0]], b = pos[cells[c].verts[1]]; pg.stroke(85, 90, 100); pg.strokeWeight(4); pg.line(a.x, a.y, b.x, b.y); pg.noStroke(); }
    else pg.circle(pos[c].x, pos[c].y, d === 0 ? 9 : 11);
  }
  dirty = false; lastCompute = millis();
}

// ★ ブラシ：マウスのまわりをガウス関数で盛り上げる（Shift で掘る）
function paint() {
  let ci = (mouseX - ox) / cs, cj = (mouseY - oy) / cs, sgn = keyIsDown(SHIFT) ? -1 : 1;
  for (let i = Math.max(0, Math.floor(ci - brush * 2)); i <= Math.min(nx, Math.ceil(ci + brush * 2)); i++)
    for (let j = Math.max(0, Math.floor(cj - brush * 2)); j <= Math.min(ny, Math.ceil(cj + brush * 2)); j++) {
      let d2 = ((i - ci) * (i - ci) + (j - cj) * (j - cj)) / (brush * brush);
      let v = cx.vid[i][j]; h[v] = constrain(h[v] + sgn * 0.03 * Math.exp(-d2), 0, 2);
    }
  dirty = true;
}

function draw() {
  background(225, 30, 8);
  if (dirty && millis() - lastCompute > 60) computeField();
  image(pg, 0, 0);
  if (mouseY > oy) { noFill(); stroke(0, 0, 100, 50); strokeWeight(1); circle(mouseX, mouseY, brush * cs * 2); }
  let m = countCritical(cx, pair);
  let nb = new Set(basin.filter((b) => b >= 0)).size;
  fill(0, 0, 100); noStroke(); textSize(20); textAlign(LEFT, BASELINE);
  text('極小 m0 = ' + m[0] + '（流域 ' + nb + ' 個）　鞍点 m1 = ' + m[1] + '　極大 m2 = ' + m[2] + '　　m0 − m1 + m2 = ' + (m[0] - m[1] + m[2]) + ' = χ（円盤 = 1）', ox, 40);
  fill(0, 0, 65); textSize(15);
  text('ドラッグ：盛り上げる　Shift+ドラッグ：掘る　N：新しい地形　B：流域の色 ' + (showBasin ? 'ON' : 'off') + '　L：稜線・谷線 ' + (showLines ? 'ON' : 'off') + '　↑↓：ブラシ ' + brush + '　　青 = 谷線（鞍点 → 極小）　赤 = 稜線（鞍点 → 極大）', ox, 66);
}

function mouseDragged() { if (mouseY > oy) paint(); }
function mousePressed() { if (mouseY > oy) paint(); }
function keyPressed() {
  if (key === 'n' || key === 'N') newTerrain();
  if (key === 'b' || key === 'B') { showBasin = !showBasin; dirty = true; }
  if (key === 'l' || key === 'L') { showLines = !showLines; dirty = true; }
  if (key === UP_ARROW) brush = Math.min(12, brush + 1);
  if (key === DOWN_ARROW) brush = Math.max(2, brush - 1);
}

// ---------- やってみよう ----------
// 1. 2 つの流域の境目（分水嶺）に鞍点があることを確かめよう。鞍点を掘ると流域が合体する
// 2. 山を 1 つ盛り上げると、極大 1 つと鞍点 1 つが同時に生まれる。なぜ？（m0 − m1 + m2 = 1 のまま）
// 3. 谷線（青）はどの流域の中を通る？ 稜線（赤）は流域の境界とどう関係する？
// 4. noise の 0.05 を 0.1 にして、流域の数がどう変わるか見よう


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
