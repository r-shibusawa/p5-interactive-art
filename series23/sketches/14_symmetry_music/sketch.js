// ============================================
// 14 対称性の音楽（自由制作のベース）
// メロディに群の元を作用させる：移調 Tₖ（時計を k 回す = Z₁₂）、反行 I（時計を裏返す）、逆行 R（時間を逆に）
//   {原形 P, 逆行 R, 反行 I, 反行の逆行 RI} はクラインの四元群。12 音技法（シェーンベルク）やバッハのカノンで使われる
// 下のマス目をクリック = メロディを書く / 1 = P、2 = R、3 = I、4 = RI / ←→ = 移調 k / スペース = 再生・停止 / X = ランダム
// ============================================

let melody = [0, 4, 7, 11, 9, 5, 2, 7];   // ★ 最初のメロディ（0 = ド、1 = ド#、… 11 = シ）
let form = 'P';          // P / R / I / RI
let T = 0;               // 移調（半音）
let playing = false;
let stepIdx = -1, nextTime = 0;
let bpm = 140;           // ★ 速さ
let base = 60;           // ★ ド の MIDI 番号（60 = 真ん中のド）
const NOTE_NAMES = ['ド', 'ド#', 'レ', 'レ#', 'ミ', 'ファ', 'ファ#', 'ソ', 'ソ#', 'ラ', 'ラ#', 'シ'];
const FORMS = ['P', 'R', 'I', 'RI'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

// 群の作用：反行は最初の音を軸に裏返す、逆行は順番を逆に、最後に移調
function transformed() {
  let m = melody.slice();
  if (form === 'I' || form === 'RI') m = m.map((p) => (2 * melody[0] - p + 120) % 12);
  if (form === 'R' || form === 'RI') m.reverse();
  return m.map((p) => (p + T) % 12);
}

function draw() {
  background(250, 20, 12);
  let tm = transformed();
  // 再生
  if (playing && audioCtx && audioCtx.currentTime >= nextTime - 0.05) {
    stepIdx = (stepIdx + 1) % tm.length;
    playNote(base + tm[stepIdx], 60 / bpm * 0.9);
    nextTime = Math.max(nextTime, audioCtx.currentTime) + 60 / bpm;
  }

  // 時計（12 音）：もとのメロディ（うすい）と変換後を多角形で
  let cx = width * 0.27, cy = height * 0.43, R = min(width * 0.18, height * 0.24);
  noFill(); stroke(0, 0, 100, 20); strokeWeight(2); circle(cx, cy, R * 2);
  if (form === 'I' || form === 'RI') {   // 反行の鏡の軸
    let a = -HALF_PI + ((melody[0] + T) * TWO_PI) / 12;
    stroke(50, 80, 100, 50); drawingContext.setLineDash([6, 6]);
    line(cx - cos(a) * R * 1.2, cy - sin(a) * R * 1.2, cx + cos(a) * R * 1.2, cy + sin(a) * R * 1.2);
    drawingContext.setLineDash([]);
  }
  polyline(melody, cx, cy, R, color(0, 0, 100, 25));
  polyline(tm, cx, cy, R, color(190, 70, 100, 90));
  for (let p = 0; p < 12; p++) {
    let a = -HALF_PI + (p * TWO_PI) / 12, x = cx + cos(a) * R, y = cy + sin(a) * R;
    let on = playing && tm[stepIdx] === p;
    noStroke(); fill((p * 30) % 360, 60, on ? 100 : 70);
    circle(x, y, on ? 44 : 30);
    fill(0, 0, 100); textAlign(CENTER, CENTER); textSize(12);
    text(NOTE_NAMES[p], x + cos(a) * 34, y + sin(a) * 34);
  }
  textAlign(LEFT, BASELINE);

  // ピアノロール（下）：8 ステップ × 12 音。もとのメロディを書く
  let gx = 30, gy = height * 0.74, gw = width * 0.5, gh = height * 0.22;
  let cw = gw / melody.length, ch = gh / 12;
  for (let s = 0; s < melody.length; s++) for (let p = 0; p < 12; p++) {
    let x = gx + s * cw, y = gy + (11 - p) * ch;
    stroke(0, 0, 100, 10); fill(0, 0, 100, (p === melody[s]) ? 70 : 4);
    rect(x, y, cw, ch);
  }
  noStroke(); fill(0, 0, 80); textSize(13);
  text('メロディを書く（クリック）', gx, gy - 8);
  // 変換後のロール（右）
  let rx = width * 0.58;
  for (let s = 0; s < tm.length; s++) {
    let x = rx + s * cw * 0.8, y = gy + (11 - tm[s]) * ch;
    noStroke(); fill((tm[s] * 30) % 360, 60, s === stepIdx && playing ? 100 : 75);
    rect(x, y, cw * 0.8 - 2, ch, 3);
  }
  fill(0, 0, 80); textSize(13);
  text('聴こえるメロディ：' + form + (T ? ' → T' + T : ''), rx, gy - 8);

  // クラインの四元群の表
  let tx = width * 0.6, ty = 130, c = 56;
  fill(0, 0, 100); textSize(16);
  text('クラインの四元群 {P, R, I, RI}（「行をしてから列」）', tx, ty - 20);
  for (let i = -1; i < 4; i++) for (let j = -1; j < 4; j++) {
    if (i < 0 && j < 0) continue;
    let x = tx + (j + 1) * c, y = ty + (i + 1) * c * 0.7;
    let lab = i < 0 ? FORMS[j] : j < 0 ? FORMS[i] : FORMS[i ^ j];
    fill(i < 0 || j < 0 ? color(0, 0, 30) : color((FORMS.indexOf(lab) * 90 + 20) % 360, 50, lab === form ? 95 : 55));
    rect(x, y, c - 4, c * 0.7 - 4, 4);
    fill(0, 0, 100); textAlign(CENTER, CENTER); textSize(16);
    text(lab, x + c / 2 - 2, y + c * 0.35 - 2);
    textAlign(LEFT, BASELINE);
  }
  fill(0, 0, 75); textSize(14);
  text('どれも 2 回で元にもどる（a·a = P）。R·I = I·R = RI（可換）', tx, ty + c * 3.8);
  text('移調 T と反行 I = 時計の回転と鏡映 → 二面体群 D₁₂（24 個）', tx, ty + c * 3.8 + 22);
  text('逆行 R も入れると 48 個の元の群になる', tx, ty + c * 3.8 + 44);
  fill(0, 0, 100); textSize(18);
  text('音：' + tm.map((p) => NOTE_NAMES[p]).join(' '), tx, ty + c * 3.8 + 84);

  fill(0, 0, 100); textSize(18);
  text('クリック：メロディを書く　1：P　2：R　3：I　4：RI　←→：移調 T = ' + T + '　スペース：' + (playing ? '停止' : '再生') + '　X：ランダム', 20, 36);
  fill(0, 0, 65); textSize(15);
  text('移調 = 時計の多角形を回す、反行 = 鏡に映す、逆行 = 時間を逆にたどる。形（多角形）は同じまま', 20, 62);
}

function polyline(m, cx, cy, R, c) {
  noFill(); stroke(c); strokeWeight(3);
  beginShape();
  for (let p of m) { let a = -HALF_PI + (p * TWO_PI) / 12; vertex(cx + cos(a) * R * 0.92, cy + sin(a) * R * 0.92); }
  endShape();
}

function mousePressed() {
  startAudio();
  let gx = 30, gy = height * 0.74, gw = width * 0.5, gh = height * 0.22;
  let s = floor((mouseX - gx) / (gw / melody.length)), p = 11 - floor((mouseY - gy) / (gh / 12));
  if (s >= 0 && s < melody.length && p >= 0 && p < 12) { melody[s] = p; playNote(base + p, 0.25); }
}

function keyPressed() {
  startAudio();
  if (key >= '1' && key <= '4' && key.length === 1) form = FORMS[+key - 1];
  if (key === RIGHT_ARROW) T = (T + 1) % 12;
  if (key === LEFT_ARROW) T = (T + 11) % 12;
  if (key === ' ') { playing = !playing; stepIdx = -1; nextTime = audioCtx ? audioCtx.currentTime : 0; }
  if (key === 'x' || key === 'X') melody = melody.map(() => floor(Math.random() * 12));
  return false;
}

// ---------- やってみよう ----------
// 1. 1〜4 を切りかえて、時計の多角形がどう動くか見よう。I は鏡映、T は回転
// 2. R を 2 回、I を 2 回 → 原形 P。R → I と I → R が同じ RI になるのを表で確かめよう
// 3. ド・ミ・ソ（0, 4, 7）を I にすると長調が短調の形に。耳で聴き比べよう
// 4. 12 音を 1 回ずつ使う「音列」を melody にすると 12 音技法。P・R・I・RI × 移調 12 = 48 通り
// 5. 2 つのメロディ（P と T₇ など）を同時に鳴らしてカノンを作ろう。作品のベースに


// ==================================================
// ここから下は「音を鳴らすための道具」
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
// MIDI 番号 midi の音を dur 秒鳴らす（三角波 + 少しの倍音）
function playNote(midi, dur) {
  if (!audioCtx) return;
  let f = 440 * Math.pow(2, (midi - 69) / 12);
  let t = audioCtx.currentTime;
  for (let [mul, type, vol] of [[1, 'triangle', 0.25], [2, 'sine', 0.06]]) {
    let o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = type; o.frequency.value = f * mul;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.05, dur));
    o.connect(g); g.connect(masterOut);
    o.start(t); o.stop(t + dur + 0.05);
  }
}
