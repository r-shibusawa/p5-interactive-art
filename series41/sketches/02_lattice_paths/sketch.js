// ============================================
// 02 格子路の数え上げ
// 左下 (0,0) から右上 (m,n) まで、右か上にしか進めない道は C(m+n, n) 通り
// 各交差点に「ここまで来る道の数」を書くと、パスカルの三角形が現れる
// ←→ = m（1〜8）/ ↑↓ = n（1〜8）/ クリック = その点を通る道の数 / スペース = ランダムな道を次々に / R = 道を消す
// ============================================

let m = 6, n = 4;          // ★ 格子の大きさ
let ways = [];             // ways[i][j] = (i,j) までの道の数
let pathSteps = [];        // いま描いている道（'R' / 'U' の列）
let progress = 0;          // 道をどこまで描いたか
let auto = true;
let picked = null;         // クリックした点 {i, j}
let visits = [];           // 各点を通った回数（ランダム道の統計）
let pathCount = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  rebuild();
}

function rebuild() {
  // ★ 動的計画法：ways[i][j] = ways[i-1][j] + ways[i][j-1]
  ways = [];
  visits = [];
  for (let i = 0; i <= m; i++) {
    ways.push([]); visits.push([]);
    for (let j = 0; j <= n; j++) {
      let v = (i === 0 || j === 0) ? 1 : ways[i - 1][j] + ways[i][j - 1];
      ways[i].push(v);
      visits[i].push(0);
    }
  }
  picked = null;
  pathCount = 0;
  newPath();
}

// ランダムな道：残りの R と U から 1 つ選ぶ（全部の道が同じ確率になるよう、残り数で重みづけ）
function newPath() {
  pathSteps = [];
  let i = 0, j = 0;
  while (i < m || j < n) {
    let right = (i < m) ? waysFrom(i + 1, j) : 0;
    let up = (j < n) ? waysFrom(i, j + 1) : 0;
    if (Math.random() * (right + up) < right) { pathSteps.push('R'); i++; } else { pathSteps.push('U'); j++; }
  }
  progress = 0;
}
// (i,j) から (m,n) までの道の数 = C((m-i)+(n-j), n-j)
function waysFrom(i, j) { if (i > m || j > n) return 0; return ways[m - i][n - j]; }

function gridPos(i, j) {
  let cell = Math.min((width - 420) / m, (height - 220) / n, 90);
  let x0 = 60, y0 = height - 80;
  return { x: x0 + i * cell, y: y0 - j * cell, cell };
}

function draw() {
  background(220, 30, 10);
  if (auto) {
    progress += 0.12;
    if (progress >= pathSteps.length + 6) {
      // 道を記録して次へ
      let i = 0, j = 0; visits[0][0]++;
      for (let s of pathSteps) { if (s === 'R') i++; else j++; visits[i][j]++; }
      pathCount++;
      newPath();
    }
  }

  // 格子線
  let g = gridPos(0, 0);
  stroke(0, 0, 35);
  strokeWeight(1);
  for (let i = 0; i <= m; i++) { let a = gridPos(i, 0), b = gridPos(i, n); line(a.x, a.y, b.x, b.y); }
  for (let j = 0; j <= n; j++) { let a = gridPos(0, j), b = gridPos(m, j); line(a.x, a.y, b.x, b.y); }

  // 道（進んだところまで）
  let shown = Math.min(Math.floor(progress), pathSteps.length);
  let i = 0, j = 0;
  stroke(45, 90, 100);
  strokeWeight(6);
  noFill();
  beginShape();
  let p = gridPos(0, 0);
  vertex(p.x, p.y);
  for (let s = 0; s < shown; s++) {
    if (pathSteps[s] === 'R') i++; else j++;
    p = gridPos(i, j);
    vertex(p.x, p.y);
  }
  endShape();

  // 交差点：道の数、通った回数
  let maxVisit = 1;
  for (let a = 0; a <= m; a++) for (let b = 0; b <= n; b++) maxVisit = Math.max(maxVisit, visits[a][b]);
  noStroke();
  for (let a = 0; a <= m; a++) for (let b = 0; b <= n; b++) {
    let q = gridPos(a, b);
    let heat = visits[a][b] / maxVisit;
    fill(200 - heat * 160, 60 + heat * 30, 50 + heat * 50);
    circle(q.x, q.y, 14 + heat * 10);
    fill(0, 0, 100);
    textAlign(CENTER, BASELINE);
    textSize(13);
    text(ways[a][b], q.x, q.y - 14);
  }
  textAlign(LEFT, BASELINE);

  // 選んだ点
  if (picked) {
    let q = gridPos(picked.i, picked.j);
    noFill();
    stroke(330, 80, 100);
    strokeWeight(3);
    circle(q.x, q.y, 34);
    // 通る道の数 = 左下からここまで × ここから右上まで
    let a = ways[picked.i][picked.j], b = waysFrom(picked.i, picked.j);
    noStroke();
    fill(330, 80, 100);
    textSize(16);
    text('(' + picked.i + ',' + picked.j + ') を通る道：' + a + ' × ' + b + ' = ' + (a * b), q.x + 24, q.y + 6);
  }

  // 右パネル
  let px = width - 340, py = 120;
  fill(0, 0, 100, 8);
  rect(px - 16, py - 30, 330, 250, 10);
  fill(0, 0, 100);
  textSize(36);
  text('C(' + (m + n) + ',' + n + ') = ' + ways[m][n], px, py + 12);
  textSize(15);
  fill(0, 0, 70);
  text('右 R を ' + m + ' 回、上 U を ' + n + ' 回、計 ' + (m + n) + ' 歩。', px, py + 46);
  text('U をどの ' + n + ' 歩にするか選ぶ = 組合せ', px, py + 68);
  text('各点の数 = 左の数 ＋ 下の数（パスカル）', px, py + 90);
  fill(45, 90, 100);
  text('いまの道：' + pathSteps.slice(0, shown).join('') + (shown < pathSteps.length ? '…' : ''), px, py + 126);
  fill(0, 0, 70);
  text('ランダムな道：' + pathCount + ' 本（点の色 = 通った回数）', px, py + 150);
  text('真ん中の点ほどよく通る（C の値に比例）', px, py + 172);

  fill(0, 0, 100);
  textSize(18);
  text('m = ' + m + '（←→）　n = ' + n + '（↑↓）　クリック：その点を通る道の数　スペース：自動 ' + (auto ? 'ON' : 'off') + '　R：記録を消す', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('左下から右上へ、右か上にしか進めない。道の総数 = R と U の並べ方 = C(m+n, n)', 20, 68);
}

function mousePressed() {
  let best = null, bd = 1e9;
  for (let a = 0; a <= m; a++) for (let b = 0; b <= n; b++) {
    let q = gridPos(a, b);
    let d = (q.x - mouseX) ** 2 + (q.y - mouseY) ** 2;
    if (d < bd) { bd = d; best = { i: a, j: b }; }
  }
  if (best && bd < 40 * 40) picked = (picked && picked.i === best.i && picked.j === best.j) ? null : best;
}

function keyPressed() {
  if (key === RIGHT_ARROW && m < 8) { m++; rebuild(); }
  if (key === LEFT_ARROW && m > 1) { m--; rebuild(); }
  if (key === UP_ARROW && n < 8) { n++; rebuild(); }
  if (key === DOWN_ARROW && n > 1) { n--; rebuild(); }
  if (key === ' ') auto = !auto;
  if (key === 'r' || key === 'R') rebuild();
}

// ---------- やってみよう ----------
// 1. m = n = 4 で、対角線上の点 (2,2) を通る道の数 = C(4,2) × C(4,2) = 36。クリックして確かめよう
// 2. 道をたくさん流すと、どの点がよく通られる？ 端の点と真ん中の点をくらべよう（二項分布）
// 3. 「対角線より上に出ない道」だけ数えるとカタラン数（08）になる。newPath に条件を足してみよう
// 4. 右上だけでなく「斜め右上」にも進めるようにすると数はどうなる？（デラノイ数）
