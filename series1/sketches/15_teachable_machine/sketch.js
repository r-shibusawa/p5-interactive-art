// ============================================
// 15 Teachable Machine と連携する
// 自分で学習させた AI（画像分類）の結果で、映像と音が変わる
//
// 【準備】
// 1. https://teachablemachine.withgoogle.com/ を開いて「使ってみる」→「画像プロジェクト」→「標準の画像モデル」
// 2. クラスを 2〜4 つ作り、名前をつける（例：グー / パー / なにもしない）
// 3. 各クラスを「ウェブカメラ」で撮影（1クラス 50枚以上がおすすめ）→「モデルをトレーニングする」
// 4. 「モデルをエクスポート」→「アップロード」→「モデルをアップロード」
// 5. 表示された共有リンクを、下の MODEL_URL に貼り付けて ▶
//
// クリックで音 ON（カメラの許可が必要）
// ============================================

let MODEL_URL = ''; // ← ここに貼る  例） 'https://teachablemachine.withgoogle.com/models/xxxxxxxx/'

let video; // カメラ
let frame; // AI に見せる画像（224×224）
let model; // Teachable Machine のモデル
let results = []; // 分類の結果 [{ className, probability }, ...]
let label = ''; // 今いちばん確率が高いクラス
let message = '準備中…';
let particles = [];
let bgColor;

// クラスごとの色（1番目, 2番目, 3番目, 4番目…）
let colors = ['#ff4f8b', '#2fd6c3', '#ffcc33', '#7a6cff', '#ff8a3d', '#54c7ff'];
// クラスごとの音
let notes = ['C4', 'E4', 'G4', 'B4', 'D5', 'F5'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  bgColor = color(20);
  video = createCapture(VIDEO);
  video.size(320, 240);
  video.hide();
  frame = createGraphics(224, 224);
  frame.pixelDensity(1);

  if (MODEL_URL === '') {
    message = 'MODEL_URL に Teachable Machine の共有リンクを貼ってね';
    return;
  }
  loadTeachableMachine(MODEL_URL);
}

function draw() {
  // 背景を、今のクラスの色にゆっくり近づける
  let i = classIndex(label);
  let target = i >= 0 ? color(colors[i % colors.length]) : color(20);
  bgColor = lerpColor(bgColor, target, 0.08);
  background(bgColor);

  // ---- 粒（クラスが変わった瞬間に飛び出す）----
  noStroke();
  for (let k = particles.length - 1; k >= 0; k--) {
    let p = particles[k];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 2;
    fill(255, p.life * 2.5);
    circle(p.x, p.y, p.size);
    if (p.life <= 0) particles.splice(k, 1);
  }

  // ---- 大きなラベル ----
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(min(width, height) * 0.12);
  text(label, width / 2, height * 0.42);

  // ---- 各クラスの確率バー ----
  let barW = min(500, width * 0.6);
  let x0 = width / 2 - barW / 2;
  textSize(16);
  for (let k = 0; k < results.length; k++) {
    let y = height * 0.62 + k * 36;
    let r = results[k];
    fill(0, 80);
    rect(x0, y, barW, 24, 12);
    fill(colors[k % colors.length]);
    rect(x0, y, barW * r.probability, 24, 12);
    fill(255);
    textAlign(LEFT, CENTER);
    text(r.className + '  ' + round(r.probability * 100) + '%', x0 + 12, y + 12);
  }

  // ---- カメラ映像（左右反転して右上に小さく）----
  push();
  translate(width - 20, 20);
  scale(-1, 1);
  image(video, 0, 0, 200, 150);
  pop();

  // ---- メッセージ ----
  fill(255);
  textAlign(CENTER, TOP);
  textSize(18);
  text(message, width / 2, 24);
}

// ==================================================
// ★ ここを改造しよう：クラスが変わった瞬間に呼ばれる
// ==================================================
function onLabelChange(newLabel, index) {
  // 音を鳴らす（クラスごとにちがう音）
  playNote(notes[index % notes.length], 0.4, 0.8);

  // 粒を飛ばす
  for (let k = 0; k < 80; k++) {
    let a = random(TWO_PI);
    let s = random(2, 10);
    particles.push({ x: width / 2, y: height * 0.42, vx: cos(a) * s, vy: sin(a) * s, size: random(4, 12), life: 100 });
  }

  // 例）クラスの名前で、ちがうことをする
  // if (newLabel === 'パー') { ... }
}

function mousePressed() {
  startAudio(); // クリックで音 ON
}

function classIndex(name) {
  return results.findIndex((r) => r.className === name);
}

// ==================================================
// ここから下は「AI を動かすための道具」です
// （中身は読まなくても OK。消さないでね）
// ==================================================

// Teachable Machine のライブラリを読み込んで、モデルを準備する
async function loadTeachableMachine(url) {
  try {
    message = 'AI を読み込み中…';
    await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.3.1/dist/tf.min.js');
    await loadScript('https://cdn.jsdelivr.net/npm/@teachablemachine/image@0.8.5/dist/teachablemachine-image.min.js');
    if (!url.endsWith('/')) url += '/';
    model = await tmImage.load(url + 'model.json', url + 'metadata.json');
    message = 'カメラに映してみよう（クリックで音 ON）';
    classifyLoop();
  } catch (err) {
    message = 'モデルを読み込めません。MODEL_URL を確認してね';
    console.log(err);
  }
}

// カメラの画像を AI に見せて、結果を受け取る（くり返し）
async function classifyLoop() {
  if (video.elt.readyState >= 2) {
    // Teachable Machine と同じように、左右反転＋真ん中を正方形に切り取る
    let vw = video.elt.videoWidth;
    let vh = video.elt.videoHeight;
    let s = min(vw, vh);
    let ctx = frame.drawingContext;
    ctx.save();
    ctx.translate(224, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video.elt, (vw - s) / 2, (vh - s) / 2, s, s, 0, 0, 224, 224);
    ctx.restore();

    results = await model.predict(frame.elt);
    let best = results.reduce((a, b) => (b.probability > a.probability ? b : a));
    if (best.className !== label && best.probability > 0.8) {
      label = best.className;
      onLabelChange(label, classIndex(label));
    }
  }
  setTimeout(classifyLoop, 100); // 0.1秒ごとに分類
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    let s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

let audioCtx;

function startAudio() {
  if (!audioCtx) audioCtx = new AudioContext();
  audioCtx.resume();
}

// 音を1つ鳴らす： playNote('C4', 音の大きさ 0〜1, 長さ[秒], 音色)
function playNote(note, volume = 0.3, duration = 0.3, type = 'triangle') {
  if (!audioCtx) return;
  let t = audioCtx.currentTime;
  let osc = audioCtx.createOscillator();
  let amp = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = noteToFreq(note);
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(volume, t + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(amp);
  amp.connect(audioCtx.destination);
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
