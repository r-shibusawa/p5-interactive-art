// ============================================
// 14 モース・ブラシ ─ 地形を描くと流域と臨界点が浮かび上がる
// マウスで地形を盛り上げ（Shift で掘り）、そのたびに離散勾配場を計算しなおす
//   極小ごとの流域（09）を色で塗り分け、分水嶺を暗い線で、臨界点を記号で描くアート。自由制作のベース
// ドラッグ = 盛り上げる / Shift+ドラッグ = 掘る / 1〜3 = 配色 / ↑↓ = ブラシの大きさ / H = 記号の表示 / C = 平らに / S = 画像を保存
// ============================================

let nx = 80, ny = 50;             // ★ 地形の解像度
let cx, pos, pair = [], h = [], basin = [];
let ox = 0, oy = 0, cs, pg, dirty = true, lastCompute = 0;
let brush = 6, paletteNo = 1, showMarks = true, strokes = 0;
let hues = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  cs = Math.max(width / nx, height / ny);
  cx = makeGridComplex(nx, ny);
  pos = gridPositions(cx, ox, oy, cs);
  pg = createGraphics(width, height); pg.colorMode(HSB, 360, 100, 100, 100);
  for (let k = 0; k < 4000; k++) hues.push((k * 137.5) % 360);
  noiseDetail(2, 0.3);
  flatten();
}
function flatten() {
  noiseSeed(Math.floor(random(10000)));
  h = [];
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= ny; j++) h[cx.vid[i][j]] = 0.1 * noise(i * 0.05, j * 0.05) + 0.00001 * (i * 3 + j);
  strokes = 0; dirty = true;
}

// ★ 配色：流域の番号 → 色相、高さ → 明るさ
function faceColor(b, v, edge) {
  let hue = hues[b % hues.length];
  if (paletteNo === 1) return [hue, edge ? 10 : 50, 25 + v * 60];                       // 虹色の流域
  if (paletteNo === 2) return [(hue % 60) + 180, edge ? 10 : 70, 15 + v * 75];         // 青〜紫の夜
  return [20 + (hue % 40), edge ? 5 : 60, 20 + v * 70];                                // 砂と土
}

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
  let lo = Math.min(...h), hi = Math.max(...h) + 1e-6;
  pg.noStroke();
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    let f = cx.fid[i][j], vs = cells[f].verts, v = (vs.reduce((s, q) => s + h[q], 0) / 4 - lo) / (hi - lo);
    let b = basin[vs[0]], edge = vs.some((q) => basin[q] !== b);
    let [hh, ss, bb] = faceColor(b, v, edge);
    pg.fill(hh, ss, edge ? bb * 0.45 : bb); pg.rect(ox + i * cs, oy + j * cs, cs + 0.5, cs + 0.5);
  }
  if (showMarks) for (let c = 0; c < cells.length; c++) if (pair[c] < 0) {
    let d = cells[c].dim, p = pos[c];
    if (d === 0) { pg.noStroke(); pg.fill(0, 0, 100, 85); pg.circle(p.x, p.y, 7); }
    if (d === 1) { pg.stroke(85, 80, 100, 90); pg.strokeWeight(2); pg.line(p.x - 5, p.y - 5, p.x + 5, p.y + 5); pg.line(p.x - 5, p.y + 5, p.x + 5, p.y - 5); }
    if (d === 2) { pg.noFill(); pg.stroke(12, 80, 100, 90); pg.strokeWeight(2.5); pg.circle(p.x, p.y, 14); }
  }
  dirty = false; lastCompute = millis();
}

// ★ ブラシ：ガウス関数で盛り上げる／掘る
function paint() {
  let ci = (mouseX - ox) / cs, cj = (mouseY - oy) / cs, sgn = keyIsDown(SHIFT) ? -1 : 1;
  for (let i = Math.max(0, Math.floor(ci - brush * 2)); i <= Math.min(nx, Math.ceil(ci + brush * 2)); i++)
    for (let j = Math.max(0, Math.floor(cj - brush * 2)); j <= Math.min(ny, Math.ceil(cj + brush * 2)); j++) {
      let d2 = ((i - ci) * (i - ci) + (j - cj) * (j - cj)) / (brush * brush);
      let v = cx.vid[i][j]; h[v] = constrain(h[v] + sgn * 0.04 * Math.exp(-d2), -3, 3);
    }
  dirty = true; strokes++;
}

function draw() {
  if (dirty && millis() - lastCompute > 50) computeField();
  image(pg, 0, 0);
  noFill(); stroke(0, 0, 100, 60); strokeWeight(1); circle(mouseX, mouseY, brush * cs * 2);
  if (showMarks) {
    let m = countCritical(cx, pair);
    noStroke(); fill(0, 0, 0, 45); rect(0, 0, width, 64);
    fill(0, 0, 100); textSize(18); textAlign(LEFT, BASELINE);
    text('極小 ' + m[0] + '（流域）　鞍点 ' + m[1] + '　極大 ' + m[2] + '　　m0 − m1 + m2 = ' + (m[0] - m[1] + m[2]), 20, 28);
    fill(0, 0, 80); textSize(14);
    text('ドラッグ：盛り上げる　Shift+ドラッグ：掘る　1〜3：配色　↑↓：ブラシ ' + brush + '　H：記号を消す　C：平らに　S：保存　　○ = 極小　× = 鞍点　◯ = 極大　暗い線 = 分水嶺', 20, 52);
  }
}

function mouseDragged() { paint(); }
function mousePressed() { paint(); }
function keyPressed() {
  if (key === '1' || key === '2' || key === '3') { paletteNo = Number(key); dirty = true; }
  if (key === UP_ARROW) brush = Math.min(16, brush + 1);
  if (key === DOWN_ARROW) brush = Math.max(2, brush - 1);
  if (key === 'h' || key === 'H') { showMarks = !showMarks; dirty = true; }
  if (key === 'c' || key === 'C') flatten();
  if (key === 's' || key === 'S') saveCanvas('morse_brush', 'png');
}

// ---------- やってみよう ----------
// 1. 山を 1 つ描くと流域はどう分かれる？ 山脈（線）を描くと？ 分水嶺が線の上に来るか確かめよう
// 2. 穴（Shift）を 3 つ掘ると流域が 3 つになる。間の鞍点（×）を掘って 2 つにつなげよう
// 3. faceColor を自分の配色にしよう（流域の番号 b で色相、高さ v で明るさ、edge で境界）
// 4. 記号を消して（H）、流域の色だけの抽象画にする。brush を 2 にして細かい「模様」を描こう


// ==================================================
// ここから下は「離散モース理論の道具」
//   格子の胞体複体をつくる・高さ関数から勾配場をつくる・臨界胞体を数える
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
