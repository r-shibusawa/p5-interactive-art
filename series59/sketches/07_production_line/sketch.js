// ============================================
// 07 生産ライン ─ 機械 1 → 2 → … → m の順に部品を加工。部品はパレット（台）にのって流れ、最後の機械のあと r 分で入口に戻る
// 機械 i が部品 k を終える時刻 d_i(k) = max( d_{i−1}(k), d_i(k−1), [i = 1 なら] d_m(k−P) + r ) + p_i
//   = 「前の機械が終わる」「自分が前の部品を終える」「パレットが戻る」の遅いほう ⊗ 加工時間。これがマックスプラスの漸化式
//   周期 λ = max( いちばん遅い機械 p_i、 1 周の時間 (Σp + r) / P ) → スループット = 1/λ（個/分）
//   （シリーズ 38 の 10 は工程の固有値。ここはパレットの数 P という「トークン」とボトルネックの入れかわりを見る）
// 3・4・5 機械の数 / ← → 機械を選ぶ / ↑↓ 加工時間 / P・O パレットを増やす・減らす / R 元にもどす
// ============================================

let nMach = 4, proc = [3, 5, 4, 2, 3], pallets = 3, sel = 1;   // ★ 機械の数、加工時間 p_i（分）、パレットの数 P
const RETURN_T = 6;                    // ★ パレットが入口に戻るまでの時間 r（分）
const K_PARTS = 18;                    // ガントチャートに描く部品の数

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); selfTest(); }
// ★ マックスプラスの漸化式で、部品 k = 1 … K の完了時刻 d[k][i]
function simulateLine(p, P, r, K) {
  let m = p.length, d = [new Array(m).fill(NEG_INF)];
  for (let k = 1; k <= K; k++) {
    let row = [];
    for (let i = 0; i < m; i++) {
      let ready = mpAdd(i > 0 ? row[i - 1] : NEG_INF, d[k - 1][i]);
      if (i === 0) ready = mpAdd(ready, k - P >= 1 ? mpMul(d[k - P][m - 1], r) : 0);   // はじめの P 台は時刻 0 に入口にある
      row.push(mpMul(ready, p[i]));
    }
    d.push(row);
  }
  return d;
}
// ★ イベントグラフの回路を全部調べて λ = max (回路の時間の和) / (回路のトークン = パレットの数)
function eventArcs(p, P, r) {
  let m = p.length, arcs = [];
  for (let i = 0; i < m; i++) { arcs.push({ a: i, b: i, w: p[i], tok: 1 }); if (i + 1 < m) arcs.push({ a: i, b: i + 1, w: p[i + 1], tok: 0 }); }
  arcs.push({ a: m - 1, b: 0, w: r + p[0], tok: P });
  return arcs;
}
function cycleRatioBrute(m, arcs) {
  let best = { ratio: NEG_INF, nodes: [] };
  let dfs = (s, v, path, w, tok) => {
    for (let e of arcs) if (e.a === v) {
      if (e.b === s) { let T = tok + e.tok; if (T > 0 && (w + e.w) / T > best.ratio) best = { ratio: (w + e.w) / T, nodes: path.slice() }; }
      else if (e.b > s && !path.includes(e.b)) dfs(s, e.b, path.concat([e.b]), w + e.w, tok + e.tok);
    }
  };
  for (let s = 0; s < m; s++) dfs(s, s, [s], 0, 0);
  return best;
}
function slopeSim(p, P, r) { let K = 3000, W = 840, d = simulateLine(p, P, r, K); return (d[K][p.length - 1] - d[K - W][p.length - 1]) / W; }

function draw() {
  background(22, 22, 28);
  let p = proc.slice(0, nMach), d = simulateLine(p, pallets, RETURN_T, K_PARTS), br = cycleRatioBrute(nMach, eventArcs(p, pallets, RETURN_T));
  let lam = br.ratio, loopLimited = br.nodes.length > 1, tMax = d[K_PARTS][nMach - 1];
  let g = { x: 130, y: 120, w: width - 180, h: 46 * nMach };
  let sx = (t) => g.x + (t / tMax) * g.w;
  textAlign(LEFT, BASELINE); noStroke(); fill(240); textSize(20);
  text('生産ライン　機械 ' + nMach + ' 台、パレット P = ' + pallets + '、戻り r = ' + RETURN_T + ' 分　→　周期 λ = ' + lam.toFixed(2) + ' 分、スループット 1/λ = ' + (1 / lam).toFixed(3) + ' 個/分', 40, 40);
  fill(170); textSize(15); text('3・4・5 機械の数　← → 機械を選ぶ（いま ' + (sel + 1) + '）　↑↓ 加工時間　P・O パレット ±　R 元にもどす', 40, 66);
  // ---- ガントチャート
  for (let i = 0; i < nMach; i++) {
    let y = g.y + i * 46, bott = !loopLimited && br.nodes[0] === i;
    noStroke(); fill(bott ? color(70, 45, 30) : 34); rect(g.x, y, g.w, 38);
    fill(i === sel ? color(255, 220, 120) : 220); textSize(15); textAlign(RIGHT, CENTER); text('機械 ' + (i + 1) + '（' + p[i] + ' 分）', g.x - 10, y + 19);
    for (let k = 1; k <= K_PARTS; k++) {
      let e = d[k][i], s = e - p[i];
      if (s > tMax) continue;
      colorMode(HSB, 360, 100, 100); fill((30 + ((k - 1) % pallets) * (300 / pallets)) % 360, 55, 95); colorMode(RGB, 255);
      rect(sx(s) + 1, y + 4, Math.max(1, sx(Math.min(e, tMax)) - sx(s) - 2), 30);
      if (sx(e) - sx(s) > 18) { fill(20); textAlign(CENTER, CENTER); textSize(11); text(k, (sx(s) + sx(e)) / 2, y + 19); }
    }
  }
  fill(140); textSize(12); textAlign(CENTER, TOP);
  let stepT = tMax > 120 ? 20 : 10; for (let t = 0; t <= tMax; t += stepT) text(t + ' 分', sx(t), g.y + g.h + 4);
  // ---- P を変えたときのスループット
  let gp = { x: 130, y: g.y + g.h + 80, w: Math.min(520, width * 0.4), h: height - g.y - g.h - 170, x0: 0.5, x1: 10.5, y0: 0, y1: 1 / Math.max(...p) * 1.2 };
  plotAxes(gp, 'パレットの数 P', 'スループット 1/λ（個/分）', [1, 2, 4, 6, 8, 10], [0, +(1 / Math.max(...p)).toFixed(3)]);
  for (let P = 1; P <= 10; P++) {
    let l = cycleRatioBrute(nMach, eventArcs(p, P, RETURN_T)).ratio;
    noStroke(); fill(P === pallets ? color(255, 170, 70) : color(110, 190, 255, 170));
    rect(gX(gp, P) - 12, gY(gp, 1 / l), 24, gp.y + gp.h - gY(gp, 1 / l));
  }
  stroke(255, 220, 120); strokeWeight(1.5); line(gp.x, gY(gp, 1 / Math.max(...p)), gp.x + gp.w, gY(gp, 1 / Math.max(...p)));
  // ---- 説明
  let tx = gp.x + gp.w + 60, ty = gp.y + 10, sum = p.reduce((a, b) => a + b, 0);
  noStroke(); textAlign(LEFT, BASELINE); fill(loopLimited ? color(255, 170, 70) : color(150, 230, 160)); textSize(18);
  text(loopLimited ? 'ボトルネック：パレットが足りない（1 周の回路）' : 'ボトルネック：機械 ' + (br.nodes[0] + 1) + '（加工 ' + p[br.nodes[0]] + ' 分）', tx, ty);
  fill(220); textSize(15);
  text('機械だけなら λ ≥ max p_i = ' + Math.max(...p) + ' 分', tx, ty + 30);
  text('パレットの 1 周：(Σp + r) / P = (' + sum + ' + ' + RETURN_T + ') / ' + pallets + ' = ' + ((sum + RETURN_T) / pallets).toFixed(2) + ' 分', tx, ty + 54);
  text('λ = 大きいほう = ' + lam.toFixed(2) + ' 分　（漸化式を 3000 個回した傾き ' + slopeSim(p, pallets, RETURN_T).toFixed(4) + '）', tx, ty + 78);
  fill(170); text('左のグラフ：P を増やすとスループットは上がるが、黄色の線（いちばん遅い機械）で頭打ち', tx, ty + 112, width - tx - 30);
  drawSelfTest(width - 170, height - 12);
}

function keyPressed() {
  for (let k = 3; k <= 5; k++) if (key === String(k)) { nMach = k; sel = Math.min(sel, k - 1); }
  if (key === LEFT_ARROW) sel = (sel + nMach - 1) % nMach;
  if (key === RIGHT_ARROW) sel = (sel + 1) % nMach;
  if (key === UP_ARROW) proc[sel] = Math.min(12, proc[sel] + 1);
  if (key === DOWN_ARROW) proc[sel] = Math.max(1, proc[sel] - 1);
  if (key === 'p' || key === 'P') pallets = Math.min(10, pallets + 1);
  if (key === 'o' || key === 'O') pallets = Math.max(1, pallets - 1);
  if (key === 'r' || key === 'R') { proc = [3, 5, 4, 2, 3]; pallets = 3; nMach = 4; sel = 1; }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(7);
  let okC = true, okT = true, okF = true, okS = true, okN = true;
  for (let t = 0; t < 30; t++) {
    let m = 3 + (t % 3), p = Array.from({ length: m }, () => rndInt(1, 9)), P = rndInt(1, 8), r = rndInt(0, 10), K = 60, d = simulateLine(p, P, r, K);
    for (let k = 1; k <= K; k++) for (let i = 0; i < m; i++) {
      let pre = [i > 0 ? d[k][i - 1] : NEG_INF, d[k - 1][i], i === 0 ? (k - P >= 1 ? d[k - P][m - 1] + r : 0) : NEG_INF];
      if (pre.some((v) => v !== NEG_INF && d[k][i] < v + p[i])) okC = false;               // どの条件も守る
      if (!pre.some((v) => v !== NEG_INF && d[k][i] === v + p[i])) okT = false;             // どれか 1 つでぴったり（むだに待たない）
    }
    let br = cycleRatioBrute(m, eventArcs(p, P, r)).ratio, sum = p.reduce((a, b) => a + b, 0);
    if (Math.abs(br - Math.max(Math.max(...p), (sum + r) / P)) > 1e-9) okF = false;
    if (Math.abs(slopeSim(p, P, r) - br) > 1e-9) okS = false;
    if (!noNaN(d)) okN = false;
  }
  check('漸化式の完了時刻は 3 つの条件（前の機械・前の部品・パレット）をすべて守る', okC);
  check('むだに待たない：どの完了時刻も、どれか 1 つの条件 + 加工時間にぴったり等しい', okT);
  check('回路の総当たり λ = max(max p_i, (Σp + r)/P)（ランダムな 30 ライン）', okF);
  check('漸化式を 3000 個回した傾き（最後の 840 個）= λ（周期に入ったあとは厳密に一致）', okS);
  check('P = 1 なら λ = Σp + r（1 台ずつ）、P が大きいと λ = いちばん遅い機械', cycleRatioBrute(4, eventArcs([3, 5, 4, 2], 1, 6)).ratio === 20 && cycleRatioBrute(4, eventArcs([3, 5, 4, 2], 10, 6)).ratio === 5);
  check('ε（まだ何もしていない）を含んでも NaN が出ない', okN);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. O でパレットを 1 台にすると、ガントチャートはどうなる？ λ = Σp + r を確かめよう
// 2. P を 1 ずつ増やして、スループットが頭打ちになる P を探そう。それより多く買うのはむだ
// 3. いちばん遅い機械の加工時間を ↓ で短くすると、ボトルネックはどこへ移る？
// 4. RETURN_T（パレットの戻り時間）を 0 にすると、必要なパレットの数は？
// 5. 14 では、このガントチャートの「完了」を音にして、周期 λ をリズムとして聞く

// ==================================================
// ここから下は「マックスプラスの道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- マックスプラスの数：ε = −∞（「ゼロ」= 起きない・制約なし）、e = 0（「いち」= 待ち時間なし）
const NEG_INF = -Infinity;
function mpAdd(a, b) { return a >= b ? a : b; }                                   // a ⊕ b = max(a, b)
function mpMul(a, b) { return a === NEG_INF || b === NEG_INF ? NEG_INF : a + b; }  // a ⊗ b = a + b（ε があれば ε。−∞ + ∞ を作らない）
function mpFmt(v, d) {                                                             // ε を「ε」と表示（−Infinity を見せない）
  if (v === NEG_INF) return 'ε';
  if (v === Infinity) return '+∞';
  if (typeof v !== 'number' || v !== v) return '?';
  let s = (+v.toFixed(d === undefined ? 1 : d)).toString();
  return s === '-0' ? '0' : s;
}
// ---- 種つきの乱数（同じ種なら毎回同じ列）
let rngState = 1;
function seedRng(s) { rngState = (s >>> 0) || 1; }
function rnd() {                       // 0〜1 の一様乱数（mulberry32）
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rndInt(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
// ---- グラフと図の道具：g = { x, y, w, h, x0, x1, y0, y1 }
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
function gX(g, v) { return g.x + clampv((v - g.x0) / (g.x1 - g.x0), -0.02, 1.02) * g.w; }
function gY(g, v) { return g.y + g.h - clampv((v - g.y0) / (g.y1 - g.y0), -0.02, 1.02) * g.h; }
function plotAxes(g, xl, yl, xt, yt) {
  stroke(95); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h);
  noStroke(); fill(165); textSize(12); textAlign(CENTER, TOP);
  for (let v of xt) text(+v.toPrecision(3), gX(g, v), g.y + g.h + 4);
  textAlign(RIGHT, CENTER);
  for (let v of yt) text(+v.toPrecision(3), g.x - 5, gY(g, v));
  textAlign(LEFT, BASELINE); fill(205); textSize(13);
  text(xl, g.x + g.w - textWidth(xl), g.y + g.h + 32); text(yl, g.x, g.y - 8);
}
function polyline(pts) {               // 点が 2 つ以上あるときだけ折れ線を描く
  if (pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape();
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) ? v.every(noNaN) : !(typeof v === 'number' && v !== v); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(120, 210, 150) : color(255, 90, 90)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
