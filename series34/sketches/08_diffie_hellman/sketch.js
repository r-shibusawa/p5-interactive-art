// ============================================
// 08 ディフィー＝ヘルマン鍵共有
// 会ったことのない 2 人が、盗み聞きされている通信だけで「同じ秘密の鍵」をつくる方法。
//   絵の具：混ぜるのは簡単、混ざった色から元の色を取り出すのは難しい
//   数：A = g^a mod p は計算が速い。A から a を探す（離散対数）のは総当たりしかない
// ↑↓ = 素数 p の大きさ / A・B = アリス・ボブの秘密を選び直す / スペース = イブの総当たり開始・停止 / ←→ = イブの速さ
// ※ 教育用（実際は 2048 ビット以上の p か楕円曲線を使う）
// ============================================

const PRIMES = [23, 101, 1019, 10007, 100003, 999983];   // ★ 選べる素数 p
let pIdx = 1;
let p, g, a, b, pubA, pubB, shared;
let eveX = 0, eveRun = false, eveFound = -1, eveSpeed = 20;   // ★ イブが 1 フレームに試す回数
// 絵の具（RGB）
let common = [250, 220, 60], secretA = [220, 40, 60], secretB = [40, 90, 220];

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('monospace');
  newParams();
}

function newParams() {
  p = PRIMES[pIdx];
  g = primitiveRoot(p);
  newSecrets();
}
function newSecrets() {
  a = 2 + floor(random(p - 3));           // ★ アリスの秘密（誰にも送らない）
  b = 2 + floor(random(p - 3));           // ★ ボブの秘密
  pubA = modPow(g, a, p);                 // 公開してよい値
  pubB = modPow(g, b, p);
  shared = modPow(pubB, a, p);            // アリスの計算。ボブは modPow(pubA, b, p) で同じ値になる
  secretA = [150 + floor(random(100)), floor(random(80)), floor(random(120))];
  secretB = [floor(random(80)), floor(random(140)), 150 + floor(random(100))];
  eveX = 0; eveFound = -1;
}

function draw() {
  background(18, 16, 22);
  // イブの総当たり：g^x = pubA となる x を 1 から順に探す
  if (eveRun && eveFound < 0) {
    for (let i = 0; i < eveSpeed && eveFound < 0; i++) {
      eveX++;
      if (modPow(g, eveX, p) === pubA) eveFound = eveX;
      if (eveX >= p) eveFound = 0;
    }
  }
  noStroke();
  fill(240);
  textSize(18);
  text('ディフィー＝ヘルマン鍵共有　↑↓ p　A/B 秘密を選び直す　スペース イブの総当たり　←→ イブの速さ ' + eveSpeed + '/フレーム', 24, 34);
  fill(150);
  textSize(14);
  text('灰色の帯 = みんなに見える通信路（イブも見ている）　｜ 教育用', 24, 56);

  let cw = width / 3, top = 90;
  let mixAB = mixPaint(mixPaint(common, secretA), secretB);
  // 3 人のパネル
  panel(0, cw, top, 'アリス', color(255, 140, 160));
  panel(1, cw, top, 'イブ（盗聴者）', color(180, 180, 180));
  panel(2, cw, top, 'ボブ', color(130, 180, 255));
  // 中央の通信路
  fill(255, 255, 255, 14);
  rect(cw + 10, top + 30, cw - 20, height - top - 60, 12);

  // ---- 絵の具の段
  let py = top + 70;
  caption(cw * 0.5, py - 16, '共通の色 + 秘密の色');
  blob(cw * 0.3, py + 30, common); blob(cw * 0.5, py + 30, secretA, true); blob(cw * 0.75, py + 30, mixPaint(common, secretA));
  blob(cw * 2.25, py + 30, mixPaint(common, secretB)); blob(cw * 2.5, py + 30, secretB, true); blob(cw * 2.7, py + 30, common);
  caption(cw * 1.5, py - 16, '見えるのは：共通の色・混ぜた色 2 つ');
  blob(cw * 1.3, py + 30, common); blob(cw * 1.5, py + 30, mixPaint(common, secretA)); blob(cw * 1.7, py + 30, mixPaint(common, secretB));
  caption(cw * 0.5, py + 90, '相手の混ぜた色 + 自分の秘密');
  blob(cw * 0.5, py + 130, mixAB, false, 54);
  caption(cw * 2.5, py + 90, '相手の混ぜた色 + 自分の秘密');
  blob(cw * 2.5, py + 130, mixPaint(mixPaint(common, secretB), secretA), false, 54);
  caption(cw * 1.5, py + 120, '2 色を混ぜても、秘密の色 2 つ分にはならない');

  // ---- 数の段
  let ny = py + 220;
  textSize(17);
  fill(230);
  textAlign(CENTER);
  text('公開：p = ' + p + '　g = ' + g, width / 2, ny - 20);
  textAlign(LEFT);
  textSize(16);
  let lines1 = ['秘密 a = ' + a, 'A = g^a mod p', '  = ' + pubA + '  → 送る', '受け取った B = ' + pubB, 'B^a mod p = ' + shared];
  let lines3 = ['秘密 b = ' + b, 'B = g^b mod p', '  = ' + pubB + '  → 送る', '受け取った A = ' + pubA, 'A^b mod p = ' + modPow(pubA, b, p)];
  for (let i = 0; i < 5; i++) {
    fill(i === 0 ? color(255, 200, 90) : (i === 4 ? color(120, 230, 150) : 220));
    text(lines1[i], 30, ny + 10 + i * 26);
    text(lines3[i], cw * 2 + 30, ny + 10 + i * 26);
  }
  // イブの欄
  fill(200);
  text('見える：p, g, A = ' + pubA + ', B = ' + pubB, cw + 30, ny + 10);
  text('g^x mod p = A となる x を総当たり', cw + 30, ny + 36);
  fill(eveFound > 0 ? color(255, 110, 110) : color(255, 200, 90));
  text(eveFound > 0 ? '見つけた！ a = ' + eveFound + '（' + eveX + ' 回）' : '試した x：' + eveX + ' / ' + (p - 1) + (eveRun ? '…' : '（スペースで開始）'), cw + 30, ny + 62);
  // 進みぐあいの棒
  fill(60);
  rect(cw + 30, ny + 76, cw - 60, 12, 6);
  fill(255, 200, 90);
  rect(cw + 30, ny + 76, (cw - 60) * min(1, eveX / (p - 1)), 12, 6);
  fill(150);
  textSize(14);
  text('p が 10 倍 → 最悪の手間も 10 倍。実際の p は 600 桁以上\n→ 全宇宙のコンピュータでも終わらない', cw + 30, ny + 112);
  fill(120, 230, 150);
  textSize(17);
  text('共有した鍵：' + shared + (shared === modPow(pubA, b, p) ? '（2 人とも同じ ✓）' : ''), 30, height - 30);
}

function panel(i, cw, top, name, col) {
  fill(col);
  textSize(20);
  textAlign(CENTER);
  text(name, cw * i + cw / 2, top + 10);
  textAlign(LEFT);
}
function caption(x, y, s) { fill(170); textSize(13); textAlign(CENTER); text(s, x, y); textAlign(LEFT); }
function blob(x, y, c, secret, d) {
  fill(c[0], c[1], c[2]);
  circle(x, y, d || 40);
  if (secret) { fill(255); textSize(12); textAlign(CENTER); text('秘密', x, y + 34); textAlign(LEFT); }
}

function keyPressed() {
  if (key === UP_ARROW) { pIdx = min(PRIMES.length - 1, pIdx + 1); newParams(); }
  if (key === DOWN_ARROW) { pIdx = max(0, pIdx - 1); newParams(); }
  if (key === 'a' || key === 'A' || key === 'b' || key === 'B') newSecrets();
  if (key === ' ') eveRun = !eveRun;
  if (key === LEFT_ARROW) eveSpeed = max(1, floor(eveSpeed / 2));
  if (key === RIGHT_ARROW) eveSpeed = min(5000, eveSpeed * 2);
  return false;
}

// ---------- やってみよう ----------
// 1. p = 23 だとイブは一瞬。p = 999983 で速さ 20 だと何秒かかる？ 速さを上げると？
// 2. 紙で p = 23, g = 5, a = 6, b = 15 を計算して、2 人の鍵が同じになるのを確かめよう
// 3. イブが「なりすまし」（アリスにはボブのふり、ボブにはアリスのふり）をしたら？ → 11 のデジタル署名が必要
// 4. 共有した鍵を 06 のブロック暗号の鍵にすれば、そのあとは速い共通鍵暗号で話せる

// ==================================================
// ここから下は「道具」（べき乗の余り・原始根・絵の具を混ぜる）
// ==================================================
// g^e mod m を「2 乗をくり返す」方法で速く計算（m < 10^6 なので Number で安全）
function modPow(base, e, m) {
  let r = 1, x = base % m;
  while (e > 0) { if (e & 1) r = (r * x) % m; x = (x * x) % m; e = Math.floor(e / 2); }
  return r;
}
// 原始根：g, g², g³, … が 1〜p−1 を全部まわる g
function primitiveRoot(pp) {
  let n = pp - 1, fs = [];
  for (let f = 2; f * f <= n; f++) if (n % f === 0) { fs.push(f); while (n % f === 0) n /= f; }
  if (n > 1) fs.push(n);
  for (let cand = 2; cand < pp; cand++) if (fs.every(f => modPow(cand, (pp - 1) / f, pp) !== 1)) return cand;
  return 2;
}
function mixPaint(c1, c2) { return [(c1[0] + c2[0]) / 2, (c1[1] + c2[1]) / 2, (c1[2] + c2[2]) / 2]; }
