// ============================================
// 03 M/M/1 待ち行列
// M（ポアソン到着）/ M（指数分布のサービス）/ 1（窓口 1 つ）。待ち行列理論のいちばん基本の模型
//   利用率 ρ = λ/μ　平均の系内人数 L = ρ/(1−ρ)　平均の滞在時間 W = 1/(μ−λ)
//   ρ → 1 で L も W も無限大に吹き上がる。「9 割しか使っていないのに大渋滞」
// ←→ = ρ / ↑↓ = 時間の速さ / スペース = 一時停止 / R = 測り直す / C = グラフの点を消す
// ============================================

let rhoList = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95, 0.98];   // ★ 選べる ρ
let ri = 6;
let mu = 1;                // ★ サービス率（平均サービス時間 = 1/μ）
let speed = 40;            // ★ 1 秒で進む時間
let paused = false;
let simT, nextArr, nextDep, inSys, areaN, nDone, sumW, sumWq, rec, measured = {};

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  resetSim();
}
function lam() { return rhoList[ri] * mu; }
function resetSim() {
  simT = 0; nextArr = expRand(lam()); nextDep = Infinity;
  inSys = []; areaN = 0; nDone = 0; sumW = 0; sumWq = 0; rec = [];
}

function advance(tEnd) {
  while (min(nextArr, nextDep) <= tEnd) {
    let tn = min(nextArr, nextDep);
    areaN += inSys.length * (tn - simT); simT = tn;
    if (nextArr <= nextDep) {
      inSys.push({ arr: simT, start: -1 });
      if (inSys.length === 1) { inSys[0].start = simT; nextDep = simT + expRand(mu); }
      nextArr = simT + expRand(lam());
      if (inSys.length > 3000) inSys.pop();           // 念のための上限
    } else {
      let c = inSys.shift(); nDone++; sumW += simT - c.arr; sumWq += c.start - c.arr;
      if (inSys.length > 0) { inSys[0].start = simT; nextDep = simT + expRand(mu); } else nextDep = Infinity;
    }
  }
  areaN += inSys.length * (tEnd - simT); simT = tEnd;
}

function draw() {
  background(220, 30, 12);
  if (!paused) advance(simT + speed / 60);
  if (!paused) { rec.push(inSys.length); if (rec.length > width * 0.55) rec.shift(); }
  let rho = rhoList[ri], L = areaN / max(simT, 1e-9);
  if (simT > 200) measured[rho] = L;

  // ---- 行列を点で
  let qx = width * 0.55, qy = 130;
  noStroke(); fill(200, 60, 80); rect(qx + 10, qy - 22, 40, 44, 6);
  fill(0, 0, 100); textSize(12); text('窓口', qx + 17, qy + 38);
  for (let i = 0; i < min(inSys.length, 60); i++) {
    fill(i === 0 ? color(140, 70, 95) : color(30, 70, 100));
    circle(i === 0 ? qx + 30 : qx - 10 - (i - 1) * 9, qy, 8 + (i === 0 ? 8 : 0));
  }
  if (inSys.length > 60) { fill(0, 80, 100); textSize(14); text('… +' + (inSys.length - 60), 40, qy + 5); }

  // ---- 系内人数 N(t) の変化
  let gx = 40, gy = height * 0.55, gw = width * 0.55, gh = height * 0.3;
  let top = max(10, ...rec);
  stroke(0, 0, 100, 30); strokeWeight(1); line(gx, gy, gx + gw, gy); line(gx, gy, gx, gy - gh);
  stroke(45, 90, 100, 60); let yL = gy - min(rho / (1 - rho) / top, 1) * gh; line(gx, yL, gx + gw, yL);
  noFill(); stroke(30, 80, 100); strokeWeight(1.5);
  beginShape(); for (let i = 0; i < rec.length; i++) vertex(gx + i, gy - rec[i] / top * gh); endShape();
  noStroke(); fill(0, 0, 60); textSize(13);
  text('系内人数 N(t)（最大 ' + top + '）　黄の線 = 理論の平均 L', gx, gy - gh - 8);

  // ---- 数字
  let Lth = rho / (1 - rho), Wth = 1 / (mu - lam()), Wqth = rho / (mu - lam());
  let tx = 40, ty = gy + 50;
  textSize(18); fill(0, 0, 100);
  text('ρ = λ/μ = ' + nf(rho, 1, 2) + '　（λ = ' + nf(lam(), 1, 2) + '、μ = ' + mu + '）', tx, ty);
  textSize(16);
  let rows = [['', 'シミュレーション', '理論'], ['L（平均の系内人数）', nf(L, 1, 2), nf(Lth, 1, 2)],
    ['W（平均の滞在時間）', nf(sumW / max(nDone, 1), 1, 2), nf(Wth, 1, 2)], ['Wq（平均の待ち時間）', nf(sumWq / max(nDone, 1), 1, 2), nf(Wqth, 1, 2)]];
  for (let i = 0; i < rows.length; i++) for (let j = 0; j < 3; j++) { fill(i === 0 ? color(0, 0, 60) : j === 2 ? color(45, 90, 100) : color(0, 0, 100)); text(rows[i][j], tx + [0, 220, 380][j], ty + 30 + i * 26); }
  fill(0, 0, 60); textSize(14);
  text('経過時間 ' + nf(simT, 1, 0) + '　サービス済み ' + nDone + ' 人　（ρ が 1 に近いと平均が落ち着くまでとても長くかかる）', tx, ty + 30 + 4 * 26 + 6);

  // ---- 右：L と ρ の関係
  let px = width * 0.65, py = height - 70, pw = width * 0.31, ph = height - 250;
  let Lmax = 20;
  stroke(0, 0, 100, 40); strokeWeight(1); line(px, py, px + pw, py); line(px, py, px, py - ph);
  stroke(0, 80, 100, 50); line(px + pw, py, px + pw, py - ph);
  noFill(); stroke(45, 90, 100); strokeWeight(3);
  beginShape(); for (let i = 0; i < 200; i++) { let r = i / 200 * 0.99; let v = r / (1 - r); if (v > Lmax) break; vertex(px + r * pw, py - v / Lmax * ph); } endShape();
  noStroke();
  for (let k in measured) { fill(190, 70, 100); circle(px + Number(k) * pw, py - min(measured[k], Lmax) / Lmax * ph, 12); }
  fill(0, 0, 100); circle(px + rho * pw, py - min(L, Lmax) / Lmax * ph, 8);
  fill(0, 0, 60); textSize(13);
  text('L = ρ/(1−ρ)（黄）と測った L（水色）', px, py - ph - 10);
  text('0', px - 4, py + 16); text('ρ = 1', px + pw - 20, py + 16); text('L = ' + Lmax, px + 6, py - ph + 14);

  fill(0, 0, 100); textSize(18);
  text('ρ = ' + nf(rho, 1, 2) + '（←→）　速さ ×' + speed + '（↑↓）　' + (paused ? '一時停止中' : 'スペース：一時停止') + '　R：測り直す　C：グラフの点を消す', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('ρ を 0.5 → 0.8 → 0.9 → 0.95 と上げてみよう。ρ が 0.9 から 0.95 になるだけで L は 9 → 19 と 2 倍。窓口の「余裕」がいかに大事か', 20, 68);
}

function keyPressed() {
  if (key === RIGHT_ARROW) { ri = min(rhoList.length - 1, ri + 1); resetSim(); }
  if (key === LEFT_ARROW) { ri = max(0, ri - 1); resetSim(); }
  if (key === UP_ARROW) speed = min(2000, speed * 2);
  if (key === DOWN_ARROW) speed = max(1, speed / 2);
  if (key === ' ') paused = !paused;
  if (key === 'r' || key === 'R') resetSim();
  if (key === 'c' || key === 'C') measured = {};
}

// ---------- やってみよう ----------
// 1. すべての ρ で ↑ を押して速く回し、水色の点を集める。理論の曲線に乗る？
// 2. ρ = 0.98 で N(t) のグラフを見る。平均 49 人のはずなのに、0 人の時間もある。なぜ？
// 3. 窓口の人件費を減らすため ρ を 0.7 → 0.9 にしたら、待ち時間は何倍になる？（W = 1/(μ−λ) で計算）
// 4. mu = 2 にして同じ ρ で比べる。L は同じで W は半分になるのはなぜ？（04 リトルの法則）

// ==================================================
// ここから下は「道具」
// ==================================================
function expRand(rate) { return -Math.log(1 - Math.random()) / rate; }
