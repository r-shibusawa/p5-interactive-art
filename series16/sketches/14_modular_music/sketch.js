// ============================================
// 14 累乗の音楽：gᵏ mod p を演奏する（自由制作のベース）
// 1, g, g², g³, … を素数 p で割った余りは、いつか 1 に戻ってくり返す
// g が原始根なら 1 〜 p−1 を全部まわってから戻る（最長のメロディ）。そうでなければ短いループ
// 余りの数を音階の音に割り当てて鳴らす。円の上の線は、いま鳴っている数の動き
// スペース：再生・停止 / ←→：素数 p / ↑↓：g / 1〜3：音階 / V：2 声目（g² の旋律） / B：ベース
// ============================================

let tempo = 0.18;       // ★ 1 音の長さ（秒）
let waveType = 'triangle'; // ★ 音色：'sine' 'square' 'sawtooth' 'triangle'
let primes = [5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43];
const SCALES = { 1: [0, 2, 4, 7, 9], 2: [0, 2, 4, 5, 7, 9, 11], 3: [0, 1, 5, 7, 8] }; // ★ ペンタトニック・長音階・都節
const SCALE_NAMES = { 1: 'ペンタトニック', 2: '長音階', 3: '都節' };

let pi = 5, g = 3, scaleNo = 1, playing = false, voice2 = false, bass = true;
let k = 0, nextTime = 0, trail = [], flash = 0, seq = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  textWrap(CHAR);
  colorMode(HSB, 360, 100, 100, 100);
  rebuild();
  setInterval(scheduler, 25);
}

function P() { return primes[pi]; }
function rebuild() { // 1, g, g², … を 1 に戻るまで
  let p = P(); g = constrain(g, 2, p - 1);
  seq = []; let v = 1; do { seq.push(v); v = (v * g) % p; } while (v !== 1 && seq.length < p);
  k = 0; trail = [];
}
function isPrimitive(x, p) { let v = 1, c = 0; do { v = (v * x) % p; c++; } while (v !== 1); return c === p - 1; }
function noteOf(v) { // 3 オクターブの中に収める
  let sc = SCALES[scaleNo], i = (v - 1) % (sc.length * 3);
  return 220 * pow(2, (sc[i % sc.length] + 12 * floor(i / sc.length)) / 12); }

function scheduler() {
  if (!playing || !audioCtx) return;
  while (nextTime < audioCtx.currentTime + 0.1) {
    let v = seq[k % seq.length], p = P();
    playNote(noteOf(v), 0.22, tempo * 1.6, waveType, nextTime);
    if (voice2) playNote(noteOf(((v * v) % p) || 1) * 0.5, 0.12, tempo * 1.4, 'sine', nextTime);
    if (bass && k % seq.length === 0) playNote(55, 0.35, tempo * seq.length * 0.9, 'sine', nextTime);
    let when = nextTime, kk = k;
    setTimeout(() => { trail.push({ v, born: frameCount }); if (trail.length > 40) trail.shift(); flash = 1; }, max(0, (when - audioCtx.currentTime) * 1000));
    k++; nextTime += tempo;
  }
}

function draw() {
  background(250, 50, 8);
  flash *= 0.9;
  let p = P(), cx = width * 0.36, cy = height * 0.56, R = min(width * 0.27, height * 0.34);
  let prim = isPrimitive(g, p);
  fill(0, 0, 92); noStroke(); textSize(26); textAlign(LEFT, BASELINE);
  text(`累乗の音楽：${g}ᵏ mod ${p}`, 30, 50);
  textSize(15); fill(0, 0, 60);
  text(`スペース：${playing ? '停止' : '再生'}　←→：p = ${p}　↑↓：g = ${g}　1〜3：音階（${SCALE_NAMES[scaleNo]}）　V：2 声目 ${voice2 ? 'ON' : 'OFF'}　B：ベース ${bass ? 'ON' : 'OFF'}`, 30, 80);

  let pos = v => [cx + cos(-HALF_PI + (TWO_PI * (v - 1)) / (p - 1)) * R, cy + sin(-HALF_PI + (TWO_PI * (v - 1)) / (p - 1)) * R];
  // 軌跡
  for (let i = 1; i < trail.length; i++) {
    let [x1, y1] = pos(trail[i - 1].v), [x2, y2] = pos(trail[i].v), age = i / trail.length;
    stroke((trail[i].v * 360) / p, 70, 100, age * 90); strokeWeight(1 + age * 4); line(x1, y1, x2, y2);
  }
  // 数の丸
  let inSeq = new Set(seq), last = trail.length ? trail[trail.length - 1].v : -1;
  for (let v = 1; v < p; v++) {
    let [x, y] = pos(v), on = v === last, r = constrain(R * 2.4 / p, 10, 24) * (on ? 1 + flash * 0.8 : 1);
    noStroke(); fill(inSeq.has(v) ? color((v * 360) / p, 65, 95) : color(0, 0, 25)); circle(x, y, r * 2);
    fill(0, 0, inSeq.has(v) ? 8 : 70); textAlign(CENTER, CENTER); textSize(r * 0.8); text(v, x, y);
  }
  noStroke(); fill(prim ? color(50, 80, 100) : color(0, 0, 80)); textSize(22); textAlign(CENTER, CENTER);
  text(prim ? '原始根！' : `ループ ${seq.length} 音`, cx, cy - 12);
  textSize(14); fill(0, 0, 65); text(`位数 = ${seq.length}`, cx, cy + 16);

  // 右：数列と説明
  let px = width * 0.68, w = width - px - 30, yy = 120;
  textAlign(LEFT, TOP); fill(0, 0, 90); textSize(17); text('数列（1 に戻るまで）', px, yy); yy += 30;
  let cs = min(34, w / 8);
  for (let i = 0; i < seq.length; i++) {
    let x = px + (i % 8) * cs, y = yy + floor(i / 8) * cs, on = playing && (k - 1) % seq.length === i;
    fill(on ? color(50, 90, 100) : color((seq[i] * 360) / p, 50, 60)); rect(x, y, cs - 3, cs - 3, 5);
    fill(0, 0, 8); textAlign(CENTER, CENTER); textSize(cs * 0.4); text(seq[i], x + cs / 2 - 1, y + cs / 2 - 1);
  }
  yy += ceil(seq.length / 8) * cs + 20;
  let prims = []; for (let x = 2; x < p; x++) if (isPrimitive(x, p)) prims.push(x);
  textAlign(LEFT, TOP); fill(0, 0, 85); textSize(15);
  text(`mod ${p} の原始根：${prims.join(', ')}`, px, yy, w); yy += 46;
  text(`位数はいつも p−1 = ${p - 1} の約数（${divisors(p - 1).join(', ')}）`, px, yy, w); yy += 46;
  fill(0, 0, 60); textSize(14);
  text(`離散対数：「gᵏ mod p = 目的の数」になる k を探すのは難しい（累乗は速いのに、逆は遅い）。ディフィー・ヘルマン鍵交換や楕円曲線暗号はこの「一方通行」を使う。\n\n自由制作：★の音色やテンポ、SCALES の音階、2 声目のルール（g² や g³）を変えて、自分の「数の曲」を作ろう`, px, yy, w);
}
function divisors(m) { let r = []; for (let x = 1; x <= m; x++) if (m % x === 0) r.push(x); return r; }

function mousePressed() { startAudio(); }
function keyPressed() {
  startAudio();
  if (key === ' ') { playing = !playing; if (playing) { nextTime = audioCtx.currentTime + 0.05; } }
  if (key === RIGHT_ARROW) { pi = min(primes.length - 1, pi + 1); rebuild(); }
  if (key === LEFT_ARROW) { pi = max(0, pi - 1); rebuild(); }
  if (key === UP_ARROW) { g = g + 1 >= P() ? 2 : g + 1; rebuild(); }
  if (key === DOWN_ARROW) { g = g - 1 < 2 ? P() - 1 : g - 1; rebuild(); }
  if (key >= '1' && key <= '3') scaleNo = int(key);
  if (key === 'v' || key === 'V') voice2 = !voice2;
  if (key === 'b' || key === 'B') bass = !bass;
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. p = 13 で g = 2（原始根）と g = 3（位数 3）を聞き比べる
// 2. g = p−1 にすると？（位数 2：1 と p−1 を行ったり来たり）
// 3. 2 声目を g² ではなく「v + 5 mod p」にするなど、自分のルールで伴奏を作る


// ==================================================
// ここから下は「音を鳴らすための道具」です
// ==================================================
let audioCtx, masterOut;
function startAudio() {
  if (!audioCtx) { audioCtx = new AudioContext(); masterOut = audioCtx.createDynamicsCompressor(); masterOut.connect(audioCtx.destination); }
  audioCtx.resume();
}
function playNote(freqHz, volume = 0.3, duration = 0.3, type = 'triangle', when) {
  if (!audioCtx) return;
  let t = when === undefined ? audioCtx.currentTime : when;
  let osc = audioCtx.createOscillator(), amp = audioCtx.createGain();
  osc.type = type; osc.frequency.value = freqHz;
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(volume, t + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(amp); amp.connect(masterOut); osc.start(t); osc.stop(t + duration + 0.05);
}
