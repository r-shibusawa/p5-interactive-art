// ============================================
// 12 ルールで作曲する（自由制作のベース）
// 「音階の中からランダムに」「でも前の音から遠くへは行かない」「4 拍目は休む」…
// 小さなルールを組み合わせると、聞いていられる音楽になる。映像も音に合わせて動く
// クリックで再生・停止 / マウス左右 = テンポ / 1〜3 で音階
// ============================================
// ★ のついたところを変えて、自分の作曲ルールをつくろう！

let scales = {
  1: { name: 'ペンタトニック', steps: [0, 2, 4, 7, 9] },
  2: { name: '長音階', steps: [0, 2, 4, 5, 7, 9, 11] },
  3: { name: '都節（日本）', steps: [0, 1, 5, 7, 8] },
};
let scaleNo = 1;
let bpm = 100;
let playing = false;
let nextTime = 0;
let stepIdx = 0;
let degree = 0; // いま音階の何番目か
let bubbles = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  setInterval(scheduler, 25);
}

// ★ 作曲ルール：次の音の「音階の番号」を返す
function nextDegree(prev, idx) {
  let n = scales[scaleNo].steps.length;
  if (idx % 8 === 0) return 0; // ★ 2 拍ごとに根音に戻る（安定感）
  let move = random([-2, -1, -1, 0, 1, 1, 2]); // ★ 近い音へ行きやすい
  return constrain(prev + move, 0, n * 2 - 1); // 2 オクターブぶん
}

// ★ リズムのルール：この位置で鳴らすか
function shouldPlay(idx) {
  if (idx % 16 === 15) return false; // ★ 4 拍目の裏は休む
  return random() < 0.8; // ★ 8 割の確率で鳴らす
}

function draw() {
  background(260, 40, 8, 40);
  bpm = map(mouseX, 0, width, 60, 160, true);

  // 粒：音ごとに生まれ、ゆっくり落ちる
  for (let i = bubbles.length - 1; i >= 0; i--) {
    let b = bubbles[i];
    b.y += b.vy;
    b.vy += 0.05; // ★ 重力
    b.life -= 1;
    noStroke();
    fill(b.hue, 70, 100, b.life);
    circle(b.x, b.y, b.size);
    if (b.life <= 0) bubbles.splice(i, 1);
  }

  fill(0, 0, 100);
  textSize(18);
  text(scales[scaleNo].name + '（1〜3）　テンポ ' + round(bpm) + '（左右）　クリックで' + (playing ? '停止' : '再生') + '　ステップ ' + stepIdx, 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('ルール：音階の中だけ ／ 近い音へ ／ 2 拍ごとに根音 ／ 4 拍目の裏は休む ／ 8 割の確率で鳴らす', 20, 68);
}

function scheduler() {
  if (!playing || !audioCtx) return;
  let dur = 60 / bpm / 4; // 16 分音符
  while (nextTime < audioCtx.currentTime + 0.1) {
    degree = nextDegree(degree, stepIdx);
    if (shouldPlay(stepIdx)) {
      let st = scales[scaleNo].steps;
      let midi = 60 + st[degree % st.length] + 12 * floor(degree / st.length);
      let len = stepIdx % 4 === 0 ? dur * 3 : dur * 1.5; // ★ 拍の頭は長く
      playNote(440 * pow(2, (midi - 69) / 12), stepIdx % 4 === 0 ? 0.3 : 0.18, len, 'triangle', nextTime); // ★ 音色
      let when = nextTime, d = degree, big = stepIdx % 4 === 0;
      setTimeout(() => bubbles.push({ x: map(d, 0, 10, 100, width - 100), y: height * 0.3, vy: -2, size: big ? 40 : 20, hue: (d * 36) % 360, life: 100 }), max(0, (when - audioCtx.currentTime) * 1000));
    }
    // ★ ベース：1 拍ごとに根音
    if (stepIdx % 4 === 0) playNote(440 * pow(2, (48 - 69) / 12), 0.15, dur * 3.5, 'sine', nextTime);
    stepIdx++;
    nextTime += dur;
  }
}

function mousePressed() {
  startAudio();
  playing = !playing;
  if (playing) nextTime = audioCtx.currentTime + 0.05;
}
function keyPressed() {
  if (scales[key]) scaleNo = int(key);
}

// ---------- 自由制作のアイデア ----------
// ・nextDegree のルールを変える：「必ず上がる」「3 回同じ音が続いたら跳ぶ」
// ・shouldPlay をユークリッド・リズム（03）にする
// ・08 のマルコフ連鎖で次の音を決める
// ・06 のクロマで、聞こえた音を音階に選ぶ（声に合わせて伴奏）
// ・粒を、音の高さで色、長さで大きさに


// ==================================================
// ここから下は「音を鳴らすための道具」です
// ==================================================
let audioCtx, masterOut;
function startAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterOut = audioCtx.createDynamicsCompressor();
    masterOut.connect(audioCtx.destination);
  }
  audioCtx.resume();
}
function playNote(freqHz, volume = 0.3, duration = 0.3, type = 'triangle', when) {
  if (!audioCtx) return;
  let t = when === undefined ? audioCtx.currentTime : when;
  let osc = audioCtx.createOscillator(), amp = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freqHz;
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(volume, t + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(amp);
  amp.connect(masterOut);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}
