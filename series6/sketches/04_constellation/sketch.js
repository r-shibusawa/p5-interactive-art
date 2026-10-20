// ============================================
// 04 コンスタレーション（星座図）と雑音
// 位相と大きさの組み合わせで「1 回に何ビット送るか」を決める
// QPSK = 4 点（2 ビット）、16QAM = 16 点（4 ビット）。点が多いほど速いが、雑音で隣と間違えやすい
// 1 = QPSK / 2 = 16QAM / 3 = 64QAM / マウス左右 = 雑音の強さ
// ============================================

let mode = 1;
let noiseLevel = 0.1;
let received = []; // 受信した点
let errors = 0, total = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

// ★ 星座の点を作る：M 点
function constellation() {
  let pts = [];
  if (mode === 1) {
    for (let a of [45, 135, 225, 315]) pts.push({ x: cos(radians(a)), y: sin(radians(a)) });
  } else {
    let n = mode === 2 ? 4 : 8;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) pts.push({ x: map(i, 0, n - 1, -1, 1), y: map(j, 0, n - 1, -1, 1) });
  }
  return pts;
}

function draw() {
  background(230, 40, 10);
  noiseLevel = map(mouseX, 0, width, 0, 0.5, true);
  let pts = constellation();
  let bitsPerSymbol = round(log(pts.length) / log(2));

  // 毎フレーム 20 個送る：ランダムな点 ＋ 雑音 → いちばん近い点に判定
  for (let k = 0; k < 20; k++) {
    let sent = floor(random(pts.length));
    let rx = pts[sent].x + randomGaussian() * noiseLevel;
    let ry = pts[sent].y + randomGaussian() * noiseLevel;
    // 受信側：いちばん近い星座の点を選ぶ
    let best = 0, bd = Infinity;
    for (let i = 0; i < pts.length; i++) {
      let d = (pts[i].x - rx) ** 2 + (pts[i].y - ry) ** 2;
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    received.push({ x: rx, y: ry, ok: best === sent });
    total++;
    if (best !== sent) errors++;
  }
  if (received.length > 600) received.splice(0, received.length - 600);

  // ---- 描く ----
  let cx = width * 0.4, cy = height * 0.53, s = min(width, height) * 0.3;
  stroke(0, 0, 25);
  line(cx - s * 1.3, cy, cx + s * 1.3, cy);
  line(cx, cy - s * 1.3, cx, cy + s * 1.3);
  noStroke();
  for (let r of received) {
    fill(r.ok ? 170 : 0, 80, 100, 50);
    circle(cx + r.x * s, cy - r.y * s, 6);
  }
  for (let p of pts) {
    fill(45, 90, 100);
    circle(cx + p.x * s, cy - p.y * s, 14);
  }
  fill(0, 0, 60);
  textSize(14);
  text('横：I（cos 成分）', cx + s * 1.3 - 100, cy + 20);
  text('縦：Q（sin 成分）', cx + 8, cy - s * 1.3 + 10);

  // 右：成績
  let rx0 = width * 0.72;
  fill(0, 0, 100);
  textSize(22);
  text(['', 'QPSK', '16QAM', '64QAM'][mode] + '：' + pts.length + ' 点 = ' + bitsPerSymbol + ' ビット／回', rx0, height * 0.3);
  textSize(18);
  text('雑音 ' + nf(noiseLevel, 1, 2) + '（マウス左右）', rx0, height * 0.3 + 40);
  text('誤り ' + errors + ' / ' + total + ' = ' + nf((100 * errors) / max(total, 1), 1, 2) + ' %', rx0, height * 0.3 + 80);
  fill(0, 0, 60);
  textSize(15);
  text('黄 = 送った点（星座）\n水色 = 正しく受信\n赤 = 隣の点と間違えた', rx0, height * 0.3 + 130);

  fill(0, 0, 100);
  textSize(18);
  text('1：QPSK　2：16QAM　3：64QAM　　点が多いほど速い。でも雑音に弱い', 20, 40);
}

function keyPressed() {
  if (key >= '1' && key <= '3') {
    mode = int(key);
    received = [];
    errors = 0;
    total = 0;
  }
}
function mousePressed() {
  received = [];
  errors = 0;
  total = 0;
}

// ---------- やってみよう ----------
// 1. 同じ雑音で QPSK と 64QAM の誤り率を比べよう。Wi-Fi が電波の弱い場所で遅くなる理由
// 2. 雑音 0.5 の QPSK と、雑音 0.1 の 64QAM、どちらが速く正しく送れる？
// 3. 256QAM（16×16）を追加してみよう
