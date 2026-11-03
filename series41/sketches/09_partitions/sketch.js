// ============================================
// 09 整数分割とヤング図形
// n を正の整数の和に分ける方法（順番はちがっても同じ）の数 p(n)：4 = 4 = 3+1 = 2+2 = 2+1+1 = 1+1+1+1 → p(4) = 5
// 各分割はヤング図形（箱を左づめに積む）で描ける。転置すると「共役分割」になる
// ↑↓ = n（1〜14）/ ←→ or クリック = 分割を選ぶ / T = 転置アニメ / スペース = 自動で次へ
// ============================================

let n = 6;                // ★ 分割する数
let parts = [];           // 分割の一覧（各要素は降順の配列）
let sel = 0;
let auto = true;
let tick = 0;
let flip = 0;             // 0 = もとの図形, 1 = 転置（アニメで 0↔1）
let flipTarget = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  rebuild();
}

// ★ 分割を全部つくる：大きい数から順に（降順）
function rebuild() {
  parts = [];
  function rec(left, maxPart, cur) {
    if (left === 0) { parts.push(cur.slice()); return; }
    for (let p = Math.min(left, maxPart); p >= 1; p--) { cur.push(p); rec(left - p, p, cur); cur.pop(); }
  }
  rec(n, n, []);
  sel = 0; flip = 0; flipTarget = 0;
}

// 共役分割：列の長さを読む
function conjugate(lam) {
  let out = [];
  for (let j = 0; j < (lam[0] || 0); j++) { let c = 0; for (let v of lam) if (v > j) c++; out.push(c); }
  return out;
}

// ★ 五角数定理による p(n)：p(n) = Σ (−1)^{k+1} [ p(n − k(3k−1)/2) + p(n − k(3k+1)/2) ]
function partitionNumbers(N) {
  let p = [1];
  for (let m = 1; m <= N; m++) {
    let s = 0;
    for (let k = 1; ; k++) {
      let g1 = (k * (3 * k - 1)) / 2, g2 = (k * (3 * k + 1)) / 2;
      if (g1 > m) break;
      let sign = k % 2 === 1 ? 1 : -1;
      s += sign * p[m - g1];
      if (g2 <= m) s += sign * p[m - g2];
    }
    p.push(s);
  }
  return p;
}

function draw() {
  background(224, 28, 11);
  if (auto) { tick += deltaTime / 1000; if (tick > 1.0) { tick = 0; sel = (sel + 1) % parts.length; } }
  flip += (flipTarget - flip) * 0.1;
  let lam = parts[sel], conj = conjugate(lam);

  // 一覧（左）
  let lx = 30, ly = 110, rowH = parts.length > 60 ? 16 : parts.length > 30 ? 20 : 26;
  let perCol = Math.floor((height - ly - 30) / rowH), colW = 170;
  textSize(parts.length > 60 ? 12 : 14);
  for (let i = 0; i < parts.length; i++) {
    let c = Math.floor(i / perCol), r = i % perCol;
    let x = lx + c * colW, y = ly + r * rowH;
    if (x > width * 0.45) break;
    let isSelf = parts[i].join(',') === conjugate(parts[i]).join(',');
    if (i === sel) { noStroke(); fill(50, 80, 100, 30); rect(x - 6, y - rowH + 6, colW - 10, rowH, 4); }
    noStroke();
    fill(isSelf ? 330 : 0, isSelf ? 60 : 0, isSelf ? 100 : 85);
    text(parts[i].join(' + '), x, y);
  }

  // ヤング図形（中央）：転置アニメ（箱 (i,j) → (j,i) へ移動）
  let cell = Math.min(40, 360 / Math.max(lam.length, lam[0]));
  let gx = width * 0.52, gy = 160;
  noStroke();
  for (let i = 0; i < lam.length; i++) for (let j = 0; j < lam[i]; j++) {
    let x = gx + (j * (1 - flip) + i * flip) * cell, y = gy + (i * (1 - flip) + j * flip) * cell;
    fill((i * 40 + 180) % 360, 55, 95);
    rect(x, y, cell - 2, cell - 2, 3);
  }
  fill(0, 0, 100); textSize(16);
  text('λ = (' + lam.join(', ') + ')　箱 ' + n + ' 個、行 ' + lam.length + ' 本', gx, gy - 20);
  fill(0, 0, 70); textSize(14);
  let below = gy + Math.max(lam.length, lam[0]) * cell + 30;
  text("共役 λ' = (" + conj.join(', ') + ')' + (lam.join(',') === conj.join(',') ? '　自己共役！' : ''), gx, below);
  text('転置（T）：行と列を入れかえる → 行の数 k の分割 ↔ 最大の数が k の分割', gx, below + 22);

  // p(n) の表（右下）
  let P = partitionNumbers(20);
  let tx = width * 0.52, ty = height - 130;
  fill(0, 0, 85); textSize(14);
  text('p(n)：' + P.slice(0, 11).map((v, i) => i + ':' + v).join('  '), tx, ty);
  text('　　　' + P.slice(11, 21).map((v, i) => (i + 11) + ':' + v).join('  '), tx, ty + 20);
  fill(0, 0, 60);
  text('五角数定理：p(n) = p(n−1) + p(n−2) − p(n−5) − p(n−7) + p(n−12) + p(n−15) − …', tx, ty + 48);
  text('（1, 2, 5, 7, 12, 15, … = 一般五角数 k(3k∓1)/2。符号は 2 つずつ交代）', tx, ty + 70);

  fill(0, 0, 100); textSize(18);
  text('n = ' + n + '（↑↓）　p(' + n + ') = ' + parts.length + '　［' + (sel + 1) + ' / ' + parts.length + '］ ←→ / クリック　T：転置　スペース：自動 ' + (auto ? 'ON' : 'off'), 20, 40);
  fill(0, 0, 60); textSize(15);
  text('左の一覧：ピンクは自己共役（転置しても同じ）。p(n) は母関数 Π 1/(1−x^k)（04）でも計算できる', 20, 68);
}

function mousePressed() {
  let ly = 110, rowH = parts.length > 60 ? 16 : parts.length > 30 ? 20 : 26;
  let perCol = Math.floor((height - ly - 30) / rowH), colW = 170;
  let c = Math.floor((mouseX - 24) / colW), r = Math.floor((mouseY - ly + rowH - 6) / rowH);
  if (c >= 0 && r >= 0 && r < perCol) { let i = c * perCol + r; if (i < parts.length && mouseX < width * 0.45) { sel = i; auto = false; } }
}

function keyPressed() {
  if (key === UP_ARROW && n < 14) { n++; rebuild(); }
  if (key === DOWN_ARROW && n > 1) { n--; rebuild(); }
  if (key === RIGHT_ARROW) { sel = (sel + 1) % parts.length; auto = false; }
  if (key === LEFT_ARROW) { sel = (sel - 1 + parts.length) % parts.length; auto = false; }
  if (key === 't' || key === 'T') flipTarget = 1 - flipTarget;
  if (key === ' ') auto = !auto;
}

// ---------- やってみよう ----------
// 1. n = 5 の 7 通りを順に転置し、どの分割がどれと対になるか表にしよう。自己共役はいくつ？
// 2. 「相異なる数だけの分割」と「奇数だけの分割」の数は同じ（オイラー）。n = 7 で両方数えてみよう
// 3. 行数が 2 本以下の分割の数は floor(n/2)+1。一覧の中から数えて確かめよう
// 4. rec を書きかえて「各数は k 以下」という条件をつけると、転置で「行数 k 以下」と同じ数になる
