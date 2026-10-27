// ============================================
// 12 迷路をつくる ─ 互いに素な集合で「輪のない道」
// マス目どうしの壁をランダムな順に見て、両側がまだ別の集合なら壁をこわして UNION。同じ集合なら残す（ランダム版クラスカル法）
// 輪ができないので、どの 2 マスの間にも道がちょうど 1 本 ─ 完璧な迷路。色 = 集合。合併のたびに音が鳴る 🔊
// クリックで音 ON / スペース = 一時停止 / ↑↓ = 速さ / 1〜3 = 大きさ / S = 解く / M = 消音 / R = 作り直す
// ============================================

let COLS = 24, ROWS = 15;   // ★ 迷路の大きさ
let perFrame = 1;           // ★ 1 フレームに見る壁の数
let SCALE = [0, 2, 4, 7, 9];// ★ 音階（ペンタトニック、半音の数）

let parent = [], rnk = [], sizeOf = [];
let walls = [], wi = 0, openWalls = new Set();
let running = true, muted = false, solved = null, solveT = 0;
let lastNote = 0, unionsDone = 0, rejected = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  reset();
}

function reset() {
  let n = COLS * ROWS;
  parent = [...Array(n).keys()]; rnk = Array(n).fill(0); sizeOf = Array(n).fill(1);
  walls = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    let i = r * COLS + c;
    if (c < COLS - 1) walls.push([i, i + 1]);
    if (r < ROWS - 1) walls.push([i, i + COLS]);
  }
  for (let i = walls.length - 1; i > 0; i--) { let j = floor(random(i + 1)); [walls[i], walls[j]] = [walls[j], walls[i]]; }
  wi = 0; openWalls = new Set(); solved = null; unionsDone = 0; rejected = 0;
}

// ---------- 互いに素な集合の森（ランク + 経路圧縮）----------
function find(x) { if (parent[x] !== x) parent[x] = find(parent[x]); return parent[x]; }
function union(a, b) {
  let x = find(a), y = find(b);
  if (x === y) return false;
  if (rnk[x] > rnk[y]) [x, y] = [y, x];
  parent[x] = y; sizeOf[y] += sizeOf[x];
  if (rnk[x] === rnk[y]) rnk[y]++;
  return true;
}

function solve() {
  let n = COLS * ROWS, prev = Array(n).fill(-1), q = [0], seen = new Set([0]);
  let adj = Array.from({ length: n }, () => []);
  for (let w of openWalls) { let [a, b] = w.split(',').map(Number); adj[a].push(b); adj[b].push(a); }
  while (q.length) { let v = q.shift(); for (let u of adj[v]) if (!seen.has(u)) { seen.add(u); prev[u] = v; q.push(u); } }
  let path = [], v = n - 1;
  while (v !== -1) { path.unshift(v); v = prev[v]; }
  solved = path[0] === 0 ? path : null; solveT = 0;
}

function draw() {
  background(260, 30, 8);
  if (running) for (let k = 0; k < perFrame && wi < walls.length; k++) {
    let [a, b] = walls[wi++];
    if (union(a, b)) {
      openWalls.add(a + ',' + b); unionsDone++;
      let s = sizeOf[find(a)];
      if (millis() - lastNote > 55) {
        let deg = floor(log(s) / log(2) * 1.2), oct = floor(deg / SCALE.length);
        let midi = 52 + oct * 12 + SCALE[deg % SCALE.length];
        playNote(440 * pow(2, (midi - 69) / 12), 0.12, 0.25, 'triangle');
        lastNote = millis();
      }
    } else rejected++;
  }
  let cs = min((width - 80) / COLS, (height - 200) / ROWS);
  let x0 = width / 2 - (COLS * cs) / 2, y0 = 120;
  noStroke();
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    let i = r * COLS + c, root = find(i);
    fill((root * 61) % 360, 55, 25 + min(60, sizeOf[root] * 2));
    rect(x0 + c * cs, y0 + r * cs, cs + 0.5, cs + 0.5);
  }
  // 壁
  stroke(0, 0, 95); strokeWeight(max(1.5, cs * 0.08)); strokeCap(SQUARE);
  noFill(); rect(x0, y0, COLS * cs, ROWS * cs);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    let i = r * COLS + c;
    if (c < COLS - 1 && !openWalls.has(i + ',' + (i + 1))) line(x0 + (c + 1) * cs, y0 + r * cs, x0 + (c + 1) * cs, y0 + (r + 1) * cs);
    if (r < ROWS - 1 && !openWalls.has(i + ',' + (i + COLS))) line(x0 + c * cs, y0 + (r + 1) * cs, x0 + (c + 1) * cs, y0 + (r + 1) * cs);
  }
  // 今見ている壁
  if (wi < walls.length && running) {
    let [a, b] = walls[wi];
    stroke(50, 90, 100); strokeWeight(4);
    let ax = x0 + (a % COLS + 0.5) * cs, ay = y0 + (floor(a / COLS) + 0.5) * cs, bx = x0 + (b % COLS + 0.5) * cs, by = y0 + (floor(b / COLS) + 0.5) * cs;
    line(ax, ay, bx, by);
  }
  // 解
  if (solved) {
    solveT = min(solved.length, solveT + 1.5);
    stroke(50, 100, 100); strokeWeight(cs * 0.3); noFill(); beginShape();
    for (let j = 0; j < solveT; j++) vertex(x0 + (solved[j] % COLS + 0.5) * cs, y0 + (floor(solved[j] / COLS) + 0.5) * cs);
    endShape();
  }
  noStroke(); fill(140, 70, 90); circle(x0 + cs / 2, y0 + cs / 2, cs * 0.5);
  fill(0, 80, 95); circle(x0 + (COLS - 0.5) * cs, y0 + (ROWS - 0.5) * cs, cs * 0.5);

  let sets = COLS * ROWS - unionsDone;
  textAlign(LEFT, TOP); noStroke(); fill(0, 0, 100); textSize(26);
  text('迷路をつくる（互いに素な集合）', 24, 18);
  textSize(15); fill(0, 0, 80);
  text(`集合の数 ${sets}   こわした壁 ${unionsDone}（= マス目 − 1 になったら完成）   残した壁 ${rejected}（こわすと輪ができる）   ${wi >= walls.length ? '完成！ S で解く' : ''}`, 24, 56);
  text(`FIND-SET と UNION を ${wi} 回ずつ。ランク + 経路圧縮なのでほぼ O(1) ずつ ${audioCtx ? '' : '｜クリックで音 ON'}`, 24, 80);
  fill(0, 0, 60); textSize(14);
  text('スペース = 一時停止 / ↑↓ = 速さ / 1〜3 = 大きさ / S = 解く / M = 消音 / R = 作り直す', 24, height - 30);
}

function mousePressed() { startAudio(); }

function keyPressed() {
  if (key === ' ') { running = !running; return false; }
  if (key === 'ArrowUp') perFrame = min(60, perFrame * 2);
  if (key === 'ArrowDown') perFrame = max(1, floor(perFrame / 2));
  if (key === '1') { COLS = 12; ROWS = 8; reset(); }
  if (key === '2') { COLS = 24; ROWS = 15; reset(); }
  if (key === '3') { COLS = 48; ROWS = 30; reset(); }
  if (key === 's' || key === 'S') solve();
  if (key === 'm' || key === 'M') muted = !muted;
  if (key === 'r' || key === 'R') reset();
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ==================================================
// ここから下は「音を鳴らすための道具」です
// ==================================================
let audioCtx, masterOut;
function startAudio() {
  if (!audioCtx) { audioCtx = new AudioContext(); masterOut = audioCtx.createDynamicsCompressor(); masterOut.connect(audioCtx.destination); }
  audioCtx.resume();
}
function playNote(freqHz, volume = 0.3, duration = 0.3, type = 'triangle', when) {
  if (!audioCtx || muted) return;
  let t = when === undefined ? audioCtx.currentTime : when;
  let osc = audioCtx.createOscillator(), amp = audioCtx.createGain();
  osc.type = type; osc.frequency.value = freqHz;
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(volume, t + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(amp); amp.connect(masterOut); osc.start(t); osc.stop(t + duration + 0.05);
}
