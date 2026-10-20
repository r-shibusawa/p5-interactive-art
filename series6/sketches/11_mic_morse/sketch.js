// ============================================
// 11 モールス信号を声で送る（マイクで受信）
// 「トン（短）」「ツー（長）」を口笛や手拍子、「あ」の声で送ると、文字に戻る
// 音がある時間の長さで ・ と ー を判定し、無音の長さで文字の区切りを判定する
// クリックでマイク ON / マウス左右 = 感度 / C で消す
// ============================================

let MORSE = { '.-': 'A', '-...': 'B', '-.-.': 'C', '-..': 'D', '.': 'E', '..-.': 'F', '--.': 'G', '....': 'H', '..': 'I', '.---': 'J', '-.-': 'K', '.-..': 'L', '--': 'M', '-.': 'N', '---': 'O', '.--.': 'P', '--.-': 'Q', '.-.': 'R', '...': 'S', '-': 'T', '..-': 'U', '...-': 'V', '.--': 'W', '-..-': 'X', '-.--': 'Y', '--..': 'Z', '.----': '1', '..---': '2', '...--': '3', '....-': '4', '.....': '5', '-....': '6', '--...': '7', '---..': '8', '----.': '9', '-----': '0' };
let threshold = 0.05;
let isOn = false;
let onStart = 0, offStart = 0;
let current = ''; // いま打っている文字の ・ー
let decoded = '';
let levelHist = [];
let dotMax = 220; // これより短い音 = ・、長い = ー（ミリ秒）

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(230, 40, 10);
  threshold = map(mouseX, 0, width, 0.01, 0.2, true);
  let lvl = getMicLevel();
  levelHist.push(lvl);
  if (levelHist.length > width) levelHist.shift();

  // ★ 音の ON/OFF の切り替わりを検出して、長さで判定
  let now = millis();
  if (!isOn && lvl > threshold) {
    isOn = true;
    onStart = now;
    // 無音が長かったら、文字の区切り
    if (current && now - offStart > dotMax * 3) commitLetter();
  } else if (isOn && lvl < threshold * 0.7) {
    isOn = false;
    offStart = now;
    let dur = now - onStart;
    if (dur > 40) current += dur < dotMax ? '.' : '-';
  }
  // 無音が十分長ければ確定
  if (!isOn && current && now - offStart > dotMax * 3) commitLetter();

  // ---- 音量の波形としきい値 ----
  let base = height * 0.7;
  stroke(0, 0, 30);
  line(0, base, width, base);
  stroke(40, 90, 100);
  line(0, base - threshold * height * 1.2, width, base - threshold * height * 1.2);
  noFill();
  stroke(170, 80, 100);
  strokeWeight(2);
  beginShape();
  for (let i = 0; i < levelHist.length; i++) vertex(i, base - min(levelHist[i], 0.5) * height * 1.2);
  endShape();

  // ---- 表示 ----
  noStroke();
  fill(isOn ? 45 : 230, isOn ? 90 : 30, isOn ? 100 : 35);
  circle(width - 80, 110, 60);
  fill(0, 0, 100);
  textSize(60);
  text(current || '…', 40, height * 0.3);
  textSize(48);
  fill(45, 90, 100);
  text(decoded, 40, height * 0.45);
  fill(0, 0, 100);
  textSize(18);
  text(micReady ? '短い音 = ・　長い音 = ー　音を止めて少し待つと文字が確定　感度（マウス左右）' : 'クリックしてマイクを ON にしよう', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('例：S = ・・・　O = ーーー　E = ・　T = ー　　SOS = ・・・ ーーー ・・・', 20, 68);
}

function commitLetter() {
  decoded += MORSE[current] || '?';
  current = '';
  if (decoded.length > 24) decoded = decoded.slice(-24);
}

function mousePressed() {
  startMic();
}
function keyPressed() {
  if (key === 'c' || key === 'C') {
    decoded = '';
    current = '';
  }
}

// ---------- やってみよう ----------
// 1. 「あ・あ・あ」で S、「あーあーあー」で O を送ってみよう。SOS が出せたら成功
// 2. dotMax（220 ms）を変えて、自分の速さに合わせよう
// 3. 10 の DTMF のように「周波数」で送ると、声より確実。どう変えればいい？


// ==================================================
// ここから下は「マイクを使うための道具」です
// ==================================================
let audioCtx, analyser, waveData, spectrumData;
let micReady = false;

function startMic() {
  if (audioCtx) return;
  audioCtx = new AudioContext();
  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((stream) => {
      let source = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);
      waveData = new Float32Array(analyser.fftSize);
      spectrumData = new Uint8Array(analyser.frequencyBinCount);
      micReady = true;
    })
    .catch((err) => {
      console.log('マイクが使えません：' + err);
      audioCtx = null;
    });
}

function getMicLevel() {
  if (!micReady) return 0;
  analyser.getFloatTimeDomainData(waveData);
  let sum = 0;
  for (let i = 0; i < waveData.length; i++) sum += waveData[i] * waveData[i];
  return Math.sqrt(sum / waveData.length);
}
