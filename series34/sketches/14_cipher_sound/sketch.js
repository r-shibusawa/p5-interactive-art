// ============================================
// 14 暗号を聞く 🔊
// データの 1 バイト = 1 つの音。平文のメロディはくり返しがあって「曲」に聞こえる。
//   ECB で暗号化：同じ 2 バイトのかたまりは同じ暗号文 → くり返しがそのまま聞こえてしまう（06 の輪郭と同じ）
//   CTR で暗号化：毎回違うカウンタを混ぜる → ランダムな音の列。耳でも区別できない = よい暗号
// クリック = 音を出す / 1 = 平文 2 = ECB 3 = CTR / ←→ = テンポ / ↑↓ = 鍵を変える / W = 音色 / スペース = 一時停止
// 自由制作のベース：MELODY を自分の曲に変えてみよう
// ※ 教育用（05 と同じおもちゃの 16 ビット暗号）
// ============================================

// ★ 平文のメロディ（0〜14 = ペンタトニック音階の段）。2 つずつ組になって 1 ブロック
const PHRASE = [0, 2, 4, 2, 0, 2, 4, 7, 5, 4, 2, 4, 0, 0, 2, 0];
let MELODY = [];
let modeNo = 1, tempo = 160;          // ★ 1 分あたりの音の数
let cipherKey = 0x2B7E, wave = 'triangle';
let playing = true, idx = 0, lastNote = 0;
let bytes = [];
const SCALE = [0, 2, 4, 7, 9];        // ペンタトニック（ド レ ミ ソ ラ）
const SBOX = [0xC, 0x5, 0x6, 0xB, 0x9, 0x0, 0xA, 0xD, 0x3, 0xE, 0xF, 0x8, 0x4, 0x7, 0x1, 0x2];

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('monospace');
  colorMode(HSB, 360, 100, 100, 100);
  for (let r = 0; r < 4; r++) MELODY = MELODY.concat(r === 3 ? PHRASE.slice(0, 12).concat([7, 5, 4, 0]) : PHRASE);
  rebuild();
}

// ★ モードに合わせてバイト列をつくる
function rebuild() {
  bytes = [];
  for (let i = 0; i < MELODY.length; i += 2) {
    let block = (MELODY[i] << 8) | MELODY[i + 1];
    let c = block;
    if (modeNo === 2) c = enc(block);                         // ECB
    if (modeNo === 3) c = block ^ enc((0x1000 + i / 2) & 0xFFFF);   // CTR
    bytes.push((c >> 8) & 0xFF, c & 0xFF);
  }
}

// バイト → 音の高さ（Hz）。15 段のペンタトニックに折りたたむ
function noteFreq(b) {
  let step = b % 15;
  let semi = SCALE[step % 5] + 12 * floor(step / 5);
  return 220 * pow(2, semi / 12);
}

function draw() {
  background(230, 30, 10);
  // 再生
  let interval = 60000 / tempo;
  if (playing && audioCtx && millis() - lastNote > interval) {
    lastNote = millis();
    playNote(noteFreq(bytes[idx]), interval / 1000 * 0.9);
    idx = (idx + 1) % bytes.length;
  }
  noStroke();
  fill(0, 0, 95);
  textSize(18);
  text('暗号を聞く　クリックで音　1 平文 2 ECB 3 CTR　←→ テンポ ' + tempo + '　↑↓ 鍵 ' + hex4(cipherKey) + '　W 音色 ' + wave + '　スペース ' + (playing ? '停止' : '再生'), 24, 34);
  fill(0, 0, 60);
  textSize(14);
  text(audioCtx ? '左上から順に 1 マス = 1 バイト = 1 音。同じ色 = 同じ高さ　｜ 教育用' : '▶ まずキャンバスをクリックして音を出す', 24, 56);

  let names = ['', '平文（メロディ）', 'ECB で暗号化', 'CTR で暗号化'];
  let notes = ['', 'くり返しがある = 曲に聞こえる', '同じブロック → 同じ音のかたまり。くり返しが聞こえる ✗', '毎回違う。くり返しが消えた ✓'];
  fill(modeNo === 2 ? color(0, 60, 100) : color(140, 50, 90));
  textSize(22);
  text(modeNo + '. ' + names[modeNo] + '　' + notes[modeNo], 24, 96);

  // バイトのマス目（16 個 × 4 段）
  let cols = 16, cw = min(70, (width - 48) / cols), top = 120;
  for (let i = 0; i < bytes.length; i++) {
    let x = 24 + (i % cols) * cw, y = top + floor(i / cols) * cw;
    let step = bytes[i] % 15;
    fill(step * 24, 70, 40 + step * 4);
    rect(x + 2, y + 2, cw - 4, cw - 4, 6);
    if (i === (idx + bytes.length - 1) % bytes.length && audioCtx) { noFill(); stroke(0, 0, 100); strokeWeight(3); rect(x, y, cw, cw, 8); noStroke(); }
    fill(0, 0, 100, 80);
    textSize(12);
    text(hex2(bytes[i]), x + 8, y + 18);
    if (i % 2 === 0) { fill(0, 0, 100, 30); rect(x + 4, y + cw - 8, cw * 2 - 8, 3); }   // 2 バイト = 1 ブロック
  }
  // 音の高さのグラフ（ピアノロール）
  let gy = top + ceil(bytes.length / cols) * cw + 30, gh = height - gy - 30;
  fill(0, 0, 100, 6);
  rect(24, gy, width - 48, gh, 8);
  let bw = (width - 48) / bytes.length;
  for (let i = 0; i < bytes.length; i++) {
    let step = bytes[i] % 15;
    fill(step * 24, 70, i === (idx + bytes.length - 1) % bytes.length ? 100 : 75);
    rect(24 + i * bw, gy + gh - (step + 1) / 15 * (gh - 10), bw - 1, 8, 2);
  }
  fill(0, 0, 60);
  textSize(13);
  text('音の高さ（横 = 時間）', 30, gy + 16);
}

function mousePressed() { startAudio(); }

function keyPressed() {
  startAudio();
  if (key === '1' || key === '2' || key === '3') { modeNo = int(key); rebuild(); }
  if (key === LEFT_ARROW) tempo = max(60, tempo - 20);
  if (key === RIGHT_ARROW) tempo = min(480, tempo + 20);
  if (key === UP_ARROW || key === DOWN_ARROW) { cipherKey = floor(random(65536)); rebuild(); }
  if (key === 'w' || key === 'W') { let ws = ['sine', 'triangle', 'square', 'sawtooth']; wave = ws[(ws.indexOf(wave) + 1) % 4]; }
  if (key === ' ') playing = !playing;
  return false;
}

// ---------- やってみよう ----------
// 1. 1 → 2 → 3 の順に聞き比べよう。ECB で「同じフレーズがまた来た」と分かる？
// 2. PHRASE を自分のメロディに変えて、CTR にしたらどれくらい「別物」になるか聞いてみよう
// 3. noteFreq を変えて、バイトを和音やリズム（音の長さ）にも割り当ててみよう
// 4. 作品のアイデア：自分の名前をハッシュ（07）して、その 32 ビットで 1 小節の曲をつくる

// ==================================================
// ここから下は「道具」（おもちゃの暗号と、音を鳴らすための道具）
// ==================================================
function subst(x) { let y = 0; for (let i = 0; i < 4; i++) y |= SBOX[(x >> (4 * i)) & 0xF] << (4 * i); return y; }
function permute(x) { let y = 0; for (let b = 0; b < 16; b++) if ((x >> (15 - b)) & 1) y |= 1 << (15 - ((b % 4) * 4 + (b >> 2))); return y; }
function roundKey(k, r) { let s = (3 * r) % 16; return (((k << s) | (k >>> (16 - s))) ^ (0x1357 * (r + 1))) & 0xFFFF; }
function enc(x) { for (let r = 0; r < 4; r++) { x ^= roundKey(cipherKey, r); x = subst(x); if (r < 3) x = permute(x); } return x ^ roundKey(cipherKey, 4); }
function hex2(v) { return v.toString(16).toUpperCase().padStart(2, '0'); }
function hex4(v) { return '0x' + v.toString(16).toUpperCase().padStart(4, '0'); }

let audioCtx, masterOut;
function startAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterOut = audioCtx.createDynamicsCompressor();
    masterOut.connect(audioCtx.destination);
  }
  audioCtx.resume();
}
// 短い音を 1 つ鳴らす（freq：高さ Hz、dur：長さ 秒）
function playNote(freq, dur) {
  if (!audioCtx) return;
  let t = audioCtx.currentTime;
  let o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = wave;
  o.frequency.value = constrain(freq, 40, 4000);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + max(0.05, dur));
  o.connect(g); g.connect(masterOut);
  o.start(t); o.stop(t + dur + 0.05);
}
