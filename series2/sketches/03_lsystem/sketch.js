// ============================================
// 03 L-システム（文字の置きかえで植物をつくる）
// 文字列のルールをくり返し適用すると、植物の形が生まれる
// 1〜4 キーで植物の種類 / ↑↓ で世代 / クリックでもう一度成長
// ============================================

// ルール集：どの文字を、何に置きかえるか
// F = 前に進んで線を描く  + = 右に回る  - = 左に回る
// [ = 今の場所を覚える   ] = 覚えた場所に戻る   X = 成長の目（描かない）
let presets = [
  { name: '草', axiom: 'F', rules: { F: 'FF+[+F-F-F]-[-F+F+F]' }, angle: 22.5, gen: 4, len: 7 },
  { name: '小枝', axiom: 'X', rules: { X: 'F[+X][-X]FX', F: 'FF' }, angle: 25.7, gen: 6, len: 6 },
  { name: '樹木', axiom: 'X', rules: { X: 'F-[[X]+X]+F[+FX]-X', F: 'FF' }, angle: 25, gen: 5, len: 8 },
  { name: 'シダ', axiom: 'F', rules: { F: 'F[+F]F[-F]F' }, angle: 25.7, gen: 4, len: 7 },
];

let current = 2; // いま選んでいる植物
let gen = presets[current].gen; // 世代（ルールを何回適用したか）
let sentence = ''; // 生成された文字列
let grow = 0; // 成長アニメーション用（何文字目まで描くか）

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  generate();
}

// ルールを gen 回適用して文字列をつくる
function generate() {
  let p = presets[current];
  sentence = p.axiom;
  for (let i = 0; i < gen; i++) {
    let next = '';
    for (let c of sentence) {
      // ルールがある文字は置きかえ、ない文字はそのまま
      next += p.rules[c] !== undefined ? p.rules[c] : c;
    }
    sentence = next;
  }
  grow = 0;
}

function draw() {
  background(120, 20, 8);
  let p = presets[current];

  // 文字列を「タートル（カメ）」の命令として描く
  translate(width / 2, height - 20);
  stroke(100, 50, 90, 80);
  strokeWeight(1.5);

  grow = min(grow + 60, sentence.length); // 少しずつ描く＝成長
  for (let i = 0; i < grow; i++) {
    let c = sentence[i];
    if (c === 'F') {
      line(0, 0, 0, -p.len);
      translate(0, -p.len);
    } else if (c === '+') {
      rotate(radians(p.angle));
    } else if (c === '-') {
      rotate(-radians(p.angle));
    } else if (c === '[') {
      push();
    } else if (c === ']') {
      pop();
    }
  }

  resetMatrix();
  noStroke();
  fill(0, 0, 100);
  textSize(16);
  text('1〜4：種類（いま ' + p.name + '）　↑↓：世代（' + gen + '）　文字数 ' + sentence.length, 20, 30);
  textSize(13);
  fill(0, 0, 70);
  text('ルール: ' + JSON.stringify(p.rules), 20, 54);
}

function keyPressed() {
  if (key >= '1' && key <= '4') {
    current = int(key) - 1;
    gen = presets[current].gen;
    generate();
  }
  if (keyCode === UP_ARROW && gen < 7) {
    gen++;
    generate();
  }
  if (keyCode === DOWN_ARROW && gen > 0) {
    gen--;
    generate();
  }
}

function mousePressed() {
  grow = 0;
}

// ---------- やってみよう ----------
// 1. 世代を 0 から1つずつ上げて、文字列が長くなるのを見よう
// 2. angle を 90 にすると、植物が「回路」みたいになる
// 3. 自分のルールを足そう  { name: '自作', axiom: 'F', rules: { F: 'F+F-F' }, angle: 60, gen: 4, len: 5 }
