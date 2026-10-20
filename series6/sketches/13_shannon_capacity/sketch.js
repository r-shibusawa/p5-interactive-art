// ============================================
// 13 シャノンの通信路容量（速さの上限）
// 雑音のある通信路で、誤りなく送れる最大の速さには理論的な限界がある：
//   C = B × log₂(1 + S/N)   B = 帯域幅、S/N = 信号と雑音の比
// マウス左右 = S/N（信号の強さ） / 上下 = 帯域幅 / 線の上の点をたどる
// ============================================

let snrDb = 20;
let bandwidth = 1000; // Hz

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function capacity(bw, db) {
  let snr = pow(10, db / 10); // dB → 倍率
  return bw * (log(1 + snr) / log(2));
}

function draw() {
  background(230, 40, 10);
  snrDb = map(mouseX, 0, width, -10, 40, true);
  bandwidth = map(mouseY, 0, height, 4000, 200, true);
  let C = capacity(bandwidth, snrDb);

  // ---- 左：S/N を横軸にした容量の曲線 ----
  let left = 90, right = width * 0.6, base = height * 0.78, top = height * 0.2;
  stroke(0, 0, 30);
  line(left, base, right, base);
  line(left, base, left, top);
  noFill();
  stroke(170, 80, 100);
  strokeWeight(3);
  beginShape();
  for (let db = -10; db <= 40; db += 0.5) vertex(map(db, -10, 40, left, right), map(capacity(bandwidth, db), 0, 55000, base, top));
  endShape();
  noStroke();
  fill(40, 90, 100);
  circle(map(snrDb, -10, 40, left, right), map(C, 0, 55000, base, top), 18);
  fill(0, 0, 60);
  textSize(13);
  for (let db of [-10, 0, 10, 20, 30, 40]) text(db + ' dB', map(db, -10, 40, left, right) - 14, base + 22);
  for (let c of [0, 10000, 20000, 30000, 40000, 50000]) text(c / 1000 + ' kbps', left - 70, map(c, 0, 55000, base, top) + 4);
  text('信号対雑音比 S/N →', (left + right) / 2 - 60, base + 46);

  // ---- 右：いまの値と「電話回線」の例 ----
  let rx = width * 0.66;
  fill(0, 0, 100);
  textSize(22);
  text('C = B × log₂(1 + S/N)', rx, height * 0.25);
  textSize(18);
  text('帯域幅 B = ' + round(bandwidth) + ' Hz（マウス上下）', rx, height * 0.25 + 50);
  text('S/N = ' + nf(snrDb, 1, 1) + ' dB = ' + nf(pow(10, snrDb / 10), 1, 1) + ' 倍（マウス左右）', rx, height * 0.25 + 85);
  fill(45, 90, 100);
  textSize(30);
  text('容量 C = ' + nf(C / 1000, 1, 2) + ' kbps', rx, height * 0.25 + 150);
  fill(0, 0, 60);
  textSize(15);
  text('例：電話線（B ≈ 3000 Hz, S/N ≈ 30 dB）→ 約 30 kbps\n　　昔のモデムが 28.8〜56 kbps だったのはこの限界のせい\n\n信号を 2 倍強くしても、容量は少ししか増えない（log）\n帯域幅を 2 倍にすると、容量も 2 倍（5G が高い周波数を使う理由）', rx, height * 0.25 + 200);

  fill(0, 0, 100);
  textSize(18);
  text('シャノンの定理（1948）：この速さ以下なら、どんなに雑音があっても誤りなく送れる符号が存在する', 20, 40);
}

// ---------- やってみよう ----------
// 1. S/N を 0 dB（信号 = 雑音）にしても、容量はゼロではない！ 1 bit/s/Hz 送れる
// 2. S/N が 10 dB 上がるごとに容量はどれだけ増える？（ほぼ一定量ずつ）
// 3. Wi-Fi は B = 20〜160 MHz。容量はどのくらい？（B を 160000000 にして計算）
