// ============================================
// 06 エピサイクル（フーリエ変換でお絵かき）
// マウスで描いた線を、フーリエ変換で「回転する円の組み合わせ」に分解する
// 円を何個も重ねて回すと、元の絵がそっくり描き直される
// ドラッグで描く → 離すと再生 / マウス左右（再生中）= 使う円の数 / C で消す
// ============================================

let drawing = []; // 描いた点
let fourier = []; // 分解結果
let time = 0;
let path = []; // 再生で描いた点
let state = 'draw';
let numCircles = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(220, 40, 10);

  if (state === 'draw') {
    stroke(170, 80, 100);
    strokeWeight(3);
    noFill();
    beginShape();
    for (let p of drawing) vertex(p.x, p.y);
    endShape();
    noStroke();
    fill(0, 0, 100);
    textSize(18);
    text('ドラッグで何か描いてみよう（一筆書き）→ 離すと、円の組み合わせで描き直す', 20, 40);
    return;
  }

  numCircles = floor(map(mouseX, 0, width, 1, fourier.length, true));

  // ---- 円を重ねて、先端の位置を求める ----
  let x = width / 2, y = height / 2;
  for (let i = 0; i < numCircles; i++) {
    let f = fourier[i];
    let px = x, py = y;
    x += f.amp * cos(f.freq * time + f.phase);
    y += f.amp * sin(f.freq * time + f.phase);
    // 円と腕
    stroke(0, 0, 100, 25);
    strokeWeight(1);
    noFill();
    circle(px, py, f.amp * 2);
    stroke(0, 0, 100, 60);
    line(px, py, x, y);
  }
  path.unshift({ x, y });
  if (path.length > drawing.length) path.pop();

  // 描いた軌跡
  stroke(40, 90, 100);
  strokeWeight(3);
  noFill();
  beginShape();
  for (let p of path) vertex(p.x, p.y);
  endShape();

  // 元の絵（うすく）
  stroke(170, 60, 100, 25);
  strokeWeight(2);
  beginShape();
  for (let p of drawing) vertex(p.x, p.y);
  endShape();

  time += TWO_PI / drawing.length;
  if (time > TWO_PI) {
    time = 0;
    path = [];
  }

  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text('円 ' + numCircles + ' 個 / ' + fourier.length + '（マウス左右で増減）　C で描き直す', 20, 40);
}

// ★ 2次元の DFT：x を実部、y を虚部とみなして分解する
function dft2D(pts) {
  let N = pts.length;
  let out = [];
  for (let k = 0; k < N; k++) {
    let re = 0, im = 0;
    for (let n = 0; n < N; n++) {
      let phi = (TWO_PI * k * n) / N;
      re += pts[n].x * cos(phi) + pts[n].y * sin(phi);
      im += -pts[n].x * sin(phi) + pts[n].y * cos(phi);
    }
    re /= N;
    im /= N;
    out.push({ re, im, freq: k, amp: sqrt(re * re + im * im), phase: atan2(im, re) });
  }
  return out;
}

function mousePressed() {
  if (state === 'playing') return;
  drawing = [];
}
function mouseDragged() {
  if (state === 'draw') drawing.push({ x: mouseX - width / 2, y: mouseY - height / 2 });
}
function mouseReleased() {
  if (state === 'draw' && drawing.length > 10) {
    // 点の数を減らして計算を軽くする（最大 300 点）
    let stepN = max(1, floor(drawing.length / 300));
    let pts = drawing.filter((_, i) => i % stepN === 0);
    // 画面座標に戻す
    drawing = pts.map((p) => ({ x: p.x + width / 2, y: p.y + height / 2 }));
    fourier = dft2D(pts);
    // 負の周波数を正しく扱う（k > N/2 は負の周波数）
    for (let f of fourier) if (f.freq > pts.length / 2) f.freq -= pts.length;
    fourier.sort((a, b) => b.amp - a.amp); // 大きい円から順に
    time = 0;
    path = [];
    state = 'playing';
  }
}
function keyPressed() {
  if (key === 'c' || key === 'C') {
    state = 'draw';
    drawing = [];
    path = [];
  }
}

// ---------- やってみよう ----------
// 1. 円 1 個、2 個、5 個、全部、と増やして、絵がだんだん正確になるのを見よう
// 2. 大きい円 = 低い周波数（おおまかな形）、小さい円 = 高い周波数（細かいギザギザ）
// 3. 星や文字を描いてみよう。角のある絵ほど円がたくさん必要
