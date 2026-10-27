// ============================================
// 06 ハンガリー法（割り当て問題）
// n 人に n 個の仕事を 1 つずつ。表の数字 = その人がその仕事をするコスト。合計を最小にしたい
// 総当たりは n! 通り（10 人で 362 万通り）。ハンガリー法は O(n³)
// 各行・各列に「ポテンシャル」u, v を持ち、c − u − v ≥ 0 を保ちながら、0 になったマスだけでマッチングを広げる
// スペース = 1 手 / A = 自動 / マスをクリック = コスト +1（Shift で −1）/ 上下 = 人数 / R = ランダム
// ============================================

let n = 5;
let cost = [];
let gen = null, st = null;
let auto = false, timer = 0;
let best = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  randomCost();
}

function randomCost() {
  cost = [];
  for (let i = 0; i < n; i++) { let r = []; for (let j = 0; j < n; j++) r.push(floor(random(1, 20))); cost.push(r); }
  restart();
}

function restart() {
  gen = hungarian(); st = gen.next().value; auto = false;
  best = n <= 8 ? bruteForce() : null;
}

// ハンガリー法（ポテンシャル版）。1 行ずつ加え、最短の「交互道」を見つけてマッチングを 1 つ増やす
function* hungarian() {
  let INF = 1e9;
  let u = new Array(n + 1).fill(0), v = new Array(n + 1).fill(0), p = new Array(n + 1).fill(0), way = new Array(n + 1).fill(0);
  let a = (i, j) => cost[i - 1][j - 1];
  yield { u, v, p, row: 0, used: [], msg: 'スペースで、1 行目（1 人目）から始める' };
  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    let minv = new Array(n + 1).fill(INF), used = new Array(n + 1).fill(false);
    do {
      used[j0] = true;
      let i0 = p[j0], delta = INF, j1 = 0;
      for (let j = 1; j <= n; j++) if (!used[j]) {
        let cur = a(i0, j) - u[i0] - v[j];
        if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
        if (minv[j] < delta) { delta = minv[j]; j1 = j; }
      }
      for (let j = 0; j <= n; j++) if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else minv[j] -= delta;
      j0 = j1;
      yield { u, v, p, row: i, used: [...used], focus: j1, msg: '人 ' + i + '：ポテンシャルを ' + delta + ' ずらすと、仕事 ' + j1 + ' のマスが 0 に' + (p[j0] ? '（もう人 ' + p[j0] + ' がいるので、その人の行も調べる）' : '（空いている！）') };
    } while (p[j0] !== 0);
    do { let j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
    yield { u, v, p, row: i, used: [], msg: '交互道にそってペアを付けかえ → ' + i + ' 人が割り当て済み' };
  }
  yield { u, v, p, row: n + 1, used: [], done: true, msg: '完成！ 最小コスト = ' + -v[0] + '（−v₀ と一致）' };
}

function bruteForce() {
  let bestCost = Infinity, perm = [...Array(n).keys()];
  function rec(k, used, s) {
    if (s >= bestCost) return;
    if (k === n) { bestCost = s; return; }
    for (let j = 0; j < n; j++) if (!used[j]) { used[j] = true; rec(k + 1, used, s + cost[k][j]); used[j] = false; }
  }
  rec(0, new Array(n).fill(false), 0);
  return bestCost;
}

function cellSize() { return min(70, (height - 260) / (n + 1), (width * 0.55) / (n + 1)); }
function ox() { return width * 0.08 + 60; }
function oy() { return 140; }

function draw() {
  background(170, 30, 9);
  if (auto && ++timer % 30 === 0) advance();
  let s = cellSize(), X = ox(), Y = oy();
  let { u, v, p, row, used } = st;
  textAlign(CENTER, CENTER);
  // 列の見出し（仕事）と v
  for (let j = 1; j <= n; j++) {
    noStroke(); fill(used[j] ? color(45, 70, 90) : color(170, 20, 70)); textSize(15);
    text('仕事' + j, X + (j - 0.5) * s, Y - 34);
    fill(195, 70, 100); text('v=' + v[j], X + (j - 0.5) * s, Y - 12);
  }
  let total = 0;
  for (let i = 1; i <= n; i++) {
    noStroke(); fill(i <= row ? color(0, 0, 95) : color(0, 0, 50)); textSize(15);
    text('人' + i, X - 70, Y + (i - 0.5) * s);
    fill(330, 60, 100); text('u=' + u[i], X - 26, Y + (i - 0.5) * s);
    for (let j = 1; j <= n; j++) {
      let c = cost[i - 1][j - 1];
      let red = c - u[i] - v[j];
      let assigned = p[j] === i && i <= n;
      if (assigned && (st.done || i < row || (i === row && !used.length))) total += c;
      stroke(170, 20, 25);
      fill(assigned ? color(330, 70, 85) : i <= row && red === 0 ? color(45, 80, 75) : color(170, 25, map(c, 1, 20, 35, 15)));
      rect(X + (j - 1) * s, Y + (i - 1) * s, s, s, 6);
      noStroke(); fill(0, 0, 100); textSize(s * 0.32);
      text(c, X + (j - 0.5) * s, Y + (i - 0.62) * s);
      if (i <= row) { fill(0, 0, assigned ? 100 : 70); textSize(s * 0.2); text('残り ' + red, X + (j - 0.5) * s, Y + (i - 0.22) * s); }
    }
  }
  textAlign(LEFT, BASELINE);
  let rx = X + n * s + 50;
  fill(0, 0, 100); textSize(22); text('割り当て中のコスト ' + total, rx, Y + 10);
  if (best !== null) { fill(0, 0, 75); textSize(17); text('総当たり（' + factorial(n) + ' 通り）の最小 = ' + best, rx, Y + 44); }
  fill(0, 0, 70); textSize(15);
  let lines = ['黄 = 「残り」(c − u − v) が 0 のマス', '桃 = 割り当て（必ず残り 0 のマス）', '残りは決してマイナスにならない', '→ どの割り当ても ≥ Σu + Σv', '→ 残り 0 だけで全員そろえば最小'];
  lines.forEach((l, k) => text(l, rx, Y + 90 + k * 26));
  fill(0, 0, 100); textSize(18);
  text('スペース：1 手　A：自動　マスをクリック：コスト +1（Shift で −1）　上下：人数 ' + n + '　R：ランダム', 20, 36);
  textSize(15); fill(0, 0, 65);
  text('u = 人のポテンシャル、v = 仕事のポテンシャル。ハンガリー法は「割り当て問題の線形計画の双対」を同時に解いている', 20, 62);
  fill(45, 80, 100); textSize(20); text(st.msg, 20, height - 26);
}

function factorial(k) { return k <= 1 ? 1 : k * factorial(k - 1); }
function advance() { let r = gen.next(); if (!r.done) st = r.value; else auto = false; if (st.done) auto = false; }

function mousePressed() {
  let s = cellSize(), j = floor((mouseX - ox()) / s), i = floor((mouseY - oy()) / s);
  if (i >= 0 && i < n && j >= 0 && j < n) { cost[i][j] = constrain(cost[i][j] + (keyIsDown(SHIFT) ? -1 : 1), 0, 99); restart(); }
}

function keyPressed() {
  if (key === ' ') advance();
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === UP_ARROW) { n = min(9, n + 1); randomCost(); }
  if (key === DOWN_ARROW) { n = max(2, n - 1); randomCost(); }
  if (key === 'r' || key === 'R') randomCost();
}

// ---------- やってみよう ----------
// 1. 最後のコストが総当たりの最小と必ず一致することを確かめる
// 2. ある人のコストを全部 +5 すると？（u が 5 増えるだけで、割り当ては変わらない）
// 3. 「最大」にしたいとき（利益の割り当て）は、コストを（大きい数 − 利益）にすればよい
