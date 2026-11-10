// ============================================
// 13 機械の音 🔊
// 機械の音の高さは「1 秒に何回ぶつかるか」で決まる
//   歯車：かみ合い周波数 = 歯数 × 回転数 / 60　　エンジン（4 サイクル）：爆発の周波数 = 気筒数 × 回転数 / 120
// まずクリックで音を出す / 1 = 歯車 / 2 = エンジン / ↑↓（押し続ける）= 回転数 / ←→ = 歯数・気筒数 / E = 偏心（歯車）・失火（エンジン）/ M = 消音
// ※ 一番下の「音を鳴らすための道具」まで全部コピーしてください
// ============================================

let machineId = 1;            // 1 歯車 / 2 エンジン
let rpm = 900;                // ★ 回転数（1 分あたり）
let gearZ = 20;               // ★ 駆動歯車の歯数
let cylList = [1, 2, 3, 4, 6, 8], cylId = 3;   // ★ 気筒数の候補
let fault = false;            // 偏心・失火（異常）
let muted = false;
let volume = 0.12;            // ★ 音の大きさ（0〜0.3）
let slowMo = 1 / 30;          // ★ 絵のスローモーション倍率
let crank = 0;                // 回転角（絵のため）
let outA = [], outB = [];
const PA = (20 * Math.PI) / 180;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  rebuild();
}
function rebuild() { outA = makeGearOutline(gearZ, 9, PA); outB = makeGearOutline(30, 9, PA); }

// ★ 音の高さを決める 2 つの周波数（Hz）
function frequencies() {
  let shaft = rpm / 60;                                   // 軸が 1 秒に回る回数
  if (machineId === 1) return { main: gearZ * shaft, slow: shaft, mainName: 'かみ合い周波数 = 歯数 × 回転数 / 60', slowName: '軸の回転' };
  return { main: (cylList[cylId] * rpm) / 120, slow: rpm / 120, mainName: '爆発の周波数 = 気筒数 × 回転数 / 120', slowName: '1 サイクル（2 回転）' };
}

function draw() {
  background(212, 45, 13);
  if (keyIsDown(UP_ARROW)) rpm *= 1.012;
  if (keyIsDown(DOWN_ARROW)) rpm /= 1.012;
  rpm = constrain(rpm, 200, 7000);
  let fq = frequencies();
  crank += (rpm / 60) * 2 * Math.PI * (1 / 60) * slowMo;
  // ---- 音を更新：主の音（のこぎり波）＋ 2 倍音、異常のときは遅い周期で音量がゆれる（AM 変調 → 側帯波）
  setMachineSound(fq.main, muted ? 0 : volume, machineId === 1 ? 5000 : Math.min(fq.main * 8, 3000), fq.slow, fault ? 0.8 : 0);

  let ccy = height * 0.36;
  if (machineId === 1) {
    // ---- 歯車：歯が 1 枚かみ合うたびに 1 回「カチッ」
    let r1 = (9 * gearZ) / 2, r2 = (9 * 30) / 2, ccx = width * 0.34;
    let fit = Math.min(1, (height * 0.42) / (2 * Math.max(r1, r2) + 30));
    let wob = fault ? 5 : 0;                               // 偏心：軸の中心がずれている
    push();
    translate(ccx, ccy); scale(fit);
    let rotB = Math.PI + Math.PI / 30 - (crank * gearZ) / 30;
    stroke(0, 0, 100, 70); strokeWeight(1 / fit);
    fill(200, 55, 75); drawOutline(outA, -r1 + wob * Math.cos(crank), wob * Math.sin(crank), crank);
    fill(28, 60, 80); drawOutline(outB, r2, 0, rotB);
    noStroke(); fill(0, 0, 100);
    circle(-r1, 0, 12); circle(r2, 0, 12);
    circle(-r1 + (r1 - 22) * Math.cos(crank), (r1 - 22) * Math.sin(crank), 9);
    // かみ合いの瞬間のフラッシュ
    let toothPhase = ((crank * gearZ) / (2 * Math.PI)) % 1;
    fill(50, 90, 100, (1 - toothPhase) * 90); circle(0, 0, 30 * (1 - toothPhase) + 8);
    pop();
    noStroke(); fill(0, 0, 100); textSize(14);
    text('歯数 ' + gearZ + '（←→）', ccx - r1 * fit - 40, ccy + Math.max(r1, r2) * fit + 34);
  } else {
    // ---- エンジン：気筒が順番に爆発する（2 回転 = 720° で全気筒が 1 回ずつ）
    let n = cylList[cylId], cw = Math.min(90, (width * 0.6) / n), x0 = width * 0.34 - (n * cw) / 2;
    for (let i = 0; i < n; i++) {
      let ang = crank + (i * 4 * Math.PI) / n;             // 気筒ごとに 720°/n ずつずらす
      let cyc = ((ang % (4 * Math.PI)) + 4 * Math.PI) % (4 * Math.PI);
      let py = ccy - 30 - 46 * Math.cos(ang), x = x0 + i * cw + cw / 2;
      let firing = cyc < 0.9 && !(fault && i === 0);
      noStroke(); fill(firing ? 20 : 0, firing ? 90 : 0, firing ? 100 : 22);
      rect(x - cw * 0.36, ccy - 110, cw * 0.72, py - (ccy - 110));          // 燃焼室
      fill(0, 0, 35); rect(x - cw * 0.36 - 6, ccy - 116, 6, 190); rect(x + cw * 0.36, ccy - 116, 6, 190); rect(x - cw * 0.36 - 6, ccy - 116, cw * 0.72 + 12, 6);
      fill(40, 15, 85); rect(x - cw * 0.36, py, cw * 0.72, 30, 3);          // ピストン
      stroke(0, 0, 70); strokeWeight(5);
      let kx = x + 22 * Math.sin(ang), ky = ccy + 110 - 22 * Math.cos(ang) - 24;
      line(x, py + 30, kx, ky);
      noStroke(); fill(8, 70, 100); circle(kx, ky, 10);
      fill(0, 0, 100); textSize(13); text(fault && i === 0 ? '失火' : '#' + (i + 1), x - 12, ccy + 132);
    }
    noStroke(); fill(0, 0, 100); textSize(14);
    text('気筒数 ' + n + '（←→）', x0, ccy + 158);
  }

  // ---- スペクトル（どの高さの音が入っているか）
  let gx = 60, gw = width - 120, gh = height * 0.2, gy = height - 60 - gh, fTop = machineId === 1 ? 4000 : 1000;
  stroke(0, 0, 45); strokeWeight(1); line(gx, gy + gh, gx + gw, gy + gh);
  let spec = getSpectrum();
  if (spec) {
    let hzPerBin = audioCtx.sampleRate / 2 / spec.length, nb = Math.min(spec.length, Math.floor(fTop / hzPerBin));
    noStroke(); fill(190, 70, 100);
    for (let i = 1; i < nb; i++) { let v = (spec[i] / 255) * gh; if (v > 2) rect(gx + ((i * hzPerBin) / fTop) * gw, gy + gh - v, Math.max((gw / nb) * 0.8, 1), v); }
  }
  // 理論の周波数に印
  noStroke(); textSize(12);
  for (let k = 1; k <= 6; k++) {
    let f = fq.main * k; if (f > fTop) break;
    fill(50, 90, 100); rect(gx + (f / fTop) * gw - 1, gy, 2, 10);
    if (k === 1 || (fq.main / fTop) * gw > 60) text(k === 1 ? nf(f, 1, 0) + ' Hz' : k + ' 倍', gx + (f / fTop) * gw + 4, gy + 10);
  }
  fill(0, 0, 60);
  for (let f = 0; f <= fTop; f += fTop / 8) text(f, gx + (f / fTop) * gw - 10, gy + gh + 16);
  text('周波数（Hz）', gx + gw - 70, gy + gh + 34);

  // ---- 文字
  noStroke(); fill(0, 0, 100); textSize(18);
  text('1：歯車　2：エンジン　↑↓：回転数 ' + nf(rpm, 1, 0) + ' rpm　←→：' + (machineId === 1 ? '歯数' : '気筒数') + '　E：' + (machineId === 1 ? '偏心' : '失火') + ' ' + (fault ? 'ON' : 'off') + '　M：消音 ' + (muted ? 'ON' : 'off'), 20, 40);
  fill(0, 0, 60); textSize(15);
  text(audioCtx ? '絵は ' + Math.round(1 / slowMo) + ' 分の 1 のスローモーション。音は本当の速さ。スペクトルの山が黄色の印（理論値）に一致する' : '▶ まずキャンバスをクリックして音を出そう', 20, 68);
  let ix = width * 0.62, iy = 130;
  fill(0, 0, 100, 8); rect(ix - 14, iy - 26, width - ix - 20, 190, 10);
  fill(0, 0, 100); textSize(15);
  text(fq.mainName, ix, iy);
  fill(50, 90, 100); textSize(22);
  text(machineId === 1 ? gearZ + ' × ' + nf(rpm, 1, 0) + ' / 60 = ' + nf(fq.main, 1, 0) + ' Hz' : cylList[cylId] + ' × ' + nf(rpm, 1, 0) + ' / 120 = ' + nf(fq.main, 1, 0) + ' Hz', ix, iy + 34);
  fill(0, 0, 70); textSize(14);
  text(fq.slowName + '：' + nf(fq.slow, 1, 1) + ' Hz', ix, iy + 64);
  text('音名でいうと ' + noteName(fq.main), ix, iy + 88);
  fill(fault ? 0 : 0, fault ? 70 : 0, fault ? 100 : 55); textSize(13);
  text(fault ? (machineId === 1 ? '偏心：1 回転ごとに音がうねり、山の両側に ±' + nf(fq.slow, 1, 1) + ' Hz の側帯波が出る' : '失火：1 気筒が爆発せず、2 回転に 1 回のうねり（半次数の振動）が出る') : '異常なし。E で故障を入れると、音とスペクトルで「診断」できる', ix, iy + 116);
  fill(0, 0, 55);
  text('機械の故障診断は、この山の位置と側帯波を見る', ix, iy + 140);
}

// 周波数 → 音名（ラ = 440 Hz）
function noteName(f) {
  let names = ['ド', 'ド#', 'レ', 'レ#', 'ミ', 'ファ', 'ファ#', 'ソ', 'ソ#', 'ラ', 'ラ#', 'シ'];
  let midi = Math.round(69 + 12 * Math.log2(Math.max(f, 1) / 440));
  return names[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
}

function mousePressed() { startAudio(); }

function keyPressed() {
  startAudio();
  if (key === '1' || key === '2') machineId = Number(key);
  if (key === LEFT_ARROW) { if (machineId === 1) gearZ = constrain(gearZ - 1, 8, 48); else cylId = constrain(cylId - 1, 0, cylList.length - 1); }
  if (key === RIGHT_ARROW) { if (machineId === 1) gearZ = constrain(gearZ + 1, 8, 48); else cylId = constrain(cylId + 1, 0, cylList.length - 1); }
  if (key === 'e' || key === 'E') fault = !fault;
  if (key === 'm' || key === 'M') muted = !muted;
  rebuild();
}

// ---------- やってみよう ----------
// 1. 歯数 20、900 rpm のかみ合い周波数は 300 Hz。回転数を 2 倍にすると 1 オクターブ上がる。耳と数字で確かめよう
// 2. 歯数を 1 枚ずつ増やすと音はどう変わる？ 電車のモーター音（ギア音）が加速で高くなる理由
// 3. エンジンを 4 気筒 3000 rpm と 8 気筒 1500 rpm にして聞き比べよう。爆発の周波数は同じ。何がちがう？
// 4. E で偏心・失火を入れ、スペクトルの山の両側（側帯波）を探そう。うねりの周期は何 Hz？
// 5. 道具の osc1.type を 'square' や 'triangle' に変えると音色（倍音の並び）が変わる。スペクトルで見比べよう

// ==================================================
// ここから下は「歯車の道具」です（インボリュート歯形の輪郭を作る）
// ==================================================

// 歯数 z、モジュール m、圧力角 pa（ラジアン）の歯車の輪郭を [x, y] の配列で返す
//   歯 1 枚の中心が角度 0（+x 方向）を向く。ha・hf は歯先・歯元の高さ（モジュールの何倍か）
//   インボリュート：基礎円 rb に巻いた糸をほどくときの糸の先。ほどいた角 t の点は
//   半径 rb√(1 + t²)、角度 inv = t − atan t
function makeGearOutline(z, m, pa, ha, hf) {
  if (ha === undefined) ha = 1;
  if (hf === undefined) hf = 1.25;
  let r = (m * z) / 2, rb = r * Math.cos(pa);
  let ra = r + ha * m, rf = Math.max(r - hf * m, m);
  let half = Math.PI / (2 * z) + Math.tan(pa) - pa;      // 基礎円の上での歯の半角
  let t0 = rf > rb ? Math.sqrt((rf / rb) * (rf / rb) - 1) : 0;
  let t1 = Math.sqrt(Math.max((ra / rb) * (ra / rb) - 1, t0 * t0));
  let flank = [];                                        // [半径, 歯の中心からの角度]
  if (rf < rb) flank.push([rf, half]);                   // 基礎円より内側はまっすぐ
  for (let i = 0; i <= 8; i++) {
    let t = t0 + ((t1 - t0) * i) / 8;
    flank.push([rb * Math.sqrt(1 + t * t), Math.max(half - (t - Math.atan(t)), 0)]);
  }
  let pts = [];
  for (let k = 0; k < z; k++) {
    let c = (k * 2 * Math.PI) / z;
    pts.push([rf * Math.cos(c - Math.PI / z), rf * Math.sin(c - Math.PI / z)]);   // 歯底の真ん中
    for (let i = 0; i < flank.length; i++) pts.push([flank[i][0] * Math.cos(c - flank[i][1]), flank[i][0] * Math.sin(c - flank[i][1])]);
    for (let i = flank.length - 1; i >= 0; i--) pts.push([flank[i][0] * Math.cos(c + flank[i][1]), flank[i][0] * Math.sin(c + flank[i][1])]);
  }
  return pts;
}

// 輪郭を (x, y) に角度 rot で描く
function drawOutline(pts, x, y, rot) {
  push();
  translate(x, y);
  rotate(rot);
  beginShape();
  for (let p of pts) vertex(p[0], p[1]);
  endShape(CLOSE);
  pop();
}

// ==================================================
// ここから下は「音を鳴らすための道具」です（Web Audio）
// （中身は読まなくても OK。消さないでね）
// ==================================================
let audioCtx, masterOut, analyser, specData;
let osc1, osc2, toneFilter, toneGain, lfo, lfoGain, amGain;
function startAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterOut = audioCtx.createDynamicsCompressor();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 8192; analyser.smoothingTimeConstant = 0.6;
    specData = new Uint8Array(analyser.frequencyBinCount);
    masterOut.connect(analyser); analyser.connect(audioCtx.destination);
    // 主の音（のこぎり波）と 2 倍音 → フィルター → 音量 → AM 変調
    osc1 = audioCtx.createOscillator(); osc2 = audioCtx.createOscillator();
    osc1.type = 'sawtooth'; osc2.type = 'square';
    let g2 = audioCtx.createGain(); g2.gain.value = 0.25;
    toneFilter = audioCtx.createBiquadFilter(); toneFilter.type = 'lowpass';
    toneGain = audioCtx.createGain(); toneGain.gain.value = 0;
    amGain = audioCtx.createGain(); amGain.gain.value = 1;
    osc1.connect(toneFilter); osc2.connect(g2); g2.connect(toneFilter);
    toneFilter.connect(toneGain); toneGain.connect(amGain); amGain.connect(masterOut);
    // 遅い波（LFO）で音量をゆらす
    lfo = audioCtx.createOscillator(); lfoGain = audioCtx.createGain(); lfoGain.gain.value = 0;
    lfo.connect(lfoGain); lfoGain.connect(amGain.gain);
    osc1.start(); osc2.start(); lfo.start();
  }
  audioCtx.resume();
}
// 音の高さ freq（Hz）、大きさ vol、フィルター cutoff（Hz）、ゆれの速さ slowHz と深さ depth（0〜1）
function setMachineSound(freq, vol, cutoff, slowHz, depth) {
  if (!audioCtx) return;
  let t = audioCtx.currentTime;
  osc1.frequency.setTargetAtTime(constrain(freq, 5, 8000), t, 0.03);
  osc2.frequency.setTargetAtTime(constrain(freq * 2, 5, 12000), t, 0.03);
  toneFilter.frequency.setTargetAtTime(constrain(cutoff, 100, 12000), t, 0.05);
  toneGain.gain.setTargetAtTime(constrain(vol, 0, 0.3), t, 0.05);
  lfo.frequency.setTargetAtTime(constrain(slowHz, 0.1, 200), t, 0.05);
  lfoGain.gain.setTargetAtTime(constrain(depth, 0, 1), t, 0.05);
}
// いま鳴っている音のスペクトル（0〜255 の配列）。音がまだなら null
function getSpectrum() {
  if (!analyser) return null;
  analyser.getByteFrequencyData(specData);
  return specData;
}
