// ============================================
// 14 シームカービング：DP で絵を「賢く」縮める（自由制作のベース）
// 上から下へ 1 本ずつ「目立たない筋（シーム）」を探して取り除くと、大事なものの形を保ったまま横幅が縮む
// M[y][x] = エネルギー[y][x] + min( M[y-1][x-1], M[y-1][x], M[y-1][x+1] )　─ 1 行上の 3 マスから来る最小コスト
// スペース = 自動で削る / → = 1 本削る / ドラッグ = ブラシ（1 守る 2 消す 3 絵の具）/ E = エネルギー表示 / R = 新しい絵 / クリックで音 ON
// ============================================

let IW = 220, IH = 140;      // ★ 絵の大きさ（ピクセル）。大きいと重くなる
let brushSize = 6;           // ★ ブラシの太さ
let carveEvery = 3;          // ★ 自動のとき何フレームごとに 1 本削るか

let pix = [], mask = [], seam = [], img, dirty = true, auto = false, showEnergy = false, brush = 1, removed = 0, hueNow = 0;
let ox, oy, sc;

const BG = '#16111c', PANEL = '#231a2b', FG = '#f3eaf0', MUTED = '#9a8aa3';
const RASP = '#ff6b8b', CYAN = '#5ee6e0', AMBER = '#ffc857', LIME = '#a3e635';

function setup() {
  createCanvas(windowWidth, windowHeight);
  paintScene();
}

// ★ ここを書きかえて自分の絵をつくろう（r, g, b を返す関数）
function sceneColor(x, y) {
  let u = x / IW, v = y / IH;
  let sky = [40 + 120 * v, 60 + 80 * v, 140 + 60 * v];                         // 夕焼けのグラデーション
  let sun = dist(x, y, IW * 0.72, IH * 0.32) < IH * 0.12;                      // 太陽
  let mount = IH * (0.62 - 0.18 * noise(u * 3)) ;                               // 山の稜線
  let tree = (abs((x % 37) - 18) < 4 - (y - IH * 0.6) * 0.05) && y > IH * 0.55 && y < IH * 0.86 && x % 74 < 37;
  if (y > IH * 0.86) return [40 + 30 * noise(x * 0.2, y * 0.2), 90, 60];      // 草地
  if (tree) return [30, 110 + 40 * noise(x * 0.3, y * 0.3), 60];               // 木
  if (y > mount) return [70 + 30 * v, 60 + 20 * noise(x * 0.05, y * 0.05) * 3, 90]; // 山
  if (sun) return [255, 200, 90];
  return sky;
}

function paintScene() {
  noiseSeed(floor(random(10000)));
  pix = []; mask = [];
  for (let y = 0; y < IH; y++) {
    let row = [], mrow = [];
    for (let x = 0; x < IW; x++) { row.push(sceneColor(x, y)); mrow.push(0); }
    pix.push(row); mask.push(mrow);
  }
  removed = 0; dirty = true; findSeam();
}

function energyAt(x, y) {
  let w = pix[0].length;
  let L = pix[y][max(0, x - 1)], R = pix[y][min(w - 1, x + 1)];
  let U = pix[max(0, y - 1)][x], D = pix[min(IH - 1, y + 1)][x];
  let e = 0;
  for (let c = 0; c < 3; c++) e += abs(L[c] - R[c]) + abs(U[c] - D[c]);
  return e + mask[y][x] * 2000;
}

function findSeam() {
  let w = pix[0].length;
  if (w < 3) { seam = []; return; }
  let M = [], from = [];
  for (let y = 0; y < IH; y++) {
    M.push(new Float32Array(w)); from.push(new Int8Array(w));
    for (let x = 0; x < w; x++) {
      let e = energyAt(x, y);
      if (y === 0) { M[y][x] = e; continue; }
      let best = M[y - 1][x], d = 0;
      if (x > 0 && M[y - 1][x - 1] < best) { best = M[y - 1][x - 1]; d = -1; }
      if (x < w - 1 && M[y - 1][x + 1] < best) { best = M[y - 1][x + 1]; d = 1; }
      M[y][x] = e + best; from[y][x] = d;
    }
  }
  let x = 0;
  for (let k = 1; k < w; k++) if (M[IH - 1][k] < M[IH - 1][x]) x = k;
  seam = new Array(IH);
  for (let y = IH - 1; y >= 0; y--) { seam[y] = x; x += from[y][x]; }
  seam.cost = M[IH - 1][seam[IH - 1]];
}

function carve() {
  if (!seam.length || pix[0].length <= 20) { auto = false; return; }
  for (let y = 0; y < IH; y++) { pix[y].splice(seam[y], 1); mask[y].splice(seam[y], 1); }
  removed++;
  playNote(200 + 600 / (1 + seam.cost / (IH * 60)), 0.12, 0.08, 'sine');
  dirty = true;
  findSeam();
}

function rebuildImage() {
  let w = pix[0].length;
  img = createImage(w, IH);
  img.loadPixels();
  for (let y = 0; y < IH; y++) for (let x = 0; x < w; x++) {
    let k = 4 * (y * w + x), c = pix[y][x];
    if (showEnergy) { let e = min(255, energyAt(x, y) * 0.8); c = [e, e, e]; }
    img.pixels[k] = c[0]; img.pixels[k + 1] = c[1]; img.pixels[k + 2] = c[2]; img.pixels[k + 3] = 255;
  }
  img.updatePixels();
  dirty = false;
}

function draw() {
  background(BG);
  if (auto && frameCount % carveEvery === 0) carve();
  if (dirty) rebuildImage();

  noStroke(); fill(FG); textAlign(LEFT, TOP); textSize(26);
  text('シームカービング：目立たない筋を DP で探して削る', 32, 24);
  fill(MUTED); textSize(15);
  text('スペース 自動　→ 1 本　ドラッグでブラシ（1 守る 2 消す 3 絵の具）　E エネルギー　R 新しい絵', 32, 60);

  sc = min((width - 64) / IW, (height - 200) / IH);
  ox = 32; oy = 100;
  stroke('#3a2f44'); noFill(); rect(ox - 1, oy - 1, IW * sc + 2, IH * sc + 2);
  noSmooth();
  image(img, ox, oy, pix[0].length * sc, IH * sc);
  smooth();
  // マスクの色
  noStroke();
  for (let y = 0; y < IH; y += 1) for (let x = 0; x < pix[0].length; x++) {
    if (mask[y][x] > 0) { fill(163, 230, 53, 90); rect(ox + x * sc, oy + y * sc, sc, sc); }
    else if (mask[y][x] < 0) { fill(255, 107, 139, 110); rect(ox + x * sc, oy + y * sc, sc, sc); }
  }
  // 次に削るシーム
  if (seam.length) {
    stroke(RASP); strokeWeight(max(2, sc)); noFill(); beginShape();
    for (let y = 0; y < IH; y++) vertex(ox + (seam[y] + 0.5) * sc, oy + (y + 0.5) * sc);
    endShape();
  }
  noStroke(); fill(FG); textSize(16); textAlign(LEFT, TOP);
  let names = ['', '守る（緑：エネルギー +）', '消す（赤：エネルギー −）', '絵の具'];
  text(`横幅 ${pix[0].length} / ${IW}　削ったシーム ${removed} 本　ブラシ：${names[brush]}`, 32, oy + IH * sc + 16);
  fill(MUTED); textSize(14);
  text('「消す」で塗ったものはシームが優先して通るので、絵から消える（物体の除去）', 32, oy + IH * sc + 42);
}

function paintAt(mx, my) {
  let w = pix[0].length;
  let cx = floor((mx - ox) / sc), cy = floor((my - oy) / sc);
  if (cx < 0 || cy < 0 || cx >= w || cy >= IH) return;
  hueNow = (hueNow + 2) % 360;
  for (let y = max(0, cy - brushSize); y < min(IH, cy + brushSize); y++)
    for (let x = max(0, cx - brushSize); x < min(w, cx + brushSize); x++) {
      if (dist(x, y, cx, cy) > brushSize) continue;
      if (brush === 1) mask[y][x] = 1;
      if (brush === 2) mask[y][x] = -1;
      if (brush === 3) { colorMode(HSB); let c = color(hueNow, 80, 100); colorMode(RGB); pix[y][x] = [red(c), green(c), blue(c)]; }
    }
  dirty = true;
}

function mousePressed() { startAudio(); paintAt(mouseX, mouseY); }
function mouseDragged() { paintAt(mouseX, mouseY); }
function mouseReleased() { findSeam(); }

function keyPressed() {
  startAudio();
  if (key === ' ') auto = !auto;
  if (key === RIGHT_ARROW) carve();
  if (key >= '1' && key <= '3') brush = int(key);
  if (key === 'e' || key === 'E') { showEnergy = !showEnergy; dirty = true; }
  if (key === 'r' || key === 'R') { auto = false; paintScene(); }
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ==================================================
// ここから下は「音を鳴らすための道具」です
// ==================================================
let audioCtx, masterOut;
function startAudio() {
  if (!audioCtx) { audioCtx = new AudioContext(); masterOut = audioCtx.createDynamicsCompressor(); masterOut.connect(audioCtx.destination); }
  audioCtx.resume();
}
function playNote(freqHz, volume = 0.3, duration = 0.3, type = 'triangle', when) {
  if (!audioCtx) return;
  let t = when === undefined ? audioCtx.currentTime : when;
  let osc = audioCtx.createOscillator(), amp = audioCtx.createGain();
  osc.type = type; osc.frequency.value = freqHz;
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(volume, t + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(amp); amp.connect(masterOut); osc.start(t); osc.stop(t + duration + 0.05);
}
