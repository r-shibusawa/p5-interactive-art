// ============================================
// 02 行列の連鎖積：かっこの付け方で計算量が何十倍も変わる
// A1 A2 … An を掛けるとき、どこから掛けるか（かっこの付け方）で掛け算の回数が変わる
// m[i][j] = min over k ( m[i][k] + m[k+1][j] + p[i-1]·p[k]·p[j] )　短い連鎖から順に表を埋める
// スペース = 再生・停止 / → = 1 手 / 1〜3 = お手本 / R = ランダムな行列 / ↑↓ = 速さ
// ============================================

let p = [50, 5, 40, 10, 30, 2, 25];    // ★ A1 は 50×5、A2 は 5×40 …（p[i-1]×p[i]）。最適 4,800 回、左から順だと 50,500 回
let framesPerMove = 10;                 // ★ 1 手の間のフレーム数

let n, m, s, L, I, K, best, playing = true, done = false, timer = 0;

const BG = '#16111c', PANEL = '#231a2b', FG = '#f3eaf0', MUTED = '#9a8aa3';
const RASP = '#ff6b8b', CYAN = '#5ee6e0', AMBER = '#ffc857', LIME = '#a3e635';

function setup() {
  createCanvas(windowWidth, windowHeight);
  restart();
}

function restart() {
  n = p.length - 1;
  m = []; s = [];
  for (let a = 0; a <= n + 1; a++) { m.push(new Array(n + 2).fill(null)); s.push(new Array(n + 2).fill(null)); }
  for (let a = 1; a <= n; a++) m[a][a] = 0;
  L = 2; I = 1; K = 1; best = Infinity; done = n < 2;
}

function advance() {
  if (done) return;
  let J = I + L - 1;
  let q = m[I][K] + m[K + 1][J] + p[I - 1] * p[K] * p[J];
  if (q < best) { best = q; s[I][J] = K; }
  K++;
  if (K >= J) {
    m[I][J] = best; best = Infinity;
    I++;
    if (I > n - L + 1) { L++; I = 1; }
    if (L > n) { done = true; return; }
    K = I;
  }
}

function draw() {
  background(BG);
  if (playing && !done && ++timer >= framesPerMove) { timer = 0; advance(); }

  noStroke(); fill(FG); textAlign(LEFT, TOP); textSize(26);
  text(`行列の連鎖積：${n} 個の行列をどの順で掛けるか`, 32, 24);
  fill(MUTED); textSize(15);
  text('スペース 再生・停止　→ 1 手　1〜3 お手本　R ランダム　↑↓ 速さ', 32, 60);

  drawMatrices(100);

  let cell = min(64, (width / 2 - 80) / n, (height - 470) / n);
  let gy = 290;
  drawTable(m, 40, gy, cell, 'm[i][j]：最小の掛け算回数', true);
  drawTable(s, width / 2 + 20, gy, cell, 's[i][j]：最後に掛ける切れ目 k', false);

  let ty = gy + cell * n + 50;
  textAlign(LEFT, TOP); textSize(17);
  if (!done) {
    let J = I + L - 1;
    fill(FG);
    text(`連鎖の長さ ${L}：m[${I}][${J}] を計算中。切れ目 k = ${K}`, 40, ty);
    fill(CYAN); text(`m[${I}][${K}] = ${m[I][K]}`, 40, ty + 30);
    fill(RASP); text(`m[${K + 1}][${J}] = ${m[K + 1][J]}`, 220, ty + 30);
    fill(AMBER); text(`p${I - 1}·p${K}·p${J} = ${p[I - 1]}·${p[K]}·${p[J]} = ${p[I - 1] * p[K] * p[J]}`, 420, ty + 30);
    fill(FG); text(`合計 ${m[I][K] + m[K + 1][J] + p[I - 1] * p[K] * p[J]}　（いまの最小 ${best === Infinity ? '-' : best}）`, 40, ty + 60);
  } else if (n >= 2) {
    fill(LIME); textSize(22);
    text(`最適なかっこ付け：${paren(1, n)}`, 40, ty);
    fill(FG); textSize(17);
    text(`掛け算 ${m[1][n].toLocaleString()} 回　（左から順に掛けると ${leftToRight().toLocaleString()} 回）`, 40, ty + 36);
  }
}

function paren(a, b) {
  if (a === b) return `A${a}`;
  return `(${paren(a, s[a][b])} ${paren(s[a][b] + 1, b)})`;
}

function leftToRight() {
  let total = 0, rows = p[0];
  for (let k = 1; k < n; k++) total += rows * p[k] * p[k + 1];
  return total;
}

function drawMatrices(y) {
  let mx = max(...p);
  let sc = min(1.6, 90 / mx);
  let x = 40;
  let J = I + L - 1;
  for (let a = 1; a <= n; a++) {
    let h = p[a - 1] * sc, w = p[a] * sc;
    let inRange = !done && a >= I && a <= J;
    noStroke(); fill(inRange ? (a <= K ? CYAN : RASP) : '#5a4a66');
    rect(x, y + (100 - h) / 2, w, h, 3);
    fill(FG); textSize(13); textAlign(CENTER, TOP);
    text(`A${a}`, x + w / 2, y + 102);
    fill(MUTED); text(`${p[a - 1]}×${p[a]}`, x + w / 2, y + 118);
    x += max(w, 54) + 18;
  }
}

function drawTable(T, x0, y0, cell, title, isM) {
  noStroke(); fill(FG); textSize(16); textAlign(LEFT, BOTTOM);
  text(title, x0, y0 - 24);
  let J = I + L - 1;
  let vals = [];
  for (let a = 1; a <= n; a++) for (let b = a; b <= n; b++) if (m[a][b] !== null) vals.push(m[a][b]);
  let vmax = max(1, ...vals);
  for (let a = 1; a <= n; a++) {
    fill(MUTED); textSize(12); textAlign(RIGHT, CENTER); text(`i=${a}`, x0 - 4 + 0, y0 + (a - 1) * cell + cell / 2);
    for (let b = 1; b <= n; b++) {
      if (a === 1) { fill(MUTED); textAlign(CENTER, BOTTOM); text(`j=${b}`, x0 + 30 + (b - 1) * cell + cell / 2, y0 - 2); }
      if (b < a) continue;
      let x = x0 + 30 + (b - 1) * cell, y = y0 + (a - 1) * cell;
      let v = T[a][b];
      let hl = null;
      if (!done) {
        if (a === I && b === J) hl = AMBER;
        else if (a === I && b === K) hl = CYAN;
        else if (a === K + 1 && b === J) hl = RASP;
      }
      stroke(hl || '#3a2f44'); strokeWeight(hl ? 3 : 1);
      if (v === null || (!isM && a === b)) fill(BG);
      else if (isM) fill(lerpColor(color('#2a2033'), color('#7a2d4a'), v / vmax));
      else fill(PANEL);
      rect(x + 2, y + 2, cell - 4, cell - 4, 5);
      if (v !== null && !(!isM && a === b)) {
        noStroke(); fill(FG); textAlign(CENTER, CENTER); textSize(min(14, cell * 0.24));
        text(v, x + cell / 2, y + cell / 2);
      }
    }
  }
}

function keyPressed() {
  if (key === ' ') playing = !playing;
  if (key === RIGHT_ARROW) advance();
  if (key === UP_ARROW) framesPerMove = max(1, framesPerMove - 3);
  if (key === DOWN_ARROW) framesPerMove = min(40, framesPerMove + 3);
  if (key === '1') { p = [50, 5, 40, 10, 30, 2, 25]; restart(); }
  if (key === '2') { p = [20, 2, 30, 12]; restart(); }         // 3 個だけ：(A1 A2) A3 は 8,400 回、A1 (A2 A3) は 1,200 回
  if (key === '3') { p = [8, 12, 4, 15, 6, 40, 9, 18]; restart(); }
  if (key === 'r' || key === 'R') {
    let k = floor(random(3, 9));
    p = []; for (let a = 0; a <= k; a++) p.push(floor(random(2, 12)) * 5);
    restart(); playing = true;
  }
}

function mousePressed() { playing = !playing; }
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
