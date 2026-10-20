// ============================================
// 13 周波数でノイズを消す（スペクトル・フィルタリング）
// 信号 → フーリエ変換 → 小さい成分を 0 にする → 逆変換 で、ノイズだけ消える
// 08 の移動平均より賢い：「本物の信号」の周波数は残し、それ以外を消す
// マウス左右 = しきい値 / 上下 = ノイズの量 / クリックで信号を作り直す
// ============================================

let N = 256;
let clean = [], noisy = [];
let threshold = 0.2;
let noiseAmp = 0.5;
let seed = 1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  makeSignal();
}

function makeSignal() {
  randomSeed(seed);
  let f1 = floor(random(2, 8)), f2 = floor(random(10, 25));
  clean = [];
  for (let i = 0; i < N; i++) {
    let t = i / N;
    clean.push(sin(TWO_PI * f1 * t) + 0.5 * sin(TWO_PI * f2 * t));
  }
}

function draw() {
  background(220, 40, 10);
  threshold = map(mouseX, 0, width, 0, 0.6, true);
  noiseAmp = map(mouseY, 0, height, 1.5, 0, true);
  randomSeed(seed + 7);
  noisy = clean.map((v) => v + random(-noiseAmp, noiseAmp));

  // ★ 1. フーリエ変換
  let { re, im } = dft(noisy);
  let mag = re.map((r, k) => (2 * sqrt(r * r + im[k] * im[k])) / N);
  // ★ 2. しきい値より小さい成分を 0 にする
  let keep = mag.map((m) => m > threshold);
  let re2 = re.map((r, k) => (keep[k] ? r : 0));
  let im2 = im.map((v, k) => (keep[k] ? v : 0));
  // ★ 3. 逆フーリエ変換で信号に戻す
  let restored = idft(re2, im2);

  let left = 60, right = width - 60;
  drawSeries(noisy, left, right, height * 0.2, height * 0.1, 0, 0, 70, 1, 'ノイズつき');
  // スペクトル
  let base = height * 0.6, sh = height * 0.2;
  stroke(0, 0, 30);
  line(left, base, right, base);
  stroke(40, 90, 100);
  strokeWeight(1);
  line(left, base - threshold * sh, right, base - threshold * sh);
  noStroke();
  for (let k = 0; k < N / 2; k++) {
    let x = map(k, 0, N / 2, left, right);
    fill(keep[k] ? 120 : 0, keep[k] ? 70 : 0, keep[k] ? 100 : 50);
    rect(x, base - mag[k] * sh, (right - left) / (N / 2) - 1, mag[k] * sh);
  }
  fill(40, 90, 100);
  textSize(14);
  text('しきい値 ' + nf(threshold, 1, 2) + '（これより小さい成分を消す）', left, base - threshold * sh - 8);
  fill(0, 0, 60);
  text('スペクトル（緑 = 残す、灰 = 消す）', left, base - sh - 10);
  drawSeries(restored, left, right, height * 0.85, height * 0.1, 40, 90, 100, 3, '復元した信号');
  drawSeries(clean, left, right, height * 0.85, height * 0.1, 120, 70, 100, 1, '');

  let err = 0;
  for (let i = 0; i < N; i++) err += abs(restored[i] - clean[i]);
  fill(0, 0, 100);
  textSize(18);
  text('しきい値（左右）　ノイズ ' + nf(noiseAmp, 1, 2) + '（上下）　残した成分 ' + keep.filter((k) => k).length + ' 個　本物との誤差 ' + nf(err / N, 1, 3) + '　クリックで作り直す', 20, 40);
}

function dft(x) {
  let re = [], im = [];
  for (let k = 0; k < N; k++) {
    let r = 0, i2 = 0;
    for (let i = 0; i < N; i++) {
      let a = (TWO_PI * k * i) / N;
      r += x[i] * cos(a);
      i2 -= x[i] * sin(a);
    }
    re.push(r);
    im.push(i2);
  }
  return { re, im };
}

// 逆変換：成分から信号を組み立て直す
function idft(re, im) {
  let out = [];
  for (let i = 0; i < N; i++) {
    let v = 0;
    for (let k = 0; k < N; k++) {
      let a = (TWO_PI * k * i) / N;
      v += re[k] * cos(a) - im[k] * sin(a);
    }
    out.push(v / N);
  }
  return out;
}

function drawSeries(arr, left, right, mid, h, hue, sat, bri, w, label) {
  noFill();
  stroke(hue, sat, bri, label ? 100 : 70);
  strokeWeight(w);
  beginShape();
  for (let i = 0; i < arr.length; i++) vertex(map(i, 0, arr.length - 1, left, right), mid - arr[i] * h);
  endShape();
  if (label) {
    noStroke();
    fill(hue, sat, bri);
    textSize(14);
    text(label, left, mid - h - 10);
  }
}

function mousePressed() {
  seed = floor(random(10000));
  makeSignal();
}

// ---------- やってみよう ----------
// 1. しきい値を上げていくと、ノイズが消えて 2 本の山だけ残る。上げすぎると信号も消える
// 2. ノイズを最大にしても復元できる？（山がノイズに埋もれる限界）
// 3. 「しきい値」ではなく「周波数 30 以上を消す」にすると（ローパス）、どう変わる？
