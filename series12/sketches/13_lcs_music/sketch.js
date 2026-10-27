// ============================================
// 13 2 つのメロディの共通部分を聞く（LCS × 音）
// 同じ元のメロディから、音を足したり消したり変えたりした 2 つの「変奏」をつくる
// LCS（03）で共通の骨格を取り出すと、元のメロディが聞こえてくる。曲の類似度・盗作検出・楽譜の比較にも使われる
// 1 = メロディ A / 2 = メロディ B / 3 = 共通の骨格 / スペース = 3 つ続けて / 音符をクリック = 半音上げる（Shift で下げる）/ R = 新しい変奏
// ============================================

let scale = [0, 2, 4, 7, 9];      // ★ 使う音階（ペンタトニック）。[0, 2, 4, 5, 7, 9, 11] で長音階
let baseLen = 10;                 // ★ 元のメロディの長さ
let tempo = 0.22;                 // ★ 1 音の長さ（秒）

let A = [], B = [], lcsA = [], lcsB = [], cTab = [], playing = null;
const BG = '#16111c', PANEL = '#231a2b', FG = '#f3eaf0', MUTED = '#9a8aa3';
const RASP = '#ff6b8b', CYAN = '#5ee6e0', AMBER = '#ffc857', LIME = '#a3e635';

function setup() {
  createCanvas(windowWidth, windowHeight);
  makeMelodies();
}

function pitchOf(idx) { return 60 + 12 * floor(idx / scale.length) + scale[((idx % scale.length) + scale.length) % scale.length]; }
function freqOf(idx) { return 440 * pow(2, (pitchOf(idx) - 69) / 12); }

function makeMelodies() {
  let base = [], cur = 4;
  for (let k = 0; k < baseLen; k++) { cur = constrain(cur + floor(random(-2, 3)), 0, 9); base.push(cur); }
  A = vary(base); B = vary(base);
  computeLCS();
}

// 変奏：ところどころ消す・足す・変える
function vary(base) {
  let out = [];
  for (let v of base) {
    let r = random();
    if (r < 0.15) continue;                                  // 消す
    if (r < 0.3) { out.push(constrain(v + floor(random(-2, 3)), 0, 9)); continue; } // 変える
    out.push(v);
    if (random() < 0.2) out.push(constrain(v + floor(random(-3, 4)), 0, 9));       // 足す
  }
  return out.length ? out : [4];
}

function computeLCS() {
  let m = A.length, n = B.length;
  cTab = [];
  for (let i = 0; i <= m; i++) cTab.push(new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
    cTab[i][j] = A[i - 1] === B[j - 1] ? cTab[i - 1][j - 1] + 1 : max(cTab[i - 1][j], cTab[i][j - 1]);
  lcsA = []; lcsB = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (A[i - 1] === B[j - 1]) { lcsA.unshift(i - 1); lcsB.unshift(j - 1); i--; j--; }
    else if (cTab[i - 1][j] >= cTab[i][j - 1]) i--; else j--;
  }
}

function playSeq(which) {
  startAudio();
  let seqs = { A: A.map((v, k) => [v, k]), B: B.map((v, k) => [v, k]), L: lcsA.map(k => [A[k], k]) };
  let order = which === 'ALL' ? ['A', 'B', 'L'] : [which];
  let t = audioCtx.currentTime + 0.05;
  let plan = [];
  for (let w of order) {
    for (let [v, k] of seqs[w]) { playNote(freqOf(v), w === 'L' ? 0.16 : 0.3, tempo * 0.95, w === 'L' ? 'square' : 'triangle', t); plan.push({ w, k, t }); t += tempo; }
    t += tempo * 2;
  }
  playing = plan;
}

function draw() {
  background(BG);
  noStroke(); fill(FG); textAlign(LEFT, TOP); textSize(26);
  text('2 つのメロディの共通部分（LCS）を聞く', 32, 24);
  fill(MUTED); textSize(15);
  text('1 A を聞く　2 B を聞く　3 共通の骨格　スペース 続けて　音符をクリックで半音上げ（Shift で下げ）　R 新しい変奏', 32, 60);

  let now = audioCtx ? audioCtx.currentTime : 0;
  let cur = null;
  if (playing) for (let p of playing) if (now >= p.t && now < p.t + tempo) cur = p;

  let rollW = width - 120, x0 = 80;
  drawRoll(A, x0, 110, rollW, 150, 'A', CYAN, lcsA, cur);
  drawRoll(B, x0, 330, rollW, 150, 'B', RASP, lcsB, cur);
  // 共通の音を線でつなぐ
  let wA = rollW / max(A.length, B.length), wB = wA;
  for (let k = 0; k < lcsA.length; k++) {
    let xa = x0 + lcsA[k] * wA + wA / 2, xb = x0 + lcsB[k] * wB + wB / 2;
    stroke(LIME); strokeWeight(cur && cur.w === 'L' && cur.k === lcsA[k] ? 4 : 1.5);
    line(xa, 262, xb, 328);
  }
  noStroke();
  fill(FG); textSize(17); textAlign(LEFT, TOP);
  let sim = (2 * lcsA.length / (A.length + B.length) * 100).toFixed(0);
  text(`A ${A.length} 音　B ${B.length} 音　共通の骨格 ${lcsA.length} 音　→ 似ている度 ${sim}%（2·LCS ÷ 長さの和）`, 80, 500);

  // 小さな LCS 表
  let m = A.length, n = B.length;
  let cell = min(26, (height - 560) / (m + 1), (width - 160) / (n + 1));
  if (cell > 8) {
    let tx = 80, ty = 540;
    let onPath = {};
    for (let k = 0; k < lcsA.length; k++) onPath[(lcsA[k] + 1) + ',' + (lcsB[k] + 1)] = true;
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
      fill(onPath[i + ',' + j] ? LIME : lerpColor(color(PANEL), color('#6b3a55'), cTab[i][j] / max(1, cTab[m][n])));
      rect(tx + (j - 1) * cell, ty + (i - 1) * cell, cell - 2, cell - 2, 3);
      if (cell > 16) { fill(onPath[i + ',' + j] ? BG : MUTED); textSize(cell * 0.45); textAlign(CENTER, CENTER); text(cTab[i][j], tx + (j - 1) * cell + cell / 2 - 1, ty + (i - 1) * cell + cell / 2 - 1); }
    }
  }
}

function drawRoll(mel, x0, y0, w, h, label, col, used, cur) {
  fill(PANEL); rect(x0 - 10, y0 - 10, w + 20, h + 20, 10);
  fill(col); textSize(22); textAlign(RIGHT, CENTER); text(label, x0 - 22, y0 + h / 2);
  let nw = w / max(A.length, B.length);
  for (let k = 0; k < mel.length; k++) {
    let y = y0 + h - (mel[k] + 1) * (h / 11);
    let isUsed = used.includes(k);
    let lit = cur && ((cur.w === label && cur.k === k) || (cur.w === 'L' && label === 'A' && cur.k === k));
    fill(lit ? FG : isUsed ? LIME : col);
    rect(x0 + k * nw + 3, y, nw - 6, h / 11 - 2, 4);
  }
}

function keyPressed() {
  if (key === '1') playSeq('A');
  if (key === '2') playSeq('B');
  if (key === '3') playSeq('L');
  if (key === ' ') playSeq('ALL');
  if (key === 'r' || key === 'R') { makeMelodies(); playing = null; }
}

function mousePressed() {
  startAudio();
  let x0 = 80, w = width - 120, nw = w / max(A.length, B.length);
  for (let [mel, y0] of [[A, 110], [B, 330]]) {
    if (mouseY < y0 - 10 || mouseY > y0 + 160) continue;
    let k = floor((mouseX - x0) / nw);
    if (k >= 0 && k < mel.length) {
      mel[k] = constrain(mel[k] + (keyIsDown(SHIFT) ? -1 : 1), 0, 9);
      playNote(freqOf(mel[k]), 0.3, 0.25);
      computeLCS();
    }
  }
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
