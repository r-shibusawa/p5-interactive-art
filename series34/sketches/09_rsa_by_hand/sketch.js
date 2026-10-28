// ============================================
// 09 RSA を手で
// 2 つの素数 p, q → n = p·q（公開）、φ = (p−1)(q−1)（秘密）
// e を選び、e·d ≡ 1 (mod φ) となる d を「拡張ユークリッドの互除法」で求める
//   暗号化 c = m^e mod n（誰でもできる）／ 復号 m = c^d mod n（d を持つ人だけ）
// n を素因数分解できれば φ も d も分かる → 大きな素数だから安全
// ←→ = p / ↑↓ = q / E = 次の e / M = メッセージを変える / F = n の素因数分解（攻撃）を開始
// ※ 教育用（実際の n は 600 桁以上）
// ============================================

const PR = [11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113, 127, 131];
const WORDS = ['HELLO', 'P5JS', 'SECRET', 'CAT', 'RSA'];   // ★ 送るメッセージ（1 文字ずつ数にする）
let pi = 6, qi = 9, eIdx = 0, wIdx = 0;
let pp, qq, n, phi, e, d, steps = [];
let attack = false, tryDiv = 2, foundP = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('monospace');
  makeKeys();
}

function makeKeys() {
  pp = PR[pi]; qq = PR[qi];
  n = pp * qq;
  phi = (pp - 1) * (qq - 1);
  // e の候補：φ と互いに素なもの（最大公約数が 1）
  let cands = [3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 257].filter(c => c < phi && gcd(c, phi) === 1);
  e = cands[eIdx % cands.length];
  let res = extEuclid(e, phi);
  d = ((res.x % phi) + phi) % phi;
  steps = res.steps;
  attack = false; tryDiv = 2; foundP = 0;
}

function draw() {
  background(16, 14, 24);
  if (attack && !foundP) {
    for (let i = 0; i < 1 && !foundP; i++) {     // ★ 1 フレームに 1 つずつ割ってみる（ゆっくり見せる）
      if (frameCount % 4 === 0) { if (n % tryDiv === 0) foundP = tryDiv; else tryDiv++; }
    }
  }
  noStroke();
  fill(240);
  textSize(18);
  text('RSA を手で　←→ p = ' + pp + '　↑↓ q = ' + qq + (pp === qq ? '（p と q は別の素数に！）' : '') + '　E 次の e　M メッセージ　F 素因数分解で攻撃', 24, 34);
  fill(150);
  textSize(14);
  text('公開鍵 = (n, e)　秘密鍵 = d　｜ 教育用', 24, 56);

  let c1 = 24, c2 = width * 0.36, c3 = width * 0.68, y0 = 100;
  // ---- 1. 鍵をつくる
  head(c1, y0, '① 鍵をつくる');
  lines(c1, y0 + 30, [
    ['p = ' + pp + ', q = ' + qq, 220],
    ['n = p·q = ' + n + '（公開）', color(130, 200, 255)],
    ['φ = (p−1)(q−1) = ' + phi + '（秘密）', color(255, 150, 150)],
    ['e = ' + e + '（公開、gcd(e, φ) = 1）', color(130, 200, 255)],
    ['d = ' + d + '（秘密）', color(255, 150, 150)],
    ['確認：e·d mod φ = ' + (e * d) % phi, color(120, 230, 150)],
  ]);
  // 拡張ユークリッドの表
  head(c1, y0 + 220, '拡張ユークリッドの互除法（φ, e から d）');
  fill(170);
  textSize(14);
  text('  r        商     t', c1, y0 + 250);
  for (let i = 0; i < min(steps.length, 9); i++) {
    let s = steps[i];
    fill(i === steps.length - 1 ? color(255, 200, 90) : 200);
    text(padNum(s.r, 6) + '   ' + (s.q === null ? '   ' : padNum(s.q, 4)) + '  ' + padNum(s.t, 6), c1, y0 + 274 + i * 20);
  }
  fill(150);
  text('r が 1 になった行の t が d（負なら φ を足す）', c1, y0 + 274 + min(steps.length, 9) * 20 + 10);

  // ---- 2. 暗号化と復号
  let word = WORDS[wIdx];
  head(c2, y0, '② 暗号化と復号（1 文字 = 文字コード）');
  let rows = [['文字', 'm', 'c = m^e mod n', 'c^d mod n']];
  let cipherNums = [];
  for (let ch of word) {
    let m = ch.charCodeAt(0), c = modPow(m, e, n);
    cipherNums.push(c);
    rows.push([ch, m, c, String.fromCharCode(modPow(c, d, n))]);
  }
  for (let r = 0; r < rows.length; r++) {
    fill(r === 0 ? 160 : 230);
    textSize(15);
    for (let k = 0; k < 4; k++) {
      if (r > 0 && k === 2) fill(255, 200, 90);
      if (r > 0 && k === 3) fill(120, 230, 150);
      text(rows[r][k], c2 + [0, 50, 110, 260][k], y0 + 34 + r * 24);
    }
  }
  // 署名
  let h = 0; for (let ch of word) h = (h * 31 + ch.charCodeAt(0)) % n;
  let sig = modPow(h, d, n);
  let sy = y0 + 70 + rows.length * 24;
  head(c2, sy, '③ 署名（逆向きに使う）');
  lines(c2, sy + 30, [
    ['ハッシュ h = ' + h + '（"' + word + '" から計算）', 220],
    ['署名 s = h^d mod n = ' + sig + '（d を持つ人だけ）', color(255, 150, 150)],
    ['検証 s^e mod n = ' + modPow(sig, e, n) + (modPow(sig, e, n) === h ? '  = h ✓' : ' ✗'), color(120, 230, 150)],
  ]);

  // ---- 4. 攻撃
  head(c3, y0, '④ 攻撃者：n = ' + n + ' を素因数分解');
  fill(200);
  textSize(15);
  text(attack ? (foundP ? n + ' = ' + foundP + ' × ' + n / foundP : n + ' ÷ ' + tryDiv + ' = ' + nf(n / tryDiv, 1, 2) + ' …') : 'F で開始（2, 3, 4, … で順に割る）', c3, y0 + 34);
  if (foundP) {
    let ph2 = (foundP - 1) * (n / foundP - 1), d2 = ((extEuclid(e, ph2).x % ph2) + ph2) % ph2;
    let stolen = cipherNums.map(c => String.fromCharCode(modPow(c, d2, n))).join('');
    lines(c3, y0 + 64, [
      ['φ = ' + ph2 + ' → d = ' + d2 + ' がバレた', color(255, 110, 110)],
      ['盗み読み："' + stolen + '"', color(255, 110, 110)],
      ['割った回数 ' + tryDiv + '（√n ≈ ' + floor(sqrt(n)) + ' まで調べれば見つかる）', 170],
    ]);
  }
  fill(150);
  textSize(14);
  text('n が 617 桁（2048 ビット）だと、√n までは 300 桁。\n知られている最速の方法でも何十億年もかかる。\n→ 「掛け算は簡単、分解は難しい」が RSA の安全性', c3, y0 + 180);
}

function head(x, y, s) { fill(255, 220, 120); textSize(17); text(s, x, y); }
function lines(x, y, arr) { textSize(15); for (let i = 0; i < arr.length; i++) { fill(arr[i][1]); text(arr[i][0], x, y + i * 26); } }

function keyPressed() {
  if (key === LEFT_ARROW) pi = max(0, pi - 1);
  if (key === RIGHT_ARROW) pi = min(PR.length - 1, pi + 1);
  if (key === DOWN_ARROW) qi = max(0, qi - 1);
  if (key === UP_ARROW) qi = min(PR.length - 1, qi + 1);
  if (key === 'e' || key === 'E') eIdx++;
  if (key === 'm' || key === 'M') wIdx = (wIdx + 1) % WORDS.length;
  if (key === 'f' || key === 'F') { let keep = !attack; makeKeys(); attack = keep; return false; }
  if (key !== 'm' && key !== 'M') makeKeys();
  return false;
}

// ---------- やってみよう ----------
// 1. p = 61, q = 53, e = 17 のとき d はいくつ？ 表を紙で追いかけてみよう（答え 2753）
// 2. 同じ文字は同じ暗号文になる（"HELLO" の L）。これは 06 の ECB と同じ弱点。どう直す？
// 3. 署名の h を 1 だけ変えると、検証はどうなる？（→ 11 のデジタル署名）
// 4. PR にもっと大きな素数を足すと、攻撃にかかる時間はどう伸びる？

// ==================================================
// ここから下は「道具」（最大公約数・拡張ユークリッド・べき乗の余り）
// ==================================================
function gcd(x, y) { while (y) { [x, y] = [y, x % y]; } return x; }
// a·x ≡ 1 (mod m) となる x を求め、途中の表（r, 商, t）も返す
function extEuclid(a, m) {
  let steps = [{ r: m, q: null, t: 0 }, { r: a, q: null, t: 1 }];
  let r0 = m, r1 = a, t0 = 0, t1 = 1;
  while (r1 > 1) {
    let qt = Math.floor(r0 / r1);
    [r0, r1] = [r1, r0 - qt * r1];
    [t0, t1] = [t1, t0 - qt * t1];
    steps.push({ r: r1, q: qt, t: t1 });
  }
  return { x: t1, steps };
}
function modPow(base, ex, m) {
  let r = 1, x = base % m;
  while (ex > 0) { if (ex & 1) r = (r * x) % m; x = (x * x) % m; ex >>= 1; }
  return r;
}
function padNum(v, w) { return String(v).padStart(w, ' '); }
