// ============================================
// 12 ミツバチの巣選び ─ ダンスと定足数（クオラム）
// 分蜂した群れは、新しい巣の候補地を偵察蜂が探して決める。良い候補地を見つけた蜂ほど長く 8 の字ダンスをして仲間を誘う
// ダンスは行くたびに短くなる（熱が冷める）ので、悪い候補地の支持は自然に消える。1 つの候補地に Q 匹そろったら決定（定足数）
// ↑↓ = 定足数 Q / ←→ = 速さ / B = 30 回まとめて実験（速さ vs 正確さ）/ R = 候補地を作り直す / スペース = 一時停止
// ============================================

let nBees = 150;             // ★ 偵察蜂の数
let quorum = 15;             // 定足数 Q（候補地に同時にいる蜂の数）
let pSpont = 0.003;          // ★ 自分で探しに出る確率（1 分あたり）
let pFollow = 0.05;          // ★ ダンスを見て付いていく強さ
let dMax = 100, dDec = 15;   // ★ 最初のダンスの回数（質 1 のとき）と、1 往復ごとに減る回数
let travel = 8, stay = 10;   // ★ 片道の時間・候補地で調べる時間（分）
let ticksPerFrame = 1;
let sites = [], bees = [], tNow = 0, decided = -1, decidedAt = 0;
let hist = [], results = {}, batch = null, paused = false;
const SITE_HUE = [10, 45, 120, 190, 280];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  makeSites();
}

function makeSites() {
  let q = [0.3, 0.45, 0.55, 0.7, 0.9];                    // ★ 候補地の質（1 つだけ一番良い）
  for (let i = q.length - 1; i > 0; i--) { let j = Math.floor(Math.random() * (i + 1)); [q[i], q[j]] = [q[j], q[i]]; }
  sites = q.map((v, i) => ({ q: v, ang: -1.0 + (i * 2.0) / 4 }));
  results = {};
  resetRun();
}
function resetRun() { bees = newBees(); tNow = 0; decided = -1; hist = []; }

// ★ 1 分ぶん進める。返り値：決まった候補地（まだなら −1）
function tick(bs) {
  let dancers = new Array(sites.length).fill(0), atSite = new Array(sites.length).fill(0), totalD = 0;
  for (let b of bs) { if (b.st === 'dance') { dancers[b.k]++; totalD++; } if (b.st === 'site') atSite[b.k]++; }
  for (let b of bs) {
    if (b.st === 'rest') {
      if (Math.random() < pSpont) { b.k = Math.floor(Math.random() * sites.length); b.st = 'fly'; b.t = travel; b.D = -1; }   // 自分で探す
      else if (totalD > 0 && Math.random() < pFollow * (totalD / bs.length)) {                                                // ダンスを見て付いていく
        let r = Math.random() * totalD, k = 0;
        while (k < sites.length - 1 && r >= dancers[k]) { r -= dancers[k]; k++; }
        b.k = k; b.st = 'fly'; b.t = travel; b.D = -1;
      }
    } else if (--b.t <= 0) {
      if (b.st === 'fly') { b.st = 'site'; b.t = stay; }
      else if (b.st === 'site') { b.st = 'back'; b.t = travel; }
      else if (b.st === 'back') {
        b.D = b.D < 0 ? Math.round(dMax * Math.max(0, (sites[b.k].q - 0.2) / 0.8)) : b.D - dDec;   // 初めてなら質で決まる。2 回目からは減る
        if (b.D > 0) { b.st = 'dance'; b.t = Math.max(1, Math.round(b.D / 10)); }                   // 1 分に 10 回まわる
        else { b.st = 'rest'; b.k = -1; }                                                           // 熱が冷めた → 休む
      } else if (b.st === 'dance') { b.st = 'fly'; b.t = travel; }                                    // もう一度見に行く
    }
  }
  for (let k = 0; k < sites.length; k++) if (atSite[k] >= quorum) return { k, atSite, dancers };
  return { k: -1, atSite, dancers };
}

function draw() {
  background(35, 30, 11);
  if (!paused && decided < 0) for (let s = 0; s < ticksPerFrame; s++) {
    let r = tick(bees); tNow++;
    if (tNow % 2 === 0) { hist.push(r.atSite.slice()); if (hist.length > 500) hist.shift(); }
    if (r.k >= 0) { decided = r.k; decidedAt = tNow; break; }
    if (tNow > 3000) { decided = -2; break; }
  }
  // まとめ実験：1 フレームに 2 回ずつ
  if (batch && batch.done < 30) for (let rep = 0; rep < 2 && batch.done < 30; rep++) {
    let bs = newBees(), t = 0, r = { k: -1 };
    while (t < 3000 && r.k < 0) { r = tick(bs); t++; }
    if (r.k === bestSite()) batch.correct++;
    batch.time += t; batch.done++;
    if (batch.done === 30) results[quorum] = { acc: batch.correct / 30, time: batch.time / 30 };
  }

  // ---- 群れ（左）と候補地（右の弧）
  let sx = width * 0.2, sy = height * 0.55, R = Math.min(width * 0.36, height * 0.4);
  let sitePos = sites.map((s) => [sx + R * Math.cos(s.ang), sy + R * Math.sin(s.ang)]);
  let cnt = new Array(sites.length).fill(0);
  for (let b of bees) if (b.st === 'site') cnt[b.k]++;
  noStroke(); fill(40, 50, 40); ellipse(sx, sy, 110, 140);
  for (let k = 0; k < sites.length; k++) {
    let [x, y] = sitePos[k];
    fill(SITE_HUE[k], 50, 35); rect(x - 34, y - 26, 68, 52, 8);
    fill(SITE_HUE[k], 70, 100); rect(x - 30, y + 14, 60 * sites[k].q, 8);
    fill(0, 0, 100); textSize(12); text('質 ' + nf(sites[k].q, 1, 2), x - 26, y - 10);
    text(cnt[k] + ' 匹', x - 26, y + 6);
    if (decided === k) { noFill(); stroke(50, 90, 100); strokeWeight(4); rect(x - 40, y - 32, 80, 64, 10); noStroke(); }
  }
  for (let b of bees) {
    let tx, ty;
    if (b.st === 'rest') { tx = sx + (Math.random() - 0.5) * 90; ty = sy + (Math.random() - 0.5) * 120; }
    else if (b.st === 'site') { tx = sitePos[b.k][0] + (Math.random() - 0.5) * 50; ty = sitePos[b.k][1] + (Math.random() - 0.5) * 40; }
    else if (b.st === 'dance') { let a = sites[b.k].ang, ph = frameCount * 0.25 + b.t; tx = sx + 40 * Math.cos(a) + 10 * Math.sin(ph); ty = sy + 40 * Math.sin(a) + 6 * Math.sin(2 * ph); }
    else { let u = b.st === 'fly' ? 1 - b.t / travel : b.t / travel; tx = lerp(sx, sitePos[b.k][0], u); ty = lerp(sy, sitePos[b.k][1], u); }
    b.x += (tx - b.x) * 0.3; b.y += (ty - b.y) * 0.3;
    fill(b.k >= 0 ? SITE_HUE[b.k] : 45, b.k >= 0 ? 70 : 20, 100); circle(b.x, b.y, b.st === 'dance' ? 7 : 4);
  }
  fill(0, 0, 100); textSize(14); text('分蜂群', sx - 22, sy + 92);

  // ---- 右：候補地ごとの「いる蜂の数」の推移と、定足数の線
  let gx = width * 0.62, gw = width - gx - 30, gy = 110, gh = 170, top = Math.max(quorum * 1.5, 10);
  fill(0, 0, 0, 35); rect(gx, gy, gw, gh);
  stroke(0, 0, 100, 50); strokeWeight(1); let qy = gy + gh - (quorum / top) * gh; line(gx, qy, gx + gw, qy);
  for (let k = 0; k < sites.length; k++) {
    if (hist.length < 2) break;
    noFill(); stroke(SITE_HUE[k], 70, 100); strokeWeight(2);
    beginShape(); for (let i = 0; i < hist.length; i++) vertex(gx + (i / 499) * gw, gy + gh - Math.min(hist[i][k] / top, 1) * gh); endShape();
  }
  noStroke(); fill(0, 0, 85); textSize(13); text('候補地にいる蜂の数（白線 = 定足数 Q = ' + quorum + '）', gx, gy - 8);
  fill(0, 0, 100); textSize(16);
  let msg = decided >= 0 ? '決定！ 質 ' + nf(sites[decided].q, 1, 2) + ' の候補地（' + (decided === bestSite() ? '一番良い所 ✓' : '一番良い所ではない ✗') + '）' + decidedAt + ' 分' : decided === -2 ? '3000 分たっても決まらなかった' : '経過 ' + tNow + ' 分　相談中…';
  text(msg, gx, gy + gh + 30);
  // 速さ vs 正確さ
  let ty0 = gy + gh + 80;
  fill(0, 0, 85); textSize(14); text('B：30 回の実験（定足数ごとの 正確さ と 決まるまでの時間）', gx, ty0);
  if (batch && batch.done < 30) { fill(50, 80, 100); text('実験中… ' + batch.done + ' / 30', gx, ty0 + 24); }
  let qs = Object.keys(results).map(Number).sort((a, b) => a - b);
  for (let i = 0; i < qs.length && i < 9; i++) {
    let r = results[qs[i]], y = ty0 + 50 + i * 26;
    fill(0, 0, 80); text('Q = ' + qs[i], gx, y);
    fill(120, 60, 90); rect(gx + 60, y - 12, r.acc * (gw - 220) * 0.5, 14);
    fill(0, 0, 80); text(nf(r.acc * 100, 1, 0) + ' %', gx + 66 + r.acc * (gw - 220) * 0.5, y);
    fill(30, 70, 100); text(nf(r.time, 1, 0) + ' 分', gx + gw - 90, y);
  }
  if (qs.length) { fill(0, 0, 60); textSize(12); text('緑の棒 = 一番良い所を選べた割合、右 = 平均の時間', gx, ty0 + 50 + Math.min(qs.length, 9) * 26); }

  fill(0, 0, 100); textSize(18);
  text('↑↓：定足数 Q = ' + quorum + '　←→：速さ ×' + ticksPerFrame + '　B：30 回まとめて実験　R：候補地を作り直す　スペース：' + (paused ? '停止中' : '実行中') + '（決まったらスペースで次の回）', 20, 36);
  fill(0, 0, 70); textSize(14);
  text('ダンスの回数 = 質で決まり、往復ごとに ' + dDec + ' 回ずつ減る。良い所への支持だけが長く続き、仲間を呼び続ける', 20, 60);
}

function keyPressed() {
  if (key === UP_ARROW) quorum = Math.min(quorum + 5, 60);
  if (key === DOWN_ARROW) quorum = Math.max(quorum - 5, 5);
  if (key === RIGHT_ARROW) ticksPerFrame = Math.min(ticksPerFrame * 2, 16);
  if (key === LEFT_ARROW) ticksPerFrame = Math.max(ticksPerFrame / 2, 1);
  if (key === 'b' || key === 'B') batch = { done: 0, correct: 0, time: 0 };
  if (key === 'r' || key === 'R') makeSites();
  if (key === ' ') { if (decided !== -1) resetRun(); else paused = !paused; }
}

// ---------- やってみよう ----------
// 1. Q = 15 で B。正確さと時間はいくつ？ Q = 5 と Q = 40 でも B をして、表を比べよう（速さ vs 正確さのトレードオフ）
// 2. 本物のミツバチの定足数は 20〜30 匹くらい。それはなぜ？ 表から考えよう
// 3. dDec を 0 にすると、ダンスが冷めない。悪い候補地の支持も消えず、決まらなかったり間違えたりする？
// 4. pSpont を大きくすると、自分で探しに行く蜂が増える。みんなが自分で調べると時間はどうなる？
// 5. 人間の会議にたとえると？ 「熱が冷める」「定足数」は何に当たるだろう

// ==================================================
// ここから下は「蜂の道具」です
// ==================================================
// 全員「休み中」の偵察蜂を nBees 匹つくる。st = rest / fly / site / back / dance
function newBees() { let b = []; for (let i = 0; i < nBees; i++) b.push({ st: 'rest', k: -1, t: 0, D: 0, x: 0, y: 0 }); return b; }
function bestSite() { let b = 0; for (let i = 1; i < sites.length; i++) if (sites[i].q > sites[b].q) b = i; return b; }
