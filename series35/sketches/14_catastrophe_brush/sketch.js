// ============================================
// 14 カタストロフィー・ブラシ
// 画面全体がコントロール平面 (a, b)：横 = b、縦 = a。マウスで描くと、カスプの系 V = x⁴ + a·x² + b·x の状態 x が線の色になる
//   上の谷（x > 0）= 暖色、下の谷（x < 0）= 寒色。折り目をこえて谷がとぶと、火花が散って「カン」と鳴る
//   同じ場所でも、どちらから来たかで色が違う（記憶をもつ絵筆）。自由制作のベース：色・太さ・音を変えよう
// クリックで音をスタート / マウス = 描く / スペース = ペンの上げ下げ / H = カスプの線 / S = 保存 / C = 消す / 1〜3 = 色の組
// ============================================

let a = 0, b = 0, x = 1;
let art;                    // 描いた絵
let penDown = true, showCusp = true;
let palette = 1;
let sparks = [];
let px_ = null, py_ = null;
let jumpCount = 0;
let aMin = -3, aMax = 1.5, bRange = 3;   // ★ 画面に写すコントロールの範囲

function dV(xx) { return 4 * xx * xx * xx + 2 * a * xx + b; }

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  art = createGraphics(width, height);
  art.colorMode(HSB, 360, 100, 100, 100);
  art.background(240, 30, 8);
}

// ★ 状態 x → 色（palette ごとに変える）
function inkColor(xx, alpha) {
  let s = constrain(xx / 1.6, -1, 1);
  if (palette === 1) return s > 0 ? color(20 + 30 * s, 85, 100, alpha) : color(190 - 30 * s, 75, 100, alpha);
  if (palette === 2) return s > 0 ? color(320, 60, 100, alpha) : color(150, 70, 90, alpha);
  return color(0, 0, 50 + 50 * s, alpha);
}

function draw() {
  // マウス → コントロール
  b = map(mouseX, 0, width, -bRange, bRange, true);
  a = map(mouseY, 0, height, aMax, aMin, true);
  let before = x;
  for (let k = 0; k < 20; k++) x -= 0.004 * dV(x);
  x = constrain(x, -1.8, 1.8);
  let jumped = abs(x - before) > 0.06;
  if (jumped) {
    jumpCount++;
    for (let i = 0; i < 24; i++) { let th = random(TWO_PI), sp = random(1, 6); sparks.push({ x: mouseX, y: mouseY, vx: sp * cos(th), vy: sp * sin(th), life: 40, c: inkColor(x, 100) }); }
    ping(x > 0 ? 660 : 330, 0.3);
  }
  // 線を描く（太さ = 谷の深さ）
  if (penDown && px_ !== null && (mouseX !== px_ || mouseY !== py_) && dist(px_, py_, mouseX, mouseY) < 150) {
    let depth = constrain(12 * x * x + 2 * a, 0, 30);
    art.stroke(inkColor(x, 70)); art.strokeWeight(2 + depth * 0.5);
    art.line(px_, py_, mouseX, mouseY);
    if (jumped) { art.noStroke(); art.fill(inkColor(x, 40)); art.circle(mouseX, mouseY, 40); }
  }
  px_ = mouseX; py_ = mouseY;
  setTone(220 * Math.pow(2, x), penDown ? 0.08 : 0);

  image(art, 0, 0);
  // カスプの線（谷が 2 つの領域の境目）
  if (showCusp) {
    noFill(); stroke(0, 0, 100, 25); strokeWeight(2);
    beginShape();
    for (let s = -0.9; s <= 0.9; s += 0.01) vertex(map(8 * s ** 3, -bRange, bRange, 0, width), map(-6 * s * s, aMax, aMin, 0, height));
    endShape();
  }
  noStroke();
  for (let s of sparks) { s.x += s.vx; s.y += s.vy; s.vy += 0.1; s.life--; fill(hue(s.c), saturation(s.c), brightness(s.c), s.life * 2.5); circle(s.x, s.y, 4); }
  sparks = sparks.filter((s) => s.life > 0);
  // カーソル
  noFill(); stroke(inkColor(x, 100)); strokeWeight(2); circle(mouseX, mouseY, 18);

  noStroke(); fill(0, 0, 100); textSize(18);
  text((audioCtx ? '♪' : 'クリックで音') + '　スペース：ペン ' + (penDown ? '下げ' : '上げ') + '　H：カスプの線　1〜3：色　S：保存　C：消す　とんだ回数 ' + jumpCount + '　(a, b) = (' + nf(a, 1, 2) + ', ' + nf(b, 1, 2) + ')', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('白い線の内側では谷が 2 つ。左右に横切ると、行きと帰りで色が変わる場所がずれる。下（a < 0）ほど深い谷 = 太い線', 20, 68);
}

function mousePressed() { startAudio(); }
function keyPressed() {
  startAudio();
  if (key === ' ') penDown = !penDown;
  if (key === 'h' || key === 'H') showCusp = !showCusp;
  if (key === '1' || key === '2' || key === '3') palette = Number(key);
  if (key === 's' || key === 'S') saveCanvas('catastrophe_brush', 'png');
  if (key === 'c' || key === 'C') { art.background(240, 30, 8); jumpCount = 0; }
}

// ---------- やってみよう ----------
// 1. カスプの内側で左右にジグザグに描こう。色の境目が「行き」と「帰り」でずれるのが見える？
// 2. inkColor を変えて、自分の色の組（palette 4）をつくろう
// 3. 線の太さを「谷の深さ」でなく「x の速さ」にすると、とんだ所だけ太くなる
// 4. マウスの代わりに円や 8 の字を自動で描かせて、模様をつくろう（a, b を sin・cos で）


// ==================================================
// ここから下は「音を鳴らすための道具」（鳴りっぱなしの音・カン）
// ==================================================
let audioCtx, masterOut, toneOsc, toneGain;
function startAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterOut = audioCtx.createDynamicsCompressor();
    masterOut.connect(audioCtx.destination);
    toneOsc = audioCtx.createOscillator(); toneGain = audioCtx.createGain();
    toneOsc.type = 'sine'; toneOsc.frequency.value = 220; toneGain.gain.value = 0;
    toneOsc.connect(toneGain); toneGain.connect(masterOut); toneOsc.start();
  }
  audioCtx.resume();
}
function setTone(freq, vol) {
  if (!audioCtx) return;
  let t0 = audioCtx.currentTime;
  toneOsc.frequency.setTargetAtTime(constrain(freq, 40, 3000), t0, 0.03);
  toneGain.gain.setTargetAtTime(constrain(vol, 0, 0.4), t0, 0.05);
}
function ping(freq, vol) {
  if (!audioCtx) return;
  let o = audioCtx.createOscillator(), g = audioCtx.createGain(), t0 = audioCtx.currentTime;
  o.type = 'triangle'; o.frequency.value = constrain(freq, 60, 4000);
  g.gain.setValueAtTime(constrain(vol, 0, 1), t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
  o.connect(g); g.connect(masterOut); o.start(t0); o.stop(t0 + 0.55);
}
