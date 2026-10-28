// ============================================
// 07 一列 vs 複数列
// 窓口 4 つ。左：全員が 1 本の列に並び、空いた窓口へ（フォーク型・銀行や空港）
//            右：窓口ごとに列があり、来た客はいちばん短い列を選ぶ。途中で列は変えない（スーパーのレジ）
//   同じ客（同じ到着時刻・同じサービス時間）を両方に流して比べる。平均はあまり変わらないのに「ばらつき」が大きくちがう
// ←→ = 到着率 λ / ↑↓ = 時間の速さ / C = 右の列の選び方（短い列 ↔ でたらめ）/ R = 測り直す
// ============================================

let nDesk = 4;             // ★ 窓口の数
let mu = 1;                // ★ 1 窓口のサービス率
let lambda = 3.4;          // ★ 到着率（ρ = λ / (4μ)）
let speed = 6;             // ★ 1 秒で進む時間
let pickShortest = true;
let simT, nextC, A, B;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  resetAll();
}
function newCustomer(t) { return { arr: t, s: expRand(mu), r: Math.random() }; }
function resetAll() {
  simT = 0; nextC = newCustomer(expRand(lambda));
  A = { desk: new Array(nDesk).fill(null), q: [], waits: [] };                       // 一列
  B = { desk: new Array(nDesk).fill(null), qs: [], waits: [] };                      // 複数列
  for (let i = 0; i < nDesk; i++) B.qs.push([]);
}

// 一列：時刻 t までのサービス終了を処理
function runA(t) {
  while (true) {
    let tD = Infinity, di = -1;
    for (let i = 0; i < nDesk; i++) if (A.desk[i] && A.desk[i].end < tD) { tD = A.desk[i].end; di = i; }
    if (tD > t) break;
    A.desk[di] = null;
    if (A.q.length) startA(di, A.q.shift(), tD);
  }
}
function startA(i, p, t) { A.waits.push(t - p.arr); A.desk[i] = { end: t + p.s }; }
function arriveA(p) {
  let free = A.desk.indexOf(null);
  if (free >= 0) startA(free, p, p.arr); else A.q.push(p);
}
// 複数列
function runB(t) {
  while (true) {
    let tD = Infinity, di = -1;
    for (let i = 0; i < nDesk; i++) if (B.desk[i] && B.desk[i].end < tD) { tD = B.desk[i].end; di = i; }
    if (tD > t) break;
    B.desk[di] = null;
    if (B.qs[di].length) startB(di, B.qs[di].shift(), tD);
  }
}
function startB(i, p, t) { B.waits.push(t - p.arr); B.desk[i] = { end: t + p.s }; }
function arriveB(p) {
  let pick = 0;
  if (pickShortest) {   // ★ 人数（サービス中を含む）がいちばん少ない列。同じなら左から
    let best = Infinity;
    for (let i = 0; i < nDesk; i++) { let n = B.qs[i].length + (B.desk[i] ? 1 : 0); if (n < best) { best = n; pick = i; } }
  } else pick = floor(p.r * nDesk);
  if (!B.desk[pick]) startB(pick, p, p.arr); else B.qs[pick].push(p);
}

function advance(tEnd) {
  while (nextC.arr <= tEnd) {
    runA(nextC.arr); runB(nextC.arr);
    arriveA(nextC); arriveB(nextC);
    if (A.q.length > 400) A.q.pop();
    nextC = newCustomer(nextC.arr + expRand(lambda));
  }
  runA(tEnd); runB(tEnd);
  simT = tEnd;
  for (let S of [A, B]) if (S.waits.length > 20000) S.waits.splice(0, 10000);
}

function stats(w) {
  let n = max(w.length, 1), m = 0, v = 0, mx = 0, over = 0;
  for (let x of w) { m += x; mx = max(mx, x); if (x > 3) over++; }
  m /= n;
  for (let x of w) v += (x - m) * (x - m);
  return { m, sd: Math.sqrt(v / n), mx, over: over / n, n: w.length };
}

function draw() {
  background(260, 25, 12);
  advance(simT + speed / 60);
  let hw = width / 2;
  drawPanel(A, 0, hw, '一列（フォーク型）', 190);
  drawPanel(B, hw, hw, '窓口ごとの列（' + (pickShortest ? 'いちばん短い列を選ぶ' : 'でたらめに選ぶ') + '）', 330);

  fill(0, 0, 100); textSize(18);
  text('λ = ' + nf(lambda, 1, 1) + '（←→）　ρ = ' + nf(lambda / (nDesk * mu), 1, 2) + '　速さ ×' + speed + '（↑↓）　C：右の選び方　R：測り直す　時間 ' + nf(simT, 1, 0), 20, 40);
  fill(0, 0, 60); textSize(15);
  text('右は「隣の列のほうが速かった」が起きる。一列は「先に来た人が先にサービス」が守られるので、待ち時間の最大値と標準偏差が小さい', 20, 68);
}

function drawPanel(S, x0, w, title, hue) {
  let top = 110, dh = 46;
  noStroke(); fill(hue, 60, 100); textSize(18); text(title, x0 + 30, top - 6);
  for (let i = 0; i < nDesk; i++) {
    let y = top + 16 + i * dh, dx = x0 + w - 110;
    fill(200, 50, S.desk[i] ? 75 : 30); rect(dx, y, 44, dh - 8, 6);
    if (S.desk[i]) { fill(140, 70, 95); circle(dx - 14, y + dh / 2 - 4, 16); }
    if (S.qs) for (let k = 0; k < min(S.qs[i].length, 25); k++) { fill(30, 75, 100); circle(dx - 36 - k * 14, y + dh / 2 - 4, 11); }
  }
  if (S.q) {   // 一列はジグザグに並べる
    let cx = x0 + w - 150, cy = top + 16 + nDesk * dh / 2 - 4;
    for (let k = 0; k < min(S.q.length, 60); k++) {
      let col = floor(k / 6), row = col % 2 === 0 ? k % 6 : 5 - (k % 6);
      fill(30, 75, 100); circle(cx - col * 18, cy - 40 + row * 16, 11);
    }
  }
  // 待ち時間のヒストグラム
  let st = stats(S.waits);
  let gx = x0 + 40, gy = height - 60, gw = w - 80, gh = height - top - nDesk * dh - 260, nb = 30, xmax = 6;
  let bins = new Array(nb).fill(0);
  for (let v of S.waits) { let b = floor(v / xmax * nb); bins[min(b, nb - 1)]++; }
  let peak = 1; for (let b of bins) peak = max(peak, b);
  stroke(0, 0, 100, 30); strokeWeight(1); line(gx, gy, gx + gw, gy);
  noStroke(); fill(hue, 60, 90, 80);
  for (let i = 0; i < nb; i++) { let h = bins[i] / peak * gh; rect(gx + i * gw / nb + 1, gy - h, gw / nb - 2, h); }
  fill(0, 0, 60); textSize(12); text('0', gx, gy + 14); textAlign(RIGHT); text(xmax + ' 分以上', gx + gw, gy + 14); textAlign(LEFT);
  text('待ち時間のヒストグラム', gx, gy - gh - 6);
  fill(0, 0, 100); textSize(16);
  let ty = gy - gh - 110;
  text('平均の待ち時間  ' + nf(st.m, 1, 3) + ' 分', gx, ty);
  text('標準偏差  ' + nf(st.sd, 1, 3) + ' 分', gx, ty + 24);
  text('最大  ' + nf(st.mx, 1, 2) + ' 分　　3 分以上待った人  ' + nf(st.over * 100, 1, 1) + '%', gx, ty + 48);
  fill(0, 0, 60); text('サービスを受けた人 ' + st.n, gx, ty + 72);
}

function keyPressed() {
  if (key === RIGHT_ARROW) { lambda = min(3.9, lambda + 0.1); resetAll(); }
  if (key === LEFT_ARROW) { lambda = max(0.4, lambda - 0.1); resetAll(); }
  if (key === UP_ARROW) speed = min(400, speed * 2);
  if (key === DOWN_ARROW) speed = max(0.5, speed / 2);
  if (key === 'c' || key === 'C') { pickShortest = !pickShortest; resetAll(); }
  if (key === 'r' || key === 'R') resetAll();
}

// ---------- やってみよう ----------
// 1. ↑ で速くして 1 万人分集める。平均・標準偏差・最大を左右で比べる。どちらが「公平」？
// 2. C で「でたらめに選ぶ」に。窓口 4 つの M/M/1 が 4 つ並んだのと同じ → 平均の待ち時間も大きく悪化する
// 3. λ を 2 にすると差は縮む？ 3.8 だと？ 混んでいるときほど一列の良さが効く
// 4. 右に「列の乗り換え（ジョッキー）」を加える：サービス終了で列が空いたら、他の列の最後尾の人を移す

// ==================================================
// ここから下は「道具」
// ==================================================
function expRand(rate) { return -Math.log(1 - Math.random()) / rate; }
