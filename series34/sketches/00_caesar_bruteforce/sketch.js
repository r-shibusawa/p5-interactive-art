// ============================================
// 00 シーザー暗号と総当たり
// 文字を k 個ずらすだけの暗号。鍵は 26 通りしかないので、全部試せば必ず読める（総当たり攻撃）
// 文字を打つ = 平文を入力 / Backspace = 1 文字消す / ←→ = ずらす数 k / 1 = 例文 / 2 = 全部消す
// ※ 教育用。実際の安全な暗号には使わない
// ============================================

let plain = 'MEET ME AT THE OLD LIBRARY AFTER CLASS';  // 平文（大文字に直して使う）
let shiftK = 3;               // ★ 鍵 = ずらす数（0〜25）
let maxLen = 60;              // ★ 入力できる最大の文字数

// 英語の文字の出現頻度（%）A〜Z。「英語らしさ」の点数に使う
const EN_FREQ = [8.2, 1.5, 2.8, 4.3, 12.7, 2.2, 2.0, 6.1, 7.0, 0.15, 0.77, 4.0, 2.4,
  6.7, 7.5, 1.9, 0.095, 6.0, 6.3, 9.1, 2.8, 0.98, 2.4, 0.15, 2.0, 0.074];

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('monospace');
}

// ★ シーザー暗号の本体：A〜Z だけを k 個ずらす（Z の次は A に戻る = mod 26）
function caesar(s, k) {
  let out = '';
  for (let ch of s) {
    let c = ch.charCodeAt(0);
    if (c >= 65 && c <= 90) out += String.fromCharCode(65 + (((c - 65 + k) % 26) + 26) % 26);
    else out += ch;
  }
  return out;
}

function draw() {
  background(16, 20, 26);
  let cipherText = caesar(plain, shiftK);

  // ---- 上：暗号化のようす
  fill(240);
  noStroke();
  textSize(18);
  text('シーザー暗号　k = ' + shiftK + '（←→）　文字を打つ・Backspace・1 例文・2 消す', 24, 36);
  fill(150);
  textSize(14);
  text('教育用：鍵が 26 通りしかないので、すぐ破られる', 24, 60);

  textSize(22);
  fill(120, 200, 255);
  text('平文　' + plain + (frameCount % 60 < 30 ? '_' : ''), 24, 104);
  fill(255, 200, 90);
  text('暗号　' + cipherText, 24, 140);

  // アルファベットの対応表（上の段 → 下の段）
  let cw = min(34, (width - 48) / 26);
  for (let i = 0; i < 26; i++) {
    let x = 24 + i * cw;
    fill(40, 50, 64);
    rect(x, 164, cw - 3, 56, 4);
    fill(120, 200, 255);
    textSize(16);
    textAlign(CENTER);
    text(String.fromCharCode(65 + i), x + cw / 2 - 1, 186);
    fill(255, 200, 90);
    text(String.fromCharCode(65 + (i + shiftK) % 26), x + cw / 2 - 1, 212);
    textAlign(LEFT);
  }

  // ---- 下：総当たり（暗号文を 26 通りの k で戻してみる）
  let top = 252;
  let rowH = max(14, (height - top - 30) / 26);
  let scores = [];
  for (let k = 0; k < 26; k++) scores.push(englishScore(caesar(cipherText, -k)));
  let best = scores.indexOf(min(scores));

  fill(240);
  textSize(16);
  text('総当たり：暗号文を k = 0〜25 で戻してみる（右の棒 = 英語らしさ。短いほど英語っぽい）', 24, top - 8);
  textSize(min(16, rowH * 0.8));
  let barX = width - 260;
  for (let k = 0; k < 26; k++) {
    let y = top + k * rowH;
    if (k === best) { fill(60, 160, 100, 90); rect(18, y + 2, width - 36, rowH - 1, 4); }
    fill(k === best ? 255 : 160);
    text(nf(k, 2) + '  ' + caesar(cipherText, -k).slice(0, 70), 24, y + rowH * 0.8);
    // χ² の棒（小さいほど英語の頻度に近い）
    let w = constrain(scores[k] / 8, 2, 220);
    fill(k === best ? color(90, 230, 140) : color(90, 110, 140));
    rect(barX, y + rowH * 0.2, w, rowH * 0.6, 2);
  }
  fill(90, 230, 140);
  textSize(15);
  text('いちばん英語らしいのは k = ' + best + (best === shiftK ? '　→ 鍵を当てた！' : '（文が短いと外れることも）'), barX - 80, height - 10);
}

// ★ 英語らしさ：文字の頻度と英語の頻度の「ずれ」（カイ二乗）。小さいほど英語っぽい
function englishScore(s) {
  let cnt = new Array(26).fill(0), total = 0;
  for (let ch of s) {
    let c = ch.charCodeAt(0) - 65;
    if (c >= 0 && c < 26) { cnt[c]++; total++; }
  }
  if (total === 0) return 0;
  let chi = 0;
  for (let i = 0; i < 26; i++) {
    let expect = total * EN_FREQ[i] / 100;
    chi += (cnt[i] - expect) * (cnt[i] - expect) / expect;
  }
  return chi;
}

function keyPressed() {
  if (key === LEFT_ARROW) shiftK = (shiftK + 25) % 26;
  else if (key === RIGHT_ARROW) shiftK = (shiftK + 1) % 26;
  else if (key === 'Backspace') plain = plain.slice(0, -1);
  else if (key === '1') plain = 'MEET ME AT THE OLD LIBRARY AFTER CLASS';
  else if (key === '2') plain = '';
  else if (key.length === 1 && plain.length < maxLen) {
    let up = key.toUpperCase();
    if ((up >= 'A' && up <= 'Z') || up === ' ' || up === '.' || up === ',') plain += up;
  }
  return false;   // スペースや矢印でページがスクロールしないように
}

// ---------- やってみよう ----------
// 1. 自分の名前を打って、k = 13（ROT13）で 2 回暗号化すると元に戻るのを確かめよう
// 2. 「HI」のような短い文だと、英語らしさの判定が外れることがある。何文字あれば当たる？
// 3. caesar を「偶数番目は +k、奇数番目は −k」に変えると、総当たりは何通りになる？
// 4. EN_FREQ を日本語のローマ字の頻度に置きかえて、ローマ字の文で試そう

// ==================================================
// ここから下は「道具」：特になし（caesar と englishScore が主役）
// ==================================================
