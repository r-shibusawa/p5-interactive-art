// ============================================
// 11 償却解析②：2 進カウンタ
// INCREMENT は末尾の 1 を全部 0 にして、次の 0 を 1 にする。0111…1 → 1000…0 のときは k 回も反転！
// でもビット i は 2^i 回に 1 回しか反転しない → n 回で合計 2n 回未満。1 回あたり O(1)
// → = 1 回 INCREMENT / スペース = 自動 / 1〜3 = 見方（集計・出納・ポテンシャル）/ D = DECREMENT も混ぜる（償却が崩れる例）/ R = 最初から
// ============================================

let K = 12;           // ★ ビット数
let autoSpeed = 8;    // ★ 自動のとき何フレームごとに数えるか

let bits = [], flipT = [], flips = [], hist = [], view = 1, auto = false, timer = 0, count = 0, useDec = false, goingUp = true;
const VIEWS = ['', '①集計法', '②出納法（1 には 1 円の貯金）', '③ポテンシャル法（Φ = 1 の個数）'];

const BG = '#16111c', PANEL = '#231a2b', FG = '#f3eaf0', MUTED = '#9a8aa3';
const RASP = '#ff6b8b', CYAN = '#5ee6e0', AMBER = '#ffc857', LIME = '#a3e635';

function setup() {
  createCanvas(windowWidth, windowHeight);
  reset();
}

function reset() {
  bits = new Array(K).fill(0); flipT = new Array(K).fill(99); flips = new Array(K).fill(0); hist = []; count = 0; goingUp = true;
  if (useDec) { count = (1 << (K - 1)) - 1; for (let i = 0; i < K - 1; i++) bits[i] = 1; }  // 0111…1 から始める
}

function increment() {
  let i = 0, cost = 0;
  while (i < K && bits[i] === 1) { bits[i] = 0; flipT[i] = 0; flips[i]++; i++; cost++; }
  if (i < K) { bits[i] = 1; flipT[i] = 0; flips[i]++; cost++; }
  count = (count + 1) % (1 << K);
  hist.push({ cost, ones: bits.reduce((a, b) => a + b, 0), dec: false });
  if (hist.length > 300) hist.shift();
}

function decrement() {
  let i = 0, cost = 0;
  while (i < K && bits[i] === 0) { bits[i] = 1; flipT[i] = 0; flips[i]++; i++; cost++; }
  if (i < K) { bits[i] = 0; flipT[i] = 0; flips[i]++; cost++; }
  count = (count - 1 + (1 << K)) % (1 << K);
  hist.push({ cost, ones: bits.reduce((a, b) => a + b, 0), dec: true });
  if (hist.length > 300) hist.shift();
}

function tick() {
  if (!useDec) { increment(); return; }
  // 0111…1 と 1000…0 の境目を行ったり来たり：毎回 K ビット反転する最悪の並び
  let boundary = 1 << (K - 1);
  if (count < boundary - 1) increment();
  else if (goingUp) { increment(); goingUp = false; } else { decrement(); goingUp = true; }
}

function draw() {
  background(BG);
  if (auto && ++timer >= autoSpeed) { timer = 0; tick(); }

  noStroke(); fill(FG); textAlign(LEFT, TOP); textSize(26);
  text(`償却解析：2 進カウンタ ─ ${VIEWS[view]}`, 32, 24);
  fill(MUTED); textSize(15);
  text('→ 1 回数える　スペース 自動　1〜3 見方　D DECREMENT を混ぜる　R 最初から', 32, 60);

  // ビット
  let bw = min(80, (width - 64) / K), bx0 = width / 2 - bw * K / 2, by = 110;
  for (let i = 0; i < K; i++) {
    let x = bx0 + (K - 1 - i) * bw;
    flipT[i] = min(99, flipT[i] + 1);
    let fl = flipT[i] < 6 ? abs(cos(flipT[i] / 6 * PI)) : 1;
    let col = bits[i] ? LIME : PANEL;
    fill(col); rect(x + 4, by + (1 - fl) * 30, bw - 8, 60 * fl + 0.1, 8);
    fill(bits[i] ? BG : MUTED); textAlign(CENTER, CENTER); textSize(min(30, bw * 0.5));
    if (fl > 0.4) text(bits[i], x + bw / 2, by + 30);
    fill(MUTED); textSize(11); textAlign(CENTER, TOP); text(`A[${i}]`, x + bw / 2, by + 66);
    if (view === 2 && bits[i]) { fill(AMBER); circle(x + bw / 2, by - 14, 20); fill(BG); textSize(12); textAlign(CENTER, CENTER); text('¥', x + bw / 2, by - 14); }
  }
  fill(FG); textSize(18); textAlign(CENTER, TOP);
  text(`値 = ${count}`, width / 2, by + 88);

  // 下左：1 回ごとのコストと累積
  let gx = 60, gy = 250, gw = width * 0.55, gh = height - gy - 130;
  fill(PANEL); rect(gx - 16, gy - 16, gw + 32, gh + 120, 12);
  let n = hist.length, total = hist.reduce((a, h) => a + h.cost, 0);
  let barW = gw / max(60, n);
  for (let a = 0; a < n; a++) {
    let h = hist[a];
    fill(h.dec ? RASP : h.cost > 3 ? AMBER : '#6b5a78');
    let bh = h.cost / K * gh * 0.4;
    rect(gx + a * barW, gy + gh - bh, max(1, barW - 1), bh);
  }
  let scale = max(total, 2 * n, 2 * K) * 1.1;
  let cum = 0;
  noFill(); strokeWeight(2.5); stroke(AMBER); beginShape();
  for (let a = 0; a < n; a++) { cum += hist[a].cost; vertex(gx + (a + 1) * barW, gy + gh - cum / scale * gh); }
  endShape();
  stroke(LIME); line(gx, gy + gh, gx + n * barW, gy + gh - 2 * n / scale * gh);
  if (view === 3) { stroke(CYAN); beginShape(); for (let a = 0; a < n; a++) vertex(gx + (a + 1) * barW, gy + gh - hist[a].ones / scale * gh); endShape(); }
  noStroke(); textAlign(LEFT, TOP); textSize(15);
  fill(FG); text(`操作 ${n} 回　反転の合計 ${total}　1 回あたり ${n ? (total / n).toFixed(2) : '-'}`, gx, gy + gh + 14);
  fill(AMBER); text('━ 反転の累積', gx, gy + gh + 40);
  fill(LIME); text('━ 2n（上限）', gx + 140, gy + gh + 40);
  if (view === 3) { fill(CYAN); text('━ Φ = 1 の個数', gx + 270, gy + gh + 40); }
  if (useDec) { fill(RASP); text('DECREMENT を混ぜると 1 回 K 反転が続き、2n を超える', gx, gy + gh + 66); }

  // 右：ビットごとの反転回数（集計法）
  let rx = gx + gw + 60, rw = width - rx - 40;
  fill(PANEL); rect(rx - 16, gy - 16, rw + 32, gh + 120, 12);
  fill(FG); textSize(15); textAlign(LEFT, TOP);
  let explain = ['', 'ビット i の反転回数 ≒ n / 2^i\n合計 n(1 + 1/2 + 1/4 + …) < 2n',
    '0→1 にするとき 2 円：1 円は反転、\n1 円は貯金。1→0 は貯金で払う',
    '償却 = 実コスト + ΔΦ\n末尾の t 個を 0 に：(t+1) + (1 − t) = 2'][view];
  text(explain, rx, gy - 4);
  let mx = max(1, ...flips);
  let rowH = min(22, (gh + 20) / K);
  for (let i = 0; i < K; i++) {
    let y = gy + 60 + i * rowH;
    fill(MUTED); textSize(11); textAlign(RIGHT, CENTER); text(`A[${i}]`, rx + 34, y + rowH / 2);
    fill(i === 0 ? LIME : CYAN); rect(rx + 40, y + 2, (rw - 90) * flips[i] / mx, rowH - 4, 3);
    fill(FG); textAlign(LEFT, CENTER); text(flips[i], rx + 46 + (rw - 90) * flips[i] / mx, y + rowH / 2);
  }
}

function keyPressed() {
  if (key === RIGHT_ARROW) tick();
  if (key === ' ') auto = !auto;
  if (key >= '1' && key <= '3') view = int(key);
  if (key === 'd' || key === 'D') { useDec = !useDec; reset(); }
  if (key === 'r' || key === 'R') reset();
}

function mousePressed() { tick(); }
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
