// ============================================
// 15 カメラに映った形の穴を数える（おまけ）
// カメラの映像を 2 値化し、暗い（または明るい）部分から点をサンプリングして TDA
// 指で輪を作る、紙に描いた図形を見せる → 穴の数が出る（カメラの許可が必要）
// マウス左右 = しきい値 / I で白黒反転 / スペースで計算
// ============================================

let video;
let w = 96, h = 72;
let pts = [], bars = [];
let threshold = 100;
let invert = false;
let holes = 0, comps = 0;
let maxR = 90;
let lastCompute = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  colorMode(HSB, 360, 100, 100, 100);
  video = createCapture(VIDEO);
  video.size(w, h);
  video.hide();
}

function draw() {
  background(230, 40, 10);
  threshold = map(mouseX, 0, width, 30, 220, true);
  video.loadPixels();
  if (video.pixels.length === 0) return;

  // 2 値化して表示
  let sc = min((width * 0.55) / w, (height - 160) / h);
  let ox = 30, oy = 110;
  let on = [];
  noStroke();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let i = (x + y * w) * 4;
    let b = (video.pixels[i] + video.pixels[i + 1] + video.pixels[i + 2]) / 3;
    let v = invert ? b > threshold : b < threshold;
    on.push(v);
    fill(v ? 45 : 0, v ? 80 : 0, v ? 100 : 25);
    rect(ox + (w - 1 - x) * sc, oy + y * sc, sc, sc);
  }
  // ★ ON の画素から 40 点をサンプリング（間引く）
  if (millis() - lastCompute > 700) {
    lastCompute = millis();
    let cand = [];
    for (let i = 0; i < on.length; i++) if (on[i]) cand.push(i);
    pts = [];
    if (cand.length > 10) {
      let stepN = max(1, floor(cand.length / 40));
      for (let k = 0; k < cand.length && pts.length < 40; k += stepN) {
        let i = cand[k];
        pts.push({ x: ox + (w - 1 - (i % w)) * sc, y: oy + floor(i / w) * sc });
      }
      bars = persistence(pts, maxR);
      holes = bars.filter((b) => b.dim === 1 && (b.death === Infinity ? maxR : b.death) - b.birth > maxR * 0.15).length;
      comps = bars.filter((b) => b.dim === 0 && (b.death === Infinity ? maxR : b.death) - b.birth > maxR * 0.3).length;
    }
  }
  for (let p of pts) { fill(170, 80, 100); circle(p.x, p.y, 7); }

  let bx = width * 0.62, bw = width - bx - 40;
  if (bars.length) drawBarcode(bars, bx, 120, bw, height * 0.45, maxR);
  fill(0, 0, 100);
  textSize(60);
  text('穴 ' + holes, bx, height * 0.75);
  textSize(28);
  text('塊 ' + comps, bx, height * 0.75 + 44);

  textSize(18);
  text('しきい値 ' + round(threshold) + '（マウス左右）　I：反転（' + (invert ? '明るい部分' : '暗い部分') + 'を ON）　点 ' + pts.length, 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('指で輪を作る、「O」や「8」を書いた紙を見せる → 穴の数。背景は無地にして、しきい値を調整しよう', 20, 68);
}

function keyPressed() {
  if (key === 'i' || key === 'I') invert = !invert;
}

// ---------- やってみよう ----------
// 1. 指で「OK」の輪を作って、穴 1 が出るか。両手で 2 つの輪なら？
// 2. メガネ、ドーナツ、数字の 8 と 0 と 1。穴の数で区別できる
// 3. サンプリングする点を 40 → 60 にすると正確になるが遅くなる。限界を探そう



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
