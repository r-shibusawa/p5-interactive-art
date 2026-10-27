// ============================================
// 08 FFT：分けて、まとめる（再帰とバタフライ）
// 1：再帰の木　偶数番目と奇数番目に分けて半分の DFT を 2 つ → 「バタフライ」でまとめる（再帰版 FFT）
// 2：バタフライ回路　葉の並び（ビット反転順）から始めて、下から順にまとめる（反復版 FFT）
// スペース：1 段進む / A：自動 / R：最初から / ←→：n = 4, 8, 16 / 入力の丸をクリック：値を変える
// 3：インパルス  4：定数  5：方形波  6：ランダム（M でモード切りかえ）
// ============================================

let n = 8;        // ★ 点の数（2 の累乗）
let speed = 60;   // ★ 自動再生の間隔（フレーム）

let mode = 2, a = [], stagesV = [], tree = [], maxMag = 1, stage = 0, auto = false, timer = 0, flow = 0;

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); input(5); }

function input(k) {
  a = [];
  for (let j = 0; j < n; j++) {
    if (k === 3) a.push(j === 0 ? 1 : 0);
    if (k === 4) a.push(1);
    if (k === 5) a.push(j < n / 2 ? 1 : -1);
    if (k === 6) a.push(floor(random(-2, 3)));
  }
  computeFFT(); stage = 0;
}

const cmul = (p, q) => [p[0] * q[0] - p[1] * q[1], p[0] * q[1] + p[1] * q[0]];
const cadd = (p, q) => [p[0] + q[0], p[1] + q[1]];
const csub = (p, q) => [p[0] - q[0], p[1] - q[1]];
const w = (m, j) => [cos((TWO_PI * j) / m), sin((TWO_PI * j) / m)]; // ω_m^j
function rev(i, bits) { let r = 0; for (let b = 0; b < bits; b++) if (i & (1 << b)) r |= 1 << (bits - 1 - b); return r; }

function computeFFT() {
  let L = round(log(n) / log(2));
  // 反復版：ビット反転してから、長さ 2, 4, 8 … のバタフライ
  let A = []; for (let i = 0; i < n; i++) A.push([a[rev(i, L)], 0]);
  stagesV = [A.map(v => v.slice())];
  for (let s = 1; s <= L; s++) {
    let m = 1 << s;
    for (let k0 = 0; k0 < n; k0 += m) for (let j = 0; j < m / 2; j++) {
      let t = cmul(w(m, j), A[k0 + j + m / 2]), u = A[k0 + j];
      A[k0 + j] = cadd(u, t); A[k0 + j + m / 2] = csub(u, t);
    }
    stagesV.push(A.map(v => v.slice()));
  }
  // 再帰版の木：各ノードは「係数の番号のリスト」と DFT の結果
  tree = [];
  function rec(idx, d) {
    let node = { idx, d, y: null };
    (tree[d] = tree[d] || []).push(node);
    if (idx.length === 1) { node.y = [[a[idx[0]], 0]]; return node.y; }
    let y0 = rec(idx.filter((_, i) => i % 2 === 0), d + 1), y1 = rec(idx.filter((_, i) => i % 2 === 1), d + 1);
    let m = idx.length, y = [];
    for (let k = 0; k < m / 2; k++) { let t = cmul(w(m, k), y1[k]); y[k] = cadd(y0[k], t); y[k + m / 2] = csub(y0[k], t); }
    node.y = y; return y;
  }
  rec([...Array(n).keys()], 0);
  maxMag = 1e-9; for (let st of stagesV) for (let v of st) maxMag = max(maxMag, mag(v[0], v[1])); // 針の長さのものさし
}

function maxStage() { let L = round(log(n) / log(2)); return mode === 1 ? 2 * L : L; }

function draw() {
  background(18, 14, 26);
  if (auto && ++timer % speed === 0) stage = stage >= maxStage() ? 0 : stage + 1;
  flow = (flow + 0.02) % 1;
  fill(235); noStroke(); textSize(26); textAlign(LEFT, BASELINE);
  text(mode === 1 ? 'FFT：再帰の木（分けて、まとめる）' : 'FFT：バタフライ回路（反復版）', 30, 50);
  textSize(15); fill(150);
  text('M：モード切りかえ　スペース：1 段　A：自動' + (auto ? '（中）' : '') + '　R：最初から　←→：n = ' + n + '　入力クリック：値　3：インパルス　4：定数　5：方形波　6：ランダム', 30, 80);
  if (mode === 1) drawTree(); else drawButterfly();
}

function phasor(x, y, v, r, col) {
  let mg = mag(v[0], v[1]), s = min(1, mg / maxMag) * r;
  noFill(); stroke(60, 52, 80); strokeWeight(1); circle(x, y, r * 2);
  if (mg > 1e-9) { stroke(col); strokeWeight(2.5); line(x, y, x + (v[0] / mg) * s, y - (v[1] / mg) * s); }
  noStroke(); fill(col); circle(x, y, 4);
}

function drawTree() {
  let L = round(log(n) / log(2)), top = 125, rowH = (height - 280) / (L + 0.7);
  // stage 0..L：下へ分ける / L..2L：上へまとめる
  let downTo = min(stage, L), upFrom = stage > L ? L - (stage - L) : L + 1;
  for (let d = 0; d <= L; d++) {
    if (d > downTo) continue;
    let nodes = tree[d], bw = (width - 80) / nodes.length;
    for (let i = 0; i < nodes.length; i++) {
      let nd = nodes[i], x = 40 + i * bw, y = top + d * rowH;
      let done = d >= upFrom || (d === L && stage >= L);
      fill(done ? color(30, 70, 66) : color(40, 34, 56)); stroke(done ? color(78, 225, 190) : color(90, 80, 120)); strokeWeight(1.5);
      rect(x + 4, y, bw - 8, rowH * 0.62, 8);
      noStroke(); fill(230); textAlign(CENTER, TOP); textSize(min(16, bw / (nd.idx.length * 2.2)));
      text(nd.idx.map(j => 'a' + sub(j)).join(' '), x + bw / 2, y + 6);
      if (done) { let pr = min(22, bw / (nd.y.length * 2.6), rowH * 0.18); for (let k = 0; k < nd.y.length; k++) phasor(x + bw / 2 + (k - (nd.y.length - 1) / 2) * pr * 2.4, y + rowH * 0.42, nd.y[k], pr, color(255, 200, 90)); }
      if (d < L && d < downTo) { stroke(255, 95, 109, 150); strokeWeight(2); let cy = y + rowH * 0.62, ny = top + (d + 1) * rowH; line(x + bw * 0.5, cy, x + bw * 0.25, ny); line(x + bw * 0.5, cy, x + bw * 0.75, ny); }
    }
  }
  let my = height - 120; noStroke(); fill(32, 26, 44); rect(30, my, width - 60, 100, 12);
  fill(235); textSize(16); textAlign(LEFT, TOP);
  let m = stage <= L ? `分ける：番号が偶数（0, 2, 4…）と奇数（1, 3, 5…）に分ける。A(x) = A⁰(x²) + x·A¹(x²)。いま ${downTo} 段目まで` :
    `まとめる（バタフライ）：yₖ = y⁰ₖ + ωᵏ·y¹ₖ、yₖ₊ₘ/₂ = y⁰ₖ − ωᵏ·y¹ₖ。黄色い針が各 DFT の値（長さ = 大きさ、向き = 位相）`;
  text(m, 46, my + 14, width - 100);
  fill(150); textSize(14);
  text('いちばん下の葉の並び a₀ a₄ a₂ a₆ a₁ a₅ a₃ a₇ は、番号を 2 進数で逆から読んだ順（ビット反転）。だから反復版は最初にビット反転で並べかえる。各段 Θ(n)、段数 log n → Θ(n log n)', 46, my + 50, width - 100);
}

function drawButterfly() {
  let L = round(log(n) / log(2)), top = 130, H = height - 270, rowH = H / (n - 1), left = 140, colW = (width - left - 330) / L;
  let X = s => left + s * colW, Y = i => top + i * rowH;
  // 線
  for (let s = 1; s <= L; s++) {
    let m = 1 << s, active = s === stage, past = s < stage;
    for (let k0 = 0; k0 < n; k0 += m) for (let j = 0; j < m / 2; j++) {
      let u = k0 + j, v = k0 + j + m / 2;
      stroke(active ? color(255, 200, 90) : past ? color(78, 225, 190, 140) : color(70, 60, 95)); strokeWeight(active ? 2.5 : 1.5);
      line(X(s - 1), Y(u), X(s), Y(u)); line(X(s - 1), Y(v), X(s), Y(v)); line(X(s - 1), Y(u), X(s), Y(v)); line(X(s - 1), Y(v), X(s), Y(u));
      if (active) {
        noStroke(); fill(255, 200, 90);
        for (let [p, q] of [[u, u], [v, v], [u, v], [v, u]]) circle(lerp(X(s - 1), X(s), flow), lerp(Y(p), Y(q), flow), 7);
      }
      if (rowH > 22 || j === 0) { noStroke(); fill(255, 150, 160); textSize(12); textAlign(CENTER, BOTTOM); text(`ω${sub(m)}${sup(j)}`, lerp(X(s - 1), X(s), 0.25), Y(v) - 3); }
    }
  }
  // ノード（値は針で表示）
  for (let s = 0; s <= L; s++) for (let i = 0; i < n; i++) {
    let shown = s <= stage, v = stagesV[s][i], r = min(16, rowH * 0.42);
    noStroke(); fill(28, 22, 38); circle(X(s), Y(i), r * 2.2);
    if (shown) phasor(X(s), Y(i), v, r, s === L ? color(78, 225, 190) : color(255, 200, 90));
  }
  // 入力ラベル（ビット反転）
  textAlign(RIGHT, CENTER); textSize(min(15, rowH * 0.5));
  for (let i = 0; i < n; i++) { let j = rev(i, L); fill(230); noStroke(); text(`a${sub(j)} = ${a[j]}`, X(0) - 24, Y(i) - 7); fill(150); text(`${bin(i, L)} → ${bin(j, L)}`, X(0) - 24, Y(i) + 9); }
  // 出力の大きさ
  let ox = X(L) + 40;
  for (let i = 0; i < n; i++) {
    let v = stagesV[L][i], mg = mag(v[0], v[1]);
    fill(stage >= L ? color(78, 225, 190) : color(60, 52, 80)); noStroke();
    rect(ox, Y(i) - min(10, rowH * 0.3), (mg / n) * 160, min(20, rowH * 0.6), 4);
    fill(200); textAlign(LEFT, CENTER); textSize(min(14, rowH * 0.5)); text(`y${sub(i)}  |${mg.toFixed(2)}|`, ox + 170, Y(i));
  }
  let my = height - 120; noStroke(); fill(32, 26, 44); rect(30, my, width - 60, 100, 12);
  fill(235); textSize(16); textAlign(LEFT, TOP);
  text(stage === 0 ? '0 段目：入力をビット反転順（番号の 2 進数を逆から読む）に並べる。左の数字を見よう' :
    stage < L ? `${stage} 段目：長さ ${1 << stage} のバタフライ。上 = u + ωt、下 = u − ωt（掛け算は 1 回で 2 つの値ができる）` :
    `完成：${L} 段 × ${n / 2} 個のバタフライ = ${(L * n) / 2} 回の複素数の掛け算（DFT のままなら ${n * n} 回）`, 46, my + 14, width - 100);
  fill(150); textSize(14);
  text('針の長さ = 大きさ、向き = 位相。方形波（5）は奇数番目の周波数だけが残る。インパルス（3）は全部同じ長さ、定数（4）は y₀ だけ。各段は全部同時に計算できる（並列化しやすい、ハードウェア向き）', 46, my + 50, width - 100);
}

function mousePressed() {
  if (mode !== 2) return;
  let L = round(log(n) / log(2)), rowH = (height - 270) / (n - 1);
  for (let i = 0; i < n; i++) if (dist(mouseX, mouseY, 140, 130 + i * rowH) < 16) { let j = rev(i, L); a[j] = a[j] >= 2 ? -1 : a[j] + 1; computeFFT(); }
}
function keyPressed() {
  if (key === ' ') stage = stage >= maxStage() ? 0 : stage + 1;
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'r' || key === 'R') stage = 0;
  if (key === 'm' || key === 'M') { mode = 3 - mode; stage = 0; }
  if (key >= '3' && key <= '6') input(int(key));
  if (key === '1' || key === '2') { mode = int(key); stage = 0; }
  if (key === RIGHT_ARROW && n < 16) { n *= 2; input(5); }
  if (key === LEFT_ARROW && n > 4) { n /= 2; input(5); }
}
function bin(v, L) { return v.toString(2).padStart(L, '0'); }
function sub(k) { return String(k).split('').map(c => '₀₁₂₃₄₅₆₇₈₉'[c]).join(''); }
function sup(k) { return String(k).split('').map(c => '⁰¹²³⁴⁵⁶⁷⁸⁹'[c]).join(''); }
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. 再帰の木（1）の葉の並びと、バタフライ回路（2）の入力の並びが同じことを確かめる
// 2. n = 16 で掛け算の回数を数える。DFT のままの何分の 1？ n = 1024 なら？
// 3. 入力を 1 つだけ 1 にする位置を変えると、出力の大きさは変わらず、針の向きだけが変わる
