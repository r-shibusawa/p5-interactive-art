// ============================================
// 00 文字をビットにする（情報は 0 と 1）
// キーボードで文字を打つと、1文字が 8 個の電球（ビット）になって並ぶ
// コンピュータも通信も、すべてはこの 0/1 の列を送っている
// キーで入力 / Backspace で消す / クリックで送信アニメーション
// ============================================

let message = 'HELLO';
let sending = false;
let sendPos = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(230, 40, 10);

  // ★ 文字 → 文字コード（ASCII）→ 2進数 8 桁
  let bits = '';
  for (let ch of message) bits += ch.charCodeAt(0).toString(2).padStart(8, '0');

  // 文字ごとの表示
  let rowY = 110;
  textSize(18);
  for (let i = 0; i < message.length; i++) {
    let ch = message[i];
    let code = ch.charCodeAt(0);
    let b = code.toString(2).padStart(8, '0');
    let y = rowY + i * 44;
    if (y > height - 160) break;
    noStroke();
    fill(0, 0, 100);
    text(ch === ' ' ? '␣' : ch, 40, y + 8);
    fill(0, 0, 60);
    text(code, 90, y + 8);
    // 8 個の電球
    for (let k = 0; k < 8; k++) {
      let on = b[k] === '1';
      let x = 160 + k * 40;
      fill(on ? 45 : 230, on ? 90 : 30, on ? 100 : 25);
      circle(x, y, 28);
      fill(on ? 230 : 0, 40, on ? 20 : 60);
      textAlign(CENTER, CENTER);
      textSize(14);
      text(b[k], x, y);
      textAlign(LEFT, BASELINE);
      textSize(18);
    }
  }

  // 送信アニメーション：ビット列が右へ流れる
  let lineY = height - 90;
  stroke(0, 0, 30);
  line(40, lineY, width - 40, lineY);
  noStroke();
  if (sending) {
    sendPos += 4;
    for (let i = 0; i < bits.length; i++) {
      let x = 40 + i * 14 - sendPos + width;
      if (x < 40 || x > width - 40) continue;
      let on = bits[i] === '1';
      fill(on ? 45 : 230, on ? 90 : 30, on ? 100 : 40);
      rect(x, on ? lineY - 30 : lineY - 4, 12, on ? 30 : 4); // 1 = 高い、0 = 低い（電圧のイメージ）
    }
    if (sendPos > bits.length * 14 + width) sending = false;
  }

  fill(0, 0, 100);
  textSize(18);
  text('キーボードで文字を打とう（英数字）　"' + message + '" = ' + message.length + ' 文字 = ' + bits.length + ' ビット　クリックで送信', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('文字コード（ASCII）を 2 進数 8 桁にする。1 バイト = 8 ビット = 電球 8 個', 20, 68);
}

function keyTyped() {
  if (key.length === 1 && key.charCodeAt(0) < 128 && message.length < 18) message += key.toUpperCase();
}
function keyPressed() {
  if (key === BACKSPACE) message = message.slice(0, -1);
}
function mousePressed() {
  sending = true;
  sendPos = 0;
}

// ---------- やってみよう ----------
// 1. 'A' と 'a' の 2進数を比べよう。1 ビットだけちがう（32 の位）
// 2. 数字の '0' は 48。'0'〜'9' の 2 進数の下 4 桁を見ると？
// 3. 日本語 1 文字は何ビット？（UTF-8 では 24 ビット）→ 'あ'.codePointAt(0) で調べてみよう
