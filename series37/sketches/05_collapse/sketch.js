// ============================================
// 05 単体的崩壊（collapse）─ 自由面をつぶしていく
// 自由面（free face）= ちょうど 1 つの余面にしか含まれていない胞体。その胞体と余面を一緒に消しても「形」は変わらない
//   面 → 辺、辺 → 頂点と順につぶして、つぶせなくなった残りが「芯（core）」。円盤は点に、円環は円周に
//   崩壊の 1 歩 = 勾配場の矢印 1 本。崩壊を記録すると勾配場ができる（残った芯 = 臨界胞体）
// スペース = 1 歩 / Enter = 自動 / 1〜3 = 円盤・円環・穴 2 つ / R = ランダムな形 / N = やり直し
// ============================================

let nx = 14, ny = 9, cs = 62;     // ★ 格子の大きさ
let cx, pos, alive = [], pair = [], steps = 0;
let ox = 60, oy = 120, shapeNo = 1, auto = false;
let candidate = null, msg = '';

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  buildComplex();
}

function buildComplex(randomMask) {
  let holes = shapeNo === 1 ? [] : shapeNo === 2 ? [[5, 3, 4, 3]] : [[3, 3, 3, 3], [8, 3, 3, 3]];
  let rnd = randomMask ? Array.from({ length: nx * ny }, () => random() < 0.78) : null;
  let mask = (i, j) => rnd ? rnd[i + j * nx] : !holes.some(([x, y, w, h]) => i >= x && i < x + w && j >= y && j < y + h);
  cx = makeGridComplex(nx, ny, 'none', mask);
  pos = gridPositions(cx, ox, oy, cs);
  reset();
}
function reset() { alive = new Array(cx.cells.length).fill(true); pair = new Array(cx.cells.length).fill(-1); steps = 0; candidate = null; auto = false; msg = ''; }

// ★ 自由面を探す：生きている余面がちょうど 1 つの胞体。まず辺（面をつぶす）、なければ頂点（辺をつぶす）
function findFree() {
  let cells = cx.cells;
  for (let d of [1, 0]) {
    let list = [];
    for (let c = 0; c < cells.length; c++) if (alive[c] && cells[c].dim === d) { let up = cells[c].cofaces.filter((t) => alive[t]); if (up.length === 1) list.push([c, up[0]]); }
    if (list.length) return list[Math.floor(random(list.length))];
  }
  return null;
}
function collapseStep() {
  let fr = candidate || findFree();
  if (!fr) { auto = false; msg = '自由面がもうない → 芯（core）'; candidate = null; return; }
  alive[fr[0]] = false; alive[fr[1]] = false;
  pair[fr[0]] = fr[1]; pair[fr[1]] = fr[0];                  // 崩壊の記録 = 勾配の矢印
  steps++; candidate = null;
}

// 生き残った複体の V, E, F とベッチ数（Union-Find、平面なので b2 = 0）
function bettiAlive() {
  let cells = cx.cells, parent = cells.map((c, i) => i);
  let find = (a) => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
  let V = 0, E = 0, F = 0;
  for (let c = 0; c < cells.length; c++) {
    if (!alive[c]) continue;
    if (cells[c].dim === 0) V++;
    else if (cells[c].dim === 1) { E++; let a = find(cells[c].verts[0]), b = find(cells[c].verts[1]); if (a !== b) parent[a] = b; }
    else F++;
  }
  let b0 = 0; for (let c = 0; c < cells.length; c++) if (alive[c] && cells[c].dim === 0 && find(c) === c) b0++;
  return { V, E, F, b0, b1: b0 - (V - E + F) };
}

function draw() {
  background(225, 30, 8);
  if (auto && frameCount % 3 === 0) collapseStep();
  if (!candidate && !auto) candidate = findFree();
  let cells = cx.cells;
  // 消えた胞体はうすく、生きている胞体ははっきり
  noStroke();
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) { let f = cx.fid[i][j]; if (f < 0) continue; fill(alive[f] ? 12 : 225, alive[f] ? 60 : 15, alive[f] ? 75 : 14); rect(ox + i * cs + 1, oy + j * cs + 1, cs - 2, cs - 2); }
  for (let c = 0; c < cells.length; c++) if (cells[c].dim === 1) {
    let a = pos[cells[c].verts[0]], b = pos[cells[c].verts[1]];
    if (alive[c]) { stroke(85, 70, 95); strokeWeight(4); } else { stroke(0, 0, 22); strokeWeight(1); }
    line(a.x, a.y, b.x, b.y);
  }
  noStroke();
  for (let c = 0; c < cells.length; c++) if (cells[c].dim === 0) { fill(alive[c] ? 272 : 0, alive[c] ? 70 : 0, alive[c] ? 100 : 28); circle(pos[c].x, pos[c].y, alive[c] ? 14 : 5); }
  // 次につぶす自由面（黄色）
  if (candidate) {
    let [a, b] = candidate;
    stroke(48, 90, 100); strokeWeight(3); noFill();
    circle(pos[a].x, pos[a].y, cs * 0.45);
    if (cells[b].dim === 2) rect(pos[b].x - cs / 2 + 4, pos[b].y - cs / 2 + 4, cs - 8, cs - 8); else line(pos[cells[b].verts[0]].x, pos[cells[b].verts[0]].y, pos[cells[b].verts[1]].x, pos[cells[b].verts[1]].y);
    drawArrow(pos[a].x, pos[a].y, pos[b].x, pos[b].y, cs);
  }
  let b = bettiAlive();
  fill(0, 0, 100); noStroke(); textSize(20); textAlign(LEFT, BASELINE);
  text('崩壊 ' + steps + ' 歩　　残り V = ' + b.V + '　E = ' + b.E + '　F = ' + b.F + '　　χ = ' + (b.V - b.E + b.F) + '　b0 = ' + b.b0 + '　b1 = ' + b.b1 + '（崩壊しても変わらない）', ox, 44);
  fill(0, 0, 65); textSize(15);
  text('スペース：1 歩　Enter：自動 ' + (auto ? 'ON' : 'off') + '　1〜3：円盤・円環・穴 2 つ　R：ランダム　N：やり直し　　' + msg, ox, 72);
  fill(0, 0, 55); textSize(14);
  text('黄色 = 次の自由面（余面がちょうど 1 つ）とその余面。2 つまとめて消す。芯が点なら円盤、円周なら円環。芯 = 臨界胞体（極小 1 つ + 穴の数だけ鞍点）', ox, oy + ny * cs + 36);
}

function keyPressed() {
  if (key === ' ') collapseStep();
  if (key === ENTER) auto = !auto;
  if (key === 'n' || key === 'N') reset();
  if (key === 'r' || key === 'R') buildComplex(true);
  if (key === '1' || key === '2' || key === '3') { shapeNo = Number(key); buildComplex(); }
}

// ---------- やってみよう ----------
// 1. 円盤（1）を最後までつぶすと点が 1 つ残る。頂点 1 つ = 極小 1 つ、m = (1, 0, 0)
// 2. 円環（2）の芯は円周。頂点と辺が同じ数だけ残る。辺のうち「臨界」と呼べるのは何本？（ヒント：頂点 → 辺の矢印をさらに置くと）
// 3. R のランダムな形で、芯がどんな形になるか予想してから自動で走らせよう
// 4. findFree で「頂点から先に」つぶすと途中で止まることがある。順番を入れかえて試そう


// ==================================================
// ここから下は「離散モース理論の道具」
//   格子の胞体複体をつくる
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

function drawArrow(x1, y1, x2, y2, cs, g) {
  g = g || window;
  let a = Math.atan2(y2 - y1, x2 - x1), hd = Math.min(8, cs * 0.22);
  g.stroke(48, 70, 100); g.strokeWeight(Math.max(1.5, cs * 0.06));
  g.line(x1, y1, x2, y2);
  g.noStroke(); g.fill(48, 70, 100);
  g.triangle(x2, y2, x2 - hd * Math.cos(a - 0.5), y2 - hd * Math.sin(a - 0.5), x2 - hd * Math.cos(a + 0.5), y2 - hd * Math.sin(a + 0.5));
}
