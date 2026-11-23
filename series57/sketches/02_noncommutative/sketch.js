// ============================================
// 02 掛け算が交換しない ─ pq ≠ qp
// 四元数 = スカラー部 + ベクトル部。積は pq = (p₀q₀ − p_v·q_v,  p₀q_v + q₀p_v + p_v×q_v)：内積と外積が両方入っている
// 外積だけが順番で符号を変えるので、pq − qp = 2(p_v × q_v)。ベクトル部が平行なら交換できる
// スライダをドラッグ：p と q の 4 成分 / R：ランダム / 0：q_v を p_v と平行に / スペース：3D の図を回す
// ============================================

let vals = [0.6, 1.0, 0.4, -0.3, -0.4, 0.2, 1.1, 0.5];   // ★ p = vals[0..3]、q = vals[4..7]
const LABELS = ['p₀', 'p₁ (i)', 'p₂ (j)', 'p₃ (k)', 'q₀', 'q₁ (i)', 'q₂ (j)', 'q₃ (k)'];
let dragIdx = -1, viewAng = 0.6, spinning = true;

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); }
function parts(p, q) {                 // 積をスカラー部とベクトル部の式で組み立てる
  let pv = p.slice(1), qv = q.slice(1), cr = v3Cross(pv, qv);
  return { s: p[0] * q[0] - v3Dot(pv, qv), v: v3Add(v3Add(v3Scl(qv, p[0]), v3Scl(pv, q[0])), cr), dot: v3Dot(pv, qv), cr };
}
function slider(n) { return { x: 40, y: 140 + n * 52 + (n >= 4 ? 24 : 0), w: 300 }; }

function draw() {
  background(17, 20, 36);
  if (spinning) viewAng += 0.006;
  if (dragIdx >= 0) { let s = slider(dragIdx); vals[dragIdx] = Math.round(clampv(((mouseX - s.x) / s.w) * 4 - 2, -2, 2) * 20) / 20; }
  let p = vals.slice(0, 4), q = vals.slice(4, 8), pq = qMul(p, q), qp = qMul(q, p), diff = qSub(pq, qp), P = parts(p, q);
  // ---- スライダ
  for (let n = 0; n < 8; n++) {
    let s = slider(n), t = (vals[n] + 2) / 4;
    stroke(70, 80, 120); strokeWeight(4); line(s.x, s.y, s.x + s.w, s.y);
    stroke(n < 4 ? color(110, 170, 255) : color(255, 150, 90)); line(s.x + s.w / 2, s.y, s.x + t * s.w, s.y);
    noStroke(); fill(255); circle(s.x + t * s.w, s.y, 18);
    fill(200); textSize(14); text(LABELS[n] + ' = ' + vals[n].toFixed(2), s.x, s.y - 14);
  }
  // ---- 3D の図：p_v（青）、q_v（橙）、p_v×q_v（緑）、q_v×p_v（赤）
  let view = { x: width * 0.44, y: height * 0.55, s: Math.min(width, height) * 0.12, d: 9 };
  let vq = qMul(qAxisAngle([1, 0, 0], 0.35), qAxisAngle([0, 1, 0], viewAng)), V = (v) => qRot(vq, v);
  strokeWeight(1); stroke(70, 80, 120);
  for (let a = 0; a < 3; a++) { let e = [0, 0, 0]; e[a] = 2.2; line3(V(v3Scl(e, -1)), V(e), view); }
  arrow3(V(p.slice(1)), view, [110, 170, 255], 'p_v');
  arrow3(V(q.slice(1)), view, [255, 150, 90], 'q_v');
  arrow3(V(P.cr), view, [130, 230, 150], 'p_v×q_v');
  arrow3(V(v3Scl(P.cr, -1)), view, [255, 110, 110], 'q_v×p_v');
  // p_v と q_v の作る平行四辺形（面積 = |p_v×q_v|）
  noStroke(); fill(255, 255, 255, 30); beginShape();
  for (let c of [[0, 0, 0], p.slice(1), v3Add(p.slice(1), q.slice(1)), q.slice(1)]) { let s = projP(V(c), view); vertex(s[0], s[1]); }
  endShape(CLOSE);

  // ---- 右の表
  let tx = width * 0.66, ty = 130;
  fill(240); noStroke(); textSize(16);
  text('p q = ' + qStr(pq, 3), tx, ty); text('q p = ' + qStr(qp, 3), tx, ty + 26);
  fill(255, 150, 150); text('pq − qp = ' + qStr(diff, 3), tx, ty + 52);
  fill(130, 230, 150); text('2(p_v × q_v) = ' + qStr([0, ...v3Scl(P.cr, 2)], 3), tx, ty + 78);
  fill(255, 210, 110); textSize(15); text('積を分けると', tx, ty + 124);
  fill(210); textSize(14);
  text('スカラー部 p₀q₀ − p_v·q_v = ' + (p[0] * q[0]).toFixed(3) + ' − ' + P.dot.toFixed(3) + ' = ' + P.s.toFixed(3), tx, ty + 150);
  text('ベクトル部 p₀q_v + q₀p_v + p_v×q_v', tx, ty + 174);
  text('　= ' + qStr([0, ...v3Add(v3Scl(q.slice(1), p[0]), v3Scl(p.slice(1), q[0]))], 3).replace('(0.000, ', '(') + ' + ' + qStr([0, ...P.cr], 3).replace('(0.000, ', '('), tx, ty + 196);
  text('　= ' + qStr([0, ...P.v], 3).replace('(0.000, ', '(') + '　← qMul と一致', tx, ty + 218);
  let par = v3Len(P.cr) < 1e-9;
  fill(par ? color(130, 230, 150) : color(200)); textSize(15);
  text(par ? 'p_v と q_v が平行 → 外積 0 → pq = qp（交換できる）' : '|p_v × q_v| = ' + v3Len(P.cr).toFixed(3) + '（平行四辺形の面積）', tx, ty + 260);
  fill(170); textSize(14);
  text('i, j, k だけの積なら：ij = k（外積 e_x × e_y = e_z）、i·i = −1（内積 1 のマイナス）。四元数の積の中に、内積と外積が最初から入っている', tx, ty + 300, width - tx - 20, 80);

  fill(240); textSize(20);
  text('掛け算が交換しない　pq − qp = 2(p_v × q_v)', 20, 36);
  fill(175); textSize(15);
  text('スライダをドラッグ：p（青）と q（橙）　R：ランダム　0：q_v を p_v と平行に　スペース：3D の図を回す/止める', 20, 62);
  text('p_v, q_v = p, q のベクトル部（i, j, k の部分）。緑 = p_v × q_v、赤 = q_v × p_v（反対向き）。差 pq − qp は、外積の 2 倍', 20, 86);
  drawSelfTest(width - 170, height - 12);
}
function arrow3(v, view, col, lab) {
  let o = projP([0, 0, 0], view), e = projP(v, view), a = Math.atan2(e[1] - o[1], e[0] - o[0]);
  stroke(...col); strokeWeight(3); line(o[0], o[1], e[0], e[1]);
  if (Math.hypot(e[0] - o[0], e[1] - o[1]) < 4) return;
  noStroke(); fill(...col); triangle(e[0], e[1], e[0] - 12 * Math.cos(a - 0.4), e[1] - 12 * Math.sin(a - 0.4), e[0] - 12 * Math.cos(a + 0.4), e[1] - 12 * Math.sin(a + 0.4));
  textSize(16); text(lab, e[0] + 8, e[1] - 6);
}

function mousePressed() {
  for (let n = 0; n < 8; n++) { let s = slider(n); if (Math.abs(mouseY - s.y) < 16 && mouseX > s.x - 12 && mouseX < s.x + s.w + 12) dragIdx = n; }
}
function mouseReleased() { dragIdx = -1; }
function keyPressed() {
  if (key === 'r' || key === 'R') vals = vals.map(() => Math.round((Math.random() * 4 - 2) * 20) / 20);
  if (key === '0') { for (let a = 1; a < 4; a++) vals[4 + a] = Math.round(vals[a] * 0.7 * 100) / 100; }
  if (key === ' ') spinning = !spinning;
  if (key === RIGHT_ARROW) viewAng += 0.2;
  if (key === LEFT_ARROW) viewAng -= 0.2;
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = []; seedRng(3);
  let e1 = 0, e2 = 0, e3 = 0, e4 = 0, e5 = 0;
  for (let t = 0; t < 200; t++) {
    let p = qScl(qRandom(), 2 * rnd()), q = qScl(qRandom(), 2 * rnd()), P = parts(p, q), pq = qMul(p, q), qp = qMul(q, p);
    e1 = Math.max(e1, qDist(pq, [P.s, ...P.v]));
    e2 = Math.max(e2, qDist(qSub(pq, qp), [0, ...v3Scl(P.cr, 2)]));
    e3 = Math.max(e3, Math.abs(pq[0] - qp[0]));
    let qpar = [q[0], ...v3Scl(p.slice(1), rndNormal())]; e4 = Math.max(e4, qDist(qMul(p, qpar), qMul(qpar, p)));
    e5 = Math.max(e5, qDist(qConj(pq), qMul(qConj(q), qConj(p))));
  }
  check('pq = (p₀q₀ − p_v·q_v, p₀q_v + q₀p_v + p_v×q_v)（200 組）', e1 < 1e-12);
  check('pq − qp = 2(0, p_v × q_v)', e2 < 1e-12);
  check('pq と qp のスカラー部は同じ', e3 < 1e-12);
  check('ベクトル部が平行なら pq = qp', e4 < 1e-12);
  check('(pq)* = q* p*（順番が入れかわる）', e5 < 1e-12);
  let u = [0, 1, 2, -1], w = [0, -3, 0.5, 2], uw = qMul(u, w);
  check('純四元数どうし：uw = −u_v·w_v + u_v×w_v、u² = −|u_v|²', near(uw[0], -v3Dot(u.slice(1), w.slice(1)), 1e-12) && v3Dist(uw.slice(1), v3Cross(u.slice(1), w.slice(1))) < 1e-12 && qDist(qMul(u, u), [-6, 0, 0, 0]) < 1e-12);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 0 キーで q_v を p_v と平行にしよう。pq − qp はいくつ？ 複素数（ベクトル部が 1 方向だけ）が交換できる理由もこれ
// 2. p₀ と q₀ だけ動かしても pq − qp は変わらない。なぜ？
// 3. p = (0, 1, 0, 0)（= i）、q = (0, 0, 1, 0)（= j）にしよう。pq と qp は？ 01 の表と比べよう
// 4. p_v と q_v を直角にすると |pq − qp| が一番大きくなる。平行四辺形の面積と比べよう
// 5. ベクトル解析の内積・外積は、四元数の積を 2 つに分けたもの（ギブズとヘヴィサイドが 19 世紀の終わりに整理した）


// ==================================================
// ここから下は「四元数の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 種つきの乱数（同じ種なら毎回同じ列）。自己テストで使う
let rngState = 1;
function seedRng(s) { rngState = (s >>> 0) || 1; }
function rnd() {                       // 0〜1 の一様乱数（mulberry32）
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rndNormal() { let u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
// ---- 四元数 [w, x, y, z] = w + xi + yj + zk（ふつうの配列）
function qMake(w, x, y, z) { return [w, x, y, z]; }
function qMul(a, b) {                  // ハミルトン積（i² = j² = k² = ijk = −1）
  return [a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
          a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
          a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
          a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0]];
}
function qConj(a) { return [a[0], -a[1], -a[2], -a[3]]; }               // 共役 q*
function qAdd(a, b) { return a.map((v, t) => v + b[t]); }
function qSub(a, b) { return a.map((v, t) => v - b[t]); }
function qScl(a, s) { return a.map((v) => v * s); }
function qDot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]; }
function qNorm(a) { return Math.sqrt(qDot(a, a)); }                     // |q|
function qUnit(a) { let n = qNorm(a); return n > 1e-300 ? qScl(a, 1 / n) : [1, 0, 0, 0]; }
function qInv(a) { let n2 = qDot(a, a); return n2 > 1e-300 ? qScl(qConj(a), 1 / n2) : [0, 0, 0, 0]; }   // q⁻¹ = q*/|q|²
function qDist(a, b) { return qNorm(qSub(a, b)); }
function qAxisAngle(n, th) {           // 軸 n（単位ベクトル）まわりに角度 th の回転：cos(th/2) + sin(th/2) n
  let u = v3Unit(n), s = Math.sin(th / 2);
  return [Math.cos(th / 2), u[0] * s, u[1] * s, u[2] * s];
}
function qRot(q, v) {                  // v を q v q* で回す（v は 3 次元ベクトル → 純四元数）
  let r = qMul(qMul(q, [0, v[0], v[1], v[2]]), qConj(q));
  return [r[1], r[2], r[3]];
}
function qToMat(q) {                   // 同じ q から作った 3×3 回転行列（単位四元数のとき）
  let [w, x, y, z] = q;
  return [[1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
          [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
          [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)]];
}
function qExp(a) {                     // exp(w + v) = e^w (cos|v| + sin|v| v/|v|)
  let vn = Math.hypot(a[1], a[2], a[3]), ew = Math.exp(a[0]), s = vn > 1e-12 ? Math.sin(vn) / vn : 1 - (vn * vn) / 6;
  return [ew * Math.cos(vn), ew * s * a[1], ew * s * a[2], ew * s * a[3]];
}
function qLog(a) {                     // log q = ln|q| + acos(w/|q|) v/|v|
  let n = qNorm(a), vn = Math.hypot(a[1], a[2], a[3]), th = Math.atan2(vn, a[0]), s = vn > 1e-12 ? th / vn : 1 / Math.max(n, 1e-300);
  return [Math.log(Math.max(n, 1e-300)), s * a[1], s * a[2], s * a[3]];
}
function qSlerp(a, b, t, shortest) {   // 球面線形補間。shortest = true なら −b と近い方の道
  let d = qDot(a, b);
  if (shortest && d < 0) { b = qScl(b, -1); d = -d; }
  d = clampv(d, -1, 1);
  let om = Math.acos(d), so = Math.sin(om);
  if (so < 1e-9) return qUnit(qAdd(qScl(a, 1 - t), qScl(b, t)));        // ほぼ同じ向き → lerp で十分
  return qAdd(qScl(a, Math.sin((1 - t) * om) / so), qScl(b, Math.sin(t * om) / so));
}
function qNlerp(a, b, t, shortest) {   // 正規化した線形補間（まっすぐ結んで |q| = 1 にもどす）
  if (shortest && qDot(a, b) < 0) b = qScl(b, -1);
  return qUnit(qAdd(qScl(a, 1 - t), qScl(b, t)));
}
function qAngle(a, b) {                // 2 つの姿勢の間の回転角（0〜π）。a⁻¹b の角を atan2 で（小さい角でも正確）
  let d = qMul(qConj(qUnit(a)), qUnit(b));
  return 2 * Math.atan2(Math.hypot(d[1], d[2], d[3]), Math.abs(d[0]));
}
function qRandom() {                   // 一様にランダムな単位四元数（S³ の上の点）
  return qUnit([rndNormal(), rndNormal(), rndNormal(), rndNormal()]);
}
function qStr(a, dg) { dg = dg === undefined ? 3 : dg; return '(' + a.map((v) => (Math.abs(v) < 0.5 * Math.pow(10, -dg) ? 0 : v).toFixed(dg)).join(', ') + ')'; }
// ---- 3 次元ベクトルと 3×3 行列
function v3Dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function v3Cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function v3Len(a) { return Math.hypot(a[0], a[1], a[2]); }
function v3Unit(a) { let n = v3Len(a); return n > 1e-300 ? [a[0] / n, a[1] / n, a[2] / n] : [0, 0, 1]; }
function v3Add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function v3Scl(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
function v3Dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }
function matVec(m, v) { return [0, 1, 2].map((r) => m[r][0] * v[0] + m[r][1] * v[1] + m[r][2] * v[2]); }
function matMul(a, b) { return [0, 1, 2].map((r) => [0, 1, 2].map((c) => a[r][0] * b[0][c] + a[r][1] * b[1][c] + a[r][2] * b[2][c])); }
function matT(a) { return [0, 1, 2].map((r) => [0, 1, 2].map((c) => a[c][r])); }
function matDet(a) { return v3Dot(a[0], v3Cross(a[1], a[2])); }
function matOrthoErr(a) {              // |MᵀM − I| の最大成分（回転行列なら 0）
  let m = matMul(matT(a), a), e = 0;
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) e = Math.max(e, Math.abs(m[r][c] - (r === c ? 1 : 0)));
  return e;
}
function matDiff(a, b) { let e = 0; for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) e = Math.max(e, Math.abs(a[r][c] - b[r][c])); return e; }
// ---- 3D を 2D の画面に描く道具（透視投影）。view = { x, y, s, d }（中心・拡大・目までの距離）
//   数学の向き：x 右・y 上・z 手前。回転は全部 q v q* で計算する
function projP(v, view) { let f = view.d / Math.max(0.2, view.d - v[2]); return [view.x + v[0] * view.s * f, view.y - v[1] * view.s * f, v[2]]; }
const BOX_FACES = [[[1, 0, 0], [1, 2, 6, 5]], [[-1, 0, 0], [0, 4, 7, 3]], [[0, 1, 0], [2, 3, 7, 6]], [[0, -1, 0], [0, 1, 5, 4]], [[0, 0, 1], [4, 5, 6, 7]], [[0, 0, -1], [0, 3, 2, 1]]];
const BOX_CORNERS = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
const LIGHT2 = v3Unit([0.4, 0.7, 0.8]);
// 箱を組み合わせた物体を、回転の四元数 q で回して描く（奥の面から順にぬる＝画家のアルゴリズム）
function drawParts2D(parts, q, view, alphaV) {
  let faces = [];
  for (let P of parts) {
    let pts = BOX_CORNERS.map((c) => qRot(q, [P.c[0] + c[0] * P.h[0], P.c[1] + c[1] * P.h[1], P.c[2] + c[2] * P.h[2]]));
    for (let [n, idx] of BOX_FACES) {
      let nw = qRot(q, n), fp = idx.map((t) => pts[t]), cz = fp.reduce((s, p) => s + p[2], 0) / 4;
      let ctr = fp.reduce((s, p) => v3Add(s, v3Scl(p, 0.25)), [0, 0, 0]);
      if (v3Dot(nw, v3Sub2([0, 0, view.d], ctr)) <= 0) continue;            // 裏を向いた面は描かない
      faces.push({ cz, fp, b: 0.42 + 0.58 * Math.max(0, v3Dot(nw, LIGHT2)), col: P.col });
    }
  }
  faces.sort((a, b) => a.cz - b.cz);
  stroke(20, 24, 40, alphaV === undefined ? 120 : alphaV * 0.5); strokeWeight(1);
  for (let f of faces) {
    fill(f.col[0] * f.b, f.col[1] * f.b, f.col[2] * f.b, alphaV === undefined ? 255 : alphaV);
    beginShape(); for (let p of f.fp) { let s = projP(p, view); vertex(s[0], s[1]); } endShape(CLOSE);
  }
}
function v3Sub2(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function line3(a, b, view) { let p = projP(a, view), r = projP(b, view); line(p[0], p[1], r[0], r[1]); }
function drawAxes2D(q, view, L) {      // 回した座標軸（x 赤、y 緑、z 青）
  let cols = [[240, 90, 90], [110, 220, 120], [100, 160, 255]];
  for (let a = 0; a < 3; a++) { let e = [0, 0, 0]; e[a] = L; stroke(...cols[a]); strokeWeight(2.5); line3([0, 0, 0], qRot(q, e), view); }
}
const PLANE_PARTS = [
  { c: [0, 0, 0], h: [0.18, 0.18, 0.9], col: [235, 235, 240] },
  { c: [0, 0, 0.05], h: [1.0, 0.04, 0.26], col: [90, 200, 235] },
  { c: [0, 0.28, -0.72], h: [0.04, 0.26, 0.16], col: [245, 200, 80] },
  { c: [0, 0, -0.75], h: [0.4, 0.03, 0.12], col: [90, 200, 235] },
  { c: [0, 0.02, 0.95], h: [0.1, 0.1, 0.06], col: [240, 110, 90] },
];
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y, g) {       // g = 描く先（省略で画面、WEBGL では HUD のバッファ）
  g = g || window;
  g.noStroke(); g.fill(selfTestResults.every((r) => r.ok) ? g.color(120, 210, 150) : g.color(255, 90, 90));
  g.textSize(14); g.textAlign(LEFT, BASELINE); g.text(selfTestLine(), x, y);
}
