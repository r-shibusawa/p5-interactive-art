// ============================================
// 08 ローレンツ力 ─ 磁場の中の荷電粒子は円をえがく
// 力 F = q(E + v × B)。磁場だけなら力はいつも速さに垂直 → 速さは変わらず円運動（半径 r = mv/(qB)、周期 T = 2πm/(qB)）
// 計算はボリス法：電場で半分加速 → 磁場で「回転」→ 電場で半分加速。磁場だけなら速さがきっちり保存される
// 1 円運動 / 2 らせん / 3 E×B ドリフト / 4 質量分析器 / クリック = 粒子を打ち出す / ↑↓ = B / ←→ = 速さ（3 は E、4 は電圧）/ F = 電荷の符号 / C = 消す
// ============================================

const QE = 1.602e-19, MP = 1.673e-27, U_KG = 1.661e-27;   // 電気素量 [C]、陽子の質量、原子質量単位 [kg]
const PXM = 1000;                      // ★ 1 m = 1000 px（1 px = 1 mm）
const TIME = 2e-6;                     // ★ 画面の 1 秒 = 2 μs（とても速いのでスローで見る）
const STEPS_PER_TURN = 200;            // ★ 1 周を何歩で計算するか
let runMode = 1, Bm = 0.01, speed = 1e5, Efield = 200, Vacc = 1000, Bspec = 0.1, chargeSign = 1, paused = false;
let parts = [], hits = [], cx, cy, emitT = 0;
const MASSES = [12, 13, 14];           // ★ 質量分析器に入れるイオン（原子質量単位 u、電荷 +e）

function setup() {
  createCanvas(windowWidth, windowHeight);
  cx = width * 0.45; cy = height * 0.55;
  startMode(1);
  selfTest();
}
function startMode(m) {
  runMode = m; parts = []; hits = [];
  if (runMode === 1) launch(0, (MP * speed) / (QE * Bm), speed, 0, 0);
  if (runMode === 2) launch(0, (MP * speed) / (QE * Bm), speed * 0.95, 0, speed * 0.3);
  if (runMode === 3) launch(-0.5, 0, 0, 0, 0);
}
function launch(x, y, vx, vy, vz, m, q) { if (parts.length >= 14) parts.shift(); parts.push({ x, y, z: runMode === 2 ? -0.2 : 0, vx, vy, vz, m: m || MP, q: q || chargeSign * QE, trail: [] }); }
// 場所ごとの場：4 は y > 0 だけに磁場
function fieldsAt(p) {
  if (runMode === 4) return { E: [0, 0, 0], B: [0, 0, p.y > 0 ? Bspec : 0] };
  if (runMode === 3) return { E: [0, Efield, 0], B: [0, 0, Bm] };
  return { E: [0, 0, 0], B: [0, 0, Bm] };
}
function proj(p) { return runMode === 2 ? [cx + p.x * PXM, cy + 160 + p.y * PXM * 0.35 - p.z * PXM] : [cx + p.x * PXM, cy - p.y * PXM]; }

function draw() {
  background(14, 18, 26);
  let Bnow = runMode === 4 ? Bspec : Bm, dt = (2 * Math.PI * MP) / (QE * Bnow) / STEPS_PER_TURN * (runMode === 4 ? 12 : 1);
  if (!paused) {
    let simT = (Math.min(deltaTime, 50) / 1000) * TIME, n = Math.min(2000, Math.ceil(simT / dt));
    for (let p of parts) for (let k = 0; k < n; k++) { let f = fieldsAt(p); borisStep(p, f.E, f.B, simT / n); }
    for (let p of parts) { pushCap(p.trail, proj(p), 1500); }
    if (runMode === 4) {
      emitT += Math.min(deltaTime, 50);
      if (emitT > 250) { emitT = 0; let m = MASSES[Math.floor(Math.random() * MASSES.length)] * U_KG, v = Math.sqrt((2 * QE * Vacc) / m); launch(-0.25, -0.005, 0, v, 0, m, QE); }
      parts = parts.filter((p) => { if (p.y < -0.006 && p.vy < 0) { hits.push(p.x + 0.25); return false; } return true; });
      if (hits.length > 400) hits.shift();
    }
    if (runMode === 3) parts = parts.filter((p) => p.x < 0.9);
  }
  drawBackground();
  for (let p of parts) {
    stroke(p.q > 0 ? color(255, 140, 90) : color(110, 190, 255)); strokeWeight(1.6); noFill(); polyline(p.trail);
    let s = proj(p); noStroke(); fill(255); circle(s[0], s[1], 8);
    let v = Math.hypot(p.vx, p.vy), f = fieldsAt(p), F = [p.q * (f.E[0] + p.vy * f.B[2]), p.q * (f.E[1] - p.vx * f.B[2])], Fm = Math.hypot(F[0], F[1]);
    if (runMode !== 2 && Fm > 0) { stroke(255, 230, 120); strokeWeight(2); arrowTo(s[0], s[1], s[0] + (F[0] / Fm) * 30, s[1] - (F[1] / Fm) * 30, 7); }
    if (runMode !== 2 && v > 0) { stroke(150, 255, 170); strokeWeight(1.5); arrowTo(s[0], s[1], s[0] + (p.vx / v) * 22, s[1] - (p.vy / v) * 22, 6); }
  }
  drawInfo(Bnow);
  drawSelfTest(20, height - 14);
}

function drawBackground() {
  noStroke(); fill(70, 90, 120);
  if (runMode !== 2) for (let y = 120; y < height; y += 40) for (let x = 20; x < width; x += 40) { if (runMode === 4 && y > cy) continue; circle(x, y, 3); }   // ⊙：磁場は画面から手前へ
  if (runMode === 2) { stroke(70, 90, 120); strokeWeight(1); for (let x = -0.4; x <= 0.4; x += 0.08) line(cx + x * PXM, height - 40, cx + x * PXM, 130); noStroke(); fill(170); textSize(13); text('B は上向き ↑', cx + 0.42 * PXM, 150); }
  if (runMode === 3) { stroke(255, 120, 120, 90); for (let x = 60; x < width; x += 120) arrowTo(x, cy + 160, x, cy + 100, 8); noStroke(); fill(255, 150, 150); textSize(13); text('電場 E は上向き', 70, cy + 186); }
  if (runMode === 4) {
    stroke(200, 205, 215); strokeWeight(3); line(cx - 0.25 * PXM, cy, cx + 0.6 * PXM, cy);
    noStroke(); fill(160, 200, 255); textSize(13); text('加速（' + Vacc + ' V）', cx - 0.25 * PXM - 30, cy + 40); fill(200); text('検出板（y = 0）', cx + 0.45 * PXM, cy + 24);
    // 当たった位置のヒストグラムと、式の位置
    let bins = new Array(120).fill(0); for (let h of hits) { let b = Math.floor((h / 0.6) * 120); if (b >= 0 && b < 120) bins[b]++; }
    let mx = Math.max(1, ...bins); fill(255, 200, 100);
    for (let b = 0; b < 120; b++) rect(cx - 0.25 * PXM + (b * 0.6 * PXM) / 120, cy + 4, (0.6 * PXM) / 120 - 1, (bins[b] / mx) * 60);
    MASSES.forEach((m, k) => { let d = 2 * Math.sqrt((2 * m * U_KG * Vacc) / QE) / Bspec, x = cx - 0.25 * PXM + d * PXM; stroke(150, 255, 170); line(x, cy - 10, x, cy + 70 + 16 * k); noStroke(); fill(150, 255, 170); text(m + ' u', x + 4, cy + 84 + 16 * k); });   // ラベルは段をずらす
  }
}

function drawInfo(Bnow) {
  let p = parts[parts.length - 1], tx = width - 330, y = 140;
  noStroke(); fill(235); textSize(15);
  let lines = [];
  if (runMode === 4) {
    lines.push('B = ' + (Bspec * 1000).toFixed(0) + ' mT、加速電圧 ' + Vacc + ' V', '速さ v = √(2qV/m)、半径 r = mv/(qB)', '→ 当たる位置 2r = (2/B)√(2mV/q)', '質量が大きいほど外側（√m に比例）');
    for (let m of MASSES) lines.push(m + ' u：2r = ' + (200 * Math.sqrt((2 * m * U_KG * Vacc) / QE) / Bspec).toFixed(2) + ' cm');
  } else if (p) {
    let v = Math.hypot(p.vx, p.vy, p.vz), vp = Math.hypot(p.vx, p.vy), T = (2 * Math.PI * p.m) / (Math.abs(p.q) * Bnow);
    lines.push('B = ' + (Bnow * 1000).toFixed(1) + ' mT（陽子 m = 1.67×10⁻²⁷ kg）', '電荷 q = ' + (p.q > 0 ? '+' : '−') + 'e', '速さ |v| = ' + sci(v) + ' m/s');
    if (runMode !== 3) lines.push('半径 r = mv⊥/(qB) = ' + (((p.m * vp) / (Math.abs(p.q) * Bnow)) * 100).toFixed(2) + ' cm', '周期 T = 2πm/(qB) = ' + (T * 1e6).toFixed(3) + ' μs', '（T は速さによらない！）');
    if (runMode === 2) lines.push('らせんの間隔 = v∥·T = ' + ((p.vz * T) * 100).toFixed(2) + ' cm');
    if (runMode === 3) lines.push('電場 E = ' + Efield + ' V/m', 'ドリフトの速さ E/B = ' + sci(Efield / Bnow) + ' m/s', '平均の速さ（計算）= ' + sci(driftNow(p)) + ' m/s');
  }
  for (let s of lines) { text(s, tx, y); y += 26; }
  fill(235); textSize(17);
  text('1 円運動　2 らせん　3 E×B ドリフト　4 質量分析器 ｜ クリック 打ち出す　↑↓ B　←→ ' + ['', '速さ', '速さ', '電場 E', '加速電圧'][runMode] + '　F 符号　C 消す　スペース 止める', 20, 34);
  fill(170); textSize(13);
  text('橙 = ＋の粒子、青 = −の粒子。黄の矢印 = 力 F、緑 = 速度 v。点々 = 画面から手前へ向かう磁場。1 px = 1 mm、時間は画面の 1 秒 = ' + TIME * 1e6 + ' μs', 20, 60, width - 40);
  fill(170); text('ボリス法：v⁻ = v + (qE/m)(Δt/2) → v⁻ を B のまわりに角度 2·atan(qBΔt/2m) 回す → さらに (qE/m)(Δt/2)。1 周 ' + STEPS_PER_TURN + ' 歩', 20, 100, width - 40);
}
let driftLog = [];
function driftNow(p) { pushCap(driftLog, [p.x, performance.now()], 120); if (driftLog.length < 2) return 0; let a = driftLog[0], b = driftLog[driftLog.length - 1]; return (b[0] - a[0]) / (((b[1] - a[1]) / 1000) * TIME); }

function mousePressed() {
  let x = (mouseX - cx) / PXM, y = (cy - mouseY) / PXM;
  if (runMode === 1) launch(x, y, speed, 0, 0);
  if (runMode === 2) launch(x, 0, speed * 0.95, 0, speed * 0.3);
  if (runMode === 3) launch(x, y, 0, 0, 0);
}
function keyPressed() {
  if (key >= '1' && key <= '4') startMode(+key);
  if (key === UP_ARROW) { if (runMode === 4) Bspec = Math.min(0.3, Bspec * 1.25); else Bm = Math.min(0.05, Bm * 1.25); }
  if (key === DOWN_ARROW) { if (runMode === 4) Bspec = Math.max(0.05, Bspec / 1.25); else Bm = Math.max(0.002, Bm / 1.25); }
  let d = key === RIGHT_ARROW ? 1 : key === LEFT_ARROW ? -1 : 0;
  if (d) {
    if (runMode === 3) Efield = clampv(Efield + 50 * d, 0, 600);
    else if (runMode === 4) Vacc = clampv(Vacc + 250 * d, 250, 3000);
    else speed = clampv(speed * Math.pow(1.25, d), 2e4, 3e5);
  }
  if (key === 'f' || key === 'F') chargeSign *= -1;
  if (key === 'c' || key === 'C') { parts = []; hits = []; driftLog = []; }
  if (key === ' ') paused = !paused;
  if (key === 'r' || key === 'R') { Bm = 0.01; speed = 1e5; Efield = 200; Vacc = 1000; Bspec = 0.1; chargeSign = 1; startMode(runMode); }
  return false;
}

// ---- 自己テスト：式で計算できる値と比べる
function selfTest() {
  selfTestResults = [];
  let B = [0, 0, 0.01], E0 = [0, 0, 0], T = (2 * Math.PI * MP) / (QE * 0.01), dt = T / STEPS_PER_TURN, v0 = 1e5;
  let p = { x: 0, y: 0, z: 0, vx: v0, vy: 0, vz: 0, m: MP, q: QE }, r0 = (MP * v0) / (QE * 0.01), pos = [], maxV = 0, rmin = 1e9, rmax = 0, cross = [], prevY = 0;
  for (let k = 0; k < STEPS_PER_TURN * 20; k++) {
    borisStep(p, E0, B, dt);
    maxV = Math.max(maxV, Math.abs(Math.hypot(p.vx, p.vy, p.vz) - v0) / v0);
    pos.push([p.x, p.y]);
    if (prevY < 0 && p.vy >= 0) cross.push((k + 1) * dt - (dt * p.vy) / (p.vy - prevY));
    prevY = p.vy;
  }
  let xs = pos.map((q) => q[0]), ys = pos.map((q) => q[1]), cyc = [(Math.max(...xs) + Math.min(...xs)) / 2, (Math.max(...ys) + Math.min(...ys)) / 2];   // 円の中心
  for (let q of pos) { let r = Math.hypot(q[0] - cyc[0], q[1] - cyc[1]); rmin = Math.min(rmin, r); rmax = Math.max(rmax, r); }
  check('磁場だけなら速さは変わらない（20 周で 10⁻¹² 以内）', maxV < 1e-12);
  check('周期 T = 2πm/(qB)（0.1% 以内）', cross.length > 5 && nearRel((cross[cross.length - 1] - cross[0]) / (cross.length - 1), T, 0.001));
  check('半径 r = mv/(qB)（0.1% 以内）', nearRel(rmin, r0, 0.001) && nearRel(rmax, r0, 0.001));
  let h = { x: 0, y: 0, z: 0, vx: v0, vy: 0, vz: 3e4, m: MP, q: QE }; for (let k = 0; k < STEPS_PER_TURN * 3; k++) borisStep(h, E0, B, dt);
  check('らせんの間隔 = v∥·T', nearRel(h.z, 3 * 3e4 * T, 1e-9));
  let e = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, m: MP, q: QE }; for (let k = 0; k < STEPS_PER_TURN * 10; k++) borisStep(e, [0, 200, 0], B, dt);
  check('E×B ドリフト：10 周の平均の速さ = E/B（1% 以内）', nearRel(e.x / (10 * T), 200 / 0.01, 0.01));
  let land = (m) => { let q = { x: 0, y: 0, z: 0, vx: 0, vy: Math.sqrt((2 * QE * 1000) / m), vz: 0, m, q: QE }, d = (2 * Math.PI * m) / (QE * 0.1) / 2000; for (let k = 0; k < 4000; k++) { let py = q.y; borisStep(q, E0, [0, 0, 0.1], d); if (py > 0 && q.y <= 0) return q.x; } return NaN; };
  check('質量分析器：質量 2 倍 → 当たる位置は √2 倍（0.5% 以内）', nearRel(land(24 * U_KG) / land(12 * U_KG), Math.SQRT2, 0.005));
  let n = { x: 0, y: 0, z: 0, vx: v0, vy: 0, vz: 0, m: MP, q: -QE }, pp = { x: 0, y: 0, z: 0, vx: v0, vy: 0, vz: 0, m: MP, q: QE };
  borisStep(n, E0, B, dt); borisStep(pp, E0, B, dt);
  check('電荷の符号を変えると曲がる向きが逆', n.vy > 0 && pp.vy < 0 && near(n.vy, -pp.vy, 1e-9));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. ←→ で速さを変えると半径は？ 周期は？（周期が速さによらないのがサイクロトロンのしくみ）
// 2. ↑ で B を 2 倍にすると半径と周期は何倍？
// 3. 3 の E×B ドリフトで、電荷の符号を F で変えても 進む向きが同じなのはなぜ？
// 4. 4 の質量分析器で、12 u と 13 u がちゃんと分かれる B と電圧を探そう
// 5. STEPS_PER_TURN を 10 にしても、ボリス法なら速さは変わらない。半径と周期はどうなる？


// ==================================================
// ここから下は「電磁気の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- ボリス法の 1 歩：粒子 p（位置 [m]、速度 [m/s]、m [kg]、q [C]）を E [V/m]、B [T] の中で dt 秒進める
function borisStep(p, E, B, dt) {
  let k = (p.q * dt) / (2 * p.m);
  let vx = p.vx + k * E[0], vy = p.vy + k * E[1], vz = p.vz + k * E[2];                       // 電場で半分
  let tx = k * B[0], ty = k * B[1], tz = k * B[2], t2 = tx * tx + ty * ty + tz * tz;
  let px = vx + (vy * tz - vz * ty), py = vy + (vz * tx - vx * tz), pz = vz + (vx * ty - vy * tx);   // v' = v⁻ + v⁻ × t
  let s = 2 / (1 + t2);
  vx += s * (py * tz - pz * ty); vy += s * (pz * tx - px * tz); vz += s * (px * ty - py * tx);   // v⁺ = v⁻ + v' × s
  p.vx = vx + k * E[0]; p.vy = vy + k * E[1]; p.vz = vz + k * E[2];                          // 電場でもう半分
  p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
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
