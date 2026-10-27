// ============================================
// 05 最適二分探索木：よく引く単語ほど根の近くに
// キー k1…kn が引かれる確率 p と、間の「見つからない」確率 q から、探索コストの期待値が最小の木をつくる
// e[i][j] = min over r ( e[i][r-1] + e[r+1][j] + w(i,j) )　─ 根 r をためし、左右の部分木は表から
// スペース = 再生・停止 / → = 1 手 / 1 = お手本 / R = ランダムな確率 / ↑↓ = 速さ
// ============================================

let p = [0, 0.08, 0.20, 0.06, 0.14, 0.12];      // ★ p[1..n]：キー ki を探す確率
let q = [0.06, 0.04, 0.08, 0.05, 0.07, 0.10];    // ★ q[0..n]：ki と ki+1 の間（見つからない）確率
let framesPerMove = 8;

let n, e, w, root, L, I, R, best, playing = true, done = false, timer = 0;

const BG = '#16111c', PANEL = '#231a2b', FG = '#f3eaf0', MUTED = '#9a8aa3';
const RASP = '#ff6b8b', CYAN = '#5ee6e0', AMBER = '#ffc857', LIME = '#a3e635';

function setup() {
  createCanvas(windowWidth, windowHeight);
  restart();
}

function restart() {
  n = p.length - 1;
  e = []; w = []; root = [];
  for (let i = 0; i <= n + 1; i++) { e.push(new Array(n + 1).fill(null)); w.push(new Array(n + 1).fill(null)); root.push(new Array(n + 1).fill(null)); }
  for (let i = 1; i <= n + 1; i++) { e[i][i - 1] = q[i - 1]; w[i][i - 1] = q[i - 1]; }
  L = 1; I = 1; R = 1; best = Infinity; done = false;
  w[1][1] = w[1][0] + p[1] + q[1];
}

function advance() {
  if (done) return;
  let J = I + L - 1;
  let t = e[I][R - 1] + e[R + 1][J] + w[I][J];
  if (t < best - 1e-12) { best = t; root[I][J] = R; }
  R++;
  if (R > J) {
    e[I][J] = best; best = Infinity;
    I++;
    if (I > n - L + 1) { L++; I = 1; }
    if (L > n) { done = true; return; }
    let J2 = I + L - 1;
    w[I][J2] = w[I][J2 - 1] + p[J2] + q[J2];
    R = I;
  }
}

function draw() {
  background(BG);
  if (playing && !done && ++timer >= framesPerMove) { timer = 0; advance(); }

  noStroke(); fill(FG); textAlign(LEFT, TOP); textSize(26);
  text('最適二分探索木：探索コストの期待値を最小に', 32, 24);
  fill(MUTED); textSize(15);
  text('スペース 再生・停止　→ 1 手　1 お手本　R ランダム　↑↓ 速さ', 32, 60);

  // 確率の棒
  let bx = 32, by = 96, bw = min(46, (width * 0.45) / (2 * n + 1));
  for (let k = 0; k <= 2 * n; k++) {
    let isKey = k % 2 === 1, idx = floor(k / 2) + (isKey ? 1 : 0);
    let v = isKey ? p[idx] : q[idx];
    let x = bx + k * bw;
    fill(isKey ? RASP : CYAN); rect(x + 4, by + 80 - v * 300, bw - 8, v * 300, 3);
    fill(MUTED); textSize(11); textAlign(CENTER, TOP);
    text(isKey ? `k${idx}` : `d${idx}`, x + bw / 2, by + 84);
    text(v.toFixed(2), x + bw / 2, by + 98);
  }

  // e の表
  let cell = min(58, (width * 0.5 - 60) / (n + 1), (height - 356) / (n + 1));
  let x0 = 60, y0 = 276;
  fill(FG); textSize(15); textAlign(LEFT, BOTTOM); text('e[i][j]：ki…kj の最適な部分木の期待コスト（数字の下は根）', x0 - 28, y0 - 18);
  let J = I + L - 1;
  for (let i = 1; i <= n + 1; i++) {
    fill(MUTED); textSize(11); textAlign(RIGHT, CENTER); text(`i=${i}`, x0 - 4, y0 + (i - 1) * cell + cell / 2);
    for (let j = i - 1; j <= n; j++) {
      let x = x0 + j * cell, y = y0 + (i - 1) * cell;
      if (i === 1) { fill(MUTED); textAlign(CENTER, BOTTOM); text(`j=${j}`, x + cell / 2, y0 - 2); }
      let hl = null;
      if (!done) {
        if (i === I && j === J) hl = AMBER;
        else if (i === I && j === R - 1) hl = CYAN;
        else if (i === R + 1 && j === J) hl = RASP;
      }
      stroke(hl || '#3a2f44'); strokeWeight(hl ? 3 : 1);
      fill(e[i][j] === null ? BG : j === i - 1 ? '#1f2a33' : PANEL);
      rect(x + 2, y + 2, cell - 4, cell - 4, 5);
      noStroke();
      if (e[i][j] !== null) {
        fill(FG); textAlign(CENTER, CENTER); textSize(min(13, cell * 0.24));
        text(e[i][j].toFixed(2), x + cell / 2, y + cell * 0.4);
        if (root[i][j]) { fill(LIME); textSize(min(11, cell * 0.2)); text(`r=${root[i][j]}`, x + cell / 2, y + cell * 0.72); }
      }
    }
  }

  // 右：木
  let tx = width * 0.52, tw = width - tx - 30;
  noStroke(); fill(PANEL); rect(tx, 96, tw, height - 130, 12);
  if (!done) {
    fill(FG); textAlign(LEFT, TOP); textSize(16);
    text(`長さ ${L}：k${I}…k${J} の根を k${R} にしてみる`, tx + 18, 112);
    fill(CYAN); text(`左 e[${I}][${R - 1}] = ${fmt(e[I][R - 1])}`, tx + 18, 142);
    fill(RASP); text(`右 e[${R + 1}][${J}] = ${fmt(e[R + 1][J])}`, tx + 18, 168);
    fill(AMBER); text(`全体が 1 段深くなる分 w(${I},${J}) = ${fmt(w[I][J])}`, tx + 18, 194);
    fill(MUTED); textSize(14);
    text('根を決めると、左右の部分木は 1 段ずつ深くなる。\nその増え分が「部分木の確率の合計 w」', tx + 18, 236);
  } else {
    fill(FG); textAlign(LEFT, TOP); textSize(18);
    text(`最適な木　期待コスト ${e[1][n].toFixed(2)}`, tx + 18, 112);
    fill(MUTED); textSize(14);
    text(`（真ん中を根にした釣り合いの良い木なら ${balancedCost().toFixed(2)}）`, tx + 18, 140);
    let layout = [];
    build(1, n, 0, layout);
    let depthMax = max(...layout.map(o => o.depth));
    let slot = (tw - 40) / (2 * n + 1), dy = min(80, (height - 330) / max(1, depthMax));
    let pos = (o) => [tx + 20 + o.ord * slot + slot / 2, 200 + o.depth * dy];
    for (let o of layout) if (o.parent) { let [a, b2] = pos(o), [c2, d2] = pos(o.parent); stroke('#5a4a66'); strokeWeight(2); line(a, b2, c2, d2); }
    for (let o of layout) {
      let [x, y] = pos(o);
      noStroke();
      if (o.key) { fill(RASP); circle(x, y, min(44, slot * 1.6)); fill(BG); textAlign(CENTER, CENTER); textSize(14); text(`k${o.key}`, x, y); }
      else { fill(CYAN); rect(x - 13, y - 13, 26, 26, 4); fill(BG); textAlign(CENTER, CENTER); textSize(11); text(`d${o.dummy}`, x, y); }
    }
  }
}

function fmt(v) { return v === null || v === undefined ? '-' : v.toFixed(2); }

// 根の表 root から木をつくる。ord は左から何番目か（d0 k1 d1 k2 … の順）
function build(i, j, depth, out, parent) {
  if (j === i - 1) { let o = { dummy: j, depth, ord: 2 * j, parent }; out.push(o); return o; }
  let r = root[i][j];
  let o = { key: r, depth, ord: 2 * r - 1, parent };
  out.push(o);
  build(i, r - 1, depth + 1, out, o);
  build(r + 1, j, depth + 1, out, o);
  return o;
}

function balancedCost() {
  function cost(i, j, depth) {
    if (j === i - 1) return (depth + 1) * q[j];
    let r = floor((i + j) / 2);
    return (depth + 1) * p[r] + cost(i, r - 1, depth + 1) + cost(r + 1, j, depth + 1);
  }
  return cost(1, n, 0);
}

function keyPressed() {
  if (key === ' ') playing = !playing;
  if (key === RIGHT_ARROW) advance();
  if (key === UP_ARROW) framesPerMove = max(1, framesPerMove - 2);
  if (key === DOWN_ARROW) framesPerMove = min(40, framesPerMove + 2);
  if (key === '1') { p = [0, 0.08, 0.20, 0.06, 0.14, 0.12]; q = [0.06, 0.04, 0.08, 0.05, 0.07, 0.10]; restart(); }
  if (key === 'r' || key === 'R') {
    let k = floor(random(4, 8));
    let raw = []; for (let a = 0; a < 2 * k + 1; a++) raw.push(random() < 0.3 ? random(4, 10) : random(0.5, 3));
    let sum = raw.reduce((a, b) => a + b, 0);
    p = [0]; q = [];
    for (let a = 0; a < 2 * k + 1; a++) { let v = raw[a] / sum; if (a % 2) p.push(v); else q.push(v); }
    restart(); playing = true;
  }
}

function mousePressed() { playing = !playing; }
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
