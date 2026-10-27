// ============================================
// 04 編集距離：単語を何回の操作で別の単語に変えられる？
// 1 文字の「置換」「挿入」「削除」を 1 回と数え、X を Y に変える最小回数を求める
// d[i][j] = min( d[i-1][j-1] + (同じ文字なら 0 / ちがえば 1), d[i-1][j] + 1 削除, d[i][j-1] + 1 挿入 )
// 単語をクリックしてキーボードで書きかえ（Enter で決定）/ スペース = 再生・停止 / → = 1 マス / 1〜3 = お手本 / R = 最初から
// ============================================

let X = 'kitten';     // ★ 変える前
let Y = 'sitting';    // ★ 変えた後
let costReplace = 1;  // ★ 置換のコスト（2 にすると「削除＋挿入」と同じ → LCS と関係する）

let d, op, filled = 0, playing = true, ops = [], editing = null;

const BG = '#16111c', PANEL = '#231a2b', FG = '#f3eaf0', MUTED = '#9a8aa3';
const RASP = '#ff6b8b', CYAN = '#5ee6e0', AMBER = '#ffc857', LIME = '#a3e635';
const OPCOL = { '一致': LIME, '置換': AMBER, '挿入': CYAN, '削除': RASP };

function setup() {
  createCanvas(windowWidth, windowHeight);
  restart();
}

function restart() {
  let m = X.length, n = Y.length;
  d = []; op = [];
  for (let i = 0; i <= m; i++) { d.push(new Array(n + 1).fill(0)); op.push(new Array(n + 1).fill('')); }
  for (let i = 1; i <= m; i++) { d[i][0] = i; op[i][0] = '削除'; }
  for (let j = 1; j <= n; j++) { d[0][j] = j; op[0][j] = '挿入'; }
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    let same = X[i - 1] === Y[j - 1];
    let cands = [
      [d[i - 1][j - 1] + (same ? 0 : costReplace), same ? '一致' : '置換'],
      [d[i - 1][j] + 1, '削除'],
      [d[i][j - 1] + 1, '挿入'],
    ];
    cands.sort((a, b) => a[0] - b[0]);
    d[i][j] = cands[0][0]; op[i][j] = cands[0][1];
  }
  ops = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    let o = op[i][j];
    ops.push({ o, i, j, a: o === '挿入' ? '-' : X[i - 1], b: o === '削除' ? '-' : Y[j - 1] });
    if (o === '一致' || o === '置換') { i--; j--; } else if (o === '削除') i--; else j--;
  }
  ops.reverse();
  filled = 0;
}

function draw() {
  background(BG);
  let m = X.length, n = Y.length, total = m * n;
  if (playing && !editing) filled = min(total + ops.length + 1, filled + max(0.25, total / 300));
  let shown = floor(filled);

  noStroke(); fill(FG); textAlign(LEFT, TOP); textSize(26);
  text('編集距離（レーベンシュタイン距離）', 32, 24);
  fill(MUTED); textSize(15);
  text('単語をクリックして書きかえ → Enter　スペース 再生・停止　→ 1 マス　1〜3 お手本　R 最初から', 32, 60);

  // 単語（クリックで編集）
  textSize(28); textAlign(LEFT, CENTER);
  for (let [lab, w, yy, id] of [['X', X, 112, 'X'], ['Y', Y, 156, 'Y']]) {
    fill(MUTED); text(lab, 32, yy);
    fill(editing === id ? '#3b2a44' : PANEL); rect(64, yy - 20, 300, 40, 8);
    fill(FG); text(w + (editing === id && frameCount % 40 < 20 ? '|' : ''), 76, yy);
  }

  let cell = min(54, (width * 0.55) / (n + 2), (height - 300) / (m + 2));
  let x0 = 32, y0 = 200;
  let ci = -1, cj = -1;
  if (shown < total) { ci = floor(shown / max(1, n)) + 1; cj = shown % max(1, n) + 1; }
  textAlign(CENTER, CENTER); textSize(min(18, cell * 0.42));
  for (let j = 0; j <= n; j++) { fill(j === cj ? AMBER : MUTED); text(j === 0 ? 'ε' : Y[j - 1], x0 + (j + 1) * cell + cell / 2, y0 + cell / 2); }
  for (let i = 0; i <= m; i++) { fill(i === ci ? AMBER : MUTED); text(i === 0 ? 'ε' : X[i - 1], x0 + cell / 2, y0 + (i + 1) * cell + cell / 2); }

  let pathOn = {};
  let ps = shown - total;
  for (let k = ops.length - 1; k >= ops.length - ps && k >= 0; k--) pathOn[ops[k].i + ',' + ops[k].j] = ops[k].o;

  for (let i = 0; i <= m; i++) for (let j = 0; j <= n; j++) {
    let x = x0 + (j + 1) * cell, y = y0 + (i + 1) * cell;
    let idx = (i - 1) * n + (j - 1);
    let visible = i === 0 || j === 0 || idx < shown;
    let isCur = i === ci && j === cj;
    let dep = shown < total && (i === ci - 1 || i === ci) && (j === cj - 1 || j === cj) && !isCur;
    stroke(isCur ? AMBER : dep ? CYAN : '#3a2f44'); strokeWeight(isCur || dep ? 2.5 : 1);
    let po = pathOn[i + ',' + j];
    fill(po ? lerpColor(color(OPCOL[po]), color(BG), 0.55) : visible ? PANEL : BG);
    rect(x + 1, y + 1, cell - 2, cell - 2, 5);
    if (visible || isCur) { noStroke(); fill(FG); textSize(min(16, cell * 0.36)); text(d[i][j], x + cell / 2, y + cell / 2); }
  }

  // 右：操作の並び（アラインメント）
  let px = x0 + (n + 2) * cell + 30, pw = width - px - 30;
  noStroke(); fill(PANEL); rect(px, y0, pw, 360, 12);
  fill(FG); textAlign(LEFT, TOP); textSize(18);
  text(`編集距離 = ${d[m][n]}`, px + 18, y0 + 16);
  if (shown >= total) {
    let k0 = max(0, ops.length - ps);
    let w = min(36, (pw - 40) / max(1, ops.length));
    for (let k = 0; k < ops.length; k++) {
      let x = px + 18 + k * w, show = k >= k0;
      let o = ops[k];
      fill(show ? OPCOL[o.o] : '#3a2f44'); rect(x, y0 + 60, w - 4, 110, 6);
      fill(BG); textAlign(CENTER, CENTER); textSize(min(20, w * 0.6));
      text(o.a, x + w / 2 - 2, y0 + 88); text(o.b, x + w / 2 - 2, y0 + 142);
      textSize(10); text(show ? o.o : '', x + w / 2 - 2, y0 + 115);
    }
    textAlign(LEFT, TOP); textSize(14);
    let yy = y0 + 200;
    for (let name of ['一致', '置換', '挿入', '削除']) {
      let cnt = ops.filter(q => q.o === name).length;
      fill(OPCOL[name]); rect(px + 18, yy + 2, 14, 14, 3);
      fill(FG); text(`${name}  ${cnt} 回`, px + 40, yy);
      yy += 26;
    }
  }
}

function keyPressed() {
  if (editing) {
    if (key === ENTER || key === RETURN || key === ESCAPE) { editing = null; restart(); return; }
    if (key === BACKSPACE) { if (editing === 'X') X = X.slice(0, -1); else Y = Y.slice(0, -1); return; }
    if (key.length === 1 && key !== ' ') {
      if (editing === 'X' && X.length < 14) X += key;
      if (editing === 'Y' && Y.length < 14) Y += key;
    }
    return;
  }
  if (key === ' ') playing = !playing;
  if (key === RIGHT_ARROW) { playing = false; filled = floor(filled) + 1; }
  if (key === '1') { X = 'kitten'; Y = 'sitting'; restart(); }
  if (key === '2') { X = 'program'; Y = 'paragraph'; restart(); }
  if (key === '3') { X = 'sunday'; Y = 'saturday'; restart(); }
  if (key === 'r' || key === 'R') { filled = 0; playing = true; }
}

function mousePressed() {
  if (mouseX > 64 && mouseX < 364 && abs(mouseY - 112) < 20) editing = 'X';
  else if (mouseX > 64 && mouseX < 364 && abs(mouseY - 156) < 20) editing = 'Y';
  else if (editing) { editing = null; restart(); }
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }
