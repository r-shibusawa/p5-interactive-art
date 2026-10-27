// ============================================
// 15 確率の直感をきたえる（誕生日・ボールと箱・連）
// 乱択アルゴリズムの解析でよく使う 3 つの例
// 1：誕生日のパラドックス。何人集まると「同じ誕生日の 2 人」がいる確率が 50% を超える？ → たった 23 人
//    （ハッシュ表の衝突（シリーズ11）と同じ計算）
// 2：ボールと箱。b 個の箱にランダムに投げて、全部の箱が埋まるまで何個？ → 約 b ln b 個（クーポン収集）
// 3：連（ストリーク）。コインを n 回投げたとき、表が続く最長の長さは？ → 約 log₂ n
// 1〜3：モード　スペース／クリック：1 つ進める　A：1000 回まとめて試す　R：リセット
// ============================================

let mode = 1;
let bins = 30;           // ★ 2 の箱の数
let flips = 256;         // ★ 3 のコインを投げる回数
let days = [], people = 0, found = -1, hist = [], trials = 0;
let box = [], balls = 0;
let coins = [], best = { s: 0, len: 0 };

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  resetAll();
}

function resetAll() { hist = []; trials = 0; resetOne(); }
function resetOne() {
  days = new Array(365).fill(0); people = 0; found = -1;
  box = new Array(bins).fill(0); balls = 0;
  coins = []; best = { s: 0, len: 0 };
}

function addOne() {
  if (mode === 1) {
    if (found >= 0) { resetOne(); return; }
    let d = floor(random(365)); days[d]++; people++;
    if (days[d] === 2) { found = d; record(people); }
  }
  if (mode === 2) {
    if (box.every(c => c > 0)) { resetOne(); return; }
    box[floor(random(bins))]++; balls++;
    if (box.every(c => c > 0)) record(balls);
  }
  if (mode === 3) {
    if (coins.length >= flips) { resetOne(); return; }
    for (let k = 0; k < 16 && coins.length < flips; k++) coins.push(random() < 0.5);
    best = longest(coins);
    if (coins.length >= flips) record(best.len);
  }
}

function longest(cs) {
  let b = { s: 0, len: 0 }, run = 0;
  for (let i = 0; i < cs.length; i++) { run = cs[i] ? run + 1 : 0; if (run > b.len) b = { s: i - run + 1, len: run }; }
  return b;
}

function record(v) { hist[v] = (hist[v] || 0) + 1; trials++; }

function fastTrial() {
  if (mode === 1) { let seen = new Set(), k = 0; while (true) { k++; let d = floor(random(365)); if (seen.has(d)) break; seen.add(d); } record(k); }
  if (mode === 2) { let filled = new Set(), k = 0; while (filled.size < bins) { k++; filled.add(floor(random(bins))); } record(k); }
  if (mode === 3) { let cs = []; for (let i = 0; i < flips; i++) cs.push(random() < 0.5); record(longest(cs).len); }
}

function draw() {
  background(190, 25, 9);
  let L = 60, W = width - 120;
  noStroke(); textAlign(LEFT, BASELINE);
  let topH = height * 0.42;
  if (mode === 1) {
    let cw = W / 31, ch = (topH - 40) / 12;
    let ml = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31], start = 0, m = 0;
    for (let d = 0; d < 365; d++) {
      if (d >= start + ml[m]) { start += ml[m]; m++; }
      let dd = d - start;
      fill(days[d] === 0 ? color(190, 20, 20) : days[d] === 1 ? color(140, 60, 80) : color(0, 80, 100));
      rect(L + dd * cw + 1, 120 + m * ch + 1, cw - 2, ch - 2, 2);
    }
    let p = 1; for (let k = 0; k < people; k++) p *= (365 - k) / 365;
    fill(0, 0, 90); textSize(16);
    text(people + ' 人　同じ誕生日がいる確率 1 − (365·364·…)/365^k = ' + ((1 - p) * 100).toFixed(1) + '%' + (found >= 0 ? '　→ ' + monthOf(found) + ' 月に 2 人！' : ''), L, 112);
  }
  if (mode === 2) {
    let bw = W / bins, mx = max(4, ...box);
    for (let i = 0; i < bins; i++) {
      fill(box[i] ? color(30 + i * 8, 60, 85) : color(0, 70, 40));
      let h = box[i] / mx * (topH - 60);
      rect(L + i * bw + 3, 120 + topH - 60 - h, bw - 6, max(3, h), 4);
    }
    let empty = box.filter(c => c === 0).length;
    fill(0, 0, 90); textSize(16);
    text(balls + ' 個投げた　空の箱 ' + empty + '　（期待値 b·H_b ≈ b ln b = ' + (bins * Hn(bins)).toFixed(1) + ' 個）', L, 112);
  }
  if (mode === 3) {
    let per = 64, cw = W / per, ch = min(28, (topH - 40) / ceil(flips / per));
    for (let i = 0; i < coins.length; i++) {
      let inBest = i >= best.s && i < best.s + best.len;
      fill(coins[i] ? (inBest ? color(45, 100, 100) : color(45, 50, 70)) : color(220, 30, 35));
      circle(L + (i % per) * cw + cw / 2, 130 + floor(i / per) * ch + ch / 2, min(cw, ch) * 0.8);
    }
    fill(0, 0, 90); textSize(16);
    text(coins.length + ' 回投げた（黄 = 表）　最長の連 ' + best.len + '　（log₂ n = ' + Math.log2(max(2, coins.length)).toFixed(1) + '）', L, 112);
  }
  // ヒストグラム
  let by = height - 50, hh = height - topH - 190;
  let keys = Object.keys(hist).map(Number);
  if (keys.length) {
    let lo = min(keys), hi = max(keys), mxc = max(...keys.map(k => hist[k]));
    let bw = W / (hi - lo + 1);
    for (let k = lo; k <= hi; k++) {
      let c = hist[k] || 0;
      fill(260, 50, 80); rect(L + (k - lo) * bw + 1, by - c / mxc * hh, max(1, bw - 2), c / mxc * hh);
      if (bw > 18 || k % 5 === 0) { fill(0, 0, 55); textSize(10); textAlign(CENTER, TOP); text(k, L + (k - lo) * bw + bw / 2, by + 3); }
    }
    let mean = keys.reduce((s, k) => s + k * hist[k], 0) / trials;
    textAlign(LEFT, BASELINE); fill(45, 90, 100); textSize(15);
    text('ヒストグラム（' + trials + ' 回）　平均 ' + mean.toFixed(2) + '　' + ['', '理論：約 23 人で 50%、平均 ≈ 24.6 人', '理論：b·H_b = ' + (bins * Hn(bins)).toFixed(1), '理論：約 log₂ n = ' + Math.log2(flips).toFixed(0) + '（±数個）'][mode], L, by - hh - 14);
  }
  let titles = ['', '誕生日のパラドックス', 'ボールと箱（全部埋まるまで）', 'コインの連（いちばん長い表の続き）'];
  fill(0, 0, 100); textSize(22); textAlign(LEFT, BASELINE);
  text(titles[mode], 20, 40);
  fill(0, 0, 65); textSize(15);
  text('1〜3：モード　スペース／クリック：1 つ進める　A：1000 回まとめて　R：リセット', 20, 68);
}

function monthOf(d) { let ml = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31], m = 0; while (d >= ml[m]) { d -= ml[m]; m++; } return m + 1; }
function Hn(b) { let s = 0; for (let i = 1; i <= b; i++) s += 1 / i; return s; }

function keyPressed() {
  if (key >= '1' && key <= '3') { mode = int(key); resetAll(); }
  if (key === ' ') addOne();
  if (key === 'a' || key === 'A') for (let i = 0; i < 1000; i++) fastTrial();
  if (key === 'r' || key === 'R') resetAll();
}
function mousePressed() { addOne(); }
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. 誕生日を「1 年 = 1000 日」にすると、50% になる人数は何人？（約 √(2·1000·ln 2)）
// 2. 箱の数 bins を 2 倍にすると、必要なボールは 2 倍より多い？少ない？
// 3. 人が「ランダムっぽく」書いた表裏の列は、最長の連が短すぎることが多い。自分で 64 個書いて比べよう
