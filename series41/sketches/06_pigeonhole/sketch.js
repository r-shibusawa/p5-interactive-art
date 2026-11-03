// ============================================
// 06 鳩の巣原理
// n 個の巣に n+1 羽の鳩を入れると、どう入れても「2 羽以上入った巣」が必ずできる
// 応用：n+1 個の整数を n で割った余りは n 種類しかない → 余りが同じペアがあり、その差は n の倍数
// ↑↓ = 巣の数 n（2〜9）/ スペース = ランダムに入れ直す / ドラッグ = 鳩を別の巣へ / M = 整数モード / N = 新しい数
// ============================================

let n = 5;                 // ★ 巣の数（鳩は n+1 羽）
let pigeons = [];          // { hole, x, y, tx, ty, hue }
let view = 'pigeon';       // 'pigeon' か 'number'
let dragging = -1;
let nums = [];             // 整数モードの数
let bounce = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  randomize();
  newNumbers();
}

function holeRect(h) {
  let w = Math.min(150, (width - 80) / n - 14);
  let x = width / 2 - (n * (w + 14) - 14) / 2 + h * (w + 14);
  return { x, y: height * 0.42, w, h: 190 };
}

function randomize() {
  pigeons = [];
  for (let i = 0; i <= n; i++) {
    pigeons.push({ hole: Math.floor(Math.random() * n), x: Math.random() * width, y: -40, tx: 0, ty: 0, hue: (i * 360) / (n + 1) });
  }
  dragging = -1;
}

function newNumbers() {
  nums = [];
  let used = {};
  while (nums.length < n + 1) { let v = 1 + Math.floor(Math.random() * 60); if (!used[v]) { used[v] = true; nums.push(v); } }
}

// 各巣の鳩の数を数え、目標位置を決める
function countHoles() {
  let cnt = new Array(n).fill(0);
  for (let i = 0; i < pigeons.length; i++) {
    let p = pigeons[i];
    if (i === dragging) continue;
    let r = holeRect(p.hole);
    let slot = cnt[p.hole]++;
    p.tx = r.x + 24 + (slot % 3) * (r.w - 48) / 2;
    p.ty = r.y + r.h - 28 - Math.floor(slot / 3) * 40;
  }
  return cnt;
}

function draw() {
  background(215, 30, 11);
  bounce += 0.08;
  if (view === 'pigeon') drawPigeons(); else drawNumbers();
}

function drawPigeons() {
  let cnt = countHoles();
  // 巣
  for (let h = 0; h < n; h++) {
    let r = holeRect(h);
    let crowded = cnt[h] >= 2;
    noStroke();
    fill(crowded ? 20 : 220, crowded ? 60 : 20, crowded ? 50 : 30);
    rect(r.x, r.y, r.w, r.h, 10);
    if (crowded) { noFill(); stroke(30, 90, 100); strokeWeight(3); rect(r.x - 3, r.y - 3, r.w + 6, r.h + 6, 12); }
    noStroke(); fill(0, 0, 85); textSize(14); textAlign(CENTER, BASELINE);
    text('巣 ' + (h + 1) + '：' + cnt[h] + ' 羽', r.x + r.w / 2, r.y - 10);
  }
  textAlign(LEFT, BASELINE);
  // 鳩（目標へ近づく）
  for (let i = 0; i < pigeons.length; i++) {
    let p = pigeons[i];
    if (i === dragging) { p.x = mouseX; p.y = mouseY; }
    else { p.x += (p.tx - p.x) * 0.12; p.y += (p.ty - p.y) * 0.12; }
    drawBird(p.x, p.y + Math.sin(bounce + i) * 2, p.hue, i === dragging);
  }
  let overs = cnt.filter((c) => c >= 2).length;
  let maxC = Math.max(...cnt);
  noStroke(); fill(0, 0, 100); textSize(18);
  text('巣 n = ' + n + '（↑↓）　鳩 ' + (n + 1) + ' 羽　スペース：入れ直す　ドラッグ：鳩を動かす　M：整数モード', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('どう動かしても、2 羽以上の巣（赤）を 0 にはできない。いちばん多い巣には ' + maxC + ' 羽（必ず ⌈' + (n + 1) + '/' + n + '⌉ = 2 羽以上）', 20, 68);
  fill(30, 80, 100); textSize(20);
  text('2 羽以上の巣：' + overs + ' 個　→ 必ず 1 個以上', 20, 110);
}

function drawNumbers() {
  // 余りごとの巣
  let res = [];
  for (let r = 0; r < n; r++) res.push([]);
  for (let v of nums) res[v % n].push(v);
  for (let h = 0; h < n; h++) {
    let r = holeRect(h);
    let crowded = res[h].length >= 2;
    noStroke();
    fill(crowded ? 20 : 220, crowded ? 60 : 20, crowded ? 50 : 30);
    rect(r.x, r.y, r.w, r.h, 10);
    fill(0, 0, 85); textSize(14); textAlign(CENTER, BASELINE);
    text('余り ' + h, r.x + r.w / 2, r.y - 10);
    textSize(22); fill(0, 0, 100);
    for (let j = 0; j < res[h].length; j++) text(res[h][j], r.x + r.w / 2, r.y + 36 + j * 32);
  }
  textAlign(LEFT, BASELINE);
  // 差が n の倍数のペアを 1 つ見つける
  let pair = null;
  for (let h = 0; h < n && !pair; h++) if (res[h].length >= 2) pair = [res[h][0], res[h][1]];
  noStroke(); fill(0, 0, 100); textSize(18);
  text('n = ' + n + '（↑↓）　数：' + nums.join(', ') + '　N：新しい数　M：鳩モードへ', 20, 40);
  fill(0, 0, 60); textSize(15);
  text(nums.length + ' 個の整数を ' + n + ' で割った余りは 0〜' + (n - 1) + ' の ' + n + ' 種類だけ → 同じ余りのペアが必ずある', 20, 68);
  if (pair) {
    fill(30, 80, 100); textSize(20);
    let a = Math.max(pair[0], pair[1]), b = Math.min(pair[0], pair[1]);
    text('ペア ' + a + ' と ' + b + '：差 ' + (a - b) + ' = ' + n + ' × ' + (a - b) / n + '　→ 差が ' + n + ' の倍数！', 20, 110);
  }
  fill(0, 0, 55); textSize(14);
  text('ほかの例：5 人いれば誕生月は 12 種類なので…まだ重ならない。13 人なら必ず同じ月の 2 人がいる', 20, height - 60);
  text('　　　　　東京に「髪の毛の本数が同じ 2 人」が必ずいる（髪は最大 15 万本、人口は 1400 万人）', 20, height - 36);
}

function drawBird(x, y, hue, lifted) {
  noStroke();
  if (lifted) { fill(0, 0, 100, 25); circle(x, y, 44); }
  fill(hue, 60, 95);
  ellipse(x, y, 30, 22);
  circle(x + 12, y - 8, 14);
  fill(40, 90, 100);
  triangle(x + 18, y - 8, x + 26, y - 6, x + 18, y - 4);
  fill(0, 0, 10);
  circle(x + 14, y - 10, 3);
}

function mousePressed() {
  if (view !== 'pigeon') return;
  for (let i = pigeons.length - 1; i >= 0; i--) {
    let p = pigeons[i];
    if ((p.x - mouseX) ** 2 + (p.y - mouseY) ** 2 < 18 * 18) { dragging = i; return; }
  }
}
function mouseReleased() {
  if (dragging < 0) return;
  let p = pigeons[dragging];
  for (let h = 0; h < n; h++) {
    let r = holeRect(h);
    if (mouseX >= r.x - 10 && mouseX <= r.x + r.w + 10 && mouseY >= r.y - 40 && mouseY <= r.y + r.h + 40) p.hole = h;
  }
  dragging = -1;
}

function keyPressed() {
  if (key === UP_ARROW && n < 9) { n++; randomize(); newNumbers(); }
  if (key === DOWN_ARROW && n > 2) { n--; randomize(); newNumbers(); }
  if (key === ' ') randomize();
  if (key === 'm' || key === 'M') view = view === 'pigeon' ? 'number' : 'pigeon';
  if (key === 'n' || key === 'N') newNumbers();
}

// ---------- やってみよう ----------
// 1. 鳩をドラッグして「どの巣も 1 羽以下」にしようとしてみる。できない理由を言葉で説明しよう
// 2. 鳩を 2n+1 羽にすると「3 羽以上の巣」が必ずできる（一般化）。randomize の羽数を変えてみよう
// 3. 整数モード：数を 1〜60 から 1〜1000 に広げても、ペアは必ず見つかる？
// 4. 「5 個の格子点のうち 2 点の中点が格子点」も鳩の巣（座標の偶奇は 4 種類）。描いて確かめよう
