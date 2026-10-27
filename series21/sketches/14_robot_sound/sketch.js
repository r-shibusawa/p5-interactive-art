// ============================================
// 14 ロボットの音
// アームの動きを音にする：関節の速さ → モーターの音の高さと大きさ、手先が壁にぶつかる → ノイズ
//   2 リンクの IK（01）でマウスを追いかける。自由制作のベース：音の決め方・アームの形・障害物を変えよう
// クリックで音をスタート / マウス = 目標 / A = 自動で動く / 1〜3 = モーターの音色 / E = ひじの向き / C = 障害物を消す / クリック（Shift）= 障害物
// ============================================

let L1 = 170, L2 = 130;         // ★ リンクの長さ
let q1 = 0.8, q2 = 0.9, pq1 = 0.8, pq2 = 0.9;
let elbowUp = true;
let smooth = 0.12;              // ★ 動きのなめらかさ（小さいほど重いモーター）
let auto = false;
let waveType = 'sawtooth';      // ★ モーターの波形
let motors = [];                // 2 つのモーターの音
let walls = [];                 // 障害物 {x, y, r}
let hitCooldown = 0;
let sparks = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  walls = [{ x: width * 0.62, y: height * 0.3, r: 40 }, { x: width * 0.25, y: height * 0.25, r: 35 }];
}
function basePos() { return { x: width * 0.42, y: height * 0.65 }; }

function inverse(tx, ty, up) {
  let b = basePos();
  let x = tx - b.x, y = b.y - ty;
  let r = constrain(sqrt(x * x + y * y), abs(L1 - L2) + 0.01, L1 + L2 - 0.01);
  let c2 = constrain((r * r - L1 * L1 - L2 * L2) / (2 * L1 * L2), -1, 1);
  let a2 = acos(c2) * (up ? 1 : -1);
  return { a1: atan2(y, x) - atan2(L2 * sin(a2), L1 + L2 * cos(a2)), a2 };
}
function forward(a1, a2) {
  let b = basePos();
  let e = { x: b.x + L1 * cos(a1), y: b.y - L1 * sin(a1) };
  return { b, e, h: { x: e.x + L2 * cos(a1 + a2), y: e.y - L2 * sin(a1 + a2) } };
}
function approach(cur, goal) { let d = goal - cur; return cur + atan2(sin(d), cos(d)) * smooth; }

function draw() {
  background(215, 35, 12);
  let b = basePos();
  let tx = mouseX, ty = mouseY;
  if (auto) { let t = frameCount * 0.015; tx = b.x + 230 * cos(t) + 50 * cos(4 * t); ty = b.y - 140 - 110 * sin(2 * t); }
  let sol = inverse(tx, ty, elbowUp);
  pq1 = q1; pq2 = q2;
  q1 = approach(q1, sol.a1); q2 = approach(q2, sol.a2);
  let w1 = atan2(sin(q1 - pq1), cos(q1 - pq1)), w2 = atan2(sin(q2 - pq2), cos(q2 - pq2));   // 関節の角速度
  let fk = forward(q1, q2);

  // ★ 関節の速さ → モーター音（速いほど高く・大きく）
  setMotor(0, 60 + abs(w1) * 2500, min(0.25, abs(w1) * 6));
  setMotor(1, 90 + abs(w2) * 2500, min(0.25, abs(w2) * 6));

  // ★ 手先が障害物にぶつかったらノイズ
  if (hitCooldown > 0) hitCooldown--;
  for (let o of walls) {
    let d = sqrt(sq(fk.h.x - o.x) + sq(fk.h.y - o.y));
    if (d < o.r + 8 && hitCooldown === 0) {
      noiseBurst(0.4 + min(0.6, (abs(w1) + abs(w2)) * 10));
      hitCooldown = 12;
      for (let i = 0; i < 12; i++) sparks.push({ x: fk.h.x, y: fk.h.y, vx: random(-4, 4), vy: random(-4, 4), life: 20 });
    }
  }

  // 障害物
  noStroke();
  for (let o of walls) { fill(0, 60, 70); circle(o.x, o.y, o.r * 2); }
  // 腕
  stroke(200, 60, 95); strokeWeight(14); line(fk.b.x, fk.b.y, fk.e.x, fk.e.y);
  stroke(320, 60, 95); line(fk.e.x, fk.e.y, fk.h.x, fk.h.y);
  noStroke();
  fill(0, 0, 100); circle(fk.b.x, fk.b.y, 22); circle(fk.e.x, fk.e.y, 18);
  fill(45, 90, 100); circle(fk.h.x, fk.h.y, 16);
  fill(0, 0, 40); rect(b.x - 30, b.y, 60, 14, 3);
  // 速さの輪（モーターの音を目で見る）
  noFill(); strokeWeight(3);
  stroke(200, 60, 95, 70); circle(fk.b.x, fk.b.y, 30 + abs(w1) * 600);
  stroke(320, 60, 95, 70); circle(fk.e.x, fk.e.y, 26 + abs(w2) * 600);
  // 火花
  noStroke();
  for (let s of sparks) { s.x += s.vx; s.y += s.vy; s.life--; fill(45, 90, 100, s.life * 5); circle(s.x, s.y, 5); }
  sparks = sparks.filter((s) => s.life > 0);
  // 目標
  noFill(); stroke(120, 90, 100); strokeWeight(2); circle(tx, ty, 20);

  noStroke(); fill(0, 0, 100); textSize(18);
  text((audioCtx ? '♪ 鳴っています' : 'クリックで音をスタート') + '　マウス＝目標　A：自動 ' + (auto ? 'ON' : 'off') + '　1〜3：音色（' + waveType + '）　E：ひじ　Shift+クリック：障害物　C：消す　|ω1| = ' + nf(abs(w1) * 60, 1, 2) + '  |ω2| = ' + nf(abs(w2) * 60, 1, 2) + ' rad/s', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('関節ごとにモーター音（速いほど高い）。手先が赤い障害物に当たるとノイズ。smooth を変えると「重いロボット」「軽いロボット」の音になる', 20, 68);
}

function mousePressed() {
  startAudio();
  if (keyIsDown(SHIFT) && mouseY > 90) walls.push({ x: mouseX, y: mouseY, r: 30 });
}
function keyPressed() {
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'e' || key === 'E') elbowUp = !elbowUp;
  if (key === '1') waveType = 'sawtooth';
  if (key === '2') waveType = 'square';
  if (key === '3') waveType = 'triangle';
  if (key === 'c' || key === 'C') walls = [];
  for (let m of motors) m.o.type = waveType;
}

// ---------- やってみよう ----------
// 1. 音の高さを「関節の角度」で決める（速さでなく）と、腕の形がメロディになる。どちらが「ロボットらしい」？
// 2. 障害物に当たったときノイズではなく和音を鳴らす（startTone を使う）
// 3. 腕を 3 リンク（03）にしてモーターを 3 つに。音が増えると何に聞こえる？
// 4. 自動モードの軌道（cos, sin の係数）を変えてリズムをつくる。作品のベースに


// ==================================================
// ここから下は「音を鳴らすための道具」（モーター音・ノイズ）
// ==================================================
let audioCtx, masterOut;
function startAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterOut = audioCtx.createDynamicsCompressor();
    masterOut.connect(audioCtx.destination);
    for (let i = 0; i < 2; i++) {
      let o = audioCtx.createOscillator(), f = audioCtx.createBiquadFilter(), g = audioCtx.createGain();
      o.type = waveType; o.frequency.value = 80;
      f.type = 'lowpass'; f.frequency.value = 900;
      g.gain.value = 0;
      o.connect(f); f.connect(g); g.connect(masterOut); o.start();
      motors.push({ o, f, g });
    }
  }
  audioCtx.resume();
}
// モーター i の音の高さ（Hz）と大きさ（0〜1）をなめらかに変える
function setMotor(i, freq, vol) {
  if (!audioCtx || !motors[i]) return;
  let t = audioCtx.currentTime;
  motors[i].o.frequency.setTargetAtTime(constrain(freq, 30, 2000), t, 0.03);
  motors[i].g.gain.setTargetAtTime(constrain(vol, 0, 0.3), t, 0.05);
}
// 短いノイズ（衝突音）
function noiseBurst(vol) {
  if (!audioCtx) return;
  let n = audioCtx.sampleRate * 0.15;
  let buf = audioCtx.createBuffer(1, n, audioCtx.sampleRate);
  let data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
  let src = audioCtx.createBufferSource(), g = audioCtx.createGain();
  src.buffer = buf; g.gain.value = constrain(vol, 0, 1);
  src.connect(g); g.connect(masterOut); src.start();
}
// 鳴らしっぱなしの音（やってみよう 2 用）
function startTone(f, vol, type) {
  if (!audioCtx) return null;
  let o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = type || 'sine'; o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(vol, audioCtx.currentTime + 0.05);
  o.connect(g); g.connect(masterOut); o.start();
  return { o, g };
}
function stopTone(t) {
  if (!t) return;
  t.g.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.05);
  t.o.stop(audioCtx.currentTime + 0.3);
}
