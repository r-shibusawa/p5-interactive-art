// ============================================
// 07 ビットベクトルと要約 ─ van Emde Boas 木への準備
// 0〜u−1 の整数の集合を、u 個の 0/1 で表す。「x の次に大きい要素（SUCCESSOR）」を 3 つの方法で探して比べる
// 黄 = 端から順に見る O(u) / 水色 = 上に OR の 2 分木を重ねる O(lg u) / ピンク = √u 個ずつの「かたまり」と要約 O(√u)
// マス目クリック = 入れる・消す / スペース = ランダムな x の SUCCESSOR / 数字 + Enter = x を指定 / ←→ = u（16・64・256）/ R = 並べ直す
// ============================================

let U = 16;           // ★ 全体の大きさ u（4 の累乗にすると √u が整数）
let DENSITY = 0.15;   // ★ 最初に 1 にする割合
let SPEED = 0.18;     // ★ 1 歩の秒数

let bits = [], q = null;
let seqs = null, si = 0, timer = 0;
let typed = '';
let rowCells = [], gridCells = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  reset();
}

function reset() {
  bits = Array.from({ length: U }, () => (random() < DENSITY ? 1 : 0));
  seqs = null; q = null;
}

const S = () => round(sqrt(U));
const high = (x) => floor(x / S());
const low = (x) => x % S();
const index = (h, l) => h * S() + l;
function summary() { let s = []; for (let h = 0; h < S(); h++) { s.push(0); for (let l = 0; l < S(); l++) if (bits[index(h, l)]) s[h] = 1; } return s; }
function treeLevels() {
  let L = [bits.slice()];
  while (L[L.length - 1].length > 1) { let p = L[L.length - 1], n = []; for (let i = 0; i < p.length; i += 2) n.push(p[i] | p[i + 1]); L.push(n); }
  return L;
}

// 3 つの方法で SUCCESSOR(x) を探し、見た場所を記録する
function query(x) {
  x = constrain(x, 0, U - 1);
  q = x; si = 0; timer = 0;
  // ① 端から順に
  let naive = [], ans = null;
  for (let i = x + 1; i < U; i++) { naive.push(i); if (bits[i]) { ans = i; break; } }
  // ② OR の 2 分木：上って、右の兄弟が 1 なら下る
  let L = treeLevels(), tree = [], lv = 0, i = x;
  tree.push([0, x]);
  let found = false;
  while (lv < L.length - 1) {
    if (i % 2 === 0 && L[lv][i + 1]) {
      i = i + 1; tree.push([lv, i]);
      while (lv > 0) { lv--; i = L[lv][2 * i] ? 2 * i : 2 * i + 1; tree.push([lv, i]); }
      found = true; break;
    }
    lv++; i = floor(i / 2); tree.push([lv, i]);
  }
  // ③ かたまりと要約
  let sm = summary(), clus = [], h = high(x);
  for (let l = low(x) + 1; l < S(); l++) { clus.push(['c', index(h, l)]); if (bits[index(h, l)]) break; }
  if (!clus.length || !bits[clus[clus.length - 1][1]]) {
    let nh = -1;
    for (let g = h + 1; g < S(); g++) { clus.push(['s', g]); if (sm[g]) { nh = g; break; } }
    if (nh >= 0) for (let l = 0; l < S(); l++) { clus.push(['c', index(nh, l)]); if (bits[index(nh, l)]) break; }
  }
  seqs = { naive, tree, clus, ans, treeOK: U <= 64 };
}

function draw() {
  background(190, 35, 9);
  if (seqs) {
    timer += deltaTime / 1000;
    if (timer > SPEED) { timer = 0; si++; }
  }
  let sm = summary(), s = S();
  textAlign(LEFT, TOP); noStroke(); fill(0, 0, 100); textSize(26);
  text(`ビットベクトルと要約（u = ${U}、√u = ${s}）`, 24, 18);
  textSize(15); fill(0, 0, 80);
  text(`x を high(x) = ⌊x/√u⌋（かたまりの番号）と low(x) = x mod √u（かたまりの中の位置）に分ける。x = index(high, low) = high·√u + low`, 24, 56);

  // ---------- 上：1 列のビットベクトル + OR の木 ----------
  rowCells = [];
  let cw = min(52, (width - 80) / U), x0 = width / 2 - (U * cw) / 2, rowY = U <= 64 ? 330 : 170;
  let L = treeLevels();
  let tvis = seqs ? seqs.tree.slice(0, si + 1) : [];
  if (U <= 64) {
    let ly = (lv) => (lv === 0 ? rowY - cw / 2 : rowY - 50 - (lv - 1) * (140 / max(1, L.length - 2)));
    for (let lv = L.length - 1; lv >= 1; lv--) {
      let n = L[lv].length, w = (U * cw) / n, y = ly(lv);
      for (let i = 0; i < n; i++) {
        let cx = x0 + (i + 0.5) * w, cy = y;
        let cyc = ly(lv - 1);
        stroke(190, 20, 40); strokeWeight(1);
        line(cx, cy, x0 + (2 * i + 0.5) * (w / 2), cyc); line(cx, cy, x0 + (2 * i + 1.5) * (w / 2), cyc);
        let vis = tvis.some(([a, b]) => a === lv && b === i);
        noStroke(); fill(vis ? color(185, 80, 100) : L[lv][i] ? color(190, 50, 60) : color(190, 15, 22));
        circle(cx, cy, min(22, w * 0.7));
        fill(0, 0, 100); textAlign(CENTER, CENTER); textSize(min(12, w * 0.45)); text(L[lv][i], cx, cy);
      }
    }
  }
  for (let i = 0; i < U; i++) {
    let x = x0 + i * cw, vis = seqs && seqs.naive.slice(0, si + 1).includes(i), tv = tvis.some(([a, b]) => a === 0 && b === i);
    stroke(q === i ? color(0, 0, 100) : color(190, 20, 35)); strokeWeight(q === i ? 3 : 1);
    fill(bits[i] ? color(190, 60, 70) : color(190, 15, 16));
    rect(x, rowY - cw / 2, cw - 2, cw - 2, 3);
    if (vis) { noStroke(); fill(55, 90, 100, 60); rect(x, rowY + cw / 2 + 2, cw - 2, 6); }
    if (tv) { noStroke(); fill(185, 80, 100); rect(x, rowY + cw / 2 + 10, cw - 2, 6); }
    noStroke(); fill(0, 0, 100); textAlign(CENTER, CENTER); textSize(min(14, cw * 0.5));
    if (cw > 14) text(bits[i], x + cw / 2 - 1, rowY - 1);
    if (cw > 24) { fill(0, 0, 55); textSize(10); text(i, x + cw / 2, rowY + cw / 2 + 26); }
    rowCells.push({ x, y: rowY - cw / 2, w: cw, i });
  }

  // ---------- 下：√u × √u のかたまり + 要約 ----------
  gridCells = [];
  let gy0 = rowY + 90, gh = height - gy0 - 120, gc = min(48, gh / s, (width - 400) / (s + 2));
  let gx0 = 150;
  let cvis = seqs ? seqs.clus.slice(0, si + 1) : [];
  textAlign(LEFT, CENTER); fill(330, 50, 95); textSize(14); text('要約', gx0 - 70, gy0 - 14);
  fill(0, 0, 80); text('かたまり（cluster）', gx0 + gc + 10, gy0 - 14);
  for (let h = 0; h < s; h++) {
    let y = gy0 + h * gc;
    let sv = cvis.some(([t, v]) => t === 's' && v === h);
    stroke(sv ? color(330, 80, 100) : color(330, 20, 35)); strokeWeight(sv ? 3 : 1);
    fill(sm[h] ? color(330, 60, 70) : color(330, 15, 16));
    rect(gx0 - 70, y, gc - 4, gc - 4, 4);
    noStroke(); fill(0, 0, 100); textAlign(CENTER, CENTER); textSize(min(14, gc * 0.45)); text(sm[h], gx0 - 70 + gc / 2 - 2, y + gc / 2 - 2);
    for (let l = 0; l < s; l++) {
      let i = index(h, l), x = gx0 + (l + 1) * gc;
      let cv = cvis.some(([t, v]) => t === 'c' && v === i);
      stroke(q === i ? color(0, 0, 100) : cv ? color(330, 80, 100) : color(190, 20, 35)); strokeWeight(q === i || cv ? 3 : 1);
      fill(bits[i] ? color(190, 60, 70) : color(190, 15, 16));
      rect(x, y, gc - 4, gc - 4, 4);
      noStroke(); fill(0, 0, 100); textSize(min(13, gc * 0.4));
      if (gc > 20) text(i, x + gc / 2 - 2, y + gc / 2 - 2);
      gridCells.push({ x, y, w: gc - 4, i });
    }
  }

  // ---------- 結果と比較 ----------
  let px = width - 330, py = gy0;
  textAlign(LEFT, TOP); noStroke();
  if (seqs) {
    let done = (a) => min(si + 1, a.length);
    fill(0, 0, 100); textSize(18);
    text(`SUCCESSOR(${q}) = ${seqs.ans === null ? 'なし（NIL）' : seqs.ans}`, px, py);
    textSize(15);
    fill(55, 90, 100); text(`黄：端から順に ${done(seqs.naive)} マス（最悪 u = ${U}）`, px, py + 40);
    fill(185, 80, 100); text(seqs.treeOK ? `水色：OR の木 ${done(seqs.tree)} 歩（最悪 2 lg u = ${2 * log(U) / log(2)}）` : '水色：OR の木（u ≤ 64 で表示）', px, py + 66);
    fill(330, 70, 100); text(`ピンク：要約 ${done(seqs.clus)} マス（最悪 3√u = ${3 * s}）`, px, py + 92);
  }
  // マウスの下の x
  let hov = [...rowCells, ...gridCells].find((c) => mouseX > c.x && mouseX < c.x + c.w && mouseY > c.y && mouseY < c.y + c.w);
  if (hov) { fill(0, 0, 90); textSize(15); text(`x = ${hov.i} → high = ${high(hov.i)}, low = ${low(hov.i)}　（${high(hov.i)}·${s} + ${low(hov.i)}）`, px, py + 140); }
  fill(0, 0, 70); textSize(13);
  text('どれも 1 回の操作がまだ遅い。\n「要約」をさらに再帰的に作ると\nO(lg lg u) になる → 08・09', px, py + 180);

  fill(0, 0, 60); textSize(14);
  text(`入力中: ${typed || '―'}`, 24, height - 52);
  text('マス目クリック = 入れる・消す / スペース = ランダムな SUCCESSOR / 数字 + Enter = x を指定 / ←→ = u = 16・64・256 / R = 並べ直す', 24, height - 30);
}

function mousePressed() {
  let c = [...rowCells, ...gridCells].find((c) => mouseX > c.x && mouseX < c.x + c.w && mouseY > c.y && mouseY < c.y + c.w);
  if (c) { bits[c.i] ^= 1; seqs = null; q = null; }
}

function keyPressed() {
  if (key === 'ArrowRight') { U = U === 16 ? 64 : 256; reset(); return; }
  if (key === 'ArrowLeft') { U = U === 256 ? 64 : 16; reset(); return; }
  if (key >= '0' && key <= '9') { typed = (typed + key).slice(-3); return; }
  if (key === 'Backspace') { typed = typed.slice(0, -1); return; }
  if (key === 'Enter' && typed) { query(int(typed)); typed = ''; return; }
  if (key === ' ') { query(floor(random(U))); return false; }
  if (key === 'r' || key === 'R') reset();
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }
