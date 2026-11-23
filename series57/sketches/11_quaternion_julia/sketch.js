// ============================================
// 11 四元数のジュリア集合 ─ z ← z² + c を 4 次元で
// 2 次元のジュリア集合（複素数）と同じ式を四元数で計算すると、4 次元のフラクタルになる。その 3 次元の切り口を描く
// 描き方：距離推定 DE = ½|z| ln|z| / |z'|（表面までの距離の目安）だけ光線を進める「レイマーチング」。小さな画像に少しずつ描いて拡大
// 1〜5：c を選ぶ / ← → c の i 成分 / ↑↓ 切り口（4 つ目の座標）/ ドラッグ：回す / Q：細かさ / スペース：自動で回す
// ============================================

const C_LIST = [[-0.2, 0.8, 0, 0], [-0.125, -0.256, 0.847, 0.0895], [0.185, 0.478, 0.125, -0.392], [-0.291, -0.399, 0.339, 0.437], [-0.45, 0.447, 0.181, 0.306]];   // ★ c の候補
let cq = C_LIST[0].slice(), sliceW = 0;
const MAX_IT = 10;                     // ★ z ← z² + c の回数
const MAX_STEP = 90;                   // ★ 光線を進める回数の上限
const BOUND = 1.7;                     // ★ この半径の球の外には形がないとする
const RES_LIST = [160, 240, 360];      // ★ 描く画像の横の画素数（Q で切りかえ）
let res = 1, img, row = 0, camQ, autoRot = false, dragPrev = null, renderMs = 0, t0;

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); camQ = qMul(qAxisAngle([1, 0, 0], -0.4), qAxisAngle([0, 1, 0], 0.5)); restart(); }
function restart() {                  // 描き直し（大きさが変わったときだけ画像を作り直す。前の絵は上書きされるまで残る）
  let bw = RES_LIST[res], bh = Math.max(2, Math.round((bw * height) / width));
  if (!img || img.width !== bw || img.height !== bh) { img = createImage(bw, bh); img.loadPixels(); for (let o = 0; o < img.pixels.length; o += 4) { img.pixels[o] = img.pixels[o + 1] = 18; img.pixels[o + 2] = 30; img.pixels[o + 3] = 255; } }
  row = 0; t0 = millis(); renderMs = 0;
}
function qSq(z) { return [z[0] * z[0] - z[1] * z[1] - z[2] * z[2] - z[3] * z[3], 2 * z[0] * z[1], 2 * z[0] * z[2], 2 * z[0] * z[3]]; }   // z² = (w² − |v|², 2wv)
function juliaDE(p, c) {               // 3 次元の点 p（切り口の 4 つ目 = sliceW）から表面までの距離の目安
  let z = [p[0], p[1], p[2], sliceW], dz = 1, r = qNorm(z);
  for (let n = 0; n < MAX_IT && r < 4; n++) { dz = 2 * r * dz; z = qAdd(qSq(z), c); r = qNorm(z); }
  return r < 4 ? 0 : (0.5 * r * Math.log(r)) / dz;
}
function march(ro, rd, c) {            // 光線 ro + t rd を DE ずつ進める。当たれば t、なければ −1
  let bq = v3Dot(ro, rd), disc = bq * bq - v3Dot(ro, ro) + BOUND * BOUND;   // 半径 BOUND の球に入らない光線は計算しない
  if (disc < 0) return [-1, 0];
  let t = Math.max(0, -bq - Math.sqrt(disc)), tEnd = -bq + Math.sqrt(disc), steps = 0;
  for (; steps < MAX_STEP; steps++) {
    let p = v3Add(ro, v3Scl(rd, t)), d = juliaDE(p, c);
    if (d < 0.0015 * t) return [t, steps];
    t += d; if (t > tEnd) break;
  }
  return [-1, steps];
}
function shade(p, c, steps) {
  let e = 0.002, k = [[1, -1, -1], [-1, -1, 1], [-1, 1, -1], [1, 1, 1]], nrm = [0, 0, 0];
  for (let v of k) nrm = v3Add(nrm, v3Scl(v, juliaDE(v3Add(p, v3Scl(v, e)), c)));
  nrm = v3Unit(nrm);
  let L = qRot(camQ, v3Unit([0.5, 0.8, 0.6])), dif = Math.max(0, v3Dot(nrm, L)), ao = 1 - steps / MAX_STEP;
  let b = (0.25 + 0.75 * dif) * (0.4 + 0.6 * ao);
  return [b * (180 + 75 * (0.5 + 0.5 * nrm[0])), b * (150 + 90 * (0.5 + 0.5 * nrm[1])), b * (210 + 45 * (0.5 + 0.5 * nrm[2]))];
}

function draw() {
  if (autoRot && row >= img.height) { camQ = qMul(qAxisAngle([0, 1, 0], 0.15), camQ); restart(); }   // 描き終わってから少し回す
  // ---- 時間の予算内で少しずつ行を描く
  let start = millis(), row0 = row, W = img.width, H = img.height, fo = 2.0, ro = qRot(camQ, [0, 0, 3.2]);
  while (row < H && millis() - start < 12) {
    for (let x = 0; x < W; x++) {
      let rd = qRot(camQ, v3Unit([(x - W / 2) / (H / 2), -(row - H / 2) / (H / 2), -fo])), hit = march(ro, rd, cq), col;
      if (hit[0] > 0) col = shade(v3Add(ro, v3Scl(rd, hit[0])), cq, hit[1]);
      else { let g = 18 + 14 * (row / H); col = [g, g + 2, g + 16]; }
      let o = 4 * (row * W + x); img.pixels[o] = col[0]; img.pixels[o + 1] = col[1]; img.pixels[o + 2] = col[2]; img.pixels[o + 3] = 255;
    }
    row++;
  }
  if (row >= H && renderMs === 0) renderMs = millis() - t0;
  if (row > row0 || frameCount < 3) img.updatePixels();   // 新しく描いた行があるときだけ
  background(0); image(img, 0, 0, width, height);
  if (row < H) { stroke(255, 200, 80); strokeWeight(2); let y = (row / H) * height; line(0, y, width, y); }
  noStroke(); fill(0, 0, 0, 150); rect(0, 0, width, 100);
  fill(240); textSize(20); textAlign(LEFT, BASELINE);
  text('四元数のジュリア集合　z ← z² + c、c = ' + qStr(cq, 3) + '、切り口 4 つ目 = ' + sliceW.toFixed(2), 20, 36);
  fill(175); textSize(15);
  text('1〜5：c　← → c の i 成分　↑↓ 切り口　ドラッグ：回す　Q：細かさ（いま 横 ' + RES_LIST[res] + ' 画素）　スペース：自動で回す', 20, 62);
  text(row < H ? '描いている… ' + Math.round((100 * row) / H) + '%' : '描き終わり（' + W + ' × ' + H + ' 画素、' + (renderMs / 1000).toFixed(1) + ' 秒）', 20, 86);
  drawSelfTest(width - 170, height - 12);
}

function mousePressed() { dragPrev = [mouseX, mouseY]; }
function mouseDragged() {
  if (!dragPrev) return;
  let dx = mouseX - dragPrev[0], dy = mouseY - dragPrev[1];
  if (Math.abs(dx) + Math.abs(dy) > 0) { camQ = qUnit(qMul(qMul(qAxisAngle([0, 1, 0], -dx * 0.008), camQ), qAxisAngle([1, 0, 0], -dy * 0.008))); restart(); }
  dragPrev = [mouseX, mouseY];
}
function mouseReleased() { dragPrev = null; }
function keyPressed() {
  if (key >= '1' && key <= '5') cq = C_LIST[+key - 1].slice();
  if (key === RIGHT_ARROW) cq[1] = Math.min(1.2, cq[1] + 0.02);
  if (key === LEFT_ARROW) cq[1] = Math.max(-1.2, cq[1] - 0.02);
  if (key === UP_ARROW) sliceW = Math.min(1, sliceW + 0.05);
  if (key === DOWN_ARROW) sliceW = Math.max(-1, sliceW - 0.05);
  if (key === 'q' || key === 'Q') res = (res + 1) % 3;
  if (key === ' ') autoRot = !autoRot;
  restart();
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = []; seedRng(11);
  let e1 = 0, e2 = 0, e6 = 0;
  for (let t = 0; t < 100; t++) {
    let z = [rndNormal(), rndNormal(), rndNormal(), rndNormal()];
    e1 = Math.max(e1, qDist(qSq(z), qMul(z, z)));
    let a = rndNormal(), b = rndNormal(), s = qSq([a, b, 0, 0]); e6 = Math.max(e6, Math.abs(s[0] - (a * a - b * b)), Math.abs(s[1] - 2 * a * b), Math.abs(s[2]) + Math.abs(s[3]));
  }
  check('z² = (w² − |v|², 2wv) = qMul(z, z)', e1 < 1e-12);
  check('(1, i) の平面では複素数の z² と同じ → 2 次元のジュリア集合はこの切り口', e6 < 1e-12);
  let sw = sliceW, ok3 = true; sliceW = 0;
  for (let t = 0; t < 50; t++) {
    let r = 1.05 + 2.9 * rnd(), u = v3Unit([rndNormal(), rndNormal(), rndNormal()]), d = juliaDE(v3Scl(u, r), [0, 0, 0, 0]);
    e2 = Math.max(e2, Math.abs(d - 0.5 * r * Math.log(r)));
    if (d > r - 1 + 1e-12) ok3 = false;
  }
  check('c = 0（集合は単位球）：DE = ½ r ln r（差 ' + e2.toExponential(1) + '）', e2 < 1e-12);
  check('c = 0：DE は本当の距離 r − 1 をこえない（1 < r ≤ 4）→ 光線が表面を飛びこさない', ok3);
  let hit = march([0, 0, 3.2], [0, 0, -1], [0, 0, 0, 0]);
  check('c = 0 で正面から光線を進めると t ≈ 2.2（半径 1 の球の表面）に当たる：t = ' + hit[0].toFixed(4), Math.abs(hit[0] - 2.2) < 0.01);
  check('遠くの点（|p| = 3）はどの c でも逃げる（DE > 0）、c = 0 の原点は逃げない', C_LIST.every((c) => juliaDE([3, 0, 0], c) > 0 && juliaDE([0, 3, 0], c) > 0) && juliaDE([0, 0, 0], [0, 0, 0, 0]) === 0);
  sliceW = sw;
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 1〜5 で c を変えよう。どれがつながった形？ ばらばらの形？（2 次元のジュリア集合と同じく c で決まる）
// 2. ↑↓ で切り口を動かすと、4 次元の形の別の断面が見える。CT スキャンのように 1 枚ずつ
// 3. C_LIST に [−1, 0, 0, 0] を足すと？（2 次元の「サンマルコ」の形を回したような立体）
// 4. MAX_IT を 6 や 16 に変えると、形と描く時間はどう変わる？
// 5. qSq の代わりに qMul(qMul(z, z), z)（z³）にすると、別のフラクタルになる（DE の 0.5 と 2 も直す）


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
