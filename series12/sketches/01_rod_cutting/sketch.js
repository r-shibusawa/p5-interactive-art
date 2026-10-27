// ============================================
// 01 ロッドカット：棒をどう切れば一番高く売れる？
// 長さ i の棒は price[i] 円。長さ n の棒を切り分けて売るときの最大収入 r[n] を求める
// r[j] = max( price[i] + r[j-i] )　─ 「最初に切る長さ i」を全部ためす。短い棒の答えは表にある
// スペース = 再生・停止 / → = 1 手すすむ / ↑↓ = 棒の長さ n / 値段の箱をクリック = +1 円（Shift で -1） / P = 値段をランダム / R = 最初から
// ============================================

let price = [0, 2, 5, 9, 10, 13, 17, 18, 21, 24, 27];  // ★ 値段表（price[0] は使わない）。長さ 8 なら 2 + 3 + 3 で 23 円
let n = 8;                                             // ★ 棒の長さ
let framesPerMove = 14;                                // ★ 1 手の間のフレーム数（小さいほど速い）

let r = [], s = [], j = 1, i = 1, best = -1, bestI = 0, playing = true, done = false, timer = 0;

const BG = '#16111c', PANEL = '#231a2b', FG = '#f3eaf0', MUTED = '#9a8aa3';
const RASP = '#ff6b8b', CYAN = '#5ee6e0', AMBER = '#ffc857', LIME = '#a3e635';

function setup() {
  createCanvas(windowWidth, windowHeight);
  restart();
}

function restart() {
  r = [0]; s = [0]; j = 1; i = 1; best = -1; bestI = 0; done = false;
}

function advance() {
  if (done) return;
  let cand = price[i] + r[j - i];
  if (cand > best) { best = cand; bestI = i; }
  i++;
  if (i > j) {
    r[j] = best; s[j] = bestI;
    j++; i = 1; best = -1; bestI = 0;
    if (j > n) done = true;
  }
}

function draw() {
  background(BG);
  if (playing && !done && ++timer >= framesPerMove) { timer = 0; advance(); }

  noStroke(); fill(FG); textAlign(LEFT, TOP); textSize(26);
  text(`ロッドカット：長さ ${n} の棒の最大収入`, 32, 24);
  fill(MUTED); textSize(15);
  text('スペース 再生・停止　→ 1 手　↑↓ 長さ　値段をクリックで +1（Shift で -1）　P ランダム　R 最初から', 32, 60);

  // 値段表
  let cw = min(72, (width - 64) / 11);
  let y0 = 100;
  textSize(13); fill(MUTED); textAlign(LEFT, CENTER); text('長さ i', 32, y0 + 14); text('値段 price[i]', 32, y0 + 44);
  for (let k = 1; k <= 10; k++) {
    let x = 140 + (k - 1) * cw;
    fill(k <= n ? PANEL : '#1c1622'); rect(x, y0 + 30, cw - 6, 30, 6);
    fill(MUTED); textAlign(CENTER, CENTER); text(k, x + cw / 2 - 3, y0 + 14);
    fill(k <= n ? AMBER : MUTED); textSize(15); text(price[k], x + cw / 2 - 3, y0 + 45); textSize(13);
  }

  // r[] の表
  let ty = 200;
  fill(MUTED); textAlign(LEFT, CENTER); text('最大収入 r[j]', 32, ty + 22); text('最初に切る s[j]', 32, ty + 56);
  for (let k = 0; k <= n; k++) {
    let x = 140 + k * cw;
    let cur = !done && k === j;
    let used = !done && k === j - i && i <= j;
    stroke(cur ? AMBER : used ? CYAN : '#3a2f44'); strokeWeight(cur || used ? 3 : 1);
    fill(k < r.length ? PANEL : BG); rect(x, ty + 6, cw - 6, 32, 6);
    noStroke(); fill(MUTED); textAlign(CENTER, BOTTOM); text(k, x + cw / 2 - 3, ty + 4);
    if (k < r.length) {
      fill(FG); textAlign(CENTER, CENTER); textSize(15); text(r[k], x + cw / 2 - 3, ty + 22); textSize(13);
      fill(LIME); text(k > 0 ? s[k] : '-', x + cw / 2 - 3, ty + 56);
    }
  }

  // いま計算中の候補
  let cy = 300;
  if (!done) {
    fill(FG); textSize(18); textAlign(LEFT, TOP);
    text(`r[${j}] を計算中：最初に長さ i を切ったら price[i] + r[${j} - i]`, 32, cy);
    let sc = (width * 0.45) / max(1, maxPossible());
    for (let k = 1; k <= j; k++) {
      let y = cy + 36 + (k - 1) * 26;
      let val = k < i ? price[k] + r[j - k] : null;
      fill(MUTED); textSize(13); textAlign(RIGHT, CENTER); text(`i = ${k}`, 90, y + 10);
      if (val !== null || k === i) {
        let v = price[k] + r[j - k];
        fill(k === i ? AMBER : k === bestI ? LIME : '#5a4a66');
        rect(100, y, price[k] * sc, 20, 4);
        fill(k === i ? '#d9a63b' : k === bestI ? '#7fb52a' : '#3f3349');
        rect(100 + price[k] * sc, y, r[j - k] * sc, 20, 4);
        fill(FG); textAlign(LEFT, CENTER);
        text(`${price[k]} + ${r[j - k]} = ${v}${k === bestI ? '  ← いまの最大' : ''}`, 110 + v * sc, y + 10);
      }
    }
  } else {
    drawRod(cy);
  }

  drawCallChart();
}

function maxPossible() { return max(...r, 1) + max(...price.slice(1, n + 1)); }

function drawRod(cy) {
  // 切り方の復元：s[n] を切り、残りの s[...] を繰り返す
  let pieces = [], rest = n;
  while (rest > 0) { pieces.push(s[rest]); rest -= s[rest]; }
  fill(FG); textSize(20); textAlign(LEFT, TOP);
  text(`答え：r[${n}] = ${r[n]} 円　切り方 = ${pieces.join(' + ')}`, 32, cy);
  let unit = min(70, (width * 0.6) / n), x = 40, y = cy + 60;
  for (let k = 0; k < pieces.length; k++) {
    let w = pieces[k] * unit;
    fill(k % 2 ? CYAN : RASP); rect(x, y, w - 4, 46, 8);
    fill(BG); textAlign(CENTER, CENTER); textSize(16); text(`${pieces[k]}（${price[pieces[k]]}円）`, x + w / 2 - 2, y + 23);
    x += w;
  }
  fill(MUTED); textSize(14); textAlign(LEFT, TOP);
  text('s[n] に「最初に切る長さ」を記録しておくと、表をたどるだけで切り方がわかる', 40, y + 64);
}

function drawCallChart() {
  // 素朴な再帰は 2^n 回呼ばれる。DP は j の数 × i の数 ≒ n²/2 回の計算
  let w = 300, h = 200, x0 = width - w - 32, y0 = height - h - 40;
  noStroke(); fill(PANEL); rect(x0 - 16, y0 - 44, w + 32, h + 72, 12);
  fill(FG); textSize(14); textAlign(LEFT, TOP); text('計算の回数（縦軸は対数）', x0, y0 - 32);
  let ymax = log(pow(2, 10)) ;
  stroke('#3a2f44'); line(x0, y0 + h, x0 + w, y0 + h);
  for (let which of [0, 1]) {
    noFill(); stroke(which ? CYAN : RASP); strokeWeight(2.5); beginShape();
    for (let k = 1; k <= 10; k++) {
      let c = which ? k * (k + 1) / 2 : pow(2, k);
      vertex(x0 + (k - 1) * w / 9, y0 + h - log(c) / ymax * h);
    }
    endShape();
  }
  noStroke(); fill(RASP); textSize(13); text(`素朴な再帰 2^${n} = ${pow(2, n)}`, x0, y0 + h + 8);
  fill(CYAN); text(`DP  ${n * (n + 1) / 2}`, x0 + 190, y0 + h + 8);
  stroke(AMBER); strokeWeight(1); let xx = x0 + (n - 1) * w / 9; line(xx, y0, xx, y0 + h);
}

function keyPressed() {
  if (key === ' ') playing = !playing;
  if (key === RIGHT_ARROW) advance();
  if (key === UP_ARROW) { n = min(10, n + 1); restart(); }
  if (key === DOWN_ARROW) { n = max(1, n - 1); restart(); }
  if (key === 'p' || key === 'P') { for (let k = 1; k <= 10; k++) price[k] = price[k - 1] + floor(random(0, 7)); restart(); }
  if (key === 'r' || key === 'R') { restart(); playing = true; }
}

function mousePressed() {
  let cw = min(72, (width - 64) / 11);
  for (let k = 1; k <= 10; k++) {
    let x = 140 + (k - 1) * cw;
    if (mouseX > x && mouseX < x + cw - 6 && mouseY > 130 && mouseY < 160) {
      price[k] = max(0, price[k] + (keyIsDown(SHIFT) ? -1 : 1));
      restart();
    }
  }
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }
