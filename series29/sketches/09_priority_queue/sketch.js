// ============================================
// 09 優先度つき待ち行列
// 客が 2 種類：赤 = 優先客（救急・VIP）、青 = ふつうの客。窓口は 1 つ（平均サービス 1 分、指数分布）
//   1 = 先着順（FCFS）　2 = 優先・割り込みなし（いまのサービスは最後まで）　3 = 優先・割り込みあり（青を中断して赤を先に）
//   優先すると赤はほとんど待たないが、そのぶん青が待つ。全体の平均はほぼ変わらない（保存則）
// 1・2・3 = ルール / ↑↓ = 赤の到着率 λ1 / ←→ = 青の到着率 λ2 / F = 早送り / R = 測り直す
// ============================================

let lam1 = 0.3, lam2 = 0.5;   // ★ 到着率（赤・青）
let mu = 1;                   // ★ サービス率
let mode = 2;                 // 1, 2, 3
let names = ['', '先着順（FCFS）', '優先・割り込みなし', '優先・割り込みあり'];
let fast = false;
let t, nA1, nA2, depT, cur, q1, q2, sumT, cnt, nPre, flash;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  textWrap(CHAR);
  resetSim();
}
function resetSim() {
  t = 0; nA1 = expRand(lam1); nA2 = expRand(lam2); depT = Infinity; cur = null;
  q1 = []; q2 = []; sumT = [0, 0, 0]; cnt = [0, 0, 0]; nPre = 0; flash = 0;
}
function begin(c) { cur = c; depT = t + c.rem; }
function pickNext() {
  if (mode === 1) {     // 先着順：2 つの列の先頭のうち、早く来たほう
    if (q1.length && (!q2.length || q1[0].arr < q2[0].arr)) return q1.shift();
    return q2.length ? q2.shift() : null;
  }
  return q1.length ? q1.shift() : q2.length ? q2.shift() : null;
}

function advance(tEnd) {
  while (min(nA1, nA2, depT) <= tEnd) {
    let tn = min(nA1, nA2, depT); t = tn;
    if (tn === depT) {
      sumT[cur.cls] += t - cur.arr; cnt[cur.cls]++;
      cur = null; depT = Infinity;
      let nx = pickNext(); if (nx) begin(nx);
    } else {
      let cls = tn === nA1 ? 1 : 2;
      let c = { cls, arr: t, rem: expRand(mu), pre: false };
      if (cls === 1) nA1 = t + expRand(lam1); else nA2 = t + expRand(lam2);
      if (!cur) begin(c);
      else if (mode === 3 && cls === 1 && cur.cls === 2) {   // ★ 割り込み：青の残り時間を覚えて列の先頭へ戻す
        cur.rem = depT - t; cur.pre = true; q2.unshift(cur); nPre++; flash = 20; begin(c);
      } else (cls === 1 ? q1 : q2).push(c);
      if (q2.length > 600) q2.pop();
    }
  }
  t = tEnd;
}

// ★ 理論値：各クラスの平均滞在時間 T（待ち＋サービス）
function theory() {
  let r1 = lam1 / mu, r = (lam1 + lam2) / mu, R = (lam1 + lam2) / (mu * mu);
  if (r >= 1) return [0, Infinity, Infinity];
  if (mode === 1) { let T = 1 / (mu - lam1 - lam2); return [0, T, T]; }
  if (mode === 2) return [0, R / (1 - r1) + 1 / mu, R / ((1 - r1) * (1 - r)) + 1 / mu];
  let T1 = 1 / (mu * (1 - r1));
  return [0, T1, 1 / (mu * (1 - r1)) + (r / mu) / ((1 - r1) * (1 - r))];
}

function draw() {
  background(345, 20, 12);
  advance(t + (fast ? 200 : 15) / 60);

  // ---- 窓口と 2 本の列
  let sx = width * 0.55, sy = 190;
  noStroke(); fill(200, 50, cur ? 75 : 30); rect(sx, sy - 40, 60, 80, 8);
  if (flash > 0) { fill(0, 80, 100, flash * 4); rect(sx - 8, sy - 48, 76, 96, 10); flash--; }
  if (cur) { fill(cur.cls === 1 ? color(0, 75, 100) : color(210, 70, 100)); circle(sx - 20, sy, 26); }
  for (let k = 0; k < min(q1.length, 40); k++) { fill(0, 75, 100); circle(sx - 56 - k * 16, sy - 26, 13); }
  for (let k = 0; k < min(q2.length, 40); k++) { let c = q2[k]; fill(210, 70, c.pre ? 60 : 100); circle(sx - 56 - k * 16, sy + 26, 13); if (c.pre) { stroke(0, 0, 100); noFill(); circle(sx - 56 - k * 16, sy + 26, 16); noStroke(); } }
  fill(0, 0, 70); textSize(13); text('優先の列', sx - 140, sy - 44); text('ふつうの列（白い輪 = 割り込まれた人）', sx - 300, sy + 56);

  // ---- 結果
  let th = theory(), r = (lam1 + lam2) / mu;
  let bx = 80, by = height - 80, bh = height * 0.4, bw = 120, Tmax = 12;
  stroke(0, 0, 100, 30); strokeWeight(1); line(bx, by, bx + bw * 2 + 60, by);
  for (let k = 1; k <= 2; k++) {
    let m = sumT[k] / max(cnt[k], 1), x = bx + (k - 1) * (bw + 60);
    noStroke(); fill(k === 1 ? color(0, 70, 95) : color(210, 65, 95));
    let h = min(m / Tmax, 1) * bh; rect(x, by - h, bw, h, 4);
    stroke(0, 0, 100); strokeWeight(3); let h2 = min(th[k] / Tmax, 1) * bh; line(x - 8, by - h2, x + bw + 8, by - h2);
    noStroke(); fill(0, 0, 100); textSize(16); textAlign(CENTER);
    text(nf(m, 1, 2) + ' 分', x + bw / 2, by - h - 10); fill(0, 0, 60); textSize(13);
    text((k === 1 ? '赤（優先）' : '青（ふつう）') + '　理論 ' + (th[k] === Infinity ? '∞' : nf(th[k], 1, 2)), x + bw / 2, by + 20);
    textAlign(LEFT);
  }
  fill(0, 0, 60); textSize(13); text('平均の滞在時間 T（色 = 測定、白線 = 理論）', bx, by - bh - 10);

  let tx = width * 0.55, ty = height * 0.45;
  let all = (sumT[1] + sumT[2]) / max(cnt[1] + cnt[2], 1);
  let allTh = (lam1 * th[1] + lam2 * th[2]) / (lam1 + lam2);
  fill(0, 0, 100); textSize(20); text('ルール：' + names[mode], tx, ty);
  textSize(16);
  text('ρ1 = ' + nf(lam1 / mu, 1, 2) + '　ρ2 = ' + nf(lam2 / mu, 1, 2) + '　ρ = ' + nf(r, 1, 2) + (r >= 1 ? '　→ 不安定（1 以上）' : ''), tx, ty + 34);
  text('全員の平均の滞在時間：測定 ' + nf(all, 1, 2) + ' 分　理論 ' + (allTh === Infinity ? '∞' : nf(allTh, 1, 2)) + ' 分', tx, ty + 62);
  text('サービスした人：赤 ' + cnt[1] + '　青 ' + cnt[2] + '　割り込み ' + nPre + ' 回', tx, ty + 90);
  fill(0, 0, 60); textSize(14);
  text('全員の平均はルールを変えてもほぼ同じ（サービス時間が指数分布なら割り込みありでも）。待ち時間を「誰が負担するか」が変わるだけ', tx, ty + 120, width - tx - 30);

  fill(0, 0, 100); textSize(18);
  text('1〜3：ルール　λ1 = ' + nf(lam1, 1, 2) + '（↑↓）　λ2 = ' + nf(lam2, 1, 2) + '（←→）　F：早送り ' + (fast ? 'ON' : 'off') + '　R：測り直す　時間 ' + nf(t, 1, 0) + ' 分', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('救急外来・ネットワークの通信（音声を優先）・OS の処理の順番。優先度は「誰を待たせるか」の設計', 20, 68);
}

function keyPressed() {
  if (key === '1' || key === '2' || key === '3') { mode = int(key); resetSim(); }
  let arrow = key === UP_ARROW || key === DOWN_ARROW || key === LEFT_ARROW || key === RIGHT_ARROW;
  if (key === UP_ARROW) lam1 = min(0.9, lam1 + 0.05);
  if (key === DOWN_ARROW) lam1 = max(0.05, lam1 - 0.05);
  if (key === RIGHT_ARROW) lam2 = min(0.9, lam2 + 0.05);
  if (key === LEFT_ARROW) lam2 = max(0.05, lam2 - 0.05);
  if (lam1 + lam2 > 0.95) { if (key === UP_ARROW) lam1 = 0.95 - lam2; else lam2 = 0.95 - lam1; }   // ★ ρ < 1 に保つ
  lam1 = round(lam1 * 100) / 100; lam2 = round(lam2 * 100) / 100;
  if (arrow) resetSim();
  if (key === 'f' || key === 'F') fast = !fast;
  if (key === 'r' || key === 'R') resetSim();
}

// ---------- やってみよう ----------
// 1. 1 → 2 → 3 と切り替えて、赤と青の待ち時間がどう入れかわるかを見る（F で早送り）
// 2. 赤の割合を増やしていく（↑）。優先が多すぎると「優先」の意味がなくなるのはなぜ？
// 3. 3 クラスに増やす（q3 を追加）。いちばん下のクラスの待ち時間はどうなる？
// 4. サービス時間の短い客を優先する（SPT ルール）と全員の平均が減る。pickNext を rem の小さい順に変えて試す

// ==================================================
// ここから下は「道具」
// ==================================================
function expRand(rate) { return -Math.log(1 - Math.random()) / rate; }
