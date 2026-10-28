// ============================================
// 10 ルービックキューブ ① 3D キューブを回す
// 3×3×3 のキューブを 6 つの面の回転（U D L R F B）だけで動かす。回転は 90° の整数回転なのでずれない
//   記号：U=上 D=下 L=左 R=右 F=前 B=後ろ を時計回り、' は反時計回り（逆操作）
// u d l r f b = 時計回り / Shift + 同じキー（大文字）= 反時計回り / スペース = 20 手でかき混ぜる
// Backspace か Z = 1 手もどす / 0 = そろった状態にもどす / マウスドラッグ = 視点を回す（orbitControl）
// ============================================

let cube;              // 54 枚のステッカー（下の「キューブの道具」）
let queue = [];        // これから回す手（アニメーション待ち）
let anim = null;       // 今回している手 { m: 'R', t: 0〜1 }
let history = [];      // 回した手の記録
let turnFrames = 12;   // ★ 1 手にかけるフレーム数（小さいほど速い）
let U_PX = 54;         // ★ 1 単位の大きさ（px）。キュービー 1 個 = 2 単位
let scrambleLen = 20;  // ★ かき混ぜる手数
let mainCam, hudCam, hud;

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  hudCam = createCamera();            // 文字（HUD）用の動かないカメラ
  mainCam = createCamera();           // キューブを見るカメラ（orbitControl で動く）
  mainCam.camera(520, -430, 640, 0, 0, 0, 0, 1, 0);
  hud = createGraphics(width, height);
  cube = newCube();
}

function draw() {
  background(22, 24, 32);
  setCamera(mainCam);
  orbitControl();

  // アニメーションを進める（待ちが多いときは速く）
  if (!anim && queue.length) anim = { m: queue.shift(), t: 0 };
  if (anim) {
    anim.t += (queue.length > 2 ? 3 : 1) / turnFrames;
    if (anim.t >= 1) { doMove(cube, anim.m); anim = null; }   // ここで整数の回転を本当に適用
  }
  drawCube();

  // HUD（2D の文字）を手前に重ねる
  clearDepth();
  setCamera(hudCam);
  drawHud();
  noStroke();
  image(hud, -width / 2, -height / 2, width, height);
}

// 今回している層だけ、見た目の上で角度 ang だけ回して描く
function drawCube() {
  let ax = -1, ang = 0, f = null;
  if (anim) {
    let q = parseMove(anim.m);
    let [a, , d] = FACE[q.f];
    let e = anim.t * anim.t * (3 - 2 * anim.t);                      // なめらかに加速・減速
    let k = q.times === 2 ? 2 : q.times === 3 ? -1 : 1;
    ax = a; f = q.f; ang = d * k * HALF_PI * e;
  }
  noStroke();
  beginShape(TRIANGLES);
  for (let s of cube) {
    let moving = f && inLayer(s, f);
    let a = moving ? ang : 0;
    quadAt(s.p, s.n, 1.0, 0, a, ax, [12, 12, 14]);                     // 黒い台紙
    quadAt(s.p, s.n, 0.86, 0.03, a, ax, hexToRgb(COLS[s.c]));          // 色のステッカー
  }
  // 回転中は、切れ目に黒いふたを 2 枚（回る側と止まっている側）
  if (f) {
    let [a, layer] = FACE[f];
    let p = [0, 0, 0], n = [0, 0, 0];
    p[a] = layer; n[a] = -layer;
    quadAt(p, n, 3, 0, ang, ax, [8, 8, 10]);
    n[a] = layer;
    quadAt(p, n, 3, 0, 0, ax, [8, 8, 10]);
  }
  endShape();
}

// 中心 p・法線 n・半分の大きさ h の正方形を、軸 ax まわりに ang 回して三角形 2 枚で追加
function quadAt(p, n, h, lift, ang, ax, rgb) {
  let u = [0, 0, 0], v = [0, 0, 0];
  let na = n[0] !== 0 ? 0 : n[1] !== 0 ? 1 : 2;
  u[(na + 1) % 3] = 1; v[(na + 2) % 3] = 1;
  let c = [p[0] + n[0] * lift, p[1] + n[1] * lift, p[2] + n[2] * lift];
  let pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) =>
    turnFloat([c[0] + (a * u[0] + b * v[0]) * h, c[1] + (a * u[1] + b * v[1]) * h, c[2] + (a * u[2] + b * v[2]) * h], ax, ang));
  fill(rgb[0], rgb[1], rgb[2]);
  for (let i of [0, 1, 2, 0, 2, 3]) vertex(pts[i][0] * U_PX, -pts[i][1] * U_PX, pts[i][2] * U_PX); // 画面は y が下向き
}

// 見た目だけの回転（小数）。rot90 と同じ向き
function turnFloat(q, ax, a) {
  if (ax < 0 || a === 0) return q;
  let c = Math.cos(a), s = Math.sin(a), [x, y, z] = q;
  if (ax === 0) return [x, y * c - z * s, y * s + z * c];
  if (ax === 1) return [x * c + z * s, y, -x * s + z * c];
  return [x * c - y * s, x * s + y * c, z];
}

function drawHud() {
  hud.clear();
  hud.noStroke();
  hud.fill(255);
  hud.textSize(18);
  hud.text('u d l r f b ＝時計回り　Shift＋キー（大文字）＝反時計回り（\'）　スペース：かき混ぜる　Backspace / Z：もどす　0：リセット　ドラッグ：視点', 20, 36);
  hud.fill(170);
  hud.textSize(15);
  hud.text('U=上 D=下 L=左 R=右 F=前 B=後ろ。その面を正面から見て時計回りに 90°。R\' は R の逆操作、R2 は 2 回', 20, 62);
  // 手の記録
  let shown = history.slice(-36);
  hud.fill(255);
  hud.textSize(16);
  hud.text('手数 ' + history.length + (history.length > 36 ? '（最近の 36 手）' : ''), 20, height - 80);
  hud.textSize(22);
  hud.text(shown.join(' '), 20, height - 46, width - 40);
  if (isSolved(cube) && !anim && !queue.length) {
    hud.fill(120, 230, 160);
    hud.textSize(30);
    hud.text(history.length ? 'そろった！' : 'そろった状態', width - 260, height - 46);
  }
}

function keyPressed() {
  if (key.length === 1 && 'udlrfbUDLRFB'.includes(key)) {
    let m = key.toUpperCase() + (key === key.toUpperCase() ? "'" : '');   // 大文字（Shift）なら逆回り
    queue.push(m); history.push(m);
  }
  if (key === ' ') {
    let last = '';
    for (let i = 0; i < scrambleLen; i++) {
      let f;
      do { f = 'UDLRFB'[floor(Math.random() * 6)]; } while (f === last);   // 同じ面を続けない
      last = f;
      let m = f + ['', "'", '2'][floor(Math.random() * 3)];
      queue.push(m); history.push(m);
    }
  }
  if (key === 'Backspace' || key === 'z' || key === 'Z') {
    if (!history.length) return false;
    let m = history.pop();
    if (queue.length && queue[queue.length - 1] === m) queue.pop();     // まだ回していなければ取り消すだけ
    else queue.push(invMove(m));                                         // 回した後なら逆の手を回す
  }
  if (key === '0') { cube = newCube(); queue = []; anim = null; history = []; }
  return false;
}

function hexToRgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }

function windowResized() { resizeCanvas(windowWidth, windowHeight); hud = createGraphics(width, height); }

// ---------- やってみよう ----------
// 1. R を 4 回押すと元どおり。では R U を何回くり返すと元にもどる？（答えは 11 で）
// 2. R U R' U' を 6 回。途中の形を観察しよう（交換子 → 12）
// 3. スペースでかき混ぜて、Backspace を連打すると逆の手順で元にもどる：(AB)⁻¹ = B⁻¹A⁻¹
// 4. turnFrames を 3 にすると超高速。U_PX を変えて大きさを変えよう
// 5. 中段（M 層）を回す手を追加するには？ inLayer の条件 |座標| ≥ 2 を「= 0」にした層を回す


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
