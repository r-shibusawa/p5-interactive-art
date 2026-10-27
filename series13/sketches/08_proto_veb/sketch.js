// ============================================
// 08 proto-vEB ─ 「要約」を再帰的に入れ子にする
// 大きさ u の構造の中に、大きさ √u の「要約」1 つと「かたまり」√u 個。その中にまた √u … と入れ子にしていく
// MEMBER は 1 本道で O(lg lg u)。でも SUCCESSOR や INSERT は 1 回の呼び出しで再帰を 2 回以上呼ぶので遅い → 09 で改良
// スペース = ランダムな x の SUCCESSOR / 数字 + Enter = SUCCESSOR(x) / 下の数直線クリック = INSERT・MEMBER / M = MINIMUM / R = やり直し
// ============================================

let U = 16;           // ★ 全体の大きさ（16 = 2^(2^2)）
let SPEED = 0.35;     // ★ 1 コマの秒数
let START = 5;        // ★ 最初に入れる要素の数

let V, uid = 0;
let trace = [], ti = 0, timer = 0, opName = '', result = '';
let boxes = {};       // id → 画面上の箱
let typed = '';
let members = new Set();

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  reset();
}

function mkProto(u) {
  let n = { u, id: uid++ };
  if (u === 2) n.A = [0, 0];
  else { let s = round(sqrt(u)); n.summary = mkProto(s); n.cluster = Array.from({ length: s }, () => mkProto(s)); }
  return n;
}
function reset() {
  uid = 0; V = mkProto(U); members = new Set(); trace = []; opName = ''; result = '';
  for (let i = 0; i < START; i++) { let x = floor(random(U)); ins(V, x, 0, false); members.add(x); }
}

const sqrtU = (u) => round(sqrt(u));
const high = (u, x) => floor(x / sqrtU(u));
const low = (u, x) => x % sqrtU(u);
const idx = (u, h, l) => h * sqrtU(u) + l;
const NIL = null;

function call(n, op, x, d, log) { if (log) trace.push({ id: n.id, txt: `${op}(proto-vEB(${n.u})${x === undefined ? '' : ', ' + x})`, d }); }
function ret(n, v, d, log) { if (log) trace.push({ id: n.id, txt: `→ ${v === NIL ? 'NIL' : v}`, d, ret: true }); return v; }

function member(n, x, d, log) {
  call(n, 'MEMBER', x, d, log);
  if (n.u === 2) return ret(n, n.A[x] ? 'はい' : 'いいえ', d, log);
  return ret(n, member(n.cluster[high(n.u, x)], low(n.u, x), d + 1, log), d, log);
}
function minimum(n, d, log) {
  call(n, 'MINIMUM', undefined, d, log);
  if (n.u === 2) return ret(n, n.A[0] ? 0 : n.A[1] ? 1 : NIL, d, log);
  let mc = minimum(n.summary, d + 1, log);
  if (mc === NIL) return ret(n, NIL, d, log);
  let off = minimum(n.cluster[mc], d + 1, log);
  return ret(n, idx(n.u, mc, off), d, log);
}
function successor(n, x, d, log) {
  call(n, 'SUCCESSOR', x, d, log);
  if (n.u === 2) return ret(n, x === 0 && n.A[1] ? 1 : NIL, d, log);
  let h = high(n.u, x), off = successor(n.cluster[h], low(n.u, x), d + 1, log);
  if (off !== NIL) return ret(n, idx(n.u, h, off), d, log);
  let sc = successor(n.summary, h, d + 1, log);
  if (sc === NIL) return ret(n, NIL, d, log);
  off = minimum(n.cluster[sc], d + 1, log);
  return ret(n, idx(n.u, sc, off), d, log);
}
function ins(n, x, d, log) {
  call(n, 'INSERT', x, d, log);
  if (n.u === 2) { n.A[x] = 1; return ret(n, '済', d, log); }
  ins(n.cluster[high(n.u, x)], low(n.u, x), d + 1, log);
  ins(n.summary, high(n.u, x), d + 1, log);
  return ret(n, '済', d, log);
}

function run(name, f) { trace = []; ti = 0; timer = 0; opName = name; result = ''; let r = f(); result = r === NIL ? 'NIL' : r; }

// ---------- 描画 ----------
function drawProto(n, x, y, w, h, base, active, seen) {
  boxes[n.id] = { x, y, w, h };
  let on = active === n.id, was = seen.has(n.id);
  stroke(on ? color(50, 90, 100) : was ? color(280, 50, 80) : color(280, 20, 40));
  strokeWeight(on ? 3.5 : 1.2);
  fill(on ? color(280, 40, 28) : was ? color(280, 30, 18) : color(280, 20, 12));
  rect(x, y, w, h, 6);
  noStroke(); fill(0, 0, 75); textAlign(LEFT, TOP); textSize(constrain(w * 0.06, 9, 13));
  text(`proto-vEB(${n.u})`, x + 5, y + 3);
  if (n.u === 2) {
    let cw = (w - 12) / 2;
    for (let i = 0; i < 2; i++) {
      fill(n.A[i] ? color(280, 60, 85) : color(280, 10, 22)); rect(x + 4 + i * (cw + 4), y + 20, cw, h - 26, 4);
      fill(0, 0, 100); textAlign(CENTER, CENTER); textSize(min(16, cw * 0.4)); text(n.A[i], x + 4 + i * (cw + 4) + cw / 2, y + 20 + (h - 26) / 2 - 4);
      if (base !== null) { fill(0, 0, 70); textSize(9); text('x=' + (base + i), x + 4 + i * (cw + 4) + cw / 2, y + h - 12); }
    }
    return;
  }
  let s = sqrtU(n.u), pad = 6, top = 20;
  let cw = (w - pad * (s + 1)) / s, ch = (h - top - pad * 3) / 2;
  drawProto(n.summary, x + w / 2 - cw / 2, y + top, cw, ch, null, active, seen);
  fill(330, 60, 90); textAlign(RIGHT, CENTER); textSize(constrain(w * 0.05, 9, 13)); noStroke();
  text('要約 →', x + w / 2 - cw / 2 - 6, y + top + ch / 2);
  for (let i = 0; i < s; i++) drawProto(n.cluster[i], x + pad + i * (cw + pad), y + top + ch + pad * 2, cw, ch, base === null ? null : base + i * (n.u / s), active, seen);
}

function draw() {
  background(280, 30, 8);
  if (trace.length && ti < trace.length - 1) { timer += deltaTime / 1000; if (timer > SPEED) { timer = 0; ti++; } }
  let cur = trace.length ? trace[ti] : null;
  let seen = new Set(trace.slice(0, ti + 1).map((t) => t.id));
  let W = width - 400, H = height - 260;
  drawProto(V, 24, 120, W, H, 0, cur ? cur.id : -1, seen);

  // 数直線（集合の中身）
  let cw = min(48, W / U), nx = 24 + W / 2 - (U * cw) / 2, ny = height - 120;
  for (let i = 0; i < U; i++) {
    stroke(280, 20, 40); strokeWeight(1);
    fill(members.has(i) ? color(280, 60, 85) : color(280, 10, 16));
    rect(nx + i * cw, ny, cw - 3, 34, 4);
    noStroke(); fill(0, 0, 100); textAlign(CENTER, CENTER); textSize(13); text(i, nx + i * cw + cw / 2 - 1, ny + 17);
  }

  // 呼び出しの記録
  let px = width - 360;
  textAlign(LEFT, TOP); noStroke(); fill(0, 0, 100); textSize(16);
  text(opName ? `${opName}：呼び出し ${trace.filter((t) => !t.ret).length} 回` : '操作を選んでね', px, 120);
  let shown = trace.slice(0, ti + 1), start = max(0, shown.length - 24);
  textSize(12.5);
  shown.slice(start).forEach((t, j) => {
    let on = start + j === ti;
    fill(t.ret ? color(140, 50, 85) : on ? color(50, 90, 100) : color(0, 0, 80));
    text(t.txt, px + t.d * 18, 150 + j * 19);
  });
  if (ti === trace.length - 1 && result !== '') { fill(50, 90, 100); textSize(17); text(`答え：${result}`, px, height - 170); }

  fill(0, 0, 100); textSize(26); text('proto-vEB 構造（再帰的な要約）', 24, 18);
  textSize(15); fill(0, 0, 80);
  text(`proto-vEB(${U}) の中に 要約 proto-vEB(${sqrtU(U)}) と かたまり proto-vEB(${sqrtU(U)}) × ${sqrtU(U)}。深さは lg lg u = ${round(log(log(U) / log(2)) / log(2))} 段`, 24, 56);
  text('MEMBER：T(u) = T(√u) + O(1) = O(lg lg u)   SUCCESSOR：T(u) = 2T(√u) + O(lg √u) = O(lg u · lg lg u)   INSERT：T(u) = 2T(√u) + O(1) = O(lg u)', 24, 80);
  fill(0, 0, 60); textSize(14);
  text(`入力中: ${typed || '―'}`, 24, height - 52);
  text('スペース = SUCCESSOR / 数字 + Enter = SUCCESSOR(x) / 数直線クリック = 入っていなければ INSERT、入っていれば MEMBER / M = MINIMUM / R = やり直し', 24, height - 30);
}

function mousePressed() {
  let W = width - 400, cw = min(48, W / U), nx = 24 + W / 2 - (U * cw) / 2, ny = height - 120;
  if (mouseY > ny && mouseY < ny + 34) {
    let i = floor((mouseX - nx) / cw);
    if (i >= 0 && i < U) {
      if (members.has(i)) run(`MEMBER(${i})`, () => member(V, i, 0, true));
      else { members.add(i); run(`INSERT(${i})`, () => ins(V, i, 0, true)); }
    }
  }
}

function keyPressed() {
  if (key >= '0' && key <= '9') { typed = (typed + key).slice(-2); return; }
  if (key === 'Backspace') { typed = typed.slice(0, -1); return; }
  if (key === 'Enter' && typed) { let x = constrain(int(typed), 0, U - 1); run(`SUCCESSOR(${x})`, () => successor(V, x, 0, true)); typed = ''; return; }
  if (key === ' ') { let x = floor(random(U)); run(`SUCCESSOR(${x})`, () => successor(V, x, 0, true)); return false; }
  if (key === 'm' || key === 'M') run('MINIMUM', () => minimum(V, 0, true));
  if (key === 'r' || key === 'R') reset();
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }
