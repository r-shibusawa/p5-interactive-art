// ============================================
// 12 アトラクター・ブラシ（自由制作のベース）
// 粒たちがアトラクターの式に従って流れ、光の筋を描く
// クリックした場所に粒を放つ。パラメータが変わると流れの形も変わり、音が鳴る
// クリック = 粒を放つ / 1〜4 キー = パラメータを変える / C で消す / S で保存
// ============================================
// ★ のついた数字を変えて、自分だけの流れをつくろう！

let a = -1.4, b = 1.6, c = 1.0, d = 0.7; // ★ アトラクターのパラメータ
let particles = [];
let layer;
let hueBase = 200; // ★ 色

function setup() {
  createCanvas(windowWidth, windowHeight);
  layer = createGraphics(width, height);
  layer.colorMode(HSB, 360, 100, 100, 100);
  layer.background(0, 0, 4);
}

function draw() {
  layer.fill(0, 0, 4, 3); // ★ 残像の消え方（小さいほど長く残る）
  layer.noStroke();
  layer.rect(0, 0, width, height);

  let s = min(width, height) * 0.22;
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    // ★ 式：クリフォード・アトラクター。sin / cos を入れかえると別の流れに
    let nx = sin(a * p.y) + c * cos(a * p.x);
    let ny = sin(b * p.x) + d * cos(b * p.y);
    // いきなり飛ばず、少しずつ目標へ（なめらかな軌跡になる）
    p.x = lerp(p.x, nx, 0.08); // ★ 0.08 = 流れる速さ
    p.y = lerp(p.y, ny, 0.08);
    let sx = width / 2 + p.x * s, sy = height / 2 + p.y * s;
    layer.stroke((hueBase + p.age * 0.5) % 360, 70, 100, 70);
    layer.strokeWeight(2); // ★ 線の太さ
    layer.line(p.px, p.py, sx, sy);
    p.px = sx;
    p.py = sy;
    p.age++;
    if (p.age > 600) particles.splice(i, 1); // ★ 寿命
  }

  image(layer, 0, 0);
  noStroke();
  fill(0, 0, 100);
  textSize(16);
  text('クリックで粒を放つ　1〜4：パラメータ変更　C：消す　S：保存　粒 ' + particles.length + '　a=' + nf(a, 1, 2) + ' b=' + nf(b, 1, 2), 16, 28);
}

function mousePressed() {
  startAudio();
  if (mouseY < 44) return;
  let s = min(width, height) * 0.22;
  for (let i = 0; i < 40; i++) {
    // クリック位置を数学の座標に戻して、少し散らして放つ
    let x = (mouseX - width / 2) / s + random(-0.1, 0.1);
    let y = (mouseY - height / 2) / s + random(-0.1, 0.1);
    particles.push({ x, y, px: mouseX, py: mouseY, age: 0 });
  }
  playNote(random(['C4', 'E4', 'G4', 'B4']), 0.2, 0.6, 'sine');
}

function keyPressed() {
  if (key === '1') a = random(-2, 2);
  if (key === '2') b = random(-2, 2);
  if (key === '3') c = random(-2, 2);
  if (key === '4') d = random(-2, 2);
  if (key >= '1' && key <= '4') {
    hueBase = random(360);
    playNote(random(['C3', 'G3', 'D4']), 0.3, 1.0, 'triangle');
  }
  if (key === 'c' || key === 'C') layer.background(0, 0, 4);
  if (key === 's' || key === 'S') saveCanvas('attractor-brush', 'png');
}

// ---------- 自由制作のアイデア ----------
// ・mouseDragged() でドラッグしながら粒を放つ（筆のように）
// ・11 のマイクと合体：声の大きさで a を変える
// ・04 のローレンツや 06 のスタンダード写像の式に入れかえる
// ・粒の音：p.y の値を音の高さにして、たまに鳴らす


// ==================================================
// ここから下は「音を鳴らすための道具」です
// （中身は読まなくても OK。消さないでね）
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

function playNote(note, volume = 0.3, duration = 0.3, type = 'triangle', when) {
  if (!audioCtx) return;
  let t = when === undefined ? audioCtx.currentTime : when;
  let osc = audioCtx.createOscillator();
  let amp = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = typeof note === 'number' ? note : noteToFreq(note);
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(volume, t + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(amp);
  amp.connect(masterOut);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

function noteToFreq(note) {
  let steps = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  let n = steps[note[0]];
  if (note[1] === '#') n = n + 1;
  if (note[1] === 'b') n = n - 1;
  let octave = parseInt(note.slice(-1));
  return 440 * Math.pow(2, (n + (octave + 1) * 12 - 69) / 12);
}
