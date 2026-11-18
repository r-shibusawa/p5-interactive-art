// ============================================
// 12 銀河の回転曲線 ─ 見えない質量（暗黒物質）があると考えるのはなぜ？
// 半径 r の円軌道の速さ v = √(G M(<r) / r)（M(<r) = r より内側の質量。球対称の近似）
// 見える物質（バルジ + 円盤）だけなら、外側ほど遅くなる（v ∝ 1/√r、ケプラー的な減少）
// 実際の銀河の回転曲線は外側でも平ら → 見えない「ハロー」M_h(<r) = (v∞²/G)(r − rc·atan(r/rc)) を足すと説明できる
// ↑↓ = ハローの重さ（v∞）/ H = 星の動きにハローを入れる・入れない / スペース = 再生/停止 / 銀河の値は天の川銀河に似せた目安
// ============================================

const GK = 4.30091e-6;                 // 重力定数 [kpc (km/s)² / M☉]
const M_BULGE = 1.5e10, A_BULGE = 0.6;   // ★ バルジの質量 [M☉] と大きさ [kpc]
const M_DISK = 6e10, R_DISK = 3;       // ★ 円盤の質量 [M☉] と広がり [kpc]
const R_CORE = 5;                      // ★ ハローの芯の半径 [kpc]
const KPC_KM = 3.0857e16, MYR_S = 3.15576e13;   // 1 kpc [km]、100 万年 [s]
let vHalo = 200, haloOn = true, playing = true, stars = [], obs = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  seedRng(3);
  for (let i = 0; i < 1500; i++) {         // 円盤の星：指数関数の分布で半径を選ぶ（2 本の腕の模様をつける）
    let r = -R_DISK * Math.log(1 - rnd() * 0.995) + 0.3, arm = Math.floor(rnd() * 2) * Math.PI;
    stars.push({ r: Math.min(r, 30), th: arm + Math.log(r + 1) * 1.6 + 0.5 * rndNormal() * 0.4 });
  }
  for (let r = 2; r <= 30; r += 2) obs.push([r, vTotal(r, 210) + 6 * rndNormal()]);   // 観測のような点（v∞ = 210 のモデル + ばらつき）
}
// 内側の質量 [M☉]
function mBulge(r) { return (M_BULGE * r * r) / ((r + A_BULGE) * (r + A_BULGE)); }
function mDisk(r) { let x = r / R_DISK; return M_DISK * (1 - (1 + x) * Math.exp(-x)); }
function mHalo(r, v) { return ((v * v) / GK) * (r - R_CORE * Math.atan(r / R_CORE)); }
function vOf(M, r) { return Math.sqrt((GK * Math.max(0, M)) / Math.max(r, 1e-6)); }
function vVisible(r) { return vOf(mBulge(r) + mDisk(r), r); }
function vTotal(r, v) { return vOf(mBulge(r) + mDisk(r) + mHalo(r, v), r); }
function periodMyr(r, v) { return (2 * Math.PI * r * KPC_KM) / Math.max(v, 1e-6) / MYR_S; }   // 1 周の時間 [100 万年]

function draw() {
  background(4, 6, 20);
  // ---- 回る円盤（1 フレーム = 50 万年）
  let cx = width * 0.25, cy = height * 0.5, sc = Math.min(width * 0.23, height * 0.4) / 18;   // 半径 18 kpc までを描く
  noStroke(); fill(255, 230, 180, 30); for (let i = 6; i >= 1; i--) circle(cx, cy, i * 14);
  stroke(255, 240, 210, 170); strokeWeight(2);
  for (let s of stars) {
    if (playing) { let v = haloOn ? vTotal(s.r, vHalo) : vVisible(s.r); s.th += ((v / (s.r * KPC_KM)) * 0.5 * MYR_S); }
    point(cx + s.r * sc * Math.cos(s.th), cy + s.r * sc * Math.sin(s.th));
  }
  strokeWeight(1); noFill(); stroke(250, 225, 140, 120); circle(cx, cy, 2 * 8 * sc);
  noStroke(); fill(250, 225, 140); textSize(12); text('太陽のあたり（8 kpc）', cx + 8 * sc * 0.72, cy - 8 * sc * 0.72);
  fill(200, 205, 225); textAlign(CENTER); text(haloOn ? '星の動き：ハローあり（外側も同じ速さ）' : '星の動き：見える物質だけ（外側ほど遅い）', cx, cy + 18 * sc + 30); textAlign(LEFT, BASELINE);
  // ---- 回転曲線
  let g = { x: width * 0.52, y: 110, w: width * 0.44, h: height * 0.5, x0: 0, x1: 30, y0: 0, y1: 300 };
  plotAxes(g, '銀河の中心からの距離 r [kpc]', '回転の速さ v [km/s]', [0, 5, 10, 15, 20, 25, 30], [0, 100, 200, 300]);
  let curve = (fn, col, w) => { let p = []; for (let i = 1; i <= 150; i++) { let r = (30 * i) / 150; p.push([gX(g, r), gY(g, fn(r))]); } stroke(col); strokeWeight(w); polyline(p); strokeWeight(1); };
  curve((r) => vOf(mBulge(r), r), color(255, 170, 120, 150), 1);
  curve((r) => vOf(mDisk(r), r), color(140, 190, 255, 150), 1);
  curve((r) => vOf(mHalo(r, vHalo), r), color(200, 140, 255, 180), 1);
  curve(vVisible, color(140, 190, 255), 2.5);
  curve((r) => vTotal(r, vHalo), color(250, 225, 140), 3);
  noStroke(); fill(255, 255, 255, 200); for (let o of obs) circle(gX(g, o[0]), gY(g, o[1]), 7);
  fill(255, 120, 110); circle(gX(g, 8), gY(g, 230), 11);
  let lg = [['全部（+ ハロー）', color(250, 225, 140)], ['見える物質だけ', color(140, 190, 255)], ['バルジ', color(255, 170, 120)], ['円盤', color(140, 190, 255, 150)], ['ハロー', color(200, 140, 255)], ['観測のような点（例）', color(255)], ['太陽の公転の速さ（約 230 km/s）', color(255, 120, 110)]];
  textSize(12); lg.forEach((l, i) => { let lx = g.x + (i % 4) * (g.w / 4), ly = g.y + g.h + 48 + Math.floor(i / 4) * 18; fill(l[1]); rect(lx, ly - 6, 12, 4); fill(210, 215, 230); text(l[0], lx + 16, ly); });   // 凡例（グラフの下）
  // ---- 数字
  let x0 = g.x, y0 = g.y + g.h + 110, Mv = mBulge(30) + mDisk(30), Mh = mHalo(30, vHalo);
  fill(250, 225, 140); textSize(15);
  text('ハロー v∞ = ' + vHalo + ' km/s（↑↓）　8 kpc で：見える物質だけ ' + vVisible(8).toFixed(0) + '、あり ' + vTotal(8, vHalo).toFixed(0) + ' km/s', x0, y0);
  fill(220, 225, 240);
  text('30 kpc の内側：見える物質 ' + (Mv / 1e10).toFixed(1) + '、ハロー ' + (Mh / 1e10).toFixed(1) + '（× 10¹⁰ M☉）→ ' + (Mh / Mv).toFixed(1) + ' 倍', x0, y0 + 24);
  text('太陽が 1 周する時間 2πr / v = ' + periodMyr(8, vTotal(8, vHalo)).toFixed(0) + ' 百万年（約 2 億年）', x0, y0 + 48);
  text('見える物質だけ：15 → 30 kpc で速さ ' + (vVisible(30) / vVisible(15)).toFixed(2) + ' 倍（1/√2 = 0.71）', x0, y0 + 72);
  noStroke(); fill(240, 236, 215); textSize(18);
  text('銀河の回転曲線　｜ ↑↓ ハローの重さ　H 星の動きにハロー　スペース 再生/停止', 20, 34);
  drawSelfTest(20, height - 12);
}

function keyPressed() {
  if (key === UP_ARROW) vHalo = Math.min(300, vHalo + 10);
  if (key === DOWN_ARROW) vHalo = Math.max(0, vHalo - 10);
  if (key === 'h' || key === 'H') haloOn = !haloOn;
  if (key === ' ') playing = !playing;
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  check('見える物質だけなら外側は v ∝ 1/√r：v(60) / v(30) ≈ 0.71（2% 以内）', near(vVisible(60) / vVisible(30), Math.SQRT1_2, 0.014));
  check('ハロー（v∞ = 200）を足すと平ら：v(50) / v(25) = 1 ± 0.1', near(vTotal(50, 200) / vTotal(25, 200), 1, 0.1));
  let s = 0, N = 20000, r = 20; for (let i = 0; i < N; i++) { let x = ((i + 0.5) / N) * r; s += ((4 * Math.PI * x * x * (200 * 200)) / (4 * Math.PI * GK * R_CORE * R_CORE * (1 + (x / R_CORE) ** 2))) * (r / N); }
  check('ハローの質量の式 = 密度 ρ₀/(1 + (r/rc)²) を数値積分した値（0.01% 以内）', near(s / mHalo(20, 200), 1, 1e-4));
  check('ハローだけの速さは、ずっと遠くで v∞ に近づく', near(vOf(mHalo(5000, 200), 5000), 200, 2));
  let v8 = vTotal(8, 200);
  check('最初の設定で r = 8 kpc の速さは 200〜260 km/s（太陽の公転の速さ 約 230 km/s）', v8 > 200 && v8 < 260);
  check('8 kpc を 230 km/s で 1 周 ≈ 2.1 億年', near(periodMyr(8, 230), 214, 3));
  check('円盤の質量は遠くで全部（M_DISK）になる', near(mDisk(300), M_DISK, 1));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. ↓ でハローを 0 に。回転曲線は外側で下がっていく。白い点（観測）と合う？
// 2. ↑↓ で白い点にいちばん合う v∞ を探そう。そのときハローは見える物質の何倍？
// 3. H で星の動きからハローを外すと、外側の星がおくれて腕の形が変わる
// 4. M_DISK を 2 倍にしても、外側を平らにできる？（内側が速くなりすぎないか見よう）
// 5. 暗黒物質のほかに、重力の法則そのものを変える考え（MOND など）もある。調べてみよう


// ==================================================
// ここから下は「天文の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
const DEG = Math.PI / 180;             // 度 → ラジアン
function wrap360(a) { return ((a % 360) + 360) % 360; }
function wrap180(a) { return wrap360(a + 180) - 180; }
// ---- 種つきの乱数（同じ種なら毎回同じ列）
let rngState = 1;
function seedRng(s) { rngState = (s >>> 0) || 1; }
function rnd() {                       // 0〜1 の一様乱数（mulberry32）
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rndNormal() { let u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }   // 標準正規分布
// ---- グラフの道具：g = { x, y, w, h, x0, x1, y0, y1, logx, logy }
function gX(g, v) { let t = g.logx ? (Math.log(v) - Math.log(g.x0)) / (Math.log(g.x1) - Math.log(g.x0)) : (v - g.x0) / (g.x1 - g.x0); return g.x + clampv(isFinite(t) ? t : 0, -0.02, 1.02) * g.w; }
function gY(g, v) { let t = g.logy ? (Math.log(v) - Math.log(g.y0)) / (Math.log(g.y1) - Math.log(g.y0)) : (v - g.y0) / (g.y1 - g.y0); return g.y + g.h - clampv(isFinite(t) ? t : 0, -0.02, 1.02) * g.h; }
function plotAxes(g, xl, yl, xt, yt) {
  stroke(80, 90, 120); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h);
  noStroke(); fill(160, 170, 195); textSize(12); textAlign(CENTER, TOP);
  for (let v of xt) text(+v.toPrecision(3), gX(g, v), g.y + g.h + 4);
  textAlign(RIGHT, CENTER);
  for (let v of yt) text(+v.toPrecision(3), g.x - 5, gY(g, v));
  textAlign(LEFT, BASELINE); fill(205, 210, 225); textSize(13);
  text(xl, g.x + g.w - textWidth(xl), g.y + g.h + 32); text(yl, g.x, g.y - 8);
}
function polyline(pts, closed) {       // 点が 2 つ以上あるときだけ折れ線を描く（空の beginShape はエラーになるため）
  if (!pts || pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape(closed ? CLOSE : undefined);
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); textSize(13); textAlign(LEFT, BASELINE); fill(selfTestResults.every((r) => r.ok) ? color(130, 215, 160) : color(255, 95, 95)); text(selfTestLine(), x, y); }
