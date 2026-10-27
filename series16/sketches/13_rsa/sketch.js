// ============================================
// 13 RSA 暗号：だれでも閉められて、1 人だけが開けられる鍵
// 2 つの素数 p, q → n = pq、φ(n) = (p−1)(q−1)、e と互いに素な公開鍵 e、秘密鍵 d = e⁻¹ mod φ(n)
// 暗号化 C = Mᵉ mod n、復号 M = Cᵈ mod n。累乗は「くり返し 2 乗法」で速く計算
// 上の欄に文を入力 / 1：p=61, q=53（英数字）  2：p=251, q=263（日本語も OK）  3：ランダムな素数
// スペース：一時停止 / F：n を素因数分解して攻撃してみる
// ============================================

let speed = 50; // ★ 1 文字を暗号化する間隔（フレーム）

let p, q, n, ph, e, d, inp, msgChars = [], t = 0, paused = false, attack = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  textWrap(CHAR);
  inp = createInput('Hello, RSA! こんにちは');
  inp.position(30, 96); inp.size(min(520, width * 0.45), 26);
  inp.style('font-size', '16px'); inp.style('background', '#221a2e'); inp.style('color', '#eee'); inp.style('border', '1px solid #555');
  inp.input(() => { t = 0; });
  setKeys(2);
}

function isPrime(x) { if (x < 2) return false; for (let k = 2; k * k <= x; k++) if (x % k === 0) return false; return true; }
function modPow(a, b, m) { let r = 1n; a %= m; while (b > 0n) { if (b & 1n) r = (r * a) % m; a = (a * a) % m; b >>= 1n; } return r; }
function modInv(a, m) { let [r0, r1, s0, s1] = [a, m, 1n, 0n]; while (r1) { let qq = r0 / r1; [r0, r1] = [r1, r0 - qq * r1]; [s0, s1] = [s1, s0 - qq * s1]; } return ((s0 % m) + m) % m; }
function gcdB(a, b) { while (b) [a, b] = [b, a % b]; return a; }

function setKeys(k) {
  if (k === 1) { p = 61n; q = 53n; }
  if (k === 2) { p = 251n; q = 263n; }
  if (k === 3) { let pick = () => { let x; do { x = floor(random(260, 900)); } while (!isPrime(x)); return BigInt(x); }; p = pick(); do { q = pick(); } while (q === p); }
  n = p * q; ph = (p - 1n) * (q - 1n);
  for (let c of [3n, 5n, 17n, 257n, 65537n]) if (c < ph && gcdB(c, ph) === 1n) { e = c; break; }
  d = modInv(e, ph); t = 0; attack = null;
}

function draw() {
  background(18, 14, 26);
  if (!paused) t++;
  fill(235); noStroke(); textSize(26); textAlign(LEFT, BASELINE);
  text('RSA 暗号：公開鍵で閉め、秘密鍵で開ける', 30, 50);
  textSize(15); fill(150);
  text('欄に文を入力　1：p=61, q=53　2：p=251, q=263（日本語 OK）　3：ランダム　スペース：' + (paused ? '再開' : '一時停止') + '　F：攻撃（素因数分解）', 30, 80);

  // 鍵
  let kx = width * 0.55, ky = 110, kw = width - kx - 30;
  fill(32, 26, 44); rect(kx - 10, ky, kw + 10, 190, 12);
  textAlign(LEFT, TOP); textSize(16);
  fill(255, 95, 109); text(`秘密：p = ${p},  q = ${q}`, kx, ky + 14);
  fill(200); text(`φ(n) = (p−1)(q−1) = ${ph}`, kx, ky + 42);
  fill(78, 225, 190); text(`公開鍵 (e, n) = (${e}, ${n})`, kx, ky + 74);
  fill(255, 95, 109); text(`秘密鍵 d = e⁻¹ mod φ(n) = ${d}`, kx, ky + 102);
  fill(150); textSize(14); text(`検算：e·d mod φ(n) = ${(e * d) % ph}（拡張ユークリッド 10 で求める）`, kx, ky + 132);
  text('n は公開。でも p, q を知らないと φ(n) も d も計算できない', kx, ky + 156);

  // 文字ごとの暗号化
  let chars = Array.from(inp.value()).slice(0, 18), shown = min(chars.length, floor(t / speed) + 1);
  let cw = min(66, (width * 0.5) / max(1, chars.length)), x0 = 30, y0 = 160;
  textAlign(CENTER, CENTER);
  let cur = -1;
  for (let i = 0; i < chars.length; i++) {
    let M = BigInt(chars[i].codePointAt(0)), x = x0 + i * cw + cw / 2;
    fill(40, 34, 56); rect(x0 + i * cw + 2, y0, cw - 4, 40, 6);
    fill(235); textSize(18); text(chars[i], x, y0 + 20);
    textSize(11); fill(150); text(String(M), x, y0 + 52);
    if (i >= shown) continue;
    if (M >= n) { fill(255, 110, 110); textSize(12); text('M ≥ n\n鍵を 2 に', x, y0 + 110); continue; }
    let C = modPow(M, e, n), back = modPow(C, d, n);
    let age = t - i * speed, scramble = age < speed * 0.6;
    fill(110, 40, 55); rect(x0 + i * cw + 2, y0 + 80, cw - 4, 40, 6);
    fill(255, 200, 90); textSize(min(13, cw * 0.22)); text(scramble ? String(floor(random(Number(n)))) : String(C), x, y0 + 100);
    if (age > speed * 0.6) { fill(30, 90, 80); rect(x0 + i * cw + 2, y0 + 160, cw - 4, 40, 6); fill(78, 225, 190); textSize(18); text(String.fromCodePoint(Number(back)), x, y0 + 180); }
    cur = i;
  }
  textAlign(LEFT, CENTER); textSize(13); fill(170);
  text('平文 M（文字コード）', x0, y0 - 14); text('暗号文 C = Mᵉ mod n（だれでも作れる）', x0, y0 + 70); text('復号 Cᵈ mod n（d を持つ人だけ）', x0, y0 + 150);

  // くり返し 2 乗法の表（いまの文字の復号）
  if (cur >= 0) {
    let M = BigInt(chars[cur].codePointAt(0));
    if (M < n) {
      let C = modPow(M, e, n), bits = d.toString(2), cc = 0, dd = 1n, ty = y0 + 240;
      fill(235); textSize(16); textAlign(LEFT, TOP);
      text(`「${chars[cur]}」の復号 ${C}^${d} mod ${n} をくり返し 2 乗法で`, x0, ty, width * 0.5); ty += 50;
      let colsX = [x0, x0 + 50, x0 + 100, x0 + 180];
      textSize(14); fill(150); ['i', 'bᵢ', 'c', 'd = C^c mod n'].forEach((h, j) => text(h, colsX[j], ty)); ty += 22;
      let rh = min(22, (height - ty - 60) / bits.length);
      for (let i = 0; i < bits.length; i++) {
        cc *= 2; dd = (dd * dd) % n;
        if (bits[i] === '1') { cc += 1; dd = (dd * C) % n; }
        fill(bits[i] === '1' ? color(255, 200, 90) : color(190)); textSize(min(14, rh * 0.8));
        text(bits.length - 1 - i, colsX[0], ty); text(bits[i], colsX[1], ty); text(cc, colsX[2], ty); text(String(dd), colsX[3], ty);
        ty += rh;
      }
      fill(150); textSize(13); text(`2 乗が ${bits.length} 回、掛け算が ${bits.split('').filter(c => c === '1').length} 回だけ（d 回掛けると ${d} 回）`, x0, ty + 6);
    }
  }
  // 攻撃
  let ay = ky + 210;
  fill(32, 26, 44); rect(kx - 10, ay, kw + 10, height - ay - 30, 12);
  fill(235); textSize(16); textAlign(LEFT, TOP); text('攻撃者の立場（F）', kx, ay + 14);
  textSize(14);
  if (attack) {
    fill(255, 200, 90); text(`試し割りで n = ${n} を割ってみる… ${attack.tries} 回で p = ${attack.p} を発見`, kx, ay + 44, kw - 10);
    fill(255, 95, 109); text(`→ q = ${n / attack.p}、φ(n) と d = ${modInv(e, (attack.p - 1n) * (n / attack.p - 1n))} が計算できてしまった！`, kx, ay + 90, kw - 10);
    fill(150); text(`n が 617 けた（2048 ビット）なら、試し割りは宇宙の寿命でも終わらない。速い分解法（15 のポラードのロー法など）でも無理 → これが RSA の安全性`, kx, ay + 140, kw - 10);
  } else { fill(150); text('F を押すと、公開されている n だけから秘密鍵を盗めるか試す', kx, ay + 44, kw - 10); }
}

function keyPressed() {
  if (document.activeElement === inp.elt) return;
  if (key >= '1' && key <= '3') setKeys(int(key));
  if (key === ' ') paused = !paused;
  if (key === 'f' || key === 'F') { let k = 2n, tries = 0; while (n % k !== 0n) { k++; tries++; } attack = { p: k, tries: tries + 1 }; }
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. 同じ文字は同じ暗号文になる → 文字の出現回数で解読されてしまう。実際の RSA は乱数を混ぜる（パディング）
// 2. 1 の鍵で日本語を入れると M ≥ n になる。なぜダメ？（mod n で別の数と区別できない）
// 3. e と d を入れかえると「署名」になる：秘密鍵で作って、公開鍵でだれでも確かめられる
