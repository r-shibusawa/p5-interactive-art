// ============================================
// 12 曲面と最小の臨界胞体 ─ トーラス・球面・クラインの壺
// 正方格子の向かい合う辺を貼り合わせると閉じた曲面になる（辺の色と矢印が「貼り方」）
//   トーラス：上下・左右を同じ向きに　球面：上と左、右と下を折るように　クラインの壺：左右を逆向きに
//   高さ関数から勾配場を作ると、臨界胞体の数が最小（m_k = b_k、Z2 係数）になる：トーラス (1,2,1)・球面 (1,0,1)・クラインの壺 (1,2,1)
// 1〜3 = 曲面 / T = トーラスを 3D に貼って見る（ドラッグで回転）/ A = 矢印 / N = 高さ関数を変える
// ============================================

let n = 16, cs = 30;              // ★ 格子の大きさ（n × n マス）
let cx, pair = [], h = [], pg, hud;
let surfNo = 1, view3d = false, showArrows = true, phase = 0;
let rotX = -0.7, rotY = 0.6;

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  colorMode(HSB, 360, 100, 100, 100);
  pg = createGraphics(n * cs, n * cs); pg.colorMode(HSB, 360, 100, 100, 100);
  hud = createGraphics(windowWidth, 120); hud.colorMode(HSB, 360, 100, 100, 100);
  build();
}

// ★ 曲面と高さ関数。貼り合わせた頂点は同じ高さでないといけないので、cos で作る（球面は i + j）
function build() {
  let ident = ['torus', 'sphere', 'klein'][surfNo - 1];
  cx = makeGridComplex(n, n, ident);
  h = [];
  for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) {
    let v = cx.vid[i][j]; if (h[v] !== undefined) continue;
    let val = surfNo === 2 ? i + j : Math.cos(2 * Math.PI * i / n + phase) + 1.3 * Math.cos(2 * Math.PI * j / n + phase * 0.7);
    h[v] = val + 0.0001 * v;
  }
  pair = gradientFromHeight(cx, h);
  renderGrid();
}

// 格子を描く（貼り合わせる辺に色と矢印をつける）
function renderGrid() {
  pg.background(225, 30, 12);
  pg.noStroke();
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { let f = cx.fid[i][j], v = cx.cells[f].verts.reduce((s, q) => s + h[q], 0) / cx.cells[f].verts.length; v = (v - Math.min(...h)) / (Math.max(...h) - Math.min(...h) + 1e-9); pg.fill(200 - v * 150, 40, 25 + v * 45); pg.rect(i * cs, j * cs, cs, cs); }
  drawGridComplex(cx, pair, 0, 0, cs, showArrows, pg, true);
  let W = n * cs, mark = (x1, y1, x2, y2, hue) => { pg.stroke(hue, 90, 100); pg.strokeWeight(6); pg.line(x1, y1, x2, y2); for (let t of [0.3, 0.7]) { let x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t, a = Math.atan2(y2 - y1, x2 - x1); pg.noStroke(); pg.fill(hue, 90, 100); pg.triangle(x + 9 * Math.cos(a), y + 9 * Math.sin(a), x + 9 * Math.cos(a + 2.4), y + 9 * Math.sin(a + 2.4), x + 9 * Math.cos(a - 2.4), y + 9 * Math.sin(a - 2.4)); } };
  let a = 5, b = W - 5;                                                  // 少し内側に描く（三角が切れないように）
  if (surfNo === 1) { mark(a, a, b, a, 85); mark(a, b, b, b, 85); mark(a, a, a, b, 272); mark(b, a, b, b, 272); }
  if (surfNo === 2) { mark(a, a, b, a, 85); mark(a, a, a, b, 85); mark(b, a, b, b, 272); mark(a, b, b, b, 272); }
  if (surfNo === 3) { mark(a, a, b, a, 85); mark(a, b, b, b, 85); mark(a, a, a, b, 272); mark(b, b, b, a, 272); }
}

function draw() {
  background(225, 30, 8);
  if (view3d && surfNo === 1) {
    push(); translate(0, 60, 0); rotateX(rotX); rotateY(rotY);
    noStroke(); texture(pg); textureMode(NORMAL);
    let R = 175, r = 78, nu = 48, nv = 24;                     // ★ トーラスの大きさ
    for (let a = 0; a < nu; a++) {
      beginShape(TRIANGLE_STRIP);
      for (let b = 0; b <= nv; b++) for (let da of [0, 1]) {
        let u = (a + da) / nu, v = b / nv, th = u * TWO_PI, ph = v * TWO_PI;
        vertex((R + r * Math.cos(ph)) * Math.cos(th), (R + r * Math.cos(ph)) * Math.sin(th), r * Math.sin(ph), u, v);
      }
      endShape();
    }
    pop();
  } else {
    push(); translate(-pg.width / 2, -pg.height / 2 + 50); image(pg, 0, 0); pop();
  }
  // HUD（2D のバッファを画面の上に貼る）
  let m = countCritical(cx, pair), b = bettiNumbers(cx);
  hud.clear(); hud.textAlign(LEFT, BASELINE);
  hud.fill(0, 0, 100); hud.textSize(20);
  hud.text(['トーラス', '球面', 'クラインの壺'][surfNo - 1] + '　V = ' + b.V + '　E = ' + b.E + '　F = ' + b.F + '　χ = ' + b.chi + '　　臨界胞体 m = (' + m.join(', ') + ')　ベッチ数（Z2）b = (' + b.b0 + ', ' + b.b1 + ', ' + b.b2 + ')' + (m[0] === b.b0 && m[1] === b.b1 && m[2] === b.b2 ? '　✓ 最小' : ''), 30, 40);
  hud.fill(0, 0, 65); hud.textSize(15);
  hud.text('1〜3：曲面　T：3D のトーラス ' + (view3d ? 'ON（ドラッグで回転）' : 'off') + '　A：矢印　N：高さ関数を変える　　同じ色の辺を矢印の向きをそろえて貼る。紫 = 極小　ライム = 鞍点　コーラル = 極大', 30, 68);
  hud.fill(0, 0, 55); hud.textSize(14);
  hud.text(['トーラスは穴をくぐる輪と穴をまわる輪で b1 = 2。鞍点 2 つがそれぞれの輪をつくる', '球面は上と左、右と下を折りたたんで貼る。b1 = 0 なので鞍点が 0 でもよい（極小 1・極大 1）', 'クラインの壺は Z2 係数では b = (1, 2, 1)（整数係数だと b1 = 1 とねじれ）。向き付けできない曲面'][surfNo - 1], 30, 96);
  push(); resetMatrix(); drawingContext.disable(drawingContext.DEPTH_TEST);
  translate(-width / 2, -height / 2); image(hud, 0, 0);
  drawingContext.enable(drawingContext.DEPTH_TEST); pop();
}

function mouseDragged() { if (view3d) { rotY += movedX * 0.01; rotX += movedY * 0.01; } }
function keyPressed() {
  if (key === '1' || key === '2' || key === '3') { surfNo = Number(key); build(); }
  if (key === 't' || key === 'T') view3d = !view3d;
  if (key === 'a' || key === 'A') { showArrows = !showArrows; renderGrid(); }
  if (key === 'n' || key === 'N') { phase += 0.9; build(); }
}

// ---------- やってみよう ----------
// 1. トーラスを 3D（T）で回して、2 つの鞍点（ライムの辺）がそれぞれ「穴をくぐる輪」「穴をまわる輪」をふさいでいるのを確かめよう
// 2. 球面（2）の極大（コーラルの面）は右下の角にある。折りたたみの貼り方で角がどこに行くか指でたどろう
// 3. N で高さ関数の位相を変えても m は変わらない（b_k が下限だから）。変わる高さ関数を作れる？（cos を 2 周期にすると？）
// 4. クラインの壺（3）とトーラスは m も b（Z2）も同じ。違いはどこに出る？（辺の貼り方 → 向き付け）


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
