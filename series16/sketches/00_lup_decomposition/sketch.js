// ============================================
// 00 LUP 分解で連立方程式を解く
// 行列 A を「入れかえ P」「下三角 L」「上三角 U」に分けて（PA = LU）、
// 前進代入 → 後退代入の 2 回の簡単な計算で Ax = b を解く
// スペース：1 ステップ進む / A：自動再生 / R：やり直し（2 は新しい乱数）
// 1：お手本の 3×3  2：ランダム 4×4  3：特異行列（解けない）  4：ピボットが必要な 4×4
// ============================================

let speed = 45; // ★ 自動再生の間隔（フレーム）。小さいほど速い

let A0, b0, M, pi, n, y, x;
let runner, msg = '', hi = {}, doneK = 0, finished = false;
let auto = false, timer = 0, swapAnim = null, preset = 1;

const PRESETS = {
  1: { A: [[2, 4, -2], [1, 3, 0], [3, 1, 4]], b: [12, 7, 1] }, // 答えは x = (1, 2, −1)
  3: { A: [[1, 2, 3], [2, 4, 6], [1, 0, 1]], b: [1, 2, 3] },
  4: { A: [[0, 2, 1, 3], [4, 1, -2, 1], [2, 3, 1, -1], [-2, 1, 3, 2]], b: [3, 0, 0, 5] }, // 左上が 0。答えは x = (1, −1, 2, 1)
};

function setup() {
  createCanvas(windowWidth, windowHeight);
  textWrap(CHAR); // 日本語を文字単位で折り返す
  textFont('sans-serif');
  load(1);
}

function load(k) {
  preset = k;
  if (k === 2) {
    A0 = []; for (let i = 0; i < 4; i++) { A0.push([]); for (let j = 0; j < 4; j++) A0[i].push(floor(random(-6, 7))); }
    b0 = [0, 1, 2, 3].map(() => floor(random(-9, 10)));
  } else { A0 = PRESETS[k].A.map(r => r.slice()); b0 = PRESETS[k].b.slice(); }
  runner = lupSolve(); doneK = 0; finished = false; hi = {}; swapAnim = null;
  msg = 'スペースで 1 ステップずつ進む。A で自動再生';
  n = A0.length; M = A0.map(r => r.slice()); pi = [...Array(n).keys()]; y = Array(n).fill(null); x = Array(n).fill(null);
}

// LUP 分解 → 前進代入 → 後退代入 を 1 ステップずつ止まりながら実行する
function* lupSolve() {
  for (let k = 0; k < n; k++) {
    let p = k, best = 0;
    for (let i = k; i < n; i++) if (abs(M[i][k]) > best) { best = abs(M[i][k]); p = i; }
    if (best < 1e-9) { hi = { col: k, bad: true }; msg = `列 ${k + 1} の残りが全部 0 → 特異行列。逆行列がなく、解は 1 つに決まらない`; finished = true; return; }
    hi = { col: k, pivot: p, k };
    msg = `列 ${k + 1} の中から絶対値が最大の ${fmt(M[p][k])} をピボットに選ぶ（0 で割らない・誤差を小さくする）`;
    yield;
    if (p !== k) {
      [M[k], M[p]] = [M[p], M[k]]; [pi[k], pi[p]] = [pi[p], pi[k]];
      swapAnim = { a: k, b: p, t: 0 };
      hi = { swap: [k, p], k }; msg = `行 ${k + 1} と行 ${p + 1} を入れかえる。入れかえた記録が π（置換）`;
      yield;
    }
    for (let i = k + 1; i < n; i++) M[i][k] /= M[k][k];
    hi = { lcol: k, k }; msg = `ピボットの下の数をピボットで割る → これが L の列（何倍を引くかの記録）`;
    yield;
    for (let i = k + 1; i < n; i++) for (let j = k + 1; j < n; j++) M[i][j] -= M[i][k] * M[k][j];
    doneK = k + 1;
    hi = { schur: k, k }; msg = `右下の小さい行列から「l × ピボット行」を引く（シューア補行列）。行 ${k + 1} が U の行として確定`;
    yield;
  }
  for (let i = 0; i < n; i++) {
    let s = b0[pi[i]];
    for (let j = 0; j < i; j++) s -= M[i][j] * y[j];
    y[i] = s; hi = { fwd: i }; msg = `前進代入：Ly = Pb を上から解く。y${sub(i + 1)} = b${sub(pi[i] + 1)} − Σ l·y = ${fmt(s)}`;
    yield;
  }
  for (let i = n - 1; i >= 0; i--) {
    let s = y[i];
    for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j];
    x[i] = s / M[i][i]; hi = { back: i }; msg = `後退代入：Ux = y を下から解く。x${sub(i + 1)} = (y${sub(i + 1)} − Σ u·x) / ${fmt(M[i][i])} = ${fmt(x[i])}`;
    yield;
  }
  let err = 0;
  for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < n; j++) s += A0[i][j] * x[j]; err = max(err, abs(s - b0[i])); }
  msg = `完成！ 検算 |Ax − b| の最大 = ${err.toExponential(1)}。分解は Θ(n³)、解くのは Θ(n²) なので、b が変わっても速く解ける`;
  hi = {}; finished = true;
}

function draw() {
  background(18, 14, 26);
  if (auto && !finished && ++timer % speed === 0) advance();
  if (swapAnim) { swapAnim.t = min(1, swapAnim.t + 0.06); if (swapAnim.t >= 1) swapAnim = null; }

  let cs = min(88, (height - 330) / n, (width * 0.5) / (n + 1));
  let ox = 70, oy = 150;
  fill(235); noStroke(); textSize(26); textAlign(LEFT, BASELINE);
  text('LUP 分解で Ax = b を解く', 30, 50);
  textSize(15); fill(150);
  text('スペース：1 ステップ　A：自動再生' + (auto ? '（中）' : '') + '　R：やり直し　1：お手本 3×3　2：ランダム 4×4　3：特異行列　4：ピボットが必要な例', 30, 80);
  fill(78, 225, 190); text('■ L（下三角・対角は 1）', 30, 115);
  fill(255, 95, 109); text('■ U（上三角）', 230, 115);
  fill(150); text('□ まだ計算中の部分', 360, 115);

  // 作業行列（L と U を 1 枚に重ねて書く）
  for (let i = 0; i < n; i++) {
    let ry = i;
    if (swapAnim) { if (i === swapAnim.a) ry = lerp(swapAnim.b, swapAnim.a, ease(swapAnim.t)); if (i === swapAnim.b) ry = lerp(swapAnim.a, swapAnim.b, ease(swapAnim.t)); }
    for (let j = 0; j < n; j++) {
      let px = ox + j * cs, py = oy + ry * cs;
      let c = color(40, 34, 56);
      if (j < i && j < doneK) c = color(30, 90, 80);
      else if (j >= i && i < doneK) c = color(110, 40, 55);
      if (hi.lcol === hi.k && hi.lcol !== undefined && j === hi.k && i > hi.k) c = color(78, 225, 190);
      if (hi.schur !== undefined && i > hi.schur && j > hi.schur) c = color(255, 200, 90, 160);
      stroke(18, 14, 26); strokeWeight(3); fill(c); rect(px, py, cs, cs, 8);
      if (hi.col !== undefined && j === hi.col && i >= hi.col) { noFill(); stroke(hi.bad ? color(255, 60, 60) : color(255, 200, 90)); strokeWeight(3); rect(px + 3, py + 3, cs - 6, cs - 6, 6); }
      if (hi.pivot === i && j === hi.col) { noFill(); stroke(255); strokeWeight(5); rect(px + 2, py + 2, cs - 4, cs - 4, 6); }
      noStroke(); fill(240); textAlign(CENTER, CENTER); textSize(cs * 0.26);
      text(fmt(M[i][j]), px + cs / 2, py + cs / 2);
    }
  }
  // π, b, y, x の列
  let cols = [['π', pi.map(v => v + 1)], ['b', b0], ['y', y], ['x', x]];
  let vx = ox + n * cs + 40;
  for (let c = 0; c < cols.length; c++) {
    let [name, arr] = cols[c];
    fill(200); noStroke(); textSize(20); textAlign(CENTER, BASELINE); text(name, vx + c * (cs * 0.95) + cs * 0.4, oy - 12);
    for (let i = 0; i < n; i++) {
      let px = vx + c * (cs * 0.95), py = oy + i * cs;
      let on = (name === 'y' && hi.fwd === i) || (name === 'x' && hi.back === i);
      fill(on ? color(255, 200, 90) : color(32, 26, 44)); stroke(18, 14, 26); strokeWeight(3); rect(px, py, cs * 0.8, cs, 8);
      noStroke(); fill(on ? 20 : 230); textAlign(CENTER, CENTER); textSize(cs * 0.24);
      text(arr[i] === null ? '' : fmt(arr[i]), px + cs * 0.4, py + cs / 2);
    }
  }
  // 説明
  let my = oy + n * cs + 40;
  fill(32, 26, 44); noStroke(); rect(30, my, width - 60, 70, 12);
  fill(finished ? color(78, 225, 190) : color(240)); textAlign(LEFT, CENTER); textSize(18);
  text(msg, 50, my + 35);
  fill(150); textSize(15); textAlign(LEFT, TOP);
  text('なぜ分解する？　L と U は三角形なので、1 行ずつ代入するだけで解ける。いちばん重い分解（Θ(n³)）は 1 回だけで、右辺 b を何回変えても Θ(n²) で解ける。\nピボット選択（部分ピボット）がないと、0 で割ったり、小さい数で割って誤差が大きくなったりする。', 30, my + 90, width - 60);
}

function advance() { if (finished) return; let r = runner.next(); if (r.done) finished = true; }
function keyPressed() {
  if (key === ' ') advance();
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'r' || key === 'R') load(preset);
  if (key >= '1' && key <= '4') load(int(key));
}
function fmt(v) { if (v === null || v === undefined) return ''; if (abs(v - round(v)) < 1e-9) return String(round(v)); return v.toFixed(2); }
function sub(k) { return String(k).split('').map(c => '₀₁₂₃₄₅₆₇₈₉'[c]).join(''); }
function ease(t) { return t * t * (3 - 2 * t); }
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. 4 のお手本で、ピボットを「絶対値最大」ではなく「その行のまま」にすると何が起きる？（0 で割る）
// 2. 2 のランダムを何回か出して、π（入れかえの記録）がどう変わるか見る
// 3. b0 だけ変えて R。分解のステップは同じで、代入だけが変わることを確かめる
