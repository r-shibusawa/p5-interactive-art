// ============================================
// 13 量子の音
// 固有状態のエネルギー En を音の高さに、混ぜる割合 |cn|² を音量にする。重ね合わせ = 和音
//   |ψ|² が揺れる速さはエネルギーの差 Em − En。音では 2 つの音の差 = うなり。3（二重井戸）では本当に「同じ速さ」で揺れて聞こえる
// クリックで音をスタート / 左の準位をクリック = 0 → 半分 → 全部 / 1 = 箱 / 2 = 調和振動子 / 3 = 二重井戸（トンネル） / ←→ = 3 の分裂 Δ（Hz） / ↑↓ = 基本の高さ / スペース = 消音
// ============================================

const M = 300;
let mode = 1;
let c = [0, 1, 1, 0, 0, 0];   // 6 つの準位の係数（0, 0.5, 1）
let baseF = 55;               // ★ 箱の E1 の音の高さ（Hz）
let delta = 2;                // ★ 二重井戸の分裂（Hz）= うなりの回数/秒
let slow = 220;               // 箱・調和振動子の画面の時間は音の 1/220 の速さ（目で見える速さに）
let muted = false;
let wf = [];                  // wf[n][i] 固有関数
let trace = [];
let xs = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  makeWaves();
}

// 各モードの「固有関数」と「音の高さ」
function freq(n) {
  if (mode === 1) return baseF * (n + 1) * (n + 1);          // 箱：En ∝ n²
  if (mode === 2) return baseF * 2 * (2 * n + 1);            // 調和：En = n + 1/2 → 奇数倍音
  return n === 0 ? 220 - delta / 2 : n === 1 ? 220 + delta / 2 : 0;   // 二重井戸：近い 2 つの準位
}
function nLevels() { return mode === 3 ? 2 : 6; }

function makeWaves() {
  wf = []; xs = [];
  for (let i = 0; i < M; i++) xs.push(mode === 1 ? i / (M - 1) : -5 + (10 * i) / (M - 1));
  for (let n = 0; n < 6; n++) {
    wf[n] = new Float64Array(M);
    for (let i = 0; i < M; i++) {
      let x = xs[i];
      if (mode === 1) wf[n][i] = Math.SQRT2 * sin((n + 1) * PI * x);
      if (mode === 3) { let g1 = exp(-sq(x + 2) / 0.7), g2 = exp(-sq(x - 2) / 0.7); wf[n][i] = n === 0 ? (g1 + g2) : n === 1 ? (g1 - g2) : 0; }
    }
  }
  if (mode === 2) {   // エルミート関数（06 と同じ漸化式）
    for (let i = 0; i < M; i++) {
      let x = xs[i];
      wf[0][i] = Math.pow(PI, -0.25) * exp(-x * x / 2); wf[1][i] = Math.SQRT2 * x * wf[0][i];
      for (let n = 1; n < 5; n++) wf[n + 1][i] = sqrt(2 / (n + 1)) * x * wf[n][i] - sqrt(n / (n + 1)) * wf[n - 1][i];
    }
  }
  // どのモードでも ∫|ψn|² dx = 1 にそろえる
  let dxx = xs[1] - xs[0];
  for (let n = 0; n < 6; n++) { let s = 0; for (let i = 0; i < M; i++) s += wf[n][i] * wf[n][i] * dxx; if (s > 0) for (let i = 0; i < M; i++) wf[n][i] /= sqrt(s); }
  if (mode === 3) c = [1, 1, 0, 0, 0, 0];
  trace = [];
}

function draw() {
  background(290, 30, 9);
  let t = millis() / 1000;
  let nl = nLevels(), norm = 0;
  for (let n = 0; n < nl; n++) norm += c[n] * c[n];
  norm = sqrt(max(norm, 1e-9));

  // ★ 音：準位 n → 周波数 freq(n)、音量 ∝ |cn|²
  for (let n = 0; n < 6; n++) setVoice(n, freq(n), n < nl && !muted ? (0.22 * sq(c[n] / norm)) : 0);

  // ψ(x,t) = Σ cn ψn(x) e^{−i ωn t}。二重井戸は本当の音と同じ速さ、ほかは 1/slow
  let re = new Float64Array(M), im = new Float64Array(M);
  for (let n = 0; n < nl; n++) {
    if (!c[n]) continue;
    let w = TWO_PI * freq(n) / (mode === 3 ? 1 : slow), th = -w * t, a = c[n] / norm;
    for (let i = 0; i < M; i++) { re[i] += a * cos(th) * wf[n][i]; im[i] += a * sin(th) * wf[n][i]; }
  }
  let pmax = 0, left = 0, dxx = xs[1] - xs[0];
  for (let i = 0; i < M; i++) { let p = re[i] * re[i] + im[i] * im[i]; pmax = max(pmax, p); if (i < M / 2) left += p * dxx; }
  trace.push(left); if (trace.length > 400) trace.shift();

  // --- 左：準位のリスト ---
  let lx = 30, ly = 130, rh = min(70, (height - 200) / 6);
  for (let n = 0; n < nl; n++) {
    let y = ly + (nl - 1 - n) * rh, a2 = sq(c[n] / norm);
    noStroke(); fill(0, 0, c[n] ? 22 : 14); rect(lx, y, 300, rh - 8, 8);
    fill(n * 50 + 180, 60, 100); rect(lx, y, 300 * a2, 6, 3);
    noFill(); stroke(n * 50 + 180, 60, 100, c[n] ? 100 : 35); strokeWeight(2);
    beginShape(); for (let i = 0; i < M; i += 6) vertex(lx + 150 + (i / M) * 140, y + rh / 2 - 4 - wf[n][i] * (mode === 1 ? 10 : 14)); endShape();
    noStroke(); fill(0, 0, 100); textSize(14);
    text((mode === 2 ? 'n=' + n : mode === 3 ? (n === 0 ? '対称' : '反対称') : 'n=' + (n + 1)) + '　' + nf(freq(n), 1, mode === 3 ? 1 : 0) + ' Hz', lx + 10, y + rh / 2);
    fill(0, 0, 60); textSize(12); text('|c|² = ' + nf(a2, 1, 2), lx + 10, y + rh / 2 + 18);
  }

  // --- 中央：|ψ|²（色 = 位相） ---
  let px = 380, pw = width - px - 40, pb = height * 0.6, ph = height * 0.38;
  strokeWeight(pw / M + 0.8);
  for (let i = 0; i < M; i++) {
    let p = re[i] * re[i] + im[i] * im[i];
    stroke(((atan2(im[i], re[i]) + PI) / TWO_PI) * 360, 70, 100);
    line(px + (i / M) * pw, pb, px + (i / M) * pw, pb - (p / max(pmax, 0.5)) * ph);
  }
  stroke(0, 0, 50); strokeWeight(1); line(px, pb, px + pw, pb);
  // 左半分にいる確率の時間変化
  let gy = height - 40, gh = height * 0.22;
  noFill(); stroke(0, 0, 35); rect(px, gy - gh, pw, gh);
  stroke(55, 90, 100); strokeWeight(2); beginShape();
  for (let i = 0; i < trace.length; i++) vertex(px + (i / 400) * pw, gy - trace[i] * gh);
  endShape();
  noStroke(); fill(0, 0, 70); textSize(13);
  text('左半分にいる確率（' + (mode === 3 ? '本当の時間 = うなりと同じ速さ' : '画面の時間は音の 1/' + slow) + '）', px, gy - gh - 8);

  fill(0, 0, 100); textSize(18);
  text((audioCtx ? (muted ? '消音中' : '♪ 鳴っています') : 'クリックで音をスタート') + '　1：箱　2：調和振動子　3：二重井戸（' + ['', '箱', '調和', '二重井戸'][mode] + '）　準位をクリック　←→ Δ = ' + nf(delta, 1, 1) + ' Hz　↑↓ 高さ ' + baseF + ' Hz　スペース：消音', 20, 40);
  fill(0, 0, 60); textSize(15);
  text(mode === 3 ? '対称と反対称の 2 つの準位を混ぜると、粒子は左右の井戸をトンネルで行き来する。その回数/秒 = 2 つの音のうなり Δ' :
    mode === 2 ? '調和振動子は等間隔のはしご → 奇数倍音の和音（クラリネットのよう）。揺れも完全に周期的' :
    '箱は En ∝ n² → 1, 4, 9, 16 倍の高さ。和音は不協和だが、揺れのパターンは周期 1/E1 ごとに元に戻る（05 のリバイバル）', 20, 68);
}

function mousePressed() {
  startAudio();
  let lx = 30, ly = 130, rh = min(70, (height - 200) / 6), nl = nLevels();
  for (let n = 0; n < nl; n++) {
    let y = ly + (nl - 1 - n) * rh;
    if (mouseX > lx && mouseX < lx + 300 && mouseY > y && mouseY < y + rh - 8) c[n] = c[n] === 0 ? 0.5 : c[n] === 0.5 ? 1 : 0;
  }
}
function keyPressed() {
  startAudio();
  if (key === '1' || key === '2' || key === '3') { mode = int(key); if (mode !== 3) c = [0, 1, 1, 0, 0, 0]; makeWaves(); }
  if (key === RIGHT_ARROW) delta = min(8, delta + 0.5);
  if (key === LEFT_ARROW) delta = max(0.5, delta - 0.5);
  if (key === UP_ARROW) baseF = min(110, baseF + 5);
  if (key === DOWN_ARROW) baseF = max(30, baseF - 5);
  if (key === ' ') muted = !muted;
}

// ---------- やってみよう ----------
// 1. 3（二重井戸）で Δ = 1 Hz にして、うなりの「うわん」と黄色いグラフの山が同じタイミングか聞き比べよう
// 2. 対称だけ（反対称を 0）にすると、粒子は両方の井戸に半分ずつのまま動かない。音もうなりが消える
// 3. 2 で n = 0 と 1 だけ・n = 0 と 2 だけ を比べると、揺れの速さは？（差が 1 と 2）
// 4. freq を自分の音階（ドレミ）に変えて、「準位 = 鍵盤」の量子ピアノにしよう


// ==================================================
// ここから下は「音を鳴らすための道具」（準位ごとの正弦波）
// ==================================================
let audioCtx, masterOut, voices = [];
function startAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterOut = audioCtx.createDynamicsCompressor();
    masterOut.connect(audioCtx.destination);
    for (let i = 0; i < 6; i++) {
      let o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'sine'; o.frequency.value = 220; g.gain.value = 0;
      o.connect(g); g.connect(masterOut); o.start();
      voices.push({ o, g });
    }
  }
  audioCtx.resume();
}
// 声 i の高さ（Hz）と大きさをなめらかに変える
function setVoice(i, f, vol) {
  if (!audioCtx || !voices[i]) return;
  let tt = audioCtx.currentTime;
  voices[i].o.frequency.setTargetAtTime(constrain(f || 220, 20, 5000), tt, 0.02);
  voices[i].g.gain.setTargetAtTime(constrain(vol, 0, 0.3), tt, 0.05);
}
