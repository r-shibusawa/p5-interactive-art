// ============================================
// 02 ヴィジュネル暗号とカシスキー法
// 鍵の単語をくり返し並べ、1 文字ごとに違う数だけずらす暗号。頻度がならされて 01 の方法が効かない。
// でも鍵の長さ L が分かれば「L 個おきの文字」はただのシーザー暗号 → 00 の方法で解ける
//   カシスキー法：同じ 3 文字のくり返しの間隔は L の倍数になりやすい
//   一致指数（IC）：L 個おきに取り出した文字の偏り。正しい L で英語の値（約 0.066）に近づく
// 文字を打つ = 鍵の単語を入力 / Backspace = 1 文字消す / 1 = 鍵を例に戻す
// ※ 教育用。実際の安全な暗号には使わない
// ============================================

const PLAIN = ('THE TRAIN LEFT THE STATION AT DAWN AND THE CITY WAS STILL ASLEEP. ' +
  'THE DRIVER KNEW THE ROUTE BY HEART AND THE PASSENGERS KNEW THE DRIVER. ' +
  'AT THE THIRD STOP A WOMAN WITH A RED UMBRELLA STEPPED ONTO THE PLATFORM AND ' +
  'LOOKED AT THE CLOCK. SHE WAS WAITING FOR A LETTER THAT WOULD CHANGE EVERYTHING, ' +
  'AND THE LETTER WAS IN THE POCKET OF THE MAN SITTING NEXT TO THE WINDOW. ' +
  'NEITHER OF THEM KNEW THAT THE OTHER WAS THERE, AND THE TRAIN MOVED ON ' +
  'THROUGH THE FIELDS AND THE RIVERS UNTIL THE SUN WAS HIGH ABOVE THE HILLS.').replace(/[^A-Z]/g, '');

const EN_FREQ = [8.2, 1.5, 2.8, 4.3, 12.7, 2.2, 2.0, 6.1, 7.0, 0.15, 0.77, 4.0, 2.4,
  6.7, 7.5, 1.9, 0.095, 6.0, 6.3, 9.1, 2.8, 0.98, 2.4, 0.15, 2.0, 0.074];

let keyword = 'LEMON';   // ★ 鍵の単語（A〜Z、最大 10 文字）
let maxL = 14;           // ★ 調べる鍵の長さの上限
let cipherText = '', ic = [], kasiski = [], repeats = [], guessL = 1, recovered = '';

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('monospace');
  analyze();
}

// ★ ヴィジュネル暗号：i 文字目を 鍵[i % 鍵の長さ] だけずらす
function vigenere(s, kw) {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    let k = kw.charCodeAt(i % kw.length) - 65;
    out += String.fromCharCode(65 + (s.charCodeAt(i) - 65 + k) % 26);
  }
  return out;
}

function analyze() {
  cipherText = keyword.length > 0 ? vigenere(PLAIN, keyword) : PLAIN;
  // 一致指数：L 個おきの列ごとに「同じ文字を 2 つ選ぶ確率」を出して平均
  ic = [];
  for (let L = 1; L <= maxL; L++) {
    let sum = 0;
    for (let c = 0; c < L; c++) sum += indexOfCoincidence(column(cipherText, L, c));
    ic.push(sum / L);
  }
  // カシスキー法：同じ 3 文字の並びが出てくる間隔を集めて、2〜maxL の約数を数える
  kasiski = new Array(maxL + 1).fill(0);
  repeats = [];
  let seen = {};
  for (let i = 0; i + 3 <= cipherText.length; i++) {
    let tri = cipherText.substr(i, 3);
    if (seen[tri] !== undefined) {
      let gap = i - seen[tri];
      repeats.push({ a: seen[tri], b: i, gap });
      for (let L = 2; L <= maxL; L++) if (gap % L === 0) kasiski[L]++;
    }
    seen[tri] = i;
  }
  // IC が英語（0.066）にいちばん近い最小の L を鍵の長さと推測
  guessL = 1;
  for (let L = 1; L <= maxL; L++) if (ic[L - 1] > 0.058) { guessL = L; break; }
  // 列ごとにシーザーの総当たり（00 と同じカイ二乗）で鍵の文字を復元
  recovered = '';
  for (let c = 0; c < guessL; c++) recovered += String.fromCharCode(65 + bestShift(column(cipherText, guessL, c)));
}

function draw() {
  background(14, 18, 28);
  noStroke();
  fill(240);
  textSize(18);
  text('ヴィジュネル暗号　鍵 = ' + keyword + (frameCount % 60 < 30 ? '_' : ' ') + '（文字を打つ・Backspace・1 例に戻す）', 24, 34);
  fill(150);
  textSize(14);
  text('教育用：鍵の長さが分かると、L 個おきの文字はただのシーザー暗号になる', 24, 56);

  // ---- 暗号文（くり返しの 3 文字を色づけ）
  let tsz = constrain(width / 80, 11, 16), cw = tsz * 0.62;
  let perLine = floor((width - 48) / cw);
  let mark = new Array(cipherText.length).fill(0);
  for (let r of repeats.slice(0, 40)) for (let j = 0; j < 3; j++) { mark[r.a + j] = 1; mark[r.b + j] = 1; }
  textSize(tsz);
  let lines = ceil(cipherText.length / perLine);
  for (let i = 0; i < cipherText.length; i++) {
    let col = i % perLine, ln = floor(i / perLine);
    fill(mark[i] ? color(255, 200, 90) : color(130, 150, 190));
    text(cipherText[i], 24 + col * cw, 86 + ln * tsz * 1.4);
  }
  let gy = 86 + lines * tsz * 1.4 + 20;

  // ---- グラフ 2 つ
  let gh = height - gy - 110, half = (width - 72) / 2;
  drawBars(24, gy, half, gh, ic.map(v => v), 0.08, '一致指数 IC（鍵の長さ L ごと）', [0.066, 0.038], 1);
  drawBars(48 + half, gy, half, gh, kasiski.slice(1), max(1, max(kasiski)), 'カシスキー法：くり返しの間隔を割り切る数', null, 1);

  // ---- 結果
  fill(240);
  textSize(18);
  text('推測した鍵の長さ L = ' + guessL + '　→ 列ごとに頻度で解いた鍵：' + recovered, 24, height - 64);
  let ok = recovered === keyword || (keyword.length > 0 && recovered.length % keyword.length === 0 && recovered === keyword.repeat(recovered.length / keyword.length));
  fill(ok ? color(120, 230, 150) : color(255, 150, 120));
  text(ok ? '鍵を破った！ 解読：' + vigenereBack(cipherText, recovered).slice(0, 60) + '…' : 'まだ外れ（鍵が長い・文が短いと難しい）', 24, height - 34);
}

function drawBars(x, y, w, h, vals, top, title, refs, startL) {
  fill(200);
  textSize(14);
  text(title, x, y);
  let bw = w / vals.length;
  if (refs) {
    for (let i = 0; i < refs.length; i++) {
      let ry = y + 10 + h - refs[i] / top * h;
      stroke(i === 0 ? color(120, 230, 150, 160) : color(255, 120, 120, 160));
      line(x, ry, x + w, ry);
      noStroke();
      fill(i === 0 ? color(120, 230, 150) : color(255, 120, 120));
      text(i === 0 ? '英語 0.066' : 'でたらめ 0.038', x + w - 110, ry - 4);
    }
  }
  for (let i = 0; i < vals.length; i++) {
    let L = i + startL, bh = constrain(vals[i] / top, 0, 1) * h;
    fill(L === guessL ? color(255, 200, 90) : color(90, 130, 200));
    rect(x + i * bw + 2, y + 10 + h - bh, bw - 4, bh, 3);
    fill(200);
    textAlign(CENTER);
    text(L, x + i * bw + bw / 2, y + h + 28);
    textAlign(LEFT);
  }
}

function keyPressed() {
  if (key === 'Backspace') keyword = keyword.slice(0, -1);
  else if (key === '1') keyword = 'LEMON';
  else if (key.length === 1) {
    let up = key.toUpperCase();
    if (up >= 'A' && up <= 'Z' && keyword.length < 10) keyword += up;
  }
  analyze();
  return false;
}

// ---------- やってみよう ----------
// 1. 鍵を A 1 文字にすると？（ずらさない）。B 1 文字なら 00 のシーザー暗号と同じ
// 2. 鍵を長くしていくと、何文字から破れなくなる？ PLAIN を長くすると？
// 3. IC のグラフで、正しい L の倍数（2L, 3L）も高くなるのはなぜ？
// 4. 鍵を PLAIN と同じ長さのランダムな文字にすると…それが 03 のワンタイムパッド

// ==================================================
// ここから下は「道具」（列の取り出し・一致指数・シーザーの総当たり）
// ==================================================
function column(s, L, c) { let o = ''; for (let i = c; i < s.length; i += L) o += s[i]; return o; }
function indexOfCoincidence(s) {
  let n = s.length; if (n < 2) return 0;
  let f = new Array(26).fill(0); for (let ch of s) f[ch.charCodeAt(0) - 65]++;
  let sum = 0; for (let v of f) sum += v * (v - 1);
  return sum / (n * (n - 1));
}
function bestShift(s) {
  let best = 0, bestChi = Infinity;
  for (let k = 0; k < 26; k++) {
    let f = new Array(26).fill(0);
    for (let ch of s) f[(ch.charCodeAt(0) - 65 - k + 26) % 26]++;
    let chi = 0;
    for (let i = 0; i < 26; i++) { let e = s.length * EN_FREQ[i] / 100; chi += (f[i] - e) * (f[i] - e) / e; }
    if (chi < bestChi) { bestChi = chi; best = k; }
  }
  return best;
}
function vigenereBack(s, kw) {
  let o = ''; for (let i = 0; i < s.length; i++) o += String.fromCharCode(65 + (s.charCodeAt(i) - kw.charCodeAt(i % kw.length) + 26) % 26);
  return o;
}
