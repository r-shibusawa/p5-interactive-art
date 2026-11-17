// ============================================
// 13 あいまい図形と不可能図形 ─ ネッカーの立方体とペンローズの三角形
// 1 ネッカーの立方体：線だけの立方体は、奥行きの手がかりがないので 2 通りに見える（見ているうちに反転する）
// 2 ペンローズの三角形：本当は「つながっていない」L 字に曲がった 3 本の棒。ある 1 方向から見たときだけ輪に見える
// ドラッグ・←→↑↓ = 回す / M = 魔法の角度（ぴったりつながって見える向き）/ スペース = 自動で回す
// F = ネッカーの見え方を色で固定（なし → 解釈 A → 解釈 B）/ T = 真実（本当の奥行き・すき間を表示）
// ============================================

let which = 2;
let yaw = 0, pitch = 0;      // 見る向き（ラジアン）。setup で魔法の角度にする
let auto = false, faceMode = 0, truthKey = false;
let NC = 5;                  // ★ ペンローズの 1 本の棒の立方体の数
const MAGIC_YAW = Math.PI / 4, MAGIC_PITCH = Math.asin(1 / Math.sqrt(3));   // (1, 1, 1) の方向から見る

function setup() {
  createCanvas(windowWidth, windowHeight);
  yaw = MAGIC_YAW; pitch = MAGIC_PITCH;
  selfTest();
}

// ---- 3D → 画面（正射影：遠くても小さくならない）
function basis(yw, pt) {
  let d = [Math.cos(pt) * Math.cos(yw), Math.cos(pt) * Math.sin(yw), Math.sin(pt)];   // 見る人の方向
  let r = [-Math.sin(yw), Math.cos(yw), 0], u = [-Math.sin(pt) * Math.cos(yw), -Math.sin(pt) * Math.sin(yw), Math.cos(pt)];
  return { d, r, u };
}
function dot3(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function project(p, B, sc, cx, cy) { return [cx + sc * dot3(p, B.r), cy - sc * dot3(p, B.u), dot3(p, B.d)]; }

// ペンローズ：x 方向 → y 方向 → z 方向に NC 個ずつ並べた立方体（最初の立方体は (0,0,0)）
function chainCubes() {
  let c = [], p = [0, 0, 0];
  for (let axis of [0, 1, 2]) for (let k = 0; k < NC; k++) { c.push(p.slice()); p[axis] += 1; }
  return c;   // 最後の立方体の次の位置は (NC, NC, NC) = 最初の位置 + (NC, NC, NC)
}
function cubeCorners(c) { let o = []; for (let i = 0; i < 8; i++) o.push([c[0] + (i & 1), c[1] + ((i >> 1) & 1), c[2] + ((i >> 2) & 1)]); return o; }

function draw() {
  if (auto) yaw += 0.006;
  background(238);
  let B = basis(yaw, pitch), cx = width * 0.45, cy = height * 0.55;
  if (which === 1) drawNecker(B, cx, cy); else drawPenrose(B, cx, cy);
  hud();
}

function drawPenrose(B, cx, cy) {
  let sc = Math.min(width, height) / (NC * 2.3), cubes = chainCubes();
  let off = [0, 1, 2].map((a) => cubes.reduce((t, c) => t + c[a] + 0.5, 0) / cubes.length);   // 立方体の重心を画面の中心に
  let P = (p) => project([p[0] - off[0], p[1] - off[1], p[2] - off[2]], B, sc, cx, cy);
  // 奥から手前の順に描く（画家のアルゴリズム）
  let order = cubes.map((c, i) => ({ c, i, z: dot3([c[0] + 0.5, c[1] + 0.5, c[2] + 0.5], B.d) })).sort((a, b) => a.z - b.z);
  let faces = [[0, [1, 3, 7, 5], [240, 120, 60]], [1, [2, 6, 7, 3], [250, 200, 70]], [2, [4, 5, 7, 6], [255, 240, 200]]];   // +x, +y, +z の面
  let facesNeg = [[0, [0, 4, 6, 2]], [1, [0, 1, 5, 4]], [2, [0, 2, 3, 1]]];
  stroke(60); strokeWeight(1.2);
  for (let o of order) {
    let k = cubeCorners(o.c).map(P);
    for (let a = 0; a < 3; a++) {
      let pos = B.d[a] > 0, idx = pos ? faces[a][1] : facesNeg[a][1], col = faces[a][2];
      fill(pos ? col : col.map((v) => v * 0.7));
      beginShape(); for (let j of idx) vertex(k[j][0], k[j][1]); endShape(CLOSE);
    }
  }
  if (truthKey) {
    let a = P([0, 0, 0]), e = P([NC, NC, NC]);
    noFill(); stroke(220, 30, 30); strokeWeight(3); circle(a[0], a[1], 22); circle(e[0], e[1], 34); line(a[0], a[1], e[0], e[1]);
    noStroke(); fill(220, 30, 30); textSize(15); textAlign(LEFT, CENTER);
    text('最初の角と最後の角：画面の距離 ' + Math.hypot(a[0] - e[0], a[1] - e[1]).toFixed(1) + ' px、3D の距離 ' + (NC * Math.sqrt(3)).toFixed(2) + '（立方体 ' + NC * 3 + ' 個）', 20, height - 44);
    // 真上から見た図（小窓）
    let Bt = basis(MAGIC_YAW, 1.2), s2 = 14, x0 = width - 160, y0 = 190;
    fill(255); stroke(180); rect(x0 - 120, y0 - 110, 240, 220, 8);
    stroke(30, 90, 200); strokeWeight(3); noFill(); beginShape();
    for (let c of cubes.concat([[NC, NC, NC]])) { let q = project([c[0] - off[0], c[1] - off[1], c[2] - off[2]], Bt, s2, x0, y0); vertex(q[0], q[1]); }
    endShape(); noStroke(); fill(30); textSize(13); textAlign(CENTER, TOP); text('別の向きから：つながっていない', x0, y0 + 88);
  }
}

function drawNecker(B, cx, cy) {
  let sc = Math.min(width, height) * 0.2, V = cubeCorners([-0.5, -0.5, -0.5]).map((p) => project(p, B, sc, cx, cy));
  let edges = [];
  for (let i = 0; i < 8; i++) for (let b of [1, 2, 4]) if (!(i & b)) edges.push([i, i | b]);
  // F：2 つの解釈のどちらかの「手前の面」を色で示す（同じ線の絵のまま）
  if (faceMode) {
    // 視線にいちばん近い軸の 2 つの面（本当に手前の面 / 本当は奥の面）
    let ax = [0, 1, 2].reduce((m, a) => (Math.abs(B.d[a]) > Math.abs(B.d[m]) ? a : m), 0), bit = 1 << ax;
    let near = B.d[ax] > 0, side = faceMode === 1 ? near : !near;
    let fa = [0, 1, 2, 3, 4, 5, 6, 7].filter((i) => !!(i & bit) === side);
    fa = [fa[0], fa[1], fa[3], fa[2]];
    noStroke(); fill(80, 140, 240, 90); beginShape(); for (let j of fa) vertex(V[j][0], V[j][1]); endShape(CLOSE);
  }
  for (let [i, j] of edges) {
    let w = 3;
    if (truthKey) { let z = (V[i][2] + V[j][2]) / 2; w = map(z, -0.9, 0.9, 1, 8); stroke(map(z, -0.9, 0.9, 190, 20)); } else stroke(30);
    strokeWeight(w); line(V[i][0], V[i][1], V[j][0], V[j][1]);
  }
  if (truthKey) { noStroke(); fill(220, 30, 30); textSize(15); textAlign(LEFT, CENTER); text('真実：太くて濃い線ほど手前（本当の 3D の奥行き）。正射影なので、奥行きを裏返しても線の絵はまったく同じ', 20, height - 44); }
}

function hud() {
  noStroke(); fill(20); textAlign(LEFT, BASELINE); textSize(18);
  let magic = Math.abs(yaw - MAGIC_YAW) < 1e-3 && Math.abs(pitch - MAGIC_PITCH) < 1e-3;
  text('1・2：' + (which === 1 ? 'ネッカーの立方体' : 'ペンローズの三角形') + '　ドラッグ・矢印：回す　M：魔法の角度' + (magic ? '（いま）' : '') + '　スペース：自動 ' + (auto ? 'ON' : 'off') + (which === 1 ? '　F：見え方を固定' : '') + '　T：真実', 20, 34);
  fill(80); textSize(15);
  text(which === 1 ? '線だけだと、どちらの四角が手前にも見える。F で片方の四角に色を付けると、その面が手前に見えやすくなる' : '少し回すと、本当は輪になっていない（すき間がある）ことが分かる。M で戻すとまたつながる', 20, 60);
  text('向き：横 ' + degrees(yaw).toFixed(1) + '°、縦 ' + degrees(pitch).toFixed(1) + '°', 20, 84);
  fill(selfTestResults.length && selfTestResults.every((r) => r.ok) ? color(30, 130, 60) : color(200, 40, 40)); textSize(14);
  text(selfTestLine(), 20, height - 16);
}

function mouseDragged() { yaw -= (mouseX - pmouseX) * 0.008; pitch = constrain(pitch + (mouseY - pmouseY) * 0.008, -1.5, 1.5); }
function keyPressed() {
  if (key === '1') { which = 1; yaw = 0.45; pitch = 0.35; }
  if (key === '2') { which = 2; yaw = MAGIC_YAW; pitch = MAGIC_PITCH; }
  if (key === 'm' || key === 'M') { yaw = MAGIC_YAW; pitch = MAGIC_PITCH; auto = false; }
  if (key === ' ') auto = !auto;
  if (key === LEFT_ARROW) yaw -= 0.087;
  if (key === RIGHT_ARROW) yaw += 0.087;
  if (key === UP_ARROW) pitch = Math.min(1.5, pitch + 0.087);
  if (key === DOWN_ARROW) pitch = Math.max(-1.5, pitch - 0.087);
  if (key === 'f' || key === 'F') faceMode = (faceMode + 1) % 3;
  if (key === 't' || key === 'T') truthKey = !truthKey;
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. ネッカーの立方体をじっと見て、何秒ごとに反転するか数える
// 2. ペンローズで ← を 1 回だけ押す。どこにすき間が現れる？
// 3. NC を 3 や 8 にしても、魔法の角度ではつながって見える？（(NC, NC, NC) はいつも視線の方向）
// 4. 魔法の角度で T：画面の上では 0 px なのに、3D では離れている
// 5. エッシャーのような「上り続ける階段」も、同じ考え方で作れる。挑戦しよう


// ==================================================
// ここから下は「錯視の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 自己テスト：射影の計算で「つながって見える」「2 通りに見える」理由を確かめる
let selfTestResults = [];
function selfTest() {
  let R = [], ok = (name, cond) => R.push({ name, ok: !!cond });
  let Bm = basis(MAGIC_YAW, MAGIC_PITCH), a = project([0, 0, 0], Bm, 100, 0, 0), e = project([NC, NC, NC], Bm, 100, 0, 0);
  ok('魔法の角度：最初の角と最後の角は画面で同じ点（' + Math.hypot(a[0] - e[0], a[1] - e[1]).toExponential(1) + ' px）', Math.hypot(a[0] - e[0], a[1] - e[1]) < 1e-9);
  ok('でも 3D では離れている：距離 ' + (NC * Math.sqrt(3)).toFixed(2) + '（奥行きの差 ' + (e[2] - a[2]).toFixed(0) + '）', Math.abs(e[2] - a[2]) > 1);
  let Bo = basis(MAGIC_YAW + 0.1, MAGIC_PITCH), a2 = project([0, 0, 0], Bo, 100, 0, 0), e2 = project([NC, NC, NC], Bo, 100, 0, 0);
  ok('少し（5.7°）回すと、すき間が ' + Math.hypot(a2[0] - e2[0], a2[1] - e2[1]).toFixed(0) + ' px 現れる', Math.hypot(a2[0] - e2[0], a2[1] - e2[1]) > 20);
  let cubes = chainCubes();
  ok('ペンローズは 3 本 × ' + NC + ' 個の立方体で、輪ではない（立方体が重ならない）', cubes.length === 3 * NC && new Set(cubes.map((c) => c.join())).size === cubes.length);
  let B = basis(0.4, 0.3), mirror = (p) => { let k = 2 * dot3(p, B.d); return [p[0] - k * B.d[0], p[1] - k * B.d[1], p[2] - k * B.d[2]]; };
  let V = cubeCorners([-0.5, -0.5, -0.5]);
  ok('ネッカー：奥行きを裏返した立方体も、画面の上ではまったく同じ線の絵になる（正射影）', V.every((p) => { let q = project(p, B, 100, 0, 0), m = project(mirror(p), B, 100, 0, 0); return Math.abs(q[0] - m[0]) < 1e-9 && Math.abs(q[1] - m[1]) < 1e-9 && Math.abs(q[2] + m[2]) < 1e-9; }));
  ok('見る向きのベクトルは長さ 1 で、右・上と直角', Math.abs(dot3(B.d, B.d) - 1) < 1e-12 && Math.abs(dot3(B.d, B.r)) < 1e-12 && Math.abs(dot3(B.d, B.u)) < 1e-12 && Math.abs(dot3(B.r, B.u)) < 1e-12);
  selfTestResults = R;
  for (let r of R) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name);
  return R.every((r) => r.ok);
}
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
