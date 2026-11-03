// ============================================
// 12 双対多面体（WEBGL）
// 面の真ん中に点を打ってつなぐと、別の多面体ができる：立方体 ↔ 正八面体、正十二面体 ↔ 正二十面体、正四面体 ↔ 正四面体
//   頂点の数と面の数が入れ替わり、辺の数は同じ。オイラーの式 V − E + F = 2 は双対でも成り立つ
//   面は「3 点を通る平面の片側に全部の頂点がある」で自動的に見つける（凸包）
// ドラッグ = 回転 / 1〜3 = 組 / A・B = 表示切替 / D = 双対の双対 / スペース = 自動回転
// ============================================

let pairNo = 1;
let polyA, polyB, polyC;              // 元・双対・双対の双対
let rotX = -0.45, rotY = 0.6, spin = true;
let showA = true, showB = true, showC = false;
let UNITPX = 150;                      // ★ 1 単位 = 何 px
let hud;
let pairNames = ['', '立方体 ↔ 正八面体', '正十二面体 ↔ 正二十面体', '正四面体 ↔ 正四面体'];

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  colorMode(HSB, 360, 100, 100, 100);
  hud = createGraphics(windowWidth, 130);
  hud.colorMode(HSB, 360, 100, 100, 100);
  makePair(1);
}
// ★ 頂点の座標（正多面体）
function baseVerts(k) {
  let V = [], phi = (1 + Math.sqrt(5)) / 2;
  if (k === 1) for (let x of [-1, 1]) for (let y of [-1, 1]) for (let z of [-1, 1]) V.push([x, y, z]);
  if (k === 2) {
    for (let x of [-1, 1]) for (let y of [-1, 1]) for (let z of [-1, 1]) V.push([x, y, z]);
    for (let s of [-1, 1]) for (let t of [-1, 1]) { V.push([0, s / phi, t * phi]); V.push([s / phi, t * phi, 0]); V.push([t * phi, 0, s / phi]); }
  }
  if (k === 3) V = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]];
  let r = Math.hypot(...V[0]);
  return V.map((v) => v.map((c) => c / r * 1.3));
}
function makePair(k) {
  pairNo = k;
  polyA = buildPoly(baseVerts(k));
  polyB = dualOf(polyA);
  polyC = dualOf(polyB);
}

function drawPoly(P, hue, faceA, edgeW) {
  // 面
  noStroke(); fill(hue, 60, 100, faceA);
  for (let f of P.faces) { beginShape(); for (let i of f) vertex(P.verts[i][0] * UNITPX, P.verts[i][1] * UNITPX, P.verts[i][2] * UNITPX); endShape(CLOSE); }
  // 辺
  stroke(hue, 70, 100); strokeWeight(edgeW);
  for (let [a, b] of P.edges) line(P.verts[a][0] * UNITPX, P.verts[a][1] * UNITPX, P.verts[a][2] * UNITPX, P.verts[b][0] * UNITPX, P.verts[b][1] * UNITPX, P.verts[b][2] * UNITPX);
  // 頂点
  noStroke(); fill(hue, 40, 100);
  for (let v of P.verts) { push(); translate(v[0] * UNITPX, v[1] * UNITPX, v[2] * UNITPX); sphere(5, 8, 6); pop(); }
}

function draw() {
  background(250, 40, 10);
  if (spin) rotY += 0.004;
  ambientLight(60); directionalLight(255, 255, 255, 0.3, 0.5, -1);
  push(); rotateX(rotX); rotateY(rotY);
  if (showA) drawPoly(polyA, 10, 30, 3);
  if (showB) drawPoly(polyB, 180, 30, 3);
  if (showC) drawPoly(polyC, 55, 20, 2);
  pop();

  // HUD（2D のバッファを画面の上に貼る）
  hud.clear(); hud.textAlign(LEFT, BASELINE); hud.noStroke();
  hud.fill(0, 0, 100); hud.textSize(18);
  hud.text(pairNames[pairNo] + '（1〜3）　A：' + (showA ? 'ON' : 'off') + '　B：' + (showB ? 'ON' : 'off') + '　D：双対の双対 ' + (showC ? 'ON（黄）' : 'off') + '　スペース：自動回転　ドラッグで回す', 20, 40);
  hud.fill(10, 60, 100); hud.textSize(15);
  hud.text('コーラル　V = ' + polyA.verts.length + '　E = ' + polyA.edges.length + '　F = ' + polyA.faces.length + '　V − E + F = ' + (polyA.verts.length - polyA.edges.length + polyA.faces.length), 20, 68);
  hud.fill(180, 60, 100);
  hud.text('アクア　　V = ' + polyB.verts.length + '　E = ' + polyB.edges.length + '　F = ' + polyB.faces.length + '　V − E + F = ' + (polyB.verts.length - polyB.edges.length + polyB.faces.length) + '　（V と F が入れ替わり、E は同じ）', 20, 92);
  hud.fill(0, 0, 60); hud.textSize(14);
  hud.text('双対の頂点 = 元の面の中心、双対の辺 = 元の辺と直交して交わる。双対の双対（D）は元と同じ形（小さく）', 20, 116);
  push(); resetMatrix(); drawingContext.disable(drawingContext.DEPTH_TEST);
  translate(-width / 2, -height / 2); image(hud, 0, 0);
  drawingContext.enable(drawingContext.DEPTH_TEST); pop();
}

function mouseDragged() { rotY += movedX * 0.01; rotX += movedY * 0.01; spin = false; }
function keyPressed() {
  if (key >= '1' && key <= '3') makePair(int(key));
  if (key === 'a' || key === 'A') showA = !showA;
  if (key === 'b' || key === 'B') showB = !showB;
  if (key === 'd' || key === 'D') showC = !showC;
  if (key === ' ') spin = !spin;
}

// ---------- やってみよう ----------
// 1. 立方体の面 6 個の中心をつなぐと正八面体（頂点 6）。正八面体の面 8 個の中心をつなぐと立方体（頂点 8）
// 2. 正四面体は自分自身と双対（自己双対）。双対の双対は向きが元に戻る？ 大きさは？
// 3. baseVerts に自分の凸多面体（例：三角柱の 6 点）を足す。双対は何角錐？（n 角柱 ↔ n 角両錐）
// 4. 辺の数が変わらない理由を考えよう：元の辺 1 本 ↔ 隣り合う 2 面 ↔ 双対の辺 1 本


// ==================================================
// ここから下は「多面体の道具」（面の検出・双対の計算。読まなくても OK）
// ==================================================
function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function crossP(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function dotP(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function unit(a) { let l = Math.hypot(...a) || 1e-9; return a.map((c) => c / l); }

// 頂点の配列から面（凸包）と辺を作る
function buildPoly(V) {
  let faces = [], seen = new Set(), n = V.length, eps = 1e-6;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let k = j + 1; k < n; k++) {
    let nm = unit(crossP(sub(V[j], V[i]), sub(V[k], V[i])));
    if (Math.hypot(...crossP(sub(V[j], V[i]), sub(V[k], V[i]))) < eps) continue;
    let d = dotP(nm, V[i]), pos = 0, neg = 0, on = [];
    for (let m = 0; m < n; m++) { let s = dotP(nm, V[m]) - d; if (s > eps) pos++; else if (s < -eps) neg++; else on.push(m); }
    if (pos > 0 && neg > 0) continue;
    if (pos > 0) { nm = nm.map((c) => -c); d = -d; }           // 外向きにそろえる
    let keyS = on.join(','); if (seen.has(keyS)) continue; seen.add(keyS);
    // 面の頂点を法線のまわりの角度で並べる
    let c = [0, 1, 2].map((ax) => on.reduce((s, m) => s + V[m][ax], 0) / on.length);
    let u = unit(sub(V[on[0]], c)), w = crossP(nm, u);
    on.sort((p, q) => Math.atan2(dotP(sub(V[p], c), w), dotP(sub(V[p], c), u)) - Math.atan2(dotP(sub(V[q], c), w), dotP(sub(V[q], c), u)));
    faces.push(on);
  }
  let edges = [], es = new Set();
  for (let f of faces) for (let t = 0; t < f.length; t++) {
    let a = f[t], b = f[(t + 1) % f.length], ks = Math.min(a, b) + '-' + Math.max(a, b);
    if (!es.has(ks)) { es.add(ks); edges.push([Math.min(a, b), Math.max(a, b)]); }
  }
  return { verts: V, faces, edges };
}
// ★ 双対：各面の中心を頂点にする。辺の中点の半径がそろうように大きさを合わせる
function dualOf(P) {
  let centers = P.faces.map((f) => [0, 1, 2].map((ax) => f.reduce((s, m) => s + P.verts[m][ax], 0) / f.length));
  let D = buildPoly(centers);
  let midR = (Q) => Q.edges.reduce((s, [a, b]) => s + Math.hypot(...[0, 1, 2].map((ax) => (Q.verts[a][ax] + Q.verts[b][ax]) / 2)), 0) / Q.edges.length;
  let k = midR(P) / (midR(D) || 1);
  return buildPoly(D.verts.map((v) => v.map((c) => c * k)));
}
