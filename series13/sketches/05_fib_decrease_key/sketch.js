// ============================================
// 05 キーを減らす ─ 切り取りと「連鎖的な切り取り」
// 親より小さくなった節点は、部分木ごと切り取って根のリストへ（CUT）。親には「1 人子を失った」印をつける
// 印のある親がもう 1 人失ったら、その親も切り取る（CASCADING-CUT）。この規則が木を太く保つ
// 節点クリック = キーを減らす / D = 削除モード切りかえ / スペース = ランダムに減らす / X = 最小値を取り出す / R = 新しいヒープ
// ============================================

let SPEED = 0.75;     // ★ 1 コマの秒数
let START = 30;       // ★ 最初に入れるキーの数
let NEG = -999;       // −∞ の代わり

let roots = [], minKey = null;
let frames = [], fi = 0, timer = 0, pending = [];
let keyPos = {}, used = new Set();
let delMode = false, lastCost = '';

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  reset();
}

function reset() {
  roots = []; minKey = null; frames = []; fi = 0; pending = []; keyPos = {}; used = new Set(); lastCost = '';
  for (let i = 0; i < START; i++) { let n = mk(freshKey(200, 400)); roots.push(n); updMin(n); }
  extractMin(false);
  // 少しキーを減らして、印のある節点を作っておく
  // 孫の節点を親より小さくして切り取り、その親に印をつけておく
  for (let t = 0; t < 5; t++) {
    let c = allNodes().filter((n) => n.parent && n.parent.parent && !n.parent.mark);
    if (c.length) { let x = random(c); decrease(x, x.parent.key - floor(random(1, 8)), false); }
  }
  frames = [];
  snap('節点をクリックすると、そのキーを減らす。黒い点 = 印（すでに子を 1 人失った）', {});
}

function freshKey(a, b) {
  let k;
  do k = floor(random(a, b)); while (used.has(k));
  used.add(k); return k;
}
function mk(k) { return { key: k, deg: 0, kids: [], parent: null, mark: false }; }
function cloneN(n) { return { key: n.key, deg: n.deg, mark: n.mark, kids: n.kids.map(cloneN) }; }
function updMin(n) { if (minKey === null || n.key < minKey) minKey = n.key; }
function marks(n) { return (n.mark ? 1 : 0) + n.kids.reduce((s, c) => s + marks(c), 0); }
function phi() { return roots.length + 2 * roots.reduce((s, r) => s + marks(r), 0); }
function snap(msg, hi) { frames.push({ roots: roots.map(cloneN), minKey, msg, hi, phi: phi(), t: roots.length, m: roots.reduce((s, r) => s + marks(r), 0), cost: lastCost }); }
function allNodes(rs = roots, out = []) { for (let r of rs) { out.push(r); allNodes(r.kids, out); } return out; }
function randomChild() { let c = allNodes().filter((n) => n.parent); return c.length ? random(c) : null; }

// ---------- DECREASE-KEY ----------
let cuts = 0;
function cut(x, y, log) {
  y.kids.splice(y.kids.indexOf(x), 1); y.deg--;
  roots.push(x); x.parent = null; x.mark = false; cuts++;
  if (log) snap(`CUT：${x.key} を部分木ごと親 ${y.key} から切り離して根のリストへ（印は消す）`, { key: x.key, par: y.key });
}
function cascadingCut(y, log) {
  let z = y.parent;
  if (!z) return;
  if (!y.mark) {
    y.mark = true;
    if (log) snap(`${y.key} は初めて子を失った → 印をつけて終わり`, { key: y.key });
  } else {
    if (log) snap(`${y.key} はすでに印あり（2 人目の子を失った）→ ${y.key} も切る！（連鎖）`, { key: y.key, par: z.key });
    cut(y, z, log);
    cascadingCut(z, log);
  }
}
function decrease(x, nk, log) {
  let old = x.key, phi0 = phi();
  while (nk !== NEG && used.has(nk)) nk--;
  cuts = 0;
  used.delete(old); used.add(nk);
  x.key = nk;
  if (log) snap(`${old} を ${nk === NEG ? '−∞' : nk} に減らす`, { key: nk, from: old });
  let y = x.parent;
  if (y && x.key < y.key) { cut(x, y, log); cascadingCut(y, log); }
  else if (log) snap(y ? `親 ${y.key} より大きいまま → 何もしなくてよい` : '根なので何もしなくてよい', { key: nk });
  updMin(x);
  if (log) {
    let dphi = phi() - phi0;
    lastCost = `DECREASE-KEY：切り取り ${cuts} 回 → 実コスト ${1 + cuts}、ΔΦ = ${dphi >= 0 ? '+' : ''}${dphi}、償却 ${1 + cuts + dphi}（O(1)）`;
    snap(cuts ? `できあがり：切り取った ${cuts} 本の木が根のリストに並んだ` : 'できあがり', { key: nk });
  }
}

// ---------- EXTRACT-MIN（04 と同じ）----------
function extractMin(log) {
  if (!roots.length) { if (log) snap('ヒープは空っぽ', {}); return; }
  let z = roots.find((r) => r.key === minKey);
  for (let c of z.kids) { c.parent = null; c.mark = false; roots.push(c); }
  roots.splice(roots.indexOf(z), 1); used.delete(z.key);
  if (log) snap(`最小値 ${z.key === NEG ? '−∞' : z.key} を取り出し、子を根のリストへ`, {});
  let A = [];
  for (let w of [...roots]) {
    let x = w, d = x.deg;
    while (A[d]) {
      let y = A[d];
      if (x.key > y.key) [x, y] = [y, x];
      roots.splice(roots.indexOf(y), 1);
      x.kids.push(y); y.parent = x; x.deg++; y.mark = false;
      A[d] = null; d++;
    }
    A[d] = x;
  }
  minKey = null; roots.forEach(updMin);
  if (log) snap(`CONSOLIDATE：同じ次数の木をつないで、根は ${roots.length} 本に`, { key: minKey });
}

function clickNode(k) {
  let x = allNodes().find((n) => n.key === k);
  if (!x) return;
  if (delMode) {
    snap(`DELETE ${k}：キーを −∞ に減らしてから最小値を取り出す`, { key: k });
    decrease(x, NEG, true);
    extractMin(true);
    return;
  }
  let nk = k - floor(random(30, 160));
  while (used.has(nk) || nk === NEG) nk--;
  decrease(x, nk, true);
}

// ---------- 配置 ----------
function leaves(n) { return n.kids.length ? n.kids.reduce((s, c) => s + leaves(c), 0) : 1; }
function depth(n) { return n.kids.length ? 1 + max(...n.kids.map(depth)) : 0; }
function layoutForest(rs, y0, out, edges) {
  let units = rs.reduce((s, r) => s + leaves(r) + 0.6, 0);
  let u = min(54, (width - 60) / max(1, units));
  let LH = min(80, (height - y0 - 120) / max(1, ...rs.map(depth)));
  let x = width / 2 - (units * u) / 2;
  for (let r of rs) {
    (function place(n, left, d) {
      let cx;
      if (!n.kids.length) cx = left + u / 2;
      else {
        let l = left, cs = [];
        for (let c of n.kids) { cs.push(place(c, l, d + 1)); l += leaves(c) * u; edges.push([n.key, c.key]); }
        cx = (cs[0] + cs[cs.length - 1]) / 2;
      }
      out[n.key] = { x: cx, y: y0 + d * LH, root: d === 0, mark: n.mark };
      return cx;
    })(r, x, 0);
    x += (leaves(r) + 0.6) * u;
  }
  return u;
}

function draw() {
  background(340, 30, 9);
  let F = frames[fi];
  timer += deltaTime / 1000;
  if (timer > SPEED && fi < frames.length - 1) { timer = 0; fi++; F = frames[fi]; }
  if (fi === frames.length - 1 && pending.length && timer > SPEED * 0.4) {
    timer = 0;
    let p = pending.shift();
    if (p.op === 'click') clickNode(p.k);
    if (p.op === 'ext') extractMin(true);
    if (p.op === 'rand') { let c = randomChild(); if (c) clickNode(c.key); }
  }

  let tg = {}, edges = [];
  let u = layoutForest(F.roots, 200, tg, edges);
  // キーが変わった節点は前の位置を引きつぐ
  if (F.hi.from !== undefined && !keyPos[F.hi.key] && keyPos[F.hi.from]) keyPos[F.hi.key] = { ...keyPos[F.hi.from] };
  for (let k in tg) {
    if (!keyPos[k]) keyPos[k] = { x: tg[k].x, y: tg[k].y };
    keyPos[k].x = lerp(keyPos[k].x, tg[k].x, 0.13); keyPos[k].y = lerp(keyPos[k].y, tg[k].y, 0.13);
  }
  for (let k in keyPos) if (!tg[k]) delete keyPos[k];
  let d = constrain(u * 0.75, 18, 38);

  let rk = F.roots.map((r) => r.key);
  stroke(340, 40, 60); strokeWeight(2);
  for (let i = 0; i < rk.length - 1; i++) line(keyPos[rk[i]].x + d / 2, keyPos[rk[i]].y, keyPos[rk[i + 1]].x - d / 2, keyPos[rk[i + 1]].y);
  for (let [a, b] of edges) {
    let cutting = F.hi.par === +a && F.hi.key === +b;
    stroke(cutting ? color(0, 90, 100) : color(340, 15, 50)); strokeWeight(cutting ? 4 : 2);
    line(keyPos[a].x, keyPos[a].y, keyPos[b].x, keyPos[b].y);
  }
  textAlign(CENTER, CENTER);
  for (let k in tg) {
    let p = keyPos[k], hi = F.hi.key === +k, isMin = F.minKey === +k;
    let hover = dist(mouseX, mouseY, p.x, p.y) < d / 2;
    noStroke();
    if (hover) { stroke(delMode ? color(0, 80, 100) : color(0, 0, 100)); strokeWeight(3); }
    fill(hi ? color(50, 90, 100) : tg[k].root ? color(340, 60, 80) : color(340, 30, 42));
    circle(p.x, p.y, d);
    noStroke();
    if (tg[k].mark) { fill(0, 0, 3); stroke(0, 0, 100); strokeWeight(1.5); circle(p.x + d * 0.4, p.y - d * 0.4, d * 0.38); noStroke(); }
    fill(hi ? color(0, 0, 10) : color(0, 0, 100)); textSize(d * 0.4); text(+k === NEG ? '−∞' : k, p.x, p.y);
    if (isMin) { fill(50, 90, 100); textSize(13); text('min', p.x, p.y - d / 2 - 14); }
  }

  textAlign(LEFT, TOP); noStroke(); fill(0, 0, 100); textSize(26);
  text('キーを減らす（CUT と CASCADING-CUT）', 24, 18);
  textSize(15); fill(0, 0, 80);
  text(`根の数 t = ${F.t}   印 m = ${F.m}   Φ = t + 2m = ${F.phi}   モード：${delMode ? '削除（D で戻す）' : 'キーを減らす（D で削除モード）'}`, 24, 56);
  fill(50, 80, 100); textSize(18); text(F.msg, 24, 86);
  fill(340, 40, 90); textSize(14); text(F.cost, 24, 116);
  fill(0, 0, 60); textSize(14);
  text('なぜ印？ ─ 子を 2 人失う前に切り離すので、次数 k の木は少なくとも F(k+2) 個の節点を持つ（→ 06）', 24, height - 52);
  text('節点クリック = キーを減らす / D = 削除モード / スペース = ランダムに減らす / X = 最小値を取り出す / R = 新しいヒープ', 24, height - 30);
}

function mousePressed() {
  for (let k in keyPos) if (dist(mouseX, mouseY, keyPos[k].x, keyPos[k].y) < 19) { pending.push({ op: 'click', k: +k }); return; }
}

function keyPressed() {
  if (key === 'd' || key === 'D') delMode = !delMode;
  if (key === ' ') { pending.push({ op: 'rand' }); return false; }
  if (key === 'x' || key === 'X') pending.push({ op: 'ext' });
  if (key === 'r' || key === 'R') reset();
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }
