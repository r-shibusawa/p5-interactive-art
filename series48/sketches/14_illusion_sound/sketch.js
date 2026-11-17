// ============================================
// 14 音の錯覚 ─ 無限に上がり続けるシェパード音
// 1 オクターブずつ離れた音（倍音）を同時に鳴らし、音量を「真ん中の高さで大きく、低い・高い所で小さく」（ガウス窓）する
// 全部を少しずつ上げていくと、上で消える音と下から現れる音が入れかわり、いつまでも上がり続けて聞こえる
// クリック = 音を出す / スペース = 再生・停止 / 1 = 階段（ドレミ…）/ 2 = なめらか / ↑↓ = 速さ / ←→ = 窓の幅 σ
// D = 上がる ⇔ 下がる / O = 1 本だけ（錯覚をやめる）/ T = 真実（1 オクターブ後の音の構成を重ねる）/ S = 画像を保存
// ============================================

let NP = 9;                  // ★ 倍音（1 オクターブずつ）の数
let FMIN = 27.5;             // ★ いちばん低い音の周波数 Hz
let sigmaOct = 1.3;          // ★ ガウス窓の幅（オクターブ）
let rate = 0.08;             // ★ なめらか：1 秒に何オクターブ上がるか
let noteSec = 0.45;          // ★ 階段：1 音の長さ（秒）
let playMode = 1, dirSign = 1, playing = true, onlyOne = false, truthKey = false;
let pos = 0, noteTimer = 0, nSteps = 0;   // pos：上がった量（オクターブ、0〜NP でくり返す）
let oscs = [], volume = 0.18;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
}

// ---- シェパード音の設計図：u オクターブ上がったときの倍音の周波数と音量（音量の合計は 1）
// k 番目の音は (k + u) を NP で割った余りの高さ。いちばん上を超えた音は、いちばん下（音量ほぼ 0）へ戻る
function partials(u) {
  let mid = Math.log2(FMIN) + NP / 2, out = [];
  for (let k = 0; k < NP; k++) {
    let lf = Math.log2(FMIN) + modN(k + u, NP);
    out.push({ f: Math.pow(2, lf), w: Math.exp(-((lf - mid) ** 2) / (2 * sigmaOct * sigmaOct)) });
  }
  let s = out.reduce((t, p) => t + p.w, 0);
  out.forEach((p) => (p.w /= s));
  if (onlyOne) out.forEach((p, k) => (p.w = k === Math.floor(NP / 2) ? 1 : 0));
  return out;
}
function modN(x, n) { return x - n * Math.floor(x / n); }
function phaseOf(u) { return modN(u, 1); }   // 1 オクターブの中のどこか（0〜1）

function draw() {
  let dt = Math.min(0.05, deltaTime / 1000);
  if (playing) {
    if (playMode === 2) pos = modN(pos + dirSign * rate * dt, NP);
    else { noteTimer += dt; if (noteTimer >= noteSec) { noteTimer = 0; nSteps++; pos = modN(Math.round((pos + dirSign / 12) * 12) / 12, NP); } }
  }
  updateSound();
  background(18, 20, 30);
  let P = partials(pos), x0 = 60, x1 = width - 60, y0 = 140, y1 = height * 0.62;
  let xOf = (f) => x0 + ((Math.log2(f) - Math.log2(20)) / (Math.log2(20000) - Math.log2(20))) * (x1 - x0);
  let yOf = (w) => y1 - w * (y1 - y0) * 2.2;
  // 窓（音量の山）
  noFill(); stroke(90, 110, 160); strokeWeight(2); beginShape();
  let mid = Math.log2(FMIN) + NP / 2, s0 = partials(0).reduce((t, p) => t + Math.exp(-((Math.log2(p.f) - mid) ** 2) / (2 * sigmaOct * sigmaOct)), 0);
  for (let lf = Math.log2(20); lf <= Math.log2(20000); lf += 0.05) vertex(xOf(2 ** lf), yOf(Math.exp(-((lf - mid) ** 2) / (2 * sigmaOct * sigmaOct)) / s0));
  endShape();
  // 倍音の棒
  for (let p of P) { stroke(255, 200, 80); strokeWeight(6); line(xOf(p.f), y1, xOf(p.f), yOf(p.w)); noStroke(); fill(200); textSize(12); textAlign(CENTER, TOP); text(Math.round(p.f), xOf(p.f), y1 + 6); }
  if (truthKey) {   // 1 オクターブ後（位相 + 1）の構成：まったく同じ所に重なる
    let Q = partials(pos + 1);
    for (let q of Q) { noFill(); stroke(80, 200, 255); strokeWeight(2); circle(xOf(q.f), yOf(q.w), 16); }
    noStroke(); fill(80, 200, 255); textSize(15); textAlign(LEFT, BASELINE);
    text('青い丸 = 1 オクターブ上がった後の音の構成 → 今の棒の先とぴったり重なる（まったく同じ音に戻っている）', x0, y0 - 20);
  }
  // 目盛り
  stroke(70); strokeWeight(1); line(x0, y1, x1, y1);
  noStroke(); fill(140); textSize(13); textAlign(CENTER, TOP);
  for (let f of [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]) text(f >= 1000 ? f / 1000 + 'k' : f, xOf(f), y1 + 24);
  text('周波数 Hz（対数）', (x0 + x1) / 2, y1 + 44);
  // 音の時計（位相）
  let cx = width / 2, cy = height * 0.82, r = Math.min(80, height * 0.1);
  noFill(); stroke(80); strokeWeight(2); circle(cx, cy, 2 * r);
  let a = -HALF_PI + phaseOf(pos) * TWO_PI;
  stroke(255, 200, 80); strokeWeight(4); line(cx, cy, cx + r * Math.cos(a), cy + r * Math.sin(a));
  noStroke(); fill(200); textSize(14); textAlign(CENTER, TOP); text('1 周 = 1 オクターブ（' + (playMode === 1 ? '12 段' : 'なめらか') + '）。何周しても同じ所に戻る', cx, cy + r + 8);
  hud();
}

function hud() {
  noStroke(); fill(235); textAlign(LEFT, BASELINE); textSize(18);
  text('スペース：' + (playing ? '停止' : '再生') + '　1・2：' + (playMode === 1 ? '階段' : 'なめらか') + '　↑↓：速さ　←→：窓の幅 σ = ' + sigmaOct.toFixed(1) + '　D：' + (dirSign > 0 ? '上がる' : '下がる') + '　O：1 本だけ ' + (onlyOne ? 'ON' : 'off') + '　T：真実', 20, 34);
  fill(170); textSize(15);
  text(audioCtx ? '音が出ています（音量は小さめ）。' + (playMode === 1 ? '上がった段の数：' + nSteps : '位相 ' + phaseOf(pos).toFixed(3)) : 'キャンバスをクリックすると音が出ます', 20, 60);
  fill(selfTestResults.length && selfTestResults.every((r) => r.ok) ? color(90, 200, 120) : color(240, 80, 80)); textSize(14);
  text(selfTestLine(), 20, height - 16);
}

// ---- 音：NP 個のサイン波の周波数と音量を毎フレーム合わせる
function updateSound() {
  if (!audioCtx) return;
  if (!oscs.length) for (let k = 0; k < NP; k++) { let o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.type = 'sine'; g.gain.value = 0; o.connect(g); g.connect(masterOut); o.start(); oscs.push({ o, g }); }
  let P = partials(pos), t = audioCtx.currentTime, tc = playMode === 1 ? 0.01 : 0.03;
  P.forEach((p, k) => {
    if (!oscs[k]) return;
    // いちばん上の音が下へ戻る瞬間だけ周波数がとぶ。そのときの音量はほぼ 0 なので聞こえない
    oscs[k].o.frequency.setTargetAtTime(Math.min(20000, p.f), t, tc);
    oscs[k].g.gain.setTargetAtTime(playing ? p.w * volume : 0, t, 0.03);
  });
}

function mousePressed() { startAudio(); }
function keyPressed() {
  startAudio();
  if (key === ' ') playing = !playing;
  if (key === '1' || key === '2') playMode = +key;
  if (key === UP_ARROW) { rate = Math.min(0.5, rate * 1.25); noteSec = Math.max(0.12, noteSec / 1.25); }
  if (key === DOWN_ARROW) { rate = Math.max(0.01, rate / 1.25); noteSec = Math.min(2, noteSec * 1.25); }
  if (key === RIGHT_ARROW) sigmaOct = Math.min(4, sigmaOct + 0.1);
  if (key === LEFT_ARROW) sigmaOct = Math.max(0.4, sigmaOct - 0.1);
  if (key === 'd' || key === 'D') dirSign = -dirSign;
  if (key === 'o' || key === 'O') onlyOne = !onlyOne;
  if (key === 't' || key === 'T') truthKey = !truthKey;
  if (key === 's' || key === 'S') saveCanvas('shepard', 'png');
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. 階段（1）で 12 段上がると、時計は 1 周して最初の音に戻る。でも「上がり続けた」ように聞こえる？
// 2. O で 1 本だけにすると、1 オクターブ上がったところで急に下へ戻るのが聞こえる（ごまかしが見える）
// 3. 窓の幅 σ を 0.4（せまい）と 4（広い）にすると、錯覚はどう変わる？
// 4. D で下がり続ける音に。映画やゲームで「緊張が高まり続ける」効果に使われている
// 5. FMIN や NP を変えて、自分の「終わらない音」を作ろう


// ==================================================
// ここから下は「音の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
let audioCtx = null, masterOut = null;
function startAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    let comp = audioCtx.createDynamicsCompressor(); comp.connect(audioCtx.destination);
    masterOut = audioCtx.createGain(); masterOut.gain.value = 1; masterOut.connect(comp);
  }
  audioCtx.resume();
}

// ---- 自己テスト：シェパード音の設計図の計算を確かめる
let selfTestResults = [];
function selfTest() {
  let R = [], ok = (name, cond) => R.push({ name, ok: !!cond });
  ok('音量の合計はいつも 1（位相 0, 0.3, 0.77）', [0, 0.3, 0.77].every((ph) => Math.abs(partials(ph).reduce((t, p) => t + p.w, 0) - 1) < 1e-12));
  let key2 = (A) => A.map((p) => p.f.toFixed(6) + ':' + p.w.toFixed(12)).sort().join();
  ok('1 オクターブ上がる（u → u + 1）と、倍音の周波数と音量の組はまったく同じ（u = 0, 0.4）', key2(partials(0)) === key2(partials(1)) && key2(partials(0.4)) === key2(partials(1.4)));
  let P = partials(0);
  ok('倍音どうしはちょうど 1 オクターブ（周波数 2 倍）ずつ', P.every((p, k) => k === 0 || Math.abs(p.f / P[k - 1].f - 2) < 1e-12));
  ok('聞こえる大きさの倍音は全部 20〜20000 Hz の中', [0, 0.5, 0.99].every((ph) => partials(ph).every((p) => p.w < 1e-3 || (p.f >= 20 && p.f <= 20000))));
  ok('両はしの倍音はほとんど聞こえない（入れかわりが目立たない）：' + P[0].w.toExponential(1), P[0].w < 0.01 && partials(0.999)[NP - 1].w < 0.01);
  let u = 0; for (let i = 0; i < 12; i++) u = modN(Math.round((u + 1 / 12) * 12) / 12, NP);
  ok('階段：12 段上がると 1 オクターブ上（u = ' + u + '）で、時計は元の位置。下がっても 0〜NP に収まる', u === 1 && phaseOf(u) === 0 && modN(-0.25, NP) === NP - 0.25);
  selfTestResults = R;
  for (let r of R) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name);
  return R.every((r) => r.ok);
}
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
