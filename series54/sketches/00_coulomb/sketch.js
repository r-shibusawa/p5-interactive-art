// ============================================
// 00 クーロンの法則 ─ 電荷どうしが押し合い・引き合う力
// 2 つの点電荷の力の大きさ F = k q₁ q₂ / r²（k = 8.99×10⁹ N·m²/C²）。距離が 2 倍で力は 1/4
// 同じ符号は反発、ちがう符号は引き合う。たくさんあるときは 1 組ずつの力を足す（重ね合わせ）
// ドラッグ = 電荷を動かす / A・N = ＋・− を追加 / F = 符号 / ↑↓ = 大きさ / スペース = 自由に動かす / R = 最初から
// ============================================

const KC = 8.988e9;                    // クーロン定数 k [N·m²/C²]
const PX_M = 0.001;                    // ★ 1 px = 1 mm
const MASS = 0.005;                    // ★ 電荷をのせた玉の質量 [kg]（5 g）
const SLOW = 0.05;                     // ★ スローモーション（1 秒で 0.05 秒ぶん進む）
const DRAG = 1.5;                      // ★ 空気の抵抗（速さに比例してブレーキ）[1/s]
const CONTACT = 0.016;                 // 玉の直径 [m]（これより近づかない）
let charges = [], grab = -1, running = false, pairA = 0, pairB = 1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  resetCharges();
  selfTest();
}
function resetCharges() {
  let cx = width * 0.36, cy = height * 0.55;
  charges = [{ x: cx - 150, y: cy, q: 1, vx: 0, vy: 0 }, { x: cx + 150, y: cy, q: -1, vx: 0, vy: 0 }, { x: cx, y: cy - 200, q: 0.5, vx: 0, vy: 0 }];
  pairA = 0; pairB = 1; running = false;
}

function draw() {
  background(14, 18, 26);
  if (running) for (let s = 0; s < 20; s++) moveStep(charges, (Math.min(deltaTime, 50) / 1000) * SLOW / 20, true);
  let F = netForces(charges);
  // 1 組ずつの力（細い矢印）と、合計の力（太い矢印）。長さは力の対数
  let len = (f) => 26 * Math.log10(1 + f / 0.002);
  for (let i = 0; i < charges.length; i++) {
    let a = charges[i];
    for (let j = 0; j < charges.length; j++) {
      if (i === j) continue;
      let f = pairForce(a, charges[j]), m = Math.hypot(f[0], f[1]);
      stroke(150, 160, 190, 120); strokeWeight(1); arrowTo(a.x, a.y, a.x + (f[0] / m) * len(m), a.y + (f[1] / m) * len(m), 6);
    }
    let m = Math.hypot(F[i][0], F[i][1]);
    stroke(255, 200, 90); strokeWeight(3);
    if (m > 0) arrowTo(a.x, a.y, a.x + (F[i][0] / m) * len(m), a.y + (F[i][1] / m) * len(m), 11);
  }
  let A = charges[pairA], B = charges[pairB];
  if (A && B) { stroke(120, 220, 255, 140); strokeWeight(1); drawingContext.setLineDash([5, 6]); line(A.x, A.y, B.x, B.y); drawingContext.setLineDash([]); }
  for (let c of charges) {
    noStroke(); fill(c.q > 0 ? color(240, 90, 70) : color(70, 150, 250)); circle(c.x, c.y, 16 + 8 * Math.sqrt(Math.abs(c.q)));
    fill(255); textAlign(CENTER, CENTER); textSize(16); text(c.q > 0 ? '+' : '−', c.x, c.y - 1); textAlign(LEFT, BASELINE);
  }
  // ---- 右：選んだ 2 つの F と r のグラフ（両対数）
  let g = { x: width * 0.7, y: 140, w: width * 0.26, h: height * 0.42 };
  drawGraph(g, A, B);
  // ---- 文字
  noStroke(); fill(235); textSize(17);
  text('ドラッグで移動　A・N 追加　F 符号　↑↓ 大きさ　スペース 自由に動かす（' + (running ? '動いている' : '止めている') + '）　R 最初から', 20, 34);
  fill(170); textSize(13);
  text('黄色の太い矢印 = 合計の力、灰色 = 1 組ずつの力（矢印の長さは力の対数）。電荷は μC、1 px = 1 mm、玉の質量 ' + MASS * 1000 + ' g、時間は ' + SLOW + ' 倍のスロー', 20, 58);
  let y = 92; textSize(15);
  charges.forEach((c, i) => {
    fill(c.q > 0 ? color(255, 140, 120) : color(130, 180, 255));
    text('電荷 ' + (i + 1) + '：q = ' + (c.q > 0 ? '+' : '') + c.q.toFixed(1) + ' μC　合計の力 |F| = ' + sci(Math.hypot(F[i][0], F[i][1])) + ' N', 20, y); y += 22;
  });
  drawSelfTest(20, height - 14);
}

function drawGraph(g, A, B) {
  let r0 = 0.02, r1 = 1.0, f0 = 1e-3, f1 = 100;
  let X = (r) => g.x + clampv(Math.log(r / r0) / Math.log(r1 / r0), 0, 1) * g.w, Y = (f) => g.y + g.h - clampv(Math.log(f / f0) / Math.log(f1 / f0), 0, 1) * g.h;
  noFill(); stroke(70, 80, 100); rect(g.x, g.y, g.w, g.h);
  noStroke(); fill(140); textSize(11);
  for (let r of [0.02, 0.05, 0.1, 0.2, 0.5, 1]) { text(r * 100 + ' cm', X(r) - 12, g.y + g.h + 14); stroke(50, 58, 74); line(X(r), g.y, X(r), g.y + g.h); noStroke(); }
  for (let f of [1e-3, 1e-2, 0.1, 1, 10, 100]) { text(sci(f, 1) + ' N', g.x - 52, Y(f) + 4); stroke(50, 58, 74); line(g.x, Y(f), g.x + g.w, Y(f)); noStroke(); }
  fill(220); textSize(14); text('選んだ 2 つ（点線）の 力 F と 距離 r（両対数）', g.x - 40, g.y - 30);
  if (!A || !B) return;
  let k2 = KC * Math.abs(A.q * B.q) * 1e-12, pts = [];
  for (let i = 0; i <= 80; i++) { let r = r0 * Math.pow(r1 / r0, i / 80); pts.push([X(r), Y(k2 / (r * r))]); }
  stroke(120, 220, 255); strokeWeight(2); noFill(); polyline(pts);
  let r = Math.max(CONTACT, Math.hypot(A.x - B.x, A.y - B.y) * PX_M), f = k2 / (r * r);
  noStroke(); fill(255, 200, 90); circle(X(r), Y(f), 12);
  if (2 * r < r1) { fill(255, 200, 90, 120); circle(X(2 * r), Y(f / 4), 9); fill(200); textSize(12); text('2 倍の距離 → 1/4', X(2 * r) + 8, Y(f / 4) - 6); }
  fill(235); textSize(15);
  text('r = ' + (r * 100).toFixed(1) + ' cm　F = ' + sci(f) + ' N（' + (A.q * B.q > 0 ? '反発' : '引き合う') + '）', g.x - 40, g.y + g.h + 44);
  fill(170); textSize(13);
  text('傾き −2 の直線 = 2 乗に反比例。q を 2 倍にすると線は上へ平行移動', g.x - 40, g.y + g.h + 66);
}

function mousePressed() {
  grab = -1; let best = 26;
  charges.forEach((c, i) => { let d = Math.hypot(c.x - mouseX, c.y - mouseY); if (d < best) { best = d; grab = i; } });
  if (grab >= 0 && grab !== pairB) { pairB = pairA; pairA = grab; }
}
function mouseDragged() {
  if (grab < 0) return;
  let c = charges[grab]; c.x = clampv(mouseX, 10, width - 10); c.y = clampv(mouseY, 10, height - 10); c.vx = c.vy = 0;
}
function mouseReleased() { grab = -1; }
function keyPressed() {
  if (key === ' ') running = !running;
  if (key === 'r' || key === 'R') resetCharges();
  if ((key === 'a' || key === 'A' || key === 'n' || key === 'N') && charges.length < 8) {
    let x = clampv(mouseX, 20, width - 20), y = clampv(mouseY, 20, height - 20);
    if (charges.every((c) => Math.hypot(c.x - x, c.y - y) > 24)) charges.push({ x, y, q: key === 'a' || key === 'A' ? 1 : -1, vx: 0, vy: 0 });
  }
  let i = -1, bd = 1e9; charges.forEach((c, k) => { let d = Math.hypot(c.x - mouseX, c.y - mouseY); if (d < bd) { bd = d; i = k; } });
  if (i >= 0 && (key === 'f' || key === 'F')) charges[i].q *= -1;
  if (i >= 0 && key === UP_ARROW) charges[i].q = Math.sign(charges[i].q) * Math.min(5, Math.abs(charges[i].q) + 0.5);
  if (i >= 0 && key === DOWN_ARROW) charges[i].q = Math.sign(charges[i].q) * Math.max(0.5, Math.abs(charges[i].q) - 0.5);
  return false;
}

// ---- 自己テスト：手で計算できる値と比べる
function selfTest() {
  selfTestResults = [];
  let a = { x: 0, y: 0, q: 2 }, b = { x: 100, y: 0, q: 3 }, b2 = { x: 200, y: 0, q: 3 };
  check('距離が 2 倍 → 力は 1/4', nearRel(pairForceRaw(b, a)[0] / pairForceRaw(b2, a)[0], 4, 1e-12));
  check('1 μC と 1 μC が 1 m → F = 8.99×10⁻³ N', nearRel(Math.hypot(...pairForceRaw({ x: 1000, y: 0, q: 1 }, { x: 0, y: 0, q: 1 })), 8.988e-3, 1e-9));
  check('同じ符号は反発（離れる向き）、ちがう符号は引き合う', pairForceRaw(b, a)[0] > 0 && pairForceRaw({ x: 100, y: 0, q: -3 }, a)[0] < 0);
  let cs = [{ x: 0, y: 0, q: 1 }, { x: 120, y: 40, q: -2 }, { x: -60, y: 200, q: 0.5 }, { x: 300, y: -90, q: 3 }];
  let Fn = netForces(cs), sx = Fn.reduce((s, f) => s + f[0], 0), sy = Fn.reduce((s, f) => s + f[1], 0), big = Math.max(...Fn.map((f) => Math.hypot(f[0], f[1])));
  check('作用・反作用：全部の力を足すと 0', Math.hypot(sx, sy) < 1e-12 * big);
  let f1 = pairForceRaw(cs[0], cs[1]), f2 = pairForceRaw(cs[0], cs[2]), f3 = pairForceRaw(cs[0], cs[3]);
  check('重ね合わせ：合計の力 = 1 組ずつの力の和', nearRel(Fn[0][0], f1[0] + f2[0] + f3[0], 1e-12) && nearRel(Fn[0][1], f1[1] + f2[1] + f3[1], 1e-12));
  let ms = [{ x: 400, y: 300, q: 1, vx: 0, vy: 0 }, { x: 700, y: 360, q: 2, vx: 0, vy: 0 }];
  for (let k = 0; k < 400; k++) moveStep(ms, 1e-4, false);
  check('壁と抵抗がなければ運動量の合計は 0 のまま', Math.abs(ms[0].vx + ms[1].vx) < 1e-12 && Math.abs(ms[0].vy + ms[1].vy) < 1e-12 && Math.abs(ms[0].vx) > 1e-4);
  let hot = [{ x: 400, y: 300, q: 5, vx: 0, vy: 0 }, { x: 430, y: 300, q: -5, vx: 0, vy: 0 }];
  for (let k = 0; k < 3000; k++) moveStep(hot, 2e-4, true);
  check('ぶつかっても値がこわれない（NaN にならず速さ ≤ 2 m/s）', hot.every((c) => isFinite(c.x + c.y + c.vx + c.vy) && Math.hypot(c.vx, c.vy) <= 2 + 1e-9));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 2 つの電荷を 10 cm と 20 cm に置いて、F が 1/4 になることをグラフで確かめよう
// 2. ↑ で片方を 2 μC にすると、2 つの電荷が受ける力はそれぞれ何倍？（作用・反作用）
// 3. スペースで動かして、＋ 1 つと − 2 つ、＋ 3 つなどの動き方を比べよう
// 4. 電荷を一直線に 3 つ並べて、まん中の電荷の合計の力が 0 になる置き方を探そう
// 5. KC を 2 倍にした世界では、同じ距離で力は何倍？ MASS や DRAG も変えてみよう


// ==================================================
// ここから下は「電磁気の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- b が a から受けるクーロン力 [N]（a・b は { x, y [px], q [μC] }）。pairForce は接触より近くならない
function pairForceRaw(b, a) {
  let dx = (b.x - a.x) * PX_M, dy = (b.y - a.y) * PX_M, r2 = dx * dx + dy * dy;
  if (r2 === 0) return [0, 0];
  let f = (KC * a.q * b.q * 1e-12) / (r2 * Math.sqrt(r2));
  return [f * dx, f * dy];
}
function pairForce(b, a) {
  let dx = (b.x - a.x) * PX_M, dy = (b.y - a.y) * PX_M, r = Math.hypot(dx, dy);
  if (r === 0) return [0, 0];
  let rc = Math.max(r, CONTACT), f = (KC * a.q * b.q * 1e-12) / (rc * rc);
  return [(f * dx) / r, (f * dy) / r];
}
function netForces(cs) {
  let F = cs.map(() => [0, 0]);
  for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) {
    let f = pairForce(cs[j], cs[i]);
    F[j][0] += f[0]; F[j][1] += f[1]; F[i][0] -= f[0]; F[i][1] -= f[1];      // 作用・反作用
  }
  return F;
}
// ---- 運動を dt 秒ぶん進める（半陰的オイラー法）。walls = true なら 壁・抵抗・衝突・速さの上限あり
function moveStep(cs, dt, walls) {
  let F = netForces(cs);
  cs.forEach((c, i) => {
    if (i === grab) return;
    c.vx += (F[i][0] / MASS) * dt; c.vy += (F[i][1] / MASS) * dt;
    if (walls) {
      c.vx *= Math.exp(-DRAG * dt); c.vy *= Math.exp(-DRAG * dt);
      let v = Math.hypot(c.vx, c.vy); if (v > 2) { c.vx *= 2 / v; c.vy *= 2 / v; }
    }
    c.x += (c.vx * dt) / PX_M; c.y += (c.vy * dt) / PX_M;
  });
  if (!walls) return;
  for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) {     // 玉どうしは重ならない（やわらかくはね返る）
    let a = cs[i], b = cs[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), dmin = CONTACT / PX_M;
    if (d < dmin) {
      if (d < 1e-6) { dx = 1; dy = 0; d = 1; }
      let ux = dx / d, uy = dy / d, push = (dmin - d) / 2;
      a.x -= ux * push; a.y -= uy * push; b.x += ux * push; b.y += uy * push;
      let rel = (b.vx - a.vx) * ux + (b.vy - a.vy) * uy;
      if (rel < 0) { a.vx += 0.75 * rel * ux; a.vy += 0.75 * rel * uy; b.vx -= 0.75 * rel * ux; b.vy -= 0.75 * rel * uy; }
    }
  }
  for (let c of cs) {
    if (c.x < 10) { c.x = 10; c.vx = Math.abs(c.vx) * 0.5; } if (c.x > width - 10) { c.x = width - 10; c.vx = -Math.abs(c.vx) * 0.5; }
    if (c.y < 10) { c.y = 10; c.vy = Math.abs(c.vy) * 0.5; } if (c.y > height - 10) { c.y = height - 10; c.vy = -Math.abs(c.vy) * 0.5; }
  }
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
