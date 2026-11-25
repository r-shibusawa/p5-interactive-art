// ============================================
// 13 球に乗せた分布 ─ p → 2√p（各成分の平方根を 2 倍）で、確率の三角形が半径 2 の球の 1/8 に乗る
// この球の上の距離（大円の長さ）がフィッシャー-ラオ距離 d = 2·arccos(Σ√(p_i q_i))。フィッシャー計量で測った本当の最短距離
// 三角形の中のまっすぐ（m-測地線、白い点線）は球の上では遠回り。KL・ヘリンジャー・全変動と比べる
// （「土を運ぶ量」で測る輸送距離（ワッサースタイン距離）は、また別の幾何）
// ドラッグ 視点を回す / 左下の三角形の中をドラッグ p（オレンジ）・q（紫）/ 1 2 3 お手本 / R でたらめ / スペース 自動回転
// ============================================

const SC = 140;                          // ★ 1 の長さ（ピクセル）
const MESH_N = 24;                       // ★ 球の 1/8 を何分割で描くか
let pA = [0.7, 0.2, 0.1], qA = [0.1, 0.3, 0.6], hud, hudDirty = true, spin = true, spinT = 0, rotY = -Math.PI / 4, inset, frI, grab = null;

function setup() { createCanvas(windowWidth, windowHeight, WEBGL); hud = createGraphics(width, height); selfTest(); layout(); }
function windowResized() { resizeCanvas(windowWidth, windowHeight); hud.remove(); hud = createGraphics(width, height); layout(); }
function layout() { inset = { x: 20, y: height - 290, w: 300, h: 270 }; frI = simplexFrame(inset.x + 150, inset.y + 160, 230); hudDirty = true; }
function toSphere(p) { return p.map((v) => 2 * Math.sqrt(Math.max(0, v))); }                 // ★ p → 2√p（長さはいつも 2）
function fromSphere(v) { return v.map((c) => (c * c) / 4); }
function slerp(a, b, t) {                // 大円に沿って a から b へ（球の上のまっすぐ）
  let c = clampv((a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / 4, -1, 1), om = Math.acos(c);
  if (om < 1e-12) return a.slice();
  return a.map((v, i) => (Math.sin((1 - t) * om) * v + Math.sin(t * om) * b[i]) / Math.sin(om));
}
function polyLen(pts) { let L = 0; for (let k = 1; k < pts.length; k++) L += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1], pts[k][2] - pts[k - 1][2]); return L; }
function geoPath(p, q, n) { let a = toSphere(p), b = toSphere(q), out = []; for (let k = 0; k <= n; k++) out.push(slerp(a, b, k / n)); return out; }
function mPathOnSphere(p, q, n) { let out = []; for (let k = 0; k <= n; k++) out.push(toSphere(mixM(p, q, k / n))); return out; }
function surfV(i, j) {                  // 球の面の 1 頂点（三角形の格子の点 → 球）
  let p = [i / MESH_N, j / MESH_N, 1 - (i + j) / MESH_N], h = entropyH(p) / Math.log(3), v = v3(toSphere(p));
  fill(40 + 110 * h, 62 + 70 * h, 105 + 50 * h); vertex(v[0], v[1], v[2]);
}
function v3(v) { return [v[0] * SC, -v[2] * SC, v[1] * SC]; }     // (x, y, z) の画面の向き：3 番目の結果を上に

function draw() {
  background(...BG);
  let overInset = inRect(mouseX, mouseY, inset);
  if (!overInset && !grab) orbitControl();
  if (spin) { spinT += 0.008; rotY = -Math.PI / 4 + 0.6 * Math.sin(spinT); }   // 外側（ふくらんだ側）から見る向きで左右にゆれる
  rotateX(-0.55); rotateY(rotY); translate(-0.9 * SC, 0.9 * SC, -0.9 * SC);
  // ---- 球の 1/8（色 = エントロピー：明るいほど大きい）
  noLights(); noStroke(); beginShape(TRIANGLES);
  for (let i = 0; i < MESH_N; i++) for (let j = 0; j < MESH_N - i; j++) {
    surfV(i, j); surfV(i + 1, j); surfV(i, j + 1);
    if (i + j + 2 <= MESH_N) { surfV(i + 1, j); surfV(i + 1, j + 1); surfV(i, j + 1); }
  }
  endShape();
  // ---- 格子（p_i = 一定 の線）と軸
  strokeWeight(1); noFill();
  for (let c = 0; c < 3; c++) { stroke(...OUTC[c], 150); for (let k = 1; k < 10; k++) { beginShape(); for (let j = 0; j <= 24; j++) { let p = [0, 0, 0], a = k / 10, s = ((1 - a) * j) / 24; p[c] = a; p[(c + 1) % 3] = s; p[(c + 2) % 3] = 1 - a - s; let v = v3(toSphere(p).map((x) => x * 1.003)); vertex(v[0], v[1], v[2]); } endShape(); } }
  for (let c = 0; c < 3; c++) { let e = [0, 0, 0]; e[c] = 2.4; let v = v3(e); stroke(...OUTC[c]); strokeWeight(2); line(0, 0, 0, v[0], v[1], v[2]); }
  // ---- 大円（測地線）と、三角形のまっすぐの像
  let g = geoPath(pA, qA, 60), m = mPathOnSphere(pA, qA, 60);
  stroke(...LIME); strokeWeight(4); beginShape(); for (let P of g) { let v = v3(P.map((c) => c * 1.004)); vertex(v[0], v[1], v[2]); } endShape();
  stroke(...INK); strokeWeight(2); for (let k = 0; k < m.length - 1; k += 2) { let a = v3(m[k].map((c) => c * 1.004)), b = v3(m[k + 1].map((c) => c * 1.004)); line(a[0], a[1], a[2], b[0], b[1], b[2]); }
  noStroke();
  for (let [P, col] of [[pA, ORANGE], [qA, VIOLET]]) { let v = v3(toSphere(P).map((c) => c * 1.01)); push(); translate(v[0], v[1], v[2]); fill(...col); sphere(7); pop(); }
  drawHud();
}
function drawHud() {
  if (hudDirty) {
    hudDirty = false;
    let h = hud, bc = bhatta(pA, qA), fr = fisherRao(pA, qA), arc = polyLen(geoPath(pA, qA, 4000)), ml = polyLen(mPathOnSphere(pA, qA, 4000));
    h.clear(); h.noStroke(); h.textAlign(LEFT, BASELINE);
    h.fill(...INK); h.textSize(22); h.text('球に乗せた分布：p → 2√p とフィッシャー-ラオ距離', 30, 38);
    h.fill(...DIMC); h.textSize(14); h.text('ドラッグ 視点　左下の三角形でドラッグ p・q　1 2 3 お手本　R でたらめ　スペース 自動回転 ' + (spin ? 'ON' : 'OFF'), 30, 62);
    let x = width - 400; h.textSize(15);
    h.fill(...ORANGE); h.text('p = ' + fmtP(pA, 3), x, 110); h.fill(...VIOLET); h.text('q = ' + fmtP(qA, 3), x, 132);
    h.fill(...LIME); h.text('フィッシャー-ラオ d = 2 arccos(Σ√pq) = ' + fmtN(fr, 5), x, 166);
    h.text('大円の長さ（4000 分割の和）= ' + fmtN(arc, 5), x, 188);
    h.fill(...INK); h.text('三角形のまっすぐの像の長さ = ' + fmtN(ml, 5) + '（遠回り）', x, 214);
    h.fill(...DIMC); h.textSize(14);
    h.text('弦の長さ 2|√p − √q| = ' + fmtN(2 * Math.sqrt(hellingerSq(pA, qA)), 4) + ' = 4 sin(d/4)', x, 246);
    h.text('ヘリンジャー Σ(√p − √q)² = ' + fmtN(hellingerSq(pA, qA), 4), x, 268);
    h.text('KL(p‖q) = ' + fmtN(divKL(pA, qA), 4) + '、KL(q‖p) = ' + fmtN(divKL(qA, pA), 4), x, 290);
    h.text('全変動 ½Σ|p − q| = ' + fmtN(tvDist(pA, qA), 4), x, 312);
    h.text('近い所では KL ≈ d²/2 ≈ ½Σ dp²/p（01 と同じ計量）', x, 342);
    h.text('d の最大は π（2 つの頂点の間 = 球の 1/4 周）', x, 364);
    // 左下：三角形（p, q を動かす）と、球の大円を三角形にもどした曲線
    h.fill(...PANEL); h.rect(inset.x, inset.y, inset.w, inset.h, 10);
    h.noFill(); h.stroke(...INK, 160); h.strokeWeight(1.2); h.triangle(...frI.v[0], ...frI.v[1], ...frI.v[2]);
    let curve2 = geoPath(pA, qA, 60).map(fromSphere);
    h.stroke(...LIME); h.strokeWeight(2.5); h.beginShape(); for (let P of curve2) h.vertex(...baryToXY(frI, P)); h.endShape();
    h.stroke(...INK); h.strokeWeight(1); h.drawingContext.setLineDash([4, 4]); h.line(...baryToXY(frI, pA), ...baryToXY(frI, qA)); h.drawingContext.setLineDash([]);
    h.noStroke(); h.fill(...ORANGE); h.circle(...baryToXY(frI, pA), 13); h.fill(...VIOLET); h.circle(...baryToXY(frI, qA), 13);
    h.fill(...DIMC); h.textSize(12); h.text('緑 = 球の大円を三角形にもどした道', inset.x + 10, inset.y + 20);
    h.fill(...(selfTestOk() ? LIME : ROSE)); h.textSize(14); h.text(selfTestLine(), width - 180, height - 14);
  }
  drawingContext.clear(drawingContext.DEPTH_BUFFER_BIT);
  push(); resetMatrix(); noLights(); noStroke(); image(hud, -width / 2, -height / 2, width, height); pop();
}
function mousePressed() {
  grab = null;
  if (!inRect(mouseX, mouseY, inset)) return;
  let [px, py] = baryToXY(frI, pA), [qx, qy] = baryToXY(frI, qA);
  grab = dist(mouseX, mouseY, px, py) < dist(mouseX, mouseY, qx, qy) ? 'p' : 'q'; mouseDragged();
}
function mouseDragged() {
  if (!grab) return;
  let P = clampSimplex(xyToBary(frI, mouseX, mouseY), 0.001);
  if (grab === 'p') pA = P; else qA = P;
  hudDirty = true;
}
function mouseReleased() { grab = null; }
function keyPressed() {
  if (key === '1') { pA = [0.98, 0.01, 0.01]; qA = [0.01, 0.98, 0.01]; }
  if (key === '2') { pA = [0.34, 0.33, 0.33]; qA = [0.4, 0.3, 0.3]; }
  if (key === '3') { pA = [0.5, 0.49, 0.01]; qA = [0.01, 0.49, 0.5]; }
  if (key === 'r' || key === 'R') { pA = rndDist(3, 0.01); qA = rndDist(3, 0.01); }
  if (key === ' ') spin = !spin;
  hudDirty = true;
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(1313); let okArc = true, okOn = true, okBack = true, okChord = true, okShort = true;
  for (let k = 0; k < 50; k++) {
    let p = rndDist(3, 1e-3), q = rndDist(3, 1e-3), d = fisherRao(p, q), g = geoPath(p, q, 3000);
    if (Math.abs(polyLen(g) - d) > 1e-6) okArc = false;
    for (let P of g) { if (Math.abs(Math.hypot(...P) - 2) > 1e-12) okOn = false; if (Math.abs(fromSphere(P).reduce((s, v) => s + v, 0) - 1) > 1e-12) okBack = false; }
    let a = toSphere(p), b = toSphere(q);
    if (Math.abs(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) - 4 * Math.sin(d / 4)) > 1e-12) okChord = false;
    if (polyLen(mPathOnSphere(p, q, 3000)) < d - 1e-9) okShort = false;
  }
  check('d = 2 arccos(Σ√pq) = 球の大円の長さ（3000 分割、50 組、誤差 1e-6）', okArc);
  check('大円の上の点はどれも半径 2 の球の上、もどすと合計 1 の分布', okOn && okBack);
  check('弦の長さ 2|√p − √q| = 4 sin(d/4)（誤差 1e-12）', okChord);
  check('三角形のまっすぐ（m-測地線）の像は大円より長い（50 組）', okShort);
  let okTri = true, klBad = 0;
  for (let k = 0; k < 1000; k++) {
    let a = rndDist(3), b = rndDist(3), c = rndDist(3);
    if (fisherRao(a, c) > fisherRao(a, b) + fisherRao(b, c) + 1e-12) okTri = false;
    if (divKL(a, c) > divKL(a, b) + divKL(b, c) + 1e-12) klBad++;
  }
  check('1000 組で三角不等式：フィッシャー-ラオはいつも成立、KL は ' + klBad + ' 組で破れる', okTri && klBad > 0);
  check('頂点どうしの距離 = π（最大）、同じ点は 0、向きによらない', Math.abs(fisherRao([1, 0, 0], [0, 1, 0]) - Math.PI) < 1e-12 && fisherRao(pA, pA) < 1e-6 && Math.abs(fisherRao(pA, qA) - fisherRao(qA, pA)) < 1e-15);
  let p = [0.5, 0.3, 0.2], e = 1e-4, dp = [e, -2 * e, e], q = p.map((v, i) => v + dp[i]), d = fisherRao(p, q), fi = dp.reduce((s, v, i) => s + (v * v) / p[i], 0);
  check('近くでは d² ≈ Σ dp²/p（フィッシャー計量、相対誤差 1e-3）', Math.abs((d * d) / fi - 1) < 1e-3);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 1 のお手本（頂点どうし）で d = π に近いことを確かめよう。KL はどうなる？
// 2. 2 のお手本（まん中の近く）で、大円とまっすぐはほとんど同じ。三角形の辺の近くでは？
// 3. なぜ 2√p？ √p にすると半径 1 の球になる。距離の公式はどう変わる？
// 4. 4 つの結果なら 4 次元の球の 1/16。どう描けばいい？
// 5. 球の上の「等距離の円」（p から距離 0.5 の分布）を三角形に描くと、どんな形？

// ==================================================
// ここから下は「情報幾何の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 色と小さな道具（等高線地図の色）
const BG = [22, 33, 52];                // 背景（深いスレートブルー）
const INK = [240, 236, 226];            // 文字（紙の白）
const ORANGE = [255, 150, 75], VIOLET = [170, 140, 255], TEAL = [95, 205, 190], ROSE = [255, 110, 125], LIME = [150, 225, 120], SAND = [235, 210, 150];
const DIMC = [140, 152, 175], PANEL = [32, 46, 70], WIRE = [62, 80, 110];
const OUTC = [[255, 150, 75], [95, 205, 190], [170, 140, 255], [235, 210, 150], [255, 110, 125], [150, 225, 120], [120, 175, 255], [230, 140, 210]];   // 結果ごとの色
function clampv(v, a, b) { return v < a ? a : v > b ? b : v !== v ? a : v; }     // NaN なら a に戻す
function fmtN(v, d) { if (typeof v !== 'number' || v !== v) return '?'; if (!isFinite(v)) return v > 0 ? '∞' : '−∞'; return v.toFixed(d === undefined ? 2 : d); }
function fmtP(p, d) { return '(' + p.map((v) => fmtN(v, d === undefined ? 2 : d)).join(', ') + ')'; }
function hudTitle(t, sub) {              // 左上のタイトルと操作の説明
  noStroke(); fill(...INK); textSize(22); textAlign(LEFT, BASELINE); text(t, 30, 38);
  fill(...DIMC); textSize(14); textLeading(19); text(sub, 30, 62);
}
function inRect(x, y, r) { return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; }
function drawField(f) { if (f) image(f.img, f.x, f.y, f.w, f.h); }   // 等高線の地図（画像）を描く
function freeField(f) { if (f && f.img) f.img.remove(); }
// ---- 種つきの乱数（同じ種なら毎回同じ列 → 実験をくり返せる）
let rngState = 1;
function seedRng(s) { rngState = (s >>> 0) || 1; }
function rnd() {                       // 0〜1 の一様乱数（mulberry32）
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function gaussRnd() { let u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }   // 標準正規分布（ボックス-ミュラー法）
function rndDist(k, floor) {            // でたらめな確率分布（k 個、どれも floor 以上）
  let p = []; for (let i = 0; i < k; i++) p.push(-Math.log(1 - rnd()) + 1e-9);
  return mixFloor(normP(p), floor || 0);
}
function sampleIndex(p) { let u = rnd(), c = 0; for (let i = 0; i < p.length; i++) { c += p[i]; if (u < c) return i; } return p.length - 1; }
// ---- 情報の道具：確率分布 p = [p1, p2, ...]（合計 1）。log(0) は 0·log 0 = 0 として扱う
const TINY = 1e-300;
function normP(p) { let s = 0; for (let v of p) s += Math.max(0, v); if (!(s > 0)) return p.map(() => 1 / p.length); return p.map((v) => Math.max(0, v) / s); }
function mixFloor(p, f) { if (!f) return p; return normP(p.map((v) => Math.max(v, f))); }   // どの確率も f 以上に（0 を避ける）
function safeLog(v) { return Math.log(Math.max(v, TINY)); }
function entropyH(p) { let h = 0; for (let v of p) if (v > 0) h -= v * Math.log(v); return h; }           // エントロピー（ナット）
function divKL(p, q) {                  // KL ダイバージェンス D(p‖q)（ナット）。q が 0 で p > 0 なら ∞
  let d = 0;
  for (let i = 0; i < p.length; i++) { if (p[i] <= 0) continue; if (q[i] <= 0) return Infinity; d += p[i] * Math.log(p[i] / q[i]); }
  return Math.max(0, d);
}
function crossH(p, q) { let h = 0; for (let i = 0; i < p.length; i++) if (p[i] > 0) h -= p[i] * safeLog(q[i]); return h; }  // 交差エントロピー
function bhatta(p, q) { let s = 0; for (let i = 0; i < p.length; i++) s += Math.sqrt(Math.max(0, p[i] * q[i])); return Math.min(1, s); }
function fisherRao(p, q) { return 2 * Math.acos(clampv(bhatta(p, q), -1, 1)); }                          // フィッシャー-ラオ距離 = 球の大円の長さ
function hellingerSq(p, q) { let s = 0; for (let i = 0; i < p.length; i++) { let d = Math.sqrt(p[i]) - Math.sqrt(q[i]); s += d * d; } return s; }   // Σ(√p − √q)²
function tvDist(p, q) { let s = 0; for (let i = 0; i < p.length; i++) s += Math.abs(p[i] - q[i]); return s / 2; }
function alphaDiv(p, q, a) {            // α-ダイバージェンス（甘利の流儀）。α → −1 で D(p‖q)、α → +1 で D(q‖p)
  if (Math.abs(a + 1) < 1e-12) return divKL(p, q);
  if (Math.abs(a - 1) < 1e-12) return divKL(q, p);
  let s = 0, ea = (1 - a) / 2, eb = (1 + a) / 2;
  for (let i = 0; i < p.length; i++) s += Math.pow(Math.max(p[i], 0), ea) * Math.pow(Math.max(q[i], 0), eb);
  return Math.max(0, (4 / (1 - a * a)) * (1 - s));
}
function mixM(p, q, t) { return p.map((v, i) => (1 - t) * v + t * q[i]); }                       // m-測地線：確率をそのまま混ぜる
function mixE(p, q, t) { return normP(p.map((v, i) => Math.exp((1 - t) * safeLog(v) + t * safeLog(q[i])))); }   // e-測地線：対数で混ぜて正規化
function mixAlpha(p, q, t, a) {         // α-測地線：u^((1−α)/2) で混ぜて正規化（α = −1 は m、α = +1 は e）
  if (Math.abs(a - 1) < 1e-9) return mixE(p, q, t);
  let ex = (1 - a) / 2;
  return normP(p.map((v, i) => Math.pow((1 - t) * Math.pow(v, ex) + t * Math.pow(q[i], ex), 1 / ex)));
}
function bitsOf(nat) { return nat / Math.LN2; }
// ---- 確率の三角形（3 つの結果）：頂点 1 = 左下、2 = 右下、3 = 上。点 = 確率で重みをつけた頂点の平均（重心座標）
function simplexFrame(cx, cy, side) {
  let h = (side * Math.sqrt(3)) / 2;
  return { cx, cy, side, v: [[cx - side / 2, cy + h / 3], [cx + side / 2, cy + h / 3], [cx, cy - (2 * h) / 3]] };
}
function baryToXY(fr, p) { let x = 0, y = 0; for (let i = 0; i < 3; i++) { x += p[i] * fr.v[i][0]; y += p[i] * fr.v[i][1]; } return [x, y]; }
function xyToBary(fr, x, y) {           // 画面の点 → (p1, p2, p3)（三角形の外なら一番近い所へ寄せる）
  let [a, b, c] = fr.v, det = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
  let l1 = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / det;
  let l2 = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / det;
  return [l1, l2, 1 - l1 - l2];
}
function clampSimplex(p, f) { return mixFloor(normP(p), f === undefined ? 0.002 : f); }
function drawSimplexFrame(fr, names) {  // 三角形のふちと頂点の名前
  noFill(); stroke(...INK, 170); strokeWeight(1.5);
  triangle(fr.v[0][0], fr.v[0][1], fr.v[1][0], fr.v[1][1], fr.v[2][0], fr.v[2][1]);
  noStroke(); textSize(13); textAlign(CENTER, CENTER);
  let off = [[-16, 14], [16, 14], [0, -16]];
  for (let i = 0; i < 3; i++) { fill(...OUTC[i]); text(names ? names[i] : '結果 ' + (i + 1), fr.v[i][0] + off[i][0], fr.v[i][1] + off[i][1]); }
}
function simplexPath(fr, ps, col, w) {  // 分布の列を三角形の上の折れ線に（空なら何もしない）
  if (!ps || ps.length < 2) return;
  noFill(); stroke(...col); strokeWeight(w || 2.5); beginShape();
  for (let p of ps) { let [x, y] = baryToXY(fr, p); vertex(x, y); }
  endShape(); noStroke();
}
function simplexDot(fr, p, col, r, name) {
  let [x, y] = baryToXY(fr, p);
  stroke(...BG); strokeWeight(2); fill(...col); circle(x, y, r || 14);
  if (name) { noStroke(); fill(...col); textSize(15); textAlign(LEFT, CENTER); text(name, x + 10, y - 10); }
}
// ★ 等高線の地図：三角形の中の各点で fn(p) を計算し、levels の間隔で色の帯と線を描いた画像を作る（半分の解像度）
function simplexField(fr, fn, opt) {
  opt = opt || {};
  let pad = 4, x0 = Math.min(fr.v[0][0], fr.v[2][0]) - pad, y0 = fr.v[2][1] - pad, w = fr.side + 2 * pad, h = fr.v[0][1] - fr.v[2][1] + 2 * pad;
  let res = opt.res || 2, gw = Math.ceil(w / res), gh = Math.ceil(h / res);
  let g = createGraphics(gw, gh); g.pixelDensity(1); g.loadPixels();
  let vals = new Float64Array(gw * gh).fill(NaN), lv = opt.level || 0.1, vmax = opt.vmax || 1, c0 = opt.c0 || [40, 60, 95], c1 = opt.c1 || ORANGE;
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    let b = xyToBary(fr, x0 + (i + 0.5) * res, y0 + (j + 0.5) * res);
    if (b[0] < 0 || b[1] < 0 || b[2] < 0) continue;
    vals[j * gw + i] = fn(b.map((v) => Math.max(v, 1e-12)));
  }
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    let k = j * gw + i, v = vals[k], o = 4 * k;
    if (v !== v) { g.pixels[o + 3] = 0; continue; }
    let band = Math.floor(Math.min(v, vmax * 4) / lv), t = clampv(v / vmax, 0, 1), sh = band % 2 ? 0.9 : 1;
    let edge = false, cap = opt.cap || Infinity;   // cap より大きい所には線を描かない（線が混みすぎるので）
    if (v < cap && i + 1 < gw && vals[k + 1] === vals[k + 1] && Math.floor(Math.min(vals[k + 1], vmax * 4) / lv) !== band) edge = true;
    if (v < cap && j + 1 < gh && vals[k + gw] === vals[k + gw] && Math.floor(Math.min(vals[k + gw], vmax * 4) / lv) !== band) edge = true;
    for (let c = 0; c < 3; c++) g.pixels[o + c] = edge ? 245 : (c0[c] + (c1[c] - c0[c]) * t) * sh;
    g.pixels[o + 3] = edge ? 200 : 255;
  }
  g.updatePixels();
  return { img: g, x: x0, y: y0, w: gw * res, h: gh * res };
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestOk() { return selfTestResults.every((r) => r.ok); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(...(selfTestOk() ? LIME : ROSE)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
