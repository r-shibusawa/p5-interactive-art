// ============================================
// 13 制御を聞く（PID で音の高さを追いかける）
// 目標の音の高さが 2 秒ごとに飛ぶ。制御器の出力がオシレーターの周波数になる
//   プラントは「遅れのあるモーター」のような 2 段の一次遅れ。追いつくまでの時間・行きすぎ・ゆれが「音」で聞こえる
//   P だけだと目標より低いまま（定常偏差）、I を足すと届く、上げすぎるとビブラートのようにゆれる
// クリックで開始 / 左右キー = Kp / 上下キー = Ki / A・Z = Kd / 1〜3 = プリセット / T = 目標の音も鳴らす
// ============================================

let Kp = 3.0, Ki = 8.0, Kd = 0.05; // ★ PID ゲイン
let tauPlant = 0.12; // ★ プラントの遅れ [秒]（2 段）
let notes = [262, 330, 392, 523, 440, 294, 659, 349]; // ★ 目標の音の高さ [Hz]（ド・ミ・ソ・高いド…）
let interval = 2.0; // ★ 目標を変える間隔 [秒]
let playTarget = false;

let r = 392, f = 392, y1 = 392, u = 392, I = 392 / 8, prevF = 392, t = 0, noteIdx = 0;
let HIST = 600, dt = 1 / 60;
let hF = [], hR = [];
let mainTone = null, targetTone = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(230, 30, 10);
  t += dt;
  if (t >= interval) { t = 0; noteIdx = (noteIdx + 1) % notes.length; r = notes[noteIdx]; }
  // ★ PID（誤差は Hz のまま。ゲインは「Hz あたり」。微分は出力の変化にかける）
  let e = r - f;
  I = constrain(I + e * dt, -5000, 5000);
  let dF = (f - prevF) / dt; prevF = f;
  u = constrain(Kp * e + Ki * I - Kd * dF, 0, 4000); // 指令（Hz）
  // ★ プラント：2 段の一次遅れ（指令 u に遅れて周波数 f が追いつく）
  for (let k = 0; k < 2; k++) {
    y1 += ((u - y1) / tauPlant) * dt / 2; // 1 段目
    f += ((y1 - f) / tauPlant) * dt / 2; // 2 段目 → 実際に鳴る周波数
  }
  f = constrain(f, 0, 4000);
  let fHz = constrain(f, 60, 2000);
  if (mainTone) {
    mainTone.o.frequency.setTargetAtTime(fHz, audioCtx.currentTime, 0.01);
    targetTone.g.gain.setTargetAtTime(playTarget ? 0.04 : 0.0001, audioCtx.currentTime, 0.05);
    targetTone.o.frequency.setTargetAtTime(r, audioCtx.currentTime, 0.01);
  }
  pushHist(hF, f); pushHist(hR, r);

  // ---- 左：音の高さのメーターと回る円盤（モーターのイメージ）
  let mx = width * 0.12, my0 = height * 0.82, my1 = height * 0.2;
  stroke(0, 0, 30); strokeWeight(14); line(mx, my0, mx, my1);
  let Y = (hz) => map(constrain(hz, 200, 800), 200, 800, my0, my1);
  stroke(45, 90, 100); strokeWeight(3); line(mx - 40, Y(r), mx + 40, Y(r));
  noStroke(); fill(45, 90, 100); textSize(14); text('目標 ' + r + ' Hz', mx + 48, Y(r) + 5);
  fill(30, 80, 100); circle(mx, Y(f), 26);
  text('いま ' + nf(fHz, 1, 0) + ' Hz', mx + 48, Y(f) + 24);
  let dx = width * 0.33, dy = height * 0.5, R = min(width, height) * 0.12;
  push(); translate(dx, dy); rotate(frameCount * fHz / 4000);
  stroke(200, 50, 90); strokeWeight(3); noFill(); circle(0, 0, R * 2);
  for (let i = 0; i < 6; i++) { rotate(PI / 3); line(0, 0, R, 0); }
  pop();
  noStroke(); fill(0, 0, 70); textSize(13); textAlign(CENTER);
  text('遅れのあるモーター（回転数 = 音の高さ）', dx, dy + R + 24);
  textAlign(LEFT, BASELINE);

  // ---- グラフ
  let gx = width * 0.5, gw = width * 0.46;
  drawPlot(gx, height * 0.2, gw, height * 0.45, [{ data: hR, hue: 45, sat: 90, name: '目標' }, { data: hF, hue: 30, name: '出力（鳴っている音）' }], 150, 850, '音の高さ [Hz]');

  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text((mainTone ? '' : 'クリックで開始　') + 'Kp = ' + nf(Kp, 1, 2) + '（左右）　Ki = ' + nf(Ki, 1, 2) + '（上下）　Kd = ' + nf(Kd, 1, 3) + '（A/Z）　1〜3 プリセット　T 目標の音 ' + (playTarget ? 'ON' : 'OFF'), 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('誤差 ' + nf(e, 1, 1) + ' Hz。P だけ（Ki = 0）だと f = Kp/(1+Kp) × 目標 で低い音のまま止まる。Ki を上げると届くがビブラートのようにゆれる。Kd はゆれを抑える', 20, 68);
  text('「ゆれ = 音の高さの振動」「行きすぎ = 一瞬高い音」「遅れ = ポルタメント」。耳で制御器の性格を聞き分けよう', 20, height - 30);
}

function mousePressed() {
  startAudio();
  if (!mainTone) { mainTone = startTone(392, 0.08, 'sawtooth'); targetTone = startTone(392, 0.0001, 'sine'); }
}
function keyPressed() {
  if (key === RIGHT_ARROW) Kp = min(Kp + 0.25, 8);
  if (key === LEFT_ARROW) Kp = max(Kp - 0.25, 0);
  if (key === UP_ARROW) Ki = min(Ki + 2, 60);
  if (key === DOWN_ARROW) Ki = max(Ki - 2, 0);
  if (key === 'a' || key === 'A') Kd = min(Kd + 0.02, 0.5);
  if (key === 'z' || key === 'Z') Kd = max(Kd - 0.02, 0);
  if (key === '1') { Kp = 3; Ki = 0; Kd = 0; } // ★ P だけ：低いまま（f = 0.75 r）
  if (key === '2') { Kp = 3; Ki = 8; Kd = 0.05; } // ★ ちょうどいい
  if (key === '3') { Kp = 3; Ki = 50; Kd = 0; } // ★ ゆれる（限界に近い）
  if (key === 't' || key === 'T') playTarget = !playTarget;
  if (key === '1' || key === '2' || key === '3') I = Ki > 0 ? r / Ki : 0;
}

// ---------- やってみよう ----------
// 1. 1（P だけ）で目標の音（T）と比べる。いつも少し低い。Kp を上げると近づくが届かない
// 2. 2 から Ki を上げていく。どこから「ゆれ」が聞こえる？ Kd を足すと消える？
// 3. tauPlant を 0.3（重いモーター）にすると同じゲインでも不安定になる。なぜ？（07・09 の位相の遅れ）
// 4. notes を自分のメロディに。interval を短くすると「追いつけない」音楽になる


// ==================================================
// ここから下は「音を鳴らすための道具」（鳴らしっぱなしの音を作る・止める）
// ==================================================
let audioCtx, masterOut;
function startAudio() {
  if (!audioCtx) { audioCtx = new AudioContext(); masterOut = audioCtx.createDynamicsCompressor(); masterOut.connect(audioCtx.destination); }
  audioCtx.resume();
}
function startTone(f, vol, type) {
  if (!audioCtx) return null;
  let o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(max(vol, 0.0001), audioCtx.currentTime + 0.05);
  o.connect(g); g.connect(masterOut); o.start();
  return { o, g };
}
function stopTone(tn) {
  if (!tn) return;
  tn.g.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.05);
  tn.o.stop(audioCtx.currentTime + 0.3);
}
function pushHist(arr, v) {
  arr.push(isFinite(v) ? v : 0);
  if (arr.length > HIST) arr.shift();
}
// 時間プロット：枠 (x, y, w, h) に series = [{data, hue, name}] を描く（縦の範囲 lo〜hi）
function drawPlot(x, y, w, h, series, lo, hi, title) {
  noStroke(); fill(0, 0, 14); rect(x, y, w, h, 6);
  stroke(0, 0, 30); strokeWeight(1);
  let y0 = map(0, lo, hi, y + h, y);
  if (y0 > y && y0 < y + h) line(x, y0, x + w, y0);
  for (let s of series) {
    stroke(s.hue, s.sat === undefined ? 70 : s.sat, 100); strokeWeight(s.weight || 2); noFill();
    beginShape();
    for (let i = 0; i < s.data.length; i++) vertex(map(i, 0, HIST - 1, x, x + w), map(constrain(s.data[i], lo, hi), lo, hi, y + h, y));
    endShape();
  }
  noStroke(); fill(0, 0, 70); textSize(13); textAlign(LEFT, TOP);
  text(title, x + 8, y + 6);
  let lx = x + w - 8; textAlign(RIGHT, TOP);
  for (let s of series) { fill(s.hue, s.sat === undefined ? 70 : s.sat, 100); text(s.name, lx, y + 6); lx -= textWidth(s.name) + 14; }
  textAlign(LEFT, BASELINE);
}
