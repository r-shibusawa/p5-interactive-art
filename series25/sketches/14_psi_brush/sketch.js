// ============================================
// 14 波動関数ブラシ
// 上の段にポテンシャル V(x) と最初の波をマウスで描くと、シュレーディンガー方程式（03 と同じ分割演算子法）で動き出す
//   下の段は「時空図」：横 = x、縦 = 時間（上が今）。色 = 位相、明るさ = |ψ|。波の動きがそのまま絵になる。自由制作のベース
// クリックで音をスタート / ドラッグ = 描く / V = ポテンシャルの筆 / W = 波の筆 / ←→ = 波の運動量 k0 / スペース = 停止・再生 / 1〜3 = V の例 / S = 保存 / C = 全部消す
// ============================================

const N = 256;              // ★ 格子点の数
const L = 100;
const dt = 0.05;
let sub = 4;                // ★ 1 フレームの歩数
let dx = L / N;
let re = new Float64Array(N), im = new Float64Array(N), amp = new Float64Array(N);
let V = new Float64Array(N), ks = new Float64Array(N);
let kc = new Float64Array(N), kS = new Float64Array(N), vc = new Float64Array(N), vS = new Float64Array(N);
let brush = 'W', k0 = 2;
let running = true, drawing = false, lastJ = -1;
let pg, rows = 360, head = 0;   // 時空図（リングバッファ）
let tre = new Float64Array(N), tim = new Float64Array(N);
let Eavg = 0, xAvg = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  pg = createGraphics(N, rows);
  pg.pixelDensity(1);
  pg.background(0);
  for (let j = 0; j < N; j++) {
    ks[j] = ((2 * PI) / L) * (j < N / 2 ? j : j - N);
    kc[j] = cos(-(ks[j] * ks[j] * dt) / 2); kS[j] = sin(-(ks[j] * ks[j] * dt) / 2);
  }
  clearAll();
}

function clearAll() {
  V.fill(0); amp.fill(0);
  for (let j = 0; j < N; j++) amp[j] = exp(-sq(j - N * 0.3) / (2 * 64));   // 最初はガウス波束
  makeV(); makePsi();
  pg.background(0);
}
function presetV(k) {
  for (let j = 0; j < N; j++) {
    let x = (j / N) * L - L / 2;
    V[j] = k === 1 ? (abs(x) < 1.5 ? 3 : 0) : k === 2 ? 0.004 * x * x : 1.5 * (1 + cos(x * 1.2)) * (abs(x) < 25 ? 1 : 0);
  }
  makeV();
}
// V を位相の配列に。両端に高い壁（波が反対側から出てこないように）
function makeV() {
  for (let j = 0; j < N; j++) {
    let v = j < 3 || j > N - 4 ? 30 : V[j];
    vc[j] = cos((-v * dt) / 2); vS[j] = sin((-v * dt) / 2);
  }
}
// 描いた振幅 amp に e^{ik0x} をかけて正規化
function makePsi() {
  let s = 0;
  for (let j = 0; j < N; j++) { let x = j * dx; re[j] = amp[j] * cos(k0 * x); im[j] = amp[j] * sin(k0 * x); s += amp[j] * amp[j] * dx; }
  if (s < 1e-9) { amp[N >> 1] = 1; return makePsi(); }
  for (let j = 0; j < N; j++) { re[j] /= sqrt(s); im[j] /= sqrt(s); }
}
function rot(c, s) { for (let j = 0; j < N; j++) { let a = re[j], b = im[j]; re[j] = a * c[j] - b * s[j]; im[j] = a * s[j] + b * c[j]; } }

function draw() {
  background(250, 20, 8);
  let top = 100, ph = height * 0.36, base = top + ph, left = 30, w = width - 60;
  // マウスで描く
  if (drawing) {
    let j = constrain(round(((mouseX - left) / w) * (N - 1)), 0, N - 1);
    let v = constrain((base - mouseY) / ph, 0, 1);
    let a = lastJ < 0 ? j : lastJ;
    for (let k = min(a, j); k <= max(a, j); k++) { if (brush === 'V') V[k] = v * 8; else amp[k] = v; }
    lastJ = j;
    if (brush === 'V') makeV(); else makePsi();
  }
  if (running && !(drawing && brush === 'W')) for (let i = 0; i < sub; i++) { rot(vc, vS); fft(re, im, false); rot(kc, kS); fft(re, im, true); rot(vc, vS); }

  // 期待値 ⟨x⟩ と ⟨E⟩（音に使う）
  let pmax = 0, sx = 0, sp = 0, sv = 0;
  for (let j = 0; j < N; j++) { let p = re[j] * re[j] + im[j] * im[j]; pmax = max(pmax, p); sx += j * p; sp += p; sv += V[j] * p; }
  tre.set(re); tim.set(im); fft(tre, tim, false);
  let st = 0, sk = 0;
  for (let j = 0; j < N; j++) { let p = tre[j] * tre[j] + tim[j] * tim[j]; st += (ks[j] * ks[j] / 2) * p; sk += p; }
  Eavg = st / max(sk, 1e-12) + sv / max(sp, 1e-12); xAvg = sx / max(sp, 1e-12) / N;
  setSound(110 + 90 * constrain(Eavg, 0, 12), xAvg * 2 - 1, running ? 0.12 : 0);

  // 時空図に 1 行書く（新しい行が上）
  if (running) {
    head = (head - 1 + rows) % rows;
    pg.loadPixels();
    for (let j = 0; j < N; j++) {
      let p = re[j] * re[j] + im[j] * im[j];
      let rgb = hsv(((atan2(im[j], re[j]) + PI) / TWO_PI), 0.8, min(1, sqrt(p / max(pmax, 1e-9)) * 1.1));
      let k = (head * N + j) * 4;
      pg.pixels[k] = rgb[0]; pg.pixels[k + 1] = rgb[1]; pg.pixels[k + 2] = rgb[2]; pg.pixels[k + 3] = 255;
    }
    pg.updatePixels();
  }
  let sy = base + 20, sh = height - sy - 20, r1 = rows - head;
  image(pg, left, sy, w, (sh * r1) / rows, 0, head, N, r1);
  if (head > 0) image(pg, left, sy + (sh * r1) / rows, w, (sh * head) / rows, 0, 0, N, head);

  // 上の段：V と |ψ|²
  noStroke(); fill(0, 0, 25);
  beginShape(); vertex(left, base);
  for (let j = 0; j < N; j++) vertex(left + (j / (N - 1)) * w, base - min(V[j] / 8, 1) * ph);
  vertex(left + w, base); endShape(CLOSE);
  strokeWeight(w / N + 0.8);
  for (let j = 0; j < N; j++) {
    let p = re[j] * re[j] + im[j] * im[j];
    stroke(((atan2(im[j], re[j]) + PI) / TWO_PI) * 360, 75, 100);
    line(left + (j / (N - 1)) * w, base, left + (j / (N - 1)) * w, base - (p / max(pmax, 1e-9)) * ph * 0.9);
  }
  if (brush === 'W' && !running) {
    noFill(); stroke(0, 0, 100, 50); strokeWeight(1); beginShape();
    for (let j = 0; j < N; j++) vertex(left + (j / (N - 1)) * w, base - amp[j] * ph); endShape();
  }
  stroke(0, 0, 50); strokeWeight(1); line(left, base, left + w, base);

  noStroke(); fill(0, 0, 100); textSize(18);
  text((audioCtx ? '♪' : 'クリックで音') + '　筆：' + (brush === 'V' ? 'V ポテンシャル' : 'W 波') + '（V/W で切替）　←→ k0 = ' + nf(k0, 1, 1) + '　スペース：' + (running ? '動' : '止') + '　1〜3：V の例　S：保存　C：消す　⟨E⟩ = ' + nf(Eavg, 1, 2), 20, 40);
  fill(0, 0, 60); textSize(15);
  text('上の段に描く（灰色 = V、色の山 = |ψ|²）。下の段は時間の積み重ね：上が今、下が過去。音の高さ = エネルギー、左右 = 位置', 20, 68);
}

function mousePressed() {
  startAudio();
  if (mouseY > 100 && mouseY < 100 + height * 0.36) { drawing = true; lastJ = -1; }
}
function mouseReleased() { drawing = false; }

function keyPressed() {
  startAudio();
  if (key === 'v' || key === 'V') brush = 'V';
  if (key === 'w' || key === 'W') brush = 'W';
  if (key === RIGHT_ARROW) { k0 = min(5, k0 + 0.5); makePsi(); }
  if (key === LEFT_ARROW) { k0 = max(-5, k0 - 0.5); makePsi(); }
  if (key === ' ') running = !running;
  if (key >= '1' && key <= '3') presetV(int(key));
  if (key === 's' || key === 'S') saveCanvas('psi_brush', 'png');
  if (key === 'c' || key === 'C') clearAll();
}

// ---------- やってみよう ----------
// 1. 2（調和ポテンシャル）で波束を投げると、時空図にジグザグの模様（往復）が描かれる
// 2. 波の筆で離れた 2 つの山を描くと、ぶつかった所に干渉の縞が出る。k0 を変えると縞の細かさは？
// 3. 3（周期的な山）は結晶のモデル。k0 を 0.5 ずつ変えて、通り抜ける k0 と はね返る k0 を探そう（バンド）
// 4. 時空図の色の付け方（hsv の引数）や sub を変えて、自分だけの「量子の絵」を作り S で保存


// ==================================================
// ここから下は「道具」（FFT・色・音）
// ==================================================
// re, im：長さ n（2 のべき）の配列をその場で変換する。inv = true で逆変換（1/n で割る）
function fft(re, im, inv) {
  let n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { let tr = re[i]; re[i] = re[j]; re[j] = tr; let ti = im[i]; im[i] = im[j]; im[j] = ti; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    let ang = ((inv ? 2 : -2) * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        let a = i + k, b = a + len / 2;
        let xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
        let tc = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = tc;
      }
    }
  }
  if (inv) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}
// 色相 h（0〜1）・彩度 s・明るさ v → [r, g, b]（0〜255）
function hsv(h, s, v) {
  let i = Math.floor(h * 6) % 6, f = h * 6 - Math.floor(h * 6);
  let p = v * (1 - s), q = v * (1 - f * s), u = v * (1 - (1 - f) * s);
  let rgb = [[v, u, p], [q, v, p], [p, v, u], [p, q, v], [u, p, v], [v, p, q]][i];
  return [rgb[0] * 255, rgb[1] * 255, rgb[2] * 255];
}
let audioCtx, osc, gainN, panN;
function startAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    osc = audioCtx.createOscillator(); gainN = audioCtx.createGain(); panN = audioCtx.createStereoPanner();
    osc.type = 'triangle'; osc.frequency.value = 220; gainN.gain.value = 0;
    osc.connect(gainN); gainN.connect(panN); panN.connect(audioCtx.destination); osc.start();
  }
  audioCtx.resume();
}
// 高さ f（Hz）・左右 pan（−1〜1）・大きさ vol
function setSound(f, pan, vol) {
  if (!audioCtx) return;
  let tt = audioCtx.currentTime;
  osc.frequency.setTargetAtTime(constrain(f, 40, 3000), tt, 0.05);
  panN.pan.setTargetAtTime(constrain(pan, -1, 1), tt, 0.05);
  gainN.gain.setTargetAtTime(constrain(vol, 0, 0.3), tt, 0.08);
}
