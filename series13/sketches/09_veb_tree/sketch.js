// ============================================
// 09 van Emde Boas 木 ─ O(lg lg u) の魔法
// proto-vEB に「最小値 min と最大値 max」を足しただけ。しかも min はかたまりの中に入れない
// これで SUCCESSOR・INSERT・DELETE が、1 回の呼び出しにつき再帰を高々 1 回しか呼ばなくなる → T(u) = T(√u) + O(1) = O(lg lg u)
// 下のマスをクリック = INSERT / DELETE / スペース = ランダムな SUCCESSOR / P = PREDECESSOR / 数字 + Enter = SUCCESSOR(x) / ←→ = u（16・256）/ R = やり直し
// ============================================

let U = 16;           // ★ 全体の大きさ（16 か 256）
let SPEED = 0.4;      // ★ 1 コマの秒数
let START = 6;        // ★ 最初に入れる要素の数

let V, uid = 0;
let trace = [], ti = 0, timer = 0, opName = '', result = '';
let typed = '';

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  reset();
}

function mk(u) {
  let n = { u, id: uid++, min: null, max: null };
  if (u > 2) { let s = round(sqrt(u)); n.summary = mk(s); n.cluster = Array.from({ length: s }, () => mk(s)); }
  return n;
}
function reset() {
  uid = 0; V = mk(U); trace = []; opName = ''; result = '';
  for (let i = 0; i < START * (U / 16 > 1 ? 6 : 1); i++) { let x = floor(random(U)); if (member(V, x, 0, false) !== 'はい') insert(V, x, 0, false); }
}

const NIL = null;
const sqrtU = (u) => round(sqrt(u));
const high = (u, x) => floor(x / sqrtU(u));
const low = (u, x) => x % sqrtU(u);
const idx = (u, h, l) => h * sqrtU(u) + l;
function call(n, txt, d, log) { if (log) trace.push({ id: n.id, txt: `${txt.replace('V', 'vEB(' + n.u + ')')}`, d }); }
function ret(n, v, d, log) { if (log) trace.push({ id: n.id, txt: `→ ${v === NIL ? 'NIL' : v}`, d, ret: true }); return v; }

// ---------- vEB 木の操作----------
function member(n, x, d, log) {
  call(n, `MEMBER(V, ${x})`, d, log);
  if (x === n.min || x === n.max) return ret(n, 'はい', d, log);
  if (n.u === 2) return ret(n, 'いいえ', d, log);
  return ret(n, member(n.cluster[high(n.u, x)], low(n.u, x), d + 1, log), d, log);
}

function successor(n, x, d, log) {
  call(n, `SUCCESSOR(V, ${x})`, d, log);
  if (n.u === 2) return ret(n, x === 0 && n.max === 1 ? 1 : NIL, d, log);
  if (n.min !== NIL && x < n.min) return ret(n, n.min, d, log);
  let h = high(n.u, x), maxLow = n.cluster[h].max;
  if (maxLow !== NIL && low(n.u, x) < maxLow) return ret(n, idx(n.u, h, successor(n.cluster[h], low(n.u, x), d + 1, log)), d, log);
  let sc = successor(n.summary, h, d + 1, log);
  if (sc === NIL) return ret(n, NIL, d, log);
  return ret(n, idx(n.u, sc, n.cluster[sc].min), d, log);
}

function predecessor(n, x, d, log) {
  call(n, `PREDECESSOR(V, ${x})`, d, log);
  if (n.u === 2) return ret(n, x === 1 && n.min === 0 ? 0 : NIL, d, log);
  if (n.max !== NIL && x > n.max) return ret(n, n.max, d, log);
  let h = high(n.u, x), minLow = n.cluster[h].min;
  if (minLow !== NIL && low(n.u, x) > minLow) return ret(n, idx(n.u, h, predecessor(n.cluster[h], low(n.u, x), d + 1, log)), d, log);
  let pc = predecessor(n.summary, h, d + 1, log);
  if (pc === NIL) return ret(n, n.min !== NIL && x > n.min ? n.min : NIL, d, log);
  return ret(n, idx(n.u, pc, n.cluster[pc].max), d, log);
}

function insert(n, x, d, log) {
  call(n, `INSERT(V, ${x})`, d, log);
  if (n.min === NIL) { n.min = n.max = x; return ret(n, '空だったので min = max = ' + x + '（再帰なし）', d, log); }
  if (x < n.min) { let t = x; x = n.min; n.min = t; if (log) trace.push({ id: n.id, txt: `新しい min。古い min ${x} を下へ入れる`, d }); }
  if (n.u > 2) {
    let h = high(n.u, x), l = low(n.u, x);
    if (n.cluster[h].min === NIL) {
      insert(n.summary, h, d + 1, log);
      n.cluster[h].min = n.cluster[h].max = l;
      if (log) trace.push({ id: n.cluster[h].id, txt: `空のかたまりには O(1) で入れる（min = max = ${l}）`, d: d + 1 });
    } else insert(n.cluster[h], l, d + 1, log);
  }
  if (x > n.max) n.max = x;
  return ret(n, '済', d, log);
}

function del(n, x, d, log) {
  call(n, `DELETE(V, ${x})`, d, log);
  if (n.min === n.max) { n.min = n.max = NIL; return ret(n, '要素 1 個だった → 空に', d, log); }
  if (n.u === 2) { n.min = x === 0 ? 1 : 0; n.max = n.min; return ret(n, '済', d, log); }
  if (x === n.min) {
    let fc = n.summary.min;
    x = idx(n.u, fc, n.cluster[fc].min);
    n.min = x;
    if (log) trace.push({ id: n.id, txt: `min を消す → 次に小さい ${x} を新しい min にして、それを下から消す`, d });
  }
  let h = high(n.u, x);
  del(n.cluster[h], low(n.u, x), d + 1, log);
  if (n.cluster[h].min === NIL) {
    del(n.summary, h, d + 1, log);
    if (x === n.max) {
      let sm = n.summary.max;
      n.max = sm === NIL ? n.min : idx(n.u, sm, n.cluster[sm].max);
    }
  } else if (x === n.max) n.max = idx(n.u, h, n.cluster[h].max);
  return ret(n, '済', d, log);
}

function run(name, f) {
  trace = []; ti = 0; timer = 0; opName = name;
  let r = f(); result = r === NIL ? 'NIL' : r;
}
function elements() { let e = []; for (let x = 0; x < U; x++) if (member(V, x, 0, false) === 'はい') e.push(x); return e; }

// ---------- 描画 ----------
function drawVEB(n, x, y, w, h, active, seen) {
  let on = active === n.id, was = seen.has(n.id), empty = n.min === NIL;
  stroke(on ? color(50, 90, 100) : was ? color(160, 60, 80) : color(160, 20, empty ? 22 : 40));
  strokeWeight(on ? 3.5 : 1.2);
  fill(on ? color(160, 45, 28) : was ? color(160, 35, 18) : color(160, 20, empty ? 8 : 13));
  rect(x, y, w, h, 6);
  noStroke(); textAlign(LEFT, TOP);
  let ts = constrain(w * 0.075, 8, 14);
  fill(0, 0, empty ? 45 : 85); textSize(ts);
  text(`vEB(${n.u})`, x + 4, y + 3);
  fill(empty ? color(0, 0, 40) : color(50, 80, 100));
  text(`min ${n.min === NIL ? '–' : n.min}  max ${n.max === NIL ? '–' : n.max}`, x + 4, y + 4 + ts);
  if (n.u === 2 || w < 110 || h < 90) return;
  let s = sqrtU(n.u), pad = 5, top = 10 + ts * 2;
  let cw = (w - pad * (s + 1)) / s, ch = (h - top - pad * 3) / 2;
  drawVEB(n.summary, x + w / 2 - cw / 2, y + top, cw, ch, active, seen);
  noStroke(); fill(330, 60, 90); textAlign(RIGHT, CENTER); textSize(ts * 0.9);
  if (w > 300) text('要約 →', x + w / 2 - cw / 2 - 6, y + top + ch / 2);
  for (let i = 0; i < s; i++) drawVEB(n.cluster[i], x + pad + i * (cw + pad), y + top + ch + pad * 2, cw, ch, active, seen);
}

function cellGeom() {
  let W = width - 400, per = U === 16 ? 16 : 32, rows = U / per, cw = min(48, W / per);
  let ch = U === 16 ? 34 : 20;
  return { W, per, rows, cw, ch, x0: 24 + W / 2 - (per * cw) / 2, y0: height - 70 - rows * ch };
}

function draw() {
  background(160, 35, 7);
  if (trace.length && ti < trace.length - 1) { timer += deltaTime / 1000; if (timer > SPEED) { timer = 0; ti++; } }
  let cur = trace.length ? trace[ti] : null;
  let seen = new Set(trace.slice(0, ti + 1).map((t) => t.id));
  let g = cellGeom();
  drawVEB(V, 24, 112, g.W, g.y0 - 130, cur ? cur.id : -1, seen);

  let el = new Set(elements());
  for (let i = 0; i < U; i++) {
    let x = g.x0 + (i % g.per) * g.cw, y = g.y0 + floor(i / g.per) * g.ch;
    stroke(160, 20, 40); strokeWeight(1);
    fill(el.has(i) ? color(160, 60, 75) : color(160, 10, 15));
    rect(x, y, g.cw - 2, g.ch - 3, 3);
    noStroke(); fill(0, 0, 100); textAlign(CENTER, CENTER); textSize(U === 16 ? 13 : 9); text(i, x + g.cw / 2 - 1, y + g.ch / 2 - 1);
  }

  let px = width - 360;
  textAlign(LEFT, TOP); noStroke(); fill(0, 0, 100); textSize(16);
  let calls = trace.filter((t) => !t.ret && t.txt.includes('(')).length;
  let depth = trace.reduce((m, t) => max(m, t.d), 0);
  text(opName ? `${opName}\n呼び出し ${calls} 回・最大の深さ ${depth}` : '操作を選んでね', px, 106);
  let shown = trace.slice(0, ti + 1), start = max(0, shown.length - 26);
  textSize(12);
  shown.slice(start).forEach((t, j) => {
    fill(t.ret ? color(140, 50, 85) : start + j === ti ? color(50, 90, 100) : color(0, 0, 80));
    text(t.txt, px + t.d * 16, 152 + j * 18, 340 - t.d * 16);
  });
  if (trace.length && ti === trace.length - 1) { fill(50, 90, 100); textSize(17); text(`答え：${result}`, px, height - 110); }

  fill(0, 0, 100); textSize(26); text('van Emde Boas 木', 24, 18);
  textSize(15); fill(0, 0, 80);
  let lglg = round(log(log(U) / log(2)) / log(2));
  text(`u = ${U}：深さは lg lg u = ${lglg} 段。各段で再帰は高々 1 回 → T(u) = T(√u) + O(1) = O(lg lg u)。u = 2^64 でも 6 段！`, 24, 56);
  text('ポイント：min は下のかたまりに入れない。空のかたまりへの INSERT は O(1)。だから「要約に入れる」再帰と「かたまりに入れる」再帰が同時に起きない', 24, 80);
  fill(0, 0, 60); textSize(14);
  text(`入力中: ${typed || '―'}`, px, height - 80);
  text('マスをクリック = INSERT / DELETE / スペース = SUCCESSOR / P = PREDECESSOR / 数字 + Enter = SUCCESSOR(x) / ←→ = u / R = やり直し', 24, height - 30);
}

function mousePressed() {
  let g = cellGeom();
  let c = floor((mouseX - g.x0) / g.cw), r = floor((mouseY - g.y0) / g.ch);
  if (c < 0 || c >= g.per || r < 0 || r >= g.rows) return;
  let i = r * g.per + c;
  if (member(V, i, 0, false) === 'はい') run(`DELETE(${i})`, () => del(V, i, 0, true));
  else run(`INSERT(${i})`, () => insert(V, i, 0, true));
}

function keyPressed() {
  if (key >= '0' && key <= '9') { typed = (typed + key).slice(-3); return; }
  if (key === 'Backspace') { typed = typed.slice(0, -1); return; }
  if (key === 'Enter' && typed) { let x = constrain(int(typed), 0, U - 1); run(`SUCCESSOR(${x})`, () => successor(V, x, 0, true)); typed = ''; return; }
  if (key === ' ') { let x = floor(random(U)); run(`SUCCESSOR(${x})`, () => successor(V, x, 0, true)); return false; }
  if (key === 'p' || key === 'P') { let x = floor(random(U)); run(`PREDECESSOR(${x})`, () => predecessor(V, x, 0, true)); }
  if (key === 'ArrowRight' && U !== 256) { U = 256; reset(); }
  if (key === 'ArrowLeft' && U !== 16) { U = 16; reset(); }
  if (key === 'r' || key === 'R') reset();
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }
