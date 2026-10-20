// ============================================
// 15 音の指紋（おまけ）── Shazam のしくみ
// スペクトログラムの「とくに強い点（ピーク）」だけを取り出すと、曲ごとにちがう星座になる
// ピークのペア（周波数①・周波数②・時間差）をハッシュにして、データベースと照合するのが音楽検索
// クリックでマイク ON / スペースで星座を保存 → もう一度流すと「一致したペア」を数える
// ============================================

let layer;
let peaks = []; // {t, f}  t = 列番号
let saved = []; // 保存した星座
let col = 0;
let matches = 0;
let hashes = new Set();

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  layer = createGraphics(width, height - 120);
  layer.colorMode(HSB, 360, 100, 100, 100);
  layer.background(0, 0, 5);
}

function draw() {
  background(0, 0, 5);
  if (micReady) {
    let spec = getSpectrum();
    let gh = layer.height, maxBin = 160;
    // スペクトログラム 1 列
    for (let i = 0; i < maxBin; i++) {
      let v = spec[i] / 255;
      layer.noStroke();
      layer.fill(230, 50, v * 60);
      layer.rect(col, gh - (i + 1) * (gh / maxBin), 4, gh / maxBin + 1);
    }
    // ★ ピーク検出：まわりより十分大きい周波数ビンだけ残す
    for (let i = 3; i < maxBin - 3; i++) {
      let v = spec[i];
      if (v < 120) continue;
      let isPeak = true;
      for (let k = -3; k <= 3; k++) if (k !== 0 && spec[i + k] >= v) isPeak = false;
      if (isPeak) {
        peaks.push({ t: col, f: i });
        layer.fill(45, 90, 100);
        layer.circle(col + 2, gh - (i + 0.5) * (gh / maxBin), 6);
        // ★ 直前のピークとペアにしてハッシュ（周波数①, 周波数②, 時間差）
        for (let p of peaks.slice(-6, -1)) {
          let h = p.f + ':' + i + ':' + round((col - p.t) / 8);
          if (hashes.has(h)) {
            matches++;
            layer.stroke(120, 90, 100);
            layer.line(p.t + 2, gh - (p.f + 0.5) * (gh / maxBin), col + 2, gh - (i + 0.5) * (gh / maxBin));
            layer.noStroke();
          }
        }
      }
    }
    col = (col + 4) % layer.width;
    layer.fill(0, 0, 5);
    layer.rect(col + 4, 0, 8, gh);
    if (peaks.length > 400) peaks.splice(0, 100);
  }
  image(layer, 0, 110);

  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text(micReady ? 'スペクトログラムの「ピーク」（黄）が音の指紋。スペースで保存（' + saved.length + ' ペア）　緑の線 = 保存した指紋と一致' : 'クリックしてマイクを ON にしよう', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('一致 ' + matches + ' 回。同じ曲の同じ部分を流すと一致が増える。ピークは雑音や音量に強いので、スマホで録った曲でも照合できる', 20, 68);
}

function mousePressed() {
  startMic();
}
function keyPressed() {
  if (key === ' ') {
    // 最近のピークのペアをデータベースに
    hashes = new Set();
    for (let a = 0; a < peaks.length; a++) {
      for (let b = a + 1; b < min(a + 6, peaks.length); b++) {
        hashes.add(peaks[a].f + ':' + peaks[b].f + ':' + round((peaks[b].t - peaks[a].t) / 8));
      }
    }
    saved = [...hashes];
    matches = 0;
  }
}

// ---------- やってみよう ----------
// 1. 曲のサビを流してスペース → 同じサビをもう一度流すと緑の線が増える。別の曲だと？
// 2. しきい値 120 を変えると、ピークの数が変わる（多すぎると偶然の一致が増える）
// 3. ペアにする「時間差」を含めるのはなぜ？（周波数だけだと別の曲でも一致してしまう）


// ==================================================
// ここから下は「マイクを使うための道具」です
// ==================================================
let audioCtx, analyser, waveData, spectrumData;
let micReady = false;
function startMic() {
  if (audioCtx) return;
  audioCtx = new AudioContext();
  navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
    let source = audioCtx.createMediaStreamSource(stream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.3;
    source.connect(analyser);
    waveData = new Float32Array(analyser.fftSize);
    spectrumData = new Uint8Array(analyser.frequencyBinCount);
    micReady = true;
  }).catch((err) => { console.log('マイクが使えません：' + err); audioCtx = null; });
}
function getMicLevel() {
  if (!micReady) return 0;
  analyser.getFloatTimeDomainData(waveData);
  let sum = 0;
  for (let i = 0; i < waveData.length; i++) sum += waveData[i] * waveData[i];
  return Math.sqrt(sum / waveData.length);
}
function getSpectrum() {
  if (!micReady) return new Array(512).fill(0);
  analyser.getByteFrequencyData(spectrumData);
  return spectrumData;
}
