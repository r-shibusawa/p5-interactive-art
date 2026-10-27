// ============================================
// 09 並列の行列かけ算（ブロックに分ける再帰版）
// C = A × B を 4 つのブロックに分けると、8 つの小さなかけ算になる
// 1：ふつうの 3 重ループ（1 人で n³ ステップ）
// 2：4 つずつ 2 回に分けて並列（同じ C のブロックに同時に書かない）→ スパン Θ(n)
// 3：8 つ全部を同時に（一時行列 T を使う）→ 最後に足し合わせ。スパン Θ(lg² n)、ただしメモリが増える
// スペース = 再生・停止 / 1〜3 = 方式 / 上下 = n / マウスを C のマスに乗せる = そのマスの計算の順番 / R = 最初から
// ============================================

let n = 8, mode = 2;
let A = [], B = [], C = [], terms = [];
let events = [];   // 各時間ステップに実行される {i, j, k}（足し算だけのステップは add）
let t = 0, playing = false, timer = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  rebuild();
}

function rebuild() {
  A = []; B = [];
  for (let i = 0; i < n; i++) { A.push([]); B.push([]); for (let j = 0; j < n; j++) { A[i].push(floor(random(4))); B[i].push(floor(random(4))); } }
  makeSchedule();
}

function makeSchedule() {
  events = [];
  let put = (time, ev) => { while (events.length <= time) events.push([]); events[time].push(ev); };
  if (mode === 1) {
    let time = 0;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) put(time++, { i, j, k });
  } else if (mode === 2) {
    // 再帰：前半 4 つ（C11 += A11·B11 など）を並列 → 後半 4 つ（C11 += A12·B21 など）を並列
    function rec(r0, c0, k0, size, time) {
      if (size === 1) { put(time, { i: r0, j: c0, k: k0 }); return time + 1; }
      let h = size / 2, end1 = time;
      for (let [di, dj] of [[0, 0], [0, h], [h, 0], [h, h]]) end1 = max(end1, rec(r0 + di, c0 + dj, k0, h, time));
      let end2 = end1;
      for (let [di, dj] of [[0, 0], [0, h], [h, 0], [h, h]]) end2 = max(end2, rec(r0 + di, c0 + dj, k0 + h, h, end1));
      return end2;
    }
    rec(0, 0, 0, n, 0);
  } else {
    // 8 つ同時：かけ算は全部 1 ステップ目、そのあと 2 つずつ足していく（lg n 段）
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) put(0, { i, j, k, mul: true });
    let levels = round(log(n) / log(2));
    for (let L = 1; L <= levels; L++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) put(L, { i, j, add: true, level: L });
  }
  resetRun();
}

function resetRun() {
  C = []; terms = [];
  for (let i = 0; i < n; i++) { C.push(new Array(n).fill(0)); terms.push(new Array(n).fill(0)); }
  t = 0; playing = false;
}

function stepTime() {
  if (t >= events.length) { playing = false; return; }
  for (let e of events[t]) {
    if (mode === 3) {
      // 3 は「段ごとに部分和が倍になる」と考える
      if (e.mul) terms[e.i][e.j] = 1;
      else terms[e.i][e.j] = min(n, terms[e.i][e.j] * 2);
      if (terms[e.i][e.j] === n || (n === 1 && e.mul)) C[e.i][e.j] = dotProduct(e.i, e.j);
    } else { C[e.i][e.j] += A[e.i][e.k] * B[e.k][e.j]; terms[e.i][e.j]++; }
  }
  t++;
}

function dotProduct(i, j) { let s = 0; for (let k = 0; k < n; k++) s += A[i][k] * B[k][j]; return s; }

function cell() { return min(46, (height - 260) / (2 * n), (width * 0.5) / (2 * n)); }

function draw() {
  background(30, 25, 9);
  if (playing) { let per = mode === 1 ? max(1, floor(n * n / 16)) : 1; if (++timer % (mode === 1 ? 2 : 20) === 0) for (let q = 0; q < per; q++) stepTime(); }
  let s = cell(), gx = 70 + n * s + 20, gy = 120 + n * s + 20;
  let cur = t > 0 && t - 1 < events.length ? events[t - 1] : [];
  let hiA = new Set(), hiB = new Set();
  for (let e of cur) if (e.k !== undefined && cur.length <= n * n) { hiA.add(e.i + ',' + e.k); hiB.add(e.k + ',' + e.j); }
  drawMat(A, 70, gy, s, 'A', (i, j) => hiA.has(i + ',' + j), 200);
  drawMat(B, gx, 120, s, 'B', (i, j) => hiB.has(i + ',' + j), 140);
  // C：色 = 何項まで足し終わったか
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    let f = terms[i][j] / n;
    stroke(30, 20, 25); fill(30 + f * 20, 20 + 70 * f, 18 + 77 * f); rect(gx + j * s, gy + i * s, s, s, 4);
    noStroke(); fill(0, 0, f >= 1 ? 10 : 90); textAlign(CENTER, CENTER); textSize(s * 0.36);
    if (f > 0) text(C[i][j], gx + (j + 0.5) * s, gy + (i + 0.5) * s);
  }
  fill(45, 70, 100); textSize(16); textAlign(LEFT, BASELINE); text('C = A × B', gx, gy - 8);
  // マウスで指したマスの計算順
  let mj = floor((mouseX - gx) / s), mi = floor((mouseY - gy) / s);
  let info = '';
  if (mi >= 0 && mi < n && mj >= 0 && mj < n && mode !== 3) {
    let ks = [];
    events.forEach((evs, time) => evs.forEach((e) => { if (e.i === mi && e.j === mj) ks.push('k=' + e.k + '@' + (time + 1)); }));
    info = 'C[' + mi + '][' + mj + '] の計算（k = 何番目の項 @ 時刻）：' + ks.join('  ');
  }
  // 情報パネル
  let px = gx + n * s + 40, py = 140;
  fill(0, 0, 100); textSize(22);
  text(['', '1：3 重ループ（1 人）', '2：4 つずつ 2 回並列', '3：8 つ同時 + 足し合わせ'][mode], px, py);
  textSize(18); fill(0, 0, 85);
  text('時刻 ' + t + ' / ' + events.length + '（= スパン）', px, py + 40);
  text('ワーク（かけ算の数）n³ = ' + n * n * n, px, py + 70);
  text('このステップで同時に動く数 ' + cur.length, px, py + 100);
  textSize(15); fill(0, 0, 70);
  let rows = [['n', '1 人', '方式 2', '方式 3'], ...[8, 64, 1024].map((m) => { let lg = round(log(m) / log(2)); return [m, m ** 3, m, (lg + 1) * lg / 2 + lg + 1]; })];
  rows.forEach((r, q) => r.forEach((v, c) => text(typeof v === 'number' && v > 1e6 ? v.toExponential(1) : v, px + c * 90, py + 150 + q * 24)));
  text('（スパンの目安。方式 3 は Θ(lg² n) だが、一時行列 T の分メモリが 2 倍）', px, py + 260);
  fill(45, 80, 100); textSize(15); text(info, 20, height - 56);
  fill(0, 0, 100); textSize(18);
  text('スペース：' + (playing ? '停止' : '再生') + '　1〜3：方式　上下：n = ' + n + '　R：最初から　マウスを C に乗せる = そのマスの計算の順番', 20, 36);
  textSize(15); fill(0, 0, 65);
  text('同じ C のマスに同時に足すと 08 の競合が起きる。方式 2 は「同じマスに書く 2 つ」を前半・後半に分けて避けている', 20, 62);
}

function drawMat(M, x0, y0, s, name, hi, hue) {
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    stroke(30, 20, 25); fill(hi(i, j) ? color(50, 90, 100) : color(hue, 30, 25 + M[i][j] * 12)); rect(x0 + j * s, y0 + i * s, s, s, 4);
    noStroke(); fill(0, 0, hi(i, j) ? 10 : 90); textAlign(CENTER, CENTER); textSize(s * 0.36); text(M[i][j], x0 + (j + 0.5) * s, y0 + (i + 0.5) * s);
  }
  fill(hue, 50, 95); textAlign(LEFT, BASELINE); textSize(16); text(name, x0, y0 - 8);
}

function keyPressed() {
  if (key === ' ') { if (t >= events.length) resetRun(); playing = !playing; }
  if (key >= '1' && key <= '3') { mode = int(key); makeSchedule(); }
  if (key === UP_ARROW) { n = min(16, n * 2); rebuild(); }
  if (key === DOWN_ARROW) { n = max(2, n / 2); rebuild(); }
  if (key === 'r' || key === 'R') resetRun();
}

// ---------- やってみよう ----------
// 1. 方式 1 と 2 で、終わるまでの時刻（スパン）を比べる。n を 2 倍にすると、それぞれ何倍？
// 2. 方式 2 で C のマスにマウスを乗せる。k の順番がバラバラでも、足す順番が変わるだけで答えは同じ
// 3. ワーク（かけ算の数）はどの方式でも n³。並列にしても仕事の総量は減らない
