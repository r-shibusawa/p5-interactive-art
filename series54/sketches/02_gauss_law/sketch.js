// ============================================
// 02 ガウスの法則 ─ 閉じた曲線を通りぬける「電束」は、中の電荷だけで決まる
// 電荷は紙に垂直な長い線（線電荷 λ [nC/m]）なので、電場は 2 次元：E = λ / (2π ε0 r)
// 曲線にそって E·n（外向きの成分）を足し合わせる（数値の線積分）と、Φ = (中の電荷の合計) / ε0 になる
// 何もない所をドラッグ = 閉じた曲線を描く / 電荷をドラッグ = 動かす / A・N = 追加 / F = 符号 / ↑↓ = 大きさ / 1 2 = 円・星形 / R = 最初から
// ============================================

const EPS0 = 8.854e-12;                // 真空の誘電率 ε0 [F/m]
const PX_M = 0.001;                    // ★ 1 px = 1 mm
const SUB = 2;                         // ★ 線積分の細かさ：曲線を SUB px ごとに区切る
let charges = [], loopPts = [], drawing = null, grab = -1, dirty = true;
let flux = 0, qIn = 0, segInfo = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  resetAll();
  selfTest();
}
function resetAll() {
  let cx = width * 0.42, cy = height * 0.55;
  charges = [{ x: cx - 60, y: cy, q: 2 }, { x: cx + 70, y: cy + 40, q: -1 }, { x: cx + 330, y: cy - 120, q: 3 }];
  loopPts = circlePts(cx, cy, 190, 160); dirty = true;
}
function circlePts(cx, cy, r, n) { let p = []; for (let i = 0; i < n; i++) { let a = (TWO_PI * i) / n; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return p; }
function starPts(cx, cy, r, n) { let p = []; for (let i = 0; i < n; i++) { let a = (TWO_PI * i) / n, rr = r * (1 + 0.35 * Math.sin(5 * a) + 0.12 * Math.cos(3 * a)); p.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]); } return p; }

function draw() {
  background(14, 18, 26);
  if (dirty) { recompute(); dirty = false; }
  // 背景：電場の矢印（向き、明るさ = 強さ）
  for (let y = 30; y < height; y += 36) for (let x = 20; x < width; x += 36) {
    let e = fieldAt(charges, x, y), m = Math.hypot(e[0], e[1]);
    if (m === 0) continue;
    let b = clampv(Math.log10(m) - 1, 0, 2) / 2;
    stroke(90 + 120 * b, 110 + 100 * b, 150 + 80 * b, 60 + 120 * b); strokeWeight(1);
    arrowTo(x - (7 * e[0]) / m, y - (7 * e[1]) / m, x + (7 * e[0]) / m, y + (7 * e[1]) / m, 4);
  }
  // 曲線：外向きの電束 E·n > 0 は橙、< 0 は青
  strokeWeight(4);
  for (let s of segInfo) { stroke(s.en > 0 ? color(255, 160, 70) : color(80, 170, 255)); line(s.x1, s.y1, s.x2, s.y2); }
  for (let k = 0; k < segInfo.length; k += Math.max(1, Math.floor(segInfo.length / 28))) {   // ところどころに外向きの法線 n
    let s = segInfo[k], mx = (s.x1 + s.x2) / 2, my = (s.y1 + s.y2) / 2;
    stroke(220, 220, 230, 150); strokeWeight(1); arrowTo(mx, my, mx + 18 * s.nx, my + 18 * s.ny, 5);
  }
  if (drawing) { stroke(255, 240, 150); strokeWeight(2); noFill(); polyline(drawing); }
  for (let c of charges) {
    let w = windingNumber(loopPts, c.x, c.y) !== 0;
    noStroke(); fill(c.q > 0 ? color(240, 90, 70) : color(70, 150, 250)); circle(c.x, c.y, 16 + 6 * Math.sqrt(Math.abs(c.q)));
    if (w) { noFill(); stroke(255, 240, 150); strokeWeight(2); circle(c.x, c.y, 30 + 6 * Math.sqrt(Math.abs(c.q))); }
    noStroke(); fill(255); textAlign(CENTER, CENTER); textSize(15); text(c.q > 0 ? '+' : '−', c.x, c.y - 1); textAlign(LEFT, BASELINE);
    fill(220); textSize(12); text((c.q > 0 ? '+' : '') + c.q.toFixed(1), c.x + 14, c.y - 12);
  }
  // 文字
  noStroke(); fill(0, 0, 0, 160); rect(10, 10, 860, 142, 6);
  fill(235); textSize(17);
  text('何もない所をドラッグ = 曲線を描く　電荷をドラッグ　A・N 追加　F 符号　↑↓ 大きさ　1 円　2 星形　R 最初から', 20, 34);
  fill(255, 230, 120); textSize(20);
  text('電束 Φ = ∮ E·n dl = ' + flux.toFixed(1) + ' V　→　ε0 Φ = ' + (flux * EPS0 * 1e9).toFixed(3) + ' nC/m', 20, 66);
  fill(150, 230, 170);
  text('曲線の中の電荷の合計 = ' + qIn.toFixed(3) + ' nC/m（黄色の輪の電荷）　ずれ ' + (Math.abs(flux * EPS0 * 1e9 - qIn)).toFixed(4), 20, 96);
  fill(170); textSize(13);
  text('線電荷 λ（nC/m、紙に垂直な長い線）、1 px = 1 mm。曲線（' + segInfo.length + ' 本の辺）を ' + SUB + ' px ごとに区切って E·n·Δl を足した。橙 = 外へ出る、青 = 中へ入る。外の電荷を動かしても Φ は変わらない', 20, 122, 840);
  drawSelfTest(20, height - 14);
}

// 電束を数値積分し、中の電荷を巻き数で数える
function recompute() {
  let r = fluxThrough(loopPts, charges, SUB);
  flux = r.flux; segInfo = r.segs;
  let o = Math.sign(signedArea(loopPts)) || 1;               // 曲線の向き（逆回りなら巻き数は −1）
  qIn = charges.reduce((s, c) => s + o * windingNumber(loopPts, c.x, c.y) * c.q, 0);
}

function mousePressed() {
  grab = -1; let best = 22;
  charges.forEach((c, i) => { let d = Math.hypot(c.x - mouseX, c.y - mouseY); if (d < best) { best = d; grab = i; } });
  if (grab < 0) drawing = [[mouseX, mouseY]];
}
function mouseDragged() {
  if (grab >= 0) { charges[grab].x = clampv(mouseX, 5, width - 5); charges[grab].y = clampv(mouseY, 5, height - 5); dirty = true; return; }
  if (drawing) { let l = drawing[drawing.length - 1]; if (Math.hypot(mouseX - l[0], mouseY - l[1]) > 5 && drawing.length < 2000) drawing.push([mouseX, mouseY]); }
}
function mouseReleased() {
  if (drawing && drawing.length >= 3 && Math.abs(signedArea(drawing)) > 400) { loopPts = drawing; dirty = true; }   // 小さすぎる曲線（クリックだけ）は使わない
  drawing = null; grab = -1;
}
function keyPressed() {
  let cx = width * 0.42, cy = height * 0.55;
  if (key === '1') loopPts = circlePts(cx, cy, 190, 160);
  if (key === '2') loopPts = starPts(cx, cy, 180, 300);
  if (key === 'r' || key === 'R') resetAll();
  if ((key === 'a' || key === 'A' || key === 'n' || key === 'N') && charges.length < 8) {
    let x = clampv(mouseX, 20, width - 20), y = clampv(mouseY, 150, height - 20);
    if (charges.every((c) => Math.hypot(c.x - x, c.y - y) > 20)) charges.push({ x, y, q: key === 'a' || key === 'A' ? 1 : -1 });
  }
  let i = -1, bd = 1e9; charges.forEach((c, k) => { let d = Math.hypot(c.x - mouseX, c.y - mouseY); if (d < bd) { bd = d; i = k; } });
  if (i >= 0 && (key === 'f' || key === 'F')) charges[i].q *= -1;
  if (i >= 0 && key === UP_ARROW) charges[i].q = Math.sign(charges[i].q) * Math.min(5, Math.abs(charges[i].q) + 0.5);
  if (i >= 0 && key === DOWN_ARROW) charges[i].q = Math.sign(charges[i].q) * Math.max(0.5, Math.abs(charges[i].q) - 0.5);
  dirty = true;
}

// ---- 自己テスト：電束 = 中の電荷 / ε0 を数値で確かめる
function selfTest() {
  selfTestResults = [];
  let q1 = [{ x: 500, y: 400, q: 1 }], circ = circlePts(500, 400, 150, 720), Q1 = 1e-9 / EPS0;
  check('2 次元のガウス：E × 2πr = λ / ε0', nearRel(Math.hypot(...fieldAt(q1, 620, 400)) * 2 * Math.PI * 0.12, Q1, 1e-12));
  check('＋1 nC/m を円でかこむ → Φ = q/ε0（1% 以内）', nearRel(fluxThrough(circ, q1, SUB).flux, Q1, 0.01));
  check('外にある電荷 → Φ ≈ 0（q/ε0 の 1% 以内）', Math.abs(fluxThrough(circ, [{ x: 800, y: 420, q: 1 }], SUB).flux) < 0.01 * Q1);
  let st = starPts(400, 400, 160, 400), cs = [{ x: 380, y: 410, q: 2 }, { x: 450, y: 360, q: -0.5 }, { x: 700, y: 120, q: 4 }];
  check('星形の曲線：Φ ε0 = 中の電荷の合計 1.5 nC/m（1% 以内）', nearRel(fluxThrough(st, cs, SUB).flux * EPS0 * 1e9, 1.5, 0.01));
  check('曲線を逆回りに描いても同じ Φ（外向きの n を面積の符号で決める）', nearRel(fluxThrough(st.slice().reverse(), cs, SUB).flux, fluxThrough(st, cs, SUB).flux, 1e-9));
  let cs2 = [cs[0], cs[1], { x: 120, y: 650, q: 4 }];
  check('外の電荷を動かしても Φ は変わらない', nearRel(fluxThrough(st, cs2, SUB).flux, fluxThrough(st, cs, SUB).flux, 0.01));
  let sq = [[0, 0], [100, 0], [100, 100], [0, 100]];
  check('巻き数：正方形の中は 1、外は 0（逆回りなら −1）', windingNumber(sq, 50, 50) === 1 && windingNumber(sq, 150, 50) === 0 && windingNumber(sq.slice().reverse(), 50, 50) === -1);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. ＋の電荷のまわりに、大きな円・小さな円・ぐにゃぐにゃの曲線を描いて Φ を比べよう
// 2. ＋2 と −2 を両方かこむと Φ は？ 曲線の上では E·n が 0 でないのに、なぜ合計が 0 になる？
// 3. 外の電荷を曲線のすぐ近くまで動かすと、橙と青の部分はどう変わる？ Φ は？
// 4. SUB を 20 にすると、電荷が曲線に近いときに誤差が出る。なぜ？
// 5. 8 の字（自分と交わる曲線）を描くと、中の電荷はどう数えられる？（巻き数）


// ==================================================
// ここから下は「電磁気の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 線電荷の電場（2 次元）：E = λ / (2π ε0 r) r̂。電荷は { x, y [px], q [nC/m] }、結果は N/C
function fieldAt(cs, x, y) {
  let ex = 0, ey = 0;
  for (let c of cs) {
    let dx = (x - c.x) * PX_M, dy = (y - c.y) * PX_M, r2 = dx * dx + dy * dy;
    if (r2 < 1e-12) continue;
    let f = (c.q * 1e-9) / (2 * Math.PI * EPS0 * r2);
    ex += f * dx; ey += f * dy;
  }
  return [ex, ey];
}
// ---- 多角形の符号つき面積（向きを決めるため）
function signedArea(p) { let a = 0; for (let i = 0; i < p.length; i++) { let q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; } return a / 2; }
// ---- 電束 Φ = ∮ E·n dl（中点則）。最後の点から最初の点へもどる辺もふくむ。n は外向き
function fluxThrough(p, cs, sub) {
  let s = Math.sign(signedArea(p)) || 1, flux = 0, segs = [];
  for (let i = 0; i < p.length; i++) {
    let a = p[i], b = p[(i + 1) % p.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (L === 0) continue;
    let nx = (s * (b[1] - a[1])) / L, ny = (-s * (b[0] - a[0])) / L, m = Math.max(1, Math.ceil(L / sub)), en = 0;
    for (let k = 0; k < m; k++) {
      let t = (k + 0.5) / m, e = fieldAt(cs, a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]));
      en += (e[0] * nx + e[1] * ny) * (L / m) * PX_M;
    }
    flux += en; segs.push({ x1: a[0], y1: a[1], x2: b[0], y2: b[1], nx, ny, en });
  }
  return { flux, segs };
}
// ---- 巻き数：点 (x, y) のまわりを曲線が何回まわるか（角度の変化の合計 ÷ 2π）
function windingNumber(p, x, y) {
  let tot = 0;
  for (let i = 0; i < p.length; i++) {
    let a = p[i], b = p[(i + 1) % p.length];
    let d = Math.atan2(b[1] - y, b[0] - x) - Math.atan2(a[1] - y, a[0] - x);
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    tot += d;
  }
  return Math.round(tot / (2 * Math.PI));
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
