// ============================================
// 15 声で動くジュリア集合（おまけ）
// 09 の c の値を、マウスではなく声で動かす
// 声の大きさで c が円の上を回り、集合の形が変わり続ける
// クリックでマイク ON / 1〜3 で配色
// ============================================

let img;
let w = 240, h = 135;
let maxIter = 50;
let palette = [];
let scheme = 1;
let theta = 0; // c の角度
let radius = 0.7885; // c の大きさ（この値で円を回ると、きれいに変化する）
let vol = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  img = createImage(w, h);
  makePalette();
  noSmooth();
}

function draw() {
  vol = lerp(vol, getMicLevel(), 0.2);
  // 声が大きいほど速く回る
  theta += 0.003 + vol * 0.6;
  // 声が大きいほど半径が少し大きくなる（形がちぎれる）
  let r = radius + vol * 0.3;
  let cr = r * cos(theta);
  let ci = r * sin(theta);

  img.loadPixels();
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      let zr = map(px, 0, w, -1.8, 1.8);
      let zi = map(py, 0, h, -1.0, 1.0);
      let n = 0;
      while (n < maxIter && zr * zr + zi * zi < 4) {
        let t = zr * zr - zi * zi + cr;
        zi = 2 * zr * zi + ci;
        zr = t;
        n++;
      }
      let i = (px + py * w) * 4;
      let c = palette[n];
      img.pixels[i] = c[0];
      img.pixels[i + 1] = c[1];
      img.pixels[i + 2] = c[2];
      img.pixels[i + 3] = 255;
    }
  }
  img.updatePixels();
  image(img, 0, 0, width, height);

  noStroke();
  fill(0, 180);
  rect(0, 0, width, 44);
  fill(255);
  textSize(16);
  text(micReady ? '声を出すと c が回る　c = ' + nf(cr, 1, 3) + ' + ' + nf(ci, 1, 3) + 'i　1〜3：配色' : 'クリックしてマイクを ON にしよう', 16, 28);
}

function makePalette() {
  palette = [];
  colorMode(HSB, 360, 100, 100);
  for (let n = 0; n <= maxIter; n++) {
    let t = n / maxIter;
    let c;
    if (n === maxIter) c = color(0, 0, 0);
    else if (scheme === 1) c = color((320 + t * 160) % 360, 70, 30 + sqrt(t) * 70);
    else if (scheme === 2) c = color(200 - t * 80, 80, sqrt(t) * 100);
    else c = color(0, 0, (n % 2) * 70 + t * 30);
    palette.push([red(c), green(c), blue(c)]);
  }
  colorMode(RGB, 255);
}

function mousePressed() {
  startMic();
}

function keyPressed() {
  if (key >= '1' && key <= '3') {
    scheme = int(key);
    makePalette();
  }
  if (key === 's' || key === 'S') saveCanvas('julia-sound', 'png');
}

// ---------- やってみよう ----------
// 1. radius を 0.5 や 1.0 にすると？
// 2. 声の高さ（getSpectrum）で配色を変えてみよう
// 3. 09 のように、マウスと声の両方で c を動かしてみよう


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
