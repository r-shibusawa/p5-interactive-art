// ============================================
// 10 ワン・タイル（Wang tiles）
// 4 つの辺に色がついた正方形。となりと接する辺の色が同じになるように並べる（回転は禁止）
//   左上から順に「合うタイル」をランダムに選ぶと模様（テクスチャ）ができる。合うものがなければ 1 つ戻る
//   タイルの組によっては「くり返さない並べ方しかできない」ものがある（非周期セット）
// 1 = 2 色 16 枚（必ず埋まる）/ 2 = 3 色の少ないセット（戻りながら埋める）/ スペース = 作り直す / D = 描き方 / ↑↓ = 大きさ / S = 保存
// ============================================

let mode = 1;           // ★ 1 = 2 色の全部入りセット、2 = 3 色の少ないセット
let cell = 48;          // ★ タイル 1 枚の大きさ
let style = 1;          // 0 = 辺の三角形、1 = 道（パイプ）
let setSize = 4;        // ★ モード 2：k × k のドーナツから作る（最大 k² 枚）
let tilesSet = [];      // [北, 東, 南, 西] の色番号
let cols, rows;
let placed = [];        // マスごとのタイル番号（−1 = まだ）
let stack = [];         // 探索の記録 { cands, idx }
let pos = 0, back = 0, stuck = false;
let seed = 1;

let edgeCols = [[60, 70, 100], [250, 190, 70], [90, 200, 220]];   // ★ 辺の色

function setup() {
  createCanvas(windowWidth, windowHeight);
  makeSet();
}

function makeSet() {
  randomSeed(seed);
  tilesSet = [];
  if (mode === 1) {
    for (let b = 0; b < 16; b++) tilesSet.push([(b >> 3) & 1, (b >> 2) & 1, (b >> 1) & 1, b & 1]);
  } else {
    // k × k のドーナツ（上下・左右がつながった盤）の辺をランダムに塗り、そこに現れるタイルだけを集める
    // → このセットは少なくとも「くり返し」で並べられるが、ランダムに置くと詰まることがある
    let v = [], hz = [];
    for (let x = 0; x < setSize; x++) { v.push([]); hz.push([]); for (let y = 0; y < setSize; y++) { v[x].push(floor(random(3))); hz[x].push(floor(random(3))); } }
    let seen = new Set();
    for (let x = 0; x < setSize; x++) for (let y = 0; y < setSize; y++) {
      let t = [hz[x][y], v[(x + 1) % setSize][y], hz[x][(y + 1) % setSize], v[x][y]];
      if (!seen.has(t.join())) { seen.add(t.join()); tilesSet.push(t); }
    }
  }
  restart();
}

function restart() {
  cols = Math.floor((width - 40) / cell);
  rows = Math.floor((height - 150) / cell);
  placed = new Array(cols * rows).fill(-1);
  stack = [];
  pos = 0;
  back = 0;
  stuck = false;
}

function draw() {
  background(16, 18, 26);
  // ★ 1 フレームに何マス進めるか
  for (let s = 0; s < 12 && pos < cols * rows && !stuck; s++) stepFill();

  let ox = (width - cols * cell) / 2, oy = 120;
  for (let i = 0; i < cols * rows; i++) {
    let t = placed[i];
    let x = ox + (i % cols) * cell, y = oy + Math.floor(i / cols) * cell;
    if (t < 0) { noStroke(); fill(28, 30, 40); rect(x, y, cell - 1, cell - 1); continue; }
    drawTile(tilesSet[t], x, y, cell);
  }
  // セットの見本
  for (let k = 0; k < tilesSet.length; k++) drawTile(tilesSet[k], 20 + k * 34, 70, 30);

  noStroke();
  fill(255);
  textSize(20);
  text((mode === 1 ? '2 色 16 枚のセット（どの辺にも合うものがある）' : '3 色 ' + tilesSet.length + ' 枚のセット（' + setSize + '×' + setSize + ' のドーナツから）') + '　（1・2）', 20, 36);
  textSize(15);
  fill(190);
  let st = stuck ? 'このセットでは埋められなかった → スペースで別のセット' : pos >= cols * rows ? '完成！' : '並べ中…';
  text(st + '　戻った回数 ' + back + '　D で描き方', 600, 36);
  fill(150);
  text('1966 バーガー：非周期セット（20426 枚）→ 2015 ジャンデル＆ラオ：11 枚・4 色が最小。「並べられるか」を判定する一般的な方法はない', 20, height - 20);
}

// ★ 1 マス進める：上と左に合うタイルの中からランダムに選ぶ。なければ戻る
function stepFill() {
  if (stack.length === pos) {
    let c = shuffle(candidatesAt(pos));
    stack.push({ cands: c, idx: -1 });
  }
  let f = stack[pos];
  f.idx++;
  if (f.idx < f.cands.length) { placed[pos] = f.cands[f.idx]; pos++; return; }
  // 候補を使い切った → このマスを空にして 1 つ前へ
  stack.pop();
  placed[pos] = -1;
  pos--;
  back++;
  if (pos < 0 || back > 20000) { stuck = true; pos = Math.max(0, pos); return; }
  placed[pos] = -1;
}

function candidatesAt(i) {
  let x = i % cols, y = Math.floor(i / cols), out = [];
  for (let k = 0; k < tilesSet.length; k++) {
    let t = tilesSet[k];
    if (x > 0 && tilesSet[placed[i - 1]][1] !== t[3]) continue;      // 左のタイルの東 = 自分の西
    if (y > 0 && tilesSet[placed[i - cols]][2] !== t[0]) continue;   // 上のタイルの南 = 自分の北
    out.push(k);
  }
  return out;
}

function keyPressed() {
  if (key === '1' || key === '2') { mode = int(key); makeSet(); }
  if (key === ' ') { seed++; makeSet(); }
  if (key === 'd' || key === 'D') style = (style + 1) % 2;
  if (key === UP_ARROW) { cell = Math.min(96, cell + 8); restart(); }
  if (key === DOWN_ARROW) { cell = Math.max(16, cell - 8); restart(); }
  if (key === 's' || key === 'S') saveCanvas('wang', 'png');
}

// ---------- やってみよう ----------
// 1. モード 1 の道のスタイルは、16 枚から迷路や配管のような模様ができる。ゲームの地形づくりにも使われる
// 2. モード 2 で setSize を 3 → 6 と変えると、戻る回数はどう変わる？ 左上の見本と模様を見比べよう
// 3. edgeCols を変え、style 0 の三角形の色で「床のモザイク」を作ろう
// 4. 調べてみよう：ワン・タイルで計算機（チューリング機械）を作れる → 判定不能の証明


// ==================================================
// ここから下は「描画の道具」
// ==================================================
function drawTile(t, x, y, s) {
  let cx = x + s / 2, cy = y + s / 2;
  if (style === 0) {
    noStroke();
    let corners = [[x, y], [x + s, y], [x + s, y + s], [x, y + s]];
    for (let e = 0; e < 4; e++) {
      let c = edgeCols[t[e]];
      fill(c[0], c[1], c[2]);
      let a = corners[e], b = corners[(e + 1) % 4];
      triangle(a[0], a[1], b[0], b[1], cx, cy);
    }
    stroke(16, 18, 26);
    strokeWeight(1);
    noFill();
    rect(x, y, s, s);
    return;
  }
  // 道：色 0 以外の辺から真ん中へ太い線を引く
  noStroke();
  fill(34, 38, 52);
  rect(x, y, s, s);
  let mids = [[cx, y], [x + s, cy], [cx, y + s], [x, cy]];
  strokeCap(ROUND);
  for (let e = 0; e < 4; e++) {
    if (t[e] === 0) continue;
    let c = edgeCols[t[e]];
    stroke(c[0], c[1], c[2]);
    strokeWeight(s * 0.32);
    line(mids[e][0], mids[e][1], cx, cy);
  }
  let k = t.filter((v) => v > 0).length;
  if (k > 0) { noStroke(); fill(edgeCols[Math.max(...t)]); circle(cx, cy, s * 0.32); }
}
