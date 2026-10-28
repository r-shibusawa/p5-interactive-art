// ============================================
// 01 感度分析とシャドウプライス
// 00 の生産計画で、資源の量を少し増やすと最適な利益はいくら増える？ その「1 単位あたりの値打ち」がシャドウプライス（影の価格）
//   余っている資源のシャドウプライスは 0。値打ちが変わらない資源量の範囲を「レンジ」という
// ←→ = 木材 / ↑↓ = 作業時間 / Z・X = 塗装ライン / 1〜3 = 右のグラフに出す資源 / R = 元に戻す
// ============================================

let profitA = 30, profitB = 40;       // ★ 1 個あたりの利益（千円）
let res = [                            // ★ 資源：a·x + b·y ≤ cap
  { name: '木材', a: 2, b: 3, cap: 120, cap0: 120, unit: 'kg', hue: 30 },
  { name: '作業時間', a: 2, b: 1, cap: 80, cap0: 80, unit: '時間', hue: 200 },
  { name: '塗装ライン', a: 0, b: 1, cap: 35, cap0: 35, unit: '台', hue: 300 },
];
let sel = 0;                           // グラフに出す資源
let X_MAX = 80, Y_MAX = 60;
let pl, pt, pw, ph;
let trail = [];                        // 最適解の通った跡
let zCurve = [], zCurveKey = '';         // 右のグラフ（資源量が変わったときだけ計算し直す）

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  layout();
}
function layout() { pl = 70; pt = 110; ph = min(height - 330, (width * 0.42) * Y_MAX / X_MAX); pw = ph * X_MAX / Y_MAX; }
function windowResized() { resizeCanvas(windowWidth, windowHeight); layout(); }
function sx(x) { return pl + x / X_MAX * pw; }
function sy(y) { return pt + ph - y / Y_MAX * ph; }

// 資源量 caps のときの最適解（頂点を全部調べる）
function solve(caps) {
  let cons = res.map((r, i) => [r.a, r.b, caps[i]]).concat([[-1, 0, 0], [0, -1, 0]]);
  let poly = feasibleVertices(cons), best = null;
  for (let v of poly) { let z = profitA * v[0] + profitB * v[1]; if (!best || z > best.z + 1e-9) best = { x: v[0], y: v[1], z }; }
  return { poly, best };
}
function optValue(i, c) { let caps = res.map(r => r.cap); caps[i] = c; let s = solve(caps); return s.best ? s.best.z : 0; }
// ★ シャドウプライス：資源 i を少しだけ増やしたときの利益の増え方（微分）
function shadow(i, c) { let d = 0.01; return (optValue(i, c + d) - optValue(i, max(0, c - d))) / (c + d - max(0, c - d)); }
// シャドウプライスが変わらない資源量の範囲（レンジ）
let rangeCache = {};
function ranging(i) {
  let k = i + ':' + res.map(r => r.cap).join(',');
  if (rangeCache[k]) return rangeCache[k];
  let c = res[i].cap, s0 = shadow(i, c), lo = c, hi = c;
  while (lo > 0 && abs(shadow(i, lo - 0.25) - s0) < 1e-3) lo -= 0.25;
  while (hi < res[i].cap0 * 3 && abs(shadow(i, hi + 0.25) - s0) < 1e-3) hi += 0.25;
  // 境界を二分法で細かく探す（変わる点は ±0.01 くらいの精度）
  let same = t => abs(shadow(i, t) - s0) < 1e-3;
  if (lo > 0) { let a = lo - 0.25, b = lo; for (let n = 0; n < 12; n++) { let m = (a + b) / 2; if (same(m)) b = m; else a = m; } lo = b - 0.01; }
  if (hi < res[i].cap0 * 3) { let a = hi, b = hi + 0.25; for (let n = 0; n < 12; n++) { let m = (a + b) / 2; if (same(m)) a = m; else b = m; } hi = a + 0.01; }
  return (rangeCache[k] = [max(0, lo), hi]);
}

function draw() {
  background(225, 30, 12);
  let s = solve(res.map(r => r.cap)), best = s.best;
  if (best && (!trail.length || dist(trail[trail.length - 1].x, trail[trail.length - 1].y, best.x, best.y) > 0.01)) { trail.push({ x: best.x, y: best.y }); if (trail.length > 200) trail.shift(); }

  // 左：実行可能領域
  stroke(0, 0, 100, 10); strokeWeight(1);
  for (let x = 0; x <= X_MAX; x += 10) line(sx(x), pt, sx(x), pt + ph);
  for (let y = 0; y <= Y_MAX; y += 10) line(pl, sy(y), pl + pw, sy(y));
  noStroke(); fill(120, 60, 70, 22);
  beginShape(); for (let v of s.poly) vertex(sx(v[0]), sy(v[1])); endShape(CLOSE);
  for (let i = 0; i < res.length; i++) {
    let r = res[i], seg = clipLine(r.a, r.b, r.cap);
    if (!seg) continue;
    stroke(r.hue, 70, 100, i === sel ? 100 : 55); strokeWeight(i === sel ? 3 : 1.5);
    line(sx(seg[0][0]), sy(seg[0][1]), sx(seg[1][0]), sy(seg[1][1]));
  }
  noFill(); stroke(50, 80, 100, 50); strokeWeight(2);
  beginShape(); for (let p of trail) vertex(sx(p.x), sy(p.y)); endShape();
  if (best) {
    noStroke(); fill(50, 90, 100); circle(sx(best.x), sy(best.y), 16);
    fill(0, 0, 100); textSize(15);
    text('最適 (' + nf(best.x, 1, 1) + ', ' + nf(best.y, 1, 1) + ')', sx(best.x) + 12, sy(best.y) - 10);
  }
  fill(0, 0, 60); textSize(13);
  text('x = 椅子、y = テーブル。黄色の線 = 最適解が動いた跡', pl, pt + ph + 22);

  // 下：感度分析の表
  let ty = pt + ph + 60;
  fill(0, 0, 70); textSize(15);
  let cols = [pl, pl + 130, pl + 270, pl + 380, pl + 500, pl + 650];
  ['資源', '量', '使用', '余り', 'シャドウプライス', 'レンジ（この範囲なら同じ値打ち）'].forEach((h, k) => text(h, cols[k], ty));
  for (let i = 0; i < res.length; i++) {
    let r = res[i], used = best ? r.a * best.x + r.b * best.y : 0, sp = shadow(i, r.cap), rg = ranging(i), y = ty + 28 + i * 26;
    fill(r.hue, 60, 100, i === sel ? 100 : 75);
    text((i === sel ? '▶ ' : '　') + r.name, cols[0], y);
    fill(0, 0, 90);
    text(nf(r.cap, 1, 0) + ' ' + r.unit, cols[1], y);
    text(nf(used, 1, 1), cols[2], y);
    text(nf(r.cap - used, 1, 1), cols[3], y);
    fill(sp > 1e-6 ? color(50, 90, 100) : color(0, 0, 55));
    text(nf(sp, 1, 2) + ' 千円/' + r.unit, cols[4], y);
    fill(0, 0, 75);
    text(nf(rg[0], 1, 1) + ' 〜 ' + (rg[1] >= r.cap0 * 3 ? '∞' : nf(rg[1], 1, 1)), cols[5], y);
  }

  // 右：選んだ資源の量 → 最適な利益 のグラフ（傾き = シャドウプライス）
  let gx = pl + pw + 90, gy = pt + 130, gw = width - gx - 50, gh = ph - 150, ty0 = pt;
  let r = res[sel], cMax = r.cap0 * 3, zMax = 0;
  let ck = sel + ':' + res.map(q => q.cap).join(',');
  if (zCurveKey !== ck) { zCurveKey = ck; zCurve = []; for (let k = 0; k <= 160; k++) { let c = cMax * k / 160; zCurve.push([c, optValue(sel, c)]); } }
  for (let p of zCurve) zMax = max(zMax, p[1]);
  zMax = max(zMax, 1) * 1.1;
  let gxs = c => gx + c / cMax * gw, gys = z => gy + gh - z / zMax * gh;
  let rg = ranging(sel), sp = shadow(sel, r.cap), z0 = optValue(sel, r.cap);
  noStroke(); fill(50, 80, 100, 12); rect(gxs(rg[0]), gy, gxs(min(rg[1], cMax)) - gxs(rg[0]), gh);
  stroke(0, 0, 100, 40); strokeWeight(1); line(gx, gy + gh, gx + gw, gy + gh); line(gx, gy, gx, gy + gh);
  noFill(); stroke(r.hue, 70, 100); strokeWeight(3);
  beginShape(); for (let p of zCurve) vertex(gxs(p[0]), gys(p[1])); endShape();
  // 接線（傾き = シャドウプライス）
  stroke(50, 90, 100); strokeWeight(2);
  drawingContext.setLineDash([6, 5]);
  let dc = cMax * 0.25;
  for (let k = 0; k < 8 && (z0 + sp * dc > zMax || z0 - sp * dc < 0 || r.cap - dc < 0); k++) dc /= 2;   // グラフからはみ出さない長さに
  line(gxs(r.cap - dc), gys(z0 - sp * dc), gxs(r.cap + dc), gys(z0 + sp * dc));
  drawingContext.setLineDash([]);
  noStroke(); fill(50, 90, 100); circle(gxs(r.cap), gys(z0), 14);
  fill(0, 0, 100); textSize(16);
  text(r.name + ' の量 → 最適な利益', gx, ty0);
  textSize(14); fill(0, 0, 80);
  text('今：' + r.name + ' ' + nf(r.cap, 1, 0) + ' ' + r.unit + ' → 利益 ' + nf(z0, 1, 0) + ' 千円', gx, ty0 + 26);
  text('傾き（シャドウプライス）= ' + nf(sp, 1, 2) + ' 千円 / ' + r.unit, gx, ty0 + 48);
  fill(0, 0, 60);
  text('黄色の帯 = レンジ。帯の外に出ると「効いている制約」が入れ替わって傾きが変わる', gx, ty0 + 70);
  text('グラフが平らになる = その資源はもう余っている（シャドウプライス 0）', gx, ty0 + 92);
  textAlign(CENTER, TOP); text(r.name + '（' + r.unit + '）→', gx + gw / 2, gy + gh + 6); textAlign(LEFT, BASELINE);

  fill(0, 0, 100); textSize(18);
  text('←→ 木材 ' + res[0].cap + '　↑↓ 作業時間 ' + res[1].cap + '　Z・X 塗装 ' + res[2].cap + '　1〜3：グラフの資源　R：元に戻す　　最適な利益 ' + (best ? nf(best.z, 1, 0) : '—') + ' 千円', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('「木材をあと 1kg 仕入れるのにいくらまで払ってよい？」→ シャドウプライスまでなら得。余っている資源を増やしても利益は増えない', 20, 68);
}

function keyPressed() {
  if (key === RIGHT_ARROW) res[0].cap = min(360, res[0].cap + 2);
  if (key === LEFT_ARROW) res[0].cap = max(0, res[0].cap - 2);
  if (key === UP_ARROW) res[1].cap = min(240, res[1].cap + 2);
  if (key === DOWN_ARROW) res[1].cap = max(0, res[1].cap - 2);
  if (key === 'x' || key === 'X') res[2].cap = min(105, res[2].cap + 1);
  if (key === 'z' || key === 'Z') res[2].cap = max(0, res[2].cap - 1);
  if (key === '1' || key === '2' || key === '3') sel = int(key) - 1;
  if (key === 'r' || key === 'R') { for (let r of res) r.cap = r.cap0; trail = []; }
}

// ---------- やってみよう ----------
// 1. 作業時間（↑↓）を増やし続けると、どこかでシャドウプライスが下がる。そこで何が起きている？（左の図で確認）
// 2. 塗装ライン（Z・X）のシャドウプライスが 0 になるのはなぜ？「余り」の列と見比べよう
// 3. 3 つのシャドウプライス × 資源量 を足すと最適な利益と同じになる？（双対定理 → シリーズ 16）
// 4. profitA を変えると、どの資源の値打ちが上がる？


// ==================================================
// ここから下は「線形計画を解くための道具」（00 と同じ）
// ==================================================
function feasibleVertices(cons) {
  let pts = [];
  for (let i = 0; i < cons.length; i++) for (let j = i + 1; j < cons.length; j++) {
    let [a1, b1, c1] = cons[i], [a2, b2, c2] = cons[j];
    let det = a1 * b2 - a2 * b1;
    if (Math.abs(det) < 1e-9) continue;
    let x = (c1 * b2 - c2 * b1) / det, y = (a1 * c2 - a2 * c1) / det;
    if (cons.every(c => c[0] * x + c[1] * y <= c[2] + 1e-7) && !pts.some(p => Math.abs(p[0] - x) + Math.abs(p[1] - y) < 1e-6)) pts.push([x, y]);
  }
  let cx = 0, cy = 0;
  for (let p of pts) { cx += p[0] / pts.length; cy += p[1] / pts.length; }
  pts.sort((p, q) => Math.atan2(p[1] - cy, p[0] - cx) - Math.atan2(q[1] - cy, q[0] - cx));
  return pts;
}
function clipLine(a, b, c) {
  let pts = [];
  if (Math.abs(b) > 1e-9) { for (let x of [0, X_MAX]) { let y = (c - a * x) / b; if (y >= 0 && y <= Y_MAX) pts.push([x, y]); } }
  if (Math.abs(a) > 1e-9) { for (let y of [0, Y_MAX]) { let x = (c - b * y) / a; if (x >= 0 && x <= X_MAX) pts.push([x, y]); } }
  if (pts.length < 2) return null;
  pts.sort((p, q) => p[0] - q[0] || q[1] - p[1]);
  return [pts[0], pts[pts.length - 1]];
}
