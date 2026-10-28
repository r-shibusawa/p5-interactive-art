// ============================================
// 14 貴金属比ブラシ ─ 自由制作のベース
// ドラッグすると、貴金属比の形のスタンプが押される。動かす速さで大きさが変わり、音も鳴る
//   1 = 正方形の渦（01）/ 2 = 対数螺旋（04）/ 3 = ひまわり（07）/ 4 = 正多角形の星（06）
// ドラッグ = 描く / 1〜4 = ブラシ / ←→ = n / P = 色の組み合わせ / M = 音 ON/OFF / S = 保存 / C = 消す
// ============================================

let n = 1;               // ★ 貴金属比の n
let brush = 1;
let palIdx = 0;
let soundOn = true;
let art;                 // 描きためる層
let last = null;         // 前回スタンプを押した位置
let stampCount = 0;
const PALETTES = [       // ★ 色の組み合わせ（HSB の色相）
  { name: '金と銀', hues: [45, 40, 210, 0], sat: 55, bg: [230, 30, 8] },
  { name: '夕焼け', hues: [10, 30, 330, 280], sat: 75, bg: [260, 40, 10] },
  { name: '海', hues: [180, 200, 220, 160], sat: 70, bg: [220, 60, 8] },
  { name: '和紙', hues: [0, 30, 120, 210], sat: 35, bg: [40, 10, 92] },
];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  art = createGraphics(width, height);
  art.colorMode(HSB, 360, 100, 100, 100);
  clearArt();
}

function clearArt() {
  let b = PALETTES[palIdx].bg;
  art.background(b[0], b[1], b[2]);
  stampCount = 0;
}

function draw() {
  image(art, 0, 0);
  // 描く
  if (mouseIsPressed && mouseY > 80) {
    let sp = dist(mouseX, mouseY, pmouseX, pmouseY);
    if (!last || dist(mouseX, mouseY, last.x, last.y) > 18 + sp) {
      let s = constrain(20 + sp * 3, 20, 220);  // ★ 速いほど大きい
      stamp(mouseX, mouseY, s);
      last = { x: mouseX, y: mouseY };
    }
  }
  // カーソルの見本
  noFill();
  stroke(0, 0, 100, 40);
  circle(mouseX, mouseY, 30);

  // 上の帯
  let isLight = PALETTES[palIdx].bg[2] > 50;
  noStroke();
  fill(0, 0, isLight ? 100 : 0, 60);
  rect(0, 0, width, 80);
  fill(0, 0, isLight ? 10 : 100);
  textSize(18);
  text('ブラシ ' + brush + '：' + ['', '正方形の渦', '対数螺旋', 'ひまわり', '正多角形の星'][brush] + '（1〜4）　n = ' + n + ' φ = ' + nf(metallic(n), 1, 3) + '（←→）　P：' + PALETTES[palIdx].name + '　M：音 ' + (soundOn ? 'ON' : 'off') + '　S：保存　C：消す', 20, 34);
  fill(0, 0, isLight ? 30 : 65);
  textSize(14);
  text(audioCtx ? 'スタンプ ' + stampCount + ' 個。音の高さは φ 倍ずつ（1 オクターブに折りたたみ）' : 'クリックすると音も有効になります', 20, 60);
}

function stamp(x, y, s) {
  let pal = PALETTES[palIdx];
  let phi = metallic(n);
  let hue = pal.hues[stampCount % pal.hues.length];
  let ang = random(TWO_PI);
  art.push();
  art.translate(x, y);
  art.rotate(ang);
  if (brush === 1) {
    // 正方形の渦：01 と同じ分割を小さく
    let w = s, h = s / phi, ox = -w / 2, oy = -h / 2;
    for (let d = 0; d < 8 && min(w, h) > 1.5; d++) {
      let sq = min(w, h);
      for (let j = 0; j < n; j++) {
        art.stroke(hue, pal.sat, 100, 70);
        art.strokeWeight(1);
        art.fill((hue + d * 25) % 360, pal.sat, 90 - d * 6, 45);
        let dir = d % 4;
        if (dir === 0) art.rect(ox + j * sq, oy, sq, sq);
        else if (dir === 1) art.rect(ox, oy + j * sq, sq, sq);
        else if (dir === 2) art.rect(ox + w - (j + 1) * sq, oy, sq, sq);
        else art.rect(ox, oy + h - (j + 1) * sq, sq, sq);
      }
      let dir = d % 4, k = n * sq;
      if (dir === 0) { ox += k; w -= k; } else if (dir === 1) { oy += k; h -= k; } else if (dir === 2) w -= k; else h -= k;
    }
  } else if (brush === 2) {
    // 対数螺旋：90° で φ 倍
    art.noFill();
    art.stroke(hue, pal.sat, 100, 80);
    art.strokeWeight(2);
    art.beginShape();
    for (let t = -12; t <= 0; t += 0.08) {
      let r = s * 0.5 * Math.pow(phi, t * 2 / PI);
      art.vertex(r * cos(t), r * sin(t));
    }
    art.endShape();
  } else if (brush === 3) {
    // ひまわり：360°/φ ずつ回す
    art.noStroke();
    let m = floor(s * 0.8), th = TWO_PI / phi, c = s * 0.5 / sqrt(m);
    for (let i = 1; i <= m; i++) {
      art.fill((hue + i * 0.6) % 360, pal.sat, 100, 70);
      art.circle(c * sqrt(i) * cos(i * th), c * sqrt(i) * sin(i * th), c * 1.1);
    }
  } else {
    // 正多角形の星：n=1 → 五角形の星（対角線/辺 = φ）、n=2 → 八角形の星（1+√2）、n≥3 → 十二角形など（06）
    let m = [5, 8, 12, 10, 12, 14][n - 1], kStep = [2, 3, 5, 3, 5, 5][n - 1];
    art.noFill();
    art.stroke(hue, pal.sat, 100, 80);
    art.strokeWeight(1.5);
    for (let i = 0; i < m; i++) {
      let a = TWO_PI * i / m, b = TWO_PI * (i + kStep) / m;
      art.line(s * 0.5 * cos(a), s * 0.5 * sin(a), s * 0.5 * cos(b), s * 0.5 * sin(b));
    }
  }
  art.pop();
  stampCount++;
  if (soundOn) {
    let r = Math.pow(phi, stampCount % 7);
    while (r >= 2) r /= 2;
    playTone(220 * r * (brush === 3 ? 2 : 1), 0.4, 0.12, brush === 2 ? 'triangle' : 'sine');
  }
}

function mousePressed() { startAudio(); last = null; }

function keyPressed() {
  startAudio();
  if (key >= '1' && key <= '4') brush = int(key);
  if (key === RIGHT_ARROW) n = min(n + 1, 6);
  if (key === LEFT_ARROW) n = max(n - 1, 1);
  if (key === 'p' || key === 'P') { palIdx = (palIdx + 1) % PALETTES.length; clearArt(); }
  if (key === 'm' || key === 'M') soundOn = !soundOn;
  if (key === 'c' || key === 'C') clearArt();
  if (key === 's' || key === 'S') saveCanvas('metallic_brush', 'png');
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  let old = art;
  art = createGraphics(width, height);
  art.colorMode(HSB, 360, 100, 100, 100);
  clearArt();
  art.image(old, 0, 0);
  old.remove();
}

// ---------- やってみよう ----------
// 1. ゆっくり・速くドラッグして大きさのちがうスタンプを重ね、1 枚の絵にしよう
// 2. ブラシ 3 の角度 th を TWO_PI / phi から少しずらすとどうなる？（07 を思い出そう）
// 3. PALETTES に自分の色の組み合わせを足そう
// 4. 5 番目のブラシ（例：10 のフィボナッチ語の帯、11 のタイル 1 枚）を作ってみよう

// ここから下は「音を鳴らすための道具」（Web Audio）
// ==================================================
let audioCtx, masterOut;
function startAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterOut = audioCtx.createDynamicsCompressor();
    masterOut.connect(audioCtx.destination);
  }
  audioCtx.resume();
}
function playTone(f, dur, vol, type) {
  if (!audioCtx) return;
  let t = audioCtx.currentTime;
  let o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = type || 'sine';
  o.frequency.value = constrain(f, 20, 8000);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(constrain(vol, 0.001, 0.5), t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(masterOut);
  o.start(t); o.stop(t + dur + 0.05);
}
function metallic(k) { return (k + Math.sqrt(k * k + 4)) / 2; }
