// ============================================
// 01 正方形を取り除く ─ 相似な長方形が残る
// 1 : φn の長方形から正方形を n 枚取ると、残りはまた 1 : φn（向きが 90° 回るだけ）
//   φn − n = 1/φn  ⇔  φn² = n·φn + 1
// ←→ = n（1 黄金・2 白銀・3 青銅…）/ ↑↓ = 深さ / スペース = 自動で 1 段ずつ / F = 比をマウスで自由に / R = 最初から
// ============================================

let n = 1;            // ★ 何枚ずつ正方形を取るか
let maxDepth = 9;     // ★ 何段まで分けるか
let shown = 0;        // いま見えている段数（アニメーション）
let auto = true;
let freeMode = false; // F：比を自由に変える（相似にならない例）
let timer = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(225, 30, 10);
  let r = freeMode ? map(constrain(mouseX, 0, width), 0, width, 1.05, n + 1.95) : metallic(n);

  // 時間とともに 1 段ずつ増やす
  if (auto) {
    timer++;
    if (timer > 40) { timer = 0; shown = shown >= maxDepth ? 0 : shown + 1; }
  }

  // 画面に入る大きさの長方形
  let H = min((height - 220), (width - 460) / r);
  let W = H * r;
  let x0 = 40, y0 = 130;

  // 分割を順にたどる：向き dir は 0 左から 1 上から 2 右から 3 下から
  let x = x0, y = y0, w = W, h = H;
  let ratios = [];
  for (let d = 0; d < maxDepth && w > 0.5 && h > 0.5; d++) {
    let dir = d % 4;
    let s = min(w, h);                  // 正方形の一辺 = 短い辺
    let k = floor(max(w, h) / s + 1e-9); // 何枚取れるか
    if (!freeMode) k = min(k, n);
    let visible = d < shown;
    for (let j = 0; j < k; j++) {
      let sx, sy;
      if (dir === 0) { sx = x + j * s; sy = y; }
      else if (dir === 1) { sx = x; sy = y + j * s; }
      else if (dir === 2) { sx = x + w - (j + 1) * s; sy = y; }
      else { sx = x; sy = y + h - (j + 1) * s; }
      stroke(0, 0, 100, 70);
      strokeWeight(1.5);
      fill((d * 40 + j * 12) % 360, 55, visible ? 85 : 25, visible ? 80 : 30);
      rect(sx, sy, s, s);
    }
    // 残りの長方形
    if (dir === 0) { x += k * s; w -= k * s; }
    else if (dir === 1) { y += k * s; h -= k * s; }
    else if (dir === 2) { w -= k * s; }
    else { h -= k * s; }
    ratios.push({ k, ratio: max(w, h) / max(0.0001, min(w, h)) });
    // 次の段の長辺は向きが変わっているので、dir を 1 つ進めれば渦を巻く
    if (d === shown - 1) {
      noFill();
      stroke(55, 90, 100);
      strokeWeight(3);
      rect(x, y, w, h);
    }
  }
  // 外枠
  noFill();
  stroke(0, 0, 100);
  strokeWeight(2);
  rect(x0, y0, W, H);

  // 文字
  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text('n = ' + n + '（←→）' + nameOf(n) + '　深さ ' + maxDepth + '（↑↓）　スペース：自動 ' + (auto ? 'ON' : 'off') + '　F：自由な比 ' + (freeMode ? 'ON' : 'off') + '　R：最初から', 20, 40);
  fill(0, 0, 65);
  textSize(15);
  text(freeMode ? '自由な比（マウスの左右）：取れるだけ正方形を取る。残りの比は毎回バラバラ → 相似にならない'
                : '1 : φ の長方形から正方形を ' + n + ' 枚取ると、残りの長方形はまた 1 : φ。だから永遠に同じ形がくり返す', 20, 68);

  // 右側：各段の「残りの比」の表
  let px = x0 + W + 40, py = 140;
  fill(0, 0, 100);
  textSize(16);
  text('最初の比　1 : ' + nf(r, 1, 5), px, py);
  textSize(14);
  for (let i = 0; i < ratios.length; i++) {
    let rr = ratios[i];
    fill(i < shown ? color(55, 70, 100) : color(0, 0, 50));
    text('段 ' + (i + 1) + '：正方形 ' + rr.k + ' 枚 → 残り 1 : ' + nf(rr.ratio, 1, 5), px, py + 30 + i * 22);
  }
  if (!freeMode) {
    fill(0, 0, 80);
    textSize(14);
    let v = metallic(n);
    text('φ − ' + n + ' = ' + nf(v - n, 1, 5), px, py + 60 + ratios.length * 22);
    text('1 / φ = ' + nf(1 / v, 1, 5) + '　← 同じ！', px, py + 82 + ratios.length * 22);
    text('φ² = ' + n + '·φ + 1 を φ で割ると φ = ' + n + ' + 1/φ', px, py + 104 + ratios.length * 22);
  }
}

function keyPressed() {
  if (key === RIGHT_ARROW) { n = min(n + 1, 6); shown = 0; }
  if (key === LEFT_ARROW) { n = max(n - 1, 1); shown = 0; }
  if (key === UP_ARROW) maxDepth = min(maxDepth + 1, 16);
  if (key === DOWN_ARROW) maxDepth = max(maxDepth - 1, 1);
  if (key === ' ') auto = !auto;
  if (key === 'f' || key === 'F') freeMode = !freeMode;
  if (key === 'r' || key === 'R') { shown = 0; timer = 0; }
}

function mousePressed() { if (!auto) shown = shown >= maxDepth ? 0 : shown + 1; }

function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. n = 1, 2, 3 で、何段目まで目で見分けられるか数えよう。小さくなる速さは 1/φ 倍ずつ
// 2. F で自由な比にして、マウスを φ の近くでゆっくり動かそう。少しずれると何段目で崩れる？
// 3. A 判の紙 √2 を F で試そう（正方形 1 枚取ると 1 : 2.414 になる → 05 につづく）
// 4. 正方形の色を「段ごと」ではなく「大きさ」で決めるように変えてみよう

// ---------- 道具 ----------
function metallic(k) { return (k + Math.sqrt(k * k + 4)) / 2; }
function nameOf(k) { return k === 1 ? '黄金比' : k === 2 ? '白銀比' : k === 3 ? '青銅比' : k + ' 番目の貴金属比'; }
