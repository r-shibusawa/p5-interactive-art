// ============================================
// 10 グラフの上を歩く音楽
// 点 = 音、線 = 「次に行ける音」。サーファーが線をたどって歩くと、グラフの形が曲になる
// 線をつなぎかえるとメロディのルールが変わる。08 のマルコフ連鎖（シリーズ7）をグラフで描いたもの
// ドラッグで線を追加 / 点をクリックで線を消す / スペースで再生・停止 / 1〜3 でお手本のグラフ
// ============================================

let notes = ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5'];
let freqs = [261.6, 293.7, 329.6, 392.0, 440.0, 523.3, 587.3, 659.3];
let nodes = [], links = [];
let walker = { at: 0, to: 0, t: 1 };
let playing = false;
let dragFrom = -1;
let nextTime = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  for (let i = 0; i < 8; i++) nodes.push({ x: width / 2 + cos((TWO_PI * i) / 8 - HALF_PI) * 240, y: height * 0.55 + sin((TWO_PI * i) / 8 - HALF_PI) * 240 });
  preset(1);
  setInterval(scheduler, 25);
}

function preset(k) {
  links = [];
  if (k === 1) for (let i = 0; i < 8; i++) links.push([i, (i + 1) % 8]); // 輪：音階を上がり続ける
  if (k === 2) { links = [[0, 2], [2, 4], [4, 5], [5, 3], [3, 1], [1, 0], [0, 4], [4, 0]]; } // 跳躍
  if (k === 3) for (let i = 0; i < 8; i++) { links.push([i, (i + 1) % 8]); links.push([i, (i + 7) % 8]); links.push([i, i]); } // 上下・同じ音
}

function scheduler() {
  if (!playing || !audioCtx) return;
  while (nextTime < audioCtx.currentTime + 0.1) {
    let out = links.filter(([a]) => a === walker.at);
    let next = out.length ? random(out)[1] : floor(random(8)); // ★ 線がなければランダムに飛ぶ
    playNote(freqs[next], 0.3, 0.35, 'triangle', nextTime);
    let when = nextTime, from = walker.at;
    setTimeout(() => { walker = { at: next, to: next, t: 0, from }; }, max(0, (when - audioCtx.currentTime) * 1000));
    walker.at = next;
    nextTime += 0.3;
  }
}

function draw() {
  background(260, 40, 10);
  for (let [a, b] of links) {
    if (a === b) { noFill(); stroke(0, 0, 50); strokeWeight(2); circle(nodes[a].x, nodes[a].y - 30, 36); continue; }
    let ang = atan2(nodes[b].y - nodes[a].y, nodes[b].x - nodes[a].x);
    let ex = nodes[b].x - cos(ang) * 30, ey = nodes[b].y - sin(ang) * 30;
    stroke(0, 0, 50); strokeWeight(2);
    line(nodes[a].x, nodes[a].y, ex, ey);
    noStroke(); fill(0, 0, 50);
    triangle(ex, ey, ex - cos(ang - 0.4) * 12, ey - sin(ang - 0.4) * 12, ex - cos(ang + 0.4) * 12, ey - sin(ang + 0.4) * 12);
  }
  if (dragFrom >= 0) { stroke(45, 90, 100); line(nodes[dragFrom].x, nodes[dragFrom].y, mouseX, mouseY); }
  for (let i = 0; i < 8; i++) {
    let on = walker.to === i && walker.t < 1;
    noStroke();
    fill((i * 40) % 360, 70, on ? 100 : 55);
    circle(nodes[i].x, nodes[i].y, on ? 64 : 50);
    fill(0, 0, 10);
    textAlign(CENTER, CENTER);
    textSize(16);
    text(notes[i], nodes[i].x, nodes[i].y);
  }
  textAlign(LEFT, BASELINE);
  walker.t = min(1, walker.t + 0.05);

  fill(0, 0, 100);
  textSize(18);
  text('ドラッグで線（矢印）　点をクリックでその点の線を消す　スペースで' + (playing ? '停止' : '再生') + '　1：輪　2：跳躍　3：上下＋同じ音', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('矢印が 1 本なら必ずそこへ、何本もあればランダムに選ぶ。グラフの形 = 作曲のルール', 20, 68);
}

function nearest(x, y) { for (let i = 0; i < 8; i++) if (dist(x, y, nodes[i].x, nodes[i].y) < 30) return i; return -1; }
function mousePressed() { startAudio(); if (mouseY > 80) dragFrom = nearest(mouseX, mouseY); }
function mouseReleased() {
  if (dragFrom >= 0) {
    let to = nearest(mouseX, mouseY);
    if (to === dragFrom) links = links.filter(([a]) => a !== to); // 同じ点でクリック → その点からの線を消す
    else if (to >= 0 && !links.some(([a, b]) => a === dragFrom && b === to)) links.push([dragFrom, to]);
  }
  dragFrom = -1;
}
function keyPressed() {
  startAudio();
  if (key === ' ') { playing = !playing; if (playing) nextTime = audioCtx.currentTime + 0.05; }
  if (key >= '1' && key <= '3') preset(int(key));
}

// ---------- やってみよう ----------
// 1. 自分へ戻る矢印（同じ点にドラッグ）を増やすと、同じ音が続きやすくなる
// 2. 行き止まりの点を作ると、そこからランダムに飛ぶ。どんな曲になる？
// 3. 線に「太さ（選ばれやすさ）」をつけると、マルコフ連鎖そのもの


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
