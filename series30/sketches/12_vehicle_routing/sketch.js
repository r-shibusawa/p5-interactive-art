// ============================================
// 12 配送計画（車両ルーティング）─ クラーク＝ライトのセービング法
// 倉庫から何台かのトラックで客先に荷物を届ける。1 台が積める量には上限がある。走る距離の合計を最小にしたい
//   はじめは 1 軒ごとに往復。i と j を 1 台でまとめて回ると、距離が s = d(倉庫,i) + d(倉庫,j) − d(i,j) だけ節約（セービング）できる
//   節約の大きい順に、積載量を超えなければ 2 つのルートをつなぐ（1964）
// スペース = 自動 ON/OFF / → = 1 つずつ / ↑↓ = トラックの積載量 / クリック = 客先を足す / R = 新しい客先 / N = 最初から
// ============================================

let nCust = 30;                        // ★ 客先の数
let depot, cust = [];                  // cust[i] = { x, y, q: 荷物の量 }
let cap = 40;                          // ★ トラック 1 台の積載量
let routes = [], routeOf = [];         // ルート（客先の番号の並び）と、客先がどのルートにいるか
let savings = [], sIdx = 0;
let running = false, lastSaving = null, merged = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  depot = { x: width * 0.33, y: height * 0.55 };
  newCustomers();
}
function newCustomers() {
  cust = [];
  for (let i = 0; i < nCust; i++) {
    let a = random(TWO_PI), r = random(60, min(width * 0.3, height * 0.4));
    cust.push({ x: depot.x + cos(a) * r, y: depot.y + sin(a) * r * 0.85, q: floor(random(1, 10)) });   // ★ 荷物の量 1〜9
  }
  restart();
}
function dd(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function loadOf(r) { return r.reduce((s, i) => s + cust[i].q, 0); }
function routeLen(r) { if (!r.length) return 0; let s = dd(depot, cust[r[0]]) + dd(cust[r[r.length - 1]], depot); for (let k = 0; k + 1 < r.length; k++) s += dd(cust[r[k]], cust[r[k + 1]]); return s; }
function totalLen() { return routes.reduce((s, r) => s + routeLen(r), 0); }

function restart() {
  routes = cust.map((_, i) => [i]);                 // 1 軒ずつ往復
  routeOf = cust.map((_, i) => i);
  // ★ セービング値を全部のペアで計算して、大きい順に並べる
  savings = [];
  for (let i = 0; i < cust.length; i++) for (let j = i + 1; j < cust.length; j++)
    savings.push({ i, j, s: dd(depot, cust[i]) + dd(depot, cust[j]) - dd(cust[i], cust[j]) });
  savings.sort((a, b) => b.s - a.s);
  sIdx = 0; lastSaving = null; merged = 0;
}
// ★ セービングを 1 つ処理する
function stepSaving() {
  if (sIdx >= savings.length) { running = false; return; }
  let sv = savings[sIdx++], ri = routeOf[sv.i], rj = routeOf[sv.j];
  lastSaving = { ...sv, ok: false, why: '' };
  if (ri === rj) { lastSaving.why = '同じルート'; return; }
  let A = routes[ri], B = routes[rj];
  let endI = A[0] === sv.i ? 'head' : A[A.length - 1] === sv.i ? 'tail' : null;
  let endJ = B[0] === sv.j ? 'head' : B[B.length - 1] === sv.j ? 'tail' : null;
  if (!endI || !endJ) { lastSaving.why = 'ルートの途中にいる'; return; }
  if (loadOf(A) + loadOf(B) > cap) { lastSaving.why = '積載量オーバー（' + (loadOf(A) + loadOf(B)) + ' > ' + cap + '）'; return; }
  // i が A の最後、j が B の先頭 になるように向きをそろえてつなぐ
  if (endI === 'head') A.reverse();
  if (endJ === 'tail') B.reverse();
  let M = A.concat(B);
  routes[ri] = M; routes[rj] = [];
  for (let c of M) routeOf[c] = ri;
  lastSaving.ok = true; merged++;
}

function draw() {
  background(225, 30, 12);
  if (running) for (let k = 0; k < 3; k++) { stepSaving(); if (!running) break; }
  let used = routes.filter(r => r.length);

  // ルート
  used.forEach((r, k) => {
    let hu = (routes.indexOf(r) * 47) % 360;
    stroke(hu, 60, 95, r.length === 1 ? 35 : 90); strokeWeight(r.length === 1 ? 1 : 2.5); noFill();
    beginShape(); vertex(depot.x, depot.y); for (let c of r) vertex(cust[c].x, cust[c].y); vertex(depot.x, depot.y); endShape();
  });
  if (lastSaving) {
    let a = cust[lastSaving.i], b = cust[lastSaving.j];
    stroke(lastSaving.ok ? color(140, 90, 100) : color(0, 80, 100)); strokeWeight(5);
    line(a.x, a.y, b.x, b.y);
  }
  noStroke();
  for (let i = 0; i < cust.length; i++) {
    fill(0, 0, 95); circle(cust[i].x, cust[i].y, 8 + cust[i].q * 1.6);
    fill(0, 0, 10); textSize(10); textAlign(CENTER, CENTER); text(cust[i].q, cust[i].x, cust[i].y);
  }
  fill(50, 90, 100); rect(depot.x - 14, depot.y - 14, 28, 28, 4);
  fill(0, 0, 10); textSize(11); text('倉庫', depot.x, depot.y);
  textAlign(LEFT, BASELINE);

  // 右：数字・セービングの表
  let rx = width * 0.66, ry = 120;
  let L0 = cust.reduce((s, c) => s + 2 * dd(depot, c), 0), L = totalLen();
  fill(0, 0, 100); textSize(20); text('トラック ' + used.length + ' 台　距離 ' + nf(L, 1, 0), rx, ry);
  fill(0, 0, 70); textSize(14);
  text('最初（全部往復）' + nf(L0, 1, 0) + ' → ' + nf(100 * (1 - L / max(1, L0)), 1, 1) + '% 節約　積載量 ' + cap, rx, ry + 26);
  let ly = ry + 64;
  fill(0, 0, 85); textSize(14); text('セービング（大きい順）', rx, ly);
  for (let k = 0; k < 14; k++) {
    let idx = sIdx - 6 + k; if (idx < 0 || idx >= savings.length) continue;
    let sv = savings[idx], y = ly + 24 + k * 20;
    fill(idx === sIdx - 1 ? (lastSaving && lastSaving.ok ? color(140, 70, 100) : color(0, 70, 100)) : idx < sIdx ? color(0, 0, 45) : color(0, 0, 80));
    text((idx + 1) + '.  客 ' + sv.i + ' – 客 ' + sv.j + '　s = ' + nf(sv.s, 1, 1), rx, y);
  }
  if (lastSaving) { fill(lastSaving.ok ? color(140, 70, 100) : color(0, 70, 100)); textSize(15); text(lastSaving.ok ? '✓ つないだ' : '✗ ' + lastSaving.why, rx, ly + 330); }
  // 各トラックの積載
  let by = ly + 360;
  fill(0, 0, 70); textSize(13); text('トラックごとの積載（線 = 上限）', rx, by);
  let bw = (width - rx - 30) / max(1, used.length);
  used.forEach((r, k) => {
    let h = loadOf(r) / cap * 80;
    fill((routes.indexOf(r) * 47) % 360, 60, 90); rect(rx + k * bw, by + 100 - h, max(2, bw - 2), h);
  });
  stroke(0, 0, 100, 60); line(rx, by + 20, width - 30, by + 20); noStroke();

  fill(0, 0, 100); textSize(18);
  text('スペース：自動 ' + (running ? 'ON' : 'off') + '　→：1 つずつ　↑↓ 積載量 ' + cap + '　クリック：客先　R：新しい客先　N：最初から', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('丸の数字 = 荷物の量。緑の線 = つないだ、赤 = つなげなかった。処理 ' + sIdx + ' / ' + savings.length + '　つないだ回数 ' + merged + (sIdx >= savings.length ? '　✓ 完了' : ''), 20, 68);
}

function mousePressed() {
  if (mouseX < width * 0.64 && mouseY > 90) { cust.push({ x: mouseX, y: mouseY, q: floor(random(1, 10)) }); restart(); }
}
function keyPressed() {
  if (key === ' ') running = !running;
  if (key === RIGHT_ARROW) stepSaving();
  if (key === UP_ARROW) { cap = min(200, cap + 5); restart(); }
  if (key === DOWN_ARROW) { cap = max(10, cap - 5); restart(); }
  if (key === 'r' || key === 'R') newCustomers();
  if (key === 'n' || key === 'N') { restart(); running = false; }
}

// ---------- やってみよう ----------
// 1. 積載量を 200（無制限）にすると 1 台になる。それは巡回セールスマン問題（08）の答えとどれくらい近い？
// 2. 積載量を 10 にするとトラックは何台？ 荷物の合計 ÷ 積載量 と比べよう（これより少なくはできない）
// 3. 完成した各ルートに 08 の 2-opt をかけると、さらに短くなる？
// 4. 「1 台の走行距離にも上限がある」（運転時間）制約を stepSaving に足してみよう
