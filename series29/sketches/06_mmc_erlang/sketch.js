// ============================================
// 06 M/M/c と M/M/c/K ─ アーランの公式
// 窓口が c 個。全部ふさがっていたら並ぶ（M/M/c）か、定員 K を超えたら断られる（M/M/c/K）
//   アーラン C 式：来た客が待たされる確率　　アーラン B 式（K = c）：来た客が断られる確率（電話回線の設計で生まれた）
//   右の表で「待たされる確率 20% 以下にするには何人いればいい？」を計画する
// ←→ = 到着率 λ / ↑↓ = 窓口の数 c / K = 定員（∞ → c → c+5）/ スペース = 一時停止 / R = 測り直す
// ============================================

let lambda = 4;            // ★ 到着率（1 分あたり）
let mu = 1;                // ★ 1 窓口のサービス率
let c = 5;                 // 窓口の数
let kModes = ['∞', 'c', 'c+5'], km = 0;
let target = 0.2;          // ★ 目標：待たされる（または断られる）確率をこれ以下に
let speed = 8;             // ★ 1 秒で進む時間
let paused = false;
let S;                     // シミュレーションの状態
let lost = [];             // 断られた客のアニメーション

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  resetSim();
}
function capK() { return km === 0 ? Infinity : km === 1 ? c : c + 5; }
function resetSim() { S = { t: 0, nextArr: expRand(lambda), desk: new Array(c).fill(-1), q: [], nArr: 0, nWait: 0, nLost: 0, sumWq: 0, nStart: 0 }; lost = []; }
function busy() { let n = 0; for (let d of S.desk) if (d >= 0) n++; return n; }

function advance(tEnd) {
  while (true) {
    let tD = Infinity, di = -1;
    for (let i = 0; i < c; i++) if (S.desk[i] >= 0 && S.desk[i] < tD) { tD = S.desk[i]; di = i; }
    let tn = min(S.nextArr, tD);
    if (tn > tEnd) break;
    S.t = tn;
    if (S.nextArr <= tD) {
      S.nextArr = S.t + expRand(lambda); S.nArr++;
      if (busy() + S.q.length >= capK() || S.q.length > 500) { S.nLost++; if (lost.length < 40) lost.push({ x: width * 0.3, y: 200, vy: -2 }); }
      else { if (busy() === c) S.nWait++; S.q.push(S.t); }
    } else S.desk[di] = -1;
    for (let i = 0; i < c; i++) if (S.desk[i] < 0 && S.q.length) { S.sumWq += S.t - S.q.shift(); S.nStart++; S.desk[i] = S.t + expRand(mu); }
  }
  S.t = tEnd;
}

// ★ 理論値：人数 n の定常確率から計算（K = ∞ はアーラン C 式）
function theory(cc, lam, K) {
  let a = lam / mu, r = a / cc;
  if (K === Infinity) {
    if (r >= 1) return { pw: 1, loss: 0, wq: Infinity };
    let s = 0, term = 1;
    for (let k = 0; k < cc; k++) { s += term; term *= a / (k + 1); }   // 終わると term = a^c / c!
    let top = term / (1 - r), C = top / (s + top);
    return { pw: C, loss: 0, wq: C / (cc * mu - lam) };
  }
  let p = [1], tot = 1;
  for (let n = 1; n <= K; n++) { p.push(p[n - 1] * a / min(n, cc)); tot += p[n]; }
  let loss = p[K] / tot, pw = 0, Lq = 0;
  for (let n = cc; n < K; n++) pw += p[n] / tot;
  for (let n = cc + 1; n <= K; n++) Lq += (n - cc) * p[n] / tot;
  return { pw: pw / (1 - loss), loss, wq: Lq / (lam * (1 - loss)) };
}

function draw() {
  background(10, 25, 12);
  if (!paused) advance(S.t + speed / 60);

  // ---- 窓口と行列
  let dx = width * 0.36, top = 120, dh = min(44, (height * 0.5) / c);
  for (let i = 0; i < c; i++) {
    let y = top + i * dh;
    noStroke(); fill(200, 50, S.desk[i] >= 0 ? 75 : 30); rect(dx, y, 50, dh - 6, 6);
    if (S.desk[i] >= 0) { fill(140, 70, 95); circle(dx - 14, y + dh / 2 - 3, min(18, dh - 10)); }
  }
  let qy = top + (c * dh) / 2;
  for (let i = 0; i < min(S.q.length, 40); i++) { fill(30, 75, 100); circle(dx - 44 - i * 14, qy, 11); }
  if (S.q.length > 40) { fill(0, 80, 100); textSize(13); text('+' + (S.q.length - 40), 30, qy + 24); }
  if (capK() < Infinity) { stroke(0, 70, 100); strokeWeight(2); let kx = dx - 44 - (capK() - c) * 14 + 7; line(kx, qy - 16, kx, qy + 16); noStroke(); fill(0, 70, 100); textSize(12); text('定員', kx - 12, qy - 20); }
  for (let L of lost) { L.y += L.vy; L.vy += 0.15; L.x -= 2; fill(0, 80, 100, 70); circle(L.x, L.y, 10); }
  lost = lost.filter((L) => L.y < height);

  // ---- 測定と理論
  let th = theory(c, lambda, capK());
  let mPw = S.nWait / max(S.nArr - S.nLost, 1), mLoss = S.nLost / max(S.nArr, 1), mWq = S.sumWq / max(S.nStart, 1);
  let tx = 30, ty = height * 0.68;
  fill(0, 0, 100); textSize(17);
  text('a = λ/μ = ' + nf(lambda / mu, 1, 1) + '（同時に必要な窓口の平均）　ρ = a/c = ' + nf(lambda / mu / c, 1, 2) + '　定員 K = ' + (capK() === Infinity ? '∞' : capK()), tx, ty);
  let rows = [['', 'シミュレーション', '理論'], ['待たされる確率', nf(mPw, 1, 3), nf(th.pw, 1, 3)], ['断られる確率', nf(mLoss, 1, 3), nf(th.loss, 1, 3)], ['平均の待ち時間 Wq', nf(mWq, 1, 3), th.wq === Infinity ? '∞（不安定）' : nf(th.wq, 1, 3)]];
  textSize(16);
  for (let i = 0; i < rows.length; i++) for (let j = 0; j < 3; j++) { fill(i === 0 ? color(0, 0, 60) : j === 2 ? color(45, 90, 100) : color(0, 0, 100)); text(rows[i][j], tx + [0, 190, 340][j], ty + 32 + i * 26); }
  fill(0, 0, 60); textSize(14); text('時間 ' + nf(S.t, 1, 0) + ' 分　来た客 ' + S.nArr + ' 人', tx, ty + 32 + 4 * 26 + 4);

  // ---- 右：何人いればいい？（人員計画の表）
  let px = width * 0.58, py = 120, rh = min(30, (height - 200) / 16);
  fill(0, 0, 100); textSize(17); text('人員計画：λ = ' + nf(lambda, 1, 1) + '、定員 ' + kModes[km] + ' のとき', px, py - 14);
  textSize(14); fill(0, 0, 60);
  text('窓口 c', px, py + 10); text(km === 1 ? '断られる確率' : '待たされる確率', px + 80, py + 10); text('平均の待ち時間', px + 340, py + 10);
  let best = -1;
  for (let cc = 1; cc <= 15; cc++) {
    let t = theory(cc, lambda, km === 0 ? Infinity : km === 1 ? cc : cc + 5);
    let v = km === 1 ? t.loss : t.pw, y = py + 14 + cc * rh;
    if (best < 0 && v <= target && t.wq < Infinity) best = cc;
    noStroke(); fill(cc === c ? color(45, 60, 40) : color(0, 0, 100, 4)); rect(px - 6, y - rh + 6, min(520, width - px - 10), rh - 2, 4);
    fill(cc === best ? color(140, 70, 100) : color(0, 0, 100)); text(cc, px + 10, y);
    fill(v <= target ? color(140, 60, 80) : color(0, 70, 85)); rect(px + 80, y - rh + 10, v * 170, rh - 10, 3);
    fill(0, 0, 100); text(nf(v, 1, 3), px + 80 + v * 170 + 6, y);
    text(t.wq === Infinity ? '∞' : nf(t.wq, 1, 3), px + 340, y);
  }
  fill(140, 70, 100); textSize(15);
  text(best > 0 ? '目標 ' + target * 100 + '% 以下にする最小の窓口数 = ' + best : '15 窓口でも目標に届かない', px, py + 14 + 16 * rh + 8);

  fill(0, 0, 100); textSize(18);
  text('λ = ' + nf(lambda, 1, 1) + '（←→）　窓口 c = ' + c + '（↑↓）　定員 ' + kModes[km] + '（K）　速さ ×' + speed + '　スペース：一時停止　R：測り直す', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('同じ ρ でも窓口が多いほど待たされにくい（規模の経済）。定員 c にすると待ち行列はなくなり、代わりに断られる（アーラン B）', 20, 68);
}

function keyPressed() {
  if (key === RIGHT_ARROW) lambda = min(14, lambda + 0.5);
  if (key === LEFT_ARROW) lambda = max(0.5, lambda - 0.5);
  if (key === UP_ARROW) c = min(15, c + 1);
  if (key === DOWN_ARROW) c = max(1, c - 1);
  if (key === 'k' || key === 'K') km = (km + 1) % 3;
  if (key === ' ') paused = !paused;
  if (key === 'r' || key === 'R' || key === UP_ARROW || key === DOWN_ARROW || key === LEFT_ARROW || key === RIGHT_ARROW || key === 'k' || key === 'K') resetSim();
}

// ---------- やってみよう ----------
// 1. λ = 4 で c を 4 → 5 → 6 と増やす。窓口 1 つ増やすだけで待ち時間は何分の 1 になる？
// 2. λ = 2, c = 2 と λ = 20, c = 20（どちらも ρ = 1 に近い 0.9 くらい）で待たされる確率を比べる（λ と c を一緒に変える）
// 3. K を押して定員 c（アーラン B）に。コールセンターの回線数を決めるとき、断られる確率 1% にするには？（target = 0.01）
// 4. 平方根の法則：必要な窓口 ≒ a + β√a。表の答えと a + √a を比べてみる（12 で使う）

// ==================================================
// ここから下は「道具」
// ==================================================
function expRand(rate) { return -Math.log(1 - Math.random()) / rate; }
