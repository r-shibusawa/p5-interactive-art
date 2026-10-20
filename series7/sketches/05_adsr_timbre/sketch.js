// ============================================
// 05 音色をつくる（倍音とエンベロープ）
// 同じ「ド」でもピアノとフルートが違って聞こえるのは、倍音の混ざり方（スペクトル）と
// 音の立ち上がり・消え方（エンベロープ ADSR）が違うから
// 上の棒をドラッグ = 倍音の大きさ / 下の 4 つの棒 = A D S R / スペースで鳴らす / 1〜3 でお手本
// ============================================

let harmonics = [1, 0.5, 0.33, 0.25, 0.2, 0.17, 0.14, 0.12]; // 8 個の倍音の大きさ
let adsr = { a: 0.02, d: 0.2, s: 0.6, r: 0.4 }; // 秒・秒・割合・秒
let lastPlay = -10;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(260, 40, 10);
  // ---- 倍音の棒 ----
  let hx = 80, hy = height * 0.42, barW = 50, gap = 20, maxH = height * 0.25;
  noStroke();
  fill(0, 0, 100);
  textSize(16);
  text('倍音の大きさ（ドラッグで変える）　1 倍 = 基音、2 倍 = 1 オクターブ上、3 倍 = その上の 5 度…', hx, hy - maxH - 20);
  for (let i = 0; i < 8; i++) {
    let x = hx + i * (barW + gap);
    fill(260, 30, 20);
    rect(x, hy - maxH, barW, maxH, 6);
    fill(map(i, 0, 8, 170, 330), 70, 100);
    rect(x, hy - harmonics[i] * maxH, barW, harmonics[i] * maxH, 6);
    fill(0, 0, 70);
    textAlign(CENTER);
    textSize(14);
    text((i + 1) + '倍', x + barW / 2, hy + 20);
    textAlign(LEFT);
  }

  // ---- 波形（1 周期）----
  let wx = hx + 8 * (barW + gap) + 60, ww = width - wx - 60, wmid = hy - maxH / 2;
  stroke(0, 0, 30);
  line(wx, wmid, wx + ww, wmid);
  noFill();
  stroke(45, 90, 100);
  strokeWeight(2.5);
  beginShape();
  for (let x = 0; x <= ww; x += 2) {
    let t = (x / ww) * TWO_PI;
    let v = 0;
    for (let i = 0; i < 8; i++) v += harmonics[i] * sin((i + 1) * t); // ★ 倍音の足し算
    vertex(wx + x, wmid - v * maxH * 0.2);
  }
  endShape();
  noStroke();
  fill(0, 0, 60);
  textSize(14);
  text('波形（1 周期）', wx, hy - maxH - 20);

  // ---- ADSR ----
  let ex = 80, ey = height * 0.88, ew = width - 160, eh = height * 0.25;
  let total = adsr.a + adsr.d + 1.0 + adsr.r; // サスティンを 1 秒と仮定して描く
  let X = (sec) => ex + (sec / total) * ew;
  stroke(0, 0, 30);
  line(ex, ey, ex + ew, ey);
  stroke(170, 80, 100);
  strokeWeight(3);
  noFill();
  beginShape();
  vertex(X(0), ey);
  vertex(X(adsr.a), ey - eh); // Attack：0 → 最大
  vertex(X(adsr.a + adsr.d), ey - adsr.s * eh); // Decay：最大 → サスティンの高さ
  vertex(X(adsr.a + adsr.d + 1.0), ey - adsr.s * eh); // Sustain：押している間
  vertex(X(total), ey); // Release：離してから 0 へ
  endShape();
  // 再生中の位置
  let since = millis() / 1000 - lastPlay;
  if (since < total) {
    noStroke();
    fill(45, 90, 100);
    circle(X(since), ey - envAt(since) * eh, 16);
  }
  noStroke();
  fill(0, 0, 60);
  textSize(14);
  let labels = [['A 立ち上がり ' + nf(adsr.a, 1, 2) + 's', X(adsr.a / 2)], ['D 減衰 ' + nf(adsr.d, 1, 2) + 's', X(adsr.a + adsr.d / 2)], ['S 持続 ' + nf(adsr.s, 1, 2), X(adsr.a + adsr.d + 0.5)], ['R 余韻 ' + nf(adsr.r, 1, 2) + 's', X(total - adsr.r / 2)]];
  for (let [l, x] of labels) {
    textAlign(CENTER);
    text(l, x, ey + 22);
  }
  textAlign(LEFT);
  text('エンベロープ（音の大きさの時間変化）　← ここをドラッグで A / D / S / R を変える', ex, ey - eh - 16);

  fill(0, 0, 100);
  textSize(18);
  text('スペースで鳴らす　1：ピアノ風　2：フルート風　3：オルガン風', 20, 40);
}

function envAt(t) {
  if (t < adsr.a) return t / adsr.a;
  if (t < adsr.a + adsr.d) return 1 - (1 - adsr.s) * ((t - adsr.a) / adsr.d);
  if (t < adsr.a + adsr.d + 1.0) return adsr.s;
  return max(0, adsr.s * (1 - (t - adsr.a - adsr.d - 1.0) / adsr.r));
}

function mouseDragged() {
  let hx = 80, hy = height * 0.42, barW = 50, gap = 20, maxH = height * 0.25;
  let i = floor((mouseX - hx) / (barW + gap));
  if (i >= 0 && i < 8 && mouseY > hy - maxH - 10 && mouseY < hy + 10) harmonics[i] = constrain(map(mouseY, hy, hy - maxH, 0, 1), 0, 1);
  // ADSR：横の位置で 4 つの領域
  let ex = 80, ey = height * 0.88, ew = width - 160, eh = height * 0.25;
  if (mouseY > ey - eh - 20 && mouseY < ey + 10) {
    let q = (mouseX - ex) / ew;
    let v = constrain(map(mouseY, ey, ey - eh, 0, 1), 0, 1);
    if (q < 0.25) adsr.a = 0.005 + v * 1.0;
    else if (q < 0.5) adsr.d = 0.01 + v * 1.0;
    else if (q < 0.75) adsr.s = v;
    else adsr.r = 0.01 + v * 2.0;
  }
}
function keyPressed() {
  startAudio();
  if (key === ' ') playVoice();
  if (key === '1') { harmonics = [1, 0.6, 0.3, 0.2, 0.1, 0.08, 0.05, 0.03]; adsr = { a: 0.005, d: 0.6, s: 0.15, r: 0.5 }; }
  if (key === '2') { harmonics = [1, 0.1, 0.05, 0.02, 0, 0, 0, 0]; adsr = { a: 0.15, d: 0.1, s: 0.8, r: 0.3 }; }
  if (key === '3') { harmonics = [1, 0.8, 0.6, 0.5, 0.4, 0.3, 0.3, 0.2]; adsr = { a: 0.01, d: 0.01, s: 1.0, r: 0.05 }; }
}
function mousePressed() {
  startAudio();
}

// ---------- やってみよう ----------
// 1. ピアノ風（1）とオルガン風（3）：倍音は似ているのに ADSR で全然ちがう楽器に
// 2. 偶数倍音（2, 4, 6, 8）を 0 にするとクラリネットっぽい音（筒が片側だけ閉じているため）
// 3. A を 1 秒にすると「ふわっ」と立ち上がる。R を 2 秒にすると残響のように


// ==================================================
// ここから下は「音を鳴らすための道具」（8 個の倍音を ADSR で鳴らす）
// ==================================================
let audioCtx, master;
function startAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    master = audioCtx.createDynamicsCompressor();
    master.connect(audioCtx.destination);
  }
  audioCtx.resume();
}
function playVoice() {
  let t = audioCtx.currentTime;
  lastPlay = millis() / 1000;
  let env = audioCtx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.linearRampToValueAtTime(0.3, t + adsr.a);
  env.gain.linearRampToValueAtTime(0.3 * max(adsr.s, 0.001), t + adsr.a + adsr.d);
  env.gain.setValueAtTime(0.3 * max(adsr.s, 0.001), t + adsr.a + adsr.d + 1.0);
  env.gain.linearRampToValueAtTime(0.0001, t + adsr.a + adsr.d + 1.0 + adsr.r);
  env.connect(master);
  for (let i = 0; i < 8; i++) {
    if (harmonics[i] < 0.01) continue;
    let o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.frequency.value = 220 * (i + 1);
    g.gain.value = harmonics[i] / 3;
    o.connect(g); g.connect(env);
    o.start(t); o.stop(t + adsr.a + adsr.d + 1.0 + adsr.r + 0.1);
  }
}
