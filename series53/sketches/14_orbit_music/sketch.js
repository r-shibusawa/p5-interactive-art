// ============================================
// 14 惑星の音楽 ─ 公転の周期の比を、そのままリズムと音の高さにする
// 天体が基準の線（観測者の方向）を通るたびに音を 1 つ鳴らす。内側ほど速く回るので、細かいリズムになる
// 木星の衛星イオ・エウロパ・ガニメデは周期の比がほぼ 1 : 2 : 4（ラプラス共鳴）。n₁ − 3n₂ + 2n₃ = 0 で、
// 角度 φ = λ₁ − 3λ₂ + 2λ₃ はいつも 180° のまま → 3 つは決して一列にそろわない。F = 周期の比をそのまま周波数の比にした和音
// まずクリック / 1 ガリレオ衛星 2 TRAPPIST-1 3 内惑星 / ↑↓ = テンポ / スペース = 再生/停止 / F = 和音 / 音量は小さめから
// ============================================

// 公転周期 [日]（ガリレオ衛星・TRAPPIST-1 の惑星・水星〜火星）
const SYSTEMS = [
  { name: 'ガリレオ衛星（木星）', unit: '日', bodies: [['イオ', 1.769138], ['エウロパ', 3.551181], ['ガニメデ', 7.154553], ['カリスト', 16.689017]] },
  { name: 'TRAPPIST-1 の惑星', unit: '日', bodies: [['b', 1.51087], ['c', 2.42182], ['d', 4.04961], ['e', 6.09965], ['f', 9.20669], ['g', 12.35294], ['h', 18.7672]] },
  { name: '内惑星（太陽）', unit: '日', bodies: [['水星', 87.969], ['金星', 224.701], ['地球', 365.256], ['火星', 686.98]] },
];
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16];   // ★ 音階（ペンタトニック、半音の数）。内側の天体ほど高い音
const BASE_F = 220;                    // ★ いちばん外側の天体の音 [Hz]
const TEMPOS = [[0.5, 1, 2, 4, 8], [0.5, 1, 2, 4, 8], [20, 40, 80, 160, 320]];   // 1 秒あたりに進む日数
let sys = 0, tp = 1, tDays = 0, playing = true, phase0 = [], flash = [], hits = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  choose(0);
}
function choose(k) {
  sys = k; tDays = 0; hits = []; let B = SYSTEMS[k].bodies;
  phase0 = B.map(() => 0); if (k === 0) phase0[0] = 180;   // イオだけ 180° ずらす：ラプラスの角 φ = 180°
  flash = B.map(() => 0);
}
function lonOf(i, t) { return phase0[i] + (360 * t) / SYSTEMS[sys].bodies[i][1]; }   // 平均の経度 [度]（円軌道）
function laplace(t) { return wrap360(lonOf(0, t) - 3 * lonOf(1, t) + 2 * lonOf(2, t)); }
function noteFreq(i, n) { return BASE_F * Math.pow(2, SCALE[Math.min(SCALE.length - 1, n - 1 - i)] / 12); }

function draw() {
  background(6, 8, 24);
  let B = SYSTEMS[sys].bodies, n = B.length, dt = playing ? TEMPOS[sys][tp] / 60 : 0;
  let t1 = tDays + dt;
  for (let i = 0; i < n && dt > 0; i++) {          // 基準の線（経度 0°）を通ったら音
    if (Math.floor(lonOf(i, t1) / 360) > Math.floor(lonOf(i, tDays) / 360)) {
      flash[i] = 1; hits.push([i, millis()]);
      if (audioCtx) tone(noteFreq(i, n), audioCtx.currentTime + 0.02, 0.25, 0.5, 'triangle');
    }
  }
  tDays = t1;
  while (hits.length && hits[0][1] < millis() - 6000) hits.shift();
  // ---- 軌道（半径 ∝ 周期^(2/3)：ケプラーの第 3 法則）
  let cx = width * 0.3, cy = height * 0.52, Rm = Math.min(width * 0.25, height * 0.38), Pmax = B[n - 1][1];
  stroke(255, 230, 160, 90); line(cx, cy, cx + Rm * 1.08, cy);
  noStroke(); fill(255, 210, 120); circle(cx, cy, 24);
  for (let i = 0; i < n; i++) {
    let r = Rm * Math.pow(B[i][1] / Pmax, 2 / 3), a = lonOf(i, tDays) * DEG, hue = (i / n) * 300;
    noFill(); stroke(120, 140, 200, 80); circle(cx, cy, 2 * r);
    let c = hsbCol(hue, 0.6, 1); noStroke(); fill(c[0], c[1], c[2]); circle(cx + r * Math.cos(a), cy - r * Math.sin(a), 12 + 16 * flash[i]);
    fill(220, 225, 240); textSize(12); text(B[i][0], cx + r * Math.cos(a) + 10, cy - r * Math.sin(a) - 8);
    flash[i] *= 0.9;
  }
  // ---- 音の譜面（過去 6 秒）
  let gx = width * 0.6, gw = width - gx - 30, gy = 110, gh = height * 0.4;
  stroke(70, 80, 120); noFill(); rect(gx, gy, gw, gh);
  noStroke();
  for (let [i, ms] of hits) { let c = hsbCol((i / n) * 300, 0.6, 1); fill(c[0], c[1], c[2]); rect(gx + gw - ((millis() - ms) / 6000) * gw, gy + ((i + 0.2) / n) * gh, 6, (0.6 * gh) / n); }
  fill(200, 205, 225); textSize(13); text('音の譜面（右が今、過去 6 秒）。上が内側の天体＝高い音', gx, gy - 8);
  // ---- 周期の表
  let y0 = gy + gh + 40;
  textSize(14); fill(240, 236, 215); text('天体　　周期　　　となりとの比　　音', gx, y0);
  for (let i = 0; i < n; i++) {
    let ratio = i > 0 ? (B[i][1] / B[i - 1][1]).toFixed(3) : '—';
    fill(215, 220, 235); text(B[i][0], gx, y0 + 22 * (i + 1)); text(B[i][1] + ' ' + SYSTEMS[sys].unit, gx + 70, y0 + 22 * (i + 1)); text(ratio, gx + 190, y0 + 22 * (i + 1));
    fill(250, 225, 140); text(noteFreq(i, n).toFixed(0) + ' Hz', gx + 290, y0 + 22 * (i + 1));
  }
  noStroke(); fill(240, 236, 215); textSize(18);
  text('惑星の音楽　｜ まずクリック　1 ガリレオ衛星　2 TRAPPIST-1　3 内惑星　↑↓ テンポ　スペース 再生/停止　F 和音', 20, 34);
  fill(250, 225, 140); textSize(16);
  text(SYSTEMS[sys].name + '　' + tDays.toFixed(1) + ' 日目（' + TEMPOS[sys][tp] + ' 日/秒）' + (sys === 0 ? '　ラプラスの角 φ = λイオ − 3λエウロパ + 2λガニメデ = ' + laplace(tDays).toFixed(2) + '°（ずっと 180°）' : '') + (audioCtx ? '' : '　（クリックで音が出ます）'), 20, 60);
  drawSelfTest(20, height - 12);
}
// 周期の比をそのまま周波数の比に：f = 基準 × (いちばん外側の周期 / 自分の周期)。ガリレオ衛星なら 1 : 2 : 4 = オクターブ
function chordFreqs() { let B = SYSTEMS[sys].bodies, Pn = B[B.length - 1][1]; return B.map((b) => 110 * (Pn / b[1])).filter((f) => f < 4000); }
function playChord() { if (!audioCtx) return; let t = audioCtx.currentTime + 0.05; chordFreqs().forEach((f, i) => tone(f, t + i * 0.25, 2 - i * 0.25, 0.35)); }
function hsbCol(h, s, v) { let f = (k) => { let q = (k + h / 60) % 6; return v - v * s * Math.max(0, Math.min(q, 4 - q, 1)); }; return [255 * f(5), 255 * f(3), 255 * f(1)]; }

function mousePressed() { startAudio(); }
function keyPressed() {
  startAudio();
  if (key >= '1' && key <= '3') choose(+key - 1);
  if (key === UP_ARROW) tp = Math.min(4, tp + 1);
  if (key === DOWN_ARROW) tp = Math.max(0, tp - 1);
  if (key === ' ') playing = !playing;
  if (key === 'f' || key === 'F') playChord();
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let G = SYSTEMS[0].bodies.map((b) => 360 / b[1]);   // 平均運動 [度/日]
  check('ラプラスの関係 n_イオ − 3 n_エウロパ + 2 n_ガニメデ ≈ 0（0.01°/日 以内）', Math.abs(G[0] - 3 * G[1] + 2 * G[2]) < 0.01);
  check('周期の比 エウロパ/イオ ≈ 2、ガニメデ/エウロパ ≈ 2（1% 以内）', near(SYSTEMS[0].bodies[1][1] / SYSTEMS[0].bodies[0][1], 2, 0.02) && near(SYSTEMS[0].bodies[2][1] / SYSTEMS[0].bodies[1][1], 2, 0.02));
  choose(0); let dev = 0; for (let t = 0; t <= 1000; t += 3.7) dev = Math.max(dev, Math.abs(wrap180(laplace(t) - 180)));
  check('ラプラスの角 φ は 1000 日たっても 180° のまま（1° 以内）', dev < 1);
  let T = SYSTEMS[1].bodies.map((b) => b[1]);
  check('TRAPPIST-1：c/b ≈ 8/5、d/c ≈ 5/3、e/d ≈ 3/2（1% 以内の共鳴の鎖）', near(T[1] / T[0], 1.6, 0.016) && near(T[2] / T[1], 5 / 3, 0.017) && near(T[3] / T[2], 1.5, 0.015));
  let ch = SYSTEMS[0].bodies.slice(0, 3).map((b) => 1 / b[1]);
  check('ガリレオ衛星の周波数の比 ≈ 4 : 2 : 1（オクターブ、1.5% 以内）', near(ch[0] / ch[2] / 4, 1, 0.015) && near(ch[1] / ch[2] / 2, 1, 0.015));
  check('全体の音量 MASTER は 0.2 以下', MASTER <= 0.2);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. クリックしてから 1 のガリレオ衛星を聞こう。イオ 4 回、エウロパ 2 回、ガニメデ 1 回のリズム
// 2. F で和音。1 : 2 : 4 はオクターブなので、きれいに重なって聞こえる
// 3. 2 の TRAPPIST-1 は 7 つの惑星の共鳴の鎖。どんなリズムに聞こえる？
// 4. 3 の内惑星は共鳴していない。リズムは規則正しい？
// 5. SCALE や BASE_F を変えて、自分の「天体の曲」を作ろう


// ==================================================
// ここから下は「天文の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
const DEG = Math.PI / 180;             // 度 → ラジアン
function wrap360(a) { return ((a % 360) + 360) % 360; }
function wrap180(a) { return wrap360(a + 180) - 180; }
function polyline(pts, closed) {       // 点が 2 つ以上あるときだけ折れ線を描く（空の beginShape はエラーになるため）
  if (!pts || pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape(closed ? CLOSE : undefined);
}
// ---- 音を鳴らす道具（Web Audio。最初のクリックかキーで startAudio()）
// 音量の上限：全体の音量 MASTER は 0.2 以下（大きな音は出ない）。1 音の大きさ vol も 0〜1 に制限
const MASTER = 0.15;                   // ★ 全体の音量（0.2 以下にしておく）
let audioCtx = null, masterOut = null;
function startAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterOut = audioCtx.createGain(); masterOut.gain.value = Math.min(0.2, MASTER); masterOut.connect(audioCtx.destination);
  }
  audioCtx.resume();
}
// 1 音：周波数 f、開始 t0（audioCtx の時刻）、長さ dur 秒、大きさ vol（0〜1）、波の形 type。立ち上がりと終わりは 15 ms でなめらかに
function tone(f, t0, dur, vol, type) {
  if (!audioCtx || !isFinite(f) || f <= 0 || !isFinite(vol)) return;
  vol = clampv(vol, 0, 1); dur = clampv(dur, 0.03, 2);
  let o = audioCtx.createOscillator(), gn = audioCtx.createGain();
  o.type = type || 'sine'; o.frequency.value = clampv(f, 20, 12000);
  gn.gain.setValueAtTime(0, t0);
  gn.gain.linearRampToValueAtTime(vol, t0 + 0.015);
  gn.gain.setValueAtTime(vol, t0 + dur - 0.015);
  gn.gain.linearRampToValueAtTime(0, t0 + dur);
  o.connect(gn); gn.connect(masterOut); o.start(t0); o.stop(t0 + dur + 0.02);
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); textSize(13); textAlign(LEFT, BASELINE); fill(selfTestResults.every((r) => r.ok) ? color(130, 215, 160) : color(255, 95, 95)); text(selfTestLine(), x, y); }
