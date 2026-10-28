// ============================================
// 12 ドラゴン曲線
// 細長い紙を同じ向きに n 回半分に折り、広げて、すべての折り目を 90° にすると「ドラゴン曲線」になる
//   折り目の向き（右・左）の並びは「紙折り数列」：1 1 0 1 1 0 0 1 1 1 0 0 1 0 0 …
// ←→ = 折る回数 n / スペース = 折りたたんだ状態から広げるアニメーション / 4 = 4 匹で平面を埋める / C = 色
// ============================================

let n = 10;                // ★ 折る回数（1〜16）
let foldAng = 90;            // 折り目の角度（180 = たたんだまま、90 = ドラゴン）
let playing = false, playT = 0;
let four = false;
let hueMode = 0;
let pg, dirty = true;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pg = createGraphics(width, height);
}

// ★ 紙折り数列：k = 2^m × 奇数 o と書いたとき、o を 4 で割った余りが 1 なら 1（右）、3 なら 0（左）
function turnAt(k) {
  while (k % 2 === 0) k /= 2;
  return k % 4 === 1 ? 1 : 0;
}

// 折り目ごとに ±foldAng 曲がりながら進んだ点の列
function curvePoints(k, a) {
  let N = 2 ** k, pts = [{ x: 0, y: 0 }], hd = 0, x = 0, y = 0, ar = radians(180 - a);
  for (let i = 1; i <= N; i++) {
    x += Math.cos(hd); y += Math.sin(hd);
    pts.push({ x, y });
    if (i < N) hd += turnAt(i) ? ar : -ar;
  }
  return pts;
}

function draw() {
  background(24, 22, 30);
  if (playing) {
    playT += 1 / 180;
    foldAng = lerp(180, 90, easeInOut(min(1, playT)));
    dirty = true;
    if (playT >= 1) playing = false;
  }
  if (dirty) { renderCurve(); dirty = false; }
  image(pg, 0, 0);

  // 紙折り数列（最初の 63 個）
  let seq = '';
  for (let k = 1; k < min(64, 2 ** n); k++) seq += turnAt(k) + (k % 8 === 7 ? '  ' : ' ');
  noStroke(); fill(255); textSize(18);
  text('←→：n = ' + n + '（線分 ' + (2 ** n).toLocaleString() + ' 本）　スペース：広げるアニメーション　4：4 匹 ' + (four ? 'ON' : 'off') + '　C：色', 20, 40);
  fill(170); textSize(15);
  text('折り目の角度 ' + nf(foldAng, 1, 0) + '°（180° = たたんだまま、90° = ドラゴン曲線）。曲線は自分自身と決して交差しない', 20, 68);
  fill(255, 190, 40); textSize(15);
  text('紙折り数列（1 = 右、0 = 左）：' + seq, 20, height - 70, width - 40);
  drawStrip();
}

// 細長い紙と折り目（n ≤ 7 のとき）
function drawStrip() {
  let k = min(n, 7), N = 2 ** k, x0 = 20, y0 = height - 36, w = width - 40;
  noStroke(); fill(246, 240, 226); rect(x0, y0, w, 18);
  strokeWeight(2);
  for (let i = 1; i < N; i++) {
    let x = x0 + w * i / N;
    stroke(turnAt(i) ? color(60, 110, 230) : color(220, 70, 50));
    line(x, y0, x, y0 + 18);
  }
  noStroke(); fill(160); textSize(12);
  text('広げた紙の折り目（青 = 谷 = 1、赤 = 山 = 0）' + (n > 7 ? '　※ n = 7 までを表示' : ''), x0, y0 - 4);
}

function renderCurve() {
  pg.clear();
  let pts = curvePoints(n, foldAng);
  // 4 匹のときは原点のまわりに 90° ずつ回す
  let copies = four ? 4 : 1;
  let all = [];
  for (let c = 0; c < copies; c++) {
    let ca = Math.cos(c * HALF_PI), sa = Math.sin(c * HALF_PI);
    all.push(pts.map((p) => ({ x: p.x * ca - p.y * sa, y: p.x * sa + p.y * ca })));
  }
  // 画面に収まるように拡大・移動
  let xs = [], ys = [];
  for (let arr of all) for (let i = 0; i < arr.length; i += max(1, floor(arr.length / 2000))) { xs.push(arr[i].x); ys.push(arr[i].y); }
  for (let arr of all) { xs.push(arr[arr.length - 1].x); ys.push(arr[arr.length - 1].y); }
  let minX = min(xs), maxX = max(xs), minY = min(ys), maxY = max(ys);
  let s = min((width - 80) / max(1, maxX - minX), (height - 220) / max(1, maxY - minY));
  let ox = width / 2 - (minX + maxX) / 2 * s, oy = 100 + (height - 220) / 2 - (minY + maxY) / 2 * s;
  pg.colorMode(HSB, 360, 100, 100, 100);
  pg.noFill();
  pg.strokeWeight(constrain(s * 0.35, 1, 4));
  pg.strokeJoin(ROUND);
  let groups = 64;
  all.forEach((arr, c) => {
    let per = Math.ceil((arr.length - 1) / groups);
    for (let g = 0; g < groups; g++) {
      let a = g * per, b = min(arr.length - 1, (g + 1) * per);
      if (a >= b) break;
      let hue = hueMode === 0 ? (c * 90 + g / groups * 80 + 10) % 360 : (g / groups * 360);
      pg.stroke(hue, hueMode === 0 ? 70 : 80, 100);
      pg.beginShape();
      for (let i = a; i <= b; i++) pg.vertex(ox + arr[i].x * s, oy + arr[i].y * s);
      pg.endShape();
    }
  });
}

function easeInOut(x) { return x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2; }

function keyPressed() {
  if (key === RIGHT_ARROW) { n = min(16, n + 1); dirty = true; }
  if (key === LEFT_ARROW) { n = max(1, n - 1); dirty = true; }
  if (key === ' ') { playing = true; playT = 0; if (n > 13) n = 13; }
  if (key === '4') { four = !four; dirty = true; }
  if (key === 'c' || key === 'C') { hueMode = 1 - hueMode; dirty = true; }
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); pg = createGraphics(width, height); dirty = true; }

// ---------- やってみよう ----------
// 1. 細長い紙を 3〜4 回折って広げ、折り目を全部 90° にして立ててみよう。画面と同じ形になる？
// 2. 紙折り数列の「1 つおき」（奇数番目）だけを見ると 1 0 1 0 … のくり返し。偶数番目を見ると？
// 3. foldAng を 90 以外（例：120、60）に固定すると、どんな曲線になる？
// 4. 4 匹のドラゴンは重ならずに平面をすき間なく埋める。n を大きくして確かめよう
