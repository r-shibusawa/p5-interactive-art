// ============================================
// 12 中国剰余定理：2 つの余りから 1 つの数へ
// 「3 で割ると 2 余り、5 で割ると 3 余る数は？」n₁ と n₂ が互いに素なら、0 〜 n₁n₂−1 にちょうど 1 つある
// 数 k をマス（k mod n₁, k mod n₂）に置いていくと、斜めに進んで端で反対側へワープし、全部のマスを 1 回ずつ通る
// マスをクリック：その余りの組になる数を計算 / スペース：一時停止 / R：最初から
// ←→：n₂ / ↑↓：n₁ / 1：3 と 5　2：4 と 9　3：7 と 11　4：4 と 6（互いに素でない）
// ============================================

let n1 = 3, n2 = 5;   // ★ 2 つの割る数
let rate = 0.15;      // ★ 1 フレームに進む数の量

let k = 0, paused = false, pick = null;

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); colorMode(HSB, 360, 100, 100, 100); }
function gcd(x, y) { while (y) [x, y] = [y, x % y]; return x; }
function modInv(x, m) { let [r0, r1, s0, s1] = [x % m, m, 1, 0]; while (r1) { let q = floor(r0 / r1); [r0, r1] = [r1, r0 - q * r1]; [s0, s1] = [s1, s0 - q * s1]; } return r0 === 1 ? ((s0 % m) + m) % m : null; }

function draw() {
  background(265, 45, 10);
  let N = n1 * n2;
  if (!paused) k = min(N + 30, k + rate);
  fill(0, 0, 92); noStroke(); textSize(26); textAlign(LEFT, BASELINE);
  text(`中国剰余定理：mod ${n1} と mod ${n2} の余りから mod ${N} へ`, 30, 50);
  textSize(15); fill(0, 0, 60);
  text('マスをクリック：計算　スペース：' + (paused ? '再開' : '一時停止') + '　R：最初から　↑↓：n₁　←→：n₂　1：3, 5　2：4, 9　3：7, 11　4：4, 6', 30, 80);

  let gw = width * 0.55, gh = height - 180, cs = min(gw / n2, gh / n1, 70), ox = 70, oy = 130;
  textSize(14); fill(0, 0, 60); textAlign(CENTER, BOTTOM);
  for (let j = 0; j < n2; j++) text(j, ox + j * cs + cs / 2, oy - 4);
  textAlign(RIGHT, CENTER); for (let i = 0; i < n1; i++) text(i, ox - 8, oy + i * cs + cs / 2);
  fill(0, 0, 75); textAlign(LEFT, BOTTOM); text(`k mod ${n2} →`, ox, oy - 22); push(); translate(ox - 36, oy); rotate(HALF_PI); textAlign(LEFT, BOTTOM); text(`k mod ${n1} →`, 0, 0); pop();
  let cell = {};
  for (let v = 0; v < min(N, floor(k)); v++) cell[(v % n1) + ',' + (v % n2)] = v;
  for (let i = 0; i < n1; i++) for (let j = 0; j < n2; j++) {
    let v = cell[i + ',' + j], x = ox + j * cs, y = oy + i * cs;
    fill(v === undefined ? color(265, 30, 16) : color((v * 360) / N, 55, 80)); stroke(265, 45, 10); strokeWeight(2); rect(x, y, cs, cs, 6);
    if (v !== undefined) { noStroke(); fill(0, 0, 8); textAlign(CENTER, CENTER); textSize(cs * 0.36); text(v, x + cs / 2, y + cs / 2); }
    if (pick && pick[0] === i && pick[1] === j) { noFill(); stroke(45, 90, 100); strokeWeight(4); rect(x + 2, y + 2, cs - 4, cs - 4, 6); }
  }
  // いま置いた数の動き（斜めに進む）
  let cur = floor(k) - 1;
  if (cur >= 0 && cur < N) { let x = ox + (cur % n2) * cs + cs / 2, y = oy + (cur % n1) * cs + cs / 2; noFill(); stroke(0, 0, 100); strokeWeight(3); circle(x, y, cs * 0.9); }

  let px = ox + n2 * cs + 50, w = width - px - 30, yy = 130;
  textAlign(LEFT, TOP); noStroke(); textSize(17);
  let g = gcd(n1, n2);
  if (g === 1) { fill(150, 60, 95); text(`gcd(${n1}, ${n2}) = 1 → ${N} 個の数がちょうど ${N} 個のマスに 1 つずつ入る（1 対 1）`, px, yy, w); }
  else { fill(0, 70, 95); text(`gcd(${n1}, ${n2}) = ${g} ≠ 1 → 数は ${N / g} 周期でくり返し、マスの 1/${g} しか埋まらない。答えがない組・答えが複数の組ができる`, px, yy, w); }
  yy += 90;
  if (pick) {
    let [r1, r2] = pick;
    fill(0, 0, 92); textSize(17); text(`x ≡ ${r1} (mod ${n1}),  x ≡ ${r2} (mod ${n2}) を解く`, px, yy, w); yy += 36;
    textSize(15);
    if (g === 1) {
      let m1 = n2, m2 = n1, c1 = m1 * modInv(m1, n1), c2 = m2 * modInv(m2, n2), x = (r1 * c1 + r2 * c2) % N;
      fill(0, 0, 80);
      text(`m₁ = n/n₁ = ${m1},  m₂ = n/n₂ = ${m2}`, px, yy, w); yy += 26;
      text(`c₁ = m₁·(m₁⁻¹ mod n₁) = ${m1}·${modInv(m1, n1)} = ${c1}　（mod ${n1} で 1、mod ${n2} で 0）`, px, yy, w); yy += 46;
      text(`c₂ = m₂·(m₂⁻¹ mod n₂) = ${m2}·${modInv(m2, n2)} = ${c2}　（mod ${n1} で 0、mod ${n2} で 1）`, px, yy, w); yy += 46;
      fill(45, 90, 100); textSize(18);
      text(`x = ${r1}·${c1} + ${r2}·${c2} mod ${N} = ${x}`, px, yy, w); yy += 40;
    } else { fill(0, 70, 95); text(cell[r1 + ',' + r2] === undefined ? 'このマスには数が来ない → 解なし' : `解は ${cell[r1 + ',' + r2]} と、${N / g} ずつずらしたもの（1 つに決まらない）`, px, yy, w); yy += 40; }
  } else { fill(0, 0, 65); textSize(15); text('マスをクリックすると、その余りの組になる数を公式で求める', px, yy, w); }
  fill(0, 0, 55); textSize(14);
  text('c₁, c₂ は「片方では 1、もう片方では 0」になる部品。これを余りの数だけ足せば答え（ラグランジュ補間と同じ発想）。\n大きな数 mod n の計算を、小さな n₁, n₂ に分けて別々に計算し、最後に組み立てられる（RSA の復号の高速化など）。', px, height - 110, w);
}

function mousePressed() {
  let cs = min((width * 0.55) / n2, (height - 180) / n1, 70), j = floor((mouseX - 70) / cs), i = floor((mouseY - 130) / cs);
  if (i >= 0 && i < n1 && j >= 0 && j < n2) pick = [i, j];
}
function keyPressed() {
  let set2 = (p, q) => { n1 = p; n2 = q; k = 0; pick = null; };
  if (key === '1') set2(3, 5);
  if (key === '2') set2(4, 9);
  if (key === '3') set2(7, 11);
  if (key === '4') set2(4, 6);
  if (key === ' ') paused = !paused;
  if (key === 'r' || key === 'R') { k = 0; pick = null; }
  if (key === RIGHT_ARROW) set2(n1, min(16, n2 + 1));
  if (key === LEFT_ARROW) set2(n1, max(2, n2 - 1));
  if (key === UP_ARROW) set2(min(12, n1 + 1), n2);
  if (key === DOWN_ARROW) set2(max(2, n1 - 1), n2);
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. 「3 で割ると 2、5 で割ると 3 余る数」を表から探して、公式の答えと比べる
// 2. 4 と 6 で、埋まらないマスの余りの組はどんな組？（偶奇が合わない）
// 3. 3 つの数（3, 5, 7）に広げるには？ 立方体のマスで考える
