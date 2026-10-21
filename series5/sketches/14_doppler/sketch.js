// ============================================
// 14 ドップラー効果（おまけ）
// 救急車が通りすぎると音が「ピーポー」→ 低くなる。近づくと波が縮み、遠ざかると伸びる
// 音源が動き、波紋が広がり、観測者（マウス）が聞く周波数が変わる
// マウス = 観測者の位置 / クリックで音 ON/OFF / 上下キー = 音源の速さ
// ============================================

let sx = 0, sy = 0; // 音源の位置
let speed = 3;
let ripples = [];
let baseFreq = 440;
let playing = false;
let heard = 440;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  sy = height * 0.55;
}

function draw() {
  background(220, 40, 10);
  // 音源が左から右へ
  sx += speed;
  if (sx > width + 100) sx = -100;

  // 一定間隔で波紋を出す（波の山）
  if (frameCount % 6 === 0) ripples.push({ x: sx, y: sy, r: 0 });
  noFill();
  for (let i = ripples.length - 1; i >= 0; i--) {
    let rp = ripples[i];
    rp.r += 8; // 波の速さ（音速）
    stroke(170, 60, 100, map(rp.r, 0, width, 70, 0));
    strokeWeight(2);
    circle(rp.x, rp.y, rp.r * 2);
    if (rp.r > width) ripples.splice(i, 1);
  }

  // 音源
  noStroke();
  fill(0, 90, 100);
  circle(sx, sy, 30);
  // 観測者
  fill(40, 90, 100);
  circle(mouseX, mouseY, 24);

  // ★ ドップラーの式：聞こえる周波数 = f × 音速 / (音速 − 近づく速さ)
  let soundSpeed = 8;
  let dx = mouseX - sx, dy = mouseY - sy;
  let d = max(sqrt(dx * dx + dy * dy), 1);
  let approach = (speed * dx) / d; // 音源が観測者に近づく速さ（遠ざかると負）
  heard = (baseFreq * soundSpeed) / (soundSpeed - approach);
  heard = constrain(heard, 100, 2000);
  if (playing) setTone(heard, map(d, 0, width, 0.3, 0.02, true));

  fill(0, 0, 100);
  textSize(18);
  text('音源 ' + nf(speed, 1, 1) + '（↑↓で速さ）　観測者 = マウス　聞こえる周波数 ' + round(heard) + ' Hz（元 ' + baseFreq + ' Hz）　クリックで音 ' + (playing ? 'ON' : 'OFF'), 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('近づく側は波紋が詰まって高く、遠ざかる側は伸びて低く聞こえる', 20, 68);
}

function mousePressed() {
  startAudio();
  playing = !playing;
  if (!playing) setTone(heard, 0);
}
function keyPressed() {
  if (key === UP_ARROW) speed = min(7, speed + 0.5);
  if (key === DOWN_ARROW) speed = max(0, speed - 0.5);
}

// ---------- やってみよう ----------
// 1. 観測者を音源の通り道の真上に置くと、通過の瞬間に音が急に下がる
// 2. 速さを音速（8）に近づけると？（衝撃波・ソニックブーム）
// 3. 宇宙の星の光も同じ（赤方偏移）。遠ざかる銀河の光は赤く見える


// ==================================================
// ここから下は「音を鳴らすための道具」です
// ==================================================
let audioCtx, osc, gainNode;

function startAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    osc = audioCtx.createOscillator();
    osc.type = 'triangle';
    gainNode = audioCtx.createGain();
    gainNode.gain.value = 0;
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.start();
  }
  audioCtx.resume();
}

function setTone(f, volume) {
  if (!audioCtx) return;
  let t = audioCtx.currentTime;
  osc.frequency.setTargetAtTime(f, t, 0.03);
  gainNode.gain.setTargetAtTime(volume, t, 0.03);
}
