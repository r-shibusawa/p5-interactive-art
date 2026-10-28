// ============================================
// 13 ルービックキューブ ④ 状態の数と神の数
// 回して作れる状態は 8!·3⁷·12!·2¹¹ / 2 = 43,252,003,274,489,856,000 通り（BigInt で計算）
// ばらして組み立て直すと 12 倍の状態がつくれるが、そのうち 11/12 は回すだけでは絶対にそろわない。3 つの「保存量」のせい
// u d l r f b（Shift で '）= 回す / スペース = かき混ぜる / 0 = リセット
// T = 角を 1 個だけひねる / E = 辺を 1 個だけ裏返す / W = 辺を 2 個だけ入れかえる（どれも「反則」）
// ============================================

let cube;
let illegal = [];                 // やった反則の記録
let F = (n) => (n <= 1n ? 1n : n * F(n - 1n));   // 階乗（BigInt）

function setup() {
  createCanvas(windowWidth, windowHeight);
  cube = newCube();
}

function draw() {
  background(20, 24, 30);
  let cs = min((width * 0.46) / 12, (height - 300) / 9);
  let x0 = 30, y0 = 110;
  drawNet(cube, x0, y0, cs, null);
  let inv = invariants(cube);

  noStroke();
  fill(255);
  textSize(18);
  text('u d l r f b（Shift で \'）：回す　スペース：かき混ぜる　0：リセット　T：角をひねる　E：辺を裏返す　W：辺を 2 個入れかえる', 20, 36);
  fill(170);
  textSize(15);
  text('普通に回すだけなら、下の 3 つの値は絶対に変わらない（保存量）。反則をすると変わる → もう回すだけではそろわない', 20, 62);

  // 3 つの保存量
  let py = y0 + cs * 9 + 40;
  let rows = [
    ['角のねじれの合計 mod 3', inv.twist, inv.twist === 0],
    ['辺の向きの反転の合計 mod 2', inv.flip, inv.flip === 0],
    ['角の置換の偶奇 と 辺の置換の偶奇', (inv.cp ? '奇' : '偶') + ' / ' + (inv.ep ? '奇' : '偶'), inv.cp === inv.ep],
  ];
  textSize(18);
  for (let i = 0; i < 3; i++) {
    let y = py + i * 32;
    fill(rows[i][2] ? color(120, 230, 160) : color(255, 110, 110));
    text((rows[i][2] ? '○ ' : '× ') + rows[i][0] + ' = ' + rows[i][1], 30, y);
  }
  let ok = rows.every((r) => r[2]);
  textSize(26);
  fill(ok ? color(120, 230, 160) : color(255, 110, 110));
  text(ok ? (isSolved(cube) ? 'そろっている' : '回せばそろう状態') : '回すだけでは絶対にそろわない！', 30, py + 112);
  if (illegal.length) { fill(170); textSize(15); text('反則：' + illegal.join(' '), 30, py + 140); }

  // 状態の数（BigInt）
  let px = x0 + cs * 12 + 50, y = 110;
  let corners = F(8n) * 3n ** 7n, edges = F(12n) * 2n ** 11n;
  let total = (corners * edges) / 2n;
  let all = F(8n) * 3n ** 8n * F(12n) * 2n ** 12n;
  fill(255); textSize(20);
  text('回してつくれる状態の数', px, y);
  textSize(17); fill(200);
  y += 36; text('角 8 個：並べ方 8! = ' + fmt(F(8n)) + ' × 向き 3⁷ = ' + fmt(3n ** 7n), px, y);
  y += 30; text('辺 12 個：並べ方 12! = ' + fmt(F(12n)) + ' × 向き 2¹¹ = ' + fmt(2n ** 11n), px, y);
  y += 30; text('向きが 3⁸・2¹² でないのは、最後の 1 個の向きが残りから決まるから', px, y);
  y += 30; text('÷ 2：角と辺の置換の偶奇はいつも同じ', px, y);
  y += 44; fill(255, 210, 90); textSize(15);
  text('8!·3⁷·12!·2¹¹ / 2 =', px, y);
  y += 38; textSize(min(34, (width - px) / 18));
  text(fmt(total), px, y);
  y += 30; fill(200); textSize(16);
  text('≈ 4.3 × 10¹⁹（4325 京）通り。1 秒に 1 つ見ても 1 兆年以上', px, y);
  y += 40;
  text('ばらして組み立てると ' + fmt(all) + ' 通り', px, y, width - px - 20);
  y += 50;
  text('→ ちょうど 12 倍（= 3 × 2 × 2）。そろえられるのはそのうち 1/12 だけ', px, y);
  y += 50; fill(130, 200, 255); textSize(19);
  text('神の数 = 20', px, y);
  fill(200); textSize(15);
  text('どんな状態からも 20 手以内（180° も 1 手）でそろえられ、20 手必要な状態もある（2010 年、コンピュータで証明）', px, y + 26, width - px - 20);
}

// 3 つの保存量を、ステッカーの色から計算する
function invariants(st) {
  let col = {};
  for (let s of st) col[pkey(s.p)] = s.c;
  let ud = (c) => c === 0 || c === 1;            // 白・黄
  let fb = (c) => c === 4 || c === 5;            // 緑・青
  // 角：U/D 向きのステッカーから時計回りに並べ、白か黄がどこにあるか（0, 1, 2）
  let twist = 0, cperm = [];
  for (let sx of [-1, 1]) for (let sy of [-1, 1]) for (let sz of [-1, 1]) {
    let c = [2 * sx, 2 * sy, 2 * sz];
    let ns = [[0, sy, 0], [sx, 0, 0], [0, 0, sz]];
    if (sx * sy * sz < 0) ns = [ns[0], ns[2], ns[1]];   // 向きをそろえる（外から見て同じ回り）
    let cs = ns.map((n) => col[pkey([c[0] + n[0], c[1] + n[1], c[2] + n[2]])]);
    twist += cs.findIndex(ud);
    cperm.push(cs.slice().sort().join(''));
  }
  // 辺：基準のマス（U/D 面、なければ F/B 面）に白・黄（なければ緑・青）があれば 0
  let flip = 0, eperm = [];
  for (let k of edgeSlots()) {
    let [c, nRef, nOther] = k;
    let a = col[pkey(c.map((v, i) => v + nRef[i]))], b = col[pkey(c.map((v, i) => v + nOther[i]))];
    let primaryIsA = ud(a) || (!ud(b) && fb(a));
    flip += primaryIsA ? 0 : 1;
    eperm.push([a, b].sort().join(''));
  }
  return { twist: ((twist % 3) + 3) % 3, flip: flip % 2, cp: parityOf(cperm), ep: parityOf(eperm) };
}
function edgeSlots() {
  let out = [];
  for (let a = 0; a < 3; a++) for (let s1 of [-1, 1]) for (let s2 of [-1, 1]) {
    let c = [0, 0, 0], ax = [(a + 1) % 3, (a + 2) % 3];
    c[ax[0]] = 2 * s1; c[ax[1]] = 2 * s2;
    let n1 = [0, 0, 0], n2 = [0, 0, 0];
    n1[ax[0]] = s1; n2[ax[1]] = s2;
    // 基準：y の面があれば y、なければ z
    let ref = ax.includes(1) ? (ax[0] === 1 ? 0 : 1) : (ax[0] === 2 ? 0 : 1);
    out.push(ref === 0 ? [c, n1, n2] : [c, n2, n1]);
  }
  return out;
}
let HOME = null;   // そろった状態での各位置のピース（色の組）
// 「どの位置にどのピースがあるか」の置換の偶奇（巡回の数から）
function parityOf(cur) {
  if (!HOME) HOME = invariantsHome();
  let home = cur.length === 8 ? HOME[0] : HOME[1];
  let perm = cur.map((k) => home.indexOf(k));
  let seen = [], cycles = 0;
  for (let i = 0; i < perm.length; i++) {
    if (seen[i] || perm[i] < 0) continue;
    cycles++;
    for (let j = i; !seen[j] && j >= 0; j = perm[j]) seen[j] = true;
  }
  return (perm.length - cycles) % 2;
}
function invariantsHome() {
  let st = newCube(), col = {};
  for (let s of st) col[pkey(s.p)] = s.c;
  let hc = [], he = [];
  for (let sx of [-1, 1]) for (let sy of [-1, 1]) for (let sz of [-1, 1])
    hc.push([[sx, 0, 0], [0, sy, 0], [0, 0, sz]].map((n) => col[pkey([2 * sx + n[0], 2 * sy + n[1], 2 * sz + n[2]])]).sort().join(''));
  for (let [c, n1, n2] of edgeSlots()) he.push([col[pkey(c.map((v, i) => v + n1[i]))], col[pkey(c.map((v, i) => v + n2[i]))]].sort().join(''));
  return [hc, he];
}

// 反則：位置 p のステッカーの色を直接書きかえる
function stickerAt(p) { return cube.find((s) => pkey(s.p) === pkey(p)); }
function twistCorner() {   // UFR の角の 3 色を回す
  let a = stickerAt([2, 3, 2]), b = stickerAt([3, 2, 2]), c = stickerAt([2, 2, 3]);
  [a.c, b.c, c.c] = [c.c, a.c, b.c];
}
function flipEdge() {      // UF の辺の 2 色を入れかえる
  let a = stickerAt([0, 3, 2]), b = stickerAt([0, 2, 3]);
  [a.c, b.c] = [b.c, a.c];
}
function swapEdges() {     // UF と UR の辺を入れかえる
  let a1 = stickerAt([0, 3, 2]), a2 = stickerAt([0, 2, 3]), b1 = stickerAt([2, 3, 0]), b2 = stickerAt([3, 2, 0]);
  [a1.c, b1.c] = [b1.c, a1.c];
  [a2.c, b2.c] = [b2.c, a2.c];
}

function fmt(b) { return b.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

function keyPressed() {
  if (key.length === 1 && 'udlrfbUDLRFB'.includes(key)) doMove(cube, key.toUpperCase() + (key === key.toUpperCase() ? "'" : ''));
  if (key === ' ') for (let i = 0; i < 25; i++) doMove(cube, 'UDLRFB'[floor(Math.random() * 6)] + ['', "'", '2'][floor(Math.random() * 3)]);
  if (key === 't' || key === 'T') { twistCorner(); illegal.push('ひねり'); }
  if (key === 'e' || key === 'E') { flipEdge(); illegal.push('裏返し'); }
  if (key === 'w' || key === 'W') { swapEdges(); illegal.push('入れかえ'); }
  if (key === '0') { cube = newCube(); illegal = []; }
  return false;
}

// ---------- やってみよう ----------
// 1. T を押してから好きなだけ回す → ねじれの合計はずっと 1 のまま。T を 3 回でまた ○ になる
// 2. E と W を両方やると？ 2 つの × が同時に ○ にもどるか確かめよう
// 3. 2×2×2 キューブなら？ 角だけなので 8!·3⁷ / 24（全体の向き）= 3,674,160 通り。BigInt で計算してみよう
// 4. 「1 手で行ける状態は 18 通り」。n 手で行ける状態は最大 18·15ⁿ⁻¹。何手で 4.3×10¹⁹ を超える？（神の数の下限の考え方）


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
