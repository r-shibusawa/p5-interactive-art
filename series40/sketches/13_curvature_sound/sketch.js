// ============================================
// 13 曲率を聴く（音：まずキャンバスをクリック）
// マウスで描いた曲線の上を再生ヘッドが走り、その点の曲率 |κ| で音の高さが決まる（急カーブほど高い音）
//   κ の符号（左曲がり・右曲がり）で音色を変え、まっすぐな所は低いドローン。曲線が「メロディ」になる
//   曲率は 00 と同じ差分の式：κ = (x'y'' − y'x'') / (x'² + y'²)^{3/2}
// ドラッグ = 曲線を描く / 1〜3 = プリセット（らせん・ハート・リサージュ）/ ←→ = テンポ / Q = 音階に丸める / スペース = 一時停止 / C = 消す
// ============================================

let h = 6;                     // ★ 点の間隔（px）
let baseFreq = 110;            // ★ まっすぐな所の音の高さ（Hz）
let octaves = 3;               // ★ 急カーブで上がる最大の幅（オクターブ）
let speed = 1.5, quantize = true, paused = false;
let pts = [], kappa = [], raw = [], drawing = false, closed = true, head = 0, toneA = null, toneB = null;
let kRef = 0.03;               // この曲率で最高音になる（自動で調整）
let pentatonic = [0, 2, 4, 7, 9];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  setPreset(1);
}

function presetPts(no) {
  let cx = width * 0.5, cy = height * 0.42, s = Math.min(width, height) * 0.2, out = [];
  for (let i = 0; i <= 500; i++) {
    let t = (i / 500) * TWO_PI;
    if (no === 1) { let r = s * 0.15 + s * 1.3 * (i / 500); out.push({ x: cx + r * Math.cos(3 * t), y: cy + r * Math.sin(3 * t) }); }
    else if (no === 2) out.push({ x: cx + s * 0.1 * 16 * Math.sin(t) ** 3, y: cy - s * 0.1 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) });
    else out.push({ x: cx + 1.8 * s * Math.sin(3 * t + 1), y: cy + 0.9 * s * Math.sin(4 * t) });
  }
  return out;
}
function setPreset(no) { let src = presetPts(no); closed = no !== 1; pts = resample(src, h, closed); kappa = curvatureOf(pts, h, closed); calibrate(); head = 0; }
function calibrate() { let a = kappa.map(Math.abs).sort((x, y) => x - y); kRef = Math.max(a[Math.floor(a.length * 0.95)] || 0.02, 0.004); }

// 曲率 → 周波数（|κ| が大きいほど高く、Q で五音音階に丸める）
function freqOf(k) {
  let u = Math.min(1, Math.abs(k) / kRef), semis = u * 12 * octaves;
  if (quantize) { let o = Math.floor(semis / 12), r = semis % 12, best = pentatonic.reduce((p, q) => (Math.abs(q - r) < Math.abs(p - r) ? q : p), 0); semis = o * 12 + best; }
  return baseFreq * Math.pow(2, semis / 12);
}

function draw() {
  background(300, 25, 10);
  if (keyIsDown(LEFT_ARROW)) speed = Math.max(0.3, speed - 0.03);
  if (keyIsDown(RIGHT_ARROW)) speed = Math.min(8, speed + 0.03);
  if (!paused && !drawing && pts.length > 3) { head += speed; if (head >= pts.length) head = closed ? head - pts.length : 0; }
  let i = Math.min(pts.length - 1, Math.floor(head)), k = kappa[i] || 0, f = freqOf(k);

  // 音の更新（左曲がりは三角波、右曲がりはサイン波）
  if (audioCtx && !paused && !drawing) {
    if (!toneA) { toneA = startTone(f, 0.12, 'triangle'); toneB = startTone(f, 0.12, 'sine'); }
    toneA.o.frequency.setTargetAtTime(f, audioCtx.currentTime, 0.03);
    toneB.o.frequency.setTargetAtTime(f * 0.5, audioCtx.currentTime, 0.03);
    toneA.g.gain.setTargetAtTime(k > 0 ? 0.14 : 0.02, audioCtx.currentTime, 0.05);
    toneB.g.gain.setTargetAtTime(k > 0 ? 0.02 : 0.14, audioCtx.currentTime, 0.05);
  }
  if (audioCtx && (paused || drawing) && toneA) { stopTone(toneA); stopTone(toneB); toneA = toneB = null; }

  // 曲線（曲率で色、再生済みの所は明るく）
  strokeWeight(3); noFill();
  for (let j = 0; j < pts.length - (closed ? 0 : 1); j++) {
    let a = pts[j], b = pts[(j + 1) % pts.length], kk = Math.min(1, Math.abs(kappa[j]) / kRef);
    stroke(kappa[j] > 0 ? 25 : 200, 40 + 60 * kk, j <= i ? 100 : 55);
    line(a.x, a.y, b.x, b.y);
  }
  if (drawing) { stroke(0, 0, 100, 70); strokeWeight(2); beginShape(); for (let p of raw) vertex(p.x, p.y); endShape(); }
  // 再生ヘッド：接触円の大きさで輪を描く（高い音ほど小さい輪）
  if (pts.length > 3) {
    let p = pts[i], r = Math.min(1 / Math.max(Math.abs(k), 1e-6), 300);
    noFill(); stroke(45, 90, 100, 60); strokeWeight(2); circle(p.x, p.y, 2 * r);
    noStroke(); fill(45, 90, 100); circle(p.x, p.y, 14 + 10 * Math.min(1, Math.abs(k) / kRef));
  }
  // 音の高さのバー
  let bx = 20, by = height - 60, bw = width - 40;
  noStroke(); fill(0, 0, 100, 8); rect(bx, by, bw, 24, 6);
  let u = Math.log2(f / baseFreq) / octaves;
  fill(k > 0 ? 25 : 200, 80, 100); rect(bx, by, bw * constrain(u, 0, 1), 24, 6);
  fill(0, 0, 100); textSize(15); text(nf(f, 1, 0) + ' Hz　|κ| = ' + nf(Math.abs(k), 1, 4) + '（基準 ' + nf(kRef, 1, 4) + '）', bx + 10, by - 8);

  fill(0, 0, 100); textSize(18);
  text((audioCtx ? '' : '▶ まずキャンバスをクリック（音を出す）　') + 'ドラッグ：曲線を描く　1〜3：プリセット　←→：テンポ ' + nf(speed, 1, 1) + '　Q：音階に丸める ' + (quantize ? 'ON' : 'off') + '　スペース：' + (paused ? '再開' : '一時停止') + '　C：消す', 20, 40);
  fill(0, 0, 65); textSize(15);
  text('オレンジ = 左曲がり（三角波）　青 = 右曲がり（サイン波）　急カーブほど高い音（最大 ' + octaves + ' オクターブ上）　黄色い輪 = 接触円', 20, 66);
}

function mousePressed() { startAudio(); if (mouseY < height - 80) { drawing = true; raw = [{ x: mouseX, y: mouseY }]; } }
function mouseDragged() { if (!drawing) return; let l = raw[raw.length - 1]; if (Math.hypot(mouseX - l.x, mouseY - l.y) > 3) raw.push({ x: mouseX, y: mouseY }); }
function mouseReleased() {
  if (!drawing) return;
  drawing = false;
  if (raw.length < 12) return;
  closed = Math.hypot(raw[0].x - raw[raw.length - 1].x, raw[0].y - raw[raw.length - 1].y) < 60;
  pts = smoothPoly(resample(smoothPoly(raw, 3, closed), h, closed), 2, closed);
  kappa = curvatureOf(pts, h, closed); calibrate(); head = 0;
}
function keyPressed() {
  startAudio();
  if (key >= '1' && key <= '3') setPreset(+key);
  if (key === 'q' || key === 'Q') quantize = !quantize;
  if (key === ' ') paused = !paused;
  if (key === 'c' || key === 'C') { pts = []; kappa = []; head = 0; }
}

// ---------- やってみよう ----------
// 1. まっすぐ描くと低いドローン、小さい渦を描くと高い音。「音の高さ」で曲線の形を当てるゲームをしよう
// 2. baseFreq や octaves、pentatonic（音階）を変えてみよう。pentatonic = [0, 3, 5, 7, 10] は短調っぽい
// 3. 曲率の符号で音色でなく「左右のパン」（StereoPannerNode）を変えると？
// 4. 02 の縮閉線や 10 の曲線短縮流（丸くなる = 音が一定になる）と合体してみよう

// ==================================================
// ここから下は「曲線の道具」です（00 と同じ：打ち直し・なめらかに・曲率）
// （中身は読まなくても OK。消さないでね）
// ==================================================
function resample(src, h, isClosed) {
  let out = [], acc = 0, n = src.length + (isClosed ? 1 : 0);
  out.push({ x: src[0].x, y: src[0].y });
  for (let i = 1; i < n; i++) {
    let a = src[i - 1], b = src[i % src.length], d = Math.hypot(b.x - a.x, b.y - a.y), t = 0;
    if (d < 1e-9) continue;
    while (acc + (d - t) >= h) { let need = h - acc; t += need; acc = 0; out.push({ x: a.x + (b.x - a.x) * (t / d), y: a.y + (b.y - a.y) * (t / d) }); }
    acc += d - t;
  }
  if (isClosed && out.length > 1 && Math.hypot(out[0].x - out[out.length - 1].x, out[0].y - out[out.length - 1].y) < h * 0.5) out.pop();
  return out;
}
function smoothPoly(p, n, isClosed) {
  let q = p.map((v) => ({ x: v.x, y: v.y }));
  for (let k = 0; k < n; k++) {
    let r = q.map((v) => ({ x: v.x, y: v.y }));
    for (let i = 0; i < q.length; i++) { if (!isClosed && (i === 0 || i === q.length - 1)) continue; let a = q[(i - 1 + q.length) % q.length], b = q[(i + 1) % q.length]; r[i] = { x: (a.x + 2 * q[i].x + b.x) / 4, y: (a.y + 2 * q[i].y + b.y) / 4 }; }
    q = r;
  }
  return q;
}
function curvatureOf(p, h, isClosed) {
  let n = p.length, out = [];
  for (let i = 0; i < n; i++) {
    let im = isClosed ? (i - 1 + n) % n : Math.max(i - 1, 0), ip = isClosed ? (i + 1) % n : Math.min(i + 1, n - 1);
    let x1 = (p[ip].x - p[im].x) / (2 * h), y1 = (p[ip].y - p[im].y) / (2 * h), x2 = (p[ip].x - 2 * p[i].x + p[im].x) / (h * h), y2 = (p[ip].y - 2 * p[i].y + p[im].y) / (h * h);
    let den = Math.pow(x1 * x1 + y1 * y1, 1.5);
    out.push(den > 1e-9 ? -(x1 * y2 - y1 * x2) / den : 0);
  }
  return out;
}

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
  g.gain.exponentialRampToValueAtTime(vol, audioCtx.currentTime + 0.05);
  o.connect(g); g.connect(masterOut); o.start();
  return { o, g };
}
function stopTone(t) {
  if (!t) return;
  t.g.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.05);
  t.o.stop(audioCtx.currentTime + 0.3);
}
