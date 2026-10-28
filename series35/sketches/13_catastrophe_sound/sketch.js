// ============================================
// 13 カタストロフィーの音
// カスプの系 V(x) = x⁴ + a·x² + b·x の状態 x を「音の高さ」にする
//   コントロール (a, b) がゆっくり動く間は音もなめらかにすべる（グリッサンド）。折り目をこえると音がとぶ + 「カン」と鳴る
//   カスプの外を通る道はなめらか、中を通る道はとぶ。耳でカタストロフィーを聞き分けよう
// クリックで音をスタート / マウス（左の平面）= (a, b) / A = 自動の道 / 1〜3 = 道の形 / ↑↓ = 速さ / M = 音を止める
// ============================================

let a = -1.5, b = 0, x = -0.8;
let auto = true, pathKind = 1;
let speed = 0.006;          // ★ 自動の道の速さ
let t = 0;
let baseFreq = 220;         // ★ x = 0 のときの音の高さ（Hz）
let octaves = 1.2;          // ★ x が 1 変わると何オクターブ変わるか
let muted = false;
let logX = [], jumps = [], rings = [];

function dV(xx) { return 4 * xx * xx * xx + 2 * a * xx + b; }

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(260, 35, 10);
  if (auto) {
    t += speed;
    if (pathKind === 1) { a = -1.6; b = 2.4 * Math.sin(t); }                       // カスプを横切る（とぶ）
    if (pathKind === 2) { a = 0.8; b = 2.4 * Math.sin(t); }                        // カスプの外（なめらか）
    if (pathKind === 3) { a = -0.8 + 1.4 * Math.sin(t * 0.37); b = 2.2 * Math.sin(t); }   // 両方まざる
  }
  let before = x;
  for (let k = 0; k < 20; k++) x -= 0.004 * dV(x);
  x = constrain(x, -1.8, 1.8);
  if (abs(x - before) > 0.06 && (jumps.length === 0 || frameCount - jumps[jumps.length - 1].f > 20)) {
    jumps.push({ f: frameCount, a, b }); if (jumps.length > 30) jumps.shift();
    rings.push({ a, b, life: 40 });
    ping(freqOf(x) * 2, 0.35);
  }
  // ★ 状態 x → 音の高さ
  setTone(freqOf(x), muted ? 0 : 0.18);
  logX.push(x); if (logX.length > 600) logX.shift();

  // ---- 左：コントロール平面
  let py = 110, sz = min(height - py - 40, width * 0.45), px = 30;
  let toB = (v) => px + (v + 3) / 6 * sz, toA = (v) => py + (1.5 - v) / 4.5 * sz;
  noStroke(); fill(260, 25, 17); rect(px, py, sz, sz, 8);
  fill(50, 80, 100, 25); stroke(50, 80, 100); strokeWeight(2);
  beginShape(); for (let s = -0.7; s <= 0.701; s += 0.02) vertex(toB(8 * s ** 3), toA(-6 * s * s)); endShape(CLOSE);
  noFill();
  for (let r of rings) { stroke(0, 0, 100, r.life * 2); circle(toB(r.b), toA(r.a), 80 - r.life * 1.8); r.life--; }
  rings = rings.filter((r) => r.life > 0);
  noStroke();
  for (let j of jumps) { fill(0, 80, 100, 70); circle(toB(j.b), toA(j.a), 7); }
  fill(x > 0 ? color(25, 90, 100) : color(195, 80, 100)); circle(toB(b), toA(a), 18);
  fill(0, 0, 85); textSize(14);
  text('コントロール (a, b)。黄 = カスプ（谷が 2 つ）。赤い点 = 音がとんだ場所', px + 12, py + 22);

  // ---- 右：音の高さ（x）の楽譜ふうグラフ
  let rx = px + sz + 30, rw = width - rx - 30;
  noStroke(); fill(260, 25, 17); rect(rx, py, rw, sz, 8);
  stroke(0, 0, 100, 10); strokeWeight(1);
  for (let k = -2; k <= 2; k++) { let yy = py + sz / 2 - k * (sz / 2 - 20) / 2; line(rx, yy, rx + rw, yy); }
  noFill(); strokeWeight(3);
  for (let i = 1; i < logX.length; i++) {
    let jump = abs(logX[i] - logX[i - 1]) > 0.03;
    stroke(jump ? color(0, 80, 100) : logX[i] > 0 ? color(25, 90, 100) : color(195, 80, 100));
    line(rx + (i - 1) / 600 * rw, py + sz / 2 - logX[i - 1] / 1.8 * (sz / 2 - 20), rx + i / 600 * rw, py + sz / 2 - logX[i] / 1.8 * (sz / 2 - 20));
  }
  noStroke(); fill(0, 0, 85); textSize(14);
  text('音の高さ = ' + nf(freqOf(x), 1, 0) + ' Hz（縦 = x、時間 →）。赤 = とんだ瞬間', rx + 12, py + 22);

  noStroke(); fill(0, 0, 100); textSize(18);
  text((audioCtx ? (muted ? '🔇 止めています' : '♪ 鳴っています') : 'クリックで音をスタート') + '　A：自動 ' + (auto ? 'ON' : 'off') + '　1〜3：道（' + ['', 'カスプを横切る', 'カスプの外', 'まざる'][pathKind] + '）　↑↓：速さ　M：音を止める　マウス：(a, b)', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('道 1 では「ウーン↗…カン！↘」と音がとび、行きと帰りで違う高さでとぶ（ヒステリシス）。道 2 ではどこまでもなめらか', 20, 68);
}
function freqOf(xx) { return baseFreq * Math.pow(2, xx * octaves); }

function mousePressed() { startAudio(); }
function mouseDragged() {
  let py = 110, sz = min(height - py - 40, width * 0.45);
  if (mouseX > 30 && mouseX < 30 + sz && mouseY > py && mouseY < py + sz) {
    auto = false;
    b = (mouseX - 30) / sz * 6 - 3; a = 1.5 - (mouseY - py) / sz * 4.5;
  }
}
function keyPressed() {
  startAudio();
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === '1' || key === '2' || key === '3') { pathKind = Number(key); auto = true; }
  if (key === UP_ARROW) speed = min(0.05, speed * 1.4);
  if (key === DOWN_ARROW) speed = max(0.001, speed / 1.4);
  if (key === 'm' || key === 'M') muted = !muted;
}

// ---------- やってみよう ----------
// 1. 道 1 と道 2 を聞き比べよう。目を閉じても、どちらの道か当てられる？
// 2. octaves を 3 にすると、とぶ音の差が大きくなる。baseFreq を 110 にすると？
// 3. x を「音の高さ」でなく「音の大きさ」や「音色（波形）」にしてみよう
// 4. 2 つのカスプ系を別々の道で動かして、2 声の曲にしてみよう


// ==================================================
// ここから下は「音を鳴らすための道具」（鳴りっぱなしの音・カン）
// ==================================================
let audioCtx, masterOut, toneOsc, toneGain;
function startAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterOut = audioCtx.createDynamicsCompressor();
    masterOut.connect(audioCtx.destination);
    toneOsc = audioCtx.createOscillator(); toneGain = audioCtx.createGain();
    toneOsc.type = 'triangle'; toneOsc.frequency.value = 220; toneGain.gain.value = 0;
    toneOsc.connect(toneGain); toneGain.connect(masterOut); toneOsc.start();
  }
  audioCtx.resume();
}
// 鳴りっぱなしの音の高さ（Hz）と大きさ（0〜1）をなめらかに変える
function setTone(freq, vol) {
  if (!audioCtx) return;
  let t0 = audioCtx.currentTime;
  toneOsc.frequency.setTargetAtTime(constrain(freq, 40, 3000), t0, 0.02);
  toneGain.gain.setTargetAtTime(constrain(vol, 0, 0.4), t0, 0.05);
}
// 短い「カン」（減衰するサイン波）
function ping(freq, vol) {
  if (!audioCtx || muted) return;
  let o = audioCtx.createOscillator(), g = audioCtx.createGain(), t0 = audioCtx.currentTime;
  o.type = 'sine'; o.frequency.value = constrain(freq, 60, 4000);
  g.gain.setValueAtTime(constrain(vol, 0, 1), t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.6);
  o.connect(g); g.connect(masterOut); o.start(t0); o.stop(t0 + 0.65);
}
