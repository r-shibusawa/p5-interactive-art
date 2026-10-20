// ============================================
// 14 3 次元の形：球とトーラス（おまけ）
// 点が 3 次元でも計算は同じ。球面の点は穴なし、ドーナツ（トーラス）の点は輪が 2 つ
// 1 = 球 / 2 = トーラス / 3 = 2 つの球 / マウスで回転 / スペースで計算（数秒かかる）
// ============================================

let pts3 = [];
let kind = 2;
let bars = [];
let maxR = 1.1;
let computed = false;
let names = ['', '球', 'トーラス（ドーナツ）', '2 つの球'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  makePoints();
}

function makePoints() {
  pts3 = [];
  let n = 48;
  for (let i = 0; i < n; i++) {
    let u = (TWO_PI * (i % 8)) / 8 + (floor(i / 8) % 2) * 0.39, v = (TWO_PI * floor(i / 8)) / 6;
    if (kind === 1) { let a = acos(1 - 2 * ((i + 0.5) / n)), b = PI * (1 + sqrt(5)) * i; pts3.push({ x: sin(a) * cos(b), y: sin(a) * sin(b), z: cos(a) }); }
    else if (kind === 2) { let Rb = 1, rt = 0.45; pts3.push({ x: (Rb + rt * cos(v)) * cos(u), y: (Rb + rt * cos(v)) * sin(u), z: rt * sin(v) }); }
    else { let a = acos(1 - 2 * (((i % 24) + 0.5) / 24)), b = PI * (1 + sqrt(5)) * i; let s = i < 24 ? -1.3 : 1.3; pts3.push({ x: 0.6 * sin(a) * cos(b) + s, y: 0.6 * sin(a) * sin(b), z: 0.6 * cos(a) }); }
  }
  bars = [];
  computed = false;
}

function draw() {
  background(230, 40, 10);
  let ry = map(mouseX, 0, width, -PI, PI), rx = map(mouseY, 0, height, -1, 1);
  let cx = width * 0.3, cy = height * 0.55, S = min(width, height) * 0.18;
  let proj = pts3.map((p) => {
    let x1 = p.x * cos(ry) - p.y * sin(ry), y1 = p.x * sin(ry) + p.y * cos(ry);
    let y2 = y1 * cos(rx) - p.z * sin(rx), z2 = y1 * sin(rx) + p.z * cos(rx);
    return { x: cx + x1 * S, y: cy - z2 * S, depth: y2 };
  });
  // 辺（r = 0.35 のリップス、見た目用）
  stroke(170, 60, 100, 40);
  strokeWeight(1);
  for (let i = 0; i < pts3.length; i++) for (let j = i + 1; j < pts3.length; j++) if (ptDist(pts3[i], pts3[j]) < 0.7) line(proj[i].x, proj[i].y, proj[j].x, proj[j].y);
  noStroke();
  for (let p of proj) { fill(170, 70, map(p.depth, -1.5, 1.5, 50, 100)); circle(p.x, p.y, map(p.depth, -1.5, 1.5, 5, 11)); }

  let bx = width * 0.58, bw = width - bx - 50;
  if (computed) {
    drawBarcode(bars, bx, 120, bw, height - 220, maxR);
    let h1 = bars.filter((b) => b.dim === 1 && (b.death === Infinity ? maxR : b.death) - b.birth > maxR * 0.15).length;
    fill(0, 0, 100);
    textSize(28);
    text('長い H1 の棒 = ' + h1 + ' 本', bx, height - 70);
  } else {
    fill(0, 0, 60);
    textSize(20);
    text('スペースで計算（数秒かかります）', bx, 200);
  }
  fill(0, 0, 100);
  textSize(18);
  text('形：' + names[kind] + '（1〜3）　マウスで回転　スペースで H1 を計算', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('期待：球 → 穴 0、トーラス → 輪 2（穴のまわりと、筒のまわり）、2 つの球 → 塊 2・穴 0。3 次元でも「距離」さえあれば同じ計算', 20, 68);
}

function keyPressed() {
  if (key >= '1' && key <= '3') { kind = int(key); makePoints(); }
  if (key === ' ') { bars = persistence(pts3, maxR); computed = true; }
}

// ---------- やってみよう ----------
// 1. トーラスの 2 本の H1 の棒の長さは同じ？（短い方 = 筒の太さ、長い方 = ドーナツの穴）
// 2. 球には H2（空洞）があるはず。この道具は H1 までしか計算しない。どう拡張する？
// 3. 点を 48 → 100 にすると、計算時間はどれくらい増える？（三角形の数が急増）



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
