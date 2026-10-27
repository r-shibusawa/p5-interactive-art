// ============================================
// 13 モルフォロジーを聞く
// 描いた形を「収縮 → 収縮 → … → 膨張 → 膨張 → …」と脈打たせ、面積を音の高さと大きさにする
// 形がちぎれて塊の数がふえた瞬間にポンと鳴る。細い所の多い形ほど「にぎやかな曲」になる
// スペース（またはマス目の外をクリック）で再生／停止 / ドラッグで描く / 1〜3 でお手本 / マウス左右 = テンポ / 左右で収縮の深さ / C で消す
// ============================================

let cols = 96, rows = 64, cell, ox = 20, oy = 110;
let img, orig;
let depth = 6;        // ★ 何回収縮してから戻るか
let phase = 0, k = 0; // phase 0 = 収縮中, 1 = 膨張中
let playing = false, lastStep = 0, lastComps = 0;
let history = [];
let se = [], maxArea = 1;
let tone = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  cell = min((width - 400) / cols, (height - 140) / rows);
  se = makeSE('disk', 1); // ★ 1 回あたりの SE
  preset(1);
}

function preset(n) {
  if (n === 1) orig = textToGrid('音', 60);
  else {
    orig = new Uint8Array(cols * rows);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if (n === 2) { if (dist(x, y, 28, 32) < 15 || dist(x, y, 62, 32) < 15 || (x > 28 && x < 62 && abs(y - 32) < 3)) orig[x + y * cols] = 1; }
      else { let d = dist(x, y, 48, 32); if (d < 24 && d > 14 || abs(x - 48) < 2 && y > 8 && y < 56) orig[x + y * cols] = 1; }
    }
  }
  restart();
}
function restart() {
  img = Uint8Array.from(orig);
  maxArea = max(1, areaOf(orig));
  phase = 0; k = 0; history = [];
  lastComps = countComponents(img);
}

function areaOf(a) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]; return s; }

// ★ 1 ステップ：収縮を depth 回、そのあと膨張を depth 回、くり返す
function stepMorph() {
  if (phase === 0) { img = erodeImg(img, se); k++; if (k >= depth || areaOf(img) === 0) phase = 1; }
  else { img = dilateImg(img, se); k--; if (k <= 0) { phase = 0; img = Uint8Array.from(orig); } }
  let area = areaOf(img), comps = countComponents(img);
  history.push(area);
  if (history.length > 120) history.shift();
  // ★ 音：面積 → 高さ（3 オクターブ）と大きさ。塊がふえたらポン
  let f = 110 * pow(2, (area / maxArea) * 3);
  setTone(f, 0.02 + 0.25 * sqrt(area / maxArea));
  if (comps > lastComps) blip(880 + comps * 60);
  lastComps = comps;
}

function draw() {
  background(170, 45, 9);
  let tempo = map(mouseX, 0, width, 350, 60, true); // ★ テンポ（ms）
  if (playing && millis() - lastStep > tempo) { lastStep = millis(); stepMorph(); }
  noStroke();
  fill(170, 30, 16);
  rect(ox, oy, cols * cell, rows * cell);
  let area = 0;
  for (let i = 0; i < img.length; i++) {
    let x = ox + (i % cols) * cell, y = oy + floor(i / cols) * cell;
    if (orig[i] && !img[i]) { fill(150, 40, 30); rect(x, y, cell - 1, cell - 1); }
    if (img[i]) { area++; fill(phase === 0 ? 350 : 150, 60, 95); rect(x, y, cell - 1, cell - 1); }
  }
  let px = ox + cols * cell + 40, ty = oy + 10, pw = width - px - 30;
  fill(0, 0, 100); textSize(34);
  text(phase === 0 ? '収縮 ' + k : '膨張 ' + (depth - k), px, ty + 20);
  textSize(16);
  text('面積 ' + area + ' / ' + maxArea + '　塊 ' + lastComps, px, ty + 54);
  fill(0, 0, 60);
  text('音の高さ = 面積（大きいほど高い）', px, ty + 90);
  text('音の大きさ = 面積の平方根', px, ty + 114);
  text('塊がふえた瞬間 = ポン（高い音）', px, ty + 138);
  // 面積の履歴
  let gy = ty + 170, gh = 160;
  fill(170, 30, 14); rect(px, gy, pw, gh);
  stroke(45, 90, 100); strokeWeight(2); noFill();
  beginShape();
  for (let i = 0; i < history.length; i++) vertex(px + (i / 119) * pw, gy + gh - (history[i] / maxArea) * (gh - 8) - 4);
  endShape();
  noStroke(); fill(0, 0, 60); textSize(13);
  text('面積の変化（時間 →）', px + 6, gy + gh + 18);
  fill(0, 0, 60); textSize(15);
  text('収縮 → 膨張で戻ってくる形 = オープニング', px, gy + gh + 50);
  text('細い所は戻らない（赤 → 暗い緑のまま）', px, gy + gh + 74);

  fill(0, 0, 100);
  textSize(18);
  text((playing ? '再生中（スペースで停止）' : 'スペースで再生（マス目の外のクリックでも）') + '　テンポ：マウス左右 ' + round(tempo) + ' ms　左右：深さ ' + depth + '　1〜3：お手本　ドラッグで描く　C：消す', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('赤 = 収縮中、緑 = 膨張中、暗い緑 = 元の形。形の「太さの分布」がメロディになる。太い形は低くゆっくり、細い形はすぐ消えてポンポン鳴る', 20, 68);
}

// 塊（8 近傍）の数
function countComponents(a) {
  let seen = new Uint8Array(a.length), n = 0;
  for (let s = 0; s < a.length; s++) {
    if (!a[s] || seen[s]) continue;
    n++;
    let stack = [s]; seen[s] = 1;
    while (stack.length) {
      let i = stack.pop(), x = i % cols, y = floor(i / cols);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        let nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        let j = nx + ny * cols;
        if (a[j] && !seen[j]) { seen[j] = 1; stack.push(j); }
      }
    }
  }
  return n;
}

function paint() {
  let gx = floor((mouseX - ox) / cell), gy = floor((mouseY - oy) / cell);
  if (gx < 0 || gy < 0 || gx >= cols || gy >= rows) return false;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    let x = gx + dx, y = gy + dy;
    if (x >= 0 && y >= 0 && x < cols && y < rows && dx * dx + dy * dy <= 5) { orig[x + y * cols] = 1; img[x + y * cols] = 1; }
  }
  maxArea = max(1, areaOf(orig));
  return true;
}
function togglePlay() {
  startAudio();
  playing = !playing;
  if (!playing) setTone(0, 0);
}
function mousePressed() {
  startAudio();
  if (!paint()) togglePlay(); // マス目の外をクリック = 再生／停止
}
function mouseDragged() { paint(); }
function keyPressed() {
  if (key === ' ') togglePlay();
  if (key >= '1' && key <= '3') preset(int(key));
  if (key === LEFT_ARROW) depth = max(1, depth - 1);
  if (key === RIGHT_ARROW) depth = min(20, depth + 1);
  if (key === 'c' || key === 'C') { orig.fill(0); restart(); }
}

// ---------- やってみよう ----------
// 1. 「音」「太い丸」「細い線」で聞き比べる。ポンがたくさん鳴るのはどれ？
// 2. 深さを 20 にして、面積のグラフが 0 まで落ちる形と落ちない形を作る
// 3. 塊の数 lastComps を和音の数にする（塊ごとに 1 つの音を鳴らす）

// ==================================================
// ここから下は「音を鳴らすための道具」と「モルフォロジーの道具」
// （中身は読まなくても OK。消さないでね）
// ==================================================
let audioCtx, masterOut;
function startAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterOut = audioCtx.createDynamicsCompressor(); masterOut.connect(audioCtx.destination);
    let o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'triangle'; o.frequency.value = 220; g.gain.value = 0;
    o.connect(g); g.connect(masterOut); o.start();
    tone = { o, g };
  }
  audioCtx.resume();
}
// 鳴らしっぱなしの音の高さと大きさをなめらかに変える
function setTone(f, vol) {
  if (!tone) return;
  let t = audioCtx.currentTime;
  if (f > 0) tone.o.frequency.setTargetAtTime(f, t, 0.03);
  tone.g.gain.setTargetAtTime(vol, t, 0.04);
}
// 短い音
function blip(f) {
  if (!audioCtx) return;
  let o = audioCtx.createOscillator(), g = audioCtx.createGain(), t = audioCtx.currentTime;
  o.type = 'sine'; o.frequency.value = f;
  g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
  o.connect(g); g.connect(masterOut); o.start(t); o.stop(t + 0.3);
}

function makeSE(kind, r) {
  let out = [];
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (kind === 'box') out.push([dx, dy]);
    else if (kind === 'cross') { if (dx === 0 || dy === 0) out.push([dx, dy]); }
    else if (dx * dx + dy * dy <= r * r + r * 0.5) out.push([dx, dy]);
  }
  return out;
}
function morph(a, se, isDilate) {
  let out = new Uint8Array(a.length);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    let v = isDilate ? 0 : 1;
    for (let k = 0; k < se.length; k++) {
      let nx = x + se[k][0], ny = y + se[k][1];
      if (nx < 0) nx = 0; else if (nx >= cols) nx = cols - 1;
      if (ny < 0) ny = 0; else if (ny >= rows) ny = rows - 1;
      let s = a[nx + ny * cols];
      if (isDilate ? s : !s) { v = isDilate ? 1 : 0; break; }
    }
    out[x + y * cols] = v;
  }
  return out;
}
function dilateImg(a, se) { return morph(a, se, true); }
function erodeImg(a, se) { return morph(a, se, false); }
function textToGrid(str, px) {
  let pg = createGraphics(cols, rows);
  pg.pixelDensity(1);
  pg.background(0); pg.fill(255); pg.noStroke();
  pg.textAlign(CENTER, CENTER); pg.textStyle(BOLD); pg.textSize(px);
  pg.text(str, cols / 2, rows / 2);
  pg.loadPixels();
  let out = new Uint8Array(cols * rows);
  for (let i = 0; i < cols * rows; i++) out[i] = pg.pixels[i * 4] > 127 ? 1 : 0;
  pg.remove();
  return out;
}
