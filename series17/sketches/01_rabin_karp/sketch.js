// ============================================
// 01 ラビン–カープ法
// 窓の中の文字列を 1 つの数（ハッシュ値）にして比べる。窓を 1 つずらすときは
// 「左の 1 文字を引いて、右の 1 文字を足す」だけ（ローリングハッシュ）
// ハッシュが同じでも中身が違う「にせの一致（spurious hit）」は 1 文字ずつ確かめる
// 操作：キーで入力 / Tab = テキスト⇄パターン / Backspace / スペース = 再生・停止
//       → = 1 つずらす / ← = お手本を切りかえ / ↑↓ = 法 q を変える / Enter = はじめから
// ============================================

let T = '6142718281828459045';
let P = '27182';
let editing = 'P';
let primes = [7, 11, 13, 31, 101, 997];   // ★ 法 q の候補（小さいほどにせの一致が増える）
let qi = 2;
let speed = 40;
let auto = true;

let d, q, h, p, t, s;
let history = [];       // {s, t, kind:'miss'|'hit'|'spurious'}
let verify = null;      // ハッシュが一致したときの 1 文字ずつの確認 {k, ok}
let finished = false;
let stats = { hit: 0, spurious: 0, charComps: 0 };

const BG = '#14101f', PANEL = '#221a33', FG = '#e9e4f5', DIM = '#8c84a3';
const ORCHID = '#f0a3ff', MINT = '#6fe3d0', GOLD = '#ffcf6b', BAD = '#ff6b81';

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('monospace');
  restart();
}

// 数字だけなら 10 進数（手計算しやすい）、それ以外は文字コード（256 進数）
function allDigits() { return /^[0-9]*$/.test(T + P); }
function val(c) { return allDigits() ? Number(c) : c.charCodeAt(0); }
function modq(a, m) { return ((a % m) + m) % m; }

function restart() {
  d = allDigits() ? 10 : 256;
  q = primes[qi];
  history = []; verify = null; stats = { hit: 0, spurious: 0, charComps: 0 };
  let m = P.length, n = T.length;
  finished = m === 0 || m > n;
  if (finished) return;
  h = 1; for (let i = 0; i < m - 1; i++) h = modq(h * d, q);     // h = d^(m−1) mod q
  p = 0; t = 0;
  for (let i = 0; i < m; i++) { p = modq(d * p + val(P[i]), q); t = modq(d * t + val(T[i]), q); }  // 前処理
  s = 0;
  check();
}

// いまの窓 s を調べる
function check() {
  let m = P.length;
  if (t === p) {
    let k = 0;
    while (k < m) { stats.charComps++; if (T[s + k] !== P[k]) break; k++; }
    let ok = k === m;
    if (ok) stats.hit++; else stats.spurious++;
    history.push({ s, t, kind: ok ? 'hit' : 'spurious' });
  } else {
    history.push({ s, t, kind: 'miss' });
  }
}

// ★ 窓を 1 つずらす（ローリングハッシュ）
function slide() {
  if (finished) return;
  let n = T.length, m = P.length;
  if (s >= n - m) { finished = true; return; }
  t = modq(d * (t - val(T[s]) * h) + val(T[s + m]), q);   // 左を引いて、右を足す
  s++;
  check();
}

function draw() {
  background(BG);
  if (auto && frameCount % speed === 0) slide();
  let n = T.length, m = P.length;
  let cw = constrain((width - 80) / max(n, 1), 16, 52);
  let x0 = (width - cw * n) / 2, yT = height * 0.26;

  noStroke(); fill(FG); textAlign(LEFT, TOP); textSize(22);
  text('ラビン–カープ法  窓の中身を「数」にして比べる', 30, 24);
  fill(DIM); textSize(14);
  text(`入力中：${editing === 'T' ? 'テキスト T' : 'パターン P'}（Tab）  ↑↓ 法 q = ${primes[qi]}   d = ${d}   スペース 再生/停止   → 1 つずらす   ← お手本`, 30, 56);

  // テキスト
  textAlign(CENTER, CENTER);
  for (let i = 0; i < n; i++) {
    let hit = history.some((e) => e.kind === 'hit' && i >= e.s && i < e.s + m);
    stroke(editing === 'T' ? ORCHID : '#3a2f52'); fill(hit ? '#2f5e57' : PANEL);
    rect(x0 + i * cw, yT, cw - 2, cw - 2, 5);
    noStroke(); fill(FG); textSize(cw * 0.55);
    text(T[i], x0 + i * cw + cw / 2 - 1, yT + cw / 2);
  }
  // 窓
  if (!(m === 0 || m > n)) {
    let last = history[history.length - 1];
    let col = last.kind === 'hit' ? MINT : last.kind === 'spurious' ? BAD : GOLD;
    noFill(); stroke(col); strokeWeight(3);
    rect(x0 + s * cw - 3, yT - 3, cw * m + 4, cw + 4, 8);
    strokeWeight(1);

    // パターンとハッシュ
    noStroke(); fill(ORCHID); textSize(20); textAlign(LEFT, TOP);
    text(`P = "${P}"   →   p = ${p}`, 30, yT + cw + 30);
    fill(col);
    text(`窓 T[${s}..${s + m - 1}] = "${T.substr(s, m)}"   →   t = ${t}   ` +
      (last.kind === 'hit' ? '一致！（中身も同じ）' : last.kind === 'spurious' ? 'にせの一致！（ハッシュは同じだが中身が違う）' : 'p と違うのでスキップ'), 30, yT + cw + 62);
    fill(DIM); textSize(15);
    if (s < n - m) text(`次の窓：t' = (d·(t − T[s]·h) + T[s+m]) mod q = (${d}·(${t} − ${val(T[s])}·${h}) + ${val(T[s + m])}) mod ${q}`, 30, yT + cw + 98);
  }

  // ハッシュ値の列
  let yH = height * 0.62;
  fill(DIM); textSize(13); textAlign(LEFT, TOP); noStroke();
  text('ずらし量 s ごとのハッシュ値 t（緑 = 一致 / 赤 = にせの一致）', x0, yH - 26);
  textAlign(CENTER, CENTER);
  for (let e of history) {
    fill(e.kind === 'hit' ? '#2f5e57' : e.kind === 'spurious' ? '#5e2a3a' : PANEL);
    rect(x0 + e.s * cw, yH, cw - 2, cw - 2, 5);
    fill(e.kind === 'miss' ? DIM : FG); textSize(min(cw * 0.42, 16));
    text(e.t, x0 + e.s * cw + cw / 2 - 1, yH + cw / 2);
  }

  fill(FG); textSize(18); textAlign(LEFT, TOP);
  text(`一致 ${stats.hit} 回   にせの一致 ${stats.spurious} 回   文字の比較 ${stats.charComps} 回（素朴な方法なら最大 ${max(0, (n - m + 1) * m)} 回）`, 30, height * 0.82);
  fill(DIM); textSize(14);
  text('q を小さくすると数が「ぶつかり」やすく、にせの一致が増える。大きな素数ならほとんど起きない', 30, height * 0.82 + 30);
  if (m === 0) { fill(BAD); text('パターンが空です', 30, height * 0.82 + 56); }
}

function keyPressed() {
  if (key === ' ') { auto = !auto; return false; }
  if (key === RIGHT_ARROW) { slide(); return false; }
  if (key === LEFT_ARROW) { presetIndex = (presetIndex % 3) + 1; preset(presetIndex); return false; }
  if (key === UP_ARROW) { qi = min(qi + 1, primes.length - 1); restart(); return false; }
  if (key === DOWN_ARROW) { qi = max(qi - 1, 0); restart(); return false; }
  if (key === ENTER) { restart(); return false; }
  if (key === TAB) { editing = editing === 'T' ? 'P' : 'T'; return false; }
  if (key === BACKSPACE) { if (editing === 'T') T = T.slice(0, -1); else P = P.slice(0, -1); restart(); return false; }
}

// 数字も文字として入力するので、お手本の切りかえは ← キー
function keyTyped() {
  if (key.length !== 1 || key === ' ') return;
  if (editing === 'T' && T.length < 32) T += key;
  else if (editing === 'P' && P.length < 10) P += key;
  restart();
  return false;
}

let presetIndex = 1;
function preset(k) {
  if (k === 1) { T = '6142718281828459045'; P = '27182'; qi = 2; }       // e の数字の中から 27182 を探す（q = 13 だとにせの一致が 2 回）
  if (k === 2) { T = 'ABRACADABRA_ABRACADABRA'; P = 'CAD'; qi = 0; }
  if (k === 3) { T = 'TOBEORNOTTOBETHATIS'; P = 'TOBE'; qi = 1; }
  restart();
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }
