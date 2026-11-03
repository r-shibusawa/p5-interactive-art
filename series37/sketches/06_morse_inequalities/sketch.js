// ============================================
// 06 モース不等式 ─ 臨界胞体の数はベッチ数より少なくできない
// 高さ関数（ノイズ）から勾配場を作り、臨界胞体の数 m_k とベッチ数 b_k をバーグラフでくらべる
//   弱いモース不等式  m_k ≥ b_k　　　オイラーの関係  m0 − m1 + m2 = b0 − b1 + b2 = χ
//   強いモース不等式  m1 − m0 ≥ b1 − b0　（m0 が多ければ m1 もそのぶん多い：極小と鞍点はペアで余る）
// 1〜3 = 円盤・円環・穴 2 つ / N = 新しい高さ関数 / ←→ = ノイズの細かさ / A = 矢印の表示
// ============================================

let nx = 16, ny = 10, cs = 48;    // ★ 格子の大きさ
let cx, pair = [], h = [], hist = [];
let ox = 50, oy = 110, shapeNo = 1, freq = 0.45, showArrows = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  buildComplex();
}

// ★ 複体の形
function buildComplex() {
  let holes = shapeNo === 1 ? [] : shapeNo === 2 ? [[6, 3, 4, 4]] : [[3, 3, 3, 4], [10, 3, 3, 4]];
  cx = makeGridComplex(nx, ny, 'none', (i, j) => !holes.some(([x, y, w, hh]) => i >= x && i < x + w && j >= y && j < y + hh));
  hist = [];
  newHeight();
}
// ★ 高さ関数 → 勾配場
function newHeight() {
  noiseSeed(Math.floor(random(10000)));
  h = [];
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= ny; j++) if (cx.vid[i][j] >= 0) h[cx.vid[i][j]] = noise(i * freq, j * freq) + 0.0001 * (i * 3 + j);
  pair = gradientFromHeight(cx, h);
  let m = countCritical(cx, pair);
  hist.push(m); if (hist.length > 12) hist.shift();
}

function drawBars(x, y, w, hh, m, b) {
  let top = Math.max(4, ...m, ...b);
  let bw = w / 3;
  for (let k = 0; k < 3; k++) {
    let bx = x + k * bw, hm = m[k] / top * hh, hb = b[k] / top * hh;
    noStroke();
    fill([272, 85, 12][k], 70, 95); rect(bx + 10, y + hh - hm, bw * 0.4 - 10, hm);
    fill(0, 0, 70); rect(bx + bw * 0.5, y + hh - hb, bw * 0.4 - 10, hb);
    fill(0, 0, 100); textSize(16); textAlign(CENTER, BASELINE);
    text('m' + k + ' = ' + m[k], bx + 10 + (bw * 0.4 - 10) / 2, y + hh - hm - 6);
    text('b' + k + ' = ' + b[k], bx + bw * 0.5 + (bw * 0.4 - 10) / 2, y + hh - hb - 6);
    fill(0, 0, 65); textSize(14);
    text(['極小・塊', '鞍点・穴', '極大・空洞'][k], bx + bw / 2, y + hh + 20);
  }
  stroke(0, 0, 40); strokeWeight(1); line(x, y + hh, x + w, y + hh);
  textAlign(LEFT, BASELINE);
}

function draw() {
  background(225, 30, 8);
  // 高さを面の色に
  noStroke();
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    let f = cx.fid[i][j]; if (f < 0) continue;
    let v = cx.cells[f].verts.reduce((s, q) => s + h[q], 0) / cx.cells[f].verts.length;
    fill(200 - v * 150, 40, 25 + v * 45); rect(ox + i * cs, oy + j * cs, cs, cs);
  }
  drawGridComplexOverlay();
  let m = countCritical(cx, pair), b = bettiNumbers(cx);
  let gx = ox + nx * cs + 50, gw = width - gx - 40;
  drawBars(gx, oy + 20, gw, 240, m, [b.b0, b.b1, b.b2]);
  // 不等式の判定
  let lines = [
    ['弱い不等式  m_k ≥ b_k', m[0] >= b.b0 && m[1] >= b.b1 && m[2] >= b.b2],
    ['オイラー  m0 − m1 + m2 = ' + (m[0] - m[1] + m[2]) + '  = χ = ' + b.chi, m[0] - m[1] + m[2] === b.chi],
    ['強い不等式  m1 − m0 = ' + (m[1] - m[0]) + ' ≥ b1 − b0 = ' + (b.b1 - b.b0), m[1] - m[0] >= b.b1 - b.b0],
    ['余分：極小 ' + (m[0] - b.b0) + '、鞍点 ' + (m[1] - b.b1) + '、極大 ' + (m[2] - b.b2), null],
  ];
  textSize(17);
  for (let k = 0; k < lines.length; k++) { let [t, ok] = lines[k]; fill(ok === null ? 0 : ok ? 85 : 0, ok === null ? 0 : 80, ok === null ? 70 : 100); noStroke(); text((ok === null ? '' : ok ? '✓ ' : '✗ ') + t, gx, oy + 310 + k * 30); }
  // 履歴
  fill(0, 0, 65); textSize(14);
  text('これまでの (m0, m1, m2)：' + hist.map((q) => '(' + q.join(',') + ')').join(' '), gx, oy + 450);
  fill(0, 0, 100); textSize(20);
  text('形 ' + ['円盤', '円環', '穴 2 つ'][shapeNo - 1] + '　χ = ' + b.chi + '　　臨界胞体 m = (' + m.join(', ') + ')　ベッチ数 b = (' + b.b0 + ', ' + b.b1 + ', ' + b.b2 + ')', ox, 44);
  fill(0, 0, 65); textSize(15);
  text('1〜3：形　N：新しい高さ関数　←→：細かさ ' + nf(freq, 1, 2) + '　A：矢印 ' + (showArrows ? 'ON' : 'off') + '　　色 = 高さ（青 = 低い、黄 = 高い）', ox, 72);
  fill(0, 0, 55); textSize(14);
  text('どんな高さ関数でも m_k は b_k を下回らない。余分な極小は必ず余分な鞍点とペアで現れる（07 で消す）', ox, oy + ny * cs + 36);
}
function drawGridComplexOverlay() { drawGridComplex(cx, pair, ox, oy, cs, showArrows, null, true); }

function keyPressed() {
  if (key === 'n' || key === 'N') newHeight();
  if (key === 'a' || key === 'A') showArrows = !showArrows;
  if (key === RIGHT_ARROW) { freq = Math.min(1.2, freq + 0.1); newHeight(); }
  if (key === LEFT_ARROW) { freq = Math.max(0.15, freq - 0.1); newHeight(); }
  if (key === '1' || key === '2' || key === '3') { shapeNo = Number(key); buildComplex(); }
}

// ---------- やってみよう ----------
// 1. N を 10 回押して、m0 − m1 + m2 がいつも χ になることを確かめよう（履歴を見る）
// 2. ← で高さ関数をなめらかにすると m が b に近づく。m = b（完全モース関数）になるか？
// 3. 円環（2）で m1 = 1 になるとき、その鞍点（ライムの辺）は穴のどこにある？
// 4. 穴 2 つ（3）で「強い不等式」が等号になるのはどんなとき？


// ==================================================
// ここから下は「離散モース理論の道具」
//   格子の胞体複体をつくる・ベッチ数を数える・高さ関数から勾配場をつくる・臨界胞体を数える・描く
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

// 臨界胞体の数 [m0, m1, m2]
function countCritical(cx, pair) {
  let m = [0, 0, 0];
  for (let i = 0; i < cx.cells.length; i++) if (pair[i] < 0) m[cx.cells[i].dim]++;
  return m;
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
