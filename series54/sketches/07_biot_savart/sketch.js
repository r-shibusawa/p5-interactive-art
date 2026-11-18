// ============================================
// 07 電流のつくる磁場 ─ ビオ・サバールの法則を数値で足し合わせる
// 電流を短いまっすぐな部分に分け、それぞれがつくる磁場 dB = (μ0 I / 4π) dl × r / r³ を全部足す
// 画面は電流をたてに切った断面。⊙ = 手前へ流れる電流、⊗ = 奥へ。白線 = 磁力線、針 = 方位磁針（赤が N）
// 1 直線 / 2 円電流 / 3 ソレノイド / 4 平行な 2 本 / ↑↓ = 巻き数 / ←→ = 電流 / F = 向きを反転 / D = 2 本の向き
// ============================================

const MU0 = 4 * Math.PI * 1e-7;        // 真空の透磁率 μ0 [T·m/A]
const SCALE = 1400;                    // ★ 1 m = 1400 px（1 cm = 14 px）
const RLOOP = 0.08;                    // ★ 円電流・ソレノイドの半径 [m]
const SEGS = 48;                       // ★ 円を何本のまっすぐな部分に分けるか
const CELL = 10;                       // 磁場を計算する格子 [px]
let preset = 2, turns = 8, current = 10, flip = 1, anti = false, wires = [], marks = [];
let GXn, GZn, Bx, Bz, img, lay, lines = [], cx, cy;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  cx = width * 0.42; cy = height * 0.56;
  GXn = Math.ceil(width / CELL) + 1; GZn = Math.ceil(height / CELL) + 1;
  Bx = new Float64Array(GXn * GZn); Bz = new Float64Array(GXn * GZn); img = createImage(GXn, GZn);
  lay = createGraphics(width, height); lay.pixelDensity(1);
  rebuild();
  selfTest();
}

// ---- 電流の形を作り、格子の上の磁場と磁力線を計算しなおす
function rebuild() {
  let I = current * flip;
  if (preset === 1) wires = [straightY(0, I)];
  if (preset === 2) wires = loopX(0, RLOOP, I, SEGS);
  if (preset === 3) { wires = []; let len = 0.3; for (let k = 0; k < turns; k++) wires = wires.concat(loopX(turns === 1 ? 0 : -len / 2 + (len * k) / (turns - 1), RLOOP, I, SEGS)); }
  if (preset === 4) wires = [straightY(-0.06, I), straightY(0.06, anti ? -I : I)];
  marks = [];
  for (let w of wires) {                           // 断面（y = 0 の平面）を横切る所に ⊙ ⊗
    if (w.a[1] * w.b[1] <= 0 && w.a[1] !== w.b[1]) { let t = w.a[1] / (w.a[1] - w.b[1]); marks.push({ x: w.a[0] + t * (w.b[0] - w.a[0]), z: w.a[2] + t * (w.b[2] - w.a[2]), into: (w.b[1] - w.a[1]) * w.I > 0 }); }
  }
  img.loadPixels();
  for (let j = 0; j < GZn; j++) for (let i = 0; i < GXn; i++) {
    let b = fieldB(wires, (i * CELL - cx) / SCALE, 0, (cy - j * CELL) / SCALE), k = j * GXn + i, p = 4 * k;
    Bx[k] = b[0]; Bz[k] = b[2];
    let m = clampv((Math.log10(Math.hypot(b[0], b[2]) + 1e-12) + 6) / 3, 0, 1);   // 1 μT 〜 1 mT
    img.pixels[p] = 14 + 60 * m; img.pixels[p + 1] = 18 + 90 * m; img.pixels[p + 2] = 30 + 110 * m; img.pixels[p + 3] = 255;
  }
  img.updatePixels();
  lines = [];
  let seeds = [];
  if (preset === 1) for (let d of [0.015, 0.03, 0.05, 0.08, 0.12, 0.17, 0.23, 0.3]) seeds.push([d, 0]);
  if (preset === 4) for (let k = 1; k <= 9; k++) seeds.push([0.012 * k - 0.054, 0.0001], [0.07 + 0.03 * k, 0]);
  if (preset === 2 || preset === 3) for (let k = -6; k <= 6; k++) seeds.push([0, (RLOOP * 0.95 * k) / 6.5]);
  for (let s of seeds) { let a = traceB(s[0], s[1], 1), b = traceB(s[0], s[1], -1); lines.push(b.reverse().concat(a)); }
  lay.clear(); lay.image(img, -CELL / 2, -CELL / 2, GXn * CELL, GZn * CELL);         // 背景と磁力線は変えたときだけ描く
  lay.stroke(235, 240, 255, 170); lay.strokeWeight(1.4); lay.noFill();
  for (let L of lines) if (L.length > 1) { lay.beginShape(); for (let p of L) lay.vertex(p[0], p[1]); lay.endShape(); }
}

function draw() {
  background(14, 18, 26);
  image(lay, 0, 0);
  // 方位磁針
  for (let y = 130; y < height - 30; y += 52) for (let x = 30; x < width * 0.74; x += 52) {
    let b = sampleB(x, y), m = Math.hypot(b[0], b[1]);
    if (!(m > 0)) continue;
    let ux = b[0] / m, uy = -b[1] / m, a = clampv((Math.log10(m) + 6.3) / 3, 0.15, 1);
    strokeWeight(3); stroke(240, 80, 70, 255 * a); line(x, y, x + ux * 11, y + uy * 11);
    stroke(220, 225, 235, 255 * a); line(x, y, x - ux * 11, y - uy * 11);
  }
  // 電流の断面
  for (let m of marks) {
    let sx = cx + m.x * SCALE, sy = cy - m.z * SCALE;
    stroke(255, 200, 100); strokeWeight(2); fill(40, 30, 20); circle(sx, sy, 16);
    if (m.into) { line(sx - 5, sy - 5, sx + 5, sy + 5); line(sx - 5, sy + 5, sx + 5, sy - 5); } else { noStroke(); fill(255, 200, 100); circle(sx, sy, 5); }
  }
  // マウスの所の磁場（その場で計算しなおす）
  let b = fieldB(wires, (mouseX - cx) / SCALE, 0, (cy - mouseY) / SCALE), bm = Math.hypot(b[0], b[2]);
  if (bm > 0) { stroke(255, 230, 120); strokeWeight(2); arrowTo(mouseX, mouseY, mouseX + (b[0] / bm) * 34, mouseY - (b[2] / bm) * 34, 8); }
  // 文字
  let tx = width * 0.76, y = 140;
  noStroke(); fill(235); textSize(15);
  let info = ['電流 I = ' + current * flip + ' A', '直線の部分の数 ' + wires.length + ' 本', 'マウスの所 |B| = ' + sci(bm * 1e6) + ' μT', '（地球の磁場 ≈ 45 μT）'];
  if (preset === 1) { let d = Math.hypot(mouseX - cx, mouseY - cy) / SCALE; info.push('式 μ0I/(2πd) = ' + sci((MU0 * current) / (2 * Math.PI * d) * 1e6) + ' μT（d = ' + (d * 100).toFixed(1) + ' cm）'); }
  if (preset === 2) info.push('中心：計算 ' + sci(Math.hypot(...fieldB(wires, 0, 0, 0)) * 1e6) + ' μT', '式 μ0I/(2R) = ' + sci(((MU0 * current) / (2 * RLOOP)) * 1e6) + ' μT');
  if (preset === 3) info.push('巻き数 N = ' + turns + '（長さ 30 cm）', '中心：計算 ' + sci(Math.hypot(...fieldB(wires, 0, 0, 0)) * 1e6) + ' μT', '長いソレノイドの式 μ0nI = ' + sci(MU0 * (turns / 0.3) * current * 1e6) + ' μT', '（長さが半径に比べて短いと式より小さい）');
  if (preset === 4) info.push(anti ? '逆向き：あいだで磁場が強め合う' : '同じ向き：まん中で 0（打ち消し合う）', '同じ向きの電流は引き合う（D で切りかえ）');
  for (let s of info) { text(s, tx, y, width - tx - 10); y += 30; }
  fill(235); textSize(17);
  text('1 直線　2 円電流　3 ソレノイド　4 平行な 2 本 ｜ ↑↓ 巻き数　←→ 電流　F 向きを反転　D 2 本の向き', 20, 34);
  fill(170); textSize(13);
  text('断面の図。⊙ = 手前へ、⊗ = 奥へ流れる電流（右ねじの法則：電流の向きにねじを進めると、回す向きが磁場）。背景の明るさ = |B|（1 μT 〜 1 mT の対数）。1 cm = 14 px', 20, 60, width - 40);
  fill(170); text('どの点の磁場も、電流のまっすぐな部分 ' + wires.length + ' 本のビオ・サバールの式を足した値。磁力線は格子の B をなめらかにつないで RK4 でたどった', 20, 100, width - 40);
  drawSelfTest(20, height - 14);
}

function keyPressed() {
  if (key >= '1' && key <= '4') preset = +key;
  if (key === UP_ARROW) turns = Math.min(20, turns + 1);
  if (key === DOWN_ARROW) turns = Math.max(1, turns - 1);
  if (key === RIGHT_ARROW) current = Math.min(50, current + 5);
  if (key === LEFT_ARROW) current = Math.max(5, current - 5);
  if (key === 'f' || key === 'F') flip *= -1;
  if (key === 'd' || key === 'D') anti = !anti;
  if (key === 'r' || key === 'R') { preset = 2; turns = 8; current = 10; flip = 1; anti = false; }
  rebuild();
  return false;
}

// ---- 自己テスト：式で計算できる値と比べる
function selfTest() {
  selfTestResults = [];
  let I = 10, w1 = [straightY(0, I)], d = 0.05;
  check('長い直線電流：B = μ0I/(2πd)（0.1% 以内）', nearRel(Math.hypot(...fieldB(w1, d, 0, 0)), (MU0 * I) / (2 * Math.PI * d), 0.001));
  let s = 0, n = 400; for (let k = 0; k < n; k++) { let a = (2 * Math.PI * (k + 0.5)) / n, b = fieldB(w1, d * Math.cos(a), 0, d * Math.sin(a)); s += (b[0] * -Math.sin(a) + b[2] * Math.cos(a)) * ((2 * Math.PI * d) / n); }
  check('アンペールの法則：まわりを 1 周 ∮B·dl = μ0I（0.1% 以内）', nearRel(Math.abs(s), MU0 * I, 0.001));
  let lp = loopX(0, RLOOP, I, 72);
  check('円電流の中心：B = μ0I/(2R)（72 本で 0.5% 以内）', nearRel(Math.hypot(...fieldB(lp, 0, 0, 0)), (MU0 * I) / (2 * RLOOP), 0.005));
  check('円電流の軸の上（x = R）：B = μ0IR²/(2(R² + x²)^(3/2))', nearRel(Math.hypot(...fieldB(lp, RLOOP, 0, 0)), (MU0 * I * RLOOP * RLOOP) / (2 * Math.pow(2 * RLOOP * RLOOP, 1.5)), 0.005));
  let sol = []; for (let k = 0; k < 100; k++) sol = sol.concat(loopX(-0.5 + (k + 0.5) / 100, 0.02, I, 36));
  check('長いソレノイド（1 m に 100 回）の中心：B ≈ μ0nI（1% 以内）', nearRel(Math.abs(fieldB(sol, 0, 0, 0)[0]), MU0 * 100 * I, 0.01));
  check('電流を反転すると磁場も反転', near(fieldB(loopX(0, RLOOP, -I, 48), 0.03, 0, 0.02)[0], -fieldB(loopX(0, RLOOP, I, 48), 0.03, 0, 0.02)[0], 1e-15));
  check('同じ向きの平行な 2 本：まん中で B = 0', Math.hypot(...fieldB([straightY(-0.06, I), straightY(0.06, I)], 0, 0, 0)) < 1e-15);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 1 で、直線から 2 倍はなれると B は何倍？ マウスの数字で確かめよう
// 2. 3 のソレノイドで ↑ で巻き数をふやすと、中の磁場はどうなる？ 中はどれくらい一様？
// 3. 2 の円電流と、ソレノイドの外側の磁力線を比べよう。棒磁石の磁力線に似ている？
// 4. 4 で D を押して、平行電流が同じ向き・逆向きのときの磁力線を比べよう（モーターの力のもと）
// 5. SEGS を 4 や 8 にすると、円が多角形になる。中心の磁場は式からどれくらいずれる？


// ==================================================
// ここから下は「電磁気の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 電流の部分：まっすぐな線 a → b に電流 I [A]（座標は m。x = 右、y = 奥、z = 上）
function straightY(x, I) { return { a: [x, -50, 0], b: [x, 50, 0], I }; }        // 奥へのびた長い直線（100 m）
function loopX(x, R, I, n) {                                                     // x 軸のまわりの円（n 角形）
  let out = [];
  for (let k = 0; k < n; k++) {
    let a0 = (2 * Math.PI * k) / n, a1 = (2 * Math.PI * (k + 1)) / n;
    out.push({ a: [x, R * Math.cos(a0), R * Math.sin(a0)], b: [x, R * Math.cos(a1), R * Math.sin(a1)], I });
  }
  return out;
}
// ---- まっすぐな部分 1 本の磁場（ビオ・サバールを線にそって積分した正確な式）
// B = (μ0 I / 4π) (r1 × r2)(|r1| + |r2|) / (|r1||r2|(|r1||r2| + r1·r2))、r1 = P − a、r2 = P − b
function fieldB(ws, px, py, pz) {
  let bx = 0, by = 0, bz = 0;
  for (let w of ws) {
    let r1x = px - w.a[0], r1y = py - w.a[1], r1z = pz - w.a[2], r2x = px - w.b[0], r2y = py - w.b[1], r2z = pz - w.b[2];
    let n1 = Math.sqrt(r1x * r1x + r1y * r1y + r1z * r1z), n2 = Math.sqrt(r2x * r2x + r2y * r2y + r2z * r2z);
    let den = n1 * n2 * (n1 * n2 + r1x * r2x + r1y * r2y + r1z * r2z);
    if (!(den > 1e-18)) continue;                         // 電流の線の上は計算しない
    let f = (1e-7 * w.I * (n1 + n2)) / den;               // μ0/4π = 10⁻⁷
    bx += f * (r1y * r2z - r1z * r2y); by += f * (r1z * r2x - r1x * r2z); bz += f * (r1x * r2y - r1y * r2x);
  }
  return [bx, by, bz];
}
// ---- 格子の磁場をなめらかに（双線形補間）。画面の座標 → [Bx, Bz]
function sampleB(sx, sy) {
  let fi = clampv(sx / CELL, 0, GXn - 1.001), fj = clampv(sy / CELL, 0, GZn - 1.001), i = Math.floor(fi), j = Math.floor(fj), u = fi - i, v = fj - j, k = j * GXn + i;
  let L = (A) => (1 - u) * (1 - v) * A[k] + u * (1 - v) * A[k + 1] + (1 - u) * v * A[k + GXn] + u * v * A[k + GXn + 1];
  return [L(Bx), L(Bz)];
}
// ---- 磁力線：B の向きに RK4 で進む（dir = ±1）。もとの点にもどるか画面の外で止まる
function traceB(x0, z0, dir) {
  let sx = cx + x0 * SCALE, sy = cy - z0 * SCALE, pts = [[sx, sy]], h = 4;
  let u = (x, y) => { let b = sampleB(x, y), m = Math.hypot(b[0], b[1]); return m > 0 ? [(dir * b[0]) / m, (-dir * b[1]) / m] : [0, 0]; };
  for (let n = 0; n < 1500; n++) {
    let k1 = u(sx, sy), k2 = u(sx + (h / 2) * k1[0], sy + (h / 2) * k1[1]), k3 = u(sx + (h / 2) * k2[0], sy + (h / 2) * k2[1]), k4 = u(sx + h * k3[0], sy + h * k3[1]);
    sx += (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]); sy += (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
    pts.push([sx, sy]);
    if (sx < 0 || sy < 0 || sx > width || sy > height) break;
    if (n > 30 && Math.hypot(sx - pts[0][0], sy - pts[0][1]) < 3) break;
    if (marks.some((m) => Math.hypot(cx + m.x * SCALE - sx, cy - m.z * SCALE - sy) < 5)) break;
  }
  return pts;
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
