// ============================================
// 13 ゲーム理論 ─ ミニマックスと囚人のジレンマ
// 相手も考えて動くときの意思決定。1：ゼロサムゲーム（自分の得 = 相手の損）は「混合戦略」を図で解く
//   行プレイヤーは確率 p で上の手を出す。相手が一番困らせる手を選んでも得られる量（下側の折れ線）を最大にする p がミニマックス解
// 2：囚人のジレンマを 200 回くり返すと？ いろいろな戦略の総当たり戦と、強い戦略が増える「進化」
// 1・2 = 切りかえ / 1 のとき：マスをクリック = +1（Shift + クリック = −1）、R = ランダムな表 / 2 のとき：スペース = 対戦、←→ = ミスの確率、E = 進化
// ============================================

let view = 1;
let A = [[3, -1, 2, 0], [-2, 4, -1, 1]];  // ★ 行プレイヤーの得点（列プレイヤーはその逆）
// --- 囚人のジレンマ ---
let PAY = { CC: 3, CD: 0, DC: 5, DD: 1 };  // ★ 自分の得点（自分の手・相手の手）
let ROUNDS = 200, noiseP = 0.0;
let strategies = [
  { name: 'いつも協力', f: (me, op) => true },
  { name: 'いつも裏切り', f: (me, op) => false },
  { name: 'しっぺ返し', f: (me, op) => op.length ? op[op.length - 1] : true },
  { name: 'トリガー', f: (me, op) => !op.includes(false) },
  { name: 'ランダム', f: (me, op) => Math.random() < 0.5 },
  { name: 'パブロフ', f: (me, op) => !me.length || me[me.length - 1] === op[op.length - 1] },
  { name: '寛容しっぺ', f: (me, op) => !(op.length >= 2 && !op[op.length - 1] && !op[op.length - 2]) },
];
let M = null, totals = [];               // 総当たりの平均得点
let shares = [], shareLog = [], evolving = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  tournament();
}

// ---------- 1：ゼロサムゲーム ----------
function rowValue(p, j) { return p * A[0][j] + (1 - p) * A[1][j]; }
function lowerEnv(p) { let m = Infinity; for (let j = 0; j < A[0].length; j++) m = min(m, rowValue(p, j)); return m; }
// ★ 下側の折れ線の一番高い点：p = 0, 1 と、直線どうしの交点だけ調べればよい
function solveGame() {
  let cand = [0, 1], n = A[0].length;
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
    let den = (A[0][a] - A[1][a]) - (A[0][b] - A[1][b]);
    if (abs(den) > 1e-9) { let p = (A[1][b] - A[1][a]) / den; if (p > 0 && p < 1) cand.push(p); }
  }
  let best = { p: 0, v: -Infinity };
  for (let p of cand) { let v = lowerEnv(p); if (v > best.v + 1e-9) best = { p, v }; }
  return best;
}
function cellRect(i, j) { return { x: 80 + j * 90, y: 150 + i * 70, w: 86, h: 66 }; }

function drawZeroSum() {
  let n = A[0].length, sol = solveGame();
  textAlign(CENTER, CENTER);
  for (let j = 0; j < n; j++) { fill(0, 0, 80); textSize(14); text('列 ' + 'abcdef'[j], cellRect(0, j).x + 43, 130); }
  for (let i = 0; i < 2; i++) {
    fill(0, 0, 80); textSize(14); text(i === 0 ? '上' : '下', 55, cellRect(i, 0).y + 33);
    for (let j = 0; j < n; j++) {
      let r = cellRect(i, j), v = A[i][j];
      fill(v >= 0 ? color(140, 50, 30 + v * 6) : color(0, 50, 30 - v * 6)); rect(r.x, r.y, r.w, r.h, 6);
      fill(0, 0, 100); textSize(24); text(v, r.x + r.w / 2, r.y + r.h / 2);
    }
  }
  textAlign(LEFT, BASELINE);
  // 鞍点（純粋戦略の解）があるか
  let rowMin = [0, 1].map(i => min(A[i])), maximin = max(rowMin);
  let colMax = A[0].map((_, j) => max(A[0][j], A[1][j])), minimax = min(colMax);
  fill(0, 0, 85); textSize(15);
  let ty = 330;
  text('行の最小の最大（マキシミン）= ' + maximin + '　列の最大の最小（ミニマックス）= ' + minimax, 60, ty);
  text(maximin === minimax ? '→ 一致する = 鞍点あり。決まった手（純粋戦略）で解ける' : '→ 一致しない = 決まった手では読まれる。確率で混ぜる（混合戦略）', 60, ty + 26);
  fill(50, 90, 100); textSize(20);
  text('最適：上を ' + nf(100 * sol.p, 1, 1) + '%、下を ' + nf(100 * (1 - sol.p), 1, 1) + '%　ゲームの値 v = ' + nf(sol.v, 1, 3), 60, ty + 70);
  fill(0, 0, 65); textSize(14);
  text('相手がどの列を選んでも、平均して v 以上は取れる。', 60, ty + 100);
  text('相手も同じように考えると v 以下に抑えられる（ミニマックス定理）', 60, ty + 122);
  text('現実の例：PK のキッカーとキーパー（右か左か）、', 60, ty + 152);
  text('抜き打ち検査のタイミング、じゃんけん', 60, ty + 174);

  // 右：図解
  let gx = width * 0.5, gy = 140, gw = width - gx - 60, gh = height - 260;
  let vals = A[0].concat(A[1]), hi = max(vals) + 1, lo = min(vals) - 1;
  let X = p => gx + p * gw, Y = v => gy + gh - (v - lo) / (hi - lo) * gh;
  stroke(0, 0, 100, 25); strokeWeight(1); line(gx, Y(0), gx + gw, Y(0)); line(gx, gy, gx, gy + gh); line(gx + gw, gy, gx + gw, gy + gh);
  for (let j = 0; j < n; j++) { stroke((j * 80 + 190) % 360, 60, 90, 70); strokeWeight(2); line(X(0), Y(A[1][j]), X(1), Y(A[0][j])); noStroke(); fill((j * 80 + 190) % 360, 60, 90); textSize(13); text('列 ' + 'abcdef'[j], X(1) + 6, Y(A[0][j]) + 4); }
  noFill(); stroke(50, 90, 100); strokeWeight(4);
  beginShape(); for (let p = 0; p <= 1.0001; p += 0.005) vertex(X(p), Y(lowerEnv(p))); endShape();
  noStroke(); fill(50, 90, 100); circle(X(sol.p), Y(sol.v), 14);
  stroke(50, 90, 100, 60); strokeWeight(1); drawingContext.setLineDash([5, 5]); line(X(sol.p), Y(sol.v), X(sol.p), gy + gh); drawingContext.setLineDash([]);
  noStroke(); fill(0, 0, 70); textSize(13);
  text('上を出す確率 p →', gx + gw / 2 - 50, gy + gh + 24);
  text('p = 0（いつも下）', gx - 20, gy + gh + 44); text('p = 1（いつも上）', gx + gw - 90, gy + gh + 44);
  text('各直線 = 相手がその列を出したときの自分の平均得点。黄色 = 相手が一番困らせる列を選んだときの得点', gx, gy - 14);
}

// ---------- 2：囚人のジレンマ ----------
function play(a, b) {
  let ha = [], hb = [], sa = 0, sb = 0;
  for (let t = 0; t < ROUNDS; t++) {
    let ma = strategies[a].f(ha, hb), mb = strategies[b].f(hb, ha);
    if (Math.random() < noiseP) ma = !ma;          // ★ ミス（手がすべる）
    if (Math.random() < noiseP) mb = !mb;
    sa += PAY[(ma ? 'C' : 'D') + (mb ? 'C' : 'D')]; sb += PAY[(mb ? 'C' : 'D') + (ma ? 'C' : 'D')];
    ha.push(ma); hb.push(mb);
  }
  return [sa / ROUNDS, sb / ROUNDS];
}
function tournament() {
  let n = strategies.length;
  M = []; for (let i = 0; i < n; i++) M.push(new Array(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = i; j < n; j++) { let r = play(i, j); M[i][j] = r[0]; M[j][i] = r[1]; if (i === j) M[i][i] = (r[0] + r[1]) / 2; }
  totals = M.map(row => row.reduce((a, b) => a + b, 0) / n);
  shares = strategies.map(() => 1 / n); shareLog = [shares.slice()];
}
// ★ 進化（レプリケーター・ダイナミクス）：平均より稼ぐ戦略が増える
function evolveStep() {
  let n = strategies.length, fit = [];
  for (let i = 0; i < n; i++) { fit[i] = 0; for (let j = 0; j < n; j++) fit[i] += shares[j] * M[i][j]; }
  let avg = 0; for (let i = 0; i < n; i++) avg += shares[i] * fit[i];
  shares = shares.map((s, i) => s * fit[i] / max(1e-9, avg));
  shareLog.push(shares.slice()); if (shareLog.length > 400) shareLog.shift();
}
function drawPD() {
  if (evolving) evolveStep();
  let n = strategies.length, cs = min(70, (width * 0.45 - 160) / n);
  let tx = 170, ty = 150;
  textSize(12); textAlign(CENTER, CENTER);
  for (let i = 0; i < n; i++) {
    fill((i * 51) % 360, 60, 95); text(i + 1, tx + i * cs + cs / 2, ty - 16);
    textAlign(RIGHT, CENTER); text((i + 1) + '. ' + strategies[i].name, tx - 10, ty + i * cs * 0.6 + cs * 0.3); textAlign(CENTER, CENTER);
    for (let j = 0; j < n; j++) {
      let v = M[i][j];
      fill(map(v, 0, 5, 0, 140), 60, 25 + v * 12); rect(tx + j * cs, ty + i * cs * 0.6, cs - 2, cs * 0.6 - 2, 3);
      fill(0, 0, 100); text(nf(v, 1, 2), tx + j * cs + cs / 2, ty + i * cs * 0.6 + cs * 0.3);
    }
  }
  textAlign(LEFT, BASELINE);
  let by = ty + n * cs * 0.6 + 40;
  fill(0, 0, 80); textSize(14); text('総当たりの平均得点（1 回あたり）', 40, by);
  let order = totals.map((t, i) => i).sort((a, b) => totals[b] - totals[a]);
  order.forEach((i, k) => {
    let y = by + 14 + k * 26;
    fill((i * 51) % 360, 60, 95); rect(170, y, totals[i] / 5 * (width * 0.3), 20, 3);
    fill(0, 0, 90); textSize(13); text((k + 1) + '. ' + strategies[i].name, 40, y + 15); text(nf(totals[i], 1, 2), 176 + totals[i] / 5 * (width * 0.3), y + 15);
  });
  // 右：進化
  let gx = width * 0.55, gy = 150, gw = width - gx - 60, gh = height - 300;
  fill(0, 0, 80); textSize(14); text('進化（E）：得点の高い戦略の割合が増えていく　世代 ' + (shareLog.length - 1), gx, gy - 16);
  stroke(0, 0, 100, 25); strokeWeight(1); line(gx, gy + gh, gx + gw, gy + gh); line(gx, gy, gx, gy + gh);
  for (let i = 0; i < n; i++) {
    noFill(); stroke((i * 51) % 360, 60, 95); strokeWeight(2.5);
    beginShape(); shareLog.forEach((s, k) => vertex(gx + k / 399 * gw, gy + gh - s[i] * gh)); endShape();
  }
  noStroke(); textSize(13);
  let last = shareLog[shareLog.length - 1];
  strategies.forEach((s, i) => { fill((i * 51) % 360, 60, 95); text(s.name + ' ' + nf(100 * last[i], 1, 1) + '%', gx + (i % 4) * (gw / 4), gy + gh + 30 + floor(i / 4) * 22); });
  fill(0, 0, 65); textSize(14);
  text('得点表：両方協力 3・3、両方裏切り 1・1、自分だけ裏切り 5・0。1 回なら裏切りが得なのに、くり返すと？', 40, height - 50);
}

function draw() {
  background(225, 30, 12);
  if (view === 1) drawZeroSum(); else drawPD();
  fill(0, 0, 100); textSize(18);
  text(view === 1 ? '1：ゼロサムゲーム（2：囚人のジレンマ）　マスをクリック +1、Shift + クリック −1　R：ランダムな表'
                  : '2：囚人のジレンマ（1：ゼロサム）　スペース：もう一度対戦　←→ ミスの確率 ' + nf(noiseP, 1, 2) + '　E：進化 ' + (evolving ? 'ON' : 'off'), 20, 40);
  fill(0, 0, 60); textSize(15);
  text(view === 1 ? '表の数字 = 行プレイヤー（自分）の得点 = 列プレイヤーの損。自分は上か下、相手は a〜d を選ぶ'
                  : '7 つの戦略で総当たり（各 ' + ROUNDS + ' 回くり返し）。表 = 行の戦略が列の戦略（番号）と戦ったときの、行の 1 回あたりの得点', 20, 68);
}

function mousePressed() {
  if (view !== 1) return;
  for (let i = 0; i < 2; i++) for (let j = 0; j < A[0].length; j++) {
    let r = cellRect(i, j);
    if (mouseX > r.x && mouseX < r.x + r.w && mouseY > r.y && mouseY < r.y + r.h) A[i][j] = constrain(A[i][j] + (keyIsDown(SHIFT) ? -1 : 1), -9, 9);
  }
}
function keyPressed() {
  if (key === '1') view = 1;
  if (key === '2') view = 2;
  if (view === 1 && (key === 'r' || key === 'R')) A = [0, 1].map(() => A[0].map(() => floor(random(-5, 6))));
  if (view === 2) {
    if (key === ' ') { tournament(); evolving = false; }
    if (key === RIGHT_ARROW) { noiseP = min(0.3, +(noiseP + 0.01).toFixed(2)); tournament(); }
    if (key === LEFT_ARROW) { noiseP = max(0, +(noiseP - 0.01).toFixed(2)); tournament(); }
    if (key === 'e' || key === 'E') { if (!evolving) { shares = strategies.map(() => 1 / strategies.length); shareLog = [shares.slice()]; } evolving = !evolving; }
  }
}

// ---------- やってみよう ----------
// 1. 表を「じゃんけん」っぽく（勝ち 1・負け −1）にすると最適な混ぜ方は？ 列を 3 つにして試そう（A の各行を 3 個に）
// 2. 鞍点のある表をつくろう。そのとき黄色の折れ線の頂上はどこにある？
// 3. 囚人のジレンマでミスの確率を 0.05 にすると、しっぺ返しとトリガーの順位はどう変わる？ パブロフは？
// 4. 自分の戦略を strategies に足そう（例：最初の 10 回は協力、あとは相手の協力率で決める）
