// ============================================
// 00 身近な状態機械 ─ 自動販売機と押しボタン式の信号機
// 機械が覚えているのは「いまの状態」だけ。入力が来るたびに表を見て次の状態へ移る。
// 自動販売機はミーリー型（遷移のときに出力：ジュースとおつり）、信号機はムーア型（状態そのものが出力：灯りの色）
// 1 = 10 円 / 2 = 50 円 / 3 = 100 円 / R = 返却レバー / B = 信号の押しボタン / ボタンのクリックでも OK
// ============================================

const PRICE = 100;                      // ★ ジュースの値段（10 円単位。状態の数 = PRICE / 10）
const COINS = [10, 50, 100];            // ★ 入れられるお金
const LIGHT_SEC = [3, 1.5, 1.2, 3, 1.5];// ★ 信号の各状態の長さ（秒）。0 番は「最低これだけ青」
let vend, vendPos, credit = 0, lastVend = null, vendLog = [], bank = { drinks: 0, change: 0, inserted: 0 };
let sig, sigPos, sigQ = 0, sigT = 0, lastSig = null, buttons = [];
const SIG_NAMES = ['車 青', '車 青\n（押された）', '車 黄', '歩 青', '歩 点滅'];
const SIG_OUT = [['G', 'R'], ['G', 'R'], ['Y', 'R'], ['R', 'G'], ['R', 'B']];   // ムーア型の出力 [車, 歩行者]（B = 点滅）

function setup() {
  createCanvas(windowWidth, windowHeight);
  vend = buildVending(); sig = buildSignal();
  layout(); selfTest();
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); layout(); }
function layout() {
  let rad = Math.min(width * 0.18, height * 0.27);
  vendPos = circleLayout(vend.n, width * 0.26, height * 0.5, rad, -Math.PI / 2);
  sigPos = circleLayout(sig.n, width * 0.7, height * 0.5, rad * 0.85, Math.PI);
}

// ★ 自動販売機（ミーリー型）：状態 = 入っている金額。表 tr[状態][入力] = 次の状態、out[状態][入力] = 出力
function vendStep(c, inp) {
  if (inp === 'R') return [0, { drink: false, change: c }];              // 返却：全部返す
  let t = c + Number(inp);
  if (t >= PRICE) return [0, { drink: true, change: t - PRICE }];       // 足りた：ジュースとおつり
  return [t, { drink: false, change: 0 }];
}
function buildVending() {
  let n = PRICE / 10, m = { n, alpha: COINS.map(String).concat(['R']), tr: [], out: [], start: 0, acc: new Array(n).fill(false) };
  for (let q = 0; q < n; q++) {
    m.tr.push({}); m.out.push({});
    for (let c of m.alpha) { let [t, o] = vendStep(q * 10, c); m.tr[q][c] = t / 10; m.out[q][c] = o; }
  }
  return m;
}
// ★ 信号機（ムーア型）：入力 b = ボタン、t = 時間切れ。出力は状態で決まる（SIG_OUT）
function buildSignal() {
  let tr = [{ b: 1, t: 0 }, { b: 1, t: 2 }, { b: 2, t: 3 }, { b: 3, t: 4 }, { b: 4, t: 0 }];
  return { n: 5, alpha: ['b', 't'], tr, start: 0, acc: [false, false, false, false, false] };
}

function insert(c) {
  let q = credit / 10, t = vend.tr[q][c], o = vend.out[q][c];
  lastVend = { from: q, to: t, c, o, life: 90 };
  if (c !== 'R') bank.inserted += Number(c);
  if (o.drink) bank.drinks++;
  bank.change += o.change;
  credit = t * 10;
  vendLog.unshift((c === 'R' ? '返却' : c + '円') + ' → ' + (o.drink ? 'ジュース' : '') + (o.change ? (o.drink ? '・' : '') + 'おつり ' + o.change + '円' : o.drink ? '' : '（なし）'));
  vendLog = vendLog.slice(0, 6);
}
function signalInput(c) { let t = sig.tr[sigQ][c]; lastSig = { from: sigQ, to: t, c, life: 60 }; if (t !== sigQ) sigT = 0; sigQ = t; }

function draw() {
  background(...BG);
  hudTitle('身近な状態機械：自動販売機（ミーリー型）と信号機（ムーア型）', '1 = 10円　2 = 50円　3 = 100円　R 返却　B 信号の押しボタン　（下のボタンのクリックでも）');
  // 信号の時計：時間がたつと入力 t が来る
  sigT += deltaTime / 1000;
  if (sigT >= LIGHT_SEC[sigQ] && sigQ !== 0) signalInput('t');
  if (sigQ === 0) sigT = Math.min(sigT, LIGHT_SEC[0]);

  // ---- 自動販売機の図
  let hiV = {}; hiV[credit / 10] = AMBER;
  drawMachine(vend, vendPos, { r: 26, names: vendPos.map((_, q) => q * 10 + '円'), hi: hiV, labels: false, edgeCol: [50, 90, 70], nameSize: 13,
    edgeHi: (e) => (lastVend && lastVend.life > 0 && e.from === lastVend.from && e.to === lastVend.to ? AMBER : null) });
  if (lastVend && lastVend.life > 0) {
    lastVend.life--;
    let o = lastVend.o, s = (lastVend.c === 'R' ? '返却' : lastVend.c + '円') + ' / ' + (o.drink ? 'ジュース ' : '') + (o.change ? 'おつり ' + o.change + '円' : o.drink ? '' : '出力なし');
    noStroke(); fill(...AMBER); textSize(18); textAlign(CENTER, CENTER); text(s, width * 0.26, height * 0.5);
  }
  noStroke(); fill(...INK); textSize(15); textAlign(LEFT, BASELINE);
  text('入っている金額 = 状態：' + credit + '円　（ジュース ' + PRICE + '円）', 30, 96);
  fill(...DIMC); text('ジュース ' + bank.drinks + ' 本、おつり合計 ' + bank.change + '円、入れた合計 ' + bank.inserted + '円', 30, 118);
  vendLog.forEach((s, i) => { fill(...INK, 230 - i * 35); textSize(13); text(s, 30, height - 150 + i * 18); });

  // ---- 信号機の図
  let hiS = {}; hiS[sigQ] = CYAN;
  drawMachine(sig, sigPos, { r: 34, names: SIG_NAMES, hi: hiS, nameSize: 12,
    edgeHi: (e) => (lastSig && lastSig.life > 0 && e.from === lastSig.from && e.to === lastSig.to ? CYAN : null) });
  if (lastSig) lastSig.life--;
  drawLights(width * 0.7, height * 0.5, SIG_OUT[sigQ]);
  noStroke(); fill(...DIMC); textSize(14); textAlign(LEFT, BASELINE);
  text('b = ボタン、t = 時間切れ（残り ' + fmtN(Math.max(0, LIGHT_SEC[sigQ] - sigT), 1) + ' 秒）。出力（灯りの色）は状態だけで決まる', width * 0.48, 96);

  // ---- ボタン
  buttons = [['10', '10円'], ['50', '50円'], ['100', '100円'], ['R', '返却'], ['b', '押しボタン']];
  buttons.forEach((b, i) => {
    let x = 30 + i * 118, y = height - 46; b.push(x, y, 108, 32);
    stroke(...(i < 4 ? AMBER : CYAN)); strokeWeight(1.5); fill(...PANEL); rect(x, y, 108, 32, 6);
    noStroke(); fill(...INK); textSize(14); textAlign(CENTER, CENTER); text(b[1], x + 54, y + 16);
  });
  noStroke(); fill(...DIMC); textSize(13); textAlign(LEFT, BASELINE);
  text('ミーリー型：出力は「矢印」につく（何を入れたかで、おつりが変わる）／ムーア型：出力は「丸」につく（論理回路の順序回路と同じ考え方）', 30, height - 64);
  drawSelfTest(width - 180, height - 14);
}
function drawLights(cx, cy, out) {     // 車の信号（3 つ）と歩行者の信号（2 つ）
  let on = (c, want) => (c === want || (c === 'B' && want === 'G' && frameCount % 30 < 15));
  noStroke(); fill(20, 26, 22); rect(cx - 66, cy - 22, 132, 44, 10); rect(cx - 22, cy + 34, 44, 74, 8);
  [['G', [60, 230, 120]], ['Y', [255, 200, 40]], ['R', [255, 70, 70]]].forEach(([k, col], i) => { fill(...(out[0] === k ? col : col.map((v) => v * 0.2))); circle(cx - 40 + i * 40, cy, 30); });
  [['R', [255, 70, 70]], ['G', [60, 230, 120]]].forEach(([k, col], i) => { fill(...(on(out[1], k) ? col : col.map((v) => v * 0.2))); circle(cx, cy + 52 + i * 36, 26); });
}

function pressAt(x, y) { for (let b of buttons) if (x > b[2] && x < b[2] + b[4] && y > b[3] && y < b[3] + b[5]) { if (b[0] === 'b') signalInput('b'); else insert(b[0]); } }
function mousePressed() { pressAt(mouseX, mouseY); }
function keyPressed() {
  if (key === '1') insert('10');
  if (key === '2') insert('50');
  if (key === '3') insert('100');
  if (key === 'r' || key === 'R') insert('R');
  if (key === 'b' || key === 'B') signalInput('b');
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let m = buildVending(), okCons = true, okRange = true, nSeq = 0, okDrink = true;
  // 長さ 0〜6 のすべての入力列（4 種類 → 5461 通り）で、お金の保存と金額の範囲を確かめる
  let all = [[]];
  for (let L = 1; L <= 6; L++) all = all.concat(all.filter((s) => s.length === L - 1).flatMap((s) => m.alpha.map((c) => s.concat([c]))));
  for (let seq of all) {
    let q = 0, ins = 0, dr = 0, ch = 0, since = 0; nSeq++;
    for (let c of seq) {
      let o = m.out[q][c];
      if (c !== 'R') { ins += Number(c); since += Number(c); }
      if (o.drink && since < PRICE) okDrink = false;            // 足りないのにジュースが出ない
      if (!o.drink && c !== 'R' && since >= PRICE) okDrink = false;
      if (o.drink || c === 'R') since = 0;
      dr += o.drink ? 1 : 0; ch += o.change; q = m.tr[q][c];
      if (q < 0 || q >= m.n || o.change < 0) okRange = false;
    }
    if (ins !== dr * PRICE + ch + q * 10) okCons = false;     // 入れた = ジュース × 値段 + おつり + いま入っている
  }
  check('自動販売機：長さ 6 までの全部の入力列 ' + nSeq + ' 通りで「入れた = ジュース × ' + PRICE + ' + おつり + 残り」', okCons && nSeq === 5461);
  check('金額は 0〜90 円の 10 状態にとどまる、おつりは負にならない', okRange && m.n === 10 && m.tr.every((row) => m.alpha.every((c) => row[c] >= 0)));
  check('ジュースは「入れた合計が 100 円以上になった瞬間」にだけ出る', okDrink);
  check('例：50 → 50 でジュース、100 → 返却 は「ジュースが出て返却 0 円」、90 円 + 100 円 → おつり 90 円', m.out[5]['50'].drink && m.out[5]['50'].change === 0 && m.tr[0]['100'] === 0 && m.out[0]['R'].change === 0 && m.out[9]['100'].change === 90);
  let s = buildSignal(), okSafe = SIG_OUT.every((o) => !(o[0] !== 'R' && o[1] !== 'R'));
  check('信号機：車が青・黄のときは歩行者は必ず赤（全部の状態の出力を調べる）', okSafe);
  let okReach = true;
  for (let q0 = 0; q0 < s.n; q0++) { let q = s.tr[q0].b, k = 0; while (q !== 3 && k < 6) { q = s.tr[q].t; k++; } if (q0 !== 3 && q0 !== 4 && !(q === 3 && k <= 2)) okReach = false; }
  check('ボタンを押せば、どの状態からでも時間切れ 2 回以内に「歩 青」になる（点滅中を除く）', okReach);
  let q = 0; for (let i = 0; i < 50; i++) q = s.tr[q].t;
  check('ボタンを押さなければ、車はずっと青のまま（t を 50 回）', q === 0);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. PRICE を 120 や 150 にすると状態はいくつ？ 図はどう変わる？（50 円を 3 回で何が起こる？）
// 2. 「おつりが出ない機械」（足りたらおつりは寄付）にするには vendStep のどこを変える？ 自己テストのどれが ✗ になる？
// 3. 信号機に「夜間モード（ずっと黄色の点滅）」の状態を足してみよう。入力 n で入り、もう一度 n で戻る
// 4. 自動販売機をムーア型で作り直すと？ 「ジュースを出している」状態が要る。状態の数を比べよう
// 5. 身のまわりの状態機械をさがそう：エレベーター、洗濯機、改札、ゲームのキャラクター（12 で作る）

// ==================================================
// ここから下は「オートマトンの道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 色と小さな道具
const BG = [9, 20, 15];                 // 背景（回路基板の黒緑）
const INK = [226, 240, 228];            // 文字（蛍光の白）
const AMBER = [255, 170, 50], CYAN = [70, 215, 230], LIME = [140, 230, 120], ROSE = [255, 100, 120], VIOLET = [185, 150, 255];
const DIMC = [125, 155, 138], PANEL = [18, 36, 28], WIRE = [44, 74, 58];
function clampv(v, a, b) { return v < a ? a : v > b ? b : v !== v ? a : v; }     // NaN なら a に戻す
function fmtN(v, d) { if (typeof v !== 'number' || v !== v) return '?'; return v.toFixed(d === undefined ? 2 : d); }
function hudTitle(t, sub) {              // 左上のタイトルと操作の説明
  noStroke(); fill(...INK); textSize(22); textAlign(LEFT, BASELINE); text(t, 30, 38);
  fill(...DIMC); textSize(14); textLeading(19); text(sub, 30, 62);
}
function typeInto(s, ch, allowed, maxLen) {   // 文字の入力：allowed に入っている 1 文字だけ足す（長さの上限つき）
  if (typeof ch !== 'string' || ch.length !== 1 || allowed.indexOf(ch) < 0) return s;
  return s.length < (maxLen || 40) ? s + ch : s;
}
// ---- 種つきの乱数（同じ種なら毎回同じ列 → 実験をくり返せる）
let rngState = 1;
function seedRng(s) { rngState = (s >>> 0) || 1; }
function rnd() {                       // 0〜1 の一様乱数（mulberry32）
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rndInt(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
function rndPick(arr) { return arr[Math.floor(rnd() * arr.length)]; }
function rndString(alpha, len) { let s = ''; for (let i = 0; i < len; i++) s += alpha[Math.floor(rnd() * alpha.length)]; return s; }
// ---- 状態遷移図を描く道具（円 = 状態、二重丸 = 受理、矢印 = 遷移。曲線は折れ線で描く）
function bezPts(x0, y0, cx, cy, x1, y1, n) {   // 2 次ベジェ曲線 → 折れ線の点
  let out = [];
  for (let i = 0; i <= n; i++) { let t = i / n, u = 1 - t; out.push([u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1]); }
  return out;
}
function cubicPts(p0, p1, p2, p3, n) {          // 3 次ベジェ曲線 → 折れ線の点（自己ループ用）
  let out = [];
  for (let i = 0; i <= n; i++) { let t = i / n, u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    out.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]); }
  return out;
}
function arrowLine(pts, col, w, dashed) {      // 折れ線 + 先の三角
  if (!pts || pts.length < 2) return;
  noFill(); stroke(...col); strokeWeight(w || 2);
  if (dashed) { for (let i = 0; i + 1 < pts.length; i += 2) line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]); }
  else { beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape(); }
  let [x1, y1] = pts[pts.length - 1], [x0, y0] = pts[pts.length - 2], L = Math.hypot(x1 - x0, y1 - y0) || 1, ux = (x1 - x0) / L, uy = (y1 - y0) / L, s = 7 + (w || 2) * 1.5;
  noStroke(); fill(...col);
  triangle(x1, y1, x1 - ux * s - uy * s * 0.5, y1 - uy * s + ux * s * 0.5, x1 - ux * s + uy * s * 0.5, y1 - uy * s - ux * s * 0.5);
}
function edgeList(m) {                  // DFA / NFA → 辺のリスト [{from, to, label}]（同じ向きの辺はラベルをまとめる）
  let map = new Map();
  for (let q = 0; q < m.n; q++) for (let c in m.tr[q] || {}) {
    let ts = m.tr[q][c]; ts = Array.isArray(ts) ? ts : [ts];
    for (let t of ts) { if (t < 0 || t >= m.n) continue; let k = q + '>' + t; if (!map.has(k)) map.set(k, { from: q, to: t, syms: [] }); map.get(k).syms.push(c === '' ? 'ε' : c); }
  }
  return [...map.values()].map((e) => ({ from: e.from, to: e.to, label: e.syms.sort().join(','), syms: e.syms }));
}
function edgeGeometry(e, pos, r, both) {        // 1 本の辺の折れ線の点とラベルの位置
  let a = pos[e.from], b = pos[e.to];
  if (e.from === e.to) {                        // 自己ループ：中心から外向き（または上）に輪
    let ang = a.loop !== undefined ? a.loop : -Math.PI / 2, ux = Math.cos(ang), uy = Math.sin(ang), px = -uy, py = ux;
    let s0 = [a.x + (ux * 0.6 + px * 0.8) * r, a.y + (uy * 0.6 + py * 0.8) * r], s1 = [a.x + (ux * 0.6 - px * 0.8) * r, a.y + (uy * 0.6 - py * 0.8) * r];
    let pts = cubicPts(s0, [s0[0] + (ux * 2.2 + px * 0.9) * r, s0[1] + (uy * 2.2 + py * 0.9) * r], [s1[0] + (ux * 2.2 - px * 0.9) * r, s1[1] + (uy * 2.2 - py * 0.9) * r], s1, 18);
    return { pts, lx: a.x + ux * 2.35 * r, ly: a.y + uy * 2.35 * r };
  }
  let dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, bend = both ? 0.22 * L : (e.bend || 0) * L;
  let mx = (a.x + b.x) / 2 - uy * bend, my = (a.y + b.y) / 2 + ux * bend;
  let d0x = mx - a.x, d0y = my - a.y, l0 = Math.hypot(d0x, d0y) || 1, d1x = mx - b.x, d1y = my - b.y, l1 = Math.hypot(d1x, d1y) || 1;
  let pts = bezPts(a.x + (d0x / l0) * r, a.y + (d0y / l0) * r, mx, my, b.x + (d1x / l1) * (r + 2), b.y + (d1y / l1) * (r + 2), 16);
  let mid = pts[8];
  return { pts, lx: mid[0] - uy * 13, ly: mid[1] + ux * 13 };
}
// m = DFA/NFA、pos = [{x, y, loop?}]、opt = { r, names, hi: {状態: 色}, edgeHi: (e) => 色 or null, start: true, labelSize }
function drawMachine(m, pos, opt) {
  opt = opt || {};
  let r = opt.r || 22, edges = opt.edges || edgeList(m), has = new Set(edges.map((e) => e.from + '>' + e.to));
  textAlign(CENTER, CENTER);
  for (let e of edges) {
    if (!pos[e.from] || !pos[e.to]) continue;
    let g = edgeGeometry(e, pos, r, e.from !== e.to && has.has(e.to + '>' + e.from));
    let hc = opt.edgeHi ? opt.edgeHi(e) : null;
    arrowLine(g.pts, hc || opt.edgeCol || [120, 160, 140], hc ? 3.5 : 1.8, e.label === 'ε' && !hc);
    if (opt.labels !== false || hc) { noStroke(); fill(...(hc || opt.labelCol || [200, 225, 210])); textSize(opt.labelSize || 14); text(e.label, g.lx, g.ly); }
  }
  if (opt.start !== false && pos[m.start]) {   // 開始の矢印（左から）
    let p = pos[m.start], sa = opt.startAng !== undefined ? opt.startAng : p.loop !== undefined && Math.cos(p.loop) < -0.5 ? -2.2 : Math.PI;
    let ux = Math.cos(sa), uy = Math.sin(sa);   // 自己ループと重ならない向きから
    arrowLine([[p.x + ux * (r + 34), p.y + uy * (r + 34)], [p.x + ux * (r + 2), p.y + uy * (r + 2)]], opt.startCol || INK, 2);
  }
  for (let q = 0; q < m.n; q++) {
    let p = pos[q]; if (!p) continue;
    let hc = opt.hi && opt.hi[q];
    stroke(...(hc || [150, 190, 170])); strokeWeight(hc ? 3.5 : 2); fill(...(hc ? hc.map((v) => v * 0.35) : PANEL));
    circle(p.x, p.y, 2 * r);
    if (m.acc[q]) { noFill(); circle(p.x, p.y, 2 * r - 9); }
    noStroke(); fill(...(hc ? [255, 255, 255] : INK)); textSize(opt.nameSize || Math.min(16, r * 0.75));
    text(opt.names ? opt.names[q] : 'q' + q, p.x, p.y + 1);
  }
}
function circleLayout(n, cx, cy, rad, a0) {    // 円の上に並べる（自己ループは外向き）
  let out = [];
  for (let i = 0; i < n; i++) { let a = (a0 === undefined ? Math.PI : a0) + (2 * Math.PI * i) / Math.max(1, n); out.push({ x: cx + rad * Math.cos(a), y: cy + rad * Math.sin(a), loop: a }); }
  return out;
}
function layerLayout(m, x, y, w, h) {          // スタートからの距離（幅優先）で左 → 右に並べる
  let depth = new Array(m.n).fill(-1), order = [m.start]; depth[m.start] = 0;
  for (let i = 0; i < order.length; i++) for (let e of edgeList(m)) if (e.from === order[i] && depth[e.to] < 0) { depth[e.to] = depth[order[i]] + 1; order.push(e.to); }
  let maxD = Math.max(0, ...depth); for (let q = 0; q < m.n; q++) if (depth[q] < 0) { depth[q] = maxD + 1; order.push(q); }
  maxD = Math.max(...depth);
  let cols = []; for (let q of order) (cols[depth[q]] = cols[depth[q]] || []).push(q);
  let pos = [];
  cols.forEach((col, d) => col.forEach((q, k) => { pos[q] = { x: x + (maxD ? (d / maxD) * w : w / 2), y: y + ((k + 1) / (col.length + 1)) * h, loop: -Math.PI / 2 }; }));
  return pos;
}
function hitState(pos, x, y, r) { for (let q = pos.length - 1; q >= 0; q--) if (pos[q] && Math.hypot(pos[q].x - x, pos[q].y - y) < r) return q; return -1; }
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(...(selfTestResults.every((r) => r.ok) ? LIME : ROSE)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
