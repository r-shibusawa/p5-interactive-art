// ============================================
// 13 不動点を聞く 🔊
// ロジスティック写像 x ← r·x(1 − x) をくり返し、x を音の高さにする
//   不動点に吸い込まれる → 同じ音が鳴り続ける / 周期 2 → トリル / 周期 4 → 4 音のフレーズ / カオス → 終わらないメロディ
// クリックで音をスタート / ←→ = r（Shift で細かく）/ ↑↓ = テンポ / 1〜5 = r の見本 / Q = 音階にそろえる / スペース = 止める / R = x をリセット
// ============================================

let r = 2.8;               // ★ ロジスティック写像のパラメータ
let x = 0.2;
let bps = 6;               // ★ 1 秒に何音
let quantize = true;       // 五音音階にそろえる
let paused = false;
let notes = [];            // 鳴らした x の記録
let nextBeat = 0;
let bifG;
let rlo = 2.4, rhi = 4.0;  // ★ 分岐図の r の範囲
const SCALE = [0, 2, 4, 7, 9];   // 五音音階（ド レ ミ ソ ラ）

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  bifG = createGraphics(floor(width * 0.55), floor(height * 0.42));
  bifG.pixelDensity(1);
  drawBifurcation();
}

// 分岐図：r ごとに 300 回くり返して、最後の 150 回の x を点で打つ
function drawBifurcation() {
  let w = bifG.width, h = bifG.height;
  bifG.background(16, 18, 30);
  bifG.loadPixels();
  for (let i = 0; i < w; i++) {
    let rr = lerp(rlo, rhi, i / (w - 1)), xx = 0.5;
    for (let k = 0; k < 300; k++) {
      xx = rr * xx * (1 - xx);
      if (k > 150) {
        let j = floor((1 - xx) * (h - 1)), p = (j * w + i) * 4;
        bifG.pixels[p] = min(255, bifG.pixels[p] + 60); bifG.pixels[p + 1] = min(255, bifG.pixels[p + 1] + 70); bifG.pixels[p + 2] = min(255, bifG.pixels[p + 2] + 40);
      }
    }
  }
  bifG.updatePixels();
}

// ★ x（0〜1）→ 音の高さ（Hz）。2 オクターブ
function pitch(v) {
  let semis = v * 24;
  if (quantize) { let oct = floor(semis / 12), s = semis - oct * 12, best = SCALE.reduce((a, b) => abs(b - s) < abs(a - s) ? b : a); semis = oct * 12 + best; }
  return 220 * Math.pow(2, semis / 12);
}

// 周期を調べる：最後の値が p 個前と同じなら周期 p
function detectPeriod() {
  if (notes.length < 40) return 0;
  for (let p = 1; p <= 16; p++) {
    let ok = true;
    for (let i = 0; i < 16 && ok; i++) if (abs(notes[notes.length - 1 - i] - notes[notes.length - 1 - i - p]) > 1e-4) ok = false;
    if (ok) return p;
  }
  return -1;
}
// リアプノフ指数：負なら近くの点が近づく（周期）、正なら離れる（カオス）
function lyapunov() {
  let xx = 0.3, s = 0;
  for (let k = 0; k < 600; k++) { xx = r * xx * (1 - xx); if (k >= 100) s += Math.log(max(1e-12, abs(r * (1 - 2 * xx)))); }
  return s / 500;
}

function draw() {
  background(230, 30, 11);
  if (keyIsDown(LEFT_ARROW)) r = max(rlo, r - (keyIsDown(SHIFT) ? 0.0005 : 0.004));
  if (keyIsDown(RIGHT_ARROW)) r = min(rhi, r + (keyIsDown(SHIFT) ? 0.0005 : 0.004));
  // 拍が来たら 1 回くり返して鳴らす
  if (!paused && millis() >= nextBeat) {
    x = r * x * (1 - x);
    if (!isFinite(x) || x <= 0 || x >= 1) x = 0.2;
    notes.push(x); if (notes.length > 200) notes.shift();
    playNote(pitch(x), 1 / bps);
    nextBeat = millis() + 1000 / bps;
  }
  let bx = 40, by = 100;
  image(bifG, bx, by);
  let rx = bx + (r - rlo) / (rhi - rlo) * bifG.width;
  stroke(320, 70, 100); strokeWeight(2); line(rx, by, rx, by + bifG.height);
  noStroke(); fill(320, 70, 100); circle(rx, by + (1 - x) * bifG.height, 10);
  fill(0, 0, 70); textSize(13);
  text('r = ' + rlo, bx, by + bifG.height + 16); text('r = ' + rhi, bx + bifG.width - 50, by + bifG.height + 16);
  text('分岐図：横 = r、縦 = 最後に落ち着く x の値', bx, by - 8);

  // 下：鳴らした音の列（楽譜のように）
  let sy0 = by + bifG.height + 50, sh = height - sy0 - 40, sw = bifG.width;
  noFill(); stroke(0, 0, 30); strokeWeight(1); rect(bx, sy0, sw, sh);
  let show = notes.slice(-64);
  noStroke();
  for (let i = 0; i < show.length; i++) {
    let v = show[i], yy = sy0 + sh - v * sh;
    fill((v * 300 + 180) % 360, 70, 100, 40 + 60 * i / show.length);
    rect(bx + i * sw / 64 + 1, yy - 4, sw / 64 - 2, 8, 3);
  }
  fill(0, 0, 70); text('鳴らした音（右が新しい）', bx, sy0 - 8);

  // 右：クモの巣図（01）
  let cx0 = bx + sw + 50, cs = min(width - cx0 - 30, 300), cy0 = by;
  if (cs > 120) {
    noFill(); stroke(0, 0, 35); rect(cx0, cy0, cs, cs);
    stroke(0, 0, 60); line(cx0, cy0 + cs, cx0 + cs, cy0);
    stroke(190, 70, 100); strokeWeight(2); beginShape();
    for (let s = 0; s <= 100; s++) { let u = s / 100; vertex(cx0 + u * cs, cy0 + cs - r * u * (1 - u) * cs); } endShape();
    stroke(320, 70, 100, 70); strokeWeight(1);
    let t = notes.slice(-30);
    for (let i = 0; i < t.length - 1; i++) {
      line(cx0 + t[i] * cs, cy0 + cs - t[i] * cs, cx0 + t[i] * cs, cy0 + cs - t[i + 1] * cs);
      line(cx0 + t[i] * cs, cy0 + cs - t[i + 1] * cs, cx0 + t[i + 1] * cs, cy0 + cs - t[i + 1] * cs);
    }
    let xs = 1 - 1 / r, d = abs(2 - r);
    noStroke(); fill(abs(d) < 1 ? 140 : 0, 80, 100); circle(cx0 + xs * cs, cy0 + cs - xs * cs, 10);
    let per = detectPeriod(), ly = lyapunov();
    fill(0, 0, 100); textSize(16);
    let ty = cy0 + cs + 34;
    text('不動点 x* = 1 − 1/r = ' + nf(xs, 1, 4), cx0, ty);
    text("傾き |f'(x*)| = |2 − r| = " + nf(d, 1, 3) + (d < 1 ? '（引き寄せる）' : '（押し返す）'), cx0, ty + 26);
    fill(45, 90, 100);
    text(per === 1 ? '→ 不動点に着いた：同じ音' : per > 1 ? '→ 周期 ' + per + '：' + per + ' 音のくり返し' : per === 0 ? '…' : '→ 周期なし（カオス？）', cx0, ty + 56);
    fill(0, 0, 80);
    text('リアプノフ指数 ' + nf(ly, 1, 3) + (ly > 0 ? '（正：カオス）' : '（負：落ち着く）'), cx0, ty + 82);
    fill(0, 0, 60); textSize(14);
    text('r = 3 で不動点が「押し返す」側に変わり、周期 2 が生まれる。3.449… で周期 4、… 3.5699… でカオス。3.83 付近に周期 3 の窓', cx0, ty + 108, width - cx0 - 30);
  }

  noStroke(); fill(0, 0, 100); textSize(18);
  text((audioCtx ? '♪ 鳴っています' : 'クリックで音をスタート') + '　r = ' + nf(r, 1, 4) + '（←→、Shift で細かく）　テンポ ' + bps + ' 音/秒（↑↓）　1〜5：見本　Q：音階 ' + (quantize ? 'ON' : 'off') + '　スペース：' + (paused ? '再開' : '止める') + '　R：リセット', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('x = 0〜1 を 2 オクターブの音に。収束する r では、最初だけメロディがあってすぐ 1 音に落ち着く（不動点の音）', 20, 68);
}

function mousePressed() { startAudio(); }
function keyPressed() {
  startAudio();
  let presets = { '1': 2.8, '2': 3.2, '3': 3.5, '4': 3.835, '5': 3.95 };
  if (presets[key]) { r = presets[key]; x = 0.2; }
  if (key === UP_ARROW) bps = min(16, bps + 1);
  if (key === DOWN_ARROW) bps = max(1, bps - 1);
  if (key === 'q' || key === 'Q') quantize = !quantize;
  if (key === ' ') paused = !paused;
  if (key === 'r' || key === 'R') { x = 0.2; notes = []; }
}

// ---------- やってみよう ----------
// 1. r = 2.8 → 3.2 → 3.5 と上げて、1 音 → 2 音 → 4 音に分かれる瞬間を耳で聞こう（周期倍分岐）
// 2. r = 3.83 付近で、カオスの中から急に 3 音のくり返しが現れる（周期 3 の窓）。Shift + ←→ で探そう
// 3. pitch の 24（2 オクターブ）を 36 にしたり、SCALE を [0, 3, 5, 7, 10] に変えて雰囲気を変えよう
// 4. 写像を x ← r·sin(πx)/4 などに変えても、同じ順番で分岐が起きる（ファイゲンバウムの普遍性）

// ==================================================
// ここから下は「音を鳴らすための道具」
// ==================================================
let audioCtx, masterOut;
function startAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterOut = audioCtx.createGain(); masterOut.gain.value = 0.5;
    let comp = audioCtx.createDynamicsCompressor();
    masterOut.connect(comp); comp.connect(audioCtx.destination);
  }
  audioCtx.resume();
}
// 短い音を 1 つ（f Hz、len 秒）
function playNote(f, len) {
  if (!audioCtx) return;
  let t = audioCtx.currentTime, o = audioCtx.createOscillator(), o2 = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = 'triangle'; o.frequency.value = f;
  o2.type = 'sine'; o2.frequency.value = f * 2;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + max(0.08, len * 0.95));
  o.connect(g); o2.connect(g); g.connect(masterOut);
  o.start(t); o2.start(t); o.stop(t + len + 0.05); o2.stop(t + len + 0.05);
}
