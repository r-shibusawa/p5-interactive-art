// ============================================
// 15 部分和の近似スキーム（FPTAS）
// 厳密に解く：「作れる合計のリスト」に数を 1 つずつ足して合流させる。リストは最大 2ⁿ 個にふくらむ
// 近似で解く：毎回リストを「間引く」。値が (1+δ) 倍以内の仲間は 1 つにまとめる
// 誤差 ε を決めると δ = ε / 2n。答えは最適の (1 − ε) 倍以上、時間は n と 1/ε の多項式 → 完全多項式時間近似スキーム
// 上下キー：ε を変える / スペース：1 段ずつ進める・自動 / R：新しい数 / 1〜3：お手本
// ============================================

let nums = [], t = 0;
let eps = 0.2;           // ★ 許す誤差
let rowsE = [], rowsA = [];
let shown = 0, auto = false;
let N_NUMS = 14;         // ★ 数の個数

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  preset(1);
}
function preset(k) {
  if (k === 1) { nums = [88, 152, 95, 149, 207]; t = 400; eps = 0.4; }   // 小さな例（ε = 0.4 で 389 が出る。最適は 396）
  else if (k === 2) { nums = []; for (let i = 0; i < N_NUMS; i++) nums.push(floor(random(100, 1000))); t = floor(nums.reduce((a, b) => a + b, 0) * 0.45); }
  else { nums = []; for (let i = 0; i < N_NUMS; i++) nums.push(pow(2, i) + floor(random(3))); t = floor(nums.reduce((a, b) => a + b, 0) * 0.6); }
  recompute();
}
function mergeLists(a, b) { return [...new Set(a.concat(b))].sort((x, y) => x - y); }
function trim(L, d) {
  let out = [L[0]], last = L[0];
  for (let i = 1; i < L.length; i++) if (L[i] > last * (1 + d)) { out.push(L[i]); last = L[i]; }
  return out;
}
function recompute() {
  let n = nums.length, d = eps / (2 * n);
  rowsE = [[0]]; rowsA = [[0]];
  for (let i = 0; i < n; i++) {
    let e = rowsE[i], a = rowsA[i];
    rowsE.push(mergeLists(e, e.map((v) => v + nums[i])).filter((v) => v <= t));
    rowsA.push(trim(mergeLists(a, a.map((v) => v + nums[i])), d).filter((v) => v <= t));
  }
  shown = min(shown, n);
}

function draw() {
  background(20, 30, 9);
  if (auto && frameCount % 30 === 0) { shown++; if (shown > nums.length) { shown = nums.length; auto = false; } }
  noStroke(); textAlign(LEFT, BASELINE); fill(0, 0, 100); textSize(18);
  text('上下：ε を変える　スペース：1 段（2 回目から自動）　R：新しい数　1：小さな例　2：ランダム 14 個　3：2 のべき乗に近い数', 20, 34);
  textSize(19); fill(45, 85, 100);
  text('数 {' + nums.join(', ') + '}　目標 t = ' + t + '　ε = ' + nf(eps, 1, 2) + '　δ = ε/2n = ' + nf(eps / (2 * nums.length), 1, 4), 20, 68, width - 40);

  let x0 = 150, x1 = width - 230, y0 = 120, rh = min(48, (height - 230) / (nums.length + 1));
  for (let i = 0; i <= shown; i++) {
    let y = y0 + i * rh;
    fill(0, 0, 70); textAlign(RIGHT, CENTER); textSize(14);
    text(i === 0 ? 'L₀' : '+' + nums[i - 1], x0 - 10, y + rh / 2);
    fill(0, 0, 15); rect(x0, y + 3, x1 - x0, rh - 6, 4);
    // 厳密（上半分）
    let px = new Set(rowsE[i].map((v) => floor(map(v, 0, t, x0, x1)))); // 同じ画素は 1 回だけ描く
    fill(200, 50, 100, 70);
    for (let x of px) rect(x - 1, y + 5, 2, (rh - 10) / 2);
    // 近似（下半分）
    for (let v of rowsA[i]) { fill(45, 90, 100); rect(map(v, 0, t, x0, x1) - 1.5, y + rh / 2, 3, (rh - 10) / 2); }
    textAlign(LEFT, CENTER); textSize(14);
    fill(200, 50, 100); text('厳密 ' + rowsE[i].length, x1 + 10, y + rh / 2 - 9);
    fill(45, 90, 100); text('近似 ' + rowsA[i].length, x1 + 10, y + rh / 2 + 9);
  }
  // t の線
  stroke(0, 0, 100); strokeWeight(2); line(x1, y0, x1, y0 + (shown + 1) * rh); noStroke();
  fill(0, 0, 100); textAlign(CENTER, TOP); textSize(14); text('t', x1, y0 + (shown + 1) * rh + 4);

  if (shown === nums.length) {
    let be = max(rowsE[shown]), ba = max(rowsA[shown]);
    textAlign(LEFT, BASELINE); textSize(20);
    let y = height - 56;
    fill(200, 50, 100); text('厳密の最大 = ' + be + '（リスト合計 ' + rowsE.reduce((s, r) => s + r.length, 0) + ' 個）', 20, y);
    fill(45, 90, 100); text('近似の最大 = ' + ba + '（リスト合計 ' + rowsA.reduce((s, r) => s + r.length, 0) + ' 個）　比 ' + nf(ba / be, 1, 4) + ' ≥ 1 − ε = ' + nf(1 - eps, 1, 2), 20, y + 30);
  } else {
    fill(0, 0, 60); textSize(15); textAlign(LEFT, BASELINE);
    text('青：作れる合計すべて（厳密）。黄：間引いたリスト。近い値は代表 1 つにまとめても、誤差は 1 段ごとに (1+δ) 倍までしか広がらない', 20, height - 24);
  }
}

function keyPressed() {
  if (key === UP_ARROW) { eps = min(0.9, eps + 0.05); recompute(); }
  if (key === DOWN_ARROW) { eps = max(0.01, eps - 0.05); recompute(); }
  if (key === ' ') { if (shown >= nums.length) { shown = 0; auto = false; } else if (shown > 0) auto = !auto; else shown = 1; }
  if (key === 'r' || key === 'R') preset(2);
  if (key >= '1' && key <= '3') preset(int(key));
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. 小さな例（1）で ε = 0.40 にすると答えは 389（最適 396）。ε を小さくすると？
// 2. 3（2 のべき乗に近い数）では厳密リストがほぼ 2 倍ずつふくらむ。近似リストは？
// 3. ε を 0.01 にするとリストは長くなるが、それでも n² / ε くらいに収まる
