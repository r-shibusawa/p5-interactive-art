// ============================================
// 00 距離のいろいろ ─ クラスタリングの「似ている」は「近い」。でも「近さ」の測り方は 1 つではない
//   ユークリッド √(Δx² + Δy²) = 円 / マンハッタン |Δx| + |Δy| = ひし形 / チェビシェフ max(|Δx|, |Δy|) = 正方形
//   ミンコフスキー (|Δx|^p + |Δy|^p)^(1/p)：p = 1 でマンハッタン、2 でユークリッド、∞ でチェビシェフ
//   コサイン距離 1 − cos θ：原点から見た「向き」だけを比べる（長さは無視）。三角不等式が成り立たないので、本当の距離（計量）ではない
//   基準の点（★）から「同じ距離」の線と、いちばん近い点を表示。距離を変えると、いちばん近い点が入れかわる（ボロノイ図にするとシリーズ 22 の 02）
// 1〜5 距離を切りかえ / クリック 基準の点 / ↑↓ 輪の大きさ / ← → p（5 のとき）/ R 点をまき直す / スペース 4 つの距離の近い点を全部表示
// ============================================

const METRIC_JA = ['ユークリッド', 'マンハッタン', 'チェビシェフ', 'コサイン距離', 'ミンコフスキー'];
const NPTS = 40;                       // ★ 点の数
let pts = [], query = [0.6, 0.35], metricNo = 0, ringR = 0.35, pExp = 3, showAll = true, seedP = 3, view;

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); selfTest(); scatter(); }
function scatter() { seedRng(seedP); pts = []; for (let i = 0; i < NPTS; i++) pts.push([-2.2 + 4.4 * rnd(), -1.6 + 3.2 * rnd()]); }

// ★ 距離の式（m = 0〜4）
function metricD(m, a, b, p) {
  let dx = Math.abs(a[0] - b[0]), dy = Math.abs(a[1] - b[1]);
  if (m === 0) return Math.sqrt(dx * dx + dy * dy);
  if (m === 1) return dx + dy;
  if (m === 2) return Math.max(dx, dy);
  if (m === 3) {                       // コサイン距離（原点から見た向きの差）。長さ 0 のベクトルは 1 とする
    let la = Math.hypot(a[0], a[1]), lb = Math.hypot(b[0], b[1]);
    if (la < 1e-12 || lb < 1e-12) return 1;
    return clampv(1 - (a[0] * b[0] + a[1] * b[1]) / (la * lb), 0, 2);
  }
  let q = p || pExp; return Math.pow(Math.pow(dx, q) + Math.pow(dy, q), 1 / q);
}
function nearestIdx(m, q) { let best = -1, bd = Infinity; pts.forEach((p, i) => { let d = metricD(m, q, p); if (d < bd) { bd = d; best = i; } }); return best; }

// ★ 「同じ距離」の線：中心 c から距離 r の点を角度ごとに求める（円・ひし形・正方形・その間）
function ballPoint(m, c, r, t) {
  let ux = Math.cos(t), uy = Math.sin(t), unit = metricD(m, [0, 0], [ux, uy]);
  return [c[0] + (r * ux) / unit, c[1] + (r * uy) / unit];
}

function draw() {
  background(22, 24, 34);
  view = fitView(40, 100, width * 0.62, height - 190, 0, 0, 4.2);
  // 原点の十字（コサイン距離の基準）
  stroke(60, 64, 84); strokeWeight(1); line(view.x, gY(view, 0), view.x + view.w, gY(view, 0)); line(gX(view, 0), view.y, gX(view, 0), view.y + view.h);
  noFill(); stroke(80); rect(view.x, view.y, view.w, view.h);
  // ---- 同じ距離の線
  let colM = [[176, 140, 255], [110, 230, 190], [255, 190, 80], [110, 180, 255], [255, 120, 130]];
  stroke(...colM[metricNo]); strokeWeight(2);
  if (metricNo === 3) {                // コサイン：原点からのくさび形（向きの差が同じ線は、原点からの半直線）
    let th = Math.atan2(query[1], query[0]);
    for (let k = 1; k <= 3; k++) {
      let d = Math.min(2, ringR * k * 0.5), a = Math.acos(clampv(1 - d, -1, 1));
      for (let s of [-1, 1]) line(gX(view, 0), gY(view, 0), gX(view, 6 * Math.cos(th + s * a)), gY(view, 6 * Math.sin(th + s * a)));
    }
  } else for (let k = 1; k <= 3; k++) {
    let ring = []; for (let i = 0; i <= 160; i++) { let b = ballPoint(metricNo, query, ringR * k, (TWO_PI * i) / 160); ring.push([gX(view, b[0]), gY(view, b[1])]); }
    polyline(ring);
  }
  // ---- 点といちばん近い点
  let nn = [0, 1, 2, 3].map((m) => nearestIdx(m, query)), cur = nearestIdx(metricNo, query);
  if (showAll) for (let m = 0; m < 4; m++) { stroke(...colM[m], 150); strokeWeight(m === metricNo ? 3 : 1.5); line(gX(view, query[0]), gY(view, query[1]), gX(view, pts[nn[m]][0]), gY(view, pts[nn[m]][1])); }
  stroke(...colM[metricNo]); strokeWeight(3); line(gX(view, query[0]), gY(view, query[1]), gX(view, pts[cur][0]), gY(view, pts[cur][1]));
  noStroke();
  pts.forEach((p, i) => { fill(i === cur ? color(...colM[metricNo]) : color(220, 222, 235)); circle(gX(view, p[0]), gY(view, p[1]), i === cur ? 14 : 8); fill(140); textSize(10); textAlign(LEFT, CENTER); text(i, gX(view, p[0]) + 7, gY(view, p[1]) - 7); });
  fill(255, 240, 120); textSize(22); textAlign(CENTER, CENTER); text('★', gX(view, query[0]), gY(view, query[1]));
  // ---- 右の表：近い順に 6 点
  let px = view.x + view.w + 40, py = 120, order = pts.map((_, i) => i).sort((a, b) => metricD(metricNo, query, pts[a]) - metricD(metricNo, query, pts[b])).slice(0, 6);
  textAlign(LEFT, BASELINE); fill(230); textSize(16); text(METRIC_JA[metricNo] + ' で近い順', px, py);
  textSize(13); fill(170); text('番号　ユーク　マンハ　チェビ　コサイン', px, py + 26);
  order.forEach((i, r) => {
    fill(r === 0 ? color(...colM[metricNo]) : 215);
    text(String(i).padStart(2, ' ') + '　' + [0, 1, 2, 3].map((m) => metricD(m, query, pts[i]).toFixed(3)).join('　'), px, py + 50 + r * 22);
  });
  fill(200); textSize(14);
  let names = [0, 1, 2, 3].map((m) => METRIC_JA[m] + ' → ' + nn[m]).join('\n');
  text('いちばん近い点（細い線の色）\n' + names, px, py + 210);
  let diff = new Set(nn).size;
  fill(diff > 1 ? color(255, 200, 120) : color(150, 230, 160));
  text(diff > 1 ? '距離によって、いちばん近い点が ' + diff + ' 通りに分かれた！' : '今はどの距離でも同じ点がいちばん近い。★ を動かしてみよう', px, py + 330, width - px - 30);
  // 単位球の小さな見本
  let sx = px, sy = height - 210;
  fill(170); textSize(13); text('単位球（距離 1 の線）', sx, sy - 14);
  for (let m of [1, 0, 4, 2]) {
    let c = [sx + 45 + [1, 0, 4, 2].indexOf(m) * 82, sy + 50], ring = [];
    for (let i = 0; i <= 80; i++) { let b = ballPoint(m, [0, 0], 1, (TWO_PI * i) / 80); ring.push([c[0] + b[0] * 32, c[1] - b[1] * 32]); }
    stroke(...colM[m]); strokeWeight(m === metricNo ? 3 : 1.5); polyline(ring);
    noStroke(); fill(180); textSize(11); textAlign(CENTER, TOP); text(m === 4 ? 'p = ' + pExp : ['L2', 'L1', 'L∞'][m], c[0], c[1] + 40);
  }
  // ---- 文字
  textAlign(LEFT, BASELINE); fill(240); textSize(20);
  text('距離のいろいろ　いまの距離：' + METRIC_JA[metricNo] + (metricNo === 4 ? '（p = ' + pExp + '）' : '') + (metricNo === 3 ? '　← 向きだけを比べる（原点 = 十字）' : ''), 40, 40);
  fill(170); textSize(15); text('1〜5 距離　クリック ★ を置く　↑↓ 輪の大きさ　← → p（5 のとき）　R 点をまき直す　スペース 細い線 ON/OFF', 40, 66);
  fill(150); textSize(13); text('輪 = ★ から同じ距離 ' + ringR.toFixed(2) + '・' + (2 * ringR).toFixed(2) + '・' + (3 * ringR).toFixed(2) + '（コサインは 1 − cos θ = その半分）。k-means（01）はユークリッド距離の 2 乗を使う', 40, height - 50);
  drawSelfTest(width - 170, height - 12);
}

function mousePressed() { if (view && inBox(view, mouseX, mouseY)) query = [invX(view, mouseX), invY(view, mouseY)]; }
function mouseDragged() { mousePressed(); }
function keyPressed() {
  if (key.length === 1 && '12345'.includes(key)) metricNo = +key - 1;
  if (key === UP_ARROW) ringR = Math.min(1.2, ringR + 0.05);
  if (key === DOWN_ARROW) ringR = Math.max(0.1, ringR - 0.05);
  if (key === RIGHT_ARROW) pExp = Math.min(12, pExp + 1);
  if (key === LEFT_ARROW) pExp = Math.max(1, pExp - 1);
  if (key === 'r' || key === 'R') { seedP++; scatter(); }
  if (key === ' ') showAll = !showAll;
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(100);
  let rp = () => [-3 + 6 * rnd(), -3 + 6 * rnd()], axioms = [true, true, true, true];
  for (let t = 0; t < 400; t++) {
    let a = rp(), b = rp(), c = rp();
    [0, 1, 2, 4].forEach((m, q) => {
      let ab = metricD(m, a, b, 3), ba = metricD(m, b, a, 3), ac = metricD(m, a, c, 3), bc = metricD(m, b, c, 3);
      if (!(ab >= 0 && metricD(m, a, a, 3) === 0 && Math.abs(ab - ba) < 1e-12 && ac <= ab + bc + 1e-12)) axioms[q] = false;
    });
  }
  check('ユークリッド・マンハッタン・チェビシェフ・ミンコフスキー（p = 3）は距離の公理（0 以上、d(x, x) = 0、対称、三角不等式）を満たす（400 組）', axioms.every((v) => v));
  let a = [1, 0], b = [1, 1], c = [0, 1], cosOk = true;
  for (let t = 0; t < 200; t++) { let u = rp(), v = rp(), d = metricD(3, u, v); if (!(d >= 0 && d <= 2 && Math.abs(d - metricD(3, v, u)) < 1e-12)) cosOk = false; }
  check('コサイン距離は対称で 0〜2。でも (1,0)→(1,1)→(0,1) で三角不等式が破れる：' + metricD(3, a, c).toFixed(3) + ' > ' + (metricD(3, a, b) + metricD(3, b, c)).toFixed(3), cosOk && metricD(3, a, c) > metricD(3, a, b) + metricD(3, b, c));
  let ordOk = true;
  for (let t = 0; t < 300; t++) { let u = rp(), v = rp(), l2 = metricD(0, u, v), l1 = metricD(1, u, v), li = metricD(2, u, v); if (!(li <= l2 + 1e-12 && l2 <= l1 + 1e-12 && l1 <= Math.SQRT2 * l2 + 1e-12 && l1 <= 2 * li + 1e-12)) ordOk = false; }
  check('大小の関係：L∞ ≤ L2 ≤ L1 ≤ √2·L2、L1 ≤ 2·L∞（2 次元）', ordOk);
  let u = [0.3, -1.2], v = [-0.7, 0.4];
  check('ミンコフスキー：p = 1 はマンハッタン、p = 2 はユークリッド、p = 64 はチェビシェフの 2% 以内', near(metricD(4, u, v, 1), metricD(1, u, v), 1e-12) && near(metricD(4, u, v, 2), metricD(0, u, v), 1e-12) && Math.abs(metricD(4, u, v, 64) / metricD(2, u, v) - 1) < 0.02);
  let q0 = [0, 0], pa = [0.9, 0.9], pb = [1.2, 0];
  check('近い点が入れかわる例：★ = 原点で (0.9, 0.9) と (1.2, 0)。L1 では後者、L∞ では前者がいちばん近い', metricD(1, q0, pb) < metricD(1, q0, pa) && metricD(2, q0, pa) < metricD(2, q0, pb));
  let lenOk = true; for (let t = 0; t < 100; t++) { let w = rp(), s = 0.1 + 5 * rnd(); if (Math.abs(metricD(3, w, [w[0] * s, w[1] * s])) > 1e-12) lenOk = false; }
  check('コサイン距離は長さを無視：d(x, s·x) = 0（s > 0）', lenOk);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 1 と 3 を切りかえながら ★ を動かし、いちばん近い点が入れかわる場所を探そう
// 2. 5（ミンコフスキー）で ← → を押して p を 1 → 12 に。単位球はひし形 → 円 → 正方形に変わる
// 3. 4（コサイン）では、原点から同じ向きにある点は、遠くても「同じ」。文書の単語の数を比べるときに使う
// 4. 右の表で、L∞ ≤ L2 ≤ L1 がいつも成り立っているか確かめよう
// 5. 01 の k-means は「ユークリッド距離の 2 乗」で近さを測る。マンハッタン距離にすると平均ではなく中央値（k-medians）になる

// ==================================================
// ここから下は「クラスタリングの道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 共通：値をはさむ・クラスタの色・距離（点は [x, y] や [r, g, b] のような配列）
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
const PAL = [[176, 140, 255], [110, 230, 190], [255, 190, 80], [110, 180, 255], [255, 120, 130], [200, 240, 110], [255, 150, 220], [90, 210, 220], [255, 150, 70], [190, 190, 255]];
function palC(k, a) {                  // クラスタ k の色（k < 0 = ノイズ = 灰色）
  let al = a === undefined ? 255 : a;
  if (k < 0) return color(120, 120, 135, al);
  let c = PAL[k % PAL.length]; return color(c[0], c[1], c[2], al);
}
function sqd(a, b) { let s = 0; for (let i = 0; i < a.length; i++) { let d = a[i] - b[i]; s += d * d; } return s; }   // 距離の 2 乗
function edist(a, b) { return Math.sqrt(sqd(a, b)); }                                                              // ユークリッド距離
function meanOf(arr) { if (!arr.length) return 0; let s = 0; for (let v of arr) s += v; return s / arr.length; }
// ---- 種つきの乱数（同じ種なら毎回同じ列）
let rngState = 1, gaussSpare = null;
function seedRng(s) { rngState = (s >>> 0) || 1; gaussSpare = null; }
function rnd() {                       // 0〜1 の一様乱数（mulberry32）
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rndInt(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
function gauss() {                     // 標準正規分布（ボックス-ミュラー法）
  if (gaussSpare !== null) { let g = gaussSpare; gaussSpare = null; return g; }
  let u = 1 - rnd(), v = rnd(), r = Math.sqrt(-2 * Math.log(u));
  gaussSpare = r * Math.sin(2 * Math.PI * v); return r * Math.cos(2 * Math.PI * v);
}
// ---- グラフと図の道具：g = { x, y, w, h, x0, x1, y0, y1 }（画面の四角とデータの範囲）
function gX(g, v) { return g.x + clampv((v - g.x0) / (g.x1 - g.x0), -0.02, 1.02) * g.w; }
function gY(g, v) { return g.y + g.h - clampv((v - g.y0) / (g.y1 - g.y0), -0.02, 1.02) * g.h; }
function invX(g, px) { return g.x0 + ((px - g.x) / g.w) * (g.x1 - g.x0); }
function invY(g, py) { return g.y0 + ((g.y + g.h - py) / g.h) * (g.y1 - g.y0); }
function inBox(g, px, py) { return px >= g.x && px <= g.x + g.w && py >= g.y && py <= g.y + g.h; }
function fitView(x, y, w, h, cx, cy, span) {   // 縦横の縮尺をそろえる（span = 短い辺に入るデータの幅）
  let s = Math.min(w, h) / span; return { x, y, w, h, x0: cx - w / 2 / s, x1: cx + w / 2 / s, y0: cy - h / 2 / s, y1: cy + h / 2 / s };
}
function plotAxes(g, xl, yl, xt, yt) {
  stroke(95); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h);
  noStroke(); fill(165); textSize(12); textAlign(CENTER, TOP);
  for (let v of xt) text(+v.toPrecision(3), gX(g, v), g.y + g.h + 4);
  textAlign(RIGHT, CENTER);
  for (let v of yt) text(+v.toPrecision(3), g.x - 5, gY(g, v));
  textAlign(LEFT, BASELINE); fill(205); textSize(13);
  text(xl, g.x + g.w - textWidth(xl), g.y + g.h + 30); text(yl, g.x, g.y - 8);
}
function polyline(pts) {               // 点が 2 つ以上あるときだけ折れ線を描く
  if (pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape();
}
function drawPts(g, pts, labels, r, al) {   // クラスタの色で点を描く（labels がなければ白）
  noStroke();
  for (let i = 0; i < pts.length; i++) { fill(labels ? palC(labels[i], al) : color(230, 230, 240, al === undefined ? 255 : al)); circle(gX(g, pts[i][0]), gY(g, pts[i][1]), r); }
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) ? v.every(noNaN) : !(typeof v === 'number' && v !== v); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(120, 210, 150) : color(255, 90, 90)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
