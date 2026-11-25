// ============================================
// 04 計算グラフと誤差逆伝播 ─ 小さなネット L = (σ(w1 x + b) w2 − y)² を、1 回の計算ずつの「ノード」に分けて描く
// 前向き（左 → 右）：各ノードの値を計算。後ろ向き（右 → 左）：∂L/∂(ノード) を連鎖律でもどす
//   ∂L/∂(入力) = ∂L/∂(出力) × ∂(出力)/∂(入力)（その場所だけの微分）。同じ値を 2 か所で使ったら勾配は足し算
// 右の表：逆伝播の勾配と、差分 (L(p + h) − L(p − h))/2h が一致するかの確認（勾配チェック）
// スペース 1 ノードずつ進める / A 自動再生 / ← → 変える数をえらぶ / ↑↓ その数を ±0.1 / G 勾配降下を 1 回 / T 学習し続ける / R ランダムな値
// ============================================

const LR = 0.3;                          // ★ 勾配降下の学習率
const EDIT = ['x', 'w1', 'b', 'w2', 'y'];
let graphN = null, vals = { x: 1.5, w1: 0.8, b: -0.4, w2: 1.2, y: 0.2 }, editIdx = 1, phase = 0, autoOn = true, autoT = 0, trainOn = false, lossHist = [], seedV = 1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  graphN = makeGraph(); runAll(graphN, vals);
}

// ★ 計算グラフ：ノード = { id, op, args（入力ノードの番号）, val, grad }。並び順 = 計算の順番
function makeGraph() {
  let g = [], add = (id, op, args, p) => { g.push({ id, op, args: args || [], val: 0, grad: 0, p }); return g.length - 1; };
  let x = add('x', 'in', [], [0.05, 0.18]), w1 = add('w1', 'in', [], [0.05, 0.45]);
  let u = add('u', 'mul', [w1, x], [0.21, 0.3]), b = add('b', 'in', [], [0.21, 0.62]);
  let z = add('z', 'add', [u, b], [0.37, 0.45]), h = add('h', 'sig', [z], [0.52, 0.45]);
  let w2 = add('w2', 'in', [], [0.52, 0.75]), o = add('o', 'mul', [h, w2], [0.66, 0.58]);
  let y = add('y', 'in', [], [0.66, 0.88]), e = add('e', 'sub', [o, y], [0.8, 0.72]);
  add('L', 'sq', [e], [0.94, 0.72]);
  return g;
}
function nodeOf(g, id) { return g.find((n) => n.id === id); }
function forward(g, v) {
  for (let n of g) {
    let a = n.args.map((i) => g[i].val);
    if (n.op === 'in') n.val = v[n.id];
    else if (n.op === 'mul') n.val = a[0] * a[1];
    else if (n.op === 'add') n.val = a[0] + a[1];
    else if (n.op === 'sub') n.val = a[0] - a[1];
    else if (n.op === 'sig') n.val = sigm(a[0]);
    else if (n.op === 'sq') n.val = a[0] * a[0];
  }
  return g[g.length - 1].val;
}
function localGrads(g, n) {              // ∂(n)/∂(入力 k) の値（その場所だけの微分）
  let a = n.args.map((i) => g[i].val);
  if (n.op === 'mul') return [a[1], a[0]];
  if (n.op === 'add') return [1, 1];
  if (n.op === 'sub') return [1, -1];
  if (n.op === 'sig') return [n.val * (1 - n.val)];
  if (n.op === 'sq') return [2 * a[0]];
  return [];
}
// ★ 誤差逆伝播：最後のノードの勾配 = 1 から、逆の順番に「自分の勾配 × その場所の微分」を入力へ足していく
function backward(g) {
  for (let n of g) n.grad = 0;
  g[g.length - 1].grad = 1;
  for (let k = g.length - 1; k >= 0; k--) { let n = g[k], lg = localGrads(g, n); n.args.forEach((i, q) => (g[i].grad += n.grad * lg[q])); }
}
function runAll(g, v) { let L = forward(g, v); backward(g); return L; }
function lossAt(v) { return forward(makeGraph(), v); }
function gradCheck(v, id, hh) { let a = Object.assign({}, v), b = Object.assign({}, v); a[id] += hh; b[id] -= hh; return (lossAt(a) - lossAt(b)) / (2 * hh); }
function gdStep() {
  runAll(graphN, vals);
  for (let id of ['w1', 'b', 'w2']) vals[id] = clampv(vals[id] - LR * nodeOf(graphN, id).grad, -20, 20);
  let L = runAll(graphN, vals); lossHist.push(L); if (lossHist.length > 300) lossHist.shift();
}

function draw() {
  background(...BG);
  let nN = graphN.length;
  if (trainOn && frameCount % 3 === 0) { gdStep(); phase = 2 * nN; }
  if (autoOn && !trainOn && ++autoT % 30 === 0) phase = (phase + 1) % (2 * nN + 6);
  let L = runAll(graphN, vals);
  hudTitle('計算グラフと誤差逆伝播：L = (σ(w1 x + b) w2 − y)² = ' + fmtN(L, 5) + '　' + (phase < nN ? '前向き ' + (phase + 1) + ' / ' + nN : '後ろ向き ' + Math.min(nN, phase - nN + 1) + ' / ' + nN),
    'スペース 1 ノード進める　A 自動再生 ' + (autoOn ? 'ON' : 'OFF') + '　← → 変える数（' + EDIT[editIdx] + '）　↑↓ ±0.1　G 勾配降下 1 回　T 学習し続ける ' + (trainOn ? 'ON' : 'OFF') + '　R ランダム');
  let gw = width * 0.64, gy = 100, gh = height - 270, bw = Math.min(118, gw * 0.13), bh = 66;
  let pos = (n) => [30 + n.p[0] * (gw - bw), gy + n.p[1] * gh];
  // 矢印（後ろ向きで勾配が流れたら、マゼンタで局所的な微分を書く）
  for (let k = 0; k < nN; k++) {
    let n = graphN[k], lg = localGrads(graphN, n);
    n.args.forEach((i, q) => {
      let a = pos(graphN[i]), b = pos(n), back = phase >= nN && nN - 1 - (phase - nN) <= k;
      stroke(...(back ? MAG : phase >= k ? WIRE.map((c) => c + 60) : WIRE)); strokeWeight(back ? 3 : 2);
      line(a[0] + bw, a[1] + bh / 2, b[0], b[1] + bh / 2);
      if (back) { noStroke(); fill(...MAG); textSize(13); textAlign(CENTER, BOTTOM); text('×' + fmtN(lg[q], 3), (a[0] + bw + b[0]) / 2, (a[1] + b[1]) / 2 + bh / 2 - 4); }
    });
  }
  for (let k = 0; k < nN; k++) {
    let n = graphN[k], [x, y] = pos(n), shownF = phase >= k, shownB = phase >= nN && nN - 1 - (phase - nN) <= k, isEd = n.id === EDIT[editIdx];
    stroke(...(isEd ? AMBER : shownB ? MAG : WIRE)); strokeWeight(isEd ? 3 : 1.5); fill(...PANEL); rect(x, y, bw, bh, 8);
    noStroke(); fill(...INK); textSize(16); textAlign(LEFT, TOP);
    text(n.id + (n.op === 'in' ? '' : ' = ' + opLabel(graphN, n)), x + 8, y + 5);
    textSize(14); fill(...(shownF ? LIME : WIRE)); text('値 ' + (shownF ? fmtN(n.val, 4) : '…'), x + 8, y + 26);
    fill(...(shownB ? MAG : WIRE)); text('勾配 ' + (shownB ? fmtN(n.grad, 4) : '…'), x + 8, y + 45);
  }
  // 今のステップの説明
  noStroke(); textAlign(LEFT, BASELINE); textSize(16); fill(...INK);
  let ty = gy + gh + 86;
  if (phase < nN) { let n = graphN[phase]; text('前向き：' + n.id + (n.op === 'in' ? ' は入力 = ' : ' = ' + opLabel(graphN, n) + ' = ') + fmtN(n.val, 5), 30, ty); }
  else if (phase < 2 * nN) {
    let k = nN - 1 - (phase - nN), n = graphN[k];
    if (k === nN - 1) text('後ろ向き：∂L/∂L = 1 から始める', 30, ty);
    else { let users = graphN.filter((m) => m.args.includes(k)); text('後ろ向き：∂L/∂' + n.id + ' = ' + users.map((m) => '∂L/∂' + m.id + ' × ∂' + m.id + '/∂' + n.id).join(' + ') + ' = ' + fmtN(n.grad, 5), 30, ty); }
  } else text('全部の勾配がそろった。G で w1, b, w2 を「勾配の反対向き」に ' + LR + ' 倍動かす', 30, ty);
  fill(...SUB); textSize(13);
  text('緑 = 前向きの値、マゼンタ = ∂L/∂(そのノード)。矢印の「×数」= その場所だけの微分（mul なら相手の値、σ なら σ(1 − σ)、2 乗なら 2e）', 30, ty + 24);
  // ---- 右：勾配チェックと損失
  let rx = gw + 40;
  fill(...INK); textSize(16); text('勾配チェック（h = 1e−5 の中心差分）', rx, 110);
  textSize(13); fill(...SUB); text('数　　逆伝播　　　差分　　　相対誤差', rx, 136);
  ['x', 'w1', 'b', 'w2', 'y'].forEach((id, i) => {
    let bp = nodeOf(graphN, id).grad, fd = gradCheck(vals, id, 1e-5), re = relErr(bp, fd);
    fill(...(re < 1e-6 ? LIME : MAG)); textSize(14);
    text(id.padEnd(3, ' ') + '　' + fmtN(bp, 6).padStart(9, ' ') + '　' + fmtN(fd, 6).padStart(9, ' ') + '　' + fmtE(re), rx, 162 + 24 * i);
  });
  let g = { x: rx + 10, y: 330, w: width - rx - 50, h: Math.min(220, height - 470), x0: 0, x1: Math.max(10, lossHist.length - 1), y0: 0, y1: Math.max(1e-3, ...lossHist, 0.01) };
  plotAxes(g, 'G の回数', '損失 L の変化（G・T で学習）', [0, g.x1], [0, +g.y1.toPrecision(2)]);
  plotXY(g, lossHist.map((_, i) => i), lossHist, AMBER, 2);
  drawSelfTest(width - 180, height - 14);
}
function opLabel(g, n) { let a = n.args.map((i) => g[i].id); return n.op === 'mul' ? a[0] + '·' + a[1] : n.op === 'add' ? a[0] + ' + ' + a[1] : n.op === 'sub' ? a[0] + ' − ' + a[1] : n.op === 'sig' ? 'σ(' + a[0] + ')' : n.op === 'sq' ? a[0] + '²' : ''; }

function keyPressed() {
  let nN = graphN.length;
  if (key === ' ') { autoOn = false; phase = (phase + 1) % (2 * nN + 1); }
  if (key === 'a' || key === 'A') autoOn = !autoOn;
  if (key === RIGHT_ARROW) editIdx = (editIdx + 1) % EDIT.length;
  if (key === LEFT_ARROW) editIdx = (editIdx + EDIT.length - 1) % EDIT.length;
  if (key === UP_ARROW) { vals[EDIT[editIdx]] = clampv(Math.round((vals[EDIT[editIdx]] + 0.1) * 10) / 10, -5, 5); phase = 0; }
  if (key === DOWN_ARROW) { vals[EDIT[editIdx]] = clampv(Math.round((vals[EDIT[editIdx]] - 0.1) * 10) / 10, -5, 5); phase = 0; }
  if (key === 'g' || key === 'G') { gdStep(); phase = 2 * nN; }
  if (key === 't' || key === 'T') trainOn = !trainOn;
  if (key === 'r' || key === 'R') { seedRng(400 + seedV++); for (let id of EDIT) vals[id] = Math.round(20 * (rnd() - 0.5)) / 10; lossHist = []; phase = 0; }
  return false;
}

// ============================================
// やってみよう
// ・スペースで 1 つずつ進め、∂L/∂w1 = 2e × w2 × σ(1 − σ) × x になっていることを紙で確かめる
// ・y を σ の範囲（0〜1）の外、例えば 1.5 にしたら学習はどこまで進む？
// ・makeGraph に新しいノード（例：L2 = L + 0.1 w2²）を足し、opLabel・forward・localGrads を書きかえる
// ・x を 0 にすると w1 の勾配はいくつ？ どうして？
// ============================================

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let g = makeGraph(), worst = 0;
  seedRng(404);
  for (let t = 0; t < 20; t++) {
    let v = { x: 2 * randn(), w1: randn(), b: randn(), w2: 2 * randn(), y: rnd() };
    runAll(g, v);
    for (let id of EDIT) { let bp = nodeOf(g, id).grad, fd = gradCheck(v, id, 1e-5); worst = Math.max(worst, Math.abs(bp - fd) / Math.max(1e-4, Math.abs(bp) + Math.abs(fd))); }
  }
  check('20 組のランダムな値：逆伝播の勾配 = 中心差分（相対誤差 ' + fmtE(worst) + ' < 1e−6）', worst < 1e-6);
  let v = { x: 1.5, w1: 0.8, b: -0.4, w2: 1.2, y: 0.2 }; runAll(g, v);
  let s = sigm(0.8 * 1.5 - 0.4), e = s * 1.2 - 0.2, closed = 2 * e * 1.2 * s * (1 - s) * 1.5;
  check('∂L/∂w1 = 2e · w2 · σ(1 − σ) · x（手で微分した式と一致）', near(nodeOf(g, 'w1').grad, closed, 1e-14));
  let sq = [{ id: 'a', op: 'in', args: [], val: 0, grad: 0 }, { id: 'f', op: 'mul', args: [0, 0], val: 0, grad: 0 }];
  forward(sq, { a: 3 }); backward(sq);
  check('同じ値を 2 回使う f = a·a：勾配は足し算で 2a = 6', sq[0].grad === 6);
  let keep = Object.assign({}, vals), keepH = lossHist.slice(), gg = graphN;
  graphN = makeGraph(); vals = Object.assign({}, v); let L0 = runAll(graphN, vals);
  for (let k = 0; k < 60; k++) gdStep();
  let L1 = runAll(graphN, vals);
  check('勾配降下 60 回で損失が下がる（' + fmtN(L0, 4) + ' → ' + fmtE(L1) + '）', L1 < 0.01 * L0);
  graphN = gg; vals = keep; lossHist = keepH;
  reportSelfTest();
}

// ==================================================
// ここから下は「神経回路網の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 色と小さな道具（神経細胞：深い青緑の黒、あたたかい白、シナプスのマゼンタ、軸索のライム）
const BG = [8, 22, 24];                  // 背景（深い青緑の黒）
const INK = [246, 238, 224];             // 文字（あたたかい白）
const MAG = [232, 72, 160], LIME = [184, 232, 76], AMBER = [250, 186, 72], SKY = [96, 196, 236], VIOLET = [168, 140, 250];
const SUB = [150, 178, 172], PANEL = [16, 38, 40], WIRE = [44, 76, 76];
function clampv(v, a, b) { return v < a ? a : v > b ? b : v !== v ? a : v; }     // NaN なら a に戻す
function sumOf(a) { let s = 0; for (let v of a) s += v; return s; }
function meanOf(a) { return a.length ? sumOf(a) / a.length : 0; }
function fmtN(v, d) { if (typeof v !== 'number' || v !== v) return '?'; if (!isFinite(v)) return v > 0 ? '∞' : '−∞'; let s = v.toFixed(d === undefined ? 2 : d); return /^-0\.?0*$/.test(s) ? s.slice(1) : s; }
function fmtE(v) { if (typeof v !== 'number' || !isFinite(v)) return '?'; return v === 0 ? '0' : v.toExponential(1); }
function hudTitle(t, sub) {              // 左上のタイトルと操作の説明
  noStroke(); fill(...INK); textSize(22); textAlign(LEFT, BASELINE); text(t, 30, 38);
  fill(...SUB); textSize(14); text(sub, 30, 62);
}
function sigm(z) { return 1 / (1 + Math.exp(-clampv(z, -40, 40))); }
// ---- 種つきの乱数（同じ種なら毎回同じ列 → 実験をくり返せる）
let rngState = 1;
function seedRng(s) { rngState = (s >>> 0) || 1; }
function rnd() {                         // 0〜1 の一様乱数（mulberry32）
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rndInt(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
function randn() { let u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }   // 標準正規分布
function shuffleArr(a) { for (let i = a.length - 1; i > 0; i--) { let j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
// ---- グラフの道具：g = { x, y, w, h, x0, x1, y0, y1 }
function gX(g, v) { return g.x + clampv((v - g.x0) / (g.x1 - g.x0), -0.02, 1.02) * g.w; }
function gY(g, v) { return g.y + g.h - clampv((v - g.y0) / (g.y1 - g.y0), -0.02, 1.02) * g.h; }
function plotAxes(g, xl, yl, xt, yt) {
  stroke(...WIRE); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h);
  noStroke(); fill(...SUB); textSize(12); textAlign(CENTER, TOP);
  for (let v of xt) text(+v.toPrecision(3), gX(g, v), g.y + g.h + 4);
  textAlign(RIGHT, CENTER);
  for (let v of yt) text(+v.toPrecision(3), g.x - 5, gY(g, v));
  textAlign(LEFT, BASELINE); fill(...INK); textSize(13);
  text(xl, g.x + g.w - textWidth(xl), g.y + g.h + 30); text(yl, g.x, g.y - 8);
}
function polyline(pts) {                 // 点が 2 つ以上あるときだけ折れ線を描く（空の beginShape を作らない）
  if (pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape();
}
function plotXY(g, xs, ys, col, sw) {    // (xs[i], ys[i]) を折れ線で（有限の値だけ）
  let pts = []; for (let i = 0; i < xs.length; i++) if (isFinite(ys[i])) pts.push([gX(g, xs[i]), gY(g, ys[i])]);
  stroke(...col); strokeWeight(sw || 2); polyline(pts);
}
function legend(x, y, items) {           // items = [[色, 名前], …]
  textSize(13); textAlign(LEFT, CENTER);
  for (let [c, s] of items) { noStroke(); fill(...c); rect(x, y - 5, 16, 10); fill(...INK); text(s, x + 22, y); y += 20; }
  textAlign(LEFT, BASELINE);
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function relErr(a, b) { return Math.abs(a - b) / Math.max(1e-12, Math.abs(a) + Math.abs(b)); }
function noNaN(v) { return Array.isArray(v) || ArrayBuffer.isView(v) ? Array.from(v).every(noNaN) : !(typeof v === 'number' && !isFinite(v)); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(150, 230, 170) : color(255, 90, 110)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
