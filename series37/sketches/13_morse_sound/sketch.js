// ============================================
// 13 勾配の流れを聴く ─ V-パスを降りながら音階を鳴らす
// 地形（高さ関数）の上でクリックした頂点から、矢印（頂点 → 辺 → 頂点 …）をたどって極小まで降りる
//   1 歩ごとに高さに応じた音（高い所 = 高い音）、鞍点のとなりを通ると「分岐音」、極小に着くと和音
// クリック = その頂点から流す / A = 自動で次々に流す / N = 新しい地形 / 1〜3 = 音階 / ↑↓ = 速さ
//   （まずキャンバスを 1 回クリック。コードは一番下の「道具」まで全部コピー）
// ============================================

let nx = 24, ny = 15, cs;         // ★ 格子の大きさ
let cx, pos, pair = [], h = [];
let ox = 30, oy = 110, walker = null, auto = false, stepFrames = 9, scaleNo = 1;
let scales = [[0, 2, 4, 7, 9], [0, 2, 3, 5, 7, 8, 10], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]];   // ★ ペンタトニック・短調・半音階
let trails = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  cs = Math.min((width - 60) / nx, (height - 170) / ny);
  cx = makeGridComplex(nx, ny);
  pos = gridPositions(cx, ox, oy, cs);
  noiseDetail(2, 0.4);
  newTerrain();
}
function newTerrain() {
  noiseSeed(Math.floor(random(10000)));
  h = [];
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= ny; j++) h[cx.vid[i][j]] = noise(i * 0.13, j * 0.13) + 0.0001 * (i * 3 + j);
  let lo = Math.min(...h), hi = Math.max(...h);
  for (let v = 0; v < h.length; v++) h[v] = (h[v] - lo) / (hi - lo);
  pair = gradientFromHeight(cx, h);
  walker = null; trails = [];
}

// ★ 高さ → 周波数：高さ 0〜1 を 2 オクターブに割り当て、音階にそろえる
function freqOf(height) {
  let sc = scales[scaleNo - 1], idx = Math.floor(constrain(height, 0, 0.999) * sc.length * 2);
  let semi = Math.floor(idx / sc.length) * 12 + sc[idx % sc.length];
  return 220 * Math.pow(2, semi / 12);
}
function startWalker(v) {
  walker = { v, trail: [v], t: frameCount };
  ping(freqOf(h[v]), 0.3, 0.5);
}
// ★ 1 歩進む：頂点 → ペアの辺 → 反対側の頂点。臨界な頂点（極小）に着いたら和音
function advance() {
  let v = walker.v, cells = cx.cells;
  if (pair[v] < 0) {
    let f = freqOf(h[v]);
    ping(f, 0.35, 1.6); ping(f * Math.pow(2, 4 / 12), 0.25, 1.6); ping(f * Math.pow(2, 7 / 12), 0.25, 1.6);
    trails.push(walker.trail); if (trails.length > 8) trails.shift();
    walker = null; return;
  }
  let e = pair[v], w = cells[e].verts[0] === v ? cells[e].verts[1] : cells[e].verts[0];
  let nearSaddle = cells[w].cofaces.some((q) => pair[q] < 0);
  if (nearSaddle) { ping(freqOf(h[w]) * 1.5, 0.2, 0.25, 'square'); ping(freqOf(h[w]) * 0.75, 0.2, 0.25, 'square'); }
  else ping(freqOf(h[w]), 0.28, 0.45);
  walker.v = w; walker.trail.push(w); walker.t = frameCount;
}

function draw() {
  background(225, 30, 8);
  if (walker && frameCount - walker.t >= stepFrames) advance();
  if (auto && !walker && frameCount % 50 === 0) { startAudio(); startWalker(Math.floor(random((nx + 1) * (ny + 1)))); }
  noStroke();
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) { let f = cx.fid[i][j], v = cx.cells[f].verts.reduce((s, q) => s + h[q], 0) / 4; fill(200 - v * 150, 45, 22 + v * 55); rect(ox + i * cs, oy + j * cs, cs, cs); }
  drawGridComplex(cx, pair, ox, oy, cs, false, null, true);
  // 過去の流れ（うすく）と今の流れ
  noFill();
  for (let k = 0; k < trails.length; k++) { stroke(48, 80, 100, 15 + k * 6); strokeWeight(3); beginShape(); for (let v of trails[k]) vertex(pos[v].x, pos[v].y); endShape(); }
  if (walker) {
    stroke(48, 90, 100); strokeWeight(5); beginShape(); for (let v of walker.trail) vertex(pos[v].x, pos[v].y); endShape();
    noStroke(); fill(48, 90, 100); circle(pos[walker.v].x, pos[walker.v].y, cs * 0.5);
    fill(0, 0, 100); textSize(14); textAlign(CENTER, BASELINE); text(nf(freqOf(h[walker.v]), 1, 0) + ' Hz', pos[walker.v].x, pos[walker.v].y - cs * 0.4); textAlign(LEFT, BASELINE);
  }
  let m = countCritical(cx, pair);
  fill(0, 0, 100); noStroke(); textSize(20);
  text('クリックした頂点から矢印をたどって降りる　極小 ' + m[0] + '　鞍点 ' + m[1] + '　極大 ' + m[2] + (walker ? '　　降下中… ' + walker.trail.length + ' 歩' : ''), ox, 40);
  fill(0, 0, 65); textSize(15);
  text('クリック：流す　A：自動 ' + (auto ? 'ON' : 'off') + '　N：新しい地形　1〜3：音階 ' + ['ペンタトニック', '短調', '半音階'][scaleNo - 1] + '　↑↓：速さ ' + stepFrames + '　　高い所 = 高い音　鞍点のとなり = 分岐音　極小 = 和音', ox, 68);
}

function mousePressed() {
  startAudio();
  let best = -1, bd = cs * 0.7;
  for (let c = 0; c < cx.cells.length; c++) if (cx.cells[c].dim === 0) { let d = dist(mouseX, mouseY, pos[c].x, pos[c].y); if (d < bd) { bd = d; best = c; } }
  if (best >= 0) startWalker(best);
}
function keyPressed() {
  startAudio();
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'n' || key === 'N') newTerrain();
  if (key === '1' || key === '2' || key === '3') scaleNo = Number(key);
  if (key === UP_ARROW) stepFrames = Math.max(2, stepFrames - 2);
  if (key === DOWN_ARROW) stepFrames = Math.min(30, stepFrames + 2);
}

// ---------- やってみよう ----------
// 1. 同じ極小に落ちる 2 つの頂点をクリックして、メロディの「終わり」が同じ和音になるのを聴こう
// 2. 鞍点のすぐとなりの頂点からスタートすると、左右どちらの極小に落ちる？ 分岐音が鳴る場所を探そう
// 3. freqOf を変えて「高さが低いほど高い音」にする。地形の印象はどう変わる？
// 4. 極小に着いたら、そこの流域（09）の大きさに応じて和音の長さを変えてみよう


// ==================================================
// ここから下は「音を鳴らすための道具」（短い音をひとつ鳴らす）
// ==================================================
let audioCtx, masterOut;
function startAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterOut = audioCtx.createDynamicsCompressor();
    masterOut.connect(audioCtx.destination);
  }
  audioCtx.resume();
}
// 周波数 freq（Hz）、大きさ vol（0〜1）、長さ dur（秒）、波形 type の音をひとつ
function ping(freq, vol, dur, type) {
  if (!audioCtx) return;
  let o = audioCtx.createOscillator(), g = audioCtx.createGain(), t0 = audioCtx.currentTime;
  o.type = type || 'triangle'; o.frequency.value = constrain(freq, 40, 4000);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(constrain(vol, 0.001, 1), t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(masterOut); o.start(t0); o.stop(t0 + dur + 0.05);
}


// ==================================================
// ここから下は「離散モース理論の道具」
//   格子の胞体複体をつくる・高さ関数から勾配場をつくる・臨界胞体を数える・描く
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
