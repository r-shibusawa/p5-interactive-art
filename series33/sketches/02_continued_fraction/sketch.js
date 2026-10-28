// ============================================
// 02 連分数 ─ φn = [n; n, n, n, …]
// 数 x を「整数部分 + 1/(残り)」とくり返し分解する。貴金属比はずっと同じ数 n が並ぶ
// 途中で打ち切った分数（近似分数 p/q）がどれだけ速く x に近づくか、誤差を対数グラフで比べる
// ←→ = n / 1〜4 = 主役の数（1 φn・2 √2・3 π・4 e）/ スペース = 一時停止 / R = 最初から
// ============================================

let n = 1;               // ★ 貴金属比の n
let terms = 14;          // ★ 何項まで計算するか
let who = 1;             // 主役（1〜4）
let shownK = 0;          // アニメーションで見えている項の数
let paused = false;
let timer = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

// 比べる数たち
function numbers() {
  return [
    { name: 'φ' + n, v: metallic(n), hue: 45 },
    { name: '√2', v: Math.SQRT2, hue: 200 },
    { name: 'π', v: Math.PI, hue: 330 },
    { name: 'e', v: Math.E, hue: 120 },
  ];
}

function draw() {
  background(220, 30, 10);
  if (!paused) {
    timer++;
    if (timer > 45) { timer = 0; shownK = shownK >= terms ? 1 : shownK + 1; }
  }
  let nums = numbers();
  let main = nums[who - 1];
  let cf = contFrac(main.v, terms);
  let cv = convergents(cf);

  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text('主役：' + main.name + ' = ' + nf(main.v, 1, 10) + '（1〜4）　n = ' + n + '（←→）　スペース：停止　R：最初から', 20, 40);
  fill(0, 0, 65);
  textSize(15);
  text('x = a0 + 1/(a1 + 1/(a2 + …))。貴金属比 φn は a がずっと n。π は 292 のような大きな数が出る = 急に近づく', 20, 68);

  // 連分数の並び [a0; a1, a2, ...]
  textSize(26);
  fill(main.hue, 60, 100);
  let s = '[' + cf[0] + ';';
  for (let i = 1; i < min(shownK, cf.length); i++) s += ' ' + cf[i] + (i < shownK - 1 ? ',' : '');
  text(s + ' … ]', 20, 120);

  // 入れ子の分数（はじめの 4 段）
  drawNested(cf, 40, 170, main.hue);

  // 近似分数の表
  let tx = 40, ty = 340;
  textSize(15);
  fill(0, 0, 100);
  text('k　　近似分数 p/q　　　値　　　　　　誤差 |x − p/q|', tx, ty);
  for (let k = 0; k < min(shownK, cv.length, 12); k++) {
    let err = abs(main.v - cv[k].p / cv[k].q);
    fill(k === shownK - 1 ? color(55, 80, 100) : color(0, 0, 75));
    text(k + '　　' + cv[k].p + ' / ' + cv[k].q, tx, ty + 24 + k * 22);
    text(nf(cv[k].p / cv[k].q, 1, 8), tx + 200, ty + 24 + k * 22);
    text(err < 1e-15 ? '< 1e-15' : err.toExponential(2), tx + 340, ty + 24 + k * 22);
  }

  // 数直線のズーム：近似分数が左右交互に近づく
  drawNumberLine(main, cv, width * 0.5, 130, width * 0.46, 150);

  // 誤差の対数グラフ（4 つの数を重ねる）
  drawErrorPlot(nums, width * 0.5, 330, width * 0.46, height - 400);
}

// a0 + 1/(a1 + 1/(a2 + …)) を階段状に描く
function drawNested(cf, x, y, hue) {
  textSize(20);
  for (let i = 0; i < 4 && i < cf.length; i++) {
    let on = i < shownK;
    fill(on ? color(hue, 60, 100) : color(0, 0, 40));
    let xx = x + i * 70, yy = y + i * 34;
    text(cf[i] + (i < 3 ? '  +' : ' + …'), xx, yy);
    if (i < 3) {
      stroke(0, 0, on ? 80 : 30);
      line(xx + 60, yy + 8, xx + 260 - i * 30, yy + 8);
      noStroke();
      fill(0, 0, on ? 90 : 40);
      text('1', xx + 90, yy - 2);
    }
  }
}

function drawNumberLine(main, cv, x, y, w, h) {
  noFill();
  stroke(0, 0, 100, 15);
  rect(x, y, w, h, 6);
  let k = max(0, min(shownK, cv.length) - 1);
  // 表示する幅：最新の誤差の 4 倍くらいまで寄る
  let err = abs(main.v - cv[k].p / cv[k].q);
  let span = max(err * 4, 1e-12);
  let toX = v => x + w / 2 + ((v - main.v) / span) * (w * 0.45);
  stroke(0, 0, 100, 60);
  line(x + 10, y + h / 2, x + w - 10, y + h / 2);
  stroke(main.hue, 70, 100);
  strokeWeight(3);
  line(toX(main.v), y + 20, toX(main.v), y + h - 20);
  strokeWeight(1);
  for (let i = 0; i <= k; i++) {
    let px = toX(cv[i].p / cv[i].q);
    if (px < x || px > x + w) continue;
    noStroke();
    fill(i === k ? color(55, 90, 100) : color(0, 0, 70, 60));
    circle(px, y + h / 2, i === k ? 14 : 8);
    if (i === k) { textSize(14); text(cv[i].p + '/' + cv[i].q, px - 20, y + h / 2 - 16); }
  }
  noStroke();
  fill(0, 0, 70);
  textSize(13);
  text('数直線ズーム（幅 ±' + span.toExponential(1) + '）', x + 10, y + h - 8);
}

function drawErrorPlot(nums, x, y, w, h) {
  noFill();
  stroke(0, 0, 100, 15);
  rect(x, y, w, h, 6);
  let yOf = e => y + h - 20 - map(constrain(log10(max(e, 1e-16)), -16, 0), -16, 0, 0, h - 40);
  // 目盛り
  for (let d = 0; d >= -16; d -= 4) {
    stroke(0, 0, 100, 10);
    line(x, yOf(pow(10, d)), x + w, yOf(pow(10, d)));
    noStroke();
    fill(0, 0, 60);
    textSize(12);
    text('1e' + d, x + 4, yOf(pow(10, d)) - 3);
  }
  for (let j = 0; j < nums.length; j++) {
    let cv = convergents(contFrac(nums[j].v, terms));
    stroke(nums[j].hue, 70, 100, j === who - 1 ? 100 : 45);
    strokeWeight(j === who - 1 ? 3 : 1.5);
    noFill();
    beginShape();
    for (let k = 0; k < min(shownK, cv.length); k++) {
      vertex(x + 50 + k * (w - 70) / terms, yOf(abs(nums[j].v - cv[k].p / cv[k].q)));
    }
    if (min(shownK, cv.length) === 0) vertex(x + 50, yOf(1));
    endShape();
    noStroke();
    fill(nums[j].hue, 70, 100);
    textSize(14);
    text(nums[j].name, x + w - 60, y + 24 + j * 20);
  }
  fill(0, 0, 70);
  textSize(13);
  text('誤差の対数グラフ（横 = 項の数 k）。φ1 がいちばんゆっくり下がる', x + 50, y + h - 4);
}

function keyPressed() {
  if (key >= '1' && key <= '4') { who = int(key); shownK = 0; }
  if (key === RIGHT_ARROW) { n = min(n + 1, 9); shownK = 0; }
  if (key === LEFT_ARROW) { n = max(n - 1, 1); shownK = 0; }
  if (key === ' ') paused = !paused;
  if (key === 'r' || key === 'R') { shownK = 0; timer = 0; }
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. π の近似分数 22/7 と 355/113 を表で見つけよう。355/113 のあとの項 292 が大きいのが理由
// 2. n を大きくすると誤差の下がり方はどうなる？ 1 項ごとにおよそ 1/φn² 倍ずつ
// 3. numbers() に √3 や (1+√5)/2 以外の好きな数を足して連分数を見てみよう（√3 = [1; 1, 2, 1, 2, …]）
// 4. terms を 30 にすると途中から数字が崩れる。コンピュータの小数（倍精度）の限界を体験しよう

// ---------- 道具 ----------
function metallic(k) { return (k + Math.sqrt(k * k + 4)) / 2; }
// 連分数の係数 [a0, a1, ...]
function contFrac(x, m) {
  let a = [];
  for (let i = 0; i < m; i++) {
    let f = Math.floor(x);
    a.push(f);
    let rest = x - f;
    if (rest < 1e-12) break;
    x = 1 / rest;
  }
  return a;
}
// 近似分数 p_k / q_k（漸化式 p_k = a_k p_{k-1} + p_{k-2}）
function convergents(a) {
  let out = [], p0 = 1, q0 = 0, p1 = a[0], q1 = 1;
  out.push({ p: p1, q: q1 });
  for (let i = 1; i < a.length; i++) {
    let p2 = a[i] * p1 + p0, q2 = a[i] * q1 + q0;
    out.push({ p: p2, q: q2 });
    p0 = p1; q0 = q1; p1 = p2; q1 = q2;
  }
  return out;
}
function log10(v) { return Math.log(v) / Math.LN10; }
