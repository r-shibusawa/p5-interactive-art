// ============================================
// 02 離散モース関数 ─ 胞体に数を割りあてる
// フォルマンの離散モース関数 f：頂点・辺・面のそれぞれに数を与える。条件は 2 つだけ
//   (a) 自分より「値が小さいか等しい余面（1 つ上の次元で自分を含む胞体）」は高々 1 つ
//   (b) 自分より「値が大きいか等しい面（1 つ下の次元で自分に含まれる胞体）」は高々 1 つ
//   条件を破る胞体は赤。等号になったペアが矢印（勾配）、矢印のない胞体が臨界胞体
// クリック = 値を +1 / Shift+クリック = −1 / G = 高さ関数からつくる / D = 次元そのもの（全部臨界）/ R = ランダム
// ============================================

let nx = 6, ny = 4, cs = 118;     // ★ 格子の大きさ
let cx, pos, f = [], viol = [], arrows = [];
let ox = 50, oy = 120;
let seed = 3, msg = '';

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  cx = makeGridComplex(nx, ny);
  pos = gridPositions(cx, ox, oy, cs);
  fromHeight();
}

// ★ G：高さ関数 → lower star 法で勾配場 → ペアが同じ値になるように番号をふる（正しい離散モース関数になる）
function fromHeight() {
  noiseSeed(seed++);
  let h = [];
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= ny; j++) h[cx.vid[i][j]] = noise(i * 0.6, j * 0.6) + 0.001 * (i + j * 7);
  let pair = gradientFromHeight(cx, h);
  let cells = cx.cells, n = cells.length;
  let rep = (c) => (pair[c] >= 0 ? Math.min(c, pair[c]) : c);          // ペアは 1 つの「かたまり」として扱う
  let succ = Array.from({ length: n }, () => []), indeg = new Array(n).fill(0);
  for (let c = 0; c < n; c++) for (let v of cells[c].faces) if (pair[v] !== c) { let a = rep(v), b = rep(c); if (a !== b) { succ[a].push(b); indeg[b]++; } }
  let lvl = new Array(n).fill(0), queue = [];
  for (let c = 0; c < n; c++) if (rep(c) === c && indeg[c] === 0) queue.push(c);
  while (queue.length) { let a = queue.shift(); for (let b of succ[a]) { lvl[b] = Math.max(lvl[b], lvl[a] + 1); if (--indeg[b] === 0) queue.push(b); } }
  f = []; for (let c = 0; c < n; c++) f[c] = lvl[rep(c)];
  msg = '高さ関数から作った f（矢印 = 勾配、同じ値のペア）';
}

// ★ 条件 (a)(b) を全部の胞体で調べる。等号・逆転のペアを矢印にする
function checkMorse() {
  let cells = cx.cells, n = cells.length;
  viol = new Array(n).fill(false); arrows = [];
  for (let c = 0; c < n; c++) {
    let up = cells[c].cofaces.filter((t) => f[t] <= f[c]);           // 自分より小さいか等しい余面
    let down = cells[c].faces.filter((v) => f[v] >= f[c]);           // 自分より大きいか等しい面
    if (up.length > 1 || down.length > 1) viol[c] = true;
    if (up.length === 1) arrows.push([c, up[0]]);
  }
}

function draw() {
  background(225, 30, 8);
  checkMorse();
  let cells = cx.cells;
  // 面・辺・頂点
  for (let c = 0; c < cells.length; c++) {
    let p = pos[c], d = cells[c].dim;
    noStroke();
    if (d === 2) { fill(viol[c] ? 0 : 225, viol[c] ? 80 : 25, viol[c] ? 60 : 22); rect(p.x - cs / 2 + 2, p.y - cs / 2 + 2, cs - 4, cs - 4); }
  }
  for (let c = 0; c < cells.length; c++) {
    if (cells[c].dim !== 1) continue;
    let a = pos[cells[c].verts[0]], b = pos[cells[c].verts[1]];
    stroke(viol[c] ? 0 : 0, viol[c] ? 85 : 0, viol[c] ? 95 : 45); strokeWeight(viol[c] ? 5 : 2);
    line(a.x, a.y, b.x, b.y);
  }
  for (let [a, b] of arrows) drawArrow(pos[a].x, pos[a].y, (pos[a].x + pos[b].x) / 2 + (pos[b].x - pos[a].x) * 0.25, (pos[a].y + pos[b].y) / 2 + (pos[b].y - pos[a].y) * 0.25, cs * 0.4);
  // 臨界胞体の印と値
  let crit = [0, 0, 0], inArrow = new Array(cells.length).fill(false);
  for (let [a, b] of arrows) { inArrow[a] = true; inArrow[b] = true; }
  textAlign(CENTER, CENTER);
  for (let c = 0; c < cells.length; c++) {
    let p = pos[c], d = cells[c].dim, critical = !inArrow[c] && !viol[c];
    if (critical) crit[d]++;
    noStroke();
    if (d === 0) { fill(viol[c] ? 0 : 272, 70, 100); circle(p.x, p.y, critical ? 30 : 18); }
    if (critical && d === 1) { fill(85, 90, 95); circle(p.x, p.y, 22); }
    if (critical && d === 2) { fill(12, 80, 95); circle(p.x, p.y, 30); }
    fill(0, 0, 100); textSize(d === 0 ? 13 : 15);
    if (d !== 0) { fill(225, 30, 8, 80); rect(p.x - 11, p.y - 9, 22, 18, 4); fill(0, 0, 100); }
    text(f[c], p.x, p.y);
  }
  textAlign(LEFT, BASELINE);
  // HUD
  let nViol = viol.filter((v) => v).length;
  fill(0, 0, 100); textSize(20);
  text(nViol === 0 ? '✓ 離散モース関数です　臨界胞体 m0 = ' + crit[0] + '　m1 = ' + crit[1] + '　m2 = ' + crit[2] : '✗ 条件を破る胞体が ' + nViol + ' 個（赤）', ox, 44);
  fill(0, 0, 65); textSize(15);
  text('クリック：+1　Shift+クリック：−1　G：高さ関数から　D：f = 次元（全部臨界）　R：ランダム　　' + msg, ox, 72);
  let hx = ox + nx * cs + 50;
  fill(0, 0, 80); textSize(15);
  let rules = ['条件（各胞体 σ について）', '(a) f(τ) ≤ f(σ) となる余面 τ ⊃ σ は高々 1 つ', '(b) f(ν) ≥ f(σ) となる面 ν ⊂ σ は高々 1 つ', '', '等号・逆転のペア σ → τ が「矢印」', '矢印に入らない胞体 = 臨界胞体', '　頂点（紫）= 極小、辺（ライム）= 鞍点、面（コーラル）= 極大', '', '例：辺の値が両端の頂点より小さいと (b) 違反', '　　面の値が 2 本以上の辺より小さいと (b) 違反', '　　頂点のまわりの辺 2 本が頂点以下だと (a) 違反'];
  for (let k = 0; k < rules.length; k++) text(rules[k], hx, oy + 10 + k * 26);
}

function mousePressed() {
  let best = -1, bd = cs * 0.3;
  for (let c = 0; c < cx.cells.length; c++) { let d = dist(mouseX, mouseY, pos[c].x, pos[c].y); if (d < bd) { bd = d; best = c; } }
  if (best < 0) return;
  f[best] = constrain(f[best] + (keyIsDown(SHIFT) ? -1 : 1), 0, 99);
  msg = (cx.cells[best].dim === 0 ? '頂点' : cx.cells[best].dim === 1 ? '辺' : '面') + ' の値を ' + f[best] + ' に';
}

function keyPressed() {
  if (key === 'g' || key === 'G') fromHeight();
  if (key === 'd' || key === 'D') { f = cx.cells.map((c) => c.dim); msg = 'f = 次元：矢印なし、全部が臨界'; }
  if (key === 'r' || key === 'R') { f = cx.cells.map(() => Math.floor(random(10))); msg = 'ランダムな値（たいてい条件を破る）'; }
}

// ---------- やってみよう ----------
// 1. D のあと、ある辺の値を両端の片方の頂点と同じにしてみよう。矢印が 1 本できて臨界胞体が 2 つ減る
// 2. 同じ辺の値を両端の両方以下にすると赤になる。なぜ「高々 1 つ」でないといけない？
// 3. G で作った f の値を 1 か所だけ変えて、何か所に影響が出るか見よう
// 4. 全部の胞体がペアになる（臨界胞体が頂点 1 つだけ）f を手で作れる？（円盤なら必ずできる）


// ==================================================
// ここから下は「離散モース理論の道具」
//   格子の胞体複体をつくる・高さ関数から勾配場をつくる
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
