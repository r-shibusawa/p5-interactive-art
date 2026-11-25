// ============================================
// 02 カバーの定理と線形分離の容量 ─ N 個の点の色分けは 2^N 通り。そのうち 1 本の直線（超平面）で分けられるのは何通り？
// カバー（1965）：点が「一般の位置」（平面なら 3 点が一直線に並ばない）なら、ちょうど C(N, d) = 2 Σ_{k=0}^{d−1} (N−1 k) 通り
//   d = 重みの数（バイアスを含む）。平面の直線 w1 x + w2 y + w3 なら d = 3。N = 4 なら 16 通り中 14 通り（XOR の 2 通りがだめ）
// 割合 C(N, d)/2^N は、N ≤ d なら 1、N = 2d でちょうど 1/2、それより多いと急に 0 へ → 「容量」は重み 1 個あたり 2 点
// 下の小さな絵が 2^N 通りの色分け（明るいふち = 直線で分けられる）。総当たりで数えて、式と比べる
// クリック 点を置く / ドラッグ 動かす / ↑↓ 点の数 N（並べ直し）/ R ランダムに置き直す / L 一直線に並べる / マウスを小さな絵に 分け方を見る
// ============================================

const DIM_D = 3;                         // 平面の直線の重みの数（x, y, バイアス）
let cpts = [], sepMask = [], sepLine = [], nSep = 0, colli = false, dragIdx = -1, hoverMask = -1, seedP = 1, thumbBuf = null, thumbDirty = true;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  randomPoints(5);
}

// ★ カバーの式（整数で）：C(N, d) = 2 Σ_{k=0}^{d−1} binom(N−1, k)
function binomInt(n, k) { if (k < 0 || k > n) return 0; let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return Math.round(r); }
function coverCount(n, d) { if (n <= 0) return 1; let s = 0; for (let k = 0; k < d; k++) s += binomInt(n - 1, k); return 2 * s; }
// 割合 C(N, d)/2^N = P(2 項分布 Bin(N−1, 1/2) ≤ d − 1)（大きな N でもあふれないよう対数で）
function coverFrac(n, d) {
  if (n <= d) return 1;
  let lp = (n - 1) * Math.log(0.5), s = 0;      // k = 0 の確率
  for (let k = 0; k < d; k++) { s += Math.exp(lp); lp += Math.log((n - 1 - k) / (k + 1)); }
  return Math.min(1, s);
}
// ★ 総当たり：マスク m（ビット i が 1 = 点 i はマゼンタ）が直線で分けられるか。
//   分ける向きの範囲のはしは「2 点を通る直線」の向きなので、その向きを ±ε 回した法線を全部ためす（一直線の配置でも正しい）
function separable(ps, m) {
  let n = ps.length;
  if (m === 0 || m === (1 << n) - 1) return { ok: true, nrm: [0, 1], thr: -10 };
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    let dx = ps[j][0] - ps[i][0], dy = ps[j][1] - ps[i][1], a0 = Math.atan2(dx, -dy);
    for (let da of [1e-7, -1e-7, Math.PI + 1e-7, Math.PI - 1e-7]) {
      let nx = Math.cos(a0 + da), ny = Math.sin(a0 + da), lo1 = Infinity, hi0 = -Infinity;
      for (let k = 0; k < n; k++) { let s = nx * ps[k][0] + ny * ps[k][1]; if ((m >> k) & 1) lo1 = Math.min(lo1, s); else hi0 = Math.max(hi0, s); }
      if (hi0 < lo1 - 1e-12) return { ok: true, nrm: [nx, ny], thr: (hi0 + lo1) / 2 };
    }
  }
  return { ok: false };
}
// もう 1 つの数え方：2 点 i, j を通る直線で残りを分け、i, j の色は 4 通りを全部（一般の位置で使える）
function countByPairs(ps) {
  let n = ps.length, set = new Set([0, (1 << n) - 1]);
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    let base = 0, rest = 0;
    for (let k = 0; k < n; k++) if (k !== i && k !== j) { rest |= 1 << k; if (crossOf(ps[i], ps[j], ps[k]) > 0) base |= 1 << k; }
    for (let side of [base, rest & ~base]) for (let a = 0; a < 4; a++) set.add(side | ((a & 1) << i) | ((a >> 1) << j));   // 左右どちらをマゼンタにしても
  }
  return set.size;
}
function crossOf(a, b, c) { return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]); }
function hasCollinear(ps) { for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) for (let k = j + 1; k < ps.length; k++) if (Math.abs(crossOf(ps[i], ps[j], ps[k])) < 2e-3) return true; return false; }
function countSeparable(ps) { let c = 0; for (let m = 0; m < 1 << ps.length; m++) if (separable(ps, m).ok) c++; return c; }

function analyze() {
  let n = cpts.length; sepMask = []; sepLine = []; nSep = 0;
  for (let m = 0; m < 1 << n; m++) { let r = separable(cpts, m); sepMask.push(r.ok); sepLine.push(r); if (r.ok) nSep++; }
  colli = hasCollinear(cpts); thumbDirty = true;
}
function randomPoints(n) { seedRng(300 + seedP); cpts = []; for (let i = 0; i < n; i++) cpts.push([0.1 + 0.8 * rnd(), 0.1 + 0.8 * rnd()]); analyze(); }

function draw() {
  background(...BG);
  let n = cpts.length, cf = coverCount(n, DIM_D);
  hudTitle('カバーの定理：N = ' + n + ' 点、直線（d = 3）で分けられる色分け ' + nSep + ' / ' + (1 << n) + '　式 C(' + n + ', 3) = ' + cf + (nSep === cf ? ' ✓ 一致' : '（一般の位置でないので少ない）'),
    'クリック 点を置く（9 点まで）　ドラッグ 動かす　↑↓ 点の数 N　R 置き直す　L 一直線に並べる　マウスを下の小さな絵に → その色分けと直線');
  // ---- 左上：点
  let side = Math.min(320, height * 0.42), bx = { x: 30, y: 90, w: side };
  noStroke(); fill(...PANEL); rect(bx.x, bx.y, side, side);
  let hm = hoverMask >= 0 && hoverMask < 1 << n ? hoverMask : -1;
  if (hm >= 0 && sepLine[hm] && sepLine[hm].ok && hm !== 0 && hm !== (1 << n) - 1) {
    let r = sepLine[hm], nx = r.nrm[0], ny = r.nrm[1], c = r.thr, ends = [];
    for (let t of [-2, 2]) ends.push([c * nx - t * ny, c * ny + t * nx]);
    stroke(...AMBER); strokeWeight(2); drawingContext.save(); drawingContext.beginPath(); drawingContext.rect(bx.x, bx.y, side, side); drawingContext.clip();
    line(bx.x + ends[0][0] * side, bx.y + (1 - ends[0][1]) * side, bx.x + ends[1][0] * side, bx.y + (1 - ends[1][1]) * side); drawingContext.restore();
  }
  cpts.forEach((p, i) => { stroke(10); strokeWeight(1); fill(...(hm >= 0 ? ((hm >> i) & 1 ? MAG : LIME) : INK)); circle(bx.x + p[0] * side, bx.y + (1 - p[1]) * side, 16); });
  noStroke(); textSize(14); textAlign(LEFT, BASELINE);
  if (colli) { fill(...AMBER); text('⚠ 3 点がほぼ一直線上 → 一般の位置ではない。式より少なくなる', bx.x, bx.y + side + 22); }
  else { fill(...SUB); text('一般の位置（どの 3 点も一直線上にない）', bx.x, bx.y + side + 22); }
  if (hm >= 0) { fill(...(sepMask[hm] ? LIME : MAG)); text('色分け #' + hm + '：' + (sepMask[hm] ? '直線で分けられる（オレンジの線）' : '直線では分けられない'), bx.x, bx.y + side + 44); }
  // ---- 右上：カバーの曲線
  let gx = bx.x + side + 70, g = { x: gx, y: 110, w: width - gx - 40, h: side - 30, x0: 0, x1: 4, y0: 0, y1: 1.02 };
  plotAxes(g, 'N / d（重み 1 個あたりの点の数）', '分けられる割合 C(N, d) / 2^N', [0, 1, 2, 3, 4], [0, 0.5, 1]);
  stroke(...WIRE); line(gX(g, 2), g.y, gX(g, 2), g.y + g.h); line(g.x, gY(g, 0.5), g.x + g.w, gY(g, 0.5));
  let ds = [1, 3, 10, 40, 200], cols = [SUB, MAG, SKY, LIME, AMBER];
  ds.forEach((d, k) => { let xs = [], ys = []; for (let nn = 0; nn <= 4 * d; nn += Math.max(1, Math.round(d / 50))) { xs.push(nn / d); ys.push(coverFrac(nn, d)); } plotXY(g, xs, ys, cols[k], d === DIM_D ? 3 : 1.5); });
  legend(g.x + g.w - 130, g.y + 20, ds.map((d, k) => [cols[k], 'd = ' + d + (d === 3 ? '（平面）' : '')]));
  let px = gX(g, n / DIM_D), py = gY(g, n ? nSep / (1 << n) : 1);
  noStroke(); fill(...INK); circle(px, py, 12); textSize(13); text('いまの点（総当たり）', px + 10, py - 8);
  fill(...SUB); text('d が大きいほど N = 2d（N/d = 2）で急に落ちる → 重み 1 個あたり 2 点が「容量」', g.x, g.y + g.h + 50);
  // ---- 下：2^N 通りの小さな絵
  let ty = bx.y + side + 70, cols16 = n <= 4 ? 1 << n : n <= 6 ? 16 : 32, tw = Math.min(64, (width - 60) / cols16 - 4), th = tw;
  if (!thumbBuf || thumbBuf.width !== Math.round(width) || thumbDirty) drawThumbs(tw, cols16);
  image(thumbBuf, 0, ty);
  hoverMask = -1;
  if (mouseY > ty && mouseY < ty + thumbBuf.height) { let c = Math.floor((mouseX - 30) / (tw + 4)), r = Math.floor((mouseY - ty - 4) / (th + 4)); if (c >= 0 && c < cols16) { let m = r * cols16 + c; if (m >= 0 && m < 1 << n) hoverMask = m; } }
  drawSelfTest(width - 180, height - 14);
}
function drawThumbs(tw, perRow) {
  let n = cpts.length, rows = Math.ceil((1 << n) / perRow);
  let bw = Math.round(width), bh = Math.max(10, Math.round(rows * (tw + 4) + 8));
  if (!thumbBuf || thumbBuf.width !== bw || thumbBuf.height !== bh) { if (thumbBuf) thumbBuf.remove(); thumbBuf = createGraphics(bw, bh); thumbBuf.pixelDensity(1); }   // 大きさが同じなら使い回す
  thumbBuf.clear();
  for (let m = 0; m < 1 << n; m++) {
    let x = 30 + (m % perRow) * (tw + 4), y = 4 + Math.floor(m / perRow) * (tw + 4), ok = sepMask[m];
    thumbBuf.noStroke(); thumbBuf.fill(...(ok ? PANEL : [12, 26, 28])); thumbBuf.rect(x, y, tw, tw, 3);
    if (ok) { thumbBuf.noFill(); thumbBuf.stroke(...LIME, 170); thumbBuf.strokeWeight(1); thumbBuf.rect(x, y, tw, tw, 3); }
    thumbBuf.noStroke();
    cpts.forEach((p, i) => { thumbBuf.fill(...((m >> i) & 1 ? MAG : LIME), ok ? 255 : 80); thumbBuf.circle(x + 3 + p[0] * (tw - 6), y + 3 + (1 - p[1]) * (tw - 6), Math.max(3, tw / 9)); });
  }
  thumbDirty = false;
}

function mousePressed() {
  let side = Math.min(320, height * 0.42), u = (mouseX - 30) / side, v = 1 - (mouseY - 90) / side;
  if (u < 0 || u > 1 || v < 0 || v > 1) return;
  dragIdx = -1;
  cpts.forEach((p, i) => { if (Math.hypot(p[0] - u, p[1] - v) < 0.04) dragIdx = i; });
  if (dragIdx < 0 && cpts.length < 9) { cpts.push([u, v]); analyze(); }
}
function mouseDragged() {
  if (dragIdx < 0) return;
  let side = Math.min(320, height * 0.42);
  cpts[dragIdx] = [clampv((mouseX - 30) / side, 0, 1), clampv(1 - (mouseY - 90) / side, 0, 1)]; analyze();
}
function mouseReleased() { dragIdx = -1; }
function keyPressed() {
  if (key === UP_ARROW) randomPoints(Math.min(9, cpts.length + 1));
  if (key === DOWN_ARROW) randomPoints(Math.max(1, cpts.length - 1));
  if (key === 'r' || key === 'R') { seedP++; randomPoints(Math.max(1, cpts.length)); }
  if (key === 'l' || key === 'L') { cpts = cpts.map((_, i) => [0.1 + (0.8 * i) / Math.max(1, cpts.length - 1), 0.3 + (0.4 * i) / Math.max(1, cpts.length - 1)]); analyze(); }
  return false;
}

// ============================================
// やってみよう
// ・N = 4 で、分けられない 2 通りはどんな色分け？（XOR の形になっている？）
// ・N = 6（N/d = 2）で、ちょうど半分 32 / 64 になることを確かめる
// ・L で一直線に並べると何通り？ それは 1 次元の式 C(N, 2) = 2N と同じ？
// ・点をドラッグして 3 点をそろえていくと、どこで数が減る？
// ============================================

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  check('N = 4、d = 3：C(4, 3) = 14（16 通りのうち）', coverCount(4, 3) === 14);
  let okAll = true, okPair = true, msg = '';
  for (let s = 1; s <= 4; s++) for (let n = 1; n <= 7; n++) {
    seedRng(900 + 10 * s + n); let ps = []; for (let i = 0; i < n; i++) ps.push([rnd(), rnd()]);
    if (hasCollinear(ps)) continue;
    let c = countSeparable(ps); if (c !== coverCount(n, 3)) okAll = false;
    if (countByPairs(ps) !== c) okPair = false;
    if (n === 7) msg = c + ' = ' + coverCount(7, 3);
  }
  check('一般の位置のランダムな点 N = 1〜7：総当たりの数 = C(N, 3)（N = 7 で ' + msg + '）', okAll);
  check('2 つの数え方（向きの総当たり ／ 2 点を通る直線）が一致', okPair);
  let line1 = true; for (let n = 1; n <= 8; n++) { let ps = []; for (let i = 0; i < n; i++) ps.push([0.1 + i * 0.1, 0.5]); if (countSeparable(ps) !== coverCount(n, 2)) line1 = false; }
  check('一直線上の点（1 次元、d = 2）：分けられる数 = C(N, 2) = 2N', line1);
  let half = true; for (let d = 1; d <= 20; d++) if (coverCount(2 * d, d) !== Math.pow(2, 2 * d - 1) || !near(coverFrac(2 * d, d), 0.5, 1e-12)) half = false;
  check('C(2d, d) = 2^(2d−1)（ちょうど半分）d = 1〜20', half);
  let rec = true; for (let n = 1; n <= 25; n++) for (let d = 1; d <= 25; d++) { if (coverCount(n + 1, d) !== coverCount(n, d) + coverCount(n, d - 1)) rec = false; if (n <= d && coverCount(n, d) !== Math.pow(2, n)) rec = false; }
  check('漸化式 C(N+1, d) = C(N, d) + C(N, d−1)、N ≤ d なら 2^N', rec);
  reportSelfTest();
}

// ==================================================
// ここから下は「神経回路網の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 色と小さな道具（神経細胞：深い青緑の黒、あたたかい白、シナプスのマゼンタ、軸索のライム）
const BG = [8, 22, 24];                  // 背景（深い青緑の黒）
const INK = [246, 238, 224];             // 文字（あたたかい白）
const MAG = [232, 72, 160], LIME = [184, 232, 76], AMBER = [250, 186, 72], SKY = [96, 196, 236], VIOLET = [168, 140, 250];
const SUB = [150, 178, 172], PANEL = [16, 38, 40], WIRE = [44, 76, 76];
function clampv(v, a, b) { return v < a ? a : v > b ? b : v !== v ? a : v; }     // NaN なら a に戻す
function sumOf(a) { let s = 0; for (let v of a) s += v; return s; }
function meanOf(a) { return a.length ? sumOf(a) / a.length : 0; }
function fmtN(v, d) { if (typeof v !== 'number' || v !== v) return '?'; if (!isFinite(v)) return v > 0 ? '∞' : '−∞'; let s = v.toFixed(d === undefined ? 2 : d); return /^-0\.?0*$/.test(s) ? s.slice(1) : s; }
function fmtE(v) { if (typeof v !== 'number' || !isFinite(v)) return '?'; return v === 0 ? '0' : v.toExponential(1); }
function hudTitle(t, sub) {              // 左上のタイトルと操作の説明
  noStroke(); fill(...INK); textSize(22); textAlign(LEFT, BASELINE); text(t, 30, 38);
  fill(...SUB); textSize(14); text(sub, 30, 62);
}
function sigm(z) { return 1 / (1 + Math.exp(-clampv(z, -40, 40))); }
// ---- 種つきの乱数（同じ種なら毎回同じ列 → 実験をくり返せる）
let rngState = 1;
function seedRng(s) { rngState = (s >>> 0) || 1; }
function rnd() {                         // 0〜1 の一様乱数（mulberry32）
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rndInt(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
function randn() { let u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }   // 標準正規分布
function shuffleArr(a) { for (let i = a.length - 1; i > 0; i--) { let j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
// ---- グラフの道具：g = { x, y, w, h, x0, x1, y0, y1 }
function gX(g, v) { return g.x + clampv((v - g.x0) / (g.x1 - g.x0), -0.02, 1.02) * g.w; }
function gY(g, v) { return g.y + g.h - clampv((v - g.y0) / (g.y1 - g.y0), -0.02, 1.02) * g.h; }
function plotAxes(g, xl, yl, xt, yt) {
  stroke(...WIRE); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h);
  noStroke(); fill(...SUB); textSize(12); textAlign(CENTER, TOP);
  for (let v of xt) text(+v.toPrecision(3), gX(g, v), g.y + g.h + 4);
  textAlign(RIGHT, CENTER);
  for (let v of yt) text(+v.toPrecision(3), g.x - 5, gY(g, v));
  textAlign(LEFT, BASELINE); fill(...INK); textSize(13);
  text(xl, g.x + g.w - textWidth(xl), g.y + g.h + 30); text(yl, g.x, g.y - 8);
}
function polyline(pts) {                 // 点が 2 つ以上あるときだけ折れ線を描く（空の beginShape を作らない）
  if (pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape();
}
function plotXY(g, xs, ys, col, sw) {    // (xs[i], ys[i]) を折れ線で（有限の値だけ）
  let pts = []; for (let i = 0; i < xs.length; i++) if (isFinite(ys[i])) pts.push([gX(g, xs[i]), gY(g, ys[i])]);
  stroke(...col); strokeWeight(sw || 2); polyline(pts);
}
function legend(x, y, items) {           // items = [[色, 名前], …]
  textSize(13); textAlign(LEFT, CENTER);
  for (let [c, s] of items) { noStroke(); fill(...c); rect(x, y - 5, 16, 10); fill(...INK); text(s, x + 22, y); y += 20; }
  textAlign(LEFT, BASELINE);
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function relErr(a, b) { return Math.abs(a - b) / Math.max(1e-12, Math.abs(a) + Math.abs(b)); }
function noNaN(v) { return Array.isArray(v) || ArrayBuffer.isView(v) ? Array.from(v).every(noNaN) : !(typeof v === 'number' && !isFinite(v)); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(150, 230, 170) : color(255, 90, 110)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
