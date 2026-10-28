// ============================================
// 13 多様体を聞く（トーラスの上の直線）
// 正方形の上下・左右を貼るとトーラス。正方形の上の傾き s の直線は、トーラスに巻きつく「平らなトーラスの測地線」になる
//   s が分数 p/q なら q 周・p 周で閉じる（メロディがくり返す）。s が無理数なら永遠に閉じず、表面を埋めつくす
// クリック = 音をスタート / 1〜4 = 分数の傾き（1, 1/2, 2/3, 3/5）/ 5〜8 = 無理数（√2, 黄金比, π, e）/ ←→ = 傾きを少し変える / Q = 音階にそろえる / ↑↓ = 速さ / M = 消音
// ============================================

let slope = 2 / 3, frac = [2, 3];   // 傾き s と、分数なら [p, q]
let label0 = '2/3';
let x = 0, y = 0, ux = 0;           // 正方形の上の位置と、ほどいた x
let speed = 0.004;                  // ★ 進む速さ
let quantize = true, muted = false;
let baseF = 220;                    // ★ いちばん低い音（Hz）
let trail = [], sqG, visited, yaw = 0.3, tilt = 0.9;
let osc = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  sqG = createGraphics(360, 360);
  resetPath();
}
function setSlope(s, f, nm) { slope = s; frac = f; label0 = nm; resetPath(); }
function resetPath() {
  x = 0.1; y = 0.1; ux = 0; trail = [];
  visited = new Uint8Array(40 * 40);
  sqG.background(20, 24, 40);
  sqG.stroke(255, 60); sqG.noFill(); sqG.rect(0, 0, 359, 359);
}

// トーラスの点（正方形の (x, y) を角度 2πx, 2πy に）
function torusPt(px, py) {
  let u = TWO_PI * px, v = TWO_PI * py, A = 1, B = 0.42;
  return [(A + B * Math.cos(v)) * Math.cos(u), (A + B * Math.cos(v)) * Math.sin(u), B * Math.sin(v)];
}
function proj(p, cx, cy, k) {
  let c = Math.cos(yaw), s = Math.sin(yaw), x1 = c * p[0] + s * p[1], y1 = -s * p[0] + c * p[1];
  let up = y1 * Math.sin(tilt) + p[2] * Math.cos(tilt), depth = -y1 * Math.cos(tilt) + p[2] * Math.sin(tilt);
  return [cx + x1 * k, cy - up * k, depth];
}

function draw() {
  background(14, 16, 26);
  yaw += 0.003;
  // ★ 傾き s の直線に沿って進む（はみ出したら反対側から出てくる = 貼り合わせ）
  for (let k = 0; k < 3; k++) {
    let dx = speed / Math.sqrt(1 + slope * slope) / 3, ox = x, oy = y;
    x += dx; y += dx * slope; ux += dx;
    let wrapped = false;
    if (x >= 1) { x -= 1; wrapped = true; }
    if (y >= 1) { y -= 1; wrapped = true; }
    if (y < 0) { y += 1; wrapped = true; }
    if (!wrapped) { sqG.stroke(255, 210, 90); sqG.strokeWeight(2); sqG.line(ox * 360, 360 - oy * 360, x * 360, 360 - y * 360); }
    visited[floor(y * 40) * 40 + floor(x * 40)] = 1;
    trail.push([x, y]);
  }
  if (trail.length > 3000) trail.splice(0, trail.length - 3000);

  // 左：正方形（貼り合わせの印つき）
  let ox = 60, oy = 140;
  image(sqG, ox, oy);
  strokeWeight(5);
  stroke(255, 110, 110); line(ox, oy, ox, oy + 360); line(ox + 360, oy, ox + 360, oy + 360);
  stroke(110, 180, 255); line(ox, oy, ox + 360, oy); line(ox, oy + 360, ox + 360, oy + 360);
  noStroke(); fill(255); circle(ox + x * 360, oy + 360 - y * 360, 12);
  fill(200); textSize(14);
  text('赤どうし・青どうしを貼る → トーラス', ox, oy + 390);

  // 右：トーラス（線の軌跡）
  let cx = width * 0.68, cy = height * 0.48, k = min(width * 0.2, height * 0.28);
  noFill(); strokeWeight(1);
  for (let i = 0; i < 24; i++) {   // 骨組み
    stroke(150, 170, 230, 40); beginShape();
    for (let j = 0; j <= 40; j++) { let q = proj(torusPt(i / 24, j / 40), cx, cy, k); vertex(q[0], q[1]); }
    endShape();
  }
  strokeWeight(2); noFill();
  for (let c0 = 1; c0 < trail.length; c0 += 100) {   // 100 点ずつまとめて描く（新しいほど明るく）
    stroke(255, 210, 90, 40 + (215 * c0) / trail.length);
    beginShape();
    for (let i = c0 - 1; i < min(trail.length, c0 + 100); i++) {
      if (i > c0 - 1 && (Math.abs(trail[i][0] - trail[i - 1][0]) > 0.5 || Math.abs(trail[i][1] - trail[i - 1][1]) > 0.5)) { endShape(); beginShape(); }
      let q = proj(torusPt(trail[i][0], trail[i][1]), cx, cy, k);
      vertex(q[0], q[1]);
    }
    endShape();
  }
  let p = proj(torusPt(x, y), cx, cy, k);
  noStroke(); fill(255); circle(p[0], p[1], 12);

  // 音：x → 1 つ目の音、y → 2 つ目の音
  let f1 = toFreq(x), f2 = toFreq(y) * 1.5;
  setVoice(0, f1, muted ? 0 : 0.12); setVoice(1, f2, muted ? 0 : 0.1);

  let cover = visited.reduce((a, b) => a + b, 0) / 1600;
  noStroke(); fill(255); textSize(18);
  text((audioCtx ? '♪ 鳴っています' : 'クリックで音をスタート') + '　1〜4：分数　5〜8：無理数　←→：少し変える　Q：音階 ' + (quantize ? 'ON' : 'off') + '　↑↓：速さ　M：消音', 20, 40);
  fill(170); textSize(15);
  text('横の位置 x → 1 つ目の音の高さ、縦の位置 y → 2 つ目の音の高さ。閉じる線はメロディがくり返し、閉じない線は二度と同じにならない', 20, 68);
  fill(255, 210, 90); textSize(20);
  text('傾き s = ' + label0 + ' = ' + nf(slope, 1, 5), ox, height - 80);
  fill(220); textSize(16);
  let msg = frac ? (ux >= frac[1] ? '閉じた！ 横に ' + frac[1] + ' 周、縦に ' + frac[0] + ' 周してもとの点へ（周期的なメロディ）' : '横に ' + frac[1] + ' 周すると閉じるはず… いま ' + nf(ux, 1, 2) + ' 周')
    : '無理数：何周しても閉じない。表面のマスを ' + nf(cover * 100, 1, 1) + '% 通った（いつか 100% に近づく）';
  text(msg, ox, height - 50);
  fill(150); textSize(14);
  text('音：' + nf(f1, 1, 0) + ' Hz ／ ' + nf(f2, 1, 0) + ' Hz', ox, height - 24);
}
// 0〜1 → 音の高さ（★ 2 オクターブ。Q なら五音音階にそろえる）
function toFreq(t) {
  let semis = t * 24;
  if (quantize) { let scale5 = [0, 2, 4, 7, 9], o = floor(semis / 12), r = semis - o * 12, best = 0; for (let s of scale5) if (s <= r) best = s; semis = o * 12 + best; }
  return baseF * Math.pow(2, semis / 12);
}

function mousePressed() { startAudio(); }
function keyPressed() {
  if (key === '1') setSlope(1, [1, 1], '1');
  if (key === '2') setSlope(1 / 2, [1, 2], '1/2');
  if (key === '3') setSlope(2 / 3, [2, 3], '2/3');
  if (key === '4') setSlope(3 / 5, [3, 5], '3/5');
  if (key === '5') setSlope(Math.SQRT2, null, '√2');
  if (key === '6') setSlope((1 + Math.sqrt(5)) / 2, null, '黄金比 (1+√5)/2');
  if (key === '7') setSlope(Math.PI, null, 'π');
  if (key === '8') setSlope(Math.E, null, 'e');
  if (key === LEFT_ARROW) setSlope(max(0.01, slope - 0.01), null, '手で変えた値');
  if (key === RIGHT_ARROW) setSlope(min(5, slope + 0.01), null, '手で変えた値');
  if (key === UP_ARROW) speed = min(0.03, speed * 1.4);
  if (key === DOWN_ARROW) speed = max(0.0005, speed / 1.4);
  if (key === 'q' || key === 'Q') quantize = !quantize;
  if (key === 'm' || key === 'M') muted = !muted;
}

// ---------- やってみよう ----------
// 1. 2/3 と 3/5 でメロディの長さ（周期）を比べよう。q 周で閉じるので、q が大きいほど長いメロディ
// 2. √2 にして 1 分待つ。正方形の上の線はどこまで埋まる？（無理数の直線はトーラスの上で稠密）
// 3. ←→ で 2/3 = 0.66667 から少しだけずらすと、ほとんど閉じそうで閉じない。耳で「ずれ」を聞こう
// 4. 音色（osc の type）を 'triangle' や 'square' に。x と y で音量やパンを変えるのも面白い


// ==================================================
// ここから下は「音を鳴らすための道具」（2 つの声）
// ==================================================
let audioCtx, masterOut;
function startAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterOut = audioCtx.createDynamicsCompressor();
    masterOut.connect(audioCtx.destination);
    for (let i = 0; i < 2; i++) {
      let o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = i === 0 ? 'sine' : 'triangle';
      o.frequency.value = 220; g.gain.value = 0;
      o.connect(g); g.connect(masterOut); o.start();
      osc.push({ o, g });
    }
  }
  audioCtx.resume();
}
// 声 i の高さ（Hz）と大きさ（0〜1）
function setVoice(i, f, vol) {
  if (!audioCtx || !osc[i]) return;
  let t = audioCtx.currentTime;
  osc[i].o.frequency.setTargetAtTime(constrain(f, 40, 4000), t, quantize ? 0.005 : 0.03);
  osc[i].g.gain.setTargetAtTime(constrain(vol, 0, 0.3), t, 0.05);
}
