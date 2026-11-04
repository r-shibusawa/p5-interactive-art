// ============================================
// 03 パスカルの三角形
// 両端は 1、あとは「左上 ＋ 右上」。並ぶ数は二項係数 C(n,k)
// m で割った余りで色を塗ると、シェルピンスキーのギャスケットのような模様が浮かび上がる
// ↑↓ = 割る数 m（2〜9）/ ←→ = 行数 / H = 性質のハイライトを順に切り替え / N = 数字の表示
// ============================================

let rows = 24;            // ★ 行数（8〜48）
let m = 2;                // ★ 割る数（余りで色分け）
let tri = [];             // tri[n][k] = C(n,k) mod m
let realVals = [];        // 実際の値（最初の方の行だけ表示に使う）
let hl = 0;               // ハイライトの種類 0〜4
let showNum = true;
let layer;                // 三角形を描きためる層（毎フレーム描かない）
let hlNames = ['なし', '対角線 k=2 ＝ 三角数 1,3,6,10,…', '浅い対角線の和 ＝ フィボナッチ 1,1,2,3,5,…', '行の和 ＝ 2^n', 'ホッケースティック：対角線を足すと斜め下の数'];
let fibIdx = 0;           // フィボナッチ・ホッケーのアニメ用

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  layer = createGraphics(width, height);
  rebuild();
}

function rebuild() {
  tri = []; realVals = [];
  for (let r = 0; r < rows; r++) {
    tri.push([]); realVals.push([]);
    for (let k = 0; k <= r; k++) {
      // ★ 余りだけ持てば大きな数にならない：(a + b) mod m
      let v = (k === 0 || k === r) ? 1 % m : (tri[r - 1][k - 1] + tri[r - 1][k]) % m;
      tri[r].push(v);
      let real = (k === 0 || k === r) ? 1 : realVals[r - 1][k - 1] + realVals[r - 1][k];
      realVals[r].push(real);
    }
  }
  drawTriangle();
}

function cellPos(r, k) {
  let s = Math.min((width - 40) / (rows + 1), (height - 170) / rows);
  let cx = width / 2 + (k - r / 2) * s, cy = 140 + r * s * 0.92;
  return { x: cx, y: cy, s };
}

function drawTriangle() {
  layer.clear();
  layer.colorMode(HSB, 360, 100, 100, 100);
  layer.noStroke();
  layer.textAlign(CENTER, CENTER);
  for (let r = 0; r < rows; r++) for (let k = 0; k <= r; k++) {
    let p = cellPos(r, k);
    let v = tri[r][k];
    if (v === 0) layer.fill(0, 0, 18);
    else layer.fill(((v - 1) * 360) / Math.max(1, m - 1) * 0.8 + 20, 70, 95);
    layer.circle(p.x, p.y, p.s * 0.88);
    if (showNum && rows <= 20) {
      layer.fill(v === 0 ? 0 : 0, 0, v === 0 ? 50 : 12);
      layer.textSize(Math.min(14, p.s * 0.34));
      let val = realVals[r][k];
      layer.text(val > 99999 ? '…' : val, p.x, p.y);
    }
  }
}

function draw() {
  background(225, 30, 10);
  image(layer, 0, 0);
  if (frameCount % 30 === 0) fibIdx = (fibIdx + 1) % Math.min(rows, 16);

  // ハイライト
  noFill();
  strokeWeight(3);
  let msg = '';
  if (hl === 1) {
    stroke(60, 90, 100);
    let vals = [];
    for (let r = 2; r < rows; r++) { let p = cellPos(r, 2); circle(p.x, p.y, p.s); if (vals.length < 8) vals.push(realVals[r][2]); }
    msg = '三角数：' + vals.join(', ') + ' …　C(n,2) = n(n−1)/2';
  } else if (hl === 2) {
    // 浅い対角線：(r, k) で r - k = d - k ... 行 r = d - k
    let d = fibIdx + 2, sum = 0;
    stroke(130, 90, 100);
    for (let k = 0; k <= d / 2; k++) { let r = d - k; if (r < rows) { let p = cellPos(r, k); circle(p.x, p.y, p.s); sum += realVals[r][k]; } }
    let f = [1, 1];
    for (let i = 2; i <= 16; i++) f.push(f[i - 1] + f[i - 2]);
    msg = '浅い対角線 ' + (d - 1) + '：和 = ' + sum + '　フィボナッチ：' + f.slice(0, 10).join(', ') + ' …';
  } else if (hl === 3) {
    let r = Math.min(fibIdx + 1, rows - 1);   // 行が足りないときは最後の行にとどめる
    stroke(300, 70, 100);
    let sum = 0;
    for (let k = 0; k <= r; k++) { let p = cellPos(r, k); circle(p.x, p.y, p.s); sum += realVals[r][k]; }
    msg = '行 ' + r + ' の和 = ' + sum + ' = 2^' + r + '（n 個から何個か選ぶ全部の選び方）';
  } else if (hl === 4) {
    let kk = 1 + (fibIdx % 3), len = 4 + (fibIdx % 4), sum = 0;
    stroke(20, 90, 100);
    for (let i = 0; i < len; i++) { let r = kk + i; if (r < rows) { let p = cellPos(r, kk); circle(p.x, p.y, p.s); sum += realVals[r][kk]; } }
    let r2 = kk + len;
    if (r2 < rows) { let p = cellPos(r2, kk + 1); stroke(50, 90, 100); strokeWeight(5); circle(p.x, p.y, p.s * 1.1); }
    msg = '対角線を上から ' + len + ' 個足す = ' + sum + '　→ 斜め右下の数 C(' + r2 + ',' + (kk + 1) + ')' + (r2 < rows ? ' = ' + realVals[r2][kk + 1] : '');
  }

  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text('mod ' + m + '（↑↓）　行数 ' + rows + '（←→）　H：ハイライト［' + hlNames[hl] + '］　N：数字 ' + (showNum ? 'ON' : 'off'), 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text(m === 2 ? 'mod 2：奇数だけ色がつくとシェルピンスキーのギャスケット（フラクタル）。2^k 行で大きな三角形が閉じる'
              : 'mod ' + m + '：余り 0 は暗く、それ以外は余りごとに色。素数 p なら p^k 行で大きな三角形になる（リュカの定理）', 20, 68);
  if (msg) { fill(55, 80, 100); text(msg, 20, 92); }
}

function keyPressed() {
  if (key === UP_ARROW && m < 9) { m++; rebuild(); }
  if (key === DOWN_ARROW && m > 2) { m--; rebuild(); }
  if (key === RIGHT_ARROW && rows < 48) { rows += 4; rebuild(); }
  if (key === LEFT_ARROW && rows > 8) { rows -= 4; rebuild(); }
  if (key === 'h' || key === 'H') hl = (hl + 1) % hlNames.length;
  if (key === 'n' || key === 'N') { showNum = !showNum; drawTriangle(); }
}

// ---------- やってみよう ----------
// 1. mod 2 で行数を 16 → 32 にすると模様が「入れ子」になる。3 で割ると？ 5 で割ると？
// 2. H を押して、三角数・フィボナッチ・2^n・ホッケースティックを順に確かめよう
// 3. 行 n がすべて奇数（mod 2 で全部色つき）になるのはどんな n？（n = 2^k − 1）
// 4. 2 行上の数との関係（C(n,k) = C(n−2,k−2) + 2C(n−2,k−1) + C(n−2,k)）を描いてみよう
