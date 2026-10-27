// ============================================
// 03 最長共通部分列（LCS）：2 つの文字列に共通する、いちばん長い「とびとびの列」
// c[i][j] = X の先頭 i 文字と Y の先頭 j 文字の LCS の長さ
// 文字が同じなら ↖ c[i-1][j-1] + 1、違えば ↑ か ← の大きいほう。最後に矢印を逆にたどると答え
// スペース = 再生・停止 / → = 1 マス / 1〜3 = お手本 / P = 回文モード（Y = X を逆にしたもの → 最長回文部分列）/ R = 最初から
// ============================================

let X = 'CADBACD';      // ★ 文字列を変えてみよう（この例の LCS は長さ 4）
let Y = 'ABCDBCA';
let cellsPerFrame = 0.25; // ★ 1 フレームに埋めるマス数

let c, b, filled, playing = true, path = [], palMode = false;

const BG = '#16111c', PANEL = '#231a2b', FG = '#f3eaf0', MUTED = '#9a8aa3';
const RASP = '#ff6b8b', CYAN = '#5ee6e0', AMBER = '#ffc857', LIME = '#a3e635';

function setup() {
  createCanvas(windowWidth, windowHeight);
  restart();
}

function restart() {
  if (palMode) Y = X.split('').reverse().join('');
  let m = X.length, n = Y.length;
  c = []; b = [];
  for (let i = 0; i <= m; i++) { c.push(new Array(n + 1).fill(0)); b.push(new Array(n + 1).fill('')); }
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    if (X[i - 1] === Y[j - 1]) { c[i][j] = c[i - 1][j - 1] + 1; b[i][j] = '↖'; }
    else if (c[i - 1][j] >= c[i][j - 1]) { c[i][j] = c[i - 1][j]; b[i][j] = '↑'; }
    else { c[i][j] = c[i][j - 1]; b[i][j] = '←'; }
  }
  // 復元（右下から矢印を逆にたどる）
  path = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    path.push([i, j, b[i][j]]);
    if (b[i][j] === '↖') { i--; j--; } else if (b[i][j] === '↑') i--; else j--;
  }
  filled = 0;
}

function draw() {
  background(BG);
  let m = X.length, n = Y.length, total = m * n;
  if (playing) filled = min(total + path.length + 1, filled + max(cellsPerFrame, total / 400));
  let shown = floor(filled);

  noStroke(); fill(FG); textAlign(LEFT, TOP); textSize(26);
  text(palMode ? '最長回文部分列 = LCS( X , X を逆から読んだもの )' : '最長共通部分列（LCS）', 32, 24);
  fill(MUTED); textSize(15);
  text('スペース 再生・停止　→ 1 マス　1〜3 お手本　P 回文モード　R 最初から', 32, 60);

  let cell = min(56, (width - 380) / (n + 2), (height - 200) / (m + 2));
  let x0 = 60, y0 = 110;
  let ci = -1, cj = -1;
  if (shown < total) { ci = floor(shown / n) + 1; cj = shown % n + 1; }

  // 見出し
  textAlign(CENTER, CENTER); textSize(min(20, cell * 0.45));
  for (let j = 0; j <= n; j++) {
    fill(j === cj ? AMBER : MUTED);
    text(j === 0 ? '' : Y[j - 1], x0 + (j + 1) * cell + cell / 2, y0 + cell / 2);
  }
  for (let i = 0; i <= m; i++) {
    fill(i === ci ? AMBER : MUTED);
    text(i === 0 ? '' : X[i - 1], x0 + cell / 2, y0 + (i + 1) * cell + cell / 2);
  }

  let onPath = {};
  let pathShown = shown >= total ? shown - total : -1;
  for (let k = 0; k < min(pathShown, path.length); k++) onPath[path[k][0] + ',' + path[k][1]] = true;

  for (let i = 0; i <= m; i++) for (let j = 0; j <= n; j++) {
    let x = x0 + (j + 1) * cell, y = y0 + (i + 1) * cell;
    let idx = (i - 1) * n + (j - 1);
    let visible = i === 0 || j === 0 || idx < shown;
    let isCur = i === ci && j === cj;
    let dep = shown < total && ((i === ci - 1 && j === cj - 1) || (i === ci - 1 && j === cj) || (i === ci && j === cj - 1));
    stroke(isCur ? AMBER : dep ? CYAN : '#3a2f44'); strokeWeight(isCur || dep ? 2.5 : 1);
    let pk = i + ',' + j;
    fill(onPath[pk] ? (b[i][j] === '↖' ? '#5f7f1e' : '#4a3d56') : visible ? PANEL : BG);
    rect(x + 1, y + 1, cell - 2, cell - 2, 5);
    if (visible || isCur) {
      noStroke(); fill(isCur ? AMBER : FG); textSize(min(16, cell * 0.34)); textAlign(CENTER, CENTER);
      text(c[i][j], x + cell * 0.62, y + cell * 0.62);
      if (i > 0 && j > 0) { fill(b[i][j] === '↖' ? LIME : MUTED); textSize(min(14, cell * 0.3)); text(b[i][j], x + cell * 0.28, y + cell * 0.3); }
    }
  }

  // 右のパネル
  let px = x0 + (n + 2) * cell + 30, pw = width - px - 30;
  noStroke(); fill(PANEL); rect(px, y0, pw, 300, 12);
  fill(FG); textAlign(LEFT, TOP); textSize(16);
  let lcs = path.filter(q => q[2] === '↖').map(q => X[q[0] - 1]).reverse().join('');
  text('ルール', px + 16, y0 + 14);
  fill(MUTED); textSize(14);
  text('X[i] = Y[j] なら ↖ +1\nちがえば ↑ と ← の大きいほう', px + 16, y0 + 40);
  if (shown >= total) {
    fill(FG); textSize(16); text(`長さ ${c[m][n]}`, px + 16, y0 + 100);
    let partial = path.slice(0, max(0, pathShown)).filter(q => q[2] === '↖').map(q => X[q[0] - 1]).reverse().join('');
    fill(LIME); textSize(min(30, pw / max(4, lcs.length) * 1.4));
    text(pathShown >= path.length ? lcs : partial, px + 16, y0 + 130);
    // X と Y に印をつける
    textSize(18);
    let usedX = {}, usedY = {};
    for (let q of path.slice(0, max(0, pathShown))) if (q[2] === '↖') { usedX[q[0] - 1] = 1; usedY[q[1] - 1] = 1; }
    for (let [lab, str, used, yy] of [['X', X, usedX, 200], ['Y', Y, usedY, 240]]) {
      fill(MUTED); text(lab, px + 16, y0 + yy);
      for (let k = 0; k < str.length; k++) {
        fill(used[k] ? LIME : '#6a5a76');
        text(str[k], px + 44 + k * min(20, (pw - 60) / str.length), y0 + yy);
      }
    }
  } else {
    fill(MUTED); textSize(14); text(`埋めたマス ${shown} / ${total}`, px + 16, y0 + 100);
  }
}

function keyPressed() {
  if (key === ' ') playing = !playing;
  if (key === RIGHT_ARROW) { playing = false; filled = floor(filled) + 1; }
  if (key === '1') { palMode = false; X = 'CADBACD'; Y = 'ABCDBCA'; restart(); }
  if (key === '2') { palMode = false; X = 'GATTACAGCTTAGC'; Y = 'TCAGGATTCAGCAT'; restart(); } // DNA の塩基配列（A C G T）
  if (key === '3') { palMode = false; X = 'STRAWBERRY'; Y = 'RASPBERRY'; restart(); }
  if (key === 'p' || key === 'P') { palMode = !palMode; if (palMode) X = 'SEPARATE'; else { X = 'CADBACD'; Y = 'ABCDBCA'; } restart(); }
  if (key === 'r' || key === 'R') { filled = 0; playing = true; }
}

function mousePressed() { playing = !playing; }
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
