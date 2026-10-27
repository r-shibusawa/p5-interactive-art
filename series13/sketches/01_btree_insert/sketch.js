// ============================================
// 01 B木への挿入 ─ 下りながら先回りして分割する
// 満杯（2t−1 個）の節点に出会ったら、下りる前に真ん中のキーを親へ上げて 2 つに割る
// だから葉に着いたとき必ず空きがある。木は「根が割れたとき」だけ 1 段高くなる ─ 上に伸びる木
// 数字 + Enter で挿入 / スペースでランダムに挿入 / A で自動挿入 / ←→ で t / P で一時停止・N で 1 コマ進む / R でやり直し
// ============================================

let T = 2;            // ★ 最小次数 t（2 なら 2-3-4 木）
let SPEED = 0.7;      // ★ 1 コマの秒数
let MAXKEY = 99;      // ★ ランダムなキーの最大値

let root, uid = 0;
let frames = [], fi = 0, timer = 0, paused = false, auto = false, pending = [];
let keyPos = {}, boxPos = {};
let typed = '';
let diskR = 0, diskW = 0, splits = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  reset();
}

function reset() {
  uid = 0; root = newNode(true); frames = []; fi = 0; pending = []; keyPos = {}; boxPos = {};
  diskR = diskW = splits = 0;
  snap('空の B木。キーを入れてみよう', {});
}

function newNode(leaf) { return { id: uid++, keys: [], kids: [], leaf }; }
function clone(n) { return { id: n.id, keys: [...n.keys], kids: n.kids.map(clone), leaf: n.leaf }; }
function snap(msg, hi) { frames.push({ tree: clone(root), msg, hi, diskR, diskW, splits }); }
function has(n, k) { return n.keys.includes(k) || n.kids.some((c) => has(c, k)); }

// ---------- 挿入（各段階をコマとして記録）----------
function insertKey(k) {
  if (has(root, k)) { snap(`${k} はもう入っている（同じキーは入れない）`, {}); return; }
  snap(`${k} を挿入：根から下りていく`, { node: root.id, carry: k });
  let r = root;
  if (r.keys.length === 2 * T - 1) {
    snap(`根が満杯（${2 * T - 1} 個）→ 下りる前に根を分割する`, { node: r.id, carry: k, full: true });
    let s = newNode(false);
    s.kids.push(r); root = s;
    let mid = splitChild(s, 0);
    snap(`根を分割：真ん中の ${mid} が新しい根になり、木が 1 段高くなった`, { node: s.id, key: mid, carry: k });
    insertNonfull(s, k);
  } else insertNonfull(r, k);
}

function splitChild(x, i) {
  let y = x.kids[i], z = newNode(y.leaf);
  z.keys = y.keys.splice(T);
  let mid = y.keys.pop();
  if (!y.leaf) z.kids = y.kids.splice(T);
  x.keys.splice(i, 0, mid);
  x.kids.splice(i + 1, 0, z);
  diskW += 3; splits++;           // y, z, x を書き戻す
  return mid;
}

function insertNonfull(x, k) {
  let i = 0;
  while (i < x.keys.length && k > x.keys[i]) i++;
  if (x.leaf) {
    x.keys.splice(i, 0, k); diskW++;
    snap(`葉に ${k} を入れた（空きがあることが保証されている）`, { node: x.id, key: k });
    return;
  }
  let c = x.kids[i];
  diskR++;
  snap(`${k} は ${i} 番目の子へ（DISK-READ）`, { node: c.id, carry: k });
  if (c.keys.length === 2 * T - 1) {
    snap(`この子は満杯 → 下りる前に分割`, { node: c.id, carry: k, full: true });
    let mid = splitChild(x, i);
    snap(`分割：${mid} が親に上がり、子が 2 つになった`, { node: x.id, key: mid, carry: k });
    if (k > x.keys[i]) i++;
    snap(`${k} は ${i} 番目の子へ`, { node: x.kids[i].id, carry: k });
  }
  insertNonfull(x.kids[i], k);
}

function treeH(x) { return x.leaf ? 0 : 1 + treeH(x.kids[0]); }
function countKeys(x) { return x.keys.length + x.kids.reduce((s, c) => s + countKeys(c), 0); }

// ---------- 配置 ----------
function layout(rt) {
  const KW = 44, GAP = 20;
  function wid(n) {
    let own = n.keys.length * KW + GAP;
    n._w = n.leaf ? own : max(own, n.kids.reduce((s, c) => s + wid(c), 0));
    return n._w;
  }
  let W = wid(rt), s = min(1.3, (width - 60) / W);
  let LH = min(120, (height - 300) / max(1, treeH(rt)));
  let boxes = [], edges = [], kt = {}, byId = {};
  function place(n, left, d) {
    let cx;
    if (n.leaf) cx = left + n._w / 2;
    else {
      let sum = n.kids.reduce((a, c) => a + c._w, 0), l = left + (n._w - sum) / 2, cs = [];
      for (let c of n.kids) { cs.push(place(c, l, d + 1)); l += c._w; }
      cx = (cs[0] + cs[cs.length - 1]) / 2;
    }
    n._x = width / 2 + (cx - W / 2) * s; n._y = 190 + d * LH;
    return cx;
  }
  place(rt, 0, 0);
  (function collect(n) {
    let w = max(1, n.keys.length) * KW * s, left = n._x - w / 2;
    let b = { id: n.id, x: n._x, y: n._y, w, n: n.keys.length };
    boxes.push(b); byId[n.id] = b;
    n.keys.forEach((k, j) => (kt[k] = { x: left + (j + 0.5) * KW * s, y: n._y }));
    n.kids.forEach((c, j) => { edges.push([n.id, j, c.id]); collect(c); });
  })(rt);
  return { boxes, edges, kt, byId, kw: KW * s };
}

function draw() {
  background(250, 30, 10);
  let F = frames[fi];
  if (!paused) {
    timer += deltaTime / 1000;
    if (timer > SPEED && fi < frames.length - 1) { timer = 0; fi++; F = frames[fi]; }
  }
  if (fi === frames.length - 1 && timer > SPEED * 0.6) {
    if (pending.length) { timer = 0; insertKey(pending.shift()); }
    else if (auto) { timer = 0; insertKey(floor(random(1, MAXKEY + 1))); }
  }

  let L = layout(F.tree);
  for (let b of L.boxes) {
    if (!boxPos[b.id]) boxPos[b.id] = { x: b.x, y: b.y, w: b.w };
    let p = boxPos[b.id];
    p.x = lerp(p.x, b.x, 0.15); p.y = lerp(p.y, b.y, 0.15); p.w = lerp(p.w, b.w, 0.15);
  }
  // 辺（アニメ中の位置で）
  stroke(230, 25, 45); strokeWeight(2);
  for (let [pid, j, cid] of L.edges) {
    let p = boxPos[pid], c = boxPos[cid];
    line(p.x - p.w / 2 + j * L.kw * (p.w / max(1, L.byId[pid].w)), p.y + 18, c.x, c.y - 18);
  }
  rectMode(CENTER); textAlign(CENTER, CENTER);
  for (let b of L.boxes) {
    let p = boxPos[b.id], on = F.hi.node === b.id, full = b.n === 2 * T - 1;
    fill(on ? color(250, 35, 30) : color(250, 25, 20));
    stroke(on ? (F.hi.full ? color(15, 90, 100) : color(50, 90, 100)) : full ? color(25, 70, 80) : color(230, 30, 55));
    strokeWeight(on ? 3.5 : 1.5);
    rect(p.x, p.y, p.w, 36, 6);
    stroke(230, 25, 35); strokeWeight(1);
    for (let j = 1; j < b.n; j++) { let x = p.x - p.w / 2 + j * (p.w / b.n); line(x, p.y - 14, x, p.y + 14); }
  }
  // キー（キーごとに動かすので、分割のとき真ん中のキーが親へ飛んでいくのが見える）
  let ts = constrain(L.kw * 0.42, 10, 18);
  for (let k in L.kt) {
    let t = L.kt[k];
    if (!keyPos[k]) keyPos[k] = { x: t.x, y: t.y - 60 };
    keyPos[k].x = lerp(keyPos[k].x, t.x, 0.15); keyPos[k].y = lerp(keyPos[k].y, t.y, 0.15);
    let p = keyPos[k], hi = F.hi.key === +k;
    if (hi) { noStroke(); fill(50, 85, 100); circle(p.x, p.y, 30); }
    noStroke(); fill(hi ? color(0, 0, 10) : color(0, 0, 100)); textSize(ts); text(k, p.x, p.y);
  }
  for (let k in keyPos) if (!L.kt[k] && F.hi.carry !== +k) delete keyPos[k];
  // 運んでいるキー
  if (F.hi.carry !== undefined && L.byId[F.hi.node]) {
    let b = boxPos[F.hi.node], k = F.hi.carry;
    let tx = b.x + b.w / 2 + 30, ty = b.y - 34;
    if (!keyPos[k]) keyPos[k] = { x: width / 2, y: 110 };
    keyPos[k].x = lerp(keyPos[k].x, tx, 0.15); keyPos[k].y = lerp(keyPos[k].y, ty, 0.15);
    fill(50, 85, 100); noStroke(); circle(keyPos[k].x, keyPos[k].y, 34);
    fill(0, 0, 10); textSize(16); text(k, keyPos[k].x, keyPos[k].y);
  }

  // パネル
  textAlign(LEFT, TOP); noStroke(); fill(0, 0, 100); textSize(26);
  text('B木への挿入（先回り分割）', 24, 18);
  textSize(15); fill(0, 0, 80);
  text(`t = ${T}：節点のキーは最大 2t−1 = ${2 * T - 1} 個${T === 2 ? '（2-3-4 木）' : ''}   n = ${countKeys(F.tree)}   高さ ${treeH(F.tree)}   分割 ${F.splits} 回   DISK-READ ${F.diskR}   DISK-WRITE ${F.diskW}`, 24, 56);
  fill(50, 80, 100); textSize(18);
  text(F.msg, 24, 86);
  fill(0, 0, 60); textSize(14);
  text(`入力中: ${typed || '―'}   ${auto ? '自動挿入中' : ''} ${paused ? '一時停止中' : ''}   オレンジの枠 = 満杯の節点`, 24, height - 52);
  text('数字 + Enter = 挿入 / スペース = ランダム / A = 自動 / ←→ = t / P = 一時停止 / N = 1 コマ進む / R = やり直し', 24, height - 30);
}

function keyPressed() {
  if (key >= '0' && key <= '9') { typed = (typed + key).slice(-3); return; }
  if (key === 'Backspace') { typed = typed.slice(0, -1); return; }
  if (key === 'Enter' && typed) { pending.push(int(typed)); typed = ''; return; }
  if (key === ' ') { pending.push(floor(random(1, MAXKEY + 1))); return false; }
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'p' || key === 'P') paused = !paused;
  if ((key === 'n' || key === 'N') && fi < frames.length - 1) fi++;
  if (key === 'ArrowRight') { T = min(4, T + 1); reset(); }
  if (key === 'ArrowLeft') { T = max(2, T - 1); reset(); }
  if (key === 'r' || key === 'R') reset();
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }
