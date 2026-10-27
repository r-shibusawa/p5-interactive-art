// ============================================
// 12 選択問題：最小・最大と中央値
// 「i 番目に小さい数」を、全部並べずに見つける
// 1：最小と最大を同時に。2 個ずつ組にすると 2n 回でなく約 1.5n 回の比較で済む
// 2：RANDOMIZED-SELECT。クイックソートの分割を片側だけくり返す。平均 Θ(n)
// 3：SELECT（中央値の中央値）。5 個ずつの組の中央値の、さらに中央値をピボットにして、最悪でも Θ(n)
// スペース：再生／停止　→：1 手　1〜3：方法　←：i を小さく　↑↓ 速さ　R：新しい数列
// ============================================

let n = 45;              // ★ 要素数
let speed = 6;
let a = [], gen, algo = 2, target = 0, playing = true, acc = 0, done = false, comparisons = 0;
let st = { lo: -1, hi: -1, p: -1, j: -1, groups: [], meds: [], answer: -1, mn: -1, mx: -1 };
let rounds = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  target = floor(n / 2);
  reset();
}

function reset() {
  a = [];
  for (let i = 0; i < n; i++) a.push(floor(random(1, 100)));
  restart();
}

function restart() {
  comparisons = 0; rounds = 0; done = false;
  st = { lo: -1, hi: -1, p: -1, j: -1, groups: [], meds: [], answer: -1, mn: -1, mx: -1 };
  if (a.length === 0) { done = true; return; }
  target = constrain(target, 0, a.length - 1);
  gen = algo === 1 ? minMax() : algo === 2 ? randSelect(0, a.length - 1, target) : momSelect(0, a.length - 1, target);
}

function less(x, y) { comparisons++; return x < y; }

// 最小と最大を同時に
function* minMax() {
  let mn = 0, mx = 0, start = 1;      // 奇数個なら最初の 1 個を最小・最大にする
  if (a.length % 2 === 0) { if (less(a[1], a[0])) { mn = 1; mx = 0; } else { mn = 0; mx = 1; } start = 2; }
  st.mn = mn; st.mx = mx; yield;
  for (let i = start; i + 1 < a.length; i += 2) {
    let small = i, big = i + 1;
    if (less(a[i + 1], a[i])) { small = i + 1; big = i; }   // まず 2 個を比べて
    if (less(a[small], a[mn])) mn = small;                  // 小さいほうは最小と
    if (less(a[mx], a[big])) mx = big;                      // 大きいほうは最大と
    st = { ...st, mn, mx, j: i };
    yield;
  }
  st.j = -1; done = true;
}

function swap(i, j) { [a[i], a[j]] = [a[j], a[i]]; }

function* partitionAround(lo, hi, pIdx) {
  swap(pIdx, hi);
  let x = a[hi], i = lo - 1;
  for (let j = lo; j < hi; j++) {
    comparisons++;
    if (a[j] <= x) { i++; swap(i, j); }
    st.j = j; st.p = hi;
    if ((j - lo) % 3 === 0) yield;
  }
  swap(i + 1, hi);
  st.p = i + 1; st.j = -1;
  yield;
  return i + 1;
}

// 乱択選択（i は 0 始まり）
function* randSelect(lo, hi, i) {
  while (true) {
    st.lo = lo; st.hi = hi; rounds++;
    if (lo === hi) { st.answer = lo; done = true; return; }
    let q = yield* partitionAround(lo, hi, floor(random(lo, hi + 1)));
    if (q === i) { st.answer = q; st.lo = q; st.hi = q; done = true; return; }
    if (i < q) hi = q - 1; else lo = q + 1;
  }
}

// 中央値の中央値を（アニメなしで）求める：添字を返す
function momIndex(lo, hi) {
  let vals = [];
  for (let g = lo; g <= hi; g += 5) {
    let grp = a.slice(g, min(g + 5, hi + 1)).sort((x, y) => { comparisons++; return x - y; });
    vals.push(grp[floor((grp.length - 1) / 2)]);
  }
  while (vals.length > 1) {   // 再帰の代わりに、中央値の列にもう一度同じことをする
    let nxt = [];
    for (let g = 0; g < vals.length; g += 5) { let grp = vals.slice(g, g + 5).sort((x, y) => { comparisons++; return x - y; }); nxt.push(grp[floor((grp.length - 1) / 2)]); }
    vals = nxt;
  }
  for (let k = lo; k <= hi; k++) if (a[k] === vals[0]) return k;
  return lo;
}

// 中央値の中央値による選択
function* momSelect(lo, hi, i) {
  while (true) {
    st.lo = lo; st.hi = hi; rounds++;
    if (lo === hi) { st.answer = lo; done = true; return; }
    // 5 個ずつの組を作って、組ごとに並べる
    st.groups = [];
    for (let g = lo; g <= hi; g += 5) {
      let e = min(g + 4, hi);
      let grp = a.slice(g, e + 1).sort((x, y) => { comparisons++; return x - y; });
      for (let k = 0; k < grp.length; k++) a[g + k] = grp[k];
      st.groups.push([g, e]);
      yield;
    }
    st.meds = st.groups.map(([g, e]) => g + floor((e - g) / 2));
    yield;
    let pIdx = momIndex(lo, hi);
    st.p = pIdx; yield;
    st.groups = []; st.meds = [];
    let q = yield* partitionAround(lo, hi, pIdx);
    if (q === i) { st.answer = q; st.lo = q; st.hi = q; done = true; return; }
    if (i < q) hi = q - 1; else lo = q + 1;
  }
}

function advance() { if (!done) gen.next(); }

function draw() {
  background(300, 25, 9);
  if (playing && !done) { acc += speed / 60; while (acc >= 1) { advance(); acc--; } }
  let L = 60, W = width - 120, baseY = height - 130, H = height - 320;
  let w = W / max(1, a.length);
  for (let [g, e] of st.groups) { noStroke(); fill((g * 13) % 360, 40, 30); rect(L + g * w, baseY + 6, (e - g + 1) * w, 10, 3); }
  for (let k = 0; k < a.length; k++) {
    let h = a[k] * H / 100;
    let inR = algo === 1 || (k >= st.lo && k <= st.hi);
    let c = inR ? color(270, 30, 70) : color(0, 0, 22);
    if (st.meds.includes(k)) c = color(190, 70, 95);
    if (k === st.j) c = color(45, 90, 100);
    if (k === st.p && algo !== 1) c = color(330, 80, 100);
    if (k === st.mn) c = color(200, 80, 100);
    if (k === st.mx) c = color(10, 80, 100);
    if (k === st.answer) c = color(140, 80, 100);
    noStroke(); fill(c); rect(L + k * w + 1, baseY - h, w - 2, h, 2);
  }
  if (algo !== 1) {
    noStroke(); fill(140, 80, 100); textAlign(CENTER, TOP); textSize(14);
    text('▲ ' + (target + 1) + ' 番目', L + target * w + w / 2, baseY + 22);
  }
  let names = ['', '最小と最大を同時に', 'RANDOMIZED-SELECT（平均 Θ(n)）', 'SELECT 中央値の中央値（最悪 Θ(n)）'];
  noStroke(); fill(0, 0, 100); textAlign(LEFT, BASELINE); textSize(22);
  let res = '';
  if (done && algo === 1 && a.length) res = '　最小 ' + a[st.mn] + '・最大 ' + a[st.mx];
  if (done && algo !== 1 && st.answer >= 0) res = '　答え：' + (target + 1) + ' 番目に小さいのは ' + a[st.answer];
  text(names[algo] + '　比較 ' + comparisons + ' 回' + res, 20, 40);
  fill(0, 0, 65); textSize(15);
  text('スペース：' + (playing ? '停止' : '再生') + '　→：1手　1〜3 方法　← i を小さく（R で i もそのまま新しい数列）　↑↓ 速さ ' + speed, 20, 68);
  text(algo === 1 ? '2 つずつ組にして比べる：約 3n/2 = ' + floor(3 * n / 2) + ' 回（別々に探すと 2n − 2 = ' + (2 * n - 2) + ' 回）'
    : '灰色 = もう調べなくてよい部分。ピンク = ピボット。答えがある側だけ残す' + (algo === 3 ? '。水色 = 5 個組の中央値' : ''), 20, 92);
}

function keyPressed() {
  if (key === ' ') playing = !playing;
  if (key === RIGHT_ARROW) { playing = false; advance(); }
  if (key === LEFT_ARROW) { target = (target - 1 + max(1, a.length)) % max(1, a.length); restart(); }
  if (key >= '1' && key <= '3') { algo = int(key); restart(); }
  if (key === 'r' || key === 'R') reset();
  if (key === UP_ARROW) speed = min(240, speed * 2);
  if (key === DOWN_ARROW) speed = max(1, speed / 2);
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. n を 2 倍にして、2 と 3 の比較回数がほぼ 2 倍（= Θ(n)）になるか確かめる
// 2. 3 の組の大きさを 5 から 3 にすると、最悪 Θ(n) が保証されなくなる。なぜか考えよう
// 3. 中央値は「平均値」とどうちがう？ 大きな外れ値を 1 つ入れて比べよう
