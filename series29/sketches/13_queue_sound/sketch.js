// ============================================
// 13 待ち行列を聞く
// M/M/1 待ち行列を音にする：客の到着 = 「カチッ」、サービス終了 = 「ポーン」（行列が長いほど高い音）
//   後ろでずっと鳴る低い音（ドローン）の高さ = いまの系内人数。ρ → 1 にすると、空いた静けさと渋滞のうなりが交互に来る
// クリックで音をスタート / ←→ = ρ / ↑↓ = テンポ（μ）/ M = ドローンの ON/OFF / スペース = 一時停止
// ============================================

let rho = 0.7;             // ★ 利用率
let mu = 2;                // ★ 1 秒あたりのサービス数（テンポ）
let scale5 = [0, 2, 4, 7, 9];   // ★ ペンタトニック（ド レ ミ ソ ラ）
let baseNote = 60;         // ★ いちばん低い音（MIDI ノート番号 60 = ド）
let droneOn = true;
let paused = false;
let t = 0, nextArr, nextDep = Infinity, n = 0, rec = [], rings = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  nextArr = expRand(rho * mu);
}

function advance(tEnd) {
  while (min(nextArr, nextDep) <= tEnd) {
    if (nextArr <= nextDep) {
      t = nextArr; n++;
      if (n === 1) nextDep = t + expRand(mu);
      nextArr = t + expRand(rho * mu);
      clickSound(0.25);                                         // ★ 到着の音
      rings.push({ x: width * 0.3 - min(n, 60) * 14, y: height * 0.35, r: 6, hue: 30 });
    } else {
      t = nextDep; n--;
      nextDep = n > 0 ? t + expRand(mu) : Infinity;
      let k = min(n, 14);
      let note = baseNote + 12 * floor(k / 5) + scale5[k % 5];  // ★ 行列の長さ → 音の高さ
      blip(midiHz(note), 0.18, 'triangle');
      rings.push({ x: width * 0.3 + 40, y: height * 0.35, r: 10, hue: 140 + k * 10 });
    }
    if (n > 200) { n = 200; }
  }
  t = tEnd;
}

function draw() {
  background(240, 30, 10);
  if (!paused) advance(t + 1 / 60);
  rec.push(n); if (rec.length > width - 80) rec.shift();
  setDrone(droneOn ? 55 * Math.pow(2, min(n, 30) / 12) : 55, droneOn ? min(0.12, 0.02 + n * 0.006) : 0);

  // 窓口と行列
  let qx = width * 0.3, qy = height * 0.35;
  noStroke(); fill(200, 50, n > 0 ? 80 : 30); rect(qx + 20, qy - 30, 50, 60, 8);
  if (n > 0) { fill(140, 70, 95); circle(qx + 40, qy, 22); }
  for (let i = 1; i < min(n, 60); i++) { fill(30, 70, 100); circle(qx - i * 14, qy, 11); }
  // 音の波紋
  noFill();
  for (let r of rings) { stroke(r.hue, 70, 100, 100 - r.r); strokeWeight(2); circle(r.x, r.y, r.r); r.r += 3; }
  rings = rings.filter((r) => r.r < 100);
  if (rings.length > 120) rings.splice(0, rings.length - 120);

  // 系内人数の記録（色 = 音の高さ）
  let gy = height - 60, gh = height * 0.35, top = max(10, ...rec);
  stroke(0, 0, 100, 25); strokeWeight(1); line(40, gy, width - 40, gy);
  for (let i = 0; i < rec.length; i++) { stroke(140 + min(rec[i], 14) * 10, 70, 100); line(40 + i, gy, 40 + i, gy - rec[i] / top * gh); }
  noStroke(); fill(0, 0, 60); textSize(13);
  text('系内人数（最大 ' + top + '）。平均は ρ/(1−ρ) = ' + nf(rho / (1 - rho), 1, 1) + ' 人', 44, gy - gh - 8);

  // 説明
  fill(0, 0, 100); textSize(16);
  let tx = width * 0.55, ty = 140;
  text('いまの人数  ' + n, tx, ty);
  text('到着率 λ = ρμ = ' + nf(rho * mu, 1, 2) + ' 人/秒', tx, ty + 26);
  text('サービス率 μ = ' + nf(mu, 1, 1) + ' 人/秒', tx, ty + 52);
  fill(0, 0, 60); textSize(14);
  text('カチッ = 到着（ランダムなリズム = ポアソン過程）', tx, ty + 86);
  text('ポーン = サービス終了。行列が長いほど高い音階', tx, ty + 108);
  text('ブーン = ドローン。人数が 12 人増えると 1 オクターブ上がる', tx, ty + 130);

  fill(0, 0, 100); textSize(18);
  text((audioCtx ? '♪ 鳴っています' : 'クリックで音をスタート') + '　ρ = ' + nf(rho, 1, 2) + '（←→）　テンポ μ = ' + nf(mu, 1, 1) + '（↑↓）　M：ドローン ' + (droneOn ? 'ON' : 'off') + '　スペース：' + (paused ? '再開' : '一時停止'), 20, 40);
  fill(0, 0, 60); textSize(15);
  text('ρ = 0.5 では「ポーン」は低い音ばかり。0.9 を超えると高い音が続き、ドローンがうなり上がる。目を閉じて混み具合を当ててみよう', 20, 68);
}

function mousePressed() { startAudio(); }
function keyPressed() {
  startAudio();
  if (key === RIGHT_ARROW) rho = min(0.98, rho + 0.05);
  if (key === LEFT_ARROW) rho = max(0.1, rho - 0.05);
  if (key === UP_ARROW) mu = min(8, mu + 0.5);
  if (key === DOWN_ARROW) mu = max(0.5, mu - 0.5);
  rho = round(rho * 100) / 100;
  if (key === RIGHT_ARROW || key === LEFT_ARROW || key === UP_ARROW || key === DOWN_ARROW) nextArr = t + expRand(rho * mu);
  if (key === 'm' || key === 'M') droneOn = !droneOn;
  if (key === ' ') paused = !paused;
}

// ---------- やってみよう ----------
// 1. ρ = 0.5 と 0.95 を交互に聞く。音だけで区別できる？ 友達に当ててもらう
// 2. サービス時間を一定（1 / mu）に変えると「ポーン」のリズムが規則的になる。行列の音はどう変わる？（08）
// 3. 到着の音を、到着した客の待ち時間で変える（長く待ちそうなら低い音）
// 4. 窓口を 2 つにして左右のスピーカーに分ける（StereoPanner を使う）

// ==================================================
// ここから下は「音を鳴らすための道具」
// ==================================================
let audioCtx, masterOut, drone;
function startAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterOut = audioCtx.createDynamicsCompressor();
    masterOut.connect(audioCtx.destination);
    let o = audioCtx.createOscillator(), f = audioCtx.createBiquadFilter(), g = audioCtx.createGain();
    o.type = 'sawtooth'; o.frequency.value = 55;
    f.type = 'lowpass'; f.frequency.value = 500;
    g.gain.value = 0;
    o.connect(f); f.connect(g); g.connect(masterOut); o.start();
    drone = { o, g };
  }
  audioCtx.resume();
}
// 平均 1/rate の指数分布の乱数（次の到着・サービス終了までの時間）
function expRand(rate) { return -Math.log(1 - Math.random()) / rate; }
function midiHz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
// 短い音（ポーン）
function blip(freq, vol, type) {
  if (!audioCtx) return;
  let now = audioCtx.currentTime, o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = type || 'sine'; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(vol, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
  o.connect(g); g.connect(masterOut); o.start(now); o.stop(now + 0.4);
}
// カチッという短いノイズ
function clickSound(vol) {
  if (!audioCtx) return;
  let len = Math.floor(audioCtx.sampleRate * 0.02);
  let buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  let src = audioCtx.createBufferSource(), hp = audioCtx.createBiquadFilter(), g = audioCtx.createGain();
  hp.type = 'highpass'; hp.frequency.value = 2000; g.gain.value = vol;
  src.buffer = buf; src.connect(hp); hp.connect(g); g.connect(masterOut); src.start();
}
// ドローンの高さと大きさ
function setDrone(freq, vol) {
  if (!drone) return;
  let now = audioCtx.currentTime;
  drone.o.frequency.setTargetAtTime(freq, now, 0.1);
  drone.g.gain.setTargetAtTime(vol, now, 0.1);
}
