// ============================================
// 07 形の「指紋」（バーコードで形を見分ける）
// 回転しても、伸び縮みしても、ノイズがあっても、穴の数は変わらない
// 6 種類の形のバーコードを並べて、「長い H1 の棒の数」で形が分類できることを確かめる
// 1〜6 で形 / マウス左右 = 回転 / 上下 = ノイズ / クリックで作り直す
// ============================================

let shape = 1;
let seed = 1;
let pts = [];
let bars = [];
let maxR = 150;
let names = ['', '円', '2 つの円', '8 の字', '塊', '3 つの輪（オリンピック）', '線'];
let table = {}; // 形ごとの穴の数の記録

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  makePoints();
}

function makePoints() {
  randomSeed(seed);
  let noiseAmt = map(mouseY, 0, height, 25, 0, true);
  let rot = map(mouseX, 0, width, 0, PI);
  let raw = [];
  let R = min(width, height) * 0.16;
  for (let i = 0; i < 36; i++) {
    let a = random(TWO_PI), x, y;
    if (shape === 1) { x = cos(a) * R; y = sin(a) * R; }
    else if (shape === 2) { let s = random() < 0.5 ? -1 : 1; x = s * R * 1.1 + cos(a) * R * 0.6; y = sin(a) * R * 0.6; }
    else if (shape === 3) { x = R * 1.3 * sin(a); y = R * 0.9 * sin(a) * cos(a); }
    else if (shape === 4) { let rr = R * sqrt(random()); x = cos(a) * rr; y = sin(a) * rr; }
    else if (shape === 5) { let k = floor(random(3)); x = (k - 1) * R * 1.3 + cos(a) * R * 0.55; y = sin(a) * R * 0.55; }
    else { x = random(-R * 1.5, R * 1.5); y = x * 0.3; }
    // ★ 回転してもノイズを足しても、穴の数は同じはず
    let rx = x * cos(rot) - y * sin(rot), ry = x * sin(rot) + y * cos(rot);
    raw.push({ x: width * 0.3 + rx + randomGaussian() * noiseAmt, y: height * 0.55 + ry + randomGaussian() * noiseAmt });
  }
  pts = raw;
  bars = persistence(pts, maxR);
  let holes = bars.filter((b) => b.dim === 1 && (b.death === Infinity ? maxR : b.death) - b.birth > maxR * 0.18).length;
  let comps = bars.filter((b) => b.dim === 0 && (b.death === Infinity ? maxR : b.death) - b.birth > maxR * 0.3).length;
  table[shape] = { holes, comps };
}

function draw() {
  background(230, 40, 10);
  if (frameCount % 15 === 0) makePoints(); // マウスに追従（重いので間引き）

  noStroke();
  for (let p of pts) { fill(170, 70, 100); circle(p.x, p.y, 7); }

  // 右：バーコード
  let bx = width * 0.58, bw = width - bx - 50;
  drawBarcode(bars, bx, 120, bw, height * 0.42, maxR);

  // 下：表
  let ty = height * 0.68;
  fill(0, 0, 100);
  textSize(16);
  text('形', bx, ty); text('塊（長い H0）', bx + 260, ty); text('穴（長い H1）', bx + 420, ty);
  for (let k = 1; k <= 6; k++) {
    let y = ty + 26 * k;
    fill(k === shape ? 45 : 0, k === shape ? 90 : 0, k === shape ? 100 : 65);
    text(k + '. ' + names[k], bx, y);
    if (table[k]) { text(table[k].comps, bx + 260, y); text(table[k].holes, bx + 420, y); }
    else text('—', bx + 260, y);
  }

  let t = table[shape];
  fill(0, 0, 100);
  textSize(18);
  text('形：' + names[shape] + '（1〜6）　回転（左右）　ノイズ（上下）　→ 塊 ' + t.comps + '、穴 ' + t.holes + '　クリックで作り直す', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('回しても、ゆがめても、点を取り直しても、穴の数は変わらない（位相不変量）。画像認識・分子の形・宇宙の大規模構造の分類に使われる', 20, 68);
}

function keyPressed() { if (key >= '1' && key <= '6') { shape = int(key); makePoints(); } }
function mousePressed() { seed = floor(random(10000)); makePoints(); }

// ---------- やってみよう ----------
// 1. 全部の形を 1 度ずつ表示して、表を埋めよう。見分けられない組み合わせはある？
// 2. ノイズを最大にしても分類できる？ どの形から壊れる？
// 3. 「穴の数が同じ形」を区別するには、何を追加で見ればいい？（穴の大きさ = 棒の長さ）



// ==================================================
// ここから下は「TDA の道具」です（リップス複体とパーシステント・ホモロジーの計算）
// （中身は読まなくても OK。消さないでね）
// ==================================================

// 2 点の距離（z があれば 3 次元）
function ptDist(a, b) {
  let dx = a.x - b.x, dy = a.y - b.y, dz = (a.z || 0) - (b.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// リップス複体：半径 r（直径 2r）以内の点どうしをつなぐ
//   返り値 { edges: [[i, j, 長さ]], triangles: [[i, j, k, 長さ]] }
function ripsComplex(pts, r) {
  let edges = [], triangles = [];
  let n = pts.length;
  let near = [];
  for (let i = 0; i < n; i++) near.push([]);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      let d = ptDist(pts[i], pts[j]);
      if (d <= 2 * r) {
        edges.push([i, j, d]);
        near[i].push(j);
      }
    }
  }
  for (let i = 0; i < n; i++) {
    for (let j of near[i]) {
      for (let k of near[j]) {
        if (near[i].includes(k)) {
          let d = Math.max(ptDist(pts[i], pts[j]), ptDist(pts[j], pts[k]), ptDist(pts[i], pts[k]));
          triangles.push([i, j, k, d]);
        }
      }
    }
  }
  return { edges, triangles };
}

// パーシステント・ホモロジー（Z2 係数、列簡約）
//   返り値：バーの配列 [{ dim: 0 か 1, birth, death }]（death は半径 r の値、無限なら Infinity）
//   maxR：この半径まで計算（大きいほど重い）
function persistence(pts, maxR) {
  let n = pts.length;
  let { edges, triangles } = ripsComplex(pts, maxR);
  // 単体のリスト：頂点（誕生 0）、辺（長さ/2）、三角形（最長辺/2）
  let simplices = [];
  for (let i = 0; i < n; i++) simplices.push({ dim: 0, v: [i], birth: 0 });
  for (let [i, j, d] of edges) simplices.push({ dim: 1, v: [i, j], birth: d / 2 });
  for (let [i, j, k, d] of triangles) simplices.push({ dim: 2, v: [i, j, k], birth: d / 2 });
  simplices.sort((a, b) => a.birth - b.birth || a.dim - b.dim);
  let index = {};
  simplices.forEach((s, i) => (index[s.v.join(',')] = i));

  // 境界行列の列（Z2 なので「含まれる行の番号」の配列で表す）
  let columns = simplices.map((s) => {
    if (s.dim === 0) return [];
    if (s.dim === 1) return [index[String(s.v[0])], index[String(s.v[1])]].sort((a, b) => a - b);
    let [i, j, k] = s.v;
    return [index[[i, j].join(',')], index[[j, k].join(',')], index[[i, k].join(',')]].sort((a, b) => a - b);
  });

  // 列簡約：同じ「いちばん下の 1」を持つ列があれば足し合わせる（XOR）
  let pivotOf = {}; // 行番号 → その行をピボットに持つ列
  let killed = new Array(simplices.length).fill(false);
  let bars = [];
  for (let j = 0; j < columns.length; j++) {
    let col = columns[j];
    while (col.length && pivotOf[col[col.length - 1]] !== undefined) {
      col = xorSorted(col, columns[pivotOf[col[col.length - 1]]]);
    }
    columns[j] = col;
    if (col.length) {
      let low = col[col.length - 1];
      pivotOf[low] = j;
      killed[low] = true;
      let birth = simplices[low].birth, death = simplices[j].birth;
      if (death > birth + 1e-9) bars.push({ dim: simplices[low].dim, birth, death });
    }
  }
  // 誰にも殺されなかった「生む」単体 → 無限に生きるバー
  for (let i = 0; i < simplices.length; i++) {
    if (!columns[i].length && !killed[i] && simplices[i].dim < 2) bars.push({ dim: simplices[i].dim, birth: simplices[i].birth, death: Infinity });
  }
  return bars;
}

// ソート済み配列の対称差（Z2 の足し算）
function xorSorted(a, b) {
  let out = [], i = 0, j = 0;
  while (i < a.length || j < b.length) {
    if (j >= b.length || (i < a.length && a[i] < b[j])) out.push(a[i++]);
    else if (i >= a.length || b[j] < a[i]) out.push(b[j++]);
    else { i++; j++; }
  }
  return out;
}

// 半径 r のときのベッチ数 [β0, β1]（バーの中で r をまたぐものを数える）
function bettiAt(bars, r) {
  let b = [0, 0];
  for (let bar of bars) if (bar.birth <= r && r < bar.death) b[bar.dim]++;
  return b;
}

// バーコードを描く（x, y, w, h の枠に、半径 0〜maxR）
function drawBarcode(bars, x, y, w, h, maxR, currentR) {
  let sorted = bars.filter((b) => b.death - b.birth > maxR * 0.01 || b.death === Infinity).sort((a, b) => a.dim - b.dim || a.birth - b.birth);
  let rowH = Math.min(14, h / Math.max(sorted.length, 1));
  stroke(0, 0, 30);
  strokeWeight(1);
  line(x, y + h, x + w, y + h);
  for (let i = 0; i < sorted.length; i++) {
    let b = sorted[i];
    let x1 = x + (b.birth / maxR) * w, x2 = x + (Math.min(b.death, maxR) / maxR) * w;
    stroke(b.dim === 0 ? 200 : 20, 80, 100);
    strokeWeight(Math.max(2, rowH - 4));
    line(x1, y + i * rowH + rowH / 2, x2, y + i * rowH + rowH / 2);
  }
  if (currentR !== undefined) {
    stroke(45, 90, 100);
    strokeWeight(2);
    line(x + (currentR / maxR) * w, y, x + (currentR / maxR) * w, y + h);
  }
  noStroke();
  fill(0, 0, 60);
  textSize(12);
  text('r = 0', x, y + h + 16);
  text('r = ' + nf(maxR, 1, 0), x + w - 50, y + h + 16);
}
