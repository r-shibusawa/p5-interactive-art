// ============================================
// 04 パーシステント・バーコード（穴の一生を記録する）
// r を 0 から大きくしていき、塊や穴が「生まれた r」と「消えた r」を棒で表す
// 長い棒 = ずっと存在する本物の特徴。短い棒 = ノイズ
// 自動で r が動く / スペースで一時停止 / 1〜4 で形 / クリックで作り直す
// ============================================

let pts = [];
let r = 0;
let shape = 1;
let seed = 5;
let bars = [];
let maxR = 170;
let paused = false;
let names = ['', '円', '2 つの円', '塊', '8 の字'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  makePoints();
}

function makePoints() {
  randomSeed(seed);
  pts = [];
  let cx = width * 0.3, cy = height / 2 + 30, R = min(width, height) * 0.22;
  for (let i = 0; i < 28; i++) {
    let a = random(TWO_PI), x, y;
    if (shape === 1) { x = cx + cos(a) * R; y = cy + sin(a) * R; }
    else if (shape === 2) { let s = random() < 0.5 ? -1 : 1; x = cx + s * R * 1.1 + cos(a) * R * 0.6; y = cy + sin(a) * R * 0.6; }
    else if (shape === 3) { let rr = R * sqrt(random()); x = cx + cos(a) * rr; y = cy + sin(a) * rr; }
    else { x = cx + R * 1.2 * sin(a); y = cy + R * 0.8 * sin(a) * cos(a); }
    pts.push({ x: x + randomGaussian() * 6, y: y + randomGaussian() * 6 });
  }
  bars = persistence(pts, maxR); // ★ バーコードを計算
  r = 0;
}

function draw() {
  background(230, 40, 10);
  if (!paused) r = (r + 0.6) % maxR;
  let { edges, triangles } = ripsComplex(pts, r);
  let [b0, b1] = bettiAt(bars, r);

  // 左：複体
  noStroke();
  fill(170, 60, 60, 25);
  for (let [i, j, k] of triangles) triangle(pts[i].x, pts[i].y, pts[j].x, pts[j].y, pts[k].x, pts[k].y);
  stroke(170, 60, 100, 70);
  strokeWeight(1.5);
  for (let [i, j] of edges) line(pts[i].x, pts[i].y, pts[j].x, pts[j].y);
  noStroke();
  for (let p of pts) { fill(0, 0, 100, 6); circle(p.x, p.y, r * 2); }
  for (let p of pts) { fill(0, 0, 100); circle(p.x, p.y, 6); }

  // 右：バーコード
  let bx = width * 0.58, bw = width - bx - 50, by = 120, bh = height - 220;
  drawBarcode(bars, bx, by, bw, bh, maxR, r); // ★ 道具
  noStroke();
  fill(200, 80, 100);
  textSize(14);
  text('■ H0（塊）', bx, by - 30);
  fill(20, 80, 100);
  text('■ H1（穴）', bx + 100, by - 30);
  fill(0, 0, 60);
  text('棒の左端 = 生まれた r、右端 = 消えた r（右端が枠の外 = ずっと生きる）', bx + 200, by - 30);

  fill(0, 0, 100);
  textSize(18);
  text('r = ' + round(r) + '　いま β0 = ' + b0 + '、β1 = ' + b1 + '　スペースで' + (paused ? '再開' : '一時停止') + '　形：' + names[shape] + '（1〜4）　クリックで作り直す', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('黄の線が今の r。H0 の棒は点の数だけあり、合体するたびに 1 本ずつ消える。H1 の長い棒が「本物の穴」', 20, 68);
}

function keyPressed() {
  if (key === ' ') paused = !paused;
  if (key >= '1' && key <= '4') { shape = int(key); makePoints(); }
}
function mousePressed() { seed = floor(random(10000)); makePoints(); }

// ---------- やってみよう ----------
// 1. 4 つの形で、H1 の長い棒の数を比べる（円 1、2 つの円 2、塊 0、8 の字 2）
// 2. 短い H1 の棒はどこから来る？（点が偶然 4 つ並んだところ。r を止めて見てみよう）
// 3. 長い H0 の棒が 2 本残る形は？（2 つの塊が離れている）



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
