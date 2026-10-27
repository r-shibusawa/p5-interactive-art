// ============================================
// 13 オンライン・キャッシング（音つき）
// 手もとの棚（キャッシュ）には k 冊しか置けない。棚にない本を頼まれたら（ミス）、どれかを捨てて取りに行く
// どれを捨てる？ LRU = いちばん長く使っていない本 / FIFO = いちばん古く入れた本 / LFU = 使った回数が少ない本 / マーキング = ランダム
// OPT（ベラディ）= 未来を見て「いちばん先まで使わない本」を捨てる。決定的な方法は最悪 k 倍、マーキングは約 2 ln k 倍
// スペース = 再生・停止 / 1：ランダム 2：局所性 3：k+1 冊を順番に（LRU・FIFO への意地悪）/ 上下 = 棚の大きさ k / 左右 = 音を聞く戦略 / R
// ============================================

let k = 4, pages = 'ABCDEFGHIJ'.split('');
let seq = [], pos = 0, gen = 2;
let lanes = [];
let names = ['LRU', 'FIFO', 'LFU', 'マーキング（乱択）', 'OPT（未来を見る）'];
let hues = [45, 200, 300, 140, 0];
let playing = false, timer = 0, focusLane = 0;
let freqs = [262, 294, 330, 392, 440, 523, 587, 659, 784, 880];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  reset();
}

function makeSeq() {
  seq = [];
  let shift = 0;
  for (let i = 0; i < 600; i++) {
    if (gen === 1) seq.push(floor(random(pages.length)));
    if (gen === 2) { if (i % 40 === 0) shift = floor(random(pages.length)); seq.push(random() < 0.85 ? (shift + floor(random(k))) % pages.length : floor(random(pages.length))); }
    if (gen === 3) seq.push(i % (k + 1));
  }
}

function reset() {
  makeSeq(); pos = 0;
  lanes = names.map(() => ({ cache: [], misses: 0, last: null, meta: {}, marked: new Set() }));
}

function serve(L, idx, x) {
  let c = L.cache;
  let hit = c.includes(x);
  L.meta[x] = L.meta[x] || { used: 0, freq: 0, inAt: 0 };
  if (hit) { L.meta[x].used = pos; L.meta[x].freq++; if (idx === 3) L.marked.add(x); return true; }
  L.misses++;
  if (c.length >= k) {
    let victim;
    if (idx === 0) victim = minBy(c, (p) => L.meta[p].used);
    if (idx === 1) victim = minBy(c, (p) => L.meta[p].inAt);
    if (idx === 2) victim = minBy(c, (p) => L.meta[p].freq * 1e6 + L.meta[p].used);
    if (idx === 3) {
      // マーキング：全部マーク済みなら新しい「フェーズ」。マークのない本からランダムに捨てる
      let un = c.filter((p) => !L.marked.has(p));
      if (!un.length) { L.marked.clear(); un = [...c]; }
      victim = random(un);
    }
    if (idx === 4) {
      // ベラディ：次に使われるのがいちばん先の本（もう使われないなら最優先）
      victim = maxBy(c, (p) => { let nx = seq.indexOf(pages.indexOf(p), pos + 1); return nx < 0 ? Infinity : nx; });
    }
    c.splice(c.indexOf(victim), 1);
  }
  c.push(x);
  L.meta[x] = { used: pos, freq: 1, inAt: pos };
  if (idx === 3) L.marked.add(x);
  return false;
}

function minBy(a, f) { return a.reduce((b, x) => (f(x) < f(b) ? x : b)); }
function maxBy(a, f) { return a.reduce((b, x) => (f(x) > f(b) ? x : b)); }

function tickRequest() {
  if (pos >= seq.length) { playing = false; return; }
  let x = seq[pos];
  lanes.forEach((L, i) => { L.last = serve(L, i, pages[x]) ? 'hit' : 'miss'; });
  // 音：選んだ戦略がヒットなら本の音、ミスなら低い「ドン」
  if (lanes[focusLane].last === 'hit') playNote(freqs[x], 0.25, 0.25, 'triangle');
  else playNote(80, 0.4, 0.25, 'square');
  pos++;
}

function draw() {
  background(15, 20, 9);
  if (playing && ++timer % 8 === 0) tickRequest();
  // 要求の列（OPT だけが先を見られる）
  let cw = 26;
  for (let q = -6; q < 30; q++) {
    let i = pos + q;
    if (i < 0 || i >= seq.length) continue;
    let x = 40 + (q + 6) * cw;
    noStroke(); fill(q < 0 ? color(0, 0, 30) : q === 0 ? color(50, 90, 100) : color(0, 0, 55, 70));
    rect(x, 92, cw - 3, 28, 4);
    fill(0, 0, 10); textAlign(CENTER, CENTER); textSize(14); text(pages[seq[i]], x + cw / 2 - 1, 106);
  }
  fill(0, 0, 60); textSize(12); textAlign(LEFT, BASELINE); text('← 過去　　次の要求　　未来（OPT だけが知っている）→', 40 + 6 * cw, 136);
  let optMiss = max(1, lanes[4].misses);
  lanes.forEach((L, i) => {
    let y = 170 + i * 92;
    noStroke(); fill(hues[i], 60, focusLane === i ? 100 : 75); textAlign(LEFT, CENTER); textSize(focusLane === i ? 19 : 17);
    text((focusLane === i ? '♪ ' : '') + names[i], 40, y + 26);
    for (let s = 0; s < k; s++) {
      let p = L.cache[s];
      let x = 280 + s * 62;
      fill(p ? color(hues[i], 40, i === 3 && L.marked.has(p) ? 70 : 40) : color(0, 0, 15));
      rect(x, y, 54, 52, 8);
      if (p) { fill(0, 0, 95); textAlign(CENTER, CENTER); textSize(22); text(p, x + 27, y + 26); }
    }
    let bx = 280 + k * 62 + 30;
    fill(L.last === 'hit' ? color(140, 70, 90) : L.last === 'miss' ? color(0, 80, 95) : color(0, 0, 25));
    circle(bx, y + 26, 20);
    fill(0, 0, 95); textAlign(LEFT, CENTER); textSize(17);
    text('ミス ' + L.misses + (pos ? '　率 ' + nf((100 * L.misses) / pos, 1, 1) + '%' : '') + (i < 4 ? '　OPT の ' + nf(L.misses / optMiss, 1, 2) + ' 倍' : ''), bx + 30, y + 26);
  });
  fill(0, 0, 100); textSize(18); textAlign(LEFT, BASELINE);
  text('スペース：' + (playing ? '停止' : '再生') + '　1：ランダム　2：局所性　3：k+1 冊を順番に　上下：棚 k = ' + k + '　左右：音を聞く戦略　R', 20, 36);
  textSize(15); fill(0, 0, 65);
  text('ヒット = 本の音、ミス = 低い音。要求 ' + pos + ' / ' + seq.length, 20, 62);
  fill(45, 80, 100); textSize(16);
  text(gen === 3 ? '3：LRU と FIFO は毎回ミス（捨てた本をすぐ頼まれる）。OPT は k 回に 1 回だけ → ちょうど k 倍。マーキングは運しだいで強い' : '決定的な方法（LRU・FIFO）はどれも最悪 k 倍。乱択にすると、相手が「次に捨てる本」を予想できなくなる', 20, height - 28);
}

function keyPressed() {
  startAudio();
  if (key === ' ') playing = !playing;
  if (key >= '1' && key <= '3') { gen = int(key); reset(); }
  if (key === UP_ARROW) { k = min(8, k + 1); reset(); }
  if (key === DOWN_ARROW) { k = max(2, k - 1); reset(); }
  if (key === RIGHT_ARROW) focusLane = (focusLane + 1) % 5;
  if (key === LEFT_ARROW) focusLane = (focusLane + 4) % 5;
  if (key === 'r' || key === 'R') reset();
}
function mousePressed() { startAudio(); }

// ---------- やってみよう ----------
// 1. 3 を選んで、LRU と OPT のミスの比が k になるのを確かめる
// 2. 2（局所性）では LRU が OPT にかなり近い。ふつうの CPU キャッシュが LRU 風なのはなぜ？
// 3. 左右で音を聞く戦略を変えて、ミスの「リズム」を聞き比べる


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
