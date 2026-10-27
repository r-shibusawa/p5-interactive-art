// ============================================
// 12 償却解析③：動的配列（のびちぢみする表）
// 満杯になったら 2 倍の表を作って全部コピー（拡張）。たまに高いけど、1 回あたりは平均 3 以下
// 縮めるとき「半分以下で半分に」すると、境目で拡張と縮小を繰り返して大損！「1/4 以下で半分に」が正解
// I = 挿入 / D = 削除 / スペース = 自動 / 1 = 挿入だけ / 2 = 1/2 で縮める（失敗例）/ 3 = 1/4 で縮める（正解）/ R = 最初から
// ============================================

let autoSpeed = 10;   // ★ 自動のとき何フレームごとに操作するか

let cap = 0, num = 0, policy = 1, hist = [], auto = false, timer = 0, pattern = 0, copyAnim = 0, lastCopy = 0, oldSize = 0;
const POLICY = ['', '挿入だけ（2 倍に拡張）', '縮小：使用率 1/2 未満で半分に（失敗例）', '縮小：使用率 1/4 未満で半分に（正解）'];

const BG = '#16111c', PANEL = '#231a2b', FG = '#f3eaf0', MUTED = '#9a8aa3';
const RASP = '#ff6b8b', CYAN = '#5ee6e0', AMBER = '#ffc857', LIME = '#a3e635';

function setup() {
  createCanvas(windowWidth, windowHeight);
}

function phi() {
  if (cap === 0) return 0;
  return num / cap >= 0.5 ? 2 * num - cap : cap / 2 - num;
}

function insertItem() {
  if (num >= 512) return;
  let before = phi(), cost = 1;
  if (num === cap) { oldSize = cap; cap = max(1, cap * 2); cost += num; lastCopy = num; copyAnim = 1; }
  num++;
  hist.push({ op: 'I', cost, phi: phi(), amort: cost + phi() - before });
  if (hist.length > 240) hist.shift();
}

function deleteItem() {
  if (num === 0) return;
  let before = phi(), cost = 1;
  num--;
  let limit = policy === 2 ? 0.5 : 0.25;
  if (policy !== 1 && cap > 1 && num / cap < limit) { oldSize = cap; cap = max(1, floor(cap / 2)); cost += num; lastCopy = num; copyAnim = 1; }
  hist.push({ op: 'D', cost, phi: phi(), amort: cost + phi() - before });
  if (hist.length > 240) hist.shift();
}

function autoMove() {
  if (policy === 1) { insertItem(); return; }
  if (num < 16 && pattern === 0) { insertItem(); return; }
  let seq = ['I', 'D', 'D', 'I'];                 // 境目 16 ↔ 17 を行ったり来たり
  if (seq[pattern % 4] === 'I') insertItem(); else deleteItem();
  pattern++;
}

function draw() {
  background(BG);
  if (auto && ++timer >= autoSpeed) { timer = 0; autoMove(); }
  copyAnim = max(0, copyAnim - 0.04);

  noStroke(); fill(FG); textAlign(LEFT, TOP); textSize(26);
  text(`動的配列：${POLICY[policy]}`, 32, 24);
  fill(MUTED); textSize(15);
  text('I 挿入　D 削除　スペース 自動　1〜3 方針　R 最初から', 32, 60);

  // 表のマス
  let cols = 32, rows = max(1, ceil(cap / cols));
  let cell = min(34, (width - 64) / cols, (height * 0.36) / rows);
  let y0 = 100;
  for (let a = 0; a < max(cap, 1); a++) {
    let x = 32 + (a % cols) * cell, y = y0 + floor(a / cols) * cell;
    let isNew = copyAnim > 0 && a >= oldSize && cap > oldSize;
    stroke(isNew ? AMBER : '#3a2f44'); strokeWeight(isNew ? 2 : 1);
    fill(a < num ? (a < lastCopy && copyAnim > 0 ? lerpColor(color(LIME), color(AMBER), copyAnim) : LIME) : PANEL);
    if (a < cap) rect(x + 2, y + 2, cell - 4, cell - 4, 4);
  }
  noStroke(); fill(FG); textSize(16); textAlign(LEFT, TOP);
  let ty = y0 + rows * cell + 12;
  text(`要素 ${num}　容量 ${cap}　使用率 α = ${cap ? (num / cap).toFixed(2) : '-'}　Φ = ${phi()}`, 32, ty);
  if (copyAnim > 0) { fill(AMBER); text(`コピー ${lastCopy} 個！`, 520, ty); }

  // グラフ
  let gx = 50, gy = ty + 50, gw = width - 100, gh = height - gy - 110;
  if (gh < 60) return;
  fill(PANEL); rect(gx - 18, gy - 12, gw + 36, gh + 96, 12);
  let n = hist.length;
  let bw = gw / max(80, n);
  let vmax = max(10, ...hist.map(h => max(h.cost, h.phi)));
  for (let a = 0; a < n; a++) {
    let h = hist[a];
    fill(h.cost > 1 ? (h.op === 'I' ? AMBER : RASP) : '#6b5a78');
    let bh = h.cost / vmax * gh;
    rect(gx + a * bw, gy + gh - bh, max(1, bw - 1), bh);
  }
  noFill(); strokeWeight(2); stroke(CYAN); beginShape();
  for (let a = 0; a < n; a++) vertex(gx + a * bw + bw / 2, gy + gh - hist[a].phi / vmax * gh);
  endShape();
  stroke(LIME); beginShape();
  for (let a = 0; a < n; a++) vertex(gx + a * bw + bw / 2, gy + gh - max(0, hist[a].amort) / vmax * gh);
  endShape();
  noStroke();
  let total = hist.reduce((s, h) => s + h.cost, 0);
  fill(FG); textSize(15); textAlign(LEFT, TOP);
  text(`操作 ${n} 回　実コストの合計 ${total}　1 回あたり ${n ? (total / n).toFixed(2) : '-'}`, gx, gy + gh + 12);
  fill(AMBER); text('■ 拡張つき挿入', gx, gy + gh + 40);
  fill(RASP); text('■ 縮小つき削除', gx + 140, gy + gh + 40);
  fill(CYAN); text('━ Φ（ポテンシャル）', gx + 280, gy + gh + 40);
  fill(LIME); text('━ 償却コスト = 実コスト + ΔΦ', gx + 450, gy + gh + 40);
}

function keyPressed() {
  if (key === 'i' || key === 'I') insertItem();
  if (key === 'd' || key === 'D') deleteItem();
  if (key === ' ') auto = !auto;
  if (key >= '1' && key <= '3') { policy = int(key); cap = 0; num = 0; hist = []; pattern = 0; }
  if (key === 'r' || key === 'R') { cap = 0; num = 0; hist = []; pattern = 0; }
}

function mousePressed() { insertItem(); }
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
