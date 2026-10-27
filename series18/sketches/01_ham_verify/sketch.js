// ============================================
// 01 答えを「確かめる」のはかんたん
// ハミルトン閉路：すべての点をちょうど 1 回ずつ通って戻る道。見つけるのは大変、でも答え（証拠）を見せられたら確かめるのは一瞬
// 「証拠をもらえば多項式時間で確かめられる」問題の集まりが NP
// 点を順にクリックして証拠をつくる → V で検証 / スペースで総当たり探索（バックトラック）開始・停止 / C：証拠を消す
// 1：十二面体（ハミルトンのゲーム）  2：ピーターセン・グラフ（閉路なし）  3：ランダム
// ============================================

let nodes = [], edges = [], nbrs = [];
let cert = [];          // 証拠（点の並び）
let checks = [], checkPos = -1, verdict = '';
let search = null, searching = false;
let SEARCH_SPEED = 3;   // ★ 1 フレームに進める探索ステップ数

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  preset(1);
}

function preset(k) {
  nodes = []; edges = [];
  let cx = width / 2, cy = height * 0.56, R = min(width, height) * 0.36;
  let P = (r, i, m, off = 0) => ({ x: cx + cos(TWO_PI * i / m - HALF_PI + off) * r, y: cy + sin(TWO_PI * i / m - HALF_PI + off) * r });
  if (k === 1) {
    for (let i = 0; i < 5; i++) nodes.push(P(R, i, 5));
    for (let j = 0; j < 10; j++) nodes.push(P(R * 0.66, j, 10));
    for (let i = 0; i < 5; i++) nodes.push(P(R * 0.33, i, 5, PI / 5));
    for (let i = 0; i < 5; i++) {
      edges.push([i, (i + 1) % 5], [i, 5 + 2 * i], [5 + 2 * i + 1, 15 + i], [15 + i, 15 + (i + 1) % 5]);
    }
    for (let j = 0; j < 10; j++) edges.push([5 + j, 5 + (j + 1) % 10]);
  } else if (k === 2) {
    for (let i = 0; i < 5; i++) nodes.push(P(R, i, 5));
    for (let i = 0; i < 5; i++) nodes.push(P(R * 0.48, i, 5));
    for (let i = 0; i < 5; i++) edges.push([i, (i + 1) % 5], [i, i + 5], [5 + i, 5 + (i + 2) % 5]);
  } else {
    let m = 10;
    for (let i = 0; i < m; i++) nodes.push(P(R * random(0.55, 1), i, m));
    for (let i = 0; i < m; i++) for (let j = i + 1; j < m; j++) if (random() < 0.3) edges.push([i, j]);
  }
  nbrs = nodes.map(() => []);
  for (let [a, b] of edges) { nbrs[a].push(b); nbrs[b].push(a); }
  cert = []; checks = []; checkPos = -1; verdict = '';
  search = null; searching = false;
}

function adj(a, b) { return nbrs[a].includes(b); }

// ---- 検証：証拠が本当にハミルトン閉路かを順番に確かめる（n 回くらいのチェックで終わる）----
function buildChecks() {
  checks = [];
  let n = nodes.length;
  checks.push({ txt: '点の数が ' + n + ' 個か（今 ' + cert.length + ' 個）', ok: cert.length === n, hl: [] });
  let seen = new Set();
  for (let i = 0; i < cert.length; i++) {
    let a = cert[i], b = cert[(i + 1) % cert.length];
    checks.push({ txt: '点 ' + a + ' は初めて？', ok: !seen.has(a), hl: [a] });
    seen.add(a);
    checks.push({ txt: a + ' → ' + b + ' に線がある？', ok: adj(a, b), hl: [a, b], edge: [a, b] });
  }
  checkPos = 0; verdict = '';
}

// ---- 探索：バックトラックで閉路を探す（最悪 n! 通り）----
function newSearch() { search = { path: [0], idx: [0], steps: 0, done: false, found: false }; }
function searchTick() {
  let s = search;
  if (!s || s.done) return;
  s.steps++;
  let last = s.path.length - 1, v = s.path[last];
  if (s.path.length === nodes.length && adj(v, s.path[0])) { s.done = true; s.found = true; cert = s.path.slice(); return; }
  let i = s.idx[last];
  while (i < nbrs[v].length && s.path.includes(nbrs[v][i])) i++;
  if (i < nbrs[v].length) { s.idx[last] = i + 1; s.path.push(nbrs[v][i]); s.idx.push(0); }
  else { s.path.pop(); s.idx.pop(); if (s.path.length === 0) s.done = true; }
}

function draw() {
  background(250, 30, 10);
  if (searching && search) for (let k = 0; k < SEARCH_SPEED; k++) searchTick();
  if (checkPos >= 0 && checkPos < checks.length && frameCount % 8 === 0) {
    if (!checks[checkPos].ok) { verdict = 'NG：証拠になっていない'; checkPos = checks.length; }
    else if (++checkPos === checks.length) verdict = 'OK：ハミルトン閉路です！';
  }

  let path = searching || (search && !search.found && search.done) ? (search ? search.path : []) : cert;
  let cur = checkPos >= 0 && checkPos < checks.length ? checks[checkPos] : null;

  // 線
  for (let [a, b] of edges) { stroke(0, 0, 35); strokeWeight(2); line(nodes[a].x, nodes[a].y, nodes[b].x, nodes[b].y); }
  for (let i = 0; i + 1 < path.length; i++) {
    let a = nodes[path[i]], b = nodes[path[i + 1]];
    stroke(searching ? 30 : 160, 80, 100); strokeWeight(6); line(a.x, a.y, b.x, b.y);
  }
  if (!searching && cert.length === nodes.length && cert.length > 1 && adj(cert[cert.length - 1], cert[0])) {
    let a = nodes[cert[cert.length - 1]], b = nodes[cert[0]];
    stroke(160, 80, 100); strokeWeight(6); line(a.x, a.y, b.x, b.y);
  }
  if (cur && cur.edge) { let a = nodes[cur.edge[0]], b = nodes[cur.edge[1]]; stroke(cur.ok ? 120 : 0, 90, 100); strokeWeight(10); line(a.x, a.y, b.x, b.y); }

  // 点
  for (let i = 0; i < nodes.length; i++) {
    let order = path.indexOf(i);
    noStroke();
    fill(order >= 0 ? (searching ? 30 : 160) : 220, order >= 0 ? 70 : 20, order >= 0 ? 100 : 60);
    if (cur && cur.hl.includes(i)) fill(cur.ok ? 120 : 0, 90, 100);
    circle(nodes[i].x, nodes[i].y, 34);
    fill(0, 0, 10); textAlign(CENTER, CENTER); textSize(14);
    text(order >= 0 ? order + 1 : i, nodes[i].x, nodes[i].y);
  }

  // 文字
  textAlign(LEFT, BASELINE); fill(0, 0, 100); textSize(18); noStroke();
  text('点を順にクリック → V で検証　スペース：総当たり探索　C：消す　1：十二面体　2：ピーターセン　3：ランダム', 20, 36);
  textSize(16); fill(0, 0, 70);
  text('点 ' + nodes.length + ' 個、線 ' + edges.length + ' 本。点の並べ方は最大 ' + nodes.length + '! ≈ ' + fmt(fact(nodes.length)) + ' 通り', 20, 64);

  let y = 104;
  if (cur || verdict) {
    textSize(20);
    fill(verdict ? (verdict[0] === 'O' ? 120 : 0) : 50, 70, 100);
    text(verdict ? verdict + '（チェック ' + min(checkPos + (verdict[0] === 'O' ? 0 : 1), checks.length) + ' 回）' : '検証中：' + cur.txt, 20, y);
  }
  if (search) {
    textSize(20); fill(30, 70, 100);
    let st = search.done ? (search.found ? '見つかった！' : '閉路は存在しない（全部調べた）') : '探索中…';
    text('総当たり：' + st + '　調べた手数 ' + search.steps.toLocaleString(), 20, y + 32);
  }
  fill(0, 0, 60); textSize(15);
  text('検証は「点の数 × 2」回くらいのチェックで終わる ＝ 多項式時間。探すほうは、うまい方法が見つかっていない', 20, height - 24);
}

function fact(k) { let r = 1; for (let i = 2; i <= k; i++) r *= i; return r; }
function fmt(v) { if (v < 1e6) return v.toLocaleString(); let e = floor(Math.log10(v)); return nf(v / Math.pow(10, e), 1, 1) + '×10^' + e; }

function mousePressed() {
  for (let i = 0; i < nodes.length; i++) {
    if (dist(mouseX, mouseY, nodes[i].x, nodes[i].y) < 20) {
      searching = false; search = null; checks = []; checkPos = -1; verdict = '';
      if (cert[cert.length - 1] === i) cert.pop(); // 同じ点をもう一度押すと 1 つ戻る
      else cert.push(i);
      return;
    }
  }
}
function keyPressed() {
  if (key === 'v' || key === 'V') buildChecks();
  if (key === 'c' || key === 'C') { cert = []; checks = []; checkPos = -1; verdict = ''; search = null; searching = false; }
  if (key === ' ') { if (!search || search.done) { newSearch(); cert = []; checks = []; checkPos = -1; verdict = ''; } searching = !searching; }
  if (key >= '1' && key <= '3') preset(int(key));
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); preset(1); }

// ---------- やってみよう ----------
// 1. 十二面体で自分の手でハミルトン閉路を見つけよう（ハミルトンが 1857 年に売り出したパズル）
// 2. わざと 1 点重複した証拠をつくって V。どこで NG になる？
// 3. ピーターセン・グラフで総当たり。全部調べて「ない」と言い切るのに何手かかる？
