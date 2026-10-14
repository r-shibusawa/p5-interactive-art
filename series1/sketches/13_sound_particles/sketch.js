// ============================================
// 13 音に反応するパーティクル（自由制作のベース）
// マウスの位置から粒が湧き出る
// 声が大きいほど、たくさん・大きく・速く出る
// クリックでマイク ON / C で消す / S で保存
// ============================================
// ★ のついた数字を変えて、自分だけの作品にしよう！

let particles = [];
let hue = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  background(0, 0, 5);
}

function draw() {
  background(0, 0, 5, 15); // ★ 最後の数字：小さいほど残像が長い

  // 音量（マイク OFF のときは 0）
  let vol = getMicLevel();

  // 音量に応じて、粒を生み出す数を決める
  let amount = floor(map(vol, 0, 0.3, 1, 30, true)); // ★ 最大30個
  for (let i = 0; i < amount; i++) {
    let angle = random(TWO_PI);
    let speed = random(0.5, 2) + vol * 30; // ★ 音量で速くなる
    particles.push({
      x: mouseX,
      y: mouseY,
      vx: cos(angle) * speed,
      vy: sin(angle) * speed,
      size: random(4, 10) + vol * 80, // ★ 音量で大きくなる
      hue: (hue + random(-30, 30) + 360) % 360,
      life: 100,
    });
  }
  hue = (hue + 1) % 360; // ★ 色の変わる速さ

  // 粒を動かして描く
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.03; // ★ 重力（マイナスにすると上へ）
    p.life -= 1.5; // ★ 寿命の減る速さ
    p.size *= 0.98;

    noStroke();
    fill(p.hue, 70, 100, p.life);
    circle(p.x, p.y, p.size); // ★ 図形を変えてみよう

    if (p.life <= 0) particles.splice(i, 1);
  }

  if (!micReady) {
    noStroke();
    fill(0, 0, 100);
    textAlign(CENTER, CENTER);
    textSize(20);
    text('クリックでマイク ON → 声を出しながらマウスを動かそう', width / 2, 40);
  }
}

function mousePressed() {
  startMic(); // マイクを ON
}

function keyPressed() {
  if (key === 'c' || key === 'C') background(0, 0, 5);
  if (key === 's' || key === 'S') saveCanvas('sound-particles', 'png');
}

// ---------- 自由制作のアイデア ----------
// ・粒を星や四角や文字にする
// ・マウスではなく画面の中心や、ランダムな場所から出す
// ・09 のキーボードピアノと組み合わせて、鍵盤ごとに色を変える
// ・12 のカメラと組み合わせて、明るいところから粒を出す


// ==================================================
// ここから下は「マイクを使うための道具」です
// （中身は読まなくても OK。消さないでね）
// ==================================================
let audioCtx, analyser, waveData, spectrumData;
let micReady = false; // マイクの準備ができたら true

// マイクを ON にする（クリックしたときに呼ぶ）
function startMic() {
  if (audioCtx) return; // もう ON なら何もしない
  audioCtx = new AudioContext();
  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((stream) => {
      let source = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser(); // 音を調べる装置
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.8; // なめらかさ
      source.connect(analyser);
      waveData = new Float32Array(analyser.fftSize);
      spectrumData = new Uint8Array(analyser.frequencyBinCount);
      micReady = true;
    })
    .catch((err) => {
      console.log('マイクが使えません。ブラウザでマイクを「許可」してください：' + err);
      audioCtx = null;
    });
}

// 今の音量（0〜1。ふつうの声で 0.05〜0.2 くらい）
function getMicLevel() {
  if (!micReady) return 0;
  analyser.getFloatTimeDomainData(waveData);
  let sum = 0;
  for (let i = 0; i < waveData.length; i++) {
    sum += waveData[i] * waveData[i];
  }
  return Math.sqrt(sum / waveData.length);
}

// 低い音〜高い音、それぞれの強さ（0〜255）が入った配列（256個）
function getSpectrum() {
  if (!micReady) return new Array(256).fill(0);
  analyser.getByteFrequencyData(spectrumData);
  return spectrumData;
}
