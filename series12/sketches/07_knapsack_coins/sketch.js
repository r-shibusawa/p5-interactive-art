// ============================================
// 07 貪欲法が勝つとき・負けるとき：ナップサックと両替
// 粉のように分けられる荷物（分数ナップサック）なら「重さあたりの価値が高い順」の貪欲法で最適
// でも分けられない荷物（0-1 ナップサック）や、変わった硬貨での両替では貪欲法が失敗する → DP で解く
// K = ナップサック / C = 両替 / スペース = 再生・停止 / → = 1 マス / 1〜3 = お手本 / ↑↓ = 容量・金額 / R = ランダム
// ============================================

let items = [{ w: 1, v: 50 }, { w: 2, v: 80 }, { w: 3, v: 105 }];   // ★ 荷物（重さ kg と価値 円）。容量 5 なら分数 200 円、0-1 貪欲 130 円、0-1 最適 185 円
let W = 5;                     // ★ ナップサックの容量
let coins = [1, 3, 4];         // ★ 硬貨の種類
let amount = 6;                // ★ 両替する金額

let mode = 'K', K, take, C, from, filled = 0, playing = true;

const BG = '#16111c', PANEL = '#231a2b', FG = '#f3eaf0', MUTED = '#9a8aa3';
const RASP = '#ff6b8b', CYAN = '#5ee6e0', AMBER = '#ffc857', LIME = '#a3e635';
const ITEMCOL = ['#ff6b8b', '#5ee6e0', '#ffc857', '#a3e635', '#c792ff', '#ff9e57'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  restart();
}

function restart() {
  filled = 0;
  if (mode === 'K') {
    let n = items.length;
    K = []; take = [];
    for (let i = 0; i <= n; i++) { K.push(new Array(W + 1).fill(0)); take.push(new Array(W + 1).fill(false)); }
    for (let i = 1; i <= n; i++) for (let c = 0; c <= W; c++) {
      K[i][c] = K[i - 1][c];
      if (items[i - 1].w <= c && K[i - 1][c - items[i - 1].w] + items[i - 1].v > K[i][c]) { K[i][c] = K[i - 1][c - items[i - 1].w] + items[i - 1].v; take[i][c] = true; }
    }
  } else {
    C = new Array(amount + 1).fill(Infinity); from = new Array(amount + 1).fill(0); C[0] = 0;
    for (let a = 1; a <= amount; a++) for (let c of coins) if (c <= a && C[a - c] + 1 < C[a]) { C[a] = C[a - c] + 1; from[a] = c; }
  }
}

function draw() {
  background(BG);
  noStroke(); fill(FG); textAlign(LEFT, TOP); textSize(26);
  fill(MUTED); textSize(15);
  text('K ナップサック　C 両替　スペース 再生・停止　→ 1 マス　1〜3 お手本　↑↓ 容量・金額　R ランダム', 32, 60);
  if (mode === 'K') drawKnapsack(); else drawCoins();
}

// ---------------- ナップサック ----------------
function drawKnapsack() {
  let n = items.length, total = n * (W + 1);
  if (playing) filled = min(total + 1, filled + max(0.2, total / 240));
  let shown = floor(filled);
  fill(FG); textSize(26); textAlign(LEFT, TOP);
  text(`ナップサック：容量 ${W} に価値の合計が最大になるよう詰める`, 32, 24);

  // 荷物
  let x = 32;
  for (let k = 0; k < n; k++) {
    let it = items[k];
    let bw2 = max(96, 40 + it.w * 16);
    fill(ITEMCOL[k % 6]); rect(x, 100, bw2, 46, 6);
    fill(BG); textSize(13); textAlign(CENTER, CENTER);
    text(`${it.w}kg ${it.v}円`, x + bw2 / 2, 115);
    text(`${(it.v / it.w).toFixed(0)}円/kg`, x + bw2 / 2, 133);
    x += bw2 + 10;
  }

  // DP 表
  let cell = min(54, (width * 0.6) / (W + 2), (height - 300) / (n + 2));
  let x0 = 32, y0 = 180;
  let ci = -1, cc = -1;
  if (shown < total) { ci = floor(shown / (W + 1)) + 1; cc = shown % (W + 1); }
  textSize(12); textAlign(CENTER, CENTER);
  for (let c = 0; c <= W; c++) { fill(c === cc ? AMBER : MUTED); text(`容量${c}`, x0 + (c + 1) * cell + cell / 2, y0 + cell / 2); }
  for (let i = 0; i <= n; i++) { fill(i === ci ? AMBER : MUTED); text(i === 0 ? 'なし' : `〜${i}番`, x0 + cell / 2, y0 + (i + 1) * cell + cell / 2); }
  let path = {};
  if (shown >= total) { let c = W; for (let i = n; i >= 1; i--) { path[i + ',' + c] = true; if (take[i][c]) c -= items[i - 1].w; } }
  for (let i = 0; i <= n; i++) for (let c = 0; c <= W; c++) {
    let idx = (i - 1) * (W + 1) + c, vis = i === 0 || idx < shown, cur = i === ci && c === cc;
    let dep = ci > 0 && i === ci - 1 && (c === cc || (c === cc - items[ci - 1].w));
    stroke(cur ? AMBER : dep ? CYAN : '#3a2f44'); strokeWeight(cur || dep ? 2.5 : 1);
    fill(path[i + ',' + c] ? (take[i][c] ? '#5f7f1e' : '#4a3d56') : vis ? PANEL : BG);
    rect(x0 + (c + 1) * cell + 1, y0 + (i + 1) * cell + 1, cell - 2, cell - 2, 5);
    if (vis || cur) { noStroke(); fill(FG); textSize(min(14, cell * 0.3)); text(K[i][c], x0 + (c + 1) * cell + cell / 2, y0 + (i + 1) * cell + cell / 2); }
  }
  noStroke(); fill(MUTED); textSize(13); textAlign(LEFT, TOP);
  text('K[i][c] = max( 入れない K[i-1][c] , 入れる K[i-1][c-w] + v )', x0, y0 + (n + 2) * cell + 10);

  // 3 つの詰め方
  let px = x0 + (W + 2) * cell + 40, pw = width - px - 30;
  let ratio = items.map((it, k) => k).sort((a, b) => items[b].v / items[b].w - items[a].v / items[a].w);
  let frac = [], room = W, fv = 0;
  for (let k of ratio) { let t = min(1, room / items[k].w); if (t > 0) { frac.push([k, t]); room -= t * items[k].w; fv += t * items[k].v; } }
  let g01 = [], room2 = W, gv = 0;
  for (let k of ratio) if (items[k].w <= room2) { g01.push([k, 1]); room2 -= items[k].w; gv += items[k].v; }
  let dp = [], c = W;
  for (let i = n; i >= 1; i--) if (take[i][c]) { dp.push([i - 1, 1]); c -= items[i - 1].w; }
  let bags = [['分数・貪欲', frac, fv], ['0-1・貪欲', g01, gv], ['0-1・DP', shown >= total ? dp : [], shown >= total ? K[n][W] : '?']];
  let bw = min(90, pw / 3 - 20), bh = min(320, height - 280), unit = bh / W;
  for (let b = 0; b < 3; b++) {
    let bx = px + b * (bw + 24), byy = 180;
    stroke(FG); strokeWeight(2); noFill(); rect(bx, byy, bw, bh, 4);
    let yy = byy + bh;
    noStroke();
    for (let [k, t] of bags[b][1]) { let h = items[k].w * t * unit; fill(ITEMCOL[k % 6]); rect(bx + 3, yy - h + 2, bw - 6, h - 4, 3); yy -= h; }
    fill(FG); textAlign(CENTER, TOP); textSize(14);
    text(bags[b][0], bx + bw / 2, byy + bh + 10);
    fill(b === 1 && shown >= total && gv < K[n][W] ? RASP : LIME); textSize(18);
    text(`${typeof bags[b][2] === 'number' ? round(bags[b][2]) : bags[b][2]}円`, bx + bw / 2, byy + bh + 32);
  }
}

// ---------------- 両替 ----------------
function drawCoins() {
  let total = amount;
  if (playing) filled = min(total + 1, filled + 0.12);
  let shown = floor(filled);
  fill(FG); textSize(26); textAlign(LEFT, TOP);
  text(`両替：${amount} 円を硬貨 {${coins.join(', ')}} の最少枚数で`, 32, 24);

  let cw = min(64, (width - 64) / (amount + 1)), y0 = 150;
  for (let a = 0; a <= amount; a++) {
    let x = 32 + a * cw, vis = a <= shown, cur = a === shown && shown <= amount;
    stroke(cur ? AMBER : '#3a2f44'); strokeWeight(cur ? 3 : 1);
    fill(vis ? PANEL : BG); rect(x + 2, y0, cw - 4, cw - 4, 6);
    noStroke(); fill(MUTED); textSize(11); textAlign(CENTER, BOTTOM); text(`${a}円`, x + cw / 2, y0 - 4);
    if (vis) { fill(FG); textSize(min(18, cw * 0.35)); textAlign(CENTER, CENTER); text(C[a] === Infinity ? '×' : C[a], x + cw / 2, y0 + cw / 2 - 2); }
    if (cur && a > 0) for (let c of coins) if (c <= a) {
      let sx = 32 + (a - c) * cw + cw / 2, ex = x + cw / 2;
      noFill(); stroke(c === from[a] ? LIME : '#6b5a78'); strokeWeight(c === from[a] ? 3 : 1.5);
      bezier(sx, y0 + cw, sx, y0 + cw + 30 + c * 6, ex, y0 + cw + 30 + c * 6, ex, y0 + cw);
      noStroke(); fill(c === from[a] ? LIME : MUTED); textSize(11); textAlign(CENTER, TOP); text(`+${c}`, (sx + ex) / 2, y0 + cw + 24 + c * 4.5);
    }
  }
  noStroke(); fill(MUTED); textSize(14); textAlign(LEFT, TOP);
  text('C[a] = 1 + min( C[a - 硬貨] )　─ 最後に使う硬貨を全部ためす', 32, y0 + cw + 80);

  // 貪欲と DP の比較
  let greedy = [], rest = amount;
  for (let c of [...coins].sort((a, b) => b - a)) while (rest >= c) { greedy.push(c); rest -= c; }
  let opt = [], a = amount;
  if (C[amount] !== Infinity) while (a > 0) { opt.push(from[a]); a -= from[a]; }
  let yy = y0 + cw + 130;
  for (let [label, arr, col] of [['貪欲（大きい硬貨から）', greedy, rest > 0 ? RASP : AMBER], ['DP（最少枚数）', shown > amount ? opt : [], LIME]]) {
    fill(FG); textSize(16); textAlign(LEFT, CENTER); text(label, 32, yy + 26);
    let x = 260;
    for (let c of arr) { fill(col); circle(x, yy + 26, 30 + c * 2); fill(BG); textAlign(CENTER, CENTER); textSize(13); text(c, x, yy + 26); x += 40 + c * 2; }
    fill(col); textAlign(LEFT, CENTER); textSize(16);
    text(label.startsWith('貪欲') && rest > 0 ? '払えない！' : arr.length ? `${arr.length} 枚` : '', x + 10, yy + 26);
    yy += 80;
  }
}

function keyPressed() {
  if (key === 'k' || key === 'K') { mode = 'K'; restart(); }
  if (key === 'c' || key === 'C') { mode = 'C'; restart(); }
  if (key === ' ') playing = !playing;
  if (key === RIGHT_ARROW) { playing = false; filled = floor(filled) + 1; }
  if (key === UP_ARROW) { if (mode === 'K') W = min(20, W + 1); else amount = min(40, amount + 1); restart(); }
  if (key === DOWN_ARROW) { if (mode === 'K') W = max(1, W - 1); else amount = max(1, amount - 1); restart(); }
  if (mode === 'K') {
    if (key === '1') { items = [{ w: 1, v: 50 }, { w: 2, v: 80 }, { w: 3, v: 105 }]; W = 5; }
    if (key === '2') { items = [{ w: 5, v: 10 }, { w: 4, v: 40 }, { w: 6, v: 30 }, { w: 3, v: 50 }]; W = 10; }
    if (key === '3') { items = [{ w: 2, v: 3 }, { w: 3, v: 4 }, { w: 4, v: 5 }, { w: 5, v: 6 }, { w: 9, v: 10 }]; W = 13; }
    if (key === 'r' || key === 'R') { items = []; let k = floor(random(3, 7)); for (let a = 0; a < k; a++) items.push({ w: floor(random(1, 7)), v: floor(random(2, 20)) * 5 }); W = floor(random(6, 16)); }
  } else {
    if (key === '1') { coins = [1, 5, 10, 25]; amount = 30; }   // アメリカの硬貨：貪欲で最適
    if (key === '2') { coins = [1, 3, 4]; amount = 6; }         // 貪欲 4+1+1、最適 3+3
    if (key === '3') { coins = [1, 7, 10]; amount = 14; }       // 貪欲 10+1+1+1+1、最適 7+7
    if (key === 'r' || key === 'R') { coins = [1]; while (coins.length < 3) { let c = floor(random(2, 13)); if (!coins.includes(c)) coins.push(c); } coins.sort((a, b) => a - b); amount = floor(random(10, 30)); }
  }
  if (['1', '2', '3', 'r', 'R'].includes(key)) { restart(); playing = true; }
}

function mousePressed() { playing = !playing; }
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
