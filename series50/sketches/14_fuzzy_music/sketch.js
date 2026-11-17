// ============================================
// 14 ファジィ作曲
// マウスの位置 = 2 つの言語変数「明るさ」（左 暗い → 右 明るい）と「激しさ」（下 穏やか → 上 激しい）
//   9 個の規則（マムダニ型、min で切って max で集めて重心）で テンポ・音階・音量 を決めて演奏する
// まずクリック（音が出る） / マウス = 気分 / スペース = 再生・停止 / ↑↓ = オクターブ
// ============================================

const LV = ['暗い', 'ふつう', '明るい'], LE = ['穏やか', 'ふつう', '激しい'];
// ★ 規則の表 [明るさ][激しさ] → 後件の番号（0 小さい・1 中くらい・2 大きい）
let TEMPO_R = [[0, 0, 1], [0, 1, 2], [1, 2, 2]];   // 遅い・中くらい・速い
let SCALE_R = [[0, 0, 1], [1, 1, 1], [2, 2, 1]];   // 暗い音階・中間・明るい音階
let VOL_R = [[0, 1, 2], [0, 1, 2], [1, 1, 2]];     // 小・中・大
// 音階（暗い → 明るい の順に 7 つの旋法）
const MODES = [
  { name: 'ロクリアン', s: [0, 1, 3, 5, 6, 8, 10] }, { name: 'フリジアン', s: [0, 1, 3, 5, 7, 8, 10] },
  { name: 'エオリアン（短調）', s: [0, 2, 3, 5, 7, 8, 10] }, { name: 'ドリアン', s: [0, 2, 3, 5, 7, 9, 10] },
  { name: 'ミクソリディアン', s: [0, 2, 4, 5, 7, 9, 10] }, { name: 'イオニアン（長調）', s: [0, 2, 4, 5, 7, 9, 11] },
  { name: 'リディアン', s: [0, 2, 4, 6, 7, 9, 11] },
];
let base = 220;      // ★ いちばん下の音の高さ [Hz]
let bIn = 0.5, eIn = 0.5, playing = true, nextAt = 0, deg = 7, beat = 0, notes = [];
let SYS, pad;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  SYS = makeSystems();
  selfTest();
}
// 入力 2 つは共通、出力ごとに 1 つのマムダニ系
function makeSystems() {
  let ins = [{ name: '明るさ', lo: 0, hi: 1, sets: evenTri(0, 1, LV) }, { name: '激しさ', lo: 0, hi: 1, sets: evenTri(0, 1, LE) }];
  let mk = (name, lo, hi, names, R) => ({ inputs: ins, output: { name, lo, hi, sets: evenTri(lo, hi, names) }, and: 'min', imp: 'min', N: 401,
    rules: R.flatMap((row, i) => row.map((k, j) => ({ ifs: [i, j], then: k }))) });
  return [mk('テンポ [BPM]', 50, 180, ['遅い', '中くらい', '速い'], TEMPO_R), mk('音階の明るさ', 0, 6, ['暗い', '中間', '明るい'], SCALE_R), mk('音量', 0, 1, ['小', '中', '大'], VOL_R)];
}

function draw() {
  background(250, 18, 14);
  let ps = Math.min(width * 0.36, height - 220);
  pad = { x: 40, y: 120, s: ps };
  if (mouseX > pad.x && mouseX < pad.x + ps && mouseY > pad.y && mouseY < pad.y + ps) {
    bIn = clampv((mouseX - pad.x) / ps, 0, 1); eIn = clampv(1 - (mouseY - pad.y) / ps, 0, 1);
  }
  let R = SYS.map((s) => mamdani(s, [bIn, eIn]));
  let tempo = R[0].y, modeI = Math.round(clampv(R[1].y, 0, 6)), vol = R[2].y;

  // 演奏：8 分音符ごとに 1 音（音階の中をふらふら歩く）
  if (playing && audioCtx && millis() >= nextAt) {
    let dt = 60000 / tempo / 2;
    nextAt = millis() + dt;
    deg = clampv(deg + Math.floor(Math.random() * 5) - 2, 0, 13);
    let sc = MODES[modeI].s, semi = 12 * Math.floor(deg / 7) + sc[deg % 7];
    playNote(base * Math.pow(2, semi / 12), (dt / 1000) * (1.6 - eIn), 0.04 + 0.3 * vol, eIn > 0.6 ? 'sawtooth' : 'triangle');
    if (beat % 4 === 0) playNote(base / 2, (dt / 1000) * 3, 0.03 + 0.2 * vol, 'sine');
    notes.push({ deg, vol, t: millis(), h: 20 + modeI * 30 }); if (notes.length > 48) notes.shift();
    beat++;
  }

  // パッド：9 つの規則のマス（色の濃さ = 発火の強さ）
  let w = R[0].w, cell = ps / 3;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    let k = i * 3 + j;
    fill(20, 45, 100, 8 + 70 * w[k]); stroke(0, 0, 100, 20); rect(pad.x + i * cell, pad.y + (2 - j) * cell, cell, cell);
    noStroke(); fill(0, 0, 100, 50 + 50 * w[k]); textSize(13);
    text(LV[i] + ' かつ ' + LE[j], pad.x + i * cell + 8, pad.y + (2 - j) * cell + 20);
    text('→ ' + ['遅', '中', '速'][TEMPO_R[i][j]] + '・' + ['暗', '中', '明'][SCALE_R[i][j]] + '・' + ['小', '中', '大'][VOL_R[i][j]], pad.x + i * cell + 8, pad.y + (2 - j) * cell + 38);
    textSize(16); text('w = ' + w[k].toFixed(2), pad.x + i * cell + 8, pad.y + (3 - j) * cell - 12);
  }
  let mx = pad.x + bIn * ps, my = pad.y + (1 - eIn) * ps;
  fill(175, 60, 80); noStroke(); circle(mx, my, 18);
  fill(0, 0, 80); textSize(14);
  text('明るさ ' + bIn.toFixed(2) + '：' + LV.map((n, i) => n + ' ' + R[0].deg[0][i].toFixed(2)).join('　'), pad.x, pad.y + ps + 24);
  text('激しさ ' + eIn.toFixed(2) + '：' + LE.map((n, i) => n + ' ' + R[0].deg[1][i].toFixed(2)).join('　'), pad.x, pad.y + ps + 44);
  // 鳴った音（右下へ流れる）
  notes.forEach((n, i) => { fill(n.h, 45, 100, 30 + 70 * (i / notes.length)); rect(pad.x + (i / 48) * ps, pad.y + ps + 80 - n.deg * 3, ps / 52, 6 + n.vol * 10, 2); });

  // 右：3 つの出力（切った後件を max で集めた形と、重心）
  let ox = pad.x + ps + 60, ow = width - ox - 40, oh = (height - 200) / 3 - 20;
  R.forEach((r, q) => {
    let oy = 110 + q * (oh + 30), o = SYS[q].output, X = (v) => ox + ((v - o.lo) / (o.hi - o.lo)) * ow, Y = (m) => oy + oh - m * (oh - 30);
    noStroke(); fill(0, 0, 100, 5); rect(ox - 10, oy - 6, ow + 20, oh + 14, 8);
    o.sets.forEach((s) => { let pts = []; for (let k = 0; k <= 60; k++) { let v = o.lo + ((o.hi - o.lo) * k) / 60; pts.push([X(v), Y(evalMF(s.mf, v))]); } poly(pts, color(0, 0, 100, 30), 1.5); });
    noStroke(); fill(20, 45, 100, 45); beginShape(); vertex(X(o.lo), Y(0));
    for (let k = 0; k < r.ox.length; k += 4) vertex(X(r.ox[k]), Y(r.agg[k]));
    vertex(X(o.hi), Y(0)); endShape(CLOSE);
    stroke(175, 60, 80); strokeWeight(3); line(X(r.y), Y(0), X(r.y), Y(1)); strokeWeight(1);
    noStroke(); fill(0, 0, 95); textSize(16);
    let val = q === 0 ? r.y.toFixed(1) + ' BPM' : q === 1 ? r.y.toFixed(2) + ' → ' + MODES[modeI].name : r.y.toFixed(3);
    text(o.name + '　重心 = ' + val, ox, oy + 14);
    fill(0, 0, 70); textSize(13); text('後件の強さ ' + o.sets.map((s, k) => s.name + ' ' + r.str[k].toFixed(2)).join('　'), ox + ow * 0.45, oy + 14);
  });

  noStroke(); fill(0, 0, 95); textSize(18);
  text((audioCtx ? (playing ? '♪ 演奏中' : '停止中') : 'キャンバスをクリックすると音が出ます') + '　｜ マウス = 気分（左右 明るさ・上下 激しさ）　スペース 再生/停止　↑↓ オクターブ ' + base + ' Hz', 20, 36);
  fill(0, 0, 70); textSize(15);
  text('規則の強さ w = min(明るさの所属度, 激しさの所属度)。後件を w で切り、max で重ねて、重心 = ∫x μ dx ÷ ∫μ dx', 20, 62);
  fill(selfTestResults.every((r) => r.ok) ? color(160, 50, 90) : color(0, 80, 100)); textSize(14);
  text(selfTestLine(), 20, height - 20);
}
function poly(pts, c, sw) { if (!pts.length) return; noFill(); stroke(c); strokeWeight(sw); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape(); strokeWeight(1); }

function mousePressed() { startAudio(); }
function keyPressed() {
  startAudio();
  if (key === ' ') playing = !playing;
  if (key === UP_ARROW) base = Math.min(880, base * 2);
  if (key === DOWN_ARROW) base = Math.max(55, base / 2);
}

// ---- 自己テスト：手で計算できる値と比べる
function selfTest() {
  selfTestResults = [];
  let Q = makeSystems(), run = (q, b, e) => mamdani(Q[q], [b, e]);
  let m = run(0, 0.5, 0.5);
  check('真ん中（ふつう・ふつう）では規則 1 つだけが強さ 1 で発火', m.w.filter((x) => x > 0).length === 1 && m.w[4] === 1);
  check('そのときテンポ = 左右対称な「中くらい」の重心 = 115', near(m.y, 115, 1e-6));
  check('左下（暗い・穏やか）：端の半分の三角形 → 重心 50 + 65/3 = 71.67', near(run(0, 0, 0).y, 50 + 65 / 3, 1e-6));
  check('ふつう・激しい → 音量「大」（0.5〜1 の半分の三角形）→ 重心 1 − 0.5/3 = 0.833', near(run(2, 0.5, 1).y, 1 - 0.5 / 3, 1e-6));
  check('明るい・ふつう → 音階の重心 5 → イオニアン（長調）', near(run(1, 1, 0.5).y, 5, 1e-6) && MODES[5].name.indexOf('イオニアン') === 0);
  let A1 = 97.5 * 0.5, A2 = 0.5 * 32.5 * 0.5, c = (A1 * 98.75 + A2 * (147.5 + 32.5 / 3)) / (A1 + A2);
  check('明るさ 0.25（暗い 0.5・ふつう 0.5）：切って重ねた形の重心 = ' + c.toFixed(3), near(run(0, 0.25, 0.5).y, c, 1e-6));
  let okSum = true; for (let k = 0; k < 20; k++) { let d = run(0, k / 19, 0.3).deg[0]; if (!near(d[0] + d[1] + d[2], 1, 1e-12)) okSum = false; }
  check('入力の所属度の和はいつも 1（等間隔の三角形）', okSum);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 4 すみと真ん中にマウスを置いて、どの規則が発火しているか見よう。真ん中は 1 つだけ、マスの境目では 2〜4 つ
// 2. TEMPO_R の表を書きかえる（例：暗い・激しい を 2 = 速い に）。パッドの左上の音が変わる
// 3. imp を 'prod'（積で縮める）にすると、重心は少し変わる。耳でわかる？
// 4. MODES に自分の音階（例 ペンタトニック [0, 2, 4, 7, 9, 12, 14]）を入れてみよう
// 5. 規則を 5×5 に増やしてみよう（LV と LE を 5 個に、表も 5×5 に）


// ==================================================
// ここから下は「ファジィの道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- メンバーシップ関数（所属度 μ を 0〜1 で返す）
function trimf(x, a, b, c) {            // 三角：a で 0、b で 1、c で 0
  if (x < a || x > c) return 0;
  if (x === b) return 1;
  if (x < b) return b > a ? (x - a) / (b - a) : 1;
  return c > b ? (c - x) / (c - b) : 1;
}
function trapmf(x, a, b, c, d) {         // 台形：b〜c が 1
  if (x < a || x > d) return 0;
  if (x >= b && x <= c) return 1;
  if (x < b) return (x - a) / (b - a);
  return (d - x) / (d - c);
}
function gaussmf(x, c, s) { return Math.exp(-((x - c) * (x - c)) / (2 * s * s)); }
function sigmf(x, a, c) { return 1 / (1 + Math.exp(-a * (x - c))); }
function bellmf(x, a, b, c) { return 1 / (1 + Math.pow(Math.abs((x - c) / a), 2 * b)); }
// mf = { type: 'tri', p: [a, b, c] } のような形
function evalMF(mf, x) {
  let p = mf.p;
  if (mf.type === 'tri') return trimf(x, p[0], p[1], p[2]);
  if (mf.type === 'trap') return trapmf(x, p[0], p[1], p[2], p[3]);
  if (mf.type === 'gauss') return gaussmf(x, p[0], p[1]);
  if (mf.type === 'sig') return sigmf(x, p[0], p[1]);
  if (mf.type === 'bell') return bellmf(x, p[0], p[1], p[2]);
  return 0;
}
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }

// ---- 非ファジィ化（xs, ys は同じ長さの配列。ys は折れ線の高さ）
// 重心 = ∫x μ dx ÷ ∫μ dx（折れ線の区間ごとに正確に積分）。どの規則も発火しなければ null
function centroid(xs, ys) {
  let A = 0, M = 0;
  for (let i = 0; i + 1 < xs.length; i++) {
    let h = xs[i + 1] - xs[i], y0 = ys[i], y1 = ys[i + 1];
    A += (h * (y0 + y1)) / 2;
    M += (h * (xs[i] * (2 * y0 + y1) + xs[i + 1] * (y0 + 2 * y1))) / 6;
  }
  return A > 1e-12 ? M / A : null;
}
function areaOf(xs, ys) { let A = 0; for (let i = 0; i + 1 < xs.length; i++) A += ((xs[i + 1] - xs[i]) * (ys[i] + ys[i + 1])) / 2; return A; }

// ---- マムダニ型推論
// sys = { inputs: [{ name, lo, hi, sets: [{ name, mf }] }], output: { name, lo, hi, sets }, rules: [{ ifs: [i, j], then: k }],
//         and: 'min' | 'prod', imp: 'min' | 'prod', N: 401 }
function mamdani(sys, xin) {
  let deg = sys.inputs.map((v, i) => v.sets.map((s) => evalMF(s.mf, clampv(xin[i], v.lo, v.hi))));
  let w = sys.rules.map((r) => r.ifs.reduce((acc, si, i) => (si < 0 ? acc : sys.and === 'prod' ? acc * deg[i][si] : Math.min(acc, deg[i][si])), 1));
  let o = sys.output, str = o.sets.map(() => 0);
  sys.rules.forEach((r, k) => { str[r.then] = Math.max(str[r.then], w[k]); });   // 同じ後件は max でまとめる
  let N = sys.N || 401, ox = new Array(N), agg = new Array(N);
  for (let i = 0; i < N; i++) {
    let x = o.lo + ((o.hi - o.lo) * i) / (N - 1), a = 0;
    for (let k = 0; k < o.sets.length; k++) if (str[k] > 0) {
      let m = evalMF(o.sets[k].mf, x);
      a = Math.max(a, sys.imp === 'prod' ? str[k] * m : Math.min(str[k], m));   // 切る（min）か縮める（積）
    }
    ox[i] = x; agg[i] = a;
  }
  let c = centroid(ox, agg);
  return { deg, w, str, ox, agg, y: c === null ? (o.lo + o.hi) / 2 : c, fired: c !== null };
}
// 等間隔の三角 MF を n 個（両端は肩）
function evenTri(lo, hi, names) {
  let n = names.length, d = (hi - lo) / (n - 1);
  return names.map((name, i) => ({ name, mf: { type: 'tri', p: [lo + (i - 1) * d, lo + i * d, lo + (i + 1) * d] } }));
}

// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }

// ---- 音を鳴らす道具（Web Audio。最初のクリックで startAudio()）
let audioCtx = null, masterOut = null;
function startAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterOut = audioCtx.createDynamicsCompressor(); masterOut.connect(audioCtx.destination);
  }
  audioCtx.resume();
}
// 1 音：周波数 f、長さ dur 秒、大きさ vol、音色 type（'sine' 'triangle' 'square' 'sawtooth'）
function playNote(f, dur, vol, type) {
  if (!audioCtx || !isFinite(f) || f <= 0) return;
  dur = Math.max(0.05, Math.min(3, dur));
  let t = audioCtx.currentTime, o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = type; o.frequency.value = Math.min(4000, f);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, Math.min(0.5, vol)), t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(masterOut); o.start(t); o.stop(t + dur + 0.05);
}
