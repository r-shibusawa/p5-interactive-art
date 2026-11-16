// ============================================
// 14 群れの音楽 🔊
// 1 = ホタルの合奏：24 匹のホタルがそれぞれ自分の音を持つ。光ったら鳴る。パルス結合（02 と同じ）で同期が進むと、バラバラの音が和音のリズムにそろう
// 2 = 粒子群の旋律：PSO（05 と同じ）を 1 回まわすごとに、粒子の高さ（y）で音程を決めてアルペジオで鳴らす。群れが答えに集まると音もそろう
// クリック = 音を出す（最初に 1 回）/ 1・2 = モード / ↑↓ = 結合 ε（1）・テンポ（2）/ R = やり直し / M = 消音
// ※ 一番下の「音を鳴らすための道具」まで全部コピーしてください
// ============================================

let modeId = 1;
let muted = false;
let volume = 0.18;           // ★ 音の大きさ（0〜0.4）
// 五音音階（ラ ド レ ミ ソ）を 3 オクターブ
const SCALE = [0, 3, 5, 7, 10];
function noteFreq(k) { let o = Math.floor(k / 5), s = SCALE[((k % 5) + 5) % 5]; return 220 * Math.pow(2, o + s / 12); }
// ---- モード 1：ホタル
let NFF = 24, eps = 0.06, curveB = 3, period = 1.6;   // ★ 数・結合・曲がり具合・周期（秒）
let flies = [], rHist = [];
// ---- モード 2：PSO（Rastrigin）
let NP = 10, wIn = 0.72, c1 = 1.49, c2 = 1.49;      // ★ PSO の係数
let parts = [], gBest = { x: 0, y: 0 }, gBestVal = Infinity, iterCount = 0, bestHist = [];
let beatFrames = 24;                                  // 1 回の PSO を何フレームごとに行うか（テンポ）
const LO = -5.12, HI = 5.12;
let ripples = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  resetFireflies(); resetPSO();
}
function resetFireflies() { flies = []; for (let i = 0; i < NFF; i++) flies.push({ ph: Math.random(), glow: 0, note: i % 15 }); rHist = []; }
function rastrigin(x, y) { return 20 + x * x - 10 * Math.cos(2 * Math.PI * x) + y * y - 10 * Math.cos(2 * Math.PI * y); }
function resetPSO() {
  parts = []; gBestVal = Infinity; iterCount = 0; bestHist = [];
  for (let i = 0; i < NP; i++) {
    let x = LO + Math.random() * (HI - LO), y = LO + Math.random() * (HI - LO);
    parts.push({ x, y, vx: 0, vy: 0, bx: x, by: y, bv: rastrigin(x, y) });
  }
  for (let p of parts) if (p.bv < gBestVal) { gBestVal = p.bv; gBest = { x: p.bx, y: p.by }; }
}
function fX(ph) { return Math.log(1 + (Math.exp(curveB) - 1) * ph) / curveB; }
function fInv(x) { return (Math.exp(curveB * x) - 1) / (Math.exp(curveB) - 1); }

function draw() {
  background(265, 45, 10);
  if (modeId === 1) drawFireflies(); else drawPSO();
  for (let rp of ripples) { noFill(); stroke(rp.h, 70, 100, rp.a * 100); strokeWeight(2); circle(rp.x, rp.y, rp.r); rp.r += 4; rp.a *= 0.93; }
  ripples = ripples.filter((rp) => rp.a > 0.03);
  noStroke(); fill(0, 0, 100); textSize(18);
  text('1：ホタルの合奏　2：粒子群の旋律　↑↓：' + (modeId === 1 ? '結合 ε = ' + nf(eps, 1, 3) : 'テンポ（' + beatFrames + ' フレーム / 回）') + '　R：やり直し　M：' + (muted ? '消音中' : '音あり'), 20, 36);
  fill(0, 0, 70); textSize(14);
  text(audioReady() ? '音が出ています' : 'クリックすると音が出ます', 20, 60);
}

function drawFireflies() {
  // ---- パルス結合（全員が全員を見る）
  let fired = [], done = new Uint8Array(NFF);
  for (let i = 0; i < NFF; i++) { flies[i].ph += 1 / 60 / period; if (flies[i].ph >= 1) fired.push(i); }
  while (fired.length) {
    let i = fired.pop(); if (done[i]) continue;
    done[i] = 1; flies[i].ph = 0; flies[i].glow = 1;
    for (let j = 0; j < NFF; j++) if (!done[j]) { let x = fX(flies[j].ph) + eps; if (x >= 1) fired.push(j); else flies[j].ph = fInv(x); }
  }
  // 同時に光ったホタルの音をまとめて鳴らす（多すぎるときは音量を下げる）
  let now = []; for (let i = 0; i < NFF; i++) if (done[i]) now.push(i);
  let cx = width * 0.36, cy = height * 0.55, R = Math.min(width, height) * 0.3;
  for (let k = 0; k < now.length && k < 8; k++) {
    let i = now[k];
    playNote(noteFreq(flies[i].note), 0, 0.35, muted ? 0 : volume / Math.sqrt(Math.max(1, now.length)), 'triangle');
    ripples.push({ x: cx + R * Math.cos((i / NFF) * Math.PI * 2), y: cy + R * Math.sin((i / NFF) * Math.PI * 2), r: 10, a: 0.8, h: 50 + flies[i].note * 15 });
  }
  let sx = 0, sy = 0;
  for (let f of flies) { sx += Math.cos(f.ph * Math.PI * 2); sy += Math.sin(f.ph * Math.PI * 2); }
  let r = Math.hypot(sx, sy) / NFF;
  rHist.push(r); if (rHist.length > 300) rHist.shift();
  noStroke();
  for (let i = 0; i < NFF; i++) {
    let f = flies[i], x = cx + R * Math.cos((i / NFF) * Math.PI * 2), y = cy + R * Math.sin((i / NFF) * Math.PI * 2);
    fill(50 + f.note * 15, 70, 30 + 70 * f.glow); circle(x, y, 16 + 22 * f.glow);
    fill(0, 0, 80); textSize(11); text(Math.round(noteFreq(f.note)), x - 10, y + 30);
    // 位相の針
    stroke(0, 0, 100, 40); strokeWeight(1); line(cx, cy, cx + 0.3 * R * Math.cos(f.ph * Math.PI * 2), cy + 0.3 * R * Math.sin(f.ph * Math.PI * 2)); noStroke();
    f.glow *= 0.88;
  }
  drawPlot(rHist, width - 360, 120, 320, 100, 0, 1, color(50, 80, 100), 'そろい具合 r = ' + nf(r, 1, 3) + '（1 = 全員同時）');
  fill(0, 0, 75); textSize(14);
  text('同時に鳴った音の数：' + now.length, width - 360, 260);
  text('真ん中の針 = それぞれの位相。針がそろうと', width - 360, 290);
  text('24 の音が 1 つの和音になって同時に鳴る', width - 360, 312);
  text('ε = 0 にするとずっとバラバラ（ポリリズム）', width - 360, 342);
}

function drawPSO() {
  if (frameCount % beatFrames === 0) {
    // ---- PSO を 1 回まわす
    for (let p of parts) {
      let r1 = Math.random(), r2 = Math.random();
      p.vx = constrain(wIn * p.vx + c1 * r1 * (p.bx - p.x) + c2 * r2 * (gBest.x - p.x), -2, 2);
      p.vy = constrain(wIn * p.vy + c1 * r1 * (p.by - p.y) + c2 * r2 * (gBest.y - p.y), -2, 2);
      p.x = constrain(p.x + p.vx, LO, HI); p.y = constrain(p.y + p.vy, LO, HI);
      let v = rastrigin(p.x, p.y);
      if (v < p.bv) { p.bv = v; p.bx = p.x; p.by = p.y; }
    }
    for (let p of parts) if (p.bv < gBestVal) { gBestVal = p.bv; gBest = { x: p.bx, y: p.by }; }
    iterCount++;
    bestHist.push(Math.log10(Math.max(gBestVal, 1e-12))); if (bestHist.length > 300) bestHist.shift();
    // ---- 粒子の高さ y → 音程（上ほど高い）。左の粒子から順にアルペジオ
    let order = parts.map((p, i) => i).sort((a, b) => parts[a].x - parts[b].x);
    order.forEach((i, k) => {
      let note = Math.round(((parts[i].y - LO) / (HI - LO)) * 14);
      playNote(noteFreq(note), k * 0.06, 0.25, muted ? 0 : volume * 0.6, 'sine');
    });
  }
  let sz = Math.min(height - 120, width * 0.55), ox = 30, oy = 90;
  let SX = (x) => ox + ((x - LO) / (HI - LO)) * sz, SY = (y) => oy + sz - ((y - LO) / (HI - LO)) * sz;
  noStroke(); fill(0, 0, 0, 30); rect(ox, oy, sz, sz);
  stroke(0, 0, 100, 10); strokeWeight(1);
  for (let k = 0; k <= 14; k++) { let y = oy + sz - (k / 14) * sz; line(ox, y, ox + sz, y); }          // 音程の線
  noStroke(); fill(0, 0, 60); textSize(11);
  for (let k = 0; k <= 14; k += 5) text(Math.round(noteFreq(k)) + ' Hz', ox + sz + 6, oy + sz - (k / 14) * sz + 4);
  for (let p of parts) {
    let note = Math.round(((p.y - LO) / (HI - LO)) * 14);
    fill(50 + note * 15, 70, 100); circle(SX(p.x), SY(p.y), 14);
  }
  fill(0, 90, 100); circle(SX(gBest.x), SY(gBest.y), 8);
  noFill(); stroke(120, 70, 100); strokeWeight(2); circle(SX(0), SY(0), 20);
  let gx = ox + sz + 70;
  drawPlot(bestHist, gx, 120, width - gx - 30, 120, -12, 2, color(0, 85, 100), 'Rastrigin の最良値 log10 f（本当の最小値 0 は緑の ○）');
  noStroke(); fill(0, 0, 90); textSize(15);
  text('反復 ' + iterCount + ' 回、最良値 f = ' + (gBestVal < 1e-4 ? gBestVal.toExponential(2) : nf(gBestVal, 1, 4)), gx, 280);
  fill(0, 0, 70); textSize(14);
  text('粒子の高さ = 音程（横線 1 本 = 五音音階の 1 音）', gx, 312);
  text('群れが 1 か所に集まると、10 個の音が同じ高さになる', gx, 336);
  text('局所解に止まった粒子は、別の音を鳴らし続ける', gx, 360);
}

function mousePressed() { startAudio(); }
function keyPressed() {
  startAudio();
  if (key === '1') modeId = 1;
  if (key === '2') modeId = 2;
  if (key === UP_ARROW) { if (modeId === 1) eps = Math.min(eps + 0.01, 0.3); else beatFrames = Math.max(beatFrames - 4, 8); }
  if (key === DOWN_ARROW) { if (modeId === 1) eps = Math.max(eps - 0.01, 0); else beatFrames = Math.min(beatFrames + 4, 60); }
  if (key === 'r' || key === 'R') { if (modeId === 1) resetFireflies(); else resetPSO(); }
  if (key === 'm' || key === 'M') muted = !muted;
}

// ---------- やってみよう ----------
// 1. モード 1 で ε = 0 にするとバラバラな音（でも周期は同じなので、ずっと同じパターン）。ε を上げると何秒でそろう？
// 2. period を 0.5 にするとテンポが速くなる。SCALE を [0, 2, 4, 7, 9]（ド レ ミ ソ ラ）に変えると明るい響きに
// 3. モード 2 で R を何回か。答え（0）に集まると同じ音になる。途中で止まると 2 つの音が残る（局所解の音）
// 4. wIn（慣性）を 0.95 にすると、粒子がなかなか止まらず、音もいつまでも動き回る
// 5. playNote の 'sine' を 'square' や 'sawtooth' に変えて、音色を比べよう

// ==================================================
// ここから下は「グラフの道具」と「音を鳴らすための道具」です（Web Audio）
// （中身は読まなくても OK。消さないでね）
// ==================================================
function drawPlot(arr, x, y, w, h, lo, hi, c, title) {
  noStroke(); fill(0, 0, 0, 35); rect(x, y, w, h);
  fill(0, 0, 85); textSize(13); text(title, x, y - 8);
  if (arr.length < 2) return;
  noFill(); stroke(c); strokeWeight(2);
  beginShape();
  for (let i = 0; i < arr.length; i++) vertex(x + (i / 299) * w, y + h - constrain((arr[i] - lo) / (hi - lo), 0, 1) * h);
  endShape();
}
let audioCtx, masterOut;
function startAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterOut = audioCtx.createDynamicsCompressor();
    masterOut.connect(audioCtx.destination);
  }
  audioCtx.resume();
}
function audioReady() { return !!audioCtx && audioCtx.state === 'running'; }
// 周波数 freq（Hz）の音を、delay 秒後に dur 秒だけ鳴らす
function playNote(freq, delay, dur, vol, type) {
  if (!audioReady() || vol <= 0) return;
  let t = audioCtx.currentTime + delay;
  let o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = type; o.frequency.value = constrain(freq, 30, 8000);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(constrain(vol, 0, 0.4), t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(masterOut);
  o.start(t); o.stop(t + dur + 0.05);
}
