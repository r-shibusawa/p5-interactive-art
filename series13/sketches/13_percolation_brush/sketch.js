// ============================================
// 13 しみこみブラシ（自由制作のベース）─ 互いに素な集合で「つながり」をその場で数える
// マスを開けるたびに、となりの開いたマスと UNION。上の端・下の端は見えない 2 つの要素にまとめておく
// FIND(上) = FIND(下) になった瞬間、水が上から下まで「しみとおる」（パーコレーション）。開いた割合 p ≈ 0.593 が境目
// ドラッグで塗る / A = ランダムに自動で開ける / ←→ = ブラシの大きさ / S = 音 ON/OFF / C = 消す / R = 色を変える
// ============================================
// ★ のついた数字を変えて、自分の作品に！

let COLS = 64, ROWS = 40;    // ★ マスの数
let BRUSH = 1;               // ★ ブラシの半径（マス）
let HUE0 = 200;              // ★ 色の基準
let SCALE = [0, 3, 5, 7, 10];// ★ 音階（マイナーペンタトニック）

let opened = [], parent = [], rnk = [], sz = [];
let P2 = [], R2 = [];          // 上下の端も入れたもう 1 つの森（しみとおり判定用）
let TOPN, BOTN;
let comps = 0, nOpen = 0, auto = false, sound = true;
let percolated = false, flashT = 0, pAt = null, lastNote = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  reset();
}

function reset() {
  let n = COLS * ROWS;
  TOPN = n; BOTN = n + 1;
  opened = Array(n).fill(false);
  parent = [...Array(n).keys()]; rnk = Array(n).fill(0); sz = Array(n).fill(1);
  P2 = [...Array(n + 2).keys()]; R2 = Array(n + 2).fill(0);
  comps = 0; nOpen = 0; percolated = false; pAt = null;
}

// 塊を数える森（マスどうしだけ）
function find(x) { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }   // 経路半分化
function union(a, b) {
  union2(a, b);
  let x = find(a), y = find(b);
  if (x === y) return false;
  if (rnk[x] > rnk[y]) [x, y] = [y, x];
  parent[x] = y; sz[y] += sz[x];
  if (rnk[x] === rnk[y]) rnk[y]++;
  return true;
}
// 上の端 TOPN・下の端 BOTN も含めた森
function find2(x) { while (P2[x] !== x) { P2[x] = P2[P2[x]]; x = P2[x]; } return x; }
function union2(a, b) {
  let x = find2(a), y = find2(b);
  if (x === y) return;
  if (R2[x] > R2[y]) [x, y] = [y, x];
  P2[x] = y;
  if (R2[x] === R2[y]) R2[y]++;
}

function openCell(c, r) {
  if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return;
  let i = r * COLS + c;
  if (opened[i]) return;
  opened[i] = true; nOpen++; comps++;
  for (let [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    let cc = c + dc, rr = r + dr;
    if (cc >= 0 && rr >= 0 && cc < COLS && rr < ROWS && opened[rr * COLS + cc]) if (union(i, rr * COLS + cc)) comps--;
  }
  if (r === 0) union2(i, TOPN);
  if (r === ROWS - 1) union2(i, BOTN);
  if (sound && millis() - lastNote > 40) {
    let s = sz[find(i)], deg = min(14, floor(log(s + 1) / log(2) * 1.3));
    let midi = 57 + floor(deg / SCALE.length) * 12 + SCALE[deg % SCALE.length];
    playNote(440 * pow(2, (midi - 69) / 12), 0.1, 0.2, 'sine');
    lastNote = millis();
  }
  if (!percolated && find2(TOPN) === find2(BOTN)) {
    percolated = true; flashT = 1; pAt = nOpen / (COLS * ROWS);
    if (sound) for (let k of [0, 4, 7, 12]) playNote(440 * pow(2, (57 + k - 69) / 12), 0.2, 1.5, 'triangle');
  }
}

function geom() { let cs = min((width - 60) / COLS, (height - 190) / ROWS); return { cs, x0: width / 2 - (COLS * cs) / 2, y0: 120 }; }

function draw() {
  background(HUE0, 30, 7);
  let g = geom();
  if (auto) for (let k = 0; k < 4; k++) openCell(floor(random(COLS)), floor(random(ROWS)));
  if (mouseIsPressed) {
    let c = floor((mouseX - g.x0) / g.cs), r = floor((mouseY - g.y0) / g.cs);
    for (let dc = -BRUSH + 1; dc < BRUSH; dc++) for (let dr = -BRUSH + 1; dr < BRUSH; dr++) openCell(c + dc, r + dr);
  }
  let top = find2(TOPN), bot = find2(BOTN);
  noStroke();
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    let i = r * COLS + c;
    if (!opened[i]) { fill(HUE0, 20, 13); rect(g.x0 + c * g.cs, g.y0 + r * g.cs, g.cs - 1, g.cs - 1, 2); continue; }
    let root = find(i), r2 = find2(i);
    if (r2 === top && top === bot) fill(45, 90, 100);                      // しみとおった塊
    else if (r2 === top) fill(HUE0, 70, 90);                               // 上とつながった「水」
    else fill((HUE0 + 120 + (root * 47) % 140) % 360, 45, 40 + min(50, sz[root] * 3));
    rect(g.x0 + c * g.cs, g.y0 + r * g.cs, g.cs - 1, g.cs - 1, 2);
  }
  if (flashT > 0) { fill(45, 90, 100, flashT * 40); rect(0, 0, width, height); flashT *= 0.95; if (flashT < 0.02) flashT = 0; }
  // 上下の端
  fill(HUE0, 70, 90); rect(g.x0, g.y0 - 8, COLS * g.cs, 4);
  fill(45, 80, 90); rect(g.x0, g.y0 + ROWS * g.cs + 4, COLS * g.cs, 4);

  let p = nOpen / (COLS * ROWS);
  textAlign(LEFT, TOP); fill(0, 0, 100); textSize(26);
  text('しみこみブラシ', 24, 18);
  textSize(15); fill(0, 0, 80);
  text(`開いた割合 p = ${p.toFixed(3)}   塊（連結成分）の数 ${comps}   ${percolated ? `しみとおった！（p = ${pAt.toFixed(3)} のとき）` : 'まだ上から下までつながっていない'}`, 24, 56);
  text(`青 = 上の端とつながった水、金 = 上から下までつながった塊。判定は FIND(上) = FIND(下) だけ ─ 何度でもほぼ O(1)`, 24, 80);
  fill(0, 0, 60); textSize(14);
  text(`ドラッグ = 塗る / A = 自動${auto ? '（ON）' : ''} / ←→ = ブラシ ${BRUSH} / S = 音 ${sound ? 'ON' : 'OFF'} / C = 消す / R = 色を変える`, 24, height - 30);
}

function mousePressed() { startAudio(); }

function keyPressed() {
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'ArrowRight') BRUSH = min(6, BRUSH + 1);
  if (key === 'ArrowLeft') BRUSH = max(1, BRUSH - 1);
  if (key === 's' || key === 'S') sound = !sound;
  if (key === 'c' || key === 'C') reset();
  if (key === 'r' || key === 'R') HUE0 = floor(random(360));
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
  if (!audioCtx) return;
  let t = when === undefined ? audioCtx.currentTime : when;
  let osc = audioCtx.createOscillator(), amp = audioCtx.createGain();
  osc.type = type; osc.frequency.value = freqHz;
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(volume, t + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(amp); amp.connect(masterOut); osc.start(t); osc.stop(t + duration + 0.05);
}
