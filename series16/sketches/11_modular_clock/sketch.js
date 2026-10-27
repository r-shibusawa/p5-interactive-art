// ============================================
// 11 mod n の時計：群・部分群・合同式
// 0 〜 n−1 を時計の文字盤に並べる。足し算・掛け算は n で割った余り
// 1：かけ算の表（k → a·k mod n の弦）と Zₙ*（n と互いに素な数＝逆数がある数）
// 2：累乗 1, a, a², … で一周する部分群。長さ = 位数。全部まわれば「原始根」
// 3：一次合同式 ax ≡ b (mod n) の解。d = gcd(a, n) が b を割れば解が d 個
// ←→：n を変える / ↑↓：a を変える / 数字をクリック：2 では a、3 では b にする
// ============================================

let n = 19, a = 2, b = 4, mode = 2; // ★ 最初の値
let anim = 0;

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); colorMode(HSB, 360, 100, 100, 100); }

function gcd(x, y) { while (y) [x, y] = [y, x % y]; return x; }
function phi(m) { let c = 0; for (let k = 1; k <= m; k++) if (gcd(k, m) === 1) c++; return c; }
function powers(g) { let out = [], v = 1 % n, seen = new Set(); while (!seen.has(v)) { seen.add(v); out.push(v); v = (v * g) % n; } return { out, back: v }; }

function draw() {
  background(265, 45, 10);
  anim += 0.04;
  let cx = width * 0.33, cy = height * 0.57, R = min(width * 0.27, height * 0.36);
  fill(0, 0, 92); noStroke(); textSize(26); textAlign(LEFT, BASELINE);
  text(`mod ${n} の時計`, 30, 50);
  textSize(15); fill(0, 0, 60);
  text(`1：かけ算の表　2：累乗と部分群　3：一次合同式　←→：n = ${n}　↑↓：a = ${a}　数字をクリック：${mode === 3 ? 'b' : 'a'} を選ぶ`, 30, 80);
  let P = k => [cx + cos(-HALF_PI + (TWO_PI * k) / n) * R, cy + sin(-HALF_PI + (TWO_PI * k) / n) * R];
  noFill(); stroke(0, 0, 25); strokeWeight(1.5); circle(cx, cy, R * 2);

  let px = width * 0.66, w = width - px - 30, yy = 120, unit = new Set();
  for (let k = 1; k < n; k++) if (gcd(k, n) === 1) unit.add(k);
  let hl = new Set(), msgs = [];

  if (mode === 1) {
    for (let k = 0; k < n; k++) { let [x1, y1] = P(k), [x2, y2] = P((a * k) % n); stroke((k * 360) / n, 60, 90, 60); strokeWeight(1.5); line(x1, y1, x2, y2); }
    unit.forEach(k => hl.add(k));
    msgs.push(`k → ${a}·k mod ${n} の弦（かけ算の表の模様）`);
    msgs.push(`Zₙ* = n と互いに素な数 = 逆数がある数（明るい丸）：${phi(n)} 個（オイラーの φ(${n}) = ${phi(n)}）`);
    msgs.push(gcd(a, n) === 1 ? `${a} は互いに素 → 弦は 1 対 1（並べかえ）。${a} の逆数は ${inv(a)}（${a}·${inv(a)} ≡ 1）` : `${a} は ${n} と公約数 ${gcd(a, n)} をもつ → 同じ点に集まる弦がある（逆数なし）`);
  }
  if (mode === 2) {
    let { out } = powers(a), m = out.length, shown = min(m, floor(anim * 2) % (m + 4));
    stroke(45, 90, 100); strokeWeight(3); noFill(); beginShape();
    for (let i = 0; i <= shown && i <= m; i++) { let [x, y] = P(out[i % m]); vertex(x, y); }
    endShape();
    out.forEach(v => hl.add(v));
    let isPrim = gcd(a, n) === 1 && m === phi(n);
    let prims = []; for (let g = 1; g < n; g++) if (gcd(g, n) === 1 && powers(g).out.length === phi(n)) prims.push(g);
    msgs.push(`${a} の累乗：${out.slice(0, 16).join(' → ')}${m > 16 ? ' …' : ''} → ${out[0]}`);
    msgs.push(gcd(a, n) !== 1 ? `${a} と ${n} は互いに素でないので 1 に戻らない（Zₙ* の外）` : `位数 ord(${a}) = ${m}。部分群 ⟨${a}⟩ の大きさ ${m} は |Zₙ*| = ${phi(n)} を割り切る（ラグランジュの定理）`);
    msgs.push(isPrim ? `★ ${a} は原始根！ 累乗で Zₙ* を全部まわる（Zₙ* は巡回群）` : `原始根ではない。`);
    msgs.push(`mod ${n} の原始根：${prims.length ? prims.join(', ') : 'なし'}（素数 p なら必ずある）`);
    msgs.push(gcd(a, n) === 1 ? `オイラーの定理：${a}^φ(n) ≡ 1、n が素数ならフェルマーの小定理 ${a}^(n−1) ≡ 1` : '');
  }
  if (mode === 3) {
    let d = gcd(a, n);
    for (let x = 0; x < n; x++) { let [x1, y1] = P(x), [x2, y2] = P((a * x) % n); let on = (a * x) % n === b % n; stroke(on ? color(45, 90, 100) : color(0, 0, 50, 40)); strokeWeight(on ? 3 : 1); line(x1, y1, lerp(x1, x2, 0.97), lerp(y1, y2, 0.97)); if (on) hl.add(x); }
    let [bx, by] = P(b); noFill(); stroke(150, 70, 95); strokeWeight(4); circle(bx, by, 40);
    msgs.push(`${a}x ≡ ${b} (mod ${n}) を解く。x → ${a}x mod ${n} の矢印のうち、${b}（緑の輪）に届くものが解`);
    msgs.push(`d = gcd(${a}, ${n}) = ${d}`);
    if (b % d === 0) {
      let e = extGcd(a, n), x0 = ((((e.x * (b / d)) % n) + n) % n);
      let sols = []; for (let i = 0; i < d; i++) sols.push((x0 + i * (n / d)) % n);
      msgs.push(`d が ${b} を割る → 解はちょうど ${d} 個：x = ${sols.sort((p, q) => p - q).join(', ')}`);
      msgs.push(`作り方：拡張ユークリッドで ${a}·(${e.x}) + ${n}·(${e.y}) = ${d}。x₀ = ${e.x}·(${b}/${d}) mod ${n}、そこから n/d = ${n / d} おき`);
    } else msgs.push(`d = ${d} が ${b} を割らない → 解なし（${a}x はいつも ${d} の倍数にしかならない）`);
  }
  for (let k = 0; k < n; k++) {
    let [x, y] = P(k), r = constrain(R * 2.6 / n, 10, 22), on = hl.has(k);
    noStroke(); fill(on ? color((k * 360) / n, 70, 95) : unit.has(k) ? color(0, 0, 45) : color(0, 0, 22)); circle(x, y, r * 2);
    fill(on ? color(0, 0, 8) : color(0, 0, 90)); textAlign(CENTER, CENTER); textSize(r * 0.9); text(k, x, y);
  }
  noStroke(); textAlign(LEFT, TOP); textSize(16);
  for (let m of msgs) { if (!m) continue; fill(0, 0, 88); text(m, px, yy, w); yy += textWidthLines(m, w) * 24 + 14; }
  fill(0, 0, 55); textSize(14);
  text('n が素数だと 0 以外の全部が Zₙ*（割り算ができる）。\n合成数だと、約数と共通の数には逆数がない。\nRSA（13）は「n の φ(n) を知っている人だけが逆数を計算できる」ことを使う。', px, height - 100, w);
}
function inv(x) { let e = extGcd(x, n); return ((e.x % n) + n) % n; }
function extGcd(p, q) { if (q === 0) return { d: p, x: 1, y: 0 }; let r = extGcd(q, p % q); return { d: r.d, x: r.y, y: r.x - floor(p / q) * r.y }; }
function textWidthLines(s, w) { return max(1, ceil(textWidth(s) / w)); }

function mousePressed() {
  let cx = width * 0.33, cy = height * 0.57, R = min(width * 0.27, height * 0.36);
  for (let k = 0; k < n; k++) {
    let x = cx + cos(-HALF_PI + (TWO_PI * k) / n) * R, y = cy + sin(-HALF_PI + (TWO_PI * k) / n) * R;
    if (dist(mouseX, mouseY, x, y) < 20) { if (mode === 3) b = k; else { a = k; anim = 0; } }
  }
}
function keyPressed() {
  if (key >= '1' && key <= '3') { mode = int(key); anim = 0; }
  if (key === RIGHT_ARROW) { n = min(60, n + 1); a %= n; b %= n; }
  if (key === LEFT_ARROW) { n = max(2, n - 1); a %= n; b %= n; }
  if (key === UP_ARROW) { a = (a + 1) % n; anim = 0; }
  if (key === DOWN_ARROW) { a = (a - 1 + n) % n; anim = 0; }
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. 2 で n = 19（素数）の原始根を全部見つける。いくつある？（φ(18) = 6 個）
// 2. 1 で n = 200 にしたいときは上の n を書きかえる。a = 2, 3, … で模様（カーディオイドなど）
// 3. 3 で n = 12, a = 8 にして、b をいろいろ変える。解がある b はどんな数？
