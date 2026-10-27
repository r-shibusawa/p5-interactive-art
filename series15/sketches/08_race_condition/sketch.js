// ============================================
// 08 並列ループと競合（レース）
// x = x + 1 は、実は 3 つの命令：① r = x（読む）② r = r + 1 ③ x = r（書く）
// 2 人が同時にやると、命令の順番しだいで x が 2 にならず 1 になる（決定性レース）
// 並列ループ parallel for で合計を 1 つの変数に足すと、足したはずの分が消える → 各自で足してから最後にまとめる（リダクション）
// 1：2 人の x++ / 2：並列ループの合計 / スペース = 1 命令 / A = 自動 / T = 1000 回試す / R = やり直し / 左右 = 人数（2）
// ============================================

let mode = 1;
let threads = [], shared = 0;
let schedule = [];       // 実行した命令の記録 [thread, op]
let hist = {};
let auto = false, timer = 0;
let workers = 4, N = 40;
let reduce = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  restart();
}

function restart() {
  shared = 0; schedule = [];
  if (mode === 1) threads = [0, 1].map((k) => ({ pc: 0, r: 0, items: [1], local: 0, idx: 0 }));
  else {
    threads = [];
    for (let k = 0; k < workers; k++) {
      let items = [];
      for (let i = k; i < N; i += workers) items.push(i + 1);
      threads.push({ pc: 0, r: 0, items, idx: 0, local: 0 });
    }
  }
}

// 1 命令だけ進める（どの人が進むかはランダム = OS まかせ）
function oneOp() {
  let cand = threads.map((t, k) => k).filter((k) => !finishedThread(threads[k]));
  if (!cand.length) { auto = false; return false; }
  let k = random(cand), t = threads[k];
  let v = t.items[t.idx];
  if (reduce && mode === 2) {
    // リダクション：自分の local に足すだけ（共有しない）。最後に 1 人ずつまとめる
    if (t.idx < t.items.length) { t.local += v; t.idx++; schedule.push([k, 'local += ' + v]); }
    else { shared += t.local; t.flushed = true; schedule.push([k, 'まとめ +' + t.local]); }
    return true;
  }
  if (t.pc === 0) { t.r = shared; schedule.push([k, 'r = x (' + t.r + ')']); }
  else if (t.pc === 1) { t.r += v; schedule.push([k, 'r = r + ' + v + ' (' + t.r + ')']); }
  else { shared = t.r; schedule.push([k, 'x = r (' + t.r + ')']); t.idx++; }
  t.pc = (t.pc + 1) % 3;
  return true;
}

function finishedThread(t) {
  if (reduce && mode === 2) return t.idx >= t.items.length && t.flushed;
  return t.idx >= t.items.length;
}

function expected() { return mode === 1 ? 2 : (N * (N + 1)) / 2; }

function trial() { restart(); let guard = 0; while (oneOp() && guard++ < 100000); hist[shared] = (hist[shared] || 0) + 1; }

function draw() {
  background(0, 30, 9);
  if (auto && ++timer % (mode === 1 ? 30 : 4) === 0) oneOp();
  let done = threads.every(finishedThread);
  // 共有変数
  let cx = width / 2;
  fill(done && shared !== expected() ? color(0, 80, 90) : color(45, 80, 95)); noStroke();
  rect(cx - 90, 100, 180, 80, 12);
  fill(0, 0, 10); textAlign(CENTER, CENTER); textSize(16); text('共有変数 x', cx, 118); textSize(32); text(shared, cx, 155);
  // 人（スレッド）
  let tw = min(220, (width - 80) / threads.length - 16);
  threads.forEach((t, k) => {
    let x = 40 + k * (tw + 16), y = 220;
    fill((k * 360) / threads.length, 50, 30); rect(x, y, tw, 150, 10);
    fill((k * 360) / threads.length, 60, 100); textSize(16); text('人 ' + (k + 1), x + tw / 2, y + 20);
    fill(0, 0, 90); textSize(14);
    if (reduce && mode === 2) text('local = ' + t.local, x + tw / 2, y + 60);
    else {
      text('レジスタ r = ' + t.r, x + tw / 2, y + 52);
      ['① r = x', '② r = r + ' + (t.items[t.idx] ?? ''), '③ x = r'].forEach((s, q) => { fill(t.pc === q && !finishedThread(t) ? color(50, 90, 100) : color(0, 0, 55)); text(s, x + tw / 2, y + 80 + q * 20); });
    }
    fill(0, 0, 60); textSize(12); text('残り ' + (t.items.length - t.idx) + ' 個', x + tw / 2, y + 140);
  });
  // 実行の記録（タイムライン）
  textAlign(LEFT, CENTER); textSize(13);
  let show = schedule.slice(-12);
  show.forEach(([k, s], q) => { fill((k * 360) / threads.length, 60, 100); text('人' + (k + 1) + '：' + s, 40 + ((k * 170) % (width - 260)), 400 + q * 20); });
  // ヒストグラム
  let keys = Object.keys(hist).map(Number).sort((a, b) => a - b);
  let total = keys.reduce((s, k) => s + hist[k], 0);
  if (total) {
    let gx = width - 360, gy = 420, gw = 320, gh = 180;
    fill(0, 20, 15); rect(gx, gy, gw, gh, 8);
    let bw = gw / keys.length;
    let mx = max(keys.map((k) => hist[k]));
    keys.forEach((k, q) => {
      fill(k === expected() ? color(140, 60, 90) : color(0, 70, 95));
      let h = (hist[k] / mx) * (gh - 40);
      rect(gx + q * bw + 2, gy + gh - 20 - h, bw - 4, h);
      if (keys.length <= 12) { fill(0, 0, 90); textAlign(CENTER, CENTER); text(k, gx + q * bw + bw / 2, gy + gh - 10); }
    });
    textAlign(LEFT, BASELINE); fill(0, 0, 80); textSize(14);
    text(total + ' 回の結果（緑 = 正しい ' + expected() + '）　正解率 ' + nf((100 * (hist[expected()] || 0)) / total, 1, 1) + '%', gx, gy - 8);
  }
  textAlign(LEFT, BASELINE);
  fill(0, 0, 100); textSize(18);
  text('1：2 人の x++　2：並列ループで 1〜' + N + ' の合計　スペース：1 命令　A：自動　T：1000 回試す　R：やり直し' + (mode === 2 ? '　S：リダクション ' + (reduce ? 'ON' : 'OFF') + '　左右：人数 ' + workers : ''), 20, 36);
  textSize(15); fill(0, 0, 65);
  text(mode === 1 ? '正解は 2。①①②②③③ の順だと 2 人とも 0 を読んで 1 を書く → 1 になる' : 'parallel for i = 1..' + N + '：x = x + i。正解は ' + expected() + '。S でリダクションにすると必ず正解', 20, 62);
  if (done) { textSize(22); fill(shared === expected() ? color(140, 60, 95) : color(0, 70, 100)); text('結果 x = ' + shared + (shared === expected() ? '　正しい' : '　まちがい！（' + (expected() - shared) + ' が消えた）'), 20, height - 26); }
}

function keyPressed() {
  if (key === '1' || key === '2') { mode = int(key); hist = {}; restart(); }
  if (key === ' ') oneOp();
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 't' || key === 'T') { for (let i = 0; i < 1000; i++) trial(); restart(); }
  if (key === 'r' || key === 'R') restart();
  if (key === 's' || key === 'S') { reduce = !reduce; hist = {}; restart(); }
  if (key === RIGHT_ARROW && mode === 2) { workers = min(6, workers + 1); hist = {}; restart(); }
  if (key === LEFT_ARROW && mode === 2) { workers = max(2, workers - 1); hist = {}; restart(); }
}

// ---------- やってみよう ----------
// 1. 1 で T を押す。正しい 2 になるのは何 % ？
// 2. 2 で人数を増やすと、正解率はどうなる？ S（リダクション）にすると？
// 3. 本物の並列プログラムでは「ロック」や「アトミック命令」でも防げるが、待ち時間が生まれる
