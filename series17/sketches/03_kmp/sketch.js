// ============================================
// 03 KMP 法（クヌース–モリス–プラット）
// ① 前処理：接頭辞関数 π[q] =「P の先頭 q 文字の、末尾と先頭が一致する最長の長さ」
// ② 照合：くい違ったら、π を使って「もう一致しているとわかっている分」を飛ばしてずらす
// テキストを後戻りせずに読むので Θ(n + m)。素朴な方法との比較回数の差を見てみよう
// 操作：キーで入力 / Tab = テキスト⇄パターン / Backspace / スペース = 再生・停止
//       → = 1 ステップ / Enter = はじめから / 1〜3 = お手本
// ============================================

let T = 'caabaabbaabaabaacaabaaba';
let P = 'aabaaba';
let editing = 'P';
let speed = 20;         // ★ 何フレームに 1 ステップ進むか
let auto = true;

let pi = [];            // 接頭辞関数（0 始まり：pi[q] は先頭 q+1 文字について）
let gen = null;         // 処理を 1 ステップずつ進める「ジェネレータ」
let snap = {};          // いまの様子
let comps = 0, found = [], phase = '', naiveComps = 0;

const BG = '#14101f', PANEL = '#221a33', FG = '#e9e4f5', DIM = '#8c84a3';
const ORCHID = '#f0a3ff', MINT = '#6fe3d0', GOLD = '#ffcf6b', BAD = '#ff6b81';

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('monospace');
  restart();
}

function restart() {
  pi = new Array(P.length).fill(null);
  comps = 0; found = []; snap = {};
  naiveComps = countNaive();
  gen = P.length > 0 && P.length <= T.length ? kmp() : null;
  phase = gen ? '① 接頭辞関数 π をつくる' : 'パターンが空か、テキストより長い';
}

// ★ KMP 本体（yield のたびに 1 ステップ止まる）
function* kmp() {
  let m = P.length, n = T.length;
  // ① 接頭辞関数 π をつくる
  pi[0] = 0;
  let k = 0;
  for (let q = 1; q < m; q++) {
    while (k > 0 && P[k] !== P[q]) {
      snap = { mode: 'pi', q, k, ok: false, note: `P[${k}] ≠ P[${q}] → k = π[${k - 1}] = ${pi[k - 1]} にもどる` };
      yield; k = pi[k - 1];
    }
    let ok = P[k] === P[q];
    if (ok) k++;
    pi[q] = k;
    snap = { mode: 'pi', q, k, ok, note: ok ? `一致 → π[${q}] = ${k}` : `不一致 → π[${q}] = 0` };
    yield;
  }
  // ② π を使ってテキストを読む
  phase = '② π を使って照合する';
  let qq = 0;
  for (let i = 0; i < n; i++) {
    while (qq > 0 && P[qq] !== T[i]) {
      comps++;
      snap = { mode: 'match', i, q: qq, ok: false, note: `T[${i}] ≠ P[${qq}] → ${qq - pi[qq - 1]} 文字ずらす（q = π[${qq - 1}] = ${pi[qq - 1]}）` };
      yield; qq = pi[qq - 1];
    }
    comps++;
    let ok = P[qq] === T[i];
    if (ok) qq++;
    snap = { mode: 'match', i, q: ok ? qq - 1 : qq, ok, note: ok ? `T[${i}] = P[${qq - 1}]  一致 ${qq} 文字` : `T[${i}] ≠ P[0]  次の文字へ` };
    yield;
    if (qq === m) {
      found.push(i - m + 1);
      snap = { mode: 'match', i, q: m - 1, ok: true, note: `見つけた！ 位置 ${i - m + 1}。q = π[${m - 1}] = ${pi[m - 1]} から続ける` };
      yield; qq = pi[m - 1];
    }
  }
  phase = 'おわり';
  snap = { mode: 'done', note: '' };
}

function countNaive() {
  let c = 0, n = T.length, m = P.length;
  for (let s = 0; s + m <= n && m > 0; s++) for (let j = 0; j < m; j++) { c++; if (T[s + j] !== P[j]) break; }
  return c;
}

function advance() { if (gen && gen.next().done) gen = null; }

function draw() {
  background(BG);
  if (auto && frameCount % speed === 0) advance();
  let n = T.length, m = P.length;

  noStroke(); fill(FG); textAlign(LEFT, TOP); textSize(22);
  text('KMP 法  わかっていることは二度と調べない', 30, 24);
  fill(DIM); textSize(14);
  text(`入力中：${editing === 'T' ? 'テキスト T' : 'パターン P'}（Tab）   スペース 再生/停止   → 1 ステップ   Enter はじめから   1〜3 お手本`, 30, 56);
  fill(GOLD); textSize(18); text(phase, 30, 86);

  let cw = constrain((width - 80) / max(n, m, 1), 16, 46);
  textAlign(CENTER, CENTER);

  // --- π の表 ---
  let xp = 30, yp = 130;
  fill(DIM); textSize(14); textAlign(LEFT, CENTER);
  text('q', xp, yp + cw * 0.5); text('P', xp, yp + cw * 1.5); text('π', xp, yp + cw * 2.5);
  textAlign(CENTER, CENTER);
  let px = xp + 30;
  for (let q = 0; q < m; q++) {
    let x = px + q * cw;
    fill(DIM); textSize(12); text(q, x + cw / 2, yp + cw * 0.5);
    let hl = snap.mode === 'pi' && (q === snap.q || q === snap.k);
    stroke(editing === 'P' ? ORCHID : '#3a2f52');
    fill(hl ? (q === snap.q ? '#5a4a1f' : '#2f4a5e') : PANEL);
    rect(x, yp + cw, cw - 2, cw - 2, 5);
    noStroke(); fill(ORCHID); textSize(cw * 0.55); text(P[q], x + cw / 2 - 1, yp + cw * 1.5);
    fill(PANEL); rect(x, yp + cw * 2, cw - 2, cw - 2, 5);
    fill(pi[q] === null ? DIM : MINT); text(pi[q] === null ? '·' : pi[q], x + cw / 2 - 1, yp + cw * 2.5);
    // π[q] > 0 なら「先頭の何文字と同じか」を弧で示す
    if (pi[q] > 0) {
      noFill(); stroke(MINT); strokeWeight(1.2);
      let x2 = px + (pi[q] - 1) * cw + cw / 2, x1 = x + cw / 2;
      arc((x1 + x2) / 2, yp + cw * 3, x1 - x2, (x1 - x2) * 0.5, 0, PI);
      noStroke();
    }
  }
  // 接頭辞と接尾辞の重なりを図示
  if (snap.mode === 'pi') {
    let q = snap.q, k = snap.k;
    fill(DIM); textSize(13); textAlign(LEFT, TOP);
    text('先頭 k 文字（青）を、いまの位置（金）の手前にそろえて比べている', px + m * cw + 30, yp + cw);
    fill(snap.ok ? MINT : BAD); textSize(16);
    text(snap.note, px + m * cw + 30, yp + cw * 1.8);
    textAlign(CENTER, CENTER);
  }

  // --- テキストとパターン ---
  let yT = height * 0.5, x0 = (width - cw * n) / 2;
  for (let i = 0; i < n; i++) {
    let hit = found.some((f) => i >= f && i < f + m);
    let cur = snap.mode === 'match' && snap.i === i;
    stroke(editing === 'T' ? ORCHID : '#3a2f52');
    fill(cur ? (snap.ok ? '#2f5e57' : '#5e2a3a') : hit ? '#2f5e57' : PANEL);
    rect(x0 + i * cw, yT, cw - 2, cw - 2, 5);
    noStroke(); fill(snap.mode === 'match' && i > snap.i ? DIM : FG); textSize(cw * 0.55);
    text(T[i], x0 + i * cw + cw / 2 - 1, yT + cw / 2);
  }
  if (snap.mode === 'match') {
    let shift = snap.i - snap.q;
    for (let k = 0; k < m; k++) {
      let x = x0 + (shift + k) * cw;
      if (shift + k < 0 || shift + k >= n) continue;
      fill(k < snap.q ? '#2f4a5e' : k === snap.q ? (snap.ok ? '#2f5e57' : '#5e2a3a') : PANEL);
      stroke('#3a2f52'); rect(x, yT + cw * 1.3, cw - 2, cw - 2, 5);
      noStroke(); fill(ORCHID); textSize(cw * 0.55); text(P[k], x + cw / 2 - 1, yT + cw * 1.8);
    }
    fill(snap.ok ? MINT : BAD); textSize(16); textAlign(LEFT, TOP);
    text(snap.note, 30, yT + cw * 2.8);
  }

  // --- 比較回数 ---
  textAlign(LEFT, TOP); fill(FG); textSize(18);
  text(`KMP の比較回数 ${comps}   素朴な方法 ${naiveComps}   見つかった位置：${found.length ? found.join(', ') : '—'}`, 30, height * 0.82);
  let bw = (width - 60) / max(naiveComps, comps, 1);
  noStroke(); fill(ORCHID); rect(30, height * 0.82 + 34, comps * bw, 12, 4);
  fill('#6b5a8f'); rect(30, height * 0.82 + 52, naiveComps * bw, 12, 4);
  fill(DIM); textSize(13); text('上：KMP   下：素朴な方法（全部終わったときの回数）', 30, height * 0.82 + 72);
}

function keyPressed() {
  if (key === ' ') { auto = !auto; return false; }
  if (key === RIGHT_ARROW) { advance(); return false; }
  if (key === ENTER) { restart(); return false; }
  if (key === TAB) { editing = editing === 'T' ? 'P' : 'T'; return false; }
  if (key === BACKSPACE) { if (editing === 'T') T = T.slice(0, -1); else P = P.slice(0, -1); restart(); return false; }
  if (key === '1') { T = 'caabaabbaabaabaacaabaaba'; P = 'aabaaba'; restart(); }
  if (key === '2') { T = 'aaaaaaaaaaaaaaaaaaaaaaab'; P = 'aaaab'; restart(); }   // 素朴な方法が苦手な例
  if (key === '3') { T = 'abcabcabdabcabcabcabdab'; P = 'abcabd'; restart(); }
}

function keyTyped() {
  if (key.length !== 1 || key === ' ' || '123'.includes(key)) return;
  if (editing === 'T' && T.length < 34) T += key;
  if (editing === 'P' && P.length < 12) P += key;
  restart();
  return false;
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }
