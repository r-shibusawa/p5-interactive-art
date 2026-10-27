// ============================================
// 14 声でセットポイント（マイクの大きさ → ドローンの目標高度）
// 声が大きいほど目標が高くなる。ドローンは PID でそれを追いかける
//   目標が急に動くと、ドローンは「遅れて」ついてくる。その遅れと行きすぎがグラフで見える
// クリック = マイク ON（使えないときはマウスの高さが目標）/ 左右キー = Kp / 上下キー = Kd
// ============================================

let Kp = 8, Ki = 2, Kd = 5; // ★ PID ゲイン（高度 [m] の誤差 → 推力の増減）
let m = 1, g = 9.8; // ドローンの質量と重力
let Tmax = 2 * m * g; // ★ 最大推力（ホバリングの 2 倍）
let smooth = 0.15; // ★ 声の大きさのなめらかさ（小さいほど目標がゆっくり動く）

let y = 1, vy = 0, r = 1, T = m * g, I = 0, lvl = 0, lvlSmooth = 0;
let HIST = 600, dt = 1 / 60;
let hY = [], hR = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(230, 30, 10);
  // ---- 目標：マイクの音量（なければマウス）
  if (micReady) {
    analyser.getFloatTimeDomainData(waveData);
    lvl = getMicLevel();
    lvlSmooth += (lvl - lvlSmooth) * smooth;
    r = map(lvlSmooth, 0.005, 0.25, 0.3, 4.5, true); // ★ 声の大きさ → 目標高度 [m]
  } else {
    r = map(mouseY, height * 0.85, height * 0.1, 0.3, 4.5, true);
  }
  // ★ PID で推力を決める（微分は速度にかける）
  let e = r - y;
  I = constrain(I + e * dt, -5, 5);
  T = constrain(m * g + Kp * e + Ki * I - Kd * vy, 0, Tmax);
  vy += (T / m - g) * dt;
  y += vy * dt;
  if (y < 0) { y = 0; vy = max(vy, 0); } // 地面
  y = constrain(y, 0, 6); vy = constrain(vy, -20, 20);
  pushHist(hY, y); pushHist(hR, r);

  // ---- ドローンの絵（左）
  let gx0 = width * 0.05, gx1 = width * 0.47, groundY = height * 0.85, topY = height * 0.1;
  let Y = (h) => map(h, 0, 5, groundY, topY);
  stroke(0, 0, 40); strokeWeight(3); line(gx0, groundY, gx1, groundY);
  for (let h = 1; h <= 5; h++) { stroke(0, 0, 25); strokeWeight(1); line(gx0, Y(h), gx1, Y(h)); noStroke(); fill(0, 0, 50); textSize(12); text(h + ' m', gx0, Y(h) - 4); }
  // 目標の線
  stroke(45, 90, 100); strokeWeight(2); line(gx0, Y(r), gx1, Y(r));
  noStroke(); fill(45, 90, 100); textSize(14); text('目標 ' + nf(r, 1, 2) + ' m', gx1 - 100, Y(r) - 6);
  // ドローン
  let dx = (gx0 + gx1) / 2, dy = Y(y);
  stroke(0, 0, 80); strokeWeight(4); line(dx - 60, dy, dx + 60, dy);
  noStroke(); fill(30, 80, 100); rect(dx - 18, dy - 12, 36, 24, 6);
  let blur = map(T, 0, Tmax, 0, 100);
  fill(200, 40, 100, 30 + blur * 0.5);
  ellipse(dx - 60, dy - 6, 44 + (frameCount % 3) * 4, 8); ellipse(dx + 60, dy - 6, 44 + (frameCount % 3) * 4, 8);
  // 推力の矢印
  stroke(120, 80, 100); strokeWeight(4); line(dx, dy + 14, dx, dy + 14 + T * 3);
  noStroke(); fill(0, 0, 100); textSize(14); text('高度 ' + nf(y, 1, 2) + ' m　推力 ' + nf(T, 1, 1) + ' N', dx + 70, dy + 5);
  // 音量メーター
  let mxX = gx0, mY = height * 0.92;
  noStroke(); fill(0, 0, 20); rect(mxX, mY, gx1 - gx0, 12, 6);
  fill(300, 60, 100); rect(mxX, mY, (gx1 - gx0) * constrain(lvlSmooth / 0.25, 0, 1), 12, 6);
  fill(0, 0, 70); textSize(13); text(micReady ? '声の大きさ' : 'マイクなし（マウスの高さが目標）', mxX, mY - 6);

  // ---- グラフ
  drawPlot(width * 0.52, height * 0.2, width * 0.44, height * 0.45, [{ data: hR, hue: 45, sat: 90, name: '目標（声）' }, { data: hY, hue: 30, name: 'ドローンの高度' }], 0, 5.5, '高度 [m]　線の横ずれ = 遅れ');

  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text((micReady ? '声を出すとドローンが上がる' : 'クリックしてマイクを ON にしよう') + '　Kp = ' + nf(Kp, 1, 1) + '（左右）　Kd = ' + nf(Kd, 1, 1) + '（上下）　誤差 ' + nf(e, 1, 2) + ' m', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('目標（黄）が動いてから高度（橙）がついてくるまでの「横ずれ」が遅れ。Kp を上げると追いつきは速いが行きすぎる。Kd（速度のブレーキ）で抑える', 20, 68);
  text('推力には上限（' + nf(Tmax, 1, 0) + ' N）と下限（0 = 自由落下）がある。「ぱっ」と大きい声を出すと上限に当たって追いつけない（飽和）', 20, height - 30);
}

function mousePressed() { startMic(); }
function keyPressed() {
  if (key === RIGHT_ARROW) Kp = min(Kp + 1, 40);
  if (key === LEFT_ARROW) Kp = max(Kp - 1, 0);
  if (key === UP_ARROW) Kd = min(Kd + 1, 30);
  if (key === DOWN_ARROW) Kd = max(Kd - 1, 0);
}

// ---------- やってみよう ----------
// 1. 「あー」と一定の声で止める。ドローンは止まる？ ふらつく？（声のゆれ = 目標のノイズ）
// 2. Kd = 0 にすると？ Kp を 30 にすると？ 声で「ゆれ」を起こしてみよう
// 3. smooth を 0.02 にすると目標がなめらかになる。遅れは増える？ 減る？（フィルタと制御のトレードオフ）
// 4. 目標を「声の高さ」にしてみよう（11 シリーズ9 のピッチ検出や、FFT の一番大きい山）


// ==================================================
// ここから下は「マイクを使うための道具」です
// ==================================================
let audioCtx, analyser, waveData;
let micReady = false;
function startMic() {
  if (audioCtx) return;
  audioCtx = new AudioContext();
  navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
    let source = audioCtx.createMediaStreamSource(stream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    waveData = new Float32Array(analyser.fftSize);
    micReady = true;
  }).catch((err) => { console.log('マイクが使えません：' + err); audioCtx = null; });
}
function getMicLevel() {
  if (!micReady) return 0;
  let sum = 0;
  for (let i = 0; i < waveData.length; i++) sum += waveData[i] * waveData[i];
  return Math.sqrt(sum / waveData.length);
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
