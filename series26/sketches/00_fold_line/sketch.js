// ============================================
// 00 折り線と折り目
// 紙の上の点 P をつまんで点 Q に重ねると、折り線は「P と Q の垂直二等分線」になる
//   折る = 折り線について線対称に移す（鏡映）。何回でも重ねて折れて、重なった紙は層になる
// ドラッグ = 点をつまんで重ねる（角や辺の中点に吸いつく）/ U = 広げて折り目を見る / Z = 1 つ戻す / R = リセット
// ============================================

let snapR = 18;            // ★ 角や中点に吸いつく距離（px）
let frontCol = [246, 240, 226];   // ★ 紙のおもて（白）
let backCol = [226, 84, 72];      // ★ 紙のうら（色紙の赤）
let S, ox, oy;             // 紙の一辺と左上
let faces = [];            // 紙の面 { pts: 今の位置, M: もとの紙 → 今 の変換, back: 裏返っているか, z: 重なりの順 }
let creases = [];          // 広げた紙の上の折り目 { a, b, mv: 'M' か 'V' }
let history = [];          // Z で戻すための記録
let grabP = null;          // つまんだ点 P
let unfolded = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  resetPaper();
}

function resetPaper() {
  S = min(width, height) * 0.6;
  ox = width / 2 - S / 2; oy = height / 2 - S / 2 + 30;
  faces = [{ pts: [{ x: ox, y: oy }, { x: ox + S, y: oy }, { x: ox + S, y: oy + S }, { x: ox, y: oy + S }], M: ident(), back: false, z: 0 }];
  creases = []; history = [];
}

// ★ 折る：折り線 L について、点 P がある側の紙をぜんぶ鏡に映して上に重ねる
function foldFaces(fs, L, P) {
  let side = sdist(P, L) > 0 ? 1 : -1;
  let maxZ = 0;
  for (let f of fs) maxZ = max(maxZ, f.z);
  let R = reflMat(L);
  let out = [], cuts = [];
  for (let f of fs) {
    let keep = clipHalf(f.pts, L, -side), move = clipHalf(f.pts, L, side);
    if (keep.length >= 3) out.push({ pts: keep, M: f.M, back: f.back, z: f.z });
    if (move.length >= 3) {
      out.push({ pts: move.map((p) => refl(p, L)), M: compose(R, f.M), back: !f.back, z: 2 * maxZ + 1 - f.z });
      if (keep.length >= 3) {
        // 面が切られた所が新しい折り目。もとの紙の位置に戻して記録する
        let seg = cutSeg(f.pts, L);
        if (seg) {
          let inv = inverse(f.M);
          // おもてが見えている面を手前に折る → おもてから見て谷折り。裏が見えている面なら山折り
          cuts.push({ a: apply(inv, seg[0]), b: apply(inv, seg[1]), mv: f.back ? 'M' : 'V' });
        }
      }
    }
  }
  return { faces: out, cuts };
}

function draw() {
  background(34, 32, 40);
  let preview = null, Q = null, L = null;
  if (grabP && !unfolded) {
    Q = snapPoint(mouseX, mouseY);
    if (dist(grabP.x, grabP.y, Q.x, Q.y) > 4) { L = bisector(grabP, Q); preview = foldFaces(faces, L, grabP); }
  }

  if (unfolded) drawUnfolded();
  else drawFaces(preview ? preview.faces : faces);

  // 折り線・P・Q
  if (L) {
    stroke(255, 220, 90); strokeWeight(2);
    drawingContext.setLineDash([10, 8]);
    line(L.p.x - L.u.x * 2000, L.p.y - L.u.y * 2000, L.p.x + L.u.x * 2000, L.p.y + L.u.y * 2000);
    drawingContext.setLineDash([]);
    stroke(255, 255, 255, 120); strokeWeight(1);
    line(grabP.x, grabP.y, Q.x, Q.y);
    noStroke();
    fill(90, 200, 255); circle(grabP.x, grabP.y, 14);
    fill(255, 220, 90); circle(Q.x, Q.y, 14);
    fill(255); textSize(15);
    text('P', grabP.x + 10, grabP.y - 10); text('Q', Q.x + 10, Q.y - 10);
  }
  // 吸いつく点の目印
  if (!unfolded) {
    noStroke(); fill(255, 255, 255, 60);
    for (let p of snapTargets()) circle(p.x, p.y, 6);
  }

  noStroke(); fill(255); textSize(18);
  text('ドラッグ：点 P をつまんで Q に重ねる　U：広げて折り目を見る ' + (unfolded ? 'ON' : 'off') + '　Z：戻す　R：リセット　　折った回数 ' + history.length + '　層の数 ' + faces.length, 20, 40);
  fill(170); textSize(15);
  text('折り線 = P と Q の垂直二等分線（P と Q から等しい距離の点の集まり）。紙の上の点はすべて、折り線について線対称な位置へ移る', 20, 68);
  if (unfolded) {
    fill(255, 120, 100); text('━ ━ 山折り（M）', 20, height - 50);
    fill(110, 170, 255); text('- - - 谷折り（V）', 180, height - 50);
    fill(200); text('山 ' + creases.filter((c) => c.mv === 'M').length + '　谷 ' + creases.filter((c) => c.mv === 'V').length + '　（おもてから見て）', 340, height - 50);
  }
}

function drawFaces(fs) {
  let sorted = fs.slice().sort((a, b) => a.z - b.z);
  stroke(60, 40, 40, 150); strokeWeight(1);
  for (let f of sorted) {
    let c = f.back ? backCol : frontCol;
    fill(c[0], c[1], c[2]);
    beginShape();
    for (let p of f.pts) vertex(p.x, p.y);
    endShape(CLOSE);
  }
}

function drawUnfolded() {
  noStroke(); fill(frontCol[0], frontCol[1], frontCol[2]);
  rect(ox, oy, S, S);
  strokeWeight(2.5);
  for (let c of creases) {
    if (c.mv === 'M') { stroke(230, 80, 60); drawingContext.setLineDash([14, 5, 3, 5]); }
    else { stroke(50, 110, 230); drawingContext.setLineDash([8, 6]); }
    line(c.a.x, c.a.y, c.b.x, c.b.y);
  }
  drawingContext.setLineDash([]);
}

function snapTargets() {
  let out = [];
  for (let f of faces) for (let i = 0; i < f.pts.length; i++) {
    let a = f.pts[i], b = f.pts[(i + 1) % f.pts.length];
    out.push(a, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  }
  return out;
}
function snapPoint(x, y) {
  let best = { x, y }, bd = snapR;
  for (let p of snapTargets()) { let d = dist(x, y, p.x, p.y); if (d < bd) { bd = d; best = { x: p.x, y: p.y }; } }
  return best;
}

function mousePressed() {
  if (unfolded) return;
  let p = snapPoint(mouseX, mouseY);
  let on = faces.some((f) => insidePoly(p, f.pts)) || (p.x !== mouseX || p.y !== mouseY);
  grabP = on ? p : null;
}
function mouseReleased() {
  if (!grabP) return;
  let Q = snapPoint(mouseX, mouseY);
  if (dist(grabP.x, grabP.y, Q.x, Q.y) > 4) {
    history.push({ faces, creases: creases.slice() });
    let r = foldFaces(faces, bisector(grabP, Q), grabP);
    faces = r.faces; creases = creases.concat(r.cuts);
  }
  grabP = null;
}
function keyPressed() {
  if (key === 'u' || key === 'U') unfolded = !unfolded;
  if ((key === 'z' || key === 'Z') && history.length) { let h = history.pop(); faces = h.faces; creases = h.creases; }
  if (key === 'r' || key === 'R') resetPaper();
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); resetPaper(); }

// ---------- やってみよう ----------
// 1. 角を向かいの角に重ねる・辺を向かいの辺に重ねる。U で広げると折り目はどこにできた？
// 2. 半分に 3 回折ってから U。折り目は何本？ 山と谷の数をくらべよう（06 前川の定理への伏線）
// 3. 角を辺の中点に重ねると、辺が 2:1 に分かれる場所ができる（04 芳賀の定理）。探してみよう
// 4. backCol を好きな色に。おもてとうらで違う色の「色紙」にすると、折り紙の模様がつくれる


// ==================================================
// ここから下は「折り紙の幾何の道具」（線対称・多角形の切り分け・変換）
// ==================================================
// 直線 L = { p: 通る点, u: 向き（長さ 1） }
function bisector(a, b) { // a と b の垂直二等分線
  let dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
  return { p: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, u: { x: -dy / l, y: dx / l } };
}
function sdist(q, L) { return (q.x - L.p.x) * -L.u.y + (q.y - L.p.y) * L.u.x; }  // 符号つき距離
function refl(q, L) { let s = sdist(q, L); return { x: q.x + 2 * s * L.u.y, y: q.y - 2 * s * L.u.x }; }
// 凸多角形を直線で切り、side 側（符号）を残す
function clipHalf(pts, L, side) {
  let out = [];
  for (let i = 0; i < pts.length; i++) {
    let a = pts[i], b = pts[(i + 1) % pts.length];
    let sa = sdist(a, L) * side, sb = sdist(b, L) * side;
    if (sa >= -1e-6) out.push(a);
    if ((sa > 1e-6 && sb < -1e-6) || (sa < -1e-6 && sb > 1e-6)) { let t = sa / (sa - sb); out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }); }
  }
  return out;
}
function cutSeg(pts, L) { // 多角形と直線が交わる 2 点
  let r = [];
  for (let i = 0; i < pts.length; i++) {
    let a = pts[i], b = pts[(i + 1) % pts.length], sa = sdist(a, L), sb = sdist(b, L);
    if (Math.abs(sa) < 1e-6) r.push(a);
    else if (sa * sb < 0) { let t = sa / (sa - sb); r.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }); }
  }
  return r.length >= 2 ? [r[0], r[r.length - 1]] : null;
}
function insidePoly(p, pts) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    if ((pts[i].y > p.y) !== (pts[j].y > p.y) && p.x < (pts[j].x - pts[i].x) * (p.y - pts[i].y) / (pts[j].y - pts[i].y) + pts[i].x) c = !c;
  }
  return c;
}
// 平面の変換 x' = a x + b y + e,  y' = c x + d y + f
function ident() { return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }; }
function apply(M, p) { return { x: M.a * p.x + M.b * p.y + M.e, y: M.c * p.x + M.d * p.y + M.f }; }
function compose(A, B) { // B をしてから A をする（合成 A∘B）
  return { a: A.a * B.a + A.b * B.c, b: A.a * B.b + A.b * B.d, c: A.c * B.a + A.d * B.c, d: A.c * B.b + A.d * B.d,
    e: A.a * B.e + A.b * B.f + A.e, f: A.c * B.e + A.d * B.f + A.f };
}
function inverse(M) {
  let det = M.a * M.d - M.b * M.c;
  let a = M.d / det, b = -M.b / det, c = -M.c / det, d = M.a / det;
  return { a, b, c, d, e: -(a * M.e + b * M.f), f: -(c * M.e + d * M.f) };
}
function reflMat(L) { // 直線 L についての鏡映
  let nx = -L.u.y, ny = L.u.x;
  let a = 1 - 2 * nx * nx, b = -2 * nx * ny, d = 1 - 2 * ny * ny;
  return { a, b, c: b, d, e: L.p.x - (a * L.p.x + b * L.p.y), f: L.p.y - (b * L.p.x + d * L.p.y) };
}
