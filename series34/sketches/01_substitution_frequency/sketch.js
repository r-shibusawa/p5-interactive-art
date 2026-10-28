// ============================================
// 01 換字式暗号と頻度分析
// A〜Z をバラバラに入れかえる暗号。鍵は 26! ≒ 4×10^26 通りで総当たりは無理。
// でも「E がいちばん多い」など英語の文字の偏りは暗号文にも残る → 頻度で解ける
// 上の段（暗号文の文字）をクリック → 下の段（英語の文字）をクリックで「この文字はこれだ」と推理
// F = 頻度の順位でまとめて推理 / C = 推理を消す / R = 新しい鍵 / H = 1 文字だけ正解を教えてもらう
// ※ 教育用。実際の安全な暗号には使わない
// ============================================

// 平文（このスケッチ用に書いた英文）。長いほど頻度分析が当たりやすい
const PLAIN = 'EVERY SECRET MESSAGE LEAVES A SHADOW. WHEN THE LETTERS ARE ONLY SWAPPED, THE ' +
  'COMMON ONES STAY COMMON. THE LETTER E STILL APPEARS MORE THAN ANY OTHER, AND THE WORD THE ' +
  'SHOWS UP AGAIN AND AGAIN. A PATIENT READER CAN COUNT THE SYMBOLS, COMPARE THEM WITH ORDINARY ' +
  'ENGLISH TEXT, AND SLOWLY TURN THE NOISE BACK INTO WORDS. THIS IS WHY SIMPLE SUBSTITUTION ' +
  'CIPHERS WERE BROKEN MORE THAN A THOUSAND YEARS AGO BY SCHOLARS WHO STUDIED LANGUAGE.';

const EN_FREQ = [8.2, 1.5, 2.8, 4.3, 12.7, 2.2, 2.0, 6.1, 7.0, 0.15, 0.77, 4.0, 2.4,
  6.7, 7.5, 1.9, 0.095, 6.0, 6.3, 9.1, 2.8, 0.98, 2.4, 0.15, 2.0, 0.074];

let perm = [];        // 鍵：平文の文字 i → 暗号の文字 perm[i]
let cipherText = '';
let guess = [];       // 推理：暗号の文字 c → 平文の文字 guess[c]（-1 = 未定）
let cnt = [];         // 暗号文の文字の出現回数
let picked = -1;      // クリックで選んだ暗号の文字

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('monospace');
  newKey();
}

function newKey() {
  perm = shuffle([...Array(26).keys()]);      // ★ ランダムな入れかえ = 鍵
  cipherText = '';
  for (let ch of PLAIN) {
    let c = ch.charCodeAt(0) - 65;
    cipherText += (c >= 0 && c < 26) ? String.fromCharCode(65 + perm[c]) : ch;
  }
  cnt = new Array(26).fill(0);
  for (let ch of cipherText) { let c = ch.charCodeAt(0) - 65; if (c >= 0 && c < 26) cnt[c]++; }
  guess = new Array(26).fill(-1);
  picked = -1;
}

function draw() {
  background(18, 16, 24);
  fill(240);
  noStroke();
  textSize(18);
  text('換字式暗号と頻度分析　上の棒（暗号の文字）→ 下の棒（英語の文字）をクリックで推理', 24, 34);
  fill(150);
  textSize(14);
  text('F 頻度順でまとめて推理　C 推理を消す　R 新しい鍵　H ヒント　｜ 教育用：頻度ですぐ破られる', 24, 56);

  // ---- 文章（推理を当てはめた結果）
  let tsz = constrain(width / 75, 12, 18);
  textSize(tsz);
  let cw = tsz * 0.62, perLine = floor((width - 48) / cw);
  let x = 24, y = 92, col = 0, correct = 0;
  for (let i = 0; i < cipherText.length; i++) {
    let ch = cipherText[i], c = ch.charCodeAt(0) - 65;
    if (c >= 0 && c < 26) {
      if (guess[c] >= 0) {
        let ok = perm[guess[c]] === c;
        fill(ok ? color(120, 230, 150) : color(255, 120, 120));
        text(String.fromCharCode(97 + guess[c]), x + col * cw, y);
      } else {
        fill(c === picked ? color(255, 220, 90) : color(110, 110, 140));
        text(ch, x + col * cw, y);
      }
    } else { fill(110); text(ch, x + col * cw, y); }
    col++;
    if (col >= perLine) { col = 0; y += tsz * 1.5; }
  }
  for (let c = 0; c < 26; c++) if (guess[c] >= 0 && perm[guess[c]] === c) correct++;

  // ---- ヒストグラム 2 段
  let gx = 24, gw = (width - 48) / 26;
  let midY = height * 0.62, h = height * 0.22;
  let maxC = max(cnt);
  for (let i = 0; i < 26; i++) {
    // 上：暗号文の文字の回数
    let bh = cnt[i] / maxC * h;
    fill(i === picked ? color(255, 220, 90) : (guess[i] >= 0 ? color(150, 120, 230) : color(90, 90, 130)));
    rect(gx + i * gw + 2, midY - bh, gw - 4, bh, 3);
    fill(230);
    textAlign(CENTER);
    textSize(14);
    text(String.fromCharCode(65 + i), gx + i * gw + gw / 2, midY + 18);
    if (guess[i] >= 0) { fill(150, 120, 230); text('↓' + String.fromCharCode(97 + guess[i]), gx + i * gw + gw / 2, midY + 36); }
    // 下：英語の頻度
    let eh = EN_FREQ[i] / 12.7 * h;
    let used = guess.indexOf(i) >= 0;
    fill(used ? color(70, 140, 100) : color(70, 170, 220));
    rect(gx + i * gw + 2, midY + 50, gw - 4, eh, 3);
    fill(230);
    text(String.fromCharCode(97 + i), gx + i * gw + gw / 2, midY + 50 + eh + 16);
    textAlign(LEFT);
  }
  fill(200);
  textSize(14);
  text('暗号文の文字の回数（クリックで選ぶ）', gx, midY - h - 8);
  text('英語の文字の頻度（クリックで当てはめる）', gx, height - 12);
  fill(120, 230, 150);
  textSize(16);
  text('正しく当てた文字：' + correct + ' / 26', width - 260, midY - h - 8);
}

function mousePressed() {
  let gx = 24, gw = (width - 48) / 26, midY = height * 0.62;
  let i = floor((mouseX - gx) / gw);
  if (i < 0 || i >= 26) return;
  if (mouseY < midY + 40 && mouseY > midY - height * 0.3) picked = i;
  else if (mouseY > midY + 40 && picked >= 0) {
    let other = guess.indexOf(i);            // すでに使われている英字なら入れかえる
    if (other >= 0) guess[other] = guess[picked];
    guess[picked] = i;
    picked = -1;
  }
}

// ★ 頻度分析：暗号文で多い順と、英語で多い順をそのまま対応させる
function autoGuess() {
  let cOrder = [...Array(26).keys()].sort((a, b) => cnt[b] - cnt[a]);
  let eOrder = [...Array(26).keys()].sort((a, b) => EN_FREQ[b] - EN_FREQ[a]);
  for (let r = 0; r < 26; r++) guess[cOrder[r]] = eOrder[r];
}

function keyPressed() {
  if (key === 'f' || key === 'F') autoGuess();
  if (key === 'c' || key === 'C') guess.fill(-1);
  if (key === 'r' || key === 'R') newKey();
  if (key === 'h' || key === 'H') hint();
}

// まだ正しくない文字のうち、いちばん多い文字の正解を 1 つ教える
function hint() {
  let best = -1;
  for (let c = 0; c < 26; c++) {
    let ok = guess[c] >= 0 && perm[guess[c]] === c;
    if (!ok && cnt[c] > 0 && (best < 0 || cnt[c] > cnt[best])) best = c;
  }
  if (best < 0) return;
  let truth = perm.indexOf(best);
  let other = guess.indexOf(truth);
  if (other >= 0) guess[other] = guess[best];
  guess[best] = truth;
}

// ---------- やってみよう ----------
// 1. F を押すと何文字当たる？ E と T はたいてい当たる。残りは単語の形（THE, AND）から推理しよう
// 2. PLAIN を短く（1 文）すると、F で当たる文字はどう変わる？
// 3. 暗号文の中の「3 文字の単語」でいちばん多いものは何？ それは THE の可能性が高い
// 4. 日本語のローマ字の文に変えると、どの文字がいちばん多くなる？

// ==================================================
// ここから下は「道具」：特になし（shuffle は p5.js の関数）
// ==================================================
