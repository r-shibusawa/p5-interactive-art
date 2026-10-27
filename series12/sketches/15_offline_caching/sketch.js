// ============================================
// 15 オフライン・キャッシング：未来がわかるなら、どれを捨てる？
// キャッシュ（小さくて速い置き場）は k 個しか入らない。いっぱいのとき何を追い出すかで「ミス」の回数が変わる
// 未来の要求が全部わかっているなら「いちばん先まで使わないもの」を捨てる貪欲法が最適（Belady のアルゴリズム）
// スペース = 再生・停止 / → = 1 手 / ↑↓ = キャッシュの大きさ k / 1〜3 = お手本 / R = ランダムな要求列
// ============================================

let requests = 'adbcaebdfacbgdaecbad'.split('');  // ★ 要求の並び
let k = 3;                                        // ★ キャッシュに入る個数
let framesPerMove = 28;

let t = 0, playing = true, timer = 0, sims = [];
const POL = [
  { name: 'FIFO（先に入れたものから）', col: '#c792ff' },
  { name: 'LRU（いちばん昔に使ったもの）', col: '#5ee6e0' },
  { name: 'Belady（いちばん先まで使わないもの）', col: '#a3e635' },
];

const BG = '#16111c', PANEL = '#231a2b', FG = '#f3eaf0', MUTED = '#9a8aa3';
const RASP = '#ff6b8b', CYAN = '#5ee6e0', AMBER = '#ffc857', LIME = '#a3e635';

function setup() {
  createCanvas(windowWidth, windowHeight);
  simulate();
}

// 3 つの方針で最後まで計算しておき、t まで表示する
function simulate() {
  sims = [];
  for (let p = 0; p < 3; p++) {
    let cache = [], inTime = {}, lastUse = {}, cols = [], misses = 0;
    for (let i = 0; i < requests.length; i++) {
      let r = requests[i], hit = cache.includes(r), evicted = null;
      if (!hit) {
        misses++;
        if (cache.length >= k) {
          let victim;
          if (p === 0) victim = cache.reduce((a, b) => inTime[a] <= inTime[b] ? a : b);
          if (p === 1) victim = cache.reduce((a, b) => lastUse[a] <= lastUse[b] ? a : b);
          if (p === 2) victim = cache.reduce((a, b) => nextUse(a, i) >= nextUse(b, i) ? a : b);
          evicted = victim;
          cache[cache.indexOf(victim)] = r;
        } else cache.push(r);
        inTime[r] = i;
      }
      lastUse[r] = i;
      cols.push({ cache: [...cache], hit, evicted, slot: cache.indexOf(r), misses });
    }
    sims.push(cols);
  }
}

function nextUse(b, i) {
  for (let j = i + 1; j < requests.length; j++) if (requests[j] === b) return j;
  return Infinity;
}

function draw() {
  background(BG);
  if (playing && t < requests.length && ++timer >= framesPerMove) { timer = 0; t++; }

  noStroke(); fill(FG); textAlign(LEFT, TOP); textSize(26);
  text(`キャッシュの追い出し方：k = ${k}`, 32, 24);
  fill(MUTED); textSize(15);
  text('スペース 再生・停止　→ 1 手　↑↓ k　1〜3 お手本　R ランダム', 32, 60);

  let n = requests.length;
  let cw = min(46, (width - 380) / n);
  let x0 = 340;
  // 要求列
  for (let i = 0; i < n; i++) {
    let x = x0 + i * cw;
    fill(i === t - 1 ? AMBER : i < t ? FG : MUTED);
    textAlign(CENTER, CENTER); textSize(min(20, cw * 0.55));
    text(requests[i], x + cw / 2, 108);
  }
  fill(MUTED); textAlign(RIGHT, CENTER); textSize(14); text('要求 →', x0 - 10, 108);

  let blockH = min(34, (height - 220) / (3 * (k + 1.6)));
  let y = 140;
  for (let p = 0; p < 3; p++) {
    let cols = sims[p];
    fill(POL[p].col); textAlign(LEFT, TOP); textSize(16);
    text(POL[p].name, 32, y + 4);
    let miss = t > 0 ? cols[t - 1].misses : 0;
    fill(FG); textSize(22); text(`ミス ${miss}`, 32, y + 30);
    if (t >= n) {
      let best = sims[2][n - 1].misses;
      fill(MUTED); textSize(13); text(p === 2 ? '← これが最小' : `最小より +${cols[n - 1].misses - best}`, 32, y + 60);
    }
    for (let s = 0; s < k; s++) {
      for (let i = 0; i < n; i++) {
        let x = x0 + i * cw, yy = y + s * blockH;
        let c = i < t ? cols[i] : null;
        fill(PANEL); rect(x + 1, yy + 1, cw - 2, blockH - 2, 4);
        if (c && c.cache[s] !== undefined) {
          let isReq = c.slot === s;
          fill(isReq ? (c.hit ? POL[p].col : RASP) : '#3b2f47');
          rect(x + 2, yy + 2, cw - 4, blockH - 4, 4);
          fill(isReq ? BG : FG); textAlign(CENTER, CENTER); textSize(min(16, blockH * 0.5));
          text(c.cache[s], x + cw / 2, yy + blockH / 2);
        }
      }
    }
    // ミスの印
    for (let i = 0; i < t; i++) {
      let c = cols[i];
      if (!c.hit) { fill(RASP); circle(x0 + i * cw + cw / 2, y + k * blockH + 8, 7); }
      if (c.evicted) { fill(MUTED); textSize(10); textAlign(CENTER, TOP); text(`✕${c.evicted}`, x0 + i * cw + cw / 2, y + k * blockH + 14); }
    }
    y += (k + 1.6) * blockH + 10;
  }

  // Belady の判断理由
  if (t > 0 && t <= n && sims[2][t - 1].evicted) {
    let i = t - 1, prev = i > 0 ? sims[2][i - 1].cache : [];
    let txt = prev.map(b => `${b}：次は ${nextUse(b, i) === Infinity ? 'もう使わない' : (nextUse(b, i) - i) + ' 手後'}`).join('　');
    fill(LIME); textAlign(LEFT, TOP); textSize(14);
    text(`Belady が ${sims[2][i].evicted} を捨てた理由　${txt}`, 32, height - 36);
  }
}

function keyPressed() {
  if (key === ' ') playing = !playing;
  if (key === RIGHT_ARROW) t = min(requests.length, t + 1);
  if (key === UP_ARROW) { k = min(6, k + 1); simulate(); t = 0; }
  if (key === DOWN_ARROW) { k = max(1, k - 1); simulate(); t = 0; }
  if (key === '1') { requests = 'adbcaebdfacbgdaecbad'.split(''); }
  if (key === '2') { requests = 'abcdabcdabcdabcd'.split(''); }    // LRU と FIFO が毎回ミスする意地悪な列（k = 3）
  if (key === '3') { requests = 'aabacadaeafagaha'.split(''); }    // 「a」だけよく使う
  if (key === 'r' || key === 'R') { requests = []; for (let i = 0; i < 22; i++) requests.push('abcdefg'[floor(random(random() < 0.5 ? 3 : 7))]); }
  if (['1', '2', '3', 'r', 'R'].includes(key)) { simulate(); t = 0; playing = true; }
}

function mousePressed() { playing = !playing; }
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
