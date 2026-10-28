// ============================================
// 12 ルービックキューブ ③ 交換子と共役
// 交換子 [A, B] = A B A⁻¹ B⁻¹：A と B が重なる所だけが動く → ほんの数個だけ入れかえる手順ができる
// 共役 X A X⁻¹：X で準備 → A → X をもとにもどす。A の効果を「別の場所」に移す
//   実行するのは X · [A, B] · X⁻¹（B が空なら X A X⁻¹）
// 1〜6 = 例 / Tab = 編集する欄（A → B → X）/ u d l r f b（Shift で '）= 欄に手を足す / Backspace = 消す
// スペース = 1 手ずつ実行（動いた所を強調）/ 0 = リセット
// ============================================

const PRESETS = [   // ★ [A, B, X, 説明]
  ['R', 'U', '', '[R, U]：有名な「R U R\' U\'」。7 個だけ動く'],
  ["R U R'", 'D', '', '角だけの 3 サイクル（A は D 面の角 1 個しか動かさない）'],
  ['U2 R2 U2', 'F2', '', '辺だけの 3 サイクル'],
  ['U', '', 'R', '共役 R U R\'：U と同じ「形」の動きが別の場所で'],
  ["R U R'", 'D', 'L', '2 の 3 サイクルを L で共役 → 別の角を入れかえ'],
  ['R', 'U', 'F', 'F [R, U] F\'：上面だけ動く手順（OLL の一つ）'],
];
let A = [], B = [], X = [];
let slot = 0;                 // 0 = A, 1 = B, 2 = X
let note = '';
let cube, before;
let plan = [], pi = 0;        // 実行中の手の列と位置
let timer = 0;
let stepFrames = 14;          // ★ 1 手あたりのフレーム数
let hi = new Set();           // 強調するマス
let movedCount = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  cube = newCube();
  usePreset(0);
}

function usePreset(i) {
  A = toSeq(PRESETS[i][0]); B = toSeq(PRESETS[i][1]); X = toSeq(PRESETS[i][2]); note = PRESETS[i][3];
  cube = newCube(); plan = []; hi = new Set(); movedCount = 0;
}

// X · [A, B] · X⁻¹（B が空なら X A X⁻¹）
function expression() {
  let core = B.length ? [...A, ...B, ...invSeq(A), ...invSeq(B)] : A.slice();
  return [...X, ...core, ...invSeq(X)];
}

function draw() {
  background(24, 28, 34);
  // 1 手ずつ実行
  if (pi < plan.length) {
    timer++;
    if (timer >= stepFrames) {
      timer = 0;
      doMove(cube, plan[pi]);
      pi++;
      if (pi === plan.length) markChanged();
    }
  }
  let cs = min((width * 0.52) / 12, (height - 260) / 9);
  let x0 = 30, y0 = 150;
  drawNet(cube, x0, y0, cs, pi >= plan.length ? hi : null);

  noStroke();
  fill(255);
  textSize(18);
  text('1〜6：例　Tab：編集する欄　u d l r f b（Shift で \'）：手を足す　Backspace：消す　スペース：実行　0：リセット', 20, 36);
  fill(170);
  textSize(15);
  text('[A, B] = A B A⁻¹ B⁻¹。A と B が「ほとんど重ならない」と、重なった数個のピースだけが動く。これがキューブの解法の部品', 20, 62);
  fill(255, 210, 90);
  textSize(17);
  text(note, 20, 100);

  let px = x0 + cs * 12 + 40, py = 140;
  let names = ['A', 'B', 'X'];
  let vals = [A, B, X];
  for (let i = 0; i < 3; i++) {
    let y = py + i * 70;
    fill(i === slot ? color(255, 0, 200, 60) : color(255, 18));
    rect(px - 10, y - 30, width - px - 20, 56, 8);
    fill(i === slot ? color(255, 120, 230) : 255);
    textSize(26);
    text(names[i] + ' = ' + (vals[i].length ? vals[i].join(' ') : '（空）'), px, y + 8);
  }
  // 展開した手順。実行中の手を強調
  let ex = plan.length ? plan : expression();
  let y = py + 230;
  fill(200);
  textSize(16);
  text(X.length ? (B.length ? 'X [A, B] X⁻¹ =' : 'X A X⁻¹ =') : (B.length ? '[A, B] = A B A⁻¹ B⁻¹ =' : 'A ='), px, y);
  textSize(24);
  let cx = px;
  y += 36;
  for (let i = 0; i < ex.length; i++) {
    let w = textWidth(ex[i]) + 14;
    if (cx + w > width - 20) { cx = px; y += 32; }
    fill(plan.length && i === pi ? color(255, 0, 200) : plan.length && i < pi ? color(130) : color(255));
    text(ex[i], cx, y);
    cx += w;
  }
  fill(255);
  textSize(16);
  text(ex.length + ' 手', px, y + 36);
  if (plan.length && pi >= plan.length) {
    fill(120, 230, 160);
    textSize(30);
    text('動いたキュービー：' + movedCount + ' 個', px, y + 86);
    fill(170);
    textSize(15);
    text('枠で囲んだマスが、実行の前と後で色が変わった所', px, y + 112);
  }
}

// 実行の前後でステッカーの色が変わったマスと、そのキュービーを数える
function markChanged() {
  hi = new Set();
  let old = {};
  for (let s of before) old[pkey(s.p)] = s.c;
  let cub = new Set();
  for (let s of cube) {
    if (old[pkey(s.p)] !== s.c) {
      let [f, r, c] = netCell(s.p, s.n);
      hi.add(f + ',' + r + ',' + c);
      cub.add(pkey(s.p.map((v, i) => v - s.n[i])));
    }
  }
  movedCount = cub.size;
}

function keyPressed() {
  if (key >= '1' && key <= '6' && key.length === 1) usePreset(+key - 1);
  if (key === 'Tab') slot = (slot + 1) % 3;
  let target = [A, B, X][slot];
  if (key.length === 1 && 'udlrfbUDLRFB'.includes(key)) {
    target.push(key.toUpperCase() + (key === key.toUpperCase() ? "'" : ''));
    plan = []; hi = new Set(); note = '';
  }
  if (key === 'Backspace') { target.pop(); plan = []; hi = new Set(); }
  if (key === ' ' && pi >= plan.length) {
    before = cube.map((s) => ({ p: s.p.slice(), c: s.c }));
    plan = expression(); pi = 0; timer = 0; hi = new Set();
  }
  if (key === '0') { cube = newCube(); plan = []; hi = new Set(); }
  return false;
}

// ---------- やってみよう ----------
// 1. 例 1 の [R, U] を 6 回実行すると元どおり（11 の位数と同じ）
// 2. 例 2 を 3 回実行 → 3 サイクルなので元どおり。2 回なら逆向きの 3 サイクル
// 3. A と B がまったく重ならない（例：A = R, B = L）と [A, B] は何もしない = 可換
// 4. 例 5 の X を変えて、3 サイクルを好きな 3 つの角に「移動」させよう（これが解法のコツ）
// 5. 自分で A と B を探して、動くキュービーがいちばん少ない交換子を見つけよう


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
