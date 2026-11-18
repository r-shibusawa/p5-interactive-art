// ============================================
// 03 導体とコンデンサ ─ ラプラス方程式を「緩和法」で解く
// 導体の電位を決めると、そのあいだの電位 V は ∇²V = 0（どの点も まわり 4 つの平均）。何度もならすと答えに近づく（SOR 法）
// 導体の表面の電場から電荷 Q を求め、電気容量 C = Q / ΔV を計算。2 次元（紙に垂直に長い導体）なので C は 1 m あたり
// 1 平行板 / 2 同軸 / 3 とがった導体 / ←→ = 間隔・大きさ / ドラッグ = 導体を描く / D = 描く電位 / R = 最初から
// ============================================

const EPS0 = 8.854e-12;                // 真空の誘電率 [F/m]
const H_M = 0.001;                     // ★ 格子 1 マス = 1 mm
const NX = 160, NY = 100;              // 格子の数
const OMEGA = 1.9;                     // ★ SOR の加速の強さ（1 = ふつうのガウス・ザイデル、2 未満）
const SWEEPS = 40;                     // ★ 1 フレームでならす回数
let GR, preset = 1, gap = 20, coaxA = 10, tipGap = 18, brush = 0, residual = 1, sweepsDone = 0;
let img, cs, ox = 20, oy = 150, contours = [];
const BRUSH = [{ name: '+100 V の導体', id: 1, v: 100 }, { name: '0 V の導体', id: 2, v: 0 }, { name: '消しゴム', id: 0, v: 0 }];

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  img = createImage(NX, NY);
  cs = Math.max(2, Math.min((width * 0.66 - 30) / NX, (height - 175) / NY));
  build();
  selfTest();
}

// ---- 導体の形を作る。外の枠は 0 V（接地した箱）
function build() {
  GR = makeGrid(NX, NY);
  for (let i = 0; i < NX; i++) { setCond(GR, i, 0, 3, 0); setCond(GR, i, NY - 1, 3, 0); }
  for (let j = 0; j < NY; j++) { setCond(GR, 0, j, 3, 0); setCond(GR, NX - 1, j, 3, 0); }
  let cx = NX / 2, cy = NY / 2;
  if (preset === 1) for (let i = cx - 35; i < cx + 35; i++) { setCond(GR, i, Math.round(cy - gap / 2), 1, 50); setCond(GR, i, Math.round(cy + gap / 2), 2, -50); }
  if (preset === 2) for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { let r = Math.hypot(i - cx, j - cy); if (r <= coaxA) setCond(GR, i, j, 1, 100); else if (r >= 44) setCond(GR, i, j, 2, 0); }
  if (preset === 3) {
    for (let i = 1; i < NX - 1; i++) for (let j = NY - 6; j < NY - 1; j++) setCond(GR, i, j, 2, 0);     // 下の接地した板
    let tipY = NY - 6 - tipGap;                                                                     // とがった先の位置
    for (let j = 8; j <= tipY; j++) { let w = Math.max(0, Math.round(14 * Math.sqrt((tipY - j) / (tipY - 8)))); for (let i = cx - w; i <= cx + w; i++) setCond(GR, i, j, 1, 100); }
    for (let i = 20; i < 50; i++) for (let j = 30; j < NY - 6 - tipGap; j++) if (Math.hypot(i - 35, j - (NY - 6 - tipGap - 10)) < 10) setCond(GR, i, j, 1, 100);   // 比べる：丸い導体
  }
  residual = 1; sweepsDone = 0; contours = [];
}

function draw() {
  background(14, 18, 26);
  if (residual > 1e-6) { for (let s = 0; s < SWEEPS; s++) residual = sorSweep(GR, OMEGA); sweepsDone += SWEEPS; if (frameCount % 6 === 0 || residual <= 1e-6) contours = equipotentials(); }
  // 電位の色
  img.loadPixels();
  for (let k = 0; k < NX * NY; k++) {
    let v = GR.V[k] / 100, p = 4 * k;
    if (GR.cond[k]) { img.pixels[p] = 200; img.pixels[p + 1] = 120; img.pixels[p + 2] = 60; }
    else { img.pixels[p] = 25 + Math.max(0, v) * 220; img.pixels[p + 1] = 30 + 50 * Math.abs(v); img.pixels[p + 2] = 45 + Math.max(0, -v) * 220; }
    img.pixels[p + 3] = 255;
  }
  img.updatePixels();
  noSmooth(); image(img, ox, oy, NX * cs, NY * cs); smooth();
  stroke(255, 230, 120, 170); strokeWeight(1);
  for (let s of contours) line(ox + (s[0] + 0.5) * cs, oy + (s[1] + 0.5) * cs, ox + (s[2] + 0.5) * cs, oy + (s[3] + 0.5) * cs);
  // 電場の矢印（−∇V）と、いちばん強い所
  let Emax = 0, mi = 0, mj = 0;
  for (let j = 1; j < NY - 1; j++) for (let i = 1; i < NX - 1; i++) {
    let k = j * NX + i; if (GR.cond[k]) continue;
    let ex = -(GR.V[k + 1] - GR.V[k - 1]) / (2 * H_M), ey = -(GR.V[k + NX] - GR.V[k - NX]) / (2 * H_M), m = Math.hypot(ex, ey);
    if (m > Emax) { Emax = m; mi = i; mj = j; }
    if (i % 5 === 2 && j % 5 === 2 && m > 100) { stroke(230, 240, 255, clampv(40 + m / 400, 40, 230)); arrowTo(ox + (i + 0.5) * cs, oy + (j + 0.5) * cs, ox + (i + 0.5) * cs + (ex / m) * 2.2 * cs, oy + (j + 0.5) * cs + (ey / m) * 2.2 * cs, 4); }
  }
  noFill(); stroke(120, 255, 160); strokeWeight(2); circle(ox + (mi + 0.5) * cs, oy + (mj + 0.5) * cs, 18);
  // 数字
  let dV = preset === 1 ? 100 : 100, Q = chargeOf(GR, 1), C = Q / dV;
  let tx = ox + NX * cs + 24, y = oy + 10;
  noStroke(); fill(235); textSize(15);
  let lines = ['ならした回数 ' + sweepsDone + '　変化 ' + sci(residual, 2) + (residual <= 1e-6 ? '（収束）' : ''),
    '＋側の導体の電荷 Q = ' + sci(Q * 1e12) + ' pC/m',
    '電位差 ΔV = ' + dV + ' V',
    '電気容量 C = Q/ΔV = ' + sci(C * 1e12) + ' pF/m',
    'いちばん強い電場（緑の円）|E| = ' + sci(Emax / 1000) + ' kV/m'];
  if (preset === 1) lines.push('平行板の式 ε0·w/d = ' + sci((EPS0 * 70) / gap * 1e12) + ' pF/m（w = 70 mm, d = ' + gap + ' mm）', '→ 式より大きい分は板の端の電場（ふち効果）');
  if (preset === 2) lines.push('同軸の式 2πε0 / ln(b/a) = ' + sci(((2 * Math.PI * EPS0) / Math.log(44 / coaxA)) * 1e12) + ' pF/m（a = ' + coaxA + ', b = 44 mm）');
  if (preset === 3) lines.push('先の電場 ÷ 板の間の平均（100 V ÷ ' + tipGap + ' mm）= ' + (Emax / (100 / (tipGap * H_M))).toFixed(2) + ' 倍', '→ とがった所に電場が集まる（避雷針）');
  for (let s of lines) { text(s, tx, y, width - tx - 10); y += 46; }
  fill(235); textSize(17);
  text('1 平行板　2 同軸　3 とがった導体 ｜ ←→ ' + ['', '板の間隔', '内側の半径', '先と板の距離'][preset] + '　ドラッグ = 導体を描く（D：' + BRUSH[brush].name + '）　R 最初から', 20, 34);
  fill(170); textSize(13);
  text('格子 ' + NX + ' × ' + NY + '（1 マス = 1 mm）。銅色 = 導体（電位が決まっている）、まわりの枠は 0 V。赤 = 電位が高い、青 = 低い。黄線 = 10 V ごとの等電位線、白い矢印 = 電場 E = −∇V', 20, 60, width - 40);
  fill(170); text('どの点もまわり 4 つの平均になるまでくり返す：V ← V + ω·(平均 − V)、ω = ' + OMEGA, 20, 100);
  drawSelfTest(20, height - 14);
}

function equipotentials() {
  let out = [];
  for (let L = -90; L <= 90; L += 10) for (let s of marchingSquares(GR.V, NX, NY, L + 0.001)) out.push(s);
  return out;
}
function mouseDragged() {
  let i = Math.floor((mouseX - ox) / cs), j = Math.floor((mouseY - oy) / cs), b = BRUSH[brush];
  if (i < 1 || j < 1 || i >= NX - 1 || j >= NY - 1) return;
  for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
    let ii = i + di, jj = j + dj; if (ii < 1 || jj < 1 || ii >= NX - 1 || jj >= NY - 1) continue;
    if (b.id === 0) { let k = jj * NX + ii; GR.cond[k] = 0; GR.fix[k] = 0; } else setCond(GR, ii, jj, b.id, b.v);
  }
  residual = 1;
}
function keyPressed() {
  if (key >= '1' && key <= '3') { preset = +key; build(); }
  let d = key === RIGHT_ARROW ? 1 : key === LEFT_ARROW ? -1 : 0;
  if (d) {
    if (preset === 1) gap = clampv(gap + 2 * d, 4, 60);
    if (preset === 2) coaxA = clampv(coaxA + d, 2, 36);
    if (preset === 3) tipGap = clampv(tipGap + 2 * d, 4, 50);
    build();
  }
  if (key === 'd' || key === 'D') brush = (brush + 1) % BRUSH.length;
  if (key === 'r' || key === 'R') { preset = 1; gap = 20; coaxA = 10; tipGap = 18; build(); }
}

// ---- 自己テスト：答えのわかる形で確かめる
function selfTest() {
  selfTestResults = [];
  // (a) 横いっぱいの平行板（左右は「電場が横に出ない」境界）→ 電位はまっすぐ、C = ε0·w/d ぴったり
  let pp = (d) => { let g = makeGrid(30, d + 1); for (let i = 0; i < 30; i++) { setCond(g, i, 0, 1, 100); setCond(g, i, d, 2, 0); } let n = 0, r = 1; while (r > 1e-11 && n < 20000) { r = sorSweep(g, 1.8); n++; } return { g, n, C: chargeOf(g, 1) / 100 }; };
  let a = pp(20), b = pp(10);
  check('緩和法が収束する（変化 < 10⁻¹¹）', a.n < 20000);
  check('平行板のあいだの電位はまっすぐ（一様な電場）', [5, 10, 15].every((j) => near(a.g.V[j * 30 + 13], 100 * (1 - j / 20), 1e-6)));
  check('平行板：C = ε0·w/d（1% 以内）', nearRel(a.C, (EPS0 * 30) / 20, 0.01));
  check('間隔を半分にすると C は 2 倍', nearRel(b.C / a.C, 2, 0.01));
  // (b) 同軸：C = 2πε0 / ln(b/a)
  let g = makeGrid(72, 72);
  for (let j = 0; j < 72; j++) for (let i = 0; i < 72; i++) { let r = Math.hypot(i - 35.5, j - 35.5); if (r <= 8) setCond(g, i, j, 1, 1); else if (r >= 32) setCond(g, i, j, 2, 0); }
  let r = 1, n = 0; while (r > 1e-10 && n < 20000) { r = sorSweep(g, 1.85); n++; }
  let Cc = chargeOf(g, 1);
  check('同軸：C = 2πε0/ln(b/a)（格子のでこぼこで 5% 以内）', nearRel(Cc, (2 * Math.PI * EPS0) / Math.log(4), 0.05));
  check('同軸：内側の電荷 = −外側の電荷（電気力線は全部 外へ着く）', nearRel(chargeOf(g, 2), -Cc, 0.01));
  let mv = 0; for (let j = 1; j < 71; j++) for (let i = 1; i < 71; i++) { let k = j * 72 + i; if (!g.fix[k]) mv = Math.max(mv, Math.abs(g.V[k] - 0.25 * (g.V[k - 1] + g.V[k + 1] + g.V[k - 72] + g.V[k + 72]))); }
  check('答えでは どの点も まわり 4 つの平均（ラプラス方程式）', mv < 1e-8);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 平行板で ←→ を押して間隔 d を変え、C が 1/d に比例するか表にしよう（ふち効果でずれるのはいつ？）
// 2. 3 のとがった導体で、先の電場は丸い導体の所の何倍？ 雷が高い所に落ちやすい理由を考えよう
// 3. OMEGA を 1.0 と 1.95 にして、収束するまでの回数を比べよう（SOR の効果）
// 4. 2 の同軸で a を変え、C が ln(b/a) に反比例するか確かめよう
// 5. D で 0 V の導体を選び、平行板のあいだに描いて「静電遮へい」を作ろう


// ==================================================
// ここから下は「電磁気の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 格子：V = 電位、fix = 1 なら電位が決まっている、cond = 導体の番号（0 = なし）
function makeGrid(nx, ny) { return { nx, ny, V: new Float64Array(nx * ny), fix: new Int8Array(nx * ny), cond: new Int8Array(nx * ny) }; }
function setCond(g, i, j, id, v) { if (i < 0 || j < 0 || i >= g.nx || j >= g.ny) return; let k = j * g.nx + i; g.cond[k] = id; g.fix[k] = 1; g.V[k] = v; }
// ---- SOR を 1 回：決まっていない点を「まわり 4 つの平均」へ ω 倍だけ近づける。格子の外は鏡（電場が出ない境界）。いちばん大きい変化を返す
function sorSweep(g, w) {
  let nx = g.nx, ny = g.ny, V = g.V, mx = 0;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    let k = j * nx + i; if (g.fix[k]) continue;
    let l = i > 0 ? V[k - 1] : V[k + 1], r = i < nx - 1 ? V[k + 1] : V[k - 1], u = j > 0 ? V[k - nx] : V[k + nx], d = j < ny - 1 ? V[k + nx] : V[k - nx];
    let dv = w * (0.25 * (l + r + u + d) - V[k]);
    V[k] += dv; if (Math.abs(dv) > mx) mx = Math.abs(dv);
  }
  return mx;
}
// ---- 導体 id の電荷（1 m あたり）：表面から出る電束 Σ (V導体 − V となり) × ε0（ガウスの法則を格子で）
function chargeOf(g, id) {
  let q = 0, nx = g.nx;
  for (let j = 0; j < g.ny; j++) for (let i = 0; i < nx; i++) {
    let k = j * nx + i; if (g.cond[k] !== id) continue;
    for (let [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      let ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= nx || jj >= g.ny) continue;
      let kk = jj * nx + ii; if (g.cond[kk] !== id) q += g.V[k] - g.V[kk];
    }
  }
  return q * EPS0;
}
// ---- マーチング・スクエア：値 = level の線分 [x1, y1, x2, y2]（格子の単位）
function marchingSquares(g, nx, ny, level) {
  let segs = [];
  let at = (a, b, ia, ja, ib, jb) => { let t = (level - a) / (b - a); return [ia + t * (ib - ia), ja + t * (jb - ja)]; };
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let v0 = g[j * nx + i], v1 = g[j * nx + i + 1], v2 = g[(j + 1) * nx + i + 1], v3 = g[(j + 1) * nx + i];
    let pts = [];
    if ((v0 > level) !== (v1 > level)) pts.push(at(v0, v1, i, j, i + 1, j));
    if ((v1 > level) !== (v2 > level)) pts.push(at(v1, v2, i + 1, j, i + 1, j + 1));
    if ((v2 > level) !== (v3 > level)) pts.push(at(v2, v3, i + 1, j + 1, i, j + 1));
    if ((v3 > level) !== (v0 > level)) pts.push(at(v3, v0, i, j + 1, i, j));
    if (pts.length >= 2) segs.push([pts[0][0], pts[0][1], pts[1][0], pts[1][1]]);
    if (pts.length === 4) segs.push([pts[2][0], pts[2][1], pts[3][0], pts[3][1]]);
  }
  return segs;
}
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
