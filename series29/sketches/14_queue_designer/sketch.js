// ============================================
// 14 待ち行列デザイナー（自由制作のベース）
// 「客がわく所（発生源）」「窓口（待ち行列 + サービス）」「出口」を置いて矢印でつなぎ、自分だけの待ち行列の網をつくる
//   客は矢印に沿って移動し、矢印が複数あるときはでたらめに 1 本を選ぶ。どこに行列ができるか見てみよう
// 1・2・3 = 置く部品（発生源・窓口・出口）/ 空いた所をクリック = 置く / 部品からドラッグ = 矢印をつなぐ（もう一度で外す）
// Shift + ドラッグ = 動かす / ↑↓ = 選んだ部品の速さ / X = 選んだ部品を消す / スペース = 一時停止 / S = 保存 / C = 全部消す
// ============================================

let tool = 1;              // 1 = 発生源, 2 = 窓口, 3 = 出口
let toolNames = ['', '発生源', '窓口', '出口'];
let travelSpeed = 3;       // ★ 客が矢印の上を進む速さ（px/フレーム）
let maxTokens = 600;       // ★ 画面に出せる客の上限
let nodes = [], tokens = [], sel = null, dragMode = null, paused = false, simT = 0, nid = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  example();
}
function addNode(type, x, y) {
  let n = { id: nid++, type, x, y, rate: type === 1 ? 0.8 : type === 2 ? 1.0 : 0, outs: [], q: [], cur: null, rem: 0, next: 0,
            busyAvg: 0, qAvg: 0, done: 0, sumT: 0 };
  if (type === 1) n.next = simT + expRand(n.rate);
  nodes.push(n); return n;
}
function example() {
  nodes = []; tokens = []; simT = 0;
  let s = addNode(1, width * 0.12, height * 0.5);
  let a = addNode(2, width * 0.35, height * 0.5);
  let b = addNode(2, width * 0.58, height * 0.32);
  let c = addNode(2, width * 0.58, height * 0.7);
  let e = addNode(3, width * 0.82, height * 0.5);
  a.rate = 1.2; b.rate = 0.5; c.rate = 0.6;
  s.outs = [a]; a.outs = [b, c]; b.outs = [e]; c.outs = [e];
  sel = a;
}
function nodeAt(x, y) { for (let n of nodes) if (Math.hypot(x - n.x, y - n.y) < 30) return n; return null; }

// 客を次の部品へ送る（矢印がなければその場で消える）
function sendFrom(n, born) {
  if (!n.outs.length) return;
  let to = random(n.outs);
  if (tokens.length < maxTokens) tokens.push({ from: n, to, f: 0, born });
}

function update(dt) {
  simT += dt;
  for (let n of nodes) {
    if (n.type === 1) while (n.next <= simT) { sendFrom(n, n.next); n.next += expRand(max(n.rate, 0.01)); }   // ★ ポアソン到着
    if (n.type === 2) {
      if (n.cur) { n.rem -= dt; if (n.rem <= 0) { sendFrom(n, n.cur.born); n.cur = null; } }
      if (!n.cur && n.q.length) { n.cur = n.q.shift(); n.rem = expRand(max(n.rate, 0.01)); }               // ★ 指数分布のサービス
      n.busyAvg += ((n.cur ? 1 : 0) - n.busyAvg) * 0.003;
      n.qAvg += (n.q.length - n.qAvg) * 0.003;
    }
  }
  for (let t of tokens) {
    let d = max(Math.hypot(t.to.x - t.from.x, t.to.y - t.from.y), 1);
    t.f += travelSpeed / d;
    if (t.f >= 1) {
      t.dead = true;
      if (t.to.type === 2) t.to.q.push({ born: t.born });
      else if (t.to.type === 3) { t.to.done++; t.to.sumT += simT - t.born; }
      else sendFrom(t.to, t.born);
    }
  }
  tokens = tokens.filter((t) => !t.dead && nodes.includes(t.to));
}

function draw() {
  background(300, 15, 11);
  if (!paused) update(1 / 60);

  // 矢印
  for (let n of nodes) for (let m of n.outs) arrow(n, m);
  if (dragMode === 'link' && sel) { stroke(45, 90, 100, 70); strokeWeight(2); line(sel.x, sel.y, mouseX, mouseY); }
  // 客
  noStroke(); fill(30, 80, 100);
  for (let t of tokens) circle(lerp(t.from.x, t.to.x, t.f), lerp(t.from.y, t.to.y, t.f), 8);
  // 部品
  for (let n of nodes) {
    stroke(n === sel ? color(45, 90, 100) : color(0, 0, 100, 40)); strokeWeight(n === sel ? 4 : 2);
    if (n.type === 1) { fill(190, 60, 60); circle(n.x, n.y, 56); }
    if (n.type === 2) { fill(n.busyAvg > 0.9 ? color(0, 70, 70) : color(140 - n.busyAvg * 120, 60, 55)); rect(n.x - 30, n.y - 26, 60, 52, 8); }
    if (n.type === 3) { fill(280, 40, 50); rect(n.x - 26, n.y - 26, 52, 52, 26); }
    noStroke(); fill(0, 0, 100); textAlign(CENTER, CENTER); textSize(13);
    if (n.type === 1) text('λ=' + nf(n.rate, 1, 1), n.x, n.y);
    if (n.type === 2) { text('μ=' + nf(n.rate, 1, 1), n.x, n.y - 8); text('使用 ' + nf(n.busyAvg * 100, 1, 0) + '%', n.x, n.y + 10); }
    if (n.type === 3) text(n.done, n.x, n.y);
    textAlign(LEFT, BASELINE);
    if (n.type === 2) {
      fill(30, 80, 100); for (let k = 0; k < min(n.q.length, 24); k++) circle(n.x - 30 + (k % 8) * 8, n.y + 36 + floor(k / 8) * 8, 6);
      if (n.cur) { fill(140, 70, 100); circle(n.x + 22, n.y - 18, 9); }
      fill(0, 0, 70); textSize(11); text('平均の行列 ' + nf(n.qAvg, 1, 1), n.x - 30, n.y + 70);
    }
    if (n.type === 3 && n.done) { fill(0, 0, 70); textSize(11); text('平均の滞在 ' + nf(n.sumT / n.done, 1, 1) + ' 秒', n.x - 34, n.y + 42); }
  }

  fill(0, 0, 100); textSize(18);
  text('置く部品：' + toolNames[tool] + '（1〜3）　クリック＝置く　ドラッグ＝つなぐ　Shift＋ドラッグ＝動かす　↑↓＝速さ　X＝消す　スペース' + (paused ? '（停止中）' : '') + '　S 保存　C 全消去', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('窓口の色：緑 = すいている → 赤 = 使用率 90% 超え（ボトルネック）。窓口の使用率 = そこへ来る流れ ÷ μ。合流させると混み、分岐させるとすく', 20, 68);
}

function arrow(a, b) {
  let dx = b.x - a.x, dy = b.y - a.y, d = max(Math.hypot(dx, dy), 1), ux = dx / d, uy = dy / d;
  let ex = b.x - ux * 34, ey = b.y - uy * 34;
  stroke(0, 0, 100, 50); strokeWeight(2); line(a.x + ux * 30, a.y + uy * 30, ex, ey);
  noStroke(); fill(0, 0, 100, 60);
  triangle(ex, ey, ex - ux * 12 - uy * 6, ey - uy * 12 + ux * 6, ex - ux * 12 + uy * 6, ey - uy * 12 - ux * 6);
  if (a.outs.length > 1) { fill(45, 80, 100); textSize(12); text(nf(1 / a.outs.length, 1, 2), (a.x + b.x) / 2 + uy * 12, (a.y + b.y) / 2 - ux * 12); }
}

function mousePressed() {
  if (mouseY < 90) return;
  let n = nodeAt(mouseX, mouseY);
  if (n) { sel = n; dragMode = keyIsDown(SHIFT) ? 'move' : 'link'; }
  else { sel = addNode(tool, mouseX, mouseY); dragMode = null; }
}
function mouseDragged() { if (dragMode === 'move' && sel) { sel.x = mouseX; sel.y = max(100, mouseY); } }
function mouseReleased() {
  if (dragMode === 'link' && sel) {
    let m = nodeAt(mouseX, mouseY);
    if (m && m !== sel && sel.type !== 3 && m.type !== 1) {
      let i = sel.outs.indexOf(m);
      if (i >= 0) sel.outs.splice(i, 1); else sel.outs.push(m);    // もう一度つなぐと外れる
    }
  }
  dragMode = null;
}
function keyPressed() {
  if (key === '1' || key === '2' || key === '3') tool = int(key);
  if (sel && key === UP_ARROW) sel.rate = min(5, sel.rate + 0.1);
  if (sel && key === DOWN_ARROW) sel.rate = max(0.1, sel.rate - 0.1);
  if (sel) sel.rate = round(sel.rate * 10) / 10;
  if ((key === 'x' || key === 'X') && sel) {
    nodes = nodes.filter((n) => n !== sel);
    for (let n of nodes) n.outs = n.outs.filter((m) => m !== sel);
    tokens = tokens.filter((t) => t.from !== sel && t.to !== sel);
    sel = null;
  }
  if (key === ' ') paused = !paused;
  if (key === 's' || key === 'S') saveCanvas('queue_network', 'png');
  if (key === 'c' || key === 'C') { nodes = []; tokens = []; sel = null; }
}

// ---------- やってみよう ----------
// 1. 発生源 1 つから窓口 3 つに分けて出口へ。λ をいくつにすると、どこかが赤くなる？（使用率 = 流れ ÷ μ）
// 2. 窓口から前の窓口へ戻る矢印をつくる（やり直し・再検査）。流れが増えて混むのを確かめる（10 のジャクソン網）
// 3. 発生源を 2 つにして 1 つの窓口へ合流させる。λ1 + λ2 が μ を超えると？
// 4. 作品にする：空港・テーマパーク・学食など、身近な場所の流れを再現して名前をつける

// ==================================================
// ここから下は「道具」
// ==================================================
function expRand(rate) { return -Math.log(1 - Math.random()) / rate; }
