// ============================================
// 12 前に移動（Move-To-Front）リスト
// 連結リストで探しものをすると、前から k 番目なら k 回たどる（コスト k）
// 次に何を探されるか分からない（オンライン）。見つけたものを先頭に移す MTF は、未来を知る最善の方法の 4 倍以内（4-競合）
// 他の戦略：1 つだけ前に（転置）、よく使う順に並べる（頻度）、最初から確率の高い順に固定（静的・未来の分布を知っている）
// スペース = 再生・停止 / 1〜4 = 要求の出し方 / 項目をクリック = その項目を要求 / R = 最初から
// ============================================

let items = 'ABCDEFGHIJ'.split('');
let lists = [], costs = [], counts = [];
let names = ['前に移動（MTF）', '1 つ前と交換（転置）', '使った回数の順（頻度）', '確率の高い順に固定（静的）'];
let hues = [45, 200, 300, 140];
let gen = 2, playing = false, timer = 0;
let lastReq = null, reqs = 0;
let probs = [];
let phaseShift = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  reset();
}

function reset() {
  probs = items.map((_, i) => (gen === 2 ? 1 / (i + 1) : 1));
  let order = shuffled(items);
  lists = [0, 1, 2, 3].map(() => [...order]);
  // 静的：確率の高い順（未来の分布を知っているずるい戦略）
  lists[3] = [...items].sort((a, b) => probs[items.indexOf(b)] - probs[items.indexOf(a)]);
  costs = [0, 0, 0, 0];
  counts = {};
  items.forEach((x) => (counts[x] = 0));
  lastReq = null; reqs = 0; phaseShift = 0;
}

function shuffled(a) { a = [...a]; for (let i = a.length - 1; i > 0; i--) { let k = floor(random(i + 1)); [a[i], a[k]] = [a[k], a[i]]; } return a; }

function nextRequest() {
  if (gen === 4) return lists[0][lists[0].length - 1];          // 意地悪：MTF のいちばん後ろを要求
  if (gen === 3) {                                                // 局所性：しばらく同じ 3 つばかり
    if (reqs % 30 === 0) phaseShift = floor(random(items.length));
    return items[(phaseShift + floor(random(3))) % items.length];
  }
  let total = probs.reduce((s, p) => s + p, 0), r = random(total);
  for (let i = 0; i < items.length; i++) { r -= probs[i]; if (r < 0) return items[i]; }
  return items[0];
}

function request(x) {
  counts[x]++;
  for (let k = 0; k < 4; k++) {
    let L = lists[k], pos = L.indexOf(x);
    costs[k] += pos + 1;
    if (k === 0) { L.splice(pos, 1); L.unshift(x); }
    if (k === 1 && pos > 0) [L[pos - 1], L[pos]] = [L[pos], L[pos - 1]];
    if (k === 2) L.sort((a, b) => counts[b] - counts[a]);
  }
  lastReq = x; reqs++;
}

function draw() {
  background(45, 20, 9);
  if (playing && ++timer % 10 === 0) request(nextRequest());
  let colW = (width - 80) / 4;
  let maxCost = max(1, max(costs));
  for (let k = 0; k < 4; k++) {
    let x0 = 40 + k * colW;
    fill(hues[k], 60, 95); noStroke(); textAlign(LEFT, BASELINE); textSize(16);
    text(names[k], x0, 120);
    let L = lists[k];
    for (let i = 0; i < L.length; i++) {
      let y = 140 + i * 40;
      let hit = L[i] === lastReq;
      fill(hit ? color(hues[k], 80, 100) : color(45, 10, 25 + 40 * (probs[items.indexOf(L[i])] / max(probs))));
      rect(x0, y, 54, 32, 6);
      fill(0, 0, hit ? 10 : 90); textAlign(CENTER, CENTER); textSize(17); text(L[i], x0 + 27, y + 16);
      fill(0, 0, 50); textSize(12); text(i + 1, x0 - 14, y + 16);
    }
    // 累計コストの棒
    let bh = (costs[k] / maxCost) * 220;
    fill(hues[k], 60, 80); rect(x0 + 90, 560 - bh, 50, bh, 4);
    fill(0, 0, 100); textAlign(CENTER, BASELINE); textSize(16); text(costs[k], x0 + 115, 556 - bh);
    textSize(13); fill(0, 0, 70); text('1 回平均 ' + (reqs ? nf(costs[k] / reqs, 1, 2) : '—'), x0 + 115, 580);
  }
  textAlign(LEFT, BASELINE);
  fill(0, 0, 100); textSize(18);
  text('スペース：' + (playing ? '停止' : '再生') + '　1：均等　2：偏りあり（ジップ）　3：局所性（同じものが続く）　4：MTF への意地悪　項目クリック = 要求　R', 20, 36);
  textSize(15); fill(0, 0, 65);
  text('コスト = 見つかるまでにたどった数（前から何番目か）。明るい項目ほどよく要求される', 20, 62);
  fill(0, 0, 90); textSize(18);
  text('要求 ' + reqs + ' 回' + (lastReq ? '　最後の要求：' + lastReq : ''), 20, height - 64);
  fill(45, 80, 100); textSize(16);
  text(gen === 3 ? '局所性があると MTF が強い。静的な順番は「今よく使うもの」についていけない' : gen === 4 ? '意地悪な列では MTF は毎回 ' + items.length + '。でも、最善の方法も同じ列に苦しむので比は 4 倍以内に収まる' : '偏りがあるとき、静的（ずるい）が一番。MTF は分布を知らないのに近い成績', 20, height - 30);
}

function mousePressed() {
  let colW = (width - 80) / 4;
  for (let k = 0; k < 4; k++) {
    let x0 = 40 + k * colW;
    let i = floor((mouseY - 140) / 40);
    if (mouseX > x0 && mouseX < x0 + 54 && i >= 0 && i < items.length) { request(lists[k][i]); return; }
  }
}

function keyPressed() {
  if (key === ' ') playing = !playing;
  if (key >= '1' && key <= '4') { gen = int(key); reset(); }
  if (key === 'r' || key === 'R') reset();
}

// ---------- やってみよう ----------
// 1. 3（局所性）と 2（偏り）で、どの戦略が勝つか比べる
// 2. 4（意地悪）：MTF のコストは毎回 10。他の戦略はどうなる？
// 3. ブラウザの「最近使ったファイル」、キャッシュの LRU（13）も同じ考え方
