// ============================================
// 07 誤り率くらべ（どの符号が強い？）
// 雑音の強さを変えながら、3 つの方法で何万ビットも送って、誤り率をグラフにする
//   そのまま / 3 回くり返し / ハミング(7,4)
// 自動で雑音を変えながら測定 / クリックでやり直し
// ============================================

let results = []; // {p, raw, rep, ham}
let p = 0.005;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function flip(bit, prob) {
  return random() < prob ? 1 - bit : bit;
}

// 1 回の測定：4000 ビットのデータを各方式で送って誤り率を返す
function measure(prob) {
  let n = 4000, eRaw = 0, eRep = 0, eHam = 0;
  for (let i = 0; i < n; i += 4) {
    let d = [0, 1, 2, 3].map(() => (random() < 0.5 ? 1 : 0));
    // そのまま
    for (let b of d) if (flip(b, prob) !== b) eRaw++;
    // 3 回くり返し
    for (let b of d) {
      let ones = flip(b, prob) + flip(b, prob) + flip(b, prob);
      if ((ones >= 2 ? 1 : 0) !== b) eRep++;
    }
    // ハミング(7,4)
    let [d1, d2, d3, d4] = d;
    let code = [d1 ^ d2 ^ d4, d1 ^ d3 ^ d4, d1, d2 ^ d3 ^ d4, d2, d3, d4].map((b) => flip(b, prob));
    let pos = (code[0] ^ code[2] ^ code[4] ^ code[6]) + 2 * (code[1] ^ code[2] ^ code[5] ^ code[6]) + 4 * (code[3] ^ code[4] ^ code[5] ^ code[6]);
    if (pos > 0) code[pos - 1] = 1 - code[pos - 1];
    let out = [code[2], code[4], code[5], code[6]];
    for (let k = 0; k < 4; k++) if (out[k] !== d[k]) eHam++;
  }
  return { p: prob, raw: eRaw / n, rep: eRep / n, ham: eHam / n };
}

function draw() {
  background(230, 40, 10);
  // 自動で p を増やしながら測る
  if (p <= 0.5) {
    results.push(measure(p));
    p *= 1.15;
  }

  let left = 100, right = width - 80, base = height - 100, top = 110;
  // 軸（両対数）
  stroke(0, 0, 30);
  line(left, base, right, base);
  line(left, base, left, top);
  noStroke();
  fill(0, 0, 60);
  textSize(13);
  for (let e of [-3, -2, -1, 0]) {
    let y = map(e, -4, 0, base, top);
    stroke(0, 0, 22);
    line(left, y, right, y);
    noStroke();
    text('10^' + e, left - 45, y + 4);
  }
  for (let e of [-2, -1, 0]) {
    let x = map(e, log(0.005) / log(10), log(0.5) / log(10), left, right);
    text('p=10^' + e, x - 20, base + 22);
  }
  text('雑音（ビット反転確率）→', right - 180, base + 44);
  text('復号後の誤り率', left, top - 14);

  let series = [['raw', 0, 'そのまま'], ['rep', 40, '3 回くり返し（速さ 1/3）'], ['ham', 120, 'ハミング(7,4)（速さ 4/7）']];
  for (let [key, hue, label] of series) {
    noFill();
    stroke(hue, hue ? 80 : 0, hue ? 100 : 80);
    strokeWeight(3);
    beginShape();
    for (let r of results) {
      let v = max(r[key], 0.0001);
      vertex(map(log(r.p) / log(10), log(0.005) / log(10), log(0.5) / log(10), left, right), map(log(v) / log(10), -4, 0, base, top));
    }
    endShape();
  }
  noStroke();
  for (let i = 0; i < series.length; i++) {
    let [key, hue, label] = series[i];
    fill(hue, hue ? 80 : 0, hue ? 100 : 80);
    rect(width - 420, top + 10 + i * 30, 30, 12);
    textSize(15);
    text(label, width - 380, top + 22 + i * 30);
  }

  fill(0, 0, 100);
  textSize(18);
  text('雑音を少しずつ強くして測定中… 測定 ' + results.length + ' 回　クリックでやり直し', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('両対数グラフ。雑音が小さいとき、ハミングは「そのまま」より 100 倍近く誤りが少ない。雑音が大きいとどれも同じ', 20, 68);
}

function mousePressed() {
  results = [];
  p = 0.005;
}

// ---------- やってみよう ----------
// 1. p が小さいとき、くり返し符号の誤り率は p の何乗で減る？（傾きを読む）
// 2. 3 回くり返しとハミングはどちらが強い？ 速さも考えると？
// 3. 7 回くり返しを追加してみよう
