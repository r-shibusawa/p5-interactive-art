// ============================================
// 13 NP 完全の遊び場（自由制作のベース）
// グラフを描いて、4 つの NP 完全問題をその場で解かせる。答えが見つかると、選ばれた点が順に音を奏でる
// 1：最小頂点被覆　2：最大クリーク　3：3 色塗り分け（グラフ彩色）　4：ハミルトン閉路
// 何もない所をクリック：点（クリックで音）/ 点から点へドラッグ：線 / スペース：解く / R：ランダム / C：消す / S：答えをもう一度鳴らす
// ★ 色・音階・問題を変えて、自分の「解ける絵」をつくろう
// ============================================

let nodes = [], edges = [];
let problem = 1;
let solver = null, answer = null, steps = 0, status = '';
let MAX_N = 16;                          // ★ 点の上限（大きいと解くのに時間がかかる）
let STEPS_PER_FRAME = 3000;              // ★ 1 フレームに進める探索の手数
let tones = [0, 2, 4, 7, 9, 12, 14, 16]; // ★ 音階
let palette = [350, 45, 190, 120];       // ★ 色相（3 色塗りの 3 色＋α）
let dragFrom = -1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  randomGraph();
}
function randomGraph() {
  nodes = []; edges = [];
  for (let i = 0; i < 10; i++) nodes.push({ x: random(120, width - 120), y: random(170, height - 90) });
  for (let i = 0; i < 10; i++) for (let j = i + 1; j < 10; j++)
    if (dist(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y) < min(width, height) * 0.35 && random() < 0.55) edges.push([i, j]);
  clearAnswer();
}
function clearAnswer() { solver = null; answer = null; steps = 0; status = ''; }
function adj(a, b) { return edges.some(([p, q]) => (p === a && q === b) || (p === b && q === a)); }
function nb(v) { return edges.filter((e) => e.includes(v)).map(([p, q]) => (p === v ? q : p)); }

// ---------- 解く（ジェネレータで少しずつ）----------
function* subsetSearch(test, wantMin) { // 部分集合を小さい順（または大きい順）に
  let n = nodes.length;
  let order = [];
  for (let m = 0; m < 1 << n; m++) order.push(m);
  let pc = (m) => { let c = 0; while (m) { c += m & 1; m >>= 1; } return c; };
  order.sort((a, b) => (wantMin ? pc(a) - pc(b) : pc(b) - pc(a)));
  for (let m of order) { steps++; if (steps % 64 === 0) yield; let S = []; for (let i = 0; i < n; i++) if ((m >> i) & 1) S.push(i); if (test(S)) return S; }
  return null;
}
function* coloring() {
  let n = nodes.length, col = new Array(n).fill(-1);
  function* go(v) {
    if (v === n) return true;
    for (let c = 0; c < 3; c++) {
      steps++; if (steps % 32 === 0) yield;
      if (nb(v).every((u) => col[u] !== c)) { col[v] = c; if (yield* go(v + 1)) return true; col[v] = -1; }
    }
    return false;
  }
  return (yield* go(0)) ? col : null;
}
function* hamilton() {
  let n = nodes.length, path = [0], used = new Array(n).fill(false); used[0] = true;
  function* go() {
    steps++; if (steps % 32 === 0) yield;
    if (path.length === n) return adj(path[n - 1], 0);
    for (let u of nb(path[path.length - 1])) if (!used[u]) {
      used[u] = true; path.push(u);
      if (yield* go()) return true;
      used[u] = false; path.pop();
    }
    return false;
  }
  return n >= 3 && (yield* go()) ? path.slice() : null;
}
function startSolve() {
  clearAnswer();
  if (nodes.length === 0) return;
  if (problem === 1) solver = subsetSearch((S) => edges.every(([a, b]) => S.includes(a) || S.includes(b)), true);
  if (problem === 2) solver = subsetSearch((S) => S.every((a, i) => S.every((b, j) => j <= i || adj(a, b))), false);
  if (problem === 3) solver = coloring();
  if (problem === 4) solver = hamilton();
  status = '探索中…';
}

function draw() {
  background(240, 30, 8);
  if (solver) {
    let t0 = steps;
    while (steps - t0 < STEPS_PER_FRAME) {
      let r = solver.next();
      if (r.done) { answer = r.value; solver = null; status = answer ? '見つかった！' : '答えなし'; playAnswer(); break; }
    }
  }
  // 線
  for (let [a, b] of edges) {
    let hot = false;
    if (answer && problem === 2) hot = answer.includes(a) && answer.includes(b);
    if (answer && problem === 4) { let i = answer.indexOf(a), j = answer.indexOf(b); hot = abs(i - j) === 1 || abs(i - j) === answer.length - 1; }
    stroke(hot ? color(palette[1], 80, 100) : color(0, 0, 100, 30)); strokeWeight(hot ? 5 : 2);
    line(nodes[a].x, nodes[a].y, nodes[b].x, nodes[b].y);
  }
  if (dragFrom >= 0) { stroke(0, 0, 100); strokeWeight(2); line(nodes[dragFrom].x, nodes[dragFrom].y, mouseX, mouseY); }
  // 点
  nodes.forEach((p, i) => {
    let hue = 220, s = 20, on = false;
    if (answer && problem === 3) { hue = palette[answer[i]]; s = 75; on = true; }
    else if (answer && (problem === 1 || problem === 2) && answer.includes(i)) { hue = palette[problem === 1 ? 0 : 1]; s = 80; on = true; }
    else if (answer && problem === 4) { hue = palette[2]; s = 70; on = true; }
    let pulse = p.flash ? p.flash : 0;
    noStroke(); fill(hue, s, on ? 100 : 60);
    circle(p.x, p.y, 32 + pulse * 30);
    p.flash = max(0, pulse - 0.05);
    fill(0, 0, 10); textAlign(CENTER, CENTER); textSize(13);
    text(problem === 4 && answer ? answer.indexOf(i) + 1 : i, p.x, p.y);
  });

  noStroke(); textAlign(LEFT, BASELINE); fill(0, 0, 100); textSize(18);
  text('1：最小頂点被覆　2：最大クリーク　3：3 色塗り　4：ハミルトン閉路　スペース：解く　S：もう一度鳴らす　R：ランダム　C：消す', 20, 34);
  let names = ['', '最小頂点被覆', '最大クリーク', '3 色で塗り分け', 'ハミルトン閉路'];
  fill(palette[problem - 1], 70, 100); textSize(26);
  text(names[problem] + (status ? '　' + status : ''), 20, 74);
  fill(0, 0, 80); textSize(17);
  let extra = answer ? (problem <= 2 ? '　' + answer.length + ' 点' : '') : '';
  text('点 ' + nodes.length + '（上限 ' + MAX_N + '）　線 ' + edges.length + '　探索の手数 ' + steps.toLocaleString() + extra, 20, 104);
  fill(0, 0, 55); textSize(15);
  text('どれも NP 完全（最適化版は NP 困難）。点を増やすと手数がどう増えるか見てみよう', 20, height - 22);
}

function playAnswer() {
  startAudio();
  if (!audioCtx || !answer) { if (audioCtx && !answer) playNote(noteToFreq(40), 0.25, 0.6, 'sawtooth'); return; }
  let seq = problem === 3 ? answer.map((c, i) => i) : answer;
  seq.forEach((v, k) => {
    let p = nodes[v];
    let deg = floor(map(p.y, height, 0, 0, tones.length - 0.01, true));
    let midi = 57 + tones[deg] + (problem === 3 ? answer[v] * 4 : 0);
    let t = audioCtx.currentTime + k * 0.16;
    playNote(noteToFreq(midi), 0.25, 0.4, ['triangle', 'sine', 'triangle', 'sine'][problem - 1], t);
    setTimeout(() => (p.flash = 1), k * 160);
  });
}

function hit(x, y) { for (let i = 0; i < nodes.length; i++) if (dist(x, y, nodes[i].x, nodes[i].y) < 20) return i; return -1; }
function mousePressed() {
  startAudio();
  if (mouseY < 120) return;
  dragFrom = hit(mouseX, mouseY);
  if (dragFrom >= 0) { nodes[dragFrom].flash = 1; playNote(noteToFreq(57 + tones[floor(map(mouseY, height, 0, 0, tones.length - 0.01, true))]), 0.2, 0.3); }
  else if (nodes.length < MAX_N) { nodes.push({ x: mouseX, y: mouseY }); clearAnswer(); }
}
function mouseReleased() {
  if (dragFrom >= 0) {
    let to = hit(mouseX, mouseY);
    if (to >= 0 && to !== dragFrom && !adj(dragFrom, to)) { edges.push([dragFrom, to]); clearAnswer(); }
  }
  dragFrom = -1;
}
function keyPressed() {
  startAudio();
  if (key >= '1' && key <= '4') { problem = int(key); clearAnswer(); }
  if (key === ' ') startSolve();
  if (key === 's' || key === 'S') playAnswer();
  if (key === 'r' || key === 'R') randomGraph();
  if (key === 'c' || key === 'C') { nodes = []; edges = []; clearAnswer(); }
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- 自由制作のヒント ----------
// 1. 星座や顔を描いて、ハミルトン閉路で「一筆書きの曲」をつくる
// 2. 3 色塗りの色ごとに楽器（type）を変えて、3 パートの曲に
// 3. 問題を 1 つ足してみよう（例：最大独立集合 = 補グラフのクリーク、彩色を 4 色に）


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
function noteToFreq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }
