// ============================================
// 05 再帰木とマスター定理
// 分割統治の計算時間 T(n) = a·T(n/b) + f(n) を「木」で描く。各段の横幅 = その段の仕事量
// 段ごとに仕事が減る → 根（いちばん上）が支配。同じ → 段の数 log n 倍。増える → 葉（いちばん下）が支配
// これがマスター定理の 3 つの場合。5・6 は分け方が不ぞろいな場合（アクラ＝バッジの方法）
// ←→：a（いくつに分けるか）　↑↓：b（何分の 1 にするか）　1〜4：f(n) = 1, n, n², n³
// 5：T(n/3)+T(2n/3)+n　6：T(n/2)+T(n/4)+n　0：a・b の設定にもどる
// ============================================

let A = 2, B = 2, D = 1;     // ★ T(n) = A·T(n/B) + n^D
let ab = 0;                  // 0 = マスター定理、5・6 = 不ぞろいの分割
let N = 4096;                // ★ 木を描くときの n

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function f(sz) { return Math.pow(max(sz, 1), D); }

// 段ごとのノード（大きさの列）を作る。数が多すぎるときは「同じ大きさが count 個」でまとめる
function levelsOf() {
  let levels = [];
  if (ab === 0) {
    let depth = 0, size = N;
    while (size >= 1 && depth < 14) {
      levels.push([{ size, count: Math.pow(A, depth) }]);
      size /= B; depth++;
    }
  } else {
    let parts = ab === 5 ? [1 / 3, 2 / 3] : [1 / 2, 1 / 4];
    let cur = [{ size: N, count: 1 }];
    for (let depth = 0; depth < 12 && cur.length; depth++) {
      levels.push(cur);
      let nxt = new Map();
      for (let nd of cur) for (let p of parts) {
        let s = nd.size * p;
        if (s < 1) continue;
        let key = s.toFixed(6);
        let e = nxt.get(key) || { size: s, count: 0 };
        e.count += nd.count; nxt.set(key, e);
      }
      cur = [...nxt.values()].sort((x, y) => y.size - x.size);
    }
  }
  return levels;
}

function levelCost(lv) { return lv.reduce((s, nd) => s + nd.count * (ab ? nd.size : f(nd.size)), 0); }

function draw() {
  background(285, 30, 10);
  let levels = levelsOf();
  let costs = levels.map(levelCost);
  let maxC = max(costs);
  let L = 60, W = width - 420, T = 140, rowH = min(48, (height - T - 60) / max(1, levels.length));
  for (let d = 0; d < levels.length; d++) {
    let y = T + d * rowH;
    let total = costs[d] / maxC * W;
    let x = L + (W - total) / 2;
    // 段の中の各ノードを並べる（多いときは最大 256 個に区切って描く）
    let segs = [];
    for (let nd of levels[d]) {
      let c = ab ? nd.size : f(nd.size);
      let k = min(nd.count, 256);
      for (let i = 0; i < k; i++) segs.push({ w: c * nd.count / k / maxC * W, size: nd.size });
      if (segs.length > 512) break;
    }
    for (let s of segs) {
      noStroke(); fill((200 + d * 14) % 360, 60, 90);
      rect(x, y, max(0.5, s.w - (s.w > 4 ? 1.5 : 0)), rowH - 10, 2);
      x += s.w;
    }
    fill(0, 0, 75); textSize(12); textAlign(LEFT, CENTER);
    let cnt = levels[d].reduce((s, nd) => s + nd.count, 0);
    text('深さ ' + d + '：' + fmt(cnt) + ' 個', L + W + 20, y + (rowH - 10) / 2);
    text('仕事 ' + fmt(costs[d]), L + W + 140, y + (rowH - 10) / 2);
  }
  // 結論
  let res = verdict();
  noStroke(); fill(0, 0, 100); textAlign(LEFT, BASELINE); textSize(22);
  text(formula() + '　→　' + res.ans, 20, 40);
  fill(50, 80, 100); textSize(16); text(res.why, 20, 68);
  fill(0, 0, 60); textSize(14);
  text('←→ a　↑↓ b　1〜4 f(n) = n^0..n^3　5・6 不ぞろいの分割　0 もどる　（棒の横幅 = その段の仕事の合計、いちばん大きい段を最大幅にした）', 20, 94);
  fill(0, 0, 70);
  text('全体の時間 ≈ 各段の仕事の合計 = ' + fmt(costs.reduce((s, c) => s + c, 0)) + '（n = ' + N + '）', L, height - 26);
}

function formula() {
  if (ab === 5) return 'T(n) = T(n/3) + T(2n/3) + n';
  if (ab === 6) return 'T(n) = T(n/2) + T(n/4) + n';
  let fs = ['1', 'n', 'n²', 'n³'][D];
  return 'T(n) = ' + (A === 1 ? '' : A) + 'T(n/' + B + ') + ' + fs;
}

function verdict() {
  if (ab) {
    // Σ a_i b_i^p = 1 を満たす p を二分法で求める
    let parts = ab === 5 ? [1 / 3, 2 / 3] : [1 / 2, 1 / 4];
    let lo = -2, hi = 4;
    for (let i = 0; i < 60; i++) { let p = (lo + hi) / 2; let s = parts.reduce((t, b) => t + Math.pow(b, p), 0); if (s > 1) lo = p; else hi = p; }
    let p = (lo + hi) / 2;
    if (abs(p - 1) < 1e-6) return { ans: 'Θ(n log n)', why: 'アクラ＝バッジ：Σ bᵢ^p = 1 となる p = 1、f(n) = n と同じ → 各段の仕事はほぼ同じ n、段の数 log n 倍' };
    if (p < 1) return { ans: 'Θ(n)', why: 'アクラ＝バッジ：p = ' + p.toFixed(3) + ' < 1 → 段ごとに仕事が減る（等比級数）、根の n が支配' };
    return { ans: 'Θ(n^' + p.toFixed(2) + ')', why: 'アクラ＝バッジ：p = ' + p.toFixed(3) + ' > 1 → 葉が支配' };
  }
  let c = Math.log(A) / Math.log(B);
  let cs = c.toFixed(2);
  if (abs(c - D) < 1e-9) return { ans: D === 0 ? 'Θ(log n)' : 'Θ(n' + (D === 1 ? '' : '^' + D) + ' log n)', why: '場合 2：log_b a = ' + cs + ' と f の次数 ' + D + ' が同じ → 各段の仕事が同じ、段の数 log n 倍' };
  if (c > D) return { ans: 'Θ(n^' + cs + ')', why: '場合 1：log_b a = ' + cs + ' > ' + D + ' → 下の段ほど仕事が増える、葉（a^(log_b n) = n^' + cs + ' 個）が支配' };
  return { ans: 'Θ(' + ['1', 'n', 'n²', 'n³'][D] + ')', why: '場合 3：log_b a = ' + cs + ' < ' + D + ' → 下の段ほど仕事が減る、根の f(n) が支配' };
}

function fmt(v) { if (v >= 1e6) { let e = floor(Math.log10(v)); return (v / Math.pow(10, e)).toFixed(1) + 'e' + e; } return round(v).toLocaleString(); }

function keyPressed() {
  if (key === RIGHT_ARROW) { A = min(9, A + 1); ab = 0; }
  if (key === LEFT_ARROW) { A = max(1, A - 1); ab = 0; }
  if (key === UP_ARROW) { B = min(4, B + 1); ab = 0; }
  if (key === DOWN_ARROW) { B = max(2, B - 1); ab = 0; }
  if (key >= '1' && key <= '4') { D = int(key) - 1; ab = 0; }
  if (key === '5' || key === '6') { ab = int(key); D = 1; }
  if (key === '0') ab = 0;
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. マージソート T(n) = 2T(n/2) + n、二分探索 T(n) = T(n/2) + 1、シュトラッセン 7T(n/2) + n² を作って答えを確かめる
// 2. 8T(n/2) + n² は場合いくつ？ 横幅の変わり方で説明しよう
// 3. 5 の T(n/3) + T(2n/3) + n は、木の左右で深さがちがう。それでも各段の仕事が n になる理由は？
