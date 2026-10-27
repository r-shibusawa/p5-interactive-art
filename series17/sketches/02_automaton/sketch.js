// ============================================
// 02 有限オートマトンで文字列照合
// 「いま P の先頭何文字ぶん一致しているか」を状態 0〜m として、1 文字読むごとに表 δ で次の状態へ
// テキストの各文字を 1 回しか見ない。表をつくる（前処理）のがこの方法の仕事
// 操作：キーで入力 / Tab = テキスト⇄パターン / Backspace / スペース = 再生・停止
//       → = 1 文字読む / Enter = はじめから / 1〜3 = お手本
// ============================================

let T = 'abaabaabacabaabaabacab';
let P = 'abaabac';
let editing = 'P';
let speed = 24;         // ★ 何フレームに 1 文字読むか
let auto = true;

let sigma = [];         // アルファベット（P に出てくる文字）
let delta = [];         // delta[q][a] = 次の状態
let built = 0;          // 表をつくるアニメーション：何マスできたか
let state = 0, pos = 0, found = [], lastEdge = null;

const BG = '#14101f', PANEL = '#221a33', FG = '#e9e4f5', DIM = '#8c84a3';
const ORCHID = '#f0a3ff', MINT = '#6fe3d0', GOLD = '#ffcf6b', BAD = '#ff6b81';

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('monospace');
  rebuild();
}

// ★ 遷移関数をつくる
// δ(q, a) = 「P[0..q) + a」の末尾と一致する P の最長の先頭部分の長さ
function rebuild() {
  let m = P.length;
  sigma = [...new Set(P.split(''))].sort();
  delta = [];
  for (let q = 0; q <= m; q++) {
    delta[q] = {};
    for (let a of sigma) {
      let k = min(m, q + 1);
      let w = P.slice(0, q) + a;
      while (k > 0 && !w.endsWith(P.slice(0, k))) k--;
      delta[q][a] = k;
    }
  }
  built = 0;
  restartRun();
}

function restartRun() { state = 0; pos = 0; found = []; lastEdge = null; }

function readOne() {
  let m = P.length;
  if (m === 0 || pos >= T.length) return;
  let c = T[pos];
  let nxt = c in delta[state] ? delta[state][c] : 0;   // P に出てこない文字は状態 0 へ
  lastEdge = { from: state, to: nxt, c };
  state = nxt;
  if (state === m) found.push(pos - m + 1);
  pos++;
}

function draw() {
  background(BG);
  let m = P.length;
  let cells = (m + 1) * sigma.length;
  if (built < cells) built += 1; // 表を 1 マスずつ埋める
  else if (auto && frameCount % speed === 0) readOne();

  noStroke(); fill(FG); textAlign(LEFT, TOP); textSize(22);
  text('有限オートマトン  1 文字読むたびに状態が動く', 30, 24);
  fill(DIM); textSize(14);
  text(`入力中：${editing === 'T' ? 'テキスト T' : 'パターン P'}（Tab）   スペース 再生/停止   → 1 文字読む   Enter はじめから   1〜3 お手本`, 30, 56);
  if (m === 0) { fill(BAD); textSize(18); text('パターンが空です。文字を入力してください', 30, 100); return; }

  // --- 状態図 ---
  let gap = min(120, (width - 120) / max(m, 1));
  let x0 = (width - gap * m) / 2, yS = height * 0.36;
  let X = (q) => x0 + q * gap;
  // 後戻りの矢印（0 以外）をまとめる
  let back = {};
  for (let q = 0; q <= m; q++) for (let a of sigma) {
    let k = delta[q][a];
    if (k > 0 && k !== q + 1) { let ek = q + '>' + k; back[ek] = (back[ek] || []).concat(a); }
  }
  textSize(14); textAlign(CENTER, CENTER);
  for (let ek in back) {
    let [q, k] = ek.split('>').map(Number);
    let on = lastEdge && lastEdge.from === q && lastEdge.to === k;
    stroke(on ? GOLD : '#6b5a8f'); strokeWeight(on ? 3 : 1.5); noFill();
    if (q === k) { circle(X(q), yS - 34, 28); }
    else {
      let hgt = 30 + abs(q - k) * 20;
      bezier(X(q), yS - 22, X(q), yS - 22 - hgt, X(k), yS - 22 - hgt, X(k), yS - 22);
      fill(on ? GOLD : '#6b5a8f'); noStroke(); triangle(X(k), yS - 20, X(k) - 5, yS - 30, X(k) + 5, yS - 30);
    }
    noStroke(); fill(on ? GOLD : DIM);
    text(back[ek].join(','), (X(q) + X(k)) / 2, q === k ? yS - 56 : yS - 22 - (30 + abs(q - k) * 20) * 0.75 - 8);
  }
  // 前に進む矢印
  for (let q = 0; q < m; q++) {
    let on = lastEdge && lastEdge.from === q && lastEdge.to === q + 1;
    stroke(on ? GOLD : ORCHID); strokeWeight(on ? 3 : 2);
    line(X(q) + 22, yS, X(q + 1) - 24, yS);
    noStroke(); fill(on ? GOLD : ORCHID);
    triangle(X(q + 1) - 22, yS, X(q + 1) - 32, yS - 5, X(q + 1) - 32, yS + 5);
    text(P[q], (X(q) + X(q + 1)) / 2, yS + 16);
  }
  // 状態の丸
  for (let q = 0; q <= m; q++) {
    stroke(q === m ? MINT : '#6b5a8f'); strokeWeight(q === m ? 4 : 2);
    fill(q === state ? (state === m ? MINT : GOLD) : PANEL);
    circle(X(q), yS, 40);
    noStroke(); fill(q === state ? BG : FG); textSize(16);
    text(q, X(q), yS);
  }
  fill(DIM); textSize(12); textAlign(LEFT, TOP);
  text('書いていない矢印はすべて状態 0 へ戻る', 30, yS + 40);

  // --- 遷移表 δ ---
  let cs = 30, tx = 30, ty = height * 0.52;
  textSize(13); textAlign(CENTER, CENTER);
  fill(DIM); text('δ', tx + cs / 2, ty + cs / 2);
  sigma.forEach((a, c) => { fill(ORCHID); text(a, tx + (c + 1) * cs + cs / 2, ty + cs / 2); });
  let idx = 0;
  for (let q = 0; q <= m; q++) {
    fill(q === state ? GOLD : DIM); text(q, tx + cs / 2, ty + (q + 1) * cs + cs / 2);
    sigma.forEach((a, c) => {
      let shown = idx < built; idx++;
      let on = lastEdge && lastEdge.from === q && lastEdge.c === a;
      fill(on ? '#5a4a1f' : PANEL); stroke('#3a2f52');
      rect(tx + (c + 1) * cs, ty + (q + 1) * cs, cs - 2, cs - 2, 4);
      noStroke(); fill(delta[q][a] === q + 1 ? ORCHID : FG);
      if (shown) text(delta[q][a], tx + (c + 1) * cs + cs / 2 - 1, ty + (q + 1) * cs + cs / 2);
    });
  }

  // --- テキスト ---
  let n = T.length;
  let cw = constrain((width - tx - (sigma.length + 2) * cs - 80) / max(n, 1), 14, 40);
  let x1 = tx + (sigma.length + 2) * cs + 30, yT = ty + 10;
  for (let i = 0; i < n; i++) {
    let hit = found.some((f) => i >= f && i < f + m);
    stroke(editing === 'T' ? ORCHID : '#3a2f52'); fill(hit ? '#2f5e57' : i === pos - 1 ? '#5a4a1f' : PANEL);
    rect(x1 + i * cw, yT, cw - 2, cw - 2, 5);
    noStroke(); fill(i < pos ? FG : DIM); textSize(cw * 0.55);
    text(T[i], x1 + i * cw + cw / 2 - 1, yT + cw / 2);
  }
  fill(FG); textAlign(LEFT, TOP); textSize(17);
  text(`読んだ文字数 ${pos} / ${n}   いまの状態 ${state}   見つかった位置：${found.length ? found.join(', ') : '—'}`, x1, yT + cw + 20);
  fill(DIM); textSize(14);
  text(built < cells ? `表をつくっています… (${built}/${cells})  前処理は O(m³·|Σ|)` : '照合は 1 文字につき表を 1 回引くだけ → Θ(n)', x1, yT + cw + 50);
}

function keyPressed() {
  if (key === ' ') { auto = !auto; return false; }
  if (key === RIGHT_ARROW) { built = 1e9; readOne(); return false; }
  if (key === ENTER) { restartRun(); return false; }
  if (key === TAB) { editing = editing === 'T' ? 'P' : 'T'; return false; }
  if (key === BACKSPACE) { if (editing === 'T') { T = T.slice(0, -1); restartRun(); } else { P = P.slice(0, -1); rebuild(); } return false; }
  if (key === '1') { T = 'abaabaabacabaabaabacab'; P = 'abaabac'; rebuild(); }
  if (key === '2') { T = 'aabaaabaaaab'; P = 'aaab'; rebuild(); }
  if (key === '3') { T = 'GCATCGCAGAGAGTATACAGTACG'; P = 'GCAGAGAG'; rebuild(); }
}

function keyTyped() {
  if (key.length !== 1 || key === ' ' || '123'.includes(key)) return;
  if (editing === 'T' && T.length < 30) { T += key; restartRun(); }
  if (editing === 'P' && P.length < 9) { P += key; rebuild(); }
  return false;
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }
