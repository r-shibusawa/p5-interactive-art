// ============================================
// 02 ポインタを配列で作る
// ポインタのない言語でも、next・key・prev の 3 本の配列と「番号」で連結リストが作れる
// 使っていないマスは「空きリスト（free list）」としてつないでおき、使うときに取り出し、いらなくなったら戻す
// 操作：スペース（または数字 + Enter）= 先頭に挿入 / 列をクリック = その要素を削除 / R = リセット
// ============================================

let M = 8;          // ★ 配列の大きさ（メモリの大きさ）
let NIL_ = -1;      // 「どこも指さない」を -1 で表す
let next = [], keyA = [], prev = [];
let L = NIL_, free = 0;
let msg = 'スペースで挿入、列をクリックで削除';
let buf = '', flashI = -1, flashT = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  resetAll();
}

function resetAll() {
  next = []; keyA = []; prev = [];
  for (let i = 0; i < M; i++) { next[i] = i + 1 < M ? i + 1 : NIL_; keyA[i] = null; prev[i] = NIL_; }
  L = NIL_; free = 0;
  for (let k of [3, 18, 11, 6]) insertKey(k);
}

// ---------- 空きリスト ----------
function allocateObject() {
  if (free === NIL_) return NIL_;     // メモリ切れ
  let x = free; free = next[x]; return x;
}
function freeObject(x) { next[x] = free; free = x; prev[x] = NIL_; keyA[x] = null; }

function insertKey(k) {
  let x = allocateObject();
  if (x === NIL_) { msg = '空きがない！（out of space）'; return; }
  keyA[x] = k; next[x] = L; prev[x] = NIL_;
  if (L !== NIL_) prev[L] = x;
  L = x; flashI = x; flashT = 40;
  msg = `空きリストから取り出し → マス ${x} を使う。key[${x}] = ${k}、next[${x}] = ${next[x] === NIL_ ? '/' : next[x]}、L = ${x}`;
}
function deleteAt(x) {
  if (keyA[x] === null) return;
  let k = keyA[x];
  if (prev[x] !== NIL_) next[prev[x]] = next[x]; else L = next[x];
  if (next[x] !== NIL_) prev[next[x]] = prev[x];
  freeObject(x);
  msg = `${k}（マス ${x}）を削除して FREE：空きリストの先頭に戻した（free = ${free}）`;
}

function draw() {
  background(18, 16, 28);
  if (flashT > 0) flashT--;
  noStroke(); fill(240); textAlign(LEFT, TOP); textSize(26);
  text('ポインタを配列で作る（3 本の配列 + 空きリスト）', 30, 24);
  fill(160, 160, 200); textSize(15);
  text('スペース / 数字 + Enter = 挿入　列をクリック = 削除　R = リセット', 30, 60);
  if (buf) { fill(255); textSize(18); text('入力：' + buf, 30, 88); }

  let cw = min(90, (width - 220) / M), x0 = 160, y0 = height * 0.42, ch = 46;
  let rows = [['next', next], ['key', keyA], ['prev', prev]];
  // 列番号
  fill(140, 140, 180); textAlign(CENTER, CENTER); textSize(14);
  for (let i = 0; i < M; i++) text(i, x0 + i * cw + cw / 2, y0 - 22);
  rows.forEach(([name, arr], r) => {
    fill(200); textAlign(RIGHT, CENTER); textSize(17);
    text(name, x0 - 14, y0 + r * ch + ch / 2);
    for (let i = 0; i < M; i++) {
      let used = keyA[i] !== null;
      stroke(70, 70, 110); strokeWeight(1.5);
      fill(used ? color(60, 120, 170) : color(36, 34, 52));
      if (i === flashI && flashT > 0) fill(255, 214, 90);
      rect(x0 + i * cw + 2, y0 + r * ch, cw - 4, ch - 4, 6);
      noStroke(); fill(used ? 255 : 120); textAlign(CENTER, CENTER); textSize(17);
      let v = arr[i];
      text(v === null ? '' : v === NIL_ ? '/' : v, x0 + i * cw + cw / 2, y0 + r * ch + ch / 2 - 2);
    }
  });
  // 矢印：リスト（青・上）と空きリスト（灰・下）
  let cx = (i) => x0 + i * cw + cw / 2;
  let i = L, guard = 0;
  while (i !== NIL_ && next[i] !== NIL_ && guard++ < M) { arc3(cx(i), cx(next[i]), y0 - 34, -1, color(120, 200, 255)); i = next[i]; }
  i = free; guard = 0;
  while (i !== NIL_ && next[i] !== NIL_ && guard++ < M) { arc3(cx(i), cx(next[i]), y0 + 3 * ch + 8, 1, color(150, 150, 170)); i = next[i]; }
  // L と free
  noStroke(); textAlign(CENTER, TOP); textSize(16);
  fill(120, 200, 255); text(L === NIL_ ? 'L = /' : 'L', L === NIL_ ? 60 : cx(L), y0 - 130 > 110 ? y0 - 100 : y0 - 80);
  fill(170); text(free === NIL_ ? 'free = /' : 'free', free === NIL_ ? 60 : cx(free), y0 + 3 * ch + 60);

  // 論理的な並び
  let chain = [], j = L; guard = 0;
  while (j !== NIL_ && guard++ < M) { chain.push(keyA[j]); j = next[j]; }
  fill(220); textAlign(LEFT, TOP); textSize(18);
  text('リストの順番：' + (chain.length ? chain.join(' ⇄ ') : '（空）'), 30, height - 120);
  let fr = [], f = free; guard = 0;
  while (f !== NIL_ && guard++ < M) { fr.push(f); f = next[f]; }
  fill(160); text('空きマス（free list）：' + (fr.length ? fr.join(' → ') : '（なし）'), 30, height - 92);
  fill(255, 225, 140); text(msg, 30, height - 56);
}

function arc3(xa, xb, y, dir, c) {
  noFill(); stroke(c); strokeWeight(2);
  let h = dir * (18 + abs(xb - xa) * 0.18);
  bezier(xa, y, xa, y + h, xb, y + h, xb, y);
  noStroke(); fill(c);
  triangle(xb, y, xb - 5, y + dir * 9, xb + 5, y + dir * 9);
}

function keyPressed() {
  if (key >= '0' && key <= '9') { if (buf.length < 3) buf += key; return; }
  if (key === ENTER && buf) { insertKey(int(buf)); buf = ''; }
  if (key === ' ') insertKey(floor(random(1, 100)));
  if (key.toLowerCase() === 'r') { resetAll(); msg = 'リセットしました'; }
}
function mousePressed() {
  let cw = min(90, (width - 220) / M), x0 = 160, y0 = height * 0.42;
  let i = floor((mouseX - x0) / cw);
  if (i >= 0 && i < M && mouseY > y0 - 10 && mouseY < y0 + 140) {
    if (keyA[i] === null) msg = `マス ${i} は空き（free list の中）`; else deleteAt(i);
  }
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. 9 個目を入れると「空きがない」。M を 12 に増やしてみよう
// 2. 削除したマスは空きリストの先頭へ。次の挿入はそのマスが再利用される（スタックと同じ動き）
// 3. 1 本の配列に [key, next, prev] を 3 つずつ並べる「1 配列表現」も作れる。番号を 3 倍にするだけ
