// ============================================
// 05 パーシステンス図とノイズへの強さ
// バーを点にする：横 = 生まれた r、縦 = 消えた r。対角線から遠い点ほど長生き = 本物の特徴
// ノイズを増やしても、本物の穴の点は対角線から離れたまま（安定性定理）
// マウス上下 = ノイズの大きさ / 1〜4 で形 / クリックで作り直す
// ============================================

let pts = [];
let shape = 1;
let seed = 5;
let bars = [];
let maxR = 170;
let noiseAmt = 5;
let names = ['', '円', '2 つの円', '塊', '8 の字'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function makePoints() {
  randomSeed(seed);
  pts = [];
  let cx = width * 0.28, cy = height / 2 + 30, R = min(width, height) * 0.22;
  for (let i = 0; i < 28; i++) {
    let a = random(TWO_PI), x, y;
    if (shape === 1) { x = cx + cos(a) * R; y = cy + sin(a) * R; }
    else if (shape === 2) { let s = random() < 0.5 ? -1 : 1; x = cx + s * R * 1.1 + cos(a) * R * 0.6; y = cy + sin(a) * R * 0.6; }
    else if (shape === 3) { let rr = R * sqrt(random()); x = cx + cos(a) * rr; y = cy + sin(a) * rr; }
    else { x = cx + R * 1.2 * sin(a); y = cy + R * 0.8 * sin(a) * cos(a); }
    pts.push({ x: x + randomGaussian() * noiseAmt, y: y + randomGaussian() * noiseAmt });
  }
  bars = persistence(pts, maxR);
}

function draw() {
  background(230, 40, 10);
  let na = round(map(mouseY, 0, height, 40, 0, true));
  if (na !== noiseAmt || !pts.length) { noiseAmt = na; makePoints(); }

  // 左：点群
  noStroke();
  for (let p of pts) { fill(170, 70, 100); circle(p.x, p.y, 7); }

  // 右：パーシステンス図
  let dx = width * 0.55, dsize = min(width * 0.4, height - 200), dy = 110;
  stroke(0, 0, 30);
  noFill();
  rect(dx, dy, dsize, dsize);
  stroke(0, 0, 45);
  line(dx, dy + dsize, dx + dsize, dy); // 対角線
  // 対角線に近い帯（ノイズ領域の目安）
  noStroke();
  fill(0, 0, 100, 5);
  beginShape();
  vertex(dx, dy + dsize); vertex(dx + dsize, dy); vertex(dx + dsize, dy + 30); vertex(dx + 30, dy + dsize);
  endShape(CLOSE);
  let longest1 = 0;
  for (let b of bars) {
    let px = dx + (b.birth / maxR) * dsize;
    let py = dy + dsize - (min(b.death, maxR) / maxR) * dsize;
    let life = (b.death === Infinity ? maxR : b.death) - b.birth;
    if (b.dim === 1) longest1 = max(longest1, life);
    fill(b.dim === 0 ? 200 : 20, 80, 100, b.death === Infinity ? 100 : 80);
    circle(px, py, b.dim === 1 ? 14 : 8);
    if (b.death === Infinity) { stroke(200, 80, 100); line(px, py, px, dy); noStroke(); }
  }
  fill(0, 0, 60);
  textSize(13);
  text('生まれた r →', dx + dsize - 90, dy + dsize + 20);
  text('消えた r ↑', dx - 10, dy - 10);
  fill(200, 80, 100); text('● H0', dx, dy + dsize + 40);
  fill(20, 80, 100); text('● H1', dx + 60, dy + dsize + 40);

  // 本物の穴の数（寿命が長い H1）
  let realHoles = bars.filter((b) => b.dim === 1 && (b.death === Infinity ? maxR : b.death) - b.birth > maxR * 0.2).length;
  fill(0, 0, 100);
  textSize(18);
  text('ノイズ ' + noiseAmt + '（マウス上下）　形：' + names[shape] + '（1〜4）　寿命の長い穴 = ' + realHoles + ' 個　クリックで作り直す', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('対角線の近く（薄い帯）= すぐ消える = ノイズ。遠く = 長生き = 形の本質。ノイズを増やしても H1 の大きな点はあまり動かない（安定性）', 20, 68);
}

function keyPressed() { if (key >= '1' && key <= '4') { shape = int(key); makePoints(); } }
function mousePressed() { seed = floor(random(10000)); makePoints(); }

// ---------- やってみよう ----------
// 1. ノイズ 0 → 20 → 40 と増やして、H1 の大きな点がどこまで残るか見る
// 2. 「本物」の判定（寿命 > maxR × 0.2）のしきい値を変えると、答えは変わる？
// 3. 図の上に「点の数」が多いほど対角線近くが混む。それでも遠い点は目立つ



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
