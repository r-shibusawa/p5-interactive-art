// ============================================
// 04 フィボナッチヒープ ─ 「あとで片づける」ヒープ
// INSERT と UNION は根のリストに置くだけ（O(1)）。片づけは EXTRACT-MIN の CONSOLIDATE でまとめて行う
// ポテンシャル Φ = 根の数 t + 2 × 印の数 m。散らかすと Φ が貯まり、片づけで Φ を使う ─ 償却解析（シリーズ12）
// スペース / 数字 + Enter で挿入 / X で最小値を取り出す / U で別のヒープと合併 / P で一時停止・N で 1 コマ / R でやり直し
// ============================================

let SPEED = 0.6;      // ★ 1 コマの秒数
let MAXKEY = 99;      // ★ キーの最大値
let START = 14;       // ★ 最初に入れるキーの数

let roots = [], minKey = null;
let frames = [], fi = 0, timer = 0, pending = [], paused = false;
let keyPos = {}, used = new Set(), typed = '';
let opLog = [];     // [操作, 実コスト, ΔΦ]
let work = 0, phi0 = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  reset();
}

function reset() {
  roots = []; minKey = null; frames = []; fi = 0; pending = []; keyPos = {}; used = new Set(); opLog = [];
  for (let i = 0; i < START; i++) { let n = mk(freshKey()); roots.push(n); updMin(n); }
  snap(`${START} 回 INSERT しただけ：根のリストに並べただけで、木はまだ 1 本もできていない`, {});
}

function freshKey() {
  let k;
  do k = floor(random(1, MAXKEY + 1)); while (used.has(k) && used.size < MAXKEY);
  used.add(k); return k;
}
function mk(k) { return { key: k, deg: 0, kids: [], parent: null, mark: false }; }
function cloneN(n) { return { key: n.key, deg: n.deg, mark: n.mark, kids: n.kids.map(cloneN) }; }
function updMin(n) { if (minKey === null || n.key < minKey) minKey = n.key; }
function treeSize(n) { return 1 + n.kids.reduce((s, c) => s + treeSize(c), 0); }
function marks(n) { return (n.mark ? 1 : 0) + n.kids.reduce((s, c) => s + marks(c), 0); }
function phi() { return roots.length + 2 * roots.reduce((s, r) => s + marks(r), 0); }
function snap(msg, hi) {
  let n = roots.reduce((s, r) => s + treeSize(r), 0);
  frames.push({ roots: roots.map(cloneN), minKey, msg, hi, n, phi: phi(), t: roots.length, m: roots.reduce((s, r) => s + marks(r), 0), hist: opLog.slice(-6) });
}
function begin() { work = 0; phi0 = phi(); }
function finish(name) { opLog.push([name, work, phi() - phi0]); }

function insertKey(k) {
  if (used.has(k)) { snap(`${k} はもうある`, {}); return; }
  used.add(k); begin();
  let n = mk(k); roots.push(n); updMin(n); work = 1;
  finish(`INSERT ${k}`);
  snap(`INSERT ${k}：根のリストの端に置くだけ。実コスト 1、Φ は +1`, { key: k });
}

function unionRandom() {
  begin();
  let other = [];
  for (let i = 0; i < floor(random(2, 5)); i++) other.push(mk(freshKey()));
  // もう 1 つのヒープにも小さな木を作っておく
  if (other.length >= 2) { let a = other[0], b = other[1]; if (a.key > b.key) [a, b] = [b, a]; a.kids.push(b); b.parent = a; a.deg = 1; other.splice(other.indexOf(b), 1); }
  snap(`もう 1 つのフィボナッチヒープ（下）と合併する`, { other: other.map(cloneN) });
  roots.push(...other); other.forEach(updMin); work = 1;
  finish('UNION');
  snap('UNION：2 つの根のリストをつなぐだけ（実コスト O(1)）', {});
}

function extractMin() {
  if (!roots.length) { snap('ヒープは空っぽ', {}); return; }
  begin();
  let z = roots.find((r) => r.key === minKey);
  snap(`EXTRACT-MIN：最小値 ${z.key} は min ポインタが指している`, { key: z.key });
  for (let c of z.kids) { c.parent = null; c.mark = false; roots.push(c); work++; }
  snap(`${z.key} の子 ${z.kids.length} 個を根のリストへ上げる`, { key: z.key });
  roots.splice(roots.indexOf(z), 1);
  used.delete(z.key);
  if (!roots.length) { minKey = null; finish(`EXTRACT ${z.key}`); snap('空になった', {}); return; }
  // CONSOLIDATE
  let n = roots.reduce((s, r) => s + treeSize(r), 0);
  let D = floor(log(n) / log((1 + sqrt(5)) / 2)) + 1;
  let A = new Array(D + 1).fill(null);
  snap(`CONSOLIDATE：次数ごとの箱 A[0..${D}] を用意（D(n) ≤ log_φ n）。同じ次数の木を見つけたらつなぐ`, { A: A.map(() => null) });
  let list = [...roots];
  for (let w of list) {
    let x = w, d = x.deg;
    work++;
    snap(`根 ${x.key}（次数 ${d}）を見る`, { key: x.key, A: A.map((a) => (a ? a.key : null)) });
    while (A[d]) {
      let y = A[d];
      if (x.key > y.key) [x, y] = [y, x];
      // 同じ次数の根を 2 つつなぐ（キーの大きい方を子に）
      roots.splice(roots.indexOf(y), 1);
      x.kids.push(y); y.parent = x; x.deg++; y.mark = false;
      A[d] = null; d++;
      if (d >= A.length) A.push(null);
      work++;
      snap(`A[${d - 1}] にも次数 ${d - 1} の木 → ${y.key} を ${x.key} の子にする（次数 ${d}）`, { key: x.key, A: A.map((a) => (a ? a.key : null)) });
    }
    A[d] = x;
    snap(`${x.key} を A[${d}] に入れる`, { key: x.key, A: A.map((a) => (a ? a.key : null)) });
  }
  minKey = null; roots.forEach(updMin);
  finish(`EXTRACT ${z.key}`);
  snap(`片づけ完了：根は ${roots.length} 本（次数がすべて違う）。新しい min = ${minKey}`, { key: minKey });
}

// ---------- 配置 ----------
function leaves(n) { return n.kids.length ? n.kids.reduce((s, c) => s + leaves(c), 0) : 1; }
function depth(n) { return n.kids.length ? 1 + max(...n.kids.map(depth)) : 0; }
function layoutForest(rs, y0, x0, x1, out, edges) {
  let units = rs.reduce((s, r) => s + leaves(r) + 0.6, 0);
  let u = min(50, (x1 - x0) / max(1, units));
  let LH = min(78, (height - y0 - 150) / max(1, ...rs.map(depth)));
  let x = (x0 + x1) / 2 - (units * u) / 2;
  for (let r of rs) {
    (function place(n, left, d) {
      let cx;
      if (!n.kids.length) cx = left + u / 2;
      else {
        let l = left, cs = [];
        for (let c of n.kids) { cs.push(place(c, l, d + 1)); l += leaves(c) * u; edges.push([n.key, c.key]); }
        cx = (cs[0] + cs[cs.length - 1]) / 2;
      }
      out[n.key] = { x: cx, y: y0 + d * LH, root: d === 0, mark: n.mark, deg: n.deg };
      return cx;
    })(r, x, 0);
    x += (leaves(r) + 0.6) * u;
  }
  return u;
}

function draw() {
  background(25, 35, 9);
  let F = frames[fi];
  if (!paused) timer += deltaTime / 1000;
  if (timer > SPEED && fi < frames.length - 1) { timer = 0; fi++; F = frames[fi]; }
  if (fi === frames.length - 1 && pending.length && timer > SPEED * 0.5) {
    timer = 0;
    let p = pending.shift();
    if (p.op === 'ins') insertKey(p.k);
    if (p.op === 'ext') extractMin();
    if (p.op === 'uni') unionRandom();
  }

  let tg = {}, edges = [], ot = {}, oe = [];
  let u = layoutForest(F.roots, 290, 30, width - 300, tg, edges);
  if (F.hi.other) layoutForest(F.hi.other, height - 200, 30, width - 300, ot, oe);
  let all = { ...tg, ...ot };
  for (let k in all) {
    if (!keyPos[k]) keyPos[k] = { x: all[k].x, y: all[k].y - 50 };
    keyPos[k].x = lerp(keyPos[k].x, all[k].x, 0.14); keyPos[k].y = lerp(keyPos[k].y, all[k].y, 0.14);
  }
  for (let k in keyPos) if (!all[k]) delete keyPos[k];
  let d = constrain(u * 0.72, 18, 36);

  // 根のリスト（双方向の環状リスト）
  let rk = F.roots.map((r) => r.key);
  stroke(25, 50, 70); strokeWeight(2); noFill();
  for (let i = 0; i < rk.length - 1; i++) line(keyPos[rk[i]].x + d / 2, keyPos[rk[i]].y, keyPos[rk[i + 1]].x - d / 2, keyPos[rk[i + 1]].y);
  if (rk.length > 1) {
    let a = keyPos[rk[rk.length - 1]], b = keyPos[rk[0]];
    drawingContext.setLineDash([5, 6]);
    bezier(a.x + d / 2, a.y, a.x + 40, a.y - 45, b.x - 40, b.y - 45, b.x - d / 2, b.y);
    drawingContext.setLineDash([]);
  }
  stroke(25, 20, 50);
  for (let [a, b] of [...edges, ...oe]) line(keyPos[a].x, keyPos[a].y, keyPos[b].x, keyPos[b].y);
  textAlign(CENTER, CENTER);
  for (let k in all) {
    let p = keyPos[k], hi = F.hi.key === +k, isMin = F.minKey === +k && tg[k];
    noStroke();
    fill(hi ? color(50, 90, 100) : ot[k] ? color(300, 40, 60) : all[k].root ? color(25, 75, 85) : color(25, 40, 45));
    circle(p.x, p.y, d);
    if (all[k].mark) { fill(0, 0, 5); circle(p.x + d * 0.38, p.y - d * 0.38, d * 0.35); }
    fill(hi ? color(0, 0, 10) : color(0, 0, 100)); textSize(d * 0.45); text(k, p.x, p.y);
    if (isMin) { fill(50, 90, 100); textSize(13); text('min', p.x, p.y - d / 2 - 26); triangle(p.x - 5, p.y - d / 2 - 16, p.x + 5, p.y - d / 2 - 16, p.x, p.y - d / 2 - 6); }
  }
  // 次数の箱 A
  if (F.hi.A) {
    textAlign(CENTER, CENTER);
    for (let i = 0; i < F.hi.A.length; i++) {
      let x = 40 + i * 64, y = 150;
      stroke(25, 40, 60); strokeWeight(1.5); fill(F.hi.A[i] !== null ? color(25, 60, 40) : color(25, 20, 15));
      rectMode(CORNER); rect(x, y, 56, 44, 6);
      noStroke(); fill(0, 0, 100); textSize(16); text(F.hi.A[i] === null ? '·' : F.hi.A[i], x + 28, y + 22);
      fill(25, 30, 75); textSize(11); text(`A[${i}]`, x + 28, y - 9);
    }
  }

  // パネル
  textAlign(LEFT, TOP); noStroke(); fill(0, 0, 100); textSize(26);
  text('フィボナッチヒープ', 24, 18);
  textSize(15); fill(0, 0, 80);
  text(`n = ${F.n}   根の数 t = ${F.t}   印 m = ${F.m}   ポテンシャル Φ = t + 2m = ${F.phi}   D(n) ≤ log_φ n = ${F.n ? (log(F.n) / log(1.618)).toFixed(1) : 0}`, 24, 56);
  fill(50, 80, 100); textSize(18); text(F.msg, 24, 90);
  let px = width - 280;
  fill(0, 0, 100); textSize(15); text('償却コスト = 実コスト + ΔΦ', px, 160);
  textSize(13);
  F.hist.forEach(([nm, w, dp], j) => {
    fill(0, 0, 80); text(nm, px, 190 + j * 44);
    fill(25, 60, 95); text(`実 ${w}  ΔΦ ${dp >= 0 ? '+' : ''}${dp}  → 償却 ${w + dp}`, px, 208 + j * 44);
  });
  if (F.hi.other) { fill(300, 40, 85); textSize(14); text('合併するもう 1 つのヒープ', 24, height - 250); }
  fill(0, 0, 60); textSize(14);
  text(`入力中: ${typed || '―'}   黒い点 = 印（mark）   ${paused ? '一時停止中' : ''}`, 24, height - 52);
  text('スペース / 数字 + Enter = 挿入 / X = 最小値を取り出す / U = 合併 / P = 一時停止 / N = 1 コマ進む / R = やり直し', 24, height - 30);
}

function keyPressed() {
  if (key >= '0' && key <= '9') { typed = (typed + key).slice(-3); return; }
  if (key === 'Backspace') { typed = typed.slice(0, -1); return; }
  if (key === 'Enter' && typed) { pending.push({ op: 'ins', k: int(typed) }); typed = ''; return; }
  if (key === ' ') { let k = freshKey(); used.delete(k); pending.push({ op: 'ins', k }); return false; }
  if (key === 'x' || key === 'X') pending.push({ op: 'ext' });
  if (key === 'u' || key === 'U') pending.push({ op: 'uni' });
  if (key === 'p' || key === 'P') paused = !paused;
  if ((key === 'n' || key === 'N') && fi < frames.length - 1) fi++;
  if (key === 'r' || key === 'R') reset();
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }
