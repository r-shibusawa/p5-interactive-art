// ============================================
// 07 ハッシュ関数となだれ効果
// どんな長さの文も 32 ビットの「指紋」にする。1 文字変えるだけで約半分（16 ビット）が変わる。
// 下：誕生日のパラドックス。k ビットに切り詰めたハッシュは、約 √(2^k) 個で「同じ指紋」が見つかる
// 文字を打つ = 文を入力 / Backspace = 消す / 1 = 例文 / ←→ = 切り詰めるビット数 k
// ※ 教育用（FNV-1a と自作のミックス関数。安全なハッシュは SHA-256 など）
// ============================================

let msg = 'hello world';   // ★ ハッシュする文
let kBits = 16;            // ★ 誕生日の実験で使うビット数（8〜24）
let trials = [];           // 衝突までに試した個数の記録
let perFrame = 1;          // ★ 1 フレームに何回実験するか

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('monospace');
}

function draw() {
  background(14, 18, 20);
  noStroke();
  fill(240);
  textSize(18);
  text('ハッシュ関数となだれ効果　文字を打つ・Backspace・1 例文　｜　←→ 誕生日の実験 k = ' + kBits + ' ビット', 24, 34);
  fill(150);
  textSize(14);
  text('同じ文 → いつも同じ値。でも 1 文字違うと、まったく違う値になる　｜ 教育用', 24, 56);

  // 最後の 1 文字を「次の文字」に変えた文と比べる
  let other = msg.length > 0 ? msg.slice(0, -1) + String.fromCharCode(msg.charCodeAt(msg.length - 1) + 1) : 'a';
  let y = 96;
  for (let [label, f] of [['FNV-1a 32', fnv1a], ['ミニ混ぜハッシュ', mixHash]]) {
    let h1 = f(msg), h2 = f(other);
    fill(200);
    textSize(16);
    text(label, 24, y);
    drawRow(24, y + 14, '"' + msg + (frameCount % 60 < 30 ? '_' : '') + '"', h1, 0);
    drawRow(24, y + 54, '"' + other + '"', h2, h1 ^ h2);
    fill(255, 200, 90);
    text(popcount(h1 ^ h2) + ' / 32 ビットが変わった', width - 300, y + 82);
    y += 130;
  }

  // ---- 誕生日のパラドックス
  for (let i = 0; i < perFrame; i++) trials.push(birthday(kBits));
  if (trials.length > 400) trials.shift();
  let gy = y + 20, gh = height - gy - 70, gw = width - 48;
  fill(220);
  textSize(16);
  text('誕生日のパラドックス：ランダムな文を ' + kBits + ' ビットのハッシュにして、同じ値が出るまでの個数', 24, gy);
  let theory = Math.sqrt(Math.PI / 2 * Math.pow(2, kBits));
  let mean = trials.reduce((a, b) => a + b, 0) / max(1, trials.length);
  // 個数のヒストグラム（横軸 0〜4×理論値）
  let bins = new Array(40).fill(0);
  for (let t of trials) bins[min(39, floor(t / (theory * 4) * 40))]++;
  let mb = max(bins), bw = gw / 40;
  for (let i = 0; i < 40; i++) {
    let h = bins[i] / max(1, mb) * (gh - 30);
    fill(110, 170, 230);
    rect(24 + i * bw + 1, gy + gh - h, bw - 2, h, 2);
  }
  stroke(255, 200, 90);
  strokeWeight(2);
  let tx = 24 + gw / 4;
  line(tx, gy + 20, tx, gy + gh);
  noStroke();
  fill(255, 200, 90);
  textSize(15);
  text('理論 √(π/2 · 2^k) ≈ ' + nf(theory, 1, 0), tx + 8, gy + 36);
  fill(240);
  textSize(17);
  text('平均 ' + nf(mean, 1, 0) + ' 個で衝突（全部で 2^' + kBits + ' = ' + pow(2, kBits).toLocaleString() + ' 通りもあるのに！）', 24, height - 40);
  fill(150);
  textSize(14);
  text('256 ビットなら約 2^128 個必要 → 宇宙の年齢でも足りない。だから安全なハッシュは長い', 24, height - 16);
}

// 32 ビットを 32 個の四角で（diff の立っているビットは赤）
function drawRow(x, y, label, h, diff) {
  let bw = min(22, (width - 520) / 32);
  for (let b = 0; b < 32; b++) {
    let v = (h >>> (31 - b)) & 1, d = (diff >>> (31 - b)) & 1;
    fill(d ? color(255, 90, 90) : (v ? color(220, 235, 230) : color(40, 52, 56)));
    rect(x + b * bw, y, bw - 2, 26, 3);
  }
  fill(180);
  textSize(15);
  text(hex8(h) + '  ' + label.slice(0, 40), x + 32 * bw + 12, y + 19);
}

// ★ 誕生日の実験：ランダムな文字列を k ビットのハッシュにして、2 回目の値が出たら終わり
function birthday(k) {
  let seen = new Set(), mask = k >= 32 ? 0xFFFFFFFF : (1 << k) - 1;
  for (let n = 1; n < 1 << 22; n++) {
    let s = 'm' + floor(random(1e9)) + ':' + n;
    let h = (mixHash(s) & mask) >>> 0;
    if (seen.has(h)) return n;
    seen.add(h);
  }
  return 1 << 22;
}

function keyPressed() {
  if (key === LEFT_ARROW) { kBits = max(8, kBits - 2); trials = []; }
  else if (key === RIGHT_ARROW) { kBits = min(24, kBits + 2); trials = []; }
  else if (key === 'Backspace') msg = msg.slice(0, -1);
  else if (key === '1') msg = 'hello world';
  else if (key.length === 1 && msg.length < 40) msg += key;
  return false;
}

// ---------- やってみよう ----------
// 1. "hello world" と "hello worle" の違いは 1 文字。何ビット変わる？ 何回か試して平均は 16 に近い？
// 2. k を 2 増やすと、衝突までの個数は約何倍になる？（√2 倍 × √2 倍 = 2 倍）
// 3. mixHash の中の掛け算の数（0x85EBCA6B）を 1 にすると、なだれ効果はどうなる？
// 4. パスワードはそのまま保存せず、ハッシュ値を保存する。なぜ？ 同じパスワードの人がいたら？

// ==================================================
// ここから下は「道具」（2 つのハッシュ関数とビットの道具）
// ==================================================
// FNV-1a：1 文字ずつ XOR して素数を掛ける。単純で速い（安全用ではない）
function fnv1a(s) {
  let h = 0x811C9DC5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
// ミニ混ぜハッシュ：1 文字ごとに回転・掛け算し、最後に「混ぜる」処理を 3 回（なだれ効果を強くする）
function mixHash(s) {
  let h = 0x9E3779B9 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 0xCC9E2D51);
    h = (h << 13) | (h >>> 19);
    h = Math.imul(h, 5) + 0xE6546B64;
  }
  h ^= h >>> 16; h = Math.imul(h, 0x85EBCA6B);
  h ^= h >>> 13; h = Math.imul(h, 0xC2B2AE35);
  h ^= h >>> 16;
  return h >>> 0;
}
function popcount(v) { let c = 0; v >>>= 0; while (v) { c += v & 1; v >>>= 1; } return c; }
function hex8(v) { return (v >>> 0).toString(16).toUpperCase().padStart(8, '0'); }
