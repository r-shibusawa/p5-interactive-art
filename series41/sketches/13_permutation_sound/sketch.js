// ============================================
// 13 順列を聴く（チェンジリンギング）
// 音階 n 音の順列をすべて順番に鳴らす。イギリスの教会の鐘「チェンジリンギング」は、
// 隣どうしの入れかえだけで n! 通りの並び（チェンジ）を全部鳴らす数学的な音楽
// 転倒数（並びの「乱れ」の数）が多いほど音色がざらつく
// クリック = 開始／停止 / ↑↓ = 音の数 n（3〜6）/ M = 隣の入れかえ（SJT）と辞書順を切り替え / マウス左右 = 速さ
// ============================================

let n = 4;                    // ★ 音の数
let rowsAll = [];             // すべての順列（鳴らす順）
let useSJT = true;            // true: 隣どうしの入れかえだけ（Steinhaus–Johnson–Trotter）
let rowIdx = 0, noteIdx = 0;  // いま鳴らしている行と音
let playing = false;
let timer = 0;
let scaleHz = [261.6, 293.7, 329.6, 392.0, 440.0, 523.3];   // ★ ドレミソラド（ペンタトニック）

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  rebuild();
}

function rebuild() {
  rowsAll = useSJT ? sjtPermutations(n) : lexPermutations(n);
  rowIdx = 0; noteIdx = 0; timer = 0;
}

// ★ SJT：いちばん大きな「動ける」数を、その向きに 1 つ動かす（隣との入れかえだけ）
function sjtPermutations(k) {
  let p = [], dir = [];
  for (let i = 0; i < k; i++) { p.push(i); dir.push(-1); }
  let out = [p.slice()];
  while (true) {
    let mob = -1;
    for (let i = 0; i < k; i++) {
      let j = i + dir[i];
      if (j >= 0 && j < k && p[j] < p[i] && (mob < 0 || p[i] > p[mob])) mob = i;
    }
    if (mob < 0) break;
    let j = mob + dir[mob];
    [p[mob], p[j]] = [p[j], p[mob]];
    [dir[mob], dir[j]] = [dir[j], dir[mob]];
    for (let i = 0; i < k; i++) if (p[i] > p[j]) dir[i] = -dir[i];
    out.push(p.slice());
  }
  return out;
}
function lexPermutations(k) {
  let p = [];
  for (let i = 0; i < k; i++) p.push(i);
  let out = [p.slice()];
  while (true) {
    let i = k - 2;
    while (i >= 0 && p[i] > p[i + 1]) i--;
    if (i < 0) break;
    let j = k - 1;
    while (p[j] < p[i]) j--;
    [p[i], p[j]] = [p[j], p[i]];
    let a = i + 1, b = k - 1;
    while (a < b) { [p[a], p[b]] = [p[b], p[a]]; a++; b--; }
    out.push(p.slice());
  }
  return out;
}
// 転倒数：i < j なのに p[i] > p[j] のペアの数
function inversions(p) { let c = 0; for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) if (p[i] > p[j]) c++; return c; }

function draw() {
  background(230, 28, 11);
  let speed = map(mouseX, 0, width, 3, 14, true);   // 1 秒あたりの音の数
  let row = rowsAll[rowIdx];
  let inv = inversions(row);
  if (playing) {
    timer += deltaTime / 1000;
    if (timer >= 1 / speed) {
      timer = 0;
      // ★ 転倒数で音色：乱れが多いほどフィルタを開いて明るく（ざらつく）
      let cutoff = 500 + inv * 500;
      playNote(scaleHz[row[noteIdx]], 0.9 / speed + 0.1, cutoff, inv > n ? 'sawtooth' : 'triangle');
      noteIdx++;
      if (noteIdx >= n) { noteIdx = 0; rowIdx = (rowIdx + 1) % rowsAll.length; }
    }
  }

  // 青い線の図（各音がどの位置にいるかを行ごとにたどる）：いまの行のまわりを表示
  let lx = 60, cellW = 48, rowH = 22;
  let visible = Math.floor((height - 200) / rowH);
  let first = Math.max(0, Math.min(rowIdx - Math.floor(visible / 2), rowsAll.length - visible));
  for (let r = first; r < Math.min(rowsAll.length, first + visible); r++) {
    let y = 140 + (r - first) * rowH;
    if (r === rowIdx) { noStroke(); fill(0, 0, 100, 10); rect(lx - 30, y - rowH / 2, n * cellW + 80, rowH); }
    noStroke(); fill(0, 0, 50); textAlign(RIGHT, CENTER); textSize(11); text(r + 1, lx - 10, y);
    for (let i = 0; i < n; i++) {
      let v = rowsAll[r][i];
      let cur = r === rowIdx && i === noteIdx;
      fill((v * 300) / n + 20, 70, cur ? 100 : 80);
      textAlign(CENTER, CENTER); textSize(cur ? 18 : 14);
      text(v + 1, lx + i * cellW, y);
      // 次の行へ線
      if (r + 1 < rowsAll.length && r + 1 < first + visible) {
        let ni = rowsAll[r + 1].indexOf(v);
        stroke((v * 300) / n + 20, 70, 70, 60); strokeWeight(v === 0 ? 3 : 1);
        line(lx + i * cellW, y + 9, lx + ni * cellW, y + rowH - 9);
        noStroke();
      }
    }
  }
  textAlign(LEFT, BASELINE);

  // 右：いまの行を大きく、転倒数
  let px = width * 0.5, py = 160;
  noStroke(); fill(0, 0, 100); textSize(20);
  text('行 ' + (rowIdx + 1) + ' / ' + rowsAll.length + '（' + n + '! = ' + rowsAll.length + '）', px, py);
  for (let i = 0; i < n; i++) {
    let v = row[i], cur = i === noteIdx && playing;
    fill((v * 300) / n + 20, 70, 95);
    let h = 30 + v * 25;
    rect(px + i * 70, py + 160 - h, 56, h, 6);
    if (cur) { fill(0, 0, 100, 40); rect(px + i * 70 - 4, py + 160 - h - 4, 64, h + 8, 8); }
    fill(0, 0, 10); textSize(18); textAlign(CENTER, BASELINE); text(['ド', 'レ', 'ミ', 'ソ', 'ラ', 'ド'][v], px + i * 70 + 28, py + 150);
  }
  textAlign(LEFT, BASELINE);
  fill(50, 80, 100); textSize(18);
  text('転倒数 ' + inv + ' / ' + (n * (n - 1)) / 2 + '　（音色：' + (inv > n ? 'のこぎり波' : '三角波') + '、フィルタ ' + (500 + inv * 500) + ' Hz）', px, py + 200);
  fill(0, 0, 70); textSize(14);
  text('転倒数 = 「前の音の方が高い」ペアの数。0 なら上り音階、最大 n(n−1)/2 なら下り音階', px, py + 226);
  text(useSJT ? 'SJT（プレイン・チェンジ）：隣の 2 音だけ入れかわる → 鐘を鳴らす人が無理なく順番を変えられる' : '辞書順：並びはきれいだが、遠くの音が一度に入れかわる', px, py + 250);
  text('チェンジリンギングでは n = 6（720 行）で 30 分、n = 8（40320 行）で 20 時間かかる', px, py + 274);

  fill(0, 0, 100); textSize(18);
  text((playing ? '再生中（クリックで停止）' : 'クリックで再生') + '　n = ' + n + '（↑↓）　M：' + (useSJT ? '隣の入れかえ（SJT）' : '辞書順') + '　マウス左右：速さ', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('n! 通りの並びを 1 回ずつ全部鳴らす。左の図は各音の「道」（色の線）。隣の入れかえだけなら線がなめらかに編まれる', 20, 68);
}

function mousePressed() {
  startAudio();
  playing = !playing;
}

function keyPressed() {
  if (key === UP_ARROW && n < 6) { n++; rebuild(); }
  if (key === DOWN_ARROW && n > 3) { n--; rebuild(); }
  if (key === 'm' || key === 'M') { useSJT = !useSJT; rebuild(); }
}

// ---------- やってみよう ----------
// 1. n = 3 の 6 行を聴いて、SJT と辞書順のちがいを耳で感じよう（SJT は 1 音ずつしか変わらない）
// 2. scaleHz を長調の 7 音や、好きな和音の構成音に変えてみよう
// 3. 転倒数で音の長さや音量を変えると、乱れの「波」が聞こえる。playNote の引数を書きかえよう
// 4. 行ごとに「最初の音だけ」鳴らすと、n = 4 で 24 音のメロディになる。どんな旋律？

// ==================================================
// ここから下は「音を鳴らすための道具」（短い音を 1 つ鳴らす）
// ==================================================
let audioCtx, masterOut;
function startAudio() {
  if (!audioCtx) { audioCtx = new AudioContext(); masterOut = audioCtx.createDynamicsCompressor(); masterOut.connect(audioCtx.destination); }
  audioCtx.resume();
}
function playNote(freq, dur, cutoff, type) {
  if (!audioCtx) return;
  let t0 = audioCtx.currentTime;
  let o = audioCtx.createOscillator(), g = audioCtx.createGain(), f = audioCtx.createBiquadFilter();
  o.type = type; o.frequency.value = freq;
  f.type = 'lowpass'; f.frequency.value = cutoff; f.Q.value = 2;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(f); f.connect(g); g.connect(masterOut);
  o.start(t0); o.stop(t0 + dur + 0.05);
}
