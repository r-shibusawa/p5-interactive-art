// ============================================
// 13 結び目の音
// トーラス結び目 (p, q) は「まわりを p 回」と「穴を q 回」の 2 つの回転の組み合わせ。2 つの回転を 2 つの音にする
//   音の高さの比 p : q（2:3 = 完全 5 度、3:4 = 4 度、4:5 = 長 3 度）。結び目を横から見た影は、2 つの音のリサジュー図形とそっくり
// クリックで音をスタート / ←→ = p / ↑↓ = q / M = 和音 ↔ メロディ / 1〜3 = 音色 / スペース = 止める / B = 基本の高さ
// ============================================

let p = 2, q = 3;             // ★ 結び目の (p, q)
let t = 0, speed = 0.01;      // ★ なぞる速さ
let paused = false;
let melody = false;
let baseF = 110;              // ★ 基本の高さ（Hz）
let waveType = 'triangle';
let rot = 0;
let voices = [];
let scaleSteps = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];   // ★ メロディの音階（ペンタトニック、半音の数）

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}
function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }

// トーラス結び目の点
function knotPt(s) {
  let r = 2 + Math.cos(q * s);
  return [r * Math.cos(p * s), r * Math.sin(p * s), Math.sin(q * s)];
}

function draw() {
  background(320, 25, 10);
  if (!paused) { t += speed; rot += 0.004; }
  let cur = knotPt(t);
  // ★ 音：和音モードは p : q の 2 音、なぞる点の高さ z で 2 音目の大きさ、横の位置で左右
  let on = paused ? 0 : 1;
  if (!melody) {
    setVoice(0, baseF * p, 0.16 * on, cur[0] / 3);
    setVoice(1, baseF * q, (0.08 + (0.08 * (cur[2] + 1)) / 2) * on, -cur[0] / 3);
  } else {
    let k = constrain(floor(((cur[2] + 1) / 2) * scaleSteps.length), 0, scaleSteps.length - 1);
    setVoice(0, baseF * 2 * Math.pow(2, scaleSteps[k] / 12), 0.18 * on, cur[0] / 3);
    setVoice(1, baseF, 0.06 * on, 0);
  }

  // 左：回る結び目
  let cx = width * 0.3, cy = height * 0.55, S = min(width * 0.09, height * 0.13);
  let proj = (v) => {
    let x = v[0] * Math.cos(rot) - v[1] * Math.sin(rot), y = v[0] * Math.sin(rot) + v[1] * Math.cos(rot), z = v[2];
    let yy = y * Math.cos(1.0) - z * Math.sin(1.0), zz = y * Math.sin(1.0) + z * Math.cos(1.0);
    return { x: cx + x * S, y: cy + zz * S * -1 + yy * 0, d: yy };
  };
  let segs = [];
  let n = 600;
  for (let i = 0; i < n; i++) { let a = proj(knotPt((i / n) * TWO_PI)), b = proj(knotPt(((i + 1) / n) * TWO_PI)); segs.push({ a, b, d: (a.d + b.d) / 2, i }); }
  segs.sort((u, v) => v.d - u.d);
  for (let s of segs) { let br = map(s.d, -3, 3, 100, 35); stroke((s.i / n) * 360, 60, br); strokeWeight(map(s.d, -3, 3, 9, 4)); line(s.a.x, s.a.y, s.b.x, s.b.y); }
  let c = proj(cur);
  noStroke(); fill(0, 0, 100); circle(c.x, c.y, 22);

  // 右上：横から見た影（x と z）、右下：2 つの音のリサジュー図形
  let px = width * 0.68, W = min(width * 0.13, height * 0.17);
  panel(px, height * 0.32, W, '結び目を横から見た影（x, z）', (s) => { let v = knotPt(s); return [v[0] / 3, v[2]]; }, [cur[0] / 3, cur[2]]);
  panel(px, height * 0.74, W, '2 つの音のリサジュー（cos pθ, sin qθ）', (s) => [Math.cos(p * s), Math.sin(q * s)], [Math.cos(p * t), Math.sin(q * t)]);
  let d = gcd(p, q);
  noStroke(); fill(0, 0, 100); textSize(24);
  text('(p, q) = (' + p + ', ' + q + ')　音の比 ' + p / d + ' : ' + q / d + '　' + (d > 1 ? '（' + d + ' 本の絡み目）' : p === 1 || q === 1 ? '（ほどける輪）' : ''), 20, height - 60);
  fill(0, 0, 70); textSize(16);
  text(melody ? 'メロディ：なぞる点の高さ → 音階の高さ。1 周で同じフレーズに戻る' : '和音：' + nf(baseF * p, 1, 0) + ' Hz と ' + nf(baseF * q, 1, 0) + ' Hz。比が簡単な整数ほどきれいに溶け合う', 20, height - 30);
  fill(0, 0, 100); textSize(18);
  text((audioCtx ? '♪ 鳴っています' : 'クリックで音をスタート') + '　←→：p　↑↓：q　M：' + (melody ? 'メロディ' : '和音') + '　1〜3：音色（' + waveType + '）　B：基本の高さ ' + baseF + ' Hz　スペース：止める', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('白い点が結び目をなぞる。結び目の 2 つの回転（p 回と q 回）が、そのまま 2 つの音の振動数の比になる', 20, 68);
}

function panel(x, y, W, title, fn, now) {
  noFill(); stroke(0, 0, 30); strokeWeight(1); rect(x - W * 1.1, y - W * 1.1, W * 2.2, W * 2.2);
  stroke(180, 60, 100); strokeWeight(2);
  beginShape();
  for (let i = 0; i <= 400; i++) { let v = fn((i / 400) * TWO_PI); vertex(x + v[0] * W, y - v[1] * W); }
  endShape();
  noStroke(); fill(0, 0, 100); circle(x + now[0] * W, y - now[1] * W, 12);
  fill(0, 0, 70); textSize(15); text(title, x - W * 1.1, y - W * 1.1 - 10);
}

function mousePressed() { startAudio(); }
function keyPressed() {
  startAudio();
  if (key === RIGHT_ARROW) p = min(9, p + 1);
  if (key === LEFT_ARROW) p = max(1, p - 1);
  if (key === UP_ARROW) q = min(9, q + 1);
  if (key === DOWN_ARROW) q = max(1, q - 1);
  if (key === 'm' || key === 'M') melody = !melody;
  if (key === ' ') paused = !paused;
  if (key === 'b' || key === 'B') baseF = baseF === 110 ? 165 : baseF === 165 ? 82.5 : 110;
  if (key === '1') waveType = 'sine';
  if (key === '2') waveType = 'triangle';
  if (key === '3') waveType = 'sawtooth';
  for (let v of voices) v.o.type = waveType;
}

// ---------- やってみよう ----------
// 1. (2, 3) (3, 4) (4, 5) (5, 6) を順に鳴らそう。きれいに聞こえるのはどれ？ 交点の数との関係は？
// 2. (2, 4) のように最大公約数が 2 以上だと絡み目になる。音の比は約分されて (1, 2) ＝ オクターブ
// 3. メロディモードの音階（scaleSteps）を変えて、結び目ごとの「曲」をつくろう
// 4. 3 つ目の音を足して、結び目の r（中心からの距離）を音の高さにしてみよう


// ==================================================
// ここから下は「音を鳴らすための道具」（2 つの声：発振器 → フィルター → 音量 → 左右）
// ==================================================
let audioCtx, masterOut;
function startAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterOut = audioCtx.createDynamicsCompressor();
    masterOut.connect(audioCtx.destination);
    for (let i = 0; i < 2; i++) {
      let o = audioCtx.createOscillator(), f = audioCtx.createBiquadFilter(), g = audioCtx.createGain(), pan = audioCtx.createStereoPanner();
      o.type = waveType; o.frequency.value = 220;
      f.type = 'lowpass'; f.frequency.value = 2500;
      g.gain.value = 0;
      o.connect(f); f.connect(g); g.connect(pan); pan.connect(masterOut); o.start();
      voices.push({ o, f, g, pan });
    }
  }
  audioCtx.resume();
}
// 声 i の高さ（Hz）・大きさ（0〜1）・左右（−1〜1）をなめらかに変える
function setVoice(i, freq, vol, panV) {
  if (!audioCtx || !voices[i]) return;
  let now = audioCtx.currentTime;
  voices[i].o.frequency.setTargetAtTime(constrain(freq, 20, 4000), now, 0.03);
  voices[i].g.gain.setTargetAtTime(constrain(vol, 0, 0.3), now, 0.05);
  voices[i].pan.pan.setTargetAtTime(constrain(panV, -1, 1), now, 0.05);
}
