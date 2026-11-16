// ============================================
// 13 合意と多数決 ─ ネットワークの上の意見
// A 平均化（合意）：となりの意見との差の ε 倍だけ近づく。x ← x ＋ ε Σ(xj − x)。速さはグラフの「代数的連結度 λ2」で決まる
// V 投票者モデル：ランダムに選ばれた人が、となりの 1 人の意見をまねる / M 多数決：となりの多数派に合わせる
// 1〜4 = グラフ（輪・スモールワールド・近い者どうし・スケールフリー）/ A・V・M = モデル / クリック = 頑固者（意見を変えない）
// ↑↓ = ε（平均化の強さ）/ R = 意見をバラバラに / スペース = 一時停止
// ============================================

let NN = 60;                  // ★ 人（ノード）の数
let rewire = 0.15;            // ★ スモールワールドのつなぎ替え確率
let eps = 0.5;                // ε の倍率（実際は ε = この値 / 最大次数）
let rule = 'A', graphId = 2;
let nodes = [], edges = [], adj = [];
let lambda2 = 0, epsNow = 0, var0 = 1, tStep = 0, doneAt = -1, initMean = 0;
let hist = [], paused = false;
const NAMES = { 1: '輪（となり 2 人ずつ）', 2: 'スモールワールド（輪 ＋ 近道）', 3: '近い者どうし（ランダム幾何）', 4: 'スケールフリー（人気者がいる）' };

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  buildGraph(graphId);
}

function addEdge(a, b) { if (a === b || adj[a].includes(b)) return; adj[a].push(b); adj[b].push(a); edges.push([a, b]); }
function buildGraph(id) {
  graphId = id; nodes = []; edges = []; adj = [];
  for (let i = 0; i < NN; i++) { nodes.push({ x: 0, y: 0, v: 0, stub: false }); adj.push([]); }
  let cx = width * 0.33, cy = height * 0.55, R = Math.min(width * 0.28, height * 0.38);
  for (let i = 0; i < NN; i++) { let a = (i / NN) * Math.PI * 2; nodes[i].x = cx + R * Math.cos(a); nodes[i].y = cy + R * Math.sin(a); }
  if (id === 1 || id === 2) {
    for (let i = 0; i < NN; i++) for (let d = 1; d <= 2; d++) {
      let j = (i + d) % NN;
      if (id === 2 && Math.random() < rewire) j = Math.floor(Math.random() * NN);   // 近道につなぎ替え
      addEdge(i, j);
    }
  } else if (id === 3) {
    for (let i = 0; i < NN; i++) { nodes[i].x = cx + (Math.random() - 0.5) * 2 * R; nodes[i].y = cy + (Math.random() - 0.5) * 2 * R; }
    for (let i = 0; i < NN; i++) for (let j = i + 1; j < NN; j++) if (Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y) < R * 0.36) addEdge(i, j);
  } else {
    addEdge(0, 1); addEdge(1, 2); addEdge(2, 0);                                     // バラバシ・アルバートのつながり方
    for (let i = 3; i < NN; i++) {
      for (let m = 0; m < 2; m++) {
        let ends = edges.flat(), j = ends[Math.floor(Math.random() * ends.length)];  // 次数に比例して選ぶ
        addEdge(i, j);
      }
    }
    springLayout(cx, cy, R);
  }
  connectAll();
  computeLambda2();
  resetOpinions();
}
// ばらばらの島があれば、一番近い 2 人をつないで 1 つにする
function connectAll() {
  for (let guard = 0; guard < NN; guard++) {
    let comp = new Array(NN).fill(-1), q = [0]; comp[0] = 0;
    while (q.length) { let a = q.pop(); for (let b of adj[a]) if (comp[b] < 0) { comp[b] = 0; q.push(b); } }
    let out = comp.findIndex((c) => c < 0);
    if (out < 0) return;
    let best = 0, bd = 1e9;
    for (let i = 0; i < NN; i++) if (comp[i] === 0) { let d = Math.hypot(nodes[i].x - nodes[out].x, nodes[i].y - nodes[out].y); if (d < bd) { bd = d; best = i; } }
    addEdge(best, out);
  }
}

// ★ ラプラシアン L = D − A の 2 番目に小さい固有値 λ2 を べき乗法で求める（合意の速さを決める）
function computeLambda2() {
  let maxDeg = Math.max(...adj.map((a) => a.length)), c = 2 * maxDeg + 1;
  epsNow = eps / maxDeg;
  let v = Array.from({ length: NN }, () => Math.random() - 0.5), mu = 0;
  for (let it = 0; it < 3000; it++) {
    let m = v.reduce((a, b) => a + b, 0) / NN; v = v.map((x) => x - m);       // 全員同じ向き（固有値 0）を取り除く
    let w = v.map((x, i) => c * x - (adj[i].length * x - adj[i].reduce((s, j) => s + v[j], 0)));   // (cI − L) v
    let nrm = Math.hypot(...w) || 1;
    mu = w.reduce((s, x, i) => s + x * v[i], 0) / (Math.hypot(...v) ** 2 || 1);
    v = w.map((x) => x / nrm);
  }
  lambda2 = Math.max(0, c - mu);
}

function resetOpinions() {
  for (let n of nodes) n.v = n.stub ? 1 : rule === 'A' ? Math.random() : Math.random() < 0.5 ? 1 : 0;
  tStep = 0; doneAt = -1; hist = [];
  initMean = nodes.reduce((s, n) => s + n.v, 0) / NN;
  var0 = disagreement();
}
function disagreement() { let m = nodes.reduce((s, n) => s + n.v, 0) / NN; return nodes.reduce((s, n) => s + (n.v - m) ** 2, 0) / NN; }

// ★ 1 ステップ
function updateOnce() {
  if (rule === 'A') {
    let nv = nodes.map((n, i) => n.stub ? n.v : n.v + epsNow * adj[i].reduce((s, j) => s + nodes[j].v - n.v, 0));
    nodes.forEach((n, i) => (n.v = constrain(nv[i], 0, 1)));
  } else {
    for (let r = 0; r < NN; r++) {                                  // 1 ステップ = 全員が平均 1 回ずつ
      let i = Math.floor(Math.random() * NN); if (nodes[i].stub || adj[i].length === 0) continue;
      if (rule === 'V') nodes[i].v = nodes[adj[i][Math.floor(Math.random() * adj[i].length)]].v;   // となりの 1 人をまねる
      else { let s = adj[i].reduce((a, j) => a + nodes[j].v, 0) * 2 - adj[i].length; if (s > 0) nodes[i].v = 1; else if (s < 0) nodes[i].v = 0; }   // 多数派に合わせる（同数なら変えない）
    }
  }
  tStep++;
}

function draw() {
  background(255, 30, 11);
  if (!paused) for (let s = 0; s < (rule === 'A' ? 1 : 3); s++) updateOnce();
  let dis = disagreement(), red = nodes.filter((n) => n.v > 0.5).length / NN;
  if (doneAt < 0 && (rule === 'A' ? dis < 1e-6 : red === 0 || red === 1)) doneAt = tStep;
  hist.push(rule === 'A' ? Math.log10(Math.max(dis, 1e-12)) : red); if (hist.length > 400) hist.shift();
  // ---- グラフを描く
  stroke(0, 0, 100, 22); strokeWeight(1);
  for (let [a, b] of edges) line(nodes[a].x, nodes[a].y, nodes[b].x, nodes[b].y);
  noStroke();
  for (let i = 0; i < NN; i++) {
    let n = nodes[i], d = 4 + 1.6 * Math.sqrt(adj[i].length);
    fill(lerp(220, 360, n.v) % 360, 70, 95); circle(n.x, n.y, d * 2);
    if (n.stub) { noFill(); stroke(0, 0, 100); strokeWeight(3); circle(n.x, n.y, d * 2 + 8); noStroke(); }
  }

  // ---- 右：数字とグラフ
  let gx = width * 0.66, gw = width - gx - 30, gy = 120, gh = 160;
  fill(0, 0, 0, 35); rect(gx, gy, gw, gh);
  if (rule === 'A') {
    // 理論：ばらつきは毎ステップ (1 − ε λ2)² 倍ずつ小さくなる（一番遅いモード）
    let rate = 2 * Math.log10(Math.max(Math.abs(1 - epsNow * lambda2), 1e-12)), lo = -12, hi = 0;
    let Y = (v) => gy + gh - constrain((v - lo) / (hi - lo), 0, 1) * gh, start = tStep - hist.length;
    stroke(180, 60, 100); strokeWeight(1.5);
    line(gx, Y(Math.log10(var0) + rate * Math.max(start, 0)), gx + gw, Y(Math.log10(var0) + rate * (start + 400)));
    noFill(); stroke(330, 70, 100); strokeWeight(2);
    beginShape(); for (let i = 0; i < hist.length; i++) vertex(gx + (i / 399) * gw, Y(hist[i])); endShape();
    noStroke(); fill(0, 0, 85); textSize(13); text('log10 ばらつき（ピンク = 実測、水色 = 理論 (1 − ελ2)² 倍 / ステップ）', gx, gy - 8);
  } else {
    stroke(0, 0, 100, 30); line(gx, gy + gh / 2, gx + gw, gy + gh / 2);
    noFill(); stroke(0, 80, 100); strokeWeight(2);
    beginShape(); for (let i = 0; i < hist.length; i++) vertex(gx + (i / 399) * gw, gy + gh - hist[i] * gh); endShape();
    noStroke(); fill(0, 0, 85); textSize(13); text('赤い意見の人の割合', gx, gy - 8);
  }
  fill(0, 0, 100); textSize(16);
  let info = ['グラフ ' + graphId + '：' + NAMES[graphId], '人 ' + NN + '、つながり ' + edges.length + ' 本、最大次数 ' + Math.max(...adj.map((a) => a.length)),
    '代数的連結度 λ2 = ' + nf(lambda2, 1, 4) + '（大きいほど速く合意）',
    'モデル：' + (rule === 'A' ? '平均化（ε = ' + nf(epsNow, 1, 3) + '）' : rule === 'V' ? '投票者モデル' : '多数決'),
    rule === 'A' ? 'ばらつき ' + dis.toExponential(2) + '、合意値の予想 = 最初の平均 ' + nf(initMean, 1, 3) : '赤 ' + nf(red * 100, 1, 0) + ' %、青 ' + nf((1 - red) * 100, 1, 0) + ' %',
    'ステップ ' + tStep + (doneAt >= 0 ? '　→ ' + doneAt + ' ステップで' + (rule === 'A' ? '合意' : '全員一致') : '')];
  for (let i = 0; i < info.length; i++) text(info[i], gx, gy + gh + 34 + i * 26);
  fill(0, 0, 65); textSize(13);
  text('頑固者（白い輪）がいると「平均が保存される」が崩れ、', gx, gy + gh + 34 + 6 * 26 + 10);
  text('全員が頑固者の意見に引っぱられる', gx, gy + gh + 34 + 6 * 26 + 30);

  fill(0, 0, 100); textSize(18);
  text('1〜4：グラフ　A：平均化　V：投票者　M：多数決　クリック：頑固者　↑↓：ε　R：やり直し　スペース：' + (paused ? '停止中' : '実行中'), 20, 36);
  fill(0, 0, 70); textSize(14);
  text('色 = 意見（青 0 〜 赤 1）。点の大きさ = つながりの数（次数）', 20, 60);
}

function mousePressed() {
  for (let n of nodes) if (Math.hypot(n.x - mouseX, n.y - mouseY) < 14) { n.stub = !n.stub; if (n.stub) n.v = 1; return; }
}
function keyPressed() {
  let k = parseInt(key);
  if (k >= 1 && k <= 4) { for (let n of nodes) n.stub = false; buildGraph(k); }
  if (key === 'a' || key === 'A') { rule = 'A'; resetOpinions(); }
  if (key === 'v' || key === 'V') { rule = 'V'; resetOpinions(); }
  if (key === 'm' || key === 'M') { rule = 'M'; resetOpinions(); }
  if (key === UP_ARROW) { eps = Math.min(eps + 0.1, 0.9); computeLambda2(); }
  if (key === DOWN_ARROW) { eps = Math.max(eps - 0.1, 0.1); computeLambda2(); }
  if (key === 'r' || key === 'R') resetOpinions();
  if (key === ' ') paused = !paused;
}

// ---------- やってみよう ----------
// 1. A（平均化）で 1（輪）と 2（スモールワールド）を比べる。近道が少しあるだけで λ2 が何倍になり、合意は何倍速くなる？
// 2. 合意したときの値は「最初の平均」と同じ？ 頑固者を 1 人クリックしてから R すると、合意値はどうなる？
// 3. V（投票者）では、全員一致までに何ステップかかる？ 4（スケールフリー）だと人気者の意見が広まりやすい？
// 4. M（多数決）で 1（輪）にすると、色のかたまりが残って止まる。多数決は「局所的な合意」で固まりやすい
// 5. 投票者モデルで頑固者を 1 人置くと、いつかは全員がその意見になる。少数派でも折れない人の力

// ==================================================
// ここから下は「グラフの道具」です（ばねで並べる）
// ==================================================
function springLayout(cx, cy, R) {
  for (let i = 0; i < NN; i++) { nodes[i].x = cx + (Math.random() - 0.5) * R; nodes[i].y = cy + (Math.random() - 0.5) * R; }
  for (let it = 0; it < 300; it++) {
    let fx = new Array(NN).fill(0), fy = new Array(NN).fill(0);
    for (let i = 0; i < NN; i++) for (let j = i + 1; j < NN; j++) {        // みんな反発
      let dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y, d2 = dx * dx + dy * dy + 1;
      let f = 3000 / d2; fx[i] += dx * f / Math.sqrt(d2); fy[i] += dy * f / Math.sqrt(d2); fx[j] -= dx * f / Math.sqrt(d2); fy[j] -= dy * f / Math.sqrt(d2);
    }
    for (let [a, b] of edges) {                                              // つながりはばね
      let dx = nodes[b].x - nodes[a].x, dy = nodes[b].y - nodes[a].y;
      fx[a] += dx * 0.02; fy[a] += dy * 0.02; fx[b] -= dx * 0.02; fy[b] -= dy * 0.02;
    }
    for (let i = 0; i < NN; i++) {
      fx[i] += (cx - nodes[i].x) * 0.01; fy[i] += (cy - nodes[i].y) * 0.01;
      nodes[i].x = constrain(nodes[i].x + constrain(fx[i], -10, 10), cx - R, cx + R); nodes[i].y = constrain(nodes[i].y + constrain(fy[i], -10, 10), cy - R, cy + R);
    }
  }
}
