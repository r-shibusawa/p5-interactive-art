// ============================================
// 08 スペルナーの補題
// 大きな三角形を小さな三角形に分け、頂点を 3 色でぬる。ルール：辺の上の点はその辺の両端の色のどちらか
//   すると 3 色そろった小三角形が必ずある（しかも奇数個）。赤−緑の辺を「ドア」として部屋をたどると必ず見つかる
//   M = ブラウワー版：色を写像 f で決める。3 色の小三角形は不動点のすぐ近く → 分割を細かくすると不動点に縮む
// クリック = 内側の点の色を変える / ↑↓ = 分割の細かさ / スペース = ドアをたどる / M = ふつう ↔ ブラウワー版 / ←→ = 写像を変える / R = ぬり直す
// ============================================

let n = 8;                 // ★ 1 辺の分割数
let cols = {};             // "i,j" → 色 0/1/2
let paintMode = 0;              // 0：手でぬる、1：写像 f でぬる（ブラウワー版）
let phi = 0.8;             // ★ 写像のパラメータ
let A, B, Cv;              // 大三角形の頂点
let tris = [];             // 小三角形 [[i,j],[i,j],[i,j]]
let walk = [], walkShown = 0, doorPick = 0;
let fixedB = null;
const HUES = [0, 130, 215];
const NAMES = ['赤', '緑', '青'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  let s = min(width * 0.55, (height - 140) / 0.866);
  A = { x: 50, y: 100 + s * 0.866 }; B = { x: 50 + s, y: 100 + s * 0.866 }; Cv = { x: 50 + s / 2, y: 100 };
  build();
}

// 頂点 (i, j)：重心座標 (i/n, j/n, k/n)、k = n − i − j。i が A の重み、j が B、k が C
function pos(i, j) { let k = n - i - j; return { x: (i * A.x + j * B.x + k * Cv.x) / n, y: (i * A.y + j * B.y + k * Cv.y) / n }; }
function allowed(i, j) { let k = n - i - j, a = []; if (i > 0) a.push(0); if (j > 0) a.push(1); if (k > 0) a.push(2); return a; }

function build() {
  tris = [];
  for (let i = 0; i < n; i++) for (let j = 0; i + j < n; j++) {
    tris.push([[i, j], [i + 1, j], [i, j + 1]]);
    if (i + j < n - 1) tris.push([[i + 1, j], [i, j + 1], [i + 1, j + 1]]);
  }
  recolor();
}
function recolor() {
  cols = {};
  for (let i = 0; i <= n; i++) for (let j = 0; i + j <= n; j++) {
    let al = allowed(i, j);
    cols[i + ',' + j] = paintMode === 1 ? brouwerColor(i / n, j / n, (n - i - j) / n) : al[floor(random(al.length))];
  }
  if (paintMode === 1) findFixed();
  walk = []; walkShown = 0;
}
// ★ 三角形を自分自身へ写す連続写像（重心座標で）。f の成分の和は 1 のまま
function fmap(l0, l1, l2) {
  let a = [l0 + 0.9 * l1 * (1 + Math.sin(5 * l2 + phi)), l1 + 0.9 * l2 * (1 + Math.sin(4 * l0 + 2 * phi)), l2 + 0.9 * l0 * (1 + Math.sin(3 * l1 - phi))];
  let sm = a[0] + a[1] + a[2];
  return [a[0] / sm, a[1] / sm, a[2] / sm];
}
// 色 = f で「減る（増えない）」座標の番号。その座標が 0 でない中から選ぶ → スペルナーのルールを自動で満たす
function brouwerColor(l0, l1, l2) {
  let L = [l0, l1, l2], F = fmap(l0, l1, l2);
  for (let c = 0; c < 3; c++) if (L[c] > 0 && F[c] <= L[c]) return c;
  return L.findIndex((x) => x > 0);
}
function findFixed() {
  // 細かい格子で |f(λ) − λ| が最小の点を探して、くり返しで仕上げる
  let best = null, bd = 1e9, N = 120;
  for (let i = 0; i <= N; i++) for (let j = 0; i + j <= N; j++) {
    let L = [i / N, j / N, (N - i - j) / N], F = fmap(...L);
    let d = abs(F[0] - L[0]) + abs(F[1] - L[1]) + abs(F[2] - L[2]);
    if (d < bd) { bd = d; best = L; }
  }
  fixedB = best;
}

function colorOf(v) { return cols[v[0] + ',' + v[1]]; }
function isFull(t) { let s = new Set(t.map(colorOf)); return s.size === 3; }
function edgeKey(u, v) { let a = u[0] + ',' + u[1], b = v[0] + ',' + v[1]; return a < b ? a + '|' + b : b + '|' + a; }

// ドアをたどる：底辺 AB（k = 0、色は赤か緑）の上の赤−緑の辺から入り、反対のドアから出る、をくり返す
function startWalk() {
  let doors = [];
  for (let i = 0; i < n; i++) { let u = [i, n - i], v = [i + 1, n - i - 1]; if (new Set([colorOf(u), colorOf(v)]).size === 2 && colorOf(u) !== 2 && colorOf(v) !== 2) doors.push([u, v]); }
  if (doors.length === 0) return;
  let door = doors[doorPick % doors.length]; doorPick++;
  let edgeTris = {};
  tris.forEach((t, ti) => { for (let e = 0; e < 3; e++) { let k = edgeKey(t[e], t[(e + 1) % 3]); (edgeTris[k] = edgeTris[k] || []).push(ti); } });
  walk = []; let cur = edgeTris[edgeKey(door[0], door[1])][0], inDoor = edgeKey(door[0], door[1]);
  for (let guard = 0; guard < tris.length + 2; guard++) {
    walk.push(cur);
    let t = tris[cur];
    if (isFull(t)) break;
    // もう 1 つの赤−緑のドアを探す
    let out = null;
    for (let e = 0; e < 3; e++) {
      let u = t[e], v = t[(e + 1) % 3], k = edgeKey(u, v);
      let cs = [colorOf(u), colorOf(v)].sort().join();
      if (cs === '0,1' && k !== inDoor) out = k;
    }
    if (!out) break;
    let nb = edgeTris[out].filter((x) => x !== cur);
    if (nb.length === 0) break;            // 外へ出た（別の底辺のドア）
    cur = nb[0]; inDoor = out;
  }
  walkShown = 0;
}

function draw() {
  background(230, 30, 11);
  if (walkShown < walk.length && frameCount % 8 === 0) walkShown++;
  let full = 0;
  // 小三角形
  for (let ti = 0; ti < tris.length; ti++) {
    let t = tris[ti], p = t.map((v) => pos(v[0], v[1]));
    let f3 = isFull(t);
    if (f3) full++;
    stroke(0, 0, 45); strokeWeight(1);
    if (f3) fill(45, 90, 100, 85); else noFill();
    triangle(p[0].x, p[0].y, p[1].x, p[1].y, p[2].x, p[2].y);
  }
  // たどった部屋
  for (let w = 0; w < walkShown; w++) {
    let t = tris[walk[w]], p = t.map((v) => pos(v[0], v[1]));
    noStroke(); fill(0, 0, 100, 30); triangle(p[0].x, p[0].y, p[1].x, p[1].y, p[2].x, p[2].y);
    if (w > 0) {
      let q = tris[walk[w - 1]].map((v) => pos(v[0], v[1]));
      stroke(0, 0, 100); strokeWeight(3);
      line((q[0].x + q[1].x + q[2].x) / 3, (q[0].y + q[1].y + q[2].y) / 3, (p[0].x + p[1].x + p[2].x) / 3, (p[0].y + p[1].y + p[2].y) / 3);
    }
  }
  // 頂点
  noStroke();
  let r = constrain(140 / n, 5, 16);
  for (let i = 0; i <= n; i++) for (let j = 0; i + j <= n; j++) {
    let p = pos(i, j); fill(HUES[cols[i + ',' + j]], 80, 95); circle(p.x, p.y, r);
  }
  // ブラウワー版：本当の不動点
  if (paintMode === 1 && fixedB) {
    let px = fixedB[0] * A.x + fixedB[1] * B.x + fixedB[2] * Cv.x, py = fixedB[0] * A.y + fixedB[1] * B.y + fixedB[2] * Cv.y;
    noFill(); stroke(0, 0, 100); strokeWeight(2); circle(px, py, 24); line(px - 16, py, px + 16, py); line(px, py - 16, px, py + 16);
  }

  let tx = B.x + 50;
  noStroke(); fill(0, 0, 100); textSize(18);
  text((paintMode === 0 ? '手でぬる' : 'ブラウワー版（f でぬる）') + '　分割 n = ' + n + '（↑↓）　クリック：色を変える　スペース：ドアをたどる　M：切りかえ' + (paintMode === 1 ? '　←→：写像' : '') + '　R：ぬり直す', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('辺のルール：底辺は赤か緑、左の辺は赤か青、右の辺は緑か青（角はその色）。内側は自由', 20, 68);
  fill(45, 90, 100); textSize(28);
  text('3 色の小三角形：' + full + ' 個（' + (full % 2 === 1 ? '奇数' : '偶数') + '）', tx, 150);
  fill(0, 0, 80); textSize(15);
  let lines = paintMode === 0 ? [
    'どうぬっても 3 色の三角形は奇数個。0 個にはできない',
    '',
    'ドアの議論：赤−緑の辺を「ドア」と呼ぶ',
    '・底辺の上のドアは奇数枚',
    '・3 色の部屋はドアが 1 枚、それ以外はドアが 0 枚か 2 枚',
    '・底辺のドアから入って反対のドアから出る、をくり返すと',
    '  外へ出る（別の底辺のドア）か、3 色の部屋で止まる',
    '・底辺のドアは奇数枚 → どれかは 3 色の部屋で止まる',
    '',
    'スペース：底辺のドアから順にたどる（白い線）',
  ] : [
    '色 c = f で重心座標の c 番目が増えない（f_c ≤ λ_c）',
    '→ 辺のルールが自動で守られる',
    '',
    '3 色の小三角形の 3 頂点では、3 つの座標が',
    'それぞれ「増えない」。三角形が小さければ',
    'その点の近くで f(λ) ≈ λ（不動点）',
    '',
    '↑ で n を大きくすると、3 色の三角形が',
    '白い十字（本当の不動点）に縮んでいく',
    'これがブラウワーの不動点定理の証明の 1 つ',
  ];
  for (let i = 0; i < lines.length; i++) text(lines[i], tx, 200 + i * 26);
}

function mousePressed() {
  if (paintMode === 1) return;
  for (let i = 0; i <= n; i++) for (let j = 0; i + j <= n; j++) {
    let p = pos(i, j);
    if (dist(mouseX, mouseY, p.x, p.y) < 12) {
      let al = allowed(i, j), c = cols[i + ',' + j];
      cols[i + ',' + j] = al[(al.indexOf(c) + 1) % al.length];
      walk = []; walkShown = 0;
    }
  }
}
function keyPressed() {
  if (key === UP_ARROW) { n = min(40, n + (n >= 16 ? 4 : 1)); build(); }
  if (key === DOWN_ARROW) { n = max(2, n - (n > 16 ? 4 : 1)); build(); }
  if (key === ' ') startWalk();
  if (key === 'm' || key === 'M') { paintMode = 1 - paintMode; recolor(); }
  if (key === 'r' || key === 'R') recolor();
  if (paintMode === 1 && (key === LEFT_ARROW || key === RIGHT_ARROW)) { phi += key === LEFT_ARROW ? -0.2 : 0.2; recolor(); }
}

// ---------- やってみよう ----------
// 1. 内側の点の色をクリックで変えて、3 色の三角形を 0 個にしようとしてみよう。1 個まで減らせる？
// 2. 底辺の色を見て、赤−緑のドアの枚数を数えよう。いつも奇数になるのはなぜ？（端が赤と緑だから）
// 3. ブラウワー版で n = 4 → 40 と細かくしていき、黄色の三角形が白い十字に集まるのを確かめよう
// 4. 3 次元（四面体と 4 色）でも同じことが成り立つ。ドアは何色の面になる？
