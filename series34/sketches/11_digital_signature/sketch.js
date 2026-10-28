// ============================================
// 11 デジタル署名と改ざん検知
// 送る人：メッセージのハッシュ h を秘密鍵 d で「署名」s = h^d mod n
// 受け取る人：公開鍵 e で s^e mod n を計算し、届いたメッセージのハッシュと比べる。一致 → 本物 ✓
// 1 文字でも書きかえるとハッシュが変わり、検証が失敗する ✗（署名を作れるのは d を持つ本人だけ）
// 文字を打つ = 届いたメッセージを書きかえる（改ざん）/ Backspace = 消す / Enter = 今の文に署名し直す / ↑↓ = 署名の数字をいじる / 1 = 元に戻す
// ※ 教育用（09 と同じおもちゃの RSA。実際は 2048 ビット以上と SHA-256）
// ============================================

const P1 = 1009, Q1 = 1013;            // ★ 秘密の素数
let n, phi, pubE = 17, privD;
let original = 'PAY BOB 100 YEN';      // ★ 署名した元のメッセージ
let received = '', signature = 0;
let flash = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('monospace');
  n = P1 * Q1;
  phi = (P1 - 1) * (Q1 - 1);
  privD = modInverse(pubE, phi);
  signMessage(original);
}

function signMessage(s) {
  original = s;
  received = s;
  signature = modPow(toyHash(s), privD, n);    // ★ 署名：秘密鍵 d を使う
  flash = 30;
}

function draw() {
  background(14, 18, 24);
  noStroke();
  fill(240);
  textSize(18);
  text('デジタル署名　文字を打つ = 改ざん・Backspace　Enter 署名し直す　↑↓ 署名の数字をいじる　1 元に戻す', 24, 34);
  fill(150);
  textSize(14);
  text('公開鍵 (n = ' + n + ', e = ' + pubE + ')　秘密鍵 d = ' + privD + '（アリスだけが知っている）　｜ 教育用', 24, 56);

  let hRecv = toyHash(received);
  let hSig = modPow(signature, pubE, n);       // ★ 検証：公開鍵 e で戻す
  let ok = hRecv === hSig;

  // ---- 3 つの箱：アリス → 通信路 → ボブ
  let bw = (width - 120) / 3, by = 110, bh = height * 0.42;
  box3(30, by, bw, bh, 'アリス（送る人）', color(255, 140, 160));
  box3(60 + bw, by, bw, bh, '通信路（だれでも書きかえられる）', color(160, 160, 160));
  box3(90 + 2 * bw, by, bw, bh, 'ボブ（受け取る人）', color(130, 180, 255));
  arrow(30 + bw, by + bh / 2, 60 + bw, by + bh / 2);
  arrow(60 + 2 * bw, by + bh / 2, 90 + 2 * bw, by + bh / 2);

  textSize(15);
  let x = 46, y = by + 60;
  fill(220); text('メッセージ', x, y);
  fill(255); text('"' + original + '"', x, y + 24);
  fill(220); text('ハッシュ h = ' + toyHash(original), x, y + 60);
  fill(255, 150, 150); text('署名 s = h^d mod n', x, y + 96);
  text('  = ' + signature, x, y + 120);
  if (flash > 0) { fill(255, 220, 120, flash * 8); text('署名しました', x, y + 156); flash--; }

  x = 76 + bw;
  fill(220); text('届くメッセージ（打って改ざん）', x, y);
  fill(received === original ? 255 : color(255, 200, 90));
  text('"' + received + (frameCount % 60 < 30 ? '_' : '') + '"', x, y + 24);
  fill(220); text('署名 s', x, y + 96);
  fill(255, 150, 150); text('  = ' + signature, x, y + 120);
  // 違う文字に印
  let chW = textWidth('M');
  for (let i = 0; i < received.length; i++) if (received[i] !== original[i]) {
    fill(255, 200, 90); rect(x + (i + 1) * chW, y + 30, chW - 1, 3);
  }

  x = 106 + 2 * bw;
  fill(220); text('① 届いた文のハッシュ', x, y);
  fill(255); text('  h\' = ' + hRecv, x, y + 24);
  fill(220); text('② 署名を公開鍵で戻す', x, y + 60);
  fill(255); text('  s^e mod n = ' + hSig, x, y + 84);
  fill(220); text('③ 比べる', x, y + 120);
  fill(ok ? color(120, 230, 150) : color(255, 100, 100));
  text(ok ? '  一致 → 本物' : '  不一致 → 改ざんか偽物', x, y + 144);

  // ---- 大きな ✓ / ✗
  let cx = width / 2, cy = by + bh + (height - by - bh) / 2 - 10;
  let r = min(120, (height - by - bh) * 0.35);
  noFill();
  strokeWeight(16);
  stroke(ok ? color(120, 230, 150) : color(255, 100, 100));
  circle(cx, cy, r * 2);
  if (ok) { line(cx - r * 0.45, cy, cx - r * 0.1, cy + r * 0.38); line(cx - r * 0.1, cy + r * 0.38, cx + r * 0.5, cy - r * 0.35); }
  else { line(cx - r * 0.4, cy - r * 0.4, cx + r * 0.4, cy + r * 0.4); line(cx + r * 0.4, cy - r * 0.4, cx - r * 0.4, cy + r * 0.4); }
  noStroke();
  fill(170);
  textSize(15);
  textAlign(CENTER);
  text(ok ? '署名は正しい：アリスが書いた、そして 1 文字も変わっていない' : '改ざんした人は d を知らないので、正しい署名を作り直せない', cx, height - 24);
  textAlign(LEFT);
}

function box3(x, y, w, h, title, col) {
  fill(26, 32, 42);
  rect(x, y, w, h, 12);
  fill(col);
  textSize(17);
  text(title, x + 16, y + 28);
}
function arrow(x1, y1, x2, y2) {
  stroke(200); strokeWeight(3); line(x1 + 4, y1, x2 - 8, y2); noStroke();
  fill(200); triangle(x2 - 4, y2, x2 - 14, y2 - 7, x2 - 14, y2 + 7);
}

function keyPressed() {
  if (key === 'Enter') signMessage(received);
  else if (key === 'Backspace') received = received.slice(0, -1);
  else if (key === UP_ARROW) signature = (signature + 1) % n;
  else if (key === DOWN_ARROW) signature = (signature + n - 1) % n;
  else if (key === '1') signMessage('PAY BOB 100 YEN');
  else if (key.length === 1 && received.length < 28) received += key.toUpperCase();
  return false;
}

// ---------- やってみよう ----------
// 1. 100 を 900 に書きかえると ✗。戻すと ✓ に戻る。ハッシュは同じ文なら必ず同じ値
// 2. ↑↓ で署名の数字を 1 つずらすと？ 正しい署名を偶然当てる確率は約 1/n
// 3. Enter は「アリスが署名し直す」操作。改ざんした人がこれをできないのはなぜ？
// 4. toyHash を「文字コードの合計」にすると、文字を並べかえても ✓ になってしまう。試してみよう

// ==================================================
// ここから下は「道具」（ハッシュ・べき乗の余り・逆数）
// ==================================================
// おもちゃのハッシュ（07 の FNV-1a を n で割った余り）
function toyHash(s) {
  let h = 0x811C9DC5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0) % n;
}
// n ≈ 10^6 なので掛け算は 10^12（Number で安全な 9×10^15 以内）
function modPow(base, ex, m) {
  let r = 1, x = base % m;
  while (ex > 0) { if (ex % 2 === 1) r = (r * x) % m; x = (x * x) % m; ex = Math.floor(ex / 2); }
  return r;
}
function modInverse(a, m) {
  let r0 = m, r1 = a, t0 = 0, t1 = 1;
  while (r1 > 0) { let q = Math.floor(r0 / r1); [r0, r1] = [r1, r0 - q * r1]; [t0, t1] = [t1, t0 - q * t1]; }
  return ((t0 % m) + m) % m;
}
