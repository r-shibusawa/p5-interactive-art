// ============================================
// 11 カントール・リズム（音のフラクタル）
// 線を3つに分けて真ん中を消す「カントール集合」を、
// 時間に当てはめるとリズムになる。段ごとにちがう音が鳴る
// クリックで再生 / 1〜5 キーで段の ON/OFF / マウス左右 = テンポ
// ============================================

let levels = 5; // 段の数
let on = [true, true, true, true, true]; // 段ごとの ON/OFF
let notes = ['C2', 'G2', 'C3', 'E3', 'G3']; // 段ごとの音
let loopLen = 4; // 1周の長さ（秒）
let flash = [0, 0, 0, 0, 0]; // 段が光る
let playing = false;
let loopStart = 0;
let fired = {}; // この周で鳴らしたか

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  setInterval(scheduler, 25); // 25ミリ秒ごとに、次に鳴らす音を予約する
}

// カントール集合：level 段目の「残っている区間」を [始まり, 終わり] (0〜1) で返す
function cantor(level) {
  let segs = [[0, 1]];
  for (let i = 0; i < level; i++) {
    let next = [];
    for (let [a, b] of segs) {
      let t = (b - a) / 3;
      next.push([a, a + t]); // 左の 1/3
      next.push([b - t, b]); // 右の 1/3（真ん中は消す）
    }
    segs = next;
  }
  return segs;
}

function draw() {
  background(250, 30, 8);
  loopLen = map(mouseX, 0, width, 8, 2, true);

  let now = audioCtx ? audioCtx.currentTime : 0;
  let phase = playing ? ((now - loopStart) / loopLen) % 1 : 0; // いま1周の何%か

  let x0 = width * 0.08;
  let w = width * 0.84;
  let rowH = (height - 140) / levels;

  for (let l = 0; l < levels; l++) {
    let y = 100 + l * rowH;
    let segs = cantor(l);
    for (let [a, b] of segs) {
      let bright = on[l] ? 55 + flash[l] * 45 : 15;
      fill(l * 50, 70, bright);
      noStroke();
      rect(x0 + a * w, y, (b - a) * w - 2, rowH * 0.6, 4);
    }
    fill(0, 0, on[l] ? 100 : 40);
    textSize(14);
    text((l + 1) + '  ' + notes[l] + '  ×' + segs.length, x0, y - 6);
    flash[l] *= 0.85;
  }

  // 再生ヘッド
  if (playing) {
    stroke(0, 0, 100);
    strokeWeight(2);
    line(x0 + phase * w, 90, x0 + phase * w, height - 40);
  }

  noStroke();
  fill(0, 0, 100);
  textSize(16);
  text(playing ? '1〜5 キーで段の ON/OFF　マウス左右でテンポ（1周 ' + nf(loopLen, 1, 1) + '秒）' : 'クリックで再生', 20, 30);
}

// 少し先までの音を予約する
function scheduler() {
  if (!playing || !audioCtx) return;
  let now = audioCtx.currentTime;
  let ahead = now + 0.12;
  for (let l = 0; l < levels; l++) {
    if (!on[l]) continue;
    for (let [a] of cantor(l)) {
      // 区間の始まりの時刻（今の周と次の周）
      let elapsed = now - loopStart;
      let cycle = floor(elapsed / loopLen);
      for (let c of [cycle, cycle + 1]) {
        let t = loopStart + c * loopLen + a * loopLen;
        let key = l + ':' + c + ':' + a;
        if (t >= now - 0.01 && t < ahead && !fired[key]) {
          fired[key] = true;
          playNote(notes[l], 0.25, 0.3 + (levels - l) * 0.15, l < 2 ? 'sawtooth' : 'triangle', t);
          setTimeout(() => (flash[l] = 1), max(0, (t - now) * 1000));
        }
      }
    }
  }
  // 古い記録を捨てる
  if (Object.keys(fired).length > 2000) fired = {};
}

function mousePressed() {
  startAudio();
  if (!playing) {
    playing = true;
    loopStart = audioCtx.currentTime + 0.1;
    fired = {};
  }
}

function keyPressed() {
  if (key >= '1' && key <= '5') on[int(key) - 1] = !on[int(key) - 1];
}

// ---------- やってみよう ----------
// 1. 段を1つだけ ON にして、リズムを聞き分けよう。段が深いほど細かくなる
// 2. notes を変えて、好きな和音にしよう
// 3. 「真ん中を消す」を「左を消す」に変えると、どんなリズムになる？


// ==================================================
// ここから下は「音を鳴らすための道具」です
// （中身は読まなくても OK。消さないでね）
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

// 音を1つ鳴らす： playNote('C4', 大きさ, 長さ[秒], 音色, 鳴らす時刻)
function playNote(note, volume = 0.3, duration = 0.3, type = 'triangle', when) {
  if (!audioCtx) return;
  let t = when === undefined ? audioCtx.currentTime : when;
  let osc = audioCtx.createOscillator();
  let amp = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = noteToFreq(note);
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(volume, t + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(amp);
  amp.connect(masterOut);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

function noteToFreq(note) {
  let steps = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  let n = steps[note[0]];
  if (note[1] === '#') n = n + 1;
  if (note[1] === 'b') n = n - 1;
  let octave = parseInt(note.slice(-1));
  return 440 * Math.pow(2, (n + (octave + 1) * 12 - 69) / 12);
}
