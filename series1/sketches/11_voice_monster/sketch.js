// ============================================
// 11 声で動くモンスター
// 声を出すと口が開いて、大声だと真っ赤になって震える！
// 目はマウスを追いかける / クリックでマイク ON
// ============================================

let vol = 0; // なめらかにした音量

function setup() {
  createCanvas(windowWidth, windowHeight);
}

function draw() {
  background(255, 245, 230);

  // 音量を取得して、なめらかにする（lerp = 2つの値の間をとる）
  let level = getMicLevel();
  vol = lerp(vol, level, 0.3);

  // 音量 → 口の開き具合（0〜1）
  let open = map(vol, 0, 0.25, 0, 1, true);

  // 大声のときは震える
  let shake = 0;
  if (open > 0.7) shake = random(-8, 8);

  let cx = width / 2 + shake;
  let cy = height / 2 + shake;

  // ---- 体（緑 → 赤に変わる）----
  let calm = color(110, 200, 120);
  let angry = color(240, 60, 60);
  fill(lerpColor(calm, angry, open));
  stroke(50);
  strokeWeight(6);
  ellipse(cx, cy + 20, 320, 340);

  // ---- ツノ ----
  fill(255, 230, 120);
  triangle(cx - 110, cy - 110, cx - 70, cy - 200, cx - 40, cy - 130);
  triangle(cx + 110, cy - 110, cx + 70, cy - 200, cx + 40, cy - 130);

  // ---- 目（マウスを見る）----
  drawEye(cx - 65, cy - 40, open);
  drawEye(cx + 65, cy - 40, open);

  // ---- 口 ----
  stroke(50);
  strokeWeight(6);
  fill(80, 20, 40);
  let mouthH = 10 + open * 140;
  ellipse(cx, cy + 80, 150, mouthH);
  // 歯
  if (mouthH > 30) {
    fill(255);
    noStroke();
    let top = cy + 80 - mouthH / 2 + 4;
    triangle(cx - 40, top, cx - 24, top, cx - 32, top + 20);
    triangle(cx + 40, top, cx + 24, top, cx + 32, top + 20);
  }

  // ---- メッセージ ----
  noStroke();
  fill(60);
  textAlign(CENTER, CENTER);
  textSize(22);
  if (!micReady) {
    text('クリックしてマイクを ON にしよう', width / 2, 50);
  } else if (open > 0.7) {
    text('ガオーーー！！', width / 2, 50);
  } else {
    text('声を出してみよう！', width / 2, 50);
  }
}

// 目を描く関数
function drawEye(x, y, open) {
  stroke(50);
  strokeWeight(5);
  fill(255);
  let size = 80 + open * 20; // 大声で目も大きくなる
  circle(x, y, size);

  // 黒目をマウスの方向へ動かす
  let angle = atan2(mouseY - y, mouseX - x);
  let px = x + cos(angle) * 18;
  let py = y + sin(angle) * 18;
  noStroke();
  fill(30);
  circle(px, py, 34);
  fill(255);
  circle(px + 6, py - 6, 10); // 目のハイライト
}

function mousePressed() {
  startMic(); // マイクを ON
}

// ---------- やってみよう ----------
// 1. 体の色 calm / angry を好きな色に変えよう
// 2. 0.25（どのくらいの声で最大になるか）を変えて、感度を調整しよう
// 3. 大声のときに、06 の花火を口から出してみよう


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
