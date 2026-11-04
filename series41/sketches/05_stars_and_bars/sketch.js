// ============================================
// 05 重複組合せ（星と棒）
// 同じ n 個の星を k 個の箱に分ける方法（空の箱もOK）は C(n+k−1, k−1) 通り
// 「★★|★|★★★」のように、星 n 個と棒 k−1 本の並べ方として数える
// ↑↓ = 星の数 n（1〜8）/ ←→ = 箱の数 k（1〜5）/ スペース = 一覧を順に見る / クリック = 一覧から選ぶ
// ============================================

let n = 5, k = 3;        // ★ 星と箱の数
let solutions = [];      // 各要素は [箱1の個数, 箱2, …]
let sel = 0;             // いま注目している並び
let auto = true;
let tick = 0;
let listLayer;           // 一覧を描きためる層
let tileW, tileH, perRow, listX, listY;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  listLayer = createGraphics(width, height);
  rebuild();
}

// ★ n 個を k 個の箱に分ける全パターン（再帰）
function rebuild() {
  solutions = [];
  let cur = [];
  function rec(left, boxesLeft) {
    if (boxesLeft === 1) { solutions.push(cur.concat([left])); return; }
    for (let i = 0; i <= left; i++) { cur.push(i); rec(left - i, boxesLeft - 1); cur.pop(); }
  }
  rec(n, k);
  sel = 0;
  drawList();
}

function choose(a, b) { let r = 1; for (let i = 1; i <= b; i++) r = (r * (a - b + i)) / i; return Math.round(r); }

function drawList() {
  let cell = solutions.length > 200 ? 6 : solutions.length > 60 ? 9 : 13;
  listX = 30; listY = 330;
  for (; cell >= 3; cell--) {              // 画面の下にはみ出すときはマスを小さくする
    tileW = (n + k - 1) * cell + 14;
    tileH = cell + 5;
    perRow = Math.max(1, Math.floor((width * 0.62 - 40) / tileW));
    if (cell === 3 || listY + Math.ceil(solutions.length / perRow) * tileH <= height - 16) break;
  }
  listLayer.clear();
  listLayer.colorMode(HSB, 360, 100, 100, 100);
  listLayer.noStroke();
  for (let idx = 0; idx < solutions.length; idx++) {
    let p = tilePos(idx);
    let x = p.x;
    let s = solutions[idx];
    for (let b = 0; b < k; b++) {
      for (let j = 0; j < s[b]; j++) { listLayer.fill(45, 80, 100); listLayer.rect(x, p.y, cell - 1, cell - 1, 2); x += cell; }
      if (b < k - 1) { listLayer.fill(200, 60, 90); listLayer.rect(x + cell * 0.3, p.y, cell * 0.35, cell - 1); x += cell; }
    }
  }
}
function tilePos(idx) { return { x: listX + (idx % perRow) * tileW, y: listY + Math.floor(idx / perRow) * tileH }; }

function draw() {
  background(228, 28, 11);
  if (auto) { tick += deltaTime / 1000; if (tick > 0.5) { tick = 0; sel = (sel + 1) % solutions.length; } }
  image(listLayer, 0, 0);
  // 選択枠
  let p = tilePos(sel);
  noFill(); stroke(330, 80, 100); strokeWeight(2);
  rect(p.x - 3, p.y - 3, tileW - 8, tileH + 1, 3);

  // 上：選んだ分け方を箱で描く
  let s = solutions[sel];
  let bx = 40, by = 120, bw = Math.min(150, (width * 0.6) / k), bh = 150;
  for (let b = 0; b < k; b++) {
    let x = bx + b * (bw + 16);
    noFill(); stroke(0, 0, 60); strokeWeight(2);
    rect(x, by, bw, bh, 8);
    noStroke(); fill(45, 80, 100);
    for (let j = 0; j < s[b]; j++) {
      let col = j % 4, row = Math.floor(j / 4);
      star(x + 22 + col * 30, by + bh - 24 - row * 30, 11);
    }
    fill(0, 0, 100); textSize(16);
    text('箱 ' + (b + 1) + '：' + s[b], x + 8, by + 22);
  }
  // 星と棒の文字列
  let str = '';
  for (let b = 0; b < k; b++) { str += '★'.repeat(s[b]); if (b < k - 1) str += '|'; }
  fill(0, 0, 100); textSize(24);
  text(str, bx, by + bh + 36);

  // 右：ヒストグラム（箱 1 に i 個入る分け方の数）
  let hx = width * 0.66, hy = 330, hw = width - hx - 40, hh = height - hy - 60;
  let counts = new Array(n + 1).fill(0);
  for (let sol of solutions) counts[sol[0]]++;
  let maxC = Math.max(1, ...counts);
  let bwid = hw / (n + 1);
  noStroke();
  for (let i = 0; i <= n; i++) {
    let hgt = (counts[i] / maxC) * (hh - 40);
    fill(i === s[0] ? 330 : 200, 70, 95);
    rect(hx + i * bwid + 4, hy + hh - 20 - hgt, bwid - 8, hgt);
    fill(0, 0, 80); textAlign(CENTER, BASELINE); textSize(13);
    text(counts[i], hx + i * bwid + bwid / 2, hy + hh - 24 - hgt);
    text(i, hx + i * bwid + bwid / 2, hy + hh);
  }
  textAlign(LEFT, BASELINE);
  fill(0, 0, 70); textSize(14);
  text('箱 1 に i 個入る分け方の数（= 残り ' + (n) + '−i 個を ' + (k - 1) + ' 箱に）', hx, hy - 10);

  // 式
  let px = width * 0.66, py = 110;
  fill(0, 0, 100); textSize(40);
  text('C(' + (n + k - 1) + ',' + (k - 1) + ') = ' + solutions.length, px, py + 10);
  textSize(15); fill(0, 0, 70);
  text('星 ' + n + ' 個と棒 ' + (k - 1) + ' 本、合計 ' + (n + k - 1) + ' 個の並び', px, py + 44);
  text('棒をどこに置くか選ぶ = ' + (n + k - 1) + ' か所から ' + (k - 1) + ' か所', px, py + 66);
  text('= C(' + (n + k - 1) + ',' + n + ')（星の位置を選んでも同じ）= ' + choose(n + k - 1, n), px, py + 88);
  text('一覧の個数 ' + solutions.length + ' と一致 ✓', px, py + 120);

  fill(0, 0, 100); textSize(18);
  text('星 n = ' + n + '（↑↓）　箱 k = ' + k + '（←→）　スペース：自動 ' + (auto ? 'ON' : 'off') + '　クリック：一覧から選ぶ　［' + (sel + 1) + ' / ' + solutions.length + '］', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('同じ星を箱に分ける ＝「重複を許して k 種類から n 個選ぶ」＝ 星と棒の並べ方', 20, 68);
}

function star(x, y, r) {
  beginShape();
  for (let i = 0; i < 10; i++) { let a = -HALF_PI + (i * PI) / 5; let rr = i % 2 === 0 ? r : r * 0.45; vertex(x + rr * Math.cos(a), y + rr * Math.sin(a)); }
  endShape(CLOSE);
}

function mousePressed() {
  for (let idx = 0; idx < solutions.length; idx++) {
    let p = tilePos(idx);
    if (mouseX >= p.x - 3 && mouseX < p.x + tileW - 6 && mouseY >= p.y - 3 && mouseY < p.y + tileH) { sel = idx; auto = false; return; }
  }
}

function keyPressed() {
  if (key === UP_ARROW && n < 8) { n++; rebuild(); }
  if (key === DOWN_ARROW && n > 1) { n--; rebuild(); }
  if (key === RIGHT_ARROW && k < 5) { k++; rebuild(); }
  if (key === LEFT_ARROW && k > 1) { k--; rebuild(); }
  if (key === ' ') auto = !auto;
}

// ---------- やってみよう ----------
// 1. k = 2 のとき分け方は n + 1 通り。k = 3 では (n+1)(n+2)/2 通り（三角数）。確かめよう
// 2. 「どの箱も 1 個以上」にすると C(n−1, k−1) 通り。rec の i を 1 から始めて数えてみよう
// 3. ヒストグラムの形は k によって変わる。k = 2 なら平ら、k が大きいと右下がり。なぜ？
// 4. 箱を「x + y + z = n の非負整数解」と読みかえると、方程式の解の数を数えていることになる
