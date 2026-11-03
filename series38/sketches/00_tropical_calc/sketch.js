// ============================================
// 00 トロピカル電卓
// トロピカル半環：「足し算 ⊕」は min、「掛け算 ⊗」はふつうの足し算
//   a ⊕ b = min(a, b)，a ⊗ b = a + b。引き算（⊕ の逆）はない。1 ⊕ 1 = 1，0 が ⊗ の単位元
// ←→ = a を変える / ↑↓ = b を変える / M = max 流儀（⊕ = max）に切替 / マウス = 表のマスを読む
// ============================================

let a = 3, b = 5;          // ★ 2 つの数
let useMax = false;        // ★ true なら max 流儀（max-plus 代数）
let N = 10;                // ★ 表の大きさ（0 〜 N-1）
let cell = 30;             // マスの大きさ（px）

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  textFont('Helvetica');
}

// ★ トロピカルの 2 つの演算
function tadd(x, y) { return useMax ? Math.max(x, y) : Math.min(x, y); }   // ⊕
function tmul(x, y) { return x + y; }                                       // ⊗
function sym() { return useMax ? 'max' : 'min'; }

function draw() {
  background(190, 55, 10);
  let s = tadd(a, b), p = tmul(a, b);

  // ---- 左：電卓 ----
  noStroke();
  fill(0, 0, 100);
  textSize(20);
  text('←→：a　↑↓：b　M：' + (useMax ? 'max 流儀 ← いま' : 'min 流儀 ← いま') + '　マウス：表のマスを読む', 20, 36);
  fill(0, 0, 65);
  textSize(15);
  text('トロピカル半環 (R ∪ {∞}, ⊕, ⊗)：⊕ = ' + sym() + '，⊗ = +。「足し算」が ' + sym() + ' なので 1 ⊕ 1 = 1（べき等）。引き算は存在しない', 20, 62);

  let x0 = 30, y0 = 110;
  fill(0, 0, 100, 8);
  rect(x0 - 10, y0 - 10, 490, 300, 12);
  textSize(40);
  fill(35, 90, 100);
  text('a = ' + a, x0, y0 + 40);
  fill(330, 70, 100);
  text('b = ' + b, x0 + 160, y0 + 40);
  fill(0, 0, 100);
  textSize(22);
  text('a ⊕ b = ' + sym() + '(' + a + ', ' + b + ') = ' + s, x0, y0 + 100);
  text('a ⊗ b = ' + a + ' + ' + b + ' = ' + p, x0, y0 + 140);
  text('a ⊘ b = ' + a + ' − ' + b + ' = ' + (a - b) + '　（割り算 = 引き算）', x0, y0 + 180);
  text('a^{⊗3} = a ⊗ a ⊗ a = 3·a = ' + 3 * a + '　（べき = ふつうの掛け算）', x0, y0 + 220);
  fill(0, 0, 60);
  textSize(13);
  text('⊕ の逆（a ⊖ b）は定義できない：' + sym() + '(x, ' + b + ') = ' + a + ' をみたす x は一通りに決まらない', x0, y0 + 262);

  // ---- 法則（いまの数で確かめる）----
  let ly = height - 150;
  fill(0, 0, 100);
  textSize(17);
  text('法則をいまの数で確かめる', x0, ly);
  textSize(15);
  fill(90, 60, 95);
  let c = 2;
  let lines = [
    'べき等　a ⊕ a = a：' + sym() + '(' + a + ', ' + a + ') = ' + tadd(a, a),
    '単位元　a ⊕ ' + (useMax ? '−∞' : '∞') + ' = a，a ⊗ 0 = ' + a + ' + 0 = ' + a,
    '分配　a ⊗ (b ⊕ c) = (a ⊗ b) ⊕ (a ⊗ c)：' + a + ' + ' + sym() + '(' + b + ', ' + c + ') = ' + tmul(a, tadd(b, c)) + ' ＝ ' + sym() + '(' + tmul(a, b) + ', ' + tmul(a, c) + ') = ' + tadd(tmul(a, b), tmul(a, c)) + '　(c = 2)',
    '二項定理　(a ⊕ b)^{⊗2} = a^{⊗2} ⊕ b^{⊗2}：2·' + sym() + '(' + a + ', ' + b + ') = ' + 2 * tadd(a, b) + ' ＝ ' + sym() + '(' + 2 * a + ', ' + 2 * b + ') = ' + tadd(2 * a, 2 * b) + '　（交差項が消える「新入生の夢」）',
  ];
  for (let k = 0; k < lines.length; k++) text(lines[k], x0, ly + 28 + k * 24);

  // ---- 右：⊕ の表と ⊗ の表（ヒートマップ）----
  let tx = Math.max(560, width - (2 * N * cell + 140)), ty = 130;
  drawTable(tx, ty, '⊕ の表（' + sym() + '）', (i, j) => tadd(i, j), 35);
  drawTable(tx + N * cell + 100, ty, '⊗ の表（+）', (i, j) => tmul(i, j), 330);
}

function drawTable(tx, ty, title, f, hue) {
  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text(title, tx, ty - 34);
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { let v = f(i, j); lo = Math.min(lo, v); hi = Math.max(hi, v); }
  let hover = null;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    let v = f(i, j);
    let cx = tx + i * cell, cy = ty + j * cell;
    let isHere = (i === a && j === b);
    fill(hue, 70, map(v, lo, hi, 25, 100));
    rect(cx, cy, cell - 2, cell - 2, 3);
    if (isHere) { noFill(); stroke(0, 0, 100); strokeWeight(3); rect(cx - 1, cy - 1, cell, cell); noStroke(); }
    fill(v > (lo + hi) / 2 ? 0 : 100, 0, v > (lo + hi) / 2 ? 10 : 100);
    textSize(12);
    textAlign(CENTER, CENTER);
    text(v, cx + cell / 2, cy + cell / 2);
    textAlign(LEFT, BASELINE);
    if (mouseX >= cx && mouseX < cx + cell && mouseY >= cy && mouseY < cy + cell) hover = { i, j, v };
  }
  // 軸ラベル
  fill(0, 0, 70);
  textSize(12);
  for (let i = 0; i < N; i++) { text(i, tx + i * cell + cell / 2 - 3, ty - 6); text(i, tx - 14, ty + i * cell + cell / 2 + 4); }
  text('a →', tx + N * cell + 4, ty - 6);
  text('b ↓', tx - 30, ty + N * cell + 14);
  if (hover) {
    fill(0, 0, 100);
    textSize(16);
    text('(' + hover.i + ', ' + hover.j + ') → ' + hover.v + '　（白枠 = いまの a, b）', tx, ty + N * cell + 34);
  }
}

function keyPressed() {
  if (key === LEFT_ARROW) a = Math.max(0, a - 1);
  if (key === RIGHT_ARROW) a = Math.min(N - 1, a + 1);
  if (key === DOWN_ARROW) b = Math.max(0, b - 1);
  if (key === UP_ARROW) b = Math.min(N - 1, b + 1);
  if (key === 'm' || key === 'M') useMax = !useMax;
}

// ---------- やってみよう ----------
// 1. ⊕ の表はなぜ「階段」になる？ ⊗ の表はなぜ「斜めのしま」？ 色を見て説明しよう
// 2. M で max 流儀にすると何が変わる？ 変わらない法則は？（分配法則・べき等性）
// 3. 表を 0 〜 N-1 でなく −5 〜 5 にして、負の数でも法則が成り立つか確かめよう
// 4. (a ⊕ b)^{⊗3} = a^{⊗3} ⊕ b^{⊗3} も成り立つ？ 行を 1 つ足して確かめよう
