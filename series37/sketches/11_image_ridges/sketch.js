// ============================================
// 11 画像の離散勾配 ─ 稜線と谷線を取り出す
// 画像の明るさを高さ関数とみなすと、離散モース理論がそのまま使える
//   鞍点から極大へ登る V-パス = 稜線（明るい筋）、鞍点から極小へ降りる V-パス = 谷線（暗い筋）
//   指紋風の縞では縞の中心が稜線に、ノイズ画像では明るい塊の背骨が稜線になる。しきい値 ε 以下のペアはキャンセル（10）してから線を引く
// 1/2 = 画像（縞・ノイズ＋図形）/ ↑↓ = しきい値 ε / R = 稜線 / V = 谷線 / I = 明暗を反転 / N = 別の画像
// ============================================

let nx = 96, ny = 64;             // ★ 画像の大きさ（頂点の数）
let cx, pos, basePair = [], pair = [], seq = [], h = [], img;
let imgNo = 1, eps = 0.08, showRidge = true, showValley = true, invert = false;
let ox = 30, oy = 100, cs, pg, dirty = true;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  noSmooth();
  cs = Math.min((width - 60) / nx, (height - 150) / ny);
  cx = makeGridComplex(nx, ny);
  pos = gridPositions(cx, ox, oy, cs);
  pg = createGraphics(width, height); pg.colorMode(HSB, 360, 100, 100, 100);
  img = createImage(nx + 1, ny + 1);
  makeImage();
}

// ★ 合成画像：1 = 指紋風の縞（sin を曲げる）、2 = ノイズ + 明るい図形
function makeImage() {
  noiseSeed(Math.floor(random(10000)));
  let ph = random(100);
  h = [];
  img.loadPixels();
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= ny; j++) {
    let v;
    if (imgNo === 1) {
      let warp = 6 * noise(i * 0.03 + ph, j * 0.03), cxr = i - nx / 2, cyr = j - ny / 2;
      v = 0.5 + 0.5 * Math.sin(0.55 * Math.sqrt(cxr * cxr + 1.4 * cyr * cyr) + warp + 2 * noise(i * 0.05, j * 0.05 + ph)) * (0.7 + 0.3 * noise(i * 0.2, j * 0.2));
    } else {
      v = 0.35 * noise(i * 0.12 + ph, j * 0.12);
      for (let [sx, sy, r] of [[nx * 0.3, ny * 0.4, 14], [nx * 0.7, ny * 0.35, 10], [nx * 0.55, ny * 0.72, 12]]) { let d = Math.hypot(i - sx, j - sy); v += 0.7 * Math.exp(-(d * d) / (r * r)); }
      v += 0.25 * Math.exp(-Math.pow(Math.abs(j - ny * 0.6 - 10 * Math.sin(i * 0.1)) / 2.5, 2)) * (i > 8 && i < nx - 8 ? 1 : 0);
    }
    if (invert) v = 1 - v;
    h[cx.vid[i][j]] = v + 0.00001 * (i * 3 + j);
    let p = (i + j * (nx + 1)) * 4, g = constrain(v, 0, 1) * 235 + 10;
    img.pixels[p] = g; img.pixels[p + 1] = g; img.pixels[p + 2] = g; img.pixels[p + 3] = 255;
  }
  img.updatePixels();
  basePair = gradientFromHeight(cx, h);
  buildSequence();
  dirty = true;
}
function cellHeight(c) { return Math.max(...cx.cells[c].verts.map((v) => h[v])); }

// ★ パーシステンスの小さいペアから順にキャンセルする列を作る（10 と同じ）。ε 以下の分だけ最初からやり直して使う
function buildSequence() {
  let pr = basePair.slice(); seq = [];
  while (true) {
    let best = null;
    for (let c = 0; c < cx.cells.length; c++) {
      if (pr[c] >= 0 || cx.cells[c].dim === 0) continue;
      let paths = descendPaths(cx, pr, c), ends = {};
      for (let p of paths) { let e = p[p.length - 1]; ends[e] = (ends[e] || []).concat([p]); }
      for (let e in ends) if (ends[e].length === 1) { let pers = cellHeight(c) - cellHeight(Number(e)); if (!best || pers < best.pers) best = { path: ends[e][0], pers }; }
    }
    if (!best || best.pers > 0.6) break;
    cancelPath(pr, best.path); seq.push(best);
  }
}
function cancelPath(pr, path) { for (let k = 0; k + 1 < path.length; k += 2) { pr[path[k]] = path[k + 1]; pr[path[k + 1]] = path[k]; } }

// ★ ε 以下のペアをキャンセルしてから、残った鞍点ごとに降りるパス（谷線）と登るパス（稜線）を描く
function render() {
  pair = basePair.slice();
  for (let s of seq) { if (s.pers > eps) break; cancelPath(pair, s.path); }
  pg.clear(); pg.noFill(); let nR = 0, nV = 0, nS = 0;
  for (let c = 0; c < cx.cells.length; c++) {
    if (pair[c] >= 0 || cx.cells[c].dim !== 1) continue;
    let down = descendPaths(cx, pair, c), up = ascendPaths(cx, pair, c);
    nS++;
    if (showValley) { pg.stroke(272, 80, 100, 90); pg.strokeWeight(2); for (let p of down) { pg.beginShape(); for (let q of p) pg.vertex(pos[q].x, pos[q].y); pg.endShape(); nV++; } }
    if (showRidge) { pg.stroke(12, 90, 100, 90); pg.strokeWeight(2); for (let p of up) { pg.beginShape(); for (let q of p) pg.vertex(pos[q].x, pos[q].y); pg.endShape(); nR++; } }
    pg.noStroke(); pg.fill(85, 90, 100); pg.circle(pos[c].x, pos[c].y, 6); pg.noFill();
  }
  pg.counts = [nS, nR, nV];
  dirty = false;
}

function draw() {
  background(225, 30, 8);
  if (dirty) render();
  image(img, ox, oy, nx * cs, ny * cs);
  image(pg, 0, 0);
  let m = countCritical(cx, basePair), c = pg.counts || [0, 0, 0];
  fill(0, 0, 100); noStroke(); textSize(20); textAlign(LEFT, BASELINE);
  text('画像 ' + (imgNo === 1 ? '縞（指紋風）' : 'ノイズ + 図形') + '　臨界点 m = (' + m.join(', ') + ') → ε = ' + nf(eps, 1, 2) + ' で簡略化 (' + countCritical(cx, pair).join(', ') + ')　鞍点 ' + c[0] + '　稜線 ' + c[1] + ' 本　谷線 ' + c[2] + ' 本', ox, 40);
  fill(0, 0, 65); textSize(15);
  text('1/2：画像　↑↓：しきい値 ε　R：稜線 ' + (showRidge ? 'ON' : 'off') + '　V：谷線 ' + (showValley ? 'ON' : 'off') + '　I：反転　N：別の画像　　赤 = 稜線（鞍点 → 極大）　紫 = 谷線（鞍点 → 極小）　ライム = 鞍点', ox, 66);
}

function keyPressed() {
  if (key === '1' || key === '2') { imgNo = Number(key); makeImage(); }
  if (key === UP_ARROW) { eps = Math.min(1, eps + 0.02); dirty = true; }
  if (key === DOWN_ARROW) { eps = Math.max(0, eps - 0.02); dirty = true; }
  if (key === 'r' || key === 'R') { showRidge = !showRidge; dirty = true; }
  if (key === 'v' || key === 'V') { showValley = !showValley; dirty = true; }
  if (key === 'i' || key === 'I') { invert = !invert; makeImage(); }
  if (key === 'n' || key === 'N') makeImage();
}

// ---------- やってみよう ----------
// 1. 縞（1）で ε を上げていくと、縞の中心を通る長い稜線だけが残る。縞が途切れる所（指紋の「端点」）はどう見える？
// 2. 谷線だけ表示して反転（I）すると、稜線と入れかわる。離散モース理論では極大と極小は対称
// 3. ノイズ画像（2）の曲がった明るい線は 1 本の稜線としてつながる？ ε をいくつにすればつながる？
// 4. makeImage の図形を自分で足して（円・線・文字の形）、稜線がどう出るか試そう


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
