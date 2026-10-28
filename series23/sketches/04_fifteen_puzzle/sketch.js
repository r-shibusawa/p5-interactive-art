// ============================================
// 04 15 パズルと偶置換
// 1 回スライドする = 空白とタイルの入れかえ（互換）1 回 → 置換の偶奇が変わり、空白の位置も 1 マス動く
//   「置換の偶奇」と「空白のゴールからの距離の偶奇」はいつも一致 → 14 と 15 だけ入れかえた状態は絶対に解けない
// タイルをクリック or ←→↑↓ = スライド / スペース = シャッフル（正しい手だけ）/ W = 14 と 15 をこっそり入れかえ / 0 = リセット
// ============================================

let N = 4;               // ★ 盤の大きさ（3 にすると 8 パズル）
let board = [];          // board[マス] = タイル番号（0 = 空白）
let moves = 0;
let slide = null;        // アニメーション { tile, from, to, t }
let cheated = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  resetAll();
}
function resetAll() { board = [...Array(N * N).keys()].map((i) => (i + 1) % (N * N)); moves = 0; cheated = false; slide = null; }

function cellSize() { return min(width * 0.42, height - 220) / N; }
function origin() { return [60, 120]; }

function draw() {
  background(30, 34, 44);
  let cs = cellSize(), [ox, oy] = origin();
  fill(20); noStroke();
  rect(ox - 10, oy - 10, cs * N + 20, cs * N + 20, 12);
  for (let i = 0; i < N * N; i++) {
    let t = board[i];
    if (t === 0) continue;
    let x = ox + (i % N) * cs, y = oy + floor(i / N) * cs;
    if (slide && slide.tile === t) {
      let e = slide.t * slide.t * (3 - 2 * slide.t);
      x = lerp(ox + (slide.from % N) * cs, x, e);
      y = lerp(oy + floor(slide.from / N) * cs, y, e);
    }
    let home = t - 1;
    let ok = home === i;
    fill(ok ? color(250, 220, 140) : color(240, 240, 245));
    if (cheated && (t === N * N - 1 || t === N * N - 2)) fill(255, 150, 150);
    rect(x + 4, y + 4, cs - 8, cs - 8, 10);
    fill(30); textAlign(CENTER, CENTER); textSize(cs * 0.4);
    text(t, x + cs / 2, y + cs / 2);
  }
  textAlign(LEFT, BASELINE);
  if (slide) { slide.t += 0.2; if (slide.t >= 1) slide = null; }

  // 2 つの偶奇
  let par = permParity(), bi = board.indexOf(0);
  let distB = (N - 1 - (bi % N)) + (N - 1 - floor(bi / N));      // 空白からゴール（右下）までの距離
  let solvable = par === distB % 2;
  let px = ox + cs * N + 60, py = 130;
  noStroke(); fill(255); textSize(20);
  text('置換の偶奇（空白も 1 枚のタイル ' + N * N + ' と考える）', px, py);
  textSize(40); fill(130, 200, 255);
  text(par ? '奇' : '偶', px, py + 50);
  fill(255); textSize(20);
  text('空白の、右下からの距離 = ' + distB + ' →', px, py + 110);
  textSize(40); fill(130, 200, 255);
  text(distB % 2 ? '奇' : '偶', px, py + 160);
  textSize(30);
  fill(solvable ? color(120, 230, 160) : color(255, 110, 110));
  text(solvable ? '一致 → 解ける' : '不一致 → 絶対に解けない！', px, py + 230);
  fill(200); textSize(16);
  text('1 手 = 空白との入れかえ 1 回：置換の偶奇が反転、距離も ±1 で偶奇が反転', px, py + 280);
  text('→ 2 つの偶奇の「一致・不一致」は何手動かしても変わらない（不変量）', px, py + 306);
  text('ゴールは「偶・距離 0」で一致。だから不一致の状態からは絶対にたどり着けない', px, py + 332);
  text('手数 ' + moves + (isSolvedNow() ? '　そろった！' : ''), px, py + 380);

  fill(255); textSize(18);
  text('クリック or ←→↑↓：スライド　スペース：シャッフル　W：14 と 15 を入れかえ（反則）　0：リセット', 20, 36);
  fill(170); textSize(15);
  text('1880 年ごろ「14 と 15 が逆の 15 パズルを解いたら賞金」が大流行。でも誰も解けなかった。理由は置換の偶奇', 20, 62);
}

// 置換の偶奇（空白は N*N 番のタイルとして扱う）
function permParity() {
  let p = board.map((t) => (t === 0 ? N * N : t) - 1);
  let seen = [], cyc = 0;
  for (let i = 0; i < p.length; i++) {
    if (seen[i]) continue;
    cyc++;
    for (let j = i; !seen[j]; j = p[j]) seen[j] = true;
  }
  return (p.length - cyc) % 2;
}
function isSolvedNow() { return board.every((t, i) => t === (i + 1) % (N * N)); }

// マス i のタイルが空白のとなりなら動かす
function tryMove(i, animate = true) {
  let b = board.indexOf(0);
  let adj = (abs((i % N) - (b % N)) + abs(floor(i / N) - floor(b / N))) === 1;
  if (!adj) return false;
  if (animate) slide = { tile: board[i], from: i, t: 0 };
  board[b] = board[i]; board[i] = 0;
  moves++;
  return true;
}

function mousePressed() {
  let cs = cellSize(), [ox, oy] = origin();
  let c = floor((mouseX - ox) / cs), r = floor((mouseY - oy) / cs);
  if (c >= 0 && c < N && r >= 0 && r < N) tryMove(r * N + c);
}

function keyPressed() {
  let b = board.indexOf(0), bc = b % N, br = floor(b / N);
  // 矢印の向きにタイルが動く（= 空白は逆向き）
  if (key === LEFT_ARROW && bc < N - 1) tryMove(b + 1);
  if (key === RIGHT_ARROW && bc > 0) tryMove(b - 1);
  if (key === UP_ARROW && br < N - 1) tryMove(b + N);
  if (key === DOWN_ARROW && br > 0) tryMove(b - N);
  if (key === ' ') {
    for (let k = 0; k < 400; k++) {
      let bb = board.indexOf(0), nb = [];
      for (let d of [-1, 1, -N, N]) { let j = bb + d; if (j >= 0 && j < N * N && (abs(d) === N || floor(j / N) === floor(bb / N))) nb.push(j); }
      tryMove(nb[floor(Math.random() * nb.length)], false);
    }
    moves = 0;
  }
  if (key === 'w' || key === 'W') {
    let a = board.indexOf(N * N - 2), c = board.indexOf(N * N - 1);
    [board[a], board[c]] = [board[c], board[a]];
    cheated = !cheated;
  }
  if (key === '0') resetAll();
  return false;
}

// ---------- やってみよう ----------
// 1. W を押してから、14 と 15 以外がそろうところまで解いてみよう。最後の 2 枚はどうしても逆のまま
// 2. W をもう 1 回押す（入れかえ 2 回 = 偶置換）とまた解ける。なぜ？
// 3. N = 3（8 パズル）でも同じ。8 パズルの「解ける状態」は 9!/2 = 181,440 通り
// 4. ルービックキューブにも同じ「偶奇の保存」がある（13）。辺 2 個だけの入れかえはできない
