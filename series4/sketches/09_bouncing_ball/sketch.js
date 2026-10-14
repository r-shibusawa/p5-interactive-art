// ============================================
// 09 ゆれる台の上のボール
// 上下にゆれる台の上で跳ねるボール。台のゆれが小さいと規則的に跳ねるが、
// 大きくすると「周期倍分岐」を経てカオスになる（00 の分岐と同じ道筋）
// マウス左右 = 台のゆれの大きさ / クリックでボールをリセット
// ============================================

let balls = [];
let amp = 10; // 台のゆれの大きさ
let freq = 0.08; // 台のゆれの速さ
let t = 0;
let history = []; // 跳ねた瞬間の速さの記録（右のグラフ用）

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  reset();
}

function reset() {
  balls = [];
  for (let i = 0; i < 3; i++) balls.push({ x: width * 0.2 + i * 60, y: height * 0.3, vy: 0, hue: i * 60 + 160, prevY: 0 });
  history = [];
}

function draw() {
  background(230, 40, 10);
  amp = map(mouseX, 0, width, 0, 40, true);
  t += 1;

  // 台の位置と速さ
  let tableY = height * 0.7 + sin(t * freq) * amp;
  let tableVy = cos(t * freq) * amp * freq;

  for (let b of balls) {
    b.vy += 0.5; // 重力
    b.y += b.vy;
    // 台に当たったら跳ね返る（台の速さぶん、押し上げられる）
    if (b.y > tableY - 15 && b.vy > tableVy) {
      b.y = tableY - 15;
      b.vy = -0.9 * (b.vy - tableVy) + tableVy; // 0.9 = 跳ね返りの強さ
      history.push({ v: -b.vy, hue: b.hue });
      if (history.length > 400) history.shift();
    }
    noStroke();
    fill(b.hue, 60, 100);
    circle(b.x, b.y, 30);
  }

  // 台
  fill(0, 0, 80);
  rect(width * 0.08, tableY, width * 0.42, 14);

  // 右側：跳ねた瞬間の速さの記録（横軸 = 回数）
  let gx = width * 0.56, gw = width * 0.4, gTop = 100, gBot = height - 80;
  stroke(0, 0, 40);
  line(gx, gBot, gx + gw, gBot);
  line(gx, gTop, gx, gBot);
  noStroke();
  for (let i = 0; i < history.length; i++) {
    fill(history[i].hue, 60, 100);
    circle(gx + (i / 400) * gw, map(history[i].v, 0, 40, gBot, gTop), 4);
  }

  fill(0, 0, 100);
  textSize(18);
  text('台のゆれ ' + nf(amp, 1, 1) + '（マウス左右）　クリックでボールをリセット', 20, 40);
  fill(0, 0, 70);
  textSize(14);
  text('右：跳ねた瞬間の速さ。1本の線 → 周期1、2本 → 周期2、散らばる → カオス', gx, 80);
}

function mousePressed() {
  reset();
}

// ---------- やってみよう ----------
// 1. ゆれ 0 → 規則的（右のグラフが1本の線）。ゆっくり増やして、2本・4本・散らばる、を探そう
// 2. 3つのボールは最初ほぼ同じ場所。カオスのときはすぐ別々の動きになる
// 3. 跳ね返り 0.9 を 0.5 にすると？（カオスになりにくい）
