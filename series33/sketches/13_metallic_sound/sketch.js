// ============================================
// 13 貴金属比の音 ─ 黄金比の音階とフィボナッチのリズム
// 上：周波数を φn 倍ずつ重ね、1 オクターブ（2 倍）の中に折りたたんだ音階。下の段はふつうの純正律（簡単な分数）
// 下：10 のフィボナッチ語 ABAABABA… をリズムにして鳴らす（A = 長い・低い、B = 短い・高い）
// 鍵盤をクリック = 鳴らす / スペース = リズム再生 / ←→ = n / ↑↓ = テンポ / D = 長さの比 φ:1 ⇔ 等間隔
// ============================================

let n = 1;               // ★ 貴金属比の n
let base = 220;          // ★ いちばん低い音（Hz）
let bpm = 150;           // ★ テンポ
let playing = false;
let equalBeat = false;   // D：A と B を同じ長さにする
let word = '';
let pos = 0;             // いま鳴らしている文字の位置
let nextTime = 0;        // 次の音を鳴らす時刻（audioCtx の時間）
let flash = [];          // 鍵盤の光
let goldScale = [], justScale = [];

const JUST = [[1, 1], [9, 8], [5, 4], [4, 3], [3, 2], [5, 3], [15, 8], [2, 1]];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  rebuild();
}

function rebuild() {
  let phi = metallic(n);
  // φ^k を [1, 2) に折りたたむ（7 音）
  goldScale = [];
  for (let k = 0; k < 7; k++) {
    let r = Math.pow(phi, k);
    while (r >= 2) r /= 2;
    goldScale.push(r);
  }
  goldScale.sort((a, b) => a - b);
  goldScale.push(2);
  justScale = JUST.map(f => f[0] / f[1]);
  // 置換で語をつくる
  let w = 'A', rule = 'A'.repeat(n) + 'B';
  while (w.length < 200) { let o = ''; for (let ch of w) o += ch === 'A' ? rule : 'A'; w = o; }
  word = w.slice(0, 200);
  pos = 0;
}

function keyRects() {
  let kw = min(110, (width - 80) / 8), out = [];
  for (let row = 0; row < 2; row++) for (let i = 0; i < 8; i++) out.push({ row, i, x: 40 + i * kw, y: 120 + row * 150, w: kw - 8, h: 120 });
  return out;
}

function draw() {
  background(275, 30, 10);
  scheduleRhythm();

  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text('鍵盤をクリック　スペース：リズム ' + (playing ? '再生中' : '停止') + '　n = ' + n + '（←→）　テンポ ' + bpm + '（↑↓）　D：' + (equalBeat ? '等間隔' : '長さ A:B = φ:1'), 20, 40);
  fill(0, 0, 65);
  textSize(15);
  text(audioCtx ? '上段：φ' + n + ' 倍ずつの音を 1 オクターブに折りたたむ。下段：純正律（3/2 や 5/4 など簡単な分数 → 濁らない）' : 'まずキャンバスをクリックして音を有効にしよう', 20, 68);

  // 鍵盤
  for (let k of keyRects()) {
    let r = k.row === 0 ? goldScale[k.i] : justScale[k.i];
    let lit = flash[k.row * 8 + k.i] || 0;
    fill(k.row === 0 ? 45 : 200, 60 - lit * 40, 50 + lit * 50);
    rect(k.x, k.y, k.w, k.h, 8);
    fill(0, 0, 100);
    textSize(14);
    text(nf(r, 1, 3), k.x + 8, k.y + 24);
    textSize(12);
    fill(0, 0, 85);
    text(nf(base * r, 1, 0) + ' Hz', k.x + 8, k.y + 44);
    text(nf(1200 * Math.log2(r), 1, 0) + ' セント', k.x + 8, k.y + 62);
    if (k.row === 1) text(JUST[k.i][0] + '/' + JUST[k.i][1], k.x + 8, k.y + 80);
    flash[k.row * 8 + k.i] = lit * 0.92;
  }
  fill(0, 0, 70);
  textSize(13);
  text('黄金比の音程 φ = 1.618 = 833 セントは、純正律の 8/5（短 6 度 814 セント）と 5/3（長 6 度 884 セント）のあいだ。うなりを聴きくらべよう', 40, 420);

  // リズムの帯
  let ty = 460, tw = width - 80, phi = metallic(n);
  let shown = min(word.length, 60);
  let total = 0;
  for (let i = 0; i < shown; i++) total += durOf(word[i]);
  let x = 40;
  for (let i = 0; i < shown; i++) {
    let L = durOf(word[i]) / total * tw;
    let cur = playing && i === (pos + word.length - 1) % word.length % shown;
    fill(word[i] === 'A' ? color(45, 70, cur ? 100 : 70) : color(200, 70, cur ? 100 : 70));
    rect(x, ty + (cur ? -8 : 0), L - 2, 50 + (cur ? 16 : 0), 4);
    fill(0, 0, 10);
    textSize(12);
    if (L > 14) text(word[i], x + L / 2 - 4, ty + 30);
    x += L;
  }
  fill(0, 0, 70);
  textSize(13);
  text('フィボナッチ語のリズム（10 の置換 A → ' + 'A'.repeat(n) + 'B, B → A）。くり返さないのに規則的に聴こえる', 40, ty + 84);
  text('A の音は上段の音階を順に、B は 2 オクターブ上の短い音。A の数 / B の数 → φ' + n + ' = ' + nf(phi, 1, 4), 40, ty + 104);
}

function durOf(ch) { return equalBeat ? 1 : (ch === 'A' ? metallic(n) : 1); }

// 先読みで音を予約する（draw のたびに 0.1 秒先まで）
let aIdx = 0;
function scheduleRhythm() {
  if (!playing || !audioCtx) return;
  let unit = 60 / bpm / (equalBeat ? 1 : metallic(n) * 0.6);
  if (nextTime < audioCtx.currentTime - 0.2) nextTime = audioCtx.currentTime; // 遅れたら追いつかせない
  while (nextTime < audioCtx.currentTime + 0.1) {
    let ch = word[pos];
    if (ch === 'A') {
      let r = goldScale[aIdx % 7]; aIdx++;
      playTone(base * r, unit * durOf(ch) * 0.9, 0.22, 'triangle', nextTime);
      kick(nextTime);
    } else {
      playTone(base * 4 * goldScale[(aIdx + 3) % 7], unit * 0.5, 0.12, 'sine', nextTime);
    }
    nextTime += unit * durOf(ch);
    pos = (pos + 1) % word.length;
  }
}

function mousePressed() {
  startAudio();
  for (let k of keyRects()) {
    if (mouseX > k.x && mouseX < k.x + k.w && mouseY > k.y && mouseY < k.y + k.h) {
      let r = k.row === 0 ? goldScale[k.i] : justScale[k.i];
      // 根音と同時に鳴らして「和音」として聴く
      playTone(base, 1.2, 0.15, 'sine', 0);
      playTone(base * r, 1.2, 0.15, 'sine', 0);
      flash[k.row * 8 + k.i] = 1;
    }
  }
}

function keyPressed() {
  startAudio();
  if (key === ' ') { playing = !playing; if (audioCtx) nextTime = audioCtx.currentTime + 0.05; }
  if (key === RIGHT_ARROW) { n = min(n + 1, 4); rebuild(); }
  if (key === LEFT_ARROW) { n = max(n - 1, 1); rebuild(); }
  if (key === UP_ARROW) bpm = min(300, bpm + 10);
  if (key === DOWN_ARROW) bpm = max(60, bpm - 10);
  if (key === 'd' || key === 'D') equalBeat = !equalBeat;
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. 上段の 1.618 と下段の 8/5 = 1.6、5/3 = 1.667 を順に鳴らしてうなりを比べよう
// 2. D で等間隔にすると、リズムは「音の高さ」の並びだけになる。どちらが好き？
// 3. base を 110 や 330 に変えて雰囲気を変えよう
// 4. B のとき kick の代わりにノイズ（シャカッ）を鳴らすように改造してみよう

function metallic(k) { return (k + Math.sqrt(k * k + 4)) / 2; }

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
// 周波数 f の音を dur 秒。when = 鳴らす時刻（0 なら今すぐ）
function playTone(f, dur, vol, type, when) {
  if (!audioCtx) return;
  let t = Math.max(when || 0, audioCtx.currentTime);
  let o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = type || 'sine';
  o.frequency.value = constrain(f, 20, 8000);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(constrain(vol, 0.001, 0.5), t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.05, dur));
  o.connect(g); g.connect(masterOut);
  o.start(t); o.stop(t + Math.max(0.05, dur) + 0.05);
}
// 低い「ドン」
function kick(when) {
  if (!audioCtx) return;
  let t = Math.max(when || 0, audioCtx.currentTime);
  let o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.frequency.setValueAtTime(140, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.15);
  g.gain.setValueAtTime(0.35, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  o.connect(g); g.connect(masterOut);
  o.start(t); o.stop(t + 0.25);
}
