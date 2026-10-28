// ============================================
// 13 折りの音
// 紙折り数列（12 のドラゴン曲線の折り目）を音にする。右に曲がる（1）→ 音が 1 つ上へ、左（0）→ 1 つ下へ
//   ドラゴン曲線をなぞる点と音がいっしょに進む。規則的なのにくり返さない、不思議なメロディ
// クリックで音をスタート / 1 = メロディ / 2 = リズム / 3 = 両方 / ↑↓ = テンポ / ←→ = 折る回数 n / スペース = 一時停止
// ============================================

let n = 8;                     // ★ 折る回数（2ⁿ − 1 個の折り目で 1 周）
let bpm = 300;                 // ★ 1 分あたりの音の数
let mode = 3;
let noteScale = [0, 2, 4, 7, 9];   // ★ 音階（ペンタトニック）。半音の数
let baseFreq = 220;            // ★ いちばん下の音（Hz）
let idx = 0, level = 7, heading = 0;
let paused = false;
let lastStep = 0;
let pts = [];
let flash = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  build();
}

function turnAt(k) { while (k % 2 === 0) k /= 2; return k % 4 === 1 ? 1 : 0; }

// ドラゴン曲線の点（画面に収まるように）
function build() {
  let N = 2 ** n, x = 0, y = 0, hd = 0, raw = [{ x, y }];
  for (let i = 1; i <= N; i++) {
    x += Math.cos(hd * HALF_PI); y += Math.sin(hd * HALF_PI); raw.push({ x, y });
    if (i < N) hd += turnAt(i) ? 1 : -1;
  }
  let xs = raw.map((p) => p.x), ys = raw.map((p) => p.y);
  let s = min((width * 0.6) / max(1, max(xs) - min(xs)), (height - 260) / max(1, max(ys) - min(ys)));
  let ox = width * 0.35 - (min(xs) + max(xs)) / 2 * s, oy = 110 + (height - 260) / 2 - (min(ys) + max(ys)) / 2 * s;
  pts = raw.map((p) => ({ x: ox + p.x * s, y: oy + p.y * s }));
  idx = 0; level = 7; heading = 0;
}

// ★ 1 歩進んで、その折り目の音を鳴らす
function stepOnce() {
  idx++;
  if (idx >= 2 ** n) { idx = 1; level = 7; heading = 0; }
  let b = turnAt(idx);
  level += b ? 1 : -1;
  heading = (heading + (b ? 1 : 3)) % 4;
  level = constrain(level, 0, noteScale.length * 3 - 1);
  if (mode === 1 || mode === 3) {
    let oct = floor(level / noteScale.length), semi = noteScale[level % noteScale.length] + 12 * oct;
    playTone(baseFreq * Math.pow(2, semi / 12), 60 / bpm * 1.6, 'triangle', 0.18);
  }
  if (mode === 2 || mode === 3) { if (b) playKick(); else playHat(); }
  flash = 1;
}

function draw() {
  background(24, 22, 30);
  if (audioCtx && !paused && millis() - lastStep > 60000 / bpm) { lastStep = millis(); stepOnce(); }
  flash *= 0.85;

  // 曲線：なぞった所は明るく
  strokeWeight(2); noFill();
  stroke(255, 255, 255, 30);
  beginShape(); for (let p of pts) vertex(p.x, p.y); endShape();
  colorMode(HSB, 360, 100, 100, 100);
  let from = max(0, idx - 200);
  for (let i = from; i < idx && i + 1 < pts.length; i++) {
    stroke((i * 0.7) % 360, 70, 100, 30 + 70 * (i - from) / 200);
    line(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
  }
  colorMode(RGB, 255);
  let p = pts[min(idx, pts.length - 1)];
  noStroke(); fill(255, 220, 90); circle(p.x, p.y, 14 + flash * 16);

  // 音の高さの帯（右）
  let bx = width * 0.75, by = 120, bh = height - 300, nLevels = noteScale.length * 3;
  for (let i = 0; i < nLevels; i++) {
    fill(i === level ? color(255, 190, 40) : color(255, 255, 255, 25));
    rect(bx, by + bh - (i + 1) * bh / nLevels, 160, bh / nLevels - 2);
  }
  fill(200); textSize(14); text('音の高さ（右 = 上、左 = 下）', bx, by - 10);

  // 数列のテープ（下）
  let tx = 20, ty = height - 110, cw = 18;
  let shown = floor((width - 40) / cw);
  for (let j = 0; j < shown; j++) {
    let k = idx - floor(shown / 2) + j;
    if (k < 1 || k >= 2 ** n) continue;
    let b = turnAt(k);
    fill(k === idx ? color(255, 190, 40) : b ? color(90, 150, 255) : color(230, 90, 70));
    rect(tx + j * cw, ty + (b ? 0 : 20), cw - 3, 18, 3);
  }
  fill(160); textSize(13); text('紙折り数列のテープ（上の段 = 1 = 右、下の段 = 0 = 左）', tx, ty - 10);

  fill(255); textSize(18);
  text((audioCtx ? (paused ? '一時停止中' : '♪ 鳴っています') : 'クリックで音をスタート') + '　1：メロディ　2：リズム　3：両方（' + ['', 'メロディ', 'リズム', '両方'][mode] + '）　↑↓：テンポ ' + bpm + '　←→：n = ' + n + '　スペース：停止', 20, 40);
  fill(170); textSize(15);
  text('折り目 ' + idx + ' / ' + (2 ** n - 1) + '　向き ' + ['→', '↓', '←', '↑'][heading] + '　　リズム：1 = 低い太鼓、0 = 高いシャカ', 20, 68);
}

function mousePressed() { startAudio(); }
function keyPressed() {
  startAudio();
  if (key >= '1' && key <= '3') mode = int(key);
  if (key === UP_ARROW) bpm = min(900, bpm + 30);
  if (key === DOWN_ARROW) bpm = max(60, bpm - 30);
  if (key === RIGHT_ARROW) { n = min(12, n + 1); build(); }
  if (key === LEFT_ARROW) { n = max(2, n - 1); build(); }
  if (key === ' ') paused = !paused;
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); build(); }

// ---------- やってみよう ----------
// 1. noteScale を [0, 3, 5, 7, 10]（ブルース風）や [0, 2, 4, 5, 7, 9, 11]（ドレミ）に変えてみよう
// 2. 音の高さを「上がる・下がる」ではなく、曲線の向き heading（4 通り）で決めると？
// 3. テンポを 900 まで上げると、数列のくり返し構造（自己相似）がリズムとして聞こえてくる
// 4. 1 のときだけ和音（startTone）にして、ドラゴンの角ごとにコードが変わる曲をつくろう


// ==================================================
// ここから下は「音を鳴らすための道具」（短い音・太鼓・シャカ）
// ==================================================
let audioCtx, masterOut;
function startAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterOut = audioCtx.createDynamicsCompressor();
    masterOut.connect(audioCtx.destination);
    lastStep = millis();
  }
  audioCtx.resume();
}
// 短い音（f Hz、dur 秒）
function playTone(f, dur, type, vol) {
  if (!audioCtx) return;
  let t = audioCtx.currentTime, o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = type || 'sine'; o.frequency.value = constrain(f, 40, 4000);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(masterOut); o.start(t); o.stop(t + dur + 0.05);
}
// 低い太鼓：音の高さを急に下げる
function playKick() {
  if (!audioCtx) return;
  let t = audioCtx.currentTime, o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.15);
  g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  o.connect(g); g.connect(masterOut); o.start(t); o.stop(t + 0.25);
}
// 高いシャカ：短いノイズ
function playHat() {
  if (!audioCtx) return;
  let len = Math.floor(audioCtx.sampleRate * 0.05), buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  let src = audioCtx.createBufferSource(), f = audioCtx.createBiquadFilter(), g = audioCtx.createGain();
  src.buffer = buf; f.type = 'highpass'; f.frequency.value = 6000; g.gain.value = 0.25;
  src.connect(f); f.connect(g); g.connect(masterOut); src.start();
}
// 鳴らしっぱなしの音（やってみよう 4 用）
function startTone(f, vol, type) {
  if (!audioCtx) return null;
  let o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = type || 'sine'; o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(vol, audioCtx.currentTime + 0.05);
  o.connect(g); g.connect(masterOut); o.start();
  return { o, g };
}
function stopTone(t) {
  if (!t) return;
  t.g.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.05);
  t.o.stop(audioCtx.currentTime + 0.3);
}
