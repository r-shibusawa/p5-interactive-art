// ============================================
// 12 点を置いて穴をつくる（自由制作のベース）
// クリックで点を置くと、半径 r の複体とバーコードがその場で更新される
// 穴が生まれた瞬間に音が鳴る。「穴を 3 つ作る」「できるだけ長生きの穴を作る」などのゲームに
// クリックで点を置く / マウス左右（上の帯）= r / C で消す / S で保存
// ============================================
// ★ のついた数字を変えて、自分の TDA アートに！

let pts = [], bars = [];
let r = 50;
let maxR = 160; // ★ 計算する最大の半径
let lastHoles = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function recompute() {
  bars = pts.length > 1 ? persistence(pts, maxR) : [];
  let holes = bars.filter((b) => b.dim === 1 && (b.death === Infinity ? maxR : b.death) - b.birth > 8).length;
  if (holes > lastHoles) playNote(440 + holes * 110, 0.3, 0.6); // ★ 穴が増えたら音
  lastHoles = holes;
}

function draw() {
  background(230, 40, 8);
  // 帯（r）
  noStroke();
  fill(0, 0, 20);
  rect(20, 80, width * 0.5, 14, 7);
  fill(45, 90, 100);
  rect(20, 80, (width * 0.5 * r) / maxR, 14, 7);

  let { edges, triangles } = pts.length ? ripsComplex(pts, r) : { edges: [], triangles: [] };
  noStroke();
  fill(170, 60, 60, 20); // ★ 三角形の色
  for (let [i, j, k] of triangles) triangle(pts[i].x, pts[i].y, pts[j].x, pts[j].y, pts[k].x, pts[k].y);
  stroke(170, 60, 100, 60); // ★ 線の色
  strokeWeight(1.5);
  for (let [i, j] of edges) line(pts[i].x, pts[i].y, pts[j].x, pts[j].y);
  noStroke();
  for (let p of pts) { fill(0, 0, 100, 5); circle(p.x, p.y, r * 2); }
  for (let p of pts) { fill(45, 80, 100); circle(p.x, p.y, 8); } // ★ 点の見た目

  if (bars.length) {
    let bx = width * 0.58, bw = width - bx - 50;
    drawBarcode(bars, bx, 120, bw, height - 220, maxR, r);
  }
  let [b0, b1] = bars.length ? bettiAt(bars, r) : [pts.length, 0];
  fill(0, 0, 100);
  textSize(18);
  text('クリックで点（' + pts.length + '個）　r = ' + round(r) + '（上の帯）　いま 塊 ' + b0 + '、穴 ' + b1 + '　C：消す　S：保存', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('目標：穴を 3 つ作る／ r を動かしてもずっと消えない穴を作る／ 2 つの穴が同時に生まれる配置を見つける', 20, 64);
}

function mousePressed() {
  startAudio();
  if (mouseY > 74 && mouseY < 100 && mouseX < width * 0.5 + 20) { r = constrain(((mouseX - 20) / (width * 0.5)) * maxR, 1, maxR); return; }
  if (mouseY < 100 || pts.length >= 40) return; // ★ 最大 40 点（多いと重い）
  pts.push({ x: mouseX, y: mouseY });
  recompute();
}
function mouseDragged() {
  if (mouseY > 74 && mouseY < 100 && mouseX < width * 0.5 + 20) r = constrain(((mouseX - 20) / (width * 0.5)) * maxR, 1, maxR);
}
function keyPressed() {
  if (key === 'c' || key === 'C') { pts = []; bars = []; lastHoles = 0; }
  if (key === 's' || key === 'S') saveCanvas('tda', 'png');
}

// ---------- 自由制作のアイデア ----------
// ・点を置くたびに、全部のバーを和音として鳴らす（10 を参考に）
// ・点を少しずつ動かして（ノイズ）、バーコードが「ゆれる」アニメーション
// ・11 のマイクの点群と合体：声で点が置かれる
// ・三角形の色を「生まれた r」で変える（古い三角形ほど濃く）


// ==================================================
// ここから下は「音を鳴らすための道具」です
// ==================================================
let audioCtx, masterOut;
function startAudio() {
  if (!audioCtx) { audioCtx = new AudioContext(); masterOut = audioCtx.createDynamicsCompressor(); masterOut.connect(audioCtx.destination); }
  audioCtx.resume();
}
function playNote(freqHz, volume = 0.3, duration = 0.3, type = 'triangle', when) {
  if (!audioCtx) return;
  let t = when === undefined ? audioCtx.currentTime : when;
  let osc = audioCtx.createOscillator(), amp = audioCtx.createGain();
  osc.type = type; osc.frequency.value = freqHz;
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(volume, t + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(amp); amp.connect(masterOut); osc.start(t); osc.stop(t + duration + 0.05);
}



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
