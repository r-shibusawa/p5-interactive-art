// ============================================
// 14 ライブコーディング・スタジオ
// 音楽と映像を「鳴らしながら・動かしながら」コードで変えていく
//
//  ・左の黒い欄にコードを書いて  Ctrl + Enter（Mac は ⌘ + Enter）で反映
//  ・Ctrl + .（ピリオド）で音を全部止める
//  ・Esc でコード欄を隠す／出す（映像だけを見せたいとき）
//
// ※ このファイルは「スタジオ本体」です。sketch.js に貼って ▶ で実行。
//   演奏のコードは、コード集の「ライブコーディング・レシピ」を
//   スタジオの黒い欄に貼り付けて Ctrl + Enter で使います。
// ============================================

// 最初に入っている演奏コード
let START_CODE = `// ▼ ここを書きかえて Ctrl + Enter（Mac は ⌘ + Enter）
bpm(120)

drum('kick',  'x...x...x...x...')
drum('hat',   '..x...x...x...x.')
drum('snare', '....x.......x...')

synth('bass', 'C2 . . C2 . . G1 . C2 . . C2 . . A#1 .', { wave: 'sawtooth', cutoff: 800 })

scene('pulse')  // 'pulse' 'grid' 'tunnel' 'wave'
`;

let editor; // コードを書く欄
let statusText = 'Ctrl + Enter（⌘ + Enter）で演奏スタート';
let statusError = false;

// 今の演奏の状態
let live = { bpm: 120, tracks: {}, visual: null, scene: 'pulse' };
// 音が鳴った瞬間に 1 になり、だんだん 0 に戻る値（映像を音に合わせるため）
let pulse = { kick: 0, snare: 0, hat: 0, clap: 0, note: 0 };
let stepNow = 0;
let playing = false;

function setup() {
  createCanvas(windowWidth, windowHeight);

  // ---- コード欄をつくる ----
  editor = createElement('textarea');
  editor.attribute('spellcheck', 'false');
  editor.position(0, 0);
  editor.style('width', '46%');
  editor.style('height', 'calc(100% - 44px)');
  editor.style('box-sizing', 'border-box');
  editor.style('padding', '16px');
  editor.style('background', 'rgba(0, 0, 0, 0.6)');
  editor.style('color', '#f0f0f0');
  editor.style('border', 'none');
  editor.style('outline', 'none');
  editor.style('resize', 'none');
  editor.style('font-family', 'Menlo, Consolas, monospace');
  editor.style('font-size', '14px');
  editor.style('line-height', '1.6');
  editor.elt.value = loadStartCode();

  window.addEventListener('keydown', onKey);
  setInterval(scheduler, 25); // 25ミリ秒ごとに「次に鳴らす音」を準備する
}

function draw() {
  // ---- 実際に音が鳴った瞬間を映像に伝える ----
  let now = audioCtx ? audioCtx.currentTime : 0;
  while (events.length > 0 && events[0].time <= now) {
    let e = events.shift();
    if (e.type === 'step') stepNow = e.step;
    else pulse[e.type] = 1;
  }

  // 映像に渡す情報
  let v = {
    t: millis() / 1000, // 経過時間（秒）
    step: stepNow % 16, // 小節の中の何番目か（0〜15）
    beat: floor(stepNow / 4) % 4, // 何拍目か（0〜3）
    bar: floor(stepNow / 16), // 何小節目か
    kick: pulse.kick,
    snare: pulse.snare,
    hat: pulse.hat,
    clap: pulse.clap,
    note: pulse.note,
    level: getMasterLevel(), // 全体の音量（0〜1）
  };

  // ---- 映像を描く ----
  push();
  resetStyle();
  try {
    if (live.visual) live.visual(v);
    else (scenes[live.scene] || scenes.pulse)(v);
  } catch (err) {
    setStatus('映像のエラー: ' + err.message, true);
    live.visual = null;
  }
  pop();

  // だんだん 0 に戻す
  for (let k in pulse) pulse[k] *= 0.88;

  drawHud();
}

// ==================================================
// ライブコードで使える命令
// ==================================================
function makeApi(next) {
  return {
    // テンポ（1分間の拍の数）
    bpm: (n) => {
      if (typeof n !== 'number' || n < 30 || n > 300) throw new Error('bpm は 30〜300 の数で');
      next.bpm = n;
    },

    // ドラム： drum('kick', 'x...x...')   x=鳴らす  X=強く  .=休み
    drum: (name, pattern, vol = 1) => {
      if (!DRUMS[name]) throw new Error(`drum の名前は kick / snare / hat / clap のどれか（"${name}" はない）`);
      let tokens = String(pattern).replace(/\s/g, '').split('');
      for (let c of tokens) {
        if (!'xX.-'.includes(c)) throw new Error(`drum のパターンに使えるのは x X . だけ（"${c}" は使えない）`);
      }
      next.tracks['drum:' + name] = { kind: 'drum', sound: name, tokens, vol };
    },

    // シンセ： synth('bass', 'C2 . G1 .', { wave, cutoff, len, vol })
    //  音名 = 鳴らす  . = 休み  ? = パターンの中の音からランダム
    synth: (name, pattern, opts = {}) => {
      let tokens = String(pattern).trim().split(/\s+/);
      for (let t of tokens) {
        if (!/^([A-G][#b]?\d|\.|\?)$/.test(t)) throw new Error(`synth のパターンに "${t}" は使えない（例：C4 D#3 . ?）`);
      }
      let notes = tokens.filter((t) => t !== '.' && t !== '?');
      next.tracks['synth:' + name] = {
        kind: 'synth',
        tokens,
        notes,
        opts: { wave: 'triangle', cutoff: 4000, len: 0.25, vol: 0.3, ...opts },
      };
    },

    // 用意された映像を使う： scene('pulse')
    scene: (name) => {
      if (!scenes[name]) throw new Error(`scene の名前は ${Object.keys(scenes).join(' / ')} のどれか`);
      next.scene = name;
    },

    // 映像を自分で書く： visual(v => { ... })
    visual: (fn) => {
      if (typeof fn !== 'function') throw new Error('visual には関数を渡してね  例） visual(v => { ... })');
      next.visual = fn;
    },

    // 全部止める
    hush: () => {
      next.tracks = {};
    },
  };
}

// コードを実行して、演奏に反映する
function runCode() {
  startAudio();
  let code = editor.elt.value;
  let next = { bpm: live.bpm, tracks: {}, visual: null, scene: 'pulse' };
  let api = makeApi(next);
  try {
    new Function(...Object.keys(api), code)(...Object.values(api));
    live = next; // エラーがなかったときだけ切りかえる（音は止まらない）
    if (!playing) {
      playing = true;
      nextTime = audioCtx.currentTime + 0.1;
    }
    setStatus('OK  反映しました', false);
    try {
      localStorage.setItem('p5-livecode', code);
    } catch (e) {}
  } catch (err) {
    setStatus('エラー: ' + err.message + '（前の演奏を続けています）', true);
  }
}

function onKey(e) {
  let mod = e.ctrlKey || e.metaKey;
  if (mod && e.key === 'Enter') {
    e.preventDefault();
    runCode();
  } else if (mod && e.key === '.') {
    e.preventDefault();
    live.tracks = {};
    setStatus('全部止めました（Ctrl + Enter で再開）', false);
  } else if (e.key === 'Escape') {
    let hidden = editor.elt.style.display === 'none';
    editor.elt.style.display = hidden ? 'block' : 'none';
    if (hidden) editor.elt.focus();
  } else if (e.key === 'Tab' && e.target === editor.elt) {
    e.preventDefault();
    let el = editor.elt;
    let s = el.selectionStart;
    el.value = el.value.slice(0, s) + '  ' + el.value.slice(el.selectionEnd);
    el.selectionStart = el.selectionEnd = s + 2;
  }
}

function setStatus(text, isError) {
  statusText = text;
  statusError = isError;
}

// 下のバー（テンポ・16ステップ・メッセージ）
function drawHud() {
  push();
  resetStyle();
  noStroke();
  fill(0, 200);
  rect(0, height - 44, width, 44);
  textFont('monospace');
  textSize(14);
  textAlign(LEFT, CENTER);
  fill(statusError ? color(255, 90, 90) : color(120, 255, 180));
  text(statusText, 16, height - 22);
  // 16ステップの表示
  let x0 = width - 16 * 18 - 110;
  for (let i = 0; i < 16; i++) {
    fill(playing && i === stepNow % 16 ? 255 : i % 4 === 0 ? 110 : 60);
    rect(x0 + i * 18, height - 28, 12, 12, 2);
  }
  fill(200);
  textAlign(RIGHT, CENTER);
  text(live.bpm + ' BPM', width - 16, height - 22);
  pop();
}

function resetStyle() {
  colorMode(RGB, 255);
  fill(255);
  stroke(0);
  strokeWeight(1);
  rectMode(CORNER);
  ellipseMode(CENTER);
  textAlign(LEFT, BASELINE);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// 最初に表示するコード（コード集サイトの ?r=レシピ名 → 前回のコード → 最初のコード）
function loadStartCode() {
  let r = new URLSearchParams(location.search).get('r');
  if (r && /^[\w-]+$/.test(r)) {
    fetch('../../livecoding/' + r + '.js')
      .then((res) => (res.ok ? res.text() : Promise.reject()))
      .then((text) => (editor.elt.value = text))
      .catch(() => {});
  }
  try {
    let saved = localStorage.getItem('p5-livecode');
    if (saved) return saved;
  } catch (e) {}
  return START_CODE;
}

// ==================================================
// 用意された映像（scene）
// ==================================================
let scenes = {
  // 真ん中の円がキックで脈打つ
  pulse: (v) => {
    background(0, 40);
    noStroke();
    fill(255, 60, 140);
    circle(width * 0.65, height / 2, 80 + v.kick * 260);
    noFill();
    stroke(0, 230, 255, 255 * v.snare);
    strokeWeight(6);
    circle(width * 0.65, height / 2, 300 + (1 - v.snare) * 300);
    stroke(255, 200 * v.hat);
    strokeWeight(3);
    for (let i = 0; i < 12; i++) {
      point(random(width * 0.4, width), random(height));
    }
  },

  // 16マスのグリッドが音に合わせて光る
  grid: (v) => {
    background(0);
    let cols = 4;
    let size = min(width * 0.5, height - 80) / cols;
    let x0 = width * 0.7 - (size * cols) / 2;
    let y0 = height / 2 - (size * cols) / 2;
    noStroke();
    for (let i = 0; i < 16; i++) {
      let x = x0 + (i % cols) * size;
      let y = y0 + floor(i / cols) * size;
      let on = i === v.step;
      fill(on ? color(255, 255 * (0.5 + v.kick)) : color(30 + 80 * v.snare));
      rect(x + 4, y + 4, size - 8, size - 8, 6);
    }
  },

  // 回転する四角のトンネル
  tunnel: (v) => {
    background(0, 60);
    colorMode(HSB, 360, 100, 100, 100);
    translate(width * 0.65, height / 2);
    noFill();
    strokeWeight(2 + v.kick * 6);
    for (let i = 0; i < 14; i++) {
      push();
      rotate(v.t * 0.5 + i * 0.12);
      stroke((v.t * 40 + i * 20) % 360, 80, 100, 90);
      let s = (i + 1) * 40 + v.kick * 30;
      rect(-s / 2, -s / 2, s, s);
      pop();
    }
  },

  // 音の波形（オシロスコープ）
  wave: (v) => {
    background(0, 80);
    let w = getWaveform();
    noFill();
    stroke(0, 255, 200);
    strokeWeight(3);
    beginShape();
    for (let i = 0; i < w.length; i++) {
      vertex(map(i, 0, w.length, width * 0.4, width), height / 2 + w[i] * height * 0.4);
    }
    endShape();
  },
};

// ==================================================
// ここから下は「音を鳴らすための道具」です
// （中身は読まなくても OK。消さないでね）
// ==================================================
let audioCtx, master, analyser, noiseBuffer, waveData;
let events = []; // これから鳴る音（映像と合わせるために覚えておく）
let nextTime = 0; // 次のステップを鳴らす時刻
let stepCount = 0;

function startAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    let comp = audioCtx.createDynamicsCompressor();
    master = audioCtx.createGain();
    master.gain.value = 0.8;
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    waveData = new Float32Array(analyser.fftSize);
    master.connect(comp);
    comp.connect(analyser);
    analyser.connect(audioCtx.destination);
    // ノイズ（ザーッという音）を1秒分つくっておく
    noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate, audioCtx.sampleRate);
    let data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  audioCtx.resume();
}

// 少し先までの音を予約する（正確なリズムのため）
function scheduler() {
  if (!audioCtx || !playing) return;
  if (nextTime < audioCtx.currentTime - 0.2) nextTime = audioCtx.currentTime + 0.05;
  while (nextTime < audioCtx.currentTime + 0.12) {
    playStep(stepCount, nextTime);
    nextTime += 60 / live.bpm / 4; // 16分音符1つ分
    stepCount++;
  }
}

function playStep(step, time) {
  events.push({ time, type: 'step', step });
  for (let key in live.tracks) {
    let tr = live.tracks[key];
    let tok = tr.tokens[step % tr.tokens.length];
    if (tr.kind === 'drum') {
      if (tok === 'x' || tok === 'X') {
        DRUMS[tr.sound](time, tr.vol * (tok === 'X' ? 1 : 0.7));
        events.push({ time, type: tr.sound });
      }
    } else {
      if (tok === '?') tok = tr.notes.length ? tr.notes[Math.floor(Math.random() * tr.notes.length)] : '.';
      if (tok !== '.') {
        playSynth(tok, time, tr.opts);
        events.push({ time, type: 'note' });
      }
    }
  }
}

let DRUMS = {
  kick: (t, vol) => {
    let o = audioCtx.createOscillator();
    let g = audioCtx.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + 0.45);
  },
  snare: (t, vol) => {
    noiseHit(t, vol * 0.7, 'highpass', 1200, 0.18);
    let o = audioCtx.createOscillator();
    let g = audioCtx.createGain();
    o.type = 'triangle';
    o.frequency.value = 190;
    g.gain.setValueAtTime(vol * 0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + 0.12);
  },
  hat: (t, vol) => noiseHit(t, vol * 0.35, 'highpass', 7000, 0.05),
  clap: (t, vol) => {
    noiseHit(t, vol * 0.5, 'bandpass', 1500, 0.03);
    noiseHit(t + 0.012, vol * 0.5, 'bandpass', 1500, 0.03);
    noiseHit(t + 0.024, vol * 0.6, 'bandpass', 1500, 0.15);
  },
};

function noiseHit(t, vol, type, freq, decay) {
  let src = audioCtx.createBufferSource();
  src.buffer = noiseBuffer;
  let f = audioCtx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  let g = audioCtx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + decay);
  src.connect(f);
  f.connect(g);
  g.connect(master);
  src.start(t);
  src.stop(t + decay + 0.05);
}

function playSynth(note, t, opts) {
  let o = audioCtx.createOscillator();
  let f = audioCtx.createBiquadFilter();
  let g = audioCtx.createGain();
  o.type = opts.wave;
  o.frequency.value = noteToFreq(note);
  f.type = 'lowpass';
  f.frequency.value = opts.cutoff;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(opts.vol, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + opts.len);
  o.connect(f);
  f.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + opts.len + 0.05);
}

// 音名（'C4' や 'F#3'）を周波数（Hz）に変える
function noteToFreq(note) {
  let steps = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  let n = steps[note[0]];
  if (note[1] === '#') n = n + 1;
  if (note[1] === 'b') n = n - 1;
  let octave = parseInt(note.slice(-1));
  return 440 * Math.pow(2, (n + (octave + 1) * 12 - 69) / 12);
}

// 全体の音量（0〜1）
function getMasterLevel() {
  if (!audioCtx) return 0;
  analyser.getFloatTimeDomainData(waveData);
  let sum = 0;
  for (let i = 0; i < waveData.length; i++) sum += waveData[i] * waveData[i];
  return Math.sqrt(sum / waveData.length);
}

// 今の音の波の形（-1〜1）
function getWaveform() {
  if (!audioCtx) return new Array(512).fill(0);
  analyser.getFloatTimeDomainData(waveData);
  return waveData;
}
