// ============================================
// 02 B木からの削除 ─ 6 つのケース
// 下りる前に「子のキーが t 個以上ある」ようにしておくのがコツ
// ケース 1 葉から消す / 2a 先行キーで置換 / 2b 後続キーで置換 / 2c 併合 / 3a 兄弟から借りる（回転）/ 3b 兄弟と併合
// キーをクリックで削除 / 数字 + Enter で削除 / スペースでランダムに削除 / I でランダムに挿入 / ←→ で t / R で新しい木
// ============================================

let T = 2;            // ★ 最小次数 t（3 にすると太い木になる）
let N = 28;           // ★ 最初のキーの数
let SPEED = 0.85;     // ★ 1 コマの秒数

let root, uid = 0;
let frames = [], fi = 0, timer = 0, pending = [];
let keyPos = {}, boxPos = {}, kwNow = 40;
let typed = '';
let tally = { '1': 0, '2a': 0, '2b': 0, '2c': 0, '3a': 0, '3b': 0, 'shrink': 0 };
let lastCase = '';
const CASES = [
  ['1', '葉にある → そのまま消す'],
  ['2a', '内部節点・左の子が t 個以上 → 先行キーで置きかえ'],
  ['2b', '内部節点・右の子が t 個以上 → 後続キーで置きかえ'],
  ['2c', '両方の子が t−1 個 → k と右の子を左の子に併合'],
  ['3a', '下りる子が t−1 個・兄弟が t 個以上 → 1 個借りる'],
  ['3b', '下りる子も兄弟も t−1 個 → 親のキーをはさんで兄弟と併合'],
  ['shrink', '根が空になった → 木が 1 段低くなる'],
];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  reset();
}

function shuffleArr(a) {
  for (let i = a.length - 1; i > 0; i--) { let j = floor(random(i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function reset() {
  uid = 0; root = newNode(true); frames = []; fi = 0; pending = []; keyPos = {}; boxPos = {};
  for (let c in tally) tally[c] = 0;
  lastCase = '';
  for (let k of shuffleArr([...Array(99).keys()].map((i) => i + 1)).slice(0, N)) btInsert(k);
  snap('キーをクリックすると削除する', {});
}

function newNode(leaf) { return { id: uid++, keys: [], kids: [], leaf }; }
function clone(n) { return { id: n.id, keys: [...n.keys], kids: n.kids.map(clone), leaf: n.leaf }; }
function snap(msg, hi) { frames.push({ tree: clone(root), msg, hi, tally: { ...tally }, lastCase }); }
function has(n, k) { return n.keys.includes(k) || n.kids.some((c) => has(c, k)); }
function allKeys(n, out = []) { out.push(...n.keys); n.kids.forEach((c) => allKeys(c, out)); return out; }
function treeH(x) { return x.leaf ? 0 : 1 + treeH(x.kids[0]); }

// ---------- 挿入（木を用意するため）----------
function btInsert(k) {
  if (has(root, k)) return;
  if (root.keys.length === 2 * T - 1) { let s = newNode(false); s.kids.push(root); root = s; splitChild(s, 0); }
  insertNonfull(root, k);
}
function splitChild(x, i) {
  let y = x.kids[i], z = newNode(y.leaf);
  z.keys = y.keys.splice(T);
  let mid = y.keys.pop();
  if (!y.leaf) z.kids = y.kids.splice(T);
  x.keys.splice(i, 0, mid); x.kids.splice(i + 1, 0, z);
}
function insertNonfull(x, k) {
  let i = 0;
  while (i < x.keys.length && k > x.keys[i]) i++;
  if (x.leaf) { x.keys.splice(i, 0, k); return; }
  if (x.kids[i].keys.length === 2 * T - 1) { splitChild(x, i); if (k > x.keys[i]) i++; }
  insertNonfull(x.kids[i], k);
}

// ---------- 削除（下りる前に子のキーを t 個以上にしておく）----------
function mark(c) { tally[c]++; lastCase = c; }
function maxKey(x) { while (!x.leaf) x = x.kids[x.kids.length - 1]; return x.keys[x.keys.length - 1]; }
function minKey(x) { while (!x.leaf) x = x.kids[0]; return x.keys[0]; }
function merge(x, i) {
  let y = x.kids[i], z = x.kids[i + 1];
  y.keys.push(x.keys[i], ...z.keys);
  y.kids.push(...z.kids);
  x.keys.splice(i, 1); x.kids.splice(i + 1, 1);
  return y;
}

function deleteKey(k) {
  if (!has(root, k)) { snap(`${k} は木に入っていない`, {}); return; }
  lastCase = '';
  snap(`${k} を削除：根から下りていく`, { node: root.id, target: k });
  del(root, k);
  if (root.keys.length === 0 && !root.leaf) {
    root = root.kids[0]; mark('shrink');
    snap('根が空になった → ただ 1 つの子が新しい根（木が 1 段低くなる）', { node: root.id });
  }
}

function del(x, k) {
  let i = 0;
  while (i < x.keys.length && k > x.keys[i]) i++;
  if (i < x.keys.length && x.keys[i] === k) {
    if (x.leaf) {
      x.keys.splice(i, 1); mark('1');
      snap(`ケース 1：${k} は葉にあるのでそのまま消す`, { node: x.id });
      return;
    }
    let y = x.kids[i], z = x.kids[i + 1];
    if (y.keys.length >= T) {
      let kp = maxKey(y); mark('2a');
      snap(`ケース 2a：左の子に ${T} 個以上 → 先行キー ${kp} を探す`, { node: x.id, target: k, key: kp });
      x.keys[i] = kp;
      snap(`${k} を ${kp} で置きかえ、左の部分木から ${kp} を消しにいく`, { node: y.id, key: kp });
      del(y, kp);
    } else if (z.keys.length >= T) {
      let ks = minKey(z); mark('2b');
      snap(`ケース 2b：右の子に ${T} 個以上 → 後続キー ${ks} を探す`, { node: x.id, target: k, key: ks });
      x.keys[i] = ks;
      snap(`${k} を ${ks} で置きかえ、右の部分木から ${ks} を消しにいく`, { node: z.id, key: ks });
      del(z, ks);
    } else {
      mark('2c');
      snap(`ケース 2c：両隣の子が ${T - 1} 個しかない → 併合する`, { node: x.id, target: k });
      merge(x, i);
      snap(`${k} を真ん中にして 2 つの子を 1 つにした（${2 * T - 1} 個）`, { node: y.id, target: k });
      del(y, k);
    }
    return;
  }
  if (x.leaf) return;
  let c = x.kids[i];
  if (c.keys.length === T - 1) {
    let ls = i > 0 ? x.kids[i - 1] : null, rs = i < x.kids.length - 1 ? x.kids[i + 1] : null;
    if (ls && ls.keys.length >= T) {
      mark('3a');
      snap(`ケース 3a：下りる子が ${T - 1} 個 → 左の兄弟から借りる`, { node: c.id, target: k });
      c.keys.unshift(x.keys[i - 1]); x.keys[i - 1] = ls.keys.pop();
      if (!ls.leaf) c.kids.unshift(ls.kids.pop());
      snap('親のキーが下り、兄弟のキーが親へ上がった（回転）', { node: c.id, target: k });
    } else if (rs && rs.keys.length >= T) {
      mark('3a');
      snap(`ケース 3a：下りる子が ${T - 1} 個 → 右の兄弟から借りる`, { node: c.id, target: k });
      c.keys.push(x.keys[i]); x.keys[i] = rs.keys.shift();
      if (!rs.leaf) c.kids.push(rs.kids.shift());
      snap('親のキーが下り、兄弟のキーが親へ上がった（回転）', { node: c.id, target: k });
    } else {
      mark('3b');
      snap(`ケース 3b：子も兄弟も ${T - 1} 個 → 親のキーをはさんで併合`, { node: c.id, target: k });
      c = rs ? merge(x, i) : merge(x, i - 1);
      snap('併合した。これで安心して下りられる', { node: c.id, target: k });
    }
  }
  snap('子へ下りる', { node: c.id, target: k });
  del(c, k);
}

// ---------- 配置 ----------
function layout(rt) {
  const KW = 42, GAP = 20;
  function wid(n) {
    let own = max(1, n.keys.length) * KW + GAP;
    n._w = n.leaf ? own : max(own, n.kids.reduce((s, c) => s + wid(c), 0));
    return n._w;
  }
  let W = wid(rt), s = min(1.3, (width - 380) / W);
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
    n._x = (width - 340) / 2 + (cx - W / 2) * s; n._y = 190 + d * LH;
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
  background(200, 35, 9);
  let F = frames[fi];
  timer += deltaTime / 1000;
  if (timer > SPEED && fi < frames.length - 1) { timer = 0; fi++; F = frames[fi]; }
  if (fi === frames.length - 1 && pending.length && timer > SPEED * 0.5) { timer = 0; let p = pending.shift(); p.op === 'del' ? deleteKey(p.k) : (btInsert(p.k), snap(`${p.k} を挿入した`, { key: p.k })); }

  let L = layout(F.tree);
  kwNow = L.kw;
  for (let b of L.boxes) {
    if (!boxPos[b.id]) boxPos[b.id] = { x: b.x, y: b.y, w: b.w };
    let p = boxPos[b.id];
    p.x = lerp(p.x, b.x, 0.15); p.y = lerp(p.y, b.y, 0.15); p.w = lerp(p.w, b.w, 0.15);
  }
  stroke(200, 25, 45); strokeWeight(2);
  for (let [pid, j, cid] of L.edges) {
    let p = boxPos[pid], c = boxPos[cid], n = max(1, L.byId[pid].n);
    line(p.x - p.w / 2 + j * (p.w / n), p.y + 18, c.x, c.y - 18);
  }
  rectMode(CENTER); textAlign(CENTER, CENTER);
  for (let b of L.boxes) {
    let p = boxPos[b.id], on = F.hi.node === b.id, thin = b.n === T - 1 && b.id !== F.tree.id;
    fill(on ? color(200, 40, 30) : color(200, 30, 18));
    stroke(on ? color(50, 90, 100) : thin ? color(280, 50, 75) : color(200, 30, 55));
    strokeWeight(on ? 3.5 : 1.5);
    rect(p.x, p.y, p.w, 36, 6);
    stroke(200, 25, 35); strokeWeight(1);
    for (let j = 1; j < b.n; j++) { let x = p.x - p.w / 2 + j * (p.w / b.n); line(x, p.y - 14, x, p.y + 14); }
  }
  let ts = constrain(L.kw * 0.42, 10, 18);
  for (let k in L.kt) {
    let t = L.kt[k];
    if (!keyPos[k]) keyPos[k] = { x: t.x, y: t.y };
    keyPos[k].x = lerp(keyPos[k].x, t.x, 0.15); keyPos[k].y = lerp(keyPos[k].y, t.y, 0.15);
    let p = keyPos[k], tg = F.hi.target === +k, hi = F.hi.key === +k;
    let hover = dist(mouseX, mouseY, p.x, p.y) < L.kw / 2;
    if (tg || hi || hover) { noStroke(); fill(tg ? color(355, 75, 90) : hi ? color(50, 85, 100) : color(0, 0, 100, 25)); circle(p.x, p.y, 30); }
    noStroke(); fill(hi ? color(0, 0, 10) : color(0, 0, 100)); textSize(ts); text(k, p.x, p.y);
  }
  for (let k in keyPos) if (!L.kt[k]) delete keyPos[k];

  // ケース表
  let px = width - 330;
  textAlign(LEFT, TOP); noStroke();
  fill(0, 0, 100); textSize(16); text('ケース（使われた回数）', px, 130);
  CASES.forEach(([c, d], j) => {
    let y = 160 + j * 52, on = F.lastCase === c;
    fill(on ? color(50, 85, 100) : color(200, 25, 22)); rectMode(CORNER); rect(px, y, 310, 46, 6);
    fill(on ? color(0, 0, 10) : color(0, 0, 100)); textSize(15); text(`${c === 'shrink' ? '根' : c}　× ${F.tally[c]}`, px + 10, y + 4);
    textSize(11.5); fill(on ? color(0, 0, 20) : color(0, 0, 75)); text(d, px + 10, y + 25);
  });

  fill(0, 0, 100); textSize(26); text('B木からの削除', 24, 18);
  textSize(15); fill(0, 0, 80);
  text(`t = ${T}：根以外の節点は ${T - 1}〜${2 * T - 1} 個   キー数 ${allKeys(F.tree).length}   高さ ${treeH(F.tree)}   紫の枠 = ぎりぎり（t−1 個）の節点`, 24, 56);
  fill(50, 80, 100); textSize(18); text(F.msg, 24, 86);
  fill(0, 0, 60); textSize(14);
  text(`入力中: ${typed || '―'}`, 24, height - 52);
  text('キーをクリック = 削除 / 数字 + Enter = 削除 / スペース = ランダムに削除 / I = ランダムに挿入 / ←→ = t / R = 新しい木', 24, height - 30);
}

function mousePressed() {
  for (let k in keyPos) if (dist(mouseX, mouseY, keyPos[k].x, keyPos[k].y) < max(12, kwNow / 2)) { pending.push({ op: 'del', k: +k }); return; }
}

function keyPressed() {
  if (key >= '0' && key <= '9') { typed = (typed + key).slice(-3); return; }
  if (key === 'Backspace') { typed = typed.slice(0, -1); return; }
  if (key === 'Enter' && typed) { pending.push({ op: 'del', k: int(typed) }); typed = ''; return; }
  if (key === ' ') {
    let ks = allKeys(root);
    if (ks.length) pending.push({ op: 'del', k: random(ks) });
    return false;
  }
  if (key === 'i' || key === 'I') pending.push({ op: 'ins', k: floor(random(1, 100)) });
  if (key === 'ArrowRight') { T = min(4, T + 1); reset(); }
  if (key === 'ArrowLeft') { T = max(2, T - 1); reset(); }
  if (key === 'r' || key === 'R') reset();
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }
