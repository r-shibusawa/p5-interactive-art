// ============================================
// 10 オートポイエーシス（ヴァレラ・マトゥラーナ・ウリベ 1974 の人工化学の考え方）
// 触媒 K のそばで、基質 S が 2 つ結びついてリンク L になる。L どうしがつながって膜になり、膜は自然にこわれる
// こわれた所には、内側で作られた新しい L が入ってつながる → 「自分を作るものを、自分で作り続ける」まとまり
// クリック・ドラッグ = 膜をこわす / ↑↓ = こわれやすさ / K = 触媒を取り除く・戻す / スペース = 一時停止 / R = 最初から
// ============================================

const NX = 48, NY = 32;            // 格子の大きさ
const EMPTY = 0, SUB = 1, CAT = 2, LINK = 3;
let pProd = 0.5;                   // ★ 触媒のそばで S + S → L になる確率
let pBond = 0.6;                   // ★ となりの L とつながる確率
let pDecay = 0.0003;               // ★ L がこわれて S + S にもどる確率（1 回の番ごと）
const RING_R = 3;                 // ★ はじめの膜の半径（マス）
const EVENTS = 2500;               // 1 フレームで何回「番」を回すか
let lastArea = 0, world, rng, paused = false, histL = [], breaches = 0, repairs = 0, wasClosed = true, catOn = true;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  selfTest();
  rng = makeRng(74);
  world = makeWorld(rng);
}
// ---- 世界：種類の配列 type と、つながり bonds（各マス最大 2 本）
function makeWorld(r) {
  let w = { type: new Int8Array(NX * NY), bonds: [] };
  for (let i = 0; i < NX * NY; i++) { w.type[i] = r() < 0.75 ? SUB : EMPTY; w.bonds.push([]); }
  let cx = NX / 2, cy = NY / 2, ring = [];
  for (let k = 0; k < 400; k++) {
    let a = (k / 400) * TWO_PI, x = Math.round(cx + RING_R * Math.cos(a)), y = Math.round(cy + RING_R * Math.sin(a)), i = y * NX + x;
    if (!ring.length || (ring[ring.length - 1] !== i && ring[0] !== i)) ring.push(i);
  }
  for (let i of ring) w.type[i] = LINK;
  for (let k = 0; k < ring.length; k++) bond(w, ring[k], ring[(k + 1) % ring.length]);
    w.type[cy * NX + cx] = CAT;
  return w;
}
function bond(w, a, b) { if (!w.bonds[a].includes(b)) { w.bonds[a].push(b); w.bonds[b].push(a); } }
function unbondAll(w, a) { for (let b of w.bonds[a]) w.bonds[b] = w.bonds[b].filter((c) => c !== a); w.bonds[a] = []; }
function nb8(i) { let x = i % NX, y = (i / NX) | 0, out = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; let X = x + dx, Y = y + dy; if (X >= 0 && X < NX && Y >= 0 && Y < NY) out.push(Y * NX + X); } return out; }
function nearCat(w, i, r) { let x = i % NX, y = (i / NX) | 0; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { let X = x + dx, Y = y + dy; if (X >= 0 && X < NX && Y >= 0 && Y < NY && w.type[Y * NX + X] === CAT) return true; } return false; }
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
function at(i, d, k) { let x = (i % NX) + d[0] * k, y = ((i / NX) | 0) + d[1] * k; return x >= 0 && x < NX && y >= 0 && y < NY ? y * NX + x : -1; }
function swap(w, a, b) { let t = w.type[a]; w.type[a] = w.type[b]; w.type[b] = t; let ba = w.bonds[a]; w.bonds[a] = w.bonds[b]; w.bonds[b] = ba; for (let c of w.bonds[a]) w.bonds[c] = w.bonds[c].map((v) => (v === b ? a : v)); for (let c of w.bonds[b]) w.bonds[c] = w.bonds[c].map((v) => (v === a ? b : v)); }

// ---- 1 回の番：ランダムな 1 マスが、その種類の規則で動く
function event(w, r, p) {
  let i = Math.floor(r() * NX * NY), t = w.type[i], d = DIRS[Math.floor(r() * 4)], j = at(i, d, 1);
  if (t === SUB) {                                         // 基質：空きへ動く。つながった膜はとびこえて通りぬける
    if (j < 0) return;
    if (w.type[j] === EMPTY) swap(w, i, j);
    else if (w.type[j] === LINK && w.bonds[j].length) { let k = at(i, d, 2); if (k >= 0 && w.type[k] === EMPTY) swap(w, i, k); }
  } else if (t === CAT) {                                  // 触媒：動く（膜には近づかない）＋ 生成 S + S → L
    let ss = nb8(i).filter((q) => w.type[q] === SUB);
    if (p.cat && ss.length >= 2 && r() < p.prod) { w.type[ss[0]] = LINK; w.type[ss[1]] = EMPTY; return; }
    if (j >= 0 && (w.type[j] === EMPTY || w.type[j] === SUB) && !nb8(j).some((q) => w.type[q] === LINK && w.bonds[q].length)) swap(w, i, j);   // 膜にはくっつかない
  } else if (t === LINK) {
    if (r() < p.decay) {                                   // 崩壊 L → S + S（となりに空きがあるときだけ）
      let e = nb8(i).filter((q) => w.type[q] === EMPTY);
      if (e.length) { unbondAll(w, i); w.type[i] = SUB; w.type[e[0]] = SUB; }
      return;
    }
    let nearK = nearCat(w, i, 2);
    if (w.bonds[i].length < 2 && !nearK) {                 // 結合：となりの L（つながり 2 本未満）とつながる（触媒の 2 マス以内ではつながらない）
      for (let q of nb8(i)) if (w.type[q] === LINK && q !== i && w.bonds[q].length < 2 && !w.bonds[i].includes(q) && w.bonds[i].length < 2 && r() < p.bond) bond(w, i, q);
    }
    if (!w.bonds[i].length && j >= 0 && (w.type[j] === EMPTY || w.type[j] === SUB)) swap(w, i, j);   // つながっていない L は動く
  }
}
// ---- 膜は閉じている？：触媒から、つながった L を通らずに外の端まで行けなければ「閉じている」
function isClosed(w) {
  let start = []; for (let i = 0; i < NX * NY; i++) if (w.type[i] === CAT) start.push(i);
  if (!start.length) return false;
  let seen = new Uint8Array(NX * NY), stack = start.slice(); for (let s of start) seen[s] = 1;
  let area = 0;
  while (stack.length) {
    let i = stack.pop(), x = i % NX, y = (i / NX) | 0; area++;
    if (x === 0 || y === 0 || x === NX - 1 || y === NY - 1) return false;
    for (let d of DIRS) { let j = at(i, d, 1); if (j >= 0 && !seen[j] && !(w.type[j] === LINK && w.bonds[j].length)) { seen[j] = 1; stack.push(j); } }
  }
  lastArea = area;
  return true;
}
function counts(w) { let c = [0, 0, 0, 0], b = 0; for (let i = 0; i < NX * NY; i++) { c[w.type[i]]++; b += w.bonds[i].length; } return { S: c[SUB], K: c[CAT], L: c[LINK], E: c[EMPTY], bonds: b / 2 }; }
function breakAt(w, gx, gy, rad) {                       // こわす：つながりを切り、空きがあれば L → S + S（数は保存）
  for (let i = 0; i < NX * NY; i++) { let x = i % NX, y = (i / NX) | 0; if ((x - gx) ** 2 + (y - gy) ** 2 <= rad * rad && w.type[i] === LINK) { unbondAll(w, i); let e = nb8(i).filter((q) => w.type[q] === EMPTY); if (e.length) { w.type[i] = SUB; w.type[e[0]] = SUB; } } }
}

function draw() {
  background(24, 35, 10);
  let p = { prod: pProd, bond: pBond, decay: pDecay, cat: catOn };
  if (!paused) for (let k = 0; k < EVENTS; k++) event(world, rng, p);
  let cl = isClosed(world), c = counts(world);
  if (wasClosed && !cl) breaches++; if (!wasClosed && cl) repairs++; wasClosed = cl;
  if (frameCount % 4 === 0) { histL.push([c.L, c.bonds, cl ? 1 : 0]); if (histL.length > 400) histL.shift(); }

  say('オートポイエーシス ─ 膜をこわしても、内側で作られた部品で自分を直す', 20, 36, 20);
  say('クリック・ドラッグ 膜をこわす　↑↓ こわれやすさ ' + pDecay.toFixed(4) + '　K 触媒 ' + (catOn ? 'はたらく' : '止めた') + '　スペース ' + (paused ? '再開' : '一時停止') + '　R 最初から', 20, 62, 15, C_SUB);
  let cs = Math.min((width * 0.66) / NX, (height - 130) / NY), gx = 20, gy = 90;
  noStroke(); fill(28, 25, 12); rect(gx, gy, NX * cs, NY * cs);
  for (let i = 0; i < NX * NY; i++) {
    let t = world.type[i], x = gx + (i % NX) * cs + cs / 2, y = gy + ((i / NX) | 0) * cs + cs / 2;
    if (t === SUB) { fill(200, 30, 55); circle(x, y, cs * 0.35); }
    else if (t === CAT) { fill(col(C_ALARM)); circle(x, y, cs * 0.95); }
    else if (t === LINK) { fill(world.bonds[i].length ? col(C_TUBE) : col(C_BRASS)); rect(x - cs * 0.32, y - cs * 0.32, cs * 0.64, cs * 0.64, 2); }
  }
  stroke(col(C_TUBE)); strokeWeight(Math.max(2, cs * 0.18));
  for (let i = 0; i < NX * NY; i++) for (let j of world.bonds[i]) if (j > i) line(gx + (i % NX) * cs + cs / 2, gy + ((i / NX) | 0) * cs + cs / 2, gx + (j % NX) * cs + cs / 2, gy + ((j / NX) | 0) * cs + cs / 2);

  let hx = gx + NX * cs + 30, hy = 110;
  say(cl ? '膜は閉じている ✓（内側 ' + lastArea + ' マス）' : '膜に穴がある（触媒が外とつながっている）', hx, hy, 20, cl ? C_SCOPE : C_ALARM);
  say('基質 S ' + c.S + '　リンク L ' + c.L + '　つながり ' + c.bonds + '　触媒 K ' + c.K, hx, hy + 32, 15);
  say('S + 2L = ' + (c.S + 2 * c.L) + '（生成も崩壊もこの数を変えない）', hx, hy + 56, 15, C_TUBE);
  say('穴があいた ' + breaches + ' 回　→ 直った ' + repairs + ' 回', hx, hy + 80, 15, C_BRASS);
  say('赤 = 触媒 K、青い点 = 基質 S', hx, hy + 112, 13, C_SUB);
  say('オレンジ = 膜の L、黄 = まだつながっていない L', hx, hy + 132, 13, C_SUB);
  let pgy = hy + 160, pgw = width - hx - 30, pgh = Math.min(220, height - pgy - 60);
  plotFrame(hx, pgy, pgw, pgh, 'L の数（オレンジ）・つながり（黄）・閉じている（緑の帯）');
  let mx = Math.max(60, ...histL.map((h) => h[0])) * 1.2;
  plotLine(histL.map((h) => h[0]), hx, pgy, pgw, pgh, 0, mx, C_TUBE, 400, 2);
  plotLine(histL.map((h) => h[1]), hx, pgy, pgw, pgh, 0, mx, C_BRASS, 400, 1.5);
  plotLine(histL.map((h) => h[2]), hx, pgy + pgh - 26, pgw, 20, 0, 1, C_SCOPE, 400, 2);
  drawSelfTest();
}

function mousePressed() { hitMembrane(); }
function mouseDragged() { hitMembrane(); }
function hitMembrane() {
  let cs = Math.min((width * 0.66) / NX, (height - 130) / NY), x = (mouseX - 20) / cs, y = (mouseY - 90) / cs;
  if (x >= 0 && x < NX && y >= 0 && y < NY) breakAt(world, Math.floor(x), Math.floor(y), 1.5);
}
function keyPressed() {
  if (key === UP_ARROW) pDecay = Math.min(0.01, pDecay * 1.5);
  if (key === DOWN_ARROW) pDecay = Math.max(0.0001, pDecay / 1.5);
  if (key === 'k' || key === 'K') catOn = !catOn;
  if (key === ' ') paused = !paused;
  if (key === 'r' || key === 'R') { world = makeWorld(rng); histL = []; breaches = 0; repairs = 0; wasClosed = true; }
}

// ---- 自己テスト
function bondsOk(w) {
  for (let i = 0; i < NX * NY; i++) {
    if (w.bonds[i].length > 2) return false;
    if (w.bonds[i].length && w.type[i] !== LINK) return false;
    for (let j of w.bonds[i]) { if (!w.bonds[j].includes(i)) return false; if (Math.max(Math.abs((i % NX) - (j % NX)), Math.abs(((i / NX) | 0) - ((j / NX) | 0))) !== 1) return false; }
  }
  return true;
}
// 触媒を囲む膜の L を 1 つ見つける（塗りつぶしの境目）
function wallCell(w) {
  let K = w.type.indexOf(CAT), seen = new Uint8Array(NX * NY), st = [K]; seen[K] = 1;
  while (st.length) { let i = st.pop(); for (let d of DIRS) { let j = at(i, d, 1); if (j < 0 || seen[j]) continue; if (w.type[j] === LINK && w.bonds[j].length) return j; seen[j] = 1; st.push(j); } }
  return K;
}
function selfTest() {
  selfTestResults = [];
  let r = makeRng(5), w = makeWorld(r), c0 = counts(w), p = { prod: 0.5, bond: 0.6, decay: 0.0003, cat: true };
  check('はじめの輪の膜は閉じている、つながりは全部 2 本', isClosed(w) && bondsOk(w) && w.bonds.every((b, i) => w.type[i] !== LINK || b.length === 2));
  let mass = true, inv = true;
  for (let k = 0; k < 80000; k++) { event(w, r, p); if (k % 5000 === 0) { let c = counts(w); if (c.S + 2 * c.L !== c0.S + 2 * c0.L || c.K !== 1) mass = false; if (!bondsOk(w)) inv = false; } }
  check('8 万回の番で S + 2L = ' + (c0.S + 2 * c0.L) + ' が一定（生成 2S → L、崩壊 L → 2S）、触媒は 1 個のまま', mass);
  check('つながりはいつも「最大 2 本・両方向・となりのマスどうし・L だけ」', inv);
  let r2 = makeRng(9), w2 = makeWorld(r2);
  for (let k = 0; k < 150 * EVENTS; k++) event(w2, r2, p);                 // 150 フレームぶん動かして、落ちついた膜で試す
  let before = isClosed(w2), wall = wallCell(w2);
  breakAt(w2, wall % NX, (wall / NX) | 0, 1.5);
  let opened = !isClosed(w2), t = 0;
  while (t < 600 * EVENTS && (t % 250 || !isClosed(w2))) { event(w2, r2, p); t++; }
  check('落ちついた膜（150 フレーム後）の壁を 3×3 こわすと穴があく → ' + (t / EVENTS).toFixed(0) + ' フレームぶんで自分で閉じる（内側 ' + lastArea + ' マス）', before && opened && isClosed(w2));
  let wa = makeWorld(makeRng(3)), wb = makeWorld(makeRng(3)), ra = makeRng(4), rb = makeRng(4), pa = { ...p, decay: 0.003 }, pb = { ...pa, cat: false };
  for (let k = 0; k < 120000; k++) { event(wa, ra, pa); event(wb, rb, pb); }
  check('触媒が L を作らないと膜はやせて開く（L：はたらく ' + counts(wa).L + ' 個 > 止めた ' + counts(wb).L + ' 個）', counts(wa).L > counts(wb).L && !isClosed(wb));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 膜をクリックでこわし、直るまでの様子を見よう。どこから L がやってくる？
// 2. K で触媒を止めると、膜はどうなる？ これは「死」と呼べる？
// 3. ↑ でこわれやすさを上げていくと、直すのが追いつかなくなるのはどこ？
// 4. pBond を小さくすると、膜の形はどう変わる？
// 5. 「生きている」とは何か。この膜は 3 の亀や 4 のホメオスタットとどこがちがう？ 話し合おう


// ==================================================
// ここから下は「サイバネティクスの道具」（中身は読まなくても OK。消さないでね）
// ==================================================
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
function fin(v, d) { return Number.isFinite(v) ? v : d; }        // NaN・Infinity なら d にもどす
// 決まった種（seed）から毎回同じ乱数列（0〜1）を出す。自己テストをいつも同じにするため
function makeRng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ---- 画面の道具（色は [色相, 彩度, 明るさ] の配列）
const C_TXT = [40, 12, 96], C_SUB = [35, 18, 72], C_SCOPE = [135, 70, 92], C_TUBE = [24, 85, 100], C_BRASS = [42, 55, 88], C_ALARM = [0, 80, 100];
function col(c, a) { return color(c[0], c[1], c[2], a === undefined ? 100 : a); }
function say(s, x, y, size, c) { noStroke(); fill(col(c || C_TXT)); textSize(size || 15); text(s, x, y); }
// オシロスコープ風の枠
function plotFrame(x, y, w, h, title) {
  noStroke(); fill(130, 40, 6, 90); rect(x, y, w, h, 6);
  stroke(130, 40, 40, 40); strokeWeight(1);
  for (let k = 1; k < 4; k++) line(x, y + (h * k) / 4, x + w, y + (h * k) / 4);
  noFill(); stroke(C_BRASS[0], C_BRASS[1], 60); rect(x, y, w, h, 6);
  if (title) say(title, x + 8, y + 18, 13, C_SUB);
}
// arr の値を lo〜hi の範囲で、枠 (x, y, w, h) に折れ線で描く（n = 横に並べる点の数）
function plotLine(arr, x, y, w, h, lo, hi, c, n, wt) {
  if (!arr || arr.length < 2) return;
  n = n || arr.length;
  stroke(col(c)); strokeWeight(wt || 2); noFill();
  beginShape();
  for (let i = 0; i < arr.length; i++) vertex(x + (i / (n - 1)) * w, y + h - clampv((fin(arr[i], lo) - lo) / (hi - lo), 0, 1) * h);
  endShape();
}
function hLine(v, x, y, w, h, lo, hi, c) {   // グラフの中の水平線（目標値など）
  let yy = y + h - clampv((v - lo) / (hi - lo), 0, 1) * h;
  stroke(col(c, 70)); strokeWeight(1); drawingContext.setLineDash([6, 5]); line(x, yy, x + w, yy); drawingContext.setLineDash([]);
}
// ブロック図の箱（名前と今の値）
function blockBox(x, y, w, h, name, val, c) {
  stroke(col(c || C_BRASS)); strokeWeight(2); fill(25, 40, 16); rect(x, y, w, h, 8);
  noStroke(); fill(col(C_TXT)); textAlign(CENTER, CENTER); textSize(15); text(name, x + w / 2, y + h / 2 - (val === undefined ? 0 : 10));
  if (val !== undefined) { fill(col(c || C_TUBE)); textSize(14); text(val, x + w / 2, y + h / 2 + 12); }
  textAlign(LEFT, BASELINE);
}
// 信号の矢印：点が流れて「ループを回る」ようすを見せる（phase = 0〜1）
function flowArrow(x1, y1, x2, y2, c, phase, label) {
  stroke(col(c)); strokeWeight(2); line(x1, y1, x2, y2);
  let a = Math.atan2(y2 - y1, x2 - x1);
  noStroke(); fill(col(c)); triangle(x2, y2, x2 - 11 * Math.cos(a - 0.4), y2 - 11 * Math.sin(a - 0.4), x2 - 11 * Math.cos(a + 0.4), y2 - 11 * Math.sin(a + 0.4));
  for (let k = 0; k < 3; k++) { let f = (phase + k / 3) % 1; circle(x1 + (x2 - x1) * f, y1 + (y2 - y1) * f, 6); }
  if (label) { fill(col(C_SUB)); textSize(13); text(label, (x1 + x2) / 2 + 6, (y1 + y2) / 2 - 6); }
}

// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return Number.isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest() { say(selfTestLine(), 20, height - 16, 14, selfTestResults.every((r) => r.ok) ? C_SCOPE : C_ALARM); }
