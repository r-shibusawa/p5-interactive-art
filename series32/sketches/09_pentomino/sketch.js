// ============================================
// 09 ポリオミノとパズル（ペントミノ）
// 正方形 5 つをつないだ形は 12 種類（ペントミノ）。全部で 60 マス → 6×10 などの長方形にぴったり詰められる
//   コンピュータの解き方 = バックトラック：左の空きマスに入る形を順に試し、行き詰まったら 1 つ戻る
// 1 = 6×10 2 = 5×12 3 = 4×15 4 = 3×20 / スペース = 一時停止 / ↑↓ = 速さ / N = 次の解 / R = 順番を変えて最初から / F = 一気に / S = 保存
// ============================================

let boards = [[10, 6], [12, 5], [15, 4], [20, 3]];
let bi = 0;             // ★ 盤の番号
let W, H;
let speedIdx = 2;
let speeds = [1, 3, 10, 40, 200, 1000];   // ★ 1 フレームに試す手の数
let paused = false;

let SHAPES = { F: ['.##', '##.', '.#.'], I: ['#####'], L: ['####', '#...'], N: ['###.', '..##'], P: ['###', '##.'], T: ['###', '.#.', '.#.'],
  U: ['#.#', '###'], V: ['#..', '#..', '###'], W: ['#..', '##.', '.##'], X: ['.#.', '###', '.#.'], Y: ['####', '.#..'], Z: ['##.', '.#.', '.##'] };
let names = Object.keys(SHAPES);
let ORI = [];           // ORI[p] = 向き（回転・裏返し）のリスト。各向き = マスのずれ [[dx, dy], …]
let pieceCols = [];
let order = [];         // 試す順番

let board, used, stack, needNew, solved, failed, tries, solutions;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100);
  ORI = names.map((nm) => orientations(SHAPES[nm]));
  // ★ 12 色（となりのピースが見分けやすい順）
  let hues = [0, 200, 45, 280, 120, 25, 330, 170, 60, 230, 95, 300];
  pieceCols = names.map((_, i) => color(hues[i], i % 2 ? 50 : 70, i % 3 === 0 ? 95 : 80));
  order = names.map((_, i) => i);
  restart();
}

function restart() {
  [W, H] = boards[bi];
  board = new Int8Array(W * H).fill(-1);
  used = new Array(12).fill(false);
  stack = [];
  needNew = true;
  solved = failed = false;
  tries = 0;
  solutions = 0;
}

function draw() {
  background(230, 25, 12);
  if (!paused && !solved && !failed) for (let s = 0; s < speeds[speedIdx] && !solved && !failed; s++) stepDFS();

  let cs = Math.min((width - 80) / W, (height - 260) / H);
  let ox = (width - cs * W) / 2, oy = 130;
  for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) {
    let p = board[x * H + y];
    stroke(230, 20, 25);
    strokeWeight(1);
    if (p >= 0) fill(pieceCols[p]); else fill(230, 15, 22);
    rect(ox + x * cs, oy + y * cs, cs, cs);
  }
  // 同じピースの境目は消して、ピースの形を見やすく
  stroke(230, 30, 8);
  strokeWeight(4);
  for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) {
    let p = board[x * H + y];
    if (x < W - 1 && board[(x + 1) * H + y] !== p) line(ox + (x + 1) * cs, oy + y * cs, ox + (x + 1) * cs, oy + (y + 1) * cs);
    if (y < H - 1 && board[x * H + y + 1] !== p) line(ox + x * cs, oy + (y + 1) * cs, ox + (x + 1) * cs, oy + (y + 1) * cs);
  }
  // 12 種類のピース
  let px = 40, py = height - 100;
  for (let i = 0; i < 12; i++) {
    let c = 11;
    SHAPES[names[i]].forEach((row, dy) => [...row].forEach((ch, dx) => {
      if (ch !== '#') return;
      noStroke();
      fill(used[i] ? color(0, 0, 35) : pieceCols[i]);
      rect(px + i * ((width - 80) / 12) + dx * c, py + dy * c, c - 1, c - 1);
    }));
    fill(0, 0, 80);
    textSize(13);
    text(names[i], px + i * ((width - 80) / 12), py + 70);
  }

  noStroke();
  fill(0, 0, 100);
  textSize(20);
  text('ペントミノ 12 種類で ' + H + '×' + W + ' を埋める（1〜4 で盤）', 20, 36);
  textSize(15);
  fill(0, 0, 75);
  let state = solved ? '解けた！（N で次の解）' : failed ? 'これ以上の解はない' : paused ? '一時停止中' : '探索中…';
  text(state + '　試した手 ' + tries + '　見つけた解 ' + solutions + '　速さ ' + speeds[speedIdx] + ' 手/フレーム（↑↓）', 20, 62);
  text('いちばん左の空きマスを、まだ使っていないピースで埋める → だめなら戻る（バックトラック）', 20, 86);
}

// ★ バックトラックの 1 手
function stepDFS() {
  if (needNew) {
    let f = firstEmpty();
    if (!f) { solved = true; solutions++; return; }
    stack.push({ fx: f[0], fy: f[1], k: 0, o: -1 });
    needNew = false;
  }
  let top = stack[stack.length - 1];
  if (top.o >= 0) put(top, -1);        // 前に試したピースを外す
  if (advance(top)) { put(top, order[top.k]); needNew = true; tries++; }
  else { stack.pop(); if (!stack.length) failed = true; }
}

// 次に置けるピースと向きを探す（見つかれば true）
function advance(f) {
  while (f.k < 12) {
    let p = order[f.k];
    if (!used[p]) {
      while (++f.o < ORI[p].length) if (fits(ORI[p][f.o], f.fx, f.fy)) return true;
    }
    f.k++;
    f.o = -1;
  }
  return false;
}

function fits(o, fx, fy) {
  for (let [dx, dy] of o) {
    let x = fx + dx, y = fy + dy;
    if (x < 0 || y < 0 || x >= W || y >= H || board[x * H + y] >= 0) return false;
  }
  return true;
}

function put(f, val) {
  let p = order[f.k];
  for (let [dx, dy] of ORI[p][f.o]) board[(f.fx + dx) * H + f.fy + dy] = val;
  used[p] = val >= 0;
}

// 左の列から順に、上から見て最初の空きマス
function firstEmpty() {
  for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) if (board[x * H + y] < 0) return [x, y];
  return null;
}

function keyPressed() {
  if (key >= '1' && key <= '4') { bi = int(key) - 1; restart(); }
  if (key === ' ') paused = !paused;
  if (key === UP_ARROW) speedIdx = Math.min(speeds.length - 1, speedIdx + 1);
  if (key === DOWN_ARROW) speedIdx = Math.max(0, speedIdx - 1);
  if (key === 'n' || key === 'N') { if (solved) { solved = false; needNew = false; } }
  if (key === 'r' || key === 'R') { order = shuffle(order); restart(); }
  if (key === 'f' || key === 'F') { let t = millis(); while (!solved && !failed && millis() - t < 2000) stepDFS(); }
  if (key === 's' || key === 'S') saveCanvas('pentomino', 'png');
}

// ---------- やってみよう ----------
// 1. 6×10 は 2339 通り、3×20 はたった 2 通りの解がある。3×20 は手数がずっと多いのはなぜ？
// 2. R で試す順番を変えると、見つかる解も手数も変わる。いちばん少ない手数は？
// 3. N で次々に解を探そう。裏返しや回転で同じになる解は 4 つずつ見つかる
// 4. SHAPES に形を足して（例：テトロミノ 5 種類 = 20 マス）、4×5 の盤を作ってみよう


// ==================================================
// ここから下は「ピースの道具」（回転・裏返しで向きを全部作る）
// ==================================================
function orientations(rows) {
  let cells = [];
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === '#') cells.push([x, y]); }));
  let found = new Map(), cur = cells;
  for (let flip = 0; flip < 2; flip++) {
    for (let r = 0; r < 4; r++) {
      cur = cur.map(([x, y]) => [y, -x]);
      let mx = Math.min(...cur.map((c) => c[0])), my = Math.min(...cur.map((c) => c[1]));
      let nrm = cur.map(([x, y]) => [x - mx, y - my]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      found.set(JSON.stringify(nrm), nrm);
    }
    cur = cur.map(([x, y]) => [-x, y]);
  }
  // 「左の列のいちばん上のマス」が (0, 0) になるようにずらす
  return [...found.values()].map((o) => o.map(([x, y]) => [x - o[0][0], y - o[0][1]]));
}
