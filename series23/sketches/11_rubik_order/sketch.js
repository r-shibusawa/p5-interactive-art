// ============================================
// 11 ルービックキューブ ② 操作の位数
// 手順（例：R U）を何回もくり返すと、必ずいつか元にもどる。その回数が「位数」
//   位数 = ステッカーの動き（置換）を巡回に分けたときの、長さの最小公倍数
// 1〜6 = 手順の例 / u d l r f b（Shift で '）= 手順を自分でつくる / Backspace = 1 手消す / スペース = 1 回だけ適用
// A = 元にもどるまで自動でくり返す / ↑↓ = 自動の速さ / V = 動きの矢印 / 0 = リセット
// ============================================

const PRESETS = ['R', 'R U', "R U R' U'", 'R2 U2', "R U'", "R U2 D' B D'"];  // ★ 手順の例
let seq = toSeq(PRESETS[1]);
let cube;                 // 今の状態
let reps = 0;             // くり返した回数
let auto = false;
let speed = 1;            // ★ 1 フレームに何回くり返すか（↑↓）
let info;                 // 1 回分の置換の分析
let showArrows = true;
let flash = 0;
let done = '';

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('sans-serif');
  resetAll();
}

function resetAll() { cube = newCube(); reps = 0; auto = false; done = ''; info = analyze(seq); }

function draw() {
  background(26, 26, 36);
  if (auto && seq.length) {
    for (let i = 0; i < speed && auto; i++) applyOnce();
  }
  let cs = min((width * 0.56) / 12, (height - 200) / 9);
  let x0 = 30, y0 = 130;
  drawNet(cube, x0, y0, cs, null);
  if (showArrows) drawArrows(x0, y0, cs);
  if (flash > 0) { noStroke(); fill(255, 255, 255, flash * 6); rect(x0, y0, cs * 12, cs * 9); flash--; }

  // 文字
  noStroke();
  fill(255);
  textSize(18);
  text('1〜6：例　u d l r f b（Shift で \'）：手順をつくる　Backspace：消す　スペース：1 回適用　A：自動（' + (auto ? 'ON' : 'off') + '）　↑↓：速さ ' + speed + '　V：矢印　0：リセット', 20, 36);
  fill(170);
  textSize(15);
  text('同じ手順をくり返すと、キューブの状態は有限個しかないので必ず元にもどる。何回で？ ＝ その手順（群の元）の位数', 20, 62);

  let px = x0 + cs * 12 + 40, py = 120;
  fill(255);
  textSize(16);
  text('手順', px, py);
  textSize(34);
  text(seq.length ? seq.join(' ') : '（空）', px, py + 40, width - px - 20);
  textSize(16);
  fill(255, 210, 90);
  text('くり返した回数', px, py + 110);
  textSize(56);
  text(reps, px, py + 166);
  textSize(22);
  fill(120, 230, 160);
  text(done, px, py + 204);

  fill(255);
  textSize(16);
  text('位数（計算）', px, py + 250);
  textSize(40);
  fill(130, 200, 255);
  text(info.order, px, py + 294);
  fill(200);
  textSize(15);
  let y = py + 330;
  text('動くキュービーの巡回（1 回分）：', px, y); y += 24;
  for (let line of info.lines.slice(0, 9)) { text(line, px, y); y += 22; }
  if (info.lines.length > 9) { text('…', px, y); y += 22; }
  fill(170);
  text('位数 = lcm(' + info.lens.join(', ') + ') = ' + info.order, px, y + 10);
  text('ねじれ（×3）や向きの反転（×2）があると巡回は長くなる', px, y + 34);
}

// 1 回だけ手順を適用して、そろったか調べる
function applyOnce() {
  if (!seq.length) return;
  doSeq(cube, seq);
  reps++;
  if (isSolved(cube)) { auto = false; done = reps + ' 回で元どおり！'; flash = 30; }
  else done = '';
}

// 手順 1 回分を、ステッカーの置換・キュービーの巡回として分析
function analyze(s) {
  let st = newCube();
  doSeq(st, s);
  let to = {};                                   // ステッカーの元の場所 → 行き先
  for (let t of st) to[pkey(t.home)] = pkey(t.p);
  // ステッカーの巡回の長さ
  let seen = {}, stLen = {};
  for (let k in to) {
    if (seen[k]) continue;
    let cyc = [], c = k;
    while (!seen[c]) { seen[c] = true; cyc.push(c); c = to[c]; }
    for (let c2 of cyc) stLen[c2] = cyc.length;
  }
  // キュービー（中心 = ステッカー − 法線）の巡回
  let cto = {}, rep = {};
  for (let t of st) {
    let h = pkey(t.home.map((v, i) => v - t.hn[i])), p = pkey(t.p.map((v, i) => v - t.n[i]));
    cto[h] = p; rep[h] = pkey(t.home);
  }
  let cseen = {}, lines = [], lens = [];
  for (let h in cto) {
    if (cseen[h]) continue;
    let cyc = [], c = h;
    while (!cseen[c]) { cseen[c] = true; cyc.push(c); c = cto[c]; }
    let eff = stLen[rep[h]];
    if (eff === 1) continue;
    let kind = h.split(',').filter((v) => v !== '0').length === 3 ? '角' : '辺';
    let names = cyc.map(cubieName).join(' → ');
    let tw = eff / cyc.length;
    lines.push(kind + '（' + cyc.length + '）' + (tw > 1 ? '×' + tw + (kind === '角' ? ' ねじれ' : ' 反転') : '') + '　' + names);
    lens.push(eff);
  }
  let order = lens.reduce((a, b) => lcmOf(a, b), 1);
  // 矢印用：動くステッカーの組
  let arrows = [];
  for (let t of st) if (pkey(t.home) !== pkey(t.p)) arrows.push([t.home, t.hn, t.p, t.n]);
  return { order, lines, lens: lens.length ? lens : [1], arrows };
}

function cubieName(k) {
  let [x, y, z] = k.split(',').map(Number);
  return (y > 0 ? 'U' : y < 0 ? 'D' : '') + (z > 0 ? 'F' : z < 0 ? 'B' : '') + (x > 0 ? 'R' : x < 0 ? 'L' : '');
}

// 展開図の上に「このステッカーはここへ行く」矢印
function drawArrows(x0, y0, cs) {
  for (let [hp, hn, p, n] of info.arrows) {
    let a = cellCenter(hp, hn, x0, y0, cs), b = cellCenter(p, n, x0, y0, cs);
    stroke(255, 0, 200, 150);
    strokeWeight(2);
    line(a[0], a[1], b[0], b[1]);
    let ang = atan2(b[1] - a[1], b[0] - a[0]);
    noStroke();
    fill(255, 0, 200, 200);
    triangle(b[0], b[1], b[0] - 9 * cos(ang - 0.4), b[1] - 9 * sin(ang - 0.4), b[0] - 9 * cos(ang + 0.4), b[1] - 9 * sin(ang + 0.4));
  }
}
function cellCenter(p, n, x0, y0, cs) {
  let [f, r, c] = netCell(p, n);
  return [x0 + (NET_POS[f][0] + c + 0.5) * cs, y0 + (NET_POS[f][1] + r + 0.5) * cs];
}
function lcmOf(a, b) { let g = (x, y) => (y ? g(y, x % y) : x); return (a / g(a, b)) * b; }

function keyPressed() {
  if (key >= '1' && key <= '6') { seq = toSeq(PRESETS[+key - 1]); resetAll(); }
  if (key.length === 1 && 'udlrfbUDLRFB'.includes(key)) {
    seq.push(key.toUpperCase() + (key === key.toUpperCase() ? "'" : ''));
    resetAll();
  }
  if (key === 'Backspace') { seq.pop(); resetAll(); }
  if (key === ' ') applyOnce();
  if (key === 'a' || key === 'A') { auto = !auto; done = ''; }
  if (key === 'v' || key === 'V') showArrows = !showArrows;
  if (key === UP_ARROW) speed = min(speed * 2, 64);
  if (key === DOWN_ARROW) speed = max(speed / 2, 1);
  if (key === '0') resetAll();
  return false;
}

// ---------- やってみよう ----------
// 1. 予想してから A：R は 4、R U は？ R U R' U' は？（答え：105 と 6）
// 2. 6 の R U2 D' B D' は 1260 回！ ↑ で速くして確かめよう（3×3×3 で最大級の位数）
// 3. R2 U2 の巡回を見る。辺の 3 サイクル × 2 と角の 2 サイクル… lcm で位数が決まる
// 4. 自分の手順で位数がいちばん大きいものを探そう。位数が奇数になる手順は？
// 5. 位数 n の手順を n − 1 回くり返すと、その手順の「逆」になる（A⁻¹ = Aⁿ⁻¹）


// ==================================================
// ここから下は「キューブの道具」（10〜13 で共通の仕組み）
// ==================================================
// 記号：U=上 D=下 R=右 L=左 F=前 B=後ろ。その面を正面から見て「時計回り」に 90° 回す
//       R' は反時計回り（R の逆操作 R⁻¹）、R2 は 180°（R を 2 回）
// 座標は 2 倍して整数に：小さな立方体（キュービー）の中心は -2, 0, 2、ステッカーは中心 + 法線（面は ±3）
// 回転は 90° の整数回転だけ → 何回回しても誤差がたまらない
const FACE = { U: [1, 1, -1], D: [1, -1, 1], R: [0, 1, -1], L: [0, -1, 1], F: [2, 1, -1], B: [2, -1, 1] }; // [軸, 層, 向き]
const COLS = ['#ffffff', '#ffd500', '#c41e3a', '#ff5800', '#009e60', '#0051ba']; // U D R L F B（白 黄 赤 橙 緑 青）
const NET_POS = [[3, 0], [3, 6], [6, 3], [0, 3], [3, 3], [9, 3]];                // 展開図での各面の位置（マス）

function newCube() {
  let st = [];
  for (let x = -3; x <= 3; x++) for (let y = -3; y <= 3; y++) for (let z = -3; z <= 3; z++) {
    let p = [x, y, z];
    let outer = p.filter((v) => Math.abs(v) === 3).length;
    let inner = p.filter((v) => v === 0 || Math.abs(v) === 2).length;
    if (outer !== 1 || inner !== 2) continue;
    let n = p.map((v) => (Math.abs(v) === 3 ? Math.sign(v) : 0));
    st.push({ p, n, c: faceIndex(n), home: p.slice(), hn: n.slice() });
  }
  return st;
}
function faceIndex(n) { return n[1] === 1 ? 0 : n[1] === -1 ? 1 : n[0] === 1 ? 2 : n[0] === -1 ? 3 : n[2] === 1 ? 4 : 5; }
// 軸 ax のまわりに 90°（d = +1 で右手系の正の向き、-1 で逆）
function rot90(v, ax, d) {
  let [x, y, z] = v;
  if (ax === 0) return d > 0 ? [x, -z, y] : [x, z, -y];
  if (ax === 1) return d > 0 ? [z, y, -x] : [-z, y, x];
  return d > 0 ? [-y, x, z] : [y, -x, z];
}
function parseMove(m) { return { f: m[0], times: m.length === 1 ? 1 : m[1] === '2' ? 2 : 3 }; }
function inLayer(s, f) { let [ax, layer] = FACE[f]; return s.p[ax] * layer >= 2; }
function turn(st, f, times) {
  let [ax, , d] = FACE[f];
  for (let t = 0; t < times; t++) for (let s of st) if (inLayer(s, f)) { s.p = rot90(s.p, ax, d); s.n = rot90(s.n, ax, d); }
}
function doMove(st, m) { let q = parseMove(m); turn(st, q.f, q.times); }
function doSeq(st, seq) { for (let m of seq) doMove(st, m); }
function invMove(m) { return m.length === 1 ? m + "'" : m[1] === "'" ? m[0] : m; }
function invSeq(seq) { return seq.slice().reverse().map(invMove); }
function toSeq(str) { return str.trim().split(/\s+/).filter(Boolean); }
function isSolved(st) { return st.every((s) => s.c === faceIndex(s.n)); }
function pkey(p) { return p.join(','); }
// ステッカー → 展開図の [面, 行, 列]
function netCell(p, n) {
  let f = faceIndex(n), [x, y, z] = p, r, c;
  if (f === 0) { c = (x + 2) / 2; r = (z + 2) / 2; }
  else if (f === 1) { c = (x + 2) / 2; r = (2 - z) / 2; }
  else if (f === 2) { c = (2 - z) / 2; r = (2 - y) / 2; }
  else if (f === 3) { c = (z + 2) / 2; r = (2 - y) / 2; }
  else if (f === 4) { c = (x + 2) / 2; r = (2 - y) / 2; }
  else { c = (2 - x) / 2; r = (2 - y) / 2; }
  return [f, r, c];
}
// 展開図を描く（hi = 強調するマスの集合 "面,行,列"）
function drawNet(st, x0, y0, cs, hi) {
  stroke(20); strokeWeight(2);
  for (let s of st) {
    let [f, r, c] = netCell(s.p, s.n);
    let x = x0 + (NET_POS[f][0] + c) * cs, y = y0 + (NET_POS[f][1] + r) * cs;
    fill(COLS[s.c]);
    rect(x, y, cs, cs, 3);
    if (hi && hi.has(f + ',' + r + ',' + c)) { noFill(); stroke(255, 0, 200); strokeWeight(4); rect(x + 3, y + 3, cs - 6, cs - 6, 3); stroke(20); strokeWeight(2); }
  }
  // 面の名前は中心のマスに（中心のステッカーは面の回転では動かない）
  noStroke(); fill(0, 110); textAlign(CENTER, CENTER); textSize(cs * 0.42);
  ['U', 'D', 'R', 'L', 'F', 'B'].forEach((nm, f) => text(nm, x0 + (NET_POS[f][0] + 1.5) * cs, y0 + (NET_POS[f][1] + 1.5) * cs));
  textAlign(LEFT, BASELINE);
}
