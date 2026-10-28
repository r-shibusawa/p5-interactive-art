// ============================================
// 11 量子コンピュータ入門
// 3 量子ビットの回路エディタ。状態は 2³ = 8 個の複素数（振幅）。ゲートは振幅の組をまぜる操作
//   バー = 振幅（長さ = |振幅|²、色 = 位相）。測定するとその確率で 1 つの答えが出る
// パレット or 1〜7 = ゲートを選ぶ（H X Z S T ● ⊕）/ E = 消しゴム / マス目をクリック = 置く・消す / 列にマウス = その列までの状態
// B = ベル状態 / G = GHZ / D = ドイチュ＝ジョサ / V = グローバー探索（|111⟩ を探す） / C = 全部消す / M = 測定をやり直す
// ●（制御）と ⊕（反転）を同じ列に置く = CNOT。● だけを 2〜3 個 = 制御 Z（全部 1 のとき符号を反転）
// ============================================

const NQ = 3, NCOL = 14;    // ★ 量子ビットの数と列の数
const DIM = 1 << NQ;
let grid = [];              // grid[列][量子ビット] = 'H' 'X' 'Z' 'S' 'T' '●' '⊕' または ''
let gates = ['H', 'X', 'Z', 'S', 'T', '●', '⊕'];
let cur = 'H';
let shots = new Array(DIM).fill(0), nShots = 0;
let sRe = new Float64Array(DIM), sIm = new Float64Array(DIM);
let gx = 140, gy = 130, cell = 56;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  cell = min(56, (width - 200) / NCOL);
  clearAll();
  preset('B');
}
function clearAll() { grid = Array.from({ length: NCOL }, () => new Array(NQ).fill('')); resetShots(); }
function resetShots() { shots.fill(0); nShots = 0; }

function preset(k) {
  clearAll();
  let put = (c, q, g) => (grid[c][q] = g);
  if (k === 'B') { put(0, 0, 'H'); put(1, 0, '●'); put(1, 1, '⊕'); }
  if (k === 'G') { put(0, 0, 'H'); put(1, 0, '●'); put(1, 1, '⊕'); put(2, 1, '●'); put(2, 2, '⊕'); }
  if (k === 'D') {   // f(x0, x1) = x0 XOR x1（バランス型）。結果の q0 q1 が 00 以外 → バランス型
    put(0, 2, 'X'); for (let q = 0; q < 3; q++) put(1, q, 'H');
    put(2, 0, '●'); put(2, 2, '⊕'); put(3, 1, '●'); put(3, 2, '⊕'); put(4, 0, 'H'); put(4, 1, 'H');
  }
  if (k === 'V') {   // グローバー：オラクル（|111⟩ の符号を反転）＋ 拡散（平均のまわりで反転）を 2 回
    for (let q = 0; q < 3; q++) put(0, q, 'H');
    for (let r = 0; r < 2; r++) {
      let c = 1 + r * 6;
      for (let q = 0; q < 3; q++) { put(c, q, '●'); put(c + 1, q, 'H'); put(c + 2, q, 'X'); put(c + 3, q, '●'); put(c + 4, q, 'X'); put(c + 5, q, 'H'); }
    }
  }
}

// ★ 1 量子ビットのゲート：ビット q が 0 と 1 の振幅の組 (a, b) を 2×2 行列でまぜる
function apply1(g, q) {
  let m = 1 << q, r2 = Math.SQRT1_2;
  for (let i = 0; i < DIM; i++) {
    if (i & m) continue;
    let j = i | m, ar = sRe[i], ai = sIm[i], br = sRe[j], bi = sIm[j];
    if (g === 'H') { sRe[i] = (ar + br) * r2; sIm[i] = (ai + bi) * r2; sRe[j] = (ar - br) * r2; sIm[j] = (ai - bi) * r2; }
    if (g === 'X') { sRe[i] = br; sIm[i] = bi; sRe[j] = ar; sIm[j] = ai; }
    if (g === 'Z') { sRe[j] = -br; sIm[j] = -bi; }
    if (g === 'S') { sRe[j] = -bi; sIm[j] = br; }                       // ×i
    if (g === 'T') { sRe[j] = (br - bi) * r2; sIm[j] = (br + bi) * r2; } // ×e^{iπ/4}
  }
}

// 回路を最初から列 upto まで計算
function simulate(upto) {
  sRe.fill(0); sIm.fill(0); sRe[0] = 1;   // |000⟩ から
  for (let c = 0; c <= upto; c++) {
    let col = grid[c], ctrl = 0, tgt = -1;
    for (let q = 0; q < NQ; q++) {
      if (col[q] === '●') ctrl |= 1 << q;
      else if (col[q] === '⊕') tgt = q;
      else if (col[q]) apply1(col[q], q);
    }
    if (tgt >= 0) {            // 制御 NOT：● が全部 1 なら ⊕ のビットを反転
      for (let i = 0; i < DIM; i++) {
        let j = i ^ (1 << tgt);
        if ((i & ctrl) === ctrl && i < j) { let tr = sRe[i], ti = sIm[i]; sRe[i] = sRe[j]; sIm[i] = sIm[j]; sRe[j] = tr; sIm[j] = ti; }
      }
    } else if (ctrl && (ctrl & (ctrl - 1))) {   // ● が 2 個以上：制御 Z（全部 1 なら符号反転）
      for (let i = 0; i < DIM; i++) if ((i & ctrl) === ctrl) { sRe[i] = -sRe[i]; sIm[i] = -sIm[i]; }
    }
  }
}

function basisLabel(i) { let s = ''; for (let q = 0; q < NQ; q++) s += (i >> q) & 1; return '|' + s + '⟩'; }

function draw() {
  background(210, 30, 10);
  // マウスが乗っている列までを計算（乗っていなければ全部）
  let hc = floor((mouseX - gx) / cell), inGrid = hc >= 0 && hc < NCOL && mouseY > gy - 20 && mouseY < gy + NQ * cell;
  simulate(inGrid ? hc : NCOL - 1);
  // 測定のサンプリング（最後まで計算した状態から）
  if (!inGrid && nShots < 2000) {
    for (let s = 0; s < 20; s++) {
      let r = random(), acc = 0;
      for (let i = 0; i < DIM; i++) { acc += sRe[i] * sRe[i] + sIm[i] * sIm[i]; if (r < acc || i === DIM - 1) { shots[i]++; break; } }
      nShots++;
    }
  }

  // --- パレット ---
  for (let k = 0; k < gates.length; k++) {
    let x = gx + k * 52, y = 82;
    fill(gates[k] === cur ? color(55, 80, 100) : color(0, 0, 25)); noStroke(); rect(x, y, 44, 32, 6);
    fill(gates[k] === cur ? 0 : 100); textAlign(CENTER, CENTER); textSize(17); text(gates[k], x + 22, y + 16);
  }
  fill(cur === '' ? color(55, 80, 100) : color(0, 0, 25)); rect(gx + 7 * 52, 82, 60, 32, 6);
  fill(cur === '' ? 0 : 100); textSize(14); text('消す', gx + 7 * 52 + 30, 98);

  // --- 回路 ---
  for (let q = 0; q < NQ; q++) {
    let y = gy + q * cell + cell / 2;
    stroke(0, 0, 50); strokeWeight(2); line(gx - 10, y, gx + NCOL * cell, y);
    noStroke(); fill(0, 0, 100); textSize(16); text('q' + q + ' |0⟩', gx - 50, y);
  }
  if (inGrid) { noStroke(); fill(55, 80, 100, 12); rect(gx + hc * cell, gy - 10, cell, NQ * cell + 20); }
  for (let c = 0; c < NCOL; c++) {
    let col = grid[c], ys = [];
    for (let q = 0; q < NQ; q++) if (col[q] === '●' || col[q] === '⊕') ys.push(gy + q * cell + cell / 2);
    if (ys.length > 1) { stroke(190, 70, 100); strokeWeight(3); line(gx + c * cell + cell / 2, min(ys), gx + c * cell + cell / 2, max(ys)); }
    for (let q = 0; q < NQ; q++) {
      let g = col[q]; if (!g) continue;
      let x = gx + c * cell + cell / 2, y = gy + q * cell + cell / 2;
      noStroke();
      if (g === '●') { fill(190, 70, 100); circle(x, y, 14); }
      else if (g === '⊕') { noFill(); stroke(190, 70, 100); strokeWeight(3); circle(x, y, 26); line(x - 13, y, x + 13, y); line(x, y - 13, x, y + 13); }
      else { fill(230, 50, 70); rect(x - cell * 0.38, y - cell * 0.38, cell * 0.76, cell * 0.76, 6); fill(0, 0, 100); textSize(18); text(g, x, y); }
    }
  }
  textAlign(LEFT, BASELINE);

  // --- 振幅のバー（色 = 位相）と測定のヒストグラム ---
  let by = gy + NQ * cell + 70, bw = (width - 2 * gx) / DIM, bh = height - by - 70;
  noStroke(); fill(0, 0, 70); textSize(14);
  text(inGrid ? '列 ' + hc + ' までの状態（バー = |振幅|²、色 = 位相）' : '最後の状態（左のバー = |振幅|²、色 = 位相 ／ 右の黄 = 測定 ' + nShots + ' 回の結果）', gx, by - 16);
  for (let i = 0; i < DIM; i++) {
    let p = sRe[i] * sRe[i] + sIm[i] * sIm[i], x = gx + i * bw;
    fill(0, 0, 20); rect(x + 6, by, bw * 0.4, bh);
    fill(((atan2(sIm[i], sRe[i]) + PI) / TWO_PI) * 360, 70, 100); rect(x + 6, by + bh - p * bh, bw * 0.4, p * bh);
    if (!inGrid && nShots) { fill(55, 90, 100); rect(x + 8 + bw * 0.4, by + bh - (shots[i] / nShots) * bh, bw * 0.35, (shots[i] / nShots) * bh); }
    fill(0, 0, 100); textSize(16); text(basisLabel(i), x + 6, by + bh + 22);
    fill(0, 0, 70); textSize(12); text(nf(p, 1, 3), x + 6, by + bh + 40);
    if (p > 1e-6) text(nf(sRe[i], 1, 2) + (sIm[i] >= 0 ? '+' : '') + nf(sIm[i], 1, 2) + 'i', x + 6, by + bh - p * bh - 6);
  }

  fill(0, 0, 100); textSize(18);
  text('1〜7 / パレット：ゲート（' + (cur || '消す') + '）　E：消す　クリック：置く　B ベル　G GHZ　D ドイチュ＝ジョサ　V グローバー　C 全消し　M 測り直す', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('ラベルは |q0 q1 q2⟩ の順。H で 0 と 1 の重ね合わせ、CNOT でもつれ。グローバーは 2 回の反復で |111⟩ の確率が約 95% に', 20, 64);
}

function mousePressed() {
  // パレット
  if (mouseY > 82 && mouseY < 114) {
    let k = floor((mouseX - gx) / 52);
    if (k >= 0 && k < gates.length) { cur = gates[k]; return; }
    if (k === 7) { cur = ''; return; }
  }
  let c = floor((mouseX - gx) / cell), q = floor((mouseY - gy) / cell);
  if (c >= 0 && c < NCOL && q >= 0 && q < NQ) {
    grid[c][q] = grid[c][q] === cur ? '' : cur;
    if (cur === '⊕') for (let r = 0; r < NQ; r++) if (r !== q && grid[c][r] === '⊕') grid[c][r] = '';   // ⊕ は 1 列に 1 つ
    resetShots();
  }
}

function keyPressed() {
  if (key >= '1' && key <= '7') cur = gates[int(key) - 1];
  let k = key.toUpperCase();
  if (k === 'E') cur = '';
  if (k === 'B' || k === 'G' || k === 'D' || k === 'V') preset(k);
  if (k === 'C') clearAll();
  if (k === 'M') resetShots();
}

// ---------- やってみよう ----------
// 1. B（ベル状態）を測ると |000⟩ と |110⟩ だけが半々。q0 を測れば q1 もわかる = もつれ
// 2. D のオラクル（列 2・3 の CNOT）を消すと「定数型」。結果の q0 q1 はどうなる？
// 3. V のグローバーを 1 回だけ（列 7〜12 を消す）にすると |111⟩ の確率は？ NCOL を 20 にして 3 回にすると、回しすぎで下がる
// 4. H → Z → H が X と同じになることを、バーの変化で確かめよう。T を 2 回 = S、S を 2 回 = Z
