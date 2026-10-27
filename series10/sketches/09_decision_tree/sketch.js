// ============================================
// 09 決定木と比較ソートの下界
// 「比べるだけ」で並べる方法は、どれも「a ≤ b ? の質問を重ねる木」として描ける（決定木）
// 葉は答え（並べ方）。n 個の並べ方は n! 通りあるので、葉は n! 枚以上必要
// 高さ h の二分木の葉は最大 2^h 枚 → h ≥ log₂(n!) ≈ n log₂n。どんな比較ソートも Ω(n log n) 回は比べる
// スペース：ランダムな入力で木をたどる　1：挿入ソートの木　2：マージソートの木　3・4：n = 3 / 4
// ============================================

let n = 3, algo = 1;
let tree, path = [], input = [], t = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  build();
}

function perms(arr) {
  if (arr.length <= 1) return [arr];
  let out = [];
  for (let i = 0; i < arr.length; i++) for (let p of perms(arr.slice(0, i).concat(arr.slice(i + 1)))) out.push([arr[i]].concat(p));
  return out;
}

// 比べた記録を残しながら並べる。idx[k] は「もとの何番目か」
function sortWithLog(vals) {
  let logc = [];
  let less = (i, j) => { let r = vals[i] <= vals[j]; logc.push([i, j, r]); return r; };
  let idx = vals.map((_, i) => i);
  if (algo === 1) {
    for (let j = 1; j < idx.length; j++) {
      let key = idx[j], i = j - 1;
      while (i >= 0 && !less(idx[i], key)) { idx[i + 1] = idx[i]; i--; }
      idx[i + 1] = key;
    }
  } else {
    let ms = (arr) => {
      if (arr.length <= 1) return arr;
      let m = floor(arr.length / 2), L = ms(arr.slice(0, m)), R = ms(arr.slice(m)), out = [];
      while (L.length && R.length) out.push(less(L[0], R[0]) ? L.shift() : R.shift());
      return out.concat(L, R);
    };
    idx = ms(idx);
  }
  return { logc, order: idx };
}

function build() {
  tree = { kids: {} };
  let base = []; for (let i = 0; i < n; i++) base.push(i + 1);
  for (let p of perms(base)) {
    let { logc, order } = sortWithLog(p);
    let node = tree;
    for (let [i, j, r] of logc) {
      node.q = [i, j];
      let k = r ? 'le' : 'gt';
      if (!node.kids[k]) node.kids[k] = { kids: {} };
      node = node.kids[k];
    }
    node.leaf = order.map(i => 'abcd'[i]).join(' ≤ ');
  }
  layout(tree, 0);
  let cnt = { v: 0 };
  place(tree, cnt);
  tree.total = cnt.v;
  path = []; input = [];
}

function layout(nd, d) { nd.depth = d; for (let k of ['le', 'gt']) if (nd.kids[k]) layout(nd.kids[k], d + 1); }
function place(nd, cnt) {
  let ks = ['le', 'gt'].filter(k => nd.kids[k]);
  if (ks.length === 0) { nd.slot = cnt.v++; return; }
  for (let k of ks) place(nd.kids[k], cnt);
  nd.slot = ks.reduce((s, k) => s + nd.kids[k].slot, 0) / ks.length;
}
function treeHeight(nd) { let ks = ["le", "gt"].filter(k => nd.kids[k]); return ks.length ? 1 + max(ks.map(k => treeHeight(nd.kids[k]))) : 0; }

function runRandom() {
  let base = []; for (let i = 0; i < n; i++) base.push(i + 1);
  input = shuffle(base);
  path = [tree]; let node = tree;
  while (node.q) { let [i, j] = node.q; node = node.kids[input[i] <= input[j] ? 'le' : 'gt']; path.push(node); }
  t = 0;
}

function draw() {
  background(200, 25, 9);
  let h = treeHeight(tree);
  let T = 150, B = height - 110, L = 50, R = width - 50;
  let X = nd => L + (nd.slot + 0.5) / tree.total * (R - L);
  let Y = nd => T + nd.depth * (B - T) / max(1, h);
  t += 0.04;
  let shown = min(path.length, floor(t) + 1);
  let onPath = new Set(path.slice(0, shown));
  let edges = (nd) => {
    for (let k of ['le', 'gt']) {
      let c = nd.kids[k]; if (!c) continue;
      stroke(onPath.has(nd) && onPath.has(c) ? color(45, 90, 100) : color(0, 0, 35)); strokeWeight(onPath.has(c) ? 3 : 1.5);
      line(X(nd), Y(nd), X(c), Y(c));
      noStroke(); fill(0, 0, 55); textSize(11); textAlign(CENTER, CENTER);
      text(k === 'le' ? '≤' : '>', (X(nd) + X(c)) / 2 + (k === 'le' ? -8 : 8), (Y(nd) + Y(c)) / 2);
      edges(c);
    }
  };
  edges(tree);
  let nodes = (nd) => {
    let x = X(nd), y = Y(nd), on = onPath.has(nd);
    noStroke();
    if (nd.q) {
      fill(on ? color(45, 90, 100) : color(210, 40, 45));
      let s = n === 3 ? 46 : 30; rect(x - s / 2, y - 13, s, 26, 6);
      fill(0, 0, on ? 5 : 95); textSize(n === 3 ? 14 : 11); textAlign(CENTER, CENTER);
      text('abcd'[nd.q[0]] + ':' + 'abcd'[nd.q[1]], x, y);
      for (let k of ['le', 'gt']) if (nd.kids[k]) nodes(nd.kids[k]);
    } else {
      fill(on ? color(140, 80, 95) : color(140, 40, 45));
      push(); translate(x, y); if (n === 4) rotate(HALF_PI);
      textSize(n === 3 ? 14 : 10); textAlign(n === 4 ? LEFT : CENTER, CENTER);
      if (n === 3) { rect(-34, -13, 68, 26, 6); fill(0, 0, on ? 5 : 95); }
      text(nd.leaf, n === 4 ? 6 : 0, 0);
      pop();
    }
  };
  nodes(tree);

  let lg = 0; for (let k = 2; k <= n; k++) lg += Math.log2(k);
  noStroke(); fill(0, 0, 100); textAlign(LEFT, BASELINE); textSize(22);
  text('決定木（' + (algo === 1 ? '挿入ソート' : 'マージソート') + '、n = ' + n + '）　葉 ' + tree.total + ' 枚 = ' + n + '! 　高さ ' + h + ' ≥ log₂(' + n + '!) = ' + lg.toFixed(2), 20, 40);
  fill(0, 0, 65); textSize(15);
  text('スペース：ランダムな入力で木をたどる　1 挿入ソート　2 マージソート　3・4：n を変える', 20, 68);
  text('a:b は「a ≤ b ?」という質問。' + (input.length ? '入力 a,b,c' + (n === 4 ? ',d' : '') + ' = ' + input.join(', ') + '　比較 ' + (path.length - 1) + ' 回' : 'どの比較ソートも、いちばん深い葉までの比較回数（= 高さ）が最悪の場合'), 20, 92);
  fill(0, 0, 55); textSize(13);
  text('n = 10 なら log₂(10!) ≈ 21.8 回、n = 100 なら ≈ 525 回は必ず必要。マージソート・ヒープソートはこの限界にほぼ届く（漸近的に最適）', 20, height - 30);
}

function keyPressed() {
  if (key === ' ') runRandom();
  if (key === '1' || key === '2') { algo = int(key); build(); }
  if (key === '3' || key === '4') { n = int(key); build(); }
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. n = 3 の挿入ソートで、比較が 2 回で済む入力と 3 回かかる入力を見つける
// 2. n = 4 でマージソートと挿入ソートの木の高さ（最悪の比較回数）を比べる
// 3. 4! = 24 枚の葉を持つ二分木の高さは最低いくつ？ 実際の木と比べよう
