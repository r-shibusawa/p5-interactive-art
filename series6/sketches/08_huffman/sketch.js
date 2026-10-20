// ============================================
// 08 ハフマン符号（よく出る文字は短く）
// 文章の中でよく出る文字に短いビット列、めったに出ない文字に長いビット列を割り当てる
// 木を下から組み立てると、自動的にいちばん短い符号ができる（ZIP や JPEG の中で使われている）
// キーボードで文章を打つ / 1〜3 でお手本の文章
// ============================================

let text_ = 'HELLO WORLD THIS IS A TEST OF HUFFMAN CODING';
let tree = null;
let codes = {};

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  build();
}

// ★ ハフマン木をつくる
function build() {
  // 1. 文字ごとの出現回数
  let freq = {};
  for (let ch of text_) freq[ch] = (freq[ch] || 0) + 1;
  // 2. 葉のリスト
  let nodes = Object.keys(freq).map((ch) => ({ ch, count: freq[ch], left: null, right: null }));
  // 3. いちばん少ない 2 つを取り出してまとめる、をくり返す
  while (nodes.length > 1) {
    nodes.sort((a, b) => a.count - b.count);
    let a = nodes.shift(), b = nodes.shift();
    nodes.push({ ch: null, count: a.count + b.count, left: a, right: b });
  }
  tree = nodes[0];
  // 4. 木をたどって符号を決める（左 = 0、右 = 1）
  codes = {};
  assign(tree, '');
}
function assign(node, code) {
  if (!node) return;
  if (node.ch !== null) {
    codes[node.ch] = code || '0';
    return;
  }
  assign(node.left, code + '0');
  assign(node.right, code + '1');
}

function draw() {
  background(230, 40, 10);
  // 木を描く
  if (tree) drawNode(tree, width * 0.62, 110, width * 0.17, 0);

  // 表
  let entries = Object.keys(codes).sort((a, b) => codes[a].length - codes[b].length || a.localeCompare(b));
  let y = 110;
  noStroke();
  textSize(15);
  fill(0, 0, 60);
  text('文字   回数   符号', 40, y - 16);
  let totalBits = 0;
  for (let ch of entries) {
    if (y > height - 120) break;
    let cnt = text_.split('').filter((c) => c === ch).length;
    totalBits += cnt * codes[ch].length;
    fill(0, 0, 100);
    text((ch === ' ' ? '␣' : ch) + '      ' + nf(cnt, 2) + '     ', 40, y);
    fill(45, 90, 100);
    text(codes[ch], 150, y);
    y += 22;
  }
  let fixed = text_.length * 8;
  fill(0, 0, 100);
  textSize(18);
  text('キーボードで文章を打つ（1〜3 でお手本）　文字数 ' + text_.length, 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('ASCII なら ' + fixed + ' ビット → ハフマンなら ' + totalBits + ' ビット（' + nf((100 * totalBits) / fixed, 1, 0) + ' %）　よく出る文字ほど短い符号', 20, 68);
  // 符号化した文章
  let encoded = text_.split('').map((c) => codes[c]).join(' ');
  fill(45, 90, 100, 80);
  textSize(13);
  text(encoded.slice(0, 160) + (encoded.length > 160 ? ' …' : ''), 40, height - 60);
}

function drawNode(node, x, y, spread, depth) {
  if (node.left) {
    stroke(0, 0, 50);
    strokeWeight(1.5);
    line(x, y, x - spread, y + 70);
    line(x, y, x + spread, y + 70);
    noStroke();
    fill(0, 0, 60);
    textSize(12);
    text('0', x - spread / 2 - 10, y + 36);
    text('1', x + spread / 2 + 4, y + 36);
    drawNode(node.left, x - spread, y + 70, spread * 0.5, depth + 1);
    drawNode(node.right, x + spread, y + 70, spread * 0.5, depth + 1);
  }
  noStroke();
  fill(node.ch !== null ? 45 : 170, 80, 100);
  circle(x, y, node.ch !== null ? 30 : 20);
  fill(0, 0, 10);
  textAlign(CENTER, CENTER);
  textSize(node.ch !== null ? 14 : 11);
  text(node.ch !== null ? (node.ch === ' ' ? '␣' : node.ch) : node.count, x, y);
  textAlign(LEFT, BASELINE);
}

function keyTyped() {
  if (key.length === 1 && key.charCodeAt(0) < 128 && text_.length < 60) {
    text_ += key.toUpperCase();
    build();
  }
}
function keyPressed() {
  if (keyCode === BACKSPACE && text_.length > 2) {
    text_ = text_.slice(0, -1);
    build();
  }
  if (key === '1') text_ = 'AAAAAAAABBBBCCD';
  if (key === '2') text_ = 'ABCDEFGH';
  if (key === '3') text_ = 'MISSISSIPPI RIVER';
  if (key >= '1' && key <= '3') build();
}

// ---------- やってみよう ----------
// 1. お手本 1（A が多い）と 2（全部同じ回数）で圧縮率を比べよう。偏りがあるほど縮む
// 2. 符号を見ると「どの符号も他の符号の先頭にならない」（だから区切りなしで読める）
// 3. 01 のエントロピーと比べてみよう。ハフマンの平均ビット数はエントロピーに近づく
