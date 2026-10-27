// ============================================
// 09 締め切りと罰金：マトロイドと貪欲法
// 1 時間で終わる仕事がいくつもあり、締め切りに遅れると罰金。罰金の合計を最小にする並べ方は？
// 罰金の大きい順に「まだ全部締め切りに間に合うなら採用」。この「間に合う仕事の集合」はマトロイドになるので、貪欲法で最適
// スペース = 再生・停止 / → = 1 手 / 1 = お手本 / R = ランダム / 仕事をクリック = 罰金 +10（Shift で -10）
// ============================================

let tasks = [];          // {d, w}：締め切り d、罰金 w
let framesPerMove = 45;  // ★

let order = [], pos = 0, accepted = [], rejected = [], slots = [], playing = true, timer = 0, lastMsg = '';

const BG = '#16111c', PANEL = '#231a2b', FG = '#f3eaf0', MUTED = '#9a8aa3';
const RASP = '#ff6b8b', CYAN = '#5ee6e0', AMBER = '#ffc857', LIME = '#a3e635';

function setup() {
  createCanvas(windowWidth, windowHeight);
  sample();
}

function sample() {
  let d = [3, 1, 4, 1, 2, 3, 2], w = [60, 50, 45, 40, 30, 25, 15];   // a4・a6・a7 が遅刻組 → 罰金 80
  tasks = d.map((v, k) => ({ d: v, w: w[k] }));
  restart();
}

function restart() {
  order = tasks.map((t, k) => k).sort((a, b) => tasks[b].w - tasks[a].w);
  pos = 0; accepted = []; rejected = []; lastMsg = '';
  slots = new Array(tasks.length + 1).fill(-1);
}

// 独立性のチェック：締め切り t までの仕事の数 N_t(A) が t 以下なら、全部締め切りに間に合う
function independent(set) {
  for (let t = 1; t <= tasks.length; t++) {
    let cnt = set.filter(k => tasks[k].d <= t).length;
    if (cnt > t) return false;
  }
  return true;
}

function advance() {
  if (pos >= order.length) return;
  let k = order[pos];
  if (independent([...accepted, k])) {
    accepted.push(k);
    lastMsg = `a${k + 1}（罰金 ${tasks[k].w}）を採用：まだ全部間に合う`;
  } else {
    rejected.push(k);
    lastMsg = `a${k + 1}（罰金 ${tasks[k].w}）は入れると誰かが遅れる → 遅刻組へ`;
  }
  // 採用した仕事を締め切り順に並べる（これが早い者勝ちの時間割）
  slots = new Array(tasks.length + 1).fill(-1);
  let early = [...accepted].sort((a, b) => tasks[a].d - tasks[b].d);
  early.forEach((kk, t) => slots[t + 1] = kk);
  let late = [...rejected];
  late.forEach((kk, t) => slots[early.length + t + 1] = kk);
  pos++;
}

function draw() {
  background(BG);
  if (playing && pos < order.length && ++timer >= framesPerMove) { timer = 0; advance(); }

  noStroke(); fill(FG); textAlign(LEFT, TOP); textSize(26);
  text('締め切りつきの仕事：罰金の合計を最小に', 32, 24);
  fill(MUTED); textSize(15);
  text('スペース 再生・停止　→ 1 手　1 お手本　R ランダム　仕事をクリックで罰金 +10（Shift で -10）', 32, 60);

  // 仕事のカード（罰金の大きい順）
  let n = tasks.length;
  let cw = min(110, (width - 64) / n);
  for (let r = 0; r < n; r++) {
    let k = order[r], x = 32 + r * cw, y = 100;
    let st = accepted.includes(k) ? 'ok' : rejected.includes(k) ? 'ng' : r === pos ? 'cur' : 'wait';
    fill(st === 'ok' ? LIME : st === 'ng' ? RASP : st === 'cur' ? AMBER : PANEL);
    rect(x + 4, y, cw - 8, 80, 8);
    fill(st === 'wait' ? FG : BG); textAlign(CENTER, TOP); textSize(16);
    text(`a${k + 1}`, x + cw / 2, y + 8);
    textSize(13); text(`締切 ${tasks[k].d}`, x + cw / 2, y + 32); text(`罰金 ${tasks[k].w}`, x + cw / 2, y + 52);
  }

  // 時間割
  let sy = 230, sw = min(110, (width * 0.62) / n);
  fill(FG); textSize(16); textAlign(LEFT, BOTTOM); text('時間割（採用した仕事を締め切り順に → 残りは後ろで遅刻）', 32, sy - 8);
  for (let t = 1; t <= n; t++) {
    let x = 32 + (t - 1) * sw;
    stroke('#3a2f44'); fill(PANEL); rect(x + 2, sy, sw - 4, 70, 6);
    noStroke(); fill(MUTED); textAlign(CENTER, TOP); textSize(12); text(`${t - 1}〜${t} 時`, x + sw / 2, sy + 74);
    let k = slots[t];
    if (k >= 0) {
      let late = t > tasks[k].d;
      fill(late ? RASP : LIME); rect(x + 6, sy + 6, sw - 12, 58, 5);
      fill(BG); textSize(15); text(`a${k + 1}`, x + sw / 2, sy + 14);
      textSize(11); text(late ? `遅刻 -${tasks[k].w}` : `締切 ${tasks[k].d}`, x + sw / 2, sy + 38);
    }
  }

  // N_t(A) ≤ t のグラフ
  let gx = 32, gy = sy + 130, gh = min(180, height - gy - 90), gw = min(110, (width * 0.62) / n) * n;
  fill(FG); textSize(16); textAlign(LEFT, BOTTOM); text('独立性のチェック：締め切り t 以内の採用数 N_t ≤ t', gx, gy - 6);
  let unitH = gh / n;
  for (let t = 1; t <= n; t++) {
    let x = gx + (t - 1) * (gw / n);
    let cnt = accepted.filter(k => tasks[k].d <= t).length;
    fill('#3a2f44'); rect(x + 6, gy + gh - t * unitH, gw / n - 12, t * unitH, 3);
    fill(cnt > t ? RASP : CYAN); rect(x + 14, gy + gh - cnt * unitH, gw / n - 28, cnt * unitH, 3);
    fill(MUTED); textAlign(CENTER, TOP); textSize(12); text(`t=${t}`, x + gw / n / 2, gy + gh + 4);
  }
  fill(MUTED); textAlign(LEFT, TOP); textSize(12);
  text('灰色 = 上限 t　水色 = N_t', gx, gy + gh + 22);

  // 右パネル
  let px = width * 0.68, pw = width - px - 30;
  fill(PANEL); rect(px, 210, pw, 300, 12);
  fill(FG); textSize(16); textAlign(LEFT, TOP);
  text(`罰金の合計　${rejected.reduce((a, k) => a + tasks[k].w, 0)}`, px + 16, 226);
  fill(MUTED); textSize(14);
  text(lastMsg, px + 16, 260, pw - 32);
  fill(FG); textSize(13);
  text('マトロイドの 2 つの性質\n① 間に合う集合から仕事を抜いても間に合う\n② 小さい独立集合は、大きいほうから\n　 1 つ借りて大きくできる（交換性）\n→ 重みの大きい順の貪欲法で最適', px + 16, 340, pw - 32);
}

function keyPressed() {
  if (key === ' ') playing = !playing;
  if (key === RIGHT_ARROW) advance();
  if (key === '1') sample();
  if (key === 'r' || key === 'R') {
    let n = floor(random(5, 10));
    tasks = []; for (let k = 0; k < n; k++) tasks.push({ d: floor(random(1, n)), w: floor(random(1, 10)) * 10 });
    restart(); playing = true;
  }
}

function mousePressed() {
  let n = tasks.length, cw = min(110, (width - 64) / n);
  for (let r = 0; r < n; r++) {
    let x = 32 + r * cw;
    if (mouseX > x && mouseX < x + cw && mouseY > 100 && mouseY < 180) {
      let k = order[r];
      tasks[k].w = max(10, tasks[k].w + (keyIsDown(SHIFT) ? -10 : 10));
      restart(); return;
    }
  }
  playing = !playing;
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }
