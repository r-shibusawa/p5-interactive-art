// ============================================
// 03 二項ヒープ ─ 2 進数の足し算でできたヒープ
// 二項木 B_k は B_{k−1} を 2 本つないだ木（節点 2^k 個）。n 個のヒープは n の 2 進数の 1 の桁の B_k を 1 本ずつ持つ
// 2 つのヒープの和（UNION）は、2 進数の足し算の「繰り上がり」と同じ動き。同じ次数の木が 2 本 → つないで 1 本上へ
// スペース / 数字 + Enter で挿入 / X で最小値を取り出す / 節点クリックでキーを減らす / U で別のヒープと合併 / R でやり直し
// ============================================

let SPEED = 0.7;      // ★ 1 コマの秒数
let MAXKEY = 99;      // ★ キーの最大値

let roots = [];       // 次数の小さい順
let frames = [], fi = 0, timer = 0, pending = [];
let keyPos = {};
let typed = '', used = new Set();
let lastOp = '';

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  reset();
}

function reset() {
  roots = []; frames = []; fi = 0; pending = []; keyPos = {}; used = new Set();
  for (let i = 0; i < 11; i++) { let k = freshKey(); roots = unionRoots(roots, [mk(k)], false); }
  snap('11 = 1011（2 進数）→ B3・B1・B0 の 3 本', {});
}

function freshKey() {
  if (used.size >= MAXKEY) return null;
  let k;
  do k = floor(random(1, MAXKEY + 1)); while (used.has(k));
  used.add(k); return k;
}
function mk(k) { return { key: k, deg: 0, kids: [], parent: null }; }
function cloneN(n) { return { key: n.key, deg: n.deg, kids: n.kids.map(cloneN) }; }
function snap(msg, hi) { frames.push({ roots: roots.map(cloneN), msg, hi }); }
function treeSize(n) { return 1 + n.kids.reduce((s, c) => s + treeSize(c), 0); }
function total(rs) { return rs.reduce((s, r) => s + treeSize(r), 0); }

// 2 本の B_k をつなぐ：y を z の子にする（z のキーが小さい）
function link(y, z) { y.parent = z; z.kids.unshift(y); z.deg++; }

// 2 つのヒープの合併（log = true のときコマを記録）
function unionRoots(a, b, log) {
  let rs = [...a, ...b].sort((p, q) => p.deg - q.deg);
  if (log) { roots = rs; snap('根のリストを次数の順に並べてつなぐ（まだ同じ次数がある）', { merge: true }); }
  let i = 0;
  while (i < rs.length - 1) {
    let x = rs[i], nx = rs[i + 1];
    if (x.deg !== nx.deg || (i + 2 < rs.length && rs[i + 2].deg === x.deg)) { i++; continue; }
    let k = x.deg;
    if (x.key <= nx.key) { link(nx, x); rs.splice(i + 1, 1); }
    else { link(x, nx); rs.splice(i, 1); }
    if (log) { roots = rs; snap(`B${k} + B${k} → B${k + 1}（繰り上がり）：キーの小さい ${min(x.key, nx.key)} が根`, { key: min(x.key, nx.key) }); }
  }
  return rs;
}

function insertKey(k) {
  if (k === null) return;
  if (used.has(k)) { snap(`${k} はもうある`, {}); return; }
  used.add(k);
  lastOp = '挿入';
  snap(`${k} を挿入：B0 を 1 本だけ持つヒープを作って合併する（n+1 の足し算）`, { key: k, carry: k });
  roots = unionRoots(roots, [mk(k)], true);
  snap(`できあがり：n = ${total(roots)} = ${total(roots).toString(2)}（2 進数）`, { key: k });
}

function extractMin() {
  if (!roots.length) { snap('ヒープは空っぽ', {}); return; }
  lastOp = '最小値の取り出し';
  let m = roots.reduce((a, b) => (b.key < a.key ? b : a));
  snap(`最小値は根のどれか → ${m.key}（根を見るだけ：O(log n)）`, { key: m.key });
  roots = roots.filter((r) => r !== m);
  used.delete(m.key);
  let kids = m.kids.reverse();
  kids.forEach((c) => (c.parent = null));
  snap(`${m.key} を取り除くと、子 ${kids.map((c) => 'B' + c.deg).join('・') || '（なし）'} が別のヒープになる`, { split: kids.map((c) => c.key) });
  roots = unionRoots(roots, kids, true);
  snap(`2 つのヒープを合併した：n = ${total(roots)}`, {});
}

function findNode(rs, k) {
  for (let r of rs) {
    if (r.key === k) return r;
    let f = findNode(r.kids, k);
    if (f) return f;
  }
  return null;
}

// BINOMIAL-HEAP-DECREASE-KEY：キーを減らして親と入れかえながら上へ
function decreaseKey(k) {
  let x = findNode(roots, k);
  if (!x) return;
  let nk = k - floor(random(20, 60));
  while (used.has(nk)) nk--;
  used.delete(k); used.add(nk);
  lastOp = 'キーを減らす';
  x.key = nk;
  snap(`${k} を ${nk} に減らす`, { key: nk });
  while (x.parent && x.parent.key > x.key) {
    let p = x.parent;
    [x.key, p.key] = [p.key, x.key];
    snap(`親 ${x.key} より小さい → 入れかえて上へ`, { key: nk });
    x = p;
  }
  snap('ヒープの性質が戻った', { key: nk });
}

function unionRandom() {
  let n = floor(random(3, 8)), other = [];
  for (let i = 0; i < n; i++) { let k = freshKey(); if (k !== null) other = unionRoots(other, [mk(k)], false); }
  lastOp = '合併';
  let a = total(roots), b = total(other);
  snap(`${b} 個のヒープと合併：${a.toString(2)} + ${b.toString(2)} = ${(a + b).toString(2)}`, { other: other.map(cloneN) });
  roots = unionRoots(roots, other, true);
  snap(`合併完了：n = ${a + b}`, {});
}

// ---------- 配置 ----------
function leaves(n) { return n.kids.length ? n.kids.reduce((s, c) => s + leaves(c), 0) : 1; }
function depth(n) { return n.kids.length ? 1 + max(...n.kids.map(depth)) : 0; }
function layoutForest(rs, y0, out, edges) {
  let units = rs.reduce((s, r) => s + leaves(r) + 0.8, 0);
  let u = min(52, (width - 80) / max(1, units));
  let D = max(0, ...rs.map(depth));
  let LH = min(80, (height - y0 - 120) / max(1, D));
  let x = width / 2 - (units * u) / 2;
  for (let r of rs) {
    (function place(n, left, d) {
      let w = leaves(n) * u, cx;
      if (!n.kids.length) cx = left + w / 2;
      else {
        let l = left, cs = [];
        for (let c of n.kids) { cs.push(place(c, l, d + 1)); l += leaves(c) * u; }
        cx = (cs[0] + cs[cs.length - 1]) / 2;
        for (let c of n.kids) edges.push([n.key, c.key]);
      }
      out[n.key] = { x: cx, y: y0 + d * LH, root: d === 0, deg: n.deg };
      return cx;
    })(r, x, 0);
    x += (leaves(r) + 0.8) * u;
  }
  return u;
}

function draw() {
  background(170, 40, 9);
  let F = frames[fi];
  timer += deltaTime / 1000;
  if (timer > SPEED && fi < frames.length - 1) { timer = 0; fi++; F = frames[fi]; }
  if (fi === frames.length - 1 && pending.length && timer > SPEED * 0.5) {
    timer = 0;
    let p = pending.shift();
    if (p.op === 'ins') insertKey(p.k);
    if (p.op === 'ext') extractMin();
    if (p.op === 'dec') decreaseKey(p.k);
    if (p.op === 'uni') unionRandom();
  }

  let tg = {}, edges = [];
  let u = layoutForest(F.roots, 220, tg, edges);
  let otherT = {}, otherE = [];
  if (F.hi.other) layoutForest(F.hi.other, height - 230, otherT, otherE);
  let all = { ...tg, ...otherT };
  for (let k in all) {
    if (!keyPos[k]) keyPos[k] = { x: all[k].x, y: all[k].y - 50 };
    keyPos[k].x = lerp(keyPos[k].x, all[k].x, 0.14); keyPos[k].y = lerp(keyPos[k].y, all[k].y, 0.14);
  }
  for (let k in keyPos) if (!all[k]) delete keyPos[k];

  // 根のリスト
  let rk = F.roots.map((r) => r.key);
  stroke(170, 40, 60); strokeWeight(2); drawingContext.setLineDash([6, 6]);
  for (let i = 0; i < rk.length - 1; i++) line(keyPos[rk[i]].x + 18, keyPos[rk[i]].y, keyPos[rk[i + 1]].x - 18, keyPos[rk[i + 1]].y);
  drawingContext.setLineDash([]);
  stroke(170, 20, 50); strokeWeight(2);
  for (let [a, b] of [...edges, ...otherE]) line(keyPos[a].x, keyPos[a].y, keyPos[b].x, keyPos[b].y);
  let d = constrain(u * 0.7, 18, 36);
  textAlign(CENTER, CENTER);
  for (let k in all) {
    let p = keyPos[k], hi = F.hi.key === +k, isRoot = all[k].root;
    noStroke();
    fill(hi ? color(50, 90, 100) : otherT[k] ? color(300, 40, 60) : isRoot ? color(170, 55, 65) : color(185, 35, 40));
    if (dist(mouseX, mouseY, p.x, p.y) < d / 2) { stroke(0, 0, 100); strokeWeight(2); }
    circle(p.x, p.y, d);
    noStroke(); fill(hi ? color(0, 0, 10) : color(0, 0, 100)); textSize(d * 0.45); text(k, p.x, p.y);
    if (isRoot && !otherT[k]) { fill(170, 30, 80); textSize(13); text('B' + all[k].deg, p.x, p.y - d / 2 - 12); }
  }

  // 2 進数の表示
  let n = total(F.roots), bits = n.toString(2);
  textAlign(LEFT, TOP); noStroke(); fill(0, 0, 100); textSize(26);
  text('二項ヒープ', 24, 18);
  textSize(15); fill(0, 0, 80);
  text(`n = ${n}   2 進数 = ${bits}   根の数 = ${F.roots.length}（= 1 の桁の数 ≤ ⌊log₂ n⌋ + 1）   ${lastOp ? '操作：' + lastOp : ''}`, 24, 56);
  for (let i = 0; i < bits.length; i++) {
    let deg = bits.length - 1 - i, on = bits[i] === '1';
    fill(on ? color(170, 55, 65) : color(170, 15, 22)); rectMode(CORNER); rect(24 + i * 54, 82, 48, 40, 6);
    fill(0, 0, 100); textAlign(CENTER, CENTER); textSize(18); text(bits[i], 48 + i * 54, 96);
    textSize(11); text('B' + deg, 48 + i * 54, 115);
  }
  textAlign(LEFT, TOP);
  fill(50, 80, 100); textSize(18); text(F.msg, 24, 136);
  if (F.hi.other) { fill(300, 40, 85); textSize(14); text('合併するもう 1 つのヒープ', 24, height - 270); }
  fill(0, 0, 60); textSize(14);
  text(`入力中: ${typed || '―'}`, 24, height - 52);
  text('スペース / 数字 + Enter = 挿入 / X = 最小値を取り出す / 節点クリック = キーを減らす / U = 別のヒープと合併 / R = やり直し', 24, height - 30);
}

function mousePressed() {
  let F = frames[fi];
  for (let k in keyPos) if (dist(mouseX, mouseY, keyPos[k].x, keyPos[k].y) < 18 && findNode(F.roots, +k)) { pending.push({ op: 'dec', k: +k }); return; }
}

function keyPressed() {
  if (key >= '0' && key <= '9') { typed = (typed + key).slice(-3); return; }
  if (key === 'Backspace') { typed = typed.slice(0, -1); return; }
  if (key === 'Enter' && typed) { pending.push({ op: 'ins', k: int(typed) }); typed = ''; return; }
  if (key === ' ') { let k = freshKey(); if (k !== null) { used.delete(k); pending.push({ op: 'ins', k }); } return false; }
  if (key === 'x' || key === 'X') pending.push({ op: 'ext' });
  if (key === 'u' || key === 'U') pending.push({ op: 'uni' });
  if (key === 'r' || key === 'R') reset();
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }
