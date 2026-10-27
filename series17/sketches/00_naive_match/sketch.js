// ============================================
// 00 素朴な文字列照合
// パターン P を 1 文字ずつずらしながら、テキスト T と左から 1 文字ずつ比べる
// 比べた回数を数えると、「いちばん悪い場合」は (n − m + 1) × m 回になる
// 操作：キーで文字を入力 / Tab = テキスト⇄パターンの切りかえ / Backspace = 1 文字消す
//       スペース = 自動再生・停止 / → = 1 回だけ比べる / Enter = はじめから / 1〜4 = お手本
// ============================================

let T = 'ABRACADABRA_ABRACADABRA';
let P = 'ABRA';
let editing = 'P';      // いま入力している方（'T' か 'P'）
let speed = 8;          // ★ 何フレームに 1 回比べるか（小さいほど速い）
let auto = true;

let s = 0, j = 0;       // s = ずらし量、j = パターンの何文字目を比べているか
let comps = 0;          // 比べた回数
let found = [];         // 見つかった位置
let perShift = [];      // ずらし量ごとの比較回数
let last = null;        // 直前に比べた場所 {i, j, ok}
let finished = false;

const BG = '#14101f', PANEL = '#221a33', FG = '#e9e4f5', DIM = '#8c84a3';
const ORCHID = '#f0a3ff', MINT = '#6fe3d0', GOLD = '#ffcf6b', BAD = '#ff6b81';

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('monospace');
  restart();
}

function restart() {
  s = 0; j = 0; comps = 0; found = []; perShift = []; last = null;
  finished = P.length === 0 || P.length > T.length;
}

// ★ 比較 1 回ぶん
function compareOnce() {
  if (finished) return;
  let n = T.length, m = P.length;
  comps++;
  perShift[s] = (perShift[s] || 0) + 1;
  let ok = T[s + j] === P[j];
  last = { i: s + j, j, ok };
  if (ok) {
    j++;
    if (j === m) { found.push(s); s++; j = 0; }   // 全部一致 → 見つけた！次のずらしへ
  } else {
    s++; j = 0;                                   // 1 文字でも違えば、1 つずらしてやり直し
  }
  if (s > n - m) finished = true;
}

function draw() {
  background(BG);
  if (auto && frameCount % speed === 0) compareOnce();

  let n = T.length, m = P.length;
  let cw = constrain((width - 80) / max(n, 1), 14, 48);
  let x0 = (width - cw * n) / 2, yT = height * 0.3, yP = yT + cw * 1.4;

  // タイトル
  noStroke(); fill(FG); textAlign(LEFT, TOP); textSize(22);
  text('素朴な文字列照合  T の中から P を探す', 30, 24);
  fill(DIM); textSize(14);
  text('入力中：' + (editing === 'T' ? 'テキスト T' : 'パターン P') + '（Tab で切りかえ）   スペース 再生/停止   → 1 回比べる   Enter はじめから   1〜4 お手本', 30, 56);

  // テキスト
  textAlign(CENTER, CENTER); textSize(cw * 0.6);
  for (let i = 0; i < n; i++) {
    let hit = found.some((f) => i >= f && i < f + m);
    stroke(editing === 'T' ? ORCHID : '#3a2f52'); strokeWeight(1);
    fill(hit ? '#2f5e57' : PANEL);
    rect(x0 + i * cw, yT, cw - 2, cw - 2, 5);
    noStroke(); fill(FG);
    text(T[i], x0 + i * cw + cw / 2 - 1, yT + cw / 2);
    if (i % 5 === 0) { fill(DIM); textSize(10); text(i, x0 + i * cw + cw / 2, yT - 10); textSize(cw * 0.6); }
  }
  // パターン（いまのずらし量 s の位置）
  if (m > 0 && m <= n) {
    let ss = min(s, n - m);
    for (let k = 0; k < m; k++) {
      let c = PANEL;
      if (!finished && k < j) c = '#2f5e57';
      if (last && !finished && last.i - last.j === ss && k === last.j && !last.ok) c = '#5e2a3a';
      stroke(editing === 'P' ? ORCHID : '#3a2f52'); fill(c);
      rect(x0 + (ss + k) * cw, yP, cw - 2, cw - 2, 5);
      noStroke(); fill(ORCHID);
      text(P[k], x0 + (ss + k) * cw + cw / 2 - 1, yP + cw / 2);
    }
    // いま比べている文字を矢印で示す
    if (!finished) {
      let cx = x0 + (s + j) * cw + cw / 2;
      stroke(GOLD); strokeWeight(2); line(cx, yT + cw, cx, yP - 2);
    }
  }

  // ずらし量ごとの比較回数（棒グラフ）
  let statsY = yP + cw + 40;
  let gy = height - 50, gh = max(40, gy - statsY - 110);
  stroke('#3a2f52'); line(x0, gy, x0 + cw * n, gy);
  noStroke();
  for (let k = 0; k < perShift.length; k++) {
    let v = perShift[k] || 0;
    let h = (v / max(m, 1)) * gh;
    fill(found.includes(k) ? MINT : ORCHID);
    rect(x0 + k * cw + cw * 0.2, gy - h, cw * 0.6, h, 3);
  }
  fill(DIM); textAlign(LEFT, TOP); textSize(13);
  text('ずらし量 s ごとの比較回数（緑 = 見つかった）', x0, gy + 8);

  // 数字
  let worst = max(0, (n - m + 1) * m);
  fill(FG); textSize(18); textAlign(LEFT, TOP);
  text(`n = ${n}   m = ${m}   比較回数 = ${comps}   いちばん悪い場合 (n−m+1)·m = ${worst}`, 30, statsY);
  fill(MINT);
  text('見つかった位置：' + (found.length ? found.join(', ') : '—') + (finished ? '   （おわり）' : ''), 30, statsY + 30);
  if (m === 0) { fill(BAD); text('パターンが空です。文字を入力してください', 30, statsY + 60); }
}

function keyPressed() {
  if (key === ' ') { auto = !auto; return false; }
  if (key === RIGHT_ARROW) { compareOnce(); return false; }
  if (key === ENTER) { restart(); return false; }
  if (key === TAB) { editing = editing === 'T' ? 'P' : 'T'; return false; }
  if (key === BACKSPACE) {
    if (editing === 'T') T = T.slice(0, -1); else P = P.slice(0, -1);
    restart(); return false;
  }
  if (key === '1') { T = 'ABRACADABRA_ABRACADABRA'; P = 'ABRA'; restart(); return false; }
  if (key === '2') { T = 'AAAAAAAAAAAAAAAAAAAAAAAB'; P = 'AAAAB'; restart(); return false; }   // いちばん悪い場合
  if (key === '3') { T = 'ACGTTACGACGTACGGACGTAC'; P = 'ACGT'; restart(); return false; }      // DNA
  if (key === '4') { T = 'すもももももももものうち'; P = 'もも'; restart(); return false; }
}

function keyTyped() {
  if (key.length !== 1 || key === ' ' || '1234'.includes(key)) return;
  if (editing === 'T' && T.length < 40) T += key;
  if (editing === 'P' && P.length < 12) P += key;
  restart();
  return false;
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }
