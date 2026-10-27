// ============================================
// 00 B木の探索 ─ ディスクにやさしい「太い」木
// 1 つの節点にキーを最大 2t−1 個つめこみ、どの葉も同じ深さにそろえた木
// 高さはおよそ log_t n。ディスクを読む回数（= 訪れる節点の数）がとても少ない
// 数字を打って Enter で探索 / スペースでランダムに探索 / ←→ で最小次数 t / V で赤黒木に変身（t = 2 のとき）/ R で作り直す
// ============================================

let T = 3;            // ★ 最小次数 t（根以外の節点のキーは t−1〜2t−1 個）
let N = 40;           // ★ キーの数
let SPEED = 0.45;     // ★ 探索アニメーションの 1 コマの秒数

let root, uid = 0;
let keyPos = {}, boxPos = {};
let typed = '';
let path = [], pi = 0, timer = 0, target = null, result = '';
let rbView = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  rebuild();
}

function shuffleArr(a) {
  for (let i = a.length - 1; i > 0; i--) { let j = floor(random(i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function rebuild() {
  uid = 0; root = newNode(true); keyPos = {}; boxPos = {};
  let ks = shuffleArr([...Array(N * 3).keys()].map((i) => i + 1)).slice(0, N);
  for (let k of ks) btInsert(k);
  path = []; pi = 0; result = ''; target = null;
  if (T !== 2) rbView = false;
}

// ---------- B木への挿入（満杯の節点は下りる前に分割）----------
function newNode(leaf) { return { id: uid++, keys: [], kids: [], leaf }; }

function btInsert(k) {
  let r = root;
  if (r.keys.length === 2 * T - 1) {
    let s = newNode(false);
    s.kids.push(r); root = s;
    splitChild(s, 0);
    insertNonfull(s, k);
  } else insertNonfull(r, k);
}

function splitChild(x, i) {
  let y = x.kids[i], z = newNode(y.leaf);
  z.keys = y.keys.splice(T);          // 後ろ半分 t−1 個
  let mid = y.keys.pop();             // 真ん中のキーは親へ
  if (!y.leaf) z.kids = y.kids.splice(T);
  x.keys.splice(i, 0, mid);
  x.kids.splice(i + 1, 0, z);
}

function insertNonfull(x, k) {
  let i = 0;
  while (i < x.keys.length && k > x.keys[i]) i++;
  if (x.leaf) { x.keys.splice(i, 0, k); return; }
  if (x.kids[i].keys.length === 2 * T - 1) {
    splitChild(x, i);
    if (k > x.keys[i]) i++;
  }
  insertNonfull(x.kids[i], k);
}

function treeH(x) { return x.leaf ? 0 : 1 + treeH(x.kids[0]); }
function countKeys(x) { return x.keys.length + x.kids.reduce((s, c) => s + countKeys(c), 0); }

// ---------- 探索を 1 コマずつ記録 ----------
function startSearch(k) {
  target = k; path = []; result = ''; pi = 0; timer = 0;
  let x = root;
  while (true) {
    let i = 0;
    while (i < x.keys.length && k > x.keys[i]) { path.push({ id: x.id, k: x.keys[i], cmp: '>' }); i++; }
    if (i < x.keys.length && k === x.keys[i]) { path.push({ id: x.id, k: x.keys[i], cmp: '=' }); break; }
    if (i < x.keys.length) path.push({ id: x.id, k: x.keys[i], cmp: '<' });
    if (x.leaf) { path.push({ id: x.id, k: null, cmp: 'none' }); break; }
    x = x.kids[i];
  }
}

// ---------- 配置 ----------
function layoutBT() {
  const KW = 44, GAP = 18;
  function wid(n) {
    let own = n.keys.length * KW + GAP;
    n._w = n.leaf ? own : max(own, n.kids.reduce((s, c) => s + wid(c), 0));
    return n._w;
  }
  let W = wid(root), s = min(1.2, (width - 60) / W);
  let H = treeH(root), LH = min(120, (height - 260) / max(1, H));
  let boxes = [], edges = [], kt = {};
  function place(n, left, d) {
    let cx;
    if (n.leaf) cx = left + n._w / 2;
    else {
      let sum = n.kids.reduce((a, c) => a + c._w, 0), l = left + (n._w - sum) / 2, cs = [];
      for (let c of n.kids) { cs.push(place(c, l, d + 1)); l += c._w; }
      cx = (cs[0] + cs[cs.length - 1]) / 2;
    }
    n._x = width / 2 + (cx - W / 2) * s; n._y = 150 + d * LH;
    return cx;
  }
  place(root, 0, 0);
  function collect(n) {
    let w = n.keys.length * KW * s, left = n._x - w / 2;
    boxes.push({ id: n.id, x: n._x, y: n._y, w, h: 36 * min(1, s + 0.3) });
    n.keys.forEach((k, j) => (kt[k] = { x: left + (j + 0.5) * KW * s, y: n._y }));
    n.kids.forEach((c, j) => { edges.push([left + j * KW * s, n._y + 18, c._x, c._y - 18]); collect(c); });
  }
  collect(root);
  return { boxes, edges, kt, kw: KW * s };
}

// 2-3-4 木（t = 2）→ 赤黒木：真ん中のキーが黒、両わきのキーが赤い子になる
function layoutRB() {
  function conv(n) {
    let c = n.kids.map(conv), K = n.keys, L = (i) => (n.leaf ? null : c[i]);
    if (K.length === 1) return { k: K[0], red: false, l: L(0), r: L(1) };
    if (K.length === 2) return { k: K[1], red: false, l: { k: K[0], red: true, l: L(0), r: L(1) }, r: L(2) };
    return { k: K[1], red: false, l: { k: K[0], red: true, l: L(0), r: L(1) }, r: { k: K[2], red: true, l: L(2), r: L(3) } };
  }
  let t = conv(root), order = [], edges = [], kt = {}, maxD = 0;
  (function walk(n, d, p) {
    if (!n) return;
    walk(n.l, d + 1, n); n.d = d; maxD = max(maxD, d); order.push(n); walk(n.r, d + 1, n);
    if (p) edges.push([p.k, n.k, n.red]);
  })(t, 0, null);
  let dx = (width - 80) / order.length, LH = min(80, (height - 260) / max(1, maxD));
  order.forEach((n, i) => (kt[n.k] = { x: 40 + (i + 0.5) * dx, y: 150 + n.d * LH, red: n.red }));
  return { kt, edges, blackH: blackHeight(t) };
}
function blackHeight(n) { return n ? blackHeight(n.l) + (n.red ? 0 : 1) : 1; }

function draw() {
  background(225, 35, 10);
  // 探索アニメーション
  if (path.length && pi < path.length - 1) {
    timer += deltaTime / 1000;
    if (timer > SPEED) { timer = 0; pi++; }
  }
  if (path.length && pi === path.length - 1 && !result) result = path[pi].cmp === '=' ? '見つかった！' : '見つからない（葉まで来た）';
  let cur = path.length ? path[pi] : null;
  let visited = new Set(path.slice(0, pi + 1).map((p) => p.id));

  let L = layoutBT();
  let R = rbView ? layoutRB() : null;
  let kt = rbView ? R.kt : L.kt;
  for (let k in kt) {
    if (!keyPos[k]) keyPos[k] = { x: kt[k].x, y: kt[k].y - 40 };
    keyPos[k].x = lerp(keyPos[k].x, kt[k].x, 0.12);
    keyPos[k].y = lerp(keyPos[k].y, kt[k].y, 0.12);
  }
  for (let b of L.boxes) {
    if (!boxPos[b.id]) boxPos[b.id] = { ...b };
    let p = boxPos[b.id];
    for (let f of ['x', 'y', 'w']) p[f] = lerp(p[f], b[f], 0.12);
    p.h = b.h;
  }

  textAlign(CENTER, CENTER);
  if (!rbView) {
    stroke(210, 25, 45); strokeWeight(2);
    for (let e of L.edges) line(...e);
    for (let b of L.boxes) {
      let p = boxPos[b.id], on = cur && cur.id === b.id, was = visited.has(b.id);
      stroke(on ? color(45, 90, 100) : was ? color(45, 50, 70) : color(210, 30, 55));
      strokeWeight(on ? 3 : 1.5);
      fill(was ? color(220, 35, 26) : color(222, 30, 18));
      rectMode(CENTER); rect(p.x, p.y, p.w, p.h, 6);
      stroke(210, 25, 35); strokeWeight(1);
      let n = round(b.w / L.kw);
      for (let j = 1; j < n; j++) line(p.x - p.w / 2 + j * L.kw, p.y - p.h / 2 + 4, p.x - p.w / 2 + j * L.kw, p.y + p.h / 2 - 4);
    }
  } else {
    strokeWeight(3);
    for (let [a, b, red] of R.edges) {
      stroke(red ? color(0, 75, 90) : color(0, 0, 55));
      line(keyPos[a].x, keyPos[a].y, keyPos[b].x, keyPos[b].y);
    }
  }
  // キー
  let ts = constrain(L.kw * 0.42, 9, 18);
  for (let k in keyPos) {
    if (!kt[k]) continue;
    let p = keyPos[k], kk = +k;
    let hi = cur && cur.k === kk;
    if (rbView) {
      noStroke(); fill(kt[k].red ? color(0, 75, 85) : color(0, 0, 18));
      stroke(hi ? color(45, 90, 100) : color(0, 0, 70)); strokeWeight(hi ? 3 : 1);
      circle(p.x, p.y, 30);
    } else if (hi) {
      noStroke(); fill(cur.cmp === '=' ? color(140, 70, 80) : color(45, 80, 90, 70));
      rectMode(CENTER); rect(p.x, p.y, L.kw - 4, 30, 4);
    }
    noStroke(); fill(0, 0, 100); textSize(ts); text(k, p.x, p.y);
  }

  // 情報パネル
  let n = countKeys(root), h = treeH(root);
  textAlign(LEFT, TOP); noStroke(); fill(0, 0, 100); textSize(26);
  text(rbView ? '2-3-4 木 = 赤黒木' : 'B木の探索', 24, 18);
  textSize(15); fill(0, 0, 80);
  text(`最小次数 t = ${T}（節点のキーは ${T - 1}〜${2 * T - 1} 個${T === 2 ? '、2-3-4 木' : ''}）   キー数 n = ${n}   高さ h = ${h}   上限 log_t((n+1)/2) = ${(log((n + 1) / 2) / log(T)).toFixed(2)}`, 24, 56);
  if (rbView) text(`赤黒木として見ると：黒い節点 = B木の節点、赤 = 同じ節点の仲間。黒高さ ${R.blackH} = B木の高さ ${h} + 2（葉 NIL を含む）`, 24, 80);
  let reads = visited.size;
  fill(45, 80, 100);
  if (target !== null) text(`探す数 ${target}   ディスク読み出し ${reads} 回   ${cur && cur.k !== null ? `比べる：${target} ${cur.cmp} ${cur.k}` : ''}   ${result}`, 24, rbView ? 104 : 80);
  fill(0, 0, 60); textSize(14);
  text(`入力中: ${typed || '―'}`, 24, height - 52);
  text('数字 + Enter = 探索 / スペース = ランダムに探索 / ←→ = t / V = 赤黒木の見え方（t=2）/ R = 作り直す', 24, height - 30);
}

function keyPressed() {
  if (key >= '0' && key <= '9') { typed = (typed + key).slice(-4); return; }
  if (key === 'Backspace') { typed = typed.slice(0, -1); return; }
  if (key === 'Enter' && typed) { startSearch(int(typed)); typed = ''; return; }
  if (key === ' ') { startSearch(floor(random(1, N * 3))); return false; }
  if (key === 'ArrowRight') { T = min(5, T + 1); rebuild(); }
  if (key === 'ArrowLeft') { T = max(2, T - 1); rebuild(); }
  if (key === 'v' || key === 'V') { if (T === 2) rbView = !rbView; }
  if (key === 'r' || key === 'R') rebuild();
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }
