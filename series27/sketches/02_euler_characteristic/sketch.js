// ============================================
// 02 オイラー標数 V − E + F
// 平面に（交わらないように）点と線を描くと、いつでも 点 V − 線 E + 面 F = 2（外側の面も 1 つと数える）
//   多面体でも V − E + F = 2。ドーナツ形（トーラス）の多面体だと 0 になる。形をどう変えても変わらない数 ＝ 位相不変量
// 1 = 平面グラフを描く / 2 = 多面体を見る（←→ で選ぶ・ドラッグで回す） / クリック = 点 / 点→点ドラッグ = 線（交わる線は引けない） / D = 最後の線を消す / C = 全部消す
// ============================================

let mode = 1;
let verts = [], edges = [];
let dragFrom = -1, warnLife = 0;
let faceInfo = { F: 1, polys: [], comps: 0 };
let solids = [], si = 0;
let rx = -0.5, ry = 0.6;          // 立体の回転
let autoSpin = 0.006;             // ★ 自動回転の速さ

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  buildSolids();
  // はじめの例：三角形の中に点
  let cx = width * 0.35, cy = height * 0.55, s = min(width, height) * 0.28;
  verts = [{ x: cx, y: cy - s }, { x: cx + s, y: cy + s * 0.7 }, { x: cx - s, y: cy + s * 0.7 }, { x: cx, y: cy + s * 0.1 }];
  edges = [{ a: 0, b: 1 }, { a: 1, b: 2 }, { a: 2, b: 0 }, { a: 3, b: 0 }, { a: 3, b: 1 }];
  countFaces();
}

// ★ 面を数える：各点で線を角度順に並べ、「左手を壁につけて歩く」と 1 周で 1 つの面になる
function countFaces() {
  let nb = verts.map(() => []);
  for (let e of edges) { nb[e.a].push(e.b); nb[e.b].push(e.a); }
  nb.forEach((list, v) => list.sort((p, q) => Math.atan2(verts[p].y - verts[v].y, verts[p].x - verts[v].x) - Math.atan2(verts[q].y - verts[v].y, verts[q].x - verts[v].x)));
  let seen = new Set(), orbits = 0, polys = [];
  for (let u = 0; u < verts.length; u++) for (let v of nb[u]) {
    if (seen.has(u + ',' + v)) continue;
    orbits++;
    let a = u, b = v, poly = [], guard = 0;
    while (!seen.has(a + ',' + b) && guard++ < 10000) {
      seen.add(a + ',' + b); poly.push(verts[a]);
      let L = nb[b], i = L.indexOf(a), c = L[(i - 1 + L.length) % L.length];
      a = b; b = c;
    }
    let area = 0;
    for (let i = 0; i < poly.length; i++) { let p = poly[i], q = poly[(i + 1) % poly.length]; area += p.x * q.y - q.x * p.y; }
    if (area > 1) polys.push(poly);          // 内側の面（外側の面は向きが逆になる）
  }
  // つながりの数（孤立した点も 1 つ）
  let parent = verts.map((_, i) => i), find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let e of edges) parent[find(e.a)] = find(e.b);
  let comps = verts.filter((_, i) => find(i) === i).length;
  let isolated = nb.filter((l) => l.length === 0).length;
  faceInfo = { F: orbits + isolated - comps + 1, polys, comps };
}

function draw() {
  background(170, 35, 12);
  if (mode === 1) drawGraph(); else drawSolid();
  noStroke(); fill(0, 0, 100); textSize(18);
  text('1：平面グラフ　2：多面体（←→ で選ぶ・ドラッグで回す）　クリック：点　点→点ドラッグ：線　D：線を消す　C：全部消す', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('V = 点（頂点）、E = 線（辺）、F = 面。平面グラフでは外側の大きな面も 1 つと数える', 20, 68);
}

function drawGraph() {
  // 面に色を塗る
  noStroke();
  faceInfo.polys.forEach((poly, k) => { fill((k * 47) % 360, 45, 55, 60); beginShape(); for (let p of poly) vertex(p.x, p.y); endShape(CLOSE); });
  stroke(0, 0, 90); strokeWeight(4);
  for (let e of edges) line(verts[e.a].x, verts[e.a].y, verts[e.b].x, verts[e.b].y);
  if (dragFrom >= 0) { stroke(45, 80, 100); strokeWeight(2); line(verts[dragFrom].x, verts[dragFrom].y, mouseX, mouseY); }
  noStroke(); fill(45, 90, 100);
  for (let v of verts) circle(v.x, v.y, 18);
  let V = verts.length, E = edges.length, F = faceInfo.F, chi = V - E + F;
  let x0 = width * 0.7, y0 = height * 0.3;
  fill(0, 0, 100); textSize(44);
  text('V = ' + V, x0, y0); text('E = ' + E, x0, y0 + 56); text('F = ' + F, x0, y0 + 112);
  fill(chi === 2 ? 140 : 45, 70, 100); textSize(52);
  text('V − E + F = ' + chi, x0 - 40, y0 + 200);
  fill(0, 0, 70); textSize(16);
  text('塗った面 ' + faceInfo.polys.length + ' ＋ 外側 1 ＝ F', x0, y0 + 240);
  text('つながりが ' + faceInfo.comps + ' 個なら V − E + F = 1 + ' + faceInfo.comps, x0, y0 + 266);
  if (warnLife > 0) { warnLife--; fill(0, 80, 100); textSize(22); text('交わる線は引けない（平面グラフ）', 20, height - 40); }
}

function drawSolid() {
  if (mouseIsPressed) { ry += movedX * 0.01; rx += movedY * 0.01; } else ry += autoSpin;
  let s = solids[si], R = min(width, height) * 0.25, cx = width * 0.35, cy = height * 0.55;
  let P = s.v.map((p) => project(p, R, cx, cy));
  let order = s.f.map((f, i) => ({ i, z: f.reduce((a, k) => a + P[k].z, 0) / f.length })).sort((a, b) => a.z - b.z);
  stroke(0, 0, 100, 80); strokeWeight(2);
  for (let o of order) {
    let f = s.f[o.i];
    fill((o.i * 37) % 360, 50, 80, 45);
    beginShape(); for (let k of f) vertex(P[k].x, P[k].y); endShape(CLOSE);
  }
  noStroke(); fill(45, 90, 100);
  for (let p of P) circle(p.x, p.y, 7);
  // 表
  let x0 = width * 0.64, y0 = 130;
  textSize(18); fill(0, 0, 100);
  text('立体', x0, y0); text('V', x0 + 200, y0); text('E', x0 + 260, y0); text('F', x0 + 320, y0); text('χ = V−E+F', x0 + 380, y0);
  solids.forEach((t, k) => {
    let y = y0 + 40 + k * 34;
    fill(k === si ? 45 : 0, k === si ? 80 : 0, k === si ? 100 : 75);
    text(t.name, x0, y); text(t.v.length, x0 + 200, y); text(t.e, x0 + 260, y); text(t.f.length, x0 + 320, y);
    text(t.v.length - t.e + t.f.length, x0 + 400, y);
  });
  fill(0, 0, 70); textSize(16);
  text('球と同じ形（穴なし）なら χ = 2、ドーナツ形（穴 1 つ）なら χ = 0', x0, y0 + 60 + solids.length * 34);
  text('穴が g 個なら χ = 2 − 2g', x0, y0 + 86 + solids.length * 34);
}

function project(p, R, cx, cy) {
  let x = p[0], y = p[1], z = p[2];
  let y1 = y * cos(rx) - z * sin(rx), z1 = y * sin(rx) + z * cos(rx);
  let x2 = x * cos(ry) + z1 * sin(ry), z2 = -x * sin(ry) + z1 * cos(ry);
  let k = 4 / (4 - z2);
  return { x: cx + x2 * R * k, y: cy + y1 * R * k, z: z2 };
}

function vertexAt(x, y) { return verts.findIndex((v) => Math.hypot(v.x - x, v.y - y) < 14); }
function mousePressed() {
  if (mode !== 1) return;
  let v = vertexAt(mouseX, mouseY);
  if (v >= 0) dragFrom = v;
  else if (mouseY > 90 && mouseX < width * 0.66) { verts.push({ x: mouseX, y: mouseY }); countFaces(); }
}
function mouseReleased() {
  if (dragFrom >= 0) {
    let w = vertexAt(mouseX, mouseY);
    if (w >= 0 && w !== dragFrom && !edges.some((e) => (e.a === w && e.b === dragFrom) || (e.b === w && e.a === dragFrom))) {
      if (crossesAny(dragFrom, w)) warnLife = 120;
      else { edges.push({ a: dragFrom, b: w }); countFaces(); }
    }
  }
  dragFrom = -1;
}
function keyPressed() {
  if (key === '1') mode = 1;
  if (key === '2') mode = 2;
  if (key === RIGHT_ARROW) si = (si + 1) % solids.length;
  if (key === LEFT_ARROW) si = (si + solids.length - 1) % solids.length;
  if ((key === 'd' || key === 'D') && edges.length) { edges.pop(); countFaces(); }
  if (key === 'c' || key === 'C') { verts = []; edges = []; countFaces(); }
}

// ---------- やってみよう ----------
// 1. どんなに複雑な絵を描いても V − E + F = 2。線を 1 本足すと E と F（または V）がどう変わるから？
// 2. 離れた 2 つの絵を描くと 3 になる。つながりの数との関係は？
// 3. サッカーボールは五角形 12 枚と六角形 20 枚。χ = 2 から「五角形はいつも 12 枚」を導いてみよう
// 4. トーラスの分割数（buildSolids の 8 と 4）を変えても χ = 0 のまま。なぜ？


// ==================================================
// ここから下は「線と立体の道具」（交差判定、多面体のデータづくり）
// ==================================================
function crossesAny(a, b) {
  let A = verts[a], B = verts[b];
  for (let e of edges) {
    if (e.a === a || e.b === a || e.a === b || e.b === b) continue;
    if (segX(A, B, verts[e.a], verts[e.b])) return true;
  }
  return false;
}
function segX(p, q, r, s) {
  let o = (a, b, c) => Math.sign((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x));
  return o(p, q, r) !== o(p, q, s) && o(r, s, p) !== o(r, s, q);
}
function sortAround(c, idx, V) {
  let n = normalize3(c), t = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  let u = normalize3(cross3(n, t)), w = cross3(n, u);
  return idx.slice().sort((i, j) => {
    let pi = sub3(V[i], c), pj = sub3(V[j], c);
    return Math.atan2(dot3(pi, w), dot3(pi, u)) - Math.atan2(dot3(pj, w), dot3(pj, u));
  });
}
function addSolid(name, v, f) {
  let es = new Set();
  for (let face of f) for (let i = 0; i < face.length; i++) { let a = face[i], b = face[(i + 1) % face.length]; es.add(Math.min(a, b) + '-' + Math.max(a, b)); }
  let m = Math.max(...v.map((p) => Math.hypot(...p)));
  solids.push({ name, v: v.map((p) => p.map((x) => x / m)), f, e: es.size });
}
function buildSolids() {
  addSolid('正四面体', [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]], [[0, 1, 2], [0, 1, 3], [0, 2, 3], [1, 2, 3]]);
  let cv = [];
  for (let i = 0; i < 8; i++) cv.push([i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1]);
  addSolid('立方体', cv, [[0, 1, 3, 2], [4, 5, 7, 6], [0, 1, 5, 4], [2, 3, 7, 6], [0, 2, 6, 4], [1, 3, 7, 5]]);
  let ov = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]], of = [];
  for (let a of [0, 1]) for (let b of [2, 3]) for (let c of [4, 5]) of.push([a, b, c]);
  addSolid('正八面体', ov, of);
  let g = (1 + Math.sqrt(5)) / 2, iv = [];
  for (let s1 of [-1, 1]) for (let s2 of [-1, 1]) iv.push([0, s1, s2 * g], [s1, s2 * g, 0], [s2 * g, 0, s1]);
  let near = (i, j) => Math.abs(Math.hypot(...sub3(iv[i], iv[j])) - 2) < 1e-6, ifc = [];
  for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) for (let k = j + 1; k < 12; k++) if (near(i, j) && near(j, k) && near(i, k)) ifc.push([i, j, k]);
  addSolid('正二十面体', iv, ifc);
  // 正十二面体 ＝ 二十面体の面の中心を結ぶ
  let dv = ifc.map((f) => [0, 1, 2].map((a) => (iv[f[0]][a] + iv[f[1]][a] + iv[f[2]][a]) / 3));
  let df = iv.map((p, i) => sortAround(p, ifc.map((f, k) => (f.includes(i) ? k : -1)).filter((k) => k >= 0), dv));
  addSolid('正十二面体', dv, df);
  // サッカーボール ＝ 二十面体の角を切り落とす
  let tv = [], key = {};
  let pt = (i, j) => { let k = i + '>' + j; if (key[k] === undefined) { key[k] = tv.length; tv.push([0, 1, 2].map((a) => iv[i][a] + (iv[j][a] - iv[i][a]) / 3)); } return key[k]; };
  let tf = ifc.map(([a, b, c]) => [pt(a, b), pt(b, a), pt(b, c), pt(c, b), pt(c, a), pt(a, c)]);
  for (let i = 0; i < 12; i++) { let ring = []; for (let j = 0; j < 12; j++) if (near(i, j)) ring.push(pt(i, j)); tf.push(sortAround(iv[i], ring, tv)); }
  addSolid('サッカーボール', tv, tf);
  // トーラス（ドーナツ）を四角形で分割
  let M = 8, Nn = 4, Rr = 1, rr = 0.45, torV = [], torF = [];
  for (let i = 0; i < M; i++) for (let j = 0; j < Nn; j++) {
    let u = (i / M) * 2 * Math.PI, v = (j / Nn) * 2 * Math.PI + Math.PI / 4;
    torV.push([(Rr + rr * Math.cos(v)) * Math.cos(u), rr * Math.sin(v), (Rr + rr * Math.cos(v)) * Math.sin(u)]);
    torF.push([i * Nn + j, ((i + 1) % M) * Nn + j, ((i + 1) % M) * Nn + ((j + 1) % Nn), i * Nn + ((j + 1) % Nn)]);
  }
  addSolid('トーラス', torV, torF);
}
function sub3(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function dot3(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross3(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function normalize3(a) { let m = Math.hypot(...a) || 1; return a.map((x) => x / m); }
