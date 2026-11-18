// ============================================
// 15 カメラ映像を電荷に ─ 明るい所は ＋、暗い所は − の電荷とみなして電場を描く
// 画素の明るさ − 平均 = 電荷密度 ρ（全体ではちょうど 0）。ポアソン方程式 ∇²V = −ρ/ε0 を緩和法（SOR）で解く
// 毎フレーム前の答えから少しだけならすので、映像が動いても電位がついてくる。まわりの枠は 0 V（接地した箱）
// 1 = 電位の色 / 2 = 電気力線 / 3 = 両方 / ↑↓ = ならす回数 / ←→ = 線の数 / V = カメラ ⇔ テスト画像 / S = 保存
// ============================================

const GW = 80, GH = 60;                // 計算の格子（カメラを小さくして使う）
const OMEGA = 1.85;                    // ★ SOR の加速
let sweeps = 30, view = 3, nLines = 60, useCam = true, cap, test, Vg, rho, img, residual = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  cap = createCapture(VIDEO, { flipped: true }); cap.size(GW, GH); cap.hide();
  Vg = new Float64Array(GW * GH); rho = new Float64Array(GW * GH); img = createImage(GW, GH);
  test = makeTestImage();
  selfTest();
}

function draw() {
  background(14, 18, 26);
  let live = useCam && cap && cap.width > 0 && cap.elt.readyState >= 2 && cap.elt.videoWidth > 0, src = test;
  if (live) { cap.loadPixels(); if (cap.pixels.length >= GW * GH * 4) src = cap.pixels; else live = false; }
  // 明るさ → 電荷密度（平均を引いて全体を 0 に）
  let sum = 0;
  for (let k = 0; k < GW * GH; k++) { rho[k] = (0.299 * src[4 * k] + 0.587 * src[4 * k + 1] + 0.114 * src[4 * k + 2]) / 255; sum += rho[k]; }
  let mean = sum / (GW * GH);
  for (let k = 0; k < GW * GH; k++) rho[k] = (rho[k] - mean) * 4;
  for (let s = 0; s < sweeps; s++) residual = poissonSweep(Vg, rho, GW, GH, OMEGA);
  let sc = Math.min((width - 40) / GW, (height - 130) / GH), ox = (width - GW * sc) / 2, oy = 90;
  // 下じき：カメラ（うすく）か 電位の色
  let vmax = 1e-9; for (let k = 0; k < GW * GH; k++) vmax = Math.max(vmax, Math.abs(Vg[k]));
  img.loadPixels();
  for (let k = 0; k < GW * GH; k++) {
    let p = 4 * k, v = Vg[k] / vmax, y = rho[k] / 4 + mean;
    if (view === 2) { img.pixels[p] = img.pixels[p + 1] = img.pixels[p + 2] = 30 + 90 * y; }
    else { img.pixels[p] = 20 + (v > 0 ? 220 * v : 0) + 30 * y; img.pixels[p + 1] = 24 + 70 * Math.abs(v) + 30 * y; img.pixels[p + 2] = 36 + (v < 0 ? -220 * v : 0) + 30 * y; }
    img.pixels[p + 3] = 255;
  }
  img.updatePixels();
  image(img, ox, oy, GW * sc, GH * sc);
  if (view !== 1) {
    stroke(255, 240, 200, 200); strokeWeight(1.3); noFill();
    for (let sd of seeds()) { let path = traceE(sd[0], sd[1]); if (path.length > 2) { beginShape(); for (let q of path) vertex(ox + q[0] * sc, oy + q[1] * sc); endShape(); } }
  }
  noStroke(); fill(235); textSize(17);
  text((live ? 'カメラ' : 'テスト画像（V でカメラ）') + '　｜ 1 電位の色　2 電気力線　3 両方　↑↓ ならす回数（' + sweeps + '）　←→ 線の数（' + nLines + '）　V 切りかえ　S 保存', 20, 34);
  fill(170); textSize(13);
  text('格子 ' + GW + ' × ' + GH + '（ε0 = 1、1 マス = 1 の単位）。明るい = ＋の電荷（赤い電位）、暗い = −（青）。電気力線は明るい所から出て暗い所へ入る。1 回ならしたときの変化 ' + sci(residual, 2), 20, 60, width - 40);
  drawSelfTest(20, height - 14);
}

// 電気力線の出発点：電荷がいちばん多い ＋ の所から nLines 個（近すぎる所はとばす）
function seeds() {
  let idx = []; for (let j = 2; j < GH - 2; j++) for (let i = 2; i < GW - 2; i++) if (rho[j * GW + i] > 0.2) idx.push(j * GW + i);
  idx.sort((a, b) => rho[b] - rho[a]);
  let out = [];
  for (let k of idx) { let x = k % GW, y = Math.floor(k / GW); if (out.every((p) => Math.abs(p[0] - x) + Math.abs(p[1] - y) > 4)) out.push([x + 0.3, y + 0.3]); if (out.length >= nLines) break; }
  return out;
}
function traceE(x, y) {
  let pts = [[x, y]], h = 0.5;
  for (let n = 0; n < 300; n++) {
    let u = (px, py) => { let e = gradE(px, py), m = Math.hypot(e[0], e[1]); return m > 1e-12 ? [e[0] / m, e[1] / m] : [0, 0]; };
    let k1 = u(x, y), k2 = u(x + (h / 2) * k1[0], y + (h / 2) * k1[1]), k3 = u(x + (h / 2) * k2[0], y + (h / 2) * k2[1]), k4 = u(x + h * k3[0], y + h * k3[1]);
    x += (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]); y += (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
    if (!(x > 1 && y > 1 && x < GW - 2 && y < GH - 2)) break;
    pts.push([x, y]);
    if (rho[Math.round(y) * GW + Math.round(x)] < -0.6) break;           // とても暗い所（強い −）で止める
  }
  return pts;
}
// 格子の電位から E = −∇V（なめらかにつなぐ）
function gradE(x, y) {
  let i = clampv(Math.floor(x), 1, GW - 3), j = clampv(Math.floor(y), 1, GH - 3), u = x - i, v = y - j;
  let ex = (a, b) => -(Vg[b * GW + a + 1] - Vg[b * GW + a - 1]) / 2, ey = (a, b) => -(Vg[(b + 1) * GW + a] - Vg[(b - 1) * GW + a]) / 2;
  let L = (f) => (1 - u) * (1 - v) * f(i, j) + u * (1 - v) * f(i + 1, j) + (1 - u) * v * f(i, j + 1) + u * v * f(i + 1, j + 1);
  return [L(ex), L(ey)];
}

function keyPressed() {
  if (key >= '1' && key <= '3') view = +key;
  if (key === UP_ARROW) sweeps = Math.min(120, sweeps + 10);
  if (key === DOWN_ARROW) sweeps = Math.max(1, sweeps - 10);
  if (key === RIGHT_ARROW) nLines = Math.min(150, nLines + 10);
  if (key === LEFT_ARROW) nLines = Math.max(10, nLines - 10);
  if (key === 'v' || key === 'V') useCam = !useCam;
  if (key === 's' || key === 'S') saveCanvas('camera_field', 'png');
  return false;
}

// テスト画像：明るい丸 2 つと暗い丸 1 つ、ゆるやかな明るさの坂
function makeTestImage() {
  let a = new Uint8ClampedArray(GW * GH * 4);
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
    let v = 90 + 40 * (i / GW);
    if (Math.hypot(i - 22, j - 20) < 8) v = 250;
    if (Math.hypot(i - 55, j - 40) < 6) v = 240;
    if (Math.hypot(i - 50, j - 15) < 9) v = 10;
    let o = 4 * (j * GW + i); a[o] = a[o + 1] = a[o + 2] = v; a[o + 3] = 255;
  }
  return a;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let nx = 33, ny = 25, v = new Float64Array(nx * ny), r = new Float64Array(nx * ny);
  let lam = 4 - 2 * Math.cos(Math.PI / (nx - 1)) - 2 * Math.cos(Math.PI / (ny - 1)), ex = (i, j) => Math.sin((Math.PI * i) / (nx - 1)) * Math.sin((Math.PI * j) / (ny - 1));
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) r[j * nx + i] = lam * ex(i, j);
  let n = 0, res = 1; while (res > 1e-12 && n < 5000) { res = poissonSweep(v, r, nx, ny, 1.8); n++; }
  let err = 0; for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) err = Math.max(err, Math.abs(v[j * nx + i] - ex(i, j)));
  check('ポアソン方程式：答えのわかる形（sin × sin）を 10⁻⁸ 以内で再現', err < 1e-8);
  let flux = 0, q = 0, i0 = 5, i1 = 20, j0 = 4, j1 = 15;                  // 長方形の中の電荷 = まわりから出る電束（格子のガウスの法則）
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) q += r[j * nx + i];
  for (let j = j0; j <= j1; j++) flux += (v[j * nx + i0] - v[j * nx + i0 - 1]) + (v[j * nx + i1] - v[j * nx + i1 + 1]);
  for (let i = i0; i <= i1; i++) flux += (v[j0 * nx + i] - v[(j0 - 1) * nx + i]) + (v[j1 * nx + i] - v[(j1 + 1) * nx + i]);
  check('格子のガウスの法則：中の電荷の合計 = まわりから出る電束', nearRel(flux, q, 1e-6));
  let p = new Float64Array(31 * 31), rp = new Float64Array(31 * 31); rp[15 * 31 + 15] = 1;
  for (let k = 0; k < 3000; k++) poissonSweep(p, rp, 31, 31, 1.8);
  let mxk = 0; for (let k = 0; k < p.length; k++) if (p[k] > p[mxk]) mxk = k;
  check('点の電荷：電位はそこでいちばん高く、上下左右で対称', mxk === 15 * 31 + 15 && near(p[15 * 31 + 5], p[15 * 31 + 25], 1e-9) && near(p[5 * 31 + 15], p[15 * 31 + 5], 1e-9));
  let s = 0, t = makeTestImage(), tmp = []; for (let k = 0; k < GW * GH; k++) tmp.push(t[4 * k] / 255); let m = tmp.reduce((a, b) => a + b, 0) / tmp.length; for (let x of tmp) s += x - m;
  check('明るさ − 平均 → 電荷の合計はちょうど 0', Math.abs(s) < 1e-9);
  let Vs = Vg; Vg = new Float64Array(GW * GH); for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) Vg[j * GW + i] = 3 * i - 2 * j;
  let e = gradE(30.4, 20.7); Vg = Vs;
  check('E = −∇V：V = 3x − 2y なら E = (−3, 2)', near(e[0], -3, 1e-9) && near(e[1], 2, 1e-9));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 白い紙を 1 枚カメラに見せると、そこから電気力線が出る。黒いペンで点を描くと？
// 2. 1 の電位の色で、明るい所・暗い所のまわりの「山」と「谷」を見よう
// 3. ↓ でならす回数を 1 にすると、動いたときに電位がおくれてついてくる。なぜ？
// 4. 明るさの代わりに「赤 − 青」を電荷にすると、どんな絵になる？（rho の計算を変える）
// 5. S で保存して、電気力線のポスターを作ろう


// ==================================================
// ここから下は「電磁気の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- SOR を 1 回：∇²V = −ρ（格子の幅 1、ε0 = 1）。枠は 0 V。いちばん大きい変化を返す
function poissonSweep(Vg, rho, nx, ny, w) {
  let mx = 0;
  for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    let k = j * nx + i, nv = 0.25 * (Vg[k - 1] + Vg[k + 1] + Vg[k - nx] + Vg[k + nx] + rho[k]), d = w * (nv - Vg[k]);
    Vg[k] += d; if (Math.abs(d) > mx) mx = Math.abs(d);
  }
  return mx;
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
