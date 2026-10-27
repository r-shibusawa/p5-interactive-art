// ============================================
// 07 フォーク・ジョイン並列と計算 DAG（並列フィボナッチ）
// 並列フィボナッチ fib(n)：fib(n−1) を spawn（別の人に任せる）しながら、自分は fib(n−2) を計算し、sync で待ち合わせる
// 丸 = ストランド（1 単位時間の仕事）、矢印 = 「これが終わってから」。ワーク T₁ = 丸の数、スパン T∞ = いちばん長い道
// 欲ばりスケジューラ：毎ステップ、準備のできた丸を P 個まで実行。T_P ≤ T₁/P + T∞（ブレントの定理）
// スペース = スケジュール再生・停止 / 上下 = n / 左右 = プロセッサ数 P / R = 最初から
// ============================================

let n = 6, P = 3;
let strands = [], deps = [];
let work = 0, span = 0;
let critical = new Set();
let doneAt = [], tick = 0, running = false, timer = 0;
let busyHistory = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  build();
}

// 並列フィボナッチ fib(n) の DAG をつくる。各呼び出しは 3 つのストランド：A（spawn まで）、B（呼び出しまで）、C（sync の後）
function build() {
  strands = []; deps = [];
  let xCounter = 0;
  function rec(k, depth) {
    if (k <= 1) { let id = strands.length; strands.push({ k, depth, x: xCounter++, kind: 'leaf' }); return { first: id, last: id }; }
    let A = strands.length; strands.push({ k, depth, kind: 'A' });
    let c1 = rec(k - 1, depth + 1);
    let B = strands.length; strands.push({ k, depth, kind: 'B' });
    let c2 = rec(k - 2, depth + 1);
    let C = strands.length; strands.push({ k, depth, kind: 'C' });
    strands[A].x = strands[c1.first].x - 0.6;
    strands[B].x = (strands[c1.last].x + strands[c2.first].x) / 2;
    strands[C].x = strands[c2.last].x + 0.6;
    deps.push([A, c1.first, 'spawn'], [A, B, 'cont'], [B, c2.first, 'call'], [c1.last, C, 'ret'], [c2.last, C, 'ret']);
    return { first: A, last: C };
  }
  rec(n, 0);
  xCounter = max(1, xCounter);
  let minX = min(strands.map((s) => s.x)), maxX = max(strands.map((s) => s.x));
  for (let s of strands) s.px = map(s.x, minX, maxX || 1, 60, width - 60);
  work = strands.length;
  // スパン：トポロジカル順（作った順）で最長路
  let longest = new Array(work).fill(1), from = new Array(work).fill(-1);
  let order = [...Array(work).keys()];
  let preds = strands.map(() => []);
  for (let [a, b] of deps) preds[b].push(a);
  // 依存の順に並べる
  let indeg = strands.map((_, i) => preds[i].length), q = order.filter((i) => indeg[i] === 0), topo = [];
  let succ = strands.map(() => []); for (let [a, b] of deps) succ[a].push(b);
  while (q.length) { let v = q.shift(); topo.push(v); for (let w of succ[v]) if (--indeg[w] === 0) q.push(w); }
  for (let v of topo) for (let a of preds[v]) if (longest[a] + 1 > longest[v]) { longest[v] = longest[a] + 1; from[v] = a; }
  span = max(longest);
  critical = new Set();
  let v = longest.indexOf(span);
  while (v >= 0) { critical.add(v); v = from[v]; }
  // 時間（層）で縦の位置：最長路の長さ
  let maxL = span;
  for (let i = 0; i < work; i++) strands[i].py = map(longest[i], 1, maxL, 120, height - 170);
  strands.forEach((s, i) => (s.preds = preds[i]));
  resetSchedule();
}

function resetSchedule() { doneAt = new Array(work).fill(-1); tick = 0; running = false; busyHistory = []; }

function scheduleTick() {
  let ready = [];
  for (let i = 0; i < work; i++) if (doneAt[i] < 0 && strands[i].preds.every((a) => doneAt[a] >= 0 && doneAt[a] < tick + 1)) ready.push(i);
  if (!ready.length) { running = false; return; }
  tick++;
  let run = ready.slice(0, P);
  run.forEach((i, k) => { doneAt[i] = tick; strands[i].proc = k; });
  busyHistory.push(run.length);
}

function draw() {
  background(200, 35, 9);
  if (running && ++timer % 12 === 0) scheduleTick();
  let r = constrain(260 / sqrt(work), 6, 22);
  for (let [a, b, kind] of deps) {
    let A = strands[a], B = strands[b];
    let crit = critical.has(a) && critical.has(b);
    stroke(crit ? color(0, 75, 100) : kind === 'spawn' ? color(140, 50, 70) : kind === 'ret' ? color(200, 20, 45) : color(45, 50, 70));
    strokeWeight(crit ? 3 : 1.2);
    line(A.px, A.py, B.px, B.py);
  }
  noStroke();
  for (let i = 0; i < work; i++) {
    let s = strands[i];
    if (doneAt[i] > 0) fill((s.proc * 360) / P, 70, 95);
    else fill(critical.has(i) ? color(0, 40, 80) : color(200, 10, 75));
    circle(s.px, s.py, r);
  }
  // 情報
  textAlign(LEFT, BASELINE);
  fill(0, 0, 100); textSize(18);
  text('スペース：スケジュール ' + (running ? '停止' : '再生') + '　上下：n = ' + n + '　左右：プロセッサ P = ' + P + '　R：最初から', 20, 36);
  textSize(15); fill(0, 0, 65);
  text('緑の矢印 = spawn（並列に始める）　黄 = 続き・呼び出し　灰 = return → sync　赤 = いちばん長い道（スパン）', 20, 62);
  let y = height - 120;
  textSize(19); fill(0, 0, 100);
  text('ワーク T₁ = ' + work + '　スパン T∞ = ' + span + '　並列度 T₁/T∞ = ' + nf(work / span, 1, 1), 20, y);
  let lower = max(ceil(work / P), span), upper = ceil(work / P) + span;
  fill(45, 80, 100);
  text('P = ' + P + ' のとき　下限 max(T₁/P, T∞) = ' + lower + '　≤　T_P = ' + (doneAt.every((d) => d > 0) ? tick : tick + '…') + '　≤　上限 T₁/P + T∞ = ' + upper, 20, y + 32);
  let complete = busyHistory.filter((b) => b === P).length;
  fill(0, 0, 75); textSize(16);
  text('全員が働いたステップ（完全）' + complete + '　手が空いた人がいたステップ（不完全）' + (busyHistory.length - complete) + '　→ 完全 ≤ T₁/P、不完全 ≤ T∞', 20, y + 62);
  // プロセッサごとの稼働グラフ
  let gx = width - 330, gy = 96, gw = 300, gh = 70;
  fill(200, 30, 15); rect(gx, gy, gw, gh, 6);
  let bw = gw / max(1, busyHistory.length);
  busyHistory.forEach((b, k) => { fill(140, 60, 90); rect(gx + k * bw, gy + gh - (b / P) * gh, max(1, bw - 1), (b / P) * gh); });
  fill(0, 0, 70); textSize(13); text('ステップごとの稼働数（上端 = P）', gx, gy + gh + 18);
}

function keyPressed() {
  if (key === ' ') { if (doneAt.every((d) => d > 0)) resetSchedule(); running = !running; }
  if (key === UP_ARROW) { n = min(10, n + 1); build(); }
  if (key === DOWN_ARROW) { n = max(2, n - 1); build(); }
  if (key === RIGHT_ARROW) { P = min(16, P + 1); resetSchedule(); }
  if (key === LEFT_ARROW) { P = max(1, P - 1); resetSchedule(); }
  if (key === 'r' || key === 'R') resetSchedule();
}

// ---------- やってみよう ----------
// 1. P = 1 なら T_P = T₁。P を増やすと、どこで速くならなくなる？（並列度 T₁/T∞ あたり）
// 2. n を 1 増やすとワークは約 1.6 倍、スパンは +2 しか増えない → 大きい n ほど並列向き
// 3. ready.slice(0, P) の選び方をランダムにしても、ブレントの上限は必ず守られる
