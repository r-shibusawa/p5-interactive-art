// ============================================
// 06 在庫管理 ─ 経済的発注量 EOQ
// 毎日売れていく商品を、1 回に何個ずつ注文する？ たくさん頼むと保管費がかさみ、少しずつ頼むと発注の手間（送料）がかさむ
//   年間費用 = 発注費 K × D / Q ＋ 保管費 h × Q / 2 → 一番安い Q* = √(2 D K / h)（ハリスの公式、1913）
// ←→ = 1 回の発注量 Q / ↑↓ = 発注費 K / Z・X = 保管費 h / O = Q* にする / N = 需要のばらつき / B = 安全在庫 / スペース = 一時停止
// ============================================

let D = 2400;                          // ★ 年間の需要（個/年）
let K = 3000;                          // ★ 1 回の発注費（円）
let h = 40;                            // ★ 1 個を 1 年保管する費用（円）
let Q = 300;                           // 1 回の発注量
let L = 8;                             // ★ リードタイム（注文してから届くまでの日数）
let noisy = false, safety = false, paused = false;
let simDay = 0, stock = 0, onOrder = [], invLog = [], events = [], stockouts = 0, lostUnits = 0;
let DAYS = 360;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  resetSim();
}
function resetSim() { simDay = 0; stock = Q; onOrder = []; invLog = []; events = []; stockouts = 0; lostUnits = 0; }
function qStar() { return sqrt(2 * D * K / h); }
function annualCost(q) { return K * D / q + h * q / 2; }
function sigmaDaily() { return (D / DAYS) * 0.6; }                     // ばらつきの大きさ（1 日あたり）
function safetyStock() { return safety ? 1.65 * sigmaDaily() * sqrt(L) : 0; }   // ★ 95% 欠品しない安全在庫
function reorderPoint() { return D / DAYS * L + safetyStock(); }       // 発注点：届くまでの間に売れる量（＋安全在庫）

// 1 日分進める
function stepDay() {
  let dmd = D / DAYS;
  if (noisy) dmd = max(0, dmd + randomGaussian() * sigmaDaily());
  for (let o of onOrder) if (o.arrive <= simDay) { stock += o.q; events.push({ simDay, type: 'in' }); }
  onOrder = onOrder.filter(o => o.arrive > simDay);
  if (stock >= dmd) stock -= dmd;
  else { lostUnits += dmd - stock; if (stock > 0 || invLog.length && invLog[invLog.length - 1].v > 0) stockouts++; stock = 0; }
  let pos = stock + onOrder.reduce((a, o) => a + o.q, 0);             // 在庫ポジション（届く予定も含む）
  if (pos <= reorderPoint()) { onOrder.push({ q: Q, arrive: simDay + L }); events.push({ simDay, type: 'order' }); }
  invLog.push({ simDay, v: stock });
  if (invLog.length > 400) invLog.shift();
  events = events.filter(e => e.simDay > simDay - 400);
  simDay++;
}

function draw() {
  background(225, 30, 12);
  if (!paused) for (let k = 0; k < 2; k++) stepDay();

  // 上：在庫の推移（のこぎり形）
  let cx = 80, cy = 110, cw = width - 160, chh = height * 0.32;
  let yMax = max(Q * 1.25 + safetyStock(), qStar() * 1.25, 100);
  let x0 = simDay - 200;
  let X = d => cx + (d - x0) / 200 * cw, Y = v => cy + chh - v / yMax * chh;
  stroke(0, 0, 100, 25); strokeWeight(1); line(cx, cy + chh, cx + cw, cy + chh); line(cx, cy, cx, cy + chh);
  stroke(30, 70, 100, 60); drawingContext.setLineDash([6, 5]); line(cx, Y(reorderPoint()), cx + cw, Y(reorderPoint())); drawingContext.setLineDash([]);
  if (safety) { stroke(140, 60, 90, 60); line(cx, Y(safetyStock()), cx + cw, Y(safetyStock())); }
  noFill(); stroke(190, 70, 100); strokeWeight(2);
  if (invLog.length > 1) { beginShape(); for (let p of invLog) if (p.simDay >= x0) vertex(X(p.simDay), Y(p.v)); endShape(); }
  for (let e of events) if (e.simDay >= x0) {
    if (e.type === 'order') { stroke(50, 90, 100); strokeWeight(2); line(X(e.simDay), cy + chh, X(e.simDay), cy + chh + 10); }
    else { noStroke(); fill(140, 80, 100); triangle(X(e.simDay), cy + chh + 4, X(e.simDay) - 6, cy + chh + 14, X(e.simDay) + 6, cy + chh + 14); }
  }
  for (let p of invLog) if (p.simDay >= x0 && p.v <= 0) { noStroke(); fill(0, 80, 100); circle(X(p.simDay), cy + chh, 6); }
  noStroke(); fill(0, 0, 70); textSize(13);
  text('在庫（個）', cx, cy - 8);
  fill(30, 70, 100); text('発注点 ' + nf(reorderPoint(), 1, 0) + '（ここまで減ったら注文）', cx + cw - 300, Y(reorderPoint()) - 6);
  fill(0, 0, 60); text('黄の線 = 注文、緑の三角 = 入荷、赤い点 = 品切れ　（' + simDay + ' 日目）', cx, cy + chh + 32);

  // 下：費用の曲線
  let gx = 80, gy = cy + chh + 70, gw = width * 0.58, gh = height - gy - 60;
  let qMax = max(1500, Q * 1.2), cMax = annualCost(qMax * 0.05) * 0.7;
  let GX = q => gx + q / qMax * gw, GY = c => gy + gh - min(c, cMax) / cMax * gh;
  stroke(0, 0, 100, 25); strokeWeight(1); line(gx, gy + gh, gx + gw, gy + gh); line(gx, gy, gx, gy + gh);
  let curves = [[q => K * D / q, color(30, 70, 100), '発注費 K·D/Q'], [q => h * q / 2, color(190, 70, 100), '保管費 h·Q/2'], [annualCost, color(50, 90, 100), '合計']];
  for (let [f, col, name] of curves) {
    noFill(); stroke(col); strokeWeight(name === '合計' ? 3 : 2);
    beginShape(); for (let q = qMax * 0.03; q <= qMax; q += qMax / 150) vertex(GX(q), GY(f(q))); endShape();
    noStroke(); fill(col); textSize(13); text(name, GX(qMax * 0.86), GY(f(qMax * 0.86)) + (name === '合計' ? -10 : 20));
  }
  let qs = qStar();
  stroke(140, 70, 100); strokeWeight(1); drawingContext.setLineDash([5, 5]); line(GX(qs), gy, GX(qs), gy + gh); drawingContext.setLineDash([]);
  noStroke(); fill(140, 70, 100); circle(GX(qs), GY(annualCost(qs)), 10); textSize(13); text('Q* = ' + nf(qs, 1, 0), GX(qs) + 6, gy + 14);
  fill(0, 0, 100); circle(GX(Q), GY(annualCost(Q)), 14);
  fill(0, 0, 60); textAlign(CENTER, TOP); text('1 回の発注量 Q →', gx + gw / 2, gy + gh + 6); textAlign(LEFT, BASELINE);

  // 右：数字
  let rx = gx + gw + 50;
  fill(0, 0, 100); textSize(20); text('Q = ' + Q + ' 個', rx, gy + 10);
  textSize(15); fill(0, 0, 85);
  let lines = [
    '年間の発注回数　D / Q = ' + nf(D / Q, 1, 1) + ' 回',
    '発注費　' + nf(K * D / Q, 1, 0) + ' 円/年',
    '保管費　' + nf(h * Q / 2, 1, 0) + ' 円/年',
    '合計　' + nf(annualCost(Q), 1, 0) + ' 円/年',
    '',
    '最適 Q* = √(2·' + D + '·' + K + ' / ' + h + ') = ' + nf(qs, 1, 0),
    'Q* での合計　' + nf(annualCost(qs), 1, 0) + ' 円/年',
    '今は最適より ' + nf(100 * (annualCost(Q) / annualCost(qs) - 1), 1, 1) + '% 高い',
    '',
    '品切れ ' + stockouts + ' 回（売りそこね ' + nf(lostUnits, 1, 0) + ' 個）',
    noisy ? '需要がばらつく → 発注点の在庫では足りないことがある' : 'N で需要をばらつかせてみよう',
  ];
  lines.forEach((s, i) => text(s, rx, gy + 44 + i * 24));

  fill(0, 0, 100); textSize(18);
  text('←→ Q ' + Q + '　↑↓ 発注費 K ' + K + '　Z・X 保管費 h ' + h + '　O：Q* にする　N：ばらつき ' + (noisy ? 'ON' : 'off') + '　B：安全在庫 ' + (safety ? 'ON' : 'off') + '　スペース：' + (paused ? '再開' : '一時停止'), 20, 40);
  fill(0, 0, 60); textSize(15);
  text('合計の曲線の底が Q*。底のあたりは平ら → Q が少しずれても費用はほとんど変わらない（EOQ は丈夫なモデル）', 20, 68);
}

function keyPressed() {
  if (key === RIGHT_ARROW) Q = min(3000, Q + 20);
  if (key === LEFT_ARROW) Q = max(20, Q - 20);
  if (key === UP_ARROW) K = min(20000, K + 500);
  if (key === DOWN_ARROW) K = max(500, K - 500);
  if (key === 'x' || key === 'X') h = min(400, h + 10);
  if (key === 'z' || key === 'Z') h = max(10, h - 10);
  if (key === 'o' || key === 'O') Q = round(qStar());
  if (key === 'n' || key === 'N') { noisy = !noisy; resetSim(); }
  if (key === 'b' || key === 'B') { safety = !safety; resetSim(); }
  if (key === ' ') paused = !paused;
}

// ---------- やってみよう ----------
// 1. Q を Q* の 2 倍にすると費用は何 % 増える？ 半分にすると？（どちらも約 25%）
// 2. 発注費 K を 4 倍にすると Q* は何倍？ 式の √ を確かめよう
// 3. N でばらつかせて品切れを起こし、B（安全在庫）で減るか見よう。安全在庫の代わりに何が増える？
// 4. 「まとめて買うと 5% 引き」（数量割引）を annualCost に入れると最適な Q はどう変わる？
