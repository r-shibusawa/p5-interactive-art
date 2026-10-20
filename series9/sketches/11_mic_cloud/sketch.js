// ============================================
// 11 声の輪（マイクの波形を点群にする）
// 08 と同じ遅延埋め込みを、マイクの波形にリアルタイムで
// 「あー」と一定の声を出すと、波形は周期的 → 点は輪を描く → H1 の長い棒が立つ
// 息や「す〜」（ノイズ）だと輪にならない。クリックでマイク ON / マウス左右 = 遅れ τ
// ============================================

let pts = [], bars = [];
let tau = 20;
let maxR = 120;
let holes = 0;
let frameSkip = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(230, 40, 10);
  tau = floor(map(mouseX, 0, width, 2, 80, true));
  if (micReady) {
    analyser.getFloatTimeDomainData(waveData);
    let lvl = getMicLevel();
    // 波形（上）
    noFill();
    stroke(170, 60, 100, 60);
    strokeWeight(1.5);
    beginShape();
    for (let i = 0; i < 1024; i += 4) vertex(map(i, 0, 1024, 60, width - 60), 150 - waveData[i] * 120);
    endShape();
    // ★ 遅延埋め込み：(x(t), x(t+τ)) を 36 点
    if (lvl > 0.01) {
      pts = [];
      let cx = width * 0.3, cy = height * 0.6, S = min(width, height) * 0.2 / max(lvl * 3, 0.1);
      for (let i = 0; i < 36; i++) {
        let t = floor(map(i, 0, 36, 0, 1024 - tau - 1));
        pts.push({ x: cx + waveData[t] * S, y: cy - waveData[t + tau] * S });
      }
      // 計算は重いので 6 フレームに 1 回
      if (frameSkip++ % 6 === 0) {
        bars = persistence(pts, maxR);
        holes = bars.filter((b) => b.dim === 1 && (b.death === Infinity ? maxR : b.death) - b.birth > maxR * 0.15).length;
      }
    }
  }
  // 点群
  noStroke();
  for (let i = 0; i < pts.length; i++) { fill(map(i, 0, 36, 180, 330), 70, 100); circle(pts[i].x, pts[i].y, 9); }
  stroke(0, 0, 35);
  noFill();
  beginShape();
  for (let p of pts) vertex(p.x, p.y);
  endShape();

  let bx = width * 0.58, bw = width - bx - 50;
  drawBarcode(bars, bx, 260, bw, height - 360, maxR);
  noStroke();
  fill(holes > 0 ? 45 : 0, holes > 0 ? 90 : 0, holes > 0 ? 100 : 60);
  textSize(40);
  text(holes > 0 ? '輪がある（周期的な音）' : '輪なし', bx, 230);

  fill(0, 0, 100);
  textSize(18);
  text(micReady ? '「あー」と一定の声 → 輪　「す〜」や息 → 輪なし　遅れ τ = ' + tau + '（マウス左右）' : 'クリックしてマイクを ON にしよう', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('声帯の振動は周期的なので、波形を (x(t), x(t+τ)) に変換すると輪になる。輪の数・形は声の高さや音色で変わる', 20, 68);
}

function mousePressed() { startMic(); }

// ---------- やってみよう ----------
// 1. 低い声と高い声で、輪が丸く見える τ は変わる？（周期の 1/4 ＝ 高い声ほど小さい τ）
// 2. 2 人で同時に「あー」→ 輪は 2 つ？ ねじれる？
// 3. 口笛（ほぼ正弦波）はきれいな円。「あ」と「い」で輪の形（音色）が変わる


// ==================================================
// ここから下は「マイクを使うための道具」です
// ==================================================
let audioCtx, analyser, waveData;
let micReady = false;
function startMic() {
  if (audioCtx) return;
  audioCtx = new AudioContext();
  navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
    let source = audioCtx.createMediaStreamSource(stream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    waveData = new Float32Array(analyser.fftSize);
    micReady = true;
  }).catch((err) => { console.log('マイクが使えません：' + err); audioCtx = null; });
}
function getMicLevel() {
  if (!micReady) return 0;
  let sum = 0;
  for (let i = 0; i < waveData.length; i++) sum += waveData[i] * waveData[i];
  return Math.sqrt(sum / waveData.length);
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
