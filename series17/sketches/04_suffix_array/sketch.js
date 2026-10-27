// ============================================
// 04 接尾辞配列と LCP 配列
// 文字列の「接尾辞（i 文字目から最後まで）」を辞書順に並べた番号の列 = 接尾辞配列 SA
// ① 先頭 1, 2, 4, 8 … 文字の順位を「2 つ組」で並べ直す倍々法（プレフィックス・ダブリング）
// ② 隣どうしの共通接頭辞の長さ LCP → いちばん長い「くり返し部分」がわかる
// ③ 並んでいるので、どんな部分文字列も二分探索で見つかる
// 操作：キーで入力 / Tab = 文字列⇄検索語 / Backspace / スペース = 再生・停止
//       → = 1 ステップ / Enter = はじめから / 1〜3 = お手本
// ============================================

let S = 'mississippi';
let Q = 'ssi';          // 検索語
let editing = 'S';
let speed = 45;         // ★ 何フレームに 1 ステップ進むか
let auto = true;

let order = [], rank = [], rank2 = [], lcp = [], kNow = 0;
let rowY = [];          // 表示用：各接尾辞の行の y（なめらかに動かす）
let phase = '', gen = null, lrs = null, search = null;

const BG = '#14101f', PANEL = '#221a33', FG = '#e9e4f5', DIM = '#8c84a3';
const ORCHID = '#f0a3ff', MINT = '#6fe3d0', GOLD = '#ffcf6b', BAD = '#ff6b81';

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('monospace');
  restart();
}

function restart() {
  let n = S.length;
  order = [...Array(n).keys()];
  rank = order.map((i) => S.charCodeAt(i));
  rank2 = new Array(n).fill(null);
  lcp = new Array(n).fill(null);
  rowY = order.map((i) => i);
  kNow = 0; lrs = null; search = null;
  phase = n ? 'はじめ：接尾辞を i の順に並べたところ' : '文字列が空です';
  gen = n ? build() : null;
}

// ★ 接尾辞配列をつくる（倍々法）→ LCP（笠井のアルゴリズム）
function* build() {
  let n = S.length;
  yield;
  let k = 1;
  while (true) {
    kNow = k;
    rank2 = order.map(() => null);
    for (let i = 0; i < n; i++) rank2[i] = i + k < n ? rank[i + k] : -1;   // 2 つ目の順位（はみ出したら −1）
    order.sort((a, b) => rank[a] - rank[b] || rank2[a] - rank2[b]);
    phase = `先頭 ${2 * k} 文字で並べる：組 (順位[i], 順位[i+${k}]) で並べ替え`;
    yield;
    let nr = new Array(n);
    nr[order[0]] = 0;
    for (let r = 1; r < n; r++) {
      let a = order[r - 1], b = order[r];
      nr[b] = nr[a] + (rank[a] !== rank[b] || rank2[a] !== rank2[b] ? 1 : 0);
    }
    rank = nr;
    phase = `新しい順位をふり直す（同じ組なら同じ順位）`;
    yield;
    if (rank[order[n - 1]] === n - 1 || k >= n) break;   // 順位が全部ちがえば完成
    k *= 2;
  }
  phase = '接尾辞配列の完成！ 次は LCP（隣との共通部分の長さ）';
  yield;
  // LCP を求める（笠井らの方法）：h は 1 つ前の答えより 1 しか減らない
  let inv = new Array(n);
  order.forEach((p, r) => (inv[p] = r));
  let h = 0;
  lcp[0] = 0;
  for (let i = 0; i < n; i++) {
    if (inv[i] > 0) {
      let j = order[inv[i] - 1];
      while (i + h < n && j + h < n && S[i + h] === S[j + h]) h++;
      lcp[inv[i]] = h;
      phase = `LCP：「${S.slice(i)}」と 1 つ上の「${S.slice(j)}」の共通部分 = ${h} 文字`;
      yield;
      if (h > 0) h--;
    } else h = 0;
  }
  let best = 0;
  for (let r = 1; r < n; r++) if (lcp[r] > lcp[best]) best = r;
  lrs = lcp[best] > 0 ? { r: best, len: lcp[best], str: S.substr(order[best], lcp[best]) } : { r: -1, len: 0, str: '' };
  phase = lrs.len ? `いちばん長いくり返し部分 = 「${lrs.str}」（LCP の最大値）` : 'くり返し部分はありません';
  yield;
  startSearch();
}

// ★ 二分探索：Q で始まる接尾辞の範囲を探す
function startSearch() {
  if (gen && lcp.includes(null)) return;
  search = Q.length ? { lo: 0, hi: S.length, mid: -1, done: false, it: searchGen() } : null;
}
function* searchGen() {
  let n = S.length, m = Q.length;
  let lo = 0, hi = n;
  while (lo < hi) {
    let mid = floor((lo + hi) / 2);
    Object.assign(search, { lo, hi, mid });
    phase = `二分探索：「${S.slice(order[mid])}」は「${Q}」より ${S.substr(order[mid], m) < Q ? '前 → 下半分へ' : '後ろ（か同じ）→ 上半分へ'}`;
    yield;
    if (S.substr(order[mid], m) < Q) lo = mid + 1; else hi = mid;
  }
  let end = lo;
  while (end < n && S.substr(order[end], m) === Q) end++;
  Object.assign(search, { lo, hi: end, mid: -1, done: true });
  phase = end > lo ? `「${Q}」は ${end - lo} か所：位置 ${order.slice(lo, end).sort((a, b) => a - b).join(', ')}（比較は約 log₂n 回）` : `「${Q}」は見つかりません`;
}

function advance() {
  if (gen) { if (gen.next().done) gen = null; return; }
  if (search && !search.done && search.it.next().done) search.done = true;
}

function draw() {
  background(BG);
  if (auto && frameCount % speed === 0) advance();
  let n = S.length;

  noStroke(); fill(FG); textAlign(LEFT, TOP); textSize(22);
  text('接尾辞配列  すべての接尾辞を辞書順に並べる', 30, 24);
  fill(DIM); textSize(14);
  text(`入力中：${editing === 'S' ? '文字列' : '検索語'}（Tab）   スペース 再生/停止   → 1 ステップ   Enter はじめから   1〜3 お手本`, 30, 56);
  fill(GOLD); textSize(17); text(phase, 30, 84);
  fill(editing === 'Q' ? ORCHID : DIM); text(`検索語：「${Q}」`, 30, 112);
  if (!n) return;

  let rh = constrain((height - 240) / n, 18, 40);
  let y0 = 180, cw = rh * 0.62;
  // 表の見出し
  fill(DIM); textSize(13); textAlign(LEFT, CENTER);
  let cx = { r: 40, i: 90, suf: 150, rk: 170 + cw * n, lcp: 260 + cw * n };
  text('順', cx.r, y0 - 12); text('i', cx.i, y0 - 12); text('接尾辞', cx.suf, y0 - 12);
  text(kNow ? `順位の組` : '', cx.rk, y0 - 12); text('LCP', cx.lcp, y0 - 12);

  order.forEach((p, r) => (rowY[p] = lerp(rowY[p], r, 0.15)));
  for (let p = 0; p < n; p++) {
    let r = order.indexOf(p);
    let y = y0 + rowY[p] * rh;
    let inLrs = lrs && lrs.len && (r === lrs.r || r === lrs.r - 1);
    let inSearch = search && (search.done ? r >= search.lo && r < search.hi : r >= search.lo && r < search.hi);
    let isMid = search && r === search.mid;
    noStroke();
    fill(isMid ? '#5a4a1f' : search && search.done && inSearch ? '#2f5e57' : inSearch && !search.done ? '#2a2342' : PANEL);
    rect(cx.r - 10, y, cx.lcp + 60 - cx.r, rh - 3, 6);
    fill(DIM); textSize(rh * 0.42); textAlign(LEFT, CENTER);
    text(r, cx.r, y + rh / 2); fill(ORCHID); text(p, cx.i, y + rh / 2);
    // 接尾辞の文字
    for (let k = 0; k < n - p; k++) {
      let hl = (inLrs && k < lrs.len) || (search && search.done && inSearch && k < Q.length);
      fill(hl ? MINT : FG);
      if (kNow && k >= 2 * kNow && lcp.includes(null)) fill(DIM);
      text(S[p + k], cx.suf + k * cw, y + rh / 2);
    }
    fill(GOLD);
    if (kNow) text(`(${rank[p]}${rank2[p] !== null && lcp.includes(null) ? ', ' + rank2[p] : ''})`, cx.rk, y + rh / 2);
    if (lcp[r] !== null) {
      fill(MINT); text(lcp[r], cx.lcp, y + rh / 2);
      rect(cx.lcp + 24, y + rh * 0.3, lcp[r] * 10, rh * 0.4, 3);
    }
  }
  fill(DIM); textSize(13); textAlign(LEFT, TOP);
  text('SA = [' + (gen ? '…' : order.join(', ')) + ']', 30, y0 + n * rh + 12);
}

function keyPressed() {
  if (key === ' ') { auto = !auto; return false; }
  if (key === RIGHT_ARROW) { advance(); return false; }
  if (key === ENTER) { restart(); return false; }
  if (key === TAB) { editing = editing === 'S' ? 'Q' : 'S'; return false; }
  if (key === BACKSPACE) {
    if (editing === 'S') { S = S.slice(0, -1); restart(); } else { Q = Q.slice(0, -1); startSearch(); }
    return false;
  }
  if (key === '1') { S = 'mississippi'; Q = 'ssi'; restart(); }
  if (key === '2') { S = 'banana'; Q = 'ana'; restart(); }
  if (key === '3') { S = 'abracadabra'; Q = 'abra'; restart(); }
}

function keyTyped() {
  if (key.length !== 1 || key === ' ' || '123'.includes(key)) return;
  if (editing === 'S' && S.length < 18) { S += key; restart(); }
  if (editing === 'Q' && Q.length < 8) { Q += key; startSearch(); }
  return false;
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }
