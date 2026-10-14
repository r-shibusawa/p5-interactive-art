// ============================================
// 11 声におどろく群れ
// 05 のボイドに耳をつける。静かなときは群れ、大きな声で散る。
// 声が大きいほど色が赤く、動きが速くなる
// クリックでマイク ON
// ============================================

let boids = [];
let vol = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  for (let i = 0; i < 150; i++) {
    boids.push({ pos: createVector(random(width), random(height)), vel: p5.Vector.random2D().mult(2) });
  }
}

function draw() {
  background(220, 40, 8, 35);
  vol = lerp(vol, getMicLevel(), 0.2);
  let scare = map(vol, 0, 0.2, 0, 1, true); // 0 = 静か、1 = うるさい

  for (let b of boids) {
    let cohesion = createVector(0, 0), alignment = createVector(0, 0), separation = createVector(0, 0);
    let count = 0;
    for (let o of boids) {
      if (o === b) continue;
      let d = p5.Vector.dist(b.pos, o.pos);
      if (d < 70) {
        cohesion.add(o.pos);
        alignment.add(o.vel);
        count++;
        if (d < 25 + scare * 60) separation.add(p5.Vector.sub(b.pos, o.pos).div(d * d)); // うるさいと距離をとる
      }
    }
    let acc = createVector(0, 0);
    if (count > 0) {
      acc.add(cohesion.div(count).sub(b.pos).setMag(0.03 * (1 - scare))); // うるさいと集まらない
      acc.add(alignment.div(count).setMag(0.05));
      acc.add(separation.mult(30 + scare * 100));
    }
    // 中心から逃げる（大声のとき）
    let fromCenter = p5.Vector.sub(b.pos, createVector(width / 2, height / 2));
    acc.add(fromCenter.setMag(scare * 0.3));

    b.vel.add(acc).limit(3 + scare * 6);
    b.pos.add(b.vel);
    if (b.pos.x < 0) b.pos.x += width;
    if (b.pos.x > width) b.pos.x -= width;
    if (b.pos.y < 0) b.pos.y += height;
    if (b.pos.y > height) b.pos.y -= height;

    push();
    translate(b.pos.x, b.pos.y);
    rotate(b.vel.heading());
    noStroke();
    fill(map(scare, 0, 1, 200, 10), 70, 100);
    triangle(10, 0, -6, 5, -6, -5);
    pop();
  }

  noStroke();
  fill(0, 0, 100);
  textSize(16);
  text(micReady ? '静かに… 群れが集まる。大きな声 → 散る！　音量 ' + nf(vol, 1, 3) : 'クリックしてマイクを ON にしよう', 16, 28);
}

function mousePressed() {
  startMic();
}

// ---------- やってみよう ----------
// 1. 手を叩いたときと、「あー」と言い続けたときの違いを見よう
// 2. 0.2（どのくらいの声で最大になるか）を変えて感度を調整
// 3. 声の高さ（getSpectrum）で色を変えてみよう


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
