// ============================================
// 04 V-パス ─ 矢印をたどる、閉路があったら勾配場ではない
// V-パス = 臨界胞体から矢印を「渡っては降りる」をくり返す列（面 → 辺 → 面 → 辺 … / 辺 → 頂点 → 辺 → 頂点 …）
//   矢印の集まりが「離散勾配ベクトル場」と呼べるのは、閉じた V-パス（閉路）がないときだけ
//   A のランダムな矢印にはたいてい閉路がある（赤く点滅）。G の高さ関数から作った矢印には絶対にない
// A = ランダムな矢印 / G = 高さ関数からの勾配場 / クリック = 臨界胞体を選んで V-パスを見る / P = 全部のパス
// ============================================

let nx = 12, ny = 7, cs = 76;     // ★ 格子の大きさ
let cx, pos, pair = [];
let ox = 60, oy = 120;
let cycles = [], inCycle = [];
let selected = -1, showAll = true, msg = '';

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  cx = makeGridComplex(nx, ny);
  pos = gridPositions(cx, ox, oy, cs);
  fromHeight();
}

function fromHeight() {
  noiseSeed(Math.floor(random(1000)));
  let h = []; for (let i = 0; i <= nx; i++) for (let j = 0; j <= ny; j++) h[cx.vid[i][j]] = noise(i * 0.45, j * 0.45) + 0.0001 * (i * 3 + j);
  pair = gradientFromHeight(cx, h);
  findCycles(); selected = -1;
  msg = '高さ関数から：矢印はいつも「下り」なので閉路はできない';
}
function randomField() {
  pair = new Array(cx.cells.length).fill(-1);
  let order = []; for (let a = 0; a < cx.cells.length; a++) for (let b of cx.cells[a].cofaces) order.push([a, b]);
  order.sort(() => random() - 0.5);
  for (let [a, b] of order) if (pair[a] < 0 && pair[b] < 0 && random() < 0.9) { pair[a] = b; pair[b] = a; }
  findCycles(); selected = -1;
  msg = 'ランダムな矢印：閉路が ' + cycles.length + ' 個';
}

// ★ 閉路を探す：胞体 c から「矢印の先の胞体の、c 以外の面」へ進むグラフで深さ優先探索
function findCycles() {
  let cells = cx.cells, n = cells.length;
  let next = (c) => (pair[c] >= 0 && cells[pair[c]].dim > cells[c].dim) ? cells[pair[c]].faces.filter((x) => x !== c) : [];
  let state = new Array(n).fill(0), stack = [];
  cycles = []; inCycle = new Array(n).fill(false);
  let dfs = (c) => {
    state[c] = 1; stack.push(c);
    for (let d of next(c)) {
      if (state[d] === 0) dfs(d);
      else if (state[d] === 1) {                         // 戻る辺 = 閉路
        let cyc = stack.slice(stack.indexOf(d)), full = [];
        for (let e of cyc) { full.push(e, pair[e]); inCycle[e] = true; inCycle[pair[e]] = true; }
        cycles.push(full);
      }
    }
    stack.pop(); state[c] = 2;
  };
  for (let c = 0; c < n; c++) if (state[c] === 0) dfs(c);
}

function drawPath(p, hue, wgt) {
  stroke(hue, 80, 100, 85); strokeWeight(wgt); noFill();
  beginShape(); for (let c of p) vertex(pos[c].x, pos[c].y); endShape();
}

function draw() {
  background(225, 30, 8);
  drawGridComplex(cx, pair, ox, oy, cs, true);
  // V-パス
  let paths = [];
  for (let c = 0; c < cx.cells.length; c++) if (pair[c] < 0 && cx.cells[c].dim > 0 && (showAll || c === selected)) for (let p of descendPaths(cx, pair, c, 300)) { p.from = c; paths.push(p); }
  for (let p of paths) drawPath(p, cx.cells[p.from].dim === 1 ? 190 : 30, p.from === selected ? 6 : 2.5);
  // 閉路（赤く点滅）
  if (cycles.length && (frameCount % 40) < 24) for (let cyc of cycles) {
    stroke(0, 90, 100); strokeWeight(7); noFill();
    beginShape(); for (let c of cyc) vertex(pos[c].x, pos[c].y); endShape(CLOSE);
  }
  if (selected >= 0) { noFill(); stroke(0, 0, 100); strokeWeight(3); circle(pos[selected].x, pos[selected].y, cs * 0.5); }

  let m = countCritical(cx, pair);
  fill(0, 0, 100); noStroke(); textSize(20); textAlign(LEFT, BASELINE);
  if (cycles.length) text('✗ 閉路が ' + cycles.length + ' 個 → これは勾配ベクトル場ではない（臨界胞体 m = ' + m.join(', ') + ' はあてにならない）', ox, 44);
  else text('✓ 閉路なし → 離散勾配ベクトル場　臨界胞体 m0 = ' + m[0] + '　m1 = ' + m[1] + '　m2 = ' + m[2] + '　V-パス ' + paths.length + ' 本', ox, 44);
  fill(0, 0, 65); textSize(15);
  text('A：ランダムな矢印　G：高さ関数から　クリック：臨界胞体を選ぶ　P：全部のパス ' + (showAll ? 'ON' : 'off') + '　　' + msg, ox, 72);
  fill(0, 0, 55); textSize(14);
  text('水色 = 臨界な辺（鞍点）から頂点へ降りる 1 次元の V-パス　オレンジ = 臨界な面（極大）から辺へ降りる 2 次元の V-パス　赤 = 閉じた V-パス', ox, oy + ny * cs + 36);
}

function mousePressed() {
  let best = -1, bd = cs * 0.4;
  for (let c = 0; c < cx.cells.length; c++) if (pair[c] < 0) { let d = dist(mouseX, mouseY, pos[c].x, pos[c].y); if (d < bd) { bd = d; best = c; } }
  selected = best;
  if (best >= 0) msg = '臨界胞体（次元 ' + cx.cells[best].dim + '）からの V-パス';
}

function keyPressed() {
  if (key === 'a' || key === 'A') randomField();
  if (key === 'g' || key === 'G') fromHeight();
  if (key === 'p' || key === 'P') showAll = !showAll;
}

// ---------- やってみよう ----------
// 1. A を押して閉路を見つけよう。閉路は「面 → 辺 → 面 → 辺」型と「辺 → 頂点 → 辺 → 頂点」型のどちら？
// 2. G の勾配場で、1 つの鞍点（臨界な辺）から出る V-パスは必ず 2 本。なぜ？
// 3. 極大（臨界な面）から出る V-パスは何本？ 枝分かれするのはどこ？
// 4. 閉路がないとき、矢印を全部たどると必ず臨界胞体で止まる。この性質を使うのが 05〜08


// ==================================================
// ここから下は「離散モース理論の道具」
//   格子の胞体複体をつくる・高さ関数から勾配場をつくる・V-パスをたどる・臨界胞体を数える・描く
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

// 格子複体を描く（左上 ox, oy・1 マス cs）。臨界：頂点 = 紫、辺 = ライム、面 = コーラル。showArrows で矢印も描く
//   g を渡すとその createGraphics に描く（省略ならキャンバス）。onlyCritFaces なら臨界でない面は塗らない
function drawGridComplex(cx, pair, ox, oy, cs, showArrows, g, onlyCritFaces) {
  g = g || window;
  let { cells, nx, ny, vid, eh, ev, fid } = cx;
  g.noStroke();
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    let f = fid[i][j]; if (f < 0) continue;
    if (pair[f] < 0) g.fill(12, 80, 95, 75); else if (onlyCritFaces) continue; else g.fill(225, 25, 22);
    g.rect(ox + i * cs + 1, oy + j * cs + 1, cs - 2, cs - 2);
  }
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= ny; j++) {
    let e = eh[i][j];
    if (e >= 0) { if (pair[e] < 0) { g.stroke(85, 90, 95); g.strokeWeight(5); } else { g.stroke(0, 0, 42); g.strokeWeight(1.5); } g.line(ox + i * cs, oy + j * cs, ox + (i + 1) * cs, oy + j * cs); }
    e = ev[i][j];
    if (e >= 0) { if (pair[e] < 0) { g.stroke(85, 90, 95); g.strokeWeight(5); } else { g.stroke(0, 0, 42); g.strokeWeight(1.5); } g.line(ox + i * cs, oy + j * cs, ox + i * cs, oy + (j + 1) * cs); }
  }
  g.noStroke();
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= ny; j++) {
    let v = vid[i][j]; if (v < 0) continue;
    if (pair[v] < 0) { g.fill(272, 70, 100); g.circle(ox + i * cs, oy + j * cs, cs * 0.34); } else { g.fill(0, 0, 72); g.circle(ox + i * cs, oy + j * cs, Math.max(3, cs * 0.14)); }
  }
  if (!showArrows) return;
  let half = cs / 2;
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= ny; j++) {
    let x = ox + i * cs, y = oy + j * cs, v = vid[i][j];
    if (v >= 0 && pair[v] >= 0) {                                        // 頂点 → 辺
      let p = pair[v];
      if (i < nx && eh[i][j] === p) drawArrow(x, y, x + half, y, cs, g);
      if (i > 0 && eh[i - 1][j] === p) drawArrow(x, y, x - half, y, cs, g);
      if (j < ny && ev[i][j] === p) drawArrow(x, y, x, y + half, cs, g);
      if (j > 0 && ev[i][j - 1] === p) drawArrow(x, y, x, y - half, cs, g);
    }
    let e = eh[i][j];
    if (e >= 0 && pair[e] >= 0 && cells[pair[e]].dim === 2) {            // 横の辺 → 面
      if (j < ny && fid[i][j] === pair[e]) drawArrow(x + half, y, x + half, y + half, cs, g);
      if (j > 0 && fid[i][j - 1] === pair[e]) drawArrow(x + half, y, x + half, y - half, cs, g);
    }
    e = ev[i][j];
    if (e >= 0 && pair[e] >= 0 && cells[pair[e]].dim === 2) {            // 縦の辺 → 面
      if (i < nx && fid[i][j] === pair[e]) drawArrow(x, y + half, x + half, y + half, cs, g);
      if (i > 0 && fid[i - 1][j] === pair[e]) drawArrow(x, y + half, x - half, y + half, cs, g);
    }
  }
}

function drawArrow(x1, y1, x2, y2, cs, g) {
  g = g || window;
  let a = Math.atan2(y2 - y1, x2 - x1), hd = Math.min(8, cs * 0.22);
  g.stroke(48, 70, 100); g.strokeWeight(Math.max(1.5, cs * 0.06));
  g.line(x1, y1, x2, y2);
  g.noStroke(); g.fill(48, 70, 100);
  g.triangle(x2, y2, x2 - hd * Math.cos(a - 0.5), y2 - hd * Math.sin(a - 0.5), x2 - hd * Math.cos(a + 0.5), y2 - hd * Math.sin(a + 0.5));
}
