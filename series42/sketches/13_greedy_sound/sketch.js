// ============================================
// 13 貪欲法を聴く
// クラスカル法（06）を音にする：辺を軽い順に試し、採用（独立）なら明るい音、閉路（従属）なら不協和音
//   音の高さは辺の重み（短い辺ほど高い音）。完成した全域木は P で重み順にメロディとして鳴らす
//   自由制作のベース：音色・テンポ・「何を音にするか」を変えて自分の貪欲法を作ろう
// クリック = まず 1 回（音をオン） / スペース = 1 ステップ / A = 自動 / P = 木を鳴らす / R = 最初から / N = 新しいグラフ / 1〜3 = 音色
// ============================================

let nodes = [], edges = [];          // edges: {a, b, w}
let nNode = 8;                       // ★ ノードの数
let order = [], stepI = 0, status = [];
let auto = false, timer = 0;
let waveType = 'triangle';           // ★ 音色（1 = triangle, 2 = sine, 3 = square）
let tempo = 22;                      // ★ 自動のとき何フレームに 1 本試すか
let ripples = [];                    // 採用の波紋 {x, y, t, ok}
let melody = null;                   // 木を鳴らす {list, k, t}

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  textFont('sans-serif');
  newGraph();
}

function newGraph() {
  nodes = []; edges = [];
  let tries = 0;
  while (nodes.length < nNode && tries++ < 500) {
    let p = { x: random(80, width - 420), y: random(130, height - 60) };
    if (nodes.every((q) => dist(p.x, p.y, q.x, q.y) > 120)) nodes.push(p);
  }
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
    let d = dist(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y);
    if (d < min(width, height) * 0.42) edges.push({ a: i, b: j, w: Math.round(d / 10) });
  }
  let uf = makeUF(nodes.length);
  for (let e of edges) uf.union(e.a, e.b);
  for (let i = 1; i < nodes.length; i++) if (uf.find(i) !== uf.find(0)) { edges.push({ a: 0, b: i, w: Math.round(dist(nodes[0].x, nodes[0].y, nodes[i].x, nodes[i].y) / 10) }); uf.union(0, i); }
  reset();
}
function reset() {
  order = [...Array(edges.length).keys()].sort((p, q) => edges[p].w - edges[q].w);
  status = new Array(edges.length).fill(''); stepI = 0; auto = false; melody = null; ripples = [];
}

// ★ 重み → 周波数（短い辺ほど高い音。ペンタトニックに丸める）
function freqOf(w) {
  let scaleNotes = [0, 2, 4, 7, 9];
  let idx = constrain(Math.round(map(w, 10, 60, 14, 0)), 0, 14);
  let semis = scaleNotes[idx % 5] + 12 * floor(idx / 5);
  return 220 * Math.pow(2, semis / 12);
}

function kruskalStep() {
  if (stepI >= order.length) return;
  let i = order[stepI], e = edges[i];
  let chosen = order.slice(0, stepI).filter((j) => status[j] === 'ok');
  let ok = isForest(nodes.length, edges, chosen.concat([i]));
  status[i] = ok ? 'ok' : 'ng';
  let mx = (nodes[e.a].x + nodes[e.b].x) / 2, my = (nodes[e.a].y + nodes[e.b].y) / 2;
  ripples.push({ x: mx, y: my, t: 0, ok });
  if (ok) playNote(freqOf(e.w), 0.35, waveType);
  else { playNote(freqOf(e.w), 0.4, 'sawtooth'); playNote(freqOf(e.w) * 1.06, 0.4, 'sawtooth'); }   // 近い 2 音 = うなり（不協和）
  stepI++;
}
function playTree() {
  let list = order.filter((i) => status[i] === 'ok');
  if (list.length) melody = { list, k: 0, t: 0 };
}

function draw() {
  background(330, 30, 8);
  if (auto && ++timer % tempo === 0) { kruskalStep(); if (stepI >= order.length) auto = false; }
  if (melody) {
    if (melody.t++ % 14 === 0) {
      if (melody.k >= melody.list.length) melody = null;
      else { let e = edges[melody.list[melody.k]]; playNote(freqOf(e.w), 0.3, waveType); ripples.push({ x: (nodes[e.a].x + nodes[e.b].x) / 2, y: (nodes[e.a].y + nodes[e.b].y) / 2, t: 0, ok: true }); melody.k++; }
    }
  }
  let nOk = status.filter((s) => s === 'ok').length, done = nOk === nodes.length - 1;
  let current = stepI < order.length && !done ? order[stepI] : -1;
  let playing = melody && melody.k > 0 ? melody.list[melody.k - 1] : -1;

  for (let i = 0; i < edges.length; i++) {
    let e = edges[i], p = nodes[e.a], q = nodes[e.b];
    if (i === playing) { stroke(50, 90, 100); strokeWeight(10); }
    else if (status[i] === 'ok') { stroke(130, 85, 100); strokeWeight(6); }
    else if (status[i] === 'ng') { stroke(5, 70, 60, 50); strokeWeight(1.5); drawingContext.setLineDash([5, 7]); }
    else if (i === current) { stroke(50, 90, 100); strokeWeight(3); }
    else { stroke(0, 0, 35); strokeWeight(1.5); }
    line(p.x, p.y, q.x, q.y); drawingContext.setLineDash([]);
  }
  for (let r of ripples) { r.t += 1 / 30; noFill(); stroke(r.ok ? 130 : 5, 80, 100, 100 * (1 - r.t)); strokeWeight(3); circle(r.x, r.y, 20 + 120 * r.t); }
  ripples = ripples.filter((r) => r.t < 1);
  for (let i = 0; i < nodes.length; i++) { stroke(0, 0, 100); strokeWeight(2); fill(330, 40, 85); circle(nodes[i].x, nodes[i].y, 24); }

  textAlign(LEFT, BASELINE);
  fill(0, 0, 100); textSize(18);
  text((audioCtx ? '' : 'まずクリック（音をオン）　') + 'スペース：1 ステップ　A：自動 ' + (auto ? 'ON' : 'off') + '　P：木を鳴らす　R：最初から　N：新しいグラフ　1〜3：音色', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('採用（独立）= 明るい音、閉路（従属）= うなる不協和音。短い辺ほど高い音。完成したら P でメロディ', 20, 66);

  let px = width - 380, py = 120;
  noStroke(); fill(0, 0, 100, 8); rect(px - 20, py - 40, 370, height - py - 20, 12);
  fill(done ? 130 : 50, 80, 100); textSize(24);
  text(done ? '全域木 完成！　P で鳴らす' : stepI + ' / ' + edges.length + ' 本を試した', px, py);
  fill(0, 0, 100); textSize(16);
  text('採用 ' + nOk + ' 本　捨てた ' + status.filter((s) => s === 'ng').length + ' 本　音色 ' + waveType, px, py + 30);
  textSize(14);
  let rowH = 20, maxRows = floor((height - py - 100) / rowH);
  for (let k = 0; k < min(order.length, maxRows); k++) {
    let i = order[k], e = edges[i], st = status[i];
    fill(st === 'ok' ? 130 : st === 'ng' ? 5 : k === stepI ? 50 : 0, st || k === stepI ? 75 : 0, st === 'ng' ? 65 : k > stepI ? 55 : 100);
    text((k === stepI && !done ? '▶ ' : '　 ') + nf(e.w, 2) + '　' + (e.a + 1) + '–' + (e.b + 1) + '　' + nf(freqOf(e.w), 1, 0) + ' Hz　' + (st === 'ok' ? '♪ 採用' : st === 'ng' ? '✗ 閉路' : ''), px, py + 64 + k * rowH);
  }
  if (order.length > maxRows) { fill(0, 0, 50); text('… 他 ' + (order.length - maxRows) + ' 本', px, py + 64 + maxRows * rowH); }
}

function mousePressed() { startAudio(); }
function keyPressed() {
  startAudio();
  if (key === ' ') kruskalStep();
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'p' || key === 'P') playTree();
  if (key === 'r' || key === 'R') reset();
  if (key === 'n' || key === 'N') newGraph();
  if (key === '1') waveType = 'triangle';
  if (key === '2') waveType = 'sine';
  if (key === '3') waveType = 'square';
}

// ---------- やってみよう ----------
// 1. tempo を 8 にして自動再生。採用の音と閉路の音が「だんだん閉路ばかり」になるのが聞こえる？
// 2. freqOf を「重い辺ほど高い音」に変える。木の完成までの音が上がっていく形になる
// 3. 閉路のとき、その閉路の辺を全部短く鳴らす（01 の cycleEdges を使う）
// 4. 06 のドラッグを足して、ノードを動かしながら木が変わる音を聴く。14 のブラシと合体しても楽しい

// ==================================================
// ここから下は「音を鳴らすための道具」（Web Audio）
// ==================================================
let audioCtx, masterOut;
function startAudio() {
  if (!audioCtx) { audioCtx = new AudioContext(); masterOut = audioCtx.createDynamicsCompressor(); masterOut.connect(audioCtx.destination); }
  audioCtx.resume();
}
// 1 音鳴らす：周波数 f、長さ dur 秒、波形 type
function playNote(f, dur, type) {
  if (!audioCtx) return;
  let o = audioCtx.createOscillator(), g = audioCtx.createGain(), t = audioCtx.currentTime;
  o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(masterOut);
  o.start(t); o.stop(t + dur + 0.05);
}

// ==================================================
// ここから下は「マトロイドの道具」（union–find と森の判定）
// ==================================================
function makeUF(n) {
  let parent = [...Array(n).keys()];
  let find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  let union = (a, b) => { a = find(a); b = find(b); if (a === b) return false; parent[a] = b; return true; };
  return { find, union };
}
function isForest(n, edgeList, sub) {
  let uf = makeUF(n);
  for (let i of sub) if (!uf.union(edgeList[i].a, edgeList[i].b)) return false;
  return true;
}
