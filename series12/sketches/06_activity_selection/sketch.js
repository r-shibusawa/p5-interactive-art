// ============================================
// 06 活動選択問題：1 つの部屋に、重ならない予定をできるだけ多く入れる
// 貪欲法：「いちばん早く終わる予定」を選び、それと重ならない中でまた一番早く終わるものを…
// 早く終われば残り時間が一番多く残る → 一度選んだら後悔しない。ほかのルールと比べてみよう
// スペース = 再生・停止 / → = 1 手 / 1〜4 = 選ぶルール / ドラッグ = 予定を追加 / R = ランダム / C = お手本
// ============================================

let acts = [];         // {s, f}
let T = 17;            // ★ 時間の長さ
let framesPerMove = 30;

let rule = 1, order = [], pos = 0, chosen = [], lastF = 0, playing = true, timer = 0, dragS = null;
const RULES = ['', '早く終わる順（正しい貪欲）', '早く始まる順', '短い順', '重なりが少ない順'];

const BG = '#16111c', PANEL = '#231a2b', FG = '#f3eaf0', MUTED = '#9a8aa3';
const RASP = '#ff6b8b', CYAN = '#5ee6e0', AMBER = '#ffc857', LIME = '#a3e635';

function setup() {
  createCanvas(windowWidth, windowHeight);
  sample();
}

function sample() {
  let s = [0, 1, 4, 2, 3, 6, 5, 8, 9, 11, 13], f = [3, 4, 6, 6, 8, 9, 10, 11, 13, 15, 16];   // 最適は 5 個
  acts = s.map((v, k) => ({ s: v, f: f[k] }));
  T = 17;
  restart();
}

function restart() {
  let idx = acts.map((a, k) => k);
  let conflicts = (k) => acts.filter((b, j) => j !== k && b.s < acts[k].f && acts[k].s < b.f).length;
  if (rule === 1) idx.sort((a, b) => acts[a].f - acts[b].f);
  if (rule === 2) idx.sort((a, b) => acts[a].s - acts[b].s);
  if (rule === 3) idx.sort((a, b) => (acts[a].f - acts[a].s) - (acts[b].f - acts[b].s));
  if (rule === 4) idx.sort((a, b) => conflicts(a) - conflicts(b));
  order = idx; pos = 0; chosen = []; lastF = 0;
}

function advance() {
  if (pos >= order.length) return;
  let k = order[pos];
  let ok = chosen.every(c => acts[c].f <= acts[k].s || acts[k].f <= acts[c].s);
  if (ok) { chosen.push(k); lastF = acts[k].f; }
  pos++;
}

function bestCount() {
  let idx = acts.map((a, k) => k).sort((a, b) => acts[a].f - acts[b].f), cnt = 0, f = -Infinity;
  for (let k of idx) if (acts[k].s >= f) { cnt++; f = acts[k].f; }
  return cnt;
}

function draw() {
  background(BG);
  if (playing && pos < order.length && ++timer >= framesPerMove) { timer = 0; advance(); }

  noStroke(); fill(FG); textAlign(LEFT, TOP); textSize(26);
  text(`活動選択：ルール ${rule}「${RULES[rule]}」`, 32, 24);
  fill(MUTED); textSize(15);
  text('スペース 再生・停止　→ 1 手　1〜4 ルール　ドラッグで予定を追加　R ランダム　C お手本', 32, 60);

  let x0 = 60, x1 = width - 300, top = 120;
  let rowH = min(36, (height - top - 80) / max(1, acts.length));
  let tx = (t) => map(t, 0, T, x0, x1);

  // 時間軸
  stroke('#3a2f44'); strokeWeight(1);
  for (let t = 0; t <= T; t++) { line(tx(t), top - 10, tx(t), top + rowH * acts.length); }
  noStroke(); fill(MUTED); textSize(12); textAlign(CENTER, BOTTOM);
  for (let t = 0; t <= T; t++) text(t, tx(t), top - 12);

  // 予定（並べる順＝ルールの順）
  for (let r = 0; r < order.length; r++) {
    let k = order[r], a = acts[k], y = top + r * rowH;
    let isChosen = chosen.includes(k), looked = r < pos, cur = r === pos;
    fill(isChosen ? LIME : looked ? '#4a3d56' : cur ? AMBER : '#6b5a78');
    rect(tx(a.s), y + 4, tx(a.f) - tx(a.s), rowH - 8, 6);
    fill(isChosen || cur ? BG : FG); textSize(min(13, rowH * 0.45)); textAlign(LEFT, CENTER);
    text(`a${k + 1}  ${a.s}–${a.f}`, tx(a.s) + 6, y + rowH / 2);
    if (looked && !isChosen) { stroke(RASP); strokeWeight(2); line(tx(a.s), y + rowH / 2, tx(a.f), y + rowH / 2); noStroke(); }
  }
  // 選ばれた予定を 1 本の帯に
  let by = top + rowH * acts.length + 20;
  fill(PANEL); rect(x0, by, x1 - x0, 34, 6);
  for (let k of chosen) { fill(LIME); rect(tx(acts[k].s) + 1, by + 4, tx(acts[k].f) - tx(acts[k].s) - 2, 26, 4); }
  if (rule === 1 && pos < order.length) { stroke(AMBER); strokeWeight(2); line(tx(lastF), top - 10, tx(lastF), by + 34); noStroke(); }

  // ドラッグ中
  if (dragS !== null) { fill(CYAN); let a = min(dragS, mouseX), b = max(dragS, mouseX); rect(a, by + 44, b - a, 20, 4); }

  // 右パネル
  let px = width - 270;
  fill(PANEL); rect(px, 110, 240, 260, 12);
  fill(FG); textAlign(LEFT, TOP); textSize(17);
  text(`選んだ数　${chosen.length}`, px + 16, 126);
  fill(MUTED); textSize(14);
  text(`最適（早く終わる順）　${bestCount()}`, px + 16, 156);
  text(`調べた予定　${pos} / ${order.length}`, px + 16, 182);
  fill(FG); textSize(13);
  text(rule === 1 ? '終わりの早いものを選ぶと\n残りの時間が最大。\n「最適解の 1 つに必ず含まれる」\nことが証明できる'
    : 'このルールで最適にならない例を\nドラッグで作ってみよう', px + 16, 220);
}

function keyPressed() {
  if (key === ' ') playing = !playing;
  if (key === RIGHT_ARROW) advance();
  if (key >= '1' && key <= '4') { rule = int(key); restart(); }
  if (key === 'c' || key === 'C') sample();
  if (key === 'r' || key === 'R') {
    acts = []; T = 24;
    for (let k = 0; k < 14; k++) { let s = floor(random(0, T - 2)); acts.push({ s, f: min(T, s + floor(random(1, 7))) }); }
    restart(); playing = true;
  }
}

function mousePressed() { if (mouseX > 60 && mouseX < width - 300) dragS = mouseX; }
function mouseReleased() {
  if (dragS === null) return;
  let x0 = 60, x1 = width - 300;
  let a = round(map(min(dragS, mouseX), x0, x1, 0, T)), b = round(map(max(dragS, mouseX), x0, x1, 0, T));
  a = constrain(a, 0, T); b = constrain(b, 0, T);
  if (b > a && acts.length < 24) { acts.push({ s: a, f: b }); restart(); }
  dragS = null;
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }
