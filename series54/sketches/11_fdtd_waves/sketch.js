// ============================================
// 11 マクスウェル方程式を解く（FDTD 法）─ 電場と磁場が交互に生み合って波になる
// 格子の上で「磁場の変化 ← 電場の回転」「電場の変化 ← 磁場の回転」を半歩ずつ交互に計算（ヤジー格子、2 次元 TM 波）
// 色 = 紙に垂直な電場 Ez（赤 ＋、青 −）。銅色 = 金属（Ez = 0）。外の枠は波を吸いこむ（ムーアの境界）
// クリック = 波のパルス / ドラッグ = 金属を描く / スペース = アンテナ（連続波）/ ↑↓ = 波長（←→ は 10 ずつ）/ 1 自由空間 2 金属の壁 3 共振器 4 すき間 / C = 消す
// ============================================

const NX = 200, NY = 125;              // 格子の数
const SC = 0.5;                        // ★ クーラン数 c·Δt/Δx（2 次元では 1/√2 = 0.707 以下でないと発散する）
const DX_CM = 1;                       // ★ 1 マス = 1 cm（光の速さ c = 3×10⁸ m/s）
const STEPS = 3;                       // 1 フレームに進める歩数
let Ez, Hx, Hy, metal, img, cs, ox, oy, preset = 1, cw = true, lam = 20, antenna = null, pulses = [], n = 0, cwStart = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  img = createImage(NX, NY);
  cs = Math.min((width - 40) / NX, (height - 140) / NY); ox = (width - NX * cs) / 2; oy = 110;
  makePreset(1);
  selfTest();
}
function makePreset(p) {
  preset = p; let g = newGrid(NX, NY); Ez = g.Ez; Hx = g.Hx; Hy = g.Hy; metal = g.metal; pulses = []; n = 0; cwStart = 0;
  if (p === 2) for (let j = 10; j < NY - 10; j++) metal[j * NX + 150] = 1;
  if (p === 3) { for (let i = 30; i <= 170; i++) { metal[25 * NX + i] = 1; metal[100 * NX + i] = 1; } for (let j = 25; j <= 100; j++) { metal[j * NX + 30] = 1; metal[j * NX + 170] = 1; } }
  if (p === 4) for (let j = 0; j < NY; j++) if (Math.abs(j - NY / 2) > 6) metal[j * NX + 100] = 1;
  antenna = p === 3 ? [70, 50] : [50, Math.floor(NY / 2)];
}

function draw() {
  background(14, 18, 26);
  for (let s = 0; s < STEPS; s++) {
    if (cw && antenna) Ez[antenna[1] * NX + antenna[0]] += 0.5 * Math.min(1, (n - cwStart) / 80) * Math.sin((2 * Math.PI * SC * (n - cwStart)) / lam);    // 連続波：周波数 = c/λ（ゆっくり始める）
    for (let p of pulses) { let a = (n - p.t0 - 24) / 8; if (Math.abs(a) < 3.5) Ez[p.j * NX + p.i] += 1.2 * Math.exp(-a * a); }
    fdtdStep({ Ez, Hx, Hy, metal, nx: NX, ny: NY }, SC, true);
    if (preset === 3) for (let k = 0; k < NX * NY; k++) Ez[k] *= 0.9997;   // 共振器の壁の小さな損失（ないと共振でどこまでも大きくなる）
    n++;
  }
  pulses = pulses.filter((p) => n - p.t0 < 60);
  img.loadPixels();
  for (let k = 0; k < NX * NY; k++) {
    let v = Math.sign(Ez[k]) * Math.sqrt(Math.min(1, Math.abs(Ez[k]) * 5)), p = 4 * k;   // 弱い波も見えるように √ で強める
    if (metal[k]) { img.pixels[p] = 200; img.pixels[p + 1] = 125; img.pixels[p + 2] = 60; }
    else { img.pixels[p] = 18 + (v > 0 ? 237 * v : 0) + (v < 0 ? -40 * v : 0); img.pixels[p + 1] = 22 + 70 * Math.abs(v); img.pixels[p + 2] = 34 + (v < 0 ? -221 * v : 0) + (v > 0 ? 40 * v : 0); }
    img.pixels[p + 3] = 255;
  }
  img.updatePixels();
  image(img, ox, oy, NX * cs, NY * cs);
  if (cw && antenna) { noFill(); stroke(255, 240, 150); strokeWeight(2); circle(ox + (antenna[0] + 0.5) * cs, oy + (antenna[1] + 0.5) * cs, 12); }
  let fGHz = 30 / (lam * DX_CM), t_ns = (n * SC * DX_CM) / 30;
  noStroke(); fill(235); textSize(17);
  text('1 自由空間　2 金属の壁　3 共振器　4 すき間 ｜ クリック パルス　ドラッグ 金属　スペース アンテナ（' + (cw ? 'ON' : 'OFF') + '）　↑↓ ←→ 波長　C 消す', 20, 34);
  fill(255, 230, 120); textSize(15);
  text('波長 λ = ' + lam + ' cm → 周波数 f = c/λ = ' + fGHz.toFixed(2) + ' GHz　｜　Δt = ' + ((SC * DX_CM) / 3e10 * 1e12).toFixed(1) + ' ps（クーラン数 ' + SC + ' ≤ 1/√2）　時刻 ' + t_ns.toFixed(2) + ' ns', 20, 60);
  fill(170); textSize(13);
  let note = preset === 3 ? '共振器（140 × 75 cm の金属の箱）：定在波になる波長 λ = 2/√((m/140)² + (n/75)²)。(1,1) = ' + cavLam(1, 1).toFixed(1) + '、(2,1) = ' + cavLam(2, 1).toFixed(1) + '、(3,1) = ' + cavLam(3, 1).toFixed(1) + '、(1,2) = ' + cavLam(1, 2).toFixed(1) + ' cm。↑↓ ←→ で合わせると大きくふくらむ'
    : preset === 2 ? '金属の壁で反射：アンテナを ON にすると、行きの波と帰りの波が重なって定在波（節の間隔 = λ/2）' : preset === 4 ? 'すき間（12 cm）を通ると波が回りこむ（回折）。波長をすき間より長く・短くして比べよう' : '1 点から円形に広がる。外の枠では吸いこまれて、ほとんど反射しない';
  text('ヤジー格子：Hx -= S·∂Ez/∂y、Hy += S·∂Ez/∂x、Ez += S·(∂Hy/∂x − ∂Hx/∂y)（S = cΔt/Δx）。' + note, 20, 84, width - 40);
  drawSelfTest(20, height - 14);
}
function cavLam(m, k) { return 2 / Math.sqrt((m / 140) ** 2 + (k / 75) ** 2); }

function cellAt() { let i = Math.floor((mouseX - ox) / cs), j = Math.floor((mouseY - oy) / cs); return i > 0 && j > 0 && i < NX - 1 && j < NY - 1 ? [i, j] : null; }
function mousePressed() { let c = cellAt(); if (!c || metal[c[1] * NX + c[0]]) return; pulses.push({ i: c[0], j: c[1], t0: n }); antenna = c; }
function mouseDragged() { let c = cellAt(); if (!c) return; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { let k = (c[1] + dj) * NX + c[0] + di; metal[k] = 1; Ez[k] = 0; } }
function keyPressed() {
  if (key >= '1' && key <= '4') makePreset(+key);
  if (key === ' ') { cw = !cw; cwStart = n; }
  if (key === UP_ARROW) lam = Math.min(160, lam + 1);
  if (key === DOWN_ARROW) lam = Math.max(6, lam - 1);
  if (key === RIGHT_ARROW) lam = Math.min(160, lam + 10);
  if (key === LEFT_ARROW) lam = Math.max(6, lam - 10);
  if (key === 'c' || key === 'C') { Ez.fill(0); Hx.fill(0); Hy.fill(0); pulses = []; }
  if (key === 'r' || key === 'R') { lam = 20; cw = true; makePreset(preset); }
  return false;
}

// ---- 自己テスト（小さな格子で）
function selfTest() {
  selfTestResults = [];
  check('クーラン条件 cΔt/Δx = ' + SC + ' ≤ 1/√2', SC <= Math.SQRT1_2);
  // (a) 波の速さ：ガウスの山から広がる波の山が x = 30 と 60 を通る時刻
  let N = 181, g = newGrid(N, N), c0 = 90;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) g.Ez[j * N + i] = Math.exp(-((i - c0) ** 2 + (j - c0) ** 2) / (2 * 6 * 6));
  let tA = peakTime(g, c0 + 30, c0, 400), g2 = newGrid(N, N);
  for (let k = 0; k < N * N; k++) g2.Ez[k] = 0;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) g2.Ez[j * N + i] = Math.exp(-((i - c0) ** 2 + (j - c0) ** 2) / (2 * 6 * 6));
  let tB = peakTime(g2, c0 + 60, c0, 400), v = 30 / (tB - tA);
  check('パルスは光の速さで進む（1 歩で S マス、3% 以内）：' + (v / SC).toFixed(3) + ' c', nearRel(v, SC, 0.03));
  // (b) 吸いこむ境界：枠の外へ出たあと、残るエネルギーは少し
  let g3 = newGrid(101, 101), e0 = 0; blob(g3, 50, 50, 3);
  for (let k = 0; k < 40; k++) fdtdStep(g3, SC, true); e0 = energy(g3);
  for (let k = 0; k < 600; k++) fdtdStep(g3, SC, true);
  check('ムーアの境界：波が出ていったあとのエネルギー < 最初の 3%', energy(g3) < 0.03 * e0);
  // (c) 金属の箱：エネルギーは増えも減りもしない
  let g4 = newGrid(41, 31); for (let i = 0; i < 41; i++) { g4.metal[i] = 1; g4.metal[30 * 41 + i] = 1; } for (let j = 0; j < 31; j++) { g4.metal[j * 41] = 1; g4.metal[j * 41 + 40] = 1; }
  blob(g4, 12, 15, 2.5); let first = 0, last = 0;
  for (let k = 0; k < 4000; k++) { fdtdStep(g4, SC, false); let e = energy(g4); if (k < 500) first += e / 500; if (k >= 3500) last += e / 500; }   // 電場と磁場は半歩ずれているので平均で比べる
  check('金属の箱の中：エネルギーは増えも減りもしない（平均が 1% 以内）', first > 0 && nearRel(last, first, 0.01));
  // (d) 共振器の (1,1) モード：周期 = 2/(S·√((1/Lx)² + (1/Ly)²)) 歩
  let g5 = newGrid(41, 31); for (let i = 0; i < 41; i++) { g5.metal[i] = 1; g5.metal[30 * 41 + i] = 1; } for (let j = 0; j < 31; j++) { g5.metal[j * 41] = 1; g5.metal[j * 41 + 40] = 1; }
  for (let j = 1; j < 30; j++) for (let i = 1; i < 40; i++) g5.Ez[j * 41 + i] = Math.sin((Math.PI * i) / 40) * Math.sin((Math.PI * j) / 30);
  let prev = 1, cr = [];
  for (let k = 0; k < 1500; k++) { fdtdStep(g5, SC, false); let e = g5.Ez[15 * 41 + 20]; if (prev > 0 && e <= 0) cr.push(k + prev / (prev - e)); prev = e; }
  let Tm = (cr[cr.length - 1] - cr[0]) / (cr.length - 1), Tth = 2 / (SC * Math.sqrt(1 / 1600 + 1 / 900));
  check('金属の箱の (1,1) 定在波の周期 = 式（1% 以内）', cr.length > 3 && nearRel(Tm, Tth, 0.01));
  // (e) クーラン条件をやぶると発散する
  let g6 = newGrid(30, 30); for (let k = 0; k < 900; k++) g6.Ez[k] = Math.sin(k * 12.9898) * 0.01;
  for (let k = 0; k < 300; k++) fdtdStep(g6, 0.9, false);
  check('S = 0.9（> 1/√2）にすると数値が爆発する（だから条件が必要）', !(energy(g6) < 1e6));
  reportSelfTest();
}
function peakTime(g, i, j, steps) {
  let best = -1, bt = 0, vals = [];
  for (let k = 0; k < steps; k++) { fdtdStep(g, SC, true); vals.push(g.Ez[j * g.nx + i]); }
  for (let k = 1; k < vals.length - 1; k++) if (vals[k] > best) { best = vals[k]; bt = k; }
  let a = vals[bt - 1], b = vals[bt], c = vals[bt + 1];               // 放物線で山の時刻を細かく
  return bt + (0.5 * (a - c)) / (a - 2 * b + c);
}
function blob(g, ci, cj, sg) { for (let j = 1; j < g.ny - 1; j++) for (let i = 1; i < g.nx - 1; i++) g.Ez[j * g.nx + i] = Math.exp(-((i - ci) ** 2 + (j - cj) ** 2) / (2 * sg * sg)); }
function energy(g) { let s = 0; for (let k = 0; k < g.Ez.length; k++) s += g.Ez[k] * g.Ez[k] + g.Hx[k] * g.Hx[k] + g.Hy[k] * g.Hy[k]; return s; }

// ---------- やってみよう ----------
// 1. 1 でクリックしてパルスを出し、円がどれくらいの速さで広がるか確かめよう（1 フレーム 3 歩 × 0.5 マス）
// 2. 2 でアンテナを ON。壁の前にできる定在波の節の間隔は λ/2 になっている？
// 3. 3 の共振器で ↑↓ を押し、(1,1) や (2,1) の波長に合わせると波が大きく育つ（電子レンジの中もこれ）
// 4. 4 のすき間で、波長を 6 cm と 40 cm にして回りこみ方を比べよう
// 5. SC を 0.75 にするとどうなる？（自己テストの最後の項目と同じことが起きる）


// ==================================================
// ここから下は「電磁気の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
function newGrid(nx, ny) { return { nx, ny, Ez: new Float64Array(nx * ny), Hx: new Float64Array(nx * ny), Hy: new Float64Array(nx * ny), metal: new Uint8Array(nx * ny) }; }
// ---- FDTD の 1 歩（Ez, Hx, Hy は「真空のインピーダンス」でそろえた単位、S = cΔt/Δx）。mur = true なら外の枠で吸いこむ
function fdtdStep(g, S, mur) {
  let nx = g.nx, ny = g.ny, Ez = g.Ez, Hx = g.Hx, Hy = g.Hy;
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx; i++) { let k = j * nx + i; Hx[k] -= S * (Ez[k + nx] - Ez[k]); }       // 磁場を半歩
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx - 1; i++) { let k = j * nx + i; Hy[k] += S * (Ez[k + 1] - Ez[k]); }
  let old = mur ? { l0: col(Ez, nx, ny, 0), l1: col(Ez, nx, ny, 1), r0: col(Ez, nx, ny, nx - 1), r1: col(Ez, nx, ny, nx - 2), t0: Ez.slice(0, 2 * nx), b0: Ez.slice((ny - 2) * nx) } : null;
  for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {                                                             // 電場を半歩
    let k = j * nx + i;
    Ez[k] = g.metal[k] ? 0 : Ez[k] + S * (Hy[k] - Hy[k - 1] - Hx[k] + Hx[k - nx]);
  }
  if (!mur) return;
  let a = (S - 1) / (S + 1);                                                                                                       // ムーアの 1 次の吸収境界
  for (let j = 0; j < ny; j++) {
    Ez[j * nx] = old.l1[j] + a * (Ez[j * nx + 1] - old.l0[j]);
    Ez[j * nx + nx - 1] = old.r1[j] + a * (Ez[j * nx + nx - 2] - old.r0[j]);
  }
  for (let i = 0; i < nx; i++) {
    Ez[i] = old.t0[nx + i] + a * (Ez[nx + i] - old.t0[i]);
    Ez[(ny - 1) * nx + i] = old.b0[i] + a * (Ez[(ny - 2) * nx + i] - old.b0[nx + i]);
  }
}
function col(A, nx, ny, i) { let c = new Float64Array(ny); for (let j = 0; j < ny; j++) c[j] = A[j * nx + i]; return c; }
// ---- 描く道具（どのスケッチも同じ）
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
function polyline(pts) {               // 点が 2 つ以上あるときだけ折れ線を描く（[[x, y], ...]）
  if (!pts || pts.length < 2) return;
  beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape();
}
function arrowTo(x1, y1, x2, y2, hs) {  // (x1, y1) → (x2, y2) の矢印。hs = 矢じりの大きさ
  let dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy);
  if (!(L > 0.5)) return;
  line(x1, y1, x2, y2);
  let ux = dx / L, uy = dy / L, h = Math.min(hs || 8, L * 0.5);
  line(x2, y2, x2 - h * ux + h * 0.5 * uy, y2 - h * uy - h * 0.5 * ux);
  line(x2, y2, x2 - h * ux - h * 0.5 * uy, y2 - h * uy + h * 0.5 * ux);
}
const SUP = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
function sci(v, d) {                   // 0.000032 → "3.20×10⁻⁵"（大きい数・小さい数を読みやすく）
  if (!isFinite(v)) return '—';
  if (v === 0) return '0';
  let sig = d === undefined ? 3 : d, e = Math.floor(Math.log10(Math.abs(v)));
  if (e >= -2 && e <= 3) return v.toFixed(Math.max(0, sig - 1 - e));
  let m = v / Math.pow(10, e);
  return m.toFixed(sig - 1) + '×10' + String(e).split('').map((c) => SUP[c]).join('');
}
// グラフの枠：g = { x, y, w, h }。lo〜hi の範囲で、数字の配列 arr を左から右へ（cap 個ぶん）
function plotFrame(g, title, lo, hi) {
  noFill(); stroke(70, 80, 100); strokeWeight(1); rect(g.x, g.y, g.w, g.h);
  if (lo < 0 && hi > 0) { let y0 = g.y + g.h * (hi / (hi - lo)); stroke(70, 80, 100, 160); line(g.x, y0, g.x + g.w, y0); }
  noStroke(); fill(200); textSize(13); text(title, g.x + 4, g.y - 6);
  fill(140); textSize(11); text(sci(hi, 2), g.x + g.w + 4, g.y + 10); text(sci(lo, 2), g.x + g.w + 4, g.y + g.h);
}
function plotTrace(g, arr, lo, hi, cap) {
  if (!arr || arr.length < 2) return;
  noFill(); beginShape();
  for (let i = 0; i < arr.length; i++) vertex(g.x + (i / (cap - 1)) * g.w, g.y + g.h - clampv((arr[i] - lo) / (hi - lo), 0, 1) * g.h);
  endShape();
}
function pushCap(arr, v, cap) { arr.push(v); if (arr.length > cap) arr.shift(); }
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function nearRel(a, b, rel) { return near(a, b, Math.abs(b) * rel); }   // 相対誤差 rel 以内
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) {
  noStroke(); textSize(13);
  if (selfTestResults.length > 0 && selfTestResults.every((r) => r.ok)) fill(120, 220, 160); else fill(255, 100, 90);
  text(selfTestLine(), x, y);
}
