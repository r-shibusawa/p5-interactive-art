// ============================================
// 14 テルミン風 ─ 手とアンテナの「静電容量」で音の高さが変わる楽器
// 手（導体）がアンテナに近づくと、そのあいだの静電容量 C手 がふえる → LC 発振器の周波数 f = 1/(2π√(L(C0 + C手))) が少し下がる
// 本物のテルミンは 約 500 kHz の発振器 2 つの「差」（うなり）を聞こえる音にする：Δf = f固定 − f可変。ここでも同じ計算で音を鳴らす
// マウス左右 = 手とアンテナの距離 / マウス上下 = 音量 / クリック = 音を出す / スペース = 音 ON・OFF / ↑↓ = 手の大きさ
// 音量は小さめから（全体の音量 MASTER は 0.2 以下）
// ============================================

const EPS0 = 8.854e-12;
const L_H = 2.5e-3;                    // ★ コイル [H]（2.5 mH）
const C0 = 40e-12;                     // ★ 発振器のコンデンサ [F]（40 pF）
const B_ANT = 0.002;                   // アンテナの「大きさ」[m]（球とみなした実効的な半径）
let handR = 0.05;                      // ★ 手の大きさ [m]（球とみなした半径）
let soundOn = true, handDist = 0.2, vol = 0.4, antX;

function setup() {
  createCanvas(windowWidth, windowHeight);
  antX = width - 160;
  selfTest();
}
function fRef() { return 1 / (2 * Math.PI * Math.sqrt(L_H * C0)); }
function fVar(d) { return 1 / (2 * Math.PI * Math.sqrt(L_H * (C0 + handCap(d)))); }
function beat(d) { return fRef() - fVar(d); }

function draw() {
  background(14, 18, 26);
  // マウス → 距離（2〜60 cm）と音量
  handDist = clampv(((antX - mouseX) / (antX - 60)) * 0.6, 0.02, 0.6);
  vol = clampv(1 - (mouseY - 120) / (height - 200), 0, 1);
  let df = beat(handDist), Ch = handCap(handDist);
  setPitch(df, soundOn ? vol : 0);
  // アンテナと手
  stroke(190); strokeWeight(6); line(antX, height * 0.25, antX, height * 0.7);
  noStroke(); fill(190); rect(antX - 30, height * 0.7, 60, 30, 4);
  let hx = antX - (handDist / 0.6) * (antX - 60);
  fill(240, 200, 170); ellipse(hx, height * 0.45, 70 * (handR / 0.05), 90 * (handR / 0.05));
  stroke(255, 230, 120, 120); strokeWeight(1); drawingContext.setLineDash([4, 6]); line(hx + 30, height * 0.45, antX - 6, height * 0.45); drawingContext.setLineDash([]);
  noStroke(); fill(255, 230, 120); textSize(15); text('距離 d = ' + (handDist * 100).toFixed(1) + ' cm', (hx + antX) / 2 - 50, height * 0.45 - 12);
  text('C手 = ' + (Ch * 1e12).toFixed(3) + ' pF', (hx + antX) / 2 - 50, height * 0.45 + 24);
  // しくみの図（ブロック）
  let bx = 40, by = 110, bw = 170, bh = 54, gap = 26;
  let box = (x, y, t1, t2, c) => { stroke(c); strokeWeight(2); noFill(); rect(x, y, bw, bh, 8); noStroke(); fill(c); textSize(13); text(t1, x + 10, y + 22); fill(220); text(t2, x + 10, y + 42); };
  box(bx, by, '固定の発振器', 'f₁ = ' + (fRef() / 1000).toFixed(3) + ' kHz', color(150, 200, 255));
  box(bx, by + bh + gap, '可変の発振器（C0 + C手）', 'f₂ = ' + (fVar(handDist) / 1000).toFixed(3) + ' kHz', color(255, 190, 140));
  box(bx + bw + 40, by + (bh + gap) / 2, 'かけ算（ミキサー）', 'f₁ − f₂ と f₁ + f₂', color(200, 160, 255));
  box(bx + 2 * bw + 80, by + (bh + gap) / 2, 'ローパスフィルタ', '高い f₁ + f₂ を消す', color(160, 230, 170));
  box(bx + 3 * bw + 120, by + (bh + gap) / 2, 'スピーカー', 'Δf = ' + df.toFixed(1) + ' Hz', color(255, 230, 120));
  stroke(160); strokeWeight(2);
  arrowTo(bx + bw, by + bh / 2, bx + bw + 40, by + (bh + gap) / 2 + 18, 7); arrowTo(bx + bw, by + bh + gap + bh / 2, bx + bw + 40, by + (bh + gap) / 2 + 36, 7);
  arrowTo(bx + 2 * bw + 40, by + (bh + gap) / 2 + bh / 2, bx + 2 * bw + 80, by + (bh + gap) / 2 + bh / 2, 7);
  arrowTo(bx + 3 * bw + 80, by + (bh + gap) / 2 + bh / 2, bx + 3 * bw + 120, by + (bh + gap) / 2 + bh / 2, 7);
  // うなり：2 つの波を足すと、ふくらみ（包絡線）が Δf でくり返す
  let g = { x: 40, y: height * 0.62, w: antX - 240, h: height * 0.18 }, T = 3 / Math.max(df, 1);
  noFill(); stroke(70, 80, 100); rect(g.x, g.y, g.w, g.h);
  let env = [], envN = [], out = [];
  for (let i = 0; i <= 300; i++) { let t = (i / 300) * T, e = Math.abs(2 * Math.cos(Math.PI * df * t)); env.push([g.x + (i / 300) * g.w, g.y + g.h / 2 - (e * g.h) / 4.4]); envN.push([g.x + (i / 300) * g.w, g.y + g.h / 2 + (e * g.h) / 4.4]); out.push([g.x + (i / 300) * g.w, g.y + g.h / 2 - Math.cos(2 * Math.PI * df * t) * g.h * 0.3]); }
  stroke(200, 160, 255, 160); strokeWeight(1.5); polyline(env); polyline(envN);
  stroke(255, 230, 120); strokeWeight(2.5); polyline(out);
  noStroke(); fill(200); textSize(13);
  text('紫 = f₁ と f₂ を足した波のふくらみ（中は 500 kHz で細かすぎて描けない）、黄 = フィルタの後の音 Δf（横はば ' + (T * 1000).toFixed(1) + ' ms）', g.x, g.y - 8, g.w);
  // 数字
  let tx = 40, y = height * 0.88;
  fill(235); textSize(16);
  text('音の高さ Δf = ' + df.toFixed(1) + ' Hz（' + noteName(df) + '）　音量 ' + (vol * 100).toFixed(0) + '%　' + (audioCtx ? (soundOn ? '♪ 鳴っている' : '音 OFF') : 'クリックで音が出る'), tx, y);
  fill(170); textSize(13);
  text('C手 は 1 pF より小さい（f₂ は 0.2% くらいしか変わらない）。それでも差をとると数百 Hz の音になる。手の静電容量は 2 つの球の式 C ≈ 4πε0·a·b/d で近似', tx, y + 22, width - 80);
  fill(235); textSize(17);
  text('マウス左右 = 手とアンテナの距離　上下 = 音量　クリック = 音を出す　スペース 音 ON/OFF　↑↓ 手の大きさ（' + handR * 100 + ' cm）', 20, 34);
  fill(255, 200, 120); textSize(13); text('音量は小さめから。ヘッドホンは特に注意', 20, 60);
  drawSelfTest(20, height - 14);
}

function mousePressed() { startAudio(); }
function keyPressed() {
  startAudio();
  if (key === ' ') soundOn = !soundOn;
  if (key === UP_ARROW) handR = Math.min(0.1, handR + 0.01);
  if (key === DOWN_ARROW) handR = Math.max(0.02, handR - 0.01);
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  check('LC 発振の周波数 f = 1/(2π√LC) = 503.3 kHz', nearRel(fRef(), 503292, 1e-4));
  // うなりの検出：10 kHz と 10.3 kHz を数値で作り、かけ算 → 平均（ローパス）→ 0 をよぎる回数で周波数
  let fs = 200000, f1 = 10000, f2 = 10300, n = 20000, win = 20, buf = [], s = 0, prev = 1, cross = [];
  for (let i = 0; i < n; i++) {
    let t = i / fs, m = Math.sin(2 * Math.PI * f1 * t) * Math.sin(2 * Math.PI * f2 * t);
    buf.push(m); s += m; if (buf.length > win) s -= buf.shift();
    let lp = s / buf.length;                         // ヒステリシス：−0.1 より下がってから +0.1 をこえたら 1 回
    if (i > win && prev < 0 && lp > 0.1) { cross.push(t); prev = 1; } else if (lp < -0.1) prev = -1;
  }
  let fb = (cross.length - 1) / (cross[cross.length - 1] - cross[0]);
  check('かけ算 + ローパスで 差の周波数 300 Hz が取り出せる（2% 以内）', nearRel(fb, f2 - f1, 0.02));
  check('手が近いほど C手 が大きく、音が高い', handCap(0.05) > handCap(0.2) && beat(0.05) > beat(0.2) && beat(0.2) > 0);
  let d = 0.3, approx = (fRef() * handCap(d)) / (2 * C0);
  check('C手 が小さいとき Δf ≈ f·ΔC/(2C0)（1% 以内）', nearRel(beat(d), approx, 0.01));
  check('音量の上限：全体 MASTER ≤ 0.2', MASTER <= 0.2);
  check('音名：440 Hz = A4、261.6 Hz = C4', noteName(440) === 'A4' && noteName(261.63) === 'C4');
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 手を近づけると音が高くなる。距離を半分にすると Δf は何倍？（C手 ∝ 1/d）
// 2. ↑↓ で手の大きさを変えると、同じ距離でも音が変わる。なぜ？
// 3. C0 を 2 倍にすると、f₁ と 音の高さ Δf はどう変わる？
// 4. ドレミを弾くには、手をどの距離に置けばいい？ noteName で確かめよう
// 5. 本物のテルミンは音量用のアンテナもある。マウスの上下の代わりに、もう 1 つの静電容量で音量を決めてみよう


// ==================================================
// ここから下は「電磁気の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 手（半径 handR の球）とアンテナ（半径 B_ANT の球）の間の静電容量：遠いとき C ≈ 4πε0·a·b/d
function handCap(d) { return (4 * Math.PI * EPS0 * handR * B_ANT) / Math.max(d, 0.01); }
function noteName(f) {
  if (!(f > 0)) return '—';
  let n = Math.round(12 * Math.log2(f / 440)) + 57, names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return names[((n % 12) + 12) % 12] + Math.floor(n / 12);
}
// ---- 音を鳴らす道具（Web Audio。最初のクリックかキーで startAudio()）
const MASTER = 0.12;                   // ★ 全体の音量（0.2 以下にしておく）
let audioCtx = null, masterOut = null, osc = null, oscGain = null;
function startAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterOut = audioCtx.createGain(); masterOut.gain.value = Math.min(0.2, MASTER); masterOut.connect(audioCtx.destination);
    osc = audioCtx.createOscillator(); oscGain = audioCtx.createGain(); osc.type = 'sine'; oscGain.gain.value = 0;
    osc.connect(oscGain); oscGain.connect(masterOut); osc.start();
  }
  audioCtx.resume();
}
// 音の高さ f [Hz] と大きさ v（0〜1）を なめらかに変える
function setPitch(f, v) {
  if (!audioCtx || !osc) return;
  let t = audioCtx.currentTime;
  osc.frequency.setTargetAtTime(clampv(isFinite(f) ? f : 100, 30, 4000), t, 0.02);
  oscGain.gain.setTargetAtTime(clampv(v, 0, 1) * 0.8, t, 0.03);
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
