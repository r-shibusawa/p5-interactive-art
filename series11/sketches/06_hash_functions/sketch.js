// ============================================
// 06 よいハッシュ関数とは
// よいハッシュ関数 = キーをマスに「均等に」ばらまく。キーにかたよった規則があっても崩れないことが大切
// 割り算法 h(k) = k mod m：m が 2 のべき乗だと、下のビットしか見ないので規則的なキーに弱い
// かけ算法 h(k) = ⌊m (kA mod 1)⌋：m は何でもよい
// ユニバーサル・ハッシュ h(k) = ((ak + b) mod p) mod m：a, b を毎回ランダムに選ぶ → どんな悪いキーの並びにも平均では強い
// 操作：1 = 割り算法 / 2 = かけ算法 / 3 = ユニバーサル（R で a, b を引き直す）
//       4 = ランダムなキー / 5 = 16 の倍数のキー / 6 = 連番のキー / ↑↓ = m / スペース = 一時停止
// ============================================

let m = 16;          // ★ マスの数（16 と 17 で割り算法をくらべよう）
let nKeys = 240;     // ★ キーの個数
let p = 1000003;     // ユニバーサル・ハッシュで使う素数（キーより大きい）
let A = (Math.sqrt(5) - 1) / 2;
let a = 1, b = 0;
let method = 1, keySet = 5;
let keys = [], placed = 0, counts = [], drops = [], paused = false;
let names = { 1: '割り算法 k mod m', 2: 'かけ算法 ⌊m(kA mod 1)⌋', 3: 'ユニバーサル ((ak+b) mod p) mod m' };
let setNames = { 4: 'ランダム', 5: '16 の倍数（16, 32, 48, …）', 6: '連番（1000, 1001, …）' };

function setup() {
  createCanvas(windowWidth, windowHeight);
  drawAB();
  restart();
}
function drawAB() { a = floor(random(1, p)); b = floor(random(0, p)); }

function hashOf(k) {
  if (method === 1) return k % m;
  if (method === 2) return floor(m * ((k * A) % 1));
  return Number((BigInt(a) * BigInt(k) + BigInt(b)) % BigInt(p)) % m; // 大きな数のかけ算は BigInt で正確に
}
function makeKeys() {
  keys = [];
  for (let i = 0; i < nKeys; i++) {
    if (keySet === 4) keys.push(floor(random(1, 100000)));
    if (keySet === 5) keys.push(16 * (i + 1));
    if (keySet === 6) keys.push(1000 + i);
  }
}
function restart() { makeKeys(); placed = 0; counts = new Array(m).fill(0); drops = []; }

function draw() {
  background(16, 16, 24);
  // キーを 1 フレームに 2 個ずつ落とす
  for (let s = 0; s < 2 && !paused && placed < keys.length; s++) {
    let k = keys[placed++], hb = hashOf(k);
    drops.push({ k, hb, t: 0, x0: random(width * 0.1, width * 0.9) });
  }
  let bx = 60, bw = (width - 120) / m, base = height - 150;
  for (let d of drops) d.t += 0.04;
  for (let d of drops) if (d.t >= 1 && !d.done) { counts[d.hb]++; d.done = true; }
  drops = drops.filter((d) => !d.done);

  noStroke(); fill(240); textAlign(LEFT, TOP); textSize(26);
  text('よいハッシュ関数とは', 30, 24);
  fill(170, 170, 200); textSize(15);
  text('1 割り算法　2 かけ算法　3 ユニバーサル（R で引き直し）　4〜6 キーの種類　↑↓ m　スペース 一時停止', 30, 60);
  fill(255); textSize(19);
  text(`ハッシュ関数：${names[method]}　キー：${setNames[keySet]}　m = ${m}${m && (m & (m - 1)) === 0 ? '（2 のべき乗）' : ''}`, 30, 88);
  if (method === 3) { fill(170); textSize(14); text(`a = ${a}, b = ${b}, p = ${p}`, 30, 116); }

  // 落ちてくるキー
  for (let d of drops) {
    let x = lerp(d.x0, bx + (d.hb + 0.5) * bw, d.t), y = lerp(140, base, d.t * d.t);
    fill(255, 200, 120, 200); circle(x, y, 7);
  }
  // 棒グラフ
  let ideal = placed / m, mx = max(1, max(counts), ideal * 2);
  for (let i = 0; i < m; i++) {
    let hgt = (counts[i] / mx) * (base - 180);
    fill(counts[i] > ideal * 1.8 ? color(255, 110, 110) : color(120, 170, 255));
    rect(bx + i * bw + 2, base - hgt, bw - 4, hgt, 3);
    fill(150); textAlign(CENTER, TOP); textSize(min(13, bw * 0.5));
    text(i, bx + (i + 0.5) * bw, base + 6);
  }
  stroke(255, 225, 140); strokeWeight(2);
  let iy = base - (ideal / mx) * (base - 180);
  line(bx, iy, width - 60, iy);
  noStroke(); fill(255, 225, 140); textAlign(RIGHT, BOTTOM); textSize(14);
  text(`理想（均等）= ${nf(ideal, 1, 1)} 個`, width - 60, iy - 4);

  // 衝突の数：同じマスのペアの数 Σ C(c, 2)
  let coll = counts.reduce((s, c) => s + (c * (c - 1)) / 2, 0);
  let expect = (placed * (placed - 1)) / (2 * m);
  let empty = counts.filter((c) => c === 0).length;
  fill(220); textAlign(LEFT, TOP); textSize(18);
  text(`衝突したペア ${coll}（ランダムなら約 ${round(expect)}）　空のマス ${empty} / ${m}　いちばん多いマス ${max(counts)} 個`, 30, height - 100);
  fill(255, 225, 140);
  text(verdict(coll, expect, empty), 30, height - 66);
}
function verdict(coll, expect, empty) {
  if (placed < 20) return 'キーを入れています…';
  if (coll > expect * 2 || empty > m / 2) return '× かたよっている！ 特定のマスにキーが集中（探索が遅くなる）';
  return '○ ほぼ均等にばらけている';
}
function keyPressed() {
  if (key >= '1' && key <= '3') { method = int(key); if (method === 3) drawAB(); restart(); }
  if (key >= '4' && key <= '6') { keySet = int(key); restart(); }
  if (key.toLowerCase() === 'r') { drawAB(); restart(); }
  if (key === UP_ARROW) { m = min(40, m + 1); restart(); }
  if (key === DOWN_ARROW) { m = max(2, m - 1); restart(); }
  if (key === ' ') paused = !paused;
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. 1（割り算法）+ 5（16 の倍数）+ m = 16 → 全部 0 番へ！ ↑ で m = 17（素数）にすると？
// 2. 同じ 16 の倍数でも 2（かけ算法）や 3（ユニバーサル）なら均等になる
// 3. 実際のソフトでは、パスワードなどは暗号学的ハッシュ（SHA-256）、表には高速なハッシュ（xxHash や SipHash など）を使い分ける
