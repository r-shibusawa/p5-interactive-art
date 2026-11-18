// ============================================
// 01 電場と電位 ─ 電気力線と等電位線を「計算」して描く
// 電場 E と電位 V は、どの点でも全部の電荷の重ね合わせ（クーロンの法則）：E = Σ kq r̂ / r²、V = Σ kq / r
// 電気力線 = E の向きに少しずつ進んだ道（ルンゲ・クッタ法 RK4）。等電位線 = V が同じ所（格子でマーチング・スクエア）
// ドラッグ = 電荷を動かす / 1〜4 = 並べ方 / A・N = ＋・− を追加 / F = 符号 / ↑↓ = 大きさ / C = 色 / L = 線
// ============================================

const KC = 8.988e9;                    // クーロン定数 k = 1/(4πε0) [N·m²/C²]
const PX_M = 0.001;                    // ★ 1 px = 1 mm（画面の横 1280 px = 1.28 m）
const SOFT = 0.004;                    // ★ 電荷のすぐ近くで無限大にしない「やわらげ」[m]（自己テストでは 0）
const LINES_PER_UC = 12;               // ★ 1 μC あたりの電気力線の本数
const CELL = 8;                        // 電位の色地図の 1 マス [px]
let charges = [], grab = -1, showMap = true, showLines = true, dirty = true, preset = 1;
let lay, mapImg, NX, NY, Vgrid;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  lay = createGraphics(width, height); lay.pixelDensity(1);
  NX = Math.ceil(width / CELL) + 1; NY = Math.ceil(height / CELL) + 1;
  mapImg = createImage(NX, NY); Vgrid = new Float64Array(NX * NY);
  setPreset(1);
  selfTest();
}

function setPreset(n) {
  preset = n; let cx = width / 2, cy = height / 2 + 30;
  if (n === 1) charges = [{ x: cx - 120, y: cy, q: 1 }, { x: cx + 120, y: cy, q: -1 }];             // 双極子
  if (n === 2) charges = [{ x: cx - 120, y: cy, q: 1 }, { x: cx + 120, y: cy, q: 1 }];              // 同じ符号 2 つ
  if (n === 3) charges = [{ x: cx - 110, y: cy - 110, q: 1 }, { x: cx + 110, y: cy - 110, q: -1 }, { x: cx + 110, y: cy + 110, q: 1 }, { x: cx - 110, y: cy + 110, q: -1 }];   // 四重極
  if (n === 4) charges = [{ x: cx - 160, y: cy + 60, q: 2 }, { x: cx + 140, y: cy - 80, q: -1 }, { x: cx + 100, y: cy + 140, q: -0.5 }];
  dirty = true;
}

function draw() {
  background(14, 18, 26);
  if (dirty) { rebuild(); dirty = false; }
  if (showMap) { image(mapImg, -CELL / 2, -CELL / 2, NX * CELL, NY * CELL); }
  image(lay, 0, 0);
  for (let c of charges) {
    noStroke(); fill(c.q > 0 ? color(240, 90, 70) : color(70, 150, 250));
    circle(c.x, c.y, 14 + 6 * Math.sqrt(Math.abs(c.q)));
    fill(255); textAlign(CENTER, CENTER); textSize(16); text(c.q > 0 ? '+' : '−', c.x, c.y - 1); textAlign(LEFT, BASELINE);
    fill(230); textSize(12); text((c.q > 0 ? '+' : '') + c.q.toFixed(1) + ' μC', c.x + 14, c.y - 12);
  }
  // マウスの位置の E と V
  let [ex, ey] = fieldAt(charges, mouseX, mouseY, SOFT), Em = Math.hypot(ex, ey), Vm = potAt(charges, mouseX, mouseY, SOFT);
  if (Em > 0) { stroke(255, 230, 120); strokeWeight(2); arrowTo(mouseX, mouseY, mouseX + (ex / Em) * 40, mouseY + (ey / Em) * 40, 9); }
  noStroke(); fill(0, 0, 0, 150); rect(10, 10, 770, 106, 6);
  fill(235); textSize(17);
  text('1 双極子　2 同じ符号　3 四重極　4 3 つ ｜ ドラッグで移動　A・N 追加　F 符号　↑↓ 大きさ　C 色　L 線', 20, 34);
  fill(255, 230, 120); textSize(16);
  text('マウスの所：|E| = ' + sci(Em) + ' N/C（= V/m）　V = ' + sci(Vm / 1000) + ' kV', 20, 60);
  fill(170); textSize(13);
  text('電荷は μC、1 px = 1 mm（点電荷の 3 次元の場の、電荷をふくむ平面での断面）。赤 = 電位が高い、青 = 低い。白線 = 電気力線、黄線 = 等電位線（' + LEVELS_KV.join(', ') + ' kV と 0）', 20, 84, 740);
  drawSelfTest(20, height - 14);
}

// 色地図・等電位線・電気力線を作り直す（電荷が動いたときだけ）
const LEVELS_KV = [5, 10, 20, 40, 80, 160];
function rebuild() {
  mapImg.loadPixels();
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    let V = potAt(charges, i * CELL, j * CELL, SOFT), k = j * NX + i, p = 4 * k;
    Vgrid[k] = V;
    let s = Math.sign(V) * clampv(Math.log10(1 + Math.abs(V) / 2000) / 2.3, 0, 1);   // 符号つきの対数で 0〜1
    mapImg.pixels[p] = 20 + (s > 0 ? 200 * s : 0); mapImg.pixels[p + 1] = 26 + 40 * Math.abs(s); mapImg.pixels[p + 2] = 36 + (s < 0 ? -210 * s : 0); mapImg.pixels[p + 3] = 255;
  }
  mapImg.updatePixels();
  lay.clear();
  if (!showLines) return;
  lay.strokeWeight(1.5); lay.stroke(255, 220, 90, 190);
  for (let L of LEVELS_KV.concat(LEVELS_KV.map((v) => -v), [0])) for (let s of marchingSquares(Vgrid, NX, NY, L * 1000)) lay.line(s[0] * CELL, s[1] * CELL, s[2] * CELL, s[3] * CELL);
  lay.stroke(240, 245, 255, 210); lay.strokeWeight(1.3); lay.noFill();
  for (let path of allFieldLines(charges)) { lay.beginShape(); for (let p of path) lay.vertex(p[0], p[1]); lay.endShape(); }
}
function allFieldLines(cs) {
  let pos = cs.filter((c) => c.q > 0).reduce((a, c) => a + c.q, 0), neg = cs.filter((c) => c.q < 0).reduce((a, c) => a - c.q, 0);
  let dir = pos >= neg ? 1 : -1, out = [];      // 多いほうの符号から出発（＋は E の向き、− は逆向きにたどる）
  for (let c of cs) {
    if (Math.sign(c.q) !== dir) continue;
    let n = Math.max(4, Math.round(LINES_PER_UC * Math.abs(c.q)));
    for (let k = 0; k < n; k++) { let a = (TWO_PI * (k + 0.5)) / n; let path = traceLine(cs, c.x + 10 * Math.cos(a), c.y + 10 * Math.sin(a), dir, 4, 700); if (path.length > 1) out.push(path); }
  }
  return out;
}

function mousePressed() {
  grab = -1; let best = 22;
  charges.forEach((c, i) => { let d = Math.hypot(c.x - mouseX, c.y - mouseY); if (d < best) { best = d; grab = i; } });
}
function mouseDragged() { if (grab >= 0) { charges[grab].x = clampv(mouseX, 5, width - 5); charges[grab].y = clampv(mouseY, 5, height - 5); dirty = true; } }
function mouseReleased() { grab = -1; }
function nearestCharge() { let b = -1, bd = 1e9; charges.forEach((c, i) => { let d = Math.hypot(c.x - mouseX, c.y - mouseY); if (d < bd) { bd = d; b = i; } }); return b; }
function keyPressed() {
  if (key >= '1' && key <= '4') setPreset(+key);
  if ((key === 'a' || key === 'A' || key === 'n' || key === 'N') && charges.length < 8) {
    let x = clampv(mouseX, 20, width - 20), y = clampv(mouseY, 120, height - 20);
    if (charges.every((c) => Math.hypot(c.x - x, c.y - y) > 20)) charges.push({ x, y, q: key === 'a' || key === 'A' ? 1 : -1 });
  }
  let i = nearestCharge();
  if (i >= 0 && (key === 'f' || key === 'F')) charges[i].q *= -1;
  if (i >= 0 && key === UP_ARROW) charges[i].q = Math.sign(charges[i].q) * Math.min(4, Math.abs(charges[i].q) + 0.5);
  if (i >= 0 && key === DOWN_ARROW) charges[i].q = Math.sign(charges[i].q) * Math.max(0.5, Math.abs(charges[i].q) - 0.5);
  if (key === 'c' || key === 'C') showMap = !showMap;
  if (key === 'l' || key === 'L') showLines = !showLines;
  dirty = true;
}

// ---- 自己テスト：式で計算できる値と比べる
function selfTest() {
  selfTestResults = [];
  let a = 50, q = 1, dip = [{ x: a, y: 0, q }, { x: -a, y: 0, q: -q }], x = 300;
  let exact = KC * q * 1e-6 * (1 / sqM((x - a) * PX_M) - 1 / sqM((x + a) * PX_M));
  check('双極子の軸の上の E が式 kq(1/(x−a)² − 1/(x+a)²) と一致', nearRel(fieldAt(dip, x, 0, 0)[0], exact, 1e-12));
  let xf = 20 * 2 * a, p = q * 1e-6 * 2 * a * PX_M;
  check('遠くでは E ≈ 2kp/x³（双極子の近似、1% 以内）', nearRel(fieldAt(dip, xf, 0, 0)[0], (2 * KC * p) / Math.pow(xf * PX_M, 3), 0.01));
  let ok = true, cs = [{ x: 0, y: 0, q: 1 }, { x: 140, y: 60, q: -2 }, { x: -90, y: 120, q: 0.5 }];
  for (let [px, py] of [[50, -40], [200, 200], [-150, 30]]) {
    let h = 0.01, e = fieldAt(cs, px, py, 0);
    let gx = -(potAt(cs, px + h, py, 0) - potAt(cs, px - h, py, 0)) / (2 * h * PX_M), gy = -(potAt(cs, px, py + h, 0) - potAt(cs, px, py - h, 0)) / (2 * h * PX_M);
    if (!nearRel(gx, e[0], 1e-5) || !nearRel(gy, e[1], 1e-5)) ok = false;
  }
  check('E = −∇V（電位の差から求めた E と一致）', ok);
  check('双極子のまん中の垂直な線の上は V = 0', [0, 50, 300].every((y) => Math.abs(potAt(dip, 0, y, 0)) < 1e-6));
  let path = traceLine(dip, a - 10, 2, 1, 2, 3000), end = path[path.length - 1];
  check('＋から出た電気力線（RK4）は − にたどり着く', Math.hypot(end[0] + a, end[1]) < 14);
  let nx = 41, g = new Float64Array(nx * nx);
  for (let j = 0; j < nx; j++) for (let i = 0; i < nx; i++) g[j * nx + i] = (i - 20) * (i - 20) + (j - 20) * (j - 20);
  let segs = marchingSquares(g, nx, nx, 144);
  check('マーチング・スクエア：r² = 144 の等高線は半径 12 の円（1% 以内）', segs.length > 20 && segs.every((s) => Math.abs(Math.hypot(s[0] - 20, s[1] - 20) - 12) < 0.12 * 1.5));
  check('ガウスの法則（3 次元）：球面を通る電束 = q/ε0、双極子なら 0', nearRel(sphereFlux([{ x: 30, y: 10, q: 1 }], 200), (q * 1e-6) * 4 * Math.PI * KC, 0.005) && Math.abs(sphereFlux(dip, 200)) < 0.005 * (q * 1e-6) * 4 * Math.PI * KC);
  reportSelfTest();
}
function sqM(v) { return v * v; }
// 原点を中心とする半径 r [px] の球面で E·n を数値積分（緯度 60 × 経度 120 のます目）。電荷は z = 0 の平面
function sphereFlux(cs, r) {
  let s = 0, nt = 60, np = 120, R = r * PX_M;
  for (let a = 0; a < nt; a++) for (let b = 0; b < np; b++) {
    let th = (Math.PI * (a + 0.5)) / nt, ph = (2 * Math.PI * (b + 0.5)) / np;
    let nx = Math.sin(th) * Math.cos(ph), ny = Math.sin(th) * Math.sin(ph), nz = Math.cos(th);
    let ex = 0, ey = 0, ez = 0;
    for (let c of cs) {
      let dx = (r * nx - c.x) * PX_M, dy = (r * ny - c.y) * PX_M, dz = r * nz * PX_M, d = Math.hypot(dx, dy, dz), f = (KC * c.q * 1e-6) / (d * d * d);
      ex += f * dx; ey += f * dy; ez += f * dz;
    }
    s += (ex * nx + ey * ny + ez * nz) * R * R * Math.sin(th) * (Math.PI / nt) * ((2 * Math.PI) / np);
  }
  return s;
}

// ---------- やってみよう ----------
// 1. 1 の双極子で、＋の電荷を ↑ で 2 μC にすると、− に入らない電気力線はどこへ行く？
// 2. 2（同じ符号）のまん中の点で E はいくつ？ そこを通る等電位線はどんな形？
// 3. 電気力線と等電位線は、どこでも直角に交わっている？ どうしてだろう
// 4. LINES_PER_UC を変えて、線の混み具合 = 電場の強さ になっていることを確かめよう
// 5. A と N で電荷を 6 個並べて、好きな「場の模様」を作ろう（C で色を消すと線画になる）


// ==================================================
// ここから下は「電磁気の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 点電荷の電場と電位（電荷は { x, y [px], q [μC] }、結果は N/C と V）
function fieldAt(cs, x, y, soft) {
  let ex = 0, ey = 0;
  for (let c of cs) {
    let dx = (x - c.x) * PX_M, dy = (y - c.y) * PX_M, r2 = dx * dx + dy * dy + soft * soft;
    if (r2 === 0) continue;
    let f = (KC * c.q * 1e-6) / (r2 * Math.sqrt(r2));
    ex += f * dx; ey += f * dy;
  }
  return [ex, ey];
}
function potAt(cs, x, y, soft) {
  let v = 0;
  for (let c of cs) { let dx = (x - c.x) * PX_M, dy = (y - c.y) * PX_M, r = Math.sqrt(dx * dx + dy * dy + soft * soft); if (r > 0) v += (KC * c.q * 1e-6) / r; }
  return v;
}
// ---- 電気力線：単位ベクトル E/|E| の向きに RK4 で h [px] ずつ進む。dir = −1 なら逆向き。電荷に着くか画面の外で止まる
function traceLine(cs, x, y, dir, h, maxN) {
  let pts = [[x, y]];
  let u = (px, py) => { let e = fieldAt(cs, px, py, SOFT), m = Math.hypot(e[0], e[1]); return m > 0 ? [(dir * e[0]) / m, (dir * e[1]) / m] : [0, 0]; };
  for (let n = 0; n < maxN; n++) {
    let k1 = u(x, y), k2 = u(x + (h / 2) * k1[0], y + (h / 2) * k1[1]), k3 = u(x + (h / 2) * k2[0], y + (h / 2) * k2[1]), k4 = u(x + h * k3[0], y + h * k3[1]);
    x += (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]); y += (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
    if (!isFinite(x) || !isFinite(y)) break;
    pts.push([x, y]);
    if (x < -200 || y < -200 || x > width + 200 || y > height + 200) break;
    if (cs.some((c) => Math.sign(c.q) === -dir && Math.hypot(c.x - x, c.y - y) < 6)) break;
  }
  return pts;
}
// ---- マーチング・スクエア：格子の値 g（nx × ny）で、値 = level の線分を [x1, y1, x2, y2]（格子の単位）で返す
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
    if (pts.length === 2) segs.push([pts[0][0], pts[0][1], pts[1][0], pts[1][1]]);
    if (pts.length === 4) { segs.push([pts[0][0], pts[0][1], pts[1][0], pts[1][1]]); segs.push([pts[2][0], pts[2][1], pts[3][0], pts[3][1]]); }
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
