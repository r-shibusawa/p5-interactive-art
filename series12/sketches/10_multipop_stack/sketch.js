// ============================================
// 10 償却解析①：MULTIPOP つきスタック
// MULTIPOP(k) は一度に k 枚取るので 1 回は高くつく。でも「積んだ皿より多くは取れない」ので平均すると 1 回 O(1)
// 3 つの見方：①集計法（合計 ÷ 回数） ②出納法（積むときに 1 円の貯金を皿に乗せる） ③ポテンシャル法（Φ = 皿の枚数）
// P またはクリック = PUSH / O = POP / M = MULTIPOP(k) / ↑↓ = k / スペース = ランダムに自動 / 1〜3 = 見方 / R = 最初から
// ============================================

let k = 4;              // ★ MULTIPOP で取る枚数
let autoSpeed = 12;     // ★ 自動のとき、何フレームごとに操作するか

let stack = [], hist = [], flying = [], view = 1, auto = false, timer = 0, plateNo = 0;
const VIEWS = ['', '①集計法', '②出納法（貯金）', '③ポテンシャル法'];

const BG = '#16111c', PANEL = '#231a2b', FG = '#f3eaf0', MUTED = '#9a8aa3';
const RASP = '#ff6b8b', CYAN = '#5ee6e0', AMBER = '#ffc857', LIME = '#a3e635';

function setup() {
  createCanvas(windowWidth, windowHeight);
}

function record(name, cost) {
  hist.push({ name, cost, size: stack.length });
  if (hist.length > 400) hist.shift();
}

function pushPlate() {
  if (stack.length >= 30) return;
  stack.push({ id: plateNo++, hue: random(360) });
  record('PUSH', 1);
}
function popPlates(cnt, name) {
  let real = min(cnt, stack.length);
  for (let a = 0; a < real; a++) {
    let pl = stack.pop();
    flying.push({ ...pl, y: stack.length + 1, t: 0, dx: random(0, 4) });
  }
  record(name, real);
}

function draw() {
  background(BG);
  if (auto && ++timer >= autoSpeed) {
    timer = 0;
    let r = random();
    if (r < 0.62) pushPlate(); else if (r < 0.82) popPlates(1, 'POP'); else popPlates(k, `MULTIPOP(${k})`);
  }

  noStroke(); fill(FG); textAlign(LEFT, TOP); textSize(26);
  text(`償却解析：MULTIPOP つきスタック ─ ${VIEWS[view]}`, 32, 24);
  fill(MUTED); textSize(15);
  text(`P 積む　O 1 枚取る　M ${k} 枚取る　↑↓ k　スペース 自動　1〜3 見方　R 最初から`, 32, 60);

  // スタック
  let sx = 60, base = height - 70, ph = min(18, (height - 220) / 30);
  fill('#3a2f44'); rect(sx - 20, base, 200, 8, 3);
  for (let a = 0; a < stack.length; a++) {
    let y = base - (a + 1) * ph;
    fill(color(`hsl(${floor(stack[a].hue)}, 60%, 65%)`)); rect(sx, y + 1, 160, ph - 2, 6);
    if (view === 2) { fill(AMBER); circle(sx + 180, y + ph / 2, ph * 0.8); fill(BG); textSize(ph * 0.55); textAlign(CENTER, CENTER); text('¥', sx + 180, y + ph / 2); }
  }
  if (view === 3) {
    noFill(); stroke(CYAN); strokeWeight(2);
    rect(sx - 10, base - stack.length * ph, 180, stack.length * ph, 4);
    noStroke(); fill(CYAN); textSize(14); textAlign(LEFT, CENTER);
    text(`Φ = ${stack.length}`, sx + 180, base - stack.length * ph - 12);
  }
  for (let f of flying) {
    f.t += 1;
    let y = base - f.y * ph - f.t * 6 + f.t * f.t * 0.3;
    fill(color(`hsla(${floor(f.hue)}, 60%, 65%, ${max(0, 1 - f.t / 40)})`)); rect(sx - f.t * (2 + f.dx * 0.3), y, 160, ph - 2, 6);
  }
  flying = flying.filter(f => f.t < 40);

  // グラフ
  let gx = 320, gy = 110, gw = width - gx - 40, gh = height - 260;
  fill(PANEL); rect(gx - 16, gy - 10, gw + 32, gh + 150, 12);
  let ops = hist.length, actual = hist.reduce((a, h) => a + h.cost, 0);
  let maxBar = max(4, ...hist.map(h => h.cost));
  let bw = gw / max(40, ops);
  // 1 回ごとの実コスト
  for (let a = 0; a < ops; a++) {
    let h = hist[a];
    fill(h.name === 'PUSH' ? '#6b5a78' : h.name === 'POP' ? CYAN : RASP);
    let bh = h.cost / maxBar * gh * 0.35;
    rect(gx + a * bw, gy + gh - bh, max(1, bw - 1), bh);
  }
  // 累積
  let cum = 0, cmax = max(2 * ops, 10);
  noFill(); strokeWeight(2.5);
  stroke(AMBER); beginShape();
  for (let a = 0; a < ops; a++) { cum += hist[a].cost; vertex(gx + (a + 1) * bw, gy + gh - cum / cmax * gh); }
  endShape();
  stroke(LIME); line(gx, gy + gh, gx + ops * bw, gy + gh - 2 * ops / cmax * gh);
  if (view === 3) { stroke(CYAN); beginShape(); for (let a = 0; a < ops; a++) vertex(gx + (a + 1) * bw, gy + gh - hist[a].size / cmax * gh); endShape(); }
  noStroke();

  fill(FG); textSize(15); textAlign(LEFT, TOP);
  let ty = gy + gh + 16;
  text(`操作 ${ops} 回　実コストの合計 ${actual}　1 回あたり ${ops ? (actual / ops).toFixed(2) : '-'}`, gx, ty);
  fill(AMBER); text('━ 実コストの累積', gx, ty + 28);
  fill(LIME); text('━ 2 × 操作回数（上限）', gx + 170, ty + 28);
  if (view === 3) { fill(CYAN); text('━ Φ = 皿の枚数', gx + 380, ty + 28); }
  fill(MUTED); textSize(14);
  let explain = [
    '',
    '各皿は「積まれて 1 回、取られて 1 回」しか動かない。n 回の操作で合計は 2n 以下 → 1 回あたり O(1)',
    'PUSH のとき 2 円払う：1 円は積む手間、1 円は皿に貯金。POP / MULTIPOP は皿の貯金で払う → 貯金は決してマイナスにならない',
    '償却コスト = 実コスト + ΔΦ。PUSH は 1 + 1 = 2、POP は 1 − 1 = 0、MULTIPOP(k) は k − k = 0。Φ ≥ 0 なので合計は 2n 以下',
  ][view];
  text(explain, gx, ty + 58, gw);
}

function keyPressed() {
  if (key === 'p' || key === 'P') pushPlate();
  if (key === 'o' || key === 'O') popPlates(1, 'POP');
  if (key === 'm' || key === 'M') popPlates(k, `MULTIPOP(${k})`);
  if (key === UP_ARROW) k = min(20, k + 1);
  if (key === DOWN_ARROW) k = max(1, k - 1);
  if (key === ' ') auto = !auto;
  if (key >= '1' && key <= '3') view = int(key);
  if (key === 'r' || key === 'R') { stack = []; hist = []; flying = []; }
}

function mousePressed() { pushPlate(); }
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
