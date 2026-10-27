// ============================================
// 14 形を育てるブラシ（自由制作のベース）
// 描いた形が、ランダムな構造要素の膨張・収縮・オープン・クローズで「育って」いく
// 新しく生えたマスほど新しい色。育つたびに小さな音。描きながら生き物を飼うように
// ドラッグで描く / 1〜4 で育ち方 / 上下で速さ / スペースで一時停止 / M で音 / S で保存 / C で消す
// ============================================
// ★ のついた数字を変えて、自分の作品に！

let cols = 96, rows = 64, cell, ox = 20, oy = 110;
let img, age;
let growMode = 3;      // ★ 1 ふくらむ 2 しぼむ 3 ふくらむ⇄しぼむ 4 なめらかに（オープン／クローズ）
let growEvery = 12;    // ★ 何フレームごとに育つか
let brushR = 2;        // ★ ブラシの半径
let maxFill = 0.6;     // ★ 画面のこれ以上を占めたら自動でしぼむ
let generation = 0, paused = false, sound = true, lastOp = '';
let kinds = ['box', 'cross', 'disk', 'hline', 'vline', 'diag'];
let modeNames = { 1: 'ふくらむ', 2: 'しぼむ', 3: 'ふくらむ⇄しぼむ', 4: 'なめらかに' };

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  cell = min((width - 40) / cols, (height - 130) / rows);
  ox = (width - cols * cell) / 2;
  img = new Uint8Array(cols * rows);
  age = new Int32Array(cols * rows);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (dist(x, y, cols / 2, rows / 2) < 5) img[x + y * cols] = 1;
}

// ★ 1 回の成長：ランダムな SE とランダムな操作
function grow() {
  let kind = kinds[floor(random(kinds.length))];
  let se = makeSE(kind, floor(random(1, 3)));
  let area = 0;
  for (let i = 0; i < img.length; i++) area += img[i];
  let frac = area / img.length;
  let op;
  if (growMode === 1) op = 'dilate';
  else if (growMode === 2) op = 'erode';
  else if (growMode === 3) op = random() < 0.55 ? 'dilate' : 'erode';
  else op = random() < 0.5 ? 'open' : 'close';
  if (frac > maxFill) op = 'erode';            // ふえすぎたらしぼむ
  if (area < 20 && op !== 'dilate') op = 'dilate'; // 消えそうなら育てる
  let next = op === 'dilate' ? dilateImg(img, se) : op === 'erode' ? erodeImg(img, se)
    : op === 'open' ? dilateImg(erodeImg(img, se), se) : erodeImg(dilateImg(img, se), se);
  generation++;
  let delta = 0;
  for (let i = 0; i < img.length; i++) {
    if (next[i] && !img[i]) { age[i] = generation; delta++; }
    if (!next[i] && img[i]) delta--;
  }
  img = next;
  lastOp = { dilate: '膨張', erode: '収縮', open: 'オープン', close: 'クローズ' }[op] + '（' + kind + '）';
  // ★ 音：ふえたら上がる音、へったら下がる音
  if (sound && delta !== 0) playNote(220 * pow(2, constrain(delta / 400, -1.5, 1.5)), 0.12, delta > 0 ? 'triangle' : 'sine');
}

function draw() {
  background(170, 45, 7);
  if (!paused && frameCount % growEvery === 0) grow();
  noStroke();
  fill(170, 30, 12);
  rect(ox, oy, cols * cell, rows * cell);
  let area = 0;
  for (let i = 0; i < img.length; i++) {
    if (!img[i]) continue;
    area++;
    let a = generation - age[i]; // 何世代前に生えたか
    fill((140 + age[i] * 7) % 360, 70, a < 2 ? 100 : max(45, 95 - a * 2)); // ★ 色：世代で色相、古いほど暗く
    rect(ox + (i % cols) * cell, oy + floor(i / cols) * cell, cell - 1, cell - 1);
  }
  fill(0, 0, 100);
  textSize(18);
  text('ドラッグで描く　1〜4：育ち方（' + modeNames[growMode] + '）　上下：速さ ' + growEvery + '　スペース：' + (paused ? '再開' : '一時停止') + '　M：音 ' + (sound ? 'ON' : 'OFF') + '　S：保存　C：消す', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('世代 ' + generation + '　前景 ' + nf((area / img.length) * 100, 1, 0) + '%　最後の操作：' + lastOp + '　（クリックで音が出ます）', 20, 68);
}

function paint() {
  let gx = floor((mouseX - ox) / cell), gy = floor((mouseY - oy) / cell);
  for (let dy = -brushR; dy <= brushR; dy++) for (let dx = -brushR; dx <= brushR; dx++) {
    let x = gx + dx, y = gy + dy;
    if (x >= 0 && y >= 0 && x < cols && y < rows && dx * dx + dy * dy <= brushR * brushR + 1) {
      if (!img[x + y * cols]) age[x + y * cols] = generation;
      img[x + y * cols] = 1;
    }
  }
}
function mousePressed() { startAudio(); paint(); }
function mouseDragged() { paint(); }
function keyPressed() {
  if (key >= '1' && key <= '4') growMode = int(key);
  if (key === UP_ARROW) growEvery = max(2, growEvery - 2);
  if (key === DOWN_ARROW) growEvery = min(60, growEvery + 2);
  if (key === ' ') paused = !paused;
  if (key === 'm' || key === 'M') sound = !sound;
  if (key === 's' || key === 'S') saveCanvas('morphology', 'png');
  if (key === 'c' || key === 'C') { img.fill(0); generation = 0; }
}

// ---------- やってみよう ----------
// 1. 細い線を 1 本描いて「なめらかに」で育てる。線はどうなる？ 太い丸は？
// 2. kinds を 'disk' だけにすると丸く育ち、'hline' だけにすると横に伸びる。育ち方を自分で設計する
// 3. 色を age ではなく「その位置の収縮回数」で決める。または背景を黒い紙に、形を白いインクに

// ==================================================
// ここから下は「音を鳴らすための道具」と「モルフォロジーの道具」
// （中身は読まなくても OK。消さないでね）
// ==================================================
let audioCtx, masterOut;
function startAudio() {
  if (!audioCtx) { audioCtx = new AudioContext(); masterOut = audioCtx.createDynamicsCompressor(); masterOut.connect(audioCtx.destination); }
  audioCtx.resume();
}
function playNote(f, vol, type) {
  if (!audioCtx) return;
  let o = audioCtx.createOscillator(), g = audioCtx.createGain(), t = audioCtx.currentTime;
  o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
  o.connect(g); g.connect(masterOut); o.start(t); o.stop(t + 0.4);
}
// 構造要素：正方形・十字・円・横線・縦線・斜め線
function makeSE(kind, r) {
  let out = [];
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (kind === 'box') out.push([dx, dy]);
    else if (kind === 'cross') { if (dx === 0 || dy === 0) out.push([dx, dy]); }
    else if (kind === 'disk') { if (dx * dx + dy * dy <= r * r + r * 0.5) out.push([dx, dy]); }
    else if (kind === 'hline') { if (dy === 0) out.push([dx, dy]); }
    else if (kind === 'vline') { if (dx === 0) out.push([dx, dy]); }
    else if (dx === dy) out.push([dx, dy]);
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
