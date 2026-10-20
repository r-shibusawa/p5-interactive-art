// ============================================
// 14 FM 音源（おまけ）
// 1 つの波（モジュレータ）で別の波（キャリア）の周波数を揺らすと、倍音がどっと増える
// 周波数の比が整数なら楽器らしい音、非整数なら金属的な音。1980年代のシンセ（DX7）の方式
// マウス左右 = 周波数の比 / 上下 = 変調の深さ / クリックで鳴らす / 1〜3 でお手本
// ============================================

let ratio = 2; // モジュレータ : キャリア の周波数比
let index = 3; // 変調の深さ
let phase = 0;
let lastPlay = -10;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(260, 40, 10);
  ratio = round(map(mouseX, 0, width, 0.5, 8, true) * 2) / 2;
  index = map(mouseY, 0, height, 10, 0, true);
  phase += 0.02;

  // ---- 波形 ----
  let left = 60, right = width - 60, mid = height * 0.45, h = height * 0.2;
  stroke(0, 0, 25);
  line(left, mid, right, mid);
  noFill();
  stroke(45, 90, 100);
  strokeWeight(2.5);
  beginShape();
  for (let x = left; x <= right; x++) {
    let t = ((x - left) / (right - left)) * TWO_PI * 3;
    // ★ FM の式：キャリアの位相に、モジュレータを足す
    let v = sin(t + index * sin(ratio * t + phase));
    vertex(x, mid - v * h);
  }
  endShape();

  // ---- 実際のスペクトル ----
  if (analyser) {
    analyser.getByteFrequencyData(specData);
    let base = height - 70, sh = height * 0.22;
    stroke(0, 0, 25);
    line(left, base, right, base);
    noFill();
    stroke(170, 80, 100);
    strokeWeight(2);
    beginShape();
    for (let i = 1; i < specData.length; i++) {
      let f = (i * audioCtx.sampleRate) / 2 / specData.length;
      if (f > 5000) break;
      vertex(map(f, 0, 5000, left, right), base - (specData[i] / 255) * sh);
    }
    endShape();
    noStroke();
    fill(0, 0, 60);
    textSize(14);
    text('スペクトル（0〜5000 Hz）：倍音が キャリア ± n × モジュレータ の位置に並ぶ', left, base - sh - 10);
  }

  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text('周波数比 ' + nf(ratio, 1, 1) + '（左右）　変調の深さ ' + nf(index, 1, 1) + '（上下）　クリックで鳴らす　1：ベル　2：エレピ　3：ブラス', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('y = sin(2πf t + I × sin(2π × ratio × f × t))　比が整数（1, 2, 3）→ 調和した音、非整数（1.4, 3.5）→ 金属・ベルの音', 20, 68);
}

function mousePressed() {
  startAudio();
  playFM(220, ratio, index, 1.5);
}
function keyPressed() {
  startAudio();
  if (key === '1') playFM(440, 3.5, 6, 2.5);
  if (key === '2') playFM(220, 1, 2, 1.5);
  if (key === '3') playFM(165, 1, 5, 1.0);
}

// ---------- やってみよう ----------
// 1. 比を 1 → 2 → 3 と整数で変えると倍音の間隔が変わる。1.5 や 2.5 にすると不協和な響き
// 2. 深さ 0 は純粋なサイン波。上げるほど倍音が増えて明るく・ざらざらに
// 3. 鳴らしている間に深さを変化させる（時間で index を減らす）とベルの減衰になる


// ==================================================
// ここから下は「音を鳴らすための道具」（FM：モジュレータの出力をキャリアの周波数につなぐ）
// ==================================================
let audioCtx, analyser, specData, master;
function startAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    master = audioCtx.createDynamicsCompressor();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    specData = new Uint8Array(analyser.frequencyBinCount);
    master.connect(analyser);
    analyser.connect(audioCtx.destination);
  }
  audioCtx.resume();
}
function playFM(f, r, idx, dur) {
  let t = audioCtx.currentTime;
  let car = audioCtx.createOscillator(), mod = audioCtx.createOscillator();
  let modGain = audioCtx.createGain(), env = audioCtx.createGain();
  car.frequency.value = f;
  mod.frequency.value = f * r;
  modGain.gain.setValueAtTime(idx * f * r * 0.5, t); // 変調の深さ（Hz 単位）
  modGain.gain.exponentialRampToValueAtTime(1, t + dur); // だんだん浅く（ベルらしさ）
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(0.4, t + 0.01);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  mod.connect(modGain);
  modGain.connect(car.frequency); // ★ ここが FM
  car.connect(env);
  env.connect(master);
  mod.start(t); car.start(t);
  mod.stop(t + dur + 0.1); car.stop(t + dur + 0.1);
}
