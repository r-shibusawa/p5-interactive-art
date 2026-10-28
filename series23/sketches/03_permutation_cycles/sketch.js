// ============================================
// 03 置換と巡回表記
// n 個のボールの並べかえ（置換）を「巡回」に分けて書く：(1 3 5)(2 4) は 1→3→5→1 と 2→4→2
//   偶奇 = 入れかえ（互換）の回数の偶奇。位数 = 巡回の長さの最小公倍数
// ボールを 2 つクリック = 入れかえ / スペース = 同じ並べかえをもう 1 回（σ², σ³, …）/ X = ランダム
// ↑↓ = ボールの数 / 0 = リセット
// ============================================

let n = 6;               // ★ ボールの数
let arr = [];            // arr[位置] = ボールの番号（0 始まり）
let sigma = [];          // 「並べかえ」= 1 回目にできた並び（もう 1 回やるときに使う）
let swaps = 0;           // 入れかえの回数
let picked = -1;
let anim = null;         // { from: [位置], t }
let power = 1;           // 何回目か（σᵏ）

function setup() {
  createCanvas(windowWidth, windowHeight);
  resetAll();
}
function resetAll() { arr = [...Array(n).keys()]; sigma = arr.slice(); swaps = 0; picked = -1; anim = null; power = 1; }

function slotX(i) { return width * 0.5 + (i - (n - 1) / 2) * min(110, (width - 120) / n); }
function slotY() { return height * 0.36; }

function draw() {
  background(250, 246, 238);
  let r = min(80, (width - 120) / n * 0.7);

  // 巡回の矢印（ボールがもとの位置から今の位置へ）
  let cyc = cycles(arr);
  noFill();
  for (let ci = 0; ci < cyc.length; ci++) {
    let c = cyc[ci];
    if (c.length < 2) continue;
    colorMode(HSB); stroke((ci * 67) % 360, 60, 80, 0.8); colorMode(RGB);
    strokeWeight(3);
    for (let a of c) {
      let b = arr[a];               // 位置 a にあるのはボール b（もとは位置 b）→ 位置 b から a へ弧
      let x1 = slotX(b), x2 = slotX(a);
      let mid = (x1 + x2) / 2, h = abs(x2 - x1) * 0.18 + 16;
      arc(mid, slotY() + r * 0.8, abs(x2 - x1), h * 2, 0, PI);
      // 矢じり（b の位置 → a の位置へ）
      let ax = x2, ay = slotY() + r * 0.8;
      noStroke(); colorMode(HSB); fill((ci * 67) % 360, 60, 80, 0.8); colorMode(RGB);
      triangle(ax, ay, ax - 7, ay + 14, ax + 7, ay + 14);
      noFill(); colorMode(HSB); stroke((ci * 67) % 360, 60, 80, 0.8); colorMode(RGB);
    }
  }

  // ボール
  for (let p = 0; p < n; p++) {
    let b = arr[p];
    let x = slotX(p), y = slotY();
    if (anim) {   // 前の位置から弧を描いて移動
      let from = anim.from[p];
      let e = anim.t * anim.t * (3 - 2 * anim.t);
      x = lerp(slotX(from), slotX(p), e);
      y = slotY() - sin(e * PI) * (40 + abs(from - p) * 18);
    }
    noStroke();
    colorMode(HSB); fill((b * 360) / n, 60, 92); colorMode(RGB);
    if (p === picked) { stroke(30); strokeWeight(4); }
    circle(x, y, r);
    noStroke(); fill(255); textAlign(CENTER, CENTER); textSize(r * 0.45);
    text(b + 1, x, y);
    fill(140); textSize(14);
    text('位置 ' + (p + 1), slotX(p), slotY() - r * 0.5 - 30);
    textAlign(LEFT, BASELINE);
  }
  if (anim) { anim.t += 0.035; if (anim.t >= 1) anim = null; }

  // 文字
  noStroke(); fill(30); textSize(18);
  text('ボールを 2 つクリック：入れかえ　スペース：同じ並べかえをもう 1 回　X：ランダム　↑↓：n = ' + n + '　0：リセット', 20, 36);
  fill(110); textSize(15);
  text('どんな並べかえも「入れかえ」の積で書ける。その回数の偶奇（偶置換・奇置換）は書き方によらず決まる', 20, 62);

  let y = height * 0.66;
  textSize(18); fill(30);
  text('1 行表記：位置 1〜' + n + ' にあるボール', 40, y);
  textSize(30);
  text('( ' + arr.map((b) => b + 1).join('  ') + ' )', 40, y + 40);
  textSize(18);
  text('巡回表記', 40, y + 90);
  textSize(34); fill(160, 60, 200);
  text(cycleStr(cyc), 40, y + 132);
  let sgn = (n - cyc.length) % 2;
  let ord = cyc.reduce((a, c) => lcmOf(a, c.length), 1);
  let px = width * 0.55;
  textSize(18); fill(30);
  text('偶奇：' + (sgn ? '奇置換（符号 −1）' : '偶置換（符号 +1）'), px, y);
  fill(110); textSize(15);
  text('n − 巡回の数 = ' + n + ' − ' + cyc.length + ' = ' + (n - cyc.length) + '（最小の入れかえ回数）。クリックで入れかえた回数 ' + swaps, px, y + 26);
  fill(30); textSize(18);
  text('位数：lcm(' + (cyc.map((c) => c.length).join(', ') || '1') + ') = ' + ord, px, y + 70);
  fill(110); textSize(15);
  text('スペースを ' + ord + ' 回押すと、最初の並びにもどる', px, y + 96);
  fill(30); textSize(18);
  text('今の並び = σ' + (power > 1 ? sup(power) : '') + '（σ = スペースで「もう 1 回」やる並べかえ）', px, y + 140);
}

// 置換を巡回に分ける（位置 i → arr[i] をたどる）
function cycles(p) {
  let seen = [], out = [];
  for (let i = 0; i < p.length; i++) {
    if (seen[i]) continue;
    let c = [], j = i;
    while (!seen[j]) { seen[j] = true; c.push(j); j = p[j]; }
    out.push(c);
  }
  return out;
}
function cycleStr(cyc) {
  let s = cyc.filter((c) => c.length > 1).map((c) => '(' + c.map((v) => v + 1).join(' ') + ')').join('');
  return s || 'e（何も動かさない）';
}
function lcmOf(a, b) { let g = (x, y) => (y ? g(y, x % y) : x); return (a / g(a, b)) * b; }
function sup(k) { return String(k).split('').map((d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+d]).join(''); }

function mousePressed() {
  let r = min(80, (width - 120) / n * 0.7);
  for (let p = 0; p < n; p++) {
    if (dist(mouseX, mouseY, slotX(p), slotY()) < r / 2) {
      if (picked < 0) picked = p;
      else if (picked !== p) {
        let from = [...Array(n).keys()];
        from[p] = picked; from[picked] = p;
        [arr[p], arr[picked]] = [arr[picked], arr[p]];
        anim = { from, t: 0 };
        swaps++; picked = -1; sigma = arr.slice(); power = 1;
      } else picked = -1;
    }
  }
}

function keyPressed() {
  if (key === ' ' && !anim) {
    // 同じ並べかえをもう 1 回：新しい並び[p] = 今の並び[σ(p)]（位置 σ(p) のボールが位置 p へ）
    let from = sigma.slice();
    arr = sigma.map((s) => arr[s]);
    anim = { from, t: 0 };
    power++;
    if (arr.every((b, i) => b === i)) power = 0;
  }
  if (key === 'x' || key === 'X') {
    arr = [...Array(n).keys()];
    for (let i = n - 1; i > 0; i--) { let j = floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    sigma = arr.slice(); power = 1; swaps = 0; anim = null;
  }
  if (key === UP_ARROW) { n = min(n + 1, 10); resetAll(); }
  if (key === DOWN_ARROW) { n = max(n - 1, 3); resetAll(); }
  if (key === '0') resetAll();
  return false;
}

// ---------- やってみよう ----------
// 1. 3 回入れかえて巡回表記を見る。偶奇は「入れかえ回数の偶奇」と一致する？
// 2. (1 2 3)(4 5) の位数は 6。スペースを押して確かめよう。σ³ と σ² はどんな形？
// 3. X を何回か押して、位数がいちばん大きいものを探そう（n = 10 なら 30 = lcm(2, 3, 5)）
// 4. 長さ 3 の巡回は偶置換（入れかえ 2 回）。だから 15 パズル（04）で困ったことが起きる
